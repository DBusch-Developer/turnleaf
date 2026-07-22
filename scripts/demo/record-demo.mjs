/**
 * Turnleaf demo video recorder — parameterized by state.
 *
 * Records a short walkthrough for voiceover, following this script:
 *   "Let's run thru an example. Michigan — misdemeanor, discharged 2020.
 *    Turnleaf gives the answer, the time period, and the statute. One click and
 *    you have the form to file or you're reading Michigan's own legislature
 *    site. And when a state isn't verified yet? Turnleaf says so. It never
 *    guesses. Honesty is the feature."
 *
 *   DEMO_STATE=mi node scripts/demo/record-demo.mjs   # Michigan (default)
 *   DEMO_STATE=ca node scripts/demo/record-demo.mjs   # California
 *
 * Run against the PRODUCTION server (npm run build && PORT=3100 npm start) — the
 * dev server paints a Next.js devtools badge into every frame. Outputs a single
 * turnleaf-demo-<state>.mp4 in scripts/demo/out/<state>/ (gitignored).
 *
 * How the form/statute beats work — the honest way, matching the real app:
 * both links are real target="_blank" anchors, so ONE CLICK opens the document
 * in a NEW TAB and the results page stays put. We click each for real, let the
 * new tab open, and record it. Playwright records every page (including pop-ups)
 * to its own file, so at the end we stitch — results clip, then the form tab,
 * then the statute tab, then the unverified-state beat — into one mp4 with
 * ffmpeg. No re-running the screening, no fighting the SPA.
 *
 * Headed, because headless Chromium DOWNLOADS a PDF link instead of rendering
 * it, and Michigan's MC 227 is a PDF — the whole point is to see it on screen.
 */
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.DEMO_BASE ?? 'http://localhost:3100';
const W = 1920, H = 1080;
const STATE = (process.env.DEMO_STATE ?? 'mi').toLowerCase();

const STATES = {
  mi: {
    name: 'Michigan',
    button: /^Michigan \(MI\)/,
    charge: 'Retail Fraud - Third Degree',
    level: 'misdemeanor',
    // ~6 yrs back: past the 3-yr petition wait, short of the 7-yr automatic
    // misdemeanor wait, so it lands on the MC 227 petition result.
    date: '2020-05-15',
    choiceLabels: [/Misdemeanors only/i, /^Misdemeanor$/i, /Convicted \(Guilty/i],
    yesQuestions: [],
    formCardHeading: /Application to Set Aside Conviction/i,
    formHrefNeedle: 'mc227.pdf',
    statuteHost: 'legislature.mi.gov',
  },
  ca: {
    name: 'California',
    button: /^California \(CA\)/,
    charge: 'Possession of a Controlled Substance',
    level: 'felony',
    date: '2023-06-10',
    choiceLabels: [/No probation was sentenced/i, /^Felony$/i, /Convicted \(Guilty/i],
    yesQuestions: [],
    formCardHeading: /Petition for Dismissal/i,
    formHrefNeedle: 'jcc-form/CR-180',
    statuteHost: 'leginfo',
  },
};

const S = STATES[STATE];
if (!S) { console.error(`Unknown DEMO_STATE "${STATE}". Use mi | ca.`); process.exit(1); }
const OUT = path.join(HERE, 'out', STATE);

// Dwell seconds per beat, and the fixed length kept from each new-tab clip.
const DWELL = {
  form: 3.5,     // pace on-screen before clicking the statute; clip length is TAB_KEEP
  statute: 5.5,  // pop-up must live at least TAB_KEEP + TAB_SKIP
  unverified: 6,
};
const TAB_SKIP = 0.6;  // trim the blank tab-open flash off the front of each clip
const TAB_KEEP = 4.5;  // seconds of the document to keep

const wait = (s) => new Promise((r) => setTimeout(r, s * 1000));

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
      document.addEventListener('mousemove', (e) => { d.style.left = e.clientX + 'px'; d.style.top = e.clientY + 'px'; });
      document.addEventListener('mousedown', () => { d.style.transform = 'translate(-50%,-50%) scale(.65)'; });
      document.addEventListener('mouseup', () => { d.style.transform = 'translate(-50%,-50%) scale(1)'; });
    });
  });
}

async function moveTo(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  if (!box) throw new Error('moveTo: element has no box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
  await wait(0.18);
}

async function humanClick(page, locator, { settle = 0.5 } = {}) {
  await moveTo(page, locator);
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

async function focusOn(page, locator, offset = 140) {
  const el = locator.first();
  if (!(await el.isVisible().catch(() => false))) return false;
  const box = await el.boundingBox();
  if (!box) return false;
  await smoothScroll(page, Math.max(0, (await page.evaluate(() => window.scrollY)) + box.y - offset));
  return true;
}

async function answerQuestions(page) {
  for (let i = 0; i < 20; i++) {
    const qPara = page.locator('p').filter({ hasText: /\?/ }).last();
    if ((await qPara.count()) === 0) break;
    const qText = ((await qPara.textContent()) ?? '').trim();

    let clicked = false;
    for (const label of S.choiceLabels) {
      const btn = page.getByRole('button', { name: label }).first();
      if (await btn.isVisible().catch(() => false)) { await humanClick(page, btn, { settle: 0.22 }); clicked = true; break; }
    }
    if (clicked) continue;

    const dateBox = page.locator('input[type="date"]').last();
    if (await dateBox.isVisible().catch(() => false)) { await dateBox.fill(S.date); await wait(0.35); continue; }

    const wantYes = S.yesQuestions.some((re) => re.test(qText));
    const yn = page.getByRole('button', { name: wantYes ? /^Yes$/ : /^No$/ }).first();
    if (await yn.isVisible().catch(() => false)) { await humanClick(page, yn, { settle: 0.22 }); continue; }
    break;
  }
}

/** Select the state, fill the conviction, answer the questions → results page. */
async function screenToResults(page) {
  await humanClick(page, page.getByRole('button', { name: S.button }), { settle: 0.8 });
  await humanClick(page, page.getByRole('button', { name: /Continue with 1 state/i }), { settle: 1 });

  await page.getByPlaceholder(/Petty Theft/i).click();
  await page.getByPlaceholder(/Petty Theft/i).type(S.charge, { delay: 12 });
  await wait(0.2);
  await page.locator('select').first().selectOption(S.level);
  await wait(0.25);
  await page.locator('input[type="date"]').fill(S.date);
  await wait(1.5);
  await humanClick(page, page.getByRole('button', { name: /Review & Submit/i }), { settle: 1.2 });

  await answerQuestions(page);
  await humanClick(page, page.getByRole('checkbox').first(), { settle: 0.5 });
  await humanClick(page, page.getByRole('button', { name: /Generate Eligibility Report/i }), { settle: 2 });
}

/** Click a target="_blank" link, wait for the new tab, and return it. */
async function clickIntoNewTab(ctx, page, locator) {
  await moveTo(page, locator);
  const [popup] = await Promise.all([ctx.waitForEvent('page'), locator.click()]);
  await popup.waitForLoadState('domcontentloaded').catch(() => {});
  await popup.bringToFront().catch(() => {});
  return popup;
}

async function main() {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    args: ['--force-color-profile=srgb', '--font-render-hinting=none'],
  });

  // ── Clip 1: the example → results → the two new-tab clicks ────────────────
  const ctx = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: W, height: H } },
  });
  await installCursor(ctx);
  const page = await ctx.newPage();
  const t0 = Date.now();

  // "Let's run thru an example. Michigan — misdemeanor, discharged 2020."
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await wait(1.5);
  await humanClick(page, page.getByRole('button', { name: /Start Step 1/i }), { settle: 1 });
  await screenToResults(page);

  // "Turnleaf gives the answer, the time period, and the statute."
  await wait(1.5);
  await focusOn(page, page.getByRole('heading', { name: /Records Breakdown/i }));
  await wait(3);
  await focusOn(page, page.getByRole('heading', { name: new RegExp(`statutes behind ${S.name}`, 'i') }), 240);
  await wait(2.5);
  // Everything the main clip should keep ends here; the clicks/pop-ups come next
  // and are shown from the pop-up recordings, so we cut the results clip at T.
  const splitT = (Date.now() - t0) / 1000;

  // "One click and you have the form to file..."
  await focusOn(page, page.getByRole('heading', { name: S.formCardHeading }), 180);
  const formLink = page.locator(`a[href*="${S.formHrefNeedle}"]`).first();
  const formPopup = await clickIntoNewTab(ctx, page, formLink);
  await wait(DWELL.form);

  // "...or you're reading Michigan's own legislature site."
  await page.bringToFront();
  await focusOn(page, page.getByRole('heading', { name: new RegExp(`statutes behind ${S.name}`, 'i') }), 200);
  const statuteLink = page.locator(`a[href*="${S.statuteHost}"]`).first();
  const statutePopup = await clickIntoNewTab(ctx, page, statuteLink);
  await wait(DWELL.statute);

  const mainPath = await page.video().path();
  const formPath = await formPopup.video().path();
  const statutePath = await statutePopup.video().path();
  await ctx.close(); // flush the three videos

  // ── Clip 2: an unverified state says so (separate context = clean tail) ────
  const ctx2 = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
    recordVideo: { dir: OUT, size: { width: W, height: H } },
  });
  await installCursor(ctx2);
  const page2 = await ctx2.newPage();
  await page2.goto(BASE, { waitUntil: 'networkidle' });
  await wait(0.8);
  await humanClick(page2, page2.getByRole('button', { name: /Start Step 1/i }), { settle: 0.8 });
  await humanClick(page2, page2.getByRole('button', { name: /^Alaska \(AK\)/ }), { settle: 0.3 });
  await humanClick(page2, page2.getByRole('button', { name: /Continue with 1 state/i }), { settle: 1.2 });
  await wait(DWELL.unverified - 2);
  const unverifiedPath = await page2.video().path();
  await ctx2.close();
  await browser.close();

  // ── Stitch: results[0..T] + form tab + statute tab + unverified ───────────
  const finalPath = path.join(OUT, `turnleaf-demo-${STATE}.mp4`);
  const tabEnd = (TAB_SKIP + TAB_KEEP).toFixed(2);
  const filter = [
    `[0:v]trim=0:${splitT.toFixed(2)},setpts=PTS-STARTPTS[a]`,
    `[1:v]trim=${TAB_SKIP}:${tabEnd},setpts=PTS-STARTPTS[b]`,
    `[2:v]trim=${TAB_SKIP}:${tabEnd},setpts=PTS-STARTPTS[c]`,
    `[3:v]trim=0:${DWELL.unverified.toFixed(2)},setpts=PTS-STARTPTS[d]`,
    `[a][b][c][d]concat=n=4:v=1[out]`,
  ].join(';');
  execFileSync('ffmpeg', [
    '-y',
    '-i', mainPath, '-i', formPath, '-i', statutePath, '-i', unverifiedPath,
    '-filter_complex', filter,
    '-map', '[out]',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart',
    finalPath,
  ], { stdio: 'inherit' });

  console.log('\n  [' + STATE + '] video: ' + finalPath + '  (split at ' + splitT.toFixed(1) + 's)');
}

main().catch((e) => { console.error(e); process.exit(1); });
