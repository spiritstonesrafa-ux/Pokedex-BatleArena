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
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 86, name: 'thunder-wave', type: 'electric', power: 0, accuracy: 90, priority: 0, damageClass: 'status', pp: 20, maxPp: 20, statusEffect: 'paralysis' }
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

test('Motor Drive: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('motor-drive');
  assert.equal(meta.id, 'motor-drive');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 4);
  assert.ok(meta.triggers.includes('ON_TRY_HIT'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, true);
});

test('Motor Drive: offensive Electric move is negated (0 damage) and raises Speed by +1', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(466, 'Electivire', 'motor-drive')),
    makeTeam(makeMon(25, 'Pikachu', 'static', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100 }
  });
  const electivire = r.state.player.team[0];
  assert.equal(electivire.currentHp, 200, 'Nenhum dano deve ser causado ao portador');
  assert.equal(electivire.statStages.speed, 1, 'Speed deve subir em 1 estágio');
  const immuneEvent = r.events.find(e => e.type === C.BATTLE_EVENTS.MOVE_FAILED && e.reason === 'P7_IMMUNE');
  assert.ok(immuneEvent);
  assert.equal(immuneEvent.label, 'motor-drive');
});

test('Motor Drive: status Electric move is negated and raises Speed by +1', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(466, 'Electivire', 'motor-drive')),
    makeTeam(makeMon(25, 'Pikachu', 'static', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 86, accuracyRoll: 1 }
  });
  const electivire = r.state.player.team[0];
  assert.equal(electivire.statusCondition, null, 'Status de paralisia não deve ser aplicado');
  assert.equal(electivire.statStages.speed, 1, 'Speed deve subir em 1 estágio');
});

test('Motor Drive: non-Electric move hits normally and does not trigger Motor Drive', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(466, 'Electivire', 'motor-drive')),
    makeTeam(makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });
  const electivire = r.state.player.team[0];
  assert.ok(electivire.currentHp < 200, 'Golpe Normal deve causar dano');
  assert.equal(electivire.statStages.speed, 0);
});

test('Motor Drive: Speed at +6 cap still preserves Electric immunity', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(466, 'Electivire', 'motor-drive', { statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 6 } })),
    makeTeam(makeMon(25, 'Pikachu', 'static', { speed: 150 }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100 }
  });
  const electivire = r.state.player.team[0];
  assert.equal(electivire.currentHp, 200, 'Golpe Electric ainda deve ser anulado sob Speed máxima');
  assert.equal(electivire.statStages.speed, 6);
  const immuneEvent = r.events.find(e => e.type === C.BATTLE_EVENTS.MOVE_FAILED && e.reason === 'P7_IMMUNE');
  assert.ok(immuneEvent);
});

test('Motor Drive: Mold Breaker bypasses Motor Drive and Electric move hits', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(466, 'Electivire', 'motor-drive')),
    makeTeam(makeMon(612, 'Haxorus', 'mold-breaker', { speed: 150, moves: [{ id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 }] }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100 }
  });
  const electivire = r.state.player.team[0];
  assert.ok(electivire.currentHp < 200, 'Mold Breaker deve romper a imunidade do Motor Drive');
  assert.equal(electivire.statStages.speed, 0);
});

test('Motor Drive: Ability Shield protects Motor Drive against Mold Breaker', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(466, 'Electivire', 'motor-drive', { item: 'ability-shield' })),
    makeTeam(makeMon(612, 'Haxorus', 'mold-breaker', { speed: 150, moves: [{ id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 }] }))
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100 }
  });
  const electivire = r.state.player.team[0];
  assert.equal(electivire.currentHp, 200, 'Ability Shield deve proteger Motor Drive contra Mold Breaker');
  assert.equal(electivire.statStages.speed, 1);
});

test('Motor Drive: Neutralizing Gas suppresses Motor Drive (Electric move hits)', () => {
  const s = E.createTeamBattle(
    makeTeam(makeMon(466, 'Electivire', 'motor-drive')),
    makeTeam(makeMon(110, 'Weezing', 'neutralizing-gas', { speed: 150, moves: [{ id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 }] }))
  );
  P7.start(s, constants);
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 85, accuracyRoll: 1, damageRoll: 100 }
  });
  const electivire = r.state.player.team[0];
  assert.ok(electivire.currentHp < 200, 'Neutralizing Gas deve suprimir Motor Drive e permitir o acerto');
  assert.equal(electivire.statStages.speed, 0);
});
