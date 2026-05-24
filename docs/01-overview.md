Título: Implementación de un Agente Virtual de Tutoría Socrática Multimodal para el desarrollo de lógica de programación y resolución de problemas en entornos STEM.

Qué queremos investigar: La investigación se centra en cómo un agente virtual inteligente puede actuar como un facilitador del aprendizaje sin entregar soluciones directas. Se quiere evaluar el diseño de un agente que utilice técnicas de andamiaje cognitivo (ZPD — Zona de Desarrollo Próximo, Vygotsky) para guiar a estudiantes de programación. El foco está en medir si la interacción multimodal gamificada (avatar Sonic Kaplay 2D + TTS Piper + STT Whisper + sistema de anillos + zonas temáticas) mejora la comprensión de estructuras de datos y algoritmos en comparación con un chat de texto plano con el mismo tutor socrático.

Por qué lo que queremos investigar podría ser interesante/oportuno/valioso

Combatir la "Dependencia de la IA": Actualmente, muchos estudiantes usan herramientas para generar código automáticamente, lo que puede empeorar el desarrollo de la lógica propia.

Escalabilidad del tutor: Un profesor no puede atender a 40 alumnos simultáneamente con un enfoque personalizado; un agente inteligente gamificado sí puede ofrecer una tutoría uno-a-uno disponible 24/7.

Actualidad: Existe una necesidad urgente en las facultades de ingeniería de integrar la IA no como una máquina de respuestas, sino como un compañero de pensamiento que fomente el pensamiento crítico. La gamificación (sistema de anillos Sonic) añade un componente de motivación intrínseca.

De qué manera los agentes virtuales van a estar involucrados en nuestro tema de investigación?

El agente virtual **Sonic** será el núcleo del experimento. No será un simple chat de texto, sino un Agente Inteligente Multimodal con Capacidad de Razonamiento que realizará lo siguiente:

**Condición A (Experimental — Sonic Embodied):**
- Presentará un canvas de juego Kaplay 2D con el sprite de Sonic the Hedgehog ejecutándose en un mundo side-scrolling (Chemical Plant para Tarea 1, Speed Highway para Tarea 2).
- Utilizará TTS neuronal Piper (Docker local, español de alta calidad, con fallback a Web Speech API) para hablar con el participante.
- Capturará la voz del participante mediante STT Whisper local.
- Gamificará el progreso socrático mediante un sistema de anillos: se gana un anillo cuando la respuesta del usuario se aproxima a la solución; se pierde cuando el agente detecta frustración (estado `empathetic`).
- Transicionará entre tareas mediante un mini-juego Kaplay (~15 s) donde Sonic recoge los anillos ganados.
- Enviará mensajes proactivos (pistas específicas por tarea) tras 60 s de inactividad del participante.
- Mantendrá un estado de memoria de la sesión: historial completo de conversación para el ZPD de 3 niveles.

**Condición B (Control — Sonic Texto Plano):**
- Mismo tutor socrático, mismo LLM (Ollama + Gemma 3 12B), mismo protocolo ZPD de 3 niveles, mismas tareas.
- Sin canvas de juego, sin voz, sin anillos, sin música, sin elementos visuales gamificados.
- Input solo por teclado, output solo por texto.

Ejecutará una estrategia socrática: Utilizará un system prompt avanzado (sonic-system.ts) para decidir qué pregunta hacer a continuación para que el estudiante descubra el error por sí mismo. Nunca entrega código directo.

Qué esperamos encontrar / resolver

Resolver la brecha de lógica: Ayudar a que los estudiantes no se atasquen ante un problema nuevo, dándoles herramientas mentales para descomponer problemas complejos.

Hallazgos esperados: Demostrar que el soporte multimodal gamificado (avatar Sonic Kaplay 2D + TTS Piper + STT Whisper + anillos + zonas) mejora significativamente:
- **Percepción de naturalidad, presencia social y apoyo pedagógico percibido** (RQ1) comparado con el mismo tutor en modo texto plano
- **Eficacia pedagógica autónoma** (RQ2): mayor porcentaje de resolución sin código directo, más turnos conversacionales reflexivos, menor tiempo por tarea
- **Estado afectivo** (RQ3): reducción de afecto negativo y aumento de motivación intrínseca
- **Continuidad conversacional** (RQ4): latencia < 1.5s mantenida sin desincronización audiovisual

Esta investigación cierra la brecha identificada en la literatura: documentar que los agentes corporizados gamificados en tutoría socrática de programación generan ganancias pedagógicas significativas sobre interfaces de texto plano, justificando la inversión técnica en embodiment multimodal con elementos de juego.
