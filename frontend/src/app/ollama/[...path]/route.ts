/**
 * Proxy same-origin hacia el servidor Ollama.
 *
 * Por qué: el navegador NO puede hablar directo con Ollama
 *  - `NEXT_PUBLIC_OLLAMA_HOST` apuntaría a un host privado / mixed-content
 *    (http:// desde una página https:// → bloqueado por el navegador).
 *  - Caddy sólo expone Next.js (3003) y PocketBase; no hay ruta pública
 *    a Ollama.
 *
 * Solución aditiva (sin tocar Caddy/DNS): el navegador llama
 * `/ollama/...` (mismo origen) y este Route Handler lo reenvía al
 * `OLLAMA_HOST` server-side. Soporta streaming (NDJSON de Ollama).
 *
 * Rutas permitidas (whitelist): sólo `api/tags`, `api/chat` y `api/version`.
 * Cualquier otra → 403. No es un proxy abierto.
 *
 * 🔴 2026-10-11 — modelos en lista blanca. El proxy es anónimo y el Ollama
 * del VPS tiene registrados los modelos de **Ollama Cloud** (`*:cloud`): sin
 * esta lista, cualquiera podía usar desde aquí cualquier modelo del daemon,
 * cloud incluidos, saltándose el token que protege el Ollama público desde el
 * 10-oct y gastando su cuota. Ahora sólo pasan los modelos locales de
 * traducción (`translategemma*`, `gemma3*`), `api/tags` lista sólo esos, el
 * cuerpo tiene tope de tamaño y hay un límite de peticiones por IP.
 * `OLLAMA_HOST` debe ser el daemon local (`http://127.0.0.1:11434`): el público
 * exige token y daba 401 a todas las traducciones.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OLLAMA_HOST = (
  process.env.OLLAMA_HOST ||
  process.env.NEXT_PUBLIC_OLLAMA_HOST ||
  'http://127.0.0.1:11434'
).replace(/\/$/, '');

const ALLOWED = new Set(['api/tags', 'api/chat', 'api/version']);

/** Modelos locales de traducción. Nunca un id de Ollama Cloud. */
const MODELO_PERMITIDO = /^(translategemma|gemma3)(:[A-Za-z0-9._-]+)?$/;
function modeloPermitido(nombre: unknown): boolean {
  return (
    typeof nombre === 'string' &&
    MODELO_PERMITIDO.test(nombre) &&
    !/cloud/i.test(nombre)
  );
}

/** Tope del cuerpo: texto + una imagen en base64. */
const MAX_BYTES = 8 * 1024 * 1024;

/** Límite por IP: N peticiones de traducción por ventana. */
const VENTANA_MS = 60_000;
const MAX_POR_VENTANA = 30;
const contador = new Map<string, { desde: number; n: number }>();
function limitar(ip: string): boolean {
  const ahora = Date.now();
  const c = contador.get(ip);
  if (!c || ahora - c.desde > VENTANA_MS) {
    if (contador.size > 5000) contador.clear();
    contador.set(ip, { desde: ahora, n: 1 });
    return true;
  }
  c.n += 1;
  return c.n <= MAX_POR_VENTANA;
}
function ipDe(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  return xff.split(',')[0].trim() || req.headers.get('x-real-ip') || 'local';
}

function resolvePath(parts: string[]): string | null {
  const p = parts.join('/');
  return ALLOWED.has(p) ? p : null;
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const sub = resolvePath(path);
  if (!sub) {
    return NextResponse.json({ error: 'ruta no permitida' }, { status: 403 });
  }
  try {
    const r = await fetch(`${OLLAMA_HOST}/${sub}`, { cache: 'no-store' });
    if (sub === 'api/tags' && r.ok) {
      const data = (await r.json()) as { models?: { name?: string }[] };
      const models = (data.models || []).filter((m) => modeloPermitido(m.name));
      return NextResponse.json({ models });
    }
    const body = await r.text();
    return new NextResponse(body, {
      status: r.status,
      headers: { 'Content-Type': r.headers.get('content-type') || 'application/json' },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Ollama no disponible: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  const sub = resolvePath(path);
  if (!sub || sub !== 'api/chat') {
    return NextResponse.json({ error: 'ruta no permitida' }, { status: 403 });
  }
  if (!limitar(ipDe(req))) {
    return NextResponse.json(
      { error: 'Demasiadas traducciones seguidas. Espera un minuto.' },
      { status: 429, headers: { 'Retry-After': '60' } }
    );
  }
  const declarado = Number(req.headers.get('content-length') || 0);
  if (declarado > MAX_BYTES) {
    return NextResponse.json({ error: 'Petición demasiado grande' }, { status: 413 });
  }
  let texto: string;
  try {
    texto = await req.text();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  if (texto.length > MAX_BYTES) {
    return NextResponse.json({ error: 'Petición demasiado grande' }, { status: 413 });
  }
  let payload: { model?: unknown } & Record<string, unknown>;
  try {
    payload = JSON.parse(texto);
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }
  if (!modeloPermitido(payload.model)) {
    return NextResponse.json(
      { error: 'Modelo no permitido: solo los modelos locales de traducción' },
      { status: 403 }
    );
  }
  try {
    const upstream = await fetch(`${OLLAMA_HOST}/${sub}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      cache: 'no-store',
    });
    // Stream tal cual (Ollama emite NDJSON cuando stream:true)
    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('content-type') || 'application/x-ndjson',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Ollama no disponible: ${(e as Error).message}` },
      { status: 502 }
    );
  }
}
