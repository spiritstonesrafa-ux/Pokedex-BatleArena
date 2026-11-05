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

test('Competitive: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('competitive');
  assert.equal(meta.id, 'competitive');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 6);
  assert.ok(meta.triggers.includes('ON_STAT_DROP'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, false);
});

test('Competitive: Intimidate lowers Attack by 1 then triggers Competitive (+2 SpA)', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(350, 'Milotic', 'competitive')] },
    enemy: { activeIndex: 0, team: [makeMon(130, 'Gyarados', 'intimidate')] }
  };
  P7.start(s, constants);
  const milotic = s.player.team[0];
  assert.equal(milotic.statStages.attack, -1);
  assert.equal(milotic.statStages.specialAttack, 2);
});

test('Competitive: stat drop from opponent status move triggers +2 Special Attack', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(350, 'Milotic', 'competitive')] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const milotic = s.player.team[0];
  const voltorb = s.enemy.team[0];
  P7.modifyStages(s, 'player', milotic, { specialDefense: -2 }, 'enemy', voltorb, 'fake-tears', constants, events);
  assert.equal(milotic.statStages.specialDefense, -2);
  assert.equal(milotic.statStages.specialAttack, 2);
  assert.ok(events.some(e => e.type === 'MOVE_PREPARED' && e.reason === 'P7_ABILITY' && e.label === 'competitive'));
});

test('Competitive: self stat drop does NOT trigger Competitive', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(350, 'Milotic', 'competitive')] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const milotic = s.player.team[0];
  P7.modifyStages(s, 'player', milotic, { specialAttack: -2 }, 'player', milotic, 'overheat', constants, events);
  assert.equal(milotic.statStages.specialAttack, -2); // No boost, just the -2
});

test('Competitive: Special Attack caps at +6', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(350, 'Milotic', 'competitive', { statStages: { attack: 0, defense: 0, specialAttack: 5, specialDefense: 0, speed: 0 } })] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const milotic = s.player.team[0];
  const voltorb = s.enemy.team[0];
  P7.modifyStages(s, 'player', milotic, { speed: -1 }, 'enemy', voltorb, 'string-shot', constants, events);
  assert.equal(milotic.statStages.speed, -1);
  assert.equal(milotic.statStages.specialAttack, 6);
});

test('Competitive: Neutralizing Gas suppresses Competitive activation', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(350, 'Milotic', 'competitive')] },
    enemy: { activeIndex: 0, team: [makeMon(110, 'Weezing', 'neutralizing-gas')] }
  };
  const events = [];
  P7.sync(s);
  const milotic = s.player.team[0];
  const weezing = s.enemy.team[0];
  P7.modifyStages(s, 'player', milotic, { specialDefense: -1 }, 'enemy', weezing, 'screech', constants, events);
  assert.equal(milotic.statStages.specialDefense, -1);
  assert.equal(milotic.statStages.specialAttack, 0);
});

test('Competitive in Doubles: ally stat drops do NOT trigger Competitive', () => {
  const s = {
    battleFormat: 'DOUBLES',
    version: 2,
    player: {
      activeIndices: [0, 1],
      team: [
        makeMon(350, 'Milotic', 'competitive'),
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
  const milotic = s.player.team[0];
  const ally = s.player.team[1];
  P7.modifyStages(s, 'player', milotic, { speed: -1 }, 'player', ally, 'bulldoze', constants, events);
  assert.equal(milotic.statStages.speed, -1);
  assert.equal(milotic.statStages.specialAttack, 0);
});
