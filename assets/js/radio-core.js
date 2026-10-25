/* Radio ProBio: lógica de reproducción compartida por la portada (botón flotante) y radio/.
   Lee data/config.json → radio {nombre, streamUrl} y, si no hay streamUrl, la lista data/playlist.json (MP3 en audio/).
   Con duración en todas las pistas funciona como una radio: todos escuchan el mismo momento de la lista. */
(() => {
  "use strict";
  const getJSON = (u) => fetch(u, { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
  function crear(o) {
    const base = o.base || "", cb = o.on || {}, audio = new Audio();
    audio.preload = "none";
    const R = { audio, nombre: "Radio ProBio", modo: "vacio", pistas: [], idx: 0, sync: false, total: 0, listo: null };
    const st = (m) => cb.status && cb.status(m);
    const pista = () => R.pistas[R.idx];
    const nombrePista = (p) => p.titulo + (p.autor ? " · " + p.autor : "");
    audio.addEventListener("playing", () => { cb.state && cb.state(true); st("Al aire"); });
    audio.addEventListener("pause", () => { cb.state && cb.state(false); });
    audio.addEventListener("waiting", () => st("Cargando..."));

    function cargar(i, off) {
      R.idx = ((i % R.pistas.length) + R.pistas.length) % R.pistas.length;
      const p = pista();
      audio.src = base + p.archivo;
      if (off > 0) audio.addEventListener("loadedmetadata", () => { try { audio.currentTime = Math.min(off, Math.max(0, (audio.duration || off) - 1)); } catch (e) {} }, { once: true });
      cb.track && cb.track(p, nombrePista(p), R.idx);
      if ("mediaSession" in navigator && window.MediaMetadata) navigator.mediaSession.metadata = new MediaMetadata({ title: p.titulo, artist: p.autor || R.nombre, album: R.nombre });
    }
    async function reproducir(i, off) {
      cargar(i, off); st("Conectando...");
      try { await audio.play(); } catch (e) { st("No se pudo reproducir. Intenta de nuevo."); }
    }
    function alAire() {
      let t = (Date.now() / 1000) % R.total;
      for (let i = 0; i < R.pistas.length; i++) { if (t < R.pistas[i].duracion) return [i, t]; t -= R.pistas[i].duracion; }
      return [0, 0];
    }
    R.toggle = async () => {
      await R.listo;
      if (R.modo === "vacio") { st("La música se activa pronto."); return; }
      if (R.modo === "stream") {
        if (audio.paused) {
          audio.src = R.stream + (R.stream.includes("?") ? "&" : "?") + "t=" + Date.now(); st("Conectando...");
          try { await audio.play(); } catch (e) { st("No se pudo reproducir. Intenta de nuevo."); }
        } else { audio.pause(); audio.removeAttribute("src"); audio.load(); st("Pausado"); }
        return;
      }
      if (!audio.paused) { audio.pause(); st("Pausado"); return; }
      if (R.sync) { const [i, t] = alAire(); reproducir(i, t); }
      else if (audio.getAttribute("src")) audio.play(); else reproducir(R.idx, 0);
    };
    R.next = () => { if (R.modo === "lista") reproducir(R.idx + 1, 0); };
    R.prev = () => { if (R.modo === "lista") reproducir(R.idx - 1, 0); };
    R.volumen = (v) => { audio.volume = v; };

    R.listo = (async () => {
      let rc = {};
      try { rc = (await getJSON(base + "data/config.json")).radio || {}; } catch (e) {}
      if (rc.nombre) R.nombre = rc.nombre;
      if (rc.streamUrl && /^https:\/\//i.test(rc.streamUrl)) {
        R.modo = "stream"; R.stream = rc.streamUrl;
        audio.addEventListener("error", () => { if (audio.getAttribute("src")) st("Se cortó la señal. Presiona para reconectar."); });
      } else {
        try { R.pistas = ((await getJSON(base + "data/playlist.json")).pistas || []).filter((p) => p && p.archivo); } catch (e) { R.pistas = []; }
        if (R.pistas.length) {
          R.modo = "lista"; R.total = R.pistas.reduce((a, p) => a + (+p.duracion || 0), 0); R.sync = R.pistas.every((p) => +p.duracion > 0);
          audio.addEventListener("ended", () => reproducir(R.idx + 1, 0));
          audio.addEventListener("error", () => { if (audio.getAttribute("src")) { st("No se encontró " + pista().archivo + ". Pasando a la siguiente..."); setTimeout(() => reproducir(R.idx + 1, 0), 1500); } });
          if ("mediaSession" in navigator) { try { navigator.mediaSession.setActionHandler("nexttrack", R.next); navigator.mediaSession.setActionHandler("previoustrack", R.prev); } catch (e) {} }
        }
      }
      cb.listo && cb.listo(R);
      return R;
    })();
    return R;
  }
  window.SG_RADIO = { crear };
})();
