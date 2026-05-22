import { describe, it, expect, beforeEach } from "vitest";
import {
  initSession,
  logMessage,
  logTaskResult,
  getSession,
  getSessionSummary,
  closeSession,
} from "@/server/telemetry/logger";

// ============================================================
// Unit Tests: Session Logger
// Validates telemetry data collection for RQ2 and RQ4
// ============================================================

describe("Session Logger", () => {
  const testSessionId = `test-${Date.now()}`;

  beforeEach(() => {
    // Each test creates a fresh session
  });

  it("should initialize a session with correct condition", () => {
    const session = initSession(testSessionId, "A");
    expect(session.sessionId).toBe(testSessionId);
    expect(session.condition).toBe("A");
    expect(session.messages).toHaveLength(0);
    expect(session.taskResults).toHaveLength(0);
    expect(session.startTime).toBeLessThanOrEqual(Date.now());
  });

  it("should retrieve an initialized session", () => {
    const id = `get-${Date.now()}`;
    initSession(id, "B");
    const session = getSession(id);
    expect(session).toBeDefined();
    expect(session!.condition).toBe("B");
  });

  it("should log messages to session", () => {
    const id = `log-${Date.now()}`;
    initSession(id, "A");

    logMessage(id, {
      id: "msg-1",
      role: "user",
      content: "Mi programa no funciona",
      timestamp: Date.now(),
    });

    logMessage(id, {
      id: "msg-2",
      role: "assistant",
      content: "¿Qué debería hacer tu función?",
      timestamp: Date.now(),
      latencyMs: 850,
      totalResponseMs: 900,
    });

    const session = getSession(id);
    expect(session!.messages).toHaveLength(2);
    expect(session!.messages[1].latencyMs).toBe(850);
  });

  it("should log task results", () => {
    const id = `task-${Date.now()}`;
    initSession(id, "B");

    logTaskResult(id, {
      taskId: "task-1-infinite-loop",
      resolvedAutonomously: true,
      turns: 5,
      timeSpentSeconds: 240,
      latencyReadings: [850, 920, 780, 1100, 650],
    });

    const session = getSession(id);
    expect(session!.taskResults).toHaveLength(1);
    expect(session!.taskResults[0].resolvedAutonomously).toBe(true);
    expect(session!.taskResults[0].turns).toBe(5);
  });

  it("should compute session summary with latency stats", () => {
    const id = `summary-${Date.now()}`;
    initSession(id, "A");

    // Add messages with different latencies
    const latencies = [800, 1200, 650, 1800, 900];
    latencies.forEach((ms, i) => {
      logMessage(id, {
        id: `m-${i}`,
        role: "assistant",
        content: `Response ${i}`,
        timestamp: Date.now(),
        latencyMs: ms,
      });
    });

    const summary = getSessionSummary(id);
    expect(summary).toBeDefined();
    expect(summary!.totalMessages).toBe(latencies.length);

    // Average should be ~1070ms
    expect(summary!.avgLatencyMs).toBeGreaterThan(800);
    expect(summary!.avgLatencyMs).toBeLessThan(1300);

    // Max should be 1800
    expect(summary!.maxLatencyMs).toBe(1800);

    // RQ4: latency under 1500ms analysis
    expect(summary!.latencyUnder1500ms).toBe(4); // 800, 1200, 650, 900
    expect(summary!.latencyOver1500ms).toBe(1); // 1800
  });

  it("should close session and compute final stats", () => {
    const id = `close-${Date.now()}`;
    initSession(id, "A");

    logMessage(id, {
      id: "m1",
      role: "assistant",
      content: "Response",
      timestamp: Date.now(),
      latencyMs: 500,
    });

    const closed = closeSession(id);
    expect(closed).toBeDefined();
    expect(closed!.endTime).toBeDefined();
    expect(closed!.avgLatencyMs).toBe(500);
    expect(closed!.maxLatencyMs).toBe(500);
  });

  it("should handle non-existent session gracefully", () => {
    const summary = getSessionSummary("non-existent-id");
    expect(summary).toBeNull();
  });

  it("should count only assistant messages for turn count", () => {
    const id = `turns-${Date.now()}`;
    initSession(id, "B");

    // 3 user + 3 assistant = 3 turns
    for (let i = 0; i < 3; i++) {
      logMessage(id, {
        id: `user-${i}`,
        role: "user",
        content: `Question ${i}`,
        timestamp: Date.now(),
      });
      logMessage(id, {
        id: `asst-${i}`,
        role: "assistant",
        content: `Socratic response ${i}`,
        timestamp: Date.now(),
        latencyMs: 700,
      });
    }

    const summary = getSessionSummary(id);
    expect(summary!.totalTurns).toBe(3); // Only user messages count as turns
    expect(summary!.totalMessages).toBe(6);
  });
});

describe("RQ4: Latency Constraint Validation", () => {
  it("should correctly classify responses under 1500ms threshold", () => {
    const id = `rq4-${Date.now()}`;
    initSession(id, "A");

    const testCases = [
      { ms: 400, expectUnder: true },
      { ms: 800, expectUnder: true },
      { ms: 1499, expectUnder: true },
      { ms: 1500, expectUnder: false }, // Exactly at threshold = fails
      { ms: 2000, expectUnder: false },
    ];

    testCases.forEach(({ ms }, i) => {
      logMessage(id, {
        id: `r-${i}`,
        role: "assistant",
        content: "Response",
        timestamp: Date.now(),
        latencyMs: ms,
      });
    });

    const summary = getSessionSummary(id);
    expect(summary!.latencyUnder1500ms).toBe(3); // 400, 800, 1499
    expect(summary!.latencyOver1500ms).toBe(2); // 1500, 2000
  });
});
