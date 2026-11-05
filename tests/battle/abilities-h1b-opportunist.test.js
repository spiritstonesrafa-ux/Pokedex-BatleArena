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
    types: ['psychic'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical' }
    ],
    ...extra
  };
}

test('Opportunist: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('opportunist');
  assert.equal(meta.id, 'opportunist');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 9);
  assert.ok(meta.triggers.includes('ON_FOE_STAT_BOOST'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, false);
});

test('Opportunist: copies opponent Swords Dance (+2 Attack)', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(956, 'Espathra', 'opportunist')] },
    enemy: { activeIndex: 0, team: [makeMon(212, 'Scizor', 'technician')] }
  };
  const events = [];
  const espathra = s.player.team[0];
  const scizor = s.enemy.team[0];
  P7.modifyStages(s, 'enemy', scizor, { attack: 2 }, 'enemy', scizor, 'swords-dance', constants, events);
  assert.equal(scizor.statStages.attack, 2);
  assert.equal(espathra.statStages.attack, 2);
  assert.ok(events.some(e => e.type === 'MOVE_PREPARED' && e.reason === 'P7_ABILITY' && e.label === 'opportunist'));
});

test('Opportunist: copies multiple stat boosts from opponent (Dragon Dance +1 Atk, +1 Spe)', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(956, 'Espathra', 'opportunist')] },
    enemy: { activeIndex: 0, team: [makeMon(130, 'Gyarados', 'intimidate')] }
  };
  const events = [];
  const espathra = s.player.team[0];
  const gyarados = s.enemy.team[0];
  P7.modifyStages(s, 'enemy', gyarados, { attack: 1, speed: 1 }, 'enemy', gyarados, 'dragon-dance', constants, events);
  assert.equal(espathra.statStages.attack, 1);
  assert.equal(espathra.statStages.speed, 1);
});

test('Opportunist: does NOT copy stat drops', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(956, 'Espathra', 'opportunist')] },
    enemy: { activeIndex: 0, team: [makeMon(100, 'Voltorb', 'soundproof')] }
  };
  const events = [];
  const espathra = s.player.team[0];
  const voltorb = s.enemy.team[0];
  P7.modifyStages(s, 'enemy', voltorb, { defense: -2 }, 'player', espathra, 'screech', constants, events);
  assert.equal(voltorb.statStages.defense, -2);
  assert.equal(espathra.statStages.defense, 0); // Did not copy drop
});

test('Opportunist: two opposing Opportunists do NOT enter infinite loop', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(956, 'Espathra-1', 'opportunist')] },
    enemy: { activeIndex: 0, team: [makeMon(956, 'Espathra-2', 'opportunist')] }
  };
  const events = [];
  const esp1 = s.player.team[0];
  const esp2 = s.enemy.team[0];
  P7.modifyStages(s, 'enemy', esp2, { specialAttack: 2 }, 'enemy', esp2, 'nasty-plot', constants, events);
  assert.equal(esp2.statStages.specialAttack, 2);
  assert.equal(esp1.statStages.specialAttack, 2); // Copied once, does not bounce back and forth
});

test('Opportunist in Doubles: does NOT copy ally boosts', () => {
  const s = {
    battleFormat: 'DOUBLES',
    version: 2,
    player: {
      activeIndices: [0, 1],
      team: [
        makeMon(956, 'Espathra', 'opportunist'),
        makeMon(212, 'Scizor', 'technician')
      ]
    },
    enemy: {
      activeIndices: [0, 1],
      team: [
        makeMon(100, 'Voltorb', 'soundproof'),
        makeMon(143, 'Snorlax', 'thick-fat')
      ]
    }
  };
  const events = [];
  const espathra = s.player.team[0];
  const allyScizor = s.player.team[1];
  P7.modifyStages(s, 'player', allyScizor, { attack: 2 }, 'player', allyScizor, 'swords-dance', constants, events);
  assert.equal(allyScizor.statStages.attack, 2);
  assert.equal(espathra.statStages.attack, 0); // Ally boost not copied
});

test('Opportunist: Neutralizing Gas suppresses Opportunist activation', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(956, 'Espathra', 'opportunist')] },
    enemy: { activeIndex: 0, team: [makeMon(110, 'Weezing', 'neutralizing-gas')] }
  };
  const events = [];
  P7.sync(s);
  const espathra = s.player.team[0];
  const weezing = s.enemy.team[0];
  P7.modifyStages(s, 'enemy', weezing, { defense: 2 }, 'enemy', weezing, 'iron-defense', constants, events);
  assert.equal(weezing.statStages.defense, 2);
  assert.equal(espathra.statStages.defense, 0); // Suppressed, no copy
});
