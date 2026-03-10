import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role key — never expose to client
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const all     = searchParams.get("all") === "true";
    const name    = searchParams.get("name")    || "";
    const cls     = searchParams.get("class")   || "";
    const subject = searchParams.get("subject") || "";
    const limit   = parseInt(searchParams.get("limit") || "200");

    let query = supabase
      .from("exam_attempts")
      .select(`
        student_name,
        class,
        subject,
        percentage,
        marks_obtained,
        total_marks,
        time_taken,
        created_at,
        evaluation_text,
        chapters
      `)
      .order("created_at", { ascending: false })
      .limit(limit);

    // If not fetching all — filter by student
    if (!all) {
      if (name)    query = query.eq("student_name", name);
      if (cls)     query = query.eq("class", cls);
      if (subject) query = query.eq("subject", subject);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[progress route] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ attempts: data ?? [] });

  } catch (err: any) {
    console.error("[progress route] Unhandled:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      student_name,
      class: cls,
      subject,
      percentage,
      marks_obtained,
      total_marks,
      time_taken,
      evaluation_text,
      chapters,
    } = body;

    if (!student_name || !cls) {
      return NextResponse.json({ error: "student_name and class are required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("exam_attempts")
      .insert({
        student_name,
        class: cls,
        subject:          subject          ?? null,
        percentage:       percentage       ?? null,
        marks_obtained:   marks_obtained   ?? null,
        total_marks:      total_marks      ?? null,
        time_taken:       time_taken       ?? null,
        evaluation_text:  evaluation_text  ?? null,
        chapters:         chapters         ?? null,
        created_at:       new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[progress route POST] Supabase error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, attempt: data });

  } catch (err: any) {
    console.error("[progress route POST] Unhandled:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}