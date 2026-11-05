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
    types: ['bug', 'poison'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 405, name: 'bug-buzz', type: 'bug', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 },
      { id: 593, name: 'water-shuriken', type: 'water', power: 15, accuracy: 100, priority: 1, damageClass: 'special', pp: 20, maxPp: 20 },
      { id: 53, name: 'flamethrower', type: 'fire', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 }
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

test('Tinted Lens: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('tinted-lens');
  assert.ok(ab);
  assert.equal(ab.id, 'tinted-lens');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_MODIFY_DAMAGE'));
});

test('Tinted Lens: doubles damage on single-resisted move (0.5x effectiveness -> 2x)', () => {
  // Bug move against Fire type (0.5x resistance)
  const venomothLens = makeMon(49, 'Venomoth', 'tinted-lens', { specialAttack: 100 });
  const venomothShield = makeMon(49, 'Venomoth', 'shield-dust', { specialAttack: 100 });
  const arcanine = makeMon(59, 'Arcanine', 'intimidate', { types: ['fire'], maxHp: 300, currentHp: 300 });

  const s1 = E.createTeamBattle(makeTeam(venomothLens), makeTeam(arcanine));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 405, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgLens = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(venomothShield), makeTeam(arcanine));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 405, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgLens, dmgPlain * 2, 'Tinted Lens doubles resisted damage');
});

test('Tinted Lens: doubles damage on double-resisted move (0.25x effectiveness -> 2x)', () => {
  // Bug move against Fire/Flying type (0.25x double resistance)
  const venomothLens = makeMon(49, 'Venomoth', 'tinted-lens', { specialAttack: 100 });
  const venomothShield = makeMon(49, 'Venomoth', 'shield-dust', { specialAttack: 100 });
  const charizard = makeMon(6, 'Charizard', 'blaze', { types: ['fire', 'flying'], maxHp: 300, currentHp: 300 });

  const s1 = E.createTeamBattle(makeTeam(venomothLens), makeTeam(charizard));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 405, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgLens = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(venomothShield), makeTeam(charizard));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 405, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgLens, dmgPlain * 2, 'Tinted Lens doubles double-resisted damage');
});

test('Tinted Lens: does NOT boost neutral damage (1.0x effectiveness)', () => {
  // Normal Tackle against Normal type
  const venomothLens = makeMon(49, 'Venomoth', 'tinted-lens');
  const venomothShield = makeMon(49, 'Venomoth', 'shield-dust');
  const snorlax = makeMon(143, 'Snorlax', 'thick-fat', { types: ['normal'], maxHp: 400, currentHp: 400 });

  const s1 = E.createTeamBattle(makeTeam(venomothLens), makeTeam(snorlax));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgLens = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(venomothShield), makeTeam(snorlax));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgLens, dmgPlain, 'Neutral damage is NOT boosted');
});

test('Tinted Lens: does NOT boost super-effective damage (2.0x effectiveness)', () => {
  // Bug Buzz against Psychic type (Exeggutor)
  const venomothLens = makeMon(49, 'Venomoth', 'tinted-lens', { specialAttack: 100 });
  const venomothShield = makeMon(49, 'Venomoth', 'shield-dust', { specialAttack: 100 });
  const alakazam = makeMon(65, 'Alakazam', 'synchronize', { types: ['psychic'], maxHp: 300, currentHp: 300 });

  const s1 = E.createTeamBattle(makeTeam(venomothLens), makeTeam(alakazam));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 405, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgLens = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(venomothShield), makeTeam(alakazam));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 405, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPlain = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgLens, dmgPlain, 'Super-effective damage is NOT boosted');
});

test('Tinted Lens: does NOT bypass or boost elemental type immunity (0x remains 0 damage)', () => {
  // Normal Tackle against Ghost type (Gengar)
  const venomothLens = makeMon(49, 'Venomoth', 'tinted-lens');
  const gengar = makeMon(94, 'Gengar', 'cursed-body', { types: ['ghost', 'poison'] });

  const s = E.createTeamBattle(makeTeam(venomothLens), makeTeam(gengar));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgEv = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(dmgEv, 'DAMAGE_APPLIED event is emitted');
  assert.equal(dmgEv.damage, 0, 'Type immunity must deal exactly 0 damage');
  assert.equal(dmgEv.multiplier, 0, 'Multiplier remains 0');
});

test('Tinted Lens: multi-hit attacks with resisted effectiveness receive the 2.0x boost on each hit', () => {
  // Water Shuriken (water) against Dragonite (dragon/flying resists water)
  const venomothLens = makeMon(49, 'Venomoth', 'tinted-lens', { specialAttack: 100 });
  const venomothShield = makeMon(49, 'Venomoth', 'shield-dust', { specialAttack: 100 });
  const dragonite = makeMon(149, 'Dragonite', 'inner-focus', { types: ['dragon', 'flying'], maxHp: 300, currentHp: 300 });

  const s1 = E.createTeamBattle(makeTeam(venomothLens), makeTeam(dragonite));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 593, hitCountRoll: 2, hitDamageRolls: [100, 100], hitCriticalRolls: [24, 24] },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const hitsLens = r1.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');

  const s2 = E.createTeamBattle(makeTeam(venomothShield), makeTeam(dragonite));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 593, hitCountRoll: 2, hitDamageRolls: [100, 100], hitCriticalRolls: [24, 24] },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const hitsShield = r2.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');

  assert.ok(hitsLens.length >= 2);
  for (let i = 0; i < hitsLens.length; i++) {
    assert.equal(hitsLens[i].damage, hitsShield[i].damage * 2, `Hit ${i + 1} should be doubled by Tinted Lens`);
  }
});

test('Tinted Lens: Neutralizing Gas suppresses Tinted Lens (resisted attack deals unboosted damage)', () => {
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { types: ['poison', 'fire'] }); // Poison/Fire resists Bug (0.25x)
  const venomothLens = makeMon(49, 'Venomoth', 'tinted-lens', { specialAttack: 100 });
  const venomothShield = makeMon(49, 'Venomoth', 'shield-dust', { specialAttack: 100 });

  const s1 = E.createTeamBattle(makeTeam(weezing), makeTeam(venomothLens));
  const r1 = E.resolveTurn(s1, {
    enemy: { type: 'MOVE', moveId: 405, damageRoll: 100, criticalRoll: 24 },
    player: { type: 'MOVE', moveId: 33 }
  });
  const dmgLens = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'enemy').damage;

  const s2 = E.createTeamBattle(makeTeam(weezing), makeTeam(venomothShield));
  const r2 = E.resolveTurn(s2, {
    enemy: { type: 'MOVE', moveId: 405, damageRoll: 100, criticalRoll: 24 },
    player: { type: 'MOVE', moveId: 33 }
  });
  const dmgShield = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'enemy').damage;

  assert.equal(dmgLens, dmgShield, 'Under Gas, Tinted Lens is suppressed');
});
