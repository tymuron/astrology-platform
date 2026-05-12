import { FileText, Download, Loader2, BookOpen, Presentation, Gift, BookMarked, ArrowLeft, ExternalLink, Lock, AlertTriangle } from 'lucide-react';
import { useEffect, useState, MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { LibraryItem, LibraryCategory } from '../../lib/types';
import { navigateBackOr } from '../../lib/utils';
import { resolveLibraryFileUrl, isLibraryStorageUrl } from '../../lib/uploadLibraryFile';

const CATEGORIES: { key: LibraryCategory | 'all'; label: string; icon: any }[] = [
    { key: 'all', label: 'Alle', icon: BookOpen },
    { key: 'slides', label: 'Folien', icon: Presentation },
    { key: 'bonus', label: 'Bonus', icon: Gift },
    { key: 'guide', label: 'Leitfaden', icon: BookMarked },
    { key: 'links', label: 'Links', icon: ExternalLink },
];

export default function Library() {
    const [items, setItems] = useState<LibraryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategory, setActiveCategory] = useState<string>('all');
    const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());
    const [openingId, setOpeningId] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleFileOpen = async (e: MouseEvent<HTMLAnchorElement>, item: LibraryItem) => {
        if (!isLibraryStorageUrl(item.file_url)) return;
        e.preventDefault();
        if (openingId === item.id) return;
        setOpeningId(item.id);
        try {
            const res = await resolveLibraryFileUrl(item.file_url);
            if ('error' in res) {
                setBrokenIds(prev => new Set(prev).add(item.id));
                return;
            }
            window.open(res.url, '_blank', 'noopener,noreferrer');
        } finally {
            setOpeningId(null);
        }
    };

    useEffect(() => {
        async function fetchLibrary() {
            try {
                if (!import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder')) {
                    setItems([
                        {
                            id: 'lib1',
                            title: 'Alle Slides — Komplett',
                            category: 'slides',
                            file_url: '#',
                            description: 'Vollständige Sammlung aller Präsentationsfolien der Ausbildung',
                            created_at: new Date().toISOString(),
                            available_from: '2026-04-15T00:00:00Z',
                        },
                        {
                            id: 'lib2',
                            title: 'Vastu Reinigung – Leitfaden',
                            category: 'guide',
                            file_url: '#',
                            description: 'Schritt-für-Schritt-Anleitung zur energetischen Reinigung',
                            created_at: new Date().toISOString(),
                        },
                        {
                            id: 'lib3',
                            title: 'Bonus: Haustiere, Pflanzen & Tiere',
                            category: 'bonus',
                            file_url: '#',
                            description: 'Zusätzliches Material rund um Haustiere, Pflanzen und Tiere im Vastu',
                            created_at: new Date().toISOString(),
                        },
                        {
                            id: 'lib4',
                            title: 'Bonus: Grundstück [bei Feedback]',
                            category: 'bonus',
                            file_url: '#',
                            description: 'Grundstücksauswahl und -bewertung nach Vastu-Prinzipien',
                            created_at: new Date().toISOString(),
                        },
                    ]);
                    setLoading(false);
                    return;
                }

                const { data, error } = await supabase
                    .from('library_items')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setItems(data || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }

        fetchLibrary();
    }, []);

    if (loading) {
        return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-gold" size={40} /></div>;
    }

    const getCategoryColor = (cat: string) => {
        switch (cat) {
            case 'slides': return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'bonus': return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'guide': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'template': return 'bg-green-50 text-green-600 border-green-100';
            case 'links': return 'bg-teal-50 text-teal-600 border-teal-100';
            default: return 'bg-gray-50 text-gray-600 border-gray-100';
        }
    };

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'slides': return <Presentation size={20} className="text-purple-500" />;
            case 'bonus': return <Gift size={20} className="text-amber-500" />;
            case 'guide': return <BookMarked size={20} className="text-blue-500" />;
            case 'links': return <ExternalLink size={20} className="text-teal-500" />;
            default: return <FileText size={20} className="text-gray-500" />;
        }
    };

    const masterFile = items.find(i => i.is_master_file);
    const regularItems = items.filter(i => !i.is_master_file);

    const filteredItems = activeCategory === 'all'
        ? regularItems
        : regularItems.filter(i => i.category === activeCategory);

    return (
        <div className="animate-fade-in space-y-4">
            {/* Back Navigation */}
            <button
                onClick={() => navigateBackOr(navigate, '/student')}
                className="inline-flex items-center gap-2 text-vastu-text-light hover:text-vastu-dark transition-colors group text-sm font-sans"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span>Zurück</span>
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 overflow-hidden">
                {/* Header */}
                <div className="bg-vastu-accent grain-overlay p-8 md:p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-vastu-dark opacity-5 rounded-full blur-[80px] translate-x-1/3 -translate-y-1/3" />
                    <div className="relative z-10">
                        <h1 className="text-3xl md:text-4xl font-serif mb-2 flex items-center gap-3 text-vastu-dark">
                            <BookOpen size={28} />
                            Bibliothek
                        </h1>
                        <p className="text-vastu-dark/50 font-body text-lg">Alle Materialien und Unterlagen zum Herunterladen</p>
                    </div>
                </div>
            </div>

            {/* Master File Hero */}
            {masterFile && (
                <div className="mx-6 md:mx-8 -mt-6 relative z-20">
                    <div className="bg-gradient-to-r from-vastu-gold to-yellow-600 rounded-xl p-1 shadow-lg transform transition-transform hover:scale-[1.01]">
                        <div className="bg-white rounded-lg p-6 flex flex-col md:flex-row items-center gap-6">
                            <div className="w-16 h-16 bg-vastu-gold/10 rounded-full flex items-center justify-center shrink-0">
                                <BookOpen className="text-vastu-gold w-8 h-8" />
                            </div>
                            <div className="flex-1 text-center md:text-left">
                                <div className="text-xs font-sans font-bold text-vastu-gold uppercase tracking-wider mb-1">Master File</div>
                                <h3 className="font-serif text-xl md:text-2xl text-vastu-dark mb-2">{masterFile.title}</h3>
                                <p className="text-vastu-text-light text-sm max-w-xl">{masterFile.description || 'Das vollständige Kursmaterial zum Herunterladen.'}</p>
                            </div>
                            {masterFile.available_from && new Date(masterFile.available_from) > new Date() ? (
                                <div className="bg-vastu-cream/80 text-vastu-text-light px-6 py-3 rounded-lg font-medium flex items-center gap-2 shadow-sm whitespace-nowrap cursor-not-allowed">
                                    <Lock size={18} />
                                    <span className="text-sm">Ab {new Date(masterFile.available_from).toLocaleDateString('de-DE')}</span>
                                </div>
                            ) : brokenIds.has(masterFile.id) ? (
                                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-3 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap">
                                    <AlertTriangle size={18} />
                                    <span>Datei momentan nicht verfügbar</span>
                                </div>
                            ) : (
                                <a
                                    href={masterFile.file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={e => handleFileOpen(e, masterFile)}
                                    className="bg-vastu-dark text-white px-8 py-3 rounded-lg font-medium flex items-center gap-2 hover:bg-vastu-dark/90 transition-colors shadow-md whitespace-nowrap"
                                >
                                    <Download size={20} />
                                    <span>Herunterladen</span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Resource Grid Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-vastu-sand/50 overflow-hidden">
                {/* Category Tabs */}
                <div className="px-6 md:px-8 pt-6 pb-2 border-b border-vastu-sand/20">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => setActiveCategory(cat.key)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-sans font-medium transition-all whitespace-nowrap ${activeCategory === cat.key
                                    ? 'bg-vastu-dark text-white shadow-md'
                                    : 'bg-vastu-cream text-vastu-text-light hover:bg-vastu-sand/50'
                                    }`}
                            >
                                <cat.icon size={16} />
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Items */}
                <div className="p-6 md:p-8 pt-6">
                    {filteredItems.length === 0 ? (
                        <div className="text-center py-12 text-vastu-text-light">
                            <BookOpen size={48} className="mx-auto mb-4 opacity-30" />
                            <p className="text-lg font-body">Noch keine Materialien verfügbar</p>
                            <p className="text-sm font-sans mt-1">Die Bibliothek wird im Laufe des Kurses gefüllt.</p>
                        </div>
                    ) : activeCategory === 'links' ? (
                        // Grouped links view
                        <div className="space-y-8 animate-stagger">
                            {Object.entries(
                                filteredItems.reduce((acc: Record<string, typeof filteredItems>, item) => {
                                    const group = item.description || 'Allgemein';
                                    if (!acc[group]) acc[group] = [];
                                    acc[group].push(item);
                                    return acc;
                                }, {})
                            ).map(([groupName, groupItems]) => (
                                <div key={groupName}>
                                    <h4 className="font-serif text-lg text-vastu-dark mb-4 border-b border-vastu-sand/30 pb-2">
                                        {groupName}
                                    </h4>
                                    <div className="grid gap-4 md:grid-cols-2">
                                        {groupItems.map((item) => (
                                            <a
                                                key={item.id}
                                                href={item.file_url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="flex items-center gap-3 p-4 bg-vastu-cream/30 rounded-xl border border-vastu-sand/30 hover:border-vastu-gold/30 hover:shadow-md transition-all group"
                                            >
                                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-vastu-dark/5 group-hover:bg-vastu-gold/15 transition-colors">
                                                    <ExternalLink size={18} className="text-vastu-dark/50 group-hover:text-vastu-gold transition-colors" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-serif font-medium text-vastu-dark group-hover:text-vastu-gold transition-colors truncate">
                                                        {item.title}
                                                    </div>
                                                </div>
                                                <ExternalLink size={16} className="text-vastu-sand group-hover:text-vastu-dark transition-colors shrink-0" />
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        // Standard grid view for PDFs/Materials
                        <div className="grid gap-4 md:grid-cols-2 animate-stagger">
                            {filteredItems.map((item) => {
                                const isLocked = item.available_from && new Date(item.available_from) > new Date();

                                const isBroken = brokenIds.has(item.id);

                                return isLocked ? (
                                    <div
                                        key={item.id}
                                        className="pdf-card flex items-start gap-4 p-5 bg-vastu-cream/40 rounded-xl border border-vastu-sand/30 opacity-70 group cursor-not-allowed"
                                    >
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-white border border-vastu-sand/30">
                                            <Lock size={18} className="text-vastu-text-light/50" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-serif font-medium text-vastu-dark mb-1">{item.title}</div>
                                            {item.description && (
                                                <p className="text-sm font-body text-vastu-text-light line-clamp-2 mb-2">{item.description}</p>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-sans font-medium uppercase border ${getCategoryColor(item.category)}`}>
                                                    {CATEGORIES.find(c => c.key === item.category)?.label || item.category}
                                                </span>
                                                <div className="text-xs font-sans text-vastu-text-light font-medium flex items-center gap-1 bg-white px-2 py-0.5 rounded-md shadow-sm border border-vastu-sand/40">
                                                    Ab {new Date(item.available_from!).toLocaleDateString('de-DE')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : isBroken ? (
                                    <div
                                        key={item.id}
                                        className="pdf-card flex items-start gap-4 p-5 bg-red-50 rounded-xl border border-red-200"
                                    >
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-white border border-red-200">
                                            <AlertTriangle size={18} className="text-red-500" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-serif font-medium text-vastu-dark mb-1">{item.title}</div>
                                            <p className="text-sm font-body text-red-700">
                                                Diese Datei ist momentan nicht verfügbar. Wir arbeiten daran — bitte später erneut versuchen.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <a
                                        key={item.id}
                                        href={item.file_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        onClick={e => handleFileOpen(e, item)}
                                        className="pdf-card flex items-start gap-4 p-5 bg-vastu-cream/40 rounded-xl border border-vastu-sand/30 hover:border-vastu-gold/30 hover:bg-vastu-cream/70 group transition-all"
                                    >
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-white border border-vastu-sand/30 group-hover:shadow-sm transition-all">
                                            {getCategoryIcon(item.category)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-serif font-medium text-vastu-dark mb-1 group-hover:text-vastu-gold transition-colors">{item.title}</div>
                                            {item.description && (
                                                <p className="text-sm font-body text-vastu-text-light line-clamp-2 mb-2">{item.description}</p>
                                            )}
                                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-sans font-medium uppercase border ${getCategoryColor(item.category)}`}>
                                                {CATEGORIES.find(c => c.key === item.category)?.label || item.category}
                                            </span>
                                        </div>
                                        <Download size={18} className="text-vastu-sand group-hover:text-vastu-dark transition-colors shrink-0 mt-1" />
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
