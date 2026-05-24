export type ChallengeDifficulty = 1 | 2 | 3 | 4 | 5;

export type ChallengeTrack =
  | "conversational"
  | "rapid_recall"
  | "viva"
  | "fluency"
  | "memory"
  | "mission"
  | "puzzle"
  | "brain_training"
  | "smart_tricks"
  | "beat_clock";

export type SessionPerformance = {
  accuracy: number;
  avgResponseMs: number;
  confidence: number;
  streak: number;
};

export type ProgressState = {
  xp: number;
  level: number;
  streakDays: number;
  currentStreak: number;
  bestStreak: number;
  confidence: number;
  speakingRank: string;
  mastery: number;
  unlocks: string[];
  lastActiveDate: string;
};

const RANKS = [
  { min: 0, label: "Initiate" },
  { min: 120, label: "Catalyst" },
  { min: 280, label: "Challenger" },
  { min: 520, label: "Strategist" },
  { min: 900, label: "Viva Commander" },
  { min: 1400, label: "Neuro Scholar" },
  { min: 2100, label: "Apex Mentor" },
] as const;

export function levelFromXp(xp: number) {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 42)) + 1);
}

export function rankFromXp(xp: number) {
  let rank: string = RANKS[0].label;
  for (const r of RANKS) {
    if (xp >= r.min) rank = r.label;
  }
  return rank;
}

export function nextLevelXp(level: number) {
  return Math.pow(level, 2) * 42;
}

export function updateDifficulty(current: ChallengeDifficulty, perf: SessionPerformance): ChallengeDifficulty {
  let next = current;
  const fast = perf.avgResponseMs > 0 && perf.avgResponseMs < 7000;
  if (perf.accuracy >= 0.8 && perf.confidence >= 70 && fast) next = Math.min(5, current + 1) as ChallengeDifficulty;
  if (perf.accuracy < 0.45 || perf.confidence < 45) next = Math.max(1, current - 1) as ChallengeDifficulty;
  return next;
}

export function computeRoundXp(params: {
  track: ChallengeTrack;
  difficulty: ChallengeDifficulty;
  correct: boolean;
  responseMs: number;
  streak: number;
  confidenceDelta?: number;
}) {
  const base = params.correct ? 18 : 6;
  const speedBonus = params.correct ? Math.max(0, 10 - Math.floor(params.responseMs / 3500)) : 0;
  const streakBonus = Math.min(15, Math.floor(params.streak / 2));
  const diffBonus = params.difficulty * 3;
  const confidenceBonus = Math.max(0, params.confidenceDelta || 0);
  const total = base + speedBonus + streakBonus + diffBonus + confidenceBonus;
  return Math.max(4, total);
}

function dateKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function isYesterday(last: string, current: string) {
  const a = new Date(last + "T00:00:00");
  const b = new Date(current + "T00:00:00");
  const diff = (b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
  return diff === 1;
}

export function defaultProgress(): ProgressState {
  return {
    xp: 0,
    level: 1,
    streakDays: 0,
    currentStreak: 0,
    bestStreak: 0,
    confidence: 52,
    speakingRank: "Initiate",
    mastery: 0,
    unlocks: ["Rapid Recall I", "Viva Warmup"],
    lastActiveDate: "",
  };
}

export function applyDailyStreak(progress: ProgressState, now = new Date()): ProgressState {
  const today = dateKey(now);
  if (!progress.lastActiveDate) {
    return { ...progress, lastActiveDate: today, currentStreak: 1, streakDays: 1, bestStreak: Math.max(progress.bestStreak, 1) };
  }
  if (progress.lastActiveDate === today) return progress;

  if (isYesterday(progress.lastActiveDate, today)) {
    const nextStreak = progress.currentStreak + 1;
    return {
      ...progress,
      lastActiveDate: today,
      currentStreak: nextStreak,
      streakDays: progress.streakDays + 1,
      bestStreak: Math.max(progress.bestStreak, nextStreak),
    };
  }

  return {
    ...progress,
    lastActiveDate: today,
    currentStreak: 1,
    streakDays: progress.streakDays + 1,
    bestStreak: Math.max(progress.bestStreak, 1),
  };
}

export function mergeProgress(progress: ProgressState, delta: {
  xpGain: number;
  confidenceGain?: number;
  masteryGain?: number;
  unlock?: string;
}) {
  const nextXp = Math.max(0, progress.xp + delta.xpGain);
  const nextLevel = levelFromXp(nextXp);
  const nextConfidence = Math.max(20, Math.min(100, progress.confidence + (delta.confidenceGain || 0)));
  const nextMastery = Math.max(0, Math.min(100, progress.mastery + (delta.masteryGain || 0)));

  const unlocks = delta.unlock && !progress.unlocks.includes(delta.unlock)
    ? [...progress.unlocks, delta.unlock]
    : progress.unlocks;

  return {
    ...progress,
    xp: nextXp,
    level: nextLevel,
    confidence: nextConfidence,
    mastery: nextMastery,
    speakingRank: rankFromXp(nextXp),
    unlocks,
  };
}

export function storageKey(mode: "oral" | "funskill", studentName: string) {
  return `shauri_${mode}_progress_${studentName.toLowerCase().replace(/\s+/g, "_")}`;
}

