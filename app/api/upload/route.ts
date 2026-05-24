import { NextRequest, NextResponse } from "next/server";
import { validateAdminSession } from "@/app/lib/admin-core";

export async function POST(req: NextRequest) {
  const session = await validateAdminSession();
  if (!session.ok) return NextResponse.json({ error: session.reason }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  const safeMime = [
    "text/plain",
    "text/markdown",
    "text/csv",
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
  ];
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 413 });
  }
  if (!safeMime.includes(file.type)) {
    return NextResponse.json({ error: `Unsupported MIME type: ${file.type}` }, { status: 415 });
  }

  const relay = new FormData();
  relay.append("title", file.name.replace(/\.[^.]+$/, ""));
  relay.append("subject", "General");
  relay.append("class_level", "All");
  relay.append("tags", "upload");
  relay.append("file", file);

  const result = await fetch(`${req.nextUrl.origin}/api/admin/knowledge`, {
    method: "POST",
    body: relay,
    headers: {
      cookie: req.headers.get("cookie") || "",
    },
  });
  const body = await result.json();
  return NextResponse.json(body, { status: result.status });
}

