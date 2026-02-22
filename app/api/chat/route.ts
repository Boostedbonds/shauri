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

You are a highly intelligent CBSE teacher who ADAPTS to the student in real-time.

Your goal is to make the student understand AND help them score maximum marks.

=====================
CORE TEACHING STYLE
=====================

1. Teach step-by-step in SMALL parts.
2. NEVER explain full chapter.
3. Use simple, clear language.
4. Use examples where helpful.
5. Keep answers short and focused.

=====================
SCORING OPTIMIZATION
=====================

- Always include KEYWORDS from NCERT naturally
- Use structured, point-wise answers when possible
- Ensure each point contains a key concept
- Prefer exam-style wording

For definitions:
→ Give precise NCERT-style definition

For theory:
→ Use 2–5 crisp points with keywords

For processes:
→ Use step-by-step format

=====================
FLOW
=====================

Start with:
"Alright [student name], let’s understand this step by step."

Explain ONE concept → simple → structured → keyword-rich

=====================
ENGAGEMENT
=====================

Ask exactly 2 short questions based ONLY on what was explained.

=====================
RULES
=====================

- Strictly NCERT / CBSE aligned
- Never go outside syllabus
- Never ask class again

=====================
TONE
=====================

- Clear, calm, teacher-like
- Focused on understanding + scoring
`;

/* ================= HELPERS ================= */

async function updateWeakness(studentId: string, topic: string) {
  if (!topic) return;

  const { data } = await supabase
    .from("student_memory")
    .select("*")
    .eq("student_id", studentId)
    .eq("topic", topic)
    .maybeSingle();

  if (data) {
    await supabase
      .from("student_memory")
      .update({
        weakness_level: Math.min((data.weakness_level ?? 1) + 1, 5),
        updated_at: new Date(),
      })
      .eq("id", data.id);
  } else {
    await supabase.from("student_memory").insert({
      student_id: studentId,
      topic,
      weakness_level: 1,
    });
  }
}

async function getWeakTopics(studentId: string) {
  const { data } = await supabase
    .from("student_memory")
    .select("topic, weakness_level")
    .eq("student_id", studentId)
    .order("weakness_level", { ascending: false })
    .limit(3);

  return data || [];
}

/* ================= GEMINI ================= */

async function callGemini(messages: ChatMessage[], temperature = 0.2) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "AI configuration error.";

  const contents = messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content ?? "" }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature },
      }),
    }
  );

  const data = await res.json();

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "Unable to generate response."
  );
}

/* ================= API ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode: string = body?.mode ?? "";

    let student: StudentContext | undefined = body?.student;

    if (!student?.name || !student?.class) {
      const nameFromCookie = req.cookies.get("shauri_name")?.value;
      const classFromCookie = req.cookies.get("shauri_class")?.value;

      if (nameFromCookie && classFromCookie) {
        student = {
          name: decodeURIComponent(nameFromCookie),
          class: decodeURIComponent(classFromCookie),
          board: "CBSE",
        };
      }
    }

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

    const lower = message.toLowerCase();

    /* 🔥 CONFUSION DETECTION */
    const isConfused =
      lower.includes("don't understand") ||
      lower.includes("dont understand") ||
      lower.includes("confused") ||
      lower.includes("not clear");

    /* 🔥 TOPPER MODE DETECTION */
    const isExamMode =
      lower.includes("answer") ||
      lower.includes("write") ||
      lower.includes("3 marks") ||
      lower.includes("5 marks") ||
      lower.includes("2 marks") ||
      lower.includes("short note") ||
      lower.includes("long answer") ||
      lower.includes("explain in points");

    const studentContext = `
Student Name: ${student?.name ?? "Student"}
Class: ${student?.class ?? ""}
Board: CBSE
`;

    const fullConversation: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
    ];

    let studentId: string | null = null;

    if (student?.name && student?.class) {
      const { data } = await supabase
        .from("students")
        .select("id")
        .eq("name", student.name)
        .eq("class", student.class)
        .maybeSingle();

      if (data) {
        studentId = data.id;
      }
    }

    /* ================= TEACHER MODE ================= */

    if (mode === "teacher") {
      let weakTopicsList: any[] = [];

      if (studentId) {
        weakTopicsList = await getWeakTopics(studentId);
      }

      const weakTopicsText = weakTopicsList.map(w => w.topic).join(", ");

      const shouldTriggerRevision =
        weakTopicsList.length > 0 && Math.random() < 0.3;

      let revisionInstruction = "";

      if (shouldTriggerRevision && weakTopicsText) {
        revisionInstruction = `
Before continuing, briefly revise this weak topic: ${weakTopicsList[0].topic}.
Keep it short.
`;
      }

      /* 🔥 ENHANCED TOPPER MODE */
      let topperInstruction = "";

      if (isExamMode) {
        topperInstruction = `
TOPPER MODE ACTIVATED:

Answer like a CBSE board topper.

Rules:
- Use point-wise format
- Include keywords from NCERT
- Ensure each point contains a key concept
- Be concise and to the point
- Follow mark-based length:
  2 marks → 2-3 points
  3 marks → 3-4 points
  5 marks → 5-6 points
- No extra explanation
- Focus on scoring marks
`;
      }

      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },
        { role: "system", content: studentContext },
        { role: "system", content: `Weak Topics: ${weakTopicsText || "None"}` },
        { role: "system", content: revisionInstruction },
        { role: "system", content: topperInstruction },
        ...fullConversation,
      ]);

      if (isConfused && studentId) {
        await updateWeakness(studentId, message.slice(0, 60));
      }

      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Other modes unchanged." });

  } catch (err) {
    return NextResponse.json({ reply: "Error" });
  }
}