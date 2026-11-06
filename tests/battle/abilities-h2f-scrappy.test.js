const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const P8 = require('../../assets/js/battle/p8-special');
const TypeEffectiveness = require('../../assets/js/battle/type-effectiveness');
const Evaluator = require('../../assets/js/battle/battle-evaluator');

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
    types: ['normal'],
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

test('Scrappy: registry metadata conforms to Gen IX SV', () => {
  const ab = Reg.getAbility('scrappy');
  assert.ok(ab);
  assert.equal(ab.id, 'scrappy');
  assert.equal(ab.phase, 'H2');
  assert.equal(ab.status, 'FULL');
  assert.equal(ab.suppressible, true);
  assert.equal(ab.copyable, true);
  assert.equal(ab.swappable, true);
  assert.ok(ab.triggers.includes('ON_EFFECTIVENESS'));
  assert.ok(ab.triggers.includes('ON_TRY_BOOST'));
});

test('Scrappy: Normal-type move hits pure Ghost defender with 1x neutral effectiveness', () => {
  const kangaskhan = makeMon(115, 'Kangaskhan', 'scrappy', { types: ['normal'] });
  const gengar = makeMon(94, 'Gengar', 'cursed-body', { types: ['ghost'] });

  const eff = P8.effectiveness('normal', gengar, TypeEffectiveness, kangaskhan, { id: 33, name: 'tackle' }, constants);
  assert.equal(eff.multiplier, 1, 'Normal against Ghost under Scrappy must be 1x (neutral)');
  assert.equal(eff.classification, 'NEUTRAL');
});

test('Scrappy: Fighting-type move hits pure Ghost defender with 1x neutral effectiveness', () => {
  const pangoro = makeMon(675, 'Pangoro', 'scrappy', { types: ['fighting', 'dark'] });
  const mismagius = makeMon(429, 'Mismagius', 'levitate', { types: ['ghost'] });

  const eff = P8.effectiveness('fighting', mismagius, TypeEffectiveness, pangoro, { id: 24, name: 'double-kick' }, constants);
  assert.equal(eff.multiplier, 1, 'Fighting against Ghost under Scrappy must be 1x (neutral)');
  assert.equal(eff.classification, 'NEUTRAL');
});

test('Scrappy: Fighting-type move hits dual-type Ghost/Steel defender with 2x super-effective damage', () => {
  const decidueye = makeMon(10244, 'Decidueye-Hisui', 'scrappy', { types: ['grass', 'fighting'] });
  const gholdengo = makeMon(1000, 'Gholdengo', 'good-as-gold', { types: ['ghost', 'steel'] });

  const eff = P8.effectiveness('fighting', gholdengo, TypeEffectiveness, decidueye, { id: 24, name: 'double-kick' }, constants);
  assert.equal(eff.multiplier, 2, 'Fighting against Ghost/Steel under Scrappy must be 2x');
  assert.equal(eff.classification, 'SUPER_EFFECTIVE');
});

test('Scrappy: Fighting-type move hits dual-type Ghost/Poison defender with 0.5x resisted damage', () => {
  const flamigo = makeMon(973, 'Flamigo', 'scrappy', { types: ['flying', 'fighting'] });
  const gengarPoison = makeMon(94, 'Gengar', 'cursed-body', { types: ['ghost', 'poison'] });

  const eff = P8.effectiveness('fighting', gengarPoison, TypeEffectiveness, flamigo, { id: 24, name: 'double-kick' }, constants);
  assert.equal(eff.multiplier, 0.5, 'Fighting against Ghost/Poison under Scrappy must be 0.5x');
  assert.equal(eff.classification, 'RESISTED');
});

test('Scrappy: Normal-type move hits dual-type Ghost/Rock defender with 0.5x resisted damage', () => {
  const miltank = makeMon(241, 'Miltank', 'scrappy', { types: ['normal'] });
  const spiritombRock = makeMon(442, 'RockGhost', 'pressure', { types: ['ghost', 'rock'] });

  const eff = P8.effectiveness('normal', spiritombRock, TypeEffectiveness, miltank, { id: 33, name: 'tackle' }, constants);
  assert.equal(eff.multiplier, 0.5, 'Normal against Ghost/Rock under Scrappy must be 0.5x');
  assert.equal(eff.classification, 'RESISTED');
});

test('Scrappy: non-Normal and non-Fighting moves do NOT bypass unrelated immunities', () => {
  const kangaskhan = makeMon(115, 'Kangaskhan', 'scrappy', { types: ['normal'] });
  const gliscor = makeMon(472, 'Gliscor', 'hyper-cutter', { types: ['ground', 'flying'] });

  // Ground move vs Flying defender remains 0x immune
  const eff = P8.effectiveness('ground', gliscor, TypeEffectiveness, kangaskhan, { id: 89, name: 'earthquake' }, constants);
  assert.equal(eff.multiplier, 0, 'Ground vs Flying must remain 0x even with Scrappy');
  assert.equal(eff.classification, 'IMMUNE');
});

test('Scrappy: Intimidate on switch-in is completely blocked', () => {
  const scrapMon = makeMon(115, 'Kangaskhan', 'scrappy');
  const intimMon = makeMon(130, 'Gyarados', 'intimidate');
  const battle = E.createTeamBattle(makeTeam(scrapMon), makeTeam(intimMon));

  const events = [];
  P7.start(battle, constants);
  // Entry of intimMon triggers triggerOnEntryAbility
  P7.enter(battle, 'enemy', constants, events);

  assert.equal(scrapMon.statStages.attack, 0, 'Attack stage must remain 0 under Intimidate');
  const scrapEvent = events.find(ev => ev.type === 'MOVE_PREPARED' && ev.label === 'scrappy');
  assert.ok(scrapEvent, 'P7_ABILITY feedback event for scrappy must be announced');
});

test('Scrappy: does NOT block non-Intimidate Attack reductions (e.g. Growl)', () => {
  const scrapMon = makeMon(115, 'Kangaskhan', 'scrappy');
  const foeMon = makeMon(25, 'Pikachu', 'static');
  const battle = E.createTeamBattle(makeTeam(scrapMon), makeTeam(foeMon));

  const events = [];
  P7.modifyStages(battle, 'player', scrapMon, { attack: -1 }, 'enemy', foeMon, 'growl', constants, events);
  assert.equal(scrapMon.statStages.attack, -1, 'Attack stage must drop from non-Intimidate sources');
});

test('Scrappy: Neutralizing Gas suppresses Scrappy (Ghost immunity restored, Intimidate works)', () => {
  const scrapMon = makeMon(115, 'Kangaskhan', 'scrappy', { neutralizingGasSuppressed: true });
  const gengar = makeMon(94, 'Gengar', 'cursed-body', { types: ['ghost'] });

  // 1. Effectiveness under Gas: Normal vs Ghost is 0x
  const eff = P8.effectiveness('normal', gengar, TypeEffectiveness, scrapMon, { id: 33, name: 'tackle' }, constants);
  assert.equal(eff.multiplier, 0, 'Normal vs Ghost must be 0x when Scrappy is suppressed by Gas');
  assert.equal(eff.classification, 'IMMUNE');

  // 2. Intimidate under Gas:
  const intimMon = makeMon(130, 'Gyarados', 'intimidate');
  const battle = E.createTeamBattle(makeTeam(scrapMon), makeTeam(intimMon));
  const events = [];
  P7.modifyStages(battle, 'player', scrapMon, { attack: -1 }, 'enemy', intimMon, 'intimidate', constants, events);
  assert.equal(scrapMon.statStages.attack, -1, 'Attack drop from Intimidate applies when Scrappy is suppressed');
});

test('Scrappy: battle engine execution deals real damage to Ghost defender', () => {
  const scrapMon = makeMon(115, 'Kangaskhan', 'scrappy', { attack: 120 });
  const gengar = makeMon(94, 'Gengar', 'cursed-body', { types: ['ghost'], defense: 80, currentHp: 200, maxHp: 200 });
  const battle = E.createTeamBattle(makeTeam(scrapMon), makeTeam(gengar));

  const result = E.resolveTurn(battle, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100 }
  });

  const enemyMon = result.state.enemy.team[0];
  assert.ok(enemyMon.currentHp < 200, 'Ghost defender must receive damage from Tackle under Scrappy');
  const dmgEvent = result.events.find(ev => ev.type === 'DAMAGE_APPLIED' && ev.target === 'enemy');
  assert.ok(dmgEvent, 'Damage event must be emitted');
  assert.equal(dmgEvent.multiplier, 1, 'Damage multiplier must be 1x');
});

test('Scrappy: AI evaluator correctly values Normal and Fighting moves against Ghost', () => {
  const scrapMon = makeMon(115, 'Kangaskhan', 'scrappy');
  const gengar = makeMon(94, 'Gengar', 'cursed-body', { types: ['ghost'] });

  const evalTackle = Evaluator.evaluateMove(scrapMon, gengar, scrapMon.moves[0], {
    battleState: { player: { team: [scrapMon] }, enemy: { team: [gengar] } },
    attackerSide: 'player',
    constants
  });

  assert.ok(evalTackle.expectedDamage > 0, 'AI must calculate expected damage > 0 against Ghost with Scrappy');
  assert.equal(evalTackle.typeMultiplier, 1, 'AI must evaluate Tackle type multiplier as 1');
});
