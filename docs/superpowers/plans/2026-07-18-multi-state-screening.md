# Multi-State Screening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let one screening cover records in several states, each evaluated against its own state's verified ruleset, with results and a PDF grouped per state.

**Architecture:** Replace the single `selectedStateCode` / single `stateConfig` model with a "screening session": a set of selected states, a `stateConfig` per state, and a `state` field on every `ConvictionRecord`. Each record is evaluated against `configs[record.state]`. Results render as stacked per-state sections; the single-state case is just a set of one. No cross-state rule interaction.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Vitest · jsPDF · lucide-react.

## Global Constraints

- **No invented law.** Each state's output comes only from its own verified config; never blend states' rules or summaries. (AGENTS.md golden rule.)
- **Anonymity.** `state` is in-browser record metadata — never persisted, never logged.
- **Engine/validator untouched.** No changes to `rulesEngine.ts` walk logic, the rule format, `RecordField`, or `FIELD_DOMAINS`. `npm run validate` must stay green.
- **Graceful degradation preserved.** DB → `fallbackRules`; Groq → deterministic summary; per state.
- **Done bar:** `npm test` + `npm run build` pass; changed files lint clean via `npx eslint <file>`; docs updated in the same change set.
- **The single-state path must behave identically to today at every task** — it is the regression guard. Multi-state only turns on in Task 6.

---

### Task 1: Record carries its state + per-state screening core

**Files:**
- Modify: `src/data/screening.ts` (add `state` to `ConvictionRecord`)
- Create: `src/data/multiState.ts`
- Create: `src/data/multiState.test.ts`
- Modify: `src/data/rulesEngine.test.ts:10-16` (add `state` to the `rec()` factory)
- Modify: `src/data/personas.test.ts:57-63` (add `state` to the `base` record)
- Modify: `src/components/EligibilityWizard.tsx:41-52` (`addEmptyRecord` sets `state`)
- Modify: `src/components/CheckrReportDemo.tsx:99-112` (`runScreening` carries per-record `state`)

**Interfaces:**
- Produces:
  - `ConvictionRecord.state: string` — 2-letter code (e.g. `'CA'`).
  - `ScreeningResultItem` — `{ recordId: string; state: string; title: string; charge_type: string; disposition: string; resultStatus: 'eligible'|'waiting'|'ineligible'|'complex'; resultTitle: string; resultMessage: string; remedy: string; citation: string }`.
  - `screenRecord(config: StateRuleConfig, answers: Answers, record: ConvictionRecord, now?: Date): ScreeningResultItem`.
  - `groupByState<T>(items: T[], stateOf: (t: T) => string): Array<{ state: string; items: T[] }>` — insertion-ordered by first appearance of each state.

- [ ] **Step 1: Add the `state` field to `ConvictionRecord`**

In `src/data/screening.ts`, inside the `ConvictionRecord` interface (currently lines 23-32), add `state` as the first field after `id`:

```ts
export interface ConvictionRecord {
  id: string;
  /** Which state's law screens this record. A 2-letter code, e.g. 'CA'.
   *  Record metadata, NOT a rule field — the engine never reads it and it is
   *  absent from RecordField/FIELD_DOMAINS. It only groups and routes records. */
  state: string;
  title: string;
  charge_type: 'misdemeanor' | 'felony' | 'infraction' | 'unknown';
  disposition: 'convicted' | 'dismissed' | 'deferred' | 'acquitted' | 'unknown';
  disposition_date: string;
  probation_status: 'completed' | 'failed' | 'active' | 'none';
  prison_sentenced: boolean;
  restitution_paid: boolean;
}
```

- [ ] **Step 2: Keep existing record constructors compiling**

`state` is now required, so every place that builds a `ConvictionRecord` must set it. Update these three call sites to preserve today's single-state behavior:

`src/components/EligibilityWizard.tsx`, `addEmptyRecord` (lines 41-52) — new records take the currently selected state. (In this task `stateConfig` is still a prop; Task 4 replaces it.) Add `state: stateConfig.code,` as the second field:

```ts
  const addEmptyRecord = () => {
    const newRecord: ConvictionRecord = {
      id: Math.random().toString(36).substr(2, 9),
      state: stateConfig.code,
      title: '',
      charge_type: 'misdemeanor',
      disposition: 'convicted',
      disposition_date: new Date().toISOString().split('T')[0],
      probation_status: 'completed',
      prison_sentenced: false,
      restitution_paid: true
    };
    setRecords([...records, newRecord]);
  };
```

`src/components/CheckrReportDemo.tsx`, `runScreening` (lines 99-112) — carry each Checkr record's own `state` through, and stop collapsing to one state code. Replace the whole function body:

```ts
  const runScreening = () => {
    if (!report) return;
    const records: ConvictionRecord[] = report.records.map((r, i) => ({
      id: r.id || `rec_${i}`,
      state: r.state,
      title: r.title,
      charge_type: r.charge_type,
      disposition: r.disposition,
      disposition_date: r.disposition_date,
      probation_status: r.probation_status || 'none',
      prison_sentenced: r.prison_sentenced || false,
      restitution_paid: r.restitution_paid !== undefined ? r.restitution_paid : true,
    }));
    onRunScreening(records, report.records[0]?.state || 'CA');
  };
```

(The second argument is still passed here — the `onRunScreening` signature changes in Task 5. This task only makes each record carry its true state.)

- [ ] **Step 3: Update the two test factories**

`src/data/rulesEngine.test.ts`, the `rec()` factory (lines 10-16) — add `state: 'CA',`:

```ts
const rec = (o: Partial<ConvictionRecord> = {}): ConvictionRecord => ({
  id: 'r1',
  state: 'CA',
  title: 'Test',
  charge_type: 'misdemeanor',
  disposition: 'convicted',
  disposition_date: '2015-01-01',
  ...
```

`src/data/personas.test.ts`, the `base` record (lines 57-63) — add `state: 'CA',` as the field after `id`.

- [ ] **Step 4: Write the failing test for the screening core**

Create `src/data/multiState.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fallbackRules } from './fallbackRules';
import type { ConvictionRecord } from './screening';
import { screenRecord, groupByState } from './multiState';

const CA = fallbackRules.find(s => s.code === 'CA')!;
const TX = fallbackRules.find(s => s.code === 'TX')!;

const rec = (o: Partial<ConvictionRecord>): ConvictionRecord => ({
  id: 'r', state: 'CA', title: 'Charge', charge_type: 'misdemeanor',
  disposition: 'convicted', disposition_date: '2015-01-01',
  probation_status: 'completed', prison_sentenced: false, restitution_paid: true,
  ...o,
});

describe('screenRecord', () => {
  it('screens a record against the config it is given, tagging the state', () => {
    const item = screenRecord(CA, {}, rec({ id: 'a', state: 'CA' }));
    expect(item.state).toBe('CA');
    expect(item.recordId).toBe('a');
    expect(['eligible', 'waiting', 'ineligible', 'complex']).toContain(item.resultStatus);
  });

  it('the Thomas split: CA dismissed possession is not ineligible; TX convicted theft is not eligible', () => {
    const caItem = screenRecord(CA, {}, rec({ id: 'ca', state: 'CA', disposition: 'dismissed' }));
    const txItem = screenRecord(TX, {}, rec({ id: 'tx', state: 'TX', disposition: 'convicted', charge_type: 'misdemeanor' }));
    expect(caItem.resultStatus).not.toBe('ineligible');
    expect(txItem.resultStatus).not.toBe('eligible');
  });
});

describe('groupByState', () => {
  it('buckets by state in first-seen order', () => {
    const items = [{ s: 'CA' }, { s: 'TX' }, { s: 'CA' }];
    const groups = groupByState(items, i => i.s);
    expect(groups.map(g => g.state)).toEqual(['CA', 'TX']);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(1);
  });
});
```

- [ ] **Step 5: Run it to confirm it fails**

Run: `npx vitest run src/data/multiState.test.ts`
Expected: FAIL — `multiState.ts` does not exist / `screenRecord` is not a function.

- [ ] **Step 6: Implement `src/data/multiState.ts`**

The result shape is lifted verbatim from `EligibilityWizard.handleScreening` (lines 93-106), plus a `state` tag.

```ts
// Per-state screening: evaluate each record against ITS OWN state's config, and
// group results/records by state for stacked, per-state display. The engine
// itself (rulesEngine.ts) is single-config by design; this is the layer that
// runs it once per record against the right state.
import type { StateRuleConfig } from './fallbackRules';
import { evaluate, type Answers } from './rulesEngine';
import type { ConvictionRecord } from './screening';

export interface ScreeningResultItem {
  recordId: string;
  state: string;
  title: string;
  charge_type: string;
  disposition: string;
  resultStatus: 'eligible' | 'waiting' | 'ineligible' | 'complex';
  resultTitle: string;
  resultMessage: string;
  remedy: string;
  citation: string;
}

/** Evaluate one record against one state's config. The config MUST be the one
 *  for `record.state`; passing another state's config is the original bug. */
export function screenRecord(
  config: StateRuleConfig,
  answers: Answers,
  record: ConvictionRecord,
  now?: Date
): ScreeningResultItem {
  const evaluation = evaluate(config, answers ?? {}, record, now);
  return {
    recordId: record.id,
    state: record.state,
    title: record.title || 'Unnamed Offense',
    charge_type: record.charge_type,
    disposition: record.disposition,
    resultStatus: evaluation.status,
    resultTitle: evaluation.title,
    resultMessage: evaluation.message,
    remedy: evaluation.remedy,
    citation: evaluation.citation,
  };
}

/** Bucket items by state, in the order each state first appears. */
export function groupByState<T>(
  items: T[],
  stateOf: (t: T) => string
): Array<{ state: string; items: T[] }> {
  const order: string[] = [];
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const s = stateOf(item);
    if (!buckets.has(s)) { buckets.set(s, []); order.push(s); }
    buckets.get(s)!.push(item);
  }
  return order.map(state => ({ state, items: buckets.get(state)! }));
}
```

- [ ] **Step 7: Run the test suite**

Run: `npx vitest run src/data/multiState.test.ts src/data/rulesEngine.test.ts src/data/personas.test.ts`
Expected: PASS (all three files).

- [ ] **Step 8: Confirm the build and validator are unaffected**

Run: `npm run build` and `npm run validate`
Expected: both succeed. (No engine/validator changes; `state` is not a rule field.)

- [ ] **Step 9: Commit**

```bash
git add src/data/screening.ts src/data/multiState.ts src/data/multiState.test.ts src/data/rulesEngine.test.ts src/data/personas.test.ts src/components/EligibilityWizard.tsx src/components/CheckrReportDemo.tsx
git commit -m "feat: records carry their state; add per-state screening core"
```

---

### Task 2: Extract `StateResultSection` from `ResultsDisplay`

Make `ResultsDisplay` render a list of per-state sections. With one state it looks identical to today.

**Files:**
- Create: `src/components/StateResultSection.tsx`
- Modify: `src/components/ResultsDisplay.tsx` (become a shell over sections)
- Modify: `src/app/page.tsx:337-343` (pass a one-element `sections` array)

**Interfaces:**
- Consumes: `ScreeningResultItem` (Task 1) — each result now carries `state`.
- Produces:
  - `ResultsSection` — `{ stateConfig: StateRuleConfig; results: ScreeningResultItem[] }`.
  - `ResultsDisplay` prop change: `sections: ResultsSection[]` replaces `stateConfig` + `results`. `onReset` and the candidate-name field stay at the shell level.
  - `<StateResultSection stateConfig results onSummaryLoaded />` renders one state's summary + records breakdown + filing forms + legal aid + sources (everything currently between `ResultsDisplay.tsx:157` and `:343`), and reports its fetched summary up via `onSummaryLoaded(stateCode, summary)` so the shell can feed it into the PDF.

- [ ] **Step 1: Create `StateResultSection.tsx`**

Move the state-specific body of `ResultsDisplay` into this component. It owns its own AI-summary fetch (so each state gets its own summary). Copy these blocks verbatim from `ResultsDisplay.tsx`, rehomed:
- the `aiSummary`/`loadingSummary` state + `fetchSummary` effect (lines 41-67) — but keyed on this section's `results` and `stateConfig`;
- `getStatusColor` (lines 69-80);
- the Plain-Language Summary block (lines 157-178);
- Records Breakdown (lines 180-230);
- Filing Actions (lines 232-302);
- Legal Aid (lines 304-339);
- `<SourcesList sources={stateConfig.sources} stateName={stateConfig.name} />` (line 343).

```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { StateRuleConfig } from '../data/fallbackRules';
import type { ScreeningResultItem } from '../data/multiState';
import SourcesList from './SourcesList';
import { FileText, Landmark, ShieldCheck, RefreshCw } from 'lucide-react';

const NOT_VERIFIED = 'Not yet verified — ask the court clerk';

interface StateResultSectionProps {
  stateConfig: StateRuleConfig;
  results: ScreeningResultItem[];
  /** Report the fetched summary up so the shell can put it in the PDF. */
  onSummaryLoaded?: (stateCode: string, summary: string) => void;
}

export default function StateResultSection({ stateConfig, results, onSummaryLoaded }: StateResultSectionProps) {
  const [aiSummary, setAiSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    async function fetchSummary() {
      setLoadingSummary(true);
      try {
        const res = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stateName: stateConfig.name, records: results }),
        });
        if (res.ok) {
          const summary = (await res.json()).summary;
          setAiSummary(summary);
          onSummaryLoaded?.(stateConfig.code, summary);
        }
      } catch (err) {
        console.error('Failed to load AI summary:', err);
      } finally {
        setLoadingSummary(false);
      }
    }
    fetchSummary();
    // onSummaryLoaded is intentionally excluded — the shell passes a stable
    // useCallback; including it would refetch on every render.
  }, [results, stateConfig]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'eligible':
        return { bg: 'var(--color-success-bg)', text: 'var(--color-success)', border: 'var(--color-success)' };
      case 'waiting':
        return { bg: 'var(--color-warning-bg)', text: 'var(--color-warning)', border: 'var(--color-warning)' };
      case 'ineligible':
        return { bg: 'var(--color-error-bg)', text: 'var(--color-error)', border: 'var(--color-error)' };
      default:
        return { bg: 'var(--color-primary-light)', text: 'var(--color-primary-dark)', border: 'var(--color-primary)' };
    }
  };

  const hasEligible = results.some(r => r.resultStatus === 'eligible');

  return (
    <section style={{ marginBottom: '2.5rem' }}>
      <h3 style={{ fontSize: '1.35rem', color: 'var(--color-primary-dark)', borderBottom: '2px solid var(--color-card-border)', paddingBottom: '0.5rem', marginBottom: '1rem' }}>
        {stateConfig.name}
        <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: '0.75rem' }}>
          Data verified: {stateConfig.lastReviewed} ({stateConfig.verificationStatus})
        </span>
      </h3>

      {/* ...paste the Plain-Language Summary, Records Breakdown, Filing Actions,
          Legal Aid, and SourcesList blocks from ResultsDisplay here verbatim,
          using this component's aiSummary/loadingSummary/getStatusColor/results/
          stateConfig/hasEligible/NOT_VERIFIED ... */}
    </section>
  );
}
```

(The paste is mechanical — the five blocks already reference exactly these locals. Keep their markup identical so single-state output is unchanged.)

- [ ] **Step 2: Reduce `ResultsDisplay` to a shell over sections**

Replace `ResultsDisplayProps` and the component body so it maps sections to `<StateResultSection>` and keeps only the page-level header, candidate-name field, and download button:

```tsx
"use client";

import React, { useState, useCallback } from 'react';
import { StateRuleConfig } from '../data/fallbackRules';
import type { ScreeningResultItem } from '../data/multiState';
import StateResultSection from './StateResultSection';
import { generateReportPDF } from '../utils/pdfGenerator';
import { FileDown } from 'lucide-react';

export interface ResultsSection {
  stateConfig: StateRuleConfig;
  results: ScreeningResultItem[];
}

interface ResultsDisplayProps {
  sections: ResultsSection[];
  onReset: () => void;
}

export default function ResultsDisplay({ sections, onReset }: ResultsDisplayProps) {
  const [candidateName, setCandidateName] = useState('');
  // Summaries fetched by each section, kept here so the PDF can include them.
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const handleSummary = useCallback(
    (stateCode: string, summary: string) =>
      setSummaries(prev => (prev[stateCode] === summary ? prev : { ...prev, [stateCode]: summary })),
    []
  );

  const triggerDownload = () => {
    generateReportPDF(
      candidateName,
      sections.map(s => ({
        name: s.stateConfig.name,
        lastReviewed: s.stateConfig.lastReviewed,
        verificationStatus: s.stateConfig.verificationStatus,
        legalAid: s.stateConfig.resources.legalAid,
        remedies: s.stateConfig.resources.remedies,
        records: s.results,
        summary: summaries[s.stateConfig.code],
      }))
    );
  };

  return (
    <div className="glass-card animate-slide-up" style={{ padding: '2rem', maxWidth: '850px', width: '100%', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid var(--color-card-border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', color: 'var(--color-text)' }}>Screening Results</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            {sections.length === 1 ? sections[0].stateConfig.name : `${sections.length} states`}
          </p>
        </div>
        <button className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }} onClick={onReset}>
          New Screening
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
            Candidate Name (Optional - for PDF generation)
          </label>
          <input type="text" className="input-field" placeholder="e.g. Marcus Miller (processed locally)" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
        </div>
        <button className="btn btn-primary" style={{ height: '44px' }} onClick={triggerDownload}>
          <FileDown size={18} /> Download PDF Report
        </button>
      </div>

      {sections.map(s => (
        <StateResultSection key={s.stateConfig.code} stateConfig={s.stateConfig} results={s.results} onSummaryLoaded={handleSummary} />
      ))}
    </div>
  );
}
```

Note: `generateReportPDF`'s multi-section signature lands in Task 3 — this call passes an array now and will typecheck once Task 3 is done. Do Task 3 before running the build here, or temporarily keep the old single-arg call. To keep this task green on its own, implement Task 3's PDF change **in the same commit** (they are one reviewable unit: "results become sections"). Steps 3-5 below cover the build.

- [ ] **Step 3: Update the page call site**

In `src/app/page.tsx` (lines 337-343), replace the `ResultsDisplay` usage. At this task `results` is still a flat array for one state; wrap it:

```tsx
            ) : (
              <ResultsDisplay
                sections={[{ stateConfig, results: results as ScreeningResultItem[] }]}
                onReset={handleReset}
              />
            )}
```

Add the import at the top of `page.tsx`: `import type { ScreeningResultItem } from '../data/multiState';`

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: PASS (after Task 3's PDF change is in place — see the note in Step 2).

- [ ] **Step 5: Lint changed files**

Run: `npx eslint src/components/StateResultSection.tsx src/components/ResultsDisplay.tsx src/app/page.tsx`
Expected: no new errors.

- [ ] **Step 6: Commit** (fold Task 3 in if you sequenced them together)

```bash
git add src/components/StateResultSection.tsx src/components/ResultsDisplay.tsx src/app/page.tsx
git commit -m "refactor: ResultsDisplay renders per-state sections"
```

---

### Task 3: Multi-section PDF

**Files:**
- Modify: `src/utils/pdfGenerator.ts` (accept an array of state sections)

**Interfaces:**
- Consumes: `ScreeningResultItem` (Task 1).
- Produces: `generateReportPDF(candidateName: string, sections: PDFStateSection[])` where `PDFStateSection = PDFStateInfo & { records: PDFRecord[] }`. The per-section AI summary is optional (`summary?: string`).

- [ ] **Step 1: Change the signature and loop over sections**

In `src/utils/pdfGenerator.ts`, extend `PDFStateInfo` with `records` and `summary`, and rewrite `generateReportPDF` to iterate sections. The header block moves per-section; the disclaimer stays once at the top.

```ts
interface PDFStateSection extends PDFStateInfo {
  records: PDFRecord[];
  summary?: string;
}

export function generateReportPDF(candidateName: string, sections: PDFStateSection[]) {
  const doc = new jsPDF();
  let y = 20;
  // ... keep addTextWithWrapping, header accent bar, title, "Prepared for" line,
  //     and the single disclaimer block exactly as today (lines 44-96) ...

  sections.forEach((section, sIdx) => {
    if (sIdx > 0) { doc.addPage(); y = 20; }
    y = addTextWithWrapping(`State Checked: ${section.name} (Data Last Reviewed: ${section.lastReviewed} | Status: ${section.verificationStatus})`, margin, y, 12, 'bold', [77, 124, 89]);
    y += 2;

    if (section.summary) {
      y = addTextWithWrapping('Plain-Language Summary:', margin, y, 12, 'bold', [77, 124, 89]);
      y = addTextWithWrapping(section.summary, margin, y, 9.5, 'normal', [30, 34, 31]);
      y += 4;
    }

    // ... the existing "Conviction Screening Detail" loop (lines 106-122),
    //     "State Filing Actions & Forms" block (lines 124-149), and
    //     "Local Legal Assistance Resources" block (lines 151-156),
    //     all reading from `section.records` / `section.remedies` /
    //     `section.legalAid` instead of the old top-level params ...
  });

  // ... keep the page header/footer stamping loop (lines 158-166) and doc.save() ...
}
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: PASS. (`ResultsDisplay.triggerDownload` from Task 2 now matches this signature.)

- [ ] **Step 3: Lint**

Run: `npx eslint src/utils/pdfGenerator.ts`
Expected: no new errors.

- [ ] **Step 4: Commit** (or fold into Task 2's commit if sequenced together)

```bash
git add src/utils/pdfGenerator.ts
git commit -m "feat: PDF report supports one section per state"
```

---

### Task 4: Wizard evaluates each record against its own state

**Files:**
- Modify: `src/components/EligibilityWizard.tsx` (take `configs` map; group records by state; per-record eval; per-record conditional fields)
- Modify: `src/app/page.tsx:331-336` (pass a one-entry `configs` map — bridge until Task 5)

**Interfaces:**
- Consumes: `screenRecord` (Task 1), `configs: Record<string, StateRuleConfig>`.
- Produces:
  - Wizard prop change: `configs: Record<string, StateRuleConfig>` replaces `stateConfig`.
  - `onScreeningComplete(results: ScreeningResultItem[], records: ConvictionRecord[])` — results now carry `state`.

- [ ] **Step 1: Swap the wizard's config source**

In `EligibilityWizard.tsx`:
- Replace the `stateConfig: StateRuleConfig` prop with `configs: Record<string, StateRuleConfig>` (interface at lines 13-18 and the destructure at 20-25).
- Add a helper right after the destructure: `const configFor = (r: ConvictionRecord) => configs[r.state];` and `const states = Object.values(configs);`
- `pendingFor` (line 79-80): `currentNode(configFor(record), answers[record.id] ?? {}, record)`.
- `addEmptyRecord`: new records take the first configured state's code — `state: states[0].code`.
- Header (line 116): when `states.length === 1` show `{states[0].name} Eligibility Wizard`; otherwise `Multi-State Eligibility Wizard`.

- [ ] **Step 2: Group the record cards by state**

Wrap the `records.map(...)` card list (lines 130-261) so records render under a per-state heading. Using `groupByState` from `multiState.ts`:

```tsx
import { groupByState, screenRecord, type ScreeningResultItem } from '../data/multiState';
...
{groupByState(records, r => r.state).map(group => (
  <div key={group.state}>
    {states.length > 1 && (
      <h4 style={{ fontSize: '1rem', color: 'var(--color-primary-dark)', margin: '0.5rem 0' }}>
        {configs[group.state].name}
      </h4>
    )}
    {group.items.map((record) => {
      const index = records.indexOf(record);
      /* ...existing record card markup (lines 131-260)... */
    })}
    <button className="btn btn-outline" onClick={() => addRecordForState(group.state)}>
      <Plus size={16} /> Add charge in {configs[group.state].name}
    </button>
  </div>
))}
```

Add `addRecordForState(stateCode: string)` — identical to `addEmptyRecord` but with `state: stateCode`. Keep the record-card markup unchanged except Step 3.

- [ ] **Step 3: Make the state-specific fields key on the record's state**

In the record card, the CA prison checkbox (line 230) and AZ restitution checkbox (line 245) currently test `stateConfig.code`. Change them to the record's own state:

```tsx
{record.state === 'CA' && ( /* prison checkbox, unchanged */ )}
{record.state === 'AZ' && ( /* restitution checkbox, unchanged */ )}
```

Also the RAP-sheet panel (lines 277-278) references `stateConfig.name` / `stateConfig.resources.legalAid[0]`; change to `states[0].name` / `states[0].resources.legalAid[0]` (the panel is generic guidance; first state is fine).

- [ ] **Step 4: Evaluate each record against its own config on submit**

Replace `handleScreening` (lines 92-108):

```tsx
  const handleScreening = () => {
    const results = records.map(r => screenRecord(configFor(r), answers[r.id] ?? {}, r));
    onScreeningComplete(results, records);
  };
```

- [ ] **Step 5: Bridge the page call site**

In `src/app/page.tsx` (lines 331-336), pass a one-entry map (still single-state until Task 5):

```tsx
              <EligibilityWizard
                configs={{ [stateConfig.code]: stateConfig }}
                prepopulatedRecords={prepopulatedRecords}
                onScreeningComplete={handleScreeningComplete}
                onReset={handleReset}
              />
```

`handleScreeningComplete` (page line 150) already stores `results`; its type widens to `ScreeningResultItem[]` (already imported in Task 2).

- [ ] **Step 6: Build + lint + test**

Run: `npm run build && npx eslint src/components/EligibilityWizard.tsx src/app/page.tsx && npx vitest run`
Expected: all PASS. Single-state flow unchanged (one group, one config).

- [ ] **Step 7: Commit**

```bash
git add src/components/EligibilityWizard.tsx src/app/page.tsx
git commit -m "feat: wizard screens each record against its own state's config"
```

---

### Task 5: Page holds a screening session (arrays + multi-fetch + Checkr handoff + Willow)

**Files:**
- Modify: `src/app/page.tsx` (session state, multi-fetch, handoff, reset, render)
- Modify: `src/components/CheckrReportDemo.tsx` (drop the second `onRunScreening` arg)
- Modify: `src/components/AssistantContext.tsx` (extend `ScreenContextValue`)

**Interfaces:**
- Consumes: `groupByState` (Task 1), `configs` wizard prop (Task 4), `sections` results prop (Task 2).
- Produces:
  - `CheckrReportDemoProps.onRunScreening: (records: ConvictionRecord[]) => void` (no `stateCode`).
  - `ScreenContextValue` gains `selectedStateCodes: string[]` and `stateNames: string[]`; keeps `selectedStateCode`/`stateName` populated only when exactly one state is selected (else `null`).

- [ ] **Step 1: Extend the Willow context type**

In `src/components/AssistantContext.tsx` (lines 9-19), add the plural fields, keeping the singular ones for backward compatibility:

```ts
export interface ScreenContextValue {
  selectedStateCode: string | null;   // populated only when exactly one state
  stateName: string | null;           // populated only when exactly one state
  selectedStateCodes: string[];
  stateNames: string[];
  screen: WillowScreen;
}

const DEFAULT_SCREEN: ScreenContextValue = {
  selectedStateCode: null, stateName: null,
  selectedStateCodes: [], stateNames: [],
  screen: 'landing',
};
```

`AssistantWidget.tsx` (line 43) still reads `selectedStateCode` — unchanged; when multiple states are active it is `null`, so Willow falls back to asking which state, exactly as it does today with no state.

- [ ] **Step 2: Migrate page session state**

In `src/app/page.tsx`:
- Replace `selectedStateCode: string | null` with `selectedStateCodes: string[]` (`useState<string[]>([])`).
- Replace `stateConfig` / `comingSoon` singletons with maps: `configs: Record<string, StateRuleConfig>` and `comingSoonByState: Record<string, ComingSoonConfig>`.
- `isOpeningState`: true while any selected code lacks an entry in either map and no load has failed.
- The fetch effect (lines 96-133): fetch every code in `selectedStateCodes` not yet resolved, in parallel (`Promise.all`), sorting each response into `configs` or `comingSoonByState`.
- `handleReset` (lines 163-170): clear all four (`selectedStateCodes = []`, both maps, `prepopulatedRecords`, `results`), `setShowSelector(true)`.

- [ ] **Step 3: Derive screenable vs in-research states and render**

In the render (lines 327-344), replace the single `stateConfig ? ... : comingSoon ? ...` branch with session logic:

```tsx
const screenableCodes = selectedStateCodes.filter(c => configs[c]);
const researchingCodes = selectedStateCodes.filter(c => comingSoonByState[c]);
const screenableConfigs = Object.fromEntries(screenableCodes.map(c => [c, configs[c]]));
```

- When `results` is null: render one `<EligibilityWizard configs={screenableConfigs} .../>`, and above/below it a compact in-research note for each `researchingCodes` entry (reuse `ComingSoonPanel` content, or a one-line referral block per state).
- When `results` is set: build `sections` by grouping results by state and attaching configs, then `<ResultsDisplay sections={sections} .../>`:

```tsx
const sections = groupByState(results as ScreeningResultItem[], r => r.state)
  .map(g => ({ stateConfig: configs[g.state], results: g.items }));
```

- [ ] **Step 4: Multi-state Checkr handoff**

Change `CheckrReportDemoProps.onRunScreening` to `(records: ConvictionRecord[]) => void` and update `runScreening` in `CheckrReportDemo.tsx` to call `onRunScreening(records)` (drop the second arg).

In `page.tsx`, `handleLoadMockReport` (lines 143-148) derives the selected states from the records themselves:

```tsx
const handleLoadMockReport = (mockRecords: ConvictionRecord[]) => {
  const codes = groupByState(mockRecords, r => r.state).map(g => g.state);
  setPrepopulatedRecords(mockRecords);
  setSelectedStateCodes(codes);
  setResults(null);
  closeCheckr();
};
```

This is the point at which **Thomas (CA + TX) screens correctly** — the CA record against CA, the TX record against TX.

- [ ] **Step 5: Publish the session to Willow**

Update the `publishScreen` effect (lines 193-206): compute `stateNames` from the selected codes; set `selectedStateCode`/`stateName` only when exactly one state is selected, else `null`; always set the plural arrays.

- [ ] **Step 6: Build + lint + test**

Run: `npm run build && npx eslint src/app/page.tsx src/components/CheckrReportDemo.tsx src/components/AssistantContext.tsx && npx vitest run`
Expected: all PASS.

- [ ] **Step 7: Manual check — the headline fix**

Run: `npm run dev`, open `/?demo=checkr`, select **Thomas (Multi-State CA & TX)**, click through to results.
Expected: two stacked sections — California (cannabis, dismissed) and Texas (theft, convicted) — each screened under its own law. Download PDF shows both sections.

- [ ] **Step 8: Commit**

```bash
git add src/app/page.tsx src/components/CheckrReportDemo.tsx src/components/AssistantContext.tsx
git commit -m "feat: screening session holds multiple states; Checkr multi-state handoff screens each state correctly"
```

---

### Task 6: Multi-select in manual entry

Turn on manual multi-state: pick several states up front, enter records grouped by each.

**Files:**
- Modify: `src/components/StateSelector.tsx` (multi-select + Continue)
- Modify: `src/app/page.tsx` (consume `onContinue(codes)`)

**Interfaces:**
- Consumes: page session state (Task 5).
- Produces: `StateSelectorProps.onContinue: (codes: string[]) => void` replaces `onSelectState`; add `pendingCodes: string[]` replacing `pendingCode`.

- [ ] **Step 1: Multi-select in `StateSelector`**

- Add local `const [picked, setPicked] = useState<string[]>([])`.
- Each state row becomes a toggle: clicking adds/removes its code from `picked` (show a check when picked). Quick-select buttons toggle too. Keep search unchanged.
- Add a sticky footer button: `Continue with {picked.length} state{picked.length === 1 ? '' : 's'}`, disabled when `picked.length === 0`, calling `onContinue(picked)`.
- Replace `pendingCode`/`onSelectState` props with `pendingCodes: string[]` / `onContinue`.

- [ ] **Step 2: Page wires `onContinue`**

In `page.tsx`, the selector usage (lines 316-322): pass `onContinue={setSelectedStateCodes}` and `pendingCodes={isOpeningState ? selectedStateCodes : []}`.

- [ ] **Step 3: Build + lint**

Run: `npm run build && npx eslint src/components/StateSelector.tsx src/app/page.tsx`
Expected: PASS.

- [ ] **Step 4: Manual check — manual multi-state**

Run: `npm run dev`. Choose **California + Texas** at step 1, add a dismissed CA charge and a convicted TX charge, submit.
Expected: two record groups in the wizard; two stacked result sections screened independently; single combined PDF.
Also select **one researched + one in-research** state and confirm the in-research state shows a referral block, never a screening.

- [ ] **Step 5: Full verification**

Run: `npm test && npm run build && npm run validate`
Expected: all green.

- [ ] **Step 6: Update docs**

- Note multi-state support in `docs/01-prd.md` (scope) and `TERMINOLOGY.md` if "screening" is defined as single-state anywhere.
- The `thomas_multistate` persona now screens correctly — no persona change needed, but confirm its description still matches behavior.

- [ ] **Step 7: Commit**

```bash
git add src/components/StateSelector.tsx src/app/page.tsx docs/ TERMINOLOGY.md
git commit -m "feat: multi-select states in manual entry — multi-state screening end to end"
```

---

## Self-review notes

- **Spec coverage:** data model (Task 1), multi-select up front (Task 6), grouped record entry (Task 4), stacked per-state results (Task 2), one PDF (Task 3), per-state summary (Task 2/StateResultSection), in-research states (Task 5/6), Willow context (Task 5), engine untouched (Global Constraints; verified in Task 1 Step 8). All covered.
- **Regression guard:** single-state behavior is preserved at every task; multi-state only turns on in Task 5 (Checkr) and Task 6 (manual).
- **Type consistency:** `ScreeningResultItem` (Task 1) flows through wizard (Task 4) → page → `ResultsSection` (Task 2) → PDF (Task 3). `configs: Record<string, StateRuleConfig>` is the wizard's single config source from Task 4 on.
