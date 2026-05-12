import { useEffect, useState } from 'react';
import { Kohorte } from '../../lib/types';
import { Plus, Trash2, Save, X, Users, Calendar, Edit3, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const KOHORTE_COLORS = [
    { label: 'Bronze', value: '#c4b7b3' },
    { label: 'Gold', value: '#d4a574' },
    { label: 'Salbei', value: '#a8b5a0' },
    { label: 'Lavendel', value: '#b0a3c0' },
    { label: 'Koralle', value: '#c9a0a0' },
];

export default function ManageKohorten() {
    const [kohorten, setKohorten] = useState<Kohorte[]>([]);
    const [studentCountByKohorte, setStudentCountByKohorte] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [saveLoading, setSaveLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', startDate: '', description: '', color: '#c4b7b3' });

    const isMissingTable = (error: any) => error?.code === '42P01' || error?.message?.includes('kohorten');
    const isMissingColumn = (error: any, columnName: string) => error?.code === '42703' || error?.message?.includes(columnName);

    const toUi = (row: any): Kohorte => ({
        id: row.id,
        name: row.name,
        startDate: row.start_date ? String(row.start_date).slice(0, 10) : '',
        description: row.description || '',
        color: row.color || '#c4b7b3',
        created_at: row.created_at,
    });

    async function fetchKohorten() {
        try {
            setLoading(true);
            setErrorMessage('');

            const { data, error } = await supabase
                .from('kohorten')
                .select('id, name, start_date, description, color, created_at')
                .order('start_date', { ascending: true });

            if (error) {
                if (isMissingTable(error)) {
                    setErrorMessage('Die Tabelle "kohorten" fehlt in der Datenbank. Bitte SQL-Migration ausführen.');
                    setKohorten([]);
                    return;
                }
                throw error;
            }

            const list = (data || []).map(toUi);
            setKohorten(list);

            let profileRes: any = await supabase
                .from('profiles')
                .select('id, kohorte_id, kohorte')
                .limit(5000);
            if (profileRes.error && isMissingColumn(profileRes.error, 'kohorte_id')) {
                profileRes = await supabase
                    .from('profiles')
                    .select('id, kohorte')
                    .limit(5000);
            }
            if (!profileRes.error) {
                const counts: Record<string, number> = {};
                for (const profile of profileRes.data || []) {
                    const key = profile.kohorte_id || profile.kohorte;
                    if (!key) continue;
                    counts[key] = (counts[key] || 0) + 1;
                }
                setStudentCountByKohorte(counts);
            }
        } catch (error: any) {
            console.error('Fehler beim Laden der Kohorten:', error);
            setErrorMessage(error?.message || 'Fehler beim Laden der Kohorten.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchKohorten();
    }, []);

    const handleAdd = () => {
        setFormData({ name: '', startDate: '', description: '', color: '#c4b7b3' });
        setEditingId(null);
        setIsEditing(true);
    };

    const handleEdit = (k: Kohorte) => {
        setFormData({ name: k.name, startDate: k.startDate || k.start_date || '', description: k.description || '', color: k.color || '#c4b7b3' });
        setEditingId(k.id);
        setIsEditing(true);
    };

    const handleSave = async () => {
        if (!formData.name || !formData.startDate) return;
        try {
            setSaveLoading(true);
            setErrorMessage('');

            const payload = {
                name: formData.name.trim(),
                start_date: formData.startDate,
                description: formData.description.trim() || null,
                color: formData.color,
            };

            if (editingId) {
                const { error } = await supabase.from('kohorten').update(payload).eq('id', editingId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('kohorten').insert([payload]);
                if (error) throw error;
            }

            setIsEditing(false);
            setEditingId(null);
            await fetchKohorten();
        } catch (error: any) {
            console.error('Fehler beim Speichern:', error);
            setErrorMessage(error?.message || 'Kohorte konnte nicht gespeichert werden.');
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Kohorte wirklich löschen?')) return;
        try {
            setErrorMessage('');

            const clearRelation = await supabase
                .from('profiles')
                .update({ kohorte_id: null })
                .eq('kohorte_id', id);

            if (clearRelation.error && isMissingColumn(clearRelation.error, 'kohorte_id')) {
                const fallback = await supabase
                    .from('profiles')
                    .update({ kohorte: null })
                    .eq('kohorte', id);
                if (fallback.error && !isMissingColumn(fallback.error, 'kohorte')) throw fallback.error;
            } else if (clearRelation.error) {
                throw clearRelation.error;
            }

            const { error } = await supabase.from('kohorten').delete().eq('id', id);
            if (error) throw error;
            await fetchKohorten();
        } catch (error: any) {
            console.error('Fehler beim Löschen:', error);
            setErrorMessage(error?.message || 'Kohorte konnte nicht gelöscht werden.');
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-dark" size={36} /></div>;
    }

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {errorMessage && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {errorMessage}
                </div>
            )}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-serif text-vastu-dark">Kohorten</h1>
                    <p className="text-vastu-text-light mt-1">Gruppen für verschiedene Ausbildungsjahrgänge</p>
                </div>
                <button
                    onClick={handleAdd}
                    className="flex items-center gap-2 bg-vastu-dark text-white px-4 py-2.5 rounded-lg hover:bg-vastu-dark-deep transition-colors"
                >
                    <Plus size={18} />
                    Neue Kohorte
                </button>
            </div>

            {/* Edit/Create Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setIsEditing(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-serif text-vastu-dark">
                                {editingId ? 'Kohorte bearbeiten' : 'Neue Kohorte erstellen'}
                            </h2>
                            <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-vastu-dark mb-1">Name</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                                    placeholder="z.B. Frühling 2026"
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-vastu-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-vastu-dark mb-1">Startdatum</label>
                                <input
                                    type="date"
                                    value={formData.startDate}
                                    onChange={e => setFormData(f => ({ ...f, startDate: e.target.value }))}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-vastu-accent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-vastu-dark mb-1">Beschreibung</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
                                    placeholder="Optionale Beschreibung..."
                                    rows={2}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:border-vastu-accent resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-vastu-dark mb-1">Farbe</label>
                                <div className="flex gap-3">
                                    {KOHORTE_COLORS.map(c => (
                                        <button
                                            key={c.value}
                                            onClick={() => setFormData(f => ({ ...f, color: c.value }))}
                                            className={`w-10 h-10 rounded-full border-2 transition-all ${formData.color === c.value ? 'border-vastu-dark scale-110' : 'border-transparent hover:scale-105'}`}
                                            style={{ backgroundColor: c.value }}
                                            title={c.label}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                            <button onClick={() => setIsEditing(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700">
                                Abbrechen
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!formData.name || !formData.startDate || saveLoading}
                                className="flex items-center gap-2 bg-vastu-dark text-white px-5 py-2.5 rounded-lg hover:bg-vastu-dark-deep transition-colors disabled:opacity-40"
                            >
                                {saveLoading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                {saveLoading ? 'Speichert...' : 'Speichern'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Kohorten Grid */}
            <div className="grid md:grid-cols-2 gap-6">
                {kohorten.map(k => (
                    <div key={k.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        {/* Color header bar */}
                        <div className="h-2" style={{ backgroundColor: k.color || '#c4b7b3' }} />

                        <div className="p-6">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: (k.color || '#c4b7b3') + '20' }}>
                                        <Users size={20} style={{ color: k.color || '#c4b7b3' }} />
                                    </div>
                                    <div>
                                        <h3 className="font-serif text-lg font-medium text-vastu-dark">{k.name}</h3>
                                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                            <Calendar size={13} />
                                            Start: {new Date(k.startDate || k.start_date || Date.now()).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => handleEdit(k)} className="p-2 text-gray-400 hover:text-vastu-dark rounded-lg hover:bg-gray-100 transition-colors">
                                        <Edit3 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(k.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {k.description && (
                                <p className="text-sm text-gray-500 mb-4">{k.description}</p>
                            )}

                            {/* Mock student count */}
                            <div className="flex items-center gap-2 text-sm text-vastu-dark/60 bg-gray-50 rounded-lg px-3 py-2">
                                <Users size={14} />
                                <span>{studentCountByKohorte[k.id] || 0} Teilnehmer zugewiesen</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {kohorten.length === 0 && (
                <div className="text-center py-16 text-gray-400">
                    <Users size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg">Noch keine Kohorten erstellt</p>
                    <p className="text-sm mt-1">Erstelle eine Kohorte, um Teilnehmer zu gruppieren</p>
                </div>
            )}
        </div>
    );
}
