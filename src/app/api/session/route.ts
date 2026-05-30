import { NextRequest, NextResponse } from "next/server";
import {
  initSession,
  closeSession,
  getSessionSummary,
  logTaskResult,
  logQuestionnaire,
  getAllSessions,
} from "@/server/telemetry/logger";
import { assignNext } from "@/server/experiment/assignment";
import type { TaskResult, QuestionnaireResponse } from "@/shared/types/session";

export const runtime = "nodejs"; // file-based store needs the Node fs API

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, sessionId, condition, taskResult, questionnaire } = body;

  switch (action) {
    // Counterbalanced allocation: server picks participantId + condition and
    // inits the session atomically, so the participant never chooses (no bias)
    // and balance is guaranteed per block.
    case "assign": {
      const assignment = assignNext();
      const session = initSession(assignment.participantId, assignment.condition);
      return NextResponse.json({
        ok: true,
        sessionId: session.sessionId,
        condition: assignment.condition,
        ordinal: assignment.ordinal,
      });
    }

    case "init": {
      const session = initSession(sessionId, condition);
      return NextResponse.json({ ok: true, sessionId: session.sessionId });
    }

    case "close": {
      const session = closeSession(sessionId);
      return NextResponse.json({ ok: true, summary: session });
    }

    case "log-task": {
      logTaskResult(sessionId, taskResult as TaskResult);
      return NextResponse.json({ ok: true });
    }

    case "log-questionnaire": {
      logQuestionnaire(sessionId, {
        ...(questionnaire as QuestionnaireResponse),
        submittedAt: Date.now(),
      });
      return NextResponse.json({ ok: true });
    }

    case "summary": {
      const summary = getSessionSummary(sessionId);
      return NextResponse.json({ ok: true, summary });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
  // Facilitator listing: GET /api/session?list=1 → all sessions (summary form).
  if (req.nextUrl.searchParams.get("list")) {
    const rows = getAllSessions().map((s) => {
      const ttfts = s.messages
        .filter((m) => m.role === "assistant" && m.latencyMs !== undefined)
        .map((m) => m.latencyMs as number);
      return {
        sessionId: s.sessionId,
        condition: s.condition,
        startTime: s.startTime,
        endTime: s.endTime ?? null,
        turns: s.messages.filter((m) => m.role === "user").length,
        tasksResolved: s.taskResults.filter((t) => t.resolvedAutonomously).length,
        tasksTotal: s.taskResults.length,
        avgTtftMs: ttfts.length ? Math.round(ttfts.reduce((a, b) => a + b, 0) / ttfts.length) : 0,
        questionnaires: Object.keys(s.questionnaires ?? {}).length,
      };
    });
    return NextResponse.json({ ok: true, sessions: rows });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "sessionId required" }, { status: 400 });
  }

  const summary = getSessionSummary(sessionId);
  if (!summary) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, summary });
}
