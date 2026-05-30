"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QuestionnaireFlow from "@/client/components/QuestionnaireFlow";
import { INTAKE_FLOW } from "@/shared/config/questionnaires";

function IntakeContent() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const condition = params.get("condition");
  const valid = !!id && /^P-/.test(id) && (condition === "A" || condition === "B");

  useEffect(() => {
    if (!valid) router.replace("/");
  }, [valid, router]);

  if (!valid) return null;

  return (
    <QuestionnaireFlow
      flow={INTAKE_FLOW}
      sessionId={id!}
      nextHref={`/session?id=${id}&condition=${condition}&task=task-1-infinite-loop`}
    />
  );
}

export default function IntakePage() {
  return (
    <Suspense fallback={<div style={{ background: "#0a0a1a", minHeight: "100vh" }} />}>
      <IntakeContent />
    </Suspense>
  );
}
