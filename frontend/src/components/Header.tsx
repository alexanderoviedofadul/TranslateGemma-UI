'use client';

import { useEffect, useState } from 'react';
import { MoonIcon, SunIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { useAppStore } from '@/stores/appStore';
import { checkOllamaStatus } from '@/services/ollama';
import { UserMenu } from './AuthModal';
import Logo from '@/components/marca/Logo';

export default function Header() {
    const { theme, setTheme, ollamaConnected, setOllamaConnected, toggleSidebar } = useAppStore();
    const [mounted, setMounted] = useState(false);

    // Check Ollama status periodically
    useEffect(() => {
        setMounted(true);

        const checkStatus = async () => {
            const connected = await checkOllamaStatus();
            setOllamaConnected(connected);
        };

        checkStatus();
        const interval = setInterval(checkStatus, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, [setOllamaConnected]);

    // Apply theme
    useEffect(() => {
        if (!mounted) return;

        const isDark =
            theme === 'dark' ||
            (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

        document.documentElement.classList.toggle('dark', isDark);
    }, [theme, mounted]);

    const toggleTheme = () => {
        if (theme === 'system') {
            const systemIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setTheme(systemIsDark ? 'light' : 'dark');
        } else {
            setTheme(theme === 'dark' ? 'light' : 'dark');
        }
    };

    return (
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
                {/* Left: Logo & Menu */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg shrink-0"
                        title="Historial"
                        aria-label="Historial"
                    >
                        <Bars3Icon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                    </button>

                    <a href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <span className="sm:hidden"><Logo soloSimbolo tam={36} /><span className="sr-only">TranslateGemma</span></span>
                        <span className="hidden sm:block min-w-0"><Logo tam={38} lema="Traducción en este servidor" /></span>
                    </a>
                </div>

                {/* Right: Status & Actions */}
                <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                    {/* Ollama Status */}
                    <div className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                            className={`w-2 h-2 rounded-full ${ollamaConnected ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 hidden md:inline">
                            {ollamaConnected ? 'Ollama OK' : 'Desconectado'}
                        </span>
                    </div>

                    {/* Theme Toggle */}
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

                    {/* User Menu */}
                    <UserMenu />
                </div>
            </div>
        </header>
    );
}
