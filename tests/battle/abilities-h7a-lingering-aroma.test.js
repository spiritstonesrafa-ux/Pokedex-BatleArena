const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const oinkologne = (extra = {}) => ({
  id: 916,
  name: 'oinkologne',
  types: ['normal'],
  level: 50,
  hp: 185,
  maxHp: 185,
  currentHp: 185,
  attack: 100,
  defense: 75,
  specialAttack: 59,
  specialDefense: 80,
  speed: 65,
  weightKg: 120.0,
  ability: 'lingering-aroma',
  moves: [33, 14].map(id => move(id)), // Tackle, Swords Dance
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
  moves: [33, 94, 14].map(id => move(id)), // Tackle (contact), Psychic (special non-contact), Swords Dance
  ...extra
});

const act = (moveId, extra = {}) => ({ type: 'MOVE', moveId, ...extra });
const getMon = s => s.player.team ? s.player.team[s.player.activeIndex || 0] : s.player;
const getFoe = s => s.enemy.team ? s.enemy.team[s.enemy.activeIndex || 0] : s.enemy;

test('Lingering Aroma: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('lingering-aroma');
  assert.ok(meta);
  assert.equal(meta.id, 'lingering-aroma');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H7');
  assert.equal(meta.suppressible, true);
  assert.equal(meta.copyable, true);
  assert.equal(meta.swappable, true);
  assert.deepEqual(meta.triggers, ['ON_CONTACT_DEFENSE']);
});

test('Lingering Aroma: contact move (Tackle #33) changes attacker ability to Lingering Aroma', () => {
  const s = E.createBattle(oinkologne(), dummy(2, { ability: 'overgrow' }));
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(33) // Tackle: makes contact
  });
  const foe = getFoe(r.state);
  assert.equal(foe.ability, 'lingering-aroma');
  assert.equal(foe.originalAbility, 'overgrow');
  const chgEvt = r.events.find(e => e.type === 'ABILITY_CHANGED');
  assert.ok(chgEvt);
  assert.equal(chgEvt.ability, 'lingering-aroma');
  assert.equal(chgEvt.target, 'enemy');
});

test('Lingering Aroma: non-contact move (Psychic #94) does not trigger Lingering Aroma', () => {
  const s = E.createBattle(oinkologne(), dummy(2, { ability: 'overgrow' }));
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(94) // Psychic: non-contact
  });
  const foe = getFoe(r.state);
  assert.equal(foe.ability, 'overgrow');
  assert.ok(!foe.originalAbility);
  assert.ok(!r.events.some(e => e.type === 'ABILITY_CHANGED'));
});

test('Lingering Aroma: attacker holding Ability Shield is protected', () => {
  const s = E.createBattle(oinkologne(), dummy(2, { ability: 'overgrow', item: 'ability-shield' }));
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(33)
  });
  const foe = getFoe(r.state);
  assert.equal(foe.ability, 'overgrow');
  assert.ok(!foe.originalAbility);
  assert.ok(!r.events.some(e => e.type === 'ABILITY_CHANGED'));
});

test('Lingering Aroma: does not overwrite unoverwritable abilities (e.g. Disguise, Zero to Hero)', () => {
  for (const ab of ['disguise', 'multitype', 'zero-to-hero', 'battle-bond']) {
    const s = E.createBattle(oinkologne(), dummy(2, { ability: ab }));
    const r = E.resolveTurn(s, {
      player: act(14),
      enemy: act(33)
    });
    const foe = getFoe(r.state);
    assert.equal(foe.ability, ab);
    assert.ok(!foe.originalAbility);
  }
});

test('Lingering Aroma: attacker already possessing Lingering Aroma does not trigger redundant change', () => {
  const s = E.createBattle(oinkologne(), dummy(2, { ability: 'lingering-aroma' }));
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(33)
  });
  assert.ok(!r.events.some(e => e.type === 'ABILITY_CHANGED'));
});

test('Lingering Aroma: activates even if defender faints from the contact hit in team battle', () => {
  const s = E.createTeamBattle(
    [oinkologne({ hp: 5, currentHp: 5 }), dummy(5), dummy(6)],
    [dummy(2, { attack: 300, ability: 'intimidate' }), dummy(3), dummy(4)]
  );
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(33) // KOs Oinkologne
  });
  const oink = r.state.player.team[0];
  const foe = r.state.enemy.team[0];
  assert.equal(oink.currentHp, 0);
  assert.equal(foe.ability, 'lingering-aroma');
  assert.equal(foe.originalAbility, 'intimidate');
  assert.ok(r.events.some(e => e.type === 'ABILITY_CHANGED'));
});

test('Lingering Aroma: switch-out restores original ability', () => {
  const s = E.createTeamBattle(
    [oinkologne(), dummy(5), dummy(6)],
    [dummy(2, { ability: 'overgrow' }), dummy(3), dummy(4)]
  );
  const r1 = E.resolveTurn(s, {
    player: act(14),
    enemy: act(33)
  });
  assert.equal(r1.state.enemy.team[0].ability, 'lingering-aroma');

  const r2 = E.resolveTurn(r1.state, {
    player: act(14),
    enemy: { type: 'SWITCH', targetIndex: 1 }
  });
  assert.equal(r2.state.enemy.team[0].ability, 'overgrow');
  assert.ok(!r2.state.enemy.team[0].originalAbility);
});

test('Lingering Aroma: Neutralizing Gas suppresses Lingering Aroma activation', () => {
  const s = E.createBattle(
    oinkologne(),
    dummy(110, { ability: 'neutralizing-gas', moves: [move(33)] })
  );
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(33)
  });
  const foe = getFoe(r.state);
  assert.equal(foe.ability, 'neutralizing-gas');
  assert.ok(!r.events.some(e => e.type === 'ABILITY_CHANGED'));
});
