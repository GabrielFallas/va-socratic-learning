/**
 * Whisper STT Service
 * Records audio via MediaRecorder, sends to speech-api for transcription.
 */

let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];

interface STTOptions {
  lang?: string;
  interimResults?: boolean;
}

interface STTCallbacks {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export function isSTTAvailable(): boolean {
  return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
}

export function startListening(options: STTOptions, callbacks: STTCallbacks): void {
  if (!isSTTAvailable()) {
    callbacks.onError("not-supported");
    return;
  }

  navigator.mediaDevices
    .getUserMedia({ audio: true })
    .then((stream) => {
      audioChunks = [];

      // Try webm first, fall back to ogg, then default
      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg")
        ? "audio/ogg"
        : "";

      mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        callbacks.onStart?.();
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());

        if (audioChunks.length === 0) {
          callbacks.onEnd?.();
          return;
        }

        const audioBlob = new Blob(audioChunks, {
          type: mimeType || "audio/wav",
        });

        const formData = new FormData();
        formData.append(
          "audio",
          audioBlob,
          mimeType === "audio/webm" ? "recording.webm" : "recording.ogg"
        );

        try {
          const response = await fetch("/api/stt", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            callbacks.onError(`STT error: ${response.status}`);
            return;
          }

          const data = await response.json();
          if (data.transcript) {
            callbacks.onResult(data.transcript, true);
          }
        } catch (err) {
          callbacks.onError(`Network error: ${err}`);
        } finally {
          callbacks.onEnd?.();
        }
      };

      mediaRecorder.start();
    })
    .catch((err) => {
      if (err.name === "NotAllowedError") {
        callbacks.onError("not-allowed");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        callbacks.onError("device-not-found");
      } else {
        callbacks.onError(`microphone-error: ${err.message}`);
      }
    });
}

export function stopListening(): void {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }
}
