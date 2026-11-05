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
    types: ['steel', 'flying'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical' }
    ],
    ...extra
  };
}

test('Mirror Armor: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('mirror-armor');
  assert.equal(meta.id, 'mirror-armor');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 8);
  assert.ok(meta.triggers.includes('ON_STAT_DROP'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, false);
});

test('Mirror Armor: Intimidate is reflected back to the Intimidate user (-1 Attack on foe)', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(823, 'Corviknight', 'mirror-armor')] },
    enemy: { activeIndex: 0, team: [makeMon(130, 'Gyarados', 'intimidate')] }
  };
  P7.start(s, constants);
  const corviknight = s.player.team[0];
  const gyarados = s.enemy.team[0];
  assert.equal(corviknight.statStages.attack, 0); // No drop on Corviknight
  assert.equal(gyarados.statStages.attack, -1); // Reflected to Gyarados
});

test('Mirror Armor: opponent stat drop move (Screech -2 Def) reflected to opponent', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(823, 'Corviknight', 'mirror-armor')] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const corviknight = s.player.team[0];
  const voltorb = s.enemy.team[0];
  P7.modifyStages(s, 'player', corviknight, { defense: -2 }, 'enemy', voltorb, 'screech', constants, events);
  assert.equal(corviknight.statStages.defense, 0);
  assert.equal(voltorb.statStages.defense, -2);
});

test('Mirror Armor: self stat drop (Close Combat) is NOT reflected', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(823, 'Corviknight', 'mirror-armor')] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const corviknight = s.player.team[0];
  const voltorb = s.enemy.team[0];
  P7.modifyStages(s, 'player', corviknight, { defense: -1, specialDefense: -1 }, 'player', corviknight, 'self-drop', constants, events);
  assert.equal(corviknight.statStages.defense, -1);
  assert.equal(corviknight.statStages.specialDefense, -1);
  assert.equal(voltorb.statStages.defense, 0);
});

test('Mirror Armor: two Mirror Armor users do NOT create an infinite loop', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(823, 'Corviknight-1', 'mirror-armor')] },
    enemy: { activeIndex: 0, team: [makeMon(823, 'Corviknight-2', 'mirror-armor')] }
  };
  const events = [];
  const corv1 = s.player.team[0];
  const corv2 = s.enemy.team[0];
  P7.modifyStages(s, 'player', corv1, { defense: -1 }, 'enemy', corv2, 'screech', constants, events);
  assert.equal(corv1.statStages.defense, 0);
  assert.equal(corv2.statStages.defense, -1); // Does not reflect back to corv1
});

test('Mirror Armor: reflected drop onto Defiant opponent triggers Defiant', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(823, 'Corviknight', 'mirror-armor')] },
    enemy: { activeIndex: 0, team: [makeMon(983, 'Kingambit', 'defiant')] }
  };
  const events = [];
  const corviknight = s.player.team[0];
  const kingambit = s.enemy.team[0];
  P7.modifyStages(s, 'player', corviknight, { defense: -1 }, 'enemy', kingambit, 'screech', constants, events);
  assert.equal(corviknight.statStages.defense, 0);
  assert.equal(kingambit.statStages.defense, -1); // Kingambit gets defense drop
  assert.equal(kingambit.statStages.attack, 2); // Kingambit's Defiant triggers!
});

test('Mirror Armor: reflected drop onto Contrary opponent is inverted to a boost', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(823, 'Corviknight', 'mirror-armor')] },
    enemy: { activeIndex: 0, team: [makeMon(497, 'Serperior', 'contrary')] }
  };
  const events = [];
  const corviknight = s.player.team[0];
  const serperior = s.enemy.team[0];
  P7.modifyStages(s, 'player', corviknight, { specialDefense: -1 }, 'enemy', serperior, 'fake-tears', constants, events);
  assert.equal(corviknight.statStages.specialDefense, 0);
  assert.equal(serperior.statStages.specialDefense, 1); // Inverted to +1 by Contrary
});

test('Mirror Armor: Neutralizing Gas suppresses Mirror Armor reflection', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(823, 'Corviknight', 'mirror-armor')] },
    enemy: { activeIndex: 0, team: [makeMon(110, 'Weezing', 'neutralizing-gas')] }
  };
  const events = [];
  P7.sync(s);
  const corviknight = s.player.team[0];
  const weezing = s.enemy.team[0];
  P7.modifyStages(s, 'player', corviknight, { defense: -2 }, 'enemy', weezing, 'screech', constants, events);
  assert.equal(corviknight.statStages.defense, -2); // Suffers drop, not reflected
  assert.equal(weezing.statStages.defense, 0);
});
