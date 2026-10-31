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
const CameraResolver = require('../../assets/js/camera/battle-camera-resolver');
const { MoveVfxController } = require('../../assets/js/vfx/move-vfx-controller');
const { MoveVfxDomRenderer } = require('../../assets/js/vfx/move-vfx-dom-renderer');
const { BattleUiDomAdapter } = require('../../assets/js/ui/battle-ui-adapter');
const { BattleView } = require('../../assets/js/ui/battle-view');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller');
const { BattleRandomSource, DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source');
const CampaignOptionsCatalog = require('../../assets/js/campaign/campaign-move-options-catalog');
const CampaignFixedCatalog = require('../../assets/js/campaign/campaign-fixed-battle-catalog');

const statusById = Object.fromEntries(
  Object.values(Constants.SUPPORTED_STATUS_MOVES).map(m => [Number(m.id), m])
);
const getMove = id => Constants.KNOWN_CATALOG_MOVES[id] || statusById[Number(id)] || Constants.SUPPORTED_STATUS_MOVES['swords-dance'];

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
test('P6 Protect & Detect: canonical metadata and catalog definitions', () => {
  for (const id of [182, 197]) {
    const move = Constants.PROTECT_MOVES[id];
    assert.ok(move, `Move ${id} must exist in PROTECT_MOVES`);
    assert.equal(move.id, id);
    assert.equal(move.damageClass, 'status');
    assert.equal(move.power, null);
    assert.equal(move.accuracy, null);
    assert.equal(move.priority, 4);
    assert.equal(move.target, 'self');
    assert.ok(Constants.isProtectMove(move));
    assert.ok(Constants.isProtectMove({ id }));
    assert.ok(Constants.isProtectMove({ name: move.name }));
    assert.equal(Constants.getMovePriority(move), 4);

    const capability = Constants.getMoveCapability(move);
    assert.equal(capability.supportLevel, 'FULL');
    assert.deepEqual(capability.requiredMechanics, ['STATUS', 'PROTECTION', 'PRIORITY']);

    assert.equal(Constants.validateMoveData(move), true);
    assert.equal(SessionConstants.isMechanicallySupportedMove(move), true);

    const model = MoveModel.createMove(move);
    assert.equal(model.id, id);
    assert.equal(model.power, null);
    assert.equal(model.accuracy, null);
    assert.equal(model.damageClass, 'status');
    assert.equal(model.priority, 4);
  }

  assert.equal(Constants.PROTECT_MOVES[182].type, 'normal');
  assert.equal(Constants.PROTECT_MOVES[182].pp, 10);
  assert.equal(Constants.PROTECT_MOVES[197].type, 'fighting');
  assert.equal(Constants.PROTECT_MOVES[197].pp, 5);

  assert.equal(Constants.isProtectMove({ id: 33, name: 'tackle' }), false);
  assert.equal(Constants.isProtectMove({ id: 14, name: 'swords-dance' }), false);

  // Validation rejects invalid power
  assert.equal(Constants.validateMoveData({ ...Constants.PROTECT_MOVES[182], power: 50 }), false);
});

// -----------------------------------------------------------------------------
// 2. PRIORITY RESOLUTION (+4)
// -----------------------------------------------------------------------------
test('P6 Protect & Detect: priority +4 acts before priority +3, +2, +1, 0 regardless of speed', () => {
  const pSlow = makeMon(1, [182], ['normal'], { speed: 10 });
  const eFast = makeMon(2, [252, 98, 93, 33], ['normal'], { speed: 500 }); // Fake Out (+3), Quick Attack (+1), etc.

  // Protect (+4) vs Fake Out (+3)
  const s1 = Engine.createBattle(pSlow, eFast);
  const r1 = Engine.resolveTurn(s1, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(252)
  });
  const firstMove1 = r1.events.find(e => e.type === 'MOVE_USED');
  assert.equal(firstMove1.actor, 'player');
  assert.equal(firstMove1.moveId, 182);

  // Detect (+4) vs Quick Attack (+1)
  const pDetect = makeMon(1, [197], ['normal'], { speed: 10 });
  const s2 = Engine.createBattle(pDetect, eFast);
  const r2 = Engine.resolveTurn(s2, {
    player: makeMoveAction(197, { protectRoll: 1 }),
    enemy: makeMoveAction(98)
  });
  const firstMove2 = r2.events.find(e => e.type === 'MOVE_USED');
  assert.equal(firstMove2.actor, 'player');
  assert.equal(firstMove2.moveId, 197);

  // Protect vs Protect: higher speed acts first
  const pFastProtect = makeMon(1, [182], ['normal'], { speed: 300 });
  const eSlowProtect = makeMon(2, [182], ['normal'], { speed: 100 });
  const s3 = Engine.createBattle(pFastProtect, eSlowProtect);
  const r3 = Engine.resolveTurn(s3, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(182, { protectRoll: 1 })
  });
  const movesUsed = r3.events.filter(e => e.type === 'MOVE_USED');
  assert.equal(movesUsed[0].actor, 'player');
  assert.equal(movesUsed[1].actor, 'enemy');
});

// -----------------------------------------------------------------------------
// 3. ACTION INTERCEPTION & BLOCKED ATTACKS
// -----------------------------------------------------------------------------
test('P6 Protect: blocks standard physical/special damaging moves, consuming PP with zero damage/recoil', () => {
  const p = makeMon(1, [182]);
  const e = makeMon(2, [33, 58]); // Tackle (physical), Ice Beam (special)
  const s = Engine.createBattle(p, e);

  // Turn 1: Player protects, Enemy uses Tackle
  const r1 = Engine.resolveTurn(s, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });

  assert.equal(r1.state.player.isProtected, false); // Cleaned up at turn end!
  assert.equal(r1.state.player.currentHp, 2000); // 0 damage
  assert.equal(r1.state.enemy.moves[0].currentPp, e.moves[0].pp - 1); // Enemy PP consumed
  assert.equal(r1.state.enemy.lastMoveFailed, true);

  const blockEvent = r1.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_PROTECT');
  assert.ok(blockEvent);
  assert.equal(blockEvent.actor, 'enemy');
  assert.equal(blockEvent.moveId, 33);
  assert.equal(r1.events.some(e => e.type === 'DAMAGE_APPLIED'), false);

  // Presentation mapping
  const mapped = Mapper.mapEvents(r1.events);
  assert.ok(mapped.length > 0);
  const moveAnnounce = mapped.find(c => c.type === 'MOVE_ANNOUNCEMENT' && c.moveId === 33);
  assert.ok(moveAnnounce);
  assert.equal(moveAnnounce.isBlocked, true);
});

test('P6 Protect: blocks multi-hit moves with 0 hits and 0 damage', () => {
  const p = makeMon(1, [182]);
  const e = makeMon(2, [331]); // Bullet Seed (multihit)
  const s = Engine.createBattle(p, e);

  const r = Engine.resolveTurn(s, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(331, { hitCount: 5 })
  });

  assert.equal(r.state.player.currentHp, 2000);
  assert.equal(r.state.enemy.lastMoveFailed, true);
  assert.equal(r.events.some(e => e.type === 'DAMAGE_APPLIED'), false);
  assert.ok(r.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_PROTECT'));
});

test('P6 Protect: blocks fixed, level-based and fractional damage', () => {
  // Sonic Boom (49), Seismic Toss (69), Super Fang (162)
  for (const mid of [49, 69, 162]) {
    const p = makeMon(1, [182]);
    const e = makeMon(2, [mid]);
    const s = Engine.createBattle(p, e);
    const r = Engine.resolveTurn(s, {
      player: makeMoveAction(182, { protectRoll: 1 }),
      enemy: makeMoveAction(mid)
    });
    assert.equal(r.state.player.currentHp, 2000);
    assert.equal(r.state.enemy.lastMoveFailed, true);
    assert.equal(r.events.some(e => e.type === 'DAMAGE_APPLIED'), false);
    assert.ok(r.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_PROTECT'), `Move ${mid} blocked`);
  }
});

test('P6 Protect: blocked recharge move does NOT trigger recharge', () => {
  const p = makeMon(1, [182]);
  const e = makeMon(2, [63]); // Hyper Beam (#63)
  const s = Engine.createBattle(p, e);

  const r = Engine.resolveTurn(s, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(63)
  });

  assert.equal(r.state.player.currentHp, 2000);
  assert.equal(r.state.enemy.rechargeMoveId, null); // No recharge scheduled!
  assert.equal(r.state.enemy.moves[0].currentPp, e.moves[0].pp - 1); // PP consumed
  assert.equal(r.state.enemy.lastMoveFailed, true);
});

test('P6 Protect: blocks negative status and stat-drop moves', () => {
  // Thunder Wave (86), Will-O-Wisp (261), Confuse Ray (109), Venom Drench (599)
  for (const mid of [86, 261, 109, 599]) {
    const p = makeMon(1, [182]);
    const e = makeMon(2, [mid]);
    const s = Engine.createBattle(p, e);

    const r = Engine.resolveTurn(s, {
      player: makeMoveAction(182, { protectRoll: 1 }),
      enemy: makeMoveAction(mid)
    });

    assert.equal(r.state.player.statusCondition, null);
    assert.equal(r.state.player.confusionTurns, 0);
    assert.equal(r.state.player.statStages.attack, 0);
    assert.equal(r.state.enemy.lastMoveFailed, true);
    assert.ok(r.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_PROTECT'));
  }
});

test('P6 Protect: self-targeting moves BYPASS defender protection', () => {
  // Swords Dance (14), Calm Mind (347), Rest (156)
  const pProtect = makeMon(1, [182]);
  const eSelfBuff = makeMon(2, [14, 347, 156]);
  const s = Engine.createBattle(pProtect, eSelfBuff);

  const r = Engine.resolveTurn(s, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(14) // Swords Dance
  });

  assert.equal(r.state.enemy.statStages.attack, 2); // Buff applied successfully!
  assert.equal(r.state.enemy.lastMoveFailed, false);
  assert.equal(r.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'), false);
});

test('P6 Protect: Surging Strikes (#818) is blocked (Unseen Fist is P7)', () => {
  const p = makeMon(1, [182]);
  const e = makeMon(2, [818]); // Surging Strikes
  const s = Engine.createBattle(p, e);

  const r = Engine.resolveTurn(s, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(818, { hitCount: 3 })
  });

  assert.equal(r.state.player.currentHp, 2000);
  assert.equal(r.state.enemy.lastMoveFailed, true);
  assert.ok(r.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_PROTECT'));
});

// -----------------------------------------------------------------------------
// 4. CONSECUTIVE USE SCALING & ALTERNATION
// -----------------------------------------------------------------------------
test('P6 Protect & Detect: consecutive scaling (1/1, 1/3, 1/9, 1/27, 1/81, 1/243, 1/729)', () => {
  const p = makeMon(1, [182, 197]);
  const e = makeMon(2, [33]);
  let state = Engine.createBattle(p, e);

  // Turn 1: 1st use (count 0 -> 100%)
  let r = Engine.resolveTurn(state, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r.state.player.stallCount, 1);
  state = r.state;

  // Turn 2: 2nd use (count 1 -> denominator 3). Roll 1 succeeds.
  r = Engine.resolveTurn(state, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r.state.player.stallCount, 2);
  state = r.state;

  // Turn 3: 3rd use (count 2 -> denominator 9). Roll 1 succeeds.
  r = Engine.resolveTurn(state, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r.state.player.stallCount, 3);
  state = r.state;

  // Turn 4: 4th use (count 3 -> denominator 27). Roll 1 succeeds.
  r = Engine.resolveTurn(state, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r.state.player.stallCount, 4);
  state = r.state;

  // Turn 5: 5th use (count 4 -> denominator 81). Roll 1 succeeds.
  r = Engine.resolveTurn(state, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r.state.player.stallCount, 5);
  state = r.state;

  // Turn 6: 6th use (count 5 -> denominator 243). Roll 1 succeeds.
  r = Engine.resolveTurn(state, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r.state.player.stallCount, 6);
  state = r.state;

  // Turn 7: 7th use (count 6 -> denominator 729 cap). Roll 1 succeeds, stallCount capped at 6.
  r = Engine.resolveTurn(state, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r.state.player.stallCount, 6);
  state = r.state;

  // Turn 8: 8th use with failure roll (roll 2 out of 729).
  r = Engine.resolveTurn(state, {
    player: makeMoveAction(182, { protectRoll: 2 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r.state.player.stallCount, 0); // Reset to 0!
  assert.equal(r.state.player.lastMoveFailed, true);
  assert.ok(r.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'PROTECT_FAILED'));
  // And enemy Tackle hits because player is NOT protected!
  assert.ok(r.events.some(e => e.type === 'DAMAGE_APPLIED' && e.source === 'enemy'));
});

test('P6 Protect & Detect: alternating moves share the stall counter', () => {
  const p = makeMon(1, [182, 197]);
  const e = makeMon(2, [33]);
  let state = Engine.createBattle(p, e);

  // Turn 1: Protect (#182) -> count 1
  let r = Engine.resolveTurn(state, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r.state.player.stallCount, 1);

  // Turn 2: Detect (#197) -> count 2 (rolls against denom 3)
  r = Engine.resolveTurn(r.state, {
    player: makeMoveAction(197, { protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r.state.player.stallCount, 2);

  // Turn 3: Protect (#182) with roll 2 -> fails against denom 9
  r = Engine.resolveTurn(r.state, {
    player: makeMoveAction(182, { protectRoll: 2 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r.state.player.stallCount, 0);
  assert.ok(r.events.some(e => e.reason === 'PROTECT_FAILED'));
});

test('P6 Protect & Detect: float roll behavior', () => {
  const p = makeMon(1, [182]);
  const e = makeMon(2, [33]);
  const s = Engine.createBattle(p, e);
  s.player.stallCount = 1; // denominator = 3

  // Float roll < 1/3 (e.g. 0.25) -> success
  const rPass = Engine.resolveTurn(s, {
    player: makeMoveAction(182, { protectRoll: 0.25 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(rPass.state.player.stallCount, 2);

  // Float roll >= 1/3 (e.g. 0.5) -> failure
  const rFail = Engine.resolveTurn(s, {
    player: makeMoveAction(182, { protectRoll: 0.5 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(rFail.state.player.stallCount, 0);
  assert.ok(rFail.events.some(e => e.reason === 'PROTECT_FAILED'));
});

test('P6 Protect: invalid roll throws descriptive error', () => {
  const p = makeMon(1, [182]);
  const e = makeMon(2, [33]);
  const s = Engine.createBattle(p, e);
  s.player.stallCount = 1; // denominator = 3

  assert.throws(() => {
    Engine.resolveTurn(s, {
      player: makeMoveAction(182, { protectRoll: 5 }), // out of range 1..3
      enemy: makeMoveAction(33)
    });
  }, /Roll de proteção inteiro inválido/);

  assert.throws(() => {
    Engine.resolveTurn(s, {
      player: makeMoveAction(182, { protectRoll: -1 }),
      enemy: makeMoveAction(33)
    });
  }, /Roll de proteção inválido/);
});

// -----------------------------------------------------------------------------
// 5. STALL COUNTER RESETS
// -----------------------------------------------------------------------------
test('P6 Protect: selecting any non-protect move resets stallCount', () => {
  const p = makeMon(1, [182, 33]);
  const e = makeMon(2, [33]);
  let s = Engine.createBattle(p, e);
  s.player.stallCount = 3;

  const r = Engine.resolveTurn(s, {
    player: makeMoveAction(33),
    enemy: makeMoveAction(33)
  });
  assert.equal(r.state.player.stallCount, 0);
});

test('P6 Protect: immobilization resets stallCount to 0', () => {
  // 1. Sleep immobilization
  const sSleep = Engine.createBattle(makeMon(1, [182]), makeMon(2, [33]));
  sSleep.player.stallCount = 2;
  sSleep.player.statusCondition = 'sleep';
  sSleep.player.sleepTurns = 2;
  const rSleep = Engine.resolveTurn(sSleep, {
    player: makeMoveAction(182),
    enemy: makeMoveAction(33)
  });
  assert.equal(rSleep.state.player.stallCount, 0);
  assert.ok(rSleep.events.some(e => e.type === 'STATUS_IMMOBILIZED'));

  // 2. Freeze immobilization
  const sFreeze = Engine.createBattle(makeMon(1, [182]), makeMon(2, [33]));
  sFreeze.player.stallCount = 2;
  sFreeze.player.statusCondition = 'freeze';
  const rFreeze = Engine.resolveTurn(sFreeze, {
    player: makeMoveAction(182, { thawRoll: 90 }), // does not thaw
    enemy: makeMoveAction(33)
  });
  assert.equal(rFreeze.state.player.stallCount, 0);

  // 3. Flinch immobilization
  const sFlinch = Engine.createBattle(makeMon(1, [182], ['normal'], { speed: 10 }), makeMon(2, [252], ['normal'], { speed: 500 }));
  sFlinch.player.stallCount = 2;
  sFlinch.player.isFlinched = true;
  const rFlinch = Engine.resolveTurn(sFlinch, {
    player: makeMoveAction(182),
    enemy: makeMoveAction(252)
  });
  assert.equal(rFlinch.state.player.stallCount, 0);
  assert.ok(rFlinch.events.some(e => e.type === 'FLINCH_IMMOBILIZED'));

  // 4. Confusion self-hit
  const sConf = Engine.createBattle(makeMon(1, [182]), makeMon(2, [33]));
  sConf.player.stallCount = 2;
  sConf.player.confusionTurns = 2;
  const rConf = Engine.resolveTurn(sConf, {
    player: makeMoveAction(182, { confusionHitRoll: 10 }), // hits self (<= 33)
    enemy: makeMoveAction(33)
  });
  assert.equal(rConf.state.player.stallCount, 0);
  assert.ok(rConf.events.some(e => e.type === 'CONFUSION_DAMAGE'));

  // 5. Paralysis full paralysis
  const sPara = Engine.createBattle(makeMon(1, [182]), makeMon(2, [33]));
  sPara.player.stallCount = 2;
  sPara.player.statusCondition = 'paralysis';
  const rPara = Engine.resolveTurn(sPara, {
    player: makeMoveAction(182, { statusRoll: 10 }), // immobilized (<= 25)
    enemy: makeMoveAction(33)
  });
  assert.equal(rPara.state.player.stallCount, 0);

  // 6. Mandatory recharge turn
  const sRecharge = Engine.createBattle(makeMon(1, [182]), makeMon(2, [33]));
  sRecharge.player.stallCount = 2;
  sRecharge.player.rechargeMoveId = 63;
  const rRecharge = Engine.resolveTurn(sRecharge, {
    player: makeMoveAction(63),
    enemy: makeMoveAction(33)
  });
  assert.equal(rRecharge.state.player.stallCount, 0);
});

test('P6 Protect: voluntary switch and replacement reset stallCount', () => {
  // Voluntary switch
  const sTeam = Engine.createTeamBattle(
    [makeMon(1, [182]), makeMon(3, [33]), makeMon(5, [33])],
    [makeMon(2, [33]), makeMon(4, [33]), makeMon(6, [33])]
  );
  sTeam.player.team[0].stallCount = 2;
  const rSwitch = Engine.resolveTurn(sTeam, {
    player: { type: 'SWITCH', targetPokemonId: 3 },
    enemy: makeMoveAction(33)
  });
  assert.equal(rSwitch.state.player.team[0].stallCount, 0);
  assert.equal(rSwitch.state.player.team[1].stallCount, 0);

  // Faint & replacement
  const sFaint = Engine.createTeamBattle(
    [makeMon(1, [182]), makeMon(3, [33]), makeMon(5, [33])],
    [makeMon(2, [33]), makeMon(4, [33]), makeMon(6, [33])]
  );
  sFaint.player.team[0].stallCount = 2;
  sFaint.player.team[0].currentHp = 1;
  sFaint.enemy.team[0].speed = 500;
  // If player fails protect, enemy hits and faints player
  const rFaint = Engine.resolveTurn(sFaint, {
    player: makeMoveAction(182, { protectRoll: 2 }), // fail
    enemy: makeMoveAction(33)
  });
  assert.equal(rFaint.state.status, 'AWAITING_REPLACEMENT');
  const rRep = Engine.resolveReplacement(rFaint.state, { player: { targetPokemonId: 3 } });
  assert.equal(rRep.state.player.team[0].stallCount, 0);
  assert.equal(rRep.state.player.team[1].stallCount, 0);
});

// -----------------------------------------------------------------------------
// 6. RESIDUAL DAMAGE INTERACTION
// -----------------------------------------------------------------------------
test('P6 Protect: residual status damage (burn, poison) still damages protected Pokémon at end of turn', () => {
  const p = makeMon(1, [182], ['normal'], { statusCondition: 'burn' });
  const e = makeMon(2, [33]);
  const s = Engine.createBattle(p, e);

  const r = Engine.resolveTurn(s, {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });

  // Enemy tackle blocked
  assert.ok(r.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'));
  // Burn damage ticked!
  assert.ok(r.events.some(e => e.type === 'STATUS_DAMAGE' && e.statusCondition === 'burn'));
  assert.ok(r.state.player.currentHp < 2000);
});

// -----------------------------------------------------------------------------
// 7. BATTLE EVALUATOR & BATTLE AI
// -----------------------------------------------------------------------------
test('P6 Protect: Evaluator forecasts 0 damage, priority 4, and scales expectedStatusBenefit with threat', () => {
  const attacker = Engine.createCombatant(makeMon(1, [182]));
  const defender = Engine.createCombatant(makeMon(2, [58])); // Ice Beam (power 90)

  // 1st use (stallCount 0 -> chance 1.0)
  attacker.stallCount = 0;
  const eval0 = Evaluator.evaluateMove(attacker, defender, attacker.moves[0]);
  assert.equal(eval0.priority, 4);
  assert.equal(eval0.expectedDamage, 0);
  assert.equal(eval0.damageClass, 'status');
  assert.equal(eval0.power, null);
  assert.equal(eval0.accuracy, null);
  assert.equal(eval0.expectedStatusBenefit, 90); // 90 * 1.0

  // 2nd use (stallCount 1 -> chance 1/3)
  attacker.stallCount = 1;
  const eval1 = Evaluator.evaluateMove(attacker, defender, attacker.moves[0]);
  assert.equal(eval1.expectedStatusBenefit, Math.round(90 / 3)); // 30

  // If opponent is recharging or fainted, benefit is 0
  defender.rechargeMoveId = 63;
  const evalRecharge = Evaluator.evaluateMove(attacker, defender, attacker.moves[0]);
  assert.equal(evalRecharge.expectedStatusBenefit, 0);

  // When defender is protected, attacker offensive moves evaluate to 0 damage
  defender.rechargeMoveId = null;
  defender.isProtected = true;
  const evalBlocked = Evaluator.evaluateMove(attacker, defender, makeMon(1, [33]).moves[0]);
  assert.equal(evalBlocked.expectedDamage, 0);
  assert.equal(evalBlocked.wouldKo, false);
});

test('P6 Protect: Battle AI heavily penalizes consecutive Protect and scores 0 when opponent recharging', () => {
  const s = Engine.createBattle(makeMon(1, [33]), makeMon(2, [182, 33]));
  // Opponent has Protect (#182) and Tackle (#33)

  // Enemy stallCount = 0: Protect is scored normally based on expected status benefit
  s.enemy.stallCount = 0;
  const dec0 = AI.chooseAction(s, 'enemy');
  assert.ok(dec0.action);

  // Enemy stallCount = 1: heavily penalized
  s.enemy.stallCount = 1;
  const dec1 = AI.chooseAction(s, 'enemy');
  // AI should prefer Tackle (damaging move) over consecutive Protect
  assert.equal(dec1.action.moveId, 33);

  // If player is recharging, AI scores Protect as 0
  s.player.rechargeMoveId = 63;
  s.enemy.stallCount = 0;
  const decRecharge = AI.chooseAction(s, 'enemy');
  assert.equal(decRecharge.action.moveId, 33);
});

// -----------------------------------------------------------------------------
// 8. BATTLE SESSION CONTROLLER & RANDOM SOURCE
// -----------------------------------------------------------------------------
test('P6 Protect: RandomSource rollProtect and DeterministicRandomSource protectSequence', () => {
  const rng = new BattleRandomSource();
  const roll = rng.rollProtect(3);
  assert.ok(roll >= 1 && roll <= 3);

  const det = new DeterministicRandomSource({ protectSequence: [1, 2, 3] });
  assert.equal(det.rollProtect(3), 1);
  assert.equal(det.rollProtect(3), 2);
  assert.equal(det.rollProtect(3), 3);

  det.setProtectSequence([1]);
  assert.equal(det.rollProtect(9), 1);
});

test('P6 Protect: BattleSessionController handles player and enemy Protect deterministically', async () => {
  const playerMons = [makeMon(1, [182, 33]), makeMon(3, [33]), makeMon(5, [33])];
  const enemyMons = [makeMon(2, [182, 33]), makeMon(4, [33]), makeMon(6, [33])];

  const randomSource = new DeterministicRandomSource({
    protectSequence: [1, 1], // Player roll 1, Enemy roll 1
    accuracySequence: [1, 1]
  });

  const session = new BattleSessionController({
    teamStore: { load: () => [1, 3, 5] },
    hydrator: { hydrateTeam: async () => playerMons },
    opponentFactory: { createOpponentTeam: async () => enemyMons },
    randomSource,
    presentationEngine: { play: async () => {}, playCommands: async () => {} }
  });

  await session.prepareBattle({ playerTeamIds: [1, 3, 5] });
  await session.startBattle();

  // Player submits Protect
  await session.submitPlayerMove(182);

  // Turn completed, both protected, no damage taken
  assert.equal(session.battleState.player.team[0].currentHp, 2000);
  assert.equal(session.battleState.enemy.team[0].currentHp, 2000);
});

test('P6 Protect: BattleSessionController handles switch while enemy uses Protect', async () => {
  const playerMons = [makeMon(1, [33]), makeMon(3, [33]), makeMon(5, [33])];
  const enemyMons = [makeMon(2, [182]), makeMon(4, [33]), makeMon(6, [33])];

  const randomSource = new DeterministicRandomSource({
    protectSequence: [1],
    accuracySequence: [1]
  });

  const session = new BattleSessionController({
    teamStore: { load: () => [1, 3, 5] },
    hydrator: { hydrateTeam: async () => playerMons },
    opponentFactory: { createOpponentTeam: async () => enemyMons },
    randomSource,
    presentationEngine: { play: async () => {}, playCommands: async () => {} }
  });

  await session.prepareBattle({ playerTeamIds: [1, 3, 5] });
  await session.startBattle();

  // Player switches to Pokemon 3
  await session.submitPlayerSwitch(3);

  assert.equal(session.battleState.player.activeIndex, 1);
});

test('P6 Protect: Sleep Talk calling Protect receives protectRoll', () => {
  const p = makeMon(1, [214, 182]); // Sleep Talk (#214), Protect (#182)
  p.statusCondition = 'sleep';
  p.sleepTurns = 3;
  const e = makeMon(2, [33]);

  const s = Engine.createBattle(p, e);
  const r = Engine.resolveTurn(s, {
    player: makeMoveAction(214, { sleepTalkChoice: 0, protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });

  assert.ok(r.events.some(e => e.reason === 'PROTECTED_SELF'));
  assert.ok(r.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'));
  assert.equal(r.state.player.currentHp, 2000);
});

// -----------------------------------------------------------------------------
// 9. UI, PRESENTATION & VFX INTEGRATION
// -----------------------------------------------------------------------------
test('P6 Protect: BattleView SUPPORT_MOVE_LABELS displays STATUS · PROTEÇÃO', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const view = new BattleView({ container });
  const s = Engine.createTeamBattle(
    [makeMon(1, [182]), makeMon(3, [33]), makeMon(5, [33])],
    [makeMon(2, [33]), makeMon(4, [33]), makeMon(6, [33])]
  );

  view.renderActiveBattleView(s, 'AWAITING_PLAYER_ACTION');
  assert.match(container.innerHTML, /PROTEÇÃO/);
  assert.doesNotMatch(container.innerHTML, /Poder null/);
});

test('P6 Protect: BattleUiDomAdapter formats messages for Protect events', async () => {
  let displayed = '';
  const adapter = new BattleUiDomAdapter({ view: { displayMessage: msg => { displayed = msg; } } });

  await adapter.execute({ type: 'MOVE_FAIL_FEEDBACK', reason: 'PROTECTED_SELF', pokemonName: 'Umbreon' });
  assert.match(displayed, /se protegeu com uma barreira protetora!/);

  await adapter.execute({ type: 'MOVE_FAIL_FEEDBACK', reason: 'BLOCKED_BY_PROTECT', pokemonName: 'Umbreon' });
  assert.match(displayed, /se protegeu do ataque!/);

  await adapter.execute({ type: 'MOVE_FAIL_FEEDBACK', reason: 'PROTECT_FAILED', pokemonName: 'Umbreon' });
  assert.match(displayed, /mas falhou!/);
});

test('P6 Protect: MoveVfxDomRenderer and Camera suppress impact animation when blocked', () => {
  let renderedImpact = false;
  const renderer = new MoveVfxDomRenderer();
  const originalRenderImpact = renderer.renderImpact.bind(renderer);
  renderer.renderImpact = (descriptor, coords, options) => {
    renderedImpact = true;
    return originalRenderImpact(descriptor, coords, options);
  };

  renderedImpact = false;
  renderer.renderImpact({ archetype: 'BURST', colors: ['#fff'] }, { x: 0, y: 0 }, { isBlocked: true });
  assert.equal(renderedImpact, true);
  assert.equal(renderer.activeTimers.size, 0);
  assert.equal(renderer.activeElements.size, 0);

  // Camera resolver
  const impactLevel = CameraResolver.resolveImpactLevel({ isBlocked: true, damage: 0 });
  assert.equal(impactLevel, 'NONE');
});

// -----------------------------------------------------------------------------
// 10. CAMPAIGN MOVE CUSTOMIZATION CATALOG
// -----------------------------------------------------------------------------
test('P6 Protect & Detect: Umbreon has Protect, Blaziken and Hitmonchan have Detect in extras', () => {
  const extras = CampaignOptionsCatalog.byId;
  const fixed = CampaignFixedCatalog.byId;

  // Umbreon (#197)
  const umbreonExtras = extras[197];
  assert.ok(umbreonExtras, 'Umbreon must have extras');
  assert.ok(umbreonExtras.some(m => m.id === 182 || m.name === 'protect'), 'Umbreon must have protect');
  assert.equal(umbreonExtras.some(m => m.name === 'swift'), false, 'Swift was replaced');
  assert.equal(fixed[197].moves.length, 4);
  assert.ok(fixed[197].moves.length + umbreonExtras.length <= 6);

  // Blaziken (#257)
  const blazikenExtras = extras[257];
  assert.ok(blazikenExtras, 'Blaziken must have extras');
  assert.ok(blazikenExtras.some(m => m.id === 197 || m.name === 'detect'), 'Blaziken must have detect');
  assert.equal(blazikenExtras.some(m => m.name === 'mega-kick'), false, 'Mega-kick was replaced');
  assert.equal(fixed[257].moves.length, 4);
  assert.ok(fixed[257].moves.length + blazikenExtras.length <= 6);

  // Hitmonchan (#107)
  const hitmonchanExtras = extras[107];
  assert.ok(hitmonchanExtras, 'Hitmonchan must have extras');
  assert.ok(hitmonchanExtras.some(m => m.id === 197 || m.name === 'detect'), 'Hitmonchan must have detect');
  assert.equal(fixed[107].moves.length, 4);
  assert.ok(fixed[107].moves.length + hitmonchanExtras.length <= 6);
});

// -----------------------------------------------------------------------------
// 11. IMMUTABILITY OF STATE AND COMMANDS
// -----------------------------------------------------------------------------
test('P6 Protect: Engine.resolveTurn never mutates input state or commands', () => {
  const p = makeMon(1, [182]);
  const e = makeMon(2, [33]);
  const state = Engine.createBattle(p, e);
  const commands = {
    player: makeMoveAction(182, { protectRoll: 1 }),
    enemy: makeMoveAction(33)
  };

  const stateBefore = JSON.stringify(state);
  const commandsBefore = JSON.stringify(commands);

  const result = Engine.resolveTurn(state, commands);

  assert.equal(JSON.stringify(state), stateBefore);
  assert.equal(JSON.stringify(commands), commandsBefore);
  assert.notEqual(result.state, state);
});

// -----------------------------------------------------------------------------
// 12. BIDE (#117) AND PROTECTION
// -----------------------------------------------------------------------------
test('P6 Protect vs Bide: Protect does NOT block Bide storage, but blocks release and ends sequence', () => {
  const p = makeMon(1, [117, 33]); // Bide (#117), Tackle (#33)
  const e = makeMon(2, [182, 33]); // Protect (#182), Tackle (#33)

  // Turn 1: Player uses Bide, Enemy uses Protect
  // Storage MUST start even though enemy is protected!
  let s = Engine.createBattle(p, e);
  let r1 = Engine.resolveTurn(s, {
    player: makeMoveAction(117),
    enemy: makeMoveAction(182, { protectRoll: 1 })
  });

  assert.ok(r1.state.player.bideState, 'bideState must be initialized');
  assert.equal(r1.state.player.bideState.turnsLeft, 2);
  assert.equal(r1.state.player.bideState.damage, 0);
  assert.ok(r1.events.some(e => e.type === 'MOVE_PREPARED' && e.reason === 'BIDE_STORE'));
  assert.equal(r1.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'), false);
  assert.equal(r1.state.player.moves[0].currentPp, p.moves[0].pp - 1); // 1 PP consumed on start

  // Turn 2: Player continues Bide, Enemy uses Tackle (dealing damage to store)
  let r2 = Engine.resolveTurn(r1.state, {
    player: makeMoveAction(117),
    enemy: makeMoveAction(33)
  });
  assert.ok(r2.state.player.bideState);
  assert.equal(r2.state.player.bideState.turnsLeft, 1);
  const storedDamage = r2.state.player.bideState.damage;
  assert.ok(storedDamage > 0, 'Damage must be accumulated into Bide');
  assert.equal(r2.state.player.moves[0].currentPp, p.moves[0].pp - 1); // No additional PP consumed

  // Turn 3: Player releases Bide, Enemy uses Protect (#182)
  // Release attack is BLOCKED by Protect, deals 0 damage, and bideState MUST be cleared!
  let r3 = Engine.resolveTurn(r2.state, {
    player: makeMoveAction(117),
    enemy: makeMoveAction(182, { protectRoll: 1 })
  });
  assert.equal(r3.state.player.bideState, null, 'bideState must be cleared after release even when blocked');
  assert.equal(r3.state.enemy.currentHp, 2000, 'Enemy takes 0 damage when protecting against Bide release');
  assert.ok(r3.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_PROTECT'));

  // Turn 4: Player can select Tackle freely and Bide is NOT forced or attempted again
  let r4 = Engine.resolveTurn(r3.state, {
    player: makeMoveAction(33),
    enemy: makeMoveAction(33)
  });
  assert.equal(r4.state.player.bideState, null);
  assert.ok(r4.events.some(e => e.type === 'MOVE_USED' && e.moveId === 33 && e.actor === 'player'));
});

test('P6 Bide: continuing storage is not blocked if enemy protects on Turn 2', () => {
  const p = makeMon(1, [117]);
  const e = makeMon(2, [182, 33]);
  let s = Engine.createBattle(p, e);
  s.player.bideState = { turnsLeft: 2, damage: 40 };

  const r = Engine.resolveTurn(s, {
    player: makeMoveAction(117),
    enemy: makeMoveAction(182, { protectRoll: 1 })
  });
  assert.ok(r.state.player.bideState);
  assert.equal(r.state.player.bideState.turnsLeft, 1);
  assert.equal(r.state.player.bideState.damage, 40);
  assert.ok(r.events.some(e => e.reason === 'BIDE_STORE'));
  assert.equal(r.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'), false);
});

// -----------------------------------------------------------------------------
// 13. SLEEP TALK CALLING PROTECT/DETECT
// -----------------------------------------------------------------------------
test('P6 Sleep Talk calling Protect: respects stallCount, rolls against correct denominator, and fails when roll exceeds 1', () => {
  const p = makeMon(1, [214, 182]); // Sleep Talk (#214), Protect (#182)
  p.statusCondition = 'sleep';
  p.sleepTurns = 3;
  const e = makeMon(2, [33]);

  const s = Engine.createBattle(p, e);
  s.player.stallCount = 2; // Denominator should be 3^2 = 9

  // Roll 9 out of 9: MUST FAIL!
  const rFail = Engine.resolveTurn(s, {
    player: makeMoveAction(214, { sleepTalkChoice: 0, protectRoll: 9 }),
    enemy: makeMoveAction(33)
  });

  assert.equal(rFail.state.player.stallCount, 0, 'stallCount must reset to 0 upon failure');
  assert.equal(rFail.state.player.isProtected, false);
  assert.equal(rFail.state.player.lastMoveFailed, true);
  assert.ok(rFail.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'PROTECT_FAILED'));
  // And enemy Tackle hits because Protect failed!
  assert.ok(rFail.events.some(e => e.type === 'DAMAGE_APPLIED' && e.source === 'enemy'));

  // Roll 1 out of 9: MUST SUCCEED!
  const s2 = Engine.createBattle(p, e);
  s2.player.stallCount = 2;
  s2.player.statusCondition = 'sleep';
  s2.player.sleepTurns = 3;

  const rPass = Engine.resolveTurn(s2, {
    player: makeMoveAction(214, { sleepTalkChoice: 0, protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });

  assert.equal(rPass.state.player.stallCount, 3, 'stallCount must increment from 2 to 3 on success');
  assert.ok(rPass.events.some(e => e.type === 'MOVE_PREPARED' && e.reason === 'PROTECTED_SELF'));
  assert.ok(rPass.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'));
  assert.equal(rPass.state.player.currentHp, 2000);
});

test('P6 Sleep Talk: calling non-protect move resets stallCount to 0', () => {
  const p = makeMon(1, [214, 182, 33]); // Sleep Talk, Protect, Tackle
  p.statusCondition = 'sleep';
  p.sleepTurns = 3;
  const e = makeMon(2, [33]);

  const s = Engine.createBattle(p, e);
  s.player.stallCount = 2;
  // Sleep Talk calls Tackle (choice index 1)
  const r = Engine.resolveTurn(s, {
    player: makeMoveAction(214, { sleepTalkChoice: 1 }),
    enemy: makeMoveAction(33)
  });

  assert.equal(r.state.player.stallCount, 0, 'Calling non-protect move must reset stallCount');
  assert.ok(r.events.some(e => e.type === 'MOVE_USED' && e.moveId === 33));
});

test('P6 Sleep Talk: alternating Protect and Detect via Sleep Talk shares stall counter', () => {
  const p = makeMon(1, [214, 182, 197]); // Sleep Talk (#214), Protect (#182), Detect (#197)
  p.statusCondition = 'sleep';
  p.sleepTurns = 3;
  const e = makeMon(2, [33]);

  let s = Engine.createBattle(p, e);

  // Turn 1: Sleep Talk calls Protect (#182) -> count 0 -> succeeds -> count 1
  let r1 = Engine.resolveTurn(s, {
    player: makeMoveAction(214, { sleepTalkChoice: 0, protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r1.state.player.stallCount, 1);

  // Turn 2: Sleep Talk calls Detect (#197) -> count 1 (denom 3) -> roll 1 succeeds -> count 2
  let r2 = Engine.resolveTurn(r1.state, {
    player: makeMoveAction(214, { sleepTalkChoice: 1, protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r2.state.player.stallCount, 2);

  // Turn 3: Sleep Talk calls Protect (#182) -> count 2 (denom 9) -> roll 9 fails -> count 0
  let r3 = Engine.resolveTurn(r2.state, {
    player: makeMoveAction(214, { sleepTalkChoice: 0, protectRoll: 9 }),
    enemy: makeMoveAction(33)
  });
  assert.equal(r3.state.player.stallCount, 0);
  assert.ok(r3.events.some(e => e.reason === 'PROTECT_FAILED'));
});

test('P6 Sleep Talk: failure to act or sleep immobilization resets stallCount', () => {
  // 1. Asleep but user chooses Tackle instead of Sleep Talk -> sleep immobilization resets counter
  const pSleep = makeMon(1, [214, 182, 33]);
  pSleep.statusCondition = 'sleep';
  pSleep.sleepTurns = 2;
  const sSleep = Engine.createBattle(pSleep, makeMon(2, [33]));
  sSleep.player.stallCount = 2;
  const rImmobilized = Engine.resolveTurn(sSleep, {
    player: makeMoveAction(33),
    enemy: makeMoveAction(33)
  });
  assert.equal(rImmobilized.state.player.stallCount, 0);

  // 2. Sleep Talk used when not asleep fails and resets stallCount
  const pAwake = makeMon(1, [214, 182]);
  pAwake.statusCondition = null;
  const sAwake = Engine.createBattle(pAwake, makeMon(2, [33]));
  sAwake.player.stallCount = 2;
  const rAwake = Engine.resolveTurn(sAwake, {
    player: makeMoveAction(214),
    enemy: makeMoveAction(33)
  });
  assert.equal(rAwake.state.player.stallCount, 0);
  assert.ok(rAwake.events.some(e => e.reason === 'REQUIRES_SLEEP'));
});

test('P6 Sleep Talk: BattleSessionController prepares correct roll for called Protect on both sides', async () => {
  const playerMons = [makeMon(1, [214, 182], ['normal'], { statusCondition: 'sleep', sleepTurns: 3 }), makeMon(3, [33]), makeMon(5, [33])];
  const enemyMons = [makeMon(2, [214, 182], ['normal'], { statusCondition: 'sleep', sleepTurns: 3 }), makeMon(4, [33]), makeMon(6, [33])];

  // Denominator for stallCount 1 is 3. Roll 3 fails.
  const randomSource = new DeterministicRandomSource({
    calledMoveSequence: [0, 0], // both pick Protect (index 0)
    protectSequence: [3, 3],    // both roll 3 (fail)
    accuracySequence: [1, 1]
  });

  const session = new BattleSessionController({
    teamStore: { load: () => [1, 3, 5] },
    hydrator: { hydrateTeam: async () => playerMons },
    opponentFactory: { createOpponentTeam: async () => enemyMons },
    randomSource,
    presentationEngine: { play: async () => {}, playCommands: async () => {} }
  });

  await session.prepareBattle({ playerTeamIds: [1, 3, 5] });
  await session.startBattle();

  // Configure fixture state after creation:
  session.battleState.player.team[0].stallCount = 1;
  session.battleState.enemy.team[0].stallCount = 1;

  await session.submitPlayerMove(214);

  // Both should have failed Protect and stallCount reset to 0
  assert.equal(session.battleState.player.team[0].stallCount, 0);
  assert.equal(session.battleState.enemy.team[0].stallCount, 0);
});

// -----------------------------------------------------------------------------
// 14. HYPER DRILL (#887) PROTECT BYPASS
// -----------------------------------------------------------------------------
test('P6 Hyper Drill (#887): canonical metadata, FULL support and bypasses Protect', () => {
  const cap = Constants.getMoveCapability({ id: 887, name: 'hyper-drill' });
  assert.equal(cap.supportLevel, 'FULL');
  assert.deepEqual(cap.knownPending, []);
  assert.ok(Constants.isProtectBypassingMove({ id: 887 }));
  assert.ok(Constants.isProtectBypassingMove({ name: 'hyper-drill' }));
  assert.equal(Constants.isProtectBypassingMove({ id: 33, name: 'tackle' }), false);

  const p = makeMon(1, [887]); // Hyper Drill (#887)
  const e = makeMon(2, [182]); // Protect (#182)
  const s = Engine.createBattle(p, e);

  // Turn 1: Enemy protects, Player uses Hyper Drill
  // Hyper Drill MUST bypass Protect and deal damage!
  const r = Engine.resolveTurn(s, {
    player: makeMoveAction(887),
    enemy: makeMoveAction(182, { protectRoll: 1 })
  });

  assert.equal(r.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'), false, 'Hyper Drill must not be blocked');
  const damageEvent = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(damageEvent, 'Damage must be applied to enemy');
  assert.ok(damageEvent.damage > 0);
  assert.ok(r.state.enemy.currentHp < 2000);
  assert.equal(r.state.player.moves[0].currentPp, p.moves[0].pp - 1);
});

test('P6 Hyper Drill (#887): does NOT remove protection and respects Ghost immunity', () => {
  const p = makeMon(1, [887]);
  const eGhost = makeMon(2, [182], ['ghost']); // Ghost type using Protect
  const s = Engine.createBattle(p, eGhost);

  const r = Engine.resolveTurn(s, {
    player: makeMoveAction(887),
    enemy: makeMoveAction(182, { protectRoll: 1 })
  });

  // Bypasses protect check, but Ghost is immune to Normal type!
  assert.equal(r.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'), false);
  const typeEvent = r.events.find(e => e.type === 'TYPE_EFFECTIVENESS_RESOLVED');
  assert.ok(typeEvent);
  assert.equal(typeEvent.multiplier, 0);
  assert.equal(typeEvent.classification, 'IMMUNE');
  assert.equal(r.state.enemy.currentHp, 2000, 'Ghost takes 0 damage due to type immunity');
});

test('P6 Hyper Drill (#887): Evaluator forecasts damage against protected defender but 0 against protected Ghost', () => {
  const attacker = Engine.createCombatant(makeMon(1, [887, 33]));
  const defenderNormal = Engine.createCombatant(makeMon(2, [182], ['normal']));
  const defenderGhost = Engine.createCombatant(makeMon(3, [182], ['ghost']));

  defenderNormal.isProtected = true;
  defenderGhost.isProtected = true;

  // Hyper Drill against protected Normal: forecasts damage > 0
  const evalDrill = Evaluator.evaluateMove(attacker, defenderNormal, attacker.moves[0]);
  assert.ok(evalDrill.expectedDamage > 0, 'Expected damage must be > 0 for Hyper Drill against protected target');
  assert.ok(evalDrill.damageIfHit > 0);

  // Tackle against protected Normal: forecasts 0 damage
  const evalTackle = Evaluator.evaluateMove(attacker, defenderNormal, attacker.moves[1]);
  assert.equal(evalTackle.expectedDamage, 0, 'Expected damage must be 0 for Tackle against protected target');

  // Hyper Drill against protected Ghost: forecasts 0 damage due to immunity
  const evalGhost = Evaluator.evaluateMove(attacker, defenderGhost, attacker.moves[0]);
  assert.equal(evalGhost.expectedDamage, 0);
  assert.equal(evalGhost.wouldKo, false);
});

// -----------------------------------------------------------------------------
// 15. COMBATANT INITIALIZATION INTEGRITY & REGRESSIONS
// -----------------------------------------------------------------------------
test('P6 Initialization: createCombatant ignores isProtected and stallCount from raw data and leaves raw data immutable', () => {
  const raw = {
    ...makeMon(1, [182, 197]),
    isProtected: true,
    stallCount: 6
  };
  const combatant = Engine.createCombatant(raw);
  assert.strictEqual(combatant.isProtected, false, 'combatant.isProtected must always initialize to false');
  assert.strictEqual(combatant.stallCount, 0, 'combatant.stallCount must always initialize to 0');
  assert.strictEqual(raw.isProtected, true, 'raw.isProtected must remain unchanged (immutable)');
  assert.strictEqual(raw.stallCount, 6, 'raw.stallCount must remain unchanged (immutable)');
});

test('P6 Initialization: createBattle and createTeamBattle initialize all members (active and reserves) without protection or stall penalty', () => {
  // 1v1 Battle
  const raw1 = { ...makeMon(1, [182]), isProtected: true, stallCount: 5 };
  const raw2 = { ...makeMon(2, [197]), isProtected: true, stallCount: 4 };
  const s1v1 = Engine.createBattle(raw1, raw2);
  assert.strictEqual(s1v1.player.isProtected, false);
  assert.strictEqual(s1v1.player.stallCount, 0);
  assert.strictEqual(s1v1.enemy.isProtected, false);
  assert.strictEqual(s1v1.enemy.stallCount, 0);
  assert.strictEqual(raw1.isProtected, true);
  assert.strictEqual(raw1.stallCount, 5);

  // 3v3 Team Battle
  const playerTeam = [
    { ...makeMon(1, [182]), isProtected: true, stallCount: 6 },
    { ...makeMon(3, [182]), isProtected: true, stallCount: 3 },
    { ...makeMon(5, [182]), isProtected: true, stallCount: 2 }
  ];
  const enemyTeam = [
    { ...makeMon(2, [197]), isProtected: true, stallCount: 5 },
    { ...makeMon(4, [197]), isProtected: true, stallCount: 4 },
    { ...makeMon(6, [197]), isProtected: true, stallCount: 1 }
  ];
  const sTeam = Engine.createTeamBattle(playerTeam, enemyTeam);
  for (const role of ['player', 'enemy']) {
    for (let i = 0; i < 3; i++) {
      assert.strictEqual(sTeam[role].team[i].isProtected, false, `${role} member ${i} isProtected must be false`);
      assert.strictEqual(sTeam[role].team[i].stallCount, 0, `${role} member ${i} stallCount must be 0`);
    }
  }
  assert.strictEqual(playerTeam[0].stallCount, 6);
  assert.strictEqual(playerTeam[0].isProtected, true);
  assert.strictEqual(enemyTeam[0].stallCount, 5);
  assert.strictEqual(enemyTeam[0].isProtected, true);
});

test('P6 Initialization: first Protect/Detect turn does not suffer any inherited penalty', () => {
  // Reproduces user case: raw input has isProtected: true and stallCount: 6
  const rawP = { ...makeMon(1, [182]), isProtected: true, stallCount: 6 };
  const rawE = { ...makeMon(2, [33]), isProtected: true, stallCount: 6 };
  const s = Engine.createBattle(rawP, rawE);

  // When stallCount: 6 was incorrectly inherited, protectRoll: 729 failed Protect on turn 1.
  // With the fix, stallCount is initialized to 0, so Protect has 100% chance and SUCCEEDS!
  const r = Engine.resolveTurn(s, {
    player: makeMoveAction(182, { protectRoll: 729 }),
    enemy: makeMoveAction(33)
  });
  assert.strictEqual(r.events.some(e => e.reason === 'PROTECT_FAILED'), false, 'Protect must NOT fail on turn 1');
  assert.ok(r.events.some(e => e.type === 'MOVE_PREPARED' && e.reason === 'PROTECTED_SELF'), 'Protect must succeed');
  assert.ok(r.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'), 'Enemy Tackle is blocked');
  assert.strictEqual(r.state.player.stallCount, 1, 'stallCount increments from 0 to 1');
  assert.strictEqual(r.state.player.currentHp, 2000, 'Damage is blocked');
  assert.strictEqual(r.state.player.isProtected, false, 'isProtected resets at turn end');
});

test('P6 Initialization: consecutive uses within the same battle continue scaling down the chance properly', () => {
  const s = Engine.createBattle(makeMon(1, [182, 197]), makeMon(2, [33]));

  // Turn 1: 1st use -> denom 1 -> succeeds
  const r1 = Engine.resolveTurn(s, {
    player: makeMoveAction(182),
    enemy: makeMoveAction(33)
  });
  assert.strictEqual(r1.state.player.stallCount, 1);
  assert.strictEqual(r1.state.player.isProtected, false);
  assert.ok(r1.events.some(e => e.reason === 'PROTECTED_SELF'));
  assert.ok(r1.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'));

  // Turn 2: 2nd use -> denom 3 (3^1) -> roll 1 succeeds
  const r2 = Engine.resolveTurn(r1.state, {
    player: makeMoveAction(197, { protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.strictEqual(r2.state.player.stallCount, 2);
  assert.strictEqual(r2.state.player.isProtected, false);
  assert.ok(r2.events.some(e => e.reason === 'PROTECTED_SELF'));
  assert.ok(r2.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'));

  // Turn 3: 3rd use -> denom 9 (3^2) -> roll 9 fails
  const r3 = Engine.resolveTurn(r2.state, {
    player: makeMoveAction(182, { protectRoll: 9 }),
    enemy: makeMoveAction(33)
  });
  assert.strictEqual(r3.state.player.stallCount, 0, 'stallCount resets to 0 upon failure');
  assert.strictEqual(r3.state.player.isProtected, false);
  assert.ok(r3.events.some(e => e.reason === 'PROTECT_FAILED'));
});

test('P6 Initialization: Sleep Talk calling Protect/Detect preserves the stall counter when consecutive within the same battle', () => {
  const p = makeMon(1, [214, 182, 197]); // Sleep Talk, Protect, Detect
  p.statusCondition = 'sleep';
  p.sleepTurns = 3;
  const s = Engine.createBattle(p, makeMon(2, [33]));

  // Turn 1: Sleep Talk calls Protect (#182) -> count 0 -> succeeds -> count 1
  const r1 = Engine.resolveTurn(s, {
    player: makeMoveAction(214, { sleepTalkChoice: 0, protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.strictEqual(r1.state.player.stallCount, 1);
  assert.strictEqual(r1.state.player.isProtected, false);
  assert.ok(r1.events.some(e => e.reason === 'PROTECTED_SELF'));
  assert.ok(r1.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'));

  // Turn 2: Sleep Talk calls Detect (#197) -> count 1 (denom 3) -> roll 1 succeeds -> count 2
  const r2 = Engine.resolveTurn(r1.state, {
    player: makeMoveAction(214, { sleepTalkChoice: 1, protectRoll: 1 }),
    enemy: makeMoveAction(33)
  });
  assert.strictEqual(r2.state.player.stallCount, 2);
  assert.strictEqual(r2.state.player.isProtected, false);
  assert.ok(r2.events.some(e => e.reason === 'PROTECTED_SELF'));
  assert.ok(r2.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'));

  // Turn 3: Sleep Talk calls Protect (#182) -> count 2 (denom 9) -> roll 9 fails -> count 0
  const r3 = Engine.resolveTurn(r2.state, {
    player: makeMoveAction(214, { sleepTalkChoice: 0, protectRoll: 9 }),
    enemy: makeMoveAction(33)
  });
  assert.strictEqual(r3.state.player.stallCount, 0);
  assert.strictEqual(r3.state.player.isProtected, false);
  assert.ok(r3.events.some(e => e.reason === 'PROTECT_FAILED'));
});

test('P6 Initialization: Bide and Hyper Drill regressions continue passing', () => {
  // 1. Bide storage turn 1/2 is not blocked by Protect; turn 3 release is blocked and bideState terminates
  const pBide = makeMon(1, [117]);
  const eProt = makeMon(2, [182, 33]);
  const sBide = Engine.createBattle(pBide, eProt);

  // Turn 1: Enemy Protects, Player uses Bide -> BIDE_STORE, turnsLeft: 2
  const rB1 = Engine.resolveTurn(sBide, {
    player: makeMoveAction(117),
    enemy: makeMoveAction(182, { protectRoll: 1 })
  });
  assert.ok(rB1.events.some(e => e.reason === 'BIDE_STORE'));
  assert.deepStrictEqual(rB1.state.player.bideState, { turnsLeft: 2, damage: 0 });

  // 2. Hyper Drill bypasses Protect without removing it
  const pDrill = makeMon(3, [887]);
  const eDrillProt = makeMon(4, [182]);
  const sDrill = Engine.createBattle(pDrill, eDrillProt);
  const rDrill = Engine.resolveTurn(sDrill, {
    player: makeMoveAction(887),
    enemy: makeMoveAction(182, { protectRoll: 1 })
  });
  assert.strictEqual(rDrill.events.some(e => e.reason === 'BLOCKED_BY_PROTECT'), false);
  assert.ok(rDrill.events.some(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player'));
  assert.strictEqual(rDrill.state.enemy.isProtected, false);
});

