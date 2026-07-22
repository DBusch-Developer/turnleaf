/**
 * Turnleaf demo video recorder — parameterized by state.
 *
 * Records a ~90s silent walkthrough for voiceover. Beats are timed to the
 * narration script; see TIMELINE below. Run against the PRODUCTION server
 * (npm run build && PORT=3100 npm start) — the dev server paints a Next.js
 * devtools badge into every frame.
 *
 *   DEMO_STATE=mi node scripts/demo/record-demo.mjs   # Michigan (default)
 *   DEMO_STATE=ca node scripts/demo/record-demo.mjs   # California
 *   DEMO_STATE=az node scripts/demo/record-demo.mjs   # Arizona (original)
 *
 * Outputs webm to scripts/demo/out/<state>/, then transcode to mp4 with ffmpeg.
 *
 * Each state carries its own screening path — the decision trees differ, so the
 * answers that reach a clean "eligible → petition form" result differ too. The
 * per-state config below is the whole difference; the beats are identical.
 *
 * BOTH the form and the statute get a real click (mi/ca). The results page is
 * in-memory React state with no URL, so clicking the form (which navigates to
 * the document) destroys it — goBack just reloads the app to its landing page.
 * So after the form beat we simply RE-RUN the screening (fast, off the narration
 * clock) to rebuild the results page, then click the statute. One replay buys
 * two genuine clicks and depends on nothing as flaky as the back-forward cache.
 * az keeps clickForm:false — its form "varies by county" and dead-ends at a hub.
 *
 * Headed, because headless Chromium DOWNLOADS a PDF form link instead of showing
 * it — Michigan's MC 227 is a PDF, and the whole point is to see it on screen.
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.DEMO_BASE ?? 'http://localhost:3100';
const W = 1920, H = 1080;
const STATE = (process.env.DEMO_STATE ?? 'mi').toLowerCase();

// ── Per-state screening path ────────────────────────────────────────────────
// charge/level/date seed the record form. choiceLabels are the multiple-choice
// options to click, checked in order (most specific first) — a boolean question
// with no matching choice falls through to `No`, except questions whose text
// matches yesQuestions, which get `Yes`. date is used for every date field on
// the path. The MI/CA dates FAIL the automatic-clean-slate clock but PASS the
// petition clock, so the result is the petition card (the one that names a form
// to click), not "your record may already be cleared".
const STATES = {
  az: {
    name: 'Arizona',
    button: /^Arizona \(AZ\)/,
    charge: 'Possession of a Controlled Substance',
    level: 'felony',
    date: '2019-04-12',
    choiceLabels: [/Class 4, 5, or 6 Felony/i],
    yesQuestions: [/^Have you finished the NON-MONEY/i],
    formCardHeading: /Application to Set Aside Conviction/i,
    clickForm: false,
    statuteHost: 'azleg.gov',
  },
  mi: {
    name: 'Michigan',
    button: /^Michigan \(MI\)/,
    charge: 'Retail Fraud - Third Degree',
    level: 'misdemeanor',
    // ~6 yrs back: past the 3-yr petition wait, short of the 7-yr automatic
    // misdemeanor wait, so it lands on the MC 227 petition result.
    date: '2020-05-15',
    choiceLabels: [
      /Misdemeanors only/i,          // petition_counts_mi
      /^Misdemeanor$/i,             // auto_level_mi
      /Convicted \(Guilty/i,        // disposition
    ],
    yesQuestions: [],
    formCardHeading: /Application to Set Aside Conviction/i,
    clickForm: true,
    formHrefNeedle: 'mc227.pdf',
    statuteHost: 'legislature.mi.gov',
  },
  ca: {
    name: 'California',
    button: /^California \(CA\)/,
    charge: 'Possession of a Controlled Substance',
    level: 'felony',
    // ~3 yrs back: short of the 4-yr automatic-relief clock for a felony, so it
    // lands on the CR-180 dismissal-petition result, not "already cleared".
    date: '2023-06-10',
    choiceLabels: [
      /No probation was sentenced/i, // probation_status
      /^Felony$/i,                  // no_probation_level_ca
      /Convicted \(Guilty/i,        // disposition
    ],
    yesQuestions: [],
    formCardHeading: /Petition for Dismissal/i,
    clickForm: true,
    formHrefNeedle: 'jcc-form/CR-180',
    statuteHost: 'leginfo',
  },
};

const S = STATES[STATE];
if (!S) { console.error(`Unknown DEMO_STATE "${STATE}". Use mi | ca | az.`); process.exit(1); }
const OUT = path.join(HERE, 'out', STATE);

// Narration beats, in script order. Seconds are the on-screen dwell for each.
// DWELL ONLY — clicks, typing, scrolls and navigation add their own time, and
// the fast screening replay is deliberately off this clock. Measure the result
// with: ffprobe -show_entries format=duration.
const TIMELINE = {
  hero: 8,
  grid: 7,
  guardrails: 6,
  form: 3,
  questions: 4,
  results: 7,
  formCard: 7,
  statute: 5,
  draft: 5,
  close: 3,
};

const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));

/** A soft cursor dot so clicks read on camera. Playwright's real cursor is invisible. */
async function installCursor(ctx) {
  await ctx.addInitScript(() => {
    window.addEventListener('DOMContentLoaded', () => {
      const d = document.createElement('div');
      d.id = '__cursor';
      d.style.cssText = `position:fixed;z-index:2147483647;width:22px;height:22px;
        border-radius:50%;background:rgba(45,120,90,.35);
        border:2px solid rgba(45,120,90,.9);pointer-events:none;
        transform:translate(-50%,-50%);transition:transform .12s ease,opacity .2s;
        left:-100px;top:-100px;box-shadow:0 2px 10px rgba(0,0,0,.25)`;
      document.body.appendChild(d);
      document.addEventListener('mousemove', (e) => {
        d.style.left = e.clientX + 'px';
        d.style.top = e.clientY + 'px';
      });
      document.addEventListener('mousedown', () => { d.style.transform = 'translate(-50%,-50%) scale(.65)'; });
      document.addEventListener('mouseup', () => { d.style.transform = 'translate(-50%,-50%) scale(1)'; });
    });
  });
}

/** Move the mouse to an element in a few steps, then click. Reads as human. */
async function humanClick(page, locator, { settle = 0.5, approach = 0.18 } = {}) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('humanClick: element has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
  await wait(approach);
  await locator.click();
  await wait(settle);
}

async function smoothScroll(page, to, ms = 900) {
  await page.evaluate(
    ([target, dur]) => new Promise((res) => {
      const start = window.scrollY, delta = target - start, t0 = performance.now();
      const ease = (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
      (function step(now) {
        const p = Math.min(1, (now - t0) / dur);
        window.scrollTo(0, start + delta * ease(p));
        p < 1 ? requestAnimationFrame(step) : res();
      })(t0);
    }),
    [to, ms]
  );
  await wait(ms / 1000);
}

/** Scroll so an element sits pleasantly high in frame. Returns false (fast) if
 *  the element isn't on the page, so a missing beat degrades instead of hanging
 *  on boundingBox's 30s wait. */
async function focusOn(page, locator, offset = 140) {
  const el = locator.first();
  if (!(await el.isVisible().catch(() => false))) return false;
  const box = await el.boundingBox();
  if (!box) return false;
  await smoothScroll(page, Math.max(0, (await page.evaluate(() => window.scrollY)) + box.y - offset));
  return true;
}

/**
 * Answer the plain-language questions until the confirm panel appears. The
 * wizard reveals one question at a time; at each step we read the visible
 * controls and apply this state's rules, so the loop is resilient to the record
 * form pre-answering a question or the tree branching unexpectedly.
 */
async function answerQuestions(page, { fast = false } = {}) {
  const settle = fast ? 0.12 : 0.22;
  const start = Date.now();
  for (let i = 0; i < 20; i++) {
    const qPara = page.locator('p').filter({ hasText: /\?/ }).last();
    if ((await qPara.count()) === 0) break;
    const qText = ((await qPara.textContent()) ?? '').trim();

    let clicked = false;
    for (const label of S.choiceLabels) {
      const btn = page.getByRole('button', { name: label }).first();
      if (await btn.isVisible().catch(() => false)) {
        await humanClick(page, btn, { settle });
        clicked = true;
        break;
      }
    }
    if (clicked) continue;

    const dateBox = page.locator('input[type="date"]').last();
    if (await dateBox.isVisible().catch(() => false)) {
      await dateBox.fill(S.date);
      await wait(fast ? 0.15 : 0.4);
      continue;
    }

    const wantYes = S.yesQuestions.some((re) => re.test(qText));
    const yn = page.getByRole('button', { name: wantYes ? /^Yes$/ : /^No$/ }).first();
    if (await yn.isVisible().catch(() => false)) {
      await humanClick(page, yn, { settle });
      continue;
    }
    break;
  }
  if (!fast) {
    const spent = (Date.now() - start) / 1000;
    if (spent < TIMELINE.questions) await wait(TIMELINE.questions - spent);
  }
}

/**
 * From the state selector: pick the state, fill the conviction form, answer the
 * questions, and generate the report — landing on the results page. fast mode
 * strips the narration dwells for the off-clock replay before the statute beat.
 */
async function doScreening(page, { fast = false } = {}) {
  await humanClick(page, page.getByRole('button', { name: S.button }), { settle: fast ? 0.3 : 0.9 });
  await humanClick(page, page.getByRole('button', { name: /Continue with 1 state/i }), { settle: fast ? 0.4 : 1.2 });

  await page.getByPlaceholder(/Petty Theft/i).click();
  await page.getByPlaceholder(/Petty Theft/i).type(S.charge, { delay: fast ? 0 : 9 });
  if (!fast) await wait(0.25);
  await page.locator('select').first().selectOption(S.level);
  if (!fast) await wait(0.3);
  await page.locator('input[type="date"]').fill(S.date);
  if (!fast) await wait(TIMELINE.form);
  await humanClick(page, page.getByRole('button', { name: /Review & Submit/i }), { settle: fast ? 0.4 : 1.3 });

  await answerQuestions(page, { fast });
  await humanClick(page, page.getByRole('checkbox').first(), { settle: fast ? 0.2 : 0.6 });
  await humanClick(page, page.getByRole('button', { name: /Generate Eligibility Report/i }), { settle: fast ? 1 : 2 });
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: ['--force-color-profile=srgb', '--font-render-hinting=none'],
  });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: W, height: H } },
  });
  await installCursor(ctx);
  const page = await ctx.newPage();

  // ── 1. Hero ───────────────────────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await wait(TIMELINE.hero * 0.55);
  await smoothScroll(page, 380);
  await wait(TIMELINE.hero * 0.45 - 0.9);

  // ── 2. State grid — verified vs drafted badges ────────────────────────────
  await smoothScroll(page, 0, 500);
  await humanClick(page, page.getByRole('button', { name: /Start Step 1/i }), { settle: 1.2 });
  await wait(2);
  await smoothScroll(page, 520, 1600);
  await wait(Math.max(0, TIMELINE.grid - 4.5));
  await smoothScroll(page, 0, 700);

  // ── 3. Guardrails — real npm test output ──────────────────────────────────
  const guardrails = 'file:///' + path.join(HERE, 'guardrails.html').replace(/\\/g, '/');
  const appUrl = page.url();
  await page.goto(guardrails, { waitUntil: 'load' });
  await wait(TIMELINE.guardrails);
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await humanClick(page, page.getByRole('button', { name: /Start Step 1/i }), { settle: 1 });

  // ── 4-5. Pick the state, fill the form, answer the questions ──────────────
  await doScreening(page, { fast: false });

  // ── 6. Results — the answer ───────────────────────────────────────────────
  await wait(2);
  await focusOn(page, page.getByRole('heading', { name: /Records Breakdown/i }));
  await wait(TIMELINE.results - 5);

  // ── 7. The form card, then a real click into the form ─────────────────────
  await focusOn(page, page.getByRole('heading', { name: S.formCardHeading }), 180);
  await wait(TIMELINE.formCard * 0.5);
  if (S.clickForm) {
    const formLink = page.locator(`a[href*="${S.formHrefNeedle}"]`).first();
    await formLink.evaluate((a) => a.setAttribute('target', '_self')); // in-tab, or a popup is a separate video
    await humanClick(page, formLink, { settle: 0.3 });
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await wait(TIMELINE.formCard * 0.7); // dwell on the real form
  } else {
    await wait(TIMELINE.formCard * 0.5);
  }

  // ── Rebuild results (fast, off the narration clock) so the statute link is
  //    back to click — the form click navigated away and took the SPA with it.
  if (S.clickForm) {
    await page.goto(BASE, { waitUntil: 'networkidle' });
    await humanClick(page, page.getByRole('button', { name: /Start Step 1/i }), { settle: 0.5 });
    await doScreening(page, { fast: true });
    await wait(1);
  }

  // ── 8. One click → the state's own legislature ────────────────────────────
  const onResults = await focusOn(
    page, page.getByRole('heading', { name: new RegExp(`statutes behind ${S.name}`, 'i') }), 200
  );
  await wait(1.2);
  if (onResults) {
    const statuteLink = page.locator(`a[href*="${S.statuteHost}"]`).first();
    await statuteLink.evaluate((a) => a.setAttribute('target', '_self'));
    await humanClick(page, statuteLink, { settle: 0.3 });
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await wait(TIMELINE.statute - 2);
  }

  // ── 9. An unverified state says so ────────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await humanClick(page, page.getByRole('button', { name: /Start Step 1/i }), { settle: 0.9 });
  await humanClick(page, page.getByRole('button', { name: /^Alaska \(AK\)/ }), { settle: 0.22 });
  await humanClick(page, page.getByRole('button', { name: /Continue with 1 state/i }), { settle: 1.5 });
  await wait(TIMELINE.draft - 3);

  // ── 10. Close on the slogan ───────────────────────────────────────────────
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await wait(TIMELINE.close);

  await ctx.close();   // flushes the video
  await browser.close();

  const file = fs.readdirSync(OUT).find((f) => f.endsWith('.webm'));
  console.log('\n  [' + STATE + '] video: ' + path.join(OUT, file));
}

main().catch((e) => { console.error(e); process.exit(1); });
