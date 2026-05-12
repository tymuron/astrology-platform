import React, { useState } from 'react';
import { X } from 'lucide-react';

interface AddLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (url: string, formattedTitle: string) => void;
    title?: string;
}

export default function AddLinkModal({ isOpen, onClose, onAdd, title = "Link hinzufügen" }: AddLinkModalProps) {
    const [linkTitle, setLinkTitle] = useState('');
    const [url, setUrl] = useState('');
    const [category, setCategory] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        const name = linkTitle.trim() || 'Link';
        const formattedTitle = category.trim() ? `[${category.trim()}] ${name}` : name;

        onAdd(url.trim(), formattedTitle);

        setLinkTitle('');
        setUrl('');
        setCategory('');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-lg font-bold text-vastu-dark">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Link-Titel *</label>
                        <input
                            type="text"
                            required
                            value={linkTitle}
                            onChange={(e) => setLinkTitle(e.target.value)}
                            placeholder="z.B. PDF zum Download"
                            className="w-full rounded-lg border-gray-300 focus:border-vastu-accent focus:ring-vastu-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">URL *</label>
                        <input
                            type="url"
                            required
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://..."
                            className="w-full rounded-lg border-gray-300 focus:border-vastu-accent focus:ring-vastu-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie (optional)</label>
                        <input
                            type="text"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="z.B. Vorhänge, Teppiche"
                            className="w-full rounded-lg border-gray-300 focus:border-vastu-accent focus:ring-vastu-accent"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Gruppiert Links nach dieser Kategorie (z.B. in Modul 5).
                        </p>
                    </div>

                    <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Abbrechen
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-vastu-dark text-white rounded-lg hover:bg-vastu-dark/90 transition-colors"
                        >
                            Hinzufügen
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
