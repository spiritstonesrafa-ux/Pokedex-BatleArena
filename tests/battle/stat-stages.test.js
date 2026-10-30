const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const BattleEngine = require('../../assets/js/battle/battle-engine.js');
const BattleEvaluator = require('../../assets/js/battle/battle-evaluator.js');
const DamageCalculator = require('../../assets/js/battle/damage-calculator.js');
const TurnManager = require('../../assets/js/battle/turn-manager.js');
const BattleConstants = require('../../assets/js/battle/battle-constants.js');
const BattleAI = require('../../assets/js/battle/battle-ai.js');
const {
  BATTLE_EVENTS,
  BATTLE_STATUS,
  SWITCH_REASON,
  STAT_STAGE_KEYS,
  createDefaultStatStages,
  sanitizeStatStages,
  getStatStageMultiplier,
  getEffectiveStat,
  applyStatStageChange,
  resetStatStages,
  getStatBoosts,
  getSelfStatDrops,
  validateMoveData,
  isMechanicallySupportedMove
} = BattleConstants;
const PresentationMapper = require('../../assets/js/presentation/battle-presentation-mapper.js');
const { PRESENTATION_COMMANDS } = require('../../assets/js/presentation/battle-presentation-constants.js');
const { BattleUiDomAdapter } = require('../../assets/js/ui/battle-ui-adapter.js');

// Fixtures para os golpes piloto da Fase P3
const swordsDanceMove = Object.freeze({
  id: 14,
  name: 'swords-dance',
  type: 'normal',
  power: 0,
  accuracy: null,
  pp: 20,
  damageClass: 'status',
  statBoosts: Object.freeze({ attack: 2 })
});

const calmMindMove = Object.freeze({
  id: 347,
  name: 'calm-mind',
  type: 'psychic',
  power: 0,
  accuracy: null,
  pp: 20,
  damageClass: 'status',
  statBoosts: Object.freeze({ specialAttack: 1, specialDefense: 1 })
});

const closeCombatMove = Object.freeze({
  id: 370,
  name: 'close-combat',
  type: 'fighting',
  power: 120,
  accuracy: 100,
  pp: 5,
  damageClass: 'physical',
  selfStatDrops: Object.freeze({ defense: -1, specialDefense: -1 })
});

const overheatMove = Object.freeze({
  id: 315,
  name: 'overheat',
  type: 'fire',
  power: 130,
  accuracy: 90,
  pp: 5,
  damageClass: 'special',
  selfStatDrops: Object.freeze({ specialAttack: -2 })
});

const dracoMeteorMove = Object.freeze({
  id: 434,
  name: 'draco-meteor',
  type: 'dragon',
  power: 130,
  accuracy: 90,
  pp: 5,
  damageClass: 'special',
  selfStatDrops: Object.freeze({ specialAttack: -2 })
});

const tackleMove = Object.freeze({
  id: 33,
  name: 'tackle',
  type: 'normal',
  power: 40,
  accuracy: 100,
  pp: 35,
  damageClass: 'physical'
});

const bodyPressMove = Object.freeze({
  id: 776,
  name: 'body-press',
  type: 'fighting',
  power: 80,
  accuracy: 100,
  pp: 10,
  damageClass: 'physical'
});

const psystrikeMove = Object.freeze({
  id: 540,
  name: 'psystrike',
  type: 'psychic',
  power: 100,
  accuracy: 100,
  pp: 10,
  damageClass: 'special'
});

const dragonTailMove = Object.freeze({
  id: 525,
  name: 'dragon-tail',
  type: 'dragon',
  power: 60,
  accuracy: 90,
  pp: 10,
  damageClass: 'physical'
});

function createTestCombatant(id, name, types, stats, moves, currentHp = null, statStages = null) {
  const hp = stats.hp || 100;
  return {
    id,
    name,
    types: [...types],
    stats: { ...stats },
    currentHp: currentHp !== null ? currentHp : hp,
    maxHp: hp,
    attack: stats.attack || 50,
    defense: stats.defense || 50,
    specialAttack: stats.specialAttack || 50,
    specialDefense: stats.specialDefense || 50,
    speed: stats.speed || 50,
    statusCondition: null,
    statStages: statStages ? sanitizeStatStages(statStages) : createDefaultStatStages(),
    moves: moves.map(m => ({ ...m, currentPp: m.pp, maxPp: m.pp }))
  };
}

describe('FASE P3 — Ciclo 1: Estágios de Atributos (Stat Stages)', () => {

  test('P3-01: Chaves canônicas de atributos e sanitização de estágios (-6 a +6)', () => {
    assert.deepEqual(STAT_STAGE_KEYS, ['attack', 'defense', 'specialAttack', 'specialDefense', 'speed']);
    assert.equal(STAT_STAGE_KEYS.includes('accuracy'), false, 'Não deve conter precisão');
    assert.equal(STAT_STAGE_KEYS.includes('evasion'), false, 'Não deve conter evasão');

    const defaults = createDefaultStatStages();
    assert.deepEqual(defaults, {
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0
    });

    const sanitized = sanitizeStatStages({ attack: 10, defense: -8, specialAttack: 'invalid', speed: 3 });
    assert.equal(sanitized.attack, 6, 'Deve travar no teto +6');
    assert.equal(sanitized.defense, -6, 'Deve travar no piso -6');
    assert.equal(sanitized.specialAttack, 0, 'Entrada inválida deve virar 0');
    assert.equal(sanitized.specialDefense, 0, 'Entrada ausente deve virar 0');
    assert.equal(sanitized.speed, 3, 'Valor válido deve ser preservado');

    const emptySanitized = sanitizeStatStages(null);
    assert.deepEqual(emptySanitized, defaults);
  });

  test('P3-02: Multiplicadores canônicos para estágios de -6 a +6', () => {
    // Teto neutro
    assert.equal(getStatStageMultiplier(0), 1.0);

    // Multiplicadores positivos (2 + s) / 2
    assert.equal(getStatStageMultiplier(1), 1.5);
    assert.equal(getStatStageMultiplier(2), 2.0);
    assert.equal(getStatStageMultiplier(3), 2.5);
    assert.equal(getStatStageMultiplier(4), 3.0);
    assert.equal(getStatStageMultiplier(5), 3.5);
    assert.equal(getStatStageMultiplier(6), 4.0);

    // Multiplicadores negativos 2 / (2 + |s|)
    assert.equal(Number(getStatStageMultiplier(-1).toFixed(4)), Number((2 / 3).toFixed(4)));
    assert.equal(getStatStageMultiplier(-2), 0.5);
    assert.equal(getStatStageMultiplier(-3), 0.4);
    assert.equal(Number(getStatStageMultiplier(-4).toFixed(4)), Number((2 / 6).toFixed(4)));
    assert.equal(Number(getStatStageMultiplier(-5).toFixed(4)), Number((2 / 7).toFixed(4)));
    assert.equal(getStatStageMultiplier(-6), 0.25);
  });

  test('P3-03: Cálculo de stat efetivo (getEffectiveStat) preserva o stat base', () => {
    const mon = createTestCombatant(1, 'bulbasaur', ['grass'], { hp: 100, attack: 100, defense: 80, speed: 60 }, [tackleMove]);

    assert.equal(getEffectiveStat(mon, 'attack'), 100);

    mon.statStages.attack = 1;
    assert.equal(getEffectiveStat(mon, 'attack'), 150);
    assert.equal(mon.attack, 100, 'Stat base não deve ser alterado');

    mon.statStages.attack = 2;
    assert.equal(getEffectiveStat(mon, 'attack'), 200);

    mon.statStages.attack = -1;
    // Math.floor((100 * 2) / 3) = 66
    assert.equal(getEffectiveStat(mon, 'attack'), 66);

    mon.statStages.attack = -2;
    // Math.floor((100 * 2) / 4) = 50
    assert.equal(getEffectiveStat(mon, 'attack'), 50);

    // Stat com piso mínimo 1
    const weakMon = createTestCombatant(2, 'pawn', ['normal'], { hp: 10, attack: 1 }, [tackleMove]);
    weakMon.statStages.attack = -6;
    assert.equal(getEffectiveStat(weakMon, 'attack'), 1, 'Piso mínimo deve ser 1');
  });

  test('P3-04: Operação centralizada applyStatStageChange com relatório estruturado e bloqueios', () => {
    const mon = createTestCombatant(1, 'scizor', ['bug', 'steel'], { hp: 100, attack: 130 }, [tackleMove]);

    // Boost legal de +2
    const rep1 = applyStatStageChange(mon, 'attack', 2);
    assert.equal(rep1.statKey, 'attack');
    assert.equal(rep1.previousStage, 0);
    assert.equal(rep1.requestedDelta, 2);
    assert.equal(rep1.appliedDelta, 2);
    assert.equal(rep1.finalStage, 2);
    assert.equal(rep1.blockedReason, null);

    // Boost legal adicional de +2 -> 4
    const rep2 = applyStatStageChange(mon, 'attack', 2);
    assert.equal(rep2.finalStage, 4);

    // Boost legal adicional de +2 -> 6 (atinge teto)
    const rep3 = applyStatStageChange(mon, 'attack', 2);
    assert.equal(rep3.finalStage, 6);
    assert.equal(rep3.blockedReason, null);

    // Tentativa de boost adicional acima de +6
    const rep4 = applyStatStageChange(mon, 'attack', 2);
    assert.equal(rep4.previousStage, 6);
    assert.equal(rep4.requestedDelta, 2);
    assert.equal(rep4.appliedDelta, 0);
    assert.equal(rep4.finalStage, 6);
    assert.equal(rep4.blockedReason, 'AT_MAX');

    // Reset centralizado
    resetStatStages(mon);
    assert.equal(mon.statStages.attack, 0);

    // Quedas até o piso -6
    applyStatStageChange(mon, 'defense', -4);
    applyStatStageChange(mon, 'defense', -2); // Agora em -6
    const dropRep = applyStatStageChange(mon, 'defense', -1);
    assert.equal(dropRep.appliedDelta, 0);
    assert.equal(dropRep.finalStage, -6);
    assert.equal(dropRep.blockedReason, 'AT_MIN');
  });

  test('P3-05: Ciclo de vida: reset de estágios em troca voluntária, forçada e nocaute', () => {
    const teamPlayer = [
      createTestCombatant(1, 'lucario', ['fighting', 'steel'], { hp: 100, attack: 110 }, [swordsDanceMove, closeCombatMove]),
      createTestCombatant(2, 'charizard', ['fire', 'flying'], { hp: 100, attack: 84 }, [overheatMove]),
      createTestCombatant(3, 'dragonite', ['dragon', 'flying'], { hp: 100, attack: 134 }, [dracoMeteorMove])
    ];

    const teamEnemy = [
      createTestCombatant(4, 'garchomp', ['dragon', 'ground'], { hp: 100, attack: 130 }, [dragonTailMove, tackleMove]),
      createTestCombatant(5, 'gardevoir', ['psychic', 'fairy'], { hp: 100, attack: 65 }, [calmMindMove]),
      createTestCombatant(6, 'snorlax', ['normal'], { hp: 150, attack: 110 }, [tackleMove])
    ];

    const battle = BattleEngine.createTeamBattle(teamPlayer, teamEnemy);
    const pActive = battle.player.team[battle.player.activeIndex];

    // Aplica Swords Dance (+2 Atk)
    applyStatStageChange(pActive, 'attack', 2);
    assert.equal(pActive.statStages.attack, 2);

    // Troca voluntária para Charizard
    const turnRes = BattleEngine.resolveTurn(battle, {
      player: { type: BattleConstants.BATTLE_ACTIONS.SWITCH, targetIndex: 1 },
      enemy: { type: BattleConstants.BATTLE_ACTIONS.MOVE, moveId: tackleMove.id, accuracyRoll: 1 }
    });

    // O Lucario anterior no estado resultante deve ter seus estágios resetados para 0
    assert.equal(turnRes.state.player.team[0].statStages.attack, 0, 'Estágios devem ser resetados ao sair de campo');

    // Agora o Charizard ativo toma dano de Dragon Tail com troca forçada
    const battleTurn2 = turnRes.state;
    const charizard = battleTurn2.player.team[battleTurn2.player.activeIndex];
    applyStatStageChange(charizard, 'specialAttack', 2);

    // Enemy usa Dragon Tail (golpe de troca forçada)
    const turnRes2 = BattleEngine.resolveTurn(battleTurn2, {
      player: { moveId: overheatMove.id, accuracyRoll: 1 },
      enemy: { moveId: dragonTailMove.id, accuracyRoll: 1, forcedSwitchIndex: 2 }
    });

    // Charizard foi trocado forçadamente para Dragonite: Charizard deve ter estágios zerados
    assert.equal(turnRes2.state.player.team[1].statStages.specialAttack, 0, 'Troca forçada deve resetar estágios');
  });

  test('P3-06: Execução de Swords Dance: aumenta Attack em +2 e emite STAT_STAGE_CHANGED', () => {
    const pMon = createTestCombatant(1, 'scizor', ['bug', 'steel'], { hp: 100, attack: 100, defense: 100 }, [swordsDanceMove, tackleMove]);
    const eMon = createTestCombatant(2, 'snorlax', ['normal'], { hp: 200, defense: 100 }, [tackleMove]);

    const battle = BattleEngine.createBattle(pMon, eMon);

    const { state: state1, events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: swordsDanceMove.id, accuracyRoll: 1 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1 }
    });

    // Verifica que evento STAT_STAGE_CHANGED foi emitido
    const boostEvent = events.find(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.ok(boostEvent, 'STAT_STAGE_CHANGED deve ser emitido');
    assert.equal(boostEvent.combatant, 'player');
    assert.equal(boostEvent.statKey, 'attack');
    assert.equal(boostEvent.appliedDelta, 2);
    assert.equal(boostEvent.finalStage, 2);

    // O Attack do combatente ativo agora tem estágio +2 no novo estado
    assert.equal(state1.player.statStages.attack, 2);
    assert.equal(getEffectiveStat(state1.player, 'attack'), 200);

    // No turno seguinte, o dano do Tackle do jogador deve refletir o Attack dobrado
    const { events: events2 } = BattleEngine.resolveTurn(state1, {
      player: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const dmgEvent = events2.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.ok(dmgEvent);
    // Base damage normal com 100 atk vs 100 def e 40 power: 19. Com 200 atk (+2 stages): 37
    assert.equal(dmgEvent.damage, 37, `Dano calculado com +2 stages deve ser 37`);
  });

  test('P3-07: Execução de Calm Mind: aumenta Special Attack e Special Defense em +1 cada', () => {
    const pMon = createTestCombatant(1, 'gardevoir', ['psychic', 'fairy'], { hp: 100, specialAttack: 100, specialDefense: 100 }, [calmMindMove, tackleMove]);
    const eMon = createTestCombatant(2, 'snorlax', ['normal'], { hp: 200 }, [tackleMove]);

    const battle = BattleEngine.createBattle(pMon, eMon);

    const { state, events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: calmMindMove.id, accuracyRoll: 1 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1 }
    });

    const boostEvents = events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'player');
    assert.equal(boostEvents.length, 2, 'Deve emitir 2 eventos de estágio (SpAtk e SpDef)');
    assert.ok(boostEvents.some(e => e.statKey === 'specialAttack' && e.appliedDelta === 1 && e.finalStage === 1));
    assert.ok(boostEvents.some(e => e.statKey === 'specialDefense' && e.appliedDelta === 1 && e.finalStage === 1));

    assert.equal(state.player.statStages.specialAttack, 1);
    assert.equal(state.player.statStages.specialDefense, 1);
    assert.equal(getEffectiveStat(state.player, 'specialAttack'), 150);
    assert.equal(getEffectiveStat(state.player, 'specialDefense'), 150);
  });

  test('P3-08: Execução de Close Combat: causa dano físico e depois aplica queda de Defesa e Sp.Def (-1)', () => {
    const pMon = createTestCombatant(1, 'lucario', ['fighting', 'steel'], { hp: 120, attack: 110, defense: 70, specialDefense: 70 }, [closeCombatMove]);
    const eMon = createTestCombatant(2, 'snorlax', ['normal'], { hp: 250, defense: 65 }, [tackleMove]);

    const battle = BattleEngine.createBattle(pMon, eMon);

    const { state, events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: closeCombatMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    // 1. Dano foi aplicado
    const dmgEvent = events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.ok(dmgEvent);
    assert.ok(dmgEvent.damage > 0);

    // 2. Quedas foram aplicadas ao atacante após o dano
    const dropEvents = events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'player');
    assert.equal(dropEvents.length, 2);
    assert.ok(dropEvents.some(e => e.statKey === 'defense' && e.appliedDelta === -1 && e.finalStage === -1));
    assert.ok(dropEvents.some(e => e.statKey === 'specialDefense' && e.appliedDelta === -1 && e.finalStage === -1));

    assert.equal(state.player.statStages.defense, -1);
    assert.equal(state.player.statStages.specialDefense, -1);
  });

  test('P3-09: Auto-debuff em Overheat e Draco Meteor: não aplica em miss ou imunidade; aplica em KO', () => {
    // 1. Draco Meteor contra Fairy (Imunidade): dano 0 e sem queda de Sp.Atk
    const dragonMon = createTestCombatant(1, 'dragonite', ['dragon', 'flying'], { hp: 100, specialAttack: 100 }, [dracoMeteorMove]);
    const fairyMon = createTestCombatant(2, 'clefable', ['fairy'], { hp: 150 }, [tackleMove]);

    const battle1 = BattleEngine.createBattle(dragonMon, fairyMon);

    const { state: state1, events: events1 } = BattleEngine.resolveTurn(battle1, {
      player: { moveId: dracoMeteorMove.id, accuracyRoll: 1 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1 }
    });

    const dropEventsImmune = events1.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(dropEventsImmune.length, 0, 'Imunidade não deve disparar auto-debuff');
    assert.equal(state1.player.statStages.specialAttack, 0);

    // 2. Overheat com Miss (accuracyRoll = 95 > accuracy 90): sem dano e sem queda
    const fireMon = createTestCombatant(3, 'charizard', ['fire', 'flying'], { hp: 100, specialAttack: 100 }, [overheatMove]);
    const normalMon = createTestCombatant(4, 'snorlax', ['normal'], { hp: 200 }, [tackleMove]);

    const battle2 = BattleEngine.createBattle(fireMon, normalMon);

    const { state: state2, events: events2 } = BattleEngine.resolveTurn(battle2, {
      player: { moveId: overheatMove.id, accuracyRoll: 95 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1 }
    });

    const dropEventsMiss = events2.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(dropEventsMiss.length, 0, 'Erro de golpe não deve disparar auto-debuff');
    assert.equal(state2.player.statStages.specialAttack, 0);

    // 3. Overheat causa KO: o alvo é nocauteado, mas o usuário sofre -2 Sp.Atk
    const weakTarget = createTestCombatant(5, 'weakmon', ['grass'], { hp: 10, defense: 30, specialDefense: 30 }, [tackleMove]);
    const battle3 = BattleEngine.createBattle(fireMon, weakTarget);

    const { state: state3, events: events3 } = BattleEngine.resolveTurn(battle3, {
      player: { moveId: overheatMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1 }
    });

    const koEvent = events3.find(e => e.type === BATTLE_EVENTS.POKEMON_FAINTED && e.target === 'enemy');
    assert.ok(koEvent, 'Alvo deve desmaiar');
    const dropEventKO = events3.find(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'player');
    assert.ok(dropEventKO, 'Atacante consciente deve sofrer auto-debuff mesmo nocauteando o alvo');
    assert.equal(state3.player.statStages.specialAttack, -2);
  });

  test('P3-10: Interações canônicas: Body Press, Psystrike, Burn e Paralisia', () => {
    // 1. Body Press com estágio de Defesa (+2 Defesa)
    const bpMon = createTestCombatant(1, 'zamazenta', ['fighting'], { hp: 100, attack: 50, defense: 100 }, [bodyPressMove]);
    const defMon = createTestCombatant(2, 'regirock', ['rock'], { hp: 200, defense: 100 }, [tackleMove]);

    // Sem boost
    const evalNeutral = BattleEvaluator.evaluateMove(bpMon, defMon, bodyPressMove);
    assert.equal(evalNeutral.attackStat, 100, 'Body Press deve usar a Defesa do atacante como stat de ataque');

    // Com +2 Defesa
    bpMon.statStages.defense = 2;
    const evalBoosted = BattleEvaluator.evaluateMove(bpMon, defMon, bodyPressMove);
    assert.equal(evalBoosted.attackStat, 200, 'Body Press com +2 Def deve usar 200 como stat de ataque');
    assert.ok(evalBoosted.averageDamage > evalNeutral.averageDamage * 1.8);

    // 2. Psystrike com estágio de SpAtk e Defesa
    const mewtwo = createTestCombatant(3, 'mewtwo', ['psychic'], { hp: 100, specialAttack: 100 }, [psystrikeMove]);
    const blissey = createTestCombatant(4, 'blissey', ['normal'], { hp: 300, defense: 50, specialDefense: 135 }, [tackleMove]);

    mewtwo.statStages.specialAttack = 1;
    blissey.statStages.defense = 1;
    const evalPsystrike = BattleEvaluator.evaluateMove(mewtwo, blissey, psystrikeMove);
    assert.equal(evalPsystrike.attackStat, 150, 'Psystrike usa SpAtk efetivo do atacante');
    assert.equal(evalPsystrike.defenseStat, 75, 'Psystrike usa Defesa física efetiva do defensor (50 * 1.5 = 75)');

    // 3. Burn não penaliza duplamente: reduz 50% do dano final após estágio de Ataque
    const attacker = createTestCombatant(5, 'machamp', ['fighting'], { hp: 100, attack: 100 }, [tackleMove]);
    attacker.statusCondition = 'burn';
    attacker.statStages.attack = 2; // Atk efetivo 200
    const evalBurn = BattleEvaluator.evaluateMove(attacker, blissey, tackleMove);
    assert.equal(evalBurn.attackStat, 200, 'Attack stat efetivo não é reduzido pelo burn diretamente');
    assert.ok(evalBurn.averageDamage < 50, 'Dano final sofre corte único de 50% por burn');

    // 4. Paralisia reduz Speed pela metade após os estágios de Speed
    const fastMon = createTestCombatant(6, 'jolteon', ['electric'], { hp: 100, speed: 100 }, [tackleMove]);
    fastMon.statStages.speed = 1; // Speed efetivo com estágios: 150
    assert.equal(getEffectiveStat(fastMon, 'speed'), 150);

    fastMon.statusCondition = 'paralysis';
    const dummyOpponent = createTestCombatant(7, 'dummy', ['normal'], { hp: 100, speed: 80 }, [tackleMove]);
    const order = TurnManager.determineOrder(fastMon, dummyOpponent);
    assert.deepEqual(order, ['enemy', 'player'], 'Jolteon paralisado a 75 de speed efetivo deve perder a iniciativa para 80 speed');
  });

  test('P3-11: IA e Avaliador: evita boosts redundantes, respeita limites no estado real e pondera auto-debuffs', () => {
    // 1. Considerar Swords Dance quando seguro vs Não usar quando Attack já está em +6 no estado da batalha
    const p1 = createTestCombatant(1, 'lucario', ['fighting', 'steel'], { hp: 100, attack: 100 }, [swordsDanceMove, tackleMove]);
    const e1 = createTestCombatant(2, 'blissey', ['normal'], { hp: 500, attack: 10, defense: 100, specialDefense: 100 }, [tackleMove]);

    const battle1 = BattleEngine.createTeamBattle(
      [p1, createTestCombatant(10, 'sub1', ['normal'], { hp: 50 }, [tackleMove]), createTestCombatant(11, 'sub2', ['normal'], { hp: 50 }, [tackleMove])],
      [e1, createTestCombatant(12, 'sub3', ['normal'], { hp: 50 }, [tackleMove]), createTestCombatant(13, 'sub4', ['normal'], { hp: 50 }, [tackleMove])]
    );

    // No estado inicial neutro (stage 0), com alvo resistente e seguro, a IA deve escolher Swords Dance (+2 Atk)
    const aiDecNeutral = BattleAI.chooseAction(battle1, 'player', { strategy: 'SMART' });
    assert.equal(aiDecNeutral.action.moveId, swordsDanceMove.id, 'IA deve escolher Swords Dance quando há benefício real e segurança');

    // Modifica o combatente REAL pertencente ao estado de batalha (não o objeto isolado de entrada)
    const active1 = battle1.player.team[battle1.player.activeIndex];
    active1.statStages.attack = 6;
    const aiDecAtMax = BattleAI.chooseAction(battle1, 'player', { strategy: 'SMART' });
    assert.equal(aiDecAtMax.action.moveId, tackleMove.id, 'IA não deve usar Swords Dance quando Attack já está no limite +6 e deve atacar');

    // 2. Não usar Swords Dance quando o Pokémon só possui ataques especiais
    const pSpecial = createTestCombatant(3, 'alakazam', ['psychic'], { hp: 100, specialAttack: 135 }, [swordsDanceMove, psystrikeMove]);
    const battleSpecial = BattleEngine.createTeamBattle(
      [pSpecial, createTestCombatant(14, 'sub1', ['normal'], { hp: 50 }, [tackleMove]), createTestCombatant(15, 'sub2', ['normal'], { hp: 50 }, [tackleMove])],
      [e1, createTestCombatant(16, 'sub3', ['normal'], { hp: 50 }, [tackleMove]), createTestCombatant(17, 'sub4', ['normal'], { hp: 50 }, [tackleMove])]
    );
    const aiDecSpecial = BattleAI.chooseAction(battleSpecial, 'player', { strategy: 'SMART' });
    assert.equal(aiDecSpecial.action.moveId, psystrikeMove.id, 'IA não deve usar Swords Dance sem nenhum ataque físico utilizável');

    // 3. Calm Mind: usar quando há benefício vs não repetir quando ambos os atributos atingiram o limite
    const pGardevoir = createTestCombatant(4, 'gardevoir', ['psychic', 'fairy'], { hp: 100, specialAttack: 100, specialDefense: 100 }, [calmMindMove, psystrikeMove]);
    const battleCalmMind = BattleEngine.createTeamBattle(
      [pGardevoir, createTestCombatant(18, 'sub1', ['normal'], { hp: 50 }, [tackleMove]), createTestCombatant(19, 'sub2', ['normal'], { hp: 50 }, [tackleMove])],
      [e1, createTestCombatant(20, 'sub3', ['normal'], { hp: 50 }, [tackleMove]), createTestCombatant(21, 'sub4', ['normal'], { hp: 50 }, [tackleMove])]
    );
    const aiDecCM = BattleAI.chooseAction(battleCalmMind, 'player', { strategy: 'SMART' });
    assert.equal(aiDecCM.action.moveId, calmMindMove.id, 'IA deve usar Calm Mind em situação segura');

    const activeCM = battleCalmMind.player.team[battleCalmMind.player.activeIndex];
    activeCM.statStages.specialAttack = 6;
    activeCM.statStages.specialDefense = 6;
    const aiDecCMMax = BattleAI.chooseAction(battleCalmMind, 'player', { strategy: 'SMART' });
    assert.equal(aiDecCMMax.action.moveId, psystrikeMove.id, 'IA não deve repetir Calm Mind quando SpAtk e SpDef já atingiram o teto');

    // 4. Risco de nocaute (oppThreat >= currentHp): não gasta turno com boost e prioriza atacar
    const heavyHitter = createTestCombatant(5, 'machamp', ['fighting'], { hp: 500, attack: 150 }, [closeCombatMove]);
    const battleThreat = BattleEngine.createTeamBattle(
      [p1, createTestCombatant(22, 'sub1', ['normal'], { hp: 50 }, [tackleMove]), createTestCombatant(23, 'sub2', ['normal'], { hp: 50 }, [tackleMove])],
      [heavyHitter, createTestCombatant(24, 'sub3', ['normal'], { hp: 50 }, [tackleMove]), createTestCombatant(25, 'sub4', ['normal'], { hp: 50 }, [tackleMove])]
    );
    const activeThreat = battleThreat.player.team[battleThreat.player.activeIndex];
    activeThreat.currentHp = 40; // Machamp Close Combat causa > 40 dano -> ameaça letal
    const aiDecThreat = BattleAI.chooseAction(battleThreat, 'player', { strategy: 'SMART' });
    assert.equal(aiDecThreat.action.moveId, tackleMove.id, 'IA sob ameaça de nocaute deve atacar diretamente');

    // 5. HP crítico (< 25%): não tenta boost
    const battleLowHp = BattleEngine.createTeamBattle(
      [p1, createTestCombatant(26, 'sub1', ['normal'], { hp: 50 }, [tackleMove]), createTestCombatant(27, 'sub2', ['normal'], { hp: 50 }, [tackleMove])],
      [e1, createTestCombatant(28, 'sub3', ['normal'], { hp: 50 }, [tackleMove]), createTestCombatant(29, 'sub4', ['normal'], { hp: 50 }, [tackleMove])]
    );
    const activeLowHp = battleLowHp.player.team[battleLowHp.player.activeIndex];
    activeLowHp.currentHp = 15; // 15% HP
    const aiDecLowHp = BattleAI.chooseAction(battleLowHp, 'player', { strategy: 'SMART' });
    assert.equal(aiDecLowHp.action.moveId, tackleMove.id, 'IA com HP < 25% prioriza atacar');

    // 6. Auto-debuff: prioriza nocaute garantido (KO_BONUS) sobre o custo de auto-debuff
    const pFighter = createTestCombatant(6, 'lucario', ['fighting'], { hp: 100, attack: 110 }, [closeCombatMove, tackleMove]);
    const eWeak = createTestCombatant(7, 'weakling', ['normal'], { hp: 60, defense: 60 }, [tackleMove]);
    const battleKo = BattleEngine.createTeamBattle(
      [pFighter, createTestCombatant(30, 'sub1', ['normal'], { hp: 50 }, [tackleMove]), createTestCombatant(31, 'sub2', ['normal'], { hp: 50 }, [tackleMove])],
      [eWeak, createTestCombatant(32, 'sub3', ['normal'], { hp: 50 }, [tackleMove]), createTestCombatant(33, 'sub4', ['normal'], { hp: 50 }, [tackleMove])]
    );
    const aiDecKo = BattleAI.chooseAction(battleKo, 'player', { strategy: 'SMART' });
    assert.equal(aiDecKo.action.moveId, closeCombatMove.id, 'IA deve escolher Close Combat para garantir nocaute imediato');
  });

  test('P3-12: Apresentação: validação, mapeamento de eventos e adapter de UI', () => {
    // 1. PresentationMapper validação estrita de payload de STAT_STAGE_CHANGED
    assert.throws(() => {
      PresentationMapper.mapEvent({ type: BATTLE_EVENTS.STAT_STAGE_CHANGED });
    }, /INVALID_EVENT_PAYLOAD/);

    // 2. Mapeamento correto para PRESENTATION_COMMANDS.STAT_STAGE_FEEDBACK
    const validEvent = {
      type: BATTLE_EVENTS.STAT_STAGE_CHANGED,
      combatant: 'player',
      pokemonName: 'Lucario',
      statKey: 'attack',
      previousStage: 0,
      requestedDelta: 2,
      appliedDelta: 2,
      finalStage: 2,
      blockedReason: null
    };

    const commands = PresentationMapper.mapEvent(validEvent);
    assert.equal(commands.length, 1);
    assert.equal(commands[0].type, PRESENTATION_COMMANDS.STAT_STAGE_FEEDBACK);
    assert.equal(commands[0].side, 'player');
    assert.equal(commands[0].statKey, 'attack');
    assert.equal(commands[0].appliedDelta, 2);

    // 3. BattleUiDomAdapter trata o comando e emite mensagem sem quebrar
    let displayedMsg = null;
    let updatedStages = null;
    const mockView = {
      displayMessage: (msg) => { displayedMsg = msg; },
      updateStatStages: (side, stages) => { updatedStages = { side, stages }; }
    };

    const adapter = new BattleUiDomAdapter({ view: mockView });
    adapter.execute(commands[0], {
      battleState: {
        player: {
          team: [{ statStages: { attack: 2 } }],
          activeIndex: 0
        }
      }
    });

    assert.ok(displayedMsg.includes('Ataque subiu muito!'), `Mensagem esperada ("${displayedMsg}")`);
    assert.deepEqual(updatedStages, { side: 'player', stages: { attack: 2 } });
  });

  test('P3-13: Validação de dados (validateMoveData) para os 5 golpes piloto', () => {
    assert.equal(validateMoveData(swordsDanceMove), true, 'Swords Dance deve ser válido');
    assert.equal(validateMoveData(calmMindMove), true, 'Calm Mind deve ser válido');
    assert.equal(validateMoveData(closeCombatMove), true, 'Close Combat deve ser válido');
    assert.equal(validateMoveData(overheatMove), true, 'Overheat deve ser válido');
    assert.equal(validateMoveData(dracoMeteorMove), true, 'Draco Meteor deve ser válido');

    // Rejeição de status move com accuracy adulterada
    const badSwordsDance = { ...swordsDanceMove, accuracy: 100 };
    assert.equal(validateMoveData(badSwordsDance), false, 'Swords Dance com accuracy 100 deve ser rejeitado (exige null)');
  });
});
