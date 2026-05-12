import { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircle2, Loader2, FileText, ArrowRight, X } from 'lucide-react';

const DISCLAIMER_ITEMS = [
    'Ich gehe die Ausbildung bis zum Ende durch',
    'Ich gebe mir selbst, das Versprechen des Wissen aufzunehmen und umzusetzen',
    'Ich gehe die Ausbildung mit Liebe, Achtsamkeit, Langsamkeit durch & erlaube mir, Fehler zu machen',
    'Ich bin aktiv im Chat und stelle meine Fragen ohne Scham und Ängste',
    'Ich führe die Hausaufgaben aus',
    'Ich habe keine Zeit → Ich habe Zeit',
    'Ich verstehe das nicht → Ich verstehe & das Wissen eröffnet sich Stück für Stück',
];

interface DisclaimerModalProps {
    userId: string;
    onAccepted: () => void;
}

export default function DisclaimerModal({ userId, onAccepted }: DisclaimerModalProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [pdfChecked, setPdfChecked] = useState(false);
    const [showDocument, setShowDocument] = useState(false);
    const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    
    // Hardcoded static URL
    const pdfUrl = '/ausbildungsvertrag.pdf';
    
    const [checked, setChecked] = useState<Record<number, boolean>>({});
    const [submitting, setSubmitting] = useState(false);

    const allChecked = DISCLAIMER_ITEMS.every((_, i) => checked[i]);

    const toggle = (index: number) => {
        setChecked(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleAccept = async () => {
        if (!allChecked) return;
        setSubmitting(true);
        try {
            // Always save to localStorage first as fallback
            localStorage.setItem(`disclaimer-accepted:${userId}`, 'true');

            const { error } = await supabase
                .from('profiles')
                .update({ disclaimer_accepted_at: new Date().toISOString() })
                .eq('id', userId);

            if (error) {
                console.warn('Supabase disclaimer save failed (using localStorage):', error.message);
            }

            onAccepted();
        } catch (error) {
            console.error('Fehler beim Speichern der Vereinbarung:', error);
            // Still proceed — localStorage has it saved
            onAccepted();
        } finally {
            setSubmitting(false);
        }
    };

    const handleScroll = () => {
        if (!scrollContainerRef.current) return;
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        const isBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - 20;
        setIsScrolledToBottom(isBottom);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="bg-vastu-dark p-6 text-center relative overflow-hidden shrink-0 transition-all">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-vastu-gold opacity-10 rounded-full blur-[40px] translate-x-1/3 -translate-y-1/3" />
                    <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20">
                        <span className="text-3xl">🙏</span>
                    </div>
                    <h2 className="font-serif text-xl text-white mb-1">
                        {step === 1 ? 'Ausbildungsvertrag' : 'Deine Commitments'}
                    </h2>
                    <p className="text-white/60 text-sm font-sans">
                        {step === 1 
                            ? 'Bitte lies das Dokument und bestätige dein Einverständnis.'
                            : 'Bitte bestätige die folgenden Punkte, bevor du startest.'}
                    </p>
                    
                    {/* Step Indicator */}
                    <div className="flex items-center justify-center gap-2 mt-6">
                        <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 1 ? 'bg-vastu-gold' : 'bg-white/20'}`} />
                        <div className={`h-1.5 w-8 rounded-full transition-colors ${step >= 2 ? 'bg-vastu-gold' : 'bg-white/20'}`} />
                    </div>
                </div>

                {/* Step 1: PDF Document */}
                {step === 1 && (
                    <>
                        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center space-y-8">
                            
                            {/* Document Link Box */}
                            <button 
                                onClick={() => setShowDocument(true)}
                                className="w-full flex items-center gap-4 p-5 bg-vastu-cream/30 border border-vastu-sand/50 rounded-xl hover:bg-vastu-cream hover:border-vastu-gold/30 transition-all group text-left"
                            >
                                <div className="w-12 h-12 bg-white rounded-lg shadow-sm flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                                    <FileText className="text-vastu-accent" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-serif text-lg text-vastu-dark group-hover:text-vastu-accent transition-colors">Ausbildungsvertrag ansehen</h3>
                                    <p className="text-sm text-vastu-text-light font-body">Klicke hier, um das Dokument zu lesen</p>
                                </div>
                            </button>

                            {/* Single Checkbox */}
                            <button
                                onClick={() => setPdfChecked(!pdfChecked)}
                                className={`w-full flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                                    pdfChecked
                                        ? 'border-green-200 bg-green-50/50'
                                        : 'border-gray-200 bg-white hover:border-vastu-accent/30 hover:bg-vastu-cream/20'
                                }`}
                            >
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                    pdfChecked
                                        ? 'border-green-500 bg-green-500 text-white'
                                        : 'border-gray-300'
                                }`}>
                                    {pdfChecked && <CheckCircle2 size={14} />}
                                </div>
                                <span className={`text-sm font-sans font-medium leading-relaxed ${
                                    pdfChecked ? 'text-green-800' : 'text-vastu-dark'
                                }`}>
                                    Ich habe den Ausbildungsvertrag gelesen und stimme den Bedingungen zu.
                                </span>
                            </button>
                        </div>

                        {/* Footer Step 1 */}
                        <div className="p-6 border-t border-gray-100 shrink-0">
                            <button
                                onClick={() => setStep(2)}
                                disabled={!pdfChecked}
                                className="w-full py-3.5 bg-vastu-dark text-white rounded-xl font-serif font-medium hover:bg-vastu-dark/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                Weiter zur Checkliste
                                <ArrowRight size={18} />
                            </button>
                        </div>
                    </>
                )}

                {/* Step 2: Checklist */}
                {step === 2 && (
                    <>
                        <div 
                            ref={scrollContainerRef}
                            onScroll={handleScroll}
                            className="flex-1 overflow-y-auto p-6 space-y-3 relative"
                        >
                            {DISCLAIMER_ITEMS.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => toggle(index)}
                                    className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                                        checked[index]
                                            ? 'border-green-200 bg-green-50/50'
                                            : 'border-gray-200 bg-white hover:border-vastu-accent/30 hover:bg-vastu-cream/20'
                                    }`}
                                >
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                        checked[index]
                                            ? 'border-green-500 bg-green-500 text-white'
                                            : 'border-gray-300'
                                    }`}>
                                        {checked[index] && <CheckCircle2 size={14} />}
                                    </div>
                                    <span className={`text-sm font-sans leading-relaxed ${
                                        checked[index] ? 'text-green-800' : 'text-vastu-dark'
                                    }`}>
                                        {item}
                                    </span>
                                </button>
                            ))}
                            
                            <div className={`sticky bottom-2 w-full flex justify-center pointer-events-none mt-4 pb-2 z-10 transition-opacity duration-300 ${isScrolledToBottom ? 'opacity-0' : 'opacity-100'}`}>
                                <div className="bg-vastu-dark/80 backdrop-blur-sm text-white px-4 py-2 rounded-full flex items-center gap-2 text-xs shadow-lg font-sans">
                                    ⬇️ Nach unten scrollen
                                </div>
                            </div>
                        </div>

                        {/* Footer Step 2 */}
                        <div className="p-6 border-t border-gray-100 shrink-0 space-y-3">
                            <button
                                onClick={handleAccept}
                                disabled={!allChecked || submitting}
                                className="w-full py-3.5 bg-vastu-dark text-white rounded-xl font-serif font-medium hover:bg-vastu-dark/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <Loader2 className="animate-spin" size={18} />
                                ) : (
                                    <>
                                        <CheckCircle2 size={18} />
                                        Ich stimme zu & starte die Ausbildung
                                    </>
                                )}
                            </button>
                            <button 
                                onClick={() => setStep(1)}
                                className="w-full py-2 text-sm text-vastu-text-light hover:text-vastu-dark transition-colors font-sans"
                            >
                                Zurück zum Dokument
                            </button>
                            <p className="text-center text-xs text-gray-400 font-sans">
                                {allChecked ? '✅ Alle Punkte bestätigt' : `${Object.values(checked).filter(Boolean).length} von ${DISCLAIMER_ITEMS.length} bestätigt`}
                            </p>
                        </div>
                    </>
                )}
            </div>

            {/* Full Screen Document Viewer Overlay */}
            {showDocument && (
                <div className="fixed inset-0 z-[110] bg-black/90 flex flex-col animate-fade-in">
                    <div className="flex justify-end p-4 shrink-0 bg-transparent">
                        <button 
                            onClick={() => setShowDocument(false)}
                            className="bg-white/10 hover:bg-white/20 p-3 rounded-full text-white transition-colors"
                            aria-label="Schließen"
                        >
                            <X size={24} />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden px-2 pb-6 md:px-8 md:pb-8 flex justify-center items-center">
                        <iframe 
                            src={pdfUrl} 
                            title="Ausbildungsvertrag" 
                            className="w-full h-full max-w-5xl rounded-lg shadow-2xl bg-white" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
