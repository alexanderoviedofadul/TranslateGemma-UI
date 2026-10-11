'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '@/stores/appStore';
import { LANGUAGES, getLanguagesBySearch } from '@/lib/languages';

interface LanguageSelectorProps {
    type: 'source' | 'target';
}

export default function LanguageSelector({ type }: LanguageSelectorProps) {
    const { sourceLang, targetLang, setSourceLang, setTargetLang } = useAppStore();
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLang = type === 'source' ? sourceLang : targetLang;
    const setLang = type === 'source' ? setSourceLang : setTargetLang;

    const filteredLanguages = search ? getLanguagesBySearch(search) : LANGUAGES;

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (name: string, code: string) => {
        setLang({ name, code });
        setIsOpen(false);
        setSearch('');
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <span className="font-medium text-gray-900 dark:text-white">{currentLang.name}</span>
                <ChevronDownIcon className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-2 w-72 max-h-96 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    {/* Search */}
                    <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-tg-pizarra dark:text-tg-ceniza" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar idioma..."
                                className="w-full pl-9 pr-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-tg-jade dark:text-white"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Language List */}
                    <div className="overflow-y-auto max-h-72">
                        {filteredLanguages.length === 0 ? (
                            <div className="p-4 text-sm text-gray-500 text-center dark:text-tg-ceniza">No se encontraron idiomas</div>
                        ) : (
                            filteredLanguages.map((lang) => (
                                <button
                                    key={lang.code}
                                    onClick={() => handleSelect(lang.name, lang.code)}
                                    className={`w-full text-left px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between ${currentLang.code === lang.code ? 'bg-tg-bruma dark:bg-tg-ribera' : ''
                                        }`}
                                >
                                    <span className="text-gray-900 dark:text-white">{lang.name}</span>
                                    <span className="text-xs text-tg-pizarra dark:text-tg-ceniza">{lang.nativeName}</span>
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
