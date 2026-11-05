const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const P8 = require('../../assets/js/battle/p8-special');

const constants = { ...C, P7, P8 };

function makeMon(id, name, ability, extra = {}) {
  return {
    id,
    name,
    level: 50,
    maxHp: 200,
    currentHp: 200,
    stats: { hp: 200, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
    statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    types: ['rock', 'fire'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 53, name: 'flamethrower', type: 'fire', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 127, name: 'waterfall', type: 'water', power: 80, accuracy: 100, priority: 0, damageClass: 'physical', pp: 15, maxPp: 15 },
      { id: 594, name: 'water-shuriken', type: 'water', power: 15, accuracy: 100, priority: 1, damageClass: 'special', pp: 20, maxPp: 20 }
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

test('Steam Engine: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('steam-engine');
  assert.equal(meta.id, 'steam-engine');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 8);
  assert.ok(meta.triggers.includes('AFTER_DAMAGING_HIT'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, true);
});

test('Steam Engine: Fire damaging move raises Speed by +6', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(839, 'Coalossal', 'steam-engine')),
    makeTeam(makeMon(6, 'Charizard', 'blaze', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 53, accuracyRoll: 1, damageRoll: 100 }
  });
  const coalossal = r.state.player.team[0];
  assert.equal(coalossal.statStages.speed, 6);
  const speEvent = r.events.find(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'player' && e.statKey === 'speed');
  assert.ok(speEvent);
  assert.equal(speEvent.appliedDelta, 6);
});

test('Steam Engine: Water damaging move raises Speed by +6', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(839, 'Coalossal', 'steam-engine')),
    makeTeam(makeMon(130, 'Gyarados', 'moxie', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 127, accuracyRoll: 1, damageRoll: 100 }
  });
  const coalossal = r.state.player.team[0];
  assert.equal(coalossal.statStages.speed, 6);
});

test('Steam Engine: non-Fire/non-Water damaging move does NOT trigger Steam Engine', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(839, 'Coalossal', 'steam-engine')),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const coalossal = r.state.player.team[0];
  assert.equal(coalossal.statStages.speed, 0);
});

test('Steam Engine: damage is taken normally (no immunity granted)', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(839, 'Coalossal', 'steam-engine', { currentHp: 200, maxHp: 200 })),
    makeTeam(makeMon(6, 'Charizard', 'blaze', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 53, accuracyRoll: 1, damageRoll: 100 }
  });
  const coalossal = r.state.player.team[0];
  assert.ok(coalossal.currentHp < 200, 'Dano do golpe Fire deve ser infligido');
  assert.equal(coalossal.statStages.speed, 6);
});

test('Steam Engine: damage absorbed by Substitute does NOT trigger Speed boost', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(839, 'Coalossal', 'steam-engine', { substitute: true, substituteHp: 100 })),
    makeTeam(makeMon(6, 'Charizard', 'blaze', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 53, accuracyRoll: 1, damageRoll: 100 }
  });
  const coalossal = r.state.player.team[0];
  assert.equal(coalossal.statStages.speed, 0);
});

test('Steam Engine: multi-hit Water move raises Speed to +6 on hit 1 and caps cleanly', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(839, 'Coalossal', 'steam-engine')),
    makeTeam(makeMon(658, 'Greninja', 'torrent', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 594, accuracyRoll: 1, hitCountRoll: 50, hitDamageRolls: [90, 90, 90] }
  });
  const coalossal = r.state.player.team[0];
  assert.equal(coalossal.statStages.speed, 6);
});

test('Steam Engine: Neutralizing Gas suppresses Steam Engine', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(839, 'Coalossal', 'steam-engine')),
    makeTeam(makeMon(110, 'Weezing', 'neutralizing-gas', { speed: 150, moves: [{ id: 53, name: 'flamethrower', type: 'fire', power: 90, accuracy: 100, damageClass: 'special', pp: 15, maxPp: 15 }] }))
  );
  P7.start(s, constants);
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 53, accuracyRoll: 1, damageRoll: 100 }
  });
  const coalossal = r.state.player.team[0];
  assert.equal(coalossal.statStages.speed, 0);
});
