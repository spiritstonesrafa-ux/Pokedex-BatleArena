const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const zoroark = (extra = {}) => ({
  id: 571,
  name: 'zoroark',
  types: ['dark'],
  level: 50,
  hp: 135,
  maxHp: 135,
  currentHp: 135,
  attack: 125,
  defense: 80,
  specialAttack: 140,
  specialDefense: 80,
  speed: 125,
  ability: 'illusion',
  baseStats: { hp: 60, attack: 105, defense: 60, specialAttack: 120, specialDefense: 60, speed: 105 },
  moves: [14, 399, 98, 33].map(id => move(id)), // Swords Dance, Dark Pulse, Quick Attack, Tackle
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/571.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/571.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/571.ogg',
  sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/571.png',
  ...extra
});

const pikachu = (extra = {}) => ({
  id: 25,
  name: 'pikachu',
  types: ['electric'],
  level: 50,
  hp: 110,
  maxHp: 110,
  currentHp: 110,
  attack: 75,
  defense: 60,
  specialAttack: 70,
  specialDefense: 70,
  speed: 110,
  ability: 'static',
  baseStats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90 },
  moves: [14, 33].map(id => move(id)),
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/25.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/25.ogg',
  sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png',
  ...extra
});

const charizard = (extra = {}) => ({
  id: 6,
  name: 'charizard',
  types: ['fire', 'flying'],
  level: 50,
  hp: 153,
  maxHp: 153,
  currentHp: 153,
  attack: 104,
  defense: 98,
  specialAttack: 129,
  specialDefense: 105,
  speed: 120,
  ability: 'blaze',
  baseStats: { hp: 78, attack: 84, defense: 78, specialAttack: 109, specialDefense: 85, speed: 100 },
  moves: [14, 53].map(id => move(id)),
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/6.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/6.ogg',
  sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png',
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
  moves: [14, 33, 247, 94].map(id => move(id)), // Swords Dance, Tackle (normal physical), Shadow Ball (ghost special), Psychic (psychic special)
  ...extra
});

const team = (...mons) => mons;
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

test('Illusion: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('illusion');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.suppressible, true);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
  assert.equal(meta.generation, 5);
});

test('Illusion: copies appearance of last conscious team member upon entry', () => {
  // Team: [Zoroark (lead), Pikachu, Charizard (last)]
  const s = E.createBattle(
    team(zoroark(), pikachu(), charizard()),
    team(dummy(2), dummy(3), dummy(4))
  );

  const active = getMon(s);
  assert.ok(active.illusionDisguise, 'Illusion disguise is active');
  assert.equal(active.name, 'charizard');
  assert.equal(active.photo, charizard().photo);
  assert.equal(active.sprite, charizard().sprite);
  assert.deepEqual(active.illusionDisguise.types, ['fire', 'flying']);

  // Actual mechanics remain Zoroark
  assert.equal(active.id, 571);
  assert.deepEqual(active.types, ['dark']);
  assert.equal(active.ability, 'illusion');
});

test('Illusion: skips fainted team members and copies last conscious member', () => {
  // Team: [Zoroark, Pikachu, Charizard (fainted)]
  const s = E.createBattle(
    team(zoroark(), pikachu(), charizard({ currentHp: 0, hp: 0 })),
    team(dummy(2), dummy(3), dummy(4))
  );

  const active = getMon(s);
  assert.ok(active.illusionDisguise, 'Illusion disguise is active');
  assert.equal(active.name, 'pikachu');
  assert.equal(active.photo, pikachu().photo);
  assert.equal(active.sprite, pikachu().sprite);
});

test('Illusion: breaks upon taking direct damage from an attack', () => {
  const s = E.createBattle(
    team(zoroark(), pikachu(), charizard()),
    team(dummy(2), dummy(3), dummy(4))
  );

  assert.equal(getMon(s).name, 'charizard');

  // Enemy attacks with Tackle (id 33) which deals damage
  const r = E.resolveTurn(s, {
    player: act(14), // Swords Dance
    enemy: act(33)  // Tackle
  });

  const active = getMon(r.state);
  assert.equal(active.illusionDisguise, null);
  assert.equal(active.name, 'zoroark');
  assert.equal(active.photo, zoroark().photo);
  assert.equal(active.sprite, zoroark().sprite);

  const breakEvent = r.events.find(e => e.type === 'ILLUSION_BROKEN');
  assert.ok(breakEvent, 'ILLUSION_BROKEN event emitted');
});

test('Illusion: does not break on status moves (0 damage)', () => {
  const s = E.createBattle(
    team(zoroark(), pikachu(), charizard()),
    team(dummy(2), dummy(3), dummy(4))
  );

  // Both use status moves
  const r = E.resolveTurn(s, {
    player: act(14), // Swords Dance
    enemy: act(14)  // Swords Dance
  });

  const active = getMon(r.state);
  assert.ok(active.illusionDisguise, 'Illusion disguise is still active');
  assert.equal(active.name, 'charizard');
});

test('Illusion: does not break when immune attack deals 0 damage', () => {
  const s = E.createBattle(
    team(zoroark(), pikachu(), charizard()),
    team(dummy(2), dummy(3), dummy(4))
  );

  // Enemy uses Shadow Ball (Ghost vs Dark is resisted, but let's test Psychic or non-effective if immune,
  // or Psychic against Dark has 0 multiplier).
  // Dark is immune to Psychic. Let's use Psychic (id 94):
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(94) // Psychic (category special, type psychic -> 0x vs Dark)
  });

  const active = getMon(r.state);
  assert.ok(active.illusionDisguise, 'Illusion disguise is still active after immune attack');
  assert.equal(active.name, 'charizard');
});

test('Illusion: breaks immediately upon Terastallization', () => {
  const s = E.createBattle(
    team(zoroark({ specialMechanic: 'tera', teraType: 'dark' }), pikachu(), charizard()),
    team(dummy(2), dummy(3), dummy(4))
  );

  assert.equal(getMon(s).name, 'charizard');

  // Activate Tera
  const r = E.resolveTurn(s, {
    player: { ...act(14), special: 'tera' },
    enemy: act(14)
  });

  const active = getMon(r.state);
  assert.equal(active.illusionDisguise, null);
  assert.equal(active.name, 'zoroark');
  assert.ok(r.events.some(e => e.type === 'ILLUSION_BROKEN'), 'ILLUSION_BROKEN emitted on Tera');
});

test('Illusion: re-activates upon switching out and back in', () => {
  const s = E.createBattle(
    team(zoroark(), pikachu(), charizard()),
    team(dummy(2), dummy(3), dummy(4))
  );

  // Turn 1: Enemy deals damage, breaking Illusion
  const r1 = E.resolveTurn(s, {
    player: act(14),
    enemy: act(33)
  });
  assert.equal(getMon(r1.state).illusionDisguise, null);
  assert.equal(getMon(r1.state).name, 'zoroark');

  // Turn 2: Switch to Pikachu
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: act(14)
  });
  assert.equal(r2.state.player.activeIndex, 1);
  assert.equal(r2.state.player.team[0].name, 'zoroark'); // bench mon has original name

  // Turn 3: Switch back to Zoroark
  const r3 = E.resolveTurn(r2.state, {
    player: { type: 'SWITCH', targetIndex: 0 },
    enemy: act(14)
  });
  assert.equal(r3.state.player.activeIndex, 0);
  const active = getMon(r3.state);
  assert.ok(active.illusionDisguise, 'Illusion re-activated on switch-in');
  assert.equal(active.name, 'charizard');
});

test('Illusion: does not activate in 1v1 battle without teammates', () => {
  const s = E.createBattle(zoroark(), dummy(2));
  const active = getMon(s);

  assert.equal(active.illusionDisguise, undefined);
  assert.equal(active.name, 'zoroark');
});
