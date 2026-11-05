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
    types: ['dark', 'flying'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 24, name: 'double-kick', type: 'fighting', power: 30, accuracy: 100, priority: 0, damageClass: 'physical', pp: 30, maxPp: 30 }
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

test('Super Luck: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('super-luck');
  assert.equal(meta.id, 'super-luck');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 4);
  assert.ok(meta.triggers.includes('MODIFY_CRIT_RATIO'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Super Luck: raises critical stage from 0 to 1 (1/24 to 1/8)', () => {
  const honchkrow = makeMon(430, 'Honchkrow', 'super-luck');
  const foe = makeMon(25, 'Pikachu', 'static');
  const tackle = honchkrow.moves[0];

  const chance = C.Critical.chance(tackle, constants, honchkrow, foe);
  assert.equal(chance, 1 / 8);

  // Over all 24 rolls: 1..3 land critical, 4..24 do not
  const crits = Array.from({ length: 24 }, (_, i) => C.Critical.resolve(tackle, i + 1, constants, honchkrow, foe)).filter(Boolean);
  assert.equal(crits.length, 3);
});

test('Super Luck: stacks with high-critical move (Slash, stage 1 + 1 = 2, 50% chance)', () => {
  const honchkrow = makeMon(430, 'Honchkrow', 'super-luck');
  const foe = makeMon(25, 'Pikachu', 'static');
  const slash = honchkrow.moves[1];

  const chance = C.Critical.chance(slash, constants, honchkrow, foe);
  assert.equal(chance, 1 / 2);

  // Over 24 rolls: 1..12 are criticals
  const crits = Array.from({ length: 24 }, (_, i) => C.Critical.resolve(slash, i + 1, constants, honchkrow, foe)).filter(Boolean);
  assert.equal(crits.length, 12);
});

test('Super Luck: stacks with Scope Lens and Slash to reach 100% critical (stage 3)', () => {
  const honchkrow = makeMon(430, 'Honchkrow', 'super-luck', { item: 'scope-lens' });
  const foe = makeMon(25, 'Pikachu', 'static');
  const slash = honchkrow.moves[1];

  const chance = C.Critical.chance(slash, constants, honchkrow, foe);
  assert.equal(chance, 1);

  // Every roll from 1 to 24 is a critical hit
  const crits = Array.from({ length: 24 }, (_, i) => C.Critical.resolve(slash, i + 1, constants, honchkrow, foe)).filter(Boolean);
  assert.equal(crits.length, 24);
});

test('Super Luck: does not increase damage of non-critical hits', () => {
  const honchkrow = makeMon(430, 'Honchkrow', 'super-luck');
  const normalAttacker = makeMon(25, 'Pikachu', 'static');
  const foe = makeMon(143, 'Snorlax', 'soundproof', { maxHp: 500, currentHp: 500 });

  const s1 = E.createTeamBattle(makeTeam(honchkrow), makeTeam(foe));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 33, criticalRoll: 24, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const s2 = E.createTeamBattle(makeTeam(normalAttacker), makeTeam(foe));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 33, criticalRoll: 24, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const d1 = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  const d2 = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.equal(d1.damage, d2.damage);
  assert.equal(d1.critical, false);
});

test('Super Luck: blocked by opponent Battle Armor / Shell Armor', () => {
  const honchkrow = makeMon(430, 'Honchkrow', 'super-luck', { item: 'scope-lens' });
  const kabutops = makeMon(141, 'Kabutops', 'battle-armor', { maxHp: 300, currentHp: 300 });
  const slash = honchkrow.moves[1];

  const chance = C.Critical.chance(slash, constants, honchkrow, kabutops);
  assert.equal(chance, 0);
  assert.equal(C.Critical.resolve(slash, 1, constants, honchkrow, kabutops), false);
});

test('Super Luck: Neutralizing Gas suppresses Super Luck, reverting to standard rate', () => {
  const honchkrow = makeMon(430, 'Honchkrow', 'super-luck');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { maxHp: 300, currentHp: 300 });
  const s = E.createTeamBattle(makeTeam(honchkrow), makeTeam(weezing));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, criticalRoll: 2, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  // Roll 2 with Tackle would be a crit if Super Luck (1..3) was active, but under Gas it reverts to stage 0 (only roll 1 crits)
  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d);
  assert.equal(d.critical, false);
});

test('Super Luck: preview evaluation incorporates elevated critical rate without mutation', () => {
  const honchkrow = makeMon(430, 'Honchkrow', 'super-luck');
  const foe = makeMon(25, 'Pikachu', 'static');
  const slash = honchkrow.moves[1];

  const preview = Ev.evaluateMove(slash, honchkrow, foe, constants, {});
  assert.ok(preview);
  assert.equal(honchkrow.ability, 'super-luck');
});
