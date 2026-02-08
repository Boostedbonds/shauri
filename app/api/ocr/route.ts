import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ text: "" });
    }

    // PDFs: try to read embedded text (works for many PDFs)
    if (file.type === "application/pdf") {
      const text = await file.text();
      return NextResponse.json({
        text: text || "PDF uploaded. Please specify your question.",
      });
    }

    // Images: placeholder (OCR can be added later)
    if (file.type.startsWith("image/")) {
      return NextResponse.json({
        text:
          "Image uploaded. OCR is not enabled yet — please type the question or describe the image.",
      });
    }

    return NextResponse.json({ text: "" });
  } catch {
    return NextResponse.json({ text: "" });
  }
}
