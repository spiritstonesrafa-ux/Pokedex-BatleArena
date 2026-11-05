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
    moves: [33].map(id => move(id)), // Tackle
    ...extra
  };
}

test('Anger Point: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('anger-point');
  assert.equal(meta.id, 'anger-point');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 4);
  assert.ok(meta.triggers.includes('AFTER_DAMAGING_HIT'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, true);
});

test('Anger Point: critical hit maximizes Attack to +6', () => {
  const s = E.createTeamBattle(
    [makeMon(128, 'Tauros', 'anger-point'), makeMon(100, 'Voltorb', 'soundproof'), makeMon(101, 'Electrode', 'soundproof')],
    [makeMon(130, 'Gyarados', 'intimidate', { speed: 150 }), makeMon(131, 'Lapras', 'water-absorb'), makeMon(132, 'Ditto', 'limber')]
  );
  // Gyarados uses Tackle with guaranteed critical hit (criticalRoll: 1)
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, criticalRoll: 1 }
  });
  const tauros = r.state.player.team[0];
  assert.equal(tauros.statStages.attack, 6);
  assert.ok(r.events.some(e => e.type === 'MOVE_PREPARED' && e.reason === 'P7_ABILITY' && e.label === 'anger-point'));
});

test('Anger Point: non-critical hit does NOT trigger Anger Point', () => {
  const s = E.createTeamBattle(
    [makeMon(128, 'Tauros', 'anger-point'), makeMon(100, 'Voltorb', 'soundproof'), makeMon(101, 'Electrode', 'soundproof')],
    [makeMon(130, 'Gyarados', 'intimidate', { speed: 150 }), makeMon(131, 'Lapras', 'water-absorb'), makeMon(132, 'Ditto', 'limber')]
  );
  // Gyarados uses Tackle without crit (criticalRoll: 24)
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, criticalRoll: 24 }
  });
  const tauros = r.state.player.team[0];
  // Initial Intimidate (-1 Atk), no Anger Point
  assert.equal(tauros.statStages.attack, -1);
});

test('Anger Point: does NOT trigger if bearer faints from the hit', () => {
  const s = E.createTeamBattle(
    [makeMon(128, 'Tauros', 'anger-point', { currentHp: 5, maxHp: 200 }), makeMon(100, 'Voltorb', 'soundproof'), makeMon(101, 'Electrode', 'soundproof')],
    [makeMon(130, 'Gyarados', 'intimidate', { speed: 150, attack: 300 }), makeMon(131, 'Lapras', 'water-absorb'), makeMon(132, 'Ditto', 'limber')]
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, criticalRoll: 1 }
  });
  const tauros = r.state.player.team[0];
  assert.equal(tauros.currentHp, 0);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'anger-point'));
});

test('Anger Point: does NOT trigger when critical hit lands on Substitute', () => {
  const s = E.createTeamBattle(
    [makeMon(128, 'Tauros', 'anger-point', { substitute: true, substituteHp: 80 }), makeMon(100, 'Voltorb', 'soundproof'), makeMon(101, 'Electrode', 'soundproof')],
    [makeMon(130, 'Gyarados', 'intimidate', { speed: 150 }), makeMon(131, 'Lapras', 'water-absorb'), makeMon(132, 'Ditto', 'limber')]
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, criticalRoll: 1 }
  });
  const tauros = r.state.player.team[0];
  // Attack remains at -1 from Intimidate (not boosted to +6)
  assert.equal(tauros.statStages.attack, -1);
});

test('Anger Point: Neutralizing Gas suppresses Anger Point', () => {
  const s = E.createTeamBattle(
    [makeMon(128, 'Tauros', 'anger-point'), makeMon(100, 'Voltorb', 'soundproof'), makeMon(101, 'Electrode', 'soundproof')],
    [makeMon(110, 'Weezing', 'neutralizing-gas', { speed: 150 }), makeMon(131, 'Lapras', 'water-absorb'), makeMon(132, 'Ditto', 'limber')]
  );
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, criticalRoll: 1 }
  });
  const tauros = r.state.player.team[0];
  assert.equal(tauros.statStages.attack, 0); // Suppressed
});
