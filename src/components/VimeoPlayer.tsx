import { useEffect, useRef, useState } from 'react';
import Player from '@vimeo/player';
import { useAuth } from '../contexts/AuthContext';
import { loadVideoProgress, saveVideoProgress, clearVideoProgress, readLocalVideoProgress } from '../lib/videoProgress';

interface VimeoPlayerProps {
    url: string;
    title?: string;
    // When set, the player remembers this student's position for this video and
    // resumes from it next time. Omit to disable tracking (e.g. welcome video).
    videoKey?: string;
}

function extractVimeoId(url: string): string {
    // Handle various Vimeo URL formats
    // https://vimeo.com/123456789
    // https://player.vimeo.com/video/123456789
    // https://vimeo.com/123456789/abc123def (private link)
    // Just a numeric ID
    if (/^\d+$/.test(url)) return url;

    const patterns = [
        /vimeo\.com\/manage\/videos\/(\d+)/,   // Management dashboard URL
        /vimeo\.com\/video\/(\d+)/,             // Direct video URL
        /vimeo\.com\/(\d+)/,                    // Standard URL
        /player\.vimeo\.com\/video\/(\d+)/,     // Embed URL
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }

    // If URL contains a hash for private videos
    const hashMatch = url.match(/vimeo\.com\/(\d+)\/([a-zA-Z0-9]+)/);
    if (hashMatch) return `${hashMatch[1]}?h=${hashMatch[2]}`;

    return url; // Return as-is if no pattern matches
}

export default function VimeoPlayer({ url, title = 'Video', videoKey }: VimeoPlayerProps) {
    const videoId = extractVimeoId(url);
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const { user } = useAuth();
    const uid = user?.id ?? null;

    // Resume position, scoped to this user. Seeded synchronously from
    // localStorage so we can set the start time via the #t fragment (reliable,
    // no seek-timing). The authoritative value is loaded below and overrides the
    // seed — which also self-corrects a wrong seed on a shared browser.
    const [startAt, setStartAt] = useState(() => (videoKey ? readLocalVideoProgress(uid, videoKey) : 0));

    useEffect(() => {
        if (!videoKey) return;
        let cancelled = false;
        loadVideoProgress(videoKey)
            .then((saved) => {
                if (cancelled) return;
                const target = saved != null && saved > 3 ? saved : 0;
                setStartAt((prev) => (prev === target ? prev : target));
            })
            .catch(() => { /* ignore */ });
        return () => { cancelled = true; };
    }, [videoKey, uid]);

    const src = `https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0${videoKey && startAt > 3 ? `#t=${startAt}s` : ''}`;

    // Save-as-you-watch. Attaches Vimeo's Player SDK to the existing iframe (the
    // iframe markup/CSS is untouched, so the display can't regress). Resume is
    // handled by the #t fragment above; the SDK here only records progress.
    useEffect(() => {
        if (!videoKey || !iframeRef.current) return;
        let lastSave = 0;
        let disposed = false;
        let staleHandled = false;
        const player = new Player(iframeRef.current);

        // If the saved position is past this video (e.g. the teacher swapped in
        // a shorter clip under the same key), the #t start-time is stale:
        // restart from 0 and clear the record. Runs at most once.
        const handleStale = (dur?: number) => {
            if (staleHandled || !dur || dur <= 0 || startAt <= dur) return;
            staleHandled = true;
            clearVideoProgress(videoKey);
            // Reload the iframe at 0 by dropping the #t (reliable, unlike an
            // SDK seek). The unmount save below is skipped while staleHandled so
            // it doesn't re-save the end position.
            setStartAt(0);
        };

        const save = (seconds?: number, duration?: number) => {
            if (typeof seconds === 'number') saveVideoProgress(videoKey, seconds, duration);
        };
        const onTimeUpdate = (d: { seconds: number; duration: number }) => {
            if (!staleHandled && startAt > 0 && d.duration > 0 && startAt > d.duration) {
                handleStale(d.duration);
                return;
            }
            const now = Date.now();
            if (now - lastSave > 8000) { lastSave = now; save(d.seconds, d.duration); }
        };
        const onPause = (d: { seconds: number; duration: number }) => save(d.seconds, d.duration);
        const onEnded = () => clearVideoProgress(videoKey);

        player.on('timeupdate', onTimeUpdate);
        player.on('pause', onPause);
        player.on('ended', onEnded);

        // Detect the stale case even without playback: poll for the real
        // duration (it can lag on slow connections), then check once.
        (async () => {
            try {
                await player.ready();
                for (let i = 0; i < 40 && !disposed && !staleHandled; i++) {
                    const dur = await player.getDuration().catch(() => 0);
                    if (dur > 0) { handleStale(dur); break; }
                    await new Promise((r) => setTimeout(r, 500));
                }
            } catch { /* ignore */ }
        })();

        return () => {
            disposed = true;
            // Capture the final position on navigation/unmount — unless we just
            // reset a stale position (would re-save the end of the old video).
            if (!staleHandled) player.getCurrentTime().then((s) => save(s)).catch(() => { /* ignore */ });
            player.off('timeupdate', onTimeUpdate);
            player.off('pause', onPause);
            player.off('ended', onEnded);
            // Intentionally no player.destroy(): React owns and removes the
            // <iframe>, and destroy() would race with that removal.
        };
    }, [videoKey, videoId, startAt]);

    return (
        <div className="vimeo-wrapper">
            <iframe
                ref={iframeRef}
                src={src}
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                allowFullScreen
                title={title}
            />
        </div>
    );
}
