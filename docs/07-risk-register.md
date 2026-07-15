# Risk Register — Turnleaf

Risks are rated by likelihood × impact. Turnleaf's domain means several risks carry unusually high impact: a wrong answer can affect a real person's legal decisions. `R8`/`R9` are referenced in code.

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| **R1** | **Inaccurate legal rule** — an encoded rule misstates the law and misleads a user. | Med | Critical | Cite every rule to a primary statute; `verificationStatus` + `lastReviewed`; no invented rules (RULES.md); hedge all output; recommend attorney review; engine tests per state. |
| **R2** | **Stale law** — a statute changes and the encoded rule silently becomes wrong. | High | High | Track `lastReviewed`; set a freshness/review-cadence policy; surface the review date in the UI. |
| **R3** | **User perceives output as legal advice** despite hedging. | Med | High | NFR-1 language safety on both AI and deterministic paths; persistent disclaimers; never "you are eligible / should file." |
| **R4** | **Data-entry error by the user** produces a wrong-but-confident result. | High | Med | Pre-screening checkpoint (FR-5, **R8**) requiring confirmation against official records; RAP-sheet retrieval guidance (FR-4). |
| **R5** | **Privacy breach / accidental PII capture or logging.** | Low | Critical | No accounts, no server persistence, no logging of record content (NFR-2); candidate name stays client-side; keep secrets in `.env`. |
| **R6** | **AI summary hallucinates or gives advice.** | Med | High | Constrained prompt, low temperature, word limit; deterministic fallback with same guarantees; never let AICopy override the structured result. |
| **R7** | **Engine not fully data-driven** — state-specific node-name branching means adding a state can require engine edits and risks regressions. | High | Med | Generalize the engine (Phase 1); structural validation; per-state regression tests (see architecture §8, roadmap Phase 1). |
| **R8** | **Screening sensitivity** — results depend heavily on exact charges/dates/dispositions. | High | High | Checkpoint verification gate; explicit "these must match your official records" confirmation; show inputs back to the user before results. |
| **R9** | **User files without professional review** based on the screening alone. | Med | High | Legal-aid referrals on every result (FR-17); explicit recommendation to have an attorney review the packet before filing. |
| **R10** | **Code/DB rule drift** — `fallbackRules` and the seeded DB disagree. | Med | Med | `db:seed` is the single sync path (idempotent upsert); treat code as source of truth; reseed on every rule change (ADR). |
| **R11** | **Mock demo data mistaken for real integration.** | Low | Med | Clearly label Checkr data as mock/demo; keep it out of production surfaces; documented as demo-only (FR-22). |
| **R12** | **Scope creep** beyond the screening core (accounts, filing, marketplace). | Med | Med | Explicit non-goals (brief, roadmap); require an ADR to expand scope. |

## Top risks to watch

**R1, R2, R8** — legal accuracy, staleness, and screening sensitivity — are the defining risks of this product. Every process rule (cited-only data, review dates, the checkpoint gate, hedged language, attorney referrals) exists to manage them. They should never be traded away for faster coverage.
