#!/usr/bin/env python3
"""Crea data/playlist.json a partir de los MP3 de la carpeta audio/.
Conserva título, autor y licencia que ya hayas escrito a mano. Duración: usa ffprobe o mutagen si existen."""
import json, shutil, subprocess, sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
OUT = RAIZ / "data" / "playlist.json"

def duracion(f):
    if shutil.which("ffprobe"):
        try:
            r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)], capture_output=True, text=True, check=True)
            return round(float(r.stdout.strip()))
        except Exception:
            pass
    try:
        from mutagen.mp3 import MP3
        return round(MP3(str(f)).info.length)
    except Exception:
        return 0

previo = {}
if OUT.exists():
    try:
        for p in json.loads(OUT.read_text(encoding="utf-8")).get("pistas", []):
            previo[p.get("archivo")] = p
    except Exception:
        pass

pistas = []
for f in sorted((RAIZ / "audio").glob("*.mp3")):
    ruta = "audio/" + f.name
    p = previo.get(ruta, {})
    pistas.append({
        "archivo": ruta,
        "titulo": p.get("titulo") or f.stem.replace("-", " ").replace("_", " "),
        "autor": p.get("autor", ""),
        "licencia": p.get("licencia", ""),
        "duracion": duracion(f),
    })

datos = {
    "_ayuda": "Lista de reproducción de la radio. Si todas las pistas tienen duración, todos escuchan lo mismo al mismo tiempo (como una radio). Orden = orden de la lista.",
    "pistas": pistas,
}
OUT.write_text(json.dumps(datos, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"{len(pistas)} pistas en {OUT.relative_to(RAIZ)}")
if any(not p["duracion"] for p in pistas):
    print("Aviso: alguna pista quedó sin duración (instala ffmpeg o 'pip install mutagen'); se reproducirá en orden pero sin sincronía.", file=sys.stderr)
