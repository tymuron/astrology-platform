import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Loader2, ChevronDown, ChevronRight, CheckCircle2, XCircle, BarChart3 } from 'lucide-react';

interface QuizData {
    id: string;
    title: string;
    week_id: string;
    week_title: string;
    quiz_type: 'quiz' | 'reflection';
    questions: {
        id: string;
        question: string;
        options: string[];
        correct_index: number;
        order_index: number;
    }[];
}

interface AttemptData {
    id: string;
    user_id: string;
    quiz_id: string;
    answers: Record<string, number>;
    score: number;
    total: number;
    completed_at: string;
    user_name: string;
    user_email: string;
}

export default function QuizResults() {
    const [quizzes, setQuizzes] = useState<QuizData[]>([]);
    const [attempts, setAttempts] = useState<Record<string, AttemptData[]>>({});
    const [loading, setLoading] = useState(true);
    const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
    const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch all quizzes with their week info
            const { data: quizData, error: quizError } = await supabase
                .from('quizzes')
                .select('*')
                .order('created_at', { ascending: true });

            if (quizError || !quizData) {
                setLoading(false);
                return;
            }

            // Fetch week titles
            const weekIds = [...new Set(quizData.map(q => q.week_id))];
            const { data: weeks } = await supabase
                .from('weeks')
                .select('id, title')
                .in('id', weekIds);

            const weekMap: Record<string, string> = {};
            (weeks || []).forEach((w: any) => { weekMap[w.id] = w.title; });

            // Fetch all questions
            const quizIds = quizData.map(q => q.id);
            const { data: questions } = await supabase
                .from('quiz_questions')
                .select('*')
                .in('quiz_id', quizIds)
                .order('order_index', { ascending: true });

            const questionsByQuiz: Record<string, any[]> = {};
            (questions || []).forEach((q: any) => {
                if (!questionsByQuiz[q.quiz_id]) questionsByQuiz[q.quiz_id] = [];
                questionsByQuiz[q.quiz_id].push(q);
            });

            const enrichedQuizzes: QuizData[] = quizData.map(q => ({
                id: q.id,
                title: q.title,
                week_id: q.week_id,
                week_title: weekMap[q.week_id] || 'Unbekannt',
                quiz_type: q.quiz_type || 'quiz',
                questions: questionsByQuiz[q.id] || [],
            }));

            setQuizzes(enrichedQuizzes);

            // Fetch all attempts
            const { data: attemptData } = await supabase
                .from('quiz_attempts')
                .select('*')
                .in('quiz_id', quizIds)
                .order('completed_at', { ascending: false });

            if (attemptData && attemptData.length > 0) {
                // Fetch user profiles for attempt users
                const userIds = [...new Set(attemptData.map(a => a.user_id))];
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('id, email, name')
                    .in('id', userIds);

                const profileMap: Record<string, { name: string; email: string }> = {};
                (profiles || []).forEach((p: any) => {
                    profileMap[p.id] = {
                        name: p.name || p.email?.split('@')[0] || 'Unbekannt',
                        email: p.email || '',
                    };
                });

                const attemptsByQuiz: Record<string, AttemptData[]> = {};
                attemptData.forEach((a: any) => {
                    if (!attemptsByQuiz[a.quiz_id]) attemptsByQuiz[a.quiz_id] = [];
                    attemptsByQuiz[a.quiz_id].push({
                        id: a.id,
                        user_id: a.user_id,
                        quiz_id: a.quiz_id,
                        answers: a.answers,
                        score: a.score,
                        total: a.total,
                        completed_at: a.completed_at,
                        user_name: profileMap[a.user_id]?.name || 'Unbekannt',
                        user_email: profileMap[a.user_id]?.email || '',
                    });
                });

                setAttempts(attemptsByQuiz);
            }

            // Auto-expand first quiz
            if (enrichedQuizzes.length > 0) {
                setExpandedQuiz(enrichedQuizzes[0].id);
            }
        } catch (err) {
            console.error('Error fetching quiz results:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-dark" size={40} /></div>;
    }

    if (quizzes.length === 0) {
        return (
            <div className="max-w-5xl mx-auto animate-fade-in">
                <h1 className="text-3xl font-serif text-vastu-dark mb-8">Quiz-Ergebnisse</h1>
                <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
                    <BarChart3 className="mx-auto text-gray-300 mb-4" size={48} />
                    <p className="text-gray-500">Noch keine Quizze erstellt.</p>
                    <p className="text-sm text-gray-400 mt-1">Erstelle ein Quiz im Kurs-Editor, um Ergebnisse zu sehen.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-serif text-vastu-dark mb-8">Quiz-Ergebnisse</h1>

            <div className="space-y-4">
                {quizzes.map(quiz => {
                    const quizAttempts = attempts[quiz.id] || [];
                    const isExpanded = expandedQuiz === quiz.id;

                    // Group attempts by user (latest first)
                    const byUser: Record<string, AttemptData[]> = {};
                    quizAttempts.forEach(a => {
                        if (!byUser[a.user_id]) byUser[a.user_id] = [];
                        byUser[a.user_id].push(a);
                    });

                    const uniqueUsers = Object.keys(byUser).length;
                    const isReflection = quiz.quiz_type === 'reflection';
                    const avgScore = quizAttempts.length > 0 && !isReflection
                        ? Math.round(quizAttempts.reduce((s, a) => s + (a.score / a.total) * 100, 0) / quizAttempts.length)
                        : 0;

                    return (
                        <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <button
                                onClick={() => setExpandedQuiz(isExpanded ? null : quiz.id)}
                                className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 hover:bg-gray-50/50 transition-colors gap-3"
                            >
                                <div className="flex items-center gap-3">
                                    {isExpanded ? <ChevronDown size={20} className="text-purple-500 shrink-0" /> : <ChevronRight size={20} className="text-gray-400 shrink-0" />}
                                    <div className="text-left">
                                        <h3 className="font-medium text-vastu-dark">{quiz.week_title} — {quiz.title}</h3>
                                        <p className="text-sm text-gray-500">{quiz.questions.length} Fragen</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm pl-8 sm:pl-0">
                                    <div className="text-center">
                                        <div className="font-bold text-vastu-dark">{uniqueUsers}</div>
                                        <div className="text-gray-400 text-xs">Teilnehmer</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-vastu-dark">{quizAttempts.length}</div>
                                        <div className="text-gray-400 text-xs">Versuche</div>
                                    </div>
                                    {quizAttempts.length > 0 && !isReflection && (
                                        <div className="text-center">
                                            <div className={`font-bold ${avgScore >= 70 ? 'text-green-600' : avgScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                {avgScore}%
                                            </div>
                                            <div className="text-gray-400 text-xs">Durchschnitt</div>
                                        </div>
                                    )}
                                </div>
                            </button>

                            {isExpanded && (
                                <div className="border-t border-gray-100 p-5 overflow-x-auto">
                                    {quizAttempts.length === 0 ? (
                                        <p className="text-center text-gray-400 py-6">Noch keine Versuche.</p>
                                    ) : (
                                        <table className="w-full min-w-[500px]">
                                            <thead>
                                                <tr className="text-left text-xs text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                                    <th className="pb-3 pr-4">Teilnehmer</th>
                                                    <th className="pb-3 pr-4">Ergebnis</th>
                                                    <th className="pb-3 pr-4">Versuch #</th>
                                                    <th className="pb-3">Datum</th>
                                                    <th className="pb-3"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50">
                                                {quizAttempts.map((attempt) => {
                                                    const userAttempts = byUser[attempt.user_id] || [];
                                                    const attemptNum = userAttempts.length - userAttempts.indexOf(attempt);
                                                    const pct = Math.round((attempt.score / attempt.total) * 100);
                                                    const isDetailExpanded = expandedAttempt === attempt.id;

                                                    return (
                                                        <tr key={attempt.id} className="group">
                                                            <td className="py-3 pr-4">
                                                                <div>
                                                                    <div className="font-medium text-vastu-dark text-sm">{attempt.user_name}</div>
                                                                    <div className="text-xs text-gray-400">{attempt.user_email}</div>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 pr-4">
                                                                <span className={`inline-flex items-center gap-1 text-sm font-bold ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                    {attempt.score}/{attempt.total} ({pct}%)
                                                                </span>
                                                            </td>
                                                            <td className="py-3 pr-4 text-sm text-gray-500">
                                                                {attemptNum}
                                                            </td>
                                                            <td className="py-3 text-sm text-gray-500">
                                                                {new Date(attempt.completed_at).toLocaleString('de-DE', {
                                                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                                                    hour: '2-digit', minute: '2-digit'
                                                                })}
                                                            </td>
                                                            <td className="py-3">
                                                                <button
                                                                    onClick={() => setExpandedAttempt(isDetailExpanded ? null : attempt.id)}
                                                                    className="text-xs text-purple-500 hover:text-purple-700"
                                                                >
                                                                    {isDetailExpanded ? 'Verbergen' : 'Details'}
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* Expanded attempt detail */}
                                    {expandedAttempt && quizAttempts.find(a => a.id === expandedAttempt) && (() => {
                                        const attempt = quizAttempts.find(a => a.id === expandedAttempt)!;
                                        return (
                                            <div className="mt-4 bg-gray-50 rounded-lg p-4 border border-gray-200">
                                                <h4 className="text-sm font-bold text-gray-600 mb-3">
                                                    Antworten von {attempt.user_name}
                                                </h4>
                                                <div className="space-y-3">
                                                    {quiz.questions.map((q, qIdx) => {
                                                        const userAnswer = attempt.answers[q.id];
                                                        const isCorrect = userAnswer === q.correct_index;
                                                        const isReflection = quiz.quiz_type === 'reflection';
                                                        return (
                                                            <div key={q.id} className="flex items-start gap-2">
                                                                {isReflection
                                                                    ? <CheckCircle2 size={16} className="text-purple-500 mt-0.5 shrink-0" />
                                                                    : isCorrect
                                                                        ? <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                                                                        : <XCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                                                }
                                                                <div className="text-sm">
                                                                    <span className="font-medium text-gray-700">{qIdx + 1}. {q.question}</span>
                                                                    <div className="text-gray-500 mt-0.5">
                                                                        Antwort: <span className={isReflection ? 'text-purple-600' : isCorrect ? 'text-green-600' : 'text-red-600'}>
                                                                            {userAnswer !== undefined ? q.options[userAnswer] : '—'}
                                                                        </span>
                                                                        {!isReflection && !isCorrect && (
                                                                            <span className="text-green-600 ml-2">
                                                                                (Richtig: {q.options[q.correct_index]})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
