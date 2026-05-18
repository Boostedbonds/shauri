/**
 * app/lib/knowledgeBase.ts
 * Pure utility functions only — NO Supabase imports.
 * Safe to import from client components.
 *
 * All DB functions (searchKnowledge, addKBEntry, listKBEntries, deleteKBEntry)
 * have been moved to knowledgeBase.server.ts — import from there in
 * server-only code (API routes, Server Actions, Server Components).
 */

export type KBEntry = {
  id: string;
  title: string;
  subject: string;
  class_level: string;
  content: string;
  tags: string[];
  file_name?: string;
  created_at: string;
};

export type KBDocumentType =
  | "Syllabus"
  | "NCERT"
  | "Notes"
  | "Sample Paper"
  | "Marking Scheme"
  | "Answer Key"
  | "Weak Area Report"
  | "Topper Answer"
  | "Teacher Notes"
  | "Formula Sheet"
  | "Chapter Explanation"
  | "CBSE Circular"
  | "General";

export type KBInferredMeta = {
  documentType: KBDocumentType;
  subject: string;
  classLevel: string;
  chapter: string;
  topics: string[];
  difficulty: "foundation" | "moderate" | "advanced";
  examRelevance: number;
  conceptualImportance: number;
  answerWritingRelevance: number;
  evaluationRelevance: number;
  syllabusRelevance: number;
  priorityScore: number;
  priorityLabel: "critical" | "high" | "medium" | "low";
};

export type KBMatch = {
  matched: boolean;
  context: string;
  sources: string[];
  score: number;
  retrieval?: {
    query: string;
    classLevel?: string;
    topMatches: Array<{
      title: string;
      subject: string;
      classLevel: string;
      documentType: KBDocumentType;
      syllabusRelevance: number;
      relevanceScore: number;
    }>;
  };
};

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]{2,}/g) || []).slice(0, 800);
}

export function inferDocumentType(text: string, fileName = "", tags: string[] = []): KBDocumentType {
  const hay = `${text} ${fileName} ${(tags || []).join(" ")}`.toLowerCase();
  if (/\b(syllabus|curriculum|learning outcomes|course structure)\b/.test(hay)) return "Syllabus";
  if (/\b(ncert|national council|chapter exercises)\b/.test(hay)) return "NCERT";
  if (/\b(marking scheme|rubric|step marking|evaluation criteria)\b/.test(hay)) return "Marking Scheme";
  if (/\b(answer key|solutions key|final answers)\b/.test(hay)) return "Answer Key";
  if (/\b(sample paper|question bank|previous year|model paper)\b/.test(hay)) return "Sample Paper";
  if (/\b(topper answer|model answer|best answer)\b/.test(hay)) return "Topper Answer";
  if (/\b(weak area|error log|mistake pattern|remediation)\b/.test(hay)) return "Weak Area Report";
  if (/\b(formula sheet|formulae|quick formulas)\b/.test(hay)) return "Formula Sheet";
  if (/\b(cbse circular|notification|official circular)\b/.test(hay)) return "CBSE Circular";
  if (/\b(teacher notes|lesson plan|faculty notes)\b/.test(hay)) return "Teacher Notes";
  if (/\b(chapter explanation|concept explanation)\b/.test(hay)) return "Chapter Explanation";
  if (/\b(notes|summary|revision)\b/.test(hay)) return "Notes";
  return "General";
}

export function inferClassLevel(text: string, fallback: string): string {
  if (fallback && fallback !== "All") return fallback;
  const m = text.match(/\bclass\s*(6|7|8|9|10|11|12)\b/i);
  if (m) return m[1];
  return "All";
}

export function inferSubject(text: string, fallback: string): string {
  if (fallback && fallback !== "General") return fallback;
  const hay = text.toLowerCase();
  if (/\b(algebra|geometry|trigonometry|mensuration|quadratic|polynomials)\b/.test(hay)) return "Mathematics";
  if (/\b(physics|force|motion|light|electricity|magnetic)\b/.test(hay)) return "Physics";
  if (/\b(chemistry|carbon|compound|acid|base|salt|reaction)\b/.test(hay)) return "Chemistry";
  if (/\b(biology|life process|cell|reproduction|genetics|ecosystem)\b/.test(hay)) return "Biology";
  if (/\b(science|ncert science)\b/.test(hay)) return "Science";
  if (/\b(history|nationalism|gandhi|world war)\b/.test(hay)) return "History";
  if (/\b(geography|resources|climate|agriculture|map work)\b/.test(hay)) return "Geography";
  if (/\b(civics|political science|democracy|constitution)\b/.test(hay)) return "Civics";
  if (/\b(economics|gdp|development|money and credit)\b/.test(hay)) return "Economics";
  if (/\b(social science|sst)\b/.test(hay)) return "SST";
  if (/\b(english|grammar|comprehension|letter writing|article writing)\b/.test(hay)) return "English";
  if (/\b(hindi|vyakaran|anuchhed|patra lekhan)\b/.test(hay)) return "Hindi";
  return "General";
}

export function inferTopics(text: string): string[] {
  const hay = text.toLowerCase();
  const topicHints = [
    "algebra", "trigonometry", "geometry", "carbon and its compounds", "acids bases and salts",
    "life processes", "nationalism", "resources and development", "democracy", "grammar",
    "answer writing", "competency based", "hots", "case study", "step marking", "vocabulary",
  ];
  return topicHints.filter((t) => hay.includes(t)).slice(0, 8);
}

export function inferDifficulty(text: string): "foundation" | "moderate" | "advanced" {
  const hay = text.toLowerCase();
  if (/\b(hots|advanced|olympiad|challenging|higher order)\b/.test(hay)) return "advanced";
  if (/\b(basic|intro|foundation|beginner)\b/.test(hay)) return "foundation";
  return "moderate";
}

export function toPriorityLabel(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 80) return "critical";
  if (score >= 65) return "high";
  if (score >= 45) return "medium";
  return "low";
}

export function inferKBMetadata(entry: KBEntry): KBInferredMeta {
  const joined = `${entry.title} ${entry.subject} ${entry.content.slice(0, 6000)} ${(entry.tags || []).join(" ")}`;
  const documentType = inferDocumentType(joined, entry.file_name, entry.tags || []);
  const subject = inferSubject(joined, entry.subject);
  const classLevel = inferClassLevel(joined, entry.class_level);
  const chapterMatch = joined.match(/\bchapter\s*([0-9]{1,2}|[ivx]+)\b/i);
  const chapter = chapterMatch ? `Chapter ${chapterMatch[1]}` : "Unknown";
  const topics = inferTopics(joined);
  const difficulty = inferDifficulty(joined);

  const syllabusRelevance = documentType === "Syllabus" ? 100 : documentType === "NCERT" ? 85 : 40;
  const evaluationRelevance = /marking scheme|evaluation|rubric|step marking/i.test(joined) ? 95 : 45;
  const answerWritingRelevance = /answer writing|model answer|topper answer|presentation|vocabulary/i.test(joined) ? 90 : 35;
  const conceptualImportance = /concept|theory|explain|derivation|chapter/i.test(joined) ? 85 : 40;
  const examRelevance = /board|cbse|sample paper|previous year|question paper/i.test(joined) ? 90 : 45;
  const priorityScore = Math.min(
    100,
    Math.round(
      syllabusRelevance * 0.35 +
      examRelevance * 0.2 +
      conceptualImportance * 0.2 +
      answerWritingRelevance * 0.15 +
      evaluationRelevance * 0.1
    )
  );

  return {
    documentType,
    subject,
    classLevel,
    chapter,
    topics,
    difficulty,
    examRelevance,
    conceptualImportance,
    answerWritingRelevance,
    evaluationRelevance,
    syllabusRelevance,
    priorityScore,
    priorityLabel: toPriorityLabel(priorityScore),
  };
}

export function chunkText(content: string, chunkSize = 1100, overlap = 180): string[] {
  if (!content) return [];
  const clean = content.replace(/\s+/g, " ").trim();
  const out: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const piece = clean.slice(i, i + chunkSize);
    out.push(piece);
    if (i + chunkSize >= clean.length) break;
    i += (chunkSize - overlap);
  }
  return out.slice(0, 120);
}

export function scoreChunk(queryTokens: string[], chunk: string): number {
  const lc = chunk.toLowerCase();
  let s = 0;
  for (const t of queryTokens) {
    if (lc.includes(t)) s += 1;
  }
  if (queryTokens.length >= 2 && lc.includes(queryTokens.slice(0, 2).join(" "))) s += 3;
  return s;
}

export function scoreEntry(queryTokens: string[], entry: KBEntry, classLevel?: string): number {
  const meta = inferKBMetadata(entry);
  const haystack = [entry.title, entry.subject, entry.content.slice(0, 6000), ...(entry.tags || [])]
    .join(" ")
    .toLowerCase();

  let lexical = 0;
  for (const t of queryTokens) {
    if (haystack.includes(t)) lexical += 1;
  }
  if (entry.title.toLowerCase().includes(queryTokens.join(" "))) lexical += 8;

  let classBoost = 0;
  if (classLevel && meta.classLevel !== "All") {
    classBoost = String(meta.classLevel) === String(classLevel) ? 10 : -4;
  }

  const syllabusBoost = Math.round(meta.syllabusRelevance / 7);
  const evalBoost = Math.round(meta.evaluationRelevance / 12);
  const writingBoost = Math.round(meta.answerWritingRelevance / 12);
  const priorityBoost = Math.round(meta.priorityScore / 10);

  return lexical + classBoost + syllabusBoost + evalBoost + writingBoost + priorityBoost;
}