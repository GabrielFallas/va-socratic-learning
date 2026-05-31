"use client";

// ─────────────────────────────────────────────────────────────────
// SFX Manager — plays Sonic game sound effects
// Uses Web Audio API with a singleton AudioContext for reliability.
// Sounds are pre-fetched and cached as AudioBuffers on first use.
// ─────────────────────────────────────────────────────────────────

type SFXName =
  | "ring" | "jump" | "hyperRing" | "destroy" | "hurt"
  | "spindash" | "spring" | "shield" | "checkpoint" | "brake"
  | "bosshit" | "thundershield" | "fireshield" | "watershield" | "spin";

const SFX_PATHS: Record<SFXName, string> = {
  ring:           "/sounds/Ring.wav",
  jump:           "/sounds/Jump.wav",
  hyperRing:      "/sounds/HyperRing.wav",
  destroy:        "/sounds/Destroy.wav",
  hurt:           "/sounds/Hurt.wav",
  spindash:       "/sounds/spindash1.wav",
  spring:         "/sounds/spring.wav",
  shield:         "/sounds/shield.wav",
  checkpoint:     "/sounds/checkpoint.wav",
  brake:          "/sounds/brake.wav",
  bosshit:        "/sounds/bosshit.wav",
  thundershield:  "/sounds/thundershield.wav",
  fireshield:     "/sounds/fireshield.wav",
  watershield:    "/sounds/watershield.wav",
  spin:           "/sounds/spin.wav",
};

let ctx: AudioContext | null = null;
const buffers = new Map<SFXName, AudioBuffer>();

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

async function loadBuffer(name: SFXName): Promise<AudioBuffer> {
  const cached = buffers.get(name);
  if (cached) return cached;

  const ac = getCtx();
  const res = await fetch(SFX_PATHS[name]);
  const arr = await res.arrayBuffer();
  const buf = await ac.decodeAudioData(arr);
  buffers.set(name, buf);
  return buf;
}

/** Pre-load all SFX buffers (call on mount, no-op if already loaded) */
export async function preloadSFX(): Promise<void> {
  await Promise.all(
    (Object.keys(SFX_PATHS) as SFXName[]).map((n) => loadBuffer(n).catch(() => {}))
  );
}

/** Play a sound effect. volume 0–1. Returns immediately. */
export function playSFX(name: SFXName, volume = 1.0): void {
  if (typeof window === "undefined") return;
  loadBuffer(name)
    .then((buf) => {
      const ac = getCtx();
      if (ac.state === "suspended") ac.resume().catch(() => {});
      const src = ac.createBufferSource();
      const gain = ac.createGain();
      gain.gain.value = volume;
      src.buffer = buf;
      src.connect(gain);
      gain.connect(ac.destination);
      src.start();
    })
    .catch(() => {});
}

