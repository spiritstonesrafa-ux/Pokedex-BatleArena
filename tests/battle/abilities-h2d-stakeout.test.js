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
  const hp = extra.maxHp || extra.hp || extra.currentHp || 250;
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
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 }
    ],
    ...extra
  };
}

function makeTeam(lead, m2 = null, m3 = null) {
  return [
    lead,
    m2 || makeMon(901, 'ReserveA', 'soundproof'),
    m3 || makeMon(902, 'ReserveB', 'soundproof')
  ];
}

test('Stakeout: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('stakeout');
  assert.ok(ab);
  assert.equal(ab.id, 'stakeout');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_STAT_MODIFY'));
  assert.ok(ab.triggers.includes('ON_MODIFY_ATK'));
  assert.ok(ab.triggers.includes('ON_MODIFY_SPA'));
});

test('Stakeout: doubles offensive Attack stat (2.0x) in P7.stat when target switched in this turn', () => {
  const gumshoos = makeMon(735, 'Gumshoos', 'stakeout', { attack: 100 });
  const target = makeMon(25, 'Pikachu', 'static', { switchedInThisTurn: true });
  const move = gumshoos.moves[0];

  const statMult = P7.stat(gumshoos, 'attack', move, target);
  assert.equal(statMult, 2, 'P7.stat deve dobrar Attack contra switch-in');

  const effStat = constants.getEffectiveStat(gumshoos, 'attack', move, target);
  assert.equal(effStat, 200, 'Effective attack deve ser 100 * 2 = 200');
});

test('Stakeout: doubles offensive Special Attack stat (2.0x) in P7.stat for special moves', () => {
  const gumshoos = makeMon(735, 'Gumshoos', 'stakeout', { specialAttack: 80 });
  const target = makeMon(25, 'Pikachu', 'static', { switchedInThisTurn: true });
  const move = gumshoos.moves[2]; // thunderbolt

  const statMult = P7.stat(gumshoos, 'specialAttack', move, target);
  assert.equal(statMult, 2, 'P7.stat deve dobrar SpA contra switch-in');

  const effStat = constants.getEffectiveStat(gumshoos, 'specialAttack', move, target);
  assert.equal(effStat, 160, 'Effective specialAttack deve ser 80 * 2 = 160');
});

test('Stakeout: does NOT boost offensive stats when target did NOT switch in this turn', () => {
  const gumshoos = makeMon(735, 'Gumshoos', 'stakeout', { attack: 100 });
  const target = makeMon(25, 'Pikachu', 'static', { switchedInThisTurn: false });
  const move = gumshoos.moves[0];

  const statMult = P7.stat(gumshoos, 'attack', move, target);
  assert.equal(statMult, 1, 'P7.stat deve ser neutro (1.0x) se o alvo não trocou');
  assert.equal(constants.getEffectiveStat(gumshoos, 'attack', move, target), 100);
});

test('Stakeout: deals double damage in full turn when opponent performs a voluntary SWITCH', () => {
  const gumshoos = makeMon(735, 'Gumshoos', 'stakeout', { attack: 110 });
  const enemyLead = makeMon(25, 'Pikachu', 'static', { speed: 120 });
  const enemyReserve = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, maxHp: 300, currentHp: 300 });

  const s = E.createTeamBattle(makeTeam(gumshoos), makeTeam(enemyLead, enemyReserve));

  // Enemy switches to reserve; Gumshoos attacks
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'SWITCH', targetIndex: 1 }
  });

  const dmgApplied = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');
  assert.ok(dmgApplied);

  // Compare with neutral ability attacking the switch-in
  const normalUser = makeMon(735, 'Gumshoos', 'soundproof', { attack: 110 });
  const enemyLead2 = makeMon(25, 'Pikachu', 'static', { speed: 120 });
  const enemyReserve2 = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, maxHp: 300, currentHp: 300 });
  const sNormal = E.createTeamBattle(makeTeam(normalUser), makeTeam(enemyLead2, enemyReserve2));
  const rNormal = E.resolveTurn(sNormal, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'SWITCH', targetIndex: 1 }
  });
  const dmgNormal = rNormal.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');

  assert.ok(dmgApplied.damage >= dmgNormal.damage * 1.8, `Stakeout (${dmgApplied.damage}) deve ser aprox o dobro de Normal (${dmgNormal.damage})`);
});

test('Stakeout: mathematical formula difference between doubling offensive stat vs doubling final damage', () => {
  // Canonic Gen IX formula: Damage = floor(floor((floor(2 * L / 5 + 2) * Power * Attack) / Defense) / 50) + 2
  // With Level 50, Power 40, Attack 20, Defense 200, roll 100, off-type (no STAB):
  // Base term: floor(2 * 50 / 5 + 2) = 22
  // Unboosted: floor(floor((22 * 40 * 20) / 200) / 50) + 2 = floor(88 / 50) + 2 = 1 + 2 = 3
  // If final damage was doubled: 3 * 2 = 6
  // But with canonical Stakeout (doubling Attack = 40):
  // floor(floor((22 * 40 * 40) / 200) / 50) + 2 = floor(176 / 50) + 2 = 3 + 2 = 5!
  const user = makeMon(735, 'Gumshoos', 'stakeout', { attack: 20, types: ['water'] });
  const enemyLead = makeMon(25, 'Pikachu', 'static', { speed: 120 });
  const enemyReserve = makeMon(213, 'Shuckle', 'soundproof', { defense: 200, stats: { defense: 200 }, maxHp: 300, currentHp: 300 });

  const s = E.createTeamBattle(makeTeam(user), makeTeam(enemyLead, enemyReserve));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100 }, // Tackle power 40
    enemy: { type: 'SWITCH', targetIndex: 1 }
  });

  const dmg = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage;
  // Confirms it equals 5 (canonical Attack doubling), not 6 (incorrect final damage doubling)
  assert.equal(dmg, 5, `Dano deve ser exatamente 5 (duplicação de Attack), não 6 (duplicação de dano final)`);
});

test('Stakeout: Neutralizing Gas suppresses Stakeout Attack doubling', () => {
  const gumshoos = makeMon(735, 'Gumshoos', 'stakeout');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { switchedInThisTurn: true });

  const s = E.createTeamBattle(makeTeam(gumshoos), makeTeam(weezing));
  P7.sync(s);

  const move = gumshoos.moves[0];
  const statMult = P7.stat(s.player.team[0], 'attack', move, s.enemy.team[0]);
  assert.equal(statMult, 1, 'Neutralizing Gas deve suprimir Stakeout');
});

test('Stakeout: Battle Evaluator incorporates Stakeout offensive boost against switch-in', () => {
  const gumshoos = makeMon(735, 'Gumshoos', 'stakeout', { attack: 100 });
  const switchTarget = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, switchedInThisTurn: true });
  const stayingTarget = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, switchedInThisTurn: false });
  const move = gumshoos.moves[0];

  const evalSwitch = Ev.evaluateMove(gumshoos, switchTarget, move, { constants });
  const evalStaying = Ev.evaluateMove(gumshoos, stayingTarget, move, { constants });

  assert.ok(evalSwitch.expectedDamage > evalStaying.expectedDamage * 1.8, 'Expected damage deve incorporar dobro de ataque');
});

test('Stakeout: does NOT boost against replacement sent out between turns after a faint', () => {
  const gumshoos = makeMon(735, 'Gumshoos', 'stakeout', { attack: 110, speed: 50 });
  const enemyFainting = makeMon(25, 'Pikachu', 'static', { maxHp: 50, currentHp: 1, speed: 120 });
  const enemyReplacement = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, maxHp: 300, currentHp: 300, speed: 120 });

  const s = E.createTeamBattle(makeTeam(gumshoos), makeTeam(enemyFainting, enemyReplacement));

  // Turn 1: Gumshoos KO's Pikachu with Slash
  const r1 = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });
  assert.equal(r1.state.status, 'AWAITING_REPLACEMENT');

  // Turn 1.5: Enemy replaces Pikachu with Voltorb using resolveReplacement between turns
  const rRep = E.resolveReplacement(r1.state, {
    enemy: { targetPokemonId: 100 }
  });

  // Voltorb was sent out between turns; it did NOT switch in on Turn 2
  assert.equal(rRep.state.enemy.team[1].switchedInThisTurn, false, 'Substituição após desmaio entre turnos NÃO deve ser marcada como switchedInThisTurn para o próximo turno');

  // Turn 2: Gumshoos attacks Voltorb -> Stakeout does NOT activate!
  const r2 = E.resolveTurn(rRep.state, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const dmg = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage;

  // Compare with neutral ability Gumshoos under exact same conditions
  const normalUser = makeMon(735, 'Gumshoos', 'soundproof', { attack: 110, speed: 50 });
  const sNorm = E.createTeamBattle(makeTeam(normalUser), makeTeam(makeMon(25, 'Pikachu', 'static', { maxHp: 50, currentHp: 1 }), enemyReplacement));
  const rNorm1 = E.resolveTurn(sNorm, { player: { type: 'MOVE', moveId: 163, damageRoll: 100 }, enemy: { type: 'MOVE', moveId: 33 } });
  const rNormRep = E.resolveReplacement(rNorm1.state, { enemy: { targetPokemonId: 100 } });
  const rNorm2 = E.resolveTurn(rNormRep.state, { player: { type: 'MOVE', moveId: 163, damageRoll: 100 }, enemy: { type: 'MOVE', moveId: 33 } });
  const dmgNorm = rNorm2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage;

  assert.equal(dmg, dmgNorm, `Stakeout NÃO deve ativar contra substituto pós-desmaio entre turnos (dano ${dmg} === ${dmgNorm})`);
});

test('Stakeout: doubles damage against voluntary switch on same turn, but does NOT boost on subsequent turn', () => {
  const gumshoos = makeMon(735, 'Gumshoos', 'stakeout', { attack: 110, speed: 50 });
  const normalGumshoos = makeMon(735, 'Gumshoos', 'soundproof', { attack: 110, speed: 50 });
  const enemyLead = makeMon(25, 'Pikachu', 'static', { speed: 120 });
  const enemyReserve = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, maxHp: 400, currentHp: 400, speed: 120 });

  const sWith = E.createTeamBattle(makeTeam(gumshoos), makeTeam(enemyLead, enemyReserve));
  const sNorm = E.createTeamBattle(makeTeam(normalGumshoos), makeTeam(enemyLead, enemyReserve));

  // Turn 1: Enemy switches voluntarily to Voltorb. Gumshoos attacks in same turn -> Stakeout boosts!
  const rWith1 = E.resolveTurn(sWith, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'SWITCH', targetIndex: 1 }
  });
  const rNorm1 = E.resolveTurn(sNorm, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'SWITCH', targetIndex: 1 }
  });

  const dmgWith1 = rWith1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;
  const dmgNorm1 = rNorm1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;
  assert.ok(dmgWith1 >= dmgNorm1 * 1.8, `Turno 1: Stakeout deve dobrar o dano contra troca voluntária no mesmo turno (${dmgWith1} vs ${dmgNorm1})`);

  // Turn 2: Voltorb stays in battle. Gumshoos attacks again -> Stakeout does NOT boost!
  const rWith2 = E.resolveTurn(rWith1.state, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });
  const rNorm2 = E.resolveTurn(rNorm1.state, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const dmgWith2 = rWith2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;
  const dmgNorm2 = rNorm2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;
  assert.equal(dmgWith2, dmgNorm2, `Turno 2: Stakeout NÃO deve ativar no turno subsequente à troca (${dmgWith2} === ${dmgNorm2})`);
});

test('Stakeout: does NOT boost against enemy lead at battle start (Turn 1)', () => {
  const gumshoos = makeMon(735, 'Gumshoos', 'stakeout', { attack: 110 });
  const normalUser = makeMon(735, 'Gumshoos', 'soundproof', { attack: 110 });
  const enemy = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, maxHp: 300, currentHp: 300 });

  const sWith = E.createTeamBattle(makeTeam(gumshoos), makeTeam(enemy));
  const sNorm = E.createTeamBattle(makeTeam(normalUser), makeTeam(enemy));

  const rWith = E.resolveTurn(sWith, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });
  const rNorm = E.resolveTurn(sNorm, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const dmgWith = rWith.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;
  const dmgNorm = rNorm.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;

  assert.equal(dmgWith, dmgNorm, `No turno 1 contra o lead, Stakeout não deve aplicar bônus (${dmgWith} === ${dmgNorm})`);
});
