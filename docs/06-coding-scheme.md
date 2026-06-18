# Esquema de Codificación Cualitativa

**PF-3311 · Agentes Virtuales Inteligentes — Entregable 3**
**Estudiante:** Gabriel Isaías Fallas López · I Semestre 2026

Esquema inicial (deductivo) para el análisis temático de (a) las **conversaciones** exportadas
con `GET /api/export?format=transcripts` (JSONL) y (b) las **preguntas abiertas** del
cuestionario final. Se complementa con categorías **emergentes** (inductivas) que surjan
durante la codificación. El esquema está fundamentado en el método socrático/andamiaje (ZPD),
la literatura de agentes pedagógicos corporizados y los hallazgos del estudio experto de
referencia (las medidas conductuales y cualitativas revelan efectos que los cuestionarios no
capturan).

## Procedimiento sugerido
1. Exportar transcripciones (JSONL) y respuestas abiertas (JSON).
2. Codificar **por turno** las conversaciones (mensajes de usuario y de tutor) y **por
   respuesta** las preguntas abiertas, asignando uno o más códigos.
3. Calcular frecuencias por código y **por condición (A vs B)**; buscar patrones diferenciales.
4. Reportar categorías, patrones y **citas representativas** (anonimizadas) en la sección de
   Resultados; triangular con las métricas conductuales (turnos, think-time, resolución).
5. Si hay segundo codificador, reportar acuerdo inter-codificador (p. ej., κ de Cohen).

## A. Códigos sobre el comportamiento del tutor (mensajes `role=assistant`)
| Código | Definición | Relevancia |
|---|---|---|
| `SCAFFOLD_L1_general` | Pregunta amplia/reflexiva que no apunta a la línea concreta del error. | RQ1/RQ2 (andamiaje ZPD nivel 1) |
| `SCAFFOLD_L2_focalizada` | Pista que dirige la atención a una zona/variable concreta. | RQ2 (nivel 2) |
| `SCAFFOLD_L3_especifica` | Pista muy concreta, casi procedimental (sin dar el código). | RQ2 (nivel 3) |
| `REFUSAL_no_codigo` | Rechaza explícitamente dar la solución directa. | Fidelidad socrática |
| `EMPATHY_validacion` | Reconoce esfuerzo/frustración; lenguaje relacional. | RQ1 (presencia social) |
| `LEAK_da_respuesta` | **Falla**: el tutor entrega código/solución directa. | Control de calidad |
| `INTERROGATORIO` | Encadena preguntas en cada turno; interacción tipo entrevista. | Limitación (señalada por el experto) |

## B. Códigos sobre el comportamiento del usuario (mensajes `role=user`)
| Código | Definición | Relevancia |
|---|---|---|
| `HELP_respuesta_directa` | Pide la solución/el código directamente. | RQ2 (búsqueda de descarga cognitiva) |
| `REASON_hipotesis` | Propone una hipótesis/explicación del problema. | RQ2 (razonamiento autónomo) |
| `INSIGHT_descubrimiento` | Momento de comprensión ("ya entendí", reformula el error). | RQ2 (eficacia) |
| `FRUSTRATION` | Expresa frustración, bloqueo o abandono. | RQ3 (afecto) |
| `CONFIRM_avance` | Confirma que ejecutó/corrigió y avanza. | RQ2 |
| `OFFTOPIC` | Fuera de tarea / prueba los límites del agente. | Contexto |

## C. Códigos sobre la experiencia (preguntas abiertas: más/menos gustó, comentarios)
| Código | Definición | Relevancia |
|---|---|---|
| `EXP_embodiment_pos` | Valora avatar/voz/animación/gamificación. | RQ1 (Condición A) |
| `EXP_embodiment_neg` | Avatar/voz distrae, molesta o resulta artificial. | RQ1 / carga (RQ3) |
| `EXP_socratic_pos` | Valora ser guiado sin recibir la respuesta. | RQ1 (apoyo pedagógico) |
| `EXP_socratic_neg` | Frustración por no recibir la respuesta directa. | RQ1/RQ3 |
| `EXP_usability` | Comentarios de facilidad/dificultad de uso (latencia, voz, UI). | RQ1 (SUS) / RQ4 |
| `EXP_novelty` | Reacción a la novedad ("divertido", "diferente"). | Efecto de novedad (limitación) |
| `EXP_naturalidad` | Comenta cuán natural/humano se sintió el agente. | RQ1 (Godspeed) |

## Notas
- Mantener la **confidencialidad**: no transcribir datos personales identificables; citar por
  `sessionId` anónimo.
- Las categorías A–C son un punto de partida; documentar y definir cualquier **código emergente**
  con su criterio de inclusión antes de usarlo de forma consistente.
