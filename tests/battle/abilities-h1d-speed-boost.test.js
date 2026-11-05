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
    types: ['bug', 'flying'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
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

test('Speed Boost: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('speed-boost');
  assert.equal(meta.id, 'speed-boost');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 3);
  assert.ok(meta.triggers.includes('ON_RESIDUAL_END'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Speed Boost: turn 1 lead raises Speed by +1 at end of turn', () => {
  const ninjask = makeMon(291, 'Ninjask', 'speed-boost');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle(makeTeam(ninjask), makeTeam(foe));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  assert.equal(r.state.player.team[0].statStages.speed, 1);
  assert.ok(r.events.some(e => e.label === 'speed-boost'));
});

test('Speed Boost: consecutive turns raise Speed +1 each turn (+2 on turn 2)', () => {
  const blaziken = makeMon(257, 'Blaziken', 'speed-boost');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle(makeTeam(blaziken), makeTeam(foe));
  const r1 = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  assert.equal(r1.state.player.team[0].statStages.speed, 1);

  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  assert.equal(r2.state.player.team[0].statStages.speed, 2);
});

test('Speed Boost: does NOT activate on the turn the Pokémon is switched into battle', () => {
  const starter = makeMon(10, 'Caterpie', 'shield-dust');
  const blaziken = makeMon(257, 'Blaziken', 'speed-boost');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle([starter, blaziken, makeMon(101, 'Electrode', 'soundproof')], makeTeam(foe));

  // Turn 1: Switch in Blaziken
  const r = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetPokemonId: 257 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  const currentActive = r.state.player.team[r.state.player.activeIndex];
  assert.equal(currentActive.id, 257);
  // Canonical rule: No Speed Boost on turn switched in!
  assert.equal(currentActive.statStages.speed, 0);
  assert.equal(r.events.some(e => e.label === 'speed-boost'), false);
});

test('Speed Boost: activates normally on the turn after switching in', () => {
  const starter = makeMon(10, 'Caterpie', 'shield-dust');
  const blaziken = makeMon(257, 'Blaziken', 'speed-boost');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle([starter, blaziken, makeMon(101, 'Electrode', 'soundproof')], makeTeam(foe));

  // Turn 1: Switch in
  const r1 = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetPokemonId: 257 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  assert.equal(r1.state.player.team[1].statStages.speed, 0);

  // Turn 2: Stays in battle and uses move
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  assert.equal(r2.state.player.team[1].statStages.speed, 1);
  assert.ok(r2.events.some(e => e.label === 'speed-boost'));
});

test('Speed Boost: stat stage does not overflow beyond +6 cap', () => {
  const yanmega = makeMon(469, 'Yanmega', 'speed-boost', {
    statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 6 }
  });
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle(makeTeam(yanmega), makeTeam(foe));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  assert.equal(r.state.player.team[0].statStages.speed, 6);
});

test('Speed Boost: Neutralizing Gas suppresses Speed Boost at end of turn', () => {
  const blaziken = makeMon(257, 'Blaziken', 'speed-boost');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');
  const s = E.createTeamBattle(makeTeam(blaziken), makeTeam(weezing));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  assert.equal(r.state.player.team[0].statStages.speed, 0);
  assert.equal(r.events.some(e => e.label === 'speed-boost'), false);
});

test('Speed Boost: fainted Pokémon does not receive Speed Boost', () => {
  const ninjask = makeMon(291, 'Ninjask', 'speed-boost', { maxHp: 100, currentHp: 10 });
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { attack: 300, speed: 150 });
  const s = E.createTeamBattle(makeTeam(ninjask), makeTeam(foe));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  assert.equal(r.state.player.team[0].currentHp, 0);
  assert.equal(r.state.player.team[0].statStages.speed, 0);
});
