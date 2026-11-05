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
    types: ['water', 'dragon'],
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

test('Sniper: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('sniper');
  assert.equal(meta.id, 'sniper');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H2');
  assert.equal(meta.generation, 4);
  assert.ok(meta.triggers.includes('MODIFY_CRIT_DAMAGE'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Sniper: multiplies critical damage by 1.5x (total 2.25x multiplier)', () => {
  const kingdra = makeMon(230, 'Kingdra', 'sniper');
  const normalAttacker = makeMon(25, 'Pikachu', 'static');
  const foe = makeMon(143, 'Snorlax', 'soundproof', { maxHp: 500, currentHp: 500 });

  const s1 = E.createTeamBattle(makeTeam(kingdra), makeTeam(foe));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 163, criticalRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const s2 = E.createTeamBattle(makeTeam(normalAttacker), makeTeam(foe));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 163, criticalRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const dSniper = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  const dNormal = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(dSniper);
  assert.ok(dNormal);
  assert.equal(dSniper.critical, true);
  assert.equal(dSniper.criticalMultiplier, 2.25);
  assert.equal(dNormal.criticalMultiplier, 1.5);
  // Base critical is 1.5x, Sniper critical is 2.25x -> ratio is exactly 1.5
  assert.equal(Math.round(dSniper.damage / dNormal.damage * 100) / 100, 1.5);
});

test('Sniper: does NOT increase damage of non-critical hits', () => {
  const kingdra = makeMon(230, 'Kingdra', 'sniper');
  const normalAttacker = makeMon(25, 'Pikachu', 'static');
  const foe = makeMon(143, 'Snorlax', 'soundproof', { maxHp: 500, currentHp: 500 });

  const s1 = E.createTeamBattle(makeTeam(kingdra), makeTeam(foe));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 163, criticalRoll: 24, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const s2 = E.createTeamBattle(makeTeam(normalAttacker), makeTeam(foe));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 163, criticalRoll: 24, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const d1 = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  const d2 = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.equal(d1.damage, d2.damage);
  assert.equal(d1.critical, false);
});

test('Sniper: does NOT alter critical hit chance', () => {
  const kingdra = makeMon(230, 'Kingdra', 'sniper');
  const foe = makeMon(25, 'Pikachu', 'static');
  const tackle = kingdra.moves[0];

  assert.equal(C.Critical.chance(tackle, constants, kingdra, foe), 1 / 24);
});

test('Sniper: multi-hit moves amplify damage on each critical hit', () => {
  const kingdra = makeMon(230, 'Kingdra', 'sniper');
  const foe = makeMon(143, 'Snorlax', 'soundproof', { maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(kingdra), makeTeam(foe));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 24, hitCriticalRolls: [1, 1], damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hits = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(hits.length >= 2);
  for (const h of hits) {
    assert.equal(h.critical, true);
    assert.equal(h.criticalMultiplier, 2.25);
  }
});

test('Sniper: stacks multiplicatively with Life Orb on critical hits', () => {
  const kingdra = makeMon(230, 'Kingdra', 'sniper', { item: 'life-orb' });
  const foe = makeMon(143, 'Snorlax', 'soundproof', { maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(kingdra), makeTeam(foe));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, criticalRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d);
  assert.equal(d.critical, true);
  assert.equal(d.criticalMultiplier, 2.25);
});

test('Sniper: Neutralizing Gas suppresses Sniper (reverts multiplier to 1.5x)', () => {
  const kingdra = makeMon(230, 'Kingdra', 'sniper');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle(makeTeam(kingdra), makeTeam(weezing));

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, criticalRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(d);
  assert.equal(d.critical, true);
  assert.equal(d.criticalMultiplier, 1.5);
});

test('Sniper: preview evaluation incorporates 2.25x critical damage without mutation', () => {
  const kingdra = makeMon(230, 'Kingdra', 'sniper');
  const foe = makeMon(25, 'Pikachu', 'static');
  const slash = kingdra.moves[1];

  const preview = Ev.evaluateMove(slash, kingdra, foe, constants, {});
  assert.ok(preview);
  assert.equal(kingdra.ability, 'sniper');
});
