const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const Fixed = require('../../assets/js/campaign/campaign-fixed-battle-catalog.js');
const Store = require('../../assets/js/campaign/campaign-store.js');
const { CampaignManager } = require('../../assets/js/campaign/campaign-manager.js');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { BattleTeamHydrator } = require('../../assets/js/battle-session/battle-team-hydrator.js');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source.js');
const BattleConstants = require('../../assets/js/battle/battle-constants.js');
const PresentationMapper = require('../../assets/js/presentation/battle-presentation-mapper.js');
const { PRESENTATION_COMMANDS } = require('../../assets/js/presentation/battle-presentation-constants.js');
const { BattleUiDomAdapter } = require('../../assets/js/ui/battle-ui-adapter.js');

const {
  BATTLE_EVENTS,
  getSecondaryEffect,
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

describe('FASE P4 — Integração dos 5 Golpes Pilotos na Campanha e Sessão', () => {

  const PILOT_IDS = {
    THUNDERBOLT: 85,
    FLAMETHROWER: 53,
    SLUDGE_BOMB: 188,
    POISON_JAB: 398,
    SCALD: 503
  };

  test('INT-P4-01: Presença e consistência dos 5 pilotos nos rosters fixos da campanha', () => {
    // 1. Thunderbolt (85) em Pikachu (#25) e Gengar (#94)
    assert.ok(Fixed.byId[25].moves.some(m => m.id === PILOT_IDS.THUNDERBOLT), 'Pikachu deve possuir Thunderbolt no catálogo fixo');
    assert.ok(Fixed.byId[94].moves.some(m => m.id === PILOT_IDS.THUNDERBOLT), 'Gengar deve possuir Thunderbolt no catálogo fixo');

    // 2. Flamethrower (53) em Charizard (#6)
    assert.ok(Fixed.byId[6].moves.some(m => m.id === PILOT_IDS.FLAMETHROWER), 'Charizard deve possuir Flamethrower no catálogo fixo');

    // 3. Sludge Bomb (188) em Bulbasaur (#1) e Ivysaur (#2)
    assert.ok(Fixed.byId[1].moves.some(m => m.id === PILOT_IDS.SLUDGE_BOMB), 'Bulbasaur deve possuir Sludge Bomb no catálogo fixo');

    // 4. Poison Jab (398) em Cloyster (#91) e Ariados (#168)
    assert.ok(Fixed.byId[91].moves.some(m => m.id === PILOT_IDS.POISON_JAB), 'Cloyster deve possuir Poison Jab no catálogo fixo');

    // 5. Scald (503) em Poltchageist (#1012) e Sinistcha (#1013)
    assert.ok(Fixed.byId[1012].moves.some(m => m.id === PILOT_IDS.SCALD), 'Poltchageist deve possuir Scald no catálogo fixo');
    assert.ok(Fixed.byId[1013].moves.some(m => m.id === PILOT_IDS.SCALD), 'Sinistcha deve possuir Scald no catálogo fixo');

    // Todos os 5 golpes devem ser reconhecidos como mecanicamente suportados
    for (const [name, id] of Object.entries(PILOT_IDS)) {
      assert.equal(isMechanicallySupportedMove(id), true, `Piloto ${name} (${id}) deve ser mecanicamente suportado`);
      const sec = getSecondaryEffect({ id });
      assert.ok(sec, `Piloto ${name} (${id}) deve possuir metadados de efeito secundário`);
      assert.ok(['burn', 'paralysis', 'poison'].includes(sec.statusCondition));
      assert.ok(sec.chance === 10 || sec.chance === 30);
    }
  });

  test('INT-P4-02: Hidratação offline de combatentes preserva metadados de efeitos secundários', () => {
    const hydrator = new BattleTeamHydrator();

    // Roster da campanha contendo os pilotos: Pikachu (#25), Charizard (#6), Sinistcha (#1013)
    const pikachuMoves = Fixed.byId[25].moves;
    const loadoutPika = hydrator.createCampaignFixedLoadout(pikachuMoves);
    const hydratedTb = loadoutPika.moves.find(m => m.id === PILOT_IDS.THUNDERBOLT);
    assert.ok(hydratedTb);
    assert.equal(hydratedTb.secondaryEffect.statusCondition, 'paralysis');
    assert.equal(hydratedTb.secondaryEffect.chance, 10);

    const charizardMoves = Fixed.byId[6].moves;
    const loadoutChar = hydrator.createCampaignFixedLoadout(charizardMoves);
    const hydratedFt = loadoutChar.moves.find(m => m.id === PILOT_IDS.FLAMETHROWER);
    assert.ok(hydratedFt);
    assert.equal(hydratedFt.secondaryEffect.statusCondition, 'burn');
    assert.equal(hydratedFt.secondaryEffect.chance, 10);

    const sinistchaMoves = Fixed.byId[1013].moves;
    const loadoutSini = hydrator.createCampaignFixedLoadout(sinistchaMoves);
    const hydratedScald = loadoutSini.moves.find(m => m.id === PILOT_IDS.SCALD);
    assert.ok(hydratedScald);
    assert.equal(hydratedScald.secondaryEffect.statusCondition, 'burn');
    assert.equal(hydratedScald.secondaryEffect.chance, 30);
  });

  test('INT-P4-03: Compatibilidade de Save/Load do CampaignStore com dados novos e legados', () => {
    const store = memoryStore();

    // 1. Save legado de versão anterior sem movePreferences
    const legacyRawSave = {
      version: 1,
      startingRosterIds: [6, 25, 143, 3, 9, 38],
      activePokemonId: 6,
      badges: ['normal', 'fire']
    };
    store.save(legacyRawSave);

    const loaded = store.load();
    assert.ok(loaded);
    assert.deepEqual(loaded.startingRosterIds, [6, 25, 143, 3, 9, 38]);
    assert.deepEqual(loaded.movePreferences, {});

    // 2. Iniciar campanha e persistir preferências
    const manager = new CampaignManager(store);
    manager.start([6, 25, 143, 3, 9, 38]);
    const state = manager.getState();
    assert.ok(state.startingRosterIds.includes(25));
  });

  test('INT-P4-04: BattleSessionController com rolagens independentes para jogador e oponente', async () => {
    // Configura random source com sequências determinísticas separadas
    const rng = new DeterministicRandomSource();
    rng.setAccuracySequence([1, 1]); // Ambos acertam
    rng.setDamageSequence([100, 100]); // Dano máximo
    rng.setSecondaryEffectSequence([5, 50]); // Jogador tira 5 (aplica efeito de 10%), oponente tira 50 (não aplica)

    const hydratorMock = {
      hydrateTeam: async (ids) => ids.map(id => ({
        id,
        name: Fixed.byId[id].name,
        types: Fixed.byId[id].types,
        hp: 200, currentHp: 200, maxHp: 200,
        attack: 100, defense: 100, specialAttack: 100, specialDefense: 100,
        speed: id === 25 ? 120 : 60,
        statusCondition: null,
        moves: Fixed.byId[id].moves.map(m => ({ ...m, currentPp: m.pp, maxPp: m.pp }))
      }))
    };

    const controller = new BattleSessionController({
      teamStore: { load: () => [25, 6, 94] },
      hydrator: hydratorMock,
      opponentFactory: { createOpponentTeam: async () => hydratorMock.hydrateTeam([6, 94, 25]) },
      randomSource: rng,
      presentationEngine: { play: async () => {}, playCommands: async () => {} }
    });

    await controller.prepareBattle();
    await controller.startBattle();

    // Submete golpe do jogador (Thunderbolt, 10% de paralisia)
    await controller.submitPlayerMove(PILOT_IDS.THUNDERBOLT);

    const enemyActive = controller.battleState.enemy.team[controller.battleState.enemy.activeIndex];
    const playerActive = controller.battleState.player.team[controller.battleState.player.activeIndex];

    // Oponente Charizard foi paralisado porque playerSecondaryEffectRoll = 5 <= 10
    assert.equal(enemyActive.statusCondition, 'paralysis', 'Charizard adversário deve estar paralisado');

    // Jogador Pikachu NÃO foi queimado porque enemySecondaryEffectRoll = 50 > 10
    assert.equal(playerActive.statusCondition, null, 'Pikachu do jogador não deve estar queimado');
  });

  test('INT-P4-05: Mapeamento de apresentação e adaptação DOM para evento de status aplicado por secundário', () => {
    const statusEvent = {
      type: BATTLE_EVENTS.STATUS_APPLIED,
      actor: 'player',
      target: 'enemy',
      pokemonName: 'Charizard',
      statusCondition: 'burn',
      moveId: PILOT_IDS.FLAMETHROWER,
      moveName: 'flamethrower',
      secondaryEffectRoll: 5,
      chance: 10
    };

    const commands = PresentationMapper.mapEvent(statusEvent);
    assert.equal(commands.length, 1);
    assert.equal(commands[0].type, PRESENTATION_COMMANDS.STATUS_FEEDBACK);
    assert.equal(commands[0].outcome, 'APPLIED');
    assert.equal(commands[0].statusCondition, 'burn');
    assert.equal(commands[0].target, 'enemy');

    let badgeUpdated = null;
    let messageDisplayed = null;
    const mockView = {
      updateStatusBadge: (target, condition) => { badgeUpdated = { target, condition }; },
      displayMessage: msg => { messageDisplayed = msg; }
    };

    const adapter = new BattleUiDomAdapter({ view: mockView });
    adapter.execute(commands[0]);

    assert.deepEqual(badgeUpdated, { target: 'enemy', condition: 'burn' });
    assert.ok(messageDisplayed.includes('sofreu queimadura'), `Mensagem esperada ("${messageDisplayed}")`);
  });

});
