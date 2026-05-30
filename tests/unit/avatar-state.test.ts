import { describe, it, expect } from "vitest";
import { extractAvatarState } from "@/services/llm/ollamaClient";

describe("extractAvatarState", () => {
  it("extracts the state tag and strips it from the text", () => {
    const { cleanText, avatarState } = extractAvatarState("¿Qué observas?\n[AVATAR_STATE:curious]");
    expect(avatarState).toBe("curious");
    expect(cleanText).toBe("¿Qué observas?");
  });

  it("removes emojis from the clean text", () => {
    const { cleanText } = extractAvatarState("Bien hecho 😀🎉 [AVATAR_STATE:happy]");
    expect(cleanText).not.toMatch(/😀|🎉/u);
    expect(cleanText).toContain("Bien hecho");
  });

  it("defaults to 'speaking' when no tag is present", () => {
    const { avatarState } = extractAvatarState("Sin etiqueta");
    expect(avatarState).toBe("speaking");
  });
});
