'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { login, register, getCurrentUser, logout, pb } from '@/services/pocketbase';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAuthSuccess: () => void;
}

// ============================================================
// Alianza "Continuar con Cédula 360"
// ============================================================

const C360_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || '';

const C360_METHOD_LABELS: Record<string, string> = {
    totp: 'App autenticadora (TOTP)',
    email_otp: 'Código por email',
    sms_otp: 'Código por SMS',
    whatsapp_otp: 'Código por WhatsApp',
    push: 'Notificación push',
    backup_code: 'Código de respaldo',
};

let _recaptchaLoading: Promise<void> | null = null;

function loadRecaptcha(): Promise<void> {
    if (!C360_SITE_KEY || typeof window === 'undefined') return Promise.resolve();
    if ((window as unknown as { grecaptcha?: unknown }).grecaptcha) return Promise.resolve();
    if (_recaptchaLoading) return _recaptchaLoading;
    _recaptchaLoading = new Promise<void>((resolve) => {
        const s = document.createElement('script');
        s.src = `https://www.google.com/recaptcha/api.js?render=${C360_SITE_KEY}`;
        s.async = true;
        s.onload = () => resolve();
        s.onerror = () => resolve(); // fail-open
        document.head.appendChild(s);
    });
    return _recaptchaLoading;
}

async function recaptchaToken(action: string): Promise<string> {
    if (!C360_SITE_KEY) return '';
    try {
        await loadRecaptcha();
        const grecaptcha = (window as unknown as { grecaptcha?: any }).grecaptcha;
        if (!grecaptcha?.execute) return '';
        return await new Promise<string>((resolve) => {
            grecaptcha.ready(() => {
                grecaptcha
                    .execute(C360_SITE_KEY, { action })
                    .then((t: string) => resolve(t || ''))
                    .catch(() => resolve(''));
            });
        });
    } catch {
        return ''; // fail-open
    }
}

/** Guarda token + record en el authStore de PocketBase, igual que el
 *  login normal de Translate. */
function saveSession(token: string, record: unknown) {
    pb.authStore.save(token, record as any);
}

function Cedula360Login({ onSuccess }: { onSuccess: () => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    // 2FA inline state
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [methods, setMethods] = useState<string[]>([]);
    const [method, setMethod] = useState<string | null>(null);
    const [challenged, setChallenged] = useState(false);
    const [code, setCode] = useState('');

    const reset2fa = () => {
        setSessionId(null);
        setMethods([]);
        setMethod(null);
        setChallenged(false);
        setCode('');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const token = await recaptchaToken('cedula360_login');
            const r = await fetch('/api/auth/cedula360', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, recaptcha_token: token }),
            });
            const d = await r.json();
            if (!r.ok) {
                throw new Error(d?.error || 'No pudimos validar tus credenciales de Cédula 360');
            }
            if (d.mfa_required) {
                setSessionId(d.session_id);
                setMethods(d.methods || []);
                if ((d.methods || []).length === 1) setMethod(d.methods[0]);
                return;
            }
            saveSession(d.token, d.record);
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error con Cédula 360');
        } finally {
            setLoading(false);
        }
    };

    const handleChallenge = async (m: string) => {
        setError('');
        setMethod(m);
        // totp / backup_code no requieren challenge
        if (m === 'totp' || m === 'backup_code') {
            setChallenged(true);
            return;
        }
        setLoading(true);
        try {
            const r = await fetch('/api/auth/cedula360/challenge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, method: m }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d?.error || 'No se pudo enviar el código');
            setChallenged(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const r = await fetch('/api/auth/cedula360/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, method, code }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d?.error || 'Código incorrecto');
            saveSession(d.token, d.record);
            onSuccess();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error');
        } finally {
            setLoading(false);
        }
    };

    // Paso 2FA inline
    if (sessionId) {
        return (
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    <ShieldCheckIcon className="h-4 w-4" />
                    Verificación de Cédula 360
                </div>

                {!challenged && (
                    <div className="space-y-2">
                        <p className="text-xs text-gray-500 dark:text-tg-ceniza">
                            Elige cómo confirmar tu identidad en Cédula 360:
                        </p>
                        {methods.map((m) => (
                            <button
                                key={m}
                                type="button"
                                onClick={() => handleChallenge(m)}
                                disabled={loading}
                                className="w-full text-left px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 hover:border-tg-jade dark:hover:border-tg-agua text-sm text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50"
                            >
                                {C360_METHOD_LABELS[m] || m}
                            </button>
                        ))}
                        {methods.length === 0 && (
                            <p className="text-xs text-red-600">
                                Cédula 360 no devolvió métodos de verificación.
                            </p>
                        )}
                    </div>
                )}

                {challenged && (
                    <form onSubmit={handleVerify} className="space-y-3">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Código de verificación
                        </label>
                        <input
                            type="text"
                            inputMode="numeric"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                            autoFocus
                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white tracking-widest text-center focus:ring-2 focus:ring-tg-jade"
                            placeholder="••••••"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all"
                        >
                            {loading ? 'Verificando…' : 'Verificar y entrar'}
                        </button>
                    </form>
                )}

                {error && (
                    <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
                        {error}
                    </div>
                )}

                <button
                    type="button"
                    onClick={reset2fa}
                    className="text-xs text-gray-500 hover:underline dark:text-tg-ceniza"
                >
                    ← Volver
                </button>
            </div>
        );
    }

    // Paso 1: credenciales Cédula 360
    return (
        <form onSubmit={handleLogin} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Correo de Cédula 360
                </label>
                <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="tu@email.com"
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Contraseña de Cédula 360
                </label>
                <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    placeholder="••••••••"
                />
            </div>

            {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 transition-all"
            >
                <ShieldCheckIcon className="h-4 w-4" />
                {loading ? 'Validando…' : 'Continuar con Cédula 360'}
            </button>

            <p className="text-[11px] leading-relaxed text-gray-500 dark:text-tg-ceniza">
                Entra con tus credenciales de <strong>cedula360.tech</strong>. Las
                validamos de forma segura contra Cédula 360 (incluido su 2FA) y
                nunca guardamos tu contraseña.
            </p>
        </form>
    );
}

// ============================================================
// AuthModal
// ============================================================

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
    const [mode, setMode] = useState<'login' | 'register' | 'cedula360'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!isOpen || !mounted) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'login') {
                await login(email, password);
            } else {
                await register(email, password, name);
            }
            onAuthSuccess();
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error de autenticación');
        } finally {
            setLoading(false);
        }
    };

    const titles: Record<string, string> = {
        login: 'Iniciar Sesión',
        register: 'Crear Cuenta',
        cedula360: 'Acceso con Cédula 360',
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />

            <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
                <div className="relative transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md w-full">
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {titles[mode]}
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            <XMarkIcon className="h-5 w-5 text-gray-500 dark:text-tg-ceniza" />
                        </button>
                    </div>

                    <div className="p-6">
                        {mode === 'cedula360' ? (
                            <Cedula360Login
                                onSuccess={() => {
                                    onAuthSuccess();
                                    onClose();
                                }}
                            />
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {mode === 'register' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Nombre
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            required
                                            className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-tg-jade focus:border-transparent"
                                            placeholder="Tu nombre"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Email
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-tg-jade focus:border-transparent"
                                        placeholder="tu@email.com"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Contraseña
                                    </label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-tg-jade focus:border-transparent"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-3 px-4 bg-tg-jade-hondo text-white font-semibold rounded-xl hover:bg-tg-jade-oscuro disabled:opacity-50 transition-all duration-200"
                                >
                                    {loading ? 'Procesando...' : mode === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta'}
                                </button>
                            </form>
                        )}

                        {/* Separador + botón alianza */}
                        {mode !== 'cedula360' && (
                            <>
                                <div className="my-4 flex items-center gap-3">
                                    <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                                    <span className="text-xs text-tg-pizarra dark:text-tg-ceniza">o</span>
                                    <div className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setError('');
                                        setMode('cedula360');
                                    }}
                                    className="w-full py-3 px-4 flex items-center justify-center gap-2 border-2 border-emerald-500/60 text-emerald-700 dark:text-emerald-400 font-semibold rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                                >
                                    <ShieldCheckIcon className="h-5 w-5" />
                                    Continuar con Cédula 360
                                </button>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-6 pb-6 text-center space-y-2">
                        {mode === 'cedula360' ? (
                            <button
                                onClick={() => {
                                    setError('');
                                    setMode('login');
                                }}
                                className="text-sm text-tg-jade-hondo dark:text-tg-agua hover:underline"
                            >
                                ← Volver al inicio de sesión normal
                            </button>
                        ) : (
                            <button
                                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                                className="text-sm text-tg-jade-hondo dark:text-tg-agua hover:underline"
                            >
                                {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
                            </button>
                        )}
                        <p className="text-[11px] text-tg-pizarra dark:text-tg-ceniza">
                            En alianza con{' '}
                            <a
                                href="https://cedula360.tech"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:underline"
                            >
                                Cédula 360
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
}

// User Menu Component for Header
export function UserMenu() {
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        setUser(getCurrentUser());

        // Subscribe to auth changes to update UI automatically
        const unsubscribe = pb.authStore.onChange((token, model) => {
            setUser(model);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    const handleLogout = () => {
        logout();
        setUser(null);
        setMenuOpen(false);
    };

    // El botón "Iniciar Sesión" (estado deslogueado) NO diverge entre
    // SSR y cliente, así que lo renderizamos siempre — evita que el
    // CTA quede atascado en un placeholder si la hidratación es lenta.
    // Sólo el estado logueado (avatar/menú, datos del usuario) espera a
    // `mounted` para no provocar mismatch de hidratación.
    if (!mounted || !user) {
        return (
            <>
                <button
                    onClick={() => setShowAuthModal(true)}
                    className="flex items-center justify-center p-2 sm:px-4 sm:py-2 bg-tg-jade-hondo text-white text-sm font-medium rounded-lg hover:bg-tg-jade-oscuro transition-colors"
                >
                    <span className="hidden sm:inline">Iniciar Sesión</span>
                    <span className="sm:hidden">
                        <span className="sr-only">Iniciar sesión</span>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                        </svg>
                    </span>
                </button>
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                    onAuthSuccess={() => setUser(getCurrentUser())}
                />
            </>
        );
    }

    return (
        <div className="relative">
            <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
                <div className="w-8 h-8 bg-tg-jade-hondo rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                        {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                    </span>
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">
                    {user.name || user.email}
                </span>
            </button>

            {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2 z-50">
                    <div className="px-4 py-2 text-xs text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-tg-ceniza">
                        <div className="font-medium text-gray-700 dark:text-gray-300">
                            {user.name || 'Mi perfil'}
                        </div>
                        <div className="truncate">{user.email}</div>
                        <div className="mt-1">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-[10px] uppercase tracking-wide">
                                {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                            </span>
                        </div>
                    </div>
                    {user.role === 'admin' && (
                        <a
                            href="/admin"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                            Panel de administración
                        </a>
                    )}
                    <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        Cerrar Sesión
                    </button>
                </div>
            )}
        </div>
    );
}
