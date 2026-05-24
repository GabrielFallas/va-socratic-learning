"use client";

import { useEffect, useState, useRef } from "react";
import type { AvatarState } from "@/shared/types/session";

// ──────────────────────────────────────────────────────────────────────
// Per-state configuration: color, eye shape, mouth, body animation,
// floating particles, and label.
// ──────────────────────────────────────────────────────────────────────
interface StateCfg {
  color:       string;
  eyeRy:       number;   // right-eye vertical radius (controls squint / wide)
  leftEyeRy?:  number;   // override for left eye (asymmetric, e.g. thinking)
  mouth:       string;   // SVG path "d" attribute, or "TALKING"
  bodyAnim:    string;   // CSS animation shorthand
  particles:   string[];
  label:       string;
}

const CONFIG: Record<AvatarState, StateCfg> = {
  idle: {
    color: "#3b82f6",
    eyeRy: 10,
    mouth: "M -16,4 Q 0,15 16,4",
    bodyAnim: "avatarFloat 3s ease-in-out infinite",
    particles: [],
    label: "Listo",
  },
  thinking: {
    color: "#8b5cf6",
    eyeRy: 5,
    leftEyeRy: 3,           // one eye more squinted — "scratching head" look
    mouth: "M -10,5 Q 0,9 10,5",
    bodyAnim: "avatarTilt 2s ease-in-out infinite",
    particles: ["❓", "💭"],
    label: "Pensando",
  },
  speaking: {
    color: "#06b6d4",
    eyeRy: 10,
    mouth: "TALKING",
    bodyAnim: "avatarTalkBob 0.38s ease-in-out infinite",
    particles: [],
    label: "Hablando",
  },
  listening: {
    color: "#10b981",
    eyeRy: 14,              // wide-open, attentive
    mouth: "M -10,5 Q 0,9 10,5",
    bodyAnim: "avatarLean 2.5s ease-in-out infinite",
    particles: ["👂"],
    label: "Escuchando",
  },
  happy: {
    color: "#f59e0b",
    eyeRy: 5,               // squished eyes = big smile energy
    mouth: "M -22,0 Q 0,24 22,0",
    bodyAnim: "avatarBounce 0.62s ease-in-out infinite",
    particles: ["⭐", "🎉", "✨"],
    label: "¡Feliz!",
  },
  curious: {
    color: "#6366f1",
    eyeRy: 14,
    mouth: "M -10,4 Q 0,10 10,4",
    bodyAnim: "avatarTiltRight 2s ease-in-out infinite",
    particles: ["❓", "🔍"],
    label: "Curioso",
  },
  empathetic: {
    color: "#ec4899",
    eyeRy: 7,               // droopy eyes
    mouth: "M -14,9 Q 0,5 14,9",   // slight frown / sad curve
    bodyAnim: "avatarSway 2.5s ease-in-out infinite",
    particles: ["💙", "💜"],
    label: "Comprensivo",
  },
  encouraging: {
    color: "#f97316",
    eyeRy: 11,
    mouth: "M -21,-1 Q 0,22 21,-1",  // huge grin
    bodyAnim: "avatarPump 0.55s ease-in-out infinite",
    particles: ["⚡", "🔥", "💪"],
    label: "¡Motivando!",
  },
};

// ──────────────────────────────────────────────────────────────────────
// CSS keyframes injected once (inside a <style> client tag)
// ──────────────────────────────────────────────────────────────────────
const KEYFRAMES = `
  @keyframes avatarFloat {
    0%,100% { transform: translateY(0px); }
    50%     { transform: translateY(-10px); }
  }
  @keyframes avatarBounce {
    0%,100% { transform: translateY(0) scaleY(1); }
    35%     { transform: translateY(-32px) scaleY(1.06); }
    55%     { transform: translateY(0)    scaleY(0.91); }
    72%     { transform: translateY(-14px) scaleY(1.02); }
  }
  @keyframes avatarTilt {
    0%,100% { transform: rotate(-12deg) translateY(-4px); }
    50%     { transform: rotate(5deg)  translateY(4px); }
  }
  @keyframes avatarTiltRight {
    0%,100% { transform: rotate(13deg) translateY(-5px); }
    50%     { transform: rotate(8deg)  translateY(5px); }
  }
  @keyframes avatarSway {
    0%,100% { transform: rotate(-6deg) translateX(-7px); }
    50%     { transform: rotate(6deg)  translateX(7px); }
  }
  @keyframes avatarPump {
    0%,100% { transform: translateY(0)    rotate(-4deg); }
    25%     { transform: translateY(-24px) rotate(4deg); }
    50%     { transform: translateY(0)    rotate(-2deg); }
    75%     { transform: translateY(-14px) rotate(3deg); }
  }
  @keyframes avatarTalkBob {
    0%,100% { transform: translateY(0)    rotate(0deg); }
    25%     { transform: translateY(-7px)  rotate(-3deg); }
    75%     { transform: translateY(5px)   rotate(2deg); }
  }
  @keyframes avatarLean {
    0%,100% { transform: rotate(6deg) translateX(6px); }
    50%     { transform: rotate(3deg) translateX(3px); }
  }
  @keyframes particleRise {
    0%   { transform: translateY(0)    scale(0.7); opacity: 0; }
    15%  { opacity: 1; }
    85%  { opacity: 0.75; }
    100% { transform: translateY(-115px) scale(1.15); opacity: 0; }
  }
  @keyframes auraBreath {
    0%,100% { opacity: 0.45; transform: scale(1); }
    50%     { opacity: 0.75; transform: scale(1.06); }
  }
`;

// ──────────────────────────────────────────────────────────────────────
// SVG face with animated eyes and mouth
// ──────────────────────────────────────────────────────────────────────
function SonicFace({
  state,
  isSpeaking,
}: {
  state:      AvatarState;
  isSpeaking: boolean;
}) {
  const cfg = CONFIG[state];

  // Toggle mouth open/closed when speaking
  const [mouthOpen, setMouthOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const talking = isSpeaking || state === "speaking";
    if (talking) {
      timer.current = setInterval(() => setMouthOpen((v) => !v), 130);
    } else {
      if (timer.current) clearInterval(timer.current);
      timer.current = null;
      setMouthOpen(false);
    }
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [isSpeaking, state]);

  const rightRy = cfg.eyeRy;
  const leftRy  = cfg.leftEyeRy ?? cfg.eyeRy;

  // Pupil Y shifts up when eye squints (scaleY effect via ry change)
  const rightPupilY = -12 + (10 - rightRy) * 0.35;
  const leftPupilY  = -12 + (10 - leftRy)  * 0.35;
  const rightPupilR = rightRy > 6 ? 8 : Math.max(4, rightRy - 1);
  const leftPupilR  = leftRy  > 6 ? 8 : Math.max(4, leftRy  - 1);

  // Mouth path
  let mouthD    = cfg.mouth === "TALKING"
    ? "M -12,5 Q 0,14 12,5"
    : cfg.mouth;
  let mouthFill = "none";
  if (mouthOpen) {
    mouthD    = "M -14,2 C -16,13 -9,20 0,21 C 9,20 16,13 14,2 C 8,-1 -8,-1 -14,2 Z";
    mouthFill = "#cc7060";
  }

  return (
    <svg viewBox="-60 -78 120 148" width="100%" height="100%">
      <defs>
        <radialGradient id="sonicHead" cx="38%" cy="32%" r="65%">
          <stop offset="0%"   stopColor="#1976d2"/>
          <stop offset="100%" stopColor="#0d47a1"/>
        </radialGradient>
        <radialGradient id="sonicEye" cx="28%" cy="28%" r="70%">
          <stop offset="0%"   stopColor="#1e2060"/>
          <stop offset="100%" stopColor="#080820"/>
        </radialGradient>
        <filter id="faceShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#00000044"/>
        </filter>
      </defs>

      {/* ── Back spikes ─────────────────────── */}
      <polygon points=" 40,-46  50,-72  54,-42" fill="#0d47a1"/>
      <polygon points=" 16,-54  13,-82  32,-51" fill="#0d47a1"/>
      <polygon points="-12,-55 -22,-80   0,-52" fill="#0d47a1"/>

      {/* ── Ear flaps ───────────────────────── */}
      <polygon points="-50,-25 -64,-54 -34,-30" fill="#0d47a1"/>
      <polygon points=" 50,-25  64,-54  34,-30" fill="#0d47a1"/>

      {/* ── Main head ───────────────────────── */}
      <circle
        cx="0" cy="-5" r="54"
        fill="url(#sonicHead)"
        filter="url(#faceShadow)"
      />

      {/* ── Muzzle (cream area) ─────────────── */}
      <ellipse cx="1" cy="14" rx="34" ry="24" fill="#f0dfc0"/>

      {/* ── Left eye ────────────────────────── */}
      <g>
        <ellipse cx="-19" cy="-12" rx="13" ry={leftRy}
          fill="white"
          style={{ transition: "ry 0.22s ease" }}
        />
        {leftRy > 2 && (
          <circle cx="-18" cy={leftPupilY} r={leftPupilR}
            fill="url(#sonicEye)"
            style={{ transition: "all 0.22s ease" }}
          />
        )}
        {leftRy > 5 && (
          <circle cx="-13" cy={leftPupilY - 4} r="3" fill="white"/>
        )}
      </g>

      {/* ── Right eye ───────────────────────── */}
      <g>
        <ellipse cx="19" cy="-12" rx="13" ry={rightRy}
          fill="white"
          style={{ transition: "ry 0.22s ease" }}
        />
        {rightRy > 2 && (
          <circle cx="18" cy={rightPupilY} r={rightPupilR}
            fill="url(#sonicEye)"
            style={{ transition: "all 0.22s ease" }}
          />
        )}
        {rightRy > 5 && (
          <circle cx="23" cy={rightPupilY - 4} r="3" fill="white"/>
        )}
      </g>

      {/* ── Nose ────────────────────────────── */}
      <ellipse cx="1" cy="5" rx="5" ry="3.5" fill="#b06868"/>

      {/* ── Mouth ───────────────────────────── */}
      <path
        d={mouthD}
        stroke="#1a0808"
        strokeWidth="2.5"
        fill={mouthFill}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Floating emoji particles
// ──────────────────────────────────────────────────────────────────────
const PARTICLE_X_SLOTS = [7, 18, 32, 50, 65, 80];

function Particles({ emojis, color }: { emojis: string[]; color: string }) {
  if (!emojis.length) return null;
  return (
    <>
      {emojis.flatMap((emoji, ei) =>
        [0, 1, 2].map((pi) => {
          const x   = PARTICLE_X_SLOTS[(ei * 3 + pi) % PARTICLE_X_SLOTS.length];
          const dly = (ei * 0.55 + pi * 0.75).toFixed(2);
          const bot = 10 + pi * 8;
          return (
            <div
              key={`${emoji}-${ei}-${pi}`}
              className="absolute pointer-events-none select-none"
              style={{
                left:     `${x}%`,
                bottom:   `${bot}%`,
                fontSize: "1.1rem",
                animation: `particleRise 2.4s ${dly}s ease-out infinite`,
                filter:   `drop-shadow(0 0 5px ${color})`,
              }}
            >
              {emoji}
            </div>
          );
        })
      )}
    </>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Public SonicAvatar component — zero WebGL, pure CSS/SVG
// ──────────────────────────────────────────────────────────────────────
interface SonicAvatarProps {
  state:           AvatarState;
  isSpeaking:      boolean;
  ringsCollected?: number;
  className?:      string;
  showEggman?:     boolean;
}

export default function SonicAvatar({
  state,
  isSpeaking,
  className = "",
}: SonicAvatarProps) {
  const cfg   = CONFIG[state];
  const color = cfg.color;

  return (
    <>
      {/* Inject keyframes once per page (idempotent, browsers deduplicate) */}
      <style>{KEYFRAMES}</style>

      <div
        className={`relative flex flex-col items-center justify-center gap-2 overflow-hidden ${className}`}
      >
        {/* Background aura glow */}
        <div
          className="absolute inset-0 pointer-events-none rounded-xl"
          style={{
            background:  `radial-gradient(ellipse at 50% 45%, ${color}33 0%, transparent 68%)`,
            animation:   "auraBreath 3s ease-in-out infinite",
            transition:  "background 0.55s ease",
          }}
        />

        {/* Particle layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Particles emojis={cfg.particles} color={color} />
        </div>

        {/* Animated face */}
        <div
          className="relative z-10"
          style={{
            width:       "62%",
            maxWidth:    "210px",
            aspectRatio: "1 / 1.08",
            animation:   cfg.bodyAnim,
            filter:      `drop-shadow(0 6px 18px ${color}99)`,
            transition:  "filter 0.4s ease",
          }}
        >
          <SonicFace state={state} isSpeaking={isSpeaking} />
        </div>

        {/* Emotion label */}
        <div
          className="relative z-10 px-4 py-0.5 rounded-full text-xs font-bold font-mono tracking-wide"
          style={{
            background:  color,
            color:       "#000",
            boxShadow:   `0 2px 10px ${color}88`,
            transition:  "background 0.4s ease, box-shadow 0.4s ease",
          }}
        >
          {cfg.label}
        </div>
      </div>
    </>
  );
}
