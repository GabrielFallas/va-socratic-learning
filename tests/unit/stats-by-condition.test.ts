import { describe, it, expect } from "vitest";
import { statsByCondition, isPilot } from "@/server/telemetry/export";
import type { SessionLog } from "@/shared/types/session";

function mk(id: string, condition: "A" | "B", resolved: boolean): SessionLog {
  return {
    sessionId: id,
    condition,
    startTime: 1000,
    endTime: 2000,
    messages: [],
    taskResults: [
      {
        taskId: "task-1-infinite-loop",
        resolvedAutonomously: resolved,
        turns: 2,
        timeSpentSeconds: 100,
        latencyReadings: [800],
      },
    ],
  };
}

describe("isPilot", () => {
  it("flags only P-PILOT ids", () => {
    expect(isPilot("P-PILOT-ABC")).toBe(true);
    expect(isPilot("P-001")).toBe(false);
  });
});

describe("statsByCondition", () => {
  const sessions = [
    mk("P-001", "A", true),
    mk("P-002", "A", false),
    mk("P-003", "B", true),
    mk("P-PILOT-XYZ", "A", true), // pilot — must be excluded by default
  ];

  it("excludes pilot sessions from the research stats by default", () => {
    const stats = statsByCondition(sessions);
    // Condition A real participants: P-001, P-002 → n=2 (pilot dropped)
    expect(stats.A.resolutionRate.n).toBe(2);
    expect(stats.A.resolutionRate.mean).toBe(0.5); // one of two resolved
    expect(stats.B.resolutionRate.n).toBe(1);
    expect(stats.B.resolutionRate.mean).toBe(1);
  });

  it("can include pilots when explicitly requested", () => {
    const stats = statsByCondition(sessions, { includePilots: true });
    expect(stats.A.resolutionRate.n).toBe(3); // pilot now counted
  });
});
