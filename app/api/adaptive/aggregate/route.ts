import { NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function POST() {
  try {
    const { error } = await supabase.rpc("refresh_adaptive_analytics");
    if (error) throw error;
    return NextResponse.json({ ok: true, message: "Adaptive analytics refreshed" });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message || "Refresh failed" }, { status: 500 });
  }
}
