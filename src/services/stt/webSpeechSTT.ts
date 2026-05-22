// ============================================================
// Web Speech API STT Service
// Free browser-native STT (requires microphone permission)
// Constraint vs doc: Whisper would be more accurate offline.
// Web Speech API requires internet (sends to Google servers).
// ============================================================

export interface STTOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface STTCallbacks {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let recognition: any | null = null;

/**
 * Check if Web Speech STT is available
 */
export function isSTTAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

/**
 * Start listening for speech
 */
export function startListening(
  options: STTOptions = {},
  callbacks: STTCallbacks
): void {
  if (!isSTTAvailable()) {
    callbacks.onError("Web Speech API not available in this browser");
    return;
  }

  // Stop previous session
  stopListening();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognitionAPI = (window as any).SpeechRecognition ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).webkitSpeechRecognition;

  recognition = new SpeechRecognitionAPI();

  recognition!.lang = options.lang ?? "es-ES";
  recognition!.continuous = options.continuous ?? false;
  recognition!.interimResults = options.interimResults ?? true;

  recognition!.onstart = () => {
    callbacks.onStart?.();
  };

  recognition!.onresult = (event: SpeechRecognitionEvent) => {
    let finalTranscript = "";
    let interimTranscript = "";

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    if (finalTranscript) {
      callbacks.onResult(finalTranscript, true);
    } else if (interimTranscript) {
      callbacks.onResult(interimTranscript, false);
    }
  };

  recognition!.onerror = (event: SpeechRecognitionErrorEvent) => {
    callbacks.onError(event.error);
  };

  recognition!.onend = () => {
    recognition = null;
    callbacks.onEnd?.();
  };

  recognition!.start();
}

/**
 * Stop listening
 */
export function stopListening(): void {
  if (recognition) {
    recognition.stop();
    recognition = null;
  }
}

/**
 * Check if currently listening
 */
export function isListening(): boolean {
  return recognition !== null;
}
