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

test("Phase B — bridge: pause freezes the engine, resume restores it", async ({ page }) => {
  await page.goto("/play");
  await expect(page.getByTestId("game-frame")).toBeVisible();
  await page.waitForTimeout(4000); // engine boot + a few level frames

  const frame = page.frameLocator('[data-testid="game-frame"]');
  const canvas = frame.locator("canvas").first();
  const snap = () => canvas.evaluate((c) => (c as HTMLCanvasElement).toDataURL().length);
  const cmd = (type: string) => page.evaluate((t) => {
    const f = document.querySelector('[data-testid="game-frame"]') as HTMLIFrameElement;
    f?.contentWindow?.postMessage({ target: "sonic-engine", type: t }, "*");
  }, type);

  // Pause → the rendered frame should stop changing.
  await cmd("pause");
  await page.waitForTimeout(300);
  const a = await snap();
  await page.waitForTimeout(700);
  const b = await snap();
  expect(b).toBe(a); // frozen while paused

  // Resume → engine runs again, canvas still present.
  await cmd("resume");
  await page.waitForTimeout(500);
  await expect(canvas).toBeVisible();
});

const FIX1 = `def print_numbers():
    counter = 1
    while counter <= 5:
        print(f"Número: {counter}")
        counter += 1

print_numbers()`;

test("Phase C — terminal overlay → solve → gate opens", async ({ page }) => {
  await page.goto("/play");
  // Wait for the engine to be ready (the running-hint shows once ready).
  await expect(page.getByTestId("game-frame")).toBeVisible();
  await page.waitForTimeout(4000);

  // Force the Debug Terminal trigger (assist/test path) by messaging the iframe.
  await page.evaluate(() => {
    const f = document.querySelector('[data-testid="game-frame"]') as HTMLIFrameElement;
    f.contentWindow?.postMessage({ target: "sonic-engine", type: "trigger-terminal" }, "*");
  });

  // Overlay opens with the editor.
  await expect(page.getByTestId("terminal-overlay")).toBeVisible({ timeout: 10000 });
  const editor = page.getByTestId("code-editor");
  await expect(editor).toBeVisible();

  // Fix the bug, run → hidden tests pass → gate opens, overlay closes.
  await editor.fill(FIX1);
  await page.getByTestId("run-button").click();
  await expect(page.getByTestId("gate-flash")).toBeVisible({ timeout: 60000 });
  await expect(page.getByTestId("terminal-overlay")).toBeHidden();
  await page.screenshot({ path: "tests/e2e/shots/phase-c-gate.png", fullPage: true });
});

test("Phase D — Condition A session: zone → terminal → solve → next zone", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("start-condition-a").click(); // pilot → /session, condition A
  await page.waitForURL(/\/session/);

  // The playable zone (GameSession) renders for Condition A.
  await expect(page.getByTestId("game-session")).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(4500); // engine boot + zone card

  // Force the Debug Terminal, solve the bug, gate opens.
  const trigger = async () => page.evaluate(() => {
    const f = document.querySelector('[data-testid="game-frame"]') as HTMLIFrameElement;
    f?.contentWindow?.postMessage({ target: "sonic-engine", type: "trigger-terminal" }, "*");
  });
  await trigger();
  await expect(page.getByTestId("terminal-overlay")).toBeVisible({ timeout: 10000 });
  await page.getByTestId("code-editor").fill(FIX1);
  await page.getByTestId("run-button").click();

  // Completion modal appears (telemetry logged), then advance to zone 2.
  await expect(page.getByText(/CORRER A LA ZONA 2/)).toBeVisible({ timeout: 60000 });
  await page.screenshot({ path: "tests/e2e/shots/phase-d-condA.png", fullPage: true });
  await page.getByText(/CORRER A LA ZONA 2/).click();

  // Zone 2 loads its own playable level.
  await page.waitForURL(/task-2/);
  await expect(page.getByTestId("game-session")).toBeVisible({ timeout: 20000 });
});

test("Phase E — assist button reaches terminal + logs gameplay telemetry", async ({ page, request }) => {
  await page.goto("/");
  await page.getByTestId("start-condition-a").click();
  await page.waitForURL(/\/session/);
  const id = new URL(page.url()).searchParams.get("id")!;

  await expect(page.getByTestId("game-session")).toBeVisible({ timeout: 20000 });
  await page.waitForTimeout(4000);

  // Assist: reach the terminal without platforming.
  await expect(page.getByTestId("assist-button")).toBeVisible();
  await page.getByTestId("assist-button").click();
  await expect(page.getByTestId("terminal-overlay")).toBeVisible({ timeout: 10000 });

  // Gameplay telemetry was persisted and shows up in the CSV export.
  const csv = await (await request.get("/api/export?format=csv")).text();
  expect(csv).toContain("q_gameplay_x_timeToTerminalSec");
  expect(csv).toContain("q_gameplay_x_assistUsed");
  const headerCols = csv.split("\n")[0].split(",");
  const row = csv.split("\n").find((l) => l.includes(id))!;
  const cells = row.split(",");
  expect(cells[headerCols.indexOf("q_gameplay_x_assistUsed")]).toBe("1"); // assist used
});
