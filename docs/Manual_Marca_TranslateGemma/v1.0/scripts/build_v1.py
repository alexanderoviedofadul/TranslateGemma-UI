#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build_v1.py — Manual de Marca TranslateGemma v1.0 «De una orilla a otra».

Kit copiado del Manual de Marca TerminalForge v1.0 (/root/TerminalForge/docs/Manual_Marca_TerminalForge/v1.0),
que viene de DeepMap, AuditorTecnicoIA, Pentest C360, Isabella EA, Maloca, ENKI y KANSA v6.0.
Una sola fuente (contenido/*.json) → salidas GENERADAS:

  assets/logos/tg-*.svg|png             símbolo, logotipos y favicons (geometría única, aquí)
  index.html                            recorrido inmersivo (enlaza assets/, abre por file://)
  impresion.html                        páginas A4 apaisadas (fuente del PDF)
  TranslateGemma_Inmersivo_v1.html      portable autocontenido (fuentes, CSS, JS e imágenes en línea)
  assets/data/tokens-v1.css · tokens_v1.json   tokens para la web
  ../../../frontend/public/marca/       lo que sirve la web en /marca: tokens, woff2, logos, favicons,
                                        capas de la portada (portada/) y escenas del recorrido (paradas/)

TranslateGemma UI usaba el azul por defecto de su plantilla y un globo de catálogo. La v1.0 dibuja un símbolo
con lo que el producto hace: una línea de texto que gira y vuelve traducida, en blanco sobre un cuadrado Jade.
El nombre va en Inter 700, «TranslateGemma», con «Translate» en Jade: el énfasis no recae en «Gemma», que es
una marca de Google (el producto usa su modelo abierto y no está afiliado a Google).

No editar las salidas a mano. La salida es determinista (semilla fija, sin fechas).
Uso:  python3 -B docs/Manual_Marca_TranslateGemma/v1.0/scripts/build_v1.py   (desde cualquier carpeta)
"""
import base64
import hashlib
import html
import json
import math
import random
import re
import shutil
import subprocess
import sys
from functools import lru_cache
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont

BASE = Path(__file__).resolve().parent.parent            # .../v1.0
REPO = BASE.parents[2]                                   # raíz del repositorio TranslateGemma-UI
CONTENIDO = BASE / "contenido"
VERSION = "1.0.0"
SELLO_PIE = "TranslateGemma · Manual de Marca v1.0"
PORTABLE = "TranslateGemma_Inmersivo_v1.html"
WEB = REPO / "frontend" / "public"

# ─────────────────────────────────────────────────────────────────────────────
# Utilidades
# ─────────────────────────────────────────────────────────────────────────────

def leer(rel):
    return (BASE / rel).read_text(encoding="utf-8")


def esc(s):
    return html.escape(str(s), quote=True)


FUENTES = json.loads(leer("contenido/fuentes.json"))["fuentes"]
NUM_FUENTE = {f["id"]: i + 1 for i, f in enumerate(FUENTES)}
HITOS = json.loads(leer("contenido/hitos.json"))
PRODUCTO = json.loads(leer("contenido/producto.json"))


def inline(s):
    """Texto de contenido → HTML. Admite HTML en línea simple y marcas {f:id}."""
    def cita(m):
        ids = [x.strip() for x in m.group(1).split(",")]
        partes = []
        for i in ids:
            if i not in NUM_FUENTE:
                raise SystemExit(f"Fuente desconocida en el contenido: {i}")
            partes.append(f'<a href="#fuente-{i}">{NUM_FUENTE[i]}</a>')
        return '<sup class="cita">[' + ", ".join(partes) + "]</sup>"
    return re.sub(r"\{f:([a-z0-9,\- ]+)\}", cita, s)


# ─────────────────────────────────────────────────────────────────────────────
# Color: una paleta cerrada, cada color con su origen; contraste WCAG calculado
# ─────────────────────────────────────────────────────────────────────────────

PALETA = json.loads(leer("contenido/paleta.json"))
COLORES = {k: {"nombre": c["nombre"], "hex": c["hex"].upper(), "uso": c["uso"], "origen": c["origen"]}
           for k, c in PALETA["colores"].items()}
RETIRADOS = PALETA["retirados"]
ORIGENES = {"convencion": "interfaz", "deriv": "v1.0"}
# Las dos orillas: origen (Agua) y destino (Ámbar). Color + palabra + color del texto encima (el que llega a
# AA, calculado). Nunca un color solo. (Se llama MODOS por herencia del kit.)
MODOS = [("tg-agua", "ORIGEN", "tg-noche"), ("tg-ambar", "DESTINO", "tg-noche")]


def hexa(i):
    return i if i.startswith("#") else COLORES[i]["hex"]


def _lum(h):
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (1, 3, 5))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contraste(a, b):
    la, lb = sorted((_lum(a), _lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def nivel_wcag(r):
    if r >= 7: return "AAA"
    if r >= 4.5: return "AA"
    if r >= 3: return "AA grande"
    return "No apto"


def exportar_tokens():
    """Tokens para la web y para el CSS del manual. GENERADOS."""
    filas = [f"  --{k}: {c['hex']};  /* {c['nombre']} · {ORIGENES[c['origen']]} */" for k, c in COLORES.items()]
    css = ("/* GENERADO por docs/Manual_Marca_TranslateGemma/v1.0/scripts/build_v1.py — no editar a mano.\n"
           f"   Paleta cerrada de TranslateGemma v1.0: {len(COLORES)} colores. El Jade es el color de la marca; Agua y Ámbar\n"
           "   son las dos orillas (origen y destino); las superficies oscuras salen de la noche del recorrido.\n"
           "   El contraste de cada par de uso está calculado en el capítulo 04 del manual. */\n:root {\n"
           + "\n".join(filas)
           + "\n  --f-display: 'Inter', system-ui, sans-serif;\n  --f-mono: 'JetBrains Mono', ui-monospace, monospace;\n}\n")
    (BASE / "assets/data/tokens-v1.css").write_text(css, encoding="utf-8")
    datos = {"marca": "TranslateGemma", "version": VERSION, "colores": COLORES,
             "orillas": {n: {"fondo": hexa(i), "texto": hexa(t)} for i, n, t in MODOS},
             "tipografia": {"logotipo": "Inter 700", "display": "Inter", "texto": "Inter", "codigo": "JetBrains Mono"}}
    (BASE / "assets/data/tokens_v1.json").write_text(json.dumps(datos, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8")


# ─────────────────────────────────────────────────────────────────────────────
# Símbolo: la línea que vuelve. Cuadrado de 100 u con radio 24 en Jade; dentro, en blanco, un solo trazo de 10 u
# (extremos y uniones redondos): la línea de origen gira y vuelve como línea de destino, con su flecha.
# ─────────────────────────────────────────────────────────────────────────────

LADO, RADIO, TRAZO = 100, 24, 10
INTER_VAR = BASE / "fuentes" / "inter" / "Inter[opsz,wght].ttf"
# (el logotipo se traza con Inter 700: ver _jbm)
CUADRO_PATH = (f"M{RADIO} 0H{LADO - RADIO}A{RADIO} {RADIO} 0 0 1 {LADO} {RADIO}V{LADO - RADIO}"
               f"A{RADIO} {RADIO} 0 0 1 {LADO - RADIO} {LADO}H{RADIO}A{RADIO} {RADIO} 0 0 1 0 {LADO - RADIO}V{RADIO}"
               f"A{RADIO} {RADIO} 0 0 1 {RADIO} 0Z")
# «>»: de (27,31) a (47,50) y vuelta a (27,69). Cursor: 24 × 11 u con radio 2, sobre la línea base del «>».
# La línea que vuelve: origen en y = 29 (de x = 26 a 62), arco de radio 16 y destino en y = 61 (hasta x = 40);
# la flecha, de (50, 51) a (40, 61) y a (50, 71). Con el trazo de 10 u, el dibujo ocupa x 21–83 e y 24–76.
RETORNO_PATH = 'M26 29H62A16 16 0 0 1 62 61H40'
FLECHA_PATH = "M50 51L40 61L50 71"


@lru_cache(maxsize=None)
def _jbm():
    """Inter 700 (óptico 32) instanciada desde la variable: el logotipo se traza con ella."""
    from fontTools.varLib import instancer
    return instancer.instantiateVariableFont(TTFont(INTER_VAR), {"wght": 700, "opsz": 32})


def texto_trazado(cad, cuerpo, x0=0.0, y0=0.0, tracking=0.0):
    """Trazado SVG de `cad` en Inter 700 con cuerpo `cuerpo` (u), línea base en y0. Son curvas: el logotipo
    no depende de que la fuente esté instalada. `tracking` en milésimas del cuerpo (negativo = más junto)."""
    f = _jbm()
    gs = f.getGlyphSet()
    cmap = f.getBestCmap()
    k = cuerpo / f["head"].unitsPerEm
    x = x0
    d = []
    for ch in cad:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
        gs[g].draw(TransformPen(pen, (k, 0, 0, -k, x, y0)))
        d.append(pen.getCommands())
        x += gs[g].width * k + cuerpo * tracking / 1000
    cap = f["OS/2"].sCapHeight * k
    return " ".join(d), x - x0, cap


# Proporciones de la cabecera de la web: símbolo de 36 px, 10 px de aire y el nombre a 18 px.
# En unidades del símbolo (100 u = 36 px). Inter 700 con un tracking de -18/1000 del cuerpo.
ESC_CAB = LADO / 36
CUERPO = 18 * ESC_CAB
AIRE = 10 * ESC_CAB
PARTES = ("Translate", "Gemma")
TRACKING = -18


def nombre_trazado(x0, base, color_txt, color_acento):
    """Las dos partes del nombre, seguidas, con «Translate» (la acción) en el color de acento y «Gemma» (el
    modelo, marca de Google) en el color del texto: el énfasis no recae en la marca ajena."""
    x = x0
    trozos = []
    for i, p in enumerate(PARTES):
        d, w, _ = texto_trazado(p, CUERPO, x, base, TRACKING)
        trozos.append(f'<path d="{d}" fill="{color_acento if i == 0 else color_txt}"/>')
        x += w
    return "".join(trozos), x - x0


def simbolo_cuerpo(modo, dx=0, dy=0, k=1.0):
    """modo: «color» (Jade + trazo blanco), un hex (cuadro de ese color + trazo blanco) o
    «recorte:#hex» (una sola tinta: el trazo calado en el cuadro, con máscara)."""
    t = f' transform="translate({dx:g} {dy:g}) scale({k:g})"' if (dx or dy or k != 1) else ""
    trazos = (f'<path d="{RETORNO_PATH}" fill="none" stroke="#FFFFFF" stroke-width="{TRAZO}" stroke-linecap="round" stroke-linejoin="round"/>'
              f'<path d="{FLECHA_PATH}" fill="none" stroke="#FFFFFF" stroke-width="{TRAZO}" stroke-linecap="round" stroke-linejoin="round"/>')
    if modo.startswith("recorte:"):
        negro = trazos.replace('"#FFFFFF"', '"#000000"')
        return (f'<g{t}><mask id="rec" maskUnits="userSpaceOnUse" x="0" y="0" width="{LADO}" height="{LADO}">'
                f'<rect width="{LADO}" height="{LADO}" fill="#FFFFFF"/>{negro}</mask>'
                f'<rect width="{LADO}" height="{LADO}" rx="{RADIO}" fill="{modo[8:]}" mask="url(#rec)"/></g>')
    fondo = hexa("tg-jade") if modo == "color" else modo
    return f'<g{t}><rect width="{LADO}" height="{LADO}" rx="{RADIO}" fill="{fondo}"/>{trazos}</g>'


def svg_simbolo(modo="color", titulo="TranslateGemma"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {LADO} {LADO}" role="img" aria-label="{esc(titulo)}">'
            f'{simbolo_cuerpo(modo)}</svg>\n')


def svg_horizontal(modo_sim, color_txt, color_acento):
    x = LADO + AIRE
    _, _, cap = texto_trazado("T", CUERPO)
    base = LADO / 2 + cap / 2
    trozos, w = nombre_trazado(x, base, color_txt, color_acento)
    ancho = round(x + w + 3)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {LADO}" role="img" aria-label="TranslateGemma">'
            f'{simbolo_cuerpo(modo_sim)}{trozos}</svg>\n'), ancho


def svg_vertical(modo_sim, color_txt, color_acento):
    _, w = nombre_trazado(0, 0, "#000", "#000")
    cap = texto_trazado("T", CUERPO)[2]
    ancho = round(max(w, LADO) + 8)
    base = LADO + 26 + cap
    alto = round(base + CUERPO * 0.26 + 3)
    x = (ancho - w) / 2
    trozos, _ = nombre_trazado(x, base, color_txt, color_acento)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {ancho} {alto}" role="img" aria-label="TranslateGemma">'
            f'{simbolo_cuerpo(modo_sim, (ancho - LADO) / 2)}{trozos}</svg>\n'), ancho


ANCHOS = {}


def generar_logos():
    """Maestros de la marca. Todo sale de simbolo_cuerpo() y nombre_trazado()."""
    tinta, humo, jade, agua = hexa("tg-tinta"), hexa("tg-humo"), hexa("tg-jade-hondo"), hexa("tg-agua")
    L = BASE / "assets" / "logos"
    L.mkdir(parents=True, exist_ok=True)
    archivos = {
        "tg-simbolo.svg": svg_simbolo("color"),
        "tg-simbolo-tinta.svg": svg_simbolo("recorte:" + tinta),
        "tg-simbolo-blanco.svg": svg_simbolo("recorte:#FFFFFF"),
        "tg-simbolo-negro.svg": svg_simbolo("recorte:#000000"),
    }
    for nombre, (s, t, a) in {
        "tg-horizontal.svg": ("color", tinta, jade),
        "tg-horizontal-negativo.svg": ("color", humo, agua),
        "tg-horizontal-blanco.svg": ("recorte:#FFFFFF", "#FFFFFF", "#FFFFFF"),
        "tg-horizontal-tinta.svg": ("recorte:" + tinta, tinta, tinta),
    }.items():
        archivos[nombre], ANCHOS[nombre] = svg_horizontal(s, t, a)
    for nombre, (s, t, a) in {
        "tg-vertical.svg": ("color", tinta, jade),
        "tg-vertical-negativo.svg": ("color", humo, agua),
    }.items():
        archivos[nombre], ANCHOS[nombre] = svg_vertical(s, t, a)
    for nombre, s in archivos.items():
        (L / nombre).write_text(s, encoding="utf-8")
    rsvg = shutil.which("rsvg-convert")
    if not rsvg:
        raise SystemExit("Falta rsvg-convert (paquete librsvg2-bin) para los PNG de favicon")
    for salida, px in [("favicon-16.png", 16), ("favicon-32.png", 32), ("apple-touch-icon.png", 180),
                       ("icono-192.png", 192), ("icono-512.png", 512)]:
        subprocess.run([rsvg, "-w", str(px), "-h", str(px), "-o", str(L / salida), str(L / "tg-simbolo.svg")], check=True)


_contador_svg = {"n": 0}


def svg_en_linea(nombre, extra_attr=""):
    """SVG listo para incrustar varias veces: los maestros de una tinta llevan id de máscara («rec») y dos
    copias en la misma página chocarían (trampa 26 de KANSA)."""
    _contador_svg["n"] += 1
    p = f"m{_contador_svg['n']}-"
    s = (BASE / "assets" / "logos" / nombre).read_text(encoding="utf-8")
    s = re.sub(r'id="([^"]+)"', lambda m: f'id="{p}{m.group(1)}"', s)
    s = re.sub(r"url\(#([^)]+)\)", lambda m: f"url(#{p}{m.group(1)})", s)
    s = re.sub(r'\s(role="img"|aria-label="[^"]*")', "", s)
    s = s.strip()
    return s.replace("<svg ", f'<svg width="100%" height="100%" focusable="false" aria-hidden="true" {extra_attr} ', 1)


def ratio(nombre):
    vb = re.search(r'viewBox="([\d.\- ]+)"', (BASE / "assets" / "logos" / nombre).read_text(encoding="utf-8")).group(1).split()
    return f"{float(vb[2]):g} / {float(vb[3]):g}"


def logo(nombre="tg-simbolo.svg", clase="", estilo=""):
    est = f"aspect-ratio:{ratio(nombre)};" + estilo
    return (f'<div class="logo {clase}" data-logo="{esc(nombre)}" style="{est}">' + svg_en_linea(nombre) + "</div>")


def imago(vertical=False, oscuro=False, mono=None):
    """El logotipo completo es un SVG maestro (texto en curvas), no HTML + fuente."""
    if mono:
        nombre = f"tg-horizontal-{mono}.svg"
    elif vertical:
        nombre = "tg-vertical-negativo.svg" if oscuro else "tg-vertical.svg"
    else:
        nombre = "tg-horizontal-negativo.svg" if oscuro else "tg-horizontal.svg"
    clases = "imago" + (" vertical" if vertical else "") + (" sobre-oscuro" if oscuro else "")
    return (f'<div class="{clases}" role="img" aria-label="TranslateGemma">' + logo(nombre, "imago-svg") + "</div>")


IMAGENES = {}


def imagen(rel, alt, clase=""):
    """<img> a assets/; el portable las sustituye por data: URI."""
    IMAGENES[rel] = True
    return f'<img src="assets/{rel}" alt="{esc(alt)}" class="{clase}" loading="lazy" decoding="async">'


# ─────────────────────────────────────────────────────────────────────────────
# Portada «Las dos orillas», en capas (paralaje): dentro de un recinto (el servidor), el panel de origen a la
# izquierda y el de destino a la derecha, unidos por los arcos del puente. Fuera, una nube a la que no llega
# ninguna ruta. Ningún texto legible.
# Semilla 20260118: el día del primer commit (70431d7). Salida determinista.
# ─────────────────────────────────────────────────────────────────────────────

RECINTO = (120, 150, 1360, 660)   # x, y, ancho, alto del recinto (el servidor): las dos orillas van dentro
ORIGEN_P = (230, 300, 450, 400)   # panel de origen
DESTINO_P = (920, 300, 450, 400)  # panel de destino
N_LINEAS = 5
N_IDIOMAS = 53                     # LANGUAGES en frontend/src/lib/languages.ts (lo comprueba el audit)


def ventana(x, y, w, h, rng, lineas=5, orilla="origen", cursor=True, grosor=1.0, op_borde=1.0, parcial=1.0):
    """Un panel de texto: borde del color de la orilla (Agua = origen, Ámbar = destino), las líneas como barras
    y, si `cursor`, el cursor de bloque al final de la última. Ningún texto legible. `parcial` < 1 deja las
    últimas líneas sin escribir (la traducción a medio llegar)."""
    acento = hexa("tg-agua") if orilla == "origen" else hexa("tg-ambar")
    fondo, texto = hexa("tg-cauce"), hexa("tg-ceniza")
    rad = max(6, min(w, h) * .05)
    out = [f'<rect x="{x:.0f}" y="{y:.0f}" width="{w:.0f}" height="{h:.0f}" rx="{rad:.0f}" fill="{fondo}" stroke="{acento}" stroke-width="{2 * grosor:.1f}" stroke-opacity="{op_borde}"/>']
    out.append(f'<rect x="{x:.0f}" y="{y - max(8, h * .05):.0f}" width="{w * .22:.0f}" height="{max(4, h * .018):.1f}" rx="2" fill="{acento}"/>')
    alto_l = max(3, h * .045)
    paso = (h - alto_l * 2) / (lineas + 1)
    yy = y + paso
    margen = w * .08
    escritas = max(1, round(lineas * parcial))
    for i in range(lineas):
        largo = (w - margen * 2) * rng.uniform(.4, .9)
        if i >= escritas:
            break
        ult = i == escritas - 1
        col = acento if i == 0 else (hexa("tg-humo") if orilla == "destino" else texto)
        if ult and cursor:
            largo *= .6
        out.append(f'<rect x="{x + margen:.1f}" y="{yy - alto_l / 2:.1f}" width="{largo:.0f}" height="{alto_l:.1f}" rx="{alto_l / 2:.1f}" fill="{col}" opacity="{.9 if i == 0 else .55}"/>')
        if ult and cursor:
            out.append(f'<rect x="{x + margen + largo + alto_l:.1f}" y="{yy - alto_l * 1.1:.1f}" width="{alto_l * 1.4:.1f}" height="{alto_l * 2.2:.1f}" rx="1" fill="{acento}"/>')
        yy += paso
    return "".join(out)


def puente(x0, x1, ys, fuerte=(), alto=120):
    """Los arcos del puente entre las dos orillas, uno por línea, con su cuenta de puntos en los `fuerte`."""
    out = ""
    for i, y in enumerate(ys):
        cx = (x0 + x1) / 2
        out += (f'<path d="M{x0:.0f} {y:.0f} Q{cx:.0f} {y - alto:.0f} {x1:.0f} {y:.0f}" fill="none" stroke="{hexa("tg-jade")}" '
                f'stroke-width="{2.4 if i in fuerte else 1.4}" stroke-dasharray="2 9" stroke-linecap="round" opacity="{.95 if i in fuerte else .45}"/>')
        if i in fuerte:
            for k, t in enumerate((.3, .55, .78)):
                px = x0 + (x1 - x0) * t
                py = y - 2 * t * (1 - t) * alto
                out += f'<circle cx="{px:.0f}" cy="{py:.0f}" r="{5 - k:.1f}" fill="{hexa("tg-ambar") if k == 2 else hexa("tg-agua")}"/>'
    return out


def capas_portada():
    rng = random.Random(20260118)
    NOCHE, CAUCE = hexa("tg-noche"), hexa("tg-cauce")
    rx, ry, rw, rh = RECINTO
    capas = []
    # 0 · Fondo: noche, una rejilla de puntos y el resplandor Jade en el centro del recinto
    capas.append(("fondo", 0,
        '<defs><pattern id="PORT-p" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1.3" fill="#FFFFFF" opacity=".06"/></pattern>'
        '<linearGradient id="PORT-g" x1="0" y1="0" x2="0" y2="1">'
        f'<stop offset="0" stop-color="{CAUCE}"/><stop offset=".7" stop-color="{NOCHE}"/><stop offset="1" stop-color="{NOCHE}"/></linearGradient>'
        f'<radialGradient id="PORT-r" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="{hexa("tg-jade")}" stop-opacity=".34"/>'
        f'<stop offset="1" stop-color="{NOCHE}" stop-opacity="0"/></radialGradient></defs>'
        '<rect width="1600" height="900" fill="url(#PORT-g)"/><rect width="1600" height="900" fill="url(#PORT-p)"/>'
        f'<ellipse cx="800" cy="500" rx="640" ry="330" fill="url(#PORT-r)"/>'))
    # 1 · El recinto: el servidor. Las dos orillas van dentro; fuera, una nube a la que no llega ninguna ruta
    capas.append(("recinto", 1,
        f'<rect x="{rx}" y="{ry}" width="{rw}" height="{rh}" rx="28" fill="none" stroke="{hexa("tg-linea")}" stroke-width="2.4" stroke-dasharray="6 10"/>'
        f'<path d="M1440 112 a26 26 0 0 1 48 -10 a20 20 0 0 1 36 14 a18 18 0 0 1 -6 35 h-74 a20 20 0 0 1 -4 -39z" fill="none" stroke="{hexa("tg-ceniza")}" stroke-width="2" opacity=".35"/>'
        f'<path d="M1476 160 V190" stroke="{hexa("tg-ceniza")}" stroke-width="2" stroke-dasharray="2 6" opacity=".25"/>'))
    ox, oy, ow, oh = ORIGEN_P
    dx, dy, dw, dh = DESTINO_P
    paso = (oh - max(3, oh * .045) * 2) / (N_LINEAS + 1)
    ys = [oy + paso * (i + 1) for i in range(N_LINEAS)]
    capas.append(("puente", 2, puente(ox + ow + 10, dx - 10, ys, fuerte=(1, 3), alto=110)))
    capas.append(("origen", 3, ventana(ox, oy, ow, oh, rng, lineas=N_LINEAS, orilla="origen", grosor=1.4)))
    capas.append(("destino", 4, ventana(dx, dy, dw, dh, random.Random(20261011), lineas=N_LINEAS, orilla="destino", grosor=1.4, parcial=.8)))
    return capas


_contador_port = {"n": 0}


def portada_html(en_capas=False):
    _contador_port["n"] += 1
    pre = f"p{_contador_port['n']}-"
    capas = [(n, z, c.replace("PORT-", pre)) for n, z, c in capas_portada()]
    if not en_capas:
        cuerpo = "".join(f'<g class="capa-{n}">{c}</g>' for n, _, c in capas)
        return ('<svg class="grafica" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice"'
                f' width="100%" height="100%" aria-hidden="true">{cuerpo}</svg>')
    out = []
    for n, z, c in capas:
        out.append(f'<div class="capa capa-{n}" data-z="{z}" aria-hidden="true">'
                   f'<svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" width="100%" height="100%">{c}</svg></div>')
    return '<div class="grafica-capas">' + "".join(out) + "</div>"


def exportar_capas_web():
    """Las capas de la portada como SVG sueltos para el hero de la web (frontend/public/marca/portada/).
    Mismo dibujo que el manual: una sola fuente."""
    dest = WEB / "marca" / "portada"
    dest.mkdir(parents=True, exist_ok=True)
    for n, _, c in capas_portada():
        c = c.replace("PORT-", f"{n}-")
        (dest / f"tg-portada-{n}.svg").write_text(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">' + c + "</svg>\n",
            encoding="utf-8")


# ─────────────────────────────────────────────────────────────────────────────
# Escenas del recorrido de la web (frontend/public/marca/paradas/tg-parada-N.svg): cinco escenas vectoriales con la
# paleta, una por parada. El sujeto va a la derecha: a la izquierda va el texto de la parada.
# (Vectoriales y deterministas: sin personas, sin texto legible y sin logos.)
# ─────────────────────────────────────────────────────────────────────────────

def _escena(cuerpo, pre, brillo=(1100, 450), dx=-380):
    """Escena de una parada. El sujeto se dibuja a la derecha y se desplaza dx para quedar centrado: en la
    web la escena va en su propia columna, junto al texto de la parada."""
    cuerpo = f'<g transform="translate({dx} 0)">{cuerpo}</g>'
    brillo = (brillo[0] + dx, brillo[1])
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice">'
            f'<defs><pattern id="{pre}p" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="1.3" fill="#FFFFFF" opacity=".06"/></pattern>'
            f'<radialGradient id="{pre}r" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="{hexa("tg-jade")}" stop-opacity=".34"/>'
            f'<stop offset="1" stop-color="{hexa("tg-noche")}" stop-opacity="0"/></radialGradient></defs>'
            f'<rect width="1600" height="900" fill="{hexa("tg-noche")}"/><rect width="1600" height="900" fill="url(#{pre}p)"/>'
            f'<ellipse cx="{brillo[0]}" cy="{brillo[1]}" rx="620" ry="380" fill="url(#{pre}r)"/>{cuerpo}</svg>\n')


def _sello(cx, cy, tipo, r=30):
    """Sello redondo de estado: «ok» (Correcto, marca) o «falla» (Error, aspa)."""
    if tipo == "ok":
        return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{hexa("tg-agua")}"/>'
                f'<path d="M{cx - r * .45:.0f} {cy:.0f} l{r * .32:.0f} {r * .32:.0f} l{r * .62:.0f} {-r * .66:.0f}" fill="none" stroke="{hexa("tg-noche")}" stroke-width="{r * .2:.1f}" stroke-linecap="round" stroke-linejoin="round"/>')
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{hexa("tg-error")}"/>'
            f'<path d="M{cx - r * .36:.0f} {cy - r * .36:.0f} L{cx + r * .36:.0f} {cy + r * .36:.0f} M{cx + r * .36:.0f} {cy - r * .36:.0f} L{cx - r * .36:.0f} {cy + r * .36:.0f}" stroke="{hexa("tg-noche")}" stroke-width="{r * .2:.1f}" stroke-linecap="round"/>')


def posters():
    out = {}
    agua, ambar, jade, cauce, linea = hexa("tg-agua"), hexa("tg-ambar"), hexa("tg-jade"), hexa("tg-cauce"), hexa("tg-linea")
    # 1 · Escriba: un panel grande de origen con el cursor
    out[1] = _escena(ventana(860, 200, 600, 480, random.Random(11), lineas=6, orilla="origen", grosor=1.6), "a")
    # 2 · Elija la pareja: dos discos (origen y destino) unidos por las flechas de intercambio y la lista del selector
    c = (f'<circle cx="980" cy="330" r="92" fill="{cauce}" stroke="{agua}" stroke-width="5"/>'
         f'<circle cx="1360" cy="330" r="92" fill="{cauce}" stroke="{ambar}" stroke-width="5"/>'
         f'<rect x="940" y="300" width="80" height="14" rx="7" fill="{agua}"/><rect x="955" y="336" width="50" height="10" rx="5" fill="{hexa("tg-ceniza")}" opacity=".7"/>'
         f'<rect x="1320" y="300" width="80" height="14" rx="7" fill="{ambar}"/><rect x="1335" y="336" width="50" height="10" rx="5" fill="{hexa("tg-ceniza")}" opacity=".7"/>'
         f'<path d="M1100 300 H1240 M1222 282 L1240 300 L1222 318 M1240 360 H1100 M1118 342 L1100 360 L1118 378" fill="none" stroke="{jade}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>')
    for k in range(6):
        c += (f'<rect x="900" y="{480 + k * 58}" width="300" height="44" rx="10" fill="{cauce}" stroke="{agua if k == 1 else linea}" stroke-width="{3 if k == 1 else 1.6}"/>'
              f'<rect x="922" y="{496 + k * 58}" width="{rng_largo(k)}" height="12" rx="6" fill="{hexa("tg-humo") if k == 1 else hexa("tg-ceniza")}" opacity=".75"/>')
    out[2] = _escena(c, "b", (1180, 420))
    # 3 · En directo: el origen completo y la traducción a medio llegar, con el puente entre ambos
    c = ventana(820, 260, 300, 380, random.Random(31), lineas=5, orilla="origen", cursor=False, grosor=1.3)
    c += ventana(1210, 260, 300, 380, random.Random(32), lineas=5, orilla="destino", grosor=1.3, parcial=.6)
    paso = (380 - 380 * .045 * 2) / 6
    c += puente(1130, 1200, [260 + paso * (i + 1) for i in range(5)], fuerte=(2,), alto=70)
    out[3] = _escena(c, "c", (1160, 450))
    # 4 · Una imagen: un marco con montaña y sol, y las líneas que salen de ella traducidas
    c = (f'<rect x="840" y="220" width="420" height="320" rx="18" fill="{cauce}" stroke="{agua}" stroke-width="4"/>'
         f'<circle cx="1160" cy="300" r="34" fill="{ambar}" opacity=".85"/>'
         f'<path d="M860 520 L980 380 L1060 470 L1120 410 L1240 520 Z" fill="{jade}" opacity=".8"/>'
         f'<rect x="900" y="250" width="150" height="16" rx="8" fill="{hexa("tg-humo")}" opacity=".85"/><rect x="900" y="280" width="100" height="12" rx="6" fill="{hexa("tg-humo")}" opacity=".6"/>'
         f'<path d="M1050 258 C1180 160 1260 200 1330 300" fill="none" stroke="{jade}" stroke-width="3" stroke-dasharray="2 9" stroke-linecap="round"/>')
    c += ventana(1300, 320, 230, 300, random.Random(41), lineas=4, orilla="destino", grosor=1.2)
    out[4] = _escena(c, "d", (1150, 430))
    # 5 · En este servidor: el recinto con las dos orillas dentro y la nube fuera, separada por una barrera
    c = (f'<rect x="820" y="200" width="620" height="520" rx="26" fill="none" stroke="{linea}" stroke-width="3" stroke-dasharray="6 10"/>'
         + ventana(870, 330, 220, 280, random.Random(51), lineas=4, orilla="origen", cursor=False, grosor=1.1)
         + ventana(1170, 330, 220, 280, random.Random(52), lineas=4, orilla="destino", cursor=False, grosor=1.1)
         + puente(1100, 1160, [330 + 50 * (i + 1) for i in range(4)], fuerte=(1,), alto=40)
         + f'<path d="M1480 128 a30 30 0 0 1 56 -12 a24 24 0 0 1 42 16 a21 21 0 0 1 -7 41 h-86 a24 24 0 0 1 -5 -45z" fill="none" stroke="{hexa("tg-ceniza")}" stroke-width="3" opacity=".5"/>'
         + f'<path d="M1452 214 L1500 176" stroke="{hexa("tg-error")}" stroke-width="7" stroke-linecap="round"/>')
    out[5] = _escena(c, "e", (1130, 460))
    return out


def rng_largo(k):
    """Largo fijo de cada fila de la lista del selector (escena 2)."""
    return (210, 170, 240, 150, 200, 180)[k]


def exportar_posters_web():
    dest = WEB / "marca" / "paradas"
    dest.mkdir(parents=True, exist_ok=True)
    for k, svg in posters().items():
        (dest / f"tg-parada-{k}.svg").write_text(svg, encoding="utf-8")


# ─────────────────────────────────────────────────────────────────────────────
# «Puente vivo»: respaldo estático del lienzo animado (assets/js/tg-v1-escaneo.js)
# ─────────────────────────────────────────────────────────────────────────────

_contador_er = {"n": 0}


def escaneo_respaldo_svg():
    _contador_er["n"] += 1
    ori = ventana(22, 40, 112, 120, random.Random(3), lineas=4, orilla="origen", cursor=False, grosor=.6)
    des = ventana(186, 40, 112, 120, random.Random(4), lineas=4, orilla="destino", grosor=.6, parcial=.75)
    ys = [40 + (120 - 120 * .045 * 2) / 5 * (i + 1) for i in range(4)]
    return (f'<svg class="escaneo-respaldo" viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" aria-hidden="true">'
            f'<rect width="320" height="200" fill="{hexa("tg-noche")}"/>'
            f'<rect x="10" y="14" width="300" height="172" rx="10" fill="none" stroke="{hexa("tg-linea")}" stroke-width="1" stroke-dasharray="3 5"/>'
            f'{ori}{des}{puente(138, 182, ys, fuerte=(1,), alto=26)}</svg>')


# ─────────────────────────────────────────────────────────────────────────────
# Componentes (usados por ambas salidas)
# ─────────────────────────────────────────────────────────────────────────────

def comp_indice(caps, **_):
    filas = []
    for c in caps:
        if c["num"] == "00":
            continue
        filas.append(f'<li><a href="#cap-{c["id"]}"><span class="ind-num">{c["num"]}</span>'
                     f'<span class="ind-tit">{esc(c["titulo"])}</span>'
                     f'<span class="ind-pag">{c["_pag_ini"]:02d}</span></a></li>')
    return '<ol class="indice">' + "".join(filas) + "</ol>"


def comp_portada(modo, **_):
    fondo = portada_html(en_capas=(modo == "inmersivo"))
    return (f'<div class="portada"><div class="portada-fondo">{fondo}</div>'
            '<div class="portada-texto">'
            f'<div class="portada-marca">{imago(oscuro=True)}</div>'
            '<p class="portada-lema">De una orilla a otra</p>'
            '<p class="portada-sub">Manual de Marca v1.0</p>'
            '<p class="portada-pie">Traducción con un modelo que corre en este servidor · translate.cedula360.tech · Octubre de 2026</p>'
            "</div></div>")


def comp_contraportada(modo, **_):
    return ('<div class="portada contra"><div class="portada-fondo">' + portada_html() + "</div>"
            '<div class="portada-texto"><div class="contra-marca">' + imago(vertical=True) + "</div>"
            '<p class="contra-frase">El texto cruza de una lengua a otra sin salir de casa.</p>'
            '<p class="portada-pie">translate.cedula360.tech · Manual de Marca v1.0 · Octubre de 2026 · '
            'Generado desde una sola fuente por scripts/build_v1.py · TranslateGemma y Gemma son marcas de Google; este producto no está afiliado a Google</p></div></div>')


def comp_isotipo(variante="tg-simbolo.svg", fondo="claro", **_):
    return f'<figure class="fig-logo fondo-{fondo}">' + logo(variante, "logo-fig") + "</figure>"


def comp_isotipo_oscuro(**_):
    return comp_isotipo("tg-simbolo.svg", fondo="oscuro")


def comp_lema(**_):
    return ('<div class="lema"><p class="lema-txt">De una orilla a otra.</p>'
            '<p class="lema-pie">Escriba · elija · traduzca · imagen · en este servidor</p></div>')


def comp_anatomia(**_):
    partes = [("1", "El cuadrado · Jade", "100 u con radio 24. Es el favicon y el icono de la aplicación."),
              ("2", "La línea de origen", "Arriba, de izquierda a derecha: el texto que entra."),
              ("3", "El retorno y la flecha", "La línea gira y vuelve como línea de destino; la flecha marca el sentido."),
              ("4", "TranslateGemma · el nombre", "Una palabra en Inter 700, con «Translate» en Jade: el énfasis va en la acción, no en la marca del modelo.")]
    return ('<div class="anatomia"><div class="anat-fig">' + imago(vertical=True) + "</div><ol class=\"anat-lista\">"
            + "".join(f'<li><span class="anat-n">{n}</span><div><strong>{esc(t)}</strong><p>{esc(d)}</p></div></li>' for n, t, d in partes)
            + "</ol></div>")


def comp_construccion(**_):
    """Retícula de construcción del símbolo con sus cotas."""
    tinta, borde, jade = hexa("tg-tinta"), hexa("tg-ceniza"), hexa("tg-jade-hondo")
    rej = "".join(f'<path d="M{v} 0 V100 M0 {v} H100" stroke="{borde}" stroke-width=".2" opacity=".7"/>' for v in range(0, 101, 5))
    guias = (f'<path d="M14 29 H90 M14 61 H90" stroke="{hexa("tg-ambar")}" stroke-width=".5" stroke-dasharray="1.5 1.5"/>')
    cotas = (f'<g font-family="JetBrains Mono, monospace" font-size="3.6" fill="{jade}">'
             '<text x="3" y="8">r 24</text><text x="66" y="47">r 16</text><text x="3" y="96">trazo 10 u</text></g>')
    return ('<figure class="construccion"><svg viewBox="-3 -3 106 106" width="100%" height="100%" aria-hidden="true">'
            f'{rej}<path d="{CUADRO_PATH}" fill="none" stroke="{tinta}" stroke-width=".6"/>{guias}'
            f'<path d="{RETORNO_PATH}" fill="none" stroke="{jade}" stroke-width=".7"/>'
            f'<path d="{FLECHA_PATH}" fill="none" stroke="{jade}" stroke-width=".7"/>{cotas}</svg>'
            '<figcaption>Retícula de 5 u sobre 100 × 100 · cuadrado de radio 24 · origen en y = 29, destino en y = 61, arco de radio 16 · flecha de (50, 51) a (40, 61)</figcaption></figure>')


VARIANTES = [("tg-simbolo.svg", "Principal", "Jade y trazo blanco. Sobre claro y sobre oscuro", "claro"),
             ("tg-simbolo-tinta.svg", "Una tinta", "Tinta #0F172A con el trazo calado: sellos y documentos", "claro"),
             ("tg-simbolo-blanco.svg", "Blanco", "Sobre fotografía o fondos oscuros de una sola tinta", "oscuro"),
             ("tg-simbolo-negro.svg", "100 % K", "Fotocopia, fax y grabado", "claro")]


def comp_variantes(**_):
    return ('<div class="variantes" style="grid-template-columns:repeat(4,minmax(0,1fr))">' + "".join(
        f'<div class="var-card fondo-{f}"><div class="var-logo">{logo(n)}</div><div class="var-txt"><strong>{esc(t)}</strong><span>{esc(d)}</span></div></div>'
        for n, t, d, f in VARIANTES) + "</div>")


def comp_lockups(**_):
    return ('<div class="lockups">'
            f'<div class="lock"><div class="lock-fig">{imago()}</div><span>Horizontal sobre claro · el traductor, la administración y los documentos</span></div>'
            f'<div class="lock lock-oscuro"><div class="lock-fig">{imago(oscuro=True)}</div><span>Horizontal negativo · la portada y la imagen para compartir</span></div>'
            "</div>")


def comp_proteccion(**_):
    return ('<figure class="fig-proteccion"><div class="prot-caja">'
            '<span class="prot-x prot-x-t">X</span><span class="prot-x prot-x-b">X</span>'
            '<span class="prot-x prot-x-l">X</span><span class="prot-x prot-x-r">X</span>'
            + imago() + "</div>"
            '<figcaption>X = el radio del cuadrado (24 u de 100): ese aire libre alrededor</figcaption></figure>')


def comp_minimos(**_):
    filas = [("Pantalla", "logotipo horizontal 150 px de ancho · símbolo 20 px", "height:22px"),
             ("Impresión", "logotipo horizontal 38 mm · símbolo 6 mm", "height:7mm"),
             ("Favicon 16 px", "el símbolo entero, sin el nombre", "height:16px")]
    out = ['<div class="minimos">']
    for a, b, e in filas:
        n = "tg-simbolo.svg" if "Favicon" in a else "tg-horizontal.svg"
        out.append(f'<div class="min-fila"><div class="min-logo">{logo(n, estilo=e + ";width:auto")}</div>'
                   f'<div><strong>{esc(a)}</strong><br><span class="mono">{esc(b)}</span></div></div>')
    out.append("</div>")
    return "".join(out)


def comp_incorrectos(**_):
    casos = [("transform:scaleX(1.45)", "", "No estirar ni comprimir el logotipo"),
             ("filter:hue-rotate(150deg)", "", "No cambiar el Jade por azul ni por los colores de Google"),
             ("transform:rotate(-12deg)", "", "No rotar ni inclinar"),
             ("filter:drop-shadow(4px 4px 0 #0F172A)", "", "No aplicar sombras duras, biseles ni 3D"),
             ("", "fondo", "No usar la versión negativa sobre claro"),
             ("", "icono", "No sustituir el símbolo por un globo ni por el icono de Google Translate"),
             ("", "texto", "No escribir «Translate Gemma» separado ni destacar «Gemma»"),
             ("", "degradado", "No rellenar el nombre con degradados")]
    out = ['<div class="incorrectos">']
    for estilo, tipo, texto in casos:
        if tipo == "texto":
            fig = '<span class="inc-texto">Translate<i> Gemma</i></span>'
        elif tipo == "icono":
            fig = ('<svg class="inc-emoji" viewBox="0 0 100 100" aria-hidden="true">'
                   f'<circle cx="50" cy="50" r="34" fill="none" stroke="{hexa("tg-pizarra")}" stroke-width="6"/>'
                   f'<path d="M16 50 H84 M50 16 C34 32 34 68 50 84 M50 16 C66 32 66 68 50 84" fill="none" stroke="{hexa("tg-pizarra")}" stroke-width="5"/></svg>')
        elif tipo == "degradado":
            fig = ('<span class="inc-texto inc-degradado">TranslateGemma</span>')
        elif tipo == "fondo":
            fig = f'<div class="inc-logo">{logo("tg-horizontal-negativo.svg")}</div>'
        else:
            fig = f'<div class="inc-logo" style="{estilo}">{logo("tg-horizontal.svg")}</div>'
        clase = " inc-fondo" if tipo == "fondo" else ""
        out.append(f'<div class="inc-card"><div class="inc-fig{clase}">{fig}<span class="inc-x" aria-hidden="true">×</span></div><p>{esc(texto)}</p></div>')
    out.append("</div>")
    return "".join(out)


def comp_favicon(**_):
    tams = [(64, "512 · 192 (Android)"), (48, "180 (Apple)"), (32, "32"), (24, "24"), (16, "16")]
    celdas = "".join(f'<div class="fav"><div style="width:{p}px;height:{p}px">{logo("tg-simbolo.svg")}</div><span class="mono">{esc(t)}</span></div>' for p, t in tams)
    return f'<div class="favicons">{celdas}</div>'


def comp_escaneo(modo, **_):
    canvas = '<canvas class="escaneo-gl" aria-hidden="true" data-solo-inmersivo></canvas>' if modo == "inmersivo" else ""
    return f'<div class="escaneo-vivo">{canvas}{escaneo_respaldo_svg()}</div>'


def comp_paleta(ids, grande=False, **_):
    out = [f'<div class="paleta{" grande" if grande else ""}">']
    for i in ids:
        c = COLORES[i]
        h = c["hex"]
        r, g, b = (int(h[k:k + 2], 16) for k in (1, 3, 5))
        texto = "#FFFFFF" if contraste(h, "#FFFFFF") >= contraste(h, hexa("tg-noche")) else hexa("tg-noche")
        out.append(f'<button type="button" class="swatch" data-copiar="{h}" style="--sw:{h};--sw-t:{texto}">'
                   f'<span class="sw-color"><span class="sw-hex">{h}</span></span>'
                   f'<span class="sw-info"><strong>{esc(c["nombre"])} <span class="sw-origen">{ORIGENES[c["origen"]]}</span></strong><span class="mono">RGB {r} {g} {b} · --{esc(i)}</span>'
                   f'<span class="sw-rol">{esc(c["uso"])}</span></span></button>')
    out.append("</div>")
    return "".join(out)


def comp_degradados(**_):
    esc_c = "".join(f'<span style="background:{hexa(i)};color:{hexa(t)}">{n}</span>' for i, n, t in MODOS)
    return ('<div class="degradados">'
            f'<div class="grad-card"><span class="grad-barra escala-sev">{esc_c}</span>'
            '<strong>Las dos orillas</strong><span class="mono">--tg-agua · --tg-ambar</span>'
            '<p>Agua para el texto que entra y Ámbar para el que sale. Siempre color + palabra o posición: nunca un color solo.</p></div>'
            f'<div class="grad-card"><span class="grad-barra" style="background:repeating-linear-gradient(90deg,{hexa("tg-jade")} 0 6px,transparent 6px 14px),{hexa("tg-noche")}"></span>'
            f'<strong>El puente</strong><span class="mono">Jade {hexa("tg-jade")} · solo gráfico</span>'
            '<p>Une las dos orillas. Punteado, sobre oscuro y sin texto encima.</p></div>'
            "</div>")


def comp_contraste(pares, **_):
    filas = []
    for fg, bg, uso in pares:
        fgh, bgh = hexa(fg), hexa(bg)
        r = contraste(fgh, bgh)
        n = nivel_wcag(r)
        filas.append(f'<tr><td><span class="ct-muestra" style="color:{fgh};background:{bgh}">Aa</span></td>'
                     f'<td class="mono">{fgh} / {bgh}</td><td class="mono">{r:.2f} : 1</td>'
                     f'<td><span class="ct-nivel nivel-{n.split()[0].lower()}">{n}</span></td><td>{inline(uso)}</td></tr>')
    return ('<table class="tabla compacta"><thead><tr><th>Muestra</th><th>Texto / fondo</th><th>Contraste</th>'
            '<th>WCAG 2.1</th><th>Uso</th></tr></thead><tbody>' + "".join(filas) + "</tbody></table>")


def comp_retirados(**_):
    filas = "".join(
        f'<tr><td><span class="ct-muestra" style="background:{r["hex"]};color:#fff">&nbsp;&nbsp;</span></td><td class="mono">{esc(r["hex"])}</td>'
        f'<td>{esc(r["nombre"])}</td><td>{inline(r["motivo"])}</td><td>{esc(r["sustituto"])}</td></tr>' for r in RETIRADOS)
    return ('<table class="tabla compacta"><thead><tr><th></th><th>Hex</th><th>Nombre</th><th>Por qué sale</th><th>Lo sustituye</th></tr></thead>'
            f'<tbody>{filas}</tbody></table>')


def comp_paleta_mini(**_):
    ids = ["tg-noche", "tg-cauce", "tg-jade", "tg-agua", "tg-ambar", "tg-espuma", "tg-humo", "tg-tinta"]
    return '<div class="paleta-mini" aria-hidden="true">' + "".join(
        f'<span style="background:{hexa(i)}"><em>{hexa(i)}</em></span>' for i in ids) + "</div>"


ICONOS = {  # trazos de 24 × 24 al estilo lineal (extremos redondeados)
    "doc": '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
    "globo": '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c-3 3-3 15 0 18M12 3c3 3 3 15 0 18"/>',
    "flechas": '<path d="M4 8h13l-3-3M20 16H7l3 3"/>',
    "imagen": '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    "candado": '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    "escudo": '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    "llave": '<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M15 8l2 2"/>',
    "ok": '<path d="M20 6 9 17l-5-5"/>',
}


def ico(n):
    return f'<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">{ICONOS[n]}</svg>'


def comp_fondos(**_):
    casos = [("#FFFFFF", "tg-horizontal.svg", "Blanco: el traductor, la administración y el PDF"),
             (hexa("tg-bruma"), "tg-horizontal.svg", "Bruma #F0FDFA: el panel de traducción"),
             (hexa("tg-noche"), "tg-horizontal-negativo.svg", "Noche #0A1014: portada y recorrido"),
             (hexa("tg-jade-hondo"), "tg-horizontal-blanco.svg", "Sobre el Jade: solo la versión blanca")]
    return '<div class="fondos">' + "".join(
        f'<div class="fondo-card"><div class="fondo-muestra" style="background:{bg}">{logo(n)}</div><p>{esc(t)}</p></div>'
        for bg, n, t in casos) + "</div>"


def comp_especimen(familia, rol, muestra, pesos, **_):
    clases = {"Inter": "ff-display", "JetBrains Mono": "ff-mono"}
    return (f'<div class="especimen"><div class="esp-cab"><strong>{esc(familia)}</strong><span>{esc(rol)}</span></div>'
            f'<div class="esp-muestra {clases[familia]}">{esc(muestra)}</div>'
            f'<div class="esp-abc {clases[familia]}">Aa Bb Cc Ññ Áé 0123456789 ¿? «»</div>'
            f'<div class="esp-pesos mono">{esc(pesos)}</div></div>')


def comp_escala(**_):
    filas = [("Portada", "ff-display", "Inter 800", "56 px", "De una orilla a otra", "font-size:2.2em;font-weight:800;letter-spacing:-.02em"),
             ("H2", "ff-display", "Inter 700", "36 px", "Traduzca en directo", "font-size:1.5em;font-weight:700"),
             ("H3", "ff-display", "Inter 600", "18 px", "Idioma de destino", "font-size:1.1em;font-weight:600"),
             ("Cuerpo", "ff-sans", "Inter 400", "16 px / 1,6", "El texto se traduce en este servidor con un modelo local.", "font-size:.95em;font-weight:400"),
             ("Código", "ff-mono", "JetBrains Mono 400", "14 px / 1,5", "es → en · /traducir", "font-size:.86em"),
             ("Dato", "ff-sans", "Inter 600 tabular", "14 px", "53 idiomas · 30 por minuto", "font-size:.88em;font-weight:600;font-variant-numeric:tabular-nums")]
    return ('<table class="tabla escala"><thead><tr><th>Nivel</th><th>Familia</th><th>Tamaño</th><th>Muestra</th></tr></thead><tbody>'
            + "".join(f'<tr><td>{a}</td><td class="mono">{c}</td><td class="mono">{d}</td><td class="{b}" style="{s};color:var(--tg-tinta)">{esc(e)}</td></tr>' for a, b, c, d, e, s in filas)
            + "</tbody></table>")


def comp_tipo_mini(**_):
    return ('<div class="tipo-mini" aria-hidden="true"><span class="ff-display" style="font-weight:800">Aa</span><span class="ff-mono" style="font-weight:700">es→en</span>'
            '<span class="ff-display" style="font-weight:400">Ññ</span><span class="ff-mono" style="font-weight:400">53</span></div>')


def comp_tokens(**_):
    grupos = [("MARCA", ["tg-jade", "tg-jade-hondo", "tg-jade-oscuro", "tg-bruma"]),
              ("ORILLAS", [i for i, _, _ in MODOS]),
              ("SUPERFICIES", ["tg-noche", "tg-cauce", "tg-ribera", "tg-linea"])]
    lineas = []
    for g, ids in grupos:
        lineas.append(f'<span class="c-com">/* {g} */</span>')
        for i in ids:
            lineas.append(f'<span class="c-var">--{i}</span>: {hexa(i)};')
    return '<pre class="codigo">' + "\n".join(lineas) + "</pre>"


def comp_pantalla(**_):
    return ('<div class="pantalla" aria-label="Arquitectura de la portada pública">'
            '<div class="pt-logo">TranslateGemma</div><div class="pt-nav">cómo funciona · idiomas · traductor · acceso</div>'
            '<div class="pt-side">Escriba<br>Elija<br>En directo<br>Imagen<br>Este servidor</div>'
            '<div class="pt-main"><div>Titular y las dos orillas en paralaje dentro del recinto</div>'
            '<div class="pt-kpis"><span>Idiomas</span><span>Modelo</span><span>Límite</span><span>Atajo</span></div>'
            '<div>Los 53 idiomas por grupo, leídos de languages.ts</div><div>Qué no hace · acceso con Cédula 360 · preguntas</div></div></div>')


def comp_componentes(**_):
    cs = "".join(f'<span class="sev-demo" style="background:{hexa(i)};color:{hexa(t)}">{n}</span>' for i, n, t in MODOS)
    return ('<div class="comp-fila"><span class="btn-demo btn-marca">' + ico("flechas") + ' Traducir</span><small>.btn-marca · Jade Hondo, texto blanco</small>'
            '<span class="btn-demo btn-claro">Continuar con Cédula 360</span><small>.btn-claro</small>'
            '<span class="btn-demo btn-outline">Intercambiar</span><small>.btn-outline</small></div>'
            f'<div class="comp-fila">{cs}<small>Orilla: color + palabra</small></div>'
            '<div class="tarjeta card3d card-viva"><div class="c3-cab">Par de idiomas <span class="muted-oscuro">(ejemplo)</span></div><div class="c3-cuerpo">'
            f'<p class="small mono" style="margin:0 0 .4em">{ico("globo")} es → en</p>'
            '<p class="small muted" style="margin:0">Los nombres de los idiomas salen de languages.ts: la portada no los escribe a mano.</p></div></div>')


def comp_pilares(**_):
    return ('<div class="suite">' + "".join(
        f'<div class="suite-mod"><span class="suite-ico">{ico(c["icono"])}</span><strong>{esc(c["titulo"])}</strong>'
        f'<p>{inline(esc(c["texto"]) + " {f:" + c["fuente"] + "}")}</p></div>' for c in PRODUCTO["etapas"]) + "</div>")


def comp_formatos(**_):
    """Los 53 idiomas del selector (frontend/src/lib/languages.ts), en sus seis grupos."""
    return ('<div class="capas-op">' + "".join(
        f'<div class="capa-op" style="--capa:{hexa(g["color"])}"><span class="capa-letra ext">{esc(g["n"])}</span>'
        f'<div><strong>{esc(g["nombre"])}</strong><p class="mono small">{esc(" · ".join(g["ids"]))}</p>'
        f'<p>{inline(esc(g["texto"]) + " {f:" + g["fuente"] + "}")}</p></div></div>' for g in PRODUCTO["grupos"]) + "</div>")


def comp_entregables(**_):
    return ('<div class="modulos-op dos">' + "".join(
        f'<div class="mod-op"><strong>{ico(e["icono"])} {esc(e["nombre"])}</strong><span class="mono">{esc(e["id"])}</span><p>{inline(esc(e["texto"]) + " {f:" + e["fuente"] + "}")}</p></div>'
        for e in PRODUCTO["vistas"]) + "</div>")


def comp_elementos(**_):
    return ('<div class="conceptos-op">' + "".join(
        f'<div class="concepto-op"><span class="sev-demo" style="background:{hexa(c["color"])};color:{hexa(c["texto"])}">{esc(c["id"])}</span>'
        f'<p>{inline(esc(c["x"]) + " {f:" + c["fuente"] + "}")}</p></div>' for c in PRODUCTO["limites"]) + "</div>")


def comp_campos(**_):
    return ('<p class="campos mono" data-revelar>' + " · ".join(esc(c) for c in PRODUCTO["campos"]) + "</p>")


def comp_cronologia(modo, **_):
    hitos = HITOS["hitos"]
    celdas = "".join(
        f'<div class="cr-hito{" creacion" if h["papel"] == "marca" else ""}"><span class="cr-fecha">{esc(h["fecha"])}</span>'
        f'<span class="cr-acto">{esc(h["acto"])}</span><p>{inline(h["resumen"] + " {f:" + h["fuente"] + "}")}</p></div>'
        for h in hitos)
    n = len(hitos) if modo == "inmersivo" else 5
    crono = f'<div class="crono" style="--n:{n};min-width:{len(hitos) * 11 if modo == "inmersivo" else 0}em">{celdas}</div>'
    if modo == "inmersivo":
        crono = f'<div class="crono-scroll" tabindex="0" role="region" aria-label="Cronología de TranslateGemma, desplazable">{crono}</div>'
    ley = ('<p class="crono-ley"><span><i style="background:var(--tg-agua)"></i>Hito de marca</span>'
           '<span><i style="background:var(--tg-tinta)"></i>Hito de producto</span></p>')
    return crono + ley


def comp_og(**_):
    return ('<div class="og-tarjeta"><div class="og-cab">' + imago(oscuro=True) + '</div>'
            '<p class="og-tit">De una orilla a otra</p>'
            '<p class="og-sub">Traducción entre 53 idiomas con un modelo abierto que corre en este servidor.</p>'
            '<p class="og-pie"><span>texto</span><span>imagen</span><span>historial</span><b>translate.cedula360.tech</b></p></div>')


def comp_cabecera_informe(**_):
    return ('<div class="cab-informe"><span class="ci-firma"></span><div class="ci-cuerpo">' + imago(oscuro=True)
            + '<p class="ci-tit">Traducción guardada · [fecha]</p><p class="ci-meta mono">[idioma de origen] → [idioma de destino] · translategemma · [caracteres]</p>'
            + "".join(f'<span class="sev-demo" style="background:{hexa(i)};color:{hexa(t)}">{n}</span>' for i, n, t in MODOS)
            + "</div></div>")


def comp_kpis(items, **_):
    return '<div class="kpis">' + "".join(
        f'<div class="kpi"><span class="kpi-v">{esc(i["v"])}</span><span class="kpi-l">{inline(esc(i["l"]))}</span></div>' for i in items) + "</div>"


def comp_bibliografia(desde=0, hasta=None, **_):
    out = ['<ol class="biblio" start="' + str(desde + 1) + '">']
    for f in FUENTES[desde:hasta]:
        url = f'<span class="mono biblio-url">{esc(f["url"])}</span>' if f.get("url") else ""
        out.append(f'<li id="fuente-{f["id"]}"><strong>{esc(f["autor"])}</strong>. <em>{esc(f["titulo"])}</em>. {esc(f["detalle"])}. {url}</li>')
    out.append("</ol>")
    return "".join(out)


COMPONENTES = {
    "portada": comp_portada, "contraportada": comp_contraportada, "indice": comp_indice,
    "isotipo": comp_isotipo, "isotipo-oscuro": comp_isotipo_oscuro, "lema": comp_lema,
    "anatomia": comp_anatomia, "construccion": comp_construccion, "variantes": comp_variantes,
    "lockups": comp_lockups, "proteccion": comp_proteccion, "minimos": comp_minimos,
    "incorrectos": comp_incorrectos, "favicon": comp_favicon, "escaneo": comp_escaneo,
    "paleta": comp_paleta, "degradados": comp_degradados, "contraste": comp_contraste, "retirados": comp_retirados,
    "paleta-mini": comp_paleta_mini, "fondos": comp_fondos,
    "especimen": comp_especimen, "escala": comp_escala, "tipo-mini": comp_tipo_mini, "tokens": comp_tokens,
    "pantalla": comp_pantalla, "componentes": comp_componentes, "pilares": comp_pilares,
    "idiomas": comp_formatos, "vistas": comp_entregables, "limites": comp_elementos, "campos": comp_campos,
    "cronologia": comp_cronologia, "og": comp_og, "cabecera-informe": comp_cabecera_informe, "kpis": comp_kpis,
    "bibliografia": comp_bibliografia,
}

# ─────────────────────────────────────────────────────────────────────────────
# Bloques de contenido (mismo vocabulario que KANSA v6 y DeepMap v1)
# ─────────────────────────────────────────────────────────────────────────────


def bloque(b, ctx):
    t = b["t"]
    if t == "eyebrow":
        return f'<p class="eyebrow">{inline(b["x"])}</p>'
    if t in ("h2", "h3"):
        return f'<{t} data-revelar>{inline(b["x"])}</{t}>'
    if t == "p":
        return f'<p class="{b.get("c", "")}" data-revelar>{inline(b["x"])}</p>'
    if t == "lista":
        tag = "ol" if b.get("c") == "num" else "ul"
        return f'<{tag} class="lista {b.get("c", "")}" data-revelar>' + "".join(f"<li>{inline(i)}</li>" for i in b["items"]) + f"</{tag}>"
    if t == "nota":
        tit = f'<strong class="nota-tit">{inline(b["titulo"])}</strong>' if b.get("titulo") else ""
        return f'<aside class="nota nota-{b.get("tono", "azul")}" data-revelar>{tit}<p>{inline(b["x"])}</p></aside>'
    if t == "tabla":
        cab = "".join(f"<th>{inline(c)}</th>" for c in b["cab"])
        filas = "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in f) + "</tr>" for f in b["filas"])
        return f'<table class="tabla {b.get("c", "")}" data-revelar><thead><tr>{cab}</tr></thead><tbody>{filas}</tbody></table>'
    if t == "cols":
        cols = "".join(f'<div class="col">{"".join(bloque(x, ctx) for x in c)}</div>' for c in b["cols"])
        return f'<div class="cols" style="--cols:{b.get("r", "1fr 1fr")}">{cols}</div>'
    if t == "grid":
        items = "".join(
            (bloque(it, ctx) if isinstance(it, dict) else
             '<div class="celda">' + "".join(bloque(x, ctx) for x in it) + "</div>")
            for it in b["items"])
        return f'<div class="grid g{b.get("n", 3)}">{items}</div>'
    if t == "tarjeta":
        sub = f'<span class="tar-sub">{inline(b["sub"])}</span>' if b.get("sub") else ""
        viva = " card-viva" if ctx["modo"] == "inmersivo" else ""
        return (f'<div class="tarjeta tono-{b.get("tono", "neutro")}{viva}" data-revelar><strong class="tar-tit">{inline(b["titulo"])}</strong>'
                f'{sub}<p>{inline(b["x"])}</p></div>')
    if t == "comp":
        args = {k: v for k, v in b.items() if k not in ("t", "n")}
        return COMPONENTES[b["n"]](modo=ctx["modo"], caps=ctx["caps"], **args)
    if t == "sep":
        return '<hr class="sep">'
    raise SystemExit(f"Tipo de bloque desconocido: {t}")


# ─────────────────────────────────────────────────────────────────────────────
# Capítulos y páginas
# ─────────────────────────────────────────────────────────────────────────────

def cargar_capitulos():
    caps = [json.loads(p.read_text(encoding="utf-8")) for p in sorted(CONTENIDO.glob("[0-9][0-9]_*.json"))]
    pag = 1
    for c in caps:
        c["_pag_ini"] = pag
        pag += len(c["paginas"])
    return caps, pag - 1


def portadilla(c, pg, ctx):
    fig = ""
    if pg.get("fig"):
        fig = f'<div class="porta-fig">{bloque({"t": "comp", "n": pg["fig"]}, ctx)}</div>'
    lead = f'<p class="porta-lead">{inline(c["lead"])}</p>' if c.get("lead") else ""
    extra = "".join(bloque(b, ctx) for b in pg.get("bloques", []))
    return (f'<div class="porta"><div class="porta-texto"><p class="porta-num">{esc(c["num"])}</p>'
            f'<p class="eyebrow">{esc(c["kicker"])}</p><h2 class="porta-tit" data-titulo>{esc(c["titulo"])}</h2>'
            f'{lead}{extra}</div>{fig}</div>')


def render_impresion(caps, total):
    ctx = {"modo": "impresion", "caps": caps}
    out = []
    n = 0
    for c in caps:
        for i, pg in enumerate(c["paginas"]):
            n += 1
            plantilla_ = pg.get("plantilla", "libre")
            tono = pg.get("tono", "claro" if plantilla_ == "libre" else "noche")
            ancla = f' id="cap-{c["id"]}"' if i == 0 else ""
            cuerpo = portadilla(c, pg, ctx) if plantilla_ == "portadilla" else "".join(bloque(b, ctx) for b in pg["bloques"])
            cabecera = ("" if plantilla_ == "portada" else
                        f'<header class="pg-cab"><span>{SELLO_PIE}</span>'
                        f'<span>{esc(c["num"])} · {esc(c["corto"])}</span></header>')
            pie = "" if plantilla_ == "portada" else f'<footer class="pg-pie"><span class="pg-n">{n:02d}</span></footer>'
            densa = " densa" if pg.get("densa") else (" amplia" if pg.get("amplia") else "")
            out.append(f'<section class="page plantilla-{plantilla_} sup-{tono}{densa}"{ancla} data-pagina="{n}">'
                       f'{cabecera}<div class="pg-cuerpo">{cuerpo}</div>{pie}</section>')
    assert n == total
    return "\n".join(out)


def render_inmersivo(caps):
    ctx = {"modo": "inmersivo", "caps": caps}
    out = []
    for c in caps:
        laminas = []
        for pg in c["paginas"]:
            plantilla_ = pg.get("plantilla", "libre")
            tono = pg.get("tono", "claro" if plantilla_ == "libre" else "noche")
            cuerpo = portadilla(c, pg, ctx) if plantilla_ == "portadilla" else "".join(bloque(b, ctx) for b in pg["bloques"])
            laminas.append(f'<div class="lamina plantilla-{plantilla_} sup-{tono}">{cuerpo}</div>')
        out.append(f'<section class="escena" id="cap-{c["id"]}" data-escena="{esc(c["num"])}"'
                   f' data-titulo-escena="{esc(c["corto"])}" aria-label="{esc(c["num"])} · {esc(c["titulo"])}">'
                   + "".join(laminas) + "</section>")
    return "\n".join(out)


def nav_items(caps):
    return "".join(
        f'<li><a href="#cap-{c["id"]}" data-ir="cap-{c["id"]}"><span class="rail-num">{esc(c["num"])}</span>'
        f'<span class="rail-tit">{esc(c["corto"])}</span></a></li>' for c in caps)


# ─────────────────────────────────────────────────────────────────────────────
# Ensamblado de salidas
# ─────────────────────────────────────────────────────────────────────────────

SCRIPTS_INMERSIVO = [
    "assets/js/vendor/gsap.min.js", "assets/js/vendor/ScrollTrigger.min.js",
    "assets/js/vendor/ScrollToPlugin.min.js", "assets/js/vendor/SplitText.min.js",
    "assets/js/tg-v1-bucle.js", "assets/js/tg-v1-escaneo.js", "assets/js/tg-v1-nucleo.js",
]
TIPOS_IMG = {".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp"}


def css_con_fuentes_inline(css_rel, dir_fuentes):
    css = leer(css_rel)

    def rep(m):
        b64 = base64.b64encode((BASE / dir_fuentes / m.group(1)).read_bytes()).decode("ascii")
        return f"url(data:font/woff2;base64,{b64}) format('woff2')"
    return re.sub(r"url\('([^']+\.woff2)'\)\s*format\('woff2'\)", rep, css)


def js_seguro(s):
    return s.replace("</script", "<\\/script")


def plantilla(nombre, **vals):
    s = leer(f"plantillas/{nombre}")
    for k, v in vals.items():
        s = s.replace("{{" + k + "}}", v)
    resto = re.findall(r"\{\{[A-Z_]+\}\}", s)
    if resto:
        raise SystemExit(f"Marcadores sin rellenar en {nombre}: {resto}")
    return s




def exportar_web():
    """Lo que la web usa de la marca, copiado desde aquí a frontend/public/marca (no editar allí): tokens,
    woff2, logos y favicons. Next.js los sirve como estáticos en /marca/*."""
    M = WEB / "marca"
    (M / "fuentes").mkdir(parents=True, exist_ok=True)
    (M / "logos").mkdir(parents=True, exist_ok=True)
    shutil.copyfile(BASE / "assets/data/tokens-v1.css", M / "tokens-v1.css")
    for f in ("inter-var.woff2", "jetbrainsmono-400.woff2", "jetbrainsmono-700.woff2"):
        shutil.copyfile(BASE / "assets/fonts" / f, M / "fuentes" / f)
    for f in ("tg-simbolo.svg", "tg-horizontal.svg", "tg-horizontal-negativo.svg", "tg-simbolo-blanco.svg",
              "favicon-16.png", "favicon-32.png", "apple-touch-icon.png", "icono-192.png", "icono-512.png"):
        shutil.copyfile(BASE / "assets/logos" / f, M / "logos" / f)
    # GSAP y ScrollTrigger para el recorrido de la portada: los mismos ficheros del kit (VENDOR.sha256), servidos desde
    # el propio dominio y cargados solo tras la primera interacción (frontend/src/components/marca/Recorrido.tsx).
    (M / "vendor").mkdir(parents=True, exist_ok=True)
    for f in ("gsap.min.js", "ScrollTrigger.min.js"):
        shutil.copyfile(BASE / "assets/js/vendor" / f, M / "vendor" / f)


def raiz_css():
    """El :root del CSS base se reescribe desde la paleta: el audit lo compara con los tokens."""
    p = BASE / "assets/css/tg-v1-base.css"
    css = p.read_text(encoding="utf-8")
    ids = list(COLORES)
    lineas = []
    for i in range(0, len(ids), 4):
        lineas.append("  " + " ".join(f"--{k}: {COLORES[k]['hex']};" for k in ids[i:i + 4]))
    bloque_ = "  /* Paleta cerrada: contenido/paleta.json (la escribe build_v1.py). */\n" + "\n".join(lineas) + "\n"
    nuevo = re.sub(r"(:root \{\n)(.*?)(  --blanco: #FFFFFF;)", lambda m: m.group(1) + bloque_ + m.group(3), css, count=1, flags=re.S)
    if nuevo != css:
        p.write_text(nuevo, encoding="utf-8")


def main():
    generar_logos()
    exportar_tokens()
    raiz_css()
    exportar_web()
    exportar_capas_web()
    exportar_posters_web()
    caps, total = cargar_capitulos()

    _contador_svg["n"] = _contador_port["n"] = _contador_er["n"] = 0
    imp = plantilla("impresion.html.tpl", PAGINAS=render_impresion(caps, total), TOTAL=str(total), VERSION=VERSION)
    (BASE / "impresion.html").write_text(imp, encoding="utf-8")

    _contador_svg["n"] = _contador_port["n"] = _contador_er["n"] = 0
    escenas = render_inmersivo(caps)
    scripts = "\n".join(f'<script src="{s}"></script>' for s in SCRIPTS_INMERSIVO)
    idx = plantilla("inmersivo.html.tpl", ESCENAS=escenas, NAV=nav_items(caps), SCRIPTS=scripts,
                    ISOTIPO_CAB=svg_en_linea("tg-simbolo.svg"), VERSION=VERSION, TOTAL=str(total))
    (BASE / "index.html").write_text(idx, encoding="utf-8")

    port = idx.replace('<link rel="stylesheet" href="assets/fonts/fonts.css">',
                       "<style>\n" + css_con_fuentes_inline("assets/fonts/fonts.css", "assets/fonts") + "\n</style>")
    for css in ["assets/css/tg-v1-base.css", "assets/css/tg-v1-inmersivo.css"]:
        etiqueta = f'<link rel="stylesheet" href="{css}">'
        if etiqueta not in port:
            raise SystemExit(f"Falta {etiqueta} en la plantilla")
        port = port.replace(etiqueta, "<style>\n" + leer(css) + "\n</style>")
    for s in SCRIPTS_INMERSIVO:
        port = port.replace(f'<script src="{s}"></script>', "<script>\n" + js_seguro(leer(s)) + "\n</script>")
    for rel in sorted(IMAGENES):
        datos = base64.b64encode((BASE / "assets" / rel).read_bytes()).decode("ascii")
        port = port.replace(f'src="assets/{rel}"', f'src="data:{TIPOS_IMG[Path(rel).suffix]};base64,{datos}"')
    port = re.sub(r'\s*<link rel="icon"[^>]*>', "", port)
    port = port.replace('href="impresion.html"', 'href="Manual_Marca_TranslateGemma_v1.pdf"')
    sello = ("<!-- ═══ TranslateGemma v1.0 · PORTABLE AUTOCONTENIDO ═══\n"
             "     GENERADO por scripts/build_v1.py desde contenido/ + plantillas/ + assets/.\n"
             "     No editar a mano. Tipografías, estilos, librerías (GSAP), logos e imágenes incrustados. -->\n")
    port = port.replace("<!DOCTYPE html>", "<!DOCTYPE html>\n" + sello, 1)
    (BASE / PORTABLE).write_text(port, encoding="utf-8")

    for n in ("impresion.html", "index.html", PORTABLE, "assets/data/tokens-v1.css", "assets/logos/tg-simbolo.svg"):
        p = BASE / n
        print(f"OK → {n:38s} {p.stat().st_size / 1024:8.1f} KB  sha256 {hashlib.sha256(p.read_bytes()).hexdigest()[:12]}")
    print(f"Páginas: {total} · Capítulos: {len(caps)} · Colores: {len(COLORES)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
