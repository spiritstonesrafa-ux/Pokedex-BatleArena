const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const P8 = require('../../assets/js/battle/p8-special');
const Ev = require('../../assets/js/battle/battle-evaluator');

const constants = { ...C, P7, P8 };

function makeMon(id, name, ability, extra = {}) {
  const hp = extra.maxHp || extra.hp || extra.currentHp || 250;
  const attack = extra.attack ?? 100;
  const defense = extra.defense ?? 100;
  const specialAttack = extra.specialAttack ?? 100;
  const specialDefense = extra.specialDefense ?? 100;
  const speed = extra.speed ?? 100;
  return {
    id,
    name,
    level: 50,
    maxHp: hp,
    currentHp: extra.currentHp ?? hp,
    attack,
    defense,
    specialAttack,
    specialDefense,
    speed,
    stats: { hp, attack, defense, specialAttack, specialDefense, speed, ...(extra.stats || {}) },
    statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
    types: ['ice'],
    ability,
    moves: [
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 58, name: 'ice-beam', type: 'ice', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 }
    ],
    ...extra
  };
}

function makeTeam(lead, m2 = null, m3 = null) {
  return [
    lead,
    m2 || makeMon(901, 'ReserveA', 'soundproof'),
    m3 || makeMon(902, 'ReserveB', 'soundproof')
  ];
}

test('Gorilla Tactics: registry metadata conforms to Gen IX', () => {
  const ab = Reg.getAbility('gorilla-tactics');
  assert.ok(ab);
  assert.equal(ab.id, 'gorilla-tactics');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.ok(ab.triggers.includes('ON_MODIFY_ATK'));
  assert.ok(ab.triggers.includes('ON_DISABLE_MOVE'));
});

test('Gorilla Tactics: multiplies physical Attack stat by 1.5x (100 -> 150)', () => {
  const darmanitan = makeMon(10177, 'Darmanitan-Galar', 'gorilla-tactics', { attack: 100 });
  const effAtk = constants.getEffectiveStat(darmanitan, 'attack');
  assert.equal(effAtk, 150);
});

test('Gorilla Tactics: does NOT boost Special Attack', () => {
  const darmanitan = makeMon(10177, 'Darmanitan-Galar', 'gorilla-tactics', { specialAttack: 100 });
  const effSpAtk = constants.getEffectiveStat(darmanitan, 'specialAttack');
  assert.equal(effSpAtk, 100);
});

test('Gorilla Tactics: locks user into first selected move in full turn resolution', () => {
  const darmanitan = makeMon(10177, 'Darmanitan-Galar', 'gorilla-tactics', { speed: 110 });
  const target = makeMon(100, 'Voltorb', 'soundproof', { speed: 50, maxHp: 300, currentHp: 300 });

  const s = E.createTeamBattle(makeTeam(darmanitan), makeTeam(target));

  // Turn 1: use Slash (id 163)
  const r1 = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  assert.equal(r1.state.player.team[0].choiceLock, 163);

  // Turn 2: Attempting to use Tackle (id 33) must be rejected
  assert.throws(() => {
    E.resolveTurn(r1.state, {
      player: { type: 'MOVE', moveId: 33, damageRoll: 100 },
      enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
    });
  }, /ACTION_REJECTED/);

  // Turn 2: Repeating Slash (id 163) is valid and succeeds
  assert.doesNotThrow(() => {
    E.resolveTurn(r1.state, {
      player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
      enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
    });
  });
});

test('Gorilla Tactics: switching out clears the choice lock', () => {
  const darmanitan = makeMon(10177, 'Darmanitan-Galar', 'gorilla-tactics', { speed: 110 });
  const reserve = makeMon(25, 'Pikachu', 'static');
  const enemy = makeMon(100, 'Voltorb', 'soundproof', { speed: 50, maxHp: 300, currentHp: 300 });

  const s = E.createTeamBattle(makeTeam(darmanitan, reserve), makeTeam(enemy));

  // Turn 1: use Slash
  const r1 = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });
  assert.equal(r1.state.player.team[0].choiceLock, 163);

  // Turn 2: switch to reserve
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  // Turn 3: switch back to Darmanitan
  const r3 = E.resolveTurn(r2.state, {
    player: { type: 'SWITCH', targetIndex: 0 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  assert.equal(r3.state.player.team[0].choiceLock, null, 'choiceLock deve ser nulo após retornar a campo');
  // Now Darmanitan can freely choose Tackle
  assert.doesNotThrow(() => {
    E.resolveTurn(r3.state, {
      player: { type: 'MOVE', moveId: 33, damageRoll: 100 },
      enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
    });
  });
});

test('Gorilla Tactics: stacks multiplicatively with Choice Band (1.5 * 1.5 = 2.25x)', () => {
  const bandedDarmanitan = makeMon(10177, 'Darmanitan-Galar', 'gorilla-tactics', { item: 'choice-band', attack: 100 });
  const effAtk = constants.getEffectiveStat(bandedDarmanitan, 'attack');
  assert.equal(effAtk, 225); // 100 * 1.5 * 1.5
});

test('Gorilla Tactics: Neutralizing Gas suppresses Attack boost and choice lock', () => {
  const darmanitan = makeMon(10177, 'Darmanitan-Galar', 'gorilla-tactics', { attack: 100 });
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { defense: 100, maxHp: 300, currentHp: 300 });

  const s = E.createTeamBattle(makeTeam(darmanitan), makeTeam(weezing));
  P7.sync(s);

  const effAtk = constants.getEffectiveStat(s.player.team[0], 'attack');
  assert.equal(effAtk, 100);

  // Turn 1: Slash under Gas
  const r1 = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 163, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });

  // Turn 2: Tackle is NOT locked because Gorilla Tactics is suppressed
  assert.doesNotThrow(() => {
    E.resolveTurn(r1.state, {
      player: { type: 'MOVE', moveId: 33, damageRoll: 100 },
      enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
    });
  });
});

test('Gorilla Tactics: Battle Evaluator incorporates 1.5x physical damage boost', () => {
  const darmanitan = makeMon(10177, 'Darmanitan-Galar', 'gorilla-tactics', { attack: 100 });
  const normal = makeMon(10177, 'Darmanitan-Galar', 'run-away', { attack: 100 });
  const target = makeMon(100, 'Voltorb', 'soundproof', { defense: 100 });
  const move = darmanitan.moves[0]; // slash

  const evalGorilla = Ev.evaluateMove(darmanitan, target, move, { constants });
  const evalNormal = Ev.evaluateMove(normal, target, move, { constants });

  assert.ok(evalGorilla.expectedDamage > evalNormal.expectedDamage * 1.4);
});

test('Gorilla Tactics: Struggle does not Choice-lock the user', () => {
  const darmanitan = makeMon(10177, 'Darmanitan-Galar', 'gorilla-tactics', {
    moves: [
      { id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, currentPp: 0 },
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, currentPp: 0 }
    ]
  });
  const target = makeMon(100, 'Voltorb', 'soundproof', { maxHp: 300, currentHp: 300 });

  const s = E.createTeamBattle(makeTeam(darmanitan), makeTeam(target));
  const r1 = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 165 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  assert.equal(r1.state.player.team[0].choiceLock, null, 'Struggle não deve travar o Pokémon em choiceLock');
});
