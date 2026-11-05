const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const passimian = (extra = {}) => ({
  id: 766,
  name: 'passimian',
  types: ['fighting'],
  level: 50,
  hp: 175,
  maxHp: 175,
  currentHp: 175,
  attack: 120,
  defense: 90,
  specialAttack: 40,
  specialDefense: 60,
  speed: 80,
  weightKg: 82.8,
  ability: 'receiver',
  moves: [33, 14].map(id => move(id)), // Tackle, Swords Dance
  ...extra
});

const dummy = (id = 2, extra = {}) => ({
  id,
  name: 'dummy-' + id,
  types: ['normal'],
  level: 50,
  hp: 200,
  maxHp: 200,
  currentHp: 200,
  attack: 100,
  defense: 100,
  specialAttack: 100,
  specialDefense: 100,
  speed: 70,
  ability: 'moxie',
  moves: [33, 94, 14].map(id => move(id)), // Tackle, Psychic, Swords Dance
  ...extra
});

const act = (moveId, extra = {}) => ({ type: 'MOVE', moveId, ...extra });

test('Receiver: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('receiver');
  assert.ok(meta);
  assert.equal(meta.id, 'receiver');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H7');
  assert.equal(meta.suppressible, true);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
  assert.deepEqual(meta.triggers, ['ON_ALLY_FAINT']);
});

test('Receiver: in Singles does not activate when enemy faints', () => {
  const s = E.createBattle(
    passimian({ attack: 300 }),
    dummy(2, { hp: 5, currentHp: 5, ability: 'moxie' })
  );
  const r = E.resolveTurn(s, {
    player: act(33),
    enemy: act(14)
  });
  const m = s.player.team ? s.player.team[0] : s.player;
  assert.equal(m.ability, 'receiver');
  assert.ok(!m.originalAbility);
  assert.ok(!r.events.some(e => e.type === 'ABILITY_INHERITED'));
});

test('Receiver in Doubles: inherits ally ability when conscious ally faints', () => {
  // In Doubles: Player has [Passimian, Ally with Moxie]
  const ally = dummy(10, { hp: 5, currentHp: 5, ability: 'moxie', moves: [move(14)] });
  const s = E.createDoublesBattle(
    [passimian(), ally],
    [dummy(20, { attack: 300, moves: [move(33)] }), dummy(21, { moves: [move(14)] })]
  );
  // Turn: Enemy attacks slot 1 (ally), KOing ally
  const r = E.resolveDoublesTurn(s, {
    player: {
      0: act(14),
      1: act(14)
    },
    enemy: {
      0: act(33, { targetRole: 'player', targetSlot: 1 }),
      1: act(14)
    }
  });
  const pass = r.state.player.team[0];
  assert.equal(pass.ability, 'moxie');
  assert.equal(pass.originalAbility, 'receiver');
  const inhEvt = r.events.find(e => e.type === 'ABILITY_INHERITED');
  assert.ok(inhEvt);
  assert.equal(inhEvt.inheritedAbility, 'moxie');
});

test('Receiver in Doubles: inherited on-entry ability Intimidate triggers on inheritance', () => {
  const ally = dummy(10, { hp: 5, currentHp: 5, ability: 'intimidate', moves: [move(14)] });
  const s = E.createDoublesBattle(
    [passimian(), ally],
    [dummy(20, { attack: 300, moves: [move(33)] }), dummy(21, { moves: [move(14)] })]
  );
  const r = E.resolveDoublesTurn(s, {
    player: {
      0: act(14),
      1: act(14)
    },
    enemy: {
      0: act(33, { targetRole: 'player', targetSlot: 1 }),
      1: act(14)
    }
  });
  const pass = r.state.player.team[0];
  assert.equal(pass.ability, 'intimidate');
  // Intimidate lowered active enemies' attack
  assert.ok(r.state.enemy.team[0].statStages.attack < 0 || r.state.enemy.team[1].statStages.attack < 0);
});

test('Receiver in Doubles: does not inherit non-inheritable abilities (e.g. Disguise, Neutralizing Gas)', () => {
  for (const nonInh of ['disguise', 'neutralizing-gas', 'multitype', 'battle-bond', 'zero-to-hero']) {
    const ally = dummy(10, { hp: 5, currentHp: 5, ability: nonInh, moves: [move(14)] });
    const s = E.createDoublesBattle(
      [passimian(), ally],
      [dummy(20, { attack: 300, moves: [move(33)] }), dummy(21, { moves: [move(14)] })]
    );
    const r = E.resolveDoublesTurn(s, {
      player: {
        0: act(14),
        1: act(14)
      },
      enemy: {
        0: act(33, { targetRole: 'player', targetSlot: 1 }),
        1: act(14)
      }
    });
    const pass = r.state.player.team[0];
    assert.equal(pass.ability, 'receiver');
    assert.ok(!pass.originalAbility);
  }
});

test('Receiver in Doubles: does not inherit ability if fainted ally held Ability Shield', () => {
  const ally = dummy(10, { hp: 5, currentHp: 5, ability: 'moxie', item: 'ability-shield', moves: [move(14)] });
  const s = E.createDoublesBattle(
    [passimian(), ally],
    [dummy(20, { attack: 300, moves: [move(33)] }), dummy(21, { moves: [move(14)] })]
  );
  const r = E.resolveDoublesTurn(s, {
    player: {
      0: act(14),
      1: act(14)
    },
    enemy: {
      0: act(33, { targetRole: 'player', targetSlot: 1 }),
      1: act(14)
    }
  });
  const pass = r.state.player.team[0];
  assert.equal(pass.ability, 'receiver');
  assert.ok(!pass.originalAbility);
});

test('Receiver: does not trigger if bearer is suppressed by Neutralizing Gas', () => {
  const ally = dummy(10, { hp: 5, currentHp: 5, ability: 'moxie', moves: [move(14)] });
  const weezing = dummy(110, { ability: 'neutralizing-gas', attack: 300, moves: [move(33)] });
  const s = E.createDoublesBattle(
    [passimian(), ally],
    [weezing, dummy(21, { moves: [move(14)] })]
  );
  const r = E.resolveDoublesTurn(s, {
    player: {
      0: act(14),
      1: act(14)
    },
    enemy: {
      0: act(33, { targetRole: 'player', targetSlot: 1 }),
      1: act(14)
    }
  });
  const pass = r.state.player.team[0];
  assert.equal(pass.ability, 'receiver');
  assert.ok(!pass.originalAbility);
});

test('Receiver in Doubles: switch-out restores original ability receiver', () => {
  const ally = dummy(10, { hp: 5, currentHp: 5, ability: 'swift-swim', moves: [move(33), move(14)] });
  const reserve1 = dummy(11);
  const reserve2 = dummy(12);
  const s = E.createDoublesBattle(
    [passimian(), ally, reserve1, reserve2],
    [dummy(20, { attack: 300 }), dummy(21)]
  );
  // Turn 1: ally faints, Passimian inherits swift-swim
  const r1 = E.resolveDoublesTurn(s, {
    player: {
      0: act(14),
      1: act(14)
    },
    enemy: {
      0: act(33, { targetRole: 'player', targetSlot: 1 }),
      1: act(33, { targetRole: 'player', targetSlot: 1 })
    }
  });
  assert.equal(r1.state.player.team[0].ability, 'swift-swim');

  // Replace fainted ally with reserve1
  const rReplace = E.resolveDoublesReplacement(r1.state, {
    player: { 1: 11 }
  });

  // Switch Passimian for reserve2
  const r2 = E.resolveDoublesTurn(rReplace.state, {
    player: {
      0: { type: 'SWITCH', targetPokemonId: 12 },
      1: act(33, { targetRole: 'enemy', targetSlot: 0 })
    },
    enemy: {
      0: act(33, { targetRole: 'player', targetSlot: 1 }),
      1: act(33, { targetRole: 'player', targetSlot: 1 })
    }
  });
  // Passimian in reserve has ability restored to receiver
  assert.equal(r2.state.player.team[0].ability, 'receiver');
  assert.ok(!r2.state.player.team[0].originalAbility);
});
