"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Condition } from "@/shared/types/session";

// ── Animated ring (real sprite via CSS sheet) ─────────────────────
function Ring({ size = 32, style = {} }: { size?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        backgroundImage: "url(/sprites/ring.png)",
        backgroundSize: "1600% 100%", // 16 frames
        imageRendering: "pixelated",
        animation: "ringSheetSpin 0.6s steps(16) infinite",
        ...style,
      }}
    />
  );
}

export default function HomePage() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [sonicX, setSonicX] = useState(-120);
  const [sonicFlip, setSonicFlip] = useState(false);

  // Inject extra keyframes not in globals.css
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes sonicRunSheet {
        from { background-position-x: 0%; }
        to   { background-position-x: 100%; }
      }
      @keyframes bgScrollFast {
        from { background-position-x: 0px; }
        to   { background-position-x: -480px; }
      }
      @keyframes bgScrollSlow {
        from { background-position-x: 0px; }
        to   { background-position-x: -960px; }
      }
      @keyframes platformScroll {
        from { background-position-x: 0px; }
        to   { background-position-x: -256px; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  const startSession = async (condition: Condition) => {
    setIsStarting(true);
    const sessionId = `P-${Date.now().toString(36).toUpperCase()}`;
    try {
      await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "init", sessionId, condition }),
      });
      router.push(`/session?id=${sessionId}&condition=${condition}&task=task-1-infinite-loop`);
    } catch {
      setIsStarting(false);
    }
  };

  const startRandom = () => {
    const condition: Condition = Math.random() > 0.5 ? "A" : "B";
    startSession(condition);
  };

  return (
    <main className="min-h-screen overflow-hidden relative" style={{ background: "#87ceeb" }}>

      {/* ── Sky layer ─────────────────────────────────────────────── */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(180deg, #87ceeb 0%, #b8e8ff 60%, #87ceeb 100%)",
        }}
      />

      {/* ── Chemical Plant background (scrolling, faded) ─────────── */}
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage: "url(/sprites/chemical-bg.png)",
          backgroundRepeat: "repeat-x",
          backgroundSize: "auto 100%",
          backgroundPosition: "0 0",
          animation: "bgScrollSlow 8s linear infinite",
          imageRendering: "pixelated",
        }}
      />

      {/* ── Ground strip ──────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0" style={{ height: "120px" }}>
        {/* Dark earth */}
        <div className="absolute inset-0" style={{ background: "#1a3d1a" }} />
        {/* Green top */}
        <div className="absolute top-0 left-0 right-0 h-8" style={{ background: "#4caf50" }} />
        {/* Platform sprite tiled */}
        <div
          className="absolute top-0 left-0 right-0 h-8"
          style={{
            backgroundImage: "url(/sprites/platforms.png)",
            backgroundRepeat: "repeat-x",
            backgroundSize: "auto 32px",
            animation: "platformScroll 2s linear infinite",
            imageRendering: "pixelated",
            opacity: 0.5,
          }}
        />
      </div>

      {/* ── Sonic running sprite ───────────────────────────────────── */}
      <div
        className="absolute"
        style={{
          bottom: "100px",
          left: 0,
          right: 0,
          height: "96px",
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            position: "absolute",
            bottom: 0,
            width: "96px",
            height: "96px",
            backgroundImage: "url(/sprites/sonic.png)",
            backgroundRepeat: "no-repeat",
            backgroundSize: "800% 200%",  // 8 cols, 2 rows
            backgroundPositionY: "0%",    // row 0 = run
            imageRendering: "pixelated",
            animation:
              "sonicRunSheet 0.53s steps(8) infinite, sonicSlide 10s linear infinite",
          }}
        />
        <style>{`
          @keyframes sonicSlide {
            0%   { left: -100px; transform: scaleX(1);  }
            48%  { left: calc(100vw + 20px); transform: scaleX(1);  }
            50%  { left: calc(100vw + 20px); transform: scaleX(-1); }
            98%  { left: -100px; transform: scaleX(-1); }
            100% { left: -100px; transform: scaleX(1);  }
          }
        `}</style>
      </div>

      {/* ── Floating rings ────────────────────────────────────────── */}
      {[
        { top: "8%",  left: "8%",  size: 36, delay: "0s" },
        { top: "15%", right: "10%",size: 28, delay: "0.4s" },
        { top: "6%",  right: "28%",size: 20, delay: "0.8s" },
        { top: "22%", left: "22%", size: 24, delay: "1.2s" },
        { top: "18%", right: "5%", size: 32, delay: "1.6s" },
      ].map((r, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            top: r.top,
            left: "left" in r ? r.left : undefined,
            right: "right" in r ? r.right : undefined,
            animation: `bounce ${1.5 + i * 0.2}s ease-in-out ${r.delay} infinite`,
          }}
        >
          <Ring size={r.size} />
        </div>
      ))}

      {/* ── Main content card ─────────────────────────────────────── */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pb-32">

        {/* Badge */}
        <div
          className="inline-block px-6 py-2 rounded-full text-sm font-bold mb-4 text-black"
          style={{
            background: "linear-gradient(90deg, #ffcc00, #ff8c00)",
            boxShadow: "0 4px 0 #cc6600, 0 0 24px rgba(255,204,0,0.5)",
            fontFamily: "'Courier New', monospace",
          }}
        >
          🎮 PF-3311 · UCR · I Semestre 2026
        </div>

        {/* Title */}
        <h1
          className="text-6xl md:text-8xl font-black mb-1 tracking-wide text-center"
          style={{
            color: "#ffcc00",
            textShadow: "4px 4px 0 #cc6600, 8px 8px 0 #663300, 0 0 40px rgba(255,204,0,0.6)",
            fontFamily: "'Courier New', monospace",
            letterSpacing: "0.08em",
          }}
        >
          SONIC CODE
        </h1>
        <p
          className="text-2xl md:text-3xl font-bold mb-8 text-center"
          style={{
            color: "#ffffff",
            textShadow: "2px 2px 0 #0066cc, 4px 4px 0 #003399",
            fontFamily: "'Courier New', monospace",
          }}
        >
          ⚡ Tutor Socrático ⚡
        </p>

        {/* Ring counter teaser */}
        <div
          className="flex items-center gap-3 px-5 py-2 rounded-full mb-8"
          style={{ background: "rgba(0,0,0,0.55)", border: "2px solid #ffcc00" }}
        >
          <Ring size={22} />
          <span className="text-yellow-300 font-bold text-sm font-mono">
            Recolecta anillos para avanzar en tu aprendizaje
          </span>
          <Ring size={22} />
        </div>

        {/* Condition cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 max-w-2xl w-full">

          {/* Condition A */}
          <div
            className="rounded-2xl p-5 border-2"
            style={{
              background: "rgba(0, 60, 140, 0.88)",
              borderColor: "#4da6ff",
              boxShadow: "0 4px 0 #002266, 0 0 20px rgba(77,166,255,0.2)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              {/* Mini ring sprite */}
              <Ring size={24} />
            </div>
            <h3 className="text-yellow-300 font-bold text-base mb-2 font-mono">
              Condición A — Sonic + Voz
            </h3>
            <p className="text-white/80 text-sm leading-relaxed">
              Sonic con avatar animado en tiempo real, voz neural en español
              y reconocimiento de voz. ¡La experiencia completa!
            </p>
          </div>

          {/* Condition B */}
          <div
            className="rounded-2xl p-5 border-2"
            style={{
              background: "rgba(20, 20, 50, 0.88)",
              borderColor: "#444466",
              boxShadow: "0 4px 0 #111133",
            }}
          >
            <div className="text-3xl mb-2">💬</div>
            <h3 className="text-white font-bold text-base mb-2 font-mono">
              Condición B — Solo Chat
            </h3>
            <p className="text-white/60 text-sm leading-relaxed">
              Tutor socrático sin avatar ni voz. Solo texto.
              Condición de control del experimento.
            </p>
          </div>
        </div>

        {/* Start buttons */}
        <div className="space-y-3 w-full max-w-md">
          <button
            onClick={startRandom}
            disabled={isStarting}
            className="w-full py-4 font-black text-xl text-black rounded-2xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              background: isStarting ? "#888" : "linear-gradient(90deg, #ffcc00, #ff8c00)",
              boxShadow: isStarting ? "none" : "0 6px 0 #cc6600, 0 0 24px rgba(255,204,0,0.4)",
              fontFamily: "'Courier New', monospace",
              letterSpacing: "0.05em",
            }}
            data-testid="start-random"
          >
            {isStarting ? "⏳ INICIANDO..." : "🎲 PRESS START (Aleatorio)"}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => startSession("A")}
              disabled={isStarting}
              className="py-3 font-bold text-sm text-white rounded-xl transition-all"
              style={{
                background: "rgba(0, 80, 180, 0.85)",
                border: "2px solid #4da6ff",
                boxShadow: "0 4px 0 #003399",
                fontFamily: "'Courier New', monospace",
              }}
              data-testid="start-condition-a"
            >
              [A] Condición A
            </button>
            <button
              onClick={() => startSession("B")}
              disabled={isStarting}
              className="py-3 font-bold text-sm text-white rounded-xl transition-all"
              style={{
                background: "rgba(20, 20, 50, 0.85)",
                border: "2px solid #444466",
                boxShadow: "0 4px 0 #111133",
                fontFamily: "'Courier New', monospace",
              }}
              data-testid="start-condition-b"
            >
              💬 Condición B
            </button>
          </div>
        </div>

        <p className="text-center text-xs mt-6 font-mono">
          Powered by Ollama Gemma 3 12B · Piper TTS · Whisper STT
        </p>
      </div>
    </main>
  );
}
