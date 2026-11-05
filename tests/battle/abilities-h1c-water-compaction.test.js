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
    types: ['ghost', 'ground'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 127, name: 'waterfall', type: 'water', power: 80, accuracy: 100, priority: 0, damageClass: 'physical', pp: 15, maxPp: 15 },
      { id: 57, name: 'surf', type: 'water', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
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

test('Water Compaction: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('water-compaction');
  assert.equal(meta.id, 'water-compaction');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 7);
  assert.ok(meta.triggers.includes('AFTER_DAMAGING_HIT'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, true);
});

test('Water Compaction: physical Water move raises Defense by +2', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(770, 'Palossand', 'water-compaction')),
    makeTeam(makeMon(130, 'Gyarados', 'intimidate', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 127, accuracyRoll: 1, damageRoll: 100 }
  });
  const palossand = r.state.player.team[0];
  assert.equal(palossand.statStages.defense, 2);
  const defEvent = r.events.find(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'player' && e.statKey === 'defense');
  assert.ok(defEvent);
  assert.equal(defEvent.appliedDelta, 2);
});

test('Water Compaction: special Water move raises Defense by +2', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(770, 'Palossand', 'water-compaction')),
    makeTeam(makeMon(131, 'Lapras', 'water-absorb', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 57, accuracyRoll: 1, damageRoll: 100 }
  });
  const palossand = r.state.player.team[0];
  assert.equal(palossand.statStages.defense, 2);
});

test('Water Compaction: non-Water damaging move does NOT trigger Water Compaction', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(770, 'Palossand', 'water-compaction')),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const palossand = r.state.player.team[0];
  assert.equal(palossand.statStages.defense, 0);
});

test('Water Compaction: damage is taken normally (does not grant immunity)', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(770, 'Palossand', 'water-compaction', { currentHp: 200, maxHp: 200 })),
    makeTeam(makeMon(130, 'Gyarados', 'moxie', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 127, accuracyRoll: 1, damageRoll: 100 }
  });
  const palossand = r.state.player.team[0];
  assert.ok(palossand.currentHp < 200, 'Dano do golpe Water deve ser aplicado ao HP');
  assert.equal(palossand.statStages.defense, 2);
});

test('Water Compaction: multi-hit Water move raises Defense by +2 per hit', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(770, 'Palossand', 'water-compaction')),
    makeTeam(makeMon(658, 'Greninja', 'torrent', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 594, accuracyRoll: 1, hitCountRoll: 50, hitDamageRolls: [90, 90, 90] }
  });
  const palossand = r.state.player.team[0];
  // 3 hits * +2 = +6 Defense
  assert.equal(palossand.statStages.defense, 6);
});

test('Water Compaction: damage absorbed by Substitute does NOT trigger Defense boost', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(770, 'Palossand', 'water-compaction', { substitute: true, substituteHp: 100 })),
    makeTeam(makeMon(130, 'Gyarados', 'moxie', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 127, accuracyRoll: 1, damageRoll: 100 }
  });
  const palossand = r.state.player.team[0];
  assert.equal(palossand.statStages.defense, 0);
});

test('Water Compaction: Neutralizing Gas suppresses Water Compaction', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(770, 'Palossand', 'water-compaction')),
    makeTeam(makeMon(110, 'Weezing', 'neutralizing-gas', { speed: 150, moves: [{ id: 57, name: 'surf', type: 'water', power: 90, accuracy: 100, damageClass: 'special', pp: 15, maxPp: 15 }] }))
  );
  P7.start(s, constants);
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 57, accuracyRoll: 1, damageRoll: 100 }
  });
  const palossand = r.state.player.team[0];
  assert.equal(palossand.statStages.defense, 0);
});
