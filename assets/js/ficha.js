/* Comportamiento de las fichas y del directorio: "abierto ahora", mapa pequeño y filtros */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  /* abierto ahora */
  const h = $("[data-horario]");
  if (h && window.SG) {
    let hor = []; try { hor = JSON.parse(h.dataset.horario); } catch (e) { /* sin horario */ }
    const a = window.SG.abiertoAhora(hor);
    if (a !== null) { h.textContent = a ? "Abierto ahora" : "Cerrado ahora"; h.className = "bd " + (a ? "ab" : "ce"); h.hidden = false; }
  }
  /* mapa */
  const m = $("#fmap");
  if (m && window.L) {
    const lat = +m.dataset.lat, lng = +m.dataset.lng, km = +m.dataset.km || 0;
    const map = L.map(m, { scrollWheelZoom: false }).setView([lat, lng], km ? 10 : 15);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">colaboradores de OpenStreetMap</a>', referrerPolicy: "origin" }).addTo(map);
    L.marker([lat, lng], { icon: L.divIcon({ className: "", html: '<div class="pinf"></div>', iconSize: [0, 0] }), title: m.dataset.nombre || "" }).addTo(map);
    if (km) { const c = L.circle([lat, lng], { radius: km * 1000, color: "#1f6b4a", weight: 2, dashArray: "6 8", fillColor: "#5dbb8a", fillOpacity: 0.1, interactive: false }).addTo(map); map.fitBounds(c.getBounds().pad(0.1)); }
  }
  /* directorio */
  const dir = $("#dir");
  if (dir) {
    const cards = $$(".emp", dir), q = $("#q"), co = $("#co"), chips = $$("#rb button");
    let rb = "";
    const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const run = () => {
      const t = norm(q.value); let n = 0;
      cards.forEach((c) => {
        const ok = (!rb || c.dataset.rubro === rb) && (!co.value || c.dataset.comuna === co.value) && (!t || norm(c.dataset.texto).includes(t));
        c.hidden = !ok; if (ok) n++;
      });
      $("#dcount").textContent = n + (n === 1 ? " empresa" : " empresas");
      $("#vacio").hidden = n > 0;
    };
    chips.forEach((b) => b.addEventListener("click", () => { rb = b.dataset.r; chips.forEach((x) => x.setAttribute("aria-pressed", String(x === b))); run(); }));
    q.addEventListener("input", run); co.addEventListener("change", run); run();
  }
})();
