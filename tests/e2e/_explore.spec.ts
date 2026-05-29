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
  const assistant = page.getByTestId("message-assistant");
  await expect(async () => {
    expect(await assistant.count()).toBeGreaterThanOrEqual(2);
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
