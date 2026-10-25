/* Laboratorio de datos (v17): del conocimiento local a la información para la salud comunitaria.
   Cuatro herramientas sobre el mapa: 1 Mapear · 2 Calidad · 3 Cercanía · 4 Dinámica.
   Todo ocurre en el navegador: no hay servidor y no se envía ningún dato. Las funciones puras (arriba) se prueban en Node. */
(function (root) {
  "use strict";
  const RAD = Math.PI / 180;

  /* Los cinco tipos de activos del taller (los activos individuales, es decir las personas, NO se mapean) */
  const TIPOS = [
    { id: "institucional", t: "Institucional", ej: "CESFAM, escuela, municipalidad", c: "#2b6cb0" },
    { id: "social", t: "Social o comunitario", ej: "junta de vecinos, club, organización", c: "#7b4fb0" },
    { id: "fisico", t: "Físico o territorial", ej: "plaza, cancha, huerto, sendero", c: "#65a30d" },
    { id: "economico", t: "Económico", ej: "feria, almacén, taller", c: "#c2410c" },
    { id: "cultural", t: "Cultural o simbólico", ej: "sede cultural, biblioteca, sitio patrimonial", c: "#be185d" }
  ];
  const TIPO = Object.fromEntries(TIPOS.map((t) => [t.id, t]));

  /* ---------- Funciones puras ---------- */
  const hav = (a, b) => {
    const dl = (b[0] - a[0]) * RAD, dn = (b[1] - a[1]) * RAD;
    const x = Math.sin(dl / 2) ** 2 + Math.cos(a[0] * RAD) * Math.cos(b[0] * RAD) * Math.sin(dn / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(x));
  };
  const STOP = new Set(["de", "del", "la", "el", "los", "las", "y", "e"]);
  const norm = (s) => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).join(" ");
  const bigramas = (s) => { const t = " " + s + " ", m = new Map(); for (let i = 0; i < t.length - 1; i++) { const g = t.slice(i, i + 2); m.set(g, (m.get(g) || 0) + 1); } return m; };
  const dice = (a, b) => {
    if (!a || !b) return 0; if (a === b) return 1;
    const A = bigramas(a), B = bigramas(b); let inter = 0, sa = 0, sb = 0;
    A.forEach((v, k) => { sa += v; if (B.has(k)) inter += Math.min(v, B.get(k)); }); B.forEach((v) => { sb += v; });
    return (2 * inter) / (sa + sb);
  };
  /* Posibles duplicados: ubicaciones a menos de maxKm con nombres parecidos (coeficiente de Dice sobre bigramas) */
  function duplicados(items, maxKm = 0.25, umbral = 0.72) {
    const nm = items.map((i) => norm(i.nombre)), out = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      if (Math.abs(items[i].lat - items[j].lat) > maxKm / 111) continue;
      const d = hav([items[i].lat, items[i].lng], [items[j].lat, items[j].lng]);
      if (d > maxKm) continue;
      const s = dice(nm[i], nm[j]);
      if (s >= umbral) out.push({ a: items[i], b: items[j], d, s });
    }
    return out;
  }
  const mediana = (v) => { const s = v.slice().sort((a, b) => a - b), n = s.length; return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null; };
  const edadDias = (f, hoy) => { const t = Date.parse(f); return isFinite(t) ? Math.max(0, (hoy - t) / 86400000) : null; };

  /* Calidad del dato en cuatro dimensiones (completitud, unicidad, vigencia, validación). Cada una con su regla visible. */
  function calidad(items, hoy = new Date()) {
    const n = items.length;
    if (!n) return { n: 0, dims: [], dup: [] };
    const presentes = TIPOS.filter((t) => items.some((i) => i.tipoId === t.id)), faltan = TIPOS.filter((t) => !presentes.includes(t));
    const incompletos = items.filter((i) => !(i.nombre && String(i.nombre).trim().length >= 3 && isFinite(i.lat) && isFinite(i.lng))).length;
    const dup = duplicados(items);
    const edades = items.map((i) => edadDias(i.fecha, hoy)).filter((v) => v !== null), conFecha = edades.length / n, med = mediana(edades);
    const com = items.filter((i) => i.fuente !== "OSM"), validados = com.filter((i) => i.validado).length;
    const dims = [];
    dims.push({
      id: "completitud", titulo: "Completitud", nivel: presentes.length >= 4 ? "ok" : presentes.length === 3 ? "rev" : "mal",
      valor: `${presentes.length} de 5 tipos de activo con registros`,
      detalle: (faltan.length ? "Sin registros de: " + faltan.map((t) => t.t.toLowerCase()).join(", ") + "." : "Hay registros de los cinco tipos.") + (incompletos ? ` ${incompletos} registro(s) con nombre o ubicación incompletos.` : ""),
      regla: "Bien: 4 o 5 tipos. Revisar: 3. Crítico: 2 o menos."
    });
    dims.push({
      id: "unicidad", titulo: "Unicidad", nivel: dup.length === 0 ? "ok" : dup.length / n <= 0.05 ? "rev" : "mal",
      valor: dup.length === 0 ? "Sin posibles duplicados" : `${dup.length} posible(s) duplicado(s)`,
      detalle: dup.length ? dup.slice(0, 3).map((p) => `«${p.a.nombre}» ↔ «${p.b.nombre}» (${Math.round(p.d * 1000)} m)`).join("; ") + "." : "Ningún par de nombres parecidos a menos de 250 m.",
      regla: "Bien: ninguno. Revisar: hasta 5 % de los registros. Crítico: más."
    });
    let nv, valV, detV;
    if (conFecha < 0.8) { nv = "mal"; valV = `${Math.round((1 - conFecha) * 100)} % de los registros sin fecha`; detV = "Sin fecha no se puede saber si el dato sigue vigente."; }
    else { nv = med <= 180 ? "ok" : med <= 365 ? "rev" : "mal"; valV = `Antigüedad mediana: ${Math.round(med)} días`; detV = "Para los datos de OpenStreetMap la fecha es la de descarga, no la de una verificación en terreno."; }
    dims.push({ id: "vigencia", titulo: "Vigencia", nivel: nv, valor: valV, detalle: detV, regla: "Bien: hasta 180 días. Revisar: hasta 365. Crítico: más, o menos de 80 % de registros con fecha." });
    if (!com.length) dims.push({ id: "validacion", titulo: "Validación comunitaria", nivel: "na", valor: "Sin aportes de la comunidad todavía", detalle: "Lo que la comunidad confirma o corrige es lo que vuelve confiable el mapa.", regla: "Bien: 80 % validado o más. Revisar: 50 % o más. Crítico: menos." });
    else { const p = validados / com.length; dims.push({ id: "validacion", titulo: "Validación comunitaria", nivel: p >= 0.8 ? "ok" : p >= 0.5 ? "rev" : "mal", valor: `${validados} de ${com.length} aportes validados (${Math.round(p * 100)} %)`, detalle: "Un aporte está validado cuando otra persona del territorio lo confirma.", regla: "Bien: 80 % o más. Revisar: 50 % o más. Crítico: menos." }); }
    return { n, dims, dup, porFuente: { osm: n - com.length, comunidad: com.length } };
  }

  const masCercanos = (o, items, n = 3) => items.map((a) => ({ a, d: hav(o, [a.lat, a.lng]) })).sort((x, y) => x.d - y.d).slice(0, n);
  /* Porcentaje del área (rejilla paso×paso dentro de b = {s,w,n,e}) que queda a radioKm o menos de algún activo. Línea recta; sin población. */
  function coberturaPct(items, radioKm, b, paso = 60) {
    if (!items.length) return 0;
    const kmLat = 111.32, kmLng = 111.32 * Math.cos(((b.s + b.n) / 2) * RAD), r2 = radioKm * radioKm; let ok = 0;
    for (let i = 0; i < paso; i++) for (let j = 0; j < paso; j++) {
      const lat = b.s + ((i + 0.5) / paso) * (b.n - b.s), lng = b.w + ((j + 0.5) / paso) * (b.e - b.w);
      for (const a of items) { const dx = (a.lng - lng) * kmLng, dy = (a.lat - lat) * kmLat; if (dx * dx + dy * dy <= r2) { ok++; break; } }
    }
    return ok / (paso * paso);
  }

  /* Modelo dinámico (ilustrativo). Dos reservas:
       Q: vigencia del dato del mapa (0 a 1).   dQ/dt = a·(1−Q) − u·Q
       C: fracción de la población que conoce y puede usar los activos (0 a 1).   dC/dt = (c0 + r·M·Q·C)·(1−C) − d·C
     M = cobertura del mapeo; a = verificación mensual con la comunidad; u = pérdida de vigencia; r = efecto de ver y conectar los activos;
     c0 = difusión espontánea; d = olvido y recambio. Crisis: en el mes t0, C cae una fracción sev y, durante dur meses, r baja una fracción corte. */
  const MODELO_BASE = { M: 0.7, a: 0.08, u: 0.05, r: 0.5, c0: 0.02, d: 0.05, C0: 0.25, Q0: 0.9, T: 36, crisis: true, t0: 18, sev: 0.35, dur: 3, corte: 0.6 };
  function simular(p, M, a, dt = 0.05) {
    const n = Math.round(p.T / dt), idx0 = Math.round(p.t0 / dt), t = [], C = [], Q = [];
    let c = p.C0, q = p.Q0;
    const f = (c, q, tt) => {
      const rr = p.crisis && tt >= p.t0 && tt < p.t0 + p.dur ? p.r * (1 - p.corte) : p.r;
      return [(p.c0 + rr * M * q * c) * (1 - c) - p.d * c, a * (1 - q) - p.u * q];
    };
    for (let i = 0; i <= n; i++) {
      const tt = i * dt; t.push(tt); C.push(c); Q.push(q);
      if (p.crisis && i === idx0) c *= 1 - p.sev;
      const k1 = f(c, q, tt), k2 = f(c + (dt / 2) * k1[0], q + (dt / 2) * k1[1], tt + dt / 2), k3 = f(c + (dt / 2) * k2[0], q + (dt / 2) * k2[1], tt + dt / 2), k4 = f(c + dt * k3[0], q + dt * k3[1], tt + dt);
      c += (dt / 6) * (k1[0] + 2 * k2[0] + 2 * k3[0] + k4[0]); q += (dt / 6) * (k1[1] + 2 * k2[1] + 2 * k3[1] + k4[1]);
    }
    return { t, C, Q };
  }
  function metricas(s, p) {
    const at = (m) => s.C[Math.min(s.C.length - 1, Math.round(m / (s.t[1] - s.t[0])))];
    const r = { c12: at(12), fin: s.C[s.C.length - 1], pre: null, min: null, rec: null };
    if (!p.crisis) return r;
    const i0 = Math.round(p.t0 / (s.t[1] - s.t[0]));
    r.pre = s.C[i0]; r.min = Math.min(...s.C.slice(i0));
    for (let i = i0 + 1; i < s.C.length; i++) if (s.C[i] >= 0.9 * r.pre) { r.rec = s.t[i] - p.t0; break; }
    return r;
  }
  const PURE = { TIPOS, hav, norm, dice, duplicados, calidad, masCercanos, coberturaPct, MODELO_BASE, simular, metricas };
  if (typeof module !== "undefined" && module.exports) { module.exports = PURE; return; }

  /* ================= Interfaz (solo en el navegador) ================= */
  const LS = "sg-lab-v1";
  let api = null, grp = null, vis = true, items = [], tab = "mapear", pick = null, montado = false, borrarT = 0;
  const P = Object.assign({}, MODELO_BASE), F = { origen: null, filtro: "todos", radio: 2, zonas: false }, tmp = { cerc: null, zona: null };
  const EJEMPLO = [
    ["Junta de vecinos de ejemplo A", "social", -37.4560, -72.3490, "2024-03-10", true], ["J. Vecinos de ejemplo A", "social", -37.4562, -72.3492, "2023-02-01", false],
    ["Plaza de ejemplo 1", "fisico", -37.4650, -72.3600, "2024-06-01", true], ["Cancha de ejemplo 1", "fisico", -37.4750, -72.3400, "2022-05-20", false],
    ["Feria libre de ejemplo", "economico", -37.4720, -72.3560, "2025-09-15", true], ["Club de adulto mayor de ejemplo", "social", -37.4800, -72.3650, "2021-11-02", false],
    ["Biblioteca de ejemplo", "cultural", -37.4680, -72.3520, "2025-01-10", true], ["CESFAM de ejemplo", "institucional", -37.4580, -72.3700, "2025-10-01", true],
    ["Taller de música de ejemplo", "cultural", -37.4900, -72.3300, "2020-08-14", false], ["Huerto comunitario de ejemplo", "fisico", -37.4400, -72.3300, "2025-05-05", true]
  ];
  const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hoyISO = () => new Date().toISOString().slice(0, 10);
  const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const notificar = () => document.dispatchEvent(new CustomEvent("sg:aportes"));

  function guardar() { try { localStorage.setItem(LS, JSON.stringify({ items, vis })); } catch (e) { /* sin almacenamiento: funciona igual, no recuerda */ } }
  function cargar() {
    try {
      const j = JSON.parse(localStorage.getItem(LS) || "null");
      if (j && Array.isArray(j.items)) items = j.items.filter((i) => i && TIPO[i.tipo] && isFinite(i.lat) && isFinite(i.lng) && typeof i.nombre === "string").slice(0, 500);
      if (j && typeof j.vis === "boolean") vis = j.vis;
    } catch (e) { items = []; }
  }
  /* Todos los activos conocidos con una misma forma: los de OpenStreetMap y los aportes de la comunidad */
  function osmItems() {
    const S = api.S, MAP = { "Centro comunitario": "social", "Servicio social": "institucional", "Municipalidad": "institucional", "Biblioteca": "cultural" };
    return (S.activos || []).map((a) => ({ nombre: a.nombre, tipoId: a.grupo === "salud" ? "institucional" : MAP[a.tipo] || "institucional", detalle: a.tipo, esSalud: a.grupo === "salud", fuente: "OSM", lat: a.lat, lng: a.lng, fecha: S.activosActualizado || "", validado: null }));
  }
  const comItems = () => items.map((i) => ({ nombre: i.nombre, tipoId: i.tipo, detalle: TIPO[i.tipo].t, esSalud: false, fuente: i.ej ? "EJEMPLO" : "Comunidad", lat: i.lat, lng: i.lng, fecha: i.fecha, validado: !!i.validado }));
  const todos = () => osmItems().concat(comItems());

  function dibujar() {
    if (!grp) return;
    grp.clearLayers();
    items.forEach((i) => {
      const t = TIPO[i.tipo];
      L.circleMarker([i.lat, i.lng], { radius: 8, color: i.validado ? "#14231d" : "#fff", weight: i.validado ? 3 : 2, fillColor: t.c, fillOpacity: i.ej ? 0.6 : 1, dashArray: i.ej ? "3 3" : null })
        .bindPopup(`<b>${esc(i.nombre)}</b><br><small>${esc(t.t)} · ${i.ej ? "EJEMPLO ficticio" : "aporte de la comunidad"}</small><br><small>${i.validado ? "✓ validado por la comunidad" : "sin validar"} · ${esc(i.fecha)}</small>`).addTo(grp);
    });
  }
  function setVisible(on) {
    vis = !!on;
    if (grp && api.S.map) { if (vis) grp.addTo(api.S.map); else api.S.map.removeLayer(grp); }
    guardar(); notificar();
  }

  /* ---------- HTML del panel ---------- */
  const CAMPOS = [
    { k: "M", t: "Cobertura del mapeo", u: "%", f: 100, min: 0, max: 100, step: 5, main: 1 },
    { k: "a", t: "Verificación mensual con la comunidad", u: "% del mapa por mes", f: 100, min: 0, max: 15, step: 1, main: 1 },
    { k: "u", t: "Pérdida de vigencia del dato", u: "% por mes", f: 100, min: 0, max: 20, step: 1 },
    { k: "r", t: "Efecto de ver y conectar los activos", u: "por mes", f: 1, min: 0, max: 2, step: 0.1 },
    { k: "c0", t: "Difusión espontánea", u: "% por mes", f: 100, min: 0, max: 10, step: 0.5 },
    { k: "d", t: "Olvido y recambio de personas", u: "% por mes", f: 100, min: 1, max: 20, step: 1 },
    { k: "C0", t: "Población que ya conoce los activos (mes 0)", u: "%", f: 100, min: 0, max: 100, step: 5 },
    { k: "t0", t: "Mes de la crisis", u: "mes", f: 1, min: 6, max: 30, step: 1 },
    { k: "sev", t: "Pérdida inmediata por la crisis", u: "%", f: 100, min: 0, max: 80, step: 5 },
    { k: "dur", t: "Duración de la interrupción", u: "meses", f: 1, min: 0, max: 12, step: 1 },
    { k: "corte", t: "Caída de las conexiones durante la interrupción", u: "%", f: 100, min: 0, max: 100, step: 10 }
  ];
  function html() {
    const tabs = [["mapear", "1 · Mapear"], ["calidad", "2 · Calidad"], ["cercania", "3 · Cercanía"], ["dinamica", "4 · Dinámica"]];
    const main = CAMPOS.filter((c) => c.main).map((c) => `<label for="mod-${c.k}">${esc(c.t)}: <output id="mod-${c.k}-o"></output></label><input type="range" id="mod-${c.k}" data-mod="${c.k}" min="${c.min}" max="${c.max}" step="${c.step}">`).join("");
    const adv = CAMPOS.filter((c) => !c.main).map((c) => `<label for="mod-${c.k}">${esc(c.t)} <small>(${esc(c.u)})</small></label><input type="number" id="mod-${c.k}" data-mod="${c.k}" min="${c.min}" max="${c.max}" step="${c.step}">`).join("");
    return `<span class="ey">De la información local a la decisión</span>
<p class="lead">Cuatro herramientas para pasar del conocimiento del territorio a información útil para la salud comunitaria.</p>
<div id="lab" class="lab">
<div class="lab-tabs" role="tablist" aria-label="Herramientas del laboratorio">${tabs.map(([k, t]) => `<button type="button" role="tab" id="t-${k}" data-tab="${k}" aria-selected="${k === "mapear"}" aria-controls="p-${k}">${t}</button>`).join("")}</div>

<section id="p-mapear" role="tabpanel" aria-labelledby="t-mapear">
<p class="lab-sub"><b>Significatividad.</b> La comunidad pone nombre y lugar a lo que ya tiene: cartografía social que se vuelve dato georreferenciado.</p>
<label for="lab-nombre">Nombre del activo</label><input id="lab-nombre" maxlength="80" autocomplete="off" placeholder="Ej.: cancha del sector, junta de vecinos, feria…">
<label for="lab-tipo">Tipo de activo</label><select id="lab-tipo">${TIPOS.map((t) => `<option value="${t.id}">${esc(t.t)} · ${esc(t.ej)}</option>`).join("")}</select>
<div class="acts"><button class="btn" type="button" id="lab-pick">📍 Marcar en el mapa</button><button class="btn alt" type="button" id="lab-ej">Cargar ejemplo con errores</button></div>
<p class="nota" id="lab-msg" role="status"></p>
<ul class="lab-list" id="lab-list"></ul>
<div class="acts"><button class="btn alt" type="button" id="lab-gj">GeoJSON</button><button class="btn alt" type="button" id="lab-csv">CSV</button><button class="btn alt" type="button" id="lab-clear">Vaciar</button></div>
<p class="nota">Solo lugares, organizaciones e instituciones: no registres personas ni domicilios. Los datos quedan en este navegador y no se envían a ningún servidor.</p>
</section>

<section id="p-calidad" role="tabpanel" aria-labelledby="t-calidad" hidden>
<p class="lab-sub"><b>Comprensibilidad.</b> Solo un dato confiable permite entender el territorio. La calidad se mide, no se supone.</p>
<div id="cal-res"></div>
<p class="nota">Cada tarjeta muestra su regla. La precisión de la ubicación y la exactitud del tipo solo se verifican en terreno, con la comunidad.</p>
</section>

<section id="p-cercania" role="tabpanel" aria-labelledby="t-cercania" hidden>
<p class="lab-sub"><b>Manejabilidad.</b> ¿Qué recursos hay a mano? Es la base de la prescripción social: conectar a una persona con un activo cercano.</p>
<label for="cer-filtro">Buscar</label><select id="cer-filtro"><option value="todos">Todos los activos</option><option value="salud">Salud (OpenStreetMap)</option>${TIPOS.map((t) => `<option value="${t.id}">${esc(t.t)}</option>`).join("")}</select>
<label for="cer-radio">Radio: <output id="cer-radio-o"></output></label><input type="range" id="cer-radio" min="0.5" max="10" step="0.5">
<div class="acts"><button class="btn" type="button" id="cer-pick">📍 Elegir un sector del mapa</button></div>
<label class="chk"><input type="checkbox" id="cer-zonas"> Mostrar zonas de cobertura</label>
<div id="cer-res" role="status"></div>
<p class="nota">Elige un barrio o sector, no un domicilio. Las distancias son en línea recta: no consideran calles, transporte ni horarios.</p>
</section>

<section id="p-dinamica" role="tabpanel" aria-labelledby="t-dinamica" hidden>
<p class="lab-sub"><b>La salud se re-crea constantemente, y el mapa también.</b> ¿Qué pasa con el tiempo y ante una crisis?</p>
${main}
<label class="chk"><input type="checkbox" id="mod-crisis" data-mod="crisis"> Simular una crisis (corte de servicios, temporal)</label>
<svg id="mod-svg" viewBox="0 0 400 230" role="img" aria-label="Gráfico de la simulación"></svg>
<div id="mod-leg" class="mod-leg"></div>
<div id="mod-tab"></div>
<details><summary>Supuestos y ecuaciones</summary>
<pre class="eq">dQ/dt = a·(1−Q) − u·Q
dC/dt = (c₀ + r·M·Q·C)·(1−C) − d·C</pre>
<p class="nota">Q: vigencia del dato (0 a 1). C: fracción de la población que conoce y puede usar los activos. M: cobertura del mapeo. a: verificación mensual con la comunidad. u: pérdida de vigencia. r: efecto de ver y conectar los activos. c₀: difusión espontánea. d: olvido y recambio. Integración de Runge-Kutta de cuarto orden, paso de 0,05 mes.</p>
${adv}
<div class="acts"><button class="btn alt" type="button" id="mod-reset">Volver a los valores iniciales</button></div></details>
<p class="nota">Modelo ilustrativo, no calibrado con datos reales. Sirve para conversar qué tendría que ser cierto para que mapear valga la pena, no para predecir.</p>
</section>
</div>`;
  }

  /* ---------- Pestañas ---------- */
  function setTab(k) {
    tab = k;
    $$("#lab [role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === k)));
    $$("#lab [role=tabpanel]").forEach((p) => { p.hidden = p.id !== "p-" + k; });
    cancelarPick(); limpiarCerc();
    if (k === "calidad") renderCalidad(); if (k === "cercania") renderCercania(); if (k === "dinamica") renderModelo();
  }

  /* ---------- 1 · Mapear ---------- */
  const msg = (t, malo) => { const m = $("#lab-msg"); if (m) { m.textContent = t || ""; m.classList.toggle("err", !!malo); } };
  function renderLista() {
    const ul = $("#lab-list"); if (!ul) return;
    ul.innerHTML = items.length ? items.slice().reverse().map((i) => `<li><span class="lab-dot" style="background:${TIPO[i.tipo].c}"></span><span class="lab-n"><b>${esc(i.nombre)}</b><br><small>${esc(TIPO[i.tipo].t)} · ${i.ej ? "ejemplo ficticio" : "comunidad"} · ${esc(i.fecha)}</small></span>
      <button type="button" class="lab-b" data-zoom="${esc(i.id)}" aria-label="Ver en el mapa" title="Ver en el mapa">⌖</button>
      <button type="button" class="lab-b${i.validado ? " on" : ""}" data-val="${esc(i.id)}" aria-pressed="${!!i.validado}" title="Validado por la comunidad">${i.validado ? "✓ validado" : "validar"}</button>
      <button type="button" class="lab-b" data-del="${esc(i.id)}" aria-label="Eliminar ${esc(i.nombre)}" title="Eliminar">×</button></li>`).join("") : `<li class="vacio">Aún no hay aportes. Escribe un nombre, elige el tipo y márcalo en el mapa.</li>`;
  }
  function iniciarPick(tipo) {
    if (!api.S.map) return;
    pick = tipo; api.S.picking = false;
    if (api.narrow()) api.setMin(api.$("#panel"), true);
    api.aviso(tipo === "activo" ? `Toca en el mapa el lugar de «${$("#lab-nombre").value.trim()}».` : "Toca en el mapa el barrio o sector de partida.");
  }
  function cancelarPick() { if (pick) { pick = null; api.avisoOff(); } }
  function pickMapa(ev) {
    if (!pick || api.S.picking) return;
    const tipoPick = pick; pick = null; api.avisoOff(); if (api.narrow()) api.setMin(api.$("#panel"), false);
    if (tipoPick === "activo") agregar(ev.latlng.lat, ev.latlng.lng); else elegirOrigen(ev.latlng.lat, ev.latlng.lng);
  }
  function agregar(lat, lng) {
    const nombre = ($("#lab-nombre").value || "").trim(), tipo = $("#lab-tipo").value;
    if (nombre.length < 3 || !TIPO[tipo]) return msg("Escribe un nombre de al menos 3 letras.", true);
    if (!(lat > -56 && lat < -17 && lng > -76 && lng < -66)) return msg("Ese punto queda fuera de Chile. Intenta de nuevo.", true);
    items.push({ id: nuevoId(), nombre: nombre.slice(0, 80), tipo, lat: +lat.toFixed(6), lng: +lng.toFixed(6), fecha: hoyISO(), validado: false, ej: false });
    $("#lab-nombre").value = ""; guardar(); dibujar(); renderLista(); msg(`Agregado: «${nombre}». ${items.length} aporte(s) en total.`); notificar();
    if (!vis) setVisible(true);
    $("#lab-nombre").focus();
  }
  function cargarEjemplo() {
    items = items.filter((i) => !i.ej);
    EJEMPLO.forEach(([nombre, tipo, lat, lng, fecha, v]) => items.push({ id: nuevoId(), nombre, tipo, lat, lng, fecha, validado: v, ej: true }));
    guardar(); dibujar(); renderLista(); notificar(); if (!vis) setVisible(true);
    msg("Cargados 10 registros ficticios con errores a propósito: un duplicado, datos antiguos y varios sin validar. Mira la pestaña Calidad.");
    api.fit(L.latLngBounds(EJEMPLO.map((e) => [e[2], e[3]])).pad(0.3));
  }
  function descargar(nombre, mime, texto) {
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([texto], { type: mime })); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  const csvCel = (v) => { let s = String(v == null ? "" : v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  function exportar(fmt) {
    if (!items.length) return msg("No hay aportes que exportar.", true);
    const f = hoyISO();
    if (fmt === "geojson") {
      const fc = { type: "FeatureCollection", features: items.map((i) => ({ type: "Feature", geometry: { type: "Point", coordinates: [i.lng, i.lat] }, properties: { nombre: i.nombre, tipo: TIPO[i.tipo].t, fuente: i.ej ? "EJEMPLO ficticio" : "comunidad", fecha: i.fecha, validado: !!i.validado } })) };
      descargar(`aportes-comunidad-${f}.geojson`, "application/geo+json", JSON.stringify(fc, null, 2));
    } else {
      const filas = [["nombre", "tipo", "latitud", "longitud", "fuente", "fecha", "validado"]].concat(items.map((i) => [i.nombre, TIPO[i.tipo].t, i.lat, i.lng, i.ej ? "EJEMPLO ficticio" : "comunidad", i.fecha, i.validado ? "sí" : "no"]));
      descargar(`aportes-comunidad-${f}.csv`, "text/csv;charset=utf-8", "﻿" + filas.map((r) => r.map(csvCel).join(",")).join("\r\n"));
    }
    msg("Archivo descargado.");
  }
  function vaciar(btn) {
    if (!items.length) return msg("No hay nada que vaciar.");
    if (Date.now() - borrarT > 4000) { borrarT = Date.now(); btn.textContent = "¿Seguro? Pulsa de nuevo"; setTimeout(() => { if (btn.isConnected) btn.textContent = "Vaciar"; }, 4000); return; }
    items = []; borrarT = 0; btn.textContent = "Vaciar"; guardar(); dibujar(); renderLista(); notificar(); msg("Se vació la capa de la comunidad.");
  }

  /* ---------- 2 · Calidad ---------- */
  function renderCalidad() {
    const box = $("#cal-res"); if (!box) return;
    const S = api.S, q = calidad(todos());
    if (!S.activosListos && !items.length) { box.innerHTML = `<p class="nota">Cargando los activos de OpenStreetMap…</p>`; if (S.activosP) S.activosP.then(() => { if (tab === "calidad") renderCalidad(); }); return; }
    if (!q.n) { box.innerHTML = `<p class="nota">No hay datos todavía. Agrega aportes en «Mapear» o carga el ejemplo con errores.</p>`; return; }
    const ICO = { ok: "✓ Bien", rev: "! Revisar", mal: "✕ Crítico", na: "– Sin datos" };
    box.innerHTML = `<p class="nota"><b>${q.n}</b> registros: ${q.porFuente.osm} de OpenStreetMap y ${q.porFuente.comunidad} de la comunidad.</p>` +
      q.dims.map((d) => `<div class="cal-card n-${d.nivel}"><div class="cal-h"><b>${esc(d.titulo)}</b><span class="cal-e">${ICO[d.nivel]}</span></div><div>${esc(d.valor)}</div><small>${esc(d.detalle)}</small><small class="regla">Regla: ${esc(d.regla)}</small></div>`).join("");
  }

  /* ---------- 3 · Cercanía ---------- */
  const filtrados = () => todos().filter((a) => F.filtro === "todos" || (F.filtro === "salud" ? a.esSalud : a.tipoId === F.filtro));
  function limpiarCerc() { ["cerc", "zona"].forEach((k) => { if (tmp[k] && api.S.map) api.S.map.removeLayer(tmp[k]); tmp[k] = null; }); F.origen = null; }
  const fmtKm = (d) => (d < 1 ? Math.round(d * 1000) + " m" : d.toFixed(1).replace(".", ",") + " km");
  function elegirOrigen(lat, lng) { F.origen = [lat, lng]; renderCercania(); }
  function renderCercania() {
    const res = $("#cer-res"); if (!res) return;
    $("#cer-radio-o").textContent = String(F.radio).replace(".", ",") + " km"; $("#cer-radio").value = F.radio; $("#cer-filtro").value = F.filtro; $("#cer-zonas").checked = F.zonas;
    const map = api.S.map, lista = filtrados();
    ["cerc", "zona"].forEach((k) => { if (tmp[k] && map) map.removeLayer(tmp[k]); tmp[k] = null; });
    let h = "";
    if (!lista.length) { res.innerHTML = `<p class="nota">No hay activos de ese tipo cargados. Agrega aportes en «Mapear» o espera a que carguen los de OpenStreetMap.</p>`; return; }
    if (F.zonas && map) {
      tmp.zona = L.layerGroup(lista.map((a) => L.circle([a.lat, a.lng], { radius: F.radio * 1000, stroke: false, fillColor: "#1f6b4a", fillOpacity: 0.1, interactive: false }))).addTo(map);
      const b = map.getBounds(), pct = coberturaPct(lista, F.radio, { s: b.getSouth(), w: b.getWest(), n: b.getNorth(), e: b.getEast() });
      h += `<div class="cal-card n-${pct >= 0.8 ? "ok" : pct >= 0.5 ? "rev" : "mal"}"><div class="cal-h"><b>Cobertura del área visible</b><span class="cal-e">${Math.round(pct * 100)} %</span></div><small>Esa parte del mapa que se ve ahora queda a ${String(F.radio).replace(".", ",")} km o menos de algún activo. No considera población: sin saber dónde vive la gente, no es un indicador de acceso.</small></div>`;
    }
    if (F.origen && map) {
      const cerca = masCercanos(F.origen, lista, 3), dentro = lista.filter((a) => hav(F.origen, [a.lat, a.lng]) <= F.radio);
      const g = L.layerGroup().addTo(map); tmp.cerc = g;
      L.circle(F.origen, { radius: F.radio * 1000, color: "#14231d", weight: 2, dashArray: "6 6", fillOpacity: 0.04, interactive: false }).addTo(g);
      cerca.forEach((o) => L.polyline([F.origen, [o.a.lat, o.a.lng]], { color: "#c2410c", weight: 2.5, dashArray: "5 6" }).addTo(g));
      L.circleMarker(F.origen, { radius: 8, color: "#fff", weight: 3, fillColor: "#14231d", fillOpacity: 1 }).bindTooltip("Sector de partida", { permanent: true, direction: "top", offset: [0, -8] }).addTo(g);
      const porTipo = {}; dentro.forEach((a) => { porTipo[TIPO[a.tipoId].t] = (porTipo[TIPO[a.tipoId].t] || 0) + 1; });
      h += `<div class="cal-card n-${dentro.length ? "ok" : "mal"}"><div class="cal-h"><b>A ${String(F.radio).replace(".", ",")} km o menos</b><span class="cal-e">${dentro.length} activo(s)</span></div><small>${dentro.length ? Object.keys(porTipo).map((t) => `${porTipo[t]} ${esc(t.toLowerCase())}`).join(", ") + "." : "Ninguno en ese radio: aquí está la brecha."}</small></div>`;
      h += `<ol class="cer-lista">${cerca.map((o) => `<li><b>${esc(o.a.nombre)}</b><br><small>${esc(o.a.detalle)} · ${esc(o.a.fuente)} · ${fmtKm(o.d)} en línea recta · unos ${Math.max(1, Math.round((o.d / 5) * 60))} min a pie (referencial)</small></li>`).join("")}</ol>`;
      map.panTo(F.origen, { animate: true });
    } else h += `<p class="nota">Elige un sector del mapa para ver los tres activos más cercanos.</p>`;
    res.innerHTML = h;
  }

  /* ---------- 4 · Dinámica ---------- */
  const COL = { sin: "#6b7280", mal: "#c2410c", bien: "#1f6b4a" };
  function renderModelo() {
    const svg = $("#mod-svg"); if (!svg) return;
    CAMPOS.forEach((c) => { const el = $("#mod-" + c.k); if (el && document.activeElement !== el) el.value = Math.round(P[c.k] * c.f * 100) / 100; const o = $("#mod-" + c.k + "-o"); if (o) o.textContent = Math.round(P[c.k] * c.f * 10) / 10 + " " + c.u; });
    $("#mod-crisis").checked = P.crisis;
    const S = [["Sin mapa digital", simular(P, 0, 0), "sin", "2 4"], ["Mapa hecho una vez, sin mantención", simular(P, P.M, 0), "mal", "7 4"], ["Mapa verificado con la comunidad", simular(P, P.M, P.a), "bien", ""]];
    const W = 400, H = 230, l = 38, r = 10, t = 12, b = 30, x = (m) => l + (m / P.T) * (W - l - r), y = (v) => t + (1 - v) * (H - t - b);
    let g = "";
    [0, 0.25, 0.5, 0.75, 1].forEach((v) => { g += `<line x1="${l}" x2="${W - r}" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" opacity=".13"/><text x="${l - 5}" y="${y(v) + 3.5}" text-anchor="end" font-size="9.5" fill="currentColor" opacity=".7">${v * 100}</text>`; });
    for (let m = 0; m <= P.T; m += 6) g += `<text x="${x(m)}" y="${H - 14}" text-anchor="middle" font-size="9.5" fill="currentColor" opacity=".7">${m}</text>`;
    g += `<text x="${(l + W - r) / 2}" y="${H - 2}" text-anchor="middle" font-size="9.5" fill="currentColor" opacity=".7">meses</text><text transform="translate(9 ${(t + H - b) / 2}) rotate(-90)" text-anchor="middle" font-size="9.5" fill="currentColor" opacity=".7">% que conoce y puede usar los activos</text>`;
    if (P.crisis) g += `<rect x="${x(P.t0)}" y="${t}" width="${Math.max(1, x(Math.min(P.T, P.t0 + P.dur)) - x(P.t0))}" height="${H - t - b}" fill="#b91c1c" opacity=".1"/><line x1="${x(P.t0)}" x2="${x(P.t0)}" y1="${t}" y2="${H - b}" stroke="#b91c1c" stroke-dasharray="3 3"/><text x="${x(P.t0) + 3}" y="${t + 9}" font-size="9.5" fill="#b91c1c">crisis</text>`;
    S.forEach(([n, s, c, d]) => { g += `<polyline fill="none" stroke="${COL[c]}" stroke-width="${c === "bien" ? 2.8 : 2}" ${d ? `stroke-dasharray="${d}"` : ""} points="${s.t.filter((_, i) => i % 4 === 0).map((tt, i) => `${x(tt).toFixed(1)},${y(s.C[i * 4]).toFixed(1)}`).join(" ")}"/>`; });
    svg.innerHTML = g;
    const M = S.map(([n, s]) => metricas(s, P));
    svg.setAttribute("aria-label", `Simulación a ${P.T} meses. A los 36 meses conoce y puede usar los activos: ${Math.round(M[0].fin * 100)} % sin mapa, ${Math.round(M[1].fin * 100)} % con un mapa sin mantención y ${Math.round(M[2].fin * 100)} % con un mapa verificado con la comunidad.`);
    $("#mod-leg").innerHTML = S.map(([n, , c, d]) => `<span><svg width="26" height="8" aria-hidden="true"><line x1="0" x2="26" y1="4" y2="4" stroke="${COL[c]}" stroke-width="3" ${d ? `stroke-dasharray="${d}"` : ""}/></svg> ${esc(n)}</span>`).join("");
    const pc = (v) => (v == null ? "–" : Math.round(v * 100) + " %"), rec = (v) => (!P.crisis ? "–" : v == null ? "no se recupera" : String(Math.round(v * 10) / 10).replace(".", ",") + " meses");
    $("#mod-tab").innerHTML = `<table class="mod-t"><thead><tr><th></th><th>Mes 12</th><th>Mínimo tras la crisis</th><th>Mes ${P.T}</th><th>Recupera 90 %</th></tr></thead><tbody>${S.map(([n], i) => `<tr><th scope="row">${esc(n)}</th><td>${pc(M[i].c12)}</td><td>${pc(M[i].min)}</td><td>${pc(M[i].fin)}</td><td>${rec(M[i].rec)}</td></tr>`).join("")}</tbody></table>`;
  }

  /* ---------- Montaje y eventos ---------- */
  function mount() {
    montado = true; const lab = $("#lab"); if (!lab) return;
    if (api.S.activosListos) { api.setCapa("salud", true, true); api.setCapa("comunidad", true, true); }
    if (!vis) setVisible(true);
    lab.addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.dataset.tab) return setTab(b.dataset.tab);
      if (b.id === "lab-pick") { const n = $("#lab-nombre").value.trim(); if (n.length < 3) { msg("Escribe primero un nombre de al menos 3 letras.", true); return $("#lab-nombre").focus(); } msg(""); return iniciarPick("activo"); }
      if (b.id === "lab-ej") return cargarEjemplo();
      if (b.id === "lab-gj") return exportar("geojson");
      if (b.id === "lab-csv") return exportar("csv");
      if (b.id === "lab-clear") return vaciar(b);
      if (b.id === "cer-pick") return iniciarPick("origen");
      if (b.id === "mod-reset") { Object.assign(P, MODELO_BASE); return renderModelo(); }
      const id = b.dataset.val || b.dataset.del || b.dataset.zoom, it = items.find((i) => i.id === id);
      if (!it) return;
      if (b.dataset.val) { it.validado = !it.validado; guardar(); dibujar(); renderLista(); }
      else if (b.dataset.del) { items = items.filter((i) => i !== it); guardar(); dibujar(); renderLista(); notificar(); }
      else { api.S.map.setView([it.lat, it.lng], Math.max(api.S.map.getZoom(), 15)); }
    });
    lab.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.id === "lab-nombre") { e.preventDefault(); $("#lab-pick").click(); } });
    lab.addEventListener("input", (e) => {
      const el = e.target;
      if (el.dataset.mod && el.type !== "checkbox") { const c = CAMPOS.find((x) => x.k === el.dataset.mod), v = parseFloat(el.value); if (c && isFinite(v)) { P[c.k] = Math.min(c.max, Math.max(c.min, v)) / c.f; renderModelo(); } }
      if (el.id === "cer-radio") { F.radio = parseFloat(el.value); renderCercania(); }
    });
    lab.addEventListener("change", (e) => {
      const el = e.target;
      if (el.id === "mod-crisis") { P.crisis = el.checked; renderModelo(); }
      if (el.id === "cer-filtro") { F.filtro = el.value; renderCercania(); }
      if (el.id === "cer-zonas") { F.zonas = el.checked; renderCercania(); }
    });
    renderLista(); setTab("mapear");
  }
  function attach(a) {
    api = a; cargar();
    if (api.S.map) { grp = L.layerGroup(); if (vis) grp.addTo(api.S.map); dibujar(); api.S.map.on("click", pickMapa); }
    notificar();
  }
  function cancel() { if (!api) return; cancelarPick(); limpiarCerc(); montado = false; }

  root.SG_LAB = { html, mount, attach, cancel, setVisible, visible: () => vis, count: () => items.length, points: () => items.map((i) => [i.lat, i.lng]), pure: PURE };
})(typeof window !== "undefined" ? window : globalThis);
