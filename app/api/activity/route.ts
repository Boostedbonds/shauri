/**
 * app/api/activity/route.ts
 * POST /api/activity — insert one session row into exam_attempts
 *                      and update planner_sessions.error_log_json
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────
// App Router body size limit is set in next.config.js:
//   experimental: { serverActions: { bodySizeLimit: "100mb" } }
// The old `export const config` (Pages Router) is deprecated
// and ignored in the App Router — removed to fix the build warning.
// maxDuration is the correct individual export for App Router.
// ─────────────────────────────────────────────────────────────
export const maxDuration = 60; // seconds

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  // ── FIX: Wrap req.json() in try/catch so a too-large or
  // malformed body returns a clean JSON error instead of
  // crashing with "Unexpected token 'R', Request En..." ──
  let body: any;
  try {
    body = await req.json();
  } catch (err: any) {
    console.error("[api/activity] Failed to parse request body:", err);
    return NextResponse.json(
      { error: "Request body too large or malformed. Max size is 100mb." },
      { status: 413 }
    );
  }

  try {
    const { student_name, subject, mode } = body;

    if (!student_name || !subject) {
      return NextResponse.json(
        { error: "Missing student_name or subject" },
        { status: 400 }
      );
    }

    const pct =
      typeof body.marks_obtained === "number" &&
      typeof body.total_marks === "number" &&
      body.total_marks > 0
        ? Math.round((body.marks_obtained / body.total_marks) * 100)
        : typeof body.percentage === "number"
        ? body.percentage
        : null;

    const row = {
      student_name:       String(student_name).trim(),
      class:              String(body.class || "").trim(),
      board:              String(body.board || "CBSE").trim(),
      mode:               mode || "examiner",
      subject:            String(subject).trim(),
      chapters:           Array.isArray(body.chapters) ? body.chapters : [],
      topics:             Array.isArray(body.topics)   ? body.topics   : [],
      time_taken_seconds: typeof body.time_taken_seconds === "number" ? body.time_taken_seconds : 0,
      marks_obtained:     typeof body.marks_obtained === "number" ? body.marks_obtained : null,
      total_marks:        typeof body.total_marks     === "number" ? body.total_marks     : null,
      percentage:         pct,
      score_percent:      pct,
      score_source:       body.score_source || "none",
      evaluation_text:    body.evaluation_text || null,
      feedback:           body.evaluation_text || null,
      error_topics:       Array.isArray(body.error_topics) ? body.error_topics : [],
      ...(body.question_paper ? { question_paper: body.question_paper } : {}),
      ...(body.answer_sheet   ? { answer_sheet:   body.answer_sheet   } : {}),
    };

    const { error } = await supabase.from("exam_attempts").insert(row);
    if (error) {
      console.error("[api/activity] insert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (Array.isArray(body.error_topics) && body.error_topics.length > 0) {
      await pushErrorsToPlanner(
        String(student_name).trim(),
        String(body.class || "").trim(),
        String(subject).trim(),
        body.error_topics
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[api/activity] unexpected:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function pushErrorsToPlanner(
  name: string,
  cls: string,
  subject: string,
  errorTopics: string[]
) {
  try {
    const { data } = await supabase
      .from("planner_sessions")
      .select("id, error_log_json")
      .eq("student_name", name)
      .eq("student_class", cls)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return;

    const existing = (data.error_log_json as Record<string, string[]>) || {};
    const merged   = Array.from(new Set([...(existing[subject] || []), ...errorTopics]));

    await supabase
      .from("planner_sessions")
      .update({
        error_log_json: { ...existing, [subject]: merged },
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
  } catch (e) {
    console.error("[pushErrorsToPlanner]", e);
  }
}