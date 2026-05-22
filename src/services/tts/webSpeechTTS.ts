// ============================================================
// Web Speech API TTS Service
// Free browser-native TTS (no API key needed)
// Constraint vs doc: Gemini TTS would have better SSML control
// and more emotional range. Web Speech API varies by browser/OS.
// ============================================================

export interface TTSOptions {
  /** Speech rate (0.1 to 10, default 1) */
  rate?: number;
  /** Pitch (0 to 2, default 1) */
  pitch?: number;
  /** Volume (0 to 1, default 1) */
  volume?: number;
  /** Preferred voice name substring (e.g., "Google", "Samantha") */
  voicePreference?: string;
  /** Language tag (default: 'es-CR' for Costa Rican Spanish) */
  lang?: string;
}

let currentUtterance: SpeechSynthesisUtterance | null = null;

/**
 * Check if Web Speech TTS is available in this browser
 */
export function isTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Get available voices, filtered for Spanish if available
 */
export function getAvailableVoices(): SpeechSynthesisVoice[] {
  if (!isTTSAvailable()) return [];
  return window.speechSynthesis.getVoices();
}

/**
 * Select the best available voice for Ada
 */
function selectVoice(
  voices: SpeechSynthesisVoice[],
  options: TTSOptions
): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;

  const lang = options.lang ?? "es";
  const pref = options.voicePreference;

  // Priority 1: Spanish voice with user preference
  if (pref) {
    const prefVoice = voices.find(
      (v) => v.lang.startsWith(lang) && v.name.includes(pref)
    );
    if (prefVoice) return prefVoice;
  }

  // Priority 2: Any Spanish female voice
  const spanishFemale = voices.find(
    (v) => v.lang.startsWith(lang) && (v.name.includes("female") || v.name.includes("Google"))
  );
  if (spanishFemale) return spanishFemale;

  // Priority 3: Any Spanish voice
  const spanish = voices.find((v) => v.lang.startsWith(lang));
  if (spanish) return spanish;

  // Fallback: first available voice
  return voices[0];
}

/**
 * Speak text with Ada's voice profile
 * Returns a promise that resolves when speech ends
 */
export function speak(
  text: string,
  options: TTSOptions = {},
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!isTTSAvailable()) {
      reject(new Error("Web Speech API not available in this browser"));
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    utterance.rate = options.rate ?? 0.95; // Slightly slower for clarity
    utterance.pitch = options.pitch ?? 1.1; // Slightly higher for Ada's character
    utterance.volume = options.volume ?? 1.0;
    utterance.lang = options.lang ?? "es-ES";

    // Load voices and select best
    const voices = getAvailableVoices();
    if (voices.length > 0) {
      const voice = selectVoice(voices, options);
      if (voice) utterance.voice = voice;
    } else {
      // Wait for voices to load
      window.speechSynthesis.onvoiceschanged = () => {
        const loadedVoices = getAvailableVoices();
        const voice = selectVoice(loadedVoices, options);
        if (voice) utterance.voice = voice;
      };
    }

    utterance.onstart = () => {
      onStart?.();
    };

    utterance.onend = () => {
      currentUtterance = null;
      onEnd?.();
      resolve();
    };

    utterance.onerror = (event) => {
      currentUtterance = null;
      // 'interrupted' and 'canceled' are normal (e.g., user sends new message)
      if (event.error === "interrupted" || event.error === "canceled") {
        resolve();
      } else {
        reject(new Error(`TTS error: ${event.error}`));
      }
    };

    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Stop any ongoing speech
 */
export function stopSpeaking(): void {
  if (!isTTSAvailable()) return;
  window.speechSynthesis.cancel();
  currentUtterance = null;
}

/**
 * Check if currently speaking
 */
export function isSpeaking(): boolean {
  if (!isTTSAvailable()) return false;
  return window.speechSynthesis.speaking;
}
