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
    types: ['dragon', 'ice'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 53, name: 'flamethrower', type: 'fire', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 261, name: 'will-o-wisp', type: 'fire', power: 0, accuracy: 85, priority: 0, damageClass: 'status', pp: 15, maxPp: 15, statusEffect: 'burn' },
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

test('Thermal Exchange: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('thermal-exchange');
  assert.equal(meta.id, 'thermal-exchange');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 9);
  assert.ok(meta.triggers.includes('AFTER_DAMAGING_HIT'));
  assert.ok(meta.triggers.includes('ON_STATUS_CHECK'));
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

test('Thermal Exchange: Fire move raises Attack by +1 upon taking damage', () => {
  const bax = makeMon(998, 'Baxcalibur', 'thermal-exchange');
  const foe = makeMon(6, 'Charizard', 'blaze', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(bax), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 53, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(r.state.player.team[0].statStages.attack, 3); // 2 from swords-dance + 1 from thermal-exchange
  assert.ok(r.events.some(e => e.label === 'thermal-exchange'));
});

test('Thermal Exchange: user is NOT immune to Fire damage', () => {
  const bax = makeMon(998, 'Baxcalibur', 'thermal-exchange', { currentHp: 200, maxHp: 200 });
  const foe = makeMon(6, 'Charizard', 'blaze', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(bax), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 53, accuracyRoll: 1, damageRoll: 100 }
  });
  // Fire damage is super effective against Ice typing
  assert.ok(r.state.player.team[0].currentHp < 200);
});

test('Thermal Exchange: immune to burn status from Will-O-Wisp', () => {
  const bax = makeMon(998, 'Baxcalibur', 'thermal-exchange');
  const foe = makeMon(6, 'Charizard', 'blaze', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(bax), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 261, accuracyRoll: 1 } // Will-O-Wisp
  });
  assert.equal(r.state.player.team[0].statusCondition, null);
});

test('Thermal Exchange: pre-existing burn is cured upon entry', () => {
  const bax = makeMon(998, 'Baxcalibur', 'thermal-exchange', { statusCondition: 'burn' });
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle(makeTeam(bax), makeTeam(foe));
  assert.equal(s.player.team[0].statusCondition, null);
});

test('Thermal Exchange: non-Fire damaging move damages without raising Attack', () => {
  const bax = makeMon(998, 'Baxcalibur', 'thermal-exchange');
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(bax), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 } // Tackle (Normal)
  });
  assert.equal(r.state.player.team[0].statStages.attack, 0);
  assert.equal(r.events.some(e => e.label === 'thermal-exchange'), false);
});

test('Thermal Exchange: Mold Breaker allows Will-O-Wisp to inflict burn', () => {
  const bax = makeMon(998, 'Baxcalibur', 'thermal-exchange');
  const foe = makeMon(612, 'Haxorus', 'mold-breaker', { speed: 120 });
  const s = E.createTeamBattle(makeTeam(bax), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 261, accuracyRoll: 1 }
  });
  assert.equal(r.state.player.team[0].statusCondition, 'burn');
});

test('Thermal Exchange: Neutralizing Gas suppresses Thermal Exchange and cures burn when gas ends', () => {
  const bax = makeMon(998, 'Baxcalibur', 'thermal-exchange');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { speed: 120, maxHp: 100, currentHp: 100 });
  const s = E.createTeamBattle(makeTeam(bax), [weezing, makeMon(143, 'Snorlax', 'thick-fat'), makeMon(101, 'Electrode', 'soundproof')], { rng: () => 1 });

  // While gas is active, Will-O-Wisp burns Baxcalibur
  const r1 = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 261, accuracyRoll: 1 }
  });
  assert.equal(r1.state.player.team[0].statusCondition, 'burn');

  // Weezing switches out, ending gas -> Thermal Exchange restores and immediately cures burn!
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'SWITCH', targetPokemonId: 143 }
  });
  assert.equal(r2.state.player.team[0].statusCondition, null);
  assert.ok(r2.events.some(e => e.type === 'STATUS_CURED' && e.reason === 'THERMAL_EXCHANGE'));
});
