import type {
  AdaptiveEventPayload,
  AdaptiveProfilePayload,
  AdaptiveSessionPayload,
  PronunciationPayload,
} from "./adaptiveTypes";

type AdaptiveAction =
  | { action: "upsert_profile"; profile: AdaptiveProfilePayload }
  | { action: "log_events"; events: AdaptiveEventPayload[] }
  | { action: "log_session"; session: AdaptiveSessionPayload }
  | { action: "save_pronunciation"; sample: PronunciationPayload };

async function callAdaptive(body: AdaptiveAction) {
  const res = await fetch("/api/adaptive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Adaptive API failed: ${res.status}`);
  return res.json();
}

export async function upsertAdaptiveProfile(profile: AdaptiveProfilePayload) {
  return callAdaptive({ action: "upsert_profile", profile });
}

export async function logAdaptiveEvents(events: AdaptiveEventPayload[]) {
  if (!events.length) return { ok: true, inserted: 0 };
  return callAdaptive({ action: "log_events", events });
}

export async function logAdaptiveSession(session: AdaptiveSessionPayload) {
  return callAdaptive({ action: "log_session", session });
}

export async function savePronunciationSample(sample: PronunciationPayload) {
  return callAdaptive({ action: "save_pronunciation", sample });
}

export async function getAdaptiveProfile(studentKey: string, mode: string) {
  const url = `/api/adaptive?studentKey=${encodeURIComponent(studentKey)}&mode=${encodeURIComponent(mode)}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}
