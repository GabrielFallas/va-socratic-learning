// ============================================================
// Questionnaire instruments (validated Spanish versions)
//
// Item text taken verbatim from the project's validated forms in
// context/Cuestionarios-20260522. Each instrument declares typed fields plus
// an optional scoring function whose output is exported in the CSV as
// q_<instrument>_<phase>_<scoreKey> columns.
// ============================================================

export type FieldType =
  | "likert"
  | "semantic"
  | "slider"
  | "number"
  | "choice"
  | "select"
  | "textarea"
  | "info"
  | "check";

export interface Field {
  id: string;
  type: FieldType;
  label?: string;
  hint?: string;
  /** likert/choice/select options */
  options?: string[];
  /** semantic differential endpoints */
  left?: string;
  right?: string;
  points?: number;
  /** slider endpoint labels */
  leftLabel?: string;
  rightLabel?: string;
  min?: number;
  max?: number;
  /** info block text */
  text?: string;
  /** mark as not required */
  optional?: boolean;
}

export interface Instrument {
  id: string;
  title: string;
  subtitle?: string;
  fields: Field[];
  /** Derive numeric scores from raw responses for the export. */
  score?: (r: Record<string, number | string | boolean>) => Record<string, number>;
}

const LIKERT5_AGREE = [
  "Totalmente en desacuerdo",
  "En desacuerdo",
  "Neutral",
  "De acuerdo",
  "Totalmente de acuerdo",
];

const PANAS_OPTIONS = ["Nada o muy poco", "Un poco", "Moderadamente", "Bastante", "Extremadamente"];

const SIMS_OPTIONS = [
  "No corresponde en absoluto",
  "2",
  "3",
  "Corresponde moderadamente",
  "5",
  "6",
  "Corresponde exactamente",
];

const num = (r: Record<string, number | string | boolean>, id: string) => Number(r[id] ?? 0);
const mean = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 100) / 100 : 0);

// ── PANAS-SF (10 items, administered pre & post) ──────────────────────────
const PANAS_ITEMS = [
  "Activo/a", "Nervioso/a", "Atento/a", "Molesto/a", "Inspirado/a",
  "Hostil", "Alerta", "Avergonzado/a", "Decidido/a", "Irritable",
];
const PANAS_POS = [0, 2, 4, 6, 8];
const PANAS_NEG = [1, 3, 5, 7, 9];

export const PANAS_SF: Instrument = {
  id: "panas-sf",
  title: "I-PANAS-SF",
  subtitle: "Indique en qué medida se siente de esta manera EN ESTE MOMENTO.",
  fields: PANAS_ITEMS.map((label, i) => ({
    id: `q${i}`,
    type: "likert" as const,
    label,
    options: PANAS_OPTIONS,
  })),
  score: (r) => ({
    positiveAffect: PANAS_POS.reduce((s, i) => s + num(r, `q${i}`), 0),
    negativeAffect: PANAS_NEG.reduce((s, i) => s + num(r, `q${i}`), 0),
  }),
};

// ── SUS (10 items) ────────────────────────────────────────────────────────
const SUS_ITEMS = [
  "Creo que me gustaría utilizar este sistema con frecuencia.",
  "Encontré el sistema innecesariamente complejo.",
  "Pensé que el sistema era fácil de usar.",
  "Creo que necesitaría el apoyo de una persona técnica para poder utilizar este sistema.",
  "Encontré que las diversas funciones de este sistema estaban bien integradas.",
  "Pensé que había demasiada inconsistencia en este sistema.",
  "Imagino que la mayoría de las personas aprenderían a utilizar este sistema muy rápidamente.",
  "Encontré que el sistema era muy incómodo o difícil de utilizar.",
  "Me sentí muy seguro/a utilizando el sistema.",
  "Necesité aprender muchas cosas antes de poder empezar a utilizar el sistema.",
];

export const SUS: Instrument = {
  id: "sus",
  title: "System Usability Scale (SUS)",
  subtitle: "Indique su grado de acuerdo con las siguientes afirmaciones sobre el sistema.",
  fields: SUS_ITEMS.map((label, i) => ({
    id: `q${i}`,
    type: "likert" as const,
    label,
    options: LIKERT5_AGREE,
  })),
  score: (r) => {
    let sum = 0;
    for (let i = 0; i < 10; i++) {
      const v = num(r, `q${i}`);
      sum += i % 2 === 0 ? v - 1 : 5 - v; // odd items positive, even reverse
    }
    return { total: Math.round(sum * 2.5 * 10) / 10 }; // 0-100
  },
};

// ── Godspeed (10 semantic-differential items) ─────────────────────────────
const GODSPEED_ITEMS: [string, string][] = [
  ["Falso (Mecánico)", "Natural"],
  ["Maquinal (Robotizado)", "Similar al humano"],
  ["Inconsciente", "Consciente"],
  ["Artificial", "Realista"],
  ["Moviéndose rígidamente", "Moviéndose elegantemente"],
  ["Desagradable", "Agradable"],
  ["Poco amistoso", "Amistoso"],
  ["Poco amable", "Amable"],
  ["Poco inteligente", "Inteligente"],
  ["Insensato", "Sensato"],
];

export const GODSPEED: Instrument = {
  id: "godspeed",
  title: "Godspeed",
  subtitle: "Marque la casilla que mejor describa su impresión del agente.",
  fields: GODSPEED_ITEMS.map(([left, right], i) => ({
    id: `g${i}`,
    type: "semantic" as const,
    left,
    right,
    points: 5,
  })),
  score: (r) => ({
    anthropomorphism: mean([0, 1, 2, 3].map((i) => num(r, `g${i}`))),
    animacy: num(r, "g4"),
    likeability: mean([5, 6, 7].map((i) => num(r, `g${i}`))),
    intelligence: mean([8, 9].map((i) => num(r, `g${i}`))),
    overall: mean(GODSPEED_ITEMS.map((_, i) => num(r, `g${i}`))),
  }),
};

// ── NASA-TLX (6 dimensions, 0-100 sliders, unweighted/RTLX) ───────────────
const TLX_DIMS: { id: string; label: string; hint: string; left: string; right: string }[] = [
  { id: "mental", label: "Demanda Mental", hint: "¿Cuánta actividad mental y perceptiva requirió la tarea?", left: "Muy Baja", right: "Muy Alta" },
  { id: "fisica", label: "Demanda Física", hint: "¿Cuánta actividad física fue necesaria?", left: "Muy Baja", right: "Muy Alta" },
  { id: "temporal", label: "Demanda Temporal", hint: "¿Cuánta presión de tiempo sintió?", left: "Muy Baja", right: "Muy Alta" },
  { id: "rendimiento", label: "Rendimiento", hint: "¿Qué tan exitoso cree que fue en cumplir los objetivos?", left: "Perfecto", right: "Fallo" },
  { id: "esfuerzo", label: "Esfuerzo", hint: "¿Qué tan duro tuvo que trabajar para lograr su rendimiento?", left: "Muy Bajo", right: "Muy Alto" },
  { id: "frustracion", label: "Frustración", hint: "¿Qué tan inseguro, estresado o molesto se sintió?", left: "Muy Baja", right: "Muy Alta" },
];

export const NASA_TLX: Instrument = {
  id: "nasa-tlx",
  title: "NASA-TLX",
  subtitle: "Mueva cada control para indicar su experiencia durante las tareas.",
  fields: TLX_DIMS.map((d) => ({
    id: d.id,
    type: "slider" as const,
    label: d.label,
    hint: d.hint,
    leftLabel: d.left,
    rightLabel: d.right,
    min: 0,
    max: 100,
  })),
  score: (r) => ({
    rawTlx: mean(TLX_DIMS.map((d) => num(r, d.id))),
  }),
};

// ── SIMS (16 items, 7-point) ──────────────────────────────────────────────
const SIMS_ITEMS = [
  "Porque creo que esta actividad es interesante.",
  "Porque lo hago por mi propio bien.",
  "Porque se supone que debo hacerlo.",
  "Porque no tengo otra opción.",
  "Porque esta actividad es divertida.",
  "Porque creo que esta actividad es buena para mí.",
  "Porque es algo que tengo que hacer.",
  "Porque me siento obligado/a a hacerlo.",
  "Porque me gusta esta actividad.",
  "Por elección personal.",
  "Porque me lo exigen.",
  "Porque no tengo alternativa.",
  "Porque me siento bien haciendo esta actividad.",
  "Porque creo que es importante hacerla.",
  "Porque me siento presionado/a a hacerla.",
  "Porque me obligan a hacerla.",
];

export const SIMS: Instrument = {
  id: "sims",
  title: "SIMS — Motivación Situacional",
  subtitle: "¿Por qué está realizando actualmente esta actividad?",
  fields: SIMS_ITEMS.map((label, i) => ({
    id: `q${i}`,
    type: "likert" as const,
    label,
    options: SIMS_OPTIONS,
  })),
  score: (r) => ({
    intrinsic: mean([0, 4, 8, 12].map((i) => num(r, `q${i}`))),
    identified: mean([1, 5, 9, 13].map((i) => num(r, `q${i}`))),
    external: mean([2, 6, 10, 14].map((i) => num(r, `q${i}`))),
    amotivation: mean([3, 7, 11, 15].map((i) => num(r, `q${i}`))),
  }),
};

// ── Consent ───────────────────────────────────────────────────────────────
export const CONSENT: Instrument = {
  id: "consent",
  title: "Consentimiento Informado",
  subtitle: "Por favor lea y confirme antes de continuar.",
  fields: [
    {
      id: "info",
      type: "info",
      text:
        "Participa en un estudio de la Universidad de Costa Rica (PF-3311) sobre tutoría socrática con agentes virtuales. La sesión dura ~30 minutos e incluye dos tareas de programación y varios cuestionarios. Sus datos se registran bajo un identificador anónimo (sin nombre ni correo), se tratan con confidencialidad según los lineamientos del Comité Ético Científico (CEC) y se usan solo con fines de investigación. La participación es voluntaria y puede retirarse en cualquier momento.",
    },
    { id: "agree_participate", type: "check", label: "Acepto participar voluntariamente en este estudio." },
    { id: "agree_data", type: "check", label: "Entiendo cómo se usarán mis datos anónimos y lo autorizo." },
  ],
};

// ── Demographics ──────────────────────────────────────────────────────────
export const DEMOGRAPHICS: Instrument = {
  id: "demographics",
  title: "Datos Demográficos",
  subtitle: "Información de perfil (confidencial y anónima).",
  fields: [
    { id: "edad", type: "number", label: "¿Cuál es su edad (años cumplidos)?", min: 16, max: 120 },
    { id: "genero", type: "choice", label: "¿Con cuál género se identifica?", options: ["Femenino", "Masculino", "No binario", "Otro", "Prefiero no decirlo"] },
    {
      id: "educacion",
      type: "select",
      label: "¿Cuál es su nivel educativo más alto alcanzado?",
      options: [
        "Secundaria incompleta", "Secundaria completa", "Técnico / Parauniversitario",
        "Universitaria incompleta", "Universitaria completa (Bachillerato / Licenciatura)",
        "Posgrado (Maestría / Doctorado)", "Prefiero no decirlo",
      ],
    },
    { id: "experiencia_ia", type: "choice", label: "Antes de este estudio, ¿su nivel de experiencia con IA o agentes virtuales (ChatGPT, Siri, Alexa)?", options: ["Ninguna", "Baja", "Media", "Alta"] },
    { id: "experiencia_prog", type: "choice", label: "¿Cómo describiría su experiencia previa programando?", options: ["Ninguna", "Principiante", "Intermedia", "Avanzada"] },
  ],
};

// ── Qualitative (open feedback) ───────────────────────────────────────────
export const QUALITATIVE: Instrument = {
  id: "qualitative",
  title: "Apreciación General",
  subtitle: "Sus comentarios nos ayudan a mejorar.",
  fields: [
    { id: "mas_gusto", type: "textarea", label: "¿Qué fue lo que MÁS le gustó de interactuar con el agente?", optional: true },
    { id: "menos_gusto", type: "textarea", label: "¿Qué fue lo que MENOS le gustó?", optional: true },
    { id: "comentarios", type: "textarea", label: "¿Algo más que quisiera mencionar?", optional: true },
  ],
};

// ── Flow definitions (instrument + phase) ─────────────────────────────────
export interface FlowStep {
  instrument: Instrument;
  phase?: "pre" | "post";
}

export const INTAKE_FLOW: FlowStep[] = [
  { instrument: CONSENT },
  { instrument: DEMOGRAPHICS },
  { instrument: PANAS_SF, phase: "pre" },
];

export const POST_FLOW: FlowStep[] = [
  { instrument: GODSPEED },
  { instrument: SUS },
  { instrument: NASA_TLX },
  { instrument: SIMS },
  { instrument: PANAS_SF, phase: "post" },
  { instrument: QUALITATIVE },
];
