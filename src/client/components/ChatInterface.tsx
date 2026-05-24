"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { ChatMessage, Condition, AvatarState } from "@/shared/types/session";
import { speak, stopSpeaking, isTTSAvailable, preloadCheck } from "@/services/tts/piperTTS";
import { startListening, stopListening, isSTTAvailable } from "@/services/stt/whisperSTT";
import { playSFX, preloadSFX, startBGMusic, stopBGMusic } from "@/client/audio/sfx";

// Dynamic import — Kaplay/Three.js must not run on SSR
const SonicGameCanvas = dynamic(
  () => import("@/client/avatar/SonicGameCanvas"),
  {
    ssr: false,
    loading: () => (
      <div
        className="w-full h-full flex items-center justify-center font-mono text-sm animate-pulse"
        style={{ background: "#000a12", color: "#ffcc00" }}
      >
        CARGANDO ZONA...
      </div>
    ),
  }
);

interface ChatInterfaceProps {
  condition: Condition;
  sessionId: string;
  taskContext?: {
    taskId: string;
    buggyCode: string;
    errorDescription: string;
  };
  onNewMessage?: (message: ChatMessage, latencyMs: number) => void;
  ringsCollected?:       number;
  timeRemainingSeconds?: number;
  taskCompleted?:        boolean;
  ringMultiplier?:       number;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const WELCOME_TEXT =
  "¡Hey! ¡Soy SONIC! ¡El tutor más rápido del mundo! Gotta go fast — pero en programación, ir rápido sin entender es como correr en círculos. ¡Vamos! ¿Qué comportamiento inesperado estás viendo en tu código?";

const WELCOME_TEXT_B =
  "¡Hola! Soy Sonic, tu tutor socrático. Nunca doy respuestas directas — te hago las preguntas correctas para que TÚ encuentres la solución. ¿Qué comportamiento inesperado estás viendo en tu código?";

export default function ChatInterface({
  condition,
  sessionId,
  taskContext,
  onNewMessage,
  ringsCollected = 0,
  timeRemainingSeconds = 600,
  taskCompleted = false,
  ringMultiplier = 1,
}: ChatInterfaceProps) {
  const [messages, setMessages]             = useState<ChatMessage[]>([]);
  const [inputText, setInputText]           = useState("");
  const [isLoading, setIsLoading]           = useState(false);
  const [avatarState, setAvatarState]       = useState<AvatarState>("idle");
  const [isSpeakingTTS, setIsSpeakingTTS]   = useState(false);
  const [isListeningSTT, setIsListeningSTT] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [streamingText, setStreamingText]   = useState("");
  const [sttAvailable, setSttAvailable]     = useState(false);
  const [sttError, setSttError]             = useState<string | null>(null);
  const [soundUnlocked, setSoundUnlocked]   = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLTextAreaElement>(null);
  const isConditionA   = condition === "A";

  // Pre-load assets
  useEffect(() => {
    preloadCheck();
    preloadSFX().catch(() => {});
    setSttAvailable(isSTTAvailable());
  }, []);

  // Auto-dismiss STT errors
  useEffect(() => {
    if (!sttError) return;
    const t = setTimeout(() => setSttError(null), 5000);
    return () => clearTimeout(t);
  }, [sttError]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Welcome message
  useEffect(() => {
    const welcome: ChatMessage = {
      id: "welcome",
      role: "assistant",
      content: isConditionA ? WELCOME_TEXT : WELCOME_TEXT_B,
      timestamp: Date.now(),
    };
    setMessages([welcome]);
    if (isConditionA) setAvatarState("encouraging");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Stop music on unmount
  useEffect(() => {
    return () => { stopBGMusic(); };
  }, []);

  // ── Unlock audio + start BGM + speak welcome ──────────────────
  const handleUnlockSound = useCallback(() => {
    setSoundUnlocked(true);
    startBGMusic(0.12);
    preloadSFX().catch(() => {});
    setAvatarState("speaking");
    setIsSpeakingTTS(true);
    speak(
      WELCOME_TEXT,
      {},
      () => setIsSpeakingTTS(true),
      () => {
        setIsSpeakingTTS(false);
        setAvatarState("listening");
      }
    ).catch(console.error);
  }, []);

  // ── Send message ──────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      if (isConditionA && !soundUnlocked) {
        setSoundUnlocked(true);
        startBGMusic(0.12);
      }

      // Jump SFX on send
      if (isConditionA) playSFX("jump", 0.5);

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText("");
      setInterimTranscript("");
      setIsLoading(true);
      setStreamingText("");

      if (isConditionA) {
        setAvatarState("thinking");
        stopSpeaking();
      }

      const sendStart = Date.now();

      try {
        const apiMessages = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: userMessage.role, content: userMessage.content },
        ].filter((m) => m.role !== "system");

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, condition, messages: apiMessages, taskContext }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader    = response.body.getReader();
        const decoder   = new TextDecoder();
        let accumulated = "";
        let latencyMs   = 0;
        let finalAvatarState: AvatarState = "curious";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          for (const line of chunk.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                accumulated += data.chunk;
                setStreamingText(accumulated.replace(/\[AVATAR_STATE:\w+\]\s*/g, ""));
                if (isConditionA) setAvatarState("speaking");
              }
              if (data.done) {
                latencyMs        = data.latencyMs;
                finalAvatarState = data.avatarState ?? "curious";
              }
              if (data.error) throw new Error(data.error);
            } catch { /* skip malformed */ }
          }
        }

        const cleanText = accumulated
          .replace(/\[AVATAR_STATE:\w+\]\s*/g, "")
          .trim();

        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: cleanText,
          timestamp: Date.now(),
          latencyMs,
          totalResponseMs: Date.now() - sendStart,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingText("");

        if (isConditionA) {
          setAvatarState(finalAvatarState);
          // Ring SFX
          playSFX("ring", 0.7);
        }

        onNewMessage?.(assistantMessage, latencyMs);

        // TTS
        if (isConditionA && cleanText) {
          setIsSpeakingTTS(true);
          speak(
            cleanText,
            {},
            () => setIsSpeakingTTS(true),
            () => {
              setIsSpeakingTTS(false);
              setAvatarState("listening");
            }
          ).catch(console.error);
        } else if (isConditionA) {
          setAvatarState("listening");
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Error al conectar con Sonic";
        if (isConditionA) playSFX("hurt", 0.5);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: `Error: ${errMsg}`,
            timestamp: Date.now(),
          },
        ]);
        setStreamingText("");
        if (isConditionA) setAvatarState("idle");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, sessionId, condition, taskContext, isConditionA, soundUnlocked, onNewMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const toggleSTT = () => {
    if (isListeningSTT) {
      stopListening();
      setIsListeningSTT(false);
      setSttError(null);
      if (isConditionA) setAvatarState("thinking");
    } else {
      setSttError(null);
      setIsListeningSTT(true);
      if (isConditionA) setAvatarState("listening");
      startListening(
        { lang: "es-ES" },
        {
          onResult: (transcript, isFinal) => {
            if (isFinal) {
              setInputText((prev) => prev + transcript + " ");
              setInterimTranscript("");
              setIsListeningSTT(false);
              if (isConditionA) setAvatarState("thinking");
            } else {
              setInterimTranscript(transcript);
            }
          },
          onError: (error) => {
            setIsListeningSTT(false);
            if (isConditionA) setAvatarState("idle");
            setSttError(
              error === "not-allowed"          ? "Permiso de micrófono denegado." :
              error === "device-not-found"     ? "Dispositivo no encontrado." :
              error.includes("network")        ? "Error de conexión STT." :
              `Error: ${error}`
            );
          },
          onEnd: () => {
            setIsListeningSTT(false);
            setInterimTranscript("");
          },
        }
      );
    }
  };

  // ── Render ────────────────────────────────────────────────────
  return (
    <div
      className="flex flex-col h-full relative"
      style={{
        background: isConditionA
          ? "linear-gradient(180deg, #000d1a 0%, #0a0a1a 100%)"
          : "#0f0f1a",
      }}
      data-testid="chat-interface"
      data-condition={condition}
    >
      {/* ── Condition A: Kaplay game canvas ──────────────────────── */}
      {isConditionA && (
        <div
          className="relative border-b flex-shrink-0 overflow-hidden"
          style={{
            borderColor: "#0066cc",
            height: "260px",
          }}
        >
          <SonicGameCanvas
            avatarState={avatarState}
            isSpeaking={isSpeakingTTS}
            ringsCollected={ringsCollected}
            timeRemainingSeconds={timeRemainingSeconds}
            taskCompleted={taskCompleted}
            className="w-full h-full"
          />

          {/* Multiplier badge — shows inside canvas header when >1x */}
          {ringMultiplier > 1 && (
            <div
              className="absolute top-2 left-2 z-10 px-2 py-1 rounded-lg font-mono font-black text-sm animate-pulse"
              style={{
                background: ringMultiplier >= 3 ? "#ff4400" : ringMultiplier >= 2 ? "#ff8800" : "#ffcc00",
                color: "#000",
                boxShadow: `0 0 12px ${ringMultiplier >= 3 ? "#ff4400" : "#ffcc00"}`,
                fontSize: "13px",
              }}
            >
              x{ringMultiplier} COMBO!
            </div>
          )}

          {/* "Press Start" overlay */}
          {!soundUnlocked && (
            <div
              className="absolute inset-0 flex items-center justify-center z-20"
              style={{ background: "rgba(0,5,15,0.82)", backdropFilter: "blur(3px)" }}
            >
              <button
                onClick={handleUnlockSound}
                className="flex flex-col items-center gap-3 group"
              >
                <span
                  className="font-black text-3xl tracking-widest animate-bounce"
                  style={{
                    color: "#ffcc00",
                    fontFamily: "'Courier New', monospace",
                    textShadow: "0 0 20px rgba(255,204,0,0.8)",
                  }}
                >
                  SONIC
                </span>
                <span
                  className="font-bold text-sm px-6 py-2 rounded-full animate-pulse"
                  style={{
                    background: "linear-gradient(90deg, #ffcc00, #ff8c00)",
                    color: "black",
                    fontFamily: "'Courier New', monospace",
                    boxShadow: "0 0 24px rgba(255,204,0,0.6)",
                    letterSpacing: "0.1em",
                  }}
                >
                  ▶ PRESS START
                </span>
                <span className="text-white/40 text-xs font-mono">
                  click para activar voz + música
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Condition B: Simple header ────────────────────────────── */}
      {!isConditionA && (
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: "#1a2a3a", background: "rgba(0,0,0,0.5)" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-white font-mono text-sm font-bold">
              [SONIC] Chat Socrático
            </span>
            <span className="text-white/40 text-xs ml-auto">Condición B</span>
          </div>
        </div>
      )}

      {/* ── Messages ─────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        data-testid="messages-container"
        role="log"
        aria-live="polite"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
            data-testid={`message-${msg.role}`}
          >
            <div
              className="max-w-[80%] px-4 py-3"
              style={{
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background:
                  msg.role === "user"
                    ? "linear-gradient(135deg, #1a0066, #3300cc)"
                    : isConditionA
                    ? "linear-gradient(135deg, #003399, #0066cc)"
                    : "#1e1e3a",
                border:
                  msg.role === "user"
                    ? "2px solid #6633ff"
                    : isConditionA
                    ? "2px solid #4da6ff"
                    : "1px solid #333355",
              }}
            >
              {msg.role === "assistant" && (
                <div
                  className="text-xs font-mono mb-1"
                  style={{ color: isConditionA ? "#ffcc00" : "#88aacc" }}
                >
                  [SONIC]
                </div>
              )}
              <p className="text-sm leading-relaxed text-white whitespace-pre-wrap">
                {msg.content}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs opacity-30">{formatTime(msg.timestamp)}</span>
                {msg.latencyMs !== undefined && (
                  <span
                    className="text-xs font-mono px-1 rounded"
                    style={{ color: msg.latencyMs < 1500 ? "#4caf50" : "#f44336" }}
                  >
                    {msg.latencyMs}ms
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming preview */}
        {streamingText && (
          <div className="flex justify-start animate-fade-in">
            <div
              className="max-w-[80%] px-4 py-3"
              style={{
                borderRadius: "18px 18px 18px 4px",
                background: isConditionA ? "linear-gradient(135deg, #003399, #0066cc)" : "#1e1e3a",
                border: `2px solid ${isConditionA ? "#4da6ff" : "#333355"}`,
              }}
            >
              <div className="text-xs font-mono mb-1" style={{ color: "#ffcc00" }}>
                🦔 SONIC
              </div>
              <p className="text-sm leading-relaxed text-white">{streamingText}</p>
              <span
                className="inline-block w-2 h-4 ml-1 animate-blink"
                style={{ background: "#ffcc00" }}
              />
            </div>
          </div>
        )}

        {/* Loading dots */}
        {isLoading && !streamingText && (
          <div className="flex justify-start">
            <div
              className="px-4 py-3 rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #003399, #0066cc)",
                border: "2px solid #4da6ff",
              }}
            >
              <div className="text-xs font-mono mb-1" style={{ color: "#ffcc00" }}>
                🦔 SONIC
              </div>
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ background: "#ffcc00", animationDelay: `${i * 0.15}s` }}
                  />
                ))}
                <span className="text-xs text-white/40 ml-2 font-mono">pensando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ───────────────────────────────────────────── */}
      <div
        className="p-4 border-t"
        style={{
          borderColor: isConditionA ? "#0066cc" : "#1a2a3a",
          background: "rgba(0,0,0,0.4)",
        }}
      >
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputText + interimTranscript}
              onChange={(e) => { if (!isListeningSTT) setInputText(e.target.value); }}
              onKeyDown={handleKeyDown}
              placeholder={
                isConditionA
                  ? "Escribe o usa el micrófono... (Enter para enviar)"
                  : "Escribe tu pregunta... (Enter para enviar)"
              }
              rows={2}
              disabled={isLoading}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white outline-none transition-all font-mono disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: `1px solid ${isListeningSTT ? "#ff4444" : isConditionA ? "#0066cc" : "#333355"}`,
                caretColor: "#ffcc00",
              }}
              data-testid="chat-input"
            />
          </div>

          {/* Mic button — Condition A only */}
          {isConditionA && sttAvailable && (
            <div className="relative">
              <button
                onClick={toggleSTT}
                className="p-3 rounded-xl transition-all"
                style={{
                  background: isListeningSTT ? "#cc0000" : "rgba(0,102,204,0.5)",
                  border: `1px solid ${isListeningSTT ? "#ff4444" : "#4da6ff"}`,
                  animation: isListeningSTT ? "pulse 1s infinite" : "none",
                }}
                title={isListeningSTT ? "Detener grabación" : "Hablar con Sonic"}
                data-testid="mic-button"
              >
                <span className="text-sm font-bold text-white">
                  {isListeningSTT ? "STOP" : "MIC"}
                </span>
              </button>
              {sttError && (
                <div
                  className="absolute bottom-full right-0 mb-2 w-52 rounded-lg px-3 py-2 text-xs text-red-200"
                  style={{ background: "#2a0000", border: "1px solid #ff4444" }}
                >
                  {sttError}
                </div>
              )}
            </div>
          )}

          {/* Send button */}
          <button
            onClick={() => sendMessage(inputText)}
            disabled={isLoading || !inputText.trim()}
            className="p-3 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: "linear-gradient(90deg, #ffcc00, #ff8c00)",
              color: "black",
              boxShadow: "0 3px 0 #cc6600",
            }}
            data-testid="send-button"
            aria-label="Enviar mensaje"
          >
            <span className="text-lg">▶</span>
          </button>
        </div>

        {/* Status bar */}
        <div
          className="flex items-center gap-3 mt-2 text-xs font-mono"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          <span>🎮 {sessionId.slice(0, 8)}</span>
          <span>·</span>
          <span>Cond. {condition}</span>
          {isConditionA && (
            <>
              <span>·</span>
              <span style={{ color: soundUnlocked ? "#4caf50" : "#f59e0b" }}>
                🔊 {soundUnlocked ? "voz + música ON" : "click ▶ START"}
              </span>
              <span>·</span>
              <span style={{ color: sttAvailable ? "#4caf50" : "#f44336" }}>
                STT {sttAvailable ? "✓" : "✗"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
