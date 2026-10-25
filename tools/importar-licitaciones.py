#!/usr/bin/env python3
"""Cuenta las licitaciones ACTIVAS de Mercado Público por comuna del comprador (Región del Biobío)
y guarda el resumen en data/licitaciones.json. Solo se publican totales por comuna: ningún dato de proveedores.

  MP_TICKET=<tu ticket> python3 tools/importar-licitaciones.py

Cómo conseguir el ticket (gratis): solicítalo en api.mercadopublico.cl (ChileCompra, «Solicitar ticket»).
El ticket es personal: guárdalo como secreto (GitHub: Settings → Secrets → MP_TICKET). NUNCA lo escribas en el sitio ni en un archivo del repositorio.
Se usan dos consultas de la API pública: listado de licitaciones activas y, por cada código nuevo, su detalle (comprador, comuna, región).
Los detalles ya vistos se guardan en data/.licitaciones-cache.json para no repetir llamadas (se podan solos).
Fuente de los datos: ChileCompra, Mercado Público. Cita la fuente al mostrarlos.
"""
import json, os, re, sys, time, unicodedata, urllib.error, urllib.parse, urllib.request
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
API = "https://api.mercadopublico.cl/servicios/v1/publico/licitaciones.json"
PAUSA = 0.5  # segundos entre llamadas (la API rechaza peticiones simultáneas)
TICKET = os.environ.get("MP_TICKET", "").strip()


def norm(t):
    t = unicodedata.normalize("NFD", str(t or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]", "", t)


def llamar(params, intentos=6):
    url = API + "?" + urllib.parse.urlencode({**params, "ticket": TICKET})
    for k in range(intentos):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "sostenibilidad-global/1.0"}), timeout=60) as r:
                d = json.load(r)
            if isinstance(d, dict) and d.get("Codigo") in (10500, 10501):  # peticiones simultáneas / límite
                time.sleep(3 * (k + 1)); continue
            return d
        except urllib.error.HTTPError as e:  # no imprimir la URL: lleva el ticket
            print(f"  HTTP {e.code} (intento {k + 1})", file=sys.stderr); time.sleep(3 * (k + 1))
        except Exception as e:
            print(f"  error de red: {type(e).__name__} (intento {k + 1})", file=sys.stderr); time.sleep(3 * (k + 1))
    return None


def main():
    if not TICKET:
        sys.exit("Falta el ticket: define la variable MP_TICKET (ver instrucciones al inicio de este archivo).")
    comunas = json.loads((RAIZ / "data" / "comunas-biobio.json").read_text(encoding="utf-8"))["comunas"]
    por_norm = {norm(c["nombre"]): c["nombre"] for c in comunas}
    cache_f = RAIZ / "data" / ".licitaciones-cache.json"
    cache = json.loads(cache_f.read_text(encoding="utf-8")) if cache_f.exists() else {}

    lista = llamar({"estado": "activas"})
    if not lista or "Listado" not in lista:
        sys.exit("No se pudo obtener el listado de licitaciones activas (¿ticket vigente?). No se modificó nada.")
    codigos = [x["CodigoExterno"] for x in lista["Listado"] if x.get("CodigoExterno")]
    print(f"{len(codigos)} licitaciones activas en el país; {sum(c in cache for c in codigos)} ya en caché.")

    nuevos = [c for c in codigos if c not in cache]
    for i, cod in enumerate(nuevos, 1):
        time.sleep(PAUSA)
        d = llamar({"codigo": cod})
        try:
            comp = d["Listado"][0]["Comprador"]
            cache[cod] = {"r": norm(comp.get("RegionUnidad")), "c": norm(comp.get("ComunaUnidad"))}
        except Exception:
            print(f"  sin detalle para {cod}; se reintenta la próxima vez", file=sys.stderr)
        if i % 100 == 0:
            print(f"  {i}/{len(nuevos)} detalles…")

    cache = {c: v for c, v in cache.items() if c in set(codigos)}  # poda: solo las que siguen activas
    cache_f.write_text(json.dumps(cache, ensure_ascii=False), encoding="utf-8")

    cuenta, sin = {c["nombre"]: 0 for c in comunas}, 0
    for v in cache.values():
        if "biobio" not in v["r"]:
            continue
        n = por_norm.get(v["c"])
        if n: cuenta[n] += 1
        else: sin += 1
    (RAIZ / "data" / "licitaciones.json").write_text(json.dumps({
        "_ayuda": "Resumen de licitaciones activas por comuna del comprador. Lo genera tools/importar-licitaciones.py con la API de Mercado Público.",
        "demo": False, "actualizado": date.today().isoformat(), "fuente": "ChileCompra · Mercado Público",
        "total": sum(cuenta.values()) + sin, "sinComuna": sin, "porComuna": cuenta}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Listo: {sum(cuenta.values())} licitaciones en {sum(1 for v in cuenta.values() if v)} comunas del Biobío ({sin} sin comuna reconocida).")


if __name__ == "__main__":
    main()
