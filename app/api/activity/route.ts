/**
 * app/api/activity/route.ts
 *
 * UPSERT VERSION (FINAL)
 * - No duplicates
 * - Update instead of insert
 * - Clean + build safe
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { upsertUser } from "@/app/lib/hawkeyeStore";

export const maxDuration = 60;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  let body: any;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid or too large request" },
      { status: 413 }
    );
  }

  try {
    const { student_name, subject, day, mode } = body;

    // ---------- USER TRACK ----------
    await upsertUser({
      name: String(student_name || "Student"),
      class: String(body?.class || "10"),
      testsTaken: 1,
      usageCount: 1,
      activity: "Exam attempted",
    });

    if (!student_name || !subject || !day) {
      return NextResponse.json(
        { error: "Missing student_name, subject or day" },
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
      student_name: String(student_name).trim(),
      class: String(body.class || "").trim(),
      board: String(body.board || "CBSE").trim(),
      subject: String(subject).trim(),
      day: String(day).trim(),
      mode: mode || "examiner",

      chapters: Array.isArray(body.chapters) ? body.chapters : [],
      topics: Array.isArray(body.topics) ? body.topics : [],

      time_taken_seconds: body.time_taken_seconds || 0,
      marks_obtained: body.marks_obtained ?? null,
      total_marks: body.total_marks ?? null,
      percentage: pct,
      score_percent: pct,
      score_source: body.score_source || "ai",

      evaluation_text: body.evaluation_text || null,
      feedback: body.evaluation_text || null,
      error_topics: Array.isArray(body.error_topics)
        ? body.error_topics
        : [],

      question_paper: body.question_paper || null,
      answer_sheet: body.answer_sheet || null,

      updated_at: new Date().toISOString(),
    };

    // ---------- UPSERT ----------
    const { error } = await supabase
      .from("exam_attempts")
      .upsert(row, {
        onConflict: "student_name,subject,day",
      });

    if (error) {
      console.error("[UPSERT ERROR]:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Saved successfully (insert/update)",
    });

  } catch (err: any) {
    console.error("[API ERROR]:", err.message);
    return NextResponse.json(
      { error: err.message },
      { status: 500 }
    );
  }
}