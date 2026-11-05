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
    types: ['electric', 'flying'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 16, name: 'gust', type: 'flying', power: 40, accuracy: 100, priority: 0, damageClass: 'special', pp: 35, maxPp: 35 },
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 366, name: 'tailwind', type: 'flying', power: null, accuracy: null, priority: 0, damageClass: 'status', pp: 15, maxPp: 15 }
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

test('Wind Power: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('wind-power');
  assert.equal(meta.id, 'wind-power');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 9);
  assert.ok(meta.triggers.includes('AFTER_DAMAGING_HIT'));
  assert.ok(meta.triggers.includes('ON_TAILWIND'));
  assert.ok(meta.triggers.includes('MODIFY_POWER'));
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

test('Wind Power: hit by a wind move (Gust) grants Charge state', () => {
  const wattrel = makeMon(940, 'Wattrel', 'wind-power');
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(wattrel), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 16, accuracyRoll: 1, damageRoll: 100 } // Gust (Wind move)
  });
  assert.equal(r.state.player.team[0].charge, true);
  assert.ok(r.events.some(e => e.label === 'wind-power'));
});

test('Wind Power: user is NOT immune to wind moves and takes normal damage', () => {
  const wattrel = makeMon(940, 'Wattrel', 'wind-power', { currentHp: 200, maxHp: 200 });
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(wattrel), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 16, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.ok(r.state.player.team[0].currentHp < 200);
});

test('Wind Power: Electric move damage is doubled under Charge and consumes Charge', () => {
  const wattrelWithCharge = makeMon(940, 'Wattrel', 'wind-power', { charge: true, speed: 150 });
  const wattrelNormal = makeMon(940, 'Wattrel', 'wind-power', { charge: false, speed: 150 });
  const target1 = makeMon(143, 'Snorlax', 'thick-fat', { currentHp: 200, maxHp: 200 });
  const target2 = makeMon(143, 'Snorlax', 'thick-fat', { currentHp: 200, maxHp: 200 });

  const sCharged = E.createTeamBattle(makeTeam(wattrelWithCharge), makeTeam(target1), { rng: () => 1 });
  const rCharged = E.resolveTurn(sCharged, {
    player: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const sNormal = E.createTeamBattle(makeTeam(wattrelNormal), makeTeam(target2), { rng: () => 1 });
  const rNormal = E.resolveTurn(sNormal, {
    player: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const dmgCharged = 200 - rCharged.state.enemy.team[0].currentHp;
  const dmgNormal = 200 - rNormal.state.enemy.team[0].currentHp;
  // Doubled power gives ~2x damage
  assert.ok(dmgCharged >= dmgNormal * 1.9);
  // Charge is consumed after executing Electric move
  assert.equal(rCharged.state.player.team[0].charge, false);
});

test('Wind Power: non-wind damaging move does NOT grant Charge', () => {
  const wattrel = makeMon(940, 'Wattrel', 'wind-power');
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(wattrel), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 } // Tackle (non-wind)
  });
  assert.equal(r.state.player.team[0].charge, false);
  assert.equal(r.events.some(e => e.label === 'wind-power'), false);
});

test('Wind Power: setting Tailwind on ally side sets Charge to true', () => {
  const kilowattrel = makeMon(941, 'Kilowattrel', 'wind-power');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle(makeTeam(kilowattrel), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 366 }, // Tailwind
    enemy: { type: 'MOVE', moveId: 33 }
  });
  assert.equal(r.state.player.team[0].charge, true);
  assert.ok(r.events.some(e => e.label === 'wind-power'));
});

test('Wind Power: Neutralizing Gas suppresses Charge acquisition from wind move', () => {
  const wattrel = makeMon(940, 'Wattrel', 'wind-power');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', {
    speed: 120,
    moves: [{ id: 16, name: 'gust', type: 'flying', power: 40, accuracy: 100, priority: 0, damageClass: 'special', pp: 35, maxPp: 35 }]
  });
  const s = E.createTeamBattle(makeTeam(wattrel), makeTeam(weezing), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 16, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(r.state.player.team[0].charge, false);
  assert.equal(r.events.some(e => e.label === 'wind-power'), false);
});

test('Wind Power: switching out clears Charge state', () => {
  const wattrel = makeMon(940, 'Wattrel', 'wind-power', { charge: true });
  const bench = makeMon(102, 'Exeggcute', 'chlorophyll');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle([wattrel, bench, makeMon(101, 'Electrode', 'soundproof')], makeTeam(foe));

  assert.equal(s.player.team[0].charge, true);
  const r = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetPokemonId: 102 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  // Wattrel on bench has charge cleared
  assert.equal(r.state.player.team[0].charge, false);
});
