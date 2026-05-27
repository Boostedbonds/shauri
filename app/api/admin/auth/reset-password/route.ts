// app/api/admin/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service role key — never expose this client-side
);

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: false, error: "Email is required." }, { status: 400 });
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // This is where Supabase will redirect the user after they click the link.
      // Update this to your actual admin password reset page.
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/reset-password`,
    });

    if (error) {
      console.error("Supabase reset error:", error.message);
      // Return generic success even on error to avoid email enumeration
      // (don't leak whether the email exists in your system)
    }

    // Always return ok: true so attackers can't enumerate valid emails
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Reset password route error:", err);
    return NextResponse.json({ ok: false, error: "Server error." }, { status: 500 });
  }
}