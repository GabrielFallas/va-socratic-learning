"use client";

// ─────────────────────────────────────────────────────────────────
// ZoneTitleCard — Sonic-style ACT intro animation
// Shows zone name + act number, slides in then out automatically.
// Only renders for Condition A.
// ─────────────────────────────────────────────────────────────────

import { useEffect, useState } from "react";

interface ZoneTitleCardProps {
  zoneName:  string;   // e.g. "BUCLE INFINITO"
  actNumber: number;   // 1 or 2
  onDone?:   () => void;
}

type Phase = "idle" | "slide-in" | "hold" | "slide-out" | "done";

export default function ZoneTitleCard({ zoneName, actNumber, onDone }: ZoneTitleCardProps) {
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    // Small delay before starting so page is already rendered
    const t0 = setTimeout(() => setPhase("slide-in"),  200);
    const t1 = setTimeout(() => setPhase("hold"),       900);
    const t2 = setTimeout(() => setPhase("slide-out"), 2800);
    const t3 = setTimeout(() => {
      setPhase("done");
      onDone?.();
    }, 3600);

    return () => { [t0, t1, t2, t3].forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "idle" || phase === "done") return null;

  const tx =
    phase === "slide-in"  ? "translateX(0%)"    :
    phase === "hold"      ? "translateX(0%)"    :
                            "translateX(-110%)";

  const opacity =
    phase === "slide-in"  ? 1 :
    phase === "hold"      ? 1 :
    phase === "slide-out" ? 0.85 : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{ perspective: "800px" }}
    >
      {/* Backdrop flash */}
      <div
        className="absolute inset-0"
        style={{
          background: "rgba(0,0,0,0.45)",
          opacity: phase === "slide-out" ? 0 : 1,
          transition: "opacity 0.5s ease",
        }}
      />

      {/* Title plate */}
      <div
        style={{
          transform: tx,
          opacity,
          transition: "transform 0.55s cubic-bezier(0.22,1,0.36,1), opacity 0.4s ease",
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* Outer plate — chemical plant teal/blue */}
        <div
          style={{
            background: "linear-gradient(90deg, #003366 0%, #0066cc 50%, #003366 100%)",
            border: "4px solid #ffcc00",
            boxShadow: "0 0 40px rgba(255,204,0,0.5), inset 0 2px 0 rgba(255,255,255,0.1)",
            padding: "0 0 0 0",
            minWidth: "520px",
            overflow: "hidden",
          }}
        >
          {/* Top stripe */}
          <div style={{ height: "6px", background: "#ffcc00" }} />

          <div style={{ padding: "20px 40px 16px" }}>
            {/* Zone label */}
            <div
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: "13px",
                letterSpacing: "0.35em",
                color: "#ffcc00cc",
                textTransform: "uppercase",
                marginBottom: "4px",
              }}
            >
              ZONA
            </div>

            {/* Zone name — big */}
            <div
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: "clamp(28px, 4vw, 42px)",
                fontWeight: 900,
                color: "#ffffff",
                letterSpacing: "0.06em",
                textShadow: "3px 3px 0 #003399, 0 0 20px rgba(77,166,255,0.6)",
                lineHeight: 1,
                marginBottom: "10px",
              }}
            >
              {zoneName}
            </div>

            {/* Divider */}
            <div style={{ height: "2px", background: "linear-gradient(90deg, #ffcc00, transparent)", marginBottom: "8px" }} />

            {/* Act */}
            <div
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: "16px",
                color: "#ffcc00",
                letterSpacing: "0.2em",
                fontWeight: "bold",
              }}
            >
              ACT {actNumber}
            </div>
          </div>

          {/* Bottom stripe */}
          <div style={{ height: "6px", background: "#ffcc00" }} />
        </div>

        {/* Shadow plate */}
        <div
          style={{
            position: "absolute",
            bottom: "-8px",
            left: "8px",
            right: "-8px",
            height: "100%",
            background: "#002244",
            zIndex: -1,
            border: "4px solid #001a33",
          }}
        />
      </div>
    </div>
  );
}
