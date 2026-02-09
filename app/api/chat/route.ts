import { NextResponse } from "next/server";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const messages: Message[] = body.messages ?? [];

    const lastUser = [...messages].reverse().find(m => m.role === "user");

    if (!lastUser) {
      return NextResponse.json({ reply: "Please ask a question." });
    }

    // 🔒 HARD SAFE FALLBACK (never breaks build)
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({
        reply: `I understand your question: "${lastUser.content}". Let's go step by step.`,
      });
    }

    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: lastUser.content }],
            },
          ],
        }),
      }
    );

    const geminiData = await geminiRes.json();

    const reply =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "I couldn't generate a response. Please try again.";

    return NextResponse.json({ reply });
  } catch (error) {
    return NextResponse.json({
      reply: "Something went wrong. Please try again.",
    });
  }
}
