import { useParams, Link, useNavigate } from 'react-router-dom';
import { FileText, Download, Loader2, BookOpen, CheckCircle2, ChevronRight, Home, ArrowLeft, ArrowRight, ExternalLink } from 'lucide-react';
import { useLektion, useModules } from '../../hooks/useCourse';
import { navigateBackOr, parseCategorizedLink } from '../../lib/utils';
import { sanitizeHtml } from '../../lib/sanitize';
import { Material } from '../../lib/types';
import VimeoPlayer from '../../components/VimeoPlayer';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

// Parse homework text into individual checklist items
function parseHomeworkItems(html: string): string[] {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const listItems = doc.querySelectorAll('li');

    // If there are proper list items, use those
    if (listItems.length > 0) {
        return Array.from(listItems)
            .map(li => (li.textContent || '').trim())
            .filter(t => t.length > 0);
    }

    // Otherwise, try to split by line breaks, bullet chars, etc.
    const text = doc.body.textContent || '';
    const lines = text
        .split(/[\n\r]+/)
        .map(line => line.replace(/^[\s•\-*·]+/, '').trim())
        .filter(line => line.length > 0);

    // Only return as checklist if there are multiple distinct lines
    return lines.length > 1 ? lines : [];
}

export default function LektionView() {
    const { moduleId, lektionId } = useParams();
    const { lektion, loading, toggleComplete } = useLektion(moduleId, lektionId);
    const [justCompleted, setJustCompleted] = useState(false);
    const [descExpanded, setDescExpanded] = useState(false);
    const [hwChecks, setHwChecks] = useState<Record<number, boolean>>({});
    const { modules } = useModules();
    const navigate = useNavigate();
    const storageKey = `homework-checks:${moduleId || 'unknown'}:${lektionId || 'unknown'}`;

    const loadChecksFromLocalStorage = () => {
        try {
            const value = localStorage.getItem(storageKey);
            if (!value) return {};
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' && parsed ? parsed : {};
        } catch {
            return {};
        }
    };

    const saveChecksToLocalStorage = (checks: Record<number, boolean>) => {
        try {
            localStorage.setItem(storageKey, JSON.stringify(checks));
        } catch {
            // Ignore quota errors to avoid blocking UI interactions.
        }
    };

    // Compute next lesson / next module
    const nextNav = (() => {
        if (!modules.length || !moduleId || !lektionId) return null;
        const modIdx = modules.findIndex(m => m.id === moduleId);
        if (modIdx === -1) return null;
        const mod = modules[modIdx];
        const lekIdx = mod.lektionen.findIndex(l => l.id === lektionId);
        if (lekIdx === -1) return null;

        // Next lesson in same module
        if (lekIdx < mod.lektionen.length - 1) {
            const next = mod.lektionen[lekIdx + 1];
            return { type: 'lesson' as const, label: next.title, path: `/student/module/${moduleId}/lektion/${next.id}` };
        }

        // First lesson of next module
        if (modIdx < modules.length - 1) {
            const nextMod = modules[modIdx + 1];
            if (nextMod.lektionen.length > 0 && !nextMod.isLocked) {
                return { type: 'module' as const, label: nextMod.title, path: `/student/module/${nextMod.id}/lektion/${nextMod.lektionen[0].id}` };
            }
        }

        return null; // Last lesson of last module
    })();

    // Load homework checks from Supabase (syncs across devices)
    useEffect(() => {
        async function loadChecks() {
            if (!lektionId) return;
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) {
                    setHwChecks(loadChecksFromLocalStorage());
                    return;
                }

                const { data, error } = await supabase
                    .from('homework_checks')
                    .select('checks')
                    .eq('user_id', user.id)
                    .eq('day_id', lektionId)
                    .single();

                if (error) {
                    setHwChecks(loadChecksFromLocalStorage());
                    return;
                }

                if (data?.checks) {
                    setHwChecks(data.checks);
                    saveChecksToLocalStorage(data.checks);
                } else {
                    setHwChecks(loadChecksFromLocalStorage());
                }
            } catch {
                setHwChecks(loadChecksFromLocalStorage());
            }
        }
        loadChecks();
    }, [lektionId, storageKey]);

    const toggleHwItem = async (index: number) => {
        const updated = { ...hwChecks, [index]: !hwChecks[index] };
        setHwChecks(updated);
        saveChecksToLocalStorage(updated);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { error } = await supabase
                .from('homework_checks')
                .upsert({
                    user_id: user.id,
                    day_id: lektionId,
                    checks: updated,
                }, { onConflict: 'user_id,day_id' });
            if (error) {
                // Keep local storage as fallback when backend table is unavailable.
                return;
            }
        } catch {
            // Keep local storage state as source of truth on write failures.
        }
    };

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-gold" size={40} /></div>;
    }

    if (!lektion) {
        return (
            <div className="text-center py-20">
                <p className="text-vastu-text-light font-body text-lg">Lektion nicht gefunden</p>
                <Link to="/student" className="text-vastu-dark underline mt-4 inline-block font-body">Zurück zum Kurs</Link>
            </div>
        );
    }

    const pdfMaterials = lektion.materials.filter(m => m.type === 'pdf');
    const videoMaterials = lektion.materials.filter(m => m.type === 'video');

    const parsedLinks = lektion.materials
        .filter(m => m.type === 'link')
        .map(m => {
            const { category, title } = parseCategorizedLink(m.title);
            return { ...m, category, cleanTitle: title };
        });

    type ParsedLink = Material & { category: string; cleanTitle: string };

    const linksByCategory = parsedLinks.reduce((acc: Record<string, ParsedLink[]>, link: ParsedLink) => {
        if (!acc[link.category]) acc[link.category] = [];
        acc[link.category].push(link);
        return acc;
    }, {});

    const imageMaterials = lektion.materials.filter(m => m.type === 'image');
    const otherMaterials = lektion.materials.filter(m => m.type !== 'pdf' && m.type !== 'link' && m.type !== 'video' && m.type !== 'image');

    const handleToggleComplete = (val: boolean) => {
        toggleComplete(val);
        if (val) {
            setJustCompleted(true);
            setTimeout(() => setJustCompleted(false), 500);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            {/* Back Button */}
            <button
                onClick={() => navigateBackOr(navigate, '/student')}
                className="inline-flex items-center gap-2 text-vastu-text-light hover:text-vastu-dark transition-colors group text-sm font-sans"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span>Zurück</span>
            </button>

            {/* Breadcrumb Navigation */}
            <nav className="flex items-center gap-2 text-sm font-sans text-vastu-text-light">
                <Link to="/student" className="hover:text-vastu-dark transition-colors flex items-center gap-1">
                    <Home size={14} />
                    Kurs
                </Link>
                <ChevronRight size={14} className="text-vastu-sand" />
                <Link to={`/student?module=${moduleId}`} className="hover:text-vastu-dark transition-colors">
                    Modul
                </Link>
                <ChevronRight size={14} className="text-vastu-sand" />
                <span className="text-vastu-dark font-medium truncate max-w-[200px]">{lektion.title}</span>
            </nav>

            {/* Lesson Content Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 overflow-hidden">
                {/* Header with grain */}
                <div className="bg-vastu-accent grain-overlay p-6 md:p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-vastu-dark opacity-5 rounded-full blur-[80px] translate-x-1/3 -translate-y-1/3" />
                    <div className="relative z-10">
                        <h1 className="text-2xl md:text-4xl font-serif mb-2 text-vastu-dark">{lektion.title}</h1>
                    </div>
                </div>

                {/* Vimeo Video (from dedicated field) */}
                {lektion.vimeoUrl && (
                    <div className="p-6 md:p-8">
                        <VimeoPlayer url={lektion.vimeoUrl} />
                    </div>
                )}

                {/* Additional Video Materials (uploaded or linked by teacher) */}
                {videoMaterials.length > 0 && (
                    <div className="px-6 md:px-8 pb-4 space-y-4">
                        {videoMaterials.map((mat) => {
                            const isVimeo = mat.url.includes('vimeo.com');
                            return (
                                <div key={mat.id}>
                                    <h4 className="text-sm font-serif font-medium text-vastu-dark mb-2">{mat.title}</h4>
                                    {isVimeo ? (
                                        <VimeoPlayer url={mat.url} title={mat.title} />
                                    ) : (
                                        <video
                                            controls
                                            className="w-full rounded-xl bg-black"
                                            preload="metadata"
                                        >
                                            <source src={mat.url} />
                                            Dein Browser unterstützt dieses Video nicht.
                                        </video>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Description — below video */}
                {lektion.description && (
                    <div className="px-6 md:px-8 pb-4">
                        <div>
                            <div
                                className={`text-vastu-text font-body leading-relaxed max-w-2xl text-base prose prose-sm ${!descExpanded ? 'line-clamp-4' : ''}`}
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(lektion.description || '') }}
                            />
                            <button
                                onClick={() => setDescExpanded(!descExpanded)}
                                className="text-vastu-gold hover:text-vastu-dark text-sm font-sans mt-2 underline underline-offset-2 transition-colors"
                            >
                                {descExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen...'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Homework Checklist — interactive checkboxes */}
                {lektion.homeworkDescription && (() => {
                    // Use explicit checklist if provided, otherwise fall back to auto-parsing
                    const explicitItems = lektion.homeworkChecklist
                        ? lektion.homeworkChecklist.split('\n').map(l => l.trim()).filter(l => l.length > 0)
                        : [];
                    const hwItems = explicitItems.length > 0
                        ? explicitItems
                        : parseHomeworkItems(lektion.homeworkDescription);

                    const hasExplicitChecklist = explicitItems.length > 0;

                    if (hwItems.length > 0) {
                        const items = hwItems.map((text, i) => ({
                            id: i,
                            text,
                            checked: hwChecks[i] || false,
                        }));

                        const allDone = items.every(item => item.checked);

                        return (
                            <div className="px-6 md:px-8 pb-6">
                                <div className={`rounded-xl p-6 border transition-colors ${allDone ? 'bg-green-50/50 border-green-200' : 'bg-vastu-cream border-vastu-sand/30'}`} style={{ borderLeftWidth: '4px', borderLeftColor: allDone ? '#22c55e' : '#c4b7b3' }}>
                                    <h3 className="font-serif text-lg text-vastu-dark mb-4 flex items-center gap-2">
                                        <BookOpen size={18} className={allDone ? 'text-green-500' : 'text-vastu-gold'} />
                                        Hausaufgabe
                                        {allDone && <span className="text-xs font-sans bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Alles erledigt ✓</span>}
                                    </h3>
                                    {/* Show full description text when explicit checklist is used */}
                                    {hasExplicitChecklist && (
                                        <div className="text-vastu-text font-body prose prose-sm max-w-none mb-5" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lektion.homeworkDescription || '') }} />
                                    )}
                                    <div className="space-y-3">
                                        {items.map((item) => (
                                            <label
                                                key={item.id}
                                                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all group ${item.checked
                                                    ? 'bg-green-50 hover:bg-green-100/80'
                                                    : 'bg-white/60 hover:bg-white'
                                                    }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={item.checked}
                                                    onChange={() => toggleHwItem(item.id)}
                                                    className="mt-0.5 w-5 h-5 rounded border-2 border-vastu-sand text-vastu-gold focus:ring-vastu-gold/30 cursor-pointer accent-vastu-gold"
                                                />
                                                <span className={`font-body text-sm leading-relaxed transition-all ${item.checked ? 'text-vastu-text-light line-through' : 'text-vastu-dark'}`}>
                                                    {item.text}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        );
                    } else {
                        return (
                            <div className="px-6 md:px-8 pb-6">
                                <div className="bg-vastu-cream rounded-xl p-6 border border-vastu-sand/30" style={{ borderLeftWidth: '4px', borderLeftColor: '#c4b7b3' }}>
                                    <h3 className="font-serif text-lg text-vastu-dark mb-3 flex items-center gap-2">
                                        <BookOpen size={18} className="text-vastu-gold" />
                                        Hausaufgabe
                                    </h3>
                                    <div className="text-vastu-text font-body prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(lektion.homeworkDescription || '') }} />
                                </div>
                            </div>
                        );
                    }
                })()}

                {/* Mark as Complete — per lesson, with celebration animation */}
                <div className="px-6 md:px-8 pb-6">
                    <p className="text-xs font-sans text-vastu-text-light text-center mb-2">
                        Markiere diese einzelne Lektion als erledigt:
                    </p>
                    <button
                        onClick={() => handleToggleComplete(!lektion.isCompleted)}
                        className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl text-base font-sans font-medium transition-all ${justCompleted ? 'animate-celebrate' : ''
                            } ${lektion.isCompleted
                                ? 'bg-green-50 text-green-700 border-2 border-green-200 hover:bg-green-100'
                                : 'bg-vastu-dark text-white hover:bg-vastu-dark-deep shadow-lg shadow-vastu-dark/15'
                            }`}
                    >
                        {lektion.isCompleted ? (
                            <>
                                <CheckCircle2 size={22} />
                                ✓ Diese Lektion ist abgeschlossen
                            </>
                        ) : (
                            <>
                                <input type="checkbox" className="lesson-check" readOnly checked={false} />
                                Diese Lektion als erledigt markieren
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Inline Images */}
            {imageMaterials.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8 space-y-6">
                    {imageMaterials.map((mat) => (
                        <div key={mat.id} className="relative rounded-xl overflow-hidden shadow-sm border border-vastu-sand/20 bg-vastu-cream/30">
                            <img
                                src={mat.url}
                                alt={mat.title}
                                className="w-full h-auto object-contain"
                            />
                        </div>
                    ))}
                </div>
            )}


            {/* PDF Materials */}
            {pdfMaterials.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8">
                    <h3 className="font-serif text-xl text-vastu-dark mb-4 flex items-center gap-2">
                        <FileText className="text-vastu-gold" size={20} />
                        PDF Materialien
                    </h3>
                    <div className="grid gap-4 md:grid-cols-2">
                        {pdfMaterials.map((mat) => (
                            <a
                                key={mat.id}
                                href={mat.url}
                                target="_blank"
                                rel="noreferrer"
                                className="pdf-card flex items-center gap-4 p-4 bg-vastu-cream/60 rounded-xl border border-vastu-sand/30 hover:border-vastu-gold/30 group"
                            >
                                <div className="w-12 h-12 bg-red-50 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-red-100 transition-colors">
                                    <FileText className="text-red-500" size={24} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-serif font-medium text-vastu-dark truncate">{mat.title}</div>
                                    <div className="text-xs font-sans text-vastu-text-light uppercase mt-0.5">PDF</div>
                                </div>
                                <Download size={18} className="text-vastu-sand group-hover:text-vastu-dark transition-colors shrink-0" />
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Other Materials */}
            {otherMaterials.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8">
                    <h3 className="font-serif text-xl text-vastu-dark mb-4">Weitere Materialien</h3>
                    <div className="space-y-3">
                        {otherMaterials.map((mat) => (
                            <a
                                key={mat.id}
                                href={mat.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-3 p-3 rounded-lg hover:bg-vastu-cream transition-colors group"
                            >
                                <FileText size={18} className="text-vastu-text-light group-hover:text-vastu-gold" />
                                <span className="text-sm font-serif font-medium text-vastu-dark">{mat.title}</span>
                                <span className="text-[10px] font-sans text-vastu-text-light uppercase ml-auto">{mat.type}</span>
                            </a>
                        ))}
                    </div>
                </div>
            )}

            {/* Categorized Links */}
            {parsedLinks.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 p-6 md:p-8">
                    <h3 className="font-serif text-xl text-vastu-dark mb-6 flex items-center gap-2">
                        <ExternalLink className="text-vastu-gold" size={20} />
                        Nützliche Links
                    </h3>

                    <div className="space-y-8">
                        {Object.entries(linksByCategory).map(([category, links]) => (
                            <div key={category}>
                                <h4 className="font-serif font-medium text-vastu-dark mb-4 border-b border-vastu-sand/30 pb-2">
                                    {category}
                                </h4>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    {(links as ParsedLink[]).map((link) => (
                                        <a
                                            key={link.id}
                                            href={link.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="group flex flex-col p-4 rounded-xl border border-vastu-sand/40 bg-vastu-cream/30 hover:bg-white hover:border-vastu-gold/30 hover:shadow-md transition-all"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-vastu-dark/8 flex items-center justify-center shrink-0 group-hover:bg-vastu-gold/15 transition-colors">
                                                    <ExternalLink size={14} className="text-vastu-dark/60 group-hover:text-vastu-gold transition-colors" />
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

            {/* Next Lesson / Module Button */}
            {nextNav ? (
                <button
                    onClick={() => navigate(nextNav.path)}
                    className="w-full flex items-center justify-between p-5 bg-vastu-dark text-white rounded-2xl hover:bg-vastu-dark-deep shadow-lg shadow-vastu-dark/10 transition-all group"
                >
                    <div className="text-left">
                        <div className="text-xs font-sans text-white/60 uppercase tracking-wider mb-1">
                            {nextNav.type === 'lesson' ? 'Nächste Lektion' : 'Nächstes Modul'}
                        </div>
                        <div className="font-serif text-lg">{nextNav.label}</div>
                    </div>
                    <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                </button>
            ) : (
                <button
                    onClick={() => navigate('/student')}
                    className="w-full flex items-center justify-center gap-3 p-5 bg-vastu-cream text-vastu-dark rounded-2xl hover:bg-vastu-sand/30 border border-vastu-sand/50 transition-all"
                >
                    <Home size={20} />
                    <span className="font-serif text-lg">Zurück zur Kursübersicht</span>
                </button>
            )}
        </div>
    );
}
