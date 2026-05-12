import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Menu, X, Loader2, BookOpen, Library, Lock, ChevronDown, ChevronRight, Home, Smartphone, Heart } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { useModules } from '../../hooks/useCourse';
import { supabase } from '../../lib/supabase';
import DisclaimerModal from '../DisclaimerModal';
import AnnouncementBanner from '../AnnouncementBanner';
import UpcomingEvents from '../UpcomingEvents';

const NavItem = ({ to, icon: Icon, label, isActive, onClick }: { to: string; icon: any; label: string; isActive: boolean; onClick?: () => void }) => (
    <Link
        to={to}
        onClick={onClick}
        className={cn(
            "flex items-center gap-3 px-4 py-3 rounded-xl transition-all group",
            isActive
                ? "bg-vastu-dark/12 text-vastu-dark font-medium shadow-sm"
                : "text-vastu-dark/80 hover:bg-vastu-dark/5 hover:text-vastu-dark"
        )}
    >
        <Icon size={20} className={cn("transition-colors", isActive ? "text-vastu-dark" : "text-vastu-dark/70 group-hover:text-vastu-dark")} />
        <span className="font-sans text-sm">{label}</span>
    </Link>
);

export default function StudentLayout() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isCourseExpanded, setIsCourseExpanded] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, signOut, loading: authLoading, role } = useAuth();
    const { modules, loading: modulesLoading } = useModules();
    const displayName = user?.user_metadata?.full_name || user?.email || 'Teilnehmer';
    const [disclaimerAccepted, setDisclaimerAccepted] = useState<boolean | null>(null);

    useEffect(() => {
        if (!user) return;

        // Check localStorage first as fast path
        if (localStorage.getItem(`disclaimer-accepted:${user.id}`) === 'true') {
            setDisclaimerAccepted(true);
            return;
        }

        supabase
            .from('profiles')
            .select('disclaimer_accepted_at')
            .eq('id', user.id)
            .single()
            .then(({ data, error }) => {
                if (error) {
                    // Column doesn't exist yet — show disclaimer
                    setDisclaimerAccepted(false);
                    return;
                }
                setDisclaimerAccepted(!!data?.disclaimer_accepted_at);
            });
    }, [user]);

    const searchParams = new URLSearchParams(location.search);
    const activeModuleId = searchParams.get('module');

    if (authLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-vastu-gold" size={40} /></div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (role === 'teacher') {
        return <Navigate to="/teacher" replace />;
    }

    return (
        <div className="min-h-screen bg-vastu-light md:bg-white">
            {/* Desktop Sidebar — Light c4b7b3 gradient with dark text */}
            <aside
                className="hidden md:flex w-72 bg-sidebar-gradient flex-col z-50 overflow-hidden custom-scrollbar lotus-watermark"
                style={{ position: 'fixed', left: 0, top: 0, bottom: 0 }}
            >
                {/* Brand Header */}
                <div className="p-6 border-b border-vastu-dark/10">
                    <Link to="/student/welcome" className="flex items-center gap-4 group">
                        {/* Logo */}
                        <img src="/logo.png" alt="Academy" className="w-14 h-14 object-contain transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-lg drop-shadow-md" />
                        <div className="flex flex-col">
                            <span className="font-serif text-base tracking-[0.20em] text-vastu-dark leading-none">ASTROLOGIE</span>
                            <span className="font-script text-vastu-dark/70 text-sm mt-1">Ausbildung</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto min-h-0 custom-scrollbar">
                    {/* Back to Welcome */}
                    <Link to="/student/welcome" className="flex items-center gap-2 px-4 py-2 text-vastu-dark/70 hover:text-vastu-dark text-xs font-sans transition-colors mb-2">
                        <Home size={14} />
                        <span>← Startseite</span>
                    </Link>

                    {/* Module Navigation */}
                    <div>
                        <button
                            onClick={() => setIsCourseExpanded(!isCourseExpanded)}
                            className="w-full flex items-center justify-between px-4 py-3 text-vastu-dark/60 hover:text-vastu-dark transition-colors"
                        >
                            <div className="flex items-center gap-3">
                                <BookOpen size={20} className="text-vastu-dark/70" />
                                <span className="font-sans text-sm font-medium">Mein Kurs</span>
                            </div>
                            {isCourseExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>

                        {isCourseExpanded && (
                            <div className="mt-1 ml-4 space-y-0.5 pl-4 border-l border-vastu-dark/10">
                                {modulesLoading ? (
                                    <div className="px-4 py-2 text-xs text-vastu-dark/50 font-sans">Laden...</div>
                                ) : (
                                    modules.map((mod) => {
                                        const isModActive = (activeModuleId === mod.id && location.pathname === '/student') ||
                                            location.pathname.includes(`/module/${mod.id}`);
                                        return (
                                            <button
                                                key={mod.id}
                                                onClick={() => {
                                                    if (!mod.isLocked) {
                                                        navigate(`/student?module=${mod.id}`);
                                                    }
                                                }}
                                                disabled={mod.isLocked}
                                                className={cn(
                                                    "w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-all text-left group",
                                                    isModActive
                                                        ? "bg-white/40 text-vastu-dark font-medium border-l-2 border-vastu-dark -ml-[1px]"
                                                        : mod.isLocked
                                                            ? "text-vastu-dark/25 cursor-not-allowed"
                                                            : "text-vastu-dark/55 hover:text-vastu-dark hover:bg-white/20"
                                                )}
                                            >
                                                <div className="flex items-start gap-3 flex-1 min-w-0">
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-colors mt-1.5",
                                                        isModActive ? "bg-vastu-dark" : mod.isLocked ? "bg-vastu-dark/15" : "bg-vastu-dark/25"
                                                    )} />
                                                    <span className="whitespace-normal leading-tight break-words font-sans">{mod.title}</span>
                                                </div>
                                                {mod.isLocked && <Lock size={12} className="opacity-40" />}
                                            </button>
                                        );
                                    })
                                )}
                                {/* Feedback as virtual module at end of course list */}
                                {!modulesLoading && (
                                    <button
                                        onClick={() => navigate('/student/feedback')}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-all text-left group mt-1",
                                            location.pathname.includes('/feedback')
                                                ? "bg-white/40 text-vastu-dark font-medium border-l-2 border-vastu-gold -ml-[1px]"
                                                : "text-vastu-dark/55 hover:text-vastu-dark hover:bg-white/20"
                                        )}
                                    >
                                        <div className="flex items-start gap-3 flex-1 min-w-0">
                                            <Heart size={12} className="flex-shrink-0 text-vastu-gold mt-1" />
                                            <span className="whitespace-normal leading-tight break-words font-sans">Feedback</span>
                                        </div>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <NavItem
                        to="/student/library"
                        icon={Library}
                        label="Bibliothek"
                        isActive={location.pathname.includes('/library')}
                    />

                    <NavItem
                        to="/student/install"
                        icon={Smartphone}
                        label="App installieren"
                        isActive={location.pathname.includes('/install')}
                    />
                </nav>

                {/* User section */}
                <div className="p-4 border-t border-vastu-dark/10">
                    <Link to="/student/profile" className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/20 transition-colors group mb-2">
                        <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center text-vastu-dark/80 group-hover:text-vastu-dark transition-colors border border-vastu-dark/10">
                            <UserIcon size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-sans font-medium text-vastu-dark/90 truncate">{displayName}</div>
                            <div className="text-xs font-sans text-vastu-dark/60">Teilnehmer</div>
                        </div>
                    </Link>
                    <button
                        onClick={() => signOut()}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm font-sans text-vastu-dark/70 hover:text-vastu-dark transition-colors"
                    >
                        <LogOut size={16} />
                        <span>Abmelden</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden bg-sidebar-gradient fixed top-0 w-full z-50 shadow-md h-16 flex items-center justify-between px-4">
                {/* Brand */}
                <Link to="/student/welcome" className="flex items-center gap-3">
                    <img src="/logo.png" alt="Academy" className="w-11 h-11 object-contain drop-shadow-sm" />
                    <div className="flex flex-col">
                        <span className="font-serif text-sm tracking-[0.20em] text-vastu-dark leading-none">ASTROLOGIE</span>
                        <span className="font-script text-vastu-dark/70 text-xs">Ausbildung</span>
                    </div>
                </Link>
                <button
                    className="text-vastu-dark"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="bg-sidebar-gradient w-72 h-full shadow-2xl flex flex-col pt-16 lotus-watermark" onClick={e => e.stopPropagation()}>
                        <div className="flex-1 overflow-y-auto w-full custom-scrollbar p-4 pb-24">
                            <nav className="space-y-2 flex flex-col">
                                <Link to="/student/welcome" onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center gap-2 px-4 py-2 text-vastu-dark/70 hover:text-vastu-dark text-xs font-sans transition-colors mb-2">
                                    <Home size={14} />
                                    <span>← Startseite</span>
                                </Link>

                                <div className="mb-4">
                                    <div className="text-xs font-sans uppercase tracking-widest text-vastu-dark/60 mb-2 px-4">Mein Kurs</div>
                                    {modules.map((mod) => (
                                        <button
                                            key={mod.id}
                                            onClick={() => {
                                                if (!mod.isLocked) {
                                                    navigate(`/student?module=${mod.id}`);
                                                    setIsMobileMenuOpen(false);
                                                }
                                            }}
                                            disabled={mod.isLocked}
                                            className={cn(
                                                "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-all text-left font-sans",
                                                activeModuleId === mod.id && location.pathname === '/student'
                                                    ? "bg-white/40 text-vastu-dark font-medium"
                                                    : mod.isLocked
                                                        ? "text-vastu-dark/25 cursor-not-allowed"
                                                        : "text-vastu-dark/60"
                                            )}
                                        >
                                            <span className="whitespace-normal leading-tight">{mod.title}</span>
                                            {mod.isLocked && <Lock size={12} />}
                                        </button>
                                    ))}
                                    {/* Feedback as virtual module */}
                                    <button
                                        onClick={() => {
                                            navigate('/student/feedback');
                                            setIsMobileMenuOpen(false);
                                        }}
                                        className={cn(
                                            "w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm transition-all text-left font-sans",
                                            location.pathname.includes('/feedback')
                                                ? "bg-white/40 text-vastu-dark font-medium"
                                                : "text-vastu-dark/60"
                                        )}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Heart size={14} className="text-vastu-gold" />
                                            <span>Feedback</span>
                                        </div>
                                    </button>
                                </div>

                                <NavItem
                                    to="/student/library"
                                    icon={Library}
                                    label="Bibliothek"
                                    isActive={location.pathname.includes('/library')}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                />
                                <NavItem
                                    to="/student/install"
                                    icon={Smartphone}
                                    label="App installieren"
                                    isActive={location.pathname.includes('/install')}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                />
                            </nav>
                        </div>

                        {/* Pinned User section for Mobile */}
                        <div className="p-4 border-t border-vastu-dark/10 bg-sidebar-gradient mt-auto">
                            <Link to="/student/profile" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/20 transition-colors group mb-2">
                                <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center text-vastu-dark/80 group-hover:text-vastu-dark transition-colors border border-vastu-dark/10">
                                    <UserIcon size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-sans font-medium text-vastu-dark/90 truncate">{displayName}</div>
                                    <div className="text-xs font-sans text-vastu-dark/60">Teilnehmer</div>
                                </div>
                            </Link>
                            <button
                                onClick={() => { signOut(); setIsMobileMenuOpen(false); }}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm font-sans text-vastu-dark/70 hover:text-vastu-dark transition-colors"
                            >
                                <LogOut size={16} />
                                <span>Abmelden</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 md:ml-72 min-h-screen pt-16 md:pt-0">
                <div className="px-4 py-4 md:px-6 md:py-6">
                    <AnnouncementBanner />
                    <UpcomingEvents />
                    <Outlet />
                </div>
            </main>

            {/* Disclaimer Modal */}
            {disclaimerAccepted === false && user && (
                <DisclaimerModal
                    userId={user.id}
                    onAccepted={() => setDisclaimerAccepted(true)}
                />
            )}
        </div>
    );
}
