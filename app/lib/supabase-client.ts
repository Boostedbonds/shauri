// lib/supabase-client.ts
//
// FIX: Lazy singleton pattern to avoid createClient() throwing at module load time.
//
// Newer versions of @supabase/supabase-js validate the key format inside
// createClient() itself and throw "supabaseKey is required" even when a
// non-empty placeholder string is passed. This crashed the admin page with a
// client-side exception before any React code could run.
//
// Solution: never call createClient() when env vars are missing. Instead we
// return null from getSupabaseClient() and let callers guard with
// isSupabaseConfigured() before making any queries.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL  || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** True when both env vars are present and the app can talk to Supabase. */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey);
}

// Lazy singleton — createClient() is only ever called when env vars are present.
let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    console.warn(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY is not set. " +
      "Supabase calls will be skipped. Add these to your .env.local or Vercel environment variables."
    );
    return null;
  }
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseKey);
  }
  return _client;
}

/**
 * Pre-built client for convenience — may be null when env vars are absent.
 * Always check isSupabaseConfigured() or null-guard before calling methods on this.
 *
 * @example
 * if (supabaseClient) {
 *   const { data } = await supabaseClient.from("table").select("*");
 * }
 */
export const supabaseClient = getSupabaseClient();