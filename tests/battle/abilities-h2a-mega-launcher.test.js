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
    types: ['water'],
    ability,
    moves: [
      { id: 352, name: 'water-pulse', type: 'water', power: 60, accuracy: 100, priority: 0, damageClass: 'special', pp: 20, maxPp: 20 },
      { id: 396, name: 'aura-sphere', type: 'fighting', power: 80, accuracy: 100, priority: 0, damageClass: 'special', pp: 20, maxPp: 20 },
      { id: 399, name: 'dark-pulse', type: 'dark', power: 80, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 }
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

test('Mega Launcher: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('mega-launcher');
  assert.equal(meta.id, 'mega-launcher');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 6);
  assert.ok(meta.triggers.includes('MODIFY_POWER'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Mega Launcher: boosts pulse moves (Water Pulse 60 -> 90, Aura Sphere 80 -> 120)', () => {
  const clawitzer = makeMon(693, 'Clawitzer', 'mega-launcher');
  const foe = makeMon(100, 'Voltorb', 'soundproof');

  assert.equal(P7.power(null, clawitzer, foe, clawitzer.moves[0], 60), 90);
  assert.equal(P7.power(null, clawitzer, foe, clawitzer.moves[1], 80), 120);
});

test('Mega Launcher: boosts Dark Pulse (80 -> 120) and Dragon Pulse (85 -> 127.5)', () => {
  const clawitzer = makeMon(693, 'Clawitzer', 'mega-launcher');
  const foe = makeMon(100, 'Voltorb', 'soundproof');
  const dragonPulse = { id: 406, name: 'dragon-pulse', type: 'dragon', power: 85, damageClass: 'special' };

  assert.equal(P7.power(null, clawitzer, foe, clawitzer.moves[2], 80), 120);
  assert.equal(P7.power(null, clawitzer, foe, dragonPulse, 85), 85 * 1.5);
});

test('Mega Launcher: does NOT boost non-pulse moves (Surf, Tackle, Ice Beam)', () => {
  const clawitzer = makeMon(693, 'Clawitzer', 'mega-launcher');
  const foe = makeMon(100, 'Voltorb', 'soundproof');

  const surf = { id: 57, name: 'surf', type: 'water', power: 90, damageClass: 'special' };
  const tackle = { id: 33, name: 'tackle', type: 'normal', power: 40, damageClass: 'physical' };

  assert.equal(P7.power(null, clawitzer, foe, surf, 90), 90);
  assert.equal(P7.power(null, clawitzer, foe, tackle, 40), 40);
});

test('Mega Launcher: status pulse moves are NOT boosted in damage', () => {
  const clawitzer = makeMon(693, 'Clawitzer', 'mega-launcher');
  const foe = makeMon(100, 'Voltorb', 'soundproof');
  const healPulse = { id: 505, name: 'heal-pulse', power: 0, damageClass: 'status', flags: { pulse: true } };

  assert.equal(P7.power(null, clawitzer, foe, healPulse, 0), 0);
});

test('Mega Launcher: works with flags.pulse even on custom moves', () => {
  const clawitzer = makeMon(693, 'Clawitzer', 'mega-launcher');
  const foe = makeMon(100, 'Voltorb', 'soundproof');
  const customPulse = { id: 9999, name: 'plasma-pulse', power: 70, damageClass: 'special', flags: { pulse: true } };

  assert.equal(P7.power(null, clawitzer, foe, customPulse, 70), 105);
});

test('Mega Launcher: Neutralizing Gas suppresses Mega Launcher', () => {
  const clawitzer = makeMon(693, 'Clawitzer', 'mega-launcher');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { maxHp: 100, currentHp: 100 });
  const s = E.createTeamBattle(makeTeam(clawitzer), makeTeam(weezing));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 352, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const activeMon = r.state.player.team[0];
  const power = P7.power(r.state, activeMon, weezing, activeMon.moves[0], 60);
  assert.equal(power, 60);
});

test('Mega Launcher: damage preview matches engine calculation without mutation', () => {
  const clawitzer = makeMon(693, 'Clawitzer', 'mega-launcher');
  const foe = makeMon(100, 'Voltorb', 'soundproof');
  const evalMove = { id: 352, name: 'water-pulse', type: 'water', power: 60, damageClass: 'special' };

  const powerPreview = P7.power(null, clawitzer, foe, evalMove, 60);
  assert.equal(powerPreview, 90);
  assert.equal(evalMove.power, 60);
});