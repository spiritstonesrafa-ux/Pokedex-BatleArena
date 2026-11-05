const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const arceus = (extra = {}) => ({
  id: 493,
  name: 'arceus',
  types: ['normal'],
  level: 50,
  hp: 195,
  maxHp: 195,
  currentHp: 195,
  attack: 140,
  defense: 140,
  specialAttack: 140,
  specialDefense: 140,
  speed: 140,
  weightKg: 320,
  ability: 'multitype',
  baseStats: { hp: 120, attack: 120, defense: 120, specialAttack: 120, specialDefense: 120, speed: 120 },
  moves: [449, 168, 85, 33].map(id => move(id)), // Judgment, Thief, Thunderbolt, Tackle
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/493.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/493.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/493.ogg',
  ...extra
});

const dummy = (id = 2, extra = {}) => ({
  id,
  name: 'dummy-' + id,
  types: ['normal'],
  level: 50,
  hp: 1000,
  maxHp: 1000,
  currentHp: 1000,
  attack: 100,
  defense: 100,
  specialAttack: 100,
  specialDefense: 100,
  speed: 10,
  ability: 'overgrow',
  moves: [33, 168, 282, 14].map(id => move(id)), // Tackle, Thief, Knock Off, Swords Dance
  ...extra
});

const team = (m1, m2 = dummy(98), m3 = dummy(99)) => [m1, m2, m3];
const getMon = (s, r = 'player') => s[r].team ? s[r].team[s[r].activeIndex || 0] : s[r];

const act = (id, extra = {}) => ({
  type: 'MOVE',
  moveId: id,
  accuracyRoll: 1,
  damageRoll: 100,
  criticalRoll: 24,
  secondaryEffectRoll: 100,
  ...extra
});

test('Multitype: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('multitype');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.suppressible, false);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
  assert.equal(meta.generation, 4);
});

test('Multitype: Arceus holding Flame Plate acquires Fire typing', () => {
  const s = E.createBattle(arceus({ item: 'flame-plate' }), dummy());
  assert.deepEqual(getMon(s).types, ['fire']);
});

test('Multitype: Arceus holding Splash Plate acquires Water typing', () => {
  const s = E.createBattle(arceus({ item: 'splash-plate' }), dummy());
  assert.deepEqual(getMon(s).types, ['water']);
});

test('Multitype: Arceus holding Zap Plate acquires Electric typing', () => {
  const s = E.createBattle(arceus({ item: 'zap-plate' }), dummy());
  assert.deepEqual(getMon(s).types, ['electric']);
});

test('Multitype: Arceus holding no item or Leftovers retains Normal typing', () => {
  const s1 = E.createBattle(arceus(), dummy());
  assert.deepEqual(getMon(s1).types, ['normal']);

  const s2 = E.createBattle(arceus({ item: 'leftovers' }), dummy());
  assert.deepEqual(getMon(s2).types, ['normal']);
});

test('Multitype: Judgment adapts type to held Plate', () => {
  const s = E.createBattle(arceus({ item: 'flame-plate' }), dummy(2, { types: ['grass'] }));
  const r = E.resolveTurn(s, {
    player: act(449),
    enemy: act(33)
  });
  const dmgEvent = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.moveName === 'judgment');
  assert.ok(dmgEvent);
  assert.equal(dmgEvent.attackType, 'fire');
  assert.equal(dmgEvent.typeMultiplier, 2); // Fire is super effective against Grass
});

test('Multitype: Plate cannot be stolen from Arceus with Thief', () => {
  const s = E.createBattle(arceus({ item: 'splash-plate' }), dummy(2, { item: null }));
  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(168) // Enemy uses Thief on Arceus
  });
  assert.equal(getMon(r.state, 'player').item, 'splash-plate');
  assert.equal(getMon(r.state, 'enemy').item, null);
});

test('Multitype: Plate cannot be removed from Arceus with Knock Off', () => {
  const s = E.createBattle(arceus({ item: 'draco-plate' }), dummy());
  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(282) // Knock Off
  });
  assert.equal(getMon(r.state, 'player').item, 'draco-plate');
});

test('Multitype: insuppressible and unalterable', () => {
  const s = E.createBattle(arceus({ item: 'fist-plate' }), dummy());
  const m = getMon(s);
  m.abilitySuppressed = true;
  assert.deepEqual(m.types, ['fighting']);
  assert.equal(C.P7.ability(m), 'multitype');
});

test('Multitype: Terastallization changes active typing but preserves Multitype and Plate', () => {
  const s = E.createBattle(
    team(arceus({ item: 'pixie-plate', specialMechanic: 'tera', teraType: 'steel' })),
    team(dummy())
  );
  assert.deepEqual(getMon(s).types, ['fairy']);
  const r = E.resolveTurn(s, {
    player: { ...act(449), special: 'tera' },
    enemy: act(33)
  });
  assert.equal(getMon(r.state).tera, 'steel');
  assert.deepEqual(getMon(r.state).types, ['steel']);
  assert.equal(getMon(r.state).item, 'pixie-plate');
});

test('Multitype: Plate type is preserved across switch-out and switch-in', () => {
  const s = E.createBattle(
    team(arceus({ item: 'toxic-plate' })),
    team(dummy(2))
  );
  assert.deepEqual(getMon(s).types, ['poison']);
  const r1 = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetPokemonId: 98 },
    enemy: act(33)
  });
  assert.equal(getMon(r1.state).id, 98);
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'SWITCH', targetPokemonId: 493 },
    enemy: act(33)
  });
  assert.equal(getMon(r2.state).id, 493);
  assert.deepEqual(getMon(r2.state).types, ['poison']);
});
