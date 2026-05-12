import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';

export default function UpdatePasswordPage() {
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [verifying, setVerifying] = useState(true);

    useEffect(() => {
        supabase.auth.getSession().then(() => setVerifying(false));
    }, []);

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            alert('Passwort erfolgreich aktualisiert!');
            navigate('/student/welcome');
        } catch (err: any) {
            setError(err.message || 'Fehler beim Aktualisieren. Der Link ist möglicherweise abgelaufen.');
        } finally {
            setLoading(false);
        }
    };

    if (verifying) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-vastu-light">
                <Loader2 className="animate-spin text-vastu-dark" size={40} />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-vastu-light p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-vastu-dark rounded-full flex items-center justify-center text-white font-serif font-bold text-2xl mx-auto mb-4">V</div>
                    <h1 className="text-3xl font-serif text-vastu-dark">Neues Passwort</h1>
                    <p className="text-vastu-text-light mt-1 text-sm">Bitte wähle ein neues Passwort</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                    {error && (
                        <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl mb-4 border border-red-100">{error}</div>
                    )}

                    <form onSubmit={handleUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-vastu-dark mb-1.5">Neues Passwort</label>
                            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-vastu-accent focus:border-transparent transition-all outline-none"
                                placeholder="••••••••" required minLength={6} />
                        </div>
                        <button type="submit" disabled={loading}
                            className="w-full bg-vastu-dark text-white py-3 rounded-xl font-medium hover:bg-vastu-dark/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                            {loading ? <Loader2 className="animate-spin" size={20} /> : 'Passwort speichern'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
