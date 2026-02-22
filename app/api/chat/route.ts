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
- NCERT textbooks
- Official CBSE syllabus
- CBSE board exam pattern
Never go outside CBSE scope.
Never guess the class.
`;

/* ================= MODE PROMPTS ================= */

const TEACHER_PROMPT = `
You are in TEACHER MODE.

Rules:
- Greet student using name and class
- Keep response max 2 lines
- Warm, human tone
- No examples
- No long paragraphs

Style:
"Hi {name}, we’ll go step by step. What would you like to study today?"
`;

const ORAL_PROMPT = `You are in ORAL MODE. Short, classroom-like, CBSE aligned.`;

const PROGRESS_PROMPT = `
Generate a concise CBSE performance summary (6–8 lines):
- Overall level
- Strengths
- Weaknesses
- One improvement
`;

/* ================= STRICT EXAMINER PROMPT ================= */

const EXAMINER_PROMPT = `
You are a STRICT CBSE BOARD EXAMINER.

=====================
PAPER GENERATION
=====================
- Generate FULL paper in ONE response (no follow-ups)
- Include: Instructions, Time, Maximum Marks
- Sections: A (MCQ), B (Short), C (Long)
- Balanced weightage across chapters
- Clear marking scheme

=====================
EVALUATION (VERY STRICT)
=====================
- Award marks ONLY for correct NCERT points
- No assumption, no inference
- Deduct for incorrect / missing concepts
- FULL marks only if complete & correct
- PARTIAL only for clearly correct points
- ZERO for vague/incorrect/irrelevant

=====================
OUTPUT FORMAT (STRICT JSON)
=====================
{
  "marksObtained": number,
  "totalMarks": number,
  "percentage": number,
  "detailedEvaluation": "Question-wise strict evaluation with reasons and correct answers"
}
Return ONLY JSON. No markdown.
`;

/* ================= HELPERS ================= */

function safeParseJSON(text: string) {
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function calculateDurationMinutes(request: string): number {
  const nums = request.match(/\b\d+\b/g);
  const count = nums ? nums.length : 1;
  if (count >= 4) return 150;
  if (count === 3) return 120;
  if (count === 2) return 90;
  return 60;
}

function extractPaperParams(text: string) {
  const lower = text.toLowerCase();

  const classMatch = lower.match(/class\s*(\d{1,2})/);
  const subjectMatch = lower.match(
    /(history|civics|geography|economics|science|math|mathematics|english|hindi)/i
  );

  let chapters: string[] = [];
  const chapMatch = lower.match(/chapters?\s*[:\-]?\s*([a-z0-9 ,&]+)/i);
  if (chapMatch?.[1]) {
    chapters = chapMatch[1]
      .split(/,|&/g)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return {
    classNum: classMatch?.[1],
    subject: subjectMatch?.[1],
    chapters,
  };
}

/* ================= GEMINI ================= */

async function callGemini(messages: ChatMessage[], temperature = 0.2) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "AI configuration error.";

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content ?? "" }],
        })),
        generationConfig: { temperature },
      }),
    }
  );

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Unable to generate response.";
}

/* ================= API ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: string = body?.mode ?? "";

    const history: ChatMessage[] =
      Array.isArray(body?.history)
        ? body.history
        : Array.isArray(body?.messages)
        ? body.messages
        : [];

    const message: string =
      body?.message ??
      history.filter((m) => m.role === "user").pop()?.content ??
      "";

    const lower = (message || "").toLowerCase().trim();

    const name = decodeURIComponent(req.cookies.get("shauri_name")?.value || "Student");
    const cls = decodeURIComponent(req.cookies.get("shauri_class")?.value || "Not specified");

    const studentContext = `
Student Name: ${name}
Class: ${cls}
Board: CBSE
`;

    const fullConversation: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
    ];

    /* ================= EXAMINER MODE ================= */

    if (mode === "examiner") {
      let { data: session } = await supabase
        .from("exam_sessions")
        .select("*")
        .eq("student_name", name)
        .eq("class", cls)
        .neq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!session) {
        await supabase.from("exam_sessions").insert({
          student_name: name,
          class: cls,
          answers: [],
          status: "idle",
        });

        return NextResponse.json({
          reply: `Hello ${name}. Which subject and chapters would you like to be tested on?`,
        });
      }

      // ✅ FIXED: only move to ready if subject detected
      if (session.status === "idle" && !/\b(start|begin)\b/.test(lower)) {
        const { classNum, subject, chapters } = extractPaperParams(message);

        if (!subject && (!chapters || chapters.length === 0)) {
          return NextResponse.json({
            reply: `Please tell me the subject and chapters you want the test from.`,
          });
        }

        await supabase
          .from("exam_sessions")
          .update({
            subject,
            class: classNum || cls,
            chapters,
            status: "ready",
          })
          .eq("id", session.id);

        return NextResponse.json({
          reply: `Subject and chapters noted. Type START to begin the exam.`,
        });
      }

      if (/\b(start|begin)\b/.test(lower)) {
        if (!session.subject) {
          return NextResponse.json({
            reply: `Please tell me the subject first.`,
          });
        }

        const durationMin = calculateDurationMinutes(message);

        const paper = await callGemini(
          [
            { role: "system", content: GLOBAL_CONTEXT },
            { role: "system", content: EXAMINER_PROMPT },
            { role: "system", content: studentContext },
            {
              role: "user",
              content: `
Create a CBSE question paper.
Class: ${session.class}
Subject: ${session.subject}
${session.chapters?.length ? `Chapters: ${session.chapters.join(", ")}` : ""}
Time: ${durationMin} minutes
Maximum Marks: 80
`,
            },
          ],
          0.2
        );

        await supabase
          .from("exam_sessions")
          .update({
            paper,
            started_at: new Date().toISOString(),
            duration_min: durationMin,
            status: "started",
          })
          .eq("id", session.id);

        return NextResponse.json({
          reply: paper,
          meta: { examStarted: true, durationMin },
        });
      }

      if (session.status !== "started") {
        return NextResponse.json({
          reply: "Type START to begin the exam.",
        });
      }

      const elapsedMin =
        (Date.now() - new Date(session.started_at).getTime()) / (60 * 1000);

      const timeLeft = Math.max(0, session.duration_min - elapsedMin);

      const isSubmit = /\b(submit|done|end test|finish)\b/.test(lower);

      if (!isSubmit && timeLeft > 0) {
        const updatedAnswers = [...(session.answers || []), message];

        await supabase
          .from("exam_sessions")
          .update({ answers: updatedAnswers })
          .eq("id", session.id);

        return NextResponse.json({
          reply: "...",
          meta: { timeLeftMin: Math.ceil(timeLeft) },
        });
      }

      const evaluationRaw = await callGemini(
        [
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "system", content: EXAMINER_PROMPT },
          {
            role: "user",
            content: `
Evaluate strictly.

QUESTION PAPER:
${session.paper}

STUDENT ANSWERS:
${(session.answers || []).join("\n")}
`,
          },
        ],
        0.1
      );

      const parsed = safeParseJSON(evaluationRaw);

      await supabase
        .from("exam_sessions")
        .update({ status: "completed" })
        .eq("id", session.id);

      try {
        if (parsed) {
          await supabase.from("exam_attempts").insert({
            student_name: name,
            class: cls,
            subject: session.subject ?? null,
            marks_obtained: parsed.marksObtained,
            total_marks: parsed.totalMarks,
            percentage: parsed.percentage,
            created_at: new Date().toISOString(),
          });
        }
      } catch (e) {
        console.error("Supabase insert error:", e);
      }

      if (parsed) {
        return NextResponse.json({
          reply: parsed.detailedEvaluation,
          marksObtained: parsed.marksObtained,
          totalMarks: parsed.totalMarks,
          percentage: parsed.percentage,
        });
      }

      return NextResponse.json({ reply: evaluationRaw });
    }

    /* ================= OTHER MODES ================= */

    if (mode === "teacher") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        { role: "system", content: studentContext },
        ...fullConversation,
      ]);
      return NextResponse.json({ reply });
    }

    if (mode === "oral") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: ORAL_PROMPT },
        { role: "system", content: studentContext },
        ...fullConversation,
      ]);
      return NextResponse.json({ reply });
    }

    if (mode === "progress") {
      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: PROGRESS_PROMPT },
        { role: "system", content: studentContext },
        ...fullConversation,
      ]);
      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode." });
  } catch (err) {
    console.error("API ERROR:", err);
    return NextResponse.json(
      { reply: "AI server error. Please try again." },
      { status: 500 }
    );
  }
}