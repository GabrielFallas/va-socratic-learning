import type { SessionLog, TaskResult } from "@/shared/types/session";

// ============================================================
// Export — flatten sessions to a researcher-friendly CSV (one row per
// participant) for analysis in R/Python/SPSS. Full fidelity is available via
// the JSON export; the CSV surfaces the headline per-condition metrics.
// ============================================================

const TASK_IDS = ["task-1-infinite-loop", "task-2-algorithm-complexity"] as const;

function iso(ts?: number): string {
  return ts ? new Date(ts).toISOString() : "";
}

function avg(nums: number[]): number {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}

function taskColumns(prefix: string, r?: TaskResult): Record<string, string | number> {
  return {
    [`${prefix}_resolved`]: r ? (r.resolvedAutonomously ? 1 : 0) : "",
    [`${prefix}_resolution`]: r?.resolution ?? "",
    [`${prefix}_turns`]: r?.turns ?? "",
    [`${prefix}_timeSec`]: r?.timeSpentSeconds ?? "",
    [`${prefix}_runAttempts`]: r?.codeRunAttempts ?? "",
    [`${prefix}_testsPassed`]: r ? (r.testsPassed ? 1 : 0) : "",
    [`${prefix}_codeEdited`]: r ? (r.codeEdited ? 1 : 0) : "",
    [`${prefix}_avgTtftMs`]: r ? avg(r.latencyReadings) : "",
  };
}

function sessionRow(s: SessionLog): Record<string, string | number> {
  const ttfts = s.messages
    .filter((m) => m.role === "assistant" && m.latencyMs !== undefined)
    .map((m) => m.latencyMs as number);
  const under1500 = ttfts.filter((l) => l < 1500).length;

  const row: Record<string, string | number> = {
    sessionId: s.sessionId,
    condition: s.condition,
    startTime: iso(s.startTime),
    endTime: iso(s.endTime),
    durationSec: s.endTime ? Math.round((s.endTime - s.startTime) / 1000) : "",
    totalTurns: s.messages.filter((m) => m.role === "user").length,
    totalMessages: s.messages.length,
    avgTtftMs: avg(ttfts),
    maxTtftMs: ttfts.length ? Math.max(...ttfts) : "",
    pctTtftUnder1500: ttfts.length ? Math.round((under1500 / ttfts.length) * 100) : "",
  };

  TASK_IDS.forEach((id, i) => {
    Object.assign(row, taskColumns(`task${i + 1}`, s.taskResults.find((t) => t.taskId === id)));
  });

  // Questionnaire scores → q_<instrument>_<phase>_<scoreName>
  for (const q of Object.values(s.questionnaires ?? {})) {
    const phase = q.phase ?? "x";
    for (const [k, v] of Object.entries(q.scores ?? {})) {
      row[`q_${q.instrument}_${phase}_${k}`] = v;
    }
  }
  return row;
}

function csvEscape(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function sessionsToCsv(sessions: SessionLog[]): string {
  const rows = sessions.map(sessionRow);
  // Union of all columns (questionnaire columns vary by what was completed).
  const cols: string[] = [];
  const seen = new Set<string>();
  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (!seen.has(k)) {
        seen.add(k);
        cols.push(k);
      }
    }
  }
  const header = cols.join(",");
  const body = rows
    .map((r) => cols.map((c) => csvEscape(r[c] ?? "")).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}
