import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";
import { systemPrompt } from "../../lib/prompts";
import { syllabus } from "../../lib/syllabus";

export const runtime = "nodejs";

/* --------------------------------------------------
TYPES
-------------------------------------------------- */

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
  student_name?: string;
  student_class?: string;
  student_board?: string;
};

/* --------------------------------------------------
HELPERS
-------------------------------------------------- */

function isGreeting(text: string) {
  return /^(hi|hello|hey|good\s*morning|good\s*evening)/i.test(text.trim());
}

function isStart(text: string) {
  return /^start/i.test(text.trim());
}

function isSubmit(text: string) {
  return /^(submit|done|finish)/i.test(text.trim());
}

function getKey(student?: StudentContext): string {
  if (student?.sessionId) return student.sessionId;
  return `${student?.name || "anon"}_${student?.class || "x"}`;
}

function getSyllabusSummary() {
  const subjectNames = Object.values(syllabus.subjects).map((entry) => entry.name);
  return `Class ${syllabus.class} subjects: ${subjectNames.join(", ")}`;
}

/* --------------------------------------------------
🔥 CORE AI CALLER WITH FALLBACK (FINAL)
-------------------------------------------------- */

async function callAI(
  sysPrompt: string,
  messages: ChatMessage[],
  timeoutMs = 30000
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return "⚠️ Missing GROQ_API_KEY.";

  async function tryModel(model: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          signal: controller.signal,
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: sysPrompt },
              ...messages,
            ],
          }),
        }
      );

      clearTimeout(timer);

      const text = await res.text();

      if (!res.ok) {
        console.error(`❌ ${model} failed:`, text);
        return null;
      }

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        return null;
      }

      const reply = data?.choices?.[0]?.message?.content;
      return reply || null;

    } catch (err) {
      clearTimeout(timer);
      return null;
    }
  }

  // PRIMARY
  let result = await tryModel("llama-3.3-70b-versatile");

  // FALLBACK
  if (!result) {
    console.log("🔁 fallback triggered");
    result = await tryModel("llama3-8b-8192");
  }

  return result || "⚠️ AI unavailable. Try again.";
}

/* --------------------------------------------------
POST HANDLER
-------------------------------------------------- */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode = body?.mode || "teacher";
    const student: StudentContext = body?.student || {};
    const message: string = (body?.message || "").trim();

    if (!message) {
      return NextResponse.json({
        reply: "Please type something.",
      });
    }

    /* --------------------------------------------------
    TEACHER MODE
    -------------------------------------------------- */

    if (mode === "teacher") {
      if (isGreeting(message)) {
        return NextResponse.json({
          reply: `Hi ${student?.name || ""}! I'm Shauri — your AI tutor.`,
        });
      }

      const reply = await callAI(
        systemPrompt("teacher"),
        [{ role: "user", content: message }]
      );

      return NextResponse.json({ reply });
    }

    /* --------------------------------------------------
    EXAMINER MODE (BASIC SAFE VERSION)
    -------------------------------------------------- */

    if (mode === "examiner") {
      const key = getKey(student);
      const { data: existing } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("session_key", key)
        .maybeSingle();

      let session: ExamSession = existing
        ? {
            ...existing,
            answer_log: Array.isArray(existing.answer_log) ? existing.answer_log : [],
          }
        : {
            session_key: key,
            status: "IDLE",
            answer_log: [],
            student_name: student?.name,
            student_class: student?.class,
            student_board: student?.board,
          };

      if (isStart(message)) {
        const subjectRequest = message.replace(/^start\s*/i, "").trim();
        const board = student?.board || "CBSE";
        const className = student?.class || `Class ${syllabus.class}`;

        const paper = await callAI(
          systemPrompt("examiner"),
          [
            {
              role: "user",
              content: `Generate a ${board} ${className} test paper${
                subjectRequest ? ` for ${subjectRequest}` : ""
              }.\nUse only this syllabus context: ${getSyllabusSummary()}`,
            },
          ]
        );

        session = {
          ...session,
          status: "IN_EXAM",
          question_paper: paper,
          answer_log: [],
          subject_request: subjectRequest || undefined,
          started_at: Date.now(),
          student_name: student?.name || session.student_name,
          student_class: student?.class || session.student_class,
          student_board: student?.board || session.student_board,
        };

        await supabase.from("exam_sessions").upsert(session, {
          onConflict: "session_key",
        });

        return NextResponse.json({
          reply: "Exam started.",
          paper,
        });
      }

      if (isSubmit(message)) {
        if (session.status !== "IN_EXAM" || !session.question_paper) {
          return NextResponse.json({
            reply: "No active exam found. Type START to begin.",
          });
        }

        if (session.answer_log.length === 0) {
          return NextResponse.json({
            reply: "No answers received yet. Send answers first, then type SUBMIT.",
          });
        }

        const evalResult = await callAI(
          systemPrompt("examiner"),
          [
            {
              role: "user",
              content: `Evaluate this exam.\n\nQuestion Paper:\n${session.question_paper}\n\nStudent Answers:\n${session.answer_log.join(
                "\n"
              )}`,
            },
          ]
        );

        session = {
          ...session,
          status: "READY",
        };
        await supabase.from("exam_sessions").upsert(session, {
          onConflict: "session_key",
        });

        return NextResponse.json({
          reply: evalResult,
        });
      }

      if (session.status === "IN_EXAM") {
        session = {
          ...session,
          answer_log: [...session.answer_log, message],
        };

        await supabase.from("exam_sessions").upsert(session, {
          onConflict: "session_key",
        });

        return NextResponse.json({
          reply: "Answer saved. Send the next answer or type SUBMIT to finish.",
        });
      }

      return NextResponse.json({
        reply: "Type START to begin exam.",
      });
    }

    return NextResponse.json({
      reply: "Invalid mode.",
    });

  } catch (err) {
    console.error("CHAT ERROR:", err);

    return NextResponse.json({
      reply: "Server error. Try again.",
    });
  }
}