import { fallbackRules } from '../data/fallbackRules';
import { intakeMaps } from '../data/intakeMaps';
import { isAsked } from '../data/rulesEngine';

for (const [code, config] of Object.entries(fallbackRules)) {
  const asked = Object.values(config.rules.nodes).filter(isAsked).length;
  const map = intakeMaps[code];
  const mapped = map ? new Set([
    ...Object.keys(map.derived),
    ...(map.stateFields ?? []).flatMap(sf => sf.fills),
  ]).size : 0;
  const tail = Math.max(0, asked - mapped);
  const badge = map ? '' : '  (no map — today\'s flow)';
  console.log(`${code}: ${asked} asked · ${mapped} prefilled · ~${tail} tail${badge}`);
}
