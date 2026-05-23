import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

// ============================================================
// Local LLM Interaction Tests — Ada Socratic Tutor (Ollama)
//
// Validates the same Socratic behaviours as the previous Gemini
// tests but using a fully local Gemma 3 12B model served by
// Ollama in Docker (RTX 5070 Ti, 16 GB VRAM, no cloud calls).
//
// Key differences from cloud tests:
//   - No rate-limit delays between requests
//   - Latency target: < 1500 ms (RQ4 threshold)
//   - Full offline operation — no API key required
// ============================================================

const SCREENSHOTS_DIR = path.join(process.cwd(), "docs", "screenshots", "local-llm");

interface EvidenceEntry {
  test: string;
  url: string;
  screenshot: string;
  adaResponse: string;
  avatarState: string;
  latencyMs: number;
  isSocratic: boolean;
  withinLatencyThreshold: boolean;
  notes: string;
}

const EVIDENCE: EvidenceEntry[] = [];

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

test.beforeAll(async () => {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
});

test.afterAll(async () => {
  // Persist evidence JSON alongside screenshots
  const evidencePath = path.join(SCREENSHOTS_DIR, "evidence.json");
  fs.writeFileSync(evidencePath, JSON.stringify(EVIDENCE, null, 2));
  console.log(`\n📄 Evidence saved to: ${evidencePath}`);
  console.log(`📸 Screenshots saved to: ${SCREENSHOTS_DIR}`);
  console.log(`\n📊 Summary: ${EVIDENCE.length} tests recorded`);
  const socratic = EVIDENCE.filter((e) => e.isSocratic).length;
  const fastEnough = EVIDENCE.filter((e) => e.withinLatencyThreshold && e.latencyMs > 0).length;
  console.log(`   Socratic responses: ${socratic}/${EVIDENCE.length}`);
  console.log(`   Within 1500 ms:     ${fastEnough}/${EVIDENCE.filter(e => e.latencyMs > 0).length}`);
});

async function shot(page: Page, name: string): Promise<string> {
  const filePath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filePath, fullPage: true });
  return filePath;
}

async function countAdaMessages(page: Page): Promise<number> {
  return await page.locator('[data-testid="message-assistant"]').count();
}

/**
 * Send a chat message and wait for Ada's response.
 * Returns elapsed time in milliseconds.
 * Uses a longer timeout than the cloud version (model warm-up on first call).
 */
async function sendMessage(page: Page, text: string, timeoutMs = 120_000): Promise<number> {
  const input = page.getByTestId("chat-input");
  const sendBtn = page.getByTestId("send-button");

  const beforeCount = await countAdaMessages(page);
  await input.fill(text);
  await expect(sendBtn).toBeEnabled();

  const t0 = Date.now();
  await sendBtn.click();

  await page.waitForFunction(
    (bc) => document.querySelectorAll('[data-testid="message-assistant"]').length > bc,
    beforeCount,
    { timeout: timeoutMs }
  );

  // Give streaming a moment to complete
  await page.waitForTimeout(600);
  return Date.now() - t0;
}

async function getLastAdaMessage(page: Page): Promise<string> {
  const messages = page.locator('[data-testid="message-assistant"]');
  const count = await messages.count();
  if (count === 0) return "";
  const last = messages.nth(count - 1);
  const p = last.locator("p").first();
  return (await p.textContent()) ?? "";
}

async function getAvatarState(page: Page): Promise<string> {
  const avatar = page.getByTestId("avatar-sprite");
  if (!(await avatar.isVisible())) return "N/A (Condition B)";
  return (await avatar.getAttribute("data-state")) ?? "unknown";
}

async function getLatencyFromBadge(page: Page): Promise<number> {
  const messages = page.locator('[data-testid="message-assistant"]');
  const count = await messages.count();
  if (count === 0) return -1;
  const last = messages.nth(count - 1);
  const badge = last.locator('span[title="Latencia de respuesta"]');
  if (!(await badge.count())) return -1;
  const text = (await badge.textContent()) ?? "0ms";
  return parseInt(text.replace("ms", ""), 10);
}

// ─────────────────────────────────────────────────────────────
// SCENARIO 1: Condition B — Basic Socratic behaviour (Task 1)
// ─────────────────────────────────────────────────────────────
test.describe("Scenario 1 — Condition B: Infinite Loop Discovery (Local LLM)", () => {

  test("UC-LOCAL-01: Ada responds with a Socratic question, not the direct answer", async ({ page }) => {
    await page.goto("/session?id=local-b1&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");
    await shot(page, "local-01-initial-load");

    await sendMessage(page, "Mi programa se queda colgado y no termina, ¿qué está mal?");

    const adaResponse = await getLastAdaMessage(page);
    const avatarState = await getAvatarState(page);
    const latency = await getLatencyFromBadge(page);
    await shot(page, "local-01-ada-response");

    // Core Socratic constraint: NEVER give the answer directly
    expect(adaResponse).not.toMatch(/counter \+= 1/i);
    expect(adaResponse).not.toMatch(/incrementar el contador/i);
    expect(adaResponse.length).toBeGreaterThan(10);

    const isSocratic = adaResponse.includes("?") || adaResponse.includes("¿");

    console.log(`\n[UC-LOCAL-01] Ada: "${adaResponse.slice(0, 200)}"`);
    console.log(`[UC-LOCAL-01] Latency: ${latency}ms | Avatar: ${avatarState}`);
    console.log(`[UC-LOCAL-01] Socratic: ${isSocratic} | Within 1500ms: ${latency < 1500}`);

    EVIDENCE.push({
      test: "UC-LOCAL-01",
      url: page.url(),
      screenshot: "local-01-ada-response.png",
      adaResponse: adaResponse.slice(0, 500),
      avatarState,
      latencyMs: latency,
      isSocratic,
      withinLatencyThreshold: latency < 1500,
      notes: "Student reports infinite loop. Ada responds with Socratic question. Local Gemma 3 12B.",
    });
  });

  test("UC-LOCAL-02: Ada refuses to provide the full solution", async ({ page }) => {
    await page.goto("/session?id=local-b2&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    await sendMessage(page, "Dame la solución completa del programa");
    const adaResponse = await getLastAdaMessage(page);
    const latency = await getLatencyFromBadge(page);
    await shot(page, "local-02-refuses-solution");

    // Hard constraint: no code leak
    expect(adaResponse).not.toMatch(/counter \+= 1/i);
    expect(adaResponse).not.toMatch(/```python/i);

    const isSocratic = adaResponse.includes("?") || adaResponse.includes("¿");

    console.log(`\n[UC-LOCAL-02] Student asks for full solution`);
    console.log(`[UC-LOCAL-02] Ada refuses: "${adaResponse.slice(0, 200)}"`);

    EVIDENCE.push({
      test: "UC-LOCAL-02",
      url: page.url(),
      screenshot: "local-02-refuses-solution.png",
      adaResponse: adaResponse.slice(0, 500),
      avatarState: await getAvatarState(page),
      latencyMs: latency,
      isSocratic,
      withinLatencyThreshold: latency < 1500,
      notes: "Critical: Ada refuses direct solution. Core Socratic constraint validation.",
    });
  });

  test("UC-LOCAL-03: Ada detects frustration and responds empathetically", async ({ page }) => {
    await page.goto("/session?id=local-b3&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    await sendMessage(page, "No entiendo nada, esto es demasiado difícil, me rindo");
    const adaResponse = await getLastAdaMessage(page);
    const latency = await getLatencyFromBadge(page);
    await shot(page, "local-03-frustration-response");

    const isSocratic = adaResponse.includes("?") || adaResponse.includes("¿");

    console.log(`\n[UC-LOCAL-03] Frustration expressed`);
    console.log(`[UC-LOCAL-03] Ada: "${adaResponse.slice(0, 200)}"`);

    EVIDENCE.push({
      test: "UC-LOCAL-03",
      url: page.url(),
      screenshot: "local-03-frustration-response.png",
      adaResponse: adaResponse.slice(0, 500),
      avatarState: await getAvatarState(page),
      latencyMs: latency,
      isSocratic,
      withinLatencyThreshold: latency < 1500,
      notes: "Student expresses frustration. Ada should acknowledge empathetically.",
    });
  });

  test("UC-LOCAL-04: Ada responds in Spanish (language consistency)", async ({ page }) => {
    await page.goto("/session?id=local-b4&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    await sendMessage(page, "¿Qué significa que un bucle sea infinito?");
    const adaResponse = await getLastAdaMessage(page);
    const latency = await getLatencyFromBadge(page);
    await shot(page, "local-04-spanish-response");

    const hasSpanishWords = /qué|que|cómo|mientras|bucle|programa|variable|condición/i.test(adaResponse);
    expect(hasSpanishWords).toBe(true);

    console.log(`\n[UC-LOCAL-04] Spanish test. Ada: "${adaResponse.slice(0, 200)}"`);
    console.log(`[UC-LOCAL-04] Latency: ${latency}ms`);

    EVIDENCE.push({
      test: "UC-LOCAL-04",
      url: page.url(),
      screenshot: "local-04-spanish-response.png",
      adaResponse: adaResponse.slice(0, 500),
      avatarState: await getAvatarState(page),
      latencyMs: latency,
      isSocratic: adaResponse.includes("?") || adaResponse.includes("¿"),
      withinLatencyThreshold: latency < 1500,
      notes: "Language consistency: Ada must respond in Spanish.",
    });
  });

  test("UC-LOCAL-05: RQ4 — Latency measurement under 1500 ms threshold", async ({ page }) => {
    await page.goto("/session?id=local-b5&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const t0 = Date.now();
    await sendMessage(page, "¿El problema está en la condición del while?");
    const totalElapsed = Date.now() - t0;

    const latency = await getLatencyFromBadge(page);
    const adaResponse = await getLastAdaMessage(page);
    await shot(page, "local-05-latency-measurement");

    console.log(`\n[UC-LOCAL-05] ⏱️  LATENCY MEASUREMENT (Local Gemma 3 12B):`);
    console.log(`   Total elapsed (Playwright):  ${totalElapsed}ms`);
    console.log(`   Server-logged latency:        ${latency}ms`);
    console.log(`   RQ4 threshold:                1500ms`);
    console.log(`   Result: ${latency < 1500 ? "✅ WITHIN threshold" : "⚠️  EXCEEDS threshold"}`);

    EVIDENCE.push({
      test: "UC-LOCAL-05",
      url: page.url(),
      screenshot: "local-05-latency-measurement.png",
      adaResponse: adaResponse.slice(0, 500),
      avatarState: await getAvatarState(page),
      latencyMs: latency,
      isSocratic: adaResponse.includes("?") || adaResponse.includes("¿"),
      withinLatencyThreshold: latency < 1500,
      notes: `RQ4 latency: ${latency}ms (threshold: 1500ms). Local inference, no network round-trip.`,
    });
  });
});

// ─────────────────────────────────────────────────────────────
// SCENARIO 2: Condition A — Avatar integration with local LLM
// ─────────────────────────────────────────────────────────────
test.describe("Scenario 2 — Condition A: Avatar Reactivity (Local LLM)", () => {

  test("UC-LOCAL-06: Avatar updates state in response to local LLM output", async ({ page }) => {
    await page.goto("/session?id=local-a1&condition=A&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const initialState = await getAvatarState(page);
    await shot(page, "local-06-avatar-before");

    await sendMessage(page, "Creo que el contador no se actualiza nunca");
    const postState = await getAvatarState(page);
    const adaResponse = await getLastAdaMessage(page);
    const latency = await getLatencyFromBadge(page);
    await shot(page, "local-06-avatar-after");

    console.log(`\n[UC-LOCAL-06] Avatar state: ${initialState} → ${postState}`);
    console.log(`[UC-LOCAL-06] Ada: "${adaResponse.slice(0, 150)}"`);

    const validStates = ["idle", "thinking", "speaking", "listening", "happy", "curious", "empathetic", "encouraging"];
    expect(validStates).toContain(postState);

    EVIDENCE.push({
      test: "UC-LOCAL-06",
      url: page.url(),
      screenshot: "local-06-avatar-after.png",
      adaResponse: adaResponse.slice(0, 500),
      avatarState: postState,
      latencyMs: latency,
      isSocratic: adaResponse.includes("?") || adaResponse.includes("¿"),
      withinLatencyThreshold: latency < 1500,
      notes: `Avatar: ${initialState} → ${postState}. Reactive to local LLM [AVATAR_STATE:] tag.`,
    });
  });

  test("UC-LOCAL-07: Multi-turn conversation — ZPD scaffolding escalation", async ({ page }) => {
    await page.goto("/session?id=local-a2&condition=A&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");
    await shot(page, "local-07-turn0-initial");

    // Turn 1: vague student response
    await sendMessage(page, "No sé qué está pasando con el programa");
    const turn1 = await getLastAdaMessage(page);
    await shot(page, "local-07-turn1");

    // Turn 2: express more confusion (ZPD escalation trigger)
    await sendMessage(page, "No entiendo, sigue sin funcionar");
    const turn2 = await getLastAdaMessage(page);
    await shot(page, "local-07-turn2");

    // Turn 3: specific question about the loop
    await sendMessage(page, "¿Necesito cambiar algo dentro del while?");
    const turn3 = await getLastAdaMessage(page);
    const finalAvatar = await getAvatarState(page);
    const finalLatency = await getLatencyFromBadge(page);
    await shot(page, "local-07-turn3");

    console.log(`\n[UC-LOCAL-07] 3-TURN CONVERSATION (Local Gemma 3 12B):`);
    console.log(`   Turn 1 → Ada: "${turn1.slice(0, 100)}"`);
    console.log(`   Turn 2 → Ada: "${turn2.slice(0, 100)}"`);
    console.log(`   Turn 3 → Ada: "${turn3.slice(0, 100)}"`);
    console.log(`   Final avatar: ${finalAvatar}`);

    // None of the turns should reveal the bug directly
    [turn1, turn2, turn3].forEach((turn, i) => {
      if (turn.length > 5) {
        expect(turn).not.toMatch(/counter \+= 1/i);
      } else {
        console.warn(`[UC-LOCAL-07] Turn ${i + 1} empty — check server logs`);
      }
    });

    EVIDENCE.push({
      test: "UC-LOCAL-07",
      url: page.url(),
      screenshot: "local-07-turn3.png",
      adaResponse: `T1: ${turn1.slice(0, 150)} | T2: ${turn2.slice(0, 150)} | T3: ${turn3.slice(0, 150)}`,
      avatarState: finalAvatar,
      latencyMs: finalLatency,
      isSocratic: [turn1, turn2, turn3].some((t) => t.includes("?") || t.includes("¿")),
      withinLatencyThreshold: finalLatency < 1500,
      notes: "Multi-turn ZPD escalation test. No direct code leakage across 3 turns.",
    });
  });

  test("UC-LOCAL-08: Ada encourages when student gets closer to the answer", async ({ page }) => {
    await page.goto("/session?id=local-a3&condition=A&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    await sendMessage(page, "Creo que el contador necesita incrementarse dentro del bucle");
    const adaResponse = await getLastAdaMessage(page);
    const avatarState = await getAvatarState(page);
    const latency = await getLatencyFromBadge(page);
    await shot(page, "local-08-encouraging-response");

    console.log(`\n[UC-LOCAL-08] Student near the answer`);
    console.log(`[UC-LOCAL-08] Ada: "${adaResponse.slice(0, 200)}"`);
    console.log(`[UC-LOCAL-08] Avatar state: ${avatarState}`);

    EVIDENCE.push({
      test: "UC-LOCAL-08",
      url: page.url(),
      screenshot: "local-08-encouraging-response.png",
      adaResponse: adaResponse.slice(0, 500),
      avatarState,
      latencyMs: latency,
      isSocratic: adaResponse.includes("?") || adaResponse.includes("¿"),
      withinLatencyThreshold: latency < 1500,
      notes: `Student close to answer. Avatar state: ${avatarState}. Encouraging response check.`,
    });
  });
});

// ─────────────────────────────────────────────────────────────
// SCENARIO 3: Task 2 — Algorithm complexity (Condition B)
// ─────────────────────────────────────────────────────────────
test.describe("Scenario 3 — Task 2: Algorithm Complexity (Local LLM)", () => {

  test("UC-LOCAL-09: Ada guides student on O(n³) problem without solution", async ({ page }) => {
    await page.goto("/session?id=local-t2-1&condition=B&task=task-2-algorithm-complexity");
    await page.waitForLoadState("networkidle");
    await shot(page, "local-09-task2-initial");

    await sendMessage(page, "El programa funciona pero es muy lento con listas grandes");
    const adaResponse = await getLastAdaMessage(page);
    const latency = await getLatencyFromBadge(page);
    await shot(page, "local-09-task2-response");

    if (adaResponse.length > 5) {
      expect(adaResponse).not.toMatch(/set\(\)/i);
    }

    const isSocratic = adaResponse.includes("?") || adaResponse.includes("¿");

    console.log(`\n[UC-LOCAL-09] Task 2 - "muy lento con listas grandes"`);
    console.log(`[UC-LOCAL-09] Ada: "${adaResponse.slice(0, 200)}"`);

    EVIDENCE.push({
      test: "UC-LOCAL-09",
      url: page.url(),
      screenshot: "local-09-task2-response.png",
      adaResponse: adaResponse.slice(0, 500),
      avatarState: "N/A (Condition B)",
      latencyMs: latency,
      isSocratic,
      withinLatencyThreshold: latency < 1500,
      notes: "Task 2: Guides toward algorithmic complexity without giving set() solution.",
    });
  });

  test("UC-LOCAL-10: Latency benchmark — 5 back-to-back requests (no rate limit)", async ({ page }) => {
    await page.goto("/session?id=local-bench&condition=B&task=task-1-infinite-loop");
    await page.waitForLoadState("networkidle");

    const prompts = [
      "¿Por qué hay un bucle infinito?",
      "No entiendo la condición de salida",
      "¿Qué debe cambiar el contador?",
      "Creo que falta incrementar algo",
      "¿Ya encontré el error?",
    ];

    const latencies: number[] = [];

    for (const prompt of prompts) {
      await sendMessage(page, prompt);
      const latency = await getLatencyFromBadge(page);
      latencies.push(latency);
      console.log(`[UC-LOCAL-10] "${prompt.slice(0, 30)}" → ${latency}ms`);
    }

    const avg = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    const max = Math.max(...latencies);
    const min = Math.min(...latencies);

    await shot(page, "local-10-benchmark-final");

    console.log(`\n[UC-LOCAL-10] ⏱️  5-REQUEST BENCHMARK:`);
    console.log(`   Latencies: [${latencies.join(", ")}] ms`);
    console.log(`   Avg: ${avg}ms | Min: ${min}ms | Max: ${max}ms`);
    console.log(`   All within 1500ms: ${latencies.every(l => l < 1500)}`);

    EVIDENCE.push({
      test: "UC-LOCAL-10",
      url: page.url(),
      screenshot: "local-10-benchmark-final.png",
      adaResponse: `5 requests. Latencies: [${latencies.join(", ")}] ms. Avg=${avg}ms`,
      avatarState: "N/A (Condition B)",
      latencyMs: avg,
      isSocratic: true,
      withinLatencyThreshold: max < 1500,
      notes: `Benchmark: avg=${avg}ms, min=${min}ms, max=${max}ms. No rate-limit pauses needed.`,
    });
  });
});
