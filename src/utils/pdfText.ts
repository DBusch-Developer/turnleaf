// ============================================================================
// PDF -> two-column text lines, IN THE BROWSER.
//
// This exists so a person can drop their own background-check PDF into Turnleaf
// without the file going anywhere. pdf.js runs in the page; the bytes are read
// with FileReader, parsed in a worker, and never touch a network. There is no
// upload endpoint, because there is nothing to upload to — see ADR-0006.
//
// Why columns rather than lines: Checkr lays each record out as a label column
// and a value column, and on some records the two are vertically offset by a
// row. Glyph positions make the split exact — we group items into visual rows
// by their y coordinate, then split each row at its widest internal gap. The
// parser in ../data/checkrParse then reads the two columns independently, which
// is what makes the offset harmless.
// ============================================================================

import type { CheckrLine } from '../data/checkrParse';

/** Rows within this many points of each other are the same visual line. */
const ROW_TOLERANCE = 3;

/** A horizontal gap this wide is a column break rather than a word space. */
const COLUMN_GAP = 20;

interface Glyph { str: string; x: number; y: number }

/**
 * Extract two-column lines from a PDF file, entirely client-side.
 *
 * @throws if the file is not a readable PDF. Callers should show the message;
 *         there is no partial-success mode, because a half-read report would
 *         produce a half-right screening.
 */
export async function extractCheckrLines(file: File): Promise<CheckrLine[]> {
  // Imported lazily so pdf.js is only fetched when someone actually uploads —
  // it is by far the largest dependency in the bundle.
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();

  const bytes = new Uint8Array(await file.arrayBuffer());
  const doc = await pdfjs.getDocument({ data: bytes }).promise;

  const lines: CheckrLine[] = [];
  for (let pageNo = 1; pageNo <= doc.numPages; pageNo++) {
    const page = await doc.getPage(pageNo);
    const content = await page.getTextContent();

    const glyphs: Glyph[] = content.items
      .filter((it): it is typeof it & { str: string; transform: number[] } =>
        typeof (it as { str?: unknown }).str === 'string')
      .map(it => ({ str: it.str, x: it.transform[4], y: it.transform[5] }))
      .filter(g => g.str.trim() !== '');

    lines.push(...rowsToLines(glyphs));
  }

  // Release the worker's copy of the document as soon as we have the text —
  // the bytes are a person's background check and should not sit in memory
  // longer than the parse needs. (`cleanup` is the public API in pdf.js 6.)
  await doc.cleanup();
  return lines;
}

/** Group glyphs into visual rows (top to bottom) and split each into columns. */
export function rowsToLines(glyphs: Glyph[]): CheckrLine[] {
  const rows: Glyph[][] = [];
  for (const g of [...glyphs].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const row = rows[rows.length - 1];
    if (row && Math.abs(row[0].y - g.y) <= ROW_TOLERANCE) row.push(g);
    else rows.push([g]);
  }

  return rows.map(row => {
    const sorted = [...row].sort((a, b) => a.x - b.x);

    // Split at the widest gap, if that gap is wide enough to be a column break.
    let splitAt = -1;
    let widest = COLUMN_GAP;
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i].x - (sorted[i - 1].x + estimatedWidth(sorted[i - 1]));
      if (gap > widest) { widest = gap; splitAt = i; }
    }

    if (splitAt === -1) {
      // One column only. Which one it is depends on where it sits: Checkr's
      // value column starts around 40% across, and a wrapped value line has no
      // label beside it — treating it as a left-column string would lose it.
      const text = sorted.map(g => g.str).join(' ').replace(/\s+/g, ' ').trim();
      return sorted[0].x > 200 ? { left: '', right: text } : { left: text, right: '' };
    }

    const join = (gs: Glyph[]) => gs.map(g => g.str).join(' ').replace(/\s+/g, ' ').trim();
    return { left: join(sorted.slice(0, splitAt)), right: join(sorted.slice(splitAt)) };
  });
}

/** pdf.js does not give a width per item here; approximate from the glyph run. */
function estimatedWidth(g: Glyph): number {
  return g.str.length * 5;
}
