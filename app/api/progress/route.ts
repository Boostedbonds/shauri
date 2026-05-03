/**
 * app/api/progress/route.ts
 * GET /api/progress?name=Arjun&class=10
 * Reads from both exam_attempts AND activity_log
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim() || "";
  const cls  = searchParams.get("class")?.trim() || "";

  if (!name && !cls) {
    return NextResponse.json({ error: "Provide ?name= or ?class=", attempts: [] }, { status: 400 });
  }

  try {
    // 1. exam_attempts — all scored + unscored sessions
    let q = supabase
      .from("exam_attempts")
      .select(`id, created_at, student_name, class, board,
        mode, subject, chapters, topics,
        time_taken_seconds, marks_obtained, total_marks, percentage, score_percent,
        evaluation_text, feedback, score_source, error_topics, overtime, time_taken`)
      .order("created_at", { ascending: false })
      .limit(500);
    if (name) q = q.ilike("student_name", name);
    if (cls)  q = q.eq("class", cls);
    const { data: examData, error: examErr } = await q;
    if (examErr) throw examErr;

    // 2. activity_log — learn / oral / writing sessions
    let a = supabase
      .from("activity_log")
      .select("id, created_at, student_name, class, mode, subject, duration_minutes, score_source, topics, marks_obtained, total_marks, board")
      .order("created_at", { ascending: false })
      .limit(300);
    if (name) a = a.ilike("student_name", name);
    if (cls)  a = a.eq("class", cls);
    const { data: actData } = await a;

    // Normalise activity_log → same shape
    const actRows = (actData ?? []).map((r: any) => ({
      ...r,
      time_taken_seconds: (r.duration_minutes || 0) * 60,
      score_source:       r.score_source || "none",
      error_topics:       [],
      chapters:           [],
    }));

    const all = [...(examData ?? []), ...actRows]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json({ attempts: all, count: all.length });
  } catch (err: any) {
    console.error("[api/progress]", err);
    return NextResponse.json({ error: err.message, attempts: [] }, { status: 500 });
  }
}