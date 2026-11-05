const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const mimikyu = (extra = {}) => ({
  id: 778,
  name: 'mimikyu-disguised',
  types: ['ghost', 'fairy'],
  level: 50,
  hp: 130,
  maxHp: 130,
  currentHp: 130,
  attack: 110,
  defense: 100,
  specialAttack: 70,
  specialDefense: 125,
  speed: 116,
  weightKg: 0.7,
  ability: 'disguise',
  baseStats: { hp: 55, attack: 90, defense: 80, specialAttack: 50, specialDefense: 105, speed: 96 },
  moves: [421, 583, 33, 14].map(id => move(id)), // Shadow Claw, Play Rough, Tackle, Swords Dance
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/778.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/778.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/778.ogg',
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
  speed: 200, // Faster than Mimikyu so it attacks first
  ability: 'overgrow',
  moves: [33, 85, 331, 14].map(id => move(id)), // Tackle, Thunderbolt, Bullet Seed (multi-hit), Swords Dance
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

test('Disguise: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('disguise');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.suppressible, false);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
  assert.equal(meta.breakable, true);
  assert.equal(meta.generation, 7);
});

test('Disguise: Mimikyu starts in Disguised Form', () => {
  const s = E.createBattle(mimikyu(), dummy());
  const m = getMon(s);
  assert.equal(m.formSpeciesId, null);
  assert.equal(m.disguiseBroken, undefined);
});

test('Disguise: first direct attack is blocked and causes 1/8 max HP Gen IX recoil', () => {
  const s = E.createBattle(mimikyu(), dummy());
  const initialHp = getMon(s).currentHp; // 130
  const expectedRecoil = Math.floor(130 / 8); // 16

  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(85) // Thunderbolt (speed 200 attacks first)
  });

  const m = getMon(r.state);
  assert.equal(m.disguiseBroken, true);
  assert.equal(m.formSpeciesId, 10143);
  assert.equal(m.currentHp, initialHp - expectedRecoil);

  // Check event sequence
  assert.ok(r.events.some(e => e.type === 'DISGUISE_BROKEN'));
  const recoilEvt = r.events.find(e => e.type === 'DISGUISE_RECOIL');
  assert.ok(recoilEvt);
  assert.equal(recoilEvt.recoilDamage, expectedRecoil);
});

test('Disguise: second direct attack deals full direct damage', () => {
  const s = E.createBattle(mimikyu(), dummy());
  // Turn 1: Disguise breaks
  const r1 = E.resolveTurn(s, {
    player: act(33),
    enemy: act(85)
  });
  const hpAfterT1 = getMon(r1.state).currentHp;

  // Turn 2: Takes full damage
  const r2 = E.resolveTurn(r1.state, {
    player: act(33),
    enemy: act(85)
  });
  const m2 = getMon(r2.state);
  assert.ok(m2.currentHp < hpAfterT1);
  const dmgEvt = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'player');
  assert.ok(dmgEvt);
  assert.ok(dmgEvt.damage > 0);
});

test('Disguise: multi-hit move breaks disguise on 1st hit, subsequent hits deal damage', () => {
  const s = E.createBattle(mimikyu(), dummy(2, { moves: [move(331)] })); // Bullet Seed (id 331, multi-hit)
  const initialHp = getMon(s).currentHp; // 130
  const expectedRecoil = Math.floor(130 / 8); // 16

  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(331, { hitCount: 3 })
  });
  const m = getMon(r.state);
  assert.equal(m.disguiseBroken, true);
  assert.equal(m.formSpeciesId, 10143);
  // Total damage should include 16 recoil + damage from subsequent hits
  assert.ok(m.currentHp < initialHp - expectedRecoil);
});

test('Disguise: status move does not break disguise', () => {
  const s = E.createBattle(mimikyu(), dummy(2, { moves: [move(14)] })); // Swords Dance
  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(14)
  });
  const m = getMon(r.state);
  assert.equal(m.disguiseBroken, undefined);
  assert.equal(m.formSpeciesId, null);
  assert.equal(m.currentHp, 130);
});

test('Disguise: Mold Breaker bypasses Disguise completely', () => {
  const s = E.createBattle(
    mimikyu(),
    dummy(2, { ability: 'mold-breaker', moves: [move(85)] })
  );
  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(85)
  });
  const m = getMon(r.state);
  // Mold Breaker hits directly through disguise without breaking it
  assert.equal(m.disguiseBroken, undefined);
  assert.equal(m.formSpeciesId, null);
  const dmgEvt = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'player');
  assert.ok(dmgEvt);
  assert.ok(dmgEvt.damage > 0);
});

test('Disguise: broken state persists across switch-out and switch-in', () => {
  const s = E.createBattle(
    team(mimikyu()),
    team(dummy(2))
  );
  // Turn 1: Disguise breaks
  const r1 = E.resolveTurn(s, {
    player: act(33),
    enemy: act(85)
  });
  assert.equal(getMon(r1.state).disguiseBroken, true);

  // Turn 2: Switch out
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'SWITCH', targetPokemonId: 98 },
    enemy: act(14)
  });
  // Switch back in
  const r3 = E.resolveTurn(r2.state, {
    player: { type: 'SWITCH', targetPokemonId: 778 },
    enemy: act(14)
  });
  const m3 = getMon(r3.state);
  assert.equal(m3.disguiseBroken, true);
  assert.equal(m3.formSpeciesId, 10143);
});

test('Disguise: recoil damage can faint Mimikyu with low HP', () => {
  const s = E.createBattle(team(mimikyu({ currentHp: 5 })), team(dummy()));
  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(85) // Enemy attacks, recoil is 16 > 5 HP
  });
  const m = r.state.player.team[0];
  assert.equal(m.currentHp, 0);
  assert.equal(m.disguiseBroken, true);
  assert.ok(r.events.some(e => e.type === 'DISGUISE_BROKEN'));
});

test('Disguise: Terastallization works normally with Disguise', () => {
  const s = E.createBattle(
    team(mimikyu({ specialMechanic: 'tera', teraType: 'fairy' })),
    team(dummy())
  );
  const r = E.resolveTurn(s, {
    player: { ...act(33), special: 'tera' },
    enemy: act(85) // Enemy attacks first, breaking Disguise
  });
  const m = getMon(r.state);
  assert.equal(m.disguiseBroken, true);
  assert.equal(m.tera, 'fairy');
  assert.deepEqual(m.types, ['fairy']);
});
