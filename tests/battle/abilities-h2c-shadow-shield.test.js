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
  const hp = extra.maxHp || extra.hp || extra.currentHp || 400;
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
    types: ['psychic', 'ghost'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 331, name: 'bullet-seed', type: 'grass', power: 25, accuracy: 100, priority: 0, damageClass: 'physical', pp: 30, maxPp: 30 },
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

test('Shadow Shield: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('shadow-shield');
  assert.ok(ab);
  assert.equal(ab.id, 'shadow-shield');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.breakable, false, 'Shadow Shield cannot be broken by Mold Breaker per Gen IX canon');
  assert.equal(ab.suppressible, true);
  assert.equal(ab.copyable, false);
  assert.ok(ab.triggers.includes('ON_SOURCE_MODIFY_DAMAGE'));
});

test('Shadow Shield: halves damage taken when at full HP (100%)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const lunalaShield = makeMon(792, 'Lunala', 'shadow-shield', { maxHp: 400, currentHp: 400 });
  const lunalaPlain = makeMon(792, 'Lunala', 'pressure', { maxHp: 400, currentHp: 400 });

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(lunalaShield));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 89, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgShield = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(lunalaPlain));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 89, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgShield, Math.floor(dmgPlain * 0.5));
});

test('Shadow Shield: does NOT reduce damage when HP is below 100%', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const lunalaWounded = makeMon(792, 'Lunala', 'shadow-shield', { maxHp: 400, currentHp: 399 });
  const lunalaPlain = makeMon(792, 'Lunala', 'pressure', { maxHp: 400, currentHp: 399 });

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(lunalaWounded));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 89, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgWounded = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(lunalaPlain));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 89, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgWounded, dmgPlain, 'Shadow Shield must not activate when HP is below 100%');
});

test('Shadow Shield: full healing restores the 0.5x damage reduction', () => {
  const lunala = makeMon(792, 'Lunala', 'shadow-shield', { maxHp: 400, currentHp: 200 });
  const attacker = makeMon(25, 'Pikachu', 'static');

  // Below 100%: multiplier is 1
  let mult = constants.P7.damageMultiplier(null, attacker, lunala, { type: 'ground' }, 1);
  assert.equal(mult, 1);

  // Healed to 100%: multiplier is 0.5
  lunala.currentHp = 400;
  mult = constants.P7.damageMultiplier(null, attacker, lunala, { type: 'ground' }, 1);
  assert.equal(mult, 0.5);
});

test('Shadow Shield: multi-hit moves halve ONLY the first hit at full HP', () => {
  const attacker = makeMon(25, 'Pikachu', 'static', { attack: 120 });
  const lunalaShield = makeMon(792, 'Lunala', 'shadow-shield', { maxHp: 400, currentHp: 400 });
  const lunalaPlain = makeMon(792, 'Lunala', 'pressure', { maxHp: 400, currentHp: 400 });

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(lunalaShield));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 331, hitCountRoll: 2, hitDamageRolls: [100, 100], hitCriticalRolls: [24, 24] },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const hitsShield = r1.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(lunalaPlain));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 331, hitCountRoll: 2, hitDamageRolls: [100, 100], hitCriticalRolls: [24, 24] },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const hitsPlain = r2.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');

  assert.equal(hitsShield.length, 2);
  assert.equal(hitsShield[0].damage, Math.floor(hitsPlain[0].damage * 0.5), 'Hit 1 at full HP is halved');
  assert.equal(hitsShield[1].damage, hitsPlain[1].damage, 'Hit 2 after HP loss is NOT halved');
});

test('Shadow Shield: critical hits at full HP still have base damage halved', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const lunalaShield = makeMon(792, 'Lunala', 'shadow-shield', { maxHp: 400, currentHp: 400 });
  const lunalaPlain = makeMon(792, 'Lunala', 'pressure', { maxHp: 400, currentHp: 400 });

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(lunalaShield));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 89, damageRoll: 100, criticalRoll: 1 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgShield = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(lunalaPlain));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 89, damageRoll: 100, criticalRoll: 1 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgShield, Math.floor(dmgPlain * 0.5));
});

test('Shadow Shield: Mold Breaker attacker CANNOT bypass Shadow Shield (unbreakable per canon)', () => {
  const haxorus = makeMon(612, 'Haxorus', 'mold-breaker');
  const lunalaShield = makeMon(792, 'Lunala', 'shadow-shield', { maxHp: 400, currentHp: 400 });
  const lunalaPlain = makeMon(792, 'Lunala', 'pressure', { maxHp: 400, currentHp: 400 });

  const s1 = E.createTeamBattle(makeTeam(haxorus), makeTeam(lunalaShield));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 89, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgShield = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(haxorus), makeTeam(lunalaPlain));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 89, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgShield, Math.floor(dmgPlain * 0.5), 'Shadow Shield remains active against Mold Breaker');
});

test('Shadow Shield: Neutralizing Gas suppresses Shadow Shield', () => {
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');
  const lunalaShield = makeMon(792, 'Lunala', 'shadow-shield', { maxHp: 400, currentHp: 400 });

  const s = E.createTeamBattle(makeTeam(weezing), makeTeam(lunalaShield));
  const mult = constants.P7.damageMultiplier(s, weezing, s.enemy.team[0], { type: 'ground' }, 1);
  assert.equal(mult, 1, 'Under Gas, Shadow Shield is suppressed (multiplier = 1)');
});
