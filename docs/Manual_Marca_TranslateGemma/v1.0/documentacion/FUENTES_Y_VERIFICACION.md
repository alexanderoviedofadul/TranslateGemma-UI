# Fuentes y verificación — Manual de Marca TranslateGemma v1.0

Cada dato del manual sale de una de estas fuentes. `scripts/audit_v1.py` comprueba los de producto contra el código.

| Dato | Fuente | Cómo se verifica |
|---|---|---|
| 53 idiomas y sus 6 grupos | `frontend/src/lib/languages.ts` (`LANGUAGES`) | El audit compara la lista de `contenido/producto.json` con los códigos de `LANGUAGES` y que cada grupo sume lo que dice |
| 55 idiomas (lo que declara el modelo) | `docs/translategemma/README.md` | Solo se cita como dato del modelo; la lista negra impide usarlo como cifra del producto |
| Modelo por defecto `translategemma:latest` | `frontend/src/services/ollama.ts` | El audit busca `req.model || 'translategemma:latest'` |
| Un solo modelo instalado (4,3B, visión) | `ollama show translategemma:latest` (11-oct-2026) | Medición en el VPS; la lista negra impide anunciar 12B/27B |
| Solo modelos locales, 8 MB, 30/min por IP | `frontend/src/app/ollama/[...path]/route.ts` | El audit busca `MODELO_PERMITIDO`, la exclusión de `cloud`, `MAX_BYTES` y `MAX_POR_VENTANA` |
| Rutas de `/pbproxy` en lista blanca | `frontend/src/app/pbproxy/[...path]/route.ts` | El audit busca `RUTA_PERMITIDA` |
| Ctrl/Cmd + Enter | `frontend/src/components/TranslationPanel.tsx` | El audit busca el manejador |
| Vistas `/`, `/traducir`, `/admin` y acceso con Cédula 360 | `frontend/src/app/` | El audit comprueba que existen |
| Marca de Google | Gemma Terms of Use (`ollama show --license`) | Capítulo 01 y pie de la web |
| Contraste | WCAG 2.1, 1.4.3 | El build calcula cada razón; el capítulo 04 la publica |
