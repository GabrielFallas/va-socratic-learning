import { NextRequest, NextResponse } from "next/server";
import { streamChatResponse, extractAvatarState } from "@/services/llm/ollamaClient";
import { buildTaskSystemPrompt, ADA_SYSTEM_PROMPT } from "@/prompts/ada-system";
import { logMessage, getSession, initSession } from "@/server/telemetry/logger";
import type { ApiChatRequest } from "@/shared/types/session";

export const runtime = "nodejs";
export const maxDuration = 30;

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

    // Build system prompt — inject task context if present
    const systemPrompt = taskContext
      ? buildTaskSystemPrompt(taskContext)
      : ADA_SYSTEM_PROMPT;

    // Stream the response
    const encoder = new TextEncoder();
    let fullText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamChatResponse({ systemPrompt, messages })) {
            fullText += chunk;
            // Send chunk as SSE
            const data = `data: ${JSON.stringify({ chunk })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          // Extract avatar state
          const { cleanText, avatarState } = extractAvatarState(fullText);
          const latencyMs = Date.now() - start;

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
            totalResponseMs: Date.now() - start,
          });

          // Send final event with metadata
          const finalData = `data: ${JSON.stringify({
            done: true,
            fullText: cleanText,
            avatarState,
            latencyMs,
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
