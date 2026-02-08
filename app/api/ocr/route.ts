import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { imageBase64 } = body;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "Extract handwritten student exam answers exactly as written. Do not correct, summarize, or improve language.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the answers from this image." },
            {
              type: "image_url",
              image_url: {
                url: imageBase64,
              },
            },
          ],
        },
      ],
    }),
  });

  const data = await res.json();

  return NextResponse.json({
    text: data.choices[0].message.content,
  });
}
