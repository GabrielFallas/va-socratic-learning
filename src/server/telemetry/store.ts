import type { SessionLog } from "@/shared/types/session";
import { db } from "@/server/telemetry/db";

// ============================================================
// Durable session store — backed by SQLite (see db.ts).
//
// Keeps the same API the rest of the server depends on (persistSession,
// loadSession, listSessions, appendEvent, assignment state), so logger.ts and
// assignment.ts are unchanged. Each session is stored as one row with the full
// SessionLog JSON plus extracted columns (condition/startTime/endTime/isPilot)
// for indexed querying and the facilitator dashboards.
// ============================================================

function isPilotId(sessionId: string): boolean {
  return /^P-PILOT/i.test(sessionId);
}

const upsertStmt = db.prepare(`
  INSERT INTO sessions (sessionId, condition, startTime, endTime, isPilot, data, updatedAt)
  VALUES (@sessionId, @condition, @startTime, @endTime, @isPilot, @data, @updatedAt)
  ON CONFLICT(sessionId) DO UPDATE SET
    condition = excluded.condition,
    startTime = excluded.startTime,
    endTime   = excluded.endTime,
    isPilot   = excluded.isPilot,
    data      = excluded.data,
    updatedAt = excluded.updatedAt
`);

export function persistSession(session: SessionLog): void {
  try {
    upsertStmt.run({
      sessionId: session.sessionId,
      condition: session.condition,
      startTime: session.startTime,
      endTime: session.endTime ?? null,
      isPilot: isPilotId(session.sessionId) ? 1 : 0,
      data: JSON.stringify(session),
      updatedAt: Date.now(),
    });
  } catch (err) {
    console.error("[store] Failed to persist session:", err);
  }
}

const loadStmt = db.prepare("SELECT data FROM sessions WHERE sessionId = ?");

export function loadSession(sessionId: string): SessionLog | undefined {
  try {
    const row = loadStmt.get(sessionId) as { data: string } | undefined;
    return row ? (JSON.parse(row.data) as SessionLog) : undefined;
  } catch (err) {
    console.error("[store] Failed to load session:", err);
    return undefined;
  }
}

const listStmt = db.prepare("SELECT data FROM sessions ORDER BY startTime ASC");

export function listSessions(): SessionLog[] {
  try {
    const rows = listStmt.all() as { data: string }[];
    return rows
      .map((r) => {
        try {
          return JSON.parse(r.data) as SessionLog;
        } catch {
          return null;
        }
      })
      .filter((s): s is SessionLog => s !== null);
  } catch (err) {
    console.error("[store] Failed to list sessions:", err);
    return [];
  }
}

const appendEventStmt = db.prepare(
  "INSERT INTO events (ts, sessionId, type, payload) VALUES (?, ?, ?, ?)",
);

/** Append a raw event for the audit trail (best-effort). */
export function appendEvent(event: Record<string, unknown>): void {
  try {
    const { sessionId, type, ...rest } = event as {
      sessionId?: string;
      type?: string;
    } & Record<string, unknown>;
    appendEventStmt.run(
      Date.now(),
      sessionId ?? null,
      type ?? null,
      JSON.stringify(rest),
    );
  } catch {
    /* audit log is best-effort */
  }
}

// ── Assignment counter persistence (counterbalancing survives restarts) ──
export interface AssignmentState {
  assignedCount: number;
  blockQueue: ("A" | "B")[];
}

const loadAssignmentStmt = db.prepare(
  "SELECT assignedCount, blockQueue FROM assignment WHERE id = 1",
);

export function loadAssignmentState(): AssignmentState | undefined {
  try {
    const row = loadAssignmentStmt.get() as
      | { assignedCount: number; blockQueue: string }
      | undefined;
    if (!row) return undefined;
    return {
      assignedCount: row.assignedCount,
      blockQueue: JSON.parse(row.blockQueue) as ("A" | "B")[],
    };
  } catch {
    return undefined;
  }
}

const saveAssignmentStmt = db.prepare(`
  INSERT INTO assignment (id, assignedCount, blockQueue)
  VALUES (1, @assignedCount, @blockQueue)
  ON CONFLICT(id) DO UPDATE SET
    assignedCount = excluded.assignedCount,
    blockQueue    = excluded.blockQueue
`);

export function saveAssignmentState(state: AssignmentState): void {
  try {
    saveAssignmentStmt.run({
      assignedCount: state.assignedCount,
      blockQueue: JSON.stringify(state.blockQueue),
    });
  } catch (err) {
    console.error("[store] Failed to save assignment state:", err);
  }
}
