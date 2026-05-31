"use client";

type ZoneBGM = "chemical-plant" | "speed-highway";

const BGM_PATHS: Record<ZoneBGM, string> = {
  "chemical-plant": "/sounds/city.mp3",
  "speed-highway":  "/sounds/city.mp3",
};

let ctx: AudioContext | null = null;
let gainNode: GainNode | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let currentTrack: ZoneBGM | null = null;
const buffers = new Map<ZoneBGM, AudioBuffer>();

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

async function loadTrack(name: ZoneBGM): Promise<AudioBuffer> {
  const cached = buffers.get(name);
  if (cached) return cached;
  const ac = getCtx();
  const res = await fetch(BGM_PATHS[name]);
  const arr = await res.arrayBuffer();
  const buf = await ac.decodeAudioData(arr);
  buffers.set(name, buf);
  return buf;
}

export async function playBGM(zone: ZoneBGM, volume = 0.15): Promise<void> {
  if (typeof window === "undefined") return;
  if (currentTrack === zone && sourceNode) return;

  stopBGM();

  try {
    const ac = getCtx();
    if (ac.state === "suspended") await ac.resume();
    const buf = await loadTrack(zone);

    gainNode = ac.createGain();
    gainNode.gain.value = 0;
    gainNode.connect(ac.destination);

    sourceNode = ac.createBufferSource();
    sourceNode.buffer = buf;
    sourceNode.loop = true;
    sourceNode.connect(gainNode);
    sourceNode.start();
    currentTrack = zone;

    // Fade in
    gainNode.gain.linearRampToValueAtTime(volume, ac.currentTime + 1.5);
  } catch {
    // Audio not available
  }
}

export function stopBGM(): void {
  if (sourceNode) {
    try {
      if (gainNode && ctx) {
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.5);
        const src = sourceNode;
        setTimeout(() => { try { src.stop(); } catch {} }, 600);
      } else {
        sourceNode.stop();
      }
    } catch {}
    sourceNode = null;
    gainNode = null;
    currentTrack = null;
  }
}

export function setBGMVolume(volume: number): void {
  if (gainNode && ctx) {
    gainNode.gain.linearRampToValueAtTime(
      Math.max(0, Math.min(1, volume)),
      ctx.currentTime + 0.2
    );
  }
}
