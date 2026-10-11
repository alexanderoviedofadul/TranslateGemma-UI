/**
 * Portada pública de TranslateGemma (ruta `/`), con el Manual de Marca v1.0 «De una orilla a otra».
 *
 * Rutas:
 *   /          → esta portada (pública)
 *   /traducir  → la herramienta de traducción
 *   /admin     → administración (acceso + roles)
 *
 * Se lee entera sin JavaScript. El paralaje del hero (GSAP, cargado tras la primera interacción) y la parada
 * activa del recorrido son mejoras. Cada dato sale del código (lib/marca.ts): idiomas de languages.ts, el
 * modelo por defecto de services/ollama.ts y los límites del proxy /ollama.
 */
import MarketingHeader from '@/components/layout/MarketingHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import Recorrido from '@/components/marca/Recorrido';
import Paralaje from '@/components/marca/Paralaje';
import { LANGUAGES } from '@/lib/languages';
import { GRUPOS, LIMITES, MODELO, PREGUNTAS } from '@/lib/marca';

export const metadata = {
    title: 'TranslateGemma — Traducción en este servidor, de una orilla a otra',
    description: `Traduzca texto e imágenes entre ${LANGUAGES.length} idiomas con el modelo abierto TranslateGemma, ejecutado con Ollama en este servidor: el texto no se envía a ningún proveedor de IA.`,
    alternates: { canonical: '/' },
};

const CAPAS = [
    { n: 'fondo', z: 0 },
    { n: 'recinto', z: 1 },
    { n: 'puente', z: 2 },
    { n: 'origen', z: 3 },
    { n: 'destino', z: 4 },
];

const DATOS = [
    { v: String(LANGUAGES.length), l: 'idiomas en el selector' },
    { v: '1', l: 'modelo, local' },
    { v: '30', l: 'traducciones por minuto' },
    { v: 'Ctrl+⏎', l: 'para traducir' },
];

export default function Portada() {
    return (
        <div className="min-h-screen flex flex-col bg-white dark:bg-tg-noche">
            <MarketingHeader />
            <Paralaje />

            <main className="flex-1" id="principal">
                {/* Hero: las dos orillas dentro del recinto, en capas */}
                <section id="portada" className="relative overflow-hidden bg-tg-noche text-tg-humo isolate" aria-labelledby="portada-tit">
                    <div className="absolute inset-0 -z-10" aria-hidden="true">
                        {CAPAS.map((c) => (
                            <img
                                key={c.n}
                                src={`/marca/portada/tg-portada-${c.n}.svg`}
                                alt=""
                                data-capa
                                data-z={c.z}
                                width={1600}
                                height={900}
                                decoding="async"
                                fetchPriority={c.n === 'fondo' ? 'high' : 'auto'}
                                className="absolute inset-0 w-full h-full object-cover object-bottom will-change-transform"
                            />
                        ))}
                        <div className="absolute inset-0 bg-tg-noche/80 lg:bg-transparent lg:bg-gradient-to-r lg:from-tg-noche lg:via-tg-noche/85 lg:to-transparent" />
                    </div>
                    <div className="max-w-7xl mx-auto px-4 pt-20 pb-24 sm:pt-28 sm:pb-32">
                        <p className="font-mono text-xs uppercase tracking-[0.16em] text-tg-agua">
                            Traducción con un modelo abierto
                        </p>
                        <h1 id="portada-tit" className="mt-3 text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-3xl">
                            De una orilla a otra.
                        </h1>
                        <p className="mt-6 text-lg sm:text-xl text-tg-humo/90 max-w-2xl leading-relaxed">
                            Escriba en un idioma y léalo en otro. Lo traduce <span className="font-mono text-tg-ambar">translategemma</span>,
                            un modelo abierto que corre con Ollama en este servidor: el texto no se envía a ningún proveedor de IA.
                        </p>
                        <div className="mt-10 flex flex-col sm:flex-row gap-3">
                            <a
                                href="/traducir"
                                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-tg-jade-hondo hover:bg-tg-jade-oscuro text-white font-semibold rounded-xl transition-colors"
                            >
                                Usar el traductor
                                <span aria-hidden="true">→</span>
                            </a>
                            <a
                                href="#recorrido"
                                className="inline-flex items-center justify-center px-7 py-3.5 border border-tg-linea hover:border-tg-agua text-tg-humo font-semibold rounded-xl transition-colors"
                            >
                                Cómo funciona
                            </a>
                        </div>
                        <dl className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl">
                            {DATOS.map((d) => (
                                <div key={d.l} className="rounded-2xl border border-tg-linea bg-tg-cauce/80 px-4 py-3">
                                    <dt className="sr-only">{d.l}</dt>
                                    <dd className="m-0">
                                        <span className="block text-2xl font-bold text-tg-espuma tabular-nums">{d.v}</span>
                                        <span className="block text-sm text-tg-ceniza">{d.l}</span>
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </section>

                <Recorrido />

                {/* Idiomas: los del selector, por grupo */}
                <section id="idiomas" aria-labelledby="idiomas-tit" className="bg-white dark:bg-tg-noche">
                    <div className="max-w-7xl mx-auto px-4 py-20">
                        <p className="font-mono text-xs uppercase tracking-[0.16em] text-tg-jade-hondo dark:text-tg-agua">Idiomas</p>
                        <h2 id="idiomas-tit" className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-tg-tinta dark:text-tg-humo">
                            {LANGUAGES.length} idiomas, con su nombre propio
                        </h2>
                        <p className="mt-3 max-w-2xl text-tg-pizarra dark:text-tg-ceniza">
                            Los mismos que el selector del traductor. La documentación del modelo declara 55; aquí están los que se pueden elegir.
                        </p>
                        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {GRUPOS.map((g) => (
                                <div key={g.nombre} className="rounded-2xl border border-tg-borde dark:border-tg-linea p-5 bg-tg-niebla/60 dark:bg-tg-cauce">
                                    <h3 className="font-semibold text-tg-tinta dark:text-tg-humo">
                                        {g.nombre} <span className="font-mono text-sm text-tg-pizarra dark:text-tg-ceniza">· {g.idiomas.length}</span>
                                    </h3>
                                    <ul className="mt-3 flex flex-wrap gap-2 list-none p-0">
                                        {g.idiomas.map((l) => (
                                            <li
                                                key={l.code}
                                                lang={l.code}
                                                className="px-2.5 py-1 rounded-full bg-white dark:bg-tg-ribera border border-tg-borde dark:border-tg-linea text-sm text-tg-tinta dark:text-tg-humo"
                                            >
                                                {l.nativeName || l.name}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Lo que hace y lo que no */}
                <section aria-labelledby="limites-tit" className="bg-tg-bruma dark:bg-tg-cauce border-y border-tg-borde dark:border-tg-linea">
                    <div className="max-w-7xl mx-auto px-4 py-20 grid gap-12 lg:grid-cols-2">
                        <div>
                            <p className="font-mono text-xs uppercase tracking-[0.16em] text-tg-jade-hondo dark:text-tg-agua">Límites</p>
                            <h2 id="limites-tit" className="mt-2 text-3xl font-bold tracking-tight text-tg-tinta dark:text-tg-humo">
                                Lo que el servicio no deja hacer
                            </h2>
                            <ul className="mt-6 space-y-4 list-none p-0">
                                {LIMITES.map((l) => (
                                    <li key={l.id} className="flex gap-4 items-start">
                                        <span className="shrink-0 min-w-[4.5rem] text-center font-mono text-sm font-bold px-2 py-1 rounded-lg bg-tg-jade-hondo text-white">
                                            {l.id}
                                        </span>
                                        <span className="text-tg-tinta dark:text-tg-humo">{l.texto}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div>
                            <p className="font-mono text-xs uppercase tracking-[0.16em] text-tg-ambar-hondo dark:text-tg-ambar">Con claridad</p>
                            <h2 className="mt-2 text-3xl font-bold tracking-tight text-tg-tinta dark:text-tg-humo">Lo que no promete</h2>
                            <ul className="mt-6 space-y-3 text-tg-tinta dark:text-tg-humo list-disc pl-5">
                                <li>No es un traductor oficial: el resultado es un borrador que conviene revisar.</li>
                                <li>No funciona sin conexión: es un servicio web que traduce en este servidor.</li>
                                <li>No elige entre modelos de distintos tamaños: hay uno instalado, <span className="font-mono">{MODELO}</span>.</li>
                                <li>No es un producto de Google, aunque use su modelo abierto.</li>
                            </ul>
                        </div>
                    </div>
                </section>

                {/* Acceso */}
                <section aria-labelledby="acceso-tit" className="bg-white dark:bg-tg-noche">
                    <div className="max-w-5xl mx-auto px-4 py-20 text-center">
                        <h2 id="acceso-tit" className="text-3xl font-bold tracking-tight text-tg-tinta dark:text-tg-humo">Traduzca sin cuenta; guarde con ella</h2>
                        <p className="mt-4 text-tg-pizarra dark:text-tg-ceniza max-w-2xl mx-auto">
                            El traductor funciona sin iniciar sesión. Con una cuenta propia, o con la de Cédula 360 y su segundo factor,
                            cada traducción queda en su historial, guardado en este servidor.
                        </p>
                        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                            <a href="/traducir" className="inline-flex items-center justify-center px-7 py-3.5 bg-tg-jade-hondo hover:bg-tg-jade-oscuro text-white font-semibold rounded-xl transition-colors">
                                Abrir el traductor
                            </a>
                            <a href="/admin" className="inline-flex items-center justify-center px-7 py-3.5 border border-tg-borde dark:border-tg-linea hover:border-tg-jade text-tg-tinta dark:text-tg-humo font-semibold rounded-xl transition-colors">
                                Mi cuenta y administración
                            </a>
                        </div>
                    </div>
                </section>

                {/* Preguntas */}
                <section aria-labelledby="faq-tit" className="bg-tg-niebla/60 dark:bg-tg-cauce border-t border-tg-borde dark:border-tg-linea">
                    <div className="max-w-3xl mx-auto px-4 py-20">
                        <h2 id="faq-tit" className="text-3xl font-bold tracking-tight text-tg-tinta dark:text-tg-humo">Preguntas</h2>
                        <div className="mt-8 divide-y divide-tg-borde dark:divide-tg-linea">
                            {PREGUNTAS.map((q) => (
                                <details key={q.p} className="group py-4">
                                    <summary className="cursor-pointer list-none flex justify-between gap-4 font-semibold text-tg-tinta dark:text-tg-humo">
                                        {q.p}
                                        <span aria-hidden="true" className="text-tg-jade-hondo dark:text-tg-agua group-open:rotate-45 transition-transform motion-reduce:transition-none">+</span>
                                    </summary>
                                    <p className="mt-3 text-tg-pizarra dark:text-tg-ceniza leading-relaxed">{q.r}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>
            </main>

            <SiteFooter />
        </div>
    );
}
