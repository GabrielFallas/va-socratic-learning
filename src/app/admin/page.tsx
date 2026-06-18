"use client";

import { useEffect, useState } from "react";
import ABStatsCharts from "@/client/components/ABStatsCharts";

interface Row {
  sessionId: string;
  condition: "A" | "B";
  isPilot: boolean;
  startTime: number;
  endTime: number | null;
  turns: number;
  tasksResolved: number;
  tasksTotal: number;
  avgTtftMs: number;
  questionnaires: number;
}

interface StatCell { mean: number; sd: number; n: number; }
type Stats = Record<"A" | "B", Record<string, StatCell>>;

// Metric id → human label + formatter (matches STAT_METRICS in export.ts)
const STAT_ROWS: { id: string; label: string; fmt: (v: number) => string }[] = [
  { id: "resolutionRate",  label: "Tasa de resolución",     fmt: (v) => `${Math.round(v * 100)}%` },
  { id: "turns",           label: "Turnos",                 fmt: (v) => v.toFixed(1) },
  { id: "avgTaskTimeSec",  label: "Tiempo/tarea (s)",       fmt: (v) => v.toFixed(0) },
  { id: "avgTtftMs",       label: "TTFT prom. (ms)",        fmt: (v) => v.toFixed(0) },
  { id: "pctTtftUnder1500",label: "% latencia <1.5s",       fmt: (v) => `${v.toFixed(0)}%` },
  { id: "avgThinkTimeMs",  label: "Think-time (ms)",        fmt: (v) => v.toFixed(0) },
  { id: "sus",             label: "SUS (0-100)",            fmt: (v) => v.toFixed(1) },
  { id: "nasaTlx",         label: "NASA-TLX (RTLX)",        fmt: (v) => v.toFixed(1) },
  { id: "pedSupport",      label: "Apoyo pedagóg. (1-5)",   fmt: (v) => v.toFixed(2) },
  { id: "godspeed",        label: "Godspeed (overall)",     fmt: (v) => v.toFixed(2) },
  { id: "panasPositive",   label: "PANAS afecto +",         fmt: (v) => v.toFixed(1) },
  { id: "panasNegative",   label: "PANAS afecto −",         fmt: (v) => v.toFixed(1) },
];

export default function AdminPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const [listRes, statsRes] = await Promise.all([
        fetch("/api/session?list=1"),
        fetch("/api/session?stats=1"),
      ]);
      const listData = await listRes.json();
      const statsData = await statsRes.json();
      setRows(listData.sessions ?? []);
      setStats(statsData.stats ?? null);
    } catch {
      setError("No se pudieron cargar las sesiones.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cell = (c?: StatCell) =>
    c && c.n > 0 ? c : null;

  const fmt = (ts: number | null) =>
    ts ? new Date(ts).toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" }) : "—";

  // Balance counts REAL participants only (pilots force a condition and would skew it).
  const real = rows?.filter((r) => !r.isPilot) ?? [];
  const pilotCount = rows?.filter((r) => r.isPilot).length ?? 0;
  const countA = real.filter((r) => r.condition === "A").length;
  const countB = real.filter((r) => r.condition === "B").length;

  return (
    <main className="min-h-screen p-6 font-mono" style={{ background: "#0a0a1a", color: "#e6e6e6" }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h1 className="text-2xl font-black" style={{ color: "#ffcc00" }}>
            Panel del Facilitador
          </h1>
          <div className="flex gap-2">
            <a
              href="/api/export?format=csv"
              className="px-4 py-2 rounded-lg text-sm font-bold text-black"
              style={{ background: "linear-gradient(90deg,#ffcc00,#ff8c00)" }}
            >
              ⬇ Exportar CSV
            </a>
            <a
              href="/api/export?format=json"
              className="px-4 py-2 rounded-lg text-sm font-bold"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid #444466" }}
            >
              ⬇ Exportar JSON
            </a>
            <a
              href="/api/export?format=transcripts"
              className="px-4 py-2 rounded-lg text-sm font-bold"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid #444466" }}
              title="Conversaciones (JSONL) para codificación cualitativa"
            >
              ⬇ Transcripciones
            </a>
            <button
              onClick={load}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid #444466" }}
            >
              ↻ Recargar
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-4 text-sm flex-wrap" style={{ color: "#88aacc" }}>
          <span>Total: {rows?.length ?? 0}</span>
          <span>Reales: {real.length}</span>
          <span style={{ color: "#778" }}>Piloto: {pilotCount}</span>
          <span>Cond. A: {countA}</span>
          <span>Cond. B: {countB}</span>
          <span style={{ color: Math.abs(countA - countB) > 1 ? "#ff8800" : "#4caf50" }}>
            Balance Δ: {Math.abs(countA - countB)}
          </span>
          <span style={{ color: "#556" }}>(balance y stats excluyen pilotos)</span>
        </div>

        {error && <p style={{ color: "#ff6666" }}>{error}</p>}

        {/* ── Visual A-vs-B comparison charts ─────────────────────────── */}
        {stats && <ABStatsCharts stats={stats} />}

        {/* ── Descriptive stats by condition (A vs B) ─────────────────── */}
        {stats && (
          <div className="rounded-xl overflow-auto mb-6" style={{ border: "1px solid #2a2a44" }}>
            <div className="px-3 py-2 text-sm font-bold" style={{ background: "#12122a", color: "#ffcc00" }}>
              Estadística descriptiva por condición — media (DE), n
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#0f0f24", color: "#88aacc" }}>
                  <th className="text-left px-3 py-2 font-bold">Métrica</th>
                  <th className="text-left px-3 py-2 font-bold">Condición A (Sonic)</th>
                  <th className="text-left px-3 py-2 font-bold">Condición B (texto)</th>
                </tr>
              </thead>
              <tbody>
                {STAT_ROWS.map((m) => {
                  const a = cell(stats.A?.[m.id]);
                  const b = cell(stats.B?.[m.id]);
                  return (
                    <tr key={m.id} style={{ borderTop: "1px solid #1e1e3a" }}>
                      <td className="px-3 py-2 whitespace-nowrap" style={{ color: "#aab" }}>{m.label}</td>
                      <td className="px-3 py-2 font-mono" style={{ color: "#9ec5ff" }}>
                        {a ? `${m.fmt(a.mean)} (±${m.fmt(a.sd)}) · n=${a.n}` : "—"}
                      </td>
                      <td className="px-3 py-2 font-mono" style={{ color: "#ccd" }}>
                        {b ? `${m.fmt(b.mean)} (±${m.fmt(b.sd)}) · n=${b.n}` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-xl overflow-auto" style={{ border: "1px solid #2a2a44" }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#12122a", color: "#88aacc" }}>
                {["Participante", "Cond.", "Inicio", "Fin", "Turnos", "Resueltas", "TTFT prom.", "Cuestion.", ""].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-bold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(rows ?? []).map((r) => (
                <tr key={r.sessionId} style={{ borderTop: "1px solid #1e1e3a", opacity: r.isPilot ? 0.5 : 1 }}>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {r.sessionId}
                    {r.isPilot && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[10px]" style={{ background: "#333", color: "#aaa" }}>
                        piloto
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className="px-2 py-0.5 rounded text-xs font-bold"
                      style={{ background: r.condition === "A" ? "#0a4a8a" : "#333355" }}
                    >
                      {r.condition}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(r.startTime)}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{fmt(r.endTime)}</td>
                  <td className="px-3 py-2">{r.turns}</td>
                  <td className="px-3 py-2">{r.tasksResolved}/{r.tasksTotal}</td>
                  <td className="px-3 py-2" style={{ color: r.avgTtftMs < 1500 ? "#4caf50" : "#ff8800" }}>
                    {r.avgTtftMs}ms
                  </td>
                  <td className="px-3 py-2">{r.questionnaires}</td>
                  <td className="px-3 py-2">
                    <a href={`/api/session?sessionId=${r.sessionId}`} target="_blank" rel="noreferrer" style={{ color: "#4da6ff" }}>
                      ver
                    </a>
                  </td>
                </tr>
              ))}
              {rows && rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center" style={{ color: "#666688" }}>
                    No hay sesiones registradas todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="text-xs mt-3" style={{ color: "#555577" }}>
          Datos en <code>data/sonic.db</code> (SQLite local — ábralo con DB Browser for SQLite para consultas SQL). El CSV trae una fila por participante con métricas y puntajes de cuestionarios; el JSON trae la sesión completa.
        </p>
      </div>
    </main>
  );
}
