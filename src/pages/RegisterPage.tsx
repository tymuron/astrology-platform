import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

const PENDING_INVITE_KEY = 'astrology.pendingInvite';

type InviteState =
    | { status: 'checking' }
    | { status: 'missing' }
    | { status: 'invalid'; reason: string }
    | { status: 'valid'; token: string; courseTitle: string };

export default function RegisterPage() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const inviteToken = searchParams.get('invite');

    const [invite, setInvite] = useState<InviteState>({ status: 'checking' });
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        async function check() {
            if (!inviteToken) {
                setInvite({ status: 'missing' });
                return;
            }
            const { data, error } = await supabase.rpc('validate_invite', { invite_token: inviteToken });
            if (cancelled) return;
            if (error || !data || data.length === 0) {
                setInvite({
                    status: 'invalid',
                    reason: error?.message || 'Der Einladungslink ist ungültig, abgelaufen oder ausgeschöpft.',
                });
                return;
            }
            setInvite({ status: 'valid', token: inviteToken, courseTitle: data[0].course_title });
        }
        check();
        return () => { cancelled = true; };
    }, [inviteToken]);

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (invite.status !== 'valid') return;

        setLoading(true);
        setError(null);

        try {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: { data: { full_name: fullName, invite_token: invite.token } },
            });
            if (signUpError) throw signUpError;

            if (signUpData.session) {
                const { error: redeemError } = await supabase.rpc('redeem_invite', { invite_token: invite.token });
                if (redeemError) {
                    setError('Konto erstellt, aber Kurszugang konnte nicht aktiviert werden. Bitte wende dich an deine Mentorin: ' + redeemError.message);
                    return;
                }
                navigate('/student/welcome');
            } else if (signUpData.user) {
                // Email-confirmation flow (currently OFF, but safe to handle):
                // stash the token and let AuthContext redeem on next SIGNED_IN.
                localStorage.setItem(PENDING_INVITE_KEY, invite.token);
                alert('Registrierung erfolgreich! Bestätige deine E-Mail, dann melde dich an — der Kurszugang wird automatisch aktiviert.');
                navigate('/login');
            }
        } catch (err: any) {
            setError(err.message || 'Fehler bei der Registrierung');
        } finally {
            setLoading(false);
        }
    };

    if (invite.status === 'checking') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-vastu-cream">
                <Loader2 className="animate-spin text-vastu-dark" size={32} />
            </div>
        );
    }

    if (invite.status === 'missing' || invite.status === 'invalid') {
        const message =
            invite.status === 'missing'
                ? 'Die Registrierung ist nur per Einladungslink möglich. Bitte wende dich an deine Mentorin, um eine Einladung zu erhalten.'
                : `Dieser Einladungslink funktioniert nicht: ${invite.reason}`;

        return (
            <div className="min-h-screen flex items-center justify-center bg-vastu-cream p-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-96 h-96 bg-vastu-dark/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-80 h-80 bg-vastu-gold/10 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />
                <div className="w-full max-w-md relative z-10 animate-fade-in">
                    <div className="text-center mb-8">
                        <div className="w-[72px] h-[72px] mx-auto rounded-full border-2 border-vastu-dark/30 flex items-center justify-center mb-5">
                            <span className="font-script text-vastu-dark text-4xl leading-none mt-1">A</span>
                        </div>
                        <h1 className="text-2xl font-serif tracking-[0.10em] text-vastu-dark">EINLADUNG NÖTIG</h1>
                    </div>
                    <div className="glass-card rounded-2xl p-8 text-center">
                        <p className="text-vastu-text-light font-body leading-relaxed mb-6">{message}</p>
                        <Link
                            to="/login"
                            className="inline-block bg-vastu-dark text-white px-6 py-3 rounded-xl font-sans font-medium hover:bg-vastu-dark-deep transition-all shadow-lg shadow-vastu-dark/20"
                        >
                            Zur Anmeldung
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-vastu-cream p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-vastu-dark/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute bottom-0 right-0 w-80 h-80 bg-vastu-gold/10 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />

            <div className="w-full max-w-md relative z-10 animate-fade-in">
                <div className="text-center mb-8">
                    <div className="w-[72px] h-[72px] mx-auto rounded-full border-2 border-vastu-dark/30 flex items-center justify-center mb-5">
                        <span className="font-script text-vastu-dark text-4xl leading-none mt-1">A</span>
                    </div>
                    <h1 className="text-3xl font-serif tracking-[0.25em] text-vastu-dark">ASTROLOGIE</h1>
                    <p className="font-script text-vastu-gold text-lg mt-1">{invite.courseTitle}</p>
                </div>

                <div className="ornament-divider mb-6"><span>◆</span></div>

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
