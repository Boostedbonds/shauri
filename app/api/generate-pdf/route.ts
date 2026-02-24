import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts } from "pdf-lib";

const PAGE_WIDTH   = 595;  // A4
const PAGE_HEIGHT  = 842;
const MARGIN       = 40;
const FONT_SIZE    = 11;
const LINE_HEIGHT  = 16;
const MAX_LINE_WIDTH = PAGE_WIDTH - MARGIN * 2; // 515pt usable width

// ─────────────────────────────────────────────────────────────
// Wrap a single line of text into multiple lines that fit within
// MAX_LINE_WIDTH at the given font size.
// ─────────────────────────────────────────────────────────────
function wrapLine(text: string, font: any, size: number): string[] {
  // Strip non-latin characters that Helvetica can't render
  // (emoji, Devanagari, etc.) — replace with a safe placeholder
  const safe = text.replace(/[^\x00-\xFF]/g, " ");

  const words  = safe.split(" ");
  const lines: string[] = [];
  let current  = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    let width = 0;
    try {
      width = font.widthOfTextAtSize(candidate, size);
    } catch {
      width = candidate.length * size * 0.5; // rough fallback
    }

    if (width > MAX_LINE_WIDTH && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

export async function POST(req: NextRequest) {
  try {
    const body    = await req.json();
    const content: string = body?.content || "No content";

    const pdfDoc  = await PDFDocument.create();
    const font    = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // ── Add first page ─────────────────────────────────────
    let page  = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y     = PAGE_HEIGHT - MARGIN;

    function newPage() {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y    = PAGE_HEIGHT - MARGIN;
    }

    function ensureSpace() {
      if (y < MARGIN + LINE_HEIGHT) newPage();
    }

    // ── Render each line ────────────────────────────────────
    const rawLines = content.split("\n");

    for (const rawLine of rawLines) {
      // Choose bold font for section headers and paper header lines
      const isBold =
        /^(SECTION|Subject|Class|Board|Time|Maximum|━|─|Q\d+[–—])/.test(rawLine.trim()) ||
        rawLine.trim().startsWith("📋") ||
        rawLine.trim().startsWith("📊");

      const wrappedLines = wrapLine(rawLine, font, FONT_SIZE);

      for (const line of wrappedLines) {
        ensureSpace();
        try {
          page.drawText(line, {
            x:    MARGIN,
            y,
            size: FONT_SIZE,
            font: isBold ? boldFont : font,
          });
        } catch {
          // Skip any line that still fails to render (e.g. corrupt chars)
        }
        y -= LINE_HEIGHT;
      }
    }

    // ── Add page numbers ────────────────────────────────────
    const pageCount = pdfDoc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      const p    = pdfDoc.getPage(i);
      const label = `Page ${i + 1} of ${pageCount}`;
      p.drawText(label, {
        x:    PAGE_WIDTH / 2 - 30,
        y:    20,
        size: 9,
        font,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const buffer   = Buffer.from(pdfBytes);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": "attachment; filename=shauri-exam-paper.pdf",
      },
    });

  } catch (error) {
    console.error("PDF API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}