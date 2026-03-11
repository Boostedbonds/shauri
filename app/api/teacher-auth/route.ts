import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Uses SERVICE ROLE key so we can verify tokens server-side
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Supabase client with ANON key for auth operations (signup/signin)
const supabaseAuth = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { action, email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (action === "signup") {
      const { data, error } = await supabaseAuth.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: { role: "teacher" },
        },
      });

      if (error) {
        // User already exists
        if (error.message.includes("already registered")) {
          return NextResponse.json({ error: "This email is already registered. Please sign in instead." }, { status: 400 });
        }
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Check if email confirmation is required
      const needsConfirmation = !data.session;
      return NextResponse.json({
        success: true,
        needsConfirmation,
        message: needsConfirmation
          ? "Account created! Please check your email to confirm before signing in."
          : "Account created successfully!",
        session: data.session,
        user: data.user ? { id: data.user.id, email: data.user.email } : null,
      });
    }

    if (action === "signin") {
      const { data, error } = await supabaseAuth.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          return NextResponse.json({ error: "Wrong email or password. Please try again." }, { status: 401 });
        }
        if (error.message.includes("Email not confirmed")) {
          return NextResponse.json({ error: "Please confirm your email first. Check your inbox." }, { status: 401 });
        }
        return NextResponse.json({ error: error.message }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        session: data.session,
        user: { id: data.user.id, email: data.user.email },
        accessToken: data.session?.access_token,
      });
    }

    if (action === "signout") {
      const authHeader = req.headers.get("authorization");
      const token = authHeader?.replace("Bearer ", "");
      if (token) {
        await supabaseAuth.auth.admin.signOut(token);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    console.error("[teacher-auth] Error:", err);
    return NextResponse.json({ error: "Server error. Please try again." }, { status: 500 });
  }
}