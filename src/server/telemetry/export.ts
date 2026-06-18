import type { SessionLog, TaskResult, Condition } from "@/shared/types/session";

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
    [`${prefix}_condition`]: r?.condition ?? "",
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
    design: s.design ?? "between",
    sequence: s.sequence ? s.sequence.join("→") : "",
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

  // Per-condition outcome aggregates (design-agnostic; the primary unit for the
  // A-vs-B analysis). In crossover both tasks of a condition are aggregated; in
  // between-subjects the single condition's tasks are aggregated. These let
  // analyze.py treat both designs uniformly.
  for (const cond of ["A", "B"] as const) {
    const tasks = s.taskResults.filter((t) => (t.condition ?? s.condition) === cond);
    if (!tasks.length) continue;
    const m = taskMetrics(tasks);
    row[`cond${cond}_resolutionRate`] = m.resolutionRate ?? "";
    row[`cond${cond}_turns`] = m.turns ?? "";
    row[`cond${cond}_avgTimeSec`] = m.avgTaskTimeSec ?? "";
    row[`cond${cond}_avgTtftMs`] = m.avgTtftMs ?? "";
  }

  row.totalRings = s.taskResults.reduce((sum, t) => sum + (t.ringsCollected ?? 0), 0);

  // Behavioural telemetry derived from the message stream.
  Object.assign(row, behaviouralColumns(s));

  // Questionnaire scores → q_<instrument>_<tag>_<scoreName>, where tag is the
  // condition for crossover batteries (q_godspeed_A_*, q_godspeed_B_*) or the
  // phase for legacy between-subjects sessions (q_godspeed_x_*).
  for (const q of Object.values(s.questionnaires ?? {})) {
    const tag = q.condition ?? q.phase ?? "x";
    for (const [k, v] of Object.entries(q.scores ?? {})) {
      row[`q_${q.instrument}_${tag}_${k}`] = v;
    }
  }
  return row;
}

// ============================================================
// Descriptive statistics by condition (facilitator live view + paper results)
// ============================================================

/** Find a questionnaire score, preferring the one tagged for `condition`
 *  (crossover); falls back to an untagged entry (legacy between-subjects). */
function qScore(s: SessionLog, instrument: string, score: string, condition?: Condition): number | undefined {
  const entries = Object.values(s.questionnaires ?? {}).filter((x) => x.instrument === instrument);
  const entry = condition
    ? entries.find((x) => x.condition === condition) ?? entries.find((x) => !x.condition)
    : entries[0];
  const v = entry?.scores?.[score];
  return typeof v === "number" ? v : undefined;
}

/** Behavioural/outcome metrics aggregated over a set of task results (in the
 *  crossover design a condition block contains BOTH tasks). */
function taskMetrics(tasks: TaskResult[]): Record<string, number | undefined> {
  if (!tasks.length) {
    return { resolutionRate: undefined, turns: undefined, avgTaskTimeSec: undefined, avgTtftMs: undefined, pctTtftUnder1500: undefined };
  }
  const ttfts = tasks.flatMap((t) => t.latencyReadings ?? []);
  const under = ttfts.filter((l) => l < 1500).length;
  const resolved = tasks.filter((t) => t.resolvedAutonomously).length;
  return {
    resolutionRate: resolved / tasks.length,
    turns: avg(tasks.map((t) => t.turns)),
    avgTaskTimeSec: avg(tasks.map((t) => t.timeSpentSeconds)),
    avgTtftMs: ttfts.length ? avg(ttfts) : undefined,
    pctTtftUnder1500: ttfts.length ? Math.round((under / ttfts.length) * 100) : undefined,
  };
}

/** Pull a per-session scalar for each metric we summarise by condition
 *  (whole-session aggregation — used for legacy between-subjects sessions). */
function sessionMetrics(s: SessionLog): Record<string, number | undefined> {
  const ttfts = s.messages
    .filter((m) => m.role === "assistant" && m.latencyMs !== undefined)
    .map((m) => m.latencyMs as number);
  const under1500 = ttfts.filter((l) => l < 1500).length;
  const tasks = s.taskResults;
  const resolved = tasks.filter((t) => t.resolvedAutonomously).length;
  const beh = behaviouralColumns(s);
  const q = (key: string, score: string) => qScore(s, key, score);

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
    godspeedAnthropomorphism: q("godspeed", "anthropomorphism"),
    godspeedLikeability: q("godspeed", "likeability"),
    godspeedIntelligence: q("godspeed", "intelligence"),
    pedSupport: q("pedsupport", "total"),
    panasPositive: q("panas-sf", "positiveAffect"),
    panasNegative: q("panas-sf", "negativeAffect"),
  };
}

/**
 * One metric observation PER condition the session contributes to. A crossover
 * session yields two observations (Task 1's condition and Task 2's), each scoped
 * to that condition's task result + condition-tagged questionnaires. A legacy
 * between-subjects session yields a single whole-session observation. This lets
 * the A-vs-B comparison pool both designs together.
 */
function conditionObservations(s: SessionLog): Array<{ condition: Condition; metrics: Record<string, number | undefined> }> {
  const isCrossover = s.design === "crossover" && Array.isArray(s.sequence) && s.sequence.length === 2;
  if (isCrossover) {
    const seen = new Set<Condition>();
    return (s.sequence as Condition[])
      .filter((c) => !seen.has(c) && (seen.add(c), true))
      .map((c) => ({
        condition: c,
        metrics: {
          ...taskMetrics(s.taskResults.filter((t) => t.condition === c)),
          // Think-time is computed from the whole message stream and can't be
          // cleanly attributed per condition, so it is omitted from crossover obs.
          avgThinkTimeMs: undefined,
          sus: qScore(s, "sus", "total", c),
          nasaTlx: qScore(s, "nasa-tlx", "rawTlx", c),
          godspeed: qScore(s, "godspeed", "overall", c),
          godspeedAnthropomorphism: qScore(s, "godspeed", "anthropomorphism", c),
          godspeedLikeability: qScore(s, "godspeed", "likeability", c),
          godspeedIntelligence: qScore(s, "godspeed", "intelligence", c),
          pedSupport: qScore(s, "pedsupport", "total", c),
          panasPositive: qScore(s, "panas-sf", "positiveAffect", c),
          panasNegative: qScore(s, "panas-sf", "negativeAffect", c),
        },
      }));
  }
  return [{ condition: s.condition, metrics: sessionMetrics(s) }];
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
  "avgThinkTimeMs", "sus", "nasaTlx", "godspeed", "godspeedAnthropomorphism",
  "godspeedLikeability", "godspeedIntelligence", "pedSupport",
  "panasPositive", "panasNegative",
] as const;

export type StatMetric = (typeof STAT_METRICS)[number];

/** Per-condition mean/SD/n for each headline metric (A vs B). Pilot sessions
 *  are excluded by default so the comparison reflects real participants only. */
export function statsByCondition(
  sessions: SessionLog[],
  { includePilots = false }: { includePilots?: boolean } = {}
): Record<"A" | "B", Record<StatMetric, StatCell>> {
  const pool = includePilots ? sessions : sessions.filter((s) => !isPilot(s.sessionId));
  const observations = pool.flatMap(conditionObservations);
  const out = { A: {}, B: {} } as Record<"A" | "B", Record<StatMetric, StatCell>>;
  for (const cond of ["A", "B"] as const) {
    const subset = observations.filter((o) => o.condition === cond).map((o) => o.metrics);
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

/**
 * Conversation transcripts as JSONL (one message per line) for qualitative
 * coding outside the app. Pilots are excluded by default so coders only see
 * real participants. Each line: sessionId, condition, turn index, role,
 * timestamp (ISO), inputMode, latencyMs, content.
 */
export function sessionsToTranscriptJsonl(
  sessions: SessionLog[],
  { includePilots = false }: { includePilots?: boolean } = {},
): string {
  const pool = includePilots ? sessions : sessions.filter((s) => !isPilot(s.sessionId));
  const lines: string[] = [];
  for (const s of pool) {
    s.messages.forEach((m, i) => {
      lines.push(
        JSON.stringify({
          sessionId: s.sessionId,
          condition: s.condition,
          turn: i,
          role: m.role,
          timestamp: iso(m.timestamp),
          inputMode: m.inputMode ?? "",
          latencyMs: m.latencyMs ?? "",
          content: m.content,
        }),
      );
    });
  }
  return lines.join("\n") + (lines.length ? "\n" : "");
}

/** Deterministic base columns (everything except questionnaire scores, which
 *  vary by what each participant completed). Derived from an empty skeleton
 *  session so the header can never drift from `sessionRow`'s real output — used
 *  to emit a stable header even when no sessions exist yet (so a facilitator who
 *  exports before collecting data still gets a valid, header-only CSV). */
function baseColumns(): string[] {
  const skeleton: SessionLog = {
    sessionId: "", condition: "A", startTime: 0, messages: [],
    taskResults: [], questionnaires: {},
  } as unknown as SessionLog;
  return Object.keys(sessionRow(skeleton));
}

export function sessionsToCsv(sessions: SessionLog[]): string {
  const rows = sessions.map(sessionRow);
  // Union of all columns (questionnaire columns vary by what was completed).
  // Seed with the deterministic base columns so an empty export is still a
  // valid header-only CSV rather than a blank line.
  const cols: string[] = [...baseColumns()];
  const seen = new Set<string>(cols);
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
