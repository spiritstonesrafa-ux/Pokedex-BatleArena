const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../../assets/js/battle/battle-engine.js');
const AI = require('../../assets/js/battle/battle-ai.js');
const Evaluator = require('../../assets/js/battle/battle-evaluator.js');
const Mapper = require('../../assets/js/presentation/battle-presentation-mapper.js');
const { BattleUiDomAdapter } = require('../../assets/js/ui/battle-ui-adapter.js');
const {
  BATTLE_EVENTS,
  CANONICAL_MOVE_DEFINITIONS,
  KNOWN_CATALOG_MOVES,
  getMoveCapability,
  validateMoveData,
  isStatusConditionImmune,
  isSelfThawingMove,
  isThawingMoveTarget,
  isDamagingFireMove
} = require('../../assets/js/battle/battle-constants.js');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source.js');

const TACKLE = KNOWN_CATALOG_MOVES[33];
const BITE = KNOWN_CATALOG_MOVES[44];
const FLAMETHROWER = KNOWN_CATALOG_MOVES[53];
const ICE_BEAM = KNOWN_CATALOG_MOVES[58];
const BLIZZARD = KNOWN_CATALOG_MOVES[59];
const SCALD = KNOWN_CATALOG_MOVES[503];
const WILL_O_WISP = KNOWN_CATALOG_MOVES[261] || { id: 261, name: 'will-o-wisp', type: 'fire', power: 0, accuracy: 85, pp: 15, damageClass: 'status', statusEffect: 'burn' };

function makeMon(id, name, types, moves, stats = {}, overrides = {}) {
  return {
    id,
    name,
    types,
    hp: stats.hp || 200,
    currentHp: stats.hp || 200,
    maxHp: stats.hp || 200,
    attack: stats.attack || 100,
    defense: stats.defense || 100,
    specialAttack: stats.specialAttack || 100,
    specialDefense: stats.specialDefense || 100,
    speed: stats.speed || 100,
    statusCondition: null,
    sleepTurns: 0,
    isFlinched: false,
    statStages: {
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0,
      ...(overrides.statStages || {})
    },
    moves: moves.map(m => ({ ...m, currentPp: m.currentPp !== undefined ? m.currentPp : m.pp, maxPp: m.pp })),
    ...overrides
  };
}

function makeAction(moveId, options = {}) {
  return {
    type: 'MOVE',
    moveId,
    accuracyRoll: 1,
    damageRoll: 100,
    statusRoll: 100,
    thawRoll: 100,
    ...options
  };
}

// 1. DADOS CANÔNICOS E SUPORTE MECÂNICO
test('P4-FZ-01: Classificação canônica, dados de Ice Beam, Blizzard e Scald', () => {
  // Ice Beam (ID 58)
  const ibCap = getMoveCapability({ id: 58 });
  assert.equal(ibCap.id, 58);
  assert.equal(ibCap.name, 'ice-beam');
  assert.equal(ibCap.supportLevel, 'FULL');
  assert.deepEqual(ibCap.requiredMechanics, ['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE']);
  assert.deepEqual(ibCap.knownPending, []);

  assert.equal(ICE_BEAM.id, 58);
  assert.equal(ICE_BEAM.name, 'ice-beam');
  assert.equal(ICE_BEAM.type, 'ice');
  assert.equal(ICE_BEAM.power, 90);
  assert.equal(ICE_BEAM.accuracy, 100);
  assert.equal(ICE_BEAM.pp, 10);
  assert.equal(ICE_BEAM.damageClass, 'special');
  assert.equal(validateMoveData(ICE_BEAM), true);

  // Blizzard (ID 59)
  const blzCap = getMoveCapability({ id: 59 });
  assert.equal(blzCap.id, 59);
  assert.equal(blzCap.name, 'blizzard');
  assert.equal(blzCap.supportLevel, 'PARTIAL');
  assert.deepEqual(blzCap.requiredMechanics, ['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE']);
  assert.deepEqual(blzCap.knownPending, ['WEATHER_ACCURACY_PHASE_P5']);

  assert.equal(BLIZZARD.id, 59);
  assert.equal(BLIZZARD.name, 'blizzard');
  assert.equal(BLIZZARD.type, 'ice');
  assert.equal(BLIZZARD.power, 110);
  assert.equal(BLIZZARD.accuracy, 70);
  assert.equal(BLIZZARD.pp, 5);
  assert.equal(BLIZZARD.damageClass, 'special');
  assert.equal(validateMoveData(BLIZZARD), true);

  // Scald (ID 503)
  const scCap = getMoveCapability({ id: 503 });
  assert.equal(scCap.id, 503);
  assert.equal(scCap.name, 'scald');
  assert.equal(scCap.supportLevel, 'FULL');
  assert.deepEqual(scCap.knownPending, []);

  assert.equal(SCALD.id, 503);
  assert.equal(SCALD.name, 'scald');
  assert.equal(SCALD.type, 'water');
  assert.equal(SCALD.power, 80);
  assert.equal(SCALD.accuracy, 100);
  assert.equal(SCALD.pp, 15);
  assert.equal(SCALD.damageClass, 'special');
  assert.equal(validateMoveData(SCALD), true);

  // Helpers de descongelamento
  assert.equal(isSelfThawingMove(SCALD), true);
  assert.equal(isSelfThawingMove(ICE_BEAM), false);
  assert.equal(isThawingMoveTarget(SCALD), true);
  assert.equal(isThawingMoveTarget(FLAMETHROWER), true);
  assert.equal(isThawingMoveTarget(WILL_O_WISP), false); // Status de fogo não descongela
  assert.equal(isThawingMoveTarget(ICE_BEAM), false);
  assert.equal(isDamagingFireMove(FLAMETHROWER), true);
  assert.equal(isDamagingFireMove(WILL_O_WISP), false);
  assert.equal(isDamagingFireMove(SCALD), false);
});

// 2. APLICAÇÃO DE CONGELAMENTO PELO EFEITO SECUNDÁRIO
test('P4-FZ-02: Ice Beam e Blizzard congelam quando rolagem secundária está na faixa de 10% (1..10)', () => {
  const attacker = makeMon(131, 'lapras', ['water', 'ice'], [ICE_BEAM]);
  const defender = makeMon(3, 'venusaur', ['grass', 'poison'], [TACKLE]);
  const battle = Engine.createBattle(attacker, defender);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(58, { secondaryEffectRoll: 5 }),
    enemy: makeAction(33)
  });

  const appliedEv = result.events.find(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.statusCondition === 'freeze');
  assert.ok(appliedEv, 'STATUS_APPLIED deve ser emitido');
  assert.equal(appliedEv.target, 'enemy');
  assert.equal(appliedEv.pokemonName, 'venusaur');
  assert.equal(result.state.enemy.statusCondition, 'freeze');
});

test('P4-FZ-03: Rolagem secundária fora da faixa de 10% (11..100) não congela o defensor', () => {
  const attacker = makeMon(131, 'lapras', ['water', 'ice'], [ICE_BEAM]);
  const defender = makeMon(3, 'venusaur', ['grass', 'poison'], [TACKLE]);
  const battle = Engine.createBattle(attacker, defender);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(58, { secondaryEffectRoll: 11 }),
    enemy: makeAction(33)
  });

  const appliedEv = result.events.find(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.statusCondition === 'freeze');
  assert.equal(appliedEv, undefined, 'Não deve emitir STATUS_APPLIED com rolagem 11');
  assert.equal(result.state.enemy.statusCondition, null);
});

test('P4-FZ-04: Imunidade de tipo Ice ao congelamento', () => {
  assert.equal(isStatusConditionImmune('freeze', ['ice']), true);
  assert.equal(isStatusConditionImmune('freeze', ['water', 'ice']), true);
  assert.equal(isStatusConditionImmune('freeze', ['grass']), false);

  const attacker = makeMon(9, 'blastoise', ['water'], [ICE_BEAM]);
  const defender = makeMon(131, 'lapras', ['water', 'ice'], [TACKLE]); // Tipo Ice
  const battle = Engine.createBattle(attacker, defender);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(58, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });

  assert.equal(result.state.enemy.statusCondition, null, 'Pokémon tipo Ice não pode ser congelado');
  assert.equal(result.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), false);
});

test('P4-FZ-05: Defensor já com status principal (burn/poison/paralysis/sleep/freeze) não recebe congelamento', () => {
  const statuses = ['burn', 'poison', 'paralysis', 'sleep', 'freeze'];
  for (const st of statuses) {
    const attacker = makeMon(9, 'blastoise', ['water'], [ICE_BEAM]);
    const defender = makeMon(3, 'venusaur', ['grass'], [TACKLE], {}, { statusCondition: st, sleepTurns: st === 'sleep' ? 2 : 0 });
    const battle = Engine.createBattle(attacker, defender);

    const result = Engine.resolveTurn(battle, {
      player: makeAction(58, { secondaryEffectRoll: 1 }),
      enemy: makeAction(33, { thawRoll: 50 })
    });

    const freezeApplied = result.events.find(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.statusCondition === 'freeze');
    assert.equal(freezeApplied, undefined, `Não deve congelar alvo que já possui status ${st}`);
    assert.equal(result.state.enemy.statusCondition, st, `Status ${st} original deve ser preservado`);
  }
});

test('P4-FZ-06: Em caso de erro de acurácia ou nocaute do defensor, congelamento não é aplicado', () => {
  // Erro de precisão
  const attacker = makeMon(9, 'blastoise', ['water'], [BLIZZARD]);
  const defender = makeMon(3, 'venusaur', ['grass'], [TACKLE]);
  const battle = Engine.createBattle(attacker, defender);

  const resMiss = Engine.resolveTurn(battle, {
    player: makeAction(59, { accuracyRoll: 90, secondaryEffectRoll: 1 }), // 70 acc, roll 90 erra
    enemy: makeAction(33)
  });
  assert.equal(resMiss.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), false);

  // Nocaute do alvo
  const weakDefender = makeMon(3, 'venusaur', ['grass'], [TACKLE], { hp: 5 });
  const battleKO = Engine.createBattle(attacker, weakDefender);
  const resKO = Engine.resolveTurn(battleKO, {
    player: makeAction(59, { accuracyRoll: 50, damageRoll: 100, secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });
  assert.equal(resKO.state.enemy.currentHp, 0);
  assert.equal(resKO.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.statusCondition === 'freeze'), false);
});

// 3. DESCONGELAMENTO NATURAL (20% DE CHANCE POR TURNO)
test('P4-FZ-07: Descongelamento natural quando thawRoll <= 20 — cura congelamento e executa golpe', () => {
  const attacker = makeMon(3, 'venusaur', ['grass'], [TACKLE], {}, { statusCondition: 'freeze' });
  const defender = makeMon(9, 'blastoise', ['water'], [TACKLE]);
  const battle = Engine.createBattle(attacker, defender);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(33, { thawRoll: 15, accuracyRoll: 50, damageRoll: 100 }),
    enemy: makeAction(33)
  });

  const curedEv = result.events.find(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED');
  assert.ok(curedEv, 'STATUS_CURED com THAWED deve ser emitido');
  assert.equal(curedEv.pokemonName, 'venusaur');
  assert.equal(result.state.player.statusCondition, null, 'Status deve ter sido curado');

  // O golpe deve ter sido executado no mesmo turno
  const moveUsed = result.events.find(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player');
  assert.ok(moveUsed, 'Golpe do atacante deve ser executado no turno em que descongela');
  assert.equal(result.state.player.moves[0].currentPp, TACKLE.pp - 1, 'PP consumido');
});

test('P4-FZ-08: Falha no descongelamento natural (thawRoll > 20) — imobilizado sem gastar PP', () => {
  const attacker = makeMon(3, 'venusaur', ['grass'], [TACKLE], {}, { statusCondition: 'freeze' });
  const defender = makeMon(9, 'blastoise', ['water'], [TACKLE]);
  const battle = Engine.createBattle(attacker, defender);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(33, { thawRoll: 25 }),
    enemy: makeAction(33)
  });

  const immobEv = result.events.find(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.reason === 'FROZEN_SOLID');
  assert.ok(immobEv, 'STATUS_IMMOBILIZED com FROZEN_SOLID deve ser emitido');
  assert.equal(immobEv.pokemonName, 'venusaur');
  assert.equal(result.state.player.statusCondition, 'freeze', 'Permanece congelado');
  assert.equal(result.state.player.moves[0].currentPp, TACKLE.pp, 'PP NÃO deve ser consumido');
  assert.equal(result.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), false);
});

// 4. DESCONGELAMENTO PRÓPRIO VIA SCALD (SELF-THAW)
test('P4-FZ-09: Scald descongela o próprio usuário na execução (onModifyMove), mesmo se errar o golpe', () => {
  const attacker = makeMon(9, 'blastoise', ['water'], [SCALD], {}, { statusCondition: 'freeze' });
  const defender = makeMon(3, 'venusaur', ['grass'], [TACKLE]);
  const battle = Engine.createBattle(attacker, defender);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(503, { accuracyRoll: 50, damageRoll: 100, secondaryEffectRoll: 50 }),
    enemy: makeAction(33)
  });

  const curedEv = result.events.find(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED');
  assert.ok(curedEv, 'Scald deve emitir STATUS_CURED (THAWED) ao executar');
  assert.equal(result.state.player.statusCondition, null);
  assert.equal(result.state.player.moves[0].currentPp, SCALD.pp - 1);
});

test('P4-FZ-10: Scald com 0 PP não pode ser selecionado / executado', () => {
  const scaldNoPp = { ...SCALD, pp: 15, currentPp: 0 };
  const attacker = makeMon(9, 'blastoise', ['water'], [scaldNoPp, TACKLE], {}, { statusCondition: 'freeze' });
  const defender = makeMon(3, 'venusaur', ['grass'], [TACKLE]);
  const battle = Engine.createBattle(attacker, defender);

  assert.throws(() => {
    Engine.resolveTurn(battle, {
      player: makeAction(503),
      enemy: makeAction(33)
    });
  }, /ACTION_REJECTED|esgotado/);
});

// 5. DESCONGELAMENTO DO ALVO POR SCALD E GOLPES DE FOGO
test('P4-FZ-11: Scald atinge alvo congelado sobrevivente — descongela o alvo após efeitos secundários e NÃO o queima no mesmo turno', () => {
  // Conforme Showdown conditions.ts (frz.onAfterMoveSecondary):
  // 1. Dano aplicado.
  // 2. Efeito secundário avaliado enquanto alvo está congelado (burn impedido).
  // 3. onAfterMoveSecondary descongela o alvo sobrevivente.
  const attacker = makeMon(9, 'blastoise', ['water'], [SCALD]);
  const defender = makeMon(3, 'venusaur', ['grass'], [TACKLE], { hp: 300 }, { statusCondition: 'freeze' });
  const battle = Engine.createBattle(attacker, defender);

  // Rolagem secundária 1 (que normalmente queimaria um alvo saudável)
  const res = Engine.resolveTurn(battle, {
    player: makeAction(503, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });

  // Alvo deve ter sido descongelado
  const thawEv = res.events.find(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED');
  assert.ok(thawEv, 'Alvo deve ser descongelado por Scald em onAfterMoveSecondary');
  assert.equal(thawEv.pokemonName, 'venusaur');

  // Queimadura NÃO deve ter sido aplicada
  const burnEv = res.events.find(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.statusCondition === 'burn');
  assert.equal(burnEv, undefined, 'Scald NÃO deve queimar o mesmo alvo congelado no mesmo golpe');
  assert.equal(res.state.enemy.statusCondition, null, 'Alvo termina sem condição de status');

  // Ordem correta dos eventos: DAMAGE_APPLIED antes de STATUS_CURED
  const damageIdx = res.events.findIndex(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED);
  const thawIdx = res.events.findIndex(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED');
  assert.ok(damageIdx !== -1 && thawIdx !== -1);
  assert.ok(damageIdx < thawIdx, 'Dano deve ser aplicado antes do descongelamento');
});

test('P4-FZ-12: Golpe de fogo com dano descongela o alvo sobrevivente; golpe de fogo status NÃO descongela', () => {
  // Flamethrower descongela em onDamagingHit
  const attackerFire = makeMon(6, 'charizard', ['fire'], [FLAMETHROWER]);
  const defender = makeMon(3, 'venusaur', ['grass'], [TACKLE], { hp: 300 }, { statusCondition: 'freeze' });
  const battleFire = Engine.createBattle(attackerFire, defender);

  const resFire = Engine.resolveTurn(battleFire, {
    player: makeAction(53, { secondaryEffectRoll: 50 }),
    enemy: makeAction(33)
  });

  const thawEv = resFire.events.find(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED');
  assert.ok(thawEv, 'Flamethrower deve descongelar o alvo ao causar dano');
  assert.equal(resFire.state.enemy.statusCondition, null);

  // Will-O-Wisp (golpe status de fogo) NÃO descongela
  const attackerWisp = makeMon(6, 'charizard', ['fire'], [WILL_O_WISP]);
  const defenderFrozen = makeMon(3, 'venusaur', ['grass'], [TACKLE], { hp: 300 }, { statusCondition: 'freeze' });
  const battleWisp = Engine.createBattle(attackerWisp, defenderFrozen);

  const resWisp = Engine.resolveTurn(battleWisp, {
    player: makeAction(261, { accuracyRoll: 50 }),
    enemy: makeAction(33, { thawRoll: 50 })
  });

  assert.equal(resWisp.events.some(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED'), false);
  assert.equal(resWisp.state.enemy.statusCondition, 'freeze', 'Alvo permanece congelado');
});

// 6. INTERAÇÃO ENTRE CONGELAMENTO E HESITAÇÃO (FLINCH)
test('P4-FZ-13: Alvo congelado que falha descongelamento não deve produzir anúncio duplo de flinch', () => {
  // Flareon mais rápido usa Bite e causa flinch em Venusaur (congelado)
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 200 });
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 50 }, { statusCondition: 'freeze' });
  const battle = Engine.createBattle(flareon, venusaur);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(44, { secondaryEffectRoll: 1 }), // Causa flinch no defensor
    enemy: makeAction(33, { thawRoll: 50 }) // Defensor falha descongelamento
  });

  const freezeImmob = result.events.filter(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy');
  assert.equal(freezeImmob.length, 1);
  assert.equal(freezeImmob[0].statusCondition, 'freeze');

  const flinchImmob = result.events.filter(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'enemy');
  assert.equal(flinchImmob.length, 0, 'Flinch não deve emitir evento duplicado');
  assert.equal(result.state.enemy.isFlinched, false, 'isFlinched limpo para o próximo turno');
});

test('P4-FZ-14: Alvo congelado que descongela naturalmente é impedido pelo flinch pendente no mesmo turno', () => {
  // Flareon mais rápido usa Bite e causa flinch em Venusaur (congelado)
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 200 });
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 50 }, { statusCondition: 'freeze' });
  const battle = Engine.createBattle(flareon, venusaur);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(44, { secondaryEffectRoll: 1 }), // Causa flinch no defensor
    enemy: makeAction(33, { thawRoll: 10, accuracyRoll: 50, damageRoll: 100 }) // Defensor descongela
  });

  // Descongelou com sucesso
  const curedEv = result.events.find(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED' && e.actor === 'enemy');
  assert.ok(curedEv);
  assert.equal(result.state.enemy.statusCondition, null);

  // Mas hesitou pelo flinch aplicado pelo Flareon no mesmo turno
  const flinchEv = result.events.find(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'enemy');
  assert.ok(flinchEv, 'FLINCH_IMMOBILIZED deve impedir a ação após descongelar');
  assert.equal(result.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'), false);
  assert.equal(result.state.enemy.isFlinched, false);
});

// 7. INTEGRAÇÃO COM BATTLESESSIONCONTROLLER E DETERMINISTICRANDOMSOURCE
test('P4-FZ-15: DeterministicRandomSource rollThaw e sequências determinísticas', () => {
  const rng = new DeterministicRandomSource({ thawSequence: [15, 80] });
  assert.equal(rng.rollThaw(), 15);
  assert.equal(rng.rollThaw(), 80);
  assert.ok(rng.rollThaw() >= 1 && rng.rollThaw() <= 100);

  rng.setThawSequence([5, 95]);
  assert.equal(rng.rollThaw(), 5);
  assert.equal(rng.rollThaw(), 95);
});

test('P4-FZ-16: BattleSessionController encaminha thawRoll para combatente congelado na ação de golpe', async () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80 }, { statusCondition: 'freeze' });
  const lapras = makeMon(131, 'lapras', ['water', 'ice'], [TACKLE], { speed: 60 });
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 80 });

  const hypno = makeMon(97, 'hypno', ['psychic'], [TACKLE], { speed: 50 });
  const fainted1 = makeMon(136, 'flareon', ['fire'], [TACKLE], { hp: 500 }, { currentHp: 0 });
  const fainted2 = makeMon(135, 'jolteon', ['electric'], [TACKLE], { hp: 500 }, { currentHp: 0 });

  const rng = new DeterministicRandomSource();
  // Player descongela com 10
  rng.setThawSequence([10]);
  rng.setAccuracySequence([50]);
  rng.setDamageSequence([100]);

  const capturedEvents = [];
  const session = new BattleSessionController({
    teamStore: { load: () => [9, 131, 3] },
    hydrator: {
      hydrateTeam: async (ids) => ids.map(id => (id === 9 ? blastoise : (id === 131 ? lapras : venusaur)))
    },
    opponentFactory: {
      createOpponentTeam: async () => [hypno, fainted1, fainted2]
    },
    randomSource: rng,
    presentationEngine: {
      play: async (events) => { capturedEvents.push(...events); },
      playCommands: async () => {}
    }
  });

  await session.prepareBattle({ playerTeamIds: [9, 131, 3] });
  await session.startBattle();

  await session.submitPlayerMove(blastoise.moves[0].id);

  const thawEvent = capturedEvents.find(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED');
  assert.ok(thawEvent, 'STATUS_CURED deve ter sido emitido na sessão');
  assert.equal(thawEvent.pokemonName, 'blastoise');
  const activeMon = session.engine.getActiveCombatant(session.battleState, 'player');
  assert.equal(activeMon.statusCondition, null);
});

test('P4-FZ-17: BattleSessionController encaminha thawRoll do adversário congelado durante troca voluntária', async () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80 });
  const lapras = makeMon(131, 'lapras', ['water', 'ice'], [TACKLE], { speed: 60 });
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 80 });

  const hypno = makeMon(97, 'hypno', ['psychic'], [TACKLE], { speed: 120 }, { statusCondition: 'freeze' });
  const fainted1 = makeMon(136, 'flareon', ['fire'], [TACKLE], { hp: 500 }, { currentHp: 0 });
  const fainted2 = makeMon(135, 'jolteon', ['electric'], [TACKLE], { hp: 500 }, { currentHp: 0 });

  let thawRollCalled = 0;
  const rng = new DeterministicRandomSource();
  rng.setThawSequence([80]); // Falha em descongelar
  const origRollThaw = rng.rollThaw.bind(rng);
  rng.rollThaw = () => {
    thawRollCalled++;
    return origRollThaw();
  };

  const capturedEvents = [];
  const session = new BattleSessionController({
    teamStore: { load: () => [9, 131, 3] },
    hydrator: {
      hydrateTeam: async (ids) => ids.map(id => (id === 9 ? blastoise : (id === 131 ? lapras : venusaur)))
    },
    opponentFactory: {
      createOpponentTeam: async () => [hypno, fainted1, fainted2]
    },
    randomSource: rng,
    presentationEngine: {
      play: async (events) => { capturedEvents.push(...events); },
      playCommands: async () => {}
    }
  });

  await session.prepareBattle({ playerTeamIds: [9, 131, 3] });
  await session.startBattle();

  await session.submitPlayerSwitch(131);

  assert.equal(thawRollCalled, 1, 'rollThaw deve ser acionado para o adversário congelado durante a troca voluntária');
  const immobEvent = capturedEvents.find(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.reason === 'FROZEN_SOLID');
  assert.ok(immobEvent, 'Adversário congelado emite STATUS_IMMOBILIZED');
});

// 8. APRESENTAÇÃO E ADAPTADOR VISUAL (UI DOM ADAPTER)
test('P4-FZ-18: Mapeador e UI Dom Adapter produzem mensagens corretas em português para congelamento', async () => {
  const events = [
    { type: BATTLE_EVENTS.STATUS_APPLIED, target: 'player', pokemonName: 'blastoise', statusCondition: 'freeze' },
    { type: BATTLE_EVENTS.STATUS_IMMOBILIZED, actor: 'player', target: 'player', pokemonName: 'blastoise', statusCondition: 'freeze', reason: 'FROZEN_SOLID' },
    { type: BATTLE_EVENTS.STATUS_CURED, actor: 'player', target: 'player', pokemonName: 'blastoise', statusCondition: 'freeze', reason: 'THAWED' }
  ];

  const commands = Mapper.mapEvents(events);
  assert.equal(commands.length, 3);
  assert.equal(commands[0].type, 'STATUS_FEEDBACK');
  assert.equal(commands[0].outcome, 'APPLIED');
  assert.equal(commands[0].statusCondition, 'freeze');

  assert.equal(commands[1].type, 'STATUS_FEEDBACK');
  assert.equal(commands[1].outcome, 'IMMOBILIZED');
  assert.equal(commands[1].statusCondition, 'freeze');

  assert.equal(commands[2].type, 'STATUS_FEEDBACK');
  assert.equal(commands[2].outcome, 'THAWED');

  // Teste de mensagens no BattleUiDomAdapter
  const logs = [];
  const fakeView = {
    displayMessage: (msg) => logs.push(msg),
    updateStatusBadge: () => {}
  };
  const adapter = new BattleUiDomAdapter({ view: fakeView });

  await adapter.execute(commands[0]);
  assert.ok(logs[0].includes('foi congelado!'));

  await adapter.execute(commands[1]);
  assert.ok(logs[1].includes('está congelado e não pôde se mover!'));

  await adapter.execute(commands[2]);
  assert.ok(logs[2].includes('descongelou!'));
  assert.ok(!logs[2].includes('acordou!'), 'Nunca deve dizer acordou para congelamento');
});

// 9. AVALIADOR DE IA (BATTLE EVALUATOR)
test('P4-FZ-19: BattleEvaluator pondera ação de Pokémon congelado e valoriza efeito secundário de congelamento', () => {
  const frozenMon = makeMon(9, 'blastoise', ['water'], [TACKLE, SCALD], {}, { statusCondition: 'freeze' });
  const healthyOpponent = makeMon(3, 'venusaur', ['grass'], [TACKLE]);

  // Scald tem factor 1.0 porque descongela a si mesmo; Tackle tem factor 0.20
  const evalTackle = Evaluator.evaluateMove(frozenMon, healthyOpponent, TACKLE);
  const evalScald = Evaluator.evaluateMove(frozenMon, healthyOpponent, SCALD);
  assert.ok(evalScald.expectedDamage > 0);
  assert.ok(evalTackle.expectedDamage > 0);

  // Ice Beam contra alvo vulnerável a freeze ganha bônus de status disruption
  const iceAttacker = makeMon(131, 'lapras', ['water', 'ice'], [ICE_BEAM]);
  const evalIceBeam = Evaluator.evaluateMove(iceAttacker, healthyOpponent, ICE_BEAM);
  assert.ok(evalIceBeam.expectedStatusBenefit > 0, 'Benefício esperado de congelamento é valorizado');
  assert.ok(evalIceBeam.expectedDamage > 0);
});

// =====================================================================================
// 10. COMPORTAMENTO ESPECÍFICO DO USUÁRIO DE SCALD
// =====================================================================================

test('P4-FZ-20: Usuário congelado de Scald sofre Bite mais rápido com flinch — permanece congelado, sem cura e sem gastar PP', () => {
  // Flareon (speed 200) usa Bite com secondaryEffectRoll 1 (causa flinch)
  // Blastoise (speed 80) está congelado e tenta usar Scald
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 200 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [SCALD], { speed: 80 }, { statusCondition: 'freeze' });
  const battle = Engine.createBattle(flareon, blastoise);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(44, { secondaryEffectRoll: 1 }), // Bite aplica flinch
    enemy: makeAction(503) // Scald
  });

  // Blastoise hesita
  const flinchEv = result.events.find(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'enemy');
  assert.ok(flinchEv, 'FLINCH_IMMOBILIZED deve ser emitido para o adversário');

  // Nenhum STATUS_CURED emitido para Blastoise
  assert.equal(
    result.events.some(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.actor === 'enemy'),
    false,
    'Não deve emitir STATUS_CURED para usuário de Scald impedido por flinch'
  );

  // Permanece congelado
  assert.equal(result.state.enemy.statusCondition, 'freeze', 'Deve permanecer congelado');

  // Não executou golpe e não gastou PP
  assert.equal(result.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'), false);
  assert.equal(result.state.enemy.moves[0].currentPp, SCALD.pp, 'PP não deve ser consumido');
});

test('P4-FZ-21: Usuário congelado de Scald sem flinch descongela na execução e usa o golpe normalmente', () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [SCALD], { speed: 100 }, { statusCondition: 'freeze' });
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 50 });
  const battle = Engine.createBattle(blastoise, venusaur);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(503, { accuracyRoll: 50, damageRoll: 100 }),
    enemy: makeAction(33)
  });

  const curedEv = result.events.find(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED' && e.actor === 'player');
  assert.ok(curedEv, 'STATUS_CURED com THAWED deve ser emitido');
  assert.equal(result.state.player.statusCondition, null, 'Status é curado');
  assert.ok(result.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'));
  assert.equal(result.state.player.moves[0].currentPp, SCALD.pp - 1);
});

test('P4-FZ-22: Usuário congelado de Scald descongela mesmo em erro de precisão (miss)', () => {
  // Move com acurácia reduzida para simular miss determinístico
  const scaldInaccurate = { ...SCALD, accuracy: 80 };
  const blastoise = makeMon(9, 'blastoise', ['water'], [scaldInaccurate], { speed: 100 }, { statusCondition: 'freeze' });
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 50 });
  const battle = Engine.createBattle(blastoise, venusaur);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(503, { accuracyRoll: 90 }), // 80 acc, roll 90 erra
    enemy: makeAction(33)
  });

  // Descongela no onModifyMove
  const curedEv = result.events.find(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED' && e.actor === 'player');
  assert.ok(curedEv, 'Deve descongelar mesmo se o golpe errar');
  assert.equal(result.state.player.statusCondition, null);
  assert.ok(result.events.some(e => e.type === BATTLE_EVENTS.MOVE_MISSED && e.actor === 'player'));
  assert.equal(result.state.player.moves[0].currentPp, scaldInaccurate.pp - 1, 'PP consumido no miss');
});

test('P4-FZ-23: Usuário de Scald sem PP não consegue selecionar / executar e não recebe cura indevida', () => {
  const scaldNoPp = { ...SCALD, pp: 15, currentPp: 0 };
  const blastoise = makeMon(9, 'blastoise', ['water'], [scaldNoPp, TACKLE], {}, { statusCondition: 'freeze' });
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE]);
  const battle = Engine.createBattle(blastoise, venusaur);

  assert.throws(() => {
    Engine.resolveTurn(battle, {
      player: makeAction(503),
      enemy: makeAction(33)
    });
  }, /ACTION_REJECTED|esgotado/);

  // Não curou
  assert.equal(battle.player.statusCondition, 'freeze');
});

test('P4-FZ-24: Movimento comum com descongelamento natural bem-sucedido seguido de flinch descongela mas perde a ação', () => {
  // Flareon mais rápido usa Bite e causa flinch
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 200 });
  // Venusaur usa Tackle (movimento comum, NÃO defrost) e rola thawRoll 10 (descongelamento natural)
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 50 }, { statusCondition: 'freeze' });
  const battle = Engine.createBattle(flareon, venusaur);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(44, { secondaryEffectRoll: 1 }), // Flinch
    enemy: makeAction(33, { thawRoll: 10 }) // Natural thaw <= 20
  });

  // Descongelou naturalmente
  const curedEv = result.events.find(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED' && e.actor === 'enemy');
  assert.ok(curedEv, 'Descongelamento natural cura antes de flinch');
  assert.equal(result.state.enemy.statusCondition, null, 'Termina descongelado');

  // Mas hesitou pelo flinch
  const flinchEv = result.events.find(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'enemy');
  assert.ok(flinchEv, 'Flinch impede a ação após o descongelamento natural');
  assert.equal(result.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'), false);
});

// =====================================================================================
// 11. COMPORTAMENTO ESPECÍFICO DO ALVO DE SCALD
// =====================================================================================

test('P4-FZ-25: Scald contra alvo saudável pode queimar normalmente', () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [SCALD]);
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE], { hp: 300 });
  const battle = Engine.createBattle(blastoise, venusaur);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(503, { secondaryEffectRoll: 1 }), // <= 30 queima
    enemy: makeAction(33)
  });

  const burnEv = result.events.find(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.statusCondition === 'burn');
  assert.ok(burnEv, 'Alvo saudável deve poder ser queimado por Scald');
  assert.equal(result.state.enemy.statusCondition, 'burn');
});

test('P4-FZ-26: Scald erra alvo congelado — alvo permanece congelado sem cura', () => {
  const scaldInaccurate = { ...SCALD, accuracy: 80 };
  const blastoise = makeMon(9, 'blastoise', ['water'], [scaldInaccurate]);
  const defender = makeMon(3, 'venusaur', ['grass'], [TACKLE], { hp: 300 }, { statusCondition: 'freeze' });
  const battle = Engine.createBattle(blastoise, defender);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(503, { accuracyRoll: 90 }), // Erra
    enemy: makeAction(33, { thawRoll: 50 })
  });

  assert.equal(result.events.some(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.target === 'enemy'), false);
  assert.equal(result.state.enemy.statusCondition, 'freeze', 'Alvo deve permanecer congelado');
});

test('P4-FZ-27: Scald nocauteia alvo congelado — nenhum anúncio de descongelamento', () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [SCALD]);
  const weakDefender = makeMon(3, 'venusaur', ['grass'], [TACKLE], { hp: 5 }, { statusCondition: 'freeze' });
  const battle = Engine.createBattle(blastoise, weakDefender);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(503, { damageRoll: 100 }),
    enemy: makeAction(33)
  });

  assert.equal(result.state.enemy.currentHp, 0, 'Alvo foi derrotado');
  assert.equal(
    result.events.some(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.target === 'enemy'),
    false,
    'Não deve anunciar descongelamento para alvo nocauteado'
  );
});

test('P4-FZ-28: Golpe de dano Fire (Flamethrower) contra alvo congelado mantém ordem de descongelamento em onDamagingHit', () => {
  const charizard = makeMon(6, 'charizard', ['fire'], [FLAMETHROWER]);
  const defender = makeMon(3, 'venusaur', ['grass'], [TACKLE], { hp: 300 }, { statusCondition: 'freeze' });
  const battle = Engine.createBattle(charizard, defender);

  const result = Engine.resolveTurn(battle, {
    player: makeAction(53, { damageRoll: 100, secondaryEffectRoll: 50 }),
    enemy: makeAction(33)
  });

  // Descongela imediatamente no impacto de dano (Step 8B)
  const damageIdx = result.events.findIndex(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED);
  const thawIdx = result.events.findIndex(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED');
  assert.ok(damageIdx !== -1 && thawIdx !== -1);
  assert.equal(thawIdx, damageIdx + 1, 'Descongelamento de dano Fire ocorre imediatamente após DAMAGE_APPLIED');
  assert.equal(result.state.enemy.statusCondition, null);
});

// =====================================================================================
// 12. TESTES DE SESSÃO REAL VIA BATTLESESSIONCONTROLLER
// =====================================================================================

test('P4-FZ-29: Sessão real — Usuário congelado de Scald impedido por flinch permanece congelado sem cura', async () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [SCALD], { speed: 80 }, { statusCondition: 'freeze' });
  const lapras = makeMon(131, 'lapras', ['water', 'ice'], [TACKLE], { speed: 60 });
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 70 });

  // Adversário mais rápido com Bite (ID 44)
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 150 });
  const fainted1 = makeMon(97, 'hypno', ['psychic'], [TACKLE], { hp: 500 }, { currentHp: 0 });
  const fainted2 = makeMon(135, 'jolteon', ['electric'], [TACKLE], { hp: 500 }, { currentHp: 0 });

  const rng = new DeterministicRandomSource();
  rng.setAccuracySequence([1, 1]);
  rng.setDamageSequence([100, 100]);
  rng.setSecondaryEffectSequence([100, 1]); // Jogador consome 1º roll; adversário consome 2º roll (Bite causa flinch com 1 <= 30)

  const capturedEvents = [];
  const session = new BattleSessionController({
    teamStore: { load: () => [9, 131, 3] },
    hydrator: {
      hydrateTeam: async (ids) => ids.map(id => (id === 9 ? blastoise : (id === 131 ? lapras : venusaur)))
    },
    opponentFactory: {
      createOpponentTeam: async () => [flareon, fainted1, fainted2]
    },
    randomSource: rng,
    presentationEngine: {
      play: async (events) => { capturedEvents.push(...events); },
      playCommands: async () => {}
    }
  });

  await session.prepareBattle({ playerTeamIds: [9, 131, 3] });
  await session.startBattle();

  // Jogador tenta usar Scald (503)
  await session.submitPlayerMove(503);

  // 1. Motivo correto de impedimento: FLINCH_IMMOBILIZED para o jogador
  const flinchEvent = capturedEvents.find(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'player');
  assert.ok(flinchEvent, 'FLINCH_IMMOBILIZED deve ser emitido para o jogador');

  // 2. Ausência de cura falsa ou duplicada
  const cureEvents = capturedEvents.filter(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.actor === 'player');
  assert.equal(cureEvents.length, 0, 'Nenhum STATUS_CURED deve ser emitido para o jogador impedido por flinch');

  // 3. O combatente na sessão permanece congelado
  const activeMon = session.engine.getActiveCombatant(session.battleState, 'player');
  assert.equal(activeMon.statusCondition, 'freeze', 'Jogador permanece com status freeze');

  // 4. Mapeador converte sem emissão de cura
  const commands = Mapper.mapEvents(capturedEvents);
  assert.equal(
    commands.some(c => c.type === 'STATUS_FEEDBACK' && c.outcome === 'THAWED' && c.side === 'player'),
    false,
    'Nenhum comando THAWED deve ser gerado para o jogador'
  );
  assert.ok(
    commands.some(c => c.type === 'FLINCH_FEEDBACK' || (c.type === 'STATUS_FEEDBACK' && c.outcome === 'FLINCHED')),
    'Comando de feedback de flinch deve ser gerado'
  );
});

test('P4-FZ-30: Sessão real — Scald atingindo alvo congelado com rolagem secundária 1 descongela e não queima', async () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [SCALD], { speed: 120 });
  const lapras = makeMon(131, 'lapras', ['water', 'ice'], [TACKLE], { speed: 60 });
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 70 });

  // Adversário congelado com Tackle
  const hypno = makeMon(97, 'hypno', ['psychic'], [TACKLE], { speed: 50 }, { statusCondition: 'freeze' });
  const fainted1 = makeMon(136, 'flareon', ['fire'], [TACKLE], { hp: 500 }, { currentHp: 0 });
  const fainted2 = makeMon(135, 'jolteon', ['electric'], [TACKLE], { hp: 500 }, { currentHp: 0 });

  const rng = new DeterministicRandomSource();
  rng.setAccuracySequence([1]);
  rng.setDamageSequence([100]);
  rng.setSecondaryEffectSequence([1]); // Scald secondary roll 1 (normalmente queimaria)
  rng.setThawSequence([80]); // Se Hypno tentasse mover

  const capturedEvents = [];
  const session = new BattleSessionController({
    teamStore: { load: () => [9, 131, 3] },
    hydrator: {
      hydrateTeam: async (ids) => ids.map(id => (id === 9 ? blastoise : (id === 131 ? lapras : venusaur)))
    },
    opponentFactory: {
      createOpponentTeam: async () => [hypno, fainted1, fainted2]
    },
    randomSource: rng,
    presentationEngine: {
      play: async (events) => { capturedEvents.push(...events); },
      playCommands: async () => {}
    }
  });

  await session.prepareBattle({ playerTeamIds: [9, 131, 3] });
  await session.startBattle();

  await session.submitPlayerMove(503);

  // 1. Ausência de STATUS_APPLIED de burn no alvo congelado
  const burnApplied = capturedEvents.find(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.statusCondition === 'burn');
  assert.equal(burnApplied, undefined, 'Scald NÃO deve aplicar burn em alvo congelado');

  // 2. Exatamente um STATUS_CURED de descongelamento
  const thawCured = capturedEvents.filter(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED' && e.target === 'enemy');
  assert.equal(thawCured.length, 1, 'Exatamente um evento STATUS_CURED para o inimigo');

  // 3. Ordem correta entre dano e cura nos eventos
  const damageIdx = capturedEvents.findIndex(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.target === 'enemy');
  const thawIdx = capturedEvents.findIndex(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.reason === 'THAWED' && e.target === 'enemy');
  assert.ok(damageIdx !== -1 && thawIdx !== -1);
  assert.ok(damageIdx < thawIdx, 'Dano deve anteceder o descongelamento em onAfterMoveSecondary');

  // 4. Combatente no estado final da sessão termina sem condição principal
  const enemyActive = session.engine.getActiveCombatant(session.battleState, 'enemy');
  assert.equal(enemyActive.statusCondition, null, 'Adversário termina descongelado e sem burn');

  // 5. Mapeamento de apresentação
  const commands = Mapper.mapEvents(capturedEvents);
  const statusFeedbacks = commands.filter(c => c.type === 'STATUS_FEEDBACK');
  const burnFb = statusFeedbacks.find(c => c.statusCondition === 'burn');
  assert.equal(burnFb, undefined, 'Nenhum feedback de burn deve ser apresentado');

  const thawFb = statusFeedbacks.find(c => c.outcome === 'THAWED');
  assert.ok(thawFb, 'Feedback de THAWED deve ser apresentado');
});
