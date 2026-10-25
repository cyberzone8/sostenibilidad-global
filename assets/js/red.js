/* Núcleo de la red (v24): lee los aportes de la hoja de Google, cuenta confirmaciones entre pares, mide el origen
   y arma los enlaces del circuito (formulario, Comunidad, invitar). Lo usan el mapa, aporta/, admin/, en-vivo/ y comunidad/.
   Nada se guarda aquí: los datos viven en la hoja de Google del administrador. */
(function (root) {
  "use strict";
  const norm = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const TIPOS = {
    arbol: ["Árbol o área verde", "#4d9a2a"], plaza: ["Plaza o espacio público", "#1f6b4a"], evento: ["Evento o actividad", "#be185d"],
    org: ["Organización o club", "#7b4fb0"], salud: ["Servicio de salud", "#2a7fb8"], comercio: ["Comercio o emprendimiento", "#ef6c00"], otro: ["Otro", "#51605a"]
  };
  const tipoDe = (t) => { const n = norm(t); return n.startsWith("arbol") || n.includes("verde") ? "arbol" : n.startsWith("plaza") || n.includes("espacio") ? "plaza" : n.startsWith("evento") ? "evento" : n.startsWith("organ") ? "org" : n.startsWith("servicio") || n.includes("salud") ? "salud" : n.startsWith("comercio") || n.includes("emprend") ? "comercio" : "otro"; };

  function csv(txt) {
    const f = []; let r = [], c = "", q = false;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (q) { if (ch === '"') { if (txt[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { r.push(c); c = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && txt[i + 1] === "\n") i++; r.push(c); c = ""; f.push(r); r = []; }
      else c += ch;
    }
    if (c !== "" || r.length) { r.push(c); f.push(r); }
    return f;
  }
  const num = (v) => { const n = parseFloat(String(v || "").trim().replace(",", ".")); return isFinite(n) ? n : NaN; };
  const dentro = (la, lo) => la < -35.5 && la > -39.5 && lo < -70.5 && lo > -74.5;
  const SI = ["si", "ok", "x", "1", "true", "aprobado", "yes"];
  const RAD = Math.PI / 180;
  const metros = (a, b) => { const dl = (b[0] - a[0]) * RAD, dn = (b[1] - a[1]) * RAD, x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dn / 2) ** 2; return 12742000 * Math.asin(Math.sqrt(x)); };

  /* Todas las filas de la hoja, con su número de fila (la 1 es el encabezado). Sin filtrar. */
  function filas(txt) {
    const f = csv(txt); if (f.length < 2) return [];
    const H = f[0].map(norm), col = (...k) => H.findIndex((h) => k.some((x) => h.startsWith(x)));
    const iT = col("tipo"), iN = col("nombre"), iD = col("descripcion", "detalle"), iLa = col("latitud", "lat"), iLo = col("longitud", "lng", "long"), iA = col("aprobado"), iO = col("origen"), iM = col("marca");
    if (iLa < 0 || iLo < 0) return [];
    const g = (r, i) => (i >= 0 ? String(r[i] || "") : "");
    const out = [];
    f.slice(1).forEach((r, k) => {
      const lat = num(r[iLa]), lng = num(r[iLo]);
      if (!dentro(lat, lng)) return;
      out.push({ fila: k + 2, marca: g(r, iM), tipo: tipoDe(g(r, iT)), nombre: (g(r, iN) || "Sin nombre").slice(0, 80), desc: g(r, iD).slice(0, 240), lat, lng, origen: norm(g(r, iO)).slice(0, 40), aprobado: SI.includes(norm(g(r, iA))), hayColumnaAprobado: iA >= 0 });
    });
    return out;
  }
  const esConf = (d) => /^confirm/.test(norm(d));
  const esCorr = (d) => /^corrig|^correc/.test(norm(d));

  /* Aportes base + sus confirmaciones/correcciones (filas cuya descripción empieza por «CONFIRMACIÓN» o «CORRECCIÓN» y caen a menos de 60 m).
     opts: moderacion (true), umbral (confirmaciones que bastan para mostrar sin aprobación; 0 = nunca). */
  function resolver(fl, opts) {
    const o = Object.assign({ moderacion: true, umbral: 0 }, opts || {});
    const base = fl.filter((x) => !esConf(x.desc) && !esCorr(x.desc)).map((x) => Object.assign({ confirm: 0, correc: 0, notas: [] }, x));
    fl.filter((x) => esConf(x.desc) || esCorr(x.desc)).forEach((v) => {
      const cand = base.map((b) => ({ b, d: metros([b.lat, b.lng], [v.lat, v.lng]) })).filter((c) => c.d <= 60).sort((p, q) => (norm(q.b.nombre) === norm(v.nombre)) - (norm(p.b.nombre) === norm(v.nombre)) || p.d - q.d)[0];
      if (!cand) return;
      if (esConf(v.desc)) cand.b.confirm++; else { cand.b.correc++; cand.b.notas.push(v.desc.replace(/^[^:]*:\s*/, "").slice(0, 120)); }
    });
    base.forEach((b) => {
      b.visible = o.moderacion === false || b.aprobado || (o.umbral > 0 && b.confirm >= o.umbral && !b.correc);
      b.estado = b.aprobado ? (b.confirm ? "confirmado" : "aprobado") : b.visible ? "confirmado por pares" : "pendiente";
    });
    return base;
  }
  /* Repetidos: mismo nombre a menos de 50 m (ayuda a revisar) */
  function repetidos(items) {
    const r = new Set();
    items.forEach((a, i) => items.slice(i + 1).forEach((b) => { if (norm(a.nombre) === norm(b.nombre) && metros([a.lat, a.lng], [b.lat, b.lng]) < 50) { r.add(a.fila); r.add(b.fila); } }));
    return r;
  }
  function comunaDe(lat, lng, comunas) {
    let m = null, dm = 1e12;
    (comunas || []).forEach((c) => { const d = metros([lat, lng], [c.lat, c.lng]); if (d < dm) { dm = d; m = c; } });
    return m && dm < 45000 ? m.nombre : "";
  }

  /* Enlaces del circuito */
  const https = (u) => (/^https:\/\//i.test(u || "") ? u : "");
  function formUrl(cfg, v) {
    const f = (cfg && cfg.formularios) || {}, base = /^https:\/\/docs\.google\.com\/forms\//i.test(f.aporte || "") ? f.aporte : "";
    if (!base) return "";
    const c = f.aporteCampos || {}, q = new URLSearchParams({ usp: "pp_url" });
    ["tipo", "nombre", "descripcion", "lat", "lng", "origen"].forEach((k) => { if (v && v[k] != null && c[k] && /^entry\.\d+$/.test(c[k])) q.set(c[k], v[k]); });
    return base + (base.includes("?") ? "&" : "?") + q.toString();
  }
  const comunidadUrl = (cfg) => https(((cfg || {}).comunidad || {}).url);
  const sitioBase = (cfg) => { const u = ((cfg || {}).sitio || {}).url; return /^https:\/\//i.test(u || "") ? u : null; };
  function origen(loc) {
    try { const o = new URL((loc || root.location).href).searchParams.get("o"); if (o) { const v = norm(o).replace(/ /g, "-").slice(0, 30); try { sessionStorage.setItem("sg-o", v); } catch (e) {} return v; } } catch (e) {}
    try { return sessionStorage.getItem("sg-o") || ""; } catch (e) { return ""; }
  }
  function compartir(texto, url) {
    const t = texto + " " + url;
    if (root.navigator && navigator.share) return navigator.share({ title: "Aporta al mapa", text: texto, url }).catch(() => {});
    root.open("https://wa.me/?text=" + encodeURIComponent(t), "_blank", "noopener");
  }

  /* Datos de ejemplo para ensayar la charla (?demo=1): ficticios */
  const DEMO = [
    ["Roble de la plaza vieja", "arbol", -37.4697, -72.3537, 1, 2], ["Plaza de Armas", "plaza", -37.4688, -72.3517, 1, 1], ["Feria libre sábado", "evento", -37.4729, -72.3601, 1, 0],
    ["Club de huerta Los Aromos", "org", -37.4632, -72.3412, 1, 1], ["Posta rural Santa Fe", "salud", -37.3705, -72.4128, 1, 0], ["Almacén Don Lalo", "comercio", -37.4755, -72.3466, 1, 0],
    ["Sauce del estero", "arbol", -37.4811, -72.3702, 0, 1], ["Cancha del barrio norte", "plaza", -37.4560, -72.3590, 0, 0], ["Taller de costura mujeres", "org", -37.4790, -72.3330, 0, 0],
    ["Plaza de Mulchén", "plaza", -37.7167, -72.2405, 1, 0], ["Feria costumbrista", "evento", -37.7129, -72.2440, 1, 1], ["Laja: club deportivo", "org", -37.2820, -72.7110, 1, 0],
    ["Nacimiento: panadería", "comercio", -37.5030, -72.6710, 0, 0], ["Cabrero: posta", "salud", -37.0370, -72.4030, 1, 0], ["Yumbel: araucaria", "arbol", -37.0980, -72.5580, 1, 0]
  ];
  const ORIG = ["qr-charla", "qr-charla", "inv", "inv", "radio", "laboratorio", "comunidad"];
  function demoFilas() {
    const out = [];
    DEMO.forEach((d, i) => {
      out.push({ fila: i + 2, marca: "", tipo: d[1], nombre: d[0], desc: "Aporte de ejemplo (ficticio)", lat: d[2], lng: d[3], origen: ORIG[i % ORIG.length], aprobado: !!d[4], hayColumnaAprobado: true });
      for (let k = 0; k < d[5]; k++) out.push({ fila: 100 + i * 3 + k, marca: "", tipo: d[1], nombre: d[0], desc: "CONFIRMACIÓN: existe (ejemplo)", lat: d[2] + 0.0001, lng: d[3], origen: "verificacion", aprobado: false, hayColumnaAprobado: true });
    });
    return out;
  }
  async function cargar(cfg, opts) {
    const a = (cfg && cfg.aportes) || {}, o = Object.assign({ moderacion: a.moderacion !== false, umbral: +a.confirmacionesParaMostrar || 0, demo: false }, opts || {});
    if (o.demo) return resolver(demoFilas(), o);
    if (!https(a.csvUrl)) throw new Error("sin-csv");
    const r = await fetch(a.csvUrl, { cache: "no-store" }); if (!r.ok) throw new Error("http-" + r.status);
    return resolver(filas(await r.text()), o);
  }

  root.SG_RED = { norm, esc, TIPOS, tipoDe, csv, filas, resolver, repetidos, comunaDe, metros, formUrl, comunidadUrl, sitioBase, origen, compartir, cargar, demoFilas, https };
  if (typeof module !== "undefined") module.exports = root.SG_RED;
})(typeof window !== "undefined" ? window : globalThis);
