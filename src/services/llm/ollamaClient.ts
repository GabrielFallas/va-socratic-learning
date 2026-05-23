import type { AvatarState, MessageRole } from "@/shared/types/session";

// ============================================================
// Ollama Local LLM Client — Gemma 3 12B
// Replaces Gemini cloud dependency with a fully local inference
// server running on the project host via Docker + NVIDIA GPU.
//
// Model: gemma3:12b (Q4_K_M ~7.3 GB, fits in RTX 5070 Ti 16 GB)
// API:   Ollama native HTTP API (http://localhost:11434)
// Auth:  None required — local-only endpoint
// ============================================================

const OLLAMA_BASE_URL =
  process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";

const OLLAMA_MODEL =
  process.env.OLLAMA_MODEL ?? "gemma3:12b";

// Generation parameters tuned for the Ada tutoring use-case:
//   - num_predict: cap at 300 tokens (short, focused Socratic responses)
//   - temperature: 0.7 for measured creativity
//   - top_p: 0.9 nucleus sampling
//   - num_ctx: 4096 context window (sufficient for multi-turn chat)
const GENERATION_OPTIONS = {
  num_predict: 300,
  temperature: 0.7,
  top_p: 0.9,
  num_ctx: 4096,
};

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface OllamaStreamChunk {
  model: string;
  created_at: string;
  message: { role: string; content: string };
  done: boolean;
  // Present only on the final chunk (done: true)
  total_duration?: number;
  eval_count?: number;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Extract the avatar state tag from Ada's response.
 * Pattern: [AVATAR_STATE:state_name]
 */
export function extractAvatarState(text: string): {
  cleanText: string;
  avatarState: AvatarState;
} {
  const match = text.match(/\[AVATAR_STATE:(\w+)\]/);
  const avatarState = (match?.[1] as AvatarState) ?? "speaking";
  const cleanText = text.replace(/\[AVATAR_STATE:\w+\]\s*/g, "").trim();
  return { cleanText, avatarState };
}

/**
 * Map our internal MessageRole to the Ollama role format.
 * Ollama /api/chat accepts "system" | "user" | "assistant".
 */
function toOllamaRole(role: MessageRole): OllamaMessage["role"] {
  if (role === "assistant") return "assistant";
  if (role === "system") return "system";
  return "user";
}

/**
 * Build the Ollama message array from our chat history.
 * The system prompt is prepended as the first system message.
 */
function buildOllamaMessages(
  systemPrompt: string,
  messages: Array<{ role: MessageRole; content: string }>
): OllamaMessage[] {
  return [
    { role: "system", content: systemPrompt },
    ...messages
      .filter((m) => m.role !== "system") // already injected above
      .map((m) => ({
        role: toOllamaRole(m.role),
        content: m.content,
      })),
  ];
}

// ─────────────────────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────────────────────

/**
 * Verify Ollama is reachable before making inference requests.
 * Throws a descriptive error if the server is unavailable.
 */
export async function checkOllamaHealth(): Promise<void> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      throw new Error(`Ollama returned HTTP ${res.status}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Ollama server unreachable at ${OLLAMA_BASE_URL}. ` +
        `Is the Docker container running? (docker ps | grep ollama). Detail: ${msg}`
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Streaming inference
// ─────────────────────────────────────────────────────────────

/**
 * Send a chat message to the local Ollama server and stream the response.
 * Yields text chunks as they arrive from the model.
 *
 * Uses the Ollama /api/chat NDJSON streaming endpoint:
 *   - Each line is a JSON object with .message.content (partial token)
 *   - The final line has .done = true and timing metadata
 */
export async function* streamChatResponse(params: {
  systemPrompt: string;
  messages: Array<{ role: MessageRole; content: string }>;
}): AsyncGenerator<string> {
  const ollamaMessages = buildOllamaMessages(
    params.systemPrompt,
    params.messages
  );

  const body = JSON.stringify({
    model: OLLAMA_MODEL,
    messages: ollamaMessages,
    stream: true,
    options: GENERATION_OPTIONS,
  });

  let res: Response;
  try {
    res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      // No global timeout — streaming can take variable time; the
      // per-request abort is handled by the caller (Next.js 30s limit).
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Failed to connect to Ollama at ${OLLAMA_BASE_URL}. ` +
        `Make sure the container is running: docker start ollama. Detail: ${msg}`
    );
  }

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `Ollama API error ${res.status}: ${errText || res.statusText}`
    );
  }

  if (!res.body) {
    throw new Error("Ollama returned no response body");
  }

  // Read the NDJSON stream line by line
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process every complete line
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? ""; // keep the incomplete last line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let chunk: OllamaStreamChunk;
      try {
        chunk = JSON.parse(trimmed) as OllamaStreamChunk;
      } catch {
        // Malformed JSON line — skip silently
        continue;
      }

      if (chunk.message?.content) {
        yield chunk.message.content;
      }

      if (chunk.done) {
        // Log inference stats (helpful for latency debugging)
        if (chunk.total_duration && chunk.eval_count) {
          const ttMs = Math.round(chunk.total_duration / 1_000_000);
          const tps = Math.round(
            chunk.eval_count / (chunk.total_duration / 1e9)
          );
          console.info(
            `[ollamaClient] ${OLLAMA_MODEL} | total=${ttMs}ms | tokens=${chunk.eval_count} | ${tps} tok/s`
          );
        }
        return;
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────
// Non-streaming wrapper (used by unit tests)
// ─────────────────────────────────────────────────────────────

/**
 * Collect the full streaming response and return it with latency metadata.
 * Matches the interface previously exposed by geminiClient.getChatResponse.
 */
export async function getChatResponse(params: {
  systemPrompt: string;
  messages: Array<{ role: MessageRole; content: string }>;
}): Promise<{ text: string; latencyMs: number; avatarState: AvatarState }> {
  const start = Date.now();

  let fullText = "";
  for await (const chunk of streamChatResponse(params)) {
    fullText += chunk;
  }

  const { cleanText, avatarState } = extractAvatarState(fullText);

  return {
    text: cleanText,
    latencyMs: Date.now() - start,
    avatarState,
  };
}
