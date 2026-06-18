"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QuestionnaireFlow from "@/client/components/QuestionnaireFlow";
import { POST_FLOW, CONDITION_FLOW, FINAL_FLOW } from "@/shared/config/questionnaires";
import type { Condition } from "@/shared/types/session";

function PostContent() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const condition = params.get("condition");
  const seq = params.get("seq");            // crossover order, e.g. "AB"
  const stage = params.get("stage");        // "1" (after task 1) | "2" (after task 2)

  const validId = !!id && /^P-/.test(id);
  const validCond = condition === "A" || condition === "B";
  const crossover = !!seq && /^[AB]{2}$/.test(seq);
  const valid = validId && validCond;

  useEffect(() => {
    if (!valid) router.replace("/");
  }, [valid, router]);

  if (!valid) return null;

  // ── Crossover (within-subjects, 4 exercises): condition battery twice. ───
  // Stage 1 = after the FIRST condition block (both tasks) → rate it, then start
  // the SECOND block (both tasks in the opposite condition). Stage 2 = after the
  // SECOND block → rate it + the one-time final instruments → results.
  if (crossover && (stage === "1" || stage === "2")) {
    const sequence = seq!.split("") as Condition[];
    if (stage === "1") {
      return (
        <QuestionnaireFlow
          flow={CONDITION_FLOW}
          sessionId={id!}
          condition={condition as Condition}
          nextHref={`/session?id=${id}&seq=${seq}&cond=${sequence[1]}&task=task-1b-infinite-loop`}
        />
      );
    }
    return (
      <QuestionnaireFlow
        flow={[...CONDITION_FLOW, ...FINAL_FLOW]}
        sessionId={id!}
        condition={condition as Condition}
        nextHref={`/session/complete?id=${id}&seq=${seq}&condition=${condition}`}
      />
    );
  }

  // ── Legacy between-subjects: single full battery at the end. ─────────────
  return (
    <QuestionnaireFlow
      flow={POST_FLOW}
      sessionId={id!}
      nextHref={`/session/complete?id=${id}&condition=${condition}`}
    />
  );
}

export default function PostPage() {
  return (
    <Suspense fallback={<div style={{ background: "#0a0a1a", minHeight: "100vh" }} />}>
      <PostContent />
    </Suspense>
  );
}
