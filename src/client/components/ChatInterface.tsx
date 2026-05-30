"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage, Condition } from "@/shared/types/session";
import { speak, stopSpeaking, preloadCheck } from "@/services/tts/piperTTS";
import { startListening, stopListening, isSTTAvailable } from "@/services/stt/whisperSTT";

// Unified Socratic chat. The old Kaplay "Condition A" immersive layout was
// removed when Condition A became a playable Open Sonic zone (the chat now
// lives inside the in-game Debug Terminal overlay). `voice` enables neural TTS
// + speech input for the embodied (Condition A) overlay; Condition B is silent.

interface ChatInterfaceProps {
  condition: Condition;
  sessionId: string;
  taskContext?: {
    taskId: string;
    buggyCode: string;
    errorDescription: string;
  };
  onNewMessage?: (message: ChatMessage, latencyMs: number) => void;
  /** Speak the tutor's replies + offer a mic (Condition A embodiment). */
  voice?: boolean;
}

// Identical tutor content across conditions (embodiment must be the only diff).
const WELCOME_TEXT =
  "Hola. Vamos a resolver esto juntos sin que yo te dé la respuesta directamente. Mira el código: ¿qué observas en su comportamiento? Descríbelo con el mayor detalle que puedas.";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" });
}

export default function ChatInterface({
  condition,
  sessionId,
  taskContext,
  onNewMessage,
  voice = false,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [connError, setConnError] = useState(false);
  const [isListeningSTT, setIsListeningSTT] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [sttAvailable, setSttAvailable] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastUserTextRef = useRef("");

  useEffect(() => {
    if (voice) preloadCheck();
    setSttAvailable(voice && isSTTAvailable());
  }, [voice]);

  useEffect(() => {
    setMessages([{ id: "welcome", role: "assistant", content: WELCOME_TEXT, timestamp: Date.now() }]);
  }, []);

  useEffect(() => () => stopSpeaking(), []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  useEffect(() => {
    if (!sttError) return;
    const t = setTimeout(() => setSttError(null), 5000);
    return () => clearTimeout(t);
  }, [sttError]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;
      lastUserTextRef.current = text.trim();
      setConnError(false);

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
      if (voice) stopSpeaking();

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
        if (!response.ok || !response.body) throw new Error(`API error: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let latencyMs = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          for (const line of decoder.decode(value).split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.chunk) {
                accumulated += data.chunk;
                setStreamingText(accumulated.replace(/\[AVATAR_STATE:\w+\]\s*/g, ""));
              }
              if (data.done) latencyMs = data.ttftMs ?? data.latencyMs ?? 0;
              if (data.error) throw new Error(data.error);
            } catch {
              /* skip malformed line */
            }
          }
        }

        const cleanText = accumulated.replace(/\[AVATAR_STATE:\w+\]\s*/g, "").trim();
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
        onNewMessage?.(assistantMessage, latencyMs);
        if (voice && cleanText) speak(cleanText).catch(() => {});
      } catch {
        setConnError(true);
        setStreamingText("");
      } finally {
        setIsLoading(false);
      }
    },
    [messages, isLoading, sessionId, condition, taskContext, voice, onNewMessage]
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
      return;
    }
    setSttError(null);
    setIsListeningSTT(true);
    startListening(
      { lang: "es-ES" },
      {
        onResult: (transcript, isFinal) => {
          if (isFinal) {
            setInputText((prev) => prev + transcript + " ");
            setInterimTranscript("");
            setIsListeningSTT(false);
          } else {
            setInterimTranscript(transcript);
          }
        },
        onError: (error) => {
          setIsListeningSTT(false);
          setSttError(
            error === "not-allowed" ? "Permiso de micrófono denegado." :
            error === "device-not-found" ? "Micrófono no encontrado." :
            "Error de reconocimiento de voz."
          );
        },
        onEnd: () => { setIsListeningSTT(false); setInterimTranscript(""); },
      }
    );
  };

  return (
    <div className="flex flex-col h-full relative" style={{ background: "#0f0f1a" }} data-testid="chat-interface" data-condition={condition}>
      {/* Header */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "#1a2a3a", background: "rgba(0,0,0,0.5)" }}>
        <div className="flex items-center gap-2">
          <span className="text-white font-mono text-sm font-bold">[SONIC] Tutor Socrático</span>
          {voice && <span className="text-xs" style={{ color: "#4caf50" }}>🔊</span>}
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
                background: msg.role === "user" ? "linear-gradient(135deg, #1a0066, #3300cc)" : "#1e1e3a",
                border: msg.role === "user" ? "2px solid #6633ff" : "1px solid #333355",
              }}
            >
              {msg.role === "assistant" && <div className="text-xs font-mono mb-1" style={{ color: "#88aacc" }}>[SONIC]</div>}
              <p className="text-sm leading-relaxed text-white whitespace-pre-wrap">{msg.content}</p>
              <span className="text-xs opacity-30">{formatTime(msg.timestamp)}</span>
            </div>
          </div>
        ))}

        {streamingText && (
          <div className="flex justify-start animate-fade-in">
            <div className="max-w-[80%] px-4 py-3" style={{ borderRadius: "18px 18px 18px 4px", background: "#1e1e3a", border: "1px solid #333355" }}>
              <div className="text-xs font-mono mb-1" style={{ color: "#88aacc" }}>[SONIC]</div>
              <p className="text-sm leading-relaxed text-white whitespace-pre-wrap">{streamingText}</p>
              <span className="inline-block w-2 h-4 ml-1 animate-blink" style={{ background: "#88aacc" }} />
            </div>
          </div>
        )}

        {isLoading && !streamingText && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl" style={{ background: "#1e1e3a", border: "1px solid #333355" }}>
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
            <button onClick={() => sendMessage(lastUserTextRef.current)} className="px-2 py-0.5 rounded font-bold" style={{ background: "#ffaa00", color: "#000" }}>Reintentar</button>
          </div>
        )}
        {sttError && (
          <div className="text-xs px-3 py-1.5 rounded-lg font-mono mb-2" style={{ background: "#2a0000", border: "1px solid #ff4444", color: "#ffaaaa" }}>⚠ {sttError}</div>
        )}
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={inputText + interimTranscript}
            onChange={(e) => { if (!isListeningSTT) setInputText(e.target.value); }}
            onKeyDown={handleKeyDown}
            placeholder={isListeningSTT ? "Escuchando…" : "Escribe tu pregunta… (Enter para enviar)"}
            rows={2}
            disabled={isLoading}
            className="flex-1 resize-none rounded-xl px-4 py-3 text-sm text-white outline-none transition-all font-mono disabled:opacity-50"
            style={{ background: "rgba(255,255,255,0.07)", border: `1px solid ${isListeningSTT ? "#ff4444" : "#333355"}`, caretColor: "#88aacc" }}
            data-testid="chat-input"
          />
          {sttAvailable && (
            <button
              onClick={toggleSTT}
              title={isListeningSTT ? "Detener" : "Hablar"}
              data-testid="mic-button"
              className="flex items-center justify-center rounded-xl transition-all"
              style={{ width: 46, height: 46, flexShrink: 0, background: isListeningSTT ? "#cc0000" : "rgba(0,102,204,0.6)", border: `2px solid ${isListeningSTT ? "#cc0000" : "rgba(0,140,255,0.5)"}`, color: "#fff", fontSize: 18 }}
            >
              {isListeningSTT ? "⏹" : "🎤"}
            </button>
          )}
          <button
            onClick={() => sendMessage(inputText)}
            disabled={isLoading || !inputText.trim()}
            className="flex items-center justify-center rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ width: 46, height: 46, background: "linear-gradient(135deg, #88aacc, #4488aa)", color: "white", border: "2px solid #4488aa99", fontSize: 20, boxShadow: "0 3px 0 #336688" }}
            data-testid="send-button"
            aria-label="Enviar mensaje"
          >
            ➤
          </button>
        </div>
        <div className="flex items-center gap-3 mt-2 text-xs font-mono" style={{ color: "rgba(255,255,255,0.2)" }}>
          <span>🎮 {sessionId.slice(0, 8)}</span>
          <span>· Cond. {condition}</span>
        </div>
      </div>
    </div>
  );
}
