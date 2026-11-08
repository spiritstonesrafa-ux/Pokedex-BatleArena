const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../assets/js/battle/battle-constants.js');
const Engine = require('../../assets/js/battle/battle-engine.js');
const Registry = require('../../assets/js/battle/ability-registry.js');
const TurnManager = require('../../assets/js/battle/turn-manager.js');
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

describe('H5 CANONICAL ABILITIES SUITE (18 ABILITIES — SHOWDOWN GEN IX)', () => {

  // ==========================================
  // 1. SUCTION CUPS
  // ==========================================
  describe('1. Suction Cups', () => {
    test('Suction Cups impede troca forçada por Dragon Tail', () => {
      const state = createBattleState(
        { id: 149, name: 'Dragonite', moves: [{ id: 525, name: 'dragon-tail', power: 60, accuracy: 100, type: 'dragon', damageClass: 'physical', currentPp: 10, maxPp: 10, target: 'normal' }] },
        { id: 224, name: 'Octillery', ability: 'suction-cups', bench: [createPokemon({ id: 129, name: 'Magikarp' })] }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 525 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.activeIndex, 0, 'Octillery não deve ser trocado');
      const prepared = res.events.find(e => e.type === 'MOVE_PREPARED' && e.label === 'suction-cups');
      assert.ok(prepared, 'Deve emitir evento indicando bloqueio por suction-cups');
    });

    test('Mold Breaker ignora Suction Cups e força a troca', () => {
      const state = createBattleState(
        { id: 530, name: 'Excadrill', ability: 'mold-breaker', moves: [{ id: 525, name: 'dragon-tail', power: 60, accuracy: 100, type: 'dragon', damageClass: 'physical', currentPp: 10, maxPp: 10, target: 'normal' }] },
        { id: 224, name: 'Octillery', ability: 'suction-cups', bench: [createPokemon({ id: 129, name: 'Magikarp' })] }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 525 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.activeIndex, 1, 'Mold Breaker deve forçar a troca');
    });
  });

  // ==========================================
  // 2. TRUANT
  // ==========================================
  describe('2. Truant', () => {
    test('Slaking ataca no turno 1, fica ocioso (loafing) no turno 2, e ataca no turno 3', () => {
      const state = createBattleState(
        { id: 289, name: 'Slaking', ability: 'truant', speed: 100 },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200, speed: 20 }
      );
      C.P7.enter(state, 'player', C, []);
      assert.equal(state.player.team[0].truantTurn, false, 'Turno 1 não é turno de vadiagem');

      // Turno 1: Ataca com sucesso
      const t1 = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 33 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const t1Used = t1.events.some(e => e.type === C.BATTLE_EVENTS.MOVE_USED && e.actor === 'player');
      assert.ok(t1Used, 'Slaking deve usar o golpe no turno 1');

      // Turno 2: Fica ocioso (TRUANT_LOAFING), sem consumo de PP
      const ppBefore = t1.state.player.team[0].moves[0].currentPp;
      const t2 = Engine.resolveTurn(t1.state, {
        player: { type: 'MOVE', moveId: 33 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const t2Failed = t2.events.some(e => e.type === C.BATTLE_EVENTS.MOVE_FAILED && e.reason === 'TRUANT_LOAFING');
      assert.ok(t2Failed, 'Slaking deve falhar com TRUANT_LOAFING no turno 2');
      assert.equal(t2.state.player.team[0].moves[0].currentPp, ppBefore, 'PP não deve ser gasto no turno de vadiagem');

      // Turno 3: Ataca novamente
      const t3 = Engine.resolveTurn(t2.state, {
        player: { type: 'MOVE', moveId: 33 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const t3Used = t3.events.some(e => e.type === C.BATTLE_EVENTS.MOVE_USED && e.actor === 'player');
      assert.ok(t3Used, 'Slaking deve atacar com sucesso no turno 3');
    });

    test('Neutralizing Gas suprime Truant permitindo ataques consecutivos', () => {
      const state = createBattleState(
        { id: 289, name: 'Slaking', ability: 'truant', speed: 100 },
        { id: 110, name: 'Weezing-Galar', ability: 'neutralizing-gas', speed: 20 }
      );
      C.P7.start(state, C);
      state.player.team[0].truantTurn = true; // Mesmo com truantTurn = true
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 33 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const used = res.events.some(e => e.type === C.BATTLE_EVENTS.MOVE_USED && e.actor === 'player');
      assert.ok(used, 'Neutralizing Gas permite Slaking atacar mesmo com truantTurn');
    });
  });

  // ==========================================
  // 3. SLOW START
  // ==========================================
  describe('3. Slow Start', () => {
    test('Slow Start reduz Attack e Speed em 50% por 5 turnos, mas não SpA', () => {
      const state = createBattleState(
        { id: 486, name: 'Regigigas', ability: 'slow-start', attack: 160, speed: 100, specialAttack: 80 },
        { id: 52, name: 'Meowth', speed: 60 }
      );
      C.P7.enter(state, 'player', C, []);
      assert.equal(state.player.team[0].slowStartTurns, 5, 'Deve iniciar com 5 turnos');

      const effAtk = C.getEffectiveStat(state.player.team[0], 'attack');
      const effSpe = C.getEffectiveStat(state.player.team[0], 'speed');
      const effSpA = C.getEffectiveStat(state.player.team[0], 'specialAttack');

      assert.equal(effAtk, 80, 'Attack deve ser reduzido pela metade (160 * 0.5 = 80)');
      assert.equal(effSpe, 50, 'Speed deve ser reduzido pela metade (100 * 0.5 = 50)');
      assert.equal(effSpA, 80, 'SpA não deve ser modificado (80)');
    });

    test('Slow Start expira após 5 turnos e restaura atributos', () => {
      const state = createBattleState(
        { id: 486, name: 'Regigigas', ability: 'slow-start', attack: 160, speed: 100 },
        { id: 52, name: 'Meowth', speed: 10 }
      );
      C.P7.enter(state, 'player', C, []);

      let curState = state;
      for (let t = 1; t <= 5; t++) {
        const res = Engine.resolveTurn(curState, {
          player: { type: 'MOVE', moveId: 45 },
          enemy: { type: 'MOVE', moveId: 45 }
        });
        curState = res.state;
      }

      assert.equal(curState.player.team[0].slowStartTurns, 0, 'Contador de Slow Start deve zerar');
      const restoredAtk = C.getEffectiveStat(curState.player.team[0], 'attack');
      assert.equal(restoredAtk, 160, 'Attack deve retornar ao valor normal após 5 turnos');
    });
  });

  // ==========================================
  // 4. STALL
  // ==========================================
  describe('4. Stall', () => {
    test('Stall faz o portador agir por último na mesma prioridade, mesmo sendo mais veloz', () => {
      const player = createPokemon({ id: 302, name: 'Sableye', ability: 'stall', speed: 200 });
      const enemy = createPokemon({ id: 52, name: 'Meowth', speed: 50 });

      const order = TurnManager.determineOrder(
        player, enemy,
        { type: 'MOVE', moveId: 33 }, // Tackle (prioridade 0)
        { type: 'MOVE', moveId: 33 }  // Tackle (prioridade 0)
      );
      assert.deepEqual(order, ['enemy', 'player'], 'Enemy deve agir primeiro porque Player tem Stall');
    });

    test('Stall com golpe de prioridade (+1) age antes de golpe de prioridade 0', () => {
      const player = createPokemon({ id: 302, name: 'Sableye', ability: 'stall', speed: 200, moves: [{ id: 98, name: 'Quick Attack', priority: 1, power: 40, damageClass: 'physical', currentPp: 30, maxPp: 30 }] });
      const enemy = createPokemon({ id: 52, name: 'Meowth', speed: 50 });

      const order = TurnManager.determineOrder(
        player, enemy,
        { type: 'MOVE', moveId: 98 }, // Quick Attack (+1)
        { type: 'MOVE', moveId: 33 }  // Tackle (0)
      );
      assert.deepEqual(order, ['player', 'enemy'], 'Golpe +1 do Stall age antes de golpe 0');
    });
  });

  // ==========================================
  // 5. PRANKSTER
  // ==========================================
  describe('5. Prankster', () => {
    test('Prankster concede +1 de prioridade a golpes de status', () => {
      const player = createPokemon({ id: 547, name: 'Whimsicott', ability: 'prankster', speed: 30 });
      const enemy = createPokemon({ id: 52, name: 'Meowth', speed: 100 });

      const order = TurnManager.determineOrder(
        player, enemy,
        { type: 'MOVE', moveId: 45 }, // Growl (status -> prioridade +1)
        { type: 'MOVE', moveId: 33 }  // Tackle (physical -> prioridade 0)
      );
      assert.deepEqual(order, ['player', 'enemy'], 'Whimsicott age primeiro com status + Prankster');
    });

    test('Prankster falha contra oponentes do tipo Dark', () => {
      const state = createBattleState(
        { id: 547, name: 'Whimsicott', ability: 'prankster', moves: [{ id: 269, name: 'Taunt', damageClass: 'status', currentPp: 20, maxPp: 20, target: 'normal' }] },
        { id: 197, name: 'Umbreon', types: ['dark'] }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 269 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const immune = res.events.find(e => e.type === C.BATTLE_EVENTS.MOVE_FAILED && e.reason === 'IMMUNE_PRANKSTER');
      assert.ok(immune, 'Deve falhar contra Dark-type com IMMUNE_PRANKSTER');
    });
  });

  // ==========================================
  // 6. INFILTRATOR
  // ==========================================
  describe('6. Infiltrator', () => {
    test('Infiltrator ultrapassa barreiras (Reflect/Light Screen/Aurora Veil)', () => {
      const state = createBattleState(
        { id: 887, name: 'Dragapult', ability: 'infiltrator', moves: [{ id: 85, name: 'Thunderbolt', power: 90, damageClass: 'special', type: 'electric', currentPp: 15, maxPp: 15 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      state.p6Sides.enemy.lightScreen = 5;
      const mult = C.P6.barrierMultiplier(state, 'enemy', { id: 85, damageClass: 'special' }, false, state.player.team[0]);
      assert.equal(mult, 1, 'Infiltrator ignora Light Screen (multiplicador 1x)');
    });

    test('Infiltrator atinge alvo diretamente através do Substitute', () => {
      const state = createBattleState(
        { id: 887, name: 'Dragapult', ability: 'infiltrator', moves: [{ id: 33, name: 'Tackle', power: 40, damageClass: 'physical', type: 'normal', currentPp: 35, maxPp: 35 }] },
        { id: 52, name: 'Meowth', currentHp: 100, maxHp: 100, substituteHp: 25, substitute: true }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 33 },
        enemy: { type: 'MOVE', moveId: 45 }
      });
      assert.equal(res.state.enemy.team[0].substituteHp, 25, 'Substitute HP permanece intacto');
      assert.ok(res.state.enemy.team[0].currentHp < 100, 'Dano foi aplicado diretamente ao HP do alvo');
    });
  });

  // ==========================================
  // 7. GALE WINGS
  // ==========================================
  describe('7. Gale Wings', () => {
    test('Gale Wings concede +1 prioridade a golpes Flying com HP cheio (100%)', () => {
      const talonflame = createPokemon({ id: 663, name: 'Talonflame', ability: 'gale-wings', currentHp: 100, maxHp: 100, speed: 50 });
      const enemy = createPokemon({ id: 52, name: 'Meowth', speed: 100 });
      const flyingMove = { id: 403, name: 'Air Slash', type: 'flying', damageClass: 'special', currentPp: 15, maxPp: 15 };

      const order = TurnManager.determineOrder(
        talonflame, enemy,
        { type: 'MOVE', move: flyingMove },
        { type: 'MOVE', moveId: 33 }
      );
      assert.deepEqual(order, ['player', 'enemy'], 'Talonflame com 100% HP age primeiro com golpe Flying');
    });

    test('Gale Wings NÃO concede prioridade com HP < 100%', () => {
      const talonflame = createPokemon({ id: 663, name: 'Talonflame', ability: 'gale-wings', currentHp: 99, maxHp: 100, speed: 50 });
      const enemy = createPokemon({ id: 52, name: 'Meowth', speed: 100 });
      const flyingMove = { id: 403, name: 'Air Slash', type: 'flying', damageClass: 'special', currentPp: 15, maxPp: 15 };

      const order = TurnManager.determineOrder(
        talonflame, enemy,
        { type: 'MOVE', move: flyingMove },
        { type: 'MOVE', moveId: 33 }
      );
      assert.deepEqual(order, ['enemy', 'player'], 'Meowth age primeiro pois Gale Wings não ativa sem HP cheio');
    });
  });

  // ==========================================
  // 8. PARENTAL BOND
  // ==========================================
  describe('8. Parental Bond', () => {
    test('Parental Bond acerta 2 vezes: hit 1 a 100% e hit 2 a 25% de dano', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 33, name: 'Tackle', power: 40, damageClass: 'physical', currentPp: 35, maxPp: 35 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 33, damageRoll: 100, hitDamageRolls: [100, 100] },
        enemy: { type: 'MOVE', moveId: 45 }
      });
      const damages = res.events.filter(e => e.type === C.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
      assert.equal(damages.length, 2, 'Deve registrar exatamente dois danos');
      assert.equal(damages[1].damage, Math.max(1, Math.floor(damages[0].damage * 0.25)), 'Segundo hit deve causar 25% do dano do primeiro hit');
      const complete = res.events.find(e => e.type === C.BATTLE_EVENTS.MULTI_HIT_COMPLETE);
      assert.ok(complete, 'Deve emitir evento MULTI_HIT_COMPLETE');
      assert.equal(complete.hitCount, 2);
    });

    test('Parental Bond gasta apenas 1 PP no movimento', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 33, name: 'Tackle', power: 40, damageClass: 'physical', currentPp: 35, maxPp: 35 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 33 },
        enemy: { type: 'MOVE', moveId: 45 }
      });
      assert.equal(res.state.player.team[0].moves[0].currentPp, 34, 'Deve deduzir exatamente 1 PP');
    });

    test('Parental Bond: precisão única (se errar o teste de precisão, ambos os hits falham)', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 85, name: 'Thunderbolt', power: 90, accuracy: 70, type: 'electric', damageClass: 'special', currentPp: 15, maxPp: 15 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 85, accuracyRoll: 85 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const damages = res.events.filter(e => e.type === C.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
      assert.equal(damages.length, 0, 'Se errar na precisão única, nenhum impacto deve acertar');
      const missed = res.events.find(e => e.type === C.BATTLE_EVENTS.MOVE_MISSED && e.actor === 'player');
      assert.ok(missed, 'Deve emitir evento MOVE_MISSED');
    });

    test('Parental Bond: encerra sequência imediatamente se o alvo desmaiar no primeiro hit', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', attack: 150, moves: [{ id: 33, name: 'Tackle', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 35, maxPp: 35 }] },
        { id: 52, name: 'Meowth', currentHp: 15, maxHp: 100, defense: 40 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 33, damageRoll: 100 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const damages = res.events.filter(e => e.type === C.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
      assert.equal(damages.length, 1, 'Deve registrar apenas 1 dano pois o alvo desmaiou no primeiro hit');
      assert.equal(res.state.enemy.team[0].currentHp, 0, 'Alvo deve estar nocauteado');
    });

    test('Parental Bond: hit 1 quebra Substitute e hit 2 causa dano ao HP real do alvo', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 33, name: 'Tackle', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 35, maxPp: 35 }] },
        { id: 52, name: 'Meowth', currentHp: 100, maxHp: 100, substituteHp: 10, substitute: true }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 33, hitDamageRolls: [100, 100] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.team[0].substituteHp, 0, 'Substitute deve ter sido quebrado');
      assert.ok(res.state.enemy.team[0].currentHp < 100, 'Hit 2 deve ter causado dano ao HP real do alvo');
    });

    test('Parental Bond: ativa efeitos de contato (Rough Skin) em ambos os hits', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', currentHp: 100, maxHp: 100, moves: [{ id: 33, name: 'Tackle', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 35, maxPp: 35 }] },
        { id: 445, name: 'Garchomp', ability: 'rough-skin', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 33, hitDamageRolls: [100, 100] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const roughSkinDamages = res.events.filter(e => e.type === C.BATTLE_EVENTS.RECOIL_APPLIED && e.reason === 'rough-skin');
      assert.equal(roughSkinDamages.length, 2, 'Rough Skin deve ativar em ambos os hits de contato');
    });

    test('Parental Bond: primeiro impacto não ativa o efeito secundário e o segundo ativa', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 34, name: 'Body Slam', power: 85, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 15, maxPp: 15, secondaryEffect: { chance: 30, statusCondition: 'paralysis' } }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 34, hitSecondaryEffectRolls: [50, 10] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.team[0].statusCondition, 'paralysis', 'Paralisia deve ativar no segundo hit');
      const statusEvents = res.events.filter(e => e.type === C.BATTLE_EVENTS.STATUS_APPLIED && e.target === 'enemy');
      assert.equal(statusEvents.length, 1, 'Deve disparar apenas 1 evento de status');
      assert.equal(statusEvents[0].secondaryEffectRoll, 10, 'Rolagem do evento deve ser a do segundo hit (10)');
      assert.equal(statusEvents[0].hitIndex, 2, 'Hit index do evento deve ser 2');
    });

    test('Parental Bond: primeiro impacto ativa o efeito secundário e o segundo não', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 34, name: 'Body Slam', power: 85, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 15, maxPp: 15, secondaryEffect: { chance: 30, statusCondition: 'paralysis' } }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 34, hitSecondaryEffectRolls: [10, 50] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.team[0].statusCondition, 'paralysis', 'Paralisia deve ativar no primeiro hit');
      const statusEvents = res.events.filter(e => e.type === C.BATTLE_EVENTS.STATUS_APPLIED && e.target === 'enemy');
      assert.equal(statusEvents.length, 1);
      assert.equal(statusEvents[0].secondaryEffectRoll, 10);
      assert.equal(statusEvents[0].hitIndex, 1);
    });

    test('Parental Bond: Crunch com chance canônica oficial (20%) — hit 1 ativa (20) e hit 2 falha (21)', () => {
      // Catálogo oficial C.SECONDARY_EFFECT_MOVES['crunch'] define chance: 20 e statDrops: { defense: -1 }
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 242, name: 'crunch', power: 80, accuracy: 100, type: 'dark', damageClass: 'physical', currentPp: 15, maxPp: 15 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 242, hitSecondaryEffectRolls: [20, 21] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.team[0].statStages.defense, -1, 'Hit 1 (roll 20 <= 20) reduz Defesa em 1; Hit 2 (roll 21 > 20) falha');
      const dropEvents = res.events.filter(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.statKey === 'defense' && e.combatant === 'enemy');
      assert.equal(dropEvents.length, 1);
    });

    test('Parental Bond: Crunch com chance canônica oficial (20%) — hit 1 falha (21) e hit 2 ativa (20)', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 242, name: 'crunch', power: 80, accuracy: 100, type: 'dark', damageClass: 'physical', currentPp: 15, maxPp: 15 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 242, hitSecondaryEffectRolls: [21, 20] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.team[0].statStages.defense, -1, 'Hit 1 (roll 21 > 20) falha; Hit 2 (roll 20 <= 20) reduz Defesa em 1');
      const dropEvents = res.events.filter(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.statKey === 'defense' && e.combatant === 'enemy');
      assert.equal(dropEvents.length, 1);
    });

    test('Parental Bond: Crunch com chance canônica oficial (20%) — ambos os hits ativam (20, 20) acumulando -2 de Defesa', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 242, name: 'crunch', power: 80, accuracy: 100, type: 'dark', damageClass: 'physical', currentPp: 15, maxPp: 15 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 242, hitSecondaryEffectRolls: [20, 20] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.team[0].statStages.defense, -2, 'Ambos os hits ativam exatamente no limiar 20% totalizando -2 Defesa');
      const dropEvents = res.events.filter(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.statKey === 'defense' && e.combatant === 'enemy');
      assert.equal(dropEvents.length, 2);
    });

    test('Parental Bond: Crunch com chance canônica oficial (20%) — nenhum dos hits ativa (21, 21) imediatamente acima do limiar', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 242, name: 'crunch', power: 80, accuracy: 100, type: 'dark', damageClass: 'physical', currentPp: 15, maxPp: 15 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 242, hitSecondaryEffectRolls: [21, 21] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.team[0].statStages.defense, 0, 'Nenhum hit ativa com roll 21 (acima de 20%)');
      const dropEvents = res.events.filter(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'enemy');
      assert.equal(dropEvents.length, 0);
    });

    test('Parental Bond: Power-Up Punch concede os aumentos de Attack correspondentes aos dois impactos (+2 Attack)', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 612, name: 'power-up-punch', power: 40, accuracy: 100, type: 'fighting', damageClass: 'physical', currentPp: 20, maxPp: 20, secondaryEffect: { chance: 100, target: 'attacker', statBoosts: { attack: 1 } } }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 612 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.player.team[0].statStages.attack, 2, 'Power-Up Punch deve conceder +2 Attack total (+1 em cada hit)');
      const boostEvents = res.events.filter(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.statKey === 'attack' && e.combatant === 'player');
      assert.equal(boostEvents.length, 2, 'Devem ocorrer 2 eventos de aumento de Attack');
    });

    test('Parental Bond: golpe com chance de Burn (Flamethrower) ativa independentemente no segundo hit', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 53, name: 'Flamethrower', power: 90, accuracy: 100, type: 'fire', damageClass: 'special', currentPp: 15, maxPp: 15, secondaryEffect: { chance: 10, statusCondition: 'burn' } }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 53, hitSecondaryEffectRolls: [50, 5] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.team[0].statusCondition, 'burn', 'Queimadura deve ativar no segundo hit com roll 5 <= 10');
    });

    test('Parental Bond: Secret Power não ativa no hit 1 e ativa no hit 2 (final strike)', () => {
      // Cenário A: roll 1 teria ativado (5 <= 30), mas é suprimido no hit 1 de Secret Power; roll 2 falha (50 > 30)
      const stateA = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 290, name: 'secret-power', power: 70, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 20, maxPp: 20, secondaryEffect: { chance: 30, statusCondition: 'paralysis' } }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const resA = Engine.resolveTurn(stateA, {
        player: { type: 'MOVE', moveId: 290, hitSecondaryEffectRolls: [5, 50] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(resA.state.enemy.team[0].statusCondition, null, 'Secret Power NÃO pode ativar no primeiro hit de Parental Bond');

      // Cenário B: roll 1 não ativa (50 > 30); roll 2 ativa (5 <= 30) no golpe final
      const stateB = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 290, name: 'secret-power', power: 70, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 20, maxPp: 20, secondaryEffect: { chance: 30, statusCondition: 'paralysis' } }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const resB = Engine.resolveTurn(stateB, {
        player: { type: 'MOVE', moveId: 290, hitSecondaryEffectRolls: [50, 5] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(resB.state.enemy.team[0].statusCondition, 'paralysis', 'Secret Power ativa no golpe final');
    });

    test('Parental Bond: Secret Power sob Grassy Terrain infunde Sleep no hit 2 e bloqueia no hit 1', () => {
      // Cenário A: hit 1 bloqueado mesmo com roll 5 <= 30
      const stateA = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 290, name: 'secret-power', power: 70, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 20, maxPp: 20 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 },
        { p7Started: true, terrain: { id: 'grassy', turns: 5 } }
      );
      const resA = Engine.resolveTurn(stateA, {
        player: { type: 'MOVE', moveId: 290, hitSecondaryEffectRolls: [5, 50] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(resA.state.enemy.team[0].statusCondition, null, 'Grassy Secret Power bloqueado no hit 1');

      // Cenário B: hit 2 ativa sleep
      const stateB = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 290, name: 'secret-power', power: 70, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 20, maxPp: 20 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 },
        { p7Started: true, terrain: { id: 'grassy', turns: 5 } }
      );
      const resB = Engine.resolveTurn(stateB, {
        player: { type: 'MOVE', moveId: 290, hitSecondaryEffectRolls: [50, 5] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(resB.state.enemy.team[0].statusCondition, 'sleep', 'Grassy Secret Power aplica Sleep no golpe final');
    });

    test('Parental Bond: Secret Power sob Misty Terrain reduz SpA no hit 2 e bloqueia no hit 1', () => {
      // Cenário A: hit 1 bloqueado
      const stateA = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 290, name: 'secret-power', power: 70, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 20, maxPp: 20 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 },
        { p7Started: true, terrain: { id: 'misty', turns: 5 } }
      );
      const resA = Engine.resolveTurn(stateA, {
        player: { type: 'MOVE', moveId: 290, hitSecondaryEffectRolls: [5, 50] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(resA.state.enemy.team[0].statStages.specialAttack, 0, 'Misty Secret Power bloqueado no hit 1');

      // Cenário B: hit 2 reduz SpA
      const stateB = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 290, name: 'secret-power', power: 70, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 20, maxPp: 20 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 },
        { p7Started: true, terrain: { id: 'misty', turns: 5 } }
      );
      const resB = Engine.resolveTurn(stateB, {
        player: { type: 'MOVE', moveId: 290, hitSecondaryEffectRolls: [50, 5] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(resB.state.enemy.team[0].statStages.specialAttack, -1, 'Misty Secret Power reduz SpA no golpe final');
    });

    test('Parental Bond: Secret Power com efeito de Flinch preserva Flinch no hit 1 enquanto suprime efeito de status no hit 1', () => {
      // Showdown preserva efeitos de flinch (onSourceModifySecondaries filtra exceto volatileStatus === "flinch")
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 290, name: 'secret-power', power: 70, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 20, maxPp: 20, secondaryEffect: { chance: 30, statusCondition: 'paralysis', flinch: true, flinchChance: 10 } }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 290, hitSecondaryEffectRolls: [5, 50], hitFlinchRolls: [5, 50] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.team[0].statusCondition, null, 'Status de Secret Power suprimido no hit 1');
      assert.ok(res.events.some(e => e.type === C.BATTLE_EVENTS.FLINCH_APPLIED && e.target === 'enemy'), 'Flinch aplicado no hit 1');
      assert.ok(res.events.some(e => e.type === C.BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'enemy'), 'Inimigo imobilizado por flinch');
    });

    test('Parental Bond: Secret Power contra Substitute quebra no hit 1 e aplica status no hit 2 ao HP real', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 290, name: 'secret-power', power: 70, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 20, maxPp: 20 }] },
        { id: 52, name: 'Meowth', currentHp: 100, maxHp: 100, substituteHp: 10, substitute: true }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 290, hitDamageRolls: [100, 100], hitSecondaryEffectRolls: [50, 5] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.team[0].substituteHp, 0, 'Substitute quebrado no hit 1');
      assert.ok(res.state.enemy.team[0].currentHp < 100, 'Hit 2 causou dano ao HP real');
      assert.equal(res.state.enemy.team[0].statusCondition, 'paralysis', 'Hit 2 atingiu o alvo real e aplicou Paralisia');
    });

    test('Parental Bond: ativa Rough Skin e Rocky Helmet em ambos os impactos (4 danos de recuo)', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', currentHp: 200, maxHp: 200, moves: [{ id: 33, name: 'Tackle', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 35, maxPp: 35 }] },
        { id: 445, name: 'Garchomp', ability: 'rough-skin', item: 'rocky-helmet', currentHp: 300, maxHp: 300 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 33, hitDamageRolls: [100, 100] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const roughSkinDamages = res.events.filter(e => e.type === C.BATTLE_EVENTS.RECOIL_APPLIED && e.reason === 'rough-skin');
      const rockyHelmetDamages = res.events.filter(e => e.type === C.BATTLE_EVENTS.RECOIL_APPLIED && e.reason === 'rocky-helmet');
      assert.equal(roughSkinDamages.length, 2, 'Rough Skin deve ativar em ambos os hits');
      assert.equal(rockyHelmetDamages.length, 2, 'Rocky Helmet deve ativar em ambos os hits');
    });

    test('Parental Bond: críticos independentes entre o primeiro e segundo impacto', () => {
      // Hit 1 crítico, hit 2 normal
      const stateA = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 33, name: 'Tackle', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 35, maxPp: 35 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const resA = Engine.resolveTurn(stateA, {
        player: { type: 'MOVE', moveId: 33, hitCriticalRolls: [1, 24], hitDamageRolls: [100, 100] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const damagesA = resA.events.filter(e => e.type === C.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
      assert.equal(damagesA[0].critical, true, 'Hit 1 deve ser crítico');
      assert.equal(damagesA[1].critical, false, 'Hit 2 deve ser normal');

      // Hit 1 normal, hit 2 crítico
      const stateB = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 33, name: 'Tackle', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 35, maxPp: 35 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const resB = Engine.resolveTurn(stateB, {
        player: { type: 'MOVE', moveId: 33, hitCriticalRolls: [24, 1], hitDamageRolls: [100, 100] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const damagesB = resB.events.filter(e => e.type === C.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
      assert.equal(damagesB[0].critical, false, 'Hit 1 deve ser normal');
      assert.equal(damagesB[1].critical, true, 'Hit 2 deve ser crítico');
    });

    test('Parental Bond: Sheer Force suprime efeitos secundários em ambos os impactos', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'sheer-force', moves: [{ id: 34, name: 'Body Slam', power: 85, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 15, maxPp: 15, secondaryEffect: { chance: 30, statusCondition: 'paralysis' } }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 34, hitSecondaryEffectRolls: [1, 1] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.team[0].statusCondition, null, 'Sheer Force deve suprimir efeitos secundários');
      const statusEvents = res.events.filter(e => e.type === C.BATTLE_EVENTS.STATUS_APPLIED && e.target === 'enemy');
      assert.equal(statusEvents.length, 0);
    });

    test('Parental Bond: não duplica golpes naturalmente multi-hit', () => {
      const state = createBattleState(
        { id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', moves: [{ id: 331, name: 'bullet-seed', power: 25, accuracy: 100, type: 'grass', damageClass: 'physical', currentPp: 30, maxPp: 30 }] },
        { id: 52, name: 'Meowth', currentHp: 200, maxHp: 200 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 331, hitCountRoll: 50, hitDamageRolls: [100, 100, 100] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const complete = res.events.find(e => e.type === C.BATTLE_EVENTS.MULTI_HIT_COMPLETE);
      assert.ok(complete);
      assert.equal(complete.hitCount, 3, 'Deve seguir contagem natural do multi-hit (3) sem multiplicar por Parental Bond');
    });

    test('Parental Bond: BattleEvaluator prevê multiplicador de 1.25x e ignora limite de Sturdy', () => {
      const Evaluator = require('../../assets/js/battle/battle-evaluator.js');
      const kanga = createPokemon({ id: 10039, name: 'Mega Kangaskhan', ability: 'parental-bond', attack: 100, specialAttack: 100 });
      const normalMon = createPokemon({ id: 115, name: 'Kangaskhan', ability: 'scrappy', attack: 100, specialAttack: 100 });
      const sturdyFoe = createPokemon({ id: 74, name: 'Geodude', ability: 'sturdy', currentHp: 30, maxHp: 30, types: ['normal'], defense: 50 });
      const move = { id: 33, name: 'Tackle', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 35, maxPp: 35 };

      const evalNormal = Evaluator.evaluateMove(normalMon, sturdyFoe, move, { planningTurn: true });
      const evalParental = Evaluator.evaluateMove(kanga, sturdyFoe, move, { planningTurn: true });

      assert.equal(evalNormal.maxDamage, 29, 'Normal é limitado a currentHp - 1 (29) por Sturdy');
      assert.ok(evalParental.averageDamage > evalNormal.averageDamage, 'Parental Bond deve prever mais dano médio (1.25x)');
      assert.ok(evalParental.maxDamage >= 30, 'Parental Bond supera o limite de Sturdy pois acerta 2 vezes');
    });
  });

  // ==========================================
  // 9. TRIAGE
  // ==========================================
  describe('9. Triage', () => {
    test('Triage concede +3 prioridade para movimentos de cura (Recover, Drain Punch, etc.)', () => {
      const comfey = createPokemon({ id: 764, name: 'Comfey', ability: 'triage', speed: 50, moves: [{ id: 105, name: 'Recover', damageClass: 'status', currentPp: 10, maxPp: 10 }] });
      const enemy = createPokemon({ id: 52, name: 'Meowth', speed: 100, moves: [{ id: 98, name: 'Quick Attack', priority: 1, damageClass: 'physical', currentPp: 30, maxPp: 30 }] });

      const order = TurnManager.determineOrder(
        comfey, enemy,
        { type: 'MOVE', moveId: 105 }, // Recover (+3 via Triage)
        { type: 'MOVE', moveId: 98 }   // Quick Attack (+1)
      );
      assert.deepEqual(order, ['player', 'enemy'], 'Comfey com Triage (+3) age antes de Quick Attack (+1)');
    });
  });

  // ==========================================
  // 10, 11, 12. PRIORITY BLOCKERS
  // ==========================================
  describe('10, 11, 12. Priority Blockers (Queenly Majesty, Dazzling, Armor Tail)', () => {
    test('Queenly Majesty bloqueia golpes de prioridade do adversário', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth', moves: [{ id: 98, name: 'Quick Attack', priority: 1, damageClass: 'physical', currentPp: 30, maxPp: 30 }] },
        { id: 763, name: 'Tsareena', ability: 'queenly-majesty' }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 98 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const blocked = res.events.find(e => e.type === C.BATTLE_EVENTS.MOVE_FAILED && e.reason === 'PROTECTED_BY_PRIORITY_BLOCK' && e.label === 'queenly-majesty');
      assert.ok(blocked, 'Deve falhar com PROTECTED_BY_PRIORITY_BLOCK');
    });

    test('Dazzling bloqueia golpes de prioridade do adversário', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth', moves: [{ id: 98, name: 'Quick Attack', priority: 1, damageClass: 'physical', currentPp: 30, maxPp: 30 }] },
        { id: 779, name: 'Bruxish', ability: 'dazzling' }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 98 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const blocked = res.events.find(e => e.type === C.BATTLE_EVENTS.MOVE_FAILED && e.reason === 'PROTECTED_BY_PRIORITY_BLOCK' && e.label === 'dazzling');
      assert.ok(blocked, 'Deve falhar com PROTECTED_BY_PRIORITY_BLOCK');
    });

    test('Armor Tail bloqueia golpes de prioridade do adversário', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth', moves: [{ id: 98, name: 'Quick Attack', priority: 1, damageClass: 'physical', currentPp: 30, maxPp: 30 }] },
        { id: 981, name: 'Farigiraf', ability: 'armor-tail' }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 98 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const blocked = res.events.find(e => e.type === C.BATTLE_EVENTS.MOVE_FAILED && e.reason === 'PROTECTED_BY_PRIORITY_BLOCK' && e.label === 'armor-tail');
      assert.ok(blocked, 'Deve falhar com PROTECTED_BY_PRIORITY_BLOCK');
    });

    test('Mold Breaker ignora Queenly Majesty/Dazzling/Armor Tail', () => {
      const state = createBattleState(
        { id: 530, name: 'Excadrill', ability: 'mold-breaker', moves: [{ id: 98, name: 'Quick Attack', priority: 1, power: 40, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 30, maxPp: 30 }] },
        { id: 763, name: 'Tsareena', ability: 'queenly-majesty', currentHp: 100, maxHp: 100 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 98 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const hit = res.events.some(e => e.type === C.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
      assert.ok(hit, 'Mold Breaker deve causar dano ignorando Queenly Majesty');
    });
  });

  // ==========================================
  // 13. MYCELIUM MIGHT
  // ==========================================
  describe('13. Mycelium Might', () => {
    test('Mycelium Might atua por último em sua prioridade (-0.1) com golpes de status', () => {
      const toedscool = createPokemon({ id: 948, name: 'Toedscool', ability: 'mycelium-might', speed: 100 });
      const enemy = createPokemon({ id: 52, name: 'Meowth', speed: 50 });

      const order = TurnManager.determineOrder(
        toedscool, enemy,
        { type: 'MOVE', moveId: 45 }, // Growl (status)
        { type: 'MOVE', moveId: 45 }  // Growl (status)
      );
      assert.deepEqual(order, ['enemy', 'player'], 'Toedscool age por último devido a -0.1 de prioridade fracionária');
    });

    test('Mycelium Might ignora Magic Bounce do defensor', () => {
      const state = createBattleState(
        { id: 948, name: 'Toedscool', ability: 'mycelium-might', speed: 10, moves: [{ id: 269, name: 'Taunt', damageClass: 'status', currentPp: 20, maxPp: 20, target: 'normal' }] },
        { id: 196, name: 'Espeon', ability: 'magic-bounce', speed: 100 }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 269 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const bounced = res.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'magic-bounce');
      assert.equal(bounced, false, 'Magic Bounce NÃO deve refletir o golpe de Mycelium Might');
      assert.ok(res.state.enemy.team[0].tauntTurns > 0, 'Taunt deve ter sido aplicado a Espeon');
    });
  });

  // ==========================================
  // 14. QUICK DRAW
  // ==========================================
  describe('14. Quick Draw', () => {
    test('Quick Draw ativado (+0.1) faz o portador agir antes na mesma prioridade', () => {
      const slowbro = createPokemon({ id: 10168, name: 'Slowbro-Galar', ability: 'quick-draw', speed: 30 });
      const enemy = createPokemon({ id: 52, name: 'Meowth', speed: 90 });

      const order = TurnManager.determineOrder(
        slowbro, enemy,
        { type: 'MOVE', moveId: 33, quickDraw: true }, // Quick Draw ativado
        { type: 'MOVE', moveId: 33 }
      );
      assert.deepEqual(order, ['player', 'enemy'], 'Slowbro com Quick Draw ativado (+0.1) age primeiro');
    });

    test('Quick Draw NÃO ultrapassa golpes de prioridade superior (+1)', () => {
      const slowbro = createPokemon({ id: 10168, name: 'Slowbro-Galar', ability: 'quick-draw', speed: 30 });
      const enemy = createPokemon({ id: 52, name: 'Meowth', speed: 90, moves: [{ id: 98, name: 'Quick Attack', priority: 1, damageClass: 'physical', currentPp: 30, maxPp: 30 }] });

      const order = TurnManager.determineOrder(
        slowbro, enemy,
        { type: 'MOVE', moveId: 33, quickDraw: true },
        { type: 'MOVE', moveId: 98 }
      );
      assert.deepEqual(order, ['enemy', 'player'], 'Quick Attack (+1) age antes de Quick Draw (+0.1)');
    });

    test('Quick Draw NÃO ativa para movimentos da categoria Status', () => {
      const slowbro = createPokemon({ id: 10168, name: 'Slowbro-Galar', ability: 'quick-draw', speed: 30 });
      const enemy = createPokemon({ id: 52, name: 'Meowth', speed: 90 });

      const pSlowbro = C.P7.priority(slowbro, { id: 45, name: 'Growl', damageClass: 'status' }, C, { quickDraw: true });
      assert.equal(pSlowbro, 0, 'Golpe de status não deve receber boost de Quick Draw');

      const order = TurnManager.determineOrder(
        slowbro, enemy,
        { type: 'MOVE', moveId: 45, quickDraw: true },
        { type: 'MOVE', moveId: 45 }
      );
      assert.deepEqual(order, ['enemy', 'player'], 'Meowth (90 spe) age antes pois Quick Draw não opera em status');
    });

    test('Quick Draw (+0.1) age antes de Stall (-0.1) e Mycelium Might (-0.1)', () => {
      const slowbro = createPokemon({ id: 10168, name: 'Slowbro-Galar', ability: 'quick-draw', speed: 20 });
      const sableye = createPokemon({ id: 302, name: 'Sableye', ability: 'stall', speed: 100 });

      const order = TurnManager.determineOrder(
        slowbro, sableye,
        { type: 'MOVE', moveId: 33, quickDraw: true },
        { type: 'MOVE', moveId: 33 }
      );
      assert.deepEqual(order, ['player', 'enemy'], 'Quick Draw (+0.1) age antes de Stall (-0.1)');
    });

    test('Empate entre dois portadores com Quick Draw (+0.1) desempata por velocidade', () => {
      const slowbroA = createPokemon({ id: 10168, name: 'Slowbro-A', ability: 'quick-draw', speed: 40 });
      const slowbroB = createPokemon({ id: 10168, name: 'Slowbro-B', ability: 'quick-draw', speed: 30 });

      const order = TurnManager.determineOrder(
        slowbroA, slowbroB,
        { type: 'MOVE', moveId: 33, quickDraw: true },
        { type: 'MOVE', moveId: 33, quickDraw: true }
      );
      assert.deepEqual(order, ['player', 'enemy'], 'Ambos com +0.1 desempata pela velocidade maior (40 > 30)');
    });
  });

  // ==========================================
  // 15, 16. EMERGENCY EXIT & WIMP OUT
  // ==========================================
  describe('15, 16. Emergency Exit & Wimp Out', () => {
    test('Emergency Exit troca quando o HP cai para 50% ou menos com reserva disponível', () => {
      const state = createBattleState(
        { id: 25, name: 'Pikachu', moves: [{ id: 85, name: 'Thunderbolt', power: 90, damageClass: 'special', type: 'electric', currentPp: 15, maxPp: 15 }] },
        { id: 768, name: 'Golisopod', types: ['bug', 'water'], ability: 'emergency-exit', currentHp: 100, maxHp: 100, bench: [createPokemon({ id: 129, name: 'Magikarp' })] }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 85, damageRoll: 100 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.status, C.BATTLE_STATUS.AWAITING_REPLACEMENT, 'Deve aguardar escolha de substituição');
      assert.equal(res.state.pendingPivot?.role, 'enemy');
      assert.equal(res.state.pendingPivot?.reason, 'emergency-exit');
    });

    test('Wimp Out troca quando o HP cai para 50% ou menos com reserva disponível', () => {
      const state = createBattleState(
        { id: 25, name: 'Pikachu', moves: [{ id: 85, name: 'Thunderbolt', power: 90, damageClass: 'special', type: 'electric', currentPp: 15, maxPp: 15 }] },
        { id: 767, name: 'Wimpod', types: ['bug', 'water'], ability: 'wimp-out', currentHp: 100, maxHp: 100, bench: [createPokemon({ id: 129, name: 'Magikarp' })] }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 85, damageRoll: 100 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.status, C.BATTLE_STATUS.AWAITING_REPLACEMENT, 'Deve aguardar escolha de substituição');
      assert.equal(res.state.pendingPivot?.role, 'enemy');
      assert.equal(res.state.pendingPivot?.reason, 'wimp-out');
    });

    test('Emergency Exit NÃO ativa se não houver Pokémon na reserva', () => {
      const state = createBattleState(
        { id: 25, name: 'Pikachu', moves: [{ id: 85, name: 'Thunderbolt', power: 90, damageClass: 'special', type: 'electric', currentPp: 15, maxPp: 15 }] },
        { id: 768, name: 'Golisopod', ability: 'emergency-exit', currentHp: 100, maxHp: 100, bench: [] }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 85, damageRoll: 100 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.notEqual(res.state.status, C.BATTLE_STATUS.AWAITING_REPLACEMENT, 'Sem reserva viva, não deve ativar troca');
    });

    test('Multi-hit contra Emergency Exit completa todos os impactos antes da troca forçada', () => {
      const state = createBattleState(
        { id: 25, name: 'Pikachu', moves: [{ id: 331, name: 'bullet-seed', power: 25, accuracy: 100, type: 'grass', damageClass: 'physical', currentPp: 30, maxPp: 30 }] },
        { id: 768, name: 'Golisopod', types: ['bug', 'water'], ability: 'emergency-exit', currentHp: 100, maxHp: 100, bench: [createPokemon({ id: 129, name: 'Magikarp' })] }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 331, hitCountRoll: 50, hitDamageRolls: [100, 100, 100] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const damages = res.events.filter(e => e.type === C.BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
      assert.equal(damages.length, 3, 'Todos os 3 impactos do multi-hit devem ser aplicados antes da troca');
      assert.equal(res.state.status, C.BATTLE_STATUS.AWAITING_REPLACEMENT, 'Após o multi-hit completo, aguarda troca');
      assert.equal(res.state.pendingPivot?.role, 'enemy');
      assert.equal(res.state.pendingPivot?.reason, 'emergency-exit');
    });

    test('Multi-hit contra Emergency Exit que nocauteia o portador não ativa Emergency Exit', () => {
      const state = createBattleState(
        { id: 25, name: 'Pikachu', attack: 150, moves: [{ id: 331, name: 'bullet-seed', power: 50, accuracy: 100, type: 'grass', damageClass: 'physical', currentPp: 30, maxPp: 30 }] },
        { id: 768, name: 'Golisopod', types: ['bug', 'water'], defense: 20, ability: 'emergency-exit', currentHp: 40, maxHp: 100, bench: [createPokemon({ id: 129, name: 'Magikarp' })] }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 331, hitCountRoll: 50, hitDamageRolls: [100, 100, 100] },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.enemy.team[0].currentHp, 0, 'Golisopod deve estar desmaiado');
      assert.equal(res.state.pendingPivot, undefined, 'Emergency Exit não deve definir pendingPivot em caso de desmaio');
    });

    test('Emergency Exit bloqueia troca de pivot do adversário (U-turn)', () => {
      const state = createBattleState(
        { id: 25, name: 'Pikachu', moves: [{ id: 369, name: 'u-turn', power: 70, accuracy: 100, type: 'bug', damageClass: 'physical', currentPp: 20, maxPp: 20 }], bench: [createPokemon({ id: 172, name: 'Pichu' })] },
        { id: 768, name: 'Golisopod', types: ['water', 'rock'], defense: 30, ability: 'emergency-exit', currentHp: 100, maxHp: 100, bench: [createPokemon({ id: 129, name: 'Magikarp' })] }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 369, damageRoll: 100 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.status, C.BATTLE_STATUS.AWAITING_REPLACEMENT);
      assert.equal(res.state.pendingPivot?.role, 'enemy', 'Apenas o portador de Emergency Exit ganha a troca forçada');
      assert.equal(res.state.pendingPivot?.reason, 'emergency-exit');
    });

    test('Emergency Exit não ativa se HP já estava em 50% ou menos antes do golpe', () => {
      const state = createBattleState(
        { id: 25, name: 'Pikachu', attack: 30, moves: [{ id: 33, name: 'Tackle', power: 40, accuracy: 100, type: 'normal', damageClass: 'physical', currentPp: 35, maxPp: 35 }] },
        { id: 768, name: 'Golisopod', ability: 'emergency-exit', currentHp: 45, maxHp: 100, bench: [createPokemon({ id: 129, name: 'Magikarp' })] }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 33, damageRoll: 85 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.notEqual(res.state.status, C.BATTLE_STATUS.AWAITING_REPLACEMENT, 'Não deve ativar troca se já estava em <= 50%');
      assert.equal(res.state.pendingPivot, undefined);
    });

    test('Emergency Exit pode reativar no futuro se curado acima de 50% de HP', () => {
      const golisopod = createPokemon({ id: 768, name: 'Golisopod', types: ['bug', 'water'], ability: 'emergency-exit', currentHp: 80, maxHp: 200 });
      golisopod.currentHp = 160;
      delete golisopod.emergencyExitTriggered;

      const state = createBattleState(
        { id: 25, name: 'Pikachu', moves: [{ id: 85, name: 'Thunderbolt', power: 90, damageClass: 'special', type: 'electric', currentPp: 15, maxPp: 15 }] },
        { ...golisopod, bench: [createPokemon({ id: 129, name: 'Magikarp' })] }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 85, damageRoll: 100 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(res.state.status, C.BATTLE_STATUS.AWAITING_REPLACEMENT, 'Deve reativar após ser curado acima de 50% e cruzar o limiar');
      assert.equal(res.state.pendingPivot?.role, 'enemy');
    });

    test('Sheer Force suprime Emergency Exit em golpes com efeito secundário', () => {
      const state = createBattleState(
        { id: 34, name: 'Nidoking', ability: 'sheer-force', moves: [{ id: 85, name: 'Thunderbolt', power: 90, damageClass: 'special', type: 'electric', currentPp: 15, maxPp: 15, secondaryEffect: { chance: 10, statusCondition: 'paralysis' } }] },
        { id: 768, name: 'Golisopod', types: ['bug', 'water'], ability: 'emergency-exit', currentHp: 200, maxHp: 200, bench: [createPokemon({ id: 129, name: 'Magikarp' })] }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 85, damageRoll: 100 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.notEqual(res.state.status, C.BATTLE_STATUS.AWAITING_REPLACEMENT, 'Sheer Force deve suprimir Emergency Exit');
      assert.equal(res.state.pendingPivot, undefined);
    });
  });

  // ==========================================
  // 17. MAGIC BOUNCE
  // ==========================================
  describe('17. Magic Bounce', () => {
    test('Magic Bounce reflete Taunt de volta para o atacante', () => {
      const state = createBattleState(
        { id: 52, name: 'Meowth', moves: [{ id: 269, name: 'Taunt', damageClass: 'status', currentPp: 20, maxPp: 20, target: 'normal' }] },
        { id: 196, name: 'Espeon', ability: 'magic-bounce' }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 269 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const bouncedEvent = res.events.find(e => e.type === 'MOVE_PREPARED' && e.label === 'magic-bounce');
      assert.ok(bouncedEvent, 'Deve emitir evento de Magic Bounce');
      assert.ok(res.state.player.team[0].tauntTurns > 0, 'O atacante deve ter recebido o efeito do Taunt refletido');
      assert.equal(res.state.enemy.team[0].tauntTurns || 0, 0, 'O defensor com Magic Bounce não deve estar provocado');
    });

    test('Mold Breaker ignora Magic Bounce', () => {
      const state = createBattleState(
        { id: 530, name: 'Excadrill', ability: 'mold-breaker', moves: [{ id: 269, name: 'Taunt', damageClass: 'status', currentPp: 20, maxPp: 20, target: 'normal' }] },
        { id: 196, name: 'Espeon', ability: 'magic-bounce' }
      );
      const res = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 269 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.ok(res.state.enemy.team[0].tauntTurns > 0, 'Espeon deve ser provocado pois Mold Breaker ignora Magic Bounce');
    });
  });

  // ==========================================
  // 18. SCREEN CLEANER
  // ==========================================
  describe('18. Screen Cleaner', () => {
    test('Screen Cleaner limpa Reflect, Light Screen e Aurora Veil de ambos os lados na entrada', () => {
      const state = createBattleState(
        { id: 866, name: 'Mr. Rime', ability: 'screen-cleaner' },
        { id: 52, name: 'Meowth' }
      );
      state.p6Sides.player = { reflect: 5, lightScreen: 5 };
      state.p6Sides.enemy = { auroraVeil: 5 };

      const events = [];
      C.P7.enter(state, 'player', C, events);

      assert.equal(state.p6Sides.player.reflect, undefined, 'Reflect do player deve ser removido');
      assert.equal(state.p6Sides.player.lightScreen, undefined, 'Light Screen do player deve ser removido');
      assert.equal(state.p6Sides.enemy.auroraVeil, undefined, 'Aurora Veil do enemy deve ser removido');

      const cleanedEvent = events.find(e => e.type === 'SCREEN_CLEANER_CLEARED');
      assert.ok(cleanedEvent, 'Deve emitir evento SCREEN_CLEANER_CLEARED');
    });
  });

  // ==========================================
  // REGISTRY & METADATA AUDIT
  // ==========================================
  describe('Registry & Metadata Audit H5', () => {
    test('Todas as 18 habilidades H5 reportam status FULL e phase H5', () => {
      const h5List = [
        'suction-cups', 'truant', 'slow-start', 'stall', 'prankster',
        'infiltrator', 'gale-wings', 'parental-bond', 'triage', 'queenly-majesty',
        'dazzling', 'armor-tail', 'mycelium-might', 'quick-draw', 'emergency-exit',
        'wimp-out', 'magic-bounce', 'screen-cleaner'
      ];

      for (const id of h5List) {
        assert.ok(Registry.hasAbility(id), `${id} deve existir no Registry`);
        const ab = Registry.getAbility(id);
        assert.equal(ab.status, 'FULL', `${id} deve ter status FULL`);
        assert.equal(ab.phase, 'H5', `${id} deve pertencer à phase H5`);
        assert.ok(ab.testFiles.includes('tests/battle/abilities-h5.test.js'), `${id} deve ter testFiles configurado para H5`);
      }
    });
  });
});
