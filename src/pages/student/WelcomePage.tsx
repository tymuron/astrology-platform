import { ExternalLink, Play, Calendar, Video, MessageCircle, Star, ArrowRight, BookOpen, Library, Smartphone, LogOut, Loader2 } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCourseContext } from '../../contexts/CourseContext';
import { useModules } from '../../hooks/useCourse';

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getVideoEmbedUrl, navigateBackOr } from '../../lib/utils';
import VimeoPlayer from '../../components/VimeoPlayer';
import { CalendarEvent, CourseSettings, UsefulLink } from '../../lib/types';

function formatEventDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export default function WelcomePage() {
    const { user, signOut, loading, role, isDemo } = useAuth();
    const { activeCourseId, courses } = useCourseContext();
    const navigate = useNavigate();
    const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Teilnehmer';
    const { modules } = useModules();

    const activeCourse = courses.find(c => c.id === activeCourseId) || null;

    // Per-wave welcome settings (Phase 2E).
    const [settings, setSettings] = useState<CourseSettings | null>(null);
    // Single global field still kept in platform_settings (instruction_url for the help link).
    const [globalInstructionUrl, setGlobalInstructionUrl] = useState<string | null>(null);

    useEffect(() => {
        async function loadSettings() {
            if (isDemo || !activeCourseId) {
                setSettings(null);
                return;
            }
            const { data, error } = await supabase
                .from('course_settings')
                .select('*')
                .eq('course_id', activeCourseId)
                .maybeSingle();
            if (error) {
                console.warn('course_settings load failed:', error.message);
                setSettings(null);
                return;
            }
            if (!data) {
                setSettings(null);
                return;
            }
            setSettings({
                ...data,
                useful_links: Array.isArray(data.useful_links) ? data.useful_links : [],
                calendar_events: Array.isArray(data.calendar_events) ? data.calendar_events : [],
            } as CourseSettings);
        }
        loadSettings();
    }, [activeCourseId, isDemo]);

    useEffect(() => {
        async function loadGlobal() {
            if (isDemo) return;
            const { data } = await supabase.from('platform_settings').select('instruction_url').eq('id', 1).maybeSingle();
            if (data?.instruction_url) setGlobalInstructionUrl(data.instruction_url);
        }
        loadGlobal();
    }, [isDemo]);

    const welcomeVideoUrl = settings?.welcome_video_url?.trim() || '';
    const isVimeoWelcomeVideo = welcomeVideoUrl.includes('vimeo.com');
    const embedWelcomeUrl = isVimeoWelcomeVideo ? '' : getVideoEmbedUrl(welcomeVideoUrl);

    const calendarEvents: CalendarEvent[] = settings?.calendar_events ?? [];
    const usefulLinks: UsefulLink[] = settings?.useful_links ?? [];

    // Course progress
    const mainModules = modules.filter(m => m.id !== 'pre' && m.id !== 'bonus');
    const totalLessons = mainModules.reduce((acc, m) => acc + m.lektionen.length, 0);
    const completedLessons = mainModules.reduce((acc, m) => acc + m.lektionen.filter(l => l.isCompleted).length, 0);
    const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    if (loading) return <div className="min-h-screen bg-vastu-dark-deep flex items-center justify-center"><Loader2 className="animate-spin text-vastu-gold" size={40} /></div>;
    if (!user) return <Navigate to="/login" replace />;
    if (role === 'teacher') return <Navigate to="/teacher" replace />;

    return (
        <div className="min-h-screen bg-vastu-light">
            {/* Top navigation bar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-vastu-sand/40">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/student/welcome" className="flex items-center gap-4">
                        <img src="/logo.png" alt="Academy" className="w-12 h-12 object-contain drop-shadow-md" />
                        <div className="flex flex-col">
                            <span className="font-serif text-base tracking-[0.20em] text-vastu-dark leading-none">ASTROLOGIE</span>
                            <span className="font-script text-vastu-gold text-xs mt-1">{activeCourse?.title || 'Selbstentdeckung Academy'}</span>
                        </div>
                    </Link>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigateBackOr(navigate, '/student')}
                            className="hidden sm:flex items-center gap-2 text-vastu-text-light hover:text-vastu-dark transition-colors mr-4 group text-sm font-sans"
                        >
                            <span>Zum Kurs →</span>
                        </button>
                        <span className="text-sm font-sans text-vastu-text-light hidden sm:block">{displayName}</span>
                        <button onClick={() => signOut()} className="text-vastu-text-light hover:text-vastu-dark transition-colors">
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero — Full-screen */}
            <section className="min-h-screen flex items-center justify-center relative overflow-hidden pt-16">
                <div className="absolute inset-0 bg-vastu-dark-deep" />
                <div className="absolute inset-0 grain-overlay opacity-30" />
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-vastu-gold/8 rounded-full blur-[150px] translate-x-1/4 -translate-y-1/4" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-vastu-accent/5 rounded-full blur-[120px] -translate-x-1/4 translate-y-1/4" />

                <div className="relative z-10 text-center text-white px-6 max-w-3xl mx-auto">
                    <p className="font-script text-vastu-gold text-3xl md:text-5xl mb-4 animate-fade-in">Willkommen, {displayName}</p>
                    <h1 className="text-5xl md:text-8xl font-serif tracking-[0.12em] mb-3 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                        GANZHEITLICHE VEDISCHE ASTROLOGIE
                    </h1>
                    <p className="font-script text-vastu-gold/80 text-xl md:text-2xl mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                        {activeCourse?.title || 'Selbstentdeckung Academy'}
                    </p>

                    <div className="flex items-center justify-center gap-4 mb-8 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                        <div className="w-20 h-px bg-gradient-to-r from-transparent to-vastu-gold/50" />
                        <Star size={14} className="text-vastu-gold/70" />
                        <div className="w-20 h-px bg-gradient-to-l from-transparent to-vastu-gold/50" />
                    </div>

                    <p className="text-white/60 font-body text-lg md:text-xl leading-relaxed mb-10 max-w-xl mx-auto animate-fade-in whitespace-pre-line" style={{ animationDelay: '0.4s' }}>
                        {settings?.welcome_intro?.trim() ||
                            'Deine Reise durch die Sterne beginnt hier. Entdecke die Weisheit der vedischen Astrologie und führe sie zurück in dein Leben.'}
                    </p>

                    <Link
                        to="/student"
                        className="inline-flex items-center gap-3 bg-vastu-gold text-vastu-dark-deep px-8 py-4 rounded-full font-sans font-semibold text-lg hover:bg-vastu-gold/90 transition-all shadow-xl shadow-black/30 hover:shadow-2xl hover:scale-[1.02] animate-fade-in"
                        style={{ animationDelay: '0.5s' }}
                    >
                        Zum Kurs
                        <ArrowRight size={20} />
                    </Link>
                </div>

                <div className="absolute bottom-8 inset-x-0 flex justify-center text-white/25 text-xs font-sans animate-fade-in" style={{ animationDelay: '0.8s' }}>
                    <div className="flex flex-col items-center gap-2">
                        <span>Zu allen Infos</span>
                        <div className="w-px h-8 bg-gradient-to-b from-white/20 to-transparent" />
                    </div>
                </div>
            </section>

            {/* Content Sections Below the Fold */}
            <section className="max-w-5xl mx-auto px-6 py-16 space-y-12">

                {/* Welcome Video */}
                {welcomeVideoUrl !== '' && (
                    <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 overflow-hidden">
                        <div className="p-6 md:p-8">
                            <h3 className="font-serif text-2xl text-vastu-dark mb-1 flex items-center gap-2">
                                <Play className="text-vastu-gold" size={22} />
                                Begrüßungsvideo
                            </h3>
                            <p className="text-vastu-text-light font-body text-base mb-5">Schau dir das Einführungsvideo an, bevor du startest.</p>
                            {isVimeoWelcomeVideo ? (
                                <VimeoPlayer url={welcomeVideoUrl} title="Willkommen" />
                            ) : !embedWelcomeUrl ? (
                                <div className="rounded-xl border border-vastu-sand/40 bg-vastu-cream/40 p-4 text-sm text-vastu-text-light">
                                    Der gespeicherte Video-Link ist nicht als Embed-Link lesbar. Bitte im Admin-Bereich aktualisieren.
                                </div>
                            ) : (
                                <div className="vimeo-wrapper">
                                    <iframe
                                        src={embedWelcomeUrl}
                                        allow="autoplay; fullscreen; picture-in-picture"
                                        allowFullScreen
                                        title="Willkommen"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Info Grid */}
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Calendar — per-wave events */}
                    <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8">
                        <h3 className="font-serif text-xl text-vastu-dark mb-2 flex items-center gap-2">
                            <Calendar className="text-vastu-gold" size={20} />
                            Bevorstehende Termine
                        </h3>
                        {calendarEvents.length === 0 ? (
                            <p className="text-vastu-text-light font-body text-sm italic">
                                Termine werden hier angezeigt, sobald deine Mentorin sie eingetragen hat.
                            </p>
                        ) : (
                            <div className="relative pl-6 space-y-1 mt-4">
                                <div className="absolute left-[9px] top-2 bottom-2 w-px bg-vastu-sand" />
                                {calendarEvents.map((ev, i) => (
                                    <div key={i} className="relative py-2">
                                        <div className="flex items-start gap-3">
                                            <div className="absolute left-[-15px] top-[11px] w-[7px] h-[7px] rounded-full bg-vastu-gold ring-4 ring-vastu-gold/20" />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-sans text-sm font-medium text-vastu-dark">{ev.label}</span>
                                                    <span className="text-vastu-text-light font-sans text-xs ml-auto shrink-0">{formatEventDate(ev.datetime)}</span>
                                                </div>
                                                {ev.description && (
                                                    <p className="text-xs font-body text-vastu-text-light pl-2 border-l border-vastu-sand/50 mt-1">{ev.description}</p>
                                                )}
                                                {ev.url && (
                                                    <a href={ev.url} target="_blank" rel="noreferrer" className="text-xs font-sans text-vastu-gold hover:underline mt-1 inline-block">Öffnen</a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Quick Links */}
                    <div className="space-y-4">
                        {settings?.zoom_link && settings.zoom_link.trim() !== '' && (
                            <a href={settings.zoom_link} target="_blank" rel="noopener noreferrer"
                                className="block bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-5 hover:shadow-md hover:border-vastu-gold/30 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-[52px] h-[52px] rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors shrink-0">
                                        <Video className="text-blue-600" size={26} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-serif text-lg text-vastu-dark">Zoom Meeting</h4>
                                        <p className="text-vastu-text-light font-body text-sm">Klicke hier, um dem Live-Meeting beizutreten</p>
                                    </div>
                                    <ExternalLink size={18} className="text-vastu-sand group-hover:text-vastu-dark transition-colors shrink-0" />
                                </div>
                            </a>
                        )}

                        {settings?.telegram_link && settings.telegram_link.trim() !== '' && (
                            <a href={settings.telegram_link} target="_blank" rel="noopener noreferrer"
                                className="block bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-5 hover:shadow-md hover:border-vastu-gold/30 transition-all group">
                                <div className="flex items-center gap-4">
                                    <div className="w-[52px] h-[52px] rounded-xl bg-sky-50 flex items-center justify-center group-hover:bg-sky-100 transition-colors shrink-0">
                                        <MessageCircle className="text-sky-500" size={26} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-serif text-lg text-vastu-dark">Telegram Kanal</h4>
                                        <p className="text-vastu-text-light font-body text-sm">Fragen, Austausch & Community</p>
                                    </div>
                                    <ExternalLink size={18} className="text-vastu-sand group-hover:text-vastu-dark transition-colors shrink-0" />
                                </div>
                            </a>
                        )}

                        <Link to="/student"
                            className="block bg-vastu-dark grain-overlay rounded-2xl shadow-lg shadow-vastu-dark/15 p-5 hover:shadow-xl transition-all group text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-vastu-gold opacity-10 rounded-full blur-[60px] translate-x-1/3 -translate-y-1/3" />
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-[52px] h-[52px] rounded-xl bg-vastu-gold/20 flex items-center justify-center group-hover:bg-vastu-gold/30 transition-colors shrink-0">
                                    <Play className="text-vastu-gold" size={26} />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-serif text-lg text-vastu-gold">Kurs starten</h4>
                                    <p className="text-white/50 font-body text-sm">Direkt zum ersten Modul</p>
                                </div>
                                <ArrowRight className="text-vastu-gold/50 group-hover:text-vastu-gold transition-colors" size={20} />
                            </div>
                        </Link>

                        {settings?.external_tool_url && settings.external_tool_url.trim() !== '' && (
                            <a href={settings.external_tool_url} target="_blank" rel="noopener noreferrer"
                                className="block bg-vastu-dark grain-overlay rounded-2xl shadow-lg shadow-vastu-dark/15 p-5 hover:shadow-xl transition-all group text-white relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-40 h-40 bg-vastu-gold opacity-10 rounded-full blur-[60px] translate-x-1/3 -translate-y-1/3" />
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-[52px] h-[52px] rounded-xl bg-vastu-gold/20 flex items-center justify-center group-hover:bg-vastu-gold/30 transition-colors shrink-0">
                                        <ExternalLink className="text-vastu-gold" size={26} />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-serif text-lg text-vastu-gold">{settings.external_tool_label || 'Externes Tool'}</h4>
                                        <p className="text-white/50 font-body text-sm">In neuem Tab öffnen</p>
                                    </div>
                                    <ExternalLink className="text-vastu-gold/50 group-hover:text-vastu-gold transition-colors" size={20} />
                                </div>
                            </a>
                        )}
                    </div>
                </div>

                {/* Useful links — per-wave list */}
                {usefulLinks.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8">
                        <h3 className="font-serif text-xl text-vastu-dark mb-4 flex items-center gap-2">
                            <ExternalLink className="text-vastu-gold" size={20} />
                            Nützliche Links
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {usefulLinks.map((link, i) => (
                                <a key={i} href={link.url} target="_blank" rel="noreferrer"
                                    className="block bg-vastu-cream/60 rounded-xl px-4 py-3 hover:bg-vastu-cream transition-colors border border-vastu-sand/30">
                                    <span className="font-serif text-vastu-dark">{link.label}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}

                {/* Bottom navigation cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { to: '/student', icon: BookOpen, label: 'Mein Kurs', desc: 'Module & Lektionen' },
                        { to: '/student/library', icon: Library, label: 'Bibliothek', desc: 'Materialien' },
                        { to: '/student/install', icon: Smartphone, label: 'App installieren', desc: 'Anleitung' },
                        { to: '/student/profile', icon: Star, label: 'Profil', desc: 'Einstellungen' },
                    ].map((item) => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className="bg-white rounded-xl border border-vastu-sand/50 p-5 text-center hover:shadow-md hover:border-vastu-gold/30 transition-all group"
                        >
                            <item.icon className="mx-auto mb-2 text-vastu-dark group-hover:text-vastu-gold transition-colors" size={24} />
                            <h4 className="font-serif text-sm font-medium text-vastu-dark">{item.label}</h4>
                            <p className="text-xs font-sans text-vastu-text-light mt-0.5">{item.desc}</p>
                        </Link>
                    ))}
                </div>

                {/* Instructional Videos — global, from platform_settings */}
                {globalInstructionUrl && (
                    <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8">
                        <h3 className="font-serif text-xl text-vastu-dark mb-4">📋 Hilfreiche Anleitungen</h3>
                        <div className="grid md:grid-cols-1 gap-4">
                            <a
                                href={globalInstructionUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="bg-vastu-cream rounded-xl p-5 border border-vastu-sand/30 accent-bar-left group transition-all hover:border-vastu-gold/40 hover:shadow-md cursor-pointer"
                            >
                                <h4 className="font-serif font-medium text-vastu-dark mb-1 group-hover:text-vastu-gold transition-colors">Vimeo Untertitel nutzen</h4>
                                <p className="text-sm font-body text-vastu-text-light">Erfahre, wie du Untertitel in Vimeo aktivierst und anpasst.</p>
                            </a>
                        </div>
                    </div>
                )}

                {/* Course Progress Bar */}
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-serif text-lg text-vastu-dark">Dein Kursfortschritt</h3>
                        <span className="text-2xl font-sans font-bold text-vastu-dark">{progressPercent}%</span>
                    </div>
                    <div className="h-3 bg-vastu-sand/30 rounded-full overflow-hidden">
                        <div
                            className={`h-full bg-gradient-to-r from-vastu-dark to-vastu-gold rounded-full transition-all duration-700 ease-out ${progressPercent > 0 ? 'progress-glow active' : ''}`}
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <p className="text-xs font-sans text-vastu-text-light mt-2">{completedLessons} von {totalLessons} Lektionen abgeschlossen</p>
                </div>

                {/* Signature */}
                {settings?.welcome_signature?.trim() && (
                    <div className="text-center text-vastu-text-light font-script text-2xl">
                        — {settings.welcome_signature}
                    </div>
                )}
            </section>

            <footer className="border-t border-vastu-sand/50 py-8 text-center">
                <p className="text-sm font-sans text-vastu-text-light">© 2026 Ganzheitliche Vedische Astrologie · Selbstentdeckung Academy</p>
            </footer>
        </div>
    );
}
