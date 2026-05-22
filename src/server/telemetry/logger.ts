import type { SessionLog, TaskResult } from "@/shared/types/session";

// ============================================================
// Session Logger
// In MVP: uses in-memory storage + console output
// Production: would use encrypted DB (Postgres/Firebase)
// ============================================================

// In-memory store (MVP only — lost on server restart)
const sessions = new Map<string, SessionLog>();

export function initSession(
  sessionId: string,
  condition: "A" | "B"
): SessionLog {
  const log: SessionLog = {
    sessionId,
    condition,
    startTime: Date.now(),
    messages: [],
    taskResults: [],
  };
  sessions.set(sessionId, log);
  console.log(`[SESSION] Init ${sessionId} — Condition ${condition}`);
  return log;
}

export function getSession(sessionId: string): SessionLog | undefined {
  return sessions.get(sessionId);
}

export function logMessage(
  sessionId: string,
  message: SessionLog["messages"][0]
): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.messages.push(message);

  if (message.latencyMs !== undefined) {
    console.log(
      `[LATENCY] Session ${sessionId} — ${message.latencyMs}ms (${message.role})`
    );
  }
}

export function logTaskResult(sessionId: string, result: TaskResult): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.taskResults.push(result);

  const avg =
    result.latencyReadings.length > 0
      ? Math.round(
          result.latencyReadings.reduce((a, b) => a + b, 0) /
            result.latencyReadings.length
        )
      : 0;

  console.log(`[TASK_RESULT] Session ${sessionId}:`, {
    taskId: result.taskId,
    resolved: result.resolvedAutonomously,
    turns: result.turns,
    timeSeconds: result.timeSpentSeconds,
    avgLatencyMs: avg,
  });
}

export function closeSession(sessionId: string): SessionLog | undefined {
  const session = sessions.get(sessionId);
  if (!session) return undefined;

  session.endTime = Date.now();

  // Compute aggregate latency stats
  const latencies = session.messages
    .map((m) => m.latencyMs)
    .filter((l): l is number => l !== undefined);

  if (latencies.length > 0) {
    session.avgLatencyMs = Math.round(
      latencies.reduce((a, b) => a + b, 0) / latencies.length
    );
    session.maxLatencyMs = Math.max(...latencies);
  }

  console.log(`[SESSION] Close ${sessionId}:`, {
    durationMs: session.endTime - session.startTime,
    totalMessages: session.messages.length,
    avgLatencyMs: session.avgLatencyMs,
    maxLatencyMs: session.maxLatencyMs,
    tasksCompleted: session.taskResults.length,
  });

  return session;
}

export function getSessionSummary(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const latencies = session.messages
    .filter((m) => m.role === "assistant" && m.latencyMs !== undefined)
    .map((m) => m.latencyMs as number);

  return {
    sessionId,
    condition: session.condition,
    totalMessages: session.messages.length,
    totalTurns: session.messages.filter((m) => m.role === "user").length,
    avgLatencyMs:
      latencies.length > 0
        ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length)
        : 0,
    maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : 0,
    latencyUnder1500ms: latencies.filter((l) => l < 1500).length,
    latencyOver1500ms: latencies.filter((l) => l >= 1500).length,
    taskResults: session.taskResults,
  };
}
