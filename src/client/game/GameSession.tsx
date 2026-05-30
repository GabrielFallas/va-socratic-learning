"use client";

import { useEffect, useRef, useState } from "react";
import type { Task } from "@/shared/types/session";
import { useSonicBridge } from "@/client/game/useSonicBridge";
import CodePanel, { type TaskCompleteMeta } from "@/client/components/CodePanel";
import ChatInterface from "@/client/components/ChatInterface";

// Condition A surface for the "Debug Zones" reimagining: a real playable Open
// Sonic level. Running into the Debug Terminal pauses the engine and overlays
// the SAME Socratic chat + Pyodide editor used everywhere else (tutoring
// content held constant); passing the hidden tests opens the gate and Sonic
// runs on. Embodiment = the game world, not the tutor's words.

interface Props {
  sessionId: string;
  task: Task;
  level: string;
  /** Bubbles up to the session page for telemetry + summary/transition. */
  onTaskComplete: (resolved: boolean, meta?: TaskCompleteMeta) => void;
}

export default function GameSession({ sessionId, task, level, onTaskComplete }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { ready, on, pause, resume, send } = useSonicBridge(iframeRef);
  const [overlay, setOverlay] = useState(false);
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const [rings, setRings] = useState(0);

  // Exploratory gameplay metrics (kept separate from the RQ measures): how long
  // the platforming took and whether the participant used the assist shortcut.
  const zoneStart = useRef(Date.now());
  const assistUsed = useRef(false);
  const ringsRef = useRef(0);

  // Count rings collected in-world.
  useEffect(() => on("ring-collected", (p) => {
    const total = (p as { total?: number })?.total ?? ringsRef.current + 1;
    ringsRef.current = total;
    setRings(total);
  }), [on]);

  // When the player reaches the Debug Terminal, freeze the world, log the
  // gameplay metrics, and open the Socratic overlay.
  useEffect(() => {
    return on("reach-terminal", (p) => {
      pause();
      setOverlay(true);
      const forced = !!(p as { forced?: boolean })?.forced;
      fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "log-questionnaire",
          sessionId,
          questionnaire: {
            instrument: "gameplay",
            responses: { taskId: task.id, forced },
            scores: {
              timeToTerminalSec: Math.round((Date.now() - zoneStart.current) / 1000),
              ringsInGame: ringsRef.current,
              assistUsed: assistUsed.current ? 1 : 0,
            },
          },
        }),
      }).catch(() => {});
    });
  }, [on, pause, sessionId, task.id]);

  const handleResolve = (resolved: boolean, meta?: TaskCompleteMeta) => {
    setOverlay(false);
    if (resolved) {
      // Open the gate / defeat the boss, then let Sonic run on.
      send("open-gate");
      setGateMsg("¡PUERTA ABIERTA!");
      setTimeout(() => setGateMsg(null), 1800);
    }
    resume();
    onTaskComplete(resolved, meta);
  };

  return (
    <div className="relative w-full h-full" style={{ background: "#000" }} data-testid="game-session">
      <iframe
        ref={iframeRef}
        src={`/game/index.html?level=${encodeURIComponent(level)}`}
        title="Sonic Code zone"
        data-testid="game-frame"
        className="w-full h-full"
        style={{ border: "none", background: "#000" }}
        allow="autoplay; gamepad"
      />

      {/* Hint + assist while running */}
      {ready && !overlay && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-none">
          <div
            className="px-3 py-1 rounded-full font-mono text-xs"
            style={{ background: "rgba(0,10,30,0.7)", color: "#ffcc00", border: "1px solid #0066cc" }}
          >
            → Corre hasta la Terminal de Depuración (flechas / espacio) · 💍 {rings}
          </div>
          {/* Assist: reach the terminal without platforming skill (logged) */}
          <button
            onClick={() => { assistUsed.current = true; send("trigger-terminal"); }}
            className="pointer-events-auto px-3 py-1 rounded-full font-mono text-xs font-bold"
            style={{ background: "rgba(255,200,0,0.18)", color: "#ffcc00", border: "1px solid #ffcc00" }}
            data-testid="assist-button"
            title="Ir directamente a la Terminal"
          >
            Ir a la Terminal →
          </button>
        </div>
      )}

      {/* Gate-opened flash */}
      {gateMsg && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          data-testid="gate-flash"
        >
          <span
            className="font-black text-4xl animate-bounce"
            style={{ color: "#ffcc00", fontFamily: "'Courier New', monospace", textShadow: "0 0 24px rgba(255,204,0,0.8)" }}
          >
            {gateMsg}
          </span>
        </div>
      )}

      {/* Debug Terminal overlay — the Socratic chat + editor, identical content */}
      {overlay && (
        <div
          className="absolute inset-0 z-30 flex flex-col"
          style={{ background: "rgba(0,4,14,0.96)" }}
          data-testid="terminal-overlay"
        >
          <div
            className="flex items-center gap-2 px-4 py-2 border-b flex-shrink-0"
            style={{ borderColor: "#0066cc" }}
          >
            <span className="font-mono font-bold text-sm" style={{ color: "#27c93f" }}>
              ◉ TERMINAL DE DEPURACIÓN
            </span>
            <span className="font-mono text-xs" style={{ color: "#88aacc" }}>
              — resuelve el bug para abrir la puerta
            </span>
          </div>
          <div className="flex-1 flex min-h-0">
            <div className="w-1/2 border-r" style={{ borderColor: "#1a2a3a" }}>
              <CodePanel
                task={task}
                timeRemainingSeconds={600}
                turnCount={0}
                onTaskComplete={handleResolve}
              />
            </div>
            <div className="w-1/2 min-w-0">
              <ChatInterface
                condition="A"
                voice
                sessionId={sessionId}
                taskContext={{
                  taskId: task.id,
                  buggyCode: task.buggyCode,
                  errorDescription: task.errorDescription,
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
