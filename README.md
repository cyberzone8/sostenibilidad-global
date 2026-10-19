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
