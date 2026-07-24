# Money-gate triage — which states to re-read against their statutes

**Date:** 2026-07-23
**Author:** generated from the encoded trees; **no statute was read to produce it**
**Purpose:** rank the 31 states whose trees condition anything on money, so verification calls and statute re-reads go to the riskiest first.

---

## Why this exists

Florida is the worked example. `sentence_complete_fl` asked whether someone had "completed all terms of your sentence, including any probation and payment of restitution," and a second gate asked about fines. Both were **inferred from the node's own phrasing**, and both were wrong: the 2025 text of § 943.059 has no financial-obligation criterion anywhere in the section. The real gate is § 943.059(1)(d), court supervision. FL went restitution-only → all-money → not-money-gated across three passes, and only the third was a statute read.

The failure mode is specific and worth naming:

> A broad completion phrase — "all terms of your sentence" — gets encoded as a **money** requirement, because money is the thing people usually owe. The statute may impose no financial criterion at all.

The cost of getting this wrong is not symmetric. Telling someone they must pay first when the law doesn't say so can delay a filing by years, or convince them they are permanently ineligible. That is worse than most bugs this codebase can produce.

## What this document is and is not

**It is** a shape analysis of what is currently encoded: for each money-touching node, its exact text, whether money is stated as its own requirement or folded into a broader gate, and the citations on the results one hop downstream.

**It is not** a legal review. Nothing here says a rule is wrong. The tiers rank *how much the encoding leans on inference*, which is a proxy for risk — not a finding. Only a statute read settles any line in it.

**Read the "CITES" caveat.** Those are the citations carried by results reachable in **one hop** from the node. That is a proxy for "the authority behind this gate," not the same thing. A node whose branches lead to more nodes shows no citation here and may still be well-sourced.

---

## Ranked summary

| Tier | What characterizes it | States | Priority |
|---|---|---|---|
| **A** | Money folded into a broad completion-or-date gate. The FL shape. | AR, ID, ME, MS, MT, NE, NH, OH, OK, WY | **Highest** |
| **B** | Money is its own gate with a specific subsection cite. Verify the subsection says it. | AL, AZ, DE, IA, NC, ND, NM, RI, TN, UT, VT | Medium |
| **C** | Encoding says money does **NOT** block. A wrong negative over-clears. | AZ, CO, CT, OR, PA, WA | Medium-high |
| **D** | Money present but not an eligibility gate. No action. | KY, MA, MN, SC | None |

States appear in more than one tier when different nodes differ.

---

## Tier A — money inferred from a completion phrase

The exact shape that was wrong in Florida. For each: **does the cited section actually impose a financial condition, or does the encoding read one into "all terms"?**

### AR — Arkansas · `completion_gate_ar` → A.C.A. § 16-90-1404(1)
> "Have you fully completed your sentence? That means: all fines, court costs, and monetary obligations paid in full (unless the court excused them); all incarceration served; discharged from probation, parole, or post-release supervision; any suspended sentence completed; restitution paid; community service done; driver's-license reinstatement fees paid and requirements met; and any required vocational program completed."

Also `misd_enhanced_date_ar`, `felony_violent_date_ar` (same money folded into the clock).
**Note in AR's favor:** the enumeration is so specific — driver's-license reinstatement fees, vocational programs — that it reads like a transcribed statutory definition rather than an invented one. § 16-90-1404 is Arkansas's *definitions* section. **Ask:** does 1404(1) define "completion of sentence" to include the monetary items, and does the "unless the court excused them" carve-out come from the text?

### NH — New Hampshire · seven date nodes → RSA § 651:5, § 651:5(IV)
> "When did you complete ALL terms of your sentence, including fines and fees?"

`date1_nh`, `date2_nh`, `date2b_nh`, `date3_nh`, `date5_nh`, `date7_nh`, `date10_nh` — identical text, seven waiting periods. **Highest blast radius in Tier A**: one wrong reading is wrong seven times, on every NH annulment path. **Ask:** does § 651:5 make payment part of the annulment clock, or a separate condition, or neither?

### OH — Ohio · six date nodes → R.C. 2953.32
> "When was your final discharge — sentence, probation or parole, fines and restitution all complete?"

`sealonly_date_oh`, `soliciting_date_oh`, `minor_misd_date_oh`, `misd_date_oh`, `f45_date_oh`, `f3_date_oh`. Same blast-radius problem as NH. Turns on what "final discharge" means in 2953.32. **Ask:** is final discharge defined to include financial sanctions?

### MT — Montana · `misd_complete_mt` → § 46-18-1107(a)
> "Have you completed ALL terms of your sentence — including all fines, fees, restitution, and any court-ordered treatment?"

### MS — Mississippi · `felony_date_ms` → § 99-19-71(2)
> "When did you complete every term and condition of your sentence, including paying all fines and costs?"

### ID — Idaho · `shielding_date_id` → § 67-3004(11)
> "When did you complete your FULL sentence — including probation, parole, all fines, and all restitution?"

### ME — Maine · `classE_date_me` → tit. 15, § 2262(2)
> "When did you FULLY satisfy every part of the sentence — all jail/probation and all fines and fees?"

### WY — Wyoming · `felony_date_wy` → § 7-13-1502
> "What is the LATER of these three dates: your sentence terms ended, you completed any programs, or you paid restitution IN FULL?"

Restitution here sets the **clock start**, which is a stronger claim than a filing prerequisite — it can move an eligibility date by years. **Ask:** does § 7-13-1502 anchor the period on restitution payment?

### NE — Nebraska · `pathA_complete_ne` → § 29-2264(2)
> "Have you fulfilled or been discharged from probation, paid any fine, and completed any community service?"

"paid any fine" is narrower than the others — closer to a literal statutory phrase. Likely lower risk within the tier.

### OK — Oklahoma · `reclassified_ok` → 22 O.S. § 18(A)
> "…and is all restitution paid in full?"

Bundled into a four-part compound question, so a person answering "no" cannot tell which part failed. **Ask:** is restitution in § 18(A), and should this be split so the reason is visible?

---

## Tier B — money is its own gate with a subsection cite

Lower risk: someone pointed at a specific subsection. Verification is confirmatory — **does that subsection say what the node says?**

| State | Node | Text | Cite |
|---|---|---|---|
| **NM** | `petition_gate_nm` / `restitution_gate_nm` | fines-and-fees gate and restitution gate, **separately** | § 29-3A-5(A) / (C) |
| **VT** | `conv_restitution_vt` | "all restitution and surcharges… (Waived surcharges are excepted.)" | 13 V.S.A. § 7602 |
| **ND** | `conv_restitution_nd` | "all restitution ordered in the case" | § 12-60.1-04(1)(d) |
| **IA** | `nonconv_costs_ia` | "…even for a case that ended WITHOUT a conviction" | § 901C.2 |
| **RI** | `first_debt_ri` | "…that the court has NOT reduced or waived" | § 12-1.3-3 |
| **UT** | `restitution_ut` / `fines_ut` | "unsatisfied criminal account receivable blocks… both tracks" | § 77-40a-303(1)(b) |
| **AL** | `misd_restitution_al` / `fines_al` | split restitution / fines-and-costs | § 15-27-1(b) |
| **TN** | `restitution_5_tn` / `fines_5_tn` (+10-yr pair) | split restitution / fines-costs-assessments | § 40-32-107(a)(3)(B),(C) |
| **NC** | `restitution_nc` | "all restitution ordered" (fines do not block) | § 15A-145.5 |
| **AZ** | `monetary_check_az` / `monetary_fines_az` | split, with restitution defined as victim money | §§ 13-905, 13-911(E),(G) |
| **DE** | `conv_money_de` | "all fines, fees, and restitution… paid in full" | *no cite within one hop* |

**NM is the reference implementation** — two separate gates, two separate subsections. Anything that looks like NM is in good shape.

**DE is the one to look at first in this tier.** It is the only single-question all-money gate here whose downstream results carry no citation at one hop, and it is followed by a willfulness question (`conv_money_willful_de` — "Was the nonpayment NON-willful?"), which implies an ability-to-pay doctrine worth confirming rather than inferring.

---

## Tier C — the encoding says money does *not* block

These are the FL error inverted, and worth attention because a wrong negative **over-clears**: it tells someone to file when money genuinely does bar them. These read as careful, deliberate encodings — someone clearly thought about this exact distinction — which is precisely why a wrong one would be convincing.

- **AZ** `sentence_completed`, and eight `discharge_date_*` nodes: *"Money you still owe does not matter for this question. Unpaid fines, fees and restitution do NOT delay your waiting period; they only have to be paid by the time you file."* A clock-versus-prerequisite distinction, stated eight times. Confirm once, it holds everywhere.
- **CO** `restitution_co`: *"Unpaid fines, court costs, and fees do NOT count against you — only restitution."* → C.R.S. 24-72-706(1)(e)
- **CT** `conv_precond_ct`: *"An unpaid fine does NOT count against you here — it survives erasure but does not block it."* → § 54-142a(e)(3). "Survives erasure but does not block it" is an unusually specific claim.
- **PA** `restitution_pa`: *"unpaid fines and costs do NOT block, but unpaid restitution does"* → §§ 9122.1, 9122.2
- **WA** `misd_date_wa`: *"Unpaid fines do NOT delay this clock — but they must be paid before you file."* `misd_dv_date_wa`: *"Payment of fines and fees is NOT part of this clock."* → RCW 9.96.060(2)(a),(f)
- **OR** `mj_pre2017_or`, `conv_supervision_or`: *"Old unpaid marijuana fines whose judgments have expired count as satisfied."* → § 137.226(2)

---

## Tier D — no action

- **KY** `felony_paid_ky` — the $250 expungement **fee**, a cost of the remedy, not an eligibility criterion. Correctly separate, same as FL's $75 FDLE fee.
- **MA** `misd_date_ma` / `felony_date_ma` — "fined $50 or less" classifies which motor-vehicle offenses count, not a payment condition.
- **MN** `felony_auto_list_mn`, **SC** `s920_excluded_sc` / `court_type_sc` — matched on "financial crimes" and "motor-vehicle"; no money condition.

---

## Suggested order

1. **NH and OH** — seven and six nodes respectively, so one answer each corrects the most encoded surface.
2. **WY** — restitution sets a clock start, the highest-leverage single claim in Tier A.
3. **AR, MT, MS, ID, ME, NE, OK** — the rest of Tier A.
4. **DE** — the weakest-sourced gate in Tier B, plus its willfulness doctrine.
5. **Tier C spot-check** — start with CT's "survives erasure but does not block it," the most specific negative claim on the board.

## Rules that apply to acting on this

Per [AGENTS.md](../../AGENTS.md): a corrected value may only come from `research/waves/` or Diana's verified read. Where a re-read shows the encoding overstates a money requirement, the fix is the FL pattern — remove the money gate, encode what the statute actually gates on, and record the distinction in user-facing copy (money may still matter *indirectly*, as unpaid amounts extending supervision). Where the statute is unclear or conflicting, the field goes `null` with an `open_questions` entry, never a guess.
