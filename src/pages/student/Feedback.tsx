import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Send, CheckCircle2, Loader2, Heart } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { navigateBackOr } from '../../lib/utils';
import { FeedbackAnswers, FeedbackResponse, FeedbackQuestion } from '../../lib/types';

export default function FeedbackPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
    const [answers, setAnswers] = useState<FeedbackAnswers>({});
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;
        (async () => {
            // Questions
            const { data: qs, error: qErr } = await supabase
                .from('feedback_questions')
                .select('*')
                .eq('is_active', true)
                .order('order_index', { ascending: true });
            if (qErr) {
                console.warn('feedback_questions fetch failed:', qErr.message);
            }
            setQuestions((qs as FeedbackQuestion[]) || []);

            // Existing answers
            const { data: rs, error: rErr } = await supabase
                .from('feedback_responses')
                .select('*')
                .eq('user_id', user.id);
            if (rErr) {
                console.warn('feedback_responses fetch failed:', rErr.message);
                setLoading(false);
                return;
            }
            const existing: FeedbackAnswers = {};
            (rs as FeedbackResponse[]).forEach(r => {
                existing[r.question_key] = {
                    rating: r.answer_rating ?? undefined,
                    text: r.answer_text ?? undefined,
                };
            });
            setAnswers(existing);
            if (Object.keys(existing).length > 0) setSubmitted(true);
            setLoading(false);
        })();
    }, [user]);

    const setRating = (key: string, value: number) =>
        setAnswers(prev => ({ ...prev, [key]: { ...prev[key], rating: value } }));

    const setText = (key: string, value: string) =>
        setAnswers(prev => ({ ...prev, [key]: { ...prev[key], text: value } }));

    const isValid = questions.every(q => {
        if (q.optional) return true;
        const a = answers[q.question_key];
        if (!a) return false;
        if (q.kind === 'rating') return typeof a.rating === 'number' && a.rating >= 1 && a.rating <= 5;
        if (q.kind === 'text' || q.kind === 'choice') return !!a.text && a.text.trim().length > 0;
        return false;
    });

    const handleSubmit = async () => {
        if (!user || !isValid) return;
        setSubmitting(true);
        setError(null);
        try {
            const rows = questions
                .filter(q => answers[q.question_key] && (answers[q.question_key].rating !== undefined || (answers[q.question_key].text || '').trim() !== ''))
                .map(q => ({
                    user_id: user.id,
                    question_key: q.question_key,
                    answer_rating: answers[q.question_key].rating ?? null,
                    answer_text: answers[q.question_key].text?.trim() || null,
                    updated_at: new Date().toISOString(),
                }));

            const { error: upsertError } = await supabase
                .from('feedback_responses')
                .upsert(rows, { onConflict: 'user_id,question_key' });

            if (upsertError) throw upsertError;
            setSubmitted(true);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (e: any) {
            setError(e?.message ?? 'Etwas ist schiefgelaufen. Bitte erneut versuchen.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-gold" size={40} /></div>;
    }

    return (
        <div className="animate-fade-in space-y-6 max-w-3xl mx-auto">
            <button
                onClick={() => navigateBackOr(navigate, '/student')}
                className="inline-flex items-center gap-2 text-vastu-text-light hover:text-vastu-dark transition-colors group text-sm font-sans"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span>Zurück</span>
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 overflow-hidden">
                <div className="bg-vastu-accent grain-overlay p-8 md:p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-vastu-dark opacity-5 rounded-full blur-[80px] translate-x-1/3 -translate-y-1/3" />
                    <div className="relative z-10">
                        <h1 className="text-3xl md:text-4xl font-serif mb-2 flex items-center gap-3 text-vastu-dark">
                            <Heart size={28} />
                            Dein Feedback
                        </h1>
                        <p className="text-vastu-dark/60 font-body text-lg">
                            Deine Rückmeldung hilft Maria, die Ausbildung weiter zu verbessern. Danke, dass du dir die Zeit nimmst. ✨
                        </p>
                    </div>
                </div>
            </div>

            {questions.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-8 text-center">
                    <p className="text-vastu-text-light font-body">
                        Der Feedbackbogen wird bald freigeschaltet — schau gleich nochmal vorbei.
                    </p>
                </div>
            ) : submitted ? (
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-8 md:p-12 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 flex items-center justify-center">
                        <CheckCircle2 className="text-green-500" size={32} />
                    </div>
                    <h2 className="font-serif text-2xl text-vastu-dark mb-2">Vielen Dank!</h2>
                    <p className="text-vastu-text-light font-body mb-6">
                        Dein Feedback ist angekommen. Du kannst deine Antworten jederzeit anpassen.
                    </p>
                    <button
                        onClick={() => setSubmitted(false)}
                        className="text-sm font-sans text-vastu-gold hover:text-vastu-dark transition-colors underline underline-offset-4"
                    >
                        Antworten bearbeiten
                    </button>
                </div>
            ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-10 space-y-8">
                    {questions.map((q, idx) => (
                        <div key={q.id} className="space-y-3">
                            <div>
                                <label className="font-serif text-lg text-vastu-dark block">
                                    <span className="text-vastu-gold mr-2">{(idx + 1).toString().padStart(2, '0')}</span>
                                    {q.label}
                                    {q.optional && <span className="text-xs font-sans text-vastu-text-light/60 ml-2">(optional)</span>}
                                </label>
                                {q.helper && (
                                    <p className="text-sm font-body text-vastu-text-light mt-1">{q.helper}</p>
                                )}
                            </div>

                            {q.kind === 'rating' && (
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map(n => {
                                        const active = (answers[q.question_key]?.rating ?? 0) >= n;
                                        return (
                                            <button
                                                key={n}
                                                type="button"
                                                onClick={() => setRating(q.question_key, n)}
                                                className={`p-2 rounded-lg transition-all ${
                                                    active
                                                        ? 'text-vastu-gold scale-110'
                                                        : 'text-vastu-sand hover:text-vastu-gold/60'
                                                }`}
                                                aria-label={`${n} Sterne`}
                                            >
                                                <Star size={32} fill={active ? 'currentColor' : 'none'} />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}

                            {q.kind === 'text' && (
                                <textarea
                                    rows={4}
                                    value={answers[q.question_key]?.text ?? ''}
                                    onChange={e => setText(q.question_key, e.target.value)}
                                    className="w-full rounded-xl border-vastu-sand/60 focus:ring-vastu-gold focus:border-vastu-gold font-body text-vastu-dark resize-none"
                                    placeholder="Deine Antwort..."
                                />
                            )}

                            {q.kind === 'choice' && q.choices && q.choices.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {q.choices.map(c => {
                                        const active = answers[q.question_key]?.text === c.value;
                                        return (
                                            <button
                                                key={c.value}
                                                type="button"
                                                onClick={() => setText(q.question_key, c.value)}
                                                className={`px-4 py-3 rounded-xl border text-sm font-sans transition-all ${
                                                    active
                                                        ? 'bg-vastu-gold/15 border-vastu-gold text-vastu-dark font-medium'
                                                        : 'bg-white border-vastu-sand/60 text-vastu-text-light hover:border-vastu-gold/50 hover:text-vastu-dark'
                                                }`}
                                            >
                                                {c.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    ))}

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="pt-4 border-t border-vastu-sand/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <p className="text-xs font-sans text-vastu-text-light">
                            Maria sieht deine Antworten — sie sind nicht öffentlich.
                        </p>
                        <button
                            onClick={handleSubmit}
                            disabled={!isValid || submitting}
                            className="bg-vastu-dark text-white px-8 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-vastu-dark/90 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                            <span>Feedback senden</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
