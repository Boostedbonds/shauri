import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIES, adminJson, getAdminAnonClient, isAdminUser } from "@/app/lib/admin-core";
import { adminLog } from "@/app/lib/admin-observability";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      adminLog("warn", "admin_login_invalid_payload");
      return adminJson(400, { error: "Email and password are required." });
    }

    const supabase = getAdminAnonClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim().toLowerCase(),
      password: String(password),
    });

    if (error || !data?.session || !data?.user) {
      adminLog("warn", "admin_login_failed_credentials", { email: String(email).toLowerCase() });
      return adminJson(401, { error: "Invalid credentials." });
    }

    if (!isAdminUser(data.user)) {
      adminLog("warn", "admin_login_forbidden_role", { email: data.user.email });
      return adminJson(403, { error: "This account is not authorized for admin access." });
    }

    const response = NextResponse.json({
      ok: true,
      user: { id: data.user.id, email: data.user.email, role: data.user.app_metadata?.role || data.user.user_metadata?.role || null },
    });

    const secure = process.env.NODE_ENV === "production";
    response.cookies.set(ADMIN_COOKIES.access, data.session.access_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: data.session.expires_in ?? 60 * 60,
    });
    response.cookies.set(ADMIN_COOKIES.refresh, data.session.refresh_token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    adminLog("info", "admin_login_success", { userId: data.user.id, email: data.user.email });
    return response;
  } catch (error: any) {
    adminLog("error", "admin_login_exception", { error: error?.message || "unknown" });
    return adminJson(500, { error: error?.message || "Failed to sign in." });
  }
}
