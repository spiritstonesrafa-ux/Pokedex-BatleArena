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
    types: ['electric', 'steel'],
    ability,
    moves: [
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 15, maxPp: 15 },
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 100, name: 'teleport', type: 'psychic', power: null, accuracy: null, priority: 0, damageClass: 'status', pp: 20, maxPp: 20 },
      { id: 98, name: 'quick-attack', type: 'normal', power: 40, accuracy: 100, priority: 1, damageClass: 'physical', pp: 30, maxPp: 30 }
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

test('Analytic: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('analytic');
  assert.ok(ab);
  assert.equal(ab.id, 'analytic');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_BASE_POWER'));
});

test('Analytic: boosts move power by 5325/4096 (~1.3x) when defender acted before attacker', () => {
  const magnezone = makeMon(462, 'Magnezone', 'analytic');
  const target = makeMon(25, 'Pikachu', 'static', { actedThisTurn: true });
  const move = magnezone.moves[0]; // thunderbolt (90)
  const p = P7.power(null, magnezone, target, move, move.power);
  assert.equal(Math.round(p), Math.round(90 * (5325 / 4096))); // 117
});

test('Analytic: boosts move power when defender switched in this turn', () => {
  const magnezone = makeMon(462, 'Magnezone', 'analytic');
  const target = makeMon(25, 'Pikachu', 'static', { switchedInThisTurn: true });
  const move = magnezone.moves[0];
  const p = P7.power(null, magnezone, target, move, move.power);
  assert.equal(Math.round(p), Math.round(90 * (5325 / 4096)));
});

test('Analytic: does NOT boost move power when attacker acts first', () => {
  const magnezone = makeMon(462, 'Magnezone', 'analytic');
  const target = makeMon(25, 'Pikachu', 'static', { actedThisTurn: false, switchedInThisTurn: false });
  const move = magnezone.moves[0];
  const p = P7.power(null, magnezone, target, move, move.power);
  assert.equal(p, 90);
});

test('Analytic: does NOT boost status moves even when moving second', () => {
  const magnezone = makeMon(462, 'Magnezone', 'analytic');
  const target = makeMon(25, 'Pikachu', 'static', { actedThisTurn: true });
  const move = magnezone.moves[2]; // teleport
  const p = P7.power(null, magnezone, target, move, move.power);
  assert.equal(p, null);
});

test('Analytic: works for both physical and special moves', () => {
  const magnezone = makeMon(462, 'Magnezone', 'analytic');
  const target = makeMon(25, 'Pikachu', 'static', { actedThisTurn: true });

  const pSpecial = P7.power(null, magnezone, target, magnezone.moves[0], 90);
  const pPhysical = P7.power(null, magnezone, target, magnezone.moves[1], 70);

  assert.equal(Math.round(pSpecial), Math.round(90 * (5325 / 4096)));
  assert.equal(Math.round(pPhysical), Math.round(70 * (5325 / 4096)));
});

test('Analytic: in full battle turn, slower Analytic user deals higher damage than neutral ability', () => {
  // Magnezone speed 30 (moves second), Pikachu speed 120 (moves first)
  const aZone = makeMon(462, 'Magnezone', 'analytic', { speed: 30, specialAttack: 100 });
  const nZone = makeMon(462, 'Magnezone', 'sturdy', { speed: 30, specialAttack: 100 });
  const pika1 = makeMon(25, 'Pikachu', 'static', { speed: 120, maxHp: 300, currentHp: 300, specialDefense: 100 });
  const pika2 = makeMon(25, 'Pikachu', 'static', { speed: 120, maxHp: 300, currentHp: 300, specialDefense: 100 });

  const sWith = E.createTeamBattle(makeTeam(aZone), makeTeam(pika1));
  const rWith = E.resolveTurn(sWith, {
    player: { type: 'MOVE', moveId: 85, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 163, damageRoll: 100 }
  });

  const sWithout = E.createTeamBattle(makeTeam(nZone), makeTeam(pika2));
  const rWithout = E.resolveTurn(sWithout, {
    player: { type: 'MOVE', moveId: 85, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 163, damageRoll: 100 }
  });

  const dmgWith = rWith.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;
  const dmgWithout = rWithout.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;
  assert.ok(dmgWith > dmgWithout, `dmgWith (${dmgWith}) deve ser superior a dmgWithout (${dmgWithout})`);
});

test('Analytic: priority move by slower user acts first and does NOT receive Analytic boost', () => {
  // Magnezone speed 30, uses Quick Attack (priority +1)
  // Pikachu speed 120, uses Slash (priority 0)
  // Magnezone moves first, so Pikachu has not acted yet
  const aZone = makeMon(462, 'Magnezone', 'analytic', { speed: 30, attack: 100 });
  const nZone = makeMon(462, 'Magnezone', 'sturdy', { speed: 30, attack: 100 });
  const pika1 = makeMon(25, 'Pikachu', 'static', { speed: 120, maxHp: 300, currentHp: 300, defense: 100 });
  const pika2 = makeMon(25, 'Pikachu', 'static', { speed: 120, maxHp: 300, currentHp: 300, defense: 100 });

  const sWith = E.createTeamBattle(makeTeam(aZone), makeTeam(pika1));
  const rWith = E.resolveTurn(sWith, {
    player: { type: 'MOVE', moveId: 98, damageRoll: 100 }, // quick-attack (+1)
    enemy: { type: 'MOVE', moveId: 163, damageRoll: 100 }  // slash (0)
  });

  const sWithout = E.createTeamBattle(makeTeam(nZone), makeTeam(pika2));
  const rWithout = E.resolveTurn(sWithout, {
    player: { type: 'MOVE', moveId: 98, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 163, damageRoll: 100 }
  });

  const dmgWith = rWith.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;
  const dmgWithout = rWithout.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy')?.damage || 0;
  assert.equal(dmgWith, dmgWithout, `Ao agir primeiro com prioridade, Analytic NÃO deve ativar (dmgWith ${dmgWith} === dmgWithout ${dmgWithout})`);
});

test('Analytic: Neutralizing Gas suppresses Analytic power boost', () => {
  const magnezone = makeMon(462, 'Magnezone', 'analytic');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { actedThisTurn: true });

  const s = E.createTeamBattle(makeTeam(magnezone), makeTeam(weezing));
  P7.sync(s);

  const move = magnezone.moves[0];
  const p = P7.power(s, s.player.team[0], s.enemy.team[0], move, move.power);
  assert.equal(p, 90);
});
