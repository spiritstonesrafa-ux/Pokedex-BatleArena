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
    types: ['steel', 'flying'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 94, name: 'psychic', type: 'psychic', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 },
      { id: 331, name: 'bullet-seed', type: 'grass', power: 25, accuracy: 100, priority: 0, damageClass: 'physical', pp: 30, maxPp: 30 }
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

test('Weak Armor: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('weak-armor');
  assert.equal(meta.id, 'weak-armor');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 5);
  assert.ok(meta.triggers.includes('AFTER_DAMAGING_HIT'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, true);
});

test('Weak Armor: physical damaging move lowers Defense by 1 and raises Speed by 2', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(227, 'Skarmory', 'weak-armor')),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const skarmory = r.state.player.team[0];
  assert.equal(skarmory.statStages.defense, -1);
  assert.equal(skarmory.statStages.speed, 2);
  const defEvent = r.events.find(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'player' && e.statKey === 'defense');
  const speEvent = r.events.find(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'player' && e.statKey === 'speed');
  assert.ok(defEvent && speEvent);
  assert.equal(defEvent.appliedDelta, -1);
  assert.equal(speEvent.appliedDelta, 2);
});

test('Weak Armor: special damaging move does NOT trigger Weak Armor', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(227, 'Skarmory', 'weak-armor')),
    makeTeam(makeMon(65, 'Alakazam', 'synchronize', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 94, accuracyRoll: 1, damageRoll: 100 }
  });
  const skarmory = r.state.player.team[0];
  assert.equal(skarmory.statStages.defense, 0);
  assert.equal(skarmory.statStages.speed, 0);
});

test('Weak Armor: multi-hit physical move triggers after each hit', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(227, 'Skarmory', 'weak-armor')),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 331, accuracyRoll: 1, hitCountRoll: 50, hitDamageRolls: [90, 90, 90] }
  });
  const skarmory = r.state.player.team[0];
  // 3 hits: Defense -3, Speed +6
  assert.equal(skarmory.statStages.defense, -3);
  assert.equal(skarmory.statStages.speed, 6);
});

test('Weak Armor: Defense at -6 limit still allows Speed to rise by +2', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(227, 'Skarmory', 'weak-armor', { statStages: { attack: 0, defense: -6, specialAttack: 0, specialDefense: 0, speed: 0 } })),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const skarmory = r.state.player.team[0];
  assert.equal(skarmory.statStages.defense, -6);
  assert.equal(skarmory.statStages.speed, 2);
});

test('Weak Armor: Speed at +6 limit still allows Defense to drop by -1', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(227, 'Skarmory', 'weak-armor', { statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 6 } })),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const skarmory = r.state.player.team[0];
  assert.equal(skarmory.statStages.defense, -1);
  assert.equal(skarmory.statStages.speed, 6);
});

test('Weak Armor: Contrary inverts Defense drop to boost (+1) and Speed boost to drop (-2)', () => {
  // Simulate Skill Swap or Wandering Spirit giving Contrary to Weak Armor bearer
  const pMon = makeMon(227, 'Skarmory', 'contrary');
  const eMon = makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 });
  const events = [];
  // Direct test of modifyStages with weak-armor reaction on a Contrary mon
  P7.modifyStages(null, 'player', pMon, { defense: -1, speed: 2 }, 'enemy', eMon, 'weak-armor', constants, events);
  assert.equal(pMon.statStages.defense, 1);
  assert.equal(pMon.statStages.speed, -2);
});

test('Weak Armor: Neutralizing Gas suppresses Weak Armor', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(227, 'Skarmory', 'weak-armor')),
    makeTeam(makeMon(110, 'Weezing', 'neutralizing-gas', { speed: 150 }))
  );
  P7.start(s, constants);
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const skarmory = r.state.player.team[0];
  assert.equal(skarmory.statStages.defense, 0);
  assert.equal(skarmory.statStages.speed, 0);
});
