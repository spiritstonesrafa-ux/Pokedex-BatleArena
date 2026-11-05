const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const weezing = (extra = {}) => ({
  id: 110,
  name: 'weezing',
  types: ['poison'],
  level: 50,
  hp: 140,
  maxHp: 140,
  currentHp: 140,
  attack: 100,
  defense: 130,
  specialAttack: 95,
  specialDefense: 80,
  speed: 70,
  weightKg: 9.5,
  ability: 'neutralizing-gas',
  moves: [33, 94, 14].map(id => move(id)), // Tackle, Psychic, Swords Dance
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
  ability: 'overgrow',
  moves: [33, 94, 14].map(id => move(id)), // Tackle, Psychic, Swords Dance
  ...extra
});

const act = (moveId, extra = {}) => ({ type: 'MOVE', moveId, ...extra });
const getMon = s => s.player.team ? s.player.team[s.player.activeIndex || 0] : s.player;
const getFoe = s => s.enemy.team ? s.enemy.team[s.enemy.activeIndex || 0] : s.enemy;

test('Neutralizing Gas: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('neutralizing-gas');
  assert.ok(meta);
  assert.equal(meta.id, 'neutralizing-gas');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H7');
  assert.equal(meta.suppressible, false);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
  assert.deepEqual(meta.triggers, ['ON_ENTRY', 'ON_SWITCH', 'ON_FAINT']);
});

test('Neutralizing Gas: emits NEUTRALIZING_GAS_STARTED on entry', () => {
  const s = E.createBattle(weezing(), dummy(2));
  const gasStart = s.initialP7Events.find(e => e.type === 'NEUTRALIZING_GAS_STARTED');
  assert.ok(gasStart);
  assert.equal(gasStart.source, 'player');
  assert.equal(s.neutralizingGasActive, true);
});

test('Neutralizing Gas: suppresses Huge Power stat doubling', () => {
  // Azumarill with Huge Power
  const azuWithoutGas = dummy(184, { attack: 100, ability: 'huge-power' });
  const azuWithGas = dummy(184, { attack: 100, ability: 'huge-power' });

  // Normal battle: Huge Power doubles Attack to 200
  const sNormal = E.createBattle(dummy(1), azuWithoutGas);
  assert.equal(C.getEffectiveStat(getFoe(sNormal), 'attack'), 200);

  // Battle against Weezing: Attack is not doubled (remains 100)
  const sGas = E.createBattle(weezing(), azuWithGas);
  assert.equal(C.getEffectiveStat(getFoe(sGas), 'attack'), 100);
});

test('Neutralizing Gas: suppresses Levitate ground immunity', () => {
  const s = E.createBattle(weezing(), dummy(2, { ability: 'levitate' }));
  const foe = getFoe(s);
  assert.equal(foe.grounded, true);
  assert.equal(C.P7.ability(foe), '');
});

test('Neutralizing Gas: suppresses entry abilities (Drizzle, Intimidate)', () => {
  // Opponent enters with Drizzle
  const s1 = E.createBattle(weezing(), dummy(2, { ability: 'drizzle' }));
  assert.equal(s1.weather, null);

  // Opponent enters with Intimidate
  const s2 = E.createBattle(weezing(), dummy(2, { ability: 'intimidate' }));
  assert.equal(getMon(s2).statStages.attack, 0);
});

test('Neutralizing Gas: does not suppress unsuppressible abilities (Disguise, Multitype, Zero to Hero)', () => {
  const s1 = E.createBattle(weezing(), dummy(778, { ability: 'disguise' }));
  assert.equal(C.P7.ability(getFoe(s1)), 'disguise');

  const s2 = E.createBattle(weezing(), dummy(493, { ability: 'multitype' }));
  assert.equal(C.P7.ability(getFoe(s2)), 'multitype');
});

test('Neutralizing Gas: combatant holding Ability Shield is not suppressed', () => {
  const s = E.createBattle(weezing(), dummy(2, { ability: 'levitate', item: 'ability-shield' }));
  const foe = getFoe(s);
  assert.equal(foe.neutralizingGasSuppressed, false);
  assert.equal(C.P7.ability(foe), 'levitate');
  assert.equal(foe.grounded, false);
});

test('Neutralizing Gas: Forecast Castform reverts to Normal when Weezing is active', () => {
  const castform = {
    id: 351,
    name: 'castform',
    types: ['normal'],
    level: 50,
    hp: 140,
    maxHp: 140,
    currentHp: 140,
    attack: 80,
    defense: 80,
    specialAttack: 80,
    specialDefense: 80,
    speed: 80,
    ability: 'forecast',
    moves: [33, 14].map(id => move(id))
  };
  // Weather is Rain, but Weezing's Neutralizing Gas is active
  const s = E.createBattle(weezing(), castform);
  s.weather = { id: 'rain', turns: 5 };
  C.P7.sync(s);
  C.P8.updateFieldAbilities(s, C, []);
  const foe = getFoe(s);
  assert.equal(foe.formSpeciesId, null);
  assert.deepEqual(foe.types, ['normal']);
});

test('Neutralizing Gas: when Weezing faints, NEUTRALIZING_GAS_ENDED is emitted and abilities resume', () => {
  const s = E.createTeamBattle(
    [weezing({ hp: 5, currentHp: 5 }), dummy(5), dummy(6)],
    [dummy(2, { ability: 'levitate', attack: 300 }), dummy(3), dummy(4)]
  );
  assert.equal(s.neutralizingGasActive, true);
  assert.equal(s.enemy.team[0].neutralizingGasSuppressed, true);

  // Turn: Enemy attacks Weezing and KOs it
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(33) // KOs Weezing
  });
  const gasEnded = r.events.find(e => e.type === 'NEUTRALIZING_GAS_ENDED');
  assert.ok(gasEnded);
  assert.equal(r.state.neutralizingGasActive, false);
  assert.equal(r.state.enemy.team[0].neutralizingGasSuppressed, false);
  assert.equal(C.P7.ability(r.state.enemy.team[0]), 'levitate');
});

test('Neutralizing Gas: when Weezing switches out, gas ends and abilities restore', () => {
  const s = E.createTeamBattle(
    [weezing(), dummy(5), dummy(6)],
    [dummy(2, { ability: 'levitate' }), dummy(3), dummy(4)]
  );
  assert.equal(s.neutralizingGasActive, true);

  // Weezing switches out
  const r = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: act(14)
  });
  assert.equal(r.state.neutralizingGasActive, false);
  assert.equal(r.state.enemy.team[0].neutralizingGasSuppressed, false);
});

test('Neutralizing Gas in Doubles: if one Weezing faints but ally Weezing remains, gas stays active', () => {
  const weezing1 = weezing({ hp: 5, currentHp: 5, moves: [move(14)] });
  const weezing2 = weezing({ id: 10167, name: 'weezing-galar', moves: [move(14)] });
  const s = E.createDoublesBattle(
    [weezing1, weezing2],
    [dummy(20, { attack: 300, moves: [move(33)] }), dummy(21, { moves: [move(14)] })]
  );
  assert.equal(s.neutralizingGasActive, true);

  // KO Weezing 1
  const r = E.resolveDoublesTurn(s, {
    player: { 0: act(14), 1: act(14) },
    enemy: { 0: act(33, { targetRole: 'player', targetSlot: 0 }), 1: act(14) }
  });
  // Weezing 2 is still conscious, so gas remains active!
  assert.equal(r.state.neutralizingGasActive, true);
  assert.ok(!r.events.some(e => e.type === 'NEUTRALIZING_GAS_ENDED'));
});
