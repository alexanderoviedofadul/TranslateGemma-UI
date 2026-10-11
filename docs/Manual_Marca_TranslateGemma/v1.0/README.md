# Manual de Marca TranslateGemma v1.0 — «De una orilla a otra»

Primer manual de marca del producto (11-oct-2026). Hasta esta versión la interfaz usaba el azul por defecto de su
plantilla (#3B82F6, con un degradado azul→índigo) y un globo de catálogo: nada propio y demasiado cerca del azul de
Google, dueño de la marca del modelo. Esta versión dibuja una identidad, la mide y la lleva a la portada, al traductor
y a la administración.

Una sola fuente (`contenido/*.json`) genera todo lo demás. **No se editan las salidas a mano.**

| Salida | Qué es |
|---|---|
| `index.html` | Recorrido inmersivo (abre por `file://`) |
| `TranslateGemma_Inmersivo_v1.html` | Portable autocontenido: fuentes, CSS, GSAP y logos en línea, sin red |
| `impresion.html` → `Manual_Marca_TranslateGemma_v1.pdf` | 39 páginas A4 apaisadas |
| `assets/logos/` | Símbolo, logotipos y favicons (SVG maestros + PNG) |
| `assets/data/tokens-v1.css` · `tokens_v1.json` | Paleta (20 colores) y las dos orillas |
| `../../../frontend/public/marca/` | Lo que sirve la web en `/marca`: tokens, woff2, logos, favicons, capas de la portada, escenas del recorrido y GSAP |

## Flujo

```bash
python3 -B docs/Manual_Marca_TranslateGemma/v1.0/scripts/fuentes_v1.py     # solo si cambian las fuentes
python3 -B docs/Manual_Marca_TranslateGemma/v1.0/scripts/build_v1.py
python3 -B docs/Manual_Marca_TranslateGemma/v1.0/scripts/export_pdf_v1.py
python3 -B docs/Manual_Marca_TranslateGemma/v1.0/scripts/audit_v1.py       # debe terminar en 0 fallos
python3 -B scripts/generar_og.py                                           # si cambian las capas o el logotipo
```

Después hay que recompilar el frontend (build y reinicio juntos: ver `CLAUDE.md` del repositorio).

## La marca en una línea por capítulo

| Cap. | Qué fija |
|---|---|
| 01 Origen | La interfaz de un modelo abierto de Google, que no es Google: el nombre y su regla |
| 02 Producto | Cinco paradas, 53 idiomas, límites del proxy y vistas, comprobados contra el código por el audit |
| 03 Símbolo | Cuadrado Jade con la línea que vuelve traducida; nombre en Inter 700 con «Translate» en Jade |
| 04 Color | 20 colores cerrados con el contraste de cada par de uso calculado (WCAG 2.1) |
| 05 Tipografía | Inter (interfaz y logotipo) y JetBrains Mono (códigos y datos), autoalojadas |
| 06 Interfaces | Portada, traductor y administración con los mismos tokens |
| 07 Aplicaciones | «Puente vivo», cabecera de una traducción guardada e imagen para compartir |
| 08 Tono | Claro, breve y sin promesas: dice dónde ocurre la traducción |
| 09 Web | Sin terceros al cargar, legible sin JavaScript, proxies cerrados |
| 10 Gobernanza | Versionado inmutable y bibliografía (25 fuentes) |

## Reglas

- **Versión inmutable**: un cambio de fondo abre `v1.1` o `v2.0` en su propia carpeta.
- **Escenas vectoriales**: las capas de la portada y las escenas del recorrido las dibuja `build_v1.py` con la paleta:
  deterministas, sin personas, sin texto legible y sin logos (la cuota diaria del generador de imágenes se había
  agotado ese día en los manuales anteriores, y el dibujo vectorial cuenta la metáfora con más exactitud).
- **No imitar a Google**: ni su azul, ni sus cuatro colores, ni su tipografía, ni su icono de traducción.
- **Kit de origen**: Manual TerminalForge v1.0 (← DeepMap, AuditorTecnicoIA, Pentest C360, Isabella EA, Maloca, ENKI y KANSA v6.0).
