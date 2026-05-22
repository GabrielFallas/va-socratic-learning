// Type declarations for non-TS modules
declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

// Web Speech API types (not fully covered in lib.dom.d.ts in older versions)
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
