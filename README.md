# Sitio Sostenibilidad Global SpA

Sitio de una página sobre OpenStreetMap. No necesita compilar nada.

## Estructura
- `index.html`: estructura de la página.
- `assets/css/styles.css`: estilos.
- `assets/js/app.js`: lógica (mapa, etiquetas, paneles).
- `data/config.json`: textos de portada, contacto, centro del mapa y capa de mapa.
- `data/servicios.json`: las etiquetas de áreas de trabajo.
- `data/secciones.json`: los paneles del menú superior.
- `vendor/leaflet/`: librería del mapa (incluida, no depende de internet).

## Agregar una etiqueta
En `data/servicios.json`, copia un bloque dentro de `"servicios"` y cambia `id` (único, sin espacios), `grupo` (`residuos` o `ambiental`), `titulo`, `resumen`, `acciones` y `ods`. Haz commit y en un minuto aparece.

## Apagar una etiqueta
Cambia `"activo": true` por `"activo": false`. No se borra nada y puedes volver a encenderla.
Lo mismo funciona para los paneles del menú en `data/secciones.json`.

## Probar en tu computador
No abras `index.html` con doble clic: los navegadores bloquean leer los datos y el mapa.
En la carpeta del sitio ejecuta `python3 -m http.server 8000` y abre http://localhost:8000

## Publicar en GitHub Pages
1. Sube todo el contenido de esta carpeta a la raíz del repositorio.
2. Settings → Pages → Deploy from a branch → `main` / `(root)` → Save.
3. Espera uno o dos minutos y abre la dirección que te muestra.

## Mapa
El mapa base es de OpenStreetMap y exige mostrar su atribución (ya incluida) y enviar el sitio de origen, lo que ocurre al publicarlo en https. Si algún día el tráfico crece, cambia `mapa.teselas.url` en `config.json` por un proveedor de teselas propio.
Leaflet: licencia BSD-2 (ver `vendor/leaflet/LICENSE`).

## Registro de empresas en el mapa
- Las personas llenan el formulario de la pestaña «Registra tu empresa» y se abre WhatsApp con el mensaje listo (el sitio no guarda nada).
- Tú verificas y, si corresponde, agregas la empresa en `data/empresas.json` (copia el bloque de ejemplo, usa `lat`/`lng` del mensaje y pon `"activo": true`).
- Precio: en `data/config.json` → `registro.precioUF` pon el número (por ejemplo `2`). Mientras sea `null` se muestra que el valor se informa por WhatsApp.
- Teléfono/WhatsApp, correo y LinkedIn están en `data/config.json` → `sitio`.
- La pestaña «Programa» abre el enlace en una pestaña nueva (campo `enlaceDirecto` en `data/secciones.json`).

## Modo empresa (ficha de una empresa adherida)
La misma página se muestra con la marca y el mapa de una empresa agregando `?e=<id>` a la dirección. Ejemplo del prototipo: `index.html?e=diesel-jj`.
- Cambia el nombre del botón superior, el título, el texto de portada, los servicios (etiquetas), el horario, el botón de WhatsApp, «Cómo llegar» y la zona de atención (círculo en el mapa). Incluye un enlace de vuelta a «Parte de la red Sostenibilidad Global».
- Los datos salen de `data/empresas.json`. Una empresa que tiene `servicios` muestra «Ver ficha de la empresa» en su globo del mapa general.
- Campos: `nombre`, `rubro`, `comuna`, `direccion`, `descripcion`, `lat`, `lng`, `telefono`, `whatsapp` (si va vacío usa el de Sostenibilidad Global), `mensajeWhatsApp`, `horario` (días 1 = lunes … 7 = domingo), `horarioNota`, `cobertura` (`texto`, `radioKm`) y `servicios` (`titulo`, `detalle`).
- `"prototipo": true` marca la ficha como datos de ejemplo. Quítalo cuando la empresa confirme sus datos. Si no quieres mostrar el prototipo al publicar, pon `"activo": false`.
- Diesel J.J: los textos, el horario, los servicios y la ubicación (centro de Mulchén) son ejemplos por confirmar con el taller.
- La ficha se arma con JavaScript. Para que Google indexe cada ficha en el futuro conviene generar una página estática por empresa.

## Página del piloto (valorizacion/)
La maqueta de la página tiene dos modelos que funcionan a la vez sobre un mismo estado:
- **Modelo de red (efecto en cadena):** tres residuos recorren Recepción → Proceso → Producto → Caja. Al tocar un nodo (o pulsar «Ver qué le pasa a la planta») la falla se propaga hacia la derecha: nodos y tramos pasan de verde (sana) a ámbar (arrastrada) y rojo (falla), y el grosor del tramo baja con el flujo que se pierde.
- **Modelo de balance:** el mismo estado calcula ingresos, costos y margen por residuo (M$ por mes). Muestra quién gana, quién resta y cuánto cambia contra la situación normal (línea oscura).
- Cubo, piezas e índice 0–100 se calculan con ese mismo balance. Los botones Antes / Durante / Después cortan la cadena en distinto punto.
- **Alcance:** selector «Toda la planta» o «Piloto · una línea». En el piloto solo esa línea recibe la intervención; las otras siguen como hoy (se atenúan en la red y en el balance).
- **Panel de ofrecimiento:** al elegir Antes / Durante / Después muestra el retorno por cada $1 (×6, ×3, ×2, constantes `OFR`), % de pérdida evitada, inversión equivalente y margen, calculados con el mismo modelo. Incluye un botón de WhatsApp con el alcance y el momento elegidos.
- **Sección «Alternativas»:** alcances (una línea, varias, toda la planta) y los cuatro productos, cada uno ligado a un momento; los botones «Ver … ↑» llevan a la simulación con esa selección.
- Las cifras están al inicio del script (`LANES`, `ADMIN`, `AFF`): son ilustrativas y se reemplazan con datos reales en el piloto.

## Ilustraciones del mapa por servicio
Al abrir cualquier servicio, el mapa dibuja una escena geométrica propia (puntos, flechas, anillos, polígonos) que aparece por etapas, igual que la ruta de «Trazabilidad con mapa». El botón «↻ Repetir» del panel la vuelve a dibujar.
- Las escenas están en `assets/js/escenas.js` (una función por servicio, con el mismo `id` de `servicios.json`).
- El texto «En el mapa: …» sale de `servicios.json` → `mapa.leyenda`.
- Son ejemplos ilustrativos, no datos reales. Para crear una nueva: agrega `E["mi-id"] = (h) => { ... }` usando `h.dot`, `h.arrow`, `h.curve`, `h.ring`, `h.hex`, `h.badge`, `h.pulse` y `h.step()` para separar etapas.

## Contador de visitas
`assets/js/contador.js` usa GoatCounter (sin cookies). Crea la cuenta en goatcounter.com, escribe el código en `data/config.json` → `contador.goatcounter` y activa en GoatCounter «permitir mostrar el conteo en páginas públicas» para que se vea el total al pie de `valorizacion/`. Vacío = no cuenta ni muestra nada.

## Red de empresas (v12): ficha propia, directorio y conexiones
Cada empresa de `data/empresas.json` tiene una **ficha pública** (`empresas/<id>/`) y aparece en el **directorio** (`directorio/`) con buscador y filtros por rubro y comuna. Esas páginas se **generan solas** con `tools/generar.py`:
- En GitHub: al cambiar `data/empresas.json`, las fotos o la taxonomía, la acción `.github/workflows/generar.yml` regenera todo y lo guarda (tarda 1 o 2 minutos). No hay que hacer nada más.
- En tu computador: `python3 tools/generar.py` (opcional `pip install segno` para el código QR).

### Agregar un cliente
1. En `data/empresas.json` copia el bloque `ejemplo`, cambia el `id` (minúsculas y guiones), los datos, y pon `"activo": true`.
2. Fotos: `python3 tools/optimizar-imagenes.py <carpeta-de-fotos> <id>` las reduce y las deja en `assets/empresas/<id>/`; pega los nombres en `imagenes` (la primera es la portada) y en `servicios[].imagen`. También puedes subir JPG de hasta 1400 px y menos de 400 KB.
3. Teléfono: `telefono` (botón «Llamar») y `whatsapp` (solo números con código de país). Si `whatsapp` va vacío, los mensajes llegan a Sostenibilidad Global.
4. `rubroId` (de `data/taxonomia.json`) clasifica en el directorio; `relacion` conecta la empresa con servicios de Sostenibilidad Global (aparece en las dos direcciones); `plan` (`gratis`, `socio`, `aliado`) ordena el directorio.
5. Antes de publicar: autorización por escrito de la empresa, anotada en `consentimiento`. Quita `"prototipo": true` cuando confirme sus datos.

### Dirección pública
En `data/config.json` → `sitio.url` escribe la dirección del sitio (con `/` al final). Con eso se activan el código QR de cada ficha, el sitemap y los enlaces para compartir.

### Medición
Cada botón de contacto envía el origen en el mensaje de WhatsApp («Origen: ficha web · Diesel J.J») y, con GoatCounter activo, cuenta eventos `wa/<empresa>/<origen>`, `tel/…`, `dir/…` y `ficha/…`.

### Código
`assets/js/comun.js` reúne lo compartido (escapar texto, «abierto ahora», WhatsApp con origen, medición). `assets/css/ficha.css` y `assets/js/ficha.js` son de las páginas generadas. El menú muestra 5 entradas y el resto bajo «Más»; en celular todo queda bajo el botón «Menú».

## v13: financiamiento, formularios de Google, privacidad y visibilidad
- **Áreas de trabajo → «Financiamiento, innovación y exportación»:** 6 servicios nuevos (proyectos Corfo, fondos para emprender, exportación, postulación y rendición, fondos regionales, proyectos asociativos). Los textos no incluyen montos ni fechas, porque cambian en cada convocatoria; cada servicio avisa que se confirman en las bases vigentes y que no se garantiza la adjudicación. Cada uno tiene su escena en el mapa (`assets/js/escenas.js`).
- **Formularios de Google:** pega los enlaces en `data/config.json` → `formularios` (`empresa`, `residuo_generador`, `planta_gestor`, `contacto`). Hoy el de `empresa` aparece en «Únete a la red» y en el directorio; los otros quedan listos para los portales. Pide solo lo necesario y agrega a cada formulario el texto «Al enviar aceptas el aviso de privacidad» con el enlace a `privacidad/`.
- **`privacidad/`:** aviso de privacidad en BORRADOR. Revísalo con asesoría legal antes de publicar (la Ley 21.719 tiene vigencia legal el 1 de diciembre de 2026; hay un proyecto de postergación en trámite). Completa el plazo de conservación (hay un comentario en el HTML).
- **Visibilidad:** este repositorio es público. `data/empresas.json` solo lleva empresas **públicas**. Las **reservadas** (aparecen anónimas y el contacto lo haces tú) y las **privadas** (nunca se muestran) viven solo en el repositorio privado. Si alguien pone `visibilidad` distinta de `publica` aquí, `tools/generar.py` se detiene.
- **Regla de oro para el repositorio público:** el historial de Git es permanente. Nunca subas datos personales ni de empresas reservadas, ni siquiera por un minuto; borrarlos después no los saca del historial.

## v14 – Salud comunitaria, tres dimensiones y activos comunitarios

- **Dimensiones explícitas**: filtro Ambiental / Social / Económica en el panel de servicios (campo `dimensiones` en `data/servicios.json`). Dos grupos nuevos (social, economía) y 9 servicios nuevos (activos comunitarios, electrodependencia, equidad rural, participación, salud comunitaria, resiliencia, economía social, evaluación económica, negocios de impacto).
- **Capa de activos comunitarios** (postas, CESFAM, hospitales, escuelas, juntas de vecinos, etc.) desde OpenStreetMap, con casillas "Salud" y "Comunidad".
  - Antes de una presentación: `python3 tools/importar-activos.py` (o Actions → "Importar activos") para guardar `data/activos.json`. Si el archivo está vacío, el navegador consulta Overpass en vivo (necesita internet).
  - OSM puede estar incompleto o desactualizado: verifica y corrige los datos antes de mostrarlos.
- **Ejemplo de electrodependencia**: usa hogares y cortes **ficticios** (se rotulan "datos ficticios"). Nunca subir datos reales de personas a este repositorio público. En un caso real: trabajo por zonas, consentimiento, evaluación de impacto y resguardos de datos sensibles (Ley 21.719).
- **Modo presentación**: botón en el panel de capas o tecla **P** → mapa a pantalla completa con la escena; Esc/P para salir.

## v15 – Sonido, eventos, radio digital y difusión
- **Servicio nuevo** «Sonido, eventos, radio digital y difusión de información clave» (`id: sonido-radio`, grupo «Mercado, marca y comunicación») en `data/servicios.json`, con escena propia en el mapa (`assets/js/escenas.js`) y botón «Escuchar la radio» que abre `radio/`.
- **Botón flotante «Radio ProBio»** en la portada (`index.html` + `.fabr` en `styles.css`) lleva a `radio/`. El nombre es provisorio: antes de usarlo, busca la marca en INAPI (clases 38 y 41) y cámbialo en `radio/index.html` → `NOMBRE_RADIO`, el título y el botón de `index.html`.
- **`radio/`**: página de la radio en línea con el estilo del sitio. Pega la URL de tu streaming en `radio/index.html` → `STREAM_URL` (mientras esté vacía, el botón avisa que la señal se activa pronto). El nombre de la radio está en `NOMBRE_RADIO`; el WhatsApp es el del sitio.
- La página se agregó al sitemap (`tools/generar.py`).

## v16 – Control del panel «Capas del mapa»
El panel de la esquina inferior derecha ahora se puede plegar (▾) y trae:
- **Mapa base:** Calle (OpenStreetMap), Gris (resalta las capas) o Sin mapa base. Sigue usando solo teselas de OpenStreetMap.
- **Capas:** Salud, Comunidad, Empresas registradas e Ilustración del servicio, cada una con su casilla.
- **Filtro por tipo** dentro de Salud y Comunidad (Hospital, CESFAM, Posta rural, Biblioteca, etc.). Los tipos salen de los datos de `data/activos.json`; el contador muestra «2 de 4» cuando hay tipos ocultos.
- **Intensidad** del mapa base y de las capas (30 a 100 %), útil para destacar los puntos en una presentación.
- **Mostrar nombres** de los puntos (solo se ven al acercar el mapa, desde el zoom 12).
- **Mostrar todas / Ocultar todas / Centrar en las capas** (encuadra los puntos visibles).
- Lo que elijas se recuerda **solo en ese navegador** (localStorage); no se envía a ningún lado. Si el navegador no lo permite, el panel funciona igual sin recordar.
- En celular el panel parte plegado. En «Modo presentación» con un servicio abierto, el panel pasa al lado izquierdo para no tapar el detalle.
- Desmarcar «Ilustración del servicio» hace que al abrir un servicio no se dibuje la escena en el mapa (queda solo el texto).
- La tecla **P** ahora funciona aunque el foco esté en una casilla o deslizador del panel (sigue sin activarse al escribir en un campo de texto).
- El código está en `assets/js/app.js` (funciones `initCapas`, `dibujarActivos`, `setBase`, etc.) y los estilos en `assets/css/styles.css` (sección v16).

## v17 · Laboratorio de datos (taller de salud comunitaria)

Nueva sección **Laboratorio de datos** (menú «Más») con cuatro herramientas que corren 100 % en el navegador:

1. **Mapear**: la comunidad marca activos (5 tipos, sin personas ni domicilios), valida aportes y exporta GeoJSON/CSV. Se guarda solo en ese navegador. Botón «Cargar ejemplo con errores» (datos ficticios).
2. **Calidad**: completitud, unicidad (posibles duplicados), vigencia y validación, cada una con su regla visible.
3. **Cercanía**: activos más cercanos a un sector, radio y cobertura del área visible (línea recta, sin población).
4. **Dinámica**: modelo ilustrativo de dos reservas (vigencia del dato y población que conoce los activos), con crisis y comparación sin mapa / mapa sin mantención / mapa verificado.

Archivos: `assets/js/laboratorio.js` (funciones puras probables en Node: `node -e "require('./assets/js/laboratorio.js')"`), entrada en `data/secciones.json` (`laboratorio:true`), casilla «Aportes de la comunidad (taller)» en Capas.

**Antes de la charla:** importar los activos reales (Acción «Importar activos» o `python3 tools/importar-activos.py`); sin eso, las pestañas Calidad y Cercanía solo tendrán los aportes de ejemplo.

## v18 – Radio con música desde el repositorio (sin servidor) y GitLab
- **Música:** pon tus MP3 en `audio/` y ejecuta `python3 tools/crear-playlist.py`; eso actualiza `data/playlist.json` (título, autor, licencia y duración; lo que escribas a mano se conserva). La página `radio/` reproduce la lista en bucle. Si todas las pistas tienen duración, funciona como una radio: todos escuchan el mismo momento de la lista; si no, hay botones anterior/siguiente.
- Hoy hay 3 pistas **de demostración** generadas por síntesis (sin terceros). Bórralas y reemplázalas por música propia o con licencia libre/autorizada (SCD y otras). Anota la licencia en `playlist.json`.
- Límites: archivos de hasta ~20 MB (96–128 kbps), y el repositorio completo bien por debajo de 1 GB. Con `STREAM_URL` en `radio/index.html` se puede usar un servidor de streaming en vez de la lista.
- **Panel de capas:** además de plegarse (▾), ahora tiene «×» para quitarlo; la tecla **C** lo vuelve a mostrar.
- **GitLab:** `.gitlab-ci.yml` publica el sitio en GitLab Pages. Las acciones de `.github/workflows` solo corren en GitHub: en GitLab ejecuta `python3 tools/generar.py` y `tools/importar-activos.py` en tu computador antes de subir.

## v19 – Menú agrupado
- El menú superior ahora tiene 5 entradas: **Quiénes somos ▾** (Quiénes somos, Método, Alianzas, Futuro sostenible, Expertos Chile), **Servicios** (lleva a las áreas de trabajo), **Red ▾** (Directorio, Únete a la red, Anuncios), **Aprende ▾** (Laboratorio de datos, Programa) y **Contacto** (botón destacado).
- Cómo se edita: cada sección de `data/secciones.json` elige su `grupo`; los grupos y su orden están en `data/config.json` → `menu.grupos`. Un grupo con una sola sección se muestra como botón directo; `"destacado": true` pinta el botón; `"accion": "areas"` abre el panel de áreas en vez de una sección. Si borras el bloque `menu`, vuelve el menú anterior (`principal` / «Más»).
- En celular el botón «☰ Menú» muestra los grupos como acordeón y abre el de la sección actual.

## v20 – Botón de radio con ▶ en la portada
- La etiqueta flotante «Radio ProBio» tiene un botón **▶** que reproduce la música ahí mismo (sin salir del mapa; cambia a ❚❚ y muestra qué suena). Un clic en cualquier otra parte de la etiqueta abre la página `radio/`. Como la lista funciona como radio (todos escuchan el mismo momento), al abrir `radio/` mientras suena se retoma en el mismo punto.
- La lógica está en `assets/js/radio-core.js` (compartida) y `assets/js/radio-mini.js` (portada). El nombre y el streaming opcional están ahora en `data/config.json` → `radio` (`nombre`, `streamUrl`); ya no hay que editar `radio/index.html`.

## v21 – Licitaciones de Mercado Público por comuna (Biobío)
- **Servicio nuevo** «Compras públicas: licitaciones por comuna» (grupo «Datos, mapas y geoespacial»). Al abrirlo, el mapa dibuja una burbuja por comuna (33 comunas; tamaño y color según la cantidad de licitaciones activas) y el panel muestra el total y el ranking.
- **Hoy los números son FICTICIOS** (`data/licitaciones.json` → `"demo": true`; el panel lo avisa). Se reemplazan solos al conectar la API.
- **Conectar la API real:**
  1. Pide tu ticket gratis en api.mercadopublico.cl (ChileCompra). Es personal: **no lo pegues en el sitio ni en ningún archivo**.
  2. GitHub: Settings → Secrets and variables → Actions → New secret `MP_TICKET`. Luego Actions → «Actualizar licitaciones» → Run workflow (después corre solo cada día). La primera vez tarda (consulta el detalle de cada licitación activa del país, con pausa entre llamadas); las siguientes solo consultan las nuevas.
  3. GitLab/computador: `MP_TICKET=… python3 tools/importar-licitaciones.py` y sube `data/licitaciones.json`.
- **Qué cuenta:** licitaciones **activas** según la **comuna del organismo comprador** (no donde se ejecuta el contrato). Son licitaciones publicadas, no las ofertas que reciben. Las que no traen comuna reconocida se informan aparte («sin comuna»).
- La ubicación de cada comuna es referencial (`data/comunas-biobio.json`), no sus límites. Cita la fuente: ChileCompra · Mercado Público.
- Código: `assets/js/licitaciones.js`, `tools/importar-licitaciones.py`, `.github/workflows/licitaciones.yml`. El importador no se pudo probar contra la API real desde el entorno de desarrollo (sin acceso a internet): revisa la primera ejecución.

## v22 – Menú con licitaciones y caso de salud comunitaria
- **Red → Licitaciones por comuna** abre el servicio de v21 (mapa de burbujas por comuna).
- **Aprende → Caso: corte de luz y electrodependencia:** caso **ficticio** en 7 pasos (de la hora 0 al cierre) con el aviso por radio y los resguardos de datos de salud. El botón «Ver el caso en el mapa» abre la escena de electrodependencia (hogares y cortes ficticios, activos comunitarios cercanos).

## v23 – Aporta al mapa (QR + Formulario de Google)
**Idea:** en la charla proyectas el QR (`aporta/qr/`), las personas aportan desde el celular y, cuando tú apruebas cada aporte, aparece en el mapa. El formulario **no va incrustado** en el sitio: se abre en otra pestaña, así el diseño no se toca.
1. **Crea el Formulario de Google** con estas preguntas, con estos títulos exactos: *Tipo* (lista: Árbol o área verde · Plaza o espacio público · Evento o actividad · Organización o club · Servicio de salud · Comercio o emprendimiento · Otro), *Nombre*, *Descripción* (párrafo, opcional), *Latitud*, *Longitud* (respuesta corta). En Configuración: **no** recopilar correos y **no** exigir iniciar sesión. Agrega al inicio el texto: «No escribas nombres de personas, direcciones de casas ni teléfonos. Al enviar aceptas el aviso de privacidad (enlace a `privacidad/`)».
2. **Pega el enlace** (Enviar → icono de enlace `…/viewform`) en `data/config.json` → `formularios.aporte`.
3. **Relleno automático (opcional):** en el formulario, ⋮ → «Obtener enlace prellenado», llena un ejemplo, «Obtener enlace»; de la dirección copia cada `entry.123456789` a `formularios.aporteCampos` (tipo, nombre, descripcion, lat, lng). Así la persona marca el lugar en el mapa de `aporta/` y el formulario ya viene con las coordenadas.
4. **Mapa en vivo:** en la hoja de respuestas, agrega una columna **Aprobado**. Archivo → Compartir → **Publicar en la web** → hoja de respuestas, formato **CSV** → Publicar; pega ese enlace en `data/config.json` → `aportes.csvUrl`. Solo se dibujan las filas con `SI` en Aprobado (moderación; `aportes.moderacion:false` las muestra todas). Google refresca el CSV publicado cada pocos minutos, así que un aporte puede tardar en verse.
5. **QR:** `tools/crear-qr.py` lo regenera si cambia la dirección del sitio (hoy apunta a `https://cyberzone8.github.io/sostenibilidad-global/aporta/`). Proyecta `aporta/qr/` en pantalla completa (F11).
- Menú: **Red → Aporta al mapa**. Capa: «Aportes en vivo» en el panel de capas.
- Privacidad: la hoja publicada es pública; por eso el formulario no pide nombres ni correos. Revisa cada fila antes de escribir SI.

## v24 – Una red que crece sola y tú administras
Responde a la auditoría de v23 y a la estructura «Comunidad, células y programa».
- **Circuito de aportes completo.** `aporta/` guarda el origen (`?o=`) y lo pasa al formulario, muestra los aportes que ya existen (evita repetidos), y al terminar ofrece **Invitar a 3 personas** (B4), **Únete a la Comunidad** (B3) y, si es comercio u organización, **Aparecer en el directorio** (efecto cruzado). El QR de la charla ahora lleva `?o=qr-charla`.
- **Verificación entre pares (B2).** Cada globo del mapa trae «✓ Lo confirmo» y «✎ Corregir», que abren el formulario prellenado con «CONFIRMACIÓN: …» / «CORRECCIÓN: …». El sitio cuenta las confirmaciones (filas a menos de 60 m con ese encabezado) y las muestra («✓ 2 personas lo confirman»). Tú sigues aprobando con `SI`; si quieres que los pares resuelvan, pon `aportes.confirmacionesParaMostrar: 2` (muestra un aporte con 2 confirmaciones y ninguna corrección). **Riesgo:** sin identidad, una persona puede confirmar dos veces: parte en 0 y súbelo con cuidado.
- **`admin/` (panel del administrador).** Qué falta conectar (11 comprobaciones), KPIs, origen de los aportes, cola de revisión con mapa y repetidos, informe por comuna (aportes + activos + licitaciones), bucles B1–B7 con su dueña, matriz piezas × células y agenda de la semana. Solo lee datos públicos; no tiene claves. `admin/?demo=1` ensaya con datos ficticios.
- **`en-vivo/` (pantalla para proyectar en la charla).** QR grande, mapa, contador, aportes por tipo y últimos aportes. Se actualiza cada 20 s, pero Google publica el CSV con unos minutos de retraso. `en-vivo/?demo=1` ensaya sin conexión.
- **`comunidad/`.** Los 8 grupos (Anuncios, Asamblea, 5 células y Directiva), la carta de grupo, los grupos creados por la gente (`data/grupos.json`, hoy 2 de ejemplo) y el programa semanal con el día resaltado. Datos en `data/comunidad.json`; pon el enlace de cada grupo en `enlace` y el de la Comunidad en `config.json → comunidad.url`. Menú: **Red → Comunidad y células**.
- **Callejones cerrados.** El Laboratorio, la Radio y Valorización ahora invitan a «Aporta un lugar» o a la Comunidad. En `data/playlist.json` cada pista puede llevar `"enlace": "aporta/?o=radio-activo-semana"` y `"accion": "Aporta el tuyo"` (botón bajo «Suena»): así cada cápsula mide qué convoca más.
- **Rótulos honestos.** La radio avisa «Música de demostración» (`"demo": true` en `playlist.json`; quítalo con música real) y el menú dice «Licitaciones por comuna (ejemplo)» hasta conectar el ticket.
- **Contacto.** La sección Contacto ofrece primero la Comunidad y las células, y deja WhatsApp personal como alternativa.
- **Para el administrador:** `config.json` nuevo → `comunidad.url`, `formularios.grupo`, `aporteCampos.origen`, `aportes.hojaUrl`, `aportes.confirmacionesParaMostrar`. Pregunta nueva en el formulario: «Origen» (respuesta corta).
