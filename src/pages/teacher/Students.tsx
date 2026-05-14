import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Loader2, Search, Mail, User, Plus, Trash2 } from 'lucide-react';
import { useCourseContext } from '../../contexts/CourseContext';
import { CourseRow } from '../../lib/types';

interface StudentRow {
    id: string;
    email: string;
    full_name: string | null;
    created_at: string;
    entitled_courses: { id: string; title: string }[];
}

interface EntitlementJoin {
    user_id: string;
    granted_at: string;
    courses: { id: string; title: string } | { id: string; title: string }[] | null;
    profiles: {
        id: string;
        email: string;
        full_name: string | null;
        created_at: string;
        role: string;
    } | null;
}

export default function Students() {
    const { courses, activeCourseId, setActiveCourseId, loading: coursesLoading } = useCourseContext();
    const [students, setStudents] = useState<StudentRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'active' | 'all'>('active');

    async function fetchStudents() {
        setLoading(true);
        setError('');
        try {
            // Pull every entitlement joined with its course + profile.
            // Then group by user so each row knows every wave they belong to.
            const { data, error: qErr } = await supabase
                .from('user_entitlements')
                .select('user_id, granted_at, courses(id, title), profiles!inner(id, email, full_name, created_at, role)')
                .eq('profiles.role', 'student')
                .order('granted_at', { ascending: false });

            if (qErr) throw qErr;

            const byUser = new Map<string, StudentRow>();
            for (const row of (data ?? []) as unknown as EntitlementJoin[]) {
                if (!row.profiles) continue;
                const p = row.profiles;
                const c = Array.isArray(row.courses) ? row.courses[0] : row.courses;
                if (!byUser.has(p.id)) {
                    byUser.set(p.id, {
                        id: p.id,
                        email: p.email,
                        full_name: p.full_name,
                        created_at: p.created_at,
                        entitled_courses: [],
                    });
                }
                if (c) byUser.get(p.id)!.entitled_courses.push(c);
            }

            // Also include students with NO entitlements so the teacher can grant access manually.
            const { data: orphans, error: orphErr } = await supabase
                .from('profiles')
                .select('id, email, full_name, created_at')
                .eq('role', 'student');
            if (orphErr) throw orphErr;
            for (const p of (orphans ?? []) as Array<{ id: string; email: string; full_name: string | null; created_at: string }>) {
                if (!byUser.has(p.id)) {
                    byUser.set(p.id, {
                        id: p.id,
                        email: p.email,
                        full_name: p.full_name,
                        created_at: p.created_at,
                        entitled_courses: [],
                    });
                }
            }

            setStudents(Array.from(byUser.values()).sort((a, b) =>
                (b.created_at || '').localeCompare(a.created_at || '')
            ));
        } catch (err: any) {
            console.error('Error fetching students:', err);
            setError(err?.message || 'Teilnehmer konnten nicht geladen werden.');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchStudents(); }, []);

    const grantAccess = async (studentId: string, courseId: string, courseTitle: string) => {
        const { error: insErr } = await supabase
            .from('user_entitlements')
            .insert([{ user_id: studentId, course_id: courseId, source: 'manual' }]);
        if (insErr && insErr.code !== '23505') {
            alert('Fehler beim Zuweisen: ' + insErr.message);
            return;
        }
        // Optimistic local update
        setStudents(prev => prev.map(s =>
            s.id === studentId
                ? { ...s, entitled_courses: [...s.entitled_courses.filter(c => c.id !== courseId), { id: courseId, title: courseTitle }] }
                : s
        ));
    };

    const revokeAccess = async (studentId: string, courseId: string) => {
        if (!window.confirm('Zugang zu dieser Welle entziehen?')) return;
        const { error: delErr } = await supabase
            .from('user_entitlements')
            .delete()
            .eq('user_id', studentId)
            .eq('course_id', courseId);
        if (delErr) {
            alert('Fehler beim Entziehen: ' + delErr.message);
            return;
        }
        setStudents(prev => prev.map(s =>
            s.id === studentId
                ? { ...s, entitled_courses: s.entitled_courses.filter(c => c.id !== courseId) }
                : s
        ));
    };

    if (loading || coursesLoading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-dark" size={40} /></div>;
    }

    const filtered = students.filter(s => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch = !q ||
            (s.full_name || '').toLowerCase().includes(q) ||
            s.email.toLowerCase().includes(q);
        if (!matchesSearch) return false;
        if (filter === 'all') return true;
        // 'active' = filter to active wave only
        if (!activeCourseId) return true;
        return s.entitled_courses.some(c => c.id === activeCourseId);
    });

    const activeCourse: CourseRow | null = courses.find(c => c.id === activeCourseId) || null;

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            {error && (
                <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-serif text-vastu-dark">Teilnehmer</h1>
                    <p className="text-sm text-vastu-text-light mt-1">
                        Einladungslinks werden in <Link to="/teacher/wellen" className="underline decoration-vastu-gold underline-offset-2 hover:text-vastu-dark">Wellen</Link> pro Welle erstellt.
                    </p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as 'active' | 'all')}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-vastu-dark"
                    >
                        <option value="active">Nur diese Welle</option>
                        <option value="all">Alle Teilnehmer</option>
                    </select>
                    {filter === 'active' && (
                        <select
                            value={activeCourseId || ''}
                            onChange={(e) => setActiveCourseId(e.target.value || null)}
                            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-vastu-dark"
                            disabled={courses.length === 0}
                        >
                            {courses.length === 0 && <option value="">Keine Welle</option>}
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                        </select>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
                <p className="text-gray-500 text-sm">
                    {filter === 'active' && activeCourse
                        ? <>{filtered.length} Teilnehmer in „{activeCourse.title}"</>
                        : <>{filtered.length} Teilnehmer insgesamt</>}
                </p>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Suchen…"
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-vastu-dark w-64"
                    />
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[720px]">
                    <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider font-medium text-gray-500">Teilnehmer</th>
                            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider font-medium text-gray-500">E-Mail</th>
                            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider font-medium text-gray-500">Wellen</th>
                            <th className="text-left py-3 px-4 text-xs uppercase tracking-wider font-medium text-gray-500">Registriert</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-12 text-center text-gray-500">
                                    {searchQuery ? 'Keine Teilnehmer gefunden.' : 'Noch keine Teilnehmer.'}
                                </td>
                            </tr>
                        ) : (
                            filtered.map(student => (
                                <tr key={student.id} className="hover:bg-gray-50/50 transition-colors align-top">
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-vastu-light flex items-center justify-center text-vastu-dark flex-shrink-0">
                                                <User size={16} />
                                            </div>
                                            <span className="font-medium text-vastu-dark">{student.full_name || student.email.split('@')[0]}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Mail size={13} className="text-gray-400" />
                                            <span className="text-sm">{student.email}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {student.entitled_courses.length === 0 && (
                                                <span className="text-xs text-gray-400 italic">Kein Zugang</span>
                                            )}
                                            {student.entitled_courses.map(c => (
                                                <span
                                                    key={c.id}
                                                    className="inline-flex items-center gap-1 bg-vastu-cream/60 text-vastu-dark text-xs px-2 py-1 rounded-full border border-vastu-sand/50"
                                                >
                                                    {c.title}
                                                    <button
                                                        onClick={() => revokeAccess(student.id, c.id)}
                                                        title="Zugang entziehen"
                                                        className="ml-1 text-gray-400 hover:text-red-500"
                                                    >
                                                        <Trash2 size={11} />
                                                    </button>
                                                </span>
                                            ))}
                                            {courses
                                                .filter(c => !student.entitled_courses.some(ec => ec.id === c.id))
                                                .map(c => (
                                                    <button
                                                        key={'add-' + c.id}
                                                        onClick={() => grantAccess(student.id, c.id, c.title)}
                                                        className="inline-flex items-center gap-1 text-xs text-vastu-dark/60 hover:text-vastu-dark border border-dashed border-vastu-sand rounded-full px-2 py-1"
                                                        title={`Zugang zu „${c.title}" geben`}
                                                    >
                                                        <Plus size={11} /> {c.title}
                                                    </button>
                                                ))}
                                        </div>
                                    </td>
                                    <td className="py-3 px-4 text-gray-500 text-sm whitespace-nowrap">
                                        {new Date(student.created_at).toLocaleDateString('de-DE')}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
