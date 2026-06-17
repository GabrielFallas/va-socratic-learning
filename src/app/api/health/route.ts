import { NextResponse } from "next/server";
import { checkOllamaHealth, warmUpModel } from "@/services/llm/ollamaClient";

export const runtime = "nodejs";

// ============================================================
// Preflight health probe — GET /api/health
//
// Lets the facilitator confirm every backend service is reachable BEFORE a
// participant starts a session. The guideline grades reproducibility: "si el
// profesor o los evaluadores no pueden ejecutar su agente, se verá reflejado
// en la nota". A green badge on the landing page removes that risk.
//
//   ollama → required for both conditions (the Socratic LLM)
//   speech → Piper TTS + Whisper STT proxy (Condition A only; optional)
// ============================================================

const SPEECH_API = process.env.SPEECH_API_URL ?? "http://localhost:5001";

interface ServiceStatus {
  ok: boolean;
  detail?: string;
}

async function checkOllama(): Promise<ServiceStatus> {
  try {
    await checkOllamaHealth();
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function checkSpeech(): Promise<ServiceStatus> {
  try {
    const res = await fetch(`${SPEECH_API}/health`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    return { ok: true };
  } catch (err) {
    return { ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

export async function GET() {
  const [ollama, speech] = await Promise.all([checkOllama(), checkSpeech()]);
  // Ollama is the only hard requirement; the speech service is Condition-A only.
  const ready = ollama.ok;
  // Fire-and-forget: once Ollama is reachable, preload the model in the
  // background so the participant's first turn isn't hit by a cold start.
  if (ollama.ok) void warmUpModel();
  return NextResponse.json(
    { ready, ollama, speech, checkedAt: new Date().toISOString() },
    { status: ready ? 200 : 503 }
  );
}
