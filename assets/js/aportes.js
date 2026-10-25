/* Aportes de la comunidad en vivo (mapa principal). Usa assets/js/red.js: lee la hoja de Google publicada como CSV, muestra los aportes
   aprobados (o confirmados por pares si lo activas) y deja que cualquiera confirme o corrija desde el globo del mapa (verificación entre pares). */
(() => {
  "use strict";
  const R = window.SG_RED; if (!R) return;
  let api = null, cfg = null, cfgAll = null, layer = null, items = [], timer = null, estado = "";
  const $ = (s) => document.querySelector(s);
  const demo = /[?&]demo=1/.test(location.search);
  function globo(a) {
    const T = R.TIPOS[a.tipo], vf = (acc) => R.formUrl(cfgAll, { tipo: T[0], nombre: a.nombre, lat: a.lat.toFixed(6), lng: a.lng.toFixed(6), origen: "verificacion", descripcion: acc });
    const ok = vf("CONFIRMACIÓN: existe y está como se describe"), fix = vf("CORRECCIÓN: ");
    const ver = ok ? `<div class="gl-b"><a class="btn" data-ev="aporte/confirma" target="_blank" rel="noopener" href="${R.esc(ok)}">✓ Lo confirmo</a> <a class="btn alt" data-ev="aporte/corrige" target="_blank" rel="noopener" href="${R.esc(fix)}">✎ Corregir</a></div>` : "";
    const emp = a.tipo === "comercio" || a.tipo === "org" ? `<div class="gl-b"><button class="btn alt" type="button" data-k="empresas">¿Es tu negocio u organización? Aparece en el directorio</button></div>` : "";
    const sello = a.confirm ? `<br><small>✓ ${a.confirm} ${a.confirm === 1 ? "persona lo confirma" : "personas lo confirman"}</small>` : "";
    return `<b>${R.esc(a.nombre)}</b><br><small>${R.esc(T[0])}</small>${a.desc ? "<br>" + R.esc(a.desc) : ""}${sello}<br><small>Aporte de la comunidad</small>${ver}${emp}`;
  }
  function dibujar() {
    if (!layer) return; layer.clearLayers();
    items.filter((a) => a.visible).forEach((a) => L.circleMarker([a.lat, a.lng], { radius: 9, color: a.confirm ? "#12382a" : "#fff", weight: a.confirm ? 3 : 2, fillColor: R.TIPOS[a.tipo][1], fillOpacity: 1 }).bindPopup(globo(a), { maxWidth: 260 }).addTo(layer));
    const n = $("#cap-aportes-n"); if (n) n.textContent = estado || "(" + items.filter((a) => a.visible).length + ")";
  }
  async function cargar() {
    try { items = await R.cargar(cfgAll, { demo }); estado = ""; } catch (e) { estado = "(sin conexión)"; }
    dibujar();
  }
  function setVisible(on) {
    const cb = $("#cap-aportes"); if (cb) cb.checked = on;
    if (!api || !api.S.map) return;
    clearInterval(timer);
    if (on) { layer.addTo(api.S.map); cargar(); timer = setInterval(cargar, Math.max(15, cfg.refrescoSeg || 30) * 1000); }
    else api.S.map.removeLayer(layer);
  }
  function attach(a) {
    api = a; cfgAll = a.S.cfg || {}; cfg = cfgAll.aportes || {};
    if ((!R.https(cfg.csvUrl) && !demo) || !a.S.map) return;
    layer = L.layerGroup();
    const lab = $("#cap-lab"); if (lab && lab.parentElement) {
      const l = document.createElement("label");
      l.innerHTML = '<input type="checkbox" id="cap-aportes" checked> <i class="sw" style="background:#4d9a2a"></i> Aportes en vivo <span id="cap-aportes-n"></span>';
      lab.parentElement.parentElement.insertBefore(l, lab.parentElement.nextSibling);
      l.querySelector("input").addEventListener("change", (e) => setVisible(e.target.checked));
    }
    setVisible(true);
  }
  /* compatibilidad con las pruebas de v23 */
  const parse = (txt, mod) => R.resolver(R.filas(txt), { moderacion: mod }).filter((x) => x.visible).map(({ lat, lng, tipo, nombre, desc }) => ({ lat, lng, tipo, nombre, desc }));
  window.SG_APORTES = { attach, parse, setVisible, count: () => items.filter((a) => a.visible).length };
})();
