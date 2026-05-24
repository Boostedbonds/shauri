import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/app/lib/supabase";

function toNumber(v: unknown, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const studentKey = (searchParams.get("studentKey") || "").trim();
  const mode = (searchParams.get("mode") || "oral").trim();

  if (!studentKey) {
    return NextResponse.json({ error: "Missing studentKey" }, { status: 400 });
  }

  try {
    const [{ data: profile }, { data: sessions }, { data: pronunciation }] = await Promise.all([
      supabase
        .from("adaptive_profiles")
        .select("*")
        .eq("student_key", studentKey)
        .eq("mode", mode)
        .maybeSingle(),
      supabase
        .from("adaptive_sessions")
        .select("*")
        .eq("student_key", studentKey)
        .eq("mode", mode)
        .order("started_at", { ascending: false })
        .limit(10),
      supabase
        .from("oral_pronunciation_samples")
        .select("*")
        .eq("student_key", studentKey)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    return NextResponse.json({ profile: profile || null, sessions: sessions || [], pronunciation: pronunciation || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to fetch adaptive data" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const action = body?.action;
    const requestUserId =
      body?.session?.user?.id ||
      body?.user?.id ||
      body?.userId ||
      body?.profile?.userId ||
      null;

    if (action === "upsert_profile") {
      const p = body?.profile;
      if (!p?.studentKey || !p?.mode) {
        return NextResponse.json({ error: "Invalid profile payload" }, { status: 400 });
      }

      const row = {
        user_id: requestUserId,
        student_key: p.studentKey,
        student_name: p.studentName || "Student",
        class_level: String(p.classLevel || "10"),
        board: p.board || "CBSE",
        mode: p.mode,
        xp: toNumber(p.xp, 0),
        level: toNumber(p.level, 1),
        current_streak: toNumber(p.currentStreak, 0),
        best_streak: toNumber(p.bestStreak, 0),
        confidence_score: toNumber(p.confidenceScore, 50),
        mastery_score: toNumber(p.masteryScore, 0),
        speaking_rank: p.speakingRank || "Initiate",
        unlocked_skills: Array.isArray(p.unlockedSkills) ? p.unlockedSkills : [],
        weak_areas: Array.isArray(p.weakAreas) ? p.weakAreas : [],
        strengths: Array.isArray(p.strengths) ? p.strengths : [],
        preferences: p.preferences || {},
        last_active_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("adaptive_profiles")
        .upsert(row, { onConflict: "student_key,mode" });

      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "log_events") {
      const events = Array.isArray(body?.events) ? body.events : [];
      if (!events.length) return NextResponse.json({ ok: true, inserted: 0 });

      const rows = events.map((e: any) => ({
        student_key: e.studentKey,
        mode: e.mode || "oral",
        event_type: e.eventType || "unknown",
        track: e.track || null,
        difficulty: e.difficulty ?? null,
        confidence: e.confidence ?? null,
        payload: e.payload || {},
        created_at: e.createdAt || new Date().toISOString(),
      })).filter((r: any) => r.student_key);

      if (!rows.length) return NextResponse.json({ ok: true, inserted: 0 });
      const { error } = await supabase.from("adaptive_events").insert(rows);
      if (error) throw error;
      return NextResponse.json({ ok: true, inserted: rows.length });
    }

    if (action === "log_session") {
      const s = body?.session;
      if (!s?.studentKey || !s?.mode || !s?.track) {
        return NextResponse.json({ error: "Invalid session payload" }, { status: 400 });
      }

      const row = {
        student_key: s.studentKey,
        mode: s.mode,
        track: s.track,
        difficulty: toNumber(s.difficulty, 1),
        started_at: s.startedAt || new Date().toISOString(),
        ended_at: s.endedAt || new Date().toISOString(),
        duration_seconds: toNumber(s.durationSeconds, 0),
        xp_gained: toNumber(s.xpGained, 0),
        combo_peak: toNumber(s.comboPeak, 0),
        accuracy: s.accuracy ?? null,
        avg_response_ms: s.avgResponseMs ?? null,
        confidence_delta: s.confidenceDelta ?? null,
        performance: s.performance || {},
      };

      const { error } = await supabase.from("adaptive_sessions").insert(row);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (action === "save_pronunciation") {
      const p = body?.sample;
      if (!p?.studentKey || !p?.transcript) {
        return NextResponse.json({ error: "Invalid pronunciation payload" }, { status: 400 });
      }

      const row = {
        student_key: p.studentKey,
        topic: p.topic || null,
        transcript: p.transcript,
        expected_terms: Array.isArray(p.expectedTerms) ? p.expectedTerms : [],
        detected_terms: Array.isArray(p.detectedTerms) ? p.detectedTerms : [],
        pronunciation_score: toNumber(p.pronunciationScore, 0),
        fluency_score: toNumber(p.fluencyScore, 0),
        clarity_score: toNumber(p.clarityScore, 0),
        pacing_wpm: p.pacingWpm ?? null,
        hesitation_count: toNumber(p.hesitationCount, 0),
        feedback: p.feedback || null,
      };

      const { error } = await supabase.from("oral_pronunciation_samples").insert(row);
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Adaptive API error" }, { status: 500 });
  }
}
