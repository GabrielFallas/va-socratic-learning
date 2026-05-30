"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import type { Condition, ChatMessage, TaskResult } from "@/shared/types/session";
import { TASKS } from "@/shared/config/tasks";
import ChatInterface from "@/client/components/ChatInterface";
import CodePanel, { type TaskCompleteMeta } from "@/client/components/CodePanel";
import { zoneForTask } from "@/shared/config/zones";

// Condition A is now a playable Open Sonic level (needs browser APIs).
const GameSession = dynamic(() => import("@/client/game/GameSession"), { ssr: false });

// Dynamic imports — game components need browser APIs
const ZoneTitleCard = dynamic(() => import("@/client/components/ZoneTitleCard"), { ssr: false });
const TaskTransitionGame = dynamic(() => import("@/client/components/TaskTransitionGame"), { ssr: false });

// ── Ring sprite (CSS spritesheet) ────────────────────────────────
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

// ── Zone name map ────────────────────────────────────────────────
const ZONE_NAMES: Record<string, { name: string; act: number }> = {
  "task-1-infinite-loop":        { name: "BUCLE INFINITO",            act: 1 },
  "task-2-algorithm-complexity": { name: "OPTIMIZACIÓN ALGORÍTMICA",  act: 2 },
};

// ─────────────────────────────────────────────────────────────────
function SessionContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const rawId        = searchParams.get("id");
  const rawCondition = searchParams.get("condition");
  const taskId       = searchParams.get("task") ?? "task-1-infinite-loop";

  // Validate params. A session MUST arrive with a real participant id and a
  // valid condition (assigned on the landing page). Previously a missing id
  // was silently replaced by a fabricated one, producing telemetry that no
  // /api/session record existed for (orphaned data). Now we redirect home.
  const paramsValid = !!rawId && /^P-/.test(rawId) && (rawCondition === "A" || rawCondition === "B");
  const sessionId = rawId ?? "";
  const condition = (rawCondition === "A" ? "A" : "B") as Condition;

  useEffect(() => {
    if (!paramsValid) router.replace("/");
  }, [paramsValid, router]);

  const task = TASKS.find((t) => t.id === taskId) ?? TASKS[0];
  const zone = ZONE_NAMES[taskId] ?? { name: task.title.toUpperCase(), act: 1 };

  // ── Core state ───────────────────────────────────────────────
  const [timeRemaining,       setTimeRemaining]       = useState(task.maxTimeSeconds);
  const [turnCount,           setTurnCount]           = useState(0);
  const [taskCompleted,       setTaskCompleted]       = useState(false);
  const [latencyReadings,     setLatencyReadings]     = useState<number[]>([]);
  const [showSummary,         setShowSummary]         = useState(false);
  const [taskStartTime]                               = useState(Date.now());
  const [resolvedAutonomously, setResolvedAutonomously] = useState(false);
  const [ringsCollected,      setRingsCollected]      = useState(0);

  // ── Zone title ───────────────────────────────────────────────
  const [showZoneTitle,  setShowZoneTitle]  = useState(condition === "A");

  // ── Transition game ──────────────────────────────────────────
  const [showTransition, setShowTransition] = useState(false);

  const turnCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset on task change
  useEffect(() => {
    setTaskCompleted(false);
    setShowSummary(false);
    setTimeRemaining(task.maxTimeSeconds);
    setTurnCount(0);
    setLatencyReadings([]);
    setResolvedAutonomously(false);
    if (condition === "A") setShowZoneTitle(true);
  }, [taskId, task.maxTimeSeconds, condition]);

  // Countdown timer
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

  // ── New message handler — turn count + latency (TTFT) telemetry ──
  const handleNewMessage = useCallback((message: ChatMessage, latencyMs: number) => {
    if (message.role !== "assistant") return;
    setTurnCount((prev) => {
      turnCountRef.current = prev + 1;
      return prev + 1;
    });
    setLatencyReadings((prev) => [...prev, latencyMs]);
  }, []);

  // ── Task complete handler ────────────────────────────────────
  // `meta` is supplied by CodePanel (test-driven). When absent (timer expiry),
  // the task is recorded as a timeout.
  const handleTaskComplete = useCallback(async (resolved: boolean, meta?: TaskCompleteMeta) => {
    if (taskCompleted) return;
    setTaskCompleted(true);
    setResolvedAutonomously(resolved);
    if (timerRef.current) clearInterval(timerRef.current);

    if (resolved) {
      setRingsCollected((prev) => prev + 10);
      // HyperRing SFX
      try {
        const { playSFX } = await import("@/client/audio/sfx");
        playSFX("hyperRing", 0.85);
        setTimeout(() => playSFX("ring", 0.6), 300);
      } catch { /**/ }
    }

    const timeSpent = Math.round((Date.now() - taskStartTime) / 1000);
    const result: TaskResult = {
      taskId: task.id,
      resolvedAutonomously: resolved,
      turns: turnCountRef.current,
      timeSpentSeconds: timeSpent,
      latencyReadings,
      resolution: meta?.resolution ?? (resolved ? "tests-passed" : "timeout"),
      codeRunAttempts: meta?.runAttempts ?? 0,
      testsPassed: meta?.testsPassed ?? resolved,
      codeEdited: meta?.codeEdited ?? false,
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
  }, [taskCompleted, taskStartTime, latencyReadings, task.id, sessionId]);

  // ── Navigation ────────────────────────────────────────────────
  const handleContinue = () => {
    if (taskId === "task-1-infinite-loop") {
      setShowSummary(false);
      if (condition === "A") {
        // Game mode: skip the Kaplay mini-transition; the next zone loads in
        // the engine itself.
        setTaskCompleted(false);
        router.push(`/session?id=${sessionId}&condition=${condition}&task=task-2-algorithm-complexity`);
      } else {
        setShowTransition(true);
      }
    } else {
      // Close session before navigating to results — finalises endTime + latency stats
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close", sessionId }),
      }).catch((err) => console.error("[session] Failed to close session:", err));
      // Post-task questionnaire battery BEFORE the results screen (so seeing the
      // rank/score doesn't bias affect/motivation answers).
      router.push(`/post?id=${sessionId}&condition=${condition}`);
    }
  };

  const handleTransitionComplete = () => {
    // IMPORTANT: reset before navigating — same SessionContent instance stays mounted
    // after a soft-navigation to the same page, so showTransition must be cleared or
    // the early-return re-renders TaskTransitionGame for task-2 too.
    //
    // Also reset taskCompleted NOW so that when SonicGameCanvas mounts for task-2
    // it sees completed=false. Without this, the canvas initialises with the task-1
    // "completed" flag still true, immediately enters victoryMode, and Sonic jumps
    // non-stop throughout all of task-2.
    setShowTransition(false);
    setTaskCompleted(false);
    router.push(`/session?id=${sessionId}&condition=${condition}&task=task-2-algorithm-complexity`);
  };


  // ── Derived values ────────────────────────────────────────────
  const minutes     = Math.floor(timeRemaining / 60);
  const seconds     = timeRemaining % 60;
  const timeStr     = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  const timeWarning = timeRemaining < 120;
  const timeCritical = timeRemaining < 60;

  // ── CRASH FIX: when transition runs, render ONLY the mini-game ─
  // This ensures the SonicGameCanvas (Kaplay instance) is fully
  // unmounted BEFORE TaskTransitionGame creates its own instance.
  // Two simultaneous Kaplay instances on different canvases freeze
  // the browser due to conflicting WebGL/RAF loops.
  if (showTransition) {
    return (
      <TaskTransitionGame
        earnedRings={ringsCollected}
        fromZone="BUCLE INFINITO"
        toZone="OPTIMIZACIÓN ALGORÍTMICA"
        condition={condition}
        onComplete={handleTransitionComplete}
        onRingCollected={() => setRingsCollected((prev) => prev + 1)}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col" style={{ background: "#0a0a1a" }}>

      {/* ── Zone title card (Condition A only) ───────────────── */}
      {showZoneTitle && (
        <ZoneTitleCard
          zoneName={zone.name}
          actNumber={zone.act}
          onDone={() => setShowZoneTitle(false)}
        />
      )}

      {/* ── Game HUD Top Bar ──────────────────────────────────── */}
      <nav
        className="h-12 flex items-center px-4 gap-4 flex-shrink-0 border-b"
        style={{
          background: "linear-gradient(90deg, #0d1b2a, #001a33)",
          borderColor: timeCritical ? "#ff4444" : "#ffcc00",
          borderBottomWidth: "2px",
          transition: "border-color 0.5s ease",
        }}
      >
        {/* Branding */}
        <div className="flex items-center gap-2">
          <RingSprite size={18} />
          <span
            className="font-bold text-yellow-300 font-mono text-sm"
            style={{ textShadow: "0 0 10px rgba(255,204,0,0.5)" }}
          >
            SONIC CODE
          </span>
        </div>

        <div className="h-6 w-px bg-white/20" />

        <div className="flex-1" />

        {/* Zone name */}
        <span className="text-white/30 text-xs font-mono hidden md:block">
          ZONA {zone.act}: {zone.name}
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
            background: timeCritical ? "rgba(200,0,0,0.35)"   : timeWarning ? "rgba(200,150,0,0.3)" : "rgba(0,50,100,0.5)",
            border:     `1px solid ${timeCritical ? "#ff4444" : timeWarning ? "#ffaa00"             : "#4da6ff"}`,
            color:      timeCritical ? "#ff6666"               : timeWarning ? "#ffcc00"             : "#88ccff",
            animation:  timeCritical ? "pulse 0.8s infinite"   : "none",
          }}
        >
          ⏱️ {timeStr}
        </div>

        {/* Session ID */}
        <span className="text-white/20 text-xs font-mono hidden lg:block">
          {sessionId.slice(0, 8)}
        </span>

        {/* Exit (facilitator/participant abandon) */}
        <button
          onClick={() => {
            if (confirm("¿Salir de la sesión? El progreso de la tarea actual no se guardará.")) {
              router.push("/");
            }
          }}
          className="text-xs font-mono px-2 py-1 rounded transition-colors"
          style={{ color: "#ff8888", border: "1px solid rgba(255,80,80,0.3)" }}
          title="Salir de la sesión"
          data-testid="exit-session"
        >
          ✕ Salir
        </button>
      </nav>

      {/* ── Main area ─────────────────────────────────────────── */}
      {condition === "A" ? (
        /* Condition A: playable Open Sonic zone with the Debug Terminal overlay */
        <div className="flex-1 min-h-0">
          <GameSession
            sessionId={sessionId}
            task={task}
            level={zoneForTask(task.id).level}
            onTaskComplete={handleTaskComplete}
          />
        </div>
      ) : (
        /* Condition B: plain text tutor + editor (control) */
        <div className="flex-1 flex min-h-0">
          <div className="w-[45%] border-r flex-shrink-0" style={{ borderColor: "#1a2a3a" }}>
            <CodePanel
              task={task}
              timeRemainingSeconds={timeRemaining}
              turnCount={turnCount}
              onTaskComplete={handleTaskComplete}
            />
          </div>
          <div className="flex-1 min-w-0">
            <ChatInterface
              condition={condition}
              sessionId={sessionId}
              taskContext={{
                taskId:           task.id,
                buggyCode:        task.buggyCode,
                errorDescription: task.errorDescription,
              }}
              onNewMessage={handleNewMessage}
            />
          </div>
        </div>
      )}

      {/* ── Task completion modal ─────────────────────────────── */}
      {showSummary && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: "rgba(0,0,0,0.88)" }}
        >
          <div
            className="rounded-2xl p-6 max-w-md w-full animate-bounce-in"
            style={{
              background: "linear-gradient(135deg, #0d1b2a, #001a33)",
              border: `3px solid ${resolvedAutonomously ? "#ffcc00" : "#4488aa"}`,
              boxShadow: resolvedAutonomously ? "0 0 50px rgba(255,204,0,0.3)" : "none",
            }}
          >
            <div className="text-center mb-5">
              {/* Animated icon */}
              <div className="text-5xl mb-3 animate-bounce">
                {resolvedAutonomously ? "🏆" : "⏱️"}
              </div>

              <h2
                className="font-black text-2xl mb-1"
                style={{
                  color: resolvedAutonomously ? "#ffcc00" : "#88aacc",
                  fontFamily: "'Courier New', monospace",
                }}
              >
                {resolvedAutonomously ? "¡ANILLO CONSEGUIDO!" : "TIEMPO AGOTADO"}
              </h2>

              <p className="text-white/50 text-sm">
                {resolvedAutonomously
                  ? `¡Encontraste el error! +10 anillos 🔔 (Total: ${ringsCollected})`
                  : "No te rindas — ¡la Zona 2 aún te espera!"}
              </p>
            </div>

            {/* Stats grid (clean — no RQ metrics visible to participants) */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Anillos 💍",  value: ringsCollected,                                    color: "#ffcc00" },
                { label: "Turnos 💬",   value: turnCount,                                         color: "#4da6ff" },
                { label: "Tiempo ⏱️",  value: `${Math.round((Date.now() - taskStartTime) / 1000)}s`, color: "#88ccff" },
              ].map((m) => (
                <div
                  key={m.label}
                  className="rounded-xl p-3 text-center"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <div className="text-xl font-bold font-mono" style={{ color: m.color }}>{m.value}</div>
                  <div className="text-white/40 text-xs mt-1">{m.label}</div>
                </div>
              ))}
            </div>

            {/* Continue button */}
            <button
              onClick={handleContinue}
              className="w-full py-3 font-black text-lg text-black rounded-xl transition-all"
              style={{
                background: "linear-gradient(90deg, #ffcc00, #ff8c00)",
                boxShadow: "0 4px 0 #cc6600",
                fontFamily: "'Courier New', monospace",
              }}
            >
              {taskId === "task-1-infinite-loop"
                ? "CORRER A LA ZONA 2"
                : "VER RESULTADO FINAL"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionPage() {
  return (
    <Suspense
      fallback={
        <div
          className="h-screen flex items-center justify-center font-mono text-yellow-300"
          style={{ background: "#0a0a1a" }}
        >
          <div className="text-center space-y-3">
            <div className="text-4xl font-black animate-bounce">SONIC</div>
            <div
              className="w-12 h-12 mx-auto"
              style={{
                backgroundImage: "url(/sprites/ring.png)",
                backgroundSize: "1600% 100%",
                imageRendering: "pixelated",
                animation: "ringSheetSpin 0.6s steps(16) infinite",
              }}
            />
            <div className="text-sm">CARGANDO ZONA...</div>
          </div>
        </div>
      }
    >
      <SessionContent />
    </Suspense>
  );
}
