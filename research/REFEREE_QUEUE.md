# Referee Queue

Genuine fights found during encoding that the research package did not resolve.
Each was hedged in the tree (routed to a "complex — consult legal aid" result so
no user gets a guess) and logged here with a recommendation. Diana resolves
these during phone/statute verification, then the hedge becomes a real branch.

A fight belongs here only when the package leaves a substantive legal question
open — not a fee, a rollout date, or a list to confirm (those are openQuestions
on the state). This is for "the law itself is unsettled or the package
contradicts itself and does not say which wins."

---

## IL — prior felony interacting with a later felony sealing petition

**Wave 3, Illinois. Hedged: `complex_new_law_il`.**
**STATUS: OPEN — tagged for Diana's statute pass (verify against current
20 ILCS 2630/5.2 text on ilga.gov). Do NOT resolve from a model reading; a
two-week-old statute is exactly what the statute-check tier is for. The hedge
is the correct answer until a human reads the text. Ask New Leaf Illinois on
the Session 3 call (added to the call sheet). Ruling by Diana, 2026-07-16.**

The Illinois Clean Slate Act (signed Jan 16, 2026; phasing in from June 30,
2026 — two weeks before the package) removed the rule that a prior felony
conviction automatically barred a later felony sealing petition. Wave 3's
persona 5 ("old felony + new felony") is marked **"post-June-30 rules — resolve
during verification"**: the package does not state how a prior felony now
interacts with a later felony petition under the new text.

**Why it is a fight, not an open question:** this is not a missing fee or an
unconfirmed date — it is the substantive eligibility rule for a real, common
fact pattern, and the statute is two weeks old with the automatic-sealing
machinery not yet switched on. Guessing "eligible" could send someone to file a
petition they will lose; guessing "ineligible" could talk someone out of relief
they are now entitled to. Both are harmful.

**Hedge in place:** anyone with a felony who reports another felony on their
record routes to `complex_new_law_il`, which says plainly that the sealing law
changed on June 30, 2026, that how multiple felonies interact under the new text
is exactly the thing still being worked out, and that a person should not rely on
either a yes or a no from a screening tool for this — with New Leaf Illinois and
Cabrini Green Legal Aid named.

**Recommendation:** confirm the current 20 ILCS 2630/5.2 text (the ilga.gov
July 1, 2025 version split matters here) against the ILAO Clean Slate FAQ. The
likely resolution is that a prior felony no longer bars the petition but the
court still weighs it in its discretion — if so, the branch becomes an
"eligible to petition; court weighs your history" result with the felony date
node. Until confirmed, the hedge stands.

**Blocks:** no field — it blocks a branch. Tracked as an openQuestion on IL too.

---

## NH — the Class B misdemeanor annulment waiting period (1 vs 3 years)

**Wave 7, New Hampshire. Hedged: `complex_classBmisd_nh`.**
**STATUS: OPEN — tagged for Diana's statute pass (verify against current
RSA 651:5(III) text on gc.nh.gov). Do NOT resolve from a model reading.**

New Hampshire's annulment statute sets a waiting period per offense class. For a
Class B misdemeanor the sources conflict: the statute historically said **3
years**, but some current summaries say **1 year**. Wave 7 says to "encode from
the current RSA 651:5(III) text" and does not say which value wins.

**Why it is a fight, not an open question:** this is not a fee or a rollout date
— it is the substantive eligibility clock for a common offense class, and in New
Hampshire getting it wrong is uniquely dangerous. Filing before the period has
run is denied AND triggers a **3-year bar on any new petition** (RSA 651:5(IV)).
So a guessed "1 year" that is really "3 years" would push someone to file two
years early and lose their eligibility for three more. Guessing either number is
harmful; the honest move is to refuse to guess.

**Hedge in place:** a Class B misdemeanor routes to `complex_classBmisd_nh`,
which says the offense is annullable but the exact wait is unresolved (3 vs 1),
explains why filing early is catastrophic here, and tells the person to confirm
the precise period from the current statute with a clerk or NH Legal Assistance
before filing. No user gets a computed eligibility date. Encoded as a null-period
date node (`nextUnknown`), so the structure cannot carry a pass/fail guess.

**Recommendation:** confirm the Class B misdemeanor wait against the current
RSA 651:5(III) text. Once known, the branch becomes an ordinary date node at that
period (1 or 3 years) routing to `eligible_nh` / `waiting_nh`. Until confirmed,
the hedge stands.

**Blocks:** no field — it blocks a branch. Tracked as an openQuestion on NH too.

---

## SD — automatic-removal waiting period for minor convictions (5 vs 10 years)

**Wave 7, South Dakota. Hedged: `check_autoremoval_sd` (no year asserted).**
**STATUS: OPEN — tagged for Diana's statute pass (verify against current
§ 23A-3-34 text on sdlegislature.gov). Do NOT resolve from a model reading.
Wave 7 calls this "the wave's ugliest source conflict."**

South Dakota automatically removes petty offenses, municipal ordinance
violations, and Class 2 misdemeanors from the public record after conditions are
satisfied (§ 23A-3-34) — the state's quiet automation. But the sources split on
the waiting period: **5 years vs 10 years**, and Wave 7 says to "encode from
current statute text only," without saying which wins.

**Why it is a fight, not an open question:** it is a substantive eligibility
clock for a broad class of the most common minor convictions, and the two
candidate values differ by a factor of two. A guessed "5 years" that is really
"10" would tell someone their record is clear when it is not.

**Hedge in place:** rather than assert a year, `check_autoremoval_sd` tells the
person this is automatic and routes them to CHECK their actual record (DCI
record / UJS self-help), stating plainly that the sources disagree (5 vs 10) and
that we are not asserting a date. Because the relief is automatic, "check whether
it already happened" is both honest and more useful than a computed date — no
user receives a guessed eligibility year.

**Recommendation:** confirm the § 23A-3-34 period against the current statute.
Once known, `check_autoremoval_sd` can name the actual wait while keeping the
check-your-record framing (automation means the person should still verify
status). Until confirmed, the no-year hedge stands.

**Blocks:** no field — it blocks a branch. Tracked as an openQuestion on SD too.
