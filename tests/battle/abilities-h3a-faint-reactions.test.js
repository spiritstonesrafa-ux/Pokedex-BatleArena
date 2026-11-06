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

// Aftermath Tests
test('Aftermath: defensor com Aftermath desmaia por golpe de contato -> atacante sofre 1/4 do maxHp em recuo', () => {
  // Defensor com 10 HP desmaia pelo Tackle do jogador
  const s = battle({ hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'aftermath', hp: 100, maxHp: 100, currentHp: 10 });
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 750); // 1000 - 250 (1/4 de 1000)
  assert.ok(res.events.some(e => e.type === 'RECOIL_APPLIED' && e.reason === 'aftermath' && e.damage === 250));
});

test('Aftermath: defensor desmaia por golpe sem contato (Swift #129) -> Aftermath NÃO ativa', () => {
  const s = battle({ hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'aftermath', hp: 100, maxHp: 100, currentHp: 10 }, [129, 107]);
  const res = turn(s, 129);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 1000);
});

test('Aftermath: defensor sobrevive ao golpe de contato -> Aftermath NÃO ativa', () => {
  const s = battle({ hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'aftermath', hp: 1000, maxHp: 1000, currentHp: 1000 });
  const res = turn(s, 33);
  assert.ok(res.state.enemy.currentHp > 0);
  assert.equal(res.state.player.currentHp, 1000);
});

test('Aftermath: atacante com Long Reach evita contato -> Aftermath NÃO ativa no nocaute', () => {
  const s = battle({ ability: 'long-reach', hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'aftermath', hp: 100, maxHp: 100, currentHp: 10 });
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 1000);
});

test('Aftermath: Damp presente no campo anula o Aftermath', () => {
  const s = battle({ ability: 'damp', hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'aftermath', hp: 100, maxHp: 100, currentHp: 10 });
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 1000);
});

test('Aftermath: atacante com Magic Guard não sofre dano de Aftermath', () => {
  const s = battle({ ability: 'magic-guard', hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'aftermath', hp: 100, maxHp: 100, currentHp: 10 });
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 1000);
});

test('Aftermath: nocaute mútuo (defensor desmaia primeiro, depois atacante desmaia por recuo)', () => {
  const s = battle({ hp: 200, maxHp: 1000, currentHp: 200 }, { ability: 'aftermath', hp: 100, maxHp: 100, currentHp: 10 });
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 0);
  const faints = res.events.filter(e => e.type === 'POKEMON_FAINTED');
  assert.ok(faints.length >= 2);
  assert.equal(faints[0].target, 'enemy');
  assert.equal(faints[1].target, 'player');
});

test('Aftermath: Mold Breaker no atacante NÃO anula Aftermath (Aftermath não é breakable)', () => {
  const s = battle({ ability: 'mold-breaker', hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'aftermath', hp: 100, maxHp: 100, currentHp: 10 });
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 750);
});

test('Aftermath: supressão desativa Aftermath', () => {
  const s = battle({ hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'aftermath', abilitySuppressed: true, hp: 100, maxHp: 100, currentHp: 10 });
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 1000);
});

// Innards Out Tests
test('Innards Out: defensor com Innards Out desmaia -> atacante sofre dano igual ao HP do defensor antes do nocaute', () => {
  // Atacante com attack 500 nocauteia defensor de 85 HP
  const s = battle({ attack: 500, hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'innards-out', hp: 100, maxHp: 100, currentHp: 85 });
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 915); // 1000 - 85
  assert.ok(res.events.some(e => e.type === 'RECOIL_APPLIED' && e.reason === 'innards-out' && e.damage === 85));
});

test('Innards Out: ativa com golpes sem contato (Swift #129)', () => {
  const s = battle({ specialAttack: 500, hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'innards-out', hp: 100, maxHp: 100, currentHp: 60 }, [129, 107]);
  const res = turn(s, 129);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 940); // 1000 - 60
});

test('Innards Out: defensor sobrevive ao golpe -> Innards Out NÃO ativa', () => {
  const s = battle({ hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'innards-out', hp: 1000, maxHp: 1000, currentHp: 1000 });
  const res = turn(s, 33);
  assert.ok(res.state.enemy.currentHp > 0);
  assert.equal(res.state.player.currentHp, 1000);
});

test('Innards Out: atacante com Magic Guard não sofre dano de Innards Out', () => {
  const s = battle({ attack: 500, ability: 'magic-guard', hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'innards-out', hp: 100, maxHp: 100, currentHp: 90 });
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 1000);
});

test('Innards Out: nocaute mútuo (defensor desmaia primeiro, atacante em seguida)', () => {
  const s = battle({ attack: 500, hp: 50, maxHp: 100, currentHp: 50 }, { ability: 'innards-out', hp: 100, maxHp: 100, currentHp: 80 });
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 0);
  const faints = res.events.filter(e => e.type === 'POKEMON_FAINTED');
  assert.ok(faints.length >= 2);
  assert.equal(faints[0].target, 'enemy');
  assert.equal(faints[1].target, 'player');
});

test('Innards Out: Mold Breaker no atacante NÃO anula Innards Out', () => {
  const s = battle({ attack: 500, ability: 'mold-breaker', hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'innards-out', hp: 100, maxHp: 100, currentHp: 75 });
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 925);
});

test('Innards Out: supressão desativa Innards Out', () => {
  const s = battle({ attack: 500, hp: 1000, maxHp: 1000, currentHp: 1000 }, { ability: 'innards-out', abilitySuppressed: true, hp: 100, maxHp: 100, currentHp: 50 });
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 1000);
});

// Perish Body Tests
test('Perish Body: golpe de contato aplica contagem de 3 turnos de Perish Song em ambos os combatentes', () => {
  const s = battle({}, { ability: 'perish-body' });
  const res = turn(s, 33);
  // No fim do turno 1, a contagem foi aplicada (=3) e decrementou no earlyResidual (=2)
  assert.equal(res.state.player.perishSong, 2);
  assert.equal(res.state.enemy.perishSong, 2);
  assert.ok(res.events.some(e => e.type === 'PERISH_SONG_APPLIED' && e.target === 'player'));
  assert.ok(res.events.some(e => e.type === 'PERISH_SONG_APPLIED' && e.target === 'enemy'));
});

test('Perish Body: golpe sem contato (Swift #129) NÃO ativa Perish Body', () => {
  const s = battle({}, { ability: 'perish-body' }, [129, 107]);
  const res = turn(s, 129);
  assert.equal(res.state.player.perishSong, null);
  assert.equal(res.state.enemy.perishSong, null);
});

test('Perish Body: Long Reach no atacante evita contato e não ativa Perish Body', () => {
  const s = battle({ ability: 'long-reach' }, { ability: 'perish-body' });
  const res = turn(s, 33);
  assert.equal(res.state.player.perishSong, null);
  assert.equal(res.state.enemy.perishSong, null);
});

test('Perish Body: contagem regressiva decrementa a cada turno e nocauteia ao atingir 0', () => {
  const s = battle({ perishSong: 1 }, { perishSong: 1 });
  const res = turn(s, 107); // Turno sem dano
  assert.equal(res.state.player.currentHp, 0);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.ok(res.events.some(e => e.type === 'PERISH_SONG_COUNT' && e.count === 0));
  assert.ok(res.events.some(e => e.type === 'HP_DAMAGE' && e.reason === 'perish-song'));
});

test('Perish Body: Soundproof NÃO bloqueia Perish Body (Showdown Gen IX)', () => {
  const s = battle({ ability: 'soundproof' }, { ability: 'perish-body' });
  const res = turn(s, 33);
  assert.equal(res.state.player.perishSong, 2);
  assert.equal(res.state.enemy.perishSong, 2);
});

test('Perish Body: supressão desativa Perish Body', () => {
  const s = battle({}, { ability: 'perish-body', abilitySuppressed: true });
  const res = turn(s, 33);
  assert.equal(res.state.player.perishSong, null);
  assert.equal(res.state.enemy.perishSong, null);
});
