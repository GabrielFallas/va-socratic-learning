import type { SessionLog, TaskResult } from "@/shared/types/session";

// ============================================================
// Export — flatten sessions to a researcher-friendly CSV (one row per
// participant) for analysis in R/Python/SPSS. Full fidelity is available via
// the JSON export; the CSV surfaces the headline per-condition metrics.
// ============================================================

const TASK_IDS = ["task-1-infinite-loop", "task-2-algorithm-complexity"] as const;

/** Pilot/testing sessions use a `P-PILOT-*` id and must be excluded from the
 *  research dataset (they force a condition and skew the A/B balance). */
export function isPilot(sessionId: string): boolean {
  return /^P-PILOT/i.test(sessionId);
}

function iso(ts?: number): string {
  return ts ? new Date(ts).toISOString() : "";
}

function avg(nums: number[]): number {
  return nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0;
}

/** Percentile (nearest-rank) of a numeric array, e.g. p=95. */
function percentile(nums: number[], p: number): number {
  if (!nums.length) return 0;
  const sorted = [...nums].sort((a, b) => a - b);
  const rank = Math.ceil((p / 100) * sorted.length) - 1;
  return Math.round(sorted[Math.min(Math.max(rank, 0), sorted.length - 1)]);
}

function median(nums: number[]): number {
  if (!nums.length) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2);
}

function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/**
 * Behavioural metrics derived purely from the stored message stream — no extra
 * client instrumentation. These reduce reliance on self-report by capturing how
 * the participant actually engaged: verbosity, reflection (think-time between
 * the tutor's message and the user's reply), latency tail, and voice usage.
 */
function behaviouralColumns(s: SessionLog): Record<string, string | number> {
  const userMsgs = s.messages.filter((m) => m.role === "user");
  const chars = userMsgs.map((m) => m.content.length);
  const words = userMsgs.map((m) => wordCount(m.content));

  // Think-time: gap between an assistant message and the next user message.
  const thinkTimes: number[] = [];
  for (let i = 1; i < s.messages.length; i++) {
    const prev = s.messages[i - 1];
    const cur = s.messages[i];
    if (prev.role === "assistant" && cur.role === "user") {
      const gap = cur.timestamp - prev.timestamp;
      if (gap >= 0 && gap < 10 * 60 * 1000) thinkTimes.push(gap); // ignore >10min idle
    }
  }

  const ttfts = s.messages
    .filter((m) => m.role === "assistant" && m.latencyMs !== undefined)
    .map((m) => m.latencyMs as number);

  const voiceCount = userMsgs.filter((m) => m.inputMode === "voice").length;
  const taggedInput = userMsgs.filter((m) => m.inputMode !== undefined).length;

  return {
    userMsgCount: userMsgs.length,
    avgUserMsgChars: avg(chars),
    avgUserMsgWords: avg(words),
    avgThinkTimeMs: avg(thinkTimes),
    medianThinkTimeMs: median(thinkTimes),
    p95TtftMs: percentile(ttfts, 95),
    voiceInputCount: voiceCount,
    voiceInputRatio: taggedInput ? Math.round((voiceCount / taggedInput) * 100) / 100 : 0,
  };
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
    [`${prefix}_rings`]: r?.ringsCollected ?? "",
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

  row.totalRings = s.taskResults.reduce((sum, t) => sum + (t.ringsCollected ?? 0), 0);

  // Behavioural telemetry derived from the message stream.
  Object.assign(row, behaviouralColumns(s));

  // Questionnaire scores → q_<instrument>_<phase>_<scoreName>
  for (const q of Object.values(s.questionnaires ?? {})) {
    const phase = q.phase ?? "x";
    for (const [k, v] of Object.entries(q.scores ?? {})) {
      row[`q_${q.instrument}_${phase}_${k}`] = v;
    }
  }
  return row;
}

// ============================================================
// Descriptive statistics by condition (facilitator live view + paper results)
// ============================================================

/** Pull a per-session scalar for each metric we summarise by condition. */
function sessionMetrics(s: SessionLog): Record<string, number | undefined> {
  const ttfts = s.messages
    .filter((m) => m.role === "assistant" && m.latencyMs !== undefined)
    .map((m) => m.latencyMs as number);
  const under1500 = ttfts.filter((l) => l < 1500).length;
  const tasks = s.taskResults;
  const resolved = tasks.filter((t) => t.resolvedAutonomously).length;
  const beh = behaviouralColumns(s);

  const q = (key: string, score: string): number | undefined => {
    const entry = Object.values(s.questionnaires ?? {}).find((x) => x.instrument === key);
    const v = entry?.scores?.[score];
    return typeof v === "number" ? v : undefined;
  };

  return {
    resolutionRate: tasks.length ? resolved / tasks.length : undefined,
    turns: s.messages.filter((m) => m.role === "user").length,
    avgTaskTimeSec: tasks.length ? avg(tasks.map((t) => t.timeSpentSeconds)) : undefined,
    avgTtftMs: ttfts.length ? avg(ttfts) : undefined,
    pctTtftUnder1500: ttfts.length ? Math.round((under1500 / ttfts.length) * 100) : undefined,
    avgThinkTimeMs: Number(beh.avgThinkTimeMs) || undefined,
    sus: q("sus", "total"),
    nasaTlx: q("nasa-tlx", "rawTlx"),
    godspeed: q("godspeed", "overall"),
    panasPositive: q("panas-sf", "positiveAffect"),
    panasNegative: q("panas-sf", "negativeAffect"),
  };
}

interface StatCell { mean: number; sd: number; n: number; }

function summarise(values: number[]): StatCell {
  const xs = values.filter((v) => Number.isFinite(v));
  const n = xs.length;
  if (!n) return { mean: 0, sd: 0, n: 0 };
  const m = xs.reduce((a, b) => a + b, 0) / n;
  const variance = xs.reduce((a, b) => a + (b - m) ** 2, 0) / n;
  return { mean: Math.round(m * 100) / 100, sd: Math.round(Math.sqrt(variance) * 100) / 100, n };
}

export const STAT_METRICS = [
  "resolutionRate", "turns", "avgTaskTimeSec", "avgTtftMs", "pctTtftUnder1500",
  "avgThinkTimeMs", "sus", "nasaTlx", "godspeed", "panasPositive", "panasNegative",
] as const;

export type StatMetric = (typeof STAT_METRICS)[number];

/** Per-condition mean/SD/n for each headline metric (A vs B). Pilot sessions
 *  are excluded by default so the comparison reflects real participants only. */
export function statsByCondition(
  sessions: SessionLog[],
  { includePilots = false }: { includePilots?: boolean } = {}
): Record<"A" | "B", Record<StatMetric, StatCell>> {
  const pool = includePilots ? sessions : sessions.filter((s) => !isPilot(s.sessionId));
  const out = { A: {}, B: {} } as Record<"A" | "B", Record<StatMetric, StatCell>>;
  for (const cond of ["A", "B"] as const) {
    const subset = pool.filter((s) => s.condition === cond).map(sessionMetrics);
    for (const metric of STAT_METRICS) {
      out[cond][metric] = summarise(
        subset.map((m) => m[metric]).filter((v): v is number => v !== undefined)
      );
    }
  }
  return out;
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
