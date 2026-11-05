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
  const hp = extra.maxHp || extra.hp || extra.currentHp || 300;
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
    types: ['water', 'bug'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 127, name: 'waterfall', type: 'water', power: 80, accuracy: 100, priority: 0, damageClass: 'physical', pp: 15, maxPp: 15 },
      { id: 57, name: 'surf', type: 'water', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 53, name: 'flamethrower', type: 'fire', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 }
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

test('Water Bubble: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('water-bubble');
  assert.ok(ab);
  assert.equal(ab.id, 'water-bubble');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.breakable, true);
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_MODIFY_ATK'));
  assert.ok(ab.triggers.includes('ON_SOURCE_MODIFY_DAMAGE'));
  assert.ok(ab.triggers.includes('ON_SET_STATUS'));
});

test('Water Bubble: doubles effective offensive stat for Water moves (Waterfall & Surf)', () => {
  const araquanid = makeMon(752, 'Araquanid', 'water-bubble', { attack: 100, specialAttack: 100 });
  const waterfall = { id: 127, name: 'waterfall', type: 'water', power: 80, damageClass: 'physical' };
  const surf = { id: 57, name: 'surf', type: 'water', power: 90, damageClass: 'special' };

  const effAtk = constants.getEffectiveStat(araquanid, 'attack', waterfall);
  const effSpAtk = constants.getEffectiveStat(araquanid, 'specialAttack', surf);

  assert.equal(effAtk, 200, 'Attack should be doubled for Water moves');
  assert.equal(effSpAtk, 200, 'Special Attack should be doubled for Water moves');
});

test('Water Bubble: does NOT double offensive stats for non-Water moves (Tackle)', () => {
  const araquanid = makeMon(752, 'Araquanid', 'water-bubble', { attack: 100, specialAttack: 100 });
  const tackle = { id: 33, name: 'tackle', type: 'normal', power: 40, damageClass: 'physical' };

  const effAtk = constants.getEffectiveStat(araquanid, 'attack', tackle);
  assert.equal(effAtk, 100, 'Attack must not be doubled for normal moves');
});

test('Water Bubble: halves damage taken from incoming Fire moves (Flamethrower)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const araquanidBubble = makeMon(752, 'Araquanid', 'water-bubble');
  const araquanidWaterVeil = makeMon(752, 'Araquanid', 'water-veil');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(araquanidBubble));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 53, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgBubble = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(araquanidWaterVeil));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 53, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgBubble, Math.floor(dmgPlain * 0.5));
});

test('Water Bubble: grants immunity to Burn condition', () => {
  const araquanid = makeMon(752, 'Araquanid', 'water-bubble');
  assert.equal(constants.P7.statusImmune(araquanid, 'burn'), true);
});

test('Water Bubble: cures pre-existing Burn upon entering combat', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const araquanid = makeMon(752, 'Araquanid', 'water-bubble', { statusCondition: 'burn' });

  const s = E.createTeamBattle(makeTeam(attacker), makeTeam(araquanid));
  const target = s.enemy.team[0];
  assert.equal(target.statusCondition, null, 'Burn should be cured on entry by Water Bubble');
  const cureEv = s.initialP7Events?.find(e => e.type === 'STATUS_CURED' && e.reason === 'WATER_BUBBLE');
  assert.ok(cureEv, 'STATUS_CURED event must be emitted');
});

test('Water Bubble: Mold Breaker attacker ignores Water Bubble Fire damage reduction', () => {
  const haxorus = makeMon(612, 'Haxorus', 'mold-breaker');
  const araquanidBubble = makeMon(752, 'Araquanid', 'water-bubble');
  const araquanidPlain = makeMon(752, 'Araquanid', 'water-veil');

  const s1 = E.createTeamBattle(makeTeam(haxorus), makeTeam(araquanidBubble));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 53, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgIgnored = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(haxorus), makeTeam(araquanidPlain));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 53, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgIgnored, dmgPlain, 'Mold Breaker ignores Water Bubble defense');
});

test('Water Bubble: Neutralizing Gas suppresses Water Bubble (offensive boost and defensive reduction lost)', () => {
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');
  const araquanid = makeMon(752, 'Araquanid', 'water-bubble', { attack: 100 });
  const waterfall = { id: 127, name: 'waterfall', type: 'water', power: 80, damageClass: 'physical' };

  const s = E.createTeamBattle(makeTeam(weezing), makeTeam(araquanid));
  const target = s.enemy.team[0];
  assert.equal(target.neutralizingGasSuppressed, true);

  const effAtk = constants.getEffectiveStat(target, 'attack', waterfall);
  assert.equal(effAtk, 100, 'Under Gas, Attack is not doubled for Water moves');

  const mult = constants.P7.damageMultiplier(s, weezing, target, { type: 'fire' }, 1);
  assert.equal(mult, 1, 'Under Gas, Fire damage reduction is suppressed');
});

