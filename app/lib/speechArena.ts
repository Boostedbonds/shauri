export type SpeechArenaState = "idle" | "listening" | "processing" | "error";

type SpeechArenaOptions = {
  lang?: string;
  silenceMs?: number;
  onInterim?: (text: string) => void;
  onFinal?: (text: string, durationMs: number, pauses: number, audioBlob?: Blob | null) => void;
  onError?: (message: string) => void;
};

export function createSpeechArena(options: SpeechArenaOptions) {
  if (typeof window === "undefined") {
    return {
      supported: false,
      start: async () => false,
      stop: () => {},
      reset: () => {},
      getState: () => "error" as SpeechArenaState,
      getTranscript: () => "",
      getInterim: () => "",
    };
  }

  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  if (!SR) {
    return {
      supported: false,
      start: async () => false,
      stop: () => {},
      reset: () => {},
      getState: () => "error" as SpeechArenaState,
      getTranscript: () => "",
      getInterim: () => "",
    };
  }

  const rec = new SR();
  rec.lang = options.lang || "en-IN";
  rec.interimResults = true;
  rec.continuous = true;

  let state: SpeechArenaState = "idle";
  let finalTranscript = "";
  let interimTranscript = "";
  let startTs = 0;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let pauseCount = 0;
  let endedManually = false;
  let mediaRecorder: MediaRecorder | null = null;
  let mediaStream: MediaStream | null = null;
  let audioChunks: BlobPart[] = [];

  const resetSilence = () => {
    if (silenceTimer) clearTimeout(silenceTimer);
    silenceTimer = setTimeout(() => {
      if (state === "listening") {
        pauseCount += 1;
        stop();
      }
    }, options.silenceMs ?? 2800);
  };

  const clearSilence = () => {
    if (silenceTimer) {
      clearTimeout(silenceTimer);
      silenceTimer = null;
    }
  };

  rec.onresult = (event: any) => {
    interimTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const text = event.results[i][0].transcript.trim();
      if (event.results[i].isFinal) finalTranscript = `${finalTranscript} ${text}`.trim();
      else interimTranscript = `${interimTranscript} ${text}`.trim();
    }
    options.onInterim?.([finalTranscript, interimTranscript].filter(Boolean).join(" "));
    resetSilence();
  };

  rec.onerror = (event: any) => {
    state = "error";
    clearSilence();
    options.onError?.(event?.error || "speech_error");
  };

  const finalizeAudio = async (): Promise<Blob | null> => {
    if (!audioChunks.length) return null;
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    audioChunks = [];
    return blob.size > 0 ? blob : null;
  };

  rec.onend = async () => {
    clearSilence();
    const duration = startTs ? Date.now() - startTs : 0;
    if (!endedManually && state === "listening") state = "processing";

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        mediaRecorder!.onstop = () => resolve();
        try { mediaRecorder!.stop(); } catch { resolve(); }
      });
    }

    mediaStream?.getTracks().forEach((t) => t.stop());
    mediaStream = null;

    const audioBlob = await finalizeAudio();

    if (finalTranscript.trim()) {
      options.onFinal?.(finalTranscript.trim(), duration, pauseCount, audioBlob);
    }

    state = "idle";
    interimTranscript = "";
    endedManually = false;
  };

  const start = async () => {
    if (state === "listening") stop();
    finalTranscript = "";
    interimTranscript = "";
    pauseCount = 0;
    startTs = Date.now();
    state = "listening";
    endedManually = false;

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(mediaStream);
      audioChunks = [];
      mediaRecorder.ondataavailable = (evt) => {
        if (evt.data?.size) audioChunks.push(evt.data);
      };
      mediaRecorder.start(250);
    } catch {
      mediaStream = null;
      mediaRecorder = null;
    }

    try {
      rec.start();
      resetSilence();
      return true;
    } catch {
      state = "error";
      return false;
    }
  };

  const stop = () => {
    endedManually = true;
    clearSilence();
    if (state === "listening") state = "processing";
    try { rec.stop(); } catch {}
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      try { mediaRecorder.stop(); } catch {}
    }
  };

  const reset = () => {
    finalTranscript = "";
    interimTranscript = "";
    pauseCount = 0;
    state = "idle";
  };

  return {
    supported: true,
    start,
    stop,
    reset,
    getState: () => state,
    getTranscript: () => finalTranscript,
    getInterim: () => interimTranscript,
  };
}
