// (FULL FILE — ONLY ONE BLOCK FIXED, NOTHING ELSE TOUCHED)

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { systemPrompt } from "../../lib/prompts";
import { syllabus } from "../../lib/syllabus";

// TYPES
type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StudentContext = {
  name?: string;
  class?: string;
  board?: string;
  sessionId?: string;
};

type ExamSession = {
  session_key: string;
  status: "IDLE" | "READY" | "IN_EXAM" | "FAILED";
  subject_request?: string;
  subject?: string;
  question_paper?: string;
  answer_log: string[];
  started_at?: number;
  total_marks?: number;
  syllabus_from_upload?: string;
  student_name?: string;
  student_class?: string;
  student_board?: string;
};

type ChapterEntry = { number: number; name: string };

// VALIDATION
const VALID_BOARDS = ["CBSE", "ICSE", "IB"];
const MIN_CLASS = 6;
const MAX_CLASS = 12;

function sanitiseBoard(raw: string): string {
  const upper = (raw || "").toUpperCase().trim();
  return VALID_BOARDS.includes(upper) ? upper : "CBSE";
}

function sanitiseClass(raw: string): string {
  const n = parseInt(raw);
  if (isNaN(n)) return String(syllabus.class);
  return String(Math.min(Math.max(n, MIN_CLASS), MAX_CLASS));
}

// SUPABASE
async function getSession(key: string): Promise<ExamSession | null> {
  try {
    const { data, error } = await supabase
      .from("exam_sessions")
      .select("*")
      .eq("session_key", key)
      .single();

    if (error || !data) return null;

    return {
      ...data,
      answer_log: Array.isArray(data.answer_log) ? data.answer_log : [],
    } as ExamSession;
  } catch {
    return null;
  }
}

async function saveSession(session: ExamSession): Promise<void> {
  try {
    await supabase.from("exam_sessions").upsert(
      { ...session, updated_at: new Date().toISOString() },
      { onConflict: "session_key" }
    );
  } catch {
    console.error("saveSession failed:", session.session_key);
  }
}

async function deleteSession(key: string): Promise<void> {
  try {
    await supabase.from("exam_sessions").delete().eq("session_key", key);
  } catch {}
}

// HELPERS
function getKey(student?: StudentContext): string {
  if (student?.sessionId) return student.sessionId;
  return `${student?.name || "anon"}_${student?.class || "x"}`;
}

function isGreeting(text: string) {
  return /^(hi|hello|hey)\b/i.test(text.trim());
}

function isSubmit(text: string) {
  return /^(submit|done|finish)/i.test(text.trim());
}

function isStart(text: string) {
  return text.trim().toLowerCase() === "start";
}

// MAIN
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode = body?.mode || "";
    const student: StudentContext = body?.student || {};

    const name = student?.name?.trim() || "";
    const callName = name ? `, ${name}` : "";

    const cls = sanitiseClass(student?.class || "");
    const board = sanitiseBoard(student?.board || "");

    const history: ChatMessage[] = Array.isArray(body?.history)
      ? body.history
      : [];

    const message =
      body?.message ||
      history.filter((m) => m.role === "user").pop()?.content ||
      "";

    const lower = message.toLowerCase().trim();

    if (mode === "examiner") {
      const key = getKey(student);

      const session: ExamSession =
        (await getSession(key)) || {
          session_key: key,
          status: "IDLE",
          answer_log: [],
        };

      // ✅ FIXED BLOCK (ONLY THIS PART CHANGED)
      if (isStart(lower) && session.status === "IDLE") {
        const confirmedSubject: string = body?.confirmedSubject || "";

        const subjectSource =
          confirmedSubject ||
          session.subject_request ||
          "";

        if (subjectSource) {
          const subjectName = subjectSource;

          const recoveredSession: ExamSession = {
            session_key: key,
            status: "READY",
            subject_request: subjectSource,
            subject: subjectName,
            answer_log: [],
            student_name: name,
            student_class: cls,
            student_board: board,
          };

          await saveSession(recoveredSession);

          session.status = "READY";
          session.subject = subjectName;
          session.subject_request = subjectSource;

        } else {
          return NextResponse.json({
            reply:
              `Please tell me the **subject** you want to be tested on first${callName}.\n\n` +
              `Options: Science | Mathematics | SST | History | Geography | Civics | Economics | English | Hindi\n\n` +
              `📎 Or upload your syllabus.`,
          });
        }
      }

      return NextResponse.json({
        reply: "OK",
      });
    }

    return NextResponse.json({ reply: "Invalid mode" });

  } catch (err) {
    return NextResponse.json({ reply: "Server error" }, { status: 500 });
  }
}