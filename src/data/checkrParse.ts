// ============================================================================
// CHECKR REPORT PARSER — candidate-portal PDF -> screening records.
//
// Turns a Checkr candidate report into the ConvictionRecords the screening
// engine takes. Two rules govern everything in here:
//
//   1. IDENTITY NEVER LEAVES THIS FILE. A Checkr report carries a name, a date
//      of birth, a phone number, an email, a driver-licence number and the last
//      four of an SSN. The screening engine needs none of it. Those fields are
//      read only to be discarded — `toConvictionRecords` cannot return them,
//      because they are not on its return type. Nothing here logs, stores, or
//      transmits anything; the caller runs it in the browser and keeps the file
//      on the person's own machine.
//
//   2. REFUSE RATHER THAN GUESS. A misparsed charge type or disposition date
//      silently produces a WRONG eligibility answer for a real person, and a
//      wrong answer here is worse than no answer. Every record is validated
//      after parsing; anything that does not validate is returned as a
//      `CheckrParseProblem` for the person to enter by hand, never as a
//      best-effort record.
//
// THE LAYOUT PROBLEM. Checkr's PDF puts field labels in a left column and
// values in a right column, and on some records the two columns are vertically
// offset — the values start a row ABOVE their labels, so reading line-by-line
// pairs "Case Number" with the court name and everything after it is shifted.
// Observed in real reports: some record blocks align, others are skewed by one
// row. Both appear in the same document.
//
// The fix is to stop reading rows and read COLUMNS: collect the label column in
// document order, collect the value column in document order, and zip them. The
// label vocabulary is fixed and always appears in the same order, so the zip is
// stable whether or not the columns line up visually. `Other Sentencing Info`
// is the only wrapping field, and it is always last in a record, so its
// continuation lines are folded back into it.
// ============================================================================

import type { ConvictionRecord } from './screening';

/** One visual row of the PDF, already split into its two columns. */
export interface CheckrLine {
  left: string;
  right: string;
}

/** The 12 labels a county-search record carries, in the order Checkr emits. */
export const RECORD_LABELS = [
  'Case Number',
  'File Date',
  'Court Jurisdiction',
  'County',
  'State',
  'Full Name',
  'DOB',
  'Charge',
  'Charge Type',
  'Disposition',
  'Disposition Date',
  'Other Sentencing Info',
] as const;

const LABEL_SET = new Set<string>(RECORD_LABELS);

/** Fields we keep. Full Name and DOB are parsed and deliberately dropped. */
export interface CheckrParsedRecord {
  caseNumber: string;
  county: string;
  state: string;
  charge: string;
  chargeType: 'felony' | 'misdemeanor' | 'infraction';
  disposition: string;
  dispositionDate: string;      // ISO yyyy-mm-dd
  sentencing: string;           // raw "Other Sentencing Info" blob
  /** Parsed out of `sentencing` where present — null when not stated. */
  restitution: number | null;
  fines: number | null;
  fees: number | null;
  probationMentioned: boolean;
  prisonMentioned: boolean;
}

/** A record we could not parse with confidence. Never screened; shown instead. */
export interface CheckrParseProblem {
  caseNumber: string | null;
  reason: string;
  raw: string;
}

export interface CheckrParseResult {
  records: CheckrParsedRecord[];
  problems: CheckrParseProblem[];
}

// Lines that are page furniture rather than record content.
const NOISE = [
  /^https?:\/\//i,
  /Candidate Portal/i,
  /^\d+\/\d+$/,                       // page numbers "2/5"
  /^(Clear|Consider|Complete|Pending)$/i,
  /^Report (status|information|ID)/i,
  /^County Searches$/i,
  /^(SSN Trace|Sex Offender Search|Global Watchlist Search|National Search|Federal Search|Background Report)$/i,
  /^Motor Vehicle Report/i,
  /Searched OFAC/i,
];

const isNoise = (s: string) => !s || NOISE.some(re => re.test(s.trim()));

const MONTHS: Record<string, string> = {
  jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
  jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
};

/** "Feb 21, 2023" -> "2023-02-21". Returns null on anything else. */
export function parseCheckrDate(s: string): string | null {
  const m = /^([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),\s*(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const mm = MONTHS[m[1].toLowerCase()];
  if (!mm) return null;
  const dd = m[2].padStart(2, '0');
  return `${m[3]}-${mm}-${dd}`;
}

/** "$371.88" -> 371.88. Absent -> null (NOT zero — unknown is not nothing). */
function money(blob: string, field: string): number | null {
  const m = new RegExp(`${field}\\s*:\\s*\\$?([\\d,]+(?:\\.\\d{2})?)`, 'i').exec(blob);
  if (!m) return null;
  const n = Number(m[1].replace(/,/g, ''));
  return Number.isFinite(n) ? n : null;
}

function normaliseChargeType(s: string): CheckrParsedRecord['chargeType'] | null {
  const t = s.trim().toLowerCase();
  if (t === 'felony') return 'felony';
  if (t === 'misdemeanor' || t === 'misdemeanour') return 'misdemeanor';
  if (t === 'infraction' || t === 'petty offense') return 'infraction';
  return null;
}

/**
 * What each of the twelve fields looks like, in Checkr's order. Used to tell a
 * real field value from a wrapped fragment of the value before it.
 *
 * Deliberately loose where the content is free text (Charge, Disposition,
 * Other Sentencing Info) and tight where it is not — the tight ones (case
 * number, state, charge type, the dates) are what re-synchronise the alignment
 * when a wrap has thrown it off, and they are also the fields whose misreading
 * would change someone's eligibility answer.
 */
/** How many wrapped lines one field may span. Real reports use up to four. */
const MAX_WRAP_LINES = 6;

const truncate = (s: string, n = 60) => (s.length > n ? `${s.slice(0, n)}…` : s);

const isDate = (s: string) => parseCheckrDate(s) !== null;
const FIELD_SHAPES: Array<(s: string) => boolean> = [
  s => /^[A-Z]{1,4}-\s?\d{4,}$/i.test(s.trim()),                    // Case Number
  isDate,                                                            // File Date
  s => /court|division|tribunal/i.test(s),                           // Court Jurisdiction
  s => /^[A-Za-z][A-Za-z .'\-]*$/.test(s.trim()) && !isDate(s),      // County
  s => /^[A-Z]{2}$/.test(s.trim()),                                  // State
  s => /^[A-Za-z][A-Za-z .'\-]*$/.test(s.trim()) && !isDate(s),      // Full Name
  isDate,                                                            // DOB
  s => s.trim().length > 0,                                          // Charge
  s => normaliseChargeType(s) !== null,                              // Charge Type
  s => s.trim().length > 0 && !isDate(s),                            // Disposition
  isDate,                                                            // Disposition Date
  s => s.trim().length > 0,                                          // Other Sentencing Info
];

const SECTION_START = /^County Searches$/i;
const SECTION_END = /^(Motor Vehicle Report|Checkr's reporting guidelines|Education Verification|Employment Verification)/i;

/**
 * Keep only the county-criminal-search section.
 *
 * Everything before it is the identity panel; everything after is the motor
 * vehicle report and Checkr's boilerplate, both of which carry their own
 * label/value columns that would corrupt the zip.
 *
 * If the start marker is absent — a differently-shaped report — the whole
 * document is returned and per-record validation remains the safety net.
 */
export function sliceCountySection(lines: CheckrLine[]): CheckrLine[] {
  const start = lines.findIndex(l => SECTION_START.test(l.left.trim()) || SECTION_START.test(l.right.trim()));
  if (start === -1) return lines;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(l => SECTION_END.test(l.left.trim()) || SECTION_END.test(l.right.trim()));
  return end === -1 ? rest : rest.slice(0, end);
}

/**
 * Turn `pdftotext -layout` output into columns. Used by tests and any offline
 * path; the browser uses pdf.js glyph positions instead, which are exact.
 */
export function linesFromLayoutText(text: string): CheckrLine[] {
  return text.split(/\r?\n/).map(raw => {
    const parts = raw.split(/\s{2,}/).filter(s => s.trim() !== '');
    if (parts.length === 0) return { left: '', right: '' };
    if (parts.length === 1) {
      // A lone segment belongs to whichever column it is physically under.
      const indent = raw.search(/\S/);
      return indent > 40 ? { left: '', right: parts[0] } : { left: parts[0], right: '' };
    }
    return { left: parts[0], right: parts.slice(1).join(' ') };
  });
}

/**
 * Parse the county-search records out of a Checkr candidate report.
 *
 * Reads columns rather than rows (see the header note), then validates each
 * record and demotes anything doubtful into `problems`.
 */
export function parseCheckrLines(input: CheckrLine[]): CheckrParseResult {
  // --- narrow to the county-search section FIRST --------------------------
  // Page 1 of a Checkr report is a "Report information" panel: first name, last
  // name, date of birth, phone, email, zipcode, SSN, licence, report id. Those
  // are values in the right-hand column too, and left in the stream they shift
  // every record's fields by however many of them the report happens to carry.
  // (They also happen to be exactly the fields we want nowhere near this.)
  const lines = sliceCountySection(input);

  // --- collect the two streams -------------------------------------------
  const labels: string[] = [];
  const values: string[] = [];

  for (const line of lines) {
    const left = line.left.trim();
    const right = line.right.trim();

    if (LABEL_SET.has(left)) labels.push(left);
    else if (!isNoise(left) && left && !right) {
      // A lone left-column string with no value beside it: a record's charge
      // heading. Not a label and not a value — Checkr repeats it in the Charge
      // field, so it carries no information we need.
    }

    // Every right-column string is a candidate value. Wrapped fragments are NOT
    // merged here — the schema alignment below decides what is a wrap, because
    // only it knows which field the fragment failed to be.
    if (!isNoise(right) && right) values.push(right);
  }

  // --- align the value stream against the field schema --------------------
  // Values cannot simply be chunked twelve at a time: a long charge name or a
  // sentencing blob wraps onto extra lines, and a wrapped fragment is an extra
  // value that shifts every field after it. Instead each value is matched
  // against the field it is supposed to be (see FIELD_SHAPES); a value that
  // does not fit its field is a wrap, and is folded back into the field before
  // it. That makes the parse self-checking — the same property that lets us
  // refuse a record instead of guessing at it.
  const records: CheckrParsedRecord[] = [];
  const problems: CheckrParseProblem[] = [];

  const expectedRecords = Math.floor(labels.length / RECORD_LABELS.length);
  let cursor = 0;
  let guard = 0;

  while (cursor < values.length && guard++ < 10_000) {
    // A record begins at the next thing that looks like a case number.
    while (cursor < values.length && !FIELD_SHAPES[0](values[cursor])) cursor++;
    if (cursor >= values.length) break;

    const field: string[] = [];
    let failedAt = -1;
    let sawInstead: string | null = null;

    for (let j = 0; j < RECORD_LABELS.length; j++) {
      // The first value that isn't the field we want is the one worth naming if
      // this record turns out to be unreadable — it is where the report and our
      // expectation first diverged. Later ones are just the wreckage.
      let firstRejected: string | null = null;
      let merged = 0;

      // Fold wrapped fragments into the field before this one. Bounded: a real
      // wrap is a line or two, so an unbounded merge here would swallow the
      // whole record when a field is genuinely malformed rather than wrapped.
      while (cursor < values.length && !FIELD_SHAPES[j](values[cursor]) && j > 0 && merged < MAX_WRAP_LINES) {
        if (firstRejected === null) firstRejected = values[cursor];
        field[j - 1] = `${field[j - 1]} ${values[cursor]}`.trim();
        cursor++;
        merged++;
      }
      if (cursor >= values.length || !FIELD_SHAPES[j](values[cursor])) {
        failedAt = j;
        sawInstead = firstRejected ?? (cursor < values.length ? values[cursor] : null);
        break;
      }
      field[j] = values[cursor++];
    }

    const raw = RECORD_LABELS.map((l, j) => `${l}: ${field[j] ?? ''}`).join(' | ');
    if (failedAt >= 0) {
      // Name the field. "Could not read this record" sends someone back to a
      // five-page PDF; "could not read the Charge Type" sends them to one line.
      const label = RECORD_LABELS[failedAt];
      problems.push({
        caseNumber: field[0] ?? null,
        reason: sawInstead === null
          ? `The record ended before its "${label}" field was found.`
          : `Could not read the "${label}" field — found "${truncate(sawInstead)}" where that field should be.`,
        raw,
      });
      continue;
    }

    // Trailing wrap lines of the last field (sentencing runs to four lines in
    // real reports) belong to it, up to the next record.
    while (cursor < values.length && !FIELD_SHAPES[0](values[cursor])) {
      field[11] = `${field[11]} ${values[cursor]}`.trim();
      cursor++;
    }

    const [caseNumber, , , county, state, , , charge, chargeTypeRaw, disposition, dispDateRaw, sentencing] = field;

    const chargeType = normaliseChargeType(chargeTypeRaw);
    const dispositionDate = parseCheckrDate(dispDateRaw);

    // Validation. Anything doubtful becomes a problem, never a guess: these
    // three fields decide the eligibility answer.
    if (!chargeType) {
      problems.push({ caseNumber, reason: `Charge type "${chargeTypeRaw}" is not felony, misdemeanor, or infraction.`, raw });
      continue;
    }
    if (!dispositionDate) {
      problems.push({ caseNumber, reason: `Could not read the disposition date from "${dispDateRaw}".`, raw });
      continue;
    }
    if (!/^[A-Z]{2}$/.test(state.trim())) {
      problems.push({ caseNumber, reason: `"${state}" is not a two-letter state code.`, raw });
      continue;
    }

    records.push({
      caseNumber, county: county.trim(), state: state.trim(), charge: charge.trim(),
      chargeType, disposition: disposition.trim(), dispositionDate,
      sentencing: sentencing.trim(),
      restitution: money(sentencing, 'Restitution'),
      fines: money(sentencing, 'Fines'),
      fees: money(sentencing, 'Fees'),
      probationMentioned: /probation/i.test(sentencing),
      prisonMentioned: /prison|jail/i.test(sentencing),
    });
  }

  // Cross-check: the label column says how many records the report contains.
  // If alignment produced a different number, say so rather than quietly
  // handing back a short list that looks complete.
  const accounted = records.length + problems.length;
  if (expectedRecords > 0 && accounted !== expectedRecords) {
    problems.push({
      caseNumber: null,
      reason: `The report lists ${expectedRecords} record(s) but ${accounted} could be read. Check the report against what is shown and add anything missing by hand.`,
      raw: `labels=${labels.length} values=${values.length}`,
    });
  }

  return { records, problems };
}

/** Checkr disposition wording -> the engine's disposition domain. */
export function mapDisposition(d: string): ConvictionRecord['disposition'] {
  const t = d.trim().toLowerCase();
  if (/guilty|convicted|plea|no contest|nolo/.test(t) && !/not guilty/.test(t)) return 'convicted';
  if (/dismiss|nolle|no.?bill|declined/.test(t)) return 'dismissed';
  if (/acquit|not guilty/.test(t)) return 'acquitted';
  if (/defer|diversion|withheld/.test(t)) return 'deferred';
  return 'unknown';
}

/**
 * Parsed records -> engine records. IDENTITY IS DROPPED HERE: the return type
 * has no name, no date of birth, no licence number, and this function never
 * receives them.
 *
 * Fields the engine wants that a Checkr report does NOT contain — probation
 * completion, prison discharge, whether money is PAID (the report shows amounts
 * imposed, not balances) — are left undefined rather than assumed. The wizard
 * asks for them; assuming any of them here would manufacture an answer.
 */
export function toConvictionRecords(parsed: CheckrParsedRecord[]): ConvictionRecord[] {
  return parsed.map((p, i) => ({
    id: p.caseNumber || `checkr_${i}`,
    state: p.state,
    title: titleCase(p.charge),
    charge_type: p.chargeType,
    disposition: mapDisposition(p.disposition),
    disposition_date: p.dispositionDate,
  } as ConvictionRecord));
}

/** Checkr shouts its charges in caps; soften for display without losing meaning. */
export function titleCase(s: string): string {
  return s.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase())
    .replace(/\bOf\b/g, 'of').replace(/\bOr\b/g, 'or').replace(/\bThe\b/g, 'the')
    .replace(/\bUnder\b/g, 'under').replace(/\bWith\b/g, 'with').replace(/\bA\b/g, 'a')
    .replace(/\bDui\b/g, 'DUI').replace(/^./, c => c.toUpperCase());
}
