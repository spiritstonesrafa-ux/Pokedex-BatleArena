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
  const attack = extra.attack ?? 140;
  const defense = extra.defense ?? 100;
  const specialAttack = extra.specialAttack ?? 112;
  const specialDefense = extra.specialDefense ?? 100;
  const speed = extra.speed ?? 110;
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
    types: ['rock', 'flying'],
    ability,
    moves: [
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 247, name: 'shadow-ball', type: 'ghost', power: 80, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 }
    ],
    ...extra
  };
}

function makeTeam(lead, m2 = null, m3 = null) {
  return [
    lead,
    m2 || makeMon(901, 'ReserveA', 'soundproof'),
    m3 || makeMon(902, 'ReserveB', 'soundproof')
  ];
}

test('Defeatist: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('defeatist');
  assert.ok(ab);
  assert.equal(ab.id, 'defeatist');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_MODIFY_ATK'));
  assert.ok(ab.triggers.includes('ON_MODIFY_SPA'));
});

test('Defeatist: halves effective Attack stat when HP is exactly 50% max HP', () => {
  const archeops = makeMon(567, 'Archeops', 'defeatist', { maxHp: 200, currentHp: 100, attack: 140 });
  const effAtk = constants.getEffectiveStat(archeops, 'attack');
  assert.equal(effAtk, 70); // 140 * 0.5
});

test('Defeatist: halves effective Attack stat when HP is below 50% max HP', () => {
  const archeops = makeMon(567, 'Archeops', 'defeatist', { maxHp: 200, currentHp: 50, attack: 140 });
  const effAtk = constants.getEffectiveStat(archeops, 'attack');
  assert.equal(effAtk, 70);
});

test('Defeatist: halves effective Special Attack stat when HP <= 50% max HP', () => {
  const archeops = makeMon(567, 'Archeops', 'defeatist', { maxHp: 200, currentHp: 100, specialAttack: 112 });
  const effSpA = constants.getEffectiveStat(archeops, 'specialAttack');
  assert.equal(effSpA, 56); // 112 * 0.5
});

test('Defeatist: does NOT halve stats when HP is strictly above 50% max HP (e.g. 101/200)', () => {
  const archeops = makeMon(567, 'Archeops', 'defeatist', { maxHp: 200, currentHp: 101, attack: 140, specialAttack: 112 });
  assert.equal(constants.getEffectiveStat(archeops, 'attack'), 140);
  assert.equal(constants.getEffectiveStat(archeops, 'specialAttack'), 112);
});

test('Defeatist: odd max HP handles exact 50% threshold canonically (199 maxHp)', () => {
  // 199 / 2 = 99.5
  // 99 <= 99.5 -> Defeatist active
  const lowArcheops = makeMon(567, 'Archeops', 'defeatist', { maxHp: 199, currentHp: 99, attack: 140 });
  assert.equal(constants.getEffectiveStat(lowArcheops, 'attack'), 70);

  // 100 > 99.5 -> Defeatist inactive
  const healthyArcheops = makeMon(567, 'Archeops', 'defeatist', { maxHp: 199, currentHp: 100, attack: 140 });
  assert.equal(constants.getEffectiveStat(healthyArcheops, 'attack'), 140);
});

test('Defeatist: does NOT reduce Defense, Special Defense or Speed at low HP', () => {
  const archeops = makeMon(567, 'Archeops', 'defeatist', { maxHp: 200, currentHp: 40, defense: 90, specialDefense: 85, speed: 110 });
  assert.equal(constants.getEffectiveStat(archeops, 'defense'), 90);
  assert.equal(constants.getEffectiveStat(archeops, 'specialDefense'), 85);
  assert.equal(constants.getEffectiveStat(archeops, 'speed'), 110);
});

test('Defeatist: Neutralizing Gas suppresses Defeatist, restoring full Attack even at low HP', () => {
  const archeops = makeMon(567, 'Archeops', 'defeatist', { maxHp: 200, currentHp: 50, attack: 140 });
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');

  const s = E.createTeamBattle(makeTeam(archeops), makeTeam(weezing));
  P7.sync(s);

  const effAtk = constants.getEffectiveStat(s.player.team[0], 'attack');
  assert.equal(effAtk, 140);
});

test('Defeatist: Battle Evaluator evaluates lower expected damage when HP <= 50%', () => {
  const lowHpArcheops = makeMon(567, 'Archeops', 'defeatist', { maxHp: 200, currentHp: 80, attack: 140 });
  const fullHpArcheops = makeMon(567, 'Archeops', 'defeatist', { maxHp: 200, currentHp: 200, attack: 140 });
  const target = makeMon(100, 'Voltorb', 'soundproof', { defense: 100 });
  const move = lowHpArcheops.moves[0];

  const evalLow = Ev.evaluateMove(lowHpArcheops, target, move, { constants });
  const evalFull = Ev.evaluateMove(fullHpArcheops, target, move, { constants });

  assert.ok(evalLow.expectedDamage < evalFull.expectedDamage * 0.6);
});
