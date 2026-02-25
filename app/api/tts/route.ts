import { NextRequest, NextResponse } from "next/server";

// Voice options for Gemini TTS:
// Female: "Aoede", "Leda", "Zephyr", "Autonoe"
// Male:   "Charon", "Fenrir", "Orus", "Puck"
// These voices handle English + Hindi + Hinglish naturally

export async function POST(req: NextRequest) {
  const { text, gender = "female", style } = await req.json();

  const voice = gender === "female" ? "Aoede" : "Charon";

  // Style prompt — natural language control over delivery
  const stylePrompt = style || (
    gender === "female"
      ? "Speak in a warm, clear, encouraging tone like a helpful teacher. Natural pace, friendly."
      : "Speak in a calm, clear, confident tone like a knowledgeable teacher."
  );

  const key = process.env.GEMINI_API_KEY;
  if (!key) return NextResponse.json({ error: "Missing API key" }, { status: 500 });

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${stylePrompt}\n\n${text}` }] }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice }
              }
            }
          }
        }),
      }
    );

    const data = await res.json();
    const audioB64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!audioB64) {
      console.error("TTS response:", JSON.stringify(data));
      return NextResponse.json({ error: "No audio returned" }, { status: 500 });
    }

    // ✅ FIXED (Buffer → Uint8Array for Next.js compatibility)
    const audioBuffer = Uint8Array.from(atob(audioB64), c => c.charCodeAt(0));

    return new NextResponse(audioBuffer.buffer, {
      headers: { "Content-Type": "audio/wav" },
    });

  } catch (err) {
    console.error("TTS error:", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}