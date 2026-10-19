/* Sostenibilidad Global SpA - sitio one-page sobre OpenStreetMap.
   Datos editables en /data: config.json, servicios.json, secciones.json */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const getJSON = async (u) => { const r = await fetch(u, { cache: "no-cache" }); if (!r.ok) throw new Error(`${u} (${r.status})`); return r.json(); };

  const S = { cfg: null, grupos: [], servicios: [], secciones: [], empresas: [], pick: null, pickMk: null, picking: false, map: null, demo: null, tiles: { ok: 0, err: 0 }, lastFocus: null };
  const narrow = () => matchMedia("(max-width:760px)").matches;

  /* ---------- Avisos ---------- */
  function aviso(msg) { $("#aviso-t").textContent = msg; $("#aviso").hidden = false; }
  $("#aviso-x").addEventListener("click", () => { $("#aviso").hidden = true; });

  /* ---------- Tarjetas minimizables ---------- */
  function setMin(card, min) {
    card.classList.toggle("is-min", min);
    const b = $(".min", card);
    b.textContent = min ? "+" : "–";
    b.title = min ? "Expandir" : "Minimizar";
    b.setAttribute("aria-expanded", String(!min));
  }

  /* ---------- Render ---------- */
  const wa = (texto) => `https://wa.me/${S.cfg.sitio.whatsapp}?text=${encodeURIComponent(texto)}`;
  const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");
  const contactoHtml = () => { const si = S.cfg.sitio; return `<div class="sec"><span class="ey">Contacto directo</span><br><a class="btn" href="${esc(wa("Hola, quiero conversar con Sostenibilidad Global."))}" target="_blank" rel="noopener">Escribir por WhatsApp</a><br><br><span>Teléfono: <a href="tel:+${esc(si.whatsapp)}">${esc(si.telefono)}</a></span><br><span>Correo: <a href="mailto:${esc(si.correo)}">${esc(si.correo)}</a></span></div>`; };
  function registroHtml() {
    const r = S.cfg.registro || {};
    const precio = r.precioUF ? `Valor del registro: <b>${esc(r.precioUF)} UF</b>.` : esc(r.textoPrecio || "");
    return `<p class="nota">${precio}</p>
      <label for="r1">Nombre de la empresa o negocio *</label><input id="r1" maxlength="80">
      <label for="r2">Rubro *</label><input id="r2" maxlength="80" placeholder="Ej.: reciclaje de cartón, gestión de residuos">
      <label for="r3">Comuna y dirección *</label><input id="r3" maxlength="120" placeholder="Ej.: Los Ángeles, calle y número">
      <label for="r4">Descripción breve</label><textarea id="r4" rows="3" maxlength="300"></textarea>
      <label for="r5">Nombre de contacto</label><input id="r5" maxlength="60">
      <button class="btn alt" type="button" id="pick">📍 Marcar ubicación en el mapa</button> <span class="nota" id="pickT">${S.pick ? `Ubicación marcada (${S.pick.lat.toFixed(5)}, ${S.pick.lng.toFixed(5)})` : "Opcional: facilita la verificación."}</span><br>
      <button class="btn" type="button" id="reg">Enviar por WhatsApp</button>`;
  }
  const odsHtml = (a = []) => a.length ? `<div class="ods">${a.map((n) => `<span>ODS ${esc(n)} · ${esc(S.cfg.ods[n] || "")}</span>`).join("")}</div>` : "";
  const grupoTitulo = (id) => (S.grupos.find((g) => g.id === id) || {}).titulo || "";
  const activos = () => S.servicios.filter((s) => s.activo !== false);

  function renderServicio(s) {
    return { t: s.titulo, h: `<span class="ey">${esc(grupoTitulo(s.grupo))}</span><p>${esc(s.resumen)}</p><h3>Qué hacemos</h3><ul>${(s.acciones || []).map((a) => `<li>${esc(a)}</li>`).join("")}</ul>${odsHtml(s.ods)}<button class="btn" type="button" data-need="${esc(s.titulo)}">Consultar por este servicio</button>` };
  }
  function renderSeccion(c, need) {
    let h = c.eyebrow ? `<span class="ey">${esc(c.eyebrow)}</span>` : "";
    if (c.encabezado) h += `<p class="lead">${esc(c.encabezado)}</p>`;
    (c.parrafos || []).forEach((p) => { h += `<p>${esc(p)}</p>`; });
    (c.bloques || []).forEach((b) => {
      h += `<div class="sec">${b.etiqueta ? `<span class="ey">${esc(b.etiqueta)}</span><br>` : ""}<b>${esc(b.titulo)}</b><br><span>${esc(b.texto)}</span>${b.enlace ? `<br><a href="${esc(wa("Hola, me interesa: " + b.enlace.asunto))}" target="_blank" rel="noopener">${esc(b.enlace.texto)}</a>` : ""}</div>`;
    });
    if (c.ods) h += odsHtml(c.ods);
    if (c.formulario) {
      const opts = activos().map((s) => `<option${s.titulo === need ? " selected" : ""}>${esc(s.titulo)}</option>`).join("");
      h += `<label for="f1">Tipo de organización</label><select id="f1">${(c.tipos || []).map((t) => `<option>${esc(t)}</option>`).join("")}</select>
      <label for="f2">¿Qué necesitas?</label><select id="f2">${opts}<option>Otro</option></select>
      <label for="f3">Región y comuna</label><input id="f3" value="${esc(c.ubicacionInicial || "")}">
      <label for="f4">Cuéntanos tu caso (sin datos personales de terceros)</label><textarea id="f4" rows="3"></textarea>
      <button class="btn" type="button" id="send">Enviar por WhatsApp</button><p class="nota">Se abrirá WhatsApp con el mensaje preparado y lo envías tú. Este sitio no guarda lo que escribes.</p>`;
    }
    if (c.registro) h += registroHtml();
    if (c.mostrarContacto) h += contactoHtml();
    if (c.cta) h += `<button class="btn" type="button" data-k="${esc(c.cta.abre)}">${esc(c.cta.texto)}</button>`;
    if (c.enlaceExterno) h += `<a class="btn" href="${esc(c.enlaceExterno.url)}" target="_blank" rel="noopener">${esc(c.enlaceExterno.texto)}</a>`;
    if (c.nota) h += `<p class="nota">${esc(c.nota)}</p>`;
    return { t: c.titulo, h };
  }

  /* ---------- Panel ---------- */
  function open(id, need, fromUser = true) {
    const sv = activos().find((s) => s.id === id);
    const sc = S.secciones.find((s) => s.id === id && s.activo !== false);
    if (!sv && !sc) return;
    const r = sv ? renderServicio(sv) : renderSeccion(sc, need);
    const p = $("#panel");
    $("#pt").textContent = r.t; $("#pb").innerHTML = r.h;
    if (fromUser) S.lastFocus = document.activeElement;
    p.inert = false; p.classList.add("open"); setMin(p, false); p.scrollTop = 0;
    document.body.classList.add("pop");
    $$("[data-k]").forEach((b) => b.classList.toggle("on", b.dataset.k === id && !b.classList.contains("brand")));
    showRoute(sv && sv.mapa && sv.mapa.ruta);
    try { history.replaceState(null, "", "#" + id); } catch (e) { /* sin historial */ }
    if (fromUser) $("#pt").focus({ preventScroll: true });
  }
  function closeP() {
    const p = $("#panel");
    S.picking = false; $("#aviso").hidden = true;
    p.classList.remove("open"); p.inert = true; document.body.classList.remove("pop");
    $$(".on").forEach((b) => b.classList.remove("on"));
    showRoute(null);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* sin historial */ }
    if (S.lastFocus && S.lastFocus.focus) S.lastFocus.focus();
  }

  /* ---------- Mapa (OpenStreetMap) ---------- */
  function fit(bounds) {
    const m = S.map, s = m.getSize(), wide = s.x > 900;
    m.fitBounds(bounds, {
      paddingTopLeft: [wide ? Math.min(480, s.x * 0.36) : 16, 70],
      paddingBottomRight: [wide ? Math.min(440, s.x * 0.33) : 16, narrow() ? s.y * 0.4 : 20]
    });
  }
  function initMap() {
    if (!window.L) { aviso("No se pudo cargar la librería del mapa (Leaflet). Revisa que la carpeta vendor/leaflet esté publicada."); return; }
    const c = S.cfg.mapa;
    const m = (S.map = L.map("map", { zoomControl: false, minZoom: 4 }));
    L.control.zoom({ position: "topleft", zoomInTitle: "Acercar", zoomOutTitle: "Alejar" }).addTo(m);
    const tl = L.tileLayer(c.teselas.url, { maxZoom: c.zoomMax || 19, attribution: c.teselas.atribucion, referrerPolicy: "origin" }).addTo(m);
    tl.on("tileload", () => { S.tiles.ok++; });
    tl.on("tileerror", () => {
      S.tiles.err++;
      if (S.tiles.err === 4 && S.tiles.ok === 0) {
        aviso(location.protocol === "file:"
          ? "El mapa base no carga al abrir el archivo directamente. Publica el sitio (GitHub Pages) o ábrelo con un servidor local."
          : "No se pudo cargar el mapa base de OpenStreetMap. Revisa tu conexión o la dirección de teselas en data/config.json.");
      }
    });
    fit(c.limites);
    const pin = L.marker(c.centro, { icon: L.divIcon({ className: "", html: `<div class="pin"><i></i><b>${esc(c.etiquetaCentro)}</b></div>`, iconSize: [0, 0] }), keyboard: true, title: c.etiquetaCentro }).addTo(m);
    pin.on("click", () => open("quienes"));
    S.empresas.filter((e) => e.activo !== false && isFinite(e.lat) && isFinite(e.lng)).forEach((e) => {
      const mk = L.marker([e.lat, e.lng], { icon: L.divIcon({ className: "", html: '<div class="emp"></div>', iconSize: [0, 0] }), title: e.nombre, keyboard: true }).addTo(m);
      const w = safeUrl(e.web);
      const node = document.createElement("div");
      node.innerHTML = `<b>${esc(e.nombre)}</b><br><small>✓ Verificada · ${esc(e.rubro)}${e.comuna ? " · " + esc(e.comuna) : ""}</small>${e.descripcion ? `<p>${esc(e.descripcion)}</p>` : ""}${w ? `<a href="${esc(w)}" target="_blank" rel="noopener">Sitio web</a>` : ""}`;
      mk.bindPopup(node);
    });
    m.on("click", (ev) => {
      if (!S.picking) return;
      S.picking = false; S.pick = ev.latlng;
      if (S.pickMk) S.map.removeLayer(S.pickMk);
      S.pickMk = L.marker(ev.latlng, { icon: L.divIcon({ className: "", html: '<div class="emp sel"></div>', iconSize: [0, 0] }) }).addTo(S.map);
      $("#aviso").hidden = true; setMin($("#panel"), false);
      const t = $("#pickT"); if (t) t.textContent = `Ubicación marcada (${ev.latlng.lat.toFixed(5)}, ${ev.latlng.lng.toFixed(5)})`;
    });
    addEventListener("resize", () => m.invalidateSize());
  }
  function showRoute(ruta) {
    if (S.demo) { S.map.removeLayer(S.demo); S.demo = null; }
    if (!ruta || !S.map) return;
    const mk = (ll, col) => L.circleMarker(ll, { radius: 8, color: "#fff", weight: 2, fillColor: col, fillOpacity: 1 });
    S.demo = L.layerGroup([
      L.polyline([ruta.desde, ruta.hasta], { color: "#1f6b4a", weight: 3, dashArray: "8 8" }),
      mk(ruta.desde, "#5dbb8a"),
      mk(ruta.hasta, "#ef6c00").bindTooltip(ruta.etiqueta || "Ejemplo ilustrativo", { permanent: true, direction: "top" })
    ]).addTo(S.map);
    fit(L.latLngBounds([ruta.desde, ruta.hasta]).pad(0.25));
  }

  /* ---------- Eventos ---------- */
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".min, #x, [data-k], [data-need], #send, #pick, #reg");
    if (!b) return;
    if (b.id === "x") return closeP();
    if (b.classList.contains("min")) { const card = b.closest(".card"); return setMin(card, !card.classList.contains("is-min")); }
    if (b.id === "send") {
      const cuerpo = `Tipo de organización: ${$("#f1").value}\nNecesidad: ${$("#f2").value}\nUbicación: ${$("#f3").value}\n\n${$("#f4").value}`;
      window.open(wa("Consulta: " + $("#f2").value + "\n\n" + cuerpo), "_blank", "noopener"); return;
    }
    if (b.id === "pick") { S.picking = true; setMin($("#panel"), true); aviso("Toca en el mapa el punto donde está tu empresa."); return; }
    if (b.id === "reg") {
      const v = (i) => $(i).value.trim();
      if (!v("#r1") || !v("#r2") || !v("#r3")) { aviso("Completa nombre, rubro y comuna/dirección para continuar."); return; }
      const loc = S.pick ? `https://www.openstreetmap.org/?mlat=${S.pick.lat.toFixed(6)}&mlon=${S.pick.lng.toFixed(6)}#map=17/${S.pick.lat.toFixed(6)}/${S.pick.lng.toFixed(6)}\nlat/lng: ${S.pick.lat.toFixed(6)}, ${S.pick.lng.toFixed(6)}` : "por definir";
      const msg = `Hola, quiero registrar mi empresa en el mapa de Sostenibilidad Global.\n\nEmpresa: ${v("#r1")}\nRubro: ${v("#r2")}\nComuna y dirección: ${v("#r3")}\nDescripción: ${v("#r4") || "-"}\nContacto: ${v("#r5") || "-"}\nUbicación en el mapa: ${loc}`;
      window.open(wa(msg), "_blank", "noopener"); return;
    }
    if (b.dataset.need) return open("contacto", b.dataset.need);
    open(b.dataset.k);
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && $("#panel").classList.contains("open")) closeP(); });

  /* ---------- Arranque ---------- */
  async function init() {
    try {
      const [cfg, sv, sc] = await Promise.all(["data/config.json", "data/servicios.json", "data/secciones.json"].map(getJSON));
      S.empresas = (await getJSON("data/empresas.json").catch(() => ({ empresas: [] }))).empresas || [];
      S.cfg = cfg; S.grupos = sv.grupos || []; S.servicios = sv.servicios || []; S.secciones = sc;
    } catch (err) {
      aviso(location.protocol === "file:"
        ? "Los navegadores bloquean la lectura de datos al abrir el archivo directamente. Publica el sitio en GitHub Pages o ábrelo con un servidor local (python3 -m http.server)."
        : "No se pudieron cargar los datos del sitio: " + err.message);
      return;
    }
    const t = S.cfg.textos, si = S.cfg.sitio;
    $("#h1").innerHTML = `${esc(t.titulo)} <em>${esc(t.tituloEnfasis)}</em>`;
    $("#intro-t").textContent = t.intro;
    $("#intro-s").textContent = `${si.razonSocial} · RUT ${si.rut} · ${si.direccion}`;
    $("#areas-t").textContent = t.areas;
    $("#nav").innerHTML = S.secciones.filter((s) => s.activo !== false).map((s) => safeUrl(s.enlaceDirecto)
      ? `<a class="navlink" href="${esc(s.enlaceDirecto)}" target="_blank" rel="noopener">${esc(s.titulo)} ↗</a>`
      : `<button type="button" data-k="${esc(s.id)}">${esc(s.titulo)}</button>`).join("");
    $("#intro-c").innerHTML = `WhatsApp <a href="${esc(wa("Hola, quiero conversar con Sostenibilidad Global."))}" target="_blank" rel="noopener">${esc(si.telefono)}</a> · <a href="mailto:${esc(si.correo)}">${esc(si.correo)}</a>`;
    const li = $("#lnk"); if (safeUrl(si.linkedin)) li.href = si.linkedin; else li.hidden = true;
    $("#tags").innerHTML = S.grupos.map((g) => {
      const items = activos().filter((s) => s.grupo === g.id);
      return items.length ? `<details class="grp"><summary>${esc(g.titulo)} <small>${items.length}</small></summary><div class="chips">${items.map((s) => `<button class="chip" type="button" data-k="${esc(s.id)}">${esc(s.titulo)}</button>`).join("")}</div></details>` : "";
    }).join("");
    $$(".card").forEach((c) => setMin(c, false));
    if (narrow()) setMin($("#intro"), true);
    initMap();
    const h = decodeURIComponent(location.hash.slice(1));
    if (h) open(h, null, false);
  }
  init();
})();
