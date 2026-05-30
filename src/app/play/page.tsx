"use client";

import { useRef } from "react";
import { useSonicBridge } from "@/client/game/useSonicBridge";

// Phase B: the engine runs in an iframe; React drives it over postMessage
// (pause/resume) and receives in-world events. This is the harness the
// Condition A session will use to overlay the Socratic chat/editor.

export default function PlayPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { ready, lastEvent, pause, resume } = useSonicBridge(iframeRef);

  return (
    <main style={{ background: "#000", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          color: "#ffcc00",
          fontFamily: "'Courier New', monospace",
          padding: "8px 14px",
          fontSize: 13,
          borderBottom: "1px solid #222",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <span>SONIC CODE — engine bridge</span>
        <button onClick={pause} data-testid="btn-pause" style={btn}>⏸ Pausar</button>
        <button onClick={resume} data-testid="btn-resume" style={btn}>▶ Reanudar</button>
        <span data-testid="engine-ready" style={{ color: ready ? "#4caf50" : "#888" }}>
          {ready ? "● engine listo" : "○ cargando…"}
        </span>
        <span data-testid="last-event" style={{ color: "#88aacc", marginLeft: "auto" }}>
          evento: {lastEvent?.type ?? "—"}
        </span>
        <a href="/" style={{ color: "#4da6ff" }}>← inicio</a>
      </div>
      <iframe
        ref={iframeRef}
        src="/game/index.html"
        title="Open Sonic engine"
        data-testid="game-frame"
        style={{ flex: 1, width: "100%", border: "none", background: "#000" }}
        allow="autoplay; gamepad"
      />
    </main>
  );
}

const btn: React.CSSProperties = {
  background: "rgba(255,255,255,0.08)",
  border: "1px solid #444466",
  color: "#fff",
  fontFamily: "'Courier New', monospace",
  fontSize: 12,
  padding: "3px 10px",
  borderRadius: 6,
  cursor: "pointer",
};
