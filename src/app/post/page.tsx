"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QuestionnaireFlow from "@/client/components/QuestionnaireFlow";
import { POST_FLOW } from "@/shared/config/questionnaires";

function PostContent() {
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
