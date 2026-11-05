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
    types: ['ground'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 94, name: 'psychic', type: 'psychic', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 }
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

test('Stamina: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('stamina');
  assert.equal(meta.id, 'stamina');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 7);
  assert.ok(meta.triggers.includes('AFTER_DAMAGING_HIT'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, true);
});

test('Stamina: physical damaging move raises Defense by +1', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(750, 'Mudsdale', 'stamina')),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const mudsdale = r.state.player.team[0];
  assert.equal(mudsdale.statStages.defense, 1);
  const boostEvent = r.events.find(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'player');
  assert.ok(boostEvent);
  assert.equal(boostEvent.statKey, 'defense');
  assert.equal(boostEvent.appliedDelta, 1);
});

test('Stamina: special damaging move raises Defense by +1', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(750, 'Mudsdale', 'stamina')),
    makeTeam(makeMon(65, 'Alakazam', 'synchronize', { speed: 150, moves: [{ id: 94, name: 'psychic', type: 'psychic', power: 90, accuracy: 100, damageClass: 'special', pp: 10, maxPp: 10 }] }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 94, accuracyRoll: 1, damageRoll: 100 }
  });
  const mudsdale = r.state.player.team[0];
  assert.equal(mudsdale.statStages.defense, 1);
});

test('Stamina: multi-hit move raises Defense once per damaging hit', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(750, 'Mudsdale', 'stamina')),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', {
      speed: 150,
      moves: [{
        id: 331,
        name: 'bullet-seed',
        type: 'grass',
        power: 25,
        accuracy: 100,
        damageClass: 'physical',
        pp: 30,
        maxPp: 30
      }]
    }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 331, accuracyRoll: 1, hitCountRoll: 50, hitDamageRolls: [90, 90, 90] }
  });
  const mudsdale = r.state.player.team[0];
  assert.equal(mudsdale.statStages.defense, 3);
  const defEvents = r.events.filter(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'player' && e.statKey === 'defense');
  assert.equal(defEvents.length, 3);
});

test('Stamina: damage absorbed by Substitute does NOT trigger Stamina', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(750, 'Mudsdale', 'stamina', { substitute: true, substituteHp: 100 })),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const mudsdale = r.state.player.team[0];
  assert.equal(mudsdale.statStages.defense, 0);
});

test('Stamina: does NOT trigger if bearer faints from the hit', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(750, 'Mudsdale', 'stamina', { currentHp: 5, maxHp: 200 })),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const mudsdale = r.state.player.team[0];
  assert.equal(mudsdale.currentHp, 0);
  assert.equal(mudsdale.statStages.defense, 0);
});

test('Stamina: Defense caps at +6 and cannot exceed maximum', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(750, 'Mudsdale', 'stamina', { statStages: { attack: 0, defense: 6, specialAttack: 0, specialDefense: 0, speed: 0 } })),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const mudsdale = r.state.player.team[0];
  assert.equal(mudsdale.statStages.defense, 6);
  const defEvent = r.events.find(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'player' && e.statKey === 'defense');
  assert.ok(defEvent);
  assert.equal(defEvent.appliedDelta, 0);
  assert.equal(defEvent.blockedReason, 'AT_MAX');
});

test('Stamina: Neutralizing Gas suppresses Stamina activation', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(750, 'Mudsdale', 'stamina')),
    makeTeam(makeMon(110, 'Weezing', 'neutralizing-gas', { speed: 150 }))
  );
  P7.start(s, constants);
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const mudsdale = r.state.player.team[0];
  assert.equal(mudsdale.statStages.defense, 0);
});
