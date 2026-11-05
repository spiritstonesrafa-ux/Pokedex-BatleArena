const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const gardevoir = (extra = {}) => ({
  id: 282,
  name: 'gardevoir',
  types: ['psychic', 'fairy'],
  level: 50,
  hp: 143,
  maxHp: 143,
  currentHp: 143,
  attack: 85,
  defense: 85,
  specialAttack: 145,
  specialDefense: 135,
  speed: 100,
  weightKg: 48.4,
  ability: 'trace',
  moves: [94, 14].map(id => move(id)), // Psychic, Swords Dance
  ...extra
});

const dummy = (id = 2, extra = {}) => ({
  id,
  name: 'dummy-' + id,
  types: ['normal'],
  level: 50,
  hp: 200,
  maxHp: 200,
  currentHp: 200,
  attack: 100,
  defense: 100,
  specialAttack: 100,
  specialDefense: 100,
  speed: 80,
  ability: 'levitate',
  moves: [33, 14].map(id => move(id)), // Tackle, Swords Dance
  ...extra
});

const act = (moveId, extra = {}) => ({ type: 'MOVE', moveId, ...extra });
const getMon = s => s.player.team ? s.player.team[s.player.activeIndex || 0] : s.player;
const getFoe = s => s.enemy.team ? s.enemy.team[s.enemy.activeIndex || 0] : s.enemy;

test('Trace: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('trace');
  assert.ok(meta);
  assert.equal(meta.id, 'trace');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H7');
  assert.equal(meta.suppressible, true);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
  assert.deepEqual(meta.triggers, ['ON_ENTRY']);
});

test('Trace: copies eligible opponent ability on entry (e.g. Levitate)', () => {
  const s = E.createBattle(gardevoir(), dummy(2, { ability: 'levitate' }));
  const m = getMon(s);
  assert.equal(m.ability, 'levitate');
  assert.equal(m.originalAbility, 'trace');
  const traceEvt = s.initialP7Events.find(e => e.type === 'TRACE_COPIED');
  assert.ok(traceEvt);
  assert.equal(traceEvt.copiedAbility, 'levitate');
  assert.equal(traceEvt.from, 'enemy');
});

test('Trace: copied on-entry ability Drizzle immediately summons Rain', () => {
  const s = E.createBattle(gardevoir(), dummy(2, { ability: 'drizzle' }));
  const m = getMon(s);
  assert.equal(m.ability, 'drizzle');
  assert.equal(s.weather?.id, 'rain');
});

test('Trace: copied on-entry ability Intimidate immediately drops foe Attack', () => {
  const s = E.createBattle(gardevoir(), dummy(2, { ability: 'intimidate' }));
  const m = getMon(s);
  const foe = getFoe(s);
  assert.equal(m.ability, 'intimidate');
  assert.equal(foe.statStages.attack, -1);
});

test('Trace: does not copy untraceable abilities (e.g. Disguise, Multitype, Neutralizing Gas)', () => {
  for (const untraceable of ['disguise', 'multitype', 'neutralizing-gas', 'schooling', 'battle-bond']) {
    const s = E.createBattle(gardevoir(), dummy(2, { ability: untraceable }));
    const m = getMon(s);
    assert.equal(m.ability, 'trace');
    assert.ok(!m.originalAbility);
  }
});

test('Trace: does not copy ability if opponent holds Ability Shield', () => {
  const s = E.createBattle(gardevoir(), dummy(2, { ability: 'intimidate', item: 'ability-shield' }));
  const m = getMon(s);
  assert.equal(m.ability, 'trace');
  assert.ok(!m.originalAbility);
});

test('Trace: does not trigger if bearer is suppressed on entry', () => {
  const g2 = gardevoir();
  const s2 = E.createBattle(g2, dummy(2, { ability: 'neutralizing-gas' }));
  const m2 = getMon(s2);
  assert.equal(m2.ability, 'trace');
  assert.ok(!m2.originalAbility);
});

test('Trace: switch-out restores original ability trace', () => {
  const s = E.createTeamBattle(
    [gardevoir(), dummy(3), dummy(5)],
    [dummy(2, { ability: 'levitate' }), dummy(4), dummy(6)]
  );
  assert.equal(s.player.team[0].ability, 'levitate');
  // Switch to dummy(3)
  const r = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: act(33)
  });
  // Gardevoir in reserve has ability restored to trace
  assert.equal(r.state.player.team[0].ability, 'trace');
  assert.ok(!r.state.player.team[0].originalAbility);
});

test('Trace in Doubles: selects first eligible adjacent opponent', () => {
  const s = E.createDoublesBattle(
    [gardevoir(), dummy(10)],
    [dummy(20, { ability: 'disguise' }), dummy(21, { ability: 'swift-swim' })]
  );
  const m = s.player.team[0];
  // Opponent 1 has untraceable Disguise; Trace copies Opponent 2 Swift Swim!
  assert.equal(m.ability, 'swift-swim');
  assert.equal(m.originalAbility, 'trace');
});

test('Trace: activates when Neutralizing Gas ends if bearer is active', () => {
  const s = E.createBattle(gardevoir(), dummy(110, { ability: 'neutralizing-gas', hp: 10, currentHp: 10, moves: [move(33)] }));
  const m = getMon(s);
  // While Weezing is active, Trace is suppressed
  assert.equal(m.ability, 'trace');
  assert.ok(!m.originalAbility);

  // Knock out Weezing with Psychic #94
  const r = E.resolveTurn(s, {
    player: act(94),
    enemy: act(33)
  });
  const gasEnded = r.events.find(e => e.type === 'NEUTRALIZING_GAS_ENDED');
  assert.ok(gasEnded);
});
