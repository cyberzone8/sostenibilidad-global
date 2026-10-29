# Metodología

## Principio
Toda afirmación publicada es un **registro** con: ID estable, fuente(s), fecha de revisión y nivel de verificación. Sin fuente no hay publicación (salvo hipótesis N0, marcadas como tales).

## Niveles de verificación
| Nivel | Criterio |
|---|---|
| N0 | Hipótesis o dato sin verificar |
| N1 | Una fuente pública |
| N2 | Documento oficial/norma, o dos fuentes independientes |
| N3 | Validado por el propio organismo (dejar constancia en notas) |

## Cadena sistémica
Fuente → Actor → Relación / Iniciativa → Capacidad ↔ Necesidad → Hipótesis → Validación.
Las hipótesis conectan capacidades con necesidades: son el producto analítico del observatorio.

## Reglas
1. Distinguir dato institucional, análisis propio e hipótesis.
2. Ausencia de evidencia ≠ inexistencia de relación.
3. No publicar datos personales (el validador bloquea correos, RUT y teléfonos). Revisar Ley 20.285, Ley 19.628 y Ley 21.719 (verificar fecha de entrada en vigor vigente).
4. No atribuir participación o aprobación a organismos que no la hayan dado.
5. Revisar cada registro al menos cada 180 días.
6. Respaldar cada fuente (archivo en `fuentes_respaldo/` o enlace de archivo web).

## Dónde vive el esquema
Las tablas, columnas, obligatorios, vocabularios y referencias están definidos una sola vez en `observatorio/esquema/esquema.json` (listas controladas en `vocabularios.json`). El validador, el constructor y la página leen ese archivo, y el validador avisa si el formulario de Issues se desfasa.

## Identificadores
SRC- fuentes · ACT- actores · REL- relaciones · INI- iniciativas · CAP- capacidades · NEC- necesidades · HIP- hipótesis. Numeración correlativa de 4 dígitos (ej. ACT-0012). Un ID nunca se reutiliza.

## Lente de sostenibilidad global
Campo `ods` (1–17) en iniciativas, capacidades y necesidades; permite medir cobertura y vacíos por objetivo.
