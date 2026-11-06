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
    types: ['water', 'ice'],
    ability,
    moves: [
      { id: 333, name: 'icicle-spear', type: 'ice', power: 25, accuracy: 100, priority: 0, damageClass: 'physical', pp: 30, maxPp: 30 },
      { id: 331, name: 'bullet-seed', type: 'grass', power: 25, accuracy: 100, priority: 0, damageClass: 'physical', pp: 30, maxPp: 30 },
      { id: 24, name: 'double-kick', type: 'fighting', power: 30, accuracy: 100, priority: 0, damageClass: 'physical', pp: 30, maxPp: 30 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 }
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

test('Skill Link: registry metadata conforms to Gen IX SV', () => {
  const ab = Reg.getAbility('skill-link');
  assert.ok(ab);
  assert.equal(ab.id, 'skill-link');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.equal(ab.breakable, false);
  assert.ok(ab.triggers.includes('ON_MODIFY_MOVE'));
});

test('Skill Link: getMultiHitCount forces maximum hits (5) for variable 2-5 hit move', () => {
  const cloyster = makeMon(91, 'Cloyster', 'skill-link');
  const count = constants.getMultiHitCount(333, cloyster); // icicle-spear
  assert.equal(count, 5);
  const bulletCount = constants.getMultiHitCount(331, cloyster); // bullet-seed
  assert.equal(bulletCount, 5);
});

test('Skill Link: getMultiHitCount forces maximum hits (10) for Population Bomb', () => {
  const maushold = makeMon(925, 'Maushold', 'skill-link');
  const count = constants.getMultiHitCount(878, maushold); // population-bomb
  assert.equal(count, 10);
});

test('Skill Link: getMultiHitCount forces maximum hits (3) for Triple Axel', () => {
  const weavile = makeMon(461, 'Weavile', 'skill-link');
  const count = constants.getMultiHitCount(813, weavile); // triple-axel
  assert.equal(count, 3);
});

test('Skill Link: fixed 2-hit move retains exactly 2 hits', () => {
  const cloyster = makeMon(91, 'Cloyster', 'skill-link');
  const count = constants.getMultiHitCount(24, cloyster); // double-kick
  assert.equal(count, 2);
});

test('Skill Link: battle turn lands all 5 hits in practice', () => {
  const cloyster = makeMon(91, 'Cloyster', 'skill-link', { speed: 120 });
  const enemy = makeMon(25, 'Pikachu', 'static', { currentHp: 500, maxHp: 500, speed: 80 });
  const state = E.createTeamBattle(makeTeam(cloyster), makeTeam(enemy));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 333 }, // Icicle Spear
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hitEvents = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');
  assert.equal(hitEvents.length, 5, 'Should land 5 hits of Icicle Spear');
  const multiEvent = r.events.find(e => e.type === 'MULTI_HIT_COMPLETE');
  assert.ok(multiEvent);
  assert.equal(multiEvent.hitCount, 5);
});

test('Skill Link: multi-hit stops immediately if target faints before 5th hit', () => {
  const cloyster = makeMon(91, 'Cloyster', 'skill-link', { speed: 120, attack: 300 });
  // Target has very low HP (e.g. 10 HP), so hit 1 will faint it
  const enemy = makeMon(25, 'Pikachu', 'static', { currentHp: 10, maxHp: 100, speed: 50, defense: 30 });
  const state = E.createTeamBattle(makeTeam(cloyster), makeTeam(enemy));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 333 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hitEvents = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');
  assert.ok(hitEvents.length < 5, 'Should terminate early when target faints');
  assert.equal(r.state.enemy.team[0].currentHp, 0);
});

test('Skill Link: suppressed under Neutralizing Gas falls back to normal distribution', () => {
  const cloyster = makeMon(91, 'Cloyster', 'skill-link', { neutralizingGasSuppressed: true });
  // Without Skill Link, icicle spear has variable hits dependent on roll (roll 10 <= 35 -> 2 hits)
  const count = constants.getMultiHitCount(333, 10, cloyster);
  assert.equal(count, 2, 'Under Gas suppression, roll 10 should result in 2 hits, not 5');
});

test('Skill Link: Triple Axel hits have escalating power (20 -> 40 -> 60)', () => {
  const weavile = makeMon(461, 'Weavile', 'skill-link', {
    moves: [{ id: 813, name: 'triple-axel', type: 'ice', power: 20, accuracy: 90, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 }],
    speed: 120
  });
  const enemy = makeMon(25, 'Pikachu', 'static', { currentHp: 500, maxHp: 500, speed: 50 });
  const state = E.createTeamBattle(makeTeam(weavile), makeTeam(enemy));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 813, accuracyRoll: 1, hitAccuracyRolls: [1, 1, 1] },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hitEvents = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');
  assert.equal(hitEvents.length, 3, 'Should land 3 hits');
  assert.equal(hitEvents[0].power, 20, 'Hit 1 power is 20');
  assert.equal(hitEvents[1].power, 40, 'Hit 2 power is 40');
  assert.equal(hitEvents[2].power, 60, 'Hit 3 power is 60');
  assert.ok(hitEvents[1].damage > hitEvents[0].damage, 'Hit 2 damage must exceed Hit 1');
  assert.ok(hitEvents[2].damage > hitEvents[1].damage, 'Hit 3 damage must exceed Hit 2');
});

test('Skill Link: Triple Axel with Skill Link lands all 3 hits bypassing per-hit accuracy checks after initial hit', () => {
  const weavile = makeMon(461, 'Weavile', 'skill-link', {
    moves: [{ id: 813, name: 'triple-axel', type: 'ice', power: 20, accuracy: 90, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 }],
    speed: 120
  });
  const enemy = makeMon(25, 'Pikachu', 'static', { currentHp: 500, maxHp: 500, speed: 50 });
  const state = E.createTeamBattle(makeTeam(weavile), makeTeam(enemy));

  // Initial check passes (roll 1 <= 90), subsequent rolls are 99 (>90).
  // With Skill Link, per-hit accuracy checks are bypassed once the initial check passes!
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 813, accuracyRoll: 1, hitAccuracyRolls: [1, 99, 99] },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hitEvents = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');
  assert.equal(hitEvents.length, 3, 'Skill Link must guarantee all 3 hits for Triple Axel when initial accuracy check passes');
});

test('Skill Link: Triple Axel without Skill Link performs per-hit checks and terminates on miss', () => {
  const weavile = makeMon(461, 'Weavile', 'pressure', {
    moves: [{ id: 813, name: 'triple-axel', type: 'ice', power: 20, accuracy: 90, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 }],
    speed: 120
  });
  const enemy = makeMon(25, 'Pikachu', 'static', { currentHp: 500, maxHp: 500, speed: 50 });
  const state = E.createTeamBattle(makeTeam(weavile), makeTeam(enemy));

  // Hit 1 passes (1 <= 90), Hit 2 fails (99 > 90) -> terminates with 1 hit!
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 813, accuracyRoll: 1, hitAccuracyRolls: [1, 99, 1] },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hitEvents = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');
  assert.equal(hitEvents.length, 1, 'Without Skill Link, Triple Axel must terminate after hit 1 when hit 2 misses');
});

test('Skill Link: Triple Kick with Skill Link lands all 3 hits with power progression 10 -> 20 -> 30', () => {
  const hitmontop = makeMon(237, 'Hitmontop', 'skill-link', {
    moves: [{ id: 167, name: 'triple-kick', type: 'fighting', power: 10, accuracy: 90, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 }],
    speed: 120
  });
  const enemy = makeMon(25, 'Pikachu', 'static', { currentHp: 500, maxHp: 500, speed: 50 });
  const state = E.createTeamBattle(makeTeam(hitmontop), makeTeam(enemy));

  // Initial check passes (10 <= 90), subsequent rolls 99 (>90) are bypassed by Skill Link
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 167, accuracyRoll: 10, hitAccuracyRolls: [10, 99, 99] },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hitEvents = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');
  assert.equal(hitEvents.length, 3, 'Skill Link must guarantee all 3 hits for Triple Kick');
  assert.equal(hitEvents[0].power, 10, 'Hit 1 power is 10');
  assert.equal(hitEvents[1].power, 20, 'Hit 2 power is 20');
  assert.equal(hitEvents[2].power, 30, 'Hit 3 power is 30');
});

test('Skill Link: Triple Kick without Skill Link terminates on miss', () => {
  const hitmontop = makeMon(237, 'Hitmontop', 'intimidate', {
    moves: [{ id: 167, name: 'triple-kick', type: 'fighting', power: 10, accuracy: 90, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 }],
    speed: 120
  });
  const enemy = makeMon(25, 'Pikachu', 'static', { currentHp: 500, maxHp: 500, speed: 50 });
  const state = E.createTeamBattle(makeTeam(hitmontop), makeTeam(enemy));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 167, accuracyRoll: 10, hitAccuracyRolls: [10, 99, 10] },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hitEvents = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');
  assert.equal(hitEvents.length, 1, 'Without Skill Link, Triple Kick must terminate when hit 2 misses');
});

test('Skill Link: Population Bomb with Skill Link lands all 10 hits bypassing per-hit accuracy checks', () => {
  const maushold = makeMon(925, 'Maushold', 'skill-link', {
    moves: [{ id: 860, name: 'population-bomb', type: 'normal', power: 20, accuracy: 90, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 }],
    speed: 120
  });
  const enemy = makeMon(25, 'Pikachu', 'static', { currentHp: 1000, maxHp: 1000, speed: 50 });
  const state = E.createTeamBattle(makeTeam(maushold), makeTeam(enemy));

  // Initial check passes (10 <= 90), all 9 subsequent rolls are 99 (>90).
  // With Skill Link, all 10 hits must land!
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 860, accuracyRoll: 10, hitAccuracyRolls: [10, 99, 99, 99, 99, 99, 99, 99, 99, 99] },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hitEvents = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');
  assert.equal(hitEvents.length, 10, 'Skill Link must guarantee all 10 hits of Population Bomb');
});

test('Skill Link: Population Bomb without Skill Link terminates on miss', () => {
  const maushold = makeMon(925, 'Maushold', 'technician', {
    moves: [{ id: 860, name: 'population-bomb', type: 'normal', power: 20, accuracy: 90, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 }],
    speed: 120
  });
  const enemy = makeMon(25, 'Pikachu', 'static', { currentHp: 1000, maxHp: 1000, speed: 50 });
  const state = E.createTeamBattle(makeTeam(maushold), makeTeam(enemy));

  // Hits 1, 2, 3 pass (10 <= 90), Hit 4 fails (99 > 90) -> terminates with 3 hits!
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 860, accuracyRoll: 10, hitAccuracyRolls: [10, 10, 10, 99, 10, 10, 10, 10, 10, 10] },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hitEvents = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');
  assert.equal(hitEvents.length, 3, 'Without Skill Link, Population Bomb must terminate on hit 4');
});

test('Skill Link: initial accuracy check failure results in 0 hits even with Skill Link', () => {
  const weavile = makeMon(461, 'Weavile', 'skill-link', {
    moves: [{ id: 813, name: 'triple-axel', type: 'ice', power: 20, accuracy: 90, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 }],
    speed: 120
  });
  const enemy = makeMon(25, 'Pikachu', 'static', { currentHp: 500, maxHp: 500, speed: 50 });
  const state = E.createTeamBattle(makeTeam(weavile), makeTeam(enemy));

  // Initial accuracy check fails: 95 > 90
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 813, accuracyRoll: 95, hitAccuracyRolls: [95, 1, 1] },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hitEvents = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');
  assert.equal(hitEvents.length, 0, 'Move must miss completely when initial accuracy check fails');
  const missEvent = r.events.find(e => e.type === 'MOVE_MISSED');
  assert.ok(missEvent, 'MOVE_MISSED event must be emitted');
});

test('Skill Link: suppressed under Neutralizing Gas re-enables per-hit accuracy checks', () => {
  const weavile = makeMon(461, 'Weavile', 'skill-link', {
    moves: [{ id: 813, name: 'triple-axel', type: 'ice', power: 20, accuracy: 90, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 }],
    speed: 120
  });
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { currentHp: 500, maxHp: 500, speed: 50 });
  const state = E.createTeamBattle(makeTeam(weavile), makeTeam(weezing));

  // Hit 1 passes, Hit 2 fails -> because Skill Link is suppressed by gas, hit 2 terminates!
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 813, accuracyRoll: 1, hitAccuracyRolls: [1, 99, 1] },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const hitEvents = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');
  assert.equal(hitEvents.length, 1, 'Under Gas suppression, per-hit accuracy checks must terminate sequence on miss');
});

test('Skill Link: multi-hit continues damaging target after breaking Substitute', () => {
  const cloyster = makeMon(91, 'Cloyster', 'skill-link', { speed: 120, attack: 150 });
  // Target has substitute with 20 HP, total HP 200
  const enemy = makeMon(25, 'Pikachu', 'static', {
    currentHp: 200, maxHp: 200, speed: 50,
    substitute: true, substituteHp: 20
  });
  const state = E.createTeamBattle(makeTeam(cloyster), makeTeam(enemy));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 333 }, // Icicle Spear lands 5 hits
    enemy: { type: 'MOVE', moveId: 33 }
  });

  assert.equal(r.state.enemy.team[0].substitute, false, 'Substitute must be broken');
  assert.ok(r.state.enemy.team[0].currentHp < 200, 'Defender HP must be reduced by remaining hits after sub break');
});

test('Skill Link: multi-hit breaks through Sturdy / Focus Sash on hit 2', () => {
  const cloyster = makeMon(91, 'Cloyster', 'skill-link', { speed: 120, attack: 200 });
  // Target with Sturdy and full HP (50 HP)
  const enemy = makeMon(74, 'Geodude', 'sturdy', { currentHp: 50, maxHp: 50, defense: 40, speed: 20, types: ['rock', 'ground'] });
  const state = E.createTeamBattle(makeTeam(cloyster), makeTeam(enemy));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 333 }, // Icicle Spear 4x super effective on Ground/Rock
    enemy: { type: 'MOVE', moveId: 33 }
  });

  // Hit 1 activates Sturdy (reduces to 1 HP), Hit 2 finishes Geodude off!
  assert.equal(r.state.enemy.team[0].currentHp, 0, 'Target with Sturdy must faint from subsequent hit');
});

test('Skill Link: AI Evaluator calculates expected hits as 5 for variable moves', () => {
  const V = require('../../assets/js/battle/battle-evaluator');
  const cloyster = makeMon(91, 'Cloyster', 'skill-link', {
    moves: [{ id: 333, name: 'icicle-spear', type: 'ice', power: 25, accuracy: 100, damageClass: 'physical', pp: 30 }]
  });
  const nonSkillLinkCloyster = makeMon(91, 'Cloyster', 'shell-armor', {
    moves: [{ id: 333, name: 'icicle-spear', type: 'ice', power: 25, accuracy: 100, damageClass: 'physical', pp: 30 }]
  });
  const enemy = makeMon(25, 'Pikachu', 'static');

  const evalSkill = V.evaluateMove(cloyster, enemy, cloyster.moves[0], { battleState: null });
  const evalNormal = V.evaluateMove(nonSkillLinkCloyster, enemy, nonSkillLinkCloyster.moves[0], { battleState: null });

  // With Skill Link: expectedHits is 5. Without Skill Link: expectedHits is 3.1.
  assert.ok(evalSkill.expectedDamage > evalNormal.expectedDamage, 'Skill Link must increase AI expected damage');
  assert.ok(evalSkill.expectedDamage / evalNormal.expectedDamage >= 1.5, 'Expected damage ratio must reflect 5 hits vs 3.1 hits');
});
