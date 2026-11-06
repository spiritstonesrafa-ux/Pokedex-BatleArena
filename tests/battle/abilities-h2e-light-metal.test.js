const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P5 = require('../../assets/js/battle/p5-mechanics');

test('Light Metal: registry metadata conforms to Gen IX SV', () => {
  const ab = Reg.getAbility('light-metal');
  assert.ok(ab);
  assert.equal(ab.id, 'light-metal');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.equal(ab.breakable, true);
  assert.ok(ab.triggers.includes('ON_MODIFY_WEIGHT'));
});

test('Light Metal: halves effective weight in getEffectiveWeightKg', () => {
  const scizor = { id: 212, weightKg: 118, ability: 'light-metal' };
  const effWeight = C.getEffectiveWeightKg(scizor);
  assert.equal(effWeight, 59);
});

test('Light Metal: halves effective weight in P5.weight calculation', () => {
  const metagross = { id: 376, weightKg: 550, ability: 'light-metal' };
  const effWeight = P5.weight(metagross);
  assert.equal(effWeight, 275);
});

test('Light Metal: respects minimum weight clamp of 0.1 kg', () => {
  // 0.1 kg halved is 0.05 kg, but Gen IX floors minimum weight at 0.1 kg
  const featherMon = { id: 92, weightKg: 0.1, ability: 'light-metal' };
  const effWeightC = C.getEffectiveWeightKg(featherMon);
  assert.equal(effWeightC, 0.1);

  const effWeightP5 = P5.weight(featherMon);
  assert.equal(effWeightP5, 0.1);
});

test('Light Metal: decreases damage received from Low Kick (move 67)', () => {
  const normalMon = { id: 304, weightKg: 60 }; // 60 kg -> 80 BP
  const lightMon = { id: 304, weightKg: 60, ability: 'light-metal' }; // 30 kg -> 60 BP

  const bpNormal = P5.power({ id: 67 }, {}, normalMon);
  assert.equal(bpNormal, 80);

  const bpLight = P5.power({ id: 67 }, {}, lightMon);
  assert.equal(bpLight, 60);
});

test('Light Metal: decreases damage received from Grass Knot (move 447)', () => {
  const normalMon = { id: 304, weightKg: 60 }; // 60 kg -> 80 BP
  const lightMon = { id: 304, weightKg: 60, ability: 'light-metal' }; // 30 kg -> 60 BP

  const bpNormal = P5.power({ id: 447 }, {}, normalMon);
  assert.equal(bpNormal, 80);

  const bpLight = P5.power({ id: 447 }, {}, lightMon);
  assert.equal(bpLight, 60);
});

test('Light Metal: Mold Breaker attacker bypasses Light Metal on defender', () => {
  const attackerMold = { ability: 'mold-breaker' };
  const defenderLight = { id: 304, weightKg: 60, ability: 'light-metal' };

  // Against Mold Breaker, defender weight is evaluated as unhalved 60 kg -> 80 BP
  const bp = P5.power({ id: 67 }, attackerMold, defenderLight);
  assert.equal(bp, 80);
});

test('Light Metal: suppressed under Neutralizing Gas reverts to base weight', () => {
  const defenderSuppressed = { id: 304, weightKg: 60, ability: 'light-metal', neutralizingGasSuppressed: true };

  const bp = P5.power({ id: 67 }, {}, defenderSuppressed);
  assert.equal(bp, 80);

  const effWeight = C.getEffectiveWeightKg(defenderSuppressed);
  assert.equal(effWeight, 60);
});

