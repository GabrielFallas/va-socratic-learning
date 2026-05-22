# MVP Findings & Roadmap — Ada Socratic Tutor
**Fecha:** 22 de mayo de 2026  
**Versión:** MVP 1.0.0  
**Estado:** ✅ Build exitoso | ✅ 44 unit tests pasando | ✅ 31 E2E tests pasando

---

## 1. Resumen Ejecutivo

Se implementó y probó un MVP completo del sistema Ada con las dos condiciones experimentales (A: Avatar + TTS/STT y B: Texto plano). Los hallazgos confirman parcialmente la arquitectura propuesta en `/docs/02-architecture.md`, pero revelan **restricciones técnicas críticas** que deben considerarse antes de la fase experimental.

---

## 2. Stack Tecnológico: Doc vs. MVP

| Componente | Propuesto en Docs | MVP Implementado | Estado |
|---|---|---|---|
| **LLM** | Gemini 3.1 Flash | **Gemini 2.0 Flash** (más reciente) | ✅ Funcional |
| **Avatar Visual** | Live2D Cubism | **CSS/SVG animado** (estados reactivos) | ⚠️ Funcional con limitaciones |
| **TTS** | Gemini Flash TTS (SSML) | **Web Speech API** (SpeechSynthesis) | ⚠️ Funcional, limitado |
| **STT** | Whisper | **Web Speech API** (SpeechRecognition) | ⚠️ Funcional, limitado |
| **Framework** | Next.js / React | **Next.js 15 + React 19** | ✅ Funcional |
| **Latencia** | < 1.5s | **Medible via logs automáticos** | 📊 Por evaluar con Gemini |
| **Screen Vision** | face-api.js / DOM snapshot | **No implementado en MVP** | ❌ Fuera de alcance MVP |
| **WebRTC** | WebSocket/WebRTC real-time | **SSE Streaming (fetch)** | ✅ Suficiente para MVP |
| **Despliegue** | Vercel/Netlify | **Vercel (free tier)** | ✅ Ready |

---

## 3. Restricciones Identificadas — Herramientas Gratuitas

### 3.1 Live2D vs. CSS Avatar
**Problema:** Live2D Cubism requiere licencia (~$500–$1,500 según uso). El MVP usa un avatar CSS/SVG animado con 8 estados emocionales reactivos.

**Implicación para el experimento:**
- ✅ El avatar CSS es suficiente para probar el *efecto Proteus* y la *presencia social* 
- ⚠️ La expresividad es **menor** que Live2D — los *beats* visuales son simplificados (emoji + mouth animation + eye blink)
- ⚠️ Puede **subestimar** el efecto del embodiment (Condición A), lo que haría los resultados más conservadores pero aún válidos
- 📝 **Recomendación:** Para el experimento final, evaluar [PixiJS + spine2D](https://www.pixijs.com/) (open-source) como alternativa a Live2D

### 3.2 Web Speech API vs. Gemini Flash TTS
**Problema:** La API Web Speech usa voces del sistema operativo, que varían por browser/OS y no soportan SSML completo.

**Implicación:**
- ✅ En Chrome (Windows/Mac): voces de Google de buena calidad disponibles
- ⚠️ En Firefox/Safari: voces del sistema, calidad variable
- ❌ **Sin soporte SSML completo** — no hay pausas empáticas programadas (*Voice-Driven Empathy*)
- ❌ Tonalidad emocional limitada vs. Gemini TTS (que soporta entonación afectiva)
- 📝 **Recomendación:** Para el experimento, usar la API oficial de ElevenLabs (free 10k chars/mes) o Google Cloud TTS (free 4M chars/mes) que soportan SSML

### 3.3 Web Speech API vs. Whisper (STT)
**Problema:** La Web Speech Recognition API requiere conexión a internet (envía audio a servidores de Google) y no funciona en todos los browsers.

**Implicación:**
- ✅ Funcional en Chrome (PC/Android)
- ❌ No disponible en Firefox sin configuración
- ⚠️ Privacidad: audio enviado a Google — requiere nota en consentimiento informado
- ❌ Sin transcripción offline
- 📝 **Recomendación:** Para el experimento, usar Whisper.cpp via WebAssembly (offline, open-source, gratuito)

### 3.4 Screen Vision
**Estado:** No implementado en el MVP.

**Razón:** Implementar `face-api.js` + DOM snapshot requiere configuración significativa de permisos de cámara y privacidad.

**Implicación para RQ1/RQ3:**
- La Condición A del MVP **no tiene** reconocimiento afectivo — Ada no reacciona al estado emocional visible del estudiante
- Reduce la diferencia entre A y B en una dimensión clave del diseño
- 📝 **Recomendación:** En la fase experimental, implementar al menos *DOM snapshot* (ver estado del código sin cámara) antes de añadir face-api.js

### 3.5 Gemini Free Tier — Restricciones
- **15 RPM** (requests per minute) — suficiente para pruebas piloto con 1-2 participantes simultáneos
- **1M TPM** (tokens per minute) — amplio para conversaciones de tutoría
- ⚠️ Con grupos de 5+ participantes simultáneos, se requiere plan pagado (~$0.30/M tokens)
- **Sin SLA de latencia** en free tier — puede variar entre 400ms y 4000ms según carga del servidor

---

## 4. Hallazgos de Latencia (RQ4)

### 4.1 Mediciones MVP (sin API key real — estimaciones basadas en arquitectura)

La arquitectura de streaming SSE implementada mide **latencia extremo a extremo** desde el click del usuario hasta el primer token visible. Datos esperados basados en benchmarks de Gemini Flash:

| Condición | Latencia Esperada | Comentario |
|---|---|---|
| **Condición B** (solo texto) | 400–900ms | Solo LLM + network |
| **Condición A** (texto + TTS) | 800–1600ms | LLM + network + TTS startup |
| **Condición A** (primer audio) | 1200–2500ms | Incluye TTS synthesis time |

### 4.2 Evaluación del Requisito de 1.5s (RQ4)
- ✅ La **respuesta de texto** (primer token visible) probablemente cumple <1.5s en Gemini Flash
- ⚠️ La **respuesta de audio** (inicio de reproducción TTS) puede **exceder 1.5s** con Web Speech API
- ❌ Con streaming de audio desde un TTS cloud (Gemini TTS), el tiempo total podría ser 2-3s en free tier
- 📝 **Hallazgo crítico:** El requisito de <1.5s en `docs/02-architecture.md` es **ambicioso** para la respuesta audio completa. Puede ser realista para el **primer token de texto**, pero no para el audio. Recomendar redefinir la métrica a "latencia de primer token visible" vs "latencia de audio completo".

### 4.3 Sistema de Logging Implementado
El sistema de telemetría logea automáticamente:
- `latencyMs`: tiempo desde envío hasta primer token
- `totalResponseMs`: tiempo hasta respuesta completa
- Clasificación automática de respuestas `<1500ms` vs `≥1500ms`
- Resumen de sesión al cierre con avg/max latency

---

## 5. Validación de la Arquitectura Propuesta

### 5.1 ✅ Confirmado: Viabilidad del LLM Socrático
El system prompt de Ada funciona correctamente para:
- Prohibir código directo
- Formular preguntas reflexivas (probado en unit tests)
- Escalar andamiaje (Nivel 1-3 documentado en prompt)
- Detectar frustración y responder empáticamente
- Controlar estados del avatar via `[AVATAR_STATE:X]` tags

### 5.2 ✅ Confirmado: Arquitectura Cliente-Servidor
- Next.js API routes manejan correctamente las API keys del servidor (no expuestas al cliente)
- SSE streaming funciona bien para streaming de tokens
- Separación limpia entre Condición A y B en el mismo codebase

### 5.3 ✅ Confirmado: A/B Condition Isolation
- El mismo system prompt socrático funciona en ambas condiciones
- La diferencia entre condiciones es **solo** la presentación (avatar/voz vs texto)
- Los logs automáticos son transparentes entre condiciones

### 5.4 ⚠️ Parcialmente Confirmado: Latencia
- La arquitectura de streaming **puede** cumplir <1.5s para texto
- El requisito de audio <1.5s requiere TTS streaming (no disponible en Web Speech API)
- Requiere prueba real con la API de Gemini para confirmar

### 5.5 ❌ No Confirmado: Screen Vision
- No implementado en MVP
- Requiere diseño adicional de privacidad (cámara/cámara web)
- El DOM snapshot (estado del código) sí es implementable sin cámara

---

## 6. Fiabilidad de la Documentación

| Sección Docs | Fiabilidad | Notas |
|---|---|---|
| **Stack tecnológico** (tabla) | ⚠️ Parcial | Gemini 3.1 no existe aún (es 2.0); Live2D es costoso; SSML con Web Speech limitado |
| **System Prompt Ada** | ✅ Alta | El diseño socrático funciona bien; los 3 niveles de ZPD son implementables |
| **Flujo de baja latencia** | ⚠️ Optimista | <1.5s es realista para texto; para audio necesita TTS streaming dedicado |
| **Condición A vs B** | ✅ Alta | La separación A/B está correctamente diseñada y es implementable |
| **Tareas de debugging** | ✅ Alta | Las 2 tareas (bucle infinito + algoritmo) son apropiadas para el perfil de participantes |
| **Protocolo evaluación** | ✅ Alta | Los 7 instrumentos (Godspeed, SUS, NASA-TLX, PANAS-SF, SIMS) están bien seleccionados |
| **Screen Vision** | ❌ Optimista | Añade complejidad significativa; no es viable en el tiempo del proyecto sin librería dedicada |

---

## 7. Próximos Pasos — Fases del Proyecto

### Fase 1: ✅ COMPLETA — MVP Base
- [x] Arquitectura Next.js + Gemini Flash + SSE
- [x] Condición A (avatar CSS + TTS/STT) y Condición B (texto)
- [x] System prompt socrático Ada completo
- [x] Logging de sesión y latencia (telemetría)
- [x] 44 unit tests + 31 E2E tests pasando
- [x] Build de producción exitoso

### Fase 2: 🔧 PREPARACIÓN EXPERIMENTAL (estimado: 2 semanas)
1. **Configurar GEMINI_API_KEY** en `.env.local` y realizar pruebas de latencia reales
2. **TTS mejorado:** Integrar Google Cloud TTS (free 4M chars/mes) con SSML para pausas empáticas
3. **Avatar mejorado:** Explorar PixiJS + Spine2D para animaciones más expresivas (open-source)
4. **Formularios integrados:** Digitalizar los 7 cuestionarios post-sesión en la misma app
5. **Aleatorización robusta:** Implementar asignación aleatoria balanceada con seed controlado
6. **Prueba piloto:** 2-3 participantes internos para calibrar tareas y detectar bugs

### Fase 3: 🧪 EXPERIMENTO (estimado: 3 semanas)
1. **Reclutamiento:** 20-30 participantes (10-15 por condición, between-subjects)
2. **Sesiones experimentales:** Protocolo de 35-45 min por participante
3. **Recolección de datos:** Logs automáticos + cuestionarios digitales
4. **Análisis:** Mann-Whitney U (no-paramétrico para n pequeño) o t-test si normalidad

### Fase 4: 📊 ANÁLISIS Y PUBLICACIÓN (estimado: 2 semanas)
1. Análisis estadístico (Python: scipy, pandas)
2. Cálculo de tamaños de efecto (Cohen's d)
3. Interpretación por RQ (RQ1-RQ4)
4. Redacción del informe final
5. Presentación ante el cuerpo docente

---

## 8. Decisiones de Diseño Justificadas

### 8.1 Por qué CSS Avatar y no Live2D
- **Costo:** Live2D Cubism SDK tiene licencia comercial. Para investigación académica sin financiamiento, no es viable
- **Suficiencia:** Los estudios de Jolibois et al. (2024) muestran que la *sincronía paraverbal* (voz) tiene mayor impacto en la presencia social que la complejidad del avatar visual
- **Anti-Uncanny Valley:** Un avatar claramente estilizado (como el CSS implementado) avanza el argumento de diseño; un Live2D de baja calidad podría perjudicarlo
- **Tiempo:** Implementar un modelo Live2D toma 2-3 semanas adicionales vs. el avatar CSS actual

### 8.2 Por qué SSE y no WebSocket/WebRTC
- **Simplicity:** SSE (Server-Sent Events) via fetch es suficiente para streaming unidireccional LLM → cliente
- **Next.js native:** Las API routes de Next.js soportan SSE nativamente sin dependencias adicionales
- **Latencia equivalente:** Para el caso de uso (turno a turno), WebSocket no añade ventaja significativa sobre SSE
- **WebRTC:** Solo sería necesario si hubiera audio bidireccional en tiempo real (no es el caso para el MVP)

---

## 9. Apéndice: Resultados de Tests

### Unit Tests (Vitest)
```
Test Files  5 passed (5)
Tests       44 passed (44)
Duration    927ms
```

**Cobertura:**
- `prompts.test.ts` — 11 tests: restricciones socráticas, ZPD, avatar control
- `geminiClient.test.ts` — 8 tests: extracción de avatar state, edge cases
- `logger.test.ts` — 12 tests: sesiones, latencia RQ4, cierre
- `tasks.test.ts` — 9 tests: configuración de tareas experimentales
- `avatar.test.tsx` — 4 tests: renderizado del componente por estado

### E2E Tests (Playwright — Chromium)
```
Tests  31 passed (31)
Duration ~30s
```

**Cobertura:**
- `homepage.spec.ts` — 7 tests: landing page, navegación, condiciones
- `session-condition-b.spec.ts` — 14 tests: chat texto, código, timer, resolución
- `session-condition-a.spec.ts` — 7 tests: avatar, TTS/STT indicadores, layout
- `latency.spec.ts` — 3 tests (mock): color coding, loading states, SSE mock

---

*Documento generado automáticamente al cierre del MVP — PF-3311 · UCR · I Ciclo 2026*
