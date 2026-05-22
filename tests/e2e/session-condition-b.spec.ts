import { test, expect } from "@playwright/test";

// ============================================================
// E2E Tests: Session — Condition B (Text-only)
// Tests the control condition (no avatar, no TTS/STT)
// Does NOT require GEMINI_API_KEY (tests UI only)
// ============================================================

test.describe("Session — Condition B (Text Chat)", () => {
  test("should load session page with correct layout", async ({ page }) => {
    await page.goto("/session?id=test-e2e&condition=B&task=task-1-infinite-loop");

    // Code panel should be visible
    await expect(page.getByTestId("code-panel")).toBeVisible();

    // Chat interface should be in condition B mode
    const chat = page.getByTestId("chat-interface");
    await expect(chat).toBeVisible();
    await expect(chat).toHaveAttribute("data-condition", "B");
  });

  test("should display the buggy code in code panel", async ({ page }) => {
    await page.goto("/session?id=test-e2e&condition=B&task=task-1-infinite-loop");
    const codeDisplay = page.getByTestId("code-display");
    await expect(codeDisplay).toBeVisible();
    await expect(codeDisplay).toContainText("while");
    await expect(codeDisplay).toContainText("counter");
  });

  test("should show task timer counting down", async ({ page }) => {
    await page.goto("/session?id=test-e2e&condition=B&task=task-1-infinite-loop");
    const timer = page.getByTestId("task-timer");
    await expect(timer).toBeVisible();

    // Timer should show a time format MM:SS
    const timerText = await timer.textContent();
    expect(timerText).toMatch(/\d{2}:\d{2}/);
  });

  test("should have a chat input field", async ({ page }) => {
    await page.goto("/session?id=test-e2e&condition=B&task=task-1-infinite-loop");
    const input = page.getByTestId("chat-input");
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();
  });

  test("should show welcome message from Ada", async ({ page }) => {
    await page.goto("/session?id=test-e2e&condition=B&task=task-1-infinite-loop");
    const messages = page.getByTestId("messages-container");
    await expect(messages).toBeVisible();
    // Ada's welcome message should appear
    await expect(page.getByTestId("message-assistant").first()).toBeVisible();
  });

  test("should NOT show avatar in Condition B", async ({ page }) => {
    await page.goto("/session?id=test-e2e&condition=B&task=task-1-infinite-loop");
    // Avatar sprite should not be present in Condition B
    const avatar = page.getByTestId("avatar-sprite");
    await expect(avatar).not.toBeVisible();
  });

  test("should NOT show microphone button in Condition B", async ({ page }) => {
    await page.goto("/session?id=test-e2e&condition=B&task=task-1-infinite-loop");
    const micButton = page.getByTestId("mic-button");
    await expect(micButton).not.toBeVisible();
  });

  test("should allow typing in chat input", async ({ page }) => {
    await page.goto("/session?id=test-e2e&condition=B&task=task-1-infinite-loop");
    const input = page.getByTestId("chat-input");
    await input.fill("Mi programa tiene un bucle infinito");
    await expect(input).toHaveValue("Mi programa tiene un bucle infinito");
  });

  test("send button should be disabled when input is empty", async ({ page }) => {
    await page.goto("/session?id=test-e2e&condition=B&task=task-1-infinite-loop");
    const sendBtn = page.getByTestId("send-button");
    await expect(sendBtn).toBeDisabled();
  });

  test("send button should be enabled when input has text", async ({ page }) => {
    await page.goto("/session?id=test-e2e&condition=B&task=task-1-infinite-loop");
    const input = page.getByTestId("chat-input");
    const sendBtn = page.getByTestId("send-button");

    await input.fill("Tengo un problema");
    await expect(sendBtn).toBeEnabled();
  });

  test("should show hint when hint toggle is clicked", async ({ page }) => {
    await page.goto("/session?id=test-e2e&condition=B&task=task-1-infinite-loop");
    const hintToggle = page.getByTestId("hint-toggle");
    await hintToggle.click();
    // Hint text should appear
    await expect(page.getByText("Pista de Ada:")).toBeVisible();
  });

  test("should show task 2 content when task parameter changes", async ({
    page,
  }) => {
    await page.goto(
      "/session?id=test-e2e&condition=B&task=task-2-algorithm-complexity"
    );
    // Code panel uses dangerouslySetInnerHTML with spans for syntax highlighting
    // Check for the function name which appears as plain text
    const codeDisplay = page.getByTestId("code-display");
    await expect(codeDisplay).toContainText("find_duplicates");
    // The "for" keyword may be wrapped in spans, check inner content loosely
    const codeHtml = await codeDisplay.innerHTML();
    expect(codeHtml).toContain("range");
    expect(codeHtml).toContain("duplicates");
  });

  test("resolve button should trigger task completion modal", async ({
    page,
  }) => {
    await page.goto("/session?id=test-e2e&condition=B&task=task-1-infinite-loop");
    const resolveBtn = page.getByTestId("resolve-button");
    await resolveBtn.click();
    // Summary modal should appear
    await expect(page.getByText("Tarea Completada")).toBeVisible({ timeout: 3000 });
  });

  test("skip button should trigger timeout modal", async ({ page }) => {
    await page.goto("/session?id=test-e2e&condition=B&task=task-1-infinite-loop");
    const skipBtn = page.getByTestId("skip-button");
    await skipBtn.click();
    await expect(page.getByText("Tiempo Agotado")).toBeVisible({ timeout: 3000 });
  });
});
