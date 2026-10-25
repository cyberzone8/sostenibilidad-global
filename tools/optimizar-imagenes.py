#!/usr/bin/env python3
"""Prepara fotos de una empresa para la web: reduce el tamaño y las guarda en assets/empresas/<id>/.

  pip install pillow
  python3 tools/optimizar-imagenes.py <carpeta-con-tus-fotos> <id-de-la-empresa>

Ejemplo:  python3 tools/optimizar-imagenes.py ~/Descargas/fotos-diesel diesel-jj

Cada foto queda como JPG de hasta 1400 px de ancho (suele pesar menos de 300 KB, ideal para celular)
y con un nombre limpio. Al final imprime los nombres para pegar en data/empresas.json.
"""
import re
import sys
import unicodedata
from pathlib import Path

try:
    from PIL import Image, ImageOps
except ImportError:
    sys.exit("Falta Pillow: ejecuta  pip install pillow")

if len(sys.argv) != 3:
    sys.exit(__doc__)
origen, eid = Path(sys.argv[1]).expanduser(), sys.argv[2]
destino = Path(__file__).resolve().parent.parent / "assets" / "empresas" / eid
destino.mkdir(parents=True, exist_ok=True)
nombres = []
for f in sorted(origen.iterdir()):
    if f.suffix.lower() not in {".jpg", ".jpeg", ".png", ".webp", ".heic"}:
        continue
    slug = unicodedata.normalize("NFKD", f.stem).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-z0-9]+", "-", slug.lower()).strip("-") or "foto"
    try:
        im = ImageOps.exif_transpose(Image.open(f)).convert("RGB")
    except Exception as err:  # formato no soportado (p. ej. HEIC sin plugin)
        print(f"  ! {f.name}: no se pudo abrir ({err})")
        continue
    im.thumbnail((1400, 1400))
    out = destino / f"{slug}.jpg"
    im.save(out, "JPEG", quality=82, optimize=True, progressive=True)
    nombres.append(out.name)
    print(f"  ✓ {out.name}  {im.width}x{im.height}  {out.stat().st_size // 1024} KB")
print("\nPega esto en data/empresas.json (la primera foto es la portada):")
print('  "imagenes": ' + str(nombres).replace("'", '"'))
