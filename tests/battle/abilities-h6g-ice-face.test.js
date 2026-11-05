const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const eiscue = (extra = {}) => ({
  id: 875,
  name: 'eiscue-ice',
  types: ['ice'],
  level: 50,
  hp: 150,
  maxHp: 150,
  currentHp: 150,
  attack: 100,
  defense: 130,
  specialAttack: 85,
  specialDefense: 110,
  speed: 70,
  weightKg: 89.0,
  ability: 'ice-face',
  baseStats: { hp: 75, attack: 80, defense: 110, specialAttack: 65, specialDefense: 90, speed: 50 },
  moves: [861, 33, 883, 14].map(id => move(id)), // Ice Spinner, Tackle, Snowscape, Swords Dance
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/875.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/875.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/875.ogg',
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
  speed: 200,
  ability: 'overgrow',
  moves: [33, 53, 14, 883].map(id => move(id)), // Tackle (physical), Flamethrower (special), Swords Dance, Snowscape
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

test('Ice Face: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('ice-face');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.suppressible, true);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
  assert.equal(meta.breakable, true);
  assert.equal(meta.generation, 8);
});

test('Ice Face: Eiscue starts in Ice Face Form with base Def 110, Spe 50', () => {
  const s = E.createBattle(eiscue(), dummy());
  const m = getMon(s);
  assert.equal(m.formSpeciesId, null);
  assert.equal(m.baseStats.defense, 110);
  assert.equal(m.baseStats.speed, 50);
});

test('Ice Face: blocks physical damage and transforms into Noice Face Form', () => {
  const s = E.createBattle(eiscue(), dummy());
  const initialHp = getMon(s).currentHp;

  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(33) // Tackle (physical, speed 200 attacks first)
  });

  const m = getMon(r.state);
  assert.equal(m.currentHp, initialHp); // 0 damage
  assert.equal(m.formSpeciesId, 10185);
  assert.equal(m.baseStats.defense, 70);
  assert.equal(m.baseStats.speed, 130);
  assert.ok(r.events.some(e => e.type === 'ICE_FACE_BROKEN'));
});

test('Ice Face: special attack is not blocked and does not break Ice Face', () => {
  const s = E.createBattle(eiscue(), dummy());
  const initialHp = getMon(s).currentHp;

  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(53) // Flamethrower (special)
  });

  const m = getMon(r.state);
  assert.ok(m.currentHp < initialHp); // Takes full damage
  assert.equal(m.formSpeciesId, null); // Stays in Ice Face Form
  assert.equal(m.baseStats.defense, 110);
});

test('Ice Face: multi-hit physical move breaks face on 1st hit, subsequent hits deal damage', () => {
  const s = E.createBattle(eiscue(), dummy(2, { moves: [move(331)] })); // Bullet Seed (physical multi-hit)
  const initialHp = getMon(s).currentHp;

  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(331, { hitCount: 3 })
  });

  const m = getMon(r.state);
  assert.equal(m.formSpeciesId, 10185);
  assert.ok(m.currentHp < initialHp); // Subsequent hits damaged Noice Face
});

test('Ice Face: Snowscape weather restores Ice Face Form from Noice Face', () => {
  const s = E.createBattle(eiscue(), dummy());
  // Turn 1: Physical hit breaks Ice Face into Noice Face
  const r1 = E.resolveTurn(s, {
    player: act(33),
    enemy: act(33)
  });
  assert.equal(getMon(r1.state).formSpeciesId, 10185);

  // Turn 2: Eiscue uses Snowscape (#883)
  const r2 = E.resolveTurn(r1.state, {
    player: act(883),
    enemy: act(14)
  });
  const m2 = getMon(r2.state);
  assert.equal(m2.formSpeciesId, null); // Restored to Ice Face
  assert.equal(m2.baseStats.defense, 110);
  assert.equal(m2.baseStats.speed, 50);
});

test('Ice Face: switching in while Snow is active restores Ice Face Form', () => {
  const s = E.createBattle(
    team(eiscue()),
    team(dummy(2))
  );
  // Turn 1: Break Ice Face
  const r1 = E.resolveTurn(s, {
    player: act(33),
    enemy: act(33)
  });
  assert.equal(getMon(r1.state).formSpeciesId, 10185);

  // Turn 2: Switch to ally while enemy sets Snowscape
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'SWITCH', targetPokemonId: 98 },
    enemy: act(883) // Enemy casts Snowscape
  });
  assert.equal(r2.state.weather?.id, 'snow');

  // Turn 3: Switch back to Eiscue in Snow
  const r3 = E.resolveTurn(r2.state, {
    player: { type: 'SWITCH', targetPokemonId: 875 },
    enemy: act(14)
  });
  const m3 = getMon(r3.state);
  assert.equal(m3.formSpeciesId, null); // Restored on entry under snow!
  assert.equal(m3.baseStats.defense, 110);
});

test('Ice Face: Mold Breaker bypasses Ice Face physical block', () => {
  const s = E.createBattle(
    eiscue(),
    dummy(2, { ability: 'mold-breaker', moves: [move(33)] })
  );
  const initialHp = getMon(s).currentHp;

  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(33) // Mold Breaker Tackle
  });

  const m = getMon(r.state);
  assert.ok(m.currentHp < initialHp); // Took damage through Ice Face!
  assert.equal(m.formSpeciesId, null); // Ice Face was not broken because Mold Breaker ignored the ability
});

test('Ice Face: suppressed ability does not block physical damage', () => {
  const s = E.createBattle(eiscue(), dummy());
  getMon(s).abilitySuppressed = true;
  const initialHp = getMon(s).currentHp;

  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(33)
  });

  const m = getMon(r.state);
  assert.ok(m.currentHp < initialHp);
});

test('Ice Face: Terastallized Eiscue functions normally with Ice Face', () => {
  const s = E.createBattle(
    team(eiscue({ specialMechanic: 'tera', teraType: 'water' })),
    team(dummy())
  );
  const r = E.resolveTurn(s, {
    player: { ...act(33), special: 'tera' },
    enemy: act(33) // Enemy physical attack
  });
  const m = getMon(r.state);
  assert.equal(m.tera, 'water');
  assert.equal(m.formSpeciesId, 10185); // Noice Face Form
  assert.equal(m.baseStats.speed, 130);
});
