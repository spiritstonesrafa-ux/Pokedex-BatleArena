/**
 * ====================================================================
 * CONSTANTES DA SESSÃO DE BATALHA: (battle-session-constants.js)
 * ====================================================================
 * Define estados da UI, limites de requisições e pool de oponentes para a
 * camada de orquestração jogável da Battle Arena (PBA-013).
 *
 * Suporta Node.js (CommonJS) e Navegadores (window.PBABattleSession).
 */

(function () {
  const battleConstants = typeof module !== 'undefined' && module.exports
    ? require('../battle/battle-constants.js') : (typeof window !== 'undefined' ? (window.PBABattle?.BattleConstants || window.PBABattle || {}) : {});
  const BATTLE_UI_STATES = Object.freeze({
    NO_TEAM: 'NO_TEAM',
    READY: 'READY',
    PREPARING: 'PREPARING',
    BATTLE: 'BATTLE',
    AWAITING_PLAYER_ACTION: 'AWAITING_PLAYER_ACTION',
    RESOLVING: 'RESOLVING',
    AWAITING_PLAYER_REPLACEMENT: 'AWAITING_PLAYER_REPLACEMENT',
    VICTORY: 'VICTORY',
    DEFEAT: 'DEFEAT',
    ERROR: 'ERROR'
  });

  const MOVESET_LOADOUT_SOURCE = Object.freeze({
    CAMPAIGN_FIXED_MOVESET: 'CAMPAIGN_FIXED_MOVESET',
    API_MOVESET: 'API_MOVESET',
    LIMITED_API_MOVESET: 'LIMITED_API_MOVESET',
    UNSUPPORTED_ENGINE_MOVESET: 'UNSUPPORTED_ENGINE_MOVESET',
    NETWORK_FALLBACK_MOVESET: 'NETWORK_FALLBACK_MOVESET'
  });

  const MOVESET_LIMIT_REASON = Object.freeze({
    NONE: 'NONE',
    ENGINE_CAPABILITY_LIMIT: 'ENGINE_CAPABILITY_LIMIT',
    ZERO_SUPPORTED_ENGINE_MOVES: 'ZERO_SUPPORTED_ENGINE_MOVES',
    NETWORK_FALLBACK: 'NETWORK_FALLBACK'
  });

  const SESSION_CONFIG = Object.freeze({
    TEAM_SIZE: 3,
    MOVE_LOADOUT_MIN: 1,
    MOVE_LOADOUT_MAX: 4,
    MOVE_LOADOUT_TARGET: 4,
    MOVE_DISCOVERY_WINDOW_SIZE: 8,
    MOVE_DISCOVERY_INITIAL_BUDGET: 24,
    MOVE_CANDIDATE_POOL_TARGET: 8,
    MAX_MOVE_DETAIL_REQUESTS_PER_POKEMON: 8, // Mantido para compatibilidade regressiva de testes legados
    // Pool balanceada de espécies da 1ª Geração (Kanto #1–151) com diversidade elemental
    KANTO_OPPONENT_POOL: Object.freeze([
      3,   // Venusaur (Grass/Poison)
      6,   // Charizard (Fire/Flying)
      9,   // Blastoise (Water)
      25,  // Pikachu (Electric)
      38,  // Ninetales (Fire)
      59,  // Arcanine (Fire)
      65,  // Alakazam (Psychic)
      68,  // Machamp (Fighting)
      94,  // Gengar (Ghost/Poison)
      130, // Gyarados (Water/Flying)
      131, // Lapras (Water/Ice)
      143, // Snorlax (Normal)
      149  // Dragonite (Dragon/Flying)
    ])
  });

  /**
   * Catálogo de golpes ofensivos cuja mecânica especial de dano/tipo não pode ser representada
   * pelo modelo de batalha atual (PBA-014C-FINAL-HARDENING / PBA-014C-CLOSE).
   * Motivos:
   * - 'hidden-power': tipo dinâmico derivado dos IVs do Pokémon (DYNAMIC_TYPE_FROM_IVS).
   * - 'eruption': poder variável dependente do HP restante do usuário (POWER_FROM_USER_HP).
   * - 'water-spout': poder variável dependente do HP restante do usuário (POWER_FROM_USER_HP).
   */
  const UNSUPPORTED_COMPLEX_MOVES = Object.freeze({
    // Dynamic typing
    'judgment': Object.freeze({ name: 'judgment', category: 'UNSUPPORTED_DYNAMIC_TYPE', reason: 'DYNAMIC_TYPE_FROM_ITEM' }),
    'techno-blast': Object.freeze({ name: 'techno-blast', category: 'UNSUPPORTED_DYNAMIC_TYPE', reason: 'DYNAMIC_TYPE_FROM_ITEM' }),
    'multi-attack': Object.freeze({ name: 'multi-attack', category: 'UNSUPPORTED_DYNAMIC_TYPE', reason: 'DYNAMIC_TYPE_FROM_ITEM' }),
    'tera-blast': Object.freeze({ name: 'tera-blast', category: 'UNSUPPORTED_DYNAMIC_TYPE', reason: 'DYNAMIC_TYPE_FROM_TERA' }),

    // Variable damage based on user HP

    // Variable damage based on weight / speed

    // Self-destruct / suicide attacks
    'explosion': Object.freeze({ name: 'explosion', category: 'UNSUPPORTED_SELF_DESTRUCT', reason: 'USER_FAINTS_ON_USE' }),
    'self-destruct': Object.freeze({ name: 'self-destruct', category: 'UNSUPPORTED_SELF_DESTRUCT', reason: 'USER_FAINTS_ON_USE' }),
    'memento': Object.freeze({ name: 'memento', category: 'UNSUPPORTED_SELF_DESTRUCT', reason: 'USER_FAINTS_ON_USE' }),
    'misty-explosion': Object.freeze({ name: 'misty-explosion', category: 'UNSUPPORTED_SELF_DESTRUCT', reason: 'USER_FAINTS_ON_USE' }),
    'final-gambit': Object.freeze({ name: 'final-gambit', category: 'UNSUPPORTED_SELF_DESTRUCT', reason: 'USER_FAINTS_ON_USE' }),

    // Recharge turn required
    'hyper-beam': Object.freeze({ name: 'hyper-beam', category: 'UNSUPPORTED_RECHARGE', reason: 'RECHARGE_TURN_REQUIRED' }),
    'giga-impact': Object.freeze({ name: 'giga-impact', category: 'UNSUPPORTED_RECHARGE', reason: 'RECHARGE_TURN_REQUIRED' }),
    'blast-burn': Object.freeze({ name: 'blast-burn', category: 'UNSUPPORTED_RECHARGE', reason: 'RECHARGE_TURN_REQUIRED' }),
    'frenzy-plant': Object.freeze({ name: 'frenzy-plant', category: 'UNSUPPORTED_RECHARGE', reason: 'RECHARGE_TURN_REQUIRED' }),
    'hydro-cannon': Object.freeze({ name: 'hydro-cannon', category: 'UNSUPPORTED_RECHARGE', reason: 'RECHARGE_TURN_REQUIRED' }),
    'rock-wrecker': Object.freeze({ name: 'rock-wrecker', category: 'UNSUPPORTED_RECHARGE', reason: 'RECHARGE_TURN_REQUIRED' }),
    'roar-of-time': Object.freeze({ name: 'roar-of-time', category: 'UNSUPPORTED_RECHARGE', reason: 'RECHARGE_TURN_REQUIRED' }),
    'meteor-assault': Object.freeze({ name: 'meteor-assault', category: 'UNSUPPORTED_RECHARGE', reason: 'RECHARGE_TURN_REQUIRED' }),
    'prismatic-laser': Object.freeze({ name: 'prismatic-laser', category: 'UNSUPPORTED_RECHARGE', reason: 'RECHARGE_TURN_REQUIRED' }),
    'eternabeam': Object.freeze({ name: 'eternabeam', category: 'UNSUPPORTED_RECHARGE', reason: 'RECHARGE_TURN_REQUIRED' }),

    // Two-turn charge or semi-invulnerability
    'solar-beam': Object.freeze({ name: 'solar-beam', category: 'UNSUPPORTED_TWO_TURN', reason: 'CHARGE_TURN_REQUIRED' }),
    'solar-blade': Object.freeze({ name: 'solar-blade', category: 'UNSUPPORTED_TWO_TURN', reason: 'CHARGE_TURN_REQUIRED' }),
    'sky-attack': Object.freeze({ name: 'sky-attack', category: 'UNSUPPORTED_TWO_TURN', reason: 'CHARGE_TURN_REQUIRED' }),
    'razor-wind': Object.freeze({ name: 'razor-wind', category: 'UNSUPPORTED_TWO_TURN', reason: 'CHARGE_TURN_REQUIRED' }),
    'skull-bash': Object.freeze({ name: 'skull-bash', category: 'UNSUPPORTED_TWO_TURN', reason: 'CHARGE_TURN_REQUIRED' }),
    'freeze-shock': Object.freeze({ name: 'freeze-shock', category: 'UNSUPPORTED_TWO_TURN', reason: 'CHARGE_TURN_REQUIRED' }),
    'ice-burn': Object.freeze({ name: 'ice-burn', category: 'UNSUPPORTED_TWO_TURN', reason: 'CHARGE_TURN_REQUIRED' }),
    'geomancy': Object.freeze({ name: 'geomancy', category: 'UNSUPPORTED_TWO_TURN', reason: 'CHARGE_TURN_REQUIRED' }),
    'meteor-beam': Object.freeze({ name: 'meteor-beam', category: 'UNSUPPORTED_TWO_TURN', reason: 'CHARGE_TURN_REQUIRED' }),
    'electro-shot': Object.freeze({ name: 'electro-shot', category: 'UNSUPPORTED_TWO_TURN', reason: 'CHARGE_TURN_REQUIRED' }),
    'fly': Object.freeze({ name: 'fly', category: 'UNSUPPORTED_TWO_TURN', reason: 'SEMI_INVULNERABLE_TURN' }),
    'dig': Object.freeze({ name: 'dig', category: 'UNSUPPORTED_TWO_TURN', reason: 'SEMI_INVULNERABLE_TURN' }),
    'dive': Object.freeze({ name: 'dive', category: 'UNSUPPORTED_TWO_TURN', reason: 'SEMI_INVULNERABLE_TURN' }),
    'bounce': Object.freeze({ name: 'bounce', category: 'UNSUPPORTED_TWO_TURN', reason: 'SEMI_INVULNERABLE_TURN' }),
    'phantom-force': Object.freeze({ name: 'phantom-force', category: 'UNSUPPORTED_TWO_TURN', reason: 'SEMI_INVULNERABLE_TURN' }),
    'shadow-force': Object.freeze({ name: 'shadow-force', category: 'UNSUPPORTED_TWO_TURN', reason: 'SEMI_INVULNERABLE_TURN' }),
    'sky-drop': Object.freeze({ name: 'sky-drop', category: 'UNSUPPORTED_TWO_TURN', reason: 'SEMI_INVULNERABLE_TURN' }),
    'focus-punch': Object.freeze({ name: 'focus-punch', category: 'UNSUPPORTED_TWO_TURN', reason: 'CHARGE_FAILS_IF_HIT' }),

    // Recoil damage to user
    'take-down': Object.freeze({ name: 'take-down', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'double-edge': Object.freeze({ name: 'double-edge', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'submission': Object.freeze({ name: 'submission', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'brave-bird': Object.freeze({ name: 'brave-bird', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'flare-blitz': Object.freeze({ name: 'flare-blitz', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'wood-hammer': Object.freeze({ name: 'wood-hammer', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'head-smash': Object.freeze({ name: 'head-smash', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'volt-tackle': Object.freeze({ name: 'volt-tackle', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'wild-charge': Object.freeze({ name: 'wild-charge', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'head-charge': Object.freeze({ name: 'head-charge', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'struggle': Object.freeze({ name: 'struggle', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'chloroblast': Object.freeze({ name: 'chloroblast', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'wave-crash': Object.freeze({ name: 'wave-crash', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'supercell-slam': Object.freeze({ name: 'supercell-slam', category: 'UNSUPPORTED_RECOIL', reason: 'RECOIL_DAMAGE_TO_USER' }),
    'jump-kick': Object.freeze({ name: 'jump-kick', category: 'UNSUPPORTED_RECOIL', reason: 'CRASH_DAMAGE_ON_MISS' }),
    'high-jump-kick': Object.freeze({ name: 'high-jump-kick', category: 'UNSUPPORTED_RECOIL', reason: 'CRASH_DAMAGE_ON_MISS' }),
    'steel-beam': Object.freeze({ name: 'steel-beam', category: 'UNSUPPORTED_RECOIL', reason: 'USER_LOSES_HALF_MAX_HP' }),
    'mind-blown': Object.freeze({ name: 'mind-blown', category: 'UNSUPPORTED_RECOIL', reason: 'USER_LOSES_HALF_MAX_HP' }),

    // Multi-turn locking / confusion
    'outrage': Object.freeze({ name: 'outrage', category: 'UNSUPPORTED_MULTI_TURN_LOCK', reason: 'LOCKED_AND_CONFUSED' }),
    'thrash': Object.freeze({ name: 'thrash', category: 'UNSUPPORTED_MULTI_TURN_LOCK', reason: 'LOCKED_AND_CONFUSED' }),
    'petal-dance': Object.freeze({ name: 'petal-dance', category: 'UNSUPPORTED_MULTI_TURN_LOCK', reason: 'LOCKED_AND_CONFUSED' }),
    'uproar': Object.freeze({ name: 'uproar', category: 'UNSUPPORTED_MULTI_TURN_LOCK', reason: 'LOCKED_FOR_TURNS' }),
    'rollout': Object.freeze({ name: 'rollout', category: 'UNSUPPORTED_MULTI_TURN_LOCK', reason: 'LOCKED_FOR_TURNS' }),
    'ice-ball': Object.freeze({ name: 'ice-ball', category: 'UNSUPPORTED_MULTI_TURN_LOCK', reason: 'LOCKED_FOR_TURNS' }),

    // Fixed or target HP-based damage
    'dragon-rage': Object.freeze({ name: 'dragon-rage', category: 'UNSUPPORTED_FIXED_OR_HP_DAMAGE', reason: 'FIXED_DAMAGE_40' }),
    'sonic-boom': Object.freeze({ name: 'sonic-boom', category: 'UNSUPPORTED_FIXED_OR_HP_DAMAGE', reason: 'FIXED_DAMAGE_20' }),
    'seismic-toss': Object.freeze({ name: 'seismic-toss', category: 'UNSUPPORTED_FIXED_OR_HP_DAMAGE', reason: 'DAMAGE_EQUAL_TO_LEVEL' }),
    'night-shade': Object.freeze({ name: 'night-shade', category: 'UNSUPPORTED_FIXED_OR_HP_DAMAGE', reason: 'DAMAGE_EQUAL_TO_LEVEL' }),
    'super-fang': Object.freeze({ name: 'super-fang', category: 'UNSUPPORTED_FIXED_OR_HP_DAMAGE', reason: 'HALF_TARGET_CURRENT_HP' }),
    'nature-s-madness': Object.freeze({ name: 'nature-s-madness', category: 'UNSUPPORTED_FIXED_OR_HP_DAMAGE', reason: 'HALF_TARGET_CURRENT_HP' }),
    'natures-madness': Object.freeze({ name: 'natures-madness', category: 'UNSUPPORTED_FIXED_OR_HP_DAMAGE', reason: 'HALF_TARGET_CURRENT_HP' }),
    'ruination': Object.freeze({ name: 'ruination', category: 'UNSUPPORTED_FIXED_OR_HP_DAMAGE', reason: 'HALF_TARGET_CURRENT_HP' }),

    // Counter / reflection damage

    // Multi-hit moves
    'double-slap': Object.freeze({ name: 'double-slap', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'comet-punch': Object.freeze({ name: 'comet-punch', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'fury-attack': Object.freeze({ name: 'fury-attack', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'pin-missile': Object.freeze({ name: 'pin-missile', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'spike-cannon': Object.freeze({ name: 'spike-cannon', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'barrage': Object.freeze({ name: 'barrage', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'fury-swipes': Object.freeze({ name: 'fury-swipes', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'bone-rush': Object.freeze({ name: 'bone-rush', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'bullet-seed': Object.freeze({ name: 'bullet-seed', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'icicle-spear': Object.freeze({ name: 'icicle-spear', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'rock-blast': Object.freeze({ name: 'rock-blast', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'tail-slap': Object.freeze({ name: 'tail-slap', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'arm-thrust': Object.freeze({ name: 'arm-thrust', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'water-shuriken': Object.freeze({ name: 'water-shuriken', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'scale-shot': Object.freeze({ name: 'scale-shot', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_2_TO_5_TIMES' }),
    'double-hit': Object.freeze({ name: 'double-hit', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_TWICE' }),
    'dual-wingbeat': Object.freeze({ name: 'dual-wingbeat', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_TWICE' }),
    'dual-chop': Object.freeze({ name: 'dual-chop', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_TWICE' }),
    'twineedle': Object.freeze({ name: 'twineedle', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_TWICE' }),
    'double-kick': Object.freeze({ name: 'double-kick', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_TWICE' }),
    'gear-grind': Object.freeze({ name: 'gear-grind', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_TWICE' }),
    'bonemerang': Object.freeze({ name: 'bonemerang', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_TWICE' }),
    'tachyon-cutter': Object.freeze({ name: 'tachyon-cutter', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_TWICE' }),
    'dragon-darts': Object.freeze({ name: 'dragon-darts', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_TWICE' }),
    'twin-beam': Object.freeze({ name: 'twin-beam', category: 'UNSUPPORTED_MULTI_HIT', reason: 'HITS_TWICE' }),

    // Progressive damage
    'fury-cutter': Object.freeze({ name: 'fury-cutter', category: 'UNSUPPORTED_PROGRESSIVE_DAMAGE', reason: 'DOUBLES_ON_CONSECUTIVE_HITS' }),
    'echoed-voice': Object.freeze({ name: 'echoed-voice', category: 'UNSUPPORTED_PROGRESSIVE_DAMAGE', reason: 'INCREASES_ON_CONSECUTIVE_TURNS' }),

    // Special calculation / not matching static power
    'spit-up': Object.freeze({ name: 'spit-up', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'DEPENDS_ON_STOCKPILE' }),
    'present': Object.freeze({ name: 'present', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'RANDOM_POWER_OR_HEAL' }),
    'beat-up': Object.freeze({ name: 'beat-up', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'PARTY_MEMBERS_ATTACK' }),
    'foul-play': Object.freeze({ name: 'foul-play', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'USES_TARGET_ATTACK_STAT' }),
    'trump-card': Object.freeze({ name: 'trump-card', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'POWER_DEPENDS_ON_REMAINING_PP' }),
    'crush-grip': Object.freeze({ name: 'crush-grip', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'POWER_DEPENDS_ON_TARGET_HP' }),
    'wring-out': Object.freeze({ name: 'wring-out', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'POWER_DEPENDS_ON_TARGET_HP' }),
    'punishment': Object.freeze({ name: 'punishment', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'POWER_DEPENDS_ON_TARGET_STAT_BOOSTS' }),
    'power-trip': Object.freeze({ name: 'power-trip', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'POWER_DEPENDS_ON_USER_STAT_BOOSTS' }),
    'stored-power': Object.freeze({ name: 'stored-power', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'POWER_DEPENDS_ON_USER_STAT_BOOSTS' }),
    'electro-drift': Object.freeze({ name: 'electro-drift', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'SPECIAL_SUPER_EFFECTIVE_BOOST' }),
    'collision-course': Object.freeze({ name: 'collision-course', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'SPECIAL_SUPER_EFFECTIVE_BOOST' }),
    'glaive-rush': Object.freeze({ name: 'glaive-rush', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'USER_VULNERABLE_NEXT_TURN' }),
    'future-sight': Object.freeze({ name: 'future-sight', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'DEFERRED_DAMAGE_2_TURNS' }),
    'doom-desire': Object.freeze({ name: 'doom-desire', category: 'UNSUPPORTED_SPECIAL_CALCULATION', reason: 'DEFERRED_DAMAGE_2_TURNS' }),

    // Conditional / Weather / Terrain / Status / Item dependent
    'weather-ball': Object.freeze({ name: 'weather-ball', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DEPENDS_ON_WEATHER' }),
    'terrain-pulse': Object.freeze({ name: 'terrain-pulse', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DEPENDS_ON_TERRAIN' }),
    'poltergeist': Object.freeze({ name: 'poltergeist', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DEPENDS_ON_TARGET_ITEM' }),
    'fling': Object.freeze({ name: 'fling', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DEPENDS_ON_HELD_ITEM' }),
    'natural-gift': Object.freeze({ name: 'natural-gift', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DEPENDS_ON_HELD_BERRY' }),
    'acrobatics': Object.freeze({ name: 'acrobatics', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DOUBLES_WITHOUT_HELD_ITEM' }),
    'belch': Object.freeze({ name: 'belch', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'REQUIRES_CONSUMED_BERRY' }),
    'burn-up': Object.freeze({ name: 'burn-up', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'USER_LOSES_FIRE_TYPE' }),
    'facade': Object.freeze({ name: 'facade', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DOUBLES_ON_STATUS_CONDITION' }),
    'hex': Object.freeze({ name: 'hex', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DOUBLES_ON_STATUS_CONDITION' }),
    'venoshock': Object.freeze({ name: 'venoshock', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DOUBLES_ON_POISON_CONDITION' }),
    'smelling-salts': Object.freeze({ name: 'smelling-salts', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DOUBLES_ON_PARALYSIS_CONDITION' }),
    'wake-up-slap': Object.freeze({ name: 'wake-up-slap', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DOUBLES_ON_SLEEP_CONDITION' }),
    'brine': Object.freeze({ name: 'brine', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DOUBLES_ON_HALF_TARGET_HP' }),
    'retaliate': Object.freeze({ name: 'retaliate', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DOUBLES_ON_FAINT_LAST_TURN' }),
    'lash-out': Object.freeze({ name: 'lash-out', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DOUBLES_ON_STAT_DROP_THIS_TURN' }),
    'burning-jealousy': Object.freeze({ name: 'burning-jealousy', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DEPENDS_ON_TARGET_STAT_BOOST' }),
    'expanding-force': Object.freeze({ name: 'expanding-force', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DEPENDS_ON_PSYCHIC_TERRAIN' }),
    'rising-voltage': Object.freeze({ name: 'rising-voltage', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'DEPENDS_ON_ELECTRIC_TERRAIN' }),
    'steel-roller': Object.freeze({ name: 'steel-roller', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'REQUIRES_ACTIVE_TERRAIN' }),
    'last-resort': Object.freeze({ name: 'last-resort', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'REQUIRES_ALL_MOVES_USED' }),
    'snore': Object.freeze({ name: 'snore', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'REQUIRES_USER_ASLEEP' }),
    'dream-eater': Object.freeze({ name: 'dream-eater', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'REQUIRES_TARGET_ASLEEP' }),
    'synchronoise': Object.freeze({ name: 'synchronoise', category: 'UNSUPPORTED_CONDITIONAL_DAMAGE', reason: 'REQUIRES_MATCHING_TYPE' }),

    // --- AUTO-DEBUFF / PENALIDADE DE ATRIBUTO NÃO IMPLEMENTADA (Poder desbalanceado sem a penalidade) ---
    'headlong-rush': Object.freeze({ name: 'headlong-rush', category: 'UNSUPPORTED_SELF_DEBUFF', reason: 'UNIMPLEMENTED_HARSH_STAT_DROP' }),
    'armor-cannon': Object.freeze({ name: 'armor-cannon', category: 'UNSUPPORTED_SELF_DEBUFF', reason: 'UNIMPLEMENTED_HARSH_STAT_DROP' }),
    'v-create': Object.freeze({ name: 'v-create', category: 'UNSUPPORTED_SELF_DEBUFF', reason: 'UNIMPLEMENTED_HARSH_STAT_DROP' }),
    'dragon-ascent': Object.freeze({ name: 'dragon-ascent', category: 'UNSUPPORTED_SELF_DEBUFF', reason: 'UNIMPLEMENTED_HARSH_STAT_DROP' }),
    'hammer-arm': Object.freeze({ name: 'hammer-arm', category: 'UNSUPPORTED_SELF_DEBUFF', reason: 'UNIMPLEMENTED_HARSH_STAT_DROP' }),
    'ice-hammer': Object.freeze({ name: 'ice-hammer', category: 'UNSUPPORTED_SELF_DEBUFF', reason: 'UNIMPLEMENTED_HARSH_STAT_DROP' }),
    'spin-out': Object.freeze({ name: 'spin-out', category: 'UNSUPPORTED_SELF_DEBUFF', reason: 'UNIMPLEMENTED_HARSH_STAT_DROP' }),
    'make-it-rain': Object.freeze({ name: 'make-it-rain', category: 'UNSUPPORTED_SELF_DEBUFF', reason: 'UNIMPLEMENTED_HARSH_STAT_DROP' }),
    'hyperspace-fury': Object.freeze({ name: 'hyperspace-fury', category: 'UNSUPPORTED_SELF_DEBUFF', reason: 'UNIMPLEMENTED_HARSH_STAT_DROP' }),
    'clanging-scales': Object.freeze({ name: 'clanging-scales', category: 'UNSUPPORTED_SELF_DEBUFF', reason: 'UNIMPLEMENTED_HARSH_STAT_DROP' }),
    'clangorous-soulblaze': Object.freeze({ name: 'clangorous-soulblaze', category: 'UNSUPPORTED_SELF_DEBUFF', reason: 'UNIMPLEMENTED_HARSH_STAT_DROP' })
  });

  /**
   * Determina se um golpe é mecanicamente suportado pelo Battle Engine atual.
   * Diferencia consulta de capacidade (identificador de golpe) da validação de integridade de payload.
   * Quando recebe um objeto representando um golpe, valida estritamente seus dados com validateMoveData.
   *
   * @param {Object|string|number} moveDetail - Objeto ou identificador do golpe.
   * @returns {boolean}
   */
  function isMechanicallySupportedMove(moveDetail) {
    if (!moveDetail) return false;

    // Obtém battleConstants de forma segura e universal (Node.js e Browser)
    const bc = typeof module !== 'undefined' && module.exports
      ? (function () {
          try { return require('../battle/battle-constants.js'); } catch (_) { return battleConstants; }
        })()
      : ((typeof window !== 'undefined' && window.PBABattle) ? window.PBABattle : battleConstants);

    // 1. Consulta pura de capacidade por identificador (string ou number)
    if (typeof moveDetail === 'string' || typeof moveDetail === 'number') {
      if (bc && typeof bc.getMoveCapability === 'function') {
        try {
          const capability = bc.getMoveCapability(moveDetail, { throwOnMismatch: false });
          if (!capability) return false;

          const blockedLevel = bc.MOVE_SUPPORT_LEVEL?.BLOCKED || 'BLOCKED';
          if (capability.supportLevel === blockedLevel) return false;

          const fullLevel = bc.MOVE_SUPPORT_LEVEL?.FULL || 'FULL';
          const partialLevel = bc.MOVE_SUPPORT_LEVEL?.PARTIAL || 'PARTIAL';
          return capability.supportLevel === fullLevel || capability.supportLevel === partialLevel;
        } catch (_) {
          return false;
        }
      }
      const name = String(moveDetail).trim().toLowerCase();
      return !UNSUPPORTED_COMPLEX_MOVES[name];
    }

    if (typeof moveDetail !== 'object') return false;

    // 2. Validação rigorosa de integridade de payload de golpe
    if (bc && typeof bc.validateMoveData === 'function') {
      try {
        return bc.validateMoveData(moveDetail);
      } catch (_) {
        return false;
      }
    }

    // Fallback defensivo estrito caso battle-constants não esteja carregado
    const name = String(moveDetail.name || '').trim().toLowerCase();
    if (UNSUPPORTED_COMPLEX_MOVES[name]) return false;
    if (bc?.isProtectMove?.(moveDetail)) return true;
    if (bc?.getSupportedStatusMove?.(moveDetail)) return true;
    if (bc?.isLevelDamageMove?.(moveDetail)) return true;
    if (bc?.isConstantDamageMove?.(moveDetail)) return true;

    const dmgClass = String(moveDetail.damageClass || moveDetail.damage_class?.name || moveDetail.damage_class || '').toLowerCase();
    if (dmgClass !== 'physical' && dmgClass !== 'special') return false;

    const power = Number(moveDetail.power);
    if (!Number.isFinite(power) || power <= 0) return false;

    return true;
  }

  function validateMoveData(moveDetail, options) {
    const bc = typeof module !== 'undefined' && module.exports
      ? (function () {
          try { return require('../battle/battle-constants.js'); } catch (_) { return battleConstants; }
        })()
      : ((typeof window !== 'undefined' && window.PBABattle) ? window.PBABattle : battleConstants);

    if (bc && typeof bc.validateMoveData === 'function') {
      return bc.validateMoveData(moveDetail, options);
    }
    return isMechanicallySupportedMove(moveDetail);
  }

  const constants = {
    BATTLE_UI_STATES,
    SESSION_CONFIG,
    MOVESET_LOADOUT_SOURCE,
    MOVESET_LIMIT_REASON,
    UNSUPPORTED_COMPLEX_MOVES,
    STAT_STAGE_KEYS: battleConstants.STAT_STAGE_KEYS,
    getEffectiveStat: battleConstants.getEffectiveStat,
    applyStatStageChange: battleConstants.applyStatStageChange,
    resetStatStages: battleConstants.resetStatStages,
    validateMoveData,
    isMechanicallySupportedMove,
    isLevelDamageMove: battleConstants.isLevelDamageMove,
    isConstantDamageMove: battleConstants.isConstantDamageMove,
    isFractionalDamageMove: battleConstants.isFractionalDamageMove,
    PROTECT_MOVES: battleConstants.PROTECT_MOVES,
    isProtectMove: battleConstants.isProtectMove,
    PROTECT_BYPASSING_MOVES: battleConstants.PROTECT_BYPASSING_MOVES,
    isProtectBypassingMove: battleConstants.isProtectBypassingMove,
    getSecondaryEffect: battleConstants.getSecondaryEffect,
    isStatusConditionImmune: battleConstants.isStatusConditionImmune,
    isEligibleForStatusCondition: battleConstants.isEligibleForStatusCondition
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = constants;
  } else if (typeof window !== 'undefined') {
    window.PBABattleSession = window.PBABattleSession || {};
    Object.assign(window.PBABattleSession, constants);
  }
})();
