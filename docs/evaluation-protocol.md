

# Protocolo de Evaluación

---

## 1. Definición de Variables

**Variable Independiente (VI):**

- **Nivel de Presencia y Modalidad del Agente:**
  Se comparará la interacción con el Agente Virtual (avatar, voz, lip sync y gestos) frente a una interacción de control basada únicamente en Texto (Chatbot Socrático).

**Variables Dependientes (VD):**

- **Eficacia Pedagógica:** Capacidad del usuario para resolver el error lógico de forma autónoma (sin código directo).
- **Naturalidad de la Interacción:** Percepción de fluidez, presencia y continuidad conversacional.
- **Latencia Técnica:** Tiempo de respuesta extremo a extremo (end-to-end) del sistema multimodal.
- **Carga Cognitiva y Satisfacción:** Nivel de frustración y utilidad percibida de las pistas.

---

## 2. Instrumentos de Medición

- **Métricas del Sistema (Log-based):** Registro automático de latencia (ms), cantidad de turnos conversacionales y tasa de éxito en la resolución de la tarea.
- **Escala Likert (Cuestionario Post-test):** Evaluación de 5 puntos sobre naturalidad, presencia y coherencia del avatar.
- **Rúbrica de Evaluación Experta:** Instrumento cualitativo para que los docentes y senior managers valoren la calidad pedagógica de las pistas socráticas.

---

## 3. Procedimiento de la Sesión (Paso a Paso)

1. **Bienvenida y Contextualización:**
   El participante (docente o senior manager) recibe una breve explicación del alcance del piloto y acuerda participar en el experimento. Se le asigna un problema de programación con un error lógico predefinido.
2. **Fase de Interacción (Tarea de Depuración):**
   El usuario intenta resolver el problema interactuando mediante texto con el agente en Unity. El agente aplicará técnicas de andamiaje y preguntas reflexivas sin entregar el código corregido.
3. **Observación Heurística:**
   Mientras el usuario interactúa, los investigadores registran comportamientos no verbales, posibles desincronizaciones del avatar (lip sync) o fallos en el flujo de audio.
4. **Cierre de Tarea:**
   La sesión finaliza cuando el usuario identifica el error o cuando se alcanza el tiempo límite de 20 minutos.
5. **Evaluación de Salida:**
   El participante completa el cuestionario de satisfacción y la rúbrica experta, seguido de una breve entrevista sobre su percepción de la utilidad del agente frente a una IA generativa tradicional.

---

## 4. Justificación del Protocolo

| Decisión del Protocolo                  | Justificación Técnica / Pedagógica                                                                 |
|-----------------------------------------|---------------------------------------------------------------------------------------------------|
| Comparación Avatar vs. Texto (VI)       | Permite aislar si la inversión técnica en Unity (gestos, voz) realmente aporta valor a la "presencia" y fluidez pedagógica. |
| Uso de Senior Managers y Docentes       | Asegura una evaluación de "estrés técnico" y pedagógico por personas que entienden cómo debe ser un acompañamiento STEM efectivo. |
| Medición de Latencia < 1.5s             | Un retraso mayor rompería la ilusión de conversación natural, convirtiendo la interacción en un intercambio de comandos. |
| Prohibición de Código Directo           | Es el núcleo de la metodología socrática para combatir la dependencia de la IA y fomentar el pensamiento crítico. |
| Muestreo por Proximidad (Semana 11)     | Garantiza la factibilidad de ejecución del experimento dentro de los tiempos del curso académico. |

---