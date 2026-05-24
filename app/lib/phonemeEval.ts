const PHONEME_MAP: Record<string, string[]> = {
  photosynthesis: ["F", "OW", "T", "OW", "S", "IH", "N", "TH", "AH", "S", "IH", "S"],
  chlorophyll: ["K", "L", "AO", "R", "AH", "F", "IH", "L"],
  mitochondria: ["M", "AY", "T", "OW", "K", "AA", "N", "D", "R", "IY", "AH"],
  refraction: ["R", "IH", "F", "R", "AE", "K", "SH", "AH", "N"],
  osmosis: ["AA", "Z", "M", "OW", "S", "IH", "S"],
  acceleration: ["AE", "K", "S", "EH", "L", "ER", "EY", "SH", "AH", "N"],
  parliament: ["P", "AA", "R", "L", "AH", "M", "AH", "N", "T"],
  latitude: ["L", "AE", "T", "AH", "T", "UW", "D"],
  longitude: ["L", "AA", "N", "JH", "AH", "T", "UW", "D"],
  ecosystem: ["IY", "K", "OW", "S", "IH", "S", "T", "AH", "M"],
};

const DIGRAPHS: Array<[string, string]> = [
  ["ph", "F"], ["th", "TH"], ["sh", "SH"], ["ch", "CH"], ["ng", "NG"], ["gh", "G"],
  ["oo", "UW"], ["ee", "IY"], ["ea", "IY"], ["ou", "AW"], ["ow", "OW"], ["ai", "EY"], ["oi", "OY"],
];

const LETTER_PHONEME: Record<string, string> = {
  a: "AH", b: "B", c: "K", d: "D", e: "EH", f: "F", g: "G", h: "HH", i: "IH", j: "JH", k: "K", l: "L",
  m: "M", n: "N", o: "OW", p: "P", q: "K", r: "R", s: "S", t: "T", u: "UH", v: "V", w: "W", x: "KS",
  y: "Y", z: "Z",
};

function normalizeToken(token: string) {
  return token.toLowerCase().replace(/[^a-z]/g, "");
}

function wordToPhonemes(word: string): string[] {
  const normalized = normalizeToken(word);
  if (!normalized) return [];
  if (PHONEME_MAP[normalized]) return PHONEME_MAP[normalized];

  let work = normalized;
  const result: string[] = [];

  while (work.length > 0) {
    let consumed = false;
    for (const [dg, ph] of DIGRAPHS) {
      if (work.startsWith(dg)) {
        result.push(ph);
        work = work.slice(dg.length);
        consumed = true;
        break;
      }
    }
    if (consumed) continue;

    const ch = work[0];
    result.push(LETTER_PHONEME[ch] || ch.toUpperCase());
    work = work.slice(1);
  }

  return result;
}

function editDistance(a: string[], b: string[]): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) dp[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) dp[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[a.length][b.length];
}

function wordSimilarity(expectedWord: string, spokenWord: string) {
  const expPh = wordToPhonemes(expectedWord);
  const gotPh = wordToPhonemes(spokenWord);
  if (!expPh.length || !gotPh.length) return { score: 0, expPh, gotPh };
  const dist = editDistance(expPh, gotPh);
  const denom = Math.max(expPh.length, gotPh.length, 1);
  const score = Math.max(0, Math.round((1 - dist / denom) * 100));
  return { score, expPh, gotPh };
}

function tokenize(text: string) {
  return text.toLowerCase().split(/\s+/).map(normalizeToken).filter(Boolean);
}

export type PhonemeEvaluation = {
  pronunciationScore: number;
  stressScore: number;
  pacingScore: number;
  fluencyScore: number;
  clarityScore: number;
  hesitationScore: number;
  pacingWpm: number;
  hesitationCount: number;
  detectedTerms: string[];
  weakPhonemes: string[];
  termBreakdown: Array<{
    term: string;
    matchedWord: string | null;
    score: number;
    expectedPhonemes: string[];
    spokenPhonemes: string[];
  }>;
  feedback: string[];
};

export function evaluatePhonemePronunciation(params: {
  transcript: string;
  expectedTerms: string[];
  durationMs: number;
  pauses?: number;
  subject?: string;
}): PhonemeEvaluation {
  const tokens = tokenize(params.transcript);
  const durationMin = Math.max(0.15, params.durationMs / 60000);
  const wpm = tokens.length / durationMin;
  const hesitationCount = (params.pauses || 0) + (params.transcript.match(/\b(um|uh|hmm|like|matlab|aa|mmm)\b/gi) || []).length;

  const termBreakdown = (params.expectedTerms || []).map((term) => {
    const normalizedTerm = normalizeToken(term);
    const candidates = tokens.filter((t) => Math.abs(t.length - normalizedTerm.length) <= 4);
    let best = { score: 0, word: null as string | null, expPh: [] as string[], gotPh: [] as string[] };
    for (const candidate of candidates) {
      const sim = wordSimilarity(normalizedTerm, candidate);
      if (sim.score > best.score) best = { score: sim.score, word: candidate, expPh: sim.expPh, gotPh: sim.gotPh };
    }
    return {
      term: term,
      matchedWord: best.word,
      score: best.score,
      expectedPhonemes: best.expPh,
      spokenPhonemes: best.gotPh,
    };
  });

  const detectedTerms = termBreakdown.filter((t) => t.score >= 55).map((t) => t.term);
  const avgTermScore = termBreakdown.length
    ? termBreakdown.reduce((acc, t) => acc + t.score, 0) / termBreakdown.length
    : 70;

  const pacingScore = wpm < 90 ? 62 : wpm > 185 ? 65 : 86;
  const hesitationScore = Math.max(40, 92 - hesitationCount * 5);
  const stressScore = Math.max(45, Math.min(92, avgTermScore * 0.9 + 10));
  const clarityScore = Math.max(40, Math.min(95, avgTermScore * 0.7 + hesitationScore * 0.3));
  const fluencyScore = Math.max(40, Math.min(96, (pacingScore * 0.5) + (hesitationScore * 0.5)));
  const pronunciationScore = Math.round((avgTermScore * 0.45) + (fluencyScore * 0.2) + (clarityScore * 0.2) + (stressScore * 0.15));

  const weakPhonemes = termBreakdown
    .filter((t) => t.score < 70 && t.expectedPhonemes.length > 0)
    .flatMap((t) => t.expectedPhonemes)
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 8);

  const feedback: string[] = [];
  if (pronunciationScore >= 82) feedback.push("Excellent clarity and technical pronunciation. Keep this delivery style in viva rounds.");
  else if (pronunciationScore >= 68) feedback.push("Strong progress. Focus on key science terms and stress the middle syllables clearly.");
  else feedback.push("Good effort. Slow the pace slightly and repeat core terms once before your final answer.");

  if (hesitationCount >= 3) feedback.push("Try one micro-pause between ideas instead of filler words. Your confidence will sound stronger.");
  if (wpm > 185) feedback.push("Your pace is high. Reduce speed by 10-15% for clearer articulation.");
  if (detectedTerms.length > 0) feedback.push(`Great use of terminology: ${detectedTerms.slice(0, 4).join(", ")}.`);

  return {
    pronunciationScore,
    stressScore,
    pacingScore,
    fluencyScore,
    clarityScore,
    hesitationScore,
    pacingWpm: Number(wpm.toFixed(1)),
    hesitationCount,
    detectedTerms,
    weakPhonemes,
    termBreakdown,
    feedback,
  };
}
