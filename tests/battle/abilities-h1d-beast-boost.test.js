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
    types: ['normal'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 94, name: 'psychic', type: 'psychic', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 },
      { id: 38, name: 'double-edge', type: 'normal', power: 120, accuracy: 100, priority: 0, damageClass: 'physical', pp: 15, maxPp: 15, recoil: 33 },
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

test('Beast Boost: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('beast-boost');
  assert.equal(meta.id, 'beast-boost');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 7);
  assert.ok(meta.triggers.includes('ON_DIRECT_KO'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Beast Boost: direct move knockout boosts highest stat (Attack)', () => {
  const nihilego = makeMon(793, 'Nihilego', 'beast-boost', {
    attack: 150,
    defense: 100,
    specialAttack: 120,
    specialDefense: 100,
    speed: 100
  });
  const victim = makeMon(2, 'Victim', 'run-away', { currentHp: 5, maxHp: 100 });
  const s = E.createTeamBattle(makeTeam(nihilego), makeTeam(victim), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(r.state.player.team[0].statStages.attack, 1);
  assert.ok(r.events.some(e => e.label === 'beast-boost'));
});

test('Beast Boost: canonical tie-breaker selects Attack over SpA when tied', () => {
  const kartana = makeMon(798, 'Kartana', 'beast-boost', {
    attack: 130,
    defense: 100,
    specialAttack: 130,
    specialDefense: 100,
    speed: 100
  });
  const victim = makeMon(2, 'Victim', 'run-away', { currentHp: 5, maxHp: 100 });
  const s = E.createTeamBattle(makeTeam(kartana), makeTeam(victim), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  // Attack has higher priority than specialAttack in ties
  assert.equal(r.state.player.team[0].statStages.attack, 1);
  assert.equal(r.state.player.team[0].statStages.specialAttack, 0);
});

test('Beast Boost: boosts Special Defense when it is the highest stat', () => {
  const nihilego = makeMon(793, 'Nihilego', 'beast-boost', {
    attack: 80,
    defense: 90,
    specialAttack: 120,
    specialDefense: 160,
    speed: 110
  });
  const victim = makeMon(2, 'Victim', 'run-away', { currentHp: 5, maxHp: 100 });
  const s = E.createTeamBattle(makeTeam(nihilego), makeTeam(victim), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(r.state.player.team[0].statStages.specialDefense, 1);
});

test('Beast Boost: KO caused by residual poison does NOT trigger Beast Boost', () => {
  const buzzwole = makeMon(794, 'Buzzwole', 'beast-boost', { attack: 150 });
  const victim = makeMon(2, 'Victim', 'run-away', { currentHp: 5, maxHp: 100, statusCondition: 'poison' });
  const s = E.createTeamBattle(makeTeam(buzzwole), makeTeam(victim), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 182 }, // Protect
    enemy: { type: 'MOVE', moveId: 182 }
  });
  assert.equal(r.state.player.team[0].statStages.attack, 0);
  assert.equal(r.events.some(e => e.label === 'beast-boost'), false);
});

test('Beast Boost: attacker fainting from recoil does NOT trigger Beast Boost', () => {
  const pheromosa = makeMon(795, 'Pheromosa', 'beast-boost', {
    currentHp: 1,
    maxHp: 100,
    attack: 160
  });
  const victim = makeMon(2, 'Victim', 'run-away', {
    currentHp: 50,
    maxHp: 100,
    moves: [{ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 }]
  });
  const s = E.createTeamBattle(makeTeam(pheromosa), makeTeam(victim), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 38, accuracyRoll: 1, damageRoll: 100 }, // Double-Edge
    enemy: { type: 'MOVE', moveId: 33 }
  });
  assert.equal(r.state.player.team[0].currentHp, 0);
  assert.equal(r.state.player.team[0].statStages.attack, 0);
  assert.equal(r.events.some(e => e.label === 'beast-boost'), false);
});

test('Beast Boost: Neutralizing Gas suppresses Beast Boost activation on KO', () => {
  const buzzwole = makeMon(794, 'Buzzwole', 'beast-boost', { attack: 150 });
  const ally = makeMon(10, 'Ally', 'soundproof');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { currentHp: 200, maxHp: 200 });
  const victim = makeMon(2, 'Victim', 'run-away', { currentHp: 5, maxHp: 100 });
  const s = E.createDoublesBattle([buzzwole, ally], [weezing, victim]);
  const r = E.resolveDoublesTurn(s, {
    player: { 0: { type: 'MOVE', moveId: 33, targetRole: 'enemy', targetSlot: 1 }, 1: { type: 'MOVE', moveId: 182 } },
    enemy: { 0: { type: 'MOVE', moveId: 182 }, 1: { type: 'MOVE', moveId: 182 } }
  });
  assert.equal(r.state.player.team[0].statStages.attack, 0);
  assert.equal(r.events.some(e => e.label === 'beast-boost'), false);
});

test('Beast Boost: stat caps cleanly at +6 stage and does not overflow', () => {
  const buzzwole = makeMon(794, 'Buzzwole', 'beast-boost', {
    attack: 150,
    statStages: { attack: 6, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }
  });
  const victim = makeMon(2, 'Victim', 'run-away', { currentHp: 5, maxHp: 100 });
  const s = E.createTeamBattle(makeTeam(buzzwole), makeTeam(victim), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(r.state.player.team[0].statStages.attack, 6);
});
