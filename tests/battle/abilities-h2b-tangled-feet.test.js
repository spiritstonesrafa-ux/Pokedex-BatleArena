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
    types: ['normal', 'flying'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 332, name: 'aerial-ace', type: 'flying', power: 60, accuracy: null, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 89, name: 'earthquake', type: 'ground', power: 100, accuracy: 100, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 }
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

test('Tangled Feet: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('tangled-feet');
  assert.equal(meta.id, 'tangled-feet');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 4);
  assert.ok(meta.triggers.includes('MODIFY_ACCURACY'));
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

test('Tangled Feet: halves accuracy of incoming attacks while confused (100% -> 50%)', () => {
  const pidgeot = makeMon(18, 'Pidgeot', 'tangled-feet', { confusionTurns: 2, maxHp: 300, currentHp: 300 });
  const attacker = makeMon(25, 'Pikachu', 'static');
  const tackle = attacker.moves[0];

  const effAcc = C.getEffectiveAccuracy(tackle, attacker, pidgeot);
  assert.equal(effAcc, 50); // 100 * 0.5 = 50%
});

test('Tangled Feet: does NOT reduce accuracy when bearer is NOT confused', () => {
  const pidgeot = makeMon(18, 'Pidgeot', 'tangled-feet', { confusionTurns: 0, maxHp: 300, currentHp: 300 });
  const attacker = makeMon(25, 'Pikachu', 'static');
  const tackle = attacker.moves[0];

  const effAcc = C.getEffectiveAccuracy(tackle, attacker, pidgeot);
  assert.equal(effAcc, 100);
});

test('Tangled Feet: does NOT modify moves without numeric accuracy (Aerial Ace)', () => {
  const pidgeot = makeMon(18, 'Pidgeot', 'tangled-feet', { confusionTurns: 3, maxHp: 300, currentHp: 300 });
  const attacker = makeMon(25, 'Pikachu', 'static');
  const aerialAce = pidgeot.moves[2];

  const effAcc = C.getEffectiveAccuracy(aerialAce, attacker, pidgeot);
  assert.equal(effAcc, null);
});

test('Tangled Feet: roll of 60 misses Tackle (50% acc) while confused in battle engine', () => {
  const pidgeot = makeMon(18, 'Pidgeot', 'tangled-feet', { confusionTurns: 2, maxHp: 300, currentHp: 300, speed: 50 });
  const attacker = makeMon(25, 'Pikachu', 'static', { speed: 150 });
  const s = E.createTeamBattle(makeTeam(attacker), makeTeam(pidgeot));
  s.enemy.team[0].confusionTurns = 2;

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 60, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, confusionSelfHitRoll: 100 }
  });

  const missed = r.events.find(e => e.type === 'MOVE_MISSED' && e.actor === 'player');
  assert.ok(missed, 'Tackle should miss with roll 60 against confused Tangled Feet (50% acc)');
});

test('Tangled Feet: No Guard attacker ignores Tangled Feet accuracy reduction', () => {
  const pidgeot = makeMon(18, 'Pidgeot', 'tangled-feet', { confusionTurns: 2, maxHp: 300, currentHp: 300 });
  const machamp = makeMon(68, 'Machamp', 'no-guard');
  const tackle = machamp.moves[2];

  const effAcc = C.getEffectiveAccuracy(tackle, machamp, pidgeot);
  assert.equal(effAcc, null); // No Guard always hits
});

test('Tangled Feet: Mold Breaker attacker ignores Tangled Feet', () => {
  const pidgeot = makeMon(18, 'Pidgeot', 'tangled-feet', { confusionTurns: 2, maxHp: 300, currentHp: 300, speed: 50 });
  const haxorus = makeMon(612, 'Haxorus', 'mold-breaker', { speed: 150 });
  const s = E.createTeamBattle(makeTeam(haxorus), makeTeam(pidgeot));
  s.enemy.team[0].confusionTurns = 2;

  // With Mold Breaker, Tangled Feet is ignored so Tackle has 100% accuracy; roll 60 hits!
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 60, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, confusionSelfHitRoll: 100 }
  });

  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d, 'Mold Breaker should hit confused Tangled Feet with roll 60');
});

test('Tangled Feet: Neutralizing Gas suppresses Tangled Feet while confused', () => {
  const pidgeot = makeMon(18, 'Pidgeot', 'tangled-feet', { confusionTurns: 2, maxHp: 300, currentHp: 300, speed: 50 });
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { maxHp: 300, currentHp: 300, speed: 150 });
  const s = E.createTeamBattle(makeTeam(weezing), makeTeam(pidgeot));
  s.enemy.team[0].confusionTurns = 2;

  // Under Gas, Tackle has normal 100% accuracy; roll 60 hits!
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 60, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, confusionSelfHitRoll: 100 }
  });

  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d, 'Under Neutralizing Gas, Tackle should hit confused Tangled Feet with roll 60');
});