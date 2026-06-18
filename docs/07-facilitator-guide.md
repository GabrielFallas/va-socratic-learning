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
4. Deja que el participante complete las dos tareas y **toda la batería final** (demográficos →
   Godspeed → apoyo pedagógico → SUS → NASA-TLX → PANAS-SF → preguntas abiertas) hasta la
   pantalla de resultados. La sesión se cierra y persiste al pasar de la Tarea 2 a los resultados.
5. **No reveles el objetivo** del estudio (comparación de embodiment) para evitar sesgos.

## Después de cada sesión
- En `/admin`, confirma que apareció una fila nueva **Real** con la condición esperada y que el
  contador de cuestionarios es 7 (batería completa: demográficos, Godspeed, apoyo pedagógico,
  SUS, NASA-TLX, PANAS-SF, cualitativo).
- El balance A/B se autogestiona; revisa que el `Balance Δ` se mantenga ≤ 1.

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
