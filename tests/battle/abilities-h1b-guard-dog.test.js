const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const P8 = require('../../assets/js/battle/p8-special');

const constants = { ...C, P7, P8 };
const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

function makeMon(id, name, ability, extra = {}) {
  return {
    id,
    name,
    level: 50,
    maxHp: 200,
    currentHp: 200,
    stats: { hp: 200, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100 },
    statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    types: ['dark'],
    ability,
    moves: [33, 525].map(id => move(id)), // Tackle, Dragon Tail
    ...extra
  };
}

test('Guard Dog: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('guard-dog');
  assert.equal(meta.id, 'guard-dog');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 9);
  assert.ok(meta.triggers.includes('ON_TRY_STAT_DROP'));
  assert.ok(meta.triggers.includes('ON_FORCED_SWITCH'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, true);
});

test('Guard Dog: Intimidate Attack drop is blocked and instead grants +1 Attack', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(943, 'Mabosstiff', 'guard-dog')] },
    enemy: { activeIndex: 0, team: [makeMon(130, 'Gyarados', 'intimidate')] }
  };
  P7.start(s, constants);
  const mabosstiff = s.player.team[0];
  assert.equal(mabosstiff.statStages.attack, 1);
});

test('Guard Dog: immune to forced switch from Dragon Tail (damage applied, switch cancelled)', () => {
  const s = E.createTeamBattle(
    [makeMon(943, 'Mabosstiff', 'guard-dog'), makeMon(100, 'Voltorb', 'soundproof'), makeMon(101, 'Electrode', 'soundproof')],
    [makeMon(130, 'Gyarados', 'intimidate', { speed: 150 }), makeMon(131, 'Lapras', 'water-absorb'), makeMon(132, 'Ditto', 'limber')]
  );
  // Gyarados is faster, uses Dragon Tail #525 on Mabosstiff
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 525 }
  });
  // Mabosstiff remains active (index 0)
  assert.equal(r.state.player.activeIndex, 0);
  assert.ok(r.events.some(e => e.type === 'MOVE_PREPARED' && e.reason === 'P7_ABILITY' && e.label === 'guard-dog'));
  assert.ok(!r.events.some(e => e.type === 'POKEMON_SWITCHED' && e.reason === 'FORCED'));
});

test('Guard Dog: voluntary switch is NOT blocked', () => {
  const s = E.createTeamBattle(
    [makeMon(943, 'Mabosstiff', 'guard-dog'), makeMon(100, 'Voltorb', 'soundproof'), makeMon(101, 'Electrode', 'soundproof')],
    [makeMon(143, 'Snorlax', 'thick-fat'), makeMon(144, 'Articuno', 'pressure'), makeMon(145, 'Zapdos', 'pressure')]
  );
  const r = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  assert.equal(r.state.player.activeIndex, 1);
  assert.ok(r.events.some(e => e.type === 'POKEMON_SWITCHED'));
});

test('Guard Dog in Doubles: immune to forced switch', () => {
  const s = E.createDoublesBattle(
    [makeMon(943, 'Mabosstiff', 'guard-dog'), makeMon(100, 'Voltorb', 'soundproof')],
    [makeMon(130, 'Gyarados', 'intimidate', { speed: 150 }), makeMon(143, 'Snorlax', 'thick-fat')]
  );
  const r = E.resolveTurn(s, {
    player: {
      action: { type: 'MOVE', moveId: 33 },
      pairedAction: { type: 'MOVE', moveId: 33 }
    },
    enemy: {
      action: { type: 'MOVE', moveId: 525, targetSlot: 0 },
      pairedAction: { type: 'MOVE', moveId: 33, targetSlot: 1 }
    }
  });
  // Mabosstiff remains in active slot 0
  assert.equal(r.state.player.activeIndices[0], 0);
  assert.ok(r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'guard-dog'));
});

test('Guard Dog: Neutralizing Gas suppresses Guard Dog (Intimidate lowers Attack by -1)', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(943, 'Mabosstiff', 'guard-dog')] },
    enemy: { activeIndex: 0, team: [makeMon(110, 'Weezing', 'neutralizing-gas')] }
  };
  const events = [];
  P7.sync(s);
  const mabosstiff = s.player.team[0];
  const weezing = s.enemy.team[0];
  P7.modifyStages(s, 'player', mabosstiff, { attack: -1 }, 'enemy', weezing, 'intimidate', constants, events);
  assert.equal(mabosstiff.statStages.attack, -1);
});
