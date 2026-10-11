/**
 * Proxy same-origin hacia PocketBase (127.0.0.1:8094).
 *
 * Por qué: el SDK de PocketBase corre en el navegador. `127.0.0.1:8094`
 * no es alcanzable desde el cliente, y la regla Caddy `/api/pb*` NO
 * reescribe el prefijo (PocketBase recibiría `/api/pb/api/...` → 404).
 *
 * Solución aditiva (sin tocar Caddy/DNS): el SDK usa baseURL `/pbproxy`
 * (mismo origen → Caddy lo enruta a Next.js 3003) y este handler
 * reenvía a PocketBase preservando método, headers de auth, query y
 * body. Soporta GET/POST/PATCH/DELETE.
 *
 * 🔴 2026-10-11 — rutas en lista blanca. Antes reenviaba CUALQUIER ruta, así
 * que el panel de superusuario de PocketBase quedaba en Internet en
 * `/pbproxy/_/` (página de login: superficie de fuerza bruta). Ahora solo pasan
 * las que usa el SDK del navegador: las colecciones `users` y `translations`
 * (sin `impersonate`), `api/health` y `api/realtime`. El resto → 404. El
 * servidor habla con PocketBase directamente (lib/server/pb-admin.ts), no por
 * aquí.
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PB_URL = (
  process.env.POCKETBASE_URL ||
  process.env.NEXT_PUBLIC_POCKETBASE_URL ||
  'http://127.0.0.1:8094'
).replace(/\/$/, '');

const RUTA_PERMITIDA =
  /^api\/(health|realtime|collections\/(users|translations)(\/(?!impersonate\b)[A-Za-z0-9_.\-\/]*)?)$/;

async function forward(req: Request, parts: string[]): Promise<Response> {
  const url = new URL(req.url);
  const sub = parts.join('/');
  if (!RUTA_PERMITIDA.test(sub) || sub.includes('..')) {
    return NextResponse.json({ message: 'Not found', status: 404 }, { status: 404 });
  }
  const target = `${PB_URL}/${sub}${url.search}`;

  const headers: Record<string, string> = {};
  const auth = req.headers.get('authorization');
  if (auth) headers['Authorization'] = auth;
  const ct = req.headers.get('content-type');
  if (ct) headers['Content-Type'] = ct;

  const method = req.method.toUpperCase();
  const init: RequestInit = { method, headers, cache: 'no-store' };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await req.arrayBuffer();
  }

  try {
    const r = await fetch(target, init);
    const buf = await r.arrayBuffer();
    return new NextResponse(buf, {
      status: r.status,
      headers: {
        'Content-Type': r.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json(
      { message: `PocketBase no disponible: ${(e as Error).message}`, status: 502 },
      { status: 502 }
    );
  }
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}
export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}
export async function PATCH(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}
export async function DELETE(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}
export async function PUT(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(req, (await ctx.params).path);
}
