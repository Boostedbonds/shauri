import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

interface OMRResult {
  detected: Record<number, string>;   // { 1: "B", 2: "A", ... }
  score: number;
  total: number;
  wrong: number[];                     // question numbers that were wrong
  unattempted: number[];
  breakdown: Array<{
    q: number;
    detected: string;
    correct: string;
    status: "correct" | "wrong" | "unattempted";
  }>;
  sheetInfo?: string;                  // e.g. "Roll No: 23, Name: Arjun"
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64, answerKey, totalQuestions, negativeMarking } = body;

    // answerKey: { "1": "B", "2": "A", "3": "C", ... }
    // imageBase64: "data:image/jpeg;base64,..."

    if (!imageBase64) {
      return NextResponse.json({ error: "No image provided." }, { status: 400 });
    }
    if (!answerKey || Object.keys(answerKey).length === 0) {
      return NextResponse.json({ error: "No answer key provided." }, { status: 400 });
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: "AI service unavailable." }, { status: 500 });
    }

    const mediaType = imageBase64.split(";")[0].replace("data:", "");
    const base64Raw = imageBase64.split(",")[1];

    const numQ = totalQuestions || Object.keys(answerKey).length;

    const prompt = `You are an OMR (Optical Mark Recognition) sheet reader for CBSE examinations.

Carefully examine this OMR answer sheet image and:

1. Read EVERY filled bubble for questions 1 through ${numQ}.
2. For each question, identify which option is darkened/filled: A, B, C, or D.
3. If a bubble appears partially filled or ambiguous, still pick the most likely answer.
4. If no bubble is filled for a question, mark it as "0" (unattempted).
5. If multiple bubbles are filled for one question, mark it as "X" (invalid).
6. Also read the student's name and roll number if visible on the sheet.

Return ONLY a valid JSON object in this exact format (no extra text, no markdown):
{
  "answers": {
    "1": "B",
    "2": "A",
    "3": "0",
    "4": "X",
    ...
  },
  "studentName": "Arjun Sharma",
  "rollNumber": "23",
  "sheetInfo": "any other visible text like class, section, date"
}

Be extremely careful and accurate. This is for an official school examination.`;

    const visionRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            role: "user",
            parts: [
              { text: prompt },
              { inline_data: { mime_type: mediaType, data: base64Raw } },
            ],
          }],
          generationConfig: {
            temperature: 0.1,   // low temp for accuracy
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    const visionData = await visionRes.json();
    const rawText = visionData?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response
    let detected: Record<string, string> = {};
    let studentName = "";
    let rollNumber = "";
    let sheetInfo = "";

    try {
      const cleaned = rawText.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      detected = parsed.answers || {};
      studentName = parsed.studentName || "";
      rollNumber = parsed.rollNumber || "";
      sheetInfo = [
        studentName ? `Name: ${studentName}` : "",
        rollNumber ? `Roll No: ${rollNumber}` : "",
        parsed.sheetInfo || "",
      ].filter(Boolean).join("  |  ");
    } catch {
      // Try to extract answers manually if JSON parse fails
      const lines = rawText.split("\n");
      for (const line of lines) {
        const m = line.match(/"?(\d+)"?\s*[:=]\s*"?([A-D0X])"?/i);
        if (m) detected[m[1]] = m[2].toUpperCase();
      }
    }

    // ── Compare with answer key ───────────────────────────────
    const breakdown: OMRResult["breakdown"] = [];
    let score = 0;
    const wrong: number[] = [];
    const unattempted: number[] = [];
    const negMark = negativeMarking ? 0.25 : 0;  // default CBSE negative marking

    for (let q = 1; q <= numQ; q++) {
      const correctAns = (answerKey[String(q)] || "").toUpperCase();
      const detectedAns = (detected[String(q)] || "0").toUpperCase();

      if (!correctAns) continue;

      if (detectedAns === "0") {
        unattempted.push(q);
        breakdown.push({ q, detected: "—", correct: correctAns, status: "unattempted" });
      } else if (detectedAns === "X") {
        wrong.push(q);
        if (negativeMarking) score -= negMark;
        breakdown.push({ q, detected: "X (multiple)", correct: correctAns, status: "wrong" });
      } else if (detectedAns === correctAns) {
        score += 1;
        breakdown.push({ q, detected: detectedAns, correct: correctAns, status: "correct" });
      } else {
        wrong.push(q);
        if (negativeMarking) score -= negMark;
        breakdown.push({ q, detected: detectedAns, correct: correctAns, status: "wrong" });
      }
    }

    const result: OMRResult = {
      detected: Object.fromEntries(
        Object.entries(detected).map(([k, v]) => [Number(k), v])
      ),
      score: Math.max(0, score),
      total: numQ,
      wrong,
      unattempted,
      breakdown,
      sheetInfo,
    };

    return NextResponse.json({ result });

  } catch (e) {
    console.error("OMR route error:", e);
    return NextResponse.json({ error: "Failed to process OMR sheet." }, { status: 500 });
  }
}