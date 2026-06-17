# Protocolo de Evaluación

---

## 1. Participantes y Roles

**Participantes del Estudio (Usuarios):**
- **Estudiantes universitarios** de ingeniería o ciencias de la computación (primeros años, cursos introductorios)
- Experiencia heterogénea con programación (desde principiantes hasta intermedios)
- Reclutados según disponibilidad en horarios del curso PF-3311

**Evaluadores y Observadores (Personal Investigador):**
- **Docentes o senior managers** con experiencia en educación STEM y pedagogía
- Realiza observación heurística durante la sesión, registra comportamientos no verbales, señales de frustración, y calidad del andamiaje socrático
- Proporciona retroalimentación cualitativa sobre la efectividad pedagógica del agente (rúbrica experta)
- Su expertise valida la pertinencia educativa de las pistas del agente

---

## 2. Definición de Variables

**Variable Independiente (VI):**

- **Nivel de Presencia y Modalidad del Agente:**
  Se comparará la interacción con el **Agente Virtual Sonic Embodied** (canvas Kaplay 2D, sprite Sonic 8 estados reactivos, Piper TTS neuronal, Whisper STT, anillos s, zonas Chemical Plant / Speed Highway) frente a una interacción de control basada únicamente en **Texto** (mismo tutor socrático, sin canvas, sin voz, sin gamificación — Chatbot Socrático plano).

**Variables Dependientes (VD):**

- **Eficacia Pedagógica Autónoma:** Capacidad del usuario para resolver el error lógico de forma autónoma sin código directo (porcentaje de resolución, turnos, tiempo).
- **Naturalidad y Soporte Pedagógico:** Percepción de naturalidad, presencia social y soporte pedagógico percibido (perceived pedagogical support).
- **Latencia y Continuidad Conversacional:** Tiempo de respuesta extremo a extremo (end-to-end) del sistema multimodal < 1.5s y percepción de continuidad.
- **Carga Cognitiva y Estado Afectivo:** Nivel de demanda mental (NASA-TLX) y cambios en el estado emocional (PANAS-SF).

---

## 3. Instrumentos de Medición

> **Diseño *post-only* (Entregable 3):** no hay formularios al inicio. Toda la batería se
> administra una sola vez al final de la sesión. Esto reduce la fricción inicial, evita el
> *priming* de las medidas previas y traslada la carga de auto-reporte a un único momento.

| **Instrumento Validado** | **Propósito** | **Momento de Administración** |
|---|---|---|
| **Cuestionario Demográfico** | Perfil demográfico, experiencia previa en programación y con IA | Batería final (1.º) |
| **Godspeed Questionnaire** (5 subescalas semánticas diferenciales) | Antropomorfismo, vitalidad, amabilidad, inteligencia percibida, seguridad (RQ1) | Batería final |
| **SUS — System Usability Scale** (10 ítems Likert 1-5) | Usabilidad del sistema | Batería final |
| **NASA-TLX** (6 dimensiones con escala analógica) | Carga cognitiva percibida (RQ3) | Batería final |
| **PANAS-SF** (10 ítems) | Estado afectivo **post-sesión** (afecto positivo/negativo, RQ3) | Batería final (una sola toma) |
| **Preguntas Cualitativas Abiertas** (3 ítems) | Apreciación general, lo que más/menos gustó | Batería final (último) |
| **Métricas conductuales automáticas** | Latencia (TTFT, p95), turnos, % resolución autónoma (pruebas ocultas), tiempo por tarea, *think-time* entre turnos, verbosidad (caracteres/palabras), uso de voz vs. teclado, anillos | Continuo, sin auto-reporte |

**Orden de la batería final única (por este orden):**
1. Demográficos
2. Godspeed
3. SUS
4. NASA-TLX
5. PANAS-SF (post)
6. Preguntas cualitativas abiertas

*Nota:* SIMS y la escala ad-hoc de Perceived Pedagogical Support se retiraron de la batería
para reducir la fatiga del participante; ninguna respondía a una RQ de forma directa.

---

## 4. Procedimiento de la Sesión (Paso a Paso)

1. **Inicio de Sesión — Sin formularios previos:**
   El participante pulsa **PRESS START** y entra directo a la experiencia. No se administran
   cuestionarios al inicio; toda la batería (incluido el demográfico y PANAS-SF) se aplica una
   sola vez al final de la sesión.

2. **Asignación de Condición Experimental (Aleatorizada):**
   El participante es asignado aleatoriamente a:
   - **Condición A (Sonic Embodied):** Interfaz con Sonic (canvas Kaplay 2D, TTS Piper neuronal, STT Whisper, anillos s, zonas temáticas Chemical Plant / Speed Highway)
   - **Condición B (Texto):** Chat de texto plano sin representación visual del agente
   
   El investigador carga la interfaz sin revelar el objetivo de la comparación.

3. **Instrucciones Neutras de las Tareas:**
   Se entregan instrucciones neutras redactadas para evitar priming sobre "embodiment", "presencia" o "avatar". Las tareas son:
   - **Tarea 1:** Depuración de bucle infinito en Python (max. 10 minutos / 600 segundos)
   - **Tarea 2:** Análisis de complejidad y optimización algorítmica (max. 10 minutos / 600 segundos)

4. **Fase de Interacción (Debugging):**
   El participante intenta resolver el problema interactuando de forma multimodal (voz vía Whisper STT o texto escrito) con el agente en un navegador web. El sistema (Sonic Kaplay 2D + Piper TTS neuronal + Whisper STT + anillos s) aplicará técnicas de andamiaje y preguntas reflexivas sin entregar el código corregido. En Condición A, el avatar Sonic reacciona visualmente (8 estados: `idle`, `run`, `jump`, `think`, `celebrate`, `empathetic`, `excited`, `victory`) y el sistema otorga/retira anillos según el avance socrático del participante; Piper TTS vocaliza las respuestas del agente con prosodia natural. Tras 60 s de inactividad, se envía automáticamente un mensaje proactivo (pool de 4 pistas específicas por tarea, sin repetición). Durante toda la interacción, el sistema registra automáticamente la telemetría conductual (latencia, turnos, *think-time*, verbosidad, uso de voz, anillos) sin interrumpir al participante.

5. **Observación Heurística Continua (por Docentes/Senior Managers):**
   Los evaluadores con experiencia pedagógica STEM registran durante la interacción del estudiante:
   - Comportamientos no verbales y señales de frustración/desenganche
   - Calidad pedagógica de las pistas socráticas del agente (validación experta)
   - Posibles problemas de sincronía entre el estado visual del sprite Sonic (Kaplay) y la respuesta de Piper TTS (Condición A)
   - Fallos en el reconocimiento de voz (Whisper STT) o en la reproducción de audio (Piper TTS / fallback Web Speech)
   - Comportamiento del sistema de anillos: ganancias/pérdidas coherentes con el progreso socrático
   - Latencia registrada automáticamente por el sistema en backend

6. **Cierre de Tareas:**
   Cada sesión de tarea finaliza cuando el participante identifica el error lógico **o** cuando se alcanza el tiempo máximo (10 minutos por tarea, máximo 20 minutos total de interacción con las 2 tareas).
   
   ---
   
   ## **CRONOGRAMA TOTAL DE LA SESIÓN EXPERIMENTAL (Ambas Condiciones A y B)**
   
   | Componente | Duración | Descripción |
   |---|---|---|
   | **1. TAREA 1 — Depuración de bucle infinito (print_numbers)** | ~10 minutos (600 seg) | Interacción socrática multimodal (Condición A) o texto (Condición B). **Sin formularios previos.** |
   | **2. TaskTransitionGame (mini-juego Kaplay)** | ~0.5 minutos | Transición gamificada entre tareas (Condición A solo) |
   | **3. TAREA 2 — Optimización algoritmo (find_duplicates)** | ~10 minutos (600 seg) | Interacción socrática multimodal (Condición A) o texto (Condición B) |
   | **4. Batería final única (Demográficos, Godspeed, SUS, NASA-TLX, PANAS-SF, Cualitativo)** | ~6 minutos | Todos los instrumentos al final, una sola vez |
   | **TOTAL POR PARTICIPANTE** | **~26–27 minutos** | Ambas condiciones (A y B) siguen el mismo protocolo temporal |
   
   > **Nota crítica:** La duración de **interacción pura con las tareas es de 20 minutos** (10 min + 10 min = 20 min, sin incluir transiciones y cuestionarios).

7. **Evaluación Post-Interacción (Batería Única al Final):**
   El participante completa los siguientes cuestionarios en orden:
   1. Demográficos
   2. Godspeed Questionnaire — naturalidad y presencia social
   3. SUS — usabilidad del sistema
   4. NASA-TLX — carga cognitiva percibida
   5. PANAS-SF (post) — afecto post-sesión
   6. Preguntas cualitativas abiertas
   
8. **Entrevista Breve del Estudiante (Cualitativa):**
   El estudiante participa en una breve entrevista semi-estructurada (~5 minutos) donde comenta:
   - Percepción general de la experiencia con el agente
   - Utilidad percibida de las pistas socráticas vs. respuestas directas
   - Comparación con herramientas de IA generativa tradicionales (ChatGPT, GitHub Copilot)
   - Sugerencias de mejora o crítica constructiva
   
9. **Retroalimentación Experta (Docentes/Senior Managers):**
   Los evaluadores completan una rúbrica experta sobre:
   - Calidad pedagógica del andamiaje socrático observado
   - Consistencia del agente en prohibición de código directo
   - Efectividad en escalar desde pistas generales a específicas
   - Pertinencia educativa para el contexto STEM universitario

---

## 5. Justificación del Protocolo

| Decisión del Protocolo                  | Justificación Técnica / Pedagógica                                                                 |
|-----------------------------------------|---------------------------------------------------------------------------------------------------|
| Comparación Avatar 2D vs. Texto (VI)    | Permite aislar si la inversión técnica en fusión multimodal de baja fricción (sprite Sonic Kaplay 2D, 8 estados reactivos, Piper TTS neuronal, Whisper STT, anillos s) realmente aporta valor a la percepción de **naturalidad**, **presencia social** y **perceived pedagogical support**. Este diseño responde directamente a la brecha identificada en investigación previa sobre embodiment en tutoría socrática. |
| Control de Variables (LLM idéntico)    | Ambas condiciones (A y B) utilizan **idéntico** system prompt socrático, modelo LLM (Ollama + Gemma 3 12B) y tareas. Esto asegura que cualquier diferencia significativa se atribuye causalmente a la **presencia del embodiment multimodal**, no a calidad de tutoría. |
| Medición de Latencia < 1.5s             | Un retraso mayor rompería la ilusión de conversación natural, convirtiendo la interacción en un intercambio de comandos. La latencia extremo a extremo se registra automáticamente en el backend (Condición A). |
| Prohibición Explícita de Código Directo | Es el núcleo de la metodología socrática para combatir la dependencia de la IA y fomentar el pensamiento crítico. El system prompt de Sonic (sonic-system.ts) prohíbe explícitamente generar código; todas las respuestas deben ser preguntas reflexivas. |
| Instrucciones Neutras (Sin Priming)     | Las instrucciones de tarea evitan mencionar "avatar", "embodiment" o "presencia" para minimizar sesgos de expectativa (Efecto Proteus). El participante desconoce el objetivo de comparación. |
| PANAS-SF Pre y Post                     | Mide el **delta afectivo** inducido por la interacción, controlando el estado emocional basal del participante. Fundamental para RQ3 (relación entre modalidad y estado afectivo). |
| Godspeed como Estándar HCI              | Escala multidimensional validada en HRI/HCI (Bartneck et al., 2009); sus 5 subescalas (antropomorfismo, vitalidad, amabilidad, inteligencia, seguridad) capturan percepciones de agentes virtuales robustamente. |

---

## 6. Gestión de Datos y Anonimización

- **Identificación Única:** Todos los datos quedan vinculados a un **ID alfanumérico único** (ej. `P-001`, `P-002`, etc.), generado aleatoriamente al inicio de la sesión.
- **Almacenamiento de Logs:** Los logs de conversación y datos de latencia se almacenan en **servidor cifrado** bajo el ID único, sin nombre legal, correo u otros identificadores directos.
- **Consentimiento Informado:** Antes de la sesión, el participante firma consentimiento informado adaptado al estudio (código PF-3311, investigador principal, unidad ejecutora ECCI/UCR).
- **Aceptación Obligatoria:** Pregunta de aceptación explícita sobre confidencialidad y uso de datos para investigación académica.
- **Custodia de Datos:** Los datos anonimizados se custodian conforme a protocolos UCR de investigación eterno y pueden ser utilizados para publicaciones académicas sin identificación de participante.

---