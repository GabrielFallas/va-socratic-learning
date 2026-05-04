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
| Motor grafico | Ready Player Me + Three.js (React Three Fiber) | Avatar 3D web con bajo costo de integracion. |
| Motor de razonamiento (LLM) | Google Gemini 3.1 Flash | Equilibrio entre velocidad y razonamiento para dialogo socratico. |
| TTS | gemini-3.1-flash-tts-preview | Voz expresiva con baja latencia. |
| STT | Whisper (OpenAI) / Deepgram | Transcripcion precisa de terminos tecnicos. |
| Lip sync | NeuroSync / Oculus Lipsync (viseme based) | Sincronizacion de labios desde audio en navegador. |
| Entorno de despliegue | Web | Acceso rapido sin instalacion local. |
| Orquestacion | Next.js o React | Enrutamiento y proteccion de claves en servidor. |

### Componentes principales
- Cliente web con avatar, entrada de texto/voz, y renderizado en tiempo real.
- Servidor de orquestacion para estado, memoria conversacional y ruteo de servicios.
- Servicios de IA para STT, LLM y TTS con flujo de streaming.
- Telemetria para latencia, turnos de dialogo y resolucion autonoma.

### Flujo de interaccion (baja latencia)
1. El usuario envia texto o voz desde el cliente web.
2. El servidor procesa audio con STT y actualiza memoria conversacional.
3. El LLM genera preguntas socraticas y las transmite en streaming.
4. El TTS convierte tokens en audio mientras se genera la respuesta.
5. El cliente sincroniza lip sync y gestos con el audio recibido.
6. Se registran metricas de latencia y efectividad pedagogica.

## Estructura del repositorio

### Documentacion
| Ruta | Descripcion |
| --- | --- |
| [docs/](docs/) | Documentacion del proyecto. |
| [docs/entregable-1.pdf](docs/entregable-1.pdf) | Documento del entregable 1 (PDF). |
| [docs/description.md](docs/description.md) | Resumen del objetivo y motivacion. |
| [docs/main-document.md](docs/main-document.md) | Documento principal del proyecto. |
| [docs/evaluation-protocol.md](docs/evaluation-protocol.md) | Protocolo de evaluacion. |
| [docs/proyect-canvas.html](docs/proyect-canvas.html) | Canvas del proyecto. |

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
