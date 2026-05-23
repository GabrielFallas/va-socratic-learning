# Ada — Tutora Socrática Corporizada (M-ITS)

> **PF-3311 · Agentes Virtuales Inteligentes · Universidad de Costa Rica · I Semestre 2026**

## Resumen

Repositorio del proyecto de investigación sobre un agente virtual de tutoría socrática para el desarrollo de lógica de programación y resolución de problemas en entornos STEM. El objetivo es evaluar si una interacción basada en preguntas reflexivas y pistas graduales —complementada con un avatar 2D afectivo y síntesis de voz— mejora la comprensión y la autonomía del estudiante, en comparación con un chatbot de texto plano, sin entregar soluciones de código directas.

## 🎥 Video de Demostración

> **[→ Ver demostración en YouTube (unlisted)](https://youtu.be/DEMO_LINK_PLACEHOLDER)**  
> *(~3 minutos · Muestra ambas condiciones experimentales, el avatar reactivo y el flujo de depuración socrática)*

---

## Propósito y Motivación

El proyecto busca mitigar la dependencia de herramientas de IA que entregan código completo y, en su lugar, fomentar el pensamiento crítico, la descomposición de problemas y el razonamiento algorítmico. Un agente virtual puede ofrecer tutoría uno a uno de forma escalable y alineada con el método socrático.

## Preguntas de Investigación

| RQ | Pregunta |
|---|---|
| **RQ1** | ¿Cómo afecta la presencia del avatar 2D afectivo con voz paraverbal frente a un chatbot de texto en la percepción de naturalidad, presencia social y *perceived pedagogical support*? |
| **RQ2** | ¿En qué medida la modalidad corpórea influye en la eficacia pedagógica autónoma del participante (resolución sin código directo, turnos conversacionales, tiempo por tarea)? |
| **RQ3** | ¿Qué relación existe entre la modalidad del agente y la carga cognitiva percibida (NASA-TLX) y el estado afectivo (PANAS-SF) durante la tarea? |
| **RQ4** | ¿Se mantiene la latencia de respuesta multimodal por debajo de 1.5 segundos de forma consistente? |

## Rol del Agente — Ada

- Analiza el contexto del estudiante (enunciado o código) para detectar discrepancias lógicas.
- Mantiene memoria del progreso conversacional para ajustar la dificultad de las preguntas (ZPD — Zona de Desarrollo Próximo, Vygotsky).
- Guía con preguntas reflexivas en tres niveles de andamiaje, sin proporcionar código directo.
- En la Condición A: reacciona visualmente (avatar 2D, 8 estados expresivos) y vocalmente (TTS paraverbal).

## Arquitectura Técnica

### Stack Tecnológico

| Capa / Componente | Tecnología | Razón principal |
|---|---|---|
| **Avatar 2D** | CSS/SVG Animado (sin librerías externas) | Avatar expresivo que evita el Valle Inquietante, sin dependencias de terceros ni servicios de pago. Reemplaza Ready Player Me (descontinuado en ene. 2026). |
| **Motor de Razonamiento (LLM)** | Ollama + Gemma 3 12B (local) | Sin API keys externas. Inferencia GPU local. Reproducible sin cuentas de servicios en la nube. |
| **Síntesis de Voz (TTS)** | Web Speech API — SpeechSynthesis (nativa del navegador) | Sin costo, sin API keys, latencia de inicio <200 ms. Disponible en Chrome, Edge y Safari. |
| **Reconocimiento de Voz (STT)** | Web Speech API — SpeechRecognition (nativa del navegador) | Resultados intermedios en tiempo real, español latinoamericano, sin dependencias externas. |
| **Framework / Orquestación** | Next.js 14 + React + TailwindCSS | SSR para proteger la configuración del servidor, rutas API integradas, streaming SSE nativo. |
| **Telemetría** | Módulo logger.ts (en memoria, servidor) | Registra latencia extremo a extremo, turnos, tiempo por tarea y resolución autónoma (RQ4). |

### Componentes Principales

- **Cliente web:** Avatar 2D (CSS/SVG), entrada de texto y voz, panel de código con syntax highlighting.
- **Servidor de orquestación:** Estado de sesión, telemetría log-based, enrutamiento al LLM.
- **Servicios de IA locales:** Ollama (LLM) + Web Speech API (TTS/STT).
- **Flujo de streaming:** Server-Sent Events (SSE) para latencia percibida reducida.

### Flujo de Interacción

1. El participante accede a `localhost:3000` y se asigna aleatoriamente a la Condición A (avatar multimodal) o B (texto plano).
2. El sistema inicializa la sesión con un ID único y carga el contexto de la Tarea 1 (depuración de bucle infinito).
3. El participante interactúa con Ada mediante texto (ambas condiciones) o voz (solo Condición A).
4. El servidor procesa el historial de conversación y lo envía a Ollama vía streaming NDJSON.
5. La respuesta socrática se transmite al cliente mediante SSE. En Condición A, se activa TTS y se sincroniza el estado del avatar.
6. Al completar ambas tareas, se presenta un resumen de sesión con análisis de latencia (RQ4).

---

## Ejecución de la Prueba de Concepto (PoC)

### 1. Requisitos Previos

- **Node.js** v18.17 o superior y **npm**.
- **Ollama** instalado y ejecutándose localmente.
  - Instalar Ollama: [https://ollama.com/download](https://ollama.com/download)
  - Descargar el modelo: `ollama pull gemma3:12b`
  - Verificar que el servidor esté corriendo: `ollama serve` (por defecto en `http://localhost:11434`)
- **GPU NVIDIA** con VRAM suficiente (≥8 GB recomendado para Gemma 3 12B Q4_K_M).  
  Si no se dispone de GPU, Ollama usará CPU (latencia significativamente mayor).

### 2. Clonar el Repositorio e Instalar Dependencias

```bash
git clone https://github.com/GabrielFallas/va-socratic-learning.git
cd va-socratic-learning
npm install
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto (no se sube al repositorio):

```env
# URL del servidor Ollama (por defecto: http://localhost:11434)
OLLAMA_BASE_URL=http://localhost:11434

# Modelo Ollama a utilizar
OLLAMA_MODEL=gemma3:12b
```

> **Nota de seguridad:** No se requieren API keys externas para la PoC. No subas credenciales al repositorio.

### 4. Lanzar el Servidor de Desarrollo

```bash
npm run dev
```

La interfaz de tutoría estará disponible en `http://localhost:3000`.

### 5. Ejecutar la Sesión Experimental

1. Abre `http://localhost:3000` en Chrome, Edge o Safari (navegadores con soporte completo de Web Speech API).
2. Selecciona **"Iniciar Sesión (Aleatoria)"** para asignación automática de condición, o fuerza la Condición A o B para pruebas internas.
3. Completa las dos tareas de depuración interactuando con Ada.
4. Al finalizar, el resumen de sesión muestra métricas de latencia (RQ4) y resultados por tarea.

> **Sobre TTS/STT:** La síntesis de voz y el reconocimiento de voz funcionan únicamente en la Condición A y requieren permiso de micrófono en el navegador. Si el navegador no soporta Web Speech API, la condición A funcionará en modo solo texto.

---

## Estructura del Repositorio

### Documentación

| Ruta | Descripción |
|---|---|
| [`docs/`](docs/) | Documentación principal del proyecto. |
| [`docs/entregable-2.html`](docs/entregable-2.html) | **Documento principal del Entregable 2** (secciones a–f, imprimible como PDF). |
| [`docs/entregable-1.pdf`](docs/entregable-1.pdf) | Documento del Entregable 1 (PDF). |
| [`docs/01-overview.md`](docs/01-overview.md) | Resumen del objetivo y motivación del proyecto. |
| [`docs/02-architecture.md`](docs/02-architecture.md) | Arquitectura y diseño del sistema (M-ITS). |
| [`docs/03-evaluation-protocol.md`](docs/03-evaluation-protocol.md) | Protocolo de evaluación y matriz de consistencia metodológica. |
| [`docs/04-evaluation-guide.md`](docs/04-evaluation-guide.md) | Guía paso a paso para la evaluación experimental. |
| [`docs/project-canvas.html`](docs/project-canvas.html) | Canvas del proyecto (formato interactivo). |
| [`docs/experimental-instrument.html`](docs/experimental-instrument.html) | Consentimiento informado e instrumento experimental web. |
| [`context/Cuestionarios-20260522/`](context/Cuestionarios-20260522/) | Cuestionarios validados: PANAS-SF, Godspeed, SUS, NASA-TLX, SIMS, entre otros. |

### Código Fuente

| Ruta | Descripción |
|---|---|
| [`src/app/page.tsx`](src/app/page.tsx) | Landing page — asignación de condición e inicio de sesión. |
| [`src/app/session/page.tsx`](src/app/session/page.tsx) | Página principal de la sesión experimental. |
| [`src/app/session/complete/page.tsx`](src/app/session/complete/page.tsx) | Página de resumen post-sesión con métricas. |
| [`src/app/api/chat/route.ts`](src/app/api/chat/route.ts) | API de chat — orchestra LLM y streaming SSE. |
| [`src/app/api/session/route.ts`](src/app/api/session/route.ts) | API de sesión — telemetría y gestión de estado. |
| [`src/client/avatar/AvatarSprite.tsx`](src/client/avatar/AvatarSprite.tsx) | Avatar 2D CSS/SVG animado con 8 estados expresivos. |
| [`src/client/components/ChatInterface.tsx`](src/client/components/ChatInterface.tsx) | Interfaz de chat — Condición A y B, TTS, STT. |
| [`src/client/components/CodePanel.tsx`](src/client/components/CodePanel.tsx) | Panel de código con syntax highlighting y timer. |
| [`src/services/llm/ollamaClient.ts`](src/services/llm/ollamaClient.ts) | Cliente Ollama — streaming NDJSON, extracción de estado del avatar. |
| [`src/services/tts/webSpeechTTS.ts`](src/services/tts/webSpeechTTS.ts) | Servicio TTS — Web Speech API. |
| [`src/services/stt/webSpeechSTT.ts`](src/services/stt/webSpeechSTT.ts) | Servicio STT — Web Speech API. |
| [`src/prompts/ada-system.ts`](src/prompts/ada-system.ts) | System prompt socrático de Ada con protocolo ZPD de 3 niveles. |
| [`src/shared/config/tasks.ts`](src/shared/config/tasks.ts) | Definición de las dos tareas experimentales de depuración. |
| [`src/server/telemetry/logger.ts`](src/server/telemetry/logger.ts) | Módulo de telemetría — logs de latencia y métricas por sesión. |

### Pruebas

| Ruta | Descripción |
|---|---|
| [`tests/unit/`](tests/unit/) | Pruebas unitarias. |
| [`tests/integration/`](tests/integration/) | Pruebas de integración. |
| [`tests/e2e/`](tests/e2e/) | Pruebas end-to-end. |

---

## Condiciones Experimentales

| | Condición A — Experimental | Condición B — Control |
|---|---|---|
| **Avatar** | ✓ CSS/SVG 2D animado, 8 estados | ✗ Sin avatar |
| **Voz (TTS)** | ✓ Web Speech API paraverbal | ✗ Deshabilitada |
| **Reconocimiento de voz (STT)** | ✓ Web Speech API | ✗ Deshabilitado |
| **Modelo LLM** | ✓ Ollama + Gemma 3 12B | ✓ Idéntico |
| **System Prompt** | ✓ Socrático ZPD 3 niveles | ✓ Idéntico |
| **Tareas** | ✓ Bucle + Algoritmo | ✓ Idénticas |

---

## Consideraciones de Seguridad

- **API Keys:** No se requieren API keys externas para la PoC. Ollama corre completamente local.
- **Datos de sesión:** Los logs de conversación se almacenan en memoria en el servidor bajo un ID alfanumérico único, sin nombre legal ni correo del participante.
- **`.env.local`:** El archivo de variables de entorno está incluido en `.gitignore` y nunca debe subirse al repositorio.

---

*Proyecto individual · Gabriel Isaías Fallas López · PF-3311 · UCR · I Semestre 2026*
