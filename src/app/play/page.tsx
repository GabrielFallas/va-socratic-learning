"use client";

// Feasibility spike: embed the vendored Open Sonic engine (built to
// /game/js/opensonic.js, served statically) via an iframe. This proves the
// engine runs inside our Next.js app before we build the postMessage bridge
// and the custom tutoring level.

export default function PlayPage() {
  return (
    <main style={{ background: "#000", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div
        style={{
          color: "#ffcc00",
          fontFamily: "'Courier New', monospace",
          padding: "8px 14px",
          fontSize: 13,
          borderBottom: "1px solid #222",
        }}
      >
        SONIC CODE — engine spike ·{" "}
        <a href="/" style={{ color: "#4da6ff" }}>← inicio</a>
      </div>
      <iframe
        src="/game/index.html"
        title="Open Sonic engine"
        data-testid="game-frame"
        style={{ flex: 1, width: "100%", border: "none", background: "#000" }}
        allow="autoplay; gamepad"
      />
    </main>
  );
}
