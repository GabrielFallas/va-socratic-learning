import { test, expect } from "@playwright/test";

// Phase 1.1 — Validate OpenSonic sprite sheet upgrade.
// Checks that the new 75-frame sprite loads, canvas renders, and no errors.

type Bag = { console: string[]; pageerr: string[]; netfail: string[] };

function attach(page: import("@playwright/test").Page): Bag {
  const bag: Bag = { console: [], pageerr: [], netfail: [] };
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning")
      bag.console.push(`[${m.type()}] ${m.text()}`);
  });
  page.on("pageerror", (e) => bag.pageerr.push(String(e)));
  page.on("requestfailed", (r) =>
    bag.netfail.push(`${r.method()} ${r.url()} — ${r.failure()?.errorText}`)
  );
  return bag;
}

test("OpenSonic sprite sheet asset loads without 404", async ({ page }) => {
  const bag = attach(page);

  const spriteResponses: { url: string; status: number }[] = [];
  page.on("response", (r) => {
    if (r.url().includes("sonic-opensonic.png")) {
      spriteResponses.push({ url: r.url(), status: r.status() });
    }
  });

  await page.goto("/");
  await page.getByTestId("start-condition-a").click();
  await page.waitForURL(/\/session\?/, { timeout: 15000 });
  await page.waitForTimeout(3000);

  // The new sprite should have been requested and loaded successfully
  expect(spriteResponses.length).toBeGreaterThan(0);
  for (const r of spriteResponses) {
    expect(r.status).toBe(200);
  }

  // No page errors from the sprite change
  const spriteErrors = bag.pageerr.filter(
    (e) => e.includes("sprite") || e.includes("anim") || e.includes("frame")
  );
  expect(spriteErrors).toHaveLength(0);
});

test("Condition A canvas renders with OpenSonic sprites", async ({ page }) => {
  const bag = attach(page);
  await page.goto("/");
  await page.getByTestId("start-condition-a").click();
  await page.waitForURL(/\/session\?/, { timeout: 15000 });
  await page.waitForTimeout(3500);

  // Canvas should be present and have non-zero dimensions
  const canvas = page.locator("canvas");
  await expect(canvas.first()).toBeVisible();
  const box = await canvas.first().boundingBox();
  expect(box).toBeTruthy();
  expect(box!.width).toBeGreaterThan(100);
  expect(box!.height).toBeGreaterThan(50);

  await page.screenshot({ path: "tests/e2e/shots/sprite-upgrade-canvas.png", fullPage: true });

  // No fatal page errors
  expect(bag.pageerr).toHaveLength(0);
});

test("avatar state changes do not crash with new sprites", async ({ page }) => {
  const bag = attach(page);
  await page.goto("/");
  await page.getByTestId("start-condition-a").click();
  await page.waitForURL(/\/session\?/, { timeout: 15000 });
  await page.waitForTimeout(3500);

  // Dismiss PRESS START overlay
  const pressStart = page.getByText("▶ PRESS START");
  if (await pressStart.isVisible().catch(() => false)) {
    await pressStart.click();
    await page.waitForTimeout(300);
  }

  // Send a chat message — this triggers avatar state transitions
  // (thinking → speaking → idle or happy)
  const chatInput = page.getByTestId("chat-input");
  if (await chatInput.isVisible().catch(() => false)) {
    await chatInput.fill("Hola, necesito ayuda con el código.");
    await page.getByTestId("send-button").click();
    // Wait for state transitions to occur
    await page.waitForTimeout(5000);
  }

  await page.screenshot({ path: "tests/e2e/shots/sprite-upgrade-states.png", fullPage: true });

  // No fatal errors from animation/state transitions
  const fatalErrors = bag.pageerr.filter(
    (e) => !e.includes("ResizeObserver") // ignore benign ResizeObserver errors
  );
  expect(fatalErrors).toHaveLength(0);
});

test("old sonic.png is no longer loaded", async ({ page }) => {
  const oldSpriteLoaded: string[] = [];
  page.on("response", (r) => {
    if (r.url().endsWith("/sprites/sonic.png")) {
      oldSpriteLoaded.push(r.url());
    }
  });

  await page.goto("/");
  await page.getByTestId("start-condition-a").click();
  await page.waitForURL(/\/session\?/, { timeout: 15000 });
  await page.waitForTimeout(3000);

  // The old sprite should NOT be requested
  expect(oldSpriteLoaded).toHaveLength(0);
});
