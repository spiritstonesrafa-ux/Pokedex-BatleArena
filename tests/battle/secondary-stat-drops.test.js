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
  applyStatStageChange
} = require('../../assets/js/battle/battle-constants.js');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source.js');
const campaignMoveOptions = require('../../assets/js/campaign/campaign-move-options.js');
const campaignFixedCatalog = require('../../assets/js/campaign/campaign-fixed-battle-catalog.js');

const TACKLE = KNOWN_CATALOG_MOVES[33];
const PSYCHIC = KNOWN_CATALOG_MOVES[94];
const CRUNCH = KNOWN_CATALOG_MOVES[242];
const SHADOW_BALL = KNOWN_CATALOG_MOVES[247];
const DRAGON_TAIL = KNOWN_CATALOG_MOVES[525];

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

function makeAction(moveId, options = {}) {
  return {
    type: 'MOVE',
    moveId,
    accuracyRoll: 1, // acerta por padrão
    damageRoll: 100, // variância máxima por padrão
    statusRoll: 100, // sem impedimento de paralisia por padrão
    ...options
  };
}

test('P4-SD-01: Definições canônicas e validação cadastral de Shadow Ball, Psychic e Crunch', () => {
  // Shadow Ball (ID 247)
  assert.equal(SHADOW_BALL.id, 247);
  assert.equal(SHADOW_BALL.name, 'shadow-ball');
  assert.equal(SHADOW_BALL.type, 'ghost');
  assert.equal(SHADOW_BALL.power, 80);
  assert.equal(SHADOW_BALL.accuracy, 100);
  assert.equal(SHADOW_BALL.pp, 15);
  assert.equal(SHADOW_BALL.damageClass, 'special');
  const sbSec = getSecondaryEffect(SHADOW_BALL);
  assert.ok(sbSec, 'Shadow Ball deve possuir efeito secundário registrado');
  assert.deepEqual(sbSec.statDrops, { specialDefense: -1 });
  assert.equal(sbSec.chance, 20);
  assert.equal(sbSec.target, 'defender');

  // Psychic (ID 94)
  assert.equal(PSYCHIC.id, 94);
  assert.equal(PSYCHIC.name, 'psychic');
  assert.equal(PSYCHIC.type, 'psychic');
  assert.equal(PSYCHIC.power, 90);
  assert.equal(PSYCHIC.accuracy, 100);
  assert.equal(PSYCHIC.pp, 10);
  assert.equal(PSYCHIC.damageClass, 'special');
  const psySec = getSecondaryEffect(PSYCHIC);
  assert.ok(psySec, 'Psychic deve possuir efeito secundário registrado');
  assert.deepEqual(psySec.statDrops, { specialDefense: -1 });
  assert.equal(psySec.chance, 10);
  assert.equal(psySec.target, 'defender');

  // Crunch (ID 242)
  assert.equal(CRUNCH.id, 242);
  assert.equal(CRUNCH.name, 'crunch');
  assert.equal(CRUNCH.type, 'dark');
  assert.equal(CRUNCH.power, 80);
  assert.equal(CRUNCH.accuracy, 100);
  assert.equal(CRUNCH.pp, 15);
  assert.equal(CRUNCH.damageClass, 'physical');
  const crSec = getSecondaryEffect(CRUNCH);
  assert.ok(crSec, 'Crunch deve possuir efeito secundário registrado');
  assert.deepEqual(crSec.statDrops, { defense: -1 });
  assert.equal(crSec.chance, 20);
  assert.equal(crSec.target, 'defender');

  // getMoveCapability deve classificar os três como FULL sem pendências
  for (const move of [SHADOW_BALL, PSYCHIC, CRUNCH]) {
    const cap = getMoveCapability(move.id);
    assert.ok(cap, `getMoveCapability deve retornar capacidade para ${move.name}`);
    assert.equal(cap.supportLevel, 'FULL', `${move.name} deve ter suporte FULL`);
    assert.deepEqual(cap.knownPending, [], `${move.name} não deve possuir pendências conhecidas`);
    assert.equal(cap.blockedReason, null);
    assert.ok(cap.requiredMechanics.includes('SECONDARY_STAT_DROP'));
    assert.ok(validateMoveData(move), `validateMoveData deve aceitar ${move.name}`);
  }
});

test('P4-SD-02: Limites rigorosos das chances de ativação (boundary tests)', () => {
  const attacker = makeMon(94, 'gengar', ['ghost', 'poison'], [SHADOW_BALL, PSYCHIC, CRUNCH], { speed: 120 });
  const defender = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 60, hp: 400 });

  // Shadow Ball (20%): rolls 1 e 20 ativam; rolls 21 e 100 NÃO ativam
  for (const roll of [1, 20]) {
    const battle = Engine.createBattle(attacker, defender);
    const res = Engine.resolveTurn(battle, {
      player: makeAction(247, { secondaryEffectRoll: roll }),
      enemy: makeAction(33)
    });
    assert.equal(res.state.enemy.statStages.specialDefense, -1, `Shadow Ball com roll ${roll} deve reduzir SpDef`);
    const statEv = res.events.find(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.ok(statEv, `STAT_STAGE_CHANGED deve ser emitido com roll ${roll}`);
    assert.equal(statEv.statKey, 'specialDefense');
    assert.equal(statEv.appliedDelta, -1);
  }

  for (const roll of [21, 100]) {
    const battle = Engine.createBattle(attacker, defender);
    const res = Engine.resolveTurn(battle, {
      player: makeAction(247, { secondaryEffectRoll: roll }),
      enemy: makeAction(33)
    });
    assert.equal(res.state.enemy.statStages.specialDefense, 0, `Shadow Ball com roll ${roll} NÃO deve reduzir SpDef`);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED), false);
  }

  // Crunch (20%): rolls 1 e 20 ativam; rolls 21 e 100 NÃO ativam
  for (const roll of [1, 20]) {
    const battle = Engine.createBattle(attacker, defender);
    const res = Engine.resolveTurn(battle, {
      player: makeAction(242, { secondaryEffectRoll: roll }),
      enemy: makeAction(33)
    });
    assert.equal(res.state.enemy.statStages.defense, -1, `Crunch com roll ${roll} deve reduzir Defesa`);
    const statEv = res.events.find(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.ok(statEv);
    assert.equal(statEv.statKey, 'defense');
  }

  for (const roll of [21, 100]) {
    const battle = Engine.createBattle(attacker, defender);
    const res = Engine.resolveTurn(battle, {
      player: makeAction(242, { secondaryEffectRoll: roll }),
      enemy: makeAction(33)
    });
    assert.equal(res.state.enemy.statStages.defense, 0, `Crunch com roll ${roll} NÃO deve reduzir Defesa`);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED), false);
  }

  // Psychic (10%): rolls 1 e 10 ativam; rolls 11 e 100 NÃO ativam
  for (const roll of [1, 10]) {
    const battle = Engine.createBattle(attacker, defender);
    const res = Engine.resolveTurn(battle, {
      player: makeAction(94, { secondaryEffectRoll: roll }),
      enemy: makeAction(33)
    });
    assert.equal(res.state.enemy.statStages.specialDefense, -1, `Psychic com roll ${roll} deve reduzir SpDef`);
    const statEv = res.events.find(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.ok(statEv);
    assert.equal(statEv.statKey, 'specialDefense');
  }

  for (const roll of [11, 100]) {
    const battle = Engine.createBattle(attacker, defender);
    const res = Engine.resolveTurn(battle, {
      player: makeAction(94, { secondaryEffectRoll: roll }),
      enemy: makeAction(33)
    });
    assert.equal(res.state.enemy.statStages.specialDefense, 0, `Psychic com roll ${roll} NÃO deve reduzir SpDef`);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED), false);
  }

  // Omissão de secondaryEffectRoll: usa padrão defensivo 100 (inativo)
  const battleDefault = Engine.createBattle(attacker, defender);
  const resDefault = Engine.resolveTurn(battleDefault, {
    player: { type: 'MOVE', moveId: 247, accuracyRoll: 1, damageRoll: 100 },
    enemy: makeAction(33)
  });
  assert.equal(resDefault.state.enemy.statStages.specialDefense, 0);
  assert.equal(resDefault.events.some(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED), false);
});

test('P4-SD-03: Redução dos atributos corretos e integridade do evento STAT_STAGE_CHANGED', () => {
  const alakazam = makeMon(65, 'alakazam', ['psychic'], [PSYCHIC], { speed: 120 });
  const arcanine = makeMon(59, 'arcanine', ['fire'], [CRUNCH], { speed: 110 });
  const snorlax = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 30, hp: 500 });

  // 1. Psychic reduz specialDefense
  const b1 = Engine.createBattle(alakazam, snorlax);
  const r1 = Engine.resolveTurn(b1, {
    player: makeAction(94, { secondaryEffectRoll: 5 }),
    enemy: makeAction(33)
  });
  assert.equal(r1.state.enemy.statStages.specialDefense, -1);
  assert.equal(r1.state.enemy.statStages.defense, 0);
  const ev1 = r1.events.find(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
  assert.deepEqual(ev1, {
    type: BATTLE_EVENTS.STAT_STAGE_CHANGED,
    combatant: 'enemy',
    pokemonName: 'snorlax',
    statKey: 'specialDefense',
    previousStage: 0,
    requestedDelta: -1,
    appliedDelta: -1,
    finalStage: -1,
    blockedReason: null
  });

  // 2. Crunch reduz defense
  const b2 = Engine.createBattle(arcanine, snorlax);
  const r2 = Engine.resolveTurn(b2, {
    player: makeAction(242, { secondaryEffectRoll: 5 }),
    enemy: makeAction(33)
  });
  assert.equal(r2.state.enemy.statStages.defense, -1);
  assert.equal(r2.state.enemy.statStages.specialDefense, 0);
  const ev2 = r2.events.find(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
  assert.deepEqual(ev2, {
    type: BATTLE_EVENTS.STAT_STAGE_CHANGED,
    combatant: 'enemy',
    pokemonName: 'snorlax',
    statKey: 'defense',
    previousStage: 0,
    requestedDelta: -1,
    appliedDelta: -1,
    finalStage: -1,
    blockedReason: null
  });

  // 3. Aplicação do inimigo contra o jogador afeta o jogador corretamente
  const b3 = Engine.createBattle(snorlax, alakazam);
  const r3 = Engine.resolveTurn(b3, {
    player: makeAction(33),
    enemy: makeAction(94, { secondaryEffectRoll: 5 })
  });
  assert.equal(r3.state.player.statStages.specialDefense, -1);
  const ev3 = r3.events.find(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
  assert.equal(ev3.combatant, 'player');
  assert.equal(ev3.pokemonName, 'snorlax');
  assert.equal(ev3.statKey, 'specialDefense');
});

test('P4-SD-04: Limite estrito de -6 (Boundary clamping, blockedReason e feedback)', () => {
  const gengar = makeMon(94, 'gengar', ['ghost'], [SHADOW_BALL], { speed: 120 });
  const defenderAtMin = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 40, hp: 500 }, {
    statStages: { specialDefense: -6 }
  });

  const battle = Engine.createBattle(gengar, defenderAtMin);
  const res = Engine.resolveTurn(battle, {
    player: makeAction(247, { secondaryEffectRoll: 5 }), // ativa o efeito secundário
    enemy: makeAction(33)
  });

  // Estágio permanece estritamente em -6
  assert.equal(res.state.enemy.statStages.specialDefense, -6);

  // Evento emitido com blockedReason AT_MIN e appliedDelta 0
  const statEv = res.events.find(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
  assert.ok(statEv, 'Evento STAT_STAGE_CHANGED deve ser emitido informando bloqueio');
  assert.equal(statEv.statKey, 'specialDefense');
  assert.equal(statEv.previousStage, -6);
  assert.equal(statEv.requestedDelta, -1);
  assert.equal(statEv.appliedDelta, 0);
  assert.equal(statEv.finalStage, -6);
  assert.equal(statEv.blockedReason, 'AT_MIN');

  // Mapeador e UI Adapter devem emitir mensagem de limite sem falsa queda
  const commands = Mapper.mapEvents(res.events);
  const feedbackCmd = commands.find(c => c.type === 'STAT_STAGE_FEEDBACK');
  assert.ok(feedbackCmd);
  assert.equal(feedbackCmd.blockedReason, 'AT_MIN');

  const displayedMessages = [];
  const fakeView = {
    displayMessage: (msg) => displayedMessages.push(msg),
    updateStatStages: () => {}
  };
  const adapter = new BattleUiDomAdapter({ view: fakeView });
  adapter.execute(feedbackCmd);

  assert.ok(
    displayedMessages.some(m => m.includes('não pode cair mais!')),
    'Adapter deve exibir mensagem de limite atingido'
  );
  assert.equal(
    displayedMessages.some(m => m.includes('caiu!')),
    false,
    'Não deve anunciar que o atributo caiu quando bloqueado no limite'
  );
});

test('P4-SD-05: Golpe que erra (Miss) NÃO aciona redução de atributo', () => {
  // Configura golpe com precisão 80 para permitir teste determinístico de erro (accuracyRoll 90 > 80)
  const inaccurateShadowBall = { ...SHADOW_BALL, accuracy: 80 };
  const gengar = makeMon(94, 'gengar', ['ghost'], [inaccurateShadowBall], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 40, hp: 200 });

  const battle = Engine.createBattle(gengar, blastoise);
  const res = Engine.resolveTurn(battle, {
    player: makeAction(247, { accuracyRoll: 90, secondaryEffectRoll: 1 }),
    enemy: makeAction(33, { accuracyRoll: 1 })
  });

  // O jogador errou o golpe
  assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_MISSED && e.actor === 'player'), true);
  // O defensor não sofreu redução de atributo
  assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED), false);
  assert.equal(res.state.enemy.statStages.specialDefense, 0);
});

test('P4-SD-06: Alvo nocauteado (Target KO) NÃO sofre redução de atributo', () => {
  const gengar = makeMon(94, 'gengar', ['ghost'], [SHADOW_BALL], { speed: 120, specialAttack: 200 });
  const fragileMon = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 40, hp: 10 }); // Apenas 10 HP

  const battle = Engine.createBattle(gengar, fragileMon);
  const res = Engine.resolveTurn(battle, {
    player: makeAction(247, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });

  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.POKEMON_FAINTED), true);
  // Alvo nocauteado não recebe alteração de atributo
  assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED), false);
});

test('P4-SD-07: Imunidade elemental anula dano e impede redução de atributos', () => {
  // Shadow Ball (Ghost) contra Snorlax (Normal) => multiplicador 0
  const gengar = makeMon(94, 'gengar', ['ghost'], [SHADOW_BALL], { speed: 120 });
  const snorlax = makeMon(143, 'snorlax', ['normal'], [TACKLE], { speed: 30, hp: 200 });

  const bGhost = Engine.createBattle(gengar, snorlax);
  const rGhost = Engine.resolveTurn(bGhost, {
    player: makeAction(247, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });

  const effGhost = rGhost.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED);
  assert.equal(effGhost.multiplier, 0);
  assert.equal(rGhost.state.enemy.statStages.specialDefense, 0);
  assert.equal(rGhost.events.some(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED), false);

  // Psychic (Psychic) contra Umbreon (Dark) => multiplicador 0
  const alakazam = makeMon(65, 'alakazam', ['psychic'], [PSYCHIC], { speed: 120 });
  const umbreon = makeMon(197, 'umbreon', ['dark'], [TACKLE], { speed: 65, hp: 200 });

  const bPsychic = Engine.createBattle(alakazam, umbreon);
  const rPsychic = Engine.resolveTurn(bPsychic, {
    player: makeAction(94, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });

  const effPsychic = rPsychic.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED);
  assert.equal(effPsychic.multiplier, 0);
  assert.equal(rPsychic.state.enemy.statStages.specialDefense, 0);
  assert.equal(rPsychic.events.some(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED), false);
});

test('P4-SD-08: Independência de status: redução ocorre mesmo se o alvo estiver envenenado, queimado ou paralisado', () => {
  const gengar = makeMon(94, 'gengar', ['ghost'], [SHADOW_BALL, CRUNCH], { speed: 120 });

  for (const condition of ['poison', 'burn', 'paralysis']) {
    const defenderWithStatus = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 40, hp: 400 }, {
      statusCondition: condition
    });

    // Shadow Ball contra alvo com status
    const b1 = Engine.createBattle(gengar, defenderWithStatus);
    const r1 = Engine.resolveTurn(b1, {
      player: makeAction(247, { secondaryEffectRoll: 5 }),
      enemy: makeAction(33)
    });

    assert.equal(r1.state.enemy.statusCondition, condition, `Status ${condition} deve ser preservado`);
    assert.equal(r1.state.enemy.statStages.specialDefense, -1, `SpDef deve cair para -1 com status ${condition}`);
    assert.ok(r1.events.some(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED));

    // Crunch contra alvo com status
    const b2 = Engine.createBattle(gengar, defenderWithStatus);
    const r2 = Engine.resolveTurn(b2, {
      player: makeAction(242, { secondaryEffectRoll: 5 }),
      enemy: makeAction(33)
    });

    assert.equal(r2.state.enemy.statusCondition, condition);
    assert.equal(r2.state.enemy.statStages.defense, -1, `Defesa deve cair para -1 com status ${condition}`);
    assert.ok(r2.events.some(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED));
  }
});

test('P4-SD-09: Independência das rolagens determinísticas (Acurácia, Dano e Efeito Secundário)', () => {
  const gengar = makeMon(94, 'gengar', ['ghost'], [SHADOW_BALL], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 40, hp: 400 });

  // Caso A: Dano mínimo (damageRoll 85), acerta (accuracyRoll 90 <= 100), ativa efeito (secondaryEffectRoll 20)
  const bA = Engine.createBattle(gengar, blastoise);
  const rA = Engine.resolveTurn(bA, {
    player: makeAction(247, { accuracyRoll: 90, damageRoll: 85, secondaryEffectRoll: 20 }),
    enemy: makeAction(33)
  });
  assert.equal(rA.state.enemy.statStages.specialDefense, -1);
  const dmgA = rA.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED).damage;

  // Caso B: Dano máximo (damageRoll 100), acerta (accuracyRoll 10), NÃO ativa efeito (secondaryEffectRoll 21)
  const bB = Engine.createBattle(gengar, blastoise);
  const rB = Engine.resolveTurn(bB, {
    player: makeAction(247, { accuracyRoll: 10, damageRoll: 100, secondaryEffectRoll: 21 }),
    enemy: makeAction(33)
  });
  assert.equal(rB.state.enemy.statStages.specialDefense, 0);
  const dmgB = rB.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED).damage;

  assert.ok(dmgB > dmgA, 'Rolagem de dano 100 deve produzir mais dano que 85 independentemente do roll de efeito');
});

test('P4-SD-10: Impacto subsequente: queda de estatística aumenta o dano de golpes futuros', () => {
  const gengar = makeMon(94, 'gengar', ['ghost'], [SHADOW_BALL], { speed: 120, specialAttack: 100 });
  const lapras = makeMon(131, 'lapras', ['water'], [TACKLE], { speed: 40, specialDefense: 100, hp: 500 });

  // Turno 1: Sem queda prévia (estágio 0), aplica -1 de SpDef no final
  const battle = Engine.createBattle(gengar, lapras);
  const t1 = Engine.resolveTurn(battle, {
    player: makeAction(247, { damageRoll: 100, secondaryEffectRoll: 5 }),
    enemy: makeAction(33)
  });
  const dmgTurn1 = t1.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED).damage;
  assert.equal(t1.state.enemy.statStages.specialDefense, -1);

  // Turno 2: Executado com o defensor já em estágio -1 de SpDef
  const t2 = Engine.resolveTurn(t1.state, {
    player: makeAction(247, { damageRoll: 100, secondaryEffectRoll: 100 }), // sem novo drop
    enemy: makeAction(33)
  });
  const dmgTurn2 = t2.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED).damage;

  // Em estágio -1, a defesa especial efetiva é 100 * (2 / (2 - (-1))) = 100 * 2/3 = 66
  // Portanto o dano do turno 2 deve ser estritamente maior que o do turno 1
  assert.ok(
    dmgTurn2 > dmgTurn1,
    `Dano com SpDef em -1 (${dmgTurn2}) deve ser estritamente maior que dano inicial (${dmgTurn1})`
  );
});

test('P4-SD-11A: Reset de atributos na troca voluntária', () => {
  const gengar = makeMon(94, 'gengar', ['ghost'], [SHADOW_BALL], { speed: 120 });
  const p2 = makeMon(1, 'bulbasaur', ['grass'], [TACKLE]);
  const p3 = makeMon(4, 'charmander', ['fire'], [TACKLE]);

  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 40, hp: 400 });
  const vaporeon = makeMon(134, 'vaporeon', ['water'], [TACKLE], { speed: 40, hp: 400 });
  const lapras = makeMon(131, 'lapras', ['water'], [TACKLE], { speed: 40, hp: 400 });

  // 1. Cria batalha em equipe 3x3 e aplica -1 de SpDef em blastoise
  const battle = Engine.createTeamBattle([gengar, p2, p3], [blastoise, vaporeon, lapras]);
  const res1 = Engine.resolveTurn(battle, {
    player: makeAction(247, { secondaryEffectRoll: 5 }),
    enemy: makeAction(33)
  });
  assert.equal(res1.state.enemy.team[0].statStages.specialDefense, -1);

  // 2. Inimigo realiza troca voluntária para vaporeon (índice 1)
  const res2 = Engine.resolveTurn(res1.state, {
    player: makeAction(247, { secondaryEffectRoll: 100 }),
    enemy: { type: 'SWITCH', targetIndex: 1 }
  });

  // O blastoise recolhido ao banco teve seus estágios zerados
  assert.equal(res2.state.enemy.team[0].statStages.specialDefense, 0, 'Combatente recolhido deve resetar estágios');
  // O adversário ativo agora é o vaporeon
  assert.equal(res2.state.enemy.activeIndex, 1);
});

test('P4-SD-11B: Reset de atributos na troca forçada (Forced Switch via Dragon Tail após redução secundária)', () => {
  const gengar = makeMon(94, 'gengar', ['ghost'], [SHADOW_BALL, DRAGON_TAIL], { speed: 120 });
  const p2 = makeMon(1, 'bulbasaur', ['grass'], [TACKLE]);
  const p3 = makeMon(4, 'charmander', ['fire'], [TACKLE]);

  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 40, hp: 400 });
  const vaporeon = makeMon(134, 'vaporeon', ['water'], [TACKLE], { speed: 40, hp: 400 });
  const lapras = makeMon(131, 'lapras', ['water'], [TACKLE], { speed: 40, hp: 400 });

  const battle = Engine.createTeamBattle([gengar, p2, p3], [blastoise, vaporeon, lapras]);

  // Turno 1: Aplica redução de Special Defense com Shadow Ball (roll 5 <= 20)
  const res1 = Engine.resolveTurn(battle, {
    player: makeAction(247, { secondaryEffectRoll: 5 }),
    enemy: makeAction(33)
  });
  assert.equal(res1.state.enemy.team[0].statStages.specialDefense, -1, 'Blastoise deve ter SpDef em -1');

  // Turno 2: Jogador usa Dragon Tail (ID 525, prioridade -6, troca forçada)
  const res2 = Engine.resolveTurn(res1.state, {
    player: makeAction(525, { accuracyRoll: 1, damageRoll: 100 }),
    enemy: makeAction(33)
  });

  // Confirma emissão do evento real de troca forçada
  const switchEv = res2.events.find(e => e.type === BATTLE_EVENTS.POKEMON_SWITCHED);
  assert.ok(switchEv, 'Deve emitir evento POKEMON_SWITCHED');
  assert.equal(switchEv.side, 'enemy');
  assert.equal(switchEv.previousPokemonId, 9);
  assert.equal(switchEv.newPokemonId, 134);
  assert.equal(switchEv.reason, 'FORCED');

  // Confirma mudança do combatente ativo no estado
  assert.equal(res2.state.enemy.activeIndex, 1, 'Novo ativo deve ser vaporeon (índice 1)');

  // Confirma reset dos estágios do combatente retirado
  assert.equal(res2.state.enemy.team[0].statStages.specialDefense, 0, 'Blastoise retirado deve ter SpDef resetado para 0');

  // Confirma integridade dos estágios do substituto
  assert.deepEqual(res2.state.enemy.team[1].statStages, {
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0
  }, 'Substituto que entrou deve manter estágios zerados');
});

test('P4-SD-12: Avaliador Tático e IA calculam bônus ponderado e respeitam imunidade/limites', () => {
  const gengar = makeMon(94, 'gengar', ['ghost'], [SHADOW_BALL], { speed: 120, specialAttack: 100 });
  const defenderNormal = makeMon(143, 'snorlax', ['normal'], [TACKLE], { hp: 500 });
  const defenderWater = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 500 });
  const defenderAtMin = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 500 }, {
    statStages: { specialDefense: -6 }
  });

  // Caso 1: Alvo normal vulnerável a dano e elegível a drop
  const evalNormal = Evaluator.evaluateMove(gengar, defenderWater, SHADOW_BALL);
  assert.equal(evalNormal.isEligibleForSecondary, true);
  assert.equal(evalNormal.statusChance, 0.20);
  assert.ok(evalNormal.expectedStatusBenefit > 0, 'Deve conceder benefício tático positivo');

  // Caso 2: Alvo imune (Normal contra Ghost)
  const evalImmune = Evaluator.evaluateMove(gengar, defenderNormal, SHADOW_BALL);
  assert.equal(evalImmune.isEligibleForSecondary, false);
  assert.equal(evalImmune.expectedStatusBenefit, 0);

  // Caso 3: Alvo já em -6
  const evalAtMin = Evaluator.evaluateMove(gengar, defenderAtMin, SHADOW_BALL);
  assert.equal(evalAtMin.isEligibleForSecondary, false);
  assert.equal(evalAtMin.expectedStatusBenefit, 0);

  // Caso 4: Alvo em faixa de nocaute garantido (guaranteedKo)
  const fragileMon = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 5 });
  const evalKo = Evaluator.evaluateMove(gengar, fragileMon, SHADOW_BALL);
  assert.equal(evalKo.guaranteedKo, true);
  assert.equal(evalKo.expectedStatusBenefit, 0, 'Não deve atribuir benefício de drop quando nocaute é garantido');

  // Caso 5: IA escolhe ação sem travar e pontua o golpe adequadamente
  const battleState = Engine.createBattle(gengar, defenderWater);
  const aiDecision = AI.chooseAction(battleState, 'player', { strategy: 'SMART' });
  assert.ok(aiDecision.action);
  assert.equal(aiDecision.action.type, 'MOVE');
  assert.equal(aiDecision.action.moveId, 247);
});

test('P4-SD-13A: Integração real de sessão: Jogador reduz Special Defense do adversário com Shadow Ball (ativação vs não ativação)', async () => {
  const gengar = makeMon(94, 'gengar', ['ghost'], [SHADOW_BALL], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 30, hp: 400 });

  // 1. Cenário com ativação (roll 15 <= 20)
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([15, 100]); // Jogador 15 ativa; Inimigo 100 inativo

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [94, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 94 ? gengar : makeMon(id, 'mon-' + id, ['normal'], [TACKLE]))
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

    await session.prepareBattle({ playerTeamIds: [94, 1, 4] });
    await session.startBattle();
    await session.submitPlayerMove(247);

    // Inimigo ativo deve ter sofrido redução de Special Defense para -1
    const enemyActive = session.engine.getActiveCombatant(session.battleState, 'enemy');
    assert.equal(enemyActive.statStages.specialDefense, -1);

    // Exatamente um evento STAT_STAGE_CHANGED para o adversário
    const statEvents = capturedEvents.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 1);
    assert.deepEqual(statEvents[0], {
      type: BATTLE_EVENTS.STAT_STAGE_CHANGED,
      combatant: 'enemy',
      pokemonName: 'blastoise',
      statKey: 'specialDefense',
      previousStage: 0,
      requestedDelta: -1,
      appliedDelta: -1,
      finalStage: -1,
      blockedReason: null
    });

    // Mapeamento correto para STAT_STAGE_FEEDBACK sem duplicações
    const commands = Mapper.mapEvents(capturedEvents);
    const feedbackCommands = commands.filter(c => c.type === 'STAT_STAGE_FEEDBACK');
    assert.equal(feedbackCommands.length, 1);
    assert.deepEqual(feedbackCommands[0], {
      type: 'STAT_STAGE_FEEDBACK',
      side: 'enemy',
      pokemonName: 'blastoise',
      statKey: 'specialDefense',
      previousStage: 0,
      requestedDelta: -1,
      appliedDelta: -1,
      finalStage: -1,
      blockedReason: null
    });
  }

  // 2. Cenário sem ativação (roll 50 > 20)
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([50, 100]); // Jogador 50 NÃO ativa

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [94, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 94 ? gengar : makeMon(id, 'mon-' + id, ['normal'], [TACKLE]))
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

    await session.prepareBattle({ playerTeamIds: [94, 1, 4] });
    await session.startBattle();
    await session.submitPlayerMove(247);

    // Inimigo ativo deve manter Special Defense em 0
    const enemyActive = session.engine.getActiveCombatant(session.battleState, 'enemy');
    assert.equal(enemyActive.statStages.specialDefense, 0);

    // Ausência de eventos STAT_STAGE_CHANGED
    const statEvents = capturedEvents.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 0);

    // Ausência de comandos STAT_STAGE_FEEDBACK
    const commands = Mapper.mapEvents(capturedEvents);
    const feedbackCommands = commands.filter(c => c.type === 'STAT_STAGE_FEEDBACK');
    assert.equal(feedbackCommands.length, 0);
  }
});

test('P4-SD-13B: Integração real de sessão: Adversário reduz Defesa do jogador com Crunch (ativação vs não ativação)', async () => {
  const gengar = makeMon(94, 'gengar', ['ghost'], [TACKLE], { speed: 120, hp: 300 });
  const arcanine = makeMon(59, 'arcanine', ['fire'], [CRUNCH], { speed: 30, hp: 400 }); // Crunch (ID 242)

  // 1. Cenário com ativação do adversário (roll 15 <= 20)
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([100, 15]); // Jogador 100 inativo; Inimigo 15 ativa Crunch 20%

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [94, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 94 ? gengar : makeMon(id, 'mon-' + id, ['normal'], [TACKLE]))
      },
      opponentFactory: {
        createOpponentTeam: async () => [arcanine, makeMon(131, 'lapras', ['water'], [TACKLE]), makeMon(3, 'venusaur', ['grass'], [TACKLE])]
      },
      randomSource: rng,
      presentationEngine: {
        play: async (events) => { capturedEvents.push(...events); },
        playCommands: async () => {}
      }
    });

    await session.prepareBattle({ playerTeamIds: [94, 1, 4] });
    await session.startBattle();
    await session.submitPlayerMove(33); // Jogador usa Tackle

    // Jogador ativo deve ter sofrido redução de Defesa para -1
    const playerActive = session.engine.getActiveCombatant(session.battleState, 'player');
    assert.equal(playerActive.statStages.defense, -1);

    // Exatamente um evento STAT_STAGE_CHANGED para o jogador
    const statEvents = capturedEvents.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 1);
    assert.deepEqual(statEvents[0], {
      type: BATTLE_EVENTS.STAT_STAGE_CHANGED,
      combatant: 'player',
      pokemonName: 'gengar',
      statKey: 'defense',
      previousStage: 0,
      requestedDelta: -1,
      appliedDelta: -1,
      finalStage: -1,
      blockedReason: null
    });

    // Mapeamento correto para STAT_STAGE_FEEDBACK sem duplicações
    const commands = Mapper.mapEvents(capturedEvents);
    const feedbackCommands = commands.filter(c => c.type === 'STAT_STAGE_FEEDBACK');
    assert.equal(feedbackCommands.length, 1);
    assert.deepEqual(feedbackCommands[0], {
      type: 'STAT_STAGE_FEEDBACK',
      side: 'player',
      pokemonName: 'gengar',
      statKey: 'defense',
      previousStage: 0,
      requestedDelta: -1,
      appliedDelta: -1,
      finalStage: -1,
      blockedReason: null
    });
  }

  // 2. Cenário sem ativação do adversário (roll 50 > 20)
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([100, 50]); // Inimigo 50 NÃO ativa Crunch

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [94, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 94 ? gengar : makeMon(id, 'mon-' + id, ['normal'], [TACKLE]))
      },
      opponentFactory: {
        createOpponentTeam: async () => [arcanine, makeMon(131, 'lapras', ['water'], [TACKLE]), makeMon(3, 'venusaur', ['grass'], [TACKLE])]
      },
      randomSource: rng,
      presentationEngine: {
        play: async (events) => { capturedEvents.push(...events); },
        playCommands: async () => {}
      }
    });

    await session.prepareBattle({ playerTeamIds: [94, 1, 4] });
    await session.startBattle();
    await session.submitPlayerMove(33);

    // Jogador ativo mantém Defesa em 0
    const playerActive = session.engine.getActiveCombatant(session.battleState, 'player');
    assert.equal(playerActive.statStages.defense, 0);

    // Ausência de eventos STAT_STAGE_CHANGED
    const statEvents = capturedEvents.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 0);

    // Ausência de comandos STAT_STAGE_FEEDBACK
    const commands = Mapper.mapEvents(capturedEvents);
    const feedbackCommands = commands.filter(c => c.type === 'STAT_STAGE_FEEDBACK');
    assert.equal(feedbackCommands.length, 0);
  }
});

test('P4-SD-14: Presença dos golpes em espécies compatíveis da campanha', () => {
  // Umbreon (#197) deve possuir os 3 golpes piloto em seu pool de customização
  const umbreonPool = campaignMoveOptions.getPool(197);
  assert.ok(umbreonPool.some(m => m.id === 242 && m.name === 'crunch'), 'Umbreon deve poder usar Crunch');
  assert.ok(umbreonPool.some(m => m.id === 94 && m.name === 'psychic'), 'Umbreon deve poder usar Psychic');
  assert.ok(umbreonPool.some(m => m.id === 247 && m.name === 'shadow-ball'), 'Umbreon deve poder usar Shadow Ball');

  // Gengar (#94) tem Shadow Ball em seu loadout fixo e pool
  const gengarPool = campaignMoveOptions.getPool(94);
  assert.ok(gengarPool.some(m => m.id === 247), 'Gengar deve possuir Shadow Ball');

  // Alakazam (#65) tem Psychic e Shadow Ball
  const alakazamPool = campaignMoveOptions.getPool(65);
  assert.ok(alakazamPool.some(m => m.id === 94), 'Alakazam deve possuir Psychic');
  assert.ok(alakazamPool.some(m => m.id === 247), 'Alakazam deve possuir Shadow Ball');

  // Arcanine (#59) tem Crunch
  const arcaninePool = campaignMoveOptions.getPool(59);
  assert.ok(arcaninePool.some(m => m.id === 242), 'Arcanine deve possuir Crunch');

  // Confirmar que centenas de espécies possuem os golpes registrados nos loadouts fixos
  const fixedShadowBall = Object.values(campaignFixedCatalog.byId).filter(p => p.moves.some(m => m.id === 247));
  const fixedPsychic = Object.values(campaignFixedCatalog.byId).filter(p => p.moves.some(m => m.id === 94));
  const fixedCrunch = Object.values(campaignFixedCatalog.byId).filter(p => p.moves.some(m => m.id === 242));

  assert.ok(fixedShadowBall.length > 50, `Shadow Ball presente em ${fixedShadowBall.length} espécies fixas`);
  assert.ok(fixedPsychic.length > 50, `Psychic presente em ${fixedPsychic.length} espécies fixas`);
  assert.ok(fixedCrunch.length > 50, `Crunch presente em ${fixedCrunch.length} espécies fixas`);
});

test('P4-SD-15: Independência entre paralisia (statusRoll) e efeito secundário (secondaryEffectRoll) no motor', () => {
  // Atacante paralisado com Shadow Ball
  const pikaParalyzed = makeMon(94, 'gengar', ['ghost'], [SHADOW_BALL], { speed: 120 }, {
    statusCondition: 'paralysis'
  });
  // Defensor sem paralisia, usando Tackle neutro
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 30, hp: 500 });

  // Cenário 1: statusRoll 50 (> 25, age) + secondaryEffectRoll 15 (<= 20, ativa)
  // Golpe deve executar com sucesso e aplicar a redução
  {
    const battle = Engine.createBattle(pikaParalyzed, blastoise);
    const res = Engine.resolveTurn(battle, {
      player: makeAction(247, { statusRoll: 50, secondaryEffectRoll: 15 }),
      enemy: makeAction(33, { accuracyRoll: 1 })
    });

    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player'), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), true);
    assert.equal(res.state.enemy.statStages.specialDefense, -1);

    const statEvs = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvs.length, 1);
    assert.equal(statEvs[0].combatant, 'enemy');
    assert.equal(statEvs[0].statKey, 'specialDefense');
    assert.equal(statEvs[0].appliedDelta, -1);
  }

  // Cenário 2: statusRoll 50 (> 25, age) + secondaryEffectRoll 50 (> 20, não ativa)
  // Golpe executa, causa dano, mas não aplica a redução de atributo
  {
    const battle = Engine.createBattle(pikaParalyzed, blastoise);
    const res = Engine.resolveTurn(battle, {
      player: makeAction(247, { statusRoll: 50, secondaryEffectRoll: 50 }),
      enemy: makeAction(33, { accuracyRoll: 1 })
    });

    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player'), false);
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), true);
    assert.equal(res.state.enemy.statStages.specialDefense, 0);

    const statEvs = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvs.length, 0);
  }

  // Cenário 3: statusRoll 10 (<= 25, imobilizado) + secondaryEffectRoll 1 (<= 20, ativaria caso agisse)
  // O atacante é imobilizado: nenhuma execução do golpe, nenhum dano causado e nenhuma redução aplicada
  {
    const battle = Engine.createBattle(pikaParalyzed, blastoise);
    const res = Engine.resolveTurn(battle, {
      player: makeAction(247, { statusRoll: 10, secondaryEffectRoll: 1 }),
      enemy: makeAction(33, { accuracyRoll: 1 })
    });

    // Confirma emissão de imobilização para o jogador
    const immobEv = res.events.find(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player');
    assert.ok(immobEv, 'Deve emitir STATUS_IMMOBILIZED para o jogador');
    assert.equal(immobEv.statusRoll, 10);

    // O jogador não usou o golpe
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), false);

    // Nenhum dano causado ao defensor pelo jogador (HP mantido após ação do jogador)
    const dmgToDefender = res.events.filter(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.target === 'enemy');
    assert.equal(dmgToDefender.length, 0, 'Defensor não deve sofrer dano quando atacante está imobilizado');

    // Nenhuma redução aplicada
    assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED), false);
    assert.equal(res.state.enemy.statStages.specialDefense, 0);
  }
});

test('P4-SD-16: Independência de paralisia e efeito secundário na sessão real (BattleSessionController)', async () => {
  const gengarParalyzed = makeMon(94, 'gengar', ['ghost'], [SHADOW_BALL], { speed: 120 }, {
    statusCondition: 'paralysis'
  });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 30, hp: 500 });

  // Subcenário 1: Sessão real onde statusRoll imobiliza o jogador (roll 10 <= 25)
  // Mesmo com secondaryEffectSequence em 15 (que ativaria), nada é executado pelo jogador
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([15, 100]);
    rng.setStatusSequence([10]); // Imobiliza jogador

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [94, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 94 ? gengarParalyzed : makeMon(id, 'mon-' + id, ['normal'], [TACKLE]))
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

    await session.prepareBattle({ playerTeamIds: [94, 1, 4] });
    await session.startBattle();
    await session.submitPlayerMove(247);

    // Eventos capturados devem conter STATUS_IMMOBILIZED para o jogador
    assert.ok(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player'));

    // Nenhum dano causado ao adversário pelo jogador
    const dmgToEnemy = capturedEvents.filter(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.target === 'enemy');
    assert.equal(dmgToEnemy.length, 0);

    // Nenhuma alteração de atributo
    const statEvents = capturedEvents.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 0);

    const enemyActive = session.engine.getActiveCombatant(session.battleState, 'enemy');
    assert.equal(enemyActive.statStages.specialDefense, 0);
  }

  // Subcenário 2: Sessão real onde statusRoll permite agir (roll 50 > 25) e secondaryEffectRoll ativa (15 <= 20)
  // O golpe é executado e a redução é encaminhada com sucesso
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([15, 100]);
    rng.setStatusSequence([50]); // Permite agir

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [94, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 94 ? gengarParalyzed : makeMon(id, 'mon-' + id, ['normal'], [TACKLE]))
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

    await session.prepareBattle({ playerTeamIds: [94, 1, 4] });
    await session.startBattle();
    await session.submitPlayerMove(247);

    // Jogador não foi imobilizado
    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player'), false);

    // Dano aplicado ao adversário
    const dmgToEnemy = capturedEvents.filter(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.target === 'enemy');
    assert.equal(dmgToEnemy.length, 1);

    // Redução aplicada e refletida no combatente ativo
    const statEvents = capturedEvents.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 1);
    assert.equal(statEvents[0].combatant, 'enemy');
    assert.equal(statEvents[0].statKey, 'specialDefense');
    assert.equal(statEvents[0].appliedDelta, -1);

    const enemyActive = session.engine.getActiveCombatant(session.battleState, 'enemy');
    assert.equal(enemyActive.statStages.specialDefense, -1);
  }
});
