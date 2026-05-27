import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export const ADMIN_COOKIES = {
  access: "shauri_admin_access_token",
  refresh: "shauri_admin_refresh_token",
  session: "admin_session", // new cookie-based session
} as const;

type Env = {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
};

let cachedEnv: Env | null = null;

export function getAdminEnv(): Env {
  if (cachedEnv) return cachedEnv;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    throw new Error(
      "Admin environment is incomplete. Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  cachedEnv = { supabaseUrl, anonKey, serviceRoleKey };
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

// ── New cookie-based session validator ────────────────────────────
export async function validateAdminSession(): Promise<
  { ok: true; reason?: undefined } | { ok: false; reason: string }
> {
  try {
    const store = await cookies();
    const session = store.get(ADMIN_COOKIES.session)?.value;
    const secret = process.env.ADMIN_SESSION_SECRET;

    if (!secret) {
      console.error("ADMIN_SESSION_SECRET is not set.");
      return { ok: false, reason: "Server misconfiguration" };
    }

    if (session === secret) {
      return { ok: true };
    }

    return { ok: false, reason: "Unauthorized" };
  } catch {
    return { ok: false, reason: "Unauthorized" };
  }
}