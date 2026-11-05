const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const runerigus = (extra = {}) => ({
  id: 867,
  name: 'runerigus',
  types: ['ground', 'ghost'],
  level: 50,
  hp: 150,
  maxHp: 150,
  currentHp: 150,
  attack: 95,
  defense: 145,
  specialAttack: 50,
  specialDefense: 105,
  speed: 30,
  weightKg: 66.6,
  ability: 'wandering-spirit',
  moves: [89, 14].map(id => move(id)), // Earthquake, Swords Dance
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
  moves: [282, 242, 94, 14].map(id => move(id)), // Knock Off (contact), Crunch (contact), Psychic (special non-contact), Swords Dance
  ...extra
});

const act = (moveId, extra = {}) => ({ type: 'MOVE', moveId, ...extra });
const getMon = s => s.player.team ? s.player.team[s.player.activeIndex || 0] : s.player;
const getFoe = s => s.enemy.team ? s.enemy.team[s.enemy.activeIndex || 0] : s.enemy;

test('Wandering Spirit: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('wandering-spirit');
  assert.ok(meta);
  assert.equal(meta.id, 'wandering-spirit');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H7');
  assert.equal(meta.suppressible, true);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
  assert.deepEqual(meta.triggers, ['ON_CONTACT_DEFENSE']);
});

test('Wandering Spirit: contact move (Knock Off #282) swaps abilities atomically', () => {
  const s = E.createBattle(runerigus(), dummy(2, { ability: 'overgrow' }));
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(282) // Knock Off: makes contact
  });
  const rune = getMon(r.state);
  const foe = getFoe(r.state);
  assert.equal(rune.ability, 'overgrow');
  assert.equal(rune.originalAbility, 'wandering-spirit');
  assert.equal(foe.ability, 'wandering-spirit');
  assert.equal(foe.originalAbility, 'overgrow');
  const swapEvt = r.events.find(e => e.type === 'ABILITIES_SWAPPED');
  assert.ok(swapEvt);
  assert.equal(swapEvt.user, 'player');
  assert.equal(swapEvt.target, 'enemy');
});

test('Wandering Spirit: non-contact move (Psychic #94) does not trigger swap', () => {
  const s = E.createBattle(runerigus(), dummy(2, { ability: 'overgrow' }));
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(94) // Psychic: non-contact
  });
  const rune = getMon(r.state);
  const foe = getFoe(r.state);
  assert.equal(rune.ability, 'wandering-spirit');
  assert.equal(foe.ability, 'overgrow');
  assert.ok(!r.events.some(e => e.type === 'ABILITIES_SWAPPED'));
});

test('Wandering Spirit: attacker holding Ability Shield prevents swap', () => {
  const s = E.createBattle(runerigus(), dummy(2, { ability: 'overgrow', item: 'ability-shield' }));
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(242) // Crunch
  });
  const rune = getMon(r.state);
  const foe = getFoe(r.state);
  assert.equal(rune.ability, 'wandering-spirit');
  assert.equal(foe.ability, 'overgrow');
  assert.ok(!r.events.some(e => e.type === 'ABILITIES_SWAPPED'));
});

test('Wandering Spirit: defender holding Ability Shield prevents swap', () => {
  const s = E.createBattle(runerigus({ item: 'ability-shield' }), dummy(2, { ability: 'overgrow' }));
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(242) // Crunch
  });
  const rune = getMon(r.state);
  const foe = getFoe(r.state);
  assert.equal(rune.ability, 'wandering-spirit');
  assert.equal(foe.ability, 'overgrow');
  assert.ok(!r.events.some(e => e.type === 'ABILITIES_SWAPPED'));
});

test('Wandering Spirit: does not swap unswappable abilities (e.g. Disguise, Multitype, Zero to Hero)', () => {
  for (const ab of ['disguise', 'multitype', 'zero-to-hero', 'battle-bond', 'neutralizing-gas']) {
    const s = E.createBattle(runerigus(), dummy(2, { ability: ab }));
    const r = E.resolveTurn(s, {
      player: act(14),
      enemy: act(282)
    });
    const rune = getMon(r.state);
    const foe = getFoe(r.state);
    assert.equal(rune.ability, 'wandering-spirit');
    assert.equal(foe.ability, ab);
    assert.ok(!r.events.some(e => e.type === 'ABILITIES_SWAPPED'));
  }
});

test('Wandering Spirit: does NOT swap if defender faints from the hit (canonical Gen IX)', () => {
  const s = E.createTeamBattle(
    [runerigus({ hp: 5, currentHp: 5 }), dummy(5), dummy(6)],
    [dummy(2, { attack: 300, ability: 'intimidate' }), dummy(3), dummy(4)]
  );
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(282) // KOs Runerigus
  });
  const rune = r.state.player.team[0];
  const foe = r.state.enemy.team[0];
  assert.equal(rune.currentHp, 0);
  assert.equal(foe.ability, 'intimidate');
  assert.ok(!r.events.some(e => e.type === 'ABILITIES_SWAPPED'));
});

test('Wandering Spirit: switch-out restores original abilities', () => {
  const s = E.createTeamBattle(
    [runerigus(), dummy(5), dummy(6)],
    [dummy(2, { ability: 'overgrow' }), dummy(3), dummy(4)]
  );
  const r1 = E.resolveTurn(s, {
    player: act(14),
    enemy: act(282)
  });
  assert.equal(r1.state.player.team[0].ability, 'overgrow');
  assert.equal(r1.state.enemy.team[0].ability, 'wandering-spirit');

  // Player switches out Runerigus
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: act(14)
  });
  assert.equal(r2.state.player.team[0].ability, 'wandering-spirit');
  assert.ok(!r2.state.player.team[0].originalAbility);
});

test('Wandering Spirit: Neutralizing Gas suppresses swap', () => {
  const s = E.createBattle(
    runerigus(),
    dummy(110, { ability: 'neutralizing-gas', moves: [move(282)] })
  );
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(282)
  });
  const rune = getMon(r.state);
  const foe = getFoe(r.state);
  assert.equal(rune.ability, 'wandering-spirit');
  assert.equal(foe.ability, 'neutralizing-gas');
  assert.ok(!r.events.some(e => e.type === 'ABILITIES_SWAPPED'));
});
