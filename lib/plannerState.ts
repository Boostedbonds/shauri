export type PlannerState = {
  current_day: number;
  cycle: number;
  completed_days: number[];
  skipped_days: number[];
  last_updated: number;
  last_action?: {
    type: "complete" | "skip";
    day: number;
    cycle: number;
    previous_state: {
      current_day: number;
      cycle: number;
      completed_days: number[];
      skipped_days: number[];
    };
  };
};

import { THIRTY_DAY_PLAN, type PlannerDayPlan } from "@/lib/plannerPlan";
export { THIRTY_DAY_PLAN };
const TOTAL_DAYS = THIRTY_DAY_PLAN.length;
if (TOTAL_DAYS !== 30) {
  throw new Error(`Invalid planner mapping: expected 30 days, found ${TOTAL_DAYS}`);
}

type ActivityRecord = {
  mode?: "learn" | "oral" | "examiner" | string;
  subject?: string;
  topics?: string[];
  chapters?: string[];
  percentage?: number | null;
  scorePercent?: number | null;
  created_at?: string;
  date?: string;
};

type AnalyzeProgressResult = {
  subjectPerformance: Record<string, number>;
  topicFrequency: Record<string, number>;
  weakSubjects: string[];
  strongSubjects: string[];
  weakTopics: string[];
  suggestions: string[];
};

const PLANNER_KEY = "planner_state";
const ACTIVITY_KEY = "shauri_exam_attempts";


function nowTs(): number {
  return Date.now();
}

function uniq(nums: number[]): number[] {
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function normText(v: string | undefined): string {
  return (v || "").toLowerCase().trim();
}

function includesLoose(text: string, needle: string): boolean {
  return normText(text).includes(normText(needle));
}

function createDefaultState(): PlannerState {
  return {
    current_day: 1,
    cycle: 1,
    completed_days: [],
    skipped_days: [],
    last_updated: nowTs(),
    last_action: undefined,
  };
}

export function getPlannerState(): PlannerState {
  if (typeof window === "undefined") return createDefaultState();
  try {
    const raw = localStorage.getItem(PLANNER_KEY);
    if (!raw) return createDefaultState();
    const parsed = JSON.parse(raw) as Partial<PlannerState>;
    return normalizeState({
      current_day: parsed.current_day ?? 1,
      cycle: parsed.cycle ?? 1,
      completed_days: Array.isArray(parsed.completed_days) ? parsed.completed_days : [],
      skipped_days: Array.isArray(parsed.skipped_days) ? parsed.skipped_days : [],
      last_updated: typeof parsed.last_updated === "number" ? parsed.last_updated : nowTs(),
      last_action: parsed.last_action,
    });
  } catch {
    return createDefaultState();
  }
}

export function setPlannerState(state: PlannerState): PlannerState {
  const normalized = normalizeState(state);
  if (typeof window !== "undefined") {
    localStorage.setItem(PLANNER_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

function normalizeState(state: PlannerState): PlannerState {
  let next = {
    ...state,
    current_day: Math.max(1, Math.floor(state.current_day || 1)),
    cycle: Math.max(1, Math.floor(state.cycle || 1)),
    completed_days: uniq((state.completed_days || []).filter((n) => n >= 1 && n <= TOTAL_DAYS)),
    skipped_days: uniq((state.skipped_days || []).filter((n) => n >= 1 && n <= TOTAL_DAYS)),
    last_updated: nowTs(),
    last_action: state.last_action,
  };

  while (next.current_day > TOTAL_DAYS) {
    next = {
      ...next,
      cycle: next.cycle + 1,
      current_day: 1,
      completed_days: [],
      skipped_days: [],
      last_updated: nowTs(),
      last_action: undefined,
    };
  }

  next.skipped_days = next.skipped_days.filter((d) => !next.completed_days.includes(d));
  return next;
}

export function getActivityLogs(): ActivityRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    const parsed = JSON.parse(raw || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isTopicCoveredByLogs(dayPlan: PlannerDayPlan, logs: ActivityRecord[]): boolean {
  return dayPlan.topics.some((topic) =>
    logs.some((log) => {
      const mode = normText(log.mode);
      if (mode !== "learn" && mode !== "examiner") return false;
      const subjectHit = includesLoose(log.subject || "", topic.subject);
      const topicHit =
        (log.topics || []).some((t) => includesLoose(t, topic.topic)) ||
        (log.chapters || []).some((t) => includesLoose(t, topic.topic));
      return subjectHit || topicHit;
    })
  );
}

export function handleCarryForward(state: PlannerState): number[] {
  return uniq(state.skipped_days.filter((d) => !state.completed_days.includes(d)));
}

export function markComplete(state: PlannerState, day: number = state.current_day): PlannerState {
  const next = normalizeState({
    ...state,
    completed_days: uniq([...state.completed_days, day]),
    skipped_days: state.skipped_days.filter((d) => d !== day),
    last_updated: nowTs(),
    last_action: {
      type: "complete",
      day,
      cycle: state.cycle,
      previous_state: {
        current_day: state.current_day,
        cycle: state.cycle,
        completed_days: [...state.completed_days],
        skipped_days: [...state.skipped_days],
      },
    },
  });
  if (day === next.current_day) {
    return getCurrentDay(next, getActivityLogs());
  }
  return setPlannerState(next);
}

export function markSkipped(state: PlannerState, day: number = state.current_day): PlannerState {
  const next = normalizeState({
    ...state,
    skipped_days: uniq([...state.skipped_days, day]),
    current_day: day === state.current_day ? state.current_day + 1 : state.current_day,
    last_updated: nowTs(),
    last_action: {
      type: "skip",
      day,
      cycle: state.cycle,
      previous_state: {
        current_day: state.current_day,
        cycle: state.cycle,
        completed_days: [...state.completed_days],
        skipped_days: [...state.skipped_days],
      },
    },
  });
  return setPlannerState(next);
}

export function undoLastAction(state: PlannerState): PlannerState {
  const action = state.last_action;
  if (!action?.previous_state) return state;
  const restored = normalizeState({
    ...state,
    current_day: action.previous_state.current_day,
    cycle: action.previous_state.cycle,
    completed_days: [...action.previous_state.completed_days],
    skipped_days: [...action.previous_state.skipped_days],
    last_action: undefined,
    last_updated: nowTs(),
  });
  return setPlannerState(restored);
}

export function reopenPendingDay(state: PlannerState, day: number): PlannerState {
  const next = normalizeState({
    ...state,
    current_day: day,
    skipped_days: uniq([...state.skipped_days, day]).filter((d) => d !== day),
    completed_days: state.completed_days.filter((d) => d !== day),
    last_updated: nowTs(),
  });
  return setPlannerState(next);
}

export function getCurrentDay(state: PlannerState, logs: ActivityRecord[] = getActivityLogs()): PlannerState {
  let next = normalizeState(state);

  const autoCompleted = new Set(next.completed_days);
  for (const dayPlan of THIRTY_DAY_PLAN) {
    if (isTopicCoveredByLogs(dayPlan, logs)) autoCompleted.add(dayPlan.day);
  }
  next.completed_days = uniq(Array.from(autoCompleted));
  next.skipped_days = next.skipped_days.filter((d) => !next.completed_days.includes(d));

  while (next.completed_days.includes(next.current_day)) {
    next.current_day += 1;
  }

  next = normalizeState(next);
  return setPlannerState(next);
}

export function analyzeProgress(logs: ActivityRecord[] = getActivityLogs()): AnalyzeProgressResult {
  const bySubject: Record<string, number[]> = {};
  const topicFrequency: Record<string, number> = {};

  logs.forEach((log) => {
    const subject = (log.subject || "General").trim();
    const score =
      typeof log.percentage === "number"
        ? log.percentage
        : typeof log.scorePercent === "number"
        ? log.scorePercent
        : null;
    if (typeof score === "number" && !Number.isNaN(score)) {
      bySubject[subject] = bySubject[subject] || [];
      bySubject[subject].push(score);
    }
    (log.topics || []).forEach((topic) => {
      const key = topic.trim();
      if (!key) return;
      topicFrequency[key] = (topicFrequency[key] || 0) + 1;
    });
  });

  const subjectPerformance: Record<string, number> = {};
  Object.keys(bySubject).forEach((subject) => {
    const scores = bySubject[subject];
    subjectPerformance[subject] = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  });

  const weakSubjects = Object.entries(subjectPerformance)
    .filter(([, score]) => score < 50)
    .map(([subject]) => subject);
  const strongSubjects = Object.entries(subjectPerformance)
    .filter(([, score]) => score > 75)
    .map(([subject]) => subject);

  const weakTopics = Object.entries(topicFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([topic]) => topic);

  const suggestions: string[] = [];
  weakSubjects.forEach((s) => suggestions.push(`Prioritize ${s} with a focused Learn Mode session today.`));
  weakTopics.slice(0, 3).forEach((t) => suggestions.push(`Repeatedly attempted topic detected: ${t}. Add targeted revision + one test.`));
  strongSubjects.forEach((s) => suggestions.push(`Reduce load on ${s}; keep it in light weekly revision only.`));
  if (!suggestions.length) suggestions.push("Stay consistent: one Learn session plus one short test each day.");

  return { subjectPerformance, topicFrequency, weakSubjects, strongSubjects, weakTopics, suggestions };
}
