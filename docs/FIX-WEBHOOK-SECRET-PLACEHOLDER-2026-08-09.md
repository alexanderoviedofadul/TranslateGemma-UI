# El auto-deploy llevaba tiempo apagado: `WEBHOOK_SECRET` era el placeholder (2026-08-09)

## Síntoma

Ninguno visible. El servicio `translate-webhook.service` figuraba `active`, el sitio
respondía 200 y el endpoint `https://translate.alexanderoviedofadul.dev/webhook` aceptaba
conexiones. Simplemente **los push a `main` no desplegaban nada**.

## Cómo se detectó

Validando otra cosa (el cambio de nombre de usuario de GitHub) se disparó un **ping real**
contra los 57 webhooks del VPS vía la API — `POST /repos/{owner}/{repo}/hooks/{id}/pings` —
en vez de leer configuración. Este devolvió **401**:

```
code=401  Invalid HTTP Response: 401
```

Y el journal del servicio lo explicaba con todas las letras:

```
translate-webhook[957294]: [2026-08-10T03:...] Invalid signature
```

## Causa raíz

El unit corría con el valor de ejemplo, nunca sustituido:

```ini
Environment=NODE_ENV=production WEBHOOK_SECRET=tu_secreto_webhook_aqui_cambiar
```

GitHub firmaba cada entrega con el secret real del hook; `/root/scripts/webhook-server.js`
calculaba el HMAC con el placeholder, no coincidían, y devolvía 401 en
`x-hub-signature-256`. El servicio funcionaba perfectamente: rechazaba, como debía, una
firma que no podía validar.

## Fix

Secret real de 32 bytes aleatorios, fuera del unit, y alineado en ambos extremos:

```bash
openssl rand -hex 32 > (valor)
/root/.translate_webhook_env          # chmod 600, WEBHOOK_SECRET=<valor>
/etc/systemd/system/translate-webhook.service.d/10-secret.conf   # EnvironmentFile=
```

Y el mismo valor en la configuración del hook en GitHub (`PATCH .../hooks/{id}` con
`config.secret`). El `EnvironmentFile` del drop-in sobreescribe el `Environment=` del unit,
así que el placeholder quedó sin efecto sin tener que editar el unit original.

## Verificación

Ping real de GitHub tras el cambio:

```
TranslateGemma-UI    200 OK
```

Y en el journal, la línea que antes decía `Invalid signature`:

```
translate-webhook[3592147]: [2026-08-10T03:12:26Z] Signature validated
translate-webhook[3592147]: [2026-08-10T03:12:26Z] Event ignored: ping
```

(«Event ignored: ping» es correcto: sólo despliega en `push`.)

## Reglas

- **Un secret placeholder es un auto-deploy apagado, y no avisa.** El servicio sigue vivo,
  responde y rechaza correctamente; nada en un healthcheck de servicios lo delata. Al
  desplegar un webhook, el arranque debe **abortar** si el secret no está configurado, en vez
  de aceptar un valor por defecto. (`webhook-curaduria.js` del VPS lo hace bien:
  `FATAL: CURADURIA_WEBHOOK_SECRET no está configurado`.)
- **Verificar un auto-deploy es dispararlo, no leer su configuración.** El ping de la API de
  GitHub ejercita la cadena completa: DNS → Caddy → servicio → HMAC. Revisar
  `last_response` de cada hook periódicamente detecta esto sin esperar a que alguien note que
  su push no llegó.

## Nota sobre el script compartido

`/root/scripts/webhook-server.js` lo comparten tres servicios: `translate-webhook`,
`parla-webhook` y `ftp-tutelas-webhook`. Sólo `parla` tenía secret real
(`/root/.parla_secrets`) y respondía 200. Al tocar ese script, tener presentes los tres.
