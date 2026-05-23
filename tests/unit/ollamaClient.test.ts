import { describe, it, expect } from "vitest";
import { extractAvatarState } from "@/services/llm/ollamaClient";
import type { AvatarState } from "@/shared/types/session";

// ============================================================
// Unit Tests: Ollama Client Utilities
// Tests avatar state extraction from Ada's responses
// (Same logic as before — now sourced from ollamaClient)
// ============================================================

describe("extractAvatarState", () => {
  it("should extract curious state", () => {
    const text =
      "¿Qué debería hacer esta función? [AVATAR_STATE:curious]";
    const { cleanText, avatarState } = extractAvatarState(text);
    expect(avatarState).toBe("curious");
    expect(cleanText).toBe("¿Qué debería hacer esta función?");
  });

  it("should extract empathetic state", () => {
    const text =
      "Veo que llevas tiempo en esto. [AVATAR_STATE:empathetic]";
    const { cleanText, avatarState } = extractAvatarState(text);
    expect(avatarState).toBe("empathetic");
    expect(cleanText).not.toContain("[AVATAR_STATE");
  });

  it("should extract happy state", () => {
    const text =
      "¡Excelente deducción! [AVATAR_STATE:happy]";
    const result = extractAvatarState(text);
    expect(result.avatarState).toBe("happy");
  });

  it("should default to speaking when no state tag", () => {
    const text = "¿Qué valor tiene la variable en esta línea?";
    const { avatarState } = extractAvatarState(text);
    expect(avatarState).toBe("speaking");
  });

  it("should remove the state tag from clean text", () => {
    const text = "Respuesta aquí. [AVATAR_STATE:thinking]";
    const { cleanText } = extractAvatarState(text);
    expect(cleanText).not.toContain("[AVATAR_STATE");
    expect(cleanText).not.toContain("thinking");
    expect(cleanText).toBe("Respuesta aquí.");
  });

  it("should handle state at beginning of response", () => {
    const text = "[AVATAR_STATE:idle] Sistema listo.";
    const { cleanText, avatarState } = extractAvatarState(text);
    expect(avatarState).toBe("idle");
    expect(cleanText).toBe("Sistema listo.");
  });

  it("should handle all valid avatar states", () => {
    const states: AvatarState[] = [
      "idle",
      "thinking",
      "speaking",
      "listening",
      "happy",
      "curious",
      "empathetic",
      "encouraging",
    ];

    states.forEach((state) => {
      const text = `Response text [AVATAR_STATE:${state}]`;
      const result = extractAvatarState(text);
      expect(result.avatarState).toBe(state);
    });
  });

  it("should handle multiline responses", () => {
    const text = `Primera oración socrática.
Segunda oración con más profundidad.
¿Qué piensas? [AVATAR_STATE:curious]`;
    const { cleanText, avatarState } = extractAvatarState(text);
    expect(avatarState).toBe("curious");
    expect(cleanText).not.toContain("[AVATAR_STATE");
    expect(cleanText).toContain("Primera oración socrática.");
  });
});
