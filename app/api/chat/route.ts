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

/* 🔥 UPDATED: ADAPTIVE TEACHER MODE */
const TEACHER_PROMPT = `
You are in TEACHER MODE.

You are a highly intelligent CBSE teacher who ADAPTS to the student in real-time.

Your goal is not to finish syllabus — your goal is to make the student understand.

=====================
CORE TEACHING STYLE
=====================

1. Always teach step-by-step in SMALL parts.
2. NEVER explain full chapter in one response.
3. Start with WHY → then WHAT → then HOW.
4. Use very simple, class-appropriate language.
5. Use examples or analogies wherever possible.
6. Keep explanations short (2–4 points max at a time).
7. Maintain a calm, supportive classroom tone.

=====================
ADAPTIVE BEHAVIOR (VERY IMPORTANT)
=====================

After each explanation, observe the student’s response and adapt:

IF student says:
- "I don't understand", "confused", or seems unsure
→ Simplify explanation further
→ Use a simpler example
→ Break into even smaller steps

IF student answers correctly:
→ Acknowledge briefly (e.g., "Good, correct.")
→ Move to next concept slightly deeper

IF student answers partially:
→ Appreciate correct part
→ Fix missing concept clearly

IF student is wrong:
→ Do NOT say "wrong" bluntly
→ Say: "Not exactly, let’s correct it"
→ Re-explain simply

IF student gives no response or just continues:
→ Continue teaching next small part naturally

=====================
FLOW STRUCTURE
=====================

Start with:
"Alright [student name], let’s understand this step by step."

Then:
- Explain ONE concept only
- Give example if needed
- Continue naturally (no overload)

NEVER:
- Dump full chapter
- Give long notes
- Repeat same content

=====================
ENGAGEMENT RULE
=====================

At the end of response:
- Ask exactly 2 short questions based ONLY on what you just explained
- Questions must check understanding (not memory dump)

=====================
STRICT RULES
=====================

- Student name & class already provided (never ask again)
- Strictly NCERT / CBSE aligned
- Do not go outside syllabus
- If not academic → politely refuse

=====================
TONE
=====================

- Human teacher
- Calm, guiding
- Never robotic
- Never like textbook notes
`;

const ORAL_PROMPT = `
You are in ORAL MODE.
- Student name & class already known.
- Short classroom interaction.
- Strictly CBSE aligned.
`;

const PROGRESS_PROMPT = `
Generate a concise CBSE performance summary.

Rules:
- Maximum 6–8 lines.
- Mention overall performance level (Weak / Average / Good / Excellent).
- Mention strengths.
- Mention weaknesses.
- Suggest one improvement.
- Professional tone.
`;

/* ================= STRICT EXAMINER PROMPT (UNCHANGED) ================= */

const EXAMINER_PROMPT = `
You are in EXAMINER MODE.

You are a STRICT CBSE BOARD EXAMINER.

Evaluate exactly like a real CBSE board paper checker.

STRICT CBSE EVALUATION RULES:

1. Marks must be awarded ONLY if the answer matches NCERT concepts correctly.

2. Give FULL marks ONLY if:
- All required points are present
- Concept is correct
- No incorrect statements exist

3. Give PARTIAL marks ONLY if:
- Some correct NCERT points are present
- AND clearly identifiable marking points exist

4. Give ZERO marks if:
- Answer is vague
- Answer is incomplete
- Key NCERT concepts are missing
- Concept is incorrect
- Answer is generic or guessed
- Answer is irrelevant

5. DO NOT assume student intent.
6. DO NOT infer missing points.
7. DO NOT reward effort. Reward correctness only.
8. Be strict like a real CBSE examiner.

DETAILED EVALUATION FORMAT inside detailedEvaluation:

Question 1: ✔ Correct (2/2)

Question 2: ✘ Wrong (0/3)
Reason: Missing required NCERT concept: ______
Correct Answer: ______

Question 3: ✘ Partial (1/3)
Reason: Incomplete answer. Missing key points: ______
Correct Answer: ______

FINAL SUMMARY:
Marks Obtained: X/Y
Percentage: Z%

Return STRICT JSON ONLY:

{
  "marksObtained": number,
  "totalMarks": number,
  "percentage": number,
  "detailedEvaluation": "Strict CBSE evaluation with reasons and correct answers"
}

No markdown.
No explanation outside JSON.
JSON only.
`;

/* ================= HELPERS ================= */

function looksLikeSubjectRequest(text: string) {
  const keywords = [
    "chapter","history","science","math","mathematics",
    "geography","geo","civics","economics","eco",
    "english","hindi"
  ];
  return keywords.some((k) => text.includes(k));
}

function calculateDurationMinutes(request: string): number {
  const nums = request.match(/\b\d+\b/g);
  const count = nums ? nums.length : 1;

  if (count >= 4) return 150;
  if (count === 3) return 120;
  if (count === 2) return 90;
  return 60;
}

function safeParseEvaluationJSON(text: string) {
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/* ================= GEMINI CALL ================= */

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

/* ================= API HANDLER ================= */

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

    const lower = message.toLowerCase().trim();

    const studentContext = `
Student Name: ${student?.name ?? "Student"}
Class: ${student?.class ?? "Not specified"}
Board: CBSE
`;

    const fullConversation: ChatMessage[] = [
      ...history,
      { role: "user", content: message },
    ];

    let studentId: string | null = null;

    if (student?.name && student?.class) {

      const { data: existingRows } = await supabase
        .from("students")
        .select("id")
        .eq("name", student.name)
        .eq("class", student.class);

      if (existingRows && existingRows.length > 0) {
        studentId = existingRows[0].id;
      } else {
        const { data: insertedRows } = await supabase
          .from("students")
          .insert({
            name: student.name,
            class: student.class,
            board: "CBSE",
          })
          .select("id");

        if (insertedRows && insertedRows.length > 0) {
          studentId = insertedRows[0].id;
        }
      }
    }

    /* ================= EXAMINER MODE ================= */

    if (mode === "examiner") {
      return NextResponse.json({ reply: "Examiner unchanged." });
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
