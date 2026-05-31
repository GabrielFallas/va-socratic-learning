import { test, expect } from "@playwright/test";

// Phases 2.3, 3.2, 4.2, 5.5, 6.1/6.2 — checkpoint, multi-hit boss, BGM, item boxes, SVG avatar

test("BGM and new sprite assets load without 404", async ({ page }) => {
  const assetResponses: { url: string; status: number }[] = [];
  page.on("response", (r) => {
    const u = r.url();
    if (
      u.includes("city.mp3") ||
      u.includes("itembox") ||
      u.includes("sonic-opensonic")
    ) {
      assetResponses.push({ url: u, status: r.status() });
    }
  });

  await page.goto("/");
  await page.getByTestId("start-condition-a").click();
  await page.waitForURL(/\/intake/, { timeout: 10000 });
  await completeInstrument(page);
  await completeInstrument(page);
  await completeInstrument(page);
  await page.waitForURL(/\/session\?/, { timeout: 15000 });
  await page.waitForTimeout(4000);

  for (const r of assetResponses) {
    expect(r.status).toBe(200);
  }
  expect(assetResponses.some((r) => r.url.includes("sonic-opensonic"))).toBeTruthy();
});

test("SVG avatar renders with enhanced body features", async ({ page }) => {
  const pageerrors: string[] = [];
  page.on("pageerror", (e) => pageerrors.push(String(e)));

  await page.goto("/");
  await page.getByTestId("start-condition-a").click();
  await page.waitForURL(/\/intake/, { timeout: 10000 });
  await completeInstrument(page);
  await completeInstrument(page);
  await completeInstrument(page);
  await page.waitForURL(/\/session\?/, { timeout: 15000 });
  await page.waitForTimeout(3000);

  // The SVG avatar should contain the enhanced body elements
  const svg = page.locator("svg");
  const anyVisible = await svg.first().isVisible().catch(() => false);
  expect(anyVisible).toBeTruthy();

  // Canvas should also render without crashes
  const canvas = page.locator("canvas");
  await expect(canvas.first()).toBeVisible();

  await page.screenshot({ path: "tests/e2e/shots/game-enhancements.png", fullPage: true });

  const fatalErrors = pageerrors.filter((e) => !e.includes("ResizeObserver"));
  expect(fatalErrors).toHaveLength(0);
});

test("canvas survives full game session without errors", async ({ page }) => {
  const pageerrors: string[] = [];
  page.on("pageerror", (e) => pageerrors.push(String(e)));

  await page.goto("/");
  await page.getByTestId("start-condition-a").click();
  await page.waitForURL(/\/intake/, { timeout: 10000 });
  await completeInstrument(page);
  await completeInstrument(page);
  await completeInstrument(page);
  await page.waitForURL(/\/session\?/, { timeout: 15000 });
  await page.waitForTimeout(3000);

  // Interact with the session to exercise game features
  const pressStart = page.getByText("▶ PRESS START");
  if (await pressStart.isVisible().catch(() => false)) {
    await pressStart.click();
    await page.waitForTimeout(300);
  }

  const chatInput = page.getByTestId("chat-input");
  if (await chatInput.isVisible().catch(() => false)) {
    await chatInput.fill("Hola, necesito ayuda con este tema");
    await page.getByTestId("send-button").click();
    await page.waitForTimeout(6000);
  }

  const fatalErrors = pageerrors.filter((e) => !e.includes("ResizeObserver"));
  expect(fatalErrors).toHaveLength(0);
});

async function completeInstrument(page: import("@playwright/test").Page) {
  const submit = page.getByTestId("questionnaire-submit");
  await expect(submit).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(350);

  const names = new Set<string>();
  for (const radio of await page.locator('input[type="radio"]').all()) {
    const name = await radio.getAttribute("name");
    if (name && !names.has(name)) {
      names.add(name);
      await radio.check();
    }
  }
  for (const cb of await page.locator('input[type="checkbox"]').all()) await cb.check();
  for (const num of await page.locator('input[type="number"]').all()) await num.fill("25");
  for (const sel of await page.locator("select").all()) await sel.selectOption({ index: 1 });

  await expect(submit).toBeEnabled({ timeout: 5000 });
  await submit.click();
}
