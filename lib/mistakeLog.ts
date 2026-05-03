// ─────────────────────────────────────────────────────────────
// lib/mistakeLog.ts
// Stores per-question mistakes extracted from exam evaluations.
// Used by: examiner page (write), mistakes page (read),
//          revision page (read + filter).
// ─────────────────────────────────────────────────────────────

export type MistakeSeverity = "wrong" | "partial";

export type MistakeEntry = {
  id: string;               // unique — `${subject}_${day}_${cycle}_${qNum}_${ts}`
  createdAt: string;        // ISO timestamp
  subject: string;
  topic: string;
  qNum: string;             // e.g. "Q3", "Q12"
  questionText?: string;    // optional — if available from paper
  studentAnswer?: string;   // what the student wrote (brief)
  correctAnswer: string;    // correct answer from evaluator
  feedback: string;         // AI one-liner feedback
  severity: MistakeSeverity;
  marksLost: number;        // maxMarks - obtained
  day: number;
  cycle: number;
  reviewed: boolean;        // has student marked as "understood"
};

const MISTAKES_KEY = "shauri_mistakes";

export function getMistakes(): MistakeEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MISTAKES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveMistakes(entries: MistakeEntry[]): void {
  if (typeof window === "undefined") return;
  const existing = getMistakes();
  const existingIds = new Set(existing.map(e => e.id));
  const newOnly = entries.filter(e => !existingIds.has(e.id));
  const merged = [...existing, ...newOnly];
  localStorage.setItem(MISTAKES_KEY, JSON.stringify(merged));
}

export function markMistakeReviewed(id: string): void {
  const all = getMistakes();
  const updated = all.map(m => m.id === id ? { ...m, reviewed: true } : m);
  localStorage.setItem(MISTAKES_KEY, JSON.stringify(updated));
}

export function deleteMistake(id: string): void {
  const all = getMistakes().filter(m => m.id !== id);
  localStorage.setItem(MISTAKES_KEY, JSON.stringify(all));
}

export function clearAllMistakes(): void {
  localStorage.removeItem(MISTAKES_KEY);
}

// Groups mistakes by subject for revision use
export function getMistakesBySubject(): Record<string, MistakeEntry[]> {
  const all = getMistakes();
  const map: Record<string, MistakeEntry[]> = {};
  all.forEach(m => {
    if (!map[m.subject]) map[m.subject] = [];
    map[m.subject].push(m);
  });
  return map;
}

// Returns weak topics (appeared as mistake 2+ times and not reviewed)
export function getWeakTopics(): { subject: string; topic: string; count: number; avgMarksLost: number }[] {
  const all = getMistakes().filter(m => !m.reviewed);
  const map: Record<string, { subject: string; topic: string; count: number; totalLost: number }> = {};
  all.forEach(m => {
    const key = `${m.subject}::${m.topic}`;
    if (!map[key]) map[key] = { subject: m.subject, topic: m.topic, count: 0, totalLost: 0 };
    map[key].count++;
    map[key].totalLost += m.marksLost;
  });
  return Object.values(map)
    .filter(t => t.count >= 1)
    .map(t => ({ subject: t.subject, topic: t.topic, count: t.count, avgMarksLost: Math.round(t.totalLost / t.count * 10) / 10 }))
    .sort((a, b) => b.count - a.count || b.avgMarksLost - a.avgMarksLost);
}

// Extracts MistakeEntry[] from the evaluation JSON returned by route.ts
export function extractMistakesFromEval(
  evalJson: Record<string, any>,
  day: number,
  cycle: number
): MistakeEntry[] {
  const subject = evalJson.subject || "General";
  const sections: any[] = evalJson.sections || [];
  const mistakes: MistakeEntry[] = [];
  const ts = Date.now();

  sections.forEach((sec: any) => {
    const questions: any[] = sec.questions || [];
    questions.forEach((q: any) => {
      if (q.status === "correct") return; // skip correct answers
      const severity: MistakeSeverity = q.status === "partial" ? "partial" : "wrong";
      const marksLost = (q.maxMarks || 0) - (q.obtained || 0);
      if (marksLost <= 0 && q.status !== "partial") return;
      mistakes.push({
        id: `${subject}_${day}_${cycle}_${q.qNum}_${ts}`,
        createdAt: new Date().toISOString(),
        subject,
        topic: q.topic || sec.name || "General",
        qNum: q.qNum || "Q?",
        correctAnswer: q.correctAnswer || "",
        feedback: q.feedback || "",
        severity,
        marksLost: Math.max(0, marksLost),
        day,
        cycle,
        reviewed: false,
      });
    });
  });

  return mistakes;
}