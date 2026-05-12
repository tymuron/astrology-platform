import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { User, Camera, Save, Lock, Loader2, X, ZoomIn, ZoomOut, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import { getCroppedImg, navigateBackOr } from '../../lib/utils';

export default function Profile() {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const [fullName, setFullName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);

    useEffect(() => {
        if (user) {
            setFullName(user.user_metadata?.full_name || '');
            const url = user.user_metadata?.avatar_url;
            setAvatarUrl(url ? `${url}?t=${new Date().getTime()}` : null);
        }
    }, [user]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Profil erfolgreich aktualisiert!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Fehler beim Aktualisieren des Profils' });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwörter stimmen nicht überein' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            const { error } = await supabase.auth.updateUser({ password });
            if (error) throw error;
            setMessage({ type: 'success', text: 'Passwort erfolgreich geändert!' });
            setPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Fehler beim Ändern des Passworts' });
        } finally {
            setLoading(false);
        }
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                setImageSrc(reader.result as string);
                setIsCropping(true);
            });
            reader.readAsDataURL(file);
        }
    };

    const onCropComplete = useCallback((_: any, croppedAreaPixels: any) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const showCroppedImage = async () => {
        if (!imageSrc || !croppedAreaPixels) return;

        try {
            setLoading(true);
            const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            if (!croppedImageBlob) throw new Error('Bild konnte nicht zugeschnitten werden');

            const fileName = `${user?.id}-${Math.random()}.jpg`;
            const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, croppedImageBlob);
            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
            setAvatarUrl(`${publicUrl}?t=${new Date().getTime()}`);
            await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });

            setMessage({ type: 'success', text: 'Profilbild aktualisiert!' });
            setIsCropping(false);
            setImageSrc(null);
        } catch (e) {
            console.error(e);
            setMessage({ type: 'error', text: 'Fehler beim Speichern des Profilbilds' });
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto text-vastu-dark" /></div>;

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-fade-in relative">
            {/* Back Navigation */}
            <button
                onClick={() => navigateBackOr(navigate, '/student')}
                className="inline-flex items-center gap-2 text-vastu-text-light hover:text-vastu-dark transition-colors group text-sm font-sans"
            >
                <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                <span>Zurück</span>
            </button>

            <div>
                <h1 className="text-3xl font-serif text-vastu-dark mb-2">Mein Profil</h1>
                <p className="text-vastu-text-light">Persönliche Daten und Kontoeinstellungen verwalten.</p>
            </div>

            {message && (
                <div className={`p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-100' : 'bg-red-50 text-red-800 border border-red-100'}`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 md:p-8 space-y-8">
                    {/* Avatar */}
                    <div className="flex flex-col items-center justify-center">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                                {avatarUrl ? (
                                    <img src={avatarUrl} alt="Profilbild" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <User className="w-16 h-16" />
                                    </div>
                                )}
                            </div>
                            <label className="absolute bottom-0 right-0 p-2 bg-vastu-dark text-white rounded-full cursor-pointer hover:bg-vastu-dark/80 transition-colors shadow-md">
                                <Camera className="w-5 h-5" />
                                <input type="file" accept="image/*" className="hidden" onChange={onFileChange} disabled={loading} />
                            </label>
                        </div>
                        <p className="mt-4 text-sm text-vastu-text-light">Klicke auf das Kamera-Symbol, um dein Foto zu ändern</p>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Profile Form */}
                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <h2 className="text-xl font-serif text-vastu-dark">Persönliche Daten</h2>
                        <div className="grid grid-cols-1 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-vastu-dark mb-1.5">E-Mail</label>
                                <input type="email" disabled value={user?.email || ''}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-vastu-dark mb-1.5">Vollständiger Name</label>
                                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-vastu-accent focus:border-transparent outline-none transition-all"
                                    placeholder="Anna Muster" />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={loading}
                                className="px-6 py-3 bg-vastu-dark text-white rounded-xl hover:bg-vastu-dark/90 transition-colors flex items-center gap-2 disabled:opacity-50">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Speichern
                            </button>
                        </div>
                    </form>

                    <hr className="border-gray-100" />

                    {/* Password Form */}
                    <form onSubmit={handlePasswordChange} className="space-y-6">
                        <h2 className="text-xl font-serif text-vastu-dark flex items-center gap-2">
                            <Lock className="w-5 h-5" />
                            Passwort ändern
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-vastu-dark mb-1.5">Neues Passwort</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-vastu-accent focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••" minLength={6} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-vastu-dark mb-1.5">Passwort bestätigen</label>
                                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-vastu-accent focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••" minLength={6} />
                            </div>
                        </div>
                        <div className="flex justify-end">
                            <button type="submit" disabled={loading || !password}
                                className="px-6 py-3 border-2 border-vastu-dark text-vastu-dark rounded-xl hover:bg-vastu-dark hover:text-white transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Passwort ändern
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Cropper Modal */}
            {isCropping && imageSrc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-serif text-lg text-vastu-dark">Foto bearbeiten</h3>
                            <button onClick={() => setIsCropping(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="relative h-80 bg-gray-900">
                            <Cropper image={imageSrc} crop={crop} zoom={zoom} aspect={1}
                                onCropChange={setCrop} onCropComplete={onCropComplete} onZoomChange={setZoom}
                                cropShape="round" showGrid={false} />
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center gap-4">
                                <ZoomOut size={20} className="text-gray-400" />
                                <input type="range" value={zoom} min={1} max={3} step={0.1}
                                    onChange={(e) => setZoom(Number(e.target.value))}
                                    className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-vastu-dark" />
                                <ZoomIn size={20} className="text-gray-400" />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setIsCropping(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors">
                                    Abbrechen
                                </button>
                                <button onClick={showCroppedImage} disabled={loading}
                                    className="flex-1 px-4 py-2 bg-vastu-dark text-white rounded-xl hover:bg-vastu-dark/90 transition-colors flex items-center justify-center">
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Speichern'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
