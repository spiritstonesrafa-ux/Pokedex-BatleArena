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
    types: ['normal'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 14, name: 'swords-dance', type: 'normal', power: 0, accuracy: null, priority: 0, damageClass: 'status', pp: 20, maxPp: 20 }
    ],
    ...extra
  };
}

function makeTeam(lead, m2 = null, m3 = null) {
  return [
    lead,
    m2 || makeMon(100, 'Voltorb', 'soundproof'),
    m3 || makeMon(101, 'Electrode', 'soundproof')
  ];
}

test('Download: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('download');
  assert.equal(meta.id, 'download');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 4);
  assert.ok(meta.triggers.includes('ON_ENTRY'));
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
});

test('Download: raises Attack when foe Defense < Special Defense', () => {
  const porygon = makeMon(137, 'Porygon', 'download');
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { defense: 80, specialDefense: 130 });
  const s = E.createTeamBattle(makeTeam(porygon), makeTeam(foe));
  assert.equal(s.player.team[0].statStages.attack, 1);
  assert.equal(s.player.team[0].statStages.specialAttack, 0);
});

test('Download: raises Special Attack when foe Special Defense < Defense', () => {
  const porygon2 = makeMon(233, 'Porygon2', 'download');
  const foe = makeMon(713, 'Avalugg', 'sturdy', { defense: 180, specialDefense: 50 });
  const s = E.createTeamBattle(makeTeam(porygon2), makeTeam(foe));
  assert.equal(s.player.team[0].statStages.specialAttack, 1);
  assert.equal(s.player.team[0].statStages.attack, 0);
});

test('Download: tie (Defense == Special Defense) canonically raises Special Attack', () => {
  const genesect = makeMon(649, 'Genesect', 'download');
  const foe = makeMon(105, 'Marowak', 'soundproof', { defense: 100, specialDefense: 100 });
  const s = E.createTeamBattle(makeTeam(genesect), makeTeam(foe));
  assert.equal(s.player.team[0].statStages.specialAttack, 1);
  assert.equal(s.player.team[0].statStages.attack, 0);
});

test('Download: doubles sums active foes stats to determine boost', () => {
  const porygonZ = makeMon(474, 'Porygon-Z', 'download');
  const ally = makeMon(10, 'Ally', 'soundproof');
  // Foe 1: Def 100, SpD 60. Foe 2: Def 50, SpD 120. Total Def = 150, Total SpD = 180. Def < SpD -> Attack boost!
  const foe1 = makeMon(1, 'Bulbasaur', 'overgrow', { defense: 100, specialDefense: 60 });
  const foe2 = makeMon(4, 'Charmander', 'blaze', { defense: 50, specialDefense: 120 });
  const s = E.createDoublesBattle([porygonZ, ally], [foe1, foe2]);
  assert.equal(s.player.team[0].statStages.attack, 1);
  assert.equal(s.player.team[0].statStages.specialAttack, 0);
});

test('Download: stat stage does not overflow beyond +6', () => {
  const porygon = makeMon(137, 'Porygon', 'download', {
    statStages: { attack: 6, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 }
  });
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { defense: 50, specialDefense: 100 });
  const s = E.createTeamBattle(makeTeam(porygon), makeTeam(foe));
  assert.equal(s.player.team[0].statStages.attack, 6);
});

test('Download: Neutralizing Gas suppresses Download on entry', () => {
  const porygon = makeMon(137, 'Porygon', 'download');
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas', { defense: 50, specialDefense: 100 });
  const s = E.createTeamBattle(makeTeam(porygon), makeTeam(weezing));
  assert.equal(s.player.team[0].statStages.attack, 0);
  assert.equal(s.player.team[0].statStages.specialAttack, 0);
});

test('Download: switching out and back in reactivates Download', () => {
  const porygon = makeMon(137, 'Porygon', 'download');
  const sub = makeMon(102, 'Exeggcute', 'chlorophyll');
  const foe = makeMon(143, 'Snorlax', 'thick-fat', { defense: 50, specialDefense: 100 });
  const s = E.createTeamBattle([porygon, sub, makeMon(101, 'Electrode', 'soundproof')], makeTeam(foe));
  assert.equal(s.player.team[0].statStages.attack, 1);

  // Switch to sub
  const r1 = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetPokemonId: 102 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  assert.equal(r1.state.player.activeIndex, 1);

  // Switch back to porygon
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'SWITCH', targetPokemonId: 137 },
    enemy: { type: 'MOVE', moveId: 14 }
  });
  assert.equal(r2.state.player.activeIndex, 0);
  assert.equal(r2.state.player.team[0].statStages.attack, 1); // Boosted on re-entry (switch reset previous stages to 0 then +1)
});
