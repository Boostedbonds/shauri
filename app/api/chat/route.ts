import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { systemPrompt } from "../../lib/prompts";
import { syllabus } from "../../lib/syllabus";

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// SHAURI PAPER TYPE
// ─────────────────────────────────────────────────────────────

type ShauriPaperData = {
  isRevisionDay: boolean;
  totalMarks: number;
  timeMinutes: number;
  primarySubject: string;
  primaryTopic: string;
  secondarySubject: string;
  secondaryTopic: string;
  writingSubject: string;
  weekCoverage?: string;
  dayNum: number;
  cycleNum: number;
  formatBlock: string;
};

// ─────────────────────────────────────────────────────────────
// INPUT VALIDATION
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// STRONG RANDOMISATION HELPERS
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// VARIETY BANKS
// ─────────────────────────────────────────────────────────────

const ENGLISH_VERBS = shuffle([
  "Explain", "Describe", "Analyse", "Compare", "Discuss",
  "Illustrate", "Evaluate", "Justify", "Summarise", "Interpret",
  "Examine", "Elaborate", "Critically analyse", "Comment on",
]);

const HINDI_VERBS = shuffle([
  "परिभाषित कीजिए", "उदाहरण दीजिए", "अंतर स्पष्ट कीजिए", "व्याख्या कीजिए",
  "उचित उदाहरण सहित समझाइए", "पहचान कीजिए", "रिक्त स्थान भरिए",
  "शुद्ध कीजिए", "वाक्य में प्रयोग कीजिए", "सही विकल्प चुनिए",
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

// ─────────────────────────────────────────────────────────────
// PARSE CUSTOM PAPER REQUIREMENTS
// NOTE: This function is NEVER called for SHAURI planner papers.
// SHAURI papers always use the shauriPaper structured object directly.
// ─────────────────────────────────────────────────────────────

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
    t.match(/chapters?\s*([\d,\-–\s]+(?:and\s*\d+)?)/) ||
    t.match(/(?:from|only|on)\s*ch(?:apter)?s?\s*([\d,\-–\s]+(?:and\s*\d+)?)/) ||
    t.match(/(?:unit|topic)s?\s*([\d,\-–\s]+(?:and\s*\d+)?)/);
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

// ─────────────────────────────────────────────────────────────
// *** FIX: CBSE-COMPLIANT MARK DISTRIBUTION ***
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// *** FIX 1: COMPLETE CLASS 10 CHAPTER DATABASE ***
// Class 9 was hardcoded but Class 10 was missing — patched below
// ─────────────────────────────────────────────────────────────

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
      "Chapter 9: Light – Reflection and Refraction (Laws of Reflection, Spherical Mirrors, Mirror Formula, Refraction, Snell's Law, Lens Formula, Power)",
      "Chapter 10: Human Eye and Colourful World (Structure of Eye, Defects: Myopia/Hypermetropia/Presbyopia, Dispersion, Scattering)",
      "Chapter 11: Electricity (Ohm's Law, Resistance, Series/Parallel Circuits, Heating Effect, Electric Power)",
      "Chapter 12: Magnetic Effects of Electric Current (Magnetic Field, Fleming's Rules, Electric Motor, Electromagnetic Induction, AC/DC, Generator)",
      "Chapter 13: Our Environment (Food Chain/Web, Ecosystem, Ozone Depletion, Waste Management)",
    ].join("\n"),
  },
  history: {
    subjectName: "Social Science – History (India and the Contemporary World II)",
    chapterList: [
      "Chapter 1: The Rise of Nationalism in Europe (French Revolution, Napoleon, Romanticism, Grimm Brothers, Zollverein, Unification of Germany & Italy, Balkan Crisis)",
      "Chapter 2: Nationalism in India (Rowlatt Act, Jallianwala Bagh, Khilafat Movement, Non-Cooperation Movement, Civil Disobedience Movement, Salt March, Round Table Conferences, Sense of Collective Belonging)",
      "Chapter 3: The Making of a Global World (Silk Routes, Food Travels, Conquest/Disease/Trade, Indentured Labour, Great Depression, Bretton Woods, Post-War Recovery)",
      "Chapter 4: The Age of Industrialisation (Proto-Industrialisation, East India Company & Weavers, Factories in Britain & India, Manchester Comes to India, Small-Scale Industries)",
      "Chapter 5: Print Culture and the Modern World (Gutenberg Press, Print in Europe, Print in India, Religious Reform, Women and Print, Print and the Poor)",
    ].join("\n"),
  },
  geography: {
    subjectName: "Social Science – Geography (Contemporary India II)",
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
    subjectName: "Social Science – Political Science / Civics (Democratic Politics II)",
    chapterList: [
      "Chapter 1: Power Sharing (Belgian & Sri Lankan Models, Forms of Power Sharing, Majoritarianism vs Accommodation)",
      "Chapter 2: Federalism (What is Federalism, India as a Federal Country, Decentralisation, Panchayati Raj)",
      "Chapter 3: Gender, Religion and Caste (Gender & Politics, Religion & Communalism, Caste & Politics)",
      "Chapter 4: Political Parties (Functions, Types, National vs Regional, Challenges, Reforms)",
      "Chapter 5: Outcomes of Democracy (Accountable/Legitimate Government, Economic Growth, Inequality, Dignity, Evaluation)",
    ].join("\n"),
  },
  economics: {
    subjectName: "Social Science – Economics (Understanding Economic Development)",
    chapterList: [
      "Chapter 1: Development (What is Development, Income and Other Goals, National Development, Sustainable Development)",
      "Chapter 2: Sectors of the Indian Economy (Primary/Secondary/Tertiary, GDP, Organised/Unorganised, MNREGA)",
      "Chapter 3: Money and Credit (Barter System, Money, Formal/Informal Credit, SHGs, Credit in India)",
      "Chapter 4: Globalisation and the Indian Economy (MNCs, FDI, WTO, Impact of Globalisation, Fair Globalisation)",
      "Chapter 5: Consumer Rights (Consumer Exploitation, Rights, COPRA, Consumer Awareness, ISI/Agmark)",
    ].join("\n"),
  },
  english: {
    subjectName: "English – First Flight & Footprints Without Feet",
    chapterList: [
      "First Flight – Prose: A Letter to God, Nelson Mandela Long Walk to Freedom, Two Stories About Flying, From the Diary of Anne Frank, Glimpses of India, Mijbil the Otter, Madam Rides the Bus, The Sermon at Benares, The Proposal (Drama)",
      "First Flight – Poetry: Dust of Snow, Fire and Ice, A Tiger in the Zoo, How to Tell Wild Animals, The Ball Poem, Amanda, Animals, The Trees, Fog, The Tale of Custard the Dragon, For Anne Gregory",
      "Footprints Without Feet: A Triumph of Surgery, The Thief's Story, The Midnight Visitor, A Question of Trust, Footprints Without Feet, The Making of a Scientist, The Necklace, Bholi, The Book That Saved the Earth",
      "Grammar: Determiners, Tenses, Modals, Active-Passive Voice, Reported Speech, Subject-Verb Agreement, Clauses",
      "Writing Skills: Formal Letter, Informal Letter, Notice, Article, Story Completion, Paragraph",
    ].join("\n"),
  },
  hindi: {
    subjectName: "Hindi – Sparsh, Sanchayan, Kshitij, Kritika",
    chapterList: [
      "Kshitij (Prose): Surdas ke Pad, Tulsidas ke Pad, Dev ke Savaiye/Kavitt, Jaishankar Prasad – Aatmakathya, Suryakant Tripathi Nirala – Utsah/At nahi rahi, Nagarjuna – Yeh Danturit Muskaan, Mangu Bai – Fasal",
      "Kshitij (Prose): Premchand – Netaji ka Chashma, Sarveshwar Dayal Saxena – Balgobin Bhagat, Anu Sinha – Lakhnavii Andaz, Mannu Bhandari – Manaviya Karuna ki Divya Chamak, Mahadevi Verma – Mera Chhota sa Niji Pustakalaya",
      "Kritika: Maa ka Anchu, George Pancham ki Naak, Saana Saana Haath Jodi, Aye Aariz Nahi, Main Kyon Likhta Hoon",
      "Grammar: Shabd-Bhed (Sangya/Sarvanaam/Visheshan/Kriya/Avyay), Sandhi-Viched, Samas, Alankar (Anupras/Rupak/Upma/Utpreksha), Vakya-Bhed, Muhavare, Lokoktiyan",
      "Writing: Patra Lekhan (Aupcharik/Anaupcharik), Anuched Lekhan, Suchna Lekhan, Sandesh Lekhan, Vigyapan",
    ].join("\n"),
  },
};

// ─────────────────────────────────────────────────────────────
// SUPABASE SESSION HELPERS
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// SYLLABUS HELPERS — now with complete Class 10 database
// ─────────────────────────────────────────────────────────────

function getChaptersForSubject(
  subjectRequest: string,
  studentClass: string
): { subjectName: string; chapterList: string } {
  const req      = subjectRequest.toLowerCase();
  const classNum = parseInt(studentClass) || 9;

  // ── FIX: Class 10 now has its own full chapter database ──
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
    // fallback for unknown subjects at Class 10
    return {
      subjectName: subjectRequest,
      chapterList: `Use the complete official NCERT Class 10 ${subjectRequest} syllabus.`,
    };
  }

  // ── Class 9 (unchanged) ──
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
        subjectName: "Social Science – History",
        chapterList: (s.social_science.history.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/geo|geography/.test(req)) {
      return {
        subjectName: "Social Science – Geography (Contemporary India I)",
        chapterList: (s.social_science.geography.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/civic|politic|democracy/.test(req)) {
      return {
        subjectName: "Social Science – Civics (Democratic Politics I)",
        chapterList: (s.social_science.civics.chapters as ChapterEntry[])
          .map((c) => `Chapter ${c.number}: ${c.name}`).join("\n"),
      };
    }
    if (/econ/.test(req)) {
      return {
        subjectName: "Social Science – Economics",
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
        subjectName: "English – Beehive",
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

  // ── Other classes — use NCERT topic hints ──
  const subjectLabel =
    /science|physics|chemistry|biology/.test(req) ? "Science" :
    /math/.test(req)                               ? "Mathematics" :
    /history/.test(req)                            ? "Social Science – History" :
    /geo|geography/.test(req)                      ? "Social Science – Geography" :
    /civic|politic|democracy/.test(req)            ? "Social Science – Civics/Political Science" :
    /econ/.test(req)                               ? "Economics" :
    /sst|social/.test(req)                         ? "Social Science" :
    /english/.test(req)                            ? "English" :
    /hindi/.test(req)                              ? "Hindi" :
    subjectRequest;

  const subjectName = `${subjectLabel} – Class ${classNum}`;
  const chapterList = [
    `[NCERT SYLLABUS — CLASS ${classNum} ${subjectLabel.toUpperCase()}]`,
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
      6:  "A Tale of Two Birds, The Friendly Mongoose, The Shepherd's Treasure, Taro's Reward, An Indian – American Woman in Space, The Wonder Called Sleep, A Pact with the Sun",
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
      6:  "वह चिड़िया जो, बचपन, नादान दोस्त, चाँद से थोड़ी सी गप्पें, अक्षरों का महत्व, पार नज़र के, साथी हाथ बढ़ाना, ऐसे-ऐसे, टिकट एल्बम, झाँसी की रानी, जो देखकर भी नहीं देखते, संसार पुस्तक है",
      7:  "हम पंछी उन्मुक्त গগন के, दादी माँ, हिमालय की बेटियाँ, कठपुतली, मिठाईवाला, रक्त और हमारा शरीर, पापा खो गए, शाम एक किसान, चिड़िया की बच्ची, अपूर्व अनुभव",
      8:  "ध्वनि, लाख की चूड़ियाँ, बस की यात्रा, दीवानों की हस्ती, चिट्ठियों की अनूठी दुनिया, भगवान के डाकिए, क्या निराश हुआ जाए, यह सबसे कठिन समय नहीं, कबीर की साखियाँ, कामचोर",
    };
    return hintMap[classNum] || `NCERT Class ${classNum} Hindi chapters`;
  }

  return `NCERT Class ${classNum} ${subject} chapters as per the official CBSE curriculum`;
}

// ─────────────────────────────────────────────────────────────
// *** FIX 2: POST-GENERATION MARKS VERIFICATION ***
// Counts actual [X mark] patterns from generated paper and warns if off
// ─────────────────────────────────────────────────────────────

function verifyPaperMarks(paper: string, expectedTotal: number): {
  verified: number;
  isOff: boolean;
  warningMsg: string;
} {
  // Match all [N mark] or [N marks] patterns
  const matches = [...paper.matchAll(/\[(\d+)\s*marks?\]/gi)];
  let sum = 0;
  for (const m of matches) sum += parseInt(m[1]);

  const tolerance = 2; // allow ±2 due to internal choice questions
  const isOff = Math.abs(sum - expectedTotal) > tolerance;

  const warningMsg = isOff
    ? `[PAPER MARKS WARNING] Expected ${expectedTotal}, counted ${sum} from question marks. Paper may be incomplete.`
    : "";

  if (isOff) {
    console.warn(warningMsg);
  }

  return { verified: sum > 0 ? sum : expectedTotal, isOff, warningMsg };
}

function parseTotalMarksFromPaper(paper: string, fallback: number = 25): number {
  const match = paper.match(/(?:maximum\s*marks?|total\s*marks?)\s*[:\-]\s*(\d+)/i);
  if (!match) {
    console.warn(`[parseTotalMarksFromPaper] Could not extract total marks — defaulting to ${fallback}.`);
    return fallback;
  }
  return parseInt(match[1]);
}

// ─────────────────────────────────────────────────────────────
// GENERAL HELPERS
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// BUILD RICH HTML EVALUATION REPORT
// ─────────────────────────────────────────────────────────────

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
        const statusIcon = q.status === "correct" ? "✓" : q.status === "partial" ? "~" : q.status === "unattempted" ? "—" : "✗";
        const rowBg = q.status === "correct" ? "#f0fff0" : q.status === "partial" ? "#fffde7" : q.status === "unattempted" ? "#f5f5f5" : "#fff0f0";
        const statusColor = q.status === "correct" ? "#27AE60" : q.status === "partial" ? "#E67E22" : q.status === "unattempted" ? "#888" : "#E74C3C";

        // ── DETAILED EXPLANATION BLOCK (new) ──
        let detailBlock = "";

        // Show marks deduction reason for partial/wrong answers
        if (q.marksDeductionReason && q.status !== "correct") {
          detailBlock += `<div style="margin-top:5px;padding:5px 8px;background:#fef9c3;border-left:3px solid #f59e0b;border-radius:0 4px 4px 0;font-size:11px;color:#78350f;">
            <strong>Why marks were deducted:</strong> ${q.marksDeductionReason}
          </div>`;
        }

        // Show the correct answer with full explanation
        if (q.correctAnswer && q.status !== "correct") {
          detailBlock += `<div style="margin-top:5px;padding:5px 8px;background:#e0f2fe;border-left:3px solid #0284c7;border-radius:0 4px 4px 0;font-size:11px;color:#0c4a6e;">
            <strong>Correct answer:</strong> ${q.correctAnswer}
          </div>`;
        }

        // Show detailed concept explanation for wrong/partial answers
        if (q.detailedExplanation && q.status !== "correct") {
          detailBlock += `<div style="margin-top:5px;padding:6px 8px;background:#f0fdf4;border-left:3px solid #16a34a;border-radius:0 4px 4px 0;font-size:11px;color:#14532d;line-height:1.6;">
            <strong>Explanation to remember:</strong> ${q.detailedExplanation}
          </div>`;
        }

        // Show key concept missed
        if (q.keyConceptMissed && q.status !== "correct") {
          detailBlock += `<div style="margin-top:5px;padding:5px 8px;background:#fdf2f8;border-left:3px solid #a21caf;border-radius:0 4px 4px 0;font-size:11px;color:#701a75;">
            <strong>Key concept to revise:</strong> ${q.keyConceptMissed}
          </div>`;
        }

        return `
          <tr style="background:${rowBg};">
            <td style="padding:8px 10px;font-weight:700;color:#333;border:1px solid #ddd;white-space:nowrap;vertical-align:top;">${q.qNum}</td>
            <td style="padding:8px 10px;color:#333;border:1px solid #ddd;vertical-align:top;">
              <div style="font-weight:600;margin-bottom:2px;">${q.topic || "—"}</div>
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
    <div style="color:#fff;font-size:22px;font-weight:700;">📋 CBSE Evaluation Report</div>
    <div style="color:#BDD7EE;font-size:14px;margin-top:4px;">${subject} &nbsp;|&nbsp; Class ${cls} &nbsp;|&nbsp; ${board}</div>
  </div>
  <div style="background:#EBF3FB;padding:12px 24px;display:flex;flex-wrap:wrap;gap:20px;border:1px solid #c8ddf0;border-top:none;">
    <span style="font-size:13px;color:#333;"><b>Student:</b> ${studentName || "—"}</span>
    <span style="font-size:13px;color:#333;"><b>Time Taken:</b> ${timeTaken}${overtime ? " ⚠️ Over limit" : ""}</span>
    <span style="font-size:13px;color:#333;"><b>Max Marks:</b> ${totalMarks}</span>
  </div>
  <div style="background:${gradeBg};border:2px solid ${gradeColor};border-radius:0 0 10px 10px;padding:18px 24px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
    <div>
      <div style="font-size:36px;font-weight:800;color:${gradeColor};">${totalObtained} <span style="font-size:20px;color:#555;">/ ${totalMarks}</span></div>
      <div style="font-size:15px;color:#555;margin-top:2px;">Marks Obtained &nbsp;•&nbsp; ${percentage}%</div>
    </div>
    <div style="text-align:center;">
      <div style="font-size:48px;font-weight:800;color:${gradeColor};">${grade}</div>
      <div style="font-size:14px;color:#555;">${gradeLabel}</div>
    </div>
  </div>
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#92400e;">
    <strong>📖 How to use this report:</strong> Every question where marks were deducted shows (1) why marks were cut, (2) the correct answer, (3) a detailed explanation to help you understand the concept, and (4) the key concept to revise. Use this to directly fix your weak areas.
  </div>
  <div style="font-size:17px;font-weight:700;color:#1F4E79;border-bottom:3px solid #1F4E79;padding-bottom:6px;margin-bottom:16px;">📊 Question-wise Breakdown with Explanations</div>
  ${sectionHtml}
  <div style="font-size:17px;font-weight:700;color:#1F4E79;border-bottom:3px solid #1F4E79;padding-bottom:6px;margin-bottom:16px;margin-top:8px;">📈 Summary</div>
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
  <div style="font-size:17px;font-weight:700;color:#1F4E79;border-bottom:3px solid #1F4E79;padding-bottom:6px;margin-bottom:16px;">💬 Examiner's Remarks</div>
  <div style="background:#fff;border-radius:8px;box-shadow:0 1px 4px rgba(0,0,0,0.08);padding:16px 20px;margin-bottom:8px;">
    <div style="margin-bottom:10px;"><span style="color:#27AE60;font-weight:700;">✦ Strengths:</span> <span style="color:#333;">${strengths || "—"}</span></div>
    <div style="margin-bottom:10px;"><span style="color:#E74C3C;font-weight:700;">✦ Weaknesses:</span> <span style="color:#333;">${weaknesses || "—"}</span></div>
    <div><span style="color:#1F4E79;font-weight:700;">✦ Study Tip:</span> <span style="color:#333;">${studyTip || "—"}</span></div>
  </div>
  <div style="text-align:center;padding:16px 0;color:#1F4E79;font-weight:700;font-size:15px;">✦ End of Evaluation Report ✦</div>
</div>`;
  } catch (e) {
    return `<pre style="font-family:monospace;white-space:pre-wrap;">${fallbackText}</pre>`;
  }
}

// ─────────────────────────────────────────────────────────────
// SYLLABUS EXTRACTION FROM UPLOAD
// ─────────────────────────────────────────────────────────────

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
- Do NOT include any commentary — output the structured list only

RAW EXTRACTED TEXT FROM UPLOAD:
──────────────────────────────────────────
${safe}
──────────────────────────────────────────
`.trim();

  const extracted = await callAI(extractionPrompt, [
    { role: "user", content: "Extract the syllabus as instructed above." },
  ]);

  const subjectMatch = extracted.match(/^SUBJECT:\s*(.+)$/im);
  const subjectName  = subjectMatch ? subjectMatch[1].trim() : "Custom Subject";

  return {
    subjectName,
    chapterList:
      `🚨 UPLOADED SYLLABUS — STRICT BOUNDARY 🚨\n` +
      `ABSOLUTE RULE: Every question on this paper must come EXCLUSIVELY from the topics listed below.\n` +
      `A topic NOT listed below does NOT exist for this exam — do NOT include it under any circumstance.\n` +
      `Do NOT use standard NCERT chapters that are absent from this list.\n\n` +
      extracted,
    raw: extracted,
  };
}

// ─────────────────────────────────────────────────────────────
// SYLLABUS UPLOAD HANDLER
// ─────────────────────────────────────────────────────────────

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
        `⚠️ Could not extract readable text from your upload.\n\n` +
        `Please try:\n` +
        `• A clearer photo with good lighting\n` +
        `• A text-based PDF (not a scanned image)\n` +
        `• Typing the subject name directly instead`,
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
    if (reqs.chapterFilter)        parts.push(reqs.chapterFilter);
    if (parts.length > 0) {
      formatConfirmation =
        `\n✅ **Format detected:** ${parts.join(" · ")}\n` +
        `The paper will be generated with these exact specifications.\n`;
    }
  }

  return NextResponse.json({
    reply:
      `📄 **Syllabus ${isOverride ? "updated" : "uploaded"} successfully!**\n\n` +
      `**Subject detected:** ${subjectName}\n\n` +
      `**Topics / Chapters found:**\n${raw}\n\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `The exam paper will be generated **strictly based on the above syllabus only**.\n` +
      formatConfirmation + `\n` +
      `✅ If this looks correct, type **start** to begin your exam.\n` +
      `✏️ If something is wrong, upload a clearer image or retype the subject name.`,
  });
}

// ─────────────────────────────────────────────────────────────
// CORE AI CALLER
// ─────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────
// EXAM TIME LIMIT
// ─────────────────────────────────────────────────────────────

const MAX_EXAM_MS = 3 * 60 * 60 * 1000;

function isOverTime(startedAt?: number): boolean {
  if (!startedAt) return false;
  return Date.now() - startedAt > MAX_EXAM_MS;
}

// ─────────────────────────────────────────────────────────────
// *** FIX 3: SHAURI PLANNER PAPER GENERATOR — ALL THREE GAPS PATCHED ***
//
// Changes from original:
// 1. TOPIC BOUNDARY injected as hard constraint in system prompt
// 2. getChaptersForSubject() now called to inject full NCERT chapter list
//    alongside the specific day topic — so LLM has both context AND a hard boundary
// 3. verifyPaperMarks() runs after generation and logs a warning if marks are off
// ─────────────────────────────────────────────────────────────

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
    weekCoverage,
    formatBlock,
  } = shauriPaper;

  const timeAllowed = formatTimeAllowed(timeMinutes);
  const seed = makeSeed();

  // Build the multi-subject label for the paper header
  const paperSubjectLabel = isRevisionDay
    ? `Multi-Subject Revision (${writingSubject} Writing)`
    : secondarySubject
      ? `${primarySubject} + ${secondarySubject} (${writingSubject} Writing)`
      : primarySubject;

  // ── FIX 2: Look up NCERT chapter context for the primary subject ──
  // This injects the full chapter list alongside the specific topic boundary
  const { chapterList: primaryChapterContext } = getChaptersForSubject(primarySubject, cls);
  const { chapterList: secondaryChapterContext } = secondarySubject
    ? getChaptersForSubject(secondarySubject, cls)
    : { chapterList: "" };

  // ── FIX 1: TOPIC BOUNDARY — hard constraint injected in system prompt ──
  // This is the most critical fix. Without this, the LLM drifts to the full chapter.
  const topicBoundaryBlock = isRevisionDay
    ? `
TOPIC BOUNDARY — WEEK REVISION (ABSOLUTE RULE):
Questions must ONLY come from the following week's topics. Do NOT go outside these topics.
Week topics covered:
${weekCoverage || "All topics from this study week"}

Each topic in the week must have at least 1-2 questions in the paper.
Distribute questions evenly across ALL listed week topics.
`.trim()
    : `
TOPIC BOUNDARY — STUDY DAY (ABSOLUTE RULE):
PRIMARY TOPIC CONSTRAINT: Every question in Sections A, B, C, D must test ONLY:
"${primaryTopic}"

Do NOT include any other concept, chapter, or topic — even if it is part of the same subject.
Example: If topic is "Euclid's Division Lemma; Ex 1.1 Q1-4" — ask ONLY about Euclid's Division Lemma
and Exercise 1.1. Do NOT ask about Fundamental Theorem, irrational numbers, or any other chapter.

${secondarySubject ? `SECONDARY TOPIC CONSTRAINT: Section B may include 1 question on:
"${secondaryTopic}" from ${secondarySubject}` : ""}

SECTION E WRITING: Must be in ${writingSubject} language only.

AUTHORISED CHAPTER CONTEXT for ${primarySubject} (Class ${cls}):
${primaryChapterContext}
${secondarySubject ? `\nAUTHORISED CHAPTER CONTEXT for ${secondarySubject} (Class ${cls}):\n${secondaryChapterContext}` : ""}
`.trim();

  // System prompt: format block + topic boundary + paper header
  const paperSystemPrompt = `
You are an official CBSE-aligned question paper setter for Class ${cls}.
${seed}

${formatBlock}

${topicBoundaryBlock}

CRITICAL RULES — READ BEFORE GENERATING:
1. Total marks MUST equal exactly ${totalMarks}. Count ALL question marks before finalising.
2. Generate ALL sections (A through E) completely — never stop early or skip a section.
3. Every section must have EXACTLY the number of questions specified in the format above.
4. Show marks for every question in [brackets].
5. Paper header must show: Maximum Marks: ${totalMarks} | Time Allowed: ${timeAllowed}
6. Output ONLY the question paper — no commentary, no preamble, nothing after the last question.
7. Each section must be clearly labelled: SECTION A, SECTION B, etc.
8. Every question with an internal choice must use the word "OR" on its own line.
`.trim();

  const paperHeaderContext = `
PAPER HEADER — output this EXACTLY at the top:
Subject       : ${paperSubjectLabel}
Class         : ${cls}
Board         : ${board}
Time Allowed  : ${timeAllowed}
Maximum Marks : ${totalMarks}
`.trim();

  const fullSystemPrompt = paperSystemPrompt + "\n\n" + paperHeaderContext;

  // User message is clean and matches the system prompt constraints
  const userMessage = isRevisionDay
    ? `Generate the complete SHAURI Revision Day test paper. Topics: ${weekCoverage || "all week topics"}. Maximum Marks: ${totalMarks}. Writing section in ${writingSubject}. Generate ALL sections A through E completely.`
    : `Generate the complete SHAURI Study Day test paper. Topic: ${primaryTopic} (${primarySubject}). ${secondarySubject ? `Secondary: ${secondaryTopic} (${secondarySubject}).` : ""} Writing in ${writingSubject}. Maximum Marks: ${totalMarks}. Generate ALL sections A through E completely.`;

  const paper = await callAI(
    fullSystemPrompt,
    [{ role: "user", content: userMessage }],
    60_000
  );

  const startTime = Date.now();

  // ── FIX 3: Verify actual marks count in generated paper ──
  const { verified: verifiedMarks, isOff, warningMsg } = verifyPaperMarks(paper, totalMarks);

  if (isOff) {
    // Log for monitoring — paper still served but with warning in console
    console.warn(`[SHAURI PAPER MARKS OFF] Expected=${totalMarks} Verified=${verifiedMarks} Subject=${paperSubjectLabel}`);
  }

  const activeSession: ExamSession = {
    session_key:     key,
    status:          "IN_EXAM",
    subject_request: primarySubject,
    subject:         paperSubjectLabel,
    question_paper:  paper,
    answer_log:      [],
    started_at:      startTime,
    total_marks:     totalMarks, // always trust shauriPaper.totalMarks, not parsed
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
  });

  return NextResponse.json({
    reply:
      `⏱️ **Exam started! Timer is running.**\n\n` +
      `📌 How to answer:\n` +
      `• Answer questions in **any order** you prefer\n` +
      `• Type answers directly in chat, OR\n` +
      `• Upload **photos / PDFs** of your handwritten answers\n` +
      `• You can send multiple messages — all will be collected\n` +
      `• When fully done, type **submit** (or **done** / **finish**)\n\n` +
      `Good luck${callName}! 💪 Give it your best.`,
    paper,
    startTime,
    isRevisionDay,
    subject: paperSubjectLabel,
  });
}

// ─────────────────────────────────────────────────────────────
// *** STRICT SUBJECT-SPECIFIC MARKING RULES ***
// Expanded and made much stricter with step-level detail
// ─────────────────────────────────────────────────────────────

function getSubjectMarkingRules(evalSubj: string): string {
  const isEnglish = /english/i.test(evalSubj);
  const isHindi   = /hindi/i.test(evalSubj);
  const isMath    = /math/i.test(evalSubj);
  const isSST     = /sst|social|history|geography|civics|economics|politics|contemporary/i.test(evalSubj);
  const isScience = /science|physics|chemistry|biology/i.test(evalSubj);

  if (isMath) return `
MATHEMATICS STRICT MARKING RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION A — MCQ & Assertion-Reason [1 mark each]:
• MCQ: Correct option letter = 1 mark. Wrong option or no option = 0. Absolutely no partial marks.
• Assertion-Reason: Award 1 mark ONLY for selecting the exact correct option (a/b/c/d). No partial.
• If student writes working for an MCQ: ignore it. Mark only on the option selected.

SECTION B — Very Short Answer [2 marks each]:
• BOTH steps must be correct for 2/2.
• Correct method + arithmetic error in final step = 1/2 (method mark).
• Wrong formula or wrong approach from the start = 0/2.
• Correct answer without ANY working shown = 0/2 (working is compulsory for 2-mark questions).
• Partially correct setup with no answer = 1/2.

SECTION C — Short Answer [3 marks each]:
• Step marking: correct setup/formula (1) + correct working/substitution (1) + correct final answer with unit (1).
• Correct method but wrong final answer due to arithmetic = 2/3.
• Correct answer without showing steps = 1/3 maximum.
• For geometry: correct construction/diagram (1) + correct proof steps (1) + correct conclusion (1).
• Unit missing in final answer: deduct 0.5 (round down to nearest integer).

SECTION D — Long Answer [5 marks each]:
• Theorem: Statement (1) + Given/To Prove/Construction (1) + Proof steps with reasons (2) + Conclusion (1).
• Numerical: Formula stated (1) + Values substituted correctly (1) + Calculation steps shown (2) + Final answer with unit (1).
• Skipping even one step = lose that step's mark.
• Correct answer without full working = maximum 2/5.
• Alternate valid methods: award full marks if method is correct and complete.

SECTION E — Case Study [4 marks each per case]:
• Sub (i) [1 mark]: Exact correct numerical answer or identification = 1. Wrong = 0. No partial.
• Sub (ii) [1 mark]: Same as above.
• Sub (iii) [2 marks]: Method (1) + Answer (1). Correct method wrong answer = 1/2.

STRICTNESS RULES:
• No marks for vague answers. "The answer is positive" is not an answer.
• Correct answer in wrong units (e.g., cm instead of m) = deduct 1 mark.
• No negative marking — minimum is always 0 per question.`;

  if (isScience) return `
SCIENCE STRICT MARKING RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION A — Objective [1 mark each]:
• MCQ: Only the exact correct option = 1. Wrong option = 0. No partial.
• Assertion-Reason: Only exact correct option = 1.
• Fill in blank: ONLY exact scientific term = 1. Synonym or approximate term = 0.
• True/False with reason: True/False (0.5) + reason (0.5). Wrong True/False = 0 even if reason is correct.

SECTION B — Very Short Answer [2 marks each]:
• Chemical equation questions: Correct reactants+products (1) + correctly balanced (1).
• Unbalanced equation = 1/2 maximum even if formula is correct.
• Definition: Must include ALL key terms from NCERT definition. Missing a key term = 1/2.
• Diagram: Must be labelled. Unlabelled diagram = 0/2. Partial labels = 1/2.
• 2 correct points = 2/2. Only 1 correct point = 1/2. 0 correct = 0.

SECTION C — Short Answer [3 marks each]:
• 3 distinct NCERT-accurate points = 3/3.
• 2 correct points = 2/3. 1 correct point = 1/3.
• Vague/general points that could apply to any topic = 0 each.
• Diagram: all key parts labelled correctly = full marks. Missing a key label = −0.5 per label, max −1.
• Chemical equation questions: correct formula (1) + balanced (1) + state symbols if asked (1).

SECTION D — Long Answer [5 marks each]:
• Introduction/definition (1) + explanation with mechanism (2) + example/diagram (1) + conclusion/significance (1).
• Numericals in Science: Formula (1) + substitution with units (1) + calculation (2) + answer with unit (1).
• Missing units = deduct 0.5 per instance.
• Diagram without labels = 0 for diagram mark.

SECTION E — Case Study [4 marks each]:
• Sub (i) [1 mark]: Exact identification from case = 1. Wrong = 0.
• Sub (ii) [1 mark]: Correct inference or connection = 1. Vague = 0.
• Sub (iii) [2 marks]: Scientific explanation (1) + correct conclusion/application (1).

STRICTNESS RULES:
• NCERT terminology is mandatory. Using wrong scientific terms = deduct marks.
• "It is important because it helps" type vague answers = 0.
• Common-sense answers without scientific backing = 0.`;

  if (isSST) return `
SOCIAL SCIENCE STRICT MARKING RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION A — Objective [1 mark each]:
• MCQ: Only exact correct option = 1. Wrong = 0.
• Assertion-Reason: Correct option = 1. Wrong = 0.
• Fill in blank: Exact correct term = 1. Close/approximate = 0.
• Match the following: Each correct pair = 1. Partial matches in a row = 0.

SECTION B — Short Answer [3 marks each]:
• Award 1 mark per distinct, NCERT-accurate, relevant point.
• Maximum 3 points = 3 marks. Must name specific events, people, dates, places.
• "The government did many things" = 0 (too vague).
• Mentioning a fact that is off-topic for the question = 0 for that point.
• Copy-paste of entire paragraph without relevance to question = 0.

SECTION C — Long Answer [5 marks each]:
• Introduction with context (1) + main body with min 3 NCERT-accurate points (2) + example/evidence (1) + conclusion (1).
• Each point in main body must be distinct — repeating same idea in different words = counts as 1 point only.
• Must answer the SPECIFIC question asked — answering a related but different question = max 2/5.

SECTION D — Source-Based [4 marks each]:
• Sub (i) [1 mark]: Correct identification directly from source text = 1. Guessing = 0.
• Sub (ii) [1 mark]: Correct inference from source = 1. Stating something not in source = 0.
• Sub (iii) [2 marks]: Source reference (1) + own knowledge extension (1). Own knowledge only without source = 1/2.

SECTION E — Map [5 marks total]:
• Each correctly marked and labelled location = 1. Location marked in wrong region = 0.
• No partial marks for map — exact location or nothing.
• Illegible label = 0.

STRICTNESS RULES:
• Must use NCERT chapter-specific facts. General knowledge answers = 0.
• Dates, specific names, and places must be accurate — "around 1800s" for a known date = 0.
• Answers must be in the context of Class 10 NCERT content only.`;

  if (isEnglish) return `
ENGLISH STRICT MARKING RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION A — Reading Comprehension [20 marks]:
• MCQ (1 mark each): Correct option only = 1. Wrong = 0. No partial.
• Short answer (1 mark each): Answer must be directly from the passage. Outside inference = 0.
• Paraphrased passage content = 1. Fabricated answer not in passage = 0.

SECTION B — Writing Skills [20 marks]:
• Format marks (1): Must include ALL required format elements (e.g., date, subject, salutation for letter). Missing even one = 0 for format.
• Content marks (2): Award 1 per relevant content point up to maximum. Irrelevant content = 0.
• Expression marks (2): Correct sentence structure + appropriate vocabulary = 2. Multiple grammar errors = 1. Incomprehensible writing = 0.
• Word limit: Significantly over/under limit (>30% deviation) = deduct 1 from expression.

SECTION C — Grammar [20 marks — 1 mark each]:
• Only the grammatically correct answer = 1. Almost-correct answers = 0.
• Spelling error that changes grammar (e.g., "there" vs "their") = 0.
• Spelling error that does NOT change grammar = deduct 0 (content accepted).
• Two answers written: mark only the first one.

SECTION D — Literature [20 marks]:
• Extract MCQ (1 mark each): Correct option = 1. Wrong = 0.
• Short answer (2 marks): Correct answer with textual reference = 2. Correct answer without reference = 1. Wrong answer = 0.
• Long answer (4 marks): Relevant argument (2) + expression/clarity (1) + textual evidence (1).
  - Answer that ignores the question = max 1/4.
  - No textual evidence = max 2/4.

STRICTNESS RULES:
• Grammar answers are binary — no partial marks.
• Writing tasks: vague/off-topic content = 0 for content marks.
• Incorrect format for formal letter/notice = always 0 for format mark.`;

  if (isHindi) return `
HINDI STRICT MARKING RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION A — Apathit Gadyansh/Kavyansh [20 marks]:
• MCQ (1 mark each): Only exact correct option = 1.
• Laghuttari prashn (1 mark each): Answer must come directly from the passage. Outside content = 0.

SECTION B — Lekhan [20 marks]:
• Patra format (1): All required elements (bhejne wale ka pata, tarikh, vishay, sambodhan, hastakshar) must be present. Even one missing = 0 for format.
• Vishay vastu / content (2): 1 per relevant, specific point. General/vague content = 0.
• Bhasha / language (2): Correct Hindi grammar + appropriate vocabulary = 2. Multiple vyakaran dosha = 1. Incomprehensible = 0.

SECTION C — Vyakaran [20 marks — 1 mark each]:
• Only the exact grammatically correct answer = 1.
• Close but wrong = 0. No partial marks for grammar.
• Two answers written = mark only the first.

SECTION D — Pathen [20 marks]:
• Extract MCQ (1 mark): Correct option = 1.
• Short answer (2 marks): Correct answer with sandarbh = 2. Correct without sandarbh = 1. Wrong = 0.
• Long answer (4 marks): Content (2) + Bhasha (1) + Sandarbh/prasang (1).

STRICTNESS RULES:
• Grammar section: binary marking — no partial marks.
• Vigyapan/Sandesh: missing required format elements = 0 for format marks.
• Hindi must be grammatically correct — English words substituted unnecessarily = deduct from Bhasha.`;

  // Default for unknown subjects
  return `
GENERAL STRICT MARKING RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION A — Objective [1 mark each]: Exact correct answer only = 1. Wrong/vague = 0. No partial.
SECTION B — Very Short Answer [2 marks]: 2 accurate points = 2. 1 point = 1. Vague = 0.
SECTION C — Short Answer [3 marks]: 3 accurate NCERT points = 3. Award 1 per distinct correct point.
SECTION D — Long Answer [5 marks]: Introduction (1) + 3 main points (2) + example (1) + conclusion (1).
SECTION E — Case Study [4 marks]: Sub(i) 1m + Sub(ii) 1m + Sub(iii) 2m. Strict — no vague answers.

UNIVERSAL STRICTNESS:
• Vague answers without specific content = 0.
• "It is important/useful/helpful" without explaining HOW = 0.
• No marks for answers that are off-topic even if they look long.`;
}

// ─────────────────────────────────────────────────────────────
// MAIN POST HANDLER
// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

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

    // ── VISION/OCR ──
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

    // ═══════════════════════════════════════════════════════════
    // TEACHER MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "teacher") {
      if (isGreeting(lower) && history.length === 0) {
        return NextResponse.json({
          reply: `Hey ${greetName}! 😊 I'm Shauri — think of me as your friendly ${board} teacher${cls ? ` for Class ${cls}` : ""}.\n\nI'm here to help you understand anything — concepts, doubts, revision, examples, you name it! What's on your mind today?`,
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
          warmReply = `Doing great, thanks for asking, ${greetName}! 😄 Ready to help you with your studies. What subject are we tackling today?`;
        } else {
          warmReply = `Appreciate you chatting, ${greetName}! 😊 I'm best when helping you learn — ask me anything from your syllabus and I'll make it super clear. What's your first question?`;
        }
        return NextResponse.json({ reply: warmReply });
      }

      if (currentIsOffTopic && totalOffTopic >= 2) {
        return NextResponse.json({
          reply: `I totally get it — sometimes you just want to chat! 😄 But I'm most useful as your study buddy, ${greetName}. Let's make the most of our time together — pick a subject and throw your toughest question at me! 💪`,
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
        /hindi|हिंदी/i.test(teacherConversationText);

      const isMathTeacher =
        !isHindiTeacher && (
          /math/i.test(bodySubject) ||
          /\b(mathematics|maths?|algebra|calculus|geometry|trigonometry|statistics|probability|polynomials?|coordinate geometry|quadrilateral|heron'?s? formula|surface area|volume|number system|linear equation|circles?|triangles?|constructions?|pythagoras|mensuration)\b/i.test(teacherConversationText)
        );

      const subjectOverride = isHindiTeacher ? "hindi" : isMathTeacher ? "mathematics" : undefined;

      const teacherSystemPrompt = name
        ? systemPrompt("teacher", subjectOverride) +
          `\n\nSTUDENT IDENTITY: The student's name is ${name}${cls ? `, Class ${cls}` : ""}${board ? `, ${board}` : ""}. Always address them as ${name} — NEVER as "Student" or "there".` +
          `\n\nRESPONSE RULES: Be concise and natural. For greetings or small talk, reply in 1-2 sentences max. Only give longer explanations when the student asks about a concept or topic. Be warm, direct, encouraging.`
        : systemPrompt("teacher", subjectOverride);

      const reply = await callAI(teacherSystemPrompt, teacherConversation);
      return NextResponse.json({ reply });
    }

    // ═══════════════════════════════════════════════════════════
    // EXAMINER MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "examiner") {
      const key = getKey(student, clsRaw);

      // ── SHAURI PLANNER PAPER — direct generation path ──
      if (shauriPaper && isStart(lower)) {
        console.log("[SHAURI] Direct paper generation triggered.", {
          totalMarks: shauriPaper.totalMarks,
          isRevisionDay: shauriPaper.isRevisionDay,
          primarySubject: shauriPaper.primarySubject,
          secondarySubject: shauriPaper.secondarySubject,
          primaryTopic: shauriPaper.primaryTopic,
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
            `📚 Welcome back${callName}! Your subject is set to **${session.subject}**.\n\n` +
            `Type **start** when you're ready to begin your exam. ⏱️ Timer starts immediately.\n\n` +
            `💡 Want a custom format? Type: "prepare 30 marks exam" or "give 20 MCQ questions"\n\n` +
            `📎 Want a different syllabus? Upload a PDF or image now to override.`,
        });
      }

      if (isGreeting(lower) && session.status === "IN_EXAM") {
        const elapsed = session.started_at ? formatDuration(Date.now() - session.started_at) : "—";
        return NextResponse.json({
          reply:
            `⏱️ Your **${session.subject}** exam is still in progress!\n\n` +
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
            `⚠️ Welcome back${callName}! Your previous evaluation hit a timeout, but your answers are all saved.\n\n` +
            `Type **submit** to retry the evaluation.`,
        });
      }

      if (isGreeting(lower) && session.status === "IDLE" && !uploadedText) {
        return NextResponse.json({
          reply:
            `Hello ${greetName}! 📋 I'm your CBSE Examiner.\n\n` +
            `Tell me the **subject** you want to be tested on:\n` +
            `Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
            `📎 **OR** upload your **syllabus as a PDF or image** and I'll generate a paper exactly based on it.\n\n` +
            `💡 You can also specify the format:\n` +
            `   • "prepare 30 marks exam for Hindi"\n` +
            `   • "give 20 MCQ questions on Science"\n` +
            `   • "1 hour Maths test"\n\n` +
            `⏱️ Your timer starts the moment you type **start**.`,
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
                `📎 Or **upload your syllabus** as a PDF or image for a custom paper.`,
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
              `⚠️ Your previous evaluation hit a timeout${callName}. Your answers are all saved.\n\n` +
              `Type **submit** to try the evaluation again.`,
          });
        }
      }

      // ── SUBMIT HANDLER — strict evaluation with detailed explanations ──
      if (isSubmit(lower) && session.status === "IN_EXAM") {
        const endTime   = Date.now();
        const overtime  = isOverTime(session.started_at);
        const timeTaken = session.started_at ? formatDuration(endTime - session.started_at) : "Unknown";

        if (session.answer_log.length === 0) {
          return NextResponse.json({
            reply: `⚠️ No answers were recorded${callName}. Please type or upload your answers before submitting.`,
          });
        }

        const fullAnswerTranscript = session.answer_log
          .map((entry, i) => `[Answer Entry ${i + 1}]\n${entry}`)
          .join("\n\n────────────────────────────────\n\n");

        const totalMarks = session.total_marks || 25;
        const evalSubj   = (session.subject || "").toLowerCase();
        const evalIsMath = /math/i.test(evalSubj);

        // ── Get strict marking rules for this subject ──
        const subjectMarkingRules = getSubjectMarkingRules(session.subject || "");

        // ── STRICT EVALUATION PROMPT — with detailed per-question explanations ──
        const evaluationPrompt = `
You are a STRICT official CBSE Board Examiner for Class ${cls}.
Subject: ${session.subject || "General"} | Board: ${board} | Maximum Marks: ${totalMarks}
${evalIsMath ? "MATH FORMATTING: Use LaTeX notation for all equations. Wrap inline math in $...$ and display math in $$...$$." : ""}
Time Taken: ${timeTaken}${overtime ? " ⚠️ SUBMITTED AFTER 3-HOUR LIMIT" : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MARKING SCHEME (STRICTLY ENFORCED):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${subjectMarkingRules}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNIVERSAL STRICT RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• No negative marking — minimum per question is 0.
• Match answers to questions by number OR topic — student may have answered out of order.
• Evaluate EVERY single question in the paper — unattempted = 0, do NOT skip any question.
• Image/PDF answers → evaluate content only, ignore handwriting quality.
• NCERT-accurate facts = full marks. Correct concept in own words = full marks.
• Partially correct answer = partial marks as specified in scheme above.
• Vague/general answer without specific content = 0 marks.
• Long answer that is off-topic = 0 marks even if it looks detailed.
${overtime ? "• Student submitted after the 3-hour limit — note this in overtime field." : ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXPLANATION REQUIREMENTS (CRITICAL — READ CAREFULLY):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
For every question where the student got PARTIAL or WRONG marks, you MUST provide ALL FOUR of:

1. "marksDeductionReason": Explain EXACTLY which part of the answer was wrong or missing and WHY marks were cut. Be specific — e.g. "Missing the balanced equation — only formula written, not balanced" or "Step 2 arithmetic error: 6÷2=4 written instead of 3".

2. "correctAnswer": The complete, model correct answer for this question as an official examiner would write it. Must be full and specific — not just "see NCERT". Include the complete answer a student should have written.

3. "detailedExplanation": Teach the concept from scratch in 2-4 sentences. Explain the underlying concept so the student understands WHY the correct answer is what it is. Use simple, clear language. This is the most important learning part.

4. "keyConceptMissed": Name the specific NCERT concept, formula, theorem, or topic the student needs to revise. Be precise — e.g. "Law of Conservation of Mass", "Sum of zeros formula: -b/a", "Rowlatt Act 1919 provisions".

For questions that are fully CORRECT: set these fields to empty strings "" — no need to explain correct answers.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
OUTPUT FORMAT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Respond ONLY with a single valid JSON object. No markdown, no explanation outside JSON:
{
  "studentName": "${name || "Student"}",
  "cls": "${cls}",
  "subject": "${session.subject || "General"}",
  "board": "${board}",
  "timeTaken": "${timeTaken}",
  "overtime": ${overtime},
  "totalMarks": ${totalMarks},
  "totalObtained": <number — must be ≤ totalMarks>,
  "percentage": <number 0-100, rounded to nearest integer>,
  "grade": "<A1|A2|B1|B2|C1|C2|D|E>",
  "gradeLabel": "<Outstanding|Excellent|Very Good|Good|Average|Satisfactory|Pass|Needs Improvement>",
  "sections": [
    {
      "name": "<Section name e.g. Section A – MCQ>",
      "maxMarks": <number>,
      "obtained": <number>,
      "questions": [
        {
          "qNum": "<e.g. Q1, Q2a, Q3(i)>",
          "topic": "<specific topic tested e.g. Euclid's Division Lemma>",
          "maxMarks": <number>,
          "obtained": <number 0 to maxMarks>,
          "status": "<correct|partial|wrong|unattempted>",
          "feedback": "<one precise sentence about this specific answer>",
          "marksDeductionReason": "<for partial/wrong: exactly what was wrong and why marks cut. For correct: empty string>",
          "correctAnswer": "<for partial/wrong: complete model answer. For correct: empty string>",
          "detailedExplanation": "<for partial/wrong: 2-4 sentence concept explanation for learning. For correct: empty string>",
          "keyConceptMissed": "<for partial/wrong: specific NCERT concept/formula/theorem to revise. For correct: empty string>"
        }
      ]
    }
  ],
  "strengths": "<specific sections and question types where student did well — be concrete>",
  "weaknesses": "<specific sections and topics where student lost marks — name the exact concepts>",
  "studyTip": "<one concrete, actionable improvement — name the specific NCERT chapter/exercise/concept to practise>"
}

Grade scale: 91-100% = A1 Outstanding | 81-90% = A2 Excellent | 71-80% = B1 Very Good | 61-70% = B2 Good | 51-60% = C1 Average | 41-50% = C2 Satisfactory | 33-40% = D Pass | <33% = E Needs Improvement

IMPORTANT: totalObtained must equal the sum of all "obtained" values across all questions. Double-check this before outputting.
        `.trim();

        await saveSession({ ...session, status: "FAILED" });

        let evalRaw: string;
        try {
          evalRaw = await callAIForEvaluation(evaluationPrompt, [
            {
              role: "user",
              content:
                `QUESTION PAPER:\n${session.question_paper}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
                `STUDENT'S COMPLETE ANSWER TRANSCRIPT (${session.answer_log.length} entries):\n` +
                `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
                fullAnswerTranscript,
            },
          ]);
        } catch (evalErr) {
          console.error("[evaluation] callAIForEvaluation threw:", evalErr);
          return NextResponse.json({
            reply: `⚠️ The evaluation timed out${callName}. Your answers are all safely saved.\n\nType **submit** to try again.`,
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
          `✅ **Evaluation complete${callName}!**\n\n` +
          `📊 **${obtained2} / ${total2}** &nbsp;(${percentage}%) &nbsp;— Grade **${grade}** ${gradeLabel}\n\n` +
          `⏱️ Time taken: ${timeTaken}${overtime ? " ⚠️ Over limit" : ""}\n\n` +
          `_Detailed report with explanations for every wrong answer is below_ 👇`;

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
            `⏰ **Time's up${callName}!** Your 3-hour exam window has closed.\n\n` +
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
                `⚠️ That looks like a **syllabus upload** but your exam is already in progress.\n\n` +
                `If you meant to upload an **answer**, please re-attach the file.\n\n` +
                `⏱️ Timer is still running. Type **submit** when done.`,
            });
          }
          parts.push(`[UPLOADED ANSWER — IMAGE/PDF]\n${uploadedText}`);
        }
        if (parts.length > 0) {
          session.answer_log.push(parts.join("\n\n"));
          await saveSession(session);
        }
        const elapsed = session.started_at ? formatDuration(Date.now() - session.started_at) : "—";
        return NextResponse.json({
          reply:
            `✅ **Answer recorded** (Entry ${session.answer_log.length})\n` +
            `⏱️ Time elapsed: **${elapsed}**\n\n` +
            `Continue answering. You can:\n` +
            `• Type more answers directly\n` +
            `• Upload photos or PDFs of handwritten answers\n` +
            `• Answer questions in any order\n\n` +
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
              `⚠️ Your exam hasn't started yet${callName} — there's nothing to submit.\n\n` +
              `Subject is set to **${session.subject}**.\n\n` +
              `Type **start** when you're ready to begin. ⏱️ Timer starts immediately.`,
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
              `✅ Got it! Paper format updated:\n` +
              `📝 ${totalDesc}${timeDesc}${typeDesc}\n\n` +
              `Subject: **${session.subject}**\n\n` +
              `Type **start** when ready. ⏱️ Timer starts immediately.`,
          });
        }
        return NextResponse.json({
          reply:
            `📚 Subject is set to **${session.subject}**.\n\n` +
            `📎 Want to use your own syllabus instead? Upload a PDF or image now.\n` +
            `💡 Want a custom format? Try: "prepare 30 marks exam" or "give 20 MCQ questions"\n\n` +
            `Type **start** when ready to begin. ⏱️ Timer starts immediately.`,
        });
      }

      if (session.status === "IDLE" && !isGreeting(lower)) {
        const looksLikeAnswer =
          message.trim().length > 40 ||
          /^\d+[.)]/m.test(message.trim()) ||
          /[।\.]{2,}/.test(message) ||
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
              const elapsed = activeSession.started_at ? formatDuration(Date.now() - activeSession.started_at) : "—";
              return NextResponse.json({
                reply:
                  `✅ **Answer recorded** (Entry ${activeSession.answer_log.length})\n` +
                  `⏱️ Time elapsed: **${elapsed}**\n\n` +
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
                `⚠️ It looks like you typed **"${message.trim()}"** — but there's no active exam session${callName}.\n\n` +
                `To get started, tell me the **subject** you want to be tested on:\n` +
                `Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
                `📎 Or **upload your syllabus** as a PDF or image for a custom paper.\n\n` +
                `Once a subject is set, type **start** to begin.`,
            });
          }
        }

        if (!message.trim()) {
          return NextResponse.json({
            reply:
              `Please tell me the **subject** you want to be tested on${callName}.\n` +
              `Options: Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
              `📎 Or **upload your syllabus** as a PDF or image for a custom paper.`,
          });
        }

        const messageReqs = parsePaperRequirements(message);
        const coreSubject = messageReqs.isCustom ? extractSubjectFromInstruction(message) : message;

        const { subjectName } = getChaptersForSubject(coreSubject, cls);
        const displaySubject = subjectName.replace(/\s*[–-]\s*Class\s*\d+$/i, "");

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
          const timeDesc    = messageReqs.timeMinutes ? ` · Time: **${formatTimeAllowed(messageReqs.timeMinutes)}**` : "";
          const typeDesc    = messageReqs.questionTypes.length > 0 ? ` · Type: **${messageReqs.questionTypes.join(" + ")}**` : "";
          const chapterDesc = messageReqs.chapterFilter ? ` · Scope: **${messageReqs.chapterFilter}**` : "";
          return NextResponse.json({
            reply:
              `📚 Got it! I'll prepare a **custom paper** for:\n` +
              `**${displaySubject} — Class ${cls}**\n\n` +
              `📝 **Paper format:**\n` +
              `   Marks: ${totalDesc}${timeDesc}${typeDesc}${chapterDesc}\n\n` +
              `Type **start** when you're ready to begin.\n` +
              `⏱️ Timer starts the moment you type start.`,
          });
        }

        return NextResponse.json({
          reply:
            `📚 Got it! I'll prepare a **strict CBSE Board question paper** for:\n` +
            `**${displaySubject} — Class ${cls}**\n\n` +
            `Paper will strictly follow the NCERT Class ${cls} syllabus chapters.\n\n` +
            `📎 **Tip:** Want a paper based on YOUR specific syllabus?\n` +
            `Upload your syllabus as a PDF or image now, before typing start.\n\n` +
            `💡 Want a custom format? Type: "prepare 30 marks exam" or "give 20 MCQ questions"\n\n` +
            `Type **start** when you're ready to begin.\n` +
            `⏱️ Timer starts the moment you type start.`,
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
            if (r.isCustom) {
              recoveredInstructions = msg;
              break;
            }
          }
        }

        if (session.syllabus_from_upload) {
          subjectName = session.subject || "Custom Subject";
          chapterList = session.syllabus_from_upload;
        } else {
          const subjectKey = session.subject_request || session.subject?.replace(/\s*[–-]\s*Class\s*\d+$/i, "") || "";
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

        // ── CUSTOM / UPLOADED SYLLABUS PAPER GENERATION ──
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
            const rangeMatch = reqs.chapterFilter.match(/(\d+)\s*[-–to]+\s*(\d+)/i);
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

          const questionPlan = buildCbseQuestionPlan(
            finalMarks,
            topicLines,
            reqs,
            isHindi,
            isMath
          );

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
              slot.marks === 2 ? "very short answer (2–3 lines)" :
              slot.marks === 3 ? "short answer (4–5 lines)" :
              slot.marks === 4 ? "short-long answer (6–8 lines)" :
              "long answer (8–10 lines)";

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
RULES:
- Question type MUST match: ${qTypeHint}
- Test ONLY the grammar concept "${slot.topic}"
- Do NOT repeat question patterns used previously
- Output ONLY the question text in Hindi. No numbering, no marks label.`
              : `You are a ${subjectName} examiner (Class ${cls} CBSE). ${paperSeed}
Topic: "${slot.topic}" | Marks: ${slot.marks} | Type: ${qTypeHint} | Difficulty: ${difficulty}
Approach: ${angle}
Style hint: "${verbStyle}"
${reqs.chapterFilter ? `Chapter scope: ${reqs.chapterFilter}` : ""}

Write EXACTLY ONE fresh, unique ${qTypeHint} question worth ${slot.marks} mark(s) on "${slot.topic}".
RULES:
- Question complexity MUST match a ${slot.marks}-mark CBSE question (${qTypeHint})
- Do NOT repeat the same question stem used in any previous question
- Do NOT add topics outside "${slot.topic}"
- Output ONLY the question text. No numbering, no marks label, no explanation.`;

            const qText = await callAI(singleQPrompt, [
              { role: "user", content: `Write one ${slot.marks}-mark ${difficulty} ${qTypeHint} question on "${slot.topic}".` }
            ]);
            const cleanQ = qText.trim().replace(/^(Q\.?\d+\.?\s*|\d+\.\s*)/i, "").trim();
            questionTexts.push(cleanQ);
          }

          const paperHeader = `Subject       : ${subjectName}
Class         : ${cls}
Board         : ${board}
Time Allowed  : ${timeAllowed}
Maximum Marks : ${finalMarks}`;

          const generalInstructions = `General Instructions:
1. All questions are compulsory.
2. Marks are indicated against each question.
3. For 1-mark questions write only the answer; for 2-mark questions write 2–3 sentences; for 3-mark questions write 4–5 sentences; for 5-mark questions write a detailed paragraph.`;

          const questionBody = questionPlan
            .map((slot, i) => `${slot.qNum}. ${questionTexts[i] || "(Question unavailable)"} [${slot.marks} mark${slot.marks > 1 ? "s" : ""}]`)
            .join("\n\n");

          const paper = `${paperHeader}\n\n${generalInstructions}\n\n${questionBody}`;
          const { verified: totalMarksOnPaper } = verifyPaperMarks(paper, finalMarks);
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
              `⏱️ **Exam started! Timer is running.**\n\n` +
              `📌 How to answer:\n` +
              `• Answer questions in **any order** you prefer\n` +
              `• Type answers directly in chat, OR\n` +
              `• Upload **photos / PDFs** of your handwritten answers\n` +
              `• You can send multiple messages — all will be collected\n` +
              `• When fully done, type **submit** (or **done** / **finish**)\n\n` +
              `Good luck${callName}! 💪 Give it your best.`,
            paper,
            startTime,
          });
        }

        // ── Standard 80-mark CBSE paper generation ──
        const englishSections = `
⚠️ CBSE 2026 FORMAT: 50% competency-based.
SECTION A — READING [20 Marks]
Q1  Unseen Passage — Factual / Discursive [10 marks]
  • (a) 5 MCQs × 1 mark = 5 marks  (b) 5 Short-answer questions × 1 mark = 5 marks
Q2  Unseen Passage — Literary / Poem extract [10 marks]
  • (a) 5 MCQs × 1 mark = 5 marks  (b) 5 Short-answer questions × 1 mark = 5 marks
SECTION B — WRITING SKILLS [20 Marks]
Q3  Descriptive Paragraph / Bio-sketch / Dialogue [5 marks]
Q4  Notice / Message / Advertisement [5 marks]
Q5  Letter Writing [5 marks]
Q6  Long Composition — Article / Speech / Story [5 marks]
SECTION C — GRAMMAR [20 Marks]
Q7  Gap Filling — Tenses / Modals / Voice [4 × 1 = 4 marks]
Q8  Editing — Error Correction [4 × 1 = 4 marks]
Q9  Omission — Missing Words [4 × 1 = 4 marks]
Q10 Sentence Reordering [4 × 1 = 4 marks]
Q11 Sentence Transformation [4 × 1 = 4 marks]
SECTION D — LITERATURE [20 Marks]
Q12 Extract-based Questions — Prose [5 marks]
Q13 Extract-based Questions — Poetry [5 marks]
Q14 Short Answer Questions — Prose & Poetry [6 marks]
Q15 Long Answer — Prose / Drama [4 marks]`.trim();

        const hindiSections = `
SECTION A — APATHIT GADYANSH / KAVYANSH [20 Marks]
Q1  Apathit Gadyansh (Unseen Prose Passage) [10 marks]
Q2  Apathit Kavyansh (Unseen Poem Extract) [10 marks]
SECTION B — LEKHAN (Writing) [20 Marks]
Q3  Patra Lekhan — औपचारिक पत्र [5 marks]
Q4  Anuched Lekhan [5 marks]
Q5  Suchna Lekhan [5 marks]
Q6  Sandesh / Vigyapan Lekhan [5 marks]
SECTION C — VYAKARAN (Grammar) [20 Marks]
Q7  Shabdalankar / Arth-bhed [4 marks]
Q8  Sandhi-Viched [4 marks]
Q9  Samas-Vigraha [4 marks]
Q10 Muhavare / Lokoktiyan [4 marks]
Q11 Vakya Bhed [4 marks]
SECTION D — PATHEN (Literature) [20 Marks]
Q12 Gadyansh-adharit prashn [5 marks]
Q13 Kavyansh-adharit prashn [5 marks]
Q14 Laghu Uttariya Prashn [6 marks]
Q15 Dirgha Uttariya Prashn [4 marks]`.trim();

        const mathSections = `
SECTION A — MCQ & Assertion-Reason [20 × 1 = 20 Marks]
Q1–Q18   MCQs [1 mark each]
Q19–Q20  Assertion-Reason [1 mark each]
SECTION B — Very Short Answer [5 × 2 = 10 Marks]
Q21–Q25  [2 marks each]
SECTION C — Short Answer [6 × 3 = 18 Marks]
Q26–Q31  [3 marks each]
SECTION D — Long Answer [4 × 5 = 20 Marks]
Q32–Q35  [5 marks each]
SECTION E — Case-Based / Competency [3 × 4 = 12 Marks]
Q36  Case Study 1 [4 marks: (i)1m + (ii)1m + (iii)2m]
Q37  Case Study 2 [4 marks]
Q38  Case Study 3 [4 marks]`.trim();

        const scienceSections = `
⚠️ CBSE 2026 FORMAT: 50% competency-based.
SECTION A — Objective [20 × 1 = 20 Marks]
Q1–Q10   MCQs [1 mark each]
Q11–Q16  Competency-based MCQs [1 mark each]
Q17–Q18  Assertion-Reason [1 mark each]
Q19–Q20  Fill in the Blanks [1 mark each]
SECTION B — Very Short Answer [5 × 2 = 10 Marks]
Q21–Q25  [2 marks each]
SECTION C — Short Answer [6 × 3 = 18 Marks]
Q26–Q31  [3 marks each]
SECTION D — Long Answer [4 × 5 = 20 Marks]
Q32–Q35  [5 marks each]
SECTION E — Case-Based [3 × 4 = 12 Marks]
Q36  Case Study — Biology [4 marks]
Q37  Case Study — Physics [4 marks]
Q38  Case Study — Chemistry [4 marks]`.trim();

        const sstSections = `
SECTION A — Objective [20 × 1 = 20 Marks]
Q1–Q16   MCQs [1 mark each]
Q17–Q18  Assertion-Reason [1 mark each]
Q19–Q20  Fill in the Blank / Match [1 mark each]
SECTION B — Short Answer Questions [6 × 3 = 18 Marks]
Q21–Q26  [3 marks each]
SECTION C — Long Answer Questions [5 × 5 = 25 Marks]
Q27–Q31  [5 marks each]
SECTION D — Source-Based [3 × 4 = 12 Marks]
Q32  Source — History [4 marks]
Q33  Source — Geography or Economics [4 marks]
Q34  Source — Civics [4 marks]
SECTION E — Map-Based Questions [2 + 3 = 5 Marks]
Q35  History Map [2 marks]
Q36  Geography Map [3 marks]`.trim();

        const standardSections = `
SECTION A — Objective Type [20 × 1 = 20 Marks]
Q1–Q16   MCQs [1 mark each]
Q17–Q18  Assertion-Reason [1 mark each]
Q19–Q20  Fill in the Blank [1 mark each]
SECTION B — Very Short Answer [5 × 2 = 10 Marks]
Q21–Q25  [2 marks each]
SECTION C — Short Answer [6 × 3 = 18 Marks]
Q26–Q31  [3 marks each]
SECTION D — Long Answer [4 × 5 = 20 Marks]
Q32–Q35  [5 marks each]
SECTION E — Case-Based [3 × 4 = 12 Marks]
Q36–Q38  [4 marks each]`.trim();

        const sectionBlocks = isMath ? mathSections
          : isEnglish ? englishSections
          : isHindi   ? hindiSections
          : isSST     ? sstSections
          : isScience ? scienceSections
          : standardSections;

        const uploadCoverageNote = hasUploadedSyllabus ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 ABSOLUTE RESTRICTION — UPLOADED SYLLABUS IS THE ONLY SOURCE 🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Every single question MUST come from a topic explicitly listed in the uploaded syllabus above.
Do NOT include any chapter, unit, or concept absent from the uploaded list.`.trim() : "";

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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
UNIQUENESS MANDATE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This paper MUST be completely different from any previously generated paper.
The seed above is unique — use it as your creative anchor.
VARIATION: MCQs use fresh scenarios. Short answers rotate verbs: ${paperVerbSet}
Difficulty: ${difficultyDistrib}

Follow the EXACT official CBSE 2024-25 paper pattern for ${subjectName} as specified below.
Output the complete question paper ONLY — no commentary, no preamble.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAPER HEADER (reproduce exactly):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Subject       : ${subjectName}
Class         : ${cls}
Board         : ${board}
Time Allowed  : 3 Hours
Maximum Marks : 80
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
General Instructions:
1. This question paper contains ${isEnglish || isHindi ? "four" : "five"} sections.
2. All questions are compulsory. Marks are indicated against each question.
3. Attempt all parts of a question together.
4. Write neat, well-structured answers.${isMath ? `
5. Show all steps clearly. Marks are awarded for method even if the final answer is wrong.
6. Use of calculator is not permitted.` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${hasUploadedSyllabus
  ? `AUTHORISED TOPICS — ALL QUESTIONS MUST COME FROM THIS LIST ONLY:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${cleanedChapterList}`
  : `AUTHORISED SYLLABUS (NCERT Class ${cls} ${subjectName}):\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n${cleanedChapterList}`
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${uploadCoverageNote ? uploadCoverageNote + "\n\n" : ""}${sectionBlocks}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FINAL QUALITY CHECKS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Generate ALL sections completely — no section may be missing or short
• Total marks MUST add up to exactly 80
• Every question must show its mark value in [brackets]
• No two questions should test the exact same concept in the same way
• Do NOT add any text after the last question
        `.trim();

        const paper = await callAI(paperPrompt, [
          {
            role: "user",
            content: `Generate a FRESH UNIQUE CBSE Board paper: ${board} Class ${cls} — ${subjectName}${hasUploadedSyllabus ? " (UPLOADED SYLLABUS — use ONLY listed topics)" : ""}. Paper seed: ${paperSeed}`,
          },
        ]);

        const { verified: totalMarksOnPaper } = verifyPaperMarks(paper, 80);
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
            `⏱️ **Exam started! Timer is running.**\n\n` +
            `📌 How to answer:\n` +
            `• Answer questions in **any order** you prefer\n` +
            `• Type answers directly in chat, OR\n` +
            `• Upload **photos / PDFs** of your handwritten answers\n` +
            `• You can send multiple messages — all will be collected\n` +
            `• When fully done, type **submit** (or **done** / **finish**)\n\n` +
            `Good luck${callName}! 💪 Give it your best.`,
          paper,
          startTime,
        });
      }

      return NextResponse.json({
        reply:
          `Please tell me the **subject** you want to be tested on${callName}.\n` +
          `Options: Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
          `📎 Or **upload your syllabus** as a PDF or image for a custom paper.`,
      });
    }

    // ═══════════════════════════════════════════════════════════
    // ORAL MODE
    // ═══════════════════════════════════════════════════════════
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
        /hindi|हिंदी/i.test(oralConversationText);
      const oralSystemPrompt = name
        ? systemPrompt("oral", isHindiOral ? "hindi" : undefined) + `\n\nSTUDENT IDENTITY: The student's name is ${name}${cls ? `, Class ${cls}` : ""}. Always use their name — never call them "Student".`
        : systemPrompt("oral", isHindiOral ? "hindi" : undefined);
      const reply = await callAI(oralSystemPrompt, oralConversation);
      return NextResponse.json({ reply });
    }

    // ═══════════════════════════════════════════════════════════
    // PRACTICE MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "practice") {
      const practiceConversationText = conversation.map((m) => m.content).join(" ");
      const isHindiPractice =
        /hindi/i.test(bodySubject) ||
        bodyLang === "hi-IN" ||
        /[\u0900-\u097F]{5,}/.test(practiceConversationText) ||
        /hindi|हिंदी/i.test(practiceConversationText);
      const isMathPractice =
        !isHindiPractice && (
          /math/i.test(bodySubject) ||
          /\b(mathematics|maths?|algebra|calculus|geometry|trigonometry|statistics|probability|polynomials?|coordinate|quadrilateral|heron|surface area|volume|number system|linear equation)\b/i.test(practiceConversationText)
        );
      const practiceOverride = isHindiPractice ? "hindi" : isMathPractice ? "mathematics" : undefined;
      const reply = await callAI(systemPrompt("practice", practiceOverride), conversation);
      return NextResponse.json({ reply });
    }

    // ═══════════════════════════════════════════════════════════
    // REVISION MODE
    // ═══════════════════════════════════════════════════════════
    if (mode === "revision") {
      const revisionConversationText = conversation.map((m) => m.content).join(" ");
      const isHindiRevision =
        /hindi/i.test(bodySubject) ||
        bodyLang === "hi-IN" ||
        /[\u0900-\u097F]{5,}/.test(revisionConversationText) ||
        /hindi|हिंदी/i.test(revisionConversationText);
      const isMathRevision =
        !isHindiRevision && (
          /math/i.test(bodySubject) ||
          /\b(mathematics|maths?|algebra|calculus|geometry|trigonometry|statistics|probability|polynomials?|coordinate|quadrilateral|heron|surface area|volume|number system|linear equation)\b/i.test(revisionConversationText)
        );
      const revisionOverride = isHindiRevision ? "hindi" : isMathRevision ? "mathematics" : undefined;
      const reply = await callAI(systemPrompt("revision", revisionOverride), conversation);
      return NextResponse.json({ reply });
    }

    // ═══════════════════════════════════════════════════════════
    // PROGRESS MODE
    // ═══════════════════════════════════════════════════════════
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
OUTPUT RULES — follow exactly, no exceptions:
- Output EXACTLY 4 lines, each starting with its emoji prefix
- No preamble, no sign-off, no extra lines whatsoever
- Every line must name a specific subject — never say "a subject"
- Be precise and blunt — no filler phrases
LINE FORMAT (output all 4, in this exact order):
💪 Strongest:  [subject] — [score]% ([grade]) — one specific reason why
⚠️  Weakest:   [subject] — [score]% — [one specific thing to fix]
📈 Trend:      [subject showing biggest positive delta, or "No improvement data yet"]
🎯 Next target: [subject closest to next grade] — [X] more marks → [next grade label]
      `.trim();
      const reply = await callAI(progressPrompt, [
        { role: "user", content: `Performance data for ${name || "the student"}:\n${dataPayload}` },
      ]);
      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode." });

  } catch (err) {
    console.error("[route.ts] Unhandled error:", err);
    return NextResponse.json(
      { reply: "Server error. Please try again." },
      { status: 500 }
    );
  }
}