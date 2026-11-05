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
    types: ['poison', 'water'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 24, name: 'double-kick', type: 'fighting', power: 30, accuracy: 100, priority: 0, damageClass: 'physical', pp: 30, maxPp: 30 }
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

test('Merciless: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('merciless');
  assert.equal(meta.id, 'merciless');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 7);
  assert.ok(meta.triggers.includes('MODIFY_CRIT_RATIO'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Merciless: guaranteed critical hit against poisoned target (even with roll = 24)', () => {
  const toxapex = makeMon(748, 'Toxapex', 'merciless');
  const poisonedFoe = makeMon(143, 'Snorlax', 'soundproof', { statusCondition: 'poison', maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(toxapex), makeTeam(poisonedFoe));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, criticalRoll: 24, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d);
  assert.equal(d.critical, true);
  assert.equal(d.criticalMultiplier, 1.5);
});

test('Merciless: guaranteed critical hit against badly poisoned target (toxic)', () => {
  const toxapex = makeMon(748, 'Toxapex', 'merciless');
  const toxicFoe = makeMon(143, 'Snorlax', 'soundproof', { statusCondition: 'toxic', maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(toxapex), makeTeam(toxicFoe));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, criticalRoll: 24, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d);
  assert.equal(d.critical, true);
});

test('Merciless: does NOT guarantee critical against target without status', () => {
  const toxapex = makeMon(748, 'Toxapex', 'merciless');
  const healthyFoe = makeMon(143, 'Snorlax', 'soundproof', { maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(toxapex), makeTeam(healthyFoe));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, criticalRoll: 24, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d);
  assert.equal(d.critical, false);
});

test('Merciless: does NOT guarantee critical against burned, paralyzed, or sleeping target', () => {
  const toxapex = makeMon(748, 'Toxapex', 'merciless');
  const tackle = toxapex.moves[0];

  for (const cond of ['burn', 'paralysis', 'sleep', 'freeze']) {
    const foe = makeMon(143, 'Snorlax', 'soundproof', { statusCondition: cond });
    assert.equal(C.Critical.chance(tackle, constants, toxapex, foe), 1 / 24);
  }
});

test('Merciless: opponent Battle Armor or Shell Armor blocks guaranteed critical', () => {
  const toxapex = makeMon(748, 'Toxapex', 'merciless');
  const kabutops = makeMon(141, 'Kabutops', 'battle-armor', { statusCondition: 'poison', maxHp: 300, currentHp: 300 });
  const cloyster = makeMon(91, 'Cloyster', 'shell-armor', { statusCondition: 'poison', maxHp: 300, currentHp: 300 });

  assert.equal(C.Critical.chance(toxapex.moves[0], constants, toxapex, kabutops), 0);
  assert.equal(C.Critical.chance(toxapex.moves[0], constants, toxapex, cloyster), 0);
  assert.equal(C.Critical.resolve(toxapex.moves[0], 1, constants, toxapex, kabutops), false);
  assert.equal(C.Critical.resolve(toxapex.moves[0], 1, constants, toxapex, cloyster), false);
});

test('Merciless: multi-hit moves land critical on every hit against poisoned target', () => {
  const toxapex = makeMon(748, 'Toxapex', 'merciless');
  const poisonedFoe = makeMon(143, 'Snorlax', 'soundproof', { statusCondition: 'poison', maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(toxapex), makeTeam(poisonedFoe));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 24, hitCriticalRolls: [24, 24], damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hits = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(hits.length >= 2);
  for (const h of hits) {
    assert.equal(h.critical, true);
  }
});

test('Merciless: Neutralizing Gas suppresses Merciless (critical chance reverts to normal)', () => {
  const toxapex = makeMon(748, 'Toxapex', 'merciless');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { statusCondition: 'poison', maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(toxapex), makeTeam(weezing));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, criticalRoll: 24, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d);
  assert.equal(d.critical, false);
});
