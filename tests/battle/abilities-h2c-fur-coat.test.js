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
  const hp = extra.maxHp || extra.hp || extra.currentHp || 200;
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
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 58, name: 'ice-beam', type: 'ice', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 },
      { id: 473, name: 'psyshock', type: 'psychic', power: 80, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 }
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

test('Fur Coat: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('fur-coat');
  assert.ok(ab);
  assert.equal(ab.id, 'fur-coat');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.breakable, true);
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_MODIFY_DEF'));
});

test('Fur Coat: doubles effective Defense stat (100 -> 200)', () => {
  const furfrou = makeMon(676, 'Furfrou', 'fur-coat', { defense: 100 });
  const effDef = constants.getEffectiveStat(furfrou, 'defense');
  assert.equal(effDef, 200);
});

test('Fur Coat: significantly reduces damage taken from physical attacks', () => {
  const attacker = makeMon(25, 'Pikachu', 'static', { attack: 120 });
  const furfrouWith = makeMon(676, 'Furfrou', 'fur-coat', { maxHp: 300, currentHp: 300, defense: 100 });
  const furfrouWithout = makeMon(676, 'Furfrou', 'run-away', { maxHp: 300, currentHp: 300, defense: 100 });

  const sWith = E.createTeamBattle(makeTeam(attacker), makeTeam(furfrouWith));
  const rWith = E.resolveTurn(sWith, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgWith = rWith.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const sWithout = E.createTeamBattle(makeTeam(attacker), makeTeam(furfrouWithout));
  const rWithout = E.resolveTurn(sWithout, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgWithout = rWithout.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.ok(dmgWith < dmgWithout, `Fur Coat (${dmgWith}) should take less damage than without (${dmgWithout})`);
  assert.ok(dmgWith <= Math.ceil(dmgWithout * 0.6), 'Fur Coat doubles defense, nearly halving damage');
});

test('Fur Coat: applies against special moves targeting Defense (Psyshock)', () => {
  const psyshock = { id: 473, name: 'psyshock', type: 'psychic', power: 80, damageClass: 'special' };
  const attacker = makeMon(150, 'Mewtwo', 'pressure', { specialAttack: 150 });
  const furfrou = makeMon(676, 'Furfrou', 'fur-coat', { defense: 100, specialDefense: 100 });
  const plain = makeMon(676, 'Furfrou', 'run-away', { defense: 100, specialDefense: 100 });

  const prevWith = Ev.evaluateMove(attacker, furfrou, psyshock, { constants });
  const prevWithout = Ev.evaluateMove(attacker, plain, psyshock, { constants });

  assert.ok(prevWith.expectedDamage < prevWithout.expectedDamage, 'Psyshock should deal less damage against Fur Coat');
});

test('Fur Coat: does NOT double Special Defense against standard special moves (Ice Beam)', () => {
  const furfrou = makeMon(676, 'Furfrou', 'fur-coat', { specialDefense: 100 });
  const effSpDef = constants.getEffectiveStat(furfrou, 'specialDefense');
  assert.equal(effSpDef, 100);
});

test('Fur Coat: critical hits do NOT bypass Fur Coat defense boost', () => {
  const attacker = makeMon(25, 'Pikachu', 'static', { attack: 120 });
  const furfrou = makeMon(676, 'Furfrou', 'fur-coat', { maxHp: 400, currentHp: 400, defense: 100 });
  const plain = makeMon(676, 'Furfrou', 'run-away', { maxHp: 400, currentHp: 400, defense: 100 });

  const sWith = E.createTeamBattle(makeTeam(attacker), makeTeam(furfrou));
  const rWith = E.resolveTurn(sWith, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100, criticalRoll: 1 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgWith = rWith.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const sWithout = E.createTeamBattle(makeTeam(attacker), makeTeam(plain));
  const rWithout = E.resolveTurn(sWithout, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100, criticalRoll: 1 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgWithout = rWithout.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.ok(dmgWith < dmgWithout, `Critical hit should still deal less damage to Fur Coat (${dmgWith}) than plain (${dmgWithout})`);
});

test('Fur Coat: Mold Breaker attacker ignores Fur Coat defense boost (unless Ability Shield)', () => {
  const haxorus = makeMon(612, 'Haxorus', 'mold-breaker', { attack: 120 });
  const furfrou = makeMon(676, 'Furfrou', 'fur-coat', { maxHp: 300, currentHp: 300, defense: 100 });
  const furfrouShield = makeMon(676, 'Furfrou', 'fur-coat', { maxHp: 300, currentHp: 300, defense: 100, item: 'ability-shield' });

  const s1 = E.createTeamBattle(makeTeam(haxorus), makeTeam(furfrou));
  const r1 = E.resolveTurn(s1, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgIgnored = r1.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const s2 = E.createTeamBattle(makeTeam(haxorus), makeTeam(furfrouShield));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100, criticalRoll: 24 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dmgPreserved = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.ok(dmgIgnored > dmgPreserved, `Mold Breaker should deal more damage (${dmgIgnored}) than against Ability Shield (${dmgPreserved})`);
});

test('Fur Coat: Neutralizing Gas suppresses Fur Coat, restoring standard Defense', () => {
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');
  const furfrou = makeMon(676, 'Furfrou', 'fur-coat', { maxHp: 300, currentHp: 300, defense: 100 });
  const s = E.createTeamBattle(makeTeam(weezing), makeTeam(furfrou));

  const targetFurfrou = s.enemy.team[0];
  assert.equal(targetFurfrou.neutralizingGasSuppressed, true);
  const effDef = constants.getEffectiveStat(targetFurfrou, 'defense');
  assert.equal(effDef, 100);
});
