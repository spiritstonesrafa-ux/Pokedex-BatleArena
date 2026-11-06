const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const customMoves = {
  173: { id: 173, name: 'snore', type: 'normal', power: 50, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15, currentPp: 15 },
  214: { id: 214, name: 'sleep-talk', type: 'normal', power: null, accuracy: null, priority: 0, damageClass: 'status', pp: 10, maxPp: 10, currentPp: 10 },
  138: { id: 138, name: 'dream-eater', type: 'psychic', power: 100, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15, currentPp: 15 },
  165: { id: 165, name: 'struggle', type: 'normal', power: 50, accuracy: null, priority: 0, damageClass: 'physical', pp: 1, maxPp: 1, currentPp: 1 }
};

const move = id => customMoves[id] || C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

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
  gender: 'M',
  statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
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

// Move IDs:
// 33: Tackle (normal, physical)
// 173: Snore (requires sleep)
// 214: Sleep Talk (requires sleep)
// 138: Dream Eater (requires target asleep)
// 92: Toxic
// 77: Poison Powder
// 261: Will-O-Wisp
// 86: Thunder Wave
// 147: Spore
// 398: Poison Jab (poison, physical)
// 107: Minimize

// -------------------------------------------------------------
// COMATOSE
// -------------------------------------------------------------
test('Comatose: age livremente a cada turno sem imobilização por sono', () => {
  const s = battle({ ability: 'comatose' }, {});
  const res = turn(s, 33);
  assert.ok(res.events.some(e => e.type === 'DAMAGE_APPLIED'));
  assert.ok(!res.events.some(e => e.type === 'STATUS_IMMOBILIZED'));
});

test('Comatose: considerado dormindo para uso de Snore (#173)', () => {
  const s = battle({ ability: 'comatose' }, {}, [173, 33]);
  const res = turn(s, 173);
  assert.ok(res.events.some(e => e.type === 'DAMAGE_APPLIED'));
  assert.ok(!res.events.some(e => e.reason === 'REQUIRES_SLEEP'));
});

test('Comatose: considerado dormindo para uso de Sleep Talk (#214)', () => {
  const s = battle({ ability: 'comatose' }, {}, [214, 33]);
  const res = turn(s, 214);
  assert.ok(res.events.some(e => e.type === 'DAMAGE_APPLIED'));
  assert.ok(!res.events.some(e => e.reason === 'REQUIRES_SLEEP'));
});

test('Comatose: alvo com Comatose pode ser atingido por Dream Eater (#138)', () => {
  const s = battle({}, { ability: 'comatose', types: ['grass'] }, [138, 33]);
  const res = turn(s, 138);
  assert.ok(res.state.enemy.currentHp < 1000);
  assert.ok(!res.events.some(e => e.reason === 'TARGET_NOT_ASLEEP'));
});

test('Comatose: sofre dano de Bad Dreams do adversário no final do turno', () => {
  const s = battle({ ability: 'bad-dreams' }, { ability: 'comatose' }, [107, 33]);
  const res = turn(s, 107);
  assert.equal(res.state.enemy.currentHp, 875); // sofre 1/8 (125) de 1000
  assert.ok(res.events.some(e => e.type === 'STATUS_DAMAGE' && e.statusCondition === 'bad-dreams'));
});

test('Comatose: imunidade total a status não voláteis (Burn, Poison, Toxic, Paralysis, Spore)', () => {
  const sBurn = battle({}, { ability: 'comatose' }, [261, 33]);
  assert.equal(turn(sBurn, 261).state.enemy.statusCondition, null);

  const sToxic = battle({}, { ability: 'comatose' }, [92, 33]);
  assert.equal(turn(sToxic, 92).state.enemy.statusCondition, null);

  const sPara = battle({}, { ability: 'comatose' }, [86, 33]);
  assert.equal(turn(sPara, 86).state.enemy.statusCondition, null);

  const sSpore = battle({}, { ability: 'comatose' }, [147, 33]);
  assert.equal(turn(sSpore, 147).state.enemy.statusCondition, null);
});

test('Comatose: canonicamente insuprimível por Neutralizing Gas', () => {
  const s = battle({ ability: 'comatose' }, { ability: 'neutralizing-gas' }, [173, 33]);
  s.neutralizingGasActive = true;
  // Comatose permanece ativa e pode usar Snore
  const res = turn(s, 173);
  assert.ok(res.events.some(e => e.type === 'DAMAGE_APPLIED'));
});

test('Comatose: registro declara status FULL, breakable false, suppressible false', () => {
  const meta = Reg.getAbility('comatose');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, false);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
});

// -------------------------------------------------------------
// CORROSION
// -------------------------------------------------------------
test('Corrosion: permite envenenar Pokémon Steel com Toxic (#92)', () => {
  const s = battle({ ability: 'corrosion' }, { types: ['steel'] }, [92, 33]);
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, 'toxic');
  assert.ok(res.events.some(e => e.type === 'STATUS_APPLIED' && e.statusCondition === 'toxic'));
});

test('Corrosion: permite envenenar Pokémon Poison com Toxic (#92)', () => {
  const s = battle({ ability: 'corrosion' }, { types: ['poison'] }, [92, 33]);
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, 'toxic');
});

test('Corrosion: permite envenenar Pokémon Steel com Poison Powder (#77)', () => {
  const s = battle({ ability: 'corrosion' }, { types: ['steel'] }, [77, 33]);
  const res = turn(s, 77);
  assert.equal(res.state.enemy.statusCondition, 'poison');
});

test('Corrosion: NÃO altera a imunidade da tabela de tipos a dano ofensivo de Poison', () => {
  // Golpes de dano Poison (Poison Jab #398) continuam causando 0 de dano em Steel
  const s = battle({ ability: 'corrosion' }, { types: ['steel'] }, [398, 33]);
  const res = turn(s, 398);
  assert.equal(res.state.enemy.currentHp, 1000); // Imune por tipo
});

test('Corrosion: registro declara status FULL e breakable false', () => {
  const meta = Reg.getAbility('corrosion');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

// -------------------------------------------------------------
// CURSED BODY
// -------------------------------------------------------------
test('Cursed Body: roll <= 30 desativa (Disable) o golpe do atacante por 4 turnos', () => {
  const s = battle({}, { ability: 'cursed-body' }, [33, 107]);
  const res = turn(s, 33, { cursedBodyRoll: 30 });
  assert.ok(res.state.player.disabledMove);
  assert.equal(res.state.player.disabledMove.id, 33);
  assert.equal(res.state.player.disabledMove.turns, 3); // 4 turnos, decrementa 1 no final do turno
  assert.ok(res.events.some(e => e.type === 'MOVE_DISABLED' && e.reason === 'cursed-body'));
});

test('Cursed Body: roll > 30 NÃO desativa o golpe do atacante', () => {
  const s = battle({}, { ability: 'cursed-body' }, [33, 107]);
  const res = turn(s, 33, { cursedBodyRoll: 31 });
  assert.ok(!res.state.player.disabledMove);
  assert.ok(!res.events.some(e => e.type === 'MOVE_DISABLED'));
});

test('Cursed Body: golpe desativado falha ao ser selecionado no turno seguinte', () => {
  const s = battle({}, { ability: 'cursed-body' }, [33, 107]);
  s.player.disabledMove = { id: 33, name: 'tackle', turns: 3 };
  const res = turn(s, 33);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'DISABLED'));
  assert.equal(res.state.enemy.currentHp, 1000);
});

test('Cursed Body: atacante pode usar outros golpes enquanto um está desativado', () => {
  const s = battle({}, { ability: 'cursed-body' }, [33, 107]);
  s.player.disabledMove = { id: 33, name: 'tackle', turns: 3 };
  const res = turn(s, 107); // usa Minimize
  assert.ok(!res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'DISABLED'));
});

test('Cursed Body: Aroma Veil no atacante bloqueia o Disable de Cursed Body', () => {
  const s = battle({ ability: 'aroma-veil' }, { ability: 'cursed-body' }, [33, 107]);
  const res = turn(s, 33, { cursedBodyRoll: 1 });
  assert.ok(!res.state.player.disabledMove);
  assert.ok(!res.events.some(e => e.type === 'MOVE_DISABLED'));
});

test('Cursed Body: ativa mesmo se o defensor desmaiar com o golpe', () => {
  const s = battle({}, { ability: 'cursed-body', currentHp: 10, hp: 10 }, [33, 107]);
  const res = turn(s, 33, { cursedBodyRoll: 1 });
  assert.equal(res.state.enemy.currentHp, 0);
  assert.ok(res.state.player.disabledMove);
  assert.equal(res.state.player.disabledMove.id, 33);
});

test('Cursed Body: registro declara status FULL e breakable false', () => {
  const meta = Reg.getAbility('cursed-body');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});
