/* Aportes de la comunidad en vivo: lee las respuestas de un Formulario de Google (publicadas como CSV) y las dibuja en el mapa.
   Solo se muestran las filas que tú apruebas (columna «Aprobado» = SI). Config: data/config.json → aportes {csvUrl, moderacion, refrescoSeg}.
   No se guarda nada en este sitio: los datos viven en tu hoja de Google. */
(() => {
  "use strict";
  const TIPOS = { arbol: ["Árbol o área verde", "#4d9a2a"], plaza: ["Plaza o espacio público", "#1f6b4a"], evento: ["Evento o actividad", "#be185d"], org: ["Organización o club", "#7b4fb0"], salud: ["Servicio de salud", "#2a7fb8"], comercio: ["Comercio o emprendimiento", "#ef6c00"], otro: ["Otro", "#51605a"] };
  const norm = (t) => String(t || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const tipoDe = (t) => { const n = norm(t); return n.startsWith("arbol") || n.includes("verde") ? "arbol" : n.startsWith("plaza") || n.includes("espacio") ? "plaza" : n.startsWith("evento") ? "evento" : n.startsWith("organ") ? "org" : n.startsWith("servicio") || n.includes("salud") ? "salud" : n.startsWith("comercio") || n.includes("emprend") ? "comercio" : "otro"; };

  function csv(txt) { /* lector CSV con comillas */
    const f = []; let r = [], c = "", q = false;
    for (let i = 0; i < txt.length; i++) {
      const ch = txt[i];
      if (q) { if (ch === '"') { if (txt[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { r.push(c); c = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && txt[i + 1] === "\n") i++; r.push(c); c = ""; if (r.some((x) => x !== "")) f.push(r); r = []; }
      else c += ch;
    }
    r.push(c); if (r.some((x) => x !== "")) f.push(r); return f;
  }
  const num = (v) => { const n = parseFloat(String(v || "").trim().replace(",", ".")); return isFinite(n) ? n : NaN; };
  /* Convierte filas en aportes válidos. Exportada para pruebas. */
  function parse(txt, moderacion) {
    const f = csv(txt); if (f.length < 2) return [];
    const H = f[0].map(norm), col = (...k) => H.findIndex((h) => k.some((x) => h.startsWith(x)));
    const iT = col("tipo"), iN = col("nombre"), iD = col("descripcion", "detalle"), iLa = col("latitud", "lat"), iLo = col("longitud", "lng", "long"), iA = col("aprobado");
    if (iLa < 0 || iLo < 0) return [];
    return f.slice(1).map((r) => {
      const lat = num(r[iLa]), lng = num(r[iLo]);
      if (!(lat < -35.5 && lat > -39.5 && lng < -70.5 && lng > -74.5)) return null; /* solo Biobío y alrededores */
      if (moderacion !== false && !(iA >= 0 && ["si", "ok", "x", "1", "true", "aprobado"].includes(norm(r[iA])))) return null;
      return { lat, lng, tipo: tipoDe(r[iT]), nombre: String(r[iN] || "Sin nombre").slice(0, 80), desc: String(r[iD] || "").slice(0, 240) };
    }).filter(Boolean);
  }

  let api = null, cfg = null, layer = null, items = [], vis = true, timer = null, estado = "";
  const $ = (s) => document.querySelector(s);
  function dibujar() {
    if (!layer) return; layer.clearLayers();
    items.forEach((a) => L.circleMarker([a.lat, a.lng], { radius: 9, color: "#fff", weight: 2, fillColor: TIPOS[a.tipo][1], fillOpacity: 1 })
      .bindPopup(`<b>${esc(a.nombre)}</b><br><small>${esc(TIPOS[a.tipo][0])}</small>${a.desc ? "<br>" + esc(a.desc) : ""}<br><small>Aporte de la comunidad</small>`).addTo(layer));
    const n = $("#cap-aportes-n"); if (n) n.textContent = estado || "(" + items.length + ")";
  }
  async function cargar() {
    try {
      const r = await fetch(cfg.csvUrl, { cache: "no-store" }); if (!r.ok) throw new Error(r.status);
      items = parse(await r.text(), cfg.moderacion); estado = "";
    } catch (e) { estado = "(sin conexión)"; }
    dibujar();
  }
  function setVisible(on) {
    vis = on; const cb = $("#cap-aportes"); if (cb) cb.checked = on;
    if (!api || !api.S.map) return;
    if (on) { layer.addTo(api.S.map); cargar(); clearInterval(timer); timer = setInterval(cargar, Math.max(15, cfg.refrescoSeg || 30) * 1000); }
    else { api.S.map.removeLayer(layer); clearInterval(timer); }
  }
  function attach(a) {
    api = a; cfg = (a.S.cfg || {}).aportes || {};
    if (!cfg.csvUrl || !/^https:\/\//i.test(cfg.csvUrl) || !a.S.map) return;
    layer = L.layerGroup();
    const lab = $("#cap-lab"); if (lab && lab.parentElement) {
      const l = document.createElement("label");
      l.innerHTML = '<input type="checkbox" id="cap-aportes" checked> <i class="sw" style="background:#4d9a2a"></i> Aportes en vivo <span id="cap-aportes-n"></span>';
      lab.parentElement.parentElement.insertBefore(l, lab.parentElement.nextSibling);
      l.querySelector("input").addEventListener("change", (e) => setVisible(e.target.checked));
    }
    setVisible(true);
  }
  window.SG_APORTES = { attach, parse, setVisible, count: () => items.length };
})();
