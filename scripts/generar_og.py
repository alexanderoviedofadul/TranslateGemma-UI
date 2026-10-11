#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generar_og.py — Imagen para compartir de TranslateGemma (1200 × 630), con el Manual de Marca v1.0.

Compone las capas de la portada (frontend/public/marca/portada/, del build del manual), el símbolo y el
titular, y la fotografía con Chromium. Las fuentes y los SVG se incrustan en data: URI (about:blank no puede
leer file://). Salida: frontend/public/marca/og-v1.png. Si cambia, cambia de nombre (las redes la guardan por URL).
Uso: python3 -B scripts/generar_og.py
"""
import base64
from pathlib import Path

from playwright.sync_api import sync_playwright

REPO = Path(__file__).resolve().parent.parent
M = REPO / "frontend" / "public" / "marca"
CHROME = "/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome"


def b64(p):
    return base64.b64encode(p.read_bytes()).decode("ascii")


def main():
    capas = "".join(
        f'<img src="data:image/svg+xml;base64,{b64(M / "portada" / f"tg-portada-{n}.svg")}" alt="">'
        for n in ("fondo", "recinto", "puente", "origen", "destino"))
    simbolo = b64(M / "logos" / "tg-simbolo.svg")
    inter = b64(M / "fuentes" / "inter-var.woff2")
    mono = b64(M / "fuentes" / "jetbrainsmono-400.woff2")
    html = f"""<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{{font-family:Inter;src:url(data:font/woff2;base64,{inter}) format('woff2');font-weight:400 800}}
@font-face{{font-family:JBM;src:url(data:font/woff2;base64,{mono}) format('woff2')}}
html,body{{margin:0;width:1200px;height:630px;background:#0A1014;overflow:hidden;font-family:Inter}}
.capas img{{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:bottom}}
.velo{{position:absolute;inset:0;background:linear-gradient(90deg,#0A1014 0%,rgba(10,16,20,.88) 52%,rgba(10,16,20,.1) 100%)}}
.t{{position:absolute;left:72px;top:96px;width:640px;color:#E2E8F0}}
.m{{display:flex;align-items:center;gap:18px;font-weight:700;font-size:40px;letter-spacing:-.02em}}
.m img{{width:72px;height:72px}} .m b{{color:#2DD4BF}}
h1{{margin:56px 0 0;font-size:72px;line-height:1.02;font-weight:800;letter-spacing:-.03em}}
p{{margin:22px 0 0;font-size:26px;line-height:1.4;color:#94A3B8}}
.u{{position:absolute;left:72px;bottom:52px;font-family:JBM;font-size:22px;color:#99F6E4}}
</style></head><body><div class="capas">{capas}</div><div class="velo"></div>
<div class="t"><div class="m"><img src="data:image/svg+xml;base64,{simbolo}" alt=""><span><b>Translate</b>Gemma</span></div>
<h1>De una orilla a otra.</h1><p>Traducción entre 53 idiomas con un modelo abierto que corre en este servidor.</p></div>
<div class="u">translate.cedula360.tech</div></body></html>"""
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=CHROME)
        pg = b.new_page(viewport={"width": 1200, "height": 630})
        pg.set_content(html, wait_until="load")
        pg.wait_for_timeout(300)
        pg.screenshot(path=str(M / "og-v1.png"))
        b.close()
    print("OK →", M / "og-v1.png")


if __name__ == "__main__":
    main()
