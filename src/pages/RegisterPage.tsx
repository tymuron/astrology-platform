import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function RegisterPage() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName } },
            });

            if (error) throw error;

            if (data.session) {
                navigate('/student/welcome');
            } else if (data.user) {
                alert('Registrierung erfolgreich! Bitte bestätige deine E-Mail-Adresse.');
                navigate('/login');
            }
        } catch (err: any) {
            setError(err.message || 'Fehler bei der Registrierung');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-vastu-cream p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-vastu-dark/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-vastu-gold/10 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />

            <div className="w-full max-w-md relative z-10 animate-fade-in">
                <div className="text-center mb-10">
                    <div className="w-[72px] h-[72px] mx-auto rounded-full border-2 border-vastu-dark/30 flex items-center justify-center mb-5">
                        <span className="font-script text-vastu-dark text-4xl leading-none mt-1">V</span>
                    </div>
                    <h1 className="text-3xl font-serif tracking-[0.15em] text-vastu-dark">GANZHEITLICHE VEDISCHE ASTROLOGIE</h1>
                    <p className="font-script text-vastu-gold text-xl mt-1">Ausbildung</p>
                </div>

                <div className="ornament-divider mb-8"><span>◆</span></div>

                <div className="glass-card rounded-2xl p-8">
                    <h2 className="font-serif text-2xl text-vastu-dark mb-6 text-center">Registrieren</h2>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm font-sans p-3 rounded-xl mb-4 border border-red-100">{error}</div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-5">
                        <div>
                            <label className="block text-sm font-sans font-medium text-vastu-dark mb-1.5">Vollständiger Name</label>
                            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                                className="w-full px-4 py-3 bg-white/80 border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                                placeholder="Anna Muster" required />
                        </div>
                        <div>
                            <label className="block text-sm font-sans font-medium text-vastu-dark mb-1.5">E-Mail</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white/80 border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                                placeholder="deine@email.de" required />
                        </div>
                        <div>
                            <label className="block text-sm font-sans font-medium text-vastu-dark mb-1.5">Passwort</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-white/80 border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                                placeholder="••••••••" required minLength={6} />
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full bg-vastu-dark text-white py-3.5 rounded-xl font-sans font-medium hover:bg-vastu-dark-deep transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-vastu-dark/20">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Registrieren'}
                        </button>
                    </form>

                    <div className="mt-5 text-center">
                        <Link to="/login" className="text-sm font-sans text-vastu-text-light hover:text-vastu-dark transition-colors">
                            Bereits ein Konto? Anmelden
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
