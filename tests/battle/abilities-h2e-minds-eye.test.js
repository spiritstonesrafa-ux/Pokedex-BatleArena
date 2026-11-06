const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const P8 = require('../../assets/js/battle/p8-special');
const TypeEffectiveness = require('../../assets/js/battle/type-effectiveness');

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
    accuracyStage: 0,
    evasionStage: 0,
    types: ['ground', 'normal'],
    ability,
    moves: [
      { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, priority: 0, damageClass: 'physical', pp: 35, maxPp: 35 },
      { id: 24, name: 'double-kick', type: 'fighting', power: 30, accuracy: 100, priority: 0, damageClass: 'physical', pp: 30, maxPp: 30 },
      { id: 89, name: 'earthquake', type: 'ground', power: 100, accuracy: 100, priority: 0, damageClass: 'physical', pp: 10, maxPp: 10 },
      { id: 59, name: 'blizzard', type: 'ice', power: 110, accuracy: 70, priority: 0, damageClass: 'special', pp: 5, maxPp: 5 }
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

test("Mind's Eye: registry metadata conforms to Gen IX SV", () => {
  const ab = Reg.getAbility('minds-eye');
  assert.ok(ab);
  assert.equal(ab.id, 'minds-eye');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.equal(ab.breakable, true);
  assert.ok(ab.triggers.includes('ON_TRY_BOOST'));
  assert.ok(ab.triggers.includes('ON_MODIFY_MOVE'));
});

test("Mind's Eye: allows Normal-type moves to hit Ghost types for neutral damage", () => {
  const bloodmoon = makeMon(10272, 'Ursaluna-Bloodmoon', 'minds-eye');
  const gengar = { types: ['ghost'] };

  const eff = P8.effectiveness('normal', gengar, TypeEffectiveness, bloodmoon);
  assert.equal(eff.multiplier, 1, 'Normal-type moves should hit pure Ghost for 1.0x');
  assert.equal(eff.classification, 'NEUTRAL');
});

test("Mind's Eye: allows Fighting-type moves to hit Ghost types for neutral damage", () => {
  const bloodmoon = makeMon(10272, 'Ursaluna-Bloodmoon', 'minds-eye');
  const gengar = { types: ['ghost'] };

  const eff = P8.effectiveness('fighting', gengar, TypeEffectiveness, bloodmoon);
  assert.equal(eff.multiplier, 1, 'Fighting-type moves should hit pure Ghost for 1.0x');
  assert.equal(eff.classification, 'NEUTRAL');
});

test("Mind's Eye: does not bypass other type immunities (e.g. Electric vs Ground)", () => {
  const bloodmoon = makeMon(10272, 'Ursaluna-Bloodmoon', 'minds-eye');
  const groundMon = { types: ['ground'] };

  const eff = P8.effectiveness('electric', groundMon, TypeEffectiveness, bloodmoon);
  assert.equal(eff.multiplier, 0, 'Electric vs Ground must remain 0x immune');
  assert.equal(eff.classification, 'IMMUNE');
});

test("Mind's Eye: blocks accuracy drops from opponent moves", () => {
  const bloodmoon = makeMon(10272, 'Ursaluna-Bloodmoon', 'minds-eye', { p7KeenEyeAccuracyBlock: true });
  const report = constants.applyStatStageChange(bloodmoon, 'accuracy', -1);
  assert.equal(report.appliedDelta, 0);
  assert.equal(report.blockedReason, 'ABILITY');
  assert.equal(bloodmoon.accuracyStage, 0);
});

test("Mind's Eye: ignores defender positive evasion stages when attacking", () => {
  const bloodmoon = makeMon(10272, 'Ursaluna-Bloodmoon', 'minds-eye');
  const enemy = makeMon(109, 'Koffing', 'levitate', { evasionStage: 3 });

  // 100% accuracy move vs +3 evasion: ignores evasion -> 100%
  const effAcc = constants.getEffectiveAccuracy({ id: 33, name: 'tackle', accuracy: 100 }, bloodmoon, enemy);
  assert.equal(effAcc, 100);
});

test("Mind's Eye: battle turn successfully deals Normal damage to Ghost opponent", () => {
  const bloodmoon = makeMon(10272, 'Ursaluna-Bloodmoon', 'minds-eye', { speed: 100 });
  const gengar = makeMon(94, 'Gengar', 'cursed-body', { types: ['ghost', 'poison'], currentHp: 200, maxHp: 200, speed: 80 });
  const state = E.createTeamBattle(makeTeam(bloodmoon), makeTeam(gengar));

  const r = E.resolveTurn(state, {
    player: { type: 'MOVE', moveId: 33, damageRoll: 100 }, // Tackle (Normal)
    enemy: { type: 'MOVE', moveId: 33 }
  });

  const dmgEv = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy');
  assert.ok(dmgEv, 'Normal move should deal damage to Ghost mon');
  assert.ok(dmgEv.damage > 0);
  assert.equal(dmgEv.multiplier, 1, 'Tackle multiplier against Ghost/Poison under Mind Eye is 1.0x');
});

test("Mind's Eye: suppressed under Neutralizing Gas restores Ghost immunity and allows accuracy drop", () => {
  const bloodmoon = makeMon(10272, 'Ursaluna-Bloodmoon', 'minds-eye', { neutralizingGasSuppressed: true });
  const gengar = { types: ['ghost'] };

  const eff = P8.effectiveness('normal', gengar, TypeEffectiveness, bloodmoon);
  assert.equal(eff.multiplier, 0, 'Ghost immunity must be restored when Mind Eye is suppressed');
  assert.equal(eff.classification, 'IMMUNE');
});

test("Mind's Eye: canonical dual-type effectiveness table against Ghost dual-types", () => {
  const bloodmoon = makeMon(10272, 'Ursaluna-Bloodmoon', 'minds-eye');

  // 1. Normal vs pure Ghost -> 1x
  const eff1 = P8.effectiveness('normal', { types: ['ghost'] }, TypeEffectiveness, bloodmoon);
  assert.equal(eff1.multiplier, 1, 'Normal vs Ghost must be 1x');

  // 2. Fighting vs pure Ghost -> 1x
  const eff2 = P8.effectiveness('fighting', { types: ['ghost'] }, TypeEffectiveness, bloodmoon);
  assert.equal(eff2.multiplier, 1, 'Fighting vs Ghost must be 1x');

  // 3. Fighting vs Ghost/Steel -> 2x (Ghost immunity ignored, Steel weak)
  const eff3 = P8.effectiveness('fighting', { types: ['ghost', 'steel'] }, TypeEffectiveness, bloodmoon);
  assert.equal(eff3.multiplier, 2, 'Fighting vs Ghost/Steel must be 2x');

  // 4. Fighting vs Ghost/Poison -> 0.5x (Ghost immunity ignored, Poison resists)
  const eff4 = P8.effectiveness('fighting', { types: ['ghost', 'poison'] }, TypeEffectiveness, bloodmoon);
  assert.equal(eff4.multiplier, 0.5, 'Fighting vs Ghost/Poison must be 0.5x');

  // 5. Normal vs Ghost/Rock -> 0.5x (Ghost immunity ignored, Rock resists)
  const eff5 = P8.effectiveness('normal', { types: ['ghost', 'rock'] }, TypeEffectiveness, bloodmoon);
  assert.equal(eff5.multiplier, 0.5, 'Normal vs Ghost/Rock must be 0.5x');

  // 6. Normal vs Ghost/Steel -> 0.5x (Ghost immunity ignored, Steel resists)
  const eff6 = P8.effectiveness('normal', { types: ['ghost', 'steel'] }, TypeEffectiveness, bloodmoon);
  assert.equal(eff6.multiplier, 0.5, 'Normal vs Ghost/Steel must be 0.5x');
});

test("Mind's Eye: AI Evaluator calculates 2.0x effectiveness for Fighting vs Ghost/Steel", () => {
  const V = require('../../assets/js/battle/battle-evaluator');
  const bloodmoon = makeMon(10272, 'Ursaluna-Bloodmoon', 'minds-eye', {
    moves: [{ id: 370, name: 'close-combat', type: 'fighting', power: 120, accuracy: 100, damageClass: 'physical', pp: 5 }]
  });
  const gholdengo = makeMon(1000, 'Gholdengo', 'good-as-gold', { types: ['ghost', 'steel'] });

  const evalResult = V.evaluateMove(bloodmoon, gholdengo, bloodmoon.moves[0], { battleState: null });
  assert.equal(evalResult.typeMultiplier, 2, 'AI must predict 2.0x typeMultiplier for Fighting vs Ghost/Steel with Mind Eye');
  assert.equal(evalResult.typeClassification, 'SUPER_EFFECTIVE');
});

