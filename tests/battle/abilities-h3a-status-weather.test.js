const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const mon = (id, ids = [33, 107], extra = {}) => ({
  id,
  name: 'test-mon-' + id,
  types: ['normal'],
  hp: 1000,
  maxHp: 1000,
  currentHp: 1000,
  attack: 100,
  defense: 100,
  specialAttack: 100,
  specialDefense: 100,
  speed: 100,
  moves: ids.map(move),
  ...extra
});

const act = (id, extra = {}) => ({
  type: 'MOVE',
  moveId: id,
  accuracyRoll: 1,
  damageRoll: 100,
  criticalRoll: 24,
  secondaryEffectRoll: 100,
  ...extra
});

const battle = (a = {}, b = {}, idsA = [33, 107], idsB = [33, 107]) => {
  const s = E.createBattle(
    mon(1, idsA, { speed: 200, ...a }),
    mon(2, idsB, { speed: 50, ...b })
  );
  if (a.abilitySuppressed) s.player.abilitySuppressed = true;
  if (b.abilitySuppressed) s.enemy.abilitySuppressed = true;
  return s;
};

const turn = (s, id = 33, extra = {}, enemy = act(107)) => E.resolveTurn(s, {
  player: act(id, extra),
  enemy
});

// Hydration Tests
test('Hydration: sob chuva (Rain), cura status primário (Burn) no final do turno', () => {
  const s = battle({ ability: 'hydration', statusCondition: 'burn' }, {});
  s.weather = { id: 'rain', turns: 5 };
  const res = turn(s, 107);
  assert.equal(res.state.player.statusCondition, null);
  assert.ok(res.events.some(e => e.type === 'STATUS_CURED' && e.reason === 'HYDRATION'));
});

test('Hydration: sob chuva (Rain), cura Poison / Toxic e zera estágios', () => {
  const s = battle({ ability: 'hydration', statusCondition: 'toxic', toxicStage: 3 }, {});
  s.weather = { id: 'rain', turns: 5 };
  const res = turn(s, 107);
  assert.equal(res.state.player.statusCondition, null);
  assert.equal(res.state.player.toxicStage, 0);
});

test('Hydration: sob chuva (Rain), cura Sleep e zera sleepTurns', () => {
  const s = battle({ ability: 'hydration', statusCondition: 'sleep', sleepTurns: 3 }, {});
  s.weather = { id: 'rain', turns: 5 };
  const res = turn(s, 107);
  assert.equal(res.state.player.statusCondition, null);
  assert.equal(res.state.player.sleepTurns, 0);
});

test('Hydration: sob clima sem chuva (Sun / Clear), NÃO cura status', () => {
  const s = battle({ ability: 'hydration', statusCondition: 'paralysis' }, {});
  s.weather = { id: 'sun', turns: 5 };
  const res = turn(s, 107);
  assert.equal(res.state.player.statusCondition, 'paralysis');
});

test('Hydration: Cloud Nine / Air Lock suprime a chuva e impede ativação', () => {
  const s = battle({ ability: 'hydration', statusCondition: 'burn' }, { ability: 'cloud-nine' });
  s.weather = { id: 'rain', turns: 5 };
  const res = turn(s, 107);
  assert.equal(res.state.player.statusCondition, 'burn');
});

test('Hydration: supressão desativa Hydration', () => {
  const s = battle({ ability: 'hydration', abilitySuppressed: true, statusCondition: 'burn' }, {});
  s.weather = { id: 'rain', turns: 5 };
  const res = turn(s, 107);
  assert.equal(res.state.player.statusCondition, 'burn');
});

// Leaf Guard Tests
test('Leaf Guard: sob sol (Sun), portador é imune a receber status (Thunder Wave #86 falha)', () => {
  // Move 78 is Stun Spore (grass, status: paralysis) or Thunder Wave (if cataloged)
  // Let's use move 78 (stun-spore) or 92 (toxic)
  const s = battle({}, { ability: 'leaf-guard' }, [92, 107], [107]);
  s.weather = { id: 'sun', turns: 5 };
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Leaf Guard: sob clima sem sol, status pode ser aplicado normalmente', () => {
  const s = battle({}, { ability: 'leaf-guard' }, [92, 107], [107]);
  s.weather = null;
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, 'toxic');
});

test('Leaf Guard: Rest (#156) falha sob sol para portador de Leaf Guard', () => {
  const s = battle({ ability: 'leaf-guard', hp: 1000, maxHp: 1000, currentHp: 500 }, {}, [156, 107], [107]);
  s.weather = { id: 'sun', turns: 5 };
  const res = turn(s, 156);
  assert.equal(res.state.player.statusCondition, null);
  assert.equal(res.state.player.currentHp, 500); // Não curou
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'REST_NOT_NEEDED'));
});

test('Leaf Guard: NÃO cura status já existente aplicado antes do sol', () => {
  const s = battle({ ability: 'leaf-guard', statusCondition: 'burn' }, {});
  s.weather = { id: 'sun', turns: 5 };
  const res = turn(s, 107);
  assert.equal(res.state.player.statusCondition, 'burn');
});

test('Leaf Guard: Mold Breaker no atacante aplica status através de Leaf Guard sob sol', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'leaf-guard' }, [92, 107], [107]);
  s.weather = { id: 'sun', turns: 5 };
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, 'toxic');
});

test('Leaf Guard: supressão desativa a proteção de Leaf Guard', () => {
  const s = battle({}, { ability: 'leaf-guard', abilitySuppressed: true }, [92, 107], [107]);
  s.weather = { id: 'sun', turns: 5 };
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, 'toxic');
});

// Early Bird Tests
test('Early Bird: sono com duração 2 acorda imediatamente e ataca no mesmo turno', () => {
  // Com sleepTurns = 2, Early Bird desconta 2 -> 0 e ataca imediatamente com Tackle #33
  const s = battle({ ability: 'early-bird', statusCondition: 'sleep', sleepTurns: 2 }, {});
  const initialEnemyHp = s.enemy.currentHp;
  const res = turn(s, 33);
  assert.equal(res.state.player.statusCondition, null);
  assert.equal(res.state.player.sleepTurns, 0);
  assert.ok(res.events.some(e => e.type === 'STATUS_CURED' && e.reason === 'WOKE_UP'));
  assert.ok(res.state.enemy.currentHp < initialEnemyHp); // Tackle causou dano no mesmo turno!
});

test('Early Bird: sono com duração 1 acorda imediatamente e ataca no mesmo turno', () => {
  const s = battle({ ability: 'early-bird', statusCondition: 'sleep', sleepTurns: 1 }, {});
  const initialEnemyHp = s.enemy.currentHp;
  const res = turn(s, 33);
  assert.equal(res.state.player.statusCondition, null);
  assert.ok(res.state.enemy.currentHp < initialEnemyHp);
});

test('Early Bird: sono com duração 3 reduz para 1 (imobilizado no turno 1), acorda e ataca no turno 2', () => {
  const s = battle({ ability: 'early-bird', statusCondition: 'sleep', sleepTurns: 3 }, {});
  const initialEnemyHp = s.enemy.currentHp;
  // Turno 1: 3 - 2 = 1 turno restante (imobilizado)
  const res1 = turn(s, 33);
  assert.equal(res1.state.player.statusCondition, 'sleep');
  assert.equal(res1.state.player.sleepTurns, 1);
  assert.equal(res1.state.enemy.currentHp, initialEnemyHp);

  // Turno 2: 1 - 2 <= 0 -> acorda e ataca
  const res2 = turn(res1.state, 33);
  assert.equal(res2.state.player.statusCondition, null);
  assert.ok(res2.state.enemy.currentHp < initialEnemyHp);
});

test('Early Bird: supressão faz o sono descontar apenas 1 turno normalmente', () => {
  const s = battle({ ability: 'early-bird', abilitySuppressed: true, statusCondition: 'sleep', sleepTurns: 2 }, {});
  const res = turn(s, 33);
  assert.equal(res.state.player.statusCondition, 'sleep');
  assert.equal(res.state.player.sleepTurns, 1);
});

// Poison Heal Tests
test('Poison Heal: portador envenenado (poison) recupera 1/8 do maxHp no fim do turno', () => {
  const s = battle({ ability: 'poison-heal', statusCondition: 'poison', hp: 1000, maxHp: 1000, currentHp: 500 }, {});
  const res = turn(s, 107);
  assert.equal(res.state.player.currentHp, 625); // 500 + 125 (1/8 de 1000)
  assert.ok(res.events.some(e => e.type === 'HP_HEALED' && e.reason === 'poison-heal' && e.healedAmount === 125));
  assert.ok(!res.events.some(e => e.type === 'STATUS_DAMAGE' && e.target === 'player'));
});

test('Poison Heal: portador gravemente envenenado (toxic) recupera 1/8 do maxHp no fim do turno', () => {
  const s = battle({ ability: 'poison-heal', statusCondition: 'toxic', toxicStage: 3, hp: 1000, maxHp: 1000, currentHp: 600 }, {});
  const res = turn(s, 107);
  assert.equal(res.state.player.currentHp, 725); // 600 + 125
  assert.ok(!res.events.some(e => e.type === 'STATUS_DAMAGE' && e.target === 'player'));
});

test('Poison Heal: com HP cheio, não cura acima de maxHp e não sofre dano', () => {
  const s = battle({ ability: 'poison-heal', statusCondition: 'poison', hp: 1000, maxHp: 1000, currentHp: 1000 }, {});
  const res = turn(s, 107);
  assert.equal(res.state.player.currentHp, 1000);
  assert.ok(!res.events.some(e => e.type === 'STATUS_DAMAGE' && e.target === 'player'));
});

test('Poison Heal: Burn ainda causa dano normalmente (não afeta queimadura)', () => {
  const s = battle({ ability: 'poison-heal', statusCondition: 'burn', hp: 1000, maxHp: 1000, currentHp: 1000 }, {});
  const res = turn(s, 107);
  assert.ok(res.state.player.currentHp < 1000);
  assert.ok(res.events.some(e => e.type === 'STATUS_DAMAGE' && e.target === 'player'));
});

test('Poison Heal: supressão desativa Poison Heal e causa dano de veneno', () => {
  const s = battle({ ability: 'poison-heal', abilitySuppressed: true, statusCondition: 'poison', hp: 1000, maxHp: 1000, currentHp: 1000 }, {});
  const res = turn(s, 107);
  assert.ok(res.state.player.currentHp < 1000);
  assert.ok(res.events.some(e => e.type === 'STATUS_DAMAGE' && e.target === 'player'));
});

// Bad Dreams Tests
test('Bad Dreams: adversário dormindo sofre 1/8 do maxHp de dano no fim do turno', () => {
  const s = battle({ ability: 'bad-dreams' }, { statusCondition: 'sleep', sleepTurns: 2, hp: 1000, maxHp: 1000, currentHp: 1000 });
  const res = turn(s, 107);
  assert.equal(res.state.enemy.currentHp, 875); // 1000 - 125 (1/8 de 1000)
  assert.ok(res.events.some(e => e.type === 'STATUS_DAMAGE' && e.statusCondition === 'bad-dreams' && e.damage === 125));
});

test('Bad Dreams: adversário acordado ou com outro status (Burn) NÃO sofre dano', () => {
  const s = battle({ ability: 'bad-dreams' }, { statusCondition: 'burn', hp: 1000, maxHp: 1000, currentHp: 1000 });
  const res = turn(s, 107);
  // Sofre dano apenas do próprio Burn (1/16 de 1000 = 62)
  assert.equal(res.state.enemy.currentHp, 938);
  assert.ok(!res.events.some(e => e.statusCondition === 'bad-dreams'));
});

test('Bad Dreams: adversário com Magic Guard é imune a Bad Dreams', () => {
  const s = battle({ ability: 'bad-dreams' }, { ability: 'magic-guard', statusCondition: 'sleep', sleepTurns: 2, hp: 1000, maxHp: 1000, currentHp: 1000 });
  const res = turn(s, 107);
  assert.equal(res.state.enemy.currentHp, 1000);
});

test('Bad Dreams: supressão desativa Bad Dreams', () => {
  const s = battle({ ability: 'bad-dreams', abilitySuppressed: true }, { statusCondition: 'sleep', sleepTurns: 2, hp: 1000, maxHp: 1000, currentHp: 1000 });
  const res = turn(s, 107);
  assert.equal(res.state.enemy.currentHp, 1000);
});
