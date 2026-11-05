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
    types: ['ghost', 'flying'],
    ability,
    moves: [
      { id: 247, name: 'shadow-ball', type: 'ghost', power: 80, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
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

test('Flare Boost: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('flare-boost');
  assert.ok(ab);
  assert.equal(ab.id, 'flare-boost');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_BASE_POWER'));
});

test('Flare Boost: boosts special move (Shadow Ball) power by 1.5x when burned', () => {
  const drifblim = makeMon(426, 'Drifblim', 'flare-boost', { statusCondition: 'burn' });
  const target = makeMon(25, 'Pikachu', 'static');
  const move = drifblim.moves[0]; // shadow-ball (special, 80)
  const p = P7.power(null, drifblim, target, move, move.power);
  assert.equal(p, 120); // 80 * 1.5
});

test('Flare Boost: does NOT boost physical moves (Slash) when burned', () => {
  const drifblim = makeMon(426, 'Drifblim', 'flare-boost', { statusCondition: 'burn' });
  const target = makeMon(25, 'Pikachu', 'static');
  const move = drifblim.moves[1]; // slash (physical, 70)
  const p = P7.power(null, drifblim, target, move, move.power);
  assert.equal(p, 70);
});

test('Flare Boost: does NOT boost special moves when healthy (no status)', () => {
  const drifblim = makeMon(426, 'Drifblim', 'flare-boost');
  const target = makeMon(25, 'Pikachu', 'static');
  const move = drifblim.moves[0];
  const p = P7.power(null, drifblim, target, move, move.power);
  assert.equal(p, 80);
});

test('Flare Boost: does NOT boost when poisoned or paralyzed', () => {
  const psnDrifblim = makeMon(426, 'Drifblim', 'flare-boost', { statusCondition: 'poison' });
  const paraDrifblim = makeMon(426, 'Drifblim', 'flare-boost', { statusCondition: 'paralysis' });
  const target = makeMon(25, 'Pikachu', 'static');
  const move = psnDrifblim.moves[0];

  assert.equal(P7.power(null, psnDrifblim, target, move, move.power), 80);
  assert.equal(P7.power(null, paraDrifblim, target, move, move.power), 80);
});

test('Flare Boost: deals increased damage in full battle turn without burn damage penalty on special move', () => {
  const burnedDrifblim = makeMon(426, 'Drifblim', 'flare-boost', { statusCondition: 'burn', specialAttack: 100 });
  const healthyDrifblim = makeMon(426, 'Drifblim', 'flare-boost', { specialAttack: 100 });
  const def1 = makeMon(100, 'Voltorb', 'soundproof', { specialDefense: 100, maxHp: 300, currentHp: 300 });
  const def2 = makeMon(100, 'Voltorb', 'soundproof', { specialDefense: 100, maxHp: 300, currentHp: 300 });

  const sWith = E.createTeamBattle(makeTeam(burnedDrifblim), makeTeam(def1));
  const rWith = E.resolveTurn(sWith, {
    player: { type: 'MOVE', moveId: 247, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const sWithout = E.createTeamBattle(makeTeam(healthyDrifblim), makeTeam(def2));
  const rWithout = E.resolveTurn(sWithout, {
    player: { type: 'MOVE', moveId: 247, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const dmgBurned = rWith.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;
  const dmgHealthy = rWithout.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;
  assert.ok(dmgBurned > dmgHealthy);
});

test('Flare Boost: Neutralizing Gas suppresses Flare Boost special boost', () => {
  const drifblim = makeMon(426, 'Drifblim', 'flare-boost', { statusCondition: 'burn' });
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');

  const s = E.createTeamBattle(makeTeam(drifblim), makeTeam(weezing));
  P7.sync(s);

  const move = drifblim.moves[0];
  const p = P7.power(s, s.player.team[0], s.enemy.team[0], move, move.power);
  assert.equal(p, 80);
});

test('Flare Boost: Battle Evaluator incorporates Flare Boost for burned attacker on special move', () => {
  const burnedDrifblim = makeMon(426, 'Drifblim', 'flare-boost', { statusCondition: 'burn' });
  const healthyDrifblim = makeMon(426, 'Drifblim', 'flare-boost');
  const target = makeMon(100, 'Voltorb', 'soundproof', { specialDefense: 100 });
  const move = burnedDrifblim.moves[0];

  const evalBurned = Ev.evaluateMove(burnedDrifblim, target, move, { constants });
  const evalHealthy = Ev.evaluateMove(healthyDrifblim, target, move, { constants });

  assert.ok(evalBurned.expectedDamage > evalHealthy.expectedDamage);
});
