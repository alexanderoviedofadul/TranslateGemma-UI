# CLAUDE.md — TranslateGemma UI

Lo que no se deduce leyendo el código, y las trampas que no dan error.

## Qué es

Interfaz web (Next.js 16) del modelo abierto de traducción **TranslateGemma** (Google DeepMind), servido con
**Ollama en el mismo VPS**. `translate.cedula360.tech` (`translate.alexanderoviedofadul.dev` → 301). Portada `/`,
traductor `/traducir`, administración `/admin`, acceso propio o «Continuar con Cédula 360».

## Despliegue

| Pieza | Detalle |
|---|---|
| Frontend | `translate-frontend.service` → `start.sh` → `next start` en `:3003`. `EnvironmentFile=/root/TranslateGemma-UI/.env` (fuera de git) + `/root/.translate_secrets` (600) |
| PocketBase | `translate-pocketbase.service` en `127.0.0.1:8094` |
| Webhook | `translate-webhook.service` (`/root/scripts/webhook-server.js`, `:3004`, **firma obligatoria** desde el 11-oct-2026) → `/root/scripts/webhook-translate-deploy.sh` (fuera del repo; desde el 11-oct instala devDependencies y solo reinicia si hay `BUILD_ID`) |
| Caddy | Bloque `translate.cedula360.tech`: `/webhook*` → 3004, `/api/pb*` → 8094, el resto → 3003 |

🔴 **Build y `systemctl restart translate-frontend` siempre juntos, y nunca reiniciar sin `frontend/.next/BUILD_ID`**:
sin él el servicio entra en bucle (624 reinicios el 11-sep-2026) y un build sobrescrito sin reinicio sirve chunks
huérfanos (incidente del 28-may).

🔴 **El build necesita las devDependencies** (Tailwind, `@tailwindcss/postcss`, TypeScript). `npm install` con
`NODE_ENV=production` —el entorno del webhook— no las instala y el build falla con
`Cannot find module '@tailwindcss/postcss'`; el script borra `.next` antes de compilar. Instalar con
`NODE_ENV=development npm install --include=dev` y compilar con los secretos cargados (la site key de reCAPTCHA se
inlinea en el build: ver `start.sh` y el script de despliegue). Detalle: `docs/rediseno-2026-10/README.md`.

🔴 **`OLLAMA_HOST` debe ser el Ollama local** (`http://127.0.0.1:11434`). El público
(`https://ollama.alexanderoviedofadul.dev`) exige token desde el pentest del 10-oct-2026: apuntado allí, toda
traducción da 401 y la página no muestra más que un error genérico.

## Recorrido y «Seguridad comprobada» (desde el 25-oct-2026)

- `/conozca/` (`frontend/public/conozca/`) lo genera el kit «confianza y recorrido» desde `frontend/conozca.json` y lo
  **sirve Caddy** (`handle @tg_conozca`, CSP estricta propia), no Next. `public/kit-confianza/` es una **copia**.
- `components/confianza/SeguridadComprobada.tsx` (`tratamiento="usted"`) lee `/salud-publica/publico.json` y no se
  pinta sin mediciones publicables. 🔴 Ninguna cifra a mano. Ver [docs/seguridad-comprobada-y-recorrido-2026-10-25.md](docs/seguridad-comprobada-y-recorrido-2026-10-25.md).

## Seguridad (proxies)

- 🔴 **`/ollama` solo admite modelos locales de traducción** (`translategemma*`, `gemma3*`, nunca `*cloud*`), filtra
  `api/tags`, limita a 8 MB y 30 traducciones por minuto e IP (`app/ollama/[...path]/route.ts`). El daemon del VPS
  tiene registrados los modelos de **Ollama Cloud**: sin la lista blanca, el proxy anónimo los ofrecería gratis a
  cualquiera, saltándose el token. Si se añade un modelo local, va a la expresión `MODELO_PERMITIDO`.
- 🔴 **`/pbproxy` solo reenvía `users`, `translations`, `api/health` y `api/realtime`** (sin `impersonate`). Antes
  reenviaba todo y el panel de superusuario de PocketBase quedaba en Internet en `/pbproxy/_/`.

## Marca

- Manual de Marca v1.0 «De una orilla a otra» en `docs/Manual_Marca_TranslateGemma/v1.0/` (inmutable). Su build
  escribe `frontend/public/marca/` (tokens, fuentes, logos, capas de la portada, escenas y GSAP): **no editar allí**.
  Flujo: `build_v1.py` → `export_pdf_v1.py` → `audit_v1.py` (0 fallos) → `python3 -B scripts/generar_og.py`.
- `frontend/src/app/globals.css` importa `public/marca/tokens-v1.css` y define las utilidades `tg-*` de Tailwind.
- **TranslateGemma y Gemma son marcas de Google**: la identidad no imita a Google y el pie lo dice. El símbolo de
  `components/marca/Logo.tsx` es el del maestro (el audit lo compara).
- Cifras: el selector tiene **53** idiomas (`lib/languages.ts`), no 55 (eso declara el modelo). Hay **un** modelo
  instalado (`translategemma:latest`, 4,3B): no anunciar 12B/27B ni «100 % local / sin internet».
