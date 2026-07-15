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
