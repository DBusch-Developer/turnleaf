# Turnleaf Documentation

This is the planning and reference set for Turnleaf, an anonymous 50-state record-clearing eligibility screening tool.

## Start here

Read in this order:

1. [`00-brief.md`](./00-brief.md) — the one-page product concept and problem
2. [`01-prd.md`](./01-prd.md) — product requirements (functional + non-functional)
3. [`02-architecture.md`](./02-architecture.md) — technical architecture and boundaries
4. [`03-data-model.md`](./03-data-model.md) — the `states` schema and decision-tree format
5. [`04-ux-spec.md`](./04-ux-spec.md) — screens and user flow
6. [`05-roadmap.md`](./05-roadmap.md) — build order and state-coverage plan
7. [`06-testing.md`](./06-testing.md) — testing strategy
8. [`07-risk-register.md`](./07-risk-register.md) — risks and mitigations

## Related

- Governance lives at the repo root: [`../PROJECT_CONTEXT.md`](../PROJECT_CONTEXT.md), [`../RULES.md`](../RULES.md), [`../TERMINOLOGY.md`](../TERMINOLOGY.md), [`../AGENTS.md`](../AGENTS.md)
- User stories: [`stories/`](./stories/)
- Decision records: [`decisions/`](./decisions/)

## Status

Turnleaf is a working MVP. The core screening flow is built for four researched states (CA, AZ, NY, TX). The primary ongoing work is expanding researched state coverage and hardening the rules engine. See [`05-roadmap.md`](./05-roadmap.md).
