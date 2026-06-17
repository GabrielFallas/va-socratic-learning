import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

// ============================================================
// SQLite database instance (single file, embedded — no server process).
//
// Replaces the previous loose JSON-per-file store. Two problems it fixes:
//   1. Durability/queryability: one inspectable .db file (open it with
//      "DB Browser for SQLite"); research data survives restarts and is
//      queryable with SQL for ad-hoc analysis toward the deliverable.
//   2. The "empty facilitator panel" bug: the JSON store resolved its path
//      from process.cwd(), so launching the dev server from a different
//      working directory made it read an empty folder. We anchor the DB to
//      the PROJECT ROOT (found by walking up to our package.json), not cwd,
//      so the location is stable no matter how the server was launched.
//
// Override the location with SONIC_DB_PATH (full file path) or DATA_DIR
// (directory; the db is created as <DATA_DIR>/sonic.db).
// ============================================================

/** Walk up from a start dir to find the dir containing our package.json. */
function findProjectRoot(startDirs: string[]): string | null {
  for (const start of startDirs) {
    let dir = start;
    // Bound the walk so a bad start can't loop forever.
    for (let i = 0; i < 12 && dir; i++) {
      try {
        const pkgPath = path.join(dir, "package.json");
        if (fs.existsSync(pkgPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
          if (pkg?.name === "va-socratic-learning") return dir;
        }
      } catch {
        /* keep walking */
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

function resolveDbPath(): string {
  if (process.env.SONIC_DB_PATH) return process.env.SONIC_DB_PATH;

  const dataDir =
    process.env.DATA_DIR ??
    path.join(
      // __dirname points into the bundled server output under the project, so
      // walking up from it locates the project root even when cwd is wrong.
      findProjectRoot([process.cwd(), __dirname]) ?? process.cwd(),
      "data",
    );

  return path.join(dataDir, "sonic.db");
}

const DB_PATH = resolveDbPath();
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// A mismatch here is the usual cause of "no sessions showing": surface the
// resolved absolute path once at startup so it can be verified.
console.info(`[db] SQLite database resolved to: ${DB_PATH}`);

export const db: Database.Database = new Database(DB_PATH);
db.pragma("journal_mode = WAL"); // better concurrency for the dev server
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    sessionId  TEXT PRIMARY KEY,
    condition  TEXT NOT NULL,
    startTime  INTEGER NOT NULL,
    endTime    INTEGER,
    isPilot    INTEGER NOT NULL DEFAULT 0,
    data       TEXT NOT NULL,          -- full SessionLog as JSON
    updatedAt  INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_sessions_condition ON sessions(condition);
  CREATE INDEX IF NOT EXISTS idx_sessions_start     ON sessions(startTime);

  CREATE TABLE IF NOT EXISTS events (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    ts        INTEGER NOT NULL,
    sessionId TEXT,
    type      TEXT,
    payload   TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_events_session ON events(sessionId);

  CREATE TABLE IF NOT EXISTS assignment (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    assignedCount INTEGER NOT NULL,
    blockQueue    TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
  );
`);

export const DB_FILE = DB_PATH;

// ── One-time migration: import legacy data/sessions/*.json ──────────
// The previous store wrote one JSON file per session. Import them once so the
// historical pilot data appears in the dashboards/export. INSERT OR IGNORE
// means a session already live in the DB is never overwritten by stale JSON.
function migrateLegacyJsonSessions(): void {
  const doneRow = db.prepare("SELECT value FROM meta WHERE key = 'legacyJsonImported'").get() as
    | { value: string }
    | undefined;
  if (doneRow?.value === "1") return;

  const root = findProjectRoot([process.cwd(), __dirname]) ?? process.cwd();
  const sessionsDir = path.join(root, "data", "sessions");

  let imported = 0;
  try {
    if (fs.existsSync(sessionsDir)) {
      const insert = db.prepare(`
        INSERT OR IGNORE INTO sessions (sessionId, condition, startTime, endTime, isPilot, data, updatedAt)
        VALUES (@sessionId, @condition, @startTime, @endTime, @isPilot, @data, @updatedAt)
      `);
      const files = fs.readdirSync(sessionsDir).filter((f) => f.endsWith(".json"));
      const tx = db.transaction((names: string[]) => {
        for (const f of names) {
          try {
            const s = JSON.parse(fs.readFileSync(path.join(sessionsDir, f), "utf8"));
            if (!s?.sessionId || !s?.condition || typeof s?.startTime !== "number") continue;
            const res = insert.run({
              sessionId: s.sessionId,
              condition: s.condition,
              startTime: s.startTime,
              endTime: s.endTime ?? null,
              isPilot: /^P-PILOT/i.test(s.sessionId) ? 1 : 0,
              data: JSON.stringify(s),
              updatedAt: Date.now(),
            });
            imported += res.changes;
          } catch {
            /* skip unreadable file */
          }
        }
      });
      tx(files);
    }

    // Also carry over the counterbalancing assignment counter, if present and
    // not already set, so real participant numbering (P-001…) continues.
    const assignFile = path.join(root, "data", "assignment.json");
    const hasAssign = db.prepare("SELECT 1 FROM assignment WHERE id = 1").get();
    if (!hasAssign && fs.existsSync(assignFile)) {
      try {
        const a = JSON.parse(fs.readFileSync(assignFile, "utf8"));
        if (typeof a?.assignedCount === "number") {
          db.prepare(
            "INSERT INTO assignment (id, assignedCount, blockQueue) VALUES (1, ?, ?)",
          ).run(a.assignedCount, JSON.stringify(a.blockQueue ?? []));
        }
      } catch {
        /* ignore */
      }
    }
  } catch (err) {
    console.error("[db] Legacy JSON migration error:", err);
  }

  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('legacyJsonImported', '1')").run();
  console.info(`[db] Legacy JSON migration complete — imported ${imported} session(s).`);
}

migrateLegacyJsonSessions();
