/**
 * Piper TTS Service
 * Primary  : /api/tts → speech-api (Piper neural TTS, high-quality Spanish)
 * Fallback : Web Speech API (browser-native, works without Docker)
 *
 * KEY: call preloadCheck() on component mount so the async Piper availability
 * fetch is completed BEFORE the user clicks. That way, when the user clicks,
 * speak() can go straight to the chosen engine without any async gap —
 * keeping us inside the browser's ~1s user-gesture window for audio autoplay.
 */

let currentAudio: HTMLAudioElement | null = null;
let currentUtterance: SpeechSynthesisUtterance | null = null;
// null = not yet checked; true/false = cached result
let piperAvailable: boolean | null = null;
let piperCheckPromise: Promise<boolean> | null = null;

function removeEmojis(text: string): string {
  return text
    .replace(/[\p{Emoji}\p{Emoji_Component}\p{Emoji_Modifier}\p{Emoji_Modifier_Base}\p{Emoji_Presentation}]/gu, "")
    .trim();
}

// ─── Pre-check (call on mount, before the user clicks) ───────
async function doPiperCheck(): Promise<boolean> {
  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "ok", speed: 1.0 }),
      signal: AbortSignal.timeout(3000),
    });
    piperAvailable = res.ok;
  } catch {
    piperAvailable = false;
  }
  console.log(
    `[TTS] Piper backend ${piperAvailable ? "✓ disponible" : "✗ no disponible — usará Web Speech API"}`
  );
  return piperAvailable;
}

/** Call this on component mount. Populates the cache so speak() is instant. */
export function preloadCheck(): void {
  if (piperAvailable !== null || piperCheckPromise) return; // already done
  piperCheckPromise = doPiperCheck();
}

async function isPiperAvailable(): Promise<boolean> {
  if (piperAvailable !== null) return piperAvailable;
  if (piperCheckPromise) return piperCheckPromise;
  piperCheckPromise = doPiperCheck();
  return piperCheckPromise;
}

// ─── Web Speech API helpers ───────────────────────────────────
function getSpanishVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "es-ES") ||
    voices.find((v) => v.lang === "es-MX") ||
    voices.find((v) => v.lang.startsWith("es")) ||
    null
  );
}

function speakWithWebSpeech(
  text: string,
  onStart?: () => void,
  onEnd?: () => void
): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    console.warn("[TTS] Web Speech API not available in this browser");
    onEnd?.();
    return;
  }

  const synth = window.speechSynthesis;
  synth.cancel(); // stop any previous speech

  const doSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    const voice = getSpanishVoice();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.lang = "es-ES";
    utterance.rate = 0.92;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    utterance.onstart = () => onStart?.();
    utterance.onend = () => {
      currentUtterance = null;
      onEnd?.();
    };
    utterance.onerror = (e) => {
      if (e.error !== "canceled" && e.error !== "interrupted") {
        console.error("[TTS] Web Speech error:", e.error);
      }
      currentUtterance = null;
      onEnd?.();
    };

    synth.speak(utterance);
  };

  // Chrome loads voices asynchronously — wait for them if not ready
  const voices = synth.getVoices();
  if (voices.length > 0) {
    doSpeak();
  } else {
    synth.addEventListener("voiceschanged", doSpeak, { once: true });
    // Safety: if voiceschanged never fires (some browsers), speak anyway after 300ms
    setTimeout(() => {
      if (!currentUtterance) doSpeak();
    }, 300);
  }
}

// ─── Main speak function ──────────────────────────────────────
export async function speak(
  text: string,
  options: { speed?: number } = {},
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  const cleanText = removeEmojis(text);
  if (!cleanText.trim()) {
    onEnd?.();
    return;
  }

  stopSpeaking();

  // isPiperAvailable is now instant if preloadCheck() was called on mount
  const usePiper = await isPiperAvailable();

  if (!usePiper) {
    speakWithWebSpeech(cleanText, onStart, onEnd);
    return;
  }

  // ── Piper path ────────────────────────────────────────────
  const speed = options.speed ?? 1.0;
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: cleanText, speed }),
    });

    if (!response.ok) {
      console.warn(`[TTS] Piper returned ${response.status}, switching to Web Speech`);
      piperAvailable = false;
      speakWithWebSpeech(text, onStart, onEnd);
      return;
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    return new Promise((resolve) => {
      const audio = new Audio(audioUrl);
      currentAudio = audio;

      audio.onplay = () => onStart?.();
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        onEnd?.();
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        onEnd?.();
        resolve();
      };

      audio.play().catch((err) => {
        console.warn("[TTS] HTML Audio autoplay blocked:", err.message, "→ Web Speech fallback");
        URL.revokeObjectURL(audioUrl);
        currentAudio = null;
        speakWithWebSpeech(text, onStart, onEnd);
        resolve();
      });
    });
  } catch (err) {
    console.error("[TTS] Piper fetch error:", err);
    piperAvailable = false;
    speakWithWebSpeech(text, onStart, onEnd);
  }
}

// ─── Stop all active speech ───────────────────────────────────
export function stopSpeaking(): void {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  currentUtterance = null;
}

export function isTTSAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
