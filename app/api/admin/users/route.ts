import { NextRequest, NextResponse } from "next/server";
import { readDB, upsertUser, removeUser } from "@/app/lib/hawkeyeStore";

export async function GET() {
  const db = await readDB();
  return NextResponse.json({ users: db.users });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const name = String(body?.name || "").trim();
  const cls = String(body?.class || "").trim();
  const activity = String(body?.activity || "Active").trim();

  if (!name || !cls) {
    return NextResponse.json({ error: "Name and class are required." }, { status: 400 });
  }

  const user = await upsertUser({ name, class: cls, activity });
  return NextResponse.json({ user });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "User id is required." }, { status: 400 });
  }

  const ok = await removeUser(id);
  if (!ok) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
