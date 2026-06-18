import { NextRequest, NextResponse } from "next/server";
import { getAllSessions } from "@/server/telemetry/logger";
import { sessionsToCsv, sessionsToTranscriptJsonl } from "@/server/telemetry/export";

export const runtime = "nodejs";

// GET /api/export?format=csv|json|transcripts
// Returns all persisted sessions for offline analysis. `transcripts` yields
// JSONL of conversation messages (real participants only) for qualitative coding.
export async function GET(req: NextRequest) {
  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const sessions = getAllSessions();
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

  if (format === "csv") {
    return new NextResponse(sessionsToCsv(sessions), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="sessions-${stamp}.csv"`,
      },
    });
  }

  if (format === "transcripts") {
    return new NextResponse(sessionsToTranscriptJsonl(sessions), {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Content-Disposition": `attachment; filename="transcripts-${stamp}.jsonl"`,
      },
    });
  }

  return new NextResponse(JSON.stringify(sessions, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="sessions-${stamp}.json"`,
    },
  });
}
