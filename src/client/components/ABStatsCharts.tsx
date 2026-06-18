"use client";

// ============================================================
// A-vs-B analysis charts for the facilitator panel.
//
// Dependency-free inline SVG (no chart library): a small-multiples grid where
// each cell is one outcome metric with grouped bars for Condition A (Sonic) and
// Condition B (text), ±SD error whiskers, and n. Each cell is normalised to its
// own scale because the metrics span very different ranges (0–1, 0–100, ms…).
//
// Feeds straight from /api/session?stats=1 (statsByCondition in export.ts), so
// the visuals and the CSV/JSON export are always computed from the same data.
// ============================================================

interface StatCell {
  mean: number;
  sd: number;
  n: number;
}
type Stats = Record<"A" | "B", Record<string, StatCell>>;

interface MetricDef {
  id: string;
  label: string;
  fmt: (v: number) => string;
  /** true = higher is better, false = lower is better (drives the ▲/▼ hint). */
  higherIsBetter: boolean;
  /** Optional fixed axis max (e.g. SUS 0–100); otherwise auto from data. */
  axisMax?: number;
}

// Mirrors STAT_METRICS in export.ts, grouped for the deliverable's RQs.
const METRICS: MetricDef[] = [
  { id: "sus",              label: "SUS (0–100)",         fmt: (v) => v.toFixed(1), higherIsBetter: true,  axisMax: 100 },
  { id: "nasaTlx",          label: "NASA-TLX (RTLX)",     fmt: (v) => v.toFixed(1), higherIsBetter: false, axisMax: 100 },
  { id: "pedSupport",       label: "Apoyo pedagóg. (1–5)", fmt: (v) => v.toFixed(2), higherIsBetter: true,  axisMax: 5 },
  { id: "godspeed",         label: "Godspeed (overall)",  fmt: (v) => v.toFixed(2), higherIsBetter: true,  axisMax: 5 },
  { id: "godspeedAnthropomorphism", label: "Godspeed: antropom.", fmt: (v) => v.toFixed(2), higherIsBetter: true, axisMax: 5 },
  { id: "godspeedLikeability",      label: "Godspeed: agrado",    fmt: (v) => v.toFixed(2), higherIsBetter: true, axisMax: 5 },
  { id: "godspeedIntelligence",     label: "Godspeed: intelig.",  fmt: (v) => v.toFixed(2), higherIsBetter: true, axisMax: 5 },
  { id: "panasPositive",    label: "PANAS afecto +",      fmt: (v) => v.toFixed(1), higherIsBetter: true },
  { id: "panasNegative",    label: "PANAS afecto −",      fmt: (v) => v.toFixed(1), higherIsBetter: false },
  { id: "resolutionRate",   label: "Tasa de resolución",  fmt: (v) => `${Math.round(v * 100)}%`, higherIsBetter: true, axisMax: 1 },
  { id: "turns",            label: "Turnos",              fmt: (v) => v.toFixed(1), higherIsBetter: true },
  { id: "avgTaskTimeSec",   label: "Tiempo/tarea (s)",    fmt: (v) => v.toFixed(0), higherIsBetter: false },
  { id: "avgTtftMs",        label: "TTFT prom. (ms)",     fmt: (v) => v.toFixed(0), higherIsBetter: false },
  { id: "pctTtftUnder1500", label: "% latencia <1.5s",    fmt: (v) => `${v.toFixed(0)}%`, higherIsBetter: true, axisMax: 100 },
];

const COLOR_A = "#4da6ff"; // Sonic (experimental)
const COLOR_B = "#b0b0c8"; // text (control)

function MetricCell({ metric, stats }: { metric: MetricDef; stats: Stats }) {
  const a = stats.A?.[metric.id];
  const b = stats.B?.[metric.id];
  const aHas = a && a.n > 0;
  const bHas = b && b.n > 0;

  // Chart geometry
  const W = 220;
  const H = 130;
  const padTop = 18;
  const padBottom = 26;
  const plotH = H - padTop - padBottom;
  const barW = 46;
  const xA = 54;
  const xB = 130;

  const dataMax = Math.max(
    aHas ? a!.mean + a!.sd : 0,
    bHas ? b!.mean + b!.sd : 0,
    0.0001,
  );
  const axisMax = metric.axisMax ?? dataMax * 1.15;
  const y = (v: number) => padTop + plotH * (1 - Math.min(v, axisMax) / axisMax);

  // Which condition is "better" on this metric (for the hint badge)
  let winner: "A" | "B" | null = null;
  if (aHas && bHas && a!.mean !== b!.mean) {
    const aBetter = metric.higherIsBetter ? a!.mean > b!.mean : a!.mean < b!.mean;
    winner = aBetter ? "A" : "B";
  }

  const bar = (cell: StatCell | undefined, x: number, color: string, has: boolean) => {
    if (!has || !cell) {
      return (
        <text x={x + barW / 2} y={padTop + plotH / 2} textAnchor="middle" fontSize="10" fill="#556">
          sin datos
        </text>
      );
    }
    const top = y(cell.mean);
    const baseY = padTop + plotH;
    const errTop = y(cell.mean + cell.sd);
    const errBot = y(Math.max(0, cell.mean - cell.sd));
    return (
      <g>
        <rect x={x} y={top} width={barW} height={Math.max(0, baseY - top)} rx="2" fill={color} opacity="0.85" />
        {/* error whisker (±SD) */}
        <line x1={x + barW / 2} y1={errTop} x2={x + barW / 2} y2={errBot} stroke="#fff" strokeWidth="1.5" opacity="0.7" />
        <line x1={x + barW / 2 - 6} y1={errTop} x2={x + barW / 2 + 6} y2={errTop} stroke="#fff" strokeWidth="1.5" opacity="0.7" />
        <line x1={x + barW / 2 - 6} y1={errBot} x2={x + barW / 2 + 6} y2={errBot} stroke="#fff" strokeWidth="1.5" opacity="0.7" />
        {/* mean value */}
        <text x={x + barW / 2} y={Math.max(errTop - 4, 10)} textAnchor="middle" fontSize="11" fontWeight="700" fill="#e8e8f4">
          {metric.fmt(cell.mean)}
        </text>
      </g>
    );
  };

  return (
    <div style={{ border: "1px solid #24244a", borderRadius: 10, padding: "8px 8px 4px", background: "#0d0d22" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "#cdd" }}>{metric.label}</span>
        <span style={{ fontSize: 10, color: "#667" }}>{metric.higherIsBetter ? "▲ mejor" : "▼ mejor"}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={metric.label}>
        {/* baseline */}
        <line x1={40} y1={padTop + plotH} x2={W - 8} y2={padTop + plotH} stroke="#2a2a4a" strokeWidth="1" />
        {bar(a, xA, COLOR_A, !!aHas)}
        {bar(b, xB, COLOR_B, !!bHas)}
        {/* condition labels + n */}
        <text x={xA + barW / 2} y={H - 12} textAnchor="middle" fontSize="11" fill={COLOR_A} fontWeight="700">A</text>
        <text x={xA + barW / 2} y={H - 2} textAnchor="middle" fontSize="9" fill="#778">n={aHas ? a!.n : 0}</text>
        <text x={xB + barW / 2} y={H - 12} textAnchor="middle" fontSize="11" fill={COLOR_B} fontWeight="700">B</text>
        <text x={xB + barW / 2} y={H - 2} textAnchor="middle" fontSize="9" fill="#778">n={bHas ? b!.n : 0}</text>
        {/* winner badge */}
        {winner && (
          <text x={W - 10} y={padTop + 2} textAnchor="end" fontSize="10" fontWeight="700" fill={winner === "A" ? COLOR_A : COLOR_B}>
            {winner === "A" ? "Sonic ↑" : "Texto ↑"}
          </text>
        )}
      </svg>
    </div>
  );
}

export default function ABStatsCharts({ stats }: { stats: Stats }) {
  const hasAny =
    Object.values(stats.A ?? {}).some((c) => c?.n > 0) ||
    Object.values(stats.B ?? {}).some((c) => c?.n > 0);

  return (
    <div className="rounded-xl mb-6" style={{ border: "1px solid #2a2a44", padding: 12, background: "#10102a" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#ffcc00" }}>
          Comparación A vs B — media ± DE
        </span>
        <span style={{ fontSize: 11, color: "#778" }}>
          <span style={{ color: COLOR_A }}>■</span> Sonic (A) &nbsp; <span style={{ color: COLOR_B }}>■</span> Texto (B) · excluye pilotos
        </span>
      </div>
      {!hasAny ? (
        <p style={{ color: "#667", fontSize: 13, padding: "12px 0" }}>
          Aún no hay datos de participantes reales para graficar (las sesiones piloto se excluyen).
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 10,
          }}
        >
          {METRICS.map((m) => (
            <MetricCell key={m.id} metric={m} stats={stats} />
          ))}
        </div>
      )}
    </div>
  );
}
