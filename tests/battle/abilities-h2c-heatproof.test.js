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
  const hp = extra.maxHp || extra.hp || extra.currentHp || 320;
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
    types: ['steel', 'psychic'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 53, name: 'flamethrower', type: 'fire', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 7, name: 'fire-punch', type: 'fire', power: 75, accuracy: 100, priority: 0, damageClass: 'physical', pp: 15, maxPp: 15 },
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 }
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

test('Heatproof: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('heatproof');
  assert.ok(ab);
  assert.equal(ab.id, 'heatproof');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.breakable, true);
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_SOURCE_MODIFY_DAMAGE'));
  assert.ok(ab.triggers.includes('ON_DAMAGE_RESIDUAL'));
});

test('Heatproof: halves damage taken from physical Fire moves (Fire Punch)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const bronzongHeatproof = makeMon(437, 'Bronzong', 'heatproof');
  const bronzongLevitate = makeMon(437, 'Bronzong', 'levitate');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(bronzongHeatproof));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 7, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgHeatproof = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(bronzongLevitate));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 7, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgHeatproof, Math.floor(dmgPlain * 0.5));
});

test('Heatproof: halves damage taken from special Fire moves (Flamethrower)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const bronzongHeatproof = makeMon(437, 'Bronzong', 'heatproof');
  const bronzongLevitate = makeMon(437, 'Bronzong', 'levitate');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(bronzongHeatproof));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 53, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgHeatproof = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(bronzongLevitate));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 53, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgHeatproof, Math.floor(dmgPlain * 0.5));
});

test('Heatproof: does NOT reduce damage from non-Fire moves (Tackle)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const bronzongHeatproof = makeMon(437, 'Bronzong', 'heatproof');
  const bronzongLevitate = makeMon(437, 'Bronzong', 'levitate');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(bronzongHeatproof));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgHeatproof = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(bronzongLevitate));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgHeatproof, dmgPlain);
});

test('Heatproof: halves residual damage caused by Burn (from 1/16 to 1/32)', () => {
  // maxHp = 320: normal burn is 320 / 16 = 20. Heatproof burn is floor(20 / 2) = 10.
  const attacker = makeMon(25, 'Pikachu', 'static');
  const bronzongHeatproof = makeMon(437, 'Bronzong', 'heatproof', { maxHp: 320, currentHp: 320, statusCondition: 'burn' });
  const bronzongLevitate = makeMon(437, 'Bronzong', 'levitate', { maxHp: 320, currentHp: 320, statusCondition: 'burn' });

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(bronzongHeatproof));
  s1.enemy.team[0].statusCondition = 'burn';
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 100 }, // Tackle misses or doesn't KO
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const burnEvHeatproof = r1.events.find(e => e.type === 'STATUS_DAMAGE' && e.target === 'enemy');
  assert.ok(burnEvHeatproof, 'Burn residual damage event should exist');
  assert.equal(burnEvHeatproof.damage, 10, 'Heatproof should take 10 burn damage (half of 20)');

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(bronzongLevitate));
  s2.enemy.team[0].statusCondition = 'burn';
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const burnEvPlain = r2.events.find(e => e.type === 'STATUS_DAMAGE' && e.target === 'enemy');
  assert.equal(burnEvPlain.damage, 20, 'Normal burn is 20 damage');
});

test('Heatproof: does NOT grant immunity to Burn', () => {
  const bronzong = makeMon(437, 'Bronzong', 'heatproof');
  assert.equal(constants.P7.statusImmune(bronzong, 'burn'), false);
});

test('Heatproof: Mold Breaker attacker ignores Heatproof Fire damage reduction', () => {
  const haxorus = makeMon(612, 'Haxorus', 'mold-breaker');
  const bronzongHeatproof = makeMon(437, 'Bronzong', 'heatproof');
  const bronzongLevitate = makeMon(437, 'Bronzong', 'levitate');

  const s1 = E.createTeamBattle(makeTeam(haxorus), makeTeam(bronzongHeatproof));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 53, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgIgnored = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(haxorus), makeTeam(bronzongLevitate));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 53, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgIgnored, dmgPlain, 'Mold Breaker deals full Fire damage against Heatproof');
});

test('Heatproof: Neutralizing Gas suppresses Heatproof, restoring full Fire damage and full Burn damage', () => {
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');
  const bronzongHeatproof = makeMon(437, 'Bronzong', 'heatproof', { maxHp: 320, currentHp: 320 });

  const s = E.createTeamBattle(makeTeam(weezing), makeTeam(bronzongHeatproof));
  s.enemy.team[0].statusCondition = 'burn';

  const mult = constants.P7.damageMultiplier(s, weezing, s.enemy.team[0], { type: 'fire' }, 1);
  assert.equal(mult, 1, 'Under Gas, Fire damage multiplier is 1 (unreduced)');

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const burnEv = r.events.find(e => e.type === 'STATUS_DAMAGE' && e.target === 'enemy');
  assert.equal(burnEv.damage, 20, 'Under Gas, Burn residual damage is full 20');
});
