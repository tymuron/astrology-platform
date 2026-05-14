import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { LibraryItem, LibraryCategory } from '../../lib/types';
import { Plus, Trash2, FileText, Save, X, Link as LinkIcon, Upload, AlertTriangle } from 'lucide-react';
import { uploadLibraryFile, checkLibraryBucket, BUCKET_MISSING_MESSAGE } from '../../lib/uploadLibraryFile';

export default function ManageLibrary() {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [isDragging, setIsDragging] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState<string[]>([]);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
    const [bucketError, setBucketError] = useState<string | null>(null);

    const [formData, setFormData] = useState<Partial<LibraryItem>>({
        title: '', category: 'slides', file_url: '', description: ''
    });

    useEffect(() => { fetchLibrary(); }, []);
    useEffect(() => {
        if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) return;
        checkLibraryBucket().then(res => {
            if (!res.ok) setBucketError(res.error || BUCKET_MISSING_MESSAGE);
        });
    }, []);

    async function fetchLibrary() {
        try {
            if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                setItems([
                    { id: 'master1', title: 'Holistische Vedische Astrologie Kursbuch', category: 'guide' as LibraryCategory, file_url: '#', description: 'Das vollständige Kursbuch der Ausbildung', created_at: '2026-02-01T10:00:00Z', is_master_file: true },
                    { id: 'lib1', title: 'Alle Slides — Komplett', category: 'slides' as LibraryCategory, file_url: '#', description: 'Vollständige Sammlung aller Präsentationsfolien', created_at: '2026-02-05T10:00:00Z' },
                    { id: 'lib2', title: 'Vastu Reinigung – Leitfaden', category: 'guide' as LibraryCategory, file_url: '#', description: 'Schritt-für-Schritt-Anleitung zur Reinigung', created_at: '2026-02-08T10:00:00Z' },
                    { id: 'lib3', title: 'Bonus: Haustiere, Pflanzen & Tiere', category: 'bonus' as LibraryCategory, file_url: '#', description: 'Zusätzliches Material zu Haustieren, Pflanzen und Tieren', created_at: '2026-02-10T10:00:00Z' },
                    { id: 'lib4', title: 'Bonus: Grundstück [bei Feedback]', category: 'bonus' as LibraryCategory, file_url: '#', description: 'Grundstücksauswahl und -bewertung nach Vastu', created_at: '2026-02-12T10:00:00Z' },
                ]);
                setLoading(false);
                return;
            }

            const { data, error } = await supabase.from('library_items').select('*').order('title');
            if (error) throw error;
            setItems(data || []);
        } catch (error) {
            console.error('Error fetching library:', error);
        } finally {
            setLoading(false);
        }
    }

    function handleEdit(item: LibraryItem) {
        setFormData({ title: item.title, category: item.category, file_url: item.file_url, description: item.description });
        setEditingId(item.id);
        setIsEditing(true);
    }

    function handleAddNew() {
        setFormData({ title: '', category: 'slides', file_url: '', description: '' });
        setEditingId(null);
        setIsEditing(true);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!formData.title || !formData.file_url) return;

        try {
            let error;
            if (editingId) {
                const { error: updateError } = await supabase.from('library_items').update(formData).eq('id', editingId);
                error = updateError;
            } else {
                const { error: insertError } = await supabase.from('library_items').insert([formData]);
                error = insertError;
            }
            if (error) throw error;

            alert(editingId ? 'Material erfolgreich aktualisiert!' : 'Material erfolgreich hinzugefügt!');
            setIsEditing(false);
            setEditingId(null);
            setFormData({ title: '', category: 'slides', file_url: '', description: '' });
            fetchLibrary();
        } catch (error: any) {
            alert(`Fehler beim Speichern: ${error.message || 'Unbekannter Fehler'}`);
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('Möchtest du dieses Material wirklich löschen?')) return;
        try {
            const { error } = await supabase.from('library_items').delete().eq('id', id);
            if (error) throw error;
            fetchLibrary();
        } catch (error) {
            alert('Fehler beim Löschen');
        }
    }

    const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const onDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };

    const onDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        setUploadingFiles(prev => [...prev, ...files.map(f => f.name)]);
        let successCount = 0;

        for (const file of files) {
            try {
                const result = await uploadLibraryFile(file, {
                    onProgress: fraction => setUploadProgress(prev => ({ ...prev, [file.name]: fraction })),
                });
                if (!result.ok) {
                    if (result.bucketMissing) setBucketError(result.error);
                    throw new Error(result.error);
                }
                const title = file.name.replace(/\.[^/.]+$/, "");

                const { error: dbError } = await supabase.from('library_items').insert([{
                    title, category: 'slides', file_url: result.url, description: 'Per Drag & Drop hochgeladen'
                }]);
                if (dbError) throw dbError;
                successCount++;
            } catch (error: any) {
                alert(`Fehler beim Hochladen von ${file.name}: ${error?.message ?? error}`);
            } finally {
                setUploadingFiles(prev => prev.filter(name => name !== file.name));
                setUploadProgress(prev => { const { [file.name]: _, ...rest } = prev; return rest; });
            }
        }
        if (successCount > 0) fetchLibrary();
    };

    const categories: { id: LibraryCategory; label: string }[] = [
        { id: 'slides', label: 'Folien' },
        { id: 'bonus', label: 'Bonus' },
        { id: 'guide', label: 'Leitfaden' },
        { id: 'links', label: 'Links' },
    ];

    if (loading) return <div className="p-8">Laden...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-serif text-vastu-dark">Bibliothek verwalten</h1>
                <button onClick={handleAddNew} className="flex items-center px-4 py-2 bg-vastu-dark text-white rounded-lg hover:bg-vastu-dark/90 transition-colors">
                    <Plus className="w-5 h-5 mr-2" />
                    Material hinzufügen
                </button>
            </div>

            {bucketError && (
                <div className="mb-6 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <div className="font-semibold mb-1">Storage nicht konfiguriert</div>
                        <div className="text-red-700">{bucketError}</div>
                        <div className="mt-2 text-xs text-red-600">
                            Solange der Bucket fehlt, schlagen alle Uploads fehl und vorhandene Links sind defekt.
                        </div>
                    </div>
                </div>
            )}

            {/* Master File Settings */}
            <div className="bg-gradient-to-r from-vastu-gold/10 to-yellow-50 rounded-xl p-8 mb-8 border border-vastu-gold/20">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1">
                        <h3 className="text-xl font-serif text-vastu-dark mb-2">Master File</h3>
                        <p className="text-sm text-vastu-text-light mb-4 text-left">
                            Lade hier das vollständige Kursbuch oder die Haupt-Datei hoch. Diese wird in der Bibliothek oben hervorgehoben.
                        </p>

                        {items.find(i => i.is_master_file) ? (
                            <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-vastu-sand/30 shadow-sm">
                                <div className="w-10 h-10 bg-vastu-gold/10 rounded-full flex items-center justify-center text-vastu-gold shrink-0">
                                    <FileText size={20} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-vastu-dark truncate">{items.find(i => i.is_master_file)?.title}</div>
                                    <div className="text-xs text-vastu-text-light">Aktuelle Master-Datei</div>
                                </div>
                                <a href={items.find(i => i.is_master_file)?.file_url} target="_blank" rel="noreferrer" className="text-vastu-gold hover:text-vastu-dark transition-colors">
                                    <LinkIcon size={18} />
                                </a>
                            </div>
                        ) : (
                            <div className="text-sm text-vastu-text-light italic bg-white/50 p-3 rounded-lg border border-dashed border-vastu-sand/30">
                                Noch keine Master-Datei festgelegt.
                            </div>
                        )}
                    </div>

                    <div className="relative shrink-0">
                        <input
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                try {
                                    setLoading(true);
                                    const result = await uploadLibraryFile(file, { prefix: 'master' });
                                    if (!result.ok) {
                                        if (result.bucketMissing) setBucketError(result.error);
                                        throw new Error(result.error);
                                    }
                                    const title = file.name.replace(/\.[^/.]+$/, "");

                                    // Insert new master file
                                    const { error: insertError } = await supabase.from('library_items').insert([{
                                        title,
                                        category: 'guide', // Use guide as category but mark as master
                                        file_url: result.url,
                                        description: 'Master File',
                                        is_master_file: true
                                    }]);
                                    if (insertError) throw insertError;

                                    // Mark all others as not master (logic handled by ensure-single-master trigger ideally, but manual upkeep for now)
                                    // Actually, we should unset others first? Or trust that frontend renders only one or first one?
                                    // User requirement: "If yes, allow replacing it."
                                    // Simple approach: When uploading master, find old one and delete it or unmark it?
                                    // Let's unmark old ones.
                                    const oldMasters = items.filter(i => i.is_master_file);
                                    if (oldMasters.length > 0) {
                                        for (const old of oldMasters) {
                                            await supabase.from('library_items').update({ is_master_file: false }).eq('id', old.id);
                                        }
                                    }

                                    alert('Master File erfolgreich aktualisiert!');
                                    fetchLibrary();
                                } catch (error: any) {
                                    alert(`Fehler: ${error.message}`);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                        />
                        <button className="bg-vastu-dark text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-vastu-dark/90 transition-colors shadow-md">
                            <Upload size={18} />
                            <span>{items.find(i => i.is_master_file) ? 'Ersetzen' : 'Hochladen'}</span>
                        </button>
                    </div>
                </div>
            </div>
            <div
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`mb-8 border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${isDragging
                    ? 'border-vastu-dark bg-vastu-dark/5 scale-[1.02]'
                    : 'border-gray-300 hover:border-vastu-dark hover:bg-gray-50'
                    }`}
            >
                <div className="flex flex-col items-center justify-center pointer-events-none">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${isDragging ? 'bg-vastu-dark text-white' : 'bg-gray-100 text-gray-400'}`}>
                        <Upload className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                        {isDragging ? 'Dateien zum Hochladen loslassen' : 'Dateien hierher ziehen'}
                    </h3>
                    <p className="text-sm text-gray-500 max-w-sm">
                        Lade mehrere Dateien gleichzeitig hoch. Sie werden automatisch als «Folien» zur Bibliothek hinzugefügt.
                    </p>
                </div>
            </div>

            {/* Upload Progress */}
            {uploadingFiles.length > 0 && (
                <div className="mb-8 bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <h4 className="text-sm font-bold text-blue-800 mb-3 flex items-center">
                        <div className="animate-spin mr-2 h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        Dateien werden hochgeladen ({uploadingFiles.length})...
                    </h4>
                    <ul className="space-y-2">
                        {uploadingFiles.map((name, idx) => {
                            const pct = Math.round(((uploadProgress[name] ?? 0) * 100));
                            return (
                                <li key={idx} className="text-xs text-blue-700">
                                    <div className="flex justify-between items-center gap-4 mb-1">
                                        <span className="truncate">{name}</span>
                                        <span className="font-mono shrink-0">{pct}%</span>
                                    </div>
                                    <div className="h-1.5 bg-blue-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-200"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}

            {/* Edit Modal */}
            {isEditing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-vastu-light">
                            <h2 className="text-xl font-bold text-vastu-dark">
                                {editingId ? 'Material bearbeiten' : 'Neues Material'}
                            </h2>
                            <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-red-500">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Titel *</label>
                                <input type="text" required value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-vastu-dark focus:border-vastu-dark"
                                    placeholder="z.B. Folien Modul 1" />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie *</label>
                                <select value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value as LibraryCategory })}
                                    className="w-full rounded-lg border-gray-300 focus:ring-vastu-dark focus:border-vastu-dark">
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Datei *</label>
                                <div className="flex gap-4 mb-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="uploadType"
                                            checked={!formData.file_url?.startsWith('http')}
                                            onChange={() => setFormData({ ...formData, file_url: '' })}
                                            className="text-vastu-dark focus:ring-vastu-dark" />
                                        <span className="text-sm">Datei hochladen</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="radio" name="uploadType"
                                            checked={formData.file_url?.startsWith('http') || false}
                                            onChange={() => setFormData({ ...formData, file_url: 'https://' })}
                                            className="text-vastu-dark focus:ring-vastu-dark" />
                                        <span className="text-sm">Externer Link</span>
                                    </label>
                                </div>

                                {formData.file_url?.startsWith('http') ? (
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-3 text-gray-400 w-5 h-5" />
                                        <input type="url" required value={formData.file_url}
                                            onChange={e => setFormData({ ...formData, file_url: e.target.value })}
                                            className="w-full pl-10 rounded-lg border-gray-300 focus:ring-vastu-dark focus:border-vastu-dark"
                                            placeholder="https://..." />
                                    </div>
                                ) : (
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-vastu-dark transition-colors relative">
                                        <input type="file" onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                                setLoading(true);
                                                const result = await uploadLibraryFile(file);
                                                if (!result.ok) {
                                                    if (result.bucketMissing) setBucketError(result.error);
                                                    throw new Error(result.error);
                                                }
                                                setFormData({ ...formData, file_url: result.url });
                                            } catch (error: any) {
                                                alert(`Fehler beim Hochladen: ${error?.message ?? error}`);
                                            } finally {
                                                setLoading(false);
                                            }
                                        }} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                                        <div className="space-y-2 pointer-events-none">
                                            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400">
                                                <Plus className="w-6 h-6" />
                                            </div>
                                            <div className="text-sm text-gray-600">
                                                {formData.file_url ? (
                                                    <span className="text-green-600 font-medium">Datei hochgeladen!</span>
                                                ) : (
                                                    <span>Klicke zum Auswählen</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400">PDF, DOCX, XLSX bis 10 MB</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {formData.category === 'links' ? (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie / Gruppe (optional)</label>
                                    <input type="text" value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 focus:ring-vastu-dark focus:border-vastu-dark"
                                        placeholder="z.B. Vorhänge, Teppiche..." />
                                    <p className="text-xs text-gray-500 mt-1">Hilft dabei, Links in der Bibliothek zu gruppieren.</p>
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung (optional)</label>
                                    <textarea rows={3} value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full rounded-lg border-gray-300 focus:ring-vastu-dark focus:border-vastu-dark"
                                        placeholder="Kurze Beschreibung..." />
                                </div>
                            )}

                            <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                                <button type="button" onClick={() => setIsEditing(false)}
                                    className="px-6 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                    Abbrechen
                                </button>
                                <button type="submit"
                                    className="px-6 py-2 bg-vastu-dark text-white rounded-lg hover:bg-vastu-dark/90 transition-colors flex items-center">
                                    <Save className="w-4 h-4 mr-2" />
                                    {editingId ? 'Änderungen speichern' : 'Speichern'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {items.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        Noch keine Materialien. Klicke auf «Material hinzufügen».
                    </div>
                ) : (
                    <>
                        {/* Desktop */}
                        <table className="w-full hidden md:table">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Titel</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Kategorie</th>
                                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase">Aktionen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                            <div className="flex items-center">
                                                <FileText className="w-4 h-4 mr-2 text-gray-400" />
                                                {item.title}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium uppercase">
                                                {categories.find(c => c.id === item.category)?.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleEdit(item)} className="text-blue-400 hover:text-blue-600 p-2 hover:bg-blue-50 rounded-lg" title="Bearbeiten">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                                </button>
                                                <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded-lg" title="Löschen">
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Mobile */}
                        <div className="md:hidden divide-y divide-gray-100">
                            {items.map((item) => (
                                <div key={item.id} className="p-4 flex items-center justify-between">
                                    <div className="flex-1 pr-4">
                                        <span className="px-2 py-0.5 bg-gray-100 rounded text-[10px] font-medium uppercase text-gray-500 mr-2">
                                            {categories.find(c => c.id === item.category)?.label}
                                        </span>
                                        <div className="font-medium text-gray-900 mt-1">{item.title}</div>
                                    </div>
                                    <div className="flex gap-2 flex-shrink-0">
                                        <button onClick={() => handleEdit(item)} className="text-blue-400 hover:text-blue-600 p-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="text-red-400 hover:text-red-600 p-2">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Mobile FAB */}
            <button onClick={handleAddNew}
                className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-vastu-dark text-white rounded-full shadow-xl flex items-center justify-center z-40 hover:scale-110 transition-transform">
                <Plus className="w-8 h-8" />
            </button>
        </div>
    );
}
