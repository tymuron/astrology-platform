import { useEffect, useState, useRef } from 'react';
import { X, Megaphone } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Announcement {
    id: string;
    title: string;
    message: string;
    created_at: string;
}

export default function AnnouncementBanner() {
    const [announcement, setAnnouncement] = useState<Announcement | null>(null);
    const [dismissed, setDismissed] = useState(false);
    const [visible, setVisible] = useState(false);
    const markedRef = useRef(false);

    useEffect(() => {
        async function fetchAnnouncement() {
            try {
                // Get current user
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Fetch latest active announcement
                const { data: ann, error } = await supabase
                    .from('announcements')
                    .select('*')
                    .eq('active', true)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .single();

                if (error || !ann) return;

                // Check if this user already read this announcement (in DB)
                const { data: readRecord } = await supabase
                    .from('announcement_reads')
                    .select('id')
                    .eq('announcement_id', ann.id)
                    .eq('user_id', user.id)
                    .maybeSingle();

                if (readRecord) return; // Already seen — don't show

                setAnnouncement(ann);
                // Slight delay for smooth entrance
                setTimeout(() => setVisible(true), 100);

                // Auto-mark as read after 3 seconds
                setTimeout(() => {
                    markAsRead(ann.id, user.id);
                }, 3000);
            } catch {
                // Table might not exist yet — ignore
            }
        }
        fetchAnnouncement();
    }, []);

    const markAsRead = async (announcementId: string, userId: string) => {
        if (markedRef.current) return;
        markedRef.current = true;
        try {
            await supabase
                .from('announcement_reads')
                .upsert(
                    { announcement_id: announcementId, user_id: userId },
                    { onConflict: 'announcement_id,user_id' }
                );
        } catch {
            // Silently fail — worst case they see it once more
        }
    };

    const handleDismiss = async () => {
        setVisible(false);
        // Wait for fade-out animation
        setTimeout(() => setDismissed(true), 300);

        if (announcement) {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) markAsRead(announcement.id, user.id);
        }
    };

    if (!announcement || dismissed) return null;

    return (
        <div className={`bg-vastu-gold/15 border border-vastu-gold/30 rounded-xl p-4 mb-4 flex items-start gap-3 transition-all duration-300 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
            <div className="w-9 h-9 rounded-lg bg-vastu-gold/20 flex items-center justify-center shrink-0">
                <Megaphone size={18} className="text-vastu-dark" />
            </div>
            <div className="flex-1 min-w-0">
                <h4 className="font-serif font-medium text-vastu-dark text-sm">{announcement.title}</h4>
                {announcement.message && (
                    <p className="text-xs font-body text-vastu-text mt-0.5 whitespace-pre-line">{announcement.message}</p>
                )}
            </div>
            <button
                onClick={handleDismiss}
                className="text-vastu-text-light hover:text-vastu-dark transition-colors shrink-0 p-1"
                aria-label="Schließen"
            >
                <X size={16} />
            </button>
        </div>
    );
}
