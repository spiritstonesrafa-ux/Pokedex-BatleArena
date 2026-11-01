const test = require('node:test');
const assert = require('node:assert/strict');

const Engine = require('../../assets/js/battle/battle-engine');
const Constants = require('../../assets/js/battle/battle-constants');
const SessionConstants = require('../../assets/js/battle-session/battle-session-constants');
const MoveModel = require('../../assets/js/battle/move-model');
const TurnManager = require('../../assets/js/battle/turn-manager');
const Evaluator = require('../../assets/js/battle/battle-evaluator');
const AI = require('../../assets/js/battle/battle-ai');
const Mapper = require('../../assets/js/presentation/battle-presentation-mapper');
const { BattleUiDomAdapter } = require('../../assets/js/ui/battle-ui-adapter');
const { BattleView } = require('../../assets/js/ui/battle-view');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source');
const CampaignOptionsCatalog = require('../../assets/js/campaign/campaign-move-options-catalog');
const CampaignFixedCatalog = require('../../assets/js/campaign/campaign-fixed-battle-catalog');

const statusById = Object.fromEntries(
  Object.values(Constants.SUPPORTED_STATUS_MOVES).map(m => [Number(m.id), m])
);
const getMove = id => Constants.TWO_TURN_MOVES[id] || Constants.KNOWN_CATALOG_MOVES[id] || statusById[Number(id)] || Constants.SUPPORTED_STATUS_MOVES['swords-dance'];

function makeMon(id, moveIds = [14], types = ['normal'], overrides = {}) {
  return {
    id,
    name: 'test-mon-' + id,
    types,
    hp: 2000,
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
    moves: moveIds.map(getMove),
    ...overrides
  };
}

function makeMoveAction(moveId, overrides = {}) {
  return {
    type: 'MOVE',
    moveId,
    accuracyRoll: 1,
    damageRoll: 100,
    ...overrides
  };
}

// -----------------------------------------------------------------------------
// 1. METADATA & CANONICAL CONTRACTS
// -----------------------------------------------------------------------------
test('P6 Two-turn: canonical metadata and catalog definitions for all 5 pilots', () => {
  const pilots = [
    { id: 76, name: 'solar-beam', type: 'grass', power: 120, accuracy: 100, pp: 10, damageClass: 'special', semiInvulnerable: null, prepReason: 'CHARGE_SOLAR', supportLevel: 'PARTIAL', knownPending: ['WEATHER_PHASE_P7', 'ITEM_PHASE_P7'], requiredMechanics: ['SPECIAL_DAMAGE', 'TWO_TURN_CHARGE'] },
    { id: 19, name: 'fly', type: 'flying', power: 90, accuracy: 95, pp: 15, damageClass: 'physical', semiInvulnerable: 'airborne', prepReason: 'FLY_UP', supportLevel: 'FULL', knownPending: [], requiredMechanics: ['PHYSICAL_DAMAGE', 'TWO_TURN_SEMI_INVULNERABLE'] },
    { id: 91, name: 'dig', type: 'ground', power: 80, accuracy: 100, pp: 10, damageClass: 'physical', semiInvulnerable: 'underground', prepReason: 'DIG_UNDERGROUND', supportLevel: 'FULL', knownPending: [], requiredMechanics: ['PHYSICAL_DAMAGE', 'TWO_TURN_SEMI_INVULNERABLE'] },
    { id: 291, name: 'dive', type: 'water', power: 80, accuracy: 100, pp: 10, damageClass: 'physical', semiInvulnerable: 'underwater', prepReason: 'DIVE_UNDERWATER', supportLevel: 'FULL', knownPending: [], requiredMechanics: ['PHYSICAL_DAMAGE', 'TWO_TURN_SEMI_INVULNERABLE'] },
    { id: 340, name: 'bounce', type: 'flying', power: 85, accuracy: 85, pp: 5, damageClass: 'physical', semiInvulnerable: 'airborne', prepReason: 'BOUNCE_UP', supportLevel: 'FULL', knownPending: [], requiredMechanics: ['PHYSICAL_DAMAGE', 'TWO_TURN_SEMI_INVULNERABLE', 'SECONDARY_STATUS_CHANCE'] }
  ];

  for (const expected of pilots) {
    const move = Constants.TWO_TURN_MOVES[expected.id];
    assert.ok(move, `Move ${expected.name} (${expected.id}) must exist in TWO_TURN_MOVES`);
    assert.equal(move.id, expected.id);
    assert.equal(move.name, expected.name);
    assert.equal(move.type, expected.type);
    assert.equal(move.power, expected.power);
    assert.equal(move.accuracy, expected.accuracy);
    assert.equal(move.pp, expected.pp);
    assert.equal(move.damageClass, expected.damageClass);
    assert.equal(move.semiInvulnerable, expected.semiInvulnerable);
    assert.equal(move.prepReason, expected.prepReason);

    assert.equal(Constants.isTwoTurnMove(move), true);
    assert.equal(Constants.isTwoTurnMove({ id: expected.id }), true);
    assert.equal(Constants.isTwoTurnMove({ name: expected.name }), true);
    assert.equal(Constants.isTwoTurnMove(expected.id), true);
    assert.equal(Constants.isTwoTurnMove(expected.name), true);

    const retrieved = Constants.getTwoTurnMove(expected.id);
    assert.equal(retrieved.id, expected.id);

    const capability = Constants.getMoveCapability(move);
    assert.equal(capability.supportLevel, expected.supportLevel);
    assert.deepEqual(capability.requiredMechanics, expected.requiredMechanics);
    assert.deepEqual(capability.knownPending, expected.knownPending);

    assert.equal(Constants.validateMoveData(move), true);
    assert.equal(SessionConstants.isMechanicallySupportedMove(move), true);

    const model = MoveModel.createMove(move);
    assert.equal(model.id, expected.id);
    assert.equal(model.power, expected.power);
  }

  // Non-two-turn move checks
  assert.equal(Constants.isTwoTurnMove({ id: 33, name: 'tackle' }), false);
  assert.equal(Constants.isTwoTurnMove(null), false);
  assert.equal(Constants.getTwoTurnMove(null), null);
});

// -----------------------------------------------------------------------------
// 2. TURN 1 CHARGE ANNOUNCEMENT & LIFECYCLE
// -----------------------------------------------------------------------------
test('P6 Two-turn: Turn 1 consumes 1 PP, sets twoTurnMove state, emits MOVE_PREPARED and resets stallCount', () => {
  const pilots = [
    { id: 76, prepReason: 'CHARGE_SOLAR', state: null },
    { id: 19, prepReason: 'FLY_UP', state: 'airborne' },
    { id: 91, prepReason: 'DIG_UNDERGROUND', state: 'underground' },
    { id: 291, prepReason: 'DIVE_UNDERWATER', state: 'underwater' },
    { id: 340, prepReason: 'BOUNCE_UP', state: 'airborne' }
  ];

  for (const pilot of pilots) {
    const playerMon = makeMon(1, [pilot.id], ['normal'], { speed: 200 });
    const enemyMon = makeMon(2, [14], ['normal'], { speed: 100 });
    const battle = Engine.createBattle(playerMon, enemyMon);
    battle.player.stallCount = 2; // Simulate prior protect use

    const res = Engine.resolveTurn(battle, {
      player: makeMoveAction(pilot.id),
      enemy: makeMoveAction(14)
    });

    // PP consumed on Turn 1
    const ppEvent = res.events.find(e => e.type === Constants.BATTLE_EVENTS.PP_CHANGED && e.actor === 'player');
    assert.ok(ppEvent, `PP_CHANGED must be emitted on Turn 1 for ${pilot.prepReason}`);
    assert.equal(ppEvent.currentPp, Constants.TWO_TURN_MOVES[pilot.id].pp - 1);

    // MOVE_PREPARED emitted
    const prepEvent = res.events.find(e => e.type === Constants.BATTLE_EVENTS.MOVE_PREPARED && e.actor === 'player');
    assert.ok(prepEvent, `MOVE_PREPARED must be emitted for ${pilot.prepReason}`);
    assert.equal(prepEvent.reason, pilot.prepReason);
    assert.equal(prepEvent.moveId, pilot.id);
    assert.equal(prepEvent.semiInvulnerable, pilot.state);

    // MOVE_USED and DAMAGE_APPLIED should NOT be emitted on Turn 1 for player
    assert.equal(res.events.some(e => e.type === Constants.BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), false);
    assert.equal(res.events.some(e => e.type === Constants.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player'), false);

    // State updated
    assert.deepEqual(res.state.player.twoTurnMove, {
      id: pilot.id,
      name: Constants.TWO_TURN_MOVES[pilot.id].name,
      state: pilot.state
    });

    // Stall count reset
    assert.equal(res.state.player.stallCount, 0);
  }
});

// -----------------------------------------------------------------------------
// 3. TURN 2 EXECUTION, PP RULES & FORCED CONTINUATION
// -----------------------------------------------------------------------------
test('P6 Two-turn: Turn 2 executes move, clears state, consumes NO PP and resets stallCount', () => {
  for (const id of [76, 19, 91, 291, 340]) {
    const playerMon = makeMon(1, [id], ['normal'], { speed: 200 });
    const enemyMon = makeMon(2, [14], ['normal'], { speed: 100 });
    const battle = Engine.createBattle(playerMon, enemyMon);

    // Turn 1
    const t1 = Engine.resolveTurn(battle, {
      player: makeMoveAction(id),
      enemy: makeMoveAction(14)
    });

    t1.state.player.stallCount = 3;

    // Turn 2
    const t2 = Engine.resolveTurn(t1.state, {
      player: makeMoveAction(id),
      enemy: makeMoveAction(14)
    });

    // MOVE_USED and DAMAGE_APPLIED emitted on Turn 2
    assert.ok(t2.events.some(e => e.type === Constants.BATTLE_EVENTS.MOVE_USED && e.actor === 'player'));
    assert.ok(t2.events.some(e => e.type === Constants.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player'));

    // NO PP_CHANGED emitted for player on Turn 2
    assert.equal(t2.events.some(e => e.type === Constants.BATTLE_EVENTS.PP_CHANGED && e.actor === 'player'), false);

    // twoTurnMove cleared
    assert.equal(t2.state.player.twoTurnMove, null);
    assert.equal(t2.state.player.stallCount, 0);
  }
});

test('P6 Two-turn: executes Turn 2 successfully even if remaining PP is 0', () => {
  const playerMon = makeMon(1, [19], ['flying'], { speed: 200 });
  const enemyMon = makeMon(2, [14], ['normal'], { speed: 100 });
  const battle = Engine.createBattle(playerMon, enemyMon);
  battle.player.moves[0].currentPp = 1; // Exactly 1 PP left

  // Turn 1 consumes the last PP
  const t1 = Engine.resolveTurn(battle, {
    player: makeMoveAction(19),
    enemy: makeMoveAction(14)
  });
  assert.equal(t1.state.player.moves[0].currentPp, 0);

  // Turn 2 proceeds with 0 PP left
  const t2 = Engine.resolveTurn(t1.state, {
    player: makeMoveAction(19),
    enemy: makeMoveAction(14)
  });
  assert.ok(t2.events.some(e => e.type === Constants.BATTLE_EVENTS.MOVE_USED && e.actor === 'player'));
  assert.ok(t2.events.some(e => e.type === Constants.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player'));
  assert.equal(t2.state.player.moves[0].currentPp, 0);
  assert.equal(t2.state.player.twoTurnMove, null);
});

test('P6 Two-turn: locked move continuation ignores alternative submitted move or switch', () => {
  const playerMon = makeMon(1, [19, 14], ['flying'], { speed: 200 });
  const enemyMon = makeMon(2, [14], ['normal'], { speed: 100 });
  const battle = Engine.createBattle(playerMon, enemyMon);

  const t1 = Engine.resolveTurn(battle, {
    player: makeMoveAction(19),
    enemy: makeMoveAction(14)
  });

  // Try to submit moveId 14 (swords-dance) instead on Turn 2
  const t2 = Engine.resolveTurn(t1.state, {
    player: makeMoveAction(14),
    enemy: makeMoveAction(14)
  });

  // Engine forces Fly (#19) execution
  const used = t2.events.find(e => e.type === Constants.BATTLE_EVENTS.MOVE_USED && e.actor === 'player');
  assert.ok(used);
  assert.equal(used.moveId, 19);
});

// -----------------------------------------------------------------------------
// 4. SEMI-INVULNERABILITY: MISSES & NON-BYPASS
// -----------------------------------------------------------------------------
test('P6 Semi-invulnerability: normal moves miss defender in airborne/underground/underwater', () => {
  const states = [
    { moveId: 19, state: 'airborne' },
    { id: 91, moveId: 91, state: 'underground' },
    { id: 291, moveId: 291, state: 'underwater' }
  ];

  for (const s of states) {
    const enemyMon = makeMon(2, [s.moveId], ['normal'], { speed: 200 }); // Faster, charges first
    const playerMon = makeMon(1, [33], ['normal'], { speed: 100 }); // Tackle
    const battle = Engine.createBattle(playerMon, enemyMon);

    const t1 = Engine.resolveTurn(battle, {
      player: makeMoveAction(33),
      enemy: makeMoveAction(s.moveId)
    });

    // Enemy charged and entered semi-invulnerable state
    assert.equal(t1.state.enemy.twoTurnMove.state, s.state);

    // Player Tackle missed with SEMI_INVULNERABLE reason
    const missEvent = t1.events.find(e => e.type === Constants.BATTLE_EVENTS.MOVE_MISSED && e.actor === 'player');
    assert.ok(missEvent, `Player move should miss defender in ${s.state}`);
    assert.equal(missEvent.reason, 'SEMI_INVULNERABLE');
    assert.equal(t1.state.player.lastMoveFailed, true);
    assert.equal(t1.events.some(e => e.type === Constants.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player'), false);
  }
});

test('P6 Semi-invulnerability: always-hit moves (Swift, Aerial Ace) and Hyper Drill cannot hit semi-invulnerable targets', () => {
  const unbypassingMoves = [129, 332, 887]; // Swift, Aerial Ace, Hyper Drill

  for (const moveId of unbypassingMoves) {
    const enemyMon = makeMon(2, [19], ['flying'], { speed: 200 }); // Fly -> airborne
    const playerMon = makeMon(1, [moveId], ['normal'], { speed: 100 });
    const battle = Engine.createBattle(playerMon, enemyMon);

    const t1 = Engine.resolveTurn(battle, {
      player: makeMoveAction(moveId),
      enemy: makeMoveAction(19)
    });

    const missEvent = t1.events.find(e => e.type === Constants.BATTLE_EVENTS.MOVE_MISSED && e.actor === 'player');
    assert.ok(missEvent, `Move ${moveId} should miss airborne target`);
    assert.equal(missEvent.reason, 'SEMI_INVULNERABLE');
  }
});

test('P6 Semi-invulnerability: Solar Beam has NO semi-invulnerability and attacker can be hit on Turn 1', () => {
  const enemyMon = makeMon(2, [76], ['grass'], { speed: 200 }); // Solar Beam
  const playerMon = makeMon(1, [33], ['normal'], { speed: 100 }); // Tackle
  const battle = Engine.createBattle(playerMon, enemyMon);

  const t1 = Engine.resolveTurn(battle, {
    player: makeMoveAction(33),
    enemy: makeMoveAction(76)
  });

  // Enemy entered charge with null state
  assert.equal(t1.state.enemy.twoTurnMove.state, null);

  // Player Tackle hit successfully
  assert.ok(t1.events.some(e => e.type === Constants.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player'));
  assert.equal(t1.events.some(e => e.type === Constants.BATTLE_EVENTS.MOVE_MISSED && e.actor === 'player'), false);
});

// -----------------------------------------------------------------------------
// 5. EXCEPTIONS HITTING SEMI-INVULNERABLE STATES
// -----------------------------------------------------------------------------
test('P6 Semi-invulnerability: Airborne exceptions (Gust 2x, Twister 2x, Thunder 1x, Hurricane 1x, Sky Uppercut 1x, Poison Toxic hits, non-Poison Toxic misses)', () => {
  // Gust (16) hits with 2x multiplier
  {
    const enemyMon = makeMon(2, [19], ['flying'], { speed: 200 });
    const playerMon = makeMon(1, [16], ['flying'], { speed: 100 });
    const battle = Engine.createBattle(playerMon, enemyMon);
    const t1 = Engine.resolveTurn(battle, { player: makeMoveAction(16), enemy: makeMoveAction(19) });
    const dmg = t1.events.find(e => e.type === Constants.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.ok(dmg, 'Gust should hit airborne target');
    assert.equal(Constants.getSemiInvulnerableDamageMultiplier({ id: 16 }, 'airborne'), 2);
  }

  // Twister (239) hits with 2x multiplier
  {
    assert.equal(Constants.canHitSemiInvulnerable({ id: 239 }, 'airborne'), true);
    assert.equal(Constants.getSemiInvulnerableDamageMultiplier({ id: 239 }, 'airborne'), 2);
  }

  // Thunder (87), Hurricane (542), Sky Uppercut (327) hit with 1x multiplier
  for (const id of [87, 542, 327]) {
    assert.equal(Constants.canHitSemiInvulnerable({ id }, 'airborne'), true);
    assert.equal(Constants.getSemiInvulnerableDamageMultiplier({ id }, 'airborne'), 1);
  }

  // Toxic (92) used by Poison-type hits airborne target
  {
    const enemyMon = makeMon(2, [19], ['flying'], { speed: 200 });
    const playerPoison = makeMon(1, [92], ['poison'], { speed: 100 });
    const battle = Engine.createBattle(playerPoison, enemyMon);
    const t1 = Engine.resolveTurn(battle, { player: makeMoveAction(92), enemy: makeMoveAction(19) });
    assert.ok(t1.events.some(e => e.type === Constants.BATTLE_EVENTS.STATUS_APPLIED && e.target === 'enemy' && e.statusCondition === 'toxic'));
  }

  // Toxic (92) used by non-Poison type misses airborne target
  {
    const enemyMon = makeMon(2, [19], ['flying'], { speed: 200 });
    const playerNormal = makeMon(1, [92], ['normal'], { speed: 100 });
    const battle = Engine.createBattle(playerNormal, enemyMon);
    const t1 = Engine.resolveTurn(battle, { player: makeMoveAction(92), enemy: makeMoveAction(19) });
    const miss = t1.events.find(e => e.type === Constants.BATTLE_EVENTS.MOVE_MISSED && e.actor === 'player');
    assert.ok(miss);
    assert.equal(miss.reason, 'SEMI_INVULNERABLE');
  }
});

test('P6 Semi-invulnerability: Underground exceptions (Earthquake 2x, Fissure misses, Poison Toxic)', () => {
  // Earthquake (89) hits with 2x multiplier
  {
    const enemyMon = makeMon(2, [91], ['ground'], { speed: 200 });
    const playerMon = makeMon(1, [89], ['ground'], { speed: 100 });
    const battle = Engine.createBattle(playerMon, enemyMon);
    const t1 = Engine.resolveTurn(battle, { player: makeMoveAction(89), enemy: makeMoveAction(91) });
    const dmg = t1.events.find(e => e.type === Constants.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.ok(dmg, 'Earthquake should hit underground target');
    assert.equal(Constants.getSemiInvulnerableDamageMultiplier({ id: 89 }, 'underground'), 2);
  }

  // Fissure (90) hits underground target
  {
    assert.equal(Constants.canHitSemiInvulnerable({ id: 90 }, 'underground'), false);
  }

  // Toxic by Poison hits underground
  {
    const enemyMon = makeMon(2, [91], ['ground'], { speed: 200 });
    const playerPoison = makeMon(1, [92], ['poison'], { speed: 100 });
    const battle = Engine.createBattle(playerPoison, enemyMon);
    const t1 = Engine.resolveTurn(battle, { player: makeMoveAction(92), enemy: makeMoveAction(91) });
    assert.ok(t1.events.some(e => e.type === Constants.BATTLE_EVENTS.STATUS_APPLIED && e.target === 'enemy' && e.statusCondition === 'toxic'));
  }
});

test('P6 Semi-invulnerability: Underwater exceptions (Surf 2x, Poison Toxic)', () => {
  // Surf (57) hits with 2x multiplier
  {
    const enemyMon = makeMon(2, [291], ['water'], { speed: 200 });
    const playerMon = makeMon(1, [57], ['water'], { speed: 100 });
    const battle = Engine.createBattle(playerMon, enemyMon);
    const t1 = Engine.resolveTurn(battle, { player: makeMoveAction(57), enemy: makeMoveAction(291) });
    const dmg = t1.events.find(e => e.type === Constants.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.ok(dmg, 'Surf should hit underwater target');
    assert.equal(Constants.getSemiInvulnerableDamageMultiplier({ id: 57 }, 'underwater'), 2);
  }

  // Toxic by Poison hits underwater
  {
    const enemyMon = makeMon(2, [291], ['water'], { speed: 200 });
    const playerPoison = makeMon(1, [92], ['poison'], { speed: 100 });
    const battle = Engine.createBattle(playerPoison, enemyMon);
    const t1 = Engine.resolveTurn(battle, { player: makeMoveAction(92), enemy: makeMoveAction(291) });
    assert.ok(t1.events.some(e => e.type === Constants.BATTLE_EVENTS.STATUS_APPLIED && e.target === 'enemy' && e.statusCondition === 'toxic'));
  }
});

// -----------------------------------------------------------------------------
// 6. SECONDARY EFFECT: BOUNCE PARALYSIS CHANCE
// -----------------------------------------------------------------------------
test('P6 Bounce: 30% paralysis chance applied on hit when statusRoll <= 30', () => {
  const playerMon = makeMon(1, [340], ['flying'], { speed: 200 });
  const enemyMon = makeMon(2, [14], ['normal'], { speed: 100 });
  const battle = Engine.createBattle(playerMon, enemyMon);

  const t1 = Engine.resolveTurn(battle, { player: makeMoveAction(340), enemy: makeMoveAction(14) });

  // Turn 2 with secondaryEffectRoll = 25 (<= 30) -> paralysis applied
  const t2Success = Engine.resolveTurn(t1.state, {
    player: makeMoveAction(340, { secondaryEffectRoll: 25 }),
    enemy: makeMoveAction(14)
  });
  assert.equal(t2Success.state.enemy.statusCondition, 'paralysis');
  assert.ok(t2Success.events.some(e => e.type === Constants.BATTLE_EVENTS.STATUS_APPLIED && e.target === 'enemy' && e.statusCondition === 'paralysis'));

  // Turn 2 with secondaryEffectRoll = 50 (> 30) -> no paralysis
  const t2Fail = Engine.resolveTurn(t1.state, {
    player: makeMoveAction(340, { secondaryEffectRoll: 50 }),
    enemy: makeMoveAction(14)
  });
  assert.equal(t2Fail.state.enemy.statusCondition, null);
});

// -----------------------------------------------------------------------------
// 7. IMPEDIMENTS & CANCELLATIONS
// -----------------------------------------------------------------------------
test('P6 Impediments: Turn 1 immobilization prevents charge and preserves PP', () => {
  const playerMon = makeMon(1, [19], ['flying'], { speed: 200 });
  playerMon.statusCondition = 'sleep';
  playerMon.sleepTurns = 2;
  const enemyMon = makeMon(2, [14], ['normal'], { speed: 100 });
  const battle = Engine.createBattle(playerMon, enemyMon);

  const res = Engine.resolveTurn(battle, {
    player: makeMoveAction(19),
    enemy: makeMoveAction(14)
  });

  assert.equal(res.state.player.twoTurnMove, null);
  assert.equal(res.state.player.moves[0].currentPp, 15); // PP not consumed
  assert.equal(res.events.some(e => e.type === Constants.BATTLE_EVENTS.MOVE_PREPARED), false);
});

test('P6 Impediments: Turn 2 full paralysis cancels twoTurnMove and clears state', () => {
  const playerMon = makeMon(1, [19], ['flying'], { speed: 200 });
  const enemyMon = makeMon(2, [14], ['normal'], { speed: 100 });
  const battle = Engine.createBattle(playerMon, enemyMon);

  const t1 = Engine.resolveTurn(battle, { player: makeMoveAction(19), enemy: makeMoveAction(14) });
  assert.ok(t1.state.player.twoTurnMove);

  // Apply paralysis before Turn 2
  t1.state.player.statusCondition = 'paralysis';

  const t2 = Engine.resolveTurn(t1.state, {
    player: makeMoveAction(19, { statusRoll: 10 }), // <= 25 -> fully paralyzed
    enemy: makeMoveAction(14)
  });

  assert.equal(t2.state.player.twoTurnMove, null);
  assert.equal(t2.events.some(e => e.type === Constants.BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), false);
  assert.ok(t2.events.some(e => e.type === Constants.BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player' && e.statusCondition === 'paralysis'));
});

test('P6 Impediments: Turn 2 confusion self-damage cancels twoTurnMove', () => {
  const playerMon = makeMon(1, [19], ['flying'], { speed: 200 });
  const enemyMon = makeMon(2, [14], ['normal'], { speed: 100 });
  const battle = Engine.createBattle(playerMon, enemyMon);

  const t1 = Engine.resolveTurn(battle, { player: makeMoveAction(19), enemy: makeMoveAction(14) });
  t1.state.player.statusCondition = 'confusion';
  t1.state.player.confusionTurns = 2;

  const t2 = Engine.resolveTurn(t1.state, {
    player: makeMoveAction(19, { confusionHitRoll: 10 }), // <= 33 -> hurts itself
    enemy: makeMoveAction(14)
  });

  assert.equal(t2.state.player.twoTurnMove, null);
  assert.equal(t2.events.some(e => e.type === Constants.BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), false);
  assert.ok(t2.events.some(e => e.type === Constants.BATTLE_EVENTS.CONFUSION_DAMAGE && e.target === 'player'));
});

test('P6 Faint & Switch: twoTurnMove is cleared upon faint or forced replacement', () => {
  const s = Engine.createTeamBattle(
    [makeMon(1, [19], ['flying'], { hp: 50, currentHp: 50 }), makeMon(3, [14]), makeMon(5, [14])],
    [makeMon(2, [33], ['normal'], { speed: 300 }), makeMon(4, [14]), makeMon(6, [14])] // Faster enemy
  );

  // Turn 1: player charges fly
  const t1 = Engine.resolveTurn(s, {
    player: makeMoveAction(19),
    enemy: makeMoveAction(33)
  });
  assert.ok(t1.state.player.team[0].twoTurnMove);

  // Turn 2: enemy attacks first with super strong move and KOs player
  const t2 = Engine.resolveTurn(t1.state, {
    player: makeMoveAction(19),
    enemy: makeMoveAction(33, { damageRoll: 100 })
  });

  assert.equal(t2.state.player.team[0].twoTurnMove, null);
  assert.equal(t2.state.player.team[1].twoTurnMove, null);
});

test('P6 Target switching on Turn 2: attacks the newly switched-in defender', () => {
  const s = Engine.createTeamBattle(
    [makeMon(1, [19], ['flying'], { speed: 200 }), makeMon(3, [14]), makeMon(5, [14])],
    [makeMon(2, [14]), makeMon(4, [14], ['rock'], { hp: 1000, currentHp: 1000 }), makeMon(6, [14])]
  );

  // Turn 1: player charges Fly
  const t1 = Engine.resolveTurn(s, {
    player: makeMoveAction(19),
    enemy: makeMoveAction(14)
  });

  // Turn 2: enemy switches to mon 4
  const t2 = Engine.resolveTurn(t1.state, {
    player: makeMoveAction(19),
    enemy: { type: 'SWITCH', targetPokemonId: 4 }
  });

  assert.equal(t2.state.enemy.activeIndex, 1);
  const dmg = t2.events.find(e => e.type === Constants.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
  assert.ok(dmg);
  assert.equal(dmg.target, 'enemy');
  assert.equal(t2.state.enemy.team[1].currentHp < 1000, true);
});

// -----------------------------------------------------------------------------
// 8. SLEEP TALK EXCLUSION
// -----------------------------------------------------------------------------
test('P6 Sleep Talk: excludes two-turn moves from candidate pool', () => {
  const playerMon = makeMon(1, [214, 19, 76, 91], ['normal']); // Sleep Talk + Fly + Solar Beam + Dig
  playerMon.statusCondition = 'sleep';
  playerMon.sleepTurns = 3;
  const enemyMon = makeMon(2, [14], ['normal']);
  const battle = Engine.createBattle(playerMon, enemyMon);

  const res = Engine.resolveTurn(battle, {
    player: makeMoveAction(214),
    enemy: makeMoveAction(14)
  });

  // Sleep Talk fails because no valid moves exist (all other 3 moves are two-turn moves)
  assert.ok(res.events.some(e => e.type === Constants.BATTLE_EVENTS.MOVE_FAILED && e.reason === 'NO_CALLABLE_MOVE'));
  assert.equal(res.state.player.twoTurnMove, null);
});

// -----------------------------------------------------------------------------
// 9. EVALUATOR & AI BEHAVIOR
// -----------------------------------------------------------------------------
test('P6 Evaluator: Turn 1 of two-turn move reports expectedDamage 0, chargingTurn true, projectedDamage > 0', () => {
  const attacker = Engine.createCombatant(makeMon(1, [19], ['flying']));
  const defender = Engine.createCombatant(makeMon(2, [14], ['normal']));

  const evaluation = Evaluator.evaluateMove(attacker, defender, attacker.moves[0]);
  assert.equal(evaluation.expectedDamage, 0);
  assert.equal(evaluation.isTwoTurnMove, true);
  assert.equal(evaluation.chargingTurn, true);
  assert.ok(evaluation.projectedDamage > 0);
  assert.equal(evaluation.guaranteedKo, false);
  assert.equal(evaluation.possibleKo, false);
});

test('P6 Evaluator: against semi-invulnerable target, evaluates hitting moves and zero damage for non-hitting moves', () => {
  const attacker = Engine.createCombatant(makeMon(1, [33, 16], ['flying'])); // Tackle, Gust
  const defender = Engine.createCombatant(makeMon(2, [19], ['flying']));
  defender.twoTurnMove = { id: 19, state: 'airborne', turn: 1 };

  // Tackle (#33) cannot hit airborne
  const evalTackle = Evaluator.evaluateMove(attacker, defender, attacker.moves[0]);
  assert.equal(evalTackle.expectedDamage, 0);
  assert.equal(evalTackle.maxDamage, 0);

  // Gust (#16) hits airborne with 2x damage
  const evalGust = Evaluator.evaluateMove(attacker, defender, attacker.moves[1]);
  assert.ok(evalGust.expectedDamage > 0);
});

test('P6 AI: locked move continuation chosen with reason TWO_TURN_LOCKED', () => {
  const battle = Engine.createBattle(
    makeMon(1, [14], ['normal']),
    makeMon(2, [19, 14], ['flying'])
  );
  battle.enemy.twoTurnMove = { id: 19, name: 'fly', state: 'airborne', turn: 1 };

  const decision = AI.chooseAction(battle, 'enemy');
  assert.equal(decision.action.type, 'MOVE');
  assert.equal(decision.action.moveId, 19);
  assert.equal(decision.diagnostics.reason, 'TWO_TURN_LOCKED');
});

// -----------------------------------------------------------------------------
// 10. PRESENTATION & UI FEEDBACK
// -----------------------------------------------------------------------------
test('P6 Presentation & UI: formats semi-invulnerable miss feedback and prep reasons', async () => {
  let displayedMsg = '';
  const adapter = new BattleUiDomAdapter({
    view: {
      displayMessage: msg => { displayedMsg = msg; }
    }
  });

  // Miss feedback
  await adapter.execute({
    type: 'MOVE_MISS_FEEDBACK',
    reason: 'SEMI_INVULNERABLE',
    pokemonName: 'Pidgeot'
  });
  assert.equal(displayedMsg, 'O alvo está fora de alcance!');

  // Prep reasons
  for (const reason of ['CHARGE_SOLAR', 'FLY_UP', 'DIG_UNDERGROUND', 'DIVE_UNDERWATER', 'BOUNCE_UP']) {
    await adapter.execute({
      type: 'MOVE_PREPARED',
      pokemonName: 'Pidgeot',
      reason
    });
    assert.ok(displayedMsg.length > 0);
  }
});

test('P6 UI: BattleView disables switch and displays continuation button on Turn 2', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const view = new BattleView({ container });
  const battle = Engine.createTeamBattle(
    [makeMon(1, [19], ['flying']), makeMon(3, [14]), makeMon(5, [14])],
    [makeMon(2, [14]), makeMon(4, [14]), makeMon(6, [14])]
  );
  battle.player.team[0].twoTurnMove = { id: 19, name: 'fly', state: 'airborne', turn: 1 };

  view.renderActiveBattleView(battle, 'AWAITING_PLAYER_ACTION');

  assert.match(container.innerHTML, /id="btnTwoTurnContinue"/);
  assert.match(container.innerHTML, /Executar FLY/);
  assert.match(container.innerHTML, /id="btnOpenSwitch"[^>]*disabled/);
});

// -----------------------------------------------------------------------------
// 11. END-TO-END DETERMINISTIC SESSION
// -----------------------------------------------------------------------------
test('P6 Session: complete 2-turn lifecycle through BattleSessionController', async () => {
  const pTeam = [makeMon(1, [19], ['flying']), makeMon(3, [14]), makeMon(5, [14])];
  const eTeam = [makeMon(2, [14], ['normal']), makeMon(4, [14]), makeMon(6, [14])];

  const session = new BattleSessionController({
    teamStore: { load: () => [1, 3, 5] },
    hydrator: { hydrateTeam: async () => pTeam },
    opponentFactory: { createOpponentTeam: async () => eTeam },
    randomSource: new DeterministicRandomSource({ accuracySequence: [1, 1], damageRollSequence: [100, 100] }),
    presentationEngine: { play: async () => {}, playCommands: async () => {} }
  });

  await session.prepareBattle({ playerTeamIds: [1, 3, 5] });
  await session.startBattle();

  // Turn 1: player selects Fly
  await session.submitPlayerMove(19);
  assert.equal(session.battleState.player.team[0].twoTurnMove.state, 'airborne');
  assert.equal(session.battleState.player.team[0].moves[0].currentPp, 14);

  // Attempting to switch is blocked and ignored while charging
  const activeBefore = session.battleState.player.activeIndex;
  await session.submitPlayerSwitch(3);
  assert.equal(session.battleState.player.activeIndex, activeBefore);
  assert.ok(session.battleState.player.team[0].twoTurnMove);

  // Turn 2: player continues Fly
  await session.submitPlayerMove(19);
  assert.equal(session.battleState.player.team[0].twoTurnMove, null);
  assert.equal(session.battleState.player.team[0].moves[0].currentPp, 14);
});

// -----------------------------------------------------------------------------
// 12. CAMPAIGN MOVE CUSTOMIZATION INTEGRATION
// -----------------------------------------------------------------------------
test('P6 Campaign: Dugtrio, Spoink, Pidgeot, Wailord and Exeggutor receive curated pilot options', () => {
  const extras = CampaignOptionsCatalog.byId;
  const fixed = CampaignFixedCatalog.byId;

  // Species count after P6 closure is 524
  assert.equal(Object.keys(extras).length, 524);

  // Dugtrio (#51) receives dig
  assert.ok(extras[51].some(m => m.id === 91 && m.name === 'dig'));
  assert.equal(fixed[51].moves.length, 4);

  // Spoink (#325) receives bounce
  assert.ok(extras[325].some(m => m.id === 340 && m.name === 'bounce'));
  assert.equal(fixed[325].moves.length, 4);

  // Pidgeot (#18) has wing-attack and fly (replaces swift)
  assert.ok(extras[18].some(m => m.id === 19 && m.name === 'fly'));
  assert.ok(extras[18].some(m => m.id === 17 && m.name === 'wing-attack'));
  assert.equal(extras[18].some(m => m.id === 129), false);
  assert.equal(fixed[18].moves.length, 4);

  // Wailord (#321) has hydro-pump and dive (replaces hyper-voice)
  assert.ok(extras[321].some(m => m.id === 291 && m.name === 'dive'));
  assert.ok(extras[321].some(m => m.id === 56 && m.name === 'hydro-pump'));
  assert.equal(extras[321].some(m => m.id === 304), false);
  assert.equal(fixed[321].moves.length, 4);

  // Exeggutor (#103) has power-whip and solar-beam (replaces strength)
  assert.ok(extras[103].some(m => m.id === 76 && m.name === 'solar-beam'));
  assert.ok(extras[103].some(m => m.id === 438 && m.name === 'power-whip'));
  assert.equal(extras[103].some(m => m.id === 70), false);
  assert.equal(fixed[103].moves.length, 4);
});
