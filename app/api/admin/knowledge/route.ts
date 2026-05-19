/**
 * app/api/admin/knowledge/route.ts
 * Supports: .txt .md .csv - direct text read
 *           .pdf .png .jpg .jpeg .webp .bmp - Gemini Vision extraction
 *           .docx .pptx .xlsx - Gemini Vision extraction (converted to base64)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { inferKBMetadata, type KBEntry } from "@/app/lib/knowledgeBase";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

function getMime(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  const map: Record<string, string> = {
    pdf:  "application/pdf",
    png:  "image/png",
    jpg:  "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    bmp:  "image/bmp",
    gif:  "image/gif",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    doc:  "application/msword",
    ppt:  "application/vnd.ms-powerpoint",
    xls:  "application/vnd.ms-excel",
  };
  return map[ext] || "application/octet-stream";
}

function isTextFile(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ["txt", "md", "csv", "text", "json", "xml", "html", "js", "ts"].includes(ext);
}

function isGeminiSupported(fileName: string): boolean {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";
  return ["pdf","png","jpg","jpeg","webp","bmp","gif","docx","pptx","xlsx","doc","ppt","xls"].includes(ext);
}

async function extractWithGemini(fileBuffer: Buffer, fileName: string): Promise<string> {
  if (!GEMINI_KEY) {
    return "[Gemini API key not configured - cannot extract content from this file type]";
  }

  const mime    = getMime(fileName);
  const b64     = fileBuffer.toString("base64");
  const ext     = fileName.split(".").pop()?.toLowerCase() || "";
  const isImage = ["png","jpg","jpeg","webp","bmp","gif"].includes(ext);

  const prompt = isImage
    ? `You are extracting educational content from this image for a CBSE/NCERT knowledge base.
Extract ALL text, diagrams descriptions, formulas, tables, and any educational content visible.
Format it clearly so it can be used as study material.
If this is a textbook page, notes, or worksheet - extract everything completely.
Output ONLY the extracted content, no preamble.`
    : `You are extracting educational content from this ${ext.toUpperCase()} document for a CBSE/NCERT knowledge base.
Extract ALL text content completely: headings, paragraphs, tables, lists, formulas, and any educational material.
Preserve the structure as much as possible using plain text formatting.
If it is a presentation, extract all slide content with slide numbers.
If it is a spreadsheet, extract all data with headers.
Output ONLY the extracted content, no preamble.`;

  const model = isImage ? "gemini-2.0-flash" : "gemini-1.5-flash";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { inline_data: { mime_type: mime, data: b64 } },
              { text: prompt },
            ],
          }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
        }),
      }
    );

    if (!res.ok) {
      const err = await res.text();
      console.error("[Gemini extract error]", err.slice(0, 300));
      return `[Extraction failed: ${res.status}. Error: ${err.slice(0, 200)}]`;
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return text.trim() || "[Gemini returned empty content]";
  } catch (e: any) {
    console.error("[Gemini extract exception]", e);
    return `[Extraction error: ${e.message}]`;
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from("knowledge_base")
    .select("id, title, subject, class_level, tags, file_name, file_type, created_at, active")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ knowledge: data || [] });
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let title = "", subject = "General", classLevel = "All";
    let content = "", tags: string[] = [], fileName = "", fileType = "text";

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      title      = String(form.get("title")       || "Untitled");
      subject    = String(form.get("subject")      || "General");
      classLevel = String(form.get("class_level")  || "All");
      tags       = String(form.get("tags") || "").split(",").map(t => t.trim()).filter(Boolean);
      const file = form.get("file") as File | null;

      if (file && file.size > 0) {
        if (file.size > MAX_UPLOAD_BYTES) {
          return NextResponse.json({ error: "File too large. Max supported size is 20MB." }, { status: 413 });
        }
        fileName = file.name;
        fileType = file.name.split(".").pop()?.toLowerCase() || "text";
        const bytes = await file.arrayBuffer();
        const buf   = Buffer.from(bytes);

        if (isTextFile(file.name)) {
          content = buf.toString("utf-8");
        } else if (isGeminiSupported(file.name)) {
          content = await extractWithGemini(buf, file.name);
        } else {
          content = `[File type .${fileType} is not yet supported for automatic extraction. Please paste the content manually.]`;
        }

        if (content.length > 60000) {
          content = content.slice(0, 60000) + "\n\n[Content truncated at 60,000 characters]";
        }
      } else {
        content = String(form.get("content") || "");
      }
    } else {
      const body = await req.json();
      title      = body.title || "Untitled";
      subject    = body.subject || "General";
      classLevel = body.class_level || "All";
      content    = body.content || "";
      tags       = Array.isArray(body.tags) ? body.tags : String(body.tags || "").split(",").map((t: string) => t.trim()).filter(Boolean);
      fileName   = body.file_name || "";
      fileType   = body.file_type || "text";
    }

    if (!content.trim()) {
      return NextResponse.json({ error: "No content could be extracted. Please paste content manually." }, { status: 400 });
    }

    const inferred = inferKBMetadata({
      id: "",
      title,
      subject,
      class_level: classLevel,
      content,
      tags,
      file_name: fileName,
      created_at: new Date().toISOString(),
    } as KBEntry);

    const finalSubject    = subject === "General" ? inferred.subject : subject;
    const finalClassLevel = classLevel === "All"  ? inferred.classLevel : classLevel;
    const autoTags = [
      inferred.documentType,
      inferred.chapter,
      ...inferred.topics,
      `difficulty:${inferred.difficulty}`,
      `priority:${inferred.priorityLabel}`,
      `syllabus:${inferred.syllabusRelevance}`,
      `eval:${inferred.evaluationRelevance}`,
      `answrite:${inferred.answerWritingRelevance}`,
    ];
    const mergedTags = Array.from(new Set([...(tags || []), ...autoTags])).slice(0, 24);

    const signature = content.slice(0, 400).replace(/\s+/g, " ").trim().toLowerCase();
    const { data: dupRows } = await supabase
      .from("knowledge_base")
      .select("id, content")
      .eq("active", true)
      .eq("title", title)
      .eq("subject", finalSubject)
      .eq("class_level", finalClassLevel)
      .limit(8);

    const duplicate = (dupRows || []).some((r: any) => {
      const existing = String(r?.content || "").slice(0, 400).replace(/\s+/g, " ").trim().toLowerCase();
      return existing && existing === signature;
    });

    if (duplicate) {
      return NextResponse.json({
        ok: true,
        duplicate: true,
        skipped: true,
        message: "Duplicate content detected and skipped.",
        inferred,
        contentLength: content.length,
      });
    }

    const { data, error } = await supabase
      .from("knowledge_base")
      .insert({
        title,
        subject: finalSubject,
        class_level: finalClassLevel,
        content,
        tags: mergedTags,
        file_name: fileName,
        file_type: fileType,
        active: true,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({
      ok: true,
      id: data?.id,
      contentLength: content.length,
      inferred,
      indexingStatus: "indexed",
    });
  } catch (e: any) {
    console.error("[KB POST error]", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const { error } = await supabase.from("knowledge_base").update({ active: false }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}