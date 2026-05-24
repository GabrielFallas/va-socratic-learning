import { NextRequest, NextResponse } from "next/server";

const SPEECH_API = process.env.SPEECH_API_URL ?? "http://localhost:5001";

function removeEmojis(text: string): string {
  return text
    .replace(/[\p{Emoji}\p{Emoji_Component}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/gu, "")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cleanText = removeEmojis(body.text);
    const response = await fetch(`${SPEECH_API}/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleanText, speed: body.speed ?? 1.0 }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `TTS proxy error: ${err}` },
      { status: 500 }
    );
  }
}
