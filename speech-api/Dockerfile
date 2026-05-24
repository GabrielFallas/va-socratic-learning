FROM python:3.10

# System deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    wget \
    libsndfile1 \
    espeak-ng \
    gcc \
    make \
    && rm -rf /var/lib/apt/lists/*

# Create symlink for espeak-ng-data (Piper needs it at /usr/share/espeak-ng-data)
RUN ln -s /usr/lib/x86_64-linux-gnu/espeak-ng-data /usr/share/espeak-ng-data

# Install piper TTS binary (v1.2.0 for Linux x86_64)
RUN wget -q https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz \
    && tar -xzf piper_linux_x86_64.tar.gz \
    && cp piper/piper /usr/local/bin/piper \
    && cp piper/lib*.so.* /usr/local/lib/ 2>/dev/null || true \
    && ldconfig \
    && rm -rf piper piper_linux_x86_64.tar.gz

WORKDIR /app

RUN pip install --upgrade pip
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY server.py .

# Voice models will be downloaded at first startup to /models volume
RUN mkdir -p /models

EXPOSE 5001

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "5001"]
