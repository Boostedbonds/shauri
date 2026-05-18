import { NextRequest, NextResponse } from "next/server";
import { readDB, upsertUser, removeUser } from "../../../../lib/db";

export async function GET() {
  const db = await readDB();
  return NextResponse.json({ users: db.users });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const user = await upsertUser({ name: body.name, class: body.class, activity: body.activity });
  return NextResponse.json({ user });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  const ok = await removeUser(id);
  return NextResponse.json({ ok });
}
