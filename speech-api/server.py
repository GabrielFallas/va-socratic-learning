"""
Speech API — VA Socratic Learning
Provides TTS (espeak-ng) and STT (faster-whisper) endpoints
for the Ada tutoring assistant.

Endpoints:
  GET  /health       — liveness probe
  POST /tts          — text → WAV audio  (JSON body: {text, lang?, speed?})
  POST /stt          — WAV audio → transcript  (multipart: audio file)
"""

import io
import os
import subprocess
import tempfile
from contextlib import asynccontextmanager

import numpy as np
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────
# Whisper model — loaded once at startup
# ─────────────────────────────────────────────────────────────
whisper_model = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the Whisper STT model before serving requests."""
    global whisper_model
    try:
        from faster_whisper import WhisperModel
        print("[speech-api] Loading faster-whisper 'base' model …", flush=True)
        whisper_model = WhisperModel(
            "base",
            device="cpu",
            compute_type="int8",
            download_root="/tmp/whisper-models",
        )
        print("[speech-api] Whisper model ready ✓", flush=True)
    except Exception as exc:
        print(f"[speech-api] WARNING: Could not load Whisper model: {exc}", flush=True)
    yield
    # shutdown — nothing to clean up


# ─────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────
app = FastAPI(title="VA Socratic Learning — Speech API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "speech-api",
        "whisper_loaded": whisper_model is not None,
    }


# ─────────────────────────────────────────────────────────────
# TTS — Text → WAV via espeak-ng
# ─────────────────────────────────────────────────────────────
class TTSRequest(BaseModel):
    text: str
    lang: str = "es"          # es | en | …
    speed: float = 1.0        # 0.5 – 2.0 relative to default 160 wpm


@app.post("/tts", response_class=Response)
async def text_to_speech(request: TTSRequest):
    """
    Convert text to speech using espeak-ng.
    Returns raw WAV audio (audio/wav).
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")

    # espeak-ng language codes: es, en, fr, …
    lang_map = {"es": "es", "en": "en", "fr": "fr", "pt": "pt"}
    espeak_lang = lang_map.get(request.lang[:2], "es")
    words_per_min = int(160 * max(0.3, min(request.speed, 3.0)))

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            [
                "espeak-ng",
                "-v", espeak_lang,
                "-s", str(words_per_min),
                "-w", tmp_path,
                request.text,
            ],
            capture_output=True,
            timeout=30,
        )
        if result.returncode != 0:
            err = result.stderr.decode(errors="replace")
            raise HTTPException(status_code=500, detail=f"espeak-ng error: {err}")

        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()

        return Response(content=audio_bytes, media_type="audio/wav")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ─────────────────────────────────────────────────────────────
# STT — Audio file → transcript via faster-whisper
# ─────────────────────────────────────────────────────────────
@app.post("/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    """
    Transcribe uploaded audio (WAV / WebM / MP3 …) using faster-whisper.
    Returns JSON: {transcript, language, language_probability}
    """
    if whisper_model is None:
        raise HTTPException(status_code=503, detail="Whisper model not loaded yet; retry in a moment")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Write to temp file (faster-whisper needs a path)
    suffix = os.path.splitext(audio.filename or ".wav")[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        segments, info = whisper_model.transcribe(
            tmp_path,
            language="es",
            beam_size=5,
        )
        transcript = " ".join(seg.text for seg in segments).strip()
        return {
            "transcript": transcript,
            "language": info.language,
            "language_probability": round(info.language_probability, 3),
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Transcription error: {exc}")
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


# ─────────────────────────────────────────────────────────────
# Entrypoint (for local testing outside Docker)
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=5001, reload=False)
