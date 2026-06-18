import { describe, it, expect } from "vitest";
import { sessionsToCsv } from "@/server/telemetry/export";
import type { SessionLog } from "@/shared/types/session";

const session: SessionLog = {
  sessionId: "P-001",
  condition: "A",
  startTime: 1_000,
  endTime: 61_000,
  messages: [
    { id: "1", role: "user", content: "hola", timestamp: 1000, inputMode: "text" },
    { id: "2", role: "assistant", content: "¿qué ves?", timestamp: 1500, latencyMs: 900 },
    // user replies 2s after the tutor → think-time = 2000ms, composed by voice
    { id: "3", role: "user", content: "el contador no cambia", timestamp: 3500, inputMode: "voice" },
    { id: "4", role: "assistant", content: "otra", timestamp: 4000, latencyMs: 2000 },
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
      ringsCollected: 12,
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

  it("emits behavioural telemetry columns derived from the message stream", () => {
    const csv = sessionsToCsv([session]);
    const cols = csv.trim().split("\n")[0].split(",");
    const row = csv.trim().split("\n")[1].split(",");
    const get = (c: string) => row[cols.indexOf(c)];

    expect(cols).toContain("avgThinkTimeMs");
    expect(get("userMsgCount")).toBe("2");
    expect(get("avgThinkTimeMs")).toBe("2000"); // single assistant→user gap of 2s
    expect(get("voiceInputCount")).toBe("1");
    expect(get("voiceInputRatio")).toBe("0.5"); // 1 voice of 2 tagged inputs
    expect(get("totalRings")).toBe("12");
    expect(get("task1_rings")).toBe("12");
    expect(cols).toContain("p95TtftMs");
  });

  it("emits a stable header-only CSV when there are no sessions", () => {
    const csv = sessionsToCsv([]);
    const lines = csv.split("\n").filter((l) => l.length > 0);
    expect(lines.length).toBe(1); // header only, no data rows
    const header = lines[0];
    expect(header).toContain("sessionId");
    expect(header).toContain("condition");
    expect(header).toContain("task1_resolved");
    expect(header).toContain("avgThinkTimeMs");
  });

  it("no longer emits consent or pre-phase questionnaire columns", () => {
    const csv = sessionsToCsv([session]);
    const header = csv.trim().split("\n")[0];
    expect(header).not.toContain("q_consent");
    expect(header).not.toContain("_pre_");
  });
});
