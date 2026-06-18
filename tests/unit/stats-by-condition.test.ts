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

  it("pools a crossover session (4 exercises) into BOTH conditions, aggregating both tasks", () => {
    const crossover: SessionLog = {
      sessionId: "P-010",
      condition: "A",
      design: "crossover",
      sequence: ["A", "B"],
      startTime: 1000,
      endTime: 2000,
      messages: [],
      taskResults: [
        // Both tasks in A: one resolved, one not → A resolutionRate = 0.5
        { taskId: "task-1-infinite-loop", condition: "A", resolvedAutonomously: true, turns: 3, timeSpentSeconds: 90, latencyReadings: [700] },
        { taskId: "task-2-algorithm-complexity", condition: "A", resolvedAutonomously: false, turns: 5, timeSpentSeconds: 110, latencyReadings: [800] },
        // Both tasks in B: both resolved → B resolutionRate = 1
        { taskId: "task-1-infinite-loop", condition: "B", resolvedAutonomously: true, turns: 2, timeSpentSeconds: 70, latencyReadings: [600] },
        { taskId: "task-2-algorithm-complexity", condition: "B", resolvedAutonomously: true, turns: 4, timeSpentSeconds: 95, latencyReadings: [650] },
      ],
      questionnaires: {
        "godspeed:A": { instrument: "godspeed", condition: "A", responses: {}, scores: { overall: 4.2 }, submittedAt: 1 },
        "godspeed:B": { instrument: "godspeed", condition: "B", responses: {}, scores: { overall: 2.1 }, submittedAt: 2 },
      },
    };
    const stats = statsByCondition([crossover]);
    // One observation per condition, aggregating that condition's two tasks.
    expect(stats.A.resolutionRate.n).toBe(1);
    expect(stats.A.resolutionRate.mean).toBe(0.5); // 1 of 2 resolved in A
    expect(stats.B.resolutionRate.n).toBe(1);
    expect(stats.B.resolutionRate.mean).toBe(1);   // 2 of 2 resolved in B
    // Godspeed pulled from the condition-tagged battery.
    expect(stats.A.godspeed.mean).toBe(4.2);
    expect(stats.B.godspeed.mean).toBe(2.1);
  });

  it("combines crossover and between-subjects sessions in the same A/B pools", () => {
    const between = mk("P-001", "A", true); // contributes 1 obs to A
    const crossover: SessionLog = {
      sessionId: "P-011",
      condition: "B",
      design: "crossover",
      sequence: ["B", "A"],
      startTime: 1000,
      endTime: 2000,
      messages: [],
      taskResults: [
        { taskId: "task-1-infinite-loop", condition: "B", resolvedAutonomously: true, turns: 2, timeSpentSeconds: 80, latencyReadings: [600] },
        { taskId: "task-2-algorithm-complexity", condition: "A", resolvedAutonomously: true, turns: 2, timeSpentSeconds: 80, latencyReadings: [600] },
      ],
    };
    const stats = statsByCondition([between, crossover]);
    expect(stats.A.resolutionRate.n).toBe(2); // between A + crossover's A task
    expect(stats.B.resolutionRate.n).toBe(1); // crossover's B task
  });
});
