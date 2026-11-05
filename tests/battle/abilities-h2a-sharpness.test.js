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
    types: ['psychic', 'fighting'],
    ability,
    moves: [
      { id: 427, name: 'psycho-cut', type: 'psychic', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 403, name: 'air-slash', type: 'flying', power: 75, accuracy: 95, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
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

test('Sharpness: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('sharpness');
  assert.equal(meta.id, 'sharpness');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 9);
  assert.ok(meta.triggers.includes('MODIFY_POWER'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Sharpness: boosts physical slicing move (Psycho Cut 70) by 1.5x (105)', () => {
  const gallade = makeMon(475, 'Gallade', 'sharpness');
  const foe = makeMon(100, 'Voltorb', 'soundproof');
  const psychoCut = gallade.moves[0];

  const basePower = P7.power(null, gallade, foe, psychoCut, 70);
  assert.equal(basePower, 105);
});

test('Sharpness: boosts special slicing move (Air Slash 75) by 1.5x (112.5)', () => {
  const gallade = makeMon(475, 'Gallade', 'sharpness');
  const foe = makeMon(100, 'Voltorb', 'soundproof');
  const airSlash = gallade.moves[1];

  const basePower = P7.power(null, gallade, foe, airSlash, 75);
  assert.equal(basePower, 75 * 1.5);
});

test('Sharpness: does NOT boost non-slicing moves (Tackle 40, Earthquake 100)', () => {
  const gallade = makeMon(475, 'Gallade', 'sharpness');
  const foe = makeMon(100, 'Voltorb', 'soundproof');

  assert.equal(P7.power(null, gallade, foe, gallade.moves[2], 40), 40);
  assert.equal(P7.power(null, gallade, foe, gallade.moves[3], 100), 100);
});

test('Sharpness: works with flags.slicing even if move is custom', () => {
  const gallade = makeMon(475, 'Gallade', 'sharpness');
  const foe = makeMon(100, 'Voltorb', 'soundproof');
  const customBlade = { id: 9999, name: 'custom-blade', power: 80, flags: { slicing: true } };

  assert.equal(P7.power(null, gallade, foe, customBlade, 80), 120);
});

test('Sharpness: Mold Breaker opponent does not negate attacker Sharpness', () => {
  const gallade = makeMon(475, 'Gallade', 'sharpness');
  const haxorus = makeMon(612, 'Haxorus', 'mold-breaker');
  const psychoCut = gallade.moves[0];

  const basePower = P7.power(null, gallade, haxorus, psychoCut, 70);
  assert.equal(basePower, 105);
});

test('Sharpness: Neutralizing Gas suppresses Sharpness', () => {
  const gallade = makeMon(475, 'Gallade', 'sharpness');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { maxHp: 100, currentHp: 100 });
  const s = E.createTeamBattle(makeTeam(gallade), makeTeam(weezing));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 427, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const activeMon = r.state.player.team[0];
  const power = P7.power(r.state, activeMon, weezing, activeMon.moves[0], 70);
  assert.equal(power, 70);
});

test('Sharpness: damage preview matches engine calculation without mutation', () => {
  const gallade = makeMon(475, 'Gallade', 'sharpness');
  const foe = makeMon(100, 'Voltorb', 'soundproof');
  const evalMove = { id: 427, name: 'psycho-cut', type: 'psychic', power: 70, damageClass: 'physical' };

  const powerPreview = P7.power(null, gallade, foe, evalMove, 70);
  assert.equal(powerPreview, 105);
  assert.equal(evalMove.power, 70);
});