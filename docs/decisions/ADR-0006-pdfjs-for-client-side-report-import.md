# ADR-0006 — pdf.js for client-side background-check import

**Date:** 2026-07-23
**Status:** Accepted
**Supersedes:** nothing. **Amends:** the required-stack list in [`AGENTS.md`](../../AGENTS.md).

## Context

People arrive at Turnleaf holding a background check. Until now the only way in was to type each charge, its level, its disposition and its date by hand, from a five-page PDF, into a form — for someone with six cases that is six transcriptions, each of which can go wrong in a way that changes the eligibility answer.

The `/api/mock-checkr` route already models the shape (eight fixture personas), but nothing could read a real report.

Two constraints shape the decision:

1. **Anonymity is a product promise, not a preference.** A Checkr candidate report carries a full name, date of birth, phone number, email address, driver-licence number, ZIP code and the last four digits of an SSN. `AGENTS.md` requires that no PII is collected, stored, or logged.
2. **A misread field is worse than no field.** Charge type, disposition and disposition date each decide an outcome. A parser that guesses produces a confident wrong answer for a real person.

## Decision

Add **`pdfjs-dist`** (Mozilla pdf.js, v6.1.200) and parse the report **entirely in the browser**.

- The file is read with `File.arrayBuffer()` and parsed by pdf.js in a worker on the page. **There is no upload endpoint** — not one that discards the file, not one that streams it. There is nothing to send to.
- `src/utils/pdfText.ts` turns glyph positions into two-column lines. `src/data/checkrParse.ts` reduces those to charge / level / disposition / date / state / case number and **discards identity fields at the type boundary** — `toConvictionRecords` has no field that could carry a name or a date of birth.
- The import is reached at `/?demo=upload`, alongside the existing `/?demo=checkr` fixture demo.
- pdf.js is imported lazily, so it is only fetched when someone actually chooses a file.

### Why parsing by columns, not lines

Checkr lays each record out as a label column and a value column, and **on some records the two are vertically offset by one row** — both layouts appear in the same document. Reading row by row pairs "Case Number" with the court name and shifts every field after it. Reading the columns independently and aligning values against the known field schema makes the offset harmless. A value that does not fit the field it should be is treated as a wrapped fragment of the field before it; a field that cannot be filled makes the whole record a `CheckrParseProblem`, surfaced to the person to enter by hand — never a best-effort record.

## Alternatives considered

- **Server-side parsing in a Route Handler.** Simpler dependency story, but the PDF — name, DOB, SSN digits and all — would cross the network and pass through server memory and possibly logs. Rejected on constraint 1.
- **`pdftotext` / poppler.** Works well (it is what the parser was first validated against) but is a native binary, unavailable in the browser and an extra deployment dependency on the server. Kept only as the offline validation path via `linesFromLayoutText`.
- **Ask the person to paste the text.** No dependency at all, but it defeats the point — the transcription burden is the problem being solved, and pasted text loses the column geometry that makes the parse reliable.
- **Checkr's API.** Requires an account, credentials and a server round-trip per report. Turnleaf has no accounts and wants none.

## Consequences

**Good**
- Six cases enter in one click instead of six transcriptions.
- The privacy claim on the upload screen is literally true and checkable: there is no endpoint.
- The parser is pure and unit-tested, independent of pdf.js, on synthetic fixtures reproducing both layouts.

**Costs and risks**
- pdf.js is a large dependency. Mitigated by the lazy import; nothing loads for people who do not upload.
- **The parser is fitted to one report layout** — a Checkr candidate-portal PDF, validated against a real six-record Arizona report. Another vendor, or a Checkr redesign, will fail. It fails *loudly* (records become problems), which is the intended failure mode, but it will need maintenance.
- Worker configuration via `new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url)` depends on Turbopack's asset handling; a bundler change could break it, and it would break at runtime rather than at build.

## What this decision does NOT license

- Sending report contents anywhere, including to `/api/summarize`. Only screening *results* go to Groq, as before, and those carry no identity.
- Persisting an uploaded file or its parsed contents. Nothing is written to storage; the records live in React state for the session.
- Trusting the import. The wizard still shows a **pre-screening review checkpoint** for every imported record, because the report can be wrong and disputes exist for exactly that reason.
