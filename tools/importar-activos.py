#!/usr/bin/env python3
"""Descarga de OpenStreetMap los activos comunitarios de la provincia (postas, CESFAM, hospitales, centros comunitarios,
municipalidades, bibliotecas) y los guarda en data/activos.json para que el mapa no dependa de la red en cada visita.

  python3 tools/importar-activos.py            (también corre solo desde GitHub: Actions → Importar activos → Run workflow)

Datos © colaboradores de OpenStreetMap, licencia ODbL (https://www.openstreetmap.org/copyright). Se guarda solo nombre, tipo y
ubicación de instituciones: nunca personas ni domicilios. Revisa el resultado antes de una presentación: OpenStreetMap lo edita
la comunidad y puede haber omisiones o nombres desactualizados.
"""
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

BBOX = "-37.95,-72.95,-36.90,-71.20"  # sur, oeste, norte, este: provincia de Biobío y alrededores
DESTINO = Path(__file__).resolve().parent.parent / "data" / "activos.json"
QUERY = f'[out:json][timeout:90];(nwr["amenity"~"^(hospital|clinic|doctors|community_centre|social_facility|townhall|library)$"]({BBOX});nwr["healthcare"]({BBOX}););out center tags;'


def sin_tilde(t):
    return unicodedata.normalize("NFD", (t or "").lower()).encode("ascii", "ignore").decode()


def clasificar(el):
    t = el.get("tags", {})
    n = sin_tilde(t.get("name"))
    am = t.get("amenity", "")
    if el.get("lat") is not None:
        ll = (el["lat"], el["lon"])
    elif el.get("center"):
        ll = (el["center"]["lat"], el["center"]["lon"])
    else:
        return None
    if not t.get("name"):
        return None
    patron = r"cesfam|cecosf|\bcesc\b|cosam|posta|hospital|\bsar\b|\bsapu\b|centro (comunitario )?de salud|consultorio|servicio de salud|urgencia"
    if re.search(patron, n) and (am in ("hospital", "clinic", "doctors") or t.get("healthcare")):
        if "hospital" in n:
            tipo = "Hospital"
        elif "cesfam" in n:
            tipo = "CESFAM"
        elif "cecosf" in n:
            tipo = "CECOSF"
        elif "posta" in n:
            tipo = "Posta rural"
        elif re.search(r"\bsar\b|\bsapu\b|urgencia", n):
            tipo = "Urgencia (SAR/SAPU)"
        else:
            tipo = "Centro de salud"
        return {"nombre": t["name"], "tipo": tipo, "grupo": "salud", "lat": round(ll[0], 6), "lng": round(ll[1], 6)}
    com = {"community_centre": "Centro comunitario", "social_facility": "Servicio social", "townhall": "Municipalidad", "library": "Biblioteca"}.get(am)
    if com:
        return {"nombre": t["name"], "tipo": com, "grupo": "comunidad", "lat": round(ll[0], 6), "lng": round(ll[1], 6)}
    return None


def main():
    req = urllib.request.Request("https://overpass-api.de/api/interpreter", data=("data=" + urllib.parse.quote(QUERY)).encode(),
                                 headers={"User-Agent": "sostenibilidad-global-importador/1.0", "Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=120) as r:
        els = json.load(r).get("elements", [])
    vistos, out = set(), []
    for e in els:
        a = clasificar(e)
        if not a:
            continue
        k = (sin_tilde(a["nombre"]), round(a["lat"], 3), round(a["lng"], 3))
        if k in vistos:
            continue
        vistos.add(k)
        out.append(a)
    out.sort(key=lambda a: (a["grupo"], a["tipo"], a["nombre"]))
    data = json.loads(DESTINO.read_text(encoding="utf-8"))
    data["activos"], data["actualizado"], data["fuente"] = out, date.today().isoformat(), "OpenStreetMap (ODbL)"
    DESTINO.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    por = {}
    for a in out:
        por[a["tipo"]] = por.get(a["tipo"], 0) + 1
    print(f"{len(out)} activos guardados en data/activos.json: " + ", ".join(f"{k} {v}" for k, v in sorted(por.items())))


if __name__ == "__main__":
    try:
        main()
    except Exception as err:  # sin red o servicio ocupado
        sys.exit(f"No se pudo importar: {err}\nPrueba de nuevo en unos minutos (el servicio de OpenStreetMap a veces está ocupado).")
