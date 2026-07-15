# UX Specification — Turnleaf

## 1. Principles

- Plain language over legal jargon; meet the user where they are.
- One primary action per screen; never make the user wonder what to do next.
- Every result ends with a concrete next step.
- Visibly honest: show verification dates, hedge every claim, admit coverage gaps.
- Calm, reassuring, non-clinical tone — the user may be anxious.

## 2. Screen flow

```
Landing (state selector)
   │  select researched state          select unresearched state
   ▼                                        ▼
Eligibility Wizard                     In-Research Panel
   │  (enter records → checkpoint)      (referrals, back)
   ▼
Results
   (summary → per-record → filing packet → legal aid → PDF)
```

The whole flow is a single page with step-based rendering driven by state in `page.tsx`. "Change state" / "New screening" resets at any time.

## 3. Landing

- **Hero:** "Fifty states of record-clearing law. One plain answer, and the form to file next." + a one-line description of the anonymous screening.
- **State selector:** searchable grid of all 50 states; researched states are actionable, others lead to the in-research panel.
- **Trust cards:** 50-state statutory rules · Privacy & minimization · Form filing packets.
- **Demo panel** (floating button): opens the mock Checkr drawer for loading demo personas.

## 4. Eligibility Wizard

- **Record cards** (repeatable, FR-3): charge name, offense class, disposition, disposition date, probation status, and state-specific fields (CA prison flag, AZ restitution flag — FR-10).
- **"Unknown" handling (FR-4):** choosing "I don't know" for class/disposition reveals RAP-sheet retrieval instructions with a legal-aid link.
- **Add / remove charge** controls.
- **Checkpoint (FR-5):** a review table plus a required confirmation checkbox ("these match my official records"); the "Generate Eligibility Report" button stays disabled until checked. This is a deliberate accuracy safety gate.

## 5. Results

- **Header:** state + data-verified date + verification status (transparency).
- **Optional candidate name** for PDF, labeled "processed locally."
- **Plain-language summary (FR-12/13):** hedged paragraph; shows a loading state while generating.
- **Records breakdown (FR-3):** one card per charge, color-coded by status (eligible = success, waiting = warning, ineligible = error, complex = neutral), with the message and the applied citation. Waiting cards show the earliest eligibility date (FR-8).
- **Filing packet (FR-15/16):** for eligible results — form link, fees, fee waiver, where to file, and a checkbox step list.
- **Legal-aid referrals (FR-17):** per-state links with a recommendation to have an attorney review before filing.
- **Download PDF (FR-18):** client-side generation.

## 6. In-Research Panel (FR-9)

For unresearched states: an honest message that rules aren't yet available, national referral links (CCRC, LSC legal-aid directory), and a back action. No rules are shown.

## 7. Status color semantics

| Status | Meaning | Color intent |
|---|---|---|
| eligible | potentially eligible now | success / green |
| waiting | eligible after a waiting period | warning / amber |
| ineligible | statutorily excluded | error / red |
| complex | needs individual review | neutral / brand |

Do not rely on color alone — always pair with the text label (accessibility, NFR-6).

## 8. Tone rules (NFR-1)

- Never "you are eligible" / "you should file." Use "appears potentially eligible," "a legal-aid attorney or court clerk should confirm."
- Always close with next steps and the informational-only disclaimer.
