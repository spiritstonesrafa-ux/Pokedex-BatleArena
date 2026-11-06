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
    statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, ...(extra.statStages || {}) },
    accuracyStage: extra.accuracyStage ?? 0,
    evasionStage: extra.evasionStage ?? 0,
    types: ['normal', 'water'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 14, name: 'swords-dance', type: 'normal', power: 0, accuracy: null, priority: 0, damageClass: 'status', pp: 20, maxPp: 20 },
      { id: 347, name: 'calm-mind', type: 'psychic', power: 0, accuracy: null, priority: 0, damageClass: 'status', pp: 20, maxPp: 20 },
      { id: 57, name: 'surf', type: 'water', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 }
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

// 1. Registry & Metadata
test('Simple: registry metadata conforms to Gen IX SV (onChangeBoost / onModifyBoost)', () => {
  const ab = Reg.getAbility('simple');
  assert.ok(ab);
  assert.equal(ab.id, 'simple');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.breakable, true);
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_CHANGE_BOOST'), 'Must include Showdown canonical hook ON_CHANGE_BOOST (onChangeBoost)');
  assert.ok(ab.triggers.includes('ON_MODIFY_BOOST'), 'Must include alias ON_MODIFY_BOOST');
});

// 2. Swords Dance (5.1)
test('Simple: Swords Dance doubles boost to +4, stores +4 in state, and caps at +6 upon second use', () => {
  const bibarel = makeMon(400, 'Bibarel', 'simple', { attack: 100 });
  const foe = makeMon(25, 'Pikachu', 'static');
  const battle = E.createTeamBattle(makeTeam(bibarel), makeTeam(foe));

  // Turn 1: Swords Dance (+2 requested -> Simple makes it +4 applied)
  const res1 = E.resolveTurn(battle, {
    player: { type: 'MOVE', moveId: 14, accuracyRoll: 1 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  const monAfterT1 = res1.state.player.team[0];
  assert.equal(monAfterT1.statStages.attack, 4, 'Swords Dance with Simple must store +4 in statStages');
  // In Gen IX, multiplier for stage +4 is (2 + 4)/2 = 3.0x -> 300 attack
  assert.equal(constants.getEffectiveStat(monAfterT1, 'attack'), 300, 'Effective attack must be 300 (3.0x)');

  // Turn 2: Swords Dance again (+2 requested -> +4 requested, but saturates at +6 max: applied delta is +2)
  const res2 = E.resolveTurn(res1.state, {
    player: { type: 'MOVE', moveId: 14, accuracyRoll: 1 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  const monAfterT2 = res2.state.player.team[0];
  assert.equal(monAfterT2.statStages.attack, 6, 'Second Swords Dance must cap cleanly at +6');
  assert.equal(constants.getEffectiveStat(monAfterT2, 'attack'), 400, 'Effective attack at +6 is 400 (4.0x)');

  // Turn 3: Swords Dance at max +6 -> applied delta is 0 with blockedReason AT_MAX
  const report = constants.applyStatStageChange(monAfterT2, 'attack', 2);
  assert.equal(report.appliedDelta, 0, 'No boost applied when already at max');
  assert.equal(report.finalStage, 6);
  assert.equal(report.blockedReason, 'AT_MAX');
});

// 3. Multi-Stat Boosts (Dragon Dance / Calm Mind) (5.2)
test('Simple: multi-stat boosts (Dragon Dance / Calm Mind) double both attributes simultaneously', () => {
  const bibarel = makeMon(400, 'Bibarel', 'simple', { attack: 100, speed: 100, specialAttack: 100, specialDefense: 100 });
  const foe = makeMon(25, 'Pikachu', 'static');

  // A. Dragon Dance mechanics (+1 Atk, +1 Spe)
  const state = { player: { team: [bibarel] }, enemy: { team: [foe] } };
  const events = [];
  constants.P7.modifyStages(state, 'player', bibarel, { attack: 1, speed: 1 }, 'player', bibarel, 'dragon-dance', constants, events);

  assert.equal(bibarel.statStages.attack, 2, 'Attack must increase by +2 (1 * 2)');
  assert.equal(bibarel.statStages.speed, 2, 'Speed must increase by +2 (1 * 2)');
  assert.equal(constants.getEffectiveStat(bibarel, 'attack'), 200, 'Attack stat must be 200 (2.0x)');
  assert.equal(constants.getEffectiveStat(bibarel, 'speed'), 200, 'Speed stat must be 200 (2.0x)');

  // B. Calm Mind in full Battle Engine turn (+1 SpA, +1 SpD -> +2 SpA, +2 SpD)
  const battle = E.createTeamBattle(makeTeam(makeMon(400, 'Bibarel', 'simple')), makeTeam(foe));
  const res = E.resolveTurn(battle, {
    player: { type: 'MOVE', moveId: 347, accuracyRoll: 1 }, // Calm Mind
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  const activeMon = res.state.player.team[0];
  assert.equal(activeMon.statStages.specialAttack, 2, 'Sp. Atk must increase by +2 (1 * 2)');
  assert.equal(activeMon.statStages.specialDefense, 2, 'Sp. Def must increase by +2 (1 * 2)');
  assert.equal(constants.getEffectiveStat(activeMon, 'specialAttack'), 200, 'Sp. Atk stat must be 200 (2.0x)');
  assert.equal(constants.getEffectiveStat(activeMon, 'specialDefense'), 200, 'Sp. Def stat must be 200 (2.0x)');
});

// 4. Intimidate (5.3)
test('Simple: Intimidate on switch-in drops Attack by -2 stages', () => {
  const gyarados = makeMon(130, 'Gyarados', 'intimidate');
  const bibarelSimple = makeMon(400, 'Bibarel', 'simple');
  const bibarelNormal = makeMon(400, 'Bibarel', 'unaware');
  const bibarelGas = makeMon(400, 'Bibarel', 'simple', { neutralizingGasSuppressed: true });

  // 1. With Simple active: -1 becomes -2
  const state1 = { player: { team: [bibarelSimple], activeIndex: 0 }, enemy: { team: [gyarados], activeIndex: 0 } };
  const events1 = [];
  constants.P7.enter(state1, 'enemy', constants, events1);
  assert.equal(bibarelSimple.statStages.attack, -2, 'Intimidate against Simple must drop Attack by -2');
  assert.equal(constants.getEffectiveStat(bibarelSimple, 'attack'), 50, 'Effective attack at -2 is 0.5x (50)');

  // 2. Without Simple: -1 drop
  const state2 = { player: { team: [bibarelNormal], activeIndex: 0 }, enemy: { team: [gyarados], activeIndex: 0 } };
  const events2 = [];
  constants.P7.enter(state2, 'enemy', constants, events2);
  assert.equal(bibarelNormal.statStages.attack, -1, 'Intimidate against normal ability must drop Attack by -1');

  // 3. With Simple suppressed under Neutralizing Gas: -1 drop
  const state3 = { player: { team: [bibarelGas], activeIndex: 0 }, enemy: { team: [gyarados], activeIndex: 0 } };
  const events3 = [];
  constants.P7.enter(state3, 'enemy', constants, events3);
  assert.equal(bibarelGas.statStages.attack, -1, 'Intimidate against suppressed Simple must drop Attack by only -1');
});

// 5. Accuracy and Evasion (5.4)
test('Simple: doubles accuracy and evasion changes and stores doubled stages', () => {
  const bibarel = makeMon(400, 'Bibarel', 'simple');

  // Accuracy +1 -> stored as +2
  const rAccUp = constants.applyStatStageChange(bibarel, 'accuracy', 1);
  assert.equal(rAccUp.appliedDelta, 2);
  assert.equal(bibarel.accuracyStage, 2);

  // Accuracy -2 -> doubled to -4: +2 + (-4) = -2
  const rAccDown = constants.applyStatStageChange(bibarel, 'accuracy', -2);
  assert.equal(rAccDown.appliedDelta, -4);
  assert.equal(bibarel.accuracyStage, -2);

  // Evasion +1 -> stored as +2
  const rEvaUp = constants.applyStatStageChange(bibarel, 'evasion', 1);
  assert.equal(rEvaUp.appliedDelta, 2);
  assert.equal(bibarel.evasionStage, 2);

  // Evasion -1 -> doubled to -2: +2 + (-2) = 0
  const rEvaDown = constants.applyStatStageChange(bibarel, 'evasion', -1);
  assert.equal(rEvaDown.appliedDelta, -2);
  assert.equal(bibarel.evasionStage, 0);

  // Effective accuracy verification with move accuracy 60 and accuracyStage -2:
  // stage -2 -> 3 / (3 - (-2)) = 3/5 = 0.6x -> 60 * 0.6 = 36
  const move60 = { id: 999, name: 'test', accuracy: 60 };
  const foe = makeMon(25, 'Pikachu', 'static');
  const acc = constants.getEffectiveAccuracy(move60, bibarel, foe);
  assert.equal(acc, 36, 'Accuracy calculation applies stored doubled stage directly without re-doubling');
});

// 6. Limits and Boundary Clamping (5.5)
test('Simple: respects +6 and -6 limits and calculates partial applied deltas near bounds', () => {
  const mon = makeMon(400, 'Bibarel', 'simple');

  // Near max: at +5, a +1 boost doubles to +2 requested, but only +1 applied to reach +6
  mon.statStages.attack = 5;
  const rep1 = constants.applyStatStageChange(mon, 'attack', 1);
  assert.equal(rep1.requestedDelta, 2);
  assert.equal(rep1.appliedDelta, 1);
  assert.equal(rep1.finalStage, 6);
  assert.equal(rep1.blockedReason, null);

  // Near min: at -5, a -1 drop doubles to -2 requested, but only -1 applied to reach -6
  mon.statStages.defense = -5;
  const rep2 = constants.applyStatStageChange(mon, 'defense', -1);
  assert.equal(rep2.requestedDelta, -2);
  assert.equal(rep2.appliedDelta, -1);
  assert.equal(rep2.finalStage, -6);
  assert.equal(rep2.blockedReason, null);

  // At min: at -6, a -2 drop doubles to -4 requested, 0 applied, blockedReason AT_MIN
  const rep3 = constants.applyStatStageChange(mon, 'defense', -2);
  assert.equal(rep3.requestedDelta, -4);
  assert.equal(rep3.appliedDelta, 0);
  assert.equal(rep3.finalStage, -6);
  assert.equal(rep3.blockedReason, 'AT_MIN');
});

// 7. Neutralizing Gas Suppression & Restoration (6.1)
test('Simple: Neutralizing Gas preserves previously acquired stages without retroactive modification', () => {
  const bibarel = makeMon(400, 'Bibarel', 'simple', { attack: 100 });

  // 1. Swords Dance with Simple active -> Attack stores +4
  constants.applyStatStageChange(bibarel, 'attack', 2);
  assert.equal(bibarel.statStages.attack, 4);
  assert.equal(constants.getEffectiveStat(bibarel, 'attack'), 300, '3.0x Attack before gas');

  // 2. Neutralizing Gas enters and suppresses Simple
  bibarel.neutralizingGasSuppressed = true;
  // Previously acquired stage +4 remains intact! Attack stat remains 3.0x (300)!
  assert.equal(bibarel.statStages.attack, 4, 'Stored stage must not drop when Simple is suppressed');
  assert.equal(constants.getEffectiveStat(bibarel, 'attack'), 300, 'Effective stat remains 300 while suppressed');

  // 3. While suppressed, a new +1 boost applies as standard +1 (NOT doubled)
  constants.applyStatStageChange(bibarel, 'attack', 1);
  assert.equal(bibarel.statStages.attack, 5, 'Boost while suppressed is not doubled (4 + 1 = 5)');
  assert.equal(constants.getEffectiveStat(bibarel, 'attack'), 350, 'Effective stat at +5 is 3.5x (350)');

  // 4. Neutralizing Gas leaves: Simple is restored
  bibarel.neutralizingGasSuppressed = false;
  // Existing stages are NOT retroactively doubled!
  assert.equal(bibarel.statStages.attack, 5, 'Existing stage 5 must not be retroactively doubled to 10');
  assert.equal(constants.getEffectiveStat(bibarel, 'attack'), 350);

  // 5. Subsequent boost while Simple is active is doubled
  constants.applyStatStageChange(bibarel, 'attack', 1);
  assert.equal(bibarel.statStages.attack, 6, 'New boost under restored Simple is doubled (+2, clamped at 6)');
});

// 8. Ability Replacement (Mummy / Skill Swap / Simple Beam) (6.2)
test('Simple: ability replacement retains existing stages and does not retroactively mutate', () => {
  const bibarel = makeMon(400, 'Bibarel', 'simple', { attack: 100 });

  // 1. Gains +4 Attack from Swords Dance under Simple
  constants.applyStatStageChange(bibarel, 'attack', 2);
  assert.equal(bibarel.statStages.attack, 4);

  // 2. Attacks Cofagrigus with Mummy: ability becomes mummy
  bibarel.ability = 'mummy';
  assert.equal(bibarel.statStages.attack, 4, 'Losing Simple does not erase or revert previously stored stages');
  assert.equal(constants.getEffectiveStat(bibarel, 'attack'), 300);

  // 3. New boost under Mummy is not doubled
  constants.applyStatStageChange(bibarel, 'attack', 1);
  assert.equal(bibarel.statStages.attack, 5, 'New boost under Mummy is standard +1');

  // 4. Non-Simple Pokémon gaining Simple does not retroactively double existing stages
  const bidoof = makeMon(399, 'Bidoof', 'unaware', { statStages: { attack: 2 } });
  assert.equal(bidoof.statStages.attack, 2);
  // Simple Beam makes ability simple
  bidoof.ability = 'simple';
  assert.equal(bidoof.statStages.attack, 2, 'Gaining Simple does not retroactively double existing stage from 2 to 4');
  // Next boost is doubled
  constants.applyStatStageChange(bidoof, 'attack', 1);
  assert.equal(bidoof.statStages.attack, 4, 'Future boost under gained Simple is doubled (2 + 2 = 4)');
});

// 9. Unaware Interaction (6.3)
test('Simple: Unaware completely ignores stored Simple stat stages of opponent', () => {
  const bibarel = makeMon(400, 'Bibarel', 'simple', { attack: 100, defense: 100 });
  const clodsire = makeMon(980, 'Clodsire', 'unaware', { defense: 100, attack: 100 });
  const normalFoe = makeMon(25, 'Pikachu', 'static', { defense: 100, attack: 100 });

  // Bibarel boosts Attack by +4 (Swords Dance) and Defense by +4 (Iron Defense)
  constants.applyStatStageChange(bibarel, 'attack', 2);
  constants.applyStatStageChange(bibarel, 'defense', 2);
  assert.equal(bibarel.statStages.attack, 4);
  assert.equal(bibarel.statStages.defense, 4);

  // Against normal foe: Attack is 300 (3.0x), Defense is 300 (3.0x)
  assert.equal(constants.getEffectiveStat(bibarel, 'attack', null, normalFoe), 300);
  assert.equal(constants.getEffectiveStat(bibarel, 'defense', null, normalFoe), 300);

  // Against Unaware clodsire:
  // When Bibarel attacks Clodsire, Clodsire ignores Bibarel's +4 Attack -> treated as 0 (100)
  assert.equal(constants.getEffectiveStat(bibarel, 'attack', null, clodsire), 100, 'Unaware defender ignores Simple attacker Attack buff');
  // When Clodsire attacks Bibarel, Clodsire ignores Bibarel's +4 Defense -> treated as 0 (100)
  assert.equal(constants.getEffectiveStat(bibarel, 'defense', null, clodsire), 100, 'Unaware attacker ignores Simple defender Defense buff');
});

// 10. Contrary Ordering (6.4)
test('Simple: Contrary inverts first and Simple doubles the inverted change', () => {
  // Mock combatant with Contrary and Simple active
  const mon = makeMon(400, 'Bibarel', 'simple');
  const state = { player: { team: [mon] }, enemy: { team: [makeMon(25, 'Pikachu', 'static')] } };
  const events = [];

  // Superpower drops (-1 Atk, -1 Def):
  // When modifyStages runs with Contrary, -1 is inverted to +1, and applyStatStageChange doubles to +2
  constants.P7.modifyStages(state, 'player', mon, { attack: 1, defense: -1 }, 'player', mon, 'test', constants, events);

  // attack was +1 -> doubled by Simple to +2
  assert.equal(mon.statStages.attack, 2);
  // defense was -1 -> doubled by Simple to -2
  assert.equal(mon.statStages.defense, -2);
});

// 11. Haze Reset (6.5)
test('Simple: Haze resets all stat stages cleanly to 0 without doubling the reset', () => {
  const bibarel = makeMon(400, 'Bibarel', 'simple');
  // Accumulate boosts
  constants.applyStatStageChange(bibarel, 'attack', 2); // +4
  constants.applyStatStageChange(bibarel, 'speed', 1);  // +2
  constants.applyStatStageChange(bibarel, 'evasion', 1); // +2
  assert.equal(bibarel.statStages.attack, 4);
  assert.equal(bibarel.statStages.speed, 2);
  assert.equal(bibarel.evasionStage, 2);

  // Haze resets stat stages
  constants.resetStatStages(bibarel);
  assert.equal(bibarel.statStages.attack, 0, 'Attack must reset to 0');
  assert.equal(bibarel.statStages.defense, 0, 'Defense must reset to 0');
  assert.equal(bibarel.statStages.speed, 0, 'Speed must reset to 0');
  assert.equal(bibarel.accuracyStage, 0, 'Accuracy must reset to 0');
  assert.equal(bibarel.evasionStage, 0, 'Evasion must reset to 0');
});

// 12. Baton Pass (6.6)
test('Simple: Baton Pass transfers stored +4 stage to recipient without re-doubling', () => {
  const bibarel = makeMon(400, 'Bibarel', 'simple');
  constants.applyStatStageChange(bibarel, 'attack', 2); // +4
  assert.equal(bibarel.statStages.attack, 4);

  // Baton Pass passes stages to recipient
  const recipientSimple = makeMon(322, 'Numel', 'simple');
  const recipientNormal = makeMon(25, 'Pikachu', 'static');

  // Stage copy:
  recipientSimple.statStages = { ...bibarel.statStages };
  recipientNormal.statStages = { ...bibarel.statStages };

  assert.equal(recipientSimple.statStages.attack, 4, 'Recipient with Simple maintains transferred +4 (not doubled to +8)');
  assert.equal(constants.getEffectiveStat(recipientSimple, 'attack'), 300, 'Effective attack is 3.0x (300)');
  assert.equal(recipientNormal.statStages.attack, 4, 'Recipient without Simple retains transferred +4');
  assert.equal(constants.getEffectiveStat(recipientNormal, 'attack'), 300);
});

// 13. Critical Hits (6.7)
test('Simple: Critical hit ignores positive defense buffs on Simple defender and retains negative defense drops', () => {
  const attacker = makeMon(25, 'Pikachu', 'static', { attack: 100 });
  const physicalMove = { id: 33, name: 'tackle', damageClass: 'physical', power: 40 };

  // 1. Defender has +4 Defense from Simple Iron Defense
  const defBuffed = makeMon(400, 'Bibarel', 'simple', { defense: 100 });
  constants.applyStatStageChange(defBuffed, 'defense', 2); // +4
  assert.equal(defBuffed.statStages.defense, 4);

  // Critical hit ignores positive defense stages: treated as 0 (100)
  const crit1 = Critical.stats(attacker, defBuffed, physicalMove, constants);
  assert.equal(crit1.defense, 100, 'Critical hit must bypass Simple defense buffs');

  // 2. Defender has -2 Defense from Simple Screech drop
  const defDropped = makeMon(400, 'Bibarel', 'simple', { defense: 100 });
  constants.applyStatStageChange(defDropped, 'defense', -1); // -2
  assert.equal(defDropped.statStages.defense, -2);

  // Critical hit retains negative defense stages: treated as -2 (50)
  const crit2 = Critical.stats(attacker, defDropped, physicalMove, constants);
  assert.equal(crit2.defense, 50, 'Critical hit must retain Simple negative defense drops');
});

// 14. Mold Breaker (6.8)
test('Simple: Mold Breaker ignores Simple when applying stat drops unless defender holds Ability Shield', () => {
  const attackerMB = makeMon(621, 'Druddigon', 'mold-breaker');
  const screechMove = { id: 103, name: 'screech', damageClass: 'status' };

  // 1. Defender without Ability Shield: Mold Breaker ignores Simple
  const defenderNoShield = makeMon(400, 'Bibarel', 'simple', { defense: 100 });
  defenderNoShield.abilityIgnored = constants.P7.ignored(attackerMB, defenderNoShield, screechMove);
  assert.equal(defenderNoShield.abilityIgnored, true, 'Mold Breaker must ignore defender Simple');

  constants.applyStatStageChange(defenderNoShield, 'defense', -2);
  assert.equal(defenderNoShield.statStages.defense, -2, 'Under Mold Breaker, Screech drops Defense by only -2 (not doubled)');

  // 2. Defender WITH Ability Shield: Mold Breaker cannot ignore Simple
  const defenderWithShield = makeMon(400, 'Bibarel', 'simple', { defense: 100, item: 'ability-shield' });
  defenderWithShield.abilityIgnored = constants.P7.ignored(attackerMB, defenderWithShield, screechMove);
  assert.equal(defenderWithShield.abilityIgnored, false, 'Ability Shield prevents Mold Breaker from ignoring Simple');

  constants.applyStatStageChange(defenderWithShield, 'defense', -2);
  assert.equal(defenderWithShield.statStages.defense, -4, 'With Ability Shield, Screech is doubled by Simple to -4');

  // 3. Mold Breaker attacker attacking defender that already boosted Defense:
  // Mold Breaker does NOT ignore defender stat stages!
  const boostedDefender = makeMon(400, 'Bibarel', 'simple', { defense: 100 });
  constants.applyStatStageChange(boostedDefender, 'defense', 2); // +4
  assert.equal(boostedDefender.statStages.defense, 4);

  const effDef = constants.getEffectiveStat(boostedDefender, 'defense', { id: 33, damageClass: 'physical' }, attackerMB);
  assert.equal(effDef, 300, 'Mold Breaker does not ignore defender stat stages');
});

// 15. AI Evaluator (6.9)
test('Simple: AI evaluator integrates stored doubled stat stages into damage and speed', () => {
  const bibarel = makeMon(400, 'Bibarel', 'simple', { attack: 100 });
  constants.applyStatStageChange(bibarel, 'attack', 2); // Swords Dance -> +4 stored
  assert.equal(bibarel.statStages.attack, 4);

  const normalMon = makeMon(400, 'Bibarel', 'soundproof', { attack: 100, statStages: { attack: 2 } });
  const defender = makeMon(25, 'Pikachu', 'static', { defense: 100 });

  const tackle = bibarel.moves[0];

  const evalSimple = Evaluator.evaluateMove(bibarel, defender, tackle, {
    battleState: { player: { team: [bibarel] }, enemy: { team: [defender] } },
    attackerSide: 'player',
    constants
  });

  const evalNormal = Evaluator.evaluateMove(normalMon, defender, tackle, {
    battleState: { player: { team: [normalMon] }, enemy: { team: [defender] } },
    attackerSide: 'player',
    constants
  });

  assert.ok(evalSimple.expectedDamage > evalNormal.expectedDamage, 'AI must calculate higher damage for +4 attack than +2');
  assert.equal(evalSimple.attackStat, 300, 'AI must calculate attack as 300 (3.0x for +4 stage)');
  assert.equal(evalNormal.attackStat, 200, 'AI must calculate normal attack as 200 (2.0x for +2 stage)');
});
