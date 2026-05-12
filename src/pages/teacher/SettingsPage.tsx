import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Save, Video, Link as LinkIcon, Map, MessageCircle, BookOpen, Megaphone, Send, Trash2, CalendarPlus, Calendar, Pencil, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getVideoEmbedUrl } from '../../lib/utils';

interface Announcement {
    id: string;
    title: string;
    message: string;
    active: boolean;
    created_at: string;
}

interface CourseEvent {
    id: string;
    title: string;
    description: string;
    event_date: string;
    duration_minutes: number;
    location: string;
    created_at: string;
}

function normalizeWelcomeVideoUrl(rawUrl: string) {
    const url = rawUrl.trim();
    if (!url) return '';

    if (url.includes('vimeo.com') && !url.includes('player.vimeo.com/video/')) {
        const match = url.match(/vimeo\.com\/(?:manage\/videos\/)?(\d+)/);
        if (match?.[1]) return `https://player.vimeo.com/video/${match[1]}`;
    }

    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('<iframe')) {
        return getVideoEmbedUrl(url);
    }

    return url;
}

export default function SettingsPage() {
    const [welcomeVideoUrl, setWelcomeVideoUrl] = useState('');
    const [zoomLink, setZoomLink] = useState('');
    const [telegramLink, setTelegramLink] = useState('');
    const [vastuMapLink, setVastuMapLink] = useState('');
    const [instructionUrl, setInstructionUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const { isDemo } = useAuth();

    // Announcements
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [newAnnouncementTitle, setNewAnnouncementTitle] = useState('');
    const [newAnnouncementMessage, setNewAnnouncementMessage] = useState('');
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

    // Events
    const [events, setEvents] = useState<CourseEvent[]>([]);
    const [eventTitle, setEventTitle] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [eventTime, setEventTime] = useState('18:00');
    const [eventDuration, setEventDuration] = useState(120);
    const [eventLocation, setEventLocation] = useState('');
    const [savingEvent, setSavingEvent] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            if (isDemo) {
                setWelcomeVideoUrl('https://player.vimeo.com/video/placeholder');
                setZoomLink('https://zoom.us');
                setTelegramLink('https://t.me');
                setVastuMapLink('https://www.vastusphere.net');
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('platform_settings')
                    .select('*')
                    .single();

                if (error && error.code !== 'PGRST116') { // PGRST116 is 'not found', which is fine for the first time
                    throw error;
                }

                if (data) {
                    setWelcomeVideoUrl(data.welcome_video_url || '');
                    setZoomLink(data.zoom_link || '');
                    setTelegramLink(data.telegram_link || '');
                    setVastuMapLink(data.vastu_map_link || 'https://www.vastusphere.net');
                    setInstructionUrl(data.instruction_url || '');
                }
            } catch (err) {
                console.error('Error loading settings:', err);
                setMessage({ text: 'Fehler beim Laden der Einstellungen.', type: 'error' });
            } finally {
                setLoading(false);
            }
        };

        const fetchAnnouncements = async () => {
            try {
                const { data } = await supabase
                    .from('announcements')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .limit(10);
                if (data) setAnnouncements(data);
            } catch {
                // Table might not exist yet
            }
        };

        const fetchEvents = async () => {
            try {
                const { data } = await supabase
                    .from('course_events')
                    .select('*')
                    .order('event_date', { ascending: true });
                if (data) setEvents(data);
            } catch {
                // Table might not exist yet
            }
        };

        fetchSettings();
        fetchAnnouncements();
        fetchEvents();
    }, [isDemo]);

    const handleSendAnnouncement = async () => {
        if (!newAnnouncementTitle.trim()) return;
        setSendingAnnouncement(true);
        try {
            // Deactivate all previous announcements
            await supabase.from('announcements').update({ active: false }).eq('active', true);

            const { data, error } = await supabase
                .from('announcements')
                .insert({
                    title: newAnnouncementTitle.trim(),
                    message: newAnnouncementMessage.trim(),
                    active: true,
                })
                .select()
                .single();

            if (error) throw error;
            if (data) setAnnouncements(prev => [data, ...prev]);
            setNewAnnouncementTitle('');
            setNewAnnouncementMessage('');
        } catch (err) {
            console.error('Error sending announcement:', err);
            alert('Fehler beim Senden der Nachricht.');
        } finally {
            setSendingAnnouncement(false);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        try {
            await supabase.from('announcements').delete().eq('id', id);
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error('Error deleting announcement:', err);
        }
    };

    const handleToggleAnnouncement = async (id: string, active: boolean) => {
        try {
            if (active) {
                // Deactivate all others first
                await supabase.from('announcements').update({ active: false }).eq('active', true);
            }
            await supabase.from('announcements').update({ active }).eq('id', id);
            setAnnouncements(prev => prev.map(a =>
                a.id === id ? { ...a, active } : (active ? { ...a, active: false } : a)
            ));
        } catch (err) {
            console.error('Error toggling announcement:', err);
        }
    };

    const resetEventForm = () => {
        setEventTitle('');
        setEventDescription('');
        setEventDate('');
        setEventTime('18:00');
        setEventDuration(120);
        setEventLocation('');
        setEditingEventId(null);
    };

    const handleSaveEvent = async () => {
        if (!eventTitle.trim() || !eventDate) return;
        setSavingEvent(true);
        try {
            const eventDateTime = new Date(`${eventDate}T${eventTime}:00`).toISOString();
            const payload = {
                title: eventTitle.trim(),
                description: eventDescription.trim(),
                event_date: eventDateTime,
                duration_minutes: eventDuration,
                location: eventLocation.trim(),
            };

            if (editingEventId) {
                const { data, error } = await supabase
                    .from('course_events')
                    .update(payload)
                    .eq('id', editingEventId)
                    .select()
                    .single();
                if (error) throw error;
                if (data) setEvents(prev => prev.map(e => e.id === editingEventId ? data : e));
            } else {
                const { data, error } = await supabase
                    .from('course_events')
                    .insert(payload)
                    .select()
                    .single();
                if (error) throw error;
                if (data) setEvents(prev => [...prev, data].sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime()));
            }
            resetEventForm();
        } catch (err) {
            console.error('Error saving event:', err);
            alert('Fehler beim Speichern des Termins.');
        } finally {
            setSavingEvent(false);
        }
    };

    const handleEditEvent = (ev: CourseEvent) => {
        const d = new Date(ev.event_date);
        setEditingEventId(ev.id);
        setEventTitle(ev.title);
        setEventDescription(ev.description || '');
        setEventDate(d.toISOString().split('T')[0]);
        setEventTime(d.toTimeString().slice(0, 5));
        setEventDuration(ev.duration_minutes);
        setEventLocation(ev.location || '');
    };

    const handleDeleteEvent = async (id: string) => {
        try {
            await supabase.from('course_events').delete().eq('id', id);
            setEvents(prev => prev.filter(e => e.id !== id));
            if (editingEventId === id) resetEventForm();
        } catch (err) {
            console.error('Error deleting event:', err);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ text: '', type: '' });

        if (isDemo) {
            setTimeout(() => {
                setSaving(false);
                setMessage({ text: 'Einstellungen erfolgreich gespeichert! (Demo Modus)', type: 'success' });
            }, 800);
            return;
        }

        try {
            const normalizedWelcomeVideoUrl = normalizeWelcomeVideoUrl(welcomeVideoUrl);
            // Upsert the single row (we will use id = 1 in the database)
            const { error } = await supabase
                .from('platform_settings')
                .upsert({
                    id: 1, // Enforce single row
                    welcome_video_url: normalizedWelcomeVideoUrl,
                    zoom_link: zoomLink,
                    telegram_link: telegramLink,
                    vastu_map_link: vastuMapLink,
                    instruction_url: instructionUrl,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            setWelcomeVideoUrl(normalizedWelcomeVideoUrl);
            setMessage({ text: 'Einstellungen erfolgreich gespeichert!', type: 'success' });
        } catch (err) {
            console.error('Error saving settings:', err);
            setMessage({ text: 'Fehler beim Speichern der Einstellungen.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="animate-spin text-vastu-dark" size={32} />
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-serif text-vastu-dark mb-2">Plattform Einstellungen</h1>
            <p className="font-body text-vastu-text-light mb-8">
                Verwalte hier die Links für die Willkommensseite der Studenten.
            </p>

            {message.text && (
                <div className={`mb-6 p-4 rounded-xl border font-sans text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">

                {/* Welcome Video Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-lg bg-vastu-gold/10 flex items-center justify-center">
                            <Video className="text-vastu-gold" size={20} />
                        </div>
                        <div>
                            <h2 className="font-serif text-xl text-vastu-dark">Begrüßungsvideo</h2>
                            <p className="text-sm font-sans text-vastu-text-light">Das Video, das ganz oben auf der Willkommensseite angezeigt wird.</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-sans font-medium text-vastu-dark mb-1.5">Vimeo / YouTube URL</label>
                        <input
                            type="url"
                            value={welcomeVideoUrl}
                            onChange={(e) => setWelcomeVideoUrl(e.target.value)}
                            placeholder="z.B. https://vimeo.com/123456789"
                            className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                        />
                        <p className="text-xs text-vastu-text-light mt-2 italic">Wenn leer, wird das Video-Element für Studenten ausgeblendet.</p>
                    </div>
                </div>

                {/* Quick Links Section */}
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-lg bg-vastu-gold/10 flex items-center justify-center">
                            <LinkIcon className="text-vastu-gold" size={20} />
                        </div>
                        <div>
                            <h2 className="font-serif text-xl text-vastu-dark">Quick Links</h2>
                            <p className="text-sm font-sans text-vastu-text-light">Die Schnellzugriff-Buttons auf der Willkommensseite.</p>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <div>
                            <label className="block text-sm font-sans font-medium text-vastu-dark mb-1.5 flex items-center gap-2">
                                <Video size={16} className="text-blue-500" />
                                Zoom Meeting Link
                            </label>
                            <input
                                type="url"
                                value={zoomLink}
                                onChange={(e) => setZoomLink(e.target.value)}
                                placeholder="https://us02web.zoom.us/j/..."
                                className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                            />
                            <p className="text-xs text-vastu-text-light mt-1.5 italic">Link für das wöchentliche Live-Meeting.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-sans font-medium text-vastu-dark mb-1.5 flex items-center gap-2">
                                <MessageCircle size={16} className="text-sky-500" />
                                Telegram Kanal Link
                            </label>
                            <input
                                type="url"
                                value={telegramLink}
                                onChange={(e) => setTelegramLink(e.target.value)}
                                placeholder="https://t.me/+"
                                className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                            />
                            <p className="text-xs text-vastu-text-light mt-1.5 italic">Link zur Telegram Community-Gruppe.</p>
                        </div>

                        <div className="pt-2 border-t border-vastu-sand/30">
                            <label className="block text-sm font-sans font-medium text-vastu-dark mt-4 mb-1.5 flex items-center gap-2">
                                <Map size={16} className="text-vastu-gold" />
                                Vastu Karte Erstellung Link
                            </label>
                            <input
                                type="url"
                                value={vastuMapLink}
                                onChange={(e) => setVastuMapLink(e.target.value)}
                                placeholder="https://www.vastusphere.net"
                                className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                            />
                            <p className="text-xs text-vastu-text-light mt-1.5 italic">Standard: https://www.vastusphere.net</p>
                        </div>

                        <div className="pt-2 border-t border-vastu-sand/30">
                            <label className="block text-sm font-sans font-medium text-vastu-dark mt-4 mb-1.5 flex items-center gap-2">
                                <BookOpen size={16} className="text-emerald-500" />
                                Anleitung Link (z.B. Vimeo Untertitel)
                            </label>
                            <input
                                type="url"
                                value={instructionUrl}
                                onChange={(e) => setInstructionUrl(e.target.value)}
                                placeholder="https://support.vimeo.com/..."
                                className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                            />
                            <p className="text-xs text-vastu-text-light mt-1.5 italic">Wird als klickbarer Link im Bereich „Hilfreiche Anleitungen" angezeigt.</p>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-vastu-dark text-white px-8 py-3.5 rounded-xl font-sans font-medium hover:bg-vastu-dark-deep transition-all shadow-lg shadow-vastu-dark/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        {saving ? 'Wird gespeichert...' : 'Änderungen speichern'}
                    </button>
                </div>
            </form>

            {/* Announcements Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8 mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-vastu-gold/10 flex items-center justify-center">
                        <Megaphone className="text-vastu-gold" size={20} />
                    </div>
                    <div>
                        <h2 className="font-serif text-xl text-vastu-dark">Nachrichten an Teilnehmer</h2>
                        <p className="text-sm font-sans text-vastu-text-light">Sende Pop-up Nachrichten, die alle Teilnehmer sehen.</p>
                    </div>
                </div>

                {/* New Announcement Form */}
                <div className="space-y-3 mb-6">
                    <input
                        type="text"
                        value={newAnnouncementTitle}
                        onChange={e => setNewAnnouncementTitle(e.target.value)}
                        placeholder="Titel der Nachricht (z.B. Neues Modul freigeschaltet!)"
                        className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                    />
                    <textarea
                        value={newAnnouncementMessage}
                        onChange={e => setNewAnnouncementMessage(e.target.value)}
                        placeholder="Nachricht (optional)"
                        rows={3}
                        className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base resize-none"
                    />
                    <button
                        onClick={handleSendAnnouncement}
                        disabled={!newAnnouncementTitle.trim() || sendingAnnouncement}
                        className="flex items-center gap-2 bg-vastu-gold text-white px-6 py-2.5 rounded-xl font-sans font-medium hover:bg-vastu-gold/90 transition-all disabled:opacity-50"
                    >
                        {sendingAnnouncement ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                        Nachricht senden
                    </button>
                </div>

                {/* Previous Announcements */}
                {announcements.length > 0 && (
                    <div>
                        <h4 className="text-sm font-sans font-medium text-vastu-text-light mb-3">Bisherige Nachrichten</h4>
                        <div className="space-y-2">
                            {announcements.map(a => (
                                <div key={a.id} className={`flex items-center justify-between p-3 rounded-lg border ${a.active ? 'bg-vastu-gold/5 border-vastu-gold/30' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium text-sm text-vastu-dark">{a.title}</span>
                                            {a.active && <span className="text-[10px] px-2 py-0.5 bg-vastu-gold/20 text-vastu-dark rounded-full font-sans">Aktiv</span>}
                                        </div>
                                        {a.message && <p className="text-xs text-vastu-text-light mt-0.5 truncate">{a.message}</p>}
                                        <p className="text-[10px] text-gray-400 mt-1">{new Date(a.created_at).toLocaleString('de-DE')}</p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-3">
                                        <button
                                            onClick={() => handleToggleAnnouncement(a.id, !a.active)}
                                            className={`text-xs px-3 py-1 rounded-lg transition-colors ${a.active ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-vastu-gold/20 text-vastu-dark hover:bg-vastu-gold/30'}`}
                                        >
                                            {a.active ? 'Deaktivieren' : 'Aktivieren'}
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAnnouncement(a.id)}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Course Events / Calendar Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8 mt-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-lg bg-vastu-gold/10 flex items-center justify-center">
                        <CalendarPlus className="text-vastu-gold" size={20} />
                    </div>
                    <div>
                        <h2 className="font-serif text-xl text-vastu-dark">Termine & Kalender</h2>
                        <p className="text-sm font-sans text-vastu-text-light">Erstelle Termine, die Studenten in ihren Kalender speichern können.</p>
                    </div>
                </div>

                {/* Event Form */}
                <div className="space-y-3 mb-6">
                    <input
                        type="text"
                        value={eventTitle}
                        onChange={e => setEventTitle(e.target.value)}
                        placeholder="Titel (z.B. Live-Session Modul 3)"
                        className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                    />
                    <textarea
                        value={eventDescription}
                        onChange={e => setEventDescription(e.target.value)}
                        placeholder="Beschreibung (optional)"
                        rows={2}
                        className="w-full px-4 py-3 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base resize-none"
                    />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-xs font-sans text-vastu-text-light mb-1">Datum</label>
                            <input
                                type="date"
                                value={eventDate}
                                onChange={e => setEventDate(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-sans text-vastu-text-light mb-1">Uhrzeit</label>
                            <input
                                type="time"
                                value={eventTime}
                                onChange={e => setEventTime(e.target.value)}
                                className="w-full px-3 py-2.5 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-sans text-vastu-text-light mb-1">Dauer (Min.)</label>
                            <input
                                type="number"
                                value={eventDuration}
                                onChange={e => setEventDuration(Number(e.target.value))}
                                min={15}
                                step={15}
                                className="w-full px-3 py-2.5 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-sans text-vastu-text-light mb-1">Ort (optional)</label>
                            <input
                                type="text"
                                value={eventLocation}
                                onChange={e => setEventLocation(e.target.value)}
                                placeholder="z.B. Zoom"
                                className="w-full px-3 py-2.5 bg-white border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-sm"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSaveEvent}
                            disabled={!eventTitle.trim() || !eventDate || savingEvent}
                            className="flex items-center gap-2 bg-vastu-gold text-white px-6 py-2.5 rounded-xl font-sans font-medium hover:bg-vastu-gold/90 transition-all disabled:opacity-50"
                        >
                            {savingEvent ? <Loader2 size={16} className="animate-spin" /> : <CalendarPlus size={16} />}
                            {editingEventId ? 'Termin aktualisieren' : 'Termin erstellen'}
                        </button>
                        {editingEventId && (
                            <button
                                onClick={resetEventForm}
                                className="flex items-center gap-2 text-vastu-text-light hover:text-vastu-dark px-4 py-2.5 rounded-xl font-sans text-sm transition-colors"
                            >
                                <X size={16} />
                                Abbrechen
                            </button>
                        )}
                    </div>
                </div>

                {/* Existing Events */}
                {events.length > 0 && (
                    <div>
                        <h4 className="text-sm font-sans font-medium text-vastu-text-light mb-3">Geplante Termine</h4>
                        <div className="space-y-2">
                            {events.map(ev => {
                                const d = new Date(ev.event_date);
                                const isPast = d < new Date();
                                return (
                                    <div key={ev.id} className={`flex items-center justify-between p-3 rounded-lg border ${isPast ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-vastu-gold/5 border-vastu-gold/30'}`}>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} className="text-vastu-gold shrink-0" />
                                                <span className="font-medium text-sm text-vastu-dark">{ev.title}</span>
                                            </div>
                                            <p className="text-xs text-vastu-text-light mt-0.5">
                                                {d.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                                                {' · '}{d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                                                {' · '}{ev.duration_minutes} Min.
                                                {ev.location && ` · ${ev.location}`}
                                            </p>
                                            {ev.description && <p className="text-xs text-vastu-text-light mt-0.5 truncate">{ev.description}</p>}
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0 ml-3">
                                            <button
                                                onClick={() => handleEditEvent(ev)}
                                                className="text-vastu-text-light hover:text-vastu-dark transition-colors"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteEvent(ev.id)}
                                                className="text-gray-400 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
