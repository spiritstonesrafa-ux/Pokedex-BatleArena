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
    types: ['normal'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical' },
      { id: 94, name: 'psychic', type: 'psychic', power: 90, accuracy: 100, priority: 0, damageClass: 'special' }
    ],
    ...extra
  };
}

test('Defiant: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('defiant');
  assert.equal(meta.id, 'defiant');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 5);
  assert.ok(meta.triggers.includes('ON_STAT_DROP'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, false);
});

test('Defiant: Intimidate lowers Attack by 1 then triggers Defiant (+2 Atk, net +1)', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(983, 'Kingambit', 'defiant')] },
    enemy: { activeIndex: 0, team: [makeMon(130, 'Gyarados', 'intimidate')] }
  };
  const events = [];
  P7.start(s, constants);
  const kingambit = s.player.team[0];
  assert.equal(kingambit.statStages.attack, 1);
});

test('Defiant: stat drop from opponent status move triggers +2 Attack', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(983, 'Kingambit', 'defiant')] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const kingambit = s.player.team[0];
  const voltorb = s.enemy.team[0];
  P7.modifyStages(s, 'player', kingambit, { defense: -2 }, 'enemy', voltorb, 'screech', constants, events);
  assert.equal(kingambit.statStages.defense, -2);
  assert.equal(kingambit.statStages.attack, 2);
  assert.ok(events.some(e => e.type === 'MOVE_PREPARED' && e.reason === 'P7_ABILITY' && e.label === 'defiant'));
});

test('Defiant: self stat drop (Close Combat / Curse) does NOT trigger Defiant', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(983, 'Kingambit', 'defiant')] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const kingambit = s.player.team[0];
  P7.modifyStages(s, 'player', kingambit, { defense: -1, specialDefense: -1 }, 'player', kingambit, 'self-drop', constants, events);
  assert.equal(kingambit.statStages.defense, -1);
  assert.equal(kingambit.statStages.specialDefense, -1);
  assert.equal(kingambit.statStages.attack, 0);
});

test('Defiant: multiple stats lowered in single event triggers Defiant once (+2 Attack)', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(983, 'Kingambit', 'defiant')] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const kingambit = s.player.team[0];
  const voltorb = s.enemy.team[0];
  P7.modifyStages(s, 'player', kingambit, { attack: -1, specialAttack: -1, speed: -1 }, 'enemy', voltorb, 'venom-drench', constants, events);
  assert.equal(kingambit.statStages.attack, 1);
  assert.equal(kingambit.statStages.specialAttack, -1);
  assert.equal(kingambit.statStages.speed, -1);
});

test('Defiant: Attack caps at +6 and cannot exceed maximum', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(983, 'Kingambit', 'defiant', { statStages: { attack: 5, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 } })] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const kingambit = s.player.team[0];
  const voltorb = s.enemy.team[0];
  P7.modifyStages(s, 'player', kingambit, { defense: -1 }, 'enemy', voltorb, 'leer', constants, events);
  assert.equal(kingambit.statStages.defense, -1);
  assert.equal(kingambit.statStages.attack, 6);
});

test('Defiant: Neutralizing Gas suppresses Defiant activation', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(983, 'Kingambit', 'defiant')] },
    enemy: { activeIndex: 0, team: [makeMon(110, 'Weezing', 'neutralizing-gas')] }
  };
  const events = [];
  P7.sync(s);
  const kingambit = s.player.team[0];
  const weezing = s.enemy.team[0];
  P7.modifyStages(s, 'player', kingambit, { defense: -1 }, 'enemy', weezing, 'screech', constants, events);
  assert.equal(kingambit.statStages.defense, -1);
  assert.equal(kingambit.statStages.attack, 0);
});

test('Defiant in Doubles: ally stat drops do NOT trigger Defiant', () => {
  const s = {
    battleFormat: 'DOUBLES',
    version: 2,
    player: {
      activeIndices: [0, 1],
      team: [
        makeMon(983, 'Kingambit', 'defiant'),
        makeMon(100, 'Voltorb', 'soundproof')
      ]
    },
    enemy: {
      activeIndices: [0, 1],
      team: [
        makeMon(130, 'Gyarados', 'intimidate'),
        makeMon(143, 'Snorlax', 'thick-fat')
      ]
    }
  };
  const events = [];
  const kingambit = s.player.team[0];
  const allyVoltorb = s.player.team[1];
  P7.modifyStages(s, 'player', kingambit, { speed: -1 }, 'player', allyVoltorb, 'bulldoze', constants, events);
  assert.equal(kingambit.statStages.speed, -1);
  assert.equal(kingambit.statStages.attack, 0);
});
