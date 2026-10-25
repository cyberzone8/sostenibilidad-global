#!/usr/bin/env python3
"""Genera las páginas públicas de la red a partir de data/empresas.json.

  empresas/<id>/index.html   ficha propia de cada empresa (indexable por Google)
  directorio/index.html      listado con buscador y filtros por rubro y comuna
  sitemap.xml, robots.txt    para buscadores (el sitemap solo si data/config.json -> sitio.url está lleno)

Uso:  python3 tools/generar.py        (en GitHub se ejecuta solo al cambiar los datos, ver .github/workflows)
Opcional: pip install segno           (agrega un código QR a cada ficha cuando sitio.url está definido)
"""
import json
import re
import shutil
import sys
from html import escape as esc
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parent.parent
MARCA = "<!-- generado por tools/generar.py: no editar a mano, se regenera -->"
FONTS = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Montserrat:wght@600;700;800&display=swap"
ICON = "data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22%3E%3Ctext y=%22.9em%22 font-size=%2290%22%3E🌿%3C/text%3E%3C/svg%3E"
DIAS = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
avisos = []


def cargar(ruta):
    return json.loads((ROOT / ruta).read_text(encoding="utf-8"))


cfg = cargar("data/config.json")
tax = cargar("data/taxonomia.json")
servicios = {s["id"]: s for s in cargar("data/servicios.json")["servicios"] if s.get("activo", True)}
empresas = [e for e in cargar("data/empresas.json")["empresas"] if e.get("activo", True)]
# Regla de privacidad: este repositorio es PÚBLICO. Una empresa "reservada" o "privada" (intermediada por Sostenibilidad Global)
# vive solo en el repositorio privado; si aparece aquí se detiene todo para que no se publique por error.
for _e in empresas:
    if _e.get("visibilidad") not in (None, "", "publica"):
        sys.exit(f"DETENIDO: «{_e['id']}» tiene visibilidad «{_e['visibilidad']}». Las empresas reservadas o privadas no pueden estar en data/empresas.json (repositorio público). Muévela al repositorio privado.")
FORM_EMPRESA = (cfg.get("formularios") or {}).get("empresa", "")
FORM_EMPRESA = FORM_EMPRESA if re.match(r"https?://", FORM_EMPRESA or "") else ""
rubros = {r["id"]: r["titulo"] for r in tax["rubros"]}
peso = {p["id"]: p["peso"] for p in tax["planes"]}
planes = {p["id"]: p["titulo"] for p in tax["planes"]}
BASE = (cfg["sitio"].get("url") or "").strip()
BASE = (BASE.rstrip("/") + "/") if BASE else ""

try:
    import segno  # type: ignore
except ImportError:
    segno = None


# ---------- utilidades ----------
def wa_url(e, texto, origen):
    num = e.get("whatsapp") or cfg["sitio"]["whatsapp"]
    return f"https://wa.me/{num}?text={quote(texto + chr(10) + chr(10) + '(Origen: ' + origen + ')')}"


def tel_href(t):
    return "tel:" + re.sub(r"[^\d+]", "", t)


def imagenes(e):
    """Devuelve [(archivo, alt)] de las fotos que realmente existen en assets/empresas/<id>/."""
    out = []
    for i in e.get("imagenes") or []:
        f, alt = (i, "") if isinstance(i, str) else (i.get("archivo", ""), i.get("alt", ""))
        if not f:
            continue
        if (ROOT / "assets" / "empresas" / e["id"] / f).is_file():
            out.append((f, alt or e["nombre"]))
        else:
            avisos.append(f"{e['id']}: falta la foto assets/empresas/{e['id']}/{f} (se omite)")
    return out


def foto_servicio(e, s):
    f = s.get("imagen") or ""
    if not f:
        return ""
    if (ROOT / "assets" / "empresas" / e["id"] / f).is_file():
        return f
    avisos.append(f"{e['id']}: falta la foto del servicio «{s['titulo']}» ({f}) (se omite)")
    return ""


def cabecera(titulo, desc, nivel, canonical="", og_img="", extra_css=True, leaflet=False, volver="← Directorio", volver_url="directorio/"):
    p = "../" * nivel
    can = f'<link rel="canonical" href="{esc(canonical)}">' if canonical else ""
    og = f'<meta property="og:image" content="{esc(og_img)}">' if og_img else ""
    lf = f'<link rel="stylesheet" href="{p}vendor/leaflet/leaflet.css">' if leaflet else ""
    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{esc(titulo)}</title>
<meta name="description" content="{esc(desc)}">
<meta property="og:title" content="{esc(titulo)}">
<meta property="og:description" content="{esc(desc)}">
<meta property="og:type" content="website">
{og}{can}
<link rel="icon" href="{ICON}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="{FONTS}">
{lf}
<link rel="stylesheet" href="{p}assets/css/ficha.css">
</head>
<body>
{MARCA}
<header class="top"><a class="brand" href="{p}">Sostenibilidad <b>Global</b></a><a href="{p}{volver_url}">{volver}</a></header>
"""


def pie(nivel, leaflet=False):
    p = "../" * nivel
    lf = f'<script src="{p}vendor/leaflet/leaflet.js"></script>\n' if leaflet else ""
    return f"""{lf}<script src="{p}assets/js/comun.js"></script>
<script src="{p}assets/js/ficha.js"></script>
<script src="{p}assets/js/contador.js" data-config="{p}data/config.json" defer></script>
</body>
</html>
"""


def horario_html(e):
    hor = e.get("horario") or []
    if not hor:
        return ""
    filas = "".join(f"<tr><td>{esc(b['etiqueta'])}</td><td>{esc(b['abre'])} – {esc(b['cierra'])}</td></tr>" for b in hor)
    nota = f'<p class="nota">{esc(e["horarioNota"])}</p>' if e.get("horarioNota") else ""
    return f'<div class="card"><h2>Horario</h2><table class="hor">{filas}</table>{nota}</div>'


def json_ld(e, url, fotos):
    if e.get("prototipo"):
        return ""
    ld = {
        "@context": "https://schema.org", "@type": e.get("schemaTipo") or "LocalBusiness", "name": e["nombre"],
        "description": f"{e['rubro']} en {e['comuna']}, Región del Biobío. {e.get('descripcion', '')}".strip(),
        "address": {"@type": "PostalAddress", "streetAddress": e.get("direccion") or None, "addressLocality": e["comuna"], "addressRegion": "Biobío", "addressCountry": "CL"},
        "geo": {"@type": "GeoCoordinates", "latitude": e["lat"], "longitude": e["lng"]},
    }
    if url:
        ld["url"] = url
    if e.get("telefono"):
        ld["telephone"] = e["telefono"]
    if fotos and BASE:
        ld["image"] = [f"{BASE}assets/empresas/{e['id']}/{f}" for f, _ in fotos]
    if e.get("horario"):
        ld["openingHoursSpecification"] = [{"@type": "OpeningHoursSpecification", "dayOfWeek": [DIAS[n] for n in b["dias"]], "opens": b["abre"], "closes": b["cierra"]} for b in e["horario"]]
    ld["address"] = {k: v for k, v in ld["address"].items() if v}
    s = json.dumps(ld, ensure_ascii=False).replace("<", "\\u003c")
    return f'<script type="application/ld+json">{s}</script>\n'


# ---------- ficha ----------
def ficha(e):
    eid = e["id"]
    fotos = imagenes(e)
    url = f"{BASE}empresas/{eid}/" if BASE else ""
    rubro = rubros.get(e.get("rubroId"), e.get("rubro", ""))
    titulo = f"{e['nombre']} | {e['rubro']} en {e['comuna']}"
    desc = f"{e['rubro']} en {e['comuna']}, Región del Biobío. {e.get('descripcion', '')}".strip()
    og = f"{BASE}assets/empresas/{eid}/{fotos[0][0]}" if (fotos and BASE) else ""
    h = cabecera(titulo, desc, 2, canonical=url, og_img=og, leaflet=True)
    h = h.replace("</head>", json_ld(e, url, fotos) + "</head>")

    badges = []
    if e.get("horario"):
        badges.append(f'<span class="bd" data-horario="{esc(json.dumps(e["horario"]))}" hidden></span>')
    if e.get("prototipo"):
        badges.append('<span class="bd pr">Datos por confirmar</span>')
    elif e.get("verificada"):
        badges.append('<span class="bd ok">✓ Verificada por Sostenibilidad Global</span>')
    if peso.get(e.get("plan"), 0) > 0:
        badges.append(f'<span class="bd">{esc(planes[e["plan"]])}</span>')

    msg = e.get("mensajeWhatsApp") or f"Hola, vi {e['nombre']} en Sostenibilidad Global y quiero hacer una consulta."
    wa = wa_url(e, msg, f"ficha web · {e['nombre']}")
    dire = f"https://www.google.com/maps/dir/?api=1&destination={e['lat']},{e['lng']}"
    ev = lambda k: f'data-ev="{k}/{eid}/ficha"'  # noqa: E731
    botones = (
        f'<a class="btn" {ev("wa")} href="{esc(wa)}" target="_blank" rel="noopener">Escribir por WhatsApp</a>'
        + (f'<a class="btn alt" {ev("tel")} href="{esc(tel_href(e["telefono"]))}">Llamar</a>' if e.get("telefono") else "")
        + f'<a class="btn alt" {ev("dir")} href="{esc(dire)}" target="_blank" rel="noopener">Cómo llegar</a>'
    )

    galeria = ""
    if fotos:
        uno = " one" if len(fotos) == 1 else ""
        galeria = f'<div class="gal{uno}">' + "".join(f'<img src="../../assets/empresas/{eid}/{esc(f)}" alt="{esc(a)}" loading="lazy">' for f, a in fotos) + "</div>"

    svs = ""
    if e.get("servicios"):
        tarjetas = []
        for s in e["servicios"]:
            f = foto_servicio(e, s)
            img = f'<img src="../../assets/empresas/{eid}/{esc(f)}" alt="{esc(s["titulo"])}" loading="lazy">' if f else ""
            consulta = wa_url(e, f"Hola, vi {e['nombre']} en Sostenibilidad Global y necesito: {s['titulo']}.", f"ficha web · {e['nombre']} · {s['titulo']}")
            tarjetas.append(
                f'<article>{img}<div><h3>{esc(s["titulo"])}</h3><p>{esc(s.get("detalle", ""))}</p>'
                f'<a class="btn alt" {ev("wa")} href="{esc(consulta)}" target="_blank" rel="noopener">Consultar</a></div></article>'
            )
        svs = f'<h2>Servicios</h2><div class="sv">{"".join(tarjetas)}</div>'

    contacto = f'<p><b>Dirección:</b> {esc(e.get("direccion") or e["comuna"])}</p>'
    if e.get("telefono"):
        contacto += f'<p><b>Teléfono:</b> <a href="{esc(tel_href(e["telefono"]))}">{esc(e["telefono"])}</a></p>'
    safe_web = e.get("web") if re.match(r"https?://", e.get("web") or "") else ""
    if safe_web:
        contacto += f'<p><b>Sitio web:</b> <a href="{esc(safe_web)}" target="_blank" rel="noopener">{esc(safe_web)}</a></p>'
    if e.get("cobertura"):
        contacto += f'<p><b>Zona de atención:</b> {esc(e["cobertura"].get("texto", ""))}</p>'
    info = f'<div class="info"><div class="card"><h2>Contacto y ubicación</h2>{contacto}</div>{horario_html(e)}</div>'

    km = (e.get("cobertura") or {}).get("radioKm", 0)
    mapa = (
        f'<h2>Dónde estamos</h2><div id="fmap" data-lat="{e["lat"]}" data-lng="{e["lng"]}" data-km="{km}" data-nombre="{esc(e["nombre"])}" role="img" aria-label="Mapa con la ubicación de {esc(e["nombre"])}"></div>'
        f'<p class="nota"><a href="../../index.html?e={quote(eid)}">Ver en el mapa de Sostenibilidad Global →</a></p>'
    )

    rel = [servicios[i] for i in e.get("relacion", []) if i in servicios]
    relacion = ""
    if rel:
        relacion = ('<h2>Conectado con Sostenibilidad Global</h2><ul class="rel">'
                    + "".join(f'<li><a href="../../index.html#{esc(s["id"])}">{esc(s["titulo"])}</a></li>' for s in rel) + "</ul>")

    qr = ""
    if segno and url:
        svg = segno.make(url, error="m").svg_inline(scale=4, border=1, dark="#0b2a24")
        qr = f'<h2>Comparte esta ficha</h2><div class="qr">{svg}<p class="nota">Escanea el código o copia el enlace:<br><a href="{esc(url)}">{esc(url)}</a></p></div>'
    elif url:
        qr = f'<h2>Comparte esta ficha</h2><p class="nota"><a href="{esc(url)}">{esc(url)}</a></p>'

    proto = '<p class="nota">Esta ficha tiene datos pendientes de confirmar con la empresa.</p>' if e.get("prototipo") else ""
    cuerpo = f"""<main class="w">
<p class="ey">{esc(rubro)} · {esc(e["comuna"])}</p>
<h1>{esc(e["nombre"])}</h1>
<p class="lead">{esc(e.get("descripcion", ""))}</p>
<div class="badges">{"".join(badges)}</div>
<div class="acts">{botones}</div>
{galeria}
{svs}
{info}
{mapa}
{relacion}
{qr}
{proto}
<p class="foot">Parte de la red <a href="../../">Sostenibilidad Global</a> · <a href="../../directorio/">ver todas las empresas</a> · <a href="../../privacidad/">Privacidad</a> · <small id="visitas" class="vis" hidden></small></p>
</main>
<nav class="cta" aria-label="Contactar"><a class="btn" {ev("wa")} href="{esc(wa)}" target="_blank" rel="noopener">WhatsApp</a>{f'<a class="btn alt" {ev("tel")} href="{esc(tel_href(e["telefono"]))}">Llamar</a>' if e.get("telefono") else ""}<a class="btn alt" {ev("dir")} href="{esc(dire)}" target="_blank" rel="noopener">Cómo llegar</a></nav>
"""
    destino = ROOT / "empresas" / eid
    destino.mkdir(parents=True, exist_ok=True)
    (destino / "index.html").write_text(h + cuerpo + pie(2, leaflet=True), encoding="utf-8")


# ---------- directorio ----------
def directorio():
    orden = sorted(empresas, key=lambda e: (-peso.get(e.get("plan"), 0), e["nombre"].lower()))
    usados = [r for r in tax["rubros"] if any(e.get("rubroId") == r["id"] for e in orden)]
    comunas = sorted({e["comuna"] for e in orden})
    tarjetas = []
    for e in orden:
        fotos = imagenes(e)
        ini = "".join(w[0] for w in e["nombre"].split()[:2]).upper()
        media = (f'<img src="../assets/empresas/{e["id"]}/{esc(fotos[0][0])}" alt="" loading="lazy">' if fotos else f'<div class="ph" aria-hidden="true">{esc(ini)}</div>')
        tags = "".join(f"<span>{esc(s['titulo'])}</span>" for s in (e.get("servicios") or [])[:3])
        ins = ""
        if peso.get(e.get("plan"), 0) > 0:
            ins = f'<span class="bd">{esc(planes[e["plan"]])}</span> '
        if e.get("prototipo"):
            ins += '<span class="bd pr">Datos por confirmar</span>'
        rb = rubros.get(e.get("rubroId"), e.get("rubro", ""))
        texto = " ".join([e["nombre"], e.get("rubro", ""), rb, e["comuna"], e.get("descripcion", "")] + [s["titulo"] for s in e.get("servicios") or []])
        tarjetas.append(
            f'<a class="emp" data-ev="ficha/{e["id"]}/directorio" href="../empresas/{quote(e["id"])}/" data-rubro="{esc(e.get("rubroId", ""))}" data-comuna="{esc(e["comuna"])}" data-texto="{esc(texto)}">'
            f'{media}<div class="b"><h3>{esc(e["nombre"])}</h3><p>{esc(rb)} · {esc(e["comuna"])}</p><div class="tags">{tags}</div><div>{ins}</div></div></a>'
        )
    chips = '<button type="button" data-r="" aria-pressed="true">Todos</button>' + "".join(
        f'<button type="button" data-r="{esc(r["id"])}" aria-pressed="false">{esc(r["titulo"])}</button>' for r in usados)
    opts = '<option value="">Todas las comunas</option>' + "".join(f'<option>{esc(c)}</option>' for c in comunas)
    wa_unete = f"https://wa.me/{cfg['sitio']['whatsapp']}?text={quote('Hola, quiero que mi empresa aparezca en el directorio de Sostenibilidad Global.' + chr(10) + chr(10) + '(Origen: directorio)')}"
    h = cabecera("Directorio de empresas del Biobío | Sostenibilidad Global",
                 "Empresas y emprendimientos de la Provincia de Biobío con página propia: busca por rubro, comuna o servicio.", 1,
                 canonical=f"{BASE}directorio/" if BASE else "", volver="← Inicio y mapa", volver_url="")
    cuerpo = f"""<main class="w" id="dir">
<p class="ey">Red Sostenibilidad Global</p>
<h1>Directorio de empresas</h1>
<p class="lead">Empresas y emprendimientos del Biobío, cada uno con su página: servicios, fotos, teléfono, WhatsApp y cómo llegar.</p>
<div class="fl">
<label class="nota" for="q">Buscar por nombre, servicio o comuna</label>
<input id="q" type="search" placeholder="Ej.: diésel, reciclaje, Mulchén" autocomplete="off">
<div class="chips" id="rb" role="group" aria-label="Filtrar por rubro">{chips}</div>
<select id="co" aria-label="Filtrar por comuna">{opts}</select>
</div>
<p class="nota" id="dcount" aria-live="polite"></p>
<div class="grid">{"".join(tarjetas)}</div>
<div class="vacio" id="vacio" hidden>No encontramos empresas con ese filtro. Prueba con otra palabra o quita un filtro.</div>
<section class="unete"><h2>¿Tu empresa aquí?</h2><p>Página propia con fotos, servicios y WhatsApp, visible en el directorio y en el mapa.</p>
{('<a class="btn" data-ev="form/empresa" href="' + esc(FORM_EMPRESA) + '" target="_blank" rel="noopener">Completar el formulario</a> ') if FORM_EMPRESA else ""}<a class="btn{' alt" style="color:#fff;border-color:#4a7a66' if FORM_EMPRESA else ''}" data-ev="wa/sitio/directorio" href="{esc(wa_unete)}" target="_blank" rel="noopener">{'Escribir por WhatsApp' if FORM_EMPRESA else 'Quiero estar en la red'}</a> <a class="btn alt" style="color:#fff;border-color:#4a7a66" href="../index.html#empresas">Ver cómo funciona</a>
<p class="nota" style="color:#cfe3d8;margin:12px 0 0">Al enviar tus datos aceptas el <a style="color:#fff" href="../privacidad/">aviso de privacidad</a>.</p></section>
<p class="foot"><a href="../privacidad/">Privacidad</a> · <small id="visitas" class="vis" hidden></small></p>
</main>
"""
    destino = ROOT / "directorio"
    destino.mkdir(exist_ok=True)
    (destino / "index.html").write_text(h + cuerpo + pie(1), encoding="utf-8")


def limpiar_obsoletas(ids):
    base = ROOT / "empresas"
    if not base.is_dir():
        return
    for d in base.iterdir():
        f = d / "index.html"
        if d.is_dir() and d.name not in ids and f.is_file() and MARCA in f.read_text(encoding="utf-8"):
            shutil.rmtree(d)
            print(f"  - retirada la ficha de «{d.name}» (ya no está activa)")


def buscadores():
    robots = "User-agent: *\nAllow: /\n" + (f"Sitemap: {BASE}sitemap.xml\n" if BASE else "")
    (ROOT / "robots.txt").write_text(robots, encoding="utf-8")
    sm = ROOT / "sitemap.xml"
    if not BASE:
        if sm.exists():
            sm.unlink()
        return
    urls = [BASE, f"{BASE}directorio/", f"{BASE}valorizacion/", f"{BASE}radio/", f"{BASE}aporta/", f"{BASE}privacidad/"] + [f"{BASE}empresas/{e['id']}/" for e in empresas]
    cuerpo = "".join(f"  <url><loc>{esc(u)}</loc></url>\n" for u in urls)
    sm.write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{cuerpo}</urlset>\n', encoding="utf-8")


def main():
    ids = set()
    for e in empresas:
        if not re.fullmatch(r"[a-z0-9-]+", e["id"]):
            sys.exit(f"El id «{e['id']}» solo puede tener minúsculas, números y guiones.")
        if e.get("rubroId") and e["rubroId"] not in rubros:
            avisos.append(f"{e['id']}: rubroId «{e['rubroId']}» no existe en data/taxonomia.json")
        for r in e.get("relacion", []):
            if r not in servicios:
                avisos.append(f"{e['id']}: relacion «{r}» no es un servicio de servicios.json")
        ficha(e)
        ids.add(e["id"])
        print(f"  ✓ empresas/{e['id']}/")
    limpiar_obsoletas(ids)
    directorio()
    print("  ✓ directorio/")
    buscadores()
    if not BASE:
        print("  · sitio.url está vacío en data/config.json: sin sitemap, ni enlaces absolutos ni QR")
    elif not segno:
        print("  · para el código QR de cada ficha: pip install segno")
    for a in dict.fromkeys(avisos):
        print("  ! " + a)


if __name__ == "__main__":
    main()
