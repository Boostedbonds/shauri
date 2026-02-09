// lib/speech.ts
// Client-side mic helper using Web Speech API
// Null-safe, run-safe, build-safe

export type SpeechResultHandler = (text: string) => void;
export type SpeechErrorHandler = (error: string) => void;

export function startSpeechRecognition(
  onResult: SpeechResultHandler,
  onError?: SpeechErrorHandler
): (() => void) | null {
  if (typeof window === "undefined") return null;

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError?.("Speech recognition not supported");
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = "en-IN";
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onresult = (event: any) => {
    const transcript =
      event?.results?.[0]?.[0]?.transcript ?? "";
    if (transcript) onResult(transcript);
  };

  recognition.onerror = () => {
    onError?.("Speech recognition error");
  };

  recognition.start();

  // return stop function
  return () => {
    try {
      recognition.stop();
    } catch {}
  };
}
