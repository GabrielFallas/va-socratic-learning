import { NextRequest, NextResponse } from "next/server";

const SPEECH_API = process.env.SPEECH_API_URL ?? "http://localhost:5001";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const response = await fetch(`${SPEECH_API}/stt`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err }, { status: response.status });
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: `STT proxy error: ${err}` },
      { status: 500 }
    );
  }
}
