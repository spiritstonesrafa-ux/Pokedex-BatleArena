const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');

const constants = { ...C, P7 };

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
    statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, ...(extra.statStages || {}) },
    accuracyStage: extra.accuracyStage ?? 0,
    evasionStage: extra.evasionStage ?? 0,
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

test('Unaware: registry metadata conforms to Gen IX SV', () => {
  const ab = Reg.getAbility('unaware');
  assert.ok(ab);
  assert.equal(ab.id, 'unaware');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.equal(ab.breakable, true);
  assert.ok(ab.triggers.includes('ON_ANY_MODIFY_BOOST'));
});

test('Unaware: defending ignores attacker Attack and Special Attack stages', () => {
  const clodsire = makeMon(980, 'Clodsire', 'unaware', { defense: 100, specialDefense: 100 });
  const attacker = makeMon(25, 'Pikachu', 'static', {
    attack: 100,
    specialAttack: 100,
    statStages: { attack: 2, defense: 0, specialAttack: 3, specialDefense: 0, speed: 0 }
  });

  // When attacker attacks Unaware Clodsire, attacker's +2 Atk and +3 SpAtk are ignored (stage 0 -> stat 100)
  const effAtk = constants.getEffectiveStat(attacker, 'attack', clodsire, true);
  assert.equal(effAtk, 100);

  const effSpAtk = constants.getEffectiveStat(attacker, 'specialAttack', clodsire, true);
  assert.equal(effSpAtk, 100);
});

test('Unaware: attacking ignores defender Defense and Special Defense stages', () => {
  const dondozo = makeMon(977, 'Dondozo', 'unaware', { attack: 100, specialAttack: 100 });
  const defender = makeMon(205, 'Forretress', 'sturdy', {
    defense: 100,
    specialDefense: 100,
    statStages: { attack: 0, defense: 4, specialAttack: 0, specialDefense: 2, speed: 0 }
  });

  // When Dondozo attacks Forretress, defender's +4 Def and +2 SpDef are ignored (evaluated as 100)
  const effDef = constants.getEffectiveStat(defender, 'defense', dondozo, false);
  assert.equal(effDef, 100);

  const effSpDef = constants.getEffectiveStat(defender, 'specialDefense', dondozo, false);
  assert.equal(effSpDef, 100);
});

test('Unaware: preserves own stat stage modifications', () => {
  const skeledirge = makeMon(911, 'Skeledirge', 'unaware', {
    attack: 100,
    defense: 100,
    statStages: { attack: 2, defense: 2, specialAttack: 0, specialDefense: 0, speed: 0 }
  });
  const opponent = makeMon(25, 'Pikachu', 'static');

  // Skeledirge's own +2 Atk when attacking opponent is NOT ignored (100 * (4/2) = 200)
  const ownOffensive = constants.getEffectiveStat(skeledirge, 'attack', opponent, true);
  assert.equal(ownOffensive, 200);

  // Skeledirge's own +2 Def when defending against opponent is NOT ignored (100 * (4/2) = 200)
  const ownDefensive = constants.getEffectiveStat(skeledirge, 'defense', opponent, false);
  assert.equal(ownDefensive, 200);
});

test('Unaware: defending ignores attacker Accuracy stages and attacking ignores defender Evasion', () => {
  const clodsire = makeMon(980, 'Clodsire', 'unaware');
  const enemy = makeMon(25, 'Pikachu', 'static', { accuracyStage: 2, evasionStage: 3 });

  // Enemy attacking Clodsire: enemy's +2 accuracy is ignored
  const effEnemyAcc = constants.getEffectiveAccuracy({ id: 85, name: 'thunderbolt', accuracy: 100 }, enemy, clodsire);
  assert.equal(effEnemyAcc, 100);

  // Clodsire attacking enemy: enemy's +3 evasion is ignored
  const effClodAcc = constants.getEffectiveAccuracy({ id: 85, name: 'thunderbolt', accuracy: 100 }, clodsire, enemy);
  assert.equal(effClodAcc, 100);
});

test('Unaware: does NOT ignore Speed stages of either Pokémon', () => {
  const clodsire = makeMon(980, 'Clodsire', 'unaware', { speed: 100, statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 2 } });
  // Speed stages are never ignored by Unaware (stage 2 -> 100 * (4/2) = 200)
  const effSpeed = constants.getEffectiveStat(clodsire, 'speed', null, true);
  assert.equal(effSpeed, 200);
});

test('Unaware: Mold Breaker attacker bypasses defender Unaware to use own attack boosts', () => {
  const clodsire = makeMon(980, 'Clodsire', 'unaware', { defense: 100 });
  const pinsir = makeMon(127, 'Pinsir', 'mold-breaker', {
    attack: 100,
    statStages: { attack: 2, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }
  });

  // Pinsir has Mold Breaker; Clodsire's Unaware is bypassed, so Pinsir's +2 Atk applies (200)
  const effAtk = constants.getEffectiveStat(pinsir, 'attack', clodsire, true);
  assert.equal(effAtk, 200);
});

test('Unaware: suppressed under Neutralizing Gas allows opponent stat stages to apply', () => {
  const clodsire = makeMon(980, 'Clodsire', 'unaware', { neutralizingGasSuppressed: true, defense: 100 });
  const attacker = makeMon(25, 'Pikachu', 'static', {
    attack: 100,
    statStages: { attack: 2, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }
  });

  // When Unaware is suppressed, attacker's +2 Atk is NOT ignored (100 * 2 = 200)
  const effAtk = constants.getEffectiveStat(attacker, 'attack', clodsire, true);
  assert.equal(effAtk, 200);
});

