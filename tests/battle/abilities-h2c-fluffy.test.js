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
    types: ['normal'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', flags: { contact: true }, pp: 35, maxPp: 35 },
      { id: 89, name: 'earthquake', type: 'ground', power: 100, accuracy: 100, priority: 0, damageClass: 'physical', flags: { contact: false }, pp: 10, maxPp: 10 },
      { id: 53, name: 'flamethrower', type: 'fire', power: 90, accuracy: 100, priority: 0, damageClass: 'special', flags: { contact: false }, pp: 15, maxPp: 15 },
      { id: 7, name: 'fire-punch', type: 'fire', power: 75, accuracy: 100, priority: 0, damageClass: 'physical', flags: { contact: true, punch: true }, pp: 15, maxPp: 15 }
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

test('Fluffy: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('fluffy');
  assert.ok(ab);
  assert.equal(ab.id, 'fluffy');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.breakable, true);
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_SOURCE_MODIFY_DAMAGE'));
});

test('Fluffy: halves damage taken from physical contact moves (Tackle)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const bewearFluffy = makeMon(760, 'Bewear', 'fluffy');
  const bewearPlain = makeMon(760, 'Bewear', 'klutz');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(bewearFluffy));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgFluffy = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(bewearPlain));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgFluffy, Math.floor(dmgPlain * 0.5));
});

test('Fluffy: halves damage taken from special contact moves', () => {
  const drainingKiss = { id: 577, name: 'draining-kiss', type: 'fairy', power: 50, damageClass: 'special', flags: { contact: true } };
  const attacker = makeMon(25, 'Pikachu', 'static', { specialAttack: 120 });
  const bewearFluffy = makeMon(760, 'Bewear', 'fluffy');
  const bewearPlain = makeMon(760, 'Bewear', 'klutz');

  const prevFluffy = Ev.evaluateMove(attacker, bewearFluffy, drainingKiss, { constants });
  const prevPlain = Ev.evaluateMove(attacker, bewearPlain, drainingKiss, { constants });

  assert.equal(prevFluffy.expectedDamage, Math.floor(prevPlain.expectedDamage * 0.5));
});

test('Fluffy: does NOT reduce damage from non-contact physical moves (Earthquake)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const bewearFluffy = makeMon(760, 'Bewear', 'fluffy');
  const bewearPlain = makeMon(760, 'Bewear', 'klutz');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(bewearFluffy));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 89, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgFluffy = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(bewearPlain));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 89, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgFluffy, dmgPlain);
});

test('Fluffy: doubles damage taken from non-contact Fire moves (Flamethrower)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const bewearFluffy = makeMon(760, 'Bewear', 'fluffy');
  const bewearPlain = makeMon(760, 'Bewear', 'klutz');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(bewearFluffy));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 53, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgFluffy = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(bewearPlain));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 53, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgFluffy, dmgPlain * 2);
});

test('Fluffy: contact Fire move (Fire Punch) cancels out to 1.0x (neutral)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const bewearFluffy = makeMon(760, 'Bewear', 'fluffy');
  const bewearPlain = makeMon(760, 'Bewear', 'klutz');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(bewearFluffy));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 7, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgFluffy = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(bewearPlain));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 7, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgFluffy, dmgPlain, '0.5x contact * 2.0x fire should net to exactly 1.0x');
});

test('Fluffy: Mold Breaker attacker ignores Fluffy contact damage reduction', () => {
  const haxorus = makeMon(612, 'Haxorus', 'mold-breaker');
  const bewearFluffy = makeMon(760, 'Bewear', 'fluffy');
  const bewearPlain = makeMon(760, 'Bewear', 'klutz');

  const s1 = E.createTeamBattle(makeTeam(haxorus), makeTeam(bewearFluffy));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgIgnored = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(haxorus), makeTeam(bewearPlain));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgIgnored, dmgPlain, 'Mold Breaker ignores Fluffy contact reduction');
});

test('Fluffy: Neutralizing Gas suppresses Fluffy completely', () => {
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');
  const bewearFluffy = makeMon(760, 'Bewear', 'fluffy');

  const s = E.createTeamBattle(makeTeam(weezing), makeTeam(bewearFluffy));
  const rContact = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgContact = rContact.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const mult = constants.P7.damageMultiplier(s, weezing, s.enemy.team[0], { type: 'normal', flags: { contact: true } }, 1);
  assert.equal(mult, 1, 'Under Gas, Fluffy multiplier is 1 (unmodified)');
});

