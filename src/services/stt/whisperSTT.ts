/**
 * STT Service — browser-native Web Speech API.
 * Real-time interim results, no server round-trip, no MediaRecorder.
 * Falls back gracefully when the API is unavailable.
 */

const SpeechRecognitionAPI: (new () => SpeechRecognition) | null =
  typeof window !== "undefined"
    ? (window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null)
    : null;

let recognition: SpeechRecognition | null = null;

interface STTOptions {
  lang?:           string;
  interimResults?: boolean;
  continuous?:     boolean;
}

interface STTCallbacks {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError:  (error: string) => void;
  onStart?: () => void;
  onEnd?:   () => void;
}

export function isSTTAvailable(): boolean {
  return !!SpeechRecognitionAPI;
}

export function startListening(options: STTOptions, callbacks: STTCallbacks): void {
  if (!SpeechRecognitionAPI) {
    callbacks.onError("not-supported");
    return;
  }

  stopListening();

  recognition = new SpeechRecognitionAPI();
  recognition.lang            = options.lang ?? "es-ES";
  recognition.interimResults  = options.interimResults ?? true;
  recognition.continuous      = options.continuous ?? true;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => callbacks.onStart?.();

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    let finalText   = "";
    let interimText = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) {
        finalText += res[0].transcript;
      } else {
        interimText += res[0].transcript;
      }
    }

    if (finalText) {
      callbacks.onResult(finalText, true);
    } else if (interimText) {
      callbacks.onResult(interimText, false);
    }
  };

  recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
    const code = event.error;
    // "aborted" fires when recognition.stop() is called — not a real error
    if (code === "aborted") return;
    if (code === "not-allowed" || code === "service-not-allowed") {
      callbacks.onError("not-allowed");
    } else if (code === "no-speech") {
      callbacks.onError("no-speech");
    } else if (code === "audio-capture") {
      callbacks.onError("device-not-found");
    } else if (code === "network") {
      callbacks.onError("network error");
    } else {
      callbacks.onError(code);
    }
  };

  recognition.onend = () => {
    callbacks.onEnd?.();
    recognition = null;
  };

  try {
    recognition.start();
  } catch {
    callbacks.onError("start-failed");
    recognition = null;
  }
}

export function stopListening(): void {
  if (recognition) {
    try { recognition.stop(); } catch { /* already stopped */ }
    recognition = null;
  }
}
