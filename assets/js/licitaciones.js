/* Licitaciones de Mercado Público por comuna (Región del Biobío).
   Datos: data/licitaciones.json (lo genera tools/importar-licitaciones.py) y data/comunas-biobio.json.
   Si "demo" es true, las cifras son FICTICIAS de ejemplo y así se rotulan. */
(() => {
  "use strict";
  const S = { lic: null, com: null };
  const esc = (t) => String(t == null ? "" : t).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const get = (u) => fetch(u, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  S.listo = Promise.all([get("data/licitaciones.json"), get("data/comunas-biobio.json")]).then(([l, c]) => { S.lic = l; S.com = c.comunas || []; }).catch(() => {});
  const filas = () => (S.com || []).map((c) => ({ ...c, n: +((S.lic.porComuna || {})[c.nombre] || 0) }));

  /* Escena del mapa: una burbuja por comuna (tamaño y color según la cantidad), por provincia */
  function dibujar(h) {
    if (!S.lic || !S.com) { h.badge(h.LA, "…", h.C.k, { label: "Cargando licitaciones", dir: "bottom", off: [0, 12] }); return; }
    const f = filas(), max = Math.max(1, ...f.map((x) => x.n));
    const col = (n) => (n >= max * 0.6 ? h.C.r : n >= max * 0.25 ? h.C.o : n >= max * 0.08 ? h.C.y : h.C.lg);
    ["Concepción", "Arauco", "Biobío"].forEach((prov) => {
      h.step();
      f.filter((x) => x.provincia === prov).forEach((x) => {
        const ll = [x.lat, x.lng], r = Math.min(30, 7 + 3.2 * Math.sqrt(x.n));
        const d = h.dot(ll, col(x.n), { r });
        d.bindTooltip(`${x.nombre}: ${x.n} ${x.n === 1 ? "licitación activa" : "licitaciones activas"}`, { direction: "top" });
        if (x.n > 0) h.badge(ll, String(x.n), "rgba(18,56,42,.85)");
      });
    });
  }

  /* Texto bajo la leyenda del servicio: aviso, total y ranking */
  function panel() {
    if (!S.lic || !S.com) return '<p class="leg"><b>Cargando datos…</b></p>';
    const f = filas().sort((a, b) => b.n - a.n), top = f.filter((x) => x.n > 0).slice(0, 10);
    const aviso = S.lic.demo ? '<p class="nota"><b>Datos de ejemplo ficticios.</b> Se reemplazan por las cifras reales al conectar la API de Mercado Público (ver README, v21).</p>' : "";
    const con = f.filter((x) => x.n > 0).length;
    return `${aviso}<h3>Licitaciones activas por comuna</h3><p><b>${esc(S.lic.total)}</b> en la región, repartidas en ${con} de ${f.length} comunas${S.lic.sinComuna ? ` (${esc(S.lic.sinComuna)} sin comuna reconocida)` : ""}.</p>
<ol>${top.map((x) => `<li>${esc(x.nombre)} · <b>${x.n}</b></li>`).join("")}</ol>
<small>Por la comuna del organismo comprador. Fuente: ${esc(S.lic.fuente || "ChileCompra · Mercado Público")} · actualizado ${esc(S.lic.actualizado || "")}. La ubicación en el mapa es referencial.</small>`;
  }
  window.SG_LIC = { listo: S.listo, dibujar, panel };
})();
