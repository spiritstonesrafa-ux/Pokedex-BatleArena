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
    types: ['normal', 'dragon'],
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

test('Berserk: registry metadata conforms to Gen IX', () => {
  const meta = Reg.getAbility('berserk');
  assert.equal(meta.id, 'berserk');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H1');
  assert.equal(meta.generation, 7);
  assert.ok(meta.triggers.includes('AFTER_DAMAGING_HIT'));
  assert.equal(meta.suppressible, true);
  assert.equal(meta.breakable, true);
});

test('Berserk: attack dropping HP to exactly 50% raises Special Attack by +1', () => {
  const drampa = makeMon(780, 'Drampa', 'berserk', { currentHp: 200, maxHp: 200 });
  const snorlax = makeMon(143, 'Snorlax', 'thick-fat');
  const s = { player: { activeIndex: 0, team: [drampa] }, enemy: { activeIndex: 0, team: [snorlax] } };
  const events = [];
  // Direct hit deals exactly 100 damage: HP drops from 200 to 100 (exactly 50%)
  drampa.currentHp = 100;
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, events, 100, snorlax, drampa);
  assert.equal(drampa.statStages.specialAttack, 1);
  const spaEvent = events.find(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.statKey === 'specialAttack');
  assert.ok(spaEvent);
  assert.equal(spaEvent.appliedDelta, 1);
});

test('Berserk: attack dropping HP from > 50% to < 50% raises Special Attack by +1', () => {
  const drampa = makeMon(780, 'Drampa', 'berserk', { currentHp: 200, maxHp: 200 });
  const snorlax = makeMon(143, 'Snorlax', 'thick-fat');
  const s = { player: { activeIndex: 0, team: [drampa] }, enemy: { activeIndex: 0, team: [snorlax] } };
  const events = [];
  // Deals 120 damage: HP drops from 200 to 80 (below 50%)
  drampa.currentHp = 80;
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, events, 120, snorlax, drampa);
  assert.equal(drampa.statStages.specialAttack, 1);
});

test('Berserk: attack hitting when HP was already <= 50% does NOT trigger Berserk', () => {
  const drampa = makeMon(780, 'Drampa', 'berserk', { currentHp: 80, maxHp: 200, statStages: { attack: 0, defense: 0, specialAttack: 1, specialDefense: 0, speed: 0 } });
  const snorlax = makeMon(143, 'Snorlax', 'thick-fat');
  const s = { player: { activeIndex: 0, team: [drampa] }, enemy: { activeIndex: 0, team: [snorlax] } };
  const events = [];
  // Deals 20 damage: HP drops from 80 to 60 (already below 50%)
  drampa.currentHp = 60;
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, events, 20, snorlax, drampa);
  assert.equal(drampa.statStages.specialAttack, 1, 'Não deve ativar se HP já estava <= 50%');
});

test('Berserk: being healed back above 50% and dropped again <= 50% triggers Berserk again', () => {
  const drampa = makeMon(780, 'Drampa', 'berserk', { currentHp: 80, maxHp: 200, statStages: { attack: 0, defense: 0, specialAttack: 1, specialDefense: 0, speed: 0 } });
  const snorlax = makeMon(143, 'Snorlax', 'thick-fat');
  const s = { player: { activeIndex: 0, team: [drampa] }, enemy: { activeIndex: 0, team: [snorlax] } };
  const events = [];
  // Healed to 150 (> 50%)
  drampa.currentHp = 150;
  // Hit takes it from 150 to 90 (crosses 50% again!)
  drampa.currentHp = 90;
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, events, 60, snorlax, drampa);
  assert.equal(drampa.statStages.specialAttack, 2, 'Deve subir para +2 após segundo cruzamento');
});

test('Berserk: lethal hit (currentHp === 0) does NOT trigger Berserk', () => {
  const drampa = makeMon(780, 'Drampa', 'berserk', { currentHp: 200, maxHp: 200 });
  const snorlax = makeMon(143, 'Snorlax', 'thick-fat');
  const s = { player: { activeIndex: 0, team: [drampa] }, enemy: { activeIndex: 0, team: [snorlax] } };
  const events = [];
  drampa.currentHp = 0;
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, events, 200, snorlax, drampa);
  assert.equal(drampa.statStages.specialAttack, 0);
});

test('Berserk: Sitrus Berry healing triggers alongside Berserk on crossing threshold', () => {
  const drampa = makeMon(780, 'Drampa', 'berserk', { currentHp: 200, maxHp: 200, item: 'sitrus-berry' });
  const snorlax = makeMon(143, 'Snorlax', 'thick-fat');
  const s = { player: { activeIndex: 0, team: [drampa] }, enemy: { activeIndex: 0, team: [snorlax] } };
  const events = [];
  // Drops to 90/200 (<= 50%)
  drampa.currentHp = 90;
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, events, 110, snorlax, drampa);
  // Berserk triggered: +1 SpA
  assert.equal(drampa.statStages.specialAttack, 1);
  // Sitrus Berry consumed and healed 50 HP (maxHp/4 = 50, now 140)
  assert.equal(drampa.item, null);
  assert.equal(drampa.currentHp, 140);
});

test('Berserk: Neutralizing Gas suppresses Berserk activation', () => {
  const drampa = makeMon(780, 'Drampa', 'berserk', { currentHp: 200, maxHp: 200 });
  const weezing = makeMon(110, 'Weezing', 'neutralizing-gas');
  const s = { player: { activeIndex: 0, team: [drampa] }, enemy: { activeIndex: 0, team: [weezing] } };
  P7.start(s, constants);
  const events = [];
  drampa.currentHp = 80;
  P7.afterHit(s, 'enemy', { id: 33, name: 'tackle', type: 'normal', power: 40 }, {}, constants, events, 120, weezing, drampa);
  assert.equal(drampa.statStages.specialAttack, 0);
});
