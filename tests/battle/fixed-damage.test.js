const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const BattleEngine = require('../../assets/js/battle/battle-engine.js');
const BattleEvaluator = require('../../assets/js/battle/battle-evaluator.js');
const BattleAI = require('../../assets/js/battle/battle-ai.js');
const BattleConstants = require('../../assets/js/battle/battle-constants.js');
const MoveModel = require('../../assets/js/battle/move-model.js');
const {
  BATTLE_EVENTS,
  BATTLE_STATUS,
  MOVE_SUPPORT_LEVEL,
  TYPE_EFFECTIVENESS_CLASSIFICATION,
  BATTLE_CONFIG,
  CANONICAL_MOVE_DEFINITIONS,
  KNOWN_CATALOG_MOVES,
  CONSTANT_DAMAGE_MOVES,
  isConstantDamageMove,
  getConstantDamageAmount,
  validateMoveData,
  isMechanicallySupportedMove
} = BattleConstants;
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { BattleTeamHydrator } = require('../../assets/js/battle-session/battle-team-hydrator.js');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source.js');
const CampaignOptions = require('../../assets/js/campaign/campaign-move-options.js');
const CampaignExtras = require('../../assets/js/campaign/campaign-move-options-catalog.js');
const PresentationMapper = require('../../assets/js/presentation/battle-presentation-mapper.js');
const { PRESENTATION_COMMANDS } = require('../../assets/js/presentation/battle-presentation-constants.js');

const SONIC_BOOM = KNOWN_CATALOG_MOVES[49];
const DRAGON_RAGE = KNOWN_CATALOG_MOVES[82];
const TACKLE = KNOWN_CATALOG_MOVES[33];
const SEISMIC_TOSS = KNOWN_CATALOG_MOVES[69];
const NIGHT_SHADE = KNOWN_CATALOG_MOVES[101];

function createMon(options = {}) {
  const hp = options.hp || 200;
  return {
    id: options.id || 1,
    name: options.name || 'test-mon',
    level: options.level || 50,
    types: options.types || ['normal'],
    hp,
    currentHp: options.currentHp !== undefined ? options.currentHp : hp,
    maxHp: hp,
    attack: options.attack || 100,
    defense: options.defense || 100,
    specialAttack: options.specialAttack || 100,
    specialDefense: options.specialDefense || 100,
    speed: options.speed || 100,
    statusCondition: options.statusCondition || null,
    sleepTurns: options.sleepTurns || 0,
    isFlinched: options.isFlinched || false,
    confusionTurns: options.confusionTurns || 0,
    moves: options.moves || [
      { id: 49, name: 'sonic-boom', type: 'normal', power: null, accuracy: 90, pp: 20, currentPp: 20, maxPp: 20, damageClass: 'special' }
    ]
  };
}

describe('P5: Dano Fixo Constante (Sonic Boom #49 & Dragon Rage #82)', () => {
  test('1. Metadados canônicos, categorias, montantes e suporte FULL', () => {
    assert.ok(isConstantDamageMove(SONIC_BOOM));
    assert.ok(isConstantDamageMove(DRAGON_RAGE));
    assert.ok(isConstantDamageMove(49));
    assert.ok(isConstantDamageMove(82));
    assert.ok(isConstantDamageMove({ id: 49 }));
    assert.ok(isConstantDamageMove({ id: 82 }));
    assert.ok(isConstantDamageMove({ name: 'sonic-boom' }));
    assert.ok(isConstantDamageMove({ name: 'dragon-rage' }));
    assert.ok(!isConstantDamageMove(TACKLE));
    assert.ok(!isConstantDamageMove(SEISMIC_TOSS));
    assert.ok(!isConstantDamageMove(NIGHT_SHADE));

    assert.equal(getConstantDamageAmount(49), 20);
    assert.equal(getConstantDamageAmount(82), 40);
    assert.equal(getConstantDamageAmount('sonic-boom'), 20);
    assert.equal(getConstantDamageAmount('dragon-rage'), 40);
    assert.equal(getConstantDamageAmount(SONIC_BOOM), 20);
    assert.equal(getConstantDamageAmount(DRAGON_RAGE), 40);
    assert.equal(getConstantDamageAmount(TACKLE), null);

    const cap49 = BattleConstants.getMoveCapability(49);
    assert.equal(cap49.supportLevel, MOVE_SUPPORT_LEVEL.FULL);
    assert.deepEqual(cap49.knownPending, []);
    assert.equal(cap49.blockedReason, null);
    assert.ok(cap49.requiredMechanics.includes('FIXED_DAMAGE_CONSTANT'));
    assert.ok(cap49.requiredMechanics.includes('SPECIAL_DAMAGE'));
    assert.equal(cap49.isConstantDamage, true);
    assert.equal(cap49.constantDamage, 20);
    assert.equal(SONIC_BOOM.damageClass, 'special');
    assert.equal(SONIC_BOOM.type, 'normal');
    assert.equal(SONIC_BOOM.accuracy, 90);
    assert.equal(SONIC_BOOM.pp, 20);
    assert.equal(SONIC_BOOM.power, null);

    const cap82 = BattleConstants.getMoveCapability(82);
    assert.equal(cap82.supportLevel, MOVE_SUPPORT_LEVEL.FULL);
    assert.deepEqual(cap82.knownPending, []);
    assert.equal(cap82.blockedReason, null);
    assert.ok(cap82.requiredMechanics.includes('FIXED_DAMAGE_CONSTANT'));
    assert.ok(cap82.requiredMechanics.includes('SPECIAL_DAMAGE'));
    assert.equal(cap82.isConstantDamage, true);
    assert.equal(cap82.constantDamage, 40);
    assert.equal(DRAGON_RAGE.damageClass, 'special');
    assert.equal(DRAGON_RAGE.type, 'dragon');
    assert.equal(DRAGON_RAGE.accuracy, 100);
    assert.equal(DRAGON_RAGE.pp, 10);
    assert.equal(DRAGON_RAGE.power, null);

    assert.ok(isMechanicallySupportedMove(49));
    assert.ok(isMechanicallySupportedMove(82));
    assert.ok(isMechanicallySupportedMove('sonic-boom'));
    assert.ok(isMechanicallySupportedMove('dragon-rage'));
  });

  test('2. Política estrita de validação de power e prevenção de conflitos ID/nome', () => {
    // 2.1 validateMoveData aceita null, undefined e 0 para golpes de dano fixo constante
    assert.ok(validateMoveData({ id: 49, name: 'sonic-boom', type: 'normal', accuracy: 90, pp: 20, damageClass: 'special' }));
    assert.ok(validateMoveData({ id: 49, name: 'sonic-boom', type: 'normal', power: null, accuracy: 90, pp: 20, damageClass: 'special' }));
    assert.ok(validateMoveData({ id: 49, name: 'sonic-boom', type: 'normal', power: 0, accuracy: 90, pp: 20, damageClass: 'special' }));
    assert.ok(validateMoveData({ id: 82, name: 'dragon-rage', type: 'dragon', accuracy: 100, pp: 10, damageClass: 'special' }));
    assert.ok(validateMoveData({ id: 82, name: 'dragon-rage', type: 'dragon', power: null, accuracy: 100, pp: 10, damageClass: 'special' }));
    assert.ok(validateMoveData({ id: 82, name: 'dragon-rage', type: 'dragon', power: 0, accuracy: 100, pp: 10, damageClass: 'special' }));

    // 2.2 validateMoveData rejeita poderes positivos, negativos, não-finitos ou tipos adulterados
    assert.ok(!validateMoveData({ id: 49, name: 'sonic-boom', type: 'normal', power: 20, accuracy: 90, pp: 20, damageClass: 'special' }));
    assert.ok(!validateMoveData({ id: 49, name: 'sonic-boom', type: 'normal', power: 999, accuracy: 90, pp: 20, damageClass: 'special' }));
    assert.ok(!validateMoveData({ id: 49, name: 'sonic-boom', type: 'normal', power: -20, accuracy: 90, pp: 20, damageClass: 'special' }));
    assert.ok(!validateMoveData({ id: 49, name: 'sonic-boom', type: 'normal', power: Infinity, accuracy: 90, pp: 20, damageClass: 'special' }));
    assert.ok(!validateMoveData({ id: 49, name: 'sonic-boom', type: 'normal', power: NaN, accuracy: 90, pp: 20, damageClass: 'special' }));
    assert.ok(!validateMoveData({ id: 49, name: 'sonic-boom', type: 'normal', power: true, accuracy: 90, pp: 20, damageClass: 'special' }));
    assert.ok(!validateMoveData({ id: 49, name: 'sonic-boom', type: 'normal', power: {}, accuracy: 90, pp: 20, damageClass: 'special' }));
    assert.ok(!validateMoveData({ id: 82, name: 'dragon-rage', type: 'dragon', power: 40, accuracy: 100, pp: 10, damageClass: 'special' }));
    assert.ok(!validateMoveData({ id: 82, name: 'dragon-rage', type: 'dragon', power: -40, accuracy: 100, pp: 10, damageClass: 'special' }));

    // 2.3 validateMoveData rejeita adulteração de tipo, dano ou precisão
    assert.ok(!validateMoveData({ id: 49, name: 'sonic-boom', type: 'dragon', accuracy: 90, pp: 20, damageClass: 'special' }));
    assert.ok(!validateMoveData({ id: 49, name: 'sonic-boom', type: 'normal', accuracy: 90, pp: 20, damageClass: 'physical' }));
    assert.ok(!validateMoveData({ id: 82, name: 'dragon-rage', type: 'normal', accuracy: 100, pp: 10, damageClass: 'special' }));
    assert.ok(!validateMoveData({ id: 82, name: 'dragon-rage', type: 'dragon', accuracy: 100, pp: 10, damageClass: 'physical' }));

    // 2.4 Prevenção de conflito entre ID e Nome
    assert.ok(!isConstantDamageMove({ id: 49, name: 'tackle' }));
    assert.ok(!isConstantDamageMove({ id: 33, name: 'sonic-boom' }));
    assert.ok(!isConstantDamageMove({ id: 49, name: 'dragon-rage' }));
    assert.ok(!isConstantDamageMove({ id: 82, name: 'sonic-boom' }));
    assert.ok(!isConstantDamageMove({ id: 82, name: 'tackle' }));
    assert.equal(getConstantDamageAmount({ id: 49, name: 'tackle' }), null);
    assert.equal(getConstantDamageAmount({ id: 82, name: 'sonic-boom' }), null);

    // 2.5 MoveModel.createMove não aceita poder adulterado e não muta entrada
    const rawAdulterated = Object.freeze({
      id: 49,
      name: 'sonic-boom',
      type: 'normal',
      power: 999,
      accuracy: 90,
      pp: 20,
      damageClass: 'special'
    });
    assert.throws(() => MoveModel.createMove(rawAdulterated), /Poder do golpe de dano fixo constante/);
    assert.equal(rawAdulterated.power, 999, 'Não deve mutar o objeto de entrada');

    const validNull = MoveModel.createMove({
      id: 49,
      name: 'sonic-boom',
      type: 'normal',
      power: null,
      accuracy: 90,
      pp: 20,
      damageClass: 'special'
    });
    assert.equal(validNull.power, null);

    const validZero = MoveModel.createMove({
      id: 82,
      name: 'dragon-rage',
      type: 'dragon',
      power: 0,
      accuracy: 100,
      pp: 10,
      damageClass: 'special'
    });
    assert.equal(validZero.power, null);

    // 2.6 BattleEngine.createCombatant rejeita combatente com power adulterado em golpe fixo
    assert.throws(() => {
      BattleEngine.createCombatant(createMon({
        id: 101,
        name: 'electrode',
        types: ['electric'],
        moves: [{ ...SONIC_BOOM, power: 200 }]
      }));
    }, /Poder do golpe/);
  });

  test('3. Dano de Sonic Boom é estritamente 20 e Dragon Rage é estritamente 40', () => {
    const p1 = createMon({ id: 1, name: 'user-sonic', hp: 200, level: 5, moves: [SONIC_BOOM] });
    const e1 = createMon({ id: 2, name: 'target', hp: 200, level: 100 });
    const s1 = BattleEngine.createBattle(p1, e1);
    const r1 = BattleEngine.resolveTurn(s1, {
      player: { type: 'MOVE', moveId: 49 },
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const dmg1 = r1.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmg1.damage, 20, 'Sonic Boom causa exatamente 20 de dano');
    assert.equal(r1.state.enemy.currentHp, 180);

    const p2 = createMon({ id: 3, name: 'user-dragon', hp: 200, level: 99, moves: [DRAGON_RAGE] });
    const e2 = createMon({ id: 4, name: 'target', hp: 200, level: 5, moves: [DRAGON_RAGE] });
    const s2 = BattleEngine.createBattle(p2, e2);
    const r2 = BattleEngine.resolveTurn(s2, {
      player: { type: 'MOVE', moveId: 82 },
      enemy: { type: 'MOVE', moveId: 82 }
    });
    const dmg2 = r2.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmg2.damage, 40, 'Dragon Rage causa exatamente 40 de dano');
    assert.equal(r2.state.enemy.currentHp, 160);
  });

  test('4. Independência de atributos, estágios (-6 a +6), STAB, Burn e Roll de variância', () => {
    // 4.1 Atributos extremos: usuário SpAtk 5 vs defensor SpDef 500
    const weakUser = createMon({ id: 1, specialAttack: 5, moves: [SONIC_BOOM] });
    const tankDef = createMon({ id: 2, specialDefense: 500, hp: 300 });
    const sAttrs = BattleEngine.createBattle(weakUser, tankDef);
    const rAttrs = BattleEngine.resolveTurn(sAttrs, {
      player: { type: 'MOVE', moveId: 49 },
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const dmgAttrs = rAttrs.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgAttrs.damage, 20);

    // 4.2 Estágios de atributos: usuário com -6 SpAtk e defensor com +6 SpDef
    const debuffedUser = createMon({ id: 3, moves: [DRAGON_RAGE] });
    const buffedDef = createMon({ id: 4, hp: 300, moves: [DRAGON_RAGE] });
    const sStages = BattleEngine.createBattle(debuffedUser, buffedDef);
    sStages.player.statStages = { attack: -6, specialAttack: -6, defense: -6, specialDefense: -6, speed: 0 };
    sStages.enemy.statStages = { attack: 6, specialAttack: 6, defense: 6, specialDefense: 6, speed: 0 };
    const rStages = BattleEngine.resolveTurn(sStages, {
      player: { type: 'MOVE', moveId: 82 },
      enemy: { type: 'MOVE', moveId: 82 }
    });
    const dmgStages = rStages.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgStages.damage, 40, 'Dragon Rage causa 40 mesmo com -6 SpAtk e +6 SpDef');

    // 4.3 STAB: Snorlax (Normal) com Sonic Boom vs Water-mon com Sonic Boom -> ambos causam 20
    const stabUser = createMon({ id: 5, types: ['normal'], moves: [SONIC_BOOM] });
    const dummy = createMon({ id: 7, hp: 200 });
    const sStab = BattleEngine.createBattle(stabUser, dummy);
    const rStab = BattleEngine.resolveTurn(sStab, {
      player: { type: 'MOVE', moveId: 49 },
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const stabEv = rStab.events.find(e => e.type === BATTLE_EVENTS.STAB_RESOLVED && e.actor === 'player');
    assert.equal(stabEv.hasStab, false, 'Golpe de dano constante não ativa STAB');
    assert.equal(stabEv.multiplier, 1);
    const dmgStab = rStab.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgStab.damage, 20);

    // 4.4 Queimadura (Burn): atacante queimado causa exatamente o dano constante
    const burnedUser = createMon({ id: 8, statusCondition: 'burn', moves: [DRAGON_RAGE] });
    const dummyDragon = createMon({ id: 9, hp: 200, moves: [DRAGON_RAGE] });
    const sBurn = BattleEngine.createBattle(burnedUser, dummyDragon);
    const rBurn = BattleEngine.resolveTurn(sBurn, {
      player: { type: 'MOVE', moveId: 82 },
      enemy: { type: 'MOVE', moveId: 82 }
    });
    const dmgBurn = rBurn.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgBurn.damage, 40, 'Queimadura não reduz dano constante');

    // 4.5 Variância determinística: roll 85 vs roll 100 geram exatamente o mesmo dano e evento emite damageRoll: 100
    const sRoll85 = BattleEngine.createBattle(createMon({ moves: [SONIC_BOOM] }), createMon({ hp: 200 }));
    const rRoll85 = BattleEngine.resolveTurn(sRoll85, {
      player: { type: 'MOVE', moveId: 49, damageRoll: 85 },
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const dmgRoll85 = rRoll85.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgRoll85.damage, 20);
    assert.equal(dmgRoll85.damageRoll, 100, 'Evento DAMAGE_APPLIED emite damageRoll 100 para dano constante');
  });

  test('5. Fraquezas e resistências elementais NÃO multiplicam dano (NEUTRAL com multiplicador 1)', () => {
    // Sonic Boom (Normal) contra Steelix (Steel/Ground - resistiria 0.5x)
    const p1 = createMon({ moves: [SONIC_BOOM] });
    const steelix = createMon({ id: 208, name: 'steelix', types: ['steel', 'ground'], hp: 200, moves: [SONIC_BOOM] });
    const sResist = BattleEngine.createBattle(p1, steelix);
    const rResist = BattleEngine.resolveTurn(sResist, {
      player: { type: 'MOVE', moveId: 49 },
      enemy: { type: 'MOVE', moveId: 49 }
    });

    const effResist = rResist.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'player');
    assert.equal(effResist.multiplier, 1, 'Multiplicador efetivo é 1');
    assert.equal(effResist.classification, TYPE_EFFECTIVENESS_CLASSIFICATION.NEUTRAL, 'Classificação é NEUTRAL');
    const dmgResist = rResist.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgResist.damage, 20, 'Causa 20 HP exatos, suprimindo mensagem de não muito efetivo');

    // Dragon Rage (Dragon) contra Dragonite (Dragon/Flying - fraqueza 2x)
    const p2 = createMon({ moves: [DRAGON_RAGE] });
    const dragonite = createMon({ id: 149, name: 'dragonite', types: ['dragon', 'flying'], hp: 200, moves: [DRAGON_RAGE] });
    const sWeak = BattleEngine.createBattle(p2, dragonite);
    const rWeak = BattleEngine.resolveTurn(sWeak, {
      player: { type: 'MOVE', moveId: 82 },
      enemy: { type: 'MOVE', moveId: 82 }
    });

    const effWeak = rWeak.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'player');
    assert.equal(effWeak.multiplier, 1, 'Multiplicador efetivo é 1');
    assert.equal(effWeak.classification, TYPE_EFFECTIVENESS_CLASSIFICATION.NEUTRAL, 'Classificação é NEUTRAL');
    const dmgWeak = rWeak.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgWeak.damage, 40, 'Causa 40 HP exatos, suprimindo mensagem de super efetivo');
  });

  test('6. Imunidades canônicas respeitadas: Sonic Boom falha contra Ghost; Dragon Rage falha contra Fairy', () => {
    // Sonic Boom (Normal) contra Gengar (Ghost/Poison) -> IMUNIDADE
    const p1 = createMon({ moves: [SONIC_BOOM] });
    const ghost = createMon({ id: 94, name: 'gengar', types: ['ghost', 'poison'], hp: 200, moves: [SONIC_BOOM] });
    const sGhost = BattleEngine.createBattle(p1, ghost);
    const rGhost = BattleEngine.resolveTurn(sGhost, {
      player: { type: 'MOVE', moveId: 49 },
      enemy: { type: 'MOVE', moveId: 49 }
    });

    const effGhost = rGhost.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'player');
    assert.equal(effGhost.multiplier, 0);
    assert.equal(effGhost.classification, TYPE_EFFECTIVENESS_CLASSIFICATION.IMMUNE);
    const dmgGhost = rGhost.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgGhost.damage, 0);
    assert.equal(rGhost.state.enemy.currentHp, 200, 'HP do alvo Ghost permanece intacto');

    // Dragon Rage (Dragon) contra Clefable (Fairy) -> IMUNIDADE
    const p2 = createMon({ moves: [DRAGON_RAGE] });
    const fairy = createMon({ id: 36, name: 'clefable', types: ['fairy'], hp: 200, moves: [SONIC_BOOM] });
    const sFairy = BattleEngine.createBattle(p2, fairy);
    const rFairy = BattleEngine.resolveTurn(sFairy, {
      player: { type: 'MOVE', moveId: 82 },
      enemy: { type: 'MOVE', moveId: 49 }
    });

    const effFairy = rFairy.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'player');
    assert.equal(effFairy.multiplier, 0);
    assert.equal(effFairy.classification, TYPE_EFFECTIVENESS_CLASSIFICATION.IMMUNE);
    const dmgFairy = rFairy.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgFairy.damage, 0);
    assert.equal(rFairy.state.enemy.currentHp, 200, 'HP do alvo Fairy permanece intacto');
  });

  test('7. Interação explícita com SHADOW_AURA: superação de imunidade e preservação de dano fixo (20/40)', () => {
    // 7.1 Sonic Boom vs Ghost
    const playerGhost = createMon({ id: 94, name: 'gengar', types: ['ghost', 'poison'], speed: 10 });
    const enemySonic = createMon({ id: 101, name: 'electrode', types: ['electric'], speed: 100, moves: [SONIC_BOOM] });

    // Sem aura: imunidade normal é estritamente respeitada (dano 0)
    const sNoAura = BattleEngine.createBattle(playerGhost, enemySonic);
    const rNoAura = BattleEngine.resolveTurn(sNoAura, {
      player: { type: 'MOVE', moveId: 49 },
      enemy: { type: 'MOVE', moveId: 49, accuracyRoll: 50 }
    });
    const dmgNoAura = rNoAura.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy');
    const effNoAura = rNoAura.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'enemy');
    assert.equal(effNoAura.multiplier, 0);
    assert.equal(effNoAura.classification, TYPE_EFFECTIVENESS_CLASSIFICATION.IMMUNE);
    assert.equal(dmgNoAura.damage, 0);

    const evalNoAura = BattleEvaluator.evaluateMove(enemySonic, playerGhost, SONIC_BOOM, { attackerSide: 'enemy', modifiers: {} });
    assert.equal(evalNoAura.expectedDamage, 0);
    assert.equal(evalNoAura.typeClassification, TYPE_EFFECTIVENESS_CLASSIFICATION.IMMUNE);

    // Inimigo com aura vs Ghost: aura supera imunidade, mas dano permanece fixo em 20 HP
    const sSonicAura = BattleEngine.createBattle(playerGhost, enemySonic, { modifiers: { SHADOW_AURA: true } });
    const rSonicAura = BattleEngine.resolveTurn(sSonicAura, {
      player: { type: 'MOVE', moveId: 49 },
      enemy: { type: 'MOVE', moveId: 49, accuracyRoll: 50 }
    });
    const dmgSonicAura = rSonicAura.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy');
    const effSonicAura = rSonicAura.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'enemy');
    assert.equal(effSonicAura.multiplier, 1, 'Multiplicador efetivo normalizado para 1 em golpe de dano constante');
    assert.equal(effSonicAura.classification, TYPE_EFFECTIVENESS_CLASSIFICATION.NEUTRAL, 'Suprime fraqueza/amplificação');
    assert.equal(dmgSonicAura.damage, 20, 'Dano estritamente 20 HP (não amplificado para 40)');

    const evalSonicAura = BattleEvaluator.evaluateMove(enemySonic, playerGhost, SONIC_BOOM, { attackerSide: 'enemy', modifiers: { SHADOW_AURA: true } });
    assert.equal(evalSonicAura.baseDamage, 20);
    assert.equal(evalSonicAura.expectedDamage, 18, 'Ponderado pela acurácia (20 * 0.9 = 18)');
    assert.equal(evalSonicAura.typeClassification, TYPE_EFFECTIVENESS_CLASSIFICATION.NEUTRAL);
    assert.equal(evalSonicAura.typeMultiplier, 1);

    // PresentationMapper para aura superando imunidade em dano fixo:
    const cmdsSonicAura = PresentationMapper.mapEvents(rSonicAura.events);
    const moveAnnSonic = cmdsSonicAura.find(c => c.type === PRESENTATION_COMMANDS.MOVE_ANNOUNCEMENT && c.side === 'enemy');
    const effFeedSonic = cmdsSonicAura.find(c => c.type === PRESENTATION_COMMANDS.EFFECTIVENESS_FEEDBACK && c.source === 'enemy');
    const hpTransSonic = cmdsSonicAura.find(c => c.type === PRESENTATION_COMMANDS.HP_TRANSITION && c.side === 'player');
    assert.equal(moveAnnSonic.isImmune, false, 'Não anuncia imunidade pois houve dano');
    assert.equal(moveAnnSonic.multiplier, 1);
    assert.equal(moveAnnSonic.classification, 'NEUTRAL', 'Não anuncia super efetivo');
    assert.equal(effFeedSonic.classification, 'NEUTRAL');
    assert.equal(hpTransSonic.damage, 20);

    // Inimigo com aura vs alvo não-imune (Pikachu): dano 20 (não amplificado)
    const playerPika = createMon({ id: 25, name: 'pikachu', types: ['electric'], speed: 10 });
    const sSonicPika = BattleEngine.createBattle(playerPika, enemySonic, { modifiers: { SHADOW_AURA: true } });
    const rSonicPika = BattleEngine.resolveTurn(sSonicPika, {
      player: { type: 'MOVE', moveId: 49 },
      enemy: { type: 'MOVE', moveId: 49, accuracyRoll: 50 }
    });
    const dmgSonicPika = rSonicPika.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy');
    assert.equal(dmgSonicPika.damage, 20, 'Alvo comum não tem dano amplificado');

    // Jogador atacando Ghost enquanto aura está ativa no estado: aura é restrita ao inimigo, jogador continua imune
    const playerSonic = createMon({ id: 101, name: 'player-electrode', types: ['electric'], speed: 100, moves: [SONIC_BOOM] });
    const enemyGhost = createMon({ id: 94, name: 'enemy-gengar', types: ['ghost', 'poison'], speed: 10 });
    const sPlayerAura = BattleEngine.createBattle(playerSonic, enemyGhost, { modifiers: { SHADOW_AURA: true } });
    const rPlayerAura = BattleEngine.resolveTurn(sPlayerAura, {
      player: { type: 'MOVE', moveId: 49, accuracyRoll: 50 },
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const dmgPlayerAura = rPlayerAura.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    const effPlayerAura = rPlayerAura.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'player');
    assert.equal(effPlayerAura.multiplier, 0);
    assert.equal(effPlayerAura.classification, TYPE_EFFECTIVENESS_CLASSIFICATION.IMMUNE);
    assert.equal(dmgPlayerAura.damage, 0);

    const evalPlayerAura = BattleEvaluator.evaluateMove(playerSonic, enemyGhost, SONIC_BOOM, { attackerSide: 'player', modifiers: { SHADOW_AURA: true } });
    assert.equal(evalPlayerAura.expectedDamage, 0);
    assert.equal(evalPlayerAura.typeClassification, TYPE_EFFECTIVENESS_CLASSIFICATION.IMMUNE);

    const cmdsPlayerAura = PresentationMapper.mapEvents(rPlayerAura.events);
    const moveAnnPlayer = cmdsPlayerAura.find(c => c.type === PRESENTATION_COMMANDS.MOVE_ANNOUNCEMENT && c.side === 'player');
    assert.equal(moveAnnPlayer.isImmune, true, 'Jogador mantém feedback canônico de imunidade');

    // 7.2 Dragon Rage vs Fairy
    const playerFairy = createMon({ id: 36, name: 'clefable', types: ['fairy'], speed: 10, moves: [DRAGON_RAGE] });
    const enemyDragon = createMon({ id: 130, name: 'gyarados', types: ['water', 'flying'], speed: 100, moves: [DRAGON_RAGE] });

    // Sem aura:
    const sDragonNoAura = BattleEngine.createBattle(playerFairy, enemyDragon);
    const rDragonNoAura = BattleEngine.resolveTurn(sDragonNoAura, {
      player: { type: 'MOVE', moveId: 82 },
      enemy: { type: 'MOVE', moveId: 82 }
    });
    const dmgDragonNoAura = rDragonNoAura.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy');
    assert.equal(dmgDragonNoAura.damage, 0);

    // Inimigo com aura vs Fairy: supera imunidade, dano 40 (não amplificado)
    const sDragonAura = BattleEngine.createBattle(playerFairy, enemyDragon, { modifiers: { SHADOW_AURA: true } });
    const rDragonAura = BattleEngine.resolveTurn(sDragonAura, {
      player: { type: 'MOVE', moveId: 82 },
      enemy: { type: 'MOVE', moveId: 82 }
    });
    const dmgDragonAura = rDragonAura.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy');
    const effDragonAura = rDragonAura.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'enemy');
    assert.equal(effDragonAura.multiplier, 1);
    assert.equal(effDragonAura.classification, TYPE_EFFECTIVENESS_CLASSIFICATION.NEUTRAL);
    assert.equal(dmgDragonAura.damage, 40, 'Dano estritamente 40 HP (não amplificado para 80)');

    const evalDragonAura = BattleEvaluator.evaluateMove(enemyDragon, playerFairy, DRAGON_RAGE, { attackerSide: 'enemy', modifiers: { SHADOW_AURA: true } });
    assert.equal(evalDragonAura.baseDamage, 40);
    assert.equal(evalDragonAura.expectedDamage, 40);
    assert.equal(evalDragonAura.typeClassification, TYPE_EFFECTIVENESS_CLASSIFICATION.NEUTRAL);

    const cmdsDragonAura = PresentationMapper.mapEvents(rDragonAura.events);
    const moveAnnDragon = cmdsDragonAura.find(c => c.type === PRESENTATION_COMMANDS.MOVE_ANNOUNCEMENT && c.side === 'enemy');
    assert.equal(moveAnnDragon.isImmune, false);
    assert.equal(moveAnnDragon.multiplier, 1);
    assert.equal(moveAnnDragon.classification, 'NEUTRAL');

    // Jogador atacando Fairy com Dragon Rage enquanto aura está ativa: continua imune
    const playerDragon = createMon({ id: 130, name: 'player-gyarados', speed: 100, moves: [DRAGON_RAGE] });
    const enemyFairy = createMon({ id: 36, name: 'enemy-clefable', types: ['fairy'], speed: 10, moves: [DRAGON_RAGE] });
    const sDragonPlayerAura = BattleEngine.createBattle(playerDragon, enemyFairy, { modifiers: { SHADOW_AURA: true } });
    const rDragonPlayerAura = BattleEngine.resolveTurn(sDragonPlayerAura, {
      player: { type: 'MOVE', moveId: 82 },
      enemy: { type: 'MOVE', moveId: 82 }
    });
    const dmgDragonPlayerAura = rDragonPlayerAura.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgDragonPlayerAura.damage, 0);

    // 7.3 Dano limitado ao HP restante, nocaute único e reservas intactas quando aura supera imunidade
    const playerGhostLow = createMon({ id: 94, name: 'player-gengar-low', types: ['ghost', 'poison'], hp: 100, currentHp: 15, speed: 10 });
    const playerReserve1 = createMon({ id: 1, name: 'player-res-1', hp: 200, currentHp: 200 });
    const playerReserve2 = createMon({ id: 2, name: 'player-res-2', hp: 200, currentHp: 200 });
    const enemyTeamMon1 = createMon({ id: 101, name: 'enemy-electrode-aura', speed: 100, moves: [SONIC_BOOM] });
    const enemyTeamMon2 = createMon({ id: 102, name: 'enemy-res-1' });
    const enemyTeamMon3 = createMon({ id: 103, name: 'enemy-res-2' });

    const sTeamAura = BattleEngine.createTeamBattle(
      [playerGhostLow, playerReserve1, playerReserve2],
      [enemyTeamMon1, enemyTeamMon2, enemyTeamMon3],
      { modifiers: { SHADOW_AURA: true } }
    );

    const rTeamAura = BattleEngine.resolveTurn(sTeamAura, {
      player: { type: 'MOVE', moveId: 49 },
      enemy: { type: 'MOVE', moveId: 49, accuracyRoll: 50 }
    });
    const dmgTeamAura = rTeamAura.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy');
    assert.equal(dmgTeamAura.damage, 15, 'Dano limitado a 15 HP restantes da liderança Ghost');
    assert.equal(rTeamAura.state.player.team[0].currentHp, 0, 'Liderança Ghost fainted');
    assert.equal(rTeamAura.state.player.team[1].currentHp, 200, 'Reserva 1 do jogador 100% intacta');
    assert.equal(rTeamAura.state.player.team[2].currentHp, 200, 'Reserva 2 do jogador 100% intacta');
    assert.equal(rTeamAura.state.status, BATTLE_STATUS.AWAITING_REPLACEMENT);

    // 7.4 Regressões pontuais da infraestrutura compartilhada (golpes de nível e golpes comuns)
    // Seismic Toss (Fighting) vs Ghost
    const enemySeismic = createMon({ id: 68, name: 'machamp', level: 50, speed: 100, moves: [SEISMIC_TOSS] });
    const sSeismicAura = BattleEngine.createBattle(playerGhost, enemySeismic, { modifiers: { SHADOW_AURA: true } });
    const rSeismicAura = BattleEngine.resolveTurn(sSeismicAura, {
      player: { type: 'MOVE', moveId: 49 },
      enemy: { type: 'MOVE', moveId: 69 }
    });
    const dmgSeismicAura = rSeismicAura.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy');
    assert.equal(dmgSeismicAura.damage, 50, 'Seismic Toss com aura causa o nível (50), não amplificado para 100');

    // Night Shade (Ghost) vs Normal (Snorlax)
    const playerNormal = createMon({ id: 143, name: 'snorlax', types: ['normal'], speed: 10, moves: [NIGHT_SHADE] });
    const enemyNightShade = createMon({ id: 356, name: 'dusclops', level: 60, speed: 100, moves: [NIGHT_SHADE] });
    const sNightAura = BattleEngine.createBattle(playerNormal, enemyNightShade, { modifiers: { SHADOW_AURA: true } });
    const rNightAura = BattleEngine.resolveTurn(sNightAura, {
      player: { type: 'MOVE', moveId: 101 },
      enemy: { type: 'MOVE', moveId: 101 }
    });
    const dmgNightAura = rNightAura.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy');
    assert.equal(dmgNightAura.damage, 60, 'Night Shade com aura causa o nível (60), não amplificado para 120');

    // Golpe comum Tackle (Normal, Physical) vs Ghost com aura:
    // Supera imunidade aplicando multiplicador >= 2 e fórmula comum de dano
    const enemyTackle = createMon({ id: 19, name: 'rattata', speed: 100, moves: [TACKLE] });
    const sTackleAura = BattleEngine.createBattle(playerGhost, enemyTackle, { modifiers: { SHADOW_AURA: true } });
    const rTackleAura = BattleEngine.resolveTurn(sTackleAura, {
      player: { type: 'MOVE', moveId: 49 },
      enemy: { type: 'MOVE', moveId: 33 }
    });
    const effTackleAura = rTackleAura.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'enemy');
    const dmgTackleAura = rTackleAura.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy');
    assert.equal(effTackleAura.multiplier, 2, 'Golpe comum com aura supera imunidade com multiplicador >= 2');
    assert.ok(dmgTackleAura.damage > 0, 'Golpe comum causa dano não-fixo');
  });

  test('8. HP Capping e Nocaute: dano limitado ao HP restante sem excedente para reservas', () => {
    // Defensor com 10 HP atingido por Sonic Boom (20)
    const p1 = createMon({ moves: [SONIC_BOOM] });
    const lowHpDef = createMon({ id: 2, hp: 100, currentHp: 10, speed: 10, moves: [SONIC_BOOM] });
    const sKo = BattleEngine.createBattle(p1, lowHpDef);
    const rKo = BattleEngine.resolveTurn(sKo, {
      player: { type: 'MOVE', moveId: 49 },
      enemy: { type: 'MOVE', moveId: 49 }
    });

    const dmgKo = rKo.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgKo.damage, 10, 'Dano limitado ao HP restante (10)');
    assert.equal(dmgKo.currentHp, 0);
    assert.equal(rKo.state.enemy.currentHp, 0);
    assert.ok(rKo.events.some(e => e.type === BATTLE_EVENTS.POKEMON_FAINTED && e.target === 'enemy'));
    assert.equal(rKo.state.winner, 'player');
    assert.equal(rKo.state.status, BATTLE_STATUS.PLAYER_WIN);

    // Defensor com 25 HP em equipe 3x3 atingido por Dragon Rage (40)
    const userDragon = createMon({ id: 10, name: 'dragon-mon', moves: [DRAGON_RAGE], speed: 200 });
    const dummyP2 = createMon({ id: 11, name: 'player-bench-1' });
    const dummyP3 = createMon({ id: 12, name: 'player-bench-2' });
    const leadTarget = createMon({ id: 20, name: 'enemy-lead', hp: 100, currentHp: 25, speed: 10, moves: [DRAGON_RAGE] });
    const bench1 = createMon({ id: 21, name: 'enemy-bench-1', hp: 200, currentHp: 200 });
    const bench2 = createMon({ id: 22, name: 'enemy-bench-2', hp: 200, currentHp: 200 });

    const sTeam = BattleEngine.createTeamBattle([userDragon, dummyP2, dummyP3], [leadTarget, bench1, bench2]);
    const rTeam = BattleEngine.resolveTurn(sTeam, {
      player: { type: 'MOVE', moveId: 82 },
      enemy: { type: 'MOVE', moveId: 82 }
    });

    const dmgTeam = rTeam.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgTeam.damage, 25, 'Dano limitado a 25 HP');
    assert.equal(rTeam.state.enemy.team[0].currentHp, 0);
    assert.equal(rTeam.state.enemy.team[1].currentHp, 200, 'Reserva 1 intacta com 200 HP');
    assert.equal(rTeam.state.enemy.team[2].currentHp, 200, 'Reserva 2 intacta com 200 HP');
    assert.equal(rTeam.state.status, BATTLE_STATUS.AWAITING_REPLACEMENT);
  });

  test('9. Precisão e consumo de PP: Sonic Boom (90%) erra e consome PP; Dragon Rage (100%) consome 1 PP', () => {
    // Sonic Boom com roll de precisão 95 (erra)
    const sonicUser = createMon({ moves: [{ id: 49, name: 'sonic-boom', type: 'normal', power: null, accuracy: 90, pp: 20, currentPp: 20, damageClass: 'special' }] });
    const target = createMon({ hp: 200, speed: 10, moves: [SONIC_BOOM] });
    const sMiss = BattleEngine.createBattle(sonicUser, target);
    const rMiss = BattleEngine.resolveTurn(sMiss, {
      player: { type: 'MOVE', moveId: 49, accuracyRoll: 95 },
      enemy: { type: 'MOVE', moveId: 49 }
    });

    const moveMissEv = rMiss.events.find(e => e.type === BATTLE_EVENTS.MOVE_MISSED && e.actor === 'player');
    assert.ok(moveMissEv, 'Golpe emite MOVE_MISSED por precisão 90');
    assert.ok(!rMiss.events.some(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player'));
    assert.equal(rMiss.state.enemy.currentHp, 200);
    assert.equal(rMiss.state.player.moves[0].currentPp, 19, 'Consome 1 PP mesmo errando');

    // Dragon Rage acertando normalmente
    const dragonUser = createMon({ moves: [{ id: 82, name: 'dragon-rage', type: 'dragon', power: null, accuracy: 100, pp: 10, currentPp: 10, damageClass: 'special' }] });
    const sHit = BattleEngine.createBattle(dragonUser, target);
    const rHit = BattleEngine.resolveTurn(sHit, {
      player: { type: 'MOVE', moveId: 82, accuracyRoll: 50 },
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const dmgHit = rHit.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgHit.damage, 40);
    assert.equal(rHit.state.player.moves[0].currentPp, 9, 'Consome 1 PP acertando');
  });

  test('10. Condições impeditivas: sono, freeze, paralisia, flinch e confusão', () => {
    const dummy = createMon({ hp: 200, speed: 10, moves: [SONIC_BOOM] });

    // 10.1 Sono: bloqueia ação, reduz sleepTurns, emite STATUS_IMMOBILIZED e NÃO consome PP
    const sleeper = createMon({
      statusCondition: 'sleep',
      sleepTurns: 2,
      speed: 200,
      moves: [{ id: 49, name: 'sonic-boom', type: 'normal', power: null, accuracy: 90, pp: 20, currentPp: 20, damageClass: 'special' }]
    });
    const sSleep = BattleEngine.createBattle(sleeper, dummy);
    const rSleep = BattleEngine.resolveTurn(sSleep, {
      player: { type: 'MOVE', moveId: 49 },
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const immSleep = rSleep.events.find(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player');
    assert.ok(immSleep);
    assert.equal(immSleep.statusCondition, 'sleep');
    assert.equal(rSleep.state.player.sleepTurns, 1);
    assert.equal(rSleep.state.player.moves[0].currentPp, 20, 'Sono NÃO consome PP');

    // 10.2 Congelamento: bloqueia ação se falhar no descongelamento, NÃO consome PP
    const frozen = createMon({
      statusCondition: 'freeze',
      speed: 200,
      moves: [{ id: 82, name: 'dragon-rage', type: 'dragon', power: null, accuracy: 100, pp: 10, currentPp: 10, damageClass: 'special' }]
    });
    const sFreeze = BattleEngine.createBattle(frozen, dummy);
    const rFreeze = BattleEngine.resolveTurn(sFreeze, {
      player: { type: 'MOVE', moveId: 82, thawRoll: 50 }, // >= 20 não descongela
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const immFreeze = rFreeze.events.find(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player');
    assert.ok(immFreeze);
    assert.equal(immFreeze.statusCondition, 'freeze');
    assert.equal(immFreeze.reason, 'FROZEN_SOLID');
    assert.equal(rFreeze.state.player.statusCondition, 'freeze');
    assert.equal(rFreeze.state.player.moves[0].currentPp, 10, 'Freeze NÃO consome PP');

    // 10.3 Paralisia: bloqueia ação quando sorteada, mas CONSOME 1 PP
    const paralyzed = createMon({
      statusCondition: 'paralysis',
      speed: 200,
      moves: [{ id: 49, name: 'sonic-boom', type: 'normal', power: null, accuracy: 90, pp: 20, currentPp: 20, damageClass: 'special' }]
    });
    const sPara = BattleEngine.createBattle(paralyzed, dummy);
    const rPara = BattleEngine.resolveTurn(sPara, {
      player: { type: 'MOVE', moveId: 49, statusRoll: 10 }, // <= 25 ativa paralisia total
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const immPara = rPara.events.find(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player');
    assert.ok(immPara);
    assert.equal(immPara.statusCondition, 'paralysis');
    assert.equal(rPara.state.player.moves[0].currentPp, 19, 'Paralisia total CONSOME 1 PP');

    // 10.4 Flinch: bloqueia ação, limpa flag, NÃO consome PP
    const flinched = createMon({
      isFlinched: true,
      speed: 200,
      moves: [{ id: 82, name: 'dragon-rage', type: 'dragon', power: null, accuracy: 100, pp: 10, currentPp: 10, damageClass: 'special' }]
    });
    const sFlinch = BattleEngine.createBattle(flinched, dummy);
    sFlinch.player.isFlinched = true;
    const rFlinch = BattleEngine.resolveTurn(sFlinch, {
      player: { type: 'MOVE', moveId: 82 },
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const flinchEv = rFlinch.events.find(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'player');
    assert.ok(flinchEv);
    assert.equal(rFlinch.state.player.isFlinched, false);
    assert.equal(rFlinch.state.player.moves[0].currentPp, 10, 'Flinch NÃO consome PP');

    // 10.5 Confusão com autoagressão: decrementa turnos, dano físico em si mesmo, defensor intacto, NÃO consome PP
    const confusedSelf = createMon({
      confusionTurns: 3,
      hp: 200,
      speed: 200,
      moves: [{ id: 49, name: 'sonic-boom', type: 'normal', power: null, accuracy: 90, pp: 20, currentPp: 20, damageClass: 'special' }]
    });
    const sConfSelf = BattleEngine.createBattle(confusedSelf, dummy);
    sConfSelf.player.confusionTurns = 3;
    const rConfSelf = BattleEngine.resolveTurn(sConfSelf, {
      player: { type: 'MOVE', moveId: 49, confusionHitRoll: 20 }, // <= 33 se machuca
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const checkEv = rConfSelf.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_CHECK && e.actor === 'player');
    assert.ok(checkEv);
    assert.equal(checkEv.remainingTurns, 2);
    const dmgConfEv = rConfSelf.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE && e.actor === 'player');
    assert.ok(dmgConfEv);
    assert.equal(rConfSelf.state.player.moves[0].currentPp, 20, 'Autoagressão de confusão NÃO consome PP');
    assert.equal(rConfSelf.state.enemy.currentHp, 200, 'Defensor não toma dano');

    // 10.6 Confusão superada: executa golpe com dano constante e consome 1 PP
    const confusedOvercome = createMon({
      confusionTurns: 3,
      speed: 200,
      moves: [{ id: 49, name: 'sonic-boom', type: 'normal', power: null, accuracy: 90, pp: 20, currentPp: 20, damageClass: 'special' }]
    });
    const sConfOver = BattleEngine.createBattle(confusedOvercome, dummy);
    sConfOver.player.confusionTurns = 3;
    const rConfOver = BattleEngine.resolveTurn(sConfOver, {
      player: { type: 'MOVE', moveId: 49, confusionHitRoll: 80, accuracyRoll: 50 },
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const dmgConfOver = rConfOver.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgConfOver.damage, 20);
    assert.equal(rConfOver.state.player.moves[0].currentPp, 19, 'Confusão superada CONSOME 1 PP');
  });

  test('11. Avaliador e IA: dano médio, precisão, KO garantido e imunidade', () => {
    const user = createMon({ id: 1, moves: [SONIC_BOOM, DRAGON_RAGE] });
    const dummy = createMon({ id: 2, hp: 200 });

    // Avaliação de Sonic Boom (poder null, accuracy 90, dano 20)
    const evalSonic = BattleEvaluator.evaluateMove(user, dummy, SONIC_BOOM);
    assert.equal(evalSonic.baseDamage, 20);
    assert.equal(evalSonic.minDamage, 20);
    assert.equal(evalSonic.maxDamage, 20);
    assert.equal(evalSonic.averageDamage, 20);
    assert.equal(evalSonic.expectedDamage, 18, '20 * 0.9 = 18');
    assert.equal(evalSonic.guaranteedKo, false);
    assert.equal(evalSonic.wouldKo, false);

    // Sonic Boom contra alvo com 20 HP -> KO garantido
    const lowTarget20 = createMon({ id: 3, hp: 100, currentHp: 20 });
    const evalSonicKo = BattleEvaluator.evaluateMove(user, lowTarget20, SONIC_BOOM);
    assert.equal(evalSonicKo.guaranteedKo, true);
    assert.equal(evalSonicKo.wouldKo, true);

    // Sonic Boom contra alvo com 21 HP -> não garante KO
    const lowTarget21 = createMon({ id: 4, hp: 100, currentHp: 21 });
    const evalSonicNoKo = BattleEvaluator.evaluateMove(user, lowTarget21, SONIC_BOOM);
    assert.equal(evalSonicNoKo.guaranteedKo, false);

    // Sonic Boom contra alvo Ghost imune -> dano 0
    const ghostTarget = createMon({ id: 5, types: ['ghost'], hp: 200 });
    const evalSonicImmune = BattleEvaluator.evaluateMove(user, ghostTarget, SONIC_BOOM);
    assert.equal(evalSonicImmune.baseDamage, 0);
    assert.equal(evalSonicImmune.expectedDamage, 0);

    // Avaliação de Dragon Rage (poder null, accuracy 100, dano 40)
    const evalDragon = BattleEvaluator.evaluateMove(user, dummy, DRAGON_RAGE);
    assert.equal(evalDragon.baseDamage, 40);
    assert.equal(evalDragon.minDamage, 40);
    assert.equal(evalDragon.maxDamage, 40);
    assert.equal(evalDragon.averageDamage, 40);
    assert.equal(evalDragon.expectedDamage, 40, '40 * 1.0 = 40');

    // Dragon Rage contra alvo com 40 HP -> KO garantido
    const lowTarget40 = createMon({ id: 6, hp: 100, currentHp: 40 });
    const evalDragonKo = BattleEvaluator.evaluateMove(user, lowTarget40, DRAGON_RAGE);
    assert.equal(evalDragonKo.guaranteedKo, true);
    assert.equal(evalDragonKo.wouldKo, true);

    // Dragon Rage contra alvo Fairy imune -> dano 0
    const fairyTarget = createMon({ id: 7, types: ['fairy'], hp: 200 });
    const evalDragonImmune = BattleEvaluator.evaluateMove(user, fairyTarget, DRAGON_RAGE);
    assert.equal(evalDragonImmune.baseDamage, 0);
    assert.equal(evalDragonImmune.expectedDamage, 0);

    // IA escolhe deterministamente Dragon Rage sobre Sonic Boom contra alvo neutro (40 > 18)
    const state = BattleEngine.createBattle(dummy, user);
    const { action } = BattleAI.chooseAction(state, 'enemy');
    assert.equal(action.type, 'MOVE');
    assert.equal(action.moveId, 82, 'IA escolhe Dragon Rage por maior dano esperado');
  });

  test('12. Sessão real, PresentationMapper, troca voluntária e Sleep Talk', async () => {
    const rng = new DeterministicRandomSource({
      accuracy: 50,
      damage: 100
    });

    const playerTeam = [
      createMon({ id: 101, name: 'electrode', hp: 200, moves: [SONIC_BOOM] }),
      createMon({ id: 94, name: 'gengar', types: ['ghost', 'poison'], hp: 200, moves: [SONIC_BOOM] }),
      createMon({ id: 36, name: 'clefable', types: ['fairy'], hp: 200, moves: [SONIC_BOOM] })
    ];
    const enemyTeam = [
      createMon({ id: 130, name: 'gyarados', hp: 250, moves: [DRAGON_RAGE, SONIC_BOOM] }),
      createMon({ id: 131, name: 'lapras', hp: 250, moves: [SONIC_BOOM] }),
      createMon({ id: 132, name: 'ditto', hp: 200, moves: [TACKLE] })
    ];

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [101, 94, 36] },
      hydrator: { hydrateTeam: async ids => ids.map(id => playerTeam.find(x => x.id === id) || enemyTeam.find(x => x.id === id)) },
      opponentFactory: { createOpponentTeam: async () => enemyTeam },
      ai: { chooseAction: () => ({ action: { type: 'MOVE', moveId: 82 } }) }, // Adversário usa Dragon Rage (40)
      randomSource: rng,
      presentationEngine: { play: async batch => capturedEvents.push(...batch), playCommands: async () => { } }
    });

    await session.prepareBattle({ playerTeamIds: [101, 94, 36] });
    await session.startBattle();

    // Turno 1: Jogador usa Sonic Boom (20); Adversário usa Dragon Rage (40)
    await session.submitPlayerMove(49);
    const activeEnemy = session.engine.getActiveCombatant(session.battleState, 'enemy');
    const activePlayer = session.engine.getActiveCombatant(session.battleState, 'player');
    assert.equal(activeEnemy.currentHp, 230, 'Gyarados tomou 20 de dano');
    assert.equal(activePlayer.currentHp, 160, 'Electrode tomou 40 de dano');

    const commandsTurn1 = PresentationMapper.mapEvents(capturedEvents, { battleState: session.battleState });
    assert.ok(commandsTurn1.some(c => c.type === PRESENTATION_COMMANDS.HP_TRANSITION && c.damage === 20));
    assert.ok(commandsTurn1.some(c => c.type === PRESENTATION_COMMANDS.HP_TRANSITION && c.damage === 40));

    // Turno 2: Jogador troca para Clefable (#36; Fairy); Adversário usa Dragon Rage (Dragon) -> IMUNIDADE
    const switchEvents = [];
    const switchSession = new BattleSessionController({
      teamStore: { load: () => [101, 94, 36] },
      hydrator: { hydrateTeam: async ids => ids.map(id => playerTeam.find(x => x.id === id) || enemyTeam.find(x => x.id === id)) },
      opponentFactory: { createOpponentTeam: async () => enemyTeam },
      ai: { chooseAction: () => ({ action: { type: 'MOVE', moveId: 82 } }) },
      randomSource: rng,
      presentationEngine: { play: async batch => switchEvents.push(...batch), playCommands: async () => { } }
    });
    await switchSession.prepareBattle({ playerTeamIds: [101, 94, 36] });
    await switchSession.startBattle();

    await switchSession.submitPlayerSwitch(36);
    const clefableActive = switchSession.engine.getActiveCombatant(switchSession.battleState, 'player');
    assert.equal(clefableActive.id, 36);
    assert.equal(clefableActive.currentHp, 200, 'Clefable tomou 0 de dano por ser Fairy (imune a Dragon Rage)');

    const switchCommands = PresentationMapper.mapEvents(switchEvents, { battleState: switchSession.battleState });
    assert.ok(switchCommands.some(c => c.type === PRESENTATION_COMMANDS.SWITCH_OUT_SEQUENCE));
    assert.ok(switchCommands.some(c => c.type === PRESENTATION_COMMANDS.SWITCH_IN_SEQUENCE));

    // Turno 3: Jogador troca para Gengar (#94; Ghost); Adversário usa Sonic Boom (Normal) -> IMUNIDADE
    const ghostSwitchEvents = [];
    const ghostSwitchSession = new BattleSessionController({
      teamStore: { load: () => [101, 94, 36] },
      hydrator: { hydrateTeam: async ids => ids.map(id => playerTeam.find(x => x.id === id) || enemyTeam.find(x => x.id === id)) },
      opponentFactory: { createOpponentTeam: async () => enemyTeam },
      ai: { chooseAction: () => ({ action: { type: 'MOVE', moveId: 49 } }) }, // Adversário usa Sonic Boom
      randomSource: rng,
      presentationEngine: { play: async batch => ghostSwitchEvents.push(...batch), playCommands: async () => { } }
    });
    await ghostSwitchSession.prepareBattle({ playerTeamIds: [101, 94, 36] });
    await ghostSwitchSession.startBattle();

    await ghostSwitchSession.submitPlayerSwitch(94);
    const gengarActive = ghostSwitchSession.engine.getActiveCombatant(ghostSwitchSession.battleState, 'player');
    assert.equal(gengarActive.id, 94);
    assert.equal(gengarActive.currentHp, 200, 'Gengar tomou 0 de dano por ser Ghost (imune a Sonic Boom)');

    // 12.4 Sleep Talk chamando Sonic Boom em sessão real: consome 1 PP de Sleep Talk e preserva PP de Sonic Boom
    const sleeperMon = createMon({
      id: 7,
      name: 'sleeper',
      level: 50,
      statusCondition: 'sleep',
      sleepTurns: 2,
      moves: [
        { id: 214, name: 'sleep-talk', type: 'normal', power: 0, accuracy: null, pp: 10, currentPp: 10, damageClass: 'status' },
        { id: 49, name: 'sonic-boom', type: 'normal', power: null, accuracy: 90, pp: 20, currentPp: 20, damageClass: 'special' }
      ]
    });
    const sleepEvents = [];
    const sleepSession = new BattleSessionController({
      teamStore: { load: () => [7, 94, 36] },
      hydrator: { hydrateTeam: async ids => ids.map(id => (id === 7 ? sleeperMon : playerTeam.find(x => x.id === id)) || enemyTeam.find(x => x.id === id)) },
      opponentFactory: { createOpponentTeam: async () => enemyTeam },
      ai: { chooseAction: () => ({ action: { type: 'MOVE', moveId: 82 } }) },
      randomSource: new DeterministicRandomSource({ sleepTalkChoice: 0, accuracy: 50 }),
      presentationEngine: { play: async batch => sleepEvents.push(...batch), playCommands: async () => { } }
    });
    await sleepSession.prepareBattle({ playerTeamIds: [7, 94, 36] });
    await sleepSession.startBattle();

    await sleepSession.submitPlayerMove(214);
    const activeSleeper = sleepSession.engine.getActiveCombatant(sleepSession.battleState, 'player');
    assert.equal(activeSleeper.moves[0].currentPp, 9, 'Sleep Talk consumiu 1 PP');
    assert.equal(activeSleeper.moves[1].currentPp, 20, 'Sonic Boom manteve 20 PP intactos');
  });

  test('13. Hidratação real com BattleTeamHydrator e fixtures autênticas da PokéAPI', async () => {
    const pokeApiFixtureElectrode = {
      id: 101,
      number: 101,
      name: 'electrode',
      types: ['electric'],
      stats: { hp: 60, attack: 50, defense: 70, specialAttack: 80, specialDefense: 80, speed: 150 },
      moves: [
        { move: { name: 'sonic-boom', url: 'https://pokeapi.co/api/v2/move/49/' } },
        { move: { name: 'thunderbolt', url: 'https://pokeapi.co/api/v2/move/85/' } },
        { move: { name: 'swift', url: 'https://pokeapi.co/api/v2/move/129/' } },
        { move: { name: 'signal-beam', url: 'https://pokeapi.co/api/v2/move/324/' } }
      ]
    };

    const mockMoveCatalog = {
      49: {
        id: 49,
        name: 'sonic-boom',
        power: null,
        accuracy: 90,
        pp: 20,
        type: { name: 'normal' },
        damage_class: { name: 'special' }
      },
      85: {
        id: 85,
        name: 'thunderbolt',
        power: 90,
        accuracy: 100,
        pp: 15,
        type: { name: 'electric' },
        damage_class: { name: 'special' }
      },
      129: {
        id: 129,
        name: 'swift',
        power: 60,
        accuracy: null,
        pp: 20,
        type: { name: 'normal' },
        damage_class: { name: 'special' }
      },
      324: {
        id: 324,
        name: 'signal-beam',
        power: 75,
        accuracy: 100,
        pp: 15,
        type: { name: 'bug' },
        damage_class: { name: 'special' }
      }
    };

    const mockApi = {
      getPokemonDetail: async idOrName => {
        if (Number(idOrName) === 101 || idOrName === 'electrode') {
          return JSON.parse(JSON.stringify(pokeApiFixtureElectrode));
        }
        throw new Error(`Pokemon não encontrado: ${idOrName}`);
      },
      getMoveDetail: async moveRef => {
        const name = typeof moveRef === 'string' ? moveRef : (moveRef.name || moveRef.move?.name || '');
        const url = typeof moveRef === 'object' && moveRef !== null ? (moveRef.url || moveRef.move?.url || '') : '';
        const idFromUrl = url ? parseInt(url.match(/\/move\/(\d+)\/?/)?.[1] || 0, 10) : 0;
        const id = Number(moveRef.id) || idFromUrl || (name === 'sonic-boom' ? 49 : name === 'thunderbolt' ? 85 : name === 'swift' ? 129 : 324);
        const detail = mockMoveCatalog[id] || Object.values(mockMoveCatalog).find(m => m.name === name);
        if (detail) return JSON.parse(JSON.stringify(detail));
        return {
          id: id || 33,
          name: name || 'tackle',
          power: 40,
          accuracy: 100,
          pp: 35,
          type: { name: 'normal' },
          damage_class: { name: 'physical' }
        };
      }
    };

    const hydrator = new BattleTeamHydrator({ api: mockApi });
    const hydratedElectrode = await hydrator.hydratePokemon({ id: 101, level: 50 });
    assert.equal(hydratedElectrode.id, 101);
    assert.equal(hydratedElectrode.name, 'electrode');
    assert.equal(hydratedElectrode.level, 50);

    const sonicMove = hydratedElectrode.moves.find(m => m.name === 'sonic-boom');
    assert.ok(sonicMove, 'Sonic Boom deve estar presente nos golpes hidratados');
    assert.equal(sonicMove.power, null, 'Power deve ser estritamente null');
    assert.equal(sonicMove.damageClass, 'special');
    assert.equal(sonicMove.accuracy, 90);
    assert.equal(sonicMove.pp, 20);

    // Batalha criada a partir do combatente hidratado
    const target = createMon({ id: 2, hp: 200, speed: 10, moves: [SONIC_BOOM] });
    const battle = BattleEngine.createBattle(hydratedElectrode, target);
    const turnResult = BattleEngine.resolveTurn(battle, {
      player: { type: 'MOVE', moveId: 49, accuracyRoll: 50 },
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const dmg = turnResult.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmg.damage, 20, 'Combatente hidratado executa Sonic Boom com 20 HP exatos');
  });

  test('14. Hidratação real de Dragon Rage com BattleTeamHydrator e fixtures autênticas da PokéAPI', async () => {
    const pokeApiFixtureGyarados = {
      id: 130,
      number: 130,
      name: 'gyarados',
      types: ['water', 'flying'],
      stats: { hp: 95, attack: 125, defense: 79, specialAttack: 60, specialDefense: 100, speed: 81 },
      moves: [
        { move: { name: 'dragon-rage', url: 'https://pokeapi.co/api/v2/move/82/' } },
        { move: { name: 'surf', url: 'https://pokeapi.co/api/v2/move/57/' } },
        { move: { name: 'waterfall', url: 'https://pokeapi.co/api/v2/move/127/' } },
        { move: { name: 'ice-fang', url: 'https://pokeapi.co/api/v2/move/423/' } }
      ]
    };

    const mockMoveCatalogGyarados = {
      82: {
        id: 82,
        name: 'dragon-rage',
        power: null,
        accuracy: 100,
        pp: 10,
        type: { name: 'dragon' },
        damage_class: { name: 'special' }
      },
      57: {
        id: 57,
        name: 'surf',
        power: 90,
        accuracy: 100,
        pp: 15,
        type: { name: 'water' },
        damage_class: { name: 'special' }
      },
      127: {
        id: 127,
        name: 'waterfall',
        power: 80,
        accuracy: 100,
        pp: 15,
        type: { name: 'water' },
        damage_class: { name: 'physical' }
      },
      423: {
        id: 423,
        name: 'ice-fang',
        power: 65,
        accuracy: 95,
        pp: 15,
        type: { name: 'ice' },
        damage_class: { name: 'physical' }
      }
    };

    const mockApiGyarados = {
      getPokemonDetail: async idOrName => {
        if (Number(idOrName) === 130 || idOrName === 'gyarados') {
          return JSON.parse(JSON.stringify(pokeApiFixtureGyarados));
        }
        throw new Error(`Pokemon não encontrado: ${idOrName}`);
      },
      getMoveDetail: async moveRef => {
        const name = typeof moveRef === 'string' ? moveRef : (moveRef.name || moveRef.move?.name || '');
        const url = typeof moveRef === 'object' && moveRef !== null ? (moveRef.url || moveRef.move?.url || '') : '';
        const idFromUrl = url ? parseInt(url.match(/\/move\/(\d+)\/?/)?.[1] || 0, 10) : 0;
        const id = Number(moveRef.id) || idFromUrl || (name === 'dragon-rage' ? 82 : name === 'surf' ? 57 : name === 'waterfall' ? 127 : 423);
        const detail = mockMoveCatalogGyarados[id] || Object.values(mockMoveCatalogGyarados).find(m => m.name === name);
        if (detail) return JSON.parse(JSON.stringify(detail));
        return {
          id: id || 33,
          name: name || 'tackle',
          power: 40,
          accuracy: 100,
          pp: 35,
          type: { name: 'normal' },
          damage_class: { name: 'physical' }
        };
      }
    };

    const hydrator = new BattleTeamHydrator({ api: mockApiGyarados });

    // Hidratação com nível 30: confirma seleção, normalização e preservação de metadados
    const gyaradosLvl30 = await hydrator.hydratePokemon({ id: 130, level: 30 });
    assert.equal(gyaradosLvl30.id, 130);
    assert.equal(gyaradosLvl30.name, 'gyarados');
    assert.equal(gyaradosLvl30.level, 30);

    const drMove = gyaradosLvl30.moves.find(m => m.name === 'dragon-rage');
    assert.ok(drMove, 'Dragon Rage deve estar presente nos golpes selecionados');
    assert.equal(drMove.power, null, 'Power deve ser estritamente null');
    assert.equal(drMove.damageClass, 'special', 'Categoria deve ser special');
    assert.equal(drMove.type, 'dragon', 'Tipo deve ser dragon');
    assert.equal(drMove.accuracy, 100, 'Precisão canônica 100');
    assert.equal(drMove.pp, 10, 'PP canônico 10');

    // Batalha contra alvo elegível (Pikachu, tipo Electric): executa com 40 HP exatos
    const targetEligible = createMon({ id: 25, name: 'pikachu', types: ['electric'], hp: 200, speed: 10, moves: [SONIC_BOOM] });
    const battle30 = BattleEngine.createBattle(gyaradosLvl30, targetEligible);
    const turn30 = BattleEngine.resolveTurn(battle30, {
      player: { type: 'MOVE', moveId: 82 },
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const dmg30 = turn30.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmg30.damage, 40, 'Gyarados nível 30 causa estritamente 40 HP');

    // Demonstra que nível diferente (nível 75) não altera o dano constante de 40 HP
    const gyaradosLvl75 = await hydrator.hydratePokemon({ id: 130, level: 75 });
    assert.equal(gyaradosLvl75.level, 75);
    const targetEligible2 = createMon({ id: 25, name: 'pikachu-2', types: ['electric'], hp: 200, speed: 10, moves: [SONIC_BOOM] });
    const battle75 = BattleEngine.createBattle(gyaradosLvl75, targetEligible2);
    const turn75 = BattleEngine.resolveTurn(battle75, {
      player: { type: 'MOVE', moveId: 82 },
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const dmg75 = turn75.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmg75.damage, 40, 'Gyarados nível 75 causa exatamente os mesmos 40 HP');

    // Executa golpe hidratado contra tipo imune Fairy (Clefable) sem aura: causa 0 de dano
    const targetFairy = createMon({ id: 36, name: 'clefable', types: ['fairy'], hp: 200, speed: 10, moves: [SONIC_BOOM] });
    const battleFairy = BattleEngine.createBattle(gyaradosLvl30, targetFairy);
    const turnFairy = BattleEngine.resolveTurn(battleFairy, {
      player: { type: 'MOVE', moveId: 82 },
      enemy: { type: 'MOVE', moveId: 49 }
    });
    const dmgFairy = turnFairy.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    const effFairy = turnFairy.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'player');
    assert.equal(effFairy.multiplier, 0);
    assert.equal(effFairy.classification, TYPE_EFFECTIVENESS_CLASSIFICATION.IMMUNE);
    assert.equal(dmgFairy.damage, 0, 'Dragon Rage hidratado causa 0 dano contra Fairy');

    // Teste de resposta adulterada da API: power 999 é rejeitado antes de entrar no loadout
    const mockApiAdulterated = {
      getPokemonDetail: async () => JSON.parse(JSON.stringify(pokeApiFixtureGyarados)),
      getMoveDetail: async moveRef => {
        const name = typeof moveRef === 'string' ? moveRef : (moveRef.name || moveRef.move?.name || '');
        if (name === 'dragon-rage') {
          return {
            id: 82,
            name: 'dragon-rage',
            power: 999, // Adulterado
            accuracy: 100,
            pp: 10,
            type: { name: 'dragon' },
            damage_class: { name: 'special' }
          };
        }
        return {
          id: 57,
          name: 'surf',
          power: 90,
          accuracy: 100,
          pp: 15,
          type: { name: 'water' },
          damage_class: { name: 'special' }
        };
      }
    };
    const hydratorAdulterated = new BattleTeamHydrator({ api: mockApiAdulterated });
    const gyaradosAdulterated = await hydratorAdulterated.hydratePokemon({ id: 130, level: 50 });
    const hasDragonRageAdulterated = gyaradosAdulterated.moves.some(m => m.name === 'dragon-rage');
    assert.equal(hasDragonRageAdulterated, false, 'Dragon Rage com power 999 adulterado foi descartado pelo hydrator');
  });

  test('15. Integração com catálogo e customização da campanha', () => {
    assert.equal(Object.keys(CampaignExtras.byId).length, 489, '489 espécies com extras após ciclo P6 de protect/detect');

    // Electrode (#101) possui Sonic Boom disponível no pool da campanha
    const electrodePool = CampaignOptions.getPool(101);
    assert.ok(electrodePool.length >= 1 && electrodePool.length <= 6);
    assert.ok(electrodePool.some(m => m.id === 49 && m.name === 'sonic-boom'));

    // Gyarados (#130) possui Dragon Rage disponível no pool da campanha
    const gyaradosPool = CampaignOptions.getPool(130);
    assert.ok(gyaradosPool.length >= 1 && gyaradosPool.length <= 6);
    assert.ok(gyaradosPool.some(m => m.id === 82 && m.name === 'dragon-rage'));
  });
});
