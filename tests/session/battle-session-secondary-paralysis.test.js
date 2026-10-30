const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');

const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source.js');
const Fixed = require('../../assets/js/campaign/campaign-fixed-battle-catalog.js');
const BattleConstants = require('../../assets/js/battle/battle-constants.js');

const {
  BATTLE_EVENTS,
  KNOWN_CATALOG_MOVES
} = BattleConstants;

class TrackingRandomSource extends DeterministicRandomSource {
  constructor(options = {}) {
    super(options);
    this.statusRollCalls = 0;
  }
  rollStatus() {
    this.statusRollCalls++;
    return super.rollStatus();
  }
}

function makeCombatant(id, moveIds, stats = {}) {
  const species = Fixed.byId[id] || { name: 'pokemon-' + id, types: ['normal'] };
  const moves = moveIds.map(mId => {
    const found = (Fixed.byId[id]?.moves || []).find(m => m.id === mId) || KNOWN_CATALOG_MOVES[mId];
    if (!found) throw new Error(`Move #${mId} not found`);
    return { ...found, currentPp: found.pp, maxPp: found.pp };
  });

  return {
    id,
    name: species.name,
    types: [...species.types],
    hp: stats.hp || 250,
    currentHp: stats.hp || 250,
    maxHp: stats.hp || 250,
    attack: stats.attack || 100,
    defense: stats.defense || 100,
    specialAttack: stats.specialAttack || 100,
    specialDefense: stats.specialDefense || 100,
    speed: stats.speed || 100,
    statusCondition: stats.statusCondition || null,
    moves
  };
}

function createImmediatePresentationEngine(capturedEvents) {
  return {
    play: async (events) => {
      if (Array.isArray(events)) {
        capturedEvents.push(...events);
      }
    },
    playCommands: async () => {}
  };
}

describe('P4 — Sessão Real: Integração de Paralisia Secundária e Impedimento no Mesmo Turno', () => {

  test('1. Jogador mais rápido paralisa adversário com Thunderbolt; rolagem 1 faz adversário perder ação', async () => {
    const rng = new TrackingRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([1, 100]); // Jogador tira 1 (aplica 10% paralisia)
    rng.setStatusSequence([1]); // Impedimento: 1 <= 25

    const pika = makeCombatant(25, [85], { speed: 120, hp: 200 }); // Thunderbolt
    const snorlax = makeCombatant(143, [33], { speed: 30, hp: 400 }); // Tackle

    const capturedEvents = [];
    const controller = new BattleSessionController({
      teamStore: { load: () => [25, 6, 94] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 25 ? pika : (id === 143 ? snorlax : makeCombatant(id, [33])))
      },
      opponentFactory: {
        createOpponentTeam: async () => [snorlax, makeCombatant(131, [33]), makeCombatant(3, [33])]
      },
      randomSource: rng,
      presentationEngine: createImmediatePresentationEngine(capturedEvents)
    });

    await controller.prepareBattle();
    await controller.startBattle();
    await controller.submitPlayerMove(85);

    const enemyActive = controller.battleState.enemy.team[0];
    const playerActive = controller.battleState.player.team[0];

    // O adversário recebeu paralisia
    assert.equal(enemyActive.statusCondition, 'paralysis');
    // rollStatus foi solicitado exatamente uma vez para o adversário
    assert.equal(rng.statusRollCalls, 1);

    // Eventos emitidos
    assert.ok(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.target === 'enemy' && e.statusCondition === 'paralysis'));
    assert.ok(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy'));

    // Contrato canônico de PP: o golpe do adversário teve PP consumido mesmo sendo impedido
    const enemyPpEvent = capturedEvents.find(e => e.type === BATTLE_EVENTS.PP_CHANGED && e.actor === 'enemy');
    assert.ok(enemyPpEvent, 'PP do adversário deve ser decrementado');
    assert.equal(enemyActive.moves[0].currentPp, enemyActive.moves[0].maxPp - 1);

    // Adversário NÃO emitiu MOVE_USED nem causou dano
    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'), false);
    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy'), false);
    assert.equal(playerActive.currentHp, playerActive.maxHp, 'Jogador não deve receber dano quando adversário for impedido');
  });

  test('2. Mesmo cenário com rolagem de impedimento acima de 25; o adversário consegue agir', async () => {
    const rng = new TrackingRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([1, 100]); // Jogador tira 1 (aplica 10% paralisia)
    rng.setStatusSequence([50]); // Impedimento: 50 > 25 (consegue agir)

    const pika = makeCombatant(25, [85], { speed: 120, hp: 200 });
    const snorlax = makeCombatant(143, [33], { speed: 30, hp: 400 });

    const capturedEvents = [];
    const controller = new BattleSessionController({
      teamStore: { load: () => [25, 6, 94] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 25 ? pika : (id === 143 ? snorlax : makeCombatant(id, [33])))
      },
      opponentFactory: {
        createOpponentTeam: async () => [snorlax, makeCombatant(131, [33]), makeCombatant(3, [33])]
      },
      randomSource: rng,
      presentationEngine: createImmediatePresentationEngine(capturedEvents)
    });

    await controller.prepareBattle();
    await controller.startBattle();
    await controller.submitPlayerMove(85);

    const enemyActive = controller.battleState.enemy.team[0];
    const playerActive = controller.battleState.player.team[0];

    assert.equal(enemyActive.statusCondition, 'paralysis');
    assert.equal(rng.statusRollCalls, 1);

    // Não deve ser imobilizado
    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy'), false);

    // Adversário executa golpe e causa dano
    assert.ok(capturedEvents.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'));
    assert.ok(capturedEvents.some(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy'));
    assert.ok(playerActive.currentHp < playerActive.maxHp, 'Jogador deve sofrer dano do Tackle do adversário');
  });

  test('3. Adversário mais rápido paralisa o jogador; a ação do jogador passa pela checagem correta', async () => {
    const rng = new TrackingRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([100, 1]); // Adversário tira 1 na rolagem secundária (10% paralisia)
    rng.setStatusSequence([1]); // Impedimento do jogador: 1 <= 25

    // Adversário Jolteon (Spd 130) com Thunderbolt vs Jogador Snorlax (Spd 30) com Tackle
    const snorlax = makeCombatant(143, [33], { speed: 30, hp: 400 });
    const jolteon = makeCombatant(135, [85], { speed: 130, hp: 200 });

    const capturedEvents = [];
    const controller = new BattleSessionController({
      teamStore: { load: () => [143, 6, 94] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 143 ? snorlax : (id === 135 ? jolteon : makeCombatant(id, [33])))
      },
      opponentFactory: {
        createOpponentTeam: async () => [jolteon, makeCombatant(131, [33]), makeCombatant(3, [33])]
      },
      randomSource: rng,
      presentationEngine: createImmediatePresentationEngine(capturedEvents)
    });

    await controller.prepareBattle();
    await controller.startBattle();
    await controller.submitPlayerMove(33);

    const playerActive = controller.battleState.player.team[0];
    const enemyActive = controller.battleState.enemy.team[0];

    // Jogador foi paralisado pelo Jolteon
    assert.equal(playerActive.statusCondition, 'paralysis');
    assert.equal(rng.statusRollCalls, 1);

    // Jogador sofre STATUS_IMMOBILIZED e perde a ação
    assert.ok(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.target === 'player' && e.statusCondition === 'paralysis'));
    assert.ok(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player'));

    // PP do Tackle do jogador é consumido
    assert.equal(playerActive.moves[0].currentPp, playerActive.moves[0].maxPp - 1);

    // Jogador não causou dano
    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'player'), false);
    assert.equal(enemyActive.currentHp, enemyActive.maxHp);
  });

  test('4. Efeito secundário não é aplicado; rolagem de impedimento preparada não impede Pokémon saudável', async () => {
    const rng = new TrackingRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setSecondaryEffectSequence([50, 100]); // Jogador tira 50 (> 10%), logo NÃO paralisa
    rng.setStatusSequence([1]); // Rolagem de status preparada é 1

    const pika = makeCombatant(25, [85], { speed: 120, hp: 200 });
    const snorlax = makeCombatant(143, [33], { speed: 30, hp: 400 });

    const capturedEvents = [];
    const controller = new BattleSessionController({
      teamStore: { load: () => [25, 6, 94] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 25 ? pika : (id === 143 ? snorlax : makeCombatant(id, [33])))
      },
      opponentFactory: {
        createOpponentTeam: async () => [snorlax, makeCombatant(131, [33]), makeCombatant(3, [33])]
      },
      randomSource: rng,
      presentationEngine: createImmediatePresentationEngine(capturedEvents)
    });

    await controller.prepareBattle();
    await controller.startBattle();
    await controller.submitPlayerMove(85);

    const enemyActive = controller.battleState.enemy.team[0];
    const playerActive = controller.battleState.player.team[0];

    // Adversário não recebeu paralisia
    assert.equal(enemyActive.statusCondition, null);
    // Embora a sessão tenha preparado statusRoll, o motor ignorou pois o Pokémon é saudável
    assert.equal(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED), false);
    assert.ok(capturedEvents.some(e => e.type === BATTLE_EVENTS.MOVE_USED && e.actor === 'enemy'));
    assert.ok(playerActive.currentHp < playerActive.maxHp);
  });

  test('5. Erro do ataque, imunidade e nocaute não produzem aplicação indevida', async () => {
    // 5a. Erro de acurácia (miss)
    const rngMiss = new TrackingRandomSource();
    rngMiss.setAccuracySequence([90, 1]); // Move com 85 acc erra no roll 90
    rngMiss.setDamageSequence([100, 100]);
    rngMiss.setSecondaryEffectSequence([1, 100]);
    rngMiss.setStatusSequence([1]);

    const fireBlastMove = { id: 126, name: 'fire-blast', type: 'fire', power: 110, accuracy: 85, pp: 5, damageClass: 'special' };
    const charizard = makeCombatant(6, [53], { speed: 120, hp: 200 });
    charizard.moves = [fireBlastMove];
    const snorlax = makeCombatant(143, [33], { speed: 30, hp: 400 });

    const capturedEventsMiss = [];
    const controllerMiss = new BattleSessionController({
      teamStore: { load: () => [6, 25, 94] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 6 ? charizard : (id === 143 ? snorlax : makeCombatant(id, [33])))
      },
      opponentFactory: {
        createOpponentTeam: async () => [snorlax, makeCombatant(131, [33]), makeCombatant(3, [33])]
      },
      randomSource: rngMiss,
      presentationEngine: createImmediatePresentationEngine(capturedEventsMiss)
    });

    await controllerMiss.prepareBattle();
    await controllerMiss.startBattle();
    await controllerMiss.submitPlayerMove(126);

    assert.ok(capturedEventsMiss.some(e => e.type === BATTLE_EVENTS.MOVE_MISSED && e.actor === 'player'));
    assert.equal(controllerMiss.battleState.enemy.team[0].statusCondition, null, 'Miss não deve aplicar status');

    // 5b. Imunidade elemental ao ataque direto (Thunderbolt contra Ground tipo Muk/Dugtrio)
    const rngImmune = new TrackingRandomSource();
    rngImmune.setAccuracySequence([1, 1]);
    rngImmune.setDamageSequence([100, 100]);
    rngImmune.setSecondaryEffectSequence([1, 100]);
    rngImmune.setStatusSequence([1]);

    const pika = makeCombatant(25, [85], { speed: 120, hp: 200 });
    const groundMon = makeCombatant(51, [33], { speed: 30, hp: 300 }); // Dugtrio ground
    groundMon.types = ['ground'];

    const capturedEventsImmune = [];
    const controllerImmune = new BattleSessionController({
      teamStore: { load: () => [25, 6, 94] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 25 ? pika : (id === 51 ? groundMon : makeCombatant(id, [33])))
      },
      opponentFactory: {
        createOpponentTeam: async () => [groundMon, makeCombatant(131, [33]), makeCombatant(3, [33])]
      },
      randomSource: rngImmune,
      presentationEngine: createImmediatePresentationEngine(capturedEventsImmune)
    });

    await controllerImmune.prepareBattle();
    await controllerImmune.startBattle();
    await controllerImmune.submitPlayerMove(85);

    assert.equal(controllerImmune.battleState.enemy.team[0].statusCondition, null, 'Imunidade não deve aplicar status');
    assert.equal(capturedEventsImmune.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), false);

    // 5c. Nocaute: dano direto zera o HP do oponente
    const rngKo = new TrackingRandomSource();
    rngKo.setAccuracySequence([1, 1]);
    rngKo.setDamageSequence([100, 100]);
    rngKo.setSecondaryEffectSequence([1, 100]);
    rngKo.setStatusSequence([1]);

    const weakSnorlax = makeCombatant(143, [33], { speed: 30, hp: 10 }); // Apenas 10 HP
    const capturedEventsKo = [];
    const controllerKo = new BattleSessionController({
      teamStore: { load: () => [25, 6, 94] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 25 ? pika : (id === 143 ? weakSnorlax : makeCombatant(id, [33])))
      },
      opponentFactory: {
        createOpponentTeam: async () => [weakSnorlax, makeCombatant(131, [33]), makeCombatant(3, [33])]
      },
      randomSource: rngKo,
      presentationEngine: createImmediatePresentationEngine(capturedEventsKo)
    });

    await controllerKo.prepareBattle();
    await controllerKo.startBattle();
    await controllerKo.submitPlayerMove(85);

    assert.equal(controllerKo.battleState.enemy.team[0].currentHp, 0, 'Adversário deve ser nocauteado');
    assert.equal(controllerKo.battleState.enemy.team[0].statusCondition, null, 'Nocaute não recebe status secundário');
    assert.equal(capturedEventsKo.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED), false);
  });

  test('6. Pokémon já paralisado no início do turno continua usando a rolagem apropriada', async () => {
    const rng = new TrackingRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setStatusSequence([1]); // Impedimento: 1 <= 25

    const pika = makeCombatant(25, [33], { speed: 120, hp: 200, statusCondition: 'paralysis' }); // Já começa paralisado
    const snorlax = makeCombatant(143, [33], { speed: 30, hp: 400 });

    const capturedEvents = [];
    const controller = new BattleSessionController({
      teamStore: { load: () => [25, 6, 94] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 25 ? pika : (id === 143 ? snorlax : makeCombatant(id, [33])))
      },
      opponentFactory: {
        createOpponentTeam: async () => [snorlax, makeCombatant(131, [33]), makeCombatant(3, [33])]
      },
      randomSource: rng,
      presentationEngine: createImmediatePresentationEngine(capturedEvents)
    });

    await controller.prepareBattle();
    await controller.startBattle();
    await controller.submitPlayerMove(33);

    // Jogador já paralisado consome statusRoll e é imobilizado
    assert.equal(rng.statusRollCalls, 1);
    assert.ok(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player'));
  });

  test('7. Golpes de status curados, como Thunder Wave, continuam funcionando na sessão', async () => {
    const rng = new TrackingRandomSource();
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);
    rng.setStatusSequence([1]); // Adversário recebe paralisia e é impedido com roll 1

    const thunderWaveMove = { id: 86, name: 'thunder-wave', type: 'electric', power: 0, accuracy: 90, pp: 20, damageClass: 'status', statusEffect: 'paralysis' };
    const pika = makeCombatant(25, [85], { speed: 120, hp: 200 });
    pika.moves = [thunderWaveMove];
    const snorlax = makeCombatant(143, [33], { speed: 30, hp: 400 });

    const capturedEvents = [];
    const controller = new BattleSessionController({
      teamStore: { load: () => [25, 6, 94] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 25 ? pika : (id === 143 ? snorlax : makeCombatant(id, [33])))
      },
      opponentFactory: {
        createOpponentTeam: async () => [snorlax, makeCombatant(131, [33]), makeCombatant(3, [33])]
      },
      randomSource: rng,
      presentationEngine: createImmediatePresentationEngine(capturedEvents)
    });

    await controller.prepareBattle();
    await controller.startBattle();
    await controller.submitPlayerMove(86);

    const enemyActive = controller.battleState.enemy.team[0];
    assert.equal(enemyActive.statusCondition, 'paralysis');
    assert.equal(rng.statusRollCalls, 1);
    assert.ok(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_APPLIED && e.target === 'enemy' && e.statusCondition === 'paralysis'));
    assert.ok(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy'));
  });

  test('8. Fluxo de troca do jogador com ataque do adversário permanece correto', async () => {
    const rng = new TrackingRandomSource();
    rng.setAccuracySequence([1]);
    rng.setDamageSequence([100]);
    rng.setSecondaryEffectSequence([100]);
    rng.setStatusSequence([1]); // Inimigo já paralisado tira 1 e é impedido

    const pika = makeCombatant(25, [33], { speed: 120, hp: 200 });
    const charizard = makeCombatant(6, [53], { speed: 100, hp: 200 });
    const paralyzedSnorlax = makeCombatant(143, [33], { speed: 30, hp: 400, statusCondition: 'paralysis' });

    const capturedEvents = [];
    const controller = new BattleSessionController({
      teamStore: { load: () => [25, 6, 94] },
      hydrator: {
        hydrateTeam: async (ids) => ids.map(id => id === 25 ? pika : (id === 6 ? charizard : (id === 143 ? paralyzedSnorlax : makeCombatant(id, [33]))))
      },
      opponentFactory: {
        createOpponentTeam: async () => [paralyzedSnorlax, makeCombatant(131, [33]), makeCombatant(3, [33])]
      },
      randomSource: rng,
      presentationEngine: createImmediatePresentationEngine(capturedEvents)
    });

    await controller.prepareBattle();
    await controller.startBattle();

    // Jogador realiza troca voluntária para Charizard (#6)
    await controller.submitPlayerSwitch(6);

    // Oponente paralisado teve rolagem solicitada e foi impedido
    assert.equal(rng.statusRollCalls, 1);
    assert.ok(capturedEvents.some(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy'));
    // Charizard entrou intacto
    const playerActive = controller.battleState.player.team[controller.battleState.player.activeIndex];
    assert.equal(playerActive.id, 6);
    assert.equal(playerActive.currentHp, playerActive.maxHp);
  });

  test('9. Nenhum erro de referência ocorre no carregamento de navegador', () => {
    const windowMock = {
      PBABattle: {
        BattleConstants,
        BattleEngine: { getActiveCombatant: () => ({ moves: [] }) },
        BattleAI: { chooseAction: () => ({ action: null }) }
      },
      PBABattleSession: {},
      PBABattlePresentation: {}
    };

    const context = vm.createContext({
      window: windowMock,
      console,
      setTimeout,
      clearTimeout
    });

    // Lê os arquivos-fonte em ambiente puramente de navegador (sem module.exports e sem require)
    const sessionConstantsCode = fs.readFileSync('assets/js/battle-session/battle-session-constants.js', 'utf8');
    const sessionControllerCode = fs.readFileSync('assets/js/battle-session/battle-session-controller.js', 'utf8');

    assert.doesNotThrow(() => {
      vm.runInContext(sessionConstantsCode, context);
    }, 'battle-session-constants.js deve carregar sem erros no navegador');

    assert.doesNotThrow(() => {
      vm.runInContext(sessionControllerCode, context);
    }, 'battle-session-controller.js deve carregar sem erros no navegador');

    assert.ok(windowMock.PBABattleSession.BattleSessionController, 'BattleSessionController deve estar registrado em window.PBABattleSession');
    assert.ok(typeof windowMock.PBABattleSession.getSecondaryEffect === 'function', 'getSecondaryEffect deve estar exposto em window.PBABattleSession');
  });

});

