import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, FileText, Download, ChevronRight, Loader2, ExternalLink } from 'lucide-react';
import { useModules } from '../../hooks/useCourse';
import { useState } from 'react';
import { Module, Lektion, Material } from '../../lib/types';
import { cn, parseCategorizedLink } from '../../lib/utils';

export default function WeekView() {
    const { weekId } = useParams();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'days' | 'materials' | 'links'>('days');
    const { modules, loading } = useModules();

    const currentModule = modules.find((m: Module) => m.id === weekId);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-vastu-gold" size={40} /></div>;
    if (!currentModule) return <div>Modul nicht gefunden</div>;

    const materials = currentModule.moduleMaterials?.filter(m => m.type !== 'link') || [];
    const linkMaterials = currentModule.moduleMaterials?.filter(m => m.type === 'link') || [];
    const hasLinks = linkMaterials.length > 0;

    // Parse and group links
    const parsedLinks = linkMaterials.map(m => {
        const parsed = parseCategorizedLink(m.title);
        return { ...parsed, url: m.url };
    });
    const linksByCategory = parsedLinks.reduce((acc, link) => {
        if (!acc[link.category]) acc[link.category] = [];
        acc[link.category].push(link);
        return acc;
    }, {} as Record<string, typeof parsedLinks>);

    return (
        <div className="max-w-5xl mx-auto animate-fade-in">
            <button
                onClick={() => navigate('/student')}
                className="flex items-center gap-2 text-vastu-text-light hover:text-vastu-dark mb-6 transition-colors"
            >
                <ArrowLeft size={18} />
                <span>Zurück zum Kurs</span>
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="bg-vastu-dark p-8 md:p-10 text-vastu-light relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-vastu-gold opacity-10 rounded-full blur-[80px] translate-x-1/2 -translate-y-1/2" />

                    <h1 className="text-3xl md:text-4xl font-serif mb-4 relative z-10">{currentModule.title}</h1>
                    <p className="text-vastu-light/70 max-w-2xl font-light leading-relaxed relative z-10">
                        {currentModule.description ? currentModule.description.replace(/<[^>]+>/g, '') : ''}
                    </p>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100">
                    <button
                        onClick={() => setActiveTab('days')}
                        className={cn(
                            "px-8 py-4 text-sm font-medium transition-colors relative",
                            activeTab === 'days' ? "text-vastu-dark" : "text-vastu-text-light hover:text-vastu-dark"
                        )}
                    >
                        Lektionen
                        {activeTab === 'days' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-vastu-gold" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('materials')}
                        className={cn(
                            "px-8 py-4 text-sm font-medium transition-colors relative flex items-center gap-2",
                            activeTab === 'materials' ? "text-vastu-dark" : "text-vastu-text-light hover:text-vastu-dark"
                        )}
                    >
                        Materialien
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                            {materials.length}
                        </span>
                        {activeTab === 'materials' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-vastu-gold" />
                        )}
                    </button>
                    {hasLinks && (
                        <button
                            onClick={() => setActiveTab('links')}
                            className={cn(
                                "px-8 py-4 text-sm font-medium transition-colors relative flex items-center gap-2",
                                activeTab === 'links' ? "text-vastu-dark" : "text-vastu-text-light hover:text-vastu-dark"
                            )}
                        >
                            Links
                            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                                {linkMaterials.length}
                            </span>
                            {activeTab === 'links' && (
                                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-vastu-gold" />
                            )}
                        </button>
                    )}
                </div>

                <div className="p-6 md:p-8 min-h-[400px]">
                    {activeTab === 'days' ? (
                        <div className="space-y-4">
                            {currentModule.lektionen.map((lektion: Lektion) => (
                                <Link
                                    key={lektion.id}
                                    to={`/student/week/${currentModule.id}/day/${lektion.id}`}
                                    className="flex items-center justify-between p-4 rounded-xl border border-gray-100 hover:border-vastu-gold/50 hover:bg-vastu-light/30 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-vastu-light flex items-center justify-center text-vastu-gold group-hover:bg-vastu-gold group-hover:text-vastu-dark transition-colors">
                                            <Play size={18} fill="currentColor" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium text-lg text-vastu-dark">{lektion.title}</h3>
                                                {lektion.date && (
                                                    <span className="text-xs font-medium text-vastu-gold bg-vastu-gold/10 px-2 py-0.5 rounded-full">
                                                        {new Date(lektion.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-vastu-text-light line-clamp-1">
                                                {lektion.description ? lektion.description.replace(/<[^>]+>/g, '') : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight size={20} className="text-gray-300 group-hover:text-vastu-gold transition-colors" />
                                </Link>
                            ))}
                        </div>
                    ) : activeTab === 'materials' ? (
                        <div className="grid md:grid-cols-2 gap-4">
                            {materials.length > 0 ? (
                                materials.map((material: Material) => (
                                    <div key={material.id} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50/50">
                                        <div className="w-10 h-10 rounded-lg bg-white shadow-sm flex items-center justify-center text-vastu-dark shrink-0">
                                            <FileText size={20} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-medium text-vastu-dark truncate">{material.title}</h4>
                                            <p className="text-xs text-vastu-text-light uppercase tracking-wider mb-2">{material.type}</p>
                                            <a
                                                href={material.url}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="text-sm text-vastu-gold hover:text-vastu-dark font-medium flex items-center gap-1 transition-colors"
                                            >
                                                <Download size={14} />
                                                Herunterladen
                                            </a>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-12 text-vastu-text-light">
                                    Keine zusätzlichen Materialien für dieses Modul.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8 animate-stagger">
                            {Object.entries(linksByCategory).map(([category, links]) => (
                                <div key={category} className="space-y-4">
                                    <h4 className="font-serif text-lg text-vastu-dark flex items-center gap-2">
                                        <div className="w-8 h-px bg-vastu-gold/30"></div>
                                        {category}
                                    </h4>
                                    <div className="grid md:grid-cols-2 gap-4">
                                        {links.map((link, idx) => (
                                            <a
                                                key={idx}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 bg-white hover:border-vastu-gold/40 hover:shadow-md transition-all group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-vastu-light flex items-center justify-center text-vastu-gold group-hover:bg-vastu-gold group-hover:text-white transition-colors shrink-0">
                                                    <ExternalLink size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0 flex flex-col justify-center min-h-[40px]">
                                                    <h5 className="font-medium text-vastu-dark group-hover:text-vastu-gold transition-colors line-clamp-2 leading-tight">
                                                        {link.title}
                                                    </h5>
                                                    <span className="text-xs text-vastu-text-light mt-1 w-full truncate inline-block">
                                                        {new URL(link.url).hostname.replace('www.', '')}
                                                    </span>
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
