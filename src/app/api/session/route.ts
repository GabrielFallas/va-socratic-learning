import { NextRequest, NextResponse } from "next/server";
import {
  initSession,
  closeSession,
  getSessionSummary,
  logTaskResult,
} from "@/server/telemetry/logger";
import { assignNext } from "@/server/experiment/assignment";
import type { TaskResult } from "@/shared/types/session";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, sessionId, condition, taskResult } = body;

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

    case "summary": {
      const summary = getSessionSummary(sessionId);
      return NextResponse.json({ ok: true, summary });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}

export async function GET(req: NextRequest) {
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
