// ─── lib/logActivity.ts ───────────────────────────────────────
// Shared utility used by Learn, Oral, and Examiner modes.
// Writes to Supabase via /api/progress (POST) AND persists locally.
//
// ── Supabase columns needed (run migration below if missing) ──
//   ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS mode text DEFAULT 'examiner';
//   ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS topics text[];
//   ALTER TABLE exam_results ADD COLUMN IF NOT EXISTS board text;

export type ActivityMode = "learn" | "oral" | "examiner";

export type ActivityPayload = {
  mode: ActivityMode;
  subject: string;
  chapters?: string[];   // learn: chapters studied; examiner: chapters tested
  topics?: string[];     // learn: topic names; oral: topics discussed
  timeTakenSeconds: number;
  percentage?: number;   // 0–100 — omit for oral sessions with no quiz
  marks_obtained?: number;
  total_marks?: number;
  evaluation_text?: string;
};

// ── helpers ───────────────────────────────────────────────────
export function fmtTime(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return [h && `${h}h`, m && `${m}m`, `${s}s`].filter(Boolean).join(" ");
}

function getStudent() {
  try {
    const p = JSON.parse(localStorage.getItem("shauri_student") || "null");
    if (p?.name) return { name: p.name as string, class: (p.class || "") as string, board: (p.board || "CBSE") as string };
  } catch {}
  return null;
}

// Persist to localStorage for offline resilience + Progress Dashboard fallback
function persistLocally(entry: Record<string, unknown>) {
  try {
    const key  = "shauri_exam_attempts";
    const list = JSON.parse(localStorage.getItem(key) || "[]") as unknown[];
    list.push(entry);
    if (list.length > 150) list.splice(0, list.length - 150);
    localStorage.setItem(key, JSON.stringify(list));
  } catch {}
}

// ── main export ───────────────────────────────────────────────
export async function logActivity(payload: ActivityPayload): Promise<void> {
  const student = getStudent();
  if (!student) return; // never log anonymous sessions

  const created_at = new Date().toISOString();
  const id         = typeof crypto !== "undefined" ? crypto.randomUUID() : String(Date.now());

  const entry = {
    id,
    date:             created_at,
    created_at,
    mode:             payload.mode,
    student_name:     student.name,
    class:            student.class,
    board:            student.board,
    subject:          payload.subject,
    chapters:         payload.chapters  || [],
    topics:           payload.topics    || [],
    time_taken:       fmtTime(payload.timeTakenSeconds),
    timeTakenSeconds: payload.timeTakenSeconds,
    percentage:       payload.percentage       ?? null,
    scorePercent:     payload.percentage       ?? null, // Progress Dashboard compat
    marks_obtained:   payload.marks_obtained   ?? null,
    total_marks:      payload.total_marks      ?? null,
    evaluation_text:  payload.evaluation_text  || "",
  };

  // 1. Save locally first (works offline, feeds Progress Dashboard immediately)
  persistLocally(entry);

  // 2. Push to Supabase via existing API route
  try {
    await fetch("/api/progress", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(entry),
    });
  } catch (e) {
    console.warn("[logActivity] Supabase sync failed — kept locally:", e);
  }
}