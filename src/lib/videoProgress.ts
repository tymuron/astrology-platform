import { supabase } from './supabase';

// Remembers each student's playback position per video so they can resume
// where they paused. Primary store is Supabase (public.video_progress), which
// syncs across devices. localStorage is a synchronous fallback used when the
// table isn't reachable yet (e.g. before the migration runs) so the feature
// still works per-device and never throws.
//
// localStorage keys are scoped by user id, so a shared browser never leaks one
// student's position to another.
const LS_PREFIX = 'vastu.videopos.';

function lsKey(uid: string | null, videoKey: string): string {
    return `${LS_PREFIX}${uid || 'anon'}.${videoKey}`;
}

async function currentUserId(): Promise<string | null> {
    try {
        const { data } = await supabase.auth.getSession();
        return data.session?.user?.id ?? null;
    } catch {
        return null;
    }
}

/** Synchronous localStorage-only read, for seeding the resume position at
 *  first render (so the #t start-time can be set without waiting on a query).
 *  Pass the current user id so a position is never read across users. */
export function readLocalVideoProgress(uid: string | null, videoKey: string): number {
    try {
        const v = localStorage.getItem(lsKey(uid, videoKey));
        const n = v != null ? parseInt(v, 10) : 0;
        return Number.isFinite(n) && n > 0 ? n : 0;
    } catch {
        return 0;
    }
}

/** Authoritative saved position in whole seconds, or null if none.
 *  Supabase first (cross-device), then this user's localStorage mirror. */
export async function loadVideoProgress(videoKey: string): Promise<number | null> {
    const uid = await currentUserId();
    if (uid) {
        try {
            const { data, error } = await supabase
                .from('video_progress')
                .select('position_seconds')
                .eq('user_id', uid)
                .eq('video_key', videoKey)
                .maybeSingle();
            if (!error && data && data.position_seconds != null) {
                return Number(data.position_seconds);
            }
        } catch {
            /* fall through to localStorage */
        }
    }
    try {
        const v = localStorage.getItem(lsKey(uid, videoKey));
        return v != null ? Number(v) : null;
    } catch {
        return null;
    }
}

export async function saveVideoProgress(videoKey: string, seconds: number, duration?: number): Promise<void> {
    if (!Number.isFinite(seconds) || seconds < 0) return;
    const pos = Math.floor(seconds);
    const uid = await currentUserId();
    try { localStorage.setItem(lsKey(uid, videoKey), String(pos)); } catch { /* ignore */ }

    if (!uid) return;
    try {
        await supabase.from('video_progress').upsert({
            user_id: uid,
            video_key: videoKey,
            position_seconds: pos,
            duration_seconds: duration && Number.isFinite(duration) ? Math.floor(duration) : null,
            updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,video_key' });
    } catch {
        /* best effort — localStorage already holds it */
    }
}

export async function clearVideoProgress(videoKey: string): Promise<void> {
    const uid = await currentUserId();
    try { localStorage.removeItem(lsKey(uid, videoKey)); } catch { /* ignore */ }
    if (!uid) return;
    try {
        await supabase.from('video_progress').delete().eq('user_id', uid).eq('video_key', videoKey);
    } catch {
        /* best effort */
    }
}
