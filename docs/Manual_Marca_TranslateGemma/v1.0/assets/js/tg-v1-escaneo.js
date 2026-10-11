/* TranslateGemma · Manual de Marca v1.0 — «Puente vivo»: la metáfora de la marca en movimiento.
   Lienzo 2D (sin librerías): dos orillas dentro de un mismo recinto (el servidor). En la de origen se
   escribe una línea; a la vez, en la de destino aparece su traducción, y una cuenta de puntos cruza el
   puente entre las dos. Un recorrido dura 6 s. Usa el bucle ÚNICO (PC.bucle) y solo corre mientras se ve.
   Movimiento reducido o sin lienzo → html[data-escaneo="estatico"] y queda el respaldo SVG del build.
   El lienzo es decorativo: aria-hidden y sin eventos propios. No representa una traducción real. */
(function (w, d) {
  'use strict';
  var K = w.PC = w.PC || {};
  var raiz = d.documentElement;
  var NOCHE = '#0A1014', CAUCE = '#101A20', LINEA = '#27373F', CENIZA = '#94A3B8';
  var AGUA = '#2DD4BF', AMBAR = '#F59E0B', JADE = '#0F766E', HUMO = '#E2E8F0';
  var RECORRIDO = 6000, LINEAS = 5;

  function estatico(motivo) { raiz.dataset.escaneo = 'estatico'; raiz.dataset.escaneoMotivo = motivo; }

  /* Longitudes con semilla fija: las mismas en cada recorrido y en cada carga. La traducción no mide lo
     mismo que el original: otra semilla para la orilla de destino. */
  function largos(semilla) {
    var s = semilla, out = [];
    function r() { s = (s * 16807) % 2147483647; return (s % 10000) / 10000; }
    for (var i = 0; i < LINEAS; i++) { out.push(0.4 + r() * 0.5); }
    return out;
  }

  function montar(lienzo, id) {
    var ctx = lienzo.getContext('2d');
    if (!ctx) { return false; }
    var ancho = 0, alto = 0, dpr = Math.min(w.devicePixelRatio || 1, 2);
    var lo = largos(20260118), ld = largos(20261011);
    function medir() {
      var r = lienzo.getBoundingClientRect();
      ancho = r.width; alto = r.height;
      lienzo.width = Math.round(ancho * dpr); lienzo.height = Math.round(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function caja(x, y, wd, h, rad, color) {
      ctx.fillStyle = color; ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(x, y, wd, h, rad); } else { ctx.rect(x, y, wd, h); }
      ctx.fill();
    }
    function panel(x, y, wd, h, borde) {
      caja(x, y, wd, h, 8, CAUCE);
      ctx.strokeStyle = borde; ctx.lineWidth = 1.4; ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(x, y, wd, h, 8); } else { ctx.rect(x, y, wd, h); }
      ctx.stroke();
    }
    function pintar(ms) {
      ctx.fillStyle = NOCHE; ctx.fillRect(0, 0, ancho, alto);
      var avance = (ms % RECORRIDO) / RECORRIDO;
      /* El recinto: el servidor que contiene las dos orillas */
      var m = Math.min(ancho, alto) * 0.06;
      ctx.strokeStyle = LINEA; ctx.lineWidth = 1.2; ctx.setLineDash([3, 5]); ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(m, m, ancho - 2 * m, alto - 2 * m, 14); } else { ctx.rect(m, m, ancho - 2 * m, alto - 2 * m); }
      ctx.stroke(); ctx.setLineDash([]);
      var pw = (ancho - 2 * m) * 0.36, ph = (alto - 2 * m) * 0.7, py = m + (alto - 2 * m - ph) / 2;
      var ox = m + (ancho - 2 * m) * 0.06, dx = ancho - m - (ancho - 2 * m) * 0.06 - pw;
      panel(ox, py, pw, ph, AGUA);
      panel(dx, py, pw, ph, AMBAR);
      var paso = ph / (LINEAS + 1), alto_l = Math.max(3, paso * 0.2);
      for (var i = 0; i < LINEAS; i++) {
        var t0 = i / LINEAS, t1 = (i + 0.6) / LINEAS;
        var hecho = Math.max(0, Math.min(1, (avance - t0) / (t1 - t0)));
        var yy = py + paso * (i + 1);
        if (hecho > 0) {
          caja(ox + pw * 0.1, yy - alto_l / 2, pw * 0.8 * lo[i] * hecho, alto_l, alto_l / 2, i === 0 ? AGUA : CENIZA);
          var tr = Math.max(0, (hecho - 0.15) / 0.85);
          if (tr > 0) { caja(dx + pw * 0.1, yy - alto_l / 2, pw * 0.8 * ld[i] * tr, alto_l, alto_l / 2, i === 0 ? AMBAR : HUMO); }
          if (hecho < 1) {
            /* La cuenta de puntos cruza el puente mientras la línea se escribe */
            var x0 = ox + pw + 6, x1 = dx - 6, t = hecho;
            ctx.strokeStyle = JADE; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.4; ctx.setLineDash([2, 6]);
            ctx.beginPath(); ctx.moveTo(x0, yy); ctx.quadraticCurveTo((x0 + x1) / 2, yy - paso * 1.8, x1, yy); ctx.stroke();
            ctx.setLineDash([]); ctx.globalAlpha = 1;
            for (var k = 0; k < 3; k++) {
              var tt = Math.max(0, t - k * 0.06), qx = x0 + (x1 - x0) * tt;
              var qy = yy - Math.sin(Math.PI * tt) * paso * 0.9;
              ctx.fillStyle = k === 0 ? AMBAR : AGUA; ctx.globalAlpha = 1 - k * 0.3;
              ctx.beginPath(); ctx.arc(qx, qy, 3.2 - k * 0.6, 0, Math.PI * 2); ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
        }
      }
      caja(ox, py - 10, pw * 0.22, 4, 2, AGUA);
      caja(dx, py - 10, pw * 0.22, 4, 2, AMBAR);
    }
    medir();
    w.addEventListener('resize', medir);
    K.bucle.registrar(id, pintar);
    if ('IntersectionObserver' in w) {
      new IntersectionObserver(function (es) { es.forEach(function (en) { K.bucle.activar(id, en.isIntersecting); }); }).observe(lienzo);
    } else { K.bucle.activar(id, true); }
    return true;
  }

  K.escaneo = {
    iniciar: function () {
      if (w.matchMedia('(prefers-reduced-motion: reduce)').matches) { return estatico('movimiento-reducido'); }
      if (!K.bucle) { return estatico('sin-bucle'); }
      var lienzos = d.querySelectorAll('canvas.escaneo-gl'), n = 0;
      Array.prototype.forEach.call(lienzos, function (c, i) { if (montar(c, 'escaneo-' + i)) { n++; } });
      if (n) { raiz.dataset.escaneo = 'animado'; } else { estatico('sin-lienzo'); }
    }
  };
})(window, document);
