import { NextRequest, NextResponse } from "next/server";
import { systemPrompt } from "@/app/lib/prompts";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { mode, messages } = body;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt(mode) },
        ...messages,
      ],
    }),
  });

  const data = await res.json();

  return NextResponse.json({
    reply: data.choices[0].message.content,
  });
}
