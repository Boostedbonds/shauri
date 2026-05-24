const SCIENCE_TERMS = [
  "photosynthesis", "osmosis", "mitochondria", "respiration", "chlorophyll", "atom", "molecule",
  "valency", "acceleration", "momentum", "refraction", "evaporation", "condensation", "ecosystem",
  "parliament", "monsoon", "latitude", "longitude", "alloy", "electrolysis",
];

const FILLERS = ["um", "uh", "like", "matlab", "you know", "hmm", "aa", "mmm"];

export type PronunciationAnalysis = {
  pronunciationScore: number;
  fluencyScore: number;
  clarityScore: number;
  pacingWpm: number;
  hesitationCount: number;
  detectedTerms: string[];
  feedback: string;
};

export function analyzePronunciation(params: {
  transcript: string;
  durationMs: number;
  pauseCount?: number;
  expectedTerms?: string[];
}) : PronunciationAnalysis {
  const text = (params.transcript || "").toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const durationMin = Math.max(0.15, params.durationMs / 60000);
  const wpm = words.length / durationMin;

  const expected = (params.expectedTerms || []).map((t) => t.toLowerCase());
  const dictionary = expected.length ? expected : SCIENCE_TERMS;
  const detectedTerms = dictionary.filter((term) => text.includes(term));

  const fillerHits = FILLERS.reduce((acc, f) => acc + (text.match(new RegExp(`\\b${f}\\b`, "g")) || []).length, 0);
  const pauses = (params.pauseCount || 0) + fillerHits;

  const pacingScore = wpm < 95 ? 58 : wpm > 190 ? 62 : 85;
  const terminologyCoverage = expected.length
    ? Math.min(100, Math.round((detectedTerms.length / Math.max(1, expected.length)) * 100))
    : Math.min(100, 50 + detectedTerms.length * 10);

  const hesitationPenalty = Math.min(30, pauses * 4);
  const fluencyScore = Math.max(35, Math.min(96, pacingScore - hesitationPenalty + 8));

  const avgWordLen = words.length ? words.reduce((a, w) => a + w.length, 0) / words.length : 0;
  const clarityBase = avgWordLen >= 3.8 ? 80 : 68;
  const clarityScore = Math.max(40, Math.min(95, clarityBase - hesitationPenalty / 2 + Math.min(12, detectedTerms.length * 2)));

  const pronunciationScore = Math.max(42, Math.min(97, Math.round((fluencyScore * 0.45) + (clarityScore * 0.3) + (terminologyCoverage * 0.25))));

  const feedback = pronunciationScore >= 80
    ? "Strong delivery. Keep this pacing and add sharper emphasis on key terms."
    : pronunciationScore >= 65
      ? "Good progress. Slow down slightly on complex words and reduce fillers for clearer viva performance."
      : "You are building momentum. Use shorter sentences, pause between ideas, and repeat scientific terms once before answering.";

  return {
    pronunciationScore,
    fluencyScore,
    clarityScore,
    pacingWpm: Number(wpm.toFixed(1)),
    hesitationCount: pauses,
    detectedTerms,
    feedback,
  };
}
