// app/api/admin/auth/login/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const ADMIN_NAME = "Dracula";
const ADMIN_CODE = "3011";
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET ?? "change-me-in-env";

export async function POST(req: Request) {
  try {
    const { name, code } = await req.json();

    const nameMatch = typeof name === "string" && name.trim().toLowerCase() === ADMIN_NAME.toLowerCase();
    const codeMatch = typeof code === "string" && code === ADMIN_CODE;

    if (!nameMatch || !codeMatch) {
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json({ ok: false, error: "Invalid name or access code." }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set("admin_session", SESSION_SECRET, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}