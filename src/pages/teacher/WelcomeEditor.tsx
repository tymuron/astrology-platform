import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Save, Plus, X, Loader2, Calendar, Video, MessageCircle, ExternalLink,
    Play, Link as LinkIcon, Eye, FileText, PenLine,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCourseContext } from '../../contexts/CourseContext';
import { CalendarEvent, CourseSettings, UsefulLink } from '../../lib/types';

const emptySettings = (courseId: string): CourseSettings => ({
    course_id: courseId,
    welcome_intro: '',
    welcome_signature: '',
    welcome_video_url: '',
    zoom_link: '',
    telegram_link: '',
    external_tool_label: '',
    external_tool_url: '',
    useful_links: [],
    calendar_events: [],
    updated_at: new Date().toISOString(),
});

// Small shared shells so each section reads like a clean card.
function Section({
    icon: Icon,
    title,
    hint,
    children,
}: {
    icon: typeof Calendar;
    title: string;
    hint: string;
    children: React.ReactNode;
}) {
    return (
        <section className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8">
            <div className="flex items-start gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-vastu-cream flex items-center justify-center text-vastu-dark flex-shrink-0">
                    <Icon size={18} />
                </div>
                <div>
                    <h2 className="text-lg font-serif text-vastu-dark">{title}</h2>
                    <p className="text-sm text-vastu-text-light mt-0.5">{hint}</p>
                </div>
            </div>
            <div className="mt-5 space-y-4">{children}</div>
        </section>
    );
}

const fieldClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-vastu-dark';
const labelClass = 'block text-xs uppercase tracking-wider text-gray-500 mb-1';

export default function WelcomeEditor() {
    const { courses, activeCourseId, setActiveCourseId, loading: coursesLoading } = useCourseContext();
    const [data, setData] = useState<CourseSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [savedAt, setSavedAt] = useState<Date | null>(null);
    const [error, setError] = useState('');

    const activeCourse = courses.find(c => c.id === activeCourseId) || null;

    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!activeCourseId) {
                setData(null);
                setLoading(false);
                return;
            }
            setLoading(true);
            setError('');
            const { data: row, error: qErr } = await supabase
                .from('course_settings')
                .select('*')
                .eq('course_id', activeCourseId)
                .maybeSingle();
            if (cancelled) return;
            if (qErr) {
                setError(qErr.message);
                setData(emptySettings(activeCourseId));
            } else {
                const base = emptySettings(activeCourseId);
                if (row) {
                    setData({
                        ...base,
                        ...row,
                        useful_links: Array.isArray(row.useful_links) ? row.useful_links : [],
                        calendar_events: Array.isArray(row.calendar_events) ? row.calendar_events : [],
                    });
                } else {
                    setData(base);
                }
            }
            setDirty(false);
            setSavedAt(null);
            setLoading(false);
        }
        load();
        return () => { cancelled = true; };
    }, [activeCourseId]);

    const update = (patch: Partial<CourseSettings>) => {
        setData(prev => (prev ? { ...prev, ...patch } : prev));
        setDirty(true);
    };

    const handleSave = async () => {
        if (!data || !activeCourseId) return;
        setSaving(true);
        setError('');
        const { error: saveErr } = await supabase
            .from('course_settings')
            .upsert({
                course_id: activeCourseId,
                welcome_intro: data.welcome_intro,
                welcome_signature: data.welcome_signature,
                welcome_video_url: data.welcome_video_url,
                zoom_link: data.zoom_link,
                telegram_link: data.telegram_link,
                external_tool_label: data.external_tool_label,
                external_tool_url: data.external_tool_url,
                useful_links: data.useful_links,
                calendar_events: data.calendar_events,
                updated_at: new Date().toISOString(),
            }, { onConflict: 'course_id' });
        setSaving(false);
        if (saveErr) {
            setError('Speichern fehlgeschlagen: ' + saveErr.message);
            return;
        }
        setDirty(false);
        setSavedAt(new Date());
    };

    if (coursesLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-dark" size={36} /></div>;
    }

    if (courses.length === 0) {
        return (
            <div className="max-w-3xl mx-auto animate-fade-in">
                <h1 className="text-3xl font-serif text-vastu-dark mb-2">Welcome-Seite</h1>
                <div className="mt-8 bg-white border border-gray-200 rounded-2xl p-10 text-center">
                    <p className="text-vastu-text-light mb-4">
                        Noch keine Welle vorhanden. Erstelle zuerst eine Welle, dann kannst du hier ihre Welcome-Seite einrichten.
                    </p>
                    <Link
                        to="/teacher/wellen"
                        className="inline-block bg-vastu-dark text-white px-5 py-2.5 rounded-lg hover:bg-vastu-dark-deep transition-colors"
                    >
                        Zu „Wellen" gehen
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto animate-fade-in pb-24">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-serif text-vastu-dark">Welcome-Seite</h1>
                    <p className="text-sm text-vastu-text-light mt-1">
                        Was Teilnehmer auf <code className="px-1.5 py-0.5 bg-vastu-cream rounded text-vastu-dark text-xs">/student/welcome</code> sehen — pro Welle einzeln einstellbar.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={activeCourseId || ''}
                        onChange={(e) => setActiveCourseId(e.target.value || null)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-vastu-dark"
                    >
                        {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                    </select>
                    <a
                        href="/student/welcome"
                        target="_blank"
                        rel="noreferrer"
                        title="Welcome-Seite in neuem Tab ansehen (als Lehrer hast du Zugang zu allen Wellen)"
                        className="flex items-center gap-1 text-sm border border-vastu-dark/20 text-vastu-dark px-3 py-2 rounded-lg hover:bg-gray-50"
                    >
                        <Eye size={14} /> Vorschau
                    </a>
                </div>
            </div>

            {/* Sticky save bar */}
            <div className="sticky top-2 z-10 mb-6">
                <div className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 backdrop-blur-md transition-colors ${
                    dirty
                        ? 'bg-amber-50/95 border-amber-200'
                        : 'bg-white/90 border-gray-200'
                }`}>
                    <div className="text-sm">
                        {dirty ? (
                            <span className="text-amber-800">Du hast ungespeicherte Änderungen für „{activeCourse?.title}".</span>
                        ) : savedAt ? (
                            <span className="text-vastu-text-light">Gespeichert um {savedAt.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}.</span>
                        ) : (
                            <span className="text-vastu-text-light">Bearbeitest: „{activeCourse?.title}"</span>
                        )}
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={!dirty || saving}
                        className="flex items-center gap-2 bg-vastu-dark text-white px-4 py-2 rounded-lg text-sm hover:bg-vastu-dark-deep transition-colors disabled:opacity-40"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? 'Speichert…' : 'Speichern'}
                    </button>
                </div>
                {error && (
                    <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
                )}
            </div>

            {loading || !data ? (
                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-dark" size={32} /></div>
            ) : (
                <div className="space-y-6">
                    {/* 1. Greeting */}
                    <Section
                        icon={PenLine}
                        title="Begrüssungstext"
                        hint={'Persönliche Worte unter dem grossen Titel — z.B. „Schön, dass du da bist…"'}
                    >
                        <div>
                            <label className={labelClass}>Begrüssung</label>
                            <textarea
                                value={data.welcome_intro || ''}
                                onChange={e => update({ welcome_intro: e.target.value })}
                                rows={4}
                                placeholder={'Z.B. „Deine Reise durch die Sterne beginnt hier. Lass dich von der Weisheit der vedischen Astrologie tragen…"'}
                                className={fieldClass + ' resize-y'}
                            />
                            <p className="text-xs text-gray-400 mt-1">Zeilenumbrüche werden übernommen. Leer lassen, um den Standardtext zu verwenden.</p>
                        </div>
                        <div>
                            <label className={labelClass}>Signatur (am Seitenende)</label>
                            <input
                                type="text"
                                value={data.welcome_signature || ''}
                                onChange={e => update({ welcome_signature: e.target.value })}
                                placeholder="Z.B. Maria · Mentorin"
                                className={fieldClass}
                            />
                        </div>
                    </Section>

                    {/* 2. Welcome video */}
                    <Section
                        icon={Play}
                        title="Begrüssungsvideo"
                        hint="Optionales Einführungsvideo (Vimeo oder YouTube). Erscheint oben unter dem Hero."
                    >
                        <div>
                            <label className={labelClass}>Video-Link</label>
                            <input
                                type="url"
                                value={data.welcome_video_url || ''}
                                onChange={e => update({ welcome_video_url: e.target.value })}
                                placeholder="https://vimeo.com/… oder https://youtu.be/…"
                                className={fieldClass}
                            />
                            <p className="text-xs text-gray-400 mt-1">Leer lassen, um die Video-Sektion auszublenden.</p>
                        </div>
                    </Section>

                    {/* 3. Calendar */}
                    <Section
                        icon={Calendar}
                        title="Termine / Kalender"
                        hint={'Zeigt Teilnehmer:innen, wann was stattfindet. Erscheint links unter dem Hero („Bevorstehende Termine").'}
                    >
                        {data.calendar_events.length === 0 && (
                            <p className="text-xs text-gray-400 italic">Noch keine Termine. Klicke unten auf „Termin hinzufügen".</p>
                        )}
                        <div className="space-y-3">
                            {data.calendar_events.map((ev: CalendarEvent, i: number) => (
                                <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50/40 space-y-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-xs uppercase tracking-wider text-gray-400">Termin {i + 1}</span>
                                        <button
                                            onClick={() => update({ calendar_events: data.calendar_events.filter((_, idx) => idx !== i) })}
                                            title="Termin entfernen"
                                            className="text-gray-400 hover:text-red-500 p-1 rounded"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>Titel</label>
                                            <input
                                                type="text"
                                                placeholder="Z.B. Live-Call Modul 1"
                                                value={ev.label}
                                                onChange={e => {
                                                    const next = [...data.calendar_events];
                                                    next[i] = { ...next[i], label: e.target.value };
                                                    update({ calendar_events: next });
                                                }}
                                                className={fieldClass}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelClass}>Datum & Uhrzeit</label>
                                            <input
                                                type="datetime-local"
                                                value={ev.datetime?.slice(0, 16) || ''}
                                                onChange={e => {
                                                    const next = [...data.calendar_events];
                                                    next[i] = { ...next[i], datetime: e.target.value ? new Date(e.target.value).toISOString() : '' };
                                                    update({ calendar_events: next });
                                                }}
                                                className={fieldClass}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className={labelClass}>Link (optional)</label>
                                            <input
                                                type="url"
                                                placeholder="https://zoom.us/… oder https://meet.google.com/…"
                                                value={ev.url || ''}
                                                onChange={e => {
                                                    const next = [...data.calendar_events];
                                                    next[i] = { ...next[i], url: e.target.value };
                                                    update({ calendar_events: next });
                                                }}
                                                className={fieldClass}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className={labelClass}>Beschreibung (optional)</label>
                                            <input
                                                type="text"
                                                placeholder="Z.B. Thema: Sonne im Geburtshoroskop"
                                                value={ev.description || ''}
                                                onChange={e => {
                                                    const next = [...data.calendar_events];
                                                    next[i] = { ...next[i], description: e.target.value };
                                                    update({ calendar_events: next });
                                                }}
                                                className={fieldClass}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => update({
                                calendar_events: [...data.calendar_events, { label: '', datetime: '', url: '', description: '' }],
                            })}
                            className="w-full flex items-center justify-center gap-2 border border-dashed border-vastu-dark/30 text-vastu-dark rounded-lg py-3 hover:bg-vastu-cream/40 transition-colors text-sm"
                        >
                            <Plus size={16} /> Termin hinzufügen
                        </button>
                    </Section>

                    {/* 4. Quick links (Zoom / Telegram / external) */}
                    <Section
                        icon={Video}
                        title="Schnelle Links"
                        hint="Kacheln rechts neben dem Kalender — Zoom-Meeting, Telegram-Kanal, ein externes Tool. Leere Felder werden ausgeblendet."
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}><Video size={11} className="inline mr-1" /> Zoom-Link</label>
                                <input
                                    type="url"
                                    value={data.zoom_link || ''}
                                    onChange={e => update({ zoom_link: e.target.value })}
                                    placeholder="https://zoom.us/j/…"
                                    className={fieldClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}><MessageCircle size={11} className="inline mr-1" /> Telegram-Kanal</label>
                                <input
                                    type="url"
                                    value={data.telegram_link || ''}
                                    onChange={e => update({ telegram_link: e.target.value })}
                                    placeholder="https://t.me/…"
                                    className={fieldClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}><ExternalLink size={11} className="inline mr-1" /> Externes Tool — Beschriftung</label>
                                <input
                                    type="text"
                                    value={data.external_tool_label || ''}
                                    onChange={e => update({ external_tool_label: e.target.value })}
                                    placeholder="Z.B. Astro-Karte erstellen"
                                    className={fieldClass}
                                />
                            </div>
                            <div>
                                <label className={labelClass}>Externes Tool — URL</label>
                                <input
                                    type="url"
                                    value={data.external_tool_url || ''}
                                    onChange={e => update({ external_tool_url: e.target.value })}
                                    placeholder="https://…"
                                    className={fieldClass}
                                />
                            </div>
                        </div>
                    </Section>

                    {/* 5. Useful links */}
                    <Section
                        icon={LinkIcon}
                        title="Nützliche Links"
                        hint="Eigene Sammlung (z.B. Drive-Ordner, PDF-Skripte). Erscheint als Kachel-Liste unten auf der Welcome-Seite."
                    >
                        {data.useful_links.length === 0 && (
                            <p className="text-xs text-gray-400 italic">Noch keine Links.</p>
                        )}
                        <div className="space-y-2">
                            {data.useful_links.map((link: UsefulLink, i: number) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        placeholder="Beschriftung (z.B. Drive)"
                                        value={link.label}
                                        onChange={e => {
                                            const next = [...data.useful_links];
                                            next[i] = { ...next[i], label: e.target.value };
                                            update({ useful_links: next });
                                        }}
                                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-vastu-dark"
                                    />
                                    <input
                                        type="url"
                                        placeholder="https://…"
                                        value={link.url}
                                        onChange={e => {
                                            const next = [...data.useful_links];
                                            next[i] = { ...next[i], url: e.target.value };
                                            update({ useful_links: next });
                                        }}
                                        className="flex-[2] border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-vastu-dark"
                                    />
                                    <button
                                        onClick={() => update({ useful_links: data.useful_links.filter((_, idx) => idx !== i) })}
                                        className="p-2 text-gray-400 hover:text-red-500"
                                        title="Link entfernen"
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => update({ useful_links: [...data.useful_links, { label: '', url: '' }] })}
                            className="w-full flex items-center justify-center gap-2 border border-dashed border-vastu-dark/30 text-vastu-dark rounded-lg py-3 hover:bg-vastu-cream/40 transition-colors text-sm"
                        >
                            <Plus size={16} /> Link hinzufügen
                        </button>
                    </Section>

                    {/* Helper footer */}
                    <div className="text-xs text-gray-400 text-center pt-4 flex items-center justify-center gap-4">
                        <span className="flex items-center gap-1"><FileText size={12} /> Module bearbeiten in <Link to="/teacher" className="underline hover:text-vastu-dark">Kurs</Link></span>
                        <span>·</span>
                        <span className="flex items-center gap-1"><LinkIcon size={12} /> Einladungslinks in <Link to="/teacher/wellen" className="underline hover:text-vastu-dark">Wellen</Link></span>
                    </div>
                </div>
            )}
        </div>
    );
}
