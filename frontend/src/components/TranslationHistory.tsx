'use client';

import { useEffect, useState } from 'react';
import { ClockIcon, StarIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '@/stores/appStore';
import { getTranslationHistory, deleteTranslation, toggleFavorite, isAuthenticated, type Translation } from '@/services/pocketbase';

export default function TranslationHistory() {
    const { sidebarOpen, toggleSidebar, setSourceText, setTranslatedText, setSourceLang, setTargetLang } = useAppStore();
    const [history, setHistory] = useState<Translation[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (sidebarOpen && isAuthenticated()) {
            loadHistory();
        }
    }, [sidebarOpen]);

    const loadHistory = async () => {
        setLoading(true);
        try {
            const result = await getTranslationHistory();
            setHistory(result.items);
        } catch (error) {
            console.error('Failed to load history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLoadTranslation = (item: Translation) => {
        setSourceText(item.original_text);
        setTranslatedText(item.translated_text);
        setSourceLang({ name: item.source_lang, code: item.source_lang.toLowerCase().slice(0, 2) });
        setTargetLang({ name: item.target_lang, code: item.target_lang.toLowerCase().slice(0, 2) });
        // Close sidebar on mobile
        if (window.innerWidth < 1024) {
            toggleSidebar();
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await deleteTranslation(id);
            setHistory((prev) => prev.filter((item) => item.id !== id));
        } catch (error) {
            console.error('Failed to delete:', error);
        }
    };

    const handleToggleFavorite = async (id: string, current: boolean, e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await toggleFavorite(id, !current);
            setHistory((prev) =>
                prev.map((item) => (item.id === id ? { ...item, is_favorite: !current } : item))
            );
        } catch (error) {
            console.error('Failed to toggle favorite:', error);
        }
    };

    if (!sidebarOpen) return null;

    return (
        <>
            {/* Backdrop for mobile */}
            <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={toggleSidebar}
            />

            {/* Sidebar */}
            <aside className="fixed left-0 top-16 bottom-0 w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-50 overflow-hidden flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <ClockIcon className="h-5 w-5" />
                        Historial
                    </h2>
                    <button
                        onClick={toggleSidebar}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg lg:hidden"
                    >
                        <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-tg-ceniza" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {!isAuthenticated() ? (
                        <div className="p-6 text-center text-gray-500 dark:text-tg-ceniza">
                            <p className="mb-2">Inicia sesión para ver tu historial de traducciones</p>
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin h-8 w-8 border-2 border-tg-jade border-t-transparent rounded-full" />
                        </div>
                    ) : history.length === 0 ? (
                        <div className="p-6 text-center text-gray-500 dark:text-tg-ceniza">
                            <p>No hay traducciones guardadas</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                            {history.map((item) => (
                                <div
                                    key={item.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleLoadTranslation(item)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleLoadTranslation(item);
                                        }
                                    }}
                                    className="w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm text-gray-900 dark:text-white truncate">
                                                {item.original_text.slice(0, 50)}...
                                            </p>
                                            <p className="text-xs text-gray-500 mt-1 dark:text-tg-ceniza">
                                                {item.source_lang} → {item.target_lang}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={(e) => handleToggleFavorite(item.id, item.is_favorite, e)}
                                                className={`p-1.5 rounded ${item.is_favorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                                            >
                                                <StarIcon className="h-4 w-4" fill={item.is_favorite ? 'currentColor' : 'none'} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDelete(item.id, e)}
                                                className="p-1.5 text-tg-pizarra hover:text-red-500 rounded dark:text-tg-ceniza"
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </aside>
        </>
    );
}
