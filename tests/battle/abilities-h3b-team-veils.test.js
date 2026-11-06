const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

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
  gender: 'M',
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
// 269: Taunt
// 147: Spore
// 95: Hypnosis
// 281: Yawn
// 156: Rest
// 92: Toxic
// 77: Poison Powder
// 261: Will-O-Wisp
// 86: Thunder Wave
// 668: Strength Sap (-1 atk)
// 33: Tackle

// -------------------------------------------------------------
// AROMA VEIL
// -------------------------------------------------------------
test('Aroma Veil: protege portador contra Taunt (#269)', () => {
  const s = battle({}, { ability: 'aroma-veil' }, [269, 33]);
  const res = turn(s, 269);
  assert.equal(res.state.enemy.tauntTurns || 0, 0);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_ABILITY'));
});

test('Aroma Veil: protege portador contra atração (Infatuation / Cute Charm)', () => {
  const s = battle({ ability: 'aroma-veil' }, { ability: 'cute-charm', gender: 'F' });
  s.player.gender = 'M';
  const res = turn(s, 33, { cuteCharmRoll: 1 });
  assert.equal(res.state.player.infatuation, null);
});

test('Aroma Veil: protege contra Disable de Cursed Body', () => {
  const s = battle({ ability: 'aroma-veil' }, { ability: 'cursed-body' });
  const res = turn(s, 33, { cursedBodyRoll: 1 });
  assert.ok(!res.state.player.disabledMove);
  assert.ok(!res.events.some(e => e.type === 'MOVE_DISABLED'));
});

test('Aroma Veil: Mold Breaker quebra Aroma Veil e aplica Taunt', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'aroma-veil' }, [269, 33]);
  const res = turn(s, 269);
  assert.equal(res.state.enemy.tauntTurns, 2);
});

test('Aroma Veil: suprimida permite aplicação de Taunt', () => {
  const s = battle({}, { ability: 'aroma-veil', abilitySuppressed: true }, [269, 33]);
  const res = turn(s, 269);
  assert.equal(res.state.enemy.tauntTurns, 2);
});

test('Aroma Veil: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('aroma-veil');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

// -------------------------------------------------------------
// FLOWER VEIL
// -------------------------------------------------------------
test('Flower Veil: aliado Grass é imune a quedas de atributos de oponentes (Strength Sap #668)', () => {
  const s = battle({}, { ability: 'flower-veil', types: ['grass'] }, [668, 33]);
  const res = turn(s, 668);
  assert.equal(res.state.enemy.statStages.attack, 0);
});

test('Flower Veil: aliado Grass é imune a Intimidate do adversário', () => {
  const s = E.createBattle(
    mon(1, [33], { ability: 'intimidate' }),
    mon(2, [33], { ability: 'flower-veil', types: ['grass'] })
  );
  C.P7.start(s, C);
  assert.equal(s.enemy.statStages.attack, 0);
});

test('Flower Veil: NÃO protege aliado que não seja do tipo Grass contra quedas de atributos', () => {
  const s = battle({}, { ability: 'flower-veil', types: ['normal'] }, [668, 33]);
  const res = turn(s, 668);
  assert.equal(res.state.enemy.statStages.attack, -1);
});

test('Flower Veil: protege aliado Grass contra status primário do adversário (Will-O-Wisp #261)', () => {
  const s = battle({}, { ability: 'flower-veil', types: ['grass'] }, [261, 33]);
  const res = turn(s, 261);
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Flower Veil: protege aliado Grass contra Thunder Wave (#86)', () => {
  const s = battle({}, { ability: 'flower-veil', types: ['grass'] }, [86, 33]);
  const res = turn(s, 86);
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Flower Veil: Mold Breaker quebra Flower Veil e reduz Ataque com Strength Sap', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'flower-veil', types: ['grass'] }, [668, 33]);
  const res = turn(s, 668);
  assert.equal(res.state.enemy.statStages.attack, -1);
});

test('Flower Veil: modifyStages bloqueia reduções múltiplas em Pokémon Grass', () => {
  const targetMon = mon(2, [33], { ability: 'flower-veil', types: ['grass'], statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 } });
  const s = { player: mon(1, [33]), enemy: targetMon };
  const events = [];
  const res = C.P7.modifyStages(s, 'enemy', targetMon, { defense: -2, speed: -1 }, 'player', s.player, 'screech', C, events);
  assert.deepEqual(res, {});
  assert.equal(targetMon.statStages.defense, 0);
  assert.equal(targetMon.statStages.speed, 0);
  assert.ok(events.some(e => e.label === 'flower-veil'));
});

test('Flower Veil: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('flower-veil');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

// -------------------------------------------------------------
// SWEET VEIL
// -------------------------------------------------------------
test('Sweet Veil: impede o portador de adormecer com Spore (#147)', () => {
  const s = battle({}, { ability: 'sweet-veil' }, [147, 33]);
  const res = turn(s, 147);
  assert.equal(res.state.enemy.statusCondition, null);
  assert.ok(res.events.some(e => e.type === 'STATUS_BLOCKED' && e.reason === 'IMMUNE'));
});

test('Sweet Veil: impede o portador de adormecer com Hypnosis (#95)', () => {
  const s = battle({}, { ability: 'sweet-veil' }, [95, 33]);
  const res = turn(s, 95);
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Sweet Veil: impede sonolência de Yawn (#281)', () => {
  const s = battle({}, { ability: 'sweet-veil' }, [281, 33]);
  const res = turn(s, 281);
  assert.equal(res.state.enemy.drowsyTurns || 0, 0);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_ABILITY'));
});

test('Sweet Veil: faz o movimento Rest (#156) falhar para o portador', () => {
  const s = battle({ ability: 'sweet-veil', currentHp: 500 }, {}, [156, 33]);
  const res = turn(s, 156);
  assert.equal(res.state.player.statusCondition, null);
  assert.equal(res.state.player.currentHp, 500);
});

test('Sweet Veil: Mold Breaker quebra Sweet Veil e aplica Spore', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'sweet-veil' }, [147, 33]);
  const res = turn(s, 147);
  assert.equal(res.state.enemy.statusCondition, 'sleep');
});

test('Sweet Veil: Neutralizing Gas suprime Sweet Veil e permite Spore', () => {
  const s = battle({ ability: 'neutralizing-gas' }, { ability: 'sweet-veil' }, [147, 33]);
  s.neutralizingGasActive = true;
  s.enemy.neutralizingGasSuppressed = true;
  const res = turn(s, 147);
  assert.equal(res.state.enemy.statusCondition, 'sleep');
});

test('Sweet Veil: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('sweet-veil');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

// -------------------------------------------------------------
// PASTEL VEIL
// -------------------------------------------------------------
test('Pastel Veil: imunidade a Toxic (#92)', () => {
  const s = battle({}, { ability: 'pastel-veil' }, [92, 33]);
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, null);
  assert.ok(res.events.some(e => e.type === 'STATUS_BLOCKED' && e.reason === 'IMMUNE'));
});

test('Pastel Veil: imunidade a Poison Powder (#77)', () => {
  const s = battle({}, { ability: 'pastel-veil' }, [77, 33]);
  const res = turn(s, 77);
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Pastel Veil: switch-in / entrada cura imediatamente envenenamento existente', () => {
  const s = E.createBattle(
    mon(1, [33], { ability: 'pastel-veil', statusCondition: 'toxic', toxicStage: 2 }),
    mon(2, [33], { statusCondition: 'poison' })
  );
  C.P7.start(s, C);
  assert.equal(s.player.statusCondition, null);
  assert.equal(s.player.toxicStage, 0);
});

test('Pastel Veil: Mold Breaker quebra Pastel Veil e aplica Toxic', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'pastel-veil' }, [92, 33]);
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, 'toxic');
});

test('Pastel Veil: suprimida permite envenenamento por Toxic', () => {
  const s = battle({}, { ability: 'pastel-veil', abilitySuppressed: true }, [92, 33]);
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, 'toxic');
});

test('Pastel Veil: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('pastel-veil');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});
