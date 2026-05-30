import { NextRequest, NextResponse } from "next/server";
import { streamChatResponse, extractAvatarState } from "@/services/llm/ollamaClient";
import { buildTaskSystemPrompt, BASE_TUTOR_PROMPT } from "@/prompts/tutor-system";
import { logMessage, getSession, initSession } from "@/server/telemetry/logger";
import type { ApiChatRequest } from "@/shared/types/session";

export const runtime = "nodejs";
// Local Gemma 12B can be slow to first token on CPU; allow headroom so a slow
// turn doesn't get cut off mid-stream.
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const start = Date.now();

  try {
    const body = (await req.json()) as ApiChatRequest;
    const { sessionId, condition, messages, taskContext } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 });
    }

    // Init session if first message
    if (!getSession(sessionId)) {
      initSession(sessionId, condition);
    }

    // Build system prompt — identical tutor text for both conditions;
    // Condition A additionally gets the avatar-control block (see tutor-system.ts).
    const systemPrompt = taskContext
      ? buildTaskSystemPrompt({ condition, ...taskContext })
      : BASE_TUTOR_PROMPT;

    // Stream the response
    const encoder = new TextEncoder();
    let fullText = "";
    // ttftMs = time-to-first-token (perceived latency — the RQ4 metric).
    // totalMs = full generation time. These are distinct and were previously
    // conflated; RQ4's "<1.5s" target is about TTFT, not total generation.
    let ttftMs = 0;

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChatResponse({ systemPrompt, messages })) {
            if (ttftMs === 0 && chunk.length > 0) ttftMs = Date.now() - start;
            fullText += chunk;
            // Send chunk as SSE
            const data = `data: ${JSON.stringify({ chunk })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          // Extract avatar state
          const { cleanText, avatarState } = extractAvatarState(fullText);
          const totalMs = Date.now() - start;
          // Back-compat: latencyMs now carries TTFT (the perceived-latency metric).
          const latencyMs = ttftMs;

          // Log the assistant message
          const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
          if (lastUserMsg) {
            logMessage(sessionId, {
              id: crypto.randomUUID(),
              role: "user",
              content: lastUserMsg.content,
              timestamp: start,
            });
          }

          logMessage(sessionId, {
            id: crypto.randomUUID(),
            role: "assistant",
            content: cleanText,
            timestamp: Date.now(),
            latencyMs,
            ttftMs,
            totalResponseMs: totalMs,
          });

          // Send final event with metadata
          const finalData = `data: ${JSON.stringify({
            done: true,
            fullText: cleanText,
            avatarState,
            latencyMs,
            ttftMs,
            totalMs,
          })}\n\n`;
          controller.enqueue(encoder.encode(finalData));
          controller.close();
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Unknown error";
          console.error("[API/chat] Stream error:", errorMsg);
          const errorData = `data: ${JSON.stringify({ error: errorMsg })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("[API/chat] Error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
