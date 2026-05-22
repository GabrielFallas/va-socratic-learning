# Implementacion de un Agente Virtual de Tutoria Socratica

## Resumen
Repositorio del proyecto de investigacion sobre un agente virtual de tutoria socratica para el desarrollo de logica de programacion y resolucion de problemas en entornos STEM. El objetivo es evaluar si una interaccion basada en preguntas reflexivas y pistas graduales mejora la comprension y la autonomia del estudiante sin entregar soluciones directas.

## Proposito y motivacion
El proyecto busca mitigar la dependencia de herramientas de IA que entregan codigo completo y, en su lugar, fomentar pensamiento critico, descomposicion de problemas y razonamiento algoritimico. Un agente virtual puede ofrecer tutoria uno-a-uno de forma escalable y alineada con el metodo socratico.

## Rol del agente virtual
- Analizar el contexto del estudiante (enunciado o codigo) para detectar discrepancias logicas.
- Mantener memoria del progreso para ajustar la dificultad de las preguntas.
- Guiar con preguntas reflexivas, sin proporcionar codigo directo.

## Resultados esperados
- Reduccion de la brecha de logica en tareas nuevas y mayor autonomia en depuracion.
- Mayor retencion de conocimientos y confianza al programar desde cero.

## Arquitectura tecnica

### Stack tecnologico
| Capa / componente | Tecnologia | Razon principal |
| --- | --- | --- |
| Motor Visual / 2D | Live2D Cubism / Sprites Reactivos | Avatar 2D expresivo que evita el Uncanny Valley, consumiendo mínimos recursos para tareas cognitivas pesadas. |
| Motor de razonamiento (LLM) | Google Gemini 3.1 Flash | Equilibrio entre velocidad y razonamiento para dialogo socratico. |
| TTS | gemini-3.1-flash-tts-preview | Voz expresiva con latencia <500ms y pausas SSML. |
| STT y Visión | Whisper / face-api.js / Screen Capture | Fusión transmodal: transcripción y reconocimiento del entorno (DOM del editor). |
| Sincronización | Audio-to-State Mapping (Web Audio API) | Análisis de frecuencias para generar beats visuales (estados reactivos 2D) en sincronía con el habla. |
| Entorno de despliegue | Web | Acceso rapido sin instalacion local. |
| Orquestacion | Next.js o React | Enrutamiento y proteccion de claves en servidor. |

### Componentes principales
- Cliente web con avatar, entrada de texto/voz, y renderizado en tiempo real.
- Servidor de orquestacion para estado, memoria conversacional y ruteo de servicios.
- Servicios de IA para STT, LLM y TTS con flujo de streaming.
- Telemetria para latencia, turnos de dialogo y resolucion autonoma.

### Flujo de interaccion (baja latencia)
1. El usuario envia texto o voz desde el cliente web.
2. El servidor procesa audio con STT y actualiza memoria conversacional, recibiendo opcionalmente estados analizados del editor (Screen Vision).
3. El LLM genera preguntas socraticas progresivas guiadas por la Zona de Desarrollo Proximo y las transmite en streaming.
4. El TTS convierte tokens (con etiquetas SSML para pausas empaticas) en audio.
5. El cliente web lanza beats visuales (estados del avatar 2D) reactivos en sincronia al audio recibido.
6. Se registran metricas continuas de latencia y efectividad pedagogica.

## Entorno de Desarrollo Local (Configuración)

Para replicar y ejecutar la arquitectura M-ITS en tu entorno local, sigue estos pasos rigurosamente:

### 1. Requisitos Previos
- **Node.js** (v18.17 o superior) y **npm** o **yarn**.
- **Cuentas de Servicios (API Keys)** para:
  - Google Gemini API (para Gemini 3.1 Flash LLM y TTS).
  - OpenAI (para Whisper STT).

### 2. Instalación de Dependencias
Clona el repositorio e instala las dependencias base (Next.js/React y librerías de Live2D/Audio):
```bash
git clone https://github.com/tu-usuario/va-socratic-learning.git
cd va-socratic-learning
npm install
```

### 3. Configuración de Variables de Entorno
Crea un archivo `.env.local` en la raíz del proyecto tomando como plantilla `.env.example`, y añade tus credenciales:
```env
NEXT_PUBLIC_GEMINI_API_KEY=tu_clave_de_gemini
NEXT_PUBLIC_OPENAI_API_KEY=tu_clave_de_openai
# Variables adicionales para telemetría y web sockets
```

### 4. Lanzamiento del Servidor de Desarrollo
Ejecuta el servidor de Next.js:
```bash
npm run dev
```
La interfaz de tutoría estará disponible en `http://localhost:3000`.

### 5. Configuración de Live2D/Sprites (Avatar)
Si bien el entorno de UI levanta por defecto, para ver el modelo 2D, asegúrate de colocar los recursos del modelo (archivos `.moc3`, `.json`, `.png`) dentro del directorio `public/avatar_assets/`.

## Estructura del repositorio

### Documentacion
| Ruta | Descripcion |
| --- | --- |
| [docs/](docs/) | Documentacion principal del proyecto. |
| [docs/entregable-1.pdf](docs/entregable-1.pdf) | Documento del entregable 1 (PDF). |
| [docs/01-overview.md](docs/01-overview.md) | Resumen del objetivo y motivacion. |
| [docs/02-architecture.md](docs/02-architecture.md) | Arquitectura y diseño del sistema (M-ITS). |
| [docs/03-evaluation-protocol.md](docs/03-evaluation-protocol.md) | Protocolo de Evaluación y Matriz de Consistencia. |
| [docs/04-evaluation-guide.md](docs/04-evaluation-guide.md) | Guía paso a paso para la evaluación. |
| [docs/project-canvas.html](docs/project-canvas.html) | Canvas del proyecto interactivo. |
| [docs/experimental-instrument.html](docs/experimental-instrument.html) | Instrumento/Consentimiento experimental web. |

### Codigo fuente (alineado a la arquitectura)
| Ruta | Descripcion |
| --- | --- |
| [src/](src/) | Codigo fuente principal. |
| [src/client/](src/client/) | Cliente web (UI, avatar y audio). |
| [src/client/avatar/](src/client/avatar/) | Render y control del avatar. |
| [src/client/audio/](src/client/audio/) | Captura y reproduccion de audio. |
| [src/client/components/](src/client/components/) | Componentes de interfaz. |
| [src/client/state/](src/client/state/) | Estado y memoria en cliente. |
| [src/client/ui/](src/client/ui/) | Vistas y layout. |
| [src/server/](src/server/) | Servidor de orquestacion. |
| [src/server/api/](src/server/api/) | Endpoints y contratos. |
| [src/server/orchestration/](src/server/orchestration/) | Coordinacion STT/LLM/TTS. |
| [src/server/memory/](src/server/memory/) | Memoria conversacional. |
| [src/server/telemetry/](src/server/telemetry/) | Metricas y logs. |
| [src/services/](src/services/) | Integraciones de IA. |
| [src/services/llm/](src/services/llm/) | Cliente del LLM. |
| [src/services/stt/](src/services/stt/) | Servicio de transcripcion. |
| [src/services/tts/](src/services/tts/) | Servicio de voz. |
| [src/prompts/](src/prompts/) | Prompts socraticos. |
| [src/shared/](src/shared/) | Tipos y utilidades compartidas. |
| [src/shared/config/](src/shared/config/) | Configuracion. |
| [src/shared/types/](src/shared/types/) | Tipos y contratos. |
| [src/shared/utils/](src/shared/utils/) | Utilidades comunes. |

### Pruebas
| Ruta | Descripcion |
| --- | --- |
| [tests/](tests/) | Suite de pruebas. |
| [tests/unit/](tests/unit/) | Pruebas unitarias. |
| [tests/integration/](tests/integration/) | Pruebas de integracion. |
| [tests/e2e/](tests/e2e/) | Pruebas end-to-end. |

### Scripts
| Ruta | Descripcion |
| --- | --- |
| [scripts/](scripts/) | Automatizaciones y utilidades. |
| [scripts/setup/](scripts/setup/) | Preparacion de entorno. |
| [scripts/evaluation/](scripts/evaluation/) | Scripts de evaluacion. |
