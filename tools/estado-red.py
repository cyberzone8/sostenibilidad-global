#!/usr/bin/env python3
"""Estado de los efectos de red del sitio. Es un informe PARA LA PERSONA ADMINISTRADORA: no se publica en el sitio.

Qué calcula (solo con la biblioteca estándar de Python):
  1. Conexiones: qué eslabones del circuito de aportes están conectados (formulario, hoja CSV, Aprobado, contador, Comunidad).
  2. Ley de Metcalfe: n(n-1)/2 conexiones posibles entre n personas, y el techo de la red n0/(1-K).
  3. Aportes reales (si hay enlace CSV): totales, aprobados, pendientes, confirmaciones, origen y comuna.
  4. DSM (matriz de estructura de diseño): matriz, número de bucles, cuellos de botella y dependencia de la administración.
  5. Llamados a la acción (CTA) del código: cuántos van al WhatsApp personal, a la Comunidad, a Aporta o al formulario.
  6. Un índice de red de 0 a 100 con pesos visibles, y los tres pasos que más lo suben.

Uso en tu computador:   python3 tools/estado-red.py --miembros 40
Uso en GitHub:          Actions → «Estado de la red (privado)» → Run workflow (ver README).
"""
import argparse, csv, io, json, math, os, re, smtplib, ssl, sys, unicodedata, urllib.request
from collections import Counter
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
TOPE_BUCLES = 200000


def cargar(nombre, defecto=None):
    try:
        return json.loads((RAIZ / "data" / nombre).read_text(encoding="utf-8"))
    except Exception:
        return defecto if defecto is not None else {}


def norm(t):
    t = unicodedata.normalize("NFD", str(t or ""))
    t = "".join(c for c in t if unicodedata.category(c) != "Mn").lower()
    return re.sub(r"\s+", " ", re.sub(r"[^a-z0-9 ]", " ", t)).strip()


def https(u):
    return bool(re.match(r"^https://", u or "", re.I))


def metros(a, b):
    r = math.pi / 180
    dl, dn = (b[0] - a[0]) * r, (b[1] - a[1]) * r
    x = math.sin(dl / 2) ** 2 + math.cos(a[0] * r) * math.cos(b[0] * r) * math.sin(dn / 2) ** 2
    return 12742000 * math.asin(math.sqrt(x))


def num(v):
    try:
        return float(str(v or "").strip().replace(",", "."))
    except ValueError:
        return float("nan")


# ---------------------------------------------------------------- aportes (hoja de respuestas)
def leer_csv(texto):
    """Misma lógica que assets/js/red.js: columnas Tipo, Nombre, Descripción, Latitud, Longitud, Aprobado, Origen."""
    filas = list(csv.reader(io.StringIO(texto)))
    if len(filas) < 2:
        return [], False
    H = [norm(h) for h in filas[0]]

    def col(*k):
        for i, h in enumerate(H):
            if any(h.startswith(x) for x in k):
                return i
        return -1

    iT, iN, iD = col("tipo"), col("nombre"), col("descripcion", "detalle")
    iLa, iLo, iA, iO = col("latitud", "lat"), col("longitud", "lng", "long"), col("aprobado"), col("origen")
    if iLa < 0 or iLo < 0:
        return [], iA >= 0
    g = lambda r, i: str(r[i]) if 0 <= i < len(r) else ""
    out = []
    for r in filas[1:]:
        la, lo = num(g(r, iLa)), num(g(r, iLo))
        if not (-39.5 < la < -35.5 and -74.5 < lo < -70.5):
            continue
        out.append({"tipo": norm(g(r, iT)), "nombre": g(r, iN)[:80], "desc": g(r, iD), "lat": la, "lng": lo,
                    "origen": norm(g(r, iO)).replace(" ", "-")[:40] or "directo",
                    "aprobado": norm(g(r, iA)) in ("si", "ok", "x", "1", "true", "aprobado", "yes")})
    return out, iA >= 0


def resolver(filas):
    es_conf = lambda d: bool(re.match(r"^confirm", norm(d)))
    es_corr = lambda d: bool(re.match(r"^corrig|^correc", norm(d)))
    base = [dict(f, confirm=0, correc=0) for f in filas if not es_conf(f["desc"]) and not es_corr(f["desc"])]
    inter = [f for f in filas if es_conf(f["desc"]) or es_corr(f["desc"])]
    ligadas = 0
    for v in inter:
        cand = sorted(((metros((b["lat"], b["lng"]), (v["lat"], v["lng"])), b) for b in base), key=lambda c: c[0])
        cand = [c for c in cand if c[0] <= 60]
        if not cand:
            continue
        b = cand[0][1]
        ligadas += 1
        if es_conf(v["desc"]):
            b["confirm"] += 1
        else:
            b["correc"] += 1
    return base, inter, ligadas


def cargar_aportes(cfg, archivo=None):
    """Devuelve (base, interacciones, hay_columna_aprobado, estado). estado: ok | sin-enlace | error."""
    url = ((cfg.get("aportes") or {}).get("csvUrl")) or ""
    try:
        if archivo:
            texto = Path(archivo).read_text(encoding="utf-8-sig")
        elif https(url):
            req = urllib.request.Request(url, headers={"User-Agent": "estado-red/1.0"})
            texto = urllib.request.urlopen(req, timeout=25).read().decode("utf-8-sig")
        else:
            return [], [], False, "sin-enlace"
    except Exception as e:
        return [], [], False, "error: " + str(e)[:80]
    filas, aprob = leer_csv(texto)
    base, inter, _ = resolver(filas)
    return base, inter, aprob, "ok"


# ---------------------------------------------------------------- condiciones del circuito
def condiciones(cfg, aportes_estado, hay_aprobado):
    f = cfg.get("formularios") or {}
    campos = f.get("aporteCampos") or {}
    return {
        "formulario_aporte": bool(re.match(r"^https://docs\.google\.com/forms/", f.get("aporte") or "", re.I)),
        "csv_aportes": aportes_estado == "ok",
        "aprobado_col": bool(hay_aprobado),
        "contador": bool((cfg.get("contador") or {}).get("goatcounter")),
        "comunidad": https((cfg.get("comunidad") or {}).get("url")),
        "sitio_url": https((cfg.get("sitio") or {}).get("url")),
        "prellenado": all(re.match(r"^entry\.\d+$", campos.get(k, "")) for k in ("lat", "lng")),
    }


NOMBRE_COND = {
    "formulario_aporte": "Formulario de aportes (config.json → formularios.aporte)",
    "csv_aportes": "Hoja publicada como CSV (config.json → aportes.csvUrl)",
    "aprobado_col": "Columna «Aprobado» en la hoja",
    "contador": "Contador de visitas (config.json → contador.goatcounter)",
    "comunidad": "Enlace de la Comunidad de WhatsApp (config.json → comunidad.url)",
    "sitio_url": "Dirección pública del sitio (config.json → sitio.url)",
    "prellenado": "Punto del mapa prellenado en el formulario (formularios.aporteCampos lat y lng)",
}
PASO_COND = {
    "csv_aportes": "Publica la hoja de respuestas como CSV y pega el enlace en aportes.csvUrl: sin eso el mapa en vivo y la verificación entre pares no se activan.",
    "aprobado_col": "Agrega la columna «Aprobado» a la hoja y escribe SI en los aportes que quieras mostrar.",
    "contador": "Crea la cuenta en goatcounter.com y escribe el código en contador.goatcounter: sin medición no puedes manejar los bucles.",
    "prellenado": "Copia los códigos entry.… de latitud y longitud en formularios.aporteCampos para que el formulario traiga el punto marcado.",
    "sitio_url": "Escribe la dirección pública del sitio en sitio.url (QR, sitemap y enlaces para compartir).",
    "comunidad": "Pon el enlace de la Comunidad en comunidad.url: es lo que descarga tu WhatsApp personal.",
    "formulario_aporte": "Pega el enlace del formulario en formularios.aporte.",
}


# ---------------------------------------------------------------- DSM y bucles
def grafo(aristas, quitar=None):
    g = {}
    for e in aristas:
        if quitar in (e["de"], e["a"]):
            continue
        g.setdefault(e["de"], set()).add(e["a"])
    return {k: sorted(v) for k, v in g.items()}


def bucles(g):
    """Todos los ciclos simples (cada uno una vez, empezando por su nodo menor)."""
    res = []

    def dfs(inicio, actual, ruta):
        if len(res) >= TOPE_BUCLES:
            return
        for sig in g.get(actual, []):
            if sig == inicio:
                res.append(tuple(ruta))
            elif sig > inicio and sig not in ruta:
                dfs(inicio, sig, ruta + [sig])

    for s in sorted(g):
        dfs(s, s, [s])
    return res


def conteo(bs):
    return Counter(n for b in bs for n in b)


def matriz(dsm, activo):
    ids = sorted({n for e in dsm["aristas"] for n in (e["de"], e["a"])})
    estado = {}
    for e in dsm["aristas"]:
        cond = e.get("cond")
        ok = (not cond) or activo.get(cond, False)
        estado[(e["de"], e["a"])] = ("↺" if e["a"] < e["de"] else "→") if ok else "○"
    cab = "      " + " ".join(f"{i:>2}" for i in ids)
    filas = [cab]
    for i in ids:
        celdas = ["■" if i == j else estado.get((i, j), "·") for j in ids]
        filas.append(f"{i:>2}    " + " ".join(f"{c:>2}" for c in celdas))
    return "\n".join(filas), ids


# ---------------------------------------------------------------- llamados a la acción (CTA) en el código
CATEGORIAS = [
    ("WhatsApp personal", r"wa\.me/|\bwaUrl\(|\bwaE\(|(?<![\w.])wa\("),
    ("Comunidad de WhatsApp", r"chat\.whatsapp\.com|href=\"[^\"]*comunidad/|comunidadUrl|data-ev=\"comunidad"),
    ("Aporta al mapa", r"href=\"[^\"]*aporta/|aporta/\?o=|data-ev=\"aporta"),
    ("Formulario de Google", r"docs\.google\.com/forms|formUrl\("),
    ("Compartir / invitar", r"compartir\(|navigator\.share"),
]
SALIDAS_EVENTOS = r"data-ev=|SG\.track\(|track\("


def escanear_cta():
    archivos = [p for p in RAIZ.rglob("*") if p.suffix in (".html", ".js", ".py") and p.is_file()
                and not any(s in p.parts for s in ("vendor", "node_modules", ".git", "qr"))
                and p.name != "estado-red.py"]
    por_cat, por_archivo, eventos = Counter(), {}, 0
    for p in sorted(archivos):
        txt = p.read_text(encoding="utf-8", errors="ignore")
        c = {nombre: len(re.findall(rx, txt)) for nombre, rx in CATEGORIAS}
        ev = len(re.findall(SALIDAS_EVENTOS, txt))
        if any(c.values()) or ev:
            por_archivo[str(p.relative_to(RAIZ))] = c
        for k, v in c.items():
            por_cat[k] += v
        eventos += ev
    return por_cat, por_archivo, eventos


# ---------------------------------------------------------------- GoatCounter (opcional)
def goatcounter(cfg):
    codigo = (cfg.get("contador") or {}).get("goatcounter")
    token = os.environ.get("GOATCOUNTER_TOKEN")
    if not (codigo and token):
        return None
    ini = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%dT00:00:00Z")
    try:
        req = urllib.request.Request(f"https://{codigo}.goatcounter.com/api/v0/stats/total?start={ini}",
                                     headers={"Authorization": "Bearer " + token, "User-Agent": "estado-red/1.0"})
        d = json.loads(urllib.request.urlopen(req, timeout=25).read().decode())
        return {"visitas": d.get("total"), "eventos": d.get("total_events")}
    except Exception as e:
        return {"error": str(e)[:80]}


# ---------------------------------------------------------------- informe
def pct(a, b):
    return f"{100 * a / b:.0f} %" if b else "—"


def informe(args):
    cfg = cargar("config.json")
    dsm = cargar("red-dsm.json")
    nombres = {n["id"]: n["nombre"] for n in dsm.get("nodos", [])}
    admin = dsm.get("admin")
    ahora = datetime.now(timezone(timedelta(hours=-3))).strftime("%Y-%m-%d %H:%M")

    base, inter, hay_aprob, est_csv = cargar_aportes(cfg, args.csv_archivo)
    cond = condiciones(cfg, est_csv, hay_aprob)

    # --- DSM
    activas = [e for e in dsm["aristas"] if (not e.get("cond")) or cond.get(e["cond"])]
    todo = dsm["aristas"]
    objetivo = [e for e in todo + dsm.get("objetivo", []) if admin not in (e["de"], e["a"])]
    b_hoy, b_todo, b_obj = bucles(grafo(activas)), bucles(grafo(todo)), bucles(grafo(objetivo))
    c_hoy, c_todo = conteo(b_hoy), conteo(b_todo)
    por_admin = sum(1 for b in b_hoy if admin in b)
    por_admin_todo = sum(1 for b in b_todo if admin in b)
    condicionales = [e for e in dsm["aristas"] if e.get("cond")]
    cond_ok = sum(1 for e in condicionales if cond.get(e["cond"]))
    mtx, _ = matriz(dsm, cond)

    # --- aportes
    aprobados = [a for a in base if a["aprobado"]]
    pend = [a for a in base if not a["aprobado"]]
    conf = sum(a["confirm"] for a in base)
    corr = sum(a["correc"] for a in base)
    origenes = Counter(a["origen"] for a in base)
    contagio = sum(v for k, v in origenes.items() if k in ("inv", "inv-lider", "comunidad", "verificacion"))
    comunas = Counter()
    lista = (cargar("comunas-biobio.json").get("comunas") or [])
    for a in base:
        mejor, dm = None, 1e12
        for c in lista:
            d = metros((a["lat"], a["lng"]), (c["lat"], c["lng"]))
            if d < dm:
                dm, mejor = d, c["nombre"]
        if mejor and dm < 45000:
            comunas[mejor] += 1
    verificados = sum(1 for a in base if a["confirm"] > 0)

    # --- Metcalfe
    n = args.miembros
    K = args.k
    posibles = lambda x: x * (x - 1) // 2
    techo = lambda n0, k: (n0 / (1 - k)) if k < 1 else float("inf")
    interacciones = len(inter)

    # --- CTA
    por_cat, por_arch, eventos = escanear_cta()
    total_cta = sum(por_cat.values())
    personal = por_cat["WhatsApp personal"]
    destinos = personal + por_cat["Comunidad de WhatsApp"] + por_cat["Aporta al mapa"] + por_cat["Formulario de Google"]
    p_personal = personal / destinos if destinos else 0

    # --- fuentes de datos reales
    empresas = [e for e in (cargar("empresas.json").get("empresas") or []) if e.get("activo") and not e.get("prototipo") and e.get("id") != "ejemplo"]
    fuentes = {
        "Servicios (54)": True,
        "Empresas verificadas": len(empresas) > 0,
        "Activos OSM importados": len(cargar("activos.json").get("activos") or []) > 0,
        "Aportes de la comunidad": len(base) > 0,
        "Licitaciones reales": cargar("licitaciones.json").get("demo") is False,
        "Radio con pistas propias": cargar("playlist.json").get("demo") is False,
    }

    # --- índice de red
    comp = [
        ("Circuito conectado", 30, cond_ok / len(condicionales) if condicionales else 0),
        ("Independencia de la administración", 25, 1 - (por_admin / len(b_hoy) if b_hoy else 1)),
        ("Medición activa", 10, 1.0 if cond["contador"] else 0.0),
        ("Datos reales", 15, sum(fuentes.values()) / len(fuentes)),
        ("Salidas que no pasan por tu WhatsApp", 10, 1 - p_personal),
        ("Contagio (aportes que llegan por invitación)", 10, (contagio / len(base)) if base else 0.0),
    ]
    indice = round(sum(p * f for _, p, f in comp))
    semaforo = "🟢" if indice >= 70 else "🟡" if indice >= 40 else "🔴"

    L = []
    w = L.append
    w(f"ESTADO DE LA RED · {ahora} (hora de Chile)")
    w(f"{semaforo} Índice de red: {indice} / 100")
    w("")
    w("== 1. CÓMO SE CALCULA EL ÍNDICE ==")
    for nombre, p, f in comp:
        w(f"  {nombre:<48} {round(p * f):>3} / {p}")
    w("")
    w("== 2. CONEXIONES DEL CIRCUITO ==")
    for k, ok in cond.items():
        w(f"  {'✔' if ok else '✘'} {NOMBRE_COND[k]}")
    w(f"  Eslabones del circuito de aportes conectados: {cond_ok} de {len(condicionales)}")
    if est_csv.startswith("error"):
        w(f"  ⚠ El enlace CSV está escrito pero no responde ({est_csv}).")
    w("")
    w("== 3. LEY DE METCALFE · n(n-1)/2 ==")
    if n:
        w(f"  Personas en la red (n): {n}  →  {posibles(n):,} conexiones posibles".replace(",", "."))
        w(f"  Interacciones reales entre pares (confirmaciones y correcciones): {interacciones}")
        w(f"  Densidad = reales / posibles: {100 * interacciones / posibles(n):.3f} %" if posibles(n) else "")
        w(f"  Techo de la red con K = {K}: {techo(n, K):,.0f} personas (n / (1 − K))".replace(",", "."))
        w(f"  Techo con K = 0,9 (objetivo con voz y radio): {techo(n, 0.9):,.0f} personas".replace(",", "."))
        w(f"  Si la red crece 10 %: {int(n * 1.1)} personas → {posibles(int(n * 1.1)):,} conexiones posibles (+{100 * (posibles(int(n * 1.1)) / posibles(n) - 1):.0f} %)".replace(",", ".") if n > 1 else "")
    else:
        w("  No hay n: pasa --miembros N o define la variable RED_MIEMBROS del repositorio (cantidad de personas en la Asamblea/Comunidad).")
    w("  Escenarios de referencia:")
    for x in (10, 40, 200, 400, 2000):
        w(f"    n = {x:>5}  →  {posibles(x):>10,} conexiones posibles".replace(",", "."))
    w("  Metcalfe cuenta conexiones POSIBLES: solo se vuelven reales si la gente aporta y confirma entre sí.")
    w("")
    w("== 4. APORTES DE LA COMUNIDAD ==")
    if est_csv == "ok":
        w(f"  Aportes: {len(base)} · aprobados: {len(aprobados)} · pendientes de revisar: {len(pend)} ({pct(len(pend), len(base))})")
        w(f"  Verificados por pares: {verificados} ({pct(verificados, len(base))}) · confirmaciones: {conf} · correcciones: {corr}")
        w(f"  Aportes que llegaron por contagio (inv, inv-lider, comunidad): {contagio} ({pct(contagio, len(base))})")
        if origenes:
            w("  Por origen: " + ", ".join(f"{k} {v}" for k, v in origenes.most_common(8)))
        if comunas:
            w("  Por comuna: " + ", ".join(f"{k} {v}" for k, v in comunas.most_common(8)))
        w(f"  Carga de moderación estimada: {len(pend) * 3} min (3 min por aporte pendiente)")
    else:
        w("  Sin datos: " + ("falta el enlace CSV (aportes.csvUrl)." if est_csv == "sin-enlace" else est_csv))
    gc = goatcounter(cfg)
    if gc:
        w("  Visitas (30 días): " + (str(gc.get("visitas")) if "error" not in gc else "no disponible (" + gc["error"] + ")") + (f" · eventos: {gc.get('eventos')}" if gc.get("eventos") is not None else ""))
    w("")
    w("== 5. DSM · MATRIZ DE ESTRUCTURA DE DISEÑO ==")
    w("  La fila entrega a la columna.  → flujo activo · ↺ retorno activo · ○ diseñado y sin conectar · ■ la pieza misma")
    for linea in mtx.splitlines():
        w("  " + linea)
    w("  Piezas:")
    for i in sorted({x for e in dsm["aristas"] for x in (e["de"], e["a"])}):
        w(f"    {i:>2} {nombres.get(i, '?')}")
    w("")
    w(f"  Bucles cerrados hoy: {len(b_hoy)}   ·   con todo el circuito conectado: {len(b_todo)}")
    w(f"  Bucles que pasan por la administración (pieza {admin}): {por_admin} de {len(b_hoy)} ({pct(por_admin, len(b_hoy))}); con todo conectado: {por_admin_todo} de {len(b_todo)}")
    w(f"  Bucles que quedan sin la administración: {len(b_hoy) - por_admin} hoy · {len(b_todo) - por_admin_todo} con todo conectado")
    w(f"  Diseño objetivo (Comunidad, voz y licitaciones conectadas, administración fuera): {len(b_obj)} bucles (conteo mecánico de este modelo)")
    w("  Cuellos de botella (bucles por pieza, hoy / con todo conectado):")
    for i, v in sorted(c_todo.items(), key=lambda kv: -kv[1])[:6]:
        marca = "  ← cuello de botella" if i == admin else ""
        w(f"    {i:>2} {nombres.get(i, '?'):<40} {c_hoy.get(i, 0):>3} / {v:<3}{marca}")
    sin = [i for i in nombres if i in {x for e in dsm['aristas'] for x in (e['de'], e['a'])} and c_todo.get(i, 0) == 0]
    if sin:
        w("  Callejones (ningún bucle pasa por ellos): " + ", ".join(f"{i} {nombres[i]}" for i in sin))
    w("")
    w("== 6. LLAMADOS A LA ACCIÓN (CTA) EN EL CÓDIGO ==")
    w(f"  Total de llamados detectados: {total_cta} · eventos medidos (data-ev / track): {eventos}")
    for k in [c[0] for c in CATEGORIAS]:
        w(f"    {k:<26} {por_cat[k]:>4}")
    w(f"  Salidas hacia el WhatsApp personal: {pct(personal, destinos)} del total de destinos (meta: bajar este porcentaje)")
    top = sorted(por_arch.items(), key=lambda kv: -kv[1]["WhatsApp personal"])[:5]
    w("  Páginas con más salidas al WhatsApp personal: " + ", ".join(f"{k} ({v['WhatsApp personal']})" for k, v in top if v["WhatsApp personal"]))
    w("  (Se cuentan los puntos de llamado en el código, no los clics. Los clics los mide el contador.)")
    w("")
    w("== 7. DATOS REALES ==")
    for k, ok in fuentes.items():
        w(f"  {'✔' if ok else '✘'} {k}")
    w(f"  Fuentes con contenido real: {sum(fuentes.values())} de {len(fuentes)}")
    w("")
    w("== 8. LO QUE MÁS SUBE EL ÍNDICE ==")
    faltan = [k for k in ("csv_aportes", "aprobado_col", "contador", "prellenado", "sitio_url", "comunidad", "formulario_aporte") if not cond[k]]
    pasos = [PASO_COND[k] for k in faltan][:3]
    if p_personal > 0.3 and len(pasos) < 3:
        pasos.append("Cambia los botones de contacto que van a tu WhatsApp personal por la Comunidad o el formulario.")
    if len(pasos) < 3 and len(pend) > 0:
        pasos.append(f"Hay {len(pend)} aportes pendientes: pide a 1 o 2 personas de confianza que validen, o activa confirmacionesParaMostrar.")
    if len(pasos) < 3 and not fuentes["Activos OSM importados"]:
        pasos.append("Importa los activos de OpenStreetMap con la Acción para tener una base y medir calidad.")
    for i, p in enumerate(pasos or ["Todo el circuito está conectado: mide el contagio y baja la carga de moderación con verificación entre pares."], 1):
        w(f"  {i}. {p}")
    return "\n".join(x for x in L if x is not None), indice, semaforo


def enviar_correo(asunto, cuerpo, destino):
    usuario, clave = os.environ.get("SMTP_USER"), os.environ.get("SMTP_PASS")
    if not (usuario and clave and destino):
        return False
    msg = EmailMessage()
    msg["Subject"], msg["From"], msg["To"] = asunto, usuario, destino
    msg.set_content(cuerpo)
    with smtplib.SMTP_SSL(os.environ.get("SMTP_HOST", "smtp.gmail.com"), int(os.environ.get("SMTP_PORT", "465")), context=ssl.create_default_context(), timeout=30) as s:
        s.login(usuario, clave)
        s.send_message(msg)
    return True


def _num(v, defecto):
    try:
        return float(str(v).strip().replace(",", "."))
    except ValueError:
        return defecto


def main():
    ap = argparse.ArgumentParser(description="Estado de los efectos de red (informe privado para la administración).")
    ap.add_argument("--miembros", type=int, default=int(_num(os.environ.get("RED_MIEMBROS"), 0)) or None, help="Personas en la Asamblea/Comunidad (n de Metcalfe).")
    ap.add_argument("--k", type=float, default=_num(os.environ.get("RED_K"), 0.6), help="Coeficiente de amplificación K (0 a 0,99). Por defecto 0,6.")
    ap.add_argument("--csv-archivo", help="Usa un CSV local en vez del enlace publicado (para pruebas).")
    ap.add_argument("--no-correo", action="store_true", help="No enviar correo aunque estén los secretos.")
    args = ap.parse_args()
    args.k = min(max(args.k, 0.0), 0.99)

    texto, indice, semaforo = informe(args)
    en_actions = os.environ.get("GITHUB_ACTIONS") == "true"
    privado = os.environ.get("REPO_PRIVADO", "").lower() == "true"
    cfg = cargar("config.json")
    asunto = f"{semaforo} Estado de la red · índice {indice}/100 · {datetime.now().strftime('%Y-%m-%d')}"

    if not en_actions:
        print(texto)
        return
    # En GitHub: si el repositorio es PÚBLICO, los registros y resúmenes los puede leer cualquiera. Por eso el informe
    # solo va al correo (o al resumen si el repositorio es privado). Nunca se imprime en el registro.
    enviado = False
    if not args.no_correo:
        try:
            enviado = enviar_correo(asunto, texto, os.environ.get("RED_DESTINO") or (cfg.get("sitio") or {}).get("correo"))
        except Exception as e:
            print("No se pudo enviar el correo:", str(e)[:120])
    resumen = os.environ.get("GITHUB_STEP_SUMMARY")
    if privado and resumen:
        with open(resumen, "a", encoding="utf-8") as f:
            f.write("```text\n" + texto + "\n```\n")
        print("Informe escrito en el resumen de la ejecución (repositorio privado).")
    if enviado:
        print("Informe enviado por correo.")
    if not enviado and not privado:
        print("Informe NO publicado: el repositorio es público y no hay correo configurado. "
              "Agrega los secretos SMTP_USER y SMTP_PASS (ver README) o ejecuta el script en tu computador.")


if __name__ == "__main__":
    main()
