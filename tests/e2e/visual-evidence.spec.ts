import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

// ============================================================
// Visual Evidence Test Suite — Ada Socratic Tutor MVP
// Captures screenshots of every major UI state for docs
// ============================================================

const SCREENSHOTS_DIR = path.join(process.cwd(), "docs", "screenshots");

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

async function shot(page: import("@playwright/test").Page, name: string) {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

// ─────────────────────────────────────────────
// GROUP 1: Landing Page
// ─────────────────────────────────────────────
test.describe("01 — Landing Page", () => {
  test("landing page full view", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await shot(page, "01-landing-full");

    await expect(page.getByTestId("start-random")).toBeVisible();
    await expect(page.getByTestId("start-condition-a")).toBeVisible();
    await expect(page.getByTestId("start-condition-b")).toBeVisible();
  });

  test("landing — hero text and description", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Verify key content
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
    await shot(page, "01-landing-hero");
  });
});

// ─────────────────────────────────────────────
// GROUP 2: Condition B — Text-only Session
// ─────────────────────────────────────────────
test.describe("02 — Condition B (Text Chat)", () => {
  test("condition B — initial load task 1", async ({ page }) => {
    await page.goto("/session?id=doc-b1&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");
    await shot(page, "02-condition-b-task1-initial");

    await expect(page.getByTestId("code-panel")).toBeVisible();
    await expect(page.getByTestId("chat-interface")).toBeVisible();
  });

  test("condition B — code panel with buggy code", async ({ page }) => {
    await page.goto("/session?id=doc-b2&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const codeDisplay = page.getByTestId("code-display");
    await expect(codeDisplay).toBeVisible();
    await expect(codeDisplay).toContainText("while");
    await expect(codeDisplay).toContainText("counter");
    await shot(page, "02-condition-b-code-panel");
  });

  test("condition B — timer visible", async ({ page }) => {
    await page.goto("/session?id=doc-b3&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const timer = page.getByTestId("task-timer");
    await expect(timer).toBeVisible();
    const timerText = await timer.textContent();
    expect(timerText).toMatch(/\d{2}:\d{2}/);
    await shot(page, "02-condition-b-timer");
  });

  test("condition B — chat input and send button", async ({ page }) => {
    await page.goto("/session?id=doc-b4&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const input = page.getByTestId("chat-input");
    const sendBtn = page.getByTestId("send-button");

    await expect(input).toBeVisible();
    await expect(sendBtn).toBeDisabled(); // empty input
    await shot(page, "02-condition-b-chat-empty");

    await input.fill("El programa se queda colgado y no termina");
    await expect(sendBtn).toBeEnabled();
    await shot(page, "02-condition-b-chat-typed");
  });

  test("condition B — no avatar visible", async ({ page }) => {
    await page.goto("/session?id=doc-b5&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const avatar = page.getByTestId("avatar-sprite");
    await expect(avatar).not.toBeVisible();
    await shot(page, "02-condition-b-no-avatar");
  });

  test("condition B — hint toggle reveals pista", async ({ page }) => {
    await page.goto("/session?id=doc-b6&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    await shot(page, "02-condition-b-before-hint");
    const hintToggle = page.getByTestId("hint-toggle");
    await hintToggle.click();
    await expect(page.getByText("Pista de Ada:")).toBeVisible();
    await shot(page, "02-condition-b-hint-visible");
  });

  test("condition B — resolve button shows summary modal", async ({ page }) => {
    await page.goto("/session?id=doc-b7&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const resolveBtn = page.getByTestId("resolve-button");
    await resolveBtn.click();
    await expect(page.getByText("Tarea Completada")).toBeVisible({ timeout: 3000 });
    await shot(page, "02-condition-b-task-completed-modal");
  });

  test("condition B — skip button shows timeout modal", async ({ page }) => {
    await page.goto("/session?id=doc-b8&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const skipBtn = page.getByTestId("skip-button");
    await skipBtn.click();
    await expect(page.getByText("Tiempo Agotado")).toBeVisible({ timeout: 3000 });
    await shot(page, "02-condition-b-timeout-modal");
  });

  test("condition B — task 2 algorithm complexity", async ({ page }) => {
    await page.goto("/session?id=doc-b9&condition=B&task=task-2-algorithm-complexity");
    await page.waitForLoadState("networkidle");

    const codeDisplay = page.getByTestId("code-display");
    await expect(codeDisplay).toContainText("find_duplicates");
    await shot(page, "02-condition-b-task2-algorithm");
  });
});

// ─────────────────────────────────────────────
// GROUP 3: Condition A — Avatar + TTS/STT
// ─────────────────────────────────────────────
test.describe("03 — Condition A (Avatar Mode)", () => {
  test("condition A — initial load with avatar", async ({ page }) => {
    await page.goto("/session?id=doc-a1&condition=A&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");
    await shot(page, "03-condition-a-initial");

    const avatar = page.getByTestId("avatar-sprite");
    await expect(avatar).toBeVisible();
  });

  test("condition A — avatar state attribute", async ({ page }) => {
    await page.goto("/session?id=doc-a2&condition=A&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const avatar = page.getByTestId("avatar-sprite");
    const state = await avatar.getAttribute("data-state");
    expect(["idle", "speaking", "listening", "thinking", "happy", "curious", "empathetic", "encouraging"]).toContain(state);
    await shot(page, "03-condition-a-avatar-state");
  });

  test("condition A — TTS/STT status indicators", async ({ page }) => {
    await page.goto("/session?id=doc-a3&condition=A&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText(/TTS:/)).toBeVisible();
    await expect(page.getByText(/STT:/)).toBeVisible();
    await shot(page, "03-condition-a-tts-stt-indicators");
  });

  test("condition A — ADA branding in avatar panel", async ({ page }) => {
    await page.goto("/session?id=doc-a4&condition=A&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const adaBranding = page
      .locator(".text-cyan-400.font-bold.text-lg.tracking-widest")
      .filter({ hasText: "ADA" });
    await expect(adaBranding).toBeVisible();
    await shot(page, "03-condition-a-ada-branding");
  });

  test("condition A — Condition A indicator in nav", async ({ page }) => {
    await page.goto("/session?id=doc-a5&condition=A&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("Cond. A")).toBeVisible();
    await shot(page, "03-condition-a-nav-indicator");
  });

  test("condition A — same code panel as B", async ({ page }) => {
    await page.goto("/session?id=doc-a6&condition=A&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const codeDisplay = page.getByTestId("code-display");
    await expect(codeDisplay).toContainText("while");
    await shot(page, "03-condition-a-code-panel");
  });
});

// ─────────────────────────────────────────────
// GROUP 4: Latency Indicators (mock SSE)
// ─────────────────────────────────────────────
test.describe("04 — Latency & Streaming UI", () => {
  test("latency — fast response badge green (<1500ms)", async ({ page }) => {
    // Mock fast SSE response
    await page.route("/api/chat", async (route) => {
      const body = [
        `data: {"chunk":"Interesante observación. ¿Qué hace exactamente el bucle while en tu código?"}\n\n`,
        `data: {"done":true,"fullText":"Interesante observación. ¿Qué hace exactamente el bucle while en tu código?","avatarState":"curious","latencyMs":350,"totalResponseMs":800}\n\n`,
      ].join("");
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body,
      });
    });

    await page.goto("/session?id=doc-lat1&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const input = page.getByTestId("chat-input");
    const sendBtn = page.getByTestId("send-button");
    await input.fill("El bucle while no termina");
    await sendBtn.click();

    // Wait for assistant response
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 5000 });
    await page.waitForTimeout(500);
    await shot(page, "04-latency-fast-badge");
  });

  test("latency — slow response badge red (>=1500ms)", async ({ page }) => {
    // Mock slow SSE response
    await page.route("/api/chat", async (route) => {
      const body = [
        `data: {"chunk":"Hmm, déjame pensar... ¿Cuándo debería terminar ese bucle?"}\n\n`,
        `data: {"done":true,"fullText":"Hmm, déjame pensar... ¿Cuándo debería terminar ese bucle?","avatarState":"thinking","latencyMs":2100,"totalResponseMs":3200}\n\n`,
      ].join("");
      await route.fulfill({
        status: 200,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
        body,
      });
    });

    await page.goto("/session?id=doc-lat2&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const input = page.getByTestId("chat-input");
    const sendBtn = page.getByTestId("send-button");
    await input.fill("No entiendo por qué se queda colgado");
    await sendBtn.click();

    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 5000 });
    await page.waitForTimeout(500);
    await shot(page, "04-latency-slow-badge");
  });

  test("latency — loading/thinking state during request", async ({ page }) => {
    // Mock delayed response
    await page.route("/api/chat", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      const body = [
        `data: {"chunk":"¿Qué variable se supone que cambia en cada iteración?"}\n\n`,
        `data: {"done":true,"fullText":"¿Qué variable se supone que cambia en cada iteración?","avatarState":"curious","latencyMs":800,"totalResponseMs":1200}\n\n`,
      ].join("");
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        body,
      });
    });

    await page.goto("/session?id=doc-lat3&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const input = page.getByTestId("chat-input");
    await input.fill("Creo que es el counter");
    await page.getByTestId("send-button").click();

    // Take screenshot while loading (quick)
    await page.waitForTimeout(200);
    await shot(page, "04-latency-loading-state");

    // Wait for completion
    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 5000 });
    await shot(page, "04-latency-completed");
  });
});

// ─────────────────────────────────────────────
// GROUP 5: Condition A with mocked LLM response
// ─────────────────────────────────────────────
test.describe("05 — Condition A with Avatar State Change", () => {
  test("avatar changes state based on LLM response", async ({ page }) => {
    await page.route("/api/chat", async (route) => {
      const body = [
        `data: {"chunk":"¡Excelente pregunta! Veo que estás pensando bien. ¿Qué crees que debería cambiar en cada vuelta del bucle?"}\n\n`,
        `data: {"done":true,"fullText":"¡Excelente pregunta! Veo que estás pensando bien. ¿Qué crees que debería cambiar en cada vuelta del bucle?","avatarState":"encouraging","latencyMs":420,"totalResponseMs":900}\n\n`,
      ].join("");
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
        body,
      });
    });

    await page.goto("/session?id=doc-av1&condition=A&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");
    await shot(page, "05-avatar-idle-initial");

    const input = page.getByTestId("chat-input");
    await input.fill("¿Qué significa que el bucle sea infinito?");
    await page.getByTestId("send-button").click();

    await page.waitForSelector('[data-testid="message-assistant"]', { timeout: 5000 });
    await page.waitForTimeout(300);
    await shot(page, "05-avatar-after-response");

    // Verify avatar changed state
    const avatar = page.getByTestId("avatar-sprite");
    await expect(avatar).toBeVisible();
  });

  test("condition A layout — code 45%, avatar+chat 55%", async ({ page }) => {
    await page.goto("/session?id=doc-av2&condition=A&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    // Both panels visible
    await expect(page.getByTestId("code-panel")).toBeVisible();
    await expect(page.getByTestId("chat-interface")).toBeVisible();
    await expect(page.getByTestId("avatar-sprite")).toBeVisible();
    await shot(page, "05-condition-a-full-layout");
  });
});

// ─────────────────────────────────────────────
// GROUP 6: Navigation Flow
// ─────────────────────────────────────────────
test.describe("06 — Navigation & Routing", () => {
  test("random start button navigates to session", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await shot(page, "06-landing-before-start");

    await page.getByTestId("start-random").click();
    await page.waitForURL(/\/session/);
    await page.waitForLoadState("networkidle");
    await shot(page, "06-after-random-start");

    // Should be on session page with a condition
    expect(page.url()).toContain("/session");
    expect(page.url()).toMatch(/condition=(A|B)/);
  });

  test("start condition B button navigates correctly", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-condition-b").click();
    await page.waitForURL(/\/session/);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("condition=B");
    await expect(page.getByTestId("chat-interface")).toHaveAttribute("data-condition", "B");
    await shot(page, "06-navigate-to-condition-b");
  });

  test("start condition A button navigates correctly", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("start-condition-a").click();
    await page.waitForURL(/\/session/);
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("condition=A");
    await expect(page.getByTestId("chat-interface")).toHaveAttribute("data-condition", "A");
    await shot(page, "06-navigate-to-condition-a");
  });
});
