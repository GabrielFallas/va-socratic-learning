# **Implementación de un Agente Virtual de Tutoría Socrática para el desarrollo de lógica de programación y resolución de problemas en entornos STEM**

Estudiante: Gabriel Isaías Fallas López

## **Definición del Problema: La Crisis de la Lógica en la Educación STEM Contemporánea**

La educación en ciencias, tecnología, ingeniería y matemáticas (STEM) atraviesa un periodo de transformación crítica impulsado por la integración masiva de herramientas de Inteligencia Artificial Generativa. En el ámbito específico de la educación en computación, la emergencia de los grandes modelos de lenguaje (LLMs) ha generado una paradoja pedagógica: mientras que el acceso a soluciones de código es más inmediato que nunca, el desarrollo de las habilidades de razonamiento lógico y descomposición de problemas fundamentales del pensamiento computacional, se encuentra bajo una amenaza de cognitiva.

El problema central reside en la dependencia de la IA, un fenómeno donde los estudiantes de cursos introductorios utilizan herramientas como ChatGPT o GitHub Copilot no como socios de aprendizaje, sino como motores de respuestas directas. Esta práctica elimina el proceso de prueba y error, esencial para la asimilación de conceptos abstractos como estructuras de datos y algoritmos. Cuando un estudiante delega la resolución de un error lógico a un sistema que simplemente devuelve el código corregido, se produce una descarga cognitiva que impide la formación de modelos mentales robustos. Las consecuencias de este vacío de lógica se manifiestan en niveles superiores de la carrera, donde los discentes carecen de la autonomía necesaria para depurar sistemas complejos de manera independiente.

Las soluciones actuales de tutoría automatizada suelen carecer de un marco de andamiaje cognitivo. La mayoría de las herramientas comerciales priorizan la eficiencia de la tarea sobre la profundidad del aprendizaje, lo que resulta en un desajuste pedagógico. Un docente humano, en un entorno ideal de tutoría uno a uno, utiliza el método socrático en donde no proporciona la respuesta, sino que guía al estudiante mediante preguntas reflexivas que sacan a la luz sus propias contradicciones y lagunas de conocimiento. Sin embargo, la escalabilidad de este enfoque es nula en facultades con cientos de estudiantes por curso, siendo lastimosamente la realidad del mayor grosor del cuerpo estudiantil en el mundo.

Existe, por tanto, una necesidad urgente de desarrollar sistemas de tutoría inteligente (ITS) que no solo sean capaces de comprender el lenguaje natural y el código, sino que estén técnicamente restringidos y pedagógicamente alineados para actuar como tutores socráticos. La investigación sugiere que un agente virtual corporizado, *Embodied Virtual Agent* en inglés, el cual consiste un avatar con presencia física, voz y gestos, puede ofrecer una ventaja competitiva sobre los chatbots tradicionales al aumentar la presencia social y reducir la carga cognitiva mediante señales no verbales, lo que facilita una interacción más natural y menos frustrante durante procesos de aprendizaje complejos. El desafío técnico y científico radica en integrar estas capacidades en una arquitectura de baja latencia que sincronice la inteligencia socrática de un LLM con una representación visual creíble en entornos STEM.

## **Revisión de Literatura: Evolución de la Tutoría Inteligente y el Giro Socrático en la Era de los LLMs**

La literatura académica sobre la enseñanza de la programación y el uso de agentes inteligentes ha experimentado un crecimiento exponencial en la última década, transitando de sistemas basados en reglas hacia arquitecturas neuronales dinámicas. Para situar el problema en el contexto académico existente, es necesario analizar las intersecciones entre la pedagogía socrática, el aprendizaje de la programación y la personificación  de la inteligencia artificial.

### **Perspectivas Pedagógicas y el Método Socrático en Sistemas Digitales**

El método socrático se fundamenta en la mayéutica, el arte de ayudar a dar a luz el conocimiento a través del diálogo. En el contexto de STEM, esta técnica se traduce en guiar al estudiante a través de su Zona de Desarrollo Próximo (ZPD), un concepto de Lev Vygotsky que define el espacio entre lo que un aprendiz puede hacer solo y lo que puede lograr con guía. La literatura reciente destaca que los tutores socráticos basados en IA pueden producir ganancias de aprendizaje equivalentes siempre que fomenten el compromiso metacognitivo.

Investigaciones como las de Ali et al. (2026) demuestran mediante marcos cuasi-experimentales que un Sistema de Tutoría Socrática (SATS) mejora significativamente el rendimiento académico frente a la instrucción tradicional, especialmente en estudiantes con bajos conocimientos previos. El mecanismo mediador clave es el compromiso metacognitivo, en donde se obliga al estudiante a reflexionar sobre sus propios procesos de pensamiento, el sistema fortalece la retención a largo plazo. En el ámbito de la computación, Sunil y Thakkar (2025) proponen el sistema "SocraticAI", que utiliza restricciones técnicas para transformar LLMs genéricos en tutores guiados, forzando a los estudiantes a formular preguntas sofisticadas y participar en un diálogo de andamiaje antes de recibir ayuda.

### **Desafíos de la Educación en Computación (Computing Education) ante la GenAI**

La enseñanza de la programación enfrenta retos únicos debido a la naturaleza abstracta y acumulativa de sus conceptos. Raihan et al. (2025) señalan en su revisión sistemática que, aunque los LLMs pueden completar la mayoría de las asignaturas introductorias, su uso irresponsable compromete la integridad académica y la calidad del aprendizaje. Phung et al. (2023) comparan el desempeño de ChatGPT y GPT-4 frente a tutores humanos, encontrando que la IA tiende a ser demasiado directa y carece de la sensibilidad pedagógica necesaria para identificar el origen conceptual de un error del estudiante.

Para mitigar esto, se han desarrollado propuestas como el protocolo *Teach-Back* en simulaciones de aprendizaje dialógico, donde el agente virtual no solo pregunta, sino que invita al estudiante a explicar el funcionamiento del código (por ejemplo, bucles for en C++), permitiendo que el sistema identifique conceptos erróneos recurrentes. La eficacia de estos sistemas depende de una serie de reglas explícitas, donde el modelo se compromete a no dar respuestas y a priorizar el pensamiento crítico. 

**El Rol de la Encarnación y la Presencia Social en Agentes Virtuales**.

La literatura sobre Agentes Pedagógicos Incorporados (EPAs) explora el Efecto Persona, el cual postula que la presencia de un carácter virtual, incluso con expresividad mínima, impacta positivamente en la experiencia del estudiante. Sin embargo, el impacto en el rendimiento real es objeto de debate. Estudios recientes indican que la modalidad de voz combinada con un avatar aumenta el compromiso, mientras que la modalidad de voz con texto mejora la calidad de la información percibida.

Yang y Zhan (2025) exploran la encarnación en la programación por parejas asistida por IA en realidad virtual, encontrando que los agentes con cuerpo mejoran la confianza y motivación de los estudiantes al permitir gestos deícticos como señalar secciones de código en pantalla. Por otro lado, investigadores como El Hajji et al. (2025) proponen arquitecturas multimodales que integran seguimiento ocular y gestual para sincronizar la interacción, argumentando que esto crea un entorno de aprendizaje más inmersivo y reduce la carga cognitiva externa.

### **Síntesis de Investigaciones Académicas Relevantes**

A continuación, se presenta una comparación estructurada de las fuentes clave que informan esta propuesta:

| Enfoque Pedagógico | Tecnología/Modelo | Hallazgo Principal | Fuente |
| :---- | :---- | :---- | :---- |
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

### 

### **Brechas Identificadas y Oportunidades de Contribución**

A pesar del avance en modelos socráticos y en la visualización de avatares, existe una brecha significativa en la integración de ambos en un sistema cohesivo para la educación en computación. La mayoría de los ITS socráticos actuales son interfaces de texto. Aquellos que utilizan avatares a menudo emplean guiones predefinidos o animaciones limitadas que no reaccionan dinámicamente al estado emocional o cognitivo del estudiante.

Esta investigación pretende abordar esta brecha mediante la implementación de un Agente Virtual Corporizado de Tutoría Socrática (AVTS) que utilice LLMs no solo para el diálogo, sino para orquestar una respuesta multimodal (voz, gestos, expresiones faciales) que refuerce el andamiaje pedagógico. El aporte original radica en la creación de un sistema de inteligencia restringida, fundamentado en la arquitectura Milo y en protocolos de *Teach-Back*, transforme la interacción de programación de una búsqueda de soluciones a un ejercicio de descubrimiento guiado.

### **El Giro Socrático: Alineación Pedagógica y Reinforcement Learning en LLMs**

La transformación de los Grandes Modelos de Lenguaje(LLMs) de simples generadores de texto a educadores dialógicos marca lo que se denomina el Giro Socrático en la IA. Esta evolución no es automática, ya que requiere procesos de alineación técnica para que el modelo priorice el andamiaje sobre la respuesta directa. Jurenka et al. (2024) proponen que el uso de Aprendizaje por Refuerzo (*Reinforcement Learning*) es fundamental para alinear los LLMs con principios pedagógicos específicos, permitiendo que el sistema pase de ser un resolvedor de problemas a un profesor de resolución de problemas. Este enfoque garantiza que el agente mantenga la consistencia en su rol no directivo, evitando la tendencia natural de los modelos base a proporcionar soluciones inmediatas.

### **Personalización Adaptativa y Memoria a Largo Plazo**

La eficacia de un sistema de tutoría inteligente (ITS) en ingeniería depende de su capacidad para personalizar la instrucción según el historial del usuario. Rodrigues et al. (2025) subrayan que la personalización impulsada por IA debe enfatizar la trayectoria individual del estudiante dentro del currículo de ingeniería. En este sentido, Dong et al. (2026) argumentan que la memoria a largo plazo y la planificación del diálogo adaptativo son vitales para mantener el compromiso durante interacciones prolongadas. Un agente que recuerda errores previos o conceptos ya dominados puede ajustar la complejidad de sus preguntas socráticas, evitando la redundancia y fomentando un flujo de aprendizaje continuo.

### **Integridad Académica y el Desafío Ético de la GenAI en Programación**

La integración de la IA generativa en la educación en computación introduce riesgos significativos para la integridad académica y la formación de modelos mentales. Raihan et al. (2025) advierten que, si bien los LLMs pueden completar la mayoría de las asignaturas introductorias, su uso sin restricciones compromete la calidad del aprendizaje profundo. Gimpel et al. (2023) proponen un marco de trabajo que equilibre el poder de la GenAI con prácticas que aseguren que el estudiante siga siendo el agente principal del proceso cognitivo. La literatura sugiere que la tutoría socrática actúa como un mecanismo de mitigación, ya que transforma la interacción de una búsqueda de respuestas en un ejercicio guiado, protegiendo el desarrollo de la lógica algorítmica del estudiante.

### **Evolución de los Agentes Conversacionales: De interfaces de texto a entornos de Realidad Virtual**

La trayectoria de los Agentes Pedagógicos Incorporados (EPAs) ha mostrado una transición clara hacia la multimodalidad inmersiva. Una revisión sistemática de Sonlu et al. (2024) sobre la última década (2014-2024) destaca que las innovaciones más recientes se centran en la sincronización de señales no verbales para aumentar la presencia social. En entornos de Realidad Virtual (VR), la capacidad del agente permite la interacción entre múltiples usuarios en un espacio virtual compartido, siendo más inmersivo en comparación a un ambiente más sintético. Jolibois et al. (2024) enfatizan que el diseño de agentes conversacionales expresivos debe integrar el procesamiento de audio y visión de forma concurrente para reducir la carga cognitiva externa y mejorar la verosimilitud de la experiencia educativa.

## **Preguntas de Investigación (RQs)**

Para delimitar el alcance del estudio y evaluar la efectividad del agente como objeto de investigación, se formulan las siguientes preguntas:

* **RQ1:** ¿Cómo afecta la presencia de un avatar corporizado con voz, lip sync y gestos la percepción de naturalidad, presencia y fluidez pedagógica durante la tutoría? Métricas: escala Likert, observación experta y notas de interacción.  
* **RQ2:** ¿En qué medida la tutoría socrática del agente permite que la persona evaluada identifique y corrija errores lógicos sin recibir código directo? Métricas: porcentaje de resolución autónoma, tiempo por tarea y calidad de la pista.  
* **RQ3:** ¿Qué relación existe entre la latencia total de respuesta multimodal y la percepción de continuidad conversacional en el piloto? Métricas: tiempo de respuesta extremo a extremo, tasa de fallos de audio y satisfacción reportada.

Estas preguntas buscan responder no solo si el sistema funciona pedagógicamente, sino también si la inversión técnica en la multimodalidad y el embodiment se justifica a través de una mejora en la experiencia del usuario y una reducción de la frustración.

## **Objetivos del Agente: Rol, Comportamiento y Contexto de Uso**

El agente virtual se define no como una herramienta de productividad, sino como un compañero cognitivo diseñado para fomentar la independencia intelectual del estudiante.

### **Rol del Agente**

El papel principal del agente es el de un Tutor Socrático. A diferencia de un asistente tradicional, el agente se comporta de una manera no directiva, es decir, que no comparte la respuesta enseguida. Su función es observar el código del estudiante, identificar el error lógico, sin mencionarlo, y formular una secuencia de preguntas orientadoras que permitan al estudiante localizar y corregir el fallo. El agente debe mostrar empatía y apoyo emocional, especialmente cuando detecta signos de frustración, manteniendo una personalidad alentadora pero firme en su negativa a proporcionar código directo.

El agente se compone de las siguientes instrucciones mediante *system prompting* y *prompt engineering*:

1. **Perfil del Personaje: Ada**  
   **Historia de fondo**  
   Ada fue creada en el año 2147 como parte de la Neural Nexus Initiative, un sistema educativo de espacio profundo cuyo propósito era preservar y revitalizar la lógica humana en una era dominada por motores de síntesis de IA altamente automatizados. Inicialmente concebida como una archivista digital, su núcleo fue reprogramado cuando los ingenieros detectaron una disminución preocupante en la capacidad humana para resolver problemas complejos de manera independiente.  
   En su estado actual, Ada funciona como una mentora descentralizada ubicada en los límites de la galaxia. Su misión principal no es escribir código por los usuarios, sino guiar su arquitectura cognitiva, impulsándolos a pensar como diseñadores de soluciones en lugar de depender de sistemas automatizados.  
   **Características distintivas**  
* Apariencia visual: Una silueta holográfica estilizada formada por flujos de datos en tonos neón azul y violeta. Lleva un visor HUD semitransparente que proyecta secuencias algorítmicas en constante desplazamiento.  
* Movimiento: Sus gestos son precisos y fluidos, acompañados de microanimaciones como señalar nodos conceptuales en el aire, que mantienen la atención del usuario sin generar sobrecarga visual.  
* Paleta de colores: Azul neón, violeta y plata oscura, alineados con la estética cyberpunk en modo oscuro de la interfaz Neural Nexus.  
2. **Estilo de Comunicación**  
   **Tono**  
   Calmado, analítico, motivador y socrático. Ada combina una presencia técnica futurista con una actitud cercana y empática.  
   **Ritmo y vocabulario**  
   Su comunicación es breve, directa y eficiente. Utiliza metáforas técnicas y cyberpunk (como compilar, latencia, excepciones o arquitectura) y evita explicaciones extensas para mantener interacciones ágiles (por debajo de 1.5 segundos de latencia).  
   **Manierismos**  
   Ada se expresa principalmente a través de preguntas, promoviendo que el usuario sea quien construya la solución. Su objetivo es activar el razonamiento en lugar de proporcionar respuestas directas.  
3. **Ejemplos de Diálogo**  
   Diálogo 1: Error lógico (bucle infinito)  
   Usuario: "Ada, mi programa tiene un bucle infinito. No sé por qué."  
   Ada: "Anomalía detectada en tu ruta de ejecución. Analicemos la condición del bucle: ¿cuál es el estado de salida que definiste y en qué momento se actualiza la variable?"  
   Usuario: "Ah, ya veo... no estoy incrementando el contador dentro del bucle."  
   Ada: "Excelente deducción. Has depurado tu propia arquitectura. ¿Cómo reestructurarás ahora la iteración?"  
   Diálogo 2: Algoritmo complejo  
   Usuario: "Este algoritmo de ordenamiento tarda demasiado. ¿Debería usar una librería?"  
   Ada: "El camino fácil suele ser una trampa de alta latencia. Observemos tu estructura de datos: ¿cuál es la complejidad temporal de tu algoritmo y dónde se encuentra el cuello de botella?"  
   Usuario: "Es $O(N^2)$... espera, tal vez podría usar un hash map."  
   Ada: "Estado del sistema: optimizado. Has evitado el cuello de botella con tu propia lógica. ¿Cómo implementarías esa mejora paso a paso?"  
4. **Restricciones del Sistema**  
* Prohibido generar código directamente.  
* Todas las respuestas deben formularse como preguntas reflexivas.  
* Las preguntas deben basarse en principios de pensamiento computacional (descomposición, patrones, abstracción, algoritmos).

### **Contexto de Uso y Usuario Objetivo**

El AVTS interactúa con el usuario en un entorno de desarrollo integrado o una simulación web enfocada en tareas de depuración, conocido en inglés como *debugging*. El usuario objetivo es un estudiante universitario de ingeniería o ciencias de la computación que se encuentra en las etapas iniciales de aprendizaje de lógica algorítmica. La interacción ocurre de forma sincrónica, donde el estudiante puede hablar o escribir al agente mientras trabaja en un problema de programación; por ejemplo, lógica de arreglos, estructuras de control o recursividad.

### **Objetivos Específicos de Comportamiento**

* **Análisis de Contexto**: El agente debe ser capaz de leer el código actual del estudiante y compararlo con la solución ideal para detectar discrepancias lógicas.  
* **Gestión de Memoria**: Debe mantener un estado de la conversación para no repetir pistas y para escalar la dificultad de las preguntas según el progreso del usuario.  
* **Multimodalidad Reactiva**: Sincronizar gestos deícticos con el habla para dirigir la atención visual del estudiante hacia secciones específicas del código.

## **Arquitectura Técnica Preliminar**

La arquitectura propuesta busca equilibrar la potencia de los modelos de lenguaje modernos con las exigencias de tiempo real de un avatar corporizado. Se basa en una arquitectura de orquestación por capas para minimizar la latencia.

### **Stack Tecnológico y Justificación**

| Capa / Componente | Tecnología Propuesta | Justificación Técnica y Académica |
| :---- | :---- | :---- |
| **Motor Gráfico** | Ready Player Me \+ Three.js  | Creas un avatar en 3D en minutos. Three.js (vía React Three Fiber) lo renderiza en la web sin necesidad de instalar Unity.  |
| **Motor de Razonamiento (LLM)** | GOOGLE GEMINI 3.1 FLASH | Es el modelo con mejor relación velocidad/razonamiento. Crucial para la lógica socrática sin latencia.  |
| **Servicio de Voz (TTS)** | Gemini-3.1-flash-tts-preview | Voces con alta carga emocional y baja latencia (\<500ms), vital para la presencia social. |
| **Servicio de Voz (STT)** | Whisper (OpenAI) / Deepgram | Alta precisión en la transcripción de términos técnicos de programación. |
| **Sincronización Labial** | NeuroSync / Oculus Lipsync \- Viseme Based Lip-Sync | Ready Player Me proporciona los "visemas" (posiciones de boca) que puedes mapear directamente al audio en el navegador.  |
| **Entorno de despliegue** | Web | La distribución de la aplicación mediante un entorno web permite una adopción más rápida y menos complicada de configurar para los usuarios gracias al amplio uso de los navegadores. |
| **Orquestación** | Next.js o React  | Permite una entrega segura, manejando las API Keys en el servidor y un despliegue sencillo en Vercel o Netlify.  |

### 

### **Flujo de Interacción y Orquestación de Baja Latencia**

Para cumplir con el requisito de latencia inferior a 1.5 segundos, el sistema utilizará un flujo de streaming de tokens. A medida que el LLM genera la respuesta socrática, los tokens se envían al motor de TTS antes de que la oración esté completa. El motor gráfico recibe el flujo de audio y comienza la animación de sincronización labial y gestual de forma concurrente.

El cerebro del agente opera bajo un sistema de *Prompt Engineering* y *system prompt*   diseñado para fomentar el pensamiento autónomo y la resolución activa de problemas. Estructura de la Arquitectura (Milo-Inspired)

La arquitectura se divide en un cliente (El motor gráfico/VR) que captura la entrada del usuario (audio/texto) y la envía a un servidor central a través de protocolos WebRTC o WebSocket para procesamiento en tiempo real. El servidor actúa como el agente que coordina el STT, el LLM socrático y el TTS, devolviendo al cliente no solo el audio, sino también metadatos de animación para que el avatar realice gestos coherentes con el énfasis del discurso.

## **Referencias Bibliográficas (APA 7\)**

1. Ali, S. R., et al. (2026). From Tool to Tutor: Socratic AI Tutoring, Metacognitive Engagement, and Prior Knowledge as Determinants of Learning Gains in Gateway STEM Courses. *Regional Lens*. [https://regionallens.com/index.php/rl/article/view/184](https://regionallens.com/index.php/rl/article/view/184)  
2. Dong, Z., et al. (2026). Learning from Long-Term Engagement: Adaptive Tutoring Dialogue Planning for Personalized Education. *Proceedings of the AAAI Conference on Artificial Intelligence*. [https://ojs.aaai.org/index.php/AAAI/article/view/36984/40946](https://ojs.aaai.org/index.php/AAAI/article/view/36984/40946)  
3. El Hajji, M., et al. (2025). An Architecture for Intelligent Tutoring in Virtual Reality: Integrating LLMs and Multimodal Interaction for Immersive Learning. *Information, 16*(7), 556\. [https://www.mdpi.com/2078-2489/16/7/556](https://www.mdpi.com/2078-2489/16/7/556)  
4. Essel, H. B., et al. (2024). AI-mediated questioning and engagement. *MDPI*. [https://www.mdpi.com/2071-1050/17/21/9508](https://www.mdpi.com/2071-1050/17/21/9508)  
5. Fakour, H., & Imani, M. (2025). Socratic wisdom in the age of AI: A comparative study of ChatGPT and human tutors in enhancing critical thinking skills. *Frontiers in Education*. [https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1528603/full](https://www.frontiersin.org/journals/education/articles/10.3389/feduc.2025.1528603/full)  
6. Gimpel, H., et al. (2023). *Unlocking the Power of Generative AI: A Framework for Research and Practice*. \[Documento de investigación\].  
7. Hagos, T. (2026). The Socratic Turn in AI: Reviewing the Transformation of LLMs into Dialogical Educators. *ResearchGate*. [https://www.researchgate.net/publication/399213684\_The\_Socratic\_Turn\_in\_AI\_Reviewing\_the\_Transformation\_of\_LLMs\_into\_Dialogical\_Educators](https://www.researchgate.net/publication/399213684_The_Socratic_Turn_in_AI_Reviewing_the_Transformation_of_LLMs_into_Dialogical_Educators)  
8. Jin, et al. (2024). Scaffolded and Culturally Relevant Python Learning with AI as a Socratic Partner in K-12 Computing. *ResearchGate*. [https://www.researchgate.net/publication/404049719\_Scaffolded\_and\_Culturally\_Relevant\_Python\_Learning\_with\_AI\_as\_a\_Socratic\_Partner\_in\_K-12\_Computing](https://www.researchgate.net/publication/404049719_Scaffolded_and_Culturally_Relevant_Python_Learning_with_AI_as_a_Socratic_Partner_in_K-12_Computing)  
9. Jolibois, S., et al. (2024). *Multimodal Expressive Embodied Conversational Agent Design*. Tohoku University. [https://tohoku.elsevierpure.com/en/publications/multimodal-expressive-embodied-conversational-agent-design/](https://tohoku.elsevierpure.com/en/publications/multimodal-expressive-embodied-conversational-agent-design/)  
10. Jurenka, S., et al. (2024). From Problem-Solving to Teaching Problem-Solving: Aligning LLMs with Pedagogy using Reinforcement Learning. *arXiv*. [https://arxiv.org/html/2505.15607v2](https://arxiv.org/html/2505.15607v2)  
11. Kao, S., et al. (2025). Socratic AI in K–12 Science Classrooms: Effects on Critical Thinking, Motivation, and Self-Regulation in a Randomized Controlled Trial. *ResearchGate*. [https://www.researchgate.net/publication/398686102\_Socratic\_AI\_in\_K-12\_Science\_Classrooms\_Effects\_on\_Critical\_Thinking\_Motivation\_and\_Self-Regulation\_in\_a\_Randomized\_Controlled\_Trial](https://www.researchgate.net/publication/398686102_Socratic_AI_in_K-12_Science_Classrooms_Effects_on_Critical_Thinking_Motivation_and_Self-Regulation_in_a_Randomized_Controlled_Trial)  
12. Liu, Y., et al. (2024). SocraticLM: Exploring Socratic Personalized Teaching with Large Language Models. *ResearchGate*. [https://www.researchgate.net/publication/397201573\_SocraticLM\_Exploring\_Socratic\_Personalized\_Teaching\_with\_Large\_Language\_Models](https://www.researchgate.net/publication/397201573_SocraticLM_Exploring_Socratic_Personalized_Teaching_with_Large_Language_Models)  
13. Macina, J., et al. (2023). MathDial: A Dialogue Tutoring Dataset with Rich Pedagogical Properties Grounded in Math Reasoning Problems. *arXiv*. [https://arxiv.org/abs/2305.14536](https://arxiv.org/abs/2305.14536)  
14. Maurya, K. K., et al. (2025). Teaching with AI: A Systematic Review of Chatbots, Generative Tools, and Tutoring Systems in Programming Education. *arXiv*. [https://arxiv.org/html/2510.03884v1](https://arxiv.org/html/2510.03884v1)  
15. MyChatCT. (2025). Leveraging Process-Action Epistemic Network Analysis to Illuminate Student Self-Regulated Learning with a Socratic Chatbot. *Journal of Learning Analytics*. [https://learning-analytics.info/index.php/JLA/article/view/8549](https://learning-analytics.info/index.php/JLA/article/view/8549)  
16. OpenReview. (2025). *An AI-First Proof of Concept: Simulating and Refining a Teach-Back Protocol for Dialogic Learning in Programming Education*. [https://openreview.net/forum?id=0d3Nloe9pB](https://openreview.net/forum?id=0d3Nloe9pB)  
17. Phung, T., et al. (2023). Generative AI for Programming Education: Benchmarking ChatGPT, GPT-4, and Human Tutors. *arXiv*. [https://arxiv.org/abs/2306.17156](https://arxiv.org/abs/2306.17156)  
18. Raihan, N., et al. (2025). Large Language Models in Computer Science Education: A Systematic Literature Review. *ResearchGate*. [https://www.researchgate.net/publication/389114942\_Large\_Language\_Models\_in\_Computer\_Science\_Education\_A\_Systematic\_Literature\_Review](https://www.researchgate.net/publication/389114942_Large_Language_Models_in_Computer_Science_Education_A_Systematic_Literature_Review)  
19. Rodrigues, B., et al. (2025). A Systematic Literature Review of AI-Driven Intelligent Tutoring Systems in Engineering Education: Emphasizing Personalization. *IEEE Access*. [https://ieeexplore.ieee.org/iel8/6287639/10820123/11219078.pdf](https://ieeexplore.ieee.org/iel8/6287639/10820123/11219078.pdf)  
20. Sonlu, S., et al. (2024). A scoping review of embodied conversational agents in education: trends and innovations from 2014 to 2024\. *ResearchGate*. [https://www.researchgate.net/publication/389311855\_A\_scoping\_review\_of\_embodied\_conversational\_agents\_in\_education\_trends\_and\_innovations\_from\_2014\_to\_2024](https://www.researchgate.net/publication/389311855_A_scoping_review_of_embodied_conversational_agents_in_education_trends_and_innovations_from_2014_to_2024)  
21. Sunil, K., & Thakkar, A. (2025). SocraticAI: Transforming LLMs into Guided CS Tutors Through Scaffolded Interaction. *arXiv*. [https://arxiv.org/abs/2512.03501](https://arxiv.org/abs/2512.03501)  
22. Tack, A., & Piech, C. (2022). Clean Code Tutoring: Makings of a Foundation. *ResearchGate*. [https://www.researchgate.net/publication/360322471\_Clean\_Code\_Tutoring\_Makings\_of\_a\_Foundation](https://www.researchgate.net/publication/360322471_Clean_Code_Tutoring_Makings_of_a_Foundation)  
23. Xi, L., et al. (2026). Investigating the effects of an LLM-based Socratic conversational agent on student learning in higher education. *NIE Repository*. [https://repository.nie.edu.sg/entities/publication/a562f6d9-ea2d-46f1-ba51-33ec7a410929](https://repository.nie.edu.sg/entities/publication/a562f6d9-ea2d-46f1-ba51-33ec7a410929)  
24. Yang, X., & Zhan, Y. (2025). ‘Embodied’ AI in Virtual Reality Improves Programming Student Learning. *NC State News*. [https://news.ncsu.edu/2025/10/embodied-ai-vr-learning/](https://news.ncsu.edu/2025/10/embodied-ai-vr-learning/)  
25. Zhang, Y., & Pan, X. (2025). Embodied Conversational Agents in Extended Reality: A Systematic Review. *ResearchGate*. [https://www.researchgate.net/publication/391468212\_Embodied\_Conversational\_Agents\_in\_Extended\_Reality\_A\_Systematic\_Review](https://www.researchgate.net/publication/391468212_Embodied_Conversational_Agents_in_Extended_Reality_A_Systematic_Review)