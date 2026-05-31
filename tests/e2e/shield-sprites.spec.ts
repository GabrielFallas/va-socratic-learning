import { test, expect } from "@playwright/test";

// Phase 1.2 — Validate shield sprite assets load and don't crash the canvas.

test("shield sprite assets load without 404", async ({ page }) => {
  const shieldResponses: { url: string; status: number }[] = [];
  page.on("response", (r) => {
    if (r.url().includes("shield-")) {
      shieldResponses.push({ url: r.url(), status: r.status() });
    }
  });

  await page.goto("/");
  await page.getByTestId("start-condition-a").click();
  await page.waitForURL(/\/intake/, { timeout: 10000 });
  await completeInstrument(page);
  await completeInstrument(page);
  await completeInstrument(page);
  await page.waitForURL(/\/session\?/, { timeout: 15000 });
  await page.waitForTimeout(3000);

  // All 4 shield sprites should load successfully
  expect(shieldResponses.length).toBe(4);
  for (const r of shieldResponses) {
    expect(r.status).toBe(200);
  }

  // Verify each shield type was loaded
  const urls = shieldResponses.map((r) => r.url);
  expect(urls.some((u) => u.includes("shield-regular"))).toBeTruthy();
  expect(urls.some((u) => u.includes("shield-fire"))).toBeTruthy();
  expect(urls.some((u) => u.includes("shield-thunder"))).toBeTruthy();
  expect(urls.some((u) => u.includes("shield-water"))).toBeTruthy();
});

test("canvas renders without errors after shield loading", async ({ page }) => {
  const pageerrors: string[] = [];
  page.on("pageerror", (e) => pageerrors.push(String(e)));

  await page.goto("/");
  await page.getByTestId("start-condition-a").click();
  await page.waitForURL(/\/intake/, { timeout: 10000 });
  await completeInstrument(page);
  await completeInstrument(page);
  await completeInstrument(page);
  await page.waitForURL(/\/session\?/, { timeout: 15000 });
  await page.waitForTimeout(3500);

  const canvas = page.locator("canvas");
  await expect(canvas.first()).toBeVisible();

  // Trigger state transitions via chat to exercise shield creation/destruction
  const pressStart = page.getByText("▶ PRESS START");
  if (await pressStart.isVisible().catch(() => false)) {
    await pressStart.click();
    await page.waitForTimeout(300);
  }

  const chatInput = page.getByTestId("chat-input");
  if (await chatInput.isVisible().catch(() => false)) {
    await chatInput.fill("¿Puedes explicarme el error?");
    await page.getByTestId("send-button").click();
    await page.waitForTimeout(5000);
  }

  await page.screenshot({ path: "tests/e2e/shots/shield-sprites.png", fullPage: true });

  const fatalErrors = pageerrors.filter(
    (e) => !e.includes("ResizeObserver")
  );
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
