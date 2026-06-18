# Sonic — Tutor Socrático Corporizado

> **PF-3311 · Agentes Virtuales Inteligentes · Universidad de Costa Rica · I Semestre 2026**

## Resumen

Repositorio del proyecto de investigación sobre un agente virtual de tutoría socrática  para el desarrollo de lógica de programación y resolución de problemas en entornos STEM. El objetivo es evaluar si una interacción basada en preguntas reflexivas y pistas graduales —complementada con un avatar 2D reactivo (Sonic Kaplay), síntesis de voz neuronal (Piper TTS), reconocimiento de voz local (Whisper STT) y gamificación de anillos— mejora la comprensión y la autonomía del estudiante, en comparación con un chatbot de texto plano, sin entregar soluciones de código directas.

## 🎥 Video de Demostración

> **[→ Ver demostración en YouTube (unlisted)](https://youtu.be/WmdkmiwA-gk)**  
> *(~5 minutos · Muestra ambas condiciones experimentales, el avatar reactivo y el flujo de depuración socrática)*

## 📄 Artículo Académico (Paper)

> **Fuente LaTeX:** [`paper/`](paper/) (plantilla IEEE, lista para Overleaf — ver [`paper/README.md`](paper/README.md)).  
> **PDF compilado:** `paper/main.pdf` (generar con `latexmk -pdf main.tex` o Overleaf).

---

## Propósito y Motivación

El proyecto busca mitigar la dependencia de herramientas de IA que entregan código completo y, en su lugar, fomentar el pensamiento crítico, la descomposición de problemas y el razonamiento algorítmico. Un agente virtual puede ofrecer tutoría uno a uno de forma escalable y alineada con el método socrático.

## Preguntas de Investigación

| RQ | Pregunta |
|---|---|
| **RQ1** | ¿Cómo afecta la presencia del avatar corporizado  (Sonic Kaplay 2D, Piper TTS, Whisper STT, anillos, zonas temáticas) frente a un chatbot de texto en la percepción de naturalidad, presencia social y *perceived pedagogical support*? |
| **RQ2** | ¿En qué medida la modalidad corpórea y  influye en la eficacia pedagógica autónoma del participante (resolución sin código directo, turnos conversacionales, tiempo por tarea)? |
| **RQ3** | ¿Qué relación existe entre la modalidad del agente (Condición A vs B) y la carga cognitiva percibida (NASA-TLX) y el estado afectivo post-sesión (PANAS-SF, medido una vez al final)? |
| **RQ4** | ¿Se mantiene la latencia de respuesta multimodal por debajo de 1.5 segundos de forma consistente? |

## Rol del Agente — Sonic

- Analiza el contexto del estudiante (enunciado o código) para detectar discrepancias lógicas.
- Mantiene memoria del progreso conversacional para ajustar la dificultad de las preguntas (ZPD — Zona de Desarrollo Próximo, Vygotsky).
- Guía con preguntas reflexivas en tres niveles de andamiaje, sin proporcionar código directo.
- En la **Condición A**: reacciona visualmente mediante sprite Sonic en canvas Kaplay.js (8 estados: `idle`, `run`, `jump`, `think`, `celebrate`, `empathetic`, `excited`, `victory`), vocaliza con Piper TTS neuronal en español, detecta voz del estudiante vía Whisper STT local, y gamifica el progreso mediante un sistema de anillos (ganados cuando la respuesta aproxima la solución, perdidos ante frustración).
- En la **Condición B**: interfaz de chat de texto plano, mismo tutor socrático, sin avatar, sin voz, sin gamificación.

## Arquitectura Técnica

### Stack Tecnológico

| Capa / Componente | Tecnología | Razón principal |
|---|---|---|
| **Avatar 2D (Kaplay.js)** | Kaplay.js canvas 2D + sprite Sonic (16 frames) | Motor de juegos 2D ligero, 8 estados reactivos, animaciones fluidas (run/jump/idle), evita Valle Inquietante. Integración con backend via `[AVATAR_STATE]` tags. |
| **Motor de Razonamiento (LLM)** | Ollama + Gemma 3 12B (local, Q4_K_M ~7.3 GB) | Sin API keys externas. Inferencia GPU NVIDIA (RTX 5070 Ti 16 GB). Reproducible sin cuentas en la nube. |
| **Síntesis de Voz (TTS)** | Piper TTS neuronal (Docker local, español) + fallback Web Speech API | Calidad de audio neuronal natural, baja latencia (~300–500 ms), español de alta calidad, fallback automático si Piper no está disponible. |
| **Reconocimiento de Voz (STT)** | Whisper STT (local via `/api/stt` Next.js) | Reconocimiento de voz local sin dependencias de nube, español, baja latencia, integrado en backend. |
| **Gamificación** | Sistema de anillos + TaskTransitionGame (Kaplay mini-juego) | Anillos visuales (ring burst anim) ganados/perdidos según progreso socrático; mini-juego ~15 s entre tareas; SFX/BGM por zona temática. |
| **Framework / Orquestación** | Next.js 14 + React + TailwindCSS | SSR para proteger la configuración del servidor, rutas API integradas, streaming SSE nativo. |
| **Telemetría** | `logger.ts` + `store.ts` + `db.ts` (**SQLite** en `data/sonic.db`) | Registra TTFT y latencia total, turnos, tiempo por tarea, resolución autónoma (pruebas ocultas), intentos de ejecución, conversaciones completas y respuestas de cuestionarios. Base de datos local de un solo archivo (inspeccionable con *DB Browser for SQLite*); persistente entre reinicios; exportable a CSV/JSON/transcripciones; panel `/admin` (RQ1–RQ4). |

### Componentes Principales

- **Cliente web:** Avatar Sonic Kaplay 2D (canvas), entrada de texto y voz (Whisper STT), panel de código con syntax highlighting, timer por tarea.
- **Servidor de orquestación:** Estado de sesión, telemetría log-based (latencia, turnos, resolución, estado avatar), enrutamiento al LLM, endpoints `/api/tts`, `/api/stt`.
- **Servicios de IA locales:** Ollama (LLM) + Piper TTS (Docker) + Whisper STT (backend).
- **Gamificación:** Sistema de anillos, TaskTransitionGame (mini-juego Kaplay entre tareas), SFX/BGM, zonas temáticas (Chemical Plant / Speed Highway).
- **Flujo de streaming:** Server-Sent Events (SSE) para latencia percibida reducida, `[AVATAR_STATE]` tags para sincronía visual.

### Flujo de Interacción

1. El participante accede a `localhost:3000` y pulsa **PRESS START**. El servidor lo asigna a la Condición A o B mediante **contrabalanceo por bloques** (sin que el participante elija) y emite un ID secuencial (`P-001`, …).
2. **Sin formularios al inicio:** el participante entra directo a la Tarea 1 (`print_numbers()`, Chemical Plant). El código es **editable**; al pulsar Ejecutar corre en Pyodide contra pruebas ocultas. Toda la batería de cuestionarios se administra **una sola vez al final** (flujo `/post`): datos demográficos → Godspeed → apoyo pedagógico percibido → SUS → NASA-TLX → PANAS-SF → preguntas cualitativas, antes de mostrar los resultados. Esto elimina la fricción inicial y evita sesgos de anclaje de las medidas previas.
3. El participante interactúa con Sonic mediante texto (ambas condiciones) o voz via Whisper STT (solo Condición A).
4. El servidor procesa el historial de conversación y lo envía a Ollama vía streaming NDJSON, extrayendo tags `[AVATAR_STATE:estado]` del system prompt socrático.
5. La respuesta socrática se transmite al cliente mediante SSE. En Condición A: Piper TTS vocaliza la respuesta, el canvas Kaplay anima el sprite Sonic al estado indicado, y el sistema de anillos se actualiza (ganado/perdido). En Condición B: solo texto.
6. Tras completar Tarea 1, TaskTransitionGame (mini-juego Kaplay ~15 s) presenta Sonic colectando anillos y derrotando un Motobug.
7. Tarea 2 (`find_duplicates()` O(n³) → optimizar, Speed Highway zone) con el mismo flujo.
8. Al completar ambas tareas, resumen de sesión con análisis de latencia, turnos, resolución autónoma, y anillos acumulados (RQ2–RQ4).

### Cronograma Total de la Sesión Experimental

| Fase | Duración | Notas |
|---|---|---|
| **1. TAREA 1 (print_numbers)** | **10 min** | Depuración de bucle infinito, Chemical Plant zone. **Sin formularios previos.** |
| **2. TaskTransitionGame** | ~0.5 min | Mini-juego Kaplay entre tareas (Condición A solo) |
| **3. TAREA 2 (find_duplicates)** | **10 min** | Optimización O(n³)→O(n), Speed Highway zone |
| **4. Batería de cuestionarios (única, al final)** | ~6 min | Demográficos, Godspeed, apoyo pedagógico, SUS, NASA-TLX, PANAS-SF, cualitativo |
| **TOTAL** | **~26–27 min** | **Interacción pura con tareas: 20 minutos** |

> **Diseño:** todos los instrumentos se aplican una sola vez al final (diseño *post-only*).
> PANAS-SF mide el afecto post-sesión por condición; no hay toma previa. No se recoge
> consentimiento como instrumento in-app. La eficacia autónoma (RQ2) y la latencia (RQ4) se
> capturan automáticamente, sin auto-reporte.

---

## Ejecución de la Prueba de Concepto (PoC)

### Opción recomendada: Docker Compose (reproducible)

El sistema completo (app Next.js + Ollama + servicio de voz) se levanta con Docker Compose.
Es la forma en que se ejecuta el laboratorio y la más sencilla de reproducir.

```bash
git clone https://github.com/GabrielFallas/va-socratic-learning.git
cd va-socratic-learning

# 1) Descargar el modelo (una sola vez, ~7 GB)
docker compose up ollama -d
docker compose exec ollama ollama pull gemma3:12b

# 2) Levantar todo (producción)
docker compose up --build -d
#   o, para desarrollo con recarga en caliente:
#   docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

La interfaz queda en `http://localhost:3000`; el panel del facilitador en
`http://localhost:3000/admin`. Los datos se persisten en `./data/sonic.db` **en el host**
(volumen montado), de modo que sobreviven a reconstrucciones del contenedor y pueden abrirse con
*DB Browser for SQLite*. Requiere GPU NVIDIA con drivers de Docker para Gemma 3 12B (sin GPU,
Ollama usa CPU con mayor latencia).

> Para correr la app sin Docker (Node local), siga los pasos manuales más abajo.

### 1. Requisitos Previos

- **Node.js** v18.17 o superior y **npm**.
- **Ollama** instalado y ejecutándose localmente.
  - Instalar Ollama: [https://ollama.com/download](https://ollama.com/download)
  - Descargar el modelo: `ollama pull gemma3:12b`
  - Verificar que el servidor esté corriendo: `ollama serve` (por defecto en `http://localhost:11434`)
- **Docker** (para ejecutar Piper TTS neuronal en local).
  - Instalar Docker: [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
  - Descargar y ejecutar Piper TTS español:  
    ```bash
    docker run -d --name piper-tts -p 8000:8000 \
      -v $(pwd)/piper:/app/piper \
      rhasspy/piper:latest --model-dir /app/piper
    ```
    O use la imagen con soporte CUDA si dispone de GPU.
- **GPU NVIDIA** con VRAM suficiente (≥8 GB recomendado para Gemma 3 12B Q4_K_M + Piper.js).  
  Si no se dispone de GPU, Ollama y Piper usarán CPU (latencia significativamente mayor).

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

# Speech API (Piper TTS + Whisper STT) — FastAPI en speech-api/, puerto 5001.
# Si no está disponible, el TTS usa Web Speech API automáticamente.
SPEECH_API_URL=http://localhost:5001

# Carpeta de datos de telemetría (sesiones, eventos, asignación). Por defecto ./data
# DATA_DIR=./data
```

> **Nota de seguridad:** No se requieren API keys externas para la PoC. No subas credenciales al repositorio.

### 4. Lanzar el Servidor de Desarrollo

```bash
npm run dev
```

La interfaz de tutoría estará disponible en `http://localhost:3000`.

### 5. Ejecutar la Sesión Experimental

1. Abre `http://localhost:3000` en Chrome, Edge o Safari (navegadores con soporte Web Speech API para Whisper fallback).
2. Verifica el estado de los servicios mediante el **badge de salud** en la *landing page* (verde = listo) o con `GET /api/health`. Manualmente:
   - `curl http://localhost:11434/api/tags` (Ollama)
   - `curl http://localhost:5001/health` (Piper TTS + Whisper STT)
3. Selecciona **"Iniciar Sesión (Aleatoria)"** para asignación automática de condición (A = Sonic multimodal, B = texto plano).
4. **Condición A:** Lee/escucha instrucción inicial, interactúa con Sonic via texto o voz (micrófono), gana/pierde anillos, visualiza avatar reactivo.
5. **Condición B:** Interfaz de chat de texto plano, sin voz, sin avatar, sin anillos (control baseline).
6. Completa Tarea 1 (depuración bucle infinito `print_numbers()`, Chemical Plant, ~10 min).
7. TaskTransitionGame: Sonic colecta anillos, derrota Motobug, transición a Tarea 2.
8. Tarea 2 (análisis y optimización `find_duplicates()` O(n³)→O(n), Speed Highway, ~10 min).
9. Resumen de sesión con métricas de latencia, turnos conversacionales, % resolución autónoma, anillos acumulados (Condición A).

> **Sobre TTS/STT (Condición A):** 
> - **Piper TTS** (Docker): síntesis de voz neuronal español, latencia ~300–500 ms. Requiere `docker run` de Piper.
> - **Whisper STT** (backend): reconocimiento de voz local via `/api/stt`, requiere micrófono en navegador.
> - **Fallback:** Si Piper no está disponible, Whisper fallará (sin fallback automático a Web Speech API en la ruta `/api/stt`).
> - **Condición B:** Sin entrada de voz (teclado solo).

---

## Estructura del Repositorio

### Documentación

| Ruta | Descripción |
|---|---|
| [`docs/`](docs/) | Documentación principal del proyecto. |
| [`docs/entregable-1.pdf`](docs/entregable-1.pdf) | Documento del Entregable 1 (PDF). |
| [`docs/entregable-2.pdf`](docs/entregable-2.pdf) | Documento del Entregable 2 (PDF). |
| [`docs/entregable-2.html`](docs/entregable-2.html) | Documento principal del Entregable 2 (HTML). |
| [`docs/01-overview.md`](docs/01-overview.md) | Resumen del objetivo y motivación del proyecto. |
| [`docs/02-architecture.md`](docs/02-architecture.md) | Arquitectura y diseño del sistema. |
| [`docs/03-evaluation-protocol.md`](docs/03-evaluation-protocol.md) | Protocolo de evaluación y matriz de consistencia metodológica. |
| [`docs/04-evaluation-guide.md`](docs/04-evaluation-guide.md) | Guía paso a paso para la evaluación experimental. |
| [`docs/05-data-dictionary.md`](docs/05-data-dictionary.md) | Diccionario de datos: todas las columnas del CSV de exportación. |
| [`docs/06-coding-scheme.md`](docs/06-coding-scheme.md) | Esquema de codificación cualitativa para las transcripciones y preguntas abiertas. |
| [`docs/07-facilitator-guide.md`](docs/07-facilitator-guide.md) | Guía del facilitador: cómo correr una sesión real sin contaminar la base de datos. |
| [`paper/`](paper/) | Artículo académico (Entregable 3) en LaTeX — fuente `main.tex` + `references.bib`. |
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
| [`src/client/avatar/SonicGameCanvas.tsx`](src/client/avatar/SonicGameCanvas.tsx) | Canvas Kaplay.js con sprite Sonic, 8 estados reactivos, ring burst, hurt flash, motobug enemy, victory sequence. |
| [`src/client/components/ChatInterface.tsx`](src/client/components/ChatInterface.tsx) | Interfaz de chat — Condición A y B, Piper TTS, Whisper STT, WELCOME_A greeting, proactive message pool. |
| [`src/client/components/TaskTransitionGame.tsx`](src/client/components/TaskTransitionGame.tsx) | Mini-juego Kaplay entre tareas (~15 s): Sonic colecta anillos, derrota Motobug, outro con progress bar. |
| [`src/client/components/CodePanel.tsx`](src/client/components/CodePanel.tsx) | Panel de código con syntax highlighting, timer de tarea, indicador de progreso. |
| [`src/services/llm/ollamaClient.ts`](src/services/llm/ollamaClient.ts) | Cliente Ollama — streaming NDJSON, extracción de `[AVATAR_STATE:estado]` tags. |
| [`src/services/tts/piperTTS.ts`](src/services/tts/piperTTS.ts) | Servicio TTS — Piper TTS neuronal (Docker local, español) con fallback Web Speech API. |
| [`src/services/stt/whisperSTT.ts`](src/services/stt/whisperSTT.ts) | Servicio STT — Whisper local via `/api/stt` Next.js route, español. |
| [`src/services/audio/sfx.ts`](src/services/audio/sfx.ts) | Gestor de efectos de sonido (ring, jump, hurt, victory) y música de fondo por zona. |
| [`src/prompts/tutor-system.ts`](src/prompts/tutor-system.ts) | System prompt socrático **neutral, idéntico para ambas condiciones**; la Condición A añade el bloque de control `[AVATAR_STATE]`. Aísla el embodiment manteniendo constante el texto del tutor. |
| [`src/shared/config/tasks.ts`](src/shared/config/tasks.ts) | Tareas de depuración + arnés de pruebas ocultas (Pyodide) que determina la resolución autónoma. |
| [`src/shared/config/questionnaires.ts`](src/shared/config/questionnaires.ts) | Instrumentos validados de la batería *post-only* (demográficos, Godspeed, apoyo pedagógico percibido, SUS, NASA-TLX, PANAS-SF, cualitativo) con funciones de puntuación. |
| [`src/client/code/pyodideRunner.ts`](src/client/code/pyodideRunner.ts) · [`public/pyodide.worker.js`](public/pyodide.worker.js) | Ejecución de Python en el navegador (Web Worker) con timeout que mata bucles infinitos. |
| [`src/server/experiment/assignment.ts`](src/server/experiment/assignment.ts) | Asignación contrabalanceada (bloques permutados) persistida. |
| [`src/server/telemetry/logger.ts`](src/server/telemetry/logger.ts) · [`db.ts`](src/server/telemetry/db.ts) · [`store.ts`](src/server/telemetry/store.ts) · [`export.ts`](src/server/telemetry/export.ts) | Telemetría persistente en **SQLite** (`data/sonic.db`, con migración de datos JSON heredados) y exportación CSV/JSON/transcripciones. |
| [`scripts/analyze.py`](scripts/analyze.py) | Análisis A vs B sobre el CSV: descriptivos + Mann-Whitney U, δ de Cliff y d de Cohen (scipy opcional). |
| [`src/app/post/page.tsx`](src/app/post/page.tsx) · [`src/app/admin/page.tsx`](src/app/admin/page.tsx) | Batería única de cuestionarios al final y panel del facilitador (con estadística descriptiva A/B). |
| [`src/app/api/health/route.ts`](src/app/api/health/route.ts) | *Preflight* de salud — verifica Ollama y el servicio de voz antes de iniciar una sesión. |

### Pruebas

| Ruta | Descripción |
|---|---|
| [`tests/unit/`](tests/unit/) | Pruebas unitarias (Vitest): aislamiento del prompt por condición, extracción de `[AVATAR_STATE]`, puntuación de cuestionarios, exportación CSV, almacén/persistencia, balance de asignación. |
| [`tests/e2e/`](tests/e2e/) | Pruebas end-to-end (Playwright): ambas condiciones, runner de Pyodide, persistencia/exportación y flujos de cuestionarios. |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | CI: typecheck + unit + build, y un job de Playwright (sin Ollama, ejercita los caminos de degradación). |

```bash
npm test          # unitarias (Vitest)
npm run test:e2e  # end-to-end (Playwright, levanta el servidor)
npm run typecheck # verificación de tipos
```

### Recolección de Datos y Exportación

Cada sesión se persiste en una base de datos **SQLite** local (`data/sonic.db`), un único
archivo inspeccionable con *DB Browser for SQLite* y consultable con SQL para análisis ad-hoc.
Para el análisis:

- **Panel del facilitador:** [`/admin`](http://localhost:3000/admin) — tabla de sesiones, balance A/B, **gráficos comparativos A vs B** y **estadística descriptiva por condición** (media, DE y n de resolución, turnos, tiempo, TTFT, % latencia <1.5 s, think-time, SUS, NASA-TLX, apoyo pedagógico, subescalas Godspeed, PANAS) y botones de exportación.
- **CSV:** `GET /api/export?format=csv` — una fila por participante con métricas por tarea, **telemetría conductual automática** (verbosidad, *think-time* entre turnos, percentil 95 de TTFT, uso de voz, anillos) y puntajes de cuestionarios (`q_<instrumento>_<fase>_<score>`). Ver el diccionario completo en [`docs/05-data-dictionary.md`](docs/05-data-dictionary.md).
- **JSON:** `GET /api/export?format=json` — sesión completa con fidelidad total.
- **Transcripciones (JSONL):** `GET /api/export?format=transcripts` — un mensaje por línea (solo participantes reales) para **codificación cualitativa** de las conversaciones; esquema en [`docs/06-coding-scheme.md`](docs/06-coding-scheme.md).
- **Análisis inferencial:** `python scripts/analyze.py <sessions.csv>` — descriptivos por condición y (con `scipy`) Mann-Whitney U, δ de Cliff y d de Cohen por métrica; alternativa: jamovi/R.
- **Salud del sistema:** `GET /api/health` — comprueba que Ollama (y el servicio de voz) estén disponibles antes de iniciar una sesión; la *landing page* muestra un *badge* de estado.

> Los datos quedan bajo un identificador anónimo (`P-001`, …). La carpeta `data/` está en `.gitignore`.
> Para iniciar una recolección limpia, ver la guía del facilitador en [`docs/07-facilitator-guide.md`](docs/07-facilitator-guide.md).

---

## Condiciones Experimentales

| | Condición A — Sonic Embodied | Condición B — chat de texto |
|---|---|---|
| **Avatar (Canvas)** | ✓ Kaplay 2D Sonic, 16 frames, 8 estados reactivos | ✗ Sin avatar |
| **Voz (TTS)** | ✓ Piper TTS neuronal (Docker, español) + fallback Web Speech | ✗ Deshabilitada |
| **Reconocimiento de voz (STT)** | ✓ Whisper STT (backend `/api/stt`) | ✗ Deshabilitado (teclado solo) |
| **Gamificación** | ✓ Sistema de anillos, TaskTransitionGame, SFX/BGM, zonas temáticas | ✗ Sin anillos, sin mini-juego |
| **Modelo LLM** | ✓ Ollama + Gemma 3 12B (Q4_K_M) | ✓ Idéntico |
| **System Prompt** | ✓ `tutor-system.ts`: MISMO texto socrático neutral que B + bloque de control `[AVATAR_STATE]` | ✓ `tutor-system.ts`: texto idéntico, **sin** bloque de avatar (aísla el embodiment, no la persona) |
| **Tareas** | ✓ Editor de código real + ejecución en Pyodide; resolución = pruebas ocultas pasan | ✓ Idénticas |
| **Latencia objetivo** | ✓ < 1.5 s extremo a extremo (registro automático) | ✓ Idéntica |

---

## Consideraciones de Seguridad

- **API Keys:** No se requieren API keys externas para la PoC. Ollama, Piper TTS y Whisper STT corren completamente local.
- **Datos de sesión:** Los logs de conversación y la telemetría (latencia, turnos, resolución, anillos acumulados) se almacenan en una base SQLite local (`data/sonic.db`) bajo un ID alfanumérico único (ej. `P-001`), sin nombre legal ni correo del participante.
- **`.env.local`:** El archivo de variables de entorno está incluido en `.gitignore` y nunca debe subirse al repositorio.
- **Reproducibilidad:** Todos los servicios (Ollama, Piper, Next.js) corren en máquinas locales del laboratorio. No hay dependencias de nube. Las sesiones pueden ser replicadas con idéntico hardware y configuración.

---

*Proyecto individual · Gabriel Isaías Fallas López · PF-3311 · UCR · I Semestre 2026*
