import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, X, Calendar, Loader2, Link2, Copy, Check, ChevronDown, ChevronRight, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useCourseContext } from '../../contexts/CourseContext';
import { CourseRow } from '../../lib/types';

interface CourseInvite {
    id: string;
    course_id: string;
    token: string;
    label: string | null;
    is_active: boolean;
    expires_at: string | null;
    max_uses: number | null;
    uses_count: number;
    created_at: string;
}

const InvitePanel = ({ courseId, courseTitle }: { courseId: string; courseTitle: string }) => {
    const [invites, setInvites] = useState<CourseInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const refresh = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('course_invites')
            .select('id, course_id, token, label, is_active, expires_at, max_uses, uses_count, created_at')
            .eq('course_id', courseId)
            .order('created_at', { ascending: false });
        if (!error && data) setInvites(data as CourseInvite[]);
        setLoading(false);
    };

    useEffect(() => { refresh(); }, [courseId]);

    const inviteUrl = (token: string) =>
        `${window.location.origin}/register?invite=${encodeURIComponent(token)}`;

    const handleGenerate = async () => {
        const label = window.prompt('Label für die Einladung (optional). Z.B. „Frühling 2026", „Landingpage", „Freunde". Nur für dich sichtbar.');
        const token = `${crypto.randomUUID().slice(0, 8)}-${crypto.randomUUID().slice(0, 4)}`;
        const { error } = await supabase
            .from('course_invites')
            .insert([{ course_id: courseId, token, label: label?.trim() || null }]);
        if (error) { alert('Fehler: ' + error.message); return; }
        refresh();
    };

    const handleCopy = async (invite: CourseInvite) => {
        try {
            await navigator.clipboard.writeText(inviteUrl(invite.token));
            setCopiedId(invite.id);
            setTimeout(() => setCopiedId(prev => (prev === invite.id ? null : prev)), 1500);
        } catch {
            window.prompt('Link manuell kopieren:', inviteUrl(invite.token));
        }
    };

    const handleToggle = async (invite: CourseInvite) => {
        const { error } = await supabase
            .from('course_invites')
            .update({ is_active: !invite.is_active })
            .eq('id', invite.id);
        if (error) { alert('Fehler: ' + error.message); return; }
        refresh();
    };

    const handleDelete = async (invite: CourseInvite) => {
        if (!window.confirm('Einladung wirklich löschen?')) return;
        const { error } = await supabase.from('course_invites').delete().eq('id', invite.id);
        if (error) { alert('Fehler: ' + error.message); return; }
        refresh();
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3 gap-3">
                <div>
                    <div className="text-xs uppercase tracking-wider text-gray-400">Registrierung</div>
                    <div className="text-sm font-medium text-vastu-dark">
                        Einladungslinks für „{courseTitle}"
                    </div>
                </div>
                <button
                    onClick={handleGenerate}
                    className="flex items-center gap-1 text-sm bg-vastu-dark text-white px-3 py-1.5 rounded-lg hover:bg-vastu-dark-deep"
                >
                    <Plus size={14} /> Link erstellen
                </button>
            </div>
            {loading ? (
                <div className="text-xs text-gray-400 py-2">Lädt…</div>
            ) : invites.length === 0 ? (
                <div className="text-xs text-gray-500 py-2">
                    Noch keine Einladungslinks. Erstelle einen, um neuen Teilnehmer:innen Zugang zu geben.
                </div>
            ) : (
                <div className="space-y-2">
                    {invites.map(inv => (
                        <div
                            key={inv.id}
                            className={`flex items-center justify-between gap-3 border rounded-lg px-3 py-2 text-sm ${
                                inv.is_active ? 'bg-gray-50 border-gray-100' : 'bg-gray-100 border-gray-200 opacity-60'
                            }`}
                        >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                <Link2 size={14} className="text-gray-400 flex-shrink-0" />
                                <div className="min-w-0">
                                    <div className="font-medium text-vastu-dark truncate">{inv.label || inv.token}</div>
                                    <div className="text-xs text-gray-500 truncate">
                                        {inv.uses_count} Nutzungen{inv.max_uses != null && ` von ${inv.max_uses}`}
                                        {!inv.is_active && ' · deaktiviert'}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button onClick={() => handleCopy(inv)}
                                    className="p-1.5 text-gray-500 hover:text-vastu-dark hover:bg-white rounded"
                                    title="Link kopieren">
                                    {copiedId === inv.id ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                                </button>
                                <button onClick={() => handleToggle(inv)}
                                    className="text-xs px-2 py-1 text-gray-500 hover:text-vastu-dark hover:bg-white rounded"
                                    title={inv.is_active ? 'Deaktivieren' : 'Aktivieren'}>
                                    {inv.is_active ? 'Aus' : 'An'}
                                </button>
                                <button onClick={() => handleDelete(inv)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white rounded"
                                    title="Löschen">
                                    <X size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Small CTA card pointing Maria to the dedicated Welcome-Seite editor for a wave.
// Lives where the bulky inline SettingsPanel used to be — keeps wave management
// focused on registration links and reduces duplicate editing surfaces.
const WelcomeLinkCard = ({ courseId, courseTitle }: { courseId: string; courseTitle: string }) => {
    const { setActiveCourseId } = useCourseContext();
    return (
        <Link
            to="/teacher/welcome-seite"
            onClick={() => setActiveCourseId(courseId)}
            className="block bg-vastu-cream/40 border border-vastu-sand/40 rounded-xl p-5 hover:bg-vastu-cream/70 hover:border-vastu-gold/40 transition-colors group"
        >
            <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-vastu-dark flex-shrink-0">
                    <Sparkles size={18} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-xs uppercase tracking-wider text-vastu-dark/60">Welcome-Seite</div>
                    <div className="text-sm font-medium text-vastu-dark">
                        Begrüssung, Termine, Video & Links für „{courseTitle}" einrichten
                    </div>
                </div>
                <ChevronRight size={18} className="text-vastu-dark/40 group-hover:text-vastu-dark transition-colors flex-shrink-0" />
            </div>
        </Link>
    );
};

export default function ManageWellen() {
    const [courses, setCourses] = useState<CourseRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [formTitle, setFormTitle] = useState('');
    const [formDesc, setFormDesc] = useState('');

    async function fetchCourses() {
        setLoading(true);
        const { data, error } = await supabase
            .from('courses')
            .select('id, slug, title, description, is_active, order_index')
            .order('order_index', { ascending: true });
        if (error) {
            setError(error.message);
        } else if (data) {
            setCourses(data as CourseRow[]);
            setError('');
        }
        setLoading(false);
    }

    useEffect(() => { fetchCourses(); }, []);

    const handleCreate = async () => {
        if (!formTitle.trim()) return;
        const slug = formTitle.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 60) + '-' + Date.now().toString(36).slice(-4);
        const { error } = await supabase.from('courses').insert([{
            slug,
            title: formTitle.trim(),
            description: formDesc.trim() || null,
            order_index: courses.length + 1,
            is_active: true,
        }]);
        if (error) { alert('Fehler: ' + error.message); return; }
        setCreating(false);
        setFormTitle('');
        setFormDesc('');
        fetchCourses();
    };

    const handleDelete = async (id: string, title: string) => {
        if (!window.confirm(`Welle „${title}" wirklich löschen? Alle zugewiesenen Module, Einladungen und Einstellungen werden mit gelöscht.`)) return;
        const { error } = await supabase.from('courses').delete().eq('id', id);
        if (error) { alert('Fehler: ' + error.message); return; }
        if (editingId === id) setEditingId(null);
        fetchCourses();
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-dark" size={36} /></div>;

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-serif text-vastu-dark">Wellen</h1>
                    <p className="text-vastu-text-light mt-1">Verschiedene Durchgänge der Ausbildung mit eigenem Zugang und eigener Welcome-Seite.</p>
                </div>
                <button onClick={() => setCreating(true)}
                    className="flex items-center gap-2 bg-vastu-dark text-white px-4 py-2.5 rounded-lg hover:bg-vastu-dark-deep transition-colors">
                    <Plus size={18} /> Neue Welle
                </button>
            </div>

            {creating && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setCreating(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-serif text-vastu-dark">Neue Welle erstellen</h2>
                            <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-vastu-dark mb-1">Name</label>
                                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
                                    placeholder="z.B. Welle 2"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-vastu-dark" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-vastu-dark mb-1">Beschreibung</label>
                                <textarea value={formDesc} onChange={e => setFormDesc(e.target.value)}
                                    placeholder="Optional…" rows={2}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-vastu-dark resize-none" />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button onClick={() => setCreating(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">Abbrechen</button>
                            <button onClick={handleCreate} disabled={!formTitle.trim()}
                                className="bg-vastu-dark text-white px-5 py-2.5 rounded-lg hover:bg-vastu-dark-deep transition-colors disabled:opacity-40">
                                Erstellen
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {courses.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                        <Calendar size={48} className="mx-auto mb-4 opacity-30" />
                        <p className="text-lg">Noch keine Wellen erstellt</p>
                    </div>
                ) : (
                    courses.map(c => (
                        <div key={c.id} className="bg-white rounded-xl border border-gray-200 shadow-sm">
                            <div className="p-5 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="font-serif text-lg font-medium text-vastu-dark">{c.title}</h3>
                                    {c.description && <p className="text-sm text-gray-500 mt-1">{c.description}</p>}
                                    <div className="text-xs text-gray-400 mt-2">slug: {c.slug}</div>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button onClick={() => setEditingId(editingId === c.id ? null : c.id)}
                                        className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg transition-colors ${
                                            editingId === c.id ? 'bg-vastu-dark text-white' : 'text-vastu-dark border border-vastu-dark/20 hover:bg-gray-50'
                                        }`}>
                                        {editingId === c.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                        {editingId === c.id ? 'Schliessen' : 'Einladungen & Welcome-Seite'}
                                    </button>
                                    <button onClick={() => handleDelete(c.id, c.title)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            {editingId === c.id && (
                                <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
                                    <InvitePanel courseId={c.id} courseTitle={c.title} />
                                    <WelcomeLinkCard courseId={c.id} courseTitle={c.title} />
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
