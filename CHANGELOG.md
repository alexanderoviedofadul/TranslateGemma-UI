# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Versionado Semántico](https://semver.org/lang/es/).

## [Unreleased]

### Fixed
- **El auto-deploy llevaba tiempo apagado: `WEBHOOK_SECRET` era el placeholder** (2026-08-09)
  - `translate-webhook.service` corría con `WEBHOOK_SECRET=tu_secreto_webhook_aqui_cambiar`,
    el valor de ejemplo nunca sustituido. GitHub firmaba cada entrega con el secret real del
    hook, el HMAC no coincidía y el servicio devolvía **401 `Invalid signature`**: los push a
    `main` **no desplegaban nada**.
  - **Sin síntoma visible**: el servicio figuraba `active`, el sitio respondía 200 y el
    endpoint aceptaba conexiones. Se detectó disparando un **ping real** de GitHub contra los
    57 webhooks del VPS (`POST /hooks/{id}/pings`) en vez de leer configuración.
  - Fix: secret de 32 bytes aleatorios en `/root/.translate_webhook_env` (0600) cargado por el
    drop-in `10-secret.conf` (`EnvironmentFile=`, que sobreescribe el `Environment=` del unit),
    y el mismo valor en el hook de GitHub. Verificado: ping **200 OK** y el journal pasó de
    `Invalid signature` a **`Signature validated`**.
  - **Regla**: un secret placeholder es un auto-deploy apagado que no avisa — el arranque debe
    abortar si el secret no está configurado, no aceptar un default. Y verificar un auto-deploy
    es **dispararlo**, no leer su configuración.
  - Doc: [`docs/FIX-WEBHOOK-SECRET-PLACEHOLDER-2026-08-09.md`](docs/FIX-WEBHOOK-SECRET-PLACEHOLDER-2026-08-09.md)

- **`ChunkLoadError` / CSS y JS como `text/plain` (500) en producción** (2026-05-28)
  - El navegador en `translate.cedula360.tech` no cargaba: los chunks de
    `/_next/static/chunks/*.css|*.js` devolvían `500` con MIME `text/plain`
    y `Uncaught ChunkLoadError`.
  - **Causa**: desincronización entre el `next-server` en memoria y `.next`
    en disco. Un `npm run build` manual (17/05 02:28) regeneró `.next` sin
    reiniciar el servicio (vivo desde 01:37), dejando el server sirviendo un
    HTML que referenciaba chunks ya sobrescritos/borrados.
  - **Solución**: `rm -rf .next` + build limpio + `systemctl restart
    translate-frontend`. Verificado: 8/8 chunks → `200` con MIME correcto en
    local y vía Caddy.
  - **Prevención**: el script de deploy del webhook ahora ejecuta `rm -rf .next`
    antes del build (ya encadenaba `npm run build` + restart).
  - Docs: [`docs/INCIDENTE-CHUNKLOADERROR-2026-05-28.md`](docs/INCIDENTE-CHUNKLOADERROR-2026-05-28.md),
    sección 3 de [`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md),
    [`docs/WEBHOOK-DEPLOYMENT.md`](docs/WEBHOOK-DEPLOYMENT.md).

### Added
- **Landing pública + proxies same-origin + cableado de secretos** (2026-05-17)
  - Nueva landing pública en `/` (Tailwind coherente, dark-mode,
    responsive, accesible) que presenta el proyecto con CTAs claros:
    "Usar el traductor" → `/traducir`, "Administración" → `/admin`,
    mención de la alianza Cédula 360 + login (normal + Cédula 360).
  - Reestructura de rutas: `/` = landing, `/traducir` = herramienta
    (antes en `/`), `/admin` = panel. Header/footer coherentes en las
    3 vistas (`MarketingHeader`, `SiteFooter`).
  - **Proxy same-origin `/ollama/[...path]`**: el navegador ya no llama
    Ollama directo (mixed-content/host privado); Next.js reenvía a
    `OLLAMA_HOST` server-side. Whitelist `api/tags|chat|version` (403
    el resto). Soporta streaming NDJSON.
  - **Proxy same-origin `/pbproxy/[...path]`**: el SDK PocketBase del
    navegador apunta a `/pbproxy` (la regla Caddy `/api/pb*` no
    reescribía el prefijo → 404). Sin tocar Caddy/DNS.
  - **Fix crítico**: `start.sh` ahora carga `/root/.translate_secrets`
    en runtime (el servicio systemd sólo cargaba `.env` sin secretos),
    por lo que la alianza Cédula 360 / impersonate / reCAPTCHA **antes
    no funcionaban en producción**. El deploy script inlina además
    `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` en build.
  - Fix overflow horizontal del header del traductor en móvil (~390px);
    eliminado botón "Settings" muerto; header con enlace a Inicio.
  - `/admin` sin sesión ahora ofrece login (modal con Cédula 360 + 2FA)
    en vez de sólo "Ir al inicio". RBAC viewer/admin intacto.
  - Doc: `docs/POLISH-VALIDACION-2026-05-17.md`.
- **Alianza "Continuar con Cédula 360"** + capa admin (2026-05-16)
  - Route Handlers Next.js `app/api/auth/cedula360`, `/challenge`, `/verify`
    que validan server-to-server contra la API REAL de Cédula 360
    (`:3081`, override `CEDULA360_API_BASE`; nunca el stub `:9091`).
  - Reenvío de IP real del usuario (`X-Forwarded-For`/`X-Real-IP`) para
    no compartir el bucket de rate-limit (10/min) de Cédula 360.
  - Token de sesión emitido vía PocketBase **impersonate** (superusuario);
    upsert de `users` con rol normal `viewer`, sin escalar roles, sin
    guardar la contraseña de Cédula 360.
  - reCAPTCHA v3 (claves Cédula 360, umbral 0.3, fail-open).
  - Botón "Continuar con Cédula 360" + 2FA inline en `AuthModal`.
  - Panel `/admin` mínimo con RBAC (viewer vs admin), Mi perfil y
    listado de usuarios. Campo `role` añadido a la colección `users`.
  - Dominio primario migrado a `translate.cedula360.tech`
    (`translate.alexanderoviedofadul.dev` → 301). Footer/landing con
    badge "en alianza con Cédula 360" y contacto `info@cedula360.tech`.
  - Doc: `docs/ALIANZA-CEDULA360-2026-05-16.md`.

### Pendientes
- **Operador**: añadir `translate.cedula360.tech` a los dominios de la
  llave reCAPTCHA de Cédula 360 en la consola de Google (mitigado por
  el fail-open `score 0.3`).
- **Limitación de infra conocida**: la traducción real depende de
  Ollama local (CPU capada bajo la carga del VPS compartido); la
  alianza/login/UX operan igual.
- **Conceder app-admin**: `users.role = admin` en PocketBase (PB
  superuser); por defecto los usuarios de alianza son `viewer`.
- **Infra compartida (transversal)**: serializar deploys por webhook /
  nice-cgroup tras el incidente de carga del VPS (contenido; producción
  saludable).
- Detalle accionable en `docs/POLISH-VALIDACION-2026-05-17.md` §6.

- Documentación inicial de TranslateGemma
  - README.md con descripción y uso básico
  - MODELS.md con detalles de los modelos 4B, 12B, 27B
  - PROMPT_GUIDE.md con formato y ejemplos de prompts
  - LANGUAGES.md con lista de 55 idiomas soportados
- Prompts especializados
  - UI_UX_DESIGNER_PROMPT.md para diseñadores
  - ARCHITECTURE_PROMPT.md para arquitectos
- Archivos de configuración del proyecto
  - README.md principal
  - CHANGELOG.md
  - LICENSE (MIT)
  - .gitignore
  - .env y .env.example
  - requirements.txt
- Arquitectura e Integraciones
  - Documentación de integración con PocketBase
  - Decisión arquitectónica: FastAPI vs Integración Directa
  - Análisis de rendimiento de servidor Ollama
- Planificación de Implementación
  - Roadmap detallado con 6 fases
  - Stack tecnológico: Next.js 16 + React 19 + PocketBase

### Frontend Implementation
- Next.js 16 project with TypeScript, Tailwind CSS 4, and Turbopack
- UI Components: TranslationPanel, LanguageSelector, ModelSelector, Header
- Services: Ollama API with streaming, PocketBase SDK for auth/history
- Zustand state management with persistence
- 55 languages support from TranslateGemma docs
- Image translation (multimodal) component
- PWA manifest for installable web app
- Dark mode with system preference detection

### Deployment Infrastructure
- Dockerfile for Next.js standalone production build
- docker-compose.yml with Frontend + Ollama + PocketBase services
- Environment configuration for development and production

### Fixes
- **API**: Resolved sorting issue in history API (changed from `-created` to `-id`).
- **UI**: Fixed hydration error in `TranslationHistory` (nested buttons).
- **Mobile**: Improved responsiveness for Auth Modal and Header.
- **Theme**: Fixed Theme Toggle logic for system preference.

## [0.1.0] - 2026-01-18

### Added
- Estructura inicial del proyecto
- Investigación y documentación de TranslateGemma
- Configuración base para integración con Ollama
