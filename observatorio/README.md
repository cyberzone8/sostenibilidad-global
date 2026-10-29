# Observatorio Biobío — mapa de carpetas

Todo el módulo vive aquí. Fuera de esta carpeta solo hay **dos** cosas, y GitHub las exige en esos lugares: el workflow (`.github/workflows/observatorio.yml`) y los formularios de Issues (`.github/ISSUE_TEMPLATE/observatorio_*.yml`).

| Carpeta | Qué es | ¿Se edita a mano? |
|---|---|---|
| `datos/` | Los CSV: la fuente de verdad | **Sí** |
| `esquema/` | `esquema.json` (tablas y columnas), `vocabularios.json`, `feriados.json` | Solo al cambiar el modelo |
| `tools/` | `validar.py`, `construir.py`, `migrar-desde-v2.sh` | No |
| `publicado/` | JSON generados que lee la página | **Nunca** (lo escribe el workflow) |
| `docs/` | Metodología, instalación, análisis DSM | Sí |
| `index.html` | La página pública | Rara vez |

Flujo: `datos/` + `esquema/` → `tools/validar.py` → `tools/construir.py` → `publicado/` → `index.html`.

El resto del sitio solo lee `publicado/*.json`: ese es el contrato.

Probar en tu computador: `python3 observatorio/tools/validar.py && python3 observatorio/tools/construir.py`
