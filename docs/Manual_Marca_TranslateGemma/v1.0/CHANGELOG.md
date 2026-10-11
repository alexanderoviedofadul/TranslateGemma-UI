# Changelog — Manual de Marca TranslateGemma

## [1.0.0] - 2026-10-11 — «De una orilla a otra»

- Primer manual de marca. Sustituye el azul de la plantilla (#3B82F6 y el degradado azul→índigo) y el globo de
  catálogo: símbolo propio (una línea de origen que gira y vuelve como línea de destino, en blanco sobre un cuadrado
  Jade), logotipo en Inter 700 trazado en curvas con «Translate» en Jade, paleta cerrada de 20 colores con su
  contraste calculado y dos orillas (Agua para el origen, Ámbar para el destino). Inter y JetBrains Mono autoalojadas.
- 11 capítulos y 39 páginas A4 apaisadas desde una sola fuente (`contenido/*.json`); inmersivo, portable sin red y PDF.
- Portada «Las dos orillas» en cinco capas y cinco escenas del recorrido, vectoriales, exportadas a
  `frontend/public/marca/` junto con tokens, fuentes, logos y GSAP.
- `audit_v1.py` comprueba contra el código los 53 idiomas y sus grupos, el modelo por defecto, los campos de la
  petición, los límites y la lista blanca del proxy `/ollama`, la del proxy `/pbproxy`, el atajo, las vistas y que las
  copias de `frontend/public/marca` sean las del manual. Lista negra: «100 % local», «sin internet», «55 idiomas»,
  12B/27B, promesas sin medición.
- Kit: Manual TerminalForge v1.0 (← DeepMap, AuditorTecnicoIA, Pentest C360, Isabella EA, Maloca, ENKI y KANSA v6.0).
