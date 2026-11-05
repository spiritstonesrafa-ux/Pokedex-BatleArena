const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const aegislash = (extra = {}) => ({
  id: 681,
  name: 'aegislash-shield',
  types: ['steel', 'ghost'],
  level: 50,
  hp: 135,
  maxHp: 135,
  currentHp: 135,
  attack: 70,
  defense: 160,
  specialAttack: 70,
  specialDefense: 160,
  speed: 80,
  weightKg: 53.0,
  ability: 'stance-change',
  baseStats: { hp: 60, attack: 50, defense: 140, specialAttack: 50, specialDefense: 140, speed: 60 },
  moves: [533, 247, 588, 14].map(id => move(id)), // Sacred Sword, Shadow Ball, King's Shield, Swords Dance
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/681.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/681.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/681.ogg',
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
  moves: [33, 14].map(id => move(id)), // Tackle, Swords Dance
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

test('Stance Change: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('stance-change');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.suppressible, false);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
  assert.equal(meta.generation, 6);
});

test('Stance Change: Aegislash starts in Shield Forme', () => {
  const s = E.createBattle(aegislash(), dummy());
  const m = getMon(s);
  assert.equal(m.formSpeciesId, null);
  assert.equal(m.baseStats.defense, 140);
  assert.equal(m.baseStats.attack, 50);
});

test('Stance Change: damaging physical move transforms Aegislash into Blade Forme', () => {
  const s = E.createBattle(aegislash(), dummy());
  const r = E.resolveTurn(s, {
    player: act(533), // Sacred Sword (physical)
    enemy: act(14)
  });
  const m = getMon(r.state);
  assert.equal(m.formSpeciesId, 10026);
  assert.equal(m.baseStats.attack, 140);
  assert.equal(m.baseStats.defense, 50);
  const formEvent = r.events.find(e => e.reason === 'FORM_CHANGED' && e.label === 'aegislash-blade');
  assert.ok(formEvent);
});

test('Stance Change: damaging special move transforms Aegislash into Blade Forme', () => {
  const s = E.createBattle(aegislash(), dummy());
  const r = E.resolveTurn(s, {
    player: act(247), // Shadow Ball (special)
    enemy: act(14)
  });
  const m = getMon(r.state);
  assert.equal(m.formSpeciesId, 10026);
  assert.equal(m.baseStats.specialAttack, 140);
  assert.equal(m.baseStats.specialDefense, 50);
});

test('Stance Change: King\'s Shield transforms Aegislash back to Shield Forme', () => {
  const s = E.createBattle(aegislash(), dummy());
  // Turn 1: Attack into Blade Forme
  const r1 = E.resolveTurn(s, {
    player: act(533),
    enemy: act(14)
  });
  assert.equal(getMon(r1.state).formSpeciesId, 10026);

  // Turn 2: King's Shield into Shield Forme
  const r2 = E.resolveTurn(r1.state, {
    player: act(588), // King's Shield
    enemy: act(33) // Tackle
  });
  const m = getMon(r2.state);
  assert.equal(m.formSpeciesId, null); // Reverted to Shield
  assert.equal(m.baseStats.defense, 140);
  const shieldEvent = r2.events.find(e => e.reason === 'FORM_CHANGED' && e.label === 'aegislash-shield');
  assert.ok(shieldEvent);
});

test('Stance Change: status move other than King\'s Shield does not change form', () => {
  const s = E.createBattle(aegislash(), dummy());
  // Uses Swords Dance while in Shield Forme
  const r1 = E.resolveTurn(s, {
    player: act(14), // Swords Dance
    enemy: act(14)
  });
  assert.equal(getMon(r1.state).formSpeciesId, null); // Stays Shield

  // Attacks to become Blade Forme
  const r2 = E.resolveTurn(r1.state, {
    player: act(533),
    enemy: act(14)
  });
  assert.equal(getMon(r2.state).formSpeciesId, 10026);

  // Uses Swords Dance while in Blade Forme
  const r3 = E.resolveTurn(r2.state, {
    player: act(14), // Swords Dance
    enemy: act(14)
  });
  assert.equal(getMon(r3.state).formSpeciesId, 10026); // Stays Blade
});

test('Stance Change: reverts to Shield Forme on switch-out and enters as Shield Forme', () => {
  const s = E.createBattle(
    team(aegislash()),
    team(dummy(2))
  );
  // Attack into Blade Forme
  const r1 = E.resolveTurn(s, {
    player: act(533),
    enemy: act(14)
  });
  assert.equal(getMon(r1.state).formSpeciesId, 10026);

  // Switch out
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'SWITCH', targetPokemonId: 98 },
    enemy: act(14)
  });
  // Bench mon 681 has reverted to Shield
  const benchAegislash = r2.state.player.team.find(p => p.id === 681);
  assert.equal(benchAegislash.formSpeciesId, null);
  assert.equal(benchAegislash.baseStats.defense, 140);

  // Switch back in
  const r3 = E.resolveTurn(r2.state, {
    player: { type: 'SWITCH', targetPokemonId: 681 },
    enemy: act(14)
  });
  assert.equal(getMon(r3.state).formSpeciesId, null);
  assert.equal(getMon(r3.state).baseStats.defense, 140);
});

test('Stance Change: Terastallization preserves form changing mechanics', () => {
  const s = E.createBattle(
    team(aegislash({ specialMechanic: 'tera', teraType: 'fighting' })),
    team(dummy())
  );
  const r1 = E.resolveTurn(s, {
    player: { ...act(533), special: 'tera' },
    enemy: act(14)
  });
  const m1 = getMon(r1.state);
  assert.equal(m1.tera, 'fighting');
  assert.deepEqual(m1.types, ['fighting']);
  assert.equal(m1.formSpeciesId, 10026); // Transformed into Blade Forme

  const r2 = E.resolveTurn(r1.state, {
    player: act(588), // King's Shield
    enemy: act(14)
  });
  const m2 = getMon(r2.state);
  assert.equal(m2.tera, 'fighting');
  assert.deepEqual(m2.types, ['fighting']);
  assert.equal(m2.formSpeciesId, null); // Reverted to Shield Forme
  assert.equal(m2.baseStats.defense, 140);
});

test('Stance Change: insuppressible', () => {
  const s = E.createBattle(aegislash(), dummy());
  const m = getMon(s);
  m.abilitySuppressed = true;
  assert.equal(C.P7.ability(m), 'stance-change');
});
