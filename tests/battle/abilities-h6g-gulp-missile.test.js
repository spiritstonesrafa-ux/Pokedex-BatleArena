const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const cramorant = (extra = {}) => ({
  id: 845,
  name: 'cramorant',
  types: ['flying', 'water'],
  level: 50,
  hp: 145,
  maxHp: 145,
  currentHp: 145,
  attack: 105,
  defense: 75,
  specialAttack: 105,
  specialDefense: 115,
  speed: 105,
  weightKg: 18.0,
  ability: 'gulp-missile',
  baseStats: { hp: 70, attack: 85, defense: 55, specialAttack: 85, specialDefense: 95, speed: 85 },
  moves: [57, 291, 65, 14].map(id => move(id)), // Surf, Dive, Drill Peck, Swords Dance
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/845.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/845.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/845.ogg',
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

test('Gulp Missile: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('gulp-missile');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.suppressible, true);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
  assert.equal(meta.generation, 8);
});

test('Gulp Missile: Cramorant starts in standard form', () => {
  const s = E.createBattle(cramorant(), dummy());
  assert.equal(getMon(s).formSpeciesId, null);
});

test('Gulp Missile: Surf with HP > 50% triggers Gulping Form', () => {
  const s = E.createBattle(cramorant({ currentHp: 145, maxHp: 145 }), dummy());
  const r = E.resolveTurn(s, {
    player: act(57), // Surf
    enemy: act(14)
  });
  const m = getMon(r.state);
  assert.equal(m.formSpeciesId, 10182); // cramorant-gulping
  const formEvt = r.events.find(e => e.reason === 'FORM_CHANGED' && e.label === 'cramorant-gulping');
  assert.ok(formEvt);
});

test('Gulp Missile: Surf with HP <= 50% triggers Gorging Form', () => {
  const s = E.createBattle(cramorant({ currentHp: 60, maxHp: 145 }), dummy());
  const r = E.resolveTurn(s, {
    player: act(57), // Surf
    enemy: act(14)
  });
  const m = getMon(r.state);
  assert.equal(m.formSpeciesId, 10183); // cramorant-gorging
  const formEvt = r.events.find(e => e.reason === 'FORM_CHANGED' && e.label === 'cramorant-gorging');
  assert.ok(formEvt);
});

test('Gulp Missile: Gulping Form retaliation deals 1/4 max HP damage and lowers Def by 1', () => {
  const s = E.createBattle(
    cramorant({ formSpeciesId: 10182 }),
    dummy(2, { hp: 200, maxHp: 200, currentHp: 200, speed: 200 }) // Faster dummy
  );
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(33) // Enemy tackles Cramorant
  });
  const enemyMon = getMon(r.state, 'enemy');
  // Expected retaliation: Math.floor(200 / 4) = 50 damage
  assert.equal(enemyMon.currentHp, 150);
  assert.equal(enemyMon.statStages?.defense, -1);
  assert.equal(getMon(r.state, 'player').formSpeciesId, null); // Reverted to standard
  assert.ok(r.events.some(e => e.type === 'GULP_MISSILE_TRIGGERED'));
});

test('Gulp Missile: Gorging Form retaliation deals 1/4 max HP damage and paralyzes attacker', () => {
  const s = E.createBattle(
    cramorant({ formSpeciesId: 10183 }),
    dummy(2, { hp: 200, maxHp: 200, currentHp: 200, speed: 200 })
  );
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(33) // Enemy tackles Cramorant
  });
  const enemyMon = getMon(r.state, 'enemy');
  assert.equal(enemyMon.currentHp, 150);
  assert.equal(enemyMon.statusCondition, 'paralysis');
  assert.equal(getMon(r.state, 'player').formSpeciesId, null); // Reverted
  assert.ok(r.events.some(e => e.type === 'GULP_MISSILE_TRIGGERED'));
});

test('Gulp Missile: retaliation fires even if Cramorant faints from incoming attack', () => {
  const s = E.createBattle(
    team(cramorant({ formSpeciesId: 10182, currentHp: 5 })),
    team(dummy(2, { speed: 200, hp: 200, maxHp: 200, currentHp: 200 }))
  );
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(33) // Hits for > 5 damage, faints Cramorant
  });
  assert.equal(r.state.player.team[0].currentHp, 0); // Cramorant fainted
  assert.equal(getMon(r.state, 'enemy').currentHp, 150); // Attacker took 50 spit damage!
  assert.ok(r.events.some(e => e.type === 'GULP_MISSILE_TRIGGERED'));
});

test('Gulp Missile: status move does not trigger retaliation', () => {
  const s = E.createBattle(
    cramorant({ formSpeciesId: 10182 }),
    dummy(2, { speed: 200 })
  );
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(14) // Swords Dance (status move)
  });
  assert.equal(getMon(r.state, 'player').formSpeciesId, 10182); // Still Gulping Form
  assert.equal(getMon(r.state, 'enemy').currentHp, 200); // No damage taken
});

test('Gulp Missile: switch-out reverts Cramorant to standard form', () => {
  const s = E.createBattle(
    team(cramorant({ formSpeciesId: 10182 })),
    team(dummy(2))
  );
  const r1 = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetPokemonId: 98 },
    enemy: act(14)
  });
  const benchCramorant = r1.state.player.team.find(p => p.id === 845);
  assert.equal(benchCramorant.formSpeciesId, null);
});

test('Gulp Missile: suppressed ability disables form change and retaliation', () => {
  const s = E.createBattle(cramorant(), dummy());
  getMon(s).abilitySuppressed = true;
  const r = E.resolveTurn(s, {
    player: act(57), // Surf
    enemy: act(14)
  });
  assert.equal(getMon(r.state).formSpeciesId, null); // Did not transform
});

test('Gulp Missile: Terastallization works normally with Gulp Missile', () => {
  const s = E.createBattle(
    team(cramorant({ specialMechanic: 'tera', teraType: 'water' })),
    team(dummy())
  );
  const r = E.resolveTurn(s, {
    player: { ...act(57), special: 'tera' },
    enemy: act(14)
  });
  const m = getMon(r.state);
  assert.equal(m.tera, 'water');
  assert.equal(m.formSpeciesId, 10182); // Gulping Form
});
