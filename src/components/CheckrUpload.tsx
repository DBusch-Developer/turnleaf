"use client";

// ============================================================================
// UPLOAD YOUR OWN BACKGROUND CHECK.
//
// The file never leaves this browser. It is read with FileReader, parsed by
// pdf.js in a worker on this page, reduced to charge / type / disposition /
// date / state, and handed straight to the screening engine. There is no
// upload endpoint. Name, date of birth, phone, email, licence number and SSN
// are read past and discarded by the parser — see ../data/checkrParse.
//
// What is shown back is deliberately complete: every record found, every record
// that could NOT be read, and every fact the report does not contain. A report
// says what you were charged with; it does not say whether you finished
// probation or paid a balance, and those decide the answer.
// ============================================================================

import React, { useState } from 'react';
import type { ConvictionRecord } from './EligibilityWizard';
import {
  parseCheckrLines, toConvictionRecords, titleCase,
  type CheckrParsedRecord, type CheckrParseProblem,
} from '../data/checkrParse';
import { extractCheckrLines } from '../utils/pdfText';
import { UploadCloud, ShieldCheck, AlertTriangle, ArrowRight, FileText } from 'lucide-react';

interface Props {
  onRunScreening: (records: ConvictionRecord[]) => void;
}

/**
 * Rendered INSIDE the Checkr panel (CheckrReportDemo), as the "Upload my own
 * report" mode beside the sample reports. It is a content block, not a screen:
 * the panel owns the overlay, the top bar and the close control, so this must
 * not paint its own chrome or it ends up floating over the page behind it.
 */
export default function CheckrUpload({ onRunScreening }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<CheckrParsedRecord[] | null>(null);
  const [problems, setProblems] = useState<CheckrParseProblem[]>([]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError(null); setRecords(null); setProblems([]);
    try {
      const parsed = parseCheckrLines(await extractCheckrLines(file));
      setRecords(parsed.records);
      setProblems(parsed.problems);
      if (parsed.records.length === 0 && parsed.problems.length === 0) {
        setError('No criminal records were found in that PDF. If your report shows records under "County Searches", it may be a layout we have not seen — you can still enter them by hand.');
      }
    } catch (e) {
      setError(e instanceof Error ? `Could not read that file: ${e.message}` : 'Could not read that file.');
    } finally {
      setBusy(false);
    }
  }

  const card: React.CSSProperties = {
    border: '1px solid var(--color-card-border)', borderRadius: '16px',
    padding: '1.25rem', background: 'var(--color-bg-alt)', marginBottom: '1rem',
  };

  return (
    <div>
      {/* The privacy claim, stated plainly and specifically. */}
      <div style={{ ...card, display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
        <ShieldCheck size={22} style={{ color: 'var(--color-primary)', flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
          <strong>This file does not leave your device.</strong> It is opened and read here in your
          browser — there is nowhere to upload it to. Turnleaf keeps only the charge, its level, how
          the case ended and the date. Your name, date of birth, phone number, email, licence number
          and Social Security digits are skipped over and never stored, sent, or shown.
        </div>
      </div>

      <label style={{ ...card, display: 'block', textAlign: 'center', cursor: busy ? 'wait' : 'pointer', borderStyle: 'dashed' }}>
        <UploadCloud size={30} style={{ color: 'var(--color-primary)' }} />
        <div style={{ fontWeight: 600, marginTop: '0.5rem' }}>
          {busy ? 'Reading your report…' : 'Choose your Checkr report (PDF)'}
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
          From the Checkr candidate portal — the “Download PDF” copy of your report.
        </div>
        <input type="file" accept="application/pdf,.pdf" disabled={busy}
          onChange={e => handleFile(e.target.files?.[0])} style={{ display: 'none' }} />
      </label>

      {error && (
        <div style={{ ...card, borderColor: 'var(--color-error)', display: 'flex', gap: '0.75rem' }}>
          <AlertTriangle size={20} style={{ color: 'var(--color-error)', flexShrink: 0 }} />
          <div style={{ fontSize: '0.9rem' }}>{error}</div>
        </div>
      )}

      {problems.length > 0 && (
        <div style={{ ...card, borderColor: 'var(--color-warning)' }}>
          <div style={{ display: 'flex', gap: '0.5rem', fontWeight: 600, marginBottom: '0.5rem' }}>
            <AlertTriangle size={20} style={{ color: 'var(--color-warning)' }} />
            {problems.length} record{problems.length === 1 ? '' : 's'} could not be read
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            These are left out rather than guessed at — a misread charge type or date would change
            the answer. Add them by hand on the next screen.
          </p>
          <ul style={{ fontSize: '0.85rem', paddingLeft: '1.1rem' }}>
            {problems.map((p, i) => (
              <li key={i} style={{ marginBottom: '0.25rem' }}>
                <strong>{p.caseNumber ?? 'Unidentified record'}</strong> — {p.reason}
              </li>
            ))}
          </ul>
        </div>
      )}

      {records && records.length > 0 && (
        <>
          <div style={card}>
            <div style={{ display: 'flex', gap: '0.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              <FileText size={20} style={{ color: 'var(--color-primary)' }} />
              {records.length} record{records.length === 1 ? '' : 's'} found
            </div>
            {records.map(r => (
              <div key={r.caseNumber} style={{ padding: '0.6rem 0', borderTop: '1px solid var(--color-card-border)', fontSize: '0.9rem' }}>
                <strong>{titleCase(r.charge)}</strong>{' '}
                <span style={{ color: 'var(--color-text-light)' }}>({r.chargeType})</span>
                <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
                  {r.county} County, {r.state} · {r.disposition} · {r.dispositionDate} · {r.caseNumber}
                  {r.fines !== null && r.fines > 0 && ` · fines imposed $${r.fines.toFixed(2)}`}
                </div>
              </div>
            ))}
          </div>

          {/* The honest limit of the import, before they click through. */}
          <div style={{ ...card, background: 'rgba(77,124,89,0.06)' }}>
            <strong style={{ fontSize: '0.9rem' }}>What your report does not say</strong>
            <p style={{ fontSize: '0.85rem', lineHeight: 1.6, marginTop: '0.4rem' }}>
              A background check lists what you were charged with and how it ended. It does not say
              whether you finished probation or parole, when you were discharged, what class each
              offense was, or whether a balance has been paid — and in most states those are what
              actually decide eligibility. Amounts shown above are what was <em>imposed</em>, not what
              is still owed. The next screen asks you for the rest.
            </p>
          </div>

          <button
            onClick={() => onRunScreening(toConvictionRecords(records))}
            style={{
              width: '100%', padding: '0.9rem', borderRadius: '12px', border: 'none',
              background: 'var(--color-primary)', color: 'white', fontWeight: 700,
              fontSize: '1rem', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
            }}
          >
            Continue with these {records.length} record{records.length === 1 ? '' : 's'}
            <ArrowRight size={18} />
          </button>
        </>
      )}
    </div>
  );
}
