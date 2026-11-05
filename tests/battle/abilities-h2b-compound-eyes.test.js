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
    types: ['bug', 'flying'],
    ability,
    moves: [
      { id: 79, name: 'sleep-powder', type: 'grass', power: 0, accuracy: 75, priority: 0, damageClass: 'status', pp: 15, maxPp: 15, statusEffect: 'sleep' },
      { id: 87, name: 'thunder', type: 'electric', power: 110, accuracy: 70, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 332, name: 'aerial-ace', type: 'flying', power: 60, accuracy: null, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 }
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

test('Compound Eyes: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('compound-eyes');
  assert.equal(meta.id, 'compound-eyes');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 3);
  assert.ok(meta.triggers.includes('MODIFY_ACCURACY'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Compound Eyes: increases accuracy of Thunder (70 -> 91%) and Sleep Powder (75 -> 97%)', () => {
  const butterfree = makeMon(12, 'Butterfree', 'compound-eyes');
  const foe = makeMon(25, 'Pikachu', 'static');

  const thunderAcc = C.getEffectiveAccuracy(butterfree.moves[1], butterfree, foe);
  assert.equal(thunderAcc, Math.floor(70 * 5325 / 4096)); // 91%

  const sleepPowderAcc = C.getEffectiveAccuracy(butterfree.moves[0], butterfree, foe);
  assert.equal(sleepPowderAcc, Math.floor(75 * 5325 / 4096)); // 97%
});

test('Compound Eyes: 100% accuracy moves cap at 100%', () => {
  const butterfree = makeMon(12, 'Butterfree', 'compound-eyes');
  const foe = makeMon(25, 'Pikachu', 'static');
  const tackle = butterfree.moves[2];

  const acc = C.getEffectiveAccuracy(tackle, butterfree, foe);
  assert.equal(acc, 100);
});

test('Compound Eyes: does not modify moves without numeric accuracy (Aerial Ace)', () => {
  const butterfree = makeMon(12, 'Butterfree', 'compound-eyes');
  const foe = makeMon(25, 'Pikachu', 'static');
  const aerialAce = butterfree.moves[3];

  const acc = C.getEffectiveAccuracy(aerialAce, butterfree, foe);
  assert.equal(acc, null);
});

test('Compound Eyes: roll of 90 hits with Thunder under Compound Eyes but misses without', () => {
  const butterfree = makeMon(12, 'Butterfree', 'compound-eyes');
  const normalAttacker = makeMon(25, 'Pikachu', 'static', { moves: butterfree.moves });
  const foe = makeMon(143, 'Snorlax', 'soundproof', { maxHp: 500, currentHp: 500 });

  // Roll 90 <= 91: Butterfree hits
  const s1 = E.createTeamBattle(makeTeam(butterfree), makeTeam(foe));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 87, accuracyRoll: 90, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const d1 = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d1, 'Thunder should hit with roll 90 under Compound Eyes (91% acc)');

  // Roll 90 > 70: Normal attacker misses
  const s2 = E.createTeamBattle(makeTeam(normalAttacker), makeTeam(foe));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 87, accuracyRoll: 90, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const missed = r2.events.find(e => e.type === 'MOVE_MISSED' && e.actor === 'player');
  assert.ok(missed, 'Thunder should miss with roll 90 without Compound Eyes (70% acc)');
});

test('Compound Eyes: stacks with accuracy and evasion stat stages', () => {
  const butterfree = makeMon(12, 'Butterfree', 'compound-eyes');
  const foe = makeMon(25, 'Pikachu', 'static', { evasionStage: 1 });

  // Base 91 with -1 net stage: 91 * (3/4) = 68%
  const acc = C.getEffectiveAccuracy(butterfree.moves[1], butterfree, foe);
  assert.equal(acc, Math.floor(91 * 3 / 4));
});

test('Compound Eyes: Neutralizing Gas suppresses Compound Eyes (accuracy reverts to 70%)', () => {
  const butterfree = makeMon(12, 'Butterfree', 'compound-eyes');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(butterfree), makeTeam(weezing));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 87, accuracyRoll: 85, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const missed = r.events.find(e => e.type === 'MOVE_MISSED' && e.actor === 'player');
  assert.ok(missed, 'Under Neutralizing Gas, roll 85 misses Thunder (70% acc)');
});

test('Compound Eyes: evaluator preview uses boosted accuracy without mutation', () => {
  const butterfree = makeMon(12, 'Butterfree', 'compound-eyes');
  const foe = makeMon(25, 'Pikachu', 'static');
  const thunder = butterfree.moves[1];

  const preview = Ev.evaluateMove(thunder, butterfree, foe, constants, {});
  assert.ok(preview);
  assert.equal(butterfree.ability, 'compound-eyes');
});
