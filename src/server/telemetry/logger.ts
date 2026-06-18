import type {
  SessionLog,
  TaskResult,
  QuestionnaireResponse,
} from "@/shared/types/session";
import {
  persistSession,
  loadSession,
  listSessions,
  appendEvent,
} from "@/server/telemetry/store";

// ============================================================
// Session Logger
// In-memory cache backed by the durable file store (store.ts). Every mutation
// is persisted to disk so research data survives restarts and is exportable.
// ============================================================

const sessions = new Map<string, SessionLog>();

/** Get from cache, falling back to disk (e.g. after a server restart). */
function getOrLoad(sessionId: string): SessionLog | undefined {
  let s = sessions.get(sessionId);
  if (!s) {
    s = loadSession(sessionId);
    if (s) sessions.set(sessionId, s);
  }
  return s;
}

function save(session: SessionLog): void {
  sessions.set(session.sessionId, session);
  persistSession(session);
}

export function initSession(
  sessionId: string,
  condition: "A" | "B",
  opts?: { design?: SessionLog["design"]; sequence?: SessionLog["sequence"] },
): SessionLog {
  const existing = getOrLoad(sessionId);
  if (existing) return existing; // idempotent — don't clobber an in-progress session

  const log: SessionLog = {
    sessionId,
    condition,
    design: opts?.design,
    sequence: opts?.sequence,
    startTime: Date.now(),
    messages: [],
    taskResults: [],
    questionnaires: {},
  };
  save(log);
  appendEvent({ type: "init", sessionId, condition, design: opts?.design, sequence: opts?.sequence });
  console.log(`[SESSION] Init ${sessionId} — ${opts?.sequence ? `crossover ${opts.sequence.join("→")}` : `Condition ${condition}`}`);
  return log;
}

export function getSession(sessionId: string): SessionLog | undefined {
  return getOrLoad(sessionId);
}

export function logMessage(
  sessionId: string,
  message: SessionLog["messages"][0]
): void {
  const session = getOrLoad(sessionId);
  if (!session) return;
  session.messages.push(message);
  save(session);

  if (message.latencyMs !== undefined) {
    console.log(`[LATENCY] Session ${sessionId} — ttft=${message.ttftMs ?? message.latencyMs}ms (${message.role})`);
  }
}

export function logTaskResult(sessionId: string, result: TaskResult): void {
  const session = getOrLoad(sessionId);
  if (!session) return;
  session.taskResults.push(result);
  save(session);
  appendEvent({ type: "task-result", sessionId, ...result, latencyReadings: undefined });

  const avg =
    result.latencyReadings.length > 0
      ? Math.round(result.latencyReadings.reduce((a, b) => a + b, 0) / result.latencyReadings.length)
      : 0;

  console.log(`[TASK_RESULT] Session ${sessionId}:`, {
    taskId: result.taskId,
    resolved: result.resolvedAutonomously,
    resolution: result.resolution,
    turns: result.turns,
    timeSeconds: result.timeSpentSeconds,
    avgTtftMs: avg,
  });
}

export function logQuestionnaire(
  sessionId: string,
  response: QuestionnaireResponse
): void {
  const session = getOrLoad(sessionId);
  if (!session) return;
  session.questionnaires ??= {};
  // Key includes the condition so a crossover participant's two batteries (one
  // per condition) don't overwrite each other. Falls back to phase/legacy key.
  const tag = response.condition ?? response.phase ?? "_";
  const key = `${response.instrument}:${tag}`;
  session.questionnaires[key] = response;
  save(session);
  appendEvent({ type: "questionnaire", sessionId, instrument: response.instrument, phase: response.phase, condition: response.condition });
  console.log(`[QUESTIONNAIRE] Session ${sessionId} — ${key}`);
}

export function closeSession(sessionId: string): SessionLog | undefined {
  const session = getOrLoad(sessionId);
  if (!session) return undefined;

  session.endTime = Date.now();

  const latencies = session.messages
    .map((m) => m.latencyMs)
    .filter((l): l is number => l !== undefined);

  if (latencies.length > 0) {
    session.avgLatencyMs = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
    session.maxLatencyMs = Math.max(...latencies);
  }
  save(session);
  appendEvent({ type: "close", sessionId, durationMs: session.endTime - session.startTime });

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
  const session = getOrLoad(sessionId);
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
      latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
    maxLatencyMs: latencies.length > 0 ? Math.max(...latencies) : 0,
    latencyUnder1500ms: latencies.filter((l) => l < 1500).length,
    latencyOver1500ms: latencies.filter((l) => l >= 1500).length,
    taskResults: session.taskResults,
  };
}

/** All sessions (for the facilitator results view + export).
 *  Merges the on-disk store with the in-memory cache so an in-progress session
 *  still appears even if a disk write lagged or failed; the in-memory copy wins
 *  on conflicts (it is at least as fresh as disk). */
export function getAllSessions(): SessionLog[] {
  const byId = new Map<string, SessionLog>();
  for (const s of listSessions()) byId.set(s.sessionId, s);
  for (const s of sessions.values()) byId.set(s.sessionId, s);
  return [...byId.values()].sort((a, b) => a.startTime - b.startTime);
}
