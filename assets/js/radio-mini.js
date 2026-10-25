/* Botón flotante de la radio en la portada: ▶ reproduce aquí mismo; el resto de la etiqueta abre radio/ */
(() => {
  "use strict";
  const p = document.getElementById("radio-play"), n = document.getElementById("radio-n"), s = document.getElementById("radio-s");
  if (!p || !window.SG_RADIO) return;
  const SUB = "Provincia de Biobío"; let actual = "";
  const R = SG_RADIO.crear({
    base: "",
    on: {
      state: (on) => { p.firstElementChild.innerHTML = on ? "&#10074;&#10074;" : "&#9654;"; p.setAttribute("aria-label", (on ? "Pausar " : "Reproducir ") + R.nombre); if (!on) s.textContent = SUB; },
      status: (m) => { s.textContent = m === "Al aire" ? (actual ? "Suena: " + actual : "Al aire") : m; },
      track: (pi, nombre) => { actual = nombre; },
      listo: (r) => { n.textContent = r.nombre; }
    }
  });
  p.addEventListener("click", (e) => { e.stopPropagation(); R.toggle(); });
})();
