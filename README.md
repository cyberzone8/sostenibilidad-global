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
