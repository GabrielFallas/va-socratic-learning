import { test, expect } from "@playwright/test";

// Feasibility spike: the vendored Open Sonic engine boots inside our app.
test("Open Sonic engine boots in the /play iframe", async ({ page }) => {
  const errors: string[] = [];
  const netfail: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[console] ${m.text()}`);
  });
  page.on("requestfailed", (r) => {
    // ERR_ABORTED on audio is benign: the engine preloads several audio
    // channels and aborts the spares. Only count real load failures.
    const err = r.failure()?.errorText ?? "";
    if (r.url().includes("/game/") && !err.includes("ERR_ABORTED")) {
      netfail.push(`${r.url()} — ${err}`);
    }
  });

  await page.goto("/play");

  const frame = page.frameLocator('[data-testid="game-frame"]');
  // The engine creates a <canvas> in the iframe document once it boots.
  await expect(frame.locator("canvas")).toBeVisible({ timeout: 30000 });

  // Let it run a few frames and load assets.
  await page.waitForTimeout(4000);
  await page.screenshot({ path: "tests/e2e/shots/game-spike.png", fullPage: true });

  // Canvas should have real dimensions (engine sized the backbuffer).
  const size = await frame.locator("canvas").first().evaluate((c) => ({
    w: (c as HTMLCanvasElement).width,
    h: (c as HTMLCanvasElement).height,
  }));
  console.log("CANVAS SIZE:", size);
  console.log("GAME NET FAILURES:", netfail.length);
  netfail.slice(0, 15).forEach((n) => console.log("  NF:", n));
  console.log("PAGE/CONSOLE ERRORS:", errors.length);
  [...new Set(errors)].slice(0, 15).forEach((e) => console.log("  ERR:", e));

  expect(size.w).toBeGreaterThan(0);
  expect(size.h).toBeGreaterThan(0);
  // No failed asset loads from /game/
  expect(netfail.length).toBe(0);
});
