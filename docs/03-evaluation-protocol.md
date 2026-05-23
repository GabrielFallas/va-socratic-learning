# Diseño del Protocolo de Evaluación y Matriz de Consistencia

**Universidad de Costa Rica — Sistema de Estudios de Posgrado**  
**Temas Especiales en Ingeniería de Sistemas: Agentes Virtuales Inteligentes (PF-3311)**  
**Profesor:** Alexander Barquero Elizondo  
**Estudiante:** Gabriel Isaías Fallas López  
**Fecha de entrega:** 25 de mayo de 2026  
**Ciclo:** I Semestre 2026

## Apartado A: Definición de Condiciones Experimentales

### Condición A — Experimental: Ada (Agente Pedagógico Afectivo 2D de Baja Fricción)

La **Condición A** consiste en la interacción con **Ada**, la tutora socrática multimodal. Técnicamente, Ada utiliza un modelo **2D expresivo implementado en CSS y SVG animado** (sin librerías externas) que cambia de estado según la intención socrática de la respuesta del LLM. Esta condición implementa las siguientes vías multimodales:
1. **Canal Visual (2D):** Avatar ubicado en la zona superior derecha del panel de chat, con 8 estados expresivos reactivos (idle, thinking, speaking, listening, happy, curious, empathetic, encouraging). Diseño estilizado tipo *cartoon* que evita el Valle Inquietante y favorece tareas de alta carga cognitiva.
2. **Canal Auditivo (Sincronía Paraverbal):** Síntesis de voz mediante Web Speech API (SpeechSynthesis, nativa del navegador) con sincronización de la animación de la boca al estado de reproducción de audio.
3. **Control de Estado desde el LLM:** El modelo de lenguaje incluye una etiqueta `[AVATAR_STATE:estado]` al final de cada respuesta; el cliente la interpreta y actualiza las animaciones CSS del avatar en consecuencia.

El razonamiento socrático lo ejecuta **Ollama con Gemma 3 12B** (Q4_K_M, inferencia GPU local) con un *system prompt* que prohíbe explícitamente entregar código directo y escala el andamiaje en tres niveles de ZPD.

**Características técnicas de la Condición A:**
- **Motor visual:** CSS/SVG Animado (sin librerías externas) — 8 estados expresivos
- **STT:** Web Speech API — SpeechRecognition (nativa del navegador), español latinoamericano
- **LLM:** Ollama + Gemma 3 12B con *system prompt* socrático (ZPD 3 niveles)
- **TTS:** Web Speech API — SpeechSynthesis (nativa del navegador), sincronizada con animación de boca
- **Gestos:** Animaciones 2D (CSS keyframes) reactivas al estado emocional del diálogo
- **Latencia objetivo:** < 1.5 s extremo a extremo (registro automático en backend)

---

### Condición B — Control (Baseline): Interfaz de Chat Socrático en Texto Plano

La **Condición B** consiste en la interacción con el mismo agente socrático Ada, pero desprovisto de toda representación visual, síntesis de voz y animaciones. El participante se enfrenta a una interfaz de chat conversacional de texto plano —estilo terminal o ventana de mensajería— donde lee las respuestas de Ada en forma escrita y responde mediante teclado. El **system prompt** y las restricciones del LLM son idénticos a los de la Condición A: Ada no entrega código directo, formula preguntas reflexivas y escala las pistas de lo general a lo específico según el ZPD del participante. Lo que se elimina deliberadamente en esta condición son todos los vectores de embodiment multimodal: el avatar, la voz, el lip-sync y los gestos. El nombre "Ada" permanece visible en la interfaz como remitente del mensaje para mantener la coherencia de la identidad del agente, pero sin representación corporal.

**Características técnicas de la Condición B:**
- **Interfaz:** Chat de texto plano (HTML/CSS básico, sin representaciones visuales del agente)
- **LLM:** Ollama + Gemma 3 12B con **idéntico** *system prompt* socrático
- **TTS:** Deshabilitado
- **Avatar/Gestos:** Ninguno
- **Input:** Solo texto (teclado)

---

### Justificación de la Comparación para Aislar el Efecto del Embodiment

La lógica experimental de esta comparación se fundamenta en el principio del **control de variables**. Al mantener constante el modelo de razonamiento (Ollama + Gemma 3 12B), el *system prompt* socrático, las tareas asignadas y el ambiente de laboratorio, cualquier diferencia estadísticamente significativa observada entre los grupos —en medidas de presencia social, perceived pedagogical support, usabilidad, carga cognitiva o estado afectivo— puede atribuirse causalmente a la **presencia del embodiment multimodal del agente** (avatar 2D + voz paraverbal + sensibilidad afectiva), no al contenido ni a la calidad de la tutoría. Esta comparación responde directamente a la brecha identificada en el Entregable 1: la literatura documenta que los agentes corporizados mejoran la experiencia del usuario, pero la evidencia en contextos de tutoría socrática de programación es escasa. El diseño A vs. B permite aportar evidencia empírica a esa brecha específica, cumpliendo además con la recomendación del profesor Barquero de incluir una condición "sin avatar" para validar el valor diferencial de la vía multimodal (M-ITS) propuesta sobre un simple generador de texto.

---

## Apartado B: Matriz de Consistencia Metodológica

> **Nota sobre RQs:** Se incorpora la corrección del E1: "fluidez pedagógica" se sustituye por **"perceived pedagogical support"** como constructo estándar en la literatura HCI educativa.

### Preguntas de Investigación Actualizadas

- **RQ1:** ¿Cómo afecta la presencia de un agente corporizado (avatar 2D afectivo + sincronía paraverbal + visión computacional) versus una interfaz de chat en texto plano sobre la percepción de **naturalidad**, **presencia social** y **perceived pedagogical support** de los participantes durante sesiones de tutoría socrática de programación?

- **RQ2:** ¿En qué medida la modalidad corpórea del agente socrático influye en la **eficacia pedagógica autónoma** del participante —medida por porcentaje de resolución sin código directo, número de turnos conversacionales y tiempo por tarea— en tareas de depuración lógica de código?

- **RQ3:** ¿Qué relación existe entre la **carga cognitiva percibida** (NASA-TLX), el **estado afectivo** (PANAS-SF) y la modalidad del agente (Condición A vs. B) durante una sesión de tutoría socrática de resolución de problemas?

- **RQ4:** ¿Qué relación existe entre la latencia total de respuesta multimodal y la percepción de continuidad conversacional en el piloto, manteniendo tiempos estrictos menores a 1.5s?

---

### Tabla de Consistencia Lógica

| **Pregunta de Investigación (RQ)** | **Variable / Constructo** | **Instrumento Validado** | **Tarea Asociada en el Guion** |
|---|---|---|---|
| **RQ1** — Naturalidad y Presencia Social | Anthropomorphism, Animacy, Likeability, Perceived Intelligence | **Godspeed Questionnaire** (Bartneck et al., 2009) — 5 subescalas semánticas diferenciales | Post-sesión: el participante evalúa al agente tras completar ambas tareas de debugging |
| **RQ1** — Perceived Pedagogical Support | Apoyo pedagógico percibido, utilidad de las pistas socráticas, sensación de guía | **Escala Likert ad-hoc de 5 ítems** adaptada de Essel et al. (2024) | Post-tarea 1 (bucle infinito) y post-tarea 2 (refactorización algorítmica) |
| **RQ1** — Usabilidad del sistema | Facilidad de uso, learnability, satisfacción de uso | **SUS — System Usability Scale** (Brooke, 1996) — 10 ítems Likert 1-5 | Cierre de la sesión completa de interacción |
| **RQ2** — Eficacia pedagógica autónoma | % tareas resueltas sin código directo; N° de turnos hasta resolución; tiempo total (seg) | **Métricas log-based automáticas** (logs de conversación del backend) | Tarea 1: Depuración de bucle infinito en Python; Tarea 2: Análisis de complejidad y optimización algorítmica |
| **RQ2** — Motivación situacional | Motivación intrínseca, interés, esfuerzo percibido durante la tarea | **SIMS — Situational Intrinsic Motivation Scale** (Guay et al., 2000) — 16 ítems | Post-interacción con el agente (inmediatamente después de completar o agotar el tiempo de las tareas) |
| **RQ3** — Carga cognitiva | Demanda mental, temporal, esfuerzo, frustración, performance, esfuerzo | **NASA-TLX** (Hart & Staveland, 1988) — 6 dimensiones con escala analógica | Post-interacción completa (tras la última tarea) |
| **RQ3** — Estado afectivo | Afecto positivo (PA) y afecto negativo (NA) | **PANAS-SF** (Thompson, 2007) — 10 ítems | **PRE-interacción** (línea base) y **POST-interacción** (cambio de estado) |
| **RQ4** — Latencia < 1.5s y Continuidad | Latencia extremo a extremo (ms), tasa de errores de audio, percibida continuidad | **Registros automáticos del sistema** (timestamps en backend) | Continuo durante toda la sesión (Condición A únicamente) |
| Transversal / Control | Perfil demográfico, experiencia previa con programación y con IA | **Cuestionario demográfico ad-hoc** | Inicio de sesión (antes de cualquier exposición al agente) |

---

### Notas Metodológicas sobre los Instrumentos

- **Godspeed** es el estándar en HRI/HCI para evaluar percepciones de agentes robóticos y virtuales; su validación multilingüe lo hace aplicable en español con mínima adaptación semántica.
- **SUS** opera en escala 0-100; un puntaje ≥ 68 indica usabilidad aceptable. Su brevedad (10 ítems, ~2 minutos) minimiza la fatiga post-experimentación.
- **NASA-TLX** es el instrumento más utilizado en Computing Education para medir carga cognitiva. La versión "Raw TLX" (sin pesaje de dimensiones) es preferida en estudios de pilotaje.
- **PANAS-SF** se administra en dos momentos (pre/post) para capturar el delta afectivo inducido por la interacción, controlando el estado emocional basal del participante.
- **SIMS** es sensible a la motivación situacional —no a disposiciones crónicas— lo que la hace idónea para medir el efecto inmediato de la modalidad del agente sobre el engagement.
- Las **métricas log-based** operacionalizan la eficacia pedagógica de forma objetiva, complementando las auto-reportadas y eliminando el sesgo de deseabilidad social en RQ2.

---

## Apartado C: Protocolo Experimental HTML

> El protocolo oficial adaptado se encuentra en el archivo `docs/experimental-instrument.html` de este repositorio. A continuación se describen sus componentes principales.

El archivo HTML adaptado incluye:
1. **Identificación formal del estudio**: Código PF-3311, investigador principal, unidad ejecutora (ECCI/UCR).
2. **Consentimiento informado** adaptado al estudio AVTS, con pregunta de aceptación obligatoria explícita.
3. **Carga de la condición** según asignación aleatoria (Grupo A: Avatar / Grupo B: Texto), con instrucciones al investigador para cargar la interfaz correspondiente sin revelar el objetivo al participante.
4. **Instrucciones neutras** de las tareas, redactadas para evitar priming o sesgos de inducción (no se menciona "avatar", "embodiment" ni "presencia" en las instrucciones al participante).
5. **Listado de cuestionarios post-interacción** en orden: PANAS-SF (post), Godspeed, SUS, NASA-TLX, SIMS, Perceived Pedagogical Support.
6. **Plan de anonimización**: todos los datos quedan vinculados a un ID alfanumérico único (ej. `P-001`); los logs de conversación se almacenan en servidor cifrado bajo ese ID, sin nombre legal.

---

## Apartado D: Justificación Teórica en HCI

### D.1 Soporte No Verbal del Embodiment del Avatar — Justine Cassell

Justine Cassell y colegas (Cassell et al., 2000) constituyen la base canónica sobre los **Agentes Conversacionales Corporizados (ECAs)**. Su contribución central es demostrar que la comunicación humana es inherentemente **multimodal**: el 65% de la información social se transmite por canales no verbales —gestos, mirada, postura, expresiones faciales— que operan en sincronía con el discurso verbal para construir significado y presencia social. En consecuencia, un agente es verdaderamente "encarnado" no por el mero hecho de tener una representación visual, sino por la **integración funcional de sus comportamientos no verbales con el acto de habla**.

En el diseño de Ada, la teoría de Cassell se implementa a tres niveles adaptados al M-ITS y la animación 2D:

1. **Sincronía Paraverbal (Voice-Driven Empathy)**: Cuando Ada pregunta "¿qué valor tiene esta variable en la línea 7?", la voz incorpora marcadores SSML para pausas empáticas y un tono adaptativo sincronizado con la intención del comportamiento, lo cual transmite una "corporeidad acústica" y un lazo social potente.

2. **Beats Visuales y Respuestas 2D Reactivas**: Mediante animaciones CSS y SVG, el avatar cambia a estados de escucha activa (backchannel) o comprensión (estados *listening*, *thinking*). Cassell documenta que la ausencia de estas señales genera percepción de indiferencia y eleva la ansiedad del interlocutor.

3. **Fusión Multimodal (Screen Vision) y Expresiones Afectivas**: Integrando visualización del contexto (DOM o cámara web), el agente adecúa sus microexpresiones socráticas integrando la percepción del estado del estudiante, brindando así andamiaje ajustado sin dar la respuesta directamente.

La hipótesis derivada de Cassell es que los participantes de la **Condición A** percibirán una mayor **naturalidad** e **inteligencia percibida** del agente que los de la Condición B, medibles en las subescalas de Godspeed.

Adicionalmente, Cassell conecta con la teoría de **andamiaje de Vygotsky (ZPD)** al señalar que las expresiones afectivas y el canal paraverbal funcionan como andamios no verbales que sostienen la atención del estudiante en su zona de desarrollo próximo: en lugar de dar la respuesta directamente, el agente utiliza su modelo de "Screen Vision" y pausas acústicas para señalar el punto de confusión para que el estudiante lo examine. Este vínculo corrige la brecha identificada en el E1 entre la teoría de scaffolding y la arquitectura técnica del agente.

---

### D.2 Diseño del Soporte Relacional y Lazos Afectivos — Timothy Bickmore

Timothy Bickmore y Rosalind Picard (2005) desarrollan el concepto de **agente relacional**: un sistema conversacional que, más allá de completar tareas, construye y mantiene una **relación social** con el usuario a lo largo del tiempo. Su investigación pionera con el agente "Laura" —un coach de actividad física— demuestra que los usuarios que interactúan con agentes que exhiben comportamientos relacionales (reconocimiento de interacciones previas, pequeñas conversaciones, expresiones de cuidado) reportan significativamente mayor **confianza**, **satisfacción** y **adherencia** que los que interactúan con agentes puramente transaccionales.

En el contexto de la tutoría socrática, el soporte relacional es especialmente crítico porque el método socrático genera **tensión cognitiva inevitable**: el agente no da respuestas. Si el estudiante percibe esa negativa como indiferencia o rigidez, la frustración escalará hasta abandonar la tarea. Bickmore demuestra que los lazos relacionales actúan como amortiguadores afectivos: la relación de confianza preexistente hace que el estudiante interprete la ausencia de respuesta directa como *guía deliberada*, no como incapacidad del agente.

Ada implementa principios de Bickmore mediante:

- **Memoria conversacional persistente**: El agente recuerda qué pistas ya ofreció y qué conceptos el estudiante ya demostró entender, ajustando la complejidad socrática sin repetir andamios redundantes. ("Anteriormente notaste el problema con el índice fuera de rango —esta vez te propongo que identifiques cuál estructura de datos causaría el mismo síntoma si el tamaño no es fijo.")
- **Reconocimiento afectivo del esfuerzo**: Ada incluye frases relacionales que validan el proceso sin validar la respuesta. ("Veo que llevas bastante tiempo en esto. Esa persistencia es exactamente la actitud que construye la arquitectura mental de un programador.")
- **Protocolo de des-escalada de frustración**: Si el estudiante lleva más de 3 turnos sin avance, Ada introduce una pista de andamiaje más concreta (escala desde general hacia específica), acompañada de un reconocimiento empático: "Entiendo que esta parte puede ser contraintuitiva al principio."

La medición de esta dimensión se realiza mediante **PANAS-SF** (delta afectivo positivo/negativo), **SIMS** (motivación intrínseca situacional) y la subescala de *Likeability* de Godspeed. La hipótesis es que los participantes de la Condición A mostrarán un mayor delta afectivo positivo y mayor motivación intrínseca que los de la Condición B.

---

### D.3 Variaciones de Comportamiento del Usuario — Efecto Proteus (Yee & Bailenson)

Nick Yee y Jeremy Bailenson (2007) documentan el **Efecto Proteus**: las personas adaptan su comportamiento, actitudes y rendimiento en función de la apariencia del avatar —propio o del interlocutor— con el que interactúan. Este efecto opera a través de dos mecanismos: (1) las expectativas conductuales asociadas al aspecto del avatar activan esquemas de comportamiento compatibles, y (2) la "presencia" de un interlocutor visual modifica la autopresentación del usuario.

En el diseño experimental del AVTS, el Efecto Proteus genera dos predicciones con implicaciones metodológicas directas:

**Predicción 1 — Reducción de la ansiedad de evaluación:**  
Un avatar con rasgos autoritarios, hiperrealistas o institucionales (traje formal, expresión seria, espacio clínico) activa el esquema cognitivo de *evaluador*, elevando la **ansiedad de evaluación** (*evaluation apprehension*) documentada por Rosenberg (1969). Esta ansiedad lleva al estudiante a priorizar dar respuestas que parezcan correctas sobre reflexionar genuinamente —lo opuesto al modo mental que el método socrático requiere. Ada, por el contrario, fue diseñada deliberadamente con una estética estilizada, colores cálidos no institucionales y una personalidad de "compañero de estudio avanzado": esto activa el esquema de *colaborador*, no de *evaluador*, reduciendo la ansiedad y habilitando el modo de exploración cognitiva segura. Esta decisión de diseño puede confirmarse en los datos de **PANAS-SF** (reducción del afecto negativo basal en Condición A).

**Predicción 2 — Incremento del compromiso conductal:**  
Yee y Bailenson demuestran que interactuar con un agente visualmente presente —incluso sin control directo de su avatar— aumenta el compromiso comportamental del usuario: más turnos conversacionales, respuestas más elaboradas, mayor persistencia ante la dificultad. En el experimento AVTS, se predice que los participantes de la Condición A producirán más turnos conversacionales y menor tasa de abandono que los de la Condición B, efecto medible en las **métricas log-based** de RQ2.

**Riesgo del Uncanny Valley (Mori, 1970):**  
El efecto inverso —conocido como el Valle Inquietante— ocurre cuando un avatar es "casi humano" pero falla en microexpresiones o sincronía temporal. En ese umbral, la respuesta emocional del usuario pasa de empatía a incomodidad, elevando la carga cognitiva y dañando la experiencia. El diseño 2D estilizado de Ada —deliberadamente de tipo 'cartoon-like' y reactivo— neutraliza este riesgo por completo al operar en el territorio seguro de la representación claramente artificial pero altamente expresiva. Esta decisión se refleja en la extrema eficiencia y baja latencia de la aplicación web, superior al renderizado 3D (Three.js/VRM), reduciendo el consumo de recursos computacionales durante la alta demanda de la tarea de programación.

---

## Referencias Adicionales (Apartado D)

- Bartneck, C., Kulić, D., Croft, E., & Zoghbi, S. (2009). Measurement instruments for the anthropomorphism, animacy, likeability, perceived intelligence, and perceived safety of robots. *International Journal of Social Robotics, 1*(1), 71–81.
- Bickmore, T. W., & Picard, R. W. (2005). Establishing and maintaining long-term human–computer relationships. *ACM Transactions on Computer-Human Interaction, 12*(2), 293–327.
- Brooke, J. (1996). SUS: A "quick and dirty" usability scale. In P. W. Jordan, B. Thomas, B. A. Weerdmeester & I. L. McClelland (Eds.), *Usability evaluation in industry* (pp. 189–194). Taylor & Francis.
- Cassell, J., Sullivan, J., Prevost, S., & Churchill, E. (Eds.). (2000). *Embodied conversational agents*. MIT Press.
- Essel, H. B., Vlachopoulos, D., Essuman, A. B., & Amankwa, J. O. (2024). AI-mediated questioning and engagement. *MDPI Sustainability, 17*(21), 9508.
- Guay, F., Vallerand, R. J., & Blanchard, C. (2000). On the assessment of situational intrinsic and extrinsic motivation: The Situational Motivation Scale (SIMS). *Motivation and Emotion, 24*(3), 175–213.
- Hart, S. G., & Staveland, L. E. (1988). Development of NASA-TLX (Task Load Index): Results of empirical and theoretical research. In P. A. Hancock & N. Meshkati (Eds.), *Human mental workload* (pp. 139–183). North-Holland.
- Mori, M. (1970). The uncanny valley. *Energy, 7*(4), 33–35. (Traducido por MacDorman & Kageki, 2012).
- Thompson, E. R. (2007). Development and validation of an internationally reliable short-form of the Positive and Negative Affect Schedule (PANAS). *Journal of Cross-Cultural Psychology, 38*(2), 227–242.
- Yee, N., & Bailenson, J. (2007). The Proteus effect: The effect of transformed self-representation on behavior. *Human Communication Research, 33*(3), 271–290.

---

*Documento preparado para la Tarea #10 — PF-3311 · Universidad de Costa Rica · I Ciclo 2026*
