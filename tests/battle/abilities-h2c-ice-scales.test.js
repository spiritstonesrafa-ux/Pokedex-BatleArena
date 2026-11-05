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
    types: ['ice', 'bug'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 58, name: 'ice-beam', type: 'ice', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 },
      { id: 473, name: 'psyshock', type: 'psychic', power: 80, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 },
      { id: 593, name: 'water-shuriken', type: 'water', power: 15, accuracy: 100, priority: 1, damageClass: 'special', pp: 20, maxPp: 20 }
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

test('Ice Scales: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('ice-scales');
  assert.ok(ab);
  assert.equal(ab.id, 'ice-scales');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.breakable, true);
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_SOURCE_MODIFY_DAMAGE'));
});

test('Ice Scales: halves damage taken from standard Special moves (Ice Beam)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static', { specialAttack: 120 });
  const frosmothScales = makeMon(873, 'Frosmoth', 'ice-scales');
  const frosmothShield = makeMon(873, 'Frosmoth', 'shield-dust');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(frosmothScales));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 58, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgScales = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(frosmothShield));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 58, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgShield = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgScales, Math.floor(dmgShield * 0.5));
});

test('Ice Scales: does NOT reduce damage from Physical moves (Tackle)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const frosmothScales = makeMon(873, 'Frosmoth', 'ice-scales');
  const frosmothShield = makeMon(873, 'Frosmoth', 'shield-dust');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(frosmothScales));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgScales = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(frosmothShield));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgShield = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgScales, dmgShield);
});

test('Ice Scales: halves damage from Special moves that target Defense (Psyshock)', () => {
  const psyshock = { id: 473, name: 'psyshock', type: 'psychic', power: 80, damageClass: 'special' };
  const attacker = makeMon(25, 'Pikachu', 'static', { specialAttack: 120 });
  const frosmothScales = makeMon(873, 'Frosmoth', 'ice-scales');
  const frosmothShield = makeMon(873, 'Frosmoth', 'shield-dust');

  const prevScales = Ev.evaluateMove(attacker, frosmothScales, psyshock, { constants });
  const prevShield = Ev.evaluateMove(attacker, frosmothShield, psyshock, { constants });

  assert.equal(prevScales.expectedDamage, Math.floor(prevShield.expectedDamage * 0.5));
});

test('Ice Scales: multi-hit Special moves have each hit halved', () => {
  const attacker = makeMon(25, 'Pikachu', 'static', { specialAttack: 120 });
  const frosmothScales = makeMon(873, 'Frosmoth', 'ice-scales');
  const frosmothShield = makeMon(873, 'Frosmoth', 'shield-dust');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(frosmothScales));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 593, hitCountRoll: 2, hitDamageRolls: [100, 100], hitCriticalRolls: [24, 24] },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const hitsScales = r1.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(frosmothShield));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 593, hitCountRoll: 2, hitDamageRolls: [100, 100], hitCriticalRolls: [24, 24] },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const hitsShield = r2.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');

  assert.ok(hitsScales.length >= 2);
  for (let i = 0; i < hitsScales.length; i++) {
    assert.equal(hitsScales[i].damage, Math.floor(hitsShield[i].damage * 0.5));
  }
});

test('Ice Scales: critical hit damage from special moves is still halved', () => {
  const attacker = makeMon(25, 'Pikachu', 'static', { specialAttack: 120 });
  const frosmothScales = makeMon(873, 'Frosmoth', 'ice-scales');
  const frosmothShield = makeMon(873, 'Frosmoth', 'shield-dust');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(frosmothScales));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 58, damageRoll: 100, criticalRoll: 1 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgScales = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(frosmothShield));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 58, damageRoll: 100, criticalRoll: 1 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgShield = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgScales, Math.floor(dmgShield * 0.5));
});

test('Ice Scales: Mold Breaker attacker ignores Ice Scales (deals full special damage)', () => {
  const haxorus = makeMon(612, 'Haxorus', 'mold-breaker', { specialAttack: 120 });
  const frosmothScales = makeMon(873, 'Frosmoth', 'ice-scales');
  const frosmothShield = makeMon(873, 'Frosmoth', 'shield-dust');

  const s1 = E.createTeamBattle(makeTeam(haxorus), makeTeam(frosmothScales));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 58, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgIgnored = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(haxorus), makeTeam(frosmothShield));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 58, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgIgnored, dmgPlain, 'Mold Breaker ignores Ice Scales reduction');
});

test('Ice Scales: Neutralizing Gas suppresses Ice Scales', () => {
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { specialAttack: 120 });
  const frosmothScales = makeMon(873, 'Frosmoth', 'ice-scales');

  const s = E.createTeamBattle(makeTeam(weezing), makeTeam(frosmothScales));
  const mult = constants.P7.damageMultiplier(s, weezing, s.enemy.team[0], { type: 'ice', damageClass: 'special' }, 1);
  assert.equal(mult, 1, 'Under Gas, Ice Scales is suppressed (multiplier = 1)');
});

