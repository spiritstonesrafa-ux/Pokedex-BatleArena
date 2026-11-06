const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P5 = require('../../assets/js/battle/p5-mechanics');

test('Heavy Metal: registry metadata conforms to Gen IX SV', () => {
  const ab = Reg.getAbility('heavy-metal');
  assert.ok(ab);
  assert.equal(ab.id, 'heavy-metal');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.equal(ab.breakable, true);
  assert.ok(ab.triggers.includes('ON_MODIFY_WEIGHT'));
});

test('Heavy Metal: doubles effective weight in getEffectiveWeightKg', () => {
  const cufant = { id: 878, weightKg: 100, ability: 'heavy-metal' };
  const effWeight = C.getEffectiveWeightKg(cufant);
  assert.equal(effWeight, 200);
});

test('Heavy Metal: doubles effective weight in P5.weight calculation', () => {
  const aggron = { id: 306, weightKg: 360, ability: 'heavy-metal' };
  const effWeight = P5.weight(aggron);
  assert.equal(effWeight, 720);
});

test('Heavy Metal: increases damage received from Low Kick (move 67)', () => {
  const normalMon = { id: 304, weightKg: 60 }; // 60 kg -> 80 BP
  const heavyMon = { id: 304, weightKg: 60, ability: 'heavy-metal' }; // 120 kg -> 100 BP

  const bpNormal = P5.power({ id: 67 }, {}, normalMon);
  assert.equal(bpNormal, 80);

  const bpHeavy = P5.power({ id: 67 }, {}, heavyMon);
  assert.equal(bpHeavy, 100);
});

test('Heavy Metal: increases damage received from Grass Knot (move 447)', () => {
  const normalMon = { id: 304, weightKg: 60 }; // 60 kg -> 80 BP
  const heavyMon = { id: 304, weightKg: 60, ability: 'heavy-metal' }; // 120 kg -> 100 BP

  const bpNormal = P5.power({ id: 447 }, {}, normalMon);
  assert.equal(bpNormal, 80);

  const bpHeavy = P5.power({ id: 447 }, {}, heavyMon);
  assert.equal(bpHeavy, 100);
});

test('Heavy Metal: increases damage dealt by Heavy Slam (move 484)', () => {
  // Attacker 60 kg vs defender 30 kg: ratio 2x -> 60 BP
  // Attacker 120 kg (Heavy Metal) vs defender 30 kg: ratio 4x -> 100 BP
  const attackerNormal = { id: 304, weightKg: 60 };
  const attackerHeavy = { id: 304, weightKg: 60, ability: 'heavy-metal' };
  const defender = { id: 25, weightKg: 30 };

  const bpNormal = P5.power({ id: 484 }, attackerNormal, defender);
  assert.equal(bpNormal, 60);

  const bpHeavy = P5.power({ id: 484 }, attackerHeavy, defender);
  assert.equal(bpHeavy, 100);
});

test('Heavy Metal: Mold Breaker attacker bypasses Heavy Metal on defender', () => {
  const attackerMold = { ability: 'mold-breaker' };
  const defenderHeavy = { id: 304, weightKg: 60, ability: 'heavy-metal' };

  // Against Mold Breaker, defender weight is evaluated as unboosted 60 kg -> 80 BP
  const bp = P5.power({ id: 67 }, attackerMold, defenderHeavy);
  assert.equal(bp, 80);
});

test('Heavy Metal: suppressed under Neutralizing Gas reverts to base weight', () => {
  const defenderSuppressed = { id: 304, weightKg: 60, ability: 'heavy-metal', neutralizingGasSuppressed: true };

  const bp = P5.power({ id: 67 }, {}, defenderSuppressed);
  assert.equal(bp, 80);

  const effWeight = C.getEffectiveWeightKg(defenderSuppressed);
  assert.equal(effWeight, 60);
});
