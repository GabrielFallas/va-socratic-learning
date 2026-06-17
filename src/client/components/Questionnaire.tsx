"use client";

import { useMemo, useState } from "react";
import type { Field, Instrument } from "@/shared/config/questionnaires";

type Value = number | string | boolean;
export type Responses = Record<string, Value>;

interface Props {
  instrument: Instrument;
  /** progress chrome */
  stepIndex?: number;
  stepCount?: number;
  onSubmit: (responses: Responses, scores: Record<string, number>) => void;
}

function isAnswered(field: Field, v: Value | undefined): boolean {
  if (field.type === "info" || field.optional) return true;
  if (field.type === "check") return v === true;
  // Sliders must be explicitly moved — a default midpoint must NOT count as a
  // real response (it would silently pollute NASA-TLX data with un-given answers).
  if (field.type === "slider") return v !== undefined;
  return v !== undefined && v !== "";
}

export default function Questionnaire({ instrument, stepIndex, stepCount, onSubmit }: Props) {
  // No pre-filled values: every field (including sliders) starts unanswered so
  // the participant must interact with it before the form can be submitted.
  const [responses, setResponses] = useState<Responses>({});
  const lastStep = stepCount !== undefined && (stepIndex ?? 0) + 1 >= stepCount;

  const set = (id: string, v: Value) => setResponses((p) => ({ ...p, [id]: v }));

  const complete = useMemo(
    () => instrument.fields.every((f) => isAnswered(f, responses[f.id])),
    [instrument.fields, responses]
  );

  const submit = () => {
    if (!complete) return;
    const scores = instrument.score ? instrument.score(responses) : {};
    onSubmit(responses, scores);
  };

  return (
    <div className="min-h-screen py-10 px-4 flex justify-center" style={{ background: "#0a0a1a" }}>
      <div className="w-full max-w-3xl">
        {stepCount && (
          <div className="mb-4">
            <div className="flex justify-between text-xs font-mono mb-1" style={{ color: "#88aacc" }}>
              <span>Paso {(stepIndex ?? 0) + 1} de {stepCount}</span>
              <span>{Math.round((((stepIndex ?? 0)) / stepCount) * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#1e1e3a" }}>
              <div className="h-full" style={{ width: `${(((stepIndex ?? 0)) / stepCount) * 100}%`, background: "linear-gradient(90deg,#ffcc00,#ff8c00)" }} />
            </div>
          </div>
        )}

        <div className="rounded-2xl p-6" style={{ background: "#fff", color: "#222" }}>
          <h2 className="text-2xl font-bold mb-1" style={{ color: "#0F3B82" }}>{instrument.title}</h2>
          {instrument.subtitle && <p className="text-sm mb-6" style={{ color: "#666" }}>{instrument.subtitle}</p>}

          <div className="space-y-5">
            {instrument.fields.map((f) => (
              <FieldView key={f.id} field={f} value={responses[f.id]} onChange={(v) => set(f.id, v)} />
            ))}
          </div>

          <button
            onClick={submit}
            disabled={!complete}
            data-testid="questionnaire-submit"
            className="mt-7 w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "#0F3B82" }}
          >
            {complete ? (lastStep ? "Finalizar ✓" : "Continuar →") : "Complete todos los campos requeridos"}
          </button>
        </div>
      </div>
    </div>
  );
}

function FieldView({ field, value, onChange }: { field: Field; value: Value | undefined; onChange: (v: Value) => void }) {
  if (field.type === "info") {
    return <p className="text-sm leading-relaxed p-4 rounded-lg" style={{ background: "#F4F7F6", color: "#444" }}>{field.text}</p>;
  }

  if (field.type === "check") {
    return (
      <label className="flex items-start gap-3 cursor-pointer text-sm" style={{ color: "#333" }}>
        <input type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} className="mt-1 w-5 h-5" style={{ accentColor: "#0F3B82" }} />
        <span>{field.label}</span>
      </label>
    );
  }

  return (
    <div className="pb-4" style={{ borderBottom: "1px solid #eee" }}>
      {field.label && <div className="font-semibold mb-2" style={{ color: "#333" }}>{field.label}</div>}
      {field.hint && <div className="text-xs mb-2" style={{ color: "#888" }}>{field.hint}</div>}

      {field.type === "likert" && (
        <div className="flex justify-between gap-2">
          {(field.options ?? []).map((opt, i) => (
            <label key={i} className="flex-1 flex flex-col items-center text-center cursor-pointer">
              <input type="radio" name={field.id} value={i + 1} checked={value === i + 1} onChange={() => onChange(i + 1)} className="mb-1 w-5 h-5" style={{ accentColor: "#0F3B82" }} />
              <span className="text-[11px] leading-tight" style={{ color: "#666" }}>{opt}</span>
            </label>
          ))}
        </div>
      )}

      {field.type === "semantic" && (
        <div className="flex items-center gap-3">
          <span className="text-xs w-28 text-right" style={{ color: "#666" }}>{field.left}</span>
          <div className="flex gap-2 flex-1 justify-center">
            {Array.from({ length: field.points ?? 5 }, (_, i) => (
              <label key={i} className="cursor-pointer flex flex-col items-center">
                <input type="radio" name={field.id} value={i + 1} checked={value === i + 1} onChange={() => onChange(i + 1)} className="w-5 h-5" style={{ accentColor: "#0F3B82" }} />
                <span className="text-[11px]" style={{ color: "#999" }}>{i + 1}</span>
              </label>
            ))}
          </div>
          <span className="text-xs w-28" style={{ color: "#666" }}>{field.right}</span>
        </div>
      )}

      {field.type === "slider" && (
        <div>
          <input type="range" min={field.min ?? 0} max={field.max ?? 100} value={Number(value ?? Math.round(((field.min ?? 0) + (field.max ?? 100)) / 2))} onChange={(e) => onChange(Number(e.target.value))} className="w-full" style={{ accentColor: value === undefined ? "#bbb" : "#0F3B82" }} />
          <div className="flex justify-between text-xs mt-1" style={{ color: "#888" }}>
            <span>{field.leftLabel}</span>
            <span className="font-bold" style={{ color: value === undefined ? "#bbb" : "#0F3B82" }}>{value === undefined ? "— mueva el control —" : Number(value)}</span>
            <span>{field.rightLabel}</span>
          </div>
        </div>
      )}

      {field.type === "number" && (
        <input type="number" min={field.min} max={field.max} value={value === undefined ? "" : Number(value)} onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))} className="w-40 px-3 py-2 rounded-lg" style={{ border: "1px solid #ccc" }} />
      )}

      {field.type === "choice" && (
        <div className="flex flex-wrap gap-3">
          {(field.options ?? []).map((opt) => (
            <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm" style={{ color: "#333" }}>
              <input type="radio" name={field.id} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="w-4 h-4" style={{ accentColor: "#0F3B82" }} />
              {opt}
            </label>
          ))}
        </div>
      )}

      {field.type === "select" && (
        <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg" style={{ border: "1px solid #ccc", color: "#333" }}>
          <option value="" disabled>Seleccione…</option>
          {(field.options ?? []).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      )}

      {field.type === "textarea" && (
        <textarea value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} rows={3} className="w-full px-3 py-2 rounded-lg" style={{ border: "1px solid #ccc", color: "#333" }} placeholder="Escriba su respuesta…" />
      )}
    </div>
  );
}
