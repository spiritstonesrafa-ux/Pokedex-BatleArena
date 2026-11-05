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
    types: ['flying', 'dark'],
    ability,
    moves: [
      { id: 444, name: 'stone-edge', type: 'rock', power: 100, accuracy: 80, priority: 0, damageClass: 'physical', pp: 5, maxPp: 5 },
      { id: 408, name: 'power-gem', type: 'rock', power: 80, accuracy: 100, priority: 0, damageClass: 'special', pp: 20, maxPp: 20 },
      { id: 413, name: 'brave-bird', type: 'flying', power: 120, accuracy: 100, priority: 0, damageClass: 'physical', pp: 15, maxPp: 15 },
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

test('Rocky Payload: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('rocky-payload');
  assert.equal(meta.id, 'rocky-payload');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 9);
  assert.ok(meta.triggers.includes('MODIFY_OFFENSIVE_STAT'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Rocky Payload: boosts Attack by 1.5x for physical Rock move (Stone Edge)', () => {
  const bombirdier = makeMon(962, 'Bombirdier', 'rocky-payload');
  const stoneEdge = bombirdier.moves[0];

  const effAtk = C.getEffectiveStat(bombirdier, 'attack', stoneEdge);
  assert.equal(effAtk, 150);
});

test('Rocky Payload: boosts Special Attack by 1.5x for special Rock move (Power Gem)', () => {
  const bombirdier = makeMon(962, 'Bombirdier', 'rocky-payload');
  const powerGem = bombirdier.moves[1];

  const effSpA = C.getEffectiveStat(bombirdier, 'specialAttack', powerGem);
  assert.equal(effSpA, 150);
});

test('Rocky Payload: does NOT boost stats for non-Rock moves (Brave Bird, Tackle)', () => {
  const bombirdier = makeMon(962, 'Bombirdier', 'rocky-payload');
  const braveBird = bombirdier.moves[2];
  const tackle = bombirdier.moves[3];

  assert.equal(C.getEffectiveStat(bombirdier, 'attack', braveBird), 100);
  assert.equal(C.getEffectiveStat(bombirdier, 'attack', tackle), 100);
});

test('Rocky Payload: does NOT boost defensive stats even during Rock moves', () => {
  const bombirdier = makeMon(962, 'Bombirdier', 'rocky-payload');
  const stoneEdge = bombirdier.moves[0];

  assert.equal(C.getEffectiveStat(bombirdier, 'defense', stoneEdge), 100);
  assert.equal(C.getEffectiveStat(bombirdier, 'specialDefense', stoneEdge), 100);
  assert.equal(C.getEffectiveStat(bombirdier, 'speed', stoneEdge), 100);
});

test('Rocky Payload: stacks with stat stages (+1 stage = 1.5 * 1.5 = 2.25x)', () => {
  const bombirdier = makeMon(962, 'Bombirdier', 'rocky-payload', {
    statStages: { attack: 1, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }
  });
  const stoneEdge = bombirdier.moves[0];

  const effAtk = C.getEffectiveStat(bombirdier, 'attack', stoneEdge);
  assert.equal(effAtk, 225);
});

test('Rocky Payload: Neutralizing Gas suppresses Rocky Payload', () => {
  const bombirdier = makeMon(962, 'Bombirdier', 'rocky-payload');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { maxHp: 100, currentHp: 100 });
  const s = E.createTeamBattle(makeTeam(bombirdier), makeTeam(weezing));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 444, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const activeMon = r.state.player.team[0];
  const effAtk = C.getEffectiveStat(activeMon, 'attack', activeMon.moves[0]);
  assert.equal(effAtk, 100);
});

test('Rocky Payload: preview calculation matches engine without state mutation', () => {
  const bombirdier = makeMon(962, 'Bombirdier', 'rocky-payload');
  const stoneEdge = bombirdier.moves[0];

  const effAtk = C.getEffectiveStat(bombirdier, 'attack', stoneEdge);
  assert.equal(effAtk, 150);
  assert.equal(bombirdier.attack, 100);
});
