"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  ChatMessage,
  Condition,
  AvatarState,
} from "@/shared/types/session";
import AvatarSprite from "@/client/avatar/AvatarSprite";
import { speak, stopSpeaking, isTTSAvailable } from "@/services/tts/webSpeechTTS";
import {
  startListening,
  stopListening,
  isSTTAvailable,
} from "@/services/stt/webSpeechSTT";

// ============================================================
// Main Chat Interface
// Condition A: Shows avatar + enables TTS/STT
// Condition B: Text-only, no avatar, no voice
// ============================================================

interface ChatInterfaceProps {
  condition: Condition;
  sessionId: string;
  taskContext?: {
    taskId: string;
    buggyCode: string;
    errorDescription: string;
  };
  onNewMessage?: (message: ChatMessage, latencyMs: number) => void;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("es-CR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ChatInterface({
  condition,
  sessionId,
  taskContext,
  onNewMessage,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [isSpeakingTTS, setIsSpeakingTTS] = useState(false);
  const [isListeningSTT, setIsListeningSTT] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [ttsAvailable, setTtsAvailable] = useState(false);
  const [sttAvailable, setSttAvailable] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isConditionA = condition === "A";

  // Check TTS/STT availability after hydration
  useEffect(() => {
    setTtsAvailable(isTTSAvailable());
    setSttAvailable(isSTTAvailable());
  }, []);

  // Clear STT error after 5 seconds
  useEffect(() => {
    if (!sttError) return;
    const timer = setTimeout(() => setSttError(null), 5000);
    return () => clearTimeout(timer);
  }, [sttError]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Initial welcome message from Ada
  useEffect(() => {
    const welcome: ChatMessage = {
      id: "welcome",
      role: "assistant",
      content: isConditionA
        ? "Sistema Neural Nexus activado. Soy Ada, tu tutora socrática. Estoy aquí para guiarte, no para darte respuestas. ¿Cuál es el comportamiento que estás observando en tu código?"
        : "Hola, soy Ada. Estoy aquí para guiarte socráticamente — haré preguntas para que tú mismo encuentres la solución. ¿Qué comportamiento inesperado estás viendo en tu código?",
      timestamp: Date.now(),
    };
    setMessages([welcome]);

    if (isConditionA && ttsAvailable) {
      setAvatarState("speaking");
      setIsSpeakingTTS(true);
      speak(welcome.content, {}, () => setIsSpeakingTTS(true), () => {
        setIsSpeakingTTS(false);
        setAvatarState("listening");
      }).catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isLoading) return;

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
        // Build message history for API
        const apiMessages = [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: userMessage.role, content: userMessage.content },
        ].filter((m) => m.role !== "system");

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            condition,
            messages: apiMessages,
            taskContext,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let latencyMs = 0;
        let finalAvatarState: AvatarState = "speaking";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.chunk) {
                accumulated += data.chunk;
                // Remove avatar state tag from streaming display
                const displayText = accumulated.replace(
                  /\[AVATAR_STATE:\w+\]\s*/g,
                  ""
                );
                setStreamingText(displayText);

                if (isConditionA) setAvatarState("speaking");
              }

              if (data.done) {
                latencyMs = data.latencyMs;
                finalAvatarState = data.avatarState ?? "speaking";
              }

              if (data.error) throw new Error(data.error);
            } catch {
              // Skip malformed JSON lines
            }
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
        }

        onNewMessage?.(assistantMessage, latencyMs);

        // TTS playback for Condition A
        if (isConditionA && ttsAvailable && cleanText) {
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
        const errMsg =
          err instanceof Error ? err.message : "Error al conectar con Ada";
        const errorMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `⚠️ ${errMsg}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setStreamingText("");
        if (isConditionA) setAvatarState("idle");
      } finally {
        setIsLoading(false);
      }
    },
    [
      messages,
      isLoading,
      sessionId,
      condition,
      taskContext,
      isConditionA,
      ttsAvailable,
      onNewMessage,
    ]
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
        { lang: "es-ES", interimResults: true },
        {
          onResult: (transcript, isFinal) => {
            if (isFinal) {
              setInputText((prev) => prev + transcript + " ");
              setInterimTranscript("");
            } else {
              setInterimTranscript(transcript);
            }
          },
          onError: (error) => {
            console.error("STT error:", error);
            setIsListeningSTT(false);
            if (isConditionA) setAvatarState("idle");
            const errorMessage =
              error === "not-allowed"
                ? "Permiso de micrófono denegado. Por favor, permite el acceso al micrófono en tu navegador."
                : error === "network"
                ? "Error de conexión. Verifica tu conexión a internet."
                : `Error: ${error}`;
            setSttError(errorMessage);
          },
          onEnd: () => {
            setIsListeningSTT(false);
            setInterimTranscript("");
          },
        }
      );
    }
  };

  return (
    <div
      className={`flex flex-col h-full ${
        isConditionA
          ? "bg-gradient-to-b from-dark-silver to-mid-dark"
          : "bg-gray-900"
      }`}
      data-testid="chat-interface"
      data-condition={condition}
    >
      {/* Condition A: Avatar header */}
      {isConditionA && (
        <div className="flex items-center justify-center py-4 px-4 border-b border-white/10 bg-black/20">
          <AvatarSprite
            state={avatarState}
            isSpeaking={isSpeakingTTS}
            className="w-36"
          />
        </div>
      )}

      {/* Condition B: Simple header */}
      {!isConditionA && (
        <div className="px-4 py-3 border-b border-white/10 bg-black/30">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <span className="text-white font-mono text-sm font-bold">
              ADA — Chat Socrático
            </span>
            <span className="text-white/40 text-xs ml-auto">
              Condición B: Texto
            </span>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3"
        data-testid="messages-container"
        role="log"
        aria-live="polite"
        aria-label="Conversación con Ada"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            } animate-fade-in`}
            data-testid={`message-${msg.role}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-purple-600 text-white rounded-br-sm"
                  : isConditionA
                  ? "bg-gradient-to-r from-blue-900/80 to-purple-900/80 text-white border border-cyan-500/30 rounded-bl-sm"
                  : "bg-gray-700 text-white rounded-bl-sm"
              }`}
            >
              {msg.role === "assistant" && (
                <div
                  className={`text-xs font-mono mb-1 ${
                    isConditionA ? "text-cyan-400" : "text-gray-400"
                  }`}
                >
                  Ada
                </div>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs opacity-40">
                  {formatTime(msg.timestamp)}
                </span>
                {msg.latencyMs !== undefined && (
                  <span
                    className={`text-xs font-mono px-1 rounded ${
                      msg.latencyMs < 1500
                        ? "text-green-400/70"
                        : "text-red-400/70"
                    }`}
                    title="Latencia de respuesta"
                  >
                    {msg.latencyMs}ms
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Streaming text preview */}
        {streamingText && (
          <div className="flex justify-start animate-fade-in">
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 rounded-bl-sm ${
                isConditionA
                  ? "bg-gradient-to-r from-blue-900/80 to-purple-900/80 text-white border border-cyan-500/30"
                  : "bg-gray-700 text-white"
              }`}
            >
              <div
                className={`text-xs font-mono mb-1 ${
                  isConditionA ? "text-cyan-400" : "text-gray-400"
                }`}
              >
                Ada
              </div>
              <p className="text-sm leading-relaxed">{streamingText}</p>
              <span className="inline-block w-2 h-4 bg-cyan-400 animate-blink ml-1" />
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && !streamingText && (
          <div className="flex justify-start">
            <div
              className={`rounded-2xl px-4 py-3 rounded-bl-sm ${
                isConditionA
                  ? "bg-gradient-to-r from-blue-900/80 to-purple-900/80 border border-cyan-500/30"
                  : "bg-gray-700"
              }`}
            >
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div
        className={`p-4 border-t ${
          isConditionA ? "border-white/10 bg-black/30" : "border-gray-700 bg-gray-800"
        }`}
      >
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputText + interimTranscript}
              onChange={(e) => {
                if (!isListeningSTT) setInputText(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta o describe el problema... (Enter para enviar)"
              rows={2}
              disabled={isLoading}
              className={`w-full resize-none rounded-xl px-4 py-3 text-sm
                outline-none transition-all duration-200 font-mono
                ${
                  isConditionA
                    ? "bg-white/10 text-white border border-white/20 focus:border-cyan-400/50 placeholder-white/30"
                    : "bg-gray-700 text-white border border-gray-600 focus:border-gray-400 placeholder-gray-400"
                }
                ${isListeningSTT ? "border-red-400/70 bg-red-950/20" : ""}
                disabled:opacity-50`}
              data-testid="chat-input"
              aria-label="Mensaje para Ada"
            />
            {interimTranscript && (
              <div className="absolute bottom-2 right-2 text-xs text-white/30 italic">
                🎤 {interimTranscript}
              </div>
            )}
          </div>

          {/* Microphone button (Condition A only, if STT available) */}
          {isConditionA && sttAvailable && (
            <div className="relative">
              <button
                onClick={toggleSTT}
                className={`p-3 rounded-xl transition-all duration-200 ${
                  isListeningSTT
                    ? "bg-red-500 hover:bg-red-600 animate-pulse"
                    : "bg-white/10 hover:bg-white/20 border border-white/20"
                }`}
                aria-label={isListeningSTT ? "Detener grabación" : "Hablar con Ada"}
                title={isListeningSTT ? "Detener grabación" : "Hablar con Ada"}
                data-testid="mic-button"
              >
                <span className="text-lg">{isListeningSTT ? "⏹️" : "🎤"}</span>
              </button>
              {sttError && (
                <div className="absolute bottom-full right-0 mb-2 w-48 bg-red-950 border border-red-500/50 rounded-lg px-3 py-2 text-xs text-red-200 whitespace-normal">
                  {sttError}
                </div>
              )}
            </div>
          )}

          {/* Send button */}
          <button
            onClick={() => sendMessage(inputText)}
            disabled={isLoading || !inputText.trim()}
            className={`p-3 rounded-xl transition-all duration-200 font-bold
              ${
                isConditionA
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black disabled:opacity-40 disabled:cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            data-testid="send-button"
            aria-label="Enviar mensaje"
          >
            <span className="text-lg">➤</span>
          </button>
        </div>

        {/* Status bar */}
        <div className="flex items-center gap-3 mt-2 text-xs text-white/30 font-mono">
          <span>Sesión: {sessionId.slice(0, 8)}</span>
          <span>·</span>
          <span>Condición {condition}</span>
          {isConditionA && (
            <>
              <span>·</span>
              <span className={ttsAvailable ? "text-green-400/50" : "text-red-400/50"}>
                TTS: {ttsAvailable ? "✓" : "✗"}
              </span>
              <span>·</span>
              <span className={sttAvailable ? "text-green-400/50" : "text-red-400/50"}>
                STT: {sttAvailable ? "✓" : "✗"}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
