const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const P8 = require('../../assets/js/battle/p8-special');

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
    accuracyStage: 0,
    evasionStage: 0,
    types: ['water', 'electric'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 189, name: 'mud-slap', type: 'ground', power: 20, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 },
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 59, name: 'blizzard', type: 'ice', power: 110, accuracy: 70, priority: 0, damageClass: 'special', pp: 5, maxPp: 5 }
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

test('Illuminate: registry metadata conforms to Gen IX SV', () => {
  const ab = Reg.getAbility('illuminate');
  assert.ok(ab);
  assert.equal(ab.id, 'illuminate');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.equal(ab.breakable, true);
  assert.ok(ab.triggers.includes('ON_TRY_BOOST'));
  assert.ok(ab.triggers.includes('ON_MODIFY_MOVE'));
});

test('Illuminate: blocks accuracy drops from opponent Mud-Slap', () => {
  const starmie = makeMon(121, 'Starmie', 'illuminate', { currentHp: 200, maxHp: 200 });
  const enemy = makeMon(25, 'Pikachu', 'static');
  const state = E.createTeamBattle(makeTeam(starmie), makeTeam(enemy));

  // Enemy uses Mud-Slap (moveId 189, 100% chance to reduce accuracy by 1)
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 85 },
    enemy: { type: 'MOVE', moveId: 189, secondaryEffectRoll: 1 }
  });

  // Starmie's accuracy must remain 0
  assert.equal(r.state.player.team[0].accuracyStage, 0);
  const blockEv = r.events.find(e => e.type === 'MOVE_PREPARED' && e.reason === 'P7_ABILITY' && e.label === 'illuminate');
  assert.ok(blockEv, 'Expected MOVE_PREPARED event for Illuminate');
});

test('Illuminate: ignores defender positive evasion stages when attacking', () => {
  const lanturn = makeMon(171, 'Lanturn', 'illuminate');
  const enemy = makeMon(109, 'Koffing', 'levitate', { evasionStage: 3 });

  // Normal 100% accuracy move against +3 evasion:
  // Without Illuminate: 100 * (3 / (3 + 3)) = 50% effective accuracy.
  // With Illuminate: evasion is ignored, effective accuracy is 100%.
  const effAcc = constants.getEffectiveAccuracy({ id: 85, name: 'thunderbolt', accuracy: 100 }, lanturn, enemy);
  assert.equal(effAcc, 100);
});

test('Illuminate: unconditionally ignores evasion stages of target (-6 to +6) consistent with Keen Eye', () => {
  const lanturn = makeMon(171, 'Lanturn', 'illuminate');
  const enemy = makeMon(109, 'Koffing', 'levitate', { evasionStage: -2 });

  // Move with 70% accuracy against -2 evasion:
  // Under Showdown Gen IX move.ignoreEvasion = true, evasion is treated as 0, yielding base 70 accuracy.
  const effAcc = constants.getEffectiveAccuracy({ id: 59, name: 'blizzard', accuracy: 70 }, lanturn, enemy);
  assert.equal(effAcc, 70);
});

test('Illuminate: does not convert naturally inaccurate moves into guaranteed hits', () => {
  const lanturn = makeMon(171, 'Lanturn', 'illuminate');
  const enemy = makeMon(109, 'Koffing', 'levitate', { evasionStage: 0 });

  // Blizzard is 70 accuracy. With 0 evasion on defender, effective accuracy is 70.
  const effAcc = constants.getEffectiveAccuracy({ id: 59, name: 'blizzard', accuracy: 70 }, lanturn, enemy);
  assert.equal(effAcc, 70);

  // An accuracyRoll of 75 should miss
  const state = E.createTeamBattle(makeTeam(lanturn), makeTeam(enemy));
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 59, accuracyRoll: 75 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const missEv = r.events.find(e => e.type === 'MOVE_MISSED' && e.actor === 'player');
  assert.ok(missEv, 'Blizzard should miss on roll 75');
});

test('Illuminate: suppressed by Neutralizing Gas allows accuracy reduction and restores evasion', () => {
  const starmie = makeMon(121, 'Starmie', 'illuminate', { currentHp: 200, maxHp: 200 });
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { evasionStage: 2 });
  const state = E.createTeamBattle(makeTeam(starmie), makeTeam(weezing));

  // With Gas active, enemy Mud-Slap drops Starmie's accuracy
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 85 },
    enemy: { type: 'MOVE', moveId: 189, secondaryEffectRoll: 1 }
  });

  assert.equal(r.state.player.team[0].accuracyStage, -1, 'Accuracy should drop to -1 under Neutralizing Gas');

  // Also, positive evasion of Weezing is NOT ignored while Gas is active
  const effAcc = constants.getEffectiveAccuracy({ id: 85, name: 'thunderbolt', accuracy: 100 }, r.state.player.team[0], r.state.enemy.team[0]);
  // Starmie has -1 acc, Weezing has +2 evasion -> total stage = -1 - 2 = -3 -> 100 * (3 / (3 - (-3))) = 50%
  assert.equal(effAcc, 50);
});

test('Illuminate: Mold Breaker attacker bypasses Illuminate accuracy protection', () => {
  const starmie = makeMon(121, 'Starmie', 'illuminate', { currentHp: 200, maxHp: 200 });
  const pinsir = makeMon(127, 'Pinsir', 'mold-breaker');
  const state = E.createTeamBattle(makeTeam(starmie), makeTeam(pinsir));

  // Pinsir uses Mud-Slap; Mold Breaker breaks Illuminate's accuracy block
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 85 },
    enemy: { type: 'MOVE', moveId: 189, secondaryEffectRoll: 1 }
  });

  assert.equal(r.state.player.team[0].accuracyStage, -1, 'Mold Breaker should bypass Illuminate accuracy block');
});

test('Illuminate: own accuracy stage drops from own move or self are not blocked', () => {
  const starmie = makeMon(121, 'Starmie', 'illuminate');
  // Applying self stat change directly
  const res = constants.applyStatStageChange(starmie, 'accuracy', -1);
  assert.equal(res.finalStage, -1, 'Self accuracy drops must not be blocked');
});
