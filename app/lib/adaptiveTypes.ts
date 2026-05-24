export type AdaptiveMode = "oral" | "funskill" | "global";

export type AdaptiveProfilePayload = {
  userId?: string;
  studentKey: string;
  studentName: string;
  classLevel: string;
  board: string;
  mode: AdaptiveMode;
  xp: number;
  level: number;
  currentStreak: number;
  bestStreak: number;
  confidenceScore: number;
  masteryScore: number;
  speakingRank: string;
  unlockedSkills: string[];
  weakAreas: string[];
  strengths: string[];
  preferences?: Record<string, unknown>;
};

export type AdaptiveEventPayload = {
  studentKey: string;
  mode: AdaptiveMode | "practice" | "revision";
  eventType: string;
  track?: string;
  difficulty?: number;
  confidence?: number;
  payload?: Record<string, unknown>;
  createdAt?: string;
};

export type AdaptiveSessionPayload = {
  studentKey: string;
  mode: AdaptiveMode | "practice" | "revision";
  track: string;
  difficulty: number;
  startedAt: string;
  endedAt: string;
  durationSeconds: number;
  xpGained: number;
  comboPeak: number;
  accuracy?: number;
  avgResponseMs?: number;
  confidenceDelta?: number;
  performance?: Record<string, unknown>;
};

export type PronunciationPayload = {
  studentKey: string;
  topic?: string;
  transcript: string;
  expectedTerms: string[];
  detectedTerms: string[];
  pronunciationScore: number;
  fluencyScore: number;
  clarityScore: number;
  pacingWpm?: number;
  hesitationCount: number;
  feedback?: string;
};
