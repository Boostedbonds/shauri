import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentKey = (searchParams.get("studentKey") || "").trim();

  if (!studentKey) {
    return NextResponse.json({ error: "Missing studentKey" }, { status: 400 });
  }

  try {
    const [
      masteryRes,
      weakRes,
      timelineRes,
      pronRes,
      sessionsRes,
    ] = await Promise.all([
      supabase.from("mv_adaptive_student_mastery").select("*").eq("student_key", studentKey),
      supabase.from("mv_adaptive_weak_areas").select("*").eq("student_key", studentKey).order("event_count", { ascending: false }).limit(12),
      supabase.from("adaptive_daily_snapshots").select("*").eq("student_key", studentKey).order("snapshot_date", { ascending: true }).limit(45),
      supabase.from("oral_pronunciation_samples").select("*").eq("student_key", studentKey).order("created_at", { ascending: false }).limit(20),
      supabase.from("adaptive_sessions").select("*").eq("student_key", studentKey).order("started_at", { ascending: false }).limit(20),
    ]);

    if (masteryRes.error) throw masteryRes.error;
    if (weakRes.error) throw weakRes.error;
    if (timelineRes.error) throw timelineRes.error;
    if (pronRes.error) throw pronRes.error;
    if (sessionsRes.error) throw sessionsRes.error;

    const mastery = masteryRes.data || [];
    const weakAreas = weakRes.data || [];
    const timeline = timelineRes.data || [];
    const pronunciation = pronRes.data || [];
    const recentSessions = sessionsRes.data || [];

    const strongest = mastery.sort((a: any, b: any) => Number(b.mastery_score) - Number(a.mastery_score)).slice(0, 3);
    const weakest = weakAreas.filter((w: any) => Number(w.quality_ratio) < 0.6).slice(0, 5);

    const profileSummary = {
      strongestSkills: strongest.map((s: any) => `${s.mode}:${s.speaking_rank}`),
      weakPatterns: weakest.map((w: any) => `${w.mode}/${w.track}`),
      idealDifficulty: mastery.length ? Math.max(1, Math.min(5, Math.round((mastery.reduce((a: number, x: any) => a + Number(x.level || 1), 0) / mastery.length) / 2))) : 2,
      retentionPattern: timeline.length > 3 ? "stabilizing" : "insufficient_data",
      confidencePattern: mastery.length ? Number((mastery.reduce((a: number, x: any) => a + Number(x.confidence_score || 50), 0) / mastery.length).toFixed(1)) : 50,
    };

    return NextResponse.json({
      mastery,
      weakAreas,
      timeline,
      pronunciation,
      recentSessions,
      profileSummary,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to load insights" }, { status: 500 });
  }
}
