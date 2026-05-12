import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/update-password`,
            });
            if (error) throw error;
            setMessage('Ein Link zum Zurücksetzen des Passworts wurde an deine E-Mail gesendet. Bitte überprüfe dein Postfach.');
        } catch (err: any) {
            setError(err.message || 'Fehler beim Senden des Links');
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
                    <h1 className="text-4xl font-serif tracking-[0.25em] text-vastu-dark">ASTROLOGIE</h1>
                </div>

                <div className="glass-card rounded-2xl p-8">
                    <h2 className="font-serif text-2xl text-vastu-dark mb-2 text-center">Passwort vergessen</h2>
                    <p className="text-vastu-text-light font-body text-sm text-center mb-6">Gib deine E-Mail ein und wir senden dir einen Link zum Zurücksetzen.</p>

                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm font-sans p-3 rounded-xl mb-4 border border-red-100">{error}</div>
                    )}
                    {message && (
                        <div className="bg-green-50 text-green-700 text-sm font-sans p-3 rounded-xl mb-4 border border-green-100">{message}</div>
                    )}

                    <form onSubmit={handleReset} className="space-y-5">
                        <div>
                            <label className="block text-sm font-sans font-medium text-vastu-dark mb-1.5">E-Mail</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-white/80 border border-vastu-sand rounded-xl focus:ring-2 focus:ring-vastu-gold/40 focus:border-vastu-gold transition-all outline-none font-body text-base"
                                placeholder="deine@email.de" required />
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full bg-vastu-dark text-white py-3.5 rounded-xl font-sans font-medium hover:bg-vastu-dark-deep transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-vastu-dark/20">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Link senden'}
                        </button>
                    </form>

                    <div className="mt-5 text-center">
                        <Link to="/login" className="flex items-center justify-center gap-2 text-sm font-sans text-vastu-text-light hover:text-vastu-dark transition-colors">
                            <ArrowLeft size={16} />
                            Zurück zur Anmeldung
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
