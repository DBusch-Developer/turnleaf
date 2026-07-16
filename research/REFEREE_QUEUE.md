# Referee Queue

Genuine fights found during encoding that the research package did not resolve.
Each was hedged in the tree (routed to a "complex — consult legal aid" result so
no user gets a guess) and logged here with a recommendation. Diana resolves
these during phone/statute verification, then the hedge becomes a real branch.

A fight belongs here only when the package leaves a substantive legal question
open — not a fee, a rollout date, or a list to confirm (those are openQuestions
on the state). This is for "the law itself is unsettled or the package
contradicts itself and does not say which wins."

**QUEUE STATUS: EMPTY — all three fights resolved by Diana's statute pass
(NH 651:5, SD § 23A-3-34, IL 5.2), each on 2026-07-16. The entries below are kept
as a record of what was hedged and how it resolved.**

---

## IL — prior felony interacting with a later felony sealing petition

**Wave 3, Illinois. Was hedged: `complex_new_law_il`.**
**STATUS: RESOLVED — Diana verified 20 ILCS 2630/5.2 against ilga.gov
(https://ilga.gov/documents/legislation/ilcs/documents/002026300K5.2.htm,
retrieved 2026-07-16), governing text "after amendment by P.A. 104-459, eff.
6-1-26". Subsection (c)(4) is now "(Blank)": the subsequent-felony sealing bar
AND the unseal-on-new-conviction provision are repealed — a prior felony no
longer bars sealing a later one. `complex_new_law_il` (the "don't rely on yes or
no" hedge) was removed; the felony path now routes to the normal timeline via a
new probation-vs-incarceration split (felony completed on probation/conditional
discharge without revocation = 2 yrs (c)(2)(D); incarceration felony = 3 yrs
(c)(2)(F)), with the eligible copy noting the court may weigh criminal history on
objection (d)(7) and that the clock runs from the LAST sentence (a)(1)(F), so a
new felony restarts the wait. New Leaf Illinois kept as a referral. Also encoded
from the verified text: (d)(3) drug test repealed (no copy referenced it); (k)
automatic sealing Jan 1 2029 / (l) clerk auto-seal Jan 1 2028 (inversion note —
petition now beats waiting); (b)(2)(A-5) 61-day-early diversion filing; (d)(6)(C)
+ (a)(1)(M) LFO rule (unpaid court debt cannot block sealing). Source linked.
IL was then FLIPPED to statute_cited on 2026-07-16 after Diana also verified the
(b)(2)(B)(i)/(i-5) 5-year supervision list (Vehicle Code 3-707/3-708/3-710/5-401.3,
Criminal Code 11-1.50/12-3.2/12-15, under-25 11-503) against the same text — the
last open legal question — which the tree now encodes as a 5-year-list gate on the
ordinary-supervision path ((ii) 2-year default). verifiedDate 2026-07-16.
Regression-locked by IL persona 5. Closed 2026-07-16.**

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

**Wave 7, New Hampshire. Was hedged: `complex_classBmisd_nh`.**
**STATUS: RESOLVED — Diana verified RSA 651:5 against gc.nh.gov (retrieved
2026-07-16). The Class B misdemeanor wait is 2 YEARS (III(b)). The 1-vs-3
conflict was both sources being wrong: 1 yr = violations III(a); 3 yr = Class A
misdemeanor III(c). The hedge (`complex_classBmisd_nh`) was replaced with an
ordinary 2-year date node (`date2b_nh`) citing III(b); the complex result was
removed. Regression-locked by NH persona 6. Full ladder confirmed: violation
1yr (a) / Class B misd 2yr (b) / Class A misd 3yr (c) / Class B felony 5yr (d) /
Class A felony 10yr (e), with 10-yr carve-outs for sexual assault 632-A:4 (f),
felony indecent exposure (g), and DV misdemeanor 631:2-b (h, with stacking), and
a 2-yr drug carve-out under 318-B:26 II for a class A misdemeanor OR felony (i).
NH flipped to verificationStatus: statute_cited. Closed 2026-07-16.**

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

**Wave 7, South Dakota. Was hedged: `check_autoremoval_sd` (no year asserted).**
**STATUS: RESOLVED — Diana verified § 23A-3-34 against sdlegislature.gov
(https://sdlegislature.gov/Statutes/23A-3-34, retrieved 2026-07-16). The wait is
FIVE years; the "10" appears nowhere in the section. `check_autoremoval_sd` now
states the real 5-year wait while keeping its check-your-record framing (the
relief is automatic). Also encoded from the verified text: the gate is the
HIGHEST offense CHARGED in the case (reaching charges, not just convictions); the
clock needs all court-ordered conditions satisfied AND no further convictions in
5 years; and removal is from the PUBLIC record only — the case stays available to
court personnel and usable as a later-prosecution enhancement. Source linked;
amendment history (SL 2016 ch 134, SL 2021 ch 106) added to keyDates. SD stays
`draft` overall — § 23A-3-34 is one branch; the rest of SD's statutes are
unverified — so only that source carries a link (partial verification). Closed
2026-07-16.**

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
