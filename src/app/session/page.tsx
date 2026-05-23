"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { Condition, ChatMessage, TaskResult } from "@/shared/types/session";
import { TASKS } from "@/shared/config/tasks";
import ChatInterface from "@/client/components/ChatInterface";
import CodePanel from "@/client/components/CodePanel";

// ============================================================
// Session page — Main experiment interface
// URL: /session?id=<sessionId>&condition=<A|B>&task=<taskId>
// ============================================================

function SessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sessionId = searchParams.get("id") ?? `P-${Date.now().toString(36)}`;
  const condition = (searchParams.get("condition") ?? "B") as Condition;
  const taskId =
    searchParams.get("task") ?? "task-1-infinite-loop";

  const task = TASKS.find((t) => t.id === taskId) ?? TASKS[0];

  const [timeRemaining, setTimeRemaining] = useState(task.maxTimeSeconds);
  const [turnCount, setTurnCount] = useState(0);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [latencyReadings, setLatencyReadings] = useState<number[]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [taskStartTime] = useState(Date.now());
  const [resolvedAutonomously, setResolvedAutonomously] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset state when task changes
  useEffect(() => {
    setTaskCompleted(false);
    setShowSummary(false);
    setTimeRemaining(task.maxTimeSeconds);
    setTurnCount(0);
    setLatencyReadings([]);
    setResolvedAutonomously(false);
  }, [taskId, task.maxTimeSeconds]);

  // Start task timer
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

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskCompleted]);

  const handleNewMessage = useCallback(
    (message: ChatMessage, latencyMs: number) => {
      if (message.role === "assistant") {
        setTurnCount((prev) => prev + 1);
        setLatencyReadings((prev) => [...prev, latencyMs]);
      }
    },
    []
  );

  const handleTaskComplete = useCallback(
    async (resolved: boolean) => {
      if (taskCompleted) return;
      setTaskCompleted(true);
      setResolvedAutonomously(resolved);

      if (timerRef.current) clearInterval(timerRef.current);

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
          body: JSON.stringify({
            action: "log-task",
            sessionId,
            taskResult: result,
          }),
        });
      } catch (err) {
        console.error("Failed to log task result:", err);
      }

      setShowSummary(true);
    },
    [taskCompleted, taskStartTime, turnCount, latencyReadings, task.id, sessionId]
  );

  const avgLatency =
    latencyReadings.length > 0
      ? Math.round(
          latencyReadings.reduce((a, b) => a + b, 0) / latencyReadings.length
        )
      : 0;

  const latencyOk = latencyReadings.filter((l) => l < 1500).length;
  const latencyFail = latencyReadings.filter((l) => l >= 1500).length;

  // Continue to task 2 if task 1 completed
  const handleContinue = () => {
    if (taskId === "task-1-infinite-loop") {
      router.push(
        `/session?id=${sessionId}&condition=${condition}&task=task-2-algorithm-complexity`
      );
    } else {
      router.push(`/session/complete?id=${sessionId}&condition=${condition}`);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Top nav bar */}
      <nav className="h-10 bg-black/50 border-b border-white/10 flex items-center px-4 gap-3 text-xs font-mono text-white/40 flex-shrink-0">
        <span className="text-cyan-400">ADA</span>
        <span>·</span>
        <span>Sesión {sessionId}</span>
        <span>·</span>
        <span>Cond. {condition}</span>
        <span>·</span>
        <span>{task.title}</span>
        <span className="ml-auto flex items-center gap-3">
          <span>Turnos: {turnCount}</span>
          {latencyReadings.length > 0 && (
            <>
              <span>·</span>
              <span
                className={avgLatency < 1500 ? "text-green-400/70" : "text-red-400/70"}
              >
                Latencia avg: {avgLatency}ms
              </span>
            </>
          )}
        </span>
      </nav>

      {/* Main split layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Code panel */}
        <div className="w-[45%] border-r border-white/10 flex-shrink-0">
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
          />
        </div>
      </div>

      {/* Task completion modal */}
      {showSummary && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-white/20 rounded-2xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="text-4xl mb-2">
                {resolvedAutonomously ? "🎉" : "⏱️"}
              </div>
              <h2 className="text-white font-bold text-xl mb-1">
                {resolvedAutonomously ? "¡Tarea Completada!" : "Tiempo Agotado"}
              </h2>
              <p className="text-white/50 text-sm">
                {resolvedAutonomously
                  ? "Encontraste el error de forma autónoma"
                  : "El tiempo límite fue alcanzado"}
              </p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">{turnCount}</div>
                <div className="text-white/40 text-xs mt-1">Turnos</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">
                  {Math.round((Date.now() - taskStartTime) / 1000)}s
                </div>
                <div className="text-white/40 text-xs mt-1">Tiempo</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div
                  className={`text-2xl font-bold ${
                    avgLatency < 1500 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {avgLatency}ms
                </div>
                <div className="text-white/40 text-xs mt-1">Latencia avg</div>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <div className="text-2xl font-bold text-white">
                  {latencyReadings.length > 0
                    ? Math.round(
                        (latencyOk / latencyReadings.length) * 100
                      ) + "%"
                    : "N/A"}
                </div>
                <div className="text-white/40 text-xs mt-1">
                  Respuestas &lt;1.5s
                </div>
              </div>
            </div>

            {/* RQ4 latency analysis */}
            {latencyReadings.length > 0 && (
              <div className="bg-yellow-950/30 border border-yellow-500/20 rounded-xl p-3 mb-4 text-xs">
                <p className="text-yellow-300 font-mono font-bold mb-1">
                  RQ4: Análisis de Latencia
                </p>
                <p className="text-white/60">
                  ✓ &lt;1.5s: {latencyOk}/{latencyReadings.length} ({" "}
                  {Math.round((latencyOk / latencyReadings.length) * 100)}%)
                </p>
                <p className="text-white/60">
                  ✗ ≥1.5s: {latencyFail}/{latencyReadings.length}
                </p>
                <p className="text-white/60">
                  Max: {Math.max(...latencyReadings)}ms | Min:{" "}
                  {Math.min(...latencyReadings)}ms
                </p>
              </div>
            )}

            <button
              onClick={handleContinue}
              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600
                text-white font-bold rounded-xl hover:from-cyan-400 hover:to-purple-500
                transition-all"
            >
              {taskId === "task-1-infinite-loop"
                ? "Continuar a Tarea 2 →"
                : "Ver Resumen Final →"}
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
        <div className="h-screen flex items-center justify-center bg-gray-950 text-white font-mono">
          Cargando sesión...
        </div>
      }
    >
      <SessionContent />
    </Suspense>
  );
}
