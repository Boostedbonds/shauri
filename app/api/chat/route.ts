import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { systemPrompt } from "../../lib/prompts";
import { syllabus } from "../../lib/syllabus";
import { addActivity, upsertUser } from "../../lib/hawkeyeStore";
import { searchKnowledge } from "../../lib/knowledgeBase";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TYPES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StudentContext = {
  name?: string;
  class?: string;
  board?: string;
  sessionId?: string;
};

type ExamSession = {
  session_key: string;
  status: "IDLE" | "READY" | "IN_EXAM" | "FAILED";
  subject_request?: string;
  subject?: string;
  custom_instructions?: string;
  question_paper?: string;
  answer_log: string[];
  started_at?: number;
  total_marks?: number;
  syllabus_from_upload?: string;
  student_name?: string;
  student_class?: string;
  student_board?: string;
};

type ChapterEntry = { number: number; name: string };

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SHAURI PAPER TYPE â€” FIX 6: added writingSubjects array
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ShauriPaperData = {
  isRevisionDay:    boolean;
  totalMarks:       number;
  timeMinutes:      number;
  primarySubject:   string;
  primaryTopic:     string;
  secondarySubject: string;
  secondaryTopic:   string;
  writingSubject:   string;
  writingSubjects?: string[];          // FIX 6: dual-language support
  weekCoverage?:    string;
  dayNum:           number;
  cycleNum:         number;
  formatBlock:      string;
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// INPUT VALIDATION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const VALID_BOARDS = ["CBSE", "ICSE", "IB"];
const MIN_CLASS    = 6;
const MAX_CLASS    = 12;

function sanitiseBoard(raw: string): string {
  const upper = (raw || "").toUpperCase().trim();
  return VALID_BOARDS.includes(upper) ? upper : "CBSE";
}

function sanitiseClass(raw: string): string {
  const cleaned = (raw || "").replace(/^class\s*/i, "").trim();
  const n = parseInt(cleaned);
  if (isNaN(n)) return String(syllabus.class);
  return String(Math.min(Math.max(n, MIN_CLASS), MAX_CLASS));
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STRONG RANDOMISATION HELPERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function makeSeed(): string {
  const ts  = Date.now();
  const r1  = Math.random().toString(36).slice(2, 9);
  const r2  = Math.random().toString(36).slice(2, 9);
  const r3  = Math.floor(Math.random() * 999983).toString();
  return `[SEED:${ts}-${r1}-${r2}-${r3}]`;
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// VARIETY BANKS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ENGLISH_VERBS = shuffle([
  "Explain", "Describe", "Analyse", "Compare", "Discuss",
  "Illustrate", "Evaluate", "Justify", "Summarise", "Interpret",
  "Examine", "Elaborate", "Critically analyse", "Comment on",
]);

const HINDI_VERBS = shuffle([
  "à¤ªà¤°à¤¿à¤­à¤¾à¤·à¤¿à¤¤ à¤•à¥€à¤œà¤¿à¤", "à¤‰à¤¦à¤¾à¤¹à¤°à¤£ à¤¦à¥€à¤œà¤¿à¤", "à¤…à¤‚à¤¤à¤° à¤¸à¥à¤ªà¤·à¥à¤Ÿ à¤•à¥€à¤œà¤¿à¤", "à¤µà¥à¤¯à¤¾à¤–à¥à¤¯à¤¾ à¤•à¥€à¤œà¤¿à¤",
  "à¤‰à¤šà¤¿à¤¤ à¤‰à¤¦à¤¾à¤¹à¤°à¤£ à¤¸à¤¹à¤¿à¤¤ à¤¸à¤®à¤à¤¾à¤‡à¤", "à¤ªà¤¹à¤šà¤¾à¤¨ à¤•à¥€à¤œà¤¿à¤", "à¤°à¤¿à¤•à¥à¤¤ à¤¸à¥à¤¥à¤¾à¤¨ à¤­à¤°à¤¿à¤",
  "à¤¶à¥à¤¦à¥à¤§ à¤•à¥€à¤œà¤¿à¤", "à¤µà¤¾à¤•à¥à¤¯ à¤®à¥‡à¤‚ à¤ªà¥à¤°à¤¯à¥‹à¤— à¤•à¥€à¤œà¤¿à¤", "à¤¸à¤¹à¥€ à¤µà¤¿à¤•à¤²à¥à¤ª à¤šà¥à¤¨à¤¿à¤",
]);

const SCIENCE_CONTEXTS = shuffle([
  "with a labelled diagram", "using an example from daily life",
  "with the help of a chemical equation", "referencing a real-world application",
  "using the correct scientific terminology", "with a suitable experiment",
  "comparing it with a related concept", "by stating its significance",
]);

const MATH_CONTEXTS = shuffle([
  "showing all steps", "providing a proof", "using a diagram",
  "using a real-life word problem", "by stating the theorem used",
  "finding all possible cases", "using algebraic methods",
  "using the formula and substituting values",
]);

const SST_CONTEXTS = shuffle([
  "with historical evidence", "citing specific examples from the textbook",
  "with a map reference where applicable", "mentioning the key causes and effects",
  "comparing two different perspectives", "using dates and facts",
  "explaining the significance of the event/concept",
]);

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PARSE CUSTOM PAPER REQUIREMENTS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface PaperRequirements {
  totalMarks: number | null;
  timeMinutes: number | null;
  questionTypes: string[];
  questionCount: number | null;
  marksEach: number | null;
  chapterFilter: string | null;
  topicKeyword: string | null;
  isCustom: boolean;
}

function parsePaperRequirements(text: string): PaperRequirements {
  const t = text.toLowerCase();

  const marksMatch =
    t.match(/(\d+)\s*(?:marks?|mark)\s*(?:exam|test|paper|quiz)?/) ||
    t.match(/(?:exam|test|paper|quiz)\s*(?:of|for)?\s*(\d+)\s*marks?/);
  const totalMarks = marksMatch ? parseInt(marksMatch[1]) : null;

  let timeMinutes: number | null = null;
  const hoursMatch   = t.match(/(\d+)\s*(?:hour|hr)s?\b/);
  const minutesMatch = t.match(/(\d+)\s*(?:minute|min)s?\b/);
  if (hoursMatch)   timeMinutes = parseInt(hoursMatch[1]) * 60;
  if (minutesMatch) timeMinutes = (timeMinutes || 0) + parseInt(minutesMatch[1]);
  if (timeMinutes === 0) timeMinutes = null;

  const questionTypes: string[] = [];
  if (/\b(mcq|multiple.?choice)\b/.test(t))      questionTypes.push("MCQ");
  if (/\bshort\s*answer\b/.test(t))               questionTypes.push("Short Answer");
  if (/\blong\s*answer\b/.test(t))                questionTypes.push("Long Answer");
  if (/\bfill\s*in\b/.test(t))                    questionTypes.push("Fill in the Blank");
  if (/\btrue.false\b/.test(t))                   questionTypes.push("True/False");
  if (/\bone.word\b/.test(t))                     questionTypes.push("One-Word");
  if (/\bvery\s*short\b/.test(t))                 questionTypes.push("Very Short Answer");

  const countMatch =
    t.match(/(\d+)\s*(?:mcq|questions?|q\.?s?|problems?|items?)/) ||
    t.match(/(?:give|prepare|make|create)\s*(\d+)/);
  const questionCount = countMatch ? parseInt(countMatch[1]) : null;

  const marksEachMatch =
    t.match(/(\d+)\s*marks?\s*each/) ||
    t.match(/each\s*(?:carrying|of|worth)\s*(\d+)\s*marks?/);
  const marksEach = marksEachMatch ? parseInt(marksEachMatch[1]) : null;

  let computedTotal = totalMarks;
  if (!computedTotal && questionCount && marksEach) {
    computedTotal = questionCount * marksEach;
  }

  const chapterMatch =
    t.match(/chapters?\s*([\d,\-â€“\s]+(?:and\s*\d+)?)/) ||
    t.match(/(?:from|only|on)\s*ch(?:apter)?s?\s*([\d,\-â€“\s]+(?:and\s*\d+)?)/) ||
    t.match(/(?:unit|topic)s?\s*([\d,\-â€“\s]+(?:and\s*\d+)?)/);
  const chapterFilter = chapterMatch ? `chapters ${chapterMatch[1].trim()}` : null;

  const topicKeywordMatch = !chapterFilter
    ? text.match(/(?:on|about|for|covering|from)\s+([A-Z][a-zA-Z\s]{3,30})(?:\s|$)/)
    : null;
  const topicKeyword = topicKeywordMatch ? topicKeywordMatch[1].trim() : null;

  const isCustom =
    computedTotal !== null ||
    timeMinutes !== null ||
    questionTypes.length > 0 ||
    questionCount !== null ||
    chapterFilter !== null;

  return {
    totalMarks: computedTotal,
    timeMinutes,
    questionTypes,
    questionCount,
    marksEach,
    chapterFilter,
    topicKeyword,
    isCustom,
  };
}

function hasCustomInstructions(text: string): boolean {
  return /\b(mcq|multiple.?choice|chapter|chapters|marks?\s+each|carrying|only\s+\d|q\d|question\s+\d|\d+\s+question|\d+\s+mcq|short\s+answer|long\s+answer|fill\s+in|true.false|one.word|very\s+short|section\s+[a-z]|\d+\s*marks?|\d+\s*(?:hour|hr|minute|min))\b/i.test(text);
}

function extractSubjectFromInstruction(text: string): string {
  const subjectPatterns = [
    /\b(science|physics|chemistry|biology)\b/i,
    /\b(mathematics|maths?)\b/i,
    /\b(history)\b/i,
    /\b(geography|geo)\b/i,
    /\b(civics?|political\s*science|democratic\s*politics)\b/i,
    /\b(economics?|eco)\b/i,
    /\b(sst|social\s*science)\b/i,
    /\b(english)\b/i,
    /\b(hindi)\b/i,
  ];
  for (const pat of subjectPatterns) {
    const m = text.match(pat);
    if (m) return m[1];
  }
  return text;
}

function formatTimeAllowed(minutes: number): string {
  if (minutes >= 60 && minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h} Hour${h > 1 ? "s" : ""}`;
  }
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} Hour${h > 1 ? "s" : ""} ${m} Minutes`;
  }
  return `${minutes} Minutes`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CBSE-COMPLIANT MARK DISTRIBUTION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface QuestionSlot {
  qNum: number;
  topic: string;
  marks: number;
}

function buildCbseQuestionPlan(
  totalMarks: number,
  topicLines: string[],
  reqs: PaperRequirements,
  isHindi: boolean,
  isMath: boolean
): QuestionSlot[] {
  const MAX_MARKS_PER_Q = 5;

  let targetCount: number;

  if (reqs.questionCount) {
    targetCount = reqs.questionCount;
  } else if (reqs.marksEach) {
    const clampedPerQ = Math.min(reqs.marksEach, MAX_MARKS_PER_Q);
    targetCount = Math.ceil(totalMarks / clampedPerQ);
  } else {
    if (totalMarks <= 10) {
      targetCount = Math.max(5, totalMarks);
    } else if (totalMarks <= 20) {
      targetCount = Math.max(6, Math.ceil(totalMarks / 2));
    } else if (totalMarks <= 40) {
      targetCount = Math.max(8, Math.ceil(totalMarks / 3));
    } else {
      targetCount = Math.max(10, Math.ceil(totalMarks / 3));
    }
  }

  targetCount = Math.max(5, targetCount);

  const markSlots: number[] = [];
  let remaining = totalMarks;

  if (reqs.marksEach && !reqs.questionCount) {
    const perQ = Math.min(reqs.marksEach, MAX_MARKS_PER_Q);
    const count = Math.floor(totalMarks / perQ);
    const rem   = totalMarks - count * perQ;
    for (let i = 0; i < count; i++) markSlots.push(perQ);
    for (let r = 0; r < rem; r++) markSlots.push(1);
    remaining = 0;
  } else if (reqs.questionCount && reqs.marksEach) {
    const perQ = Math.min(Math.floor(totalMarks / reqs.questionCount), MAX_MARKS_PER_Q);
    let assigned = 0;
    for (let i = 0; i < reqs.questionCount; i++) {
      const isLast = i === reqs.questionCount - 1;
      const m = isLast ? Math.min(totalMarks - assigned, MAX_MARKS_PER_Q) : perQ;
      if (m <= 0) break;
      markSlots.push(m);
      assigned += m;
    }
    let stillShort = totalMarks - markSlots.reduce((a, b) => a + b, 0);
    while (stillShort > 0) {
      markSlots.push(Math.min(stillShort, MAX_MARKS_PER_Q));
      stillShort -= Math.min(stillShort, MAX_MARKS_PER_Q);
    }
    remaining = 0;
  } else {
    const avgMarks = totalMarks / targetCount;

    let distribution: number[];
    if (avgMarks <= 1.5) {
      distribution = [1, 1, 1, 1, 2];
    } else if (avgMarks <= 2.5) {
      distribution = [1, 2, 2, 2, 3];
    } else if (avgMarks <= 3.5) {
      distribution = [2, 2, 3, 3, 4];
    } else {
      distribution = [2, 3, 3, 4, 5];
    }

    let assigned = 0;
    for (let i = 0; i < targetCount; i++) {
      const isLast = i === targetCount - 1;
      if (isLast) {
        let leftover = totalMarks - assigned;
        while (leftover > MAX_MARKS_PER_Q) {
          markSlots.push(MAX_MARKS_PER_Q);
          assigned += MAX_MARKS_PER_Q;
          leftover -= MAX_MARKS_PER_Q;
        }
        if (leftover > 0) {
          markSlots.push(leftover);
          assigned += leftover;
        }
        break;
      }
      const slotVal = distribution[i % distribution.length];
      const remainingSlots = targetCount - i - 1;
      const maxAllowed = Math.min(slotVal, MAX_MARKS_PER_Q, totalMarks - assigned - remainingSlots);
      const m = Math.max(1, maxAllowed);
      markSlots.push(m);
      assigned += m;
    }

    let shortfall = totalMarks - markSlots.reduce((a, b) => a + b, 0);
    let idx = 0;
    while (shortfall > 0 && idx < markSlots.length) {
      const room = MAX_MARKS_PER_Q - markSlots[idx];
      if (room > 0) {
        const add = Math.min(room, shortfall);
        markSlots[idx] += add;
        shortfall -= add;
      }
      idx++;
    }
    while (shortfall > 0) {
      const m = Math.min(shortfall, MAX_MARKS_PER_Q);
      markSlots.push(m);
      shortfall -= m;
    }

    remaining = 0;
  }

  const shuffledTopics = shuffle([...topicLines]);
  const plan: QuestionSlot[] = markSlots.map((marks, i) => ({
    qNum:  i + 1,
    topic: shuffledTopics[i % shuffledTopics.length] || topicLines[0] || "General",
    marks,
  }));

  return plan;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CLASS 10 CHAPTER DATABASE
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CLASS10_CHAPTERS: Record<string, { subjectName: string; chapterList: string }> = {
  mathematics: {
    subjectName: "Mathematics",
    chapterList: [
      "Chapter 1: Real Numbers (Euclid's Division Lemma, Fundamental Theorem of Arithmetic, Irrational Numbers, Decimal Expansions)",
      "Chapter 2: Polynomials (Zeros of Polynomial, Relationship between Zeros and Coefficients, Division Algorithm)",
      "Chapter 3: Pair of Linear Equations in Two Variables (Graphical Method, Substitution, Elimination, Cross-Multiplication)",
      "Chapter 4: Quadratic Equations (Standard Form, Factorisation, Completing the Square, Quadratic Formula, Discriminant)",
      "Chapter 5: Arithmetic Progressions (nth Term, Sum of n Terms, Application Problems)",
      "Chapter 6: Triangles (Similar Triangles, BPT, AA/SAS/SSS Criteria, Pythagoras Theorem, Converse)",
      "Chapter 7: Coordinate Geometry (Distance Formula, Section Formula, Area of Triangle)",
      "Chapter 8: Introduction to Trigonometry (Sin/Cos/Tan, Trigonometric Identities, Complementary Angles)",
      "Chapter 9: Some Applications of Trigonometry (Heights and Distances, Angle of Elevation, Angle of Depression)",
      "Chapter 10: Circles (Tangent to Circle, Two Tangents from External Point)",
      "Chapter 11: Areas Related to Circles (Perimeter/Area of Circle, Sector, Segment, Combination of Figures)",
      "Chapter 12: Surface Areas and Volumes (Cone, Cylinder, Sphere, Hemisphere, Frustum, Combinations)",
      "Chapter 13: Statistics (Mean by Direct/Assumed Mean/Step-Deviation, Median, Mode, Ogive)",
      "Chapter 14: Probability (Classical Probability, Sample Space, Events)",
    ].join("\n"),
  },
  science: {
    subjectName: "Science",
    chapterList: [
      "Chapter 1: Chemical Reactions and Equations (Writing & Balancing, Types: Combination/Decomposition/Displacement/Double Displacement/Redox, Oxidation, Corrosion, Rancidity)",
      "Chapter 2: Acids, Bases and Salts (Properties, pH Scale, Indicators, Salts: NaCl/NaHCO3/Na2CO3/Bleaching Powder, Plaster of Paris)",
      "Chapter 3: Metals and Non-metals (Physical & Chemical Properties, Reactivity Series, Ionic Bond, Extraction, Corrosion Prevention)",
      "Chapter 4: Carbon and Its Compounds (Covalent Bond, Allotropes, Homologous Series, IUPAC Naming, Functional Groups, Ethanol & Ethanoic Acid, Saponification)",
      "Chapter 5: Life Processes (Nutrition: Autotrophic/Heterotrophic, Photosynthesis, Respiration: Aerobic/Anaerobic, Transportation: Heart/Blood/Xylem/Phloem, Excretion: Kidneys/Nephron)",
      "Chapter 6: Control and Coordination (Nervous System, Neuron, Reflex Arc, Brain Parts, Hormones: Endocrine Glands)",
      "Chapter 7: How do Organisms Reproduce? (Asexual: Binary Fission/Budding/Spore/Vegetative, Sexual: Pollination/Fertilisation/Seeds, Human Reproductive System)",
      "Chapter 8: Heredity (Mendel's Laws, Dominant/Recessive, Sex Determination, Evolution)",
      "Chapter 9: Light â€“ Reflection and Refraction (Laws of Reflection, Spherical Mirrors, Mirror Formula, Refraction, Snell's Law, Lens Formula, Power)",
      "Chapter 10: Human Eye and Colourful World (Structure of Eye, Defects: Myopia/Hypermetropia/Presbyopia, Dispersion, Scattering)",
      "Chapter 11: Electricity (Ohm's Law, Resistance, Series/Parallel Circuits, Heating Effect, Electric Power)",
      "Chapter 12: Magnetic Effects of Electric Current (Magnetic Field, Fleming's Rules, Electric Motor, Electromagnetic Induction, AC/DC, Generator)",
      "Chapter 13: Our Environment (Food Chain/Web, Ecosystem, Ozone Depletion, Waste Management)",
    ].join("\n"),
  },
  history: {
    subjectName: "Social Science â€“ History (India and the Contemporary World II)",
    chapterList: [
      "Chapter 1: The Rise of Nationalism in Europe (French Revolution, Napoleon, Romanticism, Grimm Brothers, Zollverein, Unification of Germany & Italy, Balkan Crisis)",
      "Chapter 2: Nationalism in India (Rowlatt Act, Jallianwala Bagh, Khilafat Movement, Non-Cooperation Movement, Civil Disobedience Movement, Salt March, Round Table Conferences, Sense of Collective Belonging)",
      "Chapter 3: The Making of a Global World (Silk Routes, Food Travels, Conquest/Disease/Trade, Indentured Labour, Great Depression, Bretton Woods, Post-War Recovery)",
      "Chapter 4: The Age of Industrialisation (Proto-Industrialisation, East India Company & Weavers, Factories in Britain & India, Manchester Comes to India, Small-Scale Industries)",
      "Chapter 5: Print Culture and the Modern World (Gutenberg Press, Print in Europe, Print in India, Religious Reform, Women and Print, Print and the Poor)",
    ].join("\n"),
  },
  geography: {
    subjectName: "Social Science â€“ Geography (Contemporary India II)",
    chapterList: [
      "Chapter 1: Resources and Development (Types of Resources, Development of Resources, Land Use Pattern, Soil Types, Soil Erosion & Conservation)",
      "Chapter 2: Forest and Wildlife Resources (Types of Forests, Flora & Fauna, Causes of Depletion, Conservation, Project Tiger, Biosphere Reserves)",
      "Chapter 3: Water Resources (Scarcity, Multi-Purpose River Projects, Rainwater Harvesting, Watershed Management)",
      "Chapter 4: Agriculture (Types: Primitive/Commercial/Plantation, Food Crops, Non-Food Crops, Green Revolution, Impact of Globalisation on Agriculture)",
      "Chapter 5: Minerals and Energy Resources (Types of Minerals, Distribution, Conservation, Conventional & Non-Conventional Energy Sources)",
      "Chapter 6: Manufacturing Industries (Importance, Industrial Pollution, Textile/Steel/Automobile/Chemical/IT Industries)",
      "Chapter 7: Lifelines of National Economy (Roadways, Railways, Pipelines, Waterways, Airways, Communication, International Trade)",
    ].join("\n"),
  },
  civics: {
    subjectName: "Social Science â€“ Political Science / Civics (Democratic Politics II)",
    chapterList: [
      "Chapter 1: Power Sharing (Belgian & Sri Lankan Models, Forms of Power Sharing, Majoritarianism vs Accommodation)",
      "Chapter 2: Federalism (What is Federalism, India as a Federal Country, Decentralisation, Panchayati Raj)",
      "Chapter 3: Gender, Religion and Caste (Gender & Politics, Religion & Communalism, Caste & Politics)",
      "Chapter 4: Political Parties (Functions, Types, National vs Regional, Challenges, Reforms)",
      "Chapter 5: Outcomes of Democracy (Accountable/Legitimate Government, Economic Growth, Inequality, Dignity, Evaluation)",
    ].join("\n"),
  },
  economics: {
    subjectName: "Social Science â€“ Economics (Understanding Economic Development)",
    chapterList: [
      "Chapter 1: Development (What is Development, Income and Other Goals, National Development, Sustainable Development)",
      "Chapter 2: Sectors of the Indian Economy (Primary/Secondary/Tertiary, GDP, Organised/Unorganised, MNREGA)",
      "Chapter 3: Money and Credit (Barter System, Money, Formal/Informal Credit, SHGs, Credit in India)",
      "Chapter 4: Globalisation and the Indian Economy (MNCs, FDI, WTO, Impact of Globalisation, Fair Globalisation)",
      "Chapter 5: Consumer Rights (Consumer Exploitation, Rights, COPRA, Consumer Awareness, ISI/Agmark)",
    ].join("\n"),
  },
  english: {
    subjectName: "English â€“ First Flight & Footprints Without Feet",
    chapterList: [
      "First Flight â€“ Prose: A Letter to God, Nelson Mandela Long Walk to Freedom, Two Stories About Flying, From the Diary of Anne Frank, Glimpses of India, Mijbil the Otter, Madam Rides the Bus, The Sermon at Benares, The Proposal (Drama)",
      "First Flight â€“ Poetry: Dust of Snow, Fire and Ice, A Tiger in the Zoo, How to Tell Wild Animals, The Ball Poem, Amanda, Animals, The Trees, Fog, The Tale of Custard the Dragon, For Anne Gregory",
      "Footprints Without Feet: A Triumph of Surgery, The Thief's Story, The Midnight Visitor, A Question of Trust, Footprints Without Feet, The Making of a Scientist, The Necklace, Bholi, The Book That Saved the Earth",
      "Grammar: Determiners, Tenses, Modals, Active-Passive Voice, Reported Speech, Subject-Verb Agreement, Clauses",
      "Writing Skills: Formal Letter, Informal Letter, Notice, Article, Story Completion, Paragraph",
    ].join("\n"),
  },
  hindi: {
    subjectName: "Hindi â€“ Sparsh, Sanchayan, Kshitij, Kritika",
    chapterList: [
      "Kshitij (Prose): Surdas ke Pad, Tulsidas ke Pad, Dev ke Savaiye/Kavitt, Jaishankar Prasad â€“ Aatmakathya, Suryakant Tripathi Nirala â€“ Utsah/At nahi rahi, Nagarjuna â€“ Yeh Danturit Muskaan, Mangu Bai â€“ Fasal",
      "Kshitij (Prose): Premchand â€“ Netaji ka Chashma, Sarveshwar Dayal Saxena â€“ Balgobin Bhagat, Anu Sinha â€“ Lakhnavii Andaz, Mannu Bhandari â€“ Manaviya Karuna ki Divya Chamak, Mahadevi Verma â€“ Mera Chhota sa Niji Pustakalaya",
      "Kritika: Maa ka Anchu, George Pancham ki Naak, Saana Saana Haath Jodi, Aye Aariz Nahi, Main Kyon Likhta Hoon",
      "Grammar: Shabd-Bhed (Sangya/Sarvanaam/Visheshan/Kriya/Avyay), Sandhi-Viched, Samas, Alankar (Anupras/Rupak/Upma/Utpreksha), Vakya-Bhed, Muhavare, Lokoktiyan",
      "Writing: Patra Lekhan (Aupcharik/Anaupcharik), Anuched Lekhan, Suchna Lekhan, Sandesh Lekhan, Vigyapan",
    ].join("\n"),
  },
};

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SUPABASE SESSION HELPERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function getSession(key: string): Promise<ExamSession | null> {
  try {
    const { data, error } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("session_key", key)
      .single();
    if (error || !data) return null;
    return {
      ...data,
      answer_log: Array.isArray(data.answer_log) ? data.answer_log : [],
    } as ExamSession;
  } catch {
    return null;
  }
}

async function saveSession(session: ExamSession): Promise<void> {
  try {
    await supabase.from("exam_sessions").upsert(
      { ...session, updated_at: new Date().toISOString() },
      { onConflict: "session_key" }
    );
  } catch {
    console.error("saveSession failed for key:", session.session_key);
  }
}

async function deleteSession(key: string): Promise<void> {
  try {
    await supabase.from("exam_sessions").delete().eq("session_key", key);
  } catch {
    console.error("deleteSession failed for key:", key);
  }
}

async function getSessionByStudent(
  studentName: string,
  studentClass: string,
  requiredStatus?: ExamSession["status"]
): Promise<ExamSession | null> {
  if (!studentName) return null;

  async function runQuery(nameVal: string, classVal?: string): Promise<ExamSession | null> {
    try {
      let q = supabase
        .from("exam_sessions")
        .select("*")
        .eq("student_name", nameVal);
      if (classVal) q = (q as any).eq("student_class", classVal);
      if (requiredStatus) q = (q as any).eq("status", requiredStatus);
      const { data, error } = await (q as any)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) return null;
      return {
        ...data[0],
        answer_log: Array.isArray(data[0].answer_log) ? data[0].answer_log : [],
      } as ExamSession;
    } catch (e) {
      console.error("[getSessionByStudent] threw:", e);
      return null;
    }
  }

  const r1 = await runQuery(studentName, studentClass);
  if (r1) return r1;
  if (studentClass) {
    const r2 = await runQuery(studentName);
    if (r2) return r2;
  }
  return null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SYLLABUS HELPERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getChaptersForSubject(
  subjectRequest: string,
  studentClass: string
): { subjectName: string; chapterList: string } {
  const req      = subjectRequest.toLowerCase();
  const classNum = parseInt(studentClass) || 9;

  if (classNum === 10) {
    if (/science|physics|chemistry|biology/.test(req))
      return CLASS10_CHAPTERS.science;
    if (/math/.test(req))
      return CLASS10_CHAPTERS.mathematics;
    if (/history/.test(req))
      return CLASS10_CHAPTERS.history;
    if (/geo|geography/.test(req))
      return CLASS10_CHAPTERS.geography;
    if (/civic|politic|democracy/.test(req))
      return CLASS10_CHAPTERS.civics;
    if (/econ/.test(req))
      return CLASS10_CHAPTERS.economics;
    if (/sst|social/.test(req)) {
      return {
        subjectName: "Social Science (History + Geography + Civics + Economics)",
        chapterList:
          `HISTORY:\n${CLASS10_CHAPTERS.history.chapterList}\n\n` +
          `GEOGRAPHY:\n${CLASS10_CHAPTERS.geography.chapterList}\n\n` +
          `CIVICS:\n${CLASS10_CHAPTERS.civics.chapterList}\n\n` +
          `ECONOMICS:\n${CLASS10_CHAPTERS.economics.chapterList}`,
      };
    }
    if (/english/.test(req))
      return CLASS10_CHAPTERS.english;
    if (/hindi/.test(req))
      return CLASS10_CHAPTERS.hindi;
    return {
      subjectName: subjectRequest,
      chapterList: `Use the complete official NCERT Class 10 ${subjectRequest} syllabus.`,
    };
  }

  if (classNum === 9) {
    const s = syllabus.subjects;

    if (/science|physics|chemistry|biology/.test(req)) {
      return {
        subjectName: s.science.name,
        chapterList: (s.science.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/math/.test(req)) {
      return {
        subjectName: s.mathematics.name,
        chapterList: (s.mathematics.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/history/.test(req)) {
      return {
        subjectName: "Social Science â€“ History",
        chapterList: (s.social_science.history.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/geo|geography/.test(req)) {
      return {
        subjectName: "Social Science â€“ Geography (Contemporary India I)",
        chapterList: (s.social_science.geography.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/civic|politic|democracy/.test(req)) {
      return {
        subjectName: "Social Science â€“ Civics (Democratic Politics I)",
        chapterList: (s.social_science.civics.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/econ/.test(req)) {
      return {
        subjectName: "Social Science â€“ Economics",
        chapterList: (s.social_science.economics.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/sst|social/.test(req)) {
      const hist = (s.social_science.history.chapters as ChapterEntry[])
        .map((c) => `[History] Ch${c.number}: ${c.name}`).join("\n");
      const geo = (s.social_science.geography.chapters as ChapterEntry[])
        .map((c) => `[Geography] Ch${c.number}: ${c.name}`).join("\n");
      const civ = (s.social_science.civics.chapters as ChapterEntry[])
        .map((c) => `[Civics] Ch${c.number}: ${c.name}`).join("\n");
      const eco = (s.social_science.economics.chapters as ChapterEntry[])
        .map((c) => `[Economics] Ch${c.number}: ${c.name}`).join("\n");
      return {
        subjectName: "Social Science (SST)",
        chapterList: `HISTORY:\n${hist}\n\nGEOGRAPHY:\n${geo}\n\nCIVICS:\n${civ}\n\nECONOMICS:\n${eco}`,
      };
    }
    if (/english/.test(req)) {
      const { fiction, poetry, drama } = s.english.sections;
      return {
        subjectName: "English â€“ Beehive",
        chapterList:
          `FICTION:\n${fiction.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}\n\n` +
          `POETRY:\n${poetry.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}\n\n` +
          `DRAMA:\n${drama.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}`,
      };
    }
    if (/hindi/.test(req)) {
      const { prose_poetry, grammar } = s.hindi.sections;
      return {
        subjectName: "Hindi",
        chapterList:
          `PROSE & POETRY:\n${prose_poetry.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}\n\n` +
          `GRAMMAR:\n${grammar.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}`,
      };
    }
    return {
      subjectName: subjectRequest,
      chapterList: `Use the complete official NCERT Class 9 ${subjectRequest} syllabus from your training knowledge.`,
    };
  }

  const subjectLabel =
    /science|physics|chemistry|biology/.test(req) ? "Science" :
    /math/.test(req)                               ? "Mathematics" :
    /history/.test(req)                            ? "Social Science â€“ History" :
    /geo|geography/.test(req)                      ? "Social Science â€“ Geography" :
    /civic|politic|democracy/.test(req)            ? "Social Science â€“ Civics/Political Science" :
    /econ/.test(req)                               ? "Economics" :
    /sst|social/.test(req)                         ? "Social Science" :
    /english/.test(req)                            ? "English" :
    /hindi/.test(req)                              ? "Hindi" :
    subjectRequest;

  const subjectName = `${subjectLabel} â€“ Class ${classNum}`;
  const chapterList = [
    `[NCERT SYLLABUS â€” CLASS ${classNum} ${subjectLabel.toUpperCase()}]`,
    `Use the real, complete official NCERT/CBSE Class ${classNum} ${subjectLabel} syllabus.`,
    `Draw questions ONLY from genuine NCERT Class ${classNum} ${subjectLabel} chapters as prescribed by CBSE.`,
    getNcertTopicHints(subjectLabel, classNum),
  ].join("\n");

  return { subjectName, chapterList };
}

function getNcertTopicHints(subject: string, classNum: number): string {
  const s = subject.toLowerCase();

  if (/english/.test(s)) {
    const hintMap: Record<number, string> = {
      6:  "A Tale of Two Birds, The Friendly Mongoose, The Shepherd's Treasure, Taro's Reward, An Indian â€“ American Woman in Space, The Wonder Called Sleep, A Pact with the Sun",
      7:  "Three Questions, A Gift of Chappals, Gopal and the Hilsa-Fish, The Ashes That Made Trees Bloom, Quality, Expert Detectives, The Invention of Vita-Wonk",
      8:  "The Best Christmas Present in the World, The Tsunami, Glimpses of the Past, Bepin Choudhury's Lapse of Memory, The Summit Within, This is Jody's Fawn, A Visit to Cambridge",
      11: "The Portrait of a Lady, We're Not Afraid to Die, Discovering Tut, The Laburnum Top, The Voice of the Rain, Silk Road, Father to Son",
      12: "The Last Lesson, Lost Spring, Deep Water, The Rattrap, Indigo, Poets and Pancakes, The Interview, Going Places",
    };
    return hintMap[classNum] || `NCERT Class ${classNum} English chapters from the prescribed textbook`;
  }

  if (/mathematics|maths/.test(s)) {
    const hintMap: Record<number, string> = {
      6:  "Knowing Our Numbers, Whole Numbers, Playing with Numbers, Basic Geometrical Ideas, Understanding Elementary Shapes, Integers, Fractions, Decimals, Data Handling, Mensuration, Algebra, Ratio and Proportion",
      7:  "Integers, Fractions and Decimals, Data Handling, Simple Equations, Lines and Angles, The Triangle and its Properties, Congruence of Triangles, Comparing Quantities, Rational Numbers, Practical Geometry, Perimeter and Area, Algebraic Expressions, Exponents and Powers",
      8:  "Rational Numbers, Linear Equations in One Variable, Understanding Quadrilaterals, Practical Geometry, Data Handling, Squares and Square Roots, Cubes and Cube Roots, Comparing Quantities, Algebraic Expressions and Identities, Mensuration, Exponents and Powers, Direct and Inverse Proportions, Factorisation, Introduction to Graphs",
      11: "Sets, Relations and Functions, Trigonometric Functions, Principle of Mathematical Induction, Complex Numbers, Linear Inequalities, Permutations and Combinations, Binomial Theorem, Sequences and Series, Straight Lines, Conic Sections, Introduction to 3D Geometry, Limits and Derivatives, Statistics, Probability",
      12: "Relations and Functions, Inverse Trigonometric Functions, Matrices, Determinants, Continuity and Differentiability, Application of Derivatives, Integrals, Application of Integrals, Differential Equations, Vector Algebra, 3D Geometry, Linear Programming, Probability",
    };
    return hintMap[classNum] || `NCERT Class ${classNum} Mathematics chapters`;
  }

  if (/science/.test(s)) {
    const hintMap: Record<number, string> = {
      6:  "Food: Where Does It Come From?, Components of Food, Fibre to Fabric, Sorting Materials into Groups, Separation of Substances, Changes Around Us, Getting to Know Plants, Body Movements, The Living Organisms, Motion and Measurement, Light Shadows and Reflections, Electricity and Circuits, Fun with Magnets, Water, Air Around Us",
      7:  "Nutrition in Plants, Nutrition in Animals, Fibre to Fabric, Heat, Acids Bases and Salts, Physical and Chemical Changes, Weather Climate Adaptations, Winds Storms Cyclones, Soil, Respiration in Organisms, Transportation, Reproduction in Plants, Motion and Time, Electric Current, Light, Water Resources, Forests, Wastewater",
      8:  "Crop Production, Microorganisms, Synthetic Fibres and Plastics, Metals and Non-Metals, Coal and Petroleum, Combustion and Flame, Conservation, Cell Structure, Reproduction in Animals, Adolescence, Force and Pressure, Friction, Sound, Chemical Effects of Electric Current, Natural Phenomena, Light, Stars and Solar System, Pollution",
      11: "Physical World, Units and Measurement, Motion in a Straight Line, Motion in a Plane, Laws of Motion, Work Energy and Power, System of Particles, Gravitation, Mechanical Properties of Solids and Fluids, Thermal Properties, Thermodynamics, Kinetic Theory, Oscillations, Waves",
      12: "Electric Charges and Fields, Electrostatic Potential, Current Electricity, Moving Charges and Magnetism, Magnetism and Matter, Electromagnetic Induction, Alternating Current, Electromagnetic Waves, Ray Optics, Wave Optics, Dual Nature of Radiation, Atoms, Nuclei, Semiconductor Electronics",
    };
    return hintMap[classNum] || `NCERT Class ${classNum} Science chapters`;
  }

  if (/social science|history/.test(s)) {
    const hintMap: Record<number, string> = {
      6:  "What Where How and When, From Hunting Gathering to Growing Food, In the Earliest Cities, What Books and Burials Tell Us, Kingdoms Kings and an Early Republic, New Questions and Ideas, Ashoka, Vital Villages, Traders Kings and Pilgrims, New Empires, Buildings Paintings and Books",
      7:  "Tracing Changes, New Kings and Kingdoms, The Delhi Sultans, The Mughal Empire, Rulers and Buildings, Towns Traders Craftspersons, Tribes Nomads, Devotional Paths, Making of Regional Cultures, Eighteenth-Century Political Formations",
      8:  "How When and Where, From Trade to Territory, Ruling the Countryside, Tribals Dikus, When People Rebel 1857, Colonialism and the City, Weavers Iron Smelters, Civilising the Native, Women Caste and Reform, Changing World of Visual Arts, Making of the National Movement",
    };
    return hintMap[classNum] || `NCERT Class ${classNum} Social Science chapters`;
  }

  if (/hindi/.test(s)) {
    const hintMap: Record<number, string> = {
      6:  "à¤µà¤¹ à¤šà¤¿à¤¡à¤¼à¤¿à¤¯à¤¾ à¤œà¥‹, à¤¬à¤šà¤ªà¤¨, à¤¨à¤¾à¤¦à¤¾à¤¨ à¤¦à¥‹à¤¸à¥à¤¤, à¤šà¤¾à¤à¤¦ à¤¸à¥‡ à¤¥à¥‹à¤¡à¤¼à¥€ à¤¸à¥€ à¤—à¤ªà¥à¤ªà¥‡à¤‚, à¤…à¤•à¥à¤·à¤°à¥‹à¤‚ à¤•à¤¾ à¤®à¤¹à¤¤à¥à¤µ, à¤ªà¤¾à¤° à¤¨à¤œà¤¼à¤° à¤•à¥‡, à¤¸à¤¾à¤¥à¥€ à¤¹à¤¾à¤¥ à¤¬à¤¢à¤¼à¤¾à¤¨à¤¾, à¤à¤¸à¥‡-à¤à¤¸à¥‡, à¤Ÿà¤¿à¤•à¤Ÿ à¤à¤²à¥à¤¬à¤®, à¤à¤¾à¤à¤¸à¥€ à¤•à¥€ à¤°à¤¾à¤¨à¥€, à¤œà¥‹ à¤¦à¥‡à¤–à¤•à¤° à¤­à¥€ à¤¨à¤¹à¥€à¤‚ à¤¦à¥‡à¤–à¤¤à¥‡, à¤¸à¤‚à¤¸à¤¾à¤° à¤ªà¥à¤¸à¥à¤¤à¤• à¤¹à¥ˆ",
      7:  "à¤¹à¤® à¤ªà¤‚à¤›à¥€ à¤‰à¤¨à¥à¤®à¥à¤•à¥à¤¤ à¦—à¦—à¦¨ à¤•à¥‡, à¤¦à¤¾à¤¦à¥€ à¤®à¤¾à¤, à¤¹à¤¿à¤®à¤¾à¤²à¤¯ à¤•à¥€ à¤¬à¥‡à¤Ÿà¤¿à¤¯à¤¾à¤, à¤•à¤ à¤ªà¥à¤¤à¤²à¥€, à¤®à¤¿à¤ à¤¾à¤ˆà¤µà¤¾à¤²à¤¾, à¤°à¤•à¥à¤¤ à¤”à¤° à¤¹à¤®à¤¾à¤°à¤¾ à¤¶à¤°à¥€à¤°, à¤ªà¤¾à¤ªà¤¾ à¤–à¥‹ à¤—à¤, à¤¶à¤¾à¤® à¤à¤• à¤•à¤¿à¤¸à¤¾à¤¨, à¤šà¤¿à¤¡à¤¼à¤¿à¤¯à¤¾ à¤•à¥€ à¤¬à¤šà¥à¤šà¥€, à¤…à¤ªà¥‚à¤°à¥à¤µ à¤…à¤¨à¥à¤­à¤µ",
      8:  "à¤§à¥à¤µà¤¨à¤¿, à¤²à¤¾à¤– à¤•à¥€ à¤šà¥‚à¤¡à¤¼à¤¿à¤¯à¤¾à¤, à¤¬à¤¸ à¤•à¥€ à¤¯à¤¾à¤¤à¥à¤°à¤¾, à¤¦à¥€à¤µà¤¾à¤¨à¥‹à¤‚ à¤•à¥€ à¤¹à¤¸à¥à¤¤à¥€, à¤šà¤¿à¤Ÿà¥à¤ à¤¿à¤¯à¥‹à¤‚ à¤•à¥€ à¤…à¤¨à¥‚à¤ à¥€ à¤¦à¥à¤¨à¤¿à¤¯à¤¾, à¤­à¤—à¤µà¤¾à¤¨ à¤•à¥‡ à¤¡à¤¾à¤•à¤¿à¤, à¤•à¥à¤¯à¤¾ à¤¨à¤¿à¤°à¤¾à¤¶ à¤¹à¥à¤† à¤œà¤¾à¤, à¤¯à¤¹ à¤¸à¤¬à¤¸à¥‡ à¤•à¤ à¤¿à¤¨ à¤¸à¤®à¤¯ à¤¨à¤¹à¥€à¤‚, à¤•à¤¬à¥€à¤° à¤•à¥€ à¤¸à¤¾à¤–à¤¿à¤¯à¤¾à¤, à¤•à¤¾à¤®à¤šà¥‹à¤°",
    };
    return hintMap[classNum] || `NCERT Class ${classNum} Hindi chapters`;
  }

  return `NCERT Class ${classNum} ${subject} chapters as per the official CBSE curriculum`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// POST-GENERATION MARKS VERIFICATION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function verifyPaperMarks(paper: string, expectedTotal: number): {
  verified: number;
  isOff: boolean;
  warningMsg: string;
} {
  const matches = [...paper.matchAll(/\[(\d+)\s*marks?\]/gi)];
  let sum = 0;
  for (const m of matches) sum += parseInt(m[1]);

  const tolerance = 2;
  const isOff = Math.abs(sum - expectedTotal) > tolerance;

  const warningMsg = isOff
    ? `[PAPER MARKS WARNING] Expected ${expectedTotal}, counted ${sum} from question marks. Paper may be incomplete.`
    : "";

  if (isOff) console.warn(warningMsg);

  return { verified: sum > 0 ? sum : expectedTotal, isOff, warningMsg };
}

function parseTotalMarksFromPaper(paper: string, fallback: number = 25): number {
  const match = paper.match(/(?:maximum\s*marks?|total\s*marks?)\s*[:\-]\s*(\d+)/i);
  if (!match) {
    console.warn(`[parseTotalMarksFromPaper] Could not extract total marks â€” defaulting to ${fallback}.`);
    return fallback;
  }
  return parseInt(match[1]);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// GENERAL HELPERS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getKey(student?: StudentContext, sanitisedClass?: string): string {
  if (student?.sessionId) return student.sessionId;
  const rawCls = sanitisedClass || sanitiseClass(student?.class || "");
  const cls = rawCls.replace(/^class\s*/i, "").trim() || "x";
  return `${student?.name?.trim() || "anon"}_${cls}`;
}

function isGreeting(text: string) {
  return /^(hi|hello|hey|good\s*morning|good\s*evening|good\s*afternoon|good\s*night|gm\b|howdy|namaste|hola)\b/i.test(text.trim());
}

function isSubmit(text: string) {
  return /^(submit|done|finish|finished)\b/i.test(text.trim());
}

function isStart(text: string) {
  return /^start\b/i.test(text.trim());
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0)   return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function parseScore(text: string): { obtained: number; total: number } {
  try {
    const jsonMatch = text.match(/\{[\s\S]*"totalObtained"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.totalObtained !== undefined && parsed.totalMarks !== undefined) {
        return { obtained: Number(parsed.totalObtained), total: Number(parsed.totalMarks) };
      }
    }
  } catch {}
  const match =
    text.match(/total\s*marks\s*obtained\s*[:\|]\s*(\d+)\s*\/\s*(\d+)/i) ||
    text.match(/total[:\s]+(\d+)\s*\/\s*(\d+)/i) ||
    text.match(/(\d+)\s*\/\s*(\d+)/) ||
    text.match(/(\d+)\s+out of\s+(\d+)/i);
  if (match) {
    return { obtained: parseInt(match[1]), total: parseInt(match[2]) };
  }
  return { obtained: 0, total: 0 };
}

function sanitiseUpload(raw: string): string {
  return raw
    .slice(0, 8000)
    .replace(/system\s*:/gi, "")
    .replace(/ignore\s+previous\s+instructions?/gi, "")
    .replace(/you\s+are\s+now/gi, "")
    .replace(/disregard\s+all/gi, "")
    .trim();
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// BUILD RICH HTML EVALUATION REPORT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function buildEvalHtml(evalJson: Record<string, unknown>, fallbackText: string): string {
  try {
    const {
      studentName, cls, subject, board, timeTaken, overtime,
      totalObtained, totalMarks, percentage, grade, gradeLabel,
      sections, strengths, weaknesses, studyTip,
    } = evalJson as {
      studentName: string; cls: string; subject: string; board: string;
      timeTaken: string; overtime: boolean;
      totalObtained: number; totalMarks: number; percentage: number;
      grade: string; gradeLabel: string;
      sections: Array<{
        name: string; obtained: number; maxMarks: number;
        questions: Array<{
          qNum: string; topic: string; obtained: number; maxMarks: number;
          status: string; feedback: string; correctAnswer?: string;
          detailedExplanation?: string; marksDeductionReason?: string;
          keyConceptMissed?: string;
        }>;
      }>;
      strengths: string; weaknesses: string; studyTip: string;
    };

    const gradeColor = percentage >= 91 ? "#1a7a4a" : percentage >= 71 ? "#1F4E79" : percentage >= 51 ? "#7d5a00" : percentage >= 33 ? "#a84300" : "#c0392b";
    const gradeBg    = percentage >= 91 ? "#e8f5e9" : percentage >= 71 ? "#EBF3FB" : percentage >= 51 ? "#fff9c4" : percentage >= 33 ? "#fdebd7" : "#fdecea";

    const sectionHtml = (sections || []).map(sec => {
      const secPct = sec.maxMarks > 0 ? Math.round((sec.obtained / sec.maxMarks) * 100) : 0;
      const secColor = sec.obtained === sec.maxMarks ? "#27AE60" : sec.obtained >= sec.maxMarks * 0.6 ? "#E67E22" : "#E74C3C";
      const qRows = (sec.questions || []).map(q => {
        const statusIcon = q.status === "correct" ? "âœ“" : q.status === "partial" ? "~" : q.status === "unattempted" ? "â€”" : "âœ—";
        const rowBg = q.status === "correct" ? "#f0fff0" : q.status === "partial" ? "#fffde7" : q.status === "unattempted" ? "#f5f5f5" : "#fff0f0";
        const statusColor = q.status === "correct" ? "#27AE60" : q.status === "partial" ? "#E67E22" : q.status === "unattempted" ? "#888" : "#E74C3C";

        let detailBlock = "";
        if (q.marksDeductionReason && q.status !== "correct") {
          detailBlock += `<div style="margin-top:5px;padding:5px 8px;background:#fef9c3;border-left:3px solid #f59e0b;border-radius:0 4px 4px 0;font-size:11px;color:#78350f;">
            <strong>Why marks were deducted:</strong> ${q.marksDeductionReason}
          </div>`;
        }
        if (q.correctAnswer && q.status !== "correct") {
          detailBlock += `<div style="margin-top:5px;padding:5px 8px;background:#e0f2fe;border-left:3px solid #0284c7;border-radius:0 4px 4px 0;font-size:11px;color:#0c4a6e;">
            <strong>Correct answer:</strong> ${q.correctAnswer}
          </div>`;
        }
        if (q.detailedExplanation && q.status !== "correct") {
          detailBlock += `<div style="margin-top:5px;padding:6px 8px;background:#f0fdf4;border-left:3px solid #16a34a;border-radius:0 4px 4px 0;font-size:11px;color:#14532d;line-height:1.6;">
            <strong>Explanation to remember:</strong> ${q.detailedExplanation}
          </div>`;
        }
        if (q.keyConceptMissed && q.status !== "correct") {
          detailBlock += `<div style="margin-top:5px;padding:5px 8px;background:#fdf2f8;border-left:3px solid #a21caf;border-radius:0 4px 4px 0;font-size:11px;color:#701a75;">
            <strong>Key concept to revise:</strong> ${q.keyConceptMissed}
          </div>`;
        }

        return `
          <tr style="background:${rowBg};">
            <td style="padding:8px 10px;font-weight:700;color:#333;border:1px solid #ddd;white-space:nowrap;vertical-align:top;">${q.qNum}</td>
            <td style="padding:8px 10px;color:#333;border:1px solid #ddd;vertical-align:top;">
              <div style="font-weight:600;margin-bottom:2px;">${q.topic || "â€”"}</div>
              <div style="font-size:12px;color:#475569;">${q.feedback || ""}</div>
              ${detailBlock}
            </td>
            <td style="padding:8px 10px;text-align:center;font-weight:700;color:${statusColor};border:1px solid #ddd;white-space:nowrap;vertical-align:top;">${statusIcon} ${q.obtained}/${q.maxMarks}</td>
          </tr>`;
      }).join("");

      return `
        <div style="margin-bottom:24px;border-radius:8px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.10);">
          <div style="background:#2C3E50;padding:10px 16px;display:flex;justify-content:space-between;align-items:center;">
            <span style="color:#fff;font-weight:700;font-size:15px;">${sec.name}</span>
            <span style="background:${secColor};color:#fff;padding:3px 12px;border-radius:20px;font-weight:700;font-size:14px;">${sec.obtained} / ${sec.maxMarks} &nbsp;(${secPct}%)</span>
          </div>
          <table style="width:100%;border-collapse:collapse;background:#fff;">
            <thead>
              <tr style="background:#D6E4F7;">
                <th style="padding:7px 10px;text-align:left;border:1px solid #ddd;font-size:13px;color:#1F4E79;">Q#</th>
                <th style="padding:7px 10px;text-align:left;border:1px solid #ddd;font-size:13px;color:#1F4E79;">Topic / Feedback / Explanation</th>
                <th style="padding:7px 10px;text-align:center;border:1px solid #ddd;font-size:13px;color:#1F4E79;">Score</th>
              </tr>
            </thead>
            <tbody>${qRows}</tbody>
          </table>
        </div>`;
    }).join("");

    const summaryRows = (sections || []).map(sec => {
      const bg = sec.obtained === sec.maxMarks ? "#E8F5E9" : sec.obtained >= sec.maxMarks * 0.6 ? "#FFF9C4" : "#FDECEA";
      return `<tr style="background:${bg};">
        <td style="padding:8px 12px;border:1px solid #ddd;">${sec.name}</td>
        <td style="padding:8px 12px;text-align:center;font-weight:700;border:1px solid #ddd;">${sec.obtained} / ${sec.maxMarks}</td>
        <td style="padding:8px 12px;text-align:center;border:1px solid #ddd;">${sec.maxMarks > 0 ? Math.round(sec.obtained/sec.maxMarks*100) : 0}%</td>
      </tr>`;
    }).join("");

    return `
<div style="font-family:'Segoe UI',Arial,sans-serif;max-width:860px;margin:0 auto;">
  <div style="background:#1F4E79;padding:20px 24px;border-radius:10px 10px 0 0;">
    <div style="color:#fff;font-size:22px;font-weight:700;">ðŸ“‹ CBSE Evaluation Report</div>
    <div style="color:#BDD7EE;font-size:14px;margin-top:4px;">${subject} &nbsp;|&nbsp; Class ${cls} &nbsp;|&nbsp; ${board}</div>
  </div>
  <div style="background:#EBF3FB;padding:12px 24px;display:flex;flex-wrap:wrap;gap:20px;border:1px solid #c8ddf0;border-top:none;">
    <span style="font-size:13px;color:#333;"><b>Student:</b> ${studentName || "â€”"}</span>
    <span style="font-size:13px;color:#333;"><b>Time Taken:</b> ${timeTaken}${overtime ? " âš ï¸ Over limit" : ""}</span>
    <span style="font-size:13px;color:#333;"><b>Max Marks:</b> ${totalMarks}</span>
  </div>
  <div style="background:${gradeBg};border:2px solid ${gradeColor};border-radius:0 0 10px 10px;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
    <div>
      <div style="font-size:36px;font-weight:800;color:${gradeColor};">${totalObtained} <span style="font-size:20px;color:#555;">/ ${totalMarks}</span></div>
      <div style="font-size:15px;color:#555;margin-top:2px;">Marks Obtained &nbsp;â€¢&nbsp; ${percentage}%</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:48px;font-weight:800;color:${gradeColor};">${grade}</div>
      <div style="font-size:14px;color:#555;">${gradeLabel}</div>
    </div>
  </div>
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#92400e;">
    <strong>ðŸ“– How to use this report:</strong> Every question where marks were deducted shows (1) why marks were cut, (2) the correct answer, (3) a detailed explanation to help you understand the concept, and (4) the key concept to revise.
  </div>
  <div style="font-size:17px;font-weight:700;color:#1F4E79;border-bottom:3px solid #1F4E79;padding-bottom:6px;margin-bottom:16px;">ðŸ“Š Question-wise Breakdown with Explanations</div>
  ${sectionHtml}
  <div style="font-size:17px;font-weight:700;color:#1F4E79;border-bottom:3px solid #1F4E79;padding-bottom:6px;margin-bottom:16px;margin-top:8px;">ðŸ“ˆ Summary</div>
  <table style="width:100%;border-collapse:collapse;margin-bottom:24px;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.08);border-radius:6px;overflow:hidden;">
    <thead>
      <tr style="background:#1F4E79;">
        <th style="padding:9px 12px;text-align:left;color:#fff;border:1px solid #ddd;">Section</th>
        <th style="padding:9px 12px;text-align:center;color:#fff;border:1px solid #ddd;">Marks</th>
        <th style="padding:9px 12px;text-align:center;color:#fff;border:1px solid #ddd;">%</th>
      </tr>
    </thead>
    <tbody>${summaryRows}
      <tr style="background:#D6E4F7;font-weight:700;">
        <td style="padding:9px 12px;border:1px solid #ddd;">TOTAL</td>
        <td style="padding:9px 12px;text-align:center;border:1px solid #ddd;">${totalObtained} / ${totalMarks}</td>
        <td style="padding:9px 12px;text-align:center;border:1px solid #ddd;">${percentage}%</td>
      </tr>
    </tbody>
  </table>
  <div style="font-size:17px;font-weight:700;color:#1F4E79;border-bottom:3px solid #1F4E79;padding-bottom:6px;margin-bottom:16px;">ðŸ’¬ Examiner's Remarks</div>
  <div style="background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.08);padding:16px 20px;margin-bottom:8px;">
    <div style="margin-bottom:10px;"><span style="color:#27AE60;font-weight:700;">âœ¦ Strengths:</span> <span style="color:#333;">${strengths || "â€”"}</span></div>
    <div style="margin-bottom:10px;"><span style="color:#E74C3C;font-weight:700;">âœ¦ Weaknesses:</span> <span style="color:#333;">${weaknesses || "â€”"}</span></div>
    <div><span style="color:#1F4E79;font-weight:700;">âœ¦ Study Tip:</span> <span style="color:#333;">${studyTip || "â€”"}</span></div>
  </div>
  <div style="text-align:center;padding:16px 0;color:#1F4E79;font-weight:700;font-size:15px;">âœ¦ End of Evaluation Report âœ¦</div>
</div>`;
  } catch (e) {
    return `<pre style="font-family:monospace;white-space:pre-wrap;">${fallbackText}</pre>`;
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SYLLABUS EXTRACTION FROM UPLOAD
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function parseSyllabusFromUpload(
  uploadedText: string,
  cls: string,
  board: string
): Promise<{ subjectName: string; chapterList: string; raw: string }> {
  const safe = sanitiseUpload(uploadedText);

  const extractionPrompt = `
You are a syllabus extraction assistant for CBSE Class ${cls} students.
The following text was extracted from a student's uploaded syllabus document.

Your job:
1. Identify the PRIMARY subject name. If multiple subjects appear, pick the ONE with the most content. Write it as a clean, short name.
2. List every chapter, topic, unit, or section for that subject exactly as it appears.
3. Format your output EXACTLY as:

SUBJECT: <single clean subject name>

CHAPTERS / TOPICS:
1. <topic or chapter name>
2. <topic or chapter name>
...

Rules:
- SUBJECT line must be ONE subject only
- Do NOT include any commentary â€” output the structured list only

RAW EXTRACTED TEXT FROM UPLOAD:
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
${safe}
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
`.trim();

  const extracted = await callAI(extractionPrompt, [
    { role: "user", content: "Extract the syllabus as instructed above." },
  ]);

  const subjectMatch = extracted.match(/^SUBJECT:\s*(.+)$/im);
  const subjectName  = subjectMatch ? subjectMatch[1].trim() : "Custom Subject";

  return {
    subjectName,
    chapterList:
      `ðŸš¨ UPLOADED SYLLABUS â€” STRICT BOUNDARY ðŸš¨\n` +
      `ABSOLUTE RULE: Every question on this paper must come EXCLUSIVELY from the topics listed below.\n` +
      `A topic NOT listed below does NOT exist for this exam â€” do NOT include it under any circumstance.\n` +
      `Do NOT use standard NCERT chapters that are absent from this list.\n\n` +
      extracted,
    raw: extracted,
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SYLLABUS UPLOAD HANDLER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function handleSyllabusUpload(
  uploadedText: string,
  cls: string,
  board: string,
  key: string,
  name: string,
  currentStatus: "IDLE" | "READY",
  customInstructions?: string
): Promise<NextResponse> {
  if (!uploadedText || uploadedText.length <= 30) {
    return NextResponse.json({
      reply:
        `âš ï¸ Could not extract readable text from your upload.\n\n` +
        `Please try:\n` +
        `â€¢ A clearer photo with good lighting\n` +
        `â€¢ A text-based PDF (not a scanned image)\n` +
        `â€¢ Typing the subject name directly instead`,
    });
  }

  const { subjectName, chapterList, raw } =
    await parseSyllabusFromUpload(uploadedText, cls, board);

  const reqs = customInstructions ? parsePaperRequirements(customInstructions) : null;

  const updatedSession: ExamSession = {
    session_key:          key,
    status:               "READY",
    subject_request:      subjectName,
    subject:              subjectName,
    answer_log:           [],
    syllabus_from_upload: chapterList,
    custom_instructions:  (reqs?.isCustom && customInstructions) ? customInstructions : undefined,
    student_name:         name,
    student_class:        cls,
    student_board:        board,
  };
  await saveSession(updatedSession);

  const isOverride = currentStatus === "READY";

  let formatConfirmation = "";
  if (reqs?.isCustom) {
    const parts: string[] = [];
    if (reqs.totalMarks)           parts.push(`**${reqs.totalMarks} marks**`);
    if (reqs.timeMinutes)          parts.push(`${formatTimeAllowed(reqs.timeMinutes)}`);
    if (reqs.questionTypes.length) parts.push(reqs.questionTypes.join(" + "));
    if (reqs.questionCount)        parts.push(`${reqs.questionCount} questions`);
    if (parts.length > 0) {
      formatConfirmation =
        `\nâœ… **Format detected:** ${parts.join(" Â· ")}\n` +
        `The paper will be generated with these exact specifications.\n`;
    }
  }

  return NextResponse.json({
    reply:
      `ðŸ“„ **Syllabus ${isOverride ? "updated" : "uploaded"} successfully!**\n\n` +
      `**Subject detected:** ${subjectName}\n\n` +
      `**Topics / Chapters found:**\n${raw}\n\n` +
      `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n` +
      `The exam paper will be generated **strictly based on the above syllabus only**.\n` +
      formatConfirmation + `\n` +
      `âœ… If this looks correct, type **start** to begin your exam.\n` +
      `âœï¸ If something is wrong, upload a clearer image or retype the subject name.`,
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CORE AI CALLER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function callAI(
  sysPrompt: string,
  messages: ChatMessage[],
  timeoutMs = 30_000
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return "AI error: missing GROQ_API_KEY.";

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${key}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: sysPrompt },
            ...messages
              .filter((m) => m.role !== "system")
              .map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content || "",
              })),
          ],
          temperature: 0.9,
          top_p: 0.95,
        }),
      }
    );
    clearTimeout(timer);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "Unable to respond.";
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof Error && e.name === "AbortError") {
      return "Request timed out. Please try again in a moment.";
    }
    return "AI server error. Please try again.";
  }
}

async function callAIForEvaluation(
  sysPrompt: string,
  messages: ChatMessage[]
): Promise<string> {
  return callAI(sysPrompt, messages, 90_000);
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// EXAM TIME LIMIT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MAX_EXAM_MS = 3 * 60 * 60 * 1000;

function isOverTime(startedAt?: number): boolean {
  if (!startedAt) return false;
  return Date.now() - startedAt > MAX_EXAM_MS;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FIX 6: SHAURI PLANNER PAPER GENERATOR â€” ALL FIXES APPLIED
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function generateShauriPaper(
  shauriPaper: ShauriPaperData,
  cls: string,
  board: string,
  name: string,
  key: string,
  callName: string
): Promise<NextResponse> {
  const {
    isRevisionDay,
    totalMarks,
    timeMinutes,
    primarySubject,
    primaryTopic,
    secondarySubject,
    secondaryTopic,
    writingSubject,
    writingSubjects,       // FIX 6: dual-language array
    weekCoverage,
    formatBlock,
  } = shauriPaper;

  const timeAllowed = formatTimeAllowed(timeMinutes);
  const seed = makeSeed();

  const paperSubjectLabel = isRevisionDay
    ? `Multi-Subject Revision (${writingSubjects && writingSubjects.length > 1
        ? writingSubjects.join(" + ")
        : writingSubject} Writing)`
    : secondarySubject
      ? `${primarySubject} + ${secondarySubject} (${writingSubject} Writing)`
      : primarySubject;

  const { chapterList: primaryChapterContext } = getChaptersForSubject(primarySubject, cls);
  const { chapterList: secondaryChapterContext } = secondarySubject
    ? getChaptersForSubject(secondarySubject, cls)
    : { chapterList: "" };

  // FIX 6: Improved topicBoundaryBlock for both revision and study days
  const topicBoundaryBlock = isRevisionDay
    ? `
TOPIC BOUNDARY â€” REVISION DAY (ABSOLUTE RULE):
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Questions MUST come ONLY from the following days and topics.
Do NOT include any topic from days outside this list â€” even if it is in the same chapter.

COVERED DAYS AND TOPICS:
${weekCoverage || "Topics from the covered study days"}

SUBJECT DISTRIBUTION RULES:
â€“ Every subject listed above MUST have at least 1â€“2 questions.
â€“ Do NOT add topics from days not listed above.
â€“ Section A MUST include exactly: Q1â€“Q6 standard MCQs + Q7â€“Q8 case-based MCQs + Q9â€“Q10 Assertion-Reason MCQs
â€“ Section C is 5 questions Ã— 3 marks = 15 marks (NOT 5 Ã— 2 = 10)
â€“ Section D is 2 case studies Ã— 5 marks = 10 marks (NOT 3 Ã— 5 = 15)
â€“ Section E writing task MUST be in: ${
      writingSubjects && writingSubjects.length > 1
        ? `${writingSubjects[0]} (3 marks) AND ${writingSubjects[1]} (2 marks) â€” both required`
        : `${writingSubject} only`
    }

AUTHORISED CHAPTER CONTEXT for ${primarySubject} (Class ${cls}):
${primaryChapterContext}
${secondarySubject ? `\nAUTHORISED CHAPTER CONTEXT for ${secondarySubject} (Class ${cls}):\n${secondaryChapterContext}` : ""}
`.trim()
    : `
TOPIC BOUNDARY â€” STUDY DAY (ABSOLUTE RULE):
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
PRIMARY TOPIC CONSTRAINT:
Every question in Sections A, B, C, D must test ONLY:
"${primaryTopic}" (${primarySubject})

Do NOT include any other concept, chapter, or topic â€” even if it is in the same subject.
Example: If topic is "Euclid's Division Lemma; Ex 1.1 Q1â€“4" â€” test ONLY that.
Do NOT ask about Fundamental Theorem of Arithmetic, irrational numbers, or any other sub-topic.

${secondarySubject ? `SECONDARY TOPIC CONSTRAINT:
Section B may include at most 1 question from:
"${secondaryTopic}" (${secondarySubject})
All other sections test PRIMARY topic only.` : ""}

SECTION A STRUCTURE (mandatory â€” no exceptions):
â€“ Q1â€“Q3: Standard MCQs with 4 options on PRIMARY topic
â€“ Q4:    Case-based MCQ â€” short 2-line real-life scenario, then 1 MCQ on PRIMARY topic
â€“ Q5:    Assertionâ€“Reason MCQ on PRIMARY topic
          Options MUST be:
          (A) Both A and R are true, and R is the correct explanation of A
          (B) Both A and R are true, but R is NOT the correct explanation of A
          (C) A is true but R is false
          (D) A is false but R is true

SECTION E: Must be in ${writingSubject} language ONLY.
Topic for Section E must connect to the primary or secondary topic studied today.

AUTHORISED CHAPTER CONTEXT for ${primarySubject} (Class ${cls}):
${primaryChapterContext}
${secondarySubject ? `\nAUTHORISED CHAPTER CONTEXT for ${secondarySubject} (Class ${cls}):\n${secondaryChapterContext}` : ""}
`.trim();

  const paperSystemPrompt = `
You are an official CBSE-aligned question paper setter for Class ${cls}.
${seed}

${formatBlock}

${topicBoundaryBlock}

CRITICAL RULES â€” READ BEFORE GENERATING:
1. Total marks MUST equal exactly ${totalMarks}. Count ALL question marks before finalising.
   Revision day breakdown: A(10)+B(10)+C(15)+D(10)+E(5) = 50
   Study day breakdown:    A(5)+B(6)+C(6)+D(5)+E(3) = 25
2. Generate ALL sections (A through E) completely â€” never stop early or skip a section.
3. Every section must have EXACTLY the number of questions specified in the format above.
4. Show marks for every question in [brackets].
5. Paper header must show: Maximum Marks: ${totalMarks} | Time Allowed: ${timeAllowed}
6. Output ONLY the question paper â€” no commentary, no preamble, nothing after the last question.
7. Each section must be clearly labelled: SECTION A, SECTION B, etc.
8. Every question with an internal choice must use the word "OR" on its own line.
9. Internal choices must be within the SAME subject â€” never across different subjects.
`.trim();

  const paperHeaderContext = `
PAPER HEADER â€” output this EXACTLY at the top:
Subject       : ${paperSubjectLabel}
Class         : ${cls}
Board         : ${board}
Time Allowed  : ${timeAllowed}
Maximum Marks : ${totalMarks}
`.trim();

  const fullSystemPrompt = paperSystemPrompt + "\n\n" + paperHeaderContext;

  const userMessage = isRevisionDay
    ? `Generate the complete SHAURI Revision Day test paper. Topics covered:\n${weekCoverage || "all week topics"}.\nMaximum Marks: ${totalMarks}. Writing section in ${writingSubjects && writingSubjects.length > 1 ? writingSubjects.join(" AND ") : writingSubject}. Generate ALL sections A through E completely.`
    : `Generate the complete SHAURI Study Day test paper. Topic: ${primaryTopic} (${primarySubject}). ${secondarySubject ? `Secondary: ${secondaryTopic} (${secondarySubject}).` : ""} Writing in ${writingSubject}. Maximum Marks: ${totalMarks}. Generate ALL sections A through E completely.`;

  // FIX 7: Attempt one regeneration if marks are off
  let paper = await callAI(fullSystemPrompt, [{ role: "user", content: userMessage }], 60_000);

  let { verified: verifiedMarks, isOff } = verifyPaperMarks(paper, totalMarks);

  if (isOff) {
    console.warn(`[SHAURI PAPER MARKS OFF] Expected=${totalMarks} Got=${verifiedMarks} â€” regenerating once`);
    const retryMessage = userMessage +
      `\n\nCRITICAL FIX NEEDED: Your previous attempt had ${verifiedMarks} marks instead of ${totalMarks}.` +
      ` Regenerate the COMPLETE paper. Total marks MUST equal exactly ${totalMarks}.` +
      ` Mandatory section breakdown: ${isRevisionDay
        ? "A(10)+B(10)+C(15)+D(10)+E(5)=50"
        : "A(5)+B(6)+C(6)+D(5)+E(3)=25"
      }. Recount every question before outputting.`;
    paper = await callAI(fullSystemPrompt, [{ role: "user", content: retryMessage }], 60_000);
    const retryVerify = verifyPaperMarks(paper, totalMarks);
    verifiedMarks = retryVerify.verified;
    isOff = retryVerify.isOff;
    if (isOff) {
      console.warn(`[SHAURI PAPER MARKS STILL OFF after retry] Expected=${totalMarks} Got=${verifiedMarks}`);
    }
  }

  const startTime = Date.now();

  const activeSession: ExamSession = {
    session_key:     key,
    status:          "IN_EXAM",
    subject_request: primarySubject,
    subject:         paperSubjectLabel,
    question_paper:  paper,
    answer_log:      [],
    started_at:      startTime,
    total_marks:     totalMarks,
    student_name:    name,
    student_class:   cls,
    student_board:   board,
  };
  await saveSession(activeSession);

  console.log("[SHAURI PAPER] Generated:", {
    subject: paperSubjectLabel,
    totalMarks,
    verifiedMarks,
    isRevision: isRevisionDay,
    timeMinutes,
    marksOff: isOff,
    writingSubjects,
  });

  return NextResponse.json({
    reply:
      `â±ï¸ **Exam started! Timer is running.**\n\n` +
      `ðŸ“Œ How to answer:\n` +
      `â€¢ Answer questions in **any order** you prefer\n` +
      `â€¢ Type answers directly in chat, OR\n` +
      `â€¢ Upload **photos / PDFs** of your handwritten answers\n` +
      `â€¢ You can send multiple messages â€” all will be collected\n` +
      `â€¢ When fully done, type **submit** (or **done** / **finish**)\n\n` +
      `Good luck${callName}! ðŸ’ª Give it your best.`,
    paper,
    startTime,
    isRevisionDay,
    subject: paperSubjectLabel,
  });
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// STRICT SUBJECT-SPECIFIC MARKING RULES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getSubjectMarkingRules(evalSubj: string): string {
  const isEnglish = /english/i.test(evalSubj);
  const isHindi   = /hindi/i.test(evalSubj);
  const isMath    = /math/i.test(evalSubj);
  const isSST     = /sst|social|history|geography|civics|economics|politics|contemporary/i.test(evalSubj);
  const isScience = /science|physics|chemistry|biology/i.test(evalSubj);

  if (isMath) return `
MATHEMATICS STRICT MARKING RULES:
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
SECTION A â€” MCQ & Assertion-Reason [1 mark each]:
â€¢ MCQ: Correct option letter = 1 mark. Wrong option or no option = 0. No partial marks.
â€¢ Assertion-Reason: Award 1 mark ONLY for selecting the exact correct option (a/b/c/d).
â€¢ Case-based MCQ: Correct option = 1. Wrong = 0. No partial.
â€¢ If student writes working for an MCQ: ignore it. Mark only on the option selected.

SECTION B â€” Very Short Answer [2 marks each]:
â€¢ BOTH steps must be correct for 2/2.
â€¢ Correct method + arithmetic error in final step = 1/2 (method mark).
â€¢ Wrong formula or wrong approach from the start = 0/2.
â€¢ Correct answer without ANY working shown = 0/2 (working is compulsory).
â€¢ Partially correct setup with no answer = 1/2.

SECTION C â€” Short Answer [3 marks each]:
â€¢ Step marking: correct setup/formula (1) + correct working/substitution (1) + correct final answer with unit (1).
â€¢ Correct method but wrong final answer due to arithmetic = 2/3.
â€¢ Correct answer without showing steps = 1/3 maximum.
â€¢ Unit missing in final answer: deduct 0.5 (round down).

SECTION D â€” Long Answer / Case Study [5 marks each]:
â€¢ Theorem: Statement (1) + Given/To Prove/Construction (1) + Proof steps with reasons (2) + Conclusion (1).
â€¢ Numerical: Formula stated (1) + Values substituted correctly (1) + Calculation steps shown (2) + Final answer with unit (1).
â€¢ Case study sub-questions: mark each sub-part strictly per its allocated mark.
â€¢ Correct answer without full working = maximum 2/5.

STRICTNESS RULES:
â€¢ No marks for vague answers.
â€¢ Correct answer in wrong units = deduct 1 mark.
â€¢ No negative marking â€” minimum is always 0 per question.`;

  if (isScience) return `
SCIENCE STRICT MARKING RULES:
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
SECTION A â€” Objective [1 mark each]:
â€¢ MCQ: Only the exact correct option = 1. Wrong = 0. No partial.
â€¢ Assertion-Reason: Only exact correct option = 1.
â€¢ Case-based MCQ: Correct option = 1. Wrong = 0.

SECTION B â€” Very Short Answer [2 marks each]:
â€¢ Chemical equation: Correct reactants+products (1) + correctly balanced (1).
â€¢ Unbalanced equation = 1/2 maximum.
â€¢ Definition: Must include ALL key terms from NCERT definition. Missing a key term = 1/2.
â€¢ 2 correct points = 2/2. Only 1 correct point = 1/2.

SECTION C â€” Short Answer [3 marks each]:
â€¢ 3 distinct NCERT-accurate points = 3/3.
â€¢ 2 correct points = 2/3. 1 correct point = 1/3.
â€¢ Vague/general points = 0 each.

SECTION D â€” Case Study [5 marks each]:
â€¢ Mark each sub-part strictly per its allocated mark.
â€¢ Scientific explanation must use NCERT terminology.
â€¢ Missing units = deduct 0.5 per instance.

STRICTNESS RULES:
â€¢ NCERT terminology is mandatory.
â€¢ Common-sense answers without scientific backing = 0.`;

  if (isSST) return `
SOCIAL SCIENCE STRICT MARKING RULES:
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
SECTION A â€” Objective [1 mark each]:
â€¢ MCQ/AR/Case-based: Only exact correct option = 1. Wrong = 0.

SECTION B â€” Short Answer [3 marks each]:
â€¢ Award 1 mark per distinct, NCERT-accurate, relevant point (max 3).
â€¢ Must name specific events, people, dates, places.
â€¢ Vague points = 0.

SECTION C â€” Long Answer [5 marks each]:
â€¢ Introduction (1) + 3 main NCERT-accurate points (2) + example/evidence (1) + conclusion (1).
â€¢ Answering a related but different question = max 2/5.

SECTION D â€” Case Study [5 marks each]:
â€¢ Sub-questions marked strictly per allocated mark.
â€¢ Answer must reference the case passage + own knowledge.

STRICTNESS RULES:
â€¢ NCERT chapter-specific facts only.
â€¢ Approximate dates for known events = 0.`;

  if (isEnglish) return `
ENGLISH STRICT MARKING RULES:
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
SECTION A â€” MCQ/Case-based/AR [1 mark each]: Correct option only = 1. Wrong = 0.

SECTION B â€” Writing Skills [marks as allocated]:
â€¢ Format (1): ALL required elements present = 1. Even one missing = 0.
â€¢ Content (2): 1 per relevant, specific point. Irrelevant = 0.
â€¢ Expression (2): Correct grammar + vocabulary = 2. Multiple errors = 1.
â€¢ Word limit: >30% deviation = deduct 1 from expression.

SECTION C â€” Grammar [1 mark each]:
â€¢ Only grammatically correct answer = 1. Almost-correct = 0.
â€¢ Two answers written: mark only the first.

SECTION D â€” Literature [marks as allocated]:
â€¢ Short answer: Correct + textual reference = full marks. Correct without reference = half.
â€¢ Long answer: Argument (2) + expression (1) + textual evidence (1) per 4-mark question.

STRICTNESS RULES:
â€¢ Grammar: binary â€” no partial marks.
â€¢ Incorrect format for formal letter/notice = 0 for format mark.`;

  if (isHindi) return `
HINDI STRICT MARKING RULES:
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
SECTION A â€” MCQ/Case-based/AR [1 mark each]: Only exact correct option = 1.

SECTION B â€” Lekhan [marks as allocated]:
â€¢ Format (1): All required elements present = 1. Even one missing = 0.
â€¢ Vishay vastu (2): 1 per relevant specific point. Vague = 0.
â€¢ Bhasha (2): Correct Hindi grammar + vocabulary = 2. Multiple errors = 1.

SECTION C â€” Vyakaran [1 mark each]:
â€¢ Only exact grammatically correct answer = 1. Close but wrong = 0.
â€¢ Two answers written = mark only first.

SECTION D â€” Pathen [marks as allocated]:
â€¢ Short answer: Correct + sandarbh = full marks. Correct without sandarbh = half.

STRICTNESS RULES:
â€¢ Grammar section: binary â€” no partial marks.
â€¢ Missing vigyapan/sandesh format elements = 0 for format marks.`;

  return `
GENERAL STRICT MARKING RULES:
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
SECTION A â€” Objective [1 mark each]: Exact correct answer = 1. Wrong/vague = 0. No partial.
SECTION B â€” Very Short Answer [2 marks]: 2 accurate points = 2. 1 point = 1. Vague = 0.
SECTION C â€” Short Answer [3 marks]: 3 accurate NCERT points = 3. 1 per distinct correct point.
SECTION D â€” Case Study [5 marks]: Mark each sub-part strictly per its allocated mark.
SECTION E â€” Writing [3â€“5 marks]: Format + content + language strictly marked.

UNIVERSAL STRICTNESS:
â€¢ Vague answers without specific content = 0.
â€¢ No marks for answers that are off-topic even if they look long.`;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// MAIN POST HANDLER
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const nameForLog = String((body as any)?.student?.name || (body as any)?.name || "Student");
    const classForLog = String((body as any)?.student?.class || (body as any)?.class || "10");
    await upsertUser({ name: nameForLog, class: classForLog, usageCount: 1, activity: "Active" });

    const mode: string            = body?.mode || "";
    const student: StudentContext = body?.student || {};

    const name      = student?.name?.trim() || "";
    const greetName = name || "there";
    const callName  = name ? `, ${name}` : "";

    const clsRaw = sanitiseClass(student?.class || "");
    const cls    = clsRaw.replace(/^class\s*/i, "").trim();
    const board  = sanitiseBoard(student?.board || "");

    const history: ChatMessage[] = Array.isArray(body?.history) ? body.history : [];

    const message: string =
      body?.message ||
      history.filter((m) => m.role === "user").pop()?.content ||
      "";

    const rawUploadedText: string = body?.uploadedText || "";
    const uploadType: "syllabus" | "answer" | undefined = body?.uploadType ?? undefined;

    const bodySubject: string = body?.subject || "";
    const bodyLang: string    = body?.lang    || "";

    const shauriPaper: ShauriPaperData | null = body?.shauriPaper || null;

    let uploadedText: string = sanitiseUpload(rawUploadedText);

    if (rawUploadedText.includes("[IMAGE_BASE64]")) {
      const base64Match = rawUploadedText.match(/\[IMAGE_BASE64\]\n(data:image\/[^;]+;base64,[^\n]+)/);
      if (base64Match) {
        const base64Data = base64Match[1];
        const mediaType  = base64Data.split(";")[0].replace("data:", "");
        const base64Raw  = base64Data.split(",")[1];

        const ocrPrompt =
          uploadType === "syllabus"
            ? "Extract all text from this syllabus image exactly as written. List every chapter, topic, and unit you can see."
            : "Extract all handwritten or printed text from this exam answer image. Transcribe every word exactly as written.";

        try {
          const geminiKey = process.env.GEMINI_API_KEY;
          if (geminiKey) {
            const visionRes = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{
                    role: "user",
                    parts: [
                      { text: ocrPrompt },
                      { inline_data: { mime_type: mediaType, data: base64Raw } },
                    ],
                  }],
                }),
              }
            );
            const visionData = await visionRes.json();
            const extracted  = visionData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (extracted.trim()) {
              uploadedText = sanitiseUpload(extracted);
            }
          }
        } catch {
          uploadedText = "";
        }
      }
    }

    const lower = message.toLowerCase().trim();

    const conversation: ChatMessage[] = [
      ...history.slice(-14),
      { role: "user", content: message },
    ];

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // TEACHER MODE
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (mode === "teacher") {
      if (isGreeting(lower) && history.length === 0) {
        return NextResponse.json({
          reply: `Hey ${greetName}! ðŸ˜Š I'm Shauri â€” think of me as your friendly ${board} teacher${cls ? ` for Class ${cls}` : ""}.\n\nI'm here to help you understand anything â€” concepts, doubts, revision, examples, you name it! What's on your mind today?`,
        });
      }

      const teacherConversationText = [...history, { role: "user", content: message }]
        .map((m) => m.content).join(" ");

      const OFF_TOPIC_PATTERNS =
        /\b(how are you|how r u|what'?s up|whatsup|wazzup|sup\b|i love you|tell me a joke|sing a song|let'?s dance|what'?s your name|who are you|are you alive|are you human|can we chat|can we talk|let'?s talk|wanna be friends|best friend|boyfriend|girlfriend|favourite (color|food|movie)|hobbies|fav\b|haha|hehe|tell me something funny|roast me|truth or dare)\b/i;

      const lastUserMsgs = history.filter(m => m.role === "user").slice(-3);
      const offTopicCount = lastUserMsgs.filter(m => OFF_TOPIC_PATTERNS.test(m.content)).length;
      const currentIsOffTopic = OFF_TOPIC_PATTERNS.test(message);
      const totalOffTopic = offTopicCount + (currentIsOffTopic ? 1 : 0);

      if (currentIsOffTopic && totalOffTopic === 1) {
        const msgL = message.toLowerCase();
        let warmReply: string;
        if (/how are you|how r u/.test(msgL)) {
          warmReply = `Doing great, thanks for asking, ${greetName}! ðŸ˜„ Ready to help you with your studies. What subject are we tackling today?`;
        } else {
          warmReply = `Appreciate you chatting, ${greetName}! ðŸ˜Š I'm best when helping you learn â€” ask me anything from your syllabus and I'll make it super clear. What's your first question?`;
        }
        return NextResponse.json({ reply: warmReply });
      }

      if (currentIsOffTopic && totalOffTopic >= 2) {
        return NextResponse.json({
          reply: `I totally get it â€” sometimes you just want to chat! ðŸ˜„ But I'm most useful as your study buddy, ${greetName}. Let's make the most of our time together â€” pick a subject and throw your toughest question at me! ðŸ’ª`,
        });
      }

      const contextPrimer: ChatMessage[] = name ? [
        { role: "user", content: `My name is ${name}${cls ? `, I'm in Class ${cls}` : ""}${board ? `, ${board} board` : ""}.` },
        { role: "assistant", content: `Hey ${name}! Great to have you here. What are we studying today?` },
      ] : [];

      const teacherConversation: ChatMessage[] = [
        ...contextPrimer,
        ...history.slice(-12),
        { role: "user", content: message },
      ];

      const isHindiTeacher =
        /hindi/i.test(bodySubject) ||
        bodyLang === "hi-IN" ||
        /[\u0900-\u097F]{5,}/.test(teacherConversationText) ||
        /hindi|à¤¹à¤¿à¤‚à¤¦à¥€/i.test(teacherConversationText);

      const isMathTeacher =
        !isHindiTeacher && (
          /math/i.test(bodySubject) ||
          /\b(mathematics|maths?|algebra|calculus|geometry|trigonometry|statistics|probability|polynomials?|coordinate geometry|quadrilateral|heron'?s? formula|surface area|volume|number system|linear equation|circles?|triangles?|constructions?|pythagoras|mensuration)\b/i.test(teacherConversationText)
        );

      const subjectOverride = isHindiTeacher ? "hindi" : isMathTeacher ? "mathematics" : undefined;

      const teacherSystemPrompt = name
        ? systemPrompt("teacher", subjectOverride) +
          `\n\nSTUDENT IDENTITY: The student's name is ${name}${cls ? `, Class ${cls}` : ""}${board ? `, ${board}` : ""}. Always address them as ${name} â€” NEVER as "Student" or "there".` +
          `\n\nRESPONSE RULES: Be concise and natural. For greetings or small talk, reply in 1-2 sentences max. Only give longer explanations when the student asks about a concept or topic. Be warm, direct, encouraging.`
        : systemPrompt("teacher", subjectOverride);

      const reply = await callAI(teacherSystemPrompt, teacherConversation);
      await addActivity({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), userQuery: message || "", aiResponse: reply, mode, user: nameForLog });
      return NextResponse.json({ reply });
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // EXAMINER MODE
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (mode === "examiner") {
      const key = getKey(student, clsRaw);

      if (shauriPaper && isStart(lower)) {
        console.log("[SHAURI] Direct paper generation triggered.", {
          totalMarks: shauriPaper.totalMarks,
          isRevisionDay: shauriPaper.isRevisionDay,
          primarySubject: shauriPaper.primarySubject,
          secondarySubject: shauriPaper.secondarySubject,
          primaryTopic: shauriPaper.primaryTopic,
          writingSubjects: shauriPaper.writingSubjects,
        });
        return generateShauriPaper(shauriPaper, cls, board, name, key, callName);
      }

      let session: ExamSession = (await getSession(key)) || {
        session_key:   key,
        status:        "IDLE",
        answer_log:    [],
        student_name:  name,
        student_class: cls,
        student_board: board,
      };

      if (session.status === "IDLE") {
        let recovered: ExamSession | null = null;
        if (name) recovered = await getSessionByStudent(name, cls, "IN_EXAM");
        if (!recovered && name) recovered = await getSessionByStudent(name, cls, "READY");
        if (!recovered && name) recovered = await getSessionByStudent(name, cls);
        if (!recovered || recovered.status === "IDLE") {
          const nameClassKey = `${name || "anon"}_${cls}`;
          if (nameClassKey !== key) {
            const byKey = await getSession(nameClassKey);
            if (byKey && byKey.status !== "IDLE") recovered = byKey;
          }
        }
        if (!recovered || recovered.status === "IDLE") {
          const nameXKey = `${name || "anon"}_x`;
          if (nameXKey !== key) {
            const byKey = await getSession(nameXKey);
            if (byKey && byKey.status !== "IDLE") recovered = byKey;
          }
        }
        if ((!recovered || recovered.status === "IDLE") && !name) {
          for (const anonKey of [`anon_${cls}`, `anon_x`]) {
            if (anonKey !== key) {
              const byKey = await getSession(anonKey);
              if (byKey && byKey.status !== "IDLE") { recovered = byKey; break; }
            }
          }
        }
        if (recovered && recovered.status !== "IDLE") {
          session = recovered;
        }
      }

      if (isGreeting(lower) && session.status === "READY" && !uploadedText) {
        return NextResponse.json({
          reply:
            `ðŸ“š Welcome back${callName}! Your subject is set to **${session.subject}**.\n\n` +
            `Type **start** when you're ready to begin your exam. â±ï¸ Timer starts immediately.\n\n` +
            `ðŸ’¡ Want a custom format? Type: "prepare 30 marks exam" or "give 20 MCQ questions"\n\n` +
            `ðŸ“Ž Want a different syllabus? Upload a PDF or image now to override.`,
        });
      }

      if (isGreeting(lower) && session.status === "IN_EXAM") {
        const elapsed = session.started_at ? formatDuration(Date.now() - session.started_at) : "â€”";
        return NextResponse.json({
          reply:
            `â±ï¸ Your **${session.subject}** exam is still in progress!\n\n` +
            `Time elapsed: **${elapsed}**\n` +
            `Answers recorded: **${session.answer_log.length}**\n\n` +
            `Your question paper has been restored on the left. Continue answering.\n` +
            `When fully done, type **submit**.`,
          resumeExam: true,
          questionPaper: session.question_paper || "",
          startTime: session.started_at,
          subject: session.subject,
        });
      }

      if (isGreeting(lower) && session.status === "FAILED") {
        return NextResponse.json({
          reply:
            `âš ï¸ Welcome back${callName}! Your previous evaluation hit a timeout, but your answers are all saved.\n\n` +
            `Type **submit** to retry the evaluation.`,
        });
      }

      if (isGreeting(lower) && session.status === "IDLE" && !uploadedText) {
        return NextResponse.json({
          reply:
            `Hello ${greetName}! ðŸ“‹ I'm your CBSE Examiner.\n\n` +
            `Tell me the **subject** you want to be tested on:\n` +
            `Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
            `ðŸ“Ž **OR** upload your **syllabus as a PDF or image** and I'll generate a paper exactly based on it.\n\n` +
            `ðŸ’¡ You can also specify the format:\n` +
            `   â€¢ "prepare 30 marks exam for Hindi"\n` +
            `   â€¢ "give 20 MCQ questions on Science"\n` +
            `   â€¢ "1 hour Maths test"\n\n` +
            `â±ï¸ Your timer starts the moment you type **start**.`,
        });
      }

      if (isStart(lower) && session.status === "IDLE") {
        const confirmedSubject: string = body?.confirmedSubject || "";
        let readySession: ExamSession | null = null;
        if (name) readySession = await getSessionByStudent(name, cls, "READY");
        if (!readySession) {
          const nameClassKey = `${name || "anon"}_${cls}`;
          if (nameClassKey !== key) {
            const byKey = await getSession(nameClassKey);
            if (byKey?.status === "READY") readySession = byKey;
          }
        }
        if (!readySession) {
          const nameXKey = `${name || "anon"}_x`;
          if (nameXKey !== key) {
            const byKey = await getSession(nameXKey);
            if (byKey?.status === "READY") readySession = byKey;
          }
        }
        if (!readySession && !name) {
          for (const anonKey of [`anon_${cls}`, `anon_x`]) {
            if (anonKey !== key) {
              const byKey = await getSession(anonKey);
              if (byKey?.status === "READY") { readySession = byKey; break; }
            }
          }
        }
        if (!readySession) {
          const directCheck = await getSession(key);
          if (directCheck?.status === "READY") readySession = directCheck;
        }
        if (!readySession && name) {
          for (const altKey of [`${name}_`, `${name.toLowerCase()}_`, `${name}_x`, `${name.toLowerCase()}_x`]) {
            if (altKey !== key) {
              const byKey = await getSession(altKey);
              if (byKey?.status === "READY") { readySession = byKey; break; }
            }
          }
        }
        if (readySession) {
          session.status               = "READY";
          session.subject              = readySession.subject;
          session.subject_request      = readySession.subject_request;
          session.custom_instructions  = readySession.custom_instructions;
          session.syllabus_from_upload = readySession.syllabus_from_upload;
          session.session_key          = readySession.session_key;
        } else if (confirmedSubject) {
          const { subjectName } = getChaptersForSubject(confirmedSubject, cls);
          const recoveredSession: ExamSession = {
            session_key:     key,
            status:          "READY",
            subject_request: confirmedSubject,
            subject:         subjectName,
            answer_log:      [],
            student_name:    name,
            student_class:   cls,
            student_board:   board,
          };
          await saveSession(recoveredSession);
          session.status          = "READY";
          session.subject         = subjectName;
          session.subject_request = confirmedSubject;
        } else {
          const directLookup = await getSession(key);
          if (directLookup && directLookup.status === "READY") {
            session.status               = "READY";
            session.subject              = directLookup.subject;
            session.subject_request      = directLookup.subject_request;
            session.custom_instructions  = directLookup.custom_instructions;
            session.syllabus_from_upload = directLookup.syllabus_from_upload;
            session.session_key          = directLookup.session_key;
          } else {
            return NextResponse.json({
              reply:
                `Please tell me the **subject** you want to be tested on first${callName}.\n\n` +
                `Options: Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
                `ðŸ“Ž Or **upload your syllabus** as a PDF or image for a custom paper.`,
            });
          }
        }
      }

      if (session.status === "FAILED") {
        if (isSubmit(lower)) {
          session.status = "IN_EXAM";
        } else {
          return NextResponse.json({
            reply:
              `âš ï¸ Your previous evaluation hit a timeout${callName}. Your answers are all saved.\n\n` +
              `Type **submit** to try the evaluation again.`,
          });
        }
      }

      if (isSubmit(lower) && session.status === "IN_EXAM") {
        const endTime   = Date.now();
        const overtime  = isOverTime(session.started_at);
        const timeTaken = session.started_at ? formatDuration(endTime - session.started_at) : "Unknown";

        if (session.answer_log.length === 0) {
          return NextResponse.json({
            reply: `âš ï¸ No answers were recorded${callName}. Please type or upload your answers before submitting.`,
          });
        }

        const fullAnswerTranscript = session.answer_log
          .map((entry, i) => `[Answer Entry ${i + 1}]\n${entry}`)
          .join("\n\nâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€\n\n");

        const totalMarks = session.total_marks || 25;
        const evalSubj   = (session.subject || "").toLowerCase();
        const evalIsMath = /math/i.test(evalSubj);

        const subjectMarkingRules = getSubjectMarkingRules(session.subject || "");

        const evaluationPrompt = `
You are a STRICT official CBSE Board Examiner for Class ${cls}.
Subject: ${session.subject || "General"} | Board: ${board} | Maximum Marks: ${totalMarks}
${evalIsMath ? "MATH FORMATTING: Use LaTeX notation for all equations. Wrap inline math in $...$ and display math in $$...$$." : ""}
Time Taken: ${timeTaken}${overtime ? " âš ï¸ SUBMITTED AFTER 3-HOUR LIMIT" : ""}

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
MARKING SCHEME (STRICTLY ENFORCED):
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
${subjectMarkingRules}

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
UNIVERSAL STRICT RULES:
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
â€¢ No negative marking â€” minimum per question is 0.
â€¢ Match answers to questions by number OR topic â€” student may have answered out of order.
â€¢ Evaluate EVERY single question in the paper â€” unattempted = 0, do NOT skip any question.
â€¢ Image/PDF answers â†’ evaluate content only, ignore handwriting quality.
â€¢ NCERT-accurate facts = full marks. Correct concept in own words = full marks.
â€¢ Partially correct answer = partial marks as specified in scheme above.
â€¢ Vague/general answer without specific content = 0 marks.
â€¢ Long answer that is off-topic = 0 marks even if it looks detailed.
${overtime ? "â€¢ Student submitted after the 3-hour limit â€” note this in overtime field." : ""}

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
EXPLANATION REQUIREMENTS (CRITICAL):
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
For every question where the student got PARTIAL or WRONG marks, provide ALL FOUR of:

1. "marksDeductionReason": Exactly which part was wrong and WHY marks were cut.
2. "correctAnswer": Complete model correct answer â€” not just "see NCERT".
3. "detailedExplanation": Teach the concept in 2-4 sentences so student understands WHY.
4. "keyConceptMissed": Specific NCERT concept/formula/theorem to revise.

For fully CORRECT questions: set these fields to empty strings "".

â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
OUTPUT FORMAT:
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Respond ONLY with a single valid JSON object. No markdown, no explanation outside JSON:
{
  "studentName": "${name || "Student"}",
  "cls": "${cls}",
  "subject": "${session.subject || "General"}",
  "board": "${board}",
  "timeTaken": "${timeTaken}",
  "overtime": ${overtime},
  "totalMarks": ${totalMarks},
  "totalObtained": <number â€” must be â‰¤ totalMarks>,
  "percentage": <number 0-100, rounded to nearest integer>,
  "grade": "<A1|A2|B1|B2|C1|C2|D|E>",
  "gradeLabel": "<Outstanding|Excellent|Very Good|Good|Average|Satisfactory|Pass|Needs Improvement>",
  "sections": [
    {
      "name": "<Section name>",
      "maxMarks": <number>,
      "obtained": <number>,
      "questions": [
        {
          "qNum": "<e.g. Q1>",
          "topic": "<specific topic>",
          "maxMarks": <number>,
          "obtained": <number>,
          "status": "<correct|partial|wrong|unattempted>",
          "feedback": "<one precise sentence>",
          "marksDeductionReason": "<for partial/wrong: exact reason. For correct: empty string>",
          "correctAnswer": "<for partial/wrong: complete model answer. For correct: empty string>",
          "detailedExplanation": "<for partial/wrong: 2-4 sentence concept explanation. For correct: empty string>",
          "keyConceptMissed": "<for partial/wrong: specific NCERT concept to revise. For correct: empty string>"
        }
      ]
    }
  ],
  "strengths": "<specific sections where student did well>",
  "weaknesses": "<specific topics where student lost marks>",
  "studyTip": "<one concrete actionable improvement>"
}

Grade scale: 91-100%=A1 Outstanding | 81-90%=A2 Excellent | 71-80%=B1 Very Good | 61-70%=B2 Good | 51-60%=C1 Average | 41-50%=C2 Satisfactory | 33-40%=D Pass | <33%=E Needs Improvement

IMPORTANT: totalObtained must equal the sum of all "obtained" values. Double-check before outputting.
        `.trim();

        await saveSession({ ...session, status: "FAILED" });

        let evalRaw: string;
        try {
          evalRaw = await callAIForEvaluation(evaluationPrompt, [
            {
              role: "user",
              content:
                `QUESTION PAPER:\n${session.question_paper}\n\n` +
                `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n` +
                `STUDENT'S COMPLETE ANSWER TRANSCRIPT (${session.answer_log.length} entries):\n` +
                `â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”\n\n` +
                fullAnswerTranscript,
            },
          ]);
        } catch (evalErr) {
          console.error("[evaluation] callAIForEvaluation threw:", evalErr);
          return NextResponse.json({
            reply: `âš ï¸ The evaluation timed out${callName}. Your answers are all safely saved.\n\nType **submit** to try again.`,
          });
        }

        let evalJson: Record<string, unknown> = {};
        let evaluationHtml = "";
        try {
          const jsonMatch = evalRaw.match(/\{[\s\S]*\}/);
          if (jsonMatch) evalJson = JSON.parse(jsonMatch[0]);
          evaluationHtml = buildEvalHtml(evalJson, evalRaw);
        } catch (parseErr) {
          console.warn("[evaluation] JSON parse failed, using plain text fallback", parseErr);
          evaluationHtml = `<pre style="font-family:monospace;white-space:pre-wrap;padding:16px;">${evalRaw}</pre>`;
        }

        const { obtained, total } = parseScore(evalRaw);
        const obtained2  = (evalJson.totalObtained as number) || obtained;
        const total2     = (evalJson.totalMarks    as number) || (total > 0 ? total : totalMarks);
        const percentage = total2 > 0 ? Math.round((obtained2 / total2) * 100) : 0;

        const gradeLabel = (evalJson.gradeLabel as string) || "";
        const grade      = (evalJson.grade      as string) || "";
        const plainSummary =
          `âœ… **Evaluation complete${callName}!**\n\n` +
          `ðŸ“Š **${obtained2} / ${total2}** &nbsp;(${percentage}%) &nbsp;â€” Grade **${grade}** ${gradeLabel}\n\n` +
          `â±ï¸ Time taken: ${timeTaken}${overtime ? " âš ï¸ Over limit" : ""}\n\n` +
          `_Detailed report with explanations for every wrong answer is below_ ðŸ‘‡`;

        try {
          await supabase.from("exam_attempts").insert({
            student_name:    name || null,
            class:           cls,
            subject:         session.subject || "General",
            percentage,
            marks_obtained:  obtained2,
            total_marks:     total2,
            time_taken:      timeTaken,
            overtime,
            evaluation_text: evalRaw,
            created_at:      new Date().toISOString(),
          });
        } catch (dbErr) {
          console.error("Failed to save exam_attempt:", dbErr);
        }

        await deleteSession(session.session_key || key);

        return NextResponse.json({
          reply:           plainSummary,
          evaluationHtml,
          examEnded:       true,
          evalJson,
          subject:         session.subject,
          marksObtained:   obtained2,
          totalMarks:      total2,
          percentage,
          timeTaken,
          overtime,
        });
      }

      if (session.status === "IN_EXAM" && isOverTime(session.started_at)) {
        return NextResponse.json({
          reply:
            `â° **Time's up${callName}!** Your 3-hour exam window has closed.\n\n` +
            `Type **submit** now to get your evaluation based on answers recorded so far.\n` +
            `Any further answers added after time limit will be flagged in the evaluation.`,
          overtime: true,
        });
      }

      if (session.status === "IN_EXAM") {
        const parts: string[] = [];
        if (message.trim() && !isSubmit(lower)) parts.push(message.trim());
        if (uploadedText) {
          if (uploadType === "syllabus") {
            return NextResponse.json({
              reply:
                `âš ï¸ That looks like a **syllabus upload** but your exam is already in progress.\n\n` +
                `If you meant to upload an **answer**, please re-attach the file.\n\n` +
                `â±ï¸ Timer is still running. Type **submit** when done.`,
            });
          }
          parts.push(`[UPLOADED ANSWER â€” IMAGE/PDF]\n${uploadedText}`);
        }
        if (parts.length > 0) {
          session.answer_log.push(parts.join("\n\n"));
          await saveSession(session);
        }
        const elapsed = session.started_at ? formatDuration(Date.now() - session.started_at) : "â€”";
        return NextResponse.json({
          reply:
            `âœ… **Answer recorded** (Entry ${session.answer_log.length})\n` +
            `â±ï¸ Time elapsed: **${elapsed}**\n\n` +
            `Continue answering. You can:\n` +
            `â€¢ Type more answers directly\n` +
            `â€¢ Upload photos or PDFs of handwritten answers\n` +
            `â€¢ Answer questions in any order\n\n` +
            `When finished with all questions, type **submit**.`,
        });
      }

      if (session.status === "READY" && !isStart(lower)) {
        const isSyllabusUpload = uploadType === "syllabus" || (!uploadType && uploadedText.length > 30);
        if (isSyllabusUpload && uploadedText.length > 30) {
          return handleSyllabusUpload(uploadedText, cls, board, key, name, "READY", message.trim() || undefined);
        }
        if (isSubmit(lower)) {
          return NextResponse.json({
            reply:
              `âš ï¸ Your exam hasn't started yet${callName} â€” there's nothing to submit.\n\n` +
              `Subject is set to **${session.subject}**.\n\n` +
              `Type **start** when you're ready to begin. â±ï¸ Timer starts immediately.`,
          });
        }
        const reqs = parsePaperRequirements(message);
        if (reqs.isCustom) {
          session.custom_instructions = message.trim();
          await saveSession(session);
          const totalDesc = reqs.totalMarks ? `**${reqs.totalMarks} marks**` : "custom marks";
          const timeDesc  = reqs.timeMinutes ? `, ${formatTimeAllowed(reqs.timeMinutes)}` : "";
          const typeDesc  = reqs.questionTypes.length > 0 ? `, ${reqs.questionTypes.join(" + ")} questions` : "";
          return NextResponse.json({
            reply:
              `âœ… Got it! Paper format updated:\n` +
              `ðŸ“ ${totalDesc}${timeDesc}${typeDesc}\n\n` +
              `Subject: **${session.subject}**\n\n` +
              `Type **start** when ready. â±ï¸ Timer starts immediately.`,
          });
        }
        return NextResponse.json({
          reply:
            `ðŸ“š Subject is set to **${session.subject}**.\n\n` +
            `ðŸ“Ž Want to use your own syllabus instead? Upload a PDF or image now.\n` +
            `ðŸ’¡ Want a custom format? Try: "prepare 30 marks exam" or "give 20 MCQ questions"\n\n` +
            `Type **start** when ready to begin. â±ï¸ Timer starts immediately.`,
        });
      }

      if (session.status === "IDLE" && !isGreeting(lower)) {
        const looksLikeAnswer =
          message.trim().length > 40 ||
          /^\d+[.)]/m.test(message.trim()) ||
          /[à¥¤\.]{2,}/.test(message) ||
          /\b(answer|ans|q\d|question|ques)\b/i.test(message) ||
          message.trim().split(/\s+/).length >= 3 ||
          /^[A-Z][a-z]/.test(message.trim());

        if (looksLikeAnswer) {
          let activeSession: ExamSession | null = null;
          if (name) activeSession = await getSessionByStudent(name, cls, "IN_EXAM");
          if (!activeSession && name) activeSession = await getSessionByStudent(name, cls);
          if (activeSession && activeSession.status === "IN_EXAM") {
            session = activeSession;
            if (message.trim()) {
              const answerParts: string[] = [message.trim()];
              if (uploadedText) answerParts.push(`[UPLOADED ANSWER]\n${uploadedText}`);
              activeSession.answer_log.push(answerParts.join("\n\n"));
              await saveSession(activeSession);
              const elapsed = activeSession.started_at ? formatDuration(Date.now() - activeSession.started_at) : "â€”";
              return NextResponse.json({
                reply:
                  `âœ… **Answer recorded** (Entry ${activeSession.answer_log.length})\n` +
                  `â±ï¸ Time elapsed: **${elapsed}**\n\n` +
                  `Continue answering, or type **submit** when done.`,
              });
            }
          }
        }

        const isSyllabusUpload = uploadType === "syllabus" || (!uploadType && uploadedText.length > 30);
        if (isSyllabusUpload && uploadedText.length > 30) {
          return handleSyllabusUpload(uploadedText, cls, board, key, name, "IDLE", message.trim() || undefined);
        }

        const isExamCommand = /^(submit|done|finish|finished|start|answers?)\s*$/i.test(message.trim());
        if (isExamCommand) {
          let rescuedSession: ExamSession | null = null;
          if (name) rescuedSession = await getSessionByStudent(name, "", "IN_EXAM");
          if (!rescuedSession && name) rescuedSession = await getSessionByStudent(name, "", "READY");
          if (rescuedSession && rescuedSession.status !== "IDLE") {
            session = rescuedSession;
          } else {
            return NextResponse.json({
              reply:
                `âš ï¸ It looks like you typed **"${message.trim()}"** â€” but there's no active exam session${callName}.\n\n` +
                `To get started, tell me the **subject** you want to be tested on:\n` +
                `Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
                `ðŸ“Ž Or **upload your syllabus** as a PDF or image for a custom paper.\n\n` +
                `Once a subject is set, type **start** to begin.`,
            });
          }
        }

        if (!message.trim()) {
          return NextResponse.json({
            reply:
              `Please tell me the **subject** you want to be tested on${callName}.\n` +
              `Options: Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
              `ðŸ“Ž Or **upload your syllabus** as a PDF or image for a custom paper.`,
          });
        }

        const messageReqs = parsePaperRequirements(message);
        const coreSubject = messageReqs.isCustom ? extractSubjectFromInstruction(message) : message;

        const { subjectName } = getChaptersForSubject(coreSubject, cls);
        const displaySubject = subjectName.replace(/\s*[â€“-]\s*Class\s*\d+$/i, "");

        const newSession: ExamSession = {
          session_key:         key,
          status:              "READY",
          subject_request:     coreSubject,
          subject:             subjectName,
          custom_instructions: messageReqs.isCustom ? message.trim() : undefined,
          answer_log:          [],
          student_name:        name,
          student_class:       cls,
          student_board:       board,
        };
        await saveSession(newSession);

        if (messageReqs.isCustom) {
          const totalDesc   = messageReqs.totalMarks ? `**${messageReqs.totalMarks} marks**` : "custom marks";
          const timeDesc    = messageReqs.timeMinutes ? ` Â· Time: **${formatTimeAllowed(messageReqs.timeMinutes)}**` : "";
          const typeDesc    = messageReqs.questionTypes.length > 0 ? ` Â· Type: **${messageReqs.questionTypes.join(" + ")}**` : "";
          const chapterDesc = messageReqs.chapterFilter ? ` Â· Scope: **${messageReqs.chapterFilter}**` : "";
          return NextResponse.json({
            reply:
              `ðŸ“š Got it! I'll prepare a **custom paper** for:\n` +
              `**${displaySubject} â€” Class ${cls}**\n\n` +
              `ðŸ“ **Paper format:**\n` +
              `   Marks: ${totalDesc}${timeDesc}${typeDesc}${chapterDesc}\n\n` +
              `Type **start** when you're ready to begin.\n` +
              `â±ï¸ Timer starts the moment you type start.`,
          });
        }

        return NextResponse.json({
          reply:
            `ðŸ“š Got it! I'll prepare a **strict CBSE Board question paper** for:\n` +
            `**${displaySubject} â€” Class ${cls}**\n\n` +
            `Paper will strictly follow the NCERT Class ${cls} syllabus chapters.\n\n` +
            `ðŸ“Ž **Tip:** Want a paper based on YOUR specific syllabus?\n` +
            `Upload your syllabus as a PDF or image now, before typing start.\n\n` +
            `ðŸ’¡ Want a custom format? Type: "prepare 30 marks exam" or "give 20 MCQ questions"\n\n` +
            `Type **start** when you're ready to begin.\n` +
            `â±ï¸ Timer starts the moment you type start.`,
        });
      }

      if (session.status === "IDLE" && uploadedText.length > 30) {
        return handleSyllabusUpload(uploadedText, cls, board, key, name, "IDLE", message.trim() || undefined);
      }

      if (isStart(lower) && session.status === "READY") {
        let subjectName: string;
        let chapterList: string;

        let recoveredInstructions = session.custom_instructions || "";
        if (!recoveredInstructions) {
          const recentUserMsgs = history.filter((m) => m.role === "user").slice(-8).map((m) => m.content);
          for (const msg of recentUserMsgs) {
            const r = parsePaperRequirements(msg);
            if (r.isCustom) { recoveredInstructions = msg; break; }
          }
        }

        if (session.syllabus_from_upload) {
          subjectName = session.subject || "Custom Subject";
          chapterList = session.syllabus_from_upload;
        } else {
          const subjectKey = session.subject_request || session.subject?.replace(/\s*[â€“-]\s*Class\s*\d+$/i, "") || "";
          const resolved = getChaptersForSubject(subjectKey, cls);
          subjectName = resolved.subjectName;
          chapterList = resolved.chapterList;
        }

        const isMath    = /math/i.test(subjectName);
        const isSST     = /sst|social|history|geography|civics|economics|politics|contemporary/i.test(subjectName);
        const isEnglish = /english/i.test(subjectName);
        const isHindi   = /hindi/i.test(subjectName);
        const isScience = /science|physics|chemistry|biology/i.test(subjectName);
        const hasUploadedSyllabus = !!session.syllabus_from_upload;
        const customInstructions  = recoveredInstructions;
        const hasCustomInstr      = !!customInstructions;

        const reqs = hasCustomInstr ? parsePaperRequirements(customInstructions) : {} as PaperRequirements;

        const defaultMarks   = hasUploadedSyllabus ? 30 : 80;
        const defaultMinutes = hasUploadedSyllabus ? 60 : 180;
        const finalMarks    = reqs.totalMarks  || defaultMarks;
        const finalMinutes  = reqs.timeMinutes || defaultMinutes;
        const timeAllowed   = formatTimeAllowed(finalMinutes);

        const paperSeed = makeSeed();

        if (hasCustomInstr || hasUploadedSyllabus) {
          const cleanTopicList = chapterList
            .replace(/.*UPLOADED SYLLABUS.*\n/g, "")
            .replace(/.*ABSOLUTE RULE.*\n/g, "")
            .replace(/.*A topic NOT listed.*\n/g, "")
            .replace(/.*Do NOT use standard.*\n/g, "")
            .replace(/.*Do NOT "fill gaps".*\n/g, "")
            .replace(/\[NCERT SYLLABUS.*\]\n?/g, "")
            .replace(/Use the real, complete.*\n/g, "")
            .replace(/Draw questions ONLY.*\n/g, "")
            .replace(/Do NOT invent.*\n/g, "")
            .replace(/Examples of topics.*\n/g, "")
            .trim();

          const allTopicLines = cleanTopicList
            .split("\n")
            .map(l => l.replace(/^\d+\.\s*/, "").trim())
            .filter(l => l.length > 2 && !/^(SUBJECT|CHAPTERS|TOPICS|Board|Class)/i.test(l));

          let topicLines = allTopicLines;

          if (!hasUploadedSyllabus && reqs.chapterFilter) {
            const chapterNums: number[] = [];
            const rangeMatch = reqs.chapterFilter.match(/(\d+)\s*[-â€“to]+\s*(\d+)/i);
            if (rangeMatch) {
              const from = parseInt(rangeMatch[1]);
              const to   = parseInt(rangeMatch[2]);
              for (let n = from; n <= to; n++) chapterNums.push(n);
            }
            const singleMatches = reqs.chapterFilter.matchAll(/(\b|ch\.?\s*)(\d+)/gi);
            for (const m of singleMatches) chapterNums.push(parseInt(m[2]));
            if (chapterNums.length > 0) {
              const filtered = chapterNums
                .filter(n => n > 0 && n <= allTopicLines.length)
                .map(n => allTopicLines[n - 1])
                .filter(Boolean);
              if (filtered.length > 0) topicLines = filtered;
            }
            if (topicLines === allTopicLines && reqs.chapterFilter) {
              const filterLower = reqs.chapterFilter.toLowerCase();
              const keywordFiltered = allTopicLines.filter(t =>
                t.toLowerCase().split(/\s+/).some(word => word.length > 3 && filterLower.includes(word))
              );
              if (keywordFiltered.length > 0) topicLines = keywordFiltered;
            }
          }

          if (topicLines === allTopicLines && reqs.topicKeyword) {
            const kw = reqs.topicKeyword.toLowerCase();
            const kwFiltered = allTopicLines.filter(t =>
              t.toLowerCase().includes(kw) || kw.includes(t.toLowerCase().split(" ")[0])
            );
            if (kwFiltered.length > 0) topicLines = kwFiltered;
          }

          if (topicLines.length === 0) topicLines = allTopicLines;
          if (topicLines.length === 0) topicLines = [subjectName];

          const questionPlan = buildCbseQuestionPlan(finalMarks, topicLines, reqs, isHindi, isMath);

          const verbBank = isHindi ? shuffle([...HINDI_VERBS])
            : isEnglish ? shuffle([...ENGLISH_VERBS])
            : isMath ? shuffle([...MATH_CONTEXTS])
            : isSST ? shuffle([...SST_CONTEXTS])
            : isScience ? shuffle([...SCIENCE_CONTEXTS])
            : shuffle([...ENGLISH_VERBS]);

          const difficultyRota = ["easy", "medium", "medium", "hard", "medium", "easy"];

          const questionTexts: string[] = [];
          for (const slot of questionPlan) {
            const verbStyle  = verbBank[slot.qNum % verbBank.length];
            const difficulty = difficultyRota[slot.qNum % difficultyRota.length];

            const qTypeHint =
              slot.marks === 1 ? "MCQ or fill-in-the-blank or one-word" :
              slot.marks === 2 ? "very short answer (2â€“3 lines)" :
              slot.marks === 3 ? "short answer (4â€“5 lines)" :
              slot.marks === 4 ? "short-long answer (6â€“8 lines)" :
              "long answer (8â€“10 lines)";

            const angles = [
              "Ask about a definition or concept",
              "Ask for an example or application",
              "Ask to compare or contrast two things",
              "Ask to explain cause-and-effect",
              "Ask a fill-in-the-blank or one-word type",
              "Ask a short analytical question",
              "Ask for a real-life connection",
              "Ask about a process or sequence of steps",
            ];
            const angle = pick(angles);

            const singleQPrompt = isHindi
              ? `You are a Hindi grammar examiner. ${paperSeed}
Topic: "${slot.topic}" | Marks: ${slot.marks} | Type: ${qTypeHint} | Difficulty: ${difficulty}
Angle: ${angle}
Style: ${verbStyle}
Write EXACTLY ONE unique Hindi grammar question worth ${slot.marks} mark(s).
Output ONLY the question text in Hindi. No numbering, no marks label.`
              : `You are a ${subjectName} examiner (Class ${cls} CBSE). ${paperSeed}
Topic: "${slot.topic}" | Marks: ${slot.marks} | Type: ${qTypeHint} | Difficulty: ${difficulty}
Approach: ${angle}
Style hint: "${verbStyle}"
${reqs.chapterFilter ? `Chapter scope: ${reqs.chapterFilter}` : ""}
Write EXACTLY ONE fresh, unique ${qTypeHint} question worth ${slot.marks} mark(s) on "${slot.topic}".
Output ONLY the question text. No numbering, no marks label, no explanation.`;

            const qText = await callAI(singleQPrompt, [
              { role: "user", content: `Write one ${slot.marks}-mark ${difficulty} ${qTypeHint} question on "${slot.topic}".` }
            ]);
            const cleanQ = qText.trim().replace(/^(Q\.?\d+\.?\s*|\d+\.\s*)/i, "").trim();
            questionTexts.push(cleanQ);
          }

          const paperHeader = `Subject       : ${subjectName}\nClass         : ${cls}\nBoard         : ${board}\nTime Allowed  : ${timeAllowed}\nMaximum Marks : ${finalMarks}`;
          const generalInstructions = `General Instructions:\n1. All questions are compulsory.\n2. Marks are indicated against each question.\n3. For 1-mark questions write only the answer; for 2-mark questions write 2â€“3 sentences; for 3-mark questions write 4â€“5 sentences; for 5-mark questions write a detailed paragraph.`;
          const questionBody = questionPlan
            .map((slot, i) => `${slot.qNum}. ${questionTexts[i] || "(Question unavailable)"} [${slot.marks} mark${slot.marks > 1 ? "s" : ""}]`)
            .join("\n\n");

          const paper = `${paperHeader}\n\n${generalInstructions}\n\n${questionBody}`;
          const startTime = Date.now();

          const activeSession: ExamSession = {
            session_key:          session.session_key || key,
            status:               "IN_EXAM",
            subject_request:      session.subject_request,
            subject:              subjectName,
            custom_instructions:  customInstructions || undefined,
            question_paper:       paper,
            answer_log:           [],
            started_at:           startTime,
            total_marks:          finalMarks,
            syllabus_from_upload: session.syllabus_from_upload,
            student_name:         name,
            student_class:        cls,
            student_board:        board,
          };
          await saveSession(activeSession);

          return NextResponse.json({
            reply:
              `â±ï¸ **Exam started! Timer is running.**\n\n` +
              `ðŸ“Œ How to answer:\n` +
              `â€¢ Answer questions in **any order** you prefer\n` +
              `â€¢ Type answers directly in chat, OR\n` +
              `â€¢ Upload **photos / PDFs** of your handwritten answers\n` +
              `â€¢ You can send multiple messages â€” all will be collected\n` +
              `â€¢ When fully done, type **submit** (or **done** / **finish**)\n\n` +
              `Good luck${callName}! ðŸ’ª Give it your best.`,
            paper,
            startTime,
          });
        }

        // Standard 80-mark CBSE paper
        const englishSections = `
âš ï¸ CBSE 2026 FORMAT: 50% competency-based.
SECTION A â€” READING [20 Marks]
Q1  Unseen Passage â€” Factual / Discursive [10 marks]
  â€¢ (a) 5 MCQs Ã— 1 mark = 5 marks  (b) 5 Short-answer questions Ã— 1 mark = 5 marks
Q2  Unseen Passage â€” Literary / Poem extract [10 marks]
  â€¢ (a) 5 MCQs Ã— 1 mark = 5 marks  (b) 5 Short-answer questions Ã— 1 mark = 5 marks
SECTION B â€” WRITING SKILLS [20 Marks]
Q3  Descriptive Paragraph / Bio-sketch / Dialogue [5 marks]
Q4  Notice / Message / Advertisement [5 marks]
Q5  Letter Writing [5 marks]
Q6  Long Composition â€” Article / Speech / Story [5 marks]
SECTION C â€” GRAMMAR [20 Marks]
Q7  Gap Filling â€” Tenses / Modals / Voice [4 Ã— 1 = 4 marks]
Q8  Editing â€” Error Correction [4 Ã— 1 = 4 marks]
Q9  Omission â€” Missing Words [4 Ã— 1 = 4 marks]
Q10 Sentence Reordering [4 Ã— 1 = 4 marks]
Q11 Sentence Transformation [4 Ã— 1 = 4 marks]
SECTION D â€” LITERATURE [20 Marks]
Q12 Extract-based Questions â€” Prose [5 marks]
Q13 Extract-based Questions â€” Poetry [5 marks]
Q14 Short Answer Questions â€” Prose & Poetry [6 marks]
Q15 Long Answer â€” Prose / Drama [4 marks]`.trim();

        const hindiSections = `
SECTION A â€” APATHIT GADYANSH / KAVYANSH [20 Marks]
Q1  Apathit Gadyansh (Unseen Prose Passage) [10 marks]
Q2  Apathit Kavyansh (Unseen Poem Extract) [10 marks]
SECTION B â€” LEKHAN (Writing) [20 Marks]
Q3  Patra Lekhan â€” à¤”à¤ªà¤šà¤¾à¤°à¤¿à¤• à¤ªà¤¤à¥à¤° [5 marks]
Q4  Anuched Lekhan [5 marks]
Q5  Suchna Lekhan [5 marks]
Q6  Sandesh / Vigyapan Lekhan [5 marks]
SECTION C â€” VYAKARAN (Grammar) [20 Marks]
Q7  Shabdalankar / Arth-bhed [4 marks]
Q8  Sandhi-Viched [4 marks]
Q9  Samas-Vigraha [4 marks]
Q10 Muhavare / Lokoktiyan [4 marks]
Q11 Vakya Bhed [4 marks]
SECTION D â€” PATHEN (Literature) [20 Marks]
Q12 Gadyansh-adharit prashn [5 marks]
Q13 Kavyansh-adharit prashn [5 marks]
Q14 Laghu Uttariya Prashn [6 marks]
Q15 Dirgha Uttariya Prashn [4 marks]`.trim();

        const mathSections = `
SECTION A â€” MCQ & Assertion-Reason [20 Ã— 1 = 20 Marks]
Q1â€“Q18   MCQs [1 mark each]
Q19â€“Q20  Assertion-Reason [1 mark each]
SECTION B â€” Very Short Answer [5 Ã— 2 = 10 Marks]
Q21â€“Q25  [2 marks each]
SECTION C â€” Short Answer [6 Ã— 3 = 18 Marks]
Q26â€“Q31  [3 marks each]
SECTION D â€” Long Answer [4 Ã— 5 = 20 Marks]
Q32â€“Q35  [5 marks each]
SECTION E â€” Case-Based / Competency [3 Ã— 4 = 12 Marks]
Q36  Case Study 1 [4 marks: (i)1m + (ii)1m + (iii)2m]
Q37  Case Study 2 [4 marks]
Q38  Case Study 3 [4 marks]`.trim();

        const scienceSections = `
âš ï¸ CBSE 2026 FORMAT: 50% competency-based.
SECTION A â€” Objective [20 Ã— 1 = 20 Marks]
Q1â€“Q10   MCQs [1 mark each]
Q11â€“Q16  Competency-based MCQs [1 mark each]
Q17â€“Q18  Assertion-Reason [1 mark each]
Q19â€“Q20  Fill in the Blanks [1 mark each]
SECTION B â€” Very Short Answer [5 Ã— 2 = 10 Marks]
Q21â€“Q25  [2 marks each]
SECTION C â€” Short Answer [6 Ã— 3 = 18 Marks]
Q26â€“Q31  [3 marks each]
SECTION D â€” Long Answer [4 Ã— 5 = 20 Marks]
Q32â€“Q35  [5 marks each]
SECTION E â€” Case-Based [3 Ã— 4 = 12 Marks]
Q36  Case Study â€” Biology [4 marks]
Q37  Case Study â€” Physics [4 marks]
Q38  Case Study â€” Chemistry [4 marks]`.trim();

        const sstSections = `
SECTION A â€” Objective [20 Ã— 1 = 20 Marks]
Q1â€“Q16   MCQs [1 mark each]
Q17â€“Q18  Assertion-Reason [1 mark each]
Q19â€“Q20  Fill in the Blank / Match [1 mark each]
SECTION B â€” Short Answer Questions [6 Ã— 3 = 18 Marks]
Q21â€“Q26  [3 marks each]
SECTION C â€” Long Answer Questions [5 Ã— 5 = 25 Marks]
Q27â€“Q31  [5 marks each]
SECTION D â€” Source-Based [3 Ã— 4 = 12 Marks]
Q32  Source â€” History [4 marks]
Q33  Source â€” Geography or Economics [4 marks]
Q34  Source â€” Civics [4 marks]
SECTION E â€” Map-Based Questions [2 + 3 = 5 Marks]
Q35  History Map [2 marks]
Q36  Geography Map [3 marks]`.trim();

        const standardSections = `
SECTION A â€” Objective Type [20 Ã— 1 = 20 Marks]
Q1â€“Q16   MCQs [1 mark each]
Q17â€“Q18  Assertion-Reason [1 mark each]
Q19â€“Q20  Fill in the Blank [1 mark each]
SECTION B â€” Very Short Answer [5 Ã— 2 = 10 Marks]
Q21â€“Q25  [2 marks each]
SECTION C â€” Short Answer [6 Ã— 3 = 18 Marks]
Q26â€“Q31  [3 marks each]
SECTION D â€” Long Answer [4 Ã— 5 = 20 Marks]
Q32â€“Q35  [5 marks each]
SECTION E â€” Case-Based [3 Ã— 4 = 12 Marks]
Q36â€“Q38  [4 marks each]`.trim();

        const sectionBlocks = isMath ? mathSections
          : isEnglish ? englishSections
          : isHindi   ? hindiSections
          : isSST     ? sstSections
          : isScience ? scienceSections
          : standardSections;

        const uploadCoverageNote = hasUploadedSyllabus ? `
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
ðŸš¨ ABSOLUTE RESTRICTION â€” UPLOADED SYLLABUS IS THE ONLY SOURCE ðŸš¨
â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”â”
Every single question MUST come from a topic explicitly listed in the uploaded syllabus above.`.trim() : "";

        const difficultyDistrib = pick([
          "30% easy | 50% medium | 20% HOTs",
          "20% easy | 55% medium | 25% HOTs",
          "25% easy | 45% medium | 30% HOTs",
          "35% easy | 40% medium | 25% HOTs",
        ]);

        const paperVerbSet = isHindi
          ? shuffle([...HINDI_VERBS]).slice(0, 6).join(", ")
          : isMath
          ? shuffle([...MATH_CONTEXTS]).slice(0, 5).join(" | ")
          : isSST
          ? shuffle([...SST_CONTEXTS]).slice(0, 5).join(" | ")
          : isScience
          ? shuffle([...SCIENCE_CONTEXTS]).slice(0, 5).join(" | ")
          : shuffle([...ENGLISH_VERBS]).slice(0, 6).join(", ");

        const cleanedChapterList = chapterList
          .split("\n")
          .filter(line => {
            const l = line.trim();
            return l.length > 0
              && !/^\[NCERT SYLLABUS/i.test(l)
              && !/^Use the real, complete/i.test(l)
              && !/^Draw questions ONLY/i.test(l)
              && !/^Do NOT invent/i.test(l)
              && !/^Do NOT use chapters/i.test(l)
              && !/^Examples of topics/i.test(l);
          })
          .join("\n");

        const paperPrompt = `
You are an official CBSE Board question paper setter for Class ${cls}.
${paperSeed}
Subject: ${subjectName} | Board: ${board} | Maximum Marks: 80 | Time: 3 Hours

UNIQUENESS MANDATE: This paper MUST be completely different from any previously generated paper.
VARIATION: MCQs use fresh scenarios. Short answers rotate verbs: ${paperVerbSet}
Difficulty: ${difficultyDistrib}

Follow the EXACT official CBSE 2024-25 paper pattern for ${subjectName} as specified below.
Output the complete question paper ONLY â€” no commentary, no preamble.

PAPER HEADER (reproduce exactly):
Subject       : ${subjectName}
Class         : ${cls}
Board         : ${board}
Time Allowed  : 3 Hours
Maximum Marks : 80

General Instructions:
1. This question paper contains ${isEnglish || isHindi ? "four" : "five"} sections.
2. All questions are compulsory. Marks are indicated against each question.
3. Attempt all parts of a question together.
4. Write neat, well-structured answers.${isMath ? `
5. Show all steps clearly. Marks are awarded for method even if the final answer is wrong.
6. Use of calculator is not permitted.` : ""}

${hasUploadedSyllabus
  ? `AUTHORISED TOPICS â€” ALL QUESTIONS MUST COME FROM THIS LIST ONLY:\n${cleanedChapterList}`
  : `AUTHORISED SYLLABUS (NCERT Class ${cls} ${subjectName}):\n${cleanedChapterList}`
}

${uploadCoverageNote ? uploadCoverageNote + "\n\n" : ""}${sectionBlocks}

FINAL QUALITY CHECKS:
â€¢ Generate ALL sections completely â€” no section may be missing or short
â€¢ Total marks MUST add up to exactly 80
â€¢ Every question must show its mark value in [brackets]
â€¢ No two questions should test the exact same concept in the same way
â€¢ Do NOT add any text after the last question
        `.trim();

        const paper = await callAI(paperPrompt, [
          {
            role: "user",
            content: `Generate a FRESH UNIQUE CBSE Board paper: ${board} Class ${cls} â€” ${subjectName}${hasUploadedSyllabus ? " (UPLOADED SYLLABUS â€” use ONLY listed topics)" : ""}. Paper seed: ${paperSeed}`,
          },
        ]);

        verifyPaperMarks(paper, 80);
        const startTime = Date.now();

        const activeSession: ExamSession = {
          session_key:          session.session_key || key,
          status:               "IN_EXAM",
          subject_request:      session.subject_request,
          subject:              subjectName,
          custom_instructions:  customInstructions || undefined,
          question_paper:       paper,
          answer_log:           [],
          started_at:           startTime,
          total_marks:          80,
          syllabus_from_upload: session.syllabus_from_upload,
          student_name:         name,
          student_class:        cls,
          student_board:        board,
        };
        await saveSession(activeSession);

        return NextResponse.json({
          reply:
            `â±ï¸ **Exam started! Timer is running.**\n\n` +
            `ðŸ“Œ How to answer:\n` +
            `â€¢ Answer questions in **any order** you prefer\n` +
            `â€¢ Type answers directly in chat, OR\n` +
            `â€¢ Upload **photos / PDFs** of your handwritten answers\n` +
            `â€¢ You can send multiple messages â€” all will be collected\n` +
            `â€¢ When fully done, type **submit** (or **done** / **finish**)\n\n` +
            `Good luck${callName}! ðŸ’ª Give it your best.`,
          paper,
          startTime,
        });
      }

      return NextResponse.json({
        reply:
          `Please tell me the **subject** you want to be tested on${callName}.\n` +
          `Options: Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
          `ðŸ“Ž Or **upload your syllabus** as a PDF or image for a custom paper.`,
      });
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // ORAL MODE
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (mode === "oral") {
      const contextPrimer: ChatMessage[] = name ? [
        { role: "user", content: `My name is ${name}${cls ? `, I'm in Class ${cls}` : ""}${board ? `, ${board} board` : ""}.` },
        { role: "assistant", content: `Great! I'll call you ${name}. Let's get started.` },
      ] : [];
      const oralConversation: ChatMessage[] = [
        ...contextPrimer,
        ...history.slice(-12),
        { role: "user", content: message },
      ];
      const oralConversationText = [...history, { role: "user", content: message }].map((m) => m.content).join(" ");
      const isHindiOral =
        /hindi/i.test(bodySubject) ||
        bodyLang === "hi-IN" ||
        /[\u0900-\u097F]{5,}/.test(oralConversationText) ||
        /hindi|à¤¹à¤¿à¤‚à¤¦à¥€/i.test(oralConversationText);
      const oralSystemPrompt = name
        ? systemPrompt("oral", isHindiOral ? "hindi" : undefined) + `\n\nSTUDENT IDENTITY: The student's name is ${name}${cls ? `, Class ${cls}` : ""}. Always use their name â€” never call them "Student".`
        : systemPrompt("oral", isHindiOral ? "hindi" : undefined);
      const reply = await callAI(oralSystemPrompt, oralConversation);
      await addActivity({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), userQuery: message || "", aiResponse: reply, mode, user: nameForLog });
      return NextResponse.json({ reply });
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // PRACTICE MODE
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    const knowledgeLookup = await searchKnowledge(message || "");
    if (knowledgeLookup.matched) {
      const kbPrompt = `Use this uploaded knowledge context when answering. If context is incomplete, answer conservatively.\n\n[Source: ${knowledgeLookup.source}]\n${knowledgeLookup.context}`;
      const kbReply = await callAI(kbPrompt, conversation);
      await addActivity({
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        userQuery: message || "",
        aiResponse: kbReply,
        mode,
        user: nameForLog,
      });
      return NextResponse.json({ reply: kbReply, source: knowledgeLookup.source });
    }

    if (mode === "practice") {
      const practiceConversationText = conversation.map((m) => m.content).join(" ");
      const isHindiPractice =
        /hindi/i.test(bodySubject) ||
        bodyLang === "hi-IN" ||
        /[\u0900-\u097F]{5,}/.test(practiceConversationText) ||
        /hindi|à¤¹à¤¿à¤‚à¤¦à¥€/i.test(practiceConversationText);
      const isMathPractice =
        !isHindiPractice && (
          /math/i.test(bodySubject) ||
          /\b(mathematics|maths?|algebra|calculus|geometry|trigonometry|statistics|probability|polynomials?|coordinate|quadrilateral|heron|surface area|volume|number system|linear equation)\b/i.test(practiceConversationText)
        );
      const practiceOverride = isHindiPractice ? "hindi" : isMathPractice ? "mathematics" : undefined;
      const reply = await callAI(systemPrompt("practice", practiceOverride), conversation);
      await addActivity({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), userQuery: message || "", aiResponse: reply, mode, user: nameForLog });
      return NextResponse.json({ reply });
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // REVISION MODE
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (mode === "revision") {
      const revisionConversationText = conversation.map((m) => m.content).join(" ");
      const isHindiRevision =
        /hindi/i.test(bodySubject) ||
        bodyLang === "hi-IN" ||
        /[\u0900-\u097F]{5,}/.test(revisionConversationText) ||
        /hindi|à¤¹à¤¿à¤‚à¤¦à¥€/i.test(revisionConversationText);
      const isMathRevision =
        !isHindiRevision && (
          /math/i.test(bodySubject) ||
          /\b(mathematics|maths?|algebra|calculus|geometry|trigonometry|statistics|probability|polynomials?|coordinate|quadrilateral|heron|surface area|volume|number system|linear equation)\b/i.test(revisionConversationText)
        );
      const revisionOverride = isHindiRevision ? "hindi" : isMathRevision ? "mathematics" : undefined;
      const reply = await callAI(systemPrompt("revision", revisionOverride), conversation);
      await addActivity({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), userQuery: message || "", aiResponse: reply, mode, user: nameForLog });
      return NextResponse.json({ reply });
    }

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // PROGRESS MODE
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    if (mode === "progress") {
      const subjectStats = body?.subjectStats || null;
      const attempts     = body?.attempts     || [];
      const trimmedAttempts = Array.isArray(attempts)
        ? Object.values(
            attempts.reduce((acc: Record<string, any[]>, a: any) => {
              const subj = a?.subject || "unknown";
              if (!acc[subj]) acc[subj] = [];
              acc[subj].push(a);
              return acc;
            }, {})
          ).flatMap((group: any[]) => (group as any[]).slice(-10))
        : [];
      const dataPayload = subjectStats ? JSON.stringify(subjectStats, null, 2) : JSON.stringify(trimmedAttempts, null, 2);
      const progressPrompt = `
You are a sharp CBSE academic advisor. Analyse the student's performance data below.
Student: ${name || "the student"}, Class ${cls}
OUTPUT RULES â€” follow exactly, no exceptions:
- Output EXACTLY 4 lines, each starting with its emoji prefix
- No preamble, no sign-off, no extra lines whatsoever
- Every line must name a specific subject â€” never say "a subject"
- Be precise and blunt â€” no filler phrases
LINE FORMAT (output all 4, in this exact order):
ðŸ’ª Strongest:  [subject] â€” [score]% ([grade]) â€” one specific reason why
âš ï¸  Weakest:   [subject] â€” [score]% â€” [one specific thing to fix]
ðŸ“ˆ Trend:      [subject showing biggest positive delta, or "No improvement data yet"]
ðŸŽ¯ Next target: [subject closest to next grade] â€” [X] more marks â†’ [next grade label]
      `.trim();
      const reply = await callAI(progressPrompt, [
        { role: "user", content: `Performance data for ${name || "the student"}:\n${dataPayload}` },
      ]);
      await addActivity({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), userQuery: message || "", aiResponse: reply, mode, user: nameForLog });
      return NextResponse.json({ reply });
    }

    await addActivity({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), userQuery: message || "", aiResponse: "Invalid mode.", mode, user: nameForLog, error: "Invalid mode" });
    return NextResponse.json({ reply: "Invalid mode." });

  } catch (err) {
    console.error("[route.ts] Unhandled error:", err);
    try {
      await addActivity({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), userQuery: "", aiResponse: "", error: String(err) });
    } catch {}
    return NextResponse.json(
      { reply: "Server error. Please try again." },
      { status: 500 }
    );
  }
}

