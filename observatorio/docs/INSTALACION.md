# Instalación e integración del Observatorio (v3)

## 0. Qué cambió respecto de la v2
Reordenamiento a partir de un análisis de matriz de estructura de diseño (ver `DSM.md`). **No cambian los datos ni la página visible.**
- Todo el módulo vive en `observatorio/`. Fuera quedan solo el workflow y los formularios de Issues (GitHub los exige en `.github/`).
- Nuevo `esquema/esquema.json`: única definición de tablas, columnas, obligatorios, referencias y columnas visibles. `validar.py`, `construir.py` y `index.html` lo leen (antes el esquema estaba copiado en cuatro lugares).
- `validar.py` ahora comprueba además que el encabezado de cada CSV coincida con el esquema y que el formulario de Issues no se haya desfasado. Detectó y se corrigió un ejemplo `ACT-012` (el ID real tiene 4 dígitos).
- `observatorio/datos/` pasa a ser la **fuente** (CSV) y `observatorio/publicado/` lo **generado** (JSON). En la v2 `data/observatorio/` y `observatorio/datos/` tenían roles opuestos con nombres casi iguales.
- Los scripts quedan en `observatorio/tools/` (la v2 usaba una carpeta nueva `scripts/`).
- El workflow vigila `datos/`, `esquema/`, `tools/` y los formularios; escribe solo en `publicado/`.

## 1. Instalar (instalación nueva)
1. Descomprime en la **raíz** del repo `sostenibilidad-global`.
2. Commit a `main`. El sitio queda en `…/sostenibilidad-global/observatorio/`.
3. Settings → Actions → Workflow permissions → *Read and write* (el workflow regenera `publicado/`). Confirma en Settings → Pages que se publica desde rama.
4. Agrega la entrada de menú (sección 2).
5. Carga registros: fuente primero, luego el registro (ver sección 6).

## 1b. Migrar desde la v2
1. Descomprime la v3 encima del repo.
2. Desde la raíz: `sh observatorio/tools/migrar-desde-v2.sh`. Copia tus CSV actuales de `data/observatorio/` (los tuyos ganan), borra las carpetas de la v2 y valida.
3. `git status`, revisa y commit.

## 2. Menú y enlaces (no pude leer el código de tu index.html; adapta el marcado)
En el desplegable **Red** de sostenibilidad-global, agrega:
- `Observatorio Biobío` → `observatorio/`
- `Programa de Liderazgo Territorial` → `https://cyberzone8.github.io/liderazgo-territorial/programa-liderazgo.html`

En `liderazgo-territorial` (nav de todas las páginas) agrega:
`<a href="https://cyberzone8.github.io/sostenibilidad-global/observatorio/">Observatorio</a>`
y en el texto del Módulo 12 («la red opera como observatorio territorial») enlaza «observatorio territorial» al mismo URL.

## 3. Qué aporta cada pieza al sistema
| Del programa | Entra al observatorio como |
|---|---|
| Módulo 2: capacidades productivas, perfil de resiliencia y transformabilidad, clústeres | `capacidades`, `actores.perfil_rt` (+R+T, +R-T, -R+T, -R-T; solo municipalidades) y `actores.cluster` |
| Tecnósfera / psicósfera | campo `esfera` en iniciativas, capacidades y necesidades |
| Mesas con municipio (indicador «Articulación institucional») | `relaciones` con nivel N3 cuando el organismo valida |
| Módulo 6 (Ley 20.285, datos abiertos) | `fuentes` y `iniciativas` con origen `fuente_publica` |
| Módulo 12 (red = observatorio) | continuidad: este sitio es el instrumento |

Campo nuevo `origen`: `fuente_publica`, `programa_liderazgo`, `aporte_comunitario`, `mapa_osm`. Los aportes del mapa (Aporta → Hoja y Aprobado) entrarían como N0 y suben a N1 al ser aprobados por la administración, y a N2 con corroboración.

## 4. Efecto en tu DSM del sitio (cálculo propio, mismo método que tu hoja «DSM del sitio»)
Dos nodos nuevos y siete aristas propuestas:
| De → A | Tipo |
|---|---|
| Portada y mapa → Observatorio | → activa |
| Observatorio → Directorio y fichas | → activa |
| Programa de Liderazgo → Observatorio | → activa |
| Observatorio → Programa de Liderazgo | → activa |
| Hoja y Aprobado → Observatorio | ◌ pendiente |
| Activos OSM → Observatorio | ◌ pendiente |
| Observatorio → Portada y mapa (capa en el mapa) | ◌ pendiente |

Bucles cerrados hoy (→ y ＋): **21 → 26**. Con el circuito completo (incluye ◌): **31 → 71**. Los bucles nuevos pasan por el observatorio y el programa; el cuello de botella sigue siendo la administración (moderación).

## 5. Pendiente de tu decisión
- Los datos de personas: el validador bloquea correos, RUT y teléfonos; los aportes comunitarios deben pasar tu protocolo de privacidad antes de llegar aquí. La Ley 21.719 rige plenamente desde el 1-dic-2026 según tu propio programa: confirma con la BCN.
- La conexión Hoja y Aprobado → Observatorio (◌) requiere definir cómo se exportan los aportes aprobados; no la construí porque no vi ese flujo.
- Completar la sección «Acerca» y la licencia de datos (CC BY 4.0 sugerida).

## 6. Solicitudes de transparencia
- Una fila por solicitud: `SOL-000N`, código del portal, fecha, entidad, estado y tipo de respuesta. Al llegar la respuesta: agrega el PDF como fuente (`SRC-`), cambia `estado` a `respondida`, completa `fecha_respuesta` y `tipo_respuesta` (`entrega_total`, `entrega_parcial`, `no_obra_en_poder`, `derivacion`, `denegacion`).
- `construir.py` estima plazos (20 días hábiles para responder, 15 para amparo) con `observatorio/esquema/feriados.json`; actualízalo cada año. Son estimaciones: manda el acuse.
- Una respuesta «no obra en su poder» no es un dato vacío: se registra como fuente y, si corresponde, como necesidad o hipótesis (ver NEC-0001 y HIP-0001).

## 7. Datos personales: qué NO subir
Los PDF (acuse y Ord. 108) contienen teléfono y correo del solicitante y nombres de funcionarios. En un repositorio público suben solo los metadatos de los CSV. Los PDF van a un repositorio privado (`archivo_respaldo` indica `repositorio_privado:nombre.pdf`). El validador bloquea correos, RUT y teléfonos en los CSV.
