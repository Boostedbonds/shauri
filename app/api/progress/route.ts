import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

// Parse "1h 2m 3s" / "2m 3s" / "45s" → total seconds
function parseTimeTaken(raw: string | number | null | undefined): number {
  if (typeof raw === "number") return raw;
  if (!raw) return 0;
  let secs = 0;
  const h = raw.match(/(\d+)\s*h/i);
  const m = raw.match(/(\d+)\s*m/i);
  const s = raw.match(/(\d+)\s*s/i);
  if (h) secs += parseInt(h[1]) * 3600;
  if (m) secs += parseInt(m[1]) * 60;
  if (s) secs += parseInt(s[1]);
  return secs;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name")?.trim() || "";
    const cls  = searchParams.get("class")?.trim() || "";

    // FIX 4: Allow query with just name OR just class (not both required)
    if (!name && !cls) {
      return NextResponse.json({ attempts: [] });
    }

    // FIX 3: Use ilike for case-insensitive matching so "test" == "Test"
    let query = supabase
      .from("exam_attempts")
      .select("*")
      .order("created_at", { ascending: true });

    if (name) query = (query as any).ilike("student_name", name);
    if (cls)  query = (query as any).ilike("class", cls);

    const { data, error } = await query;

    if (error) {
      console.error("[/api/progress] Supabase error:", error.message);
      return NextResponse.json({ error: error.message, attempts: [] }, { status: 500 });
    }

    if (!data || data.length === 0) {
      return NextResponse.json({ attempts: [] });
    }

    const attempts = data.map((d: any) => {
      // Resolve scorePercent from whichever column name Supabase returns
      const rawScore =
        d.percentage    ??
        d.score_percent ??
        d.scorePercent  ??
        d.score         ??
        null;

      const scoreNum =
        rawScore !== null && rawScore !== undefined
          ? Number(rawScore)
          : undefined;

      return {
        id:               d.id ?? d.created_at ?? String(Math.random()),
        date:             d.created_at ?? new Date().toISOString(),
        mode:             "examiner" as const,
        subject:          d.subject || "General",
        chapters:         Array.isArray(d.chapters) ? d.chapters : [],
        // FIX 1: DB stores "time_taken" as a string (e.g. "1h 2m 3s"), not "time_taken_seconds"
        timeTakenSeconds: parseTimeTaken(d.time_taken ?? d.time_taken_seconds),
        rawAnswerText:    d.evaluation_text ?? "",
        // FIX 2: Do NOT filter out rows with undefined scorePercent here —
        // include them so the frontend can show exam count even without scores.
        // undefined means the exam exists but score wasn't parsed — still valid.
        scorePercent:     scoreNum !== undefined && !isNaN(scoreNum) ? scoreNum : undefined,
        // Pass raw fields through so the frontend normaliseAttempt() has full data
        marks_obtained:   d.marks_obtained,
        total_marks:      d.total_marks,
        overtime:         d.overtime,
        student_name:     d.student_name,
        class:            d.class,
      };
    });
    // FIX 2: Removed the .filter() that was silently dropping all rows
    // when scorePercent was undefined. The frontend handles missing scores gracefully.

    return NextResponse.json({ attempts });

  } catch (err: any) {
    console.error("[/api/progress] Unhandled error:", err);
    return NextResponse.json({ error: err?.message || "Server error", attempts: [] }, { status: 500 });
  }
}