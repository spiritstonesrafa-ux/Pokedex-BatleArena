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
    types: ['rock'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 94, name: 'psychic', type: 'psychic', power: 90, accuracy: 100, priority: 0, damageClass: 'special', pp: 10, maxPp: 10 }
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

test('Anger Shell: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('anger-shell');
  assert.equal(meta.id, 'anger-shell');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 9);
  assert.ok(meta.triggers.includes('AFTER_DAMAGING_HIT'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, true);
});

test('Anger Shell: crossing 50% HP applies +1 Atk, +1 SpA, +1 Spe, -1 Def, -1 SpD', () => {
  const klawf = makeMon(950, 'Klawf', 'anger-shell', { currentHp: 200, maxHp: 200 });
  const snorlax = makeMon(143, 'Snorlax', 'thick-fat');
  const s = { player: { activeIndex: 0, team: [klawf] }, enemy: { activeIndex: 0, team: [snorlax] } };
  const events = [];
  klawf.currentHp = 90; // Drops from 200 to 90 (<= 50%)
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, events, 110, snorlax, klawf);
  assert.equal(klawf.statStages.attack, 1);
  assert.equal(klawf.statStages.specialAttack, 1);
  assert.equal(klawf.statStages.speed, 1);
  assert.equal(klawf.statStages.defense, -1);
  assert.equal(klawf.statStages.specialDefense, -1);
});

test('Anger Shell: attack hitting when HP was already <= 50% does NOT trigger Anger Shell', () => {
  const klawf = makeMon(950, 'Klawf', 'anger-shell', {
    currentHp: 80,
    maxHp: 200,
    statStages: { attack: 1, defense: -1, specialAttack: 1, specialDefense: -1, speed: 1 }
  });
  const snorlax = makeMon(143, 'Snorlax', 'thick-fat');
  const s = { player: { activeIndex: 0, team: [klawf] }, enemy: { activeIndex: 0, team: [snorlax] } };
  const events = [];
  klawf.currentHp = 50; // Drops from 80 to 50 (both <= 50%)
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, events, 30, snorlax, klawf);
  assert.equal(klawf.statStages.attack, 1);
  assert.equal(klawf.statStages.defense, -1);
});

test('Anger Shell: healing above 50% and dropping again <= 50% triggers Anger Shell again', () => {
  const klawf = makeMon(950, 'Klawf', 'anger-shell', {
    currentHp: 80,
    maxHp: 200,
    statStages: { attack: 1, defense: -1, specialAttack: 1, specialDefense: -1, speed: 1 }
  });
  const snorlax = makeMon(143, 'Snorlax', 'thick-fat');
  const s = { player: { activeIndex: 0, team: [klawf] }, enemy: { activeIndex: 0, team: [snorlax] } };
  const events = [];
  klawf.currentHp = 150; // Healed to > 50%
  klawf.currentHp = 80;  // Hit deals 70, crossing 50% again
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, events, 70, snorlax, klawf);
  assert.equal(klawf.statStages.attack, 2);
  assert.equal(klawf.statStages.specialAttack, 2);
  assert.equal(klawf.statStages.speed, 2);
  assert.equal(klawf.statStages.defense, -2);
  assert.equal(klawf.statStages.specialDefense, -2);
});

test('Anger Shell: self defense drops are NOT reflected by opponent Mirror Armor', () => {
  const klawf = makeMon(950, 'Klawf', 'anger-shell', { currentHp: 200, maxHp: 200 });
  const corviknight = makeMon(823, 'Corviknight', 'mirror-armor');
  const s = { player: { activeIndex: 0, team: [klawf] }, enemy: { activeIndex: 0, team: [corviknight] } };
  const events = [];
  klawf.currentHp = 90;
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, events, 110, corviknight, klawf);
  assert.equal(klawf.statStages.defense, -1);
  assert.equal(corviknight.statStages.defense, 0, 'Mirror Armor do oponente NÃO deve refletir drops do Anger Shell');
});

test('Anger Shell: Contrary inverts all changes (-1 Atk, -1 SpA, -1 Spe, +1 Def, +1 SpD)', () => {
  const klawf = makeMon(950, 'Klawf', 'contrary', { currentHp: 200, maxHp: 200 });
  const snorlax = makeMon(143, 'Snorlax', 'thick-fat');
  const events = [];
  P7.modifyStages(null, 'player', klawf, { attack: 1, specialAttack: 1, speed: 1, defense: -1, specialDefense: -1 }, 'player', klawf, 'anger-shell', constants, events);
  assert.equal(klawf.statStages.attack, -1);
  assert.equal(klawf.statStages.specialAttack, -1);
  assert.equal(klawf.statStages.speed, -1);
  assert.equal(klawf.statStages.defense, 1);
  assert.equal(klawf.statStages.specialDefense, 1);
});

test('Anger Shell: attribute at cap (-6 or +6) does NOT block other attributes from changing', () => {
  const klawf = makeMon(950, 'Klawf', 'anger-shell', {
    currentHp: 200,
    maxHp: 200,
    statStages: { attack: 0, defense: -6, specialAttack: 0, specialDefense: 0, speed: 0 }
  });
  const snorlax = makeMon(143, 'Snorlax', 'thick-fat');
  const s = { player: { activeIndex: 0, team: [klawf] }, enemy: { activeIndex: 0, team: [snorlax] } };
  const events = [];
  klawf.currentHp = 90;
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, events, 110, snorlax, klawf);
  assert.equal(klawf.statStages.defense, -6, 'Defense permanece no piso -6');
  assert.equal(klawf.statStages.attack, 1, 'Attack ainda deve subir para +1');
  assert.equal(klawf.statStages.specialAttack, 1);
  assert.equal(klawf.statStages.speed, 1);
  assert.equal(klawf.statStages.specialDefense, -1);
});

test('Anger Shell: Neutralizing Gas suppresses Anger Shell activation', () => {
  const klawf = makeMon(950, 'Klawf', 'anger-shell', { currentHp: 200, maxHp: 200 });
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');
  const s = { player: { activeIndex: 0, team: [klawf] }, enemy: { activeIndex: 0, team: [weezing] } };
  P7.start(s, constants);
  const events = [];
  klawf.currentHp = 80;
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, events, 120, weezing, klawf);
  assert.equal(klawf.statStages.attack, 0);
  assert.equal(klawf.statStages.defense, 0);
});
