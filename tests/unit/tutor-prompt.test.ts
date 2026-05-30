import { describe, it, expect } from "vitest";
import { buildTaskSystemPrompt, BASE_TUTOR_PROMPT } from "@/prompts/tutor-system";

const ctx = {
  buggyCode: "while True:\n    pass",
  errorDescription: "Bucle infinito",
};

describe("buildTaskSystemPrompt — condition isolates only embodiment", () => {
  it("Condition A includes the avatar-control block", () => {
    const p = buildTaskSystemPrompt({ condition: "A", ...ctx });
    expect(p).toContain("Control del Avatar");
    expect(p).toContain("[AVATAR_STATE:estado]");
  });

  it("Condition B does NOT include the avatar-control block", () => {
    const p = buildTaskSystemPrompt({ condition: "B", ...ctx });
    expect(p).not.toContain("Control del Avatar");
    expect(p).not.toContain("[AVATAR_STATE:estado]");
  });

  it("both conditions share the identical neutral base tutor text", () => {
    const a = buildTaskSystemPrompt({ condition: "A", ...ctx });
    const b = buildTaskSystemPrompt({ condition: "B", ...ctx });
    expect(a).toContain(BASE_TUTOR_PROMPT);
    expect(b).toContain(BASE_TUTOR_PROMPT);
    // No Sonic persona leakage in the tutor text
    expect(BASE_TUTOR_PROMPT.toLowerCase()).not.toContain("sonic");
    expect(BASE_TUTOR_PROMPT.toLowerCase()).not.toContain("gotta go fast");
  });

  it("injects the task code and error for the model's private reasoning", () => {
    const p = buildTaskSystemPrompt({ condition: "B", ...ctx });
    expect(p).toContain(ctx.buggyCode);
    expect(p).toContain(ctx.errorDescription);
  });
});
