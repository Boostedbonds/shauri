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

/* ---------------------------------------
SUPPORT 90 DAY PLANNER
--------------------------------------- */

const TOTAL_DAYS = THIRTY_DAY_PLAN.length;

if (TOTAL_DAYS < 30) {
  throw new Error(`Planner must have at least 30 days, found ${TOTAL_DAYS}`);
}

/* ---------------------------------------
TYPES
--------------------------------------- */

type ActivityRecord = {
  mode?: "learn" | "oral" | "examiner" | string;
  subject?: string;
  topics?: string[];
  chapters?: string[];
  percentage?: number | null;
  scorePercent?: number | null;
};

/* ---------------------------------------
STORAGE
--------------------------------------- */

const PLANNER_KEY = "planner_state";
const ACTIVITY_KEY = "shauri_exam_attempts";

/* ---------------------------------------
HELPERS
--------------------------------------- */

function nowTs(): number {
  return Date.now();
}

function uniq(nums: number[]): number[] {
  return Array.from(new Set(nums)).sort((a, b) => a - b);
}

function normText(v?: string): string {
  return (v || "").toLowerCase().trim();
}

function includesLoose(text: string, needle: string): boolean {
  return normText(text).includes(normText(needle));
}

/* ---------------------------------------
DEFAULT STATE
--------------------------------------- */

function createDefaultState(): PlannerState {
  return {
    current_day: 1,
    cycle: 1,
    completed_days: [],
    skipped_days: [],
    last_updated: nowTs(),
  };
}

/* ---------------------------------------
STATE MANAGEMENT
--------------------------------------- */

export function getPlannerState(): PlannerState {
  if (typeof window === "undefined") return createDefaultState();

  try {
    const raw = localStorage.getItem(PLANNER_KEY);
    if (!raw) return createDefaultState();

    const parsed = JSON.parse(raw);

    return normalizeState({
      current_day: parsed.current_day ?? 1,
      cycle: parsed.cycle ?? 1,
      completed_days: parsed.completed_days || [],
      skipped_days: parsed.skipped_days || [],
      last_updated: parsed.last_updated || nowTs(),
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

/* ---------------------------------------
NORMALIZE
--------------------------------------- */

function normalizeState(state: PlannerState): PlannerState {
  let next = {
    ...state,
    current_day: Math.max(1, state.current_day),
    cycle: Math.max(1, state.cycle),
    completed_days: uniq(state.completed_days),
    skipped_days: uniq(state.skipped_days),
    last_updated: nowTs(),
  };

  while (next.current_day > TOTAL_DAYS) {
    next = {
      ...next,
      cycle: next.cycle + 1,
      current_day: 1,
      completed_days: [],
      skipped_days: [],
      last_updated: nowTs(),
    };
  }

  return next;
}

/* ---------------------------------------
PROGRESS CHECK
--------------------------------------- */

function isTopicCovered(
  dayPlan: PlannerDayPlan,
  logs: ActivityRecord[]
): boolean {
  return dayPlan.topics.some((topic) =>
    logs.some((log) => {
      if (normText(log.mode) !== "learn") return false;

      return (
        includesLoose(log.subject || "", topic.subject) ||
        (log.topics || []).some((t) =>
          includesLoose(t, topic.topic)
        )
      );
    })
  );
}

/* ---------------------------------------
CURRENT DAY CALCULATION
--------------------------------------- */

export function getCurrentDay(
  state: PlannerState,
  logs: ActivityRecord[] = getActivityLogs()
): PlannerState {

  let next = normalizeState(state);

  for (const dayPlan of THIRTY_DAY_PLAN) {
    if (isTopicCovered(dayPlan, logs)) {
      next.completed_days.push(dayPlan.day);
    }
  }

  next.completed_days = uniq(next.completed_days);

  while (next.completed_days.includes(next.current_day)) {
    next.current_day++;
  }

  return setPlannerState(next);
}

/* ---------------------------------------
ACTIVITY LOGS
--------------------------------------- */

export function getActivityLogs(): ActivityRecord[] {
  if (typeof window === "undefined") return [];

  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_KEY) || "[]");
  } catch {
    return [];
  }
}

/* ---------------------------------------
ACTIONS (FIXES YOUR ERROR)
--------------------------------------- */

export function markComplete(
  stateOrDay: PlannerState | number,
  maybeDay?: number
): PlannerState {
  const state = typeof stateOrDay === "number" ? getPlannerState() : normalizeState(stateOrDay);
  const day = typeof stateOrDay === "number" ? stateOrDay : maybeDay;
  if (!day) return setPlannerState(state);

  const updated: PlannerState = {
    ...state,
    completed_days: uniq([...state.completed_days, day]),
    skipped_days: state.skipped_days.filter((d) => d !== day),
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
  };

  return setPlannerState(updated);
}

export function markSkipped(
  stateOrDay: PlannerState | number,
  maybeDay?: number
): PlannerState {
  const state = typeof stateOrDay === "number" ? getPlannerState() : normalizeState(stateOrDay);
  const day = typeof stateOrDay === "number" ? stateOrDay : maybeDay;
  if (!day) return setPlannerState(state);

  const updated: PlannerState = {
    ...state,
    skipped_days: uniq([...state.skipped_days, day]),
    completed_days: state.completed_days.filter((d) => d !== day),
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
  };

  return setPlannerState(updated);
}

export function undoLastAction(stateArg?: PlannerState): PlannerState {
  const state = stateArg ? normalizeState(stateArg) : getPlannerState();

  if (!state.last_action) return state;

  const prev = state.last_action.previous_state;

  return setPlannerState({
    current_day: prev.current_day,
    cycle: prev.cycle,
    completed_days: prev.completed_days,
    skipped_days: prev.skipped_days,
    last_updated: nowTs(),
  });
}

export function reopenPendingDay(
  stateOrDay: PlannerState | number,
  maybeDay?: number
): PlannerState {
  const state = typeof stateOrDay === "number" ? getPlannerState() : normalizeState(stateOrDay);
  const day = typeof stateOrDay === "number" ? stateOrDay : maybeDay;
  if (!day) return setPlannerState(state);

  const updated: PlannerState = {
    ...state,
    completed_days: state.completed_days.filter((d) => d !== day),
    skipped_days: state.skipped_days.filter((d) => d !== day),
  };

  return setPlannerState(updated);
}

export function handleCarryForward(stateArg?: PlannerState): number[] {
  const state = stateArg ? normalizeState(stateArg) : getPlannerState();
  const pending = [...state.skipped_days];

  for (let day = 1; day < state.current_day; day++) {
    if (!state.completed_days.includes(day) && !pending.includes(day)) {
      pending.push(day);
    }
  }

  return uniq(pending);
}