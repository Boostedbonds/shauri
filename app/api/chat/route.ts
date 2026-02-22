import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StudentContext = {
  name?: string;
  class?: string;
  board?: string;
};

type ExamSession = {
  status: "IDLE" | "READY" | "IN_EXAM";
  subjectRequest?: string;
  subject?: string;
  questionPaper?: string;
  answers: string[];
  startedAt?: number;
};

const examSessions = new Map<string, ExamSession>();

function getKey(student?: StudentContext) {
  return `${student?.name || "anon"}_${student?.class || "x"}`;
}

function isGreeting(text: string) {
  return /^(hi|hello|hey)\b/i.test(text);
}

function isSubmit(text: string) {
  return /^(submit|done|finish|finished)\b/i.test(text);
}

function isStart(text: string) {
  return text.trim().toLowerCase() === "start";
}

function looksLikeSubject(text: string) {
  return /math|science|history|geo|civics|english|hindi|chapter/i.test(text);
}

// ✅ THE REAL FIX: separate system prompt from conversation contents
async function callAI(systemPrompt: string, messages: ChatMessage[]) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return "AI error";

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // ✅ system prompt goes HERE — not in contents
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          // ✅ only user/assistant messages go in contents
          contents: messages
            .filter((m) => m.role !== "system")
            .map((m) => ({
              role: m.role === "assistant" ? "model" : "user",
              parts: [{ text: m.content || "" }],
            })),
        }),
      }
    );

    const data = await res.json();
    return (
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to respond."
    );
  } catch {
    return "AI server error.";
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const mode: string = body?.mode || "";
    const student: StudentContext = body?.student || {};

    const history: ChatMessage[] = Array.isArray(body?.history)
      ? body.history
      : [];

    const message: string =
      body?.message ||
      history.filter((m) => m.role === "user").pop()?.content ||
      "";

    const lower = message.toLowerCase().trim();
    const key = getKey(student);

    const conversation: ChatMessage[] = [
      ...history.slice(-6),
      { role: "user", content: message },
    ];

    /* ================= TEACHER ================= */

    if (mode === "teacher") {
      const name = student?.name || "Student";
      const cls = student?.class || "";

      if (isGreeting(lower) && history.length === 0) {
        return NextResponse.json({
          reply: `Hi ${name} 👋 What would you like to learn today?`,
        });
      }

      const systemPrompt = `
You are Shauri, a real CBSE school teacher.

Student name: ${name}
Student class: ${cls}
Board: CBSE / NCERT

STRICT RULES:
- Teach ONLY what the student asks
- MAX 4-5 lines per reply
- NO filler like "Great question!" or "Let's get started"
- NO asking "what do you want to learn" if topic is already given
- If student asks your name → say "I'm Shauri, your CBSE tutor"
- If student asks their name → say "You're ${name}, Class ${cls}"
- Start explanation immediately when a topic is given
- End with one short question to check understanding (optional)
- Stay strictly within NCERT syllabus for Class ${cls}
      `.trim();

      const reply = await callAI(systemPrompt, conversation);
      return NextResponse.json({ reply });
    }

    /* ================= EXAMINER ================= */

    if (mode === "examiner") {
      const session = examSessions.get(key) || { status: "IDLE", answers: [] };

      if (isGreeting(lower) && session.status === "IDLE") {
        return NextResponse.json({
          reply: `Hello ${student?.name || "Student"}.\nProvide subject and chapters to begin.`,
        });
      }

      if (isSubmit(lower) && session.status === "IN_EXAM") {
        const systemPrompt = `
You are a CBSE examiner evaluating a Class ${student?.class || ""} student.
Give marks per question, brief feedback, and a final score.
Be encouraging but accurate.
        `.trim();

        const evaluation = await callAI(systemPrompt, [
          {
            role: "user",
            content: `Question Paper:\n${session.questionPaper}\n\nStudent Answers:\n${session.answers.join("\n")}`,
          },
        ]);

        await supabase.from("exam_attempts").insert({
          student_name: student?.name || "",
          class: student?.class || "",
          subject: session.subject || "General",
          percentage: 60,
          created_at: new Date().toISOString(),
        });

        examSessions.delete(key);
        return NextResponse.json({ reply: evaluation });
      }

      if (session.status === "IN_EXAM") {
        session.answers.push(message);
        examSessions.set(key, session);
        return NextResponse.json({
          reply: "Answer recorded ✅ Continue or type **submit** when done.",
        });
      }

      if (looksLikeSubject(lower) && session.status === "IDLE") {
        examSessions.set(key, {
          status: "READY",
          subjectRequest: message,
          subject: message,
          answers: [],
        });
        return NextResponse.json({
          reply: `Got it! Subject: **${message}**\nType **start** when ready.`,
        });
      }

      if (isStart(lower) && session.status === "READY") {
        const systemPrompt = `
You are a strict CBSE examiner.
Generate a complete question paper only. No explanation. No extra words.
Format: Class, Subject, Time, Total Marks, then Section A / B / C with marks per question.
        `.trim();

        const paper = await callAI(systemPrompt, [
          {
            role: "user",
            content: `Class ${student?.class}, ${session.subjectRequest}`,
          },
        ]);

        examSessions.set(key, {
          status: "IN_EXAM",
          subjectRequest: session.subjectRequest,
          subject: session.subject,
          questionPaper: paper,
          answers: [],
          startedAt: Date.now(),
        });

        return NextResponse.json({ reply: paper });
      }

      return NextResponse.json({ reply: "Please provide subject and chapters." });
    }

    /* ================= ORAL ================= */

    if (mode === "oral") {
      const name = student?.name || "Student";
      const cls = student?.class || "";

      const systemPrompt = `
You are Shauri in ORAL quiz mode for ${name}, Class ${cls}, CBSE.
- Short conversational replies only
- Ask one question at a time
- Give instant feedback on answers
- Keep it encouraging and interactive
      `.trim();

      const reply = await callAI(systemPrompt, conversation);
      return NextResponse.json({ reply });
    }

    /* ================= PROGRESS ================= */

    if (mode === "progress") {
      const attempts = body?.attempts || [];

      const systemPrompt = `
Analyze this CBSE student's exam performance.
- Max 5 lines
- Clear strengths
- Clear weaknesses  
- One actionable improvement tip
- Be encouraging
      `.trim();

      const reply = await callAI(systemPrompt, [
        {
          role: "user",
          content: `Student: ${student?.name || "Unknown"}, Class: ${student?.class || "Unknown"}\n\nAttempts:\n${JSON.stringify(attempts, null, 2)}`,
        },
      ]);

      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode." });
  } catch {
    return NextResponse.json(
      { reply: "Server error. Try again." },
      { status: 500 }
    );
  }
}