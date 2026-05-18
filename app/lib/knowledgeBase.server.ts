/**
 * app/lib/knowledgeBase.server.ts
 * Server-only — uses SUPABASE_SERVICE_ROLE_KEY.
 * Import ONLY from API routes, Server Actions, or Server Components.
 * Never import from client components or files imported by them.
 */
import "server-only";
import { createClient } from "@supabase/supabase-js";
import {
  type KBEntry,
  type KBMatch,
  inferKBMetadata,
  tokenize,
  chunkText,
  scoreChunk,
  scoreEntry,
} from "./knowledgeBase";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

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
      meta: ReturnType<typeof inferKBMetadata>;
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