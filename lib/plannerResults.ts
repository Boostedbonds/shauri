export type PlannerResult = {
  day: number;
  cycle: number;
  subject: string;
  topic: string;
  score: number;
  total: number;
  source: "exam" | "manual";
};

const RESULTS_KEY = "planner_results";

export function getPlannerResults(): PlannerResult[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RESULTS_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getAllResults(): PlannerResult[] {
  return getPlannerResults();
}

export function savePlannerResult(result: PlannerResult): PlannerResult[] {
  const all = getPlannerResults();
  const next = all.filter(
    (r) =>
      !(
        r.day === result.day &&
        r.cycle === result.cycle &&
        r.subject.toLowerCase() === result.subject.toLowerCase() &&
        r.topic.toLowerCase() === result.topic.toLowerCase()
      )
  );
  next.push(result);
  localStorage.setItem(RESULTS_KEY, JSON.stringify(next));
  return next;
}

export function saveResult(result: PlannerResult): PlannerResult[] {
  return savePlannerResult(result);
}

export function hasResultForDayCycle(day: number, cycle: number): boolean {
  return getPlannerResults().some((r) => r.day === day && r.cycle === cycle);
}

export function getResultsForCycle(cycle: number): PlannerResult[] {
  return getPlannerResults().filter((r) => r.cycle === cycle);
}

export function summarizeResults(results: PlannerResult[]): {
  subjectPerformance: Record<string, number>;
  weakSubjects: string[];
  strongSubjects: string[];
} {
  const bySubject: Record<string, { score: number; total: number }> = {};
  results.forEach((r) => {
    if (!bySubject[r.subject]) bySubject[r.subject] = { score: 0, total: 0 };
    bySubject[r.subject].score += r.score;
    bySubject[r.subject].total += r.total;
  });

  const subjectPerformance: Record<string, number> = {};
  Object.entries(bySubject).forEach(([subject, val]) => {
    if (val.total <= 0) return;
    subjectPerformance[subject] = Math.round((val.score / val.total) * 100);
  });

  const weakSubjects = Object.entries(subjectPerformance)
    .filter(([, pct]) => pct < 50)
    .map(([subject]) => subject);
  const strongSubjects = Object.entries(subjectPerformance)
    .filter(([, pct]) => pct > 75)
    .map(([subject]) => subject);

  return { subjectPerformance, weakSubjects, strongSubjects };
}

export type ProgressBand = "weak" | "moderate" | "strong";

export type PlannerProgress = {
  subjectAverages: Record<string, number>;
  subjectBands: Record<string, ProgressBand>;
  weakSubjects: string[];
  moderateSubjects: string[];
  strongSubjects: string[];
  suggestions: string[];
};

export type RevisionPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type RevisionQueueItem = {
  subject: string;
  topic: string;
  average: number;
  attempts: number;
  priority: RevisionPriority;
  trend: "improving" | "declining" | "stable";
  priorityScore: number;
};

export function analyzeProgress(results: PlannerResult[]): PlannerProgress {
  const bySubject: Record<string, { score: number; total: number }> = {};
  results.forEach((r) => {
    if (!bySubject[r.subject]) bySubject[r.subject] = { score: 0, total: 0 };
    bySubject[r.subject].score += r.score;
    bySubject[r.subject].total += r.total;
  });

  const subjectAverages: Record<string, number> = {};
  const subjectBands: Record<string, ProgressBand> = {};
  const weakSubjects: string[] = [];
  const moderateSubjects: string[] = [];
  const strongSubjects: string[] = [];

  Object.entries(bySubject).forEach(([subject, stat]) => {
    if (stat.total <= 0) return;
    const avg = Math.round((stat.score / stat.total) * 100);
    subjectAverages[subject] = avg;

    if (avg < 50) {
      subjectBands[subject] = "weak";
      weakSubjects.push(subject);
    } else if (avg <= 75) {
      subjectBands[subject] = "moderate";
      moderateSubjects.push(subject);
    } else {
      subjectBands[subject] = "strong";
      strongSubjects.push(subject);
    }
  });

  const suggestions: string[] = [];
  weakSubjects.forEach((s) => suggestions.push(`High priority: revise ${s} and take one focused test today.`));
  moderateSubjects.forEach((s) => suggestions.push(`Improve ${s} with one concept recap + one practice set.`));
  strongSubjects.forEach((s) => suggestions.push(`Maintain ${s} with light revision only.`));
  if (!suggestions.length) suggestions.push("Submit test results to unlock personalized suggestions.");

  return {
    subjectAverages,
    subjectBands,
    weakSubjects,
    moderateSubjects,
    strongSubjects,
    suggestions,
  };
}

export function buildRevisionQueue(results: PlannerResult[]): RevisionQueueItem[] {
  const byTopic: Record<string, { subject: string; topic: string; weightedSum: number; weightSum: number; attempts: number; weightedRecent: number[] }> = {};
  const maxDay = results.reduce((m, r) => Math.max(m, r.day), 1);

  results.forEach((r) => {
    if (!r.total) return;
    const pct = (r.score / r.total) * 100;
    const recencyWeight = 1 + ((r.day / Math.max(maxDay, 1)) * 0.8);
    const key = `${r.subject.toLowerCase()}::${r.topic.toLowerCase()}`;
    if (!byTopic[key]) {
      byTopic[key] = { subject: r.subject, topic: r.topic, weightedSum: 0, weightSum: 0, attempts: 0, weightedRecent: [] };
    }
    byTopic[key].weightedSum += pct * recencyWeight;
    byTopic[key].weightSum += recencyWeight;
    byTopic[key].attempts += 1;
    byTopic[key].weightedRecent.push(pct);
  });

  const queue: RevisionQueueItem[] = Object.values(byTopic).map((t) => {
    const average = Math.round(t.weightedSum / Math.max(t.weightSum, 1));
    const recent = t.weightedRecent.slice(-3);
    const first = recent[0] ?? average;
    const last = recent[recent.length - 1] ?? average;
    const delta = last - first;
    const trend: "improving" | "declining" | "stable" = delta >= 7 ? "improving" : delta <= -7 ? "declining" : "stable";

    // Higher score = higher revision urgency
    const scorePenalty = Math.max(0, 100 - average);
    const attemptPenalty = t.attempts >= 3 ? 15 : t.attempts === 2 ? 8 : 0;
    const trendPenalty = trend === "declining" ? 18 : trend === "stable" ? 6 : 0;
    const priorityScore = scorePenalty + attemptPenalty + trendPenalty;

    let priority: RevisionPriority = "LOW";
    if (priorityScore >= 78) priority = "CRITICAL";
    else if (priorityScore >= 58) priority = "HIGH";
    else if (priorityScore >= 35) priority = "MEDIUM";
    return { subject: t.subject, topic: t.topic, average, attempts: t.attempts, priority, trend, priorityScore };
  });

  const rank: Record<RevisionPriority, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  return queue
    .sort((a, b) => rank[a.priority] - rank[b.priority] || b.priorityScore - a.priorityScore || a.average - b.average)
    .slice(0, 3);
}
