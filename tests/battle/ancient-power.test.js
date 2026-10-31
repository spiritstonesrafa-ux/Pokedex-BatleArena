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
  applyStatStageChange,
  getEffectiveStat
} = require('../../assets/js/battle/battle-constants.js');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source.js');
const campaignMoveOptions = require('../../assets/js/campaign/campaign-move-options.js');
const campaignFixedCatalog = require('../../assets/js/campaign/campaign-fixed-battle-catalog.js');

const TACKLE = KNOWN_CATALOG_MOVES[33];
const ANCIENT_POWER = KNOWN_CATALOG_MOVES[246];
const DRAGON_TAIL = KNOWN_CATALOG_MOVES[525];
const THUNDERBOLT = KNOWN_CATALOG_MOVES[85];

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

// 1. Dados canônicos e classificação do golpe
test('P4-AP-01: Dados canônicos, catalogação e classificação de suporte de Ancient Power', () => {
  const cap = getMoveCapability({ id: 246 });
  assert.equal(cap.id, 246);
  assert.equal(cap.name, 'ancient-power');
  assert.equal(cap.supportLevel, 'FULL');
  assert.deepEqual(cap.requiredMechanics, ['SPECIAL_DAMAGE', 'SECONDARY_STAT_BOOST']);
  assert.deepEqual(cap.knownPending, []);
  assert.equal(cap.blockedReason, null);
  assert.equal(cap.priority, 0);

  const sec = getSecondaryEffect({ id: 246 });
  assert.ok(sec, 'Efeito secundário deve estar registrado');
  assert.equal(sec.chance, 10);
  assert.equal(sec.target, 'attacker');
  assert.deepEqual(sec.statBoosts, {
    attack: 1,
    defense: 1,
    specialAttack: 1,
    specialDefense: 1,
    speed: 1
  });

  const valid = validateMoveData({
    id: 246,
    name: 'ancient-power',
    type: 'rock',
    power: 60,
    accuracy: 100,
    pp: 5,
    damageClass: 'special'
  });
  assert.equal(valid, true, 'Objeto completo de Ancient Power deve ser válido');
});

// 2. Fronteiras de chance: 1 e 10 ativam; 11 e 100 não ativam; omissão preserva o padrão (não ativa)
test('P4-AP-02: Fronteiras de chance para Ancient Power (1 e 10 ativam; 11 e 100 não ativam; omissão não ativa)', () => {
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER]);
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 500 });

  // Roll 1: Ativa
  {
    const state = Engine.createBattle(zapdos, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 246, accuracyRoll: 50, damageRoll: 100, secondaryEffectRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 50, damageRoll: 100 }
    });
    const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 5, 'Roll 1 deve ativar os 5 aumentos');
    assert.equal(res.state.player.statStages.attack, 1);
  }

  // Roll 10: Ativa (fronteira exata de 10%)
  {
    const state = Engine.createBattle(zapdos, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 246, accuracyRoll: 50, damageRoll: 100, secondaryEffectRoll: 10 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 50, damageRoll: 100 }
    });
    const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 5, 'Roll 10 deve ativar os 5 aumentos');
    assert.equal(res.state.player.statStages.specialAttack, 1);
  }

  // Roll 11: Não ativa (fronteira superior imediata)
  {
    const state = Engine.createBattle(zapdos, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 246, accuracyRoll: 50, damageRoll: 100, secondaryEffectRoll: 11 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 50, damageRoll: 100 }
    });
    const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 0, 'Roll 11 NÃO deve ativar os aumentos');
    assert.equal(res.state.player.statStages.attack, 0);
  }

  // Roll 100: Não ativa
  {
    const state = Engine.createBattle(zapdos, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 246, accuracyRoll: 50, damageRoll: 100, secondaryEffectRoll: 100 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 50, damageRoll: 100 }
    });
    const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 0, 'Roll 100 NÃO deve ativar os aumentos');
    assert.equal(res.state.player.statStages.attack, 0);
  }

  // Omissão de secondaryEffectRoll: padrão determinístico 100 (não ativa)
  {
    const state = Engine.createBattle(zapdos, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 246, accuracyRoll: 50, damageRoll: 100 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 50, damageRoll: 100 }
    });
    const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 0, 'Omissão de roll não deve ativar os aumentos');
    assert.equal(res.state.player.statStages.attack, 0);
  }
});

// 3. Uma única rolagem ativando o conjunto de cinco aumentos
test('P4-AP-03: Uma única rolagem ativa simultaneamente os cinco atributos', () => {
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER]);
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 500 });
  const state = Engine.createBattle(zapdos, blastoise);

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
  assert.equal(statEvents.length, 5, 'Exatamente 5 eventos emitidos');

  const expectedStats = ['attack', 'defense', 'specialAttack', 'specialDefense', 'speed'];
  expectedStats.forEach(stat => {
    const ev = statEvents.find(e => e.statKey === stat);
    assert.ok(ev, `Evento para ${stat} deve existir`);
    assert.equal(ev.combatant, 'player');
    assert.equal(ev.pokemonName, 'zapdos');
    assert.equal(ev.previousStage, 0);
    assert.equal(ev.requestedDelta, 1);
    assert.equal(ev.appliedDelta, 1);
    assert.equal(ev.finalStage, 1);
    assert.equal(ev.blockedReason, null);
    assert.equal(res.state.player.statStages[stat], 1);
  });
});

// 4. Aumento somente no usuário, sem alterar o defensor ou atributos base
test('P4-AP-04: Aumento aplicado somente ao usuário, sem alterar atributos base ou o defensor', () => {
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], {
    attack: 90, defense: 85, specialAttack: 125, specialDefense: 90, speed: 100
  });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], {
    attack: 83, defense: 100, specialAttack: 85, specialDefense: 105, speed: 78, hp: 500
  });
  const state = Engine.createBattle(zapdos, blastoise);

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  // Atributos base inalterados no estado resultante
  assert.equal(res.state.player.attack, 90);
  assert.equal(res.state.player.defense, 85);
  assert.equal(res.state.player.specialAttack, 125);
  assert.equal(res.state.player.specialDefense, 90);
  assert.equal(res.state.player.speed, 100);

  // Defensor sem alterações de estágio
  assert.deepEqual(res.state.enemy.statStages, {
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0
  });
});

// 5. Limites individuais: alguns atributos em +6 e outros abaixo
test('P4-AP-05: Limites individuais: atributos abaixo de +6 sobem, enquanto atributos em +6 são bloqueados', () => {
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], {}, {
    statStages: {
      attack: 6,
      defense: 2,
      specialAttack: 5,
      specialDefense: 6,
      speed: 0
    }
  });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 500 });
  const state = Engine.createBattle(zapdos, blastoise);

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
  assert.equal(statEvents.length, 5);

  // Attack: já em +6, bloqueado
  const atkEvent = statEvents.find(e => e.statKey === 'attack');
  assert.equal(atkEvent.previousStage, 6);
  assert.equal(atkEvent.requestedDelta, 1);
  assert.equal(atkEvent.appliedDelta, 0);
  assert.equal(atkEvent.finalStage, 6);
  assert.equal(atkEvent.blockedReason, 'AT_MAX');
  assert.equal(res.state.player.statStages.attack, 6);

  // Defense: era 2, vai para 3
  const defEvent = statEvents.find(e => e.statKey === 'defense');
  assert.equal(defEvent.previousStage, 2);
  assert.equal(defEvent.appliedDelta, 1);
  assert.equal(defEvent.finalStage, 3);
  assert.equal(defEvent.blockedReason, null);
  assert.equal(res.state.player.statStages.defense, 3);

  // SpAtk: era 5, atinge limite de 6
  const spAtkEvent = statEvents.find(e => e.statKey === 'specialAttack');
  assert.equal(spAtkEvent.previousStage, 5);
  assert.equal(spAtkEvent.appliedDelta, 1);
  assert.equal(spAtkEvent.finalStage, 6);
  assert.equal(spAtkEvent.blockedReason, null);
  assert.equal(res.state.player.statStages.specialAttack, 6);

  // SpDef: já em +6, bloqueado
  const spDefEvent = statEvents.find(e => e.statKey === 'specialDefense');
  assert.equal(spDefEvent.appliedDelta, 0);
  assert.equal(spDefEvent.finalStage, 6);
  assert.equal(spDefEvent.blockedReason, 'AT_MAX');
  assert.equal(res.state.player.statStages.specialDefense, 6);

  // Speed: era 0, vai para 1
  const spdEvent = statEvents.find(e => e.statKey === 'speed');
  assert.equal(spdEvent.appliedDelta, 1);
  assert.equal(spdEvent.finalStage, 1);
  assert.equal(spdEvent.blockedReason, null);
  assert.equal(res.state.player.statStages.speed, 1);
});

// 6. Todos os atributos em +6: sem aumento ou falso anúncio
test('P4-AP-06: Todos os atributos em +6 emitem AT_MAX sem falso aumento ou mensagem incorreta', () => {
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], {}, {
    statStages: { attack: 6, defense: 6, specialAttack: 6, specialDefense: 6, speed: 6 }
  });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 500 });
  const state = Engine.createBattle(zapdos, blastoise);

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
  assert.equal(statEvents.length, 5);
  statEvents.forEach(ev => {
    assert.equal(ev.appliedDelta, 0);
    assert.equal(ev.finalStage, 6);
    assert.equal(ev.blockedReason, 'AT_MAX');
  });

  // Testa adaptador de UI garantindo ausência de falso anúncio de subida
  const displayedMessages = [];
  const fakeView = {
    updateStatStages: () => {},
    displayMessage: (msg) => displayedMessages.push(msg)
  };
  const adapter = new BattleUiDomAdapter({ view: fakeView });
  const commands = Mapper.mapEvents(res.events, { battleState: res.state });

  commands.filter(c => c.type === 'STAT_STAGE_FEEDBACK').forEach(cmd => {
    adapter.execute(cmd, { battleState: res.state });
  });

  assert.equal(displayedMessages.length, 5);
  displayedMessages.forEach(msg => {
    assert.ok(msg.includes('não pode subir mais!'), `Mensagem deve indicar teto máximo: ${msg}`);
    assert.ok(!msg.includes('subiu!'), `Não deve anunciar subida falsa: ${msg}`);
  });
});

// 7. Efeito ocorrendo após nocautear o alvo, com o usuário vivo
test('P4-AP-07: Ancient Power ativa e concede aumentos mesmo quando nocauteia o alvo (diferença crítica com debuffs)', () => {
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], { specialAttack: 150 });
  // Defensor com apenas 10 HP para garantir nocaute imediato
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 10, currentHp: 10 });
  const state = Engine.createBattle(zapdos, blastoise);

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  assert.equal(res.state.enemy.currentHp, 0, 'Defensor deve estar nocauteado');
  assert.ok(res.state.player.currentHp > 0, 'Usuário deve estar vivo');

  const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
  assert.equal(statEvents.length, 5, 'Aumentos devem ser concedidos mesmo com o defensor nocauteado');
  assert.equal(res.state.player.statStages.attack, 1);
  assert.equal(res.state.player.statStages.speed, 1);
});

// 8. Ausência de efeito em erro, imunidade e impedimento por paralisia
test('P4-AP-08: Ausência de efeito secundário em Miss, Imunidade e Impedimento por Paralisia', () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 500 });

  // Cenário A: Miss (acurácia 80 com accuracyRoll 90 > 80)
  {
    const inaccurateAncientPower = { ...ANCIENT_POWER, accuracy: 80 };
    const zapdosMiss = makeMon(145, 'zapdos', ['electric', 'flying'], [inaccurateAncientPower]);
    const state = Engine.createBattle(zapdosMiss, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 246, accuracyRoll: 90, damageRoll: 100, secondaryEffectRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 0, 'Em miss, nenhum aumento deve ocorrer');
    assert.equal(res.state.player.statStages.attack, 0);
  }

  // Cenário B: Imunidade (multiplicador 0x, ex: golpe Ghost contra Snorlax Normal)
  {
    const ghostAncientPower = { ...ANCIENT_POWER, type: 'ghost' };
    const zapdosGhost = makeMon(145, 'zapdos', ['electric'], [ghostAncientPower]);
    const snorlaxNormal = makeMon(143, 'snorlax', ['normal'], [TACKLE], { hp: 500 });
    const state = Engine.createBattle(zapdosGhost, snorlaxNormal);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 0, 'Em imunidade, nenhum aumento deve ocorrer');
    assert.equal(res.state.player.statStages.attack, 0);
  }

  // Cenário C: Impedimento por paralisia
  {
    const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER]);
    const paralyzedZapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], {}, {
      statusCondition: 'paralysis'
    });
    const state = Engine.createBattle(paralyzedZapdos, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, statusRoll: 15, secondaryEffectRoll: 1 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    const immobEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED);
    assert.equal(immobEvents.length, 1, 'Deve estar imobilizado');
    const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 0, 'Imobilizado não recebe aumentos');
    assert.equal(res.state.player.statStages.attack, 0);
  }
});

// 9. Usuário com status podendo receber os aumentos quando consegue agir
test('P4-AP-09: Usuário sob condição de status (burn, poison, paralysis) recebe aumentos normalmente se agir', () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 500 });

  // Queimadura (Burn)
  {
    const mon = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], {}, { statusCondition: 'burn' });
    const state = Engine.createBattle(mon, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 5, 'Queimado deve receber aumentos');
    assert.equal(res.state.player.statStages.specialAttack, 1);
  }

  // Veneno (Poison)
  {
    const mon = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], {}, { statusCondition: 'poison' });
    const state = Engine.createBattle(mon, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 5, 'Envenenado deve receber aumentos');
    assert.equal(res.state.player.statStages.specialAttack, 1);
  }

  // Paralisia com sucesso na ação (statusRoll > 25)
  {
    const mon = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], {}, { statusCondition: 'paralysis' });
    const state = Engine.createBattle(mon, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, statusRoll: 50, secondaryEffectRoll: 5 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 5, 'Paralisado que consegue agir recebe aumentos');
    assert.equal(res.state.player.statStages.specialAttack, 1);
  }
});

// 10. Independência entre statusRoll e secondaryEffectRoll
test('P4-AP-10: Independência estrita entre statusRoll e secondaryEffectRoll', () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 500 });

  // Cenário 1: statusRoll 50 (consegue agir) + secondaryEffectRoll 50 (não ativa efeito)
  {
    const mon = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], {}, { statusCondition: 'paralysis' });
    const state = Engine.createBattle(mon, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, statusRoll: 50, secondaryEffectRoll: 50 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    const immob = res.events.filter(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED);
    assert.equal(immob.length, 0, 'Não deve estar imobilizado');
    const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 0, 'Efeito secundário não deve ativar');
    assert.equal(res.state.player.statStages.attack, 0);
  }

  // Cenário 2: statusRoll 10 (imobilizado) + secondaryEffectRoll 5 (que ativaria)
  {
    const mon = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], {}, { statusCondition: 'paralysis' });
    const state = Engine.createBattle(mon, blastoise);
    const res = Engine.resolveTurn(state, {
      player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, statusRoll: 10, secondaryEffectRoll: 5 },
      enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
    });
    const immob = res.events.filter(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED);
    assert.equal(immob.length, 1, 'Deve estar imobilizado');
    const statEvents = res.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 0, 'Não deve aplicar aumento quando imobilizado');
    assert.equal(res.state.player.statStages.attack, 0);
  }
});

// 11. Impacto dos aumentos nos cálculos posteriores pertinentes
test('P4-AP-11: Aumento de SpAtk por Ancient Power potencializa dano de golpe especial subsequente', () => {
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER, THUNDERBOLT], { specialAttack: 100, speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { specialDefense: 100, hp: 1000, speed: 50 });
  const state = Engine.createBattle(zapdos, blastoise);

  // Turno 1: Usa Ancient Power e ganha +1 em tudo
  const turn1 = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(turn1.state.player.statStages.specialAttack, 1);
  assert.equal(getEffectiveStat(turn1.state.player, 'specialAttack'), 150); // 100 * 1.5 = 150

  // Turno 2: Usa Thunderbolt com +1 SpAtk (multiplicador 1.5x)
  const turn2 = Engine.resolveTurn(turn1.state, {
    player: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const dmgEvent2 = turn2.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');

  // Compara com estado neutro de SpAtk (estágio 0)
  const neutralZapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [THUNDERBOLT], { specialAttack: 100, speed: 120 });
  const neutralBlastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { specialDefense: 100, hp: 1000, speed: 50 });
  const neutralState = Engine.createBattle(neutralZapdos, neutralBlastoise);
  const neutralTurn = Engine.resolveTurn(neutralState, {
    player: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const neutralDmgEvent = neutralTurn.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');

  assert.ok(dmgEvent2.damage > neutralDmgEvent.damage, 'Dano com +1 SpAtk deve ser estritamente superior ao dano neutro');
  assert.equal(Math.round(dmgEvent2.damage / neutralDmgEvent.damage * 10) / 10, 1.5, 'Razão de dano deve refletir o multiplicador de estágio 1.5x');
});

// 12. Speed aumentada sem reordenar as ações já definidas no turno atual
test('P4-AP-12: Aumento de Speed no turno atual não altera a ordem de ações pré-definida para aquele turno', () => {
  // Jogador inicialmente mais lento (Speed 80 vs 100)
  const omastar = makeMon(139, 'omastar', ['rock', 'water'], [ANCIENT_POWER], { speed: 80, hp: 500 });
  const jolteon = makeMon(135, 'jolteon', ['electric'], [TACKLE], { speed: 100, hp: 500 });
  const state = Engine.createBattle(omastar, jolteon);

  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  // Jolteon deve ter agido primeiro no Turno 1
  const moveEvents = res.events.filter(e => e.type === BATTLE_EVENTS.MOVE_USED);
  assert.equal(moveEvents[0].actor, 'enemy', 'Inimigo mais rápido deve agir primeiro no turno 1');
  assert.equal(moveEvents[1].actor, 'player', 'Jogador age em segundo');

  // No final do turno 1, Omastar ganhou +1 Speed (80 * 1.5 = 120 > 100)
  assert.equal(res.state.player.statStages.speed, 1);
  assert.equal(getEffectiveStat(res.state.player, 'speed'), 120);

  // No Turno 2, Omastar agora é efetivamente mais rápido e deve agir primeiro
  const resTurn2 = Engine.resolveTurn(res.state, {
    player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 50 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const moveEvents2 = resTurn2.events.filter(e => e.type === BATTLE_EVENTS.MOVE_USED);
  assert.equal(moveEvents2[0].actor, 'player', 'Omastar com +1 Speed age primeiro no turno 2');
  assert.equal(moveEvents2[1].actor, 'enemy', 'Jolteon age em segundo no turno 2');
});

// 13. Reset dos aumentos nas trocas voluntária e forçada, usando os mecanismos reais do motor
test('P4-AP-13A: Reset de aumentos de atributos na troca voluntária', () => {
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER]);
  const pidgeot = makeMon(18, 'pidgeot', ['normal', 'flying'], [TACKLE]);
  const raichu = makeMon(26, 'raichu', ['electric'], [TACKLE]);
  const playerTeam = makeTeam(zapdos, pidgeot, raichu);

  const enemyLead = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 500 });
  const enemyB1 = makeMon(6, 'charizard', ['fire', 'flying'], [TACKLE]);
  const enemyB2 = makeMon(3, 'venusaur', ['grass', 'poison'], [TACKLE]);
  const enemyTeam = makeTeam(enemyLead, enemyB1, enemyB2);

  const state = Engine.createBattle(playerTeam, enemyTeam);

  // Turno 1: Zapdos ganha +1 em tudo
  const turn1 = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(turn1.state.player.team[0].statStages.attack, 1);
  assert.equal(turn1.state.player.team[0].statStages.speed, 1);

  // Turno 2: Jogador troca para Pidgeot voluntariamente
  const turn2 = Engine.resolveTurn(turn1.state, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  // Zapdos que saiu para o banco deve ter seus estágios resetados para 0
  assert.deepEqual(turn2.state.player.team[0].statStages, {
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0
  });
});

test('P4-AP-13B: Reset de aumentos de atributos na troca forçada (Dragon Tail)', () => {
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], { speed: 120, hp: 500 });
  const pidgeot = makeMon(18, 'pidgeot', ['normal', 'flying'], [TACKLE]);
  const raichu = makeMon(26, 'raichu', ['electric'], [TACKLE]);
  const playerTeam = makeTeam(zapdos, pidgeot, raichu);

  const dragonite = makeMon(149, 'dragonite', ['dragon', 'flying'], [DRAGON_TAIL], { speed: 80, hp: 500 });
  const enemyB1 = makeMon(6, 'charizard', ['fire', 'flying'], [TACKLE]);
  const enemyB2 = makeMon(3, 'venusaur', ['grass', 'poison'], [TACKLE]);
  const enemyTeam = makeTeam(dragonite, enemyB1, enemyB2);

  const state = Engine.createBattle(playerTeam, enemyTeam);

  // Turno 1: Zapdos age primeiro com Ancient Power (+1 em tudo). Dragonite age em segundo com Dragon Tail (prioridade negativa -6) e força troca do Zapdos!
  const res = Engine.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 246, accuracyRoll: 1, damageRoll: 100, secondaryEffectRoll: 5 },
    enemy: { type: 'MOVE', moveId: 525, accuracyRoll: 1, damageRoll: 100 }
  });

  // Zapdos foi forçado a trocar
  assert.equal(res.state.player.activeIndex, 1, 'Pidgeot deve ter entrado em campo');
  // Zapdos no banco deve estar com estágios resetados
  assert.deepEqual(res.state.player.team[0].statStages, {
    attack: 0,
    defense: 0,
    specialAttack: 0,
    specialDefense: 0,
    speed: 0
  });
});

// 14. Sessão real nos dois sentidos (BattleSessionController)
test('P4-AP-14A: Sessão real — Jogador usando Ancient Power (ativação vs não-ativação)', async () => {
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], { speed: 120, hp: 300 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50, hp: 600 });

  // 1. Cenário com ativação (roll 5 <= 10)
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([5, 100]); // Jogador 5 ativa; Inimigo 100 inativo

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [145, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 145 ? zapdos : makeMon(id, 'mon-' + id, ['normal'], [TACKLE]))
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

    await session.prepareBattle({ playerTeamIds: [145, 1, 4] });
    await session.startBattle();
    await session.submitPlayerMove(246);

    const activePlayer = session.engine.getActiveCombatant(session.battleState, 'player');
    assert.equal(activePlayer.statStages.attack, 1);
    assert.equal(activePlayer.statStages.speed, 1);

    const statEvents = capturedEvents.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 5);
    statEvents.forEach(e => {
      assert.equal(e.combatant, 'player');
      assert.equal(e.appliedDelta, 1);
    });

    const commands = Mapper.mapEvents(capturedEvents);
    const statCommands = commands.filter(c => c.type === 'STAT_STAGE_FEEDBACK');
    assert.equal(statCommands.length, 5);
    statCommands.forEach(c => {
      assert.equal(c.side, 'player');
      assert.equal(c.appliedDelta, 1);
    });
  }

  // 2. Cenário sem ativação (roll 50 > 10)
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([50, 100]); // Jogador 50 não ativa

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [145, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 145 ? zapdos : makeMon(id, 'mon-' + id, ['normal'], [TACKLE]))
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

    await session.prepareBattle({ playerTeamIds: [145, 1, 4] });
    await session.startBattle();
    await session.submitPlayerMove(246);

    const activePlayer = session.engine.getActiveCombatant(session.battleState, 'player');
    assert.equal(activePlayer.statStages.attack, 0);

    const statEvents = capturedEvents.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED);
    assert.equal(statEvents.length, 0);

    const commands = Mapper.mapEvents(capturedEvents);
    const statCommands = commands.filter(c => c.type === 'STAT_STAGE_FEEDBACK');
    assert.equal(statCommands.length, 0);
  }
});

test('P4-AP-14B: Sessão real — Adversário usando Ancient Power (ativação vs não-ativação)', async () => {
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { speed: 50, hp: 600 });
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], { speed: 120, hp: 300 });

  // 1. Cenário com ativação do adversário (roll 10 <= 10)
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([100, 10]); // Inimigo roll 10 ativa Ancient Power

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [9, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 9 ? blastoise : makeMon(id, 'mon-' + id, ['normal'], [TACKLE]))
      },
      opponentFactory: {
        createOpponentTeam: async () => [zapdos, makeMon(131, 'lapras', ['water'], [TACKLE]), makeMon(3, 'venusaur', ['grass'], [TACKLE])]
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

    const activeEnemy = session.engine.getActiveCombatant(session.battleState, 'enemy');
    assert.equal(activeEnemy.statStages.attack, 1);
    assert.equal(activeEnemy.statStages.speed, 1);

    const statEvents = capturedEvents.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'enemy');
    assert.equal(statEvents.length, 5);

    const commands = Mapper.mapEvents(capturedEvents);
    const statCommands = commands.filter(c => c.type === 'STAT_STAGE_FEEDBACK' && c.side === 'enemy');
    assert.equal(statCommands.length, 5);
  }

  // 2. Cenário sem ativação do adversário (roll 80 > 10)
  {
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([100, 80]); // Inimigo roll 80 não ativa

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [9, 1, 4] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 9 ? blastoise : makeMon(id, 'mon-' + id, ['normal'], [TACKLE]))
      },
      opponentFactory: {
        createOpponentTeam: async () => [zapdos, makeMon(131, 'lapras', ['water'], [TACKLE]), makeMon(3, 'venusaur', ['grass'], [TACKLE])]
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

    const activeEnemy = session.engine.getActiveCombatant(session.battleState, 'enemy');
    assert.equal(activeEnemy.statStages.attack, 0);

    const statEvents = capturedEvents.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'enemy');
    assert.equal(statEvents.length, 0);

    const commands = Mapper.mapEvents(capturedEvents);
    const statCommands = commands.filter(c => c.type === 'STAT_STAGE_FEEDBACK' && c.side === 'enemy');
    assert.equal(statCommands.length, 0);
  }
});

// 15. Avaliador considerando os atributos do usuário, os limites e o caso de nocaute garantido
test('P4-AP-15: Avaliador tático e AI consideram atributos do usuário, limites +6 e nocaute garantido', () => {
  const zapdos = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER]);
  const blastoise = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 500 });

  // Cenário 1: Condição neutra (estágios 0)
  const evalNeutro = Evaluator.evaluateMove(zapdos, blastoise, ANCIENT_POWER);
  assert.equal(evalNeutro.expectedStatusBenefit, 4, 'Bônus esperado para 5 atributos a 10%: Math.round(0.10 * 5 * 8) = 4');

  // Cenário 2: Todos os atributos em +6: benefício adicional DEVE ser estritamente zero
  const zapdosMax = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], {}, {
    statStages: { attack: 6, defense: 6, specialAttack: 6, specialDefense: 6, speed: 6 }
  });
  const evalMax = Evaluator.evaluateMove(zapdosMax, blastoise, ANCIENT_POWER);
  assert.equal(evalMax.expectedStatusBenefit, 0, 'Com todos em +6, benefício adicional deve ser 0');

  // Cenário 3: Alguns atributos em +6 (ex: 3 em +6, restando 2 com margem)
  const zapdosParcial = makeMon(145, 'zapdos', ['electric', 'flying'], [ANCIENT_POWER], {}, {
    statStages: { attack: 6, defense: 6, specialAttack: 6, specialDefense: 0, speed: 0 }
  });
  const evalParcial = Evaluator.evaluateMove(zapdosParcial, blastoise, ANCIENT_POWER);
  assert.equal(evalParcial.expectedStatusBenefit, 2, 'Com 2 atributos disponíveis: Math.round(0.10 * 2 * 8) = 2');

  // Cenário 4: Nocaute garantido (guaranteedKo = true) NÃO elimina benefício para o atacante
  const blastoiseFraco = makeMon(9, 'blastoise', ['water'], [TACKLE], { hp: 5, currentHp: 5 });
  const evalKo = Evaluator.evaluateMove(zapdos, blastoiseFraco, ANCIENT_POWER);
  assert.equal(evalKo.guaranteedKo, true, 'Deve ser nocaute garantido');
  assert.equal(evalKo.expectedStatusBenefit, 4, 'Benefício do atacante NÃO deve ser zerado por nocaute garantido');

  // Cenário 5: Avaliação no motor da IA (AI score)
  const state = Engine.createBattle(zapdos, blastoise);
  const aiDecision = AI.chooseAction(state, 'player', { strategy: 'SMART' });
  assert.equal(aiDecision.action.moveId, 246, 'SMART AI seleciona Ancient Power');
});

// 16. Disponibilidade efetiva na campanha
test('P4-AP-16: Disponibilidade efetiva de Ancient Power em espécies da campanha', () => {
  // Omastar (#139) e Zapdos (#145) possuem Ancient Power no catálogo fixo e pool de customização
  const omastarPool = campaignMoveOptions.getPool(139);
  assert.ok(omastarPool.some(m => m.id === 246 && m.name === 'ancient-power'), 'Omastar deve possuir Ancient Power no pool');

  const zapdosPool = campaignMoveOptions.getPool(145);
  assert.ok(zapdosPool.some(m => m.id === 246 && m.name === 'ancient-power'), 'Zapdos deve possuir Ancient Power no pool');

  const chikoritaPool = campaignMoveOptions.getPool(152);
  assert.ok(chikoritaPool.some(m => m.id === 246), 'Chikorita deve possuir Ancient Power no pool');

  const cryogonalPool = campaignMoveOptions.getPool(615);
  assert.ok(cryogonalPool.some(m => m.id === 246), 'Cryogonal deve possuir Ancient Power no pool');

  const aurorusPool = campaignMoveOptions.getPool(699);
  assert.ok(aurorusPool.some(m => m.id === 246), 'Aurorus deve possuir Ancient Power no pool');

  const regielekiPool = campaignMoveOptions.getPool(894);
  assert.ok(regielekiPool.some(m => m.id === 246), 'Regieleki deve possuir Ancient Power no pool');

  // Verifica presença nos loadouts fixos
  const fixedWithAncientPower = Object.values(campaignFixedCatalog.byId)
    .filter(p => p.moves.some(m => m.id === 246));
  assert.ok(fixedWithAncientPower.length >= 6, `Pelo menos 6 espécies fixas com Ancient Power (encontradas: ${fixedWithAncientPower.length})`);
});
