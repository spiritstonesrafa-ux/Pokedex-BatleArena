const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const P8 = require('../../assets/js/battle/p8-special');
const Critical = require('../../assets/js/battle/critical-mechanics');
const Evaluator = require('../../assets/js/battle/battle-evaluator');

const constants = { ...C, P7, P8, Critical };

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
    types: ['normal', 'flying'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 157, name: 'rock-slide', type: 'rock', power: 75, accuracy: 90, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 },
      { id: 41, name: 'twineedle', type: 'bug', power: 25, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 }
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

test('Serene Grace: registry metadata conforms to Gen IX SV', () => {
  const ab = Reg.getAbility('serene-grace');
  assert.ok(ab);
  assert.equal(ab.id, 'serene-grace');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.breakable, false);
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_MODIFY_MOVE'));
});

test('Serene Grace: doubles 10% secondary status chance to 20% (Thunderbolt paralysis)', () => {
  const togekiss = makeMon(468, 'Togekiss', 'serene-grace');
  const normalMon = makeMon(25, 'Pikachu', 'static');
  const thunderbolt = { id: 85, name: 'thunderbolt' };

  // 1. Without Serene Grace: 10% chance
  const secNormal = P7.secondary({}, thunderbolt, C.getSecondaryEffect(thunderbolt), normalMon);
  assert.equal(secNormal.chance, 10, 'Standard Thunderbolt secondary chance is 10%');

  // 2. With Serene Grace: doubled to 20%
  const secGrace = P7.secondary({}, thunderbolt, C.getSecondaryEffect(thunderbolt), togekiss);
  assert.equal(secGrace.chance, 20, 'Serene Grace must double Thunderbolt secondary chance to 20%');

  // 3. Deterministic Battle Engine check: roll 20 applies paralysis, roll 21 does not
  const defender1 = makeMon(131, 'Lapras', 'water-absorb');
  const battle1 = E.createTeamBattle(makeTeam(togekiss), makeTeam(defender1));
  const res1 = E.resolveTurn(battle1, {
    player: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 20 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(res1.state.enemy.team[0].statusCondition, 'paralysis', 'Roll 20 must apply paralysis under Serene Grace');

  const defender2 = makeMon(131, 'Lapras', 'water-absorb');
  const battle2 = E.createTeamBattle(makeTeam(togekiss), makeTeam(defender2));
  const res2 = E.resolveTurn(battle2, {
    player: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 21 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(res2.state.enemy.team[0].statusCondition, null, 'Roll 21 must NOT apply paralysis under Serene Grace');
});

test('Serene Grace: doubles 30% secondary flinch chance to 60% (Rock Slide)', () => {
  const jirachi = makeMon(385, 'Jirachi', 'serene-grace', { speed: 120 });
  const rockSlide = { id: 157, name: 'rock-slide' };

  // 1. Definition check
  const sec = P7.secondary({}, rockSlide, C.getSecondaryEffect(rockSlide), jirachi);
  assert.equal(sec.chance, 60, 'Serene Grace must double Rock Slide flinch chance to 60%');

  // 2. Deterministic Battle check: roll 60 flinches, roll 61 does not
  const defender1 = makeMon(131, 'Lapras', 'water-absorb', { speed: 80 });
  const battle1 = E.createTeamBattle(makeTeam(jirachi), makeTeam(defender1));
  const res1 = E.resolveTurn(battle1, {
    player: { type: 'MOVE', moveId: 157, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 60 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const flinchEvent1 = res1.events.find(ev => ev.type === 'FLINCH_APPLIED');
  assert.ok(flinchEvent1, 'Roll 60 must cause flinch under Serene Grace');

  const defender2 = makeMon(131, 'Lapras', 'water-absorb', { speed: 80 });
  const battle2 = E.createTeamBattle(makeTeam(jirachi), makeTeam(defender2));
  const res2 = E.resolveTurn(battle2, {
    player: { type: 'MOVE', moveId: 157, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 61 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const flinchEvent2 = res2.events.find(ev => ev.type === 'FLINCH_APPLIED');
  assert.equal(flinchEvent2, undefined, 'Roll 61 must NOT cause flinch');
});

test('Serene Grace: doubles 20% secondary flinch chance to 40% (Dark Pulse)', () => {
  const togekiss = makeMon(468, 'Togekiss', 'serene-grace', {
    speed: 120,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 399, name: 'dark-pulse', type: 'dark', power: 80, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 }
    ]
  });
  const darkPulse = { id: 399, name: 'dark-pulse' };

  const sec = P7.secondary({}, darkPulse, C.getSecondaryEffect(darkPulse), togekiss);
  assert.equal(sec.chance, 40, 'Serene Grace must double Dark Pulse flinch chance from 20% to 40%');

  const defender = makeMon(131, 'Lapras', 'water-absorb', { speed: 80 });
  const battle = E.createTeamBattle(makeTeam(togekiss), makeTeam(defender));
  const res = E.resolveTurn(battle, {
    player: { type: 'MOVE', moveId: 399, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 40 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.ok(res.events.some(ev => ev.type === 'FLINCH_APPLIED'), 'Roll 40 must flinch with 40% chance');
});

test('Serene Grace: 100% secondary chance moves stay capped at 100%', () => {
  const chansey = makeMon(113, 'Chansey', 'serene-grace');
  const luminaCrash = { id: 855, name: 'lumina-crash' };

  const sec = P7.secondary({}, luminaCrash, C.getSecondaryEffect(luminaCrash), chansey);
  assert.equal(sec.chance, 100, 'Secondary chance must not exceed 100%');
});

test('Serene Grace: does NOT modify primary status moves (no secondary effect to double)', () => {
  const blissey = makeMon(242, 'Blissey', 'serene-grace');
  const thunderWave = { id: 86, name: 'thunder-wave', damageClass: 'status' };

  const sec = P7.secondary({}, thunderWave, C.getSecondaryEffect(thunderWave), blissey);
  assert.equal(sec, null, 'Primary status moves do not have secondary effects');
});

test('Serene Grace: does NOT modify critical hit probability', () => {
  const togekiss = makeMon(468, 'Togekiss', 'serene-grace');
  const defender = makeMon(131, 'Lapras', 'water-absorb');
  const regularMove = { id: 85, name: 'thunderbolt', power: 90, damageClass: 'special' };

  const critChance = Critical.chance(regularMove, constants, togekiss, defender);
  assert.equal(critChance, 1 / 24, 'Base critical hit chance must remain 1/24 under Serene Grace');
});

test('Serene Grace: does NOT modify move accuracy', () => {
  const togekiss = makeMon(468, 'Togekiss', 'serene-grace');
  const defender = makeMon(131, 'Lapras', 'water-absorb');
  const blizzard = { id: 59, name: 'blizzard', accuracy: 70 };

  const effAcc = constants.getEffectiveAccuracy(blizzard, togekiss, defender);
  assert.equal(effAcc, 70, 'Move accuracy must remain 70% under Serene Grace');
});

test('Serene Grace: doubles Twineedle (multi-hit move 41) poison chance from 20% to 40%', () => {
  const togekiss = makeMon(468, 'Togekiss', 'serene-grace');
  const defender1 = makeMon(131, 'Lapras', 'water-absorb');
  const battle1 = E.createTeamBattle(makeTeam(togekiss), makeTeam(defender1));

  // Roll 40 triggers poison under Serene Grace
  const res1 = E.resolveTurn(battle1, {
    player: { type: 'MOVE', moveId: 41, accuracyRoll: 1, damageRoll: 100, hitSecondaryEffectRolls: [40, 40] },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(res1.state.enemy.team[0].statusCondition, 'poison', 'Roll 40 must poison on Twineedle with Serene Grace');

  // Roll 41 fails
  const defender2 = makeMon(131, 'Lapras', 'water-absorb');
  const battle2 = E.createTeamBattle(makeTeam(togekiss), makeTeam(defender2));
  const res2 = E.resolveTurn(battle2, {
    player: { type: 'MOVE', moveId: 41, accuracyRoll: 1, damageRoll: 100, hitSecondaryEffectRolls: [41, 41] },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(res2.state.enemy.team[0].statusCondition, null, 'Roll 41 must NOT poison on Twineedle');
});

test('Serene Grace: Sheer Force removes secondary effects completely (canonical interaction)', () => {
  const sheerMon = makeMon(34, 'Nidoking', 'sheer-force', {
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 }
    ]
  });
  const defender = makeMon(131, 'Lapras', 'water-absorb');
  const battle = E.createTeamBattle(makeTeam(sheerMon), makeTeam(defender));

  const res = E.resolveTurn(battle, {
    player: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 1 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(res.state.enemy.team[0].statusCondition, null, 'Sheer Force must strip secondary effect even with roll 1');
  assert.equal(res.events.some(e => e.type === 'STATUS_APPLIED'), false, 'No status event must be emitted');
});

test('Serene Grace: suppressed under Neutralizing Gas reverts secondary chance to standard', () => {
  const suppressedGrace = makeMon(468, 'Togekiss', 'serene-grace', { neutralizingGasSuppressed: true });
  const thunderbolt = { id: 85, name: 'thunderbolt' };

  const sec = P7.secondary({}, thunderbolt, C.getSecondaryEffect(thunderbolt), suppressedGrace);
  assert.equal(sec.chance, 10, 'Secondary chance must revert to 10% when Serene Grace is suppressed');
});

test('Serene Grace: AI evaluator calculates higher expected status benefit with Serene Grace', () => {
  const togekissGrace = makeMon(468, 'Togekiss', 'serene-grace');
  const togekissNoGrace = makeMon(468, 'Togekiss', 'hustle');
  const defender = makeMon(131, 'Lapras', 'water-absorb');
  const thunderbolt = togekissGrace.moves[1]; // move 85: thunderbolt

  const evalGrace = Evaluator.evaluateMove(togekissGrace, defender, thunderbolt, {
    battleState: { player: { team: [togekissGrace] }, enemy: { team: [defender] } },
    attackerSide: 'player',
    constants
  });

  const evalNoGrace = Evaluator.evaluateMove(togekissNoGrace, defender, thunderbolt, {
    battleState: { player: { team: [togekissNoGrace] }, enemy: { team: [defender] } },
    attackerSide: 'player',
    constants
  });

  assert.ok(evalGrace.expectedStatusBenefit > evalNoGrace.expectedStatusBenefit, 'AI must calculate greater status benefit under Serene Grace');
});
