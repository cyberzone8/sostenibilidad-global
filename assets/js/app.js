/* Sostenibilidad Global SpA - sitio one-page sobre OpenStreetMap.
   Datos editables en /data: config.json, servicios.json, secciones.json */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const { esc, safeUrl, telHref, abiertoAhora } = window.SG; /* assets/js/comun.js */
  const getJSON = async (u) => { const r = await fetch(u, { cache: "no-cache" }); if (!r.ok) throw new Error(`${u} (${r.status})`); return r.json(); };

  const S = { cfg: null, grupos: [], servicios: [], secciones: [], empresas: [], emp: null, empMissing: false, empNear: null, empCob: null, pick: null, pickMk: null, picking: false, map: null, demo: null, demoT: [], cur: null, tiles: { ok: 0, err: 0 }, lastFocus: null, activos: [], activosListos: false, activosP: null, capas: {}, dim: "" };
  const narrow = () => matchMedia("(max-width:760px)").matches;
  /* v16: estado del panel de capas */
  Object.assign(S, { tl: null, empGrp: null, ocultos: new Set(), nombres: false, base: "calle", opBase: 100, opCapas: 100, vis: { empresas: true, escena: true }, pref: {} });

  /* ---------- Avisos ---------- */
  const avisoOff = () => { $("#aviso").hidden = true; };
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
  const wa = (texto, origen = "sitio") => window.SG.waUrl(S.cfg.sitio.whatsapp, texto, origen);
  const contactoHtml = () => { const si = S.cfg.sitio; return `<div class="sec"><span class="ey">Contacto directo</span><br><a class="btn" data-ev="wa/sitio/contacto" href="${esc(wa("Hola, quiero conversar con Sostenibilidad Global.", "sitio · contacto"))}" target="_blank" rel="noopener">Escribir por WhatsApp</a><br><br><span>Teléfono: <a href="tel:+${esc(si.whatsapp)}">${esc(si.telefono)}</a></span><br><span>Correo: <a href="mailto:${esc(si.correo)}">${esc(si.correo)}</a></span></div>`; };
  const formUrl = (k) => safeUrl((S.cfg.formularios || {})[k]);
  const privHtml = () => `<p class="nota">Al enviar tus datos aceptas el <a href="privacidad/">aviso de privacidad</a>. Pedimos solo lo necesario para verificar y publicar tu empresa.</p>`;
  function registroHtml() {
    const r = S.cfg.registro || {};
    const fe = formUrl("empresa");
    const precio = r.precioUF ? `Valor del registro: <b>${esc(r.precioUF)} UF</b>.` : esc(r.textoPrecio || "");
    const gf = fe ? `<p><a class="btn" data-ev="form/empresa" href="${esc(fe)}" target="_blank" rel="noopener">Completar el formulario</a></p><p class="nota">O, si prefieres, escríbenos por WhatsApp con este formulario:</p>` : "";
    return `<p class="nota">${precio}</p>${gf}
      <label for="r1">Nombre de la empresa o negocio *</label><input id="r1" maxlength="80">
      <label for="r2">Rubro *</label><input id="r2" maxlength="80" placeholder="Ej.: reciclaje de cartón, gestión de residuos">
      <label for="r3">Comuna y dirección *</label><input id="r3" maxlength="120" placeholder="Ej.: Los Ángeles, calle y número">
      <label for="r4">Descripción breve</label><textarea id="r4" rows="3" maxlength="300"></textarea>
      <label for="r5">Nombre de contacto</label><input id="r5" maxlength="60">
      <button class="btn alt" type="button" id="pick">📍 Marcar ubicación en el mapa</button> <span class="nota" id="pickT">${S.pick ? `Ubicación marcada (${S.pick.lat.toFixed(5)}, ${S.pick.lng.toFixed(5)})` : "Opcional: facilita la verificación."}</span><br>
      <button class="btn" type="button" id="reg">Enviar por WhatsApp</button>${privHtml()}`;
  }

  /* ---------- Modo empresa (?e=id): la misma página con la marca y el mapa de una empresa ---------- */
  const NOM_DIA = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const waE = (t) => window.SG.waUrl(S.emp.whatsapp || S.cfg.sitio.whatsapp, t, "ficha en mapa · " + S.emp.nombre);
  const imgList = (e) => (e.imagenes || []).map((i) => (typeof i === "string" ? { archivo: i, alt: "" } : i)).filter((i) => i.archivo);
  const imgSrc = (e, f) => `assets/empresas/${encodeURIComponent(e.id)}/${encodeURIComponent(f)}`;
  const galHtml = (e) => { const l = imgList(e); return l.length ? `<div class="gal">${l.map((i) => `<img src="${esc(imgSrc(e, i.archivo))}" alt="${esc(i.alt || e.nombre)}" loading="lazy" onerror="this.remove()">`).join("")}</div>` : ""; };
  const fichaUrl = (e) => `empresas/${encodeURIComponent(e.id)}/`;
  const msgBase = () => S.emp.mensajeWhatsApp || `Hola, vi a ${S.emp.nombre} en Sostenibilidad Global y quiero hacer una consulta.`;
  const dirUrl = () => `https://www.google.com/maps/dir/?api=1&destination=${S.emp.lat},${S.emp.lng}`;
  const estadoHtml = () => { const a = abiertoAhora(S.emp.horario); return a === null ? "" : `<span class="estado ${a ? "ab" : "ce"}">${a ? "Abierto ahora" : "Cerrado ahora"}</span>`; };
  const horarioHtml = () => {
    const e = S.emp; if (!(e.horario || []).length) return "";
    return `<h3>Horario</h3><table class="hor">${e.horario.map((b) => `<tr><td>${esc(b.etiqueta)}</td><td>${esc(b.abre)} – ${esc(b.cierra)}</td></tr>`).join("")}</table>${e.horarioNota ? `<p class="nota">${esc(e.horarioNota)}</p>` : ""}`;
  };
  const botonesEmp = (texto) => {
    const e = S.emp;
    return `<div class="acts"><a class="btn" data-ev="wa/${esc(e.id)}/mapa" href="${esc(waE(texto || msgBase()))}" target="_blank" rel="noopener">Escribir por WhatsApp</a>${e.telefono ? `<a class="btn alt" data-ev="tel/${esc(e.id)}/mapa" href="${esc(telHref(e.telefono))}">Llamar</a>` : ""}<a class="btn alt" data-ev="dir/${esc(e.id)}/mapa" href="${esc(dirUrl())}" target="_blank" rel="noopener">Cómo llegar</a></div>`;
  };
  function renderEmpresa(id) {
    const e = S.emp, sv = e.servicios || [];
    if (id === "info" || id === "contacto") {
      const cob = e.cobertura ? `<h3>Zona de atención</h3><p>${esc(e.cobertura.texto || "")}</p>${e.cobertura.radioKm ? `<button class="btn alt" type="button" data-zoom="cob">Ver zona en el mapa</button>` : ""}` : "";
      const lista = sv.length ? `<h3>Servicios</h3><ul>${sv.map((s) => `<li>${esc(s.titulo)}</li>`).join("")}</ul>` : "";
      const rel = relServicios(e);
      const pie = e.prototipo ? "Prototipo con datos de ejemplo, pendientes de confirmar con la empresa." : "✓ Empresa verificada por Sostenibilidad Global SpA.";
      return { t: e.nombre, h: `<span class="ey">${esc(e.rubro)} · ${esc(e.comuna)}</span> ${estadoHtml()}<p>${esc(e.descripcion || "")}</p>${galHtml(e)}<p><b>Dirección:</b> ${esc(e.direccion || e.comuna)}</p>${e.telefono ? `<p><b>Teléfono:</b> <a href="${esc(telHref(e.telefono))}">${esc(e.telefono)}</a></p>` : ""}${botonesEmp()}${horarioHtml()}${lista}${cob}${rel}<p><a href="${esc(fichaUrl(e))}">Ver ficha completa →</a></p><p class="nota">${esc(pie)}</p>` };
    }
    const m = /^sv:(\d+)$/.exec(id), s = m && sv[Number(m[1])];
    if (!s) return null;
    return { t: s.titulo, h: `<span class="ey">${esc(e.nombre)}</span>${s.imagen ? `<div class="gal one"><img src="${esc(imgSrc(e, s.imagen))}" alt="${esc(s.titulo)}" loading="lazy" onerror="this.remove()"></div>` : ""}<p>${esc(s.detalle || "")}</p>${botonesEmp(`Hola, vi a ${e.nombre} en Sostenibilidad Global y necesito: ${s.titulo}.`)}` };
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
    buildNav([{ k: "info", t: "Sobre nosotros", p: 1 }, { k: "contacto", t: "Contacto y horario", p: 1 }, { href: fichaUrl(e), t: "Ficha completa", p: 1 }, { href: dirUrl(), t: "Cómo llegar", ext: 1, p: 1 }]);
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

  /* Un solo campo (empresas.json -> relacion) conecta en las dos direcciones: servicio -> empresas y empresa -> servicios */
  const enRed = (id) => S.empresas.filter((e) => e.activo !== false && (e.relacion || []).includes(id));
  const relServicios = (e) => { const l = (e.relacion || []).map((id) => activos().find((s) => s.id === id)).filter(Boolean); return l.length ? `<h3>Servicios de Sostenibilidad Global relacionados</h3><ul>${l.map((s) => `<li><a href="./#${esc(s.id)}">${esc(s.titulo)}</a></li>`).join("")}</ul>` : ""; };
  function renderServicio(s) {
    const red = enRed(s.id);
    const redHtml = red.length ? `<h3>En la red</h3><ul>${red.map((e) => `<li><a data-ev="ficha/${esc(e.id)}/servicio" href="empresas/${encodeURIComponent(e.id)}/">${esc(e.nombre)}</a> · ${esc(e.rubro)}${e.comuna ? " · " + esc(e.comuna) : ""}</li>`).join("")}</ul>` : "";
    return { t: s.titulo, h: `<span class="ey">${esc(grupoTitulo(s.grupo))}</span><p>${esc(s.resumen)}</p>${s.mapa && s.mapa.leyenda ? `<p class="leg"><b>En el mapa:</b> ${esc(s.mapa.leyenda)} <button class="lnk" type="button" data-replay>↻ Repetir</button></p>` : ""}<h3>Qué hacemos</h3><ul>${(s.acciones || []).map((a) => `<li>${esc(a)}</li>`).join("")}</ul>${odsHtml(s.ods)}${redHtml}<button class="btn" type="button" data-need="${esc(s.titulo)}">Consultar por este servicio</button>${s.enlace && /^(https?:\/\/|[a-z0-9][a-z0-9\-\/]*\/?$)/i.test(s.enlace.url || "") ? ` <a class="btn alt" href="${esc(s.enlace.url)}">${esc(s.enlace.texto)}</a>` : ""}` };
  }
  function renderSeccion(c, need) {
    if (c.laboratorio && window.SG_LAB) return { t: c.titulo, h: window.SG_LAB.html() };
    let h = c.eyebrow ? `<span class="ey">${esc(c.eyebrow)}</span>` : "";
    if (c.encabezado) h += `<p class="lead">${esc(c.encabezado)}</p>`;
    (c.parrafos || []).forEach((p) => { h += `<p>${esc(p)}</p>`; });
    (c.bloques || []).forEach((b) => {
      h += `<div class="sec">${b.etiqueta ? `<span class="ey">${esc(b.etiqueta)}</span><br>` : ""}<b>${esc(b.titulo)}</b><br><span>${esc(b.texto)}</span>${b.enlace ? `<br><a data-ev="wa/sitio/alianzas" href="${esc(wa("Hola, me interesa: " + b.enlace.asunto, "sitio · " + c.titulo))}" target="_blank" rel="noopener">${esc(b.enlace.texto)}</a>` : ""}</div>`;
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

  /* ---------- Menú: entradas principales a la vista y el resto en "Más"; en celular, todo bajo el botón Menú ---------- */
  function buildNav(items) {
    const one = (i) => i.href
      ? `<a class="navlink" href="${esc(i.href)}"${i.ext ? ' target="_blank" rel="noopener"' : ""}>${esc(i.t)}${i.ext ? " ↗" : ""}</a>`
      : `<button type="button" data-k="${esc(i.k)}">${esc(i.t)}</button>`;
    const pr = items.filter((i) => i.p), rest = items.filter((i) => !i.p);
    $("#nav").innerHTML = pr.map(one).join("") + (rest.length ? `<span class="mas"><button type="button" class="mas-b" aria-expanded="false">Más ▾</button><span class="mas-l">${rest.map(one).join("")}</span></span>` : "");
  }
  function closeMenus() {
    $$(".mas.open").forEach((m) => { m.classList.remove("open"); $(".mas-b", m).setAttribute("aria-expanded", "false"); });
    $("#nav").classList.remove("open"); const mb = $("#menubtn"); if (mb) mb.setAttribute("aria-expanded", "false");
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
    if (window.SG_LAB) window.SG_LAB.cancel();
    const p = $("#panel");
    $("#pt").textContent = r.t; $("#pb").innerHTML = r.h;
    if (fromUser) S.lastFocus = document.activeElement;
    if (S.emp) $("#aviso").hidden = true;
    p.inert = false; p.classList.add("open"); setMin(p, false); p.scrollTop = 0;
    document.body.classList.add("pop");
    $$("[data-k]").forEach((b) => b.classList.toggle("on", b.dataset.k === id && !b.classList.contains("brand")));
    S.cur = sv; showScene(sv);
    if (!sv && !S.emp && window.SG_LAB && (S.secciones.find((s) => s.id === id) || {}).laboratorio) window.SG_LAB.mount(labApi);
    try { history.replaceState(null, "", "#" + id); } catch (e) { /* sin historial */ }
    if (fromUser) $("#pt").focus({ preventScroll: true });
  }
  function closeP() {
    const p = $("#panel");
    S.picking = false; $("#aviso").hidden = true;
    if (window.SG_LAB) window.SG_LAB.cancel();
    p.classList.remove("open"); p.inert = true; document.body.classList.remove("pop");
    $$(".on").forEach((b) => b.classList.remove("on"));
    S.cur = null; clearScene();
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* sin historial */ }
    if (S.lastFocus && S.lastFocus.focus) S.lastFocus.focus();
  }

  /* ---------- Mapa (OpenStreetMap) ---------- */
  function fit(bounds) {
    const m = S.map, s = m.getSize(), wide = s.x > 900, pres = document.body.classList.contains("present");
    m.fitBounds(bounds, pres
      ? { paddingTopLeft: [30, 80], paddingBottomRight: [30, narrow() ? 120 : 60] }
      : {
      paddingTopLeft: [wide ? Math.min(480, s.x * 0.36) : 16, 70],
      paddingBottomRight: [wide ? Math.min(440, s.x * 0.33) : 16, narrow() ? s.y * 0.4 : 20]
    });
  }
  const empConPos = () => S.empresas.filter((e) => e.activo !== false && isFinite(e.lat) && isFinite(e.lng));
  function initMap() {
    if (!window.L) { aviso("No se pudo cargar la librería del mapa (Leaflet). Revisa que la carpeta vendor/leaflet esté publicada."); return; }
    const c = S.cfg.mapa;
    const m = (S.map = L.map("map", { zoomControl: false, minZoom: 4 }));
    L.control.zoom({ position: "topleft", zoomInTitle: "Acercar", zoomOutTitle: "Alejar" }).addTo(m);
    const tl = L.tileLayer(c.teselas.url, { maxZoom: c.zoomMax || 19, attribution: c.teselas.atribucion, referrerPolicy: "origin" }).addTo(m);
    S.tl = tl;
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
    S.empGrp = L.layerGroup().addTo(m);
    empConPos().forEach((e) => {
      const mk = L.marker([e.lat, e.lng], { icon: L.divIcon({ className: "", html: '<div class="emp"></div>', iconSize: [0, 0] }), title: e.nombre, keyboard: true }).addTo(S.empGrp);
      const w = safeUrl(e.web);
      const node = document.createElement("div");
      node.innerHTML = `<b>${esc(e.nombre)}</b><br><small>${e.prototipo ? "Prototipo (datos de ejemplo)" : "✓ Verificada"} · ${esc(e.rubro)}${e.comuna ? " · " + esc(e.comuna) : ""}</small>${e.descripcion ? `<p>${esc(e.descripcion)}</p>` : ""}${w ? `<a href="${esc(w)}" target="_blank" rel="noopener">Sitio web</a>` : ""}${e.servicios && e.servicios.length ? `<p><a data-ev="ficha/${esc(e.id)}/mapa" href="empresas/${encodeURIComponent(e.id)}/">Ver ficha de la empresa →</a></p>` : ""}`;
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
    const zb = () => m.getContainer().classList.toggle("z-bajo", m.getZoom() < 12);
    m.on("zoomend", zb); zb();
    addEventListener("resize", () => m.invalidateSize());
  }
  function clearScene() {
    S.demoT.forEach(clearTimeout); S.demoT = [];
    if (S.demo && S.map) S.map.removeLayer(S.demo);
    S.demo = null;
  }
  /* Escena geométrica del servicio (assets/js/escenas.js): aparece por etapas sobre el mapa */
  function showScene(sv) {
    clearScene();
    if (!sv || !sv.mapa || !S.map) return;
    if (sv.mapa.activos && !S.emp) {
      if (!S.activosListos) { if (S.activosP) S.activosP.then(() => { if (S.cur === sv) showScene(sv); }); return; }
      setCapa("salud", true, true); setCapa("comunidad", true, true);
    }
    if (sv.mapa.ruta) return showRoute(sv.mapa.ruta);
    const lib = window.SG_ESC, f = lib && lib.escenas[sv.mapa.escena || sv.id];
    if (!f) return;
    const h = lib.ctx(); f(h);
    const grp = (S.demo = L.layerGroup());
    if (S.vis.escena) grp.addTo(S.map);
    const reduce = matchMedia("(prefers-reduced-motion:reduce)").matches;
    const dt = Math.min(420, 2400 / Math.max(1, h.st.length - 1));
    h.st.forEach((layers, i) => {
      const go = () => layers.forEach((l) => l.addTo(grp));
      if (i === 0 || reduce) go(); else S.demoT.push(setTimeout(go, i * dt));
    });
    if (h.pts.length) fit(L.latLngBounds(h.pts).pad(0.18));
  }
  function showRoute(ruta) {
    clearScene();
    if (!ruta || !S.map) return;
    const mk = (ll, col) => L.circleMarker(ll, { radius: 8, color: "#fff", weight: 2, fillColor: col, fillOpacity: 1 });
    S.demo = L.layerGroup([
      L.polyline([ruta.desde, ruta.hasta], { color: "#1f6b4a", weight: 3, dashArray: "8 8" }),
      mk(ruta.desde, "#5dbb8a"),
      mk(ruta.hasta, "#ef6c00").bindTooltip(ruta.etiqueta || "Ejemplo ilustrativo", { permanent: true, direction: "top" })
    ]);
    if (S.vis.escena) S.demo.addTo(S.map);
    fit(L.latLngBounds([ruta.desde, ruta.hasta]).pad(0.25));
  }

  /* ---------- Activos comunitarios (postas, centros de salud, sedes): data/activos.json u OpenStreetMap en vivo ---------- */
  const sinTilde = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  function clasificarActivo(el) {
    const t = el.tags || {}, n = sinTilde(t.name), am = t.amenity || "", ll = el.lat != null ? [el.lat, el.lon] : el.center ? [el.center.lat, el.center.lon] : null;
    if (!t.name || !ll) return null;
    const salud = /cesfam|cecosf|\bcesc\b|cosam|posta|hospital|\bsar\b|\bsapu\b|centro (comunitario )?de salud|consultorio|servicio de salud|urgencia/.test(n) && (["hospital", "clinic", "doctors"].includes(am) || t.healthcare);
    if (salud) {
      const tipo = /hospital/.test(n) ? "Hospital" : /cesfam/.test(n) ? "CESFAM" : /cecosf/.test(n) ? "CECOSF" : /posta/.test(n) ? "Posta rural" : /\bsar\b|\bsapu\b|urgencia/.test(n) ? "Urgencia (SAR/SAPU)" : "Centro de salud";
      return { nombre: t.name, tipo, grupo: "salud", lat: ll[0], lng: ll[1] };
    }
    const com = { community_centre: "Centro comunitario", social_facility: "Servicio social", townhall: "Municipalidad", library: "Biblioteca" }[am];
    return com ? { nombre: t.name, tipo: com, grupo: "comunidad", lat: ll[0], lng: ll[1] } : null;
  }
  async function overpassActivos() {
    const bb = "-37.62,-72.65,-37.32,-72.10";
    const q = `[out:json][timeout:25];(nwr["amenity"~"^(hospital|clinic|doctors|community_centre|social_facility|townhall|library)$"](${bb});nwr["healthcare"](${bb}););out center tags 500;`;
    const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q), headers: { "Content-Type": "application/x-www-form-urlencoded" } });
    if (!r.ok) throw new Error("overpass " + r.status);
    const seen = new Set();
    return ((await r.json()).elements || []).map(clasificarActivo).filter((a) => { if (!a) return false; const k = sinTilde(a.nombre) + a.lat.toFixed(3) + a.lng.toFixed(3); if (seen.has(k)) return false; seen.add(k); return true; });
  }
  async function cargarActivos() {
    let lista = [], fuente = "", actualizado = "";
    try { const j = await getJSON("data/activos.json"); lista = j.activos || []; fuente = j.fuente || ""; actualizado = j.actualizado || ""; } catch (e) { /* sin archivo */ }
    if (!lista.length) { try { lista = await overpassActivos(); fuente = "OpenStreetMap (ODbL), consulta en vivo"; } catch (e) { /* sin red */ } }
    S.activos = lista; S.activosFuente = fuente; S.activosActualizado = actualizado; window.SG_ACTIVOS = lista; S.activosListos = true;
    pintarActivos();
  }
  const COL_ACT = { salud: "#0e8f5a", comunidad: "#7b4fb0" };
  const GRUPOS_ACT = ["salud", "comunidad"];
  function dibujarActivos(g) {
    const lay = S.capas[g]; if (!lay) return;
    const todos = S.activos.filter((a) => a.grupo === g), items = todos.filter((a) => !S.ocultos.has(a.tipo));
    lay.grp.clearLayers(); lay.items = items;
    items.forEach((a) => {
      const mk = L.circleMarker([a.lat, a.lng], { radius: 7, color: "#fff", weight: 2, fillColor: COL_ACT[g], fillOpacity: 1 })
        .bindPopup(`<b>${esc(a.nombre)}</b><br><small>${esc(a.tipo)}</small><br><small>Fuente: ${esc(S.activosFuente || "datos abiertos")}</small>`);
      if (S.nombres) mk.bindTooltip(esc(a.nombre), { permanent: true, direction: "top", offset: [0, -8], className: "capa-nom" });
      mk.addTo(lay.grp);
    });
    const cb = $("#cap-" + g); if (cb) cb.disabled = !todos.length;
    const n = $("#cap-" + g + "-n");
    if (n) n.textContent = !todos.length ? "(sin datos)" : items.length === todos.length ? `(${todos.length})` : `(${items.length} de ${todos.length})`;
  }
  function pintarTipos() {
    GRUPOS_ACT.forEach((g) => {
      const box = $("#tp-" + g); if (!box) return;
      const cnt = {}; S.activos.filter((a) => a.grupo === g).forEach((a) => { cnt[a.tipo] = (cnt[a.tipo] || 0) + 1; });
      const tipos = Object.keys(cnt).sort();
      box.hidden = tipos.length < 2; /* con un solo tipo no hay nada que filtrar */
      box.innerHTML = tipos.map((t) => `<button type="button" class="tp" data-tipo="${esc(t)}" aria-pressed="${!S.ocultos.has(t)}">${esc(t)} <small>${cnt[t]}</small></button>`).join("");
    });
  }
  function pintarActivos() {
    if (!S.map || S.emp) return;
    GRUPOS_ACT.forEach((g) => {
      S.capas[g] = S.capas[g] || { grp: L.layerGroup(), on: false };
      dibujarActivos(g);
    });
    pintarTipos();
    const src = $("#cap-src"); if (src) src.textContent = S.activos.length ? "Fuente: " + (S.activosFuente || "datos abiertos") : "No se pudieron cargar. Ver README: importar activos.";
    GRUPOS_ACT.forEach((g) => { if (S.pref[g] && S.activos.some((a) => a.grupo === g)) setCapa(g, true, true); }); /* recupera lo que la persona dejó encendido */
  }
  function setCapa(g, on, auto) {
    const lay = S.capas[g]; if (!lay || !S.map) return; lay.on = on;
    if (on) lay.grp.addTo(S.map); else S.map.removeLayer(lay.grp);
    const cb = $("#cap-" + g); if (cb) cb.checked = on;
    if (!auto) guardarPref();
  }
  function setEmpresas(on) {
    S.vis.empresas = on;
    if (S.empGrp && S.map) { if (on) S.empGrp.addTo(S.map); else S.map.removeLayer(S.empGrp); }
    const cb = $("#cap-empresas"); if (cb) cb.checked = on;
  }
  function setEscena(on) {
    S.vis.escena = on;
    if (S.demo && S.map) { if (on) S.demo.addTo(S.map); else S.map.removeLayer(S.demo); }
    const cb = $("#cap-escena"); if (cb) cb.checked = on;
  }
  function setBase(v) {
    S.base = v; const m = S.map; if (!m || !S.tl) return;
    m.getContainer().classList.toggle("mapa-gris", v === "gris");
    if (v === "nada") { if (m.hasLayer(S.tl)) m.removeLayer(S.tl); }
    else if (!m.hasLayer(S.tl)) { S.tl.addTo(m); S.tl.bringToBack(); }
    const sel = $("#cap-base"); if (sel) sel.value = v;
  }
  function setOpBase(v) { S.opBase = v; if (S.tl) S.tl.setOpacity(v / 100); const o = $("#cap-opb-o"); if (o) o.textContent = v + "%"; }
  function setOpCapas(v) { S.opCapas = v; if (S.map) S.map.getContainer().style.setProperty("--op-capas", v / 100); const o = $("#cap-opc-o"); if (o) o.textContent = v + "%"; }
  function setNombres(on) { S.nombres = on; GRUPOS_ACT.forEach(dibujarActivos); const cb = $("#cap-nom"); if (cb) cb.checked = on; }
  function todasCapas(on) {
    GRUPOS_ACT.forEach((g) => { if (S.capas[g] && S.activos.some((a) => a.grupo === g)) setCapa(g, on, true); });
    setEmpresas(on); setEscena(on); guardarPref();
  }
  function centrarCapas() {
    const pts = [];
    GRUPOS_ACT.forEach((g) => { const l = S.capas[g]; if (l && l.on) (l.items || []).forEach((a) => pts.push([a.lat, a.lng])); });
    if (window.SG_LAB && window.SG_LAB.visible()) window.SG_LAB.points().forEach((q) => pts.push(q));
    if (S.vis.empresas) empConPos().forEach((e) => pts.push([e.lat, e.lng]));
    if (!pts.length) { aviso("No hay capas con puntos visibles para centrar. Enciende alguna capa."); return; }
    fit(L.latLngBounds(pts).pad(0.15));
  }
  /* Preferencias del panel: solo en este navegador (localStorage), nunca se envían a ningún lado */
  const LS_CAPAS = "sg-capas-v1";
  function leerPref() { try { return JSON.parse(localStorage.getItem(LS_CAPAS)) || {}; } catch (e) { return {}; } }
  function guardarPref() {
    try {
      const on = (g) => !!(S.capas[g] && S.capas[g].on);
      localStorage.setItem(LS_CAPAS, JSON.stringify({ salud: on("salud"), comunidad: on("comunidad"), empresas: S.vis.empresas, escena: S.vis.escena, ocultos: [...S.ocultos], base: S.base, opBase: S.opBase, opCapas: S.opCapas, nombres: S.nombres, min: !!($("#capas") && $("#capas").classList.contains("is-min")) }));
    } catch (e) { /* sin almacenamiento: el panel funciona igual, solo no recuerda */ }
  }
  /* Modo presentación: oculta las tarjetas y deja el mapa y la escena a pantalla completa (atajo: tecla P) */
  function togglePresent(force) {
    const on = force != null ? force : !document.body.classList.contains("present");
    document.body.classList.toggle("present", on);
    const b = $("#present"); if (b) { b.setAttribute("aria-pressed", String(on)); b.textContent = on ? "Salir del modo presentación" : "Modo presentación"; }
    const pn = $("#panel"); if (pn.classList.contains("open")) setMin(pn, on);
    if (S.map) { S.map.invalidateSize(); if (S.cur) showScene(S.cur); }
  }
  function setCapasMin(min) {
    const d = $("#capas"); if (!d) return;
    d.classList.toggle("is-min", min);
    $("#capas-t").setAttribute("aria-expanded", String(!min));
  }
  /* Laboratorio de datos: lo que el módulo necesita de la aplicación */
  const labApi = { S, narrow, setMin, aviso, avisoOff, fit, setCapa, $ };
  function syncLab() {
    const L2 = window.SG_LAB, cb = $("#cap-lab"); if (!L2 || !cb) return;
    cb.checked = L2.visible(); cb.disabled = L2.count() === 0 && !L2.visible() ? false : false;
    $("#cap-lab-n").textContent = "(" + L2.count() + ")";
  }
  function initCapas() {
    if (S.emp) return;
    const p = (S.pref = leerPref());
    const num = (v, d) => (typeof v === "number" && isFinite(v) ? Math.min(100, Math.max(30, v)) : d);
    S.vis.empresas = p.empresas !== false; S.vis.escena = p.escena !== false;
    S.ocultos = new Set(Array.isArray(p.ocultos) ? p.ocultos.map(String) : []);
    S.nombres = p.nombres === true;
    const nEmp = empConPos().length;
    const d = document.createElement("div"); d.id = "capas"; d.className = "capas";
    d.innerHTML = `<button type="button" class="capas-h" id="capas-t" aria-expanded="true" aria-controls="capas-b"><b>Capas del mapa</b><span class="cv" aria-hidden="true">▾</span></button>
<div class="capas-b" id="capas-b">
  <div class="g"><label class="fl" for="cap-base">Mapa base</label>
    <select id="cap-base"><option value="calle">Calle (OpenStreetMap)</option><option value="gris">Gris: resalta las capas</option><option value="nada">Sin mapa base</option></select></div>
  <div class="g">
    <label><input type="checkbox" id="cap-salud" disabled> <i class="sw" style="background:${COL_ACT.salud}"></i> Salud <span id="cap-salud-n">(cargando)</span></label>
    <div class="tps" id="tp-salud" hidden></div>
    <label><input type="checkbox" id="cap-comunidad" disabled> <i class="sw" style="background:${COL_ACT.comunidad}"></i> Comunidad <span id="cap-comunidad-n"></span></label>
    <div class="tps" id="tp-comunidad" hidden></div>
    <label><input type="checkbox" id="cap-lab"> <i class="sw" style="background:#be185d"></i> Aportes de la comunidad (taller) <span id="cap-lab-n"></span></label>
    <label><input type="checkbox" id="cap-empresas"${nEmp ? "" : " disabled"}> <i class="sw" style="background:#ef6c00"></i> Empresas registradas <span>(${nEmp})</span></label>
    <label><input type="checkbox" id="cap-escena"> <i class="sw" style="background:#1f6b4a"></i> Ilustración del servicio</label>
  </div>
  <div class="g">
    <label class="fl" for="cap-opb">Intensidad del mapa base <output id="cap-opb-o"></output></label><input type="range" id="cap-opb" min="30" max="100" step="5">
    <label class="fl" for="cap-opc">Intensidad de las capas <output id="cap-opc-o"></output></label><input type="range" id="cap-opc" min="30" max="100" step="5">
    <label><input type="checkbox" id="cap-nom"> Mostrar nombres <small>(al acercar el mapa)</small></label>
  </div>
  <div class="fila"><button type="button" class="cb" data-cap="todas">Mostrar todas</button><button type="button" class="cb" data-cap="ninguna">Ocultar todas</button><button type="button" class="cb" data-cap="centrar">Centrar en las capas</button></div>
  <small id="cap-src"></small>
  <button type="button" id="present" aria-pressed="false">Modo presentación</button>
</div>`;
    $("#ui").appendChild(d);
    /* estado inicial del panel y del mapa */
    setCapasMin(typeof p.min === "boolean" ? p.min : narrow());
    $("#cap-empresas").checked = S.vis.empresas; $("#cap-escena").checked = S.vis.escena; $("#cap-nom").checked = S.nombres;
    if (!S.vis.empresas) setEmpresas(false);
    const ob = num(p.opBase, 100), oc = num(p.opCapas, 100);
    $("#cap-opb").value = ob; $("#cap-opc").value = oc; setOpBase(ob); setOpCapas(oc);
    setBase(["calle", "gris", "nada"].includes(p.base) ? p.base : "calle");
    d.addEventListener("click", (e) => {
      const t = e.target.closest("button"); if (!t) return;
      if (t.id === "present") return togglePresent();
      if (t.id === "capas-t") { setCapasMin(!d.classList.contains("is-min")); guardarPref(); return; }
      if (t.dataset.tipo) {
        const k = t.dataset.tipo, ver = S.ocultos.has(k); /* estaba oculto: lo muestra */
        if (ver) S.ocultos.delete(k); else S.ocultos.add(k);
        t.setAttribute("aria-pressed", String(ver)); GRUPOS_ACT.forEach(dibujarActivos); guardarPref(); return;
      }
      if (t.dataset.cap === "todas") return todasCapas(true);
      if (t.dataset.cap === "ninguna") return todasCapas(false);
      if (t.dataset.cap === "centrar") return centrarCapas();
    });
    d.addEventListener("change", (e) => {
      const id = e.target.id, on = e.target.checked;
      if (id === "cap-salud" || id === "cap-comunidad") return setCapa(id.slice(4), on);
      if (id === "cap-lab") { if (window.SG_LAB) window.SG_LAB.setVisible(on); return; }
      if (id === "cap-empresas") { setEmpresas(on); return guardarPref(); }
      if (id === "cap-escena") { setEscena(on); return guardarPref(); }
      if (id === "cap-nom") { setNombres(on); return guardarPref(); }
      if (id === "cap-base") { setBase(e.target.value); return guardarPref(); }
      if (id === "cap-opb" || id === "cap-opc") guardarPref();
    });
    d.addEventListener("input", (e) => {
      if (e.target.id === "cap-opb") setOpBase(+e.target.value);
      if (e.target.id === "cap-opc") setOpCapas(+e.target.value);
    });
    document.addEventListener("sg:aportes", syncLab); syncLab();
    S.activosP = cargarActivos();
  }

  /* ---------- Eventos ---------- */
  /* true si el foco está en un campo donde se escribe texto (las casillas y deslizadores del panel de capas no cuentan) */
  const escribiendo = () => { const a = document.activeElement; return !!a && (a.tagName === "TEXTAREA" || a.tagName === "SELECT" || (a.tagName === "INPUT" && !/^(checkbox|radio|range|button)$/.test(a.type))); };
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".mas, #menubtn")) $$(".mas.open").forEach((m) => { m.classList.remove("open"); $(".mas-b", m).setAttribute("aria-expanded", "false"); });
    const b = e.target.closest(".min, #x, [data-k], [data-need], [data-replay], [data-zoom], #send, #pick, #reg, .mas-b, #menubtn, .dims button");
    if (!b) return;
    if (b.matches(".dims button")) {
      S.dim = b.dataset.dim;
      $$(".dims button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $$("#tags .grp").forEach((g) => { g.hidden = !!S.dim && !(g.dataset.dim || "").split(" ").includes(S.dim); });
      return;
    }
    if (b.id === "menubtn") { const o = $("#nav").classList.toggle("open"); b.setAttribute("aria-expanded", String(o)); return; }
    if (b.classList.contains("mas-b")) { const m = b.closest(".mas"), o = m.classList.toggle("open"); b.setAttribute("aria-expanded", String(o)); return; }
    if (b.dataset.k || b.dataset.need) closeMenus();
    if (b.id === "x") return closeP();
    if (b.dataset.zoom) return zoomEmp(b.dataset.zoom);
    if (b.hasAttribute("data-replay")) return showScene(S.cur);
    if (b.classList.contains("min")) { const card = b.closest(".card"); return setMin(card, !card.classList.contains("is-min")); }
    if (b.id === "send") {
      const cuerpo = `Tipo de organización: ${$("#f1").value}\nNecesidad: ${$("#f2").value}\nUbicación: ${$("#f3").value}\n\n${$("#f4").value}`;
      window.SG.track("wa/sitio/formulario"); window.open(wa("Consulta: " + $("#f2").value + "\n\n" + cuerpo, "sitio · formulario de contacto"), "_blank", "noopener"); return;
    }
    if (b.id === "pick") { S.picking = true; setMin($("#panel"), true); aviso("Toca en el mapa el punto donde está tu empresa."); return; }
    if (b.id === "reg") {
      const v = (i) => $(i).value.trim();
      if (!v("#r1") || !v("#r2") || !v("#r3")) { aviso("Completa nombre, rubro y comuna/dirección para continuar."); return; }
      const loc = S.pick ? `https://www.openstreetmap.org/?mlat=${S.pick.lat.toFixed(6)}&mlon=${S.pick.lng.toFixed(6)}#map=17/${S.pick.lat.toFixed(6)}/${S.pick.lng.toFixed(6)}\nlat/lng: ${S.pick.lat.toFixed(6)}, ${S.pick.lng.toFixed(6)}` : "por definir";
      const msg = `Hola, quiero registrar mi empresa en el mapa de Sostenibilidad Global.\n\nEmpresa: ${v("#r1")}\nRubro: ${v("#r2")}\nComuna y dirección: ${v("#r3")}\nDescripción: ${v("#r4") || "-"}\nContacto: ${v("#r5") || "-"}\nUbicación en el mapa: ${loc}`;
      window.SG.track("wa/sitio/registro"); window.open(wa(msg, "sitio · registro de empresa"), "_blank", "noopener"); return;
    }
    if (b.dataset.need) return open("contacto", b.dataset.need);
    open(b.dataset.k);
  });
  document.addEventListener("keydown", (e) => { if ((e.key === "p" || e.key === "P") && !escribiendo() && !S.emp) { togglePresent(); return; } if (e.key !== "Escape") return; if ($(".mas.open") || $("#nav.open")) { closeMenus(); return; } if ($("#panel").classList.contains("open")) closeP(); });

  /* ---------- Arranque ---------- */
  async function init() {
    try {
      const [cfg, sv, sc] = await Promise.all(["data/config.json", "data/servicios.json", "data/secciones.json"].map(getJSON));
      S.empresas = ((await getJSON("data/empresas.json").catch(() => ({ empresas: [] }))).empresas || []).filter((e) => !e.visibilidad || e.visibilidad === "publica"); /* reservadas y privadas nunca van en este archivo público */
      S.cfg = cfg; S.grupos = sv.grupos || []; S.dims = sv.dimensiones || []; S.servicios = sv.servicios || []; S.secciones = sc;
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
    buildNav(S.secciones.filter((s) => s.activo !== false).map((s) => s.enlaceDirecto
      ? { href: s.enlaceDirecto, t: s.titulo, ext: !!safeUrl(s.enlaceDirecto), p: s.principal }
      : { k: s.id, t: s.titulo, p: s.principal }));
    $("#intro-c").innerHTML = `WhatsApp <a data-ev="wa/sitio/portada" href="${esc(wa("Hola, quiero conversar con Sostenibilidad Global.", "sitio · portada"))}" target="_blank" rel="noopener">${esc(si.telefono)}</a> · <a href="mailto:${esc(si.correo)}">${esc(si.correo)}</a>`;
    const li = $("#lnk"); if (safeUrl(si.linkedin)) li.href = si.linkedin; else li.hidden = true;
    const dimBar = (S.dims || []).length ? `<div class="dims" role="group" aria-label="Dimensión de la sostenibilidad"><button type="button" data-dim="" aria-pressed="true">Todas</button>${S.dims.map((d) => `<button type="button" data-dim="${esc(d.id)}" aria-pressed="false">${esc(d.titulo)}</button>`).join("")}</div>` : "";
    $("#tags").innerHTML = dimBar + S.grupos.map((g) => {
      const items = activos().filter((s) => s.grupo === g.id);
      return items.length ? `<details class="grp" data-dim="${esc((g.dimensiones || []).join(" "))}"><summary>${esc(g.titulo)} <small>${items.length}</small></summary><div class="chips">${items.map((s) => `<button class="chip" type="button" data-k="${esc(s.id)}">${esc(s.titulo)}</button>`).join("")}</div></details>` : "";
    }).join("");
    }
    $$(".card").forEach((c) => setMin(c, false));
    if (narrow()) setMin($("#intro"), true);
    initMap();
    if (window.SG_LAB && S.map && !S.emp) window.SG_LAB.attach(labApi);
    initCapas();
    if (S.empMissing) aviso("No encontramos esa empresa. Te mostramos el mapa general.");
    const h = decodeURIComponent(location.hash.slice(1));
    if (h) open(h, null, false);
  }
  init();
})();
