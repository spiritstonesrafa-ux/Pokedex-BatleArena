const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const P8 = require('../../assets/js/battle/p8-special');

const constants = { ...C, P7, P8 };

function makeMon(id, name, ability, extra = {}) {
  const hp = extra.maxHp || extra.hp || extra.currentHp || 200;
  const attack = extra.attack ?? 100;
  const defense = extra.defense ?? 100;
  const specialAttack = extra.specialAttack ?? 100;
  const specialDefense = extra.specialDefense ?? 100;
  const speed = extra.speed ?? 100;
  return {
    id,
    name,
    level: 50,
    maxHp: hp,
    currentHp: extra.currentHp ?? hp,
    attack,
    defense,
    specialAttack,
    specialDefense,
    speed,
    stats: { hp, attack, defense, specialAttack, specialDefense, speed, ...(extra.stats || {}) },
    statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    types: ['grass', 'ghost'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 16, name: 'gust', type: 'flying', power: 40, accuracy: 100, priority: 0, damageClass: 'special', pp: 35, maxPp: 35 },
      { id: 366, name: 'tailwind', type: 'flying', power: null, accuracy: null, priority: 0, damageClass: 'status', pp: 15, maxPp: 15 },
      { id: 14, name: 'swords-dance', type: 'normal', power: 0, accuracy: null, priority: 0, damageClass: 'status', pp: 20, maxPp: 20 }
    ],
    ...extra
  };
}

function makeTeam(lead, m2 = null, m3 = null) {
  return [
    lead,
    m2 || makeMon(100, 'Voltorb', 'soundproof'),
    m3 || makeMon(101, 'Electrode', 'soundproof')
  ];
}

test('Wind Rider: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('wind-rider');
  assert.equal(meta.id, 'wind-rider');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 9);
  assert.ok(meta.triggers.includes('ON_TRY_HIT'));
  assert.ok(meta.triggers.includes('ON_TAILWIND'));
  assert.ok(meta.triggers.includes('ON_ENTRY'));
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

test('Wind Rider: wind move (Gust) is negated and raises Attack by +1', () => {
  const bramble = makeMon(947, 'Brambleghast', 'wind-rider', { currentHp: 200, maxHp: 200 });
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(bramble), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 16, accuracyRoll: 1, damageRoll: 100 } // Gust (Wind move)
  });
  // Brambleghast takes 0 damage and gains +1 Attack (+2 from Swords Dance + 1 from Wind Rider = 3)
  assert.equal(r.state.player.team[0].currentHp, 200);
  assert.equal(r.state.player.team[0].statStages.attack, 3);
  assert.ok(r.events.some(e => e.label === 'wind-rider'));
  assert.ok(r.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'wind-rider'));
});

test('Wind Rider: Tailwind activation raises Attack by +1', () => {
  const bramblin = makeMon(946, 'Bramblin', 'wind-rider');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle(makeTeam(bramblin), makeTeam(foe));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 366 }, // Tailwind
    enemy: { type: 'MOVE', moveId: 14 }
  });
  assert.equal(r.state.player.team[0].statStages.attack, 1);
  assert.ok(r.events.some(e => e.label === 'wind-rider'));
});

test('Wind Rider: entering battle with Tailwind already active raises Attack by +1', () => {
  const setter = makeMon(10, 'Setter', 'soundproof');
  const bramble = makeMon(947, 'Brambleghast', 'wind-rider');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle([setter, bramble, makeMon(101, 'Electrode', 'soundproof')], makeTeam(foe));

  // Turn 1: setter sets Tailwind
  const r1 = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 366 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  assert.ok(r1.state.p6Sides.player.tailwind > 0);

  // Turn 2: switch to Brambleghast -> enters with Tailwind active!
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'SWITCH', targetPokemonId: 947 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  const activeBramble = r2.state.player.team[1];
  assert.equal(activeBramble.statStages.attack, 1);
  assert.ok(r2.events.some(e => e.label === 'wind-rider'));
});

test('Wind Rider: non-wind damaging move damages user without Attack boost', () => {
  const bramble = makeMon(947, 'Brambleghast', 'wind-rider', { currentHp: 200, maxHp: 200 });
  const foe = makeMon(143, 'Snorlax', 'thick-fat', {
    speed: 120,
    moves: [{ id: 94, name: 'psychic', type: 'psychic', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 }]
  });
  const s = E.createTeamBattle(makeTeam(bramble), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 94, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.ok(r.state.player.team[0].currentHp < 200);
  assert.equal(r.state.player.team[0].statStages.attack, 2); // Only +2 from Swords Dance
  assert.equal(r.events.some(e => e.label === 'wind-rider'), false);
});

test('Wind Rider: Mold Breaker bypasses immunity, allowing wind move to hit without Attack boost', () => {
  const bramble = makeMon(947, 'Brambleghast', 'wind-rider', { currentHp: 200, maxHp: 200 });
  const foe = makeMon(612, 'Haxorus', 'mold-breaker', {
    speed: 120,
    moves: [{ id: 16, name: 'gust', type: 'flying', power: 40, accuracy: 100, priority: 0, damageClass: 'special', pp: 35, maxPp: 35 }]
  });
  const s = E.createTeamBattle(makeTeam(bramble), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 16, accuracyRoll: 1, damageRoll: 100 }
  });
  // Mold Breaker ignores Wind Rider -> damage dealt, no Wind Rider immunity, no Wind Rider boost
  assert.ok(r.state.player.team[0].currentHp < 200);
  assert.equal(r.state.player.team[0].statStages.attack, 2); // Only swords dance
  assert.equal(r.events.some(e => e.label === 'wind-rider'), false);
});

test('Wind Rider: Neutralizing Gas suppresses immunity and Attack boost', () => {
  const bramble = makeMon(947, 'Brambleghast', 'wind-rider', { currentHp: 200, maxHp: 200 });
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', {
    speed: 120,
    moves: [{ id: 16, name: 'gust', type: 'flying', power: 40, accuracy: 100, priority: 0, damageClass: 'special', pp: 35, maxPp: 35 }]
  });
  const s = E.createTeamBattle(makeTeam(bramble), makeTeam(weezing), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 16, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.ok(r.state.player.team[0].currentHp < 200);
  assert.equal(r.state.player.team[0].statStages.attack, 2); // Only swords dance
  assert.equal(r.events.some(e => e.label === 'wind-rider'), false);
});

test('Wind Rider: stat stage does not overflow beyond +6', () => {
  const bramble = makeMon(947, 'Brambleghast', 'wind-rider', {
    statStages: { attack: 6, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }
  });
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(bramble), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 16, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(r.state.player.team[0].statStages.attack, 6);
});
