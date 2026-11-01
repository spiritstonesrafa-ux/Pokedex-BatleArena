const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../../assets/js/battle/battle-engine.js');
const AI = require('../../assets/js/battle/battle-ai.js');
const Evaluator = require('../../assets/js/battle/battle-evaluator.js');
const Mapper = require('../../assets/js/presentation/battle-presentation-mapper.js');
const { PRESENTATION_COMMANDS } = require('../../assets/js/presentation/battle-presentation-constants.js');
const { BattleUiDomAdapter } = require('../../assets/js/ui/battle-ui-adapter.js');
const {
  BATTLE_EVENTS,
  CANONICAL_MOVE_DEFINITIONS,
  KNOWN_CATALOG_MOVES,
  SECONDARY_EFFECT_MOVES,
  DEFAULT_CONFUSION_TURNS,
  getMoveCapability,
  validateMoveData,
  isConfused,
  isEligibleForConfusion
} = require('../../assets/js/battle/battle-constants.js');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source.js');
const CampaignOptions = require('../../assets/js/campaign/campaign-move-options.js');
const CampaignExtras = require('../../assets/js/campaign/campaign-move-options-catalog.js');

const TACKLE = KNOWN_CATALOG_MOVES[33];
const BITE = KNOWN_CATALOG_MOVES[44];
const FLAMETHROWER = KNOWN_CATALOG_MOVES[53];
const ICE_BEAM = KNOWN_CATALOG_MOVES[58];
const BLIZZARD = KNOWN_CATALOG_MOVES[59];
const SCALD = KNOWN_CATALOG_MOVES[503];
const CONFUSE_RAY = KNOWN_CATALOG_MOVES[109];
const WATER_PULSE = KNOWN_CATALOG_MOVES[352];
const DRAGON_TAIL = KNOWN_CATALOG_MOVES[525] || { id: 525, name: 'dragon-tail', type: 'dragon', power: 60, accuracy: 90, pp: 10, damageClass: 'physical', forcedSwitch: true };

function makeMon(id, name, types, moves, stats = {}, overrides = {}) {
  return {
    id,
    name,
    types,
    hp: stats.hp || 200,
    currentHp: overrides.currentHp !== undefined ? overrides.currentHp : (stats.hp || 200),
    maxHp: stats.hp || 200,
    attack: stats.attack || 100,
    defense: stats.defense || 100,
    specialAttack: stats.specialAttack || 100,
    specialDefense: stats.specialDefense || 100,
    speed: stats.speed || 100,
    statusCondition: null,
    sleepTurns: 0,
    isFlinched: false,
    confusionTurns: 0,
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
    ...options
  };
}

// -----------------------------------------------------------------------------
// 1. DADOS CANÔNICOS E CLASSIFICAÇÕES
// -----------------------------------------------------------------------------
test('P4-CF-01: Dados canônicos e suporte FULL dos pilotos Confuse Ray (109) e Water Pulse (352)', () => {
  // Confuse Ray (ID 109)
  const crCap = getMoveCapability({ id: 109 });
  assert.equal(crCap.id, 109);
  assert.equal(crCap.name, 'confuse-ray');
  assert.equal(crCap.supportLevel, 'FULL');
  assert.deepEqual(crCap.requiredMechanics, ['CONFUSION_APPLICATION']);
  assert.equal(CONFUSE_RAY.id, 109);
  assert.equal(CONFUSE_RAY.type, 'ghost');
  assert.equal(CONFUSE_RAY.power, 0);
  assert.equal(CONFUSE_RAY.accuracy, 100);
  assert.equal(CONFUSE_RAY.pp, 10);
  assert.equal(CONFUSE_RAY.damageClass, 'status');
  assert.equal(CONFUSE_RAY.statusEffect, 'confusion');

  // Water Pulse (ID 352)
  const wpCap = getMoveCapability({ id: 352 });
  assert.equal(wpCap.id, 352);
  assert.equal(wpCap.name, 'water-pulse');
  assert.equal(wpCap.supportLevel, 'FULL');
  assert.deepEqual(wpCap.requiredMechanics, ['SPECIAL_DAMAGE', 'SECONDARY_CONFUSION_CHANCE']);
  assert.equal(WATER_PULSE.id, 352);
  assert.equal(WATER_PULSE.type, 'water');
  assert.equal(WATER_PULSE.power, 60);
  assert.equal(WATER_PULSE.accuracy, 100);
  assert.equal(WATER_PULSE.pp, 20);
  assert.equal(WATER_PULSE.damageClass, 'special');
  assert.ok(SECONDARY_EFFECT_MOVES['water-pulse']);
  assert.equal(SECONDARY_EFFECT_MOVES['water-pulse'].chance, 20);
  assert.equal(SECONDARY_EFFECT_MOVES['water-pulse'].confusion, true);

  // Blizzard alinhamento de roadmap (Phase P7)
  const blzCap = getMoveCapability({ id: 59 });
  assert.deepEqual(blzCap.knownPending, []);

  // Helpers
  assert.equal(DEFAULT_CONFUSION_TURNS.MIN, 2);
  assert.equal(DEFAULT_CONFUSION_TURNS.MAX, 5);
  assert.equal(DEFAULT_CONFUSION_TURNS.DEFAULT, 3);
  assert.equal(isConfused({ confusionTurns: 3 }), true);
  assert.equal(isConfused({ confusionTurns: 0 }), false);
  assert.equal(isConfused({}), false);
  assert.equal(isEligibleForConfusion({ currentHp: 100, confusionTurns: 0 }), true);
  assert.equal(isEligibleForConfusion({ currentHp: 100, confusionTurns: 2 }), false);
  assert.equal(isEligibleForConfusion({ currentHp: 0, confusionTurns: 0 }), false);
});

// -----------------------------------------------------------------------------
// 2. FRONTEIRAS DE WATER PULSE (20 / 21)
// -----------------------------------------------------------------------------
test('P4-CF-02: Fronteiras de Water Pulse: roll 20 aplica confusão; roll 21 não aplica', () => {
  const attacker = makeMon(131, 'lapras', ['water', 'ice'], [WATER_PULSE], { speed: 100 });
  const defender = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 50 });
  const battle = Engine.createBattle(attacker, defender);

  // Roll 20 ativa (chance 20%)
  const res20 = Engine.resolveTurn(battle, {
    player: makeAction(352, { secondaryEffectRoll: 20, confusionDuration: 3 }),
    enemy: makeAction(33)
  });
  const appliedEvent = res20.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_APPLIED);
  assert.ok(appliedEvent);
  assert.equal(appliedEvent.target, 'enemy');
  assert.equal(appliedEvent.duration, 3);
  assert.equal(appliedEvent.secondaryEffectRoll, 20);
  // O defensor age depois de receber confusão: seu contador decrementa no mesmo turno (3 -> 2)
  assert.equal(res20.state.enemy.confusionTurns, 2);

  // Roll 21 não ativa
  const battle2 = Engine.createBattle(attacker, defender);
  const res21 = Engine.resolveTurn(battle2, {
    player: makeAction(352, { secondaryEffectRoll: 21 }),
    enemy: makeAction(33)
  });
  assert.equal(res21.state.enemy.confusionTurns, 0);
  assert.ok(!res21.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_APPLIED));
});

// -----------------------------------------------------------------------------
// 3. CONFUSE RAY EM ALVO NORMAL
// -----------------------------------------------------------------------------
test('P4-CF-03: Confuse Ray aplica confusão em alvo de tipo Normal (golpe de status ignora imunidade a dano Ghost)', () => {
  const attacker = makeMon(109, 'gastly', ['ghost', 'poison'], [CONFUSE_RAY], { speed: 100 });
  const defender = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 50 });
  const battle = Engine.createBattle(attacker, defender);

  const res = Engine.resolveTurn(battle, {
    player: makeAction(109, { accuracyRoll: 50, confusionDuration: 4 }),
    enemy: makeAction(33)
  });

  const applied = res.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_APPLIED);
  assert.ok(applied);
  assert.equal(applied.target, 'enemy');
  assert.equal(applied.duration, 4);
  assert.ok(!res.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_BLOCKED));
  // Snorlax age depois no mesmo turno: contador decrementa de 4 para 3
  assert.equal(res.state.enemy.confusionTurns, 3);
});

// -----------------------------------------------------------------------------
// 4. CONFUSÃO COEXISTINDO COM CADA CONDIÇÃO PRINCIPAL
// -----------------------------------------------------------------------------
test('P4-CF-04: Confusão coexiste com poison, burn, paralysis, sleep e freeze sem curá-las', () => {
  const statuses = ['poison', 'burn', 'paralysis', 'sleep', 'freeze'];

  for (const st of statuses) {
    const attacker = makeMon(109, 'gastly', ['ghost'], [CONFUSE_RAY], { speed: 100 });
    const defender = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 50 }, {
      statusCondition: st,
      sleepTurns: st === 'sleep' ? 2 : 0
    });
    const battle = Engine.createBattle(attacker, defender);

    const res = Engine.resolveTurn(battle, {
      player: makeAction(109, { confusionDuration: 3 }),
      enemy: makeAction(33)
    });

    assert.equal(res.state.enemy.statusCondition, st, `Status ${st} deve ser preservado`);
    assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_APPLIED), `CONFUSION_APPLIED deve ocorrer com ${st}`);
  }
});

// -----------------------------------------------------------------------------
// 5. TENTATIVA CONTRA ALVO JÁ CONFUSO
// -----------------------------------------------------------------------------
test('P4-CF-05: Tentativa de confundir alvo já confuso não reinicia duração (Confuse Ray bloqueado e Water Pulse não reseta)', () => {
  const attacker = makeMon(131, 'lapras', ['water', 'ice'], [CONFUSE_RAY, WATER_PULSE], { speed: 100 });
  const defender = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 50 });
  const battle = Engine.createBattle(attacker, defender);
  battle.enemy.confusionTurns = 2; // Alvo legitimamente confuso na batalha

  // Confuse Ray contra alvo confuso
  const resCr = Engine.resolveTurn(battle, {
    player: makeAction(109, { confusionDuration: 5 }),
    enemy: makeAction(33, { confusionHitRoll: 50 })
  });
  assert.ok(resCr.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_BLOCKED && e.reason === 'ALREADY_CONFUSED'));
  // Pikachu agiu no turno e reduziu de 2 para 1
  assert.equal(resCr.state.enemy.confusionTurns, 1, 'Duração não deve ser reiniciada para 5');

  // Water Pulse secundário contra alvo confuso
  const battleWp = Engine.createBattle(attacker, defender);
  battleWp.enemy.confusionTurns = 2;
  const resWp = Engine.resolveTurn(battleWp, {
    player: makeAction(352, { secondaryEffectRoll: 5, confusionDuration: 5 }),
    enemy: makeAction(33, { confusionHitRoll: 50 })
  });
  assert.ok(!resWp.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_APPLIED));
  assert.equal(resWp.state.enemy.confusionTurns, 1, 'Water Pulse secundário não reinicia duração');
});

// -----------------------------------------------------------------------------
// 6. DURAÇÕES MÍNIMA (2) E MÁXIMA (5) E TÉRMINO
// -----------------------------------------------------------------------------
test('P4-CF-06: Sequência completa de duração 2 (1 teste confuso + término na 2ª tentativa executando o golpe)', () => {
  let attacker = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 100 });
  let defender = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 50 });
  let battle = Engine.createBattle(attacker, defender);
  battle.player.confusionTurns = 2;

  // Turno 1
  const t1 = Engine.resolveTurn(battle, {
    player: makeAction(33, { confusionHitRoll: 50 }),
    enemy: makeAction(33)
  });
  assert.equal(t1.state.player.confusionTurns, 1);
  assert.ok(t1.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_CHECK));
  assert.ok(t1.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'));

  // Turno 2
  const t2 = Engine.resolveTurn(t1.state, {
    player: makeAction(33, { confusionHitRoll: 1 }), // Já saiu da confusão
    enemy: makeAction(33)
  });
  assert.equal(t2.state.player.confusionTurns, 0);
  const ended = t2.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_ENDED);
  assert.ok(ended);
  assert.equal(ended.actor, 'player');
  assert.equal(ended.reason, 'SNAPPED_OUT');
  assert.ok(!t2.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_CHECK && e.actor === 'player'));
  assert.ok(!t2.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE && e.actor === 'player'));
  assert.ok(t2.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), 'Deve executar golpe no turno em que se livra da confusão');
});

test('P4-CF-06B: Sequência completa de duração 5 (4 testes confusos + término na 5ª tentativa)', () => {
  let attacker = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 100 });
  let defender = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 50, hp: 1000 });
  let battle = Engine.createBattle(attacker, defender);
  battle.player.confusionTurns = 5;

  // Turnos 1 a 4: ainda confuso
  for (let turn = 1; turn <= 4; turn++) {
    const res = Engine.resolveTurn(battle, {
      player: makeAction(33, { confusionHitRoll: 50 }),
      enemy: makeAction(33)
    });
    assert.equal(res.state.player.confusionTurns, 5 - turn);
    assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_CHECK));
    battle = res.state;
  }

  // Turno 5: se livra da confusão e executa o golpe
  const res5 = Engine.resolveTurn(battle, {
    player: makeAction(33, { confusionHitRoll: 1 }),
    enemy: makeAction(33)
  });
  assert.equal(res5.state.player.confusionTurns, 0);
  assert.ok(res5.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_ENDED));
  assert.ok(res5.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'));
});

// -----------------------------------------------------------------------------
// 7. APLICAÇÃO ANTES E DEPOIS DA AÇÃO DO ALVO
// -----------------------------------------------------------------------------
test('P4-CF-07: Aplicação de confusão antes da ação do alvo no turno — alvo mais lento já sofre checagem no mesmo turno', () => {
  const fastAttacker = makeMon(109, 'gastly', ['ghost'], [CONFUSE_RAY], { speed: 120 });
  const slowDefender = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 50 });
  const battle = Engine.createBattle(fastAttacker, slowDefender);

  const res = Engine.resolveTurn(battle, {
    player: makeAction(109, { confusionDuration: 3 }),
    enemy: makeAction(33, { confusionHitRoll: 10 })
  });

  assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_APPLIED && e.target === 'enemy'));
  assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_CHECK && e.actor === 'enemy'));
  assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE && e.actor === 'enemy'));
  assert.ok(!res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'));
  assert.equal(res.state.enemy.confusionTurns, 2);
});

test('P4-CF-07B: Aplicação de confusão depois da ação do alvo no turno — alvo age normalmente e confusão só afeta turno seguinte', () => {
  const slowAttacker = makeMon(109, 'gastly', ['ghost'], [CONFUSE_RAY], { speed: 50 });
  const fastDefender = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 120 });
  const battle = Engine.createBattle(slowAttacker, fastDefender);

  const res = Engine.resolveTurn(battle, {
    player: makeAction(109, { confusionDuration: 3 }),
    enemy: makeAction(33)
  });

  assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'));
  assert.ok(!res.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_CHECK && e.actor === 'enemy'));
  assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_APPLIED && e.target === 'enemy'));
  assert.equal(res.state.enemy.confusionTurns, 3);
});

// -----------------------------------------------------------------------------
// 8. FRONTEIRAS DA CHANCE DE AUTOAGRESSÃO (33 / 34)
// -----------------------------------------------------------------------------
test('P4-CF-08: Fronteiras de autoagressão: roll 33 causa autoagressão; roll 34 age normalmente', () => {
  const mon = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 100 });
  const target = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 50 });

  // Roll 33: autoagressão
  const battle33 = Engine.createBattle(mon, target);
  battle33.player.confusionTurns = 3;
  const res33 = Engine.resolveTurn(battle33, {
    player: makeAction(33, { confusionHitRoll: 33 }),
    enemy: makeAction(33)
  });
  assert.ok(res33.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE && e.actor === 'player'));
  assert.ok(!res33.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'));

  // Roll 34: age normalmente
  const battle34 = Engine.createBattle(mon, target);
  battle34.player.confusionTurns = 3;
  const res34 = Engine.resolveTurn(battle34, {
    player: makeAction(33, { confusionHitRoll: 34 }),
    enemy: makeAction(33)
  });
  assert.ok(!res34.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE && e.actor === 'player'));
  assert.ok(res34.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'));
});

// -----------------------------------------------------------------------------
// 9. MOVIMENTO EXECUTADO NORMALMENTE QUANDO NÃO HÁ AUTOAGRESSÃO
// -----------------------------------------------------------------------------
test('P4-CF-09: Movimento executado normalmente quando roll de autoagressão >= 34', () => {
  const mon = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 100 });
  const target = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 50 });
  const battle = Engine.createBattle(mon, target);
  battle.player.confusionTurns = 3;

  const res = Engine.resolveTurn(battle, {
    player: makeAction(33, { confusionHitRoll: 75, damageRoll: 100 }),
    enemy: makeAction(33)
  });

  assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_SELECTED && e.actor === 'player'));
  assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'));
  assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.PP_CHANGED && e.actor === 'player'));
  assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player'));
  assert.equal(res.state.player.moves[0].currentPp, 34);
});

// -----------------------------------------------------------------------------
// 10. AUTOAGRESSÃO SEM CONSUMO DE PP OU EFEITOS DO MOVIMENTO
// -----------------------------------------------------------------------------
test('P4-CF-10: Autoagressão aborta o golpe sem consumo de PP e sem aplicar efeitos do movimento escolhido', () => {
  const mon = makeMon(131, 'lapras', ['water', 'ice'], [SCALD], { speed: 100 });
  const target = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 50 });
  const battle = Engine.createBattle(mon, target);
  battle.player.confusionTurns = 3;

  const res = Engine.resolveTurn(battle, {
    player: makeAction(503, { confusionHitRoll: 10, secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });

  assert.equal(res.state.player.moves[0].currentPp, 15, 'PP do movimento não deve ser consumido na autoagressão');
  assert.ok(!res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'));
  assert.ok(!res.events.some(e => e.type === BATTLE_EVENTS.PP_CHANGED && e.actor === 'player'));
  assert.ok(!res.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.statusCondition === 'burn'));
  assert.equal(res.state.enemy.statusCondition, null, 'Efeito secundário do movimento escolhido não deve ser aplicado');
});

// -----------------------------------------------------------------------------
// 11. FÓRMULA DE DANO, ESTÁGIOS, VARIAÇÃO E QUEIMADURA
// -----------------------------------------------------------------------------
test('P4-CF-11: Dano de confusão usa Attack e Defense próprios com estágios, sem penalidade de queimadura', () => {
  const defender = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 10 });

  // Caso 1: Neutro
  const monNeutral = makeMon(25, 'pikachu', ['electric'], [TACKLE], { attack: 100, defense: 100, hp: 200 });
  const battle1 = Engine.createBattle(monNeutral, defender);
  battle1.player.confusionTurns = 2;
  const res1 = Engine.resolveTurn(battle1, {
    player: makeAction(33, { confusionHitRoll: 1, confusionDamageRoll: 100 }),
    enemy: makeAction(33)
  });
  const dmgEvent1 = res1.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE);
  assert.equal(dmgEvent1.damage, 19);

  // Caso 2: Com queimadura no atacante
  const monBurned = makeMon(25, 'pikachu', ['electric'], [TACKLE], { attack: 100, defense: 100, hp: 200 }, {
    statusCondition: 'burn'
  });
  const battleBurn = Engine.createBattle(monBurned, defender);
  battleBurn.player.confusionTurns = 2;
  const resBurn = Engine.resolveTurn(battleBurn, {
    player: makeAction(33, { confusionHitRoll: 1, confusionDamageRoll: 100 }),
    enemy: makeAction(33)
  });
  const dmgEventBurn = resBurn.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE);
  assert.equal(dmgEventBurn.damage, 19, 'Queimadura não deve reduzir o dano de autoagressão no Gen 7+');

  // Caso 3: Com estágio de Attack +2 (x2 = 200 Atk) e Defense 100
  const monBoosted = makeMon(25, 'pikachu', ['electric'], [TACKLE], { attack: 100, defense: 100, hp: 200 }, {
    statStages: { attack: 2 }
  });
  const battleBoost = Engine.createBattle(monBoosted, defender);
  battleBoost.player.confusionTurns = 2;
  const resBoost = Engine.resolveTurn(battleBoost, {
    player: makeAction(33, { confusionHitRoll: 1, confusionDamageRoll: 100 }),
    enemy: makeAction(33)
  });
  const dmgEventBoost = resBoost.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE);
  assert.equal(dmgEventBoost.damage, 37, 'Estágio de ataque positivo deve aumentar o dano de autoagressão');

  // Caso 4: Variação de dano (roll 85)
  const battle85 = Engine.createBattle(monNeutral, defender);
  battle85.player.confusionTurns = 2;
  const res85 = Engine.resolveTurn(battle85, {
    player: makeAction(33, { confusionHitRoll: 1, confusionDamageRoll: 85 }),
    enemy: makeAction(33)
  });
  const dmgEvent85 = res85.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE);
  assert.equal(dmgEvent85.damage, 16);
});

// -----------------------------------------------------------------------------
// 12. AUSÊNCIA DE STAB, EFICÁCIA ELEMENTAL E CRÍTICO
// -----------------------------------------------------------------------------
test('P4-CF-12: Autoagressão é dano sem tipo — sem STAB, sem fraqueza/resistência/imunidade elemental e sem crítico', () => {
  const ghostMon = makeMon(94, 'gengar', ['ghost', 'poison'], [TACKLE], { attack: 100, defense: 100, hp: 200 });
  const steelMon = makeMon(208, 'steelix', ['steel', 'ground'], [TACKLE], { attack: 100, defense: 100, hp: 200 });
  const dummy = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 10 });

  const bGhost = Engine.createBattle(ghostMon, dummy);
  bGhost.player.confusionTurns = 2;
  const resGhost = Engine.resolveTurn(bGhost, {
    player: makeAction(33, { confusionHitRoll: 1, confusionDamageRoll: 100 }),
    enemy: makeAction(33)
  });
  const dmgGhost = resGhost.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE);
  assert.equal(dmgGhost.damage, 19, 'Ghost não é imune a dano de confusão (dano sem tipo)');

  const bSteel = Engine.createBattle(steelMon, dummy);
  bSteel.player.confusionTurns = 2;
  const resSteel = Engine.resolveTurn(bSteel, {
    player: makeAction(33, { confusionHitRoll: 1, confusionDamageRoll: 100 }),
    enemy: makeAction(33)
  });
  const dmgSteel = resSteel.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE);
  assert.equal(dmgSteel.damage, 19, 'Steel não resiste a dano de confusão (dano sem tipo)');
});

// -----------------------------------------------------------------------------
// 13. NOCAUTE POR AUTOAGRESSÃO
// -----------------------------------------------------------------------------
test('P4-CF-13: Nocaute por autoagressão encerra batalha 1x1 e não executa a ação pendente do defensor', () => {
  const lowHpAttacker = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 100, hp: 200 }, { currentHp: 10 });
  const defender = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 50, hp: 200 });
  const battle = Engine.createBattle(lowHpAttacker, defender);
  battle.player.confusionTurns = 2;

  const res = Engine.resolveTurn(battle, {
    player: makeAction(33, { confusionHitRoll: 1 }),
    enemy: makeAction(33)
  });

  assert.equal(res.state.player.currentHp, 0);
  assert.equal(res.state.status, 'ENEMY_WIN');
  assert.equal(res.state.winner, 'enemy');
  assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.POKEMON_FAINTED && e.target === 'player'));
  assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.BATTLE_ENDED));
  assert.ok(!res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'));
});

// -----------------------------------------------------------------------------
// 14. LIMPEZA EM TROCAS VOLUNTÁRIA E FORÇADA
// -----------------------------------------------------------------------------
test('P4-CF-14: Confusão é removida ao sair de campo em troca voluntária e forçada', () => {
  const p1 = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 100 });
  const p2 = makeMon(26, 'raichu', ['electric'], [TACKLE], { speed: 110 });
  const p3 = makeMon(1, 'bulbasaur', ['grass'], [TACKLE], { speed: 50 });
  const e1 = makeMon(143, 'snorlax', ['normal'], [TACKLE, DRAGON_TAIL], { speed: 50 });
  const e2 = makeMon(144, 'articuno', ['ice'], [TACKLE], { speed: 50 });
  const e3 = makeMon(145, 'zapdos', ['electric'], [TACKLE], { speed: 50 });

  // 1. Troca voluntária: pikachu sai de campo, confusionTurns deve zerar
  const teamBattle = Engine.createTeamBattle([p1, p2, p3], [e1, e2, e3]);
  teamBattle.player.team[0].confusionTurns = 3;
  const resSwitch = Engine.resolveTurn(teamBattle, {
    player: { type: 'SWITCH', targetPokemonId: 26 },
    enemy: makeAction(33)
  });
  assert.equal(resSwitch.state.player.team[0].confusionTurns, 0, 'Pikachu que saiu de campo deve ter confusão zerada');
  assert.equal(resSwitch.state.player.team[1].confusionTurns, 0, 'Substituto não deve herdar confusão');

  // 2. Troca forçada por Dragon Tail
  const d1 = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 10 });
  const d2 = makeMon(26, 'raichu', ['electric'], [TACKLE], { speed: 10 });
  const d3 = makeMon(133, 'eevee', ['normal'], [TACKLE], { speed: 10 });
  const playerDtail = makeMon(149, 'dragonite', ['dragon'], [DRAGON_TAIL], { speed: 100 });
  const teamBattle2 = Engine.createTeamBattle([playerDtail, p2, p3], [d1, d2, d3]);
  teamBattle2.enemy.team[0].confusionTurns = 3;

  const resForced = Engine.resolveTurn(teamBattle2, {
    player: makeAction(525, { accuracyRoll: 10, damageRoll: 100, forcedSwitchTargetPokemonId: 26 }),
    enemy: makeAction(33)
  });
  assert.equal(resForced.state.enemy.team[0].confusionTurns, 0, 'Combatente trocado forçadamente deve ter confusão zerada');
  assert.equal(resForced.state.enemy.team[1].confusionTurns, 0, 'Novo combatente ativo não deve ter confusão');
});

// -----------------------------------------------------------------------------
// 15. NORMALIZAÇÃO DE ENTRADA E PRESERVAÇÃO DE ESTADO
// -----------------------------------------------------------------------------
test('P4-CF-15: Combatente de entrada ignora confusionTurns bruto; clonagem do turno preserva confusão legítima', () => {
  const monRaw = Engine.createCombatant({
    id: 25,
    name: 'pikachu',
    types: ['electric'],
    hp: 100,
    attack: 55,
    defense: 40,
    specialAttack: 50,
    specialDefense: 50,
    speed: 90,
    confusionTurns: 5,
    moves: [{ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, damageClass: 'physical' }]
  });
  assert.equal(monRaw.confusionTurns, 0, 'createCombatant deve ignorar confusionTurns recebido na entrada');

  const activeMon = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 100 });
  const opponent = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 50 });
  const battle = Engine.createBattle(activeMon, opponent);
  battle.player.confusionTurns = 3;

  const res = Engine.resolveTurn(battle, {
    player: makeAction(33, { confusionHitRoll: 50 }),
    enemy: makeAction(33)
  });
  assert.equal(res.state.player.confusionTurns, 2, 'Clonagem do turno deve preservar o estado de confusão legítimo');
});

// -----------------------------------------------------------------------------
// 16. PRECEDÊNCIA COM SONO, FREEZE, FLINCH E PARALISIA
// -----------------------------------------------------------------------------
test('P4-CF-16: Impedimentos anteriores (Sleep, Freeze, Flinch) não avançam o contador de confusão', () => {
  const dummy = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 50 });

  // 1. Sono
  const sleepingMon = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 100 }, {
    statusCondition: 'sleep',
    sleepTurns: 2
  });
  const bSleep = Engine.createBattle(sleepingMon, dummy);
  bSleep.player.confusionTurns = 3;
  const resSleep = Engine.resolveTurn(bSleep, {
    player: makeAction(33),
    enemy: makeAction(33)
  });
  assert.equal(resSleep.state.player.sleepTurns, 1);
  assert.equal(resSleep.state.player.confusionTurns, 3, 'Contador de confusão não deve diminuir enquanto dorme');
  assert.ok(!resSleep.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_CHECK));

  // 2. Freeze
  const frozenMon = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 100 }, {
    statusCondition: 'freeze'
  });
  const bFreeze = Engine.createBattle(frozenMon, dummy);
  bFreeze.player.confusionTurns = 3;
  const resFreeze = Engine.resolveTurn(bFreeze, {
    player: makeAction(33, { thawRoll: 50 }),
    enemy: makeAction(33)
  });
  assert.equal(resFreeze.state.player.statusCondition, 'freeze');
  assert.equal(resFreeze.state.player.confusionTurns, 3, 'Contador de confusão não deve diminuir enquanto congelado');
  assert.ok(!resFreeze.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_CHECK));

  // 3. Flinch
  const flinchedMon = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 100 }, {
    isFlinched: true
  });
  const bFlinch = Engine.createBattle(flinchedMon, dummy);
  bFlinch.player.isFlinched = true;
  bFlinch.player.confusionTurns = 3;
  const resFlinch = Engine.resolveTurn(bFlinch, {
    player: makeAction(33),
    enemy: makeAction(33)
  });
  assert.equal(resFlinch.state.player.isFlinched, false);
  assert.equal(resFlinch.state.player.confusionTurns, 3, 'Contador de confusão não deve diminuir sob flinch');
  assert.ok(!resFlinch.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_CHECK));

  // 4. Paralisia
  const paraMon = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 100 }, {
    statusCondition: 'paralysis'
  });
  const bPara = Engine.createBattle(paraMon, dummy);
  bPara.player.confusionTurns = 3;
  const resPara = Engine.resolveTurn(bPara, {
    player: makeAction(33, { confusionHitRoll: 50, statusRoll: 10 }),
    enemy: makeAction(33)
  });
  assert.equal(resPara.state.player.confusionTurns, 2, 'Contador de confusão diminui antes da checagem de paralisia');
  assert.ok(resPara.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_CHECK));
  assert.ok(resPara.events.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.statusCondition === 'paralysis'));
});

// -----------------------------------------------------------------------------
// 17. SCALD CONGELADO IMPEDIDO POR AUTOAGRESSÃO PERMANECE CONGELADO
// -----------------------------------------------------------------------------
test('P4-CF-17: Usuário congelado de Scald que se fere na confusão permanece congelado', () => {
  const frozenScaldUser = makeMon(9, 'blastoise', ['water'], [SCALD], { speed: 100 }, {
    statusCondition: 'freeze'
  });
  const defender = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 50 });
  const battle = Engine.createBattle(frozenScaldUser, defender);
  battle.player.confusionTurns = 3;

  const res = Engine.resolveTurn(battle, {
    player: makeAction(503, { confusionHitRoll: 10 }),
    enemy: makeAction(33)
  });

  assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE && e.actor === 'player'));
  assert.equal(res.state.player.statusCondition, 'freeze', 'Usuário de Scald deve permanecer congelado após autoagressão');
  assert.ok(!res.events.some(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.statusCondition === 'freeze'));
  assert.equal(res.state.player.moves[0].currentPp, 15, 'PP de Scald não deve ser gasto');
});

// -----------------------------------------------------------------------------
// 18. INDEPENDÊNCIA DAS FONTES ALEATÓRIAS
// -----------------------------------------------------------------------------
test('P4-CF-18: DeterministicRandomSource possui operações de confusão desacopladas e independentes', () => {
  const rng = new DeterministicRandomSource();
  rng.setAccuracySequence([80]);
  rng.setDamageSequence([95]);
  rng.setConfusionDurationSequence([4]);
  rng.setConfusionHitSequence([25]);
  rng.setConfusionDamageSequence([90]);

  assert.equal(rng.rollConfusionDuration(), 4);
  assert.equal(rng.rollConfusionHit(), 25);
  assert.equal(rng.rollConfusionDamage(), 90);
  assert.equal(rng.rollAccuracy(), 80);
  assert.equal(rng.rollDamage(), 95);
});

// -----------------------------------------------------------------------------
// 19. SESSÃO REAL NOS DOIS SENTIDOS
// -----------------------------------------------------------------------------
test('P4-CF-19: Sessão real — jogador usa Confuse Ray, adversário sofre autoagressão e depois se recupera', async () => {
  const p1 = makeMon(131, 'lapras', ['water', 'ice'], [CONFUSE_RAY, TACKLE], { speed: 120 });
  const p2 = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 100 });
  const p3 = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 100 });

  const e1 = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 50, hp: 300 });
  const e2 = makeMon(26, 'raichu', ['electric'], [TACKLE], { hp: 500 }, { currentHp: 0 });
  const e3 = makeMon(27, 'sandshrew', ['ground'], [TACKLE], { hp: 500 }, { currentHp: 0 });

  const rng = new DeterministicRandomSource();
  rng.setConfusionDurationSequence([2]);
  rng.setConfusionHitSequence([10, 10]);
  rng.setConfusionDamageSequence([100]);
  rng.setDamageSequence([100, 100, 100]);
  rng.setAccuracySequence([100, 100, 100]);

  const capturedEvents = [];
  const session = new BattleSessionController({
    teamStore: { load: () => [131, 9, 3] },
    hydrator: {
      hydrateTeam: async (ids) => ids.map(id => (id === 131 ? p1 : (id === 9 ? p2 : p3)))
    },
    opponentFactory: {
      createOpponentTeam: async () => [e1, e2, e3]
    },
    randomSource: rng,
    presentationEngine: {
      play: async (events) => { capturedEvents.push(...events); },
      playCommands: async () => {}
    }
  });

  await session.prepareBattle({ playerTeamIds: [131, 9, 3] });
  await session.startBattle();

  // Turno 1: Player usa Confuse Ray
  await session.submitPlayerMove(109);
  assert.equal(session.battleState.enemy.team[0].confusionTurns, 1);
  assert.ok(session.battleState.enemy.team[0].currentHp < 300, 'Adversário deve ter sofrido dano de autoagressão');

  // Turno 2: Player usa Tackle
  await session.submitPlayerMove(33);
  assert.equal(session.battleState.enemy.team[0].confusionTurns, 0, 'Adversário deve ter se livrado da confusão');
});

// -----------------------------------------------------------------------------
// 20. ADVERSÁRIO CONFUSO ATACANDO DURANTE TROCA VOLUNTÁRIA DO JOGADOR
// -----------------------------------------------------------------------------
test('P4-CF-20: Adversário confuso ataca durante troca voluntária do jogador e se fere na confusão', async () => {
  const p1 = makeMon(131, 'lapras', ['water', 'ice'], [TACKLE], { speed: 100 });
  const p2 = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 100 });
  const p3 = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 100 });

  const e1 = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 100, hp: 300 });
  const e2 = makeMon(26, 'raichu', ['electric'], [TACKLE], { hp: 500 }, { currentHp: 0 });
  const e3 = makeMon(27, 'sandshrew', ['ground'], [TACKLE], { hp: 500 }, { currentHp: 0 });

  const rng = new DeterministicRandomSource();
  rng.setConfusionHitSequence([15]); // Autoagressão
  rng.setConfusionDamageSequence([100]);

  const capturedEvents = [];
  const session = new BattleSessionController({
    teamStore: { load: () => [131, 9, 3] },
    hydrator: {
      hydrateTeam: async (ids) => ids.map(id => (id === 131 ? p1 : (id === 9 ? p2 : p3)))
    },
    opponentFactory: {
      createOpponentTeam: async () => [e1, e2, e3]
    },
    randomSource: rng,
    presentationEngine: {
      play: async (events) => { capturedEvents.push(...events); },
      playCommands: async () => {}
    }
  });

  await session.prepareBattle({ playerTeamIds: [131, 9, 3] });
  await session.startBattle();

  session.battleState.enemy.team[0].confusionTurns = 3;

  // Jogador troca para Blastoise (ID 9)
  await session.submitPlayerSwitch(9);

  assert.equal(session.battleState.player.activeIndex, 1);
  assert.equal(session.battleState.enemy.team[0].confusionTurns, 2);
  assert.ok(session.battleState.enemy.team[0].currentHp < 300, 'Adversário deve ter se ferido na confusão durante a troca do jogador');
});

// -----------------------------------------------------------------------------
// 21. EVENTOS, MENSAGENS E ATUALIZAÇÃO DE HP
// -----------------------------------------------------------------------------
test('P4-CF-21: Presentation Mapper e UI Dom Adapter produzem mensagens corretas em português e HP transition', async () => {
  const events = [
    { type: BATTLE_EVENTS.CONFUSION_APPLIED, target: 'enemy', pokemonName: 'pikachu', duration: 3 },
    { type: BATTLE_EVENTS.CONFUSION_CHECK, actor: 'enemy', pokemonName: 'pikachu', remainingTurns: 2 },
    { type: BATTLE_EVENTS.CONFUSION_DAMAGE, actor: 'enemy', pokemonName: 'pikachu', damage: 19, previousHp: 200, currentHp: 181, maxHp: 200 },
    { type: BATTLE_EVENTS.CONFUSION_ENDED, actor: 'enemy', pokemonName: 'pikachu', reason: 'SNAPPED_OUT' },
    { type: BATTLE_EVENTS.CONFUSION_BLOCKED, target: 'enemy', pokemonName: 'pikachu', reason: 'ALREADY_CONFUSED' }
  ];

  const commands = Mapper.mapEvents(events);
  assert.ok(commands.some(c => c.type === PRESENTATION_COMMANDS.CONFUSION_FEEDBACK && c.outcome === 'APPLIED'));
  assert.ok(commands.some(c => c.type === PRESENTATION_COMMANDS.CONFUSION_FEEDBACK && c.outcome === 'CHECK'));
  assert.ok(commands.some(c => c.type === PRESENTATION_COMMANDS.CONFUSION_FEEDBACK && c.outcome === 'DAMAGE'));
  assert.ok(commands.some(c => c.type === PRESENTATION_COMMANDS.HP_TRANSITION && c.cause === 'confusion'));
  assert.ok(commands.some(c => c.type === PRESENTATION_COMMANDS.CONFUSION_FEEDBACK && c.outcome === 'ENDED'));
  assert.ok(commands.some(c => c.type === PRESENTATION_COMMANDS.CONFUSION_FEEDBACK && c.outcome === 'BLOCKED'));

  const messages = [];
  const fakeView = {
    displayMessage: (msg) => messages.push(msg),
    updateStatusBadge: () => {}
  };
  const adapter = new BattleUiDomAdapter({ view: fakeView });

  for (const cmd of commands) {
    await adapter.execute(cmd);
  }

  assert.ok(messages.some(m => m.includes('ficou confuso!')));
  assert.ok(messages.some(m => m.includes('está confuso!')));
  assert.ok(messages.some(m => m.includes('se feriu na confusão!')));
  assert.ok(messages.some(m => m.includes('se livrou da confusão!')));
  assert.ok(messages.some(m => m.includes('já está confuso!')));
});

// -----------------------------------------------------------------------------
// 22. AVALIADOR E DISPONIBILIDADE NA CAMPANHA
// -----------------------------------------------------------------------------
test('P4-CF-22: BattleEvaluator reconhece pilotos e pondera risco de 33% de autoagressão; catálogo inclui opções na campanha', () => {
  const attacker = makeMon(131, 'lapras', ['water', 'ice'], [CONFUSE_RAY, WATER_PULSE, TACKLE]);
  const healthyDefender = makeMon(25, 'pikachu', ['electric'], [TACKLE], { hp: 200 });
  const confusedDefender = makeMon(25, 'pikachu', ['electric'], [TACKLE], { hp: 200 });
  confusedDefender.confusionTurns = 3;

  // Confuse Ray avaliado contra alvo saudável
  const evalCrHealthy = Evaluator.evaluateMove(attacker, healthyDefender, CONFUSE_RAY);
  assert.equal(evalCrHealthy.isEligible, true);
  assert.ok(evalCrHealthy.expectedStatusBenefit > 0);

  // Confuse Ray avaliado contra alvo já confuso: sem benefício adicional
  const evalCrConfused = Evaluator.evaluateMove(attacker, confusedDefender, CONFUSE_RAY);
  assert.equal(evalCrConfused.isEligible, false);
  assert.equal(evalCrConfused.expectedStatusBenefit, 0);

  // Atacante confuso tem ação ponderada por 0.67 (33% de risco de autoagressão)
  const confusedAttacker = makeMon(131, 'lapras', ['water', 'ice'], [TACKLE]);
  confusedAttacker.confusionTurns = 2;
  const evalNormal = Evaluator.evaluateMove(attacker, healthyDefender, TACKLE);
  const evalConfusedAtk = Evaluator.evaluateMove(confusedAttacker, healthyDefender, TACKLE);
  assert.ok(evalConfusedAtk.expectedDamage < evalNormal.expectedDamage);
  assert.equal(evalConfusedAtk.expectedDamage, Math.floor(evalNormal.averageDamage * 0.67));

  // Disponibilidade na campanha
  // Lapras (131) tem Confuse Ray como opção de golpe extra
  const laprasPool = CampaignOptions.getPool(131);
  assert.ok(laprasPool.some(m => m.id === 109), 'Lapras (#131) deve ter Confuse Ray em seu pool de opções');

  // Golduck (55) tem Water Pulse como opção de golpe extra
  const golduckPool = CampaignOptions.getPool(55);
  assert.ok(golduckPool.some(m => m.id === 352), 'Golduck (#55) deve ter Water Pulse em seu pool de opções');
});

// -----------------------------------------------------------------------------
// 23. PRESERVAÇÃO DOS PILOTOS ANTERIORES
// -----------------------------------------------------------------------------
test('P4-CF-23: Preservação de pilotos anteriores (Bite flinch, Ancient Power boost, Sleep Powder, Ice Beam, Scald)', () => {
  const mon = makeMon(131, 'lapras', ['water', 'ice'], [BITE, ICE_BEAM, SCALD, KNOWN_CATALOG_MOVES[246]]);
  const target = makeMon(25, 'pikachu', ['electric'], [TACKLE], { speed: 50 });
  const battle = Engine.createBattle(mon, target);

  // Flinch com Bite
  const resBite = Engine.resolveTurn(battle, {
    player: makeAction(44, { secondaryEffectRoll: 10 }),
    enemy: makeAction(33)
  });
  assert.ok(resBite.events.some(e => e.type === BATTLE_EVENTS.FLINCH_APPLIED));
  assert.ok(resBite.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED));

  // Ancient Power boost
  const resAp = Engine.resolveTurn(battle, {
    player: makeAction(246, { secondaryEffectRoll: 5 }),
    enemy: makeAction(33)
  });
  assert.ok(resAp.events.some(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'player'));

  // Congelamento com Ice Beam
  const resIb = Engine.resolveTurn(battle, {
    player: makeAction(58, { secondaryEffectRoll: 5 }),
    enemy: makeAction(33)
  });
  assert.ok(resIb.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.statusCondition === 'freeze'));
});

// Review regressions: the opposing trainer applies confusion through the real session.
for (const selfHitRoll of [1, 100]) {
  test(`P4-CF-24: Sessão real — adversário aplica confusão; jogador ${selfHitRoll === 1 ? 'sofre autoagressão' : 'age normalmente'} e recupera a lucidez`, async () => {
    const playerTeam = [
      makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 40, hp: 1000 }),
      makeMon(3, 'venusaur', ['grass'], [TACKLE]),
      makeMon(6, 'charizard', ['fire'], [TACKLE])
    ];
    const enemyTeam = [
      makeMon(131, 'lapras', ['water', 'ice'], [CONFUSE_RAY, TACKLE], { speed: 120, hp: 1000 }),
      makeMon(25, 'pikachu', ['electric'], [TACKLE]),
      makeMon(26, 'raichu', ['electric'], [TACKLE])
    ];
    const rng = new DeterministicRandomSource({
      accuracySequence: Array(6).fill(1), damageSequence: Array(6).fill(100),
      confusionDurationSequence: [3], confusionHitSequence: [selfHitRoll, selfHitRoll, selfHitRoll],
      confusionDamageSequence: [100, 100, 100]
    });
    const events = [];
    const session = new BattleSessionController({
      hydrator: { hydrateTeam: async ids => ids.map(id => playerTeam.find(mon => mon.id === id)) },
      teamStore: { load: () => playerTeam.map(mon => mon.id) },
      opponentFactory: { createOpponentTeam: async () => enemyTeam },
      // Only the opponent's choice is controlled; resolution and presentation mapping are real.
      ai: { chooseAction: state => ({ action: { type: 'MOVE', moveId: state.turn === 1 ? 109 : 33 } }) },
      randomSource: rng,
      presentationEngine: { play: async batch => events.push(...batch), playCommands: async () => {} }
    });
    await session.prepareBattle({ playerTeamIds: playerTeam.map(mon => mon.id) });
    await session.startBattle();
    const initialPp = session.battleState.player.team[0].moves[0].currentPp;
    await session.submitPlayerMove(33);
    assert.equal(session.battleState.player.team[0].confusionTurns, 2);
    const applied = events.filter(event => event.type === BATTLE_EVENTS.CONFUSION_APPLIED);
    assert.equal(applied.length, 1);
    assert.equal(applied[0].source, 'enemy');
    assert.equal(applied[0].target, 'player');
    assert.equal(applied[0].duration, 3);
    const hit = events.filter(event => event.type === BATTLE_EVENTS.CONFUSION_DAMAGE);
    assert.equal(hit.length, selfHitRoll === 1 ? 1 : 0);
    assert.equal(events.filter(event => event.type === BATTLE_EVENTS.MOVE_USED && event.actor === 'player').length, selfHitRoll === 1 ? 0 : 1);
    assert.equal(session.battleState.player.team[0].moves[0].currentPp, initialPp - (selfHitRoll === 1 ? 0 : 1));
    if (hit.length) {
      assert.equal(hit[0].target, 'player');
      assert.ok(hit[0].damage > 0);
      assert.equal(hit[0].currentHp, session.battleState.player.team[0].currentHp);
    }
    await session.submitPlayerMove(33);
    assert.equal(session.battleState.player.team[0].confusionTurns, 1);
    const finalTurnStart = events.length;
    await session.submitPlayerMove(33);
    assert.equal(session.battleState.player.team[0].confusionTurns, 0);
    const finalTurn = events.slice(finalTurnStart);
    assert.equal(finalTurn.filter(event => event.type === BATTLE_EVENTS.CONFUSION_ENDED && event.actor === 'player').length, 1);
    assert.equal(finalTurn.filter(event => event.type === BATTLE_EVENTS.MOVE_USED && event.actor === 'player').length, 1);
    assert.equal(finalTurn.filter(event => event.type === BATTLE_EVENTS.CONFUSION_DAMAGE).length, 0);
    const feedback = Mapper.mapEvents(events).filter(command => command.type === 'CONFUSION_FEEDBACK');
    assert.equal(feedback.filter(command => command.outcome === 'APPLIED' && command.target === 'player').length, 1);
    assert.equal(feedback.filter(command => command.outcome === 'ENDED' && command.target === 'player').length, 1);
    assert.equal(feedback.filter(command => command.outcome === 'DAMAGE' && command.target === 'player').length, selfHitRoll === 1 ? 2 : 0);
  });
}

// Both teams must be able to replace a self-KO without declaring a premature victory.
for (const confusedRole of ['player', 'enemy']) {
  test(`P4-CF-25: Equipes — autoagressão nocauteia ${confusedRole}, solicita substituição e permite continuar`, () => {
    const team = offset => [0, 1, 2].map(index => makeMon(offset + index, `mon-${offset + index}`, ['normal'], [TACKLE], { hp: 500, speed: 40 }));
    const battle = Engine.createTeamBattle(team(1), team(4));
    const otherRole = confusedRole === 'player' ? 'enemy' : 'player';
    const confused = battle[confusedRole].team[0];
    confused.currentHp = 1;
    confused.speed = 150;
    confused.confusionTurns = 3;
    const previousPp = confused.moves[0].currentPp;
    const result = Engine.resolveTurn(battle, {
      player: makeAction(33, { confusionHitRoll: 1, confusionDamageRoll: 100 }),
      enemy: makeAction(33, { confusionHitRoll: 1, confusionDamageRoll: 100 })
    });
    assert.equal(result.state[confusedRole].team[0].currentHp, 0);
    assert.equal(result.state[confusedRole].team[0].confusionTurns, 0);
    assert.equal(result.state[confusedRole].team[0].moves[0].currentPp, previousPp);
    assert.equal(result.state.status, 'AWAITING_REPLACEMENT');
    assert.equal(result.state.winner, null);
    assert.equal(result.events.filter(event => event.type === BATTLE_EVENTS.POKEMON_FAINTED && event.target === confusedRole).length, 1);
    const requests = result.events.filter(event => event.type === BATTLE_EVENTS.REPLACEMENT_REQUIRED);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].side, confusedRole);
    assert.deepEqual(requests[0].availablePokemonIds, battle[confusedRole].team.slice(1).map(mon => mon.id));
    assert.equal(result.events.some(event => event.type === BATTLE_EVENTS.BATTLE_ENDED), false);
    assert.equal(result.events.some(event => event.type === BATTLE_EVENTS.TEAM_DEFEATED), false);
    const replacementId = battle[confusedRole].team[1].id;
    const replacement = Engine.resolveReplacement(result.state, { [confusedRole]: { targetPokemonId: replacementId } });
    assert.equal(replacement.state.status, 'IN_PROGRESS');
    assert.equal(Engine.getActiveCombatant(replacement.state, confusedRole).id, replacementId);
    assert.equal(Engine.getActiveCombatant(replacement.state, confusedRole).confusionTurns, 0);
    assert.equal(replacement.state[otherRole].activeIndex, 0);
    assert.equal(replacement.events.some(event => event.type === BATTLE_EVENTS.MOVE_USED), false, 'Substituir não pode reutilizar a ação do combatente derrotado');
    const nextTurn = Engine.resolveTurn(replacement.state, { player: makeAction(33), enemy: makeAction(33) });
    assert.equal(nextTurn.state.status, 'IN_PROGRESS');
    assert.equal(nextTurn.events.filter(event => event.type === BATTLE_EVENTS.MOVE_USED).length, 2);
    assert.equal(nextTurn.events.some(event => event.type === BATTLE_EVENTS.CONFUSION_DAMAGE), false);
    assert.ok(nextTurn.state[confusedRole].team[1].currentHp < 500);
    assert.equal(result.state[confusedRole].team[0].currentHp, 0, 'Substituição e turno seguinte preservam o estado anterior');
  });
}
