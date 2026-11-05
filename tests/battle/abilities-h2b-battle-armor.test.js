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
    types: ['rock', 'water'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 24, name: 'double-kick', type: 'fighting', power: 30, accuracy: 100, priority: 0, damageClass: 'physical', pp: 30, maxPp: 30 },
      { id: 480, name: 'storm-throw', type: 'fighting', power: 60, accuracy: 100, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 }
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

test('Battle Armor: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('battle-armor');
  assert.equal(meta.id, 'battle-armor');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 3);
  assert.ok(meta.triggers.includes('ON_CRITICAL_HIT'));
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

test('Battle Armor: prevents regular critical hits (criticalRoll = 1)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const kabutops = makeMon(141, 'Kabutops', 'battle-armor', { maxHp: 300, currentHp: 300 });
  const s = E.createTeamBattle(makeTeam(attacker), makeTeam(kabutops));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, criticalRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const damageEvent = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(damageEvent);
  assert.equal(damageEvent.critical, false);
  assert.equal(damageEvent.criticalMultiplier, 1);
});

test('Battle Armor: prevents guaranteed critical hit move (Storm Throw)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const kabutops = makeMon(141, 'Kabutops', 'battle-armor', { maxHp: 300, currentHp: 300 });
  const stormThrow = { id: 480, name: 'storm-throw', type: 'fighting', power: 60, damageClass: 'physical' };

  assert.equal(C.Critical.chance(stormThrow, constants, attacker, kabutops), 0);
  assert.equal(C.Critical.resolve(stormThrow, 1, constants, attacker, kabutops), false);
});

test('Battle Armor: prevents criticals on all hits of multi-hit move', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const kabutops = makeMon(141, 'Kabutops', 'battle-armor', { maxHp: 300, currentHp: 300 });
  const s = E.createTeamBattle(makeTeam(attacker), makeTeam(kabutops));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 24, hitCriticalRolls: [1, 1], damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hits = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(hits.length >= 2);
  for (const h of hits) {
    assert.equal(h.critical, false);
  }
});

test('Battle Armor: Neutralizing Gas suppresses Battle Armor, allowing criticals', () => {
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');
  const kabutops = makeMon(141, 'Kabutops', 'battle-armor', { maxHp: 300, currentHp: 300 });
  const s = E.createTeamBattle(makeTeam(weezing), makeTeam(kabutops));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, criticalRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const damageEvent = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(damageEvent);
  assert.equal(damageEvent.critical, true);
});

test('Battle Armor: Mold Breaker attacker ignores Battle Armor', () => {
  const haxorus = makeMon(612, 'Haxorus', 'mold-breaker');
  const kabutops = makeMon(141, 'Kabutops', 'battle-armor', { maxHp: 300, currentHp: 300 });
  const s = E.createTeamBattle(makeTeam(haxorus), makeTeam(kabutops));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, criticalRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const damageEvent = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(damageEvent);
  assert.equal(damageEvent.critical, true);
});

test('Battle Armor: Ability Shield preserves Battle Armor against Mold Breaker', () => {
  const haxorus = makeMon(612, 'Haxorus', 'mold-breaker');
  const kabutops = makeMon(141, 'Kabutops', 'battle-armor', { item: 'ability-shield', maxHp: 300, currentHp: 300 });
  const s = E.createTeamBattle(makeTeam(haxorus), makeTeam(kabutops));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, criticalRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const damageEvent = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(damageEvent);
  assert.equal(damageEvent.critical, false);
});

test('Battle Armor: blocks critical from Merciless against poisoned target', () => {
  const toxapex = makeMon(748, 'Toxapex', 'merciless');
  const kabutops = makeMon(141, 'Kabutops', 'battle-armor', { statusCondition: 'poison', maxHp: 300, currentHp: 300 });
  const s = E.createTeamBattle(makeTeam(toxapex), makeTeam(kabutops));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, criticalRoll: 24, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const damageEvent = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(damageEvent);
  assert.equal(damageEvent.critical, false);
});