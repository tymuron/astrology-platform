import { Smartphone, Monitor, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { navigateBackOr } from '../../lib/utils';

export default function InstallGuide() {
    const navigate = useNavigate();
    return (
        <div className="animate-fade-in space-y-6">
            <button
                onClick={() => navigateBackOr(navigate, '/student')}
                className="inline-flex items-center gap-2 text-vastu-text-light hover:text-vastu-dark transition-colors group"
            >
                <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                <span>Zurück</span>
            </button>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-vastu-accent p-8 md:p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-vastu-dark opacity-5 rounded-full blur-[80px] translate-x-1/3 -translate-y-1/3" />
                    <div className="relative z-10">
                        <h1 className="text-3xl md:text-4xl font-serif mb-2 flex items-center gap-3 text-vastu-dark">
                            <Smartphone size={28} />
                            App installieren
                        </h1>
                        <p className="text-vastu-dark/50 font-light">So fügst du die Plattform als App auf deinem Startbildschirm hinzu</p>
                    </div>
                </div>

                <div className="p-6 md:p-8 space-y-8">
                    {/* iPhone / Safari */}
                    <div>
                        <h3 className="font-serif text-xl text-vastu-dark mb-4 flex items-center gap-2">
                            <Smartphone size={20} />
                            iPhone (Safari)
                        </h3>
                        <ol className="space-y-4">
                            <li className="flex items-start gap-4 p-4 bg-vastu-light rounded-xl border border-gray-50">
                                <div className="w-8 h-8 bg-vastu-dark text-white rounded-full flex items-center justify-center font-bold shrink-0 text-sm">1</div>
                                <div>
                                    <p className="font-medium text-vastu-dark">Öffne diese Seite in Safari</p>
                                    <p className="text-sm text-vastu-text-light mt-1">Stelle sicher, dass du den Safari Browser verwendest (nicht Chrome oder andere).</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4 p-4 bg-vastu-light rounded-xl border border-gray-50">
                                <div className="w-8 h-8 bg-vastu-dark text-white rounded-full flex items-center justify-center font-bold shrink-0 text-sm">2</div>
                                <div>
                                    <p className="font-medium text-vastu-dark">Tippe auf das Teilen-Symbol</p>
                                    <p className="text-sm text-vastu-text-light mt-1">Das Quadrat mit dem Pfeil nach oben, unten in der Mitte des Bildschirms.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4 p-4 bg-vastu-light rounded-xl border border-gray-50">
                                <div className="w-8 h-8 bg-vastu-dark text-white rounded-full flex items-center justify-center font-bold shrink-0 text-sm">3</div>
                                <div>
                                    <p className="font-medium text-vastu-dark">Wähle „Zum Home-Bildschirm"</p>
                                    <p className="text-sm text-vastu-text-light mt-1">Scrolle in der Liste nach unten, bis du diese Option findest.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4 p-4 bg-vastu-light rounded-xl border border-gray-50">
                                <div className="w-8 h-8 bg-vastu-dark text-white rounded-full flex items-center justify-center font-bold shrink-0 text-sm">4</div>
                                <div>
                                    <p className="font-medium text-vastu-dark">Tippe auf „Hinzufügen"</p>
                                    <p className="text-sm text-vastu-text-light mt-1">Die App erscheint jetzt auf deinem Startbildschirm! 🎉</p>
                                </div>
                            </li>
                        </ol>
                    </div>

                    <hr className="border-gray-100" />

                    {/* Android / Chrome */}
                    <div>
                        <h3 className="font-serif text-xl text-vastu-dark mb-4 flex items-center gap-2">
                            <Monitor size={20} />
                            Android (Chrome)
                        </h3>
                        <ol className="space-y-4">
                            <li className="flex items-start gap-4 p-4 bg-vastu-light rounded-xl border border-gray-50">
                                <div className="w-8 h-8 bg-vastu-dark text-white rounded-full flex items-center justify-center font-bold shrink-0 text-sm">1</div>
                                <div>
                                    <p className="font-medium text-vastu-dark">Öffne diese Seite in Chrome</p>
                                    <p className="text-sm text-vastu-text-light mt-1">Verwende den Google Chrome Browser.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4 p-4 bg-vastu-light rounded-xl border border-gray-50">
                                <div className="w-8 h-8 bg-vastu-dark text-white rounded-full flex items-center justify-center font-bold shrink-0 text-sm">2</div>
                                <div>
                                    <p className="font-medium text-vastu-dark">Tippe auf die drei Punkte (⋮)</p>
                                    <p className="text-sm text-vastu-text-light mt-1">Oben rechts im Browser.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4 p-4 bg-vastu-light rounded-xl border border-gray-50">
                                <div className="w-8 h-8 bg-vastu-dark text-white rounded-full flex items-center justify-center font-bold shrink-0 text-sm">3</div>
                                <div>
                                    <p className="font-medium text-vastu-dark">Wähle „Zum Startbildschirm hinzufügen"</p>
                                    <p className="text-sm text-vastu-text-light mt-1">Es kann auch „App installieren" heißen.</p>
                                </div>
                            </li>
                            <li className="flex items-start gap-4 p-4 bg-vastu-light rounded-xl border border-gray-50">
                                <div className="w-8 h-8 bg-vastu-dark text-white rounded-full flex items-center justify-center font-bold shrink-0 text-sm">4</div>
                                <div>
                                    <p className="font-medium text-vastu-dark">Bestätige mit „Hinzufügen"</p>
                                    <p className="text-sm text-vastu-text-light mt-1">Fertig! Die App ist jetzt auf deinem Startbildschirm. 🎉</p>
                                </div>
                            </li>
                        </ol>
                    </div>
                </div>
            </div>
        </div>
    );
}
