import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Quiz, QuizAttempt } from '../lib/types';

export function useQuiz(moduleId: string | undefined) {
    const [quiz, setQuiz] = useState<Quiz | null>(null);
    const [loading, setLoading] = useState(true);
    const [lastAttempt, setLastAttempt] = useState<QuizAttempt | null>(null);

    useEffect(() => {
        // Reset state when module changes
        setQuiz(null);
        setLastAttempt(null);

        if (!moduleId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        async function fetchQuiz() {
            try {
                const { data: quizData, error: quizError } = await supabase
                    .from('quizzes')
                    .select('*')
                    .eq('week_id', moduleId)
                    .single();

                if (quizError || !quizData) {
                    setQuiz(null);
                    setLoading(false);
                    return;
                }

                const { data: questions } = await supabase
                    .from('quiz_questions')
                    .select('*')
                    .eq('quiz_id', quizData.id)
                    .order('order_index', { ascending: true });

                setQuiz({
                    id: quizData.id,
                    week_id: quizData.week_id,
                    title: quizData.title,
                    description: quizData.description,
                    quiz_type: quizData.quiz_type || 'quiz',
                    questions: (questions || []).map((q: any) => ({
                        id: q.id,
                        quiz_id: q.quiz_id,
                        question: q.question,
                        options: q.options,
                        correct_index: q.correct_index,
                        order_index: q.order_index,
                    })),
                });

                // Fetch latest attempt
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: attempt } = await supabase
                        .from('quiz_attempts')
                        .select('*')
                        .eq('quiz_id', quizData.id)
                        .eq('user_id', user.id)
                        .order('completed_at', { ascending: false })
                        .limit(1)
                        .single();

                    if (attempt) {
                        setLastAttempt({
                            id: attempt.id,
                            user_id: attempt.user_id,
                            quiz_id: attempt.quiz_id,
                            answers: attempt.answers,
                            score: attempt.score,
                            total: attempt.total,
                            completed_at: attempt.completed_at,
                        });
                    }
                }
            } catch (err) {
                console.error('Error fetching quiz:', err);
            } finally {
                setLoading(false);
            }
        }

        fetchQuiz();
    }, [moduleId]);

    const submitAttempt = async (answers: Record<string, number>, questionsForScoring?: { id: string; correct_index: number }[]): Promise<QuizAttempt | null> => {
        if (!quiz) return null;

        const scoreQuestions = questionsForScoring || quiz.questions;
        let score = 0;
        for (const q of scoreQuestions) {
            if (answers[q.id] === q.correct_index) score++;
        }

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const attempt = {
                user_id: user.id,
                quiz_id: quiz.id,
                answers,
                score,
                total: quiz.questions.length,
            };

            const { data, error } = await supabase
                .from('quiz_attempts')
                .insert(attempt)
                .select()
                .single();

            if (error) throw error;

            const result: QuizAttempt = {
                id: data.id,
                user_id: data.user_id,
                quiz_id: data.quiz_id,
                answers: data.answers,
                score: data.score,
                total: data.total,
                completed_at: data.completed_at,
            };

            setLastAttempt(result);
            return result;
        } catch (err) {
            console.error('Error submitting quiz:', err);
            return null;
        }
    };

    return { quiz, loading, lastAttempt, submitAttempt };
}
