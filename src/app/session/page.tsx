"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Condition, ChatMessage, TaskResult } from "@/shared/types/session";
import { TASKS } from "@/shared/config/tasks";
import ChatInterface from "@/client/components/ChatInterface";
import CodePanel from "@/client/components/CodePanel";

// Ring sprite via CSS spritesheet (16 frames, row 0)
function RingSprite({ size = 22 }: { size?: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/sprites/ring.png)",
        backgroundSize: "1600% 100%",
        backgroundPositionY: "0%",
        imageRendering: "pixelated",
        flexShrink: 0,
        animation: "ringSheetSpin 0.6s steps(16) infinite",
      }}
    />
  );
}

// Ring collection display
function RingHUD({ rings }: { rings: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <RingSprite size={22} />
      <span className="text-yellow-300 font-bold font-mono text-sm ring-glow">
        {rings}
      </span>
    </div>
  );
}

// Eggman health indicator
function EggmanBar({ ringsCollected, maxRings = 20 }: { ringsCollected: number; maxRings?: number }) {
  const pct = Math.min(100, (ringsCollected / maxRings) * 100);
  const defeated = pct >= 100;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-mono" style={{ color: defeated ? "#ff0000" : "#ff6600" }}>
        🥚 Eggman
      </span>
      <div className="w-20 h-3 bg-gray-800 rounded-full border border-red-900 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${100 - pct}%`,
            background: defeated ? "#ff0000" : "linear-gradient(90deg, #ff6600, #cc0000)",
          }}
        />
      </div>
      {defeated && <span className="text-xs text-red-400 animate-bounce">💀</span>}
    </div>
  );
}

function SessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get("id") ?? `P-${Date.now().toString(36)}`;
  const condition = (searchParams.get("condition") ?? "B") as Condition;
  const taskId = searchParams.get("task") ?? "task-1-infinite-loop";

  const task = TASKS.find((t) => t.id === taskId) ?? TASKS[0];

  const [timeRemaining, setTimeRemaining] = useState(task.maxTimeSeconds);
  const [turnCount, setTurnCount] = useState(0);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [latencyReadings, setLatencyReadings] = useState<number[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [taskStartTime] = useState(Date.now());
  const [resolvedAutonomously, setResolvedAutonomously] = useState(false);
  const [ringsCollected, setRingsCollected] = useState(0);
  const [showRingAnimation, setShowRingAnimation] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setTaskCompleted(false);
    setShowSummary(false);
    setTimeRemaining(task.maxTimeSeconds);
    setTurnCount(0);
    setLatencyReadings([]);
    setResolvedAutonomously(false);
  }, [taskId, task.maxTimeSeconds]);

  useEffect(() => {
    if (taskCompleted) return;
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTaskComplete(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskCompleted]);

  const handleNewMessage = useCallback((message: ChatMessage, latencyMs: number) => {
    if (message.role === "assistant") {
      setTurnCount((prev) => prev + 1);
      setLatencyReadings((prev) => [...prev, latencyMs]);
      // Collect a ring on each assistant response
      setRingsCollected((prev) => prev + 1);
      setShowRingAnimation(true);
      setTimeout(() => setShowRingAnimation(false), 600);
    }
  }, []);

  const handleTaskComplete = useCallback(async (resolved: boolean) => {
    if (taskCompleted) return;
    setTaskCompleted(true);
    setResolvedAutonomously(resolved);
    if (timerRef.current) clearInterval(timerRef.current);

    if (resolved) {
      // Bonus rings on task completion
      setRingsCollected((prev) => prev + 10);
    }

    const timeSpent = Math.round((Date.now() - taskStartTime) / 1000);
    const result: TaskResult = {
      taskId: task.id,
      resolvedAutonomously: resolved,
      turns: turnCount,
      timeSpentSeconds: timeSpent,
      latencyReadings,
    };

    try {
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "log-task", sessionId, taskResult: result }),
      });
    } catch (err) {
      console.error("Failed to log task result:", err);
    }

    setShowSummary(true);
  }, [taskCompleted, taskStartTime, turnCount, latencyReadings, task.id, sessionId]);

  const avgLatency =
    latencyReadings.length > 0
      ? Math.round(latencyReadings.reduce((a, b) => a + b, 0) / latencyReadings.length)
      : 0;

  const latencyOk = latencyReadings.filter((l) => l < 1500).length;
  const latencyFail = latencyReadings.filter((l) => l >= 1500).length;

  // Format time as MM:SS
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;
  const timeStr = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const timeWarning = timeRemaining < 120;
  const timeCritical = timeRemaining < 60;

  const handleContinue = () => {
    if (taskId === "task-1-infinite-loop") {
      router.push(`/session?id=${sessionId}&condition=${condition}&task=task-2-algorithm-complexity`);
    } else {
      router.push(`/session/complete?id=${sessionId}&condition=${condition}`);
    }
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: "#0a0a1a" }}>

      {/* ── Game HUD Top Bar ────────────────────────────────────── */}
      <nav
        className="h-12 flex items-center px-4 gap-4 flex-shrink-0 border-b"
        style={{
          background: "linear-gradient(90deg, #0d1b2a, #001a33)",
          borderColor: "#ffcc00",
          borderBottomWidth: "2px",
        }}
      >
        {/* Sonic branding */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-yellow-300 font-mono text-sm" style={{ textShadow: "0 0 10px rgba(255,204,0,0.5)" }}>
            [SONIC] CODE
          </span>
        </div>

        <div className="h-6 w-px bg-white/20" />

        {/* Ring counter */}
        <div className="relative">
          <RingHUD rings={ringsCollected} />
          {showRingAnimation && (
            <div
              className="absolute -top-6 left-0 text-yellow-300 font-bold text-sm animate-float-up pointer-events-none"
            >
              +1 💍
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-white/20" />

        {/* Eggman health */}
        <EggmanBar ringsCollected={ringsCollected} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Task info */}
        <span className="text-white/40 text-xs font-mono hidden md:block">
          {task.title}
        </span>

        <div className="h-6 w-px bg-white/20" />

        {/* Turns */}
        <div className="flex items-center gap-1 text-xs font-mono text-white/60">
          <span>💬</span>
          <span>{turnCount}</span>
        </div>

        {/* Timer */}
        <div
          className="flex items-center gap-1 px-3 py-1 rounded-lg font-mono font-bold text-sm"
          style={{
            background: timeCritical ? "rgba(200,0,0,0.3)" : timeWarning ? "rgba(200,150,0,0.3)" : "rgba(0,50,100,0.5)",
            border: `1px solid ${timeCritical ? "#ff4444" : timeWarning ? "#ffaa00" : "#4da6ff"}`,
            color: timeCritical ? "#ff6666" : timeWarning ? "#ffcc00" : "#88ccff",
          }}
        >
          ⏱️ {timeStr}
        </div>

        {/* Session ID */}
        <span className="text-white/20 text-xs font-mono hidden lg:block">
          {sessionId.slice(0, 8)}
        </span>
      </nav>

      {/* ── Main split layout ───────────────────────────────────── */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Code panel */}
        <div
          className="w-[45%] border-r flex-shrink-0"
          style={{ borderColor: "#1a2a3a" }}
        >
          <CodePanel
            task={task}
            timeRemainingSeconds={timeRemaining}
            turnCount={turnCount}
            onTaskComplete={handleTaskComplete}
          />
        </div>

        {/* Right: Chat interface */}
        <div className="flex-1 min-w-0">
          <ChatInterface
            condition={condition}
            sessionId={sessionId}
            taskContext={{
              taskId: task.id,
              buggyCode: task.buggyCode,
              errorDescription: task.errorDescription,
            }}
            onNewMessage={handleNewMessage}
            ringsCollected={ringsCollected}
          />
        </div>
      </div>

      {/* ── Task completion modal ────────────────────────────────── */}
      {showSummary && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div
            className="rounded-2xl p-6 max-w-md w-full animate-bounce-in"
            style={{
              background: "linear-gradient(135deg, #0d1b2a, #001a33)",
              border: `3px solid ${resolvedAutonomously ? "#ffcc00" : "#4488aa"}`,
              boxShadow: resolvedAutonomously ? "0 0 40px rgba(255,204,0,0.3)" : "none",
            }}
          >
            <div className="text-center mb-6">
              <div className="text-5xl mb-3 animate-bounce">
                {resolvedAutonomously ? "🏆" : "⏱️"}
              </div>
              <h2
                className="font-bold text-2xl mb-1"
                style={{ color: resolvedAutonomously ? "#ffcc00" : "#88aacc", fontFamily: "'Courier New', monospace" }}
              >
                {resolvedAutonomously ? "¡ANILLO OBTENIDO!" : "TIEMPO AGOTADO"}
              </h2>
              <p className="text-white/50 text-sm">
                {resolvedAutonomously
                  ? `¡Encontraste el error! +10 anillos 🔔 (Total: ${ringsCollected})`
                  : "El Dr. Eggman escapó esta vez... ¡pero habrá revancha!"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: "Anillos 💍", value: ringsCollected, color: "#ffcc00" },
                { label: "Turnos 💬", value: turnCount, color: "#4da6ff" },
                { label: "Tiempo ⏱️", value: `${Math.round((Date.now() - taskStartTime) / 1000)}s`, color: "#88ccff" },
                { label: "Latencia avg", value: `${avgLatency}ms`, color: avgLatency < 1500 ? "#4caf50" : "#f44336" },
              ].map((m) => (
                <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div className="text-xl font-bold font-mono" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-white/40 text-xs mt-1">{m.label}</div>
                </div>
              ))}
            </div>

            {latencyReadings.length > 0 && (
              <div className="rounded-xl p-3 mb-4 text-xs" style={{ background: "rgba(255,204,0,0.1)", border: "1px solid rgba(255,204,0,0.3)" }}>
                <p className="text-yellow-300 font-mono font-bold mb-1">⚡ RQ4: Análisis de Latencia</p>
                <p className="text-white/60">✓ &lt;1.5s: {latencyOk}/{latencyReadings.length} ({Math.round((latencyOk / latencyReadings.length) * 100)}%)</p>
                <p className="text-white/60">✗ ≥1.5s: {latencyFail}/{latencyReadings.length}</p>
                <p className="text-white/60">Max: {Math.max(...latencyReadings)}ms | Min: {Math.min(...latencyReadings)}ms</p>
              </div>
            )}

            <button
              onClick={handleContinue}
              className="w-full py-3 font-bold text-lg text-black rounded-xl transition-all"
              style={{
                background: "linear-gradient(90deg, #ffcc00, #ff8c00)",
                boxShadow: "0 4px 0 #cc6600",
                fontFamily: "'Courier New', monospace",
              }}
            >
              {taskId === "task-1-infinite-loop" ? "SIGUIENTE NIVEL →" : "VER RESULTADO FINAL →"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center font-mono text-yellow-300" style={{ background: "#0a0a1a" }}>
        <div className="text-center">
          <div className="text-4xl mb-4 animate-bounce font-bold">SONIC</div>
          <div>CARGANDO ZONA...</div>
        </div>
      </div>
    }>
      <SessionContent />
    </Suspense>
  );
}
