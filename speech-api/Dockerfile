FROM python:3.10-slim

# System deps:
#   ffmpeg       — audio decoding (faster-whisper / av)
#   espeak-ng    — TTS engine
#   libsndfile1  — audio file I/O (soundfile dep)
#   gcc / make   — compile any remaining C extensions
#   curl         — healthcheck probe
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    espeak-ng \
    libsndfile1 \
    gcc \
    make \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip first so it can resolve manylinux pre-built wheels
# (avoids source-compiling av against the system FFmpeg headers)
RUN pip install --upgrade pip

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

EXPOSE 5001

# Whisper 'base' model (~150 MB) is downloaded on first startup to /tmp/whisper-models
# Mount a volume there in production to avoid re-downloading on every restart.

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5001"]
