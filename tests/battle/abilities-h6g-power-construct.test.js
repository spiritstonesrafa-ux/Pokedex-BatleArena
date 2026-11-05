const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P8 = require('../../assets/js/battle/p8-special');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const zygarde50 = (extra = {}) => ({
  id: 718,
  name: 'zygarde',
  types: ['dragon', 'ground'],
  level: 50,
  hp: 183,
  maxHp: 183,
  currentHp: 183,
  attack: 120,
  defense: 141,
  specialAttack: 101,
  specialDefense: 115,
  speed: 115,
  weightKg: 305.0,
  baseStats: { hp: 108, attack: 100, defense: 121, specialAttack: 81, specialDefense: 95, speed: 95 },
  ability: 'power-construct',
  moves: [14, 98].map(id => move(id)), // Swords Dance, Quick Attack
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/718.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/718.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/718.ogg',
  ...extra
});

const zygarde10 = (extra = {}) => ({
  id: 10118,
  name: 'zygarde-10',
  types: ['dragon', 'ground'],
  level: 50,
  hp: 129,
  maxHp: 129,
  currentHp: 129,
  attack: 120,
  defense: 91,
  specialAttack: 81,
  specialDefense: 105,
  speed: 135,
  weightKg: 33.5,
  baseStats: { hp: 54, attack: 100, defense: 71, specialAttack: 61, specialDefense: 85, speed: 115 },
  ability: 'power-construct',
  moves: [14, 98].map(id => move(id)),
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10118.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10118.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/10118.ogg',
  ...extra
});

const dummy = (id = 2, extra = {}) => ({
  id,
  name: `dummy-${id}`,
  types: ['normal'],
  level: 50,
  hp: 1000,
  maxHp: 1000,
  currentHp: 1000,
  attack: 100,
  defense: 100,
  specialAttack: 100,
  specialDefense: 100,
  speed: 80,
  baseStats: { hp: 100, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 80 },
  ability: 'run-away',
  moves: [14, 33].map(id => move(id)),
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

test('Power Construct: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('power-construct');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.suppressible, false);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
  assert.equal(meta.generation, 7);
});

test('Power Construct: Zygarde 50% does not transform when HP is above 50% at turn end', () => {
  const s = E.createBattle(zygarde50({ currentHp: 150, hp: 150 }), dummy());
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(14)
  });
  const m = getMon(r.state);

  assert.equal(m.formSpeciesId, null);
  assert.equal(m.powerConstructTransformed, undefined);
  assert.equal(m.maxHp, 183);
});

test('Power Construct: Zygarde 50% transforms into Complete Forme at end of turn when HP <= 50%', () => {
  const s = E.createBattle(zygarde50({ currentHp: 80, hp: 80 }), dummy()); // 80 <= 91
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(14)
  });
  const m = getMon(r.state);

  assert.equal(Number(m.formSpeciesId), 10120);
  assert.equal(m.powerConstructTransformed, true);

  // HP calculation check:
  // old maxHp = 183, new maxHp = 291
  // currentHp should be 80 + (291 - 183) = 188
  assert.equal(m.maxHp, 291);
  assert.equal(m.currentHp, 188);

  const formChange = r.events.find(e => e.reason === 'FORM_CHANGED' && e.label === 'zygarde-complete');
  assert.ok(formChange, 'FORM_CHANGED event emitted for Zygarde Complete Forme');
});

test('Power Construct: Complete Forme stats update to base stats (216/100/121/91/95/85)', () => {
  const s = E.createBattle(zygarde50({ currentHp: 50, hp: 50 }), dummy());
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(14)
  });
  const m = getMon(r.state);

  assert.equal(m.baseStats.hp, 216);
  assert.equal(m.baseStats.specialAttack, 91);
  assert.equal(m.baseStats.speed, 85);
});

test('Power Construct: Zygarde 10% transforms into Complete Forme when HP <= 50%', () => {
  const s = E.createBattle(zygarde10({ currentHp: 50, hp: 50 }), dummy()); // 50 <= 64
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(14)
  });
  const m = getMon(r.state);

  assert.equal(Number(m.formSpeciesId), 10120);
  assert.equal(m.powerConstructTransformed, true);
  assert.equal(m.maxHp, 291);
  // newHp = 50 + (291 - 129) = 212
  assert.equal(m.currentHp, 212);
});

test('Power Construct: Complete Forme does not revert if HP is restored above 50%', () => {
  const s = E.createBattle(zygarde50({ currentHp: 80, hp: 80 }), dummy());
  const r1 = E.resolveTurn(s, {
    player: act(14),
    enemy: act(14)
  });
  const m1 = getMon(r1.state);
  assert.equal(Number(m1.formSpeciesId), 10120);

  // Heal to full
  m1.currentHp = m1.maxHp;

  // Run another turn
  const r2 = E.resolveTurn(r1.state, {
    player: act(14),
    enemy: act(14)
  });
  const m2 = getMon(r2.state);
  assert.equal(Number(m2.formSpeciesId), 10120);
  assert.equal(m2.powerConstructTransformed, true);
});

test('Power Construct: Complete Forme persists when switched out and back in', () => {
  const s = E.createBattle(
    team(zygarde50({ currentHp: 80, hp: 80 })),
    team(dummy(2), dummy(3), dummy(4))
  );

  // Turn 1: Transform to Complete
  const r1 = E.resolveTurn(s, {
    player: act(14),
    enemy: act(14)
  });
  assert.equal(Number(r1.state.player.team[0].formSpeciesId), 10120);

  // Turn 2: Switch to dummy-98
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: act(14)
  });
  assert.equal(r2.state.player.activeIndex, 1);
  // Zygarde on bench retains Complete Forme
  assert.equal(Number(r2.state.player.team[0].formSpeciesId), 10120);
  assert.equal(r2.state.player.team[0].powerConstructTransformed, true);

  // Turn 3: Switch back to Zygarde
  const r3 = E.resolveTurn(r2.state, {
    player: { type: 'SWITCH', targetIndex: 0 },
    enemy: act(14)
  });
  assert.equal(r3.state.player.activeIndex, 0);
  assert.equal(Number(r3.state.player.team[0].formSpeciesId), 10120);
  assert.equal(r3.state.player.team[0].maxHp, 291);
});

test('Power Construct: Power Construct cannot be suppressed (insuppressible)', () => {
  const s = E.createBattle(zygarde50({ currentHp: 80, hp: 80 }), dummy());
  getMon(s).abilitySuppressed = true;

  // In P7/P8, power-construct is unsuppressible so ab(m) returns 'power-construct'
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(14)
  });
  const m = getMon(r.state);

  assert.equal(Number(m.formSpeciesId), 10120);
  assert.equal(m.powerConstructTransformed, true);
});

test('Power Construct: resets to base form when battle ends', () => {
  const s = E.createBattle(
    team(zygarde50({ currentHp: 80, hp: 80 })),
    team(dummy(2), dummy(3), dummy(4))
  );

  // Turn 1: Transform to Complete
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(14)
  });
  assert.equal(Number(r.state.player.team[0].formSpeciesId), 10120);

  // Simulate battle ending via leave(m, true)
  P8.leave(r.state.player.team[0], true);
  assert.equal(r.state.player.team[0].formSpeciesId, null);
  assert.equal(r.state.player.team[0].powerConstructTransformed, false);
  assert.equal(r.state.player.team[0].maxHp, 183);
});
