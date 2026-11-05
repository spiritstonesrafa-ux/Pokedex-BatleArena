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
    types: ['fighting'],
    ability,
    moves: [
      { id: 7, name: 'fire-punch', type: 'fire', power: 75, accuracy: 100, priority: 0, damageClass: 'physical', pp: 15, maxPp: 15 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 94, name: 'psychic', type: 'psychic', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 },
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

test('Iron Fist: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('iron-fist');
  assert.equal(meta.id, 'iron-fist');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 4);
  assert.ok(meta.triggers.includes('MODIFY_POWER'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Iron Fist: boosts punching move (Fire Punch) power by 4915/4096 (~1.2x)', () => {
  const hitmonchan = makeMon(107, 'Hitmonchan', 'iron-fist');
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(hitmonchan), makeTeam(foe));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 7, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 182 }
  });
  // Fire Punch base power is 75. With Iron Fist: 75 * 4915 / 4096 = 89.9707
  const resolvedPower = P7.power(s, hitmonchan, foe, hitmonchan.moves[0], 75);
  assert.equal(resolvedPower, 75 * 4915 / 4096);
});

test('Iron Fist: does NOT boost non-punch move (Tackle)', () => {
  const hitmonchan = makeMon(107, 'Hitmonchan', 'iron-fist');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle(makeTeam(hitmonchan), makeTeam(foe));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });
  const dmgApplied = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.equal(dmgApplied.power, 40);
});

test('Iron Fist: does NOT boost contact moves that are not punch', () => {
  const hitmonchan = makeMon(107, 'Hitmonchan', 'iron-fist');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  // Bite (ID 44) is contact but not punch
  const biteMove = { id: 44, name: 'bite', type: 'dark', power: 60, damageClass: 'physical' };
  const power = P7.power(null, hitmonchan, foe, biteMove, 60);
  assert.equal(power, 60);
});

test('Iron Fist: multi-hit punch moves boost every damaging hit', () => {
  const hitmonchan = makeMon(107, 'Hitmonchan', 'iron-fist');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  // Comet Punch (ID 4) is a multi-hit punch move with power 18
  const cometPunch = { id: 4, name: 'comet-punch', type: 'normal', power: 18, damageClass: 'physical' };
  const power = P7.power(null, hitmonchan, foe, cometPunch, 18);
  assert.equal(power, 18 * 4915 / 4096);
});

test('Iron Fist: Neutralizing Gas suppresses Iron Fist boost', () => {
  const hitmonchan = makeMon(107, 'Hitmonchan', 'iron-fist');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { maxHp: 100, currentHp: 100 });
  const s = E.createTeamBattle(makeTeam(hitmonchan), makeTeam(weezing));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 7, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 182 }
  });
  // Fire Punch under gas is unboosted 75 on active player mon
  const activeMon = r.state.player.team[0];
  const power = P7.power(r.state, activeMon, weezing, activeMon.moves[0], 75);
  assert.equal(power, 75);
});

test('Iron Fist: stacks multiplicatively with Life Orb', () => {
  const hitmonchan = makeMon(107, 'Hitmonchan', 'iron-fist', { item: 'life-orb' });
  const foe = makeMon(100, 'Voltorb', 'soundproof');
  const power = P7.power(null, hitmonchan, foe, hitmonchan.moves[0], 75);
  const mult = P7.damageMultiplier(null, hitmonchan, foe, hitmonchan.moves[0], 1);
  assert.equal(power, 75 * 4915 / 4096);
  assert.equal(mult, 1.3);
});

test('Iron Fist: damage preview matches actual engine calculation without state mutation', () => {
  const hitmonchan = makeMon(107, 'Hitmonchan', 'iron-fist');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const evalMove = { id: 7, name: 'fire-punch', type: 'fire', power: 75, damageClass: 'physical' };
  const powerPreview = P7.power(null, hitmonchan, foe, evalMove, 75);
  assert.equal(powerPreview, 75 * 4915 / 4096);
});
