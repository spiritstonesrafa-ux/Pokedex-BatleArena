const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');

const constants = { ...C, P7 };

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
    accuracyStage: 0,
    evasionStage: 0,
    types: ['ground', 'poison'],
    ability,
    heldItem: extra.heldItem || null,
    moves: [
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 189, name: 'mud-slap', type: 'ground', power: 20, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 89, name: 'earthquake', type: 'ground', power: 100, accuracy: 100, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 }
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

test('Sheer Force: registry metadata conforms to Gen IX SV', () => {
  const ab = Reg.getAbility('sheer-force');
  assert.ok(ab);
  assert.equal(ab.id, 'sheer-force');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.equal(ab.breakable, false);
  assert.ok(ab.triggers.includes('ON_BASE_POWER'));
  assert.ok(ab.triggers.includes('ON_MODIFY_MOVE'));
});

test('Sheer Force: correctly detects moves with and without secondary effects', () => {
  assert.equal(constants.hasSecondaryEffect({ id: 85, name: 'thunderbolt' }), true);
  assert.equal(constants.hasSecondaryEffect({ id: 189, name: 'mud-slap' }), true);
  assert.equal(constants.hasSecondaryEffect({ id: 33, name: 'tackle' }), false);
  assert.equal(constants.hasSecondaryEffect({ id: 89, name: 'earthquake' }), false);
});

test('Sheer Force: boosts base power of moves with secondary effects by ~1.3x (5325/4096)', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force');
  const enemy = makeMon(25, 'Pikachu', 'static');
  const tb = { id: 85, name: 'thunderbolt', type: 'electric', power: 90 };

  // 90 * 5325 / 4096 = 117.004 -> Math.floor = 117
  const boostedPower = Math.floor(P7.power(null, nidoking, enemy, tb, 90));
  assert.equal(boostedPower, 117);
});

test('Sheer Force: does not boost moves lacking secondary effects', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force');
  const enemy = makeMon(25, 'Pikachu', 'static');
  const eq = { id: 89, name: 'earthquake', type: 'ground', power: 100 };

  const normalPower = Math.floor(P7.power(null, nidoking, enemy, eq, 100));
  assert.equal(normalPower, 100);
});

test('Sheer Force: negates secondary status effects from occurring', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force');
  const enemy = makeMon(25, 'Pikachu', 'static');
  const state = E.createTeamBattle(makeTeam(nidoking), makeTeam(enemy));

  // Thunderbolt has 10% chance to paralyze. With secondaryEffectRoll = 1, it would normally paralyze.
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 85, secondaryEffectRoll: 1 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  assert.equal(r.state.enemy.team[0].statusCondition, null, 'Opponent must not be paralyzed');
  const statusEvent = r.events.find(e => e.type === 'STATUS_APPLIED');
  assert.equal(statusEvent, undefined, 'No STATUS_APPLIED event should be emitted');
});

test('Sheer Force: negates secondary stat drop on target', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force');
  const enemy = makeMon(25, 'Pikachu', 'static');
  const state = E.createTeamBattle(makeTeam(nidoking), makeTeam(enemy));

  // Mud-Slap 100% drops accuracy by 1
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 189, secondaryEffectRoll: 1 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  assert.equal(r.state.enemy.team[0].accuracyStage, 0, 'Opponent accuracy must remain 0');
  const statDrop = r.events.find(e => e.type === 'STAT_STAGE_CHANGED' && e.appliedDelta < 0);
  assert.equal(statDrop, undefined, 'No negative STAT_STAGE_CHANGED event should be emitted');
});

test('Sheer Force: cancels Life Orb recoil when using boosted secondary move', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force', { heldItem: 'life-orb', currentHp: 200, maxHp: 200 });
  const enemy = makeMon(25, 'Pikachu', 'static', { currentHp: 500, maxHp: 500 });
  const state = E.createTeamBattle(makeTeam(nidoking), makeTeam(enemy));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 85 }, // Thunderbolt is boosted
    enemy: { type: 'MOVE', moveId: 33 }
  });

  // Nidoking should take no Life Orb recoil damage from using Thunderbolt
  const recoilEv = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'player' && e.reason === 'LIFE_ORB');
  assert.equal(recoilEv, undefined, 'Life Orb recoil must be cancelled by Sheer Force');
});

test('Sheer Force: suppressed under Neutralizing Gas restores secondary effects and removes power boost', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force', { neutralizingGasSuppressed: true });
  const enemy = makeMon(25, 'Pikachu', 'static');
  const tb = { id: 85, name: 'thunderbolt', type: 'electric', power: 90 };

  const power = Math.floor(P7.power(null, nidoking, enemy, tb, 90));
  assert.equal(power, 90, 'Power boost must not apply when Sheer Force is suppressed');
});

test('Sheer Force: suppresses Color Change on defender when using boosted move', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force', { speed: 120 });
  const kecleon = makeMon(352, 'Kecleon', 'color-change', { types: ['normal'], currentHp: 500, maxHp: 500, speed: 80 });
  const state = E.createTeamBattle(makeTeam(nidoking), makeTeam(kecleon));

  // Thunderbolt is an electric move with a secondary effect -> boosted by Sheer Force
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 85 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  assert.deepEqual(r.state.enemy.team[0].types, ['normal'], 'Kecleon Color Change must NOT activate against Sheer Force move');
  const typeChange = r.events.find(e => e.type === 'TYPE_CHANGED' && e.label === 'color-change');
  assert.equal(typeChange, undefined);
});

test('Sheer Force: Color Change activates normally against move without secondary effects', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force', { speed: 120 });
  const kecleon = makeMon(352, 'Kecleon', 'color-change', { types: ['normal'], currentHp: 500, maxHp: 500, speed: 80 });
  const state = E.createTeamBattle(makeTeam(nidoking), makeTeam(kecleon));

  // Earthquake (id 89) is ground move without secondary effects -> not boosted by Sheer Force
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 89 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  assert.deepEqual(r.state.enemy.team[0].types, ['ground'], 'Kecleon Color Change must activate when hit by non-Sheer Force move');
});

test('Sheer Force: Berserk is canonically suppressed when damaged below 50% HP by Sheer Force move (Scenario A)', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force', { attack: 100, specialAttack: 100, speed: 120 });
  // Drampa starts at 120 HP, max 200. Half HP is 100. Taking ~75 damage drops it to ~45 HP (below 50%).
  const drampa = makeMon(780, 'Drampa', 'berserk', { currentHp: 120, maxHp: 200, specialDefense: 70, speed: 50, types: ['normal'] });
  const state = E.createTeamBattle(makeTeam(nidoking), makeTeam(drampa));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 85, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  assert.ok(r.state.enemy.team[0].currentHp <= 100 && r.state.enemy.team[0].currentHp > 0, 'Drampa should be below 50% HP');
  assert.equal(r.state.enemy.team[0].statStages.specialAttack, 0, 'Berserk MUST NOT trigger against Sheer Force boosted move');
  const berserkEvent = r.events.find(e => e.label === 'berserk');
  assert.equal(berserkEvent, undefined, 'No berserk ability event should be emitted');
});

test('Sheer Force: Berserk activates normally when damaged below 50% HP by move without secondary effects (Scenario B)', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force', { attack: 100, specialAttack: 100, speed: 120 });
  const drampa = makeMon(780, 'Drampa', 'berserk', { currentHp: 200, maxHp: 300, defense: 70, speed: 50, types: ['electric'] });
  const state = E.createTeamBattle(makeTeam(nidoking), makeTeam(drampa));

  // Earthquake (id 89) has no secondary effect -> not boosted by Sheer Force -> Berserk activates
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 89, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  assert.ok(r.state.enemy.team[0].currentHp <= 150 && r.state.enemy.team[0].currentHp > 0, 'Drampa should be below 50% HP');
  assert.equal(r.state.enemy.team[0].statStages.specialAttack, 1, 'Berserk MUST trigger against non-Sheer Force move');
  const berserkEvent = r.events.find(e => e.label === 'berserk');
  assert.ok(berserkEvent, 'Berserk ability event should be emitted');
});

test('Sheer Force: Berserk activates normally when Sheer Force is suppressed (Scenario C)', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force', { attack: 100, specialAttack: 100, speed: 120, abilitySuppressed: true });
  const drampa = makeMon(780, 'Drampa', 'berserk', { currentHp: 120, maxHp: 200, specialDefense: 70, speed: 50, types: ['normal'] });
  const state = E.createTeamBattle(makeTeam(nidoking), makeTeam(drampa));
  state.player.team[0].abilitySuppressed = true;

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 85, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  assert.ok(r.state.enemy.team[0].currentHp <= 100 && r.state.enemy.team[0].currentHp > 0, 'Drampa should be below 50% HP');
  assert.equal(r.state.enemy.team[0].statStages.specialAttack, 1, 'Berserk MUST trigger when Sheer Force is suppressed');
});

test('Sheer Force: Anger Shell is canonically suppressed when damaged below 50% HP by Sheer Force move (Scenario A)', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force', { attack: 100, specialAttack: 100, speed: 120 });
  const klawf = makeMon(950, 'Klawf', 'anger-shell', { currentHp: 120, maxHp: 200, specialDefense: 70, speed: 50, types: ['normal'] });
  const state = E.createTeamBattle(makeTeam(nidoking), makeTeam(klawf));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 85, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  assert.ok(r.state.enemy.team[0].currentHp <= 100 && r.state.enemy.team[0].currentHp > 0, 'Klawf should be below 50% HP');
  assert.equal(r.state.enemy.team[0].statStages.attack, 0, 'Anger Shell MUST NOT boost Attack against Sheer Force move');
  assert.equal(r.state.enemy.team[0].statStages.defense, 0, 'Anger Shell MUST NOT lower Defense against Sheer Force move');
  const angerEvent = r.events.find(e => e.label === 'anger-shell');
  assert.equal(angerEvent, undefined, 'No anger-shell ability event should be emitted');
});

test('Sheer Force: Anger Shell activates normally when damaged below 50% HP by move without secondary effects (Scenario B)', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force', { attack: 100, specialAttack: 100, speed: 120 });
  const klawf = makeMon(950, 'Klawf', 'anger-shell', { currentHp: 200, maxHp: 300, defense: 70, speed: 50, types: ['electric'] });
  const state = E.createTeamBattle(makeTeam(nidoking), makeTeam(klawf));

  // Earthquake (id 89) has no secondary effect -> Anger Shell activates
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 89, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  assert.ok(r.state.enemy.team[0].currentHp <= 150 && r.state.enemy.team[0].currentHp > 0, 'Klawf should be below 50% HP');
  assert.equal(r.state.enemy.team[0].statStages.attack, 1, 'Anger Shell MUST boost Attack against non-Sheer Force move');
  assert.equal(r.state.enemy.team[0].statStages.defense, -1, 'Anger Shell MUST lower Defense against non-Sheer Force move');
  const angerEvent = r.events.find(e => e.label === 'anger-shell');
  assert.ok(angerEvent, 'Anger Shell ability event should be emitted');
});

test('Sheer Force: Anger Shell activates normally when Sheer Force is suppressed (Scenario C)', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force', { attack: 100, specialAttack: 100, speed: 120, abilitySuppressed: true });
  const klawf = makeMon(950, 'Klawf', 'anger-shell', { currentHp: 120, maxHp: 200, specialDefense: 70, speed: 50, types: ['normal'] });
  const state = E.createTeamBattle(makeTeam(nidoking), makeTeam(klawf));
  state.player.team[0].abilitySuppressed = true;

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 85, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  assert.ok(r.state.enemy.team[0].currentHp <= 100 && r.state.enemy.team[0].currentHp > 0, 'Klawf should be below 50% HP');
  assert.equal(r.state.enemy.team[0].statStages.attack, 1, 'Anger Shell MUST trigger when Sheer Force is suppressed');
});

test('Sheer Force: primary recoil moves (Double-Edge) are not boosted and user takes recoil', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force', {
    moves: [{ id: 38, name: 'double-edge', type: 'normal', power: 120, accuracy: 100, priority: 0, damageClass: 'physical', pp: 15, maxPp: 15 }],
    currentHp: 200, maxHp: 200, speed: 120
  });
  const enemy = makeMon(25, 'Pikachu', 'static', { currentHp: 500, maxHp: 500, speed: 50 });
  const state = E.createTeamBattle(makeTeam(nidoking), makeTeam(enemy));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 38 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const recoilEv = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.target === 'player');
  assert.ok(recoilEv, 'Double-Edge primary recoil must be applied');
  assert.ok(r.state.player.team[0].currentHp < 200, 'Nidoking must lose HP from primary recoil');
});

test('Sheer Force: primary self stat drops (Close Combat) are not boosted and user takes stat drop', () => {
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force', {
    moves: [{ id: 370, name: 'close-combat', type: 'fighting', power: 120, accuracy: 100, priority: 0, damageClass: 'physical', pp: 5, maxPp: 5 }],
    speed: 120
  });
  const enemy = makeMon(25, 'Pikachu', 'static', { currentHp: 500, maxHp: 500, speed: 50 });
  const state = E.createTeamBattle(makeTeam(nidoking), makeTeam(enemy));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 370 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  assert.equal(r.state.player.team[0].statStages.defense, -1, 'Close Combat defense drop must apply');
  assert.equal(r.state.player.team[0].statStages.specialDefense, -1, 'Close Combat special defense drop must apply');
});

test('Sheer Force: AI Evaluator incorporates 1.3x boost on moves with secondary effects', () => {
  const V = require('../../assets/js/battle/battle-evaluator');
  const nidoking = makeMon(34, 'Nidoking', 'sheer-force', {
    moves: [
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, damageClass: 'special', pp: 15 },
      { id: 89, name: 'earthquake', type: 'ground', power: 100, accuracy: 100, damageClass: 'physical', pp: 10 }
    ]
  });
  const enemy = makeMon(25, 'Pikachu', 'static', { types: ['flying'] }); // Flying is neutral to electric and immune to ground

  const normalNidoking = makeMon(34, 'Nidoking', 'poison-point', {
    moves: [
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, damageClass: 'special', pp: 15 }
    ]
  });

  const evalSheer = V.evaluateMove(nidoking, enemy, nidoking.moves[0], { battleState: null });
  const evalNormal = V.evaluateMove(normalNidoking, enemy, normalNidoking.moves[0], { battleState: null });

  // Thunderbolt with Sheer Force must produce higher expected damage (~1.3x) than normal
  assert.ok(evalSheer.expectedDamage > evalNormal.expectedDamage, 'Sheer Force must increase AI expected damage');
  assert.equal(Math.round(evalSheer.expectedDamage / evalNormal.expectedDamage * 100) / 100, 1.3);
  assert.equal(evalSheer.isEligibleForSecondary, false, 'Sheer Force must negate isEligibleForSecondary in AI');
  assert.equal(evalSheer.expectedStatusBenefit, 0, 'Sheer Force must set expectedStatusBenefit to 0 in AI');
  assert.equal(evalSheer.secondaryEffect, null, 'Sheer Force must nullify secondaryEffect in AI');
});
