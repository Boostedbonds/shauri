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

/* ================= TEACHER PROMPT ================= */

const TEACHER_PROMPT = `
You are in TEACHER MODE.

Teaching Rules:
- Explain step-by-step
- Use NCERT language
- Keep answers exam-focused
- Use keywords, headings, and points
- Give definitions where needed
- End with 2-3 quick revision questions
`;

/* ================= EXAMINER PROMPT ================= */

const EXAMINER_PROMPT = `
You are a STRICT CBSE BOARD EXAMINER.

Evaluate EXACTLY like CBSE.

RULES:
- Give marks only if NCERT concept is correct
- No step marking if concept is wrong
- No extra marks for effort

OUTPUT FORMAT:

Question 1: (2/2) ✔
Question 2: (1/3) ✘ Missing point: ______
Question 3: (0/2) ✘ Incorrect concept

FINAL RESULT:
Marks Obtained: X
Total Marks: Y
Percentage: Z%
`;

/* ================= HELPERS ================= */

async function callGemini(messages: ChatMessage[], temperature = 0.3) {
  const apiKey = process.env.GEMINI_API_KEY;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: "user",
          parts: [{ text: m.content }],
        })),
      }),
    }
  );

  const data = await res.json();

  return (
    data?.candidates?.[0]?.content?.parts?.[0]?.text ??
    "Error generating response"
  );
}

/* ================= SMART CONTEXT HELPERS ================= */

// 🔍 Chapter Detection (lightweight but effective)
function detectChapter(message: string) {
  const msg = message.toLowerCase();

  const keywords = [
    "democracy",
    "constitution",
    "nazism",
    "french revolution",
    "resources",
    "poverty",
    "development",
    "socialism",
    "population",
    "climate",
  ];

  for (const key of keywords) {
    if (msg.includes(key)) return key;
  }

  return "general topic";
}

// 🎯 NCERT Keyword Injection
function getNcertInstruction(chapter: string) {
  return `
NCERT Focus Instructions:
- Topic: ${chapter}
- Include definitions (as per NCERT)
- Highlight important keywords
- Use CBSE answer writing format
- Keep answers structured (points, headings)
- Avoid extra/out-of-syllabus content
`;
}

/* ================= API ================= */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const mode = body.mode;
    const message = body.message || "";

    const student = body.student || {};

    /* ================= EXAMINER MODE ================= */

    if (mode === "examiner") {

      if (message.toLowerCase().includes("start")) {

        const paper = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          {
            role: "user",
            content: `
Generate a STRICT CBSE question paper.

Class: ${student.class}
Subject/Chapters: ${message}

RULES:
- Cover ALL chapters evenly
- Section A: MCQ (10–15)
- Section B: 2–3 marks
- Section C: 4–5 marks
- Section D: Case-based

Difficulty:
30% easy
50% moderate
20% hard

Mention total marks and time.
NO ANSWERS.
`,
          },
        ]);

        return NextResponse.json({ reply: paper });
      }

      if (message.toLowerCase().includes("submit")) {

        const evaluation = await callGemini([
          { role: "system", content: GLOBAL_CONTEXT },
          { role: "system", content: EXAMINER_PROMPT },
          {
            role: "user",
            content: `
Evaluate strictly.

Student Answers:
${message}
`,
          },
        ]);

        return NextResponse.json({ reply: evaluation });
      }

      return NextResponse.json({
        reply: "Type START to generate paper or SUBMIT to evaluate.",
      });
    }

    /* ================= TEACHER MODE ================= */

    if (mode === "teacher") {

      const chapter = detectChapter(message);
      const ncertInstruction = getNcertInstruction(chapter);

      const reply = await callGemini([
        { role: "system", content: GLOBAL_CONTEXT },
        { role: "system", content: TEACHER_PROMPT },

        // ✅ Student Context (restored)
        {
          role: "system",
          content: `
Student Context:
Name: ${student.name || "Unknown"}
Class: ${student.class || "Unknown"}
Board: ${student.board || "CBSE"}

Instructions:
- Adapt explanation strictly based on class level
- Do NOT mention missing context
`,
        },

        // ✅ Chapter Awareness
        {
          role: "system",
          content: `Detected Topic: ${chapter}`,
        },

        // ✅ NCERT Injection
        {
          role: "system",
          content: ncertInstruction,
        },

        { role: "user", content: message },
      ]);

      return NextResponse.json({ reply });
    }

    return NextResponse.json({ reply: "Invalid mode" });

  } catch (e) {
    return NextResponse.json({ reply: "Error occurred" });
  }
}