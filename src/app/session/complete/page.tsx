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

// ── Rank calculation (Sonic Runner style) ─────────────────────────
function calcRank(summary: SessionSummary): { letter: string; color: string; label: string } {
  const total    = summary.latencyUnder1500ms + summary.latencyOver1500ms;
  const pct      = total > 0 ? (summary.latencyUnder1500ms / total) * 100 : 0;
  const resolved = summary.taskResults.filter((t) => t.resolvedAutonomously).length;
  const avgMs    = summary.avgLatencyMs;

  // Score: latency compliance + resolution bonus
  let score = pct;
  if (resolved >= 2) score += 30;
  else if (resolved === 1) score += 15;
  if (avgMs < 800) score += 10;

  if (score >= 120) return { letter: "S",  color: "#ffcc00", label: "¡SONIC SPEED!" };
  if (score >= 100) return { letter: "A",  color: "#4caf50", label: "¡Excelente!" };
  if (score >= 80)  return { letter: "B",  color: "#4da6ff", label: "Muy bien" };
  if (score >= 60)  return { letter: "C",  color: "#ff8c00", label: "Bien" };
  if (score >= 40)  return { letter: "D",  color: "#ff6600", label: "Regular" };
  if (score >= 20)  return { letter: "E",  color: "#cc4444", label: "Intenta de nuevo" };
  return             { letter: "F",  color: "#aa0000", label: "Game Over..." };
}

// Ring sprite
function RingSprite({ size = 28 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/sprites/ring.png)",
        backgroundSize: "1600% 100%",
        imageRendering: "pixelated",
        animation: "ringSheetSpin 0.6s steps(16) infinite",
        display: "inline-block",
      }}
    />
  );
}

function CompleteContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const sessionId    = searchParams.get("id") ?? "";
  const condition    = searchParams.get("condition") ?? "B";

  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [showRank, setShowRank]   = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res  = await fetch(`/api/session?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.summary) {
          setSummary(data.summary);
          setTimeout(() => setShowRank(true), 800);
        }
      } catch { /* ignore */ }
    };
    if (sessionId) fetchSummary();
  }, [sessionId]);

  const latencyColor = (ms: number) =>
    ms < 800 ? "#4caf50" : ms < 1500 ? "#ffcc00" : "#f44336";

  const rank = summary ? calcRank(summary) : null;

  // Ring keyframe
  const ringKF = `
    @keyframes ringSheetSpin {
      from { background-position-x: 0%; }
      to   { background-position-x: 100%; }
    }
    @keyframes rankPop {
      0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
      60%  { transform: scale(1.3) rotate(5deg);  opacity: 1; }
      100% { transform: scale(1) rotate(0deg);  opacity: 1; }
    }
    @keyframes confettiRain {
      0%   { transform: translateY(-20px) rotate(0deg); opacity: 0; }
      10%  { opacity: 1; }
      100% { transform: translateY(300px) rotate(720deg); opacity: 0; }
    }
  `;

  return (
    <main
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "linear-gradient(180deg, #000a1a 0%, #001a33 50%, #000a1a 100%)",
      }}
    >
      <style>{ringKF}</style>

      <div className="max-w-lg w-full">

        {/* ── Title ──────────────────────────────────────────────── */}
        <div className="text-center mb-6">
          {/* Scrolling background strip */}
          <div
            className="w-full h-12 mb-4 rounded-xl overflow-hidden relative"
            style={{ border: "2px solid #ffcc00" }}
          >
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "url(/sprites/chemical-bg.png)",
                backgroundRepeat: "repeat-x",
                backgroundSize: "auto 100%",
                imageRendering: "pixelated",
                animation: "bgScroll 3s linear infinite",
                opacity: 0.6,
              }}
            />
            <style>{`@keyframes bgScroll { from{background-position-x:0} to{background-position-x:-480px} }`}</style>
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="font-black text-xl tracking-widest"
                style={{
                  fontFamily: "'Courier New', monospace",
                  color: "#ffcc00",
                  textShadow: "2px 2px 0 #cc6600",
                }}
              >
                RESULTS
              </span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <RingSprite size={32} />
            <h1
              className="text-4xl font-black"
              style={{
                color: "#ffcc00",
                fontFamily: "'Courier New', monospace",
                textShadow: "3px 3px 0 #cc6600",
              }}
            >
              SESIÓN COMPLETADA
            </h1>
            <RingSprite size={32} />
          </div>
          <p className="text-white/40 text-sm font-mono">
            Condición {condition} · {sessionId}
          </p>
        </div>

        {summary && rank ? (
          <div className="space-y-4">

            {/* ── RANK BOX ───────────────────────────────────────── */}
            <div
              className="rounded-2xl p-6 text-center relative overflow-hidden"
              style={{
                background: `linear-gradient(135deg, #001a33, #002244)`,
                border: `3px solid ${rank.color}`,
                boxShadow: `0 0 40px ${rank.color}44`,
              }}
            >
              {/* Confetti rings */}
              {rank.letter === "S" && [0,1,2,3,4].map(i => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    left: `${15 + i * 18}%`,
                    top: "-10px",
                    animation: `confettiRain ${1.2 + i * 0.3}s ${i * 0.2}s linear infinite`,
                  }}
                >
                  <RingSprite size={18} />
                </div>
              ))}

              <div className="text-sm font-mono text-white/40 mb-2">RANK</div>
              <div
                className="text-8xl font-black mb-2"
                style={{
                  color: rank.color,
                  fontFamily: "'Courier New', monospace",
                  textShadow: `4px 4px 0 ${rank.color}88`,
                  animation: showRank ? "rankPop 0.6s ease-out forwards" : "none",
                }}
              >
                {rank.letter}
              </div>
              <div className="text-lg font-bold font-mono" style={{ color: rank.color }}>
                {rank.label}
              </div>
            </div>

            {/* ── Global metrics ──────────────────────────────────── */}
            <div
              className="rounded-2xl p-5"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <h3 className="text-white font-bold mb-4 font-mono text-sm flex items-center gap-2">
                <RingSprite size={16} /> Métricas de Sesión
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white font-mono">{summary.totalTurns}</div>
                  <div className="text-white/40 text-xs">Turnos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono" style={{ color: latencyColor(summary.avgLatencyMs) }}>
                    {summary.avgLatencyMs}ms
                  </div>
                  <div className="text-white/40 text-xs">Latencia avg</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold font-mono" style={{ color: latencyColor(summary.maxLatencyMs) }}>
                    {summary.maxLatencyMs}ms
                  </div>
                  <div className="text-white/40 text-xs">Latencia max</div>
                </div>
              </div>
            </div>
            
            {/* ── Task results ─────────────────────────────────────── */}
            {summary.taskResults.map((result, i) => (
              <div
                key={i}
                className="rounded-2xl p-5"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${result.resolvedAutonomously ? "rgba(76,175,80,0.4)" : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <h3 className="text-white font-bold mb-3 font-mono text-sm flex items-center gap-2">
                  {result.resolvedAutonomously ? "🏆" : "📋"} Tarea {i + 1}:{" "}
                  {result.taskId.includes("loop") ? "Bucle Infinito" : "Complejidad Algoritmo"}
                </h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="text-center rounded-lg p-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="font-bold font-mono" style={{ color: result.resolvedAutonomously ? "#4caf50" : "#f44336" }}>
                      {result.resolvedAutonomously ? "✓" : "✗"}
                    </div>
                    <div className="text-white/40 text-xs">Autónomo</div>
                  </div>
                  <div className="text-center rounded-lg p-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="font-bold text-white font-mono">{result.turns}</div>
                    <div className="text-white/40 text-xs">Turnos</div>
                  </div>
                  <div className="text-center rounded-lg p-2" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <div className="font-bold text-white font-mono">{result.timeSpentSeconds}s</div>
                    <div className="text-white/40 text-xs">Tiempo</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-white/40 font-mono py-12 animate-pulse">
            CARGANDO RESULTADOS...
          </div>
        )}

        <button
          onClick={() => router.push("/")}
          className="mt-6 w-full py-3 font-bold text-black rounded-xl transition-all font-mono"
          style={{
            background: "linear-gradient(90deg, #ffcc00, #ff8c00)",
            boxShadow: "0 4px 0 #cc6600",
          }}
        >
          ← NUEVA SESIÓN
        </button>
      </div>
    </main>
  );
}

export default function CompletePage() {
  return (
    <Suspense
      fallback={
        <div
          className="h-screen flex items-center justify-center font-mono text-yellow-300"
          style={{ background: "#000a1a" }}
        >
          CARGANDO...
        </div>
      }
    >
      <CompleteContent />
    </Suspense>
  );
}
