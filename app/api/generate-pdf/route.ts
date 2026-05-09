import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, type PDFPage, type PDFFont } from "pdf-lib";

const PAGE_WIDTH = 595; // A4
const PAGE_HEIGHT = 842;
const MARGIN_X = 48;
const MARGIN_TOP = 54;
const MARGIN_BOTTOM = 44;
const BODY_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const LEAK_MARKERS = [
  "GENERATION_PROMPT_CONTEXT:",
  "DRAFT_PAPER:",
  "AUDIT_RESULT:",
  "ISSUES:",
  "KNOWLEDGE BASE CONTEXT",
  "RANKED RETRIEVAL:",
  "MANDATORY PIPELINE:",
  "AUDIT CHECKS",
];

const COMMON_MOJIBAKE: Array<[RegExp, string]> = [
  [/â€”/g, "—"],
  [/â€“/g, "–"],
  [/â€˜/g, "‘"],
  [/â€™/g, "’"],
  [/â€œ/g, "“"],
  [/â€/g, "”"],
  [/â€¦/g, "…"],
  [/Â·/g, "·"],
  [/Â/g, ""],
  [/Ã—/g, "×"],
  [/Î±/g, "α"],
  [/Î²/g, "β"],
  [/Î³/g, "γ"],
  [/âˆš/g, "√"],
  [/â‰ /g, "≠"],
  [/â†’/g, "→"],
  [/â†/g, "←"],
  [/âœ…/g, "✓"],
];

type RenderLine = {
  text: string;
  size: number;
  bold: boolean;
  gapBefore: number;
  gapAfter: number;
};

interface RequestBody {
  content?: string;
}

function fixMojibake(input: string): string {
  let out = input;
  for (const [pattern, replacement] of COMMON_MOJIBAKE) out = out.replace(pattern, replacement);
  return out;
}

function sanitizePaper(raw: string): string {
  let text = fixMojibake(raw || "");

  for (const marker of LEAK_MARKERS) {
    const idx = text.indexOf(marker);
    if (idx !== -1) {
      text = text.slice(0, idx);
      break;
    }
  }

  text = text
    .replace(/<w:[^>]+>/g, "")
    .replace(/<\\\/w:[^>]+>/g, "")
    .replace(/^\s*--\s*\d+\s+of\s+\d+\s*--\s*$/gim, "")
    .replace(/^\s*S\s*H\s*A\s*U\s*R\s*I[\sA-Z·\-]*$/gim, "")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return text;
}

function normalizeForPdf(text: string): string {
  return text
    .replace(/[^\x20-\x7E\nαβγ√×·→←–—’“”…]/g, " ")
    .replace(/[ ]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const width = font.widthOfTextAtSize(candidate, size);
    if (width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function classifyLine(rawLine: string): RenderLine {
  const line = rawLine.trim();

  if (!line) return { text: "", size: 11, bold: false, gapBefore: 0, gapAfter: 8 };

  if (/^SHAURI\b|^DAILY\s+TEST\b|^CBSE\b/i.test(line)) {
    return { text: line, size: 15, bold: true, gapBefore: 2, gapAfter: 6 };
  }

  if (/^SECTION\s+[A-E]\b/i.test(line)) {
    return { text: line, size: 12, bold: true, gapBefore: 10, gapAfter: 5 };
  }

  if (/^(GENERAL INSTRUCTIONS|Marks Summary|Vocabulary Test|Writing Task)\b/i.test(line)) {
    return { text: line, size: 11, bold: true, gapBefore: 8, gapAfter: 4 };
  }

  if (/^Q\d+[\.).]/i.test(line) || /^\(\d+\)/.test(line)) {
    return { text: line, size: 11, bold: true, gapBefore: 6, gapAfter: 2 };
  }

  if (/^\(?[A-D]\)/.test(line) || /^[A-D]\)/.test(line)) {
    return { text: `   ${line}`, size: 10.8, bold: false, gapBefore: 1, gapAfter: 1 };
  }

  if (/^Day\s*\d+|^Time Allowed:|^Maximum Marks:|^Subject:|^Class:/i.test(line)) {
    return { text: line, size: 10.5, bold: false, gapBefore: 1, gapAfter: 2 };
  }

  return { text: line, size: 11, bold: false, gapBefore: 1, gapAfter: 2 };
}

function drawHeader(page: PDFPage, boldFont: PDFFont, regularFont: PDFFont): number {
  let y = PAGE_HEIGHT - MARGIN_TOP;

  page.drawText("SHAURI — CBSE ALIGNED QUESTION PAPER", {
    x: MARGIN_X,
    y,
    size: 13,
    font: boldFont,
  });
  y -= 15;
  page.drawText("Board-style daily/revision assessment", {
    x: MARGIN_X,
    y,
    size: 9.8,
    font: regularFont,
  });
  y -= 10;

  page.drawLine({
    start: { x: MARGIN_X, y },
    end: { x: PAGE_WIDTH - MARGIN_X, y },
    thickness: 0.8,
  });

  return y - 16;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body = (await req.json()) as RequestBody;
    const input = body?.content ?? "";

    const cleaned = normalizeForPdf(sanitizePaper(input));
    if (!cleaned) {
      return NextResponse.json({ error: "No paper content available for PDF rendering." }, { status: 400 });
    }

    const pdfDoc = await PDFDocument.create();
    const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const bold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = drawHeader(page, bold, regular);

    const newPage = () => {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = drawHeader(page, bold, regular);
    };

    const ensure = (needed: number) => {
      if (y - needed < MARGIN_BOTTOM) newPage();
    };

    const lines = cleaned.split("\n");
    for (const rawLine of lines) {
      const style = classifyLine(rawLine);

      if (!style.text) {
        y -= style.gapAfter;
        continue;
      }

      y -= style.gapBefore;
      const font = style.bold ? bold : regular;
      const wrapped = wrapText(style.text, font, style.size, BODY_WIDTH);

      for (const w of wrapped) {
        ensure(style.size + 5);
        page.drawText(w, {
          x: MARGIN_X,
          y,
          size: style.size,
          font,
        });
        y -= style.size + 3.2;
      }

      y -= style.gapAfter;
    }

    const pageCount = pdfDoc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      const p = pdfDoc.getPage(i);
      const footer = `Page ${i + 1} of ${pageCount}`;
      p.drawLine({
        start: { x: MARGIN_X, y: 30 },
        end: { x: PAGE_WIDTH - MARGIN_X, y: 30 },
        thickness: 0.5,
      });
      p.drawText(footer, {
        x: PAGE_WIDTH / 2 - 24,
        y: 18,
        size: 9,
        font: regular,
      });
    }

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="shauri-exam-paper.pdf"',
      },
    });
  } catch (error) {
    console.error("PDF API Error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
