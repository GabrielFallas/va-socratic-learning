import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AvatarSprite from "@/client/avatar/AvatarSprite";
import type { AvatarState } from "@/shared/types/session";

// ============================================================
// Unit Tests: AvatarSprite Component
// Validates the 2D avatar renders correctly per state
// ============================================================

describe("AvatarSprite", () => {
  it("should render with idle state by default", () => {
    render(<AvatarSprite state="idle" isSpeaking={false} />);
    const avatar = screen.getByTestId("avatar-sprite");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute("data-state", "idle");
  });

  it("should update data-state attribute for each state", () => {
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
      const { unmount } = render(
        <AvatarSprite state={state} isSpeaking={false} />
      );
      const avatar = screen.getByTestId("avatar-sprite");
      expect(avatar).toHaveAttribute("data-state", state);
      unmount();
    });
  });

  it("should display 'ADA' name", () => {
    render(<AvatarSprite state="idle" isSpeaking={false} />);
    expect(screen.getByText("ADA")).toBeInTheDocument();
  });

  it("should show correct status label for thinking state", () => {
    render(<AvatarSprite state="thinking" isSpeaking={false} />);
    expect(screen.getByText("Analizando...")).toBeInTheDocument();
  });

  it("should show correct status label for listening state", () => {
    render(<AvatarSprite state="listening" isSpeaking={false} />);
    expect(screen.getByText("Escuchando...")).toBeInTheDocument();
  });

  it("should have accessible role and label", () => {
    render(<AvatarSprite state="curious" isSpeaking={false} />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("aria-label");
    expect(img.getAttribute("aria-label")).toContain("Ada");
  });

  it("should apply custom className", () => {
    render(
      <AvatarSprite state="idle" isSpeaking={false} className="test-class" />
    );
    const avatar = screen.getByTestId("avatar-sprite");
    expect(avatar.className).toContain("test-class");
  });
});
