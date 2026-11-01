const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const BattleEngine = require('../../assets/js/battle/battle-engine.js');
const BattleEvaluator = require('../../assets/js/battle/battle-evaluator.js');
const DamageCalculator = require('../../assets/js/battle/damage-calculator.js');
const TurnManager = require('../../assets/js/battle/turn-manager.js');
const BattleConstants = require('../../assets/js/battle/battle-constants.js');
const {
  BATTLE_EVENTS,
  BATTLE_STATUS,
  SWITCH_REASON,
  MOVE_SUPPORT_LEVEL,
  targetsDefenseWithSpAtk,
  isDualTypeEffectiveness,
  getDrainRatio,
  getRecoilRatio,
  getMovePriority,
  isForcedSwitchMove,
  getMoveCapability,
  CANONICAL_MOVE_DEFINITIONS,
  KNOWN_CATALOG_MOVES
} = BattleConstants;
const {
  isMechanicallySupportedMove,
  UNSUPPORTED_COMPLEX_MOVES
} = require('../../assets/js/battle-session/battle-session-constants.js');
const PresentationMapper = require('../../assets/js/presentation/battle-presentation-mapper.js');
const { PRESENTATION_COMMANDS } = require('../../assets/js/presentation/battle-presentation-constants.js');
const FallbackCatalog = require('../../assets/js/campaign/campaign-battle-fallback-catalog.js');
const ExpandedCatalog = require('../../assets/js/expanded-pokemon-catalog.js');

// Fixtures para os testes
const psystrikeMove = Object.freeze({ id: 540, name: 'psystrike', type: 'psychic', power: 100, accuracy: 100, pp: 10, damageClass: 'special' });
const psychicMove = Object.freeze({ id: 94, name: 'psychic', type: 'psychic', power: 90, accuracy: 100, pp: 10, damageClass: 'special' });
const flyingPressMove = Object.freeze({ id: 560, name: 'flying-press', type: 'fighting', power: 100, accuracy: 95, pp: 10, damageClass: 'physical' });
const quickAttackMove = Object.freeze({ id: 98, name: 'quick-attack', type: 'normal', power: 40, accuracy: 100, pp: 30, damageClass: 'physical' });
const extremeSpeedMove = Object.freeze({ id: 245, name: 'extreme-speed', type: 'normal', power: 80, accuracy: 100, pp: 5, damageClass: 'physical' });
const tackleMove = Object.freeze({ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, damageClass: 'physical' });
const dragonTailMove = Object.freeze({ id: 525, name: 'dragon-tail', type: 'dragon', power: 60, accuracy: 90, pp: 10, damageClass: 'physical' });
const gigaDrainMove = Object.freeze({ id: 202, name: 'giga-drain', type: 'grass', power: 75, accuracy: 100, pp: 10, damageClass: 'special' });
const drainingKissMove = Object.freeze({ id: 577, name: 'draining-kiss', type: 'fairy', power: 50, accuracy: 100, pp: 10, damageClass: 'special' });
const lightOfRuinMove = Object.freeze({ id: 617, name: 'light-of-ruin', type: 'fairy', power: 140, accuracy: 90, pp: 5, damageClass: 'special' });

function createTestCombatant(id, name, types, stats, moves, currentHp = null) {
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
    moves: moves.map(m => ({ ...m, currentPp: m.pp, maxPp: m.pp }))
  };
}

describe('FASE P0 — Capacidades, Auditoria e Registros de Golpes', () => {
  test('P0-01: Aliases canônicos nature-s-madness e natures-madness constam em UNSUPPORTED_COMPLEX_MOVES', () => {
    assert.ok(UNSUPPORTED_COMPLEX_MOVES['nature-s-madness']);
    assert.ok(UNSUPPORTED_COMPLEX_MOVES['natures-madness']);
    assert.equal(UNSUPPORTED_COMPLEX_MOVES['natures-madness'].category, 'UNSUPPORTED_FIXED_OR_HP_DAMAGE');
    assert.equal(UNSUPPORTED_COMPLEX_MOVES['natures-madness'].reason, 'HALF_TARGET_CURRENT_HP');
  });

  test('P0-02: getMoveCapability retorna definições corretas para golpes de mecânicas especiais', () => {
    const capPsystrike = getMoveCapability(psystrikeMove);
    assert.equal(capPsystrike.targetsDefenseWithSpAtk, true);
    assert.equal(capPsystrike.priority, 0);

    const capFlyingPress = getMoveCapability(flyingPressMove);
    assert.equal(capFlyingPress.isDualTypeEffectiveness, true);

    const capQuickAttack = getMoveCapability(quickAttackMove);
    assert.equal(capQuickAttack.priority, 1);

    const capDragonTail = getMoveCapability(dragonTailMove);
    assert.equal(capDragonTail.priority, -6);
    assert.equal(capDragonTail.isForcedSwitch, true);

    const capGigaDrain = getMoveCapability(gigaDrainMove);
    assert.equal(capGigaDrain.drainRatio, 0.5);

    const capLightOfRuin = getMoveCapability(lightOfRuinMove);
    assert.equal(capLightOfRuin.recoilRatio, 0.5);
  });

  test('P0-03: shell-trap e beak-blast usam preparação P5 implementada',()=>{
    for(const id of [690,704]){
      const move=require('../../assets/js/battle/battle-constants').KNOWN_CATALOG_MOVES[id];
      assert.equal(UNSUPPORTED_COMPLEX_MOVES[move.name],undefined);
      assert.equal(getMoveCapability(move).supportLevel,MOVE_SUPPORT_LEVEL.FULL);
      assert.equal(isMechanicallySupportedMove(move),true);
      assert.equal(isMechanicallySupportedMove({name:move.name}),false,'Payload incompleto continua rejeitado');
    }
  });

  test('P0-04: Toucannon (#733) e Turtonator (#776) utilizam conjuntos 100% suportados nos catálogos', () => {
    const fallbackToucannon = FallbackCatalog.byId[733];
    assert.ok(fallbackToucannon);
    assert.equal(fallbackToucannon.moves.length, 4);
    for (const move of fallbackToucannon.moves) {
      assert.ok(isMechanicallySupportedMove(move), `Golpe ${move.name} do Toucannon deve ser suportado`);
      assert.notEqual(move.name, 'beak-blast');
    }

    const fallbackTurtonator = FallbackCatalog.byId[776];
    assert.ok(fallbackTurtonator);
    assert.equal(fallbackTurtonator.moves.length, 4);
    for (const move of fallbackTurtonator.moves) {
      assert.ok(isMechanicallySupportedMove(move), `Golpe ${move.name} do Turtonator deve ser suportado`);
      assert.notEqual(move.name, 'shell-trap');
    }

    const expandedTurtonator = ExpandedCatalog.byId[776];
    assert.ok(expandedTurtonator);
    for (const move of expandedTurtonator.moves) {
      assert.ok(isMechanicallySupportedMove(move));
      assert.notEqual(move.name, 'shell-trap');
    }
  });
});

describe('FASE P1 — Ordem, Prioridade e Seletores de Dano', () => {
  test('P1-01: Quick Attack (+1) age antes de um golpe comum mesmo com usuário mais lento', () => {
    const slowAttacker = createTestCombatant(1, 'Slowpoke', ['water'], { hp: 100, speed: 20 }, [quickAttackMove]);
    const fastAttacker = createTestCombatant(2, 'Electrode', ['electric'], { hp: 100, speed: 140 }, [tackleMove]);

    const order = TurnManager.determineOrder(
      slowAttacker,
      fastAttacker,
      { moveId: quickAttackMove.id },
      { moveId: tackleMove.id }
    );
    assert.deepEqual(order, ['player', 'enemy'], 'Quick Attack (+1) deve agir antes de Tackle (0)');
  });

  test('P1-02: Extreme Speed (+2) age antes de Quick Attack (+1)', () => {
    const p1 = createTestCombatant(1, 'Arcanine', ['fire'], { hp: 100, speed: 80 }, [extremeSpeedMove]);
    const p2 = createTestCombatant(2, 'Pikachu', ['electric'], { hp: 100, speed: 100 }, [quickAttackMove]);

    const order = TurnManager.determineOrder(
      p1,
      p2,
      { moveId: extremeSpeedMove.id },
      { moveId: quickAttackMove.id }
    );
    assert.deepEqual(order, ['player', 'enemy'], 'Extreme Speed (+2) deve superar Quick Attack (+1)');
  });

  test('P1-03: Dragon Tail (-6) age depois de um golpe comum', () => {
    const fastDragon = createTestCombatant(1, 'Dragonite', ['dragon'], { hp: 100, speed: 100 }, [dragonTailMove]);
    const slowDefender = createTestCombatant(2, 'Snorlax', ['normal'], { hp: 100, speed: 30 }, [tackleMove]);

    const order = TurnManager.determineOrder(
      fastDragon,
      slowDefender,
      { moveId: dragonTailMove.id },
      { moveId: tackleMove.id }
    );
    assert.deepEqual(order, ['enemy', 'player'], 'Dragon Tail (-6) deve agir depois de Tackle (0)');
  });

  test('P1-04: Psystrike utiliza Special Attack do atacante contra Defense (Física) do defensor', () => {
    const defender = createTestCombatant(2, 'Blissey', ['normal'], { hp: 300, defense: 40, specialDefense: 200, speed: 30 }, [tackleMove]);
    const attacker = createTestCombatant(1, 'Mewtwo', ['psychic'], { hp: 200, specialAttack: 154, speed: 130 }, [psystrikeMove, psychicMove]);

    const battle = BattleEngine.createBattle(attacker, defender);
    const { events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: psystrikeMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const damageEvent = events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.ok(damageEvent);

    const expectedBaseDamage = DamageCalculator.calculateBaseDamage(attacker.specialAttack, defender.defense, psystrikeMove.power);
    assert.equal(damageEvent.baseDamage, expectedBaseDamage);

    const evalResult = BattleEvaluator.evaluateMove(attacker, defender, psystrikeMove);
    assert.equal(evalResult.defenseStat, defender.defense);
    assert.equal(evalResult.baseDamage, expectedBaseDamage);

    const psychicEval = BattleEvaluator.evaluateMove(attacker, defender, psychicMove);
    assert.equal(psychicEval.defenseStat, defender.specialDefense);
    assert.ok(evalResult.expectedDamage > psychicEval.expectedDamage * 2, 'Psystrike contra Blissey deve causar mais que o dobro de Psychic');
  });

  test('P1-05: Flying Press aplica eficácia combinada Fighting + Flying com respeito a imunidades', () => {
    const hawlucha = createTestCombatant(1, 'Hawlucha', ['fighting', 'flying'], { hp: 200, attack: 100, speed: 100 }, [flyingPressMove]);

    // Caso 1: Defensor Ghost -> Imunidade de Fighting resulta em multiplicador 0
    const ghostDefender = createTestCombatant(2, 'Gengar', ['ghost', 'poison'], { hp: 150, defense: 80, speed: 50 }, [tackleMove]);
    const evalGhost = BattleEvaluator.evaluateMove(hawlucha, ghostDefender, flyingPressMove);
    assert.equal(evalGhost.typeMultiplier, 0);

    const battleGhost = BattleEngine.createBattle(hawlucha, ghostDefender);
    const resGhost = BattleEngine.resolveTurn(battleGhost, {
      player: { moveId: flyingPressMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });
    const effGhost = resGhost.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'player');
    assert.equal(effGhost.multiplier, 0);
    assert.equal(effGhost.classification, 'IMMUNE');

    // Caso 2: Defensor Grass/Poison -> Fighting (0.5x) * Flying (2.0x) = 1.0x (Neutro)
    const grassPoison = createTestCombatant(3, 'Venusaur', ['grass', 'poison'], { hp: 160, defense: 83, speed: 50 }, [tackleMove]);
    const evalGrassPoison = BattleEvaluator.evaluateMove(hawlucha, grassPoison, flyingPressMove);
    assert.equal(evalGrassPoison.typeMultiplier, 1.0);

    // Caso 3: Defensor Normal -> Fighting (2.0x) * Flying (1.0x) = 2.0x (Super Effective)
    const normalDefender = createTestCombatant(4, 'Snorlax', ['normal'], { hp: 200, defense: 65, speed: 30 }, [tackleMove]);
    const evalNormal = BattleEvaluator.evaluateMove(hawlucha, normalDefender, flyingPressMove);
    assert.equal(evalNormal.typeMultiplier, 2.0);

    // Caso 4: STAB Fighting é aplicado ao Hawlucha (Fighting/Flying)
    assert.equal(evalNormal.stabMultiplier, 1.5);
  });

  test('P1-06: Dragon Tail força troca do defensor em batalha 3v3 se o defensor sobrevive', () => {
    const dragonUser = createTestCombatant(1, 'Dragonite', ['dragon', 'flying'], { hp: 200, attack: 130, speed: 90 }, [dragonTailMove]);
    const ally2 = createTestCombatant(4, 'Charizard', ['fire', 'flying'], { hp: 180, attack: 100, speed: 90 }, [tackleMove]);
    const ally3 = createTestCombatant(5, 'Blastoise', ['water'], { hp: 180, attack: 100, speed: 70 }, [tackleMove]);

    const activeEnemy = createTestCombatant(2, 'Pikachu', ['electric'], { hp: 250, defense: 80, speed: 70 }, [tackleMove]);
    const benchEnemy1 = createTestCombatant(3, 'Raichu', ['electric'], { hp: 180, defense: 75, speed: 85 }, [tackleMove]);
    const benchEnemy2 = createTestCombatant(6, 'Jolteon', ['electric'], { hp: 160, defense: 70, speed: 110 }, [tackleMove]);

    const playerTeam = [dragonUser, ally2, ally3];
    const enemyTeam = [activeEnemy, benchEnemy1, benchEnemy2];

    const battle = BattleEngine.createTeamBattle(playerTeam, enemyTeam);
    const { state, events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: dragonTailMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const switchEvent = events.find(e => e.type === BATTLE_EVENTS.POKEMON_SWITCHED && e.side === 'enemy');
    assert.ok(switchEvent, 'Deve emitir evento POKEMON_SWITCHED para o inimigo');
    assert.equal(switchEvent.reason, SWITCH_REASON.FORCED);
    assert.equal(switchEvent.newPokemonId, benchEnemy1.id);
    assert.equal(state.enemy.activeIndex, 1, 'Banco deve se tornar o novo ativo do inimigo');
  });

  test('P1-07: Troca forçada desconsidera a ação pendente do Pokémon substituído em 3v3', () => {
    const fastPlayer = createTestCombatant(1, 'Dragonite-Fast', ['dragon'], { hp: 200, attack: 120, speed: 100 }, [dragonTailMove]);
    const playerAlly2 = createTestCombatant(2, 'Charizard', ['fire'], { hp: 150, speed: 80 }, [tackleMove]);
    const playerAlly3 = createTestCombatant(3, 'Blastoise', ['water'], { hp: 150, speed: 70 }, [tackleMove]);

    const slowEnemy = createTestCombatant(4, 'Kommo-o-Slow', ['dragon'], { hp: 200, attack: 110, defense: 80, speed: 50 }, [dragonTailMove]);
    const enemyBench1 = createTestCombatant(5, 'Tyranitar', ['rock'], { hp: 180, defense: 90, speed: 60 }, [tackleMove]);
    const enemyBench2 = createTestCombatant(6, 'Salamence', ['dragon'], { hp: 180, defense: 80, speed: 100 }, [dragonTailMove]);

    const battle = BattleEngine.createTeamBattle([fastPlayer, playerAlly2, playerAlly3], [slowEnemy, enemyBench1, enemyBench2]);

    const initialEnemyPp = slowEnemy.moves[0].currentPp;
    const initialBenchPp = enemyBench1.moves[0].currentPp;

    const { state, events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: dragonTailMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: dragonTailMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const damageEvents = events.filter(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED);
    assert.equal(damageEvents.length, 1, 'Apenas o primeiro golpe deve ter sido executado');
    assert.equal(damageEvents[0].source, 'player');

    const switchEvent = events.find(e => e.type === BATTLE_EVENTS.POKEMON_SWITCHED && e.side === 'enemy');
    assert.ok(switchEvent);
    assert.equal(switchEvent.reason, SWITCH_REASON.FORCED);
    assert.equal(state.enemy.activeIndex, 1);
    assert.equal(state.enemy.team[1].id, enemyBench1.id);

    assert.equal(slowEnemy.moves[0].currentPp, initialEnemyPp, 'Ação pendente cancelada não deve consumir PP do combatente substituído');
    assert.equal(enemyBench1.moves[0].currentPp, initialBenchPp, 'Substituto arrastado pelo Dragon Tail não deve consumir PP nem agir');
  });

  test('P1-08: Substituto que também possui o mesmo golpe não herda nem executa a ação cancelada', () => {
    const fastPlayer = createTestCombatant(1, 'Goodra', ['dragon'], { hp: 200, attack: 100, speed: 90 }, [dragonTailMove]);
    const pAlly2 = createTestCombatant(2, 'Gengar', ['ghost'], { hp: 120, speed: 110 }, [tackleMove]);
    const pAlly3 = createTestCombatant(3, 'Alakazam', ['psychic'], { hp: 120, speed: 120 }, [tackleMove]);

    const slowEnemy = createTestCombatant(4, 'Drampa', ['dragon', 'normal'], { hp: 200, defense: 70, speed: 30 }, [dragonTailMove]);
    const enemyBenchWithDragonTail = createTestCombatant(5, 'Haxorus', ['dragon'], { hp: 160, defense: 70, speed: 97 }, [dragonTailMove]);
    const enemyBenchOther = createTestCombatant(6, 'Flygon', ['dragon'], { hp: 160, defense: 70, speed: 100 }, [tackleMove]);

    const battle = BattleEngine.createTeamBattle([fastPlayer, pAlly2, pAlly3], [slowEnemy, enemyBenchWithDragonTail, enemyBenchOther]);

    const { state, events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: dragonTailMove.id, accuracyRoll: 1, damageRoll: 100, forcedSwitchIndex: 1 },
      enemy: { moveId: dragonTailMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    assert.equal(state.enemy.activeIndex, 1);
    assert.equal(state.enemy.team[1].name, 'haxorus');
    assert.equal(enemyBenchWithDragonTail.moves[0].currentPp, enemyBenchWithDragonTail.moves[0].maxPp, 'Substituto com Dragon Tail não deve ter executado ação');

    const enemyDamages = events.filter(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy');
    assert.equal(enemyDamages.length, 0, 'Inimigo não deve ter causado dano neste turno');
  });

  test('P1-09: Dragon Tail contra alvo sem banco consciente não força troca e alvo age normalmente', () => {
    const player = createTestCombatant(1, 'Dragonite', ['dragon'], { hp: 200, speed: 90 }, [dragonTailMove]);
    const p2 = createTestCombatant(2, 'Mon2', ['normal'], { hp: 100, speed: 50 }, [tackleMove]);
    const p3 = createTestCombatant(3, 'Mon3', ['normal'], { hp: 100, speed: 50 }, [tackleMove]);

    const enemyActive = createTestCombatant(4, 'Pikachu', ['electric'], { hp: 200, speed: 80 }, [tackleMove]);
    const faintedBench1 = createTestCombatant(5, 'Fainted1', ['normal'], { hp: 100, speed: 50 }, [tackleMove], 0);
    const faintedBench2 = createTestCombatant(6, 'Fainted2', ['normal'], { hp: 100, speed: 50 }, [tackleMove], 0);

    const battle = BattleEngine.createTeamBattle([player, p2, p3], [enemyActive, faintedBench1, faintedBench2]);

    const { events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: dragonTailMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const switchEvent = events.find(e => e.type === BATTLE_EVENTS.POKEMON_SWITCHED);
    assert.equal(switchEvent, undefined, 'Não deve ocorrer troca forçada se não há reservas conscientes');

    const enemyTackle = events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy');
    assert.ok(enemyTackle, 'Inimigo deve agir normalmente quando não forçado a trocar');
  });

  test('P1-10: Dragon Tail contra imunidade (Fairy) não causa dano e não força troca', () => {
    const dragonUser = createTestCombatant(1, 'Dragonite', ['dragon'], { hp: 200, attack: 130, speed: 90 }, [dragonTailMove]);
    const pAlly2 = createTestCombatant(2, 'Ally2', ['normal'], { hp: 100, speed: 50 }, [tackleMove]);
    const pAlly3 = createTestCombatant(3, 'Ally3', ['normal'], { hp: 100, speed: 50 }, [tackleMove]);

    const fairyActive = createTestCombatant(4, 'Clefable', ['fairy'], { hp: 200, speed: 60 }, [tackleMove]);
    const enemyBench1 = createTestCombatant(5, 'Togekiss', ['fairy', 'flying'], { hp: 150, speed: 80 }, [tackleMove]);
    const enemyBench2 = createTestCombatant(6, 'Gardevoir', ['psychic', 'fairy'], { hp: 150, speed: 80 }, [tackleMove]);

    const battle = BattleEngine.createTeamBattle([dragonUser, pAlly2, pAlly3], [fairyActive, enemyBench1, enemyBench2]);

    const { state, events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: dragonTailMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const effEvent = events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'player');
    assert.equal(effEvent.multiplier, 0);
    assert.equal(effEvent.classification, 'IMMUNE');

    const switchEvent = events.find(e => e.type === BATTLE_EVENTS.POKEMON_SWITCHED);
    assert.equal(switchEvent, undefined, 'Imunidade impede dano e impede troca forçada');
    assert.equal(state.enemy.activeIndex, 0, 'Defensor permaneceu em campo');
  });
});

describe('FASE P2 — Efeitos de HP: Drenagem e Recuo', () => {
  test('P2-01: Giga Drain recupera 50% do dano causado, respeitando o maxHp do usuário', () => {
    const attacker = createTestCombatant(1, 'Vileplume', ['grass', 'poison'], { hp: 100, specialAttack: 110, speed: 50 }, [gigaDrainMove], 40);
    const defender = createTestCombatant(2, 'Swampert', ['water', 'ground'], { hp: 200, specialDefense: 90, speed: 40 }, [tackleMove]);

    const battle = BattleEngine.createBattle(attacker, defender);
    const { events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: gigaDrainMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const damageEvent = events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    const drainEvent = events.find(e => e.type === BATTLE_EVENTS.DRAIN_APPLIED && e.target === 'player');

    assert.ok(damageEvent);
    assert.ok(drainEvent);

    const expectedHeal = Math.min(attacker.maxHp - 40, Math.floor(damageEvent.damage * 0.5));
    assert.equal(drainEvent.healedAmount, expectedHeal);
    assert.equal(drainEvent.currentHp, 40 + expectedHeal);

    const commands = PresentationMapper.mapEvent(drainEvent);
    assert.equal(commands[0].type, PRESENTATION_COMMANDS.HP_TRANSITION);
    assert.equal(commands[0].cause, 'drain');
  });

  test('P2-02: Draining Kiss recupera 75% do dano causado', () => {
    const attacker = createTestCombatant(1, 'Togekiss', ['fairy'], { hp: 150, specialAttack: 120, speed: 80 }, [drainingKissMove], 50);
    const defender = createTestCombatant(2, 'Machamp', ['fighting'], { hp: 200, specialDefense: 80, speed: 40 }, [tackleMove]);

    const battle = BattleEngine.createBattle(attacker, defender);
    const { events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: drainingKissMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const damageEvent = events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    const drainEvent = events.find(e => e.type === BATTLE_EVENTS.DRAIN_APPLIED && e.target === 'player');

    assert.ok(damageEvent);
    assert.ok(drainEvent);
    const expectedHeal = Math.min(attacker.maxHp - 50, Math.floor(damageEvent.damage * 0.75));
    assert.equal(drainEvent.healedAmount, expectedHeal);
  });

  test('P2-03: Light of Ruin aplica 50% de dano de recuo ao usuário quando alvo tem HP suficiente', () => {
    const floette = createTestCombatant(1, 'Floette-Eternal', ['fairy'], { hp: 150, specialAttack: 125, speed: 90 }, [lightOfRuinMove], 150);
    const defender = createTestCombatant(2, 'Garchomp', ['dragon', 'ground'], { hp: 500, specialDefense: 85, speed: 60 }, [tackleMove]);

    const battle = BattleEngine.createBattle(floette, defender);
    const { events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: lightOfRuinMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const damageEvent = events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    const recoilEvent = events.find(e => e.type === BATTLE_EVENTS.RECOIL_APPLIED && e.target === 'player');

    assert.ok(damageEvent);
    assert.ok(recoilEvent);
    const expectedRecoil = Math.floor(damageEvent.damage * 0.5);
    assert.equal(recoilEvent.damage, expectedRecoil);
    assert.equal(recoilEvent.currentHp, 150 - expectedRecoil);

    const commands = PresentationMapper.mapEvent(recoilEvent);
    assert.equal(commands[0].type, PRESENTATION_COMMANDS.HP_TRANSITION);
    assert.equal(commands[0].cause, 'recoil');
  });

  test('P2-04: Nocaute pelo recuo é resolvido corretamente se o usuário zerar seu HP', () => {
    const floette = createTestCombatant(1, 'Floette-Eternal', ['fairy'], { hp: 100, specialAttack: 125, speed: 90 }, [lightOfRuinMove], 10);
    const defender = createTestCombatant(2, 'Snorlax', ['normal'], { hp: 300, specialDefense: 110, speed: 30 }, [tackleMove]);

    const battle = BattleEngine.createBattle(floette, defender);
    const { state, events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: lightOfRuinMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const faintEvent = events.find(e => e.type === BATTLE_EVENTS.POKEMON_FAINTED && e.target === 'player');
    assert.ok(faintEvent, 'O atacante deve desmaiar após sofrer recuo fatal');
    assert.equal(state.player.currentHp, 0);
    assert.equal(state.status, BATTLE_STATUS.ENEMY_WIN);
  });

  test('P2-05: Giga Drain contra alvo de 1 HP cura exatamente 1 HP (sem excedente)', () => {
    const attacker = createTestCombatant(1, 'Vileplume', ['grass'], { hp: 100, specialAttack: 100, speed: 50 }, [gigaDrainMove], 50);
    const defender1Hp = createTestCombatant(2, 'Target-1Hp', ['water'], { hp: 100, specialDefense: 50, speed: 40 }, [tackleMove], 1);

    const battle = BattleEngine.createBattle(attacker, defender1Hp);
    const { state, events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: gigaDrainMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const drainEvent = events.find(e => e.type === BATTLE_EVENTS.DRAIN_APPLIED && e.target === 'player');
    assert.ok(drainEvent);
    assert.equal(drainEvent.healedAmount, 1, 'Cura de drenagem deve ser limitada ao dano efetivamente causado (1 HP)');
    assert.equal(state.player.currentHp, 51, 'Atacante deve ter recuperado apenas 1 HP');

    const evalResult = BattleEvaluator.evaluateMove(attacker, defender1Hp, gigaDrainMove);
    assert.equal(evalResult.expectedHeal, 1, 'BattleEvaluator deve prever exatamente 1 HP de cura');
  });

  test('P2-06: Light of Ruin contra alvo de 1 HP causa exatamente 1 HP de recuo ao atacante', () => {
    const floette = createTestCombatant(1, 'Floette', ['fairy'], { hp: 100, specialAttack: 125, speed: 90 }, [lightOfRuinMove], 100);
    const defender1Hp = createTestCombatant(2, 'Dragon-1Hp', ['dragon'], { hp: 100, specialDefense: 50, speed: 40 }, [tackleMove], 1);

    const battle = BattleEngine.createBattle(floette, defender1Hp);
    const { state, events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: lightOfRuinMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const recoilEvent = events.find(e => e.type === BATTLE_EVENTS.RECOIL_APPLIED && e.target === 'player');
    assert.ok(recoilEvent);
    assert.equal(recoilEvent.damage, 1, 'Recuo deve ser limitado ao dano efetivamente causado no alvo (1 HP)');
    assert.equal(state.player.currentHp, 99, 'Floette perdeu exatamente 1 HP');

    const evalResult = BattleEvaluator.evaluateMove(floette, defender1Hp, lightOfRuinMove);
    assert.equal(evalResult.expectedRecoil, 1, 'BattleEvaluator deve prever exatamente 1 HP de recuo');
  });

  test('P2-07: Usuário perto do HP máximo (99/100) tem cura de drenagem truncada no maxHp', () => {
    const attacker = createTestCombatant(1, 'Venusaur', ['grass'], { hp: 100, specialAttack: 100, speed: 50 }, [gigaDrainMove], 99);
    const defender = createTestCombatant(2, 'Swampert', ['water'], { hp: 100, specialDefense: 50, speed: 40 }, [tackleMove], 100);

    const battle = BattleEngine.createBattle(attacker, defender);
    const { state, events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: gigaDrainMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const drainEvent = events.find(e => e.type === BATTLE_EVENTS.DRAIN_APPLIED && e.target === 'player');
    assert.ok(drainEvent);
    assert.equal(drainEvent.healedAmount, 1, 'Cura real deve ser de 1 HP para alcançar o teto');
    assert.equal(state.player.currentHp, 100, 'HP do usuário não pode ultrapassar maxHp');
  });

  test('P2-08: Erro no golpe resulta em 0 dano, 0 cura e 0 recuo', () => {
    const floette = createTestCombatant(1, 'Floette', ['fairy'], { hp: 100, speed: 90 }, [lightOfRuinMove], 100);
    const defender = createTestCombatant(2, 'Snorlax', ['normal'], { hp: 200, speed: 30 }, [tackleMove], 200);

    const battle = BattleEngine.createBattle(floette, defender);
    const { events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: lightOfRuinMove.id, accuracyRoll: 95, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    const missEvent = events.find(e => e.type === BATTLE_EVENTS.MOVE_MISSED && (e.actor === 'player' || e.source === 'player'));
    assert.ok(missEvent, 'Deve emitir evento MOVE_MISSED');

    const damageEvent = events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(damageEvent, undefined, 'Não deve haver dano aplicado em caso de miss');

    const recoilEvent = events.find(e => e.type === BATTLE_EVENTS.RECOIL_APPLIED && e.target === 'player');
    assert.equal(recoilEvent, undefined, 'Não deve haver recuo em caso de miss');
  });

  test('P2-09: Desmaio simultâneo por recuo conta como derrota do atacante (regras de empate)', () => {
    const floette = createTestCombatant(1, 'Floette', ['fairy'], { hp: 100, specialAttack: 120, speed: 90 }, [lightOfRuinMove], 5);
    const snorlax = createTestCombatant(2, 'Snorlax', ['normal'], { hp: 100, specialDefense: 60, speed: 30 }, [tackleMove], 10);

    const battle = BattleEngine.createBattle(floette, snorlax);
    const { state, events } = BattleEngine.resolveTurn(battle, {
      player: { moveId: lightOfRuinMove.id, accuracyRoll: 1, damageRoll: 100 },
      enemy: { moveId: tackleMove.id, accuracyRoll: 1, damageRoll: 100 }
    });

    assert.equal(state.player.currentHp, 0);
    assert.equal(state.enemy.currentHp, 0);

    const faintEvents = events.filter(e => e.type === BATTLE_EVENTS.POKEMON_FAINTED);
    assert.equal(faintEvents.length, 2, 'Ambos os combatentes devem emitir POKEMON_FAINTED');

    assert.equal(state.status, BATTLE_STATUS.ENEMY_WIN);
    assert.equal(state.winner, 'enemy');
  });
});

describe('AUDITORIA CANÔNICA — Identidades, Contradições, Desconhecidos e Fluxo Real', () => {
  test('CANON-01: Identidade e capacidades exatas de Absorb (71) e Mega Drain (72)', () => {
    const absorb = getMoveCapability(71);
    assert.ok(absorb, 'Absorb deve ser encontrado por ID 71');
    assert.equal(absorb.id, 71);
    assert.equal(absorb.name, 'absorb');
    assert.equal(absorb.supportLevel, MOVE_SUPPORT_LEVEL.FULL);
    assert.equal(absorb.drainRatio, 0.5);

    const megaDrain = getMoveCapability(72);
    assert.ok(megaDrain, 'Mega Drain deve ser encontrado por ID 72');
    assert.equal(megaDrain.id, 72);
    assert.equal(megaDrain.name, 'mega-drain');
    assert.equal(megaDrain.supportLevel, MOVE_SUPPORT_LEVEL.FULL);
    assert.equal(megaDrain.drainRatio, 0.5);

    // Consulta por nome e objeto
    assert.equal(getMoveCapability('absorb').id, 71);
    assert.equal(getMoveCapability({ id: 71, name: 'absorb' }).drainRatio, 0.5);
    assert.equal(getMoveCapability('mega-drain').id, 72);
    assert.equal(getMoveCapability({ id: 72, name: 'mega-drain' }).drainRatio, 0.5);
  });

  test('CANON-02: Identidade e capacidades exatas de Aqua Jet (453) e Poison Jab (398)', () => {
    const aquaJet = getMoveCapability(453);
    assert.ok(aquaJet, 'Aqua Jet deve ser encontrado por ID 453');
    assert.equal(aquaJet.id, 453);
    assert.equal(aquaJet.name, 'aqua-jet');
    assert.equal(aquaJet.supportLevel, MOVE_SUPPORT_LEVEL.FULL);
    assert.equal(aquaJet.priority, 1);

    const poisonJab = getMoveCapability(398);
    assert.ok(poisonJab, 'Poison Jab deve ser encontrado por ID 398');
    assert.equal(poisonJab.id, 398);
    assert.equal(poisonJab.name, 'poison-jab');
    assert.equal(poisonJab.supportLevel, MOVE_SUPPORT_LEVEL.FULL, 'Poison Jab é FULL pois o efeito secundário de veneno está implementado no ciclo P4');
    assert.equal(poisonJab.priority, 0);

    // Consulta por nome e objeto
    assert.equal(getMoveCapability('aqua-jet').id, 453);
    assert.equal(getMoveCapability({ id: 453, name: 'aqua-jet' }).priority, 1);
    assert.equal(getMoveCapability('poison-jab').id, 398);
    assert.equal(getMoveCapability({ id: 398, name: 'poison-jab' }).priority, 0);
  });

  test('CANON-03: Política estrita de contradição quando ID e Nome conflitantes são fornecidos', () => {
    // Aqua Jet (453) com ID 398 (Poison Jab)
    assert.throws(
      () => getMoveCapability({ id: 398, name: 'aqua-jet' }),
      /Contradição cadastral de golpe/,
      'Deve lançar erro descritivo em contradição ID 398 e name aqua-jet'
    );
    assert.equal(
      getMoveCapability({ id: 398, name: 'aqua-jet' }, { throwOnMismatch: false }),
      null,
      'Deve retornar null com throwOnMismatch: false'
    );
    assert.equal(
      isMechanicallySupportedMove({ id: 398, name: 'aqua-jet' }),
      false,
      'isMechanicallySupportedMove deve rejeitar contradição'
    );

    // Absorb (71) com ID 72 (Mega Drain)
    assert.throws(
      () => getMoveCapability({ id: 72, name: 'absorb' }),
      /Contradição cadastral de golpe/
    );
    assert.equal(
      getMoveCapability({ id: 72, name: 'absorb' }, { throwOnMismatch: false }),
      null
    );
    assert.equal(
      isMechanicallySupportedMove({ id: 72, name: 'absorb' }),
      false
    );

    // Mega Drain (72) com ID 71 (Absorb)
    assert.throws(
      () => getMoveCapability({ id: 71, name: 'mega-drain' }),
      /Contradição cadastral de golpe/
    );
    assert.equal(
      getMoveCapability({ id: 71, name: 'mega-drain' }, { throwOnMismatch: false }),
      null
    );
    assert.equal(
      isMechanicallySupportedMove({ id: 71, name: 'mega-drain' }),
      false
    );
  });

  test('CANON-04: Rejeição de IDs e golpes totalmente desconhecidos (sem presumir suporte por power > 0)', () => {
    // ID numérico inexistente
    assert.equal(getMoveCapability(99999), null);

    // Nome textual desconhecido
    assert.equal(getMoveCapability('unknown-invented-spell'), null);

    // Objeto com poder positivo e classe física, mas golpe fictício/desconhecido
    const fakeMove = {
      id: 99999,
      name: 'cosmic-super-laser',
      power: 150,
      damageClass: 'special',
      accuracy: 100,
      pp: 10
    };
    assert.equal(getMoveCapability(fakeMove), null);
    assert.equal(
      isMechanicallySupportedMove(fakeMove),
      false,
      'Golpe fictício não pode ser suportado só por ter power > 0'
    );
  });

  test('CANON-05: Aliases de Nature\'s Madness resolvem para ID canônico 717 e nível FULL', () => {
    const aliasHyphen = getMoveCapability('nature-s-madness');
    assert.ok(aliasHyphen);
    assert.equal(aliasHyphen.id, 717);
    assert.equal(aliasHyphen.supportLevel, MOVE_SUPPORT_LEVEL.FULL);

    const aliasNoHyphen = getMoveCapability('natures-madness');
    assert.ok(aliasNoHyphen);
    assert.equal(aliasNoHyphen.id, 717);
    assert.equal(aliasNoHyphen.supportLevel, MOVE_SUPPORT_LEVEL.FULL);

    assert.equal(isMechanicallySupportedMove({ name: 'nature-s-madness' }), false);
    assert.equal(isMechanicallySupportedMove({ name: 'natures-madness' }), false);

    // Confirma que ID 723 pertence ao golpe canônico Light That Burns the Sky (BLOCKED)
    const zMove723 = getMoveCapability(723);
    assert.ok(zMove723);
    assert.equal(zMove723.id, 723);
    assert.equal(zMove723.name, 'light-that-burns-the-sky');
    assert.equal(zMove723.supportLevel, MOVE_SUPPORT_LEVEL.BLOCKED);
  });

  test('CANON-06: Integração no fluxo real — Validação de customização e opções de campanha', () => {
    const CampaignMoveOptions = require('../../assets/js/campaign/campaign-move-options.js');

    // Toucannon (#733): pool de customização contém beak-blast
    const toucannonPool = CampaignMoveOptions.getPool(733);
    assert.ok(Array.isArray(toucannonPool));
    assert.ok(toucannonPool.length >= 4);
    assert.ok(toucannonPool.every(m => isMechanicallySupportedMove(m)));
    assert.ok(toucannonPool.some(m => m.name === 'beak-blast'));
    assert.ok(CampaignMoveOptions.validateSelection(733,[690,332,65,675]));

    // Turtonator (#776): pool de customização contém shell-trap
    const turtonatorPool = CampaignMoveOptions.getPool(776);
    assert.ok(Array.isArray(turtonatorPool));
    assert.ok(turtonatorPool.length >= 4);
    assert.ok(turtonatorPool.every(m => isMechanicallySupportedMove(m)));
    assert.ok(turtonatorPool.some(m => m.name === 'shell-trap'));
    assert.ok(CampaignMoveOptions.validateSelection(776,[704,53,406,89]));

    // validateSelection ainda rejeita Tackle (#33), que não pertence ao pool da espécie
    assert.equal(CampaignMoveOptions.validateSelection(733, [690, 332, 65, 33]), null);

    // resolveLoadout com seleção com golpe fora do pool cai com segurança no conjunto padrão legal
    const loadout = CampaignMoveOptions.resolveLoadout(733, [690, 332, 65, 33]);
    assert.equal(loadout.length, 4);
    assert.ok(!loadout.some(m => m.name === 'beak-blast'));
    assert.ok(loadout.every(m => isMechanicallySupportedMove(m)));

    // sanitizePreferences descarta seleções com golpes fora do pool
    const sanitized = CampaignMoveOptions.sanitizePreferences({ 733: [690, 332, 65, 33] }, [733]);
    assert.equal(sanitized[733], undefined, 'Seleção com Tackle fora do pool deve ser descartada');
  });

  test('CANON-07: Resolução de IDs canônicos auditados e preservação dos golpes deslocados', () => {
    // 1. Parabolic Charge (570) e Water Shuriken (594)
    const parabolic = getMoveCapability(570);
    assert.ok(parabolic);
    assert.equal(parabolic.id, 570);
    assert.equal(parabolic.name, 'parabolic-charge');
    assert.equal(parabolic.supportLevel, MOVE_SUPPORT_LEVEL.FULL);
    assert.equal(parabolic.drainRatio, 0.5);

    const waterShuriken = getMoveCapability(594);
    assert.ok(waterShuriken);
    assert.equal(waterShuriken.id, 594);
    assert.equal(waterShuriken.name, 'water-shuriken');
    assert.equal(waterShuriken.supportLevel, MOVE_SUPPORT_LEVEL.FULL);
    assert.equal(waterShuriken.priority, 1);

    // 2. Venom Drench (599) deslocado
    const venomDrench = getMoveCapability(599);
    assert.ok(venomDrench);
    assert.equal(venomDrench.id, 599);
    assert.equal(venomDrench.name, 'venom-drench');
    assert.equal(venomDrench.supportLevel, MOVE_SUPPORT_LEVEL.FULL);

    // 3. Accelerock (709) e Anchor Shot (677)
    const accelerock = getMoveCapability(709);
    assert.ok(accelerock);
    assert.equal(accelerock.id, 709);
    assert.equal(accelerock.name, 'accelerock');
    assert.equal(accelerock.supportLevel, MOVE_SUPPORT_LEVEL.FULL);
    assert.equal(accelerock.priority, 1);

    const anchorShot = getMoveCapability(677);
    assert.ok(anchorShot);
    assert.equal(anchorShot.id, 677);
    assert.equal(anchorShot.name, 'anchor-shot');
    assert.equal(anchorShot.supportLevel, MOVE_SUPPORT_LEVEL.FULL);

    // 4. Nature\'s Madness (717) e Light That Burns the Sky (723)
    const naturesMadness = getMoveCapability(717);
    assert.ok(naturesMadness);
    assert.equal(naturesMadness.id, 717);
    assert.equal(naturesMadness.name, 'natures-madness');
    assert.equal(naturesMadness.supportLevel, MOVE_SUPPORT_LEVEL.FULL);

    const lightThatBurns = getMoveCapability(723);
    assert.ok(lightThatBurns);
    assert.equal(lightThatBurns.id, 723);
    assert.equal(lightThatBurns.name, 'light-that-burns-the-sky');
    assert.equal(lightThatBurns.supportLevel, MOVE_SUPPORT_LEVEL.BLOCKED);

    // 5. Last Respects (854), Lumina Crash (855), Ruination (877), Chilly Reception (881)
    const lastRespects = getMoveCapability(854);
    assert.ok(lastRespects);
    assert.equal(lastRespects.id, 854);
    assert.equal(lastRespects.name, 'last-respects');
    assert.equal(lastRespects.supportLevel, MOVE_SUPPORT_LEVEL.FULL);

    const luminaCrash = getMoveCapability(855);
    assert.ok(luminaCrash);
    assert.equal(luminaCrash.id, 855);
    assert.equal(luminaCrash.name, 'lumina-crash');
    assert.equal(luminaCrash.supportLevel, MOVE_SUPPORT_LEVEL.FULL);

    const ruination = getMoveCapability(877);
    assert.ok(ruination);
    assert.equal(ruination.id, 877);
    assert.equal(ruination.name, 'ruination');
    assert.equal(ruination.supportLevel, MOVE_SUPPORT_LEVEL.FULL);

    const chillyReception = getMoveCapability(881);
    assert.ok(chillyReception);
    assert.equal(chillyReception.id, 881);
    assert.equal(chillyReception.name, 'chilly-reception');
    assert.equal(chillyReception.supportLevel, MOVE_SUPPORT_LEVEL.BLOCKED);
  });

  test('CANON-08: Classificação estrita de Poison Jab e Invariante de Suporte FULL', () => {
    // Poison Jab (398) deve ser PARTIAL pois possui efeito secundário pendente
    const poisonJab = getMoveCapability(398);
    assert.ok(poisonJab);
    assert.equal(poisonJab.id, 398);
    assert.equal(poisonJab.name, 'poison-jab');
    assert.equal(poisonJab.supportLevel, MOVE_SUPPORT_LEVEL.FULL, 'Poison Jab é FULL na Fase P4 com efeito secundário de veneno implementado');
    assert.deepEqual(poisonJab.knownPending, []);

    // Invariante do Roadmap: nenhum golpe FULL pode conter mecânicas pendentes (knownPending deve ser vazio)
    for (const [id, def] of Object.entries(CANONICAL_MOVE_DEFINITIONS)) {
      if (def.supportLevel === MOVE_SUPPORT_LEVEL.FULL) {
        assert.equal(
          def.knownPending.length,
          0,
          `Golpe FULL (${def.id}: ${def.name}) não pode ter mecânicas pendentes: ${JSON.stringify(def.knownPending)}`
        );
      }
      if (def.knownPending && def.knownPending.length > 0) {
        assert.notEqual(
          def.supportLevel,
          MOVE_SUPPORT_LEVEL.FULL,
          `Golpe com pendências (${def.id}: ${def.name}) não pode ser classificado como FULL`
        );
      }
    }
  });

  test('CANON-09: Validação estrita de payload de golpes (validateMoveData e isMechanicallySupportedMove)', () => {
    const { validateMoveData } = require('../../assets/js/battle/battle-constants.js');

    // 1. Rejeição de payload adulterado de golpe de status (caso reproduzido na auditoria)
    const adulteratedPoisonPowder = {
      id: 77,
      name: 'poison-powder',
      type: 'fire',
      power: 999,
      accuracy: 1,
      pp: 1,
      damageClass: 'physical'
    };
    assert.equal(validateMoveData(adulteratedPoisonPowder), false, 'Deve rejeitar Poison Powder com type/power/damageClass adulterados');
    assert.equal(isMechanicallySupportedMove(adulteratedPoisonPowder), false, 'isMechanicallySupportedMove deve rejeitar Poison Powder adulterado');

    // 2. Aceitação estrita de golpe de status curado canônico
    const canonicalPoisonPowder = {
      id: 77,
      name: 'poison-powder',
      type: 'poison',
      power: 0,
      accuracy: 75,
      pp: 35,
      damageClass: 'status'
    };
    assert.equal(validateMoveData(canonicalPoisonPowder), true);
    assert.equal(isMechanicallySupportedMove(canonicalPoisonPowder), true);

    // 3. Consumo legítimo de PP em combate (currentPp decrescido) deve ser aceito
    const consumedPpMove = {
      ...canonicalPoisonPowder,
      currentPp: 12
    };
    assert.equal(validateMoveData(consumedPpMove), true, 'PP legitimamente consumido em batalha deve ser aceito');

    // 4. currentPp negativo ou que excede o teto de PP canônico deve ser rejeitado
    assert.equal(validateMoveData({ ...canonicalPoisonPowder, currentPp: 50 }), false, 'currentPp > pp deve ser rejeitado');
    assert.equal(validateMoveData({ ...canonicalPoisonPowder, currentPp: -2 }), false, 'currentPp negativo deve ser rejeitado');

    // 5. Rejeição de golpes de status não suportados mesmo que bem formados
    const unsupportedStatus = {
      id: 694,
      name: 'aurora-veil',
      type: 'ice',
      power: 0,
      accuracy: null,
      pp: 20,
      damageClass: 'status'
    };
    assert.equal(validateMoveData(unsupportedStatus), false);
    assert.equal(isMechanicallySupportedMove(unsupportedStatus), false);

    // 6. Validação de golpe ofensivo adulterado (ex: Tackle com poder 999 ou tipo fire)
    const adulteratedTacklePower = {
      id: 33,
      name: 'tackle',
      type: 'normal',
      power: 999,
      accuracy: 100,
      pp: 35,
      damageClass: 'physical'
    };
    assert.equal(validateMoveData(adulteratedTacklePower), false, 'Tackle com poder 999 deve ser rejeitado');

    const adulteratedTackleType = {
      id: 33,
      name: 'tackle',
      type: 'fire',
      power: 40,
      accuracy: 100,
      pp: 35,
      damageClass: 'physical'
    };
    assert.equal(validateMoveData(adulteratedTackleType), false, 'Tackle com tipo adulterado deve ser rejeitado');

    // 7. Golpe ofensivo canônico íntegro
    const canonicalTackle = {
      id: 33,
      name: 'tackle',
      type: 'normal',
      power: 40,
      accuracy: 100,
      pp: 35,
      damageClass: 'physical'
    };
    assert.equal(validateMoveData(canonicalTackle), true);
    assert.equal(isMechanicallySupportedMove(canonicalTackle), true);

    // 8. Golpe ofensivo canônico com PP reduzido em combate
    assert.equal(validateMoveData({ ...canonicalTackle, currentPp: 0 }), true, 'Golpe com 0 PP restante em batalha é estruturalmente válido');
  });

  test('CANON-09B: Rejeição de objetos incompletos e validação rigorosa de contrato completo', () => {
    const { validateMoveData, getMoveCapability } = require('../../assets/js/battle/battle-constants.js');

    // 1. Objeto contendo somente ID
    assert.equal(validateMoveData({ id: 33 }), false, 'Objeto somente com ID deve ser rejeitado');

    // 2. Objeto contendo somente nome
    assert.equal(validateMoveData({ name: 'tackle' }), false, 'Objeto somente com nome deve ser rejeitado');

    // 3. Status curado sem os campos obrigatórios (sem tipo, categoria, poder, precisão, pp)
    assert.equal(validateMoveData({ id: 77, name: 'poison-powder' }), false, 'Status curado incompleto deve ser rejeitado');

    // 4. Golpe ofensivo sem poder
    assert.equal(
      validateMoveData({ id: 126, name: 'fire-blast', type: 'fire', accuracy: 85, pp: 5, damageClass: 'special' }),
      false,
      'Golpe ofensivo sem poder deve ser rejeitado'
    );

    // 5. Precisão ausente
    assert.equal(
      validateMoveData({ id: 33, name: 'tackle', type: 'normal', power: 40, pp: 35, damageClass: 'physical' }),
      false,
      'Precisão ausente deve ser rejeitada'
    );

    // 6. Precisão undefined
    assert.equal(
      validateMoveData({ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: undefined, pp: 35, damageClass: 'physical' }),
      false,
      'Precisão undefined deve ser rejeitada'
    );

    // 7. Fire Blast com precisão null (canônica é 85, null tornaria infalível)
    assert.equal(
      validateMoveData({ id: 126, name: 'fire-blast', type: 'fire', power: 110, accuracy: null, pp: 5, damageClass: 'special' }),
      false,
      'Fire Blast com accuracy null deve ser rejeitado'
    );

    // 8. Fire Blast canônico com precisão 85
    assert.equal(
      validateMoveData({ id: 126, name: 'fire-blast', type: 'fire', power: 110, accuracy: 85, pp: 5, damageClass: 'special' }),
      true,
      'Fire Blast com accuracy 85 deve ser aceito'
    );

    // 9. Aerial Ace canônico com precisão null (infalível canônico)
    assert.equal(
      validateMoveData({ id: 332, name: 'aerial-ace', type: 'flying', power: 60, accuracy: null, pp: 20, damageClass: 'physical' }),
      true,
      'Aerial Ace com accuracy null deve ser aceito'
    );

    // 10. Golpe infalível com precisão incompatível (Aerial Ace com precisão numérica)
    assert.equal(
      validateMoveData({ id: 332, name: 'aerial-ace', type: 'flying', power: 60, accuracy: 100, pp: 20, damageClass: 'physical' }),
      false,
      'Aerial Ace com precisão 100 em vez de null deve ser rejeitado'
    );

    // 11. PP máximo ausente
    assert.equal(
      validateMoveData({ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, damageClass: 'physical' }),
      false,
      'PP máximo ausente deve ser rejeitado'
    );

    // 12. PP máximo inválido (<= 0)
    assert.equal(
      validateMoveData({ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: -5, damageClass: 'physical' }),
      false,
      'PP negativo deve ser rejeitado'
    );

    // 13. PP máximo contraditório (pp !== maxPp)
    assert.equal(
      validateMoveData({ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, maxPp: 30, damageClass: 'physical' }),
      false,
      'pp e maxPp divergentes devem ser rejeitados'
    );

    // 14. PP restante zero (legítimo esgotamento em combate)
    assert.equal(
      validateMoveData({ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, currentPp: 0, damageClass: 'physical' }),
      true,
      'currentPp 0 deve ser aceito'
    );

    // 15. PP restante parcialmente consumido
    assert.equal(
      validateMoveData({ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, currentPp: 15, damageClass: 'physical' }),
      true,
      'currentPp consumido legitimamente deve ser aceito'
    );

    // 16. PP restante negativo
    assert.equal(
      validateMoveData({ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, currentPp: -1, damageClass: 'physical' }),
      false,
      'currentPp negativo deve ser rejeitado'
    );

    // 17. PP restante acima do teto
    assert.equal(
      validateMoveData({ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, currentPp: 40, damageClass: 'physical' }),
      false,
      'currentPp acima do teto deve ser rejeitado'
    );

    // 18. PP restante sozinho sem teto declarado
    assert.equal(
      validateMoveData({ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, currentPp: 15, damageClass: 'physical' }),
      false,
      'currentPp sem pp/maxPp deve ser rejeitado'
    );

    // 19. Poder não finito (NaN, Infinity)
    assert.equal(
      validateMoveData({ id: 33, name: 'tackle', type: 'normal', power: NaN, accuracy: 100, pp: 35, damageClass: 'physical' }),
      false,
      'Power NaN deve ser rejeitado'
    );
    assert.equal(
      validateMoveData({ id: 33, name: 'tackle', type: 'normal', power: Infinity, accuracy: 100, pp: 35, damageClass: 'physical' }),
      false,
      'Power Infinity deve ser rejeitado'
    );

    // 20. Contradição entre ID e nome
    assert.equal(
      validateMoveData({ id: 33, name: 'fire-blast', type: 'fire', power: 110, accuracy: 85, pp: 5, damageClass: 'special' }),
      false,
      'Contradição entre ID 33 e Fire Blast deve ser rejeitada'
    );

    // 21. Golpes bloqueados
    assert.equal(
      validateMoveData({ id: 449, name: 'judgment', type: 'normal', power: 100, accuracy: 100, pp: 10, damageClass: 'special' }),
      false,
      'Golpe bloqueado deve ser rejeitado'
    );

    // 22. Golpes desconhecidos
    assert.equal(
      validateMoveData({ id: 9999, name: 'unknown-move', type: 'normal', power: 50, accuracy: 100, pp: 20, damageClass: 'physical' }),
      false,
      'Golpe desconhecido deve ser rejeitado'
    );

    // 23. Consulta de capacidades continua funcionando por ID ou nome
    const capById = getMoveCapability(33);
    assert.ok(capById && capById.supportLevel === 'FULL');
    const capByName = getMoveCapability('tackle');
    assert.ok(capByName && capByName.supportLevel === 'FULL');
    assert.equal(isMechanicallySupportedMove(33), true);
    assert.equal(isMechanicallySupportedMove('tackle'), true);

    // 24. Formatos legítimos da API (com damage_class e type como objetos aninhados)
    const apiFormatMove = {
      id: 33,
      name: 'tackle',
      type: { name: 'normal' },
      damage_class: { name: 'physical' },
      power: 40,
      accuracy: 100,
      pp: 35
    };
    assert.equal(validateMoveData(apiFormatMove), true, 'Formato legítimo da API com objetos aninhados deve ser aceito');

    // 25. Formato normalizado de combate (com maxPp e currentPp)
    const combatantMove = {
      id: 33,
      name: 'tackle',
      type: 'normal',
      damageClass: 'physical',
      power: 40,
      accuracy: 100,
      pp: 35,
      maxPp: 35,
      currentPp: 35
    };
    assert.equal(validateMoveData(combatantMove), true, 'Formato normalizado de combatente deve ser aceito');
  });

  test('CANON-10: Auditoria offline completa contra fixture independente de referência oficial PokéAPI', () => {
    const fs = require('fs');
    const path = require('path');
    const fixturePath = path.join(__dirname, '../fixtures/pokeapi-move-reference.json');
    assert.ok(fs.existsSync(fixturePath), 'Fixture independente pokeapi-move-reference.json deve existir');

    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    assert.ok(fixture.allOfficialMoves, 'Fixture deve conter allOfficialMoves');
    assert.ok(fixture.allOfficialIdsByName, 'Fixture deve conter allOfficialIdsByName');

    // 1. Audita todas as definições de CANONICAL_MOVE_DEFINITIONS contra os dados oficiais
    for (const [idStr, def] of Object.entries(CANONICAL_MOVE_DEFINITIONS)) {
      const id = Number(idStr);
      assert.equal(def.id, id, `ID no objeto (${def.id}) deve coincidir com a chave (${id})`);

      const officialName = fixture.allOfficialMoves[id];
      assert.ok(officialName, `ID oficial ${id} deve existir na PokéAPI`);
      assert.equal(
        def.name,
        officialName,
        `ID ${id} deve mapear para "${officialName}", mas foi registrado como "${def.name}"`
      );

      const officialId = fixture.allOfficialIdsByName[def.name];
      assert.equal(
        def.id,
        officialId,
        `Golpe "${def.name}" deve ter ID oficial ${officialId}, mas possui ${def.id}`
      );
    }

    // 2. Audita todos os golpes de KNOWN_CATALOG_MOVES contra os dados oficiais
    for (const [idStr, move] of Object.entries(KNOWN_CATALOG_MOVES)) {
      const id = Number(idStr);
      assert.equal(move.id, id, `ID do catálogo (${move.id}) deve coincidir com a chave (${id})`);

      const officialName = fixture.allOfficialMoves[id];
      assert.ok(officialName, `ID ${id} do catálogo conhecido deve existir na PokéAPI`);
      assert.equal(
        move.name,
        officialName,
        `ID ${id} deve ter nome oficial "${officialName}", encontrado "${move.name}"`
      );

      const detailed = fixture.detailedMoves?.[move.name];
      if (detailed) {
        assert.equal(move.type, detailed.type, `Tipo de ${move.name} deve ser ${detailed.type}`);
        assert.equal(move.damageClass, detailed.damageClass, `Classe de ${move.name} deve ser ${detailed.damageClass}`);
        assert.equal(move.power, detailed.power, `Poder de ${move.name} deve ser ${detailed.power}`);
        assert.equal(move.accuracy, detailed.accuracy, `Acurácia de ${move.name} deve ser ${detailed.accuracy}`);
        assert.equal(move.pp, detailed.pp, `PP de ${move.name} deve ser ${detailed.pp}`);
      }
    }
  });
});
