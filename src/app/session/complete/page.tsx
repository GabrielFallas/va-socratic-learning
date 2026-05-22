"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface SessionSummary {
  sessionId: string;
  condition: string;
  totalMessages: number;
  totalTurns: number;
  avgLatencyMs: number;
  maxLatencyMs: number;
  latencyUnder1500ms: number;
  latencyOver1500ms: number;
  taskResults: Array<{
    taskId: string;
    resolvedAutonomously: boolean;
    turns: number;
    timeSpentSeconds: number;
    latencyReadings: number[];
  }>;
}

function CompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("id") ?? "";
  const condition = searchParams.get("condition") ?? "B";

  const [summary, setSummary] = useState<SessionSummary | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await fetch(`/api/session?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.summary) setSummary(data.summary);
      } catch {
        // ignore
      }
    };
    if (sessionId) fetchSummary();
  }, [sessionId]);

  const latencyColor = (ms: number) =>
    ms < 800
      ? "text-green-400"
      : ms < 1500
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 to-purple-950/20 p-4 flex items-center justify-center">
      <div className="max-w-xl w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🧠</div>
          <h1 className="text-3xl font-black text-white mb-2">
            Sesión Completada
          </h1>
          <p className="text-white/50 text-sm font-mono">
            Condición {condition} · Sesión {sessionId}
          </p>
        </div>

        {summary ? (
          <div className="space-y-4">
            {/* Global metrics */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-4 font-mono text-sm">
                📊 Métricas de Sesión
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white">
                    {summary.totalTurns}
                  </div>
                  <div className="text-white/40 text-xs">Turnos totales</div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${latencyColor(
                      summary.avgLatencyMs
                    )}`}
                  >
                    {summary.avgLatencyMs}ms
                  </div>
                  <div className="text-white/40 text-xs">Latencia avg</div>
                </div>
                <div className="text-center">
                  <div
                    className={`text-2xl font-bold ${latencyColor(
                      summary.maxLatencyMs
                    )}`}
                  >
                    {summary.maxLatencyMs}ms
                  </div>
                  <div className="text-white/40 text-xs">Latencia max</div>
                </div>
              </div>
            </div>

            {/* RQ4 Analysis */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
              <h3 className="text-white font-bold mb-3 font-mono text-sm">
                ⚡ RQ4: Análisis de Latencia (&lt;1.5s objetivo)
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Respuestas bajo 1.5s</span>
                  <span className="text-green-400 font-mono">
                    {summary.latencyUnder1500ms}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">
                    Respuestas sobre 1.5s
                  </span>
                  <span
                    className={`font-mono ${
                      summary.latencyOver1500ms > 0
                        ? "text-red-400"
                        : "text-green-400"
                    }`}
                  >
                    {summary.latencyOver1500ms}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/60">Cumplimiento RQ4</span>
                  <span
                    className={`font-mono font-bold ${
                      summary.latencyOver1500ms === 0
                        ? "text-green-400"
                        : "text-yellow-400"
                    }`}
                  >
                    {summary.latencyUnder1500ms + summary.latencyOver1500ms > 0
                      ? Math.round(
                          (summary.latencyUnder1500ms /
                            (summary.latencyUnder1500ms +
                              summary.latencyOver1500ms)) *
                            100
                        ) + "%"
                      : "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Task results */}
            {summary.taskResults.map((result, i) => (
              <div
                key={i}
                className="bg-white/5 border border-white/10 rounded-2xl p-5"
              >
                <h3 className="text-white font-bold mb-3 font-mono text-sm">
                  📋 Tarea {i + 1}:{" "}
                  {result.taskId.includes("loop") ? "Bucle infinito" : "Algoritmo"}
                </h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center bg-white/5 rounded-lg p-2">
                    <div
                      className={`font-bold ${
                        result.resolvedAutonomously
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {result.resolvedAutonomously ? "✓ Resuelto" : "✗ N/A"}
                    </div>
                    <div className="text-white/40 text-xs">Autónomo</div>
                  </div>
                  <div className="text-center bg-white/5 rounded-lg p-2">
                    <div className="font-bold text-white">{result.turns}</div>
                    <div className="text-white/40 text-xs">Turnos</div>
                  </div>
                  <div className="text-center bg-white/5 rounded-lg p-2">
                    <div className="font-bold text-white">
                      {result.timeSpentSeconds}s
                    </div>
                    <div className="text-white/40 text-xs">Tiempo</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-white/40 font-mono">
            Cargando resumen...
          </div>
        )}

        {/* Questionnaires reminder */}
        <div className="mt-6 bg-blue-950/40 border border-blue-500/20 rounded-2xl p-4">
          <h3 className="text-blue-300 font-bold text-sm mb-2">
            📝 Próximos Pasos (Protocolo)
          </h3>
          <ol className="text-white/60 text-xs space-y-1 list-decimal list-inside">
            <li>PANAS-SF (POST)</li>
            <li>Godspeed Questionnaire</li>
            <li>SUS — System Usability Scale</li>
            <li>NASA-TLX</li>
            <li>SIMS</li>
          </ol>
        </div>

        <button
          onClick={() => router.push("/")}
          className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl
            transition-all font-mono text-sm border border-white/10"
        >
          ← Nueva Sesión
        </button>
      </div>
    </main>
  );
}

export default function CompletePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen flex items-center justify-center bg-gray-950 text-white">
          Cargando...
        </div>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
