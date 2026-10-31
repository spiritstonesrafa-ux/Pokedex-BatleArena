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
  SUPPORTED_STATUS_MOVES,
  DEFAULT_SLEEP_TURNS,
  getMoveCapability,
  validateMoveData,
  isStatusConditionImmune,
  isStatusMoveImmune
} = require('../../assets/js/battle/battle-constants.js');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source.js');
const campaignMoveOptions = require('../../assets/js/campaign/campaign-move-options.js');

const TACKLE = KNOWN_CATALOG_MOVES[33];
const BITE = KNOWN_CATALOG_MOVES[44];
const ROCK_SLIDE = KNOWN_CATALOG_MOVES[157];
const ANCIENT_POWER = KNOWN_CATALOG_MOVES[246];
const SHADOW_BALL = KNOWN_CATALOG_MOVES[247];
const THUNDER_WAVE = KNOWN_CATALOG_MOVES[86];
const HYPNOSIS = KNOWN_CATALOG_MOVES[95];
const SLEEP_POWDER = KNOWN_CATALOG_MOVES[79];
const SPORE = KNOWN_CATALOG_MOVES[147];

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
    moves: moves.map(m => ({ ...m, currentPp: m.pp, maxPp: m.pp })),
    ...overrides
  };
}

// 1. Dados canônicos e suporte mecânico de Hypnosis, Sleep Powder e Spore
test('P4-SL-01: Dados canônicos, catalogação e classificação de suporte dos pilotos de sono', () => {
  // Hypnosis (ID 95)
  const hypCap = getMoveCapability({ id: 95 });
  assert.equal(hypCap.id, 95);
  assert.equal(hypCap.name, 'hypnosis');
  assert.equal(hypCap.supportLevel, 'FULL');
  assert.deepEqual(hypCap.requiredMechanics, ['STATUS_APPLICATION']);
  assert.equal(hypCap.priority, 0);
  assert.equal(hypCap.blockedReason, null);

  assert.equal(HYPNOSIS.id, 95);
  assert.equal(HYPNOSIS.name, 'hypnosis');
  assert.equal(HYPNOSIS.type, 'psychic');
  assert.equal(HYPNOSIS.power, 0);
  assert.equal(HYPNOSIS.accuracy, 60);
  assert.equal(HYPNOSIS.pp, 20);
  assert.equal(HYPNOSIS.damageClass, 'status');
  assert.equal(HYPNOSIS.statusEffect, 'sleep');
  assert.equal(validateMoveData(HYPNOSIS), true);

  // Sleep Powder (ID 79)
  const spCap = getMoveCapability({ id: 79 });
  assert.equal(spCap.id, 79);
  assert.equal(spCap.name, 'sleep-powder');
  assert.equal(spCap.supportLevel, 'FULL');
  assert.deepEqual(spCap.requiredMechanics, ['STATUS_APPLICATION']);
  assert.equal(spCap.priority, 0);
  assert.equal(spCap.blockedReason, null);

  assert.equal(SLEEP_POWDER.id, 79);
  assert.equal(SLEEP_POWDER.name, 'sleep-powder');
  assert.equal(SLEEP_POWDER.type, 'grass');
  assert.equal(SLEEP_POWDER.power, 0);
  assert.equal(SLEEP_POWDER.accuracy, 75);
  assert.equal(SLEEP_POWDER.pp, 15);
  assert.equal(SLEEP_POWDER.damageClass, 'status');
  assert.equal(SLEEP_POWDER.statusEffect, 'sleep');
  assert.equal(SLEEP_POWDER.isPowderMove, true);
  assert.equal(validateMoveData(SLEEP_POWDER), true);

  // Spore (ID 147)
  const sporeCap = getMoveCapability({ id: 147 });
  assert.equal(sporeCap.id, 147);
  assert.equal(sporeCap.name, 'spore');
  assert.equal(sporeCap.supportLevel, 'FULL');
  assert.deepEqual(sporeCap.requiredMechanics, ['STATUS_APPLICATION']);
  assert.equal(sporeCap.priority, 0);
  assert.equal(sporeCap.blockedReason, null);

  assert.equal(SPORE.id, 147);
  assert.equal(SPORE.name, 'spore');
  assert.equal(SPORE.type, 'grass');
  assert.equal(SPORE.power, 0);
  assert.equal(SPORE.accuracy, 100);
  assert.equal(SPORE.pp, 15);
  assert.equal(SPORE.damageClass, 'status');
  assert.equal(SPORE.statusEffect, 'sleep');
  assert.equal(SPORE.isPowderMove, true);
  assert.equal(validateMoveData(SPORE), true);

  // Outros golpes de sono NÃO devem estar marcados como FULL
  const restCap = getMoveCapability({ name: 'rest' });
  assert.notEqual(restCap?.supportLevel, 'FULL');
  const singCap = getMoveCapability({ name: 'sing' });
  assert.notEqual(singCap?.supportLevel, 'FULL');
  const yawnCap = getMoveCapability({ name: 'yawn' });
  assert.notEqual(yawnCap?.supportLevel, 'FULL');
  const dreamEaterCap = getMoveCapability({ name: 'dream-eater' });
  assert.notEqual(dreamEaterCap?.supportLevel, 'FULL');
});

// 2. Precisão de Hypnosis (60%), Sleep Powder (75%) e Spore (100%)
test('P4-SL-02: Avaliação determinística de acerto e erro por precisão dos pilotos', () => {
  const hypno = makeMon(97, 'hypno', ['psychic'], [HYPNOSIS], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80 });

  // Hypnosis: acerta com roll <= 60
  {
    const state = Engine.createBattle(hypno, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 95, accuracyRoll: 60, sleepDuration: 2 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.target === 'enemy'), true);
    assert.equal(res.state.enemy.statusCondition, 'sleep');
  }

  // Hypnosis: erra com roll 61 (> 60)
  {
    const state = Engine.createBattle(hypno, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 95, accuracyRoll: 61, sleepDuration: 2 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_MISSED && e.actor === 'player'), true);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), false);
    assert.equal(res.state.enemy.statusCondition, null);
  }

  // Sleep Powder: acerta com 75, erra com 76
  const vileplume = makeMon(45, 'vileplume', ['grass', 'poison'], [SLEEP_POWDER], { speed: 120 });
  {
    const state = Engine.createBattle(vileplume, blastoise);
    const resHit = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 79, accuracyRoll: 75, sleepDuration: 2 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
    });
    assert.equal(resHit.state.enemy.statusCondition, 'sleep');

    const resMiss = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 79, accuracyRoll: 76, sleepDuration: 2 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
    });
    assert.equal(resMiss.events.some(e => e.type === BATTLE_EVENTS.MOVE_MISSED), true);
    assert.equal(resMiss.state.enemy.statusCondition, null);
  }

  // Spore: 100% de precisão (acerta mesmo com roll 100)
  const breloom = makeMon(286, 'breloom', ['grass', 'fighting'], [SPORE], { speed: 120 });
  {
    const state = Engine.createBattle(breloom, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 147, accuracyRoll: 100, sleepDuration: 3 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), true);
    assert.equal(res.state.enemy.statusCondition, 'sleep');
    // Como Breloom é mais rápido, no mesmo turno Blastoise tenta agir e é impedido: 3 - 1 = 2
    assert.equal(res.state.enemy.sleepTurns, 2);
  }
});

// 3. Aplicação do sono e evento STATUS_APPLIED
test('P4-SL-03: Evento STATUS_APPLIED com alvo, condição e duração sorteada', () => {
  const breloom = makeMon(286, 'breloom', ['grass', 'fighting'], [SPORE], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80 });
  const state = Engine.createBattle(breloom, blastoise);

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 147, accuracyRoll: 1, sleepDuration: 3 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
  });

  const appliedEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STATUS_APPLIED);
  assert.equal(appliedEvents.length, 1);
  assert.equal(appliedEvents[0].target, 'enemy');
  assert.equal(appliedEvents[0].statusCondition, 'sleep');
  assert.equal(appliedEvents[0].sleepDuration, 3);
  assert.equal(res.state.enemy.statusCondition, 'sleep');
  assert.equal(res.state.enemy.sleepTurns, 2); // 3 - 1 turno impedido no mesmo turno!
});

// 4. Contagem da duração de sono para 1, 2 e 3 turnos (Gen 5+ modern)
test('P4-SL-04: Resolução de sono para durações 1, 2 e 3: oportunidades impedidas exatas antes de acordar', () => {
  // Caso A: Duração 1 turno
  // Turno 1: Breloom (mais rápido) usa Spore (duração 1). Blastoise tem ação impedida (1ª oportunidade) e contador vai a 0.
  // Turno 2: Blastoise tenta agir, acorda (STATUS_CURED: WOKE_UP) e executa Tackle no mesmo turno!
  {
    const breloom = makeMon(286, 'breloom', ['grass'], [SPORE], { speed: 120 });
    const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80, hp: 500 });
    const initialPp = blastoise.moves[0].currentPp;
    const state = Engine.createBattle(breloom, blastoise);

    const t1 = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 147, accuracyRoll: 1, sleepDuration: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(t1.state.enemy.statusCondition, 'sleep');
    assert.equal(t1.state.enemy.sleepTurns, 0);
    assert.equal(t1.state.enemy.moves[0].currentPp, initialPp, 'PP não é consumido durante impedimento');
    const imm1 = t1.events.filter(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy');
    assert.equal(imm1.length, 1, 'Blastoise é impedido 1 vez no Turno 1');

    const t2 = Engine.resolveTurn(t1.state, {
      player: { type: 'MOVE', moveId: 147, accuracyRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    // No Turno 2, Blastoise acorda e se move!
    assert.equal(t2.state.enemy.statusCondition, null);
    assert.equal(t2.state.enemy.sleepTurns, 0);
    assert.equal(t2.state.enemy.sleepCounter, 0);
    assert.equal(t2.state.enemy.moves[0].currentPp, initialPp - 1, 'PP consumido apenas ao executar o movimento');
    assert.equal(t2.events.some(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.actor === 'enemy' && e.reason === 'WOKE_UP'), true);
    assert.equal(t2.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'), true);
  }

  // Caso B: Duração 2 turnos (sequência completa com 2 impedimentos, despertar e execução)
  {
    const breloom = makeMon(286, 'breloom', ['grass'], [SPORE], { speed: 120 });
    const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80, hp: 500 });
    const initialPp = blastoise.moves[0].currentPp;
    const state = Engine.createBattle(breloom, blastoise);

    // 1. Aplicação antes de o alvo agir: primeira oportunidade impedida e contador passando de 2 para 1
    const t1 = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 147, accuracyRoll: 1, sleepDuration: 2 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(t1.state.enemy.statusCondition, 'sleep');
    assert.equal(t1.state.enemy.sleepTurns, 1, 'Contador passa de 2 para 1');
    assert.equal(t1.state.enemy.moves[0].currentPp, initialPp, 'PP não é consumido no Turno 1');
    const immT1 = t1.events.filter(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy');
    assert.equal(immT1.length, 1);

    // 2. Próxima tentativa: segunda oportunidade impedida e contador passando de 1 para 0
    const t2 = Engine.resolveTurn(t1.state, {
      player: { type: 'MOVE', moveId: 147, accuracyRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(t2.state.enemy.statusCondition, 'sleep');
    assert.equal(t2.state.enemy.sleepTurns, 0, 'Contador passa de 1 para 0');
    assert.equal(t2.state.enemy.moves[0].currentPp, initialPp, 'PP não é consumido no Turno 2');
    const immT2 = t2.events.filter(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy');
    assert.equal(immT2.length, 1);

    // 3. Tentativa seguinte: despertar e execução normal do movimento escolhido
    const t3 = Engine.resolveTurn(t2.state, {
      player: { type: 'MOVE', moveId: 147, accuracyRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(t3.state.enemy.statusCondition, null, 'Condição limpa');
    assert.equal(t3.state.enemy.sleepTurns, 0, 'sleepTurns limpo');
    assert.equal(t3.state.enemy.sleepCounter, 0, 'sleepCounter limpo');
    assert.equal(t3.state.enemy.moves[0].currentPp, initialPp - 1, 'PP consumido ao executar após acordar');

    const allEvents = [...t1.events, ...t2.events, ...t3.events];
    const totalImmobilized = allEvents.filter(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy');
    assert.equal(totalImmobilized.length, 2, 'Exatamente duas oportunidades impedidas');

    const curedEvents = allEvents.filter(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.actor === 'enemy');
    assert.equal(curedEvents.length, 1, 'Um único evento de despertar');
    assert.equal(curedEvents[0].reason, 'WOKE_UP');

    const moveUsedByEnemy = allEvents.filter(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy');
    assert.equal(moveUsedByEnemy.length, 1, 'Uma única execução do movimento ao acordar');
  }

  // Caso C: Duração 3 turnos
  // Alvo dorme por 3 ações impedidas antes de acordar na 4ª tentativa
  {
    const breloom = makeMon(286, 'breloom', ['grass'], [SPORE], { speed: 120 });
    const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80, hp: 500 });
    const initialPp = blastoise.moves[0].currentPp;
    const state = Engine.createBattle(breloom, blastoise);

    // Turno 1: Spore com duração 3. Blastoise é impedido (1ª ação perdida), restam 2
    const t1 = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 147, accuracyRoll: 1, sleepDuration: 3 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(t1.state.enemy.sleepTurns, 2);
    assert.equal(t1.state.enemy.moves[0].currentPp, initialPp);
    assert.equal(t1.events.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy'), true);

    // Turno 2: Breloom ataca; Blastoise é impedido (2ª ação perdida), restam 1
    const t2 = Engine.resolveTurn(t1.state, {
      player: { type: 'MOVE', moveId: 147, accuracyRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(t2.state.enemy.sleepTurns, 1);
    assert.equal(t2.state.enemy.moves[0].currentPp, initialPp);
    assert.equal(t2.events.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy'), true);

    // Turno 3: Blastoise é impedido (3ª ação perdida), restam 0
    const t3 = Engine.resolveTurn(t2.state, {
      player: { type: 'MOVE', moveId: 147, accuracyRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(t3.state.enemy.sleepTurns, 0);
    assert.equal(t3.state.enemy.moves[0].currentPp, initialPp);
    assert.equal(t3.events.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy'), true);

    // Turno 4: Blastoise acorda e ataca com Tackle!
    const t4 = Engine.resolveTurn(t3.state, {
      player: { type: 'MOVE', moveId: 147, accuracyRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(t4.state.enemy.statusCondition, null);
    assert.equal(t4.state.enemy.sleepTurns, 0);
    assert.equal(t4.state.enemy.sleepCounter, 0);
    assert.equal(t4.state.enemy.moves[0].currentPp, initialPp - 1);
    assert.equal(t4.events.some(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.actor === 'enemy' && e.reason === 'WOKE_UP'), true);
    assert.equal(t4.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'), true);
  }
});

// 5. Sono aplicado antes vs depois da ação do alvo no mesmo turno
test('P4-SL-05: Sono aplicado antes vs depois da ação do alvo no mesmo turno', () => {
  // A. Atacante mais rápido aplica sono: a ação do alvo no mesmo turno é impedida
  {
    const fastBreloom = makeMon(286, 'breloom', ['grass'], [SPORE], { speed: 120 });
    const slowBlastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80 });
    const state = Engine.createBattle(fastBreloom, slowBlastoise);

    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 147, accuracyRoll: 1, sleepDuration: 2 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy'), true);
    assert.equal(res.state.enemy.sleepTurns, 1);
  }

  // B. Atacante mais lento aplica sono: o alvo já agiu normalmente neste turno
  {
    const fastBlastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 120, hp: 500 });
    const slowBreloom = makeMon(286, 'breloom', ['grass'], [SPORE], { speed: 80, hp: 500 });
    const state = Engine.createBattle(fastBlastoise, slowBreloom);

    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 },
      enemy: { type: 'MOVE', moveId: 147, accuracyRoll: 1, sleepDuration: 2 }
    });
    // Blastoise agiu com sucesso
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), true);
    // Sono aplicado a Blastoise após sua ação
    assert.equal(res.state.player.statusCondition, 'sleep');
    assert.equal(res.state.player.sleepTurns, 2); // Contador intacto em 2, pois ainda não perdeu turno dormindo
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player'), false);
  }
});

// 6. Golpe impedido não consome PP nem causa dano ou efeitos secundários
test('P4-SL-06: Ação impedida por sono não consome PP nem causa dano ou efeitos', () => {
  const sleepingBlastoise = makeMon(9, 'blastoise', ['water'], [BITE], { speed: 120, hp: 500 }, {
    statusCondition: 'sleep',
    sleepTurns: 2
  });
  const enemyFlareon = makeMon(136, 'flareon', ['fire'], [TACKLE], { speed: 80, hp: 400 });
  const initialPp = sleepingBlastoise.moves[0].currentPp;

  const state = Engine.createBattle(sleepingBlastoise, enemyFlareon);
  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 10 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  // Não consumiu PP do jogador
  assert.equal(res.state.player.moves[0].currentPp, initialPp);
  assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.PP_CHANGED && e.actor === 'player'), false);

  // Não causou dano nem flinch no adversário
  assert.equal(res.state.enemy.currentHp, 400);
  assert.equal(res.state.enemy.isFlinched, false);
  assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.DAMAGE_DEALT && e.target === 'enemy'), false);
});

// 7. Despertar seguido de execução imediata do golpe no mesmo turno
test('P4-SL-07: Despertar emite STATUS_CURED (WOKE_UP) e executa o golpe normalmente no mesmo turno', () => {
  const playerMon = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 120, hp: 500 });
  const flareon = makeMon(136, 'flareon', ['fire'], [TACKLE], { speed: 80, hp: 400 });

  const state = Engine.createBattle(playerMon, flareon);
  state.player.statusCondition = 'sleep';
  state.player.sleepTurns = 0;
  state.player.sleepCounter = 0;

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  // Emite STATUS_CURED com razão WOKE_UP
  const curedEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STATUS_CURED);
  assert.equal(curedEvents.length, 1);
  assert.equal(curedEvents[0].actor, 'player');
  assert.equal(curedEvents[0].statusCondition, 'sleep');
  assert.equal(curedEvents[0].reason, 'WOKE_UP');

  // Executa o golpe no mesmo turno consumindo PP e causando dano
  assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), true);
  assert.equal(res.state.player.moves[0].currentPp, TACKLE.pp - 1);
  assert.ok(res.state.enemy.currentHp < 400);
  assert.equal(res.state.player.statusCondition, null);
  assert.equal(res.state.player.sleepTurns, 0);
});

// 8. Incompatibilidade: alvo já com status (poison, burn, paralysis, sleep) bloqueia novo sono
test('P4-SL-08: Alvo com condição de status bloqueia sono com ALREADY_STATUS e preserva dados', () => {
  const breloom = makeMon(286, 'breloom', ['grass'], [SPORE], { speed: 120 });
  const statuses = ['poison', 'burn', 'paralysis', 'sleep'];

  for (const st of statuses) {
    const enemy = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80 }, {
      statusCondition: st,
      sleepTurns: st === 'sleep' ? 2 : 0
    });

    const state = Engine.createBattle(breloom, enemy);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 147, accuracyRoll: 1, sleepDuration: 3 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
    });

    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_BLOCKED && e.reason === 'ALREADY_STATUS'), true, `Bloqueio falhou para ${st}`);
    assert.equal(res.state.enemy.statusCondition, st, `Status alterado indevidamente para ${st}`);
    if (st === 'sleep') {
      // Contador anterior foi decrementado pela tentativa de ação, mas NÃO reiniciado para 3!
      assert.notEqual(res.state.enemy.sleepTurns, 3);
    }
  }
});

// 9. Imunidade de Pokémon Grass a golpes de pó (Sleep Powder e Spore), ausência em Hypnosis
test('P4-SL-09: Imunidade de Grass a Sleep Powder e Spore, mas suscetibilidade a Hypnosis', () => {
  const grassMon = makeMon(3, 'venusaur', ['grass', 'poison'], [TACKLE], { speed: 80 });

  // A. Sleep Powder contra Grass é bloqueado por IMMUNE
  {
    const vileplume = makeMon(45, 'vileplume', ['grass'], [SLEEP_POWDER], { speed: 120 });
    const state = Engine.createBattle(vileplume, grassMon);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 79, accuracyRoll: 1, sleepDuration: 2 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_BLOCKED && e.reason === 'IMMUNE'), true);
    assert.equal(res.state.enemy.statusCondition, null);
  }

  // B. Spore contra Grass é bloqueado por IMMUNE
  {
    const breloom = makeMon(286, 'breloom', ['grass'], [SPORE], { speed: 120 });
    const state = Engine.createBattle(breloom, grassMon);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 147, accuracyRoll: 1, sleepDuration: 2 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_BLOCKED && e.reason === 'IMMUNE'), true);
    assert.equal(res.state.enemy.statusCondition, null);
  }

  // C. Hypnosis NÃO é golpe de pó e afeta Pokémon Grass normalmente
  {
    const hypno = makeMon(97, 'hypno', ['psychic'], [HYPNOSIS], { speed: 120 });
    const state = Engine.createBattle(hypno, grassMon);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 95, accuracyRoll: 1, sleepDuration: 2 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.statusCondition === 'sleep'), true);
    assert.equal(res.state.enemy.statusCondition, 'sleep');
  }
});

// 10. Imunidade de dano Psychic em Dark não bloqueia Hypnosis (status move)
test('P4-SL-10: Hypnosis acerta alvos do tipo Dark (imunidade de dano psíquico não se aplica a status)', () => {
  const hypno = makeMon(97, 'hypno', ['psychic'], [HYPNOSIS], { speed: 120 });
  const umbreon = makeMon(197, 'umbreon', ['dark'], [TACKLE], { speed: 80 });

  const state = Engine.createBattle(hypno, umbreon);
  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 95, accuracyRoll: 1, sleepDuration: 2 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
  });

  assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), true);
  assert.equal(res.state.enemy.statusCondition, 'sleep');
});

// 11. Troca voluntária com Pokémon adormecido e preservação do contador no banco
test('P4-SL-11: Troca voluntária permitida para combatente dormindo e preservação de sleepTurns no banco', () => {
  const sleepingLead = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 120, hp: 500 }, {
    statusCondition: 'sleep',
    sleepTurns: 2
  });
  const benchedMon1 = makeMon(1, 'bulbasaur', ['grass'], [TACKLE], { speed: 100 });
  const benchedMon2 = makeMon(4, 'charmander', ['fire'], [TACKLE], { speed: 100 });

  const enemy1 = makeMon(136, 'flareon', ['fire'], [TACKLE], { speed: 80 });
  const enemy2 = makeMon(135, 'jolteon', ['electric'], [TACKLE], { speed: 80 });
  const enemy3 = makeMon(134, 'vaporeon', ['water'], [TACKLE], { speed: 80 });

  const state = Engine.createTeamBattle([sleepingLead, benchedMon1, benchedMon2], [enemy1, enemy2, enemy3]);

  // Turno 1: Jogador realiza troca voluntária para Bulbasaur
  const resT1 = Engine.resolveTurn(state, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  assert.equal(resT1.events.some(e => e.type === BATTLE_EVENTS.POKEMON_SWITCHED), true);
  assert.equal(Engine.getActiveCombatant(resT1.state, 'player').name, 'bulbasaur');

  // No banco, Blastoise mantém intactos statusCondition: 'sleep' e sleepTurns: 2
  const benchedBlastoise = resT1.state.player.team[0];
  assert.equal(benchedBlastoise.statusCondition, 'sleep');
  assert.equal(benchedBlastoise.sleepTurns, 2);

  // Turno 2: Jogador troca de volta para Blastoise
  const resT2 = Engine.resolveTurn(resT1.state, {
    player: { type: 'SWITCH', targetIndex: 0 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  const activeBack = Engine.getActiveCombatant(resT2.state, 'player');
  assert.equal(activeBack.name, 'blastoise');
  assert.equal(activeBack.statusCondition, 'sleep');
  assert.equal(activeBack.sleepTurns, 2, 'Contador não deve ser resetado nem decrementado no banco');
});

// 12. Precedência de sono sobre flinch (hesitação)
test('P4-SL-12: Precedência de sono sobre hesitação: dormindo profundamente descarta flinch; acordando sofre flinch', () => {
  // A. Alvo dormindo profundamente (sleepTurns > 0) sofre golpe de Bite com ativação de flinch.
  // Flinch é descartado sem anúncio duplo, emitindo apenas STATUS_IMMOBILIZED.
  {
    const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120 });
    const sleepingBlastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80, hp: 500 }, {
      statusCondition: 'sleep',
      sleepTurns: 2
    });

    const state = Engine.createBattle(sleepingBlastoise, flareon);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 33, accuracyRoll: 1 },
      enemy: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 10 }
    });

    // Blastoise foi impedido por sono
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player'), true);
    // FLINCH_IMMOBILIZED NÃO deve ter sido emitido
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'player'), false);
    assert.equal(res.state.player.isFlinched, false);
  }

  // B. Alvo pronto para acordar (sleepTurns == 0) sofre golpe de Bite mais rápido com flinch.
  // Blastoise acorda primeiro (STATUS_CURED: WOKE_UP), mas hesita antes de se mover (FLINCH_IMMOBILIZED)!
  {
    const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120 });
    const readyBlastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80, hp: 500 });

    const state = Engine.createBattle(readyBlastoise, flareon);
    state.player.statusCondition = 'sleep';
    state.player.sleepTurns = 0;
    state.player.sleepCounter = 0;

    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 33, accuracyRoll: 1 },
      enemy: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 10 }
    });

    // 1. Flareon usou Bite e causou dano
    // 2. Blastoise acorda
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.actor === 'player' && e.reason === 'WOKE_UP'), true);
    // 3. Blastoise sofre flinch ao tentar agir!
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'player'), true);
    // 4. Blastoise não executou o golpe
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), false);
  }
});

// 13. Normalização de dados na entrada e limpeza ao acordar
test('P4-SL-13: Normalização de sleepTurns em createCombatant e higienização completa ao acordar', () => {
  // A. createCombatant com sleep sem contador -> default DEFAULT_SLEEP_TURNS (2)
  const rawMon = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 200 }, { statusCondition: 'sleep' });
  delete rawMon.sleepTurns;
  delete rawMon.sleepCounter;
  const monNoCounter = Engine.createCombatant(rawMon);
  assert.equal(monNoCounter.statusCondition, 'sleep');
  assert.equal(monNoCounter.sleepTurns, DEFAULT_SLEEP_TURNS);

  // B. createCombatant com statusCondition: null mas sleepTurns: 3 -> força sleepTurns: 0
  const monSpurious = Engine.createCombatant(makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 200 }, {
    statusCondition: null,
    sleepTurns: 3
  }));
  assert.equal(monSpurious.statusCondition, null);
  assert.equal(monSpurious.sleepTurns, 0);

  // C. Ao acordar, sleepTurns e sleepCounter são limpos para 0
  const wakingMon = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 120 });
  const state = Engine.createBattle(wakingMon, makeMon(136, 'flareon', ['fire'], [TACKLE], { speed: 80 }));
  state.player.statusCondition = 'sleep';
  state.player.sleepTurns = 0;
  state.player.sleepCounter = 0;

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(res.state.player.statusCondition, null);
  assert.equal(res.state.player.sleepTurns, 0);
  assert.equal(res.state.player.sleepCounter, 0);
});

// 14. Independência do sorteio determinístico de duração do sono
test('P4-SL-14: rollSleepDuration na DeterministicRandomSource é independente de precisão, dano e secundários', () => {
  const rng = new DeterministicRandomSource();
  rng.setSleepDurationSequence([1, 2, 3]);
  rng.setAccuracySequence([50]);
  rng.setDamageSequence([100]);
  rng.setSecondaryEffectSequence([20]);

  assert.equal(rng.rollSleepDuration(), 1);
  assert.equal(rng.rollSleepDuration(), 2);
  assert.equal(rng.rollSleepDuration(), 3);

  // Demais rolagens preservam seus ponteiros
  assert.equal(rng.rollAccuracy(), 50);
  assert.equal(rng.rollDamage(), 100);
  assert.equal(rng.rollSecondaryEffect(), 20);
});

// 15. Integração com BattleSessionController nos dois sentidos (Player -> Enemy e Enemy -> Player)
test('P4-SL-15A: Sessão real — Jogador adormece adversário com Spore (duração 2)', async () => {
  const breloom = makeMon(286, 'breloom', ['grass'], [SPORE], { speed: 120, hp: 500 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80, hp: 500 });

  const rng = new DeterministicRandomSource();
  rng.setAccuracySequence([1, 1]);
  rng.setDamageSequence([100, 100]);
  rng.setSleepDurationSequence([2]);

  const capturedEvents = [];
  const session = new BattleSessionController({
    teamStore: { load: () => [286, 1, 4] },
    hydrator: {
      hydrateTeam: async (ids) => ids.map(id => id === 286 ? breloom : makeMon(id, 'm-' + id, ['normal'], [TACKLE]))
    },
    opponentFactory: {
      createOpponentTeam: async () => [blastoise, makeMon(131, 'lapras', ['water'], [TACKLE]), makeMon(3, 'venusaur', ['grass'], [TACKLE])]
    },
    randomSource: rng,
    presentationEngine: {
      play: async (events) => { capturedEvents.push(...events); },
      playCommands: async () => { }
    }
  });

  await session.prepareBattle({ playerTeamIds: [286, 1, 4] });
  await session.startBattle();

  // Turno 1: Jogador usa Spore (moveId: 147)
  await session.submitPlayerMove(147);

  // Adversário recebeu status de sono
  assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.target === 'enemy' && e.statusCondition === 'sleep'), true);
  // Adversário foi impedido
  assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy'), true);

  const commands = Mapper.mapEvents(capturedEvents);
  const statusCommands = commands.filter(c => c.type === 'STATUS_FEEDBACK' && c.statusCondition === 'sleep');
  assert.ok(statusCommands.length >= 1);
});

test('P4-SL-15B: Sessão real — Adversário adormece jogador com Hypnosis (duração 1) e jogador acorda no Turno 2', async () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50, hp: 600 });
  const hypno = makeMon(97, 'hypno', ['psychic'], [HYPNOSIS, TACKLE], { speed: 120, hp: 400 });

  const rng = new DeterministicRandomSource();
  rng.setAccuracySequence([1, 1, 1, 1]);
  rng.setDamageSequence([100, 100, 100, 100]);
  rng.setSleepDurationSequence([1]);

  const capturedEvents = [];
  const session = new BattleSessionController({
    teamStore: { load: () => [9, 1, 4] },
    hydrator: {
      hydrateTeam: async (ids) => ids.map(id => id === 9 ? blastoise : makeMon(id, 'm-' + id, ['normal'], [TACKLE]))
    },
    opponentFactory: {
      createOpponentTeam: async () => [hypno, makeMon(131, 'lapras', ['water'], [TACKLE]), makeMon(3, 'venusaur', ['grass'], [TACKLE])]
    },
    randomSource: rng,
    presentationEngine: {
      play: async (events) => { capturedEvents.push(...events); },
      playCommands: async () => { }
    }
  });

  await session.prepareBattle({ playerTeamIds: [9, 1, 4] });
  await session.startBattle();

  // Turno 1: Hypno (mais rápido) usa Hypnosis; Blastoise é impedido
  await session.submitPlayerMove(33);

  assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.target === 'player' && e.statusCondition === 'sleep'), true);
  assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player'), true);

  // Turno 2: Hypno usa Tackle e Blastoise acorda e ataca!
  await session.submitPlayerMove(33);

  assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_CURED && e.actor === 'player' && e.reason === 'WOKE_UP'), true);
  assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), true);
});

test('P4-SL-15C: Sessão real durante troca voluntária — Adversário usa golpe de sono (duração 3) e atinge o Pokémon que entrou', async () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80 });
  const lapras = makeMon(131, 'lapras', ['water', 'ice'], [TACKLE], { speed: 60 });
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 80 });

  // Adversário com um golpe de sono como única opção de movimento
  const hypno = makeMon(97, 'hypno', ['psychic'], [HYPNOSIS], { speed: 120 });
  const fainted1 = makeMon(136, 'flareon', ['fire'], [TACKLE], { hp: 500 }, { currentHp: 0 });
  const fainted2 = makeMon(135, 'jolteon', ['electric'], [TACKLE], { hp: 500 }, { currentHp: 0 });

  let sleepRollCount = 0;
  const rng = new DeterministicRandomSource();
  rng.setAccuracySequence([1]);
  rng.setDamageSequence([100]);
  rng.setSleepDurationSequence([3]);
  const origRollSleep = rng.rollSleepDuration.bind(rng);
  rng.rollSleepDuration = () => {
    sleepRollCount++;
    return origRollSleep();
  };

  const capturedEvents = [];
  const session = new BattleSessionController({
    teamStore: { load: () => [9, 131, 3] },
    hydrator: {
      hydrateTeam: async (ids) => ids.map(id => {
        if (id === 9) return blastoise;
        if (id === 131) return lapras;
        return venusaur;
      })
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

  // Troca voluntária: Blastoise sai, Lapras entra
  await session.submitPlayerSwitch(131);

  // 1. rollSleepDuration chamado uma única vez para a ação preparada
  assert.equal(sleepRollCount, 1, 'rollSleepDuration deve ter sido chamado exatamente 1 vez');

  // 2. Eventos identificando corretamente o alvo (Lapras)
  const appliedEvent = capturedEvents.find(e => e.type === BATTLE_EVENTS.STATUS_APPLIED);
  assert.ok(appliedEvent, 'STATUS_APPLIED deve ter sido emitido');
  assert.equal(appliedEvent.target, 'player');
  assert.equal(appliedEvent.pokemonName, 'lapras');
  assert.equal(appliedEvent.statusCondition, 'sleep');
  assert.equal(appliedEvent.sleepDuration, 3, 'Duração programada 3 encaminhada ao motor');

  // 3. Golpe atingindo o Pokémon que entrou com contador 3 e sem decremento na troca
  const activeMon = session.engine.getActiveCombatant(session.battleState, 'player');
  assert.equal(activeMon.name, 'lapras');
  assert.equal(activeMon.statusCondition, 'sleep');
  assert.equal(activeMon.sleepTurns, 3, 'Contador permanece em 3 sem decremento no turno da troca');

  // 4. Combatente retirado sem receber indevidamente o sono
  const benchedMon = session.battleState.player.team[0];
  assert.equal(benchedMon.name, 'blastoise');
  assert.equal(benchedMon.statusCondition, null, 'Pokémon retirado não deve ter status');
  assert.equal(benchedMon.sleepTurns, 0);

  // 5. Mapeador converte para STATUS_FEEDBACK correto
  const commands = Mapper.mapEvents(capturedEvents);
  const statusCmd = commands.find(c => c.type === 'STATUS_FEEDBACK' && c.statusCondition === 'sleep');
  assert.ok(statusCmd);
  assert.equal(statusCmd.pokemonName, 'lapras');
  assert.equal(statusCmd.outcome, 'APPLIED');
});

test('P4-SL-15D: Sessão real durante troca voluntária — Adversário usa golpe de sono mas erra (nenhum sono aplicado)', async () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80 });
  const lapras = makeMon(131, 'lapras', ['water', 'ice'], [TACKLE], { speed: 60 });
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 80 });

  const hypno = makeMon(97, 'hypno', ['psychic'], [HYPNOSIS], { speed: 120 });
  const fainted1 = makeMon(136, 'flareon', ['fire'], [TACKLE], { hp: 500 }, { currentHp: 0 });
  const fainted2 = makeMon(135, 'jolteon', ['electric'], [TACKLE], { hp: 500 }, { currentHp: 0 });

  let sleepRollCount = 0;
  const rng = new DeterministicRandomSource();
  // Hypnosis tem 60% de acurácia; roll 80 erra
  rng.setAccuracySequence([80]);
  rng.setDamageSequence([100]);
  rng.setSleepDurationSequence([3]);
  const origRollSleep = rng.rollSleepDuration.bind(rng);
  rng.rollSleepDuration = () => {
    sleepRollCount++;
    return origRollSleep();
  };

  const capturedEvents = [];
  const session = new BattleSessionController({
    teamStore: { load: () => [9, 131, 3] },
    hydrator: {
      hydrateTeam: async (ids) => ids.map(id => {
        if (id === 9) return blastoise;
        if (id === 131) return lapras;
        return venusaur;
      })
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

  // A duração é preparada antecipadamente pela sessão conforme contrato da ação
  assert.equal(sleepRollCount, 1, 'rollSleepDuration é chamado na preparação da ação');

  // Golpe erra: MOVE_MISSED emitido, STATUS_APPLIED ausente
  assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.MOVE_MISSED && e.actor === 'enemy'), true);
  assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), false);

  const activeMon = session.engine.getActiveCombatant(session.battleState, 'player');
  assert.equal(activeMon.name, 'lapras');
  assert.equal(activeMon.statusCondition, null, 'Nenhum sono aplicado no erro');
  assert.equal(activeMon.sleepTurns, 0);
});

test('P4-SL-15E: Sessão real durante troca voluntária — Movimento do adversário sem efeito de sono não solicita duração de sono', async () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80 });
  const lapras = makeMon(131, 'lapras', ['water', 'ice'], [TACKLE], { speed: 60 });
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE], { speed: 80 });

  // Adversário com Tackle apenas (sem efeito de sono)
  const flareon = makeMon(136, 'flareon', ['fire'], [TACKLE], { speed: 120 });
  const fainted1 = makeMon(97, 'hypno', ['psychic'], [TACKLE], { hp: 500 }, { currentHp: 0 });
  const fainted2 = makeMon(135, 'jolteon', ['electric'], [TACKLE], { hp: 500 }, { currentHp: 0 });

  let sleepRollCount = 0;
  const rng = new DeterministicRandomSource();
  rng.setAccuracySequence([1]);
  rng.setDamageSequence([100]);
  const origRollSleep = rng.rollSleepDuration.bind(rng);
  rng.rollSleepDuration = () => {
    sleepRollCount++;
    return origRollSleep();
  };

  const capturedEvents = [];
  const session = new BattleSessionController({
    teamStore: { load: () => [9, 131, 3] },
    hydrator: {
      hydrateTeam: async (ids) => ids.map(id => {
        if (id === 9) return blastoise;
        if (id === 131) return lapras;
        return venusaur;
      })
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

  await session.submitPlayerSwitch(131);

  assert.equal(sleepRollCount, 0, 'Golpe sem sono não deve chamar rollSleepDuration');
  assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED), true);

  const activeMon = session.engine.getActiveCombatant(session.battleState, 'player');
  assert.equal(activeMon.name, 'lapras');
  assert.equal(activeMon.statusCondition, null);
  assert.equal(activeMon.sleepTurns, 0);
});

// 16. Mapeamento de apresentação e adaptação da UI
test('P4-SL-16: Mapper e UiAdapter tratam eventos de sono sem duplicação', () => {
  const events = [
    { type: BATTLE_EVENTS.STATUS_APPLIED, target: 'player', pokemonName: 'blastoise', statusCondition: 'sleep', sleepDuration: 2 },
    { type: BATTLE_EVENTS.STATUS_IMMOBILIZED, actor: 'player', pokemonName: 'blastoise', statusCondition: 'sleep' },
    { type: BATTLE_EVENTS.STATUS_CURED, actor: 'player', pokemonName: 'blastoise', statusCondition: 'sleep', reason: 'WOKE_UP' }
  ];

  const commands = Mapper.mapEvents(events);
  assert.equal(commands.length, 3);
  assert.equal(commands[0].type, 'STATUS_FEEDBACK');
  assert.equal(commands[0].outcome, 'APPLIED');
  assert.equal(commands[0].statusCondition, 'sleep');

  assert.equal(commands[1].type, 'STATUS_FEEDBACK');
  assert.equal(commands[1].outcome, 'IMMOBILIZED');
  assert.equal(commands[1].statusCondition, 'sleep');

  assert.equal(commands[2].type, 'STATUS_FEEDBACK');
  assert.equal(commands[2].outcome, 'WOKE_UP');
  assert.equal(commands[2].statusCondition, 'sleep');

  // BattleUiDomAdapter
  const badges = { player: null, enemy: null };
  const messages = [];
  const fakeView = {
    updateStatusBadge: (target, condition) => { badges[target] = condition; },
    displayMessage: (msg) => { messages.push(msg); }
  };
  const uiAdapter = new BattleUiDomAdapter({ view: fakeView });

  uiAdapter.handleCommand({
    type: 'STATUS_FEEDBACK',
    target: 'player',
    pokemonName: 'blastoise',
    statusCondition: 'sleep',
    outcome: 'APPLIED'
  });
  assert.equal(badges.player, 'sleep');
  assert.ok(messages.some(m => m.includes('adormeceu')));

  uiAdapter.handleCommand({
    type: 'STATUS_FEEDBACK',
    target: 'player',
    pokemonName: 'blastoise',
    statusCondition: 'sleep',
    outcome: 'WOKE_UP'
  });
  assert.equal(badges.player, null);
  assert.ok(messages.some(m => m.includes('acordou')));
});

// 17. BattleEvaluator e BattleAI: pontuação e elegibilidade
test('P4-SL-17: Avaliador e IA pontuam golpes de sono e atribuem zero benefício para alvos inelegíveis', () => {
  const breloom = makeMon(286, 'breloom', ['grass'], [SPORE], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80, hp: 500 });

  // Cenário 1: Alvo elegível saudável
  const evalEligible = Evaluator.evaluateMove(breloom, blastoise, SPORE);
  assert.equal(evalEligible.isEligible, true);
  assert.ok(evalEligible.expectedStatusBenefit > 0, 'Golpe de sono viável deve ter benefício > 0');

  // Cenário 2: Alvo já com status condition -> benefício = 0 e inelegível
  const poisonedBlastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80 }, { statusCondition: 'poison' });
  const evalPoisoned = Evaluator.evaluateMove(breloom, poisonedBlastoise, SPORE);
  assert.equal(evalPoisoned.isEligible, false);
  assert.equal(evalPoisoned.expectedStatusBenefit, 0);

  // Cenário 3: Alvo Grass vs golpe de pó (Spore) -> imune, benefício = 0
  const venusaur = makeMon(3, 'venusaur', ['grass', 'poison'], [TACKLE], { speed: 80 });
  const evalGrassSpore = Evaluator.evaluateMove(breloom, venusaur, SPORE);
  assert.equal(evalGrassSpore.isEligible, false);
  assert.equal(evalGrassSpore.expectedStatusBenefit, 0);

  // Cenário 4: BattleAI chooseAction
  const breloomWithTackle = makeMon(286, 'breloom', ['grass'], [SPORE, TACKLE], { speed: 120 });
  const stateEligible = Engine.createBattle(blastoise, breloomWithTackle);
  const aiEligible = AI.chooseAction(stateEligible, 'enemy');
  assert.equal(aiEligible.action.moveId, 147, 'IA deve priorizar Spore em alvo sem status');

  const stateIneligible = Engine.createBattle(poisonedBlastoise, breloomWithTackle);
  const aiIneligible = AI.chooseAction(stateIneligible, 'enemy');
  assert.equal(aiIneligible.action.moveId, 33, 'IA deve usar Tackle em alvo já com status');
});

// 18. Disponibilidade de pilotos no catálogo de opções da campanha
test('P4-SL-18: Disponibilidade de Hypnosis, Sleep Powder e Spore em espécies da campanha via campaignMoveOptions.getPool', () => {
  // Hypno (ID 97) pode aprender Hypnosis (ID 95)
  const hypnoPool = campaignMoveOptions.getPool(97);
  assert.ok(hypnoPool.some(m => m.id === 95 && m.name === 'hypnosis'), 'Hypno deve ter Hypnosis no pool');

  // Vileplume (ID 45) pode aprender Sleep Powder (ID 79)
  const vileplumePool = campaignMoveOptions.getPool(45);
  assert.ok(vileplumePool.some(m => m.id === 79 && m.name === 'sleep-powder'), 'Vileplume deve ter Sleep Powder no pool');

  // Breloom (ID 286) pode aprender Spore (ID 147)
  const breloomPool = campaignMoveOptions.getPool(286);
  assert.ok(breloomPool.some(m => m.id === 147 && m.name === 'spore'), 'Breloom deve ter Spore no pool');
});

// 19. Preservação de pilotos e mecânicas anteriores
test('P4-SL-19: Preservação de Ancient Power pós-nocaute, Bite/Rock Slide flinch e redução de atributos secundários', () => {
  // Ancient Power post-KO
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], { specialAttack: 200 });
  const weakEnemy = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 10, currentHp: 10 });
  const stateAp = Engine.createBattle(zapdos, weakEnemy);

  const resAp = Engine.resolveTurn(stateAp, {
    player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
  });
  assert.equal(resAp.state.player.statStages.attack, 1);
  assert.equal(resAp.state.player.statStages.specialAttack, 1);

  // Bite flinch
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 80, hp: 500 });
  const stateBite = Engine.createBattle(flareon, blastoise);

  const resBite = Engine.resolveTurn(stateBite, {
    player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 10 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
  });
  assert.equal(resBite.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'enemy'), true);

  // Shadow Ball Special Defense drop
  const gengar = makeMon(94, 'gengar', ['ghost', 'poison'], [SHADOW_BALL], { specialAttack: 150 });
  const stateSb = Engine.createBattle(gengar, blastoise);

  const resSb = Engine.resolveTurn(stateSb, {
    player: { type: 'MOVE', moveId: 247, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 15 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
  });
  assert.equal(resSb.state.enemy.statStages.specialDefense, -1);
});
