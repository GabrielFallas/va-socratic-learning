"""
Speech API — VA Socratic Learning (Sonic Edition)
TTS: Piper TTS (high-quality Spanish neural voice)
STT: faster-whisper (local Whisper inference)

Endpoints:
  GET  /health       — liveness probe
  POST /tts          — text → WAV audio  (JSON body: {text, speed?})
  POST /stt          — audio → transcript  (multipart: audio file)
"""

import io
import os
import subprocess
import tempfile
import urllib.request
from contextlib import asynccontextmanager
from pathlib import Path

import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────
MODELS_DIR = Path("/models")
PIPER_MODEL = MODELS_DIR / "es_ES-davefx-medium.onnx"
PIPER_MODEL_JSON = MODELS_DIR / "es_ES-davefx-medium.onnx.json"

# HuggingFace URLs for the Spanish voice model
VOICE_BASE = "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium"
VOICE_ONNX_URL = f"{VOICE_BASE}/es_ES-davefx-medium.onnx"
VOICE_JSON_URL = f"{VOICE_BASE}/es_ES-davefx-medium.onnx.json"

whisper_model = None
piper_available = False


def download_piper_voice():
    """Download Piper Spanish voice model if not present."""
    global piper_available
    MODELS_DIR.mkdir(parents=True, exist_ok=True)

    if not PIPER_MODEL.exists():
        print("[speech-api] Downloading Piper Spanish voice (es_ES-davefx-medium)...", flush=True)
        try:
            urllib.request.urlretrieve(VOICE_ONNX_URL, PIPER_MODEL)
            print(f"[speech-api] Voice model downloaded: {PIPER_MODEL}", flush=True)
        except Exception as e:
            print(f"[speech-api] WARNING: Failed to download voice model: {e}", flush=True)
            return

    if not PIPER_MODEL_JSON.exists():
        try:
            urllib.request.urlretrieve(VOICE_JSON_URL, PIPER_MODEL_JSON)
        except Exception as e:
            print(f"[speech-api] WARNING: Failed to download voice config: {e}", flush=True)
            return

    # Verify piper binary is accessible
    try:
        result = subprocess.run(["piper", "--version"], capture_output=True, timeout=5)
        piper_available = True
        print("[speech-api] Piper TTS ready ✓", flush=True)
    except (FileNotFoundError, subprocess.TimeoutExpired) as e:
        print(f"[speech-api] WARNING: piper binary not found: {e}", flush=True)
        piper_available = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load models before serving requests."""
    global whisper_model

    # Load Whisper STT
    try:
        from faster_whisper import WhisperModel
        print("[speech-api] Loading faster-whisper 'base' model...", flush=True)
        whisper_model = WhisperModel(
            "base",
            device="cpu",
            compute_type="int8",
            download_root="/tmp/whisper-models",
        )
        print("[speech-api] Whisper model ready ✓", flush=True)
    except Exception as exc:
        print(f"[speech-api] WARNING: Could not load Whisper: {exc}", flush=True)

    # Download Piper voice model
    download_piper_voice()

    yield


# ─────────────────────────────────────────────────────────────
# App
# ─────────────────────────────────────────────────────────────
app = FastAPI(title="VA Socratic Learning — Speech API (Sonic Edition)", lifespan=lifespan)

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
        "tts_engine": "piper" if piper_available else "unavailable",
        "piper_voice": "es_ES-davefx-medium",
        "whisper_loaded": whisper_model is not None,
    }


# ─────────────────────────────────────────────────────────────
# TTS — Text → WAV via Piper TTS
# ─────────────────────────────────────────────────────────────
class TTSRequest(BaseModel):
    text: str
    speed: float = 1.0   # 0.5 – 2.0


@app.post("/tts", response_class=Response)
async def text_to_speech(request: TTSRequest):
    """
    Convert text to high-quality speech using Piper TTS.
    Returns WAV audio (audio/wav).
    """
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")

    if not piper_available:
        raise HTTPException(status_code=503, detail="Piper TTS not available")

    if not PIPER_MODEL.exists():
        raise HTTPException(status_code=503, detail="Voice model not downloaded yet")

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        # Piper reads from stdin, writes WAV to --output_file
        result = subprocess.run(
            [
                "piper",
                "--model", str(PIPER_MODEL),
                "--output_file", tmp_path,
                "--length_scale", str(max(0.5, min(2.0, 1.0 / request.speed))),
            ],
            input=request.text.encode("utf-8"),
            capture_output=True,
            timeout=60,
        )

        if result.returncode != 0:
            err = result.stderr.decode(errors="replace")
            raise HTTPException(status_code=500, detail=f"Piper error: {err}")

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
    Transcribe audio using faster-whisper (Spanish optimized).
    Returns JSON: {transcript, language, language_probability}
    """
    if whisper_model is None:
        raise HTTPException(status_code=503, detail="Whisper model not loaded yet; retry in a moment")

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

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


if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=5001, reload=False)
