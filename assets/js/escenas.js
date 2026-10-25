/* Escenas del mapa: una ilustración geométrica por servicio (puntos, líneas, flechas, polígonos).
   Se dibujan al abrir el servicio. Son ejemplos ilustrativos, no datos reales.
   Para agregar una: define window.SG_ESC.escenas["id-del-servicio"] = (h) => { ... } y escribe su leyenda en servicios.json (mapa.leyenda). */
(() => {
  "use strict";
  const C = { g: "#1f6b4a", lg: "#5dbb8a", o: "#ef6c00", b: "#2a7fb8", y: "#e0a800", r: "#c0392b", p: "#7b4fb0", k: "#51605a", br: "#8a6a3b", t: "#12877a" };
  const K = 111, RAD = Math.PI / 180;
  const P = (c, dx, dy) => [c[0] + dy / K, c[1] + dx / (K * Math.cos(c[0] * RAD))];
  const xy = (o, p) => [(p[1] - o[1]) * K * Math.cos(o[0] * RAD), (p[0] - o[0]) * K];
  const LA = [-37.4697, -72.3537], CC = [-36.827, -73.0503];
  const T = { mul: [-37.7167, -72.2405], nac: [-37.5, -72.67], sb: [-37.67, -72.02], cab: [-37.03, -72.4], yum: [-37.1, -72.55], laja: [-37.28, -72.71], lota: [-37.09, -73.16], ara: [-37.25, -73.32], tal: [-36.72, -73.12], cor: [-37.03, -73.15], can: [-37.8, -73.4] };

  /* Contexto de dibujo: cada step() abre un grupo que aparece un poco después del anterior */
  function ctx() {
    const st = [[]], pts = [];
    const add = (l, ll) => { st[st.length - 1].push(l); (ll || []).forEach((p) => pts.push(p)); return l; };
    const tip = (l, o) => { if (o && o.label) l.bindTooltip(o.label, { permanent: true, direction: o.dir || "top", offset: o.off || [0, -4] }); return l; };
    const icon = (ll, html, o = {}) => add(tip(L.marker(ll, { icon: L.divIcon({ className: "fx", html, iconSize: [0, 0] }), interactive: false, keyboard: false }), o), [ll]);
    const head = (a, b, c) => { const dx = (b[1] - a[1]) * Math.cos(b[0] * RAD), dy = b[0] - a[0]; return icon(b, `<div class="ah" style="--c:${c};transform:rotate(${(-Math.atan2(dy, dx) / RAD).toFixed(1)}deg)"><i></i></div>`); };
    const h = {
      st, pts, P, C, LA, CC, T, K,
      step() { if (st[st.length - 1].length) st.push([]); },
      dot(ll, c = C.g, o = {}) { return add(tip(L.circleMarker(ll, { radius: o.r || 7, color: "#fff", weight: 2, fillColor: c, fillOpacity: 1, className: "fx" }), o), [ll]); },
      line(a, o = {}) { return add(L.polyline(a, { color: o.c || C.g, weight: o.w || 3, opacity: o.op == null ? 0.9 : o.op, dashArray: o.dash || null, className: "fx" + (o.flow ? " fl" : "") }), a); },
      poly(a, o = {}) { return add(tip(L.polygon(a, { color: o.c || C.g, weight: o.w == null ? 2 : o.w, fillColor: o.f || o.c || C.g, fillOpacity: o.fo == null ? 0.25 : o.fo, dashArray: o.dash || null, className: "fx" }), o), a); },
      ring(c, km, o = {}) { return add(tip(L.circle(c, { radius: km * 1000, color: o.c || C.g, weight: o.w == null ? 2 : o.w, fillColor: o.f || o.c || C.g, fillOpacity: o.fo == null ? 0.12 : o.fo, dashArray: o.dash || null, className: "fx" }), o), [P(c, km, 0), P(c, -km, 0), P(c, 0, km), P(c, 0, -km)]); },
      arrow(a, b, o = {}) { const c = o.c || C.g; h.line([a, b], { c, w: o.w || 3, dash: o.dash, flow: o.flow !== false }); head(a, b, c); },
      curve(a, b, o = {}) {
        const c = o.c || C.g, bend = o.bend == null ? 0.3 : o.bend, A = xy(a, a), B = xy(a, b);
        const m = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], d = [B[0] - A[0], B[1] - A[1]], n = [-d[1] * bend, d[0] * bend], q = [m[0] + n[0], m[1] + n[1]];
        const pts2 = []; for (let i = 0; i <= 24; i++) { const t = i / 24, u = 1 - t; pts2.push(P(a, u * u * A[0] + 2 * u * t * q[0] + t * t * B[0], u * u * A[1] + 2 * u * t * q[1] + t * t * B[1])); }
        h.line(pts2, { c, w: o.w || 3, dash: o.dash, flow: o.flow !== false });
        if (o.head !== false) head(pts2[pts2.length - 3], b, c);
        return pts2;
      },
      badge(ll, txt, c = C.g, o = {}) { return icon(ll, `<div class="bd" style="--c:${c}">${txt}</div>`, o); },
      pulse(ll, c = C.r, o = {}) { return icon(ll, `<div class="pl" style="--c:${c}"><i></i><b></b></div>`, o); },
      hex(c, km, o = {}) { const a = []; for (let i = 0; i < 6; i++) a.push(P(c, km * Math.cos(i * 60 * RAD), km * Math.sin(i * 60 * RAD))); return h.poly(a, o); },
      rect(c, w, hh, o = {}) { return h.poly([P(c, -w / 2, -hh / 2), P(c, w / 2, -hh / 2), P(c, w / 2, hh / 2), P(c, -w / 2, hh / 2)], o); },
      sector(c, dir, spread, km, o = {}) { const a = [c]; for (let i = 0; i <= 8; i++) { const t = (dir - spread / 2 + spread * i / 8) * RAD; a.push(P(c, km * Math.cos(t), km * Math.sin(t))); } return h.poly(a, o); },
      buffer(a, km) { const o = a[0], X = a.map((p) => xy(o, p)), l = [], r = []; X.forEach((p, i) => { const q = X[Math.min(i + 1, X.length - 1)], s = X[Math.max(i - 1, 0)], d = [q[0] - s[0], q[1] - s[1]], L2 = Math.hypot(d[0], d[1]) || 1, n = [-d[1] / L2 * km, d[0] / L2 * km]; l.push(P(o, p[0] + n[0], p[1] + n[1])); r.push(P(o, p[0] - n[0], p[1] - n[1])); }); return l.concat(r.reverse()); }
    };
    return h;
  }

  const E = {};

  /* ---------- Residuos y economía circular ---------- */
  E.simbiosis = (h) => {
    const n = [h.P(h.LA, -9, 6), h.P(h.LA, 8, 8), h.P(h.LA, 10, -6), h.P(h.LA, -7, -8)], nm = ["Aserradero", "Cartonera", "Agroindustria", "Lácteos"];
    n.forEach((p, i) => h.dot(p, [h.C.br, h.C.b, h.C.y, h.C.t][i], { r: 11, label: nm[i] }));
    h.step();
    n.forEach((p, i) => h.curve(p, n[(i + 1) % 4], { c: h.C.o, bend: 0.28 }));
    h.step(); h.pulse(h.LA, h.C.lg, { label: "El residuo de uno es insumo de otro", dir: "bottom", off: [0, 6] });
  };
  E.valorizacion = (h) => {
    const g = [[-15, 7], [-9, 14], [3, 15], [14, 8], [13, -7], [2, -14], [-11, -9]].map(([x, y]) => h.P(h.LA, x, y));
    g.forEach((p) => h.dot(p, h.C.o, { r: 6 }));
    h.step(); h.pulse(h.LA, h.C.g, { label: "Planta", dir: "bottom", off: [0, 8] }); h.dot(h.LA, h.C.g, { r: 11 });
    g.forEach((p) => h.arrow(p, h.LA, { c: h.C.o, w: 2 }));
    h.step();
    [h.P(h.LA, -24, -4), h.P(h.LA, 20, 20), h.P(h.LA, 22, -17)].forEach((p, i) => { h.arrow(h.LA, p, { c: h.C.g, w: 4 }); h.dot(p, h.C.lg, { r: 9, label: i === 0 ? "Compradores" : undefined }); });
    h.badge(h.P(h.LA, 0, 0), "♻", "#1f6b4a");
  };
  E.destino = (h) => {
    const o = T.mul, ok = h.P(o, -14, 18), n1 = h.P(o, 16, 14), n2 = h.P(o, 20, -12);
    h.dot(o, h.C.o, { r: 9, label: "Su residuo", dir: "bottom", off: [0, 6] });
    h.step();
    h.line([o, n1], { c: h.C.k, dash: "4 8", w: 2 }); h.line([o, n2], { c: h.C.k, dash: "4 8", w: 2 });
    h.dot(n1, h.C.k, { r: 7 }); h.dot(n2, h.C.k, { r: 7 }); h.badge(n1, "✕", h.C.r); h.badge(n2, "✕", h.C.r);
    h.step(); h.arrow(o, ok, { c: h.C.g, w: 5 }); h.dot(ok, h.C.g, { r: 11, label: "Destino autorizado" }); h.badge(ok, "✓", h.C.g);
  };
  E["produccion-limpia"] = (h) => {
    const c = h.P(h.LA, 0, 0), nm = ["Insumos", "Producción", "Producto", "Uso", "Reciclaje"], n = nm.map((_, i) => h.P(c, 12 * Math.sin(i * 72 * RAD), 12 * Math.cos(i * 72 * RAD)));
    n.forEach((p, i) => h.dot(p, [h.C.br, h.C.b, h.C.g, h.C.y, h.C.t][i], { r: 9, label: nm[i] }));
    h.step(); n.forEach((p, i) => h.curve(p, n[(i + 1) % 5], { c: h.C.lg, bend: -0.22, w: 4 }));
    h.step(); h.badge(c, "♻", h.C.g); h.ring(c, 12, { c: h.C.lg, dash: "3 9", fo: 0.05 });
  };

  /* ---------- Gestión ambiental y territorio ---------- */
  E.problemas = (h) => {
    const s = [[-8, 6, 5], [7, 9, 3], [10, -4, 6], [-3, -9, 4], [0, 1, 2.5]];
    s.forEach(([x, y, r], i) => { const p = h.P(h.LA, x, y); h.ring(p, r, { c: h.C.r, fo: 0.18, dash: "2 6" }); h.step(); h.pulse(p, h.C.r, i === 4 ? { label: "Foco crítico", dir: "bottom", off: [0, 8] } : {}); h.dot(p, h.C.r, { r: 6 }); });
    h.step(); h.line([h.P(h.LA, -8, 6), h.P(h.LA, 0, 1), h.P(h.LA, 7, 9), h.P(h.LA, 10, -4), h.P(h.LA, -3, -9), h.P(h.LA, 0, 1)], { c: h.C.k, w: 1.5, dash: "3 7", op: 0.7 });
  };
  E.politica = (h) => {
    [14, 9.5, 5.5].forEach((r, i) => h.hex(h.LA, r, { c: [h.C.b, h.C.t, h.C.g][i], fo: 0.14 + i * 0.07, w: 2 }));
    h.step(); [[11, 7, "$"], [-10, 6, "%"], [-4, -11, "$"], [3, 3, "✓"]].forEach(([x, y, t], i) => h.badge(h.P(h.LA, x, y), t, [h.C.y, h.C.b, h.C.y, h.C.g][i]));
    h.step(); h.dot(h.LA, h.C.g, { r: 8, label: "Incentivos y tarifas por zona" });
  };
  E.ecologia = (h) => {
    const a = [h.P(T.nac, -6, 4), h.P(T.nac, -2, 9), h.P(T.nac, 5, 7), h.P(T.nac, 7, 0), h.P(T.nac, 3, -5), h.P(T.nac, -4, -4)], c2 = h.P(T.laja, 0, 0);
    h.poly(a, { c: h.C.g, fo: 0.3 }); h.poly([h.P(c2, -4, 3), h.P(c2, 1, 6), h.P(c2, 6, 2), h.P(c2, 3, -4), h.P(c2, -3, -3)], { c: h.C.g, fo: 0.3 });
    h.poly([h.P(h.LA, -7, 6), h.P(h.LA, 0, 9), h.P(h.LA, 6, 4), h.P(h.LA, 2, -3), h.P(h.LA, -5, -2)], { c: h.C.g, fo: 0.3 });
    h.step(); h.line([h.P(T.nac, 1, 2), h.P(T.laja, -1, -1), h.P(h.LA, -2, 3)], { c: h.C.o, w: 4, dash: "2 8", flow: true, label: "" }); h.badge(h.P(T.laja, 2, 0), "🌿", h.C.g, { label: "Corredor biológico" });
    h.step(); [[-3, 1], [2, 3], [-1, -2], [4, -1]].forEach(([x, y]) => { h.dot(h.P(T.nac, x, y), h.C.y, { r: 4 }); h.dot(h.P(h.LA, x, y), h.C.y, { r: 4 }); });
  };
  E.decisiones = (h) => {
    const s = [[-12, 5, 9, "3"], [-3, 12, 12, "1"], [9, 6, 7, "4"], [11, -8, 10, "2"], [-4, -9, 6, "5"]];
    s.forEach(([x, y, r, t]) => { h.ring(h.P(h.LA, x, y), r * 0.55, { c: h.C.b, fo: 0.2 }); h.badge(h.P(h.LA, x, y), t, h.C.b); });
    h.step(); const best = h.P(h.LA, -3, 12); h.ring(best, 7, { c: h.C.g, fo: 0.3, w: 3 }); h.pulse(best, h.C.g, { label: "Mejor opción", dir: "top", off: [0, -16] }); h.badge(best, "★", h.C.g);
  };
  E.evaluacion = (h) => {
    const a = h.P(h.LA, -20, -8), b = h.P(h.LA, 20, 10);
    h.dot(a, h.C.b, { r: 9, label: "Inicio" }); h.dot(b, h.C.b, { r: 9, label: "Fin" });
    h.step(); h.curve(a, b, { c: h.C.k, bend: 0.38, dash: "5 8", flow: false, head: false, w: 3 }); h.curve(a, b, { c: h.C.k, bend: -0.34, dash: "5 8", flow: false, head: false, w: 3 });
    h.step(); h.curve(a, b, { c: h.C.g, bend: 0.0, w: 6 }); h.badge(h.P(h.LA, 0, 0.5), "✓", h.C.g, { label: "Menor impacto" });
    h.badge(h.P(h.LA, 0, 14), "B", h.C.k); h.badge(h.P(h.LA, 0, -13), "C", h.C.k);
  };
  E.gestion = (h) => {
    const c = h.LA; h.rect(c, 7, 5, { c: h.C.g, fo: 0.35, w: 2 });
    h.step(); const o = [[-11, 9], [0, 12], [11, 9], [12, -5], [0, -11], [-12, -5]];
    o.forEach(([x, y], i) => { h.line([c, h.P(c, x, y)], { c: h.C.lg, w: 1.5, dash: "3 6", op: 0.8 }); h.badge(h.P(c, x, y), i === 3 ? "!" : "✓", i === 3 ? h.C.y : h.C.g); });
    h.step(); h.badge(h.P(c, 12, -5), "✓", h.C.g); h.dot(c, h.C.g, { r: 9, label: "Cumplimiento bajo control" });
  };
  E.proyectos = (h) => {
    const p = [h.LA, h.P(h.LA, 12, 6), h.P(h.LA, 24, 2), h.P(h.LA, 35, 14)], nm = ["Idea", "Diseño", "Obra", "Operación"];
    p.forEach((q, i) => { h.step(); if (i) h.arrow(p[i - 1], q, { c: h.C.g, w: 4 }); h.badge(q, String(i + 1), h.C.g, { label: nm[i], dir: "top", off: [0, -14] }); });
  };
  E.clima = (h) => {
    [[16, 10, h.C.y, 0.1], [11, 7, h.C.o, 0.16], [6, 4, h.C.r, 0.24]].forEach(([a, b, c, f]) => { const pts = []; for (let i = 0; i < 28; i++) { const t = i / 28 * 2 * Math.PI; pts.push(h.P(h.LA, a * Math.cos(t) * 1.15, b * Math.sin(t) * 1.15 + 1.5 * Math.cos(t * 2))); } h.poly(pts, { c, fo: f, w: 2 }); });
    h.step(); h.pulse(h.P(h.LA, 1, 1), h.C.r, { label: "Zona de calor", dir: "bottom", off: [0, 8] });
    h.step(); [[-14, 10], [0, 14], [14, 10]].forEach(([x, y]) => h.arrow(h.P(h.LA, x, y - 2), h.P(h.LA, x, y + 4), { c: h.C.r, w: 3 })); h.badge(h.P(h.LA, 0, 18), "🌡", h.C.r);
  };
  E.riesgos = (h) => {
    const rv = [h.P(T.nac, -20, 14), h.P(T.nac, -8, 9), h.P(T.nac, 2, 0), h.P(T.nac, 12, -6), h.P(T.nac, 24, -4)];
    h.line(rv, { c: h.C.b, w: 5, op: 0.95 });
    h.step(); h.poly(h.buffer(rv, 3.2), { c: h.C.b, fo: 0.22, dash: "3 6" });
    h.step(); h.pulse(h.P(T.nac, 2, 0), h.C.r, { label: "Zona inundable", dir: "bottom", off: [0, 8] });
    h.step(); [[-6, 16], [10, 9]].forEach(([x, y]) => { const q = h.P(T.nac, x, y); h.arrow(h.P(T.nac, x * 0.5, y * 0.2), q, { c: h.C.o, w: 3 }); h.dot(q, h.C.g, { r: 9 }); h.badge(q, "✓", h.C.g); });
  };
  E.rehab = (h) => {
    const c = h.P(T.yum, 0, 0);
    h.ring(c, 11, { c: h.C.br, fo: 0.28, dash: "4 6" });
    h.step(); h.ring(c, 8, { c: h.C.y, fo: 0.2, w: 1 }); h.step(); h.ring(c, 5, { c: h.C.lg, fo: 0.3, w: 1 }); h.step(); h.ring(c, 2.4, { c: h.C.g, fo: 0.45, w: 1 });
    h.step(); [[-3, 2], [4, 4], [6, -3], [-5, -5], [1, -2], [0, 8]].forEach(([x, y]) => h.badge(h.P(c, x, y), "🌱", h.C.g)); h.pulse(c, h.C.g, { label: "Del suelo degradado al recuperado", dir: "bottom", off: [0, 8] });
  };
  E.asentamientos = (h) => {
    const R = 3.4, d = Math.sqrt(3) * R, c = h.P(T.cab, 0, 0);
    h.hex(c, R, { c: h.C.g, fo: 0.4 });
    for (let k = 0; k < 6; k++) { const a = (30 + 60 * k) * RAD; h.step(); h.hex(h.P(c, d * Math.cos(a), d * Math.sin(a)), R, { c: [h.C.t, h.C.lg][k % 2], fo: 0.28 }); }
    h.step(); h.badge(c, "⌂", h.C.g, { label: "Barrio compacto, servicios a pie", dir: "bottom", off: [0, 12] });
    for (let k = 0; k < 6; k++) { const a = (30 + 60 * k) * RAD; h.dot(h.P(c, d * Math.cos(a), d * Math.sin(a)), h.C.y, { r: 4 }); }
    h.line([h.P(c, -16, 0), h.P(c, 16, 0)], { c: h.C.k, w: 2, dash: "6 6", op: 0.7 });
  };
  E.turismo = (h) => {
    const c = h.P(T.laja, 6, -4), p = []; for (let i = 0; i < 6; i++) p.push(h.P(c, 16 * Math.cos(i * 60 * RAD) * 1.1, 11 * Math.sin(i * 60 * RAD)));
    p.forEach((q, i) => { h.step(); h.arrow(p[(i + 5) % 6], q, { c: h.C.o, w: 3 }); h.badge(q, ["⛰", "💧", "🏘", "🌲", "♨", "📷"][i], h.C.o); });
    h.step(); h.dot(c, h.C.g, { r: 8, label: "Circuito que dura más de un día", dir: "bottom", off: [0, 6] });
  };
  E.investigacion = (h) => {
    const c = h.LA;
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) h.dot(h.P(c, -12 + i * 6, -8 + j * 5.3), h.C.k, { r: 3.5 });
    h.step(); const v = [];
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const z = Math.exp(-(((i - 3) ** 2) + ((j - 2) ** 2)) / 3); h.dot(h.P(c, -12 + i * 6, -8 + j * 5.3), z > 0.6 ? h.C.r : z > 0.3 ? h.C.o : h.C.lg, { r: 4 + z * 6 }); if (z > 0.9) v.push(h.P(c, -12 + i * 6, -8 + j * 5.3)); }
    h.step(); h.line([h.P(c, -14, -10), h.P(c, 16, 5)], { c: h.C.b, w: 2, dash: "6 5", flow: true }); h.pulse(v[0] || c, h.C.r, { label: "Dato que explica el problema", dir: "top", off: [0, -16] });
  };
  E.nbs = (h) => {
    const rv = [h.P(h.LA, -20, 6), h.P(h.LA, -8, 2), h.P(h.LA, 4, 4), h.P(h.LA, 18, -2)];
    h.line(rv, { c: h.C.b, w: 4 });
    h.poly(h.buffer(rv, 2.4), { c: h.C.t, fo: 0.3, dash: "2 5" });
    h.step(); [[-8, 0], [0, 6], [8, 1], [-14, 7]].forEach(([x, y]) => h.badge(h.P(h.LA, x, y), "🌳", h.C.g));
    h.step(); [[-4, -6], [8, -7], [14, -5]].forEach(([x, y]) => h.arrow(h.P(h.LA, x, y + 5), h.P(h.LA, x, y), { c: h.C.b, w: 3 }));
    h.step(); h.rect(h.P(h.LA, 6, -12), 10, 5, { c: h.C.k, fo: 0.45 }); h.badge(h.P(h.LA, 6, -12), "⌂", h.C.k, { label: "La naturaleza protege la ciudad", dir: "bottom", off: [0, 12] });
  };
  E.biomimetica = (h) => {
    const R = 3.2, d = Math.sqrt(3) * R; let n = 0;
    h.hex(h.LA, R, { c: h.C.g, fo: 0.5 });
    [[1, 6], [2, 12]].forEach(([ring, cnt]) => { h.step(); for (let k = 0; k < cnt; k++) { const a = (30 + 360 * k / cnt) * RAD, r = d * ring * (ring === 2 ? (k % 2 ? 0.93 : 1) : 1); h.hex(h.P(h.LA, r * Math.cos(a), r * Math.sin(a)), R, { c: [h.C.t, h.C.lg, h.C.g][(k + n++) % 3], fo: 0.3, w: 1.5 }); } });
    h.step(); h.badge(h.LA, "🐝", h.C.y, { label: "Soluciones tomadas de la naturaleza", dir: "bottom", off: [0, 12] });
  };
  E.metabolismo = (h) => {
    const c = h.LA; h.ring(c, 6, { c: h.C.k, fo: 0.3, w: 3 });
    h.step(); [[-22, 0, h.C.b, "Agua"], [0, 22, h.C.y, "Energía"], [22, 0, h.C.g, "Alimentos"]].forEach(([x, y, col, t]) => { const p = h.P(c, x, y); h.dot(p, col, { r: 7, label: t }); h.arrow(p, h.P(c, x * 0.3, y * 0.3), { c: col, w: 3 }); });
    h.step(); [[-14, -17], [14, -17], [0, -22]].forEach(([x, y]) => { h.arrow(h.P(c, x * 0.3, y * 0.3), h.P(c, x, y), { c: h.C.o, w: 3 }); h.dot(h.P(c, x, y), h.C.o, { r: 6 }); });
    h.badge(h.P(c, 0, -23), "Sale", h.C.o); h.badge(c, "🏙", h.C.k);
  };
  E.impacto = (h) => {
    const c = h.LA; h.rect(c, 8, 5, { c: h.C.g, fo: 0.45, w: 2 });
    h.step(); h.rect(c, 26, 18, { c: h.C.o, fo: 0.07, dash: "5 6" });
    h.step(); [[-10, 7], [11, 5], [-5, -8], [9, -7]].forEach(([x, y]) => { h.dot(h.P(c, x, y), h.C.r, { r: 6 }); h.line([c, h.P(c, x, y)], { c: h.C.k, w: 1, dash: "2 6", op: 0.7 }); });
    h.step(); h.badge(h.P(c, -13, 9), "✓", h.C.g, { label: "Medidas de mitigación", dir: "top", off: [0, -14] }); h.badge(h.P(c, 13, -9), "👁", h.C.b, { label: "Monitoreo", dir: "bottom", off: [0, 12] });
  };

  /* ---------- Datos, mapas y geoespacial ---------- */
  E.sig = (h) => {
    const base = [h.P(h.LA, -16, -6), h.P(h.LA, 8, -6), h.P(h.LA, 16, 4), h.P(h.LA, -8, 4)];
    [[0, h.C.k], [5, h.C.b], [10, h.C.g], [15, h.C.o]].forEach(([dy, c], i) => { h.step(); const q = base.map((p) => [p[0] + dy / K, p[1]]); h.poly(q, { c, fo: 0.22, w: 2 }); if (i) h.line([base[1], q[1]], { c: h.C.k, w: 1, dash: "2 4", op: 0.5 }); });
    h.step(); h.dot(h.P(h.LA, 0, -1), h.C.r, { r: 6 }); h.dot(h.P(h.LA, 0, 14), h.C.r, { r: 6, label: "Capas sobre el mismo punto" }); h.line([h.P(h.LA, 0, -1), h.P(h.LA, 0, 14)], { c: h.C.r, w: 2, dash: "3 5" });
  };
  E["decision-geo"] = (h) => {
    const c = h.LA, n = 7; let best = null, bv = -1;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const z = (Math.sin(i * 0.9) + Math.cos(j * 1.1) + 2) / 4 * 0.6 + Math.exp(-(((i - 4) ** 2) + ((j - 3) ** 2)) / 4) * 0.5; if (z > bv) { bv = z; best = [i, j]; } }
    for (let i = 0; i < n; i++) { if (i % 2 === 0) h.step(); for (let j = 0; j < n; j++) { const z = (Math.sin(i * 0.9) + Math.cos(j * 1.1) + 2) / 4 * 0.6 + Math.exp(-(((i - 4) ** 2) + ((j - 3) ** 2)) / 4) * 0.5; h.rect(h.P(c, (i - 3) * 4.4, (j - 3) * 4.4), 4.2, 4.2, { c: z > 0.85 ? h.C.g : z > 0.6 ? h.C.lg : z > 0.4 ? h.C.y : h.C.r, fo: 0.45, w: 0 }); } }
    h.step(); const p = h.P(c, (best[0] - 3) * 4.4, (best[1] - 3) * 4.4); h.rect(p, 4.2, 4.2, { c: h.C.g, fo: 0, w: 3 }); h.pulse(p, h.C.g, { label: "Mejor ubicación", dir: "top", off: [0, -16] });
  };
  E.tierra = (h) => {
    const c = h.LA, sat = h.P(c, -24, 26); let k = 0;
    h.badge(sat, "🛰", h.C.b);
    h.step(); [[-14, -10], [14, -10], [14, 10], [-14, 10]].forEach(([x, y]) => h.line([sat, h.P(c, x, y)], { c: h.C.b, w: 1.5, dash: "4 6", op: 0.7, flow: true }));
    for (let i = 0; i < 10; i++) { if (i % 2 === 0) h.step(); for (let j = 0; j < 7; j++) { const z = (Math.sin(i * 0.8 + j * 0.5) + 1) / 2; h.rect(h.P(c, (i - 4.5) * 3, (j - 3) * 3), 2.9, 2.9, { c: z > 0.7 ? "#2d7a46" : z > 0.4 ? "#8aa84e" : z > 0.2 ? "#c9b26a" : "#6a8fa8", fo: 0.55, w: 0 }); k++; } }
    h.step(); h.badge(h.P(c, 0, -13), "Imagen satelital → mapa", h.C.k);
  };

  /* ---------- Sistemas informáticos y automatización ---------- */
  E.software = (h) => {
    const c = h.LA, n = [[-14, 8], [-6, 14], [8, 12], [15, 3], [12, -9], [0, -13], [-12, -6]].map(([x, y]) => h.P(c, x, y));
    h.dot(c, h.C.p, { r: 12, label: "Su sistema" });
    h.step(); n.forEach((p) => { h.line([c, p], { c: h.C.p, w: 2, flow: true }); h.dot(p, h.C.p, { r: 6 }); });
    h.step(); [[0, 1], [2, 3], [4, 5], [6, 0]].forEach(([a, b]) => h.line([n[a], n[b]], { c: h.C.k, w: 1.5, dash: "3 5", op: 0.7 }));
    h.badge(c, "</>", h.C.p);
  };
  E.automatizacion = (h) => {
    const c = h.LA, hub = h.P(c, 0, 0), s = [[-14, 6], [-8, -9], [9, 10], [14, -4], [3, -13]].map(([x, y]) => h.P(c, x, y));
    s.forEach((p) => h.dot(p, h.C.t, { r: 5 }));
    h.step(); s.forEach((p) => h.pulse(p, h.C.t)); s.forEach((p) => h.line([p, hub], { c: h.C.t, w: 2, dash: "4 6", flow: true }));
    h.step(); h.badge(hub, "📡", h.C.t, { label: "Control y monitoreo", dir: "bottom", off: [0, 12] });
    h.step(); h.pulse(s[2], h.C.r, { label: "Alerta temprana", dir: "top", off: [0, -16] }); h.dot(s[2], h.C.r, { r: 7 });
  };
  E.web = (h) => {
    const t = [T.mul, T.nac, T.sb, T.cab, T.laja, T.yum, h.P(h.LA, 30, 20)];
    h.badge(h.LA, "🌐", h.C.p, { label: "Su plataforma", dir: "bottom", off: [0, 12] });
    t.forEach((p, i) => { h.step(); h.curve(h.LA, p, { c: h.C.p, bend: 0.2 * (i % 2 ? 1 : -1), w: 2, head: false }); h.dot(p, h.C.lg, { r: 6 }); });
    h.step(); h.pulse(h.LA, h.C.p);
  };

  /* ---------- Producción, energía y recursos ---------- */
  E.energia = (h) => {
    const sc = h.P(h.LA, -8, 4), hub = h.P(h.LA, 6, -2);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) h.rect(h.P(sc, i * 2.6 - 4, j * 1.9 - 2), 2.2, 1.5, { c: h.C.b, fo: 0.65, w: 1 });
    h.badge(h.P(sc, 0, 4), "☀", h.C.y, { label: "Solar" });
    h.step(); for (let i = 0; i < 5; i++) h.badge(h.P(h.LA, 8 + i * 3, 12 - i * 1.5), "✺", h.C.t);
    h.badge(h.P(h.LA, 14, 14), "Eólica", h.C.t);
    h.step(); h.line([sc, hub, h.P(h.LA, 16, 8)], { c: h.C.y, w: 4, flow: true }); h.line([hub, h.P(h.LA, 12, -12)], { c: h.C.y, w: 4, flow: true });
    h.step(); h.dot(hub, h.C.y, { r: 10, label: "Energía para su operación", dir: "bottom", off: [0, 8] }); h.badge(hub, "⚡", "#c29200");
  };
  E.agro = (h) => {
    const c = h.P(h.LA, 0, 0), pal = ["#c9b26a", "#8aa84e", "#2d7a46", "#e0a800"];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (!j) h.step(); h.rect(h.P(c, (i - 1) * 8.4, (j - 1) * 6.2), 8, 5.8, { c: pal[(i * 3 + j) % 4], fo: 0.5, w: 1.5 }); }
    h.step(); h.line([h.P(c, -12, -9), h.P(c, 12, -9), h.P(c, 12, -5.6), h.P(c, -12, -5.6), h.P(c, -12, -2.2), h.P(c, 12, -2.2), h.P(c, 12, 1.2), h.P(c, -12, 1.2)], { c: h.C.o, w: 3, flow: true });
    h.step(); h.ring(h.P(c, 0, 10), 3, { c: h.C.b, fo: 0.2 }); h.badge(h.P(c, 0, 10), "💧", h.C.b, { label: "Riego y trabajo guiados por datos", dir: "top", off: [0, -14] });
  };
  E.industria = (h) => {
    const c = h.LA, p = [[-11, 8], [11, 8], [11, -8], [-11, -8]].map(([x, y]) => h.P(c, x, y)), nm = ["Insumos", "Proceso", "Embalaje", "Despacho"];
    p.forEach((q, i) => { h.step(); h.rect(q, 6, 5, { c: [h.C.br, h.C.b, h.C.t, h.C.g][i], fo: 0.55, w: 2, label: nm[i], dir: "top" }); if (i) { const a = p[i - 1], d = [q[0] - a[0], q[1] - a[1]], n = Math.hypot(d[0], d[1]); h.arrow([a[0] + d[0] * 3.6 / (n * K), a[1] + d[1] * 3.6 / (n * K)], [q[0] - d[0] * 3.6 / (n * K), q[1] - d[1] * 3.6 / (n * K)], { c: h.C.k, w: 3 }); } });
    h.step(); h.curve(h.P(c, -11, -5), h.P(c, -11, 5.2), { c: h.C.o, bend: -0.5, dash: "4 6" }); h.badge(c, "💡", h.C.o, { label: "Mejora continua", dir: "bottom", off: [0, 12] });
  };

  /* ---------- Comercio y logística ---------- */
  E.abastecimiento = (h) => {
    const t = [T.mul, T.nac, T.sb, T.cab, T.yum, T.laja, h.P(h.LA, 0, 26)];
    h.badge(h.LA, "▣", h.C.o, { label: "Bodega", dir: "bottom", off: [0, 12] });
    t.forEach((p) => { h.step(); h.line([h.LA, p], { c: h.C.k, w: 2, dash: "4 7", op: 0.6 }); h.dot(p, h.C.k, { r: 5 }); });
    h.step(); const best = [T.mul, h.P(T.mul, 4, -14)]; h.curve(h.LA, T.cab, { c: h.C.g, bend: 0.15, w: 5, head: false }); h.curve(T.cab, T.yum, { c: h.C.g, bend: 0.1, w: 5, head: false }); h.curve(T.yum, T.laja, { c: h.C.g, bend: 0.1, w: 5 });
    h.badge(h.P(h.LA, 8, 12), "🚚", h.C.g, { label: "Ruta optimizada", dir: "top", off: [0, -14] });
  };

  /* ---------- Servicios profesionales y personas ---------- */
  E.profesionales = (h) => {
    const c = h.LA, ex = [[-14, 8, "⚖"], [0, 14, "🔧"], [14, 8, "📊"], [14, -8, "🧪"], [-14, -8, "🧭"]];
    h.dot(c, h.C.o, { r: 11, label: "Su proyecto", dir: "bottom", off: [0, 8] });
    ex.forEach(([x, y, t]) => { h.step(); h.line([c, h.P(c, x, y)], { c: h.C.lg, w: 3, flow: true }); h.badge(h.P(c, x, y), t, h.C.g); });
    h.step(); h.ring(c, 18, { c: h.C.lg, dash: "3 8", fo: 0.05 });
  };
  E.personas = (h) => {
    const c = h.LA, a = []; for (let i = 0; i < 18; i++) a.push(h.P(c, -22 + (i % 6) * 3.5 - 2 + ((i * 7) % 5) * 0.6, 14 + Math.floor(i / 6) * 4 - ((i * 3) % 4) * 0.6));
    a.forEach((p, i) => h.dot(p, h.C.k, { r: 4 }));
    h.step(); h.poly([h.P(c, -24, 21), h.P(c, -2, 21), h.P(c, -8, 1), h.P(c, -18, 1)], { c: h.C.b, fo: 0.12, dash: "4 6" });
    h.step(); const f = h.P(c, -13, 0); h.arrow(h.P(c, -13, 8), f, { c: h.C.g, w: 4 }); [a[2], a[8], a[13]].forEach((p) => { h.dot(p, h.C.g, { r: 8 }); h.line([p, h.P(c, -13, 8)], { c: h.C.lg, w: 1.5, dash: "3 5" }); });
    h.badge(f, "✓", h.C.g, { label: "Perfil que calza con su empresa", dir: "bottom", off: [0, 12] });
  };

  /* ---------- Mercado, marca y comunicación ---------- */
  E.mercado = (h) => {
    const c = h.LA;
    [20, 13, 6].forEach((r, i) => h.ring(c, r, { c: [h.C.p, h.C.b, h.C.g][i], fo: 0.08 + i * 0.07, dash: i ? null : "3 7" }));
    h.step(); h.sector(c, 20, 70, 20, { c: h.C.o, fo: 0.2, w: 1 }); h.sector(c, 150, 60, 13, { c: h.C.y, fo: 0.2, w: 1 });
    h.step(); for (let i = 0; i < 22; i++) { const a = (i * 137.5) * RAD, r = 3 + (i * 3.1) % 17; h.dot(h.P(c, r * Math.cos(a), r * Math.sin(a)), h.C.o, { r: 3.5 }); }
    h.step(); h.badge(c, "🎯", h.C.g, { label: "Dónde están sus clientes", dir: "bottom", off: [0, 12] });
  };
  E.marca = (h) => {
    const port = h.T.tal;
    h.dot(h.LA, h.C.g, { r: 9, label: "Su producto", dir: "bottom", off: [0, 8] });
    h.step(); h.arrow(h.LA, port, { c: h.C.g, w: 4 }); h.badge(port, "⚓", h.C.b);
    [[-0.9, 0.4], [-1.2, -0.3], [-0.8, -0.9]].forEach(([dx, dy], i) => { h.step(); const d = [port[0] + dy, port[1] + dx]; h.curve(port, d, { c: h.C.o, bend: 0.2 * (i - 1), w: 3 }); h.dot(d, h.C.o, { r: 7 }); });
    h.badge([port[0] + 0.1, port[1] - 1.2], "🌎", h.C.o, { label: "Mercados internacionales", dir: "top", off: [0, -14] });
  };
  E.video = (h) => {
    const c = h.LA; h.badge(c, "🎥", h.C.r, { label: "Su historia", dir: "bottom", off: [0, 12] });
    [[-30, 60, 15], [30, 60, 17], [110, 60, 15], [-110, 55, 16]].forEach(([d, s, r]) => { h.step(); h.sector(c, d, s, r, { c: h.C.r, fo: 0.16, w: 1.5 }); const q = h.P(c, r * 0.8 * Math.cos(d * RAD), r * 0.8 * Math.sin(d * RAD)); h.badge(q, "▶", h.C.r); });
    h.step(); h.pulse(c, h.C.r);
  };

  E["sonido-radio"] = (h) => {
    const c = h.LA, dest = [h.T.mul, h.T.nac, h.T.sb, h.T.cab, h.T.yum, h.T.laja];
    h.badge(c, "📻", h.C.o, { label: "Radio digital", dir: "bottom", off: [0, 12] });
    [14, 28, 44].forEach((r, i) => { h.step(); h.ring(c, r, { c: h.C.o, fo: 0.05 + i * 0.02, w: 1.5, dash: i ? "3 7" : null }); });
    h.step(); dest.forEach((p) => { h.arrow(c, p, { c: h.C.o, w: 2 }); h.dot(p, h.C.g, { r: 7 }); });
    h.step(); h.badge(h.P(c, 0, 8), "🔊", h.C.p, { label: "Sonido para eventos", dir: "top", off: [0, -12] });
    h.step(); h.pulse(h.T.mul, h.C.y, { label: "Información clave", dir: "top", off: [0, -10] });
  };

  /* ---------- Financiamiento, innovación y exportación ---------- */
  E["corfo-innovacion"] = (h) => {
    const p = [h.LA, h.P(h.LA, 12, 5), h.P(h.LA, 24, 11), h.P(h.LA, 36, 20)], nm = ["Idea", "Prototipo", "Validación", "Escala"];
    p.forEach((q, i) => { h.step(); if (i) h.arrow(p[i - 1], q, { c: h.C.g, w: 4 }); h.badge(q, String(i + 1), h.C.g, { label: nm[i], dir: "top", off: [0, -14] }); if (i === 1 || i === 3) h.badge(h.P(q, 0, -9), "$", h.C.y, { label: i === 1 ? "Fondo" : "Fondo", dir: "bottom", off: [0, 10] }); });
  };
  E["fondos-emprender"] = (h) => {
    const p = [h.P(h.LA, -16, -8), h.P(h.LA, 0, 2), h.P(h.LA, 16, 12)], nm = ["Semilla", "Crece", "Escala"];
    p.forEach((q, i) => { h.step(); if (i) h.arrow(p[i - 1], q, { c: h.C.o, w: 4 }); h.dot(q, h.C.o, { r: 7 + i * 4, label: nm[i], dir: "top", off: [0, -10 - i * 4] }); });
  };
  E.exportacion = (h) => {
    const o = h.LA, pto = h.CC, ext = h.P(h.CC, -85, 12);
    h.dot(o, h.C.g, { r: 8, label: "Productor", dir: "bottom", off: [0, 8] });
    h.step(); h.curve(o, pto, { c: h.C.g, bend: 0.12, w: 4 }); h.dot(pto, h.C.b, { r: 8, label: "Puerto", dir: "bottom", off: [0, 8] });
    h.step(); h.curve(pto, ext, { c: h.C.b, bend: 0.2, w: 4, dash: "8 8" }); h.badge(h.P(pto, -40, 6), "🚢", h.C.b);
    h.step(); h.dot(ext, h.C.o, { r: 10, label: "Mercado externo", dir: "top", off: [0, -12] });
  };
  E.postulacion = (h) => {
    const c = h.LA, ps = [[0, 14, "Bases"], [14, 0, "Formular"], [0, -14, "Postular"], [-14, 0, "Rendir"]];
    ps.forEach(([x, y, t], i) => { h.step(); const q = h.P(c, x, y); if (i) h.arrow(h.P(c, ps[i - 1][0], ps[i - 1][1]), q, { c: h.C.g, w: 3 }); h.badge(q, String(i + 1), h.C.g, { label: t, dir: i === 0 ? "top" : i === 2 ? "bottom" : i === 1 ? "right" : "left", off: [i === 1 ? 10 : i === 3 ? -10 : 0, i === 0 ? -12 : i === 2 ? 12 : 0] }); });
    h.step(); h.arrow(h.P(c, ps[3][0], ps[3][1]), h.P(c, ps[0][0], ps[0][1]), { c: h.C.lg, w: 2, dash: "4 6", flow: false });
  };
  E["fondos-regionales"] = (h) => {
    const cap = h.CC, com = [h.LA, h.T.mul, h.T.nac, h.T.sb, h.T.cab];
    h.dot(cap, h.C.b, { r: 10, label: "Capital regional", dir: "bottom", off: [0, 8] });
    h.step(); com.forEach((q, i) => { h.arrow(cap, q, { c: h.C.y, w: 2.5, dash: "6 7" }); });
    h.step(); com.forEach((q) => h.dot(q, h.C.g, { r: 7 })); h.badge(h.P(h.LA, 0, 10), "$", h.C.y, { label: "Fondos en la provincia", dir: "top", off: [0, -12] });
  };
  E.asociatividad = (h) => {
    const c = h.LA, ex = [[-15, 9], [0, 15], [15, 9], [15, -9], [-15, -9]];
    h.dot(c, h.C.o, { r: 11, label: "Proyecto común", dir: "bottom", off: [0, 8] });
    ex.forEach(([x, y], i) => { h.step(); h.line([c, h.P(c, x, y)], { c: h.C.lg, w: 3, flow: true }); h.dot(h.P(c, x, y), h.C.g, { r: 8 }); });
    h.step(); for (let i = 0; i < ex.length; i++) h.line([h.P(c, ex[i][0], ex[i][1]), h.P(c, ex[(i + 1) % ex.length][0], ex[(i + 1) % ex.length][1])], { c: h.C.g, w: 2, dash: "4 6", op: 0.7 });
  };

  /* ---------- Salud, comunidad y resiliencia social ---------- */
  /* Los activos reales (postas, centros de salud, sedes) vienen de data/activos.json o de OpenStreetMap (window.SG_ACTIVOS).
     Hogares, localidades y cortes de luz de estas escenas son FICTICIOS: nunca se grafican personas reales. */
  const hav = (a, b) => { const R = 6371, dl = (b[0] - a[0]) * RAD, dn = (b[1] - a[1]) * RAD, x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dn / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };
  const activos = (g) => (window.SG_ACTIVOS || []).filter((a) => !g || a.grupo === g);
  const cercanos = (c, n, g, maxKm) => activos(g).map((a) => ({ a, d: hav(c, [a.lat, a.lng]) })).filter((o) => o.d <= (maxKm || 14)).sort((u, v) => u.d - v.d).slice(0, n);
  const ejemplos = (h, c) => [[-1.5, 0.5, "Centro de salud (ejemplo)"], [2.5, 2.5, "Posta (ejemplo)"], [-3.5, -2, "Posta (ejemplo)"]].map(([x, y, t]) => ({ a: { nombre: t, tipo: "Ejemplo", lat: h.P(c, x, y)[0], lng: h.P(c, x, y)[1], ej: true }, d: 0 }));
  const saludCerca = (h, c, n) => { const r = cercanos(c, n, "salud"); return r.length ? r : ejemplos(h, c); };
  const mulberry = (seed) => () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const dentro = (pt, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < (xj - xi) * (pt[1] - yi) / (yj - yi) + xi) c = !c; } return c; };

  E["activos-comunitarios"] = (h) => {
    const c = h.LA, sal = cercanos(c, 12, "salud", 16), com = cercanos(c, 10, "comunidad", 16);
    h.dot(c, h.C.o, { r: 9, label: "Territorio", dir: "bottom", off: [0, 8] });
    h.step(); (sal.length ? sal : ejemplos(h, c)).forEach((o, i) => h.dot([o.a.lat, o.a.lng], h.C.g, { r: 7, label: i < 3 ? o.a.nombre : null, dir: "top", off: [0, -8] }));
    h.step(); (com.length ? com : []).forEach((o) => h.dot([o.a.lat, o.a.lng], h.C.p, { r: 6 }));
    h.step(); (sal.concat(com)).forEach((o) => h.line([c, [o.a.lat, o.a.lng]], { c: h.C.lg, w: 1.5, dash: "3 6", op: 0.8 }));
    h.badge(h.P(c, 0, 5), "🤝", h.C.g, { label: "Activos conectados", dir: "top", off: [0, -14] });
  };
  E.electrodependencia = (h) => {
    const c = h.LA, rnd = mulberry(7), cl = [[-2.6, 0.8, 1.6], [0.4, 1.9, 1.2], [1.2, -1.6, 1.8], [-0.8, -2.2, 1.0]], hog = [];
    for (let i = 0; i < 30; i++) { const k = cl[i % cl.length], a = rnd() * 6.283, r = Math.sqrt(rnd()) * k[2]; hog.push([k[0] + Math.cos(a) * r, k[1] + Math.sin(a) * r]); }
    const A = [[-4.2, -0.6], [-0.4, -1.1], [0.6, 1.2], [0.2, 3.3], [-3.2, 3.0], [-4.6, 1.4]], Bz = [[2.6, -3.9], [5.2, -3.7], [5.6, -1.9], [3.0, -1.6]];
    const L = (p) => h.P(c, p[0], p[1]);
    const af = hog.filter((p) => dentro(p, A)), sal = saludCerca(h, c, 8);
    h.badge(h.P(c, -5.2, 5.6), "Hogares y cortes de EJEMPLO (datos ficticios)", h.C.k);
    sal.forEach((o, i) => h.dot([o.a.lat, o.a.lng], h.C.g, { r: 7, label: i < 2 ? o.a.nombre : null, dir: "top", off: [0, -8] }));
    h.step(); hog.forEach((p) => h.dot(L(p), h.C.o, { r: 4 }));
    h.step(); h.poly(Bz.map(L), { c: h.C.k, fo: 0.18, w: 2 }); h.badge(L([4.3, -2.8]), "Corte B: 0 hogares ✓", h.C.g, { dir: "top" });
    h.step(); h.poly(A.map(L), { c: h.C.r, fo: 0.22, w: 2 }); af.forEach((p) => h.dot(L(p), h.C.r, { r: 6 }));
    h.badge(L([-2.2, 3.7]), `Corte A: ${af.length} de ${hog.length} hogares afectados`, h.C.r, { dir: "top" });
    h.step(); af.slice(0, 8).forEach((p) => { const ll = L(p), n = sal.slice().sort((u, v) => hav(ll, [u.a.lat, u.a.lng]) - hav(ll, [v.a.lat, v.a.lng]))[0]; h.line([ll, [n.a.lat, n.a.lng]], { c: h.C.y, w: 2, dash: "4 6", op: 0.9 }); });
    h.badge(h.P(c, -1.2, 0.2), "Aviso + respaldo + activo más cercano", h.C.y, { dir: "bottom", off: [0, 10] });
  };
  E["equidad-rural"] = (h) => {
    const c = h.LA, loc = [[-14, 9, "A"], [12, 14, "B"], [20, -6, "C"], [-18, -12, "D"], [4, -20, "E"], [28, 8, "F"]], sal = saludCerca(h, c, 12);
    h.badge(h.P(c, -22, 20), "Localidades de EJEMPLO", h.C.k);
    sal.forEach((o) => h.dot([o.a.lat, o.a.lng], h.C.g, { r: 6 }));
    loc.forEach(([x, y, t]) => { h.step(); const p = h.P(c, x, y), n = sal.slice().sort((u, v) => hav(p, [u.a.lat, u.a.lng]) - hav(p, [v.a.lat, v.a.lng]))[0], np = [n.a.lat, n.a.lng], d = hav(p, np), col = d < 6 ? h.C.g : d < 12 ? h.C.y : h.C.r;
      h.dot(p, col, { r: 7, label: "Localidad " + t, dir: "top", off: [0, -8] }); h.line([p, np], { c: col, w: 2.5, dash: "5 6", op: 0.9 }); h.badge([(p[0] + np[0]) / 2, (p[1] + np[1]) / 2], d.toFixed(0) + " km", col); });
  };
  E.participacion = (h) => {
    const c = h.LA, n = 7;
    for (let i = 0; i < n; i++) { const a = i / n * 6.283, p = h.P(c, 12 * Math.cos(a), 9 * Math.sin(a)); h.step(); h.dot(p, h.C.p, { r: 7 }); h.arrow(p, c, { c: h.C.lg, w: 2 }); }
    h.step(); h.badge(c, "✓", h.C.g, { label: "Acuerdo compartido", dir: "bottom", off: [0, 12] });
  };
  E["salud-comunitaria"] = (h) => {
    const c = h.LA, ns = [[0, 14, "Promoción"], [16, 0, "Participación"], [0, -14, "Entornos"], [-16, 0, "Cultura"]];
    h.dot(c, h.C.o, { r: 11, label: "Comunidad saludable", dir: "bottom", off: [0, 8] });
    ns.forEach(([x, y, t]) => { h.step(); const p = h.P(c, x, y); h.line([c, p], { c: h.C.lg, w: 3, flow: true }); h.dot(p, h.C.g, { r: 9, label: t, dir: "top", off: [0, -10] }); });
    h.step(); for (let i = 0; i < 4; i++) { const a = ns[i], b = ns[(i + 1) % 4]; h.line([h.P(c, a[0], a[1]), h.P(c, b[0], b[1])], { c: h.C.g, w: 2, dash: "4 6", op: 0.7 }); }
  };
  E["resiliencia-comunitaria"] = (h) => {
    const c = h.LA, n = 8, ps = []; for (let i = 0; i < n; i++) { const a = i / n * 6.283; ps.push(h.P(c, 13 * Math.cos(a), 10 * Math.sin(a))); }
    ps.forEach((p) => h.dot(p, h.C.g, { r: 6 }));
    h.step(); h.pulse(ps[0], h.C.r, { label: "Alerta", dir: "top", off: [0, -10] });
    h.step(); [1, n - 1].forEach((i) => { h.arrow(ps[0], ps[i], { c: h.C.y, w: 3 }); h.dot(ps[i], h.C.y, { r: 7 }); });
    h.step(); [2, n - 2, 3, n - 3, 4].forEach((i) => h.dot(ps[i], h.C.y, { r: 7 })); h.badge(c, "✓", h.C.g, { label: "Red vecinal activa", dir: "bottom", off: [0, 12] });
  };
  /* ---------- Economía y desarrollo local ---------- */
  E["economia-social"] = (h) => {
    const c = h.LA, ns = [[-14, 6, "Productor"], [0, 14, "Feria"], [14, 6, "Familias"], [0, -8, "Reinversión"]];
    ns.forEach(([x, y, t], i) => { h.step(); const p = h.P(c, x, y); if (i) { const a = ns[i - 1]; h.arrow(h.P(c, a[0], a[1]), p, { c: h.C.g, w: 4 }); } h.dot(p, h.C.g, { r: 9, label: t, dir: i === 3 ? "bottom" : "top", off: [0, i === 3 ? 10 : -10] }); });
    h.step(); h.arrow(h.P(c, 0, -8), h.P(c, -14, 6), { c: h.C.lg, w: 4 });
  };
  E["evaluacion-economica"] = (h) => {
    const c = h.LA, alt = [[-12, 3, 5, "A"], [0, 4, 7, "B"], [12, 2, 4, "C"]];
    alt.forEach(([x, y, b, t], i) => { h.step(); h.rect(h.P(c, x - 2.2, y / 2 + 1), 3.2, y, { c: h.C.r, fo: 0.45, w: 1 }); h.rect(h.P(c, x + 2.2, b / 2 + 1), 3.2, b, { c: h.C.g, fo: 0.5, w: 1 }); h.badge(h.P(c, x, -2.2), t, h.C.k); if (t === "B") h.badge(h.P(c, x, b + 3), "✓", h.C.g, { label: "Mayor valor neto", dir: "top", off: [0, -12] }); });
  };
  E["negocios-impacto"] = (h) => {
    const c = h.LA, r = [[-4, 2, h.C.o, "Empresa"], [4, 2, h.C.g, "Comunidad"], [0, -4.5, h.C.b, "Ambiente"]];
    r.forEach(([x, y, col, t]) => { h.step(); h.ring(h.P(c, x, y), 7, { c: col, fo: 0.18, w: 2 }); h.badge(h.P(c, x * 2.1, y * 1.9 + (y < 0 ? -3 : 4)), t, col); });
    h.step(); h.badge(c, "★", h.C.y, { label: "Valor compartido", dir: "bottom", off: [0, 12] });
  };

  E["licitaciones-biobio"] = (h) => { if (window.SG_LIC) window.SG_LIC.dibujar(h); };

  window.SG_ESC = { ctx, escenas: E };
})();
