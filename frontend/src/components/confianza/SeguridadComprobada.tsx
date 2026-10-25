'use client';

// «Seguridad comprobada» (kit «confianza y recorrido», 25-oct-2026): lo que dicen de este sitio herramientas PÚBLICAS e
// independientes, con la nota, la fecha, una captura real del informe y el enlace para verificarlo en la fuente.
//
// Es la versión React de /kit-confianza/sc-seguridad.js: el mismo contrato de datos y el mismo marcado (clases `sc-*`,
// `data-sc-listo`, `data-sc-captura`, `dialog.sc-dlg`), así que usa la hoja del kit y la prueba e2e del kit la reconoce.
// Lee /salud-publica/publico.json, que escribe el medidor del servidor (salud-publica-ronda.sh) con SOLO lo publicable:
// la calificación más alta de cada herramienta, menos de 45 días y enlace https a la fuente.
// 🔴 Ninguna cifra a mano: si el medidor no pudo medir, la tarjeta no aparece; sin nada publicable, la sección no se pinta.
// 🔴 Componente de cliente: la petición va en un efecto (en el servidor y en la hidratación se pinta null).
// 🔴 Nada en línea (CSP): solo clases; los colores, en `--sc-*` (globals.css).
import { useEffect, useRef, useState } from 'react'

interface Captura { src: string; w?: number; h?: number }
interface Fuente {
  clave: string; fuente?: string; mide?: string; valor?: string; detalle?: string; url: string; medido: string
  ok?: boolean; captura?: Captura | null; escritorio?: number[]; movil?: number[]
}
interface Publico { sitio?: string; ultima?: string | null; fuentes?: Fuente[] }

const FUENTES: Record<string, [string, string]> = {
  observatorio: ['M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3z M8.5 12l2.5 2.5 4.5-5', 'Que el navegador de quien entra aplique todas las protecciones de seguridad que el sitio le pide.'],
  ssllabs: ['M6 11h12v9H6z M8.5 11V8a3.5 3.5 0 017 0v3', 'La conexión cifrada: el certificado, los protocolos y la fuerza del cifrado TLS.'],
  securityheaders: ['M9 6h11 M9 12h11 M9 18h11 M4 6l1 1 2-2 M4 12l1 1 2-2 M4 18l1 1 2-2', 'Una segunda revisión independiente de las mismas cabeceras de seguridad.'],
  pagespeed: ['M4 17a8 8 0 1116 0 M12 17l4-5', 'Rendimiento, accesibilidad, buenas prácticas y posicionamiento, medidos por Google.'],
  virustotal: ['M9 8a3 3 0 016 0 M7 10h10v5a5 5 0 01-10 0v-5z M12 10v10 M3 12h4 M17 12h4 M4 18l3-2 M20 18l-3-2', 'Que ninguno de los motores antimalware y de reputación del mundo lo marque como peligroso.'],
  w3c: ['M9 7l-5 5 5 5 M15 7l5 5-5 5', 'Que el código de la página cumpla el estándar HTML, sin errores.'],
  wave: ['M12 5.5a1.5 1.5 0 100-.01 M5 9l7 1 7-1 M12 10v4 M9 21l3-7 3 7', 'Que lo puedan usar personas con discapacidad: accesibilidad WCAG, sin errores ni fallos de contraste.'],
  internetnl: ['M12 3a9 9 0 100 18 9 9 0 000-18z M3 12h18 M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z', 'Estándares modernos de internet: IPv6, firma del dominio, HTTPS y rutas seguras.'],
}
const LUPA = 'M11 4a7 7 0 100 14 7 7 0 000-14z M20 20l-4-4'
const EXTERNO = 'M14 4h6v6 M20 4l-9 9 M18 14v6H4V6h6'
const ORDEN = Object.keys(FUENTES)
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const CAPTURA = /^\/salud-publica\/[a-z0-9_]+\.webp(\?v=\d+)?$/
const FORMATO = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'numeric', year: 'numeric' })
const CATEGORIAS = ['Rendimiento', 'Accesibilidad', 'Buenas prácticas', 'SEO']

/** «23 de octubre de 2026», en Bogotá (la hora del medidor). */
function fecha(iso?: string | null): string {
  const t = iso ? Date.parse(iso) : NaN
  if (Number.isNaN(t)) return ''
  const p = Object.fromEntries(FORMATO.formatToParts(new Date(t)).map((x) => [x.type, x.value]))
  return `${p.day} de ${MESES[Number(p.month) - 1]} de ${p.year}`
}
function host(u: string): string {
  try { return new URL(u).hostname } catch { return '' }
}
function Icono({ d }: { d: string }) {
  return (
    <svg className="sc-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {d.split(' M').map((t, i) => <path key={i} d={(i ? 'M' : '') + t} />)}
    </svg>
  )
}

/* La hoja del kit (public/kit-confianza/, sin editar), solo cuando hay algo que pintar y ANTES de pintarlo (sin salto
   de estilos). Un <link> creado por DOM: nada en línea. */
const HOJA = '/kit-confianza/sc-seguridad.css?v=1.0.4'
function hoja(): Promise<void> {
  if (document.querySelector(`link[href="${HOJA}"]`)) return Promise.resolve()
  return new Promise((listo) => {
    const l = document.createElement('link')
    l.rel = 'stylesheet'; l.href = HOJA
    l.onload = () => listo(); l.onerror = () => listo()
    document.head.appendChild(l)
  })
}

/* Una sola petición por carga de la página (la reutilizan los montajes siguientes); sin el fichero o con un error, null. */
let peticion: Promise<Publico | null> | null = null
function cargar(): Promise<Publico | null> {
  peticion ??= fetch('/salud-publica/publico.json', { credentials: 'omit', cache: 'no-cache' })
    .then((r) => (r.ok ? (r.json() as Promise<Publico>) : null))
    .then((j) => (j && Array.isArray(j.fuentes) && j.fuentes.length ? hoja().then(() => j) : j))
    .catch(() => null)
  return peticion
}

interface Props {
  /** Clases del proyecto para la sección, el contenedor, el antetítulo, el título y la entradilla. */
  clases?: { seccion?: string; cont?: string; eyebrow?: string; h2?: string; lead?: string }
  /** Tratamiento del manual de marca: «tu» (por defecto) o «usted». */
  tratamiento?: 'tu' | 'usted'
}

export default function SeguridadComprobada({ clases = {}, tratamiento = 'tu' }: Props) {
  const usted = tratamiento === 'usted'
  const [datos, setDatos] = useState<Publico | null>(null)
  const [ampliada, setAmpliada] = useState<Fuente | null>(null)
  const dlg = useRef<HTMLDialogElement>(null)
  const origen = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    let vivo = true
    cargar().then((j) => { if (vivo) setDatos(j) })
    return () => { vivo = false }
  }, [])
  useEffect(() => {
    const d = dlg.current
    if (ampliada && d && !d.open && typeof d.showModal === 'function') d.showModal()
  }, [ampliada])

  const fuentes = (datos?.fuentes ?? [])
    .filter((f) => f && f.ok !== false && typeof f.url === 'string' && f.url.startsWith('https://') && f.medido && f.clave in FUENTES)
    .sort((a, b) => ORDEN.indexOf(a.clave) - ORDEN.indexOf(b.clave))
  if (!fuentes.length) return null
  const sitio = datos?.sitio || window.location.hostname
  const cerrar = () => dlg.current?.close()

  return (
    <section id="seguridad-comprobada" data-sc-listo={fuentes.length} aria-labelledby="seguridad-comprobada-titulo"
             className={`sc ${clases.seccion ?? ''}`}>
      <div className={clases.cont ?? 'sc-ancho'}>
        <p className={clases.eyebrow ?? 'sc-eyebrow'}>Seguridad comprobada</p>
        <h2 id="seguridad-comprobada-titulo" className={clases.h2 ?? 'sc-h2'}>{usted ? 'No le pedimos que nos crea: compruébelo usted' : 'No te pedimos que nos creas: compruébalo'}</h2>
        <p className={`sc-lead ${clases.lead ?? ''}`}>
          Herramientas públicas e independientes revisan este sitio: el cifrado de la conexión, las protecciones del
          navegador, la reputación ante los motores antimalware, el código y la accesibilidad. Aquí está lo que dicen, con
          la fecha de la medición, una captura real del informe y el enlace {usted ? 'para que lo verifique' : 'para que lo verifiques'} en la fuente.
        </p>
        <div className="sc-resumen">
          <p className="sc-resumen-n">
            <strong>{fuentes.length}</strong>{' '}
            {fuentes.length === 1 ? 'verificación independiente con la calificación más alta de su herramienta'
                                  : 'verificaciones independientes con la calificación más alta de cada herramienta'}
          </p>
          <p className="sc-resumen-f">
            Medido sobre {sitio}{datos?.ultima ? ` · última medición: ${fecha(datos.ultima)}` : ''} · se repite cada semana
          </p>
        </div>
        <ul className="sc-grid">
          {fuentes.map((f) => {
            const [trazo, explica] = FUENTES[f.clave]
            const nota = f.escritorio?.length ? String(Math.min(...f.escritorio.map(Number))) : String(f.valor ?? '')
            const cap = f.captura && CAPTURA.test(f.captura.src) ? f.captura : null
            const nombre = f.fuente || f.clave
            return (
              <li key={f.clave} className="sc-card">
                <div className="sc-cab">
                  <span className="sc-icono"><Icono d={trazo} /></span>
                  <div>
                    <h3 className="sc-fuente">{nombre}</h3>
                    {f.mide && <p className="sc-mide">{f.mide}</p>}
                  </div>
                  <p className={`sc-nota${nota.length > 6 ? ' sc-nota--larga' : ''}`}><span className="sc-sr">Resultado: </span>{nota}</p>
                </div>
                <p className="sc-explica">{explica}</p>
                {f.escritorio && f.movil ? (
                  <dl className="sc-psi">
                    {([['Escritorio', f.escritorio], ['Celular', f.movil]] as const).map(([disp, vals]) => (
                      <div key={disp}>
                        <dt>{disp}</dt>
                        <dd>
                          {CATEGORIAS.map((cat, i) => (
                            <span key={cat} title={cat} className="sc-psi-v"><b>{Number(vals[i]) || 0}</b><small>{cat}</small></span>
                          ))}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : f.detalle ? <p className="sc-detalle">{f.detalle}</p> : null}
                {cap && (
                  <button type="button" className="sc-cap" data-sc-captura={cap.src}
                          onClick={(e) => { origen.current = e.currentTarget; setAmpliada(f) }}>
                    <img src={cap.src} loading="lazy" decoding="async" width={cap.w || 1200} height={cap.h || 700}
                         alt={`Captura del informe de ${nombre} sobre ${sitio}: ${f.valor ?? ''}.`} />
                    <span className="sc-cap-ver"><Icono d={LUPA} /> Ampliar la captura</span>
                  </button>
                )}
                <p className="sc-pie">
                  <span>Medido el {fecha(f.medido)}</span>
                  <a href={f.url} target="_blank" rel="noopener noreferrer">
                    Verificar en {host(f.url)} <Icono d={EXTERNO} /><span className="sc-sr"> (se abre en otra pestaña)</span>
                  </a>
                </p>
              </li>
            )
          })}
        </ul>
        <p className="sc-nota-pie">
          Publicamos aquí solo las verificaciones en las que hoy tenemos la calificación más alta. Cada semana se vuelven a
          medir de forma automática; si un resultado deja de cumplir, sale de esta página hasta que lo corregimos. En las
          capturas se omite la dirección del servidor. Para reportar una vulnerabilidad:{' '}
          <a href="/.well-known/security.txt">security.txt</a>.
        </p>
      </div>
      <dialog ref={dlg} className="sc-dlg" aria-labelledby="sc-dlg-t"
              onClose={() => { setAmpliada(null); origen.current?.focus({ preventScroll: true }) }}
              onClick={(e) => { if (e.target === e.currentTarget) cerrar() }}>
        <div className="sc-dlg-cab">
          <h2 id="sc-dlg-t">{ampliada ? `Informe de ${ampliada.fuente || ampliada.clave}` : 'Informe'}</h2>
          <button type="button" className="sc-dlg-cerrar" onClick={cerrar}>Cerrar</button>
        </div>
        <div className="sc-dlg-cuerpo">
          {ampliada?.captura && (
            <figure className="sc-dlg-fig">
              <img src={ampliada.captura.src} width={ampliada.captura.w || 1200} height={ampliada.captura.h || 700}
                   alt={`Captura del informe de ${ampliada.fuente || ampliada.clave} sobre ${sitio}: ${ampliada.valor ?? ''}.`} />
              <figcaption>
                Captura real del informe, {fecha(ampliada.medido)}. Se omite la dirección del servidor.{' '}
                <a href={ampliada.url} target="_blank" rel="noopener noreferrer">Verificar en la fuente</a>
              </figcaption>
            </figure>
          )}
        </div>
      </dialog>
    </section>
  )
}
