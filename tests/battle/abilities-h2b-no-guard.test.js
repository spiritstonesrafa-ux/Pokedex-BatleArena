const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const P8 = require('../../assets/js/battle/p8-special');
const Ev = require('../../assets/js/battle/battle-evaluator');

const constants = { ...C, P7, P8 };

function makeMon(id, name, ability, extra = {}) {
  const hp = extra.maxHp || extra.hp || extra.currentHp || 200;
  const attack = extra.attack ?? 100;
  const defense = extra.defense ?? 100;
  const specialAttack = extra.specialAttack ?? 100;
  const specialDefense = extra.specialDefense ?? 100;
  const speed = extra.speed ?? 100;
  return {
    id,
    name,
    level: 50,
    maxHp: hp,
    currentHp: extra.currentHp ?? hp,
    attack,
    defense,
    specialAttack,
    specialDefense,
    speed,
    stats: { hp, attack, defense, specialAttack, specialDefense, speed, ...(extra.stats || {}) },
    statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    types: ['fighting'],
    ability,
    moves: [
      { id: 223, name: 'dynamic-punch', type: 'fighting', power: 100, accuracy: 50, priority: 0, damageClass: 'physical', pp: 5, maxPp: 5 },
      { id: 192, name: 'zap-cannon', type: 'electric', power: 120, accuracy: 50, priority: 0, damageClass: 'special', pp: 5, maxPp: 5 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 182, name: 'protect', type: 'normal', power: null, accuracy: null, priority: 4, damageClass: 'status', pp: 10, maxPp: 10 }
    ],
    ...extra
  };
}

function makeTeam(lead, m2 = null, m3 = null) {
  return [
    lead,
    m2 || makeMon(100, 'Voltorb', 'soundproof'),
    m3 || makeMon(101, 'Electrode', 'soundproof')
  ];
}

test('No Guard: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('no-guard');
  assert.equal(meta.id, 'no-guard');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 4);
  assert.ok(meta.triggers.includes('BYPASS_ACCURACY'));
  assert.ok(meta.triggers.includes('BYPASS_SEMI_INVULNERABILITY'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('No Guard: moves used by No Guard bearer cannot miss (even with accuracyRoll = 100)', () => {
  const machamp = makeMon(68, 'Machamp', 'no-guard');
  const foe = makeMon(25, 'Pikachu', 'static', { evasionStage: 6, maxHp: 300, currentHp: 300 });
  const s = E.createTeamBattle(makeTeam(machamp), makeTeam(foe));

  // Dynamic Punch has 50% accuracy, foe has +6 evasion, roll is 100 (worst roll possible)
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 223, accuracyRoll: 100, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d, 'Dynamic Punch should hit with roll 100 because of No Guard');
});

test('No Guard: moves directed at No Guard bearer cannot miss (even with accuracyRoll = 100)', () => {
  const machamp = makeMon(68, 'Machamp', 'no-guard', { evasionStage: 6, maxHp: 500, currentHp: 500 });
  const attacker = makeMon(25, 'Pikachu', 'static', {
    moves: [{ id: 223, name: 'dynamic-punch', type: 'fighting', power: 100, accuracy: 50, priority: 0, damageClass: 'physical', pp: 5, maxPp: 5 }]
  });
  const s = E.createTeamBattle(makeTeam(attacker), makeTeam(machamp));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 223, accuracyRoll: 100, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d, 'Opponent move should hit No Guard Machamp with roll 100');
});

test('No Guard: can hit semi-invulnerable target during Fly (airborne state)', () => {
  const machamp = makeMon(68, 'Machamp', 'no-guard');
  const pidgeot = makeMon(18, 'Pidgeot', 'keen-eye', {
    maxHp: 300,
    currentHp: 300,
    twoTurnMove: { id: 19, name: 'fly', state: 'airborne' }
  });
  const s = E.createTeamBattle(makeTeam(machamp), makeTeam(pidgeot));

  // No Guard allows hitting the airborne Pidgeot
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 223, accuracyRoll: 100, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d, 'No Guard should hit airborne target');
});

test('No Guard: does NOT bypass Protect (fails with BLOCKED_BY_PROTECT)', () => {
  const machamp = makeMon(68, 'Machamp', 'no-guard');
  const foe = makeMon(25, 'Pikachu', 'static', {
    moves: [{ id: 182, name: 'protect', type: 'normal', power: null, accuracy: null, priority: 4, damageClass: 'status', pp: 10, maxPp: 10 }]
  });
  const s = E.createTeamBattle(makeTeam(machamp), makeTeam(foe));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 223, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 182 }
  });

  const protectBlocked = r.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_PROTECT');
  assert.ok(protectBlocked, 'Protect must block No Guard move');
});

test('No Guard: does NOT bypass elemental type immunity (Normal vs Ghost)', () => {
  const machamp = makeMon(68, 'Machamp', 'no-guard');
  const gengar = makeMon(94, 'Gengar', 'cursed-body', { types: ['ghost', 'poison'], maxHp: 300, currentHp: 300 });
  const s = E.createTeamBattle(makeTeam(machamp), makeTeam(gengar));

  // Tackle is Normal-type: Gengar is immune
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d);
  assert.equal(d.multiplier, 0);
  assert.equal(d.damage, 0);
  assert.equal(gengar.currentHp, 300);
});

test('No Guard: Neutralizing Gas suppresses No Guard (accuracy checks restored)', () => {
  const machamp = makeMon(68, 'Machamp', 'no-guard');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(machamp), makeTeam(weezing));

  // Dynamic Punch has 50% accuracy: roll 75 should miss when No Guard is suppressed
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 223, accuracyRoll: 75, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const missed = r.events.find(e => e.type === 'MOVE_MISSED' && e.actor === 'player');
  assert.ok(missed, 'Under Neutralizing Gas, roll 75 should miss Dynamic Punch (50% acc)');
});

test('No Guard: preview evaluation gives 100% accuracy factor without state mutation', () => {
  const machamp = makeMon(68, 'Machamp', 'no-guard');
  const foe = makeMon(25, 'Pikachu', 'static');
  const dynamicPunch = machamp.moves[0];

  const effAcc = C.getEffectiveAccuracy(dynamicPunch, machamp, foe);
  assert.equal(effAcc, null); // null indicates always-hit in PBA

  const preview = Ev.evaluateMove(dynamicPunch, machamp, foe, constants, {});
  assert.ok(preview);
  assert.equal(preview.accuracy, null); // reflects always-hit effective accuracy
  assert.equal(preview.expectedDamage, preview.damageIfHit); // 100% hit expectation
  assert.equal(dynamicPunch.accuracy, 50); // move catalog accuracy preserved
  assert.equal(machamp.ability, 'no-guard');
});