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
      { id: 38, name: 'double-edge', type: 'normal', power: 120, accuracy: 100, priority: 0, damageClass: 'physical', pp: 15, maxPp: 15, recoilRatio: 0.333 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 136, name: 'high-jump-kick', type: 'fighting', power: 130, accuracy: 90, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10, hasCrashDamage: true },
      { id: 100, name: 'teleport', type: 'psychic', power: null, accuracy: null, priority: 0, damageClass: 'status', pp: 20, maxPp: 20 }
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

test('Reckless: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('reckless');
  assert.ok(ab);
  assert.equal(ab.id, 'reckless');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_BASE_POWER'));
});

test('Reckless: boosts power of recoil moves (Double-Edge) by 4915/4096 (~1.2x)', () => {
  const user = makeMon(398, 'Staraptor', 'reckless');
  const target = makeMon(25, 'Pikachu', 'static');
  const move = user.moves[0]; // double-edge
  const pWith = P7.power(null, user, target, move, move.power);
  assert.equal(Math.round(pWith), Math.round(120 * (4915 / 4096))); // 144
});

test('Reckless: boosts power of crash damage moves (High Jump Kick)', () => {
  const user = makeMon(106, 'Hitmonlee', 'reckless');
  const target = makeMon(25, 'Pikachu', 'static');
  const move = user.moves[2]; // high-jump-kick
  const pWith = P7.power(null, user, target, move, move.power);
  assert.equal(Math.round(pWith), Math.round(130 * (4915 / 4096))); // 156
});

test('Reckless: does NOT boost non-recoil moves (Tackle)', () => {
  const user = makeMon(398, 'Staraptor', 'reckless');
  const target = makeMon(25, 'Pikachu', 'static');
  const move = user.moves[1]; // tackle
  const pWith = P7.power(null, user, target, move, move.power);
  assert.equal(pWith, 40);
});

test('Reckless: does NOT boost status moves', () => {
  const user = makeMon(398, 'Staraptor', 'reckless');
  const target = makeMon(25, 'Pikachu', 'static');
  const move = user.moves[3]; // teleport
  const pWith = P7.power(null, user, target, move, move.power);
  assert.equal(pWith, null);
});

test('Reckless: deals higher damage than neutral ability in full battle turn', () => {
  const rUser = makeMon(398, 'Staraptor', 'reckless', { attack: 110 });
  const nUser = makeMon(398, 'Staraptor', 'intimidate', { attack: 110 });
  const def1 = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, maxHp: 300, currentHp: 300 });
  const def2 = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, maxHp: 300, currentHp: 300 });

  const sWith = E.createTeamBattle(makeTeam(rUser), makeTeam(def1));
  const rWith = E.resolveTurn(sWith, {
    player: { type: 'MOVE', moveId: 38, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const sWithout = E.createTeamBattle(makeTeam(nUser), makeTeam(def2));
  const rWithout = E.resolveTurn(sWithout, {
    player: { type: 'MOVE', moveId: 38, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const dmgWith = rWith.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;
  const dmgWithout = rWithout.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;
  assert.ok(dmgWith > dmgWithout, `dmgWith (${dmgWith}) deve ser maior que dmgWithout (${dmgWithout})`);
});

test('Reckless: Neutralizing Gas suppresses power boost', () => {
  const user = makeMon(398, 'Staraptor', 'reckless');
  const gasWeezing = makeMon(110, 'Weezing', 'neutralizing-gas');
  const s = E.createTeamBattle(makeTeam(user), makeTeam(gasWeezing));
  P7.sync(s);

  const move = user.moves[0]; // double-edge
  const pSuppressed = P7.power(s, s.player.team[0], s.enemy.team[0], move, move.power);
  assert.equal(pSuppressed, 120);
});

test('Reckless: Battle Evaluator incorporates Reckless boost in expected damage', () => {
  const rUser = makeMon(398, 'Staraptor', 'reckless', { attack: 110 });
  const nUser = makeMon(398, 'Staraptor', 'intimidate', { attack: 110 });
  const target = makeMon(100, 'Voltorb', 'soundproof', { defense: 100 });
  const move = rUser.moves[0]; // double-edge

  const evalReckless = Ev.evaluateMove(rUser, target, move, { constants });
  const evalNormal = Ev.evaluateMove(nUser, target, move, { constants });
  assert.ok(evalReckless.expectedDamage > evalNormal.expectedDamage);
});

test('Reckless: boosts Supercell Slam (916) but does NOT boost Chloroblast (835)', () => {
  const user = makeMon(398, 'Staraptor', 'reckless');
  const target = makeMon(25, 'Pikachu', 'static');

  const supercell = { id: 916, name: 'supercell-slam', type: 'electric', power: 100, damageClass: 'physical' };
  const pSupercell = P7.power(null, user, target, supercell, 100);
  assert.equal(Math.round(pSupercell), Math.round(100 * (4915 / 4096)));

  const chloroblast = { id: 835, name: 'chloroblast', type: 'grass', power: 150, damageClass: 'special' };
  const pChloroblast = P7.power(null, user, target, chloroblast, 150);
  assert.equal(pChloroblast, 150, 'Chloroblast não deve receber bônus de poder de Reckless');

  const doubleEdge = { id: 38, name: 'double-edge', type: 'normal', power: 120, damageClass: 'physical' };
  const pDoubleEdge = P7.power(null, user, target, doubleEdge, 120);
  assert.equal(Math.round(pDoubleEdge), Math.round(120 * (4915 / 4096)));

  const headSmash = { id: 457, name: 'head-smash', type: 'rock', power: 150, damageClass: 'physical' };
  const pHeadSmash = P7.power(null, user, target, headSmash, 150);
  assert.equal(Math.round(pHeadSmash), Math.round(150 * (4915 / 4096)));
});

test('Reckless: Chloroblast comparison with and without Reckless', () => {
  const recklessUser = makeMon(398, 'Staraptor', 'reckless');
  const neutralUser = makeMon(398, 'Staraptor', 'intimidate');
  const target = makeMon(25, 'Pikachu', 'static');

  const chloroblast = { id: 835, name: 'chloroblast', type: 'grass', power: 150, damageClass: 'special' };
  const pWithout = P7.power(null, neutralUser, target, chloroblast, 150);
  const pWith = P7.power(null, recklessUser, target, chloroblast, 150);

  assert.equal(pWithout, 150);
  assert.equal(pWith, 150);
  assert.equal(pWith, pWithout, 'Poder efetivo de Chloroblast deve ser idêntico com e sem Reckless');
});
