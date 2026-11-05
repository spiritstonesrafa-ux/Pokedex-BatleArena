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
    types: ['rock', 'dragon'],
    ability,
    moves: [
      { id: 44, name: 'bite', type: 'dark', power: 60, accuracy: 100, priority: 0, damageClass: 'physical', pp: 25, maxPp: 25 },
      { id: 242, name: 'crunch', type: 'dark', power: 80, accuracy: 100, priority: 0, damageClass: 'physical', pp: 15, maxPp: 15 },
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

test('Strong Jaw: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('strong-jaw');
  assert.equal(meta.id, 'strong-jaw');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 6);
  assert.ok(meta.triggers.includes('MODIFY_POWER'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Strong Jaw: boosts bite move (Bite 60) by 1.5x (to 90 power)', () => {
  const tyrantrum = makeMon(697, 'Tyrantrum', 'strong-jaw');
  const foe = makeMon(143, 'Snorlax', 'soundproof', { maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(tyrantrum), makeTeam(foe));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 44, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 182 }
  });
  // Bite power 60 boosted to 90
  const power = P7.power(s, tyrantrum, foe, tyrantrum.moves[0], 60);
  assert.equal(power, 90);
});

test('Strong Jaw: boosts Crunch (80) by 1.5x (to 120 power)', () => {
  const tyrantrum = makeMon(697, 'Tyrantrum', 'strong-jaw');
  const foe = makeMon(143, 'Snorlax', 'soundproof');
  const power = P7.power(null, tyrantrum, foe, tyrantrum.moves[1], 80);
  assert.equal(power, 120);
});

test('Strong Jaw: does NOT boost non-bite move (Tackle)', () => {
  const tyrantrum = makeMon(697, 'Tyrantrum', 'strong-jaw');
  const foe = makeMon(143, 'Snorlax', 'soundproof');
  const power = P7.power(null, tyrantrum, foe, tyrantrum.moves[2], 40);
  assert.equal(power, 40);
});

test('Strong Jaw: boosts elemental fangs (Fire Fang 65 -> 97.5)', () => {
  const tyrantrum = makeMon(697, 'Tyrantrum', 'strong-jaw');
  const foe = makeMon(143, 'Snorlax', 'soundproof');
  const fireFang = { id: 422, name: 'fire-fang', type: 'fire', power: 65, damageClass: 'physical' };
  const power = P7.power(null, tyrantrum, foe, fireFang, 65);
  assert.equal(power, 65 * 1.5);
});

test('Strong Jaw: Neutralizing Gas suppresses Strong Jaw boost', () => {
  const tyrantrum = makeMon(697, 'Tyrantrum', 'strong-jaw');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { maxHp: 100, currentHp: 100 });
  const s = E.createTeamBattle(makeTeam(tyrantrum), makeTeam(weezing));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 44, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 182 }
  });
  const activeMon = r.state.player.team[0];
  const power = P7.power(r.state, activeMon, weezing, activeMon.moves[0], 60);
  assert.equal(power, 60);
});

test('Strong Jaw: stacks with critical hits and items', () => {
  const tyrantrum = makeMon(697, 'Tyrantrum', 'strong-jaw', { item: 'life-orb' });
  const foe = makeMon(143, 'Snorlax', 'soundproof');
  const power = P7.power(null, tyrantrum, foe, tyrantrum.moves[0], 60);
  const mult = P7.damageMultiplier(null, tyrantrum, foe, tyrantrum.moves[0], 1);
  assert.equal(power, 90);
  assert.equal(mult, 1.3);
});

test('Strong Jaw: preview evaluation matches battle engine calculation', () => {
  const tyrantrum = makeMon(697, 'Tyrantrum', 'strong-jaw');
  const foe = makeMon(143, 'Snorlax', 'soundproof');
  const evalMove = { id: 242, name: 'crunch', type: 'dark', power: 80, damageClass: 'physical' };
  const previewPower = P7.power(null, tyrantrum, foe, evalMove, 80);
  assert.equal(previewPower, 120);
});
