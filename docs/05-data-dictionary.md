# Diccionario de Datos — Exportación CSV

**Universidad de Costa Rica — PF-3311 · Agentes Virtuales Inteligentes**
**Estudiante:** Gabriel Isaías Fallas López · I Semestre 2026

Este documento describe cada columna del CSV que produce `GET /api/export?format=csv`
(una fila por participante). El JSON completo (`?format=json`) conserva además el historial
de mensajes íntegro. Generado por [`src/server/telemetry/export.ts`](../src/server/telemetry/export.ts).

> Diseño *post-only*: todos los cuestionarios se aplican una vez al final. Las métricas
> conductuales se capturan automáticamente del flujo de mensajes, sin auto-reporte.

## Identificación y sesión

| Columna | Tipo | Descripción |
|---|---|---|
| `sessionId` | texto | Identificador anónimo del participante (`P-001`, …). Sin nombre ni correo. |
| `condition` | `A`/`B` | Condición (crossover: la **primera** de la secuencia; entre-sujetos: la única). |
| `design` | `crossover`/`between` | Diseño de la sesión. `crossover` = intra-sujeto (ambas condiciones); `between` = una condición (sesiones iniciales). |
| `sequence` | texto | Orden de condiciones en crossover, p. ej. `A→B` (vacío si entre-sujetos). |
| `startTime` | ISO-8601 | Marca de inicio de la sesión. |
| `endTime` | ISO-8601 | Marca de cierre (vacío si la sesión no se cerró). |
| `durationSec` | entero | Duración total de la sesión en segundos. |

## Conversación y latencia (RQ4)

| Columna | Tipo | Descripción |
|---|---|---|
| `totalTurns` | entero | Número de mensajes del usuario (turnos). |
| `totalMessages` | entero | Total de mensajes (usuario + asistente). |
| `avgTtftMs` | ms | Latencia media de *time-to-first-token* (latencia percibida). |
| `maxTtftMs` | ms | Latencia máxima de TTFT. |
| `p95TtftMs` | ms | Percentil 95 de TTFT (cola de latencia). |
| `pctTtftUnder1500` | % | Porcentaje de respuestas con TTFT < 1.5 s (objetivo RQ4). |

## Métricas conductuales automáticas (RQ2 / engagement)

Derivadas del flujo de mensajes almacenado; **no** dependen de auto-reporte.

| Columna | Tipo | Descripción |
|---|---|---|
| `userMsgCount` | entero | Cantidad de mensajes escritos/dictados por el participante. |
| `avgUserMsgChars` | entero | Caracteres promedio por mensaje del usuario (elaboración). |
| `avgUserMsgWords` | entero | Palabras promedio por mensaje del usuario. |
| `avgThinkTimeMs` | ms | Tiempo medio entre la respuesta del tutor y la siguiente respuesta del usuario (reflexión). Se ignoran pausas > 10 min. |
| `medianThinkTimeMs` | ms | Mediana del *think-time* (robusta a valores atípicos). |
| `voiceInputCount` | entero | Mensajes compuestos por voz (Whisper STT, Condición A). |
| `voiceInputRatio` | 0–1 | Proporción de mensajes por voz sobre los mensajes con modo identificado. |
| `totalRings` | entero | Anillos acumulados en la sesión (engagement gamificado, Condición A). |

## Agregados por condición (RQ2 — unidad principal del análisis A vs B)

En *crossover* cada condición incluye **ambas** tareas; en entre-sujetos, la(s) tarea(s) de la
única condición. `analyze.py` y el panel `/admin` usan estas columnas para comparar A vs B.

| Columna | Tipo | Descripción |
|---|---|---|
| `condA_resolutionRate` / `condB_*` | 0–1 | Proporción de tareas resueltas autónomamente en esa condición. |
| `condA_turns` / `condB_*` | entero | Turnos promedio por tarea en esa condición. |
| `condA_avgTimeSec` / `condB_*` | seg | Tiempo promedio por tarea en esa condición. |
| `condA_avgTtftMs` / `condB_*` | ms | Latencia TTFT media de esa condición. |

## Resultados por tarea (detalle, RQ2)

Prefijos `task1_` (bucle infinito) y `task2_` (complejidad algorítmica) — en *crossover* reflejan
la **primera** aparición de cada tarea (Bloque 1); el detalle completo de las 4 corridas está en el
export JSON. Para el análisis use los agregados `cond{A,B}_*` de arriba.

| Columna | Tipo | Descripción |
|---|---|---|
| `taskN_condition` | `A`/`B` | Condición en que se resolvió la tarea (crossover: difiere entre tareas; vacío en sesiones entre-sujetos). |
| `taskN_resolved` | 0/1 | Resolución autónoma (pruebas ocultas pasaron sin código directo del tutor). |
| `taskN_resolution` | texto | `tests-passed`, `timeout` o `gave-up`. |
| `taskN_turns` | entero | Turnos conversacionales en la tarea. |
| `taskN_timeSec` | seg | Tiempo dedicado a la tarea. |
| `taskN_runAttempts` | entero | Veces que ejecutó su código en Pyodide. |
| `taskN_testsPassed` | 0/1 | Si el arnés de pruebas ocultas pasó en la última ejecución. |
| `taskN_codeEdited` | 0/1 | Si el participante modificó el código inicial. |
| `taskN_avgTtftMs` | ms | Latencia media de TTFT durante la tarea. |
| `taskN_rings` | entero | Anillos obtenidos en la tarea (Condición A). |

## Puntajes de cuestionarios

Formato de columna: `q_<instrumento>_<etiqueta>_<score>`. La **etiqueta** es:
- **`A` / `B`** en sesiones *crossover* — la batería se aplica una vez por condición, así que cada
  instrumento aparece dos veces, p. ej. `q_godspeed_A_overall` y `q_godspeed_B_overall`.
- **`x`** (godspeed/sus/nasa-tlx) o **`post`** (pedsupport/panas-sf) en sesiones *entre-sujetos*
  iniciales, p. ej. `q_godspeed_x_overall`, `q_pedsupport_post_total`.

Las columnas legacy (`_x_` / `_post_`) y las de crossover (`_A_` / `_B_`) coexisten en el mismo CSV;
el panel `/admin` y `scripts/analyze.py` agrupan ambas en la comparación A vs B por condición.

| Columna (crossover / legacy) | Rango | Descripción |
|---|---|---|
| `q_godspeed_{A,B}_anthropomorphism` / `q_godspeed_x_anthropomorphism` | 1–5 | Antropomorfismo percibido (RQ1). |
| `q_godspeed_{A,B}_animacy` / `q_godspeed_x_animacy` | 1–5 | Vitalidad percibida. |
| `q_godspeed_{A,B}_likeability` / `q_godspeed_x_likeability` | 1–5 | Agrado. |
| `q_godspeed_{A,B}_intelligence` / `q_godspeed_x_intelligence` | 1–5 | Inteligencia percibida. |
| `q_godspeed_{A,B}_overall` / `q_godspeed_x_overall` | 1–5 | Media global Godspeed. |
| `q_pedsupport_{A,B}_total` / `q_pedsupport_post_total` | 1–5 | Apoyo pedagógico percibido (media de 5 ítems, adaptado de Essel 2024) (RQ1). |
| `q_sus_{A,B}_total` / `q_sus_x_total` | 0–100 | System Usability Scale. |
| `q_nasa-tlx_{A,B}_rawTlx` / `q_nasa-tlx_x_rawTlx` | 0–100 | Carga cognitiva (RTLX, media no ponderada) (RQ3). |
| `q_panas-sf_{A,B}_positiveAffect` / `q_panas-sf_post_positiveAffect` | 5–25 | Afecto positivo post-sesión (RQ3). |
| `q_panas-sf_{A,B}_negativeAffect` / `q_panas-sf_post_negativeAffect` | 5–25 | Afecto negativo post-sesión (RQ3). |

> Demográficos y preguntas cualitativas no generan columnas de puntaje (sus respuestas crudas
> están en el export JSON). El panel `/admin` (`GET /api/session?stats=1`) resume media, DE y n
> de las métricas principales por condición A/B.

## Transcripciones para codificación cualitativa

`GET /api/export?format=transcripts` produce **JSONL** (una línea por mensaje, solo
participantes reales — los pilotos se excluyen) para análisis cualitativo externo. Campos por
línea: `sessionId`, `condition`, `turn`, `role`, `timestamp`, `inputMode`, `latencyMs`,
`content`. El esquema de codificación propuesto está en
[`docs/06-coding-scheme.md`](06-coding-scheme.md).

## Análisis inferencial

`scripts/analyze.py <sessions.csv>` calcula descriptivos por condición y, si `scipy` está
instalado, Mann-Whitney U + Cliff's delta + d de Cohen por métrica (alternativa: jamovi/R).
