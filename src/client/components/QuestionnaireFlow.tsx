"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Questionnaire, { type Responses } from "@/client/components/Questionnaire";
import { type FlowStep, CONDITION_INDEPENDENT } from "@/shared/config/questionnaires";
import type { Condition } from "@/shared/types/session";

interface Props {
  flow: FlowStep[];
  sessionId: string;
  /** Where to go after the last instrument. */
  nextHref: string;
  /** Crossover: tag each condition-specific instrument with this condition so the
   *  two batteries (A and B) are stored separately. Condition-independent
   *  instruments (demographics, qualitative) are never tagged. */
  condition?: Condition;
}

/**
 * Runs a sequence of questionnaire instruments, persisting each to the session
 * before advancing. Used by /post — the single questionnaire battery at the end.
 */
export default function QuestionnaireFlow({ flow, sessionId, nextHref, condition }: Props) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [saving, setSaving] = useState(false);

  const step = flow[index];

  const handleSubmit = async (responses: Responses, scores: Record<string, number>) => {
    setSaving(true);
    const tagCondition = condition && !CONDITION_INDEPENDENT.has(step.instrument.id) ? condition : undefined;
    try {
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "log-questionnaire",
          sessionId,
          questionnaire: {
            instrument: step.instrument.id,
            phase: step.phase,
            condition: tagCondition,
            responses,
            scores,
          },
        }),
      });
    } catch {
      /* best-effort; do not block the participant on a network hiccup */
    }
    setSaving(false);

    if (index + 1 < flow.length) {
      setIndex(index + 1);
      window.scrollTo(0, 0);
    } else {
      router.push(nextHref);
    }
  };

  return (
    <>
      {saving && (
        <div className="fixed top-2 right-2 z-50 text-xs font-mono px-3 py-1 rounded" style={{ background: "#0F3B82", color: "#fff" }}>
          Guardando…
        </div>
      )}
      <Questionnaire
        key={`${step.instrument.id}:${step.phase ?? "_"}`}
        instrument={step.instrument}
        stepIndex={index}
        stepCount={flow.length}
        onSubmit={handleSubmit}
      />
    </>
  );
}
