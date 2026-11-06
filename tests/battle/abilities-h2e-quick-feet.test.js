const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const TurnManager = require('../../assets/js/battle/turn-manager');

function makeMon(id, name, ability, extra = {}) {
  const hp = extra.maxHp || extra.hp || extra.currentHp || 250;
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
    accuracyStage: 0,
    evasionStage: 0,
    types: ['normal'],
    ability,
    statusCondition: null,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 59, name: 'blizzard', type: 'ice', power: 110, accuracy: 70, priority: 0, damageClass: 'special', pp: 5, maxPp: 5 },
      { id: 189, name: 'mud-slap', type: 'ground', power: 20, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 }
    ],
    ...extra
  };
}

function makeTeam(lead, m2 = null, m3 = null) {
  return [
    lead,
    m2 || makeMon(901, 'ReserveA', 'soundproof'),
    m3 || makeMon(902, 'ReserveB', 'soundproof')
  ];
}

test('Quick Feet: registry metadata conforms to Gen IX SV', () => {
  const ab = Reg.getAbility('quick-feet');
  assert.ok(ab);
  assert.equal(ab.id, 'quick-feet');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.equal(ab.breakable, false);
  assert.ok(ab.triggers.includes('ON_MODIFY_SPE'));
});

test('Quick Feet: speed is unchanged when not afflicted with a status condition', () => {
  const ursaring = makeMon(217, 'Ursaring', 'quick-feet', { speed: 100 });
  const effSpeed = TurnManager.effectiveSpeed(ursaring);
  assert.equal(effSpeed, 100);
});

test('Quick Feet: grants 1.5x speed when poisoned or burned', () => {
  const ursaringPsn = makeMon(217, 'Ursaring', 'quick-feet', { speed: 100, statusCondition: 'poison' });
  assert.equal(TurnManager.effectiveSpeed(ursaringPsn), 150);

  const ursaringBrn = makeMon(217, 'Ursaring', 'quick-feet', { speed: 100, statusCondition: 'burn' });
  assert.equal(TurnManager.effectiveSpeed(ursaringBrn), 150);
});

test('Quick Feet: ignores paralysis 50% speed penalty and grants 1.5x speed', () => {
  const ursaringPar = makeMon(217, 'Ursaring', 'quick-feet', { speed: 100, statusCondition: 'paralysis' });
  // Normal pokemon with paralysis: 100 * 0.5 = 50 speed.
  // With Quick Feet: ignores 0.5x, gets 1.5x -> 150 speed.
  assert.equal(TurnManager.effectiveSpeed(ursaringPar), 150);
});

test('Quick Feet: grants 1.5x speed when asleep or frozen', () => {
  const ursaringSlp = makeMon(217, 'Ursaring', 'quick-feet', { speed: 100, statusCondition: 'sleep' });
  assert.equal(TurnManager.effectiveSpeed(ursaringSlp), 150);

  const ursaringFrz = makeMon(217, 'Ursaring', 'quick-feet', { speed: 100, statusCondition: 'freeze' });
  assert.equal(TurnManager.effectiveSpeed(ursaringFrz), 150);
});

test('Quick Feet: full paralysis 25% chance still prevents movement', () => {
  const ursaring = makeMon(217, 'Ursaring', 'quick-feet', { speed: 150, statusCondition: 'paralysis' });
  const enemy = makeMon(25, 'Pikachu', 'static', { speed: 100 });
  const state = E.createTeamBattle(makeTeam(ursaring), makeTeam(enemy));

  // In battle engine, statusRoll <= 25 triggers full paralysis
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 33, statusRoll: 10 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const cantMoveEv = r.events.find(e => e.type === 'STATUS_IMMOBILIZED' && e.statusCondition === 'paralysis');
  assert.ok(cantMoveEv, 'Full paralysis should prevent moving even with Quick Feet');
});

test('Quick Feet: TurnManager action order respects boosted speed', () => {
  // Ursaring base speed 100, Jolteon base speed 130
  // Ursaring with Quick Feet + Poison = 150 speed > Jolteon 130 speed
  const ursaring = makeMon(217, 'Ursaring', 'quick-feet', { speed: 100, statusCondition: 'poison' });
  const jolteon = makeMon(135, 'Jolteon', 'volt-absorb', { speed: 130 });

  const order = TurnManager.determineOrder(ursaring, jolteon, { type: 'MOVE', moveId: 33 }, { type: 'MOVE', moveId: 33 });
  assert.equal(order[0], 'player', 'Poisoned Ursaring with Quick Feet moves before Jolteon');
});

test('Quick Feet: Neutralizing Gas suppresses speed boost and restores paralysis penalty', () => {
  const ursaring = makeMon(217, 'Ursaring', 'quick-feet', { speed: 100, statusCondition: 'paralysis', neutralizingGasSuppressed: true });
  // Suppressed: paralysis halves speed (100 * 0.5 = 50) and 1.5x boost is lost
  const effSpeed = TurnManager.effectiveSpeed(ursaring);
  assert.equal(effSpeed, 50, 'Under Gas suppression, paralysis halves speed to 50');
});
