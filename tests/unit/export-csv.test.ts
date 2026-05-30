import { describe, it, expect } from "vitest";
import { sessionsToCsv } from "@/server/telemetry/export";
import type { SessionLog } from "@/shared/types/session";

const session: SessionLog = {
  sessionId: "P-001",
  condition: "A",
  startTime: 1_000,
  endTime: 61_000,
  messages: [
    { id: "1", role: "user", content: "hola", timestamp: 1000 },
    { id: "2", role: "assistant", content: "¿qué ves?", timestamp: 1500, latencyMs: 900 },
    { id: "3", role: "assistant", content: "otra", timestamp: 2000, latencyMs: 2000 },
  ],
  taskResults: [
    {
      taskId: "task-1-infinite-loop",
      resolvedAutonomously: true,
      turns: 4,
      timeSpentSeconds: 120,
      latencyReadings: [900, 2000],
      resolution: "tests-passed",
      codeRunAttempts: 3,
      testsPassed: true,
      codeEdited: true,
    },
  ],
  questionnaires: {
    "sus:_": { instrument: "sus", responses: {}, scores: { total: 72.5 }, submittedAt: 5 },
  },
};

describe("sessionsToCsv", () => {
  it("produces a header + one row per session with flattened columns", () => {
    const csv = sessionsToCsv([session]);
    const [header, row] = csv.trim().split("\n");
    expect(header).toContain("sessionId");
    expect(header).toContain("task1_resolved");
    expect(header).toContain("q_sus_x_total"); // phase "_" → "x"
    expect(row).toContain("P-001");
    expect(row).toContain("72.5");
  });

  it("counts TTFT readings under 1500ms for RQ4", () => {
    const csv = sessionsToCsv([session]);
    const cols = csv.trim().split("\n")[0].split(",");
    const row = csv.trim().split("\n")[1].split(",");
    const idx = cols.indexOf("pctTtftUnder1500");
    expect(row[idx]).toBe("50"); // one of two readings < 1500
  });
});
