"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Condition } from "@/shared/types/session";

// ============================================================
// Landing page — Condition assignment & session start
// In experiment: condition is randomly assigned
// In MVP: user can choose for testing both conditions
// ============================================================

export default function HomePage() {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

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
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950/30 to-purple-950/30 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/20 rounded-full px-4 py-1.5 mb-6">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-cyan-400 text-xs font-mono tracking-widest">
              NEURAL NEXUS INITIATIVE — 2147
            </span>
          </div>

          <h1 className="text-5xl font-black text-white mb-3 tracking-tight">
            Ada
          </h1>
          <p className="text-xl text-white/60 mb-2">
            Tutora Socrática de Programación
          </p>
          <p className="text-white/30 text-sm font-mono">
            PF-3311 · UCR · I Semestre 2026
          </p>
        </div>

        {/* Info cards */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-2xl mb-2">🎭</div>
            <h3 className="text-white font-bold text-sm mb-1">
              Condición A — Avatar
            </h3>
            <p className="text-white/50 text-xs leading-relaxed">
              Ada con avatar 2D animado, voz TTS y reconocimiento de voz (STT).
              Modalidad multimodal completa.
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="text-2xl mb-2">💬</div>
            <h3 className="text-white font-bold text-sm mb-1">
              Condición B — Texto
            </h3>
            <p className="text-white/50 text-xs leading-relaxed">
              Mismo agente socrático Ada, sin avatar ni voz. Solo chat de texto
              plano. Condición de control.
            </p>
          </div>
        </div>

        {/* RQs */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-8">
          <h3 className="text-white/70 text-xs font-mono font-bold mb-3 tracking-wider">
            PREGUNTAS DE INVESTIGACIÓN
          </h3>
          <div className="space-y-2 text-xs text-white/50 leading-relaxed">
            <p>
              <span className="text-cyan-400 font-mono">RQ1</span> — ¿Mejora el
              avatar la percepción de naturalidad y soporte pedagógico?
            </p>
            <p>
              <span className="text-purple-400 font-mono">RQ2</span> — ¿Afecta
              el embodiment la eficacia pedagógica autónoma?
            </p>
            <p>
              <span className="text-pink-400 font-mono">RQ3</span> — ¿Qué
              relación hay entre modalidad y carga cognitiva/estado afectivo?
            </p>
            <p>
              <span className="text-amber-400 font-mono">RQ4</span> — ¿Se
              mantiene la latencia por debajo de 1.5s?
            </p>
          </div>
        </div>

        {/* Start buttons */}
        <div className="space-y-3">
          <button
            onClick={startRandom}
            disabled={isStarting}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-600
              hover:from-cyan-400 hover:to-purple-500 text-white font-bold rounded-2xl
              text-lg transition-all duration-200 shadow-lg shadow-purple-500/20
              disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="start-random"
          >
            {isStarting ? "Iniciando sesión..." : "🎲 Iniciar Sesión (Aleatoria)"}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => startSession("A")}
              disabled={isStarting}
              className="py-3 bg-blue-900/50 hover:bg-blue-800/50 border border-blue-500/30
                text-white rounded-xl text-sm transition-all font-mono
                disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="start-condition-a"
            >
              🎭 Forzar Condición A
            </button>
            <button
              onClick={() => startSession("B")}
              disabled={isStarting}
              className="py-3 bg-gray-800/50 hover:bg-gray-700/50 border border-gray-500/30
                text-white rounded-xl text-sm transition-all font-mono
                disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="start-condition-b"
            >
              💬 Forzar Condición B
            </button>
          </div>
        </div>

        <p className="text-center text-white/20 text-xs mt-6 font-mono">
          Powered by Gemini 2.0 Flash · Free tier · Web Speech API
        </p>
      </div>
    </main>
  );
}
