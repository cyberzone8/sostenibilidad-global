/* Utilidades compartidas por el mapa, las fichas, el directorio y la simulación.
   Un solo lugar para: escapar texto, validar enlaces, "abierto ahora", armar WhatsApp con origen y medir clics. */
window.SG = (() => {
  "use strict";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
  const telHref = (t) => "tel:" + String(t).replace(/[^\d+]/g, "");
  const hm = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };
  function abiertoAhora(hor) {
    if (!Array.isArray(hor) || !hor.length) return null;
    try {
      const p = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date());
      const g = (t) => p.find((x) => x.type === t).value;
      const wd = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 }[g("weekday")];
      const now = (Number(g("hour")) % 24) * 60 + Number(g("minute"));
      return hor.some((b) => (b.dias || []).includes(wd) && hm(b.abre) <= now && now < hm(b.cierra));
    } catch (e) { return null; }
  }
  /* WhatsApp con origen: el mensaje llega diciendo desde qué página vino la persona */
  const waUrl = (num, texto, origen) => `https://wa.me/${num}?text=${encodeURIComponent(origen ? `${texto}\n\n(Origen: ${origen})` : texto)}`;
  /* Medición (GoatCounter, si está activado en data/config.json): cuenta eventos como wa/<empresa>/<origen> */
  function track(ev) { try { const gc = window.goatcounter; if (gc && gc.count) gc.count({ path: "ev/" + ev, title: ev, event: true }); } catch (e) { /* sin medición */ } }
  document.addEventListener("click", (e) => { const a = e.target.closest("[data-ev]"); if (a) track(a.dataset.ev); }, true);
  return { esc, safeUrl, telHref, hm, abiertoAhora, waUrl, track };
})();
