import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import type { AvatarState, MessageRole } from "@/shared/types/session";

// ============================================================
// Gemini Flash Client
// Free tier: 15 RPM, 1M TPM — sufficient for MVP pilot
// Model fallback chain: gemini-2.0-flash → gemini-1.5-flash
// ============================================================

// Model priority list — falls back on quota exhaustion or model not found.
// Verified available via ListModels for this API key (2026-05-22).
const MODEL_FALLBACK_CHAIN = [
  "gemini-2.0-flash",       // Primary: 2.0 Flash (15 RPM / 1500 RPD free tier)
  "gemini-2.0-flash-lite",  // Fallback 1: lighter, separate quota pool
  "gemini-2.5-flash",       // Fallback 2: newest Flash generation
  "gemini-flash-latest",    // Fallback 3: alias for current Flash
];

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY not set. Copy .env.local.example to .env.local and add your key."
    );
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Parse retryDelay from a Gemini 429 error message (in seconds)
 */
function parseRetryDelay(error: unknown): number {
  const msg = error instanceof Error ? error.message : String(error);
  const match = msg.match(/Please retry in ([\d.]+)s/);
  return match ? Math.ceil(parseFloat(match[1]) * 1000) : 5000;
}

/**
 * Returns true if the error is a 429 rate-limit error
 */
function is429(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return msg.includes("429") || msg.includes("Too Many Requests") || msg.includes("quota");
}

const SAFETY_SETTINGS = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
];

/**
 * Extract the avatar state tag from Ada's response
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
 * Build the Gemini history from our message format.
 * Strips leading 'model' messages because Gemini requires history to start with 'user'.
 */
function buildHistory(messages: Array<{ role: MessageRole; content: string }>) {
  const raw = messages
    .slice(0, -1)
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  // Drop leading 'model' turns (e.g. UI welcome message before first user turn)
  while (raw.length > 0 && raw[0].role === "model") raw.shift();
  return raw;
}

/**
 * Send a chat message to Gemini Flash and get a streaming response.
 * Returns an async generator of text chunks.
 * Automatically retries with RPM back-off and falls back through model chain on daily quota exhaustion.
 */
export async function* streamChatResponse(params: {
  systemPrompt: string;
  messages: Array<{ role: MessageRole; content: string }>;
}): AsyncGenerator<string> {
  const client = getClient();
  const history = buildHistory(params.messages);
  const lastMessage = params.messages[params.messages.length - 1];

  let lastError: unknown;

  for (const modelName of MODEL_FALLBACK_CHAIN) {
    // Per-model: up to 2 retries (for RPM, not daily limit)
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        // systemInstruction must be set at model level (not startChat) in Gemini SDK v0.21+
        const model = client.getGenerativeModel({
          model: modelName,
          systemInstruction: params.systemPrompt,
          safetySettings: SAFETY_SETTINGS,
          generationConfig: {
            maxOutputTokens: 300,
            temperature: 0.7,
            topP: 0.9,
          },
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessageStream(lastMessage.content);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) yield text;
        }

        return; // success — exit generator
      } catch (err) {
        lastError = err;

        const errMsg = String(err);

        if (is429(err)) {
          const delayMs = parseRetryDelay(err);
          const isDaily = errMsg.includes("PerDay") || errMsg.includes("limit: 0");
          if (isDaily || attempt >= 1) {
            // Daily quota exhausted, or second attempt also rate-limited → next model
            console.warn(`[geminiClient] Quota exhausted for ${modelName}, trying next model.`);
            break;
          }
          // RPM rate limit — wait and retry same model once
          console.warn(`[geminiClient] 429 RPM on ${modelName}, retrying in ${delayMs}ms`);
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        if (errMsg.includes("404") || errMsg.includes("not found") || errMsg.includes("not supported")) {
          // Model unavailable — try next in chain immediately
          console.warn(`[geminiClient] Model ${modelName} not available, trying next model.`);
          break;
        }

        // Unexpected error — rethrow immediately
        throw err;
      }
    }
  }

  // All models exhausted
  throw lastError ?? new Error("All Gemini models failed");
}

/**
 * Non-streaming version for testing
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
