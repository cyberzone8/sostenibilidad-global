#!/usr/bin/env python3
"""Crea el código QR de la página «Aporta al mapa» (aporta/qr/qr.svg).
  pip install segno
  python3 tools/crear-qr.py https://TU-USUARIO.github.io/TU-REPOSITORIO/aporta/
Abre luego aporta/qr/ en pantalla completa (F11) para proyectarlo en la charla."""
import sys
from pathlib import Path
try:
    import segno
except ImportError:
    sys.exit("Falta segno: ejecuta  pip install segno")
url = sys.argv[1] if len(sys.argv) > 1 else "https://cyberzone8.github.io/sostenibilidad-global/aporta/"
if not url.startswith("https://"):
    sys.exit("La dirección debe empezar con https://")
destino = Path(__file__).resolve().parent.parent / "aporta" / "qr" / "qr.svg"
segno.make(url, error="m").save(str(destino), scale=20, border=3, dark="#12382a", light="#ffffff")
print("QR guardado en", destino.relative_to(destino.parents[2]), "→", url)
