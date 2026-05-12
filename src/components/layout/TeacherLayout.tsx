import { Outlet, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { LogOut, Layout, Users, Loader2, FileText, Menu, X, Settings, BarChart3, Heart } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export default function TeacherLayout() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, role, loading, signOut, isDemo } = useAuth();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-vastu-dark" size={40} /></div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (role !== 'teacher') {
        return <Navigate to="/student" replace />;
    }

    const navItems = [
        { path: '/teacher', label: 'Kurs', icon: Layout },
        { path: '/teacher/students', label: 'Teilnehmer', icon: Users },
        { path: '/teacher/wellen', label: 'Wellen', icon: Users },
        { path: '/teacher/quiz-results', label: 'Quiz-Ergebnisse', icon: BarChart3 },
        { path: '/teacher/library', label: 'Bibliothek', icon: FileText },
        { path: '/teacher/feedback', label: 'Feedback', icon: Heart },
        { path: '/teacher/settings', label: 'Einstellungen', icon: Settings },
    ];

    const handleSignOut = () => {
        signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Desktop Sidebar — light mauve c4b7b3 with dark text */}
            <aside className="hidden md:flex w-64 bg-sidebar-gradient flex-col fixed h-full z-20">
                <div className="p-6 border-b border-vastu-dark/10">
                    <Link to="/teacher" className="flex items-center gap-3 group">
                        <img src="/logo.png" alt="Academy" className="w-12 h-12 object-contain transition-all duration-300 group-hover:scale-105 group-hover:drop-shadow-lg drop-shadow-md" />
                        <div className="flex flex-col">
                            <span className="font-serif text-[17px] tracking-[0.10em] text-vastu-dark leading-none">GANZHEITLICHE VEDISCHE ASTROLOGIE</span>
                            <span className="font-script text-vastu-dark/70 text-sm mt-1">Admin</span>
                        </div>
                    </Link>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={cn(
                                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                location.pathname === item.path
                                    ? "bg-white/40 text-vastu-dark font-semibold"
                                    : "text-vastu-dark/80 hover:text-vastu-dark hover:bg-white/20"
                            )}
                        >
                            <item.icon size={18} />
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-vastu-dark/10">
                    <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-vastu-dark/70 hover:text-vastu-dark hover:bg-white/20 transition-colors"
                    >
                        <LogOut size={18} />
                        Abmelden
                    </button>
                </div>
            </aside>

            {/* Mobile Header */}
            <header className="md:hidden bg-sidebar-gradient fixed top-0 w-full z-50 border-b border-gray-200 h-16 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Academy" className="w-10 h-10 object-contain drop-shadow-sm" />
                    <div className="flex flex-col">
                        <span className="font-serif text-[15px] tracking-[0.10em] text-vastu-dark leading-none">GANZHEITLICHE VEDISCHE ASTROLOGIE</span>
                        <span className="font-script text-vastu-dark/70 text-xs">Admin</span>
                    </div>
                </div>
                <button
                    className="text-vastu-dark p-1"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </header>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="bg-sidebar-gradient w-64 h-full shadow-2xl p-4 pt-18 overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <nav className="space-y-2 mt-14">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                        location.pathname === item.path
                                            ? "bg-white/40 text-vastu-dark font-semibold"
                                            : "text-vastu-dark/60 hover:text-vastu-dark hover:bg-white/20"
                                    )}
                                >
                                    <item.icon size={18} />
                                    {item.label}
                                </Link>
                            ))}
                        </nav>

                        <div className="mt-6 pt-4 border-t border-vastu-dark/10">
                            {isDemo && (
                                <button
                                    onClick={() => { navigate('/login'); setIsMobileMenuOpen(false); }}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-vastu-dark/50 hover:text-vastu-dark hover:bg-white/20 transition-colors mb-2"
                                >
                                    <Users size={18} />
                                    Rolle wechseln
                                </button>
                            )}
                            <button
                                onClick={handleSignOut}
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-vastu-dark/70 hover:text-vastu-dark hover:bg-white/20 transition-colors"
                            >
                                <LogOut size={18} />
                                Abmelden
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="md:ml-64 min-h-screen pt-14 md:pt-0">
                <div className="p-4 md:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}
