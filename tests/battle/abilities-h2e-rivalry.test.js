const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');

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
    gender: extra.gender || 'M',
    stats: { hp, attack, defense, specialAttack, specialDefense, speed, ...(extra.stats || {}) },
    statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    accuracyStage: 0,
    evasionStage: 0,
    types: ['normal'],
    ability,
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

test('Rivalry: registry metadata conforms to Gen IX SV', () => {
  const ab = Reg.getAbility('rivalry');
  assert.ok(ab);
  assert.equal(ab.id, 'rivalry');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.equal(ab.breakable, false);
  assert.ok(ab.triggers.includes('ON_BASE_POWER'));
});

test('Rivalry: boosts base power by 1.25x against same gender (M vs M)', () => {
  const attacker = makeMon(405, 'Luxray', 'rivalry', { gender: 'M' });
  const defender = makeMon(25, 'Pikachu', 'static', { gender: 'M' });
  const move = { id: 33, name: 'tackle', type: 'normal', power: 40 };

  const bp = P7.power(null, attacker, defender, move, 40);
  assert.equal(bp, 50); // 40 * 1.25 = 50
});

test('Rivalry: boosts base power by 1.25x against same gender (F vs F)', () => {
  const attacker = makeMon(405, 'Luxray', 'rivalry', { gender: 'F' });
  const defender = makeMon(25, 'Pikachu', 'static', { gender: 'F' });
  const move = { id: 85, name: 'thunderbolt', type: 'electric', power: 100 };

  const bp = P7.power(null, attacker, defender, move, 100);
  assert.equal(bp, 125); // 100 * 1.25 = 125
});

test('Rivalry: reduces base power to 0.75x against opposite gender (M vs F)', () => {
  const attacker = makeMon(405, 'Luxray', 'rivalry', { gender: 'M' });
  const defender = makeMon(25, 'Pikachu', 'static', { gender: 'F' });
  const move = { id: 33, name: 'tackle', type: 'normal', power: 40 };

  const bp = P7.power(null, attacker, defender, move, 40);
  assert.equal(bp, 30); // 40 * 0.75 = 30
});

test('Rivalry: reduces base power to 0.75x against opposite gender (F vs M)', () => {
  const attacker = makeMon(405, 'Luxray', 'rivalry', { gender: 'F' });
  const defender = makeMon(25, 'Pikachu', 'static', { gender: 'M' });
  const move = { id: 85, name: 'thunderbolt', type: 'electric', power: 100 };

  const bp = P7.power(null, attacker, defender, move, 100);
  assert.equal(bp, 75); // 100 * 0.75 = 75
});

test('Rivalry: base power remains 1.0x when defender is genderless (N)', () => {
  const attacker = makeMon(405, 'Luxray', 'rivalry', { gender: 'M' });
  const defender = makeMon(81, 'Magnemite', 'magnet-pull', { gender: 'N' });
  const move = { id: 33, name: 'tackle', type: 'normal', power: 40 };

  const bp = P7.power(null, attacker, defender, move, 40);
  assert.equal(bp, 40);
});

test('Rivalry: battle engine applies 1.25x damage boost in combat', () => {
  const attackerSame = makeMon(405, 'Luxray', 'rivalry', { gender: 'M', attack: 100, speed: 100 });
  const defenderSame = makeMon(25, 'Pikachu', 'static', { gender: 'M', defense: 100, currentHp: 500, maxHp: 500 });
  const stateSame = E.createTeamBattle(makeTeam(attackerSame), makeTeam(defenderSame));

  const rSame = E.resolveTurn(stateSame, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const attackerOpp = makeMon(405, 'Luxray', 'rivalry', { gender: 'M', attack: 100, speed: 100 });
  const defenderOpp = makeMon(25, 'Pikachu', 'static', { gender: 'F', defense: 100, currentHp: 500, maxHp: 500 });
  const stateOpp = E.createTeamBattle(makeTeam(attackerOpp), makeTeam(defenderOpp));

  const rOpp = E.resolveTurn(stateOpp, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const dmgSame = rSame.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  const dmgOpp = rOpp.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.ok(dmgSame > dmgOpp, `Same gender damage (${dmgSame}) must exceed opposite gender damage (${dmgOpp})`);
});

test('Rivalry: suppressed under Neutralizing Gas deals normal 1.0x power', () => {
  const attacker = makeMon(405, 'Luxray', 'rivalry', { gender: 'M', neutralizingGasSuppressed: true });
  const defender = makeMon(25, 'Pikachu', 'static', { gender: 'F' });
  const move = { id: 33, name: 'tackle', type: 'normal', power: 40 };

  const bp = P7.power(null, attacker, defender, move, 40);
  assert.equal(bp, 40, 'Neutralizing Gas suppresses Rivalry 0.75x penalty');
});
