import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Save, Loader2, GripVertical } from 'lucide-react';
import { QuizType } from '../lib/types';

interface QuizQuestion {
    id?: string;
    question: string;
    options: string[];
    correct_index: number;
    order_index: number;
}

interface QuizEditorProps {
    moduleId: string;
}

export default function QuizEditor({ moduleId }: QuizEditorProps) {
    const [quizId, setQuizId] = useState<string | null>(null);
    const [title, setTitle] = useState('Quiz');
    const [description, setDescription] = useState('');
    const [quizType, setQuizType] = useState<QuizType>('quiz');
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isDirty, setIsDirty] = useState(false);

    useEffect(() => {
        fetchQuiz();
    }, [moduleId]);

    const fetchQuiz = async () => {
        try {
            const { data: quiz } = await supabase
                .from('quizzes')
                .select('*')
                .eq('week_id', moduleId)
                .single();

            if (quiz) {
                setQuizId(quiz.id);
                setTitle(quiz.title);
                setDescription(quiz.description || '');
                setQuizType(quiz.quiz_type || 'quiz');

                const { data: qs } = await supabase
                    .from('quiz_questions')
                    .select('*')
                    .eq('quiz_id', quiz.id)
                    .order('order_index', { ascending: true });

                setQuestions((qs || []).map((q: any) => ({
                    id: q.id,
                    question: q.question,
                    options: q.options,
                    correct_index: q.correct_index,
                    order_index: q.order_index,
                })));
            }
        } catch {
            // No quiz yet — that's fine
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            let currentQuizId = quizId;

            // Create or update quiz
            if (!currentQuizId) {
                const { data, error } = await supabase
                    .from('quizzes')
                    .insert({ week_id: moduleId, title, description: description || null, quiz_type: quizType })
                    .select()
                    .single();
                if (error) throw error;
                currentQuizId = data.id;
                setQuizId(data.id);
            } else {
                const { error } = await supabase
                    .from('quizzes')
                    .update({ title, description: description || null, quiz_type: quizType })
                    .eq('id', currentQuizId)
                    .select();
                if (error) throw error;
            }

            // Delete all existing questions and re-insert
            await supabase.from('quiz_questions').delete().eq('quiz_id', currentQuizId);

            if (questions.length > 0) {
                const toInsert = questions.map((q, i) => ({
                    quiz_id: currentQuizId,
                    question: q.question,
                    options: q.options,
                    correct_index: q.correct_index,
                    order_index: i,
                }));

                const { error } = await supabase.from('quiz_questions').insert(toInsert);
                if (error) throw error;
            }

            setIsDirty(false);
            // Refetch to get new IDs
            await fetchQuiz();
        } catch (error: any) {
            console.error('Error saving quiz:', error);
            alert('Fehler beim Speichern des Quiz: ' + (error?.message || 'Unbekannter Fehler'));
        } finally {
            setSaving(false);
        }
    };

    const addQuestion = () => {
        setQuestions(prev => [...prev, {
            question: '',
            options: ['', '', '', ''],
            correct_index: 0,
            order_index: prev.length,
        }]);
        setIsDirty(true);
    };

    const removeQuestion = (idx: number) => {
        setQuestions(prev => prev.filter((_, i) => i !== idx));
        setIsDirty(true);
    };

    const updateQuestion = (idx: number, field: string, value: any) => {
        setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
        setIsDirty(true);
    };

    const updateOption = (qIdx: number, oIdx: number, value: string) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q;
            const newOptions = [...q.options];
            newOptions[oIdx] = value;
            return { ...q, options: newOptions };
        }));
        setIsDirty(true);
    };

    const addOption = (qIdx: number) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q;
            return { ...q, options: [...q.options, ''] };
        }));
        setIsDirty(true);
    };

    const removeOption = (qIdx: number, oIdx: number) => {
        setQuestions(prev => prev.map((q, i) => {
            if (i !== qIdx) return q;
            const newOptions = q.options.filter((_, j) => j !== oIdx);
            const newCorrect = q.correct_index >= oIdx && q.correct_index > 0
                ? q.correct_index - 1
                : q.correct_index;
            return { ...q, options: newOptions, correct_index: Math.min(newCorrect, newOptions.length - 1) };
        }));
        setIsDirty(true);
    };

    const handleDeleteQuiz = async () => {
        if (!quizId) return;
        if (!window.confirm('Quiz komplett löschen?')) return;
        await supabase.from('quizzes').delete().eq('id', quizId);
        setQuizId(null);
        setTitle('Quiz');
        setDescription('');
        setQuestions([]);
        setIsDirty(false);
    };

    if (loading) {
        return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-400" size={20} /></div>;
    }

    return (
        <div className="bg-purple-50/50 p-4 rounded-lg border border-purple-200/50">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-purple-700 uppercase tracking-wider">Quiz</h4>
                <div className="flex gap-2">
                    {quizId && (
                        <button onClick={handleDeleteQuiz} className="text-xs text-red-400 hover:text-red-600">
                            Quiz löschen
                        </button>
                    )}
                    <button
                        onClick={handleSave}
                        disabled={!isDirty || saving}
                        className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-medium transition-colors ${isDirty ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-gray-100 text-gray-400'}`}
                    >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Speichern
                    </button>
                </div>
            </div>

            {/* Quiz Type Toggle */}
            <div className="flex gap-2 mb-4">
                <button
                    onClick={() => { setQuizType('quiz'); setIsDirty(true); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${quizType === 'quiz' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                    Quiz (mit richtigen Antworten)
                </button>
                <button
                    onClick={() => { setQuizType('reflection'); setIsDirty(true); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${quizType === 'reflection' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                    Reflexion (ohne richtig/falsch)
                </button>
            </div>

            {/* Quiz Title & Description */}
            <div className="space-y-2 mb-4">
                <input
                    type="text"
                    value={title}
                    onChange={(e) => { setTitle(e.target.value); setIsDirty(true); }}
                    className="w-full text-sm font-medium bg-white border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-purple-400"
                    placeholder={quizType === 'reflection' ? 'Reflexion-Titel' : 'Quiz-Titel'}
                />
                <input
                    type="text"
                    value={description}
                    onChange={(e) => { setDescription(e.target.value); setIsDirty(true); }}
                    className="w-full text-sm bg-white border border-gray-200 rounded px-3 py-2 focus:outline-none focus:border-purple-400"
                    placeholder="Beschreibung (optional)"
                />
            </div>

            {/* Questions */}
            <div className="space-y-4">
                {questions.map((q, qIdx) => (
                    <div key={qIdx} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-start gap-2 mb-3">
                            <GripVertical size={16} className="text-gray-300 mt-2 shrink-0" />
                            <span className="text-sm font-bold text-purple-600 mt-2 shrink-0">{qIdx + 1}.</span>
                            <input
                                type="text"
                                value={q.question}
                                onChange={(e) => updateQuestion(qIdx, 'question', e.target.value)}
                                className="flex-1 text-sm bg-transparent border-b border-gray-200 focus:border-purple-400 focus:outline-none py-1"
                                placeholder="Frage eingeben..."
                            />
                            <button onClick={() => removeQuestion(qIdx)} className="text-gray-400 hover:text-red-500 shrink-0">
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="space-y-2 pl-8">
                            {q.options.map((opt, oIdx) => (
                                <div key={oIdx} className="flex items-center gap-2">
                                    {quizType === 'quiz' ? (
                                        <button
                                            onClick={() => updateQuestion(qIdx, 'correct_index', oIdx)}
                                            className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${q.correct_index === oIdx ? 'border-green-500 bg-green-500' : 'border-gray-300 hover:border-green-400'}`}
                                            title="Als richtige Antwort markieren"
                                        >
                                            {q.correct_index === oIdx && <div className="w-2 h-2 rounded-full bg-white" />}
                                        </button>
                                    ) : (
                                        <div className="w-5 h-5 rounded-full border-2 border-purple-300 shrink-0" />
                                    )}
                                    <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                                        className={`flex-1 text-sm bg-transparent border-b focus:outline-none py-1 ${q.correct_index === oIdx ? 'border-green-300 focus:border-green-500' : 'border-gray-200 focus:border-purple-400'}`}
                                        placeholder={`Antwort ${oIdx + 1}`}
                                    />
                                    {q.options.length > 2 && (
                                        <button onClick={() => removeOption(qIdx, oIdx)} className="text-gray-300 hover:text-red-400">
                                            <Trash2 size={12} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            <button
                                onClick={() => addOption(qIdx)}
                                className="text-xs text-gray-400 hover:text-purple-600 ml-7"
                            >
                                + Antwort hinzufügen
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={addQuestion}
                className="w-full mt-4 py-3 border-2 border-dashed border-purple-200 rounded-xl flex items-center justify-center gap-2 text-purple-400 hover:text-purple-600 hover:border-purple-400 transition-all font-medium text-sm"
            >
                <Plus size={16} /> Frage hinzufügen
            </button>
        </div>
    );
}
