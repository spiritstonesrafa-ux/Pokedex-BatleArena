const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const P8 = require('../../assets/js/battle/p8-special');
const Ev = require('../../assets/js/battle/battle-evaluator');

const constants = { ...C, P7, P8 };

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
    types: ['normal'],
    ability,
    moves: [
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 129, name: 'swift', type: 'normal', power: 60, accuracy: null, priority: 0, damageClass: 'special', pp: 20, maxPp: 20 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 }
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

test('Toxic Boost: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('toxic-boost');
  assert.ok(ab);
  assert.equal(ab.id, 'toxic-boost');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_BASE_POWER'));
});

test('Toxic Boost: boosts physical move (Slash) power by 1.5x when poisoned', () => {
  const zangoose = makeMon(335, 'Zangoose', 'toxic-boost', { statusCondition: 'poison' });
  const target = makeMon(25, 'Pikachu', 'static');
  const move = zangoose.moves[0]; // slash (physical, 70)
  const p = P7.power(null, zangoose, target, move, move.power);
  assert.equal(p, 105); // 70 * 1.5
});

test('Toxic Boost: boosts physical move power by 1.5x when badly poisoned (toxic)', () => {
  const zangoose = makeMon(335, 'Zangoose', 'toxic-boost', { statusCondition: 'toxic', toxicStage: 1 });
  const target = makeMon(25, 'Pikachu', 'static');
  const move = zangoose.moves[0];
  const p = P7.power(null, zangoose, target, move, move.power);
  assert.equal(p, 105);
});

test('Toxic Boost: does NOT boost special moves (Swift) when poisoned', () => {
  const zangoose = makeMon(335, 'Zangoose', 'toxic-boost', { statusCondition: 'poison' });
  const target = makeMon(25, 'Pikachu', 'static');
  const move = zangoose.moves[1]; // swift (special, 60)
  const p = P7.power(null, zangoose, target, move, move.power);
  assert.equal(p, 60);
});

test('Toxic Boost: does NOT boost physical moves when healthy (no status)', () => {
  const zangoose = makeMon(335, 'Zangoose', 'toxic-boost');
  const target = makeMon(25, 'Pikachu', 'static');
  const move = zangoose.moves[0];
  const p = P7.power(null, zangoose, target, move, move.power);
  assert.equal(p, 70);
});

test('Toxic Boost: does NOT boost when burned or paralyzed', () => {
  const burnedZangoose = makeMon(335, 'Zangoose', 'toxic-boost', { statusCondition: 'burn' });
  const paraZangoose = makeMon(335, 'Zangoose', 'toxic-boost', { statusCondition: 'paralysis' });
  const target = makeMon(25, 'Pikachu', 'static');
  const move = burnedZangoose.moves[0];

  assert.equal(P7.power(null, burnedZangoose, target, move, move.power), 70);
  assert.equal(P7.power(null, paraZangoose, target, move, move.power), 70);
});

test('Toxic Boost: Neutralizing Gas suppresses Toxic Boost physical boost', () => {
  const zangoose = makeMon(335, 'Zangoose', 'toxic-boost', { statusCondition: 'poison' });
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');

  const s = E.createTeamBattle(makeTeam(zangoose), makeTeam(weezing));
  P7.sync(s);

  const move = zangoose.moves[0];
  const p = P7.power(s, s.player.team[0], s.enemy.team[0], move, move.power);
  assert.equal(p, 70);
});

test('Toxic Boost: Battle Evaluator incorporates Toxic Boost for poisoned attacker', () => {
  const poisonedZangoose = makeMon(335, 'Zangoose', 'toxic-boost', { statusCondition: 'poison' });
  const healthyZangoose = makeMon(335, 'Zangoose', 'toxic-boost');
  const target = makeMon(100, 'Voltorb', 'soundproof', { defense: 100 });
  const move = poisonedZangoose.moves[0];

  const evalPoisoned = Ev.evaluateMove(poisonedZangoose, target, move, { constants });
  const evalHealthy = Ev.evaluateMove(healthyZangoose, target, move, { constants });

  assert.ok(evalPoisoned.expectedDamage > evalHealthy.expectedDamage);
});
