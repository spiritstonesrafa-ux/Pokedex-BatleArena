const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const magearna = (extra = {}) => ({
  id: 801,
  name: 'magearna',
  types: ['steel', 'fairy'],
  level: 50,
  hp: 155,
  maxHp: 155,
  currentHp: 155,
  attack: 95,
  defense: 115,
  specialAttack: 130,
  specialDefense: 115,
  speed: 65,
  weightKg: 80.5,
  ability: 'soul-heart',
  moves: [94, 14].map(id => move(id)), // Psychic, Swords Dance
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
  speed: 50,
  ability: 'overgrow',
  moves: [33, 94, 14].map(id => move(id)), // Tackle, Psychic, Swords Dance
  ...extra
});

const act = (moveId, extra = {}) => ({ type: 'MOVE', moveId, ...extra });
const getMon = s => s.player.team ? s.player.team[s.player.activeIndex || 0] : s.player;
const getFoe = s => s.enemy.team ? s.enemy.team[s.enemy.activeIndex || 0] : s.enemy;

test('Soul-Heart: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('soul-heart');
  assert.ok(meta);
  assert.equal(meta.id, 'soul-heart');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.suppressible, true);
  assert.equal(meta.copyable, true);
  assert.equal(meta.swappable, true);
  assert.deepEqual(meta.triggers, ['ON_ANY_FAINT']);
});

test('Soul-Heart: direct attack KO of opponent grants +1 Special Attack', () => {
  const s = E.createTeamBattle(
    [magearna({ specialAttack: 300 }), dummy(5), dummy(6)],
    [dummy(2, { hp: 5, currentHp: 5 }), dummy(3), dummy(4)]
  );
  const r = E.resolveTurn(s, {
    player: act(94), // KOs dummy(2)
    enemy: act(14)
  });
  const mag = r.state.player.team[0];
  assert.equal(mag.statStages.specialAttack, 1);
});

test('Soul-Heart: residual damage KO of opponent grants +1 Special Attack', () => {
  // Opponent faints from burn
  const foe = dummy(2, { hp: 1, currentHp: 1, statusCondition: 'burn' });
  const s = E.createTeamBattle(
    [magearna(), dummy(5), dummy(6)],
    [foe, dummy(3), dummy(4)]
  );
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(14)
  });
  const mag = r.state.player.team[0];
  assert.equal(mag.statStages.specialAttack, 1);
});

test('Soul-Heart in Doubles: ally faint grants +1 Special Attack to Magearna', () => {
  const ally = dummy(10, { hp: 5, currentHp: 5, moves: [move(14)] });
  const s = E.createDoublesBattle(
    [magearna(), ally],
    [dummy(20, { attack: 300, moves: [move(33)] }), dummy(21, { moves: [move(14)] })]
  );
  // Enemy attacks ally (slot 1) and KOs it
  const r = E.resolveDoublesTurn(s, {
    player: { 0: act(14), 1: act(14) },
    enemy: { 0: act(33, { targetRole: 'player', targetSlot: 1 }), 1: act(14) }
  });
  const mag = r.state.player.team[0];
  assert.equal(mag.statStages.specialAttack, 1);
});

test('Soul-Heart in Doubles: double KO from spread attack grants +2 Special Attack', () => {
  const enemy1 = dummy(20, { hp: 5, currentHp: 5 });
  const enemy2 = dummy(21, { hp: 5, currentHp: 5 });
  const s = E.createDoublesBattle(
    [dummy(1, { specialAttack: 400, moves: [move(57)] }), magearna()], // Surf #57 hits all adjacent
    [enemy1, enemy2]
  );
  const r = E.resolveDoublesTurn(s, {
    player: { 0: act(57), 1: act(14) },
    enemy: { 0: act(14), 1: act(14) }
  });
  const mag = r.state.player.team[1];
  // 2 enemies fainted -> +2 Special Attack!
  assert.equal(mag.statStages.specialAttack, 2);
});

test('Soul-Heart: Magearna itself fainting does not trigger self stat increase', () => {
  const s = E.createTeamBattle(
    [magearna({ hp: 5, currentHp: 5 }), dummy(5), dummy(6)],
    [dummy(2, { attack: 300 }), dummy(3), dummy(4)]
  );
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(33) // KOs Magearna
  });
  const mag = r.state.player.team[0];
  assert.equal(mag.currentHp, 0);
  assert.equal(mag.statStages.specialAttack, 0);
});

test('Soul-Heart: benched Magearna does not trigger Soul-Heart', () => {
  const s = E.createTeamBattle(
    [dummy(1, { attack: 300 }), magearna(), dummy(6)],
    [dummy(2, { hp: 5, currentHp: 5 }), dummy(3), dummy(4)]
  );
  const r = E.resolveTurn(s, {
    player: act(33), // KOs dummy(2)
    enemy: act(14)
  });
  const benchedMag = r.state.player.team[1];
  assert.equal(benchedMag.statStages.specialAttack, 0);
});

test('Soul-Heart: stat stage caps at +6', () => {
  const s = E.createTeamBattle(
    [magearna(), dummy(5), dummy(6)],
    [dummy(2, { hp: 5, currentHp: 5 }), dummy(3), dummy(4)]
  );
  s.player.team[0].statStages.specialAttack = 6;
  const r = E.resolveTurn(s, {
    player: act(94), // KOs dummy(2)
    enemy: act(14)
  });
  assert.equal(r.state.player.team[0].statStages.specialAttack, 6);
});

test('Soul-Heart: Neutralizing Gas suppresses Soul-Heart', () => {
  const s = E.createDoublesBattle(
    [magearna(), dummy(10, { hp: 5, currentHp: 5, moves: [move(14)] })],
    [dummy(110, { ability: 'neutralizing-gas', attack: 300, moves: [move(33)] }), dummy(21, { moves: [move(14)] })]
  );
  const r = E.resolveDoublesTurn(s, {
    player: { 0: act(14), 1: act(14) },
    enemy: { 0: act(33, { targetRole: 'player', targetSlot: 1 }), 1: act(14) }
  });
  const mag = r.state.player.team[0];
  assert.equal(mag.statStages.specialAttack, 0);
});
