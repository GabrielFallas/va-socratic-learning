"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import type { ChatMessage, Condition, AvatarState } from "@/shared/types/session";
import { speak, stopSpeaking, preloadCheck } from "@/services/tts/piperTTS";
import { startListening, stopListening, isSTTAvailable } from "@/services/stt/whisperSTT";
import { playSFX, preloadSFX } from "@/client/audio/sfx";

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
  condition:             Condition;
  sessionId:             string;
  taskContext?: {
    taskId:             string;
    buggyCode:          string;
    errorDescription:   string;
  };
  onNewMessage?:         (message: ChatMessage, latencyMs: number) => void;
  onRingEarned?:         () => void;  // called only when answer approaches solution
  onRingLost?:           () => void;  // called when LLM signals empathetic state
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

// ── Welcome text — IDENTICAL tutor content across conditions ──────────────
// Held constant so A vs B isolates embodiment, not the tutor's words.
// In Condition A this same text is also delivered via neural voice (TTS).
const WELCOME_TEXT =
  "Hola. Vamos a resolver esto juntos sin que yo te dé la respuesta directamente. Mira el código: ¿qué observas en su comportamiento? Descríbelo con el mayor detalle que puedas.";

const WELCOME_A = WELCOME_TEXT;
const WELCOME_B = WELCOME_TEXT;

// ── Client-side sentiment — instant pre-response avatar reaction ──────────
// Runs on user text before the LLM responds so Sonic reacts to the student's
// emotion immediately, not just after the server round-trip.
const FRUSTRATION_KEYWORDS = [
  "no entiendo", "no sé", "me rindo", "no puedo", "no logro", "ayuda",
  "no comprendo", "estoy perdido", "no funciona", "no lo veo", "no encuentro",
  "qué hago", "no avanzo", "me perdí", "help",
];
const POSITIVE_KEYWORDS = [
  "lo encontré", "ya vi", "creo que es", "entendí", "ya sé", "lo tengo",
  "encontré el error", "ya entiendo", "creo que ya", "lo resolví", "ya lo veo",
  "ahhh", "ohhh", "claro", "tiene sentido",
];

function detectUserSentiment(text: string): "frustrated" | "positive" | "neutral" {
  const lower = text.toLowerCase();
  if (FRUSTRATION_KEYWORDS.some((kw) => lower.includes(kw))) return "frustrated";
  if (POSITIVE_KEYWORDS.some((kw) => lower.includes(kw))) return "positive";
  return "neutral";
}

// ── Proactive nudges (fire after 60 s of inactivity, Condition A only) ────
// IMPORTANT (experimental validity): these are deliberately CONTENT-NEUTRAL.
// Proactive engagement is part of the embodiment manipulation, but the nudges
// must NOT contain task-specific hints — otherwise Condition A would receive
// extra pedagogical scaffolding that Condition B never gets, confounding RQ2.
// They only prompt the participant to re-engage and articulate their thinking.
const PROACTIVE: string[] = [
  "¿Sigues ahí? Sin presión — tómate tu tiempo. Si quieres, cuéntame en qué estás pensando ahora.",
  "Una técnica útil: describe en una sola oración qué crees que hace el código. Verbalizar el problema suele aclararlo.",
  "¿En qué parte te sientes más atascado/a? Descríbelo con tus propias palabras y seguimos desde ahí.",
  "Recuerda que puedes editar el código y pulsar Ejecutar para comprobar tus ideas cuando quieras.",
];

function getProactiveMessage(_taskId?: string, used?: Set<string>): string {
  const available = PROACTIVE.filter((m) => !used?.has(m));
  const list = available.length > 0 ? available : PROACTIVE;
  return list[Math.floor(Math.random() * list.length)];
}

// ── Avatar state label chip ───────────────────────────────────────────────
const STATE_CHIP: Record<AvatarState, { label: string; color: string }> = {
  idle:        { label: "SONIC",       color: "#ffcc00" },
  thinking:    { label: "PENSANDO…",   color: "#88aaff" },
  speaking:    { label: "SONIC",       color: "#ffcc00" },
  listening:   { label: "ESCUCHANDO",  color: "#44ff88" },
  happy:       { label: "¡GENIAL!", color: "#ffdd00" },
  curious:     { label: "SONIC ?",     color: "#ff8800" },
  empathetic:  { label: "SONIC…",      color: "#88ccff" },
  encouraging: { label: "¡VAMOS!",  color: "#ffdd00" },
};

// ── Game dialogue box ─────────────────────────────────────────────────────
function DialogueBox({
  text,
  avatarState,
  isLoading,
}: {
  text:        string;
  avatarState: AvatarState;
  isLoading:   boolean;
}) {
  const chip = STATE_CHIP[avatarState] ?? STATE_CHIP.idle;
  const isTyping = isLoading && !text;

  return (
    <div
      style={{
        background:  "linear-gradient(180deg, rgba(0,4,24,0.97) 0%, rgba(0,10,35,0.99) 100%)",
        borderTop:   `3px solid ${chip.color}`,
        padding:     "10px 14px",
        minHeight:   "96px",
      }}
    >
      {/* Name chip */}
      <div style={{
        fontFamily:    "'Courier New', monospace",
        fontSize:      "11px",
        fontWeight:    900,
        letterSpacing: "0.15em",
        color:         chip.color,
        marginBottom:  "6px",
        textShadow:    `0 0 8px ${chip.color}66`,
      }}>
        {chip.label}
      </div>

      {/* Loading dots */}
      {isTyping ? (
        <div className="flex gap-1 items-center">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full animate-bounce"
              style={{ background: chip.color, animationDelay: `${i * 0.15}s`, opacity: 0.8 }}
            />
          ))}
          <span style={{ fontFamily: "'Courier New', monospace", fontSize: "11px", color: "rgba(255,255,255,0.3)", marginLeft: "6px" }}>
            Sonic está pensando…
          </span>
        </div>
      ) : (
        <p style={{
          fontFamily: "'Courier New', monospace",
          fontSize:   "13px",
          lineHeight: "1.55",
          color:      "#ffffff",
          margin:     0,
          whiteSpace: "pre-wrap",
          wordBreak:  "break-word",
          // Scroll long Socratic answers instead of truncating them (was a
          // 5-line clamp that silently hid content).
          maxHeight:  "120px",
          overflowY:  "auto",
        } as React.CSSProperties}>
          {text}
          {/* Streaming cursor */}
          {isLoading && text && (
            <span style={{ color: chip.color, animation: "blink 0.8s infinite" }}>▌</span>
          )}
        </p>
      )}
    </div>
  );
}

// ── Icon button component (consistent style for Mic & Send) ──────────────
function ActionButton({
  onClick, disabled = false, active = false, activeColor = "#cc0000",
  title, children, testId,
}: {
  onClick:      () => void;
  disabled?:    boolean;
  active?:      boolean;
  activeColor?: string;
  title:        string;
  children:     React.ReactNode;
  testId?:      string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      data-testid={testId}
      className="flex items-center justify-center rounded-xl font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        width:      "46px",
        height:     "46px",
        flexShrink: 0,
        background: active
          ? activeColor
          : "linear-gradient(135deg, rgba(0,102,204,0.6), rgba(0,70,140,0.8))",
        border:     `2px solid ${active ? activeColor : "rgba(0,140,255,0.5)"}`,
        color:      "#fff",
        fontSize:   "18px",
        boxShadow:  active ? `0 0 12px ${activeColor}88` : "none",
        animation:  active ? "pulse 1s infinite" : "none",
      }}
    >
      {children}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
export default function ChatInterface({
  condition,
  sessionId,
  taskContext,
  onNewMessage,
  onRingEarned,
  onRingLost,
  ringsCollected       = 0,
  timeRemainingSeconds = 600,
  taskCompleted        = false,
  ringMultiplier       = 1,
}: ChatInterfaceProps) {
  const [messages,          setMessages]          = useState<ChatMessage[]>([]);
  const [inputText,         setInputText]         = useState("");
  const [isLoading,         setIsLoading]         = useState(false);
  const [avatarState,       setAvatarState]       = useState<AvatarState>("idle");
  const [isSpeakingTTS,     setIsSpeakingTTS]     = useState(false);
  const [isListeningSTT,    setIsListeningSTT]    = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [streamingText,     setStreamingText]     = useState("");
  const [sttAvailable,      setSttAvailable]      = useState(false);
  const [sttError,          setSttError]          = useState<string | null>(null);
  const [soundUnlocked,     setSoundUnlocked]     = useState(false);
  const [showTranscript,    setShowTranscript]    = useState(false);
  const [connError,         setConnError]         = useState(false);

  const messagesEndRef      = useRef<HTMLDivElement>(null);
  const inputRef            = useRef<HTMLTextAreaElement>(null);
  const inactivityRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUserTextRef     = useRef("");
  const usedProactiveRef    = useRef<Set<string>>(new Set());
  const proactiveCountRef   = useRef(0);            // max 3 proactive messages
  const soundUnlockedRef    = useRef(false);         // always-current ref (avoids stale closure)
  const isConditionA        = condition === "A";
  const zone: 1 | 2        = taskContext?.taskId.includes("task-2") ? 2 : 1;

  // Keep soundUnlockedRef in sync with state
  useEffect(() => { soundUnlockedRef.current = soundUnlocked; }, [soundUnlocked]);

  // Pre-load assets
  useEffect(() => {
    preloadCheck();
    preloadSFX().catch(() => {});
    setSttAvailable(isSTTAvailable());
  }, []);

  // Reset proactivity counters on task change
  useEffect(() => {
    proactiveCountRef.current = 0;
    usedProactiveRef.current  = new Set();
  }, [taskContext?.taskId]);

  // Auto-dismiss STT errors
  useEffect(() => {
    if (!sttError) return;
    const t = setTimeout(() => setSttError(null), 5000);
    return () => clearTimeout(t);
  }, [sttError]);

  // Auto-scroll (Condition B only — Condition A has no scroll list)
  useEffect(() => {
    if (!isConditionA) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, streamingText, isConditionA]);

  // Welcome message
  useEffect(() => {
    const welcome: ChatMessage = {
      id:        "welcome",
      role:      "assistant",
      content:   isConditionA ? WELCOME_A : WELCOME_B,
      timestamp: Date.now(),
    };
    setMessages([welcome]);
    if (isConditionA) setAvatarState("idle");  // Sonic runs normally until user interacts
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (inactivityRef.current) clearTimeout(inactivityRef.current);
    };
  }, []);

  // ── Proactivity timer — reset on every user/Sonic message; max 3 fires ──
  // Uses refs for soundUnlocked to avoid stale closures inside setTimeout.
  // Does NOT auto-reschedule — the timer only resets when the user sends a
  // message or Sonic responds, which prevents an infinite looping chain.
  const MAX_PROACTIVE = 3;
  const scheduleProactiveMessage = useCallback(() => {
    if (!isConditionA || taskCompleted) return;
    if (proactiveCountRef.current >= MAX_PROACTIVE) return;
    if (inactivityRef.current) clearTimeout(inactivityRef.current);

    inactivityRef.current = setTimeout(() => {
      if (proactiveCountRef.current >= MAX_PROACTIVE) return;

      const msg = getProactiveMessage(taskContext?.taskId, usedProactiveRef.current);
      usedProactiveRef.current.add(msg);
      proactiveCountRef.current++;

      const proactiveMsg: ChatMessage = {
        id:        crypto.randomUUID(),
        role:      "assistant",
        content:   msg,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, proactiveMsg]);
      setAvatarState("encouraging");

      // Use ref (always current) — NOT the stale closure value
      if (soundUnlockedRef.current) {
        setIsSpeakingTTS(true);
        speak(
          msg, {},
          () => setIsSpeakingTTS(true),
          () => { setIsSpeakingTTS(false); setAvatarState("listening"); }
        ).catch(console.error);
      }
      // NO auto-reschedule here — timer resets only on next user/Sonic message
    }, 60_000);
  // soundUnlocked intentionally omitted from deps — we use soundUnlockedRef instead
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConditionA, taskCompleted, taskContext?.taskId]);

  // Start proactivity timer when session is active
  useEffect(() => {
    if (isConditionA && !taskCompleted) scheduleProactiveMessage();
    return () => { if (inactivityRef.current) clearTimeout(inactivityRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConditionA, taskCompleted]);

  // ── Unlock audio + speak welcome ──────────────────────────────────────
  const handleUnlockSound = useCallback(() => {
    setSoundUnlocked(true);
    preloadSFX().catch(() => {});
    setAvatarState("speaking");
    setIsSpeakingTTS(true);
    speak(
      WELCOME_A, {},
      () => setIsSpeakingTTS(true),
      () => {
        setIsSpeakingTTS(false);
        setAvatarState("listening");
      }
    ).catch(console.error);
  }, []);

  // ── Send message ───────────────────────────────────────────────────────
  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

      lastUserTextRef.current = text.trim();
      setConnError(false);

      // Reset inactivity timer on every send
      scheduleProactiveMessage();

      if (isConditionA && !soundUnlocked) {
        setSoundUnlocked(true);
      }

      if (isConditionA) playSFX("jump", 0.5);

      const userMessage: ChatMessage = {
        id:        crypto.randomUUID(),
        role:      "user",
        content:   text.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText("");
      setInterimTranscript("");
      setIsLoading(true);
      setStreamingText("");

      if (isConditionA) {
        stopSpeaking();
        // Instant pre-response reaction based on student's own words
        const sentiment = detectUserSentiment(text.trim());
        if (sentiment === "frustrated") {
          setAvatarState("empathetic");
          setTimeout(() => setAvatarState("thinking"), 650);
        } else if (sentiment === "positive") {
          setAvatarState("happy");
          setTimeout(() => setAvatarState("thinking"), 450);
        } else {
          setAvatarState("thinking");
        }
      }

      const sendStart = Date.now();

      try {
        const apiMessages = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: userMessage.role, content: userMessage.content },
        ].filter((m) => m.role !== "system");

        const response = await fetch("/api/chat", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ sessionId, condition, messages: apiMessages, taskContext }),
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
          id:             crypto.randomUUID(),
          role:           "assistant",
          content:        cleanText,
          timestamp:      Date.now(),
          latencyMs,
          totalResponseMs: Date.now() - sendStart,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingText("");

        if (isConditionA) {
          setAvatarState(finalAvatarState);
          if (finalAvatarState === "happy" || finalAvatarState === "encouraging") {
            // Answer is approaching the solution → award ring + SFX
            playSFX("ring", 0.7);
            onRingEarned?.();
          } else if (finalAvatarState === "empathetic") {
            // Answer off-track → Sonic takes a hit and loses rings
            playSFX("hurt", 0.6);
            onRingLost?.();
          }
          // "curious" / "thinking" / "idle" responses → no ring change
        }

        onNewMessage?.(assistantMessage, latencyMs);
        scheduleProactiveMessage(); // reset timer after Sonic responds

        // TTS
        if (isConditionA && cleanText) {
          setIsSpeakingTTS(true);
          speak(
            cleanText, {},
            () => setIsSpeakingTTS(true),
            () => {
              setIsSpeakingTTS(false);
              setAvatarState("listening");
            }
          ).catch(console.error);
        } else if (isConditionA) {
          setAvatarState("listening");
        }
      } catch {
        // Surface a friendly, retryable banner instead of a raw error bubble.
        if (isConditionA) playSFX("hurt", 0.5);
        setConnError(true);
        setStreamingText("");
        if (isConditionA) setAvatarState("idle");
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages, isLoading, sessionId, condition, taskContext, isConditionA, soundUnlocked, onNewMessage, onRingEarned, onRingLost, scheduleProactiveMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputText);
    }
  };

  const toggleSTT = () => {
    if (isListeningSTT) {
      // Commit any interim text before stopping so nothing is lost
      if (interimTranscript.trim()) {
        setInputText((prev) => prev + interimTranscript.trim() + " ");
      }
      stopListening();
      setIsListeningSTT(false);
      setInterimTranscript("");
      setSttError(null);
      if (isConditionA) setAvatarState("thinking");
    } else {
      setSttError(null);
      setIsListeningSTT(true);
      if (isConditionA) setAvatarState("listening");
      startListening(
        { lang: "es-ES", continuous: true },
        {
          onResult: (transcript, isFinal) => {
            if (isFinal) {
              // Append each finalized utterance — don't stop the indicator;
              // the user controls when to stop via the mic button.
              setInputText((prev) => prev + transcript + " ");
              setInterimTranscript("");
            } else {
              setInterimTranscript(transcript);
            }
          },
          onError: (error) => {
            setIsListeningSTT(false);
            setInterimTranscript("");
            if (isConditionA) setAvatarState("idle");
            setSttError(
              error === "not-allowed"      ? "Permiso de micrófono denegado."       :
              error === "device-not-found" ? "Micrófono no encontrado."             :
              error === "no-speech"        ? "No se detectó voz. Intenta de nuevo." :
              error === "not-supported"    ? "Voz no soportada en este navegador."  :
              error.includes("network")    ? "Error de red. Intenta de nuevo."      :
              `Error: ${error}`
            );
          },
          onEnd: () => {
            // Fires after stop() — clean up indicator and switch Sonic to thinking
            setIsListeningSTT(false);
            setInterimTranscript("");
            if (isConditionA) setAvatarState("thinking");
          },
        }
      );
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
  const lastUserMsg      = [...messages].reverse().find((m) => m.role === "user");
  const dialogueContent  = streamingText || lastAssistantMsg?.content || "";

  // ═══════════════════════════════════════════════════════════════════════
  // Condition A — immersive game layout
  // ═══════════════════════════════════════════════════════════════════════
  if (isConditionA) {
    return (
      <div
        className="flex flex-col h-full"
        style={{ background: "linear-gradient(180deg, #000d1a 0%, #0a0a1a 100%)" }}
        data-testid="chat-interface"
        data-condition={condition}
      >
        {/* ── AVATAR ZONE (large — ~60% of panel height) ──────────────── */}
        <div
          className="relative flex-[3] min-h-0 overflow-hidden"
          style={{ borderBottom: "3px solid #0066cc" }}
        >
          <SonicGameCanvas
            avatarState={avatarState}
            isSpeaking={isSpeakingTTS}
            ringsCollected={ringsCollected}
            timeRemainingSeconds={timeRemainingSeconds}
            taskCompleted={taskCompleted}
            zone={zone}
            className="w-full h-full"
          />

          {/* Multiplier badge — sits below transcript toggle so they don't clash */}
          {ringMultiplier > 1 && (
            <div
              className="absolute top-10 left-2 z-10 px-2 py-1 rounded-lg font-mono font-black animate-pulse"
              style={{
                background: ringMultiplier >= 3 ? "#ff4400" : "#ff8800",
                color:      "#000",
                fontSize:   "12px",
                boxShadow:  `0 0 12px ${ringMultiplier >= 3 ? "#ff4400" : "#ffcc00"}`,
              }}
            >
              x{ringMultiplier} COMBO!
            </div>
          )}

          {/* Transcript toggle — left side so it never covers the ring counter (top-right) */}
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="absolute top-2 left-2 z-20 px-2 py-1 rounded-lg font-mono text-xs"
            style={{ background: "rgba(0,10,30,0.8)", border: "1px solid #0066cc", color: "#88ccff" }}
            data-testid="transcript-toggle"
            title="Ver conversación completa"
          >
            [=] Historial
          </button>

          {/* Transcript overlay — full conversation history */}
          {showTranscript && (
            <div className="absolute inset-0 z-30 flex flex-col" style={{ background: "rgba(0,4,16,0.96)" }}>
              <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: "#0066cc" }}>
                <span className="font-mono text-sm font-bold" style={{ color: "#ffcc00" }}>Conversación</span>
                <button onClick={() => setShowTranscript(false)} className="font-mono text-xs px-2 py-1 rounded" style={{ background: "#0066cc", color: "#fff" }}>
                  ✕ Cerrar
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2" data-testid="transcript-list">
                {messages.map((m) => (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className="max-w-[85%] px-3 py-2 rounded-xl text-xs font-mono whitespace-pre-wrap"
                      style={{
                        background: m.role === "user" ? "rgba(26,0,102,0.8)" : "#13132a",
                        border: m.role === "user" ? "1px solid #6633ff" : "1px solid #333355",
                        color: "#fff",
                      }}
                    >
                      <span style={{ color: m.role === "user" ? "#aa99ff" : "#88aacc" }}>
                        {m.role === "user" ? "Tú" : "Sonic"}:{" "}
                      </span>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Game dialogue box at bottom of canvas */}
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <DialogueBox
              text={dialogueContent}
              avatarState={avatarState}
              isLoading={isLoading}
            />
          </div>

          {/* PRESS START overlay */}
          {!soundUnlocked && (
            <div
              className="absolute inset-0 flex items-center justify-center z-20"
              style={{ background: "rgba(0,5,15,0.82)", backdropFilter: "blur(3px)" }}
            >
              <button onClick={handleUnlockSound} className="flex flex-col items-center gap-3">
                <span
                  className="font-black text-3xl tracking-widest animate-bounce"
                  style={{ color: "#ffcc00", fontFamily: "'Courier New', monospace", textShadow: "0 0 20px rgba(255,204,0,0.8)" }}
                >
                  SONIC
                </span>
                <span
                  className="font-bold text-sm px-6 py-2 rounded-full animate-pulse"
                  style={{
                    background: "linear-gradient(90deg, #ffcc00, #ff8c00)",
                    color:      "black",
                    fontFamily: "'Courier New', monospace",
                    boxShadow:  "0 0 24px rgba(255,204,0,0.6)",
                    letterSpacing: "0.1em",
                  }}
                >
                  ▶ PRESS START
                </span>
                <span className="text-white/40 text-xs font-mono">click para activar voz</span>
              </button>
            </div>
          )}
        </div>

        {/* ── INPUT ZONE (compact — ~40% of panel height) ─────────────── */}
        <div
          className="flex-[2] flex flex-col min-h-0 px-3 pt-2 pb-3 gap-2"
          style={{ background: "rgba(0,2,12,0.6)" }}
        >
          {/* Echo of last user message */}
          {lastUserMsg && !isLoading && (
            <div className="flex justify-end">
              <div
                className="max-w-[90%] px-3 py-1.5 text-xs font-mono text-white rounded-xl"
                style={{ background: "rgba(26,0,102,0.7)", border: "1px solid rgba(102,51,255,0.4)" }}
                title={lastUserMsg.content}
              >
                <span style={{ color: "rgba(255,255,255,0.35)", marginRight: "6px" }}>Tú:</span>
                {lastUserMsg.content.length > 90
                  ? lastUserMsg.content.slice(0, 90) + "…"
                  : lastUserMsg.content}
              </div>
            </div>
          )}

          {/* STT error */}
          {sttError && (
            <div className="text-xs text-red-300 px-3 py-1.5 rounded-lg font-mono" style={{ background: "#2a0000", border: "1px solid #ff4444" }}>
              ⚠ {sttError}
            </div>
          )}

          {/* Connection error — friendly retry */}
          {connError && (
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-mono" style={{ background: "#2a1500", border: "1px solid #ffaa00", color: "#ffcc88" }} data-testid="conn-error">
              <span>⚠ Sonic perdió la conexión.</span>
              <button onClick={() => sendMessage(lastUserTextRef.current)} className="px-2 py-0.5 rounded font-bold" style={{ background: "#ffaa00", color: "#000" }}>
                Reintentar
              </button>
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2 items-center mt-auto">
            {/* Textarea */}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText + interimTranscript}
                onChange={(e) => { if (!isListeningSTT) setInputText(e.target.value); }}
                onKeyDown={handleKeyDown}
                placeholder={isListeningSTT ? "Escuchando…" : "Escribe o usa el micrófono… (Enter envía)"}
                rows={2}
                disabled={isLoading}
                className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white outline-none transition-all font-mono disabled:opacity-50"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border:     `1px solid ${isListeningSTT ? "#ff4444" : "#0066cc"}`,
                  caretColor: "#ffcc00",
                }}
                data-testid="chat-input"
              />
              {isListeningSTT && (
                <div className="absolute inset-0 rounded-xl pointer-events-none animate-pulse" style={{ border: "2px solid #ff4444", opacity: 0.6 }} />
              )}
            </div>

            {/* Mic button */}
            {sttAvailable && (
              <ActionButton
                onClick={toggleSTT}
                active={isListeningSTT}
                activeColor="#cc0000"
                title={isListeningSTT ? "Detener grabación" : "Hablar con Sonic"}
                testId="mic-button"
              >
                {isListeningSTT ? "⏹" : "🎤"}
              </ActionButton>
            )}

            {/* Send button */}
            <button
              onClick={() => sendMessage(inputText)}
              disabled={isLoading || !inputText.trim()}
              title="Enviar mensaje"
              data-testid="send-button"
              className="flex items-center justify-center rounded-xl font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                width:      "46px",
                height:     "46px",
                flexShrink: 0,
                background: "linear-gradient(135deg, #ffcc00, #ff8c00)",
                border:     "2px solid #ffcc0099",
                color:      "#000",
                fontSize:   "20px",
                boxShadow:  "0 3px 0 #cc6600",
              }}
            >
              ➤
            </button>
          </div>

          {/* Status bar */}
          <div className="flex items-center gap-3 text-xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
            <span>🎮 {sessionId.slice(0, 8)}</span>
            <span>·</span>
            <span style={{ color: soundUnlocked ? "#4caf50" : "#f59e0b" }}>
              🔊 {soundUnlocked ? "ON" : "▶ START"}
            </span>
            <span>·</span>
            <span style={{ color: sttAvailable ? "#4caf50" : "#f44336" }}>
              STT {sttAvailable ? "✓" : "✗"}
            </span>
            <span>·</span>
            <span>Zona {zone}</span>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // Condition B — classic chat layout (unchanged)
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div
      className="flex flex-col h-full relative"
      style={{ background: "#0f0f1a" }}
      data-testid="chat-interface"
      data-condition={condition}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "#1a2a3a", background: "rgba(0,0,0,0.5)" }}>
        <div className="flex items-center gap-2">
          <span className="text-white font-mono text-sm font-bold">[SONIC] Chat Socrático</span>
          <span className="text-white/40 text-xs ml-auto">Condición B</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="messages-container" role="log" aria-live="polite">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`} data-testid={`message-${msg.role}`}>
            <div
              className="max-w-[80%] px-4 py-3"
              style={{
                borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                background:   msg.role === "user" ? "linear-gradient(135deg, #1a0066, #3300cc)" : "#1e1e3a",
                border:       msg.role === "user" ? "2px solid #6633ff" : "1px solid #333355",
              }}
            >
              {msg.role === "assistant" && (
                <div className="text-xs font-mono mb-1" style={{ color: "#88aacc" }}>[SONIC]</div>
              )}
              <p className="text-sm leading-relaxed text-white whitespace-pre-wrap">{msg.content}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs opacity-30">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}

        {streamingText && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-[80%] px-4 py-3" style={{ borderRadius: "18px 18px 18px 4px", background: "#1e1e3a", border: "1px solid #333355" }}>
              <div className="text-xs font-mono mb-1" style={{ color: "#88aacc" }}>[SONIC]</div>
              <p className="text-sm leading-relaxed text-white">{streamingText}</p>
              <span className="inline-block w-2 h-4 ml-1 animate-blink" style={{ background: "#88aacc" }} />
            </div>
          </div>
        )}

        {isLoading && !streamingText && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl" style={{ background: "#1e1e3a", border: "1px solid #333355" }}>
              <div className="text-xs font-mono mb-1" style={{ color: "#88aacc" }}>[SONIC]</div>
              <div className="flex gap-1 items-center">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="w-2 h-2 rounded-full animate-bounce" style={{ background: "#88aacc", animationDelay: `${i * 0.15}s` }} />
                ))}
                <span className="text-xs text-white/40 ml-2 font-mono">pensando…</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t" style={{ borderColor: "#1a2a3a", background: "rgba(0,0,0,0.4)" }}>
        {connError && (
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-mono mb-2" style={{ background: "#2a1500", border: "1px solid #ffaa00", color: "#ffcc88" }} data-testid="conn-error">
            <span>⚠ Se perdió la conexión con el tutor.</span>
            <button onClick={() => sendMessage(lastUserTextRef.current)} className="px-2 py-0.5 rounded font-bold" style={{ background: "#ffaa00", color: "#000" }}>
              Reintentar
            </button>
          </div>
        )}
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={inputText + interimTranscript}
              onChange={(e) => { if (!isListeningSTT) setInputText(e.target.value); }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta… (Enter para enviar)"
              rows={2}
              disabled={isLoading}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white outline-none transition-all font-mono disabled:opacity-50"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid #333355", caretColor: "#88aacc" }}
              data-testid="chat-input"
            />
          </div>
          <button
            onClick={() => sendMessage(inputText)}
            disabled={isLoading || !inputText.trim()}
            className="flex items-center justify-center rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ width: "46px", height: "46px", background: "linear-gradient(135deg, #88aacc, #4488aa)", color: "white", border: "2px solid #4488aa99", fontSize: "20px", boxShadow: "0 3px 0 #336688" }}
            data-testid="send-button"
            aria-label="Enviar mensaje"
          >
            ➤
          </button>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
          <span>🎮 {sessionId.slice(0, 8)}</span>
          <span>· Cond. B</span>
        </div>
      </div>
    </div>
  );
}
