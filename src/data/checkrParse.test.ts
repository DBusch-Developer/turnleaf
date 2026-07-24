import { describe, test, expect } from 'vitest';
import {
  parseCheckrLines, parseCheckrDate, mapDisposition, toConvictionRecords, titleCase,
  type CheckrLine,
} from './checkrParse';

// ============================================================================
// Fixtures are SYNTHETIC. They reproduce the two column layouts seen in a real
// Checkr candidate report — one aligned, one vertically skewed by a row — with
// invented names, dates of birth and case numbers. No real report content is
// committed to this repository.
// ============================================================================

/** Aligned block: label and value share a visual row. */
const ALIGNED: CheckrLine[] = [
  { left: 'RECKLESS DRIVING', right: '' },
  { left: 'Case Number', right: 'CR-201900001' },
  { left: 'File Date', right: 'Jan 15, 2019' },
  { left: 'Court Jurisdiction', right: 'SUPERIOR COURT' },
  { left: 'County', right: 'TESTFORD' },
  { left: 'State', right: 'AZ' },
  { left: 'Full Name', right: 'JANE Q TESTPERSON' },
  { left: 'DOB', right: 'Jan 1, 1980' },
  { left: 'Charge', right: 'RECKLESS DRIVING' },
  { left: 'Charge Type', right: 'MISDEMEANOR' },
  { left: 'Disposition', right: 'GUILTY' },
  { left: 'Disposition Date', right: 'Jun 24, 2019' },
  { left: 'Other Sentencing Info', right: 'Probation: 1 YEAR; Restitution: $0.00; Fines:' },
  { left: '', right: '$250.50; Fees: $48.00' },
];

/**
 * Skewed block: the values start one row ABOVE their labels, so a row-by-row
 * read pairs "Case Number" with the court name. This is the layout that breaks
 * naive parsers, and the reason the parser reads columns instead of rows.
 */
const SKEWED: CheckrLine[] = [
  { left: 'CRIMINAL TRESPASS', right: 'CR-202000002' },
  { left: '', right: 'Jul 12, 2020' },
  { left: 'Case Number', right: 'JUSTICE COURT' },
  { left: 'File Date', right: 'TESTFORD' },
  { left: 'Court Jurisdiction', right: 'AZ' },
  { left: 'County', right: 'JANE Q TESTPERSON' },
  { left: 'State', right: 'Jan 1, 1980' },
  { left: 'Full Name', right: 'CRIMINAL TRESPASS' },
  { left: 'DOB', right: 'FELONY' },
  { left: 'Charge', right: 'GUILTY' },
  { left: 'Charge Type', right: 'Feb 21, 2021' },
  { left: 'Disposition', right: 'Prison: 2 YEARS; Restitution: $100.00; Fines: $0.00; Fees: $0.00' },
  { left: 'Disposition Date', right: '' },
  { left: 'Other Sentencing Info', right: '' },
];

const NOISE: CheckrLine[] = [
  { left: '4/5/26, 10:48 AM', right: 'Candidate Portal' },
  { left: 'County Searches', right: 'Consider' },
  { left: 'Testford, AZ', right: 'Consider' },
  { left: 'https://candidate.checkr.com/reports/abc123', right: '' },
  { left: '', right: '2/5' },
];

describe('parseCheckrDate', () => {
  test.each([
    ['Feb 21, 2023', '2023-02-21'],
    ['Jun 24, 2019', '2019-06-24'],
    ['Jan 1, 1980', '1980-01-01'],
    ['Nov 05, 1986', '1986-11-05'],
  ])('%s -> %s', (input, expected) => {
    expect(parseCheckrDate(input)).toBe(expected);
  });

  test.each(['', 'sometime in 2019', '2019-06-24', 'Foo 1, 2019', '24 Jun 2019'])(
    'refuses %s', input => expect(parseCheckrDate(input)).toBeNull());
});

describe('parseCheckrLines — layouts', () => {
  test('parses an aligned record', () => {
    const { records, problems } = parseCheckrLines(ALIGNED);
    expect(problems).toEqual([]);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      caseNumber: 'CR-201900001', state: 'AZ', county: 'TESTFORD',
      charge: 'RECKLESS DRIVING', chargeType: 'misdemeanor',
      disposition: 'GUILTY', dispositionDate: '2019-06-24',
    });
  });

  test('parses a SKEWED record — the layout that breaks row-by-row reading', () => {
    const { records, problems } = parseCheckrLines(SKEWED);
    expect(problems).toEqual([]);
    expect(records).toHaveLength(1);
    // Row-by-row would have given caseNumber 'JUSTICE COURT' and no valid date.
    expect(records[0]).toMatchObject({
      caseNumber: 'CR-202000002', state: 'AZ',
      charge: 'CRIMINAL TRESPASS', chargeType: 'felony',
      disposition: 'GUILTY', dispositionDate: '2021-02-21',
    });
  });

  test('parses both layouts in one document, in order', () => {
    const { records, problems } = parseCheckrLines([...NOISE, ...ALIGNED, ...SKEWED]);
    expect(problems).toEqual([]);
    expect(records.map(r => r.caseNumber)).toEqual(['CR-201900001', 'CR-202000002']);
  });

  test('page furniture never becomes a field', () => {
    const { records } = parseCheckrLines([...NOISE, ...ALIGNED]);
    expect(records[0].caseNumber).toBe('CR-201900001');
    expect(JSON.stringify(records)).not.toMatch(/Candidate Portal|checkr\.com|Consider/);
  });

  test('folds a wrapped sentencing blob back together', () => {
    const { records } = parseCheckrLines(ALIGNED);
    expect(records[0].sentencing).toContain('Fines: $250.50');
    expect(records[0].fines).toBe(250.5);
    expect(records[0].fees).toBe(48);
    expect(records[0].restitution).toBe(0);
    expect(records[0].probationMentioned).toBe(true);
    expect(records[0].prisonMentioned).toBe(false);
  });

  test('money absent from the blob is null, NOT zero', () => {
    const lines = ALIGNED.map(l =>
      l.left === 'Other Sentencing Info' ? { ...l, right: 'Probation: 1 YEAR;' } : l)
      .filter(l => l.right !== '$250.50; Fees: $48.00');
    const { records } = parseCheckrLines(lines);
    expect(records[0].fines).toBeNull();
    expect(records[0].restitution).toBeNull();
  });
});

describe('parseCheckrLines — refuses rather than guesses', () => {
  const broken = (label: string, value: string) =>
    parseCheckrLines(ALIGNED.map(l => (l.left === label ? { ...l, right: value } : l)));

  test('an unreadable charge type becomes a problem naming that field', () => {
    const { records, problems } = broken('Charge Type', 'TRAFFIC VIOLATION');
    expect(records).toEqual([]);
    expect(problems[0].reason).toMatch(/Charge Type/i);
    expect(problems[0].reason).toMatch(/TRAFFIC VIOLATION/);
    expect(problems[0].caseNumber).toBe('CR-201900001');
  });

  test('an unreadable disposition date becomes a problem naming that field', () => {
    const { records, problems } = broken('Disposition Date', 'sometime in 2019');
    expect(records).toEqual([]);
    expect(problems[0].reason).toMatch(/Disposition Date/i);
  });

  test('a bad state code becomes a problem naming that field', () => {
    const { records, problems } = broken('State', 'Arizona');
    expect(records).toEqual([]);
    expect(problems[0].reason).toMatch(/State/i);
  });

  test('a truncated record is reported rather than silently dropped', () => {
    const { records, problems } = parseCheckrLines(ALIGNED.slice(0, 8));
    expect(records).toEqual([]);
    expect(problems.length).toBeGreaterThan(0);
    expect(problems[0].reason).toMatch(/ended before|Could not read/i);
  });

  test('a record whose fields are all readable is never demoted to a problem', () => {
    const { records, problems } = parseCheckrLines(ALIGNED);
    expect(problems).toEqual([]);
    expect(records).toHaveLength(1);
  });

  test('an empty document yields nothing and complains about nothing', () => {
    expect(parseCheckrLines([])).toEqual({ records: [], problems: [] });
  });
});

describe('mapDisposition', () => {
  test.each([
    ['GUILTY', 'convicted'], ['Convicted', 'convicted'], ['PLEA OF GUILTY', 'convicted'],
    ['NO CONTEST', 'convicted'], ['DISMISSED', 'dismissed'], ['NOLLE PROSEQUI', 'dismissed'],
    ['NOT GUILTY', 'acquitted'], ['ACQUITTED', 'acquitted'],
    ['DEFERRED ADJUDICATION', 'deferred'], ['ADJUDICATION WITHHELD', 'deferred'],
    ['SOMETHING ELSE', 'unknown'],
  ])('%s -> %s', (input, expected) => expect(mapDisposition(input)).toBe(expected));

  test('"NOT GUILTY" is not read as guilty', () => {
    expect(mapDisposition('NOT GUILTY')).toBe('acquitted');
  });
});

describe('toConvictionRecords — identity is dropped', () => {
  test('carries no name, date of birth, or other identifier', () => {
    const { records } = parseCheckrLines([...ALIGNED, ...SKEWED]);
    const out = toConvictionRecords(records);
    const blob = JSON.stringify(out);
    expect(blob).not.toMatch(/TESTPERSON/i);
    expect(blob).not.toMatch(/JANE/i);
    expect(blob).not.toMatch(/1980-01-01|Jan 1, 1980/);
    for (const r of out) {
      expect(r).not.toHaveProperty('full_name');
      expect(r).not.toHaveProperty('dob');
    }
  });

  test('maps the fields the engine actually reads', () => {
    const out = toConvictionRecords(parseCheckrLines(ALIGNED).records);
    expect(out[0]).toMatchObject({
      id: 'CR-201900001', state: 'AZ', charge_type: 'misdemeanor',
      disposition: 'convicted', disposition_date: '2019-06-24',
    });
  });

  test('leaves unknown facts undefined rather than assuming them', () => {
    // A Checkr report shows amounts IMPOSED, never whether they are PAID, and
    // says nothing about probation completion. Assuming any of these would
    // manufacture an eligibility answer.
    const out = toConvictionRecords(parseCheckrLines(ALIGNED).records);
    expect(out[0].restitution_paid).toBeUndefined();
    expect(out[0].fines_paid).toBeUndefined();
    expect(out[0].probation_status).toBeUndefined();
    expect(out[0].prison_sentenced).toBeUndefined();
  });
});

describe('titleCase', () => {
  test('softens Checkr shouting without losing the charge', () => {
    expect(titleCase('AGGRAVATED DRIVING UNDER THE INFLUENCE'))
      .toBe('Aggravated Driving under the Influence');
    expect(titleCase('DRIVE WITH LICENSE SUSPENDED, REVOKED OR CANCELLED'))
      .toBe('Drive with License Suspended, Revoked or Cancelled');
  });
});
