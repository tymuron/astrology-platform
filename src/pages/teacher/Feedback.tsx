import { useEffect, useMemo, useState } from 'react';
import {
    Heart, Star, Download, Loader2, MessageCircle, Plus, Trash2, ChevronUp, ChevronDown,
    Eye, EyeOff, X, Save, Edit3, Settings,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { FeedbackResponse, FeedbackQuestion, FeedbackQuestionKind, FeedbackChoice } from '../../lib/types';

interface UserSummary {
    user_id: string;
    name: string;
    email: string;
    submitted_at: string;
    answers: Record<string, { rating?: number | null; text?: string | null }>;
}

const RECOMMEND_LABEL_FALLBACK: Record<string, string> = {
    yes: 'Ja',
    maybe: 'Vielleicht',
    no: 'Nein',
};

type Tab = 'responses' | 'questions';

export default function TeacherFeedback() {
    const [tab, setTab] = useState<Tab>('responses');
    const [questions, setQuestions] = useState<FeedbackQuestion[]>([]);
    const [responses, setResponses] = useState<FeedbackResponse[]>([]);
    const [profiles, setProfiles] = useState<Record<string, { name: string; email: string }>>({});
    const [loading, setLoading] = useState(true);

    const refresh = async () => {
        setLoading(true);
        const [{ data: qs }, { data: rs }] = await Promise.all([
            supabase.from('feedback_questions').select('*').order('order_index', { ascending: true }),
            supabase.from('feedback_responses').select('*').order('updated_at', { ascending: false }),
        ]);
        setQuestions((qs as FeedbackQuestion[]) || []);
        const list = (rs as FeedbackResponse[]) || [];
        setResponses(list);
        const userIds = Array.from(new Set(list.map(r => r.user_id)));
        if (userIds.length > 0) {
            const { data: profs } = await supabase
                .from('profiles')
                .select('id, name, email')
                .in('id', userIds);
            const map: Record<string, { name: string; email: string }> = {};
            (profs || []).forEach((p: any) => {
                map[p.id] = { name: p.name || p.email || 'Anonym', email: p.email || '' };
            });
            setProfiles(map);
        }
        setLoading(false);
    };

    useEffect(() => { refresh(); }, []);

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-gold" size={40} /></div>;
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-serif text-vastu-dark flex items-center gap-3">
                    <Heart size={28} className="text-vastu-gold" />
                    Feedback
                </h1>
                <p className="text-sm font-sans text-vastu-text-light mt-1">
                    Antworten der Teilnehmer und Verwaltung des Feedbackbogens.
                </p>
            </div>

            <div className="flex gap-1 border-b border-vastu-sand/40">
                <TabButton active={tab === 'responses'} onClick={() => setTab('responses')} icon={MessageCircle} label="Antworten" count={Object.keys(profiles).length} />
                <TabButton active={tab === 'questions'} onClick={() => setTab('questions')} icon={Settings} label="Fragen verwalten" count={questions.length} />
            </div>

            {tab === 'responses' ? (
                <ResponsesPanel responses={responses} profiles={profiles} questions={questions} />
            ) : (
                <QuestionsPanel questions={questions} onChange={refresh} />
            )}
        </div>
    );
}

const TabButton = ({ active, onClick, icon: Icon, label, count }: any) => (
    <button
        onClick={onClick}
        className={`px-4 py-2.5 text-sm font-sans flex items-center gap-2 border-b-2 -mb-px transition-colors ${
            active ? 'border-vastu-dark text-vastu-dark font-medium' : 'border-transparent text-vastu-text-light hover:text-vastu-dark'
        }`}
    >
        <Icon size={16} />
        <span>{label}</span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${active ? 'bg-vastu-dark/10' : 'bg-vastu-cream/60'}`}>{count}</span>
    </button>
);

// ============================================================================
// Responses panel
// ============================================================================
function ResponsesPanel({
    responses,
    profiles,
    questions,
}: {
    responses: FeedbackResponse[];
    profiles: Record<string, { name: string; email: string }>;
    questions: FeedbackQuestion[];
}) {
    const questionByKey = useMemo(() => {
        const m: Record<string, FeedbackQuestion> = {};
        questions.forEach(q => { m[q.question_key] = q; });
        return m;
    }, [questions]);

    const summaries = useMemo<UserSummary[]>(() => {
        const byUser: Record<string, UserSummary> = {};
        responses.forEach(r => {
            if (!byUser[r.user_id]) {
                byUser[r.user_id] = {
                    user_id: r.user_id,
                    name: profiles[r.user_id]?.name || 'Teilnehmer',
                    email: profiles[r.user_id]?.email || '',
                    submitted_at: r.updated_at,
                    answers: {},
                };
            }
            byUser[r.user_id].answers[r.question_key] = {
                rating: r.answer_rating,
                text: r.answer_text,
            };
            if (r.updated_at > byUser[r.user_id].submitted_at) {
                byUser[r.user_id].submitted_at = r.updated_at;
            }
        });
        return Object.values(byUser).sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
    }, [responses, profiles]);

    const stats = useMemo(() => {
        // Avg of any 'rating' kind question (most courses will have one)
        const ratingKeys = questions.filter(q => q.kind === 'rating').map(q => q.question_key);
        const ratings = responses.filter(r => ratingKeys.includes(r.question_key) && r.answer_rating != null);
        const avg = ratings.length > 0
            ? ratings.reduce((sum, r) => sum + (r.answer_rating || 0), 0) / ratings.length
            : 0;

        // Recommendation breakdown — finds the first 'choice' question with yes/maybe/no values
        const choiceQ = questions.find(q => q.kind === 'choice' && q.choices?.some(c => ['yes', 'maybe', 'no'].includes(c.value)));
        const recCounts: Record<string, number> = {};
        if (choiceQ) {
            const recs = responses.filter(r => r.question_key === choiceQ.question_key);
            recs.forEach(r => {
                if (r.answer_text) recCounts[r.answer_text] = (recCounts[r.answer_text] || 0) + 1;
            });
        }

        return { participants: summaries.length, avgRating: avg, ratingCount: ratings.length, recCounts, choiceQ };
    }, [responses, summaries, questions]);

    const exportCsv = () => {
        const orderedKeys = questions.map(q => q.question_key);
        const labelByKey: Record<string, string> = {};
        questions.forEach(q => { labelByKey[q.question_key] = q.label; });

        const header = ['Name', 'Email', 'Eingereicht am', ...orderedKeys.map(k => labelByKey[k] || k)];
        const rows = summaries.map(s => [
            s.name,
            s.email,
            new Date(s.submitted_at).toLocaleString('de-DE'),
            ...orderedKeys.map(k => {
                const a = s.answers[k];
                if (!a) return '';
                const q = questionByKey[k];
                if (q?.kind === 'rating') return a.rating != null ? String(a.rating) : '';
                if (q?.kind === 'choice') {
                    const choice = q.choices?.find(c => c.value === a.text);
                    return choice ? choice.label : (a.text || '');
                }
                return a.text || '';
            }),
        ]);
        const csv = [header, ...rows]
            .map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `feedback-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (summaries.length === 0) {
        return (
            <div className="bg-white rounded-xl border border-vastu-sand/50 p-12 text-center">
                <MessageCircle size={48} className="mx-auto mb-4 text-vastu-sand" />
                <p className="font-serif text-lg text-vastu-dark">Noch keine Antworten</p>
                <p className="text-sm font-sans text-vastu-text-light mt-1">
                    Sobald Teilnehmer den Feedbackbogen ausfüllen, erscheinen ihre Antworten hier.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-end">
                <button
                    onClick={exportCsv}
                    className="inline-flex items-center gap-2 bg-vastu-dark text-white px-4 py-2 rounded-lg hover:bg-vastu-dark/90 transition-colors"
                >
                    <Download size={16} />
                    <span>Als CSV exportieren</span>
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-vastu-sand/50 p-5">
                    <div className="text-xs uppercase tracking-wider font-sans text-vastu-text-light mb-1">Teilnehmer</div>
                    <div className="text-3xl font-serif text-vastu-dark">{stats.participants}</div>
                </div>
                <div className="bg-white rounded-xl border border-vastu-sand/50 p-5">
                    <div className="text-xs uppercase tracking-wider font-sans text-vastu-text-light mb-1">Ø Bewertung</div>
                    <div className="flex items-baseline gap-2">
                        <div className="text-3xl font-serif text-vastu-dark">
                            {stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—'}
                        </div>
                        {stats.avgRating > 0 && (
                            <div className="flex">
                                {[1, 2, 3, 4, 5].map(n => (
                                    <Star
                                        key={n}
                                        size={14}
                                        className={n <= Math.round(stats.avgRating) ? 'text-vastu-gold fill-vastu-gold' : 'text-vastu-sand'}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="text-xs font-sans text-vastu-text-light mt-1">
                        aus {stats.ratingCount} Bewertungen
                    </div>
                </div>
                {stats.choiceQ && (
                    <div className="bg-white rounded-xl border border-vastu-sand/50 p-5">
                        <div className="text-xs uppercase tracking-wider font-sans text-vastu-text-light mb-2 truncate" title={stats.choiceQ.label}>
                            {stats.choiceQ.label}
                        </div>
                        <div className="space-y-1 text-sm font-sans">
                            {stats.choiceQ.choices?.map(c => (
                                <div key={c.value} className="flex justify-between">
                                    <span>{c.label}</span>
                                    <span className="font-medium">{stats.recCounts[c.value] || 0}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-4">
                {summaries.map(s => (
                    <div key={s.user_id} className="bg-white rounded-xl border border-vastu-sand/50 overflow-hidden">
                        <div className="px-5 py-3 bg-vastu-cream/40 border-b border-vastu-sand/30 flex items-center justify-between">
                            <div>
                                <div className="font-serif font-medium text-vastu-dark">{s.name}</div>
                                <div className="text-xs font-sans text-vastu-text-light">{s.email}</div>
                            </div>
                            <div className="text-xs font-sans text-vastu-text-light">
                                {new Date(s.submitted_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            {questions.map(q => {
                                const a = s.answers[q.question_key];
                                if (!a || (a.rating == null && !a.text)) return null;
                                return (
                                    <div key={q.id} className="space-y-1">
                                        <div className="text-xs uppercase tracking-wider font-sans text-vastu-text-light">
                                            {q.label}
                                        </div>
                                        {q.kind === 'rating' && a.rating != null ? (
                                            <div className="flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <Star
                                                        key={n}
                                                        size={18}
                                                        className={n <= a.rating! ? 'text-vastu-gold fill-vastu-gold' : 'text-vastu-sand'}
                                                    />
                                                ))}
                                                <span className="ml-2 text-sm font-sans text-vastu-text-light">{a.rating}/5</span>
                                            </div>
                                        ) : q.kind === 'choice' ? (
                                            <div className="text-sm font-body text-vastu-dark">
                                                {q.choices?.find(c => c.value === a.text)?.label || RECOMMEND_LABEL_FALLBACK[a.text || ''] || a.text}
                                            </div>
                                        ) : (
                                            <div className="text-sm font-body text-vastu-dark whitespace-pre-wrap">
                                                {a.text}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================================================
// Questions management panel
// ============================================================================
function QuestionsPanel({ questions, onChange }: { questions: FeedbackQuestion[]; onChange: () => Promise<void> }) {
    const [editing, setEditing] = useState<FeedbackQuestion | 'new' | null>(null);
    const [busy, setBusy] = useState<string | null>(null);

    const move = async (q: FeedbackQuestion, dir: -1 | 1) => {
        const sorted = [...questions].sort((a, b) => a.order_index - b.order_index);
        const idx = sorted.findIndex(x => x.id === q.id);
        const target = sorted[idx + dir];
        if (!target) return;
        setBusy(q.id);
        try {
            await Promise.all([
                supabase.from('feedback_questions').update({ order_index: target.order_index }).eq('id', q.id),
                supabase.from('feedback_questions').update({ order_index: q.order_index }).eq('id', target.id),
            ]);
            await onChange();
        } finally {
            setBusy(null);
        }
    };

    const toggleActive = async (q: FeedbackQuestion) => {
        setBusy(q.id);
        try {
            await supabase.from('feedback_questions').update({ is_active: !q.is_active, updated_at: new Date().toISOString() }).eq('id', q.id);
            await onChange();
        } finally {
            setBusy(null);
        }
    };

    const remove = async (q: FeedbackQuestion) => {
        if (!confirm(`"${q.label}" wirklich löschen? Bereits eingegangene Antworten bleiben in der Datenbank, werden aber nicht mehr angezeigt.`)) return;
        setBusy(q.id);
        try {
            await supabase.from('feedback_questions').delete().eq('id', q.id);
            await onChange();
        } finally {
            setBusy(null);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <p className="text-sm font-sans text-vastu-text-light">
                    Reihenfolge per Pfeile, sichtbar/versteckt per Auge. Ein deaktiviertes Element erscheint Teilnehmern nicht.
                </p>
                <button
                    onClick={() => setEditing('new')}
                    className="inline-flex items-center gap-2 bg-vastu-dark text-white px-4 py-2 rounded-lg hover:bg-vastu-dark/90 transition-colors"
                >
                    <Plus size={16} />
                    <span>Neue Frage</span>
                </button>
            </div>

            <div className="space-y-2">
                {questions.length === 0 && (
                    <div className="bg-white rounded-xl border border-vastu-sand/50 p-12 text-center">
                        <p className="font-serif text-lg text-vastu-dark">Noch keine Fragen</p>
                        <p className="text-sm font-sans text-vastu-text-light mt-1">Klicke auf «Neue Frage», um zu starten.</p>
                    </div>
                )}
                {questions.map((q, i) => (
                    <div key={q.id} className={`bg-white rounded-xl border p-4 flex items-center gap-3 ${q.is_active ? 'border-vastu-sand/50' : 'border-vastu-sand/30 opacity-60'}`}>
                        <div className="flex flex-col gap-0.5">
                            <button
                                onClick={() => move(q, -1)}
                                disabled={i === 0 || busy === q.id}
                                className="p-0.5 text-vastu-text-light hover:text-vastu-dark disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronUp size={16} />
                            </button>
                            <button
                                onClick={() => move(q, 1)}
                                disabled={i === questions.length - 1 || busy === q.id}
                                className="p-0.5 text-vastu-text-light hover:text-vastu-dark disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-serif text-vastu-dark truncate">{q.label}</span>
                                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-vastu-cream/60 text-vastu-text-light font-sans">
                                    {q.kind === 'rating' ? 'Sterne' : q.kind === 'text' ? 'Text' : 'Auswahl'}
                                </span>
                                {q.optional && (
                                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-sans border border-amber-100">
                                        optional
                                    </span>
                                )}
                                {!q.is_active && (
                                    <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-sans border border-red-100">
                                        versteckt
                                    </span>
                                )}
                            </div>
                            {q.helper && (
                                <div className="text-xs font-sans text-vastu-text-light mt-1 truncate">{q.helper}</div>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => toggleActive(q)}
                                disabled={busy === q.id}
                                className="p-2 text-vastu-text-light hover:text-vastu-dark hover:bg-vastu-cream/40 rounded-lg"
                                title={q.is_active ? 'Verstecken' : 'Anzeigen'}
                            >
                                {q.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                            <button
                                onClick={() => setEditing(q)}
                                className="p-2 text-vastu-text-light hover:text-vastu-dark hover:bg-vastu-cream/40 rounded-lg"
                                title="Bearbeiten"
                            >
                                <Edit3 size={16} />
                            </button>
                            <button
                                onClick={() => remove(q)}
                                disabled={busy === q.id}
                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title="Löschen"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {editing && (
                <QuestionEditor
                    initial={editing === 'new' ? null : editing}
                    nextOrder={(questions.reduce((max, q) => Math.max(max, q.order_index), 0) + 1)}
                    onClose={() => setEditing(null)}
                    onSaved={async () => { setEditing(null); await onChange(); }}
                />
            )}
        </div>
    );
}

// ============================================================================
// Question editor modal
// ============================================================================
function QuestionEditor({
    initial,
    nextOrder,
    onClose,
    onSaved,
}: {
    initial: FeedbackQuestion | null;
    nextOrder: number;
    onClose: () => void;
    onSaved: () => Promise<void>;
}) {
    const [label, setLabel] = useState(initial?.label || '');
    const [helper, setHelper] = useState(initial?.helper || '');
    const [kind, setKind] = useState<FeedbackQuestionKind>(initial?.kind || 'rating');
    const [optional, setOptional] = useState(initial?.optional ?? false);
    const [isActive, setIsActive] = useState(initial?.is_active ?? true);
    const [choices, setChoices] = useState<FeedbackChoice[]>(initial?.choices || [{ value: '', label: '' }]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const updateChoice = (i: number, field: 'value' | 'label', val: string) => {
        setChoices(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));
    };

    const addChoice = () => setChoices(prev => [...prev, { value: '', label: '' }]);
    const removeChoice = (i: number) => setChoices(prev => prev.filter((_, idx) => idx !== i));

    const valid = label.trim().length > 0 && (
        kind !== 'choice' || (choices.length > 0 && choices.every(c => c.value.trim() && c.label.trim()))
    );

    const save = async () => {
        if (!valid) return;
        setSaving(true);
        setError(null);
        try {
            const payload = {
                label: label.trim(),
                helper: helper.trim() || null,
                kind,
                choices: kind === 'choice' ? choices.map(c => ({ value: c.value.trim(), label: c.label.trim() })) : null,
                optional,
                is_active: isActive,
                updated_at: new Date().toISOString(),
            };
            if (initial) {
                const { error: updErr } = await supabase
                    .from('feedback_questions')
                    .update(payload)
                    .eq('id', initial.id);
                if (updErr) throw updErr;
            } else {
                const newKey = (typeof crypto !== 'undefined' && crypto.randomUUID)
                    ? `q_${crypto.randomUUID().slice(0, 8)}`
                    : `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
                const { error: insErr } = await supabase
                    .from('feedback_questions')
                    .insert({ ...payload, question_key: newKey, order_index: nextOrder });
                if (insErr) throw insErr;
            }
            await onSaved();
        } catch (e: any) {
            setError(e?.message ?? 'Speichern fehlgeschlagen.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                <div className="p-5 border-b border-vastu-sand/40 flex justify-between items-center bg-vastu-cream/40">
                    <h2 className="text-xl font-serif text-vastu-dark">
                        {initial ? 'Frage bearbeiten' : 'Neue Frage'}
                    </h2>
                    <button onClick={onClose} className="text-vastu-text-light hover:text-vastu-dark">
                        <X size={22} />
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-vastu-dark mb-1">Frage *</label>
                        <input
                            type="text"
                            value={label}
                            onChange={e => setLabel(e.target.value)}
                            placeholder="z.B. Wie zufrieden bist du mit dem Tempo?"
                            className="w-full rounded-lg border-vastu-sand/60 focus:ring-vastu-gold focus:border-vastu-gold"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-vastu-dark mb-1">Hilfetext (optional)</label>
                        <input
                            type="text"
                            value={helper}
                            onChange={e => setHelper(e.target.value)}
                            placeholder="z.B. 1 = zu langsam, 5 = perfekt"
                            className="w-full rounded-lg border-vastu-sand/60 focus:ring-vastu-gold focus:border-vastu-gold"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-vastu-dark mb-2">Antwort-Typ</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['rating', 'text', 'choice'] as FeedbackQuestionKind[]).map(k => (
                                <button
                                    key={k}
                                    type="button"
                                    onClick={() => setKind(k)}
                                    className={`px-3 py-2 rounded-lg border text-sm font-sans transition-colors ${
                                        kind === k
                                            ? 'bg-vastu-gold/15 border-vastu-gold text-vastu-dark font-medium'
                                            : 'bg-white border-vastu-sand/60 text-vastu-text-light hover:border-vastu-gold/50'
                                    }`}
                                >
                                    {k === 'rating' ? '⭐ Sterne 1–5' : k === 'text' ? '📝 Freitext' : '☑️ Auswahl'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {kind === 'choice' && (
                        <div>
                            <label className="block text-sm font-medium text-vastu-dark mb-2">Antwortmöglichkeiten</label>
                            <div className="space-y-2">
                                {choices.map((c, i) => (
                                    <div key={i} className="flex gap-2 items-center">
                                        <input
                                            type="text"
                                            value={c.label}
                                            onChange={e => updateChoice(i, 'label', e.target.value)}
                                            placeholder="Anzeige (z.B. Ja, auf jeden Fall)"
                                            className="flex-1 rounded-lg border-vastu-sand/60 text-sm focus:ring-vastu-gold focus:border-vastu-gold"
                                        />
                                        <input
                                            type="text"
                                            value={c.value}
                                            onChange={e => updateChoice(i, 'value', e.target.value.replace(/\s+/g, '_').toLowerCase())}
                                            placeholder="Schlüssel (z.B. yes)"
                                            className="w-32 rounded-lg border-vastu-sand/60 text-sm font-mono focus:ring-vastu-gold focus:border-vastu-gold"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => removeChoice(i)}
                                            disabled={choices.length === 1}
                                            className="p-2 text-red-400 hover:text-red-600 disabled:opacity-30"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                            <button
                                type="button"
                                onClick={addChoice}
                                className="mt-2 text-sm font-sans text-vastu-gold hover:text-vastu-dark inline-flex items-center gap-1"
                            >
                                <Plus size={14} /> Option hinzufügen
                            </button>
                        </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:gap-6 gap-2 pt-2">
                        <label className="flex items-center gap-2 text-sm font-sans text-vastu-dark cursor-pointer">
                            <input
                                type="checkbox"
                                checked={optional}
                                onChange={e => setOptional(e.target.checked)}
                                className="rounded border-vastu-sand/60 text-vastu-gold focus:ring-vastu-gold"
                            />
                            <span>Optional (nicht erforderlich)</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm font-sans text-vastu-dark cursor-pointer">
                            <input
                                type="checkbox"
                                checked={isActive}
                                onChange={e => setIsActive(e.target.checked)}
                                className="rounded border-vastu-sand/60 text-vastu-gold focus:ring-vastu-gold"
                            />
                            <span>Aktiv (Teilnehmer sehen die Frage)</span>
                        </label>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                            {error}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-vastu-sand/40 flex justify-end gap-3 bg-vastu-cream/20">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 text-vastu-text-light hover:bg-vastu-cream/40 rounded-lg transition-colors"
                    >
                        Abbrechen
                    </button>
                    <button
                        onClick={save}
                        disabled={!valid || saving}
                        className="px-5 py-2 bg-vastu-dark text-white rounded-lg hover:bg-vastu-dark/90 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        <span>{initial ? 'Änderungen speichern' : 'Frage erstellen'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
