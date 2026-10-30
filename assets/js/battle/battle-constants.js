/**
 * ====================================================================
 * CONSTANTES DO MOTOR DE BATALHA: BATTLE CONSTANTS (battle-constants.js)
 * ====================================================================
 * Centraliza todos os estados, tipos de eventos, identificadores de ações,
 * catálogo de tipos elementais, categorias de golpe e parâmetros matemáticos
 * das Fases PBA-003, PBA-004 e PBA-005.
 * 
 * Compatível com Node.js (CommonJS) e navegadores (window.PBABattle).
 */

(function () {
  const BATTLE_STATUS = Object.freeze({
    READY: 'READY',
    IN_PROGRESS: 'IN_PROGRESS',
    AWAITING_REPLACEMENT: 'AWAITING_REPLACEMENT',
    PLAYER_WIN: 'PLAYER_WIN',
    ENEMY_WIN: 'ENEMY_WIN'
  });

  const BATTLE_EVENTS = Object.freeze({
    BATTLE_STARTED: 'BATTLE_STARTED',
    TURN_STARTED: 'TURN_STARTED',
    ACTION_STARTED: 'ACTION_STARTED',
    MOVE_SELECTED: 'MOVE_SELECTED',
    MOVE_USED: 'MOVE_USED',
    PP_CHANGED: 'PP_CHANGED',
    MOVE_MISSED: 'MOVE_MISSED',
    STATUS_APPLIED: 'STATUS_APPLIED',
    STATUS_BLOCKED: 'STATUS_BLOCKED',
    STATUS_IMMOBILIZED: 'STATUS_IMMOBILIZED',
    STATUS_DAMAGE: 'STATUS_DAMAGE',
    STAB_RESOLVED: 'STAB_RESOLVED',
    TYPE_EFFECTIVENESS_RESOLVED: 'TYPE_EFFECTIVENESS_RESOLVED',
    DAMAGE_APPLIED: 'DAMAGE_APPLIED',
    POKEMON_FAINTED: 'POKEMON_FAINTED',
    DRAIN_APPLIED: 'DRAIN_APPLIED',
    RECOIL_APPLIED: 'RECOIL_APPLIED',
    SWITCH_STARTED: 'SWITCH_STARTED',
    POKEMON_SWITCHED: 'POKEMON_SWITCHED',
    REPLACEMENT_REQUIRED: 'REPLACEMENT_REQUIRED',
    TEAM_DEFEATED: 'TEAM_DEFEATED',
    BATTLE_ENDED: 'BATTLE_ENDED'
  });

  const BATTLE_ACTIONS = Object.freeze({
    MOVE: 'MOVE',
    SWITCH: 'SWITCH',
    BASIC_ATTACK: 'BASIC_ATTACK' // Mantido para compatibilidade
  });

  const SWITCH_REASON = Object.freeze({
    VOLUNTARY: 'VOLUNTARY',
    FAINT_REPLACEMENT: 'FAINT_REPLACEMENT',
    FORCED: 'FORCED'
  });

  const MOVE_SUPPORT_LEVEL = Object.freeze({
    FULL: 'FULL',
    PARTIAL: 'PARTIAL',
    BLOCKED: 'BLOCKED'
  });

  const MOVE_PRIORITIES = Object.freeze({
    'extreme-speed': 2,
    'quick-attack': 1,
    'aqua-jet': 1,
    'bullet-punch': 1,
    'ice-shard': 1,
    'mach-punch': 1,
    'shadow-sneak': 1,
    'vacuum-wave': 1,
    'accelerock': 1,
    'water-shuriken': 1,
    'beak-blast': -3,
    'shell-trap': -3,
    'focus-punch': -3,
    'dragon-tail': -6,
    'circle-throw': -6,
    'roar': -6,
    'whirlwind': -6
  });

  function getMovePriority(move) {
    if (!move) return 0;
    const name = String(move.name || '').trim().toLowerCase();
    return MOVE_PRIORITIES[name] || 0;
  }

  function targetsDefenseWithSpAtk(move) {
    const name = String(move?.name || '').trim().toLowerCase();
    return name === 'psystrike' || name === 'psyshock' || name === 'secret-sword';
  }

  function isDualTypeEffectiveness(move) {
    const name = String(move?.name || '').trim().toLowerCase();
    return name === 'flying-press';
  }

  const DRAIN_MOVES = Object.freeze({
    'giga-drain': 0.5,
    'drain-punch': 0.5,
    'leech-life': 0.5,
    'absorb': 0.5,
    'mega-drain': 0.5,
    'draining-kiss': 0.75,
    'horn-leech': 0.5,
    'bitter-blade': 0.5,
    'parabolic-charge': 0.5
  });

  function getDrainRatio(move) {
    if (!move) return 0;
    const name = String(move.name || '').trim().toLowerCase();
    return DRAIN_MOVES[name] || 0;
  }

  const RECOIL_MOVES = Object.freeze({
    'light-of-ruin': 0.5,
    'take-down': 0.25,
    'double-edge': 0.333,
    'submission': 0.25,
    'brave-bird': 0.333,
    'flare-blitz': 0.333,
    'wood-hammer': 0.333,
    'head-smash': 0.5,
    'volt-tackle': 0.333,
    'wild-charge': 0.25,
    'head-charge': 0.25,
    'wave-crash': 0.333
  });

  function getRecoilRatio(move) {
    if (!move) return 0;
    const name = String(move.name || '').trim().toLowerCase();
    return RECOIL_MOVES[name] || 0;
  }

  function isForcedSwitchMove(move) {
    if (!move) return false;
    const name = String(move.name || '').trim().toLowerCase();
    return name === 'dragon-tail' || name === 'circle-throw';
  }

  const MOVE_ALIASES = Object.freeze({
    'nature-s-madness': 'natures-madness',
    'natures-madness': 'natures-madness'
  });

  const CANONICAL_MOVE_DEFINITIONS = Object.freeze({
    // --- FULL SUPPORT (Efeitos integralmente implementados e testados) ---
    71: Object.freeze({ id: 71, name: 'absorb', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5, aliases: ['absorb', 'vine-whip'] }),
    72: Object.freeze({ id: 72, name: 'mega-drain', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),
    77: Object.freeze({ id: 77, name: 'poison-powder', supportLevel: 'FULL', requiredMechanics: ['STATUS_APPLICATION'], knownPending: [], blockedReason: null, priority: 0 }),
    86: Object.freeze({ id: 86, name: 'thunder-wave', supportLevel: 'FULL', requiredMechanics: ['STATUS_APPLICATION'], knownPending: [], blockedReason: null, priority: 0 }),
    98: Object.freeze({ id: 98, name: 'quick-attack', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    141: Object.freeze({ id: 141, name: 'leech-life', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),
    183: Object.freeze({ id: 183, name: 'mach-punch', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    202: Object.freeze({ id: 202, name: 'giga-drain', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),
    245: Object.freeze({ id: 245, name: 'extreme-speed', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 2 }),
    261: Object.freeze({ id: 261, name: 'will-o-wisp', supportLevel: 'FULL', requiredMechanics: ['STATUS_APPLICATION'], knownPending: [], blockedReason: null, priority: 0 }),
    398: Object.freeze({ id: 398, name: 'poison-jab', supportLevel: 'PARTIAL', requiredMechanics: ['PHYSICAL_DAMAGE'], knownPending: ['SECONDARY_EFFECTS_PHASE_P4'], blockedReason: null, priority: 0 }),
    409: Object.freeze({ id: 409, name: 'drain-punch', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),
    410: Object.freeze({ id: 410, name: 'vacuum-wave', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    418: Object.freeze({ id: 418, name: 'bullet-punch', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    420: Object.freeze({ id: 420, name: 'ice-shard', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    425: Object.freeze({ id: 425, name: 'shadow-sneak', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    453: Object.freeze({ id: 453, name: 'aqua-jet', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    473: Object.freeze({ id: 473, name: 'psyshock', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'PHYSICAL_DEFENSE_TARGET'], knownPending: [], blockedReason: null, priority: 0, targetsDefenseWithSpAtk: true }),
    509: Object.freeze({ id: 509, name: 'circle-throw', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'NEGATIVE_PRIORITY', 'FORCED_SWITCH'], knownPending: [], blockedReason: null, priority: -6, isForcedSwitch: true }),
    525: Object.freeze({ id: 525, name: 'dragon-tail', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'NEGATIVE_PRIORITY', 'FORCED_SWITCH'], knownPending: [], blockedReason: null, priority: -6, isForcedSwitch: true }),
    532: Object.freeze({ id: 532, name: 'horn-leech', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),
    540: Object.freeze({ id: 540, name: 'psystrike', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'PHYSICAL_DEFENSE_TARGET'], knownPending: [], blockedReason: null, priority: 0, targetsDefenseWithSpAtk: true }),
    548: Object.freeze({ id: 548, name: 'secret-sword', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'PHYSICAL_DEFENSE_TARGET'], knownPending: [], blockedReason: null, priority: 0, targetsDefenseWithSpAtk: true }),
    560: Object.freeze({ id: 560, name: 'flying-press', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'DUAL_TYPE_EFFECTIVENESS'], knownPending: [], blockedReason: null, priority: 0, isDualTypeEffectiveness: true }),
    570: Object.freeze({ id: 570, name: 'parabolic-charge', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),
    577: Object.freeze({ id: 577, name: 'draining-kiss', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.75 }),
    617: Object.freeze({ id: 617, name: 'light-of-ruin', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'HP_RECOIL_DAMAGE_DEALT'], knownPending: [], blockedReason: null, priority: 0, recoilRatio: 0.5 }),
    677: Object.freeze({ id: 677, name: 'anchor-shot', supportLevel: 'PARTIAL', requiredMechanics: ['PHYSICAL_DAMAGE'], knownPending: ['TRAPPING_PHASE_P5'], blockedReason: null, priority: 0 }),
    709: Object.freeze({ id: 709, name: 'accelerock', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    776: Object.freeze({ id: 776, name: 'body-press', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'DEFENSE_AS_ATTACK'], knownPending: [], blockedReason: null, priority: 0, usesDefenseAsAttack: true }),
    855: Object.freeze({ id: 855, name: 'lumina-crash', supportLevel: 'PARTIAL', requiredMechanics: ['SPECIAL_DAMAGE'], knownPending: ['STAT_DROP_PHASE_P5'], blockedReason: null, priority: 0 }),
    891: Object.freeze({ id: 891, name: 'bitter-blade', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),

    // --- BLOCKED (Mecânicas complexas não implementadas / contenção estrita) ---
    68: Object.freeze({ id: 68, name: 'counter', supportLevel: 'BLOCKED', requiredMechanics: ['REFLECTS_PHYSICAL_DAMAGE'], knownPending: ['COUNTER_PHASE_P5'], blockedReason: 'REFLECTS_PHYSICAL_DAMAGE', priority: -5 }),
    117: Object.freeze({ id: 117, name: 'bide', supportLevel: 'BLOCKED', requiredMechanics: ['REFLECTS_STORED_DAMAGE'], knownPending: ['BIDE_PHASE_P5'], blockedReason: 'REFLECTS_STORED_DAMAGE', priority: 1 }),
    162: Object.freeze({ id: 162, name: 'super-fang', supportLevel: 'BLOCKED', requiredMechanics: ['FRACTIONAL_HP_DAMAGE'], knownPending: ['FRACTIONAL_HP_DAMAGE_PHASE_P5'], blockedReason: 'HALF_TARGET_CURRENT_HP', priority: 0 }),
    237: Object.freeze({ id: 237, name: 'hidden-power', supportLevel: 'BLOCKED', requiredMechanics: ['DYNAMIC_TYPE_FROM_IVS'], knownPending: ['DYNAMIC_TYPE_PHASE_P5'], blockedReason: 'DYNAMIC_TYPE_FROM_IVS', priority: 0 }),
    243: Object.freeze({ id: 243, name: 'mirror-coat', supportLevel: 'BLOCKED', requiredMechanics: ['REFLECTS_SPECIAL_DAMAGE'], knownPending: ['COUNTER_PHASE_P5'], blockedReason: 'REFLECTS_SPECIAL_DAMAGE', priority: -5 }),
    264: Object.freeze({ id: 264, name: 'focus-punch', supportLevel: 'BLOCKED', requiredMechanics: ['PREPARATION_PHASE', 'FAIL_ON_HIT'], knownPending: ['PREPARATION_PHASE_P6'], blockedReason: 'CHARGE_FAILS_IF_HIT', priority: -3 }),
    283: Object.freeze({ id: 283, name: 'endeavor', supportLevel: 'BLOCKED', requiredMechanics: ['EQUALIZES_HP'], knownPending: ['EQUALIZES_HP_PHASE_P5'], blockedReason: 'SETS_TARGET_HP_TO_USER_HP', priority: 0 }),
    284: Object.freeze({ id: 284, name: 'eruption', supportLevel: 'BLOCKED', requiredMechanics: ['HP_SCALED_POWER'], knownPending: ['HP_SCALED_POWER_PHASE_P5'], blockedReason: 'POWER_FROM_USER_HP', priority: 0 }),
    323: Object.freeze({ id: 323, name: 'water-spout', supportLevel: 'BLOCKED', requiredMechanics: ['HP_SCALED_POWER'], knownPending: ['HP_SCALED_POWER_PHASE_P5'], blockedReason: 'POWER_FROM_USER_HP', priority: 0 }),
    368: Object.freeze({ id: 368, name: 'metal-burst', supportLevel: 'BLOCKED', requiredMechanics: ['REFLECTS_LAST_DAMAGE'], knownPending: ['COUNTER_PHASE_P5'], blockedReason: 'REFLECTS_LAST_DAMAGE', priority: 0 }),
    594: Object.freeze({ id: 594, name: 'water-shuriken', supportLevel: 'BLOCKED', requiredMechanics: ['MULTI_HIT'], knownPending: ['MULTI_HIT_PHASE_P5'], blockedReason: 'HITS_2_TO_5_TIMES', priority: 1 }),
    599: Object.freeze({ id: 599, name: 'venom-drench', supportLevel: 'BLOCKED', requiredMechanics: ['STATUS_APPLICATION'], knownPending: ['STAT_DROP_PHASE_P5'], blockedReason: 'UNIMPLEMENTED_STAT_DROP', priority: 0 }),
    690: Object.freeze({ id: 690, name: 'beak-blast', supportLevel: 'BLOCKED', requiredMechanics: ['CONTACT_BURN_PREPARATION', 'PREPARATION_PHASE'], knownPending: ['CONTACT_BURN_PREPARATION_PHASE_P5'], blockedReason: 'PREPARATION_AND_CONTACT_BURN_REQUIRED', priority: -3 }),
    704: Object.freeze({ id: 704, name: 'shell-trap', supportLevel: 'BLOCKED', requiredMechanics: ['PHYSICAL_HIT_TRIGGER', 'PREPARATION_PHASE'], knownPending: ['COUNTER_PREPARATION_PHASE_P5'], blockedReason: 'PREPARATION_AND_PHYSICAL_TRIGGER_REQUIRED', priority: -3 }),
    717: Object.freeze({ id: 717, name: 'natures-madness', supportLevel: 'BLOCKED', requiredMechanics: ['FRACTIONAL_HP_DAMAGE'], knownPending: ['FRACTIONAL_HP_DAMAGE_PHASE_P5'], blockedReason: 'HALF_TARGET_CURRENT_HP', priority: 0, aliases: ['nature-s-madness', 'natures-madness'] }),
    723: Object.freeze({ id: 723, name: 'light-that-burns-the-sky', supportLevel: 'BLOCKED', requiredMechanics: ['Z_MOVE_MECHANICS'], knownPending: ['Z_MOVE_PHASE_P5'], blockedReason: 'Z_MOVE_NOT_IMPLEMENTED', priority: 0 }),
    854: Object.freeze({ id: 854, name: 'last-respects', supportLevel: 'BLOCKED', requiredMechanics: ['SPECIAL_DAMAGE_FAINT_COUNT'], knownPending: ['SPECIAL_DAMAGE_PHASE_P5'], blockedReason: 'POWER_DEPENDS_ON_FAINTED_ALLIES', priority: 0 }),
    877: Object.freeze({ id: 877, name: 'ruination', supportLevel: 'BLOCKED', requiredMechanics: ['FRACTIONAL_HP_DAMAGE'], knownPending: ['FRACTIONAL_HP_DAMAGE_PHASE_P5'], blockedReason: 'HALF_TARGET_CURRENT_HP', priority: 0 }),
    881: Object.freeze({ id: 881, name: 'chilly-reception', supportLevel: 'BLOCKED', requiredMechanics: ['WEATHER_SWITCH'], knownPending: ['WEATHER_SWITCH_PHASE_P5'], blockedReason: 'SNOW_WEATHER_AND_SWITCH', priority: 0 }),
    894: Object.freeze({ id: 894, name: 'comeuppance', supportLevel: 'BLOCKED', requiredMechanics: ['REFLECTS_LAST_DAMAGE'], knownPending: ['COUNTER_PHASE_P5'], blockedReason: 'REFLECTS_LAST_DAMAGE', priority: 0 }),
    12: Object.freeze({ id: 12, name: 'guillotine', supportLevel: 'BLOCKED', requiredMechanics: ['ONE_HIT_KO'], knownPending: ['OHKO_PHASE_P5'], blockedReason: 'ONE_HIT_KO', priority: 0 }),
    32: Object.freeze({ id: 32, name: 'horn-drill', supportLevel: 'BLOCKED', requiredMechanics: ['ONE_HIT_KO'], knownPending: ['OHKO_PHASE_P5'], blockedReason: 'ONE_HIT_KO', priority: 0 }),
    49: Object.freeze({ id: 49, name: 'sonic-boom', supportLevel: 'BLOCKED', requiredMechanics: ['FIXED_DAMAGE'], knownPending: ['FIXED_DAMAGE_PHASE_P5'], blockedReason: 'FIXED_DAMAGE_20', priority: 0 }),
    67: Object.freeze({ id: 67, name: 'low-kick', supportLevel: 'BLOCKED', requiredMechanics: ['VARIABLE_DAMAGE_TARGET_WEIGHT'], knownPending: ['VARIABLE_DAMAGE_PHASE_P5'], blockedReason: 'POWER_FROM_TARGET_WEIGHT', priority: 0 }),
    69: Object.freeze({ id: 69, name: 'seismic-toss', supportLevel: 'BLOCKED', requiredMechanics: ['FIXED_DAMAGE_LEVEL'], knownPending: ['FIXED_DAMAGE_PHASE_P5'], blockedReason: 'DAMAGE_EQUAL_TO_LEVEL', priority: 0 }),
    90: Object.freeze({ id: 90, name: 'fissure', supportLevel: 'BLOCKED', requiredMechanics: ['ONE_HIT_KO'], knownPending: ['OHKO_PHASE_P5'], blockedReason: 'ONE_HIT_KO', priority: 0 }),
    101: Object.freeze({ id: 101, name: 'night-shade', supportLevel: 'BLOCKED', requiredMechanics: ['FIXED_DAMAGE_LEVEL'], knownPending: ['FIXED_DAMAGE_PHASE_P5'], blockedReason: 'DAMAGE_EQUAL_TO_LEVEL', priority: 0 }),
    149: Object.freeze({ id: 149, name: 'psywave', supportLevel: 'BLOCKED', requiredMechanics: ['VARIABLE_DAMAGE_LEVEL'], knownPending: ['VARIABLE_DAMAGE_PHASE_P5'], blockedReason: 'RANDOM_LEVEL_MULTIPLIER', priority: 0 }),
    175: Object.freeze({ id: 175, name: 'flail', supportLevel: 'BLOCKED', requiredMechanics: ['HP_SCALED_POWER'], knownPending: ['HP_SCALED_POWER_PHASE_P5'], blockedReason: 'POWER_FROM_USER_HP', priority: 0 }),
    179: Object.freeze({ id: 179, name: 'reversal', supportLevel: 'BLOCKED', requiredMechanics: ['HP_SCALED_POWER'], knownPending: ['HP_SCALED_POWER_PHASE_P5'], blockedReason: 'POWER_FROM_USER_HP', priority: 0 }),
    276: Object.freeze({ id: 276, name: 'superpower', supportLevel: 'BLOCKED', requiredMechanics: ['SELF_STAT_DROP'], knownPending: ['STAT_DROP_PHASE_P5'], blockedReason: 'UNIMPLEMENTED_HARSH_STAT_DROP', priority: 0 }),
    315: Object.freeze({ id: 315, name: 'overheat', supportLevel: 'BLOCKED', requiredMechanics: ['SELF_STAT_DROP'], knownPending: ['STAT_DROP_PHASE_P5'], blockedReason: 'UNIMPLEMENTED_HARSH_STAT_DROP', priority: 0 }),
    329: Object.freeze({ id: 329, name: 'sheer-cold', supportLevel: 'BLOCKED', requiredMechanics: ['ONE_HIT_KO'], knownPending: ['OHKO_PHASE_P5'], blockedReason: 'ONE_HIT_KO', priority: 0 }),
    354: Object.freeze({ id: 354, name: 'psycho-boost', supportLevel: 'BLOCKED', requiredMechanics: ['SELF_STAT_DROP'], knownPending: ['STAT_DROP_PHASE_P5'], blockedReason: 'UNIMPLEMENTED_HARSH_STAT_DROP', priority: 0 }),
    360: Object.freeze({ id: 360, name: 'gyro-ball', supportLevel: 'BLOCKED', requiredMechanics: ['VARIABLE_DAMAGE_SPEED'], knownPending: ['VARIABLE_DAMAGE_PHASE_P5'], blockedReason: 'POWER_FROM_RELATIVE_SPEED', priority: 0 }),
    370: Object.freeze({ id: 370, name: 'close-combat', supportLevel: 'BLOCKED', requiredMechanics: ['SELF_STAT_DROP'], knownPending: ['STAT_DROP_PHASE_P5'], blockedReason: 'UNIMPLEMENTED_HARSH_STAT_DROP', priority: 0 }),
    371: Object.freeze({ id: 371, name: 'payback', supportLevel: 'BLOCKED', requiredMechanics: ['CONDITIONAL_DAMAGE'], knownPending: ['CONDITIONAL_DAMAGE_PHASE_P5'], blockedReason: 'DOUBLES_IF_USER_MOVES_SECOND', priority: 0 }),
    372: Object.freeze({ id: 372, name: 'assurance', supportLevel: 'BLOCKED', requiredMechanics: ['CONDITIONAL_DAMAGE'], knownPending: ['CONDITIONAL_DAMAGE_PHASE_P5'], blockedReason: 'DOUBLES_IF_TARGET_DAMAGED_THIS_TURN', priority: 0 }),
    389: Object.freeze({ id: 389, name: 'sucker-punch', supportLevel: 'BLOCKED', requiredMechanics: ['CONDITIONAL_PRIORITY'], knownPending: ['CONDITIONAL_DAMAGE_PHASE_P5'], blockedReason: 'REQUIRES_TARGET_DAMAGING_MOVE_AND_PRIORITY', priority: 1 }),
    434: Object.freeze({ id: 434, name: 'draco-meteor', supportLevel: 'BLOCKED', requiredMechanics: ['SELF_STAT_DROP'], knownPending: ['STAT_DROP_PHASE_P5'], blockedReason: 'UNIMPLEMENTED_HARSH_STAT_DROP', priority: 0 }),
    437: Object.freeze({ id: 437, name: 'leaf-storm', supportLevel: 'BLOCKED', requiredMechanics: ['SELF_STAT_DROP'], knownPending: ['STAT_DROP_PHASE_P5'], blockedReason: 'UNIMPLEMENTED_HARSH_STAT_DROP', priority: 0 }),
    447: Object.freeze({ id: 447, name: 'grass-knot', supportLevel: 'BLOCKED', requiredMechanics: ['VARIABLE_DAMAGE_TARGET_WEIGHT'], knownPending: ['VARIABLE_DAMAGE_PHASE_P5'], blockedReason: 'POWER_FROM_TARGET_WEIGHT', priority: 0 }),
    449: Object.freeze({ id: 449, name: 'judgment', supportLevel: 'BLOCKED', requiredMechanics: ['DYNAMIC_TYPE_FROM_ITEM'], knownPending: ['DYNAMIC_TYPE_PHASE_P5'], blockedReason: 'DYNAMIC_TYPE_FROM_ITEM', priority: 0 }),
    484: Object.freeze({ id: 484, name: 'heavy-slam', supportLevel: 'BLOCKED', requiredMechanics: ['VARIABLE_DAMAGE_RELATIVE_WEIGHT'], knownPending: ['VARIABLE_DAMAGE_PHASE_P5'], blockedReason: 'POWER_FROM_RELATIVE_WEIGHT', priority: 0 }),
    486: Object.freeze({ id: 486, name: 'electro-ball', supportLevel: 'BLOCKED', requiredMechanics: ['VARIABLE_DAMAGE_RELATIVE_SPEED'], knownPending: ['VARIABLE_DAMAGE_PHASE_P5'], blockedReason: 'POWER_FROM_RELATIVE_SPEED', priority: 0 }),
    535: Object.freeze({ id: 535, name: 'heat-crash', supportLevel: 'BLOCKED', requiredMechanics: ['VARIABLE_DAMAGE_RELATIVE_WEIGHT'], knownPending: ['VARIABLE_DAMAGE_PHASE_P5'], blockedReason: 'POWER_FROM_RELATIVE_WEIGHT', priority: 0 }),
    546: Object.freeze({ id: 546, name: 'techno-blast', supportLevel: 'BLOCKED', requiredMechanics: ['DYNAMIC_TYPE_FROM_ITEM'], knownPending: ['DYNAMIC_TYPE_PHASE_P5'], blockedReason: 'DYNAMIC_TYPE_FROM_ITEM', priority: 0 }),
    660: Object.freeze({ id: 660, name: 'first-impression', supportLevel: 'BLOCKED', requiredMechanics: ['CONDITIONAL_PRIORITY'], knownPending: ['CONDITIONAL_DAMAGE_PHASE_P5'], blockedReason: 'REQUIRES_FIRST_TURN_AFTER_ENTRY_AND_PRIORITY', priority: 2 }),
    686: Object.freeze({ id: 686, name: 'revelation-dance', supportLevel: 'BLOCKED', requiredMechanics: ['DYNAMIC_TYPE_FROM_USER_TYPE'], knownPending: ['DYNAMIC_TYPE_PHASE_P5'], blockedReason: 'DYNAMIC_TYPE_FROM_USER_TYPE', priority: 0 }),
    705: Object.freeze({ id: 705, name: 'fleur-cannon', supportLevel: 'BLOCKED', requiredMechanics: ['SELF_STAT_DROP'], knownPending: ['STAT_DROP_PHASE_P5'], blockedReason: 'UNIMPLEMENTED_HARSH_STAT_DROP', priority: 0 }),
    707: Object.freeze({ id: 707, name: 'stomping-tantrum', supportLevel: 'BLOCKED', requiredMechanics: ['CONDITIONAL_DAMAGE'], knownPending: ['CONDITIONAL_DAMAGE_PHASE_P5'], blockedReason: 'DOUBLES_IF_PREVIOUS_MOVE_FAILED', priority: 0 }),
    718: Object.freeze({ id: 718, name: 'multi-attack', supportLevel: 'BLOCKED', requiredMechanics: ['DYNAMIC_TYPE_FROM_ITEM'], knownPending: ['DYNAMIC_TYPE_PHASE_P5'], blockedReason: 'DYNAMIC_TYPE_FROM_ITEM', priority: 0 }),
    754: Object.freeze({ id: 754, name: 'bolt-beak', supportLevel: 'BLOCKED', requiredMechanics: ['CONDITIONAL_DAMAGE'], knownPending: ['CONDITIONAL_DAMAGE_PHASE_P5'], blockedReason: 'DOUBLES_IF_USER_MOVES_FIRST', priority: 0 }),
    820: Object.freeze({ id: 820, name: 'dragon-energy', supportLevel: 'BLOCKED', requiredMechanics: ['HP_SCALED_POWER'], knownPending: ['HP_SCALED_POWER_PHASE_P5'], blockedReason: 'POWER_FROM_USER_HP', priority: 0 }),
    851: Object.freeze({ id: 851, name: 'tera-blast', supportLevel: 'BLOCKED', requiredMechanics: ['DYNAMIC_TYPE_FROM_TERA'], knownPending: ['DYNAMIC_TYPE_PHASE_P5'], blockedReason: 'DYNAMIC_TYPE_FROM_TERA', priority: 0 }),
    915: Object.freeze({ id: 915, name: 'temper-flare', supportLevel: 'BLOCKED', requiredMechanics: ['CONDITIONAL_DAMAGE'], knownPending: ['CONDITIONAL_DAMAGE_PHASE_P5'], blockedReason: 'DOUBLES_IF_PREVIOUS_MOVE_FAILED', priority: 0 })
  });

  const CANONICAL_MOVE_DEFINITIONS_BY_NAME = Object.freeze(
    Object.fromEntries(
      Object.values(CANONICAL_MOVE_DEFINITIONS).flatMap(def => {
        const names = [def.name, ...(def.aliases || [])];
        return names.map(n => [n, def]);
      })
    )
  );

  // Mapeamento canônico dos golpes de dano utilizados nos catálogos da campanha e Pokédex expandida
  const KNOWN_CATALOG_MOVES = Object.freeze({
    1: Object.freeze({ id: 1, name: 'pound', type: 'normal', power: 40, accuracy: 100, pp: 35, damageClass: 'physical' }),
    2: Object.freeze({ id: 2, name: 'karate-chop', type: 'fighting', power: 50, accuracy: 100, pp: 25, damageClass: 'physical' }),
    5: Object.freeze({ id: 5, name: 'mega-punch', type: 'normal', power: 80, accuracy: 85, pp: 20, damageClass: 'physical' }),
    7: Object.freeze({ id: 7, name: 'fire-punch', type: 'fire', power: 75, accuracy: 100, pp: 15, damageClass: 'physical' }),
    8: Object.freeze({ id: 8, name: 'ice-punch', type: 'ice', power: 75, accuracy: 100, pp: 15, damageClass: 'physical' }),
    9: Object.freeze({ id: 9, name: 'thunder-punch', type: 'electric', power: 75, accuracy: 100, pp: 15, damageClass: 'physical' }),
    10: Object.freeze({ id: 10, name: 'scratch', type: 'normal', power: 40, accuracy: 100, pp: 35, damageClass: 'physical' }),
    11: Object.freeze({ id: 11, name: 'vice-grip', type: 'normal', power: 55, accuracy: 100, pp: 30, damageClass: 'physical' }),
    15: Object.freeze({ id: 15, name: 'cut', type: 'normal', power: 50, accuracy: 95, pp: 30, damageClass: 'physical' }),
    16: Object.freeze({ id: 16, name: 'gust', type: 'flying', power: 40, accuracy: 100, pp: 35, damageClass: 'special' }),
    17: Object.freeze({ id: 17, name: 'wing-attack', type: 'flying', power: 60, accuracy: 100, pp: 35, damageClass: 'physical' }),
    21: Object.freeze({ id: 21, name: 'slam', type: 'normal', power: 80, accuracy: 75, pp: 20, damageClass: 'physical' }),
    22: Object.freeze({ id: 22, name: 'vine-whip', type: 'grass', power: 45, accuracy: 100, pp: 25, damageClass: 'physical' }),
    23: Object.freeze({ id: 23, name: 'stomp', type: 'normal', power: 65, accuracy: 100, pp: 20, damageClass: 'physical' }),
    25: Object.freeze({ id: 25, name: 'mega-kick', type: 'normal', power: 120, accuracy: 75, pp: 5, damageClass: 'physical' }),
    29: Object.freeze({ id: 29, name: 'headbutt', type: 'normal', power: 70, accuracy: 100, pp: 15, damageClass: 'physical' }),
    30: Object.freeze({ id: 30, name: 'horn-attack', type: 'normal', power: 65, accuracy: 100, pp: 25, damageClass: 'physical' }),
    33: Object.freeze({ id: 33, name: 'tackle', type: 'normal', power: 40, accuracy: 100, pp: 35, damageClass: 'physical' }),
    34: Object.freeze({ id: 34, name: 'body-slam', type: 'normal', power: 85, accuracy: 100, pp: 15, damageClass: 'physical' }),
    36: Object.freeze({ id: 36, name: 'take-down', type: 'normal', power: 90, accuracy: 85, pp: 20, damageClass: 'physical' }),
    38: Object.freeze({ id: 38, name: 'double-edge', type: 'normal', power: 120, accuracy: 100, pp: 15, damageClass: 'physical' }),
    40: Object.freeze({ id: 40, name: 'poison-sting', type: 'poison', power: 15, accuracy: 100, pp: 35, damageClass: 'physical' }),
    44: Object.freeze({ id: 44, name: 'bite', type: 'dark', power: 60, accuracy: 100, pp: 25, damageClass: 'physical' }),
    51: Object.freeze({ id: 51, name: 'acid', type: 'poison', power: 40, accuracy: 100, pp: 30, damageClass: 'special' }),
    52: Object.freeze({ id: 52, name: 'ember', type: 'fire', power: 40, accuracy: 100, pp: 25, damageClass: 'special' }),
    53: Object.freeze({ id: 53, name: 'flamethrower', type: 'fire', power: 90, accuracy: 100, pp: 15, damageClass: 'special' }),
    55: Object.freeze({ id: 55, name: 'water-gun', type: 'water', power: 40, accuracy: 100, pp: 25, damageClass: 'special' }),
    56: Object.freeze({ id: 56, name: 'hydro-pump', type: 'water', power: 110, accuracy: 80, pp: 5, damageClass: 'special' }),
    57: Object.freeze({ id: 57, name: 'surf', type: 'water', power: 90, accuracy: 100, pp: 15, damageClass: 'special' }),
    58: Object.freeze({ id: 58, name: 'ice-beam', type: 'ice', power: 90, accuracy: 100, pp: 10, damageClass: 'special' }),
    59: Object.freeze({ id: 59, name: 'blizzard', type: 'ice', power: 110, accuracy: 70, pp: 5, damageClass: 'special' }),
    63: Object.freeze({ id: 63, name: 'hyper-beam', type: 'normal', power: 150, accuracy: 90, pp: 5, damageClass: 'special' }),
    64: Object.freeze({ id: 64, name: 'peck', type: 'flying', power: 35, accuracy: 100, pp: 35, damageClass: 'physical' }),
    65: Object.freeze({ id: 65, name: 'drill-peck', type: 'flying', power: 80, accuracy: 100, pp: 20, damageClass: 'physical' }),
    70: Object.freeze({ id: 70, name: 'strength', type: 'normal', power: 80, accuracy: 100, pp: 15, damageClass: 'physical' }),
    71: Object.freeze({ id: 71, name: 'absorb', type: 'grass', power: 20, accuracy: 100, pp: 25, damageClass: 'special' }),
    72: Object.freeze({ id: 72, name: 'mega-drain', type: 'grass', power: 40, accuracy: 100, pp: 15, damageClass: 'special' }),
    76: Object.freeze({ id: 76, name: 'solar-beam', type: 'grass', power: 120, accuracy: 100, pp: 10, damageClass: 'special' }),
    84: Object.freeze({ id: 84, name: 'thunder-shock', type: 'electric', power: 40, accuracy: 100, pp: 30, damageClass: 'special' }),
    85: Object.freeze({ id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, pp: 15, damageClass: 'special' }),
    87: Object.freeze({ id: 87, name: 'thunder', type: 'electric', power: 110, accuracy: 70, pp: 10, damageClass: 'special' }),
    88: Object.freeze({ id: 88, name: 'rock-throw', type: 'rock', power: 50, accuracy: 90, pp: 15, damageClass: 'physical' }),
    89: Object.freeze({ id: 89, name: 'earthquake', type: 'ground', power: 100, accuracy: 100, pp: 10, damageClass: 'physical' }),
    93: Object.freeze({ id: 93, name: 'confusion', type: 'psychic', power: 50, accuracy: 100, pp: 25, damageClass: 'special' }),
    94: Object.freeze({ id: 94, name: 'psychic', type: 'psychic', power: 90, accuracy: 100, pp: 10, damageClass: 'special' }),
    98: Object.freeze({ id: 98, name: 'quick-attack', type: 'normal', power: 40, accuracy: 100, pp: 30, damageClass: 'physical' }),
    121: Object.freeze({ id: 121, name: 'egg-bomb', type: 'normal', power: 100, accuracy: 75, pp: 10, damageClass: 'physical' }),
    122: Object.freeze({ id: 122, name: 'lick', type: 'ghost', power: 30, accuracy: 100, pp: 30, damageClass: 'physical' }),
    126: Object.freeze({ id: 126, name: 'fire-blast', type: 'fire', power: 110, accuracy: 85, pp: 5, damageClass: 'special' }),
    129: Object.freeze({ id: 129, name: 'swift', type: 'normal', power: 60, accuracy: null, pp: 20, damageClass: 'special' }),
    141: Object.freeze({ id: 141, name: 'leech-life', type: 'bug', power: 80, accuracy: 100, pp: 10, damageClass: 'physical' }),
    152: Object.freeze({ id: 152, name: 'crabhammer', type: 'water', power: 100, accuracy: 90, pp: 10, damageClass: 'physical' }),
    157: Object.freeze({ id: 157, name: 'rock-slide', type: 'rock', power: 75, accuracy: 90, pp: 10, damageClass: 'physical' }),
    158: Object.freeze({ id: 158, name: 'hyper-fang', type: 'normal', power: 80, accuracy: 90, pp: 15, damageClass: 'physical' }),
    161: Object.freeze({ id: 161, name: 'tri-attack', type: 'normal', power: 80, accuracy: 100, pp: 10, damageClass: 'special' }),
    163: Object.freeze({ id: 163, name: 'slash', type: 'normal', power: 70, accuracy: 100, pp: 20, damageClass: 'physical' }),
    168: Object.freeze({ id: 168, name: 'thief', type: 'dark', power: 60, accuracy: 100, pp: 25, damageClass: 'physical' }),
    181: Object.freeze({ id: 181, name: 'powder-snow', type: 'ice', power: 40, accuracy: 100, pp: 25, damageClass: 'special' }),
    183: Object.freeze({ id: 183, name: 'mach-punch', type: 'fighting', power: 40, accuracy: 100, pp: 30, damageClass: 'physical' }),
    188: Object.freeze({ id: 188, name: 'sludge-bomb', type: 'poison', power: 90, accuracy: 100, pp: 10, damageClass: 'special' }),
    189: Object.freeze({ id: 189, name: 'mud-slap', type: 'ground', power: 20, accuracy: 100, pp: 10, damageClass: 'special' }),
    192: Object.freeze({ id: 192, name: 'zap-cannon', type: 'electric', power: 120, accuracy: 50, pp: 5, damageClass: 'special' }),
    196: Object.freeze({ id: 196, name: 'icy-wind', type: 'ice', power: 55, accuracy: 95, pp: 15, damageClass: 'special' }),
    202: Object.freeze({ id: 202, name: 'giga-drain', type: 'grass', power: 75, accuracy: 100, pp: 10, damageClass: 'special' }),
    209: Object.freeze({ id: 209, name: 'spark', type: 'electric', power: 65, accuracy: 100, pp: 20, damageClass: 'physical' }),
    211: Object.freeze({ id: 211, name: 'steel-wing', type: 'steel', power: 70, accuracy: 90, pp: 25, damageClass: 'physical' }),
    223: Object.freeze({ id: 223, name: 'dynamic-punch', type: 'fighting', power: 100, accuracy: 50, pp: 5, damageClass: 'physical' }),
    224: Object.freeze({ id: 224, name: 'megahorn', type: 'bug', power: 120, accuracy: 85, pp: 10, damageClass: 'physical' }),
    225: Object.freeze({ id: 225, name: 'dragon-breath', type: 'dragon', power: 60, accuracy: 100, pp: 20, damageClass: 'special' }),
    228: Object.freeze({ id: 228, name: 'pursuit', type: 'dark', power: 40, accuracy: 100, pp: 20, damageClass: 'physical' }),
    229: Object.freeze({ id: 229, name: 'rapid-spin', type: 'normal', power: 50, accuracy: 100, pp: 40, damageClass: 'physical' }),
    231: Object.freeze({ id: 231, name: 'iron-tail', type: 'steel', power: 100, accuracy: 75, pp: 15, damageClass: 'physical' }),
    232: Object.freeze({ id: 232, name: 'metal-claw', type: 'steel', power: 50, accuracy: 95, pp: 35, damageClass: 'physical' }),
    238: Object.freeze({ id: 238, name: 'cross-chop', type: 'fighting', power: 100, accuracy: 80, pp: 5, damageClass: 'physical' }),
    242: Object.freeze({ id: 242, name: 'crunch', type: 'dark', power: 80, accuracy: 100, pp: 15, damageClass: 'physical' }),
    245: Object.freeze({ id: 245, name: 'extreme-speed', type: 'normal', power: 80, accuracy: 100, pp: 5, damageClass: 'physical' }),
    246: Object.freeze({ id: 246, name: 'ancient-power', type: 'rock', power: 60, accuracy: 100, pp: 5, damageClass: 'special' }),
    247: Object.freeze({ id: 247, name: 'shadow-ball', type: 'ghost', power: 80, accuracy: 100, pp: 15, damageClass: 'special' }),
    257: Object.freeze({ id: 257, name: 'heat-wave', type: 'fire', power: 95, accuracy: 90, pp: 10, damageClass: 'special' }),
    280: Object.freeze({ id: 280, name: 'brick-break', type: 'fighting', power: 75, accuracy: 100, pp: 15, damageClass: 'physical' }),
    282: Object.freeze({ id: 282, name: 'knock-off', type: 'dark', power: 65, accuracy: 100, pp: 20, damageClass: 'physical' }),
    290: Object.freeze({ id: 290, name: 'secret-power', type: 'normal', power: 70, accuracy: 100, pp: 20, damageClass: 'physical' }),
    295: Object.freeze({ id: 295, name: 'luster-purge', type: 'psychic', power: 95, accuracy: 100, pp: 5, damageClass: 'special' }),
    296: Object.freeze({ id: 296, name: 'mist-ball', type: 'psychic', power: 95, accuracy: 100, pp: 5, damageClass: 'special' }),
    299: Object.freeze({ id: 299, name: 'blaze-kick', type: 'fire', power: 85, accuracy: 90, pp: 10, damageClass: 'physical' }),
    304: Object.freeze({ id: 304, name: 'hyper-voice', type: 'normal', power: 90, accuracy: 100, pp: 10, damageClass: 'special' }),
    309: Object.freeze({ id: 309, name: 'meteor-mash', type: 'steel', power: 90, accuracy: 90, pp: 10, damageClass: 'physical' }),
    310: Object.freeze({ id: 310, name: 'astonish', type: 'ghost', power: 30, accuracy: 100, pp: 15, damageClass: 'physical' }),
    314: Object.freeze({ id: 314, name: 'air-cutter', type: 'flying', power: 60, accuracy: 95, pp: 25, damageClass: 'special' }),
    317: Object.freeze({ id: 317, name: 'rock-tomb', type: 'rock', power: 60, accuracy: 95, pp: 15, damageClass: 'physical' }),
    324: Object.freeze({ id: 324, name: 'signal-beam', type: 'bug', power: 75, accuracy: 100, pp: 15, damageClass: 'special' }),
    325: Object.freeze({ id: 325, name: 'shadow-punch', type: 'ghost', power: 60, accuracy: null, pp: 20, damageClass: 'physical' }),
    326: Object.freeze({ id: 326, name: 'extrasensory', type: 'psychic', power: 80, accuracy: 100, pp: 20, damageClass: 'special' }),
    327: Object.freeze({ id: 327, name: 'sky-uppercut', type: 'fighting', power: 85, accuracy: 90, pp: 15, damageClass: 'physical' }),
    330: Object.freeze({ id: 330, name: 'muddy-water', type: 'water', power: 90, accuracy: 85, pp: 10, damageClass: 'special' }),
    332: Object.freeze({ id: 332, name: 'aerial-ace', type: 'flying', power: 60, accuracy: null, pp: 20, damageClass: 'physical' }),
    337: Object.freeze({ id: 337, name: 'dragon-claw', type: 'dragon', power: 80, accuracy: 100, pp: 15, damageClass: 'physical' }),
    340: Object.freeze({ id: 340, name: 'bounce', type: 'flying', power: 85, accuracy: 85, pp: 5, damageClass: 'physical' }),
    341: Object.freeze({ id: 341, name: 'mud-shot', type: 'ground', power: 55, accuracy: 95, pp: 15, damageClass: 'special' }),
    345: Object.freeze({ id: 345, name: 'magical-leaf', type: 'grass', power: 60, accuracy: null, pp: 20, damageClass: 'special' }),
    348: Object.freeze({ id: 348, name: 'leaf-blade', type: 'grass', power: 90, accuracy: 100, pp: 15, damageClass: 'physical' }),
    351: Object.freeze({ id: 351, name: 'shock-wave', type: 'electric', power: 60, accuracy: null, pp: 20, damageClass: 'special' }),
    369: Object.freeze({ id: 369, name: 'u-turn', type: 'bug', power: 70, accuracy: 100, pp: 20, damageClass: 'physical' }),
    394: Object.freeze({ id: 394, name: 'flare-blitz', type: 'fire', power: 120, accuracy: 100, pp: 15, damageClass: 'physical' }),
    396: Object.freeze({ id: 396, name: 'aura-sphere', type: 'fighting', power: 80, accuracy: null, pp: 20, damageClass: 'special' }),
    398: Object.freeze({ id: 398, name: 'poison-jab', type: 'poison', power: 80, accuracy: 100, pp: 20, damageClass: 'physical' }),
    399: Object.freeze({ id: 399, name: 'dark-pulse', type: 'dark', power: 80, accuracy: 100, pp: 15, damageClass: 'special' }),
    400: Object.freeze({ id: 400, name: 'night-slash', type: 'dark', power: 70, accuracy: 100, pp: 15, damageClass: 'physical' }),
    401: Object.freeze({ id: 401, name: 'aqua-tail', type: 'water', power: 90, accuracy: 90, pp: 10, damageClass: 'physical' }),
    402: Object.freeze({ id: 402, name: 'seed-bomb', type: 'grass', power: 80, accuracy: 100, pp: 15, damageClass: 'physical' }),
    403: Object.freeze({ id: 403, name: 'air-slash', type: 'flying', power: 75, accuracy: 95, pp: 15, damageClass: 'special' }),
    404: Object.freeze({ id: 404, name: 'x-scissor', type: 'bug', power: 80, accuracy: 100, pp: 15, damageClass: 'physical' }),
    405: Object.freeze({ id: 405, name: 'bug-buzz', type: 'bug', power: 90, accuracy: 100, pp: 10, damageClass: 'special' }),
    406: Object.freeze({ id: 406, name: 'dragon-pulse', type: 'dragon', power: 85, accuracy: 100, pp: 10, damageClass: 'special' }),
    407: Object.freeze({ id: 407, name: 'dragon-rush', type: 'dragon', power: 100, accuracy: 75, pp: 10, damageClass: 'physical' }),
    408: Object.freeze({ id: 408, name: 'power-gem', type: 'rock', power: 80, accuracy: 100, pp: 20, damageClass: 'special' }),
    409: Object.freeze({ id: 409, name: 'drain-punch', type: 'fighting', power: 75, accuracy: 100, pp: 10, damageClass: 'physical' }),
    410: Object.freeze({ id: 410, name: 'vacuum-wave', type: 'fighting', power: 40, accuracy: 100, pp: 30, damageClass: 'special' }),
    411: Object.freeze({ id: 411, name: 'focus-blast', type: 'fighting', power: 120, accuracy: 70, pp: 5, damageClass: 'special' }),
    412: Object.freeze({ id: 412, name: 'energy-ball', type: 'grass', power: 90, accuracy: 100, pp: 10, damageClass: 'special' }),
    414: Object.freeze({ id: 414, name: 'earth-power', type: 'ground', power: 90, accuracy: 100, pp: 10, damageClass: 'special' }),
    418: Object.freeze({ id: 418, name: 'bullet-punch', type: 'steel', power: 40, accuracy: 100, pp: 30, damageClass: 'physical' }),
    420: Object.freeze({ id: 420, name: 'ice-shard', type: 'ice', power: 40, accuracy: 100, pp: 30, damageClass: 'physical' }),
    421: Object.freeze({ id: 421, name: 'shadow-claw', type: 'ghost', power: 70, accuracy: 100, pp: 15, damageClass: 'physical' }),
    423: Object.freeze({ id: 423, name: 'ice-fang', type: 'ice', power: 65, accuracy: 95, pp: 15, damageClass: 'physical' }),
    424: Object.freeze({ id: 424, name: 'fire-fang', type: 'fire', power: 65, accuracy: 95, pp: 15, damageClass: 'physical' }),
    425: Object.freeze({ id: 425, name: 'shadow-sneak', type: 'ghost', power: 40, accuracy: 100, pp: 30, damageClass: 'physical' }),
    428: Object.freeze({ id: 428, name: 'zen-headbutt', type: 'psychic', power: 80, accuracy: 90, pp: 15, damageClass: 'physical' }),
    430: Object.freeze({ id: 430, name: 'flash-cannon', type: 'steel', power: 80, accuracy: 100, pp: 10, damageClass: 'special' }),
    431: Object.freeze({ id: 431, name: 'rock-climb', type: 'normal', power: 90, accuracy: 85, pp: 20, damageClass: 'physical' }),
    438: Object.freeze({ id: 438, name: 'power-whip', type: 'grass', power: 120, accuracy: 85, pp: 10, damageClass: 'physical' }),
    441: Object.freeze({ id: 441, name: 'gunk-shot', type: 'poison', power: 120, accuracy: 80, pp: 5, damageClass: 'physical' }),
    442: Object.freeze({ id: 442, name: 'iron-head', type: 'steel', power: 80, accuracy: 100, pp: 15, damageClass: 'physical' }),
    444: Object.freeze({ id: 444, name: 'stone-edge', type: 'rock', power: 100, accuracy: 80, pp: 5, damageClass: 'physical' }),
    450: Object.freeze({ id: 450, name: 'bug-bite', type: 'bug', power: 60, accuracy: 100, pp: 20, damageClass: 'physical' }),
    451: Object.freeze({ id: 451, name: 'charge-beam', type: 'electric', power: 50, accuracy: 90, pp: 10, damageClass: 'special' }),
    453: Object.freeze({ id: 453, name: 'aqua-jet', type: 'water', power: 40, accuracy: 100, pp: 20, damageClass: 'physical' }),
    460: Object.freeze({ id: 460, name: 'spacial-rend', type: 'dragon', power: 100, accuracy: 95, pp: 5, damageClass: 'special' }),
    465: Object.freeze({ id: 465, name: 'seed-flare', type: 'grass', power: 120, accuracy: 85, pp: 5, damageClass: 'special' }),
    466: Object.freeze({ id: 466, name: 'ominous-wind', type: 'ghost', power: 60, accuracy: 100, pp: 5, damageClass: 'special' }),
    473: Object.freeze({ id: 473, name: 'psyshock', type: 'psychic', power: 80, accuracy: 100, pp: 10, damageClass: 'special' }),
    482: Object.freeze({ id: 482, name: 'sludge-wave', type: 'poison', power: 95, accuracy: 100, pp: 10, damageClass: 'special' }),
    490: Object.freeze({ id: 490, name: 'low-sweep', type: 'fighting', power: 65, accuracy: 100, pp: 20, damageClass: 'physical' }),
    496: Object.freeze({ id: 496, name: 'round', type: 'normal', power: 60, accuracy: 100, pp: 15, damageClass: 'special' }),
    499: Object.freeze({ id: 499, name: 'clear-smog', type: 'poison', power: 50, accuracy: null, pp: 15, damageClass: 'special' }),
    503: Object.freeze({ id: 503, name: 'scald', type: 'water', power: 80, accuracy: 100, pp: 15, damageClass: 'special' }),
    509: Object.freeze({ id: 509, name: 'circle-throw', type: 'fighting', power: 60, accuracy: 90, pp: 10, damageClass: 'physical' }),
    510: Object.freeze({ id: 510, name: 'incinerate', type: 'fire', power: 60, accuracy: 100, pp: 15, damageClass: 'special' }),
    517: Object.freeze({ id: 517, name: 'inferno', type: 'fire', power: 100, accuracy: 50, pp: 5, damageClass: 'special' }),
    522: Object.freeze({ id: 522, name: 'struggle-bug', type: 'bug', power: 50, accuracy: 100, pp: 20, damageClass: 'special' }),
    525: Object.freeze({ id: 525, name: 'dragon-tail', type: 'dragon', power: 60, accuracy: 90, pp: 10, damageClass: 'physical' }),
    527: Object.freeze({ id: 527, name: 'electroweb', type: 'electric', power: 55, accuracy: 95, pp: 15, damageClass: 'special' }),
    529: Object.freeze({ id: 529, name: 'drill-run', type: 'ground', power: 80, accuracy: 95, pp: 10, damageClass: 'physical' }),
    531: Object.freeze({ id: 531, name: 'heart-stamp', type: 'psychic', power: 60, accuracy: 100, pp: 25, damageClass: 'physical' }),
    532: Object.freeze({ id: 532, name: 'horn-leech', type: 'grass', power: 75, accuracy: 100, pp: 10, damageClass: 'physical' }),
    533: Object.freeze({ id: 533, name: 'sacred-sword', type: 'fighting', power: 90, accuracy: 100, pp: 15, damageClass: 'physical' }),
    539: Object.freeze({ id: 539, name: 'night-daze', type: 'dark', power: 85, accuracy: 95, pp: 10, damageClass: 'special' }),
    540: Object.freeze({ id: 540, name: 'psystrike', type: 'psychic', power: 100, accuracy: 100, pp: 10, damageClass: 'special' }),
    542: Object.freeze({ id: 542, name: 'hurricane', type: 'flying', power: 110, accuracy: 70, pp: 10, damageClass: 'special' }),
    548: Object.freeze({ id: 548, name: 'secret-sword', type: 'fighting', power: 85, accuracy: 100, pp: 10, damageClass: 'special' }),
    550: Object.freeze({ id: 550, name: 'bolt-strike', type: 'electric', power: 130, accuracy: 85, pp: 5, damageClass: 'physical' }),
    551: Object.freeze({ id: 551, name: 'blue-flare', type: 'fire', power: 130, accuracy: 85, pp: 5, damageClass: 'special' }),
    556: Object.freeze({ id: 556, name: 'icicle-crash', type: 'ice', power: 85, accuracy: 90, pp: 10, damageClass: 'physical' }),
    560: Object.freeze({ id: 560, name: 'flying-press', type: 'fighting', power: 100, accuracy: 95, pp: 10, damageClass: 'physical' }),
    570: Object.freeze({ id: 570, name: 'parabolic-charge', type: 'electric', power: 65, accuracy: 100, pp: 20, damageClass: 'special' }),
    572: Object.freeze({ id: 572, name: 'petal-blizzard', type: 'grass', power: 90, accuracy: 100, pp: 15, damageClass: 'physical' }),
    574: Object.freeze({ id: 574, name: 'disarming-voice', type: 'fairy', power: 40, accuracy: null, pp: 15, damageClass: 'special' }),
    577: Object.freeze({ id: 577, name: 'draining-kiss', type: 'fairy', power: 50, accuracy: 100, pp: 10, damageClass: 'special' }),
    583: Object.freeze({ id: 583, name: 'play-rough', type: 'fairy', power: 90, accuracy: 90, pp: 10, damageClass: 'physical' }),
    584: Object.freeze({ id: 584, name: 'fairy-wind', type: 'fairy', power: 40, accuracy: 100, pp: 30, damageClass: 'special' }),
    585: Object.freeze({ id: 585, name: 'moonblast', type: 'fairy', power: 95, accuracy: 100, pp: 15, damageClass: 'special' }),
    586: Object.freeze({ id: 586, name: 'boomburst', type: 'normal', power: 140, accuracy: 100, pp: 10, damageClass: 'special' }),
    595: Object.freeze({ id: 595, name: 'mystical-fire', type: 'fire', power: 75, accuracy: 100, pp: 10, damageClass: 'special' }),
    605: Object.freeze({ id: 605, name: 'dazzling-gleam', type: 'fairy', power: 80, accuracy: 100, pp: 10, damageClass: 'special' }),
    609: Object.freeze({ id: 609, name: 'nuzzle', type: 'electric', power: 20, accuracy: 100, pp: 20, damageClass: 'physical' }),
    611: Object.freeze({ id: 611, name: 'infestation', type: 'bug', power: 20, accuracy: 100, pp: 20, damageClass: 'special' }),
    612: Object.freeze({ id: 612, name: 'power-up-punch', type: 'fighting', power: 40, accuracy: 100, pp: 20, damageClass: 'physical' }),
    617: Object.freeze({ id: 617, name: 'light-of-ruin', type: 'fairy', power: 140, accuracy: 90, pp: 5, damageClass: 'special' }),
    619: Object.freeze({ id: 619, name: 'precipice-blades', type: 'ground', power: 120, accuracy: 85, pp: 10, damageClass: 'physical' }),
    662: Object.freeze({ id: 662, name: 'spirit-shackle', type: 'ghost', power: 80, accuracy: 100, pp: 10, damageClass: 'physical' }),
    663: Object.freeze({ id: 663, name: 'darkest-lariat', type: 'dark', power: 85, accuracy: 100, pp: 10, damageClass: 'physical' }),
    667: Object.freeze({ id: 667, name: 'high-horsepower', type: 'ground', power: 95, accuracy: 95, pp: 10, damageClass: 'physical' }),
    675: Object.freeze({ id: 675, name: 'throat-chop', type: 'dark', power: 80, accuracy: 100, pp: 15, damageClass: 'physical' }),
    676: Object.freeze({ id: 676, name: 'pollen-puff', type: 'bug', power: 90, accuracy: 100, pp: 15, damageClass: 'special' }),
    677: Object.freeze({ id: 677, name: 'anchor-shot', type: 'steel', power: 80, accuracy: 100, pp: 20, damageClass: 'physical' }),
    679: Object.freeze({ id: 679, name: 'lunge', type: 'bug', power: 80, accuracy: 100, pp: 15, damageClass: 'physical' }),
    680: Object.freeze({ id: 680, name: 'fire-lash', type: 'fire', power: 80, accuracy: 100, pp: 15, damageClass: 'physical' }),
    684: Object.freeze({ id: 684, name: 'smart-strike', type: 'steel', power: 70, accuracy: null, pp: 10, damageClass: 'physical' }),
    687: Object.freeze({ id: 687, name: 'core-enforcer', type: 'dragon', power: 100, accuracy: 100, pp: 10, damageClass: 'special' }),
    692: Object.freeze({ id: 692, name: 'dragon-hammer', type: 'dragon', power: 90, accuracy: 100, pp: 15, damageClass: 'physical' }),
    693: Object.freeze({ id: 693, name: 'brutal-swing', type: 'dark', power: 60, accuracy: 100, pp: 20, damageClass: 'physical' }),
    706: Object.freeze({ id: 706, name: 'psychic-fangs', type: 'psychic', power: 85, accuracy: 100, pp: 10, damageClass: 'physical' }),
    708: Object.freeze({ id: 708, name: 'shadow-bone', type: 'ghost', power: 85, accuracy: 100, pp: 10, damageClass: 'physical' }),
    709: Object.freeze({ id: 709, name: 'accelerock', type: 'rock', power: 40, accuracy: 100, pp: 20, damageClass: 'physical' }),
    710: Object.freeze({ id: 710, name: 'liquidation', type: 'water', power: 85, accuracy: 100, pp: 10, damageClass: 'physical' }),
    712: Object.freeze({ id: 712, name: 'spectral-thief', type: 'ghost', power: 90, accuracy: 100, pp: 10, damageClass: 'physical' }),
    714: Object.freeze({ id: 714, name: 'moongeist-beam', type: 'ghost', power: 100, accuracy: 100, pp: 5, damageClass: 'special' }),
    716: Object.freeze({ id: 716, name: 'zing-zap', type: 'electric', power: 80, accuracy: 100, pp: 10, damageClass: 'physical' }),
    722: Object.freeze({ id: 722, name: 'photon-geyser', type: 'psychic', power: 100, accuracy: 100, pp: 5, damageClass: 'special' }),
    730: Object.freeze({ id: 730, name: 'splishy-splash', type: 'water', power: 90, accuracy: 100, pp: 15, damageClass: 'special' }),
    731: Object.freeze({ id: 731, name: 'floaty-fall', type: 'flying', power: 90, accuracy: 95, pp: 15, damageClass: 'physical' }),
    738: Object.freeze({ id: 738, name: 'sappy-seed', type: 'grass', power: 100, accuracy: 90, pp: 10, damageClass: 'physical' }),
    740: Object.freeze({ id: 740, name: 'sparkly-swirl', type: 'fairy', power: 120, accuracy: 85, pp: 5, damageClass: 'special' }),
    744: Object.freeze({ id: 744, name: 'dynamax-cannon', type: 'dragon', power: 100, accuracy: 100, pp: 5, damageClass: 'special' }),
    776: Object.freeze({ id: 776, name: 'body-press', type: 'fighting', power: 80, accuracy: 100, pp: 10, damageClass: 'physical' }),
    780: Object.freeze({ id: 780, name: 'pyro-ball', type: 'fire', power: 120, accuracy: 90, pp: 5, damageClass: 'physical' }),
    783: Object.freeze({ id: 783, name: 'aura-wheel', type: 'electric', power: 110, accuracy: 100, pp: 10, damageClass: 'physical' }),
    786: Object.freeze({ id: 786, name: 'overdrive', type: 'electric', power: 80, accuracy: 100, pp: 10, damageClass: 'special' }),
    803: Object.freeze({ id: 803, name: 'grassy-glide', type: 'grass', power: 55, accuracy: 100, pp: 20, damageClass: 'physical' }),
    806: Object.freeze({ id: 806, name: 'skitter-smack', type: 'bug', power: 70, accuracy: 90, pp: 10, damageClass: 'physical' }),
    815: Object.freeze({ id: 815, name: 'scorching-sands', type: 'ground', power: 70, accuracy: 100, pp: 10, damageClass: 'special' }),
    822: Object.freeze({ id: 822, name: 'fiery-wrath', type: 'dark', power: 90, accuracy: 100, pp: 10, damageClass: 'special' }),
    823: Object.freeze({ id: 823, name: 'thunderous-kick', type: 'fighting', power: 90, accuracy: 100, pp: 10, damageClass: 'physical' }),
    824: Object.freeze({ id: 824, name: 'glacial-lance', type: 'ice', power: 120, accuracy: 100, pp: 5, damageClass: 'physical' }),
    825: Object.freeze({ id: 825, name: 'astral-barrage', type: 'ghost', power: 120, accuracy: 100, pp: 5, damageClass: 'special' }),
    831: Object.freeze({ id: 831, name: 'springtide-storm', type: 'fairy', power: 100, accuracy: 80, pp: 5, damageClass: 'special' }),
    833: Object.freeze({ id: 833, name: 'raging-fury', type: 'fire', power: 120, accuracy: 100, pp: 10, damageClass: 'physical' }),
    853: Object.freeze({ id: 853, name: 'axe-kick', type: 'fighting', power: 120, accuracy: 90, pp: 10, damageClass: 'physical' }),
    855: Object.freeze({ id: 855, name: 'lumina-crash', type: 'psychic', power: 80, accuracy: 100, pp: 10, damageClass: 'special' }),
    856: Object.freeze({ id: 856, name: 'order-up', type: 'dragon', power: 80, accuracy: 100, pp: 10, damageClass: 'physical' }),
    861: Object.freeze({ id: 861, name: 'ice-spinner', type: 'ice', power: 80, accuracy: 100, pp: 15, damageClass: 'physical' }),
    869: Object.freeze({ id: 869, name: 'kowtow-cleave', type: 'dark', power: 85, accuracy: null, pp: 10, damageClass: 'physical' }),
    873: Object.freeze({ id: 873, name: 'raging-bull', type: 'normal', power: 90, accuracy: 100, pp: 10, damageClass: 'physical' }),
    875: Object.freeze({ id: 875, name: 'psyblade', type: 'psychic', power: 80, accuracy: 100, pp: 15, damageClass: 'physical' }),
    884: Object.freeze({ id: 884, name: 'pounce', type: 'bug', power: 50, accuracy: 100, pp: 20, damageClass: 'physical' }),
    885: Object.freeze({ id: 885, name: 'trailblaze', type: 'grass', power: 50, accuracy: 100, pp: 20, damageClass: 'physical' }),
    887: Object.freeze({ id: 887, name: 'hyper-drill', type: 'normal', power: 100, accuracy: 100, pp: 5, damageClass: 'physical' }),
    891: Object.freeze({ id: 891, name: 'bitter-blade', type: 'fire', power: 90, accuracy: 100, pp: 10, damageClass: 'physical' }),
    892: Object.freeze({ id: 892, name: 'double-shock', type: 'electric', power: 120, accuracy: 100, pp: 5, damageClass: 'physical' }),
    893: Object.freeze({ id: 893, name: 'gigaton-hammer', type: 'steel', power: 160, accuracy: 100, pp: 5, damageClass: 'physical' }),
    901: Object.freeze({ id: 901, name: 'blood-moon', type: 'normal', power: 140, accuracy: 100, pp: 5, damageClass: 'special' }),
    902: Object.freeze({ id: 902, name: 'matcha-gotcha', type: 'grass', power: 80, accuracy: 90, pp: 15, damageClass: 'special' }),
    906: Object.freeze({ id: 906, name: 'tera-starstorm', type: 'normal', power: 120, accuracy: 100, pp: 5, damageClass: 'special' }),
    914: Object.freeze({ id: 914, name: 'alluring-voice', type: 'fairy', power: 80, accuracy: 100, pp: 10, damageClass: 'special' }),
    919: Object.freeze({ id: 919, name: 'malignant-chain', type: 'poison', power: 100, accuracy: 100, pp: 5, damageClass: 'special' })
  });

  const KNOWN_CATALOG_MOVES_BY_NAME = Object.freeze(
    Object.fromEntries(Object.values(KNOWN_CATALOG_MOVES).map(m => [m.name, m]))
  );

  const PURE_DAMAGE_MOVES = new Set([
    'pound', 'mega-punch', 'mega-kick', 'horn-attack', 'slam', 'tackle', 'scratch', 'vice-grip',
    'cut', 'gust', 'wing-attack', 'peck', 'drill-peck', 'strength', 'rock-throw', 'earthquake',
    'surf', 'egg-bomb', 'swift', 'water-gun', 'hydro-pump', 'aerial-ace', 'dragon-claw',
    'magical-leaf', 'shock-wave', 'aura-sphere', 'seed-bomb', 'x-scissor', 'power-gem',
    'power-whip', 'iron-head', 'leaf-blade', 'high-horsepower', 'throat-chop', 'smart-strike',
    'brutal-swing', 'dragon-hammer', 'hyper-voice', 'boomburst', 'brick-break', 'shadow-punch',
    'foul-play', 'acrobatics', 'phantom-force', 'dazzling-gleam', 'liquidation'
  ]);

  function getMoveCapability(input, options = {}) {
    if (!input && input !== 0) return null;
    const { throwOnMismatch = true } = options;

    let id = null;
    let rawName = null;
    let power = null;
    let damageClass = null;

    if (typeof input === 'number') {
      id = Number(input);
    } else if (typeof input === 'string') {
      rawName = input.trim().toLowerCase();
    } else if (typeof input === 'object') {
      id = input.id !== undefined && input.id !== null ? Number(input.id) : null;
      rawName = input.name ? String(input.name).trim().toLowerCase() : null;
      power = input.power !== undefined && input.power !== null ? Number(input.power) : null;
      damageClass = String(input.damageClass || input.damage_class?.name || input.damage_class || '').toLowerCase();
    }

    const normalizedName = rawName ? (MOVE_ALIASES[rawName] || rawName) : null;

    // 1. Verificação rigorosa de contradição se ID e Nome foram simultaneamente fornecidos
    if (id !== null && normalizedName !== null) {
      const defForId = CANONICAL_MOVE_DEFINITIONS[id];
      const catForId = KNOWN_CATALOG_MOVES[id];
      const expectedNameForId = defForId?.name || catForId?.name || null;

      const defForName = CANONICAL_MOVE_DEFINITIONS_BY_NAME[normalizedName];
      const catForName = KNOWN_CATALOG_MOVES_BY_NAME[normalizedName];
      const expectedIdForName = defForName?.id || catForName?.id || null;

      let isMismatch = false;
      if (expectedNameForId && expectedNameForId !== normalizedName) {
        const aliases = defForId?.aliases || [];
        if (!aliases.includes(normalizedName)) {
          isMismatch = true;
        }
      }
      if (expectedIdForName && expectedIdForName !== id) {
        const aliasesForId = defForId?.aliases || [];
        const isLegacyVineWhip = (normalizedName === 'vine-whip' && (id === 71 || id === 22));
        if (!aliasesForId.includes(normalizedName) && !isLegacyVineWhip) {
          isMismatch = true;
        }
      }

      if (isMismatch) {
        if (throwOnMismatch) {
          throw new Error(`Contradição cadastral de golpe: ID ${id} (${expectedNameForId || 'desconhecido'}) não corresponde ao nome "${rawName}" (ID esperado: ${expectedIdForName || 'desconhecido'}).`);
        }
        return null;
      }
    }

    // 2. Busca por definição canônica explícita
    const def = (id && CANONICAL_MOVE_DEFINITIONS[id]) || (normalizedName && CANONICAL_MOVE_DEFINITIONS_BY_NAME[normalizedName]);
    if (def) {
      return Object.freeze({
        id: def.id,
        name: def.name,
        supportLevel: def.supportLevel,
        requiredMechanics: [...def.requiredMechanics],
        knownPending: [...def.knownPending],
        blockedReason: def.blockedReason,
        aliases: def.aliases ? [...def.aliases] : [def.name],
        priority: def.priority !== undefined ? def.priority : getMovePriority({ name: def.name }),
        targetsDefenseWithSpAtk: Boolean(def.targetsDefenseWithSpAtk),
        usesDefenseAsAttack: Boolean(def.usesDefenseAsAttack),
        isDualTypeEffectiveness: Boolean(def.isDualTypeEffectiveness),
        drainRatio: def.drainRatio || 0,
        recoilRatio: def.recoilRatio || 0,
        isForcedSwitch: Boolean(def.isForcedSwitch)
      });
    }

    // 3. Checa golpes do catálogo conhecido
    const catEntry = (id && KNOWN_CATALOG_MOVES[id]) || (normalizedName && KNOWN_CATALOG_MOVES_BY_NAME[normalizedName]);
    if (catEntry) {
      const isPure = PURE_DAMAGE_MOVES.has(catEntry.name);
      return Object.freeze({
        id: catEntry.id,
        name: catEntry.name,
        supportLevel: isPure ? MOVE_SUPPORT_LEVEL.FULL : MOVE_SUPPORT_LEVEL.PARTIAL,
        requiredMechanics: ['STANDARD_DAMAGE'],
        knownPending: isPure ? [] : ['SECONDARY_EFFECTS_PHASE_P4'],
        blockedReason: null,
        aliases: [catEntry.name],
        priority: getMovePriority({ name: catEntry.name }),
        targetsDefenseWithSpAtk: targetsDefenseWithSpAtk({ name: catEntry.name }),
        usesDefenseAsAttack: usesDefenseAsAttack({ name: catEntry.name }),
        isDualTypeEffectiveness: isDualTypeEffectiveness({ name: catEntry.name }),
        drainRatio: getDrainRatio({ name: catEntry.name }),
        recoilRatio: getRecoilRatio({ name: catEntry.name }),
        isForcedSwitch: isForcedSwitchMove({ name: catEntry.name })
      });
    }

    // 4. Golpes de status não curados
    if (damageClass === 'status' || (power !== null && power <= 0)) {
      return Object.freeze({
        id: id || null,
        name: normalizedName || 'unknown-status',
        supportLevel: MOVE_SUPPORT_LEVEL.BLOCKED,
        requiredMechanics: ['STATUS_MOVE'],
        knownPending: ['UNSUPPORTED_STATUS_MOVE'],
        blockedReason: 'STATUS_MOVE_NOT_SUPPORTED',
        aliases: normalizedName ? [normalizedName] : [],
        priority: 0,
        targetsDefenseWithSpAtk: false,
        usesDefenseAsAttack: false,
        isDualTypeEffectiveness: false,
        drainRatio: 0,
        recoilRatio: 0,
        isForcedSwitch: false
      });
    }

    // 5. Golpes totalmente desconhecidos: NÃO são suportados
    return null;
  }

  /**
   * Valida a integridade completa dos dados de payload de um golpe.
   * Diferente da consulta pura de capacidades (getMoveCapability), exige que o objeto
   * contenha todos os dados necessários para hidratação de equipes e execução em batalha.
   *
   * Formatos aceitos:
   * 1. Registro canônico de catálogo / API:
   *    - id: inteiro positivo (> 0).
   *    - name: string não vazia.
   *    - type: string elemental ou objeto { name: 'tipo' } válido.
   *    - damageClass: 'physical', 'special' ou 'status' (ou objeto com .name).
   *    - power:
   *        - para status curado: 0 ou null.
   *        - para ofensivo: número inteiro finito > 0 compatível com definição canônica.
   *    - accuracy:
   *        - obrigatório (não pode ser undefined ou ausente).
   *        - null estritamente quando o golpe for canonicamente infalível (Always-Hit).
   *        - inteiro 1..100 compatível com a definição canônica quando não for infalível.
   *    - pp / maxPp: inteiro positivo (> 0) compatível com o teto canônico. Se ambos presentes, devem ser iguais.
   *
   * 2. Golpe normalizado em combate (Combatant Model):
   *    - Todos os atributos acima.
   *    - currentPp (opcional): se presente, inteiro entre 0 e o teto máximo de PP.
   *      Não aceita currentPp sem teto (pp ou maxPp) declarado.
   *
   * @param {Object} move - Objeto completo do golpe a ser validado.
   * @param {Object} [options] - Opções de validação.
   * @returns {boolean}
   */
  function validateMoveData(move, options = {}) {
    if (!move || typeof move !== 'object' || Array.isArray(move)) return false;

    // 1. Identidade: ID e Nome são estritamente obrigatórios no objeto completo
    if (move.id === undefined || move.id === null) return false;
    const rawId = Number(move.id);
    if (!Number.isInteger(rawId) || rawId <= 0) return false;

    if (typeof move.name !== 'string' || move.name.trim().length === 0) return false;
    const rawName = move.name.trim().toLowerCase();
    const normalizedName = MOVE_ALIASES[rawName] || rawName;

    // 1.1 Verificação de contradição cadastral entre ID e Nome
    const defForId = CANONICAL_MOVE_DEFINITIONS[rawId];
    const catForId = KNOWN_CATALOG_MOVES[rawId];
    const expectedNameForId = defForId?.name || catForId?.name || null;

    const defForName = CANONICAL_MOVE_DEFINITIONS_BY_NAME[normalizedName];
    const catForName = KNOWN_CATALOG_MOVES_BY_NAME[normalizedName];
    const expectedIdForName = defForName?.id || catForName?.id || null;

    if (expectedNameForId && expectedNameForId !== normalizedName) {
      const aliases = defForId?.aliases || [];
      if (!aliases.includes(normalizedName)) return false;
    }
    if (expectedIdForName && expectedIdForName !== rawId) {
      const aliasesForId = defForId?.aliases || [];
      const isLegacyVineWhip = (normalizedName === 'vine-whip' && (rawId === 71 || rawId === 22));
      if (!aliasesForId.includes(normalizedName) && !isLegacyVineWhip) return false;
    }

    // 2. Tipo elemental: estritamente obrigatório e deve ser tipo Pokémon válido
    const rawType = (typeof move.type === 'object' && move.type !== null && typeof move.type.name === 'string')
      ? move.type.name.trim().toLowerCase()
      : (typeof move.type === 'string' ? move.type.trim().toLowerCase() : null);
    if (!rawType || !Object.values(POKEMON_TYPES).includes(rawType)) return false;

    // 3. Categoria de Dano (damageClass): estritamente obrigatória ('physical', 'special' ou 'status')
    const rawClass = (typeof move.damageClass === 'string')
      ? move.damageClass.trim().toLowerCase()
      : ((typeof move.damage_class === 'object' && move.damage_class !== null && typeof move.damage_class.name === 'string')
          ? move.damage_class.name.trim().toLowerCase()
          : (typeof move.damage_class === 'string' ? move.damage_class.trim().toLowerCase() : null));
    if (!rawClass || (rawClass !== 'physical' && rawClass !== 'special' && rawClass !== 'status')) return false;

    // 4. Suporte mecânico no motor
    const cap = getMoveCapability(move, { throwOnMismatch: false });
    if (!cap) return false;
    if (cap.supportLevel === MOVE_SUPPORT_LEVEL.BLOCKED) return false;
    if (cap.supportLevel !== MOVE_SUPPORT_LEVEL.FULL && cap.supportLevel !== MOVE_SUPPORT_LEVEL.PARTIAL) return false;

    // 5. Teto de PP: pp, maxPp ou ambos obrigatórios
    const hasPp = move.pp !== undefined && move.pp !== null;
    const hasMaxPp = move.maxPp !== undefined && move.maxPp !== null;
    if (!hasPp && !hasMaxPp) return false;
    if (hasPp && hasMaxPp && Number(move.pp) !== Number(move.maxPp)) return false;

    const maxPp = Number(hasPp ? move.pp : move.maxPp);
    if (!Number.isInteger(maxPp) || maxPp <= 0) return false;

    // 5.1 currentPp (PP restante em combate): opcional, mas se presente deve ser válido e <= maxPp
    if (move.currentPp !== undefined && move.currentPp !== null) {
      const curPp = Number(move.currentPp);
      if (!Number.isInteger(curPp) || curPp < 0 || curPp > maxPp) return false;
    }

    // 6. Determinação canônica e validação estrita por categoria
    const canonicalStatus = (normalizedName && SUPPORTED_STATUS_MOVES[normalizedName]) ||
      (rawId && Object.values(SUPPORTED_STATUS_MOVES).find(s => s.id === rawId)) || null;

    const canonicalDef = (rawId && CANONICAL_MOVE_DEFINITIONS[rawId]) ||
      (normalizedName && CANONICAL_MOVE_DEFINITIONS_BY_NAME[normalizedName]) || null;

    const isCanonicallyStatus = Boolean(
      canonicalStatus ||
      canonicalDef?.requiredMechanics?.includes('STATUS_APPLICATION') ||
      canonicalDef?.requiredMechanics?.includes('STATUS_MOVE')
    );

    if (isCanonicallyStatus || rawClass === 'status') {
      // Se canonicamente for status mas declarou physical/special -> adulteração!
      if (rawClass !== 'status') return false;
      // Se declarou status mas não é um status curado suportado -> rejeita!
      if (!canonicalStatus) return false;
      if (rawId !== canonicalStatus.id || normalizedName !== canonicalStatus.name) return false;
      if (rawType !== canonicalStatus.type) return false;

      // Power em status move: deve estar presente e ser 0 ou null
      if (move.power === undefined) return false;
      if (move.power !== null && move.power !== 0 && Number(move.power) !== 0) return false;

      // Accuracy em status move: obrigatória e deve coincidir exatamente com a canônica
      if (move.accuracy === undefined || move.accuracy === null) return false;
      const statAcc = Number(move.accuracy);
      if (!Number.isInteger(statAcc) || statAcc !== canonicalStatus.accuracy) return false;

      // PP de status move deve bater com canônico
      if (maxPp !== canonicalStatus.pp) return false;

      return true;
    }

    // 7. Golpes ofensivos (physical ou special)
    // 7.1 Power: obrigatório, numérico, finito, inteiro e > 0
    if (move.power === undefined || move.power === null) return false;
    const powerNum = Number(move.power);
    if (!Number.isFinite(powerNum) || !Number.isInteger(powerNum) || powerNum <= 0) return false;

    // 7.2 Precisão: obrigatória (não pode ser undefined/ausente)
    if (move.accuracy === undefined) return false;

    const knownRef = (normalizedName && KNOWN_CATALOG_MOVES_BY_NAME[normalizedName]) || (rawId && KNOWN_CATALOG_MOVES[rawId]);
    if (!knownRef) {
      // Qualquer golpe ofensivo suportado no motor deve ter registro canônico conhecido
      return false;
    }

    if (rawClass !== knownRef.damageClass) return false;
    if (rawType !== knownRef.type) return false;
    if (powerNum !== knownRef.power) return false;
    if (maxPp !== knownRef.pp) return false;

    // Validação estrita de precisão contra a definição canônica conhecida
    if (knownRef.accuracy === null) {
      // Golpe canonicamente infalível: accuracy DEVE ser estritamente null
      if (move.accuracy !== null) return false;
    } else {
      // Golpe canonicamente com precisão finita (ex: Fire Blast = 85, Tackle = 100)
      // accuracy NÃO pode ser null (isso o tornaria infalível indevidamente)
      if (move.accuracy === null) return false;
      const accNum = Number(move.accuracy);
      if (!Number.isFinite(accNum) || !Number.isInteger(accNum) || accNum !== knownRef.accuracy) return false;
    }

    return true;
  }

  function isMechanicallySupportedMove(moveDetail) {
    if (!moveDetail) return false;
    if (typeof moveDetail === 'string' || typeof moveDetail === 'number') {
      const cap = getMoveCapability(moveDetail, { throwOnMismatch: false });
      return Boolean(cap && (cap.supportLevel === MOVE_SUPPORT_LEVEL.FULL || cap.supportLevel === MOVE_SUPPORT_LEVEL.PARTIAL));
    }
    if (typeof moveDetail !== 'object') return false;
    return validateMoveData(moveDetail);
  }


  const MOVE_DAMAGE_CLASSES = Object.freeze({
    PHYSICAL: 'physical',
    SPECIAL: 'special',
    STATUS: 'status'
  });

  // Apenas golpes de status curados com efeito integral suportado.
  const SUPPORTED_STATUS_MOVES = Object.freeze({
    'poison-powder': Object.freeze({ id: 77, name: 'poison-powder', type: 'poison',
      power: 0, accuracy: 75, pp: 35, damageClass: 'status', statusEffect: 'poison' }),
    'will-o-wisp': Object.freeze({ id: 261, name: 'will-o-wisp', type: 'fire',
      power: 0, accuracy: 85, pp: 15, damageClass: 'status', statusEffect: 'burn' }),
    'thunder-wave': Object.freeze({ id: 86, name: 'thunder-wave', type: 'electric',
      power: 0, accuracy: 90, pp: 20, damageClass: 'status', statusEffect: 'paralysis' })
  });

  function getSupportedStatusMove(move) {
    if (!move || typeof move !== 'object') return null;
    const canonical = SUPPORTED_STATUS_MOVES[String(move.name || '').trim().toLowerCase()];
    if (!canonical || Number(move.id) !== canonical.id ||
        String(move.type?.name || move.type || '').toLowerCase() !== canonical.type ||
        String(move.damageClass || move.damage_class?.name || '').toLowerCase() !== 'status' ||
        !(move.power === null || Number(move.power) === 0) ||
        Number(move.accuracy) !== canonical.accuracy || Number(move.pp) !== canonical.pp) return null;
    return canonical;
  }

  function isPoisonPowderImmune(types) {
    return Array.isArray(types) && types.some(type =>
      type === 'poison' || type === 'steel' || type === 'grass');
  }

  function isStatusMoveImmune(move, types) {
    if (!Array.isArray(types)) return false;
    switch (move?.name) {
      case 'poison-powder': return isPoisonPowderImmune(types);
      case 'will-o-wisp': return types.includes('fire');
      case 'thunder-wave': return types.includes('electric') || types.includes('ground');
      default: return false;
    }
  }

  function applyBurnPenalty(damage, attacker, move) {
    return attacker?.statusCondition === 'burn' && move?.damageClass === 'physical' && damage > 0
      ? Math.max(1, Math.floor(damage / 2)) : damage;
  }

  // Body Press is physical, but uses the user's Defense in place of Attack.
  function usesDefenseAsAttack(move) {
    return String(move?.name || '').trim().toLowerCase() === 'body-press';
  }

  const POKEMON_TYPES = Object.freeze({
    NORMAL: 'normal',
    FIRE: 'fire',
    WATER: 'water',
    ELECTRIC: 'electric',
    GRASS: 'grass',
    ICE: 'ice',
    FIGHTING: 'fighting',
    POISON: 'poison',
    GROUND: 'ground',
    FLYING: 'flying',
    PSYCHIC: 'psychic',
    BUG: 'bug',
    ROCK: 'rock',
    GHOST: 'ghost',
    DRAGON: 'dragon',
    DARK: 'dark',
    STEEL: 'steel',
    FAIRY: 'fairy'
  });

  const TYPE_EFFECTIVENESS_CLASSIFICATION = Object.freeze({
    IMMUNE: 'IMMUNE',
    RESISTED: 'RESISTED',
    NEUTRAL: 'NEUTRAL',
    SUPER_EFFECTIVE: 'SUPER_EFFECTIVE'
  });

  const BATTLE_CONFIG = Object.freeze({
    SIMULATION_LEVEL: 50,
    BASIC_ATTACK_POWER: 40,
    PLAYER_FIRST_ON_SPEED_TIE: true,
    MAX_TURNS_LIMIT: 100,
    MOVE_LOADOUT_MIN: 1,
    MOVE_LOADOUT_MAX: 4,
    STAB_MULTIPLIER: 1.5,
    TEAM_SIZE: 3,
    DAMAGE_VARIANCE_MIN: 85,
    DAMAGE_VARIANCE_MAX: 100,
    DAMAGE_VARIANCE_DEFAULT: 100
  });

  const AI_STRATEGY = Object.freeze({
    SIMPLE: 'SIMPLE',
    SMART: 'SMART'
  });

  const AI_DECISION_REASON = Object.freeze({
    FIRST_USABLE_MOVE: 'FIRST_USABLE_MOVE',
    BEST_EXPECTED_DAMAGE: 'BEST_EXPECTED_DAMAGE',
    GUARANTEED_KO: 'GUARANTEED_KO',
    AVOID_IMMUNITY_SWITCH: 'AVOID_IMMUNITY_SWITCH',
    STRATEGIC_MATCHUP_SWITCH: 'STRATEGIC_MATCHUP_SWITCH',
    NO_PP_SWITCH: 'NO_PP_SWITCH',
    FIRST_HEALTHY_RESERVE: 'FIRST_HEALTHY_RESERVE',
    BEST_MATCHUP_REPLACEMENT: 'BEST_MATCHUP_REPLACEMENT',
    NO_USABLE_ACTION: 'NO_USABLE_ACTION',
    STATUS_PRESSURE: 'STATUS_PRESSURE'
  });

  const AI_CONFIG = Object.freeze({
    KO_BONUS: 1000,
    SMART_SWITCH_MARGIN: 1.3
  });

  const BattleConstants = Object.freeze({
    BATTLE_STATUS,
    BATTLE_EVENTS,
    BATTLE_ACTIONS,
    SWITCH_REASON,
    MOVE_DAMAGE_CLASSES,
    SUPPORTED_STATUS_MOVES,
    getSupportedStatusMove,
    isPoisonPowderImmune,
    isStatusMoveImmune,
    applyBurnPenalty,
    usesDefenseAsAttack,
    MOVE_SUPPORT_LEVEL,
    MOVE_PRIORITIES,
    getMovePriority,
    targetsDefenseWithSpAtk,
    isDualTypeEffectiveness,
    DRAIN_MOVES,
    getDrainRatio,
    RECOIL_MOVES,
    getRecoilRatio,
    isForcedSwitchMove,
    CANONICAL_MOVE_DEFINITIONS,
    CANONICAL_MOVE_DEFINITIONS_BY_NAME,
    MOVE_ALIASES,
    KNOWN_CATALOG_MOVES,
    getMoveCapability,
    validateMoveData,
    isMechanicallySupportedMove,
    POKEMON_TYPES,
    TYPE_EFFECTIVENESS_CLASSIFICATION,
    BATTLE_CONFIG,
    AI_STRATEGY,
    AI_DECISION_REASON,
    AI_CONFIG
  });

  // Suporte universal (Node.js & Browser)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BattleConstants;
  } else if (typeof window !== 'undefined') {
    window.PBABattle = window.PBABattle || {};
    Object.assign(window.PBABattle, BattleConstants);
  }
})();
