/**
 * Símbolo y logotipo de TranslateGemma (Manual de Marca v1.0, capítulo 03).
 *
 * El símbolo es el mismo dibujo que el maestro `public/marca/logos/tg-simbolo.svg`, que genera
 * `docs/Manual_Marca_TranslateGemma/v1.0/scripts/build_v1.py`: una línea de origen que gira y vuelve como
 * línea de destino, en blanco sobre un cuadrado Jade. El audit del manual comprueba que estos trazados son
 * los del maestro. En línea (no <img>) para que no haya una petición más ni un parpadeo.
 *
 * El nombre va en texto (Inter 700) con «Translate» en Jade: el énfasis no recae en «Gemma», que es una
 * marca de Google.
 */
type Props = {
  /** Lado del símbolo en px. */
  tam?: number;
  /** Sin el nombre, solo el símbolo. */
  soloSimbolo?: boolean;
  /** Sobre fondo oscuro: el nombre en Humo y «Translate» en Agua. */
  oscuro?: boolean;
  /** Línea descriptiva bajo el nombre. */
  lema?: string;
  className?: string;
};

export function Simbolo({ tam = 36, className = '' }: { tam?: number; className?: string }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <rect width="100" height="100" rx="24" fill="#0F766E" />
      <path
        d="M26 29H62A16 16 0 0 1 62 61H40"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M50 51L40 61L50 71"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({ tam = 36, soloSimbolo = false, oscuro = false, lema, className = '' }: Props) {
  if (soloSimbolo) return <Simbolo tam={tam} className={className} />;
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Simbolo tam={tam} />
      <span className="leading-tight">
        <span
          className={`block font-bold tracking-[-0.018em] ${oscuro ? 'text-tg-humo' : 'text-tg-tinta dark:text-tg-humo'}`}
          style={{ fontSize: tam * 0.5 }}
        >
          <span className={oscuro ? 'text-tg-agua' : 'text-tg-jade-hondo dark:text-tg-agua'}>Translate</span>Gemma
        </span>
        {lema ? (
          <span className={`block text-[11px] ${oscuro ? 'text-tg-ceniza' : 'text-tg-pizarra dark:text-tg-ceniza'}`}>
            {lema}
          </span>
        ) : null}
      </span>
    </span>
  );
}
