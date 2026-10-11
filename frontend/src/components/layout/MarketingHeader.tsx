'use client';

/**
 * Header de la landing pública. Theme-aware, responsive, con CTAs a la
 * herramienta y a la administración + menú de usuario (login normal +
 * "Continuar con Cédula 360").
 */
import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAppStore } from '@/stores/appStore';
import { UserMenu } from '@/components/AuthModal';
import Logo from '@/components/marca/Logo';

export default function MarketingHeader() {
    const { theme, setTheme } = useAppStore();
    const [mounted, setMounted] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted) return;
        const isDark =
            theme === 'dark' ||
            (theme === 'system' &&
                window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', isDark);
    }, [theme, mounted]);

    const toggleTheme = () => {
        if (theme === 'system') {
            const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(sysDark ? 'light' : 'dark');
        } else {
            setTheme(theme === 'dark' ? 'light' : 'dark');
        }
    };

    return (
        <header className="sticky top-0 z-40 bg-white/80 dark:bg-gray-950/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                <a href="/" className="flex items-center gap-3">
                    <Logo tam={38} lema="Traducción en este servidor" />
                </a>

                {/* Desktop nav */}
                <nav className="hidden md:flex items-center gap-2">
                    <a
                        href="/traducir"
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        Traductor
                    </a>
                    <a
                        href="/admin"
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        Administración
                    </a>
                    <button
                        onClick={toggleTheme}
                        aria-label="Cambiar tema"
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        {mounted && theme === 'dark' ? (
                            <SunIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        ) : (
                            <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        )}
                    </button>
                    <UserMenu />
                </nav>

                {/* Mobile toggle */}
                <button
                    className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    onClick={() => setMenuOpen((v) => !v)}
                    aria-label="Menú"
                >
                    {menuOpen ? (
                        <XMarkIcon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                    ) : (
                        <Bars3Icon className="h-6 w-6 text-gray-700 dark:text-gray-200" />
                    )}
                </button>
            </div>

            {/* Mobile menu */}
            {menuOpen && (
                <div className="md:hidden border-t border-gray-200 dark:border-gray-800 px-4 py-3 space-y-2 bg-white dark:bg-gray-950">
                    <a
                        href="/traducir"
                        className="block px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                        Traductor
                    </a>
                    <a
                        href="/admin"
                        className="block px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                    >
                        Administración
                    </a>
                    <div className="flex items-center justify-between px-3 py-2">
                        <span className="text-sm text-gray-500 dark:text-tg-ceniza">
                            Tema
                        </span>
                        <button
                            onClick={toggleTheme}
                            aria-label="Cambiar tema"
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                        >
                            {mounted && theme === 'dark' ? (
                                <SunIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            ) : (
                                <MoonIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                            )}
                        </button>
                    </div>
                    <div className="px-3 py-2">
                        <UserMenu />
                    </div>
                </div>
            )}
        </header>
    );
}
