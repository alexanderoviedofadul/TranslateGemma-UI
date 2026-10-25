# «Seguridad comprobada» y recorrido inmersivo (25-oct-2026)

TranslateGemma entra en la primera oleada del **kit «confianza y recorrido»**
(`Configuraciones_Equipos/VPS_Ubuntu_Hostinger/38-confianza-y-recorrido/`), el mismo trabajo de GPA, LHM Litigios y
el piloto (Cédula 360, Cartera360, PixelCV, Enki, Visores). Aquí va la **copia** del kit: no se edita en este repo.

## Qué se añadió

| Pieza | Dónde |
|---|---|
| Recorrido inmersivo: 7 capítulos (escriba, la pareja, en directo, una imagen, en este servidor, la cuenta, lo que no promete) en escenas, diapositivas y mapa | `frontend/public/conozca/` → **https://translate.cedula360.tech/conozca/** |
| Contenido (una sola fuente) | `frontend/conozca.json` (trato de **usted**, Inter y la paleta del Manual v1.0: Noche, Ribera, Agua) |
| Figuras | Las escenas del manual (`public/marca/paradas/tg-parada-*.svg`), las mismas del recorrido de la portada |
| Kit (motor, estilos, GSAP 3.15.0 local) | `frontend/public/kit-confianza/` (`KIT_VERSION` 1.0.4, `SHA256SUMS`) |
| Fuente para la página estática | `frontend/public/fnt/inter.css` (la Inter de `public/marca/fuentes/`) |
| «Seguridad comprobada» en la portada | `src/components/confianza/SeguridadComprobada.tsx` (`tratamiento="usted"`), antes de «Acceso»; colores en `globals.css` (`.tg-sc`) |
| Entradas al recorrido | el recorrido de la portada («Vea el recorrido completo», que **se conserva**), el pie («Recorrido del producto») y el modal de acceso («¿Primera vez aquí?») |
| `security.txt` (RFC 9116) | `import security-txt info@cedula360.tech` (el contacto del pie) en `translate.cedula360.tech` y su alias |

### Cómo se sirve

`/conozca/` es HTML estático del kit, fuera del enrutador de Next. Lo sirve **Caddy** desde
`/root/TranslateGemma-UI/frontend/public` (`handle @tg_conozca`), con `/conozca` → 308 a `/conozca/` y una **CSP
estricta propia** (`defer`). Despliegue: el webhook de siempre (`webhook-translate-deploy.sh`: devDependencies, la site
key de reCAPTCHA exportada desde `/root/.translate_secrets` antes del build, `.next` borrado antes de compilar y
reinicio solo con `BUILD_ID`). Comprobado: la site key está en `.next/static` (2 ficheros) y `NRestarts=0`.

### Reglas

- 🔴 **Ninguna cifra a mano** en «Seguridad comprobada»: la sección lee `/salud-publica/publico.json`, que escribe cada
  noche `/root/scripts/salud-publica-ronda.sh` con solo lo publicable (calificación más alta, menos de 45 días y enlace a
  la fuente). Sin nada publicable, la sección no se pinta.
- `components/confianza/SeguridadComprobada.tsx` es la versión React de `kit-confianza/sc-seguridad.js`: el mismo marcado
  (`data-sc-listo`, `data-sc-captura`, `dialog.sc-dlg`) y la hoja del kit; los colores van en `--sc-*`. Pide los datos en
  un efecto (en el servidor y en la hidratación pinta `null`).
- La copia del kit (`public/kit-confianza/`, con `KIT_VERSION` y `SHA256SUMS`) **no se edita aquí**: se edita el kit en
  `Configuraciones_Equipos/VPS_Ubuntu_Hostinger/38-confianza-y-recorrido/` y se vuelve a sincronizar.
- Las figuras del recorrido son ilustraciones del manual de marca o de la portada: **ninguna captura con datos de
  personas**.
- Regenerar: `node <kit>/generar-conozca.mjs frontend/conozca.json` (`--comprobar` dice si está al día) y
  `bash <kit>/../scripts/sincronizar-kit.sh frontend/public`.

## Medición antes y después (medidor del servidor y Familia 100)

| Herramienta | Antes (24-oct, 20:13) | Corrección | Después (20:55) |
|---|---|---|---|
| W3C | 0 errores | — | **0**: se publica |
| WAVE | 0 errores | — | **0**: se publica |
| Mozilla Observatory | B+ (80/100) | COOP y CORP (no suman: base < 90 por `'unsafe-inline'`) | B+ (80): no se publica |
| securityheaders | A | — | A: no se publica |
| websec-100 (`check-headers.sh`) | 6/8 (faltaban COOP y CORP) | COOP `same-origin-allow-popups` (reCAPTCHA) y CORP `same-site` | 8/8 |
| axe-core (e2e) | — | — | 0 violaciones |

Hoy se publican **2 verificaciones** (W3C y WAVE).

## Cambios en Caddy (fuera del repositorio)

- `translate.cedula360.tech`: `import security-txt info@cedula360.tech`, `import salud-publica
  translate.cedula360.tech`, `/conozca/*` desde `frontend/public` con su CSP estricta (`defer`),
  `Cross-Origin-Opener-Policy: same-origin-allow-popups` y `Cross-Origin-Resource-Policy: same-site`.
- `translate.alexanderoviedofadul.dev`: `security.txt` con `info@cedula360.tech`.
- Respaldo: `/root/backups/Caddyfile.pre-tg-conozca-20261024-205418` (600).

## Pendiente

- **CSP sin `'unsafe-inline'` en `script-src`** (Observatory B+ 80, securityheaders A): Next 16 necesita *nonce* por
  petición (middleware + `headers()`) y la CSP vive en Caddy. Cambio de arquitectura de las cabeceras.
- El modal de acceso tutea («¿No tienes cuenta? Regístrate») y el resto del sitio trata de usted; las entradas nuevas
  van de usted.
- `/api/pb/api/health` da 404 (el `handle /api/pb*` no quita el prefijo): ya era así; no lo usa el frontend
  (va por `/pbproxy`).
- IPv6/DNSSEC (internet.nl): cambios de DNS, decisión del operador.

## Pruebas

`<kit>/pruebas/e2e-conozca.mjs` en verde contra la vista previa (Caddy aislado en loopback con la CSP estricta en
`/conozca/`) y contra **producción**: arranque sin errores de consola ni de CSP, axe WCAG 2.2 A/AA con 0 violaciones
(estado final, índice, mapa, 390 px), teclado (D, →, M, I, Escape), «reducir movimiento», sin JavaScript, almacenamiento
bloqueado, 390/360/320 px sin desplazamiento horizontal, y la sección de la portada con su captura ampliable en un
diálogo. `npm run build` (Next 16) con la site key cargada, sin errores, y `audit_v1.py` del manual: 0 fallos. Revisión visual de las capturas en escritorio y celular. Barrido de los dominios de Caddy:
0 desviaciones.
