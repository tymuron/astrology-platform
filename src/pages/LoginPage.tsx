import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, Eye, EyeOff, GraduationCap, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();
    const { isDemo, switchDemoRole, role, user, loading: authLoading } = useAuth();

    // Redirect automatically if user and role are established
    useEffect(() => {
        if (user && role && !loading && !authLoading) {
            if (role === 'teacher') {
                navigate('/teacher');
            } else {
                navigate('/student/welcome');
            }
        }
    }, [user, role, loading, authLoading, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isDemo) {
                switchDemoRole('student');
                navigate('/student/welcome');
                return;
            }

            const { error } = await supabase.auth.signInWithPassword({ email, password });
            setLoading(false);

            if (error) {
                if (error.message.includes('Invalid login')) {
                    setError('Ungültige E-Mail oder Passwort');
                } else {
                    setError(error.message);
                }
                setLoading(false);
            }
            // If successful, the AuthContext listener will detect the session change, 
            // fetch the profile role, update the `role` state, and trigger the useEffect above.
        } catch (err) {
            setError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
            setLoading(false);
        }
    };

    const handleDemoEnter = (role: 'student' | 'teacher') => {
        switchDemoRole(role);
        if (role === 'teacher') {
            navigate('/teacher');
        } else {
            navigate('/student/welcome');
        }
    };

    return (
        <div className="min-h-screen bg-vastu-cream flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-96 h-96 bg-vastu-dark/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-vastu-gold/10 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />

            <div className="w-full max-w-md relative z-10 animate-fade-in">
                {/* Brand */}
                <div className="text-center mb-10">
                    <div className="w-24 h-24 mx-auto mb-6 relative">
                        <img src="/logo.png" alt="Academy" className="w-[96px] h-[96px] mx-auto object-contain drop-shadow-xl" />
                    </div>
                    <h1 className="text-3xl font-serif tracking-[0.15em] text-vastu-dark">HOLISTIC VEDIC ASTROLOGY</h1>
                    <p className="font-script text-vastu-gold text-xl mt-1">Ausbildung</p>
                </div>

                {/* Ornamental divider */}
                <div className="ornament-divider mb-8">
                    <span>◆</span>
                </div>

                {/* Demo mode: role picker */}
                {isDemo && (
                    <div className="mb-8">
                        <p className="text-center text-sm font-sans text-vastu-text-light mb-4">
                            Demo-Vorschau — wähle eine Ansicht:
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => handleDemoEnter('student')}
                                className="flex flex-col items-center gap-2 bg-white/80 border-2 border-vastu-sand hover:border-vastu-gold px-4 py-5 rounded-2xl transition-all hover:shadow-lg hover:shadow-vastu-dark/5 group"
                            >
                                <GraduationCap size={28} className="text-vastu-dark group-hover:text-vastu-gold transition-colors" />
                                <span className="font-serif text-vastu-dark text-lg">Schüler</span>
                                <span className="text-xs font-sans text-vastu-text-light">Kurs, Bibliothek, Profil</span>
                            </button>
                            <button
                                onClick={() => handleDemoEnter('teacher')}
                                className="flex flex-col items-center gap-2 bg-white/80 border-2 border-vastu-sand hover:border-vastu-gold px-4 py-5 rounded-2xl transition-all hover:shadow-lg hover:shadow-vastu-dark/5 group"
                            >
                                <Settings size={28} className="text-vastu-dark group-hover:text-vastu-gold transition-colors" />
                                <span className="font-serif text-vastu-dark text-lg">Admin</span>
                                <span className="text-xs font-sans text-vastu-text-light">Kurs bearbeiten, Teilnehmer</span>
                            </button>
                        </div>
                    </div>
                )}

                {/* Login Card — frosted glass (hidden in demo mode) */}
                {!isDemo && (
                    <div className="glass-card rounded-2xl p-8">
                        <h2 className="font-serif text-2xl text-vastu-dark mb-6 text-center">Anmelden</h2>

                        {error && (
                            <div className="bg-red-50 text-red-600 text-sm font-sans p-3 rounded-xl mb-4 border border-red-100">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-sans font-medium text-vastu-dark mb-1.5">E-Mail</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-white/80 border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                                    placeholder="deine@email.de"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-sans font-medium text-vastu-dark mb-1.5">Passwort</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full px-4 py-3 bg-white/80 border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none pr-12 font-body text-base"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-vastu-accent hover:text-vastu-dark transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-vastu-dark text-white py-3.5 rounded-xl font-sans font-medium hover:bg-vastu-dark-deep transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-vastu-dark/20"
                            >
                                {loading ? <Loader2 className="animate-spin" size={20} /> : 'Anmelden'}
                            </button>
                        </form>

                        <div className="mt-5 text-center">
                            <Link to="/forgot-password" className="text-sm font-sans text-vastu-text-light hover:text-vastu-dark transition-colors">
                                Passwort vergessen?
                            </Link>
                        </div>
                    </div>
                )}

                {!isDemo && (
                    <div className="text-center mt-6">
                        <p className="text-sm font-sans text-vastu-text-light">
                            Noch kein Konto?{' '}
                            <Link to="/register" className="text-vastu-dark font-medium hover:underline">
                                Registrieren
                            </Link>
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
