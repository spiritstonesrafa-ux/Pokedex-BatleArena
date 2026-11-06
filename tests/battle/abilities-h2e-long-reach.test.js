const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');

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
    accuracyStage: 0,
    evasionStage: 0,
    types: ['grass', 'ghost'],
    ability,
    heldItem: extra.heldItem || null,
    item: extra.item || extra.heldItem || null,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', flags: { contact: 1 }, isContact: true, pp: 35, maxPp: 35 },
      { id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, priority: 0, damageClass: 'special', flags: {}, pp: 15, maxPp: 15 },
      { id: 59, name: 'blizzard', type: 'ice', power: 110, accuracy: 70, priority: 0, damageClass: 'special', flags: {}, pp: 5, maxPp: 5 },
      { id: 189, name: 'mud-slap', type: 'ground', power: 20, accuracy: 100, priority: 0, damageClass: 'special', flags: {}, pp: 10, maxPp: 10 }
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

test('Long Reach: registry metadata conforms to Gen IX SV', () => {
  const ab = Reg.getAbility('long-reach');
  assert.ok(ab);
  assert.equal(ab.id, 'long-reach');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.equal(ab.breakable, false);
  assert.ok(ab.triggers.includes('ON_MODIFY_MOVE'));
});

test('Long Reach: avoids Rough Skin damage on contact moves', () => {
  const decidueye = makeMon(724, 'Decidueye', 'long-reach', { currentHp: 200, maxHp: 200, speed: 100 });
  const garchomp = makeMon(445, 'Garchomp', 'rough-skin', { types: ['dragon', 'ground'], currentHp: 300, maxHp: 300, speed: 50 });
  const state = E.createTeamBattle(makeTeam(decidueye), makeTeam(garchomp));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 33 }, // Tackle is a contact move
    enemy: { type: 'MOVE', moveId: 33 }
  });

  // Decidueye should NOT suffer Rough Skin recoil
  const roughSkinEv = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rough-skin');
  assert.equal(roughSkinEv, undefined, 'Long Reach prevents Rough Skin recoil');
});

test('Long Reach: avoids Iron Barbs damage on contact moves', () => {
  const decidueye = makeMon(724, 'Decidueye', 'long-reach', { currentHp: 200, maxHp: 200, speed: 100 });
  const ferrothorn = makeMon(598, 'Ferrothorn', 'iron-barbs', { types: ['grass', 'steel'], currentHp: 300, maxHp: 300, speed: 50 });
  const state = E.createTeamBattle(makeTeam(decidueye), makeTeam(ferrothorn));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const ironBarbsEv = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'iron-barbs');
  assert.equal(ironBarbsEv, undefined, 'Long Reach prevents Iron Barbs recoil');
});

test('Long Reach: avoids Rocky Helmet recoil on contact moves', () => {
  const decidueye = makeMon(724, 'Decidueye', 'long-reach', { currentHp: 200, maxHp: 200, speed: 100 });
  const enemy = makeMon(25, 'Pikachu', 'static', { types: ['electric'], item: 'rocky-helmet', currentHp: 300, maxHp: 300, speed: 50 });
  const state = E.createTeamBattle(makeTeam(decidueye), makeTeam(enemy));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const helmetEv = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rocky-helmet');
  assert.equal(helmetEv, undefined, 'Long Reach prevents Rocky Helmet damage');
});

test('Long Reach: avoids Static paralysis on contact moves', () => {
  const decidueye = makeMon(724, 'Decidueye', 'long-reach', { currentHp: 200, maxHp: 200, speed: 100 });
  const enemy = makeMon(25, 'Pikachu', 'static', { types: ['electric'], currentHp: 300, maxHp: 300, speed: 50 });
  const state = E.createTeamBattle(makeTeam(decidueye), makeTeam(enemy));

  // Static roll 1 would normally paralyze on contact
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, staticRoll: 1 }
  });

  assert.equal(r.state.player.team[0].statusCondition, null, 'Long Reach prevents Static paralysis');
});

test('Long Reach: avoids Flame Body burn on contact moves', () => {
  const decidueye = makeMon(724, 'Decidueye', 'long-reach', { currentHp: 200, maxHp: 200, speed: 100 });
  const enemy = makeMon(218, 'Slugma', 'flame-body', { types: ['fire'], currentHp: 300, maxHp: 300, speed: 50 });
  const state = E.createTeamBattle(makeTeam(decidueye), makeTeam(enemy));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 33, flameBodyRoll: 1 }
  });

  assert.equal(r.state.player.team[0].statusCondition, null, 'Long Reach prevents Flame Body burn');
});

test('Long Reach: Fluffy defender does not halve contact move damage', () => {
  const decidueye = makeMon(724, 'Decidueye', 'long-reach');
  const normalAttacker = makeMon(25, 'Pikachu', 'static');
  const fluffyDefender = makeMon(759, 'Stufful', 'fluffy', { defense: 100 });
  const move = { id: 33, name: 'tackle', type: 'normal', power: 40, flags: { contact: 1 }, isContact: true };

  // Against Fluffy with normal attacker: contact move halves damage
  const multNormal = P7.damageMultiplier(null, normalAttacker, fluffyDefender, move, 1);
  assert.equal(multNormal, 0.5);

  // Against Fluffy with Long Reach attacker: no contact made, Fluffy damage is not halved
  const multLongReach = P7.damageMultiplier(null, decidueye, fluffyDefender, move, 1);
  assert.equal(multLongReach, 1);
});

test('Long Reach: suppressed under Neutralizing Gas allows contact effects to trigger', () => {
  const decidueye = makeMon(724, 'Decidueye', 'long-reach', { currentHp: 300, maxHp: 300, speed: 100 });
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { types: ['poison'], item: 'rocky-helmet', currentHp: 300, maxHp: 300, speed: 50 });
  const state = E.createTeamBattle(makeTeam(decidueye), makeTeam(weezing));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 33 }, // Contact move against Rocky Helmet under Gas
    enemy: { type: 'MOVE', moveId: 33 }
  });

  // Long Reach is suppressed, so Rocky Helmet recoil applies
  const helmetEv = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rocky-helmet');
  assert.ok(helmetEv, 'Under Neutralizing Gas, contact move triggers Rocky Helmet');
  assert.equal(helmetEv.damage, 50);
});

test('Long Reach + Fluffy: Scenario A, B, C and D comprehensive canonical matrix', () => {
  const decidueye = makeMon(724, 'Decidueye', 'long-reach');
  const normalAttacker = makeMon(25, 'Pikachu', 'static');
  const fluffyDefender = makeMon(759, 'Stufful', 'fluffy');

  const contactNonFire = { id: 33, name: 'tackle', type: 'normal', flags: { contact: 1 } };
  const contactFire = { id: 7, name: 'fire-punch', type: 'fire', flags: { contact: 1 } };
  const nonContactFire = { id: 53, name: 'flamethrower', type: 'fire', flags: {} };

  // Scenario A: Non-fire contact move
  // Normal attacker: 0.5x
  assert.equal(P7.damageMultiplier(null, normalAttacker, fluffyDefender, contactNonFire, 1), 0.5);
  // Long Reach attacker: 1.0x (contact reduction avoided)
  assert.equal(P7.damageMultiplier(null, decidueye, fluffyDefender, contactNonFire, 1), 1.0);

  // Scenario B: Fire contact move
  // Normal attacker: 2.0 (fire) * 0.5 (contact) = 1.0x
  assert.equal(P7.damageMultiplier(null, normalAttacker, fluffyDefender, contactFire, 1), 1.0);
  // Long Reach attacker: 2.0 (fire) * 1.0 (no contact) = 2.0x!
  assert.equal(P7.damageMultiplier(null, decidueye, fluffyDefender, contactFire, 1), 2.0);

  // Scenario C: Fire non-contact move
  // Normal attacker: 2.0x
  assert.equal(P7.damageMultiplier(null, normalAttacker, fluffyDefender, nonContactFire, 1), 2.0);
  // Long Reach attacker: 2.0x
  assert.equal(P7.damageMultiplier(null, decidueye, fluffyDefender, nonContactFire, 1), 2.0);

  // Scenario D: Suppressed Long Reach
  const suppressedDecidueye = makeMon(724, 'Decidueye', 'long-reach', { neutralizingGasSuppressed: true });
  // Fire contact move under suppression reverts to 1.0x
  assert.equal(P7.damageMultiplier(null, suppressedDecidueye, fluffyDefender, contactFire, 1), 1.0);
});

test('Long Reach: attacker is not burned by Beak Blast when executing contact move', () => {
  const decidueye = makeMon(724, 'Decidueye', 'long-reach', { currentHp: 200, maxHp: 200, speed: 100 });
  const toucannon = makeMon(733, 'Toucannon', 'sheer-force', {
    currentHp: 300, maxHp: 300, speed: 50,
    moves: [{ id: 690, name: 'beak-blast', type: 'flying', power: 100, accuracy: 100, priority: -3, damageClass: 'physical', pp: 15 }]
  });
  const state = E.createTeamBattle(makeTeam(decidueye), makeTeam(toucannon));

  // Toucannon charges Beak Blast (priority -3). Decidueye uses Tackle (normally contact)
  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 33 },
    enemy: { type: 'MOVE', moveId: 690 }
  });

  assert.equal(r.state.player.team[0].statusCondition, null, 'Attacker with Long Reach must NOT be burned by Beak Blast');
});
