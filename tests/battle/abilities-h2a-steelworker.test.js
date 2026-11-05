const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const P8 = require('../../assets/js/battle/p8-special');

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
    types: ['ghost', 'grass'],
    ability,
    moves: [
      { id: 442, name: 'iron-head', type: 'steel', power: 80, accuracy: 100, priority: 0, damageClass: 'physical', pp: 15, maxPp: 15 },
      { id: 430, name: 'flash-cannon', type: 'steel', power: 80, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 },
      { id: 247, name: 'shadow-ball', type: 'ghost', power: 80, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 }
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

test('Steelworker: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('steelworker');
  assert.equal(meta.id, 'steelworker');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 7);
  assert.ok(meta.triggers.includes('MODIFY_OFFENSIVE_STAT'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Steelworker: boosts Attack by 1.5x for physical Steel move (Iron Head)', () => {
  const dhelmise = makeMon(781, 'Dhelmise', 'steelworker');
  const ironHead = dhelmise.moves[0];

  const effAtk = C.getEffectiveStat(dhelmise, 'attack', ironHead);
  assert.equal(effAtk, 150);
});

test('Steelworker: boosts Special Attack by 1.5x for special Steel move (Flash Cannon)', () => {
  const dhelmise = makeMon(781, 'Dhelmise', 'steelworker');
  const flashCannon = dhelmise.moves[1];

  const effSpA = C.getEffectiveStat(dhelmise, 'specialAttack', flashCannon);
  assert.equal(effSpA, 150);
});

test('Steelworker: does NOT boost stats for non-Steel moves (Shadow Ball, Tackle)', () => {
  const dhelmise = makeMon(781, 'Dhelmise', 'steelworker');
  const shadowBall = dhelmise.moves[2];
  const tackle = dhelmise.moves[3];

  assert.equal(C.getEffectiveStat(dhelmise, 'attack', tackle), 100);
  assert.equal(C.getEffectiveStat(dhelmise, 'specialAttack', shadowBall), 100);
});

test('Steelworker: does NOT boost defensive stats even during Steel moves', () => {
  const dhelmise = makeMon(781, 'Dhelmise', 'steelworker');
  const ironHead = dhelmise.moves[0];

  assert.equal(C.getEffectiveStat(dhelmise, 'defense', ironHead), 100);
  assert.equal(C.getEffectiveStat(dhelmise, 'specialDefense', ironHead), 100);
  assert.equal(C.getEffectiveStat(dhelmise, 'speed', ironHead), 100);
});

test('Steelworker: stacks with stat stages (+1 stage = 1.5 * 1.5 = 2.25x)', () => {
  const dhelmise = makeMon(781, 'Dhelmise', 'steelworker', {
    statStages: { attack: 1, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }
  });
  const ironHead = dhelmise.moves[0];

  const effAtk = C.getEffectiveStat(dhelmise, 'attack', ironHead);
  // Base 100 at +1 is 150, multiplied by Steelworker (1.5) = 225
  assert.equal(effAtk, 225);
});

test('Steelworker: Neutralizing Gas suppresses Steelworker', () => {
  const dhelmise = makeMon(781, 'Dhelmise', 'steelworker');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { maxHp: 100, currentHp: 100 });
  const s = E.createTeamBattle(makeTeam(dhelmise), makeTeam(weezing));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 442, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const activeMon = r.state.player.team[0];
  const effAtk = C.getEffectiveStat(activeMon, 'attack', activeMon.moves[0]);
  assert.equal(effAtk, 100);
});

test('Steelworker: preview calculation matches engine without state mutation', () => {
  const dhelmise = makeMon(781, 'Dhelmise', 'steelworker');
  const ironHead = dhelmise.moves[0];

  const effAtk = C.getEffectiveStat(dhelmise, 'attack', ironHead);
  assert.equal(effAtk, 150);
  assert.equal(dhelmise.attack, 100);
});