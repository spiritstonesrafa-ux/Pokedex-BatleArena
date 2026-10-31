/* Verify P4 closure without silently promoting mechanics belonging to other phases. */
const assert = require('node:assert/strict');
const C = require('../assets/js/battle/battle-constants.js');
const effects = require('../assets/js/battle/p4-secondary-catalog.js');
const moves = Object.values(C.KNOWN_CATALOG_MOVES);
for (const move of moves) {
  const capability = C.getMoveCapability(move);
  assert.ok(!capability.knownPending.some(reason => /PHASE_P4/.test(reason)), `Unresolved P4 rule: ${move.name}`);
}
for (const id of [161,156,214,173,138,281,252,92,109,352,58,503,499,914]) {
  assert.equal(C.getMoveCapability(id).supportLevel, 'FULL', `Pilot ${id}`);
}
const summary = {
  knownMoves: moves.length,
  expandedSecondaryDefinitions: Object.keys(effects.effects).length,
  full: moves.filter(move => C.getMoveCapability(move).supportLevel === 'FULL').length,
  partialWithExplicitDependencies: moves.filter(move => C.getMoveCapability(move).supportLevel === 'PARTIAL').length,
  unresolvedP4: 0
};
console.log(JSON.stringify(summary, null, 2));
