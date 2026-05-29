import { test, expect } from "@playwright/test";

// Exploratory E2E sweep — captures console/page errors and screenshots, and
// exercises the Phase 0 validity changes (condition prompt, editable Pyodide
// runner, counterbalanced start). Not a permanent assertion suite.

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

function dump(label: string, bag: Bag) {
  console.log(`\n===== ${label} =====`);
  console.log("pageerrors:", bag.pageerr.length);
  bag.pageerr.forEach((e) => console.log("  PE:", e));
  console.log("net failures:", bag.netfail.length);
  bag.netfail.slice(0, 20).forEach((e) => console.log("  NF:", e));
  console.log("console err/warn:", bag.console.length);
  [...new Set(bag.console)].slice(0, 30).forEach((e) => console.log("  C:", e));
}

const FIXED_TASK1 = `def print_numbers():
    counter = 1
    while counter <= 5:
        print(f"Número: {counter}")
        counter += 1

print_numbers()`;

test("landing page renders (counterbalanced start)", async ({ page }) => {
  const bag = attach(page);
  await page.goto("/");
  await expect(page.getByTestId("start-experiment")).toBeVisible();
  await page.screenshot({ path: "tests/e2e/shots/landing.png", fullPage: true });
  dump("LANDING", bag);
});

test("Condition B — full chat turn", async ({ page }) => {
  const bag = attach(page);
  await page.goto("/");
  await page.getByTestId("start-condition-b").click();
  await page.waitForURL(/\/session/);
  await expect(page.getByTestId("chat-interface")).toHaveAttribute("data-condition", "B");

  await page.getByTestId("chat-input").fill("El bucle nunca termina, no sé por qué.");
  await page.getByTestId("send-button").click();
  // Either a real reply arrives (Ollama up) or the retry banner shows (down).
  // Both are valid working paths for this smoke test.
  const assistant = page.getByTestId("message-assistant");
  await expect(async () => {
    const replied = (await assistant.count()) >= 2;
    const errored = await page.getByTestId("conn-error").isVisible().catch(() => false);
    expect(replied || errored).toBeTruthy();
  }).toPass({ timeout: 40000 });
  await page.screenshot({ path: "tests/e2e/shots/condB-reply.png", fullPage: true });
  dump("COND B", bag);
});

test("Pyodide runner — fixing Task 1 passes hidden tests", async ({ page }) => {
  const bag = attach(page);
  await page.goto("/");
  await page.getByTestId("start-condition-b").click(); // deterministic condition
  await page.waitForURL(/\/session/);

  const editor = page.getByTestId("code-editor");
  await expect(editor).toBeVisible();

  // First run the buggy code — should NOT pass (infinite loop → timeout).
  await page.getByTestId("run-button").click();
  await expect(page.getByTestId("code-verdict")).toBeVisible({ timeout: 60000 });
  await page.screenshot({ path: "tests/e2e/shots/pyodide-buggy.png", fullPage: true });
  const buggyVerdict = await page.getByTestId("code-verdict").textContent();
  console.log("BUGGY VERDICT:", buggyVerdict);

  // Now fix the loop and run again — should PASS and open the summary modal.
  await editor.fill(FIXED_TASK1);
  await page.getByTestId("run-button").click();
  await expect(page.getByTestId("code-verdict")).toContainText("✓", { timeout: 60000 });
  await page.screenshot({ path: "tests/e2e/shots/pyodide-fixed.png", fullPage: true });

  // Resolution opens the completion modal
  await expect(page.getByText(/CORRER A LA ZONA 2/)).toBeVisible({ timeout: 5000 });
  dump("PYODIDE", bag);
});

test("Phase 1 — assign, persist, list, export CSV", async ({ request }) => {
  // Server-assigned session
  const assignRes = await request.post("/api/session", { data: { action: "assign" } });
  const assign = await assignRes.json();
  expect(assign.ok).toBeTruthy();
  const sessionId = assign.sessionId as string;
  expect(sessionId).toMatch(/^P-\d{3}$/);

  // Log a task result
  await request.post("/api/session", {
    data: {
      action: "log-task",
      sessionId,
      taskResult: {
        taskId: "task-1-infinite-loop",
        resolvedAutonomously: true,
        turns: 3,
        timeSpentSeconds: 120,
        latencyReadings: [800, 1200],
        resolution: "tests-passed",
        codeRunAttempts: 2,
        testsPassed: true,
        codeEdited: true,
      },
    },
  });

  // Log a questionnaire
  await request.post("/api/session", {
    data: {
      action: "log-questionnaire",
      sessionId,
      questionnaire: {
        instrument: "sus",
        responses: { q1: 4, q2: 2 },
        scores: { total: 72.5 },
      },
    },
  });

  // Listing includes our session
  const listRes = await request.get("/api/session?list=1");
  const list = await listRes.json();
  const found = list.sessions.find((s: { sessionId: string }) => s.sessionId === sessionId);
  expect(found).toBeTruthy();
  expect(found.tasksResolved).toBe(1);

  // CSV export contains the session + questionnaire score column
  const csvRes = await request.get("/api/export?format=csv");
  const csv = await csvRes.text();
  expect(csv).toContain(sessionId);
  expect(csv).toContain("q_sus_x_total");
  console.log("CSV header:", csv.split("\n")[0]);
});

// Fills whatever required inputs an instrument shows, then submits. Generic so
// it survives instrument changes.
async function completeInstrument(page: import("@playwright/test").Page) {
  const submit = page.getByTestId("questionnaire-submit");
  await expect(submit).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(350); // let the instrument remount settle

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

test("Phase 2 — intake flow reaches the session", async ({ page }) => {
  const bag = attach(page);
  await page.goto("/");
  await page.getByTestId("start-experiment").click(); // real flow → /intake
  await page.waitForURL(/\/intake/);
  // INTAKE_FLOW = consent, demographics, panas-sf (3 steps)
  await completeInstrument(page); // consent
  await completeInstrument(page); // demographics
  await completeInstrument(page); // panas pre
  await page.waitForURL(/\/session\?/, { timeout: 15000 });
  await expect(page.getByTestId("code-editor")).toBeVisible();
  dump("INTAKE", bag);
});

test("Phase 2 — post flow persists all instruments", async ({ page, request }) => {
  // Make a session directly, then drive /post.
  const assign = await (await request.post("/api/session", { data: { action: "assign" } })).json();
  const id = assign.sessionId as string;
  await page.goto(`/post?id=${id}&condition=A`);
  // POST_FLOW = godspeed, sus, nasa-tlx, sims, panas post, qualitative (6)
  for (let i = 0; i < 6; i++) await completeInstrument(page);
  await page.waitForURL(/\/session\/complete/, { timeout: 15000 });

  // Verify the questionnaires were persisted (CSV has SUS + PANAS-post columns)
  const csv = await (await request.get("/api/export?format=csv")).text();
  expect(csv).toContain("q_sus_x_total");
  expect(csv).toContain("q_panas-sf_post_positiveAffect");
});

test("Phase 3 — Condition A transcript toggle + exit button", async ({ page }) => {
  const bag = attach(page);
  await page.goto("/");
  await page.getByTestId("start-condition-a").click();
  await page.waitForURL(/\/session/);
  await page.waitForTimeout(3500); // canvas + zone card

  // Dismiss the PRESS START overlay (unlocks audio) so the HUD is interactive
  await page.getByText("▶ PRESS START").click();
  await page.waitForTimeout(300);

  // Transcript overlay opens and lists the welcome message
  await page.getByTestId("transcript-toggle").click();
  await expect(page.getByTestId("transcript-list")).toBeVisible();
  await expect(page.getByTestId("transcript-list")).toContainText("Sonic");
  await page.screenshot({ path: "tests/e2e/shots/condA-transcript.png", fullPage: true });
  await page.getByText("✕ Cerrar").click();
  await expect(page.getByTestId("transcript-list")).toBeHidden();

  // Exit button present
  await expect(page.getByTestId("exit-session")).toBeVisible();
  dump("PHASE 3", bag);
});
