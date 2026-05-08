/**
 * app/api/admin/knowledge/route.ts
 * GET  - list all KB entries
 * POST - add new KB entry (text or file upload)
 * DELETE - soft-delete KB entry
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// ── GET: list all entries ─────────────────────────────────────────────────
export async function GET() {
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("id, title, subject, class_level, tags, file_name, created_at, active")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ knowledge: data || [] });
}

// ── POST: create new entry ────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    let title = "", subject = "General", classLevel = "All", content = "", tags: string[] = [], fileName = "";

    if (contentType.includes("multipart/form-data")) {
      // File upload
      const form = await req.formData();
      title       = String(form.get("title") || "Untitled");
      subject     = String(form.get("subject") || "General");
      classLevel  = String(form.get("class_level") || "All");
      tags        = String(form.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean);
      const file  = form.get("file") as File | null;

      if (file) {
        fileName = file.name;
        content  = await file.text();
        // Truncate very large files
        if (content.length > 50000) content = content.slice(0, 50000) + "\n\n[Content truncated at 50,000 chars]";
      } else {
        content = String(form.get("content") || "");
      }
    } else {
      // JSON body
      const body = await req.json();
      title      = body.title || "Untitled";
      subject    = body.subject || "General";
      classLevel = body.class_level || "All";
      content    = body.content || "";
      tags       = Array.isArray(body.tags) ? body.tags : String(body.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean);
      fileName   = body.file_name || "";
    }

    if (!content.trim()) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("knowledge_base")
      .insert({
        title,
        subject,
        class_level: classLevel,
        content,
        tags,
        file_name: fileName,
        file_type: fileName ? (fileName.split(".").pop() || "text") : "text",
        active: true,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ── DELETE: soft-delete entry ─────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await supabase
    .from("knowledge_base")
    .update({ active: false })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}