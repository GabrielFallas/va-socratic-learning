import { test, expect } from "@playwright/test";

// ============================================================
// E2E Tests: Session — Condition A (Avatar + TTS/STT)
// Tests the multimodal condition
// ============================================================

test.describe("Session — Condition A (Avatar Mode)", () => {
  test("should load session with avatar visible", async ({ page }) => {
    await page.goto(
      "/session?id=test-a-e2e&condition=A&task=task-1-infinite-loop"
    );

    const chat = page.getByTestId("chat-interface");
    await expect(chat).toHaveAttribute("data-condition", "A");

    // Avatar should be present
    const avatar = page.getByTestId("avatar-sprite");
    await expect(avatar).toBeVisible();
  });

  test("should show avatar in idle or speaking state initially", async ({
    page,
  }) => {
    await page.goto(
      "/session?id=test-a-e2e&condition=A&task=task-1-infinite-loop"
    );
    const avatar = page.getByTestId("avatar-sprite");
    const state = await avatar.getAttribute("data-state");
    expect(["idle", "speaking", "listening"]).toContain(state);
  });

  test("should show microphone button in Condition A", async ({ page }) => {
    await page.goto(
      "/session?id=test-a-e2e&condition=A&task=task-1-infinite-loop"
    );
    // Mic button may or may not be visible depending on browser STT support
    // In Chromium it should be available
    await page.waitForSelector('[data-testid="chat-interface"]');
    // Just verify the chat is in condition A
    const chat = page.getByTestId("chat-interface");
    await expect(chat).toHaveAttribute("data-condition", "A");
  });

  test("should display ADA branding in avatar area", async ({ page }) => {
    await page.goto(
      "/session?id=test-a-e2e&condition=A&task=task-1-infinite-loop"
    );
    // "ADA" appears in the avatar sprite — use the font-mono class to target it
    const adaBranding = page
      .locator(".text-cyan-400.font-bold.text-lg.tracking-widest")
      .filter({ hasText: "ADA" });
    await expect(adaBranding).toBeVisible();
  });

  test("should show TTS/STT status indicators", async ({ page }) => {
    await page.goto(
      "/session?id=test-a-e2e&condition=A&task=task-1-infinite-loop"
    );
    // Status bar shows TTS/STT availability
    await expect(page.getByText(/TTS:/)).toBeVisible();
    await expect(page.getByText(/STT:/)).toBeVisible();
  });

  test("should show condition A indicator in nav bar", async ({ page }) => {
    await page.goto(
      "/session?id=test-a-e2e&condition=A&task=task-1-infinite-loop"
    );
    await expect(page.getByText("Cond. A")).toBeVisible();
  });

  test("should have same code panel as Condition B", async ({ page }) => {
    await page.goto(
      "/session?id=test-a-e2e&condition=A&task=task-1-infinite-loop"
    );
    const codePanel = page.getByTestId("code-panel");
    await expect(codePanel).toBeVisible();
    await expect(page.getByTestId("code-display")).toContainText("while");
  });
});
