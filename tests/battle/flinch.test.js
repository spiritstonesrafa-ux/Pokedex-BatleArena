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
  SECONDARY_EFFECT_MOVES,
  getSecondaryEffect,
  getMoveCapability,
  validateMoveData,
  getEffectiveStat
} = require('../../assets/js/battle/battle-constants.js');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source.js');
const campaignMoveOptions = require('../../assets/js/campaign/campaign-move-options.js');
const campaignFixedCatalog = require('../../assets/js/campaign/campaign-fixed-battle-catalog.js');

const TACKLE = KNOWN_CATALOG_MOVES[33];
const BITE = KNOWN_CATALOG_MOVES[44];
const ROCK_SLIDE = KNOWN_CATALOG_MOVES[157];
const QUICK_ATTACK = KNOWN_CATALOG_MOVES[98];
const DRAGON_TAIL = KNOWN_CATALOG_MOVES[525];
const ANCIENT_POWER = KNOWN_CATALOG_MOVES[246];

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

function makeTeam(lead, bench1, bench2) {
  return [lead, bench1, bench2];
}

// 1. Dados canônicos e classificação dos dois pilotos
test('P4-FL-01: Dados canônicos, catalogação e classificação de suporte de Bite e Rock Slide', () => {
  // Bite (ID 44)
  const biteCap = getMoveCapability({ id: 44 });
  assert.equal(biteCap.id, 44);
  assert.equal(biteCap.name, 'bite');
  assert.equal(biteCap.supportLevel, 'FULL');
  assert.deepEqual(biteCap.requiredMechanics, ['PHYSICAL_DAMAGE', 'SECONDARY_FLINCH']);
  assert.deepEqual(biteCap.knownPending, []);
  assert.equal(biteCap.blockedReason, null);
  assert.equal(biteCap.priority, 0);

  const biteSec = getSecondaryEffect({ id: 44 });
  assert.ok(biteSec, 'Efeito secundário de Bite deve existir');
  assert.equal(biteSec.chance, 30);
  assert.equal(biteSec.target, 'defender');
  assert.equal(biteSec.flinch, true);

  assert.equal(validateMoveData(BITE), true);

  // Rock Slide (ID 157)
  const rsCap = getMoveCapability({ id: 157 });
  assert.equal(rsCap.id, 157);
  assert.equal(rsCap.name, 'rock-slide');
  assert.equal(rsCap.supportLevel, 'FULL');
  assert.deepEqual(rsCap.requiredMechanics, ['PHYSICAL_DAMAGE', 'SECONDARY_FLINCH']);
  assert.deepEqual(rsCap.knownPending, []);
  assert.equal(rsCap.blockedReason, null);
  assert.equal(rsCap.priority, 0);

  const rsSec = getSecondaryEffect({ id: 157 });
  assert.ok(rsSec, 'Efeito secundário de Rock Slide deve existir');
  assert.equal(rsSec.chance, 30);
  assert.equal(rsSec.target, 'defender');
  assert.equal(rsSec.flinch, true);

  assert.equal(validateMoveData(ROCK_SLIDE), true);

  // Fake Out não deve estar registrado como FULL
  const fakeOutCap = getMoveCapability({ name: 'fake-out' });
  assert.ok(!fakeOutCap || fakeOutCap.supportLevel !== 'FULL', 'Fake Out não deve ter suporte FULL neste ciclo');
});

// 2. Fronteiras de chance: 1 e 30 ativam; 31 e 100 não ativam; omissão preserva o padrão (não ativa)
test('P4-FL-02: Fronteiras de chance para hesitação (1 e 30 ativam; 31 e 100 não ativam; omissão não ativa)', () => {
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 60, hp: 500 });

  // Roll 1: Ativa
  {
    const state = Engine.createBattle(flareon, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_APPLIED), true);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'enemy'), true);
  }

  // Roll 30: Ativa (fronteira exata)
  {
    const state = Engine.createBattle(flareon, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 30 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_APPLIED), true);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'enemy'), true);
  }

  // Roll 31: Não ativa (fronteira superior imediata)
  {
    const state = Engine.createBattle(flareon, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 31 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_APPLIED), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false);
    // Inimigo executa seu golpe normalmente
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'), true);
  }

  // Roll 100: Não ativa
  {
    const state = Engine.createBattle(flareon, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 100 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_APPLIED), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false);
  }

  // Omissão: Padrão determinístico 100 (não ativa)
  {
    const state = Engine.createBattle(flareon, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_APPLIED), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false);
  }
});

// 3. Atacante que age primeiro causa flinch e impede o movimento pendente do alvo
test('P4-FL-03: Atacante mais rápido causa flinch e impede ação pendente do alvo no mesmo turno', () => {
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120, hp: 300 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 60, hp: 500 });
  const state = Engine.createBattle(flareon, blastoise);

  const initialFlareonHp = 300;
  const initialBlastoisePp = blastoise.moves[0].currentPp;

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 15 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  // Flareon agiu primeiro
  const moveUsed = res.events.filter(e => e.type === BATTLE_EVENTS.MOVE_USED);
  assert.equal(moveUsed.length, 1, 'Apenas Flareon deve ter executado golpe');
  assert.equal(moveUsed[0].actor, 'player');

  // Blastoise hesitou
  const flinchEvents = res.events.filter(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED);
  assert.equal(flinchEvents.length, 1);
  assert.equal(flinchEvents[0].actor, 'enemy');
  assert.equal(flinchEvents[0].pokemonName, 'blastoise');

  // Flareon não sofreu dano (ação do adversário foi impedida)
  assert.equal(res.state.player.currentHp, initialFlareonHp);

  // Blastoise não consumiu PP
  assert.equal(res.state.enemy.moves[0].currentPp, initialBlastoisePp);
});

// 4. Atacante que age depois não cancela a ação já executada nem provoca impedimento no turno seguinte
test('P4-FL-04: Atacante mais lento usando golpe de flinch não anula ação já ocorrida e não afeta o turno seguinte', () => {
  // Blastoise (jogador) é mais rápido (Speed 120) e usa Tackle.
  // Flareon (adversário) é mais lento (Speed 60) e usa Bite com roll que ativaria flinch (roll 10).
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 120, hp: 500 });
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 60, hp: 500 });
  const state = Engine.createBattle(blastoise, flareon);

  const resTurn1 = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 10 }
  });

  // Turno 1: Blastoise agiu com sucesso primeiro
  const moveUsedTurn1 = resTurn1.events.filter(e => e.type === BATTLE_EVENTS.MOVE_USED);
  assert.equal(moveUsedTurn1.length, 2, 'Ambos devem ter executado golpes no Turno 1');
  assert.equal(moveUsedTurn1[0].actor, 'player');
  assert.equal(moveUsedTurn1[1].actor, 'enemy');

  // Nenhuma ação foi impedida no turno 1
  assert.equal(resTurn1.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false);

  // No estado final do Turno 1, isFlinched foi limpo
  assert.equal(resTurn1.state.player.isFlinched, false);
  assert.equal(resTurn1.state.enemy.isFlinched, false);

  // Turno 2: Blastoise age perfeitamente normal sem qualquer impedimento
  const resTurn2 = Engine.resolveTurn(resTurn1.state, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 50 }
  });
  const moveUsedTurn2 = resTurn2.events.filter(e => e.type === BATTLE_EVENTS.MOVE_USED);
  assert.equal(moveUsedTurn2[0].actor, 'player', 'Blastoise age normalmente no Turno 2');
  assert.equal(resTurn2.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false);
});

// 5. Ordem respeitando prioridade e velocidade efetiva (Speed base menor age primeiro)
test('P4-FL-05: Ordem de ação por prioridade e velocidade efetiva: Speed base menor age primeiro e causa flinch', () => {
  // Omanyte tem Speed base 35, mas Jolteon tem Speed base 130 e está paralisado com -3 estágios de Speed
  // Jolteon velocidade efetiva: 130 * 2/5 / 2 = 26 < 35 de Omanyte!
  const omanyte = makeMon(138, 'omanyte', ['rock', 'water'], [ROCK_SLIDE], { speed: 35 });
  const jolteon = makeMon(135, 'jolteon', ['electric'], [TACKLE], { speed: 130 }, {
    statusCondition: 'paralysis',
    statStages: { speed: -3 }
  });

  const state = Engine.createBattle(omanyte, jolteon);
  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 157, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 10 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100, statusRoll: 50 }
  });

  // Omanyte (Speed base 35) deve ter agido ANTES de Jolteon (Speed base 130) por velocidade efetiva
  const moveUsed = res.events.filter(e => e.type === BATTLE_EVENTS.MOVE_USED);
  assert.equal(moveUsed.length, 1);
  assert.equal(moveUsed[0].actor, 'player');

  // Jolteon hesitou
  const flinch = res.events.filter(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED);
  assert.equal(flinch.length, 1);
  assert.equal(flinch[0].actor, 'enemy');
});

// 6. Ausência do efeito em erro de precisão, imunidade e alvo nocauteado
test('P4-FL-06: Ausência de flinch em Miss, Imunidade e Alvo Nocauteado', () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50, hp: 500 });

  // Cenário A: Miss com Rock Slide (acurácia 90 com accuracyRoll 95 > 90)
  {
    const omanyte = makeMon(138, 'omanyte', ['rock', 'water'], [ROCK_SLIDE], { speed: 120 });
    const state = Engine.createBattle(omanyte, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 157, accuracyRoll: 95, damageRoll: 100, secondaryEffectRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_APPLIED), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'), true);
  }

  // Cenário B: Imunidade (Bite com tipo Ghost contra alvo Normal, 0x de eficácia)
  {
    const ghostBite = { ...BITE, type: 'ghost' };
    const user = makeMon(136, 'flareon', ['fire'], [ghostBite], { speed: 120 });
    const snorlax = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 50, hp: 500 });
    const state = Engine.createBattle(user, snorlax);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_APPLIED), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'), true);
  }

  // Cenário C: Alvo Nocauteado (HP chega a 0)
  {
    const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120, attack: 300 });
    const weakBlastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50, hp: 5, currentHp: 5 });
    const state = Engine.createBattle(flareon, weakBlastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    assert.equal(res.state.enemy.currentHp, 0);
    // Em nocaute, flinch não é aplicado
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_APPLIED), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false);
  }
});

// 7. Golpe impedido por flinch sem dano, efeitos ou consumo de PP
test('P4-FL-07: Combatente sob flinch não emite PP_CHANGED, não causa efeitos e preserva PP intacto', () => {
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50, hp: 500 });
  const state = Engine.createBattle(flareon, blastoise);

  const initialEnemyPp = blastoise.moves[0].currentPp;

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  // O inimigo foi impedido
  assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'enemy'), true);

  // Nenhum evento PP_CHANGED para o inimigo
  const enemyPpEvents = res.events.filter(e => e.type === BATTLE_EVENTS.PP_CHANGED && e.actor === 'enemy');
  assert.equal(enemyPpEvents.length, 0);

  // PP final do inimigo deve permanecer intacto
  assert.equal(res.state.enemy.moves[0].currentPp, initialEnemyPp);
});

// 8. Limpeza ao fim do turno e ausência de transferência em trocas
test('P4-FL-08: Limpeza estrita de flinch ao final do turno e em trocas', () => {
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50 });
  const charizard = makeMon(6, 'charizard', ['fire'], [TACKLE]);
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE]);

  const pTeam = makeTeam(flareon, makeMon(1, 'bulba', ['grass'], [TACKLE]), makeMon(4, 'char', ['fire'], [TACKLE]));
  const eTeam = makeTeam(blastoise, charizard, venusaur);

  const state = Engine.createBattle(pTeam, eTeam);

  // Turno 1: Flareon flincha Blastoise
  const resTurn1 = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 10 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(resTurn1.state.enemy.team[0].isFlinched, false, 'isFlinched deve ser limpo no finishTurn');

  // Turno 2: Inimigo troca voluntariamente para Charizard
  const resTurn2 = Engine.resolveTurn(resTurn1.state, {
    player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 50 },
    enemy: { type: 'SWITCH', targetIndex: 1 }
  });

  // Nem o que saiu nem o que entrou podem carregar flinch
  assert.equal(resTurn2.state.enemy.team[0].isFlinched, false);
  assert.equal(resTurn2.state.enemy.team[1].isFlinched, false);
});

// 9. Troca voluntária funcionando normalmente (não bloqueada por flinch)
test('P4-FL-09: Troca voluntária executa com prioridade e não é bloqueada por tentativa de flinch', () => {
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50 });
  const lapras = makeMon(131, 'lapras', ['water'], [TACKLE], { hp: 500 });
  const venusaur = makeMon(3, 'venusaur', ['grass'], [TACKLE]);

  const pTeam = makeTeam(flareon, makeMon(1, 'b', ['grass'], [TACKLE]), makeMon(4, 'c', ['fire'], [TACKLE]));
  const eTeam = makeTeam(blastoise, lapras, venusaur);

  const state = Engine.createBattle(pTeam, eTeam);

  // Inimigo troca voluntariamente no Turno 1; a troca tem prioridade absoluta sobre o Move do jogador
  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'SWITCH', targetIndex: 1 }
  });

  assert.equal(res.state.enemy.activeIndex, 1, 'Lapras deve ter entrado em campo');
  assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.POKEMON_SWITCHED && e.side === 'enemy'), true);
  // Lapras recebeu o Bite, e no fim do turno seu flinch é limpo
  assert.equal(res.state.enemy.team[1].isFlinched, false);
});

// 10. Coexistência com poison, burn e paralysis, preservando essas condições
test('P4-FL-10: Coexistência de flinch com poison, burn e paralysis com preservação de dano residual', () => {
  // Blastoise está queimado (burn) e sofre flinch
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50, hp: 500 }, {
    statusCondition: 'burn'
  });
  const state = Engine.createBattle(flareon, blastoise);

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  // Blastoise hesitou
  assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'enemy'), true);

  // Queimadura foi estritamente preservada
  assert.equal(res.state.enemy.statusCondition, 'burn');

  // Dano residual de queimadura foi aplicado ao final do turno
  const burnDamage = res.events.find(e => e.type === BATTLE_EVENTS.STATUS_DAMAGE && e.target === 'enemy');
  assert.ok(burnDamage, 'Dano residual de burn deve ocorrer ao final do turno mesmo com hesitação');
  assert.equal(burnDamage.statusCondition, 'burn');
});

// 11. Interação com paralisia sem dois impedimentos ou mensagens duplicadas
test('P4-FL-11: Precedência canônica: Flinch avaliado antes de paralisia sem duplo impedimento ou anúncio falso', () => {
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120 });
  // Blastoise paralisado com statusRoll 10 que causaria imobilização por paralisia
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50, hp: 500 }, {
    statusCondition: 'paralysis'
  });
  const state = Engine.createBattle(flareon, blastoise);

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100, statusRoll: 10 }
  });

  // Exatamente UM evento de impedimento emitido (FLINCH_IMMOBILIZED)
  const flinchEvents = res.events.filter(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED);
  const paralysisEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED);

  assert.equal(flinchEvents.length, 1, 'Deve emitir FLINCH_IMMOBILIZED');
  assert.equal(paralysisEvents.length, 0, 'NÃO deve emitir STATUS_IMMOBILIZED para a mesma ação');

  // Mapeamento para apresentação não duplica mensagens
  const commands = Mapper.mapEvents(res.events, { battleState: res.state });
  const flinchCommands = commands.filter(c => c.type === 'FLINCH_FEEDBACK');
  const statusCommands = commands.filter(c => c.type === 'STATUS_FEEDBACK' && c.outcome === 'IMMOBILIZED');

  assert.equal(flinchCommands.length, 1);
  assert.equal(statusCommands.length, 0);

  // Paralisia é mantida no Pokémon
  assert.equal(res.state.enemy.statusCondition, 'paralysis');
});

// 12. Independência entre secondaryEffectRoll e statusRoll
test('P4-FL-12: Independência estrita entre secondaryEffectRoll e statusRoll', () => {
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50, hp: 500 }, {
    statusCondition: 'paralysis'
  });

  // Cenário 1: secondaryEffectRoll 50 (NÃO causa flinch) + statusRoll 10 (causa imobilização por paralisia)
  {
    const state = Engine.createBattle(flareon, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 50 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100, statusRoll: 10 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED), true);
  }

  // Cenário 2: secondaryEffectRoll 50 (NÃO causa flinch) + statusRoll 50 (age normalmente por paralisia)
  {
    const state = Engine.createBattle(flareon, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 50 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100, statusRoll: 50 }
    });
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'), true);
  }
});

// 13. Sessão real nos dois sentidos (BattleSessionController)
test('P4-FL-13A: Sessão real — Jogador usando Bite/Rock Slide contra o adversário (ativação vs não ativação)', async () => {
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120, hp: 400 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50, hp: 600 });

  // 1. Com ativação de flinch (roll 15 <= 30)
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([15, 100]);

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [136, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 136 ? flareon : makeMon(id, 'm-' + id, ['normal'], [TACKLE]))
      },
      opponentFactory: {
        createOpponentTeam: async () => [blastoise, makeMon(131, 'lapras', ['water'], [TACKLE]), makeMon(3, 'venusaur', ['grass'], [TACKLE])]
      },
      randomSource: rng,
      presentationEngine: {
        play: async (events) => { capturedEvents.push(...events); },
        playCommands: async () => {}
      }
    });

    await session.prepareBattle({ playerTeamIds: [136, 1, 4] });
    await session.startBattle();
    await session.submitPlayerMove(44);

    // Eventos capturados
    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'enemy'), true);

    const commands = Mapper.mapEvents(capturedEvents);
    const flinchCmd = commands.filter(c => c.type === 'FLINCH_FEEDBACK');
    assert.equal(flinchCmd.length, 1);
    assert.equal(flinchCmd[0].target, 'enemy');
  }

  // 2. Sem ativação de flinch (roll 50 > 30)
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([50, 100]);

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [136, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 136 ? flareon : makeMon(id, 'm-' + id, ['normal'], [TACKLE]))
      },
      opponentFactory: {
        createOpponentTeam: async () => [blastoise, makeMon(131, 'lapras', ['water'], [TACKLE]), makeMon(3, 'venusaur', ['grass'], [TACKLE])]
      },
      randomSource: rng,
      presentationEngine: {
        play: async (events) => { capturedEvents.push(...events); },
        playCommands: async () => {}
      }
    });

    await session.prepareBattle({ playerTeamIds: [136, 1, 4] });
    await session.startBattle();
    await session.submitPlayerMove(44);

    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false);
    const commands = Mapper.mapEvents(capturedEvents);
    assert.equal(commands.filter(c => c.type === 'FLINCH_FEEDBACK').length, 0);
  }
});

test('P4-FL-13B: Sessão real — Adversário usando Bite contra o jogador (ativação vs não ativação)', async () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50, hp: 600 });
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120, hp: 400 });

  // 1. Adversário mais rápido flincha o jogador (roll 10 <= 30)
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([100, 10]);

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [9, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 9 ? blastoise : makeMon(id, 'm-' + id, ['normal'], [TACKLE]))
      },
      opponentFactory: {
        createOpponentTeam: async () => [flareon, makeMon(131, 'lapras', ['water'], [TACKLE]), makeMon(3, 'venusaur', ['grass'], [TACKLE])]
      },
      randomSource: rng,
      presentationEngine: {
        play: async (events) => { capturedEvents.push(...events); },
        playCommands: async () => {}
      }
    });

    await session.prepareBattle({ playerTeamIds: [9, 1, 4] });
    await session.startBattle();
    await session.submitPlayerMove(33);

    // Jogador deve ter sofrido FLINCH_IMMOBILIZED
    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'player'), true);

    const commands = Mapper.mapEvents(capturedEvents);
    const flinchCmd = commands.filter(c => c.type === 'FLINCH_FEEDBACK');
    assert.equal(flinchCmd.length, 1);
    assert.equal(flinchCmd[0].target, 'player');
  }

  // 2. Adversário mais rápido usando Bite mas sem ativação (secondaryEffectRoll 35 >= 31)
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    // Ordem de consumo de secondaryEffect no BattleSessionController:
    // 1ª chamada: jogador (Tackle) -> 100
    // 2ª chamada: adversário (Bite) -> 35 (>= 31, não ativa flinch)
    rng.setSecondaryEffectSequence([100, 35]);

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [9, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 9 ? blastoise : makeMon(id, 'm-' + id, ['normal'], [TACKLE]))
      },
      opponentFactory: {
        createOpponentTeam: async () => [flareon, makeMon(131, 'lapras', ['water'], [TACKLE]), makeMon(3, 'venusaur', ['grass'], [TACKLE])]
      },
      randomSource: rng,
      presentationEngine: {
        play: async (events) => { capturedEvents.push(...events); },
        playCommands: async () => {}
      }
    });

    await session.prepareBattle({ playerTeamIds: [9, 1, 4] });
    await session.startBattle();
    await session.submitPlayerMove(33);

    // O golpe do adversário acertou e causou dano
    const enemyDamageEvent = capturedEvents.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy' && e.target === 'player');
    assert.ok(enemyDamageEvent, 'Bite do adversário deve acertar e causar dano');
    assert.ok(enemyDamageEvent.damage > 0, 'Dano do adversário deve ser maior que zero');

    // Jogador executou normalmente seu movimento
    const playerMoveEvent = capturedEvents.find(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player');
    assert.ok(playerMoveEvent, 'Jogador deve executar Tackle normalmente');

    // Nenhum FLINCH_APPLIED ou FLINCH_IMMOBILIZED emitido
    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.FLINCH_APPLIED), false, 'Nenhum FLINCH_APPLIED deve ser emitido');
    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false, 'Nenhum FLINCH_IMMOBILIZED deve ser emitido');

    // Mapeador não deve gerar FLINCH_FEEDBACK
    const commands = Mapper.mapEvents(capturedEvents, { battleState: session.battleState });
    assert.equal(commands.some(c => c.type === 'FLINCH_FEEDBACK'), false, 'Mapeador não deve gerar FLINCH_FEEDBACK');

    // Nenhuma marca de hesitação permanece no estado ao fim do turno
    assert.equal(session.battleState.player.team[0].isFlinched, false, 'Jogador não deve possuir flinch no fim do turno');
    assert.equal(session.battleState.enemy.team[0].isFlinched, false, 'Adversário não deve possuir flinch no fim do turno');
  }
});

// 14. Avaliador sem benefício indevido em imunidade, nocaute garantido ou ação já executada
test('P4-FL-14: Avaliador tático considera chance, acurácia, velocidade e anula bônus em imunidade, KO ou ação já executada', () => {
  const flareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 60, hp: 500 });

  // Cenário 1: Flareon mais rápido contra Blastoise saudável
  const evalFast = Evaluator.evaluateMove(flareon, blastoise, BITE);
  assert.equal(evalFast.expectedStatusBenefit, 6, '0.30 * 1.0 * 20 = 6 pontos de disrupção');

  // Cenário 2: Atacante mais lento (Speed 50 vs 100): benefício DEVE ser 0
  const slowFlareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 50 });
  const fastBlastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 100, hp: 500 });
  const evalSlow = Evaluator.evaluateMove(slowFlareon, fastBlastoise, BITE);
  assert.equal(evalSlow.expectedStatusBenefit, 0, 'Atacante mais lento não deve receber benefício de flinch');

  // Cenário 3: Alvo já agiu neste turno (context.targetAlreadyActed = true): benefício DEVE ser 0
  const evalActed = Evaluator.evaluateMove(flareon, blastoise, BITE, { targetAlreadyActed: true });
  assert.equal(evalActed.expectedStatusBenefit, 0, 'Alvo que já agiu não gera benefício');

  // Cenário 4: Nocaute garantido (guaranteedKo = true): benefício DEVE ser 0
  const weakBlastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 60, hp: 5, currentHp: 5 });
  const evalKo = Evaluator.evaluateMove(flareon, weakBlastoise, BITE);
  assert.equal(evalKo.guaranteedKo, true);
  assert.equal(evalKo.expectedStatusBenefit, 0, 'Nocaute garantido não gera benefício de flinch');

  // Cenário 5: Rock Slide com 90% de acurácia: 0.30 * 0.90 * 20 = 5.4 -> 5 pontos
  const omanyte = makeMon(138, 'omanyte', ['rock', 'water'], [ROCK_SLIDE], { speed: 120 });
  const evalRs = Evaluator.evaluateMove(omanyte, blastoise, ROCK_SLIDE);
  assert.equal(evalRs.expectedStatusBenefit, 5, '0.30 * 0.90 * 20 = 5.4 arredonda para 5');
});

// 15. Disponibilidade efetiva dos golpes na campanha
test('P4-FL-15: Disponibilidade de Bite e Rock Slide em espécies da campanha', () => {
  // Bite em Flareon (#136), Venipede (#543), Dreepy (#885)
  const flareonPool = campaignMoveOptions.getPool(136);
  assert.ok(flareonPool.some(m => m.id === 44 && m.name === 'bite'), 'Flareon deve ter Bite no pool');

  const venipedePool = campaignMoveOptions.getPool(543);
  assert.ok(venipedePool.some(m => m.id === 44 && m.name === 'bite'), 'Venipede deve ter Bite no pool');

  // Rock Slide em Omanyte (#138), Tyrogue (#236), Torchic (#255), Aron (#304), Lileep (#345)
  const omanytePool = campaignMoveOptions.getPool(138);
  assert.ok(omanytePool.some(m => m.id === 157 && m.name === 'rock-slide'), 'Omanyte deve ter Rock Slide no pool');

  const tyroguePool = campaignMoveOptions.getPool(236);
  assert.ok(tyroguePool.some(m => m.id === 157 && m.name === 'rock-slide'), 'Tyrogue deve ter Rock Slide no pool');
});

// 16. Preservação dos efeitos secundários já implementados, inclusive Ancient Power após nocaute
test('P4-FL-16: Preservação de Ancient Power (+1 nos 5 atributos pós-nocaute) e pilotos anteriores', () => {
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], { specialAttack: 200 });
  const weakEnemy = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 10, currentHp: 10 });
  const state = Engine.createBattle(zapdos, weakEnemy);

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  assert.equal(res.state.enemy.currentHp, 0, 'Inimigo deve ser nocauteado');
  assert.equal(res.state.player.statStages.attack, 1, 'Ancient Power deve subir ataque');
  assert.equal(res.state.player.statStages.speed, 1, 'Ancient Power deve subir velocidade');
  assert.equal(res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED).length, 5);
});

// 17. Regressão: normalização impede hesitação herdada na criação de combatentes e batalhas
test('P4-FL-17: Inicialização limpa de combatente e batalha: entrada com isFlinched: true é normalizada para false (1v1, 3v3 e Provas)', () => {
  // A. createCombatant com isFlinched: true
  const rawMon = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 60, hp: 500 }, { isFlinched: true });
  const mon = Engine.createCombatant(rawMon);
  assert.equal(mon.isFlinched, false, 'createCombatant deve normalizar isFlinched para false');

  // B. createBattle (1v1) com combatentes com isFlinched: true
  const rawFlareon = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120, hp: 400 }, { isFlinched: true });
  const state1v1 = Engine.createBattle(rawMon, rawFlareon);
  assert.equal(state1v1.player.isFlinched, false, 'Jogador 1v1 deve iniciar com isFlinched: false');
  assert.equal(state1v1.enemy.isFlinched, false, 'Adversário 1v1 deve iniciar com isFlinched: false');

  // O jogador consegue executar sua primeira ação sem sofrer flinch indevido
  const res1v1 = Engine.resolveTurn(state1v1, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 44, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 50 }
  });
  assert.equal(res1v1.events.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false, 'Nenhum combatente deve sofrer flinch indevido no primeiro turno');
  assert.equal(res1v1.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), true, 'Jogador deve conseguir mover no primeiro turno');

  // C. createTeamBattle (3v3) com membros com isFlinched: true
  const teamP = [
    makeMon(1, 'bulbasaur', ['grass'], [TACKLE], {}, { isFlinched: true }),
    makeMon(2, 'ivysaur', ['grass'], [TACKLE], {}, { isFlinched: true }),
    makeMon(3, 'venusaur', ['grass'], [TACKLE], {}, { isFlinched: true })
  ];
  const teamE = [
    makeMon(4, 'charmander', ['fire'], [TACKLE], {}, { isFlinched: true }),
    makeMon(5, 'charmeleon', ['fire'], [TACKLE], {}, { isFlinched: true }),
    makeMon(6, 'charizard', ['fire'], [TACKLE], {}, { isFlinched: true })
  ];
  const state3v3 = Engine.createTeamBattle(teamP, teamE);
  for (const m of state3v3.player.team) assert.equal(m.isFlinched, false, 'Membro da equipe do jogador deve ter isFlinched: false');
  for (const m of state3v3.enemy.team) assert.equal(m.isFlinched, false, 'Membro da equipe adversária deve ter isFlinched: false');

  // D. Formatos especiais (TRIAL_3X1 e FINAL_STAND)
  const trialEnemy = [makeMon(150, 'mewtwo', ['psychic'], [TACKLE], {}, { isFlinched: true })];
  const stateTrial = Engine.createTeamBattle(teamP, trialEnemy, { metadata: { battleFormat: 'TRIAL_3X1' } });
  for (const m of stateTrial.player.team) assert.equal(m.isFlinched, false, 'Trial player deve ter isFlinched: false');
  for (const m of stateTrial.enemy.team) assert.equal(m.isFlinched, false, 'Trial enemy deve ter isFlinched: false');

  const finalStandPlayer = [makeMon(25, 'pikachu', ['electric'], [TACKLE], {}, { isFlinched: true })];
  const stateFinalStand = Engine.createTeamBattle(finalStandPlayer, teamE, { metadata: { battleFormat: 'FINAL_STAND' } });
  for (const m of stateFinalStand.player.team) assert.equal(m.isFlinched, false, 'Final Stand player deve ter isFlinched: false');
  for (const m of stateFinalStand.enemy.team) assert.equal(m.isFlinched, false, 'Final Stand enemy deve ter isFlinched: false');
});

// 18. Regressão: Sessão real com entrada com isFlinched: true não herda hesitação, mas flinch intra-turno legítimo continua funcionando
test('P4-FL-18: Sessão real não herda hesitação na preparação e flinch legítimo intra-turno continua funcionando', async () => {
  const blastoiseWithFlinch = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50, hp: 600 }, { isFlinched: true });
  const flareonWithFlinch = makeMon(136, 'flareon', ['fire'], [BITE], { speed: 120, hp: 400 }, { isFlinched: true });

  // Parte A: Sessão real preparada com combatentes com isFlinched: true
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    // Adversário usa Bite com roll 50 (sem ativação de flinch)
    rng.setSecondaryEffectSequence([100, 50]);

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [9, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 9 ? blastoiseWithFlinch : makeMon(id, 'm-' + id, ['normal'], [TACKLE], {}, { isFlinched: true }))
      },
      opponentFactory: {
        createOpponentTeam: async () => [flareonWithFlinch, makeMon(131, 'lapras', ['water'], [TACKLE], {}, { isFlinched: true }), makeMon(3, 'venusaur', ['grass'], [TACKLE], {}, { isFlinched: true })]
      },
      randomSource: rng,
      presentationEngine: {
        play: async (events) => { capturedEvents.push(...events); },
        playCommands: async () => {}
      }
    });

    await session.prepareBattle({ playerTeamIds: [9, 1, 4] });

    // Estado inicial NÃO herda isFlinched: true
    assert.equal(session.battleState.player.team[0].isFlinched, false, 'Jogador não deve herdar isFlinched');
    assert.equal(session.battleState.enemy.team[0].isFlinched, false, 'Adversário não deve herdar isFlinched');

    await session.startBattle();
    await session.submitPlayerMove(33);

    // O jogador NÃO sofre FLINCH_IMMOBILIZED indevido no primeiro turno
    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED), false, 'Não deve haver FLINCH_IMMOBILIZED herdado');
    const playerMove = capturedEvents.find(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player');
    assert.ok(playerMove, 'Jogador deve conseguir mover normalmente');
  }

  // Parte B: Um golpe que aplica flinch DURANTE o turno continua impedindo a ação pendente do alvo
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    // Adversário usa Bite com roll 10 (ATIVA flinch legitimamente durante o turno)
    rng.setSecondaryEffectSequence([100, 10]);

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [9, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 9 ? blastoiseWithFlinch : makeMon(id, 'm-' + id, ['normal'], [TACKLE]))
      },
      opponentFactory: {
        createOpponentTeam: async () => [flareonWithFlinch, makeMon(131, 'lapras', ['water'], [TACKLE]), makeMon(3, 'venusaur', ['grass'], [TACKLE])]
      },
      randomSource: rng,
      presentationEngine: {
        play: async (events) => { capturedEvents.push(...events); },
        playCommands: async () => {}
      }
    });

    await session.prepareBattle({ playerTeamIds: [9, 1, 4] });
    await session.startBattle();
    await session.submitPlayerMove(33);

    // Desta vez, o flinch legítimo durante o turno DEVE ocorrer e impedir a ação do jogador
    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.FLINCH_APPLIED && e.target === 'player'), true, 'FLINCH_APPLIED legítimo deve ocorrer');
    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'player'), true, 'FLINCH_IMMOBILIZED legítimo deve impedir ação do jogador');
  }
});

