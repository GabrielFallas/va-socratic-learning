"use client";

import { useEffect, useState } from "react";

interface Row {
  sessionId: string;
  condition: "A" | "B";
  startTime: number;
  endTime: number | null;
  turns: number;
  tasksResolved: number;
  tasksTotal: number;
  avgTtftMs: number;
  questionnaires: number;
}

export default function AdminPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await fetch("/api/session?list=1");
      const data = await res.json();
      setRows(data.sessions ?? []);
    } catch {
      setError("No se pudieron cargar las sesiones.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  const fmt = (ts: number | null) =>
    ts ? new Date(ts).toLocaleString("es-CR", { dateStyle: "short", timeStyle: "short" }) : "—";

  const countA = rows?.filter((r) => r.condition === "A").length ?? 0;
  const countB = rows?.filter((r) => r.condition === "B").length ?? 0;

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
            <button
              onClick={load}
              className="px-4 py-2 rounded-lg text-sm"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid #444466" }}
            >
              ↻ Recargar
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-4 text-sm" style={{ color: "#88aacc" }}>
          <span>Total: {rows?.length ?? 0}</span>
          <span>Condición A: {countA}</span>
          <span>Condición B: {countB}</span>
          <span style={{ color: Math.abs(countA - countB) > 1 ? "#ff8800" : "#4caf50" }}>
            Balance Δ: {Math.abs(countA - countB)}
          </span>
        </div>

        {error && <p style={{ color: "#ff6666" }}>{error}</p>}

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
                <tr key={r.sessionId} style={{ borderTop: "1px solid #1e1e3a" }}>
                  <td className="px-3 py-2 whitespace-nowrap">{r.sessionId}</td>
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
          Datos en <code>data/sessions/</code> (servidor local). El CSV trae una fila por participante con métricas y puntajes de cuestionarios; el JSON trae la sesión completa.
        </p>
      </div>
    </main>
  );
}
