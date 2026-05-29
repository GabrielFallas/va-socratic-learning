import fs from "node:fs";
import path from "node:path";
import type { SessionLog } from "@/shared/types/session";

// ============================================================
// Durable session store (file-based JSON)
//
// Replaces the previous in-memory-only Map, which lost ALL research data on
// every server restart and could not be exported. We keep an in-memory cache
// for speed but persist each session to disk on every mutation, plus an
// append-only event log for an audit trail.
//
// File-based JSON (not SQLite) is deliberate: zero native dependencies, works
// the same on the Windows lab machine and in CI, and the per-session files are
// trivially inspectable and exportable.
// ============================================================

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const SESSIONS_DIR = path.join(DATA_DIR, "sessions");
const EVENTS_LOG = path.join(DATA_DIR, "events.jsonl");

function ensureDirs(): void {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function sessionPath(sessionId: string): string {
  // Guard against path traversal from a crafted sessionId.
  const safe = sessionId.replace(/[^A-Za-z0-9_-]/g, "_");
  return path.join(SESSIONS_DIR, `${safe}.json`);
}

/** Atomic write (tmp + rename) so a crash can't leave a half-written file. */
function writeJsonAtomic(file: string, data: unknown): void {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  fs.renameSync(tmp, file);
}

export function persistSession(session: SessionLog): void {
  try {
    ensureDirs();
    writeJsonAtomic(sessionPath(session.sessionId), session);
  } catch (err) {
    console.error("[store] Failed to persist session:", err);
  }
}

export function loadSession(sessionId: string): SessionLog | undefined {
  try {
    const file = sessionPath(sessionId);
    if (!fs.existsSync(file)) return undefined;
    return JSON.parse(fs.readFileSync(file, "utf8")) as SessionLog;
  } catch (err) {
    console.error("[store] Failed to load session:", err);
    return undefined;
  }
}

export function listSessions(): SessionLog[] {
  try {
    ensureDirs();
    return fs
      .readdirSync(SESSIONS_DIR)
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        try {
          return JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), "utf8")) as SessionLog;
        } catch {
          return null;
        }
      })
      .filter((s): s is SessionLog => s !== null)
      .sort((a, b) => a.startTime - b.startTime);
  } catch (err) {
    console.error("[store] Failed to list sessions:", err);
    return [];
  }
}

/** Append a raw event for the audit trail (best-effort, non-blocking of logic). */
export function appendEvent(event: Record<string, unknown>): void {
  try {
    ensureDirs();
    fs.appendFileSync(EVENTS_LOG, JSON.stringify({ ts: Date.now(), ...event }) + "\n", "utf8");
  } catch {
    /* audit log is best-effort */
  }
}

// ── Assignment counter persistence (counterbalancing survives restarts) ──
const ASSIGNMENT_FILE = path.join(DATA_DIR, "assignment.json");

export interface AssignmentState {
  assignedCount: number;
  blockQueue: ("A" | "B")[];
}

export function loadAssignmentState(): AssignmentState | undefined {
  try {
    if (!fs.existsSync(ASSIGNMENT_FILE)) return undefined;
    return JSON.parse(fs.readFileSync(ASSIGNMENT_FILE, "utf8")) as AssignmentState;
  } catch {
    return undefined;
  }
}

export function saveAssignmentState(state: AssignmentState): void {
  try {
    ensureDirs();
    writeJsonAtomic(ASSIGNMENT_FILE, state);
  } catch (err) {
    console.error("[store] Failed to save assignment state:", err);
  }
}
