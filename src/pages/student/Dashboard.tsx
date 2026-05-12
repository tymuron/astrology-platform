import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Play, ChevronRight, FileText, Loader2, CheckCircle2, Download, Lock, Gift, Video, ArrowLeft, ArrowRight, ExternalLink, ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useModules } from '../../hooks/useCourse';
import { useQuiz } from '../../hooks/useQuiz';
import { navigateBackOr, parseCategorizedLink } from '../../lib/utils';
import { sanitizeHtml } from '../../lib/sanitize';
import { supabase } from '../../lib/supabase';
import { Material } from '../../lib/types';

// Extract module number for decorative badge
function getModuleNumber(id: string): string {
    if (id === 'pre') return '✦';
    if (id === 'bonus') return '★';
    const match = id.match(/m(\d+)/);
    return match ? match[1].padStart(2, '0') : '';
}

const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
};

export default function StudentDashboard() {
    const { modules, loading, error: _modulesError } = useModules();
    const location = useLocation();
    const navigate = useNavigate();
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [reviewUrl, setReviewUrl] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<'lektionen' | 'materialien' | 'links'>('lektionen');

    const searchParams = new URLSearchParams(location.search);
    const activeModuleId = searchParams.get('module');
    const { quiz, lastAttempt: quizAttempt } = useQuiz(activeModuleId || undefined);

    useEffect(() => {
        if (!loading && modules.length > 0) {
            const isValidModule = modules.some(m => m.id === activeModuleId);
            if (!activeModuleId || !isValidModule) {
                const firstUnlocked = modules.find(m => !m.isLocked);
                const targetId = firstUnlocked?.id || modules[0].id;
                navigate(`/student?module=${targetId}`, { replace: true });
            }
        }
    }, [modules, loading, activeModuleId, navigate]);

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-gold" size={40} /></div>;
    }

    const activeMod = modules.find(m => m.id === activeModuleId);
    if (!activeMod) {
        // Module not yet selected or invalid — useEffect will redirect shortly
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-gold" size={40} /></div>;
    }

    // Find next unlocked module for "Weiter" navigation
    const activeIndex = modules.findIndex(m => m.id === activeModuleId);
    const nextModule = activeIndex >= 0 && activeIndex < modules.length - 1
        ? modules.slice(activeIndex + 1).find(m => !m.isLocked)
        : null;

    const completedCount = activeMod.lektionen.filter(l => l.isCompleted).length;
    const totalCount = activeMod.lektionen.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const moduleNum = getModuleNumber(activeMod.id);

    const handleUnlock = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!reviewUrl) return;

        setSubmitting(true);
        try {
            const { error } = await supabase.rpc('submit_review', { url: reviewUrl });
            if (error) throw error;
            setShowUnlockModal(false);
            alert('Danke für dein Feedback! Der Bonus ist nun freigeschaltet.');
            window.location.reload();
        } catch (error) {
            console.error(error);
            alert('Fehler beim Freischalten. Bitte versuche es erneut.');
        } finally {
            setSubmitting(false);
        }
    };

    const parsedLinks = activeMod.moduleMaterials
        ?.filter((m: Material) => m.type === 'link')
        .map((m: Material) => {
            const { category, title } = parseCategorizedLink(m.title);
            return { ...m, category, cleanTitle: title };
        }) || [];

    const hasLinks = parsedLinks.length > 0;

    const regularMaterials = activeMod.moduleMaterials?.filter((m: Material) => m.type !== 'link') || [];

    type ParsedLink = Material & { category: string; cleanTitle: string };

    const linksByCategory = parsedLinks.reduce((acc: Record<string, ParsedLink[]>, link: ParsedLink) => {
        if (!acc[link.category]) acc[link.category] = [];
        acc[link.category].push(link);
        return acc;
    }, {});

    return (
        <div className="animate-fade-in space-y-4">
            {/* Navigation Bar */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => navigateBackOr(navigate, '/student/welcome')}
                    className="inline-flex items-center gap-2 text-vastu-text-light hover:text-vastu-dark transition-colors group text-sm font-sans"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Zurück</span>
                </button>
                {nextModule && (
                    <Link
                        to={`/student?module=${nextModule.id}`}
                        className="inline-flex items-center gap-2 text-vastu-gold hover:text-vastu-dark transition-colors group text-sm font-sans font-medium"
                    >
                        <span>Weiter: {nextModule.title}</span>
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </Link>
                )}
            </div>
            <div className="bg-white rounded-xl md:rounded-2xl shadow-sm border border-vastu-sand/50 overflow-hidden min-h-[calc(100vh-5rem)]">
                {/* Module Header — grain texture + decorative module number */}
                <div className="bg-vastu-accent grain-overlay p-6 md:p-8 relative overflow-hidden">
                    {/* Decorative module number background */}
                    <div className="module-number-bg">{moduleNum}</div>

                    {/* Blur orb */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-vastu-dark opacity-5 rounded-full blur-[100px] translate-x-1/3 -translate-y-1/3" />

                    <div className="relative z-10">
                        {/* Module label pill */}
                        {activeMod.id !== 'pre' && activeMod.id !== 'bonus' && (
                            <span className="inline-block px-3 py-1 bg-vastu-dark/15 text-vastu-dark text-xs font-sans font-medium rounded-full mb-3 tracking-wide uppercase">
                                Modul {moduleNum}
                            </span>
                        )}

                        <h2 className="text-2xl md:text-4xl font-serif mb-3 text-vastu-dark">{activeMod.title}</h2>
                        <p className="text-vastu-dark/50 max-w-2xl font-body leading-relaxed text-base mb-4">
                            {stripHtml(activeMod.description || '')}
                        </p>

                        {/* Unlock Button for Bonus */}
                        {activeMod.id === 'bonus' && activeMod.isLocked && (
                            <div className="mb-6">
                                <button
                                    onClick={() => setShowUnlockModal(true)}
                                    className="bg-vastu-gold text-white px-6 py-3 rounded-full font-serif flex items-center gap-2 hover:bg-vastu-gold/90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                                >
                                    <Lock size={18} />
                                    <span>Bonus jetzt freischalten</span>
                                </button>
                            </div>
                        )}

                        {/* Progress Bar — with glow */}
                        {totalCount > 0 && (
                            <div className="max-w-md bg-vastu-dark/10 backdrop-blur-sm rounded-xl p-4">
                                <div className="flex justify-between text-sm font-sans mb-2">
                                    <span className="text-vastu-dark font-semibold">Fortschritt</span>
                                    <span className="text-vastu-dark font-bold">{completedCount}/{totalCount} Lektionen</span>
                                </div>
                                <div className={`h-2.5 bg-vastu-dark/15 rounded-full overflow-hidden ${progressPercent > 0 ? 'progress-glow active' : ''}`}>
                                    <div
                                        className="h-full bg-gradient-to-r from-vastu-dark to-vastu-gold rounded-full transition-all duration-700 ease-out"
                                        style={{ width: `${progressPercent}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Unlock Modal */}
                {showUnlockModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl transform scale-100 transition-all">
                            <div className="bg-vastu-dark p-6 text-center relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-vastu-gold opacity-10 rounded-full blur-[40px] translate-x-1/3 -translate-y-1/3" />
                                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
                                    <Gift className="text-vastu-gold w-8 h-8" />
                                </div>
                                <h3 className="font-serif text-xl text-white mb-1">Bonus freischalten</h3>
                                <p className="text-white/60 text-sm font-sans">Teile dein Feedback mit uns</p>
                            </div>

                            <form onSubmit={handleUnlock} className="p-6 md:p-8 space-y-4">
                                <div className="text-center space-y-2 mb-6">
                                    <p className="text-vastu-dark font-medium font-serif">Wie hat dir der Kurs gefallen?</p>
                                    <p className="text-sm text-vastu-text-light font-body leading-relaxed">
                                        Nimm ein kurzes Video (1-2 Min) auf, in dem du von deinen Erfahrungen berichtest, und füge den Link hier ein (z.B. YouTube, Vimeo, Google Drive).
                                    </p>
                                </div>

                                <div className="relative">
                                    <Video className="absolute left-3 top-3 text-vastu-sand w-5 h-5" />
                                    <input
                                        type="url"
                                        required
                                        placeholder="https://..."
                                        value={reviewUrl}
                                        onChange={(e) => setReviewUrl(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-vastu-cream/30 border border-vastu-sand/30 rounded-xl focus:ring-2 focus:ring-vastu-gold/20 focus:border-vastu-gold outline-none transition-all placeholder:text-vastu-sand/50"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowUnlockModal(false)}
                                        className="flex-1 py-3 text-vastu-text-light hover:bg-vastu-cream rounded-xl transition-colors font-sans text-sm"
                                    >
                                        Abbrechen
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitting || !reviewUrl}
                                        className="flex-1 py-3 bg-vastu-dark text-white rounded-xl font-medium hover:bg-vastu-dark/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
                                    >
                                        {submitting ? <Loader2 className="animate-spin w-4 h-4" /> : 'Freischalten'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Tab Bar */}
                <div className="flex gap-1 px-5 md:px-6 pt-4 pb-0 border-b border-vastu-sand/30 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('lektionen')}
                        className={`px-4 py-2.5 text-sm font-sans font-medium rounded-t-lg transition-all whitespace-nowrap ${activeTab === 'lektionen'
                            ? 'text-vastu-dark border-b-2 border-vastu-dark bg-vastu-cream/30'
                            : 'text-vastu-text-light hover:text-vastu-dark hover:bg-vastu-cream/20'
                            }`}
                    >
                        <span className="flex items-center gap-2"><Play size={14} /> Lektionen</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('materialien')}
                        className={`px-4 py-2.5 text-sm font-sans font-medium rounded-t-lg transition-all whitespace-nowrap ${activeTab === 'materialien'
                            ? 'text-vastu-dark border-b-2 border-vastu-dark bg-vastu-cream/30'
                            : 'text-vastu-text-light hover:text-vastu-dark hover:bg-vastu-cream/20'
                            }`}
                    >
                        <span className="flex items-center gap-2"><FileText size={14} /> Materialien</span>
                    </button>
                    {hasLinks && (
                        <button
                            onClick={() => setActiveTab('links')}
                            className={`px-4 py-2.5 text-sm font-sans font-medium rounded-t-lg transition-all whitespace-nowrap ${activeTab === 'links'
                                ? 'text-vastu-dark border-b-2 border-vastu-dark bg-vastu-cream/30'
                                : 'text-vastu-text-light hover:text-vastu-dark hover:bg-vastu-cream/20'
                                }`}
                        >
                            <span className="flex items-center gap-2"><ExternalLink size={14} /> Links</span>
                        </button>
                    )}
                </div>

                <div className="p-5 md:p-6 relative">
                    {/* Overlay for locked content */}
                    {activeMod.id === 'bonus' && activeMod.isLocked && (
                        <div className="absolute inset-0 z-40 bg-white/60 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-b-xl md:rounded-b-2xl">
                            <Lock className="text-vastu-dark w-12 h-12 mb-4 opacity-30" />
                            <p className="text-vastu-dark font-serif text-lg mb-2">Dieser Inhalt ist gesperrt</p>
                            <p className="text-vastu-text-light text-sm">Schalte den Bonus oben frei, um Zugriff zu erhalten.</p>
                        </div>
                    )}

                    {/* Lektionen Tab */}
                    {activeTab === 'lektionen' && (
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Lessons List — with left accent bars */}
                            <div className="md:col-span-2 space-y-4">
                                <h3 className="font-serif text-lg text-vastu-dark mb-3 flex items-center gap-2">
                                    <Play className="text-vastu-gold" size={20} />
                                    Lektionen
                                </h3>

                                {activeMod.lektionen.length === 0 ? (
                                    <div className="text-center py-6 text-vastu-text-light">
                                        <p className="text-lg font-body mb-2">Noch keine Lektionen verfügbar</p>
                                        <p className="text-sm font-sans">Die Inhalte werden bald freigeschaltet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 animate-stagger">
                                        {activeMod.lektionen.map((lektion) => (
                                            <Link
                                                key={lektion.id}
                                                to={`/student/module/${activeMod.id}/lektion/${lektion.id}`}
                                                className={`flex items-center justify-between p-4 rounded-xl border transition-all group relative overflow-hidden ${lektion.isCompleted
                                                    ? 'border-green-200 bg-green-50/30 hover:bg-green-50/60'
                                                    : 'border-vastu-sand/50 hover:border-vastu-gold/40 hover:bg-vastu-cream/50'
                                                    }`}
                                            >
                                                {/* Left accent bar */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-colors ${lektion.isCompleted ? 'bg-green-400' : 'bg-vastu-sand/50 group-hover:bg-vastu-gold'
                                                    }`} />

                                                <div className="flex items-center gap-4 pl-2">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${lektion.isCompleted
                                                        ? 'bg-green-100 text-green-600'
                                                        : 'bg-vastu-cream text-vastu-dark group-hover:bg-vastu-dark group-hover:text-white'
                                                        }`}>
                                                        {lektion.isCompleted ? (
                                                            <CheckCircle2 size={18} />
                                                        ) : (
                                                            <Play size={14} fill="currentColor" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <h4 className="font-serif font-medium text-vastu-dark group-hover:text-vastu-dark transition-colors">
                                                            {lektion.title}
                                                        </h4>
                                                        {lektion.description && (
                                                            <p className="text-xs font-body text-vastu-text-light line-clamp-2 mt-0.5" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lektion.description || '') }} />
                                                        )}
                                                    </div>
                                                </div>
                                                <ChevronRight size={18} className="text-vastu-sand group-hover:text-vastu-dark transition-colors shrink-0" />
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                {/* Quiz Button */}
                                {quiz && quiz.questions.length > 0 && (
                                    <Link
                                        to={`/student/module/${activeMod.id}/quiz`}
                                        className={`flex items-center justify-between p-4 rounded-xl border transition-all group relative overflow-hidden ${
                                            quizAttempt
                                                ? 'border-purple-200 bg-purple-50/30 hover:bg-purple-50/60'
                                                : 'border-vastu-sand/50 hover:border-purple-300 hover:bg-purple-50/30'
                                        }`}
                                    >
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl transition-colors ${
                                            quizAttempt ? 'bg-purple-400' : 'bg-purple-200 group-hover:bg-purple-400'
                                        }`} />
                                        <div className="flex items-center gap-4 pl-2">
                                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                                                quizAttempt
                                                    ? 'bg-purple-100 text-purple-600'
                                                    : 'bg-purple-50 text-purple-500 group-hover:bg-purple-500 group-hover:text-white'
                                            }`}>
                                                <ClipboardList size={18} />
                                            </div>
                                            <div>
                                                <h4 className="font-serif font-medium text-vastu-dark">{quiz.title}</h4>
                                                <p className="text-xs font-body text-vastu-text-light">
                                                    {quizAttempt
                                                        ? `${quizAttempt.score}/${quizAttempt.total} richtig`
                                                        : `${quiz.questions.length} Fragen`
                                                    }
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight size={18} className="text-vastu-sand group-hover:text-purple-500 transition-colors shrink-0" />
                                    </Link>
                                )}
                            </div>

                            {/* Materials Sidebar */}
                            <div className="space-y-6">
                                <div>
                                    <h3 className="font-serif text-lg text-vastu-dark mb-3 flex items-center gap-2">
                                        <FileText className="text-vastu-gold" size={20} />
                                        Materialien
                                    </h3>
                                    <div className="bg-vastu-cream/60 rounded-xl p-4 border border-vastu-sand/30 space-y-3">
                                        {regularMaterials.length > 0 ? (
                                            regularMaterials.map((material) => (
                                                <a
                                                    key={material.id}
                                                    href={material.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white transition-colors group"
                                                >
                                                    <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                                                        <FileText size={14} className="text-red-500" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="text-sm font-serif font-medium text-vastu-dark truncate group-hover:text-vastu-gold transition-colors">
                                                            {material.title}
                                                        </div>
                                                        <div className="text-[10px] font-sans text-vastu-text-light uppercase">
                                                            {material.type}
                                                        </div>
                                                    </div>
                                                    <Download size={14} className="text-vastu-sand group-hover:text-vastu-dark transition-colors mt-1 shrink-0" />
                                                </a>
                                            ))
                                        ) : (
                                            <div className="text-sm font-body text-vastu-text-light italic text-center py-4">
                                                Keine zusätzlichen Materialien
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Materialien Tab */}
                    {activeTab === 'materialien' && (
                        <div>
                            <h3 className="font-serif text-lg text-vastu-dark mb-3 flex items-center gap-2">
                                <FileText className="text-vastu-gold" size={20} />
                                Materialien
                            </h3>
                            <div className="bg-vastu-cream/60 rounded-xl p-4 border border-vastu-sand/30 space-y-3">
                                {regularMaterials.length > 0 ? (
                                    regularMaterials.map((material) => (
                                        <a
                                            key={material.id}
                                            href={material.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-white transition-colors group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                                                <FileText size={14} className="text-red-500" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-serif font-medium text-vastu-dark truncate group-hover:text-vastu-gold transition-colors">
                                                    {material.title}
                                                </div>
                                                <div className="text-[10px] font-sans text-vastu-text-light uppercase">
                                                    {material.type}
                                                </div>
                                            </div>
                                            <Download size={14} className="text-vastu-sand group-hover:text-vastu-dark transition-colors mt-1 shrink-0" />
                                        </a>
                                    ))
                                ) : (
                                    <div className="text-sm font-body text-vastu-text-light italic text-center py-4">
                                        Keine zusätzlichen Materialien
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Links Tab */}
                    {activeTab === 'links' && hasLinks && (
                        <div>
                            <h3 className="font-serif text-lg text-vastu-dark mb-4 flex items-center gap-2">
                                <ExternalLink className="text-vastu-gold" size={20} />
                                Nützliche Links
                            </h3>
                            <p className="text-sm text-vastu-text-light font-body mb-6">
                                Hier findest du empfohlene Links und zusätzliche Ressourcen zu diesem Modul.
                            </p>

                            <div className="space-y-8">
                                {Object.entries(linksByCategory).map(([category, links]) => (
                                    <div key={category}>
                                        <h4 className="font-serif font-medium text-vastu-dark mb-4 border-b border-vastu-sand/30 pb-2">
                                            {category}
                                        </h4>
                                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {links.map((link) => (
                                                <a
                                                    key={link.id}
                                                    href={link.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="group flex flex-col p-5 rounded-xl border border-vastu-sand/40 bg-vastu-cream/30 hover:bg-white hover:border-vastu-gold/30 hover:shadow-md transition-all"
                                                >
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-9 h-9 rounded-lg bg-vastu-dark/8 flex items-center justify-center shrink-0 group-hover:bg-vastu-gold/15 transition-colors">
                                                            <ExternalLink size={16} className="text-vastu-dark/60 group-hover:text-vastu-gold transition-colors" />
                                                        </div>
                                                        <h4 className="font-serif font-medium text-vastu-dark text-sm group-hover:text-vastu-gold transition-colors">
                                                            {link.cleanTitle}
                                                        </h4>
                                                    </div>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
