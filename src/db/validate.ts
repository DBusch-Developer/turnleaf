// Standalone structural validation (FR-21). Needs no database, so CI can gate
// a PR on it. `npm run validate`.
//
// Structure only — never legal correctness. See src/data/validateState.ts.

import { fallbackRules } from '../data/fallbackRules';
import { validateAll, formatErrors } from '../data/validateState';

const stateCount = Object.keys(fallbackRules).length;
const errors = validateAll(fallbackRules);

if (errors.length > 0) {
  console.error(`\nStructural validation FAILED — ${errors.length} problem(s):\n`);
  console.error(formatErrors(errors));
  console.error('\nFix the keys named above. No legal research is implied by this check.\n');
  process.exit(1);
}

console.log(`Structural validation passed — ${stateCount} state(s) well-formed.`);
console.log('Note: this checks structure only, never whether the law is right.');

// Statute-pass footer. The verification workflow ends here: after reading a
// state's official text, fill each source's url + retrievedOn, re-run this
// check, and commit. Show every state with verification activity — including a
// draft state that has one branch verified (partial) — so the URL step does not
// get forgotten and partial reads stay visible.
const touched = Object.values(fallbackRules).filter((s) => s.sources.some((src) => src.url || src.retrievedOn));
if (touched.length > 0) {
  console.log('');
  console.log('States with verified sources — statute-link status (linked / read / total):');
  for (const s of touched) {
    const linked = s.sources.filter((src) => src.url).length;
    const read = s.sources.filter((src) => src.retrievedOn).length;
    const tag = s.verificationStatus === 'draft' ? 'draft, partial' : s.verificationStatus;
    console.log(`  ${s.code} (${tag}): ${linked} linked / ${read} read / ${s.sources.length} total`);
  }
}
console.log('');
console.log('Statute-pass reminder: when you verify a state against its official text,');
console.log('give the CLI the URLs you read + the date, so each source gets a url +');
console.log('retrievedOn — then re-run this check and commit. A url may only sit on a');
console.log('non-draft state and must carry a retrievedOn; the validator enforces both');
console.log('and never fills a url for you (a link nobody read is a false verification).');
