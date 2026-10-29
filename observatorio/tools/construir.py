#!/usr/bin/env python3
"""Convierte los CSV de observatorio/datos a JSON en observatorio/publicado y calcula métricas.
Las tablas y sus vistas salen de observatorio/esquema/esquema.json."""
import csv, json, pathlib
from collections import Counter
from datetime import date, timedelta

R = pathlib.Path(__file__).resolve().parent.parent.parent
O = R / "observatorio"
OUT = O / "publicado"; OUT.mkdir(parents=True, exist_ok=True)
ESQ = json.load(open(O / "esquema/esquema.json", encoding="utf-8"))
T = list(ESQ["tablas"])
FER = {date.fromisoformat(x) for x in json.load(open(O / "esquema/feriados.json"))}

def habiles(d, n):
    while n:
        d += timedelta(1)
        if d.weekday() < 5 and d not in FER: n -= 1
    return d

def enriquecer(rows):
    """Plazos ESTIMADOS (20 días hábiles para responder, 15 para amparo). Confirmar siempre con el acuse."""
    for r in rows:
        try: ing = date.fromisoformat(r["fecha_ingreso"])
        except Exception: continue
        r["plazo_estimado"] = r["fecha_limite"] or ("" if r["fecha_respuesta"] else habiles(ing, 20).isoformat())
        if r["fecha_respuesta"] and r["estado"] != "cerrada": r["amparo_hasta_estimado"] = habiles(date.fromisoformat(r["fecha_respuesta"]), 15).isoformat()

D = {}
for t in T:
    with open(O / f"datos/{t}.csv", encoding="utf-8", newline="") as f: D[t] = list(csv.DictReader(f))
    if t == "solicitudes": enriquecer(D[t])
    json.dump(D[t], open(OUT / f"{t}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# Lo que necesita la página del esquema: columnas a mostrar y descripción de niveles
json.dump({"niveles": ESQ["niveles"], "tablas": {t: {"vista": c["vista"]} for t, c in ESQ["tablas"].items()}},
          open(OUT / "esquema.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)

sp = lambda v: [x.strip() for x in (v or "").split(";") if x.strip()]
hoy = date.today()
con_rel = {r["origen_id"] for r in D["relaciones"]} | {r["destino_id"] for r in D["relaciones"]}
cap_cruz = {c for h in D["hipotesis"] for c in sp(h["capacidad_ids"])}
nec_cruz = {c for h in D["hipotesis"] for c in sp(h["necesidad_ids"])}
def vencido(r, d=180):
    try: return (hoy - date.fromisoformat(r["fecha_revision"])).days > d
    except Exception: return True
C5 = ("actores", "relaciones", "iniciativas", "capacidades", "necesidades")
ods = Counter(o for t in ("iniciativas", "capacidades", "necesidades") for r in D[t] for o in sp(r["ods"]))
M = {
 "generado": hoy.isoformat(),
 "totales": {t: len(D[t]) for t in T},
 "por_nivel": dict(Counter(r["nivel_verificacion"] for t in C5 for r in D[t])),
 "actores_sin_relaciones": [a["id"] for a in D["actores"] if a["id"] not in con_rel],
 "capacidades_sin_cruce": [c["id"] for c in D["capacidades"] if c["id"] not in cap_cruz],
 "necesidades_sin_cruce": [n["id"] for n in D["necesidades"] if n["id"] not in nec_cruz],
 "registros_por_revisar_180d": [r["id"] for t in C5 for r in D[t] if vencido(r)],
 "fuentes_sin_respaldo": [s["id"] for s in D["fuentes"] if not s["archivo_respaldo"]],
 "hipotesis_por_estado": dict(Counter(h["estado"] for h in D["hipotesis"])),
 "cobertura_ods": dict(sorted(ods.items(), key=lambda x: int(x[0]))),
}
M["solicitudes_por_estado"] = dict(Counter(r["estado"] for r in D["solicitudes"]))
M["solicitudes_vencen_7d"] = [r["codigo_portal"] for r in D["solicitudes"] if r["estado"] in ("en_plazo", "prorrogada") and r.get("plazo_estimado") and 0 <= (date.fromisoformat(r["plazo_estimado"]) - hoy).days <= 7]
M["amparo_estimado"] = [{"codigo": r["codigo_portal"], "hasta": r["amparo_hasta_estimado"]} for r in D["solicitudes"] if r.get("amparo_hasta_estimado")]
C4 = ("actores", "iniciativas", "capacidades", "necesidades")
M["por_origen"] = dict(Counter(r.get("origen", "") for t in C4 for r in D[t]))
M["esfera"] = dict(Counter(r.get("esfera", "") for t in C4[1:] for r in D[t] if r.get("esfera")))
M["perfiles_rt"] = dict(Counter(a["perfil_rt"] for a in D["actores"] if a.get("perfil_rt")))
json.dump(M, open(OUT / "metricas.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
G = {"nodos": [{"id": a["id"], "nombre": a["nombre"], "tipo": a["tipo"]} for a in D["actores"]],
     "aristas": [{"id": r["id"], "de": r["origen_id"], "a": r["destino_id"], "tipo": r["tipo_relacion"], "nivel": r["nivel_verificacion"]} for r in D["relaciones"]]}
json.dump(G, open(OUT / "grafo.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("Construido:", M["totales"])
