import * as tus from 'tus-js-client';
import { supabase } from './supabase';

export const BUCKET = 'library_files';
const RESUMABLE_THRESHOLD_BYTES = 6 * 1024 * 1024; // switch to resumable for files >= 6MB

export const BUCKET_MISSING_MESSAGE =
    `Der Storage-Bucket "${BUCKET}" existiert nicht in Supabase. ` +
    `Bitte einmalig das SQL aus supabase/storage_fix.sql im Supabase-Dashboard ausführen, dann erneut hochladen.`;

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export function extractLibraryPath(url: string | undefined | null): string | null {
    if (!url) return null;
    const marker = `/storage/v1/object/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    const rest = url.slice(idx + marker.length);
    // strip leading `public/` or `sign/`
    const cleaned = rest.replace(/^(public|sign|authenticated)\//, '');
    const prefix = `${BUCKET}/`;
    if (!cleaned.startsWith(prefix)) return null;
    const pathWithQuery = cleaned.slice(prefix.length);
    return pathWithQuery.split('?')[0];
}

export function isLibraryStorageUrl(url: string | undefined | null): boolean {
    return !!extractLibraryPath(url);
}

export async function resolveLibraryFileUrl(url: string | undefined | null): Promise<{ url: string } | { error: string }> {
    if (!url) return { error: 'Kein Link hinterlegt.' };
    const path = extractLibraryPath(url);
    if (!path) return { url };
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
    if (error || !data?.signedUrl) {
        return { error: error?.message || 'Datei konnte nicht geladen werden.' };
    }
    return { url: data.signedUrl };
}

function getExtension(filename: string): string {
    const dot = filename.lastIndexOf('.');
    if (dot <= 0 || dot === filename.length - 1) return '';
    return filename.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function makeStorageFilename(file: File, prefix = ''): string {
    const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ext = getExtension(file.name);
    const base = prefix ? `${prefix}-${id}` : id;
    return ext ? `${base}.${ext}` : base;
}

function isBucketMissingError(err: { message?: string; statusCode?: string | number } | null): boolean {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('bucket not found')) return true;
    const code = String(err.statusCode ?? '');
    return code === '404' && msg.includes('bucket');
}

export type UploadResult =
    | { ok: true; url: string; path: string }
    | { ok: false; error: string; bucketMissing?: boolean; tooLarge?: boolean };

function humanSize(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024).toFixed(0)} KB`;
}

function isTooLargeError(msg: string): boolean {
    return /(exceed|too large|413|payload|max.*size|maximum.*size)/i.test(msg);
}

async function uploadResumable(path: string, file: File, onProgress?: (fraction: number) => void): Promise<{ ok: true } | { ok: false; error: string; tooLarge?: boolean }> {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) return { ok: false, error: 'Nicht angemeldet — bitte erneut einloggen.' };

    return new Promise(resolve => {
        const upload = new tus.Upload(file, {
            endpoint: `${supabaseUrl}/storage/v1/upload/resumable`,
            retryDelays: [0, 3000, 5000, 10000, 20000],
            headers: {
                authorization: `Bearer ${token}`,
                'x-upsert': 'false',
            },
            uploadDataDuringCreation: true,
            removeFingerprintOnSuccess: true,
            metadata: {
                bucketName: BUCKET,
                objectName: path,
                contentType: file.type || 'application/octet-stream',
                cacheControl: '3600',
            },
            chunkSize: 6 * 1024 * 1024,
            onError: (err: Error) => {
                const msg = err.message || String(err);
                resolve({ ok: false, error: `Upload fehlgeschlagen: ${msg}`, tooLarge: isTooLargeError(msg) });
            },
            onProgress: (sent, total) => onProgress?.(total ? sent / total : 0),
            onSuccess: () => resolve({ ok: true }),
        });
        upload.findPreviousUploads().then(previous => {
            if (previous.length > 0) upload.resumeFromPreviousUpload(previous[0]);
            upload.start();
        });
    });
}

export async function uploadLibraryFile(
    file: File,
    opts: { prefix?: string; verify?: boolean; onProgress?: (fraction: number) => void } = {}
): Promise<UploadResult> {
    if (!file) return { ok: false, error: 'Keine Datei ausgewählt.' };

    const path = makeStorageFilename(file, opts.prefix);

    if (file.size >= RESUMABLE_THRESHOLD_BYTES) {
        const res = await uploadResumable(path, file, opts.onProgress);
        if (!res.ok) {
            if (res.tooLarge) {
                return {
                    ok: false,
                    error: `Datei (${humanSize(file.size)}) überschreitet das in Supabase erlaubte Limit für diesen Bucket. Bitte im Supabase-Dashboard → Storage → library_files → Edit bucket den Wert "File size limit" erhöhen.`,
                    tooLarge: true,
                };
            }
            return { ok: false, error: res.error };
        }
    } else {
        const { error: uploadError } = await supabase.storage
            .from(BUCKET)
            .upload(path, file, {
                contentType: file.type || undefined,
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) {
            if (isBucketMissingError(uploadError as any)) {
                return { ok: false, error: BUCKET_MISSING_MESSAGE, bucketMissing: true };
            }
            const msg = uploadError.message || '';
            if (isTooLargeError(msg)) {
                return {
                    ok: false,
                    error: `Datei (${humanSize(file.size)}) überschreitet das erlaubte Limit. Bitte im Supabase-Dashboard → Storage → library_files → Edit bucket den Wert "File size limit" erhöhen.`,
                    tooLarge: true,
                };
            }
            return { ok: false, error: `Upload fehlgeschlagen: ${msg}` };
        }
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
    const url = data.publicUrl;

    if (opts.verify !== false) {
        const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 60);
        if (signed.error || !signed.data?.signedUrl) {
            return {
                ok: false,
                error: `Datei hochgeladen, aber nicht abrufbar: ${signed.error?.message ?? 'unbekannt'}`,
            };
        }
        try {
            const res = await fetch(signed.data.signedUrl, { method: 'HEAD' });
            if (!res.ok) {
                return { ok: false, error: `Datei hochgeladen, aber nicht abrufbar (HTTP ${res.status}).` };
            }
        } catch (e: any) {
            return { ok: false, error: `Prüfung der Datei-URL fehlgeschlagen: ${e?.message ?? e}` };
        }
    }

    return { ok: true, url, path };
}

export async function checkLibraryBucket(): Promise<{ ok: boolean; error?: string }> {
    const { error } = await supabase.storage.from(BUCKET).list('', { limit: 1 });
    if (error) {
        if (isBucketMissingError(error as any)) {
            return { ok: false, error: BUCKET_MISSING_MESSAGE };
        }
        return { ok: false, error: error.message };
    }
    return { ok: true };
}
