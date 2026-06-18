# Guía del Facilitador — Recolección de Datos Limpia

**PF-3311 · Agentes Virtuales Inteligentes — Entregable 3**
**Estudiante:** Gabriel Isaías Fallas López · I Semestre 2026

Cómo ejecutar una sesión con un participante **real** sin contaminar la base de datos del
estudio. Los datos se guardan en SQLite (`data/sonic.db`) en el host.

## Antes de empezar la recolección
1. **Confirmar servicios:** abre `http://localhost:3000`; el *badge* de salud debe estar verde
   (Ollama y voz listos). O `GET /api/health`.
2. **Base limpia:** en `http://localhost:3000/admin`, verifica que **Total** y **Reales** sean 0
   (o solo participantes reales previos). Si hay datos de prueba, el sistema se entregó con la
   base archivada en `data/_archive/`; no los mezcles.
3. **Navegador:** Chrome/Edge en pantalla completa, micrófono permitido (para Condición A).

## Durante cada sesión (una por participante)
1. **Usa SIEMPRE el botón `▶ PRESS START`.** Este asigna la condición (A/B) de forma
   contrabalanceada y emite el ID anónimo (`P-001`, `P-002`, …). 
2. **Los botones `Prueba A` / `Prueba B` están ocultos** durante la recolección real (para que
   no se guarde por error a un participante real como `P-PILOT-*`, que quedaría **excluido** del
   análisis). Si necesitas hacer una prueba técnica, ábrelos con `http://localhost:3000/?pilot=1`.
   Para participantes reales usa siempre `▶ PRESS START`, nunca el modo prueba.
3. **Una sesión por participante.** No recargues a mitad de sesión salvo emergencia (el botón
   `↺` reinicia el canvas sin perder telemetría). No reutilices una sesión para otra persona.
4. **Diseño intra-sujeto (crossover), 4 ejercicios:** cada participante resuelve **ambas tareas en
   ambas condiciones**. El servidor asigna el **orden** de los bloques (A→B o B→A) de forma
   contrabalanceada; el participante no elige.
5. Flujo completo, déjalo terminar todo:
   - **Bloque 1** (condición 1): Tarea 1 → mini-juego de transición → Tarea 2 → **batería de esa
     condición** (Godspeed, apoyo pedagógico, SUS, NASA-TLX, PANAS-SF: 5 formularios).
   - **Bloque 2** (condición opuesta): Tarea 1 → transición → Tarea 2 → **batería de esa condición**
     (otros 5) + **demográficos y preguntas abiertas** (2, una sola vez) → pantalla de resultados.
   - Son **4 ejercicios** y **12 formularios** (5 + 5 + 2). La sesión se cierra y persiste al pasar
     del Bloque 2 a su batería final. Es una sesión larga (~40 min); avísale al participante.
   - El Bloque 2 usa **variantes distintas** de las tareas (otro bucle, otro algoritmo O(n²)), así
     que el participante nunca resuelve el problema idéntico dos veces.
6. **No reveles el objetivo** del estudio (comparación de embodiment) para evitar sesgos.

## Después de cada sesión
- En `/admin`, confirma que apareció una fila nueva **Real** y que el contador de cuestionarios es
  **12** (batería completa: 5 por condición × 2 + demográficos + cualitativo).
- El balance del orden A→B / B→A se autogestiona por bloques de 2; revisa que `Balance Δ` se
  mantenga ≤ 1.
- *Nota:* las primeras 6 sesiones (P-001…P-006) son del diseño anterior entre-sujetos (una
  condición por persona); se combinan automáticamente con las nuevas en la comparación A vs B.

## Confidencialidad
- No registres nombre, correo ni datos identificables. Todo queda bajo el ID anónimo.
- No subas `data/` al repositorio (está en `.gitignore`).

## Si entra una sesión de prueba por error
- Identifica su `sessionId` en `/admin`. Si es `P-PILOT-*` ya queda excluida del análisis.
- Si fue una sesión real accidental, anótala para descartarla en el análisis (o elimínala con
  SQL: `DELETE FROM sessions WHERE sessionId='P-0XX';` sobre `data/sonic.db`).

## Exportar para el análisis
- CSV (una fila por participante): `/api/export?format=csv` o el botón en `/admin`.
- Transcripciones para codificación cualitativa: `/api/export?format=transcripts`.
- Análisis: `python scripts/analyze.py <sessions.csv>` (ver [`05-data-dictionary.md`](05-data-dictionary.md)).
