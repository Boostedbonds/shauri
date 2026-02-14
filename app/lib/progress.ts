export type ExamRecord = {
  childId: string;
  date: string;
  mode: "examiner" | "teacher" | "oral";
  score?: string;
  percentage?: string;
  timeTaken?: string;
};

const KEY = "shauri_progress";

export function saveRecord(record: ExamRecord) {
  const existing = getRecords();
  localStorage.setItem(KEY, JSON.stringify([record, ...existing]));
}

export function getRecords(childId?: string): ExamRecord[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  const all = raw ? JSON.parse(raw) : [];
  return childId ? all.filter((r: ExamRecord) => r.childId === childId) : all;
}

export function clearRecords(childId?: string) {
  if (!childId) {
    localStorage.removeItem(KEY);
    return;
  }
  const remaining = getRecords().filter(
    (r) => r.childId !== childId
  );
  localStorage.setItem(KEY, JSON.stringify(remaining));
}
