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
    types: ['grass'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 14, name: 'swords-dance', type: 'normal', power: 0, accuracy: null, priority: 0, damageClass: 'status', pp: 20, maxPp: 20 },
      { id: 331, name: 'bullet-seed', type: 'grass', power: 25, accuracy: 100, priority: 0, damageClass: 'physical', pp: 30, maxPp: 30 },
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

test('Cotton Down: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('cotton-down');
  assert.equal(meta.id, 'cotton-down');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 8);
  assert.ok(meta.triggers.includes('AFTER_DAMAGING_HIT'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Cotton Down: singles user hit by direct attack lowers attacker Speed -1', () => {
  const eldegoss = makeMon(830, 'Eldegoss', 'cotton-down');
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(eldegoss), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(r.state.enemy.team[0].statStages.speed, -1);
  assert.equal(r.state.player.team[0].statStages.speed, 0); // User is excluded
  assert.ok(r.events.some(e => e.label === 'cotton-down'));
});

test('Cotton Down: non-damaging move does not trigger Cotton Down', () => {
  const eldegoss = makeMon(830, 'Eldegoss', 'cotton-down');
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(eldegoss), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 14 } // Swords Dance
  });
  assert.equal(r.state.enemy.team[0].statStages.speed, 0);
  assert.equal(r.events.some(e => e.label === 'cotton-down'), false);
});

test('Cotton Down: doubles user hit lowers Speed for all other active Pokémon (foe 1, foe 2, ally)', () => {
  const eldegoss = makeMon(830, 'Eldegoss', 'cotton-down');
  const ally = makeMon(10, 'Ally', 'soundproof');
  const foe1 = makeMon(143, 'Snorlax', 'thick-fat', { speed: 120 });
  const foe2 = makeMon(144, 'Pikachu', 'static', { speed: 110 });
  const s = E.createDoublesBattle([eldegoss, ally], [foe1, foe2]);
  const r = E.resolveDoublesTurn(s, {
    player: { 0: { type: 'MOVE', moveId: 14 }, 1: { type: 'MOVE', moveId: 14 } },
    enemy: { 0: { type: 'MOVE', moveId: 33, targetRole: 'player', targetSlot: 0 }, 1: { type: 'MOVE', moveId: 14 } }
  });
  assert.equal(r.state.enemy.team[0].statStages.speed, -1);
  assert.equal(r.state.enemy.team[1].statStages.speed, -1);
  assert.equal(r.state.player.team[1].statStages.speed, -1);
  assert.equal(r.state.player.team[0].statStages.speed, 0); // Eldegoss unchanged
});

test('Cotton Down: Contrary inverts Speed drop into a Speed boost', () => {
  const eldegoss = makeMon(830, 'Eldegoss', 'cotton-down');
  const serperior = makeMon(497, 'Serperior', 'contrary', { speed: 130 });
  const s = E.createTeamBattle(makeTeam(eldegoss), makeTeam(serperior), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(r.state.enemy.team[0].statStages.speed, 1);
});

test('Cotton Down: multi-hit move lowers Speed on each damaging hit', () => {
  const eldegoss = makeMon(830, 'Eldegoss', 'cotton-down', { maxHp: 500, currentHp: 500 });
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(eldegoss), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 331, accuracyRoll: 1, hitCountRoll: 50, hitDamageRolls: [90, 90, 90] } // 3 hits
  });
  assert.equal(r.state.enemy.team[0].statStages.speed, -3);
});

test('Cotton Down: Neutralizing Gas suppresses Cotton Down activation', () => {
  const eldegoss = makeMon(830, 'Eldegoss', 'cotton-down');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(eldegoss), makeTeam(weezing), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(r.state.enemy.team[0].statStages.speed, 0);
  assert.equal(r.events.some(e => e.label === 'cotton-down'), false);
});

test('Cotton Down: Speed stage does not overflow beyond -6 floor', () => {
  const eldegoss = makeMon(830, 'Eldegoss', 'cotton-down');
  const foe = makeMon(143, 'Snorlax', 'thick-fat', {
    speed: 120,
    statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: -6 }
  });
  const s = E.createTeamBattle(makeTeam(eldegoss), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(r.state.enemy.team[0].statStages.speed, -6);
});
