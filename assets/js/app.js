/* Sostenibilidad Global SpA - sitio one-page sobre OpenStreetMap.
   Datos editables en /data: config.json, servicios.json, secciones.json */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const getJSON = async (u) => { const r = await fetch(u, { cache: "no-cache" }); if (!r.ok) throw new Error(`${u} (${r.status})`); return r.json(); };

  const S = { cfg: null, grupos: [], servicios: [], secciones: [], empresas: [], emp: null, empMissing: false, empNear: null, empCob: null, pick: null, pickMk: null, picking: false, map: null, demo: null, tiles: { ok: 0, err: 0 }, lastFocus: null };
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

  /* ---------- Modo empresa (?e=id): la misma página con la marca y el mapa de una empresa ---------- */
  const NOM_DIA = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
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
  const waE = (t) => `https://wa.me/${S.emp.whatsapp || S.cfg.sitio.whatsapp}?text=${encodeURIComponent(t)}`;
  const msgBase = () => S.emp.mensajeWhatsApp || `Hola, vi a ${S.emp.nombre} en Sostenibilidad Global y quiero hacer una consulta.`;
  const dirUrl = () => `https://www.google.com/maps/dir/?api=1&destination=${S.emp.lat},${S.emp.lng}`;
  const telHref = (t) => "tel:" + String(t).replace(/[^\d+]/g, "");
  const estadoHtml = () => { const a = abiertoAhora(S.emp.horario); return a === null ? "" : `<span class="estado ${a ? "ab" : "ce"}">${a ? "Abierto ahora" : "Cerrado ahora"}</span>`; };
  const horarioHtml = () => {
    const e = S.emp; if (!(e.horario || []).length) return "";
    return `<h3>Horario</h3><table class="hor">${e.horario.map((b) => `<tr><td>${esc(b.etiqueta)}</td><td>${esc(b.abre)} – ${esc(b.cierra)}</td></tr>`).join("")}</table>${e.horarioNota ? `<p class="nota">${esc(e.horarioNota)}</p>` : ""}`;
  };
  const botonesEmp = (texto) => {
    const e = S.emp;
    return `<div class="acts"><a class="btn" href="${esc(waE(texto || msgBase()))}" target="_blank" rel="noopener">Escribir por WhatsApp</a>${e.telefono ? `<a class="btn alt" href="${esc(telHref(e.telefono))}">Llamar</a>` : ""}<a class="btn alt" href="${esc(dirUrl())}" target="_blank" rel="noopener">Cómo llegar</a></div>`;
  };
  function renderEmpresa(id) {
    const e = S.emp, sv = e.servicios || [];
    if (id === "info" || id === "contacto") {
      const cob = e.cobertura ? `<h3>Zona de atención</h3><p>${esc(e.cobertura.texto || "")}</p>${e.cobertura.radioKm ? `<button class="btn alt" type="button" data-zoom="cob">Ver zona en el mapa</button>` : ""}` : "";
      const lista = sv.length ? `<h3>Servicios</h3><ul>${sv.map((s) => `<li>${esc(s.titulo)}</li>`).join("")}</ul>` : "";
      const pie = e.prototipo ? "Prototipo con datos de ejemplo, pendientes de confirmar con la empresa." : "✓ Empresa verificada por Sostenibilidad Global SpA.";
      return { t: e.nombre, h: `<span class="ey">${esc(e.rubro)} · ${esc(e.comuna)}</span> ${estadoHtml()}<p>${esc(e.descripcion || "")}</p><p><b>Dirección:</b> ${esc(e.direccion || e.comuna)}</p>${botonesEmp()}${horarioHtml()}${lista}${cob}<p class="nota">${esc(pie)}</p>` };
    }
    const m = /^sv:(\d+)$/.exec(id), s = m && sv[Number(m[1])];
    if (!s) return null;
    return { t: s.titulo, h: `<span class="ey">${esc(e.nombre)}</span><p>${esc(s.detalle || "")}</p>${botonesEmp(`Hola, vi a ${e.nombre} en Sostenibilidad Global y necesito: ${s.titulo}.`)}` };
  }
  function setupEmp() {
    const e = S.emp;
    const d = `${e.rubro} en ${e.comuna}, Región del Biobío. ${e.descripcion || ""}`.trim();
    const meta = (sel, v) => { const m = $(sel); if (m) m.setAttribute("content", v); };
    document.title = `${e.nombre} | ${e.rubro} en ${e.comuna}`;
    meta('meta[name="description"]', d); meta('meta[property="og:title"]', e.nombre); meta('meta[property="og:description"]', d);
    const br = $(".brand"); br.dataset.k = "info"; br.textContent = e.nombre;
    $("#h1").innerHTML = `${esc(e.nombre)} <em>${esc(e.rubro)} en ${esc(e.comuna)}</em>`;
    $("#intro-t").textContent = e.descripcion || "";
    $("#intro-s").innerHTML = `${esc(e.direccion || e.comuna)} ${estadoHtml()}${e.prototipo ? ' <span class="estado pr">Prototipo · datos de ejemplo</span>' : ""}`;
    $("#intro-c").innerHTML = [`<a href="${esc(waE(msgBase()))}" target="_blank" rel="noopener">Escribir por WhatsApp</a>`, e.telefono ? `<a href="${esc(telHref(e.telefono))}">${esc(e.telefono)}</a>` : "", `<a href="${esc(dirUrl())}" target="_blank" rel="noopener">Cómo llegar</a>`].filter(Boolean).join(" · ");
    $("#areas-t").textContent = "Servicios";
    $("#tags").innerHTML = `<div class="chips">${(e.servicios || []).map((s, i) => `<button class="chip" type="button" data-k="sv:${i}">${esc(s.titulo)}</button>`).join("")}</div>`;
    $("#nav").innerHTML = `<button type="button" data-k="info">Sobre nosotros</button><button type="button" data-k="contacto">Contacto y horario</button><a class="navlink" href="${esc(dirUrl())}" target="_blank" rel="noopener">Cómo llegar ↗</a>`;
    $("#lnk").hidden = true;
    const red = document.createElement("a");
    red.className = "red"; red.href = location.pathname; red.innerHTML = "🌿 Parte de la red <b>Sostenibilidad Global</b>";
    $("#ui").appendChild(red);
    if (!e.prototipo) {
      const ld = { "@context": "https://schema.org", "@type": "AutoRepair", name: e.nombre, description: d, url: location.href,
        address: { "@type": "PostalAddress", streetAddress: e.direccion || undefined, addressLocality: e.comuna, addressRegion: "Biobío", addressCountry: "CL" },
        geo: { "@type": "GeoCoordinates", latitude: e.lat, longitude: e.lng }, telephone: e.telefono || undefined,
        openingHoursSpecification: (e.horario || []).map((b) => ({ "@type": "OpeningHoursSpecification", dayOfWeek: b.dias.map((n) => NOM_DIA[n]), opens: b.abre, closes: b.cierra })) };
      const sc = document.createElement("script"); sc.type = "application/ld+json";
      sc.textContent = JSON.stringify(ld).replace(/</g, "\\u003c"); document.head.appendChild(sc);
    } else {
      aviso("Prototipo con datos de ejemplo: falta confirmar con el taller la dirección exacta, el teléfono o WhatsApp, el horario y los servicios.");
    }
  }
  function empMap(m) {
    const e = S.emp, ll = [e.lat, e.lng];
    S.empNear = L.latLng(ll).toBounds(3000);
    if (e.cobertura && e.cobertura.radioKm) {
      S.empCob = L.circle(ll, { radius: e.cobertura.radioKm * 1000, color: "#1f6b4a", weight: 2, dashArray: "6 8", fillColor: "#5dbb8a", fillOpacity: 0.1, interactive: false }).addTo(m);
    }
    const pin = L.marker(ll, { icon: L.divIcon({ className: "", html: `<div class="pin"><i></i><b>${esc(e.nombre)}</b></div>`, iconSize: [0, 0] }), keyboard: true, title: e.nombre }).addTo(m);
    pin.on("click", () => open("info"));
    fit(S.empNear);
  }
  const zoomEmp = (k) => fit(k === "cob" && S.empCob ? S.empCob.getBounds() : S.empNear);

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
    let sv = null, r;
    if (S.emp) { r = renderEmpresa(id); if (!r) return; }
    else {
      sv = activos().find((s) => s.id === id);
      const sc = S.secciones.find((s) => s.id === id && s.activo !== false);
      if (!sv && !sc) return;
      r = sv ? renderServicio(sv) : renderSeccion(sc, need);
    }
    const p = $("#panel");
    $("#pt").textContent = r.t; $("#pb").innerHTML = r.h;
    if (fromUser) S.lastFocus = document.activeElement;
    if (S.emp) $("#aviso").hidden = true;
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
    if (S.emp) { empMap(m); addEventListener("resize", () => m.invalidateSize()); return; }
    fit(c.limites);
    const pin = L.marker(c.centro, { icon: L.divIcon({ className: "", html: `<div class="pin"><i></i><b>${esc(c.etiquetaCentro)}</b></div>`, iconSize: [0, 0] }), keyboard: true, title: c.etiquetaCentro }).addTo(m);
    pin.on("click", () => open("quienes"));
    S.empresas.filter((e) => e.activo !== false && isFinite(e.lat) && isFinite(e.lng)).forEach((e) => {
      const mk = L.marker([e.lat, e.lng], { icon: L.divIcon({ className: "", html: '<div class="emp"></div>', iconSize: [0, 0] }), title: e.nombre, keyboard: true }).addTo(m);
      const w = safeUrl(e.web);
      const node = document.createElement("div");
      node.innerHTML = `<b>${esc(e.nombre)}</b><br><small>${e.prototipo ? "Prototipo (datos de ejemplo)" : "✓ Verificada"} · ${esc(e.rubro)}${e.comuna ? " · " + esc(e.comuna) : ""}</small>${e.descripcion ? `<p>${esc(e.descripcion)}</p>` : ""}${w ? `<a href="${esc(w)}" target="_blank" rel="noopener">Sitio web</a>` : ""}${e.servicios && e.servicios.length ? `<p><a href="?e=${encodeURIComponent(e.id)}">Ver ficha de la empresa →</a></p>` : ""}`;
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
    const b = e.target.closest(".min, #x, [data-k], [data-need], [data-zoom], #send, #pick, #reg");
    if (!b) return;
    if (b.id === "x") return closeP();
    if (b.dataset.zoom) return zoomEmp(b.dataset.zoom);
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
      const eid = new URLSearchParams(location.search).get("e");
      if (eid) { S.emp = S.empresas.find((x) => x.id === eid && x.activo !== false) || null; S.empMissing = !S.emp; }
    } catch (err) {
      aviso(location.protocol === "file:"
        ? "Los navegadores bloquean la lectura de datos al abrir el archivo directamente. Publica el sitio en GitHub Pages o ábrelo con un servidor local (python3 -m http.server)."
        : "No se pudieron cargar los datos del sitio: " + err.message);
      return;
    }
    const t = S.cfg.textos, si = S.cfg.sitio;
    if (S.emp) setupEmp(); else {
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
    }
    $$(".card").forEach((c) => setMin(c, false));
    if (narrow()) setMin($("#intro"), true);
    initMap();
    if (S.empMissing) aviso("No encontramos esa empresa. Te mostramos el mapa general.");
    const h = decodeURIComponent(location.hash.slice(1));
    if (h) open(h, null, false);
  }
  init();
})();
