import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
} from "@google/generative-ai";
import type { AvatarState, MessageRole } from "@/shared/types/session";

// ============================================================
// Gemini Flash Client
// Free tier: 15 RPM, 1M TPM — sufficient for MVP pilot
// ============================================================

const getClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY not set. Copy .env.local.example to .env.local and add your key."
    );
  }
  return new GoogleGenerativeAI(apiKey);
};

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
 * Send a chat message to Gemini Flash and get a streaming response
 * Returns an async generator of text chunks
 */
export async function* streamChatResponse(params: {
  systemPrompt: string;
  messages: Array<{ role: MessageRole; content: string }>;
}): AsyncGenerator<string> {
  const client = getClient();
  const model = client.getGenerativeModel({
    model: "gemini-2.0-flash",
    safetySettings: SAFETY_SETTINGS,
    generationConfig: {
      maxOutputTokens: 300, // Keep responses brief per Ada's style
      temperature: 0.7,
      topP: 0.9,
    },
  });

  // Convert our message format to Gemini's format
  // Gemini uses 'user' and 'model' roles
  const history = params.messages
    .slice(0, -1) // All except the last message
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const lastMessage = params.messages[params.messages.length - 1];

  const chat = model.startChat({
    systemInstruction: params.systemPrompt,
    history,
  });

  const result = await chat.sendMessageStream(lastMessage.content);

  for await (const chunk of result.stream) {
    const text = chunk.text();
    if (text) yield text;
  }
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
