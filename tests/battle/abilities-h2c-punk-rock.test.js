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
    types: ['electric', 'poison'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 304, name: 'hyper-voice', type: 'normal', power: 90, accuracy: 100, priority: 0, damageClass: 'special', flags: { sound: true }, pp: 10, maxPp: 10 },
      { id: 775, name: 'overdrive', type: 'electric', power: 80, accuracy: 100, priority: 0, damageClass: 'special', flags: { sound: true }, pp: 10, maxPp: 10 },
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 }
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

test('Punk Rock: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('punk-rock');
  assert.ok(ab);
  assert.equal(ab.id, 'punk-rock');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.breakable, true);
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_BASE_POWER'));
  assert.ok(ab.triggers.includes('ON_SOURCE_MODIFY_DAMAGE'));
});

test('Punk Rock: boosts power of sound moves used by bearer by 5325/4096 (~1.3x)', () => {
  const toxtricity = makeMon(849, 'Toxtricity', 'punk-rock');
  const target = makeMon(25, 'Pikachu', 'static');
  const overdrive = { id: 775, name: 'overdrive', type: 'electric', power: 80, flags: { sound: true }, damageClass: 'special' };

  const pwr = constants.P7.power(null, toxtricity, target, overdrive, 80);
  const expected = Math.floor(80 * 5325 / 4096);
  assert.equal(Math.floor(pwr), expected, `Power should be boosted to ${expected}`);
});

test('Punk Rock: does NOT boost non-sound moves (Thunderbolt, Tackle)', () => {
  const toxtricity = makeMon(849, 'Toxtricity', 'punk-rock');
  const target = makeMon(25, 'Pikachu', 'static');
  const thunderbolt = { id: 85, name: 'thunderbolt', type: 'electric', power: 90, damageClass: 'special' };

  const pwr = constants.P7.power(null, toxtricity, target, thunderbolt, 90);
  assert.equal(pwr, 90, 'Non-sound move must not be boosted');
});

test('Punk Rock: does NOT boost status sound moves (Growl)', () => {
  const toxtricity = makeMon(849, 'Toxtricity', 'punk-rock');
  const target = makeMon(25, 'Pikachu', 'static');
  const growl = { id: 45, name: 'growl', type: 'normal', power: null, damageClass: 'status', flags: { sound: true } };

  const pwr = constants.P7.power(null, toxtricity, target, growl, null);
  assert.equal(pwr, null, 'Status move power remains null');
});

test('Punk Rock: halves damage taken from incoming sound moves (Hyper Voice)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const toxtricityRock = makeMon(849, 'Toxtricity', 'punk-rock');
  const toxtricityPlus = makeMon(849, 'Toxtricity', 'plus');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(toxtricityRock));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 304, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgRock = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(toxtricityPlus));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 304, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlus = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgRock, Math.floor(dmgPlus * 0.5), 'Punk Rock halves sound damage taken');
});

test('Punk Rock: does NOT reduce damage from non-sound moves (Tackle)', () => {
  const attacker = makeMon(25, 'Pikachu', 'static');
  const toxtricityRock = makeMon(849, 'Toxtricity', 'punk-rock');
  const toxtricityPlus = makeMon(849, 'Toxtricity', 'plus');

  const s1 = E.createTeamBattle(makeTeam(attacker), makeTeam(toxtricityRock));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgRock = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(attacker), makeTeam(toxtricityPlus));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlus = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgRock, dmgPlus, 'Non-sound move damage is identical');
});

test('Punk Rock: Mold Breaker attacker ignores Punk Rock defensive sound damage reduction', () => {
  const haxorus = makeMon(612, 'Haxorus', 'mold-breaker');
  const toxtricityRock = makeMon(849, 'Toxtricity', 'punk-rock');
  const toxtricityPlus = makeMon(849, 'Toxtricity', 'plus');

  const s1 = E.createTeamBattle(makeTeam(haxorus), makeTeam(toxtricityRock));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 304, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgIgnored = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(haxorus), makeTeam(toxtricityPlus));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 304, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgIgnored, dmgPlain, 'Mold Breaker ignores Punk Rock defense');
});

test('Punk Rock: Neutralizing Gas suppresses Punk Rock completely', () => {
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');
  const toxtricity = makeMon(849, 'Toxtricity', 'punk-rock');
  const overdrive = { id: 775, name: 'overdrive', type: 'electric', power: 80, flags: { sound: true }, damageClass: 'special' };

  const s = E.createTeamBattle(makeTeam(weezing), makeTeam(toxtricity));
  const target = s.enemy.team[0];
  assert.equal(target.neutralizingGasSuppressed, true);

  const pwr = constants.P7.power(s, target, weezing, overdrive, 80);
  assert.equal(pwr, 80, 'Under Gas, Punk Rock offensive sound boost is lost');

  const mult = constants.P7.damageMultiplier(s, weezing, target, overdrive, 1);
  assert.equal(mult, 1, 'Under Gas, Punk Rock defensive sound reduction is lost');
});

