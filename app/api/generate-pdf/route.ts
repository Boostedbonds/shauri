import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, StandardFonts, PDFFont } from "pdf-lib";

// ─── Constants ────────────────────────────────────────────────
const PAGE_WIDTH     = 595;   // A4
const PAGE_HEIGHT    = 842;
const MARGIN         = 40;
const FONT_SIZE      = 11;
const LINE_HEIGHT    = 16;
const MAX_LINE_WIDTH = PAGE_WIDTH - MARGIN * 2; // 515pt usable width

// ─── Types ────────────────────────────────────────────────────
interface RequestBody {
  content?: string;
}

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Strip non-Latin-1 characters (emoji, Devanagari, etc.) that
 * Helvetica cannot render, then word-wrap to fit MAX_LINE_WIDTH.
 */
function wrapLine(text: string, font: PDFFont, size: number): string[] {
  const safe  = text.replace(/[^\x00-\xFF]/g, " ");
  const words = safe.split(" ");
  const lines: string[] = [];
  let   current         = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    let   width     = 0;

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

/** Returns true for lines that should be rendered in bold. */
function isBoldLine(raw: string): boolean {
  const t = raw.trim();
  return (
    /^(SECTION|Subject|Class|Board|Time|Maximum|━|─|Q\d+[–—])/.test(t) ||
    t.startsWith("📋") ||
    t.startsWith("📊")
  );
}

// ─── Route Handler ────────────────────────────────────────────
export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const body        = (await req.json()) as RequestBody;
    const content     = body?.content ?? "No content";

    const pdfDoc      = await PDFDocument.create();
    const font        = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // ── Page state ──────────────────────────────────────────
    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y    = PAGE_HEIGHT - MARGIN;

    const newPage = (): void => {
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y    = PAGE_HEIGHT - MARGIN;
    };

    const ensureSpace = (): void => {
      if (y < MARGIN + LINE_HEIGHT) newPage();
    };

    // ── Render lines ────────────────────────────────────────
    for (const rawLine of content.split("\n")) {
      const bold         = isBoldLine(rawLine);
      const wrappedLines = wrapLine(rawLine, font, FONT_SIZE);

      for (const line of wrappedLines) {
        ensureSpace();
        try {
          page.drawText(line, {
            x:    MARGIN,
            y,
            size: FONT_SIZE,
            font: bold ? boldFont : font,
          });
        } catch {
          // Skip lines that still contain un-renderable characters
        }
        y -= LINE_HEIGHT;
      }
    }

    // ── Page numbers ────────────────────────────────────────
    const pageCount = pdfDoc.getPageCount();
    for (let i = 0; i < pageCount; i++) {
      pdfDoc.getPage(i).drawText(`Page ${i + 1} of ${pageCount}`, {
        x:    PAGE_WIDTH / 2 - 30,
        y:    20,
        size: 9,
        font,
      });
    }

    // ── Respond ─────────────────────────────────────────────
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": 'attachment; filename="shauri-exam-paper.pdf"',
      },
    });

  } catch (error: unknown) {
    console.error("PDF API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 },
    );
  }
}