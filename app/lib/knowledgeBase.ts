import { readDB } from "./hawkeyeStore";

export type KnowledgeMatch = {
  matched: boolean;
  context: string;
  source: string;
  score: number;
};

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]{3,}/g) || []).slice(0, 200);
}

function scoreChunk(queryTokens: string[], chunk: string): number {
  if (!chunk) return 0;
  const lc = chunk.toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (lc.includes(t)) score += 1;
  }
  return score;
}

export async function searchKnowledge(query: string): Promise<KnowledgeMatch> {
  const db = await readDB();
  const queryTokens = tokenize(query);
  if (!queryTokens.length || !db.knowledge.length) {
    return { matched: false, context: "", source: "", score: 0 };
  }

  let best: { score: number; chunk: string; source: string } = { score: 0, chunk: "", source: "" };

  for (const doc of db.knowledge) {
    for (const chunk of doc.chunks) {
      const s = scoreChunk(queryTokens, chunk);
      if (s > best.score) {
        best = { score: s, chunk, source: doc.fileName };
      }
    }
  }

  if (best.score < 2) {
    return { matched: false, context: "", source: "", score: best.score };
  }

  return {
    matched: true,
    context: best.chunk.slice(0, 2500),
    source: best.source,
    score: best.score,
  };
}
