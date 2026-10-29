#!/bin/sh
# Migra un repo con la v2 del observatorio a la v3. Ejecutar en la RAÍZ del repo,
# DESPUÉS de descomprimir la v3 encima. Conserva tus CSV actuales (los de data/observatorio ganan).
set -e
[ -d data/observatorio ] || { echo "No hay data/observatorio: nada que migrar."; exit 0; }
cp data/observatorio/*.csv observatorio/datos/
[ -f data/observatorio/feriados.json ] && cp data/observatorio/feriados.json observatorio/esquema/feriados.json
rm -f observatorio/datos/*.json                       # JSON generados de la v2 (ahora van en publicado/)
git rm -r -q --ignore-unmatch data/observatorio scripts/observatorio metodologia/observatorio INTEGRACION-OBSERVATORIO.md
rmdir scripts 2>/dev/null || true                     # solo si quedó vacía
python3 observatorio/tools/validar.py && python3 observatorio/tools/construir.py
echo "Listo. Revisa con git status y haz commit."
