const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const C = require('../../assets/js/battle/battle-constants.js');
const Engine = require('../../assets/js/battle/battle-engine.js');
const Registry = require('../../assets/js/battle/ability-registry.js');
const { BattleTeamHydrator } = require('../../assets/js/battle-session/battle-team-hydrator.js');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { BATTLE_UI_STATES } = require('../../assets/js/battle-session/battle-session-constants.js');
const { BattleView } = require('../../assets/js/ui/battle-view.js');
const { CampaignManager } = require('../../assets/js/campaign/campaign-wild-manager.js');
const { describeItem } = require('../../assets/js/campaign/campaign-battle-customization.js');
const Catalog = require('../../assets/js/campaign/campaign-catalog.js');
const Wild = require('../../assets/js/campaign/campaign-wild-encounters.js');
const Store = require('../../assets/js/campaign/campaign-store.js');

const memoryStore = new Map();
if (typeof global.localStorage === 'undefined' || !global.localStorage?.getItem) {
  global.localStorage = {
    getItem: key => memoryStore.get(key) || null,
    setItem: (key, value) => memoryStore.set(key, String(value)),
    removeItem: key => memoryStore.delete(key),
    clear: () => memoryStore.clear()
  };
}
global.window = global.window || {};
global.window.PBACampaign = global.window.PBACampaign || {};
Object.assign(global.window.PBACampaign, Catalog);
global.window.matchMedia = global.window.matchMedia || (() => ({ matches: true }));
global.window.switchAppTab = global.window.switchAppTab || (() => {});
global.document = global.document || {};
global.document.getElementById = () => null;
global.document.querySelector = () => null;
global.document.querySelectorAll = () => [];
global.document.addEventListener = () => {};
global.document.removeEventListener = () => {};
global.document.createElement = tag => ({
  tagName: tag.toUpperCase(),
  classList: { add() {}, remove() {}, contains: () => false },
  setAttribute() {},
  getAttribute: () => null,
  appendChild() {},
  remove() {}
});
global.document.documentElement = { classList: { add() {}, remove() {}, contains: () => false } };
global.document.body = { classList: { add() {}, remove() {}, contains: () => false } };

const statusById = Object.fromEntries(
  Object.values(C.SUPPORTED_STATUS_MOVES).map(m => [Number(m.id), m])
);
const getMove = id => { const m = C.KNOWN_CATALOG_MOVES[id] || C.PROTECT_MOVES[id] || statusById[Number(id)] || C.SUPPORTED_STATUS_MOVES['swords-dance']; const pp = m?.pp || 35; return { ...m, pp, currentPp: pp, maxPp: pp }; };

function makeMon(id, moveIds = [33], types = ['normal'], overrides = {}) {
  return {
    id,
    name: 'test-mon-' + id,
    types,
    hp: 2000,
    currentHp: 2000,
    maxHp: 2000,
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
    statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    moves: moveIds.map(getMove),
    ability: 'static',
    item: null,
    statusCondition: null,
    isProtected: false,
    stellarUsed: [],
    ...overrides
  };
}

describe('FINAL-26 CANONICAL ABILITIES SUITE (H9 + H10 + H11 — SHOWDOWN GEN IX)', () => {

  // =========================================================================
  // FAMILY H9: DOUBLES INTERACTIONS (16 ABILITIES)
  // =========================================================================

  describe('1. Plus & Minus (IDs 57, 58)', () => {
    test('Plus no usuário sem aliado ativo não concede bônus de SpA (multiplicador 1.0x)', () => {
      const mon = makeMon(179, [85], ['electric'], { ability: 'plus' });
      const state = { player: mon, enemy: makeMon(99) };
      const mult = C.P7.stat(state, mon, 'specialAttack', 1.0);
      assert.equal(mult, 1.0);
    });

    test('Plus no usuário com aliado ativo com Plus em Doubles concede multiplicador 1.5x SpA', () => {
      const plus1 = makeMon(311, [85], ['electric'], { ability: 'plus' });
      const plus2 = makeMon(179, [85], ['electric'], { ability: 'plus' });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [plus1, plus2], activeIndices: [0, 1] },
          enemy: { team: [makeMon(99)], activeIndices: [0] }
        },
        player: { team: [plus1, plus2], activeIndices: [0, 1] },
        enemy: { team: [makeMon(99)], activeIndices: [0] }
      };
      C.P7.sync(state);
      const mult = C.P7.stat(state, plus1, 'specialAttack', 1.0);
      assert.equal(mult, 1.5);
    });

    test('Plus no usuário com aliado ativo com Minus em Doubles concede multiplicador 1.5x SpA', () => {
      const plus1 = makeMon(311, [85], ['electric'], { ability: 'plus' });
      const minus1 = makeMon(312, [85], ['electric'], { ability: 'minus' });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [plus1, minus1], activeIndices: [0, 1] },
          enemy: { team: [makeMon(99)], activeIndices: [0] }
        },
        player: { team: [plus1, minus1], activeIndices: [0, 1] },
        enemy: { team: [makeMon(99)], activeIndices: [0] }
      };
      C.P7.sync(state);
      const mult = C.P7.stat(state, plus1, 'specialAttack', 1.0);
      assert.equal(mult, 1.5);
    });

    test('Minus no usuário com aliado ativo com Plus concede multiplicador 1.5x SpA', () => {
      const minus1 = makeMon(312, [85], ['electric'], { ability: 'minus' });
      const plus1 = makeMon(311, [85], ['electric'], { ability: 'plus' });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [minus1, plus1], activeIndices: [0, 1] },
          enemy: { team: [makeMon(99)], activeIndices: [0] }
        },
        player: { team: [minus1, plus1], activeIndices: [0, 1] },
        enemy: { team: [makeMon(99)], activeIndices: [0] }
      };
      C.P7.sync(state);
      const mult = C.P7.stat(state, minus1, 'specialAttack', 1.0);
      assert.equal(mult, 1.5);
    });

    test('Plus/Minus suprimido por Neutralizing Gas não concede bônus (1.0x)', () => {
      const plus1 = makeMon(311, [85], ['electric'], { ability: 'plus' });
      const plus2 = makeMon(179, [85], ['electric'], { ability: 'plus' });
      const gasMon = makeMon(110, [33], ['poison'], { ability: 'neutralizing-gas' });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [plus1, plus2], activeIndices: [0, 1] },
          enemy: { team: [gasMon], activeIndices: [0] }
        },
        player: { team: [plus1, plus2], activeIndices: [0, 1] },
        enemy: { team: [gasMon], activeIndices: [0] }
      };
      C.P7.sync(state);
      const mult = C.P7.stat(state, plus1, 'specialAttack', 1.0);
      assert.equal(mult, 1.0);
    });
  });

  describe('2. Healer (ID 131)', () => {
    test('Healer cura condição de status de aliado adjacente com roll <= 30 no residual', () => {
      const healerMon = makeMon(531, [33], ['normal'], { ability: 'healer' });
      const ally = makeMon(1, [33], ['normal'], { statusCondition: 'paralysis' });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [healerMon, ally], activeIndices: [0, 1] }
        },
        player: { team: [healerMon, ally], activeIndices: [0, 1] },
        enemy: { team: [makeMon(99)], activeIndices: [0] },
        healerRoll: 25
      };
      const events = [];
      C.P7.earlyResidual(state, C, events);
      assert.equal(ally.statusCondition, null, 'Status do aliado deve ser curado');
      assert.ok(events.some(e => e.type === 'HEALER_CURED' && e.statusCondition === 'paralysis'));
    });

    test('Healer não cura status se o roll for > 30', () => {
      const healerMon = makeMon(531, [33], ['normal'], { ability: 'healer' });
      const ally = makeMon(1, [33], ['normal'], { statusCondition: 'burn' });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [healerMon, ally], activeIndices: [0, 1] }
        },
        player: { team: [healerMon, ally], activeIndices: [0, 1] },
        enemy: { team: [makeMon(99)], activeIndices: [0] },
        healerRoll: 35
      };
      const events = [];
      C.P7.earlyResidual(state, C, events);
      assert.equal(ally.statusCondition, 'burn', 'Status do aliado deve ser mantido');
    });

    test('Healer em Singles não cura o próprio usuário', () => {
      const healerMon = makeMon(531, [33], ['normal'], { ability: 'healer', statusCondition: 'poison' });
      const state = {
        player: healerMon,
        enemy: makeMon(99),
        healerRoll: 10
      };
      const events = [];
      C.P7.earlyResidual(state, C, events);
      assert.equal(healerMon.statusCondition, 'poison', 'Healer não cura o próprio usuário');
    });
  });

  describe('3. Friend Guard (ID 132)', () => {
    test('Friend Guard reduz dano sofrido por aliado em 25% (0.75x)', () => {
      const fgMon = makeMon(35, [33], ['fairy'], { ability: 'friend-guard' });
      const allyMon = makeMon(1, [33], ['normal']);
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          enemy: { team: [fgMon, allyMon], activeIndices: [0, 1] },
          player: { team: [makeMon(99)], activeIndices: [0] }
        },
        enemy: { team: [fgMon, allyMon], activeIndices: [0, 1] },
        player: { team: [makeMon(99)], activeIndices: [0] }
      };
      const attacker = state.player.team[0];
      const move = getMove(33);
      const mult = C.P7.damageMultiplier(state, attacker, allyMon, move, 1);
      assert.equal(mult, 0.75);
    });

    test('Friend Guard não reduz dano sofrido pelo próprio portador (1.0x)', () => {
      const fgMon = makeMon(35, [33], ['fairy'], { ability: 'friend-guard' });
      const otherMon = makeMon(1, [33], ['normal']);
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          enemy: { team: [fgMon, otherMon], activeIndices: [0, 1] },
          player: { team: [makeMon(99)], activeIndices: [0] }
        },
        enemy: { team: [fgMon, otherMon], activeIndices: [0, 1] },
        player: { team: [makeMon(99)], activeIndices: [0] }
      };
      const attacker = state.player.team[0];
      const move = getMove(33);
      const mult = C.P7.damageMultiplier(state, attacker, fgMon, move, 1);
      assert.equal(mult, 1.0);
    });

    test('Mold Breaker ignora Friend Guard do parceiro do defensor', () => {
      const fgAlly = makeMon(35, [33], ['fairy'], { ability: 'friend-guard' });
      const defender = makeMon(1, [33], ['normal']);
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          enemy: { team: [fgAlly, defender], activeIndices: [0, 1] },
          player: { team: [makeMon(99, [33], ['normal'], { ability: 'mold-breaker' })], activeIndices: [0] }
        },
        enemy: { team: [fgAlly, defender], activeIndices: [0, 1] },
        player: { team: [makeMon(99, [33], ['normal'], { ability: 'mold-breaker' })], activeIndices: [0] }
      };
      const attacker = state.player.team[0];
      const move = getMove(33);
      const mult = C.P7.damageMultiplier(state, attacker, defender, move, 1);
      assert.equal(mult, 1.0, 'Mold Breaker deve ignorar Friend Guard');
    });

    test('Friend Guard com 2 aliados ativos acumula multiplicativamente (0.75 * 0.75 = 0.5625x)', () => {
      const fg1 = makeMon(35, [33], ['fairy'], { ability: 'friend-guard' });
      const fg2 = makeMon(36, [33], ['fairy'], { ability: 'friend-guard' });
      const defender = makeMon(1, [33], ['normal']);
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          enemy: { team: [fg1, fg2, defender], activeIndices: [0, 1, 2] },
          player: { team: [makeMon(99)], activeIndices: [0] }
        },
        enemy: { team: [fg1, fg2, defender], activeIndices: [0, 1, 2] },
        player: { team: [makeMon(99)], activeIndices: [0] }
      };
      const attacker = state.player.team[0];
      const move = getMove(33);
      const mult = C.P7.damageMultiplier(state, attacker, defender, move, 1);
      assert.equal(mult, 0.5625);
    });
  });

  describe('4. Telepathy (ID 140)', () => {
    test('Telepathy concede imunidade a golpes de dano desferidos por aliados', () => {
      const telepathyMon = makeMon(282, [33], ['psychic', 'fairy'], { ability: 'telepathy' });
      const allyAttacker = makeMon(1, [89], ['ground']);
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [allyAttacker, telepathyMon], activeIndices: [0, 1] }
        },
        player: { team: [allyAttacker, telepathyMon], activeIndices: [0, 1] }
      };
      const earthquake = getMove(89);
      const events = [];
      const blocked = C.P7.tryHit(state, 'player', earthquake, C, events, allyAttacker, telepathyMon, 'player');
      assert.equal(blocked, true, 'Telepathy deve bloquear o golpe do aliado');
      assert.ok(events.some(e => e.type === 'TELEPATHY_AVOID'));
    });

    test('Telepathy não bloqueia golpes de dano desferidos por oponentes', () => {
      const telepathyMon = makeMon(282, [33], ['psychic', 'fairy'], { ability: 'telepathy' });
      const enemyAttacker = makeMon(99, [89], ['ground']);
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          enemy: { team: [telepathyMon], activeIndices: [0] },
          player: { team: [enemyAttacker], activeIndices: [0] }
        },
        enemy: { team: [telepathyMon], activeIndices: [0] },
        player: { team: [enemyAttacker], activeIndices: [0] }
      };
      const earthquake = getMove(89);
      const events = [];
      const blocked = C.P7.tryHit(state, 'player', earthquake, C, events, enemyAttacker, telepathyMon, 'enemy');
      assert.equal(blocked, false, 'Telepathy não bloqueia golpes do oponente');
    });

    test('Telepathy é quebrado por atacante aliado com Mold Breaker', () => {
      const telepathyMon = makeMon(282, [33], ['psychic', 'fairy'], { ability: 'telepathy' });
      const allyAttacker = makeMon(1, [89], ['ground'], { ability: 'mold-breaker' });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [allyAttacker, telepathyMon], activeIndices: [0, 1] }
        },
        player: { team: [allyAttacker, telepathyMon], activeIndices: [0, 1] }
      };
      const earthquake = getMove(89);
      const events = [];
      const blocked = C.P7.tryHit(state, 'player', earthquake, C, events, allyAttacker, telepathyMon, 'player');
      assert.equal(blocked, false, 'Mold Breaker do aliado deve sobrepujar Telepathy');
    });
  });

  describe('5. Symbiosis (ID 180)', () => {
    test('Quando aliado consome item, Symbiosis transfere seu item segurado para o aliado', () => {
      const symbiosisMon = makeMon(671, [33], ['fairy'], { ability: 'symbiosis', item: 'sitrus-berry' });
      const allyMon = makeMon(1, [33], ['normal'], { item: 'lum-berry' });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [allyMon, symbiosisMon], activeIndices: [0, 1] }
        },
        player: { team: [allyMon, symbiosisMon], activeIndices: [0, 1] }
      };
      const events = [];
      C.P7.consume(C, events, 'player', allyMon, 'lum-berry', state);
      assert.equal(allyMon.item, 'sitrus-berry', 'Aliado deve receber o item do portador de Symbiosis');
      assert.equal(symbiosisMon.item, null, 'Portador de Symbiosis deve perder o item transferido');
      assert.ok(events.some(e => e.type === 'SYMBIOSIS_TRANSFERRED' && e.item === 'sitrus-berry'));
    });

    test('Symbiosis não transfere itens intransferíveis (ex: booster-energy em paradox)', () => {
      const paradoxMon = makeMon(984, [33], ['ground', 'fighting'], { ability: 'symbiosis', item: 'booster-energy' });
      const allyMon = makeMon(1, [33], ['normal'], { item: 'sitrus-berry' });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [allyMon, paradoxMon], activeIndices: [0, 1] }
        },
        player: { team: [allyMon, paradoxMon], activeIndices: [0, 1] }
      };
      const events = [];
      C.P7.consume(C, events, 'player', allyMon, 'sitrus-berry', state);
      assert.equal(paradoxMon.item, 'booster-energy', 'Item intransferível não deve ser repassado');
    });

    test('Symbiosis não dispara se o portador não estiver segurando nenhum item', () => {
      const symbiosisMon = makeMon(671, [33], ['fairy'], { ability: 'symbiosis', item: null });
      const allyMon = makeMon(1, [33], ['normal'], { item: 'sitrus-berry' });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [allyMon, symbiosisMon], activeIndices: [0, 1] }
        },
        player: { team: [allyMon, symbiosisMon], activeIndices: [0, 1] }
      };
      const events = [];
      C.P7.consume(C, events, 'player', allyMon, 'sitrus-berry', state);
      assert.equal(allyMon.item, null);
      assert.ok(!events.some(e => e.type === 'SYMBIOSIS_TRANSFERRED'));
    });
  });

  describe('6. Dancer (ID 216)', () => {
    test('Todos os 12 movimentos de dança canônicos são reconhecidos por isDanceMove com IDs corretos', () => {
      const officialDanceMoves = [
        { id: 14, name: 'swords-dance' },
        { id: 80, name: 'petal-dance' },
        { id: 297, name: 'feather-dance' },
        { id: 298, name: 'teeter-dance' },
        { id: 349, name: 'dragon-dance' },
        { id: 461, name: 'lunar-dance' },
        { id: 483, name: 'quiver-dance' },
        { id: 552, name: 'fiery-dance' },
        { id: 686, name: 'revelation-dance' },
        { id: 775, name: 'clangorous-soul' },
        { id: 837, name: 'victory-dance' },
        { id: 872, name: 'aqua-step' }
      ];
      for (const m of officialDanceMoves) {
        assert.ok(C.MoveFlags.isDanceMove(m), 'Movimento ' + m.name + ' (ID ' + m.id + ') deve ser dança');
      }
    });

    test('Movimento comum não classificado como dança (ex: Tackle ID 33) não ativa Dancer', () => {
      const p = makeMon(1, [33], ['normal'], { speed: 80 });
      const e = makeMon(2, [33], ['normal'], { ability: 'dancer', speed: 100 });
      const s = Engine.createBattle(p, e);
      const r = Engine.resolveTurn(s, {
        player: { type: 'MOVE', moveId: 33 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.ok(!r.events.some(ev => ev.type === 'DANCER_ACTIVATED'), 'Tackle não deve ativar Dancer');
    });

    test('Dancer copia Swords Dance (ID 14) aplicando +2 Attack no próprio portador', () => {
      const p = makeMon(1, [14], ['normal'], { speed: 80 });
      const e = makeMon(2, [33], ['normal'], { ability: 'dancer', speed: 100 });
      const s = Engine.createBattle(p, e);
      const r = Engine.resolveTurn(s, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.ok(r.events.some(ev => ev.type === 'DANCER_ACTIVATED' && ev.copiedMoveId === 14));
      assert.equal(r.state.enemy.statStages.attack, 2, 'Oricorio adversário deve receber +2 estágios de Attack');
    });

    test('Dancer copia Dragon Dance (ID 349) aplicando +1 Attack e +1 Speed no próprio portador', () => {
      const p = makeMon(1, [349], ['dragon'], { speed: 80 });
      const e = makeMon(2, [33], ['flying'], { ability: 'dancer', speed: 100 });
      const s = Engine.createBattle(p, e);
      const r = Engine.resolveTurn(s, {
        player: { type: 'MOVE', moveId: 349 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.ok(r.events.some(ev => ev.type === 'DANCER_ACTIVATED' && ev.copiedMoveId === 349));
      assert.equal(r.state.enemy.statStages.attack, 1);
      assert.equal(r.state.enemy.statStages.speed, 1);
    });

    test('Feather Dance (ID 297) copiado por Dancer atinge o alvo adversário apropriado (-2 Attack)', () => {
      const p = makeMon(1, [297], ['flying'], { speed: 80 });
      const e = makeMon(2, [33], ['flying'], { ability: 'dancer', speed: 100 });
      const s = Engine.createBattle(p, e);
      const r = Engine.resolveTurn(s, {
        player: { type: 'MOVE', moveId: 297 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.ok(r.events.some(ev => ev.type === 'DANCER_ACTIVATED' && ev.copiedMoveId === 297));
      assert.equal(r.state.player.statStages.attack, -2, 'Player deve receber -2 Attack do Feather Dance copiado');
    });

    test('1. Dancer lento (stored speed 80) executa antes do rápido (stored speed 120)', () => {
      const p1 = makeMon(1, [14], ['normal'], { name: 'Attacker', speed: 200 });
      const p2 = makeMon(2, [33], ['flying'], { name: 'FastDancer', ability: 'dancer', speed: 120, storedStats: { spe: 120 } });
      const e1 = makeMon(3, [33], ['flying'], { name: 'SlowDancer', ability: 'dancer', speed: 80, storedStats: { spe: 80 } });
      const state = {
        version: 2,
        status: 'IN_PROGRESS',
        turn: 1,
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [p1, p2], activeIndices: [0, 1] },
          enemy: { team: [e1], activeIndices: [0] }
        },
        player: { team: [p1, p2], activeIndex: 0, activeIndices: [0, 1] },
        enemy: { team: [e1], activeIndex: 0, activeIndices: [0] }
      };
      const r = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const dancerEvents = r.events.filter(e => e.type === 'DANCER_ACTIVATED');
      assert.equal(dancerEvents.length, 2);
      assert.equal(dancerEvents[0].pokemonName, 'SlowDancer', 'Dancer lento deve executar primeiro');
    });

    test('2. Dancer rápido (stored speed 120) executa depois do lento (stored speed 80)', () => {
      const p1 = makeMon(1, [14], ['normal'], { name: 'Attacker', speed: 200 });
      const p2 = makeMon(2, [33], ['flying'], { name: 'FastDancer', ability: 'dancer', speed: 120, storedStats: { spe: 120 } });
      const e1 = makeMon(3, [33], ['flying'], { name: 'SlowDancer', ability: 'dancer', speed: 80, storedStats: { spe: 80 } });
      const state = {
        version: 2,
        status: 'IN_PROGRESS',
        turn: 1,
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [p1, p2], activeIndices: [0, 1] },
          enemy: { team: [e1], activeIndices: [0] }
        },
        player: { team: [p1, p2], activeIndex: 0, activeIndices: [0, 1] },
        enemy: { team: [e1], activeIndex: 0, activeIndices: [0] }
      };
      const r = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const dancerEvents = r.events.filter(e => e.type === 'DANCER_ACTIVATED');
      assert.equal(dancerEvents.length, 2);
      assert.equal(dancerEvents[1].pokemonName, 'FastDancer', 'Dancer rápido deve executar depois do lento');
    });

    test('3. Empate de Speed entre dois portadores resolve ambos determinística e simetricamente', () => {
      const p1 = makeMon(1, [14], ['normal'], { name: 'Attacker', speed: 200 });
      const p2 = makeMon(2, [33], ['flying'], { name: 'TieDancerA', ability: 'dancer', speed: 100, storedStats: { spe: 100 } });
      const e1 = makeMon(3, [33], ['flying'], { name: 'TieDancerB', ability: 'dancer', speed: 100, storedStats: { spe: 100 } });
      const state = {
        version: 2,
        status: 'IN_PROGRESS',
        turn: 1,
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [p1, p2], activeIndices: [0, 1] },
          enemy: { team: [e1], activeIndices: [0] }
        },
        player: { team: [p1, p2], activeIndex: 0, activeIndices: [0, 1] },
        enemy: { team: [e1], activeIndex: 0, activeIndices: [0] }
      };
      const r = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const dancerEvents = r.events.filter(e => e.type === 'DANCER_ACTIVATED');
      assert.equal(dancerEvents.length, 2, 'Ambos os dançarinos empatados devem executar');
    });

    test('4. Portador do jogador adquire Dancer primeiro (order 1), adversário depois (order 2) -> adversário executa primeiro', () => {
      const p1 = makeMon(1, [14], ['normal'], { name: 'Attacker', speed: 200 });
      const p2 = makeMon(2, [33], ['flying'], { name: 'PlayerFirst', ability: 'dancer', speed: 100, storedStats: { spe: 100 }, abilityOrder: 1, abilityState: { effectOrder: 1 } });
      const e1 = makeMon(3, [33], ['flying'], { name: 'EnemySecond', ability: 'dancer', speed: 100, storedStats: { spe: 100 }, abilityOrder: 2, abilityState: { effectOrder: 2 } });
      const state = {
        version: 2,
        status: 'IN_PROGRESS',
        turn: 1,
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [p1, p2], activeIndices: [0, 1] },
          enemy: { team: [e1], activeIndices: [0] }
        },
        player: { team: [p1, p2], activeIndex: 0, activeIndices: [0, 1] },
        enemy: { team: [e1], activeIndex: 0, activeIndices: [0] }
      };
      const r = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const dancerEvents = r.events.filter(e => e.type === 'DANCER_ACTIVATED');
      assert.equal(dancerEvents.length, 2);
      assert.equal(dancerEvents[0].pokemonName, 'EnemySecond', 'Adversário (adquiriu por último) deve agir primeiro');
      assert.equal(dancerEvents[1].pokemonName, 'PlayerFirst', 'Jogador (adquiriu primeiro) deve agir em segundo');
    });

    test('5. Adversário adquire primeiro (order 1), jogador depois (order 2) -> jogador executa primeiro (simetria total sem viés)', () => {
      const p1 = makeMon(1, [14], ['normal'], { name: 'Attacker', speed: 200 });
      const p2 = makeMon(2, [33], ['flying'], { name: 'PlayerSecond', ability: 'dancer', speed: 100, storedStats: { spe: 100 }, abilityOrder: 2, abilityState: { effectOrder: 2 } });
      const e1 = makeMon(3, [33], ['flying'], { name: 'EnemyFirst', ability: 'dancer', speed: 100, storedStats: { spe: 100 }, abilityOrder: 1, abilityState: { effectOrder: 1 } });
      const state = {
        version: 2,
        status: 'IN_PROGRESS',
        turn: 1,
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [p1, p2], activeIndices: [0, 1] },
          enemy: { team: [e1], activeIndices: [0] }
        },
        player: { team: [p1, p2], activeIndex: 0, activeIndices: [0, 1] },
        enemy: { team: [e1], activeIndex: 0, activeIndices: [0] }
      };
      const r = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const dancerEvents = r.events.filter(e => e.type === 'DANCER_ACTIVATED');
      assert.equal(dancerEvents.length, 2);
      assert.equal(dancerEvents[0].pokemonName, 'PlayerSecond', 'Jogador (adquiriu por último) deve agir primeiro');
      assert.equal(dancerEvents[1].pokemonName, 'EnemyFirst', 'Adversário (adquiriu primeiro) deve agir em segundo');
    });

    test('6. Mudanças de Speed por estágios (Agility +6) não alteram indevidamente a ordem canônica', () => {
      const p1 = makeMon(1, [14], ['normal'], { name: 'Attacker', speed: 200 });
      const p2 = makeMon(2, [33], ['flying'], { name: 'StageBoostedMon', ability: 'dancer', speed: 80, storedStats: { spe: 80 }, statStages: { speed: 6 } });
      const e1 = makeMon(3, [33], ['flying'], { name: 'Base100Mon', ability: 'dancer', speed: 100, storedStats: { spe: 100 }, statStages: { speed: 0 } });
      const state = {
        version: 2,
        status: 'IN_PROGRESS',
        turn: 1,
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [p1, p2], activeIndices: [0, 1] },
          enemy: { team: [e1], activeIndices: [0] }
        },
        player: { team: [p1, p2], activeIndex: 0, activeIndices: [0, 1] },
        enemy: { team: [e1], activeIndex: 0, activeIndices: [0] }
      };
      const r = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const dancerEvents = r.events.filter(e => e.type === 'DANCER_ACTIVATED');
      assert.equal(dancerEvents[0].pokemonName, 'StageBoostedMon', 'Menor stored speed (80) age primeiro, ignorando +6 estágios');
      assert.equal(dancerEvents[1].pokemonName, 'Base100Mon', 'Maior stored speed (100) age depois');
    });

    test('7. Choice Scarf não altera indevidamente a ordem canônica', () => {
      const p1 = makeMon(1, [14], ['normal'], { name: 'Attacker', speed: 200 });
      const p2 = makeMon(2, [33], ['flying'], { name: 'ScarfMon', ability: 'dancer', speed: 80, storedStats: { spe: 80 }, heldItem: 'choice-scarf' });
      const e1 = makeMon(3, [33], ['flying'], { name: 'NoItemMon', ability: 'dancer', speed: 100, storedStats: { spe: 100 } });
      const state = {
        version: 2,
        status: 'IN_PROGRESS',
        turn: 1,
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [p1, p2], activeIndices: [0, 1] },
          enemy: { team: [e1], activeIndices: [0] }
        },
        player: { team: [p1, p2], activeIndex: 0, activeIndices: [0, 1] },
        enemy: { team: [e1], activeIndex: 0, activeIndices: [0] }
      };
      const r = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const dancerEvents = r.events.filter(e => e.type === 'DANCER_ACTIVATED');
      assert.equal(dancerEvents[0].pokemonName, 'ScarfMon', 'Menor stored speed (80) age primeiro, ignorando multiplicador do Choice Scarf');
      assert.equal(dancerEvents[1].pokemonName, 'NoItemMon', 'Maior stored speed (100) age depois');
    });

    test('8. Speed Swap é considerado conforme a regra e inverte a ordem canônica', () => {
      const p1 = makeMon(1, [14], ['normal'], { name: 'Attacker', speed: 200 });
      const p2 = makeMon(2, [33], ['flying'], { name: 'SwappedA', ability: 'dancer', speed: 80, storedStats: { spe: 80 } });
      const e1 = makeMon(3, [33], ['flying'], { name: 'SwappedB', ability: 'dancer', speed: 120, storedStats: { spe: 120 } });

      const tmp = p2.storedStats.spe;
      p2.storedStats.spe = e1.storedStats.spe;
      e1.storedStats.spe = tmp;
      p2.speed = p2.storedStats.spe;
      e1.speed = e1.storedStats.spe;

      const state = {
        version: 2,
        status: 'IN_PROGRESS',
        turn: 1,
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [p1, p2], activeIndices: [0, 1] },
          enemy: { team: [e1], activeIndices: [0] }
        },
        player: { team: [p1, p2], activeIndex: 0, activeIndices: [0, 1] },
        enemy: { team: [e1], activeIndex: 0, activeIndices: [0] }
      };
      const r = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const dancerEvents = r.events.filter(e => e.type === 'DANCER_ACTIVATED');
      assert.equal(dancerEvents[0].pokemonName, 'SwappedB', 'SwappedB com nova stored speed menor (80) age primeiro');
      assert.equal(dancerEvents[1].pokemonName, 'SwappedA', 'SwappedA com nova stored speed maior (120) age depois');
    });

    test('9. Múltiplos portadores não geram recursão infinita (cópias marcadas com isDancerCopy)', () => {
      const p1 = makeMon(1, [14], ['normal'], { name: 'Attacker', speed: 200 });
      const p2 = makeMon(2, [33], ['flying'], { name: 'DancerA', ability: 'dancer', speed: 80 });
      const e1 = makeMon(3, [33], ['flying'], { name: 'DancerB', ability: 'dancer', speed: 100 });
      const state = {
        version: 2,
        status: 'IN_PROGRESS',
        turn: 1,
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [p1, p2], activeIndices: [0, 1] },
          enemy: { team: [e1], activeIndices: [0] }
        },
        player: { team: [p1, p2], activeIndex: 0, activeIndices: [0, 1] },
        enemy: { team: [e1], activeIndex: 0, activeIndices: [0] }
      };
      const r = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const dancerActivations = r.events.filter(ev => ev.type === 'DANCER_ACTIVATED');
      assert.equal(dancerActivations.length, 2, 'Deve disparar Dancer exatamente 2 vezes (uma por portador), sem recursão');
    });

    test('10. Nenhum PP adicional é consumido nas cópias de movimentos de dança', () => {
      const pAttacker = makeMon(1, [14], ['normal'], { speed: 200 });
      const eDancer = makeMon(2, [14], ['flying'], { ability: 'dancer', speed: 100 });
      const initialPp = eDancer.moves[0].currentPp;
      const s = Engine.createBattle(pAttacker, eDancer);
      const r = Engine.resolveTurn(s, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 14 }
      });
      assert.ok(r.events.some(ev => ev.type === 'DANCER_ACTIVATED'));
      assert.equal(r.state.enemy.moves[0].currentPp, initialPp - 1, 'A cópia de Dancer não deve consumir PP adicional');
    });

    test('11. Dancer nocauteado antes de sua execução não age', () => {
      const p1 = makeMon(1, [14], ['normal'], { name: 'Attacker', speed: 200 });
      const p2 = makeMon(2, [33], ['flying'], { name: 'AliveDancer', ability: 'dancer', speed: 80 });
      const e1 = makeMon(3, [33], ['flying'], { name: 'FaintedDancer', ability: 'dancer', speed: 120, currentHp: 0 });
      const state = {
        version: 2,
        status: 'IN_PROGRESS',
        turn: 1,
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [p1, p2], activeIndices: [0, 1] },
          enemy: { team: [e1], activeIndices: [0] }
        },
        player: { team: [p1, p2], activeIndex: 0, activeIndices: [0, 1] },
        enemy: { team: [e1], activeIndex: 0, activeIndices: [0] }
      };
      const r = Engine.resolveTurn(state, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const dancerEvents = r.events.filter(e => e.type === 'DANCER_ACTIVATED');
      assert.equal(dancerEvents.length, 1);
      assert.equal(dancerEvents[0].pokemonName, 'AliveDancer');
    });

    test('12. Singles e Doubles continuam corretos em ambos os formatos', () => {
      const pSingles = makeMon(1, [14], ['normal'], { speed: 120 });
      const eSingles = makeMon(2, [33], ['flying'], { ability: 'dancer', speed: 80 });
      const s1 = Engine.createBattle(pSingles, eSingles);
      const r1 = Engine.resolveTurn(s1, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.ok(r1.events.some(ev => ev.type === 'DANCER_ACTIVATED'), 'Singles deve ativar Dancer');

      const pD1 = makeMon(1, [14], ['normal'], { name: 'D1', speed: 200 });
      const pD2 = makeMon(2, [33], ['flying'], { name: 'AllyDancer', ability: 'dancer', speed: 80 });
      const eD1 = makeMon(3, [33], ['flying'], { name: 'FoeDancer', ability: 'dancer', speed: 120 });
      const s2 = {
        version: 2,
        status: 'IN_PROGRESS',
        turn: 1,
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [pD1, pD2], activeIndices: [0, 1] },
          enemy: { team: [eD1], activeIndices: [0] }
        },
        player: { team: [pD1, pD2], activeIndex: 0, activeIndices: [0, 1] },
        enemy: { team: [eD1], activeIndex: 0, activeIndices: [0] }
      };
      const r2 = Engine.resolveTurn(s2, {
        player: { type: 'MOVE', moveId: 14 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      const dEvents2 = r2.events.filter(e => e.type === 'DANCER_ACTIVATED');
      assert.equal(dEvents2.length, 2, 'Doubles deve ativar ambos os Dancers');
    });
  });

  describe('7. Battery (ID 217)', () => {
    test('Battery aumenta dano de golpes especiais do aliado em 1.3x (5325/4096)', () => {
      const batteryMon = makeMon(737, [33], ['bug', 'electric'], { ability: 'battery' });
      const allyAttacker = makeMon(25, [85], ['electric']);
      const defender = makeMon(99, [33], ['normal']);
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [allyAttacker, batteryMon], activeIndices: [0, 1] },
          enemy: { team: [defender], activeIndices: [0] }
        },
        player: { team: [allyAttacker, batteryMon], activeIndices: [0, 1] },
        enemy: { team: [defender], activeIndices: [0] }
      };
      const specialMove = getMove(85);
      const bp = C.P7.power(state, allyAttacker, defender, specialMove, 90);
      assert.equal(Math.round(bp), Math.round(90 * (5325 / 4096)));
    });

    test('Battery não afeta golpes físicos do aliado nem golpes do próprio portador', () => {
      const defender = makeMon(99, [33], ['normal']);
      const state = {
        player: makeMon(737, [85], ['bug', 'electric'], { ability: 'battery' }),
        enemy: defender
      };
      const specialMove = getMove(85);
      const bpSelf = C.P7.power(state, state.player, defender, specialMove, 90);
      assert.equal(bpSelf, 90, 'Battery não deve aumentar poder do próprio portador');
    });
  });

  describe('8. Power Spot (ID 249)', () => {
    test('Power Spot aumenta o dano de ataques do aliado em 1.3x (físicos e especiais)', () => {
      const psMon = makeMon(874, [33], ['rock'], { ability: 'power-spot' });
      const allyAttacker = makeMon(1, [33], ['normal']);
      const defender = makeMon(99, [33], ['normal']);
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [allyAttacker, psMon], activeIndices: [0, 1] },
          enemy: { team: [defender], activeIndices: [0] }
        },
        player: { team: [allyAttacker, psMon], activeIndices: [0, 1] },
        enemy: { team: [defender], activeIndices: [0] }
      };
      const physicalMove = getMove(33);
      const bp = C.P7.power(state, allyAttacker, defender, physicalMove, 80);
      assert.equal(Math.round(bp), Math.round(80 * (5325 / 4096)));
    });

    test('Power Spot não aumenta o poder dos golpes do próprio portador', () => {
      const defender = makeMon(99, [33], ['normal']);
      const state = {
        player: makeMon(874, [33], ['rock'], { ability: 'power-spot' }),
        enemy: defender
      };
      const move = getMove(33);
      const bp = C.P7.power(state, state.player, defender, move, 80);
      assert.equal(bp, 80);
    });
  });

  describe('9. Steely Spirit (ID 252)', () => {
    test('Steely Spirit aumenta golpes Steel em 1.5x para o portador e aliados', () => {
      const ssMon = makeMon(863, [232], ['steel'], { ability: 'steely-spirit' });
      const defender = makeMon(99, [33], ['normal']);
      const state = { player: ssMon, enemy: defender };
      const steelMove = { id: 232, name: 'Metal Claw', type: 'steel', power: 50 };
      const bp = C.P7.power(state, ssMon, defender, steelMove, 50);
      assert.equal(Math.round(bp), 75);
    });

    test('Múltiplos portadores de Steely Spirit no mesmo lado acumulam multiplicativamente (1.5x * 1.5x = 2.25x)', () => {
      const ss1 = makeMon(863, [232], ['steel'], { ability: 'steely-spirit' });
      const ss2 = makeMon(863, [232], ['steel'], { ability: 'steely-spirit' });
      const defender = makeMon(99, [33], ['normal']);
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [ss1, ss2], activeIndices: [0, 1] },
          enemy: { team: [defender], activeIndices: [0] }
        },
        player: { team: [ss1, ss2], activeIndices: [0, 1] },
        enemy: { team: [defender], activeIndices: [0] }
      };
      const steelMove = { id: 232, name: 'Metal Claw', type: 'steel', power: 50 };
      const bp = C.P7.power(state, ss1, defender, steelMove, 50);
      assert.equal(Math.round(bp), Math.round(50 * 1.5 * 1.5));
    });
  });

  describe('10. Propeller Tail & Stalwart (IDs 239, 242)', () => {
    test('Propeller Tail ignora redirecionamento por Lightning Rod e atinge alvo original', () => {
      const attacker = makeMon(847, [85], ['water'], { ability: 'propeller-tail' });
      const target2 = makeMon(2, [33], ['normal']);
      const rodMon = makeMon(3, [33], ['electric'], { ability: 'lightning-rod' });
      const s = {
        turn: 1,
        status: 'IN_PROGRESS',
        battleFormat: 'DOUBLES',
        player: { team: [attacker], activeIndices: [0] },
        enemy: { team: [rodMon, target2], activeIndices: [0, 1] },
        doublesTeams: {
          player: { team: [attacker], activeIndices: [0] },
          enemy: { team: [rodMon, target2], activeIndices: [0, 1] }
        }
      };
      const r = Engine.resolveDoublesTurn(s, {
        player: [{ type: 'MOVE', moveId: 85, target: 1 }],
        enemy: [{ type: 'MOVE', moveId: 33 }, { type: 'MOVE', moveId: 33 }]
      });
      assert.ok(!r.events.some(ev => ev.type === 'ABILITY_REDIRECT'), 'Golpe não deve ser redirecionado por Lightning Rod');
    });

    test('Stalwart ignora redirecionamento por Storm Drain e atinge alvo original', () => {
      const attacker = makeMon(884, [56], ['steel', 'dragon'], { ability: 'stalwart' });
      const target2 = makeMon(2, [33], ['normal']);
      const drainMon = makeMon(3, [33], ['water'], { ability: 'storm-drain' });
      const s = {
        turn: 1,
        status: 'IN_PROGRESS',
        battleFormat: 'DOUBLES',
        player: { team: [attacker], activeIndices: [0] },
        enemy: { team: [drainMon, target2], activeIndices: [0, 1] },
        doublesTeams: {
          player: { team: [attacker], activeIndices: [0] },
          enemy: { team: [drainMon, target2], activeIndices: [0, 1] }
        }
      };
      const r = Engine.resolveDoublesTurn(s, {
        player: [{ type: 'MOVE', moveId: 56, target: 1 }],
        enemy: [{ type: 'MOVE', moveId: 33 }, { type: 'MOVE', moveId: 33 }]
      });
      assert.ok(!r.events.some(ev => ev.type === 'ABILITY_REDIRECT'), 'Golpe não deve ser redirecionado por Storm Drain');
    });
  });

  describe('11. Curious Medicine (ID 261)', () => {
    test('Ao entrar em campo, Curious Medicine reseta estágios de atributos do aliado para 0', () => {
      const medMon = makeMon(199, [33], ['poison', 'psychic'], { ability: 'curious-medicine' });
      const debuffedAlly = makeMon(1, [33], ['normal'], {
        statStages: { attack: -2, defense: -1, specialAttack: 2, specialDefense: -3, speed: 1 }
      });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [medMon, debuffedAlly], activeIndices: [0, 1] }
        },
        player: { team: [medMon, debuffedAlly], activeIndices: [0, 1] },
        enemy: { team: [makeMon(99)], activeIndices: [0] }
      };
      const events = [];
      C.P7.enter(state, 'player', C, events);
      assert.equal(debuffedAlly.statStages.attack, 0);
      assert.equal(debuffedAlly.statStages.specialAttack, 0);
      assert.equal(debuffedAlly.statStages.specialDefense, 0);
      assert.ok(events.some(e => e.type === 'CURIOUS_MEDICINE_RESET'));
    });
  });

  describe('12. Costar (ID 294)', () => {
    test('Ao entrar em campo, Costar copia os estágios de modificação positivos e negativos do aliado', () => {
      const costarMon = makeMon(941, [33], ['poison', 'flying'], { ability: 'costar' });
      const boostedAlly = makeMon(1, [33], ['normal'], {
        statStages: { attack: 2, defense: -1, specialAttack: 3, specialDefense: 0, speed: -2 }
      });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [costarMon, boostedAlly], activeIndices: [0, 1] }
        },
        player: { team: [costarMon, boostedAlly], activeIndices: [0, 1] },
        enemy: { team: [makeMon(99)], activeIndices: [0] }
      };
      const events = [];
      C.P7.enter(state, 'player', C, events);
      assert.equal(costarMon.statStages.attack, 2);
      assert.equal(costarMon.statStages.defense, -1);
      assert.equal(costarMon.statStages.specialAttack, 3);
      assert.equal(costarMon.statStages.speed, -2);
      assert.ok(events.some(e => e.type === 'COSTAR_COPIED'));
    });

    test('Costar copia estados de foco crítico (Focus Energy / criticalStage e Dragon Cheer)', () => {
      const costarMon = makeMon(941, [33], ['poison', 'flying'], { ability: 'costar' });
      const focusAlly = makeMon(1, [33], ['normal'], {
        statStages: { attack: 1 },
        focusEnergy: true,
        dragonCheer: true,
        criticalStage: 2
      });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [costarMon, focusAlly], activeIndices: [0, 1] }
        },
        player: { team: [costarMon, focusAlly], activeIndices: [0, 1] },
        enemy: { team: [makeMon(99)], activeIndices: [0] }
      };
      const events = [];
      C.P7.enter(state, 'player', C, events);
      assert.equal(costarMon.focusEnergy, true);
      assert.equal(costarMon.dragonCheer, true);
      assert.equal(costarMon.criticalStage, 2);
    });
  });

  describe('13. Hospitality (ID 299)', () => {
    test('Ao entrar em campo, Hospitality cura 25% do HP máximo do aliado ativo', () => {
      const hospMon = makeMon(1012, [33], ['grass', 'ghost'], { ability: 'hospitality' });
      const injuredAlly = makeMon(1, [33], ['normal'], { currentHp: 500, maxHp: 1000, hp: 1000 });
      const state = {
        battleFormat: 'DOUBLES',
        doublesTeams: {
          player: { team: [hospMon, injuredAlly], activeIndices: [0, 1] }
        },
        player: { team: [hospMon, injuredAlly], activeIndices: [0, 1] },
        enemy: { team: [makeMon(99)], activeIndices: [0] }
      };
      const events = [];
      C.P7.enter(state, 'player', C, events);
      assert.equal(injuredAlly.currentHp, 750, '500 + 250 = 750 HP');
      assert.ok(events.some(e => e.type === 'HOSPITALITY_HEAL' && e.healAmount === 250));
    });
  });

  describe('14. Victory Star (ID 162)', () => {
    test('Victory Star multiplica a precisão dos golpes do portador em 1.1x (4506/4096)', () => {
      const vsMon = makeMon(494, [85], ['psychic', 'fire'], { ability: 'victory-star', victoryStarCount: 1 });
      const foe = makeMon(99);
      const move = { id: 85, accuracy: 70 };
      const acc = C.P7.accuracy(move, vsMon, foe, 70);
      assert.equal(acc, 77, 'Math.floor(70 * 4506 / 4096) = 77');
    });

    test('Múltiplos portadores de Victory Star no mesmo lado acumulam multiplicativamente (~1.21x)', () => {
      const mon1 = makeMon(494, [85], ['psychic', 'fire'], { ability: 'victory-star', victoryStarCount: 2 });
      const foe = makeMon(99);
      const move = { id: 85, accuracy: 70 };
      const acc = C.P7.accuracy(move, mon1, foe, 70);
      assert.equal(acc, 84, 'Deve acumular multiplicativamente 2x: Math.floor(77 * 4506 / 4096) = 84');
    });

    test('Victory Star preserva golpes que nunca erram (accuracy === null)', () => {
      const vsMon = makeMon(494, [33], ['psychic', 'fire'], { ability: 'victory-star', victoryStarCount: 1 });
      const foe = makeMon(99);
      const swift = { id: 129, accuracy: null };
      const acc = C.P7.accuracy(swift, vsMon, foe, null);
      assert.equal(acc, null, 'Golpes que nunca falham continuam com precisão null');
    });
  });

  // =========================================================================
  // FAMILY H10: EXTERNAL / SYSTEMS / ESCAPE / CAPTURE (3 ABILITIES)
  // =========================================================================

  describe('15. Run Away (Showdown num = 50 / PokéAPI ID 50)', () => {
    test('Conferência canônica de IDs: Run Away é Showdown 50 / PokéAPI 50; Normalize é Showdown 96 / PokéAPI 96; sem colisões e slugs intactos', () => {
      const runAway = Registry.getAbility('run-away');
      const normalize = Registry.getAbility('normalize');
      assert.equal(runAway.showdownId, 50, 'Run Away Showdown ID deve ser 50');
      assert.equal(runAway.pokeApiId, 50, 'Run Away PokéAPI ID deve ser 50 (NÃO 96)');
      assert.equal(normalize.showdownId, 96, 'Normalize Showdown ID deve ser 96');
      assert.equal(normalize.pokeApiId, 96, 'Normalize PokéAPI ID deve ser 96');
      assert.notEqual(runAway.showdownId, normalize.showdownId, 'Não deve haver colisão entre Run Away e Normalize');
      assert.notEqual(runAway.pokeApiId, normalize.pokeApiId, 'Não deve haver colisão na PokéAPI');
      assert.ok(runAway.bearer.includes('Rattata (#19)'), 'Rattata porta Run Away');
      assert.ok(runAway.bearer.includes('Eevee (#133)'), 'Eevee porta Run Away');
      assert.ok(normalize.bearer.includes('Skitty (#300)'), 'Skitty porta Normalize');
    });

    test('Run Away garante fuga imediata em batalhas selvagens', () => {
      const runner = makeMon(19, [33], ['normal'], { ability: 'run-away' });
      const state = {
        player: runner,
        enemy: makeMon(99),
        isTrainerBattle: false
      };
      const res = C.P7.canEscape(state, 'player');
      assert.equal(res.canEscape, true);
      assert.equal(res.reason, 'RUN_AWAY');
    });

    test('Run Away ignora aprisionamento por Shadow Tag, Arena Trap e Magnet Pull', () => {
      const runner = makeMon(19, [33], ['steel'], { ability: 'run-away' });
      const trapper = makeMon(99, [33], ['electric'], { ability: 'magnet-pull' });
      const state = {
        player: runner,
        enemy: trapper,
        isTrainerBattle: false
      };
      C.P7.sync(state);
      assert.equal(runner.p7AbilityTrap, false, 'Run Away não deve ser aprisionado por Magnet Pull');
      const res = C.P7.canEscape(state, 'player');
      assert.equal(res.canEscape, true);
    });

    test('Run Away é bloqueado em batalhas de treinador/ginasio/trial', () => {
      const runner = makeMon(19, [33], ['normal'], { ability: 'run-away' });
      const state = {
        player: runner,
        enemy: makeMon(99),
        isTrainerBattle: true
      };
      const res = C.P7.canEscape(state, 'player');
      assert.equal(res.canEscape, false);
      assert.equal(res.reason, 'TRAINER_BATTLE');
    });

    test('Engine processa ação FLEE com Run Away e emite RUN_AWAY_ESCAPED', () => {
      const runner = makeMon(19, [33], ['normal'], { ability: 'run-away', speed: 10 });
      const wild = makeMon(99, [33], ['normal'], { speed: 100 });
      const s = Engine.createBattle(runner, wild);
      s.isTrainerBattle = false;
      const r = Engine.resolveTurn(s, {
        player: { type: 'FLEE' },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(r.state.status, 'ESCAPED');
      assert.ok(r.events.some(e => e.type === 'RUN_AWAY_ESCAPED'));
    });

    test('Integração de fuga no BattleSessionController encerra sessão com ESCAPED e preserva HP', async () => {
      const runner = makeMon(19, [33], ['normal'], { ability: 'run-away', currentHp: 1500, maxHp: 2000 });
      const enemy = makeMon(99, [33], ['normal'], { currentHp: 2000, maxHp: 2000 });
      const controller = new BattleSessionController({
        playerTeamIds: [19],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C
      });
      controller.battleState = {
        turn: 1,
        status: 'IN_PROGRESS',
        player: { team: [runner], activeIndex: 0 },
        enemy: { team: [enemy], activeIndex: 0 },
        isTrainerBattle: false
      };
      controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;
      await controller.submitPlayerEscape();
      assert.equal(controller.battleState.status, 'ESCAPED');
      assert.equal(controller.battleState.player.team[0].currentHp, 1500, 'HP do Pokémon deve ser rigorosamente preservado na fuga');
      assert.equal(controller.uiState, BATTLE_UI_STATES.ESCAPED);
    });
  });

  describe('16. Honey Gather (ID 118)', () => {
    test('Honey Gather NÃO concede Honey durante o turno nem no residual de batalha', () => {
      const hgMon = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 50, item: null });
      const state = { player: hgMon, enemy: makeMon(99) };
      const events = [];
      C.P7.earlyResidual(state, C, events);
      assert.equal(hgMon.item, null, 'Nenhum item pode ser criado durante o turno por Honey Gather');
    });

    test('Honey Gather concede Honey no pós-combate baseado na chance canônica por nível', () => {
      const hgMon = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 50, item: null });
      const state = {
        player: { team: [hgMon] },
        enemy: { team: [makeMon(99)] },
        honeyGatherRoll: 20
      };
      const events = [];
      C.P7.checkHoneyGather(state, 'player', C, events);
      assert.equal(hgMon.item, 'honey', 'Honey deve ser concedido após batalha vitoriosa');
      assert.ok(events.some(e => e.type === 'HONEY_GATHER_FOUND'));
    });

    test('Membros da equipe recebem Honey no pós-combate mesmo sem ter participado da luta', () => {
      const activeMon = makeMon(1, [33], ['normal']);
      const benchHg = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 80, item: null });
      const state = {
        player: { team: [activeMon, benchHg] },
        enemy: { team: [makeMon(99)] },
        honeyGatherRoll: 30
      };
      const events = [];
      C.P7.checkHoneyGather(state, 'player', C, events);
      assert.equal(benchHg.item, 'honey', 'Pokémon no banco também é elegível para Honey Gather');
    });

    test('Honey Gather não concede Honey duplicado se já estiver segurando item ou resolver 2x', () => {
      const hgMon = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 100, item: 'leftovers' });
      const state = {
        player: { team: [hgMon] },
        enemy: { team: [makeMon(99)] },
        honeyGatherRoll: 1
      };
      const events = [];
      C.P7.checkHoneyGather(state, 'player', C, events);
      assert.equal(hgMon.item, 'leftovers', 'Item segurado existente não pode ser sobrescrito');
    });

    test('Honey possui ID oficial 94 da PokéAPI, Red Chain (418) não é confundido e itens não colidem', () => {
      assert.equal(C.P7.items.honey.id, 94, 'Honey deve possuir ID 94 oficial da PokéAPI');
      assert.notEqual(C.P7.items.honey.id, 418, 'ID 418 pertence à Red Chain e não a Honey');
      assert.equal(C.P7.items['red-chain'], undefined, 'Red Chain não é item de combate');
      const itemsWithId94 = Object.values(C.P7.items).filter(it => it.id === 94);
      assert.equal(itemsWithId94.length, 1, 'Exatamente um item com ID 94');
      assert.equal(itemsWithId94[0].name, 'honey');
    });

    test('normalizeItem, validatePreference e descrições do catálogo mantêm consistência canônica para Honey', () => {
      assert.equal(C.P7.normalizeItem('honey'), 'honey');
      assert.equal(C.P7.normalizeItem({ name: 'honey', id: 94 }), 'honey');
      assert.throws(() => C.P7.normalizeItem('red-chain'), /sem suporte/);

      const pref = C.P7.validatePreference(415, { ability: 'honey-gather', item: 'honey' });
      assert.deepEqual(pref, { ability: 'honey-gather', item: 'honey' });

      const prefP8 = C.P7.validatePreference(415, { ability: 'honey-gather', item: 'honey', teraType: 'flying', specialMechanic: 'tera' });
      assert.deepEqual(prefP8, { ability: 'honey-gather', item: 'honey', teraType: 'flying', specialMechanic: 'tera' });

      const desc = describeItem('honey');
      assert.ok(desc && desc.length > 0, 'Descrição de Honey deve estar disponível');
      assert.match(desc, /Honey Gather|Mel doce/);
    });
  });

  describe('17. Ball Fetch (ID 237)', () => {
    test('Fluxo completo de arremesso e recuperação: Ball Fetch recupera a primeira Poké Ball com falha no final do turno', () => {
      const bfMon = makeMon(835, [33], ['electric'], { ability: 'ball-fetch', item: null });
      const wild = makeMon(99, [33], ['normal'], { currentHp: 2000, maxHp: 2000, catchRate: 3 });
      const s = Engine.createBattle(bfMon, wild);
      s.isTrainerBattle = false;
      const r = Engine.resolveTurn(s, {
        player: { type: 'THROW_BALL', ball: 'ultra-ball', roll: 250 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.ok(r.events.some(e => e.type === 'POKEMON_BROKE_FREE'), 'A Poké Ball deve ter falhado na captura');
      assert.ok(r.events.some(e => e.type === 'BALL_FETCH_RETRIEVED' && e.item === 'ultra-ball'), 'Ball Fetch deve ter recuperado a Ultra Ball');
      assert.equal(r.state.player.item, 'ultra-ball', 'Portador deve estar segurando a Ultra Ball resgatada');
    });

    test('Arremesso de Pokébola é bloqueado em batalhas de treinador', () => {
      const bfMon = makeMon(835, [33], ['electric'], { ability: 'ball-fetch' });
      const trainerMon = makeMon(99, [33], ['normal']);
      const s = Engine.createBattle(bfMon, trainerMon);
      s.isTrainerBattle = true;
      const r = Engine.resolveTurn(s, {
        player: { type: 'THROW_BALL', ball: 'great-ball' },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.ok(r.events.some(e => e.type === 'BALL_BLOCKED' && e.reason === 'TRAINER_BATTLE'));
      assert.equal(r.state.firstFailedBall, undefined);
    });

    test('Ball Fetch não recupera segunda Poké Ball na mesma batalha', () => {
      const bfMon = makeMon(835, [33], ['electric'], { ability: 'ball-fetch', item: null });
      const state = {
        player: bfMon,
        enemy: makeMon(99),
        firstFailedBall: 'great-ball',
        ballFetchTriggered: true
      };
      const events = [];
      C.P7.earlyResidual(state, C, events);
      assert.equal(bfMon.item, null, 'Não deve recuperar segunda bola');
    });

    test('Portador de Ball Fetch com item equipado não recupera a Pokébola', () => {
      const bfMon = makeMon(835, [33], ['electric'], { ability: 'ball-fetch', item: 'focus-sash' });
      const state = {
        player: bfMon,
        enemy: makeMon(99),
        firstFailedBall: 'pokeball'
      };
      const events = [];
      C.P7.earlyResidual(state, C, events);
      assert.equal(bfMon.item, 'focus-sash', 'Item existente impede resgate');
    });
  });

  // =========================================================================
  // FAMILY H11: POKÉMON CHAMPIONS (2026) MEGA ABILITIES (7 ABILITIES)
  // =========================================================================

  describe('18. Piercing Drill (Mega Excadrill)', () => {
    test('Golpe de contato atravessa Protect causando 25% do dano normal', () => {
      const excadrill = makeMon(10287, [33], ['ground', 'steel'], { ability: 'piercing-drill' });
      const defender = makeMon(99, [182], ['normal'], { isProtected: true });
      const state = { player: excadrill, enemy: defender };
      const contactMove = { id: 33, name: 'Tackle', power: 40, isContact: true, damageClass: 'physical' };
      const mult = C.P7.damageMultiplier(state, excadrill, defender, contactMove, 1);
      assert.equal(mult, 0.25);
    });

    test('Golpe sem contato é totalmente bloqueado por Protect', () => {
      const excadrill = makeMon(10287, [89], ['ground', 'steel'], { ability: 'piercing-drill' });
      const defender = makeMon(99, [182], ['normal'], { isProtected: true });
      const state = { player: excadrill, enemy: defender };
      const nonContactMove = { id: 89, name: 'Earthquake', power: 100, isContact: false, damageClass: 'physical' };
      const mult = C.P7.damageMultiplier(state, excadrill, defender, nonContactMove, 1);
      assert.equal(mult, 1.0, 'Golpe sem contato não possui multiplicador de penetração');
    });
  });

  describe('19. Dragonize (Mega Feraligatr)', () => {
    test('Dragonize converte golpes Normal em Dragon e aumenta poder em 1.2x', () => {
      const feraligatr = makeMon(10283, [33], ['water', 'dragon'], { ability: 'dragonize' });
      const defender = makeMon(99);
      const normalMove = { id: 33, name: 'Tackle', type: 'normal', power: 40, damageClass: 'physical' };
      const newType = C.P7.moveType(null, feraligatr, normalMove);
      assert.equal(newType, 'dragon', 'Tipo deve ser Dragon');
      const bp = C.P7.power(null, feraligatr, defender, normalMove, 40);
      assert.equal(Math.round(bp), 48, '40 * 1.2 = 48 BP');
    });

    test('Dragonize converte golpes de status do tipo Normal para Dragon (ex: Swords Dance)', () => {
      const feraligatr = makeMon(10283, [14], ['water', 'dragon'], { ability: 'dragonize' });
      const swordsDance = getMove(14);
      const converted = C.P7.moveType(null, feraligatr, swordsDance);
      assert.equal(converted, 'dragon', 'Dragonize converte golpes de status Normal para Dragon');
    });

    test('Dragonize não converte golpes de outros tipos (ex: Water Gun permanece water)', () => {
      const feraligatr = makeMon(10283, [55], ['water', 'dragon'], { ability: 'dragonize' });
      const waterMove = { id: 55, name: 'Water Gun', type: 'water', power: 40, damageClass: 'special' };
      const type = C.P7.moveType(null, feraligatr, waterMove);
      assert.equal(type, 'water');
    });

    test('Dragonize respeita exceções canônicas de onModifyType que determinam o próprio tipo', () => {
      const feraligatr = makeMon(10283, [33], ['water', 'dragon'], { ability: 'dragonize' });
      const exemptMoves = [
        { id: 449, name: 'judgment', type: 'normal' },
        { id: 546, name: 'techno-blast', type: 'normal' },
        { id: 718, name: 'multi-attack', type: 'normal' },
        { id: 363, name: 'natural-gift', type: 'normal' },
        { id: 686, name: 'revelation-dance', type: 'normal' },
        { id: 805, name: 'terrain-pulse', type: 'normal' },
        { id: 311, name: 'weather-ball', type: 'normal' },
        { id: 165, name: 'struggle', type: 'normal' }
      ];
      for (const m of exemptMoves) {
        assert.ok(C.P7.isTypeChangerExempt(feraligatr, m), 'Move ' + m.name + ' (' + m.id + ') deve ser isento de conversão de tipo');
        const t = C.P7.moveType(null, feraligatr, m);
        assert.notEqual(t, 'dragon', 'Move ' + m.name + ' (' + m.id + ') NÃO deve ser convertido para dragon');
      }
      const sd = { id: 14, name: 'swords-dance', type: 'normal', power: 0, damageClass: 'status' };
      assert.equal(C.P7.moveType(null, feraligatr, sd), 'dragon', 'Status move elegível converte para dragon');
      assert.equal(C.P7.power(null, feraligatr, makeMon(99), sd, 0), 0, 'Status move não ganha poder base');
    });

  });

  describe('20. Mega Sol (Mega Meganium)', () => {
    test('Mega Sol simula Sol nos golpes do portador: Fire tem 1.5x e Water tem 0.5x sem alterar clima global', () => {
      const meganium = makeMon(10282, [53, 55], ['grass', 'fairy'], { ability: 'mega-sol' });
      const foe = makeMon(99);
      const fireMove = { id: 53, name: 'Flamethrower', type: 'fire', power: 90 };
      const waterMove = { id: 55, name: 'Surf', type: 'water', power: 90 };
      const fireBp = C.P7.power(null, meganium, foe, fireMove, 90);
      assert.equal(fireBp, 90, 'Poder base do golpe de fogo permanece 90 (NÃO 135)');
      const fireMult = C.P7.damageMultiplier(null, meganium, foe, fireMove, 1);
      assert.equal(fireMult, 1.5, 'Modificador de dano de sol 1.5x é aplicado separadamente no dano');
      const waterMult = C.P7.damageMultiplier(null, meganium, foe, waterMove, 1);
      assert.equal(waterMult, 0.5, 'Dano de água reduzido a 0.5x');
    });

    test('Mega Sol permite Solar Beam e Solar Blade dispararem em 1 turno sem carregar', () => {
      const meganium = makeMon(10282, [76, 669], ['grass', 'fairy'], { ability: 'mega-sol' });
      const solarBeam = { id: 76, name: 'Solar Beam', power: 120, type: 'grass' };
      const solarBlade = { id: 669, name: 'Solar Blade', power: 125, type: 'grass' };
      assert.equal(C.P7.instantCharge(null, meganium, solarBeam), true);
      assert.equal(C.P7.instantCharge(null, meganium, solarBlade), true);
    });

    test('Mega Sol torna Weather Ball tipo Fire com 100 BP e 1.5x boost', () => {
      const meganium = makeMon(10282, [311], ['grass', 'fairy'], { ability: 'mega-sol' });
      const foe = makeMon(99);
      const wb = { id: 311, name: 'Weather Ball', type: 'normal', power: 50 };
      const wbType = C.P7.moveType(null, meganium, wb);
      assert.equal(wbType, 'fire');
      const wbBp = C.P7.power(null, meganium, foe, wb, 50);
      assert.equal(wbBp, 100, 'Poder base de Weather Ball passa estritamente a 100 (NÃO 150)');
      const wbDamageMult = C.P7.damageMultiplier(null, meganium, foe, wb, 1);
      assert.equal(wbDamageMult, 1.5, 'Multiplicador de dano de sol é aplicado separadamente (1.5x)');
    });

    test('Mega Sol sob outros climas: Weather Ball continua Fire 100 BP com 1.5x boost mesmo sob chuva, e clima global não é modificado para outros combatentes', () => {
      const meganium = makeMon(10282, [311], ['grass', 'fairy'], { ability: 'mega-sol' });
      const foe = makeMon(99, [53, 55], ['water']);
      const rainState = {
        weather: { id: 'rain', turns: 5 },
        player: meganium,
        enemy: foe
      };
      const wb = { id: 311, name: 'Weather Ball', type: 'normal', power: 50 };
      assert.equal(C.P7.moveType(rainState, meganium, wb), 'fire', 'Weather Ball continua Fire sob Mega Sol');
      assert.equal(C.P7.power(rainState, meganium, foe, wb, 50), 100, 'Base power estritamente 100');
      assert.equal(C.P7.damageMultiplier(rainState, meganium, foe, wb, 1), 1.5, 'Dano de fogo de Mega Sol não é penalizado pela chuva (1.5x)');
      const foeFireMove = { id: 53, name: 'Flamethrower', type: 'fire', power: 90 };
      const foeWaterMove = { id: 55, name: 'Surf', type: 'water', power: 90 };
      assert.equal(C.P7.damageMultiplier(rainState, foe, meganium, foeFireMove, 1), 0.5, 'Clima global de chuva permanece ativo para oponente (fogo 0.5x)');
      assert.equal(C.P7.damageMultiplier(rainState, foe, meganium, foeWaterMove, 1), 1.5, 'Clima global de chuva permanece ativo para oponente (água 1.5x)');
    });

  });

  describe('21. Spicy Spray (Mega Scovillain)', () => {
    test('Ao sofrer dano de ataque adversário, Spicy Spray queima o atacante', () => {
      const attacker = makeMon(1, [33], ['normal'], { speed: 100 });
      const scovillain = makeMon(10320, [33], ['grass', 'fire'], { ability: 'spicy-spray', speed: 10 });
      const s = Engine.createBattle(attacker, scovillain);
      const r = Engine.resolveTurn(s, {
        player: { type: 'MOVE', moveId: 33 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(r.state.player.statusCondition, 'burn', 'Atacante deve receber Burn');
      assert.ok(r.events.some(e => e.type === 'SPICY_SPRAY_BURN'));
    });

    test('Spicy Spray não queima Pokémon do tipo Fire', () => {
      const fireAttacker = makeMon(4, [33], ['fire'], { speed: 100 });
      const scovillain = makeMon(10320, [33], ['grass', 'fire'], { ability: 'spicy-spray', speed: 10 });
      const s = Engine.createBattle(fireAttacker, scovillain);
      const r = Engine.resolveTurn(s, {
        player: { type: 'MOVE', moveId: 33 },
        enemy: { type: 'MOVE', moveId: 33 }
      });
      assert.equal(r.state.player.statusCondition, null, 'Tipo Fire é imune a Burn');
    });
  });

  describe('22. Eelevate (Mega Eelektross)', () => {
    test('Eelevate concede imunidade completa a golpes do tipo Ground', () => {
      const eelektross = makeMon(10290, [33], ['electric'], { ability: 'eelevate' });
      const groundMove = { id: 89, name: 'Earthquake', type: 'ground' };
      const immune = C.P7.tryHit(null, 'player', groundMove, C, [], makeMon(99), eelektross, 'enemy');
      assert.equal(immune, true, 'Eelevate deve conceder imunidade completa a Ground');
    });

    test('Eelevate aumenta maior atributo em +1 estágio ao nocautear diretamente um oponente', () => {
      const eelektross = makeMon(10290, [85], ['electric'], { ability: 'eelevate', attack: 140, specialAttack: 120 });
      const foe = makeMon(99, [33], ['normal']);
      const state = { player: eelektross, enemy: foe };
      const events = [];
      C.P7.directKO(state, 'player', eelektross, foe, C, events);
      assert.equal(eelektross.statStages.attack, 1, 'Maior atributo (Attack) deve subir +1');
      assert.ok(events.some(e => e.type === 'EELEVATE_BOOST' && e.statKey === 'attack'));
    });
  });

  describe('23. Fire Mane (Mega Pyroar)', () => {
    test('Fire Mane aumenta o poder de golpes Fire em 1.5x', () => {
      const pyroar = makeMon(10295, [53], ['fire', 'normal'], { ability: 'fire-mane' });
      const foe = makeMon(99);
      const fireMove = { id: 53, name: 'Flamethrower', type: 'fire', power: 90 };
      const bp = C.P7.power(null, pyroar, foe, fireMove, 90);
      assert.equal(bp, 135, '90 * 1.5 = 135 BP');
    });

    test('Fire Mane não aumenta o poder de golpes de outros tipos', () => {
      const pyroar = makeMon(10295, [33], ['fire', 'normal'], { ability: 'fire-mane' });
      const foe = makeMon(99);
      const normalMove = { id: 33, name: 'Tackle', type: 'normal', power: 40 };
      const bp = C.P7.power(null, pyroar, foe, normalMove, 40);
      assert.equal(bp, 40, 'Golpe normal mantém 40 BP');
    });
  });

  describe('24. Aura Guard (Mega Lucario Z)', () => {
    test('Aura Guard reduz à metade (0.5x) o dano sofrido por golpes de contato', () => {
      const lucarioZ = makeMon(10310, [33], ['fighting', 'steel'], { ability: 'aura-guard' });
      const attacker = makeMon(99);
      const contactMove = { id: 33, name: 'Tackle', type: 'normal', isContact: true };
      const mult = C.P7.damageMultiplier(null, attacker, lucarioZ, contactMove, 1);
      assert.equal(mult, 0.5);
    });

    test('Aura Guard não reduz dano de golpes que não fazem contato', () => {
      const lucarioZ = makeMon(10310, [89], ['fighting', 'steel'], { ability: 'aura-guard' });
      const attacker = makeMon(99);
      const nonContact = { id: 89, name: 'Earthquake', type: 'ground', isContact: false };
      const mult = C.P7.damageMultiplier(null, attacker, lucarioZ, nonContact, 1);
      assert.equal(mult, 1.0);
    });

    test('Mold Breaker ignora a redução de dano de Aura Guard', () => {
      const lucarioZ = makeMon(10310, [33], ['fighting', 'steel'], { ability: 'aura-guard' });
      const attacker = makeMon(99, [33], ['normal'], { ability: 'mold-breaker' });
      const contactMove = { id: 33, name: 'Tackle', type: 'normal', isContact: true };
      const mult = C.P7.damageMultiplier(null, attacker, lucarioZ, contactMove, 1);
      assert.equal(mult, 1.0);
    });
  });

  // =========================================================================
  // REAL HYDRATION & FORMS AUDIT: POKÉMON CHAMPIONS (H11)
  // =========================================================================

  describe('25. Form Hydration & Catalog Integration (H11 Champions Megas)', () => {
    const hydrator = new BattleTeamHydrator();

    const MEGA_SPECIES = [
      { id: 10287, name: 'excadrill-mega', ability: 'piercing-drill', baseId: 530, baseAbility: 'sand-rush' },
      { id: 10283, name: 'feraligatr-mega', ability: 'dragonize', baseId: 160, baseAbility: 'torrent' },
      { id: 10282, name: 'meganium-mega', ability: 'mega-sol', baseId: 154, baseAbility: 'overgrow' },
      { id: 10320, name: 'scovillain-mega', ability: 'spicy-spray', baseId: 952, baseAbility: 'chlorophyll' },
      { id: 10290, name: 'eelektross-mega', ability: 'eelevate', baseId: 604, baseAbility: 'levitate' },
      { id: 10295, name: 'pyroar-mega', ability: 'fire-mane', baseId: 668, baseAbility: 'rivalry' },
      { id: 10310, name: 'lucario-mega-z', ability: 'aura-guard', baseId: 448, baseAbility: 'steadfast' }
    ];

    test('Todas as 7 formas Mega são hidratadas com suas habilidades exclusivas e formas base preservadas', async () => {
      for (const entry of MEGA_SPECIES) {
        const megaMon = await hydrator.hydratePokemon({ id: entry.id });
        assert.ok(megaMon, 'Forma Mega ' + entry.name + ' (' + entry.id + ') deve ser hidratada com sucesso');
        assert.equal(megaMon.ability, entry.ability, 'Mega ' + entry.name + ' deve possuir habilidade ' + entry.ability);

        const baseMon = await hydrator.hydratePokemon({ id: entry.baseId });
        assert.ok(baseMon, 'Forma base ' + entry.baseId + ' deve ser hidratada com sucesso');
        assert.notEqual(baseMon.ability, entry.ability, 'Forma base ' + entry.baseId + ' NÃO pode herdar habilidade Mega ' + entry.ability);
      }
    });

    test('Supressão por Neutralizing Gas anula as habilidades especiais das formas Mega', () => {
      const megaExcadrill = makeMon(10287, [33], ['ground', 'steel'], { ability: 'piercing-drill' });
      const gasMon = makeMon(110, [33], ['poison'], { ability: 'neutralizing-gas' });
      const state = {
        player: megaExcadrill,
        enemy: gasMon
      };
      C.P7.sync(state);
      assert.equal(megaExcadrill.neutralizingGasSuppressed, true, 'Piercing Drill deve ser suprimido por Neutralizing Gas');
    });

    test('Matriz canônica de IDs H11: correspondência exata entre slug, ID oficial Showdown, PokéAPI e forma Mega', () => {
      const H11_CANONICAL = [
        { slug: 'piercing-drill', showdownId: 311, pokeApiId: 308, formId: 10287, bearer: 'Mega Excadrill' },
        { slug: 'dragonize', showdownId: 312, pokeApiId: 309, formId: 10283, bearer: 'Mega Feraligatr' },
        { slug: 'mega-sol', showdownId: 315, pokeApiId: 310, formId: 10282, bearer: 'Mega Meganium' },
        { slug: 'spicy-spray', showdownId: 318, pokeApiId: 311, formId: 10320, bearer: 'Mega Scovillain' },
        { slug: 'eelevate', showdownId: 313, pokeApiId: 312, formId: 10290, bearer: 'Mega Eelektross' },
        { slug: 'fire-mane', showdownId: 316, pokeApiId: 313, formId: 10295, bearer: 'Mega Pyroar' },
        { slug: 'aura-guard', showdownId: 319, pokeApiId: 314, formId: 10310, bearer: 'Mega Lucario Z' }
      ];
      for (const entry of H11_CANONICAL) {
        const ab = Registry.getAbility(entry.slug);
        assert.ok(ab, 'Habilidade H11 ' + entry.slug + ' deve existir no registro');
        assert.equal(ab.showdownId, entry.showdownId, 'Showdown ID de ' + entry.slug + ' deve ser ' + entry.showdownId);
        assert.equal(ab.pokeApiId, entry.pokeApiId, 'PokéAPI ID de ' + entry.slug + ' deve ser ' + entry.pokeApiId);
        assert.ok(ab.bearer.includes(String(entry.formId)), 'Bearer deve referenciar a forma Mega #' + entry.formId);
        assert.ok(ab.bearer.includes(entry.bearer), 'Bearer deve conter ' + entry.bearer);
      }
    });

  });

  // =========================================================================
  // METADATA & REGISTRY VERIFICATION
  // =========================================================================

  describe('26. Metadata, Registry & Inventory Audit', () => {
    const ALL_26 = [
      'plus', 'minus', 'healer', 'friend-guard', 'telepathy', 'symbiosis',
      'dancer', 'battery', 'power-spot', 'steely-spirit', 'propeller-tail',
      'stalwart', 'curious-medicine', 'costar', 'hospitality', 'victory-star',
      'run-away', 'honey-gather', 'ball-fetch', 'piercing-drill', 'dragonize',
      'mega-sol', 'spicy-spray', 'eelevate', 'fire-mane', 'aura-guard'
    ];

    test('Todas as 26 habilidades estão registradas no AbilityRegistry com status FULL', () => {
      for (const slug of ALL_26) {
        const ab = Registry.getAbility(slug);
        assert.ok(ab, 'Habilidade deve existir no registro: ' + slug);
        assert.equal(ab.status, 'FULL', 'Habilidade ' + slug + ' deve ter status FULL');
        assert.ok(['H9', 'H10', 'H11'].includes(ab.phase), 'Habilidade ' + slug + ' deve pertencer a H9, H10 ou H11');
        assert.deepEqual(ab.testFiles, ['tests/battle/abilities-final-26.test.js']);
      }
    });

    test('Todas as 26 habilidades constam na lista de habilidades suportadas em P7.abilityNames', () => {
      for (const slug of ALL_26) {
        assert.ok(C.P7.abilityNames.includes(slug), 'Habilidade ' + slug + ' deve estar em P7.abilityNames');
      }
    });
  });

  // =========================================================================
  // INTEGRAÇÃO REAL E2E — FAMÍLIA H10 (INTERFACE, SESSÃO, MOTOR E PERSISTÊNCIA)
  // =========================================================================

  describe('27. Integração Real E2E — Família H10 (Interface, Sessão, Motor e Persistência)', () => {
    test('E2E Run Away: Interface aciona submitPlayerEscape, motor encerra selvagem com ESCAPED, view renderiza tela de fuga e preserva HP', async () => {
      const runner = makeMon(19, [33], ['normal'], { ability: 'run-away', currentHp: 750, maxHp: 1000 });
      const wild = makeMon(99, [33], ['normal'], { currentHp: 1000, maxHp: 1000 });
      let renderedUiState = null;
      let renderedData = null;

      const mockContainer = {
        innerHTML: '',
        querySelector: () => null,
        querySelectorAll: () => []
      };

      const session = new BattleSessionController({
        playerTeamIds: [19],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C
      });
      session.battleState = {
        turn: 1,
        status: 'IN_PROGRESS',
        player: { team: [runner], activeIndex: 0 },
        enemy: { team: [wild], activeIndex: 0 },
        isTrainerBattle: false
      };
      session.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

      // Escuta mudança de estado
      session.onStateChange((state, data) => {
        renderedUiState = state;
        renderedData = data;
      });

      // Jogador aciona fuga via sessão real
      await session.submitPlayerEscape();

      assert.equal(session.battleState.status, 'ESCAPED', 'Motor encerra encontro com status ESCAPED');
      assert.equal(renderedUiState, BATTLE_UI_STATES.ESCAPED, 'Sessão notifica BATTLE_UI_STATES.ESCAPED');
      assert.equal(session.battleState.player.team[0].currentHp, 750, 'HP e integridade da equipe estritamente preservados');

      // Verifica bloqueio canônico em treinadores
      const trainerState = {
        player: runner,
        enemy: wild,
        isTrainerBattle: true
      };
      const escapeCheck = C.P7.canEscape(trainerState, 'player');
      assert.equal(escapeCheck.canEscape, false, 'Fuga deve ser bloqueada em batalhas de treinador');
      assert.equal(escapeCheck.reason, 'TRAINER_BATTLE');
    });

    test('E2E Ball Fetch: Interface arremessa Pokébola, captura falha, Yamper recolhe primeira bola no fim do turno e previne recuperação duplicada', async () => {
      const yamper = makeMon(835, [33], ['electric'], { ability: 'ball-fetch', item: null });
      const wild = makeMon(99, [33], ['normal'], { maxHp: 500, currentHp: 500, catchRate: 3 });

      const session = new BattleSessionController({
        playerTeamIds: [835],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C
      });
      session.battleState = {
        turn: 1,
        status: 'IN_PROGRESS',
        player: { team: [yamper], activeIndex: 0 },
        enemy: { team: [wild], activeIndex: 0 },
        isTrainerBattle: false
      };
      session.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

      // Arremesso de Ultraball que falha (roll = 255)
      await session.submitPlayerBall('ultraball', 255);

      assert.equal(session.battleState.firstFailedBall, 'ultraball', 'Tipo exato da bola com falha registrado no estado');
      assert.equal(session.battleState.player.team[0].item, 'ultraball', 'Yamper com Ball Fetch recuperou a Ultra Ball');
      assert.equal(session.battleState.ballFetchTriggered, true, 'Flag ballFetchTriggered ativada');

      // Segundo arremesso que também falha: Yamper já possui item e NÃO recolhe novamente
      session.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;
      await session.submitPlayerBall('greatball', 255);
      assert.equal(session.battleState.player.team[0].item, 'ultraball', 'Item recuperado permanece Ultraball e não é duplicado/sobrescrito');
    });

    test('E2E Honey Gather: Pós-vitória real concede Honey no slot de item persistente, respeita chance por nível e impede duplicidade', async () => {
      const combee = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 60, item: null });
      const faintedEnemy = makeMon(99, [33], ['normal'], { currentHp: 0 });

      const session = new BattleSessionController({
        playerTeamIds: [415],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C
      });
      session.battleState = {
        turn: 3,
        status: 'PLAYER_WIN',
        winner: 'player',
        player: { team: [combee], activeIndex: 0 },
        enemy: { team: [faintedEnemy], activeIndex: 0 },
        isTrainerBattle: false,
        honeyGatherRoll: 25 // Nível 60: chance = 5 + 5 * floor(59/10) = 30%. Roll 25 <= 30% -> Sucesso
      };

      await session.handlePostResolutionState();

      assert.equal(session.battleState.player.team[0].item, 'honey', 'Combee deve receber item "honey" no pós-vitória');
      assert.equal(session.battleState.honeyGatherResolved, true, 'honeyGatherResolved marcado para evitar reaplicação');

      // Chamada repetida do pós-resolução não duplica nem adiciona item se slot ocupado
      const previousState = JSON.parse(JSON.stringify(session.battleState));
      await session.handlePostResolutionState();
      assert.equal(session.battleState.player.team[0].item, 'honey', 'Item permanece intacto sem duplicação');
    });

    test('E2E Run Away / Interface: Clique no botão #btnEscape na interface real dispara submitPlayerEscape e view exibe renderEscapedView sem erros', async () => {
      const runner = makeMon(19, [33], ['normal'], { ability: 'run-away' });
      const wildMon = makeMon(99, [33], ['normal']);
      const session = new BattleSessionController({
        playerTeamIds: [19],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C
      });
      session.battleState = {
        turn: 1,
        status: 'IN_PROGRESS',
        player: { team: [runner], activeIndex: 0 },
        enemy: { team: [wildMon], activeIndex: 0 },
        isTrainerBattle: false
      };
      session.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

      let inner = '';
      const mockContainer = {
        get innerHTML() { return inner; },
        set innerHTML(val) { inner = val; },
        querySelector: () => null,
        querySelectorAll: () => []
      };

      const view = new BattleView({
        container: mockContainer,
        sessionController: session
      });

      // Renderiza a interface de batalha ativa para wild battle
      view.renderActiveBattleView(session.battleState, 'AWAITING_PLAYER_ACTION');
      assert.ok(mockContainer.innerHTML.includes('id="btnEscape"'), 'Botão #btnEscape deve estar presente no DOM');
      assert.ok(mockContainer.innerHTML.includes('id="btnThrowBall"'), 'Botão #btnThrowBall deve estar presente no DOM');

      // Chamada direta do renderEscapedView
      view.renderEscapedView({}, session.battleState);
      assert.ok(mockContainer.innerHTML.includes('FUGA BEM-SUCEDIDA!'), 'Tela de fuga deve exibir o badge');
      assert.ok(mockContainer.innerHTML.includes('fa-person-running'), 'Ícone de corrida deve estar presente');
      assert.ok(mockContainer.innerHTML.includes('btnBackToBattle'), 'Botão de voltar à preparação deve estar presente em quick battle');
    });

    test('E2E Run Away / Campaign Lifecycle: Fuga em batalha selvagem limpa wild.active, não registra vitória/derrota/recompensa e permite retorno à campanha', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start(Catalog.DRAFT.slice(0, 6).map(p => p.id));
      const enc = manager.beginWildEncounter('region-1', 0.5);
      assert.equal(enc.ok, true);
      assert.ok(manager.getState().wild.active !== null, 'Encontro selvagem ativo antes da fuga');

      const runner = makeMon(19, [33], ['normal'], { ability: 'run-away', currentHp: 500, maxHp: 500 });
      const wildMon = makeMon(enc.pokemonId, [33], ['normal'], { currentHp: 500, maxHp: 500 });

      const session = new BattleSessionController({
        playerTeamIds: [19],
        enemyTeamIds: [enc.pokemonId],
        engine: Engine,
        battleConstants: C,
        campaignManager: manager,
        metadata: {
          mode: 'CAMPAIGN',
          kind: 'WILD',
          id: enc.pokemonId,
          regionId: 'region-1',
          pointId: enc.pointId
        }
      });
      session.battleState = {
        turn: 1,
        status: 'IN_PROGRESS',
        player: { team: [runner], activeIndex: 0 },
        enemy: { team: [wildMon], activeIndex: 0 },
        isTrainerBattle: false
      };
      session.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

      // Executa fuga via sessão
      await session.submitPlayerEscape();

      assert.equal(session.battleState.status, 'ESCAPED');
      assert.equal(manager.getState().wild.active, null, 'wild.active limpo com sucesso após fuga');
      assert.equal(manager.getState().wild.pendingCapture, null, 'Sem pendência de captura');
      assert.equal(manager.getBadgeCount(), 0, 'Nenhuma insígnia concedida por fuga');
      assert.equal(manager.getState().superTrainer.defeated, false, 'Nenhuma vitória indevida');
    });

    test('E2E Run Away / Exploration: Novo encontro selvagem é iniciado imediatamente após a fuga sem bloqueio RESOLVE_PREVIOUS', () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start(Catalog.DRAFT.slice(0, 6).map(p => p.id));

      // Inicia encontro 1
      const enc1 = manager.beginWildEncounter('region-1', 0.2);
      assert.equal(enc1.ok, true);

      // Fuga limpa o estado
      manager.recordWildEscape('btl_escape_test');
      assert.equal(manager.getState().wild.active, null);

      // Inicia encontro 2 imediatamente sem lock
      const enc2 = manager.beginWildEncounter('region-1', 0.8);
      assert.equal(enc2.ok, true, 'Novo encontro deve iniciar sem bloqueio');
      assert.equal(enc2.resumed, false, 'Novo encontro não é resumo de anterior');
      assert.ok(manager.getState().wild.active !== null);
    });

    test('E2E In-Battle Capture / Single Source of Truth: Arremesso de bola bem-sucedido adiciona mon ao elenco, resolve wild.result = CAUGHT e limpa pendingCapture', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start(Catalog.DRAFT.slice(0, 6).map(p => p.id));
      const enc = manager.beginWildEncounter('region-1', 0.4);
      assert.equal(enc.ok, true);
      const targetId = enc.pokemonId;
      assert.ok(!manager.getRosterIds().includes(targetId), 'Pokémon ainda não pertence ao elenco');

      const attacker = makeMon(1, [33], ['grass'], { currentHp: 500, maxHp: 500 });
      const wildTarget = makeMon(targetId, [33], ['normal'], { currentHp: 10, maxHp: 100, catchRate: 255 });

      const session = new BattleSessionController({
        playerTeamIds: [1],
        enemyTeamIds: [targetId],
        engine: Engine,
        battleConstants: C,
        campaignManager: manager,
        metadata: {
          mode: 'CAMPAIGN',
          kind: 'WILD',
          id: targetId,
          regionId: 'region-1',
          pointId: enc.pointId
        }
      });
      session.battleState = {
        turn: 1,
        status: 'IN_PROGRESS',
        player: { team: [attacker], activeIndex: 0 },
        enemy: { team: [wildTarget], activeIndex: 0 },
        isTrainerBattle: false
      };
      session.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

      // Arremesso de Master Ball (captura garantida)
      await session.submitPlayerBall('masterball', 0);

      assert.equal(session.battleState.status, 'PLAYER_WIN');
      assert.ok(session.battleState.capturedPokemon);
      assert.equal(session.battleState.capturedPokemon.id, targetId);

      // Fonte única de verdade: wild.result é CAUGHT
      const wildState = manager.getState().wild;
      assert.equal(wildState.active, null, 'wild.active limpo');
      assert.equal(wildState.pendingCapture, null, 'pendingCapture deve ser estritamente null (sem duplicidade)');
      assert.equal(wildState.result.status, 'CAUGHT', 'Status de captura registrado no resultado');
      assert.equal(wildState.result.pokemonId, targetId);

      // Adicionado ao elenco
      assert.ok(manager.getRosterIds().includes(targetId), 'Pokémon capturado adicionado ao elenco da campanha');

      // Acknowledge limpa o resultado
      manager.acknowledgeWildResult();
      assert.equal(manager.getState().wild.result, null);
    });

    test('E2E In-Battle Capture / Protection: Captura duplicada ou com limite de ponto esgotado não adiciona mon ao elenco', () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start(Catalog.DRAFT.slice(0, 6).map(p => p.id));
      const enc = manager.beginWildEncounter('region-1', 0.5);
      assert.equal(enc.ok, true);

      // Mon já adicionado ao elenco (simulando espécie já capturada)
      manager.data.wild.capturedIds.push(enc.pokemonId);
      manager.data.wild.captureRegions[enc.pokemonId] = 'region-1';
      manager.data.wild.capturePoints[enc.pokemonId] = enc.pointId;
      assert.ok(manager.getRosterIds().includes(enc.pokemonId));

      const res = manager.recordBattle({
        battleId: 'btl_dup_test',
        kind: 'WILD',
        id: enc.pokemonId,
        opponentPokemonId: enc.pokemonId,
        winner: 'player',
        captured: true,
        ballType: 'pokeball'
      });

      assert.equal(res.processed, true);
      assert.equal(manager.getState().wild.result.status, 'FLED');
      assert.equal(manager.getState().wild.result.reason, 'DUPLICATE');
      assert.equal(manager.getState().wild.pendingCapture, null);
    });

    test('E2E Honey Gather / Persistent Storage & Reload: Vitória real persiste Honey no CampaignManager, sobrevive a reload e não duplica', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start(Catalog.DRAFT.slice(0, 6).map(p => p.id));

      // Adiciona Combee (#415) aos capturados
      manager.data.wild.capturedIds.push(415);
      manager.save('COMBEE_JOINED');
      assert.ok(manager.getRosterIds().includes(415));
      assert.equal(manager.getBattlePreference(415).item, null);

      const combee = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 50, item: null });
      const faintedWild = makeMon(99, [33], ['normal'], { currentHp: 0 });

      const session = new BattleSessionController({
        playerTeamIds: [415],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C,
        campaignManager: manager,
        metadata: {
          mode: 'CAMPAIGN',
          kind: 'WILD',
          id: 99
        }
      });
      session.battleState = {
        turn: 2,
        status: 'PLAYER_WIN',
        winner: 'player',
        player: { team: [combee], activeIndex: 0 },
        enemy: { team: [faintedWild], activeIndex: 0 },
        isTrainerBattle: false,
        honeyGatherRoll: 5 // Roll 5 <= chance -> Coleta Honey
      };

      // Executa pós-resolução
      await session.handlePostResolutionState();

      // Verifica atribuição em batalha e persistência no CampaignManager
      assert.equal(session.battleState.player.team[0].item, 'honey');
      assert.equal(manager.getBattlePreference(415).item, 'honey', 'Honey persistido no CampaignManager');

      // Simula recarregamento da campanha via Store
      const reloadedManager = new CampaignManager(Store);
      assert.equal(reloadedManager.getBattlePreference(415).item, 'honey', 'Honey persiste após recarregar campanha');

      // Segunda batalha: Combee já possui Honey equipado
      combee.item = 'honey';
      session.battleState.honeyGatherResolved = false;
      session.battleState.honeyGatherRoll = 1;
      await session.handlePostResolutionState();

      // Confirma ausência de duplicação
      assert.equal(session.battleState.player.team[0].item, 'honey', 'Item permanece honey sem duplicação');
      assert.equal(reloadedManager.getBattlePreference(415).item, 'honey');
    });

    test('E2E Campaign Contract: Pokébolas não possuem inventário consumível na campanha', () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start(Catalog.DRAFT.slice(0, 6).map(p => p.id));
      const state = manager.getState();

      // O modelo canônico da campanha não possui inventário numérico de Pokébolas
      assert.equal(state.balls, undefined, 'Campanha não possui inventário paralelo de Pokébolas');
      assert.equal(state.pokeballs, undefined, 'Pokébolas não são consumíveis numéricos');
    });
  });

  describe('28. HOTFIX H10 — Preservação Estrita de Preferências pós-Honey Gather (10 Cenários Obrigatórios)', () => {
    test('1. Pokémon com habilidade natural configurada é preservada após Honey Gather', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      manager.data.wild.capturedIds.push(415);
      manager.save('INIT');

      manager.setBattlePreference(415, { ability: 'honey-gather', item: null });
      const combee = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 50, item: null });
      const session = new BattleSessionController({
        playerTeamIds: [415],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C,
        campaignManager: manager,
        metadata: { mode: 'CAMPAIGN', kind: 'WILD', id: 99 }
      });
      session.battleState = {
        turn: 1,
        status: 'PLAYER_WIN',
        winner: 'player',
        player: { team: [combee], activeIndex: 0 },
        enemy: { team: [makeMon(99)], activeIndex: 0 },
        isTrainerBattle: false,
        honeyGatherRoll: 5
      };
      await session.handlePostResolutionState();

      const pref = manager.getBattlePreference(415);
      assert.equal(pref.ability, 'honey-gather', 'Habilidade natural preservada');
      assert.equal(pref.item, 'honey', 'Item atualizado para honey');
    });

    test('2. Pokémon com tipo Tera selecionado é estritamente preservado', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      manager.data.wild.capturedIds.push(415);
      manager.save('INIT');

      manager.setBattlePreference(415, { ability: 'honey-gather', item: null, teraType: 'flying', specialMechanic: 'tera' });
      const combee = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 50, item: null });
      const session = new BattleSessionController({
        playerTeamIds: [415],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C,
        campaignManager: manager,
        metadata: { mode: 'CAMPAIGN', kind: 'WILD', id: 99 }
      });
      session.battleState = {
        turn: 1,
        status: 'PLAYER_WIN',
        winner: 'player',
        player: { team: [combee], activeIndex: 0 },
        enemy: { team: [makeMon(99)], activeIndex: 0 },
        isTrainerBattle: false,
        honeyGatherRoll: 5
      };
      await session.handlePostResolutionState();

      const pref = manager.getBattlePreference(415);
      assert.equal(pref.teraType, 'flying', 'teraType deve ser estritamente preservado');
      assert.equal(pref.item, 'honey');
    });

    test('3. Pokémon com specialMechanic configurada é estritamente preservada', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      manager.data.wild.capturedIds.push(415);
      manager.save('INIT');

      manager.setBattlePreference(415, { ability: 'honey-gather', item: null, specialMechanic: 'dynamax' });
      const combee = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 50, item: null });
      const session = new BattleSessionController({
        playerTeamIds: [415],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C,
        campaignManager: manager,
        metadata: { mode: 'CAMPAIGN', kind: 'WILD', id: 99 }
      });
      session.battleState = {
        turn: 1,
        status: 'PLAYER_WIN',
        winner: 'player',
        player: { team: [combee], activeIndex: 0 },
        enemy: { team: [makeMon(99)], activeIndex: 0 },
        isTrainerBattle: false,
        honeyGatherRoll: 5
      };
      await session.handlePostResolutionState();

      const pref = manager.getBattlePreference(415);
      assert.equal(pref.specialMechanic, 'dynamax', 'specialMechanic deve ser preservada');
      assert.equal(pref.item, 'honey');
    });

    test('4. Pokémon sem preferências anteriores recebe loadout legal com habilidade natural padrão e Honey', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      manager.data.wild.capturedIds.push(415);
      manager.save('INIT');

      // Sem preferência prévia
      delete manager.data.battlePreferences[415];
      manager.save('CLEAR_PREF');

      const combee = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 50, item: null });
      const session = new BattleSessionController({
        playerTeamIds: [415],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C,
        campaignManager: manager,
        metadata: { mode: 'CAMPAIGN', kind: 'WILD', id: 99 }
      });
      session.battleState = {
        turn: 1,
        status: 'PLAYER_WIN',
        winner: 'player',
        player: { team: [combee], activeIndex: 0 },
        enemy: { team: [makeMon(99)], activeIndex: 0 },
        isTrainerBattle: false,
        honeyGatherRoll: 5
      };
      await session.handlePostResolutionState();

      const pref = manager.getBattlePreference(415);
      assert.equal(pref.ability, 'honey-gather', 'Habilidade default válida atribuída');
      assert.equal(pref.item, 'honey', 'Honey persistido');
    });

    test('5. Pokémon cuja habilidade foi temporariamente alterada em combate (Trace/Transform) não sobrescreve preferência canônica', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      manager.data.wild.capturedIds.push(415);
      manager.save('INIT');

      manager.setBattlePreference(415, { ability: 'honey-gather', item: null, teraType: 'bug', specialMechanic: 'tera' });
      // Em batalha, habilidade alterada temporariamente para 'intimidate'
      const combee = makeMon(415, [33], ['bug', 'flying'], {
        ability: 'intimidate',
        originalAbility: 'honey-gather',
        level: 50,
        item: null
      });
      const session = new BattleSessionController({
        playerTeamIds: [415],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C,
        campaignManager: manager,
        metadata: { mode: 'CAMPAIGN', kind: 'WILD', id: 99 }
      });
      session.battleState = {
        turn: 1,
        status: 'PLAYER_WIN',
        winner: 'player',
        player: { team: [combee], activeIndex: 0 },
        enemy: { team: [makeMon(99)], activeIndex: 0 },
        isTrainerBattle: false,
        honeyGatherRoll: 5
      };
      await session.handlePostResolutionState();

      const pref = manager.getBattlePreference(415);
      assert.equal(pref.ability, 'honey-gather', 'Habilidade salva NÃO pode ser a temporária (intimidate)');
      assert.equal(pref.item, 'honey');
      assert.equal(pref.teraType, 'bug');
      assert.equal(pref.specialMechanic, 'tera');
    });

    test('6. Pokémon com item preexistente não recebe Honey nem sobrescreve o item existente', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      manager.data.wild.capturedIds.push(415);
      manager.save('INIT');

      manager.setBattlePreference(415, { ability: 'honey-gather', item: 'focus-sash' });
      const combee = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 50, item: 'focus-sash' });
      const session = new BattleSessionController({
        playerTeamIds: [415],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C,
        campaignManager: manager,
        metadata: { mode: 'CAMPAIGN', kind: 'WILD', id: 99 }
      });
      session.battleState = {
        turn: 1,
        status: 'PLAYER_WIN',
        winner: 'player',
        player: { team: [combee], activeIndex: 0 },
        enemy: { team: [makeMon(99)], activeIndex: 0 },
        isTrainerBattle: false,
        honeyGatherRoll: 5
      };
      await session.handlePostResolutionState();

      assert.equal(combee.item, 'focus-sash', 'Item de combate inalterado');
      assert.equal(manager.getBattlePreference(415).item, 'focus-sash', 'Item de preferência inalterado');
    });

    test('7. Pokémon com preferência incompatível não perde configurações silenciosamente (reverte item de combate)', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);

      // Fake mon não pertencente ao elenco (id 9999)
      const fakeMon = makeMon(9999, [33], ['normal'], { ability: 'honey-gather', level: 50, item: 'honey' });
      const session = new BattleSessionController({
        playerTeamIds: [9999],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C,
        campaignManager: manager,
        metadata: { mode: 'CAMPAIGN', kind: 'WILD', id: 99 }
      });
      session.battleState = {
        turn: 1,
        status: 'PLAYER_WIN',
        winner: 'player',
        player: { team: [fakeMon], activeIndex: 0 },
        enemy: { team: [makeMon(99)], activeIndex: 0 },
        isTrainerBattle: false,
        honeyGatherResolved: true
      };
      await session.handlePostResolutionState();

      assert.equal(fakeMon.item, null, 'Reverte item de combate se salvamento falhar (mantém coerência)');
    });

    test('8. Recarregamento do CampaignManager preserva habilidade, tipo Tera, mecânica especial e Honey quando elegíveis', () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      manager.data.wild.capturedIds.push(415);
      manager.save('INIT');

      manager.setBattlePreference(415, { ability: 'honey-gather', item: 'honey', teraType: 'grass', specialMechanic: 'tera' });

      // Recarrega instância nova através do Store
      const reloaded = new CampaignManager(Store);
      const pref = reloaded.getBattlePreference(415);
      assert.equal(pref.ability, 'honey-gather', 'Habilidade sobrevive a reload');
      assert.equal(pref.item, 'honey', 'Honey sobrevive a reload');
      assert.equal(pref.teraType, 'grass', 'Tipo Tera sobrevive a reload');
      assert.equal(pref.specialMechanic, 'tera', 'Mecânica especial sobrevive a reload');
    });

    test('9. Segunda batalha não duplica o item nem altera preferência existente', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      manager.data.wild.capturedIds.push(415);
      manager.save('INIT');

      manager.setBattlePreference(415, { ability: 'honey-gather', item: 'honey', teraType: 'grass', specialMechanic: 'tera' });

      const combee = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 50, item: 'honey' });
      const session = new BattleSessionController({
        playerTeamIds: [415],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C,
        campaignManager: manager,
        metadata: { mode: 'CAMPAIGN', kind: 'WILD', id: 99 }
      });
      session.battleState = {
        turn: 1,
        status: 'PLAYER_WIN',
        winner: 'player',
        player: { team: [combee], activeIndex: 0 },
        enemy: { team: [makeMon(99)], activeIndex: 0 },
        isTrainerBattle: false,
        honeyGatherRoll: 1
      };
      await session.handlePostResolutionState();

      assert.equal(combee.item, 'honey', 'Item de combate continua sendo exatamente um honey');
      const pref = manager.getBattlePreference(415);
      assert.equal(pref.item, 'honey');
      assert.equal(pref.teraType, 'grass');
    });

    test('10. Outro Pokémon do elenco não sofre alterações ao persistir Honey Gather', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      manager.data.wild.capturedIds.push(415);
      manager.save('INIT');

      // Configura Pikachu (25) com loadout personalizado completo
      manager.setBattlePreference(25, { ability: 'static', item: 'leftovers', teraType: 'electric', specialMechanic: 'tera' });
      manager.setBattlePreference(415, { ability: 'honey-gather', item: null });

      const combee = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 50, item: null });
      const pikachu = makeMon(25, [33], ['electric'], { ability: 'static', level: 50, item: 'leftovers' });
      const session = new BattleSessionController({
        playerTeamIds: [415, 25],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C,
        campaignManager: manager,
        metadata: { mode: 'CAMPAIGN', kind: 'WILD', id: 99 }
      });
      session.battleState = {
        turn: 1,
        status: 'PLAYER_WIN',
        winner: 'player',
        player: { team: [combee, pikachu], activeIndex: 0 },
        enemy: { team: [makeMon(99)], activeIndex: 0 },
        isTrainerBattle: false,
        honeyGatherRoll: 5
      };
      await session.handlePostResolutionState();

      assert.equal(manager.getBattlePreference(415).item, 'honey', 'Combee recebeu honey');

      // Pikachu deve estar 100% inalterado
      const pikaPref = manager.getBattlePreference(25);
      assert.equal(pikaPref.ability, 'static', 'Habilidade do outro Pokémon intacta');
      assert.equal(pikaPref.item, 'leftovers', 'Item do outro Pokémon intacto');
      assert.equal(pikaPref.teraType, 'electric', 'Tera do outro Pokémon intacto');
      assert.equal(pikaPref.specialMechanic, 'tera', 'Mecânica do outro Pokémon intacta');
    });
  });

  describe('29. HOTFIX H10 — Smoke Test da Campanha e Interface Real (8 Fluxos Chave)', () => {
    test('Fluxo 1: Fuga de encontro selvagem e retorno à exploração', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      const enc = manager.beginWildEncounter('region-1', 0.5);
      assert.ok(enc.ok, 'Encontro iniciado');
      assert.ok(manager.getState().wild.active, 'Encontro ativo registrado');

      const mockContainer = {
        innerHTML: '',
        querySelector: sel => {
          if (sel === '#btnCampaignReturn') return { addEventListener: (ev, fn) => { fn(); } };
          return null;
        },
        querySelectorAll: () => []
      };
      const view = new BattleView({
        container: mockContainer,
        battleConstants: C,
        campaignManager: manager
      });
      view.sessionController = {
        sessionOptions: { metadata: { mode: 'CAMPAIGN', kind: 'WILD' } },
        leaveBattle: () => {}
      };

      // Renderiza tela de fuga
      view.renderEscapedView({}, { isTrainerBattle: false });
      assert.match(mockContainer.innerHTML, /FUGA BEM-SUCEDIDA/);
      assert.match(mockContainer.innerHTML, /btnCampaignReturn/);

      // Retorno à campanha
      view.returnToCampaign();
      assert.equal(manager.getState().wild.active, null, 'Encontro selvagem limpo com sucesso');
    });

    test('Fluxo 2: Novo encontro selvagem imediatamente após fuga', () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      manager.beginWildEncounter('region-1', 0.5);
      manager.recordWildEscape('btl_escape_flow');

      const secondEnc = manager.beginWildEncounter('region-1', 0.5);
      assert.equal(secondEnc.ok, true, 'Segundo encontro iniciado imediatamente sem bloqueio');
      assert.ok(secondEnc.pokemonId);
    });

    test('Fluxo 3: Captura dentro da batalha persiste no elenco e registra CAUGHT', () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      const enc = manager.beginWildEncounter('region-1', 0.5);
      const targetId = enc.pokemonId;

      const res = manager.recordBattle({
        battleId: 'btl_in_battle_catch',
        kind: 'WILD',
        id: targetId,
        opponentPokemonId: targetId,
        winner: 'player',
        captured: true,
        ballType: 'great-ball'
      });

      assert.equal(res.processed, true);
      assert.equal(manager.getState().wild.result.status, 'CAUGHT');
      assert.equal(manager.getState().wild.result.ball, 'great-ball');
      assert.ok(manager.getRosterIds().includes(targetId), 'Espécie capturada adicionada ao elenco');
    });

    test('Fluxo 4: Ausência de segundo minigame quando Pokémon já foi capturado em combate', () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      const enc = manager.beginWildEncounter('region-1', 0.5);

      manager.recordBattle({
        battleId: 'btl_no_second_game',
        kind: 'WILD',
        id: enc.pokemonId,
        opponentPokemonId: enc.pokemonId,
        winner: 'player',
        captured: true,
        ballType: 'pokeball'
      });

      // pendingCapture DEVE ser null para não disparar tela de minigame adicional
      assert.equal(manager.getState().wild.pendingCapture, null, 'pendingCapture estritamente null');
    });

    test('Fluxo 5: Captura tradicional após vitória por nocaute', () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      const enc = manager.beginWildEncounter('region-1', 0.5);

      manager.recordBattle({
        battleId: 'btl_ko_catch',
        kind: 'WILD',
        id: enc.pokemonId,
        opponentPokemonId: enc.pokemonId,
        winner: 'player',
        captured: false // Nocaute sem captura em combate
      });

      // Deve oferecer minigame de captura tradicional
      assert.equal(manager.getState().wild.pendingCapture.pokemonId, enc.pokemonId, 'pendingCapture disponibilizado para captura tradicional pós-nocaute');
    });

    test('Fluxo 6: Ball Fetch após uma captura malsucedida', async () => {
      const yamper = makeMon(835, [33], ['electric'], { ability: 'ball-fetch', item: null });
      const wild = makeMon(99, [33], ['normal'], { maxHp: 500, currentHp: 500, catchRate: 3 });

      const session = new BattleSessionController({
        playerTeamIds: [835],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C
      });
      session.battleState = {
        turn: 1,
        status: 'IN_PROGRESS',
        player: { team: [yamper], activeIndex: 0 },
        enemy: { team: [wild], activeIndex: 0 },
        isTrainerBattle: false
      };
      session.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

      await session.submitPlayerBall('dive-ball', 255);
      assert.equal(session.battleState.player.team[0].item, 'dive-ball', 'Yamper recuperou a primeira Dive Ball com falha');
    });

    test('Fluxo 7: Honey Gather após vitória real na sessão', async () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      manager.data.wild.capturedIds.push(415);
      manager.save('INIT');

      const combee = makeMon(415, [33], ['bug', 'flying'], { ability: 'honey-gather', level: 50, item: null });
      const session = new BattleSessionController({
        playerTeamIds: [415],
        enemyTeamIds: [99],
        engine: Engine,
        battleConstants: C,
        campaignManager: manager,
        metadata: { mode: 'CAMPAIGN', kind: 'WILD', id: 99 }
      });
      session.battleState = {
        turn: 1,
        status: 'PLAYER_WIN',
        winner: 'player',
        player: { team: [combee], activeIndex: 0 },
        enemy: { team: [makeMon(99)], activeIndex: 0 },
        isTrainerBattle: false,
        honeyGatherRoll: 5
      };
      await session.handlePostResolutionState();

      assert.equal(session.battleState.player.team[0].item, 'honey');
      assert.equal(manager.getBattlePreference(415).item, 'honey');
    });

    test('Fluxo 8: Recarregamento do save com todas as configurações preservadas', () => {
      memoryStore.clear();
      const manager = new CampaignManager(Store);
      manager.start([25, ...Catalog.DRAFT.slice(0, 5).map(p => p.id)]);
      manager.data.wild.capturedIds.push(415);
      manager.save('INIT');

      manager.setBattlePreference(415, { ability: 'honey-gather', item: 'honey', teraType: 'electric', specialMechanic: 'tera' });

      const reloaded = new CampaignManager(Store);
      const pref = reloaded.getBattlePreference(415);
      assert.equal(pref.ability, 'honey-gather');
      assert.equal(pref.item, 'honey');
      assert.equal(pref.teraType, 'electric');
      assert.equal(pref.specialMechanic, 'tera');
      assert.ok(reloaded.getRosterIds().includes(415));
    });
  });

});
