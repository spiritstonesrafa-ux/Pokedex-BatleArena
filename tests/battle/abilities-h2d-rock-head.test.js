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
    types: ['rock', 'ground'],
    ability,
    moves: [
      { id: 38, name: 'double-edge', type: 'normal', power: 120, accuracy: 100, priority: 0, damageClass: 'physical', pp: 15, maxPp: 15, recoilRatio: 0.333 },
      { id: 457, name: 'head-smash', type: 'rock', power: 150, accuracy: 80, priority: 0, damageClass: 'physical', pp: 5, maxPp: 5, recoilRatio: 0.5 },
      { id: 165, name: 'struggle', type: 'normal', power: 50, accuracy: null, priority: 0, damageClass: 'physical', pp: 1, maxPp: 1 },
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

test('Rock Head: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('rock-head');
  assert.ok(ab);
  assert.equal(ab.id, 'rock-head');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_DAMAGE_RECOIL'));
});

test('Rock Head: completely prevents recoil from Double-Edge (no RECOIL_APPLIED event)', () => {
  const user = makeMon(74, 'Geodude', 'rock-head', { attack: 100 });
  const target = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, maxHp: 300, currentHp: 300 });

  const s = E.createTeamBattle(makeTeam(user), makeTeam(target));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 38, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const recoilEv = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.target === 'player' && e.moveName === 'double-edge');
  assert.equal(recoilEv, undefined, 'Não deve emitir evento de recoil para portador de Rock Head');
  assert.equal(r.state.player.team[0].currentHp, 250 - (r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'player')?.damage || 0));
});

test('Rock Head: prevents high recoil from Head Smash (0.5 recoil)', () => {
  const user = makeMon(304, 'Aron', 'rock-head', { attack: 120 });
  const target = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, maxHp: 400, currentHp: 400 });

  const s = E.createTeamBattle(makeTeam(user), makeTeam(target));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 457, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const recoilEv = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.target === 'player' && e.moveName === 'head-smash');
  assert.equal(recoilEv, undefined);
});

test('Rock Head: does NOT prevent Struggle self-damage', () => {
  const user = makeMon(74, 'Geodude', 'rock-head', { maxHp: 200, currentHp: 200 });
  const target = makeMon(100, 'Voltorb', 'soundproof', { maxHp: 200, currentHp: 200 });

  const s = E.createTeamBattle(makeTeam(user), makeTeam(target));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 165, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const struggleRecoil = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.target === 'player');
  assert.ok(struggleRecoil, 'Struggle deve causar dano mesmo com Rock Head');
  assert.equal(struggleRecoil.damage, 50); // 200 / 4
});

test('Rock Head: does NOT prevent Life Orb recoil damage', () => {
  const user = makeMon(74, 'Geodude', 'rock-head', { item: 'life-orb', maxHp: 200, currentHp: 200 });
  const target = makeMon(100, 'Voltorb', 'soundproof', { maxHp: 200, currentHp: 200 });

  const s = E.createTeamBattle(makeTeam(user), makeTeam(target));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100 }, // tackle
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const lifeOrbRecoil = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'LIFE_ORB');
  assert.ok(lifeOrbRecoil, 'Life Orb recoil deve ocorrer normalmente');
  assert.equal(lifeOrbRecoil.damage, 20); // 200 / 10
});

test('Rock Head: user with neutral ability takes standard recoil damage', () => {
  const normalUser = makeMon(74, 'Geodude', 'sturdy', { attack: 100 });
  const target = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, maxHp: 300, currentHp: 300 });

  const s = E.createTeamBattle(makeTeam(normalUser), makeTeam(target));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 38, damageRoll: 100 }, // double-edge
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const recoilEv = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.target === 'player');
  assert.ok(recoilEv, 'Sem Rock Head, o atacante deve sofrer recoil de Double-Edge');
  assert.ok(recoilEv.damage > 0);
});

test('Rock Head: Neutralizing Gas suppresses Rock Head, causing recoil to be taken', () => {
  const user = makeMon(74, 'Geodude', 'rock-head', { attack: 100 });
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { defense: 100, maxHp: 300, currentHp: 300 });

  const s = E.createTeamBattle(makeTeam(user), makeTeam(weezing));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 38, damageRoll: 100 }, // double-edge
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const recoilEv = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.target === 'player');
  assert.ok(recoilEv, 'Com Neutralizing Gas ativo, Rock Head é suprimida e recoil é aplicado');
  assert.ok(recoilEv.damage > 0);
});

test('Rock Head: Battle Evaluator evaluates expectedRecoil as 0', () => {
  const rUser = makeMon(74, 'Geodude', 'rock-head', { attack: 100 });
  const nUser = makeMon(74, 'Geodude', 'sturdy', { attack: 100 });
  const target = makeMon(100, 'Voltorb', 'soundproof', { defense: 100 });
  const move = rUser.moves[0]; // double-edge

  const evalRockHead = Ev.evaluateMove(rUser, target, move, { constants });
  const evalNormal = Ev.evaluateMove(nUser, target, move, { constants });

  assert.equal(evalRockHead.expectedRecoil, 0);
  assert.ok(evalNormal.expectedRecoil > 0);
});

test('Rock Head: prevents recoil from Gen IX recoil move Wave Crash (834)', () => {
  const user = makeMon(74, 'Geodude', 'rock-head', {
    attack: 100,
    moves: [
      { id: 834, name: 'wave-crash', type: 'water', power: 120, accuracy: 100, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10, recoilRatio: 0.333 }
    ]
  });
  const target = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, maxHp: 300, currentHp: 300 });

  const s = E.createTeamBattle(makeTeam(user), makeTeam(target));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 834, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const recoilEv = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.target === 'player' && e.moveName === 'wave-crash');
  assert.equal(recoilEv, undefined, 'Wave Crash não deve causar dano de recuo em portador de Rock Head');
});

test('Rock Head: Chloroblast without Rock Head deals 50% max HP canonical recoil', () => {
  const user = makeMon(101, 'Electrode-Hisui', 'static', {
    maxHp: 200,
    currentHp: 200,
    specialAttack: 100,
    moves: [
      { id: 835, name: 'chloroblast', type: 'grass', power: 150, accuracy: 100, priority: 0, damageClass: 'special', pp: 5, maxPp: 5 }
    ]
  });
  const target = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, specialDefense: 100, maxHp: 500, currentHp: 500 });

  const s = E.createTeamBattle(makeTeam(user), makeTeam(target));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 835, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const recoilEv = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.target === 'player' && e.moveName === 'chloroblast');
  assert.ok(recoilEv, 'Chloroblast sem Rock Head deve disparar RECOIL_APPLIED');
  assert.equal(recoilEv.damage, 100, 'Recoil de Chloroblast deve ser exatamente 50% do max HP (100 de 200)');
  assert.equal(recoilEv.previousHp, 200, 'HP antes do recuo deve ser 200');
  assert.equal(recoilEv.currentHp, 100, 'HP imediatamente após o recuo deve ser 100');
});

test('Rock Head: Chloroblast with Rock Head completely negates the 50% max HP recoil', () => {
  const user = makeMon(101, 'Electrode-Hisui', 'rock-head', {
    maxHp: 200,
    currentHp: 200,
    specialAttack: 100,
    moves: [
      { id: 835, name: 'chloroblast', type: 'grass', power: 150, accuracy: 100, priority: 0, damageClass: 'special', pp: 5, maxPp: 5 }
    ]
  });
  const target = makeMon(100, 'Voltorb', 'soundproof', { defense: 100, specialDefense: 100, maxHp: 500, currentHp: 500 });

  const s = E.createTeamBattle(makeTeam(user), makeTeam(target));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 835, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  const recoilEv = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.target === 'player' && e.moveName === 'chloroblast');
  assert.equal(recoilEv, undefined, 'Rock Head deve prevenir completamente o recuo de Chloroblast');
  // Receives only enemy Tackle damage (if any)
  assert.ok(r.state.player.team[0].currentHp > 150, 'Usuário não deve sofrer o recuo de 100 HP');
});

test('Rock Head + Reckless simulated combination: Chloroblast has power 150 and 0 recoil', () => {
  const chloroblast = { id: 835, name: 'chloroblast', type: 'grass', power: 150, accuracy: 100, priority: 0, damageClass: 'special', pp: 5, maxPp: 5 };
  const user = makeMon(101, 'Electrode-Hisui', 'rock-head', {
    maxHp: 200,
    currentHp: 200,
    specialAttack: 100,
    moves: [chloroblast]
  });
  const target = makeMon(100, 'Voltorb', 'soundproof', { maxHp: 500, currentHp: 500 });

  // 1. Power under Reckless is unboosted (150)
  const p = P7.power(null, { ...user, ability: 'reckless' }, target, chloroblast, 150);
  assert.equal(p, 150, 'Chloroblast sob Reckless não recebe bônus de poder');

  // 2. Recoil under Rock Head is 0
  const s = E.createTeamBattle(makeTeam(user), makeTeam(target));
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 835, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });
  const recoilEv = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.target === 'player');
  assert.equal(recoilEv, undefined, 'Recoil prevenido por Rock Head');
});
