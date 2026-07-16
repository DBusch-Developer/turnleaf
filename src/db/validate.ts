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
// check, and commit. Show which human-verified states still have unlinked
// sources so the URL step does not get forgotten.
const verified = Object.values(fallbackRules).filter((s) => s.verificationStatus !== 'draft');
if (verified.length > 0) {
  console.log('');
  console.log('Human-verified states — statute-link status:');
  for (const s of verified) {
    const linked = s.sources.filter((src) => src.url).length;
    const flag = linked === 0 ? '  ← no links yet' : linked < s.sources.length ? '' : '  ✓';
    console.log(`  ${s.code} (${s.verificationStatus}): ${linked}/${s.sources.length} sources linked to official text${flag}`);
  }
}
console.log('');
console.log('Statute-pass reminder: when you verify a state against its official text,');
console.log('give the CLI the URLs you read + the date, so each source gets a url +');
console.log('retrievedOn — then re-run this check and commit. A url may only sit on a');
console.log('non-draft state and must carry a retrievedOn; the validator enforces both');
console.log('and never fills a url for you (a link nobody read is a false verification).');
