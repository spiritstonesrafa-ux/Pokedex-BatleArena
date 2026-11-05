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
    types: ['electric'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 }
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

test('Electromorphosis: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('electromorphosis');
  assert.equal(meta.id, 'electromorphosis');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 9);
  assert.ok(meta.triggers.includes('AFTER_DAMAGING_HIT'));
  assert.ok(meta.triggers.includes('MODIFY_POWER'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, true);
});

test('Electromorphosis: taking damage applies charge state', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(939, 'Bellibolt', 'electromorphosis')),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const bellibolt = r.state.player.team[0];
  assert.equal(bellibolt.charge, true, 'Bellibolt deve ganhar estado charge após sofrer dano');
});

test('Electromorphosis: next Electric move has its power doubled (2x)', () => {
  const a = makeMon(939, 'Bellibolt', 'electromorphosis', { charge: true });
  const d = makeMon(143, 'Snorlax', 'thick-fat');
  const moveElec = { id: 85, name: 'thunderbolt', type: 'electric', power: 90 };
  const powerVal = P7.power(null, a, d, moveElec, moveElec.power);
  assert.equal(powerVal, 180, 'Power de Thunderbolt deve dobrar de 90 para 180 com Charge');
});

test('Electromorphosis: charge is consumed after executing the Electric move', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(939, 'Bellibolt', 'electromorphosis', { charge: true, speed: 200 })),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 50 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const bellibolt = r.state.player.team[0];
  // After using Thunderbolt, charge is consumed; then Snorlax hits Bellibolt and recharges it!
  // To verify consumption isolated from opponent damage:
  const s2 = E.createTeamBattle(
    makeTeam(makeMon(939, 'Bellibolt', 'electromorphosis', { charge: true, speed: 200 })),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 50, currentHp: 1 }))
  );
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const bellibolt2 = r2.state.player.team[0];
  assert.equal(bellibolt2.charge, false, 'Charge deve ser consumido após o ataque Electric');
});

test('Electromorphosis: non-Electric attack does NOT consume charge and does NOT double power', () => {
  const a = makeMon(939, 'Bellibolt', 'electromorphosis', { charge: true });
  const d = makeMon(143, 'Snorlax', 'thick-fat');
  const moveNormal = { id: 33, name: 'tackle', type: 'normal', power: 40 };
  const powerVal = P7.power(null, a, d, moveNormal, moveNormal.power);
  assert.equal(powerVal, 40, 'Power de golpe Normal não deve ser alterado por Charge');

  // Verify non-consumption in battle turn
  const s = E.createTeamBattle(
    makeTeam(makeMon(939, 'Bellibolt', 'electromorphosis', { charge: true, speed: 200 })),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 50, currentHp: 1 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const bellibolt = r.state.player.team[0];
  assert.equal(bellibolt.charge, true, 'Golpe Normal não deve consumir o estado charge');
});

test('Electromorphosis: taking successive damage does NOT stack beyond 2x power', () => {
  const a = makeMon(939, 'Bellibolt', 'electromorphosis', { charge: true });
  const d = makeMon(143, 'Snorlax', 'thick-fat');
  const s = { player: { activeIndex: 0, team: [a] }, enemy: { activeIndex: 0, team: [d] } };
  // Trigger afterHit again while already charged
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, [], 20, d, a);
  assert.equal(a.charge, true);
  const moveElec = { id: 85, name: 'thunderbolt', type: 'electric', power: 90 };
  const powerVal = P7.power(s, a, d, moveElec, moveElec.power);
  assert.equal(powerVal, 180, 'Power não deve acumular para 4x, permanece 2x (180)');
});

test('Electromorphosis: switching out (leave) clears charge', () => {
  const bellibolt = makeMon(939, 'Bellibolt', 'electromorphosis', { charge: true });
  const events = [];
  P7.leave(null, 'player', bellibolt, constants, events);
  assert.equal(bellibolt.charge, false, 'Troca deve limpar o estado charge');
});

test('Electromorphosis: Neutralizing Gas suppresses Electromorphosis', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(939, 'Bellibolt', 'electromorphosis')),
    makeTeam(makeMon(110, 'Weezing', 'neutralizing-gas', { speed: 150 }))
  );
  P7.start(s, constants);
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const bellibolt = r.state.player.team[0];
  assert.equal(bellibolt.charge, false, 'Neutralizing Gas deve impedir a ativação de Electromorphosis');
});
