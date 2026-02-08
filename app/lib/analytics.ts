export type OralInsight = {
  childId: string;
  topic: string;
  level: "weak" | "partial" | "strong";
  date: string;
};

const KEY = "studymate_oral_analytics";

export function saveInsight(insight: OralInsight) {
  const all = getInsights();
  localStorage.setItem(KEY, JSON.stringify([insight, ...all]));
}

export function getInsights(childId?: string): OralInsight[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(KEY);
  const all: OralInsight[] = raw ? JSON.parse(raw) : [];
  return childId ? all.filter(i => i.childId === childId) : all;
}

export function getWeakTopics(childId: string): string[] {
  const insights = getInsights(childId);
  const weak = insights.filter(i => i.level === "weak");
  return [...new Set(weak.map(i => i.topic))];
}
