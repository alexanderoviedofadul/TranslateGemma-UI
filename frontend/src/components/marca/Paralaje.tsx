'use client';

/**
 * Paralaje de la portada: las cinco capas del hero (public/marca/portada/*.svg, del build del manual) se
 * desplazan a distinta velocidad según su profundidad (data-z). GSAP y ScrollTrigger se sirven desde el propio
 * dominio (/marca/vendor, los mismos ficheros del kit) y se cargan solo tras la primera interacción, para no
 * pesar en la carga. Con movimiento reducido no se carga nada.
 */
import { useEffect } from 'react';

type Gsap = {
    registerPlugin: (...p: unknown[]) => void;
    to: (t: Element, v: Record<string, unknown>) => void;
};

function cargar(src: string): Promise<void> {
    return new Promise((ok, mal) => {
        if (document.querySelector(`script[src="${src}"]`)) return ok();
        const s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.onload = () => ok();
        s.onerror = () => mal(new Error(src));
        document.head.appendChild(s);
    });
}

export default function Paralaje() {
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let hecho = false;
        const iniciar = async () => {
            if (hecho) return;
            hecho = true;
            quitar();
            try {
                await cargar('/marca/vendor/gsap.min.js');
                await cargar('/marca/vendor/ScrollTrigger.min.js');
            } catch {
                return; // sin paralaje: la portada queda igual, quieta
            }
            const w = window as unknown as { gsap?: Gsap; ScrollTrigger?: unknown };
            if (!w.gsap || !w.ScrollTrigger) return;
            w.gsap.registerPlugin(w.ScrollTrigger);
            document.querySelectorAll<HTMLElement>('[data-capa]').forEach((capa) => {
                const z = Number(capa.dataset.z || 0);
                w.gsap!.to(capa, {
                    yPercent: -z * 4,
                    ease: 'none',
                    scrollTrigger: { trigger: '#portada', start: 'top top', end: 'bottom top', scrub: true },
                });
            });
        };
        const eventos = ['scroll', 'pointermove', 'touchstart', 'keydown'] as const;
        const quitar = () => eventos.forEach((e) => window.removeEventListener(e, iniciar));
        eventos.forEach((e) => window.addEventListener(e, iniciar, { passive: true, once: true }));
        return quitar;
    }, []);
    return null;
}
