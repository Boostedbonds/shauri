import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const ADMIN_COOKIES = {
  access: "shauri_admin_access_token",
  refresh: "shauri_admin_refresh_token",
} as const;

type Env = {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  adminEmails: Set<string>;
};

let cachedEnv: Env | null = null;

export function getAdminEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const adminEmails = new Set(
    (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean)
  );
  if (!supabaseUrl || !anonKey || !serviceRoleKey || adminEmails.size === 0) {
    throw new Error(
      "Admin environment is incomplete. Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAILS."
    );
  }
  cachedEnv = { supabaseUrl, anonKey, serviceRoleKey, adminEmails };
  return cachedEnv;
}

export function adminJson(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status });
}

export function getAdminServerClient() {
  const env = getAdminEnv();
  return createClient(env.supabaseUrl, env.serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getAdminAnonClient() {
  const env = getAdminEnv();
  return createClient(env.supabaseUrl, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isAdminUser(user: any): boolean {
  const env = getAdminEnv();
  const role = String(user?.app_metadata?.role || user?.user_metadata?.role || "").toLowerCase();
  const email = String(user?.email || "").toLowerCase();
  return role === "admin" || role === "super_admin" || env.adminEmails.has(email);
}

export async function validateAdminSession() {
  const store = await cookies();
  const accessToken = store.get(ADMIN_COOKIES.access)?.value || "";
  const refreshToken = store.get(ADMIN_COOKIES.refresh)?.value || "";
  const svc = getAdminServerClient();

  async function validateToken(token: string) {
    if (!token) return null;
    const { data, error } = await svc.auth.getUser(token);
    if (error || !data?.user || !isAdminUser(data.user)) return null;
    return { user: data.user, accessToken: token, refreshToken };
  }

  const direct = await validateToken(accessToken);
  if (direct) return { ok: true as const, ...direct, rotated: false as const };

  if (!refreshToken) {
    return { ok: false as const, reason: "Not authenticated" };
  }

  const anon = getAdminAnonClient();
  const { data: refreshData, error: refreshError } = await anon.auth.refreshSession({
    refresh_token: refreshToken,
  });
  if (refreshError || !refreshData?.session?.access_token || !refreshData?.user) {
    return { ok: false as const, reason: "Session expired" };
  }
  if (!isAdminUser(refreshData.user)) {
    return { ok: false as const, reason: "Admin access required" };
  }

  return {
    ok: true as const,
    user: refreshData.user,
    accessToken: refreshData.session.access_token,
    refreshToken: refreshData.session.refresh_token,
    rotated: true as const,
    expiresIn: refreshData.session.expires_in || 3600,
  };
}

