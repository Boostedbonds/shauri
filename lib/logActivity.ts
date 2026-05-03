/**
 * lib/logActivity.ts
 *
 * Single function to call after ANY study session.
 * Writes to Supabase exam_attempts (source of truth).
 * Falls back to localStorage offline queue if network fails.
 */

export type ActivityMode  = "examiner" | "learn" | "oral" | "writing";
export type ScoreSource   = "ai" | "manual_verified" | "manual_unverified" | "none";

export interface LogActivityParams {
  mode:             ActivityMode;
  subject:          string;
  chapters?:        string[];
  topics?:          string[];
  timeTakenSeconds: number;
  marks_obtained?:  number;
  total_marks?:     number;
  percentage?:      number;
  score_source:     ScoreSource;   // REQUIRED — caller must always set this
  evaluation_text?: string;
  error_topics?:    string[];      // weak topics found by AI
  question_paper?:  string;        // text extracted from uploaded PDF
  answer_sheet?:    string;        // text extracted from uploaded PDF
}

const LS_QUEUE = "shauri_sync_queue";
const LS_CACHE = "shauri_activity_cache";

function getStudent() {
  if (typeof window === "undefined") return { name: "Unknown", class: "", board: "CBSE" };
  try {
    const s = JSON.parse(localStorage.getItem("shauri_student") || "null");
    return { name: s?.name?.trim() || "Unknown", class: String(s?.class || ""), board: s?.board || "CBSE" };
  } catch { return { name: "Unknown", class: "", board: "CBSE" }; }
}

function readQueue(): any[] {
  try { return JSON.parse(localStorage.getItem(LS_QUEUE) || "[]"); } catch { return []; }
}
function writeQueue(q: any[]) { localStorage.setItem(LS_QUEUE, JSON.stringify(q)); }

async function flushQueue() {
  const q = readQueue();
  if (!q.length) return;
  const failed: any[] = [];
  for (const row of q) {
    try {
      const res = await fetch("/api/activity", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row),
      });
      if (!res.ok) failed.push(row);
    } catch { failed.push(row); }
  }
  writeQueue(failed);
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  const student = getStudent();
  const pct = params.percentage ??
    (params.marks_obtained != null && params.total_marks && params.total_marks > 0
      ? Math.round((params.marks_obtained / params.total_marks) * 100)
      : undefined);

  const row = {
    student_name:       student.name,
    class:              student.class,
    board:              student.board,
    mode:               params.mode,
    subject:            params.subject,
    chapters:           params.chapters ?? [],
    topics:             params.topics ?? [],
    time_taken_seconds: params.timeTakenSeconds,
    marks_obtained:     params.marks_obtained ?? null,
    total_marks:        params.total_marks ?? null,
    percentage:         pct ?? null,
    score_source:       params.score_source,
    evaluation_text:    params.evaluation_text ?? null,
    error_topics:       params.error_topics ?? [],
    question_paper:     params.question_paper ?? null,
    answer_sheet:       params.answer_sheet ?? null,
    created_at:         new Date().toISOString(),
    client_id:          `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };

  // Write to local cache immediately (instant UI)
  try {
    const cache = JSON.parse(localStorage.getItem(LS_CACHE) || "[]");
    cache.push(row);
    if (cache.length > 300) cache.splice(0, cache.length - 300);
    localStorage.setItem(LS_CACHE, JSON.stringify(cache));
  } catch {}

  // Flush any previously queued offline writes first
  await flushQueue();

  // Write this record to Supabase
  try {
    const res = await fetch("/api/activity", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch {
    // Network failed — queue for next online session
    const q = readQueue();
    if (!q.find((r: any) => r.client_id === row.client_id)) { q.push(row); writeQueue(q); }
  }
}

export function readLocalCache(): any[] {
  try { return JSON.parse(localStorage.getItem(LS_CACHE) || "[]"); } catch { return []; }
}

export function getPendingCount(): number {
  return readQueue().length;
}