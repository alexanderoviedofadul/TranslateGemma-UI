# Rediseño de octubre de 2026 — Manual de Marca v1.0, portada y vistas

**Fecha**: 11-oct-2026 · **Manual**: [`docs/Manual_Marca_TranslateGemma/v1.0/`](../Manual_Marca_TranslateGemma/v1.0/README.md)

## 1. Qué había

- **La traducción no funcionaba.** El proxy `/ollama` apuntaba al Ollama público del VPS
  (`https://ollama.alexanderoviedofadul.dev`), que exige token desde el pentest del 10-oct-2026: `api/tags` y
  `api/chat` respondían **401** y la página no traducía nada. El sitio daba 200 y Lighthouse 96–100: nada lo delataba.
- **Los despliegues automáticos fallaban desde agosto.** `webhook-translate-deploy.sh` corre con
  `NODE_ENV=production`; `npm install` no instala entonces las devDependencies (Tailwind, `@tailwindcss/postcss`,
  TypeScript) y el build muere con `Cannot find module '@tailwindcss/postcss'` (log del 9-ago y del 11-oct). El script
  borra `.next` **antes** de compilar: tras un fallo, el servicio sigue vivo solo porque tiene la versión anterior en
  memoria, y el siguiente reinicio lo deja sin `BUILD_ID` (el bucle de 624 reinicios del 11-sep).
- **El panel de superusuario de PocketBase estaba en Internet** en `/pbproxy/_/`: el proxy reenviaba cualquier ruta.
- **Marca prestada**: el azul por defecto de la plantilla (#3B82F6, que con texto blanco no llega a AA), un degradado
  azul→índigo, una «T» en un cuadrado como logo, el favicon de Next.js e Inter pedida a Google Fonts.
- **Afirmaciones sin respaldo**: «100% local», «Sin internet», «55 idiomas» (el selector tiene 53) y «elige entre 4B,
  12B o 27B» (hay un solo modelo instalado). El pie enlazaba al usuario de GitHub anterior (`bladealex9848`).

## 2. Qué hay ahora

| Pieza | Cambio |
|---|---|
| Proxy `/ollama` | Apunta al **Ollama local**; **lista blanca de modelos** (`translategemma*`, `gemma3*`, nunca `*cloud*`), `api/tags` filtrado, tope de 8 MB y **30 traducciones por minuto e IP** (commit `e9dd52a`). Ver §5 |
| Proxy `/pbproxy` | Solo `users`, `translations` (sin `impersonate`), `api/health` y `api/realtime`; lo demás, 404 |
| Manual de Marca v1.0 | «De una orilla a otra»: símbolo propio, paleta Jade de 20 colores con dos orillas (Agua y Ámbar), Inter y JetBrains Mono autoalojadas; 39 páginas, inmersivo, portable y `audit_v1.py` con 0 fallos |
| Portada `/` | Hero con las dos orillas dentro del recinto (el servidor) en cinco capas con paralaje; recorrido de cinco paradas con escena fija; los 53 idiomas por grupo y con su nombre propio (de `languages.ts`); límites; «lo que no promete»; acceso; preguntas |
| `/traducir` y `/admin` | Mismos tokens, logo y pie; contraste AA en claro y oscuro; `<main>` y encabezados en orden |
| Global | Sin Google Fonts (`next/font/google` fuera); favicon, manifest e imagen para compartir de la marca; pie con la nota «TranslateGemma y Gemma son marcas de Google; este producto no está afiliado a Google» |

El paralaje y el recorrido son mejoras: la portada se lee entera sin JavaScript. GSAP y ScrollTrigger (los del kit,
en `/marca/vendor/`) se cargan solo tras la primera interacción y nunca con movimiento reducido. Ningún tercero al
cargar; reCAPTCHA v3 solo al usar el acceso con Cédula 360.

## 3. De dónde sale cada dato

`frontend/src/lib/marca.ts` y el capítulo 02 del manual: 53 idiomas de `lib/languages.ts`, el modelo por defecto de
`services/ollama.ts` (`translategemma:latest`, 4,3B según `ollama show`), los límites del proxy y el atajo
Ctrl/Cmd + Enter de `TranslationPanel.tsx`. El audit del manual los comprueba contra el código en cada build.

## 4. Medición (Lighthouse 12.6.0 móvil, producción, 3 corridas)

| Vista | Antes (rend. · acces. · prácticas · SEO) | Después |
|---|---|---|
| `/` | 99–100 · 98 · 100 · 100 (LCP 1,7–2,0 s, 236 KiB) | 89–100 · **100** · 100 · 100 (LCP 1,4–2,0 s, 310 KiB) |
| `/traducir` | 96–99 · 90 · 100 · 100 | 99–100 · **100** · 100 · 100 |
| `/admin` | 97–99 · 93 · 100 · 100 | 98–99 · **100** · 100 · 100 |

- El 89 de la portada es una corrida con TBT de 440 ms; las otras dos dan 99 y 100 con 50–60 ms: el TBT oscila
  entre corridas en este VPS compartido (carga media 15 durante la medición).
- El «antes» medía una página que no traducía (todas las llamadas al modelo daban 401).
- Playwright en producción, `/`, `/traducir` y `/admin` a 1440 y 390 px: consola 0, sin desborde, 0 peticiones a
  terceros; también con la CSP propuesta en §6 inyectada. **axe 0** en las tres vistas, en claro y en oscuro, a los
  dos anchos (antes: `button-name`, `color-contrast`, `heading-order`, `link-name`, `landmark-one-main`).
- **Traducción real desde el navegador**: «Good morning, how are you?» → «Buenos días, ¿cómo…» en 22 s (el primer
  token tarda por la carga del VPS; con el modelo en memoria, 1–2 s por token).

## 5. Seguridad

1. 🔴 **Proxy `/ollama` abierto a los modelos de la nube (cerrado).** El daemon de Ollama del VPS tiene registrados
   los modelos de Ollama Cloud. Al pasar el proxy (anónimo) al Ollama local para que la traducción volviera a
   funcionar, `api/tags` listó 19 modelos `*:cloud` y `api/chat` los habría servido a cualquiera, saltándose el token y
   gastando la cuota. Se revirtió en minutos y se volvió al local solo con la lista blanca desplegada; durante ese rato
   no consta ninguna petición de terceros (el bloque de Caddy no registra accesos, ver §6). Hoy: un id `*:cloud`
   recibe **403**, `api/pull` 403, `api/tags` lista solo `gemma3:latest` y `translategemma:latest`.
2. 🔴 **Panel de PocketBase en Internet (cerrado).** `/pbproxy/_/` servía la página de acceso del superusuario.
   Hoy 404, igual que `api/collections/_superusers/*` e `impersonate`.
3. **Webhook sin firma obligatoria (fuera del repositorio, pendiente).** `/root/scripts/webhook-server.js` valida la
   firma **solo si llega la cabecera**: un POST sin `X-Hub-Signature-256` con evento `push` lanza el despliegue. El mismo
   script lo usan también `parla-webhook` y `ftp-tutelas-webhook`.

## 6. Fuera del repositorio — aplicado por el operador el 11-oct-2026

- **Despliegue** (`/root/scripts/webhook-translate-deploy.sh`, copia `….pre-build-seguro-20261011`): instala con
  `NODE_ENV=development npm install --include=dev`, guarda `.next` en `.next.prev`, compila en limpio y solo reinicia
  si el build termina **y** deja `.next/BUILD_ID`; si no, restaura la copia y sale con error sin reiniciar.
- **Webhook** (`/root/scripts/webhook-server.js`, copia `….pre-firma-20261011`; solo lo usa `translate-webhook`:
  Parla y FTP Tutelas tienen el suyo): la firma es obligatoria y se compara en tiempo constante; sin firma o con
  firma falsa, 401 (probado). Las entregas de GitHub ya venían firmadas con el secreto de la unidad.
- **Caddy** (copia `/etc/caddy/Caddyfile.bak.pre-translategemma-rediseno-20261011_153639`): la CSP propuesta,
  `encode @comprimible zstd gzip` (fuera `/ollama/*`, `/webhook*` y `/pbproxy/api/realtime*`), caché de `/marca/*` y
  `log` a `/var/log/caddy/translate.log`. Comprobado: los chunks salen con `zstd`; `/`, `/traducir` y `/admin` a 1440
  y 390 px con consola 0, incluido reCAPTCHA al escribir en el acceso.
- 🔴 **Trampa al añadir el `log`**: `caddy validate` (como root) **crea** el fichero de log con dueño root y modo 600,
  y el `reload` siguiente falla porque Caddy (usuario `caddy`) no puede abrirlo. Producción no se cae (rechaza la
  configuración nueva y sigue con la anterior). Arreglo: `chown caddy:caddy` y `chmod 644` antes de recargar.
- `/api/pb*` del bloque apunta al PocketBase `:8094`, pero responde 404 a `/_/`, `/api/health` y colecciones (la
  ruta no casa con el prefijo); el panel tampoco es accesible por `/pbproxy/_/`.

## 7. Trampas que dejó

- **Un 200 y un Lighthouse de 100 no dicen que el producto funcione**: la página cargaba perfecta y no traducía.
- **El daemon local de Ollama no es «solo local»**: tiene registrados los modelos de la nube. Un proxy hacia él
  necesita lista blanca de modelos, no solo de rutas.
- **`next build` en el árbol servido publica al instante** y, si falla tras `rm -rf .next`, deja el servicio a un
  reinicio de caer. Ensayar en un worktree aparte (aquí, `npm ci` propio y `next start` en otro puerto).
- **Una heredoc sin comillas en bash ejecuta las comillas invertidas** del texto que lleva dentro: usar `<<'EOF'`.
- **`hidden` y `inline-flex` en la misma etiqueta**: gana el que Tailwind emite después; para ocultar un componente
  que fija su propio `display`, envolverlo.
