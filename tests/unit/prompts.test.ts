import { describe, it, expect } from "vitest";
import {
  ADA_SYSTEM_PROMPT,
  buildTaskSystemPrompt,
} from "@/prompts/ada-system";

// ============================================================
// Unit Tests: Ada System Prompt
// Validates the socratic constraints and prompt structure
// ============================================================

describe("Ada System Prompt", () => {
  it("should contain the absolute socratic restrictions", () => {
    expect(ADA_SYSTEM_PROMPT).toContain("PROHIBIDO generar");
    expect(ADA_SYSTEM_PROMPT).toContain("PROHIBIDO decir al estudiante");
    expect(ADA_SYSTEM_PROMPT).toContain("PROHIBIDO dar la respuesta final");
  });

  it("should require every response to end with a question", () => {
    // Prompt uses "Todas" (capital T) in the restrictions list,
    // and "Siempre termina con una pregunta" in style section
    expect(ADA_SYSTEM_PROMPT).toMatch(
      /[Tt]odas las respuestas deben terminar con una pregunta/
    );
  });

  it("should define Ada character persona", () => {
    expect(ADA_SYSTEM_PROMPT).toContain("Ada");
    expect(ADA_SYSTEM_PROMPT).toContain("Neural Nexus");
    expect(ADA_SYSTEM_PROMPT).toContain("2147");
  });

  it("should define ZPD scaffolding levels", () => {
    expect(ADA_SYSTEM_PROMPT).toContain("Nivel 1");
    expect(ADA_SYSTEM_PROMPT).toContain("Nivel 2");
    expect(ADA_SYSTEM_PROMPT).toContain("Nivel 3");
  });

  it("should include frustration detection protocol", () => {
    expect(ADA_SYSTEM_PROMPT).toContain("Frustración");
    expect(ADA_SYSTEM_PROMPT).toContain("me rindo");
  });

  it("should define avatar state control syntax", () => {
    expect(ADA_SYSTEM_PROMPT).toContain("[AVATAR_STATE:");
    expect(ADA_SYSTEM_PROMPT).toContain("curious");
    expect(ADA_SYSTEM_PROMPT).toContain("empathetic");
    expect(ADA_SYSTEM_PROMPT).toContain("encouraging");
  });

  it("should require max 3-4 sentences per response", () => {
    expect(ADA_SYSTEM_PROMPT).toContain("3-4 oraciones");
  });
});

describe("buildTaskSystemPrompt", () => {
  const mockTask = {
    buggyCode: "while True:\n    print('hello')",
    errorDescription: "Missing break condition",
  };

  it("should include the buggy code in the prompt", () => {
    const prompt = buildTaskSystemPrompt(mockTask);
    expect(prompt).toContain(mockTask.buggyCode);
  });

  it("should include the error description for Ada's context", () => {
    const prompt = buildTaskSystemPrompt(mockTask);
    expect(prompt).toContain(mockTask.errorDescription);
  });

  it("should explicitly warn Ada not to reveal the error", () => {
    const prompt = buildTaskSystemPrompt(mockTask);
    expect(prompt).toContain("NUNCA menciones directamente el error");
  });

  it("should still contain base Ada restrictions", () => {
    const prompt = buildTaskSystemPrompt(mockTask);
    expect(prompt).toContain("PROHIBIDO generar");
  });
});
