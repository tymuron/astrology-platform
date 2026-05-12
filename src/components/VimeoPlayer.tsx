interface VimeoPlayerProps {
    url: string;
    title?: string;
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

export default function VimeoPlayer({ url, title = 'Video' }: VimeoPlayerProps) {
    const videoId = extractVimeoId(url);

    return (
        <div className="vimeo-wrapper">
            <iframe
                src={`https://player.vimeo.com/video/${videoId}?badge=0&autopause=0&player_id=0`}
                allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
                allowFullScreen
                title={title}
            />
        </div>
    );
}
