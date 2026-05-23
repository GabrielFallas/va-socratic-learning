"use client";

import { useEffect, useState } from "react";
import type { AvatarState } from "@/shared/types/session";

// ============================================================
// Ada Avatar Sprite — CSS/SVG animated (free alternative to Live2D)
// Implements: idle, thinking, speaking, listening,
//             happy, curious, empathetic, encouraging states
// ============================================================

interface AvatarSpriteProps {
  state: AvatarState;
  /** Whether speech audio is playing */
  isSpeaking: boolean;
  className?: string;
}

const STATE_CONFIG: Record<
  AvatarState,
  { emoji: string; color: string; animation: string; label: string }
> = {
  idle: {
    emoji: "🤖",
    color: "from-blue-500 to-purple-600",
    animation: "animate-float",
    label: "En espera",
  },
  thinking: {
    emoji: "🔮",
    color: "from-purple-500 to-indigo-600",
    animation: "animate-pulse-slow",
    label: "Analizando...",
  },
  speaking: {
    emoji: "💬",
    color: "from-cyan-400 to-blue-500",
    animation: "animate-float",
    label: "Respondiendo",
  },
  listening: {
    emoji: "👂",
    color: "from-green-400 to-teal-500",
    animation: "animate-pulse-slow",
    label: "Escuchando...",
  },
  happy: {
    emoji: "✨",
    color: "from-yellow-400 to-orange-500",
    animation: "animate-bounce",
    label: "¡Excelente!",
  },
  curious: {
    emoji: "🔍",
    color: "from-violet-500 to-purple-600",
    animation: "animate-float",
    label: "Curioso",
  },
  empathetic: {
    emoji: "💜",
    color: "from-pink-500 to-rose-500",
    animation: "animate-pulse-slow",
    label: "Comprensivo",
  },
  encouraging: {
    emoji: "⚡",
    color: "from-amber-400 to-yellow-500",
    animation: "animate-float",
    label: "Motivando",
  },
};

/** Mouth animation: cycles through speaking shapes */
function MouthAnimation({ isSpeaking }: { isSpeaking: boolean }) {
  const [mouthOpen, setMouthOpen] = useState(false);

  useEffect(() => {
    if (!isSpeaking) {
      setMouthOpen(false);
      return;
    }
    const interval = setInterval(() => {
      setMouthOpen((prev) => !prev);
    }, 150);
    return () => clearInterval(interval);
  }, [isSpeaking]);

  return (
    <div className="flex items-center justify-center mt-1">
      <div
        className={`bg-white rounded-full transition-all duration-100 ${
          mouthOpen ? "w-4 h-3" : "w-4 h-1"
        }`}
        style={{ opacity: 0.9 }}
        aria-hidden="true"
      />
    </div>
  );
}

/** Thinking dots animation */
function ThinkingDots() {
  return (
    <div className="flex gap-1 items-center justify-center mt-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 bg-white rounded-full animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

/** Blink effect for eyes */
function EyeAnimation() {
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    const scheduleNextBlink = () => {
      const delay = 2000 + Math.random() * 4000;
      setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          scheduleNextBlink();
        }, 150);
      }, delay);
    };
    scheduleNextBlink();
  }, []);

  return (
    <div className="flex gap-3 items-center justify-center mb-1">
      {[0, 1].map((i) => (
        <div
          key={i}
          className={`bg-white rounded-full transition-all duration-75 ${
            blink ? "w-3 h-0.5" : "w-3 h-3"
          }`}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

export default function AvatarSprite({
  state,
  isSpeaking,
  className = "",
}: AvatarSpriteProps) {
  const config = STATE_CONFIG[state];

  return (
    <div
      className={`flex flex-col items-center gap-2 ${className}`}
      data-testid="avatar-sprite"
      data-state={state}
    >
      {/* Main avatar circle */}
      <div
        className={`relative w-28 h-28 rounded-full bg-gradient-to-br ${config.color}
          flex flex-col items-center justify-center shadow-2xl border-2 border-white/20
          ${config.animation} cursor-default select-none`}
        style={{
          boxShadow: `0 0 30px rgba(139, 92, 246, 0.4), 0 0 60px rgba(0, 212, 255, 0.2)`,
        }}
        role="img"
        aria-label={`Ada — ${config.label}`}
      >
        {/* Eyes */}
        <EyeAnimation />

        {/* Mouth or thinking dots */}
        {state === "thinking" ? (
          <ThinkingDots />
        ) : (
          <MouthAnimation isSpeaking={isSpeaking} />
        )}

        {/* Neural pattern overlay */}
        <div
          className="absolute inset-0 rounded-full opacity-10"
          style={{
            background: `repeating-conic-gradient(
              rgba(255,255,255,0.1) 0deg,
              transparent 2deg,
              transparent 30deg
            )`,
          }}
          aria-hidden="true"
        />
      </div>

      {/* Name tag */}
      <div className="text-center">
        <div className="text-cyan-400 font-bold text-lg tracking-widest font-mono">
          ADA
        </div>
        <div className="text-white/60 text-xs font-mono">{config.label}</div>
      </div>

      {/* State indicator bar */}
      <div
        className="w-full flex gap-1 justify-center"
        role="status"
        aria-label={`Estado: ${config.label}`}
      >
        {(["idle", "listening", "thinking", "speaking"] as AvatarState[]).map(
          (s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                state === s ? "bg-cyan-400" : "bg-white/20"
              }`}
              aria-hidden="true"
            />
          )
        )}
      </div>
    </div>
  );
}
