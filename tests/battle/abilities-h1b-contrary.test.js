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
    types: ['grass'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical' }
    ],
    ...extra
  };
}

test('Contrary: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('contrary');
  assert.equal(meta.id, 'contrary');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 5);
  assert.ok(meta.triggers.includes('ON_STAT_STAGE_CHANGE'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, false);
});

test('Contrary: inverts positive boost into reduction (Swords Dance +2 becomes -2)', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(497, 'Serperior', 'contrary')] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const serperior = s.player.team[0];
  P7.modifyStages(s, 'player', serperior, { attack: 2 }, 'player', serperior, 'swords-dance', constants, events);
  assert.equal(serperior.statStages.attack, -2);
});

test('Contrary: inverts self stat drop into boost (Leaf Storm -2 SpA becomes +2 SpA)', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(497, 'Serperior', 'contrary')] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const serperior = s.player.team[0];
  P7.modifyStages(s, 'player', serperior, { specialAttack: -2 }, 'player', serperior, 'leaf-storm', constants, events);
  assert.equal(serperior.statStages.specialAttack, 2);
});

test('Contrary: inverts Intimidate into +1 Attack boost', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(497, 'Serperior', 'contrary')] },
    enemy: { activeIndex: 0, team: [makeMon(130, 'Gyarados', 'intimidate')] }
  };
  P7.start(s, constants);
  const serperior = s.player.team[0];
  assert.equal(serperior.statStages.attack, 1);
});

test('Contrary: inverts multiple stat drops into multiple boosts (Superpower -1 Atk, -1 Def)', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(687, 'Malamar', 'contrary')] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const malamar = s.player.team[0];
  P7.modifyStages(s, 'player', malamar, { attack: -1, defense: -1 }, 'player', malamar, 'superpower', constants, events);
  assert.equal(malamar.statStages.attack, 1);
  assert.equal(malamar.statStages.defense, 1);
});

test('Contrary: stat boundaries (-6 / +6) are respected', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(497, 'Serperior', 'contrary', { statStages: { attack: 0, defense: 0, specialAttack: 5, specialDefense: 0, speed: 0 } })] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const serperior = s.player.team[0];
  P7.modifyStages(s, 'player', serperior, { specialAttack: -2 }, 'player', serperior, 'leaf-storm', constants, events);
  assert.equal(serperior.statStages.specialAttack, 6);
});

test('Contrary: Neutralizing Gas suppresses Contrary (drops remain drops)', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(497, 'Serperior', 'contrary')] },
    enemy: { activeIndex: 0, team: [makeMon(110, 'Weezing', 'neutralizing-gas')] }
  };
  const events = [];
  P7.sync(s);
  const serperior = s.player.team[0];
  const weezing = s.enemy.team[0];
  P7.modifyStages(s, 'player', serperior, { specialAttack: -2 }, 'enemy', weezing, 'fake-tears', constants, events);
  assert.equal(serperior.statStages.specialAttack, -2);
});
