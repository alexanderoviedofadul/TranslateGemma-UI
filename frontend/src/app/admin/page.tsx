'use client';

/**
 * Panel de administración de Translate (ruta `/admin`).
 *
 * RBAC:
 *  - Sin sesión → pantalla de acceso con login (modal: normal /
 *    registro / "Continuar con Cédula 360" + 2FA inline).
 *  - role !== 'admin'  → vista "Mi perfil" + aviso de acceso limitado
 *    (RBAC viewer: navegación restringida).
 *  - role === 'admin'  → además, listado de usuarios (PB) y sesión.
 *
 * Aditivo: no rompe la herramienta de traducción.
 */

import { useEffect, useState } from 'react';
import { pb, getCurrentUser } from '@/services/pocketbase';
import AuthModal from '@/components/AuthModal';
import SiteFooter from '@/components/layout/SiteFooter';
import Logo from '@/components/marca/Logo';

interface PbUser {
    id: string;
    email: string;
    name?: string;
    role?: string;
    verified?: boolean;
    created: string;
}

export default function AdminPage() {
    const [mounted, setMounted] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [user, setUser] = useState<any>(null);
    const [users, setUsers] = useState<PbUser[]>([]);
    const [usersError, setUsersError] = useState('');
    const [showAuth, setShowAuth] = useState(false);

    useEffect(() => {
        setMounted(true);
        setUser(getCurrentUser());
        const unsub = pb.authStore.onChange((_t, m) => setUser(m));
        return () => unsub();
    }, []);

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (!isAdmin) return;
        (async () => {
            try {
                const res = await pb
                    .collection('users')
                    .getList(1, 100, { sort: '-created' });
                setUsers(res.items as unknown as PbUser[]);
            } catch (e) {
                setUsersError(
                    e instanceof Error
                        ? e.message
                        : 'No se pudo cargar la lista (requiere permisos de administrador).'
                );
            }
        })();
    }, [isAdmin]);

    if (!mounted) return null;

    // ---------- Sin sesión: pantalla de acceso ----------
    if (!user) {
        return (
            <div className="min-h-screen flex flex-col bg-tg-niebla dark:bg-tg-noche">
                <main className="flex-1 flex items-center justify-center p-6">
                    <div className="max-w-md w-full text-center bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 border border-gray-100 dark:border-gray-800">
                        <div className="flex justify-center mb-5"><Logo soloSimbolo tam={56} /></div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            Administración
                        </h1>
                        <p className="text-gray-600 dark:text-tg-ceniza mb-6 text-sm">
                            Necesitas iniciar sesión para acceder al panel.
                            Puedes usar tu cuenta o continuar con Cédula 360.
                        </p>
                        <button
                            onClick={() => setShowAuth(true)}
                            className="w-full px-4 py-3 bg-tg-jade-hondo text-white font-semibold rounded-xl hover:bg-tg-jade-oscuro transition-all"
                        >
                            Iniciar sesión
                        </button>
                        <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                            <a href="/" className="text-gray-500 hover:text-tg-jade-hondo dark:hover:text-tg-agua dark:text-tg-ceniza">
                                ← Inicio
                            </a>
                            <a
                                href="/traducir"
                                className="text-tg-jade-hondo hover:underline dark:text-tg-agua"
                            >
                                Ir al traductor
                            </a>
                        </div>
                    </div>
                </main>
                <AuthModal
                    isOpen={showAuth}
                    onClose={() => setShowAuth(false)}
                    onAuthSuccess={() => {
                        setUser(getCurrentUser());
                        setShowAuth(false);
                    }}
                />
                <SiteFooter />
            </div>
        );
    }

    // ---------- Con sesión ----------
    return (
        <div className="min-h-screen flex flex-col bg-tg-niebla dark:bg-tg-noche">
            <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-800 sticky top-0 z-30">
                <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                    <a href="/" className="flex items-center gap-2">
                        <Logo soloSimbolo tam={36} />
                        <span className="font-bold text-gray-900 dark:text-white">
                            Administración
                        </span>
                    </a>
                    <nav className="flex items-center gap-3 text-sm">
                        <a
                            href="/"
                            className="text-gray-500 hover:text-tg-jade-hondo dark:hover:text-tg-agua dark:text-tg-ceniza"
                        >
                            Inicio
                        </a>
                        <a
                            href="/traducir"
                            className="text-tg-jade-hondo hover:underline dark:text-tg-agua"
                        >
                            Traductor →
                        </a>
                    </nav>
                </div>
            </header>

            <main className="flex-1">
                <div className="max-w-4xl mx-auto p-6 space-y-6">
                    {/* Mi perfil */}
                    <section className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Mi perfil
                        </h2>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            <div>
                                <dt className="text-gray-500 dark:text-tg-ceniza">Nombre</dt>
                                <dd className="text-gray-900 dark:text-white">
                                    {user.name || '—'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-gray-500 dark:text-tg-ceniza">Email</dt>
                                <dd className="text-gray-900 dark:text-white">
                                    {user.email}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-gray-500 dark:text-tg-ceniza">Rol</dt>
                                <dd className="text-gray-900 dark:text-white">
                                    {isAdmin ? 'Administrador' : 'Usuario'}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-gray-500 dark:text-tg-ceniza">Sesión activa</dt>
                                <dd className="text-gray-900 dark:text-white">
                                    {pb.authStore.isValid ? 'Sí' : 'No'}
                                </dd>
                            </div>
                        </dl>
                        <button
                            onClick={() => {
                                pb.authStore.clear();
                                setUser(null);
                            }}
                            className="mt-5 px-4 py-2 text-sm text-red-600 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                            Cerrar sesión
                        </button>
                    </section>

                    {/* Usuarios (solo admin) */}
                    {isAdmin ? (
                        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Usuarios ({users.length})
                            </h2>
                            {usersError && (
                                <p className="text-sm text-amber-600 mb-3">
                                    {usersError}
                                </p>
                            )}
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm min-w-[520px]">
                                    <thead>
                                        <tr className="text-left text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-tg-ceniza">
                                            <th className="py-2 pr-4">Email</th>
                                            <th className="py-2 pr-4">Nombre</th>
                                            <th className="py-2 pr-4">Rol</th>
                                            <th className="py-2 pr-4">Verif.</th>
                                            <th className="py-2">Creado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.map((u) => (
                                            <tr
                                                key={u.id}
                                                className="border-b border-gray-100 dark:border-gray-800"
                                            >
                                                <td className="py-2 pr-4 text-gray-900 dark:text-white">
                                                    {u.email}
                                                </td>
                                                <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">
                                                    {u.name || '—'}
                                                </td>
                                                <td className="py-2 pr-4">
                                                    <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-[11px]">
                                                        {u.role === 'admin'
                                                            ? 'admin'
                                                            : 'viewer'}
                                                    </span>
                                                </td>
                                                <td className="py-2 pr-4">
                                                    {u.verified ? '✓' : '—'}
                                                </td>
                                                <td className="py-2 text-gray-500 dark:text-tg-ceniza">
                                                    {new Date(
                                                        u.created
                                                    ).toLocaleDateString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="mt-4 text-xs text-tg-pizarra dark:text-tg-ceniza">
                                Gestión avanzada (CRUD completo, roles) vía
                                PocketBase Admin UI.
                            </p>
                        </section>
                    ) : (
                        <section className="bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                Acceso limitado
                            </h2>
                            <p className="text-sm text-gray-600 dark:text-tg-ceniza">
                                Tienes acceso de <strong>usuario</strong>. La
                                gestión de usuarios y sesiones está reservada a
                                administradores. Puedes seguir usando el{' '}
                                <a
                                    href="/traducir"
                                    className="text-tg-jade-hondo hover:underline dark:text-tg-agua"
                                >
                                    traductor
                                </a>{' '}
                                normalmente.
                            </p>
                        </section>
                    )}
                </div>
            </main>

            <SiteFooter />
        </div>
    );
}
