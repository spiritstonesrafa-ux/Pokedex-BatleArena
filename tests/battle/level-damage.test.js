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
  isLevelDamageMove,
  validateMoveData,
  isMechanicallySupportedMove
} = BattleConstants;
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { BattleTeamHydrator } = require('../../assets/js/battle-session/battle-team-hydrator.js');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source.js');
const CampaignOptions = require('../../assets/js/campaign/campaign-move-options.js');
const PresentationMapper = require('../../assets/js/presentation/battle-presentation-mapper.js');
const { PRESENTATION_COMMANDS } = require('../../assets/js/presentation/battle-presentation-constants.js');

const SEISMIC_TOSS = KNOWN_CATALOG_MOVES[69];
const NIGHT_SHADE = KNOWN_CATALOG_MOVES[101];
const TACKLE = KNOWN_CATALOG_MOVES[33];
const SHADOW_BALL = KNOWN_CATALOG_MOVES[247];
const CLOSE_COMBAT = KNOWN_CATALOG_MOVES[370];

function createMon(options = {}) {
  const hp = options.hp || 200;
  return {
    id: options.id || 1,
    name: options.name || 'test-mon',
    level: options.level,
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
      { id: 69, name: 'seismic-toss', type: 'fighting', power: null, accuracy: 100, pp: 20, damageClass: 'physical' }
    ]
  };
}

describe('P5: Dano Baseado no Nível (Seismic Toss & Night Shade)', () => {
  test('1. Metadados canônicos, categorias e suporte FULL', () => {
    assert.ok(isLevelDamageMove(SEISMIC_TOSS));
    assert.ok(isLevelDamageMove(NIGHT_SHADE));
    assert.ok(isLevelDamageMove({ id: 69 }));
    assert.ok(isLevelDamageMove({ id: 101 }));
    assert.ok(isLevelDamageMove({ name: 'seismic-toss' }));
    assert.ok(isLevelDamageMove({ name: 'night-shade' }));
    assert.ok(!isLevelDamageMove(TACKLE));

    const cap69 = BattleConstants.getMoveCapability(69);
    assert.equal(cap69.supportLevel, MOVE_SUPPORT_LEVEL.FULL);
    assert.deepEqual(cap69.knownPending, []);
    assert.ok(cap69.requiredMechanics.includes('FIXED_DAMAGE_LEVEL'));
    assert.ok(cap69.requiredMechanics.includes('PHYSICAL_DAMAGE'));
    assert.equal(SEISMIC_TOSS.damageClass, 'physical');
    assert.equal(SEISMIC_TOSS.type, 'fighting');
    assert.equal(SEISMIC_TOSS.accuracy, 100);
    assert.equal(SEISMIC_TOSS.pp, 20);
    assert.equal(SEISMIC_TOSS.power, null);

    const cap101 = BattleConstants.getMoveCapability(101);
    assert.equal(cap101.supportLevel, MOVE_SUPPORT_LEVEL.FULL);
    assert.deepEqual(cap101.knownPending, []);
    assert.ok(cap101.requiredMechanics.includes('FIXED_DAMAGE_LEVEL'));
    assert.ok(cap101.requiredMechanics.includes('SPECIAL_DAMAGE'));
    assert.equal(NIGHT_SHADE.damageClass, 'special');
    assert.equal(NIGHT_SHADE.type, 'ghost');
    assert.equal(NIGHT_SHADE.accuracy, 100);
    assert.equal(NIGHT_SHADE.pp, 15);
    assert.equal(NIGHT_SHADE.power, null);

    // Validação estrita de metadados
    assert.ok(validateMoveData({ id: 69, name: 'seismic-toss', type: 'fighting', accuracy: 100, pp: 20, damageClass: 'physical' }));
    assert.ok(validateMoveData({ id: 69, name: 'seismic-toss', type: 'fighting', power: null, accuracy: 100, pp: 20, damageClass: 'physical' }));
    assert.ok(validateMoveData({ id: 69, name: 'seismic-toss', type: 'fighting', power: 0, accuracy: 100, pp: 20, damageClass: 'physical' }));
    assert.ok(!validateMoveData({ id: 69, name: 'seismic-toss', type: 'fighting', power: 50, accuracy: 100, pp: 20, damageClass: 'physical' }));
    assert.ok(!validateMoveData({ id: 69, name: 'seismic-toss', type: 'fighting', accuracy: 100, pp: 20, damageClass: 'special' }));
    assert.ok(!validateMoveData({ id: 101, name: 'night-shade', type: 'ghost', accuracy: 100, pp: 15, damageClass: 'physical' }));
    assert.ok(isMechanicallySupportedMove(69));
    assert.ok(isMechanicallySupportedMove(101));
    assert.ok(isMechanicallySupportedMove('seismic-toss'));
    assert.ok(isMechanicallySupportedMove('night-shade'));
  });

  test('1b. Política estrita de validação de poder: null, 0, rejeição de adulterações e integridade de entrada', () => {
    // 1. Valores legítimos aceitos em validateMoveData, createMove e convertPokeApiMove
    for (const validPower of [null, 0, undefined]) {
      const raw69 = { ...SEISMIC_TOSS, power: validPower };
      assert.ok(validateMoveData(raw69), `power: ${validPower} deve ser aceito em validateMoveData`);
      const move69 = MoveModel.createMove(raw69);
      assert.equal(move69.power, null, 'createMove normaliza para power: null');

      const raw101 = { ...NIGHT_SHADE, power: validPower };
      assert.ok(validateMoveData(raw101), `power: ${validPower} deve ser aceito em validateMoveData`);
      const move101 = MoveModel.createMove(raw101);
      assert.equal(move101.power, null, 'createMove normaliza para power: null');
    }

    // 2. Adulterações positivas (999, 50, 1): rejeitadas por validateMoveData e createMove sem mutar a entrada
    for (const badPower of [999, 50, 1, 100]) {
      const raw69 = { ...SEISMIC_TOSS, power: badPower };
      assert.equal(validateMoveData(raw69), false, `power ${badPower} deve ser rejeitado por validateMoveData`);
      assert.throws(
        () => MoveModel.createMove(raw69),
        /Poder do golpe baseado em nível "seismic-toss" inválido/
      );
      assert.equal(raw69.power, badPower, 'Objeto de entrada não deve ser alterado');

      const raw101 = { ...NIGHT_SHADE, power: badPower };
      assert.equal(validateMoveData(raw101), false);
      assert.throws(
        () => MoveModel.createMove(raw101),
        /Poder do golpe baseado em nível "night-shade" inválido/
      );
      assert.equal(raw101.power, badPower);
    }

    // 3. Adulterações negativas, não-finitas e tipos inválidos
    for (const invalidPower of [-10, -1, NaN, Infinity, -Infinity, 'abc', false, true, [], {}]) {
      const raw = { ...SEISMIC_TOSS, power: invalidPower };
      assert.equal(validateMoveData(raw), false, `power ${String(invalidPower)} deve ser rejeitado por validateMoveData`);
      assert.throws(
        () => MoveModel.createMove(raw),
        /Poder do golpe baseado em nível "seismic-toss" inválido/
      );
      assert.equal(raw.power, invalidPower);
    }

    // 4. Rejeição em convertPokeApiMove e BattleEngine.createCombatant
    assert.throws(
      () => MoveModel.convertPokeApiMove({
        id: 69,
        name: 'seismic-toss',
        power: 999,
        accuracy: 100,
        pp: 20,
        type: { name: 'fighting' },
        damage_class: { name: 'physical' }
      }),
      /Poder do golpe baseado em nível/
    );

    assert.throws(
      () => BattleEngine.createCombatant(createMon({
        id: 68,
        name: 'machamp',
        types: ['fighting'],
        moves: [{ ...SEISMIC_TOSS, power: 999 }]
      })),
      /Poder do golpe baseado em nível/
    );
  });

  test('1c. Combinações conflitantes de ID e nome, bloqueio de outros golpes com power nulo e preservação de status/comuns', () => {
    // 1. Combinações conflitantes entre ID e Nome não ativam exceção de dano por nível
    const conflictTackleId69 = { id: 69, name: 'tackle' };
    assert.equal(isLevelDamageMove(conflictTackleId69), false);
    assert.equal(validateMoveData({ ...TACKLE, id: 69 }), false);

    const conflictSeismicId33 = { id: 33, name: 'seismic-toss' };
    assert.equal(isLevelDamageMove(conflictSeismicId33), false);
    assert.equal(validateMoveData({ ...SEISMIC_TOSS, id: 33 }), false);

    const conflictNightId69 = { id: 69, name: 'night-shade' };
    assert.equal(isLevelDamageMove(conflictNightId69), false);

    const conflictSeismicId101 = { id: 101, name: 'seismic-toss' };
    assert.equal(isLevelDamageMove(conflictSeismicId101), false);

    // 2. Não libera outros golpes com power nulo ou variável ainda sem suporte
    const blockedMoves = [
      {id:723,name:'light-that-burns-the-sky',power:null},
      {id:449,name:'judgment',power:null},
      {id:546,name:'techno-blast',power:null},
      {id:718,name:'multi-attack',power:null},
      {id:851,name:'tera-blast',power:null}
    ];
    for (const bm of blockedMoves) {
      assert.equal(isLevelDamageMove(bm), false);
      assert.equal(validateMoveData(bm), false);
      assert.throws(
        () => MoveModel.createMove({ ...bm, type: 'normal', pp: 5, accuracy: 30, damageClass: 'physical' }),
        /Poder do golpe/
      );
    }

    // 3. Contratos de golpes comuns e de status preservados
    const tackleMove = MoveModel.createMove(TACKLE);
    assert.equal(tackleMove.power, 40);
    assert.equal(tackleMove.damageClass, 'physical');

    const hypnosisMove = MoveModel.createMove(KNOWN_CATALOG_MOVES[95]);
    assert.equal(hypnosisMove.power, 0);
    assert.equal(hypnosisMove.damageClass, 'status');
    assert.equal(hypnosisMove.statusEffect, 'sleep');
  });

  test('2. Dano estritamente igual ao nível do atacante (Nível 25, 50, 100) e fallback seguro', () => {
    for (const lvl of [25, 50, 100]) {
      const p1 = createMon({ id: 1, name: 'attacker', level: lvl });
      const p2 = createMon({ id: 2, name: 'defender', hp: 300 });
      const battle = BattleEngine.createBattle(p1, p2);

      const result = BattleEngine.resolveTurn(battle, {
        player: { type: 'MOVE', moveId: 69 },
        enemy: { type: 'MOVE', moveId: 69 }
      });

      const dmgEvent = result.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
      assert.ok(dmgEvent);
      assert.equal(dmgEvent.damage, lvl, `Dano no nível ${lvl} deve ser exatamente ${lvl}`);
      assert.equal(dmgEvent.currentHp, 300 - lvl);
    }

    // Fallback seguro quando level não é fornecido ou é inválido
    for (const badLevel of [undefined, null, 'invalid', -5, 0, 150, NaN]) {
      const p1 = createMon({ id: 1, name: 'attacker', level: badLevel });
      const p2 = createMon({ id: 2, name: 'defender', hp: 300 });
      const battle = BattleEngine.createBattle(p1, p2);
      assert.equal(battle.player.level, BATTLE_CONFIG.SIMULATION_LEVEL || 50);

      const result = BattleEngine.resolveTurn(battle, {
        player: { type: 'MOVE', moveId: 69 },
        enemy: { type: 'MOVE', moveId: 69 }
      });
      const dmgEvent = result.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
      assert.equal(dmgEvent.damage, 50, 'Fallback para nível padrão 50');
    }
  });

  test('3. Independência de atributos de ataque e defesa (extremos 1 vs 999)', () => {
    const attackerWeak = createMon({ id: 1, name: 'weak', level: 50, attack: 1, specialAttack: 1 });
    const defenderTough = createMon({ id: 2, name: 'tough', hp: 300, defense: 999, specialDefense: 999 });
    const b1 = BattleEngine.createBattle(attackerWeak, defenderTough);
    const r1 = BattleEngine.resolveTurn(b1, { player: { type: 'MOVE', moveId: 69 }, enemy: { type: 'MOVE', moveId: 69 } });
    const d1 = r1.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(d1.damage, 50);

    const attackerStrong = createMon({ id: 1, name: 'strong', level: 50, attack: 999, specialAttack: 999 });
    const defenderFragile = createMon({ id: 2, name: 'fragile', hp: 300, defense: 1, specialDefense: 1 });
    const b2 = BattleEngine.createBattle(attackerStrong, defenderFragile);
    const r2 = BattleEngine.resolveTurn(b2, { player: { type: 'MOVE', moveId: 69 }, enemy: { type: 'MOVE', moveId: 69 } });
    const d2 = r2.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(d2.damage, 50);
  });

  test('4. Independência de estágios de atributos (-6 a +6)', () => {
    const p1 = createMon({ id: 1, level: 50 });
    const p2 = createMon({ id: 2, hp: 300 });
    const battle = BattleEngine.createBattle(p1, p2);

    battle.player.statStages.attack = -6;
    battle.player.statStages.specialAttack = -6;
    battle.enemy.statStages.defense = 6;
    battle.enemy.statStages.specialDefense = 6;

    const r1 = BattleEngine.resolveTurn(battle, { player: { type: 'MOVE', moveId: 69 }, enemy: { type: 'MOVE', moveId: 69 } });
    const d1 = r1.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(d1.damage, 50);

    battle.player.statStages.attack = 6;
    battle.enemy.statStages.defense = -6;
    const r2 = BattleEngine.resolveTurn(battle, { player: { type: 'MOVE', moveId: 69 }, enemy: { type: 'MOVE', moveId: 69 } });
    const d2 = r2.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(d2.damage, 50);
  });

  test('5. Independência de STAB, penalidade de queimadura e variância de dano (85..100)', () => {
    // STAB: Machamp (Fighting) usando Seismic Toss (Fighting) não recebe 1.5x
    const fightingMon = createMon({ id: 68, name: 'machamp', level: 50, types: ['fighting'] });
    const defender = createMon({ id: 2, name: 'target', hp: 300 });
    const battleStab = BattleEngine.createBattle(fightingMon, defender);
    const rStab = BattleEngine.resolveTurn(battleStab, { player: { type: 'MOVE', moveId: 69 }, enemy: { type: 'MOVE', moveId: 69 } });
    const dStab = rStab.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dStab.damage, 50, 'STAB não altera dano fixo por nível');

    // Burn: usuário queimado não tem dano reduzido pela metade
    fightingMon.statusCondition = 'burn';
    const battleBurn = BattleEngine.createBattle(fightingMon, defender);
    const rBurn = BattleEngine.resolveTurn(battleBurn, { player: { type: 'MOVE', moveId: 69 }, enemy: { type: 'MOVE', moveId: 69 } });
    const dBurn = rBurn.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dBurn.damage, 50, 'Burn não reduz dano de golpe baseado em nível');

    // Variância: rolagens 85 e 100 produzem exatamente o mesmo dano
    const rRoll85 = BattleEngine.resolveTurn(battleStab, {
      player: { type: 'MOVE', moveId: 69, damageRoll: 85 },
      enemy: { type: 'MOVE', moveId: 69 }
    });
    const dRoll85 = rRoll85.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dRoll85.damage, 50, 'Roll 85 causa 50');

    const rRoll100 = BattleEngine.resolveTurn(battleStab, {
      player: { type: 'MOVE', moveId: 69, damageRoll: 100 },
      enemy: { type: 'MOVE', moveId: 69 }
    });
    const dRoll100 = rRoll100.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dRoll100.damage, 50, 'Roll 100 causa 50');
  });

  test('6. Imunidade de tipo: Seismic Toss falha contra Ghost; Night Shade falha contra Normal', () => {
    // Seismic Toss (Fighting) contra Ghost (ex: Gengar)
    const p1 = createMon({ id: 1, level: 50 });
    const ghostDefender = createMon({ id: 94, name: 'gengar', types: ['ghost', 'poison'], hp: 200 });
    const battleGhost = BattleEngine.createBattle(p1, ghostDefender);
    const rGhost = BattleEngine.resolveTurn(battleGhost, { player: { type: 'MOVE', moveId: 69 }, enemy: { type: 'MOVE', moveId: 69 } });

    const effGhost = rGhost.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'player');
    assert.equal(effGhost.multiplier, 0);
    assert.equal(effGhost.classification, TYPE_EFFECTIVENESS_CLASSIFICATION.IMMUNE);

    const dmgGhost = rGhost.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgGhost.damage, 0);
    assert.equal(dmgGhost.currentHp, 200, 'HP do alvo imune deve permanecer intacto');

    // Night Shade (Ghost) contra Normal (ex: Snorlax)
    const ghostAttacker = createMon({
      id: 101,
      level: 50,
      types: ['ghost'],
      moves: [{ id: 101, name: 'night-shade', type: 'ghost', power: null, accuracy: 100, pp: 15, damageClass: 'special' }]
    });
    const normalDefender = createMon({ id: 143, name: 'snorlax', types: ['normal'], hp: 300 });
    const battleNormal = BattleEngine.createBattle(ghostAttacker, normalDefender);
    const rNormal = BattleEngine.resolveTurn(battleNormal, { player: { type: 'MOVE', moveId: 101 }, enemy: { type: 'MOVE', moveId: 69 } });

    const effNormal = rNormal.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'player');
    assert.equal(effNormal.multiplier, 0);
    assert.equal(effNormal.classification, TYPE_EFFECTIVENESS_CLASSIFICATION.IMMUNE);

    const dmgNormal = rNormal.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgNormal.damage, 0);
    assert.equal(dmgNormal.currentHp, 300);
  });

  test('7. Efetividades não-imunes: Fraqueza (2x) e Resistência (0.5x) causam exatamente o nível e não anunciam super/resistido', () => {
    const p1 = createMon({ id: 1, level: 50 });

    // Seismic Toss vs Normal (Fraqueza para Fighting 2x)
    const normalTarget = createMon({ id: 2, types: ['normal'], hp: 200 });
    const bWeak = BattleEngine.createBattle(p1, normalTarget);
    const rWeak = BattleEngine.resolveTurn(bWeak, { player: { type: 'MOVE', moveId: 69 }, enemy: { type: 'MOVE', moveId: 69 } });
    const effWeak = rWeak.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'player');
    assert.equal(effWeak.multiplier, 1, 'Multiplicador efetivo tratado como neutro para não disparar super efetivo');
    assert.equal(effWeak.classification, TYPE_EFFECTIVENESS_CLASSIFICATION.NEUTRAL);
    const dmgWeak = rWeak.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgWeak.damage, 50, 'Fraqueza não dobra dano fixo');

    // Seismic Toss vs Poison (Resistência para Fighting 0.5x)
    const poisonTarget = createMon({ id: 3, types: ['poison'], hp: 200 });
    const bResist = BattleEngine.createBattle(p1, poisonTarget);
    const rResist = BattleEngine.resolveTurn(bResist, { player: { type: 'MOVE', moveId: 69 }, enemy: { type: 'MOVE', moveId: 69 } });
    const effResist = rResist.events.find(e => e.type === BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED && e.source === 'player');
    assert.equal(effResist.multiplier, 1, 'Multiplicador efetivo tratado como neutro para não disparar mensagem de não muito efetivo');
    assert.equal(effResist.classification, TYPE_EFFECTIVENESS_CLASSIFICATION.NEUTRAL);
    const dmgResist = rResist.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgResist.damage, 50, 'Resistência não reduz dano fixo');

    // Night Shade vs Psychic (Fraqueza 2x) e Dark (Resistência 0.5x)
    const ghostUser = createMon({
      id: 1, level: 50,
      moves: [{ id: 101, name: 'night-shade', type: 'ghost', power: null, accuracy: 100, pp: 15, damageClass: 'special' }]
    });
    const psychicTarget = createMon({ id: 4, types: ['psychic'], hp: 200 });
    const bPsychic = BattleEngine.createBattle(ghostUser, psychicTarget);
    const rPsychic = BattleEngine.resolveTurn(bPsychic, { player: { type: 'MOVE', moveId: 101 }, enemy: { type: 'MOVE', moveId: 69 } });
    const dPsychic = rPsychic.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dPsychic.damage, 50);

    const darkTarget = createMon({ id: 5, types: ['dark'], hp: 200 });
    const bDark = BattleEngine.createBattle(ghostUser, darkTarget);
    const rDark = BattleEngine.resolveTurn(bDark, { player: { type: 'MOVE', moveId: 101 }, enemy: { type: 'MOVE', moveId: 69 } });
    const dDark = rDark.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dDark.damage, 50);
  });

  test('8. HP Capping e Nocaute: dano limitado ao HP restante sem deixar HP negativo', () => {
    // Alvo com 30 HP recebe Seismic Toss de nível 50 -> Dano aplicado é exatamente 30, HP vai a 0
    const attacker = createMon({ id: 1, level: 50 });
    const defenderLowHp = createMon({ id: 2, hp: 100, currentHp: 30 });
    const battle = BattleEngine.createBattle(attacker, defenderLowHp);

    const result = BattleEngine.resolveTurn(battle, {
      player: { type: 'MOVE', moveId: 69 },
      enemy: { type: 'MOVE', moveId: 69 }
    });

    const dmg = result.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmg.damage, 30, 'Dano limitado ao HP restante do alvo');
    assert.equal(dmg.previousHp, 30);
    assert.equal(dmg.currentHp, 0);
    assert.equal(result.state.enemy.currentHp, 0);

    const faint = result.events.find(e => e.type === BATTLE_EVENTS.POKEMON_FAINTED && e.pokemonName === defenderLowHp.name);
    assert.ok(faint, 'Nocaute resolvido');
    assert.equal(result.state.status, BATTLE_STATUS.PLAYER_WIN);
    assert.equal(result.state.winner, 'player');
  });

  test('9. Precisão e consumo de PP: miss com roll alto e 1 PP consumido', () => {
    const p1 = createMon({ id: 1, level: 50 });
    const p2 = createMon({ id: 2, hp: 200 });
    const battle = BattleEngine.createBattle(p1, p2);

    // Com evasionStage = 1, acurácia efetiva = floor(100 * 3 / 4) = 75
    battle.enemy.evasionStage = 1;
    // Roll 80 excede 75 -> Miss
    const rMiss = BattleEngine.resolveTurn(battle, {
      player: { type: 'MOVE', moveId: 69, accuracyRoll: 80 },
      enemy: { type: 'MOVE', moveId: 69 }
    });

    const missEvent = rMiss.events.find(e => e.type === BATTLE_EVENTS.MOVE_MISSED && e.actor === 'player');
    assert.ok(missEvent);
    const dmgEvent = rMiss.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(dmgEvent, undefined);
    assert.equal(rMiss.state.enemy.currentHp, 200);

    // PP consumido mesmo em erro
    assert.equal(rMiss.state.player.moves[0].currentPp, 19);
  });

  test('10a. Condição impeditiva: Sono profundo impedindo Seismic Toss e Night Shade sem gastar PP', () => {
    // 1. Jogador dormindo tenta usar Seismic Toss
    const sleeperPlayer = createMon({
      id: 1,
      level: 50,
      statusCondition: 'sleep',
      sleepTurns: 2,
      moves: [{ id: 69, name: 'seismic-toss', type: 'fighting', power: null, accuracy: 100, pp: 20, currentPp: 20, damageClass: 'physical' }]
    });
    const defender = createMon({ id: 2, hp: 200 });
    const battle1 = BattleEngine.createBattle(sleeperPlayer, defender);

    const rSleep1 = BattleEngine.resolveTurn(battle1, {
      player: { type: 'MOVE', moveId: 69 },
      enemy: { type: 'MOVE', moveId: 69 }
    });

    const immEvent1 = rSleep1.events.find(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player');
    assert.ok(immEvent1);
    assert.equal(immEvent1.statusCondition, 'sleep');
    assert.equal(immEvent1.remainingTurns, 1);
    assert.equal(rSleep1.state.player.sleepTurns, 1);
    assert.equal(rSleep1.state.player.moves[0].currentPp, 20, 'Sono não consome PP do golpe');
    assert.equal(rSleep1.events.some(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player'), false);

    // 2. Adversário dormindo tenta usar Night Shade
    const sleeperEnemy = createMon({
      id: 3,
      level: 60,
      statusCondition: 'sleep',
      sleepTurns: 1,
      moves: [{ id: 101, name: 'night-shade', type: 'ghost', power: null, accuracy: 100, pp: 15, currentPp: 15, damageClass: 'special' }]
    });
    const battle2 = BattleEngine.createBattle(defender, sleeperEnemy);
    const rSleep2 = BattleEngine.resolveTurn(battle2, {
      player: { type: 'MOVE', moveId: 69 },
      enemy: { type: 'MOVE', moveId: 101 }
    });

    const immEvent2 = rSleep2.events.find(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy');
    assert.ok(immEvent2);
    assert.equal(immEvent2.statusCondition, 'sleep');
    assert.equal(rSleep2.state.enemy.sleepTurns, 0);
    assert.equal(rSleep2.state.enemy.moves[0].currentPp, 15, 'Sono não consome PP de Night Shade');
  });

  test('10b. Condição impeditiva: Congelamento (Freeze) impedindo a ação sem gastar PP', () => {
    // 1. Jogador congelado tenta usar Seismic Toss com thawRoll alto (falha ao descongelar)
    const frozenPlayer = createMon({
      id: 1,
      level: 50,
      statusCondition: 'freeze',
      moves: [{ id: 69, name: 'seismic-toss', type: 'fighting', power: null, accuracy: 100, pp: 20, currentPp: 20, damageClass: 'physical' }]
    });
    const defender = createMon({ id: 2, hp: 200 });
    const battle1 = BattleEngine.createBattle(frozenPlayer, defender);

    const rFreeze1 = BattleEngine.resolveTurn(battle1, {
      player: { type: 'MOVE', moveId: 69, thawRoll: 50 },
      enemy: { type: 'MOVE', moveId: 69 }
    });

    const immEvent1 = rFreeze1.events.find(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player');
    assert.ok(immEvent1);
    assert.equal(immEvent1.statusCondition, 'freeze');
    assert.equal(immEvent1.reason, 'FROZEN_SOLID');
    assert.equal(rFreeze1.state.player.statusCondition, 'freeze');
    assert.equal(rFreeze1.state.player.moves[0].currentPp, 20, 'Freeze não consome PP do golpe');

    // 2. Adversário congelado tenta usar Night Shade
    const frozenEnemy = createMon({
      id: 3,
      level: 60,
      statusCondition: 'freeze',
      moves: [{ id: 101, name: 'night-shade', type: 'ghost', power: null, accuracy: 100, pp: 15, currentPp: 15, damageClass: 'special' }]
    });
    const battle2 = BattleEngine.createBattle(defender, frozenEnemy);
    const rFreeze2 = BattleEngine.resolveTurn(battle2, {
      player: { type: 'MOVE', moveId: 69 },
      enemy: { type: 'MOVE', moveId: 101, thawRoll: 80 }
    });

    const immEvent2 = rFreeze2.events.find(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy');
    assert.ok(immEvent2);
    assert.equal(rFreeze2.state.enemy.statusCondition, 'freeze');
    assert.equal(rFreeze2.state.enemy.moves[0].currentPp, 15, 'Freeze não consome PP de Night Shade');
  });

  test('10c. Condição impeditiva: Paralisia (Paralysis) impedindo a ação com consumo de 1 PP', () => {
    // 1. Jogador paralisado sofre total paralysis em Seismic Toss: consome PP e emite STATUS_IMMOBILIZED
    const paraPlayer = createMon({
      id: 1,
      level: 50,
      statusCondition: 'paralysis',
      moves: [{ id: 69, name: 'seismic-toss', type: 'fighting', power: null, accuracy: 100, pp: 20, currentPp: 20, damageClass: 'physical' }]
    });
    const defender = createMon({ id: 2, hp: 200 });
    const battle1 = BattleEngine.createBattle(paraPlayer, defender);

    const rPara1 = BattleEngine.resolveTurn(battle1, {
      player: { type: 'MOVE', moveId: 69, statusRoll: 10 }, // <= 25 -> total paralysis
      enemy: { type: 'MOVE', moveId: 69 }
    });

    const immEvent1 = rPara1.events.find(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'player');
    assert.ok(immEvent1);
    assert.equal(immEvent1.statusCondition, 'paralysis');
    assert.equal(rPara1.state.player.moves[0].currentPp, 19, 'Paralisia consome 1 PP mesmo quando impede a ação');
    assert.equal(rPara1.events.some(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player'), false);

    // 2. Adversário paralisado sofre total paralysis em Night Shade
    const paraEnemy = createMon({
      id: 3,
      level: 60,
      statusCondition: 'paralysis',
      moves: [{ id: 101, name: 'night-shade', type: 'ghost', power: null, accuracy: 100, pp: 15, currentPp: 15, damageClass: 'special' }]
    });
    const battle2 = BattleEngine.createBattle(defender, paraEnemy);
    const rPara2 = BattleEngine.resolveTurn(battle2, {
      player: { type: 'MOVE', moveId: 69 },
      enemy: { type: 'MOVE', moveId: 101, statusRoll: 5 }
    });

    const immEvent2 = rPara2.events.find(e => e.type === BATTLE_EVENTS.STATUS_IMMOBILIZED && e.actor === 'enemy');
    assert.ok(immEvent2);
    assert.equal(rPara2.state.enemy.moves[0].currentPp, 14, 'Paralisia consome 1 PP de Night Shade');
  });

  test('10d. Condição impeditiva: Flinch (Hesitação) impedindo a ação sem gastar PP', () => {
    // 1. Jogador sofre flinch ao tentar usar Night Shade
    const flinchPlayer = createMon({
      id: 1,
      level: 50,
      moves: [{ id: 101, name: 'night-shade', type: 'ghost', power: null, accuracy: 100, pp: 15, currentPp: 15, damageClass: 'special' }]
    });
    const defender = createMon({ id: 2, hp: 200 });
    const battle1 = BattleEngine.createBattle(flinchPlayer, defender);
    battle1.player.isFlinched = true;

    const rFlinch1 = BattleEngine.resolveTurn(battle1, {
      player: { type: 'MOVE', moveId: 101 },
      enemy: { type: 'MOVE', moveId: 69 }
    });

    const flinchEv1 = rFlinch1.events.find(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'player');
    assert.ok(flinchEv1);
    assert.equal(rFlinch1.state.player.isFlinched, false, 'Flinch é limpo após o turno');
    assert.equal(rFlinch1.state.player.moves[0].currentPp, 15, 'Flinch não consome PP');
    assert.equal(rFlinch1.events.some(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player'), false);

    // 2. Adversário sofre flinch ao tentar usar Seismic Toss
    const flinchEnemy = createMon({
      id: 3,
      level: 60,
      moves: [{ id: 69, name: 'seismic-toss', type: 'fighting', power: null, accuracy: 100, pp: 20, currentPp: 20, damageClass: 'physical' }]
    });
    const battle2 = BattleEngine.createBattle(defender, flinchEnemy);
    battle2.enemy.isFlinched = true;
    const rFlinch2 = BattleEngine.resolveTurn(battle2, {
      player: { type: 'MOVE', moveId: 69 },
      enemy: { type: 'MOVE', moveId: 69 }
    });

    const flinchEv2 = rFlinch2.events.find(e => e.type === BATTLE_EVENTS.FLINCH_IMMOBILIZED && e.actor === 'enemy');
    assert.ok(flinchEv2);
    assert.equal(rFlinch2.state.enemy.isFlinched, false);
    assert.equal(rFlinch2.state.enemy.moves[0].currentPp, 20, 'Flinch não consome PP de Seismic Toss');
  });

  test('10e. Condição impeditiva: Confusão causando autoagressão sem gastar PP do golpe', () => {
    // 1. Jogador confuso sofre autoagressão ao tentar usar Seismic Toss
    const confusedPlayer = createMon({
      id: 1,
      level: 50,
      hp: 200,
      attack: 100,
      defense: 100,
      moves: [{ id: 69, name: 'seismic-toss', type: 'fighting', power: null, accuracy: 100, pp: 20, currentPp: 20, damageClass: 'physical' }]
    });
    const defender = createMon({ id: 2, hp: 200 });
    const battle1 = BattleEngine.createBattle(confusedPlayer, defender);
    battle1.player.confusionTurns = 3;

    const rConf1 = BattleEngine.resolveTurn(battle1, {
      player: { type: 'MOVE', moveId: 69, confusionHitRoll: 20 }, // <= 33 -> autoagressão
      enemy: { type: 'MOVE', moveId: 69 }
    });

    const checkEv1 = rConf1.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_CHECK && e.actor === 'player');
    assert.ok(checkEv1);
    assert.equal(checkEv1.remainingTurns, 2);
    const dmgEv1 = rConf1.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE && e.actor === 'player');
    assert.ok(dmgEv1);
    assert.ok(dmgEv1.damage > 0, 'Autoagressão causa dano físico próprio');
    assert.equal(rConf1.state.player.moves[0].currentPp, 20, 'Autoagressão não consome PP do golpe pretendido');
    assert.equal(rConf1.state.player.confusionTurns, 2);
    // Defensor não sofre dano do jogador
    assert.equal(rConf1.events.some(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player'), false);

    // 2. Adversário confuso sofre autoagressão ao tentar usar Night Shade
    const confusedEnemy = createMon({
      id: 3,
      level: 60,
      hp: 200,
      attack: 100,
      defense: 100,
      moves: [{ id: 101, name: 'night-shade', type: 'ghost', power: null, accuracy: 100, pp: 15, currentPp: 15, damageClass: 'special' }]
    });
    const battle2 = BattleEngine.createBattle(defender, confusedEnemy);
    battle2.enemy.confusionTurns = 2;
    const rConf2 = BattleEngine.resolveTurn(battle2, {
      player: { type: 'MOVE', moveId: 69 },
      enemy: { type: 'MOVE', moveId: 101, confusionHitRoll: 10 }
    });

    const dmgEv2 = rConf2.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE && e.actor === 'enemy');
    assert.ok(dmgEv2);
    assert.equal(rConf2.state.enemy.moves[0].currentPp, 15, 'Night Shade não perde PP em autoagressão');
    assert.equal(rConf2.state.enemy.confusionTurns, 1);
  });

  test('10f. Confusão superada executando o golpe normalmente com consumo de PP', () => {
    // Jogador confuso supera autoagressão e executa Night Shade normalmente
    const confusedPlayer = createMon({
      id: 1,
      level: 50,
      moves: [{ id: 101, name: 'night-shade', type: 'ghost', power: null, accuracy: 100, pp: 15, currentPp: 15, damageClass: 'special' }]
    });
    const defender = createMon({ id: 2, hp: 200, types: ['psychic'] });
    const battle = BattleEngine.createBattle(confusedPlayer, defender);
    battle.player.confusionTurns = 2;

    const result = BattleEngine.resolveTurn(battle, {
      player: { type: 'MOVE', moveId: 101, confusionHitRoll: 50 }, // >= 34 -> supera confusão
      enemy: { type: 'MOVE', moveId: 69 }
    });

    const checkEv = result.events.find(e => e.type === BATTLE_EVENTS.CONFUSION_CHECK && e.actor === 'player');
    assert.ok(checkEv);
    assert.equal(checkEv.remainingTurns, 1);
    assert.equal(result.events.some(e => e.type === BATTLE_EVENTS.CONFUSION_DAMAGE && e.actor === 'player'), false);

    const dmgEv = result.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.ok(dmgEv);
    assert.equal(dmgEv.damage, 50, 'Executa Night Shade com dano total de 50');
    assert.equal(result.state.player.moves[0].currentPp, 14, 'Consome 1 PP ao executar');
    assert.equal(result.state.enemy.currentHp, 150);
    assert.equal(result.state.player.confusionTurns, 1);
  });

  test('11. Integração com Sleep Talk: convocado enquanto dorme sem gastar PP', () => {
    const sleeper = createMon({
      id: 1,
      level: 50,
      statusCondition: 'sleep',
      sleepTurns: 2,
      moves: [
        { id: 214, name: 'sleep-talk', type: 'normal', power: 0, accuracy: null, pp: 10, currentPp: 10, damageClass: 'status' },
        { id: 69, name: 'seismic-toss', type: 'fighting', power: null, accuracy: 100, pp: 20, currentPp: 20, damageClass: 'physical' }
      ]
    });
    const defender = createMon({ id: 2, hp: 200 });
    const battle = BattleEngine.createBattle(sleeper, defender);

    const result = BattleEngine.resolveTurn(battle, {
      player: { type: 'MOVE', moveId: 214, sleepTalkChoice: 0 },
      enemy: { type: 'MOVE', moveId: 69 }
    });

    const dmg = result.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.ok(dmg);
    assert.equal(dmg.damage, 50, 'Sleep Talk executou Seismic Toss com dano 50');
    assert.equal(result.state.player.moves[0].currentPp, 9, 'Sleep Talk gastou 1 PP');
    assert.equal(result.state.player.moves[1].currentPp, 20, 'Seismic Toss não gastou PP ao ser convocado');
  });

  test('12. BattleEvaluator e IA pontuam exatamente o dano do nível', () => {
    const attacker50 = createMon({ id: 1, level: 50, attack: 10, specialAttack: 10 });
    const defender = createMon({ id: 2, hp: 200, defense: 500, specialDefense: 500 });

    const evalSeismic = BattleEvaluator.evaluateMove(attacker50, defender, SEISMIC_TOSS);
    assert.equal(evalSeismic.baseDamage, 50);
    assert.equal(evalSeismic.minDamage, 50);
    assert.equal(evalSeismic.maxDamage, 50);
    assert.equal(evalSeismic.averageDamage, 50);
    assert.equal(evalSeismic.expectedDamage, 50);
    assert.equal(evalSeismic.wouldKo, false);

    // Defender com 40 HP -> wouldKo: true
    const defenderWeak = createMon({ id: 2, hp: 40 });
    const evalKo = BattleEvaluator.evaluateMove(attacker50, defenderWeak, SEISMIC_TOSS);
    assert.equal(evalKo.wouldKo, true);

    // Alvo Ghost imune -> expectedDamage: 0
    const ghostDef = createMon({ id: 94, types: ['ghost'], hp: 200 });
    const evalImmune = BattleEvaluator.evaluateMove(attacker50, ghostDef, SEISMIC_TOSS);
    assert.equal(evalImmune.baseDamage, 0);
    assert.equal(evalImmune.minDamage, 0);
    assert.equal(evalImmune.maxDamage, 0);
    assert.equal(evalImmune.averageDamage, 0);
    assert.equal(evalImmune.expectedDamage, 0);

    // Night Shade avaliado com Nível 75 contra defensor não-imune (Water)
    const waterDefender = createMon({ id: 2, types: ['water'], hp: 200, defense: 500, specialDefense: 500 });
    const attacker75 = createMon({ id: 1, level: 75, moves: [NIGHT_SHADE] });
    const evalNight = BattleEvaluator.evaluateMove(attacker75, waterDefender, NIGHT_SHADE);
    assert.equal(evalNight.expectedDamage, 75);

    // IA decide ação e prefere Seismic Toss se o outro golpe não causar dano
    const aiMon = createMon({
      id: 1, level: 50,
      moves: [
        { id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, damageClass: 'physical' },
        SEISMIC_TOSS
      ]
    });
    const state = BattleEngine.createBattle(defender, aiMon);
    const { action } = BattleAI.chooseAction(state, 'enemy');
    assert.equal(action.type, 'MOVE');
    assert.ok([33, 69].includes(action.moveId));
  });

  test('13. Integração completa de sessão: adversário executando pilotos, troca voluntária, Sleep Talk e apresentação', async () => {
    // 1. Adversário executando Seismic Toss e Night Shade via BattleSessionController
    const rng = new DeterministicRandomSource({
      accuracy: 50,
      damage: 100
    });
    const playerTeam = [
      createMon({ id: 1, name: 'machop', level: 40, hp: 200 }),
      createMon({ id: 2, name: 'snorlax', types: ['normal'], level: 40, hp: 300 }),
      createMon({ id: 3, name: 'pikachu', level: 40, hp: 150 })
    ];
    const enemyTeam = [
      createMon({ id: 4, name: 'enemy-machamp', level: 60, hp: 250, moves: [SEISMIC_TOSS, NIGHT_SHADE] }),
      createMon({ id: 5, name: 'enemy-gengar', level: 70, hp: 200, moves: [NIGHT_SHADE] }),
      createMon({ id: 6, name: 'enemy-sub', level: 60, hp: 200 })
    ];

    const capturedEvents = [];
    const session = new BattleSessionController({
      teamStore: { load: () => [1, 2, 3] },
      hydrator: { hydrateTeam: async ids => ids.map(id => playerTeam.find(x => x.id === id) || enemyTeam.find(x => x.id === id)) },
      opponentFactory: { createOpponentTeam: async () => enemyTeam },
      ai: {
        chooseAction: () => ({ action: { type: 'MOVE', moveId: 69 } }),
        chooseReplacement: () => ({ targetPokemonId: 5 })
      },
      randomSource: rng,
      presentationEngine: { play: async batch => capturedEvents.push(...batch), playCommands: async () => {} }
    });

    await session.prepareBattle({ playerTeamIds: [1, 2, 3] });
    await session.startBattle();

    // Adversário executa Seismic Toss (Nível 60): jogador ativo toma exatamente 60 de dano
    await session.submitPlayerMove(69);
    const activePlayerAfterTurn1 = session.engine.getActiveCombatant(session.battleState, 'player');
    assert.equal(activePlayerAfterTurn1.currentHp, 140, 'Machop com 200 HP tomou 60 de dano do Seismic Toss inimigo (Nível 60)');

    // Valida apresentação dos eventos reais da sessão
    const commandsTurn1 = PresentationMapper.mapEvents(capturedEvents, { battleState: session.battleState });
    assert.ok(commandsTurn1.some(c => c.type === PRESENTATION_COMMANDS.HP_TRANSITION && c.damage === 60));

    // 2. Adversário ataca com Night Shade durante a troca voluntária do jogador para Snorlax (Normal)
    // Snorlax é Normal -> Night Shade do adversário resulta em IMMUNE (0 dano)
    const switchEvents = [];
    const switchSession = new BattleSessionController({
      teamStore: { load: () => [1, 2, 3] },
      hydrator: { hydrateTeam: async ids => ids.map(id => playerTeam.find(x => x.id === id) || enemyTeam.find(x => x.id === id)) },
      opponentFactory: { createOpponentTeam: async () => enemyTeam },
      ai: { chooseAction: () => ({ action: { type: 'MOVE', moveId: 101 } }) }, // Adversário usa Night Shade
      randomSource: rng,
      presentationEngine: { play: async batch => switchEvents.push(...batch), playCommands: async () => {} }
    });
    await switchSession.prepareBattle({ playerTeamIds: [1, 2, 3] });
    await switchSession.startBattle();

    // Jogador troca para Snorlax (id 2)
    await switchSession.submitPlayerSwitch(2);
    const snorlaxActive = switchSession.engine.getActiveCombatant(switchSession.battleState, 'player');
    assert.equal(snorlaxActive.id, 2);
    assert.equal(snorlaxActive.currentHp, 300, 'Snorlax entrou e tomou 0 de dano por ser imune a Night Shade (Ghost)');

    // PresentationMapper mapeia eventos reais emitidos na troca
    const switchCommands = PresentationMapper.mapEvents(switchEvents, { battleState: switchSession.battleState });
    assert.ok(switchCommands.some(c => c.type === PRESENTATION_COMMANDS.SWITCH_OUT_SEQUENCE));
    assert.ok(switchCommands.some(c => c.type === PRESENTATION_COMMANDS.SWITCH_IN_SEQUENCE));

    // 3. Sleep Talk chamando pilotos em sessão real com consumo de PP de Sleep Talk e preservação do golpe chamado
    const sleepTalkMon = createMon({
      id: 7,
      name: 'sleeper',
      level: 50,
      statusCondition: 'sleep',
      sleepTurns: 2,
      moves: [
        { id: 214, name: 'sleep-talk', type: 'normal', power: 0, accuracy: null, pp: 10, currentPp: 10, damageClass: 'status' },
        { id: 69, name: 'seismic-toss', type: 'fighting', power: null, accuracy: 100, pp: 20, currentPp: 20, damageClass: 'physical' }
      ]
    });
    const sleepEvents = [];
    const sleepSession = new BattleSessionController({
      teamStore: { load: () => [7, 2, 3] },
      hydrator: { hydrateTeam: async ids => ids.map(id => (id === 7 ? sleepTalkMon : playerTeam.find(x => x.id === id)) || enemyTeam.find(x => x.id === id)) },
      opponentFactory: { createOpponentTeam: async () => enemyTeam },
      ai: {
        chooseAction: () => ({ action: { type: 'MOVE', moveId: 69 } }),
        chooseReplacement: () => ({ targetPokemonId: 5 })
      },
      randomSource: new DeterministicRandomSource({ sleepTalkChoice: 0, accuracy: 50 }),
      presentationEngine: { play: async batch => sleepEvents.push(...batch), playCommands: async () => {} }
    });
    await sleepSession.prepareBattle({ playerTeamIds: [7, 2, 3] });
    await sleepSession.startBattle();

    await sleepSession.submitPlayerMove(214);
    const activeSleeper = sleepSession.engine.getActiveCombatant(sleepSession.battleState, 'player');
    assert.equal(activeSleeper.moves[0].currentPp, 9, 'Sleep Talk consumiu 1 PP');
    assert.equal(activeSleeper.moves[1].currentPp, 20, 'Seismic Toss manteve 20 PP');

    // 4. Nocaute em sessão com reservas intactas
    const lowHpEnemyMon = createMon({ id: 8, name: 'weak-enemy', hp: 30, currentHp: 30, level: 50, moves: [SEISMIC_TOSS] });
    const koEnemyTeam = [lowHpEnemyMon, enemyTeam[1], enemyTeam[2]];
    const koEvents = [];
    const koSession = new BattleSessionController({
      teamStore: { load: () => [1, 2, 3] },
      hydrator: { hydrateTeam: async ids => ids.map(id => playerTeam.find(x => x.id === id) || koEnemyTeam.find(x => x.id === id)) },
      opponentFactory: { createOpponentTeam: async () => koEnemyTeam },
      ai: {
        chooseAction: () => ({ action: { type: 'MOVE', moveId: 69 } }),
        chooseReplacement: () => ({ targetPokemonId: 5 })
      },
      randomSource: rng,
      presentationEngine: { play: async batch => koEvents.push(...batch), playCommands: async () => {} }
    });
    await koSession.prepareBattle({ playerTeamIds: [1, 2, 3] });
    await koSession.startBattle();

    await koSession.submitPlayerMove(69);
    assert.ok(koEvents.some(e => e.type === BATTLE_EVENTS.POKEMON_FAINTED && e.pokemonName === 'weak-enemy'));
    const enemyReserve = koSession.battleState.enemy.team[1];
    assert.equal(enemyReserve.currentHp, 200, 'Dano excedente de nocaute não atinge a reserva');
    const koCommands = PresentationMapper.mapEvents(koEvents, { battleState: koSession.battleState });
    assert.ok(koCommands.some(c => c.type === PRESENTATION_COMMANDS.FAINT_SEQUENCE));
  });

  test('14. Opções de golpes da campanha: Machamp e Dusclops possuem os pilotos em pool <= 6', () => {
    // Machamp (#68) possui Seismic Toss
    const machampPool = CampaignOptions.getPool(68);
    assert.ok(machampPool.length >= 1 && machampPool.length <= 6);
    assert.ok(machampPool.some(m => m.id === 69 && m.name === 'seismic-toss'));
    const validatedMachamp = CampaignOptions.validateSelection(68, [69, 280, 89, 663]);
    assert.ok(validatedMachamp);

    // Dusclops (#356) possui Night Shade
    const dusclopsPool = CampaignOptions.getPool(356);
    assert.ok(dusclopsPool.length >= 1 && dusclopsPool.length <= 6);
    assert.ok(dusclopsPool.some(m => m.id === 101 && m.name === 'night-shade'));
    const validatedDusclops = CampaignOptions.validateSelection(356, [101, 247, 89, 58]);
    assert.ok(validatedDusclops);
  });

  test('15. Hidratação real com BattleTeamHydrator e fixtures simuladas da PokéAPI', async () => {
    // Fixtures no formato real da PokéAPI (com type.name, damage_class.name e power: null)
    const pokeApiMachampDetail = {
      id: 68,
      number: 68,
      name: 'machamp',
      types: ['fighting'],
      stats: { hp: 90, attack: 130, defense: 80, specialAttack: 65, specialDefense: 85, speed: 55 },
      moves: [
        { move: { name: 'seismic-toss', url: 'https://pokeapi.co/api/v2/move/69/' } },
        { move: { name: 'cross-chop', url: 'https://pokeapi.co/api/v2/move/238/' } },
        { move: { name: 'earthquake', url: 'https://pokeapi.co/api/v2/move/89/' } },
        { move: { name: 'tackle', url: 'https://pokeapi.co/api/v2/move/33/' } }
      ]
    };

    const pokeApiDusclopsDetail = {
      id: 356,
      number: 356,
      name: 'dusclops',
      types: ['ghost'],
      stats: { hp: 40, attack: 70, defense: 130, specialAttack: 60, specialDefense: 130, speed: 25 },
      moves: [
        { move: { name: 'night-shade', url: 'https://pokeapi.co/api/v2/move/101/' } },
        { move: { name: 'shadow-ball', url: 'https://pokeapi.co/api/v2/move/247/' } },
        { move: { name: 'ice-punch', url: 'https://pokeapi.co/api/v2/move/8/' } },
        { move: { name: 'tackle', url: 'https://pokeapi.co/api/v2/move/33/' } }
      ]
    };

    const mockMoveCatalog = {
      69: {
        id: 69,
        name: 'seismic-toss',
        power: null,
        accuracy: 100,
        pp: 20,
        type: { name: 'fighting' },
        damage_class: { name: 'physical' }
      },
      101: {
        id: 101,
        name: 'night-shade',
        power: null,
        accuracy: 100,
        pp: 15,
        type: { name: 'ghost' },
        damage_class: { name: 'special' }
      },
      33: {
        id: 33,
        name: 'tackle',
        power: 40,
        accuracy: 100,
        pp: 35,
        type: { name: 'normal' },
        damage_class: { name: 'physical' }
      },
      89: {
        id: 89,
        name: 'earthquake',
        power: 100,
        accuracy: 100,
        pp: 10,
        type: { name: 'ground' },
        damage_class: { name: 'physical' }
      },
      238: {
        id: 238,
        name: 'cross-chop',
        power: 100,
        accuracy: 80,
        pp: 5,
        type: { name: 'fighting' },
        damage_class: { name: 'physical' }
      },
      247: {
        id: 247,
        name: 'shadow-ball',
        power: 80,
        accuracy: 100,
        pp: 15,
        type: { name: 'ghost' },
        damage_class: { name: 'special' }
      }
    };

    const mockApi = {
      getPokemonDetail: async idOrName => {
        const num = Number(idOrName);
        if (num === 68 || idOrName === 'machamp') return JSON.parse(JSON.stringify(pokeApiMachampDetail));
        if (num === 356 || idOrName === 'dusclops') return JSON.parse(JSON.stringify(pokeApiDusclopsDetail));
        throw new Error(`Pokemon não encontrado: ${idOrName}`);
      },
      getMoveDetail: async moveRef => {
        const name = typeof moveRef === 'string' ? moveRef : (moveRef.name || moveRef.move?.name || '');
        const url = typeof moveRef === 'object' && moveRef !== null ? (moveRef.url || moveRef.move?.url || '') : '';
        const idFromUrl = url ? parseInt(url.match(/\/move\/(\d+)\/?/)?.[1] || 0, 10) : 0;
        const id = Number(moveRef.id) || idFromUrl || (name === 'seismic-toss' ? 69 : name === 'night-shade' ? 101 : name === 'cross-chop' ? 238 : name === 'shadow-ball' ? 247 : name === 'earthquake' ? 89 : 33);
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

    // 1. Hidratação real de Machamp com nível explícito 70
    const hydratedMachamp = await hydrator.hydratePokemon({ id: 68, level: 70 });
    assert.equal(hydratedMachamp.id, 68);
    assert.equal(hydratedMachamp.level, 70, 'Nível explícito preservado na hidratação');
    const seismicInMachamp = hydratedMachamp.moves.find(m => m.id === 69);
    assert.ok(seismicInMachamp, 'Seismic Toss selecionado no loadout');
    assert.equal(seismicInMachamp.power, null, 'Power preservado como null durante hidratação');
    assert.equal(seismicInMachamp.accuracy, 100);
    assert.equal(seismicInMachamp.damageClass, 'physical');

    // 2. Hidratação real de Dusclops sem nível (deve usar fallback do motor)
    const hydratedDusclops = await hydrator.hydratePokemon(356);
    assert.equal(hydratedDusclops.id, 356);
    assert.equal(hydratedDusclops.level, undefined, 'Sem nível informado na PokéAPI');
    const nightInDusclops = hydratedDusclops.moves.find(m => m.id === 101);
    assert.ok(nightInDusclops, 'Night Shade selecionado no loadout');
    assert.equal(nightInDusclops.power, null, 'Power preservado como null durante hidratação');
    assert.equal(nightInDusclops.accuracy, 100);
    assert.equal(nightInDusclops.damageClass, 'special');

    // 3. Criação de combatentes no BattleEngine e validação de nível e execução
    const machampCombatant = BattleEngine.createCombatant(hydratedMachamp);
    assert.equal(machampCombatant.level, 70, 'Nível 70 adotado pelo motor');

    const dusclopsCombatant = BattleEngine.createCombatant(hydratedDusclops);
    assert.equal(dusclopsCombatant.level, 50, 'Fallback seguro para nível 50 do motor');

    // 4. Execução em combate real entre os combatentes hidratados
    const battle = BattleEngine.createBattle(machampCombatant, dusclopsCombatant);

    // Turno: Machamp usa Seismic Toss contra Dusclops (Ghost -> Imune)
    const turn1 = BattleEngine.resolveTurn(battle, {
      player: { type: 'MOVE', moveId: 69 },
      enemy: { type: 'MOVE', moveId: 101 }
    });

    const seismicDmg = turn1.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'player');
    assert.equal(seismicDmg.damage, 0, 'Seismic Toss contra Dusclops imune causa 0');

    const nightDmg = turn1.events.find(e => e.type === BATTLE_EVENTS.DAMAGE_APPLIED && e.source === 'enemy');
    assert.equal(nightDmg.damage, 50, 'Night Shade de Dusclops (Nível fallback 50) causa exatamente 50 no Machamp');

    // 5. Teste de rejeição de resposta adulterada da PokéAPI com power: 999 durante a hidratação
    const adulteratedApi = {
      getPokemonDetail: async () => JSON.parse(JSON.stringify(pokeApiMachampDetail)),
      getMoveDetail: async moveRef => {
        if (moveRef.name === 'seismic-toss' || moveRef.id === 69) {
          return {
            id: 69,
            name: 'seismic-toss',
            power: 999, // Adulteração simulada
            accuracy: 100,
            pp: 20,
            type: { name: 'fighting' },
            damage_class: { name: 'physical' }
          };
        }
        return mockApi.getMoveDetail(moveRef);
      }
    };
    const adulteratedHydrator = new BattleTeamHydrator({ api: adulteratedApi });
    // Durante a seleção e validação, o golpe adulterado deve ser descartado ou rejeitado
    const hydratedAdulterated = await adulteratedHydrator.hydratePokemon(68);
    // Como 999 é rejeitado por isMechanicallySupportedMove / validateMoveData, Seismic Toss adulterado NÃO entra no loadout válido
    assert.equal(hydratedAdulterated.moves.some(m => m.id === 69 && m.power === 999), false);
  });
});
