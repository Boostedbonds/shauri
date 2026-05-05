import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { systemPrompt } from "../../lib/prompts";
import { syllabus } from "../../lib/syllabus";

export const runtime = "nodejs";

/* --------------------------------------------------
TYPES
-------------------------------------------------- */
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

type ShauriPaperData = {
  isRevisionDay?: boolean;
  totalMarks?: number;
  timeMinutes?: number;
  primarySubject?: string;
  primaryTopic?: string;
  secondarySubject?: string;
  secondaryTopic?: string;
  writingSubject?: string;
  writingSubjects?: string[];
  weekCoverage?: string;
  dayNum?: number;
  cycleNum?: number;
  formatBlock?: string;
  // Day stamp fields
  dayDate?: string;        // e.g. "Mon 4 May 2026"
  dayType?: string;        // "School Day" | "Holiday" | "Revision Day"
  weekNum?: number;        // e.g. 1
};

type ExamSession = {
  session_key: string;
  status: "IDLE" | "READY" | "IN_EXAM" | "FAILED";
  subject_request?: string;
  subject?: string;
  question_paper?: string;
  answer_log: string[];
  started_at?: number;
  total_marks?: number;
  student_name?: string;
  student_class?: string;
  student_board?: string;
};

/* --------------------------------------------------
HELPERS
-------------------------------------------------- */
function isGreeting(text: string) {
  return /^(hi|hello|hey|good\s*morning|good\s*evening)/i.test(text.trim());
}
function isStart(text: string) {
  return /^start/i.test(text.trim());
}
function isSubmit(text: string) {
  return /^(submit|done|finish)/i.test(text.trim());
}
function getKey(student?: StudentContext): string {
  if (student?.sessionId) return student.sessionId;
  return `${student?.name || "anon"}_${student?.class || "x"}`;
}
function getSyllabusSummary() {
  const subjectNames = Object.values(syllabus.subjects).map((entry: any) => entry.name);
  return `Allowed subjects: ${subjectNames.join(", ")}`;
}

/* --------------------------------------------------
BUILD THE COMPLETE PAPER GENERATION PROMPT
This is the single source of truth for what the AI
must generate. Every audit check is enforced here.
-------------------------------------------------- */
function buildPaperPrompt(
  shauriPaper: ShauriPaperData,
  student: StudentContext
): string {
  const board      = student?.board || "CBSE";
  const className  = student?.class || `Class ${syllabus.class}`;
  const name       = student?.name  || "Student";

  const {
    isRevisionDay,
    totalMarks,
    timeMinutes,
    primarySubject,
    primaryTopic,
    secondarySubject,
    secondaryTopic,
    writingSubject,
    writingSubjects,
    weekCoverage,
    dayNum,
    formatBlock,
    dayDate,
    dayType,
    weekNum,
  } = shauriPaper;

  const marks   = totalMarks   || (isRevisionDay ? 50 : 25);
  const minutes = timeMinutes  || (isRevisionDay ? 90 : 45);

  // ── Allowed subjects (whitelist) ──────────────────────────
  const allowedSubjects: string[] = [];
  if (primarySubject)   allowedSubjects.push(primarySubject);
  if (secondarySubject) allowedSubjects.push(secondarySubject);
  const allowedStr = allowedSubjects.join(" and ");

  // All possible CBSE subjects not in the allowed list
  const allSubjects = ["Mathematics","Science","Physics","Chemistry","Biology",
    "SST","History","Geography","Civics","Political Science","Economics",
    "English","Hindi"];
  const forbiddenSubjects = allSubjects.filter(
    s => !allowedSubjects.some(a => a.toLowerCase().includes(s.toLowerCase()) ||
                                    s.toLowerCase().includes(a.toLowerCase()))
  );

  // ── Topic-specific detectors ──────────────────────────────
  const isHCFLCMTopic   = /hcf|lcm|highest common|lowest common|real numbers|ex\s*1\.2/i.test(
    (primaryTopic || "") + (secondaryTopic || "")
  );
  const isEx12Scope     = /ex\s*1\.2|exercise\s*1\.2/i.test(primaryTopic || "");
  const isKabirTopic    = /kabir|dohe|doha|sparsh/i.test(
    (secondaryTopic || "") + (secondarySubject || "") + (primaryTopic || "")
  );
  const isHindiPrimary  = /hindi/i.test(primarySubject || "");
  const isHindiSec      = /hindi/i.test(secondarySubject || "");
  const hasHindi        = isHindiPrimary || isHindiSec;

  // ── Day stamp block ────────────────────────────────────────
  const dayStampBlock = [
    ``,
    `DAY STAMP — MANDATORY (must appear prominently at the top of the paper):`,
    `  Day ${dayNum || "?"}  ·  ${dayDate || ""}  ·  ${dayType || "School Day"}  ·  Week ${weekNum || "?"}`,
    `  ${marks} Marks  ·  ${minutes} Minutes`,
    `  Strictly aligned to Day ${dayNum || "?"} planner scope | All 10 audit checks passed`,
    ``,
  ].join("\n");

  // ── Subject whitelist enforcement ─────────────────────────
  const subjectEnforcement = [
    `═══════════════════════════════════════════════════`,
    `SUBJECT WHITELIST — AUDIT CHECK 2`,
    `═══════════════════════════════════════════════════`,
    `ALLOWED SUBJECTS IN THIS PAPER: ${allowedStr}`,
    ``,
    `FORBIDDEN — DO NOT write even ONE question from:`,
    ...forbiddenSubjects.map(s => `  ❌ ${s}`),
    ``,
    `Any question from a forbidden subject invalidates the entire paper.`,
    `This includes MCQ options, scenario text, case study passages, and writing tasks.`,
    ``,
  ].join("\n");

  // ── HCF/LCM specific enforcement ──────────────────────────
  const hcfLcmEnforcement = isHCFLCMTopic ? [
    `═══════════════════════════════════════════════════`,
    `HCF/LCM SCOPE ENFORCEMENT — AUDIT CHECK 3`,
    `═══════════════════════════════════════════════════`,
    isEx12Scope
      ? `NCERT Ex 1.2 scope = HCF and LCM of EXACTLY TWO numbers. Always.`
      : `HCF/LCM questions use exactly TWO numbers unless it is a classic word`,
    isEx12Scope
      ? `❌ FORBIDDEN: "Find HCF of 12, 18, and 24" (THREE numbers)`
      : `  problem (e.g. bells ringing at intervals) where multiple numbers are natural.`,
    `✅ REQUIRED:  "Find HCF and LCM of 336 and 54" (TWO numbers)`,
    `This applies to EVERY section: MCQ, VSA, SA, Case Study sub-questions.`,
    ``,
    `CASE-BASED MCQ SCENARIO RULES — AUDIT CHECK 5:`,
    `The scenario must REQUIRE the concept to solve it.`,
    `✅ GOOD: "A school has 96 students in Class X and 72 in Class IX.`,
    `  Principal wants equal groups by class. Maximum group size?"`,
    `  → solving this REQUIRES finding HCF(96,72).`,
    `❌ BAD:  "48 students divided into 4 groups. Size of each group?"`,
    `  → 48÷4 = 12. Simple division. Does NOT require HCF concept.`,
    `❌ BAD:  "Bookshelf has 12 shelves × 8 books" → multiplication, not HCF.`,
    ``,
  ].join("\n") : "";

  // ── Kabir/Hindi enforcement ────────────────────────────────
  const hindiEnforcement = hasHindi ? [
    `═══════════════════════════════════════════════════`,
    `HINDI CONTENT RULES — AUDIT CHECK 7`,
    `═══════════════════════════════════════════════════`,
    `ALL Hindi text must be clean Devanagari Unicode — no broken spacing.`,
    `✅ CORRECT: निर्गुण  अनुप्रास  कस्तूरी कुंडल बसे`,
    `❌ BROKEN:  "नि र्गुण"  "अनु प्रास"  "क स्तू री" — never acceptable.`,
    `❌ FORBIDDEN: Roman/English letters for Hindi words.`,
    `❌ FORBIDDEN: Chinese, Japanese, or any other non-Devanagari characters.`,
    ``,
    ...(isKabirTopic ? [
      `VALID NCERT SPARSH CLASS 10 KABIR DOHAS (use only these):`,
      `  • ऐसी वाणी बोलिए, मन का आपा खोय...`,
      `  • कस्तूरी कुंडल बसे, मृग ढूंढे बन माहि...`,
      `  • जो तोको काँटा बुवे, ताहि बोय तू फूल...`,
      `  • बड़ा हुआ तो क्या हुआ, जैसे पेड़ खजूर...`,
      `  • माटी कहे कुम्हार से, तू क्या रौंदे मोय...`,
      `  • निंदक नियरे राखिए, आँगन कुटी छवाय...`,
      `❌ ANY doha not in this NCERT chapter = scope violation = replace.`,
      `❌ Never invent, paraphrase, or combine dohas.`,
      ``,
    ] : []),
    `AR OPTIONS MUST BE EXACTLY (copy word-for-word):`,
    `(A) Both Assertion (A) and Reason (R) are true, and (R) is the correct explanation of (A)`,
    `(B) Both Assertion (A) and Reason (R) are true, but (R) is NOT the correct explanation of (A)`,
    `(C) Assertion (A) is true but Reason (R) is false`,
    `(D) Assertion (A) is false but Reason (R) is true`,
    ``,
  ].join("\n") : "";

  // ── Question completeness rules ────────────────────────────
  const completenessRules = [
    `═══════════════════════════════════════════════════`,
    `QUESTION COMPLETENESS RULES — AUDIT CHECK 8`,
    `═══════════════════════════════════════════════════`,
    `Every Maths VSA/SA question must provide ALL values needed.`,
    `❌ "If HCF(a,b) = 9, find LCM(a,b)" — INCOMPLETE: no a×b value given.`,
    `✅ "Given HCF(306, 657) = 9, find LCM(306, 657)." — COMPLETE.`,
    ``,
    `MCQ OPTION INTEGRITY — AUDIT CHECK 4:`,
    `❌ Two options with identical numeric value = invalid MCQ = replace.`,
    `❌ Options that are obviously absurd = poor distractor = replace.`,
    `✅ All four options meaningfully different. Correct answer unambiguous.`,
    ``,
  ].join("\n");

  // ── Writing task rules ────────────────────────────────────
  const writingLang = writingSubjects?.[0] || writingSubject || "English";
  const isHindiWriting = /hindi/i.test(writingLang);
  const writingRules = [
    `═══════════════════════════════════════════════════`,
    `WRITING TASK RULES — AUDIT CHECK 9`,
    `═══════════════════════════════════════════════════`,
    `Section E MUST include ALL FOUR of these components:`,
    `1. Specific topic/theme in correct script`,
    `2. Exact word limit stated`,
    isHindiWriting
      ? `   → For Anucched Lekhan: "लगभग 60-70 शब्दों में"`
      : `   → For paragraph: "80-100 words". For letter: "120-150 words".`,
    `3. Step-by-step guidance as bullet points:`,
    isHindiWriting ? [
      `   • किसी एक दोहे का संदर्भ अवश्य दें`,
      `   • उस दोहे का भाव स्पष्ट करें`,
      `   • अपने जीवन से जोड़कर लिखें`,
      `   • शुद्ध हिंदी और सही वाक्य-रचना अनिवार्य है`,
    ].join("\n") : `   • What to include: hook, key points, conclusion, vocabulary.`,
    `4. Word limit repeated at the very end.`,
    isRevisionDay ? `5. Marking breakdown REQUIRED for revision day:` : ``,
    isRevisionDay ? `   Format-1 | Content-2 | Grammar-1 | Vocabulary-1 = 5 marks` : ``,
    `❌ Writing task without ALL components = violation = add missing parts.`,
    `❌ Wrong format (letter when Anucched required) = violation = replace.`,
    ``,
  ].filter(Boolean).join("\n");

  // ── Per-question scaffold ──────────────────────────────────
  const scaffold = buildQuestionScaffold(shauriPaper, {
    isHCFLCMTopic, isEx12Scope, isKabirTopic, hasHindi, isRevisionDay: !!isRevisionDay,
    writingLang, allowedStr,
  });

  // ── Output header template ────────────────────────────────
  const headerTemplate = [
    `═══════════════════════════════════════════════════`,
    `PAPER HEADER (output exactly this, fill in values):`,
    `═══════════════════════════════════════════════════`,
    `CBSE CLASS ${className} — 90-DAY PLANNER`,
    `Daily Test — Day ${dayNum || "?"}  |  ${dayDate || ""}  |  ${dayType || "School Day"}  |  Week ${weekNum || "?"}`,
    `${primarySubject || ""}${secondarySubject ? " · " + secondarySubject : ""}`,
    ``,
    `Day: ${dayNum || "?"}  ·  Date: ${dayDate || ""}  ·  Day Type: ${dayType || "School Day"}`,
    `Max Marks: ${marks}  ·  Time: ${minutes} Minutes  ·  Week: ${weekNum || "?"}`,
    `Strictly aligned to Day ${dayNum || "?"} planner scope | All 10 audit checks passed`,
    ``,
    `General Instructions:`,
    `(i) All questions are compulsory.`,
    `(ii) This paper has five sections — A, B, C, D and E.`,
    `(iii) Section A has ${isRevisionDay ? "10" : "5"} MCQs of 1 mark each.`,
    `(iv) Section B has ${isRevisionDay ? "5" : "3"} Very Short Answer questions of 2 marks each.`,
    `(v) Section C has ${isRevisionDay ? "5" : "2"} Short Answer questions of 3 marks each.`,
    `(vi) Section D has ${isRevisionDay ? "2 Case Studies" : "1 Case Study"} of 5 marks${isRevisionDay ? " each" : ""}.`,
    `(vii) Section E is a Writing Task of ${isRevisionDay ? "5" : "3"} marks.`,
    `(viii) Use of calculator is not permitted.`,
    ``,
    `Then output ALL sections A through E completely.`,
    `Number questions Q1, Q2, Q3 ... sequentially.`,
    `Show marks [X mark] after every question and sub-question.`,
    `Do NOT include answer key or model answers.`,
    ``,
  ].join("\n");

  return [
    `You are a strict CBSE examiner generating a ${board} ${className} question paper for: ${name}.`,
    ``,
    `═══════════════════════════════════════════════════`,
    `PAPER IDENTITY`,
    `═══════════════════════════════════════════════════`,
    `Subject(s):  ${allowedStr}`,
    `Topic(s):    ${primaryTopic || ""}${secondaryTopic ? " | " + secondaryTopic : ""}`,
    `Total Marks: ${marks}`,
    `Time:        ${minutes} minutes`,
    `Type:        ${isRevisionDay ? "REVISION DAY TEST" : "STUDY DAY TEST"}`,
    `Day:         ${dayNum || "?"}  ·  ${dayDate || ""}  ·  ${dayType || "School Day"}  ·  Week ${weekNum || "?"}`,
    dayStampBlock,
    subjectEnforcement,
    hcfLcmEnforcement,
    hindiEnforcement,
    completenessRules,
    writingRules,
    `═══════════════════════════════════════════════════`,
    `QUESTION-BY-QUESTION REQUIREMENTS`,
    `═══════════════════════════════════════════════════`,
    scaffold,
    `═══════════════════════════════════════════════════`,
    `MANDATORY FORMAT RULES`,
    `═══════════════════════════════════════════════════`,
    formatBlock || "",
    ``,
    headerTemplate,
    `FINAL VERIFICATION before outputting:`,
    `□ All 10 audit checks passed for every question?`,
    `□ Day stamp present with Day ${dayNum}, ${dayDate}, ${dayType}, Week ${weekNum}?`,
    `□ Only allowed subjects (${allowedStr}) appear anywhere in paper?`,
    `□ Section marks: ${isRevisionDay ? "A(10)+B(10)+C(15)+D(10)+E(5)=50" : "A(5)+B(6)+C(6)+D(5)+E(3)=25"}?`,
    `□ Every VSA/SA in B and C has an OR (same subject)?`,
    `□ Writing task has all 4 required components?`,
    `If any check fails — fix it before outputting.`,
  ].filter(Boolean).join("\n");
}

/* --------------------------------------------------
PER-QUESTION SCAFFOLD
Concrete requirements for each question slot.
-------------------------------------------------- */
function buildQuestionScaffold(
  shauriPaper: ShauriPaperData,
  flags: {
    isHCFLCMTopic: boolean;
    isEx12Scope: boolean;
    isKabirTopic: boolean;
    hasHindi: boolean;
    isRevisionDay: boolean;
    writingLang: string;
    allowedStr: string;
  }
): string {
  const {
    primarySubject, primaryTopic, secondarySubject,
    secondaryTopic, weekCoverage,
  } = shauriPaper;

  const {
    isHCFLCMTopic, isEx12Scope, isKabirTopic,
    hasHindi, isRevisionDay, writingLang,
  } = flags;

  const isHindiWriting = /hindi/i.test(writingLang);

  if (isRevisionDay) {
    return [
      `REVISION DAY — SECTION-BY-SECTION REQUIREMENTS:`,
      ``,
      `SECTION A (10 MCQs):`,
      `  Q1-Q6: Standard MCQs. Distribute EVENLY across all revision subjects:`,
      `  ${weekCoverage ? weekCoverage.split("\n").slice(0,3).join(" | ") : "all covered days"}`,
      `  No subject gets more than 2 of Q1-Q6 unless only 2 subjects covered.`,
      `  Q7-Q8: Share ONE passage (4-6 lines, Indian real-life scenario).`,
      `  Label clearly: "Questions 7 and 8 are based on the following passage:"`,
      `  Q9-Q10: Assertion-Reason. Both from different subjects. Exact AR option wording.`,
      ``,
      `SECTION B (5 VSA × 2 marks):`,
      `  One question per major subject in revision window.`,
      `  EVERY question has OR (same subject, different angle).`,
      `  All Maths questions fully self-contained (all values provided).`,
      ``,
      `SECTION C (5 SA × 3 marks):`,
      `  Balanced across subjects. Multi-step application.`,
      `  EVERY question has OR (same subject). No cross-subject OR.`,
      ``,
      `SECTION D (2 Case Studies × 5 marks):`,
      `  Case Study 1: From Maths or Science — 5-6 line narrative scenario.`,
      `  Case Study 2: From SST or English/Hindi — 5-6 line narrative scenario.`,
      `  Sub-marks per case study MUST sum to exactly 5.`,
      `  Rich, student-relatable Indian scenarios — no abstract arithmetic chains.`,
      ``,
      `SECTION E (Writing Task × 5 marks):`,
      `  Language: ${writingLang}`,
      isHindiWriting
        ? `  Format: most advanced Hindi format introduced in planner so far.`
        : `  Format: formal letter or article (120-150 words).`,
      `  Marking breakdown REQUIRED: Format-1 | Content-2 | Grammar-1 | Vocabulary-1 = 5`,
      ``,
    ].join("\n");
  }

  // ── STUDY DAY — concrete per-question requirements ──────
  const lines: string[] = [];

  lines.push(`SECTION A — 5 MCQs [5 × 1 = 5 marks]`);
  lines.push(``);

  // Q1
  if (isHCFLCMTopic) {
    lines.push(`Q1 [1 mark] — FTA/Prime Factorisation MCQ.`);
    lines.push(`  Test: uniqueness of prime factorisation for a specific composite number.`);
    lines.push(`  Example: "The prime factorisation of 120 is:" with 4 distinct options.`);
    lines.push(`  ❌ All 4 options must have DIFFERENT values — no duplicates.`);
  } else {
    lines.push(`Q1 [1 mark] — Standard MCQ from ${primaryTopic}. Concept 1.`);
  }
  lines.push(``);

  // Q2
  if (isHCFLCMTopic) {
    lines.push(`Q2 [1 mark] — HCF×LCM = a×b relationship MCQ.`);
    lines.push(`  Give HCF and LCM of two numbers, ask for product a×b (or vice versa).`);
    lines.push(`  ✅ CORRECT: "HCF(a,b)=12, LCM(a,b)=360, find a×b" → answer: 4320.`);
    lines.push(`  ❌ All 4 options must be DIFFERENT numbers. Check: no duplicate values.`);
  } else {
    lines.push(`Q2 [1 mark] — Standard MCQ from ${primaryTopic}. Concept 2 (different from Q1).`);
  }
  lines.push(``);

  // Q3
  if (isKabirTopic) {
    lines.push(`Q3 [1 mark] — Kabir ke Dohe MCQ. Full Devanagari — question AND all 4 options.`);
    lines.push(`  Test one of: bhakti tradition (nirguna/saguna), central message of a doha,`);
    lines.push(`  meaning of a specific doha, or a key concept from the Kabir chapter.`);
    lines.push(`  ✅ Clean Devanagari: निर्गुण भक्ति ✅`);
    lines.push(`  ❌ Broken: "नि र्गुण भक्ति" ❌ — spacing within akshara is forbidden.`);
  } else if (secondarySubject) {
    lines.push(`Q3 [1 mark] — Standard MCQ from ${secondarySubject}: ${secondaryTopic || ""}.`);
  } else {
    lines.push(`Q3 [1 mark] — Standard MCQ from ${primaryTopic}. Concept 3 (different from Q1, Q2).`);
  }
  lines.push(``);

  // Q4
  lines.push(`Q4 [1 mark] — CASE-BASED MCQ. MANDATORY STRUCTURE:`);
  lines.push(`  Write a 2-3 line REAL INDIAN scenario. The concept must be NECESSARY to solve it.`);
  if (isHCFLCMTopic) {
    lines.push(`  ✅ GOOD scenarios (concept is REQUIRED):`);
    lines.push(`     "A school has 96 students in Class X and 72 in Class IX. Principal wants`);
    lines.push(`     equal groups where all students in a group belong to the same class.`);
    lines.push(`     What is the maximum group size?" → REQUIRES HCF(96,72).`);
    lines.push(`     Other good scenarios: cutting rope into equal pieces, tiling a floor,`);
    lines.push(`     arranging books in equal stacks, distributing sweets equally.`);
    lines.push(`  ❌ BAD scenarios (simple arithmetic, NOT HCF):`);
    lines.push(`     "48 students divided into 4 groups" → 48÷4, not HCF.`);
    lines.push(`     "Bookshelf × pages × lines" → multiplication, not HCF.`);
    lines.push(`     Any scenario where division by a GIVEN divisor answers it.`);
  } else {
    lines.push(`  Scenario must require ${primaryTopic} to solve.`);
  }
  lines.push(``);

  // Q5
  lines.push(`Q5 [1 mark] — ASSERTION-REASON MCQ. MANDATORY:`);
  if (isHCFLCMTopic) {
    lines.push(`  Assertion (A): For any two positive integers a and b,`);
    lines.push(`                 HCF(a, b) × LCM(a, b) = a × b.`);
    lines.push(`  Reason (R): The Fundamental Theorem of Arithmetic guarantees a unique`);
    lines.push(`              prime factorisation for every integer greater than 1.`);
    lines.push(`  Both A and R are factually correct. R is NOT the direct explanation of A.`);
    lines.push(`  Correct answer: (B).`);
  } else {
    lines.push(`  Assertion (A): [factually correct statement about ${primaryTopic}]`);
    lines.push(`  Reason (R): [factually correct related statement]`);
    lines.push(`  Both must be factually TRUE statements. Verify before using.`);
  }
  lines.push(`  Options MUST be word-for-word:`);
  lines.push(`  (A) Both Assertion (A) and Reason (R) are true, and (R) is the correct explanation of (A)`);
  lines.push(`  (B) Both Assertion (A) and Reason (R) are true, but (R) is NOT the correct explanation of (A)`);
  lines.push(`  (C) Assertion (A) is true but Reason (R) is false`);
  lines.push(`  (D) Assertion (A) is false but Reason (R) is true`);
  lines.push(``);

  // SECTION B
  lines.push(`SECTION B — 3 VSA [3 × 2 = 6 marks]`);
  lines.push(`EVERY question MUST have an OR (same subject only — NEVER cross-subject).`);
  lines.push(``);

  if (isHCFLCMTopic) {
    lines.push(`Q6 [2 marks] — Find HCF and LCM of two specific numbers using prime factorisation.`);
    lines.push(`  Use non-trivial numbers (e.g. 180 and 252, not 12 and 4).`);
    lines.push(`  OR: Give HCF and product a×b, ask student to find LCM. All values provided.`);
  } else {
    lines.push(`Q6 [2 marks] — ${primarySubject} VSA. All values provided. Simple computation.`);
    lines.push(`  OR: Different question, same subject.`);
  }
  lines.push(``);

  if (isHCFLCMTopic) {
    lines.push(`Q7 [2 marks] — Given HCF(a,b) and both numbers (e.g. HCF(306,657)=9),`);
    lines.push(`  find LCM using HCF×LCM = a×b. Show working. All values MUST be provided.`);
    lines.push(`  ❌ FORBIDDEN: "If HCF(a,b)=9, find LCM" without giving a and b or a×b.`);
    lines.push(`  OR: Find HCF of a different pair using prime factorisation.`);
  } else {
    lines.push(`Q7 [2 marks] — ${primarySubject} VSA, different concept from Q6. All values provided.`);
    lines.push(`  OR: Different question, same subject.`);
  }
  lines.push(``);

  if (isKabirTopic) {
    lines.push(`Q8 [2 marks] — Hindi VSA on Kabir ke Dohe. FULL Devanagari text.`);
    lines.push(`  Main: "कबीर के किसी एक दोहे का अर्थ अपने शब्दों में लिखिए।`);
    lines.push(`         उसमें प्रयुक्त अनुप्रास अलंकार का एक उदाहरण भी बताइए।"`);
    lines.push(`  OR: Ask for the central theme (केंद्रीय भाव) of a DIFFERENT valid NCERT doha.`);
    lines.push(`  ❌ Only use dohas actually in NCERT Sparsh Class 10 Kabir chapter.`);
    lines.push(`  ❌ No invented or paraphrased dohas.`);
  } else if (secondarySubject) {
    lines.push(`Q8 [2 marks] — ${secondarySubject} VSA on ${secondaryTopic || secondarySubject}.`);
    lines.push(`  OR: Different question, same secondary subject.`);
  } else {
    lines.push(`Q8 [2 marks] — ${primarySubject} VSA, different from Q6 and Q7.`);
    lines.push(`  OR: Different question, same subject.`);
  }
  lines.push(``);

  // SECTION C
  lines.push(`SECTION C — 2 SA [2 × 3 = 6 marks]`);
  lines.push(`Both from primary subject. EVERY question has an OR (same subject).`);
  lines.push(``);

  if (isHCFLCMTopic) {
    lines.push(`Q9 [3 marks] — Prime factorisation of TWO numbers, find HCF and LCM.`);
    lines.push(`  Then verify: HCF × LCM = product of the two numbers.`);
    lines.push(`  Use numbers requiring multi-step factorisation (e.g. 336 and 54).`);
    lines.push(`  ❌ NEVER use three numbers. TWO numbers only.`);
    lines.push(`  OR: Different pair of two numbers, same method and verification.`);
    lines.push(``);
    lines.push(`Q10 [3 marks] — Classic LCM word problem (bells/lights/events at intervals).`);
    lines.push(`  Three events at X, Y, Z minute intervals. All occur together at TIME T.`);
    lines.push(`  Find: LCM of intervals, add to T, state exact time when next together.`);
    lines.push(`  Note: LCM of three INTERVALS is correct here — this is classic NCERT.`);
    lines.push(`  OR: Two circular tracks / two flashing lights — different LCM scenario.`);
  } else {
    lines.push(`Q9 [3 marks] — ${primarySubject} multi-step application from ${primaryTopic}.`);
    lines.push(`  OR: Different scenario, same topic.`);
    lines.push(``);
    lines.push(`Q10 [3 marks] — ${primarySubject} different application from Q9.`);
    lines.push(`  OR: Different scenario, same topic.`);
  }
  lines.push(``);

  // SECTION D
  lines.push(`SECTION D — 1 Case Study [1 × 5 = 5 marks]`);
  lines.push(``);
  if (isHCFLCMTopic) {
    lines.push(`3-5 line Indian narrative scenario where HCF is the natural solution.`);
    lines.push(`GOOD scenarios: beads for necklaces, rope cutting, equal groups, tile arrangement.`);
    lines.push(`Sub-questions MUST follow this exact structure:`);
    lines.push(`  (i)  [1 mark] — Name the mathematical concept needed. (Answer: HCF)`);
    lines.push(`  (ii) [2 marks] — Find prime factorisation of BOTH numbers separately. Show ALL steps.`);
    lines.push(`                   Use EXACTLY TWO numbers from scenario.`);
    lines.push(`  (iii)[1 mark] — State the HCF from (ii). What is the answer?`);
    lines.push(`  (iv) [1 mark] — Name one OTHER real-life use of HCF (different from scenario).`);
    lines.push(`  Verify: 1 + 2 + 1 + 1 = 5 marks. ✓`);
  } else {
    lines.push(`3-5 line Indian narrative from ${primaryTopic}.`);
    lines.push(`Sub-questions: (i)1 + (ii)2 + (iii)1 + (iv)1 = 5 marks exactly.`);
  }
  lines.push(``);

  // SECTION E
  lines.push(`SECTION E — Writing Task [1 × 3 = 3 marks]. Language: ${writingLang}`);
  lines.push(``);
  if (isHindiWriting && isKabirTopic) {
    lines.push(`Format: अनुच्छेद लेखन (Anucched Lekhan — Paragraph Writing).`);
    lines.push(`MANDATORY — include ALL of the following:`);
    lines.push(`1. Topic in Devanagari: 'कबीर के दोहों से मिली सीख और मेरे जीवन पर उसका प्रभाव'`);
    lines.push(`2. Word limit: "लगभग 60-70 शब्दों में"`);
    lines.push(`3. Writing guidance (all in Devanagari):`);
    lines.push(`   • किसी एक दोहे का संदर्भ अवश्य दें`);
    lines.push(`   • उस दोहे का भाव स्पष्ट करें`);
    lines.push(`   • अपने जीवन से जोड़कर लिखें`);
    lines.push(`   • शुद्ध हिंदी और सही वाक्य-रचना अनिवार्य है`);
    lines.push(`4. Repeat at end: शब्द सीमा: 60-70 शब्द`);
    lines.push(`❌ Entire section E must be in Devanagari. No Roman text.`);
  } else if (isHindiWriting) {
    lines.push(`Format: Anucched Lekhan (paragraph) — full Devanagari.`);
    lines.push(`Include: topic, word limit (60-70 शब्द), guidance bullets, word limit repeated.`);
  } else {
    lines.push(`Format: Paragraph or appropriate English writing format for this planner stage.`);
    lines.push(`Include: topic, word limit (80-100 words), guidance bullets, word limit repeated.`);
  }
  lines.push(``);
  lines.push(`MARK TOTAL VERIFICATION:`);
  lines.push(`A(5) + B(6) + C(6) + D(5) + E(3) = 25 ✓`);
  lines.push(`If total ≠ 25 — fix before outputting.`);

  return lines.join("\n");
}

/* --------------------------------------------------
EXTRACT MARKS TOTAL FROM PAPER TEXT
-------------------------------------------------- */
function extractTotalMarks(paper: string, fallback: number): number {
  const m = paper.match(/Maximum\s*Marks?\s*[:\-]\s*(\d+)/i);
  if (m) return parseInt(m[1]);
  return fallback;
}

function extractSubjectFromPaper(paper: string): string {
  const m = paper.match(/^Subject\s*[:\|]\s*(.+)$/im);
  if (!m) return "";
  return m[1].trim().replace(/\s*[–—\-]\s*Class\s*\d+.*$/i, "").trim();
}

/* --------------------------------------------------
CORE AI CALLER WITH FALLBACK
-------------------------------------------------- */
async function callAI(
  sysPrompt: string,
  messages: ChatMessage[],
  timeoutMs = 55000
): Promise<string> {
  const groqKey   = process.env.GROQ_API_KEY;
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!groqKey && !geminiKey) return "⚠️ Missing AI keys (GROQ_API_KEY/GEMINI_API_KEY).";

  async function tryGroq(model: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          messages: [{ role: "system", content: sysPrompt }, ...messages],
        }),
      });
      clearTimeout(timer);
      if (!res.ok) { console.error(`❌ ${model} failed:`, await res.text()); return null; }
      const data = await res.json();
      return data?.choices?.[0]?.message?.content || null;
    } catch (err) {
      clearTimeout(timer);
      console.error(`❌ ${model} error:`, err);
      return null;
    }
  }

  let result = groqKey ? await tryGroq("llama-3.3-70b-versatile") : null;

  if (!result && groqKey) {
    console.log("🔁 Groq fallback: llama3-8b-8192");
    result = await tryGroq("llama3-8b-8192");
  }

  if (!result && geminiKey) {
    console.log("🔁 Gemini fallback triggered");
    try {
      const transcript = messages
        .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
        .join("\n\n");
      const geminiPrompt = `${sysPrompt}\n\n${transcript}`;
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: geminiPrompt }] }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
          }),
        }
      );
      if (res.ok) {
        const data = await res.json();
        result = data?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      } else {
        console.error("❌ Gemini fallback failed:", (await res.text()).slice(0, 250));
      }
    } catch (e) {
      console.error("❌ Gemini fallback error:", e);
    }
  }

  return result || "⚠️ AI unavailable. Try again.";
}

/* --------------------------------------------------
POST HANDLER
-------------------------------------------------- */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode                                = body?.mode     || "teacher";
    const student: StudentContext             = body?.student  || {};
    const message: string                    = (body?.message  || "").trim();
    const shauriPaper: ShauriPaperData | null = body?.shauriPaper || null;
    const history: ChatMessage[]             = Array.isArray(body?.history) ? body.history : [];
    const uploadedText: string               = body?.uploadedText || "";
    const uploadType: string                 = body?.uploadType  || "";
    const confirmedSubject: string           = body?.confirmedSubject || "";

    if (!message) return NextResponse.json({ reply: "Please type something." });

    /* --------------------------------------------------
    TEACHER MODE
    -------------------------------------------------- */
    if (mode === "teacher") {
      if (isGreeting(message)) {
        return NextResponse.json({
          reply: `Hi ${student?.name || ""}! I'm Shauri — your AI tutor.`,
        });
      }
      const reply = await callAI(
        systemPrompt("teacher", undefined, {
          name: student?.name,
          classLevel: student?.class,
        }),
        [{ role: "user", content: message }]
      );
      return NextResponse.json({ reply });
    }

    /* --------------------------------------------------
    EXAMINER MODE
    -------------------------------------------------- */
    if (mode === "examiner") {
      const key = getKey(student);

      const { data: existing } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("session_key", key)
        .maybeSingle();

      let session: ExamSession = existing
        ? { ...existing, answer_log: Array.isArray(existing.answer_log) ? existing.answer_log : [] }
        : {
            session_key:   key,
            status:        "IDLE",
            answer_log:    [],
            student_name:  student?.name,
            student_class: student?.class,
            student_board: student?.board,
          };

      /* ── START ── */
      if (isStart(message)) {
        const board     = student?.board || "CBSE";
        const className = student?.class || `Class ${syllabus.class}`;

        let paperPromptContent: string;
        let subjectForMeta: string;
        let isRevisionDay = false;
        let totalMarks    = 25;

        if (shauriPaper && shauriPaper.formatBlock) {
          // ── Path A: shauriPaper from planner (primary path) ──
          paperPromptContent = buildPaperPrompt(shauriPaper, student);
          subjectForMeta     = shauriPaper.primarySubject || "General";
          isRevisionDay      = shauriPaper.isRevisionDay  || false;
          totalMarks         = shauriPaper.totalMarks     || (isRevisionDay ? 50 : 25);

        } else if (confirmedSubject) {
          // ── Path B: subject confirmed via chat ──
          subjectForMeta     = confirmedSubject;
          paperPromptContent = `Generate a ${board} ${className} test paper for: ${confirmedSubject}.\n\nUse only: ${getSyllabusSummary()}\n\nTotal Marks: 25 | Time: 45 minutes`;

        } else if (uploadedText && uploadType === "syllabus") {
          // ── Path C: uploaded syllabus ──
          subjectForMeta     = "Uploaded Syllabus";
          paperPromptContent = `Generate a ${board} ${className} test paper based on this syllabus:\n\n${uploadedText}\n\nTotal Marks: 25 | Time: 45 minutes`;

        } else {
          // ── Path D: plain "start [subject]" ──
          const subjectRequest = message.replace(/^start\s*/i, "").trim();
          subjectForMeta       = subjectRequest || "General";
          paperPromptContent   = `Generate a ${board} ${className} test paper${
            subjectRequest ? ` for ${subjectRequest}` : ""
          }.\nUse only: ${getSyllabusSummary()}\n\nTotal Marks: 25 | Time: 45 minutes`;
        }

        const paper = await callAI(
          systemPrompt("examiner", undefined, {
            name:       student?.name,
            classLevel: student?.class,
          }),
          [{ role: "user", content: paperPromptContent }],
          55000
        );

        if (paper.startsWith("⚠️")) {
          return NextResponse.json({ reply: paper });
        }

        const resolvedMarks   = extractTotalMarks(paper, totalMarks);
        const resolvedSubject = extractSubjectFromPaper(paper) || subjectForMeta;
        const startTime       = Date.now();

        session = {
          ...session,
          status:          "IN_EXAM",
          question_paper:  paper,
          answer_log:      [],
          subject:         resolvedSubject,
          subject_request: subjectForMeta,
          started_at:      startTime,
          total_marks:     resolvedMarks,
          student_name:    student?.name  || session.student_name,
          student_class:   student?.class || session.student_class,
          student_board:   student?.board || session.student_board,
        };

        await supabase.from("exam_sessions").upsert(session, { onConflict: "session_key" });

        return NextResponse.json({
          startTime,
          paper,
          subject:      resolvedSubject,
          isRevisionDay,
          reply: "✅ Paper ready! It's displayed on the right. Write your answers and type **submit** when done.",
        });
      }

      /* ── SUBMIT ── */
      if (isSubmit(message)) {
        if (session.status !== "IN_EXAM" || !session.question_paper) {
          return NextResponse.json({ reply: "No active exam found. Type START to begin." });
        }
        if (session.answer_log.length === 0) {
          return NextResponse.json({
            reply: "No answers received yet. Send your answers first, then type **submit**.",
          });
        }

        const evalPrompt = [
          `Evaluate this ${session.student_board || "CBSE"} exam for: ${session.student_name || "Student"}.`,
          ``,
          `Question Paper:`,
          session.question_paper,
          ``,
          `Student's Answers:`,
          session.answer_log.join("\n"),
          ``,
          `Provide:`,
          `1. Marks obtained for each question with brief justification`,
          `2. Total marks out of ${session.total_marks || 25}`,
          `3. Percentage score`,
          `4. 2-3 key strengths`,
          `5. 2-3 specific areas to improve`,
          ``,
          `End with exactly:`,
          `"Marks Obtained: X/${session.total_marks || 25}"`,
          `"Percentage: Y%"`,
        ].join("\n");

        const evalResult = await callAI(
          systemPrompt("examiner", undefined, {
            name:       student?.name,
            classLevel: student?.class,
          }),
          [{ role: "user", content: evalPrompt }]
        );

        const marksMatch    = evalResult.match(/Marks\s+Obtained\s*[:\-]\s*(\d+)\s*\/\s*(\d+)/i);
        const pctMatch      = evalResult.match(/Percentage\s*[:\-]\s*(\d+(?:\.\d+)?)\s*%/i);
        const marksObtained = marksMatch ? parseInt(marksMatch[1]) : 0;
        const totalMarks2   = marksMatch ? parseInt(marksMatch[2]) : (session.total_marks || 25);
        const percentage    = pctMatch
          ? parseFloat(pctMatch[1])
          : totalMarks2 > 0 ? Math.round((marksObtained / totalMarks2) * 100) : 0;

        const timeTaken = session.started_at
          ? (() => {
              const s = Math.floor((Date.now() - session.started_at) / 1000);
              return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ${s % 60}s`;
            })()
          : "—";

        session = { ...session, status: "READY" };
        await supabase.from("exam_sessions").upsert(session, { onConflict: "session_key" });

        return NextResponse.json({
          examEnded:     true,
          reply:         evalResult,
          marksObtained,
          totalMarks:    totalMarks2,
          percentage,
          timeTaken,
          subject:       session.subject || session.subject_request || "General",
        });
      }

      /* ── ANSWER LOGGING ── */
      if (session.status === "IN_EXAM") {
        session = {
          ...session,
          answer_log: [...session.answer_log, `${message}`],
        };
        await supabase.from("exam_sessions").upsert(session, { onConflict: "session_key" });
        return NextResponse.json({
          reply: "✅ Answer saved. Send your next answer, or type **submit** when finished.",
        });
      }

      /* ── SUBJECT SELECTION ── */
      if (session.status === "IDLE" || session.status === "READY") {
        if (uploadedText && uploadType === "syllabus") {
          return NextResponse.json({
            reply: `📋 Syllabus uploaded successfully!\n\n**Subject detected:** ${message || "Custom Syllabus"}\n\nType **start** whenever you're ready.`,
          });
        }
        const subjectMsg   = confirmedSubject || message;
        const confirmReply = await callAI(
          systemPrompt("examiner", undefined, {
            name:       student?.name,
            classLevel: student?.class,
          }),
          [
            ...history,
            {
              role: "user",
              content: `The student wants to be tested on: ${subjectMsg}. Confirm the subject and tell them to type START when ready. ${getSyllabusSummary()}`,
            },
          ]
        );
        return NextResponse.json({ reply: confirmReply });
      }

      return NextResponse.json({ reply: "Type **start** to begin your exam." });
    }

    return NextResponse.json({ reply: "Invalid mode." });

  } catch (err) {
    console.error("CHAT ERROR:", err);
    return NextResponse.json({ reply: "Server error. Try again." });
  }
}