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
    types: ['normal'],
    ability,
    moves: [33, 242, 247, 404].map(id => move(id)), // Tackle, Crunch, Shadow Ball, X-Scissor
    ...extra
  };
}

test('Rattled: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('rattled');
  assert.equal(meta.id, 'rattled');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 5);
  assert.ok(meta.triggers.includes('AFTER_DAMAGING_HIT'));
  assert.ok(meta.triggers.includes('ON_STAT_DROP'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, true);
});

test('Rattled: hit by Dark-type damaging move (Crunch #242) raises Speed by +1', () => {
  const s = E.createTeamBattle(
    [makeMon(206, 'Dunsparce', 'rattled'), makeMon(100, 'Voltorb', 'soundproof'), makeMon(101, 'Electrode', 'soundproof')],
    [makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }), makeMon(131, 'Lapras', 'water-absorb'), makeMon(132, 'Ditto', 'limber')]
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 242 }
  });
  const dunsparce = r.state.player.team[0];
  assert.equal(dunsparce.statStages.speed, 1);
  assert.ok(r.events.some(e => e.type === 'MOVE_PREPARED' && e.reason === 'P7_ABILITY' && e.label === 'rattled'));
});

test('Rattled: hit by Ghost-type damaging move (Shadow Ball #247) raises Speed by +1', () => {
  const s = E.createTeamBattle(
    // Give Dunsparce non-normal type so Ghost move connects
    [makeMon(206, 'Dunsparce', 'rattled', { types: ['water'] }), makeMon(100, 'Voltorb', 'soundproof'), makeMon(101, 'Electrode', 'soundproof')],
    [makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }), makeMon(131, 'Lapras', 'water-absorb'), makeMon(132, 'Ditto', 'limber')]
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 247 }
  });
  const dunsparce = r.state.player.team[0];
  assert.equal(dunsparce.statStages.speed, 1);
});

test('Rattled: hit by Bug-type damaging move (X-Scissor #404) raises Speed by +1', () => {
  const s = E.createTeamBattle(
    [makeMon(206, 'Dunsparce', 'rattled'), makeMon(100, 'Voltorb', 'soundproof'), makeMon(101, 'Electrode', 'soundproof')],
    [makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }), makeMon(131, 'Lapras', 'water-absorb'), makeMon(132, 'Ditto', 'limber')]
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 404 }
  });
  const dunsparce = r.state.player.team[0];
  assert.equal(dunsparce.statStages.speed, 1);
});

test('Rattled: hit by Normal-type move (Tackle #33) does NOT trigger Rattled', () => {
  const s = E.createTeamBattle(
    [makeMon(206, 'Dunsparce', 'rattled'), makeMon(100, 'Voltorb', 'soundproof'), makeMon(101, 'Electrode', 'soundproof')],
    [makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }), makeMon(131, 'Lapras', 'water-absorb'), makeMon(132, 'Ditto', 'limber')]
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33 }
  });
  const dunsparce = r.state.player.team[0];
  assert.equal(dunsparce.statStages.speed, 0);
});

test('Rattled: Intimidate raises Speed by +1 (and lowers Attack by -1)', () => {
  const s = {
    version: 2,
    player: { activeIndex: 0, team: [makeMon(206, 'Dunsparce', 'rattled')] },
    enemy: { activeIndex: 0, team: [makeMon(130, 'Gyarados', 'intimidate')] }
  };
  P7.start(s, constants);
  const dunsparce = s.player.team[0];
  assert.equal(dunsparce.statStages.attack, -1);
  assert.equal(dunsparce.statStages.speed, 1);
});

test('Rattled: hit on Substitute does NOT trigger Speed increase', () => {
  const s = E.createTeamBattle(
    [makeMon(206, 'Dunsparce', 'rattled', { substitute: true, substituteHp: 80 }), makeMon(100, 'Voltorb', 'soundproof'), makeMon(101, 'Electrode', 'soundproof')],
    [makeMon(143, 'Snorlax', 'thick-fat', { speed: 150 }), makeMon(131, 'Lapras', 'water-absorb'), makeMon(132, 'Ditto', 'limber')]
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 242 } // Crunch onto substitute
  });
  const dunsparce = r.state.player.team[0];
  assert.equal(dunsparce.statStages.speed, 0);
});

test('Rattled: Neutralizing Gas suppresses Rattled activation', () => {
  const s = E.createTeamBattle(
    [makeMon(206, 'Dunsparce', 'rattled'), makeMon(100, 'Voltorb', 'soundproof'), makeMon(101, 'Electrode', 'soundproof')],
    [makeMon(110, 'Weezing', 'neutralizing-gas', { speed: 150, moves: [move(242)] }), makeMon(131, 'Lapras', 'water-absorb'), makeMon(132, 'Ditto', 'limber')]
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 242 }
  });
  const dunsparce = r.state.player.team[0];
  assert.equal(dunsparce.statStages.speed, 0);
});
