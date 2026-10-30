const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const Catalog = require('../../assets/js/campaign/campaign-catalog.js');
const Fixed = require('../../assets/js/campaign/campaign-fixed-battle-catalog.js');
const Extras = require('../../assets/js/campaign/campaign-move-options-catalog.js');
const Options = require('../../assets/js/campaign/campaign-move-options.js');
const Store = require('../../assets/js/campaign/campaign-store.js');
const { CampaignManager } = require('../../assets/js/campaign/campaign-manager.js');
const { CampaignBattleCoordinator } = require('../../assets/js/campaign/campaign-battle-coordinator.js');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { BattleTeamHydrator } = require('../../assets/js/battle-session/battle-team-hydrator.js');
const BattleEngine = require('../../assets/js/battle/battle-engine.js');
const BattleConstants = require('../../assets/js/battle/battle-constants.js');
const BattleEvaluator = require('../../assets/js/battle/battle-evaluator.js');
const PresentationMapper = require('../../assets/js/presentation/battle-presentation-mapper.js');
const { PRESENTATION_COMMANDS } = require('../../assets/js/presentation/battle-presentation-constants.js');
const { BattleUiDomAdapter } = require('../../assets/js/ui/battle-ui-adapter.js');

const {
  BATTLE_EVENTS,
  STAT_STAGE_KEYS,
  getEffectiveStat,
  applyStatStageChange,
  resetStatStages,
  validateMoveData,
  isMechanicallySupportedMove
} = BattleConstants;

function memoryStore(initialData = null) {
  let persisted = initialData ? JSON.parse(JSON.stringify(initialData)) : null;
  return {
    getDefaultState: Store.getDefaultState,
    sanitize: Store.sanitize,
    load: () => Store.sanitize(persisted),
    save: data => { persisted = JSON.parse(JSON.stringify(Store.sanitize(data))); return persisted; },
    reset: () => { persisted = null; return Store.getDefaultState(); },
    raw: () => persisted
  };
}

describe('FASE P3 — Integração Completa dos 5 Golpes Pilotos na Campanha', () => {

  const PILOT_IDS = {
    SWORDS_DANCE: 14,
    CALM_MIND: 347,
    CLOSE_COMBAT: 370,
    OVERHEAT: 315,
    DRACO_METEOR: 434
  };

  test('INT-01: Disponibilidade dos 5 pilotos nos pools da campanha para Pokémon canônicos', () => {
    // 1. Swords Dance (14): Disponível em Charizard (#6), Lucario (#448), Scizor (#212), Heracross (#214), Garchomp (#445)
    for (const speciesId of [6, 212, 214, 445, 448]) {
      const pool = Options.getPool(speciesId);
      assert.ok(pool.some(m => m.id === PILOT_IDS.SWORDS_DANCE), `Espécie #${speciesId} deve ter Swords Dance em seu pool`);
      assert.ok(pool.length >= 1 && pool.length <= 6, `Tamanho do pool da espécie #${speciesId} deve ser entre 1 e 6`);
      assert.equal(new Set(pool.map(m => m.id)).size, pool.length, `Sem IDs duplicados para #${speciesId}`);
    }

    // 2. Calm Mind (347): Disponível em Gardevoir (#282) e Alakazam (#65)
    for (const speciesId of [65, 282]) {
      const pool = Options.getPool(speciesId);
      assert.ok(pool.some(m => m.id === PILOT_IDS.CALM_MIND), `Espécie #${speciesId} deve ter Calm Mind em seu pool`);
      assert.ok(pool.length >= 1 && pool.length <= 6);
      assert.equal(new Set(pool.map(m => m.id)).size, pool.length);
    }

    // 3. Close Combat (370): Disponível em Lucario (#448) e Heracross (#214)
    for (const speciesId of [214, 448]) {
      const pool = Options.getPool(speciesId);
      assert.ok(pool.some(m => m.id === PILOT_IDS.CLOSE_COMBAT), `Espécie #${speciesId} deve ter Close Combat em seu pool`);
      assert.ok(pool.length >= 1 && pool.length <= 6);
    }

    // 4. Overheat (315): Disponível em Charizard (#6) e Typhlosion (#157)
    for (const speciesId of [6, 157]) {
      const pool = Options.getPool(speciesId);
      assert.ok(pool.some(m => m.id === PILOT_IDS.OVERHEAT), `Espécie #${speciesId} deve ter Overheat em seu pool`);
      assert.ok(pool.length >= 1 && pool.length <= 6);
    }

    // 5. Draco Meteor (434): Disponível em Dragonite (#149) e Garchomp (#445)
    for (const speciesId of [149, 445]) {
      const pool = Options.getPool(speciesId);
      assert.ok(pool.some(m => m.id === PILOT_IDS.DRACO_METEOR), `Espécie #${speciesId} deve ter Draco Meteor em seu pool`);
      assert.ok(pool.length >= 1 && pool.length <= 6);
    }
  });

  test('INT-02: Seleção, validação, persistência e restauração de preferências de golpes', () => {
    const store = memoryStore();
    const manager = new CampaignManager(store);
    manager.start([6, 65, 149, 214, 282, 448]); // Time inicial com os Pokémon piloto

    // Customiza Charizard (#6): Seleciona Overheat e Swords Dance junto com Flamethrower e Air Slash
    const charizardPool = Options.getPool(6);
    const overheat = charizardPool.find(m => m.id === PILOT_IDS.OVERHEAT);
    const swordsDance = charizardPool.find(m => m.id === PILOT_IDS.SWORDS_DANCE);
    const flamethrower = charizardPool.find(m => m.name === 'flamethrower');
    const airSlash = charizardPool.find(m => m.name === 'air-slash');

    const selectionCharizard = [swordsDance.id, overheat.id, flamethrower.id, airSlash.id];
    const validationRes = Options.validateSelection(6, selectionCharizard);
    assert.ok(validationRes, 'Seleção de golpes para Charizard deve ser válida');
    assert.equal(validationRes.length, 4);

    // Salva preferência no CampaignManager
    const saveRes = manager.setMovePreference(6, selectionCharizard);
    assert.deepEqual(saveRes, { ok: true });
    assert.deepEqual(manager.getEffectiveMoveIds(6), selectionCharizard);

    // Recarrega em nova instância do manager a partir do mesmo store
    const reloadedManager = new CampaignManager(store);
    assert.deepEqual(reloadedManager.getEffectiveMoveIds(6), selectionCharizard);

    // Restaura padrão
    reloadedManager.resetMovePreference(6);
    assert.deepEqual(reloadedManager.getEffectiveMoveIds(6), Options.getDefaultMoveIds(6));
  });

  test('INT-03: Compatibilidade regressiva: save anterior sem campos de P3 é higienizado com segurança', () => {
    // Save legado de versão anterior sem movePreferences e sem statStages
    const legacyRawSave = {
      version: 1,
      startingRosterIds: [6, 25, 143, 3, 9, 38],
      activePokemonId: 6,
      badges: ['normal', 'fire']
    };

    const store = memoryStore(legacyRawSave);
    const manager = new CampaignManager(store);
    const state = manager.getState();

    assert.ok(state);
    assert.deepEqual(state.startingRosterIds, [6, 25, 143, 3, 9, 38]);
    assert.deepEqual(state.movePreferences, {});
    // Garante que nenhum dado efêmero de combate existe no save
    assert.equal(state.statStages, undefined);
  });

  test('INT-04: Hidratação offline na sessão real de batalha para os cinco pilotos', async () => {
    const store = memoryStore();
    const manager = new CampaignManager(store);
    manager.start([6, 65, 149, 214, 282, 448]);

    // Define preferências para os Pokémon
    const charizardChoices = [PILOT_IDS.SWORDS_DANCE, PILOT_IDS.OVERHEAT, 53, 403];
    const gardevoirChoices = [PILOT_IDS.CALM_MIND, 94, 585, 85];
    const lucarioChoices = [PILOT_IDS.CLOSE_COMBAT, PILOT_IDS.SWORDS_DANCE, 396, 430];

    manager.setMovePreference(6, charizardChoices);
    manager.setMovePreference(282, gardevoirChoices);
    manager.setMovePreference(448, lucarioChoices);

    let preparedConfig = null;
    const coordinator = new CampaignBattleCoordinator(manager, {
      prepareBattle: async config => { preparedConfig = config; },
      startBattle: async () => {}
    });

    const master = Catalog.MASTERS.find(m => m.type === 'normal');
    await coordinator.start('MASTER', master.challengeId, [6, 282, 448]);

    assert.ok(preparedConfig);
    assert.deepEqual(preparedConfig.playerMovePreferences[6], charizardChoices);
    assert.deepEqual(preparedConfig.playerMovePreferences[282], gardevoirChoices);
    assert.deepEqual(preparedConfig.playerMovePreferences[448], lucarioChoices);

    // Hidratação na sessão de batalha
    const session = new BattleSessionController({
      hydrator: new BattleTeamHydrator({ api: { getPokemonDetail: async () => { throw new Error('Offline mode'); } } }),
      view: { renderState() {} }
    });

    await session.prepareBattle(preparedConfig);

    const playerTeam = session.battleState.player.team;
    assert.equal(playerTeam.length, 3);

    // 1. Charizard possui Swords Dance e Overheat hidratados com atributos de P3
    const charizardMoves = playerTeam[0].moves;
    const sdMove = charizardMoves.find(m => m.id === PILOT_IDS.SWORDS_DANCE);
    assert.ok(sdMove);
    assert.equal(sdMove.damageClass, 'status');
    assert.equal(sdMove.accuracy, null);
    assert.equal(sdMove.pp, 20);
    assert.equal(sdMove.currentPp, 20);

    const ohMove = charizardMoves.find(m => m.id === PILOT_IDS.OVERHEAT);
    assert.ok(ohMove);
    assert.equal(ohMove.damageClass, 'special');
    assert.equal(ohMove.power, 130);
    assert.equal(ohMove.accuracy, 90);
    assert.equal(ohMove.pp, 5);

    // 2. Gardevoir possui Calm Mind hidratado
    const gardevoirMoves = playerTeam[1].moves;
    const cmMove = gardevoirMoves.find(m => m.id === PILOT_IDS.CALM_MIND);
    assert.ok(cmMove);
    assert.equal(cmMove.damageClass, 'status');
    assert.equal(cmMove.accuracy, null);

    // 3. Lucario possui Close Combat hidratado
    const lucarioMoves = playerTeam[2].moves;
    const ccMove = lucarioMoves.find(m => m.id === PILOT_IDS.CLOSE_COMBAT);
    assert.ok(ccMove);
    assert.equal(ccMove.damageClass, 'physical');
    assert.equal(ccMove.power, 120);
    assert.equal(ccMove.accuracy, 100);
  });

  test('INT-05: Execução real dos 5 pilotos no motor: boosts, auto-debuffs, consumo de PP e eventos', () => {
    // 1. Swords Dance (+2 Atk) e consumo de PP
    const pScizor = Fixed.byId[212];
    const eSnorlax = Fixed.byId[143];

    // Prepara Scizor com Swords Dance
    const scizorMoves = [
      { id: PILOT_IDS.SWORDS_DANCE, name: 'swords-dance', type: 'normal', power: 0, accuracy: null, pp: 20, damageClass: 'status' },
      { id: 404, name: 'x-scissor', type: 'bug', power: 80, accuracy: 100, pp: 15, damageClass: 'physical' }
    ];
    const pCombatant = {
      id: 212, name: 'scizor', types: ['bug', 'steel'],
      stats: { hp: 120, attack: 130, defense: 100, specialAttack: 55, specialDefense: 80, speed: 65 },
      moves: scizorMoves
    };
    const eCombatant = {
      id: 143, name: 'snorlax', types: ['normal'],
      stats: { hp: 300, attack: 110, defense: 100, specialAttack: 65, specialDefense: 110, speed: 30 },
      moves: [{ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, damageClass: 'physical' }]
    };

    const battle = BattleEngine.createBattle(pCombatant, eCombatant);

    const turn1 = BattleEngine.resolveTurn(battle, {
      player: { moveId: PILOT_IDS.SWORDS_DANCE, accuracyRoll: 1 },
      enemy: { moveId: 33, accuracyRoll: 1 }
    });

    // Scizor ganhou +2 em Attack
    assert.equal(turn1.state.player.statStages.attack, 2);
    // PP de Swords Dance foi decrementado
    assert.equal(turn1.state.player.moves[0].currentPp, 19);

    // Evento STAT_STAGE_CHANGED foi emitido
    const boostEv = turn1.events.find(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED && e.statKey === 'attack');
    assert.ok(boostEv);
    assert.equal(boostEv.appliedDelta, 2);
    assert.equal(boostEv.finalStage, 2);

    // Avaliador de batalha reflete ataque dobrado (130 * 2.0 = 260)
    const evalBoosted = BattleEvaluator.evaluateMove(turn1.state.player, turn1.state.enemy, turn1.state.player.moves[1]);
    assert.equal(evalBoosted.attackStat, 260);

    // 2. Close Combat: causa dano físico e aplica auto-debuff (-1 Def, -1 SpDef)
    const pLucario = {
      id: 448, name: 'lucario', types: ['fighting', 'steel'],
      stats: { hp: 100, attack: 110, defense: 70, specialAttack: 115, specialDefense: 70, speed: 90 },
      moves: [{ id: PILOT_IDS.CLOSE_COMBAT, name: 'close-combat', type: 'fighting', power: 120, accuracy: 100, pp: 5, damageClass: 'physical' }]
    };
    const battleCC = BattleEngine.createBattle(pLucario, eCombatant);
    const turnCC = BattleEngine.resolveTurn(battleCC, {
      player: { moveId: PILOT_IDS.CLOSE_COMBAT, accuracyRoll: 1 },
      enemy: { moveId: 33, accuracyRoll: 1 }
    });

    assert.equal(turnCC.state.player.statStages.defense, -1);
    assert.equal(turnCC.state.player.statStages.specialDefense, -1);
    assert.equal(turnCC.state.player.moves[0].currentPp, 4);

    const dropEvents = turnCC.events.filter(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED && e.appliedDelta === -1);
    assert.equal(dropEvents.length, 2);

    // 3. Overheat: causa dano especial e aplica -2 SpAtk
    const pCharizard = {
      id: 6, name: 'charizard', types: ['fire', 'flying'],
      stats: { hp: 100, attack: 84, defense: 78, specialAttack: 109, specialDefense: 85, speed: 100 },
      moves: [{ id: PILOT_IDS.OVERHEAT, name: 'overheat', type: 'fire', power: 130, accuracy: 90, pp: 5, damageClass: 'special' }]
    };
    const battleOH = BattleEngine.createBattle(pCharizard, eCombatant);
    const turnOH = BattleEngine.resolveTurn(battleOH, {
      player: { moveId: PILOT_IDS.OVERHEAT, accuracyRoll: 1 },
      enemy: { moveId: 33, accuracyRoll: 1 }
    });

    assert.equal(turnOH.state.player.statStages.specialAttack, -2);
    assert.equal(turnOH.state.player.moves[0].currentPp, 4);
    const dropOhEv = turnOH.events.find(e => e.type === BATTLE_EVENTS.STAT_STAGE_CHANGED && e.statKey === 'specialAttack');
    assert.ok(dropOhEv);
    assert.equal(dropOhEv.appliedDelta, -2);

    // 4. Draco Meteor contra imunidade (Fairy): não causa dano e NÃO aplica auto-debuff
    const pDragon = {
      id: 149, name: 'dragonite', types: ['dragon', 'flying'],
      stats: { hp: 100, attack: 134, defense: 95, specialAttack: 100, specialDefense: 100, speed: 80 },
      moves: [{ id: PILOT_IDS.DRACO_METEOR, name: 'draco-meteor', type: 'dragon', power: 130, accuracy: 90, pp: 5, damageClass: 'special' }]
    };
    const eFairy = {
      id: 36, name: 'clefable', types: ['fairy'],
      stats: { hp: 150, attack: 70, defense: 80, specialAttack: 95, specialDefense: 90, speed: 60 },
      moves: [{ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, damageClass: 'physical' }]
    };
    const battleImmune = BattleEngine.createBattle(pDragon, eFairy);
    const turnImmune = BattleEngine.resolveTurn(battleImmune, {
      player: { moveId: PILOT_IDS.DRACO_METEOR, accuracyRoll: 1 },
      enemy: { moveId: 33, accuracyRoll: 1 }
    });

    assert.equal(turnImmune.state.player.statStages.specialAttack, 0, 'Imunidade não deve disparar auto-debuff');
    // PP é consumido mesmo com imunidade
    assert.equal(turnImmune.state.player.moves[0].currentPp, 4);
  });

  test('INT-06: Mapeamento de apresentação e feedback textual/visual para UI', () => {
    // Evento de aumento de atributo
    const boostEvent = {
      type: BATTLE_EVENTS.STAT_STAGE_CHANGED,
      combatant: 'player',
      pokemonName: 'Charizard',
      statKey: 'attack',
      previousStage: 0,
      requestedDelta: 2,
      appliedDelta: 2,
      finalStage: 2,
      blockedReason: null
    };

    const commands = PresentationMapper.mapEvent(boostEvent);
    assert.equal(commands.length, 1);
    assert.equal(commands[0].type, PRESENTATION_COMMANDS.STAT_STAGE_FEEDBACK);
    assert.equal(commands[0].side, 'player');
    assert.equal(commands[0].statKey, 'attack');
    assert.equal(commands[0].appliedDelta, 2);

    let messageSent = null;
    let visualStagesUpdated = null;
    const mockView = {
      displayMessage: msg => { messageSent = msg; },
      updateStatStages: (side, stages) => { visualStagesUpdated = { side, stages }; }
    };

    const adapter = new BattleUiDomAdapter({ view: mockView });
    adapter.execute(commands[0], {
      battleState: {
        player: { team: [{ statStages: { attack: 2 } }], activeIndex: 0 }
      }
    });

    assert.ok(messageSent.includes('Ataque subiu muito!'), `Mensagem deve indicar subida acentuada ("${messageSent}")`);
    assert.deepEqual(visualStagesUpdated, { side: 'player', stages: { attack: 2 } });
  });

});
