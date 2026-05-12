import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, Search, Mail, User } from 'lucide-react';
import { Kohorte } from '../../lib/types';

interface StudentProfile {
    id: string;
    email: string;
    name: string | null;
    full_name?: string | null;
    created_at: string;
    kohorte_id?: string;
    kohorte?: string;
}


type DbError = { code?: string; message?: string };
const isColumnMissing = (error: DbError | null | undefined, columnName: string) =>
    !!error && (error.code === '42703' || error.message?.includes(columnName));
const isTableMissing = (error: DbError | null | undefined, tableName: string) =>
    !!error && (error.code === '42P01' || error.message?.includes(tableName));

export default function Students() {
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [kohorten, setKohorten] = useState<Kohorte[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterKohorte, setFilterKohorte] = useState<string>('all');

    useEffect(() => {
        async function fetchStudents() {
            try {
                let profilesRes: any = await supabase
                    .from('profiles')
                    .select('id, email, name, created_at, kohorte_id, kohorte, role')
                    .eq('role', 'student')
                    .order('created_at', { ascending: false });
                if (profilesRes.error && isColumnMissing(profilesRes.error, 'kohorte_id')) {
                    profilesRes = await supabase
                        .from('profiles')
                        .select('id, email, name, created_at, kohorte, role')
                        .eq('role', 'student')
                        .order('created_at', { ascending: false });
                }
                if (profilesRes.error) throw profilesRes.error;

                const kohortenRes = await supabase
                    .from('kohorten')
                    .select('id, name, start_date, description, color, created_at')
                    .order('start_date', { ascending: true });

                if (!kohortenRes.error) {
                    setKohorten(kohortenRes.data || []);
                } else if (!isTableMissing(kohortenRes.error, 'kohorten')) {
                    console.warn('Kohorten konnten nicht geladen werden:', kohortenRes.error.message);
                }

                const normalizedStudents = (profilesRes.data || []).map((profile: any) => ({
                    ...profile,
                    name: profile.name || profile.email?.split('@')[0] || null,
                }));
                setStudents(normalizedStudents);
            } catch (error) {
                console.error('Error fetching students:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchStudents();
    }, []);

    const assignKohorte = async (studentId: string, kohorteId: string) => {
        const previous = students;
        setStudents(prev => prev.map(s =>
            s.id === studentId ? { ...s, kohorte_id: kohorteId || undefined, kohorte: kohorteId || undefined } : s
        ));

        try {
            const updatePrimary = await supabase
                .from('profiles')
                .update({ kohorte_id: kohorteId || null })
                .eq('id', studentId);

            if (updatePrimary.error && isColumnMissing(updatePrimary.error, 'kohorte_id')) {
                const updateFallback = await supabase
                    .from('profiles')
                    .update({ kohorte: kohorteId || null })
                    .eq('id', studentId);
                if (updateFallback.error) throw updateFallback.error;
                return;
            }
            if (updatePrimary.error) throw updatePrimary.error;
        } catch (error) {
            console.error('Fehler beim Zuweisen der Kohorte:', error);
            setStudents(previous);
            alert('Fehler beim Speichern der Kohorte. Bitte versuche es erneut.');
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-dark" size={40} /></div>;

    const inviteLink = `${window.location.origin}/register`;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(inviteLink);
            alert('Link wurde kopiert!');
        } catch {
            alert('Kopieren fehlgeschlagen. Bitte Link manuell kopieren.');
        }
    };

    const filtered = students.filter(s => {
        const matchesSearch = (s.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.email.toLowerCase().includes(searchQuery.toLowerCase());
        const studentKohorte = s.kohorte_id || s.kohorte;
        const matchesKohorte = filterKohorte === 'all' || studentKohorte === filterKohorte || (filterKohorte === 'none' && !studentKohorte);
        return matchesSearch && matchesKohorte;
    });

    const getKohorte = (id?: string) => kohorten.find(k => k.id === id);

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            <div className="flex items-center justify-between mb-8">
                <h1 className="text-3xl font-serif text-vastu-dark">Teilnehmer</h1>
                <button
                    onClick={copyLink}
                    className="flex items-center gap-2 bg-vastu-accent/10 text-vastu-dark border border-vastu-accent/30 px-4 py-2 rounded-lg hover:bg-vastu-accent/20 transition-colors"
                >
                    <Mail size={18} />
                    Einladungslink kopieren
                </button>
            </div>

            {/* Invite Card */}
            <div className="bg-white p-6 rounded-xl border border-vastu-accent/20 shadow-sm mb-8 flex items-center justify-between">
                <div>
                    <h3 className="font-medium text-vastu-dark mb-1">Registrierungslink für Teilnehmer</h3>
                    <p className="text-sm text-gray-500">Sende diesen Link an Teilnehmer, damit sie ein Konto erstellen können</p>
                </div>
                <code className="bg-gray-100 px-4 py-2 rounded text-sm text-gray-600 select-all">
                    {inviteLink}
                </code>
            </div>

            <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                    <p className="text-gray-500">Teilnehmerliste ({filtered.length})</p>
                    {/* Kohorte filter */}
                    <select
                        value={filterKohorte}
                        onChange={e => setFilterKohorte(e.target.value)}
                        className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-vastu-accent bg-white"
                    >
                        <option value="all">Alle Kohorten</option>
                        {kohorten.map(k => (
                            <option key={k.id} value={k.id}>{k.name}</option>
                        ))}
                        <option value="none">Nicht zugewiesen</option>
                    </select>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Suchen..."
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-vastu-accent/50 w-64"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[640px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Teilnehmer</th>
                            <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">E-Mail</th>
                            <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Kohorte</th>
                            <th className="text-left py-4 px-6 text-sm font-medium text-gray-500">Registriert am</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.length > 0 ? (
                            filtered.map((student) => {
                                const kohorte = getKohorte(student.kohorte_id);
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-vastu-light flex items-center justify-center text-vastu-dark">
                                                    <User size={20} />
                                                </div>
                                                <span className="font-medium text-vastu-dark">{student.name || 'Kein Name'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-6 text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Mail size={14} className="text-gray-400" />
                                                {student.email}
                                            </div>
                                        </td>
                                        <td className="py-4 px-6">
                                            <select
                                                value={student.kohorte_id || student.kohorte || ''}
                                                onChange={e => assignKohorte(student.id, e.target.value)}
                                                className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:border-vastu-accent bg-white"
                                                style={kohorte ? { borderColor: kohorte.color, color: kohorte.color } : {}}
                                            >
                                                <option value="">— Keine —</option>
                                                {kohorten.map(k => (
                                                    <option key={k.id} value={k.id}>{k.name}</option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="py-4 px-6 text-gray-500 text-sm">
                                            {new Date(student.created_at).toLocaleDateString('de-DE')}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-gray-500">
                                    {searchQuery ? 'Keine Teilnehmer gefunden' : 'Noch keine Teilnehmer registriert'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
