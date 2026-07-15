# Architecture Decision Records

Each ADR captures one significant decision: its context, the choice, and the consequences. ADRs are immutable once accepted — to change a decision, add a new ADR that supersedes the old one (see [`../../RULES.md`](../../RULES.md) → Change control).

| ADR | Title | Status |
|-----|-------|--------|
| [0001](./ADR-0001-no-fallback-templates.md) | No fallback templates, no shallow data | Accepted |
| [0002](./ADR-0002-per-state-research-files.md) | Per-state research files + validated reseed | Proposed |
| [0003](./ADR-0003-neon-jsonb-with-code-fallback.md) | Neon JSONB rules with code source-of-truth + fallback | Accepted |
| [0004](./ADR-0004-language-safety-policy.md) | Language-safety policy (never legal advice) | Accepted |

## Format

Use [`ADR-template.md`](./ADR-template.md). When a decision touches the stack, data model, privacy posture, language-safety policy, or the no-templates integrity rule, it **requires** an ADR.
