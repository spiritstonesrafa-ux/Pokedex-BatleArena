const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const P8 = require('../../assets/js/battle/p8-special');

const constants = { ...C, P7, P8 };

function makeMon(id, name, ability, extra = {}) {
  const hp = extra.maxHp || extra.hp || extra.currentHp || 200;
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
    types: ['dark', 'steel'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 94, name: 'psychic', type: 'psychic', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 },
      { id: 182, name: 'protect', type: 'normal', power: null, accuracy: null, priority: 4, damageClass: 'status', pp: 10, maxPp: 10 }
    ],
    ...extra
  };
}

function makeTeam(lead, m2 = null, m3 = null, m4 = null, m5 = null, m6 = null) {
  const team = [lead];
  if (m2) team.push(m2);
  if (m3) team.push(m3);
  if (m4) team.push(m4);
  if (m5) team.push(m5);
  if (m6) team.push(m6);
  while (team.length < 3) {
    team.push(makeMon(100 + team.length, 'Filler' + team.length, 'soundproof'));
  }
  return team;
}

test('Supreme Overlord: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('supreme-overlord');
  assert.equal(meta.id, 'supreme-overlord');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 9);
  assert.ok(meta.triggers.includes('ON_ENTRY'));
  assert.ok(meta.triggers.includes('MODIFY_POWER'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Supreme Overlord: zero fainted allies gives base power (no boost)', () => {
  const kingambit = makeMon(983, 'Kingambit', 'supreme-overlord');
  const ally2 = makeMon(100, 'Ally2', 'soundproof', { currentHp: 100 });
  const ally3 = makeMon(101, 'Ally3', 'soundproof', { currentHp: 100 });
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { maxHp: 500, currentHp: 500 });
  const s = E.createTeamBattle([kingambit, ally2, ally3], makeTeam(foe));

  assert.equal(s.player.team[0].supremeOverlordFallen, 0);
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 182 }
  });
  // Protect blocked damage, but let's test damage when connecting
  const s2 = E.createTeamBattle([kingambit, ally2, ally3], makeTeam(foe));
  const r2 = E.resolveTurn(s2, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });
  const dmgApplied = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  // Power is unboosted 40
  assert.equal(dmgApplied.power, 40);
});

test('Supreme Overlord: 1 to 5 fainted allies progressively increases power and caps at 5', () => {
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { maxHp: 1000, currentHp: 1000 });
  const mods = [4096, 4506, 4915, 5325, 5734, 6144];

  // 1. Direct power calculation for 0 through 6 fainted
  for (let fainted = 0; fainted <= 6; fainted++) {
    const kingambit = makeMon(983, 'Kingambit', 'supreme-overlord');
    kingambit.supremeOverlordFallen = fainted;
    const resolved = P7.power(null, kingambit, foe, { id: 33, type: 'normal' }, 40);
    const expectedMod = mods[Math.min(5, fainted)];
    assert.equal(resolved, 40 * expectedMod / 4096);
  }

  // 2. In 3v3 battle: 0, 1, and 2 fainted in real engine
  for (let fainted = 0; fainted <= 2; fainted++) {
    const kingambit = makeMon(983, 'Kingambit', 'supreme-overlord');
    const ally1 = makeMon(201, 'Ally1', 'soundproof', { maxHp: 100, currentHp: fainted >= 1 ? 0 : 100 });
    const ally2 = makeMon(202, 'Ally2', 'soundproof', { maxHp: 100, currentHp: fainted >= 2 ? 0 : 100 });
    const s = E.createTeamBattle([kingambit, ally1, ally2], makeTeam(foe));
    assert.equal(s.player.team[0].supremeOverlordFallen, fainted);

    const r = E.resolveTurn(s, {
      player: { type: 'MOVE', moveId: 33, damageRoll: 100 },
      enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
    });
    const dmgApplied = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
    const expectedPower = 40 * mods[fainted] / 4096;
    assert.equal(dmgApplied.power, expectedPower);
  }
});

test('Supreme Overlord: does not count fainted foes or the user itself', () => {
  const kingambit = makeMon(983, 'Kingambit', 'supreme-overlord');
  const ally2 = makeMon(100, 'Ally2', 'soundproof', { currentHp: 100 });
  const ally3 = makeMon(101, 'Ally3', 'soundproof', { currentHp: 100 });
  // Opponent has 2 fainted members
  const foeLead = makeMon(143, 'Snorlax', 'thick-fat');
  const foeDead1 = makeMon(144, 'DeadFoe1', 'thick-fat', { currentHp: 0 });
  const foeDead2 = makeMon(145, 'DeadFoe2', 'thick-fat', { currentHp: 0 });

  const s = E.createTeamBattle([kingambit, ally2, ally3], [foeLead, foeDead1, foeDead2]);
  // Kingambit has 0 fainted allies; foe's dead members must not be counted
  assert.equal(s.player.team[0].supremeOverlordFallen, 0);
});

test('Supreme Overlord: switching out and back in updates count with newly fainted allies', () => {
  const leadPika = makeMon(25, 'Pikachu', 'static', { maxHp: 50, currentHp: 1, speed: 50 });
  const benchKingambit = makeMon(983, 'Kingambit', 'supreme-overlord', { maxHp: 200, currentHp: 200, speed: 60 });
  const benchFainted = makeMon(100, 'Voltorb', 'soundproof', { maxHp: 50, currentHp: 0 });
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { speed: 100, attack: 300 });

  const s = E.createTeamBattle([leadPika, benchKingambit, benchFainted], makeTeam(foe));

  // Turn 1: Pikachu is KOed by Snorlax Tackle
  const r1 = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });
  assert.equal(r1.state.player.team[0].currentHp, 0);

  // Send in Kingambit (now 2 allies fainted: Voltorb + Pikachu)
  const r2 = E.resolveReplacement(r1.state, {
    player: { targetPokemonId: 983 }
  });

  const activeKingambit = r2.state.player.team[r2.state.player.activeIndex];
  assert.equal(activeKingambit.supremeOverlordFallen, 2);
  assert.ok(r2.events.some(e => e.type === 'SUPREME_OVERLORD_ACTIVATED' && e.fallen === 2));
});

test('Supreme Overlord: Neutralizing Gas suppresses Supreme Overlord, activates when Gas ends', () => {
  const kingambit = makeMon(983, 'Kingambit', 'supreme-overlord');
  const allyDead = makeMon(100, 'DeadAlly', 'soundproof', { currentHp: 0 });
  const allyAlive = makeMon(101, 'AliveAlly', 'soundproof', { currentHp: 100 });
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { speed: 120, maxHp: 100, currentHp: 100 });
  const snorlax = makeMon(143, 'Snorlax', 'thick-fat', { speed: 50, maxHp: 1000, currentHp: 1000 });

  const s = E.createTeamBattle([kingambit, allyDead, allyAlive], [weezing, snorlax, makeMon(102, 'Filler', 'soundproof')]);

  // While gas is active, turn 1 attack should NOT have Supreme Overlord boost
  const r1 = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 182 }
  });
  // In turn 1 with gas, power is unboosted 40
  const r1Attack = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, damageRoll: 100 }
  });
  const dmg1 = r1Attack.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.equal(dmg1.power, 40);

  // Weezing switches out, ending gas -> Supreme Overlord activates
  const r2 = E.resolveTurn(r1Attack.state, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100 },
    enemy: { type: 'SWITCH', targetPokemonId: 143 }
  });
  assert.ok(r2.state.player.team[0].supremeOverlordFallen >= 1);
  const dmg2 = r2.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(dmg2.power > 40);
});

test('Supreme Overlord: doubles allies fainted while on field do not update fallen until re-entry', () => {
  // In doubles, fallen is fixed upon entry
  const kingambit = makeMon(983, 'Kingambit', 'supreme-overlord');
  kingambit.supremeOverlordFallen = 1;
  const ally = makeMon(100, 'Ally', 'soundproof', { currentHp: 50 });
  const s = {
    battleFormat: 'DOUBLES',
    player: { team: [kingambit, ally], activeIndices: [0, 1] }
  };
  // Ally faints during turn
  ally.currentHp = 0;
  // Power still uses existing supremeOverlordFallen (1) until re-entry
  const power = P7.power(s, kingambit, makeMon(143, 'Foe', 'thick-fat'), { id: 33, type: 'normal' }, 40);
  assert.equal(power, 40 * 4506 / 4096);
});

test('Supreme Overlord: works for both Physical and Special attacks', () => {
  const kingambit = makeMon(983, 'Kingambit', 'supreme-overlord');
  kingambit.supremeOverlordFallen = 2; // 4915 / 4096 (~1.2x)
  const foe = makeMon(143, 'Foe', 'thick-fat');

  const physicalPower = P7.power(null, kingambit, foe, { id: 33, type: 'normal' }, 40);
  const specialPower = P7.power(null, kingambit, foe, { id: 94, type: 'psychic' }, 90);

  assert.equal(physicalPower, 40 * 4915 / 4096);
  assert.equal(specialPower, 90 * 4915 / 4096);
});
