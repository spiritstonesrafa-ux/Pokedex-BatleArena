const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../../assets/js/battle/battle-engine.js');
const AI = require('../../assets/js/battle/battle-ai.js');
const Evaluator = require('../../assets/js/battle/battle-evaluator.js');
const TurnManager = require('../../assets/js/battle/turn-manager.js');
const MoveModel = require('../../assets/js/battle/move-model.js');
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
  isStatusConditionImmune,
  isEligibleForStatusCondition
} = require('../../assets/js/battle/battle-constants.js');

const PILOT_MOVES = {
  THUNDERBOLT: KNOWN_CATALOG_MOVES[85],
  FLAMETHROWER: KNOWN_CATALOG_MOVES[53],
  SLUDGE_BOMB: KNOWN_CATALOG_MOVES[188],
  POISON_JAB: KNOWN_CATALOG_MOVES[398],
  SCALD: KNOWN_CATALOG_MOVES[503]
};

const tackle = KNOWN_CATALOG_MOVES[33];
const swift = KNOWN_CATALOG_MOVES[129];

function makeMon(id, name, types, moves, stats = {}) {
  return {
    id,
    name,
    types,
    hp: stats.hp || 160,
    currentHp: stats.hp || 160,
    maxHp: stats.hp || 160,
    attack: stats.attack || 100,
    defense: stats.defense || 100,
    specialAttack: stats.specialAttack || 100,
    specialDefense: stats.specialDefense || 100,
    speed: stats.speed || 100,
    statusCondition: null,
    moves: moves.map(m => ({ ...m, currentPp: m.pp, maxPp: m.pp }))
  };
}

function makeAction(moveId, options = {}) {
  return {
    type: 'MOVE',
    moveId,
    accuracyRoll: 1, // hits by default
    damageRoll: 100, // max variance by default
    statusRoll: 100, // does not immobilize by default
    ...options
  };
}

test('P4-01: Definições canônicas explícitas e metadados dos cinco pilotos', () => {
  // Thunderbolt
  assert.equal(PILOT_MOVES.THUNDERBOLT.id, 85);
  assert.equal(PILOT_MOVES.THUNDERBOLT.name, 'thunderbolt');
  assert.equal(PILOT_MOVES.THUNDERBOLT.type, 'electric');
  assert.equal(PILOT_MOVES.THUNDERBOLT.power, 90);
  assert.equal(PILOT_MOVES.THUNDERBOLT.accuracy, 100);
  assert.equal(PILOT_MOVES.THUNDERBOLT.pp, 15);
  assert.equal(PILOT_MOVES.THUNDERBOLT.damageClass, 'special');
  const tbSec = getSecondaryEffect(PILOT_MOVES.THUNDERBOLT);
  assert.ok(tbSec);
  assert.equal(tbSec.statusCondition, 'paralysis');
  assert.equal(tbSec.chance, 10);
  assert.equal(tbSec.target, 'defender');

  // Flamethrower
  assert.equal(PILOT_MOVES.FLAMETHROWER.id, 53);
  assert.equal(PILOT_MOVES.FLAMETHROWER.name, 'flamethrower');
  assert.equal(PILOT_MOVES.FLAMETHROWER.type, 'fire');
  assert.equal(PILOT_MOVES.FLAMETHROWER.power, 90);
  assert.equal(PILOT_MOVES.FLAMETHROWER.accuracy, 100);
  assert.equal(PILOT_MOVES.FLAMETHROWER.pp, 15);
  assert.equal(PILOT_MOVES.FLAMETHROWER.damageClass, 'special');
  const ftSec = getSecondaryEffect(PILOT_MOVES.FLAMETHROWER);
  assert.ok(ftSec);
  assert.equal(ftSec.statusCondition, 'burn');
  assert.equal(ftSec.chance, 10);

  // Sludge Bomb
  assert.equal(PILOT_MOVES.SLUDGE_BOMB.id, 188);
  assert.equal(PILOT_MOVES.SLUDGE_BOMB.name, 'sludge-bomb');
  assert.equal(PILOT_MOVES.SLUDGE_BOMB.type, 'poison');
  assert.equal(PILOT_MOVES.SLUDGE_BOMB.power, 90);
  assert.equal(PILOT_MOVES.SLUDGE_BOMB.accuracy, 100);
  assert.equal(PILOT_MOVES.SLUDGE_BOMB.pp, 10);
  assert.equal(PILOT_MOVES.SLUDGE_BOMB.damageClass, 'special');
  const sbSec = getSecondaryEffect(PILOT_MOVES.SLUDGE_BOMB);
  assert.ok(sbSec);
  assert.equal(sbSec.statusCondition, 'poison');
  assert.equal(sbSec.chance, 30);

  // Poison Jab
  assert.equal(PILOT_MOVES.POISON_JAB.id, 398);
  assert.equal(PILOT_MOVES.POISON_JAB.name, 'poison-jab');
  assert.equal(PILOT_MOVES.POISON_JAB.type, 'poison');
  assert.equal(PILOT_MOVES.POISON_JAB.power, 80);
  assert.equal(PILOT_MOVES.POISON_JAB.accuracy, 100);
  assert.equal(PILOT_MOVES.POISON_JAB.pp, 20);
  assert.equal(PILOT_MOVES.POISON_JAB.damageClass, 'physical');
  const pjSec = getSecondaryEffect(PILOT_MOVES.POISON_JAB);
  assert.ok(pjSec);
  assert.equal(pjSec.statusCondition, 'poison');
  assert.equal(pjSec.chance, 30);

  // Scald
  assert.equal(PILOT_MOVES.SCALD.id, 503);
  assert.equal(PILOT_MOVES.SCALD.name, 'scald');
  assert.equal(PILOT_MOVES.SCALD.type, 'water');
  assert.equal(PILOT_MOVES.SCALD.power, 80);
  assert.equal(PILOT_MOVES.SCALD.accuracy, 100);
  assert.equal(PILOT_MOVES.SCALD.pp, 15);
  assert.equal(PILOT_MOVES.SCALD.damageClass, 'special');
  const scSec = getSecondaryEffect(PILOT_MOVES.SCALD);
  assert.ok(scSec);
  assert.equal(scSec.statusCondition, 'burn');
  assert.equal(scSec.chance, 30);

  // Validação dos registros em getMoveCapability
  const capTb = getMoveCapability(85);
  assert.equal(capTb.supportLevel, 'FULL');
  assert.ok(capTb.requiredMechanics.includes('SECONDARY_STATUS_CHANCE'));

  const capFt = getMoveCapability(53);
  assert.equal(capFt.supportLevel, 'FULL');
  assert.ok(capFt.requiredMechanics.includes('SECONDARY_STATUS_CHANCE'));

  const capSb = getMoveCapability(188);
  assert.equal(capSb.supportLevel, 'FULL');
  assert.ok(capSb.requiredMechanics.includes('SECONDARY_STATUS_CHANCE'));

  const capPj = getMoveCapability(398);
  assert.equal(capPj.supportLevel, 'FULL');
  assert.deepEqual(capPj.knownPending, []);
  assert.ok(capPj.requiredMechanics.includes('SECONDARY_STATUS_CHANCE'));

  const capSc = getMoveCapability(503);
  assert.equal(capSc.supportLevel, 'PARTIAL'); // Descongelamento não implementado no ciclo
  assert.ok(capSc.knownPending.includes('FREEZE_THAW_INTERACTION_PHASE_P4'));

  // validateMoveData aceita todos os cinco pilotos
  for (const move of Object.values(PILOT_MOVES)) {
    assert.ok(validateMoveData(move), `validateMoveData deve aceitar ${move.name}`);
  }
});

test('P4-02: Acerto com e sem aplicação de efeito secundário', () => {
  const pika = makeMon(25, 'pikachu', ['electric'], [PILOT_MOVES.THUNDERBOLT], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [tackle], { speed: 60, hp: 200 });

  // Com aplicação (roll <= 10)
  const battleHitWithStatus = Engine.createBattle(pika, blastoise);
  const resultHit = Engine.resolveTurn(battleHitWithStatus, {
    player: makeAction(85, { secondaryEffectRoll: 5 }),
    enemy: makeAction(33)
  });
  assert.equal(resultHit.state.enemy.statusCondition, 'paralysis');
  const appliedEvent = resultHit.events.find(e => e.type === BATTLE_EVENTS.STATUS_APPLIED);
  assert.ok(appliedEvent, 'STATUS_APPLIED deve ser emitido quando a rolagem atende a chance');
  assert.equal(appliedEvent.statusCondition, 'paralysis');
  assert.equal(appliedEvent.target, 'enemy');
  assert.equal(appliedEvent.chance, 10);
  assert.equal(appliedEvent.secondaryEffectRoll, 5);

  // Sem aplicação (roll > 10)
  const battleHitNoStatus = Engine.createBattle(pika, blastoise);
  const resultNoStatus = Engine.resolveTurn(battleHitNoStatus, {
    player: makeAction(85, { secondaryEffectRoll: 50 }),
    enemy: makeAction(33)
  });
  assert.equal(resultNoStatus.state.enemy.statusCondition, null);
  assert.equal(resultNoStatus.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), false);
});

test('P4-03: Limites rigorosos das rolagens de 10% e 30% (boundary tests)', () => {
  const charizard = makeMon(6, 'charizard', ['fire'], [PILOT_MOVES.FLAMETHROWER], { speed: 120 });
  const lapras = makeMon(131, 'lapras', ['water'], [PILOT_MOVES.SCALD, tackle], { speed: 60, hp: 300 });

  // Teste de 10% (Flamethrower): roll 1 aplica, roll 10 aplica, roll 11 NÃO aplica, roll 100 NÃO aplica
  for (const roll of [1, 10]) {
    const battle = Engine.createBattle(charizard, lapras);
    const res = Engine.resolveTurn(battle, {
      player: makeAction(53, { secondaryEffectRoll: roll }),
      enemy: makeAction(33)
    });
    assert.equal(res.state.enemy.statusCondition, 'burn', `Roll ${roll} deve aplicar queimadura (10%)`);
  }

  for (const roll of [11, 100]) {
    const battle = Engine.createBattle(charizard, lapras);
    const res = Engine.resolveTurn(battle, {
      player: makeAction(53, { secondaryEffectRoll: roll }),
      enemy: makeAction(33)
    });
    assert.equal(res.state.enemy.statusCondition, null, `Roll ${roll} NÃO deve aplicar queimadura (10%)`);
  }

  // Teste de 30% (Scald): roll 1 aplica, roll 30 aplica, roll 31 NÃO aplica, roll 100 NÃO aplica
  const waterMon = makeMon(131, 'lapras', ['water'], [PILOT_MOVES.SCALD], { speed: 120 });
  const normalMon = makeMon(143, 'snorlax', ['normal'], [tackle], { speed: 40, hp: 300 });

  for (const roll of [1, 30]) {
    const battle = Engine.createBattle(waterMon, normalMon);
    const res = Engine.resolveTurn(battle, {
      player: makeAction(503, { secondaryEffectRoll: roll }),
      enemy: makeAction(33)
    });
    assert.equal(res.state.enemy.statusCondition, 'burn', `Roll ${roll} deve aplicar queimadura (30%)`);
  }

  for (const roll of [31, 100]) {
    const battle = Engine.createBattle(waterMon, normalMon);
    const res = Engine.resolveTurn(battle, {
      player: makeAction(503, { secondaryEffectRoll: roll }),
      enemy: makeAction(33)
    });
    assert.equal(res.state.enemy.statusCondition, null, `Roll ${roll} NÃO deve aplicar queimadura (30%)`);
  }

  // Chamadas sem rolagem explícita (undefined): padrão seguro não aplica
  const battleNoRoll = Engine.createBattle(waterMon, normalMon);
  const resNoRoll = Engine.resolveTurn(battleNoRoll, {
    player: makeAction(503), // secondaryEffectRoll ausente
    enemy: makeAction(33)
  });
  assert.equal(resNoRoll.state.enemy.statusCondition, null, 'Rolagem ausente não deve aplicar efeito');

  // Rolagens fora dos limites legais (1..100) devem lançar erro
  const battleErr = Engine.createBattle(waterMon, normalMon);
  assert.throws(() => {
    Engine.resolveTurn(battleErr, {
      player: makeAction(503, { secondaryEffectRoll: 0 }),
      enemy: makeAction(33)
    });
  }, /Roll de efeito secundário inválido/);

  assert.throws(() => {
    Engine.resolveTurn(battleErr, {
      player: makeAction(503, { secondaryEffectRoll: 101 }),
      enemy: makeAction(33)
    });
  }, /Roll de efeito secundário inválido/);
});

test('P4-04: Erro (miss) e imunidade ao ataque não ativam efeito secundário', () => {
  const inaccurateThunderbolt = { ...PILOT_MOVES.THUNDERBOLT, accuracy: 85 };
  const pika = makeMon(25, 'pikachu', ['electric'], [inaccurateThunderbolt], { speed: 120 });
  const waterMon = makeMon(9, 'blastoise', ['water'], [tackle], { speed: 60, hp: 200 });
  const groundMon = makeMon(89, 'muk', ['ground'], [tackle], { speed: 60, hp: 200 });

  // 1. Erro de acurácia (miss): accuracyRoll 101 > 100
  const battleMiss = Engine.createBattle(pika, waterMon);
  const resMiss = Engine.resolveTurn(battleMiss, {
    player: makeAction(85, { accuracyRoll: 90, secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });
  assert.equal(resMiss.state.enemy.statusCondition, null);
  assert.ok(resMiss.events.some(e => e.type === BATTLE_EVENTS.MOVE_MISSED));
  assert.equal(resMiss.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), false);

  // 2. Imunidade elemental ao ataque elétrico (Ground é imune a Electric, multiplier = 0)
  const battleImmune = Engine.createBattle(pika, groundMon);
  const resImmune = Engine.resolveTurn(battleImmune, {
    player: makeAction(85, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });
  assert.equal(resImmune.state.enemy.statusCondition, null);
  assert.equal(resImmune.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), false);
  const effEvent = resImmune.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED);
  assert.equal(effEvent.multiplier, 0);
  assert.equal(effEvent.classification, 'IMMUNE');
});

test('P4-05: Imunidade específica à condição de status', () => {
  // Fire é imune à condição Burn
  const charizard = makeMon(6, 'charizard', ['fire'], [PILOT_MOVES.FLAMETHROWER], { speed: 120 });
  const arcanine = makeMon(59, 'arcanine', ['fire'], [tackle], { speed: 60, hp: 200 });
  const resBurn = Engine.resolveTurn(Engine.createBattle(charizard, arcanine), {
    player: makeAction(53, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });
  assert.equal(resBurn.state.enemy.statusCondition, null, 'Pokémon Fire não pode sofrer Burn');
  assert.equal(resBurn.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), false);

  // Electric é imune à condição Paralysis
  const pika = makeMon(25, 'pikachu', ['electric'], [PILOT_MOVES.THUNDERBOLT], { speed: 120 });
  const electabuzz = makeMon(125, 'electabuzz', ['electric'], [tackle], { speed: 60, hp: 200 });
  const resPara = Engine.resolveTurn(Engine.createBattle(pika, electabuzz), {
    player: makeAction(85, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });
  assert.equal(resPara.state.enemy.statusCondition, null, 'Pokémon Electric não pode sofrer Paralysis');
  assert.equal(resPara.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), false);

  // Poison e Steel são imunes à condição Poison
  const toxicroak = makeMon(454, 'toxicroak', ['fighting', 'poison'], [PILOT_MOVES.POISON_JAB], { speed: 120 });
  const gengar = makeMon(94, 'gengar', ['ghost', 'poison'], [tackle], { speed: 60, hp: 200 });
  const resPoi = Engine.resolveTurn(Engine.createBattle(toxicroak, gengar), {
    player: makeAction(398, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });
  assert.equal(resPoi.state.enemy.statusCondition, null, 'Pokémon Poison não pode ser envenenado');

  const steelix = makeMon(208, 'steelix', ['steel', 'ground'], [tackle], { speed: 60, hp: 200 });
  const resSteel = Engine.resolveTurn(Engine.createBattle(toxicroak, steelix), {
    player: makeAction(398, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });
  assert.equal(resSteel.state.enemy.statusCondition, null, 'Pokémon Steel não pode ser envenenado');
});

test('P4-06: Alvo Grass recebe veneno normalmente de ataque ofensivo (Sludge Bomb e Poison Jab)', () => {
  // Grass é imune a Poison Powder (golpe de pó), mas NÃO é imune à condição poison por ataques
  const gengar = makeMon(94, 'gengar', ['ghost', 'poison'], [PILOT_MOVES.SLUDGE_BOMB, PILOT_MOVES.POISON_JAB], { speed: 120 });
  const venusaur = makeMon(3, 'tangela', ['grass'], [tackle], { speed: 60, hp: 300 });

  // Sludge Bomb contra Grass
  const battleSb = Engine.createBattle(gengar, venusaur);
  const resSb = Engine.resolveTurn(battleSb, {
    player: makeAction(188, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });
  assert.equal(resSb.state.enemy.statusCondition, 'poison', 'Grass deve ser envenenado por Sludge Bomb');
  assert.ok(resSb.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.statusCondition === 'poison'));

  // Poison Jab contra Grass
  const battlePj = Engine.createBattle(gengar, venusaur);
  const resPj = Engine.resolveTurn(battlePj, {
    player: makeAction(398, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });
  assert.equal(resPj.state.enemy.statusCondition, 'poison', 'Grass deve ser envenenado por Poison Jab');
});

test('P4-07: Alvo com condição de status existente não é sobrescrito', () => {
  const charizard = makeMon(6, 'charizard', ['fire'], [PILOT_MOVES.FLAMETHROWER], { speed: 120 });
  const snorlax = makeMon(143, 'snorlax', ['normal'], [tackle], { speed: 60, hp: 300 });

  const battle = Engine.createBattle(charizard, snorlax);
  battle.enemy.statusCondition = 'paralysis'; // Já paralisado

  const res = Engine.resolveTurn(battle, {
    player: makeAction(53, { secondaryEffectRoll: 1 }), // Flamethrower com roll para queimar
    enemy: makeAction(33)
  });

  assert.equal(res.state.enemy.statusCondition, 'paralysis', 'Paralisia existente deve ser preservada');
  assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), false, 'Não deve emitir STATUS_APPLIED');
});

test('P4-08: Nocaute do alvo pelo ataque direto não aplica efeito secundário', () => {
  const pika = makeMon(25, 'pikachu', ['electric'], [PILOT_MOVES.THUNDERBOLT], { speed: 120, specialAttack: 250 });
  const weakMon = makeMon(9, 'blastoise', ['water'], [tackle], { speed: 60, hp: 10 }); // HP baixo, sofrerá KO

  const battle = Engine.createBattle(pika, weakMon);
  const res = Engine.resolveTurn(battle, {
    player: makeAction(85, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });

  assert.equal(res.state.enemy.currentHp, 0);
  assert.ok(res.events.some(e => e.type === BATTLE_EVENTS.POKEMON_FAINTED));
  assert.equal(res.events.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), false, 'Não deve aplicar status a Pokémon nocauteado');
});

test('P4-09: Consumo único e consistente de PP em acerto com ou sem status', () => {
  const pika = makeMon(25, 'pikachu', ['electric'], [PILOT_MOVES.THUNDERBOLT], { speed: 120 });
  const snorlax = makeMon(143, 'snorlax', ['normal'], [tackle], { speed: 60, hp: 300 });

  const battle = Engine.createBattle(pika, snorlax);
  const initialPp = pika.moves[0].currentPp;

  const res = Engine.resolveTurn(battle, {
    player: makeAction(85, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });

  assert.equal(res.state.player.moves[0].currentPp, initialPp - 1, 'PP deve ser reduzido exatamente em 1');
  const ppEvents = res.events.filter(e => e.type === BATTLE_EVENTS.PP_CHANGED && e.actor === 'player');
  assert.equal(ppEvents.length, 1, 'Deve emitir exatamente um evento PP_CHANGED');
});

test('P4-10: Rolagens independentes de precisão, dano e efeito secundário', () => {
  const charizard = makeMon(6, 'charizard', ['fire'], [PILOT_MOVES.FLAMETHROWER], { speed: 120 });
  const snorlax = makeMon(143, 'snorlax', ['normal'], [tackle], { speed: 60, hp: 300 });

  const battle = Engine.createBattle(charizard, snorlax);
  const res = Engine.resolveTurn(battle, {
    player: makeAction(53, { accuracyRoll: 50, damageRoll: 85, secondaryEffectRoll: 10 }),
    enemy: makeAction(33, { accuracyRoll: 1, damageRoll: 100, statusRoll: 50 })
  });

  const dmgEvent = res.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
  assert.equal(dmgEvent.damageRoll, 85);

  const statusEvent = res.events.find(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.source === 'player');
  assert.equal(statusEvent.secondaryEffectRoll, 10);
});

test('P4-11: Aplicação da queimadura antes da resposta física do alvo (dano reduzido à metade no mesmo turno)', () => {
  // Atacante rápido usa Flamethrower e queima o alvo físico
  const charizard = makeMon(6, 'charizard', ['fire'], [PILOT_MOVES.FLAMETHROWER], { speed: 120 });
  const machamp = makeMon(68, 'machamp', ['fighting'], [tackle], { speed: 60, attack: 130, hp: 300 });

  // 1. Dano físico sem queimadura
  const freshBattle = Engine.createBattle(charizard, machamp);
  const freshRes = Engine.resolveTurn(freshBattle, {
    player: makeAction(53, { secondaryEffectRoll: 100 }), // sem burn
    enemy: makeAction(33, { damageRoll: 100 })
  });
  const unburnedEnemyDmg = freshRes.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy').damage;

  // 2. Dano físico no mesmo turno em que a queimadura foi aplicada pelo primeiro ataque
  const burnBattle = Engine.createBattle(charizard, machamp);
  const burnRes = Engine.resolveTurn(burnBattle, {
    player: makeAction(53, { secondaryEffectRoll: 5 }), // queima
    enemy: makeAction(33, { damageRoll: 100 })
  });
  const burnedEnemyDmg = burnRes.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy').damage;

  assert.equal(burnRes.state.enemy.statusCondition, 'burn');
  assert.equal(burnedEnemyDmg, Math.floor(unburnedEnemyDmg / 2), 'Dano físico do defensor deve ser cortado pela metade no mesmo turno');
});

test('P4-12: Aplicação da paralisia antes da ação do alvo no mesmo turno com rolagens independentes', () => {
  const pika = makeMon(25, 'pikachu', ['electric'], [PILOT_MOVES.THUNDERBOLT], { speed: 120 });
  const machamp = makeMon(68, 'machamp', ['fighting'], [tackle], { speed: 60, hp: 300 });

  // Caso A: Paralisado pelo ataque, e statusRoll <= 25 impede sua ação
  const battleImmobilized = Engine.createBattle(pika, machamp);
  const resImmobilized = Engine.resolveTurn(battleImmobilized, {
    player: makeAction(85, { secondaryEffectRoll: 5 }), // paralisa
    enemy: makeAction(33, { statusRoll: 20 }) // statusRoll <= 25
  });
  assert.equal(resImmobilized.state.enemy.statusCondition, 'paralysis');
  assert.ok(resImmobilized.events.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy'));
  assert.equal(resImmobilized.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'), false);

  // Caso B: Paralisado pelo ataque, mas statusRoll > 25 permite agir
  const battleMoving = Engine.createBattle(pika, machamp);
  const resMoving = Engine.resolveTurn(battleMoving, {
    player: makeAction(85, { secondaryEffectRoll: 5 }), // paralisa
    enemy: makeAction(33, { statusRoll: 80 }) // statusRoll > 25
  });
  assert.equal(resMoving.state.enemy.statusCondition, 'paralysis');
  assert.ok(resMoving.events.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'));

  // No turno seguinte, velocidade efetiva é cortada pela metade
  assert.equal(TurnManager.effectiveSpeed(resMoving.state.enemy), Math.floor(machamp.speed / 2));
});

test('P4-13: Dano residual de veneno e queimadura ao fim do turno', () => {
  const gengar = makeMon(94, 'gengar', ['ghost', 'poison'], [PILOT_MOVES.SLUDGE_BOMB], { speed: 120 });
  const snorlax = makeMon(143, 'snorlax', ['normal'], [tackle], { speed: 60, hp: 160 });

  const battle = Engine.createBattle(gengar, snorlax);
  const res = Engine.resolveTurn(battle, {
    player: makeAction(188, { secondaryEffectRoll: 1 }), // envenena
    enemy: makeAction(33)
  });

  const poisonDmgEvent = res.events.find(e => e.type === BATTLE_EVENTS.STATUS_DAMAGE && e.target === 'enemy');
  assert.ok(poisonDmgEvent);
  assert.equal(poisonDmgEvent.statusCondition, 'poison');
  assert.equal(poisonDmgEvent.damage, Math.max(1, Math.floor(160 / 8))); // 1/8 do maxHp = 20
});

test('P4-14: Imutabilidade do estado e parâmetros de entrada', () => {
  const charizard = makeMon(6, 'charizard', ['fire'], [PILOT_MOVES.FLAMETHROWER], { speed: 120 });
  const blastoise = makeMon(9, 'blastoise', ['water'], [PILOT_MOVES.SCALD], { speed: 60, hp: 200 });

  const battle = Engine.createBattle(charizard, blastoise);
  const initialJson = JSON.stringify(battle);

  const playerAct = makeAction(53, { secondaryEffectRoll: 5 });
  const playerActJson = JSON.stringify(playerAct);

  Engine.resolveTurn(battle, { player: playerAct, enemy: makeAction(503) });

  assert.equal(JSON.stringify(battle), initialJson, 'Estado original não deve ser mutado');
  assert.equal(JSON.stringify(playerAct), playerActJson, 'Objeto de ação não deve ser mutado');
});

test('P4-15: Compatibilidade com estágios de atributos de P3', () => {
  // Lucario com Swords Dance (+2 Atk) e Poison Jab
  const lucario = makeMon(448, 'lucario', ['fighting', 'steel'], [
    Object.freeze({ id: 14, name: 'swords-dance', type: 'normal', power: 0, accuracy: null, pp: 20, damageClass: 'status', statBoosts: Object.freeze({ attack: 2 }) }),
    PILOT_MOVES.POISON_JAB
  ], { speed: 120, attack: 110 });

  const snorlax = makeMon(143, 'snorlax', ['normal'], [tackle], { speed: 60, hp: 400, defense: 100 });

  let state = Engine.createBattle(lucario, snorlax);

  // Turno 1: Swords Dance
  state = Engine.resolveTurn(state, {
    player: makeAction(14),
    enemy: makeAction(33)
  }).state;
  assert.equal(state.player.statStages.attack, 2);

  // Turno 2: Poison Jab com boost de ataque e efeito secundário
  const res = Engine.resolveTurn(state, {
    player: makeAction(398, { secondaryEffectRoll: 1 }),
    enemy: makeAction(33)
  });

  const dmgEvent = res.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
  // Attack efetivo deve ser floor(110 * (2 + 2) / 2) = 220
  assert.equal(dmgEvent.damage, 79, 'Dano com +2 Atk deve ser 79 (vs 40 sem boost)');
  assert.equal(res.state.enemy.statusCondition, 'poison');
});

test('P4-16: Concordância entre elegibilidade no motor e no avaliador tático', () => {
  const gengar = makeMon(94, 'gengar', ['ghost', 'poison'], [PILOT_MOVES.SLUDGE_BOMB]);
  const normalTarget = makeMon(143, 'snorlax', ['normal'], [tackle]);
  const steelTarget = makeMon(208, 'steelix', ['steel'], [tackle]);
  const statusedTarget = makeMon(143, 'snorlax', ['normal'], [tackle]);
  statusedTarget.statusCondition = 'burn';

  // 1. Alvo elegível
  const evalEligible = Evaluator.evaluateMove(gengar, normalTarget, PILOT_MOVES.SLUDGE_BOMB);
  assert.equal(evalEligible.isEligibleForSecondary, true);
  assert.equal(isEligibleForStatusCondition(normalTarget, 'poison'), true);
  assert.ok(evalEligible.expectedStatusBenefit > 0);

  // 2. Alvo imune à condição
  const evalImmune = Evaluator.evaluateMove(gengar, steelTarget, PILOT_MOVES.SLUDGE_BOMB);
  assert.equal(evalImmune.isEligibleForSecondary, false);
  assert.equal(isEligibleForStatusCondition(steelTarget, 'poison'), false);
  assert.equal(evalImmune.expectedStatusBenefit, 0);

  // 3. Alvo já com status
  const evalStatused = Evaluator.evaluateMove(gengar, statusedTarget, PILOT_MOVES.SLUDGE_BOMB);
  assert.equal(evalStatused.isEligibleForSecondary, false);
  assert.equal(isEligibleForStatusCondition(statusedTarget, 'poison'), false);
  assert.equal(evalStatused.expectedStatusBenefit, 0);
});

test('P4-17: Decisões válidas da IA considerando efeitos secundários', () => {
  // Cenário: Lapras possui dois golpes de poder similar contra um alvo neutro:
  // Surf (90 power, sem efeito) e Scald (80 power, 30% burn)
  const surf = KNOWN_CATALOG_MOVES[57];
  const scald = PILOT_MOVES.SCALD;
  const lapras = makeMon(131, 'lapras', ['water'], [scald, surf], { speed: 100, specialAttack: 100 });
  const physicalThreat = makeMon(68, 'machamp', ['fighting'], [tackle], { speed: 50, attack: 130, hp: 300 });

  const battleState = Engine.createBattle(physicalThreat, lapras);

  // A IA escolhe a ação de 'enemy' (Lapras)
  const decision = AI.chooseAction(battleState, 'enemy', { strategy: 'SMART' });
  assert.equal(decision.action.type, 'MOVE');
  // Scald deve pontuar bem devido ao bônus tático de queimadura contra ameaça física
  const evalScald = Evaluator.evaluateMove(lapras, physicalThreat, scald);
  assert.ok(evalScald.expectedStatusBenefit > 0);

  // Se o alvo já está queimado, o bônus de status zera e a IA escolhe pelo maior dano direto (Surf)
  battleState.player.statusCondition = 'burn';
  const decisionAgainstBurned = AI.chooseAction(battleState, 'enemy', { strategy: 'SMART' });
  assert.equal(decisionAgainstBurned.action.moveId, surf.id, 'Contra alvo já queimado, deve escolher o maior dano direto');
});

test('P4-18: Mapeamento de apresentação e eventos da interface', () => {
  const events = [
    {
      type: BATTLE_EVENTS.STATUS_APPLIED,
      source: 'player',
      target: 'enemy',
      pokemonName: 'Blastoise',
      statusCondition: 'paralysis',
      moveId: 85,
      moveName: 'thunderbolt',
      secondaryEffectRoll: 5,
      chance: 10
    }
  ];

  const commands = Mapper.mapEvents(events);
  assert.equal(commands.length, 1);
  assert.equal(commands[0].type, 'STATUS_FEEDBACK');
  assert.equal(commands[0].outcome, 'APPLIED');
  assert.equal(commands[0].statusCondition, 'paralysis');
  assert.equal(commands[0].pokemonName, 'Blastoise');

  // Validação das mensagens geradas pelo adapter
  const messages = [];
  const badges = [];
  const mockView = {
    displayMessage: msg => messages.push(msg),
    updateStatusBadge: (target, cond) => badges.push({ target, cond })
  };
  const adapter = new BattleUiDomAdapter({ view: mockView });
  adapter.execute(commands[0]);

  assert.equal(badges.length, 1);
  assert.equal(badges[0].target, 'enemy');
  assert.equal(badges[0].cond, 'paralysis');
  assert.ok(messages.some(m => m.includes('sofreu paralisia')));
});
