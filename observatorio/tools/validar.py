#!/usr/bin/env python3
"""Valida los CSV contra observatorio/esquema/esquema.json (única definición del esquema):
columnas, obligatorios, vocabularios, referencias, fechas, trazabilidad, datos personales
y que el formulario de Issues no se haya desfasado del esquema."""
import csv, json, re, sys, pathlib
from datetime import date

R = pathlib.Path(__file__).resolve().parent.parent.parent
O = R / "observatorio"
ESQ = json.load(open(O / "esquema/esquema.json", encoding="utf-8"))
V = json.load(open(O / "esquema/vocabularios.json", encoding="utf-8"))
S = ESQ["tablas"]
MULTI = set(ESQ["multivalor"])
PII = [re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+"), re.compile(r"\b\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]\b"), re.compile(r"(\+?56)?\s?9\s?\d{4}\s?\d{4}\b")]
errs, warns = [], []

def cargar(t):
    with open(O / f"datos/{t}.csv", encoding="utf-8", newline="") as f:
        rd = csv.DictReader(f)
        return list(rd), rd.fieldnames

def split(v): return [x.strip() for x in (v or "").split(";") if x.strip()]

D, cab = {}, {}
for t in S:
    D[t], cab[t] = cargar(t)
ids = {t: {r["id"] for r in D[t]} for t in S}

# --- coherencia del propio esquema ---
if set(ESQ["niveles"]) != set(V["nivel"]): errs.append("esquema.json: 'niveles' no coincide con vocabularios.json → nivel")
for t, cfg in S.items():
    for c, vk in cfg["vocabulario"].items():
        if vk not in V: errs.append(f"esquema.json: {t}.{c} usa vocabulario inexistente '{vk}'")
    for c, tab in cfg["referencias"].items():
        if tab not in S: errs.append(f"esquema.json: {t}.{c} referencia tabla inexistente '{tab}'")
    for c in cfg["obligatorias"] + cfg["fechas"] + cfg["vista"] + list(cfg["vocabulario"]) + list(cfg["referencias"]):
        if c not in cfg["columnas"] and c not in ("plazo_estimado", "amparo_hasta_estimado"):
            errs.append(f"esquema.json: {t}: '{c}' no está en columnas")

# --- registros ---
for t, cfg in S.items():
    if cab[t] != cfg["columnas"]:
        errs.append(f"{t}.csv: encabezado distinto del esquema. Esperado {cfg['columnas']}, encontrado {cab[t]}")
    seen = set()
    for i, r in enumerate(D[t], start=2):
        w = f"{t}.csv:{i} ({r.get('id','?')})"
        for c in cfg["obligatorias"]:
            if not (r.get(c) or "").strip(): errs.append(f"{w}: falta '{c}'")
        if not re.fullmatch(cfg["prefijo"] + r"-\d{%d}" % ESQ["id_digitos"], r.get("id") or ""):
            errs.append(f"{w}: id debe tener la forma {cfg['prefijo']}-{'0'*(ESQ['id_digitos']-1)}1")
        if r["id"] in seen: errs.append(f"{w}: id duplicado")
        seen.add(r["id"])
        for c, vk in cfg["vocabulario"].items():
            for x in (split(r.get(c)) if c in MULTI else [r.get(c, "")]):
                if x and x not in V[vk]: errs.append(f"{w}: '{c}'='{x}' fuera de vocabulario {V[vk]}")
        for c, tab in cfg["referencias"].items():
            for x in (split(r.get(c)) if c in MULTI else [r.get(c, "")]):
                if x and x not in ids[tab]: errs.append(f"{w}: '{c}' referencia inexistente {x}")
        for c in cfg["fechas"]:
            if r.get(c):
                try: date.fromisoformat(r[c])
                except ValueError: errs.append(f"{w}: '{c}' debe ser AAAA-MM-DD")
        nivel = r.get("nivel_verificacion")
        if t != "fuentes" and nivel and nivel != "N0" and not split(r.get("fuente_ids")):
            errs.append(f"{w}: nivel {nivel} exige al menos una fuente (fuente_ids)")
        if nivel in ("N2", "N3") and t != "fuentes":
            fs = split(r.get("fuente_ids"))
            ofi = any(s["id"] in fs and s["tipo"] in ("documento_oficial", "norma") for s in D["fuentes"])
            if len(fs) < 2 and not ofi: errs.append(f"{w}: {nivel} exige 2 fuentes o 1 documento oficial/norma")
        if cfg["exige_origen"] and not r.get("origen"): errs.append(f"{w}: falta 'origen' ({', '.join(V['origen'])})")
        if t == "actores" and r.get("perfil_rt") and r.get("tipo") != "municipalidad": errs.append(f"{w}: perfil_rt solo aplica a municipalidades")
        if r.get("origen") == "aporte_comunitario" and nivel in ("N2", "N3"): warns.append(f"{w}: aporte comunitario en {nivel}: confirmar corroboración")
        for c, val in r.items():
            for p in PII:
                if val and p.search(val): errs.append(f"{w}: posible dato personal en '{c}' (correo/RUT/teléfono)")
        if t == "relaciones" and r.get("origen_id") == r.get("destino_id"): errs.append(f"{w}: origen y destino iguales")
        if t == "fuentes" and not r.get("archivo_respaldo"): warns.append(f"{w}: sin archivo_respaldo (guardar copia o URL de archivo web)")
        if t == "fuentes" and not (r.get("url") or r.get("archivo_respaldo")): errs.append(f"{w}: requiere url o archivo_respaldo")

_cod = [r["codigo_portal"] for r in D["solicitudes"]]
for c in sorted({x for x in _cod if _cod.count(x) > 1}): errs.append(f"solicitudes.csv: codigo_portal duplicado {c}")

# --- el formulario de Issues no debe desfasarse del esquema ---
def issue(nombre):
    p = R / ".github/ISSUE_TEMPLATE" / nombre
    return p.read_text(encoding="utf-8") if p.exists() else None
nueva, corr = issue("observatorio_nueva_evidencia.yml"), issue("observatorio_correccion.yml")
if nueva is None or corr is None:
    warns.append("faltan los formularios de Issues observatorio_*.yml en .github/ISSUE_TEMPLATE")
else:
    m = re.search(r"options:\s*\[([^\]]*)\]", nueva)
    en_form = sorted(x.strip() for x in m.group(1).split(",")) if m else []
    del_esquema = sorted(c["formulario"] for c in S.values() if c["formulario"])
    if en_form != del_esquema: errs.append(f"observatorio_nueva_evidencia.yml: tipos {en_form} ≠ esquema {del_esquema}")
    m = re.search(r"ej\.\s*[A-Z]{3}-(\d+)", corr)
    if m and len(m.group(1)) != ESQ["id_digitos"]: errs.append(f"observatorio_correccion.yml: el ejemplo de ID debe tener {ESQ['id_digitos']} dígitos")

print("Registros: " + ", ".join(f"{t}={len(D[t])}" for t in S))
for w in warns: print("AVISO:", w)
for e in errs: print("ERROR:", e)
sys.exit(1 if errs else 0)
