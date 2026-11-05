const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const cofagrigus = (extra = {}) => ({
  id: 563,
  name: 'cofagrigus',
  types: ['ghost'],
  level: 50,
  hp: 150,
  maxHp: 150,
  currentHp: 150,
  attack: 70,
  defense: 165,
  specialAttack: 115,
  specialDefense: 125,
  speed: 50,
  weightKg: 76.5,
  ability: 'mummy',
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
  ability: 'overgrow',
  moves: [282, 94, 14].map(id => move(id)), // Knock Off (contact), Psychic (special non-contact), Swords Dance
  ...extra
});

const act = (moveId, extra = {}) => ({ type: 'MOVE', moveId, ...extra });
const getMon = s => s.player.team ? s.player.team[s.player.activeIndex || 0] : s.player;
const getFoe = s => s.enemy.team ? s.enemy.team[s.enemy.activeIndex || 0] : s.enemy;

test('Mummy: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('mummy');
  assert.ok(meta);
  assert.equal(meta.id, 'mummy');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H7');
  assert.equal(meta.suppressible, true);
  assert.equal(meta.copyable, true);
  assert.equal(meta.swappable, true);
  assert.deepEqual(meta.triggers, ['ON_CONTACT_DEFENSE']);
});

test('Mummy: contact move (Knock Off #282) changes attacker ability to Mummy', () => {
  const s = E.createBattle(cofagrigus(), dummy(2, { ability: 'overgrow' }));
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(282) // Knock Off: makes contact
  });
  const foe = getFoe(r.state);
  assert.equal(foe.ability, 'mummy');
  assert.equal(foe.originalAbility, 'overgrow');
  const chgEvt = r.events.find(e => e.type === 'ABILITY_CHANGED');
  assert.ok(chgEvt);
  assert.equal(chgEvt.ability, 'mummy');
  assert.equal(chgEvt.target, 'enemy');
});

test('Mummy: non-contact move (Psychic #94) does not trigger Mummy', () => {
  const s = E.createBattle(cofagrigus(), dummy(2, { ability: 'overgrow' }));
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(94) // Psychic: special, non-contact
  });
  const foe = getFoe(r.state);
  assert.equal(foe.ability, 'overgrow');
  assert.ok(!foe.originalAbility);
  assert.ok(!r.events.some(e => e.type === 'ABILITY_CHANGED'));
});

test('Mummy: attacker holding Ability Shield is protected from Mummy', () => {
  const s = E.createBattle(cofagrigus(), dummy(2, { ability: 'overgrow', item: 'ability-shield' }));
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(282)
  });
  const foe = getFoe(r.state);
  assert.equal(foe.ability, 'overgrow');
  assert.ok(!foe.originalAbility);
  assert.ok(!r.events.some(e => e.type === 'ABILITY_CHANGED'));
});

test('Mummy: does not overwrite unoverwritable abilities (e.g. Disguise, Multitype, Zero to Hero)', () => {
  for (const ab of ['disguise', 'multitype', 'zero-to-hero', 'battle-bond']) {
    const s = E.createBattle(cofagrigus(), dummy(2, { ability: ab }));
    const r = E.resolveTurn(s, {
      player: act(14),
      enemy: act(282)
    });
    const foe = getFoe(r.state);
    assert.equal(foe.ability, ab);
    assert.ok(!foe.originalAbility);
  }
});

test('Mummy: attacker already possessing Mummy does not trigger redundant change', () => {
  const s = E.createBattle(cofagrigus(), dummy(2, { ability: 'mummy' }));
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(282)
  });
  assert.ok(!r.events.some(e => e.type === 'ABILITY_CHANGED'));
});

test('Mummy: activates even if defender faints from the contact hit', () => {
  const s = E.createTeamBattle(
    [cofagrigus({ hp: 5, currentHp: 5 }), dummy(5), dummy(6)],
    [dummy(2, { attack: 300, ability: 'intimidate' }), dummy(3), dummy(4)]
  );
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(282) // KOs Cofagrigus
  });
  const cofa = r.state.player.team[0];
  const foe = r.state.enemy.team[0];
  assert.equal(cofa.currentHp, 0);
  assert.equal(foe.ability, 'mummy');
  assert.equal(foe.originalAbility, 'intimidate');
  assert.ok(r.events.some(e => e.type === 'ABILITY_CHANGED'));
});

test('Mummy: switch-out restores original ability', () => {
  const s = E.createTeamBattle(
    [cofagrigus(), dummy(5), dummy(6)],
    [dummy(2, { ability: 'overgrow' }), dummy(3), dummy(4)]
  );
  // Turn 1: enemy attacks Cofagrigus and gains Mummy
  const r1 = E.resolveTurn(s, {
    player: act(14),
    enemy: act(282)
  });
  assert.equal(r1.state.enemy.team[0].ability, 'mummy');

  // Turn 2: enemy switches to reserve dummy(3)
  const r2 = E.resolveTurn(r1.state, {
    player: act(14),
    enemy: { type: 'SWITCH', targetIndex: 1 }
  });
  // Reserve dummy(2) has ability restored to overgrow
  assert.equal(r2.state.enemy.team[0].ability, 'overgrow');
  assert.ok(!r2.state.enemy.team[0].originalAbility);
});

test('Mummy: Neutralizing Gas suppresses Mummy activation', () => {
  const s = E.createBattle(
    cofagrigus(),
    dummy(110, { ability: 'neutralizing-gas', moves: [move(282)] })
  );
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(282)
  });
  const foe = getFoe(r.state);
  assert.equal(foe.ability, 'neutralizing-gas');
  assert.ok(!r.events.some(e => e.type === 'ABILITY_CHANGED'));
});
