// app/api/admin/auth/session/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("admin_session");

    const secret = process.env.ADMIN_SESSION_SECRET;

    if (!secret) {
      console.error("ADMIN_SESSION_SECRET is not set in environment variables.");
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    if (session?.value === secret) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false }, { status: 401 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}