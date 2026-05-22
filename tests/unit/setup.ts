import "@testing-library/jest-dom";

// Mock Web Speech API for tests (not available in jsdom)
class MockSpeechSynthesisUtterance {
  text: string;
  lang = "es-ES";
  rate = 1;
  pitch = 1;
  volume = 1;
  voice: null = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;

  constructor(text: string) {
    this.text = text;
  }
}

const mockSpeechSynthesis = {
  speaking: false,
  pending: false,
  paused: false,
  speak: vi.fn().mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
    mockSpeechSynthesis.speaking = true;
    // Simulate async speech
    setTimeout(() => {
      utterance.onstart?.();
      setTimeout(() => {
        mockSpeechSynthesis.speaking = false;
        utterance.onend?.();
      }, 100);
    }, 10);
  }),
  cancel: vi.fn().mockImplementation(() => {
    mockSpeechSynthesis.speaking = false;
  }),
  pause: vi.fn(),
  resume: vi.fn(),
  getVoices: vi.fn().mockReturnValue([
    { name: "Google español", lang: "es-ES", default: true, localService: false, voiceURI: "Google español" },
  ]),
  onvoiceschanged: null,
};

Object.defineProperty(global, "SpeechSynthesisUtterance", {
  writable: true,
  value: MockSpeechSynthesisUtterance,
});

Object.defineProperty(global, "speechSynthesis", {
  writable: true,
  value: mockSpeechSynthesis,
});

// Mock SpeechRecognition
class MockSpeechRecognition {
  lang = "es-ES";
  continuous = false;
  interimResults = false;
  onstart: (() => void) | null = null;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;

  start() {
    this.onstart?.();
  }
  stop() {
    this.onend?.();
  }
  abort() {
    this.onend?.();
  }
}

Object.defineProperty(global, "SpeechRecognition", {
  writable: true,
  value: MockSpeechRecognition,
});
Object.defineProperty(global, "webkitSpeechRecognition", {
  writable: true,
  value: MockSpeechRecognition,
});

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: {
    randomUUID: () => `test-${Math.random().toString(36).slice(2)}`,
  },
});
