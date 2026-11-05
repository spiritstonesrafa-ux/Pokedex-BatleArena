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
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 89, name: 'earthquake', type: 'ground', power: 100, accuracy: 100, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 182, name: 'protect', type: 'normal', power: null, accuracy: null, priority: 4, damageClass: 'status', pp: 10, maxPp: 10 }
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

test('Tough Claws: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('tough-claws');
  assert.equal(meta.id, 'tough-claws');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 6);
  assert.ok(meta.triggers.includes('MODIFY_POWER'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Tough Claws: boosts contact physical move (Slash 70) by 5325/4096 (~1.3x)', () => {
  const barbaracle = makeMon(689, 'Barbaracle', 'tough-claws');
  const foe = makeMon(143, 'Snorlax', 'soundproof', { maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(barbaracle), makeTeam(foe));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const power = P7.power(s, barbaracle, foe, barbaracle.moves[0], 70);
  assert.equal(power, 70 * 5325 / 4096);
});

test('Tough Claws: does NOT boost non-contact move (Earthquake 100)', () => {
  const barbaracle = makeMon(689, 'Barbaracle', 'tough-claws');
  const foe = makeMon(143, 'Snorlax', 'soundproof');
  const power = P7.power(null, barbaracle, foe, barbaracle.moves[1], 100);
  assert.equal(power, 100);
});

test('Tough Claws: boosts special contact move (Draining Kiss 50)', () => {
  const barbaracle = makeMon(689, 'Barbaracle', 'tough-claws');
  const foe = makeMon(143, 'Snorlax', 'soundproof');
  // Draining Kiss (ID 577) is special and makes contact
  const drainingKiss = { id: 577, name: 'draining-kiss', type: 'fairy', power: 50, damageClass: 'special' };
  const power = P7.power(null, barbaracle, foe, drainingKiss, 50);
  assert.equal(power, 50 * 5325 / 4096);
});

test('Tough Claws: multi-hit contact moves boost every hit', () => {
  const barbaracle = makeMon(689, 'Barbaracle', 'tough-claws');
  const foe = makeMon(143, 'Snorlax', 'soundproof');
  // Fury Swipes (ID 154) is a multi-hit contact move with power 18
  const furySwipes = { id: 154, name: 'fury-swipes', type: 'normal', power: 18, damageClass: 'physical' };
  const power = P7.power(null, barbaracle, foe, furySwipes, 18);
  assert.equal(power, 18 * 5325 / 4096);
});

test('Tough Claws: does not prevent defender Rough Skin contact damage from triggering', () => {
  const barbaracle = makeMon(689, 'Barbaracle', 'tough-claws', { maxHp: 200, currentHp: 200 });
  const garchomp = makeMon(445, 'Garchomp', 'rough-skin', { maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(barbaracle), makeTeam(garchomp));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  // Slash makes contact: Rough Skin should still hurt Barbaracle by 1/8 max HP = 25
  const roughSkinEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rough-skin');
  assert.ok(roughSkinEvent);
  assert.equal(roughSkinEvent.damage, 25);
});

test('Tough Claws: Neutralizing Gas suppresses Tough Claws', () => {
  const barbaracle = makeMon(689, 'Barbaracle', 'tough-claws');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { maxHp: 100, currentHp: 100 });
  const s = E.createTeamBattle(makeTeam(barbaracle), makeTeam(weezing));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const activeMon = r.state.player.team[0];
  const power = P7.power(r.state, activeMon, weezing, activeMon.moves[0], 70);
  assert.equal(power, 70);
});

test('Tough Claws: damage preview matches engine calculation without mutation', () => {
  const barbaracle = makeMon(689, 'Barbaracle', 'tough-claws');
  const foe = makeMon(143, 'Snorlax', 'soundproof');
  const evalMove = { id: 33, name: 'tackle', type: 'normal', power: 40, damageClass: 'physical' };
  const powerPreview = P7.power(null, barbaracle, foe, evalMove, 40);
  assert.equal(powerPreview, 40 * 5325 / 4096);
});
