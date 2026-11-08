const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../assets/js/battle/battle-constants.js');
const Engine = require('../../assets/js/battle/battle-engine.js');
const Registry = require('../../assets/js/battle/ability-registry.js');
const Doubles = require('../../assets/js/battle/doubles-battle.js');

function createPokemon(overrides = {}) {
  const defaultMoves = [
    { id: 33, name: 'Tackle', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 35, maxPp: 35, target: 'normal' },
    { id: 85, name: 'Thunderbolt', power: 90, accuracy: 100, type: 'electric', damageClass: 'special', currentPp: 15, maxPp: 15, target: 'normal' },
    { id: 45, name: 'Growl', power: null, accuracy: 100, type: 'normal', damageClass: 'status', currentPp: 40, maxPp: 40, target: 'normal' },
    { id: 269, name: 'Taunt', power: null, accuracy: 100, type: 'dark', damageClass: 'status', currentPp: 20, maxPp: 20, target: 'normal' }
  ];
  const moves = (overrides.moves || defaultMoves).map(m => ({
    accuracy: 100,
    type: 'normal',
    damageClass: 'physical',
    currentPp: 35,
    maxPp: 35,
    target: 'normal',
    ...m
  }));
  return {
    id: 1,
    name: 'Bulbasaur',
    types: ['grass', 'poison'],
    currentHp: 100,
    maxHp: 100,
    speed: 50,
    attack: 50,
    defense: 50,
    specialAttack: 50,
    specialDefense: 50,
    statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    accuracyStage: 0,
    evasionStage: 0,
    statusCondition: null,
    ability: 'overgrow',
    abilitySuppressed: false,
    neutralizingGasSuppressed: false,
    item: null,
    ...overrides,
    moves
  };
}

function createBattleState(playerOverrides = {}, enemyOverrides = {}, stateOverrides = {}) {
  const player = createPokemon({ id: 25, name: 'Pikachu', ...playerOverrides });
  const enemy = createPokemon({ id: 52, name: 'Meowth', ...enemyOverrides });
  const state = {
    turn: 1,
    weather: null,
    terrain: null,
    status: C.BATTLE_STATUS.IN_PROGRESS,
    player: {
      team: [player, ...(playerOverrides.bench || [])],
      activeIndex: 0,
      activePokemon: player
    },
    enemy: {
      team: [enemy, ...(enemyOverrides.bench || [])],
      activeIndex: 0,
      activePokemon: enemy
    },
    version: 2,
    p6Sides: { player: {}, enemy: {} },
    ...stateOverrides
  };
  return state;
}

describe('H8 CANONICAL ABILITIES SUITE (14 ABILITIES — SHOWDOWN GEN IX)', () => {

  // ==========================================
  // 1. GLUTTONY
  // ==========================================
  describe('1. Gluttony', () => {
    test('Gluttony consome pinch berry em 50% de HP em vez de 25%', () => {
      const state = createBattleState(
        { id: 143, name: 'Snorlax', ability: 'gluttony', item: 'salac-berry', currentHp: 50, maxHp: 100 },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.item, null, 'Salac Berry deve ser consumida a 50% com Gluttony');
      assert.equal(state.player.activePokemon.statStages.speed, 1, 'Speed deve aumentar em +1');
      assert.equal(state.player.activePokemon.lastConsumedBerry, 'salac-berry');
    });

    test('Sem Gluttony, pinch berry NÃO ativa em 50% de HP, mas ativa em 25%', () => {
      const state = createBattleState(
        { id: 143, name: 'Snorlax', ability: 'immunity', item: 'salac-berry', currentHp: 50, maxHp: 100 },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.item, 'salac-berry', 'Salac Berry não deve ser consumida a 50% sem Gluttony');
      assert.equal(state.player.activePokemon.statStages.speed, 0);

      // Agora com 25% de HP
      state.player.activePokemon.currentHp = 25;
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.item, null, 'Salac Berry deve ser consumida a 25% sem Gluttony');
      assert.equal(state.player.activePokemon.statStages.speed, 1);
    });

    test('Gluttony consome pinch healing berry (Figy Berry) a 50% de HP e cura 1/3 do HP', () => {
      const state = createBattleState(
        { id: 143, name: 'Snorlax', ability: 'gluttony', item: 'figy-berry', currentHp: 50, maxHp: 100 },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.item, null);
      assert.equal(state.player.activePokemon.currentHp, 50 + Math.floor(100 / 3));
    });

    test('Unnerve oponente bloqueia consumo de berry com Gluttony', () => {
      const state = createBattleState(
        { id: 143, name: 'Snorlax', ability: 'gluttony', item: 'salac-berry', currentHp: 40, maxHp: 100 },
        { id: 150, name: 'Mewtwo', ability: 'unnerve' }
      );
      const events = [];
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.item, 'salac-berry', 'Unnerve deve bloquear o consumo da Berry');
      assert.equal(state.player.activePokemon.statStages.speed, 0);
    });
  });

  // ==========================================
  // 2. UNBURDEN
  // ==========================================
  describe('2. Unburden', () => {
    test('Consumo de Berry ativa Unburden e dobra Speed (2x)', () => {
      const state = createBattleState(
        { id: 254, name: 'Sceptile', ability: 'unburden', item: 'sitrus-berry', currentHp: 50, maxHp: 100, speed: 100 },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.item, null);
      assert.equal(state.player.activePokemon.unburdenActive, true);
      const spd = C.P7.stat(state.player.activePokemon, 'speed');
      assert.equal(spd, 2.0, 'Speed deve ser multiplicada por 2');
    });

    test('Se o portador recupera um item, o boost de Speed de Unburden é desativado', () => {
      const mon = createPokemon({ id: 254, name: 'Sceptile', ability: 'unburden', item: null, unburdenActive: true });
      assert.equal(C.P7.stat(mon, 'speed'), 2.0);

      mon.item = 'leftovers';
      assert.equal(C.P7.stat(mon, 'speed'), 1.0, 'Ao segurar item, Unburden não concede bônus');

      mon.item = null;
      assert.equal(C.P7.stat(mon, 'speed'), 2.0, 'Ao perder o item novamente, Unburden volta a conceder bônus');
    });

    test('Ao sair de campo (leave), unburdenActive é removido', () => {
      const state = createBattleState(
        { id: 254, name: 'Sceptile', ability: 'unburden', item: null, unburdenActive: true },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.leave(state, 'player', state.player.activePokemon, C, events);
      assert.equal(state.player.activePokemon.unburdenActive, undefined, 'unburdenActive deve ser deletado ao trocar');
    });

    test('Entrar em campo sem item NÃO ativa Unburden', () => {
      const mon = createPokemon({ id: 254, name: 'Sceptile', ability: 'unburden', item: null });
      assert.equal(C.P7.stat(mon, 'speed'), 1.0, 'Não deve ter boost se nunca perdeu item');
    });

    test('Ter item removido por Knock Off ativa Unburden na vítima', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth', moves: [{ id: 282, name: 'Knock Off', power: 65, type: 'dark', damageClass: 'physical' }] },
        { id: 254, name: 'Sceptile', ability: 'unburden', item: 'sitrus-berry' }
      );
      const events = [];
      C.P7.takeItem(state, 'player', { id: 282 }, C, events);
      assert.equal(state.enemy.activePokemon.item, null);
      assert.equal(state.enemy.activePokemon.unburdenActive, true);
      assert.equal(C.P7.stat(state.enemy.activePokemon, 'speed'), 2.0);
    });
  });

  // ==========================================
  // 3. KLUTZ
  // ==========================================
  describe('3. Klutz', () => {
    test('Klutz permite usar golpes de status mesmo segurando Assault Vest', () => {
      const mon = createPokemon({ id: 428, name: 'Lopunny', ability: 'klutz', item: 'assault-vest' });
      const statusMove = { id: 45, name: 'Growl', damageClass: 'status' };
      assert.equal(C.P7.legalMove(mon, statusMove), true, 'Klutz deve permitir golpe de status com Assault Vest');
      assert.equal(C.P7.mustStruggle(mon), false);
    });

    test('Sem Klutz, Assault Vest impede golpes de status', () => {
      const mon = createPokemon({ id: 428, name: 'Lopunny', ability: 'limber', item: 'assault-vest' });
      const statusMove = { id: 45, name: 'Growl', damageClass: 'status' };
      assert.equal(C.P7.legalMove(mon, statusMove), false, 'Sem Klutz, Assault Vest deve bloquear golpe de status');
    });

    test('Klutz ignora Choice Band/Specs/Scarf (sem Choice lock e sem boost de atributos)', () => {
      const mon = createPokemon({ id: 428, name: 'Lopunny', ability: 'klutz', item: 'choice-band', choiceLock: 33 });
      const otherMove = { id: 85, name: 'Thunderbolt', damageClass: 'special' };
      assert.equal(C.P7.legalMove(mon, otherMove), true, 'Klutz não fica travado pelo Choice Lock');
      assert.equal(C.P7.stat(mon, 'attack'), 1.0, 'Choice Band não deve aumentar Attack com Klutz');
    });

    test('Klutz suprime cura de Leftovers no residual', () => {
      const state = createBattleState(
        { id: 428, name: 'Lopunny', ability: 'klutz', item: 'leftovers', currentHp: 50, maxHp: 100 },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.earlyResidual(state, C, events);
      assert.equal(state.player.activePokemon.currentHp, 50, 'Leftovers não deve curar usuário de Klutz');
    });

    test('Klutz suprime Focus Sash (portador é nocauteado de HP cheio)', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth' },
        { id: 428, name: 'Lopunny', ability: 'klutz', item: 'focus-sash', currentHp: 100, maxHp: 100 }
      );
      const events = [];
      const damage = C.P7.survive(state, 'player', { id: 33 }, 150, C, events);
      assert.equal(damage, 150, 'Focus Sash não deve salvar portador com Klutz');
      assert.equal(state.enemy.activePokemon.item, 'focus-sash', 'Focus Sash não é consumido');
    });

    test('Klutz NÃO suprime Ability Shield', () => {
      const mon = createPokemon({ id: 428, name: 'Lopunny', ability: 'klutz', item: 'ability-shield' });
      assert.equal(C.P7.held(mon, 'ability-shield'), true, 'Ability Shield não é suprimido por Klutz');
      assert.equal(C.P7.ignoringItem(mon), false);
    });

    test('Klutz suprimido por Neutralizing Gas reativa os efeitos dos itens', () => {
      const mon = createPokemon({ id: 428, name: 'Lopunny', ability: 'klutz', item: 'choice-band', neutralizingGasSuppressed: true });
      assert.equal(C.P7.stat(mon, 'attack'), 1.5, 'Ao suprimir Klutz, Choice Band volta a dar 1.5x');
    });
  });

  // ==========================================
  // 4. FRISK
  // ==========================================
  describe('4. Frisk', () => {
    test('Ao entrar em campo, Frisk revela o item segurado do oponente em Singles', () => {
      const state = createBattleState(
        { id: 356, name: 'Dusclops', ability: 'frisk' },
        { id: 52, name: 'Meowth', item: 'life-orb' }
      );
      const events = [];
      C.P7.enter(state, 'player', C, events);
      const friskEvent = events.find(e => e.type === 'FRISK_REVEALED');
      assert.ok(friskEvent, 'Deve emitir FRISK_REVEALED');
      assert.equal(friskEvent.item, 'life-orb');
      assert.equal(friskEvent.targetPokemonName, 'Meowth');
    });

    test('Frisk não emite evento se o oponente não segura item', () => {
      const state = createBattleState(
        { id: 356, name: 'Dusclops', ability: 'frisk' },
        { id: 52, name: 'Meowth', item: null }
      );
      const events = [];
      C.P7.enter(state, 'player', C, events);
      const friskEvent = events.find(e => e.type === 'FRISK_REVEALED');
      assert.equal(friskEvent, undefined, 'Não deve emitir FRISK_REVEALED se oponente não tem item');
    });

    test('Frisk em Doubles revela itens de todos os oponentes ativos com item', () => {
      const state = {
        battleFormat: 'DOUBLES',
        player: {
          team: [createPokemon({ id: 356, name: 'Dusclops', ability: 'frisk' }), createPokemon({ id: 25, name: 'Pikachu' })],
          activeIndex: 0,
          activeIndices: [0, 1]
        },
        enemy: {
          team: [createPokemon({ id: 52, name: 'Meowth', item: 'focus-sash' }), createPokemon({ id: 143, name: 'Snorlax', item: 'leftovers' })],
          activeIndex: 0,
          activeIndices: [0, 1]
        },
        version: 2
      };
      const events = [];
      C.P7.enter(state, 'player', C, events);
      const friskEvents = events.filter(e => e.type === 'FRISK_REVEALED');
      assert.equal(friskEvents.length, 2, 'Deve revelar 2 itens em Doubles');
      assert.equal(friskEvents[0].item, 'focus-sash');
      assert.equal(friskEvents[1].item, 'leftovers');
    });

    test('Frisk é suprimido por Neutralizing Gas', () => {
      const state = createBattleState(
        { id: 356, name: 'Dusclops', ability: 'frisk', neutralizingGasSuppressed: true },
        { id: 52, name: 'Meowth', item: 'life-orb' }
      );
      const events = [];
      C.P7.enter(state, 'player', C, events);
      const friskEvent = events.find(e => e.type === 'FRISK_REVEALED');
      assert.equal(friskEvent, undefined, 'Neutralizing Gas deve suprimir Frisk');
    });
  });

  // ==========================================
  // 5. ANTICIPATION
  // ==========================================
  describe('5. Anticipation', () => {
    test('1. Water Gun contra Whiscash: 1x (neutro), NÃO ativa Anticipation', () => {
      // Whiscash é Water/Ground. Water contra Water é 0.5x, contra Ground é 2x => 0.5 * 2 = 1.0x (neutro)
      const state = createBattleState(
        { id: 340, name: 'Whiscash', ability: 'anticipation', types: ['water', 'ground'] },
        { id: 7, name: 'Squirtle', moves: [{ id: 55, name: 'Water Gun', type: 'water', power: 40, damageClass: 'special' }] }
      );
      const events = [];
      C.P7.enter(state, 'player', C, events);
      const shudder = events.find(e => e.type === 'ANTICIPATION_SHUDDER');
      assert.equal(shudder, undefined, 'Water Gun contra Whiscash é dano neutro (1x) e NÃO deve ativar Anticipation');
    });

    test('2. Ember contra Whiscash: 0.5x (resistido), NÃO ativa Anticipation', () => {
      // Whiscash é Water/Ground. Fire contra Water é 0.5x, contra Ground é 1x => 0.5 * 1 = 0.5x (resistido)
      const state = createBattleState(
        { id: 340, name: 'Whiscash', ability: 'anticipation', types: ['water', 'ground'] },
        { id: 4, name: 'Charmander', moves: [{ id: 52, name: 'Ember', type: 'fire', power: 40, damageClass: 'special' }] }
      );
      const events = [];
      C.P7.enter(state, 'player', C, events);
      const shudder = events.find(e => e.type === 'ANTICIPATION_SHUDDER');
      assert.equal(shudder, undefined, 'Ember contra Whiscash é dano resistido (0.5x) e NÃO deve ativar Anticipation');
    });

    test('3. Razor Leaf contra Whiscash: 4x (super-efetivo), ATIVA Anticipation', () => {
      // Whiscash é Water/Ground. Grass contra Water é 2x, contra Ground é 2x => 2 * 2 = 4x (duplamente super-efetivo)
      const state = createBattleState(
        { id: 340, name: 'Whiscash', ability: 'anticipation', types: ['water', 'ground'] },
        { id: 1, name: 'Bulbasaur', moves: [{ id: 75, name: 'Razor Leaf', type: 'grass', power: 55, damageClass: 'physical' }] }
      );
      const events = [];
      C.P7.enter(state, 'player', C, events);
      const shudder = events.find(e => e.type === 'ANTICIPATION_SHUDDER');
      assert.ok(shudder, 'Razor Leaf contra Whiscash é 4x super-efetivo e DEVE ativar Anticipation');
    });

    test('4. Thunderbolt contra Whiscash: 0x (imune), NÃO ativa Anticipation pela efetividade', () => {
      // Whiscash é Water/Ground. Electric contra Ground é 0x (imune) => 0x
      const stateElectric = createBattleState(
        { id: 340, name: 'Whiscash', ability: 'anticipation', types: ['water', 'ground'] },
        { id: 25, name: 'Pikachu', moves: [{ id: 85, name: 'Thunderbolt', type: 'electric', power: 90, damageClass: 'special' }] }
      );
      const evElectric = [];
      C.P7.enter(stateElectric, 'player', C, evElectric);
      assert.equal(evElectric.find(e => e.type === 'ANTICIPATION_SHUDDER'), undefined, 'Thunderbolt contra Ground é 0x imune e NÃO deve ativar');

      // Earthquake contra Pidgey (Normal/Flying): Ground contra Flying é 0x (imune)
      const stateFlying = createBattleState(
        { id: 16, name: 'Pidgey', ability: 'anticipation', types: ['normal', 'flying'] },
        { id: 52, name: 'Meowth', moves: [{ id: 89, name: 'Earthquake', type: 'ground', power: 100, damageClass: 'physical' }] }
      );
      const evFlying = [];
      C.P7.enter(stateFlying, 'player', C, evFlying);
      assert.equal(evFlying.find(e => e.type === 'ANTICIPATION_SHUDDER'), undefined, 'Earthquake contra Flying é 0x imune e NÃO deve ativar');
    });

    test('5. Explosion neutro: NÃO ativa apenas por ser autodestrutivo', () => {
      // Explosion é Normal (1x contra Water/Ground). No Showdown Gen IX, não ativa Anticipation se neutro
      const stateExplosion = createBattleState(
        { id: 340, name: 'Whiscash', ability: 'anticipation', types: ['water', 'ground'] },
        { id: 76, name: 'Golem', moves: [{ id: 153, name: 'Explosion', type: 'normal', power: 250, damageClass: 'physical' }] }
      );
      const evExplosion = [];
      C.P7.enter(stateExplosion, 'player', C, evExplosion);
      assert.equal(evExplosion.find(e => e.type === 'ANTICIPATION_SHUDDER'), undefined, 'Explosion neutro (1x) NÃO ativa Anticipation no Gen IX');

      // Self-Destruct também é Normal (1x contra Water/Ground)
      const stateSelfDestruct = createBattleState(
        { id: 340, name: 'Whiscash', ability: 'anticipation', types: ['water', 'ground'] },
        { id: 101, name: 'Electrode', moves: [{ id: 120, name: 'Self-Destruct', type: 'normal', power: 200, damageClass: 'physical' }] }
      );
      const evSD = [];
      C.P7.enter(stateSelfDestruct, 'player', C, evSD);
      assert.equal(evSD.find(e => e.type === 'ANTICIPATION_SHUDDER'), undefined, 'Self-Destruct neutro (1x) NÃO ativa Anticipation no Gen IX');
    });

    test('6. Misty Explosion super-efetivo: ativa; neutro ou resistido: não ativa', () => {
      // Super-efetivo contra Dragonite (Dragon/Flying): Fairy causa 2x => ATIVA
      const stateSE = createBattleState(
        { id: 149, name: 'Dragonite', ability: 'anticipation', types: ['dragon', 'flying'] },
        { id: 110, name: 'Weezing-Galar', moves: [{ id: 802, name: 'Misty Explosion', type: 'fairy', power: 100, damageClass: 'special' }] }
      );
      const evSE = [];
      C.P7.enter(stateSE, 'player', C, evSE);
      assert.ok(evSE.find(e => e.type === 'ANTICIPATION_SHUDDER'), 'Misty Explosion super-efetivo (2x contra Dragon) DEVE ativar');

      // Neutro contra Whiscash (Water/Ground): Fairy causa 1x => NÃO ATIVA
      const stateNeutral = createBattleState(
        { id: 340, name: 'Whiscash', ability: 'anticipation', types: ['water', 'ground'] },
        { id: 110, name: 'Weezing-Galar', moves: [{ id: 802, name: 'Misty Explosion', type: 'fairy', power: 100, damageClass: 'special' }] }
      );
      const evNeutral = [];
      C.P7.enter(stateNeutral, 'player', C, evNeutral);
      assert.equal(evNeutral.find(e => e.type === 'ANTICIPATION_SHUDDER'), undefined, 'Misty Explosion neutro (1x) NÃO deve ativar');

      // Resistido contra Charizard (Fire/Flying): Fairy causa 0.5x => NÃO ATIVA
      const stateResist = createBattleState(
        { id: 6, name: 'Charizard', ability: 'anticipation', types: ['fire', 'flying'] },
        { id: 110, name: 'Weezing-Galar', moves: [{ id: 802, name: 'Misty Explosion', type: 'fairy', power: 100, damageClass: 'special' }] }
      );
      const evResist = [];
      C.P7.enter(stateResist, 'player', C, evResist);
      assert.equal(evResist.find(e => e.type === 'ANTICIPATION_SHUDDER'), undefined, 'Misty Explosion resistido (0.5x) NÃO deve ativar');
    });

    test('7. Golpe OHKO: ativa conforme regra canônica', () => {
      const ohkoList = [
        { id: 12, name: 'Guillotine', type: 'normal' },
        { id: 32, name: 'Horn Drill', type: 'normal' },
        { id: 90, name: 'Fissure', type: 'ground' },
        { id: 329, name: 'Sheer Cold', type: 'ice' }
      ];
      for (const ohko of ohkoList) {
        const state = createBattleState(
          { id: 340, name: 'Whiscash', ability: 'anticipation', types: ['water', 'ground'] },
          { id: 52, name: 'Meowth', moves: [{ id: ohko.id, name: ohko.name, type: ohko.type, power: null, damageClass: 'physical' }] }
        );
        const events = [];
        C.P7.enter(state, 'player', C, events);
        const shudder = events.find(e => e.type === 'ANTICIPATION_SHUDDER');
        assert.ok(shudder, `Golpe OHKO ${ohko.name} DEVE ativar Anticipation canonicamente`);
      }
    });

    test('8. Duas ameaças no moveset: apenas um evento de Anticipation', () => {
      // Oponente possui Razor Leaf (Grass, super-efetivo 4x) E Fissure (OHKO)
      const state = createBattleState(
        { id: 340, name: 'Whiscash', ability: 'anticipation', types: ['water', 'ground'] },
        { id: 1, name: 'Bulbasaur', moves: [
          { id: 75, name: 'Razor Leaf', type: 'grass', power: 55, damageClass: 'physical' },
          { id: 90, name: 'Fissure', type: 'ground', power: null, damageClass: 'physical' }
        ]}
      );
      const events = [];
      C.P7.enter(state, 'player', C, events);
      const shudders = events.filter(e => e.type === 'ANTICIPATION_SHUDDER');
      assert.equal(shudders.length, 1, 'Anticipation deve estremecer exatamente UMA vez na entrada');
    });

    test('9. Singles e Doubles suportados (qualquer oponente ativo com ameaça)', () => {
      const stateDoubles = {
        battleFormat: 'DOUBLES',
        player: {
          team: [createPokemon({ id: 340, name: 'Whiscash', ability: 'anticipation', types: ['water', 'ground'] }), createPokemon({ id: 25, name: 'Pikachu' })],
          activeIndex: 0,
          activeIndices: [0, 1]
        },
        enemy: {
          team: [createPokemon({ id: 52, name: 'Meowth', moves: [{ id: 33, name: 'Tackle', type: 'normal', power: 40, damageClass: 'physical' }] }), createPokemon({ id: 1, name: 'Bulbasaur', moves: [{ id: 75, name: 'Razor Leaf', type: 'grass', power: 55, damageClass: 'physical' }] })],
          activeIndex: 0,
          activeIndices: [0, 1]
        },
        version: 2
      };
      const events = [];
      C.P7.enter(stateDoubles, 'player', C, events);
      const shudders = events.filter(e => e.type === 'ANTICIPATION_SHUDDER');
      assert.equal(shudders.length, 1, 'Em Doubles, estremece se qualquer oponente ativo tiver ameaça super-efetiva');
    });

    test('10. Neutralizing Gas e Ability Shield interagindo canonicamente', () => {
      // Sem Ability Shield: suprimido por Neutralizing Gas
      const stateSuppressed = {
        player: {
          team: [createPokemon({ id: 340, name: 'Whiscash', ability: 'anticipation', types: ['water', 'ground'], item: null })],
          activeIndex: 0
        },
        enemy: {
          team: [createPokemon({ id: 109, name: 'Koffing', ability: 'neutralizing-gas', moves: [{ id: 75, name: 'Razor Leaf', type: 'grass', power: 55, damageClass: 'physical' }] })],
          activeIndex: 0
        },
        neutralizingGasActive: true
      };
      C.P7.sync(stateSuppressed);
      const evSuppressed = [];
      C.P7.enter(stateSuppressed, 'player', C, evSuppressed);
      assert.equal(evSuppressed.find(e => e.type === 'ANTICIPATION_SHUDDER'), undefined, 'Neutralizing Gas deve suprimir Anticipation');

      // Com Ability Shield: protegido contra Neutralizing Gas
      const stateShielded = {
        player: {
          team: [createPokemon({ id: 340, name: 'Whiscash', ability: 'anticipation', types: ['water', 'ground'], item: 'ability-shield' })],
          activeIndex: 0
        },
        enemy: {
          team: [createPokemon({ id: 109, name: 'Koffing', ability: 'neutralizing-gas', moves: [{ id: 75, name: 'Razor Leaf', type: 'grass', power: 55, damageClass: 'physical' }] })],
          activeIndex: 0
        },
        neutralizingGasActive: true
      };
      C.P7.sync(stateShielded);
      const evShielded = [];
      C.P7.enter(stateShielded, 'player', C, evShielded);
      assert.ok(evShielded.find(e => e.type === 'ANTICIPATION_SHUDDER'), 'Ability Shield deve proteger Anticipation da supressão por Neutralizing Gas');
    });
  });

  // ==========================================
  // 6. FOREWARN
  // ==========================================
  describe('6. Forewarn', () => {
    test('Forewarn revela o golpe de maior poder base do oponente', () => {
      const state = createBattleState(
        { id: 97, name: 'Hypno', ability: 'forewarn' },
        { id: 6, name: 'Charizard', moves: [
          { id: 33, name: 'Tackle', power: 40, damageClass: 'physical' },
          { id: 53, name: 'Flamethrower', power: 90, damageClass: 'special' },
          { id: 126, name: 'Fire Blast', power: 110, damageClass: 'special' }
        ]}
      );
      const events = [];
      C.P7.enter(state, 'player', C, events);
      const fw = events.find(e => e.type === 'FOREWARN_REVEALED');
      assert.ok(fw, 'Deve emitir FOREWARN_REVEALED');
      assert.equal(fw.moveName, 'Fire Blast');
      assert.equal(fw.power, 110);
    });

    test('Forewarn avalia golpes OHKO como 150 BP (superando golpes normais de 120 BP)', () => {
      const state = createBattleState(
        { id: 97, name: 'Hypno', ability: 'forewarn' },
        { id: 130, name: 'Gyarados', moves: [
          { id: 56, name: 'Hydro Pump', power: 110, damageClass: 'special' },
          { id: 329, name: 'Sheer Cold', power: null, damageClass: 'special' }
        ]}
      );
      const events = [];
      C.P7.enter(state, 'player', C, events);
      const fw = events.find(e => e.type === 'FOREWARN_REVEALED');
      assert.ok(fw);
      assert.equal(fw.moveName, 'Sheer Cold');
      assert.equal(fw.power, 150);
    });

    test('Forewarn avalia Counter/Mirror Coat como 120 BP', () => {
      const state = createBattleState(
        { id: 97, name: 'Hypno', ability: 'forewarn' },
        { id: 202, name: 'Wobbuffet', moves: [
          { id: 68, name: 'Counter', power: null, damageClass: 'physical' },
          { id: 33, name: 'Tackle', power: 40, damageClass: 'physical' }
        ]}
      );
      const events = [];
      C.P7.enter(state, 'player', C, events);
      const fw = events.find(e => e.type === 'FOREWARN_REVEALED');
      assert.ok(fw);
      assert.equal(fw.moveName, 'Counter');
      assert.equal(fw.power, 120);
    });

    test('Forewarn desempata deterministicamente via forewarnRoll', () => {
      const state = createBattleState(
        { id: 97, name: 'Hypno', ability: 'forewarn' },
        { id: 6, name: 'Charizard', moves: [
          { id: 53, name: 'Flamethrower', power: 90, damageClass: 'special' },
          { id: 85, name: 'Thunderbolt', power: 90, damageClass: 'special' }
        ]},
        { turnActions: { player: { forewarnRoll: 1 } } }
      );
      const events = [];
      C.P7.enter(state, 'player', C, events);
      const fw = events.find(e => e.type === 'FOREWARN_REVEALED');
      assert.ok(fw);
      assert.equal(fw.moveName, 'Thunderbolt', 'Roll 1 deve selecionar o segundo golpe empatado');
    });
  });

  // ==========================================
  // 7. PICKPOCKET
  // ==========================================
  describe('7. Pickpocket', () => {
    test('Defensor com Pickpocket sem item rouba item do atacante ao receber golpe de contato', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth', item: 'life-orb' },
        { id: 461, name: 'Weavile', ability: 'pickpocket', item: null }
      );
      const events = [];
      const contactMove = { id: 33, name: 'Tackle', damageClass: 'physical' };
      C.P7.afterHit(state, 'player', contactMove, {}, C, events, 20, state.player.activePokemon, state.enemy.activePokemon);
      assert.equal(state.enemy.activePokemon.item, 'life-orb', 'Weavile deve ter roubado Life Orb');
      assert.equal(state.player.activePokemon.item, null, 'Meowth deve ter perdido Life Orb');
      const stolen = events.find(e => e.type === 'ITEM_STOLEN');
      assert.ok(stolen);
      assert.equal(stolen.ability, 'pickpocket');
    });

    test('Pickpocket NÃO ativa se o portador já estiver segurando um item', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth', item: 'life-orb' },
        { id: 461, name: 'Weavile', ability: 'pickpocket', item: 'focus-sash' }
      );
      const events = [];
      const contactMove = { id: 33, name: 'Tackle', damageClass: 'physical' };
      C.P7.afterHit(state, 'player', contactMove, {}, C, events, 20, state.player.activePokemon, state.enemy.activePokemon);
      assert.equal(state.enemy.activePokemon.item, 'focus-sash');
      assert.equal(state.player.activePokemon.item, 'life-orb');
    });

    test('Pickpocket NÃO ativa em golpes que não fazem contato (ex: Surf / Thunderbolt)', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth', item: 'life-orb' },
        { id: 461, name: 'Weavile', ability: 'pickpocket', item: null }
      );
      const events = [];
      const nonContactMove = { id: 85, name: 'Thunderbolt', damageClass: 'special' };
      C.P7.afterHit(state, 'player', nonContactMove, {}, C, events, 20, state.player.activePokemon, state.enemy.activePokemon);
      assert.equal(state.enemy.activePokemon.item, null);
      assert.equal(state.player.activePokemon.item, 'life-orb');
    });

    test('Pickpocket respeita Sticky Hold do atacante', () => {
      const state = createBattleState(
        { id: 89, name: 'Muk', ability: 'sticky-hold', item: 'black-sludge' },
        { id: 461, name: 'Weavile', ability: 'pickpocket', item: null }
      );
      const events = [];
      const contactMove = { id: 33, name: 'Tackle', damageClass: 'physical' };
      C.P7.afterHit(state, 'player', contactMove, {}, C, events, 20, state.player.activePokemon, state.enemy.activePokemon);
      assert.equal(state.enemy.activePokemon.item, null, 'Sticky Hold impede roubo');
      assert.equal(state.player.activePokemon.item, 'black-sludge');
    });

    test('Roubo por Pickpocket ativa Unburden no atacante espoliado', () => {
      const state = createBattleState(
        { id: 254, name: 'Sceptile', ability: 'unburden', item: 'sitrus-berry' },
        { id: 461, name: 'Weavile', ability: 'pickpocket', item: null }
      );
      const events = [];
      const contactMove = { id: 33, name: 'Tackle', damageClass: 'physical' };
      C.P7.afterHit(state, 'player', contactMove, {}, C, events, 20, state.player.activePokemon, state.enemy.activePokemon);
      assert.equal(state.enemy.activePokemon.item, 'sitrus-berry');
      assert.equal(state.player.activePokemon.item, null);
      assert.equal(state.player.activePokemon.unburdenActive, true);
      assert.equal(C.P7.stat(state.player.activePokemon, 'speed'), 2.0);
    });
  });

  // ==========================================
  // 8. HARVEST
  // ==========================================
  describe('8. Harvest', () => {
    test('Harvest recupera berry consumida no final do turno sob Sol com 100% de chance', () => {
      const state = createBattleState(
        { id: 103, name: 'Exeggutor', ability: 'harvest', item: null, lastConsumedBerry: 'sitrus-berry' },
        { id: 52, name: 'Meowth' },
        { weather: { id: 'sun', turns: 5 } }
      );
      state.player.activePokemon.envWeather = 'sun';
      const events = [];
      C.P7.earlyResidual(state, C, events);
      assert.equal(state.player.activePokemon.item, 'sitrus-berry', 'Berry deve ser restaurada no sol');
      assert.equal(state.player.activePokemon.lastConsumedBerry, null);
      const rec = events.find(e => e.type === 'HARVEST_RECOVERED');
      assert.ok(rec);
    });

    test('Harvest tem 50% de chance sem Sol: roll <= 50 recupera, roll > 50 falha', () => {
      // Sucesso: roll 40
      const stateSuccess = createBattleState(
        { id: 103, name: 'Exeggutor', ability: 'harvest', item: null, lastConsumedBerry: 'sitrus-berry' },
        { id: 52, name: 'Meowth' },
        { turnActions: { player: { harvestRoll: 40 } } }
      );
      const eventsSuccess = [];
      C.P7.earlyResidual(stateSuccess, C, eventsSuccess);
      assert.equal(stateSuccess.player.activePokemon.item, 'sitrus-berry');

      // Falha: roll 60
      const stateFail = createBattleState(
        { id: 103, name: 'Exeggutor', ability: 'harvest', item: null, lastConsumedBerry: 'sitrus-berry' },
        { id: 52, name: 'Meowth' },
        { turnActions: { player: { harvestRoll: 60 } } }
      );
      const eventsFail = [];
      C.P7.earlyResidual(stateFail, C, eventsFail);
      assert.equal(stateFail.player.activePokemon.item, null);
      assert.equal(stateFail.player.activePokemon.lastConsumedBerry, 'sitrus-berry');
    });

    test('Harvest NÃO restaura itens que não sejam Berries', () => {
      const state = createBattleState(
        { id: 103, name: 'Exeggutor', ability: 'harvest', item: null, lastConsumedBerry: null },
        { id: 52, name: 'Meowth' },
        { weather: { id: 'sun', turns: 5 } }
      );
      const events = [];
      C.P7.earlyResidual(state, C, events);
      assert.equal(state.player.activePokemon.item, null);
    });

    test('Berry restaurada por Harvest é consumida imediatamente se o Pokémon estiver com HP baixo', () => {
      const state = createBattleState(
        { id: 103, name: 'Exeggutor', ability: 'harvest', item: null, lastConsumedBerry: 'sitrus-berry', currentHp: 30, maxHp: 100 },
        { id: 52, name: 'Meowth' },
        { weather: { id: 'sun', turns: 5 } }
      );
      state.player.activePokemon.envWeather = 'sun';
      const events = [];
      C.P7.earlyResidual(state, C, events);
      // Restaura e consome imediatamente
      assert.equal(state.player.activePokemon.item, null);
      assert.equal(state.player.activePokemon.currentHp, 30 + 25);
    });
  });

  // ==========================================
  // 9. CHEEK POUCH
  // ==========================================
  describe('9. Cheek Pouch', () => {
    test('Cheek Pouch cura 1/3 do HP adicional ao consumir Sitrus Berry (25% + 33.3% = 58.3%)', () => {
      const state = createBattleState(
        { id: 820, name: 'Greedent', ability: 'cheek-pouch', item: 'sitrus-berry', currentHp: 40, maxHp: 120 },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.item, null);
      // Sitrus: floor(120 / 4) = 30. Cheek Pouch: floor(120 / 3) = 40. Total = 70.
      assert.equal(state.player.activePokemon.currentHp, 40 + 30 + 40);
      const cheekEvent = events.find(e => e.type === 'CHEEK_POUCH_HEAL');
      assert.ok(cheekEvent);
      assert.equal(cheekEvent.healedAmount, 40);
    });

    test('Cheek Pouch cura 1/3 do HP ao consumir stat berry (Salac Berry)', () => {
      const state = createBattleState(
        { id: 820, name: 'Greedent', ability: 'cheek-pouch', item: 'salac-berry', currentHp: 20, maxHp: 120 },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.item, null);
      assert.equal(state.player.activePokemon.statStages.speed, 1);
      // Curou 40 HP
      assert.equal(state.player.activePokemon.currentHp, 20 + 40);
    });

    test('Cheek Pouch cura 1/3 do HP ao consumir status berry (Cheri Berry)', () => {
      const state = createBattleState(
        { id: 820, name: 'Greedent', ability: 'cheek-pouch', item: 'cheri-berry', statusCondition: 'paralysis', currentHp: 60, maxHp: 120 },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.statusCondition, null);
      assert.equal(state.player.activePokemon.currentHp, 60 + 40);
    });
  });

  // ==========================================
  // 10. MAGICIAN
  // ==========================================
  describe('10. Magician', () => {
    test('Atacante com Magician sem item rouba item do defensor em golpe de dano', () => {
      const state = createBattleState(
        { id: 655, name: 'Delphox', ability: 'magician', item: null },
        { id: 52, name: 'Meowth', item: 'life-orb' }
      );
      const events = [];
      const damageMove = { id: 53, name: 'Flamethrower', power: 90, damageClass: 'special' };
      C.P7.afterHit(state, 'player', damageMove, {}, C, events, 30, state.player.activePokemon, state.enemy.activePokemon);
      assert.equal(state.player.activePokemon.item, 'life-orb', 'Delphox deve roubar Life Orb');
      assert.equal(state.enemy.activePokemon.item, null, 'Meowth deve perder Life Orb');
      const stolen = events.find(e => e.type === 'ITEM_STOLEN');
      assert.ok(stolen);
      assert.equal(stolen.ability, 'magician');
    });

    test('Magician NÃO rouba em golpes de status', () => {
      const state = createBattleState(
        { id: 655, name: 'Delphox', ability: 'magician', item: null },
        { id: 52, name: 'Meowth', item: 'life-orb' }
      );
      const events = [];
      const statusMove = { id: 45, name: 'Growl', power: null, damageClass: 'status' };
      C.P7.afterHit(state, 'player', statusMove, {}, C, events, 0, state.player.activePokemon, state.enemy.activePokemon);
      assert.equal(state.player.activePokemon.item, null);
      assert.equal(state.enemy.activePokemon.item, 'life-orb');
    });

    test('Magician NÃO rouba se o atacante já estiver segurando um item', () => {
      const state = createBattleState(
        { id: 655, name: 'Delphox', ability: 'magician', item: 'focus-sash' },
        { id: 52, name: 'Meowth', item: 'life-orb' }
      );
      const events = [];
      const damageMove = { id: 53, name: 'Flamethrower', power: 90, damageClass: 'special' };
      C.P7.afterHit(state, 'player', damageMove, {}, C, events, 30, state.player.activePokemon, state.enemy.activePokemon);
      assert.equal(state.player.activePokemon.item, 'focus-sash');
      assert.equal(state.enemy.activePokemon.item, 'life-orb');
    });

    test('Magician respeita Sticky Hold no defensor', () => {
      const state = createBattleState(
        { id: 655, name: 'Delphox', ability: 'magician', item: null },
        { id: 89, name: 'Muk', ability: 'sticky-hold', item: 'black-sludge' }
      );
      const events = [];
      const damageMove = { id: 53, name: 'Flamethrower', power: 90, damageClass: 'special' };
      C.P7.afterHit(state, 'player', damageMove, {}, C, events, 30, state.player.activePokemon, state.enemy.activePokemon);
      assert.equal(state.player.activePokemon.item, null);
      assert.equal(state.enemy.activePokemon.item, 'black-sludge');
    });
  });

  // ==========================================
  // 11. STICKY HOLD
  // ==========================================
  describe('11. Sticky Hold', () => {
    test('Sticky Hold protege contra Thief', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth', item: null },
        { id: 89, name: 'Muk', ability: 'sticky-hold', item: 'black-sludge' }
      );
      const events = [];
      C.P7.takeItem(state, 'player', { id: 168 }, C, events);
      assert.equal(state.player.activePokemon.item, null, 'Thief não deve roubar');
      assert.equal(state.enemy.activePokemon.item, 'black-sludge');
    });

    test('Sticky Hold protege contra remoção de item por Knock Off', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth', item: null },
        { id: 89, name: 'Muk', ability: 'sticky-hold', item: 'black-sludge' }
      );
      const events = [];
      C.P7.takeItem(state, 'player', { id: 282 }, C, events);
      assert.equal(state.enemy.activePokemon.item, 'black-sludge', 'Item não deve ser removido');
    });

    test('Knock Off NÃO recebe boost de 1.5x contra portador de Sticky Hold sem Mold Breaker', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth', ability: 'pickup' },
        { id: 89, name: 'Muk', ability: 'sticky-hold', item: 'black-sludge' }
      );
      const f = C.P7.power(state, state.player.activePokemon, state.enemy.activePokemon, { id: 282, type: 'dark' }, 65);
      assert.equal(f, 65, 'Knock Off mantém base power 65 sem boost de 1.5x contra Sticky Hold');

      // Com defensor sem Sticky Hold, Knock Off recebe 1.5x (65 * 1.5 = 97.5)
      state.enemy.activePokemon.ability = 'stench';
      const fBoosted = C.P7.power(state, state.player.activePokemon, state.enemy.activePokemon, { id: 282, type: 'dark' }, 65);
      assert.equal(fBoosted, 97.5, 'Knock Off recebe 1.5x contra item removível');
    });

    test('Atacante com Mold Breaker quebra Sticky Hold e remove item com Knock Off', () => {
      const state = createBattleState(
        { id: 530, name: 'Excadrill', ability: 'mold-breaker' },
        { id: 89, name: 'Muk', ability: 'sticky-hold', item: 'black-sludge' }
      );
      assert.equal(C.P7.removable(state.enemy.activePokemon, state.player.activePokemon), true, 'Mold Breaker ignora Sticky Hold');
      const events = [];
      C.P7.takeItem(state, 'player', { id: 282 }, C, events);
      assert.equal(state.enemy.activePokemon.item, null, 'Item deve ser removido por atacante com Mold Breaker');
    });
  });

  // ==========================================
  // 12. RIPEN
  // ==========================================
  describe('12. Ripen', () => {
    test('Ripen dobra a cura de Sitrus Berry (50% max HP em vez de 25%)', () => {
      const state = createBattleState(
        { id: 841, name: 'Flapple', ability: 'ripen', item: 'sitrus-berry', currentHp: 40, maxHp: 100 },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.item, null);
      // Cura 50% em vez de 25%: 40 + 50 = 90
      assert.equal(state.player.activePokemon.currentHp, 90);
    });

    test('Ripen dobra a cura de Oran Berry (20 HP em vez de 10 HP)', () => {
      const state = createBattleState(
        { id: 841, name: 'Flapple', ability: 'ripen', item: 'oran-berry', currentHp: 40, maxHp: 100 },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.item, null);
      assert.equal(state.player.activePokemon.currentHp, 60, 'Cura 20 HP com Ripen');
    });

    test('Ripen dobra o bônus de estágios de pinch stat berries (+2 estágios)', () => {
      const state = createBattleState(
        { id: 841, name: 'Flapple', ability: 'ripen', item: 'liechi-berry', currentHp: 20, maxHp: 100 },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.item, null);
      assert.equal(state.player.activePokemon.statStages.attack, 2, 'Liechi Berry deve conceder +2 Attack com Ripen');
    });

    test('Ripen dobra a redução de dano de resist berries (0.25x em vez de 0.5x)', () => {
      const state = createBattleState(
        { id: 6, name: 'Charizard' },
        { id: 841, name: 'Flapple', ability: 'ripen', item: 'occa-berry', types: ['grass', 'dragon'] }
      );
      // Occa Berry contra golpe Fire super-efetivo (2x)
      const fireMove = { id: 53, name: 'Flamethrower', type: 'fire', damageClass: 'special' };
      const mult = C.P7.damageMultiplier(state, state.player.activePokemon, state.enemy.activePokemon, fireMove, 2.0);
      assert.equal(mult, 0.25, 'Ripen deve reduzir o dano a 0.25x com resist berry');
    });

    test('Sem Ripen, resist berries reduzem a 0.5x', () => {
      const state = createBattleState(
        { id: 6, name: 'Charizard' },
        { id: 1, name: 'Bulbasaur', ability: 'overgrow', item: 'occa-berry', types: ['grass', 'poison'] }
      );
      const fireMove = { id: 53, name: 'Flamethrower', type: 'fire', damageClass: 'special' };
      const mult = C.P7.damageMultiplier(state, state.player.activePokemon, state.enemy.activePokemon, fireMove, 2.0);
      assert.equal(mult, 0.5, 'Normalmente resist berry reduz a 0.5x');
    });
  });

  // ==========================================
  // 13. CUD CHEW
  // ==========================================
  describe('13. Cud Chew', () => {
    test('Ao consumir Berry, agenda Cud Chew para o final do turno seguinte', () => {
      const state = createBattleState(
        { id: 981, name: 'Farigiraf', ability: 'cud-chew', item: 'sitrus-berry', currentHp: 50, maxHp: 100 },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.item, null);
      assert.equal(state.player.activePokemon.currentHp, 75);
      assert.equal(state.player.activePokemon.cudChewBerry, 'sitrus-berry');
      assert.equal(state.player.activePokemon.cudChewScheduled, true);

      // Final do turno 1: apenas desmarca scheduled, NÃO ativa ainda
      C.P7.earlyResidual(state, C, events);
      assert.equal(state.player.activePokemon.cudChewScheduled, false);
      assert.equal(state.player.activePokemon.currentHp, 75, 'Não ativa no final do mesmo turno');

      // Sofre dano no turno 2
      state.player.activePokemon.currentHp = 50;

      // Final do turno 2: ativa Cud Chew e consome a berry novamente
      C.P7.earlyResidual(state, C, events);
      assert.equal(state.player.activePokemon.currentHp, 75, 'Ativa no final do turno seguinte');
      assert.equal(state.player.activePokemon.cudChewBerry, null);
      const activated = events.find(e => e.type === 'CUD_CHEW_ACTIVATED');
      assert.ok(activated);
    });

    test('Unnerve bloqueia a ativação de Cud Chew no final do turno seguinte', () => {
      const state = createBattleState(
        { id: 981, name: 'Farigiraf', ability: 'cud-chew', item: null, cudChewBerry: 'sitrus-berry', cudChewScheduled: false, currentHp: 50, maxHp: 100 },
        { id: 150, name: 'Mewtwo', ability: 'unnerve' }
      );
      const events = [];
      C.P7.earlyResidual(state, C, events);
      assert.equal(state.player.activePokemon.currentHp, 50, 'Unnerve bloqueia Cud Chew');
      assert.equal(state.player.activePokemon.cudChewBerry, 'sitrus-berry', 'Berry continua retida');
    });

    test('Trocar de Pokémon (leave) cancela o Cud Chew agendado', () => {
      const state = createBattleState(
        { id: 981, name: 'Farigiraf', ability: 'cud-chew', cudChewBerry: 'sitrus-berry', cudChewScheduled: true },
        { id: 52, name: 'Meowth' }
      );
      const events = [];
      C.P7.leave(state, 'player', state.player.activePokemon, C, events);
      assert.equal(state.player.activePokemon.cudChewBerry, undefined);
      assert.equal(state.player.activePokemon.cudChewScheduled, undefined);
    });
  });

  // ==========================================
  // 14. PICKUP
  // ==========================================
  describe('14. Pickup', () => {
    test('Pickup recolhe item consumido por outro Pokémon ativo no turno', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth', ability: 'pickup', item: null },
        { id: 143, name: 'Snorlax', item: 'sitrus-berry', currentHp: 40, maxHp: 100 }
      );
      const events = [];
      // Snorlax consome Sitrus Berry
      C.P7.checkItem(state, 'enemy', C, events, state.enemy.activePokemon);
      assert.equal(state.enemy.activePokemon.item, null);
      assert.equal(state.consumedItemsThisTurn?.length, 1);

      // Final do turno: Meowth recolhe Sitrus Berry
      C.P7.earlyResidual(state, C, events);
      assert.equal(state.player.activePokemon.item, 'sitrus-berry');
      const pickupEvent = events.find(e => e.type === 'PICKUP_RECOVERED');
      assert.ok(pickupEvent);
      assert.equal(pickupEvent.item, 'sitrus-berry');

      // Ao fim do turno, consumedItemsThisTurn é limpo
      C.P7.endTurn(state, C, events);
      assert.equal(state.consumedItemsThisTurn.length, 0);
    });

    test('Pickup NÃO recolhe item consumido pelo próprio portador', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth', ability: 'pickup', item: 'sitrus-berry', currentHp: 40, maxHp: 100 },
        { id: 25, name: 'Pikachu', item: null }
      );
      const events = [];
      C.P7.checkItem(state, 'player', C, events, state.player.activePokemon);
      assert.equal(state.player.activePokemon.item, null);

      C.P7.earlyResidual(state, C, events);
      assert.equal(state.player.activePokemon.item, null, 'Não deve recolher item consumido por si mesmo');
    });

    test('Múltiplos usuários de Pickup não duplicam o mesmo item', () => {
      const state = {
        battleFormat: 'DOUBLES',
        player: {
          team: [createPokemon({ id: 52, name: 'Meowth 1', ability: 'pickup', item: null }), createPokemon({ id: 52, name: 'Meowth 2', ability: 'pickup', item: null })],
          activeIndex: 0,
          activeIndices: [0, 1]
        },
        enemy: {
          team: [createPokemon({ id: 143, name: 'Snorlax', item: 'sitrus-berry', currentHp: 40, maxHp: 100 }), createPokemon({ id: 25, name: 'Pikachu' })],
          activeIndex: 0,
          activeIndices: [0, 1]
        },
        version: 2
      };
      const events = [];
      C.P7.checkItem(state, 'enemy', C, events, state.enemy.team[0]);
      assert.equal(state.consumedItemsThisTurn?.length, 1);

      C.P7.earlyResidual(state, C, events);
      const p1 = state.player.team[0].item;
      const p2 = state.player.team[1].item;
      assert.ok((p1 === 'sitrus-berry' && p2 === null) || (p1 === null && p2 === 'sitrus-berry'), 'Apenas um Meowth deve recolher a Berry');
    });
  });

  // ==========================================
  // 15. REGISTRY & METADATA AUDIT
  // ==========================================
  describe('15. Registry & Metadata Audit', () => {
    const H8_LIST = [
      'gluttony',
      'unburden',
      'klutz',
      'frisk',
      'anticipation',
      'forewarn',
      'pickpocket',
      'harvest',
      'cheek-pouch',
      'magician',
      'sticky-hold',
      'ripen',
      'cud-chew',
      'pickup'
    ];

    test('Todas as 14 habilidades H8 estão registradas com status FULL e phase H8', () => {
      for (const slug of H8_LIST) {
        const info = Registry.getAbility(slug);
        assert.ok(info, `Habilidade ${slug} deve existir no Registry`);
        assert.equal(info.status, 'FULL', `${slug} deve ter status FULL`);
        assert.equal(info.phase, 'H8', `${slug} deve pertencer à phase H8`);
        assert.ok(info.testFiles.includes('tests/battle/abilities-h8.test.js'), `${slug} deve referenciar abilities-h8.test.js`);
      }
    });

    test('Todas as 14 habilidades H8 constam em P7.abilityNames', () => {
      for (const slug of H8_LIST) {
        assert.ok(C.P7.abilityNames.includes(slug), `${slug} deve constar em P7.abilityNames`);
      }
    });
  });
});
