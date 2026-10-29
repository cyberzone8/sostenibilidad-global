# Análisis DSM del módulo (v2 → v3)

Lectura: la fila depende de la columna. ● dependencia de código · ○ documental o duplicada.

## v2 (por carpeta)
| | A | B | C | D | E | F | G | H | I | J |
|---|---|---|---|---|---|---|---|---|---|---|
| **A** CSV `data/observatorio` | | ○ | | | | | | ○ | | ○ |
| **B** vocabularios `data/observatorio` | | | | | | | | ○ | | |
| **C** feriados `data/observatorio` | | | | | | | | | | |
| **D** validar.py `scripts/` | ● | ● | | | | | | ○ | | |
| **E** construir.py `scripts/` | ● | | ● | ○ | | | | | | |
| **F** JSON `observatorio/datos` | | | | | ● | | | | | |
| **G** index.html `observatorio/` | ○ | | | | | ● | | ○ | | |
| **H** METODOLOGIA `metodologia/` | | ○ | | ○ | | | | | | |
| **I** workflow `.github/` | ● | ● | ● | ● | ● | ● | | | | |
| **J** issues `.github/` | ○ | ○ | | | | | | ○ | | |

25 dependencias, 22 cruzaban carpetas de la raíz; 6 carpetas raíz. Un cambio de esquema tocaba 5 carpetas.

## v3
- Una carpeta raíz del módulo + las 2 ubicaciones obligatorias de `.github/`. Quedan 10 dependencias entre carpetas raíz, todas hacia el workflow y los formularios.
- Las dependencias ○ de esquema (A↔G, A↔J, D↔E) se reemplazan por lectura de `esquema.json` (●) o por una comprobación automática (`validar.py` → formularios).
- Las dependencias entre subcarpetas siguen ahí (el flujo de datos es el mismo): el beneficio es contención y fuente única, no menos flujo.

## Pendiente (no resuelto en la v3)
- `index.html` aún trae su menú superior y la tabla «Con el programa» escritos a mano; no pude leer `config.json`/`comun.js` del sitio para reutilizarlos.
- Conexiones ◌ del DSM del sitio (Hoja y Aprobado, Activos OSM, capa en el mapa): se enchufan a `datos/` (entrada con `origen`) y a `publicado/` (salida).
