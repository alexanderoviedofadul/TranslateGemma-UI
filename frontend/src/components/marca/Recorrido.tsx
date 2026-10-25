'use client';

/**
 * Recorrido de la portada («ScrollWorld» del kit): cinco paradas, del texto al texto. A la izquierda el texto
 * de cada parada; a la derecha, fija mientras se recorre, su escena (public/marca/paradas/tg-parada-N.svg, las
 * dibuja el build del Manual de Marca). La parada activa la decide un IntersectionObserver: sin JavaScript se
 * lee todo igual (en móvil cada parada lleva su escena encima). Con movimiento reducido no hay transiciones.
 */
import { useEffect, useRef, useState } from 'react';
import { PARADAS } from '@/lib/marca';

export default function Recorrido() {
    const [activa, setActiva] = useState(0);
    const refs = useRef<(HTMLElement | null)[]>([]);

    useEffect(() => {
        if (!('IntersectionObserver' in window)) return;
        const io = new IntersectionObserver(
            (entradas) => {
                entradas.forEach((e) => {
                    if (e.isIntersecting) setActiva(Number((e.target as HTMLElement).dataset.parada));
                });
            },
            { rootMargin: '-45% 0px -45% 0px' }
        );
        refs.current.forEach((el) => el && io.observe(el));
        return () => io.disconnect();
    }, []);

    return (
        <section id="recorrido" aria-labelledby="recorrido-tit" className="bg-tg-noche text-tg-humo">
            <div className="max-w-7xl mx-auto px-4 pt-20">
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-tg-agua">Cómo funciona</p>
                <h2 id="recorrido-tit" className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight">
                    Cinco paradas, del texto al texto
                </h2>
                <p className="mt-3 text-tg-ceniza">
                    ¿Lo quiere ver con calma, capítulo a capítulo?{' '}
                    <a href="/conozca/" className="font-semibold text-tg-agua underline underline-offset-4">Vea el recorrido completo</a>
                </p>
            </div>
            <div className="max-w-7xl mx-auto px-4 pb-20 lg:grid lg:grid-cols-[1fr_1.15fr] lg:gap-12">
                <ol className="list-none p-0 m-0">
                    {PARADAS.map((p, i) => (
                        <li
                            key={p.id}
                            ref={(el) => {
                                refs.current[i] = el;
                            }}
                            data-parada={i}
                            className="py-10 lg:min-h-[72vh] lg:flex lg:flex-col lg:justify-center"
                        >
                            <img
                                src={`/marca/paradas/tg-parada-${i + 1}.svg`}
                                alt=""
                                width={1600}
                                height={900}
                                loading="lazy"
                                decoding="async"
                                className="lg:hidden w-full h-auto rounded-2xl border border-tg-linea mb-6"
                            />
                            <span className="font-mono text-sm text-tg-ambar">0{i + 1}</span>
                            <h3
                                className={`mt-1 text-2xl sm:text-3xl font-bold transition-colors motion-reduce:transition-none ${
                                    activa === i ? 'text-tg-humo' : 'lg:text-tg-ceniza'
                                }`}
                            >
                                {p.titulo}
                            </h3>
                            <p className="mt-3 text-lg leading-relaxed text-tg-ceniza max-w-prose">{p.texto}</p>
                        </li>
                    ))}
                </ol>
                <div className="hidden lg:block" aria-hidden="true">
                    <div className="sticky top-24 aspect-[16/10] rounded-3xl overflow-hidden border border-tg-linea bg-tg-cauce">
                        {PARADAS.map((p, i) => (
                            <img
                                key={p.id}
                                src={`/marca/paradas/tg-parada-${i + 1}.svg`}
                                alt=""
                                width={1600}
                                height={900}
                                loading="lazy"
                                decoding="async"
                                className={`absolute inset-0 w-full h-full object-cover transition-[opacity,transform] duration-700 ease-out motion-reduce:transition-none ${
                                    activa === i ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.03]'
                                }`}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}
