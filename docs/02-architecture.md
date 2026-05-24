**UNIVERSIDAD DE COSTA RICA**  
**SISTEMA DE ESTUDIOS DE POSGRADO**

**Implementación de un Agente Virtual de Tutoría Socrática para el Desarrollo de Lógica de Programación y Resolución de Problemas en Entornos STEM**

**Temas Especiales de Ingeniería de Sistemas de Información: Agentes Virtuales Inteligentes**  
**Código:** PF-3311  
**Grupo: G1**  
**Profesor:**  
Prof. Alexander Barquero Elizondo

**Nombre completo:**  
Gabriel Fallas López

**Centro Universitario:** San José

**Fecha:** 4 de mayo de 2026  
**PRIMER SEMESTRE 2026**

---

## Tabla de Contenidos

1. [Definición del Problema](#definición-del-problema)
2. [Revisión de Literatura](#revisión-de-literatura)
3. [Preguntas de Investigación](#preguntas-de-investigación)
4. [Objetivos del Agente](#objetivos-del-agente)
5. [Arquitectura Técnica](#arquitectura-técnica)
6. [Referencias Bibliográficas](#referencias-bibliográficas)

---

## Definición del Problema: La Crisis de la Lógica en la Educación STEM Contemporánea

La educación en ciencias, tecnología, ingeniería y matemáticas (STEM) atraviesa un período de transformación crítica impulsado por la integración masiva de herramientas de Inteligencia Artificial Generativa. En el ámbito específico de la educación en computación, la emergencia de los grandes modelos de lenguaje (LLMs) ha generado una paradoja pedagógica: mientras que el acceso a soluciones de código es más inmediato que nunca, el desarrollo de las habilidades de razonamiento lógico y descomposición de problemas —fundamentales del pensamiento computacional— se encuentra bajo una amenaza cognitiva.

El problema central reside en la dependencia de la IA, un fenómeno donde los estudiantes de cursos introductorios utilizan herramientas como ChatGPT o GitHub Copilot no como socios de aprendizaje, sino como motores de respuestas directas. Esta práctica elimina el proceso de prueba y error, esencial para la asimilación de conceptos abstractos como estructuras de datos y algoritmos. Cuando un estudiante delega la resolución de un error lógico a un sistema que simplemente devuelve el código corregido, se produce una descarga cognitiva que impide la formación de modelos mentales robustos. Las consecuencias de este vacío de lógica se manifiestan en niveles superiores de la carrera, donde los estudiantes carecen de la autonomía necesaria para depurar sistemas complejos de manera independiente.

Las soluciones actuales de tutoría automatizada suelen carecer de un marco de andamiaje cognitivo. La mayoría de las herramientas comerciales priorizan la eficiencia de la tarea sobre la profundidad del aprendizaje, lo que resulta en un desajuste pedagógico. Un docente humano, en un entorno ideal de tutoría uno a uno, utiliza el método socrático —no proporciona la respuesta, sino que guía al estudiante mediante preguntas reflexivas que sacan a la luz sus propias contradicciones y lagunas de conocimiento. Sin embargo, la escalabilidad de este enfoque es nula en facultades con cientos de estudiantes por curso.

Existe, por tanto, una necesidad urgente de desarrollar sistemas de tutoría inteligente (ITS) que no solo sean capaces de comprender el lenguaje natural y el código, sino que estén técnicamente restringidos y pedagógicamente alineados para actuar como tutores socráticos. La investigación sugiere que un agente virtual corporizado (*Embodied Virtual Agent*) —con presencia visual, voz y gestos— puede ofrecer una ventaja sobre los chatbots tradicionales al aumentar la presencia social y reducir la carga cognitiva mediante señales no verbales, facilitando una interacción más natural durante procesos de aprendizaje complejos.

---

## Revisión de Literatura: Evolución de la Tutoría Inteligente y el Giro Socrático en la Era de los LLMs

La literatura académica sobre la enseñanza de la programación y el uso de agentes inteligentes ha experimentado un crecimiento exponencial en la última década, transitando de sistemas basados en reglas hacia arquitecturas neuronales dinámicas.

### Perspectivas Pedagógicas y el Método Socrático en Sistemas Digitales

El método socrático se fundamenta en la mayéutica, el arte de ayudar a dar a luz el conocimiento a través del diálogo. En el contexto de STEM, esta técnica se traduce en guiar al estudiante a través de su Zona de Desarrollo Próximo (ZPD), concepto de Lev Vygotsky que define el espacio entre lo que un aprendiz puede hacer solo y lo que puede lograr con guía.

Investigaciones como las de Ali et al. (2026) demuestran mediante marcos cuasi-experimentales que un Sistema de Tutoría Socrática mejora significativamente el rendimiento académico frente a la instrucción tradicional, especialmente en estudiantes con bajos conocimientos previos. El mecanismo mediador clave es el compromiso metacognitivo. En el ámbito de la computación, Sunil y Thakkar (2025) proponen el sistema "SocraticAI", que utiliza restricciones técnicas para transformar LLMs genéricos en tutores guiados.

### Desafíos de la Educación en Computación ante la GenAI

Raihan et al. (2025) señalan en su revisión sistemática que, aunque los LLMs pueden completar la mayoría de las asignaturas introductorias, su uso irresponsable compromete la integridad académica y la calidad del aprendizaje. Phung et al. (2023) comparan el desempeño de ChatGPT y GPT-4 frente a tutores humanos, encontrando que la IA tiende a ser demasiado directa y carece de la sensibilidad pedagógica necesaria.

**El Rol de la Encarnación y la Presencia Social en Agentes Virtuales**

La literatura sobre Agentes Pedagógicos Incorporados (EPAs) explora el Efecto Persona, que postula que la presencia de un personaje virtual, incluso con expresividad mínima, impacta positivamente en la experiencia del estudiante. Yang y Zhan (2025) exploran la encarnación en la programación asistida por IA en realidad virtual, encontrando que la presencia corpórea y las señales sociales mejoran la motivación. El Hajji et al. (2025) proponen arquitecturas multimodales que sincronizan la interacción para reducir la carga cognitiva externa.

### Síntesis de Investigaciones Académicas Relevantes

| Enfoque Pedagógico | Tecnología/Modelo | Hallazgo Principal | Fuente |
|:---|:---|:---|:---|
| Socrático / Constructivista | IA Generativa | La metacognición media las ganancias de aprendizaje en STEM. | Ali et al. (2026) |
| Socrático / Reflexivo | LLM (S-ICA) | Mejora el pensamiento reflexivo y crítico en educación superior. | Xi et al. (2026) |
| Andamiaje (Scaffolding) | SocraticAI (LLM) | Las restricciones técnicas mejoran la descomposición de problemas. | Sunil & Thakkar (2025) |
| Enseñanza Perspicaz | SocraticLM | Fine-tuning para diálogo socrático supera modelos base. | Liu et al. (2024) |
| Programación por Parejas | VR / Avatar Embodied | La corporeidad mejora el apoyo emocional y la eficiencia. | Yang & Zhan (2025) |
| Razonamiento Matemático | MathDial (Dataset) | El andamiaje es superior a la resolución directa de problemas. | Macina et al. (2023) |
| Argumentación Científica | Socratic AI (ChatGPT) | Supera al método ADI tradicional en pensamiento crítico. | Kao et al. (2025) |
| Tutoría Inmersiva | VR / LLM / Multimodal | La sincronización multimodal aumenta el realismo. | El Hajji et al. (2025) |
| Evaluación Pedagógica | Blender / GPT-3 | Define métricas para la calidad del tutor de IA. | Tack & Piech (2022) |
| Aprendizaje Adaptativo | Dialogue Planning | La memoria a largo plazo es vital para la personalización. | Dong et al. (2026) |

### Brechas Identificadas y Oportunidades de Contribución

A pesar del avance en modelos socráticos y en la visualización de avatares, existe una brecha significativa en la integración de ambos en un sistema cohesivo para la educación en computación. La mayoría de los ITS socráticos actuales son interfaces de texto. Aquellos que utilizan avatares a menudo emplean guiones predefinidos o animaciones limitadas que no reaccionan dinámicamente al estado emocional o cognitivo del estudiante.

Esta investigación pretende abordar esta brecha mediante la implementación de un Agente Virtual Corporizado de Tutoría Socrática que utilice LLMs no solo para el diálogo, sino para orquestar una respuesta multimodal (voz, gestos, expresiones) que refuerce el andamiaje pedagógico.

### El Giro Socrático: Alineación Pedagógica y Reinforcement Learning en LLMs

Jurenka et al. (2024) proponen que el uso de Aprendizaje por Refuerzo es fundamental para alinear los LLMs con principios pedagógicos específicos, implementando internamente el concepto de Zona de Desarrollo Próximo de Vygotsky. En el sistema, este principio se implementa mediante un protocolo de escalado de pistas en tres niveles dentro del system prompt (sonic-system.ts).

### Personalización Adaptativa y Memoria a Largo Plazo

Dong et al. (2026) argumentan que la memoria a largo plazo y la planificación del diálogo adaptativo son vitales para mantener el compromiso durante interacciones prolongadas. El servidor de orquestación de Sonic (Next.js + logger.ts) mantiene el historial completo de la sesión, ajustando la complejidad socrática según el avance observado.

---

## Preguntas de Investigación (RQs)

> **Nota:** Las RQs fueron actualizadas en el Entregable 2 para incorporar la corrección del feedback del E1. El término "fluidez pedagógica" fue sustituido por **"perceived pedagogical support"** y se añadió la condición de control "texto plano" (Condición B — mismo tutor socrático sin embodiment multimodal).

- **RQ1:** ¿Cómo afecta la presencia de un agente corporizado (Sonic Kaplay 2D + TTS Piper + STT Whisper + anillos + gamificación) versus el mismo tutor en modo texto plano sobre la percepción de **naturalidad**, **presencia social** y ***perceived pedagogical support*** de los participantes durante sesiones de tutoría socrática de programación? Métricas: Godspeed, escala PPS ad hoc, SUS.

- **RQ2:** ¿En qué medida la modalidad corpórea del agente socrático influye en la **eficacia pedagógica autónoma** del participante —medida por porcentaje de resolución sin código directo, número de turnos conversacionales y tiempo por tarea— en tareas de depuración lógica de código? Métricas: métricas log-based automáticas.

- **RQ3:** ¿Qué relación existe entre la **carga cognitiva percibida** (NASA-TLX), el **estado afectivo** (PANAS-SF) y la modalidad del agente durante la tarea? Métricas: NASA-TLX Raw TLX, PANAS-SF delta, SIMS.

- **RQ4:** ¿Qué relación existe entre la latencia total de respuesta multimodal y la percepción de continuidad conversacional, manteniendo tiempos menores a 1.5 s? Métricas: latencia log-based extremo a extremo.

---

## Objetivos del Agente: Rol, Comportamiento y Contexto de Uso

El agente virtual se define no como una herramienta de productividad, sino como un **compañero cognitivo** diseñado para fomentar la independencia intelectual del estudiante.

### Rol del Agente

El papel principal del agente es el de un **Tutor Socrático**. A diferencia de un asistente tradicional, el agente no comparte la respuesta directamente. Su función es observar el código del estudiante, identificar el error lógico internamente —sin mencionarlo— y formular una secuencia de preguntas orientadoras. El agente debe mostrar empatía y apoyo emocional, especialmente cuando detecta signos de frustración, manteniendo una personalidad alentadora pero firme en su negativa a proporcionar código directo.

El agente se compone mediante *system prompting* y *prompt engineering*:

1. **Perfil del Personaje: Sonic the Hedgehog** (Condición A)
   Sonic es el tutor socrático de programación más veloz del mundo — energético, directo, confiado. Su misión no es escribir código, sino guiar al estudiante con preguntas reflexivas hasta que descubra la solución por sí mismo. Usa expresiones características de Sonic y celebra los logros con energía. Detecta la frustración y baja el ritmo para apoyar al estudiante.

2. **Estilo de Comunicación**  
   Tono energético, directo, motivador y socrático. Respuestas breves (máximo 3-4 oraciones), terminando siempre con una pregunta reflexiva. Nunca usa emojis. Las respuestas incluyen etiqueta `[AVATAR_STATE:estado]` al final para controlar el canvas Kaplay.

3. **Restricciones Absolutas del Sistema**
   - Prohibido generar código directamente.
   - Prohibido decir al estudiante exactamente qué está mal.
   - Todas las respuestas deben terminar con una pregunta reflexiva.
   - Máximo 3–4 oraciones por respuesta.

### Contexto de Uso y Usuario Objetivo

El sistema interactúa con el usuario en un entorno web enfocado en tareas de depuración (*debugging*). El usuario objetivo es un estudiante universitario de ingeniería o ciencias de la computación en las etapas iniciales de aprendizaje de lógica algorítmica.

### Objetivos Específicos de Comportamiento

- **Análisis de Contexto:** El agente lee el código actual del estudiante (inyectado en el system prompt) y detecta las discrepancias lógicas.
- **Gestión de Memoria y Escalado de Andamiaje (ZPD):** Mantiene el historial de la conversación y escala progresivamente el nivel de las pistas en tres niveles.
- **Multimodalidad Reactiva (Condición A):** Sincroniza comportamientos del canvas Kaplay (estados de Sonic: idle, thinking, speaking, listening, happy, curious, empathetic, encouraging) con la voz TTS Piper + STT Whisper + anillos + SFX/BGM.

---

## Arquitectura Técnica

### Stack Tecnológico y Justificación

> **Nota:** La arquitectura fue actualizada sucesivamente en el Entregable 2 y la PoC final. El motor de avatar Ready Player Me (VRM 3D) fue reemplazado por un canvas Kaplay.js 2D con el sprite de Sonic the Hedgehog. El LLM fue migrado de Google Gemini a Ollama local con Gemma 3 12B. TTS migró de Web Speech API a Piper TTS neuronal (Docker local) con fallback Web Speech. STT migró de Web Speech API a Whisper STT local.

| Capa / Componente | Tecnología Implementada | Justificación Técnica y Académica |
|:---|:---|:---|
| **Avatar / Motor de Juego (Condición A)** | Kaplay.js 2D + Sprite Sonic the Hedgehog (16 frames, animaciones run/jump) | Canvas side-scrolling con 8 estados expresivos mapeados a comportamientos de Sonic. Zonas temáticas por tarea: Chemical Plant (Tarea 1) y Speed Highway (Tarea 2). Sistema de anillos . Evita el Valle Inquietante (Mori, 1970). |
| **Motor de Razonamiento (LLM)** | Ollama + Gemma 3 12B (Q4_K_M) — inferencia GPU local | Sin API keys externas. ~7.3 GB en RTX 5070 Ti 16 GB VRAM. System prompt sonic-system.ts con ZPD de 3 niveles, detección de frustración y control de avatar via [AVATAR_STATE]. |
| **Síntesis de Voz (TTS)** | Piper TTS neuronal (Docker local) + fallback Web Speech API | Piper: español de alta calidad, latencia <200 ms. Fallback automático a Web Speech API. Activo solo en Condición A. |
| **Reconocimiento de Voz (STT)** | Whisper STT local (vía /api/stt en Next.js) | Transcripción de voz del participante en tiempo real. Español latinoamericano. Activo solo en Condición A. |
| **Gamificación** | Sistema de anillos + mini-juego Kaplay de transición + SFX/BGM | Anillos como indicador de progreso socrático. TaskTransitionGame (~15 s) entre tareas. sfx.ts: efectos de sonido y música por zona. Solo Condición A. |
| **Mensajes Proactivos** | Pool de pistas por tarea, disparo tras 60 s de inactividad | Sonic envía pistas específicas por tarea-1 y tarea-2 cuando el participante está inactivo. Refuerza ZPD sin intervención del investigador. |
| **Sincronización Reactiva** | Control de estados del avatar desde el LLM (etiquetas `[AVATAR_STATE]`) | El LLM incluye una etiqueta al final de cada respuesta; el cliente la interpreta y actualiza el comportamiento del canvas Kaplay (estados Sonic). |
| **Orquestación** | Next.js 14 (App Router) + React + TailwindCSS | Rutas API integradas: /api/chat, /api/tts, /api/stt, /api/session. Streaming SSE nativo. |

### Flujo de Interacción y Orquestación de Baja Latencia

Para cumplir con el requisito de baja latencia inferior a 1.5 segundos, el sistema utiliza un flujo de streaming de tokens mediante Server-Sent Events (SSE). A medida que Ollama genera la respuesta socrática, los tokens se transmiten al cliente en tiempo real. El motor visual 2D actualiza su estado al recibir la etiqueta `[AVATAR_STATE]` al final del stream. La síntesis de voz (TTS Piper o fallback Web Speech API) inicia en cuanto el texto completo está disponible. El estado del avatar (canvas Kaplay) se actualiza al recibir la etiqueta [AVATAR_STATE] extraída del stream. El sistema de anillos y los efectos de sonido se disparan según el estado del avatar.

```
Usuario → [texto o voz]
         ↓ STT (Condición A)
         ↓ HTTP POST /api/chat
         ↓ Ollama NDJSON streaming
         ↓ SSE chunks → cliente
         ↓ Avatar state extracted
         ↓ TTS playback (Condición A)
         ↓ Avatar sync → state CSS animation
```

---

## Referencias Bibliográficas

1. Ali, S. R., et al. (2026). From Tool to Tutor: Socratic AI Tutoring, Metacognitive Engagement, and Prior Knowledge as Determinants of Learning Gains in Gateway STEM Courses. *Regional Lens*.
2. Dong, Z., et al. (2026). Learning from Long-Term Engagement: Adaptive Tutoring Dialogue Planning for Personalized Education. *AAAI Conference on Artificial Intelligence*.
3. El Hajji, M., et al. (2025). An Architecture for Intelligent Tutoring in Virtual Reality: Integrating LLMs and Multimodal Interaction for Immersive Learning. *Information, 16*(7), 556.
4. Essel, H. B., et al. (2024). AI-mediated questioning and engagement. *MDPI Sustainability, 17*(21), 9508.
5. Jurenka, S., et al. (2024). From Problem-Solving to Teaching Problem-Solving: Aligning LLMs with Pedagogy using Reinforcement Learning. *arXiv*.
6. Kao, S., et al. (2025). Socratic AI in K–12 Science Classrooms. *ResearchGate*.
7. Liu, Y., et al. (2024). SocraticLM: Exploring Socratic Personalized Teaching with Large Language Models. *ResearchGate*.
8. Macina, J., et al. (2023). MathDial: A Dialogue Tutoring Dataset with Rich Pedagogical Properties. *arXiv*.
9. Phung, T., et al. (2023). Generative AI for Programming Education: Benchmarking ChatGPT, GPT-4, and Human Tutors. *arXiv*.
10. Raihan, N., et al. (2025). Large Language Models in Computer Science Education: A Systematic Literature Review. *ResearchGate*.
11. Sonlu, S., et al. (2024). A scoping review of embodied conversational agents in education: Trends and innovations from 2014 to 2024. *ResearchGate*.
12. Sunil, K., & Thakkar, A. (2025). SocraticAI: Transforming LLMs into Guided CS Tutors Through Scaffolded Interaction. *arXiv*.
13. Tack, A., & Piech, C. (2022). Clean Code Tutoring: Makings of a Foundation. *ResearchGate*.
14. Xi, L., et al. (2026). Investigating the effects of an LLM-based Socratic conversational agent on student learning in higher education. *NIE Repository*.
15. Yang, X., & Zhan, Y. (2025). 'Embodied' AI in Virtual Reality Improves Programming Student Learning. *NC State News*.
