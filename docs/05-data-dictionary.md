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
| `condition` | `A`/`B` | Condición experimental: A = Sonic corporizado; B = chat de texto. |
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

## Resultados por tarea (RQ2)

Prefijos `task1_` (bucle infinito) y `task2_` (complejidad algorítmica).

| Columna | Tipo | Descripción |
|---|---|---|
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

Formato de columna: `q_<instrumento>_<fase>_<score>`. Las fases sin distinción aparecen como
`x`; PANAS-SF se etiqueta `post` (medida única post-sesión).

| Columna | Rango | Descripción |
|---|---|---|
| `q_godspeed_x_anthropomorphism` | 1–5 | Antropomorfismo percibido (RQ1). |
| `q_godspeed_x_animacy` | 1–5 | Vitalidad percibida. |
| `q_godspeed_x_likeability` | 1–5 | Agrado. |
| `q_godspeed_x_intelligence` | 1–5 | Inteligencia percibida. |
| `q_godspeed_x_overall` | 1–5 | Media global Godspeed. |
| `q_sus_x_total` | 0–100 | System Usability Scale. |
| `q_nasa-tlx_x_rawTlx` | 0–100 | Carga cognitiva (RTLX, media no ponderada) (RQ3). |
| `q_panas-sf_post_positiveAffect` | 5–25 | Afecto positivo post-sesión (RQ3). |
| `q_panas-sf_post_negativeAffect` | 5–25 | Afecto negativo post-sesión (RQ3). |

> Demográficos y preguntas cualitativas no generan columnas de puntaje (sus respuestas crudas
> están en el export JSON). El panel `/admin` (`GET /api/session?stats=1`) resume media, DE y n
> de las métricas principales por condición A/B.
