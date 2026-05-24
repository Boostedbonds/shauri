import { NextResponse } from "next/server";
import { ADMIN_COOKIES, validateAdminSession } from "@/app/lib/admin-core";

export async function GET() {
  const session = await validateAdminSession();
  if (!session.ok) {
    return NextResponse.json({ ok: false, error: session.reason }, { status: 401 });
  }
  const response = NextResponse.json({
    ok: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      role: session.user.app_metadata?.role || session.user.user_metadata?.role || null,
      lastSignInAt: session.user.last_sign_in_at || null,
    },
  });
  if (session.rotated) {
    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(ADMIN_COOKIES.access, session.accessToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: session.expiresIn || 3600,
    });
    response.cookies.set(ADMIN_COOKIES.refresh, session.refreshToken, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }
  return response;
}
