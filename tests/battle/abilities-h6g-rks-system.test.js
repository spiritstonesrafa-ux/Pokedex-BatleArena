const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const silvally = (extra = {}) => ({
  id: 773,
  name: 'silvally',
  types: ['normal'],
  level: 50,
  hp: 170,
  maxHp: 170,
  currentHp: 170,
  attack: 115,
  defense: 115,
  specialAttack: 115,
  specialDefense: 115,
  speed: 115,
  weightKg: 100.5,
  ability: 'rks-system',
  baseStats: { hp: 95, attack: 95, defense: 95, specialAttack: 95, specialDefense: 95, speed: 95 },
  moves: [718, 168, 85, 33].map(id => move(id)), // Multi-Attack, Thief, Thunderbolt, Tackle
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/773.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/773.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/773.ogg',
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

test('RKS System: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('rks-system');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.suppressible, false);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
  assert.equal(meta.generation, 7);
});

test('RKS System: Silvally holding Fighting Memory acquires Fighting typing', () => {
  const s = E.createBattle(silvally({ item: 'fighting-memory' }), dummy());
  assert.deepEqual(getMon(s).types, ['fighting']);
});

test('RKS System: Silvally holding Fire Memory acquires Fire typing', () => {
  const s = E.createBattle(silvally({ item: 'fire-memory' }), dummy());
  assert.deepEqual(getMon(s).types, ['fire']);
});

test('RKS System: Silvally holding Fairy Memory acquires Fairy typing', () => {
  const s = E.createBattle(silvally({ item: 'fairy-memory' }), dummy());
  assert.deepEqual(getMon(s).types, ['fairy']);
});

test('RKS System: Silvally holding no item or Leftovers retains Normal typing', () => {
  const s1 = E.createBattle(silvally(), dummy());
  assert.deepEqual(getMon(s1).types, ['normal']);

  const s2 = E.createBattle(silvally({ item: 'leftovers' }), dummy());
  assert.deepEqual(getMon(s2).types, ['normal']);
});

test('RKS System: Multi-Attack adapts type to held Memory and gets STAB', () => {
  const s = E.createBattle(silvally({ item: 'fire-memory' }), dummy(2, { types: ['grass'] }));
  const r = E.resolveTurn(s, {
    player: act(718), // Multi-Attack
    enemy: act(33)
  });
  const dmgEvent = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.moveName === 'multi-attack');
  assert.ok(dmgEvent);
  assert.equal(dmgEvent.attackType, 'fire');
  assert.equal(dmgEvent.typeMultiplier, 2); // Super effective on grass
  assert.equal(dmgEvent.stabMultiplier, 1.5); // STAB matching Fire typing
});

test('RKS System: Memory cannot be stolen from Silvally with Thief', () => {
  const s = E.createBattle(silvally({ item: 'water-memory' }), dummy(2, { item: null }));
  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(168) // Thief
  });
  assert.equal(getMon(r.state, 'player').item, 'water-memory');
  assert.equal(getMon(r.state, 'enemy').item, null);
});

test('RKS System: Memory cannot be removed from Silvally with Knock Off', () => {
  const s = E.createBattle(silvally({ item: 'ghost-memory' }), dummy());
  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(282) // Knock Off
  });
  assert.equal(getMon(r.state, 'player').item, 'ghost-memory');
});

test('RKS System: insuppressible and unalterable', () => {
  const s = E.createBattle(silvally({ item: 'electric-memory' }), dummy());
  const m = getMon(s);
  m.abilitySuppressed = true;
  assert.deepEqual(m.types, ['electric']);
  assert.equal(C.P7.ability(m), 'rks-system');
});

test('RKS System: Terastallization changes active typing but preserves Memory', () => {
  const s = E.createBattle(
    team(silvally({ item: 'grass-memory', specialMechanic: 'tera', teraType: 'dragon' })),
    team(dummy())
  );
  assert.deepEqual(getMon(s).types, ['grass']);
  const r = E.resolveTurn(s, {
    player: { ...act(718), special: 'tera' },
    enemy: act(33)
  });
  assert.equal(getMon(r.state).tera, 'dragon');
  assert.deepEqual(getMon(r.state).types, ['dragon']);
  assert.equal(getMon(r.state).item, 'grass-memory');
});

test('RKS System: Memory type is preserved across switch-out and switch-in', () => {
  const s = E.createBattle(
    team(silvally({ item: 'psychic-memory' })),
    team(dummy(2))
  );
  assert.deepEqual(getMon(s).types, ['psychic']);
  const r1 = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetPokemonId: 98 },
    enemy: act(33)
  });
  assert.equal(getMon(r1.state).id, 98);
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'SWITCH', targetPokemonId: 773 },
    enemy: act(33)
  });
  assert.equal(getMon(r2.state).id, 773);
  assert.deepEqual(getMon(r2.state).types, ['psychic']);
});
