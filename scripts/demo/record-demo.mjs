/**
 * Turnleaf demo video recorder.
 *
 * Records a ~90s silent walkthrough for voiceover. Beats are timed to the
 * narration script; see TIMELINE below. Run against the PRODUCTION server
 * (npm run build && PORT=3100 npm start) — the dev server paints a Next.js
 * devtools badge into every frame.
 *
 *   node scripts/demo/record-demo.mjs
 *
 * Outputs webm to scripts/demo/out/, then transcode to mp4 with ffmpeg.
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, 'out');
const BASE = process.env.DEMO_BASE ?? 'http://localhost:3100';
const W = 1920, H = 1080;

// Narration beats, in script order. Seconds are the on-screen dwell for each.
// These are DWELL ONLY — clicks, typing, scrolls and navigation add ~22s of
// their own, so the sum here runs well under the 90s cap. First pass summed
// to 90 and produced a 115s video; keep that overhead in mind before raising
// any of these. Measure with: ffprobe -show_entries format=duration.
const TIMELINE = {
  hero: 8,         // "Meet Maria..." + "Record clearing is legal in all fifty states"
  grid: 7,         // "...most of what Google returns is outdated or just wrong"
  guardrails: 6,   // "three guardrails keep it honest"
  // Data entry is the one beat with no narration to fill it — the line is just
  // "Arizona, class 4 felony, discharged 2019," ~4s. Keep these tight; watching
  // fields populate in real time is dead air.
  form: 3,         // "Arizona — class 4 felony, discharged 2019"
  questions: 4,    // plain-language questions
  results: 7,      // "gives the answer, the waiting period, and the statute"
  formCard: 7,     // "a real form, and a real fee" — set-aside card, $0 by statute
  fees: 4,         // "would rather say we don't know yet than guess"
  statute: 5,      // "one click — Arizona's own legislature site"
  draft: 5,        // "when a state isn't verified yet"
  close: 3,        // slogan
};

const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));

/** A soft cursor dot so clicks read on camera. Playwright's real cursor is invisible. */
async function installCursor(page) {
  await page.addInitScript(() => {
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
      document.addEventListener('mousedown', () => {
        d.style.transform = 'translate(-50%,-50%) scale(.65)';
      });
      document.addEventListener('mouseup', () => {
        d.style.transform = 'translate(-50%,-50%) scale(1)';
      });
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

/** Scroll so an element sits pleasantly high in frame, not jammed at the top. */
async function focusOn(page, locator, offset = 140) {
  const box = await locator.boundingBox();
  if (!box) return;
  await smoothScroll(page, Math.max(0, (await page.evaluate(() => window.scrollY)) + box.y - offset));
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({ args: ['--force-color-profile=srgb', '--font-render-hinting=none'] });
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: W, height: H } },
  });
  await installCursor(ctx);
  const page = await ctx.newPage();

  // ── 1. Hero ───────────────────────────────────────────────────────────────
  // "Meet Maria. She finished probation six years ago..."
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await wait(TIMELINE.hero * 0.55);
  await smoothScroll(page, 380);
  await wait(TIMELINE.hero * 0.45 - 0.9);

  // ── 2. State grid — 50 states, verified vs drafted ────────────────────────
  // "Every state has different rules, and most of what Google returns is wrong."
  await smoothScroll(page, 0, 500);
  await humanClick(page, page.getByRole('button', { name: /Start Step 1/i }), { settle: 1.2 });
  await wait(2);
  // Drift down the list so the ⚖️ Statute Cited / 📝 Drafted badges both read.
  await smoothScroll(page, 520, 1600);
  await wait(Math.max(0, TIMELINE.grid - 4.5));
  await smoothScroll(page, 0, 700);

  // ── 3. Guardrails — real npm test output ──────────────────────────────────
  // "255 automated tests" → actually 591. A referee process. A build that fails.
  const guardrails = 'file:///' + path.join(HERE, 'guardrails.html').replace(/\\/g, '/');
  const appUrl = page.url();
  await page.goto(guardrails, { waitUntil: 'load' });
  await wait(TIMELINE.guardrails);
  await page.goto(appUrl, { waitUntil: 'networkidle' });
  await humanClick(page, page.getByRole('button', { name: /Start Step 1/i }), { settle: 1 });

  // ── 4. Arizona + the conviction form ──────────────────────────────────────
  // "Arizona — class 4 felony, discharged 2019."
  await humanClick(page, page.getByRole('button', { name: /^Arizona$/ }), { settle: 0.9 });
  await humanClick(page, page.getByRole('button', { name: /Continue with 1 state/i }), { settle: 1.2 });

  await page.getByPlaceholder(/Petty Theft/i).click();
  await page.getByPlaceholder(/Petty Theft/i).type('Possession of a Controlled Substance', { delay: 9 });
  await wait(0.25);
  await page.locator('select').first().selectOption('felony');
  await wait(0.3);
  await page.locator('input[type="date"]').fill('2019-04-12');
  await wait(TIMELINE.form);
  await humanClick(page, page.getByRole('button', { name: /Review & Submit/i }), { settle: 1.3 });

  // ── 5. The plain-language questions ───────────────────────────────────────
  // "as simple as answering questions in plain language"
  const qStart = Date.now();
  for (let i = 0; i < 12; i++) {
    // Generate stays disabled until the confirm checkbox too, so the panel
    // itself — not the button — is what tells us the questions are done.
    const qPara = page.locator('p').filter({ hasText: /\?/ }).last();
    if ((await qPara.count()) === 0) break;

    const dateBox = page.locator('input[type="date"]').last();
    const classBtn = page.getByRole('button', { name: /Class 4, 5, or 6 Felony/i });
    const qText = (await qPara.textContent()) ?? '';

    if (await classBtn.isVisible().catch(() => false)) {
      await humanClick(page, classBtn, { settle: 0.22 });
    } else if (await dateBox.isVisible().catch(() => false)) {
      // "When did you finish...and get discharged?" — a date, not a Yes/No.
      await dateBox.fill('2019-04-12');
      await wait(0.4);
    } else if (/^Have you finished the NON-MONEY/i.test(qText.trim())) {
      // Maria completed her sentence — this one is a Yes.
      await humanClick(page, page.getByRole('button', { name: /^Yes$/ }), { settle: 0.22 });
    } else {
      await humanClick(page, page.getByRole('button', { name: /^No$/ }), { settle: 0.22 });
    }
  }
  const spent = (Date.now() - qStart) / 1000;
  if (spent < TIMELINE.questions) await wait(TIMELINE.questions - spent);

  await humanClick(page, page.getByRole('checkbox').first(), { settle: 0.6 });
  await humanClick(page, page.getByRole('button', { name: /Generate Eligibility Report/i }), { settle: 2 });

  // ── 6. Results — the answer and the statute ───────────────────────────────
  // "Turnleaf gives the answer, the waiting period, and the statute."
  await wait(2);
  await focusOn(page, page.getByRole('heading', { name: /Records Breakdown/i }));
  await wait(TIMELINE.results - 5);

  // ── 7a. The honesty beat ──────────────────────────────────────────────────
  // "would rather say 'we don't know yet' than guess"
  // Sealing card first, then set-aside — that is their DOM order, so the
  // camera only ever scrolls downward through the forms section.
  const unverified = page.getByText(/Not yet verified — ask the court clerk/i).first();
  await focusOn(page, unverified, 320);
  await wait(TIMELINE.fees);

  // ── 7b. The form and the fee ──────────────────────────────────────────────
  // "Maria gets a real answer, a real form, and a real fee."
  // The set-aside card carries all three at once, and unlike the sealing fee
  // both the form and the $0 are verified against the statute. Clicking the
  // form link is deliberately NOT done: it resolves to azcourts.gov's generic
  // Self-Service Center hub (the form "varies by county"), which shows no
  // petition on screen and would read as a dead end.
  await focusOn(page, page.getByRole('heading', { name: /Application to Set Aside Conviction/i }), 180);
  await wait(TIMELINE.formCard);

  // ── 8. One click → Arizona's legislature ──────────────────────────────────
  // "One click — and you're reading Arizona's own legislature site."
  await focusOn(page, page.getByRole('heading', { name: /statutes behind Arizona/i }), 200);
  await wait(2);
  const statuteLink = page.locator('a[href*="azleg.gov"]').first();
  // Keep it in-tab: a popup would land in a separate video file.
  await statuteLink.evaluate((a) => a.setAttribute('target', '_self'));
  await humanClick(page, statuteLink, { settle: 0.3 });
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  await wait(TIMELINE.statute - 4);

  // ── 9. An unverified state says so ────────────────────────────────────────
  // "And when a state isn't verified yet? Turnleaf says so. It never guesses."
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
  console.log('\n  video: ' + path.join(OUT, file));
}

main().catch((e) => { console.error(e); process.exit(1); });
