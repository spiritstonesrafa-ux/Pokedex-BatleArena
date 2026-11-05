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
    types: ['normal'],
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

test('Moody: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('moody');
  assert.equal(meta.id, 'moody');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 5);
  assert.ok(meta.triggers.includes('ON_RESIDUAL_END'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Moody: raises one stat by +2 and lowers another by -1 at end of turn', () => {
  const smeargle = makeMon(235, 'Smeargle', 'moody');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle(makeTeam(smeargle), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 14 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  const stages = r.state.player.team[0].statStages;
  const nonZero = Object.entries(stages).filter(([k, v]) => k !== 'attack' && v !== 0); // exclude Swords Dance attack +2
  // We should have exactly one +2 and one -1 among defense, specialAttack, specialDefense, speed
  const boosted = Object.entries(stages).filter(([k, v]) => (k === 'attack' ? v === 4 : v === 2));
  const dropped = Object.entries(stages).filter(([, v]) => v === -1);
  assert.equal(boosted.length, 1);
  assert.equal(dropped.length, 1);
  assert.ok(r.events.some(e => e.label === 'moody'));
});

test('Moody: accuracy and evasion are never modified (Gen VIII/IX rule)', () => {
  const glalie = makeMon(362, 'Glalie', 'moody');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle(makeTeam(glalie), makeTeam(foe), { rng: () => 1 });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  const mon = r.state.player.team[0];
  assert.equal(mon.accuracyStage, 0);
  assert.equal(mon.evasionStage, 0);
  assert.equal(mon.statStages.accuracy, undefined);
  assert.equal(mon.statStages.evasion, undefined);
});

test('Moody: boosted stat and dropped stat are strictly distinct', () => {
  const octillery = makeMon(224, 'Octillery', 'moody');
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle(makeTeam(octillery), makeTeam(foe));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, moodyBoostStat: 'defense', moodyDropStat: 'speed' },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  const stages = r.state.player.team[0].statStages;
  assert.equal(stages.defense, 2);
  assert.equal(stages.speed, -1);
});

test('Moody: stat already at +6 cannot be chosen for +2 boost', () => {
  const bibarel = makeMon(400, 'Bibarel', 'moody', {
    statStages: { attack: 6, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }
  });
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle(makeTeam(bibarel), makeTeam(foe));
  // Request attack as boost stat, which is at +6 and must be rejected
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, moodyBoostStat: 'attack', moodyDropStat: 'defense' },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  const stages = r.state.player.team[0].statStages;
  assert.equal(stages.attack, 6); // Remains capped, not boosted to 8
  assert.notEqual(stages.defense, 2);
});

test('Moody: stat already at -6 cannot be chosen for -1 drop', () => {
  const scovillain = makeMon(951, 'Scovillain', 'moody', {
    statStages: { attack: 0, defense: -6, specialAttack: 0, specialDefense: 0, speed: 0 }
  });
  const foe = makeMon(143, 'Snorlax', 'thick-fat');
  const s = E.createTeamBattle(makeTeam(scovillain), makeTeam(foe));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, moodyBoostStat: 'attack', moodyDropStat: 'defense' },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  const stages = r.state.player.team[0].statStages;
  assert.equal(stages.defense, -6); // Remains -6, not dropped below floor
  assert.equal(stages.attack, 2);
});

test('Moody: deterministic index selection provides reproducible results', () => {
  const smeargle1 = makeMon(235, 'Smeargle', 'moody');
  const smeargle2 = makeMon(235, 'Smeargle', 'moody');
  const foe1 = makeMon(143, 'Snorlax', 'thick-fat');
  const foe2 = makeMon(143, 'Snorlax', 'thick-fat');
  const s1 = E.createTeamBattle(makeTeam(smeargle1), makeTeam(foe1));
  const s2 = E.createTeamBattle(makeTeam(smeargle2), makeTeam(foe2));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 33, moodyBoostIndex: 0, moodyDropIndex: 0 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 33, moodyBoostIndex: 0, moodyDropIndex: 0 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  assert.deepEqual(r1.state.player.team[0].statStages, r2.state.player.team[0].statStages);
});

test('Moody: Neutralizing Gas suppresses Moody at end of turn', () => {
  const smeargle = makeMon(235, 'Smeargle', 'moody');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');
  const s = E.createTeamBattle(makeTeam(smeargle), makeTeam(weezing));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  const stages = r.state.player.team[0].statStages;
  assert.equal(stages.attack, 0);
  assert.equal(stages.defense, 0);
  assert.equal(stages.specialAttack, 0);
  assert.equal(stages.specialDefense, 0);
  assert.equal(stages.speed, 0);
  assert.equal(r.events.some(e => e.label === 'moody'), false);
});
