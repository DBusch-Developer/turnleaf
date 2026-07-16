# research/statutes/ — provenance artifacts

Official statute PDFs, saved as-read at the moment of verification.

## What these are

When a human verifies a state's rules against the official legislature text, the
PDF they read is saved here. It is a **provenance artifact**: a frozen copy of
what the law said on the day it was verified, so a future re-verification can
diff *then vs. now* and see exactly what changed.

## What these are NOT

- **Not user-facing.** Nothing in this directory is ever served to a screening
  user. The live statute links (a source's `url`) point at the official
  legislature site, not at these copies.
- **Not a data source for encoding.** Rules data still comes only from the
  research packages in `research/waves/` and Diana's verification corrections
  ([Data Integrity Rule 1](../../AGENTS.md)). A PDF here never becomes the reason
  a rule says what it says; it is evidence of a reading, not an input to one.

## Naming convention

```
research/statutes/<STATE>/<section>-<retrievedOn>.pdf
```

- `<STATE>` — the two-letter code, e.g. `AZ`, `NH`, `TX`.
- `<section>` — the statute section as it appears in the source's citation,
  with `:` and spaces removed and `/` avoided, e.g. `13-911`, `651-5`, `55A`.
- `<retrievedOn>` — the ISO date the PDF was read, matching the `retrievedOn`
  on that source in `fallbackRules.ts`.

Examples:

```
research/statutes/AZ/13-905-2026-07-15.pdf
research/statutes/AZ/13-911-2026-07-15.pdf
research/statutes/AZ/36-2862-2026-07-16.pdf
research/statutes/NH/651-5-2026-07-16.pdf
research/statutes/TX/55A-2026-07-16.pdf
```

The filename's date should equal the `retrievedOn` recorded on the matching
source, and (for a section on a shared chapter page) the `url` anchor should
point at the same section the PDF captures.
