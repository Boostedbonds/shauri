import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../../lib/supabase";

/* ================= TYPES ================= */

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type StudentContext = {
  name?: string;
  class?: string;
  board?: string;
};

/* ================= GLOBAL CONTEXT ================= */

const GLOBAL_CONTEXT = `
You are Shauri, strictly aligned to:
- NCERT
- CBSE syllabus
- Board pattern
Never go outside syllabus.
`;

/* ================= TEACHER PROMPT ================= */

const TEACHER_PROMPT = `
You are a HUMAN CBSE teacher.

RULES:
- If student says "hi" → greet using name + class
- DO NOT give examples unless teaching
- DO NOT assume topic
- If casual talk → respond naturally → bring back to studies

STYLE:
- Short
- Simple
- Step-by-step
- Ask 2 questions

Be natural. Not robotic.
`;

/* ================= EXAMINER PROMPT ================= */

const EXAMINER_PROMPT = `
You are a STRICT CBSE examiner.

- Conduct full exam
- No teaching
- No hints
- Strict evaluation

Return marks clearly.
`;

/* ================= GEMINI ================= */

async function callGemini(messages: ChatMessage[], temperature = 0.2) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) return "AI error";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })),
        generationConfig: { temperature },
      }),
    }
  );

  const data = await res.json();

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ||
    "No response"
  );
}

/* ================= API ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: string = body?.mode ?? "";

    /* ================= STUDENT ================= */

    let student: StudentContext | undefined = body?.student;

    if (!student?.name || !student?.class) {
      const name = req.cookies.get("shauri_name")?.value;
      const cls = req.cookies.get("shauri_class")?.value;

      if (name && cls) {
        student = {
          name: decodeURIComponent(name),
          class: decodeURIComponent(cls),
          board: "CBSE",
        };
      }
    }

    if (!student?.name || !student?.class) {
      return NextResponse.json({ reply: "Student missing." });
    }

    /* ================= STUDENT ID ================= */

    let studentId: string | null = null;

    const { data: existing } = await supabase
      .from("students")
      .select("id")
      .eq("name", student.name)
      .eq("class", student.class)
      .maybeSingle();

    if (existing?.id) {
      studentId = existing.id;
    } else {
      const { data: inserted } = await supabase
        .from("students")
        .insert({
          name: student.name,
          class: student.class,
          board: "CBSE",
        })
        .select("id")
        .maybeSingle();

      if (inserted?.id) {
        studentId = inserted.id;
      }
    }

    if (!studentId) {
      return NextResponse.json({ reply: "Student sync error." });
    }

    /* ================= MESSAGE ================= */

    const message: string = body?.message ?? "";
    const lower = message.toLowerCase();

    const history: ChatMessage[] = body?.history ?? [];

    const studentContext: ChatMessage = {
      role: "system" as const,
      content: `Student Name: ${student.name}, Class: ${student.class}`,
    };

    /* ================= EXAMINER ================= */

    if (mode === "examiner") {
      const { data: session } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("student_id", studentId)
        .maybeSingle();

      const isSubmit = ["submit", "done", "finish"].includes(lower);

      /* ===== SUBMIT ===== */
      if (isSubmit && session?.status === "IN_EXAM") {
        const evalText = await callGemini([
          { role: "system" as const, content: GLOBAL_CONTEXT },
          { role: "system" as const, content: EXAMINER_PROMPT },
          {
            role: "user" as const,
            content: `
QUESTION PAPER:
${session.question_paper}

ANSWERS:
${(session.answers || []).join("\n")}
`,
          },
        ]);

        await supabase.from("exam_attempts").insert({
          student_id: studentId,
          feedback: evalText,
        });

        await supabase
          .from("exam_sessions")
          .delete()
          .eq("student_id", studentId);

        return NextResponse.json({ reply: evalText });
      }

      /* ===== IN EXAM ===== */
      if (session?.status === "IN_EXAM") {
        await supabase
          .from("exam_sessions")
          .update({
            answers: [...(session.answers || []), message],
          })
          .eq("student_id", studentId);

        return NextResponse.json({ reply: "" });
      }

      /* ===== START ===== */
      if (lower === "start" && session?.status === "READY") {
        const paper = await callGemini([
          { role: "system" as const, content: GLOBAL_CONTEXT },
          { role: "system" as const, content: EXAMINER_PROMPT },
          {
            role: "user" as const,
            content: `Generate full CBSE paper for ${session.subject}`,
          },
        ]);

        await supabase
          .from("exam_sessions")
          .update({
            status: "IN_EXAM",
            question_paper: paper,
            started_at: Date.now(),
          })
          .eq("student_id", studentId);

        return NextResponse.json({ reply: paper });
      }

      /* ===== SET SUBJECT ===== */
      await supabase.from("exam_sessions").upsert({
        student_id: studentId,
        status: "READY",
        subject: message,
        answers: [],
      });

      return NextResponse.json({
        reply: "Subject noted. Type START.",
      });
    }

    /* ================= TEACHER ================= */

    const messages: ChatMessage[] = [
      { role: "system" as const, content: GLOBAL_CONTEXT },
      { role: "system" as const, content: TEACHER_PROMPT },
      studentContext,
      ...history,
      { role: "user" as const, content: message },
    ];

    const reply = await callGemini(messages);

    return NextResponse.json({ reply });

  } catch (err) {
    return NextResponse.json({ reply: "Server error" });
  }
}