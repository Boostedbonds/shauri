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

export type KBMatch = {
  matched: boolean;
  context: string;
  sources: string[];
  score: number;
};

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]{2,}/g) || []).slice(0, 300);
}

function scoreEntry(queryTokens: string[], entry: KBEntry): number {
  const haystack = [entry.title, entry.subject, entry.content, ...(entry.tags || [])]
    .join(" ").toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (haystack.includes(t)) score++;
  }
  const q = queryTokens.join(" ");
  if (entry.title.toLowerCase().includes(q)) score += 10;
  if (entry.subject.toLowerCase().includes(q)) score += 5;
  return score;
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

    // Score and rank all entries
    const scored = data
      .map((entry: KBEntry) => ({ entry, score: scoreEntry(queryTokens, entry) }))
      .filter(({ score }) => score >= 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 4); // top 4 matches

    if (scored.length === 0) {
      return { matched: false, context: "", sources: [], score: 0 };
    }

    // Build context block for AI
    const contextParts = scored.map(({ entry }) =>
      `[KB: ${entry.title} | ${entry.subject} | Class ${entry.class_level}]\n${entry.content.slice(0, 1500)}`
    );

    return {
      matched: true,
      context: contextParts.join("\n\n---\n\n"),
      sources: scored.map(({ entry }) => entry.title),
      score: scored[0].score,
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