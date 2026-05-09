/**
 * app/lib/knowledgeBase.ts
 * Searches Supabase knowledge_base table.
 * Called automatically by chat/route.ts before every AI response.
 */
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

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
  examRelevance: number; // 0-100
  conceptualImportance: number; // 0-100
  answerWritingRelevance: number; // 0-100
  evaluationRelevance: number; // 0-100
  syllabusRelevance: number; // 0-100
  priorityScore: number; // 0-100
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

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]{2,}/g) || []).slice(0, 800);
}

function inferDocumentType(text: string, fileName = "", tags: string[] = []): KBDocumentType {
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

function inferClassLevel(text: string, fallback: string): string {
  if (fallback && fallback !== "All") return fallback;
  const m = text.match(/\bclass\s*(6|7|8|9|10|11|12)\b/i);
  if (m) return m[1];
  return "All";
}

function inferSubject(text: string, fallback: string): string {
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

function inferTopics(text: string): string[] {
  const hay = text.toLowerCase();
  const topicHints = [
    "algebra", "trigonometry", "geometry", "carbon and its compounds", "acids bases and salts",
    "life processes", "nationalism", "resources and development", "democracy", "grammar",
    "answer writing", "competency based", "hots", "case study", "step marking", "vocabulary",
  ];
  return topicHints.filter((t) => hay.includes(t)).slice(0, 8);
}

function inferDifficulty(text: string): "foundation" | "moderate" | "advanced" {
  const hay = text.toLowerCase();
  if (/\b(hots|advanced|olympiad|challenging|higher order)\b/.test(hay)) return "advanced";
  if (/\b(basic|intro|foundation|beginner)\b/.test(hay)) return "foundation";
  return "moderate";
}

function toPriorityLabel(score: number): "critical" | "high" | "medium" | "low" {
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

function chunkText(content: string, chunkSize = 1100, overlap = 180): string[] {
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

function scoreChunk(queryTokens: string[], chunk: string): number {
  const lc = chunk.toLowerCase();
  let s = 0;
  for (const t of queryTokens) {
    if (lc.includes(t)) s += 1;
  }
  if (queryTokens.length >= 2 && lc.includes(queryTokens.slice(0, 2).join(" "))) s += 3;
  return s;
}

function scoreEntry(queryTokens: string[], entry: KBEntry, classLevel?: string): number {
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

  const syllabusBoost = Math.round(meta.syllabusRelevance / 7); // 0..14
  const evalBoost = Math.round(meta.evaluationRelevance / 12); // 0..8
  const writingBoost = Math.round(meta.answerWritingRelevance / 12); // 0..8
  const priorityBoost = Math.round(meta.priorityScore / 10); // 0..10

  return lexical + classBoost + syllabusBoost + evalBoost + writingBoost + priorityBoost;
}

/**
 * Main function: searches KB and returns top matching context for the AI.
 * Call this before every AI response in chat/route.ts
 */
export async function searchKnowledge(
  query: string,
  classLevel?: string
): Promise<KBMatch> {
  try {
    const { data, error } = await supabase
      .from("knowledge_base")
      .select("id, title, subject, class_level, content, tags, file_name, created_at")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(300);

    if (error || !data || data.length === 0) {
      return { matched: false, context: "", sources: [], score: 0 };
    }

    const queryTokens = tokenize(query);
    if (!queryTokens.length) {
      return { matched: false, context: "", sources: [], score: 0 };
    }

    const scoredEntries = data
      .map((entry: KBEntry) => {
        const meta = inferKBMetadata(entry);
        const relevanceScore = scoreEntry(queryTokens, entry, classLevel);
        return { entry, meta, relevanceScore };
      })
      .filter(({ relevanceScore }) => relevanceScore >= 4)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 10);

    if (!scoredEntries.length) {
      return { matched: false, context: "", sources: [], score: 0 };
    }

    const chunkCandidates: Array<{
      entry: KBEntry;
      meta: KBInferredMeta;
      chunk: string;
      score: number;
      idx: number;
    }> = [];

    for (const s of scoredEntries) {
      const chunks = chunkText(s.entry.content);
      chunks.forEach((chunk, idx) => {
        const chunkLex = scoreChunk(queryTokens, chunk);
        const score =
          chunkLex +
          Math.round(s.meta.syllabusRelevance / 10) +
          Math.round(s.meta.priorityScore / 12) +
          (s.meta.documentType === "Syllabus" ? 10 : 0) +
          (s.meta.documentType === "NCERT" ? 6 : 0) +
          (s.meta.documentType === "Teacher Notes" ? 4 : 0) +
          (s.meta.documentType === "Marking Scheme" ? 5 : 0) +
          (s.meta.documentType === "Topper Answer" ? 2 : 0);

        if (score >= 5) {
          chunkCandidates.push({ entry: s.entry, meta: s.meta, chunk, score, idx });
        }
      });
    }

    const rankedChunks = chunkCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    if (!rankedChunks.length) {
      return { matched: false, context: "", sources: [], score: 0 };
    }

    const contextParts = rankedChunks.map((c) => {
      return [
        `[KB: ${c.entry.title}]`,
        `Type: ${c.meta.documentType} | Subject: ${c.meta.subject} | Class: ${c.meta.classLevel} | Priority: ${c.meta.priorityLabel}`,
        `Syllabus relevance: ${c.meta.syllabusRelevance}/100 | Retrieval score: ${c.score}`,
        c.chunk.slice(0, 1500),
      ].join("\n");
    });

    const dedupSources = Array.from(new Set(rankedChunks.map((c) => c.entry.title)));

    return {
      matched: true,
      context: contextParts.join("\n\n---\n\n"),
      sources: dedupSources,
      score: rankedChunks[0].score,
      retrieval: {
        query,
        classLevel,
        topMatches: scoredEntries.slice(0, 6).map((s) => ({
          title: s.entry.title,
          subject: s.meta.subject,
          classLevel: s.meta.classLevel,
          documentType: s.meta.documentType,
          syllabusRelevance: s.meta.syllabusRelevance,
          relevanceScore: s.relevanceScore,
        })),
      },
    };
  } catch (e) {
    console.error("[KB search error]", e);
    return { matched: false, context: "", sources: [], score: 0 };
  }
}

/**
 * Add a new KB entry (used by admin upload API)
 */
export async function addKBEntry(entry: Omit<KBEntry, "id" | "created_at">): Promise<string | null> {
  const { data, error } = await supabase
    .from("knowledge_base")
    .insert({ ...entry, active: true })
    .select("id")
    .single();
  if (error) { console.error("[KB add error]", error); return null; }
  return data?.id || null;
}

/**
 * List all KB entries (admin panel)
 */
export async function listKBEntries(): Promise<KBEntry[]> {
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("id, title, subject, class_level, tags, file_name, created_at, content")
    .order("created_at", { ascending: false });
  if (error) { console.error("[KB list error]", error); return []; }
  return data || [];
}

/**
 * Delete a KB entry (admin panel)
 */
export async function deleteKBEntry(id: string): Promise<boolean> {
  const { error } = await supabase
    .from("knowledge_base")
    .update({ active: false })
    .eq("id", id);
  return !error;
}
