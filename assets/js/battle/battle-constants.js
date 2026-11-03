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
    MOVE_FAILED: 'MOVE_FAILED',
    MOVE_PREPARED: 'MOVE_PREPARED',
    MULTI_HIT_COMPLETE: 'MULTI_HIT_COMPLETE',
    HP_HEALED: 'HP_HEALED',
    DROWSY_APPLIED: 'DROWSY_APPLIED',
    DROWSY_ENDED: 'DROWSY_ENDED',
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
    DOUBLES_REPLACEMENT_REQUIRED:'DOUBLES_REPLACEMENT_REQUIRED',
    TEAM_DEFEATED: 'TEAM_DEFEATED',
    BATTLE_ENDED: 'BATTLE_ENDED',
    STAT_STAGE_CHANGED: 'STAT_STAGE_CHANGED',
    FLINCH_APPLIED: 'FLINCH_APPLIED',
    FLINCH_IMMOBILIZED: 'FLINCH_IMMOBILIZED',
    STATUS_CURED: 'STATUS_CURED',
    CONFUSION_APPLIED: 'CONFUSION_APPLIED',
    CONFUSION_BLOCKED: 'CONFUSION_BLOCKED',
    CONFUSION_CHECK: 'CONFUSION_CHECK',
    CONFUSION_DAMAGE: 'CONFUSION_DAMAGE',
    CONFUSION_ENDED: 'CONFUSION_ENDED'
  });

  const BATTLE_ACTIONS = Object.freeze({
    MOVE: 'MOVE',
    RECHARGE: 'RECHARGE',
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
    'protect': 4,
    'detect': 4,
    'fake-out': 3,
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
    if (typeof move.priority === 'number') return move.priority;
    const id = Number(move.id);
    if (id === 182 || id === 197) return 4;
    const name = String(move.name || '').trim().toLowerCase();
    return P6.moves[id]?.priority ?? P5.get(move)?.priority ?? MOVE_PRIORITIES[name] ?? 0;
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
    'dream-eater': 0.5,
    'giga-drain': 0.5,
    'drain-punch': 0.5,
    'leech-life': 0.5,
    'absorb': 0.5,
    'mega-drain': 0.5,
    'draining-kiss': 0.75,
    'horn-leech': 0.5,
    'bitter-blade': 0.5,
    'parabolic-charge': 0.5,
    'matcha-gotcha': 0.5
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

  const STAT_STAGE_KEYS = Object.freeze(['attack', 'defense', 'specialAttack', 'specialDefense', 'speed']);

  const STAT_BOOST_MOVES = Object.freeze({
    'swords-dance': Object.freeze({ attack: 2 }),
    'calm-mind': Object.freeze({ specialAttack: 1, specialDefense: 1 })
  });

  const SELF_STAT_DROP_MOVES = Object.freeze({
    'close-combat': Object.freeze({ defense: -1, specialDefense: -1 }),
    'overheat': Object.freeze({ specialAttack: -2 }),
    'draco-meteor': Object.freeze({ specialAttack: -2 })
  });

  function getStatBoosts(move) {
    if (!move) return null;
    const name = String(move.name || '').trim().toLowerCase();
    return STAT_BOOST_MOVES[name] || move.statBoosts || null;
  }

  function getSelfStatDrops(move) {
    if (P5.drops[Number(move?.id)]) return P5.drops[Number(move.id)];
    if (!move) return null;
    const name = String(move.name || '').trim().toLowerCase();
    return SELF_STAT_DROP_MOVES[name] || move.selfStatDrops || null;
  }

  const Completion = typeof module !== 'undefined' && module.exports ? require('./move-completion.js') : window.PBAMoveCompletion;
  const Critical = typeof module !== 'undefined' && module.exports ? require('./critical-mechanics.js') : window.PBACriticalMechanics;
  const P8 = typeof module !== 'undefined' && module.exports ? require('./p8-mechanics.js') : window.PBAP8Mechanics;
  const P7 = typeof module !== 'undefined' && module.exports ? require('./p7-mechanics.js') : window.PBAP7Mechanics;
  const P6 = typeof module !== 'undefined' && module.exports ? require('./p6-mechanics.js') : window.PBAP6Mechanics;
  const P5 = typeof module !== 'undefined' && module.exports ? require('./p5-mechanics.js') : window.PBAP5Mechanics;
  const P4Catalog = typeof module !== 'undefined' && module.exports ? require('./p4-secondary-catalog.js') : (window.PBAP4SecondaryCatalog || {effects:{},definitions:{},moves:{},defrost:[]});
  const AbilityRegistry = typeof module !== 'undefined' && module.exports ? require('./ability-registry.js') : window.PBAAbilityRegistry;
  const MoveFlags = typeof module !== 'undefined' && module.exports ? require('./move-flags.js') : window.PBAMoveFlags;
  const SECONDARY_EFFECT_MOVES = Object.freeze({
    'twineedle': Object.freeze({id:41,name:'twineedle',chance:20,statusCondition:'poison'}),
    ...P4Catalog.effects,
    'alluring-voice': Object.freeze({id:914,name:'alluring-voice',target:'defender',chance:100,confusion:true,requiresRaisedStats:true}),
    'snore': Object.freeze({id:173,name:'snore',target:'defender',chance:30,flinch:true}),
    'fake-out': Object.freeze({ id: 252, name: 'fake-out', flinch: true, chance: 100, target: 'defender', requiredMechanics: Object.freeze(['PHYSICAL_DAMAGE', 'SECONDARY_FLINCH', 'FIRST_ACTION_AFTER_ENTRY']), requiresDamage: true, requiresHit: true }),
    'thunderbolt': Object.freeze({
      id: 85,
      name: 'thunderbolt',
      statusCondition: 'paralysis',
      chance: 10,
      target: 'defender',
      requiredMechanics: Object.freeze(['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE']),
      requiresDamage: true,
      requiresHit: true
    }),
    'flamethrower': Object.freeze({
      id: 53,
      name: 'flamethrower',
      statusCondition: 'burn',
      chance: 10,
      target: 'defender',
      requiredMechanics: Object.freeze(['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE']),
      requiresDamage: true,
      requiresHit: true
    }),
    'sludge-bomb': Object.freeze({
      id: 188,
      name: 'sludge-bomb',
      statusCondition: 'poison',
      chance: 30,
      target: 'defender',
      requiredMechanics: Object.freeze(['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE']),
      requiresDamage: true,
      requiresHit: true
    }),
    'poison-jab': Object.freeze({
      id: 398,
      name: 'poison-jab',
      statusCondition: 'poison',
      chance: 30,
      target: 'defender',
      requiredMechanics: Object.freeze(['PHYSICAL_DAMAGE', 'SECONDARY_STATUS_CHANCE']),
      requiresDamage: true,
      requiresHit: true
    }),
    'scald': Object.freeze({
      id: 503,
      name: 'scald',
      statusCondition: 'burn',
      chance: 30,
      target: 'defender',
      requiredMechanics: Object.freeze(['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE']),
      requiresDamage: true,
      requiresHit: true
    }),
    'shadow-ball': Object.freeze({
      id: 247,
      name: 'shadow-ball',
      statDrops: Object.freeze({ specialDefense: -1 }),
      chance: 20,
      target: 'defender',
      requiredMechanics: Object.freeze(['SPECIAL_DAMAGE', 'SECONDARY_STAT_DROP']),
      requiresDamage: true,
      requiresHit: true
    }),
    'psychic': Object.freeze({
      id: 94,
      name: 'psychic',
      statDrops: Object.freeze({ specialDefense: -1 }),
      chance: 10,
      target: 'defender',
      requiredMechanics: Object.freeze(['SPECIAL_DAMAGE', 'SECONDARY_STAT_DROP']),
      requiresDamage: true,
      requiresHit: true
    }),
    'crunch': Object.freeze({
      id: 242,
      name: 'crunch',
      statDrops: Object.freeze({ defense: -1 }),
      chance: 20,
      target: 'defender',
      requiredMechanics: Object.freeze(['PHYSICAL_DAMAGE', 'SECONDARY_STAT_DROP']),
      requiresDamage: true,
      requiresHit: true
    }),
    'ancient-power': Object.freeze({
      id: 246,
      name: 'ancient-power',
      statBoosts: Object.freeze({
        attack: 1,
        defense: 1,
        specialAttack: 1,
        specialDefense: 1,
        speed: 1
      }),
      chance: 10,
      target: 'attacker',
      requiredMechanics: Object.freeze(['SPECIAL_DAMAGE', 'SECONDARY_STAT_BOOST']),
      requiresDamage: true,
      requiresHit: true
    }),
    'bite': Object.freeze({
      id: 44,
      name: 'bite',
      flinch: true,
      chance: 30,
      target: 'defender',
      requiredMechanics: Object.freeze(['PHYSICAL_DAMAGE', 'SECONDARY_FLINCH']),
      requiresDamage: true,
      requiresHit: true
    }),
    'rock-slide': Object.freeze({
      id: 157,
      name: 'rock-slide',
      flinch: true,
      chance: 30,
      target: 'defender',
      requiredMechanics: Object.freeze(['PHYSICAL_DAMAGE', 'SECONDARY_FLINCH']),
      requiresDamage: true,
      requiresHit: true
    }),
    'ice-beam': Object.freeze({
      id: 58,
      name: 'ice-beam',
      statusCondition: 'freeze',
      chance: 10,
      target: 'defender',
      requiredMechanics: Object.freeze(['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE']),
      requiresDamage: true,
      requiresHit: true
    }),
    'blizzard': Object.freeze({
      id: 59,
      name: 'blizzard',
      statusCondition: 'freeze',
      chance: 10,
      target: 'defender',
      requiredMechanics: Object.freeze(['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE']),
      requiresDamage: true,
      requiresHit: true
    }),
    'water-pulse': Object.freeze({
      id: 352,
      name: 'water-pulse',
      confusion: true,
      chance: 20,
      target: 'defender',
      requiredMechanics: Object.freeze(['SPECIAL_DAMAGE', 'SECONDARY_CONFUSION_CHANCE']),
      requiresDamage: true,
      requiresHit: true
    })
  });

  const SECONDARY_EFFECT_MOVES_BY_ID = Object.freeze(
    Object.fromEntries(Object.values(SECONDARY_EFFECT_MOVES).map(m => [m.id, m]))
  );

  function getSecondaryEffect(move) {
    if(Number(move?.id)===239)return {id:239,name:'twister',chance:20,flinch:true};
    if(Number(move?.id)===143)return {id:143,name:'sky-attack',chance:30,flinch:true};
    if (Number(move?.id)===855 && (!move.name || move.name==='lumina-crash')) return {id:855,name:'lumina-crash',chance:100,statDrops:{specialDefense:-2}};
    if (!move) return null;
    const rawId = move.id !== undefined && move.id !== null ? Number(move.id) : null;
    const rawName = move.name ? String(move.name).trim().toLowerCase() : (typeof move === 'string' ? move.trim().toLowerCase() : null);
    const normalizedName = rawName ? (MOVE_ALIASES[rawName] || rawName) : null;

    if (rawId && SECONDARY_EFFECT_MOVES_BY_ID[rawId]) {
      return SECONDARY_EFFECT_MOVES_BY_ID[rawId];
    }
    if (normalizedName && SECONDARY_EFFECT_MOVES[normalizedName]) {
      return SECONDARY_EFFECT_MOVES[normalizedName];
    }
    return null;
  }

  function createDefaultStatStages() {
    return {
      attack: 0,
      defense: 0,
      specialAttack: 0,
      specialDefense: 0,
      speed: 0
    };
  }

  function sanitizeStatStages(stages) {
    const clean = createDefaultStatStages();
    if (!stages || typeof stages !== 'object') return clean;
    for (const key of STAT_STAGE_KEYS) {
      if (stages[key] !== undefined && stages[key] !== null) {
        const val = Math.trunc(Number(stages[key]) || 0);
        clean[key] = Math.max(-6, Math.min(6, val));
      }
    }
    return clean;
  }

  function getStatStageMultiplier(stage) {
    const s = Math.max(-6, Math.min(6, Math.trunc(Number(stage) || 0)));
    return s >= 0 ? (2 + s) / 2 : 2 / (2 - s);
  }

  function getEffectiveAccuracy(move, attacker, defender) {
    if (P5.ohko(move)) return P5.accuracy(move,attacker,defender);
    if(defender?.minimized&&P6.minimizeHits.includes(Number(move.id)))return null;
    const weatherAccuracy=P7.accuracy(move,attacker,defender,move.accuracy);
    if(weatherAccuracy===null||move.accuracy==='ALWAYS_HIT')return null;
    if(move.id===92&&attacker.types?.includes('poison'))return null;
    // Keen Eye: ignore positive evasion of target (treat defender evasionStage as min(0, stage))
    const attackerHasKeenEye = !attacker?.abilitySuppressed && P7.ability(attacker)==='keen-eye' && !attacker?.abilityIgnored;
    const rawDefenderEvasion = Completion.ignoresStages(move)?0:(Number(defender.evasionStage)||0);
    const effectiveDefenderEvasion = attackerHasKeenEye ? 0 : rawDefenderEvasion;
    const stage=Math.max(-6,Math.min(6,(Number(attacker.accuracyStage)||0)-effectiveDefenderEvasion));
    return Math.min(100,Math.floor(Number(weatherAccuracy)*(stage>=0?(3+stage)/3:3/(3-stage))));
  }

  function getEffectiveStat(combatant, statKey) {
    if (!combatant || typeof combatant !== 'object') return 1;
    const base = Number(combatant[statKey])*P7.stat(combatant,statKey);
    if (!Number.isFinite(base) || base <= 0) return 1;
    if (!STAT_STAGE_KEYS.includes(statKey)) return Math.max(1, Math.floor(base));

    const stage = combatant.statStages ? Number(combatant.statStages[statKey]) || 0 : 0;
    const clampedStage = Math.max(-6, Math.min(6, Math.trunc(stage)));

    if (clampedStage === 0) {
      return Math.max(1, Math.floor(base));
    }
    if (clampedStage > 0) {
      return Math.max(1, Math.floor((base * (2 + clampedStage)) / 2));
    }
    return Math.max(1, Math.floor((base * 2) / (2 - clampedStage)));
  }

  function applyStatStageChange(combatant, statKey, delta) {
    if(delta<0&&(combatant.p7BlockDrop||statKey==='attack'&&combatant.p7BlockAttackDrop)){const previousStage=['accuracy','evasion'].includes(statKey)?combatant[statKey+'Stage']||0:combatant.statStages?.[statKey]||0;return {statKey,previousStage,requestedDelta:delta,appliedDelta:0,finalStage:previousStage,blockedReason:'ABILITY'};}
    // Keen Eye: block accuracy reductions caused by opponents
    if(delta<0&&statKey==='accuracy'&&combatant.p7KeenEyeAccuracyBlock&&!combatant.abilityIgnored&&!combatant.abilitySuppressed){const previousStage=combatant.accuracyStage||0;return {statKey,previousStage,requestedDelta:delta,appliedDelta:0,finalStage:previousStage,blockedReason:'ABILITY'};}
    if (['accuracy','evasion'].includes(statKey)) {
      const key=statKey+'Stage', previousStage=Math.max(-6,Math.min(6,Number(combatant[key])||0)), requestedDelta=Math.trunc(Number(delta)||0);
      const finalStage=Math.max(-6,Math.min(6,previousStage+requestedDelta));combatant[key]=finalStage;if(finalStage>previousStage)combatant.statsRaisedThisTurn=true;
      return {statKey,previousStage,requestedDelta,appliedDelta:finalStage-previousStage,finalStage,blockedReason:finalStage===previousStage?(requestedDelta<0?'AT_MIN':'AT_MAX'):null};
    }
    if (!combatant || typeof combatant !== 'object') {
      throw new Error('Combatente inválido para alteração de estágio de atributo.');
    }
    if (!STAT_STAGE_KEYS.includes(statKey)) {
      throw new Error(`Atributo inválido para alteração de estágio: "${statKey}".`);
    }
    if (!combatant.statStages || typeof combatant.statStages !== 'object') {
      combatant.accuracyStage=0;combatant.evasionStage=0;
    combatant.statStages = createDefaultStatStages();
    }
    const previousStage = Number(combatant.statStages[statKey]) || 0;
    const requestedDelta = Math.trunc(Number(delta) || 0);

    let targetStage = previousStage + requestedDelta;
    let blockedReason = null;

    if (requestedDelta > 0 && previousStage >= 6) {
      targetStage = 6;
      blockedReason = 'AT_MAX';
    } else if (requestedDelta < 0 && previousStage <= -6) {
      targetStage = -6;
      blockedReason = 'AT_MIN';
    } else {
      targetStage = Math.max(-6, Math.min(6, targetStage));
    }

    const appliedDelta = targetStage - previousStage;
    if(appliedDelta>0)combatant.statsRaisedThisTurn=true;
    combatant.statStages[statKey] = targetStage;

    return {
      combatant,
      statKey,
      previousStage,
      requestedDelta,
      appliedDelta,
      finalStage: targetStage,
      blockedReason
    };
  }

  function resetStatStages(combatant) {
    if (!combatant || typeof combatant !== 'object') return;
    combatant.accuracyStage=0;combatant.evasionStage=0;
    combatant.statStages = createDefaultStatStages();
    return combatant.statStages;
  }

  const MOVE_ALIASES = Object.freeze({
    'nature-s-madness': 'natures-madness',
    'natures-madness': 'natures-madness'
  });

  const LEVEL_DAMAGE_MOVES = Object.freeze({
    69: Object.freeze({ id: 69, name: 'seismic-toss', type: 'fighting', damageClass: 'physical', accuracy: 100, pp: 20 }),
    101: Object.freeze({ id: 101, name: 'night-shade', type: 'ghost', damageClass: 'special', accuracy: 100, pp: 15 })
  });

  function isLevelDamageMove(move) {
    if (!move) return false;
    let id = null;
    let name = null;
    if (typeof move === 'number') {
      id = Number(move);
    } else if (typeof move === 'string') {
      name = move.trim().toLowerCase();
    } else if (typeof move === 'object') {
      if (move.id !== undefined && move.id !== null) {
        id = Number(move.id);
      }
      if (move.name) {
        name = String(move.name).trim().toLowerCase();
      }
    }

    if (id !== null && name !== null) {
      if (id === 69 && name === 'seismic-toss') return true;
      if (id === 101 && name === 'night-shade') return true;
      return false;
    }
    if (id !== null) {
      return id === 69 || id === 101;
    }
    if (name !== null) {
      return name === 'seismic-toss' || name === 'night-shade';
    }
    return false;
  }

  const FRACTIONAL_DAMAGE_MOVES = Object.freeze({
    162: Object.freeze({"id":162,"name":"super-fang","type":"normal","damageClass":"physical","power":null,"accuracy":90,"pp":10}),
    717: Object.freeze({"id":717,"name":"natures-madness","type":"fairy","damageClass":"special","power":null,"accuracy":90,"pp":10}),
    877: Object.freeze({"id":877,"name":"ruination","type":"dark","damageClass":"special","power":1,"accuracy":90,"pp":10}),
  });
  function isFractionalDamageMove(move) {
    if (!move) return false;
    const id = typeof move === 'number' ? move : (typeof move === 'object' && move.id != null ? Number(move.id) : null);
    const rawName = typeof move === 'string' ? move.trim().toLowerCase() : (typeof move === 'object' && move.name ? String(move.name).trim().toLowerCase() : null);
    const name = rawName ? (MOVE_ALIASES[rawName] || rawName) : null;
    const entry = id !== null ? FRACTIONAL_DAMAGE_MOVES[id] : Object.values(FRACTIONAL_DAMAGE_MOVES).find(m => m.name === name);
    return Boolean(entry && (name === null || entry.name === name));
  }
  function isValidFractionalDamagePower(move) {
    if (!isFractionalDamageMove(move)) return false;
    const p = move.power;
    if (p == null || p === 0 || p === '0') return true;
    // PokéAPI uses a sentinel power of 1 for Ruination; this is not its damage formula.
    return (move.id === 877 || move.name === 'ruination') && (p === 1 || p === '1');
  }
  function getFractionalDamageAmount(currentHp) {
    if (!Number.isInteger(currentHp) || currentHp < 0) throw new Error('HP atual inválido para dano fracionário.');
    return currentHp === 0 ? 0 : Math.max(1, Math.floor(currentHp / 2));
  }

  const CONSTANT_DAMAGE_MOVES = Object.freeze({
    49: Object.freeze({ id: 49, name: 'sonic-boom', type: 'normal', damageClass: 'special', accuracy: 90, pp: 20, damage: 20 }),
    82: Object.freeze({ id: 82, name: 'dragon-rage', type: 'dragon', damageClass: 'special', accuracy: 100, pp: 10, damage: 40 })
  });

  function isConstantDamageMove(move) {
    if (!move) return false;
    let id = null;
    let name = null;
    if (typeof move === 'number') {
      id = Number(move);
    } else if (typeof move === 'string') {
      name = move.trim().toLowerCase();
    } else if (typeof move === 'object') {
      if (move.id !== undefined && move.id !== null) {
        id = Number(move.id);
      }
      if (move.name) {
        name = String(move.name).trim().toLowerCase();
      }
    }

    if (id !== null && name !== null) {
      if (id === 49 && name === 'sonic-boom') return true;
      if (id === 82 && name === 'dragon-rage') return true;
      return false;
    }
    if (id !== null) {
      return id === 49 || id === 82;
    }
    if (name !== null) {
      return name === 'sonic-boom' || name === 'dragon-rage';
    }
    return false;
  }

  function getConstantDamageAmount(move) {
    if (!move) return null;
    if (typeof move === 'number') {
      return CONSTANT_DAMAGE_MOVES[move]?.damage || null;
    }
    if (typeof move === 'string') {
      const name = move.trim().toLowerCase();
      const found = Object.values(CONSTANT_DAMAGE_MOVES).find(m => m.name === name);
      return found?.damage || null;
    }
    if (typeof move === 'object') {
      const id = (move.id !== undefined && move.id !== null) ? Number(move.id) : null;
      const name = move.name ? String(move.name).trim().toLowerCase() : null;
      if (id !== null && name !== null) {
        if (id === 49 && name === 'sonic-boom') return 20;
        if (id === 82 && name === 'dragon-rage') return 40;
        return null;
      }
      if (id !== null && CONSTANT_DAMAGE_MOVES[id]) {
        return CONSTANT_DAMAGE_MOVES[id].damage;
      }
      if (name !== null) {
        const found = Object.values(CONSTANT_DAMAGE_MOVES).find(m => m.name === name);
        return found?.damage || null;
      }
    }
    return null;
  }

  const MULTI_HIT_MOVES = Object.freeze(Object.fromEntries(Object.entries({"24":{"id":24,"name":"double-kick","minHits":2,"maxHits":2},"41":{"id":41,"name":"twineedle","minHits":2,"maxHits":2},"292":{"id":292,"name":"arm-thrust","minHits":2,"maxHits":5},"331":{"id":331,"name":"bullet-seed","minHits":2,"maxHits":5},"333":{"id":333,"name":"icicle-spear","minHits":2,"maxHits":5},"350":{"id":350,"name":"rock-blast","minHits":2,"maxHits":5},"594":{"id":594,"name":"water-shuriken","minHits":2,"maxHits":5}}).map(([id, move]) => [id, Object.freeze(move)])));
  function getMultiHitMove(move) {
    if (!move) return null;
    return MULTI_HIT_MOVES[Number(move.id)] || P5.multiHits[Number(move.id)] || Object.values(MULTI_HIT_MOVES).find(m => m.name === move.name) || null;
  }
  function getMultiHitCount(move, roll = 1) {
    const config = getMultiHitMove(move);
    if (!config) return 1;
    if (config.minHits === config.maxHits) return config.minHits;
    if (!Number.isInteger(roll) || roll < 1 || roll > 100) throw new Error('Rolagem de quantidade de acertos inválida.');
    return roll <= 35 ? 2 : roll <= 70 ? 3 : roll <= 85 ? 4 : 5;
  }

  // Modern recharge family. Official PokéAPI metadata; only successful hits lock the following turn.
  const RECHARGE_MOVES = Object.freeze({
    63:Object.freeze({"id":63,"name":"hyper-beam","type":"normal","power":150,"pp":5,"accuracy":90,"damageClass":"special"}),
    307:Object.freeze({"id":307,"name":"blast-burn","type":"fire","power":150,"pp":5,"accuracy":90,"damageClass":"special"}),
    308:Object.freeze({"id":308,"name":"hydro-cannon","type":"water","power":150,"pp":5,"accuracy":90,"damageClass":"special"}),
    338:Object.freeze({"id":338,"name":"frenzy-plant","type":"grass","power":150,"pp":5,"accuracy":90,"damageClass":"special"}),
    416:Object.freeze({"id":416,"name":"giga-impact","type":"normal","power":150,"pp":5,"accuracy":90,"damageClass":"physical"}),
    439:Object.freeze({"id":439,"name":"rock-wrecker","type":"rock","power":150,"pp":5,"accuracy":90,"damageClass":"physical"}),
    459:Object.freeze({"id":459,"name":"roar-of-time","type":"dragon","power":150,"pp":5,"accuracy":90,"damageClass":"special"}),
    711:Object.freeze({"id":711,"name":"prismatic-laser","type":"psychic","power":160,"pp":10,"accuracy":100,"damageClass":"special"}),
    794:Object.freeze({"id":794,"name":"meteor-assault","type":"fighting","power":150,"pp":5,"accuracy":100,"damageClass":"physical"}),
    795:Object.freeze({"id":795,"name":"eternabeam","type":"dragon","power":160,"pp":5,"accuracy":90,"damageClass":"special"})
  });
  const isRechargeMove = move => Boolean(RECHARGE_MOVES[Number(move?.id)] && (!move.name || move.name===RECHARGE_MOVES[Number(move.id)].name));

  // Modern Protect / Detect family (Gen VI+ consecutive failure mechanics).
  const PROTECT_MOVES = Object.freeze({
    182: Object.freeze({ id: 182, name: 'protect', type: 'normal', power: null, accuracy: null, pp: 10, damageClass: 'status', priority: 4, target: 'self' }),
    197: Object.freeze({ id: 197, name: 'detect', type: 'fighting', power: null, accuracy: null, pp: 5, damageClass: 'status', priority: 4, target: 'self' })
  });
  const isProtectMove = move => Boolean(move?.p8MaxGuard)||Boolean(PROTECT_MOVES[Number(move?.id)] && (!move.name || move.name === PROTECT_MOVES[Number(move.id)].name)) || (typeof move?.name === 'string' && ['protect', 'detect'].includes(move.name.trim().toLowerCase()));

  // Moves that bypass protection without breaking it (Hyper Drill #887)
  const PROTECT_BYPASSING_MOVES = Object.freeze([887]);
  const isProtectBypassingMove = move => {
    if (!move) return false;
    const id = Number(move.id);
    if (PROTECT_BYPASSING_MOVES.includes(id)) return true;
    const name = String(move.name || '').trim().toLowerCase();
    return name === 'hyper-drill' || name === 'hyperdrill';
  };

  // Two-turn charge and semi-invulnerability family (Gen VI+)
  const TWO_TURN_MOVES = Object.freeze({
    76: Object.freeze({
      id: 76,
      name: 'solar-beam',
      type: 'grass',
      power: 120,
      accuracy: 100,
      pp: 10,
      damageClass: 'special',
      semiInvulnerable: null,
      prepReason: 'CHARGE_SOLAR'
    }),
    19: Object.freeze({
      id: 19,
      name: 'fly',
      type: 'flying',
      power: 90,
      accuracy: 95,
      pp: 15,
      damageClass: 'physical',
      semiInvulnerable: 'airborne',
      prepReason: 'FLY_UP'
    }),
    91: Object.freeze({
      id: 91,
      name: 'dig',
      type: 'ground',
      power: 80,
      accuracy: 100,
      pp: 10,
      damageClass: 'physical',
      semiInvulnerable: 'underground',
      prepReason: 'DIG_UNDERGROUND'
    }),
    291: Object.freeze({
      id: 291,
      name: 'dive',
      type: 'water',
      power: 80,
      accuracy: 100,
      pp: 10,
      damageClass: 'physical',
      semiInvulnerable: 'underwater',
      prepReason: 'DIVE_UNDERWATER'
    }),
    340: Object.freeze({
      id: 340,
      name: 'bounce',
      type: 'flying',
      power: 85,
      accuracy: 85,
      pp: 5,
      damageClass: 'physical',
      semiInvulnerable: 'airborne',
      prepReason: 'BOUNCE_UP',
      secondaryEffect: Object.freeze({
        id: 340,
        name: 'bounce',
        chance: 30,
        target: 'defender',
        requiresHit: true,
        requiresDamage: true,
        statusCondition: 'paralysis',
        requiredMechanics: Object.freeze(['PHYSICAL_DAMAGE', 'TWO_TURN_SEMI_INVULNERABLE', 'SECONDARY_STATUS_CHANCE'])
      })
    }),
    ...Object.fromEntries([13,130,143].map(id=>[id,Object.freeze({...P6.moves[id],semiInvulnerable:null,prepReason:'CHARGE_GENERIC'})]))
  });

  const SEMI_INVULNERABLE_STATES = Object.freeze({
    AIRBORNE: 'airborne',
    UNDERGROUND: 'underground',
    UNDERWATER: 'underwater'
  });

  function isTwoTurnMove(move) {
    if (!move) return false;
    const id = typeof move === 'number' ? move : Number(move.id);
    if (TWO_TURN_MOVES[id]) {
      return !move.name || move.name === TWO_TURN_MOVES[id].name;
    }
    const name = String(move.name || (typeof move === 'string' ? move : '')).trim().toLowerCase();
    return Object.values(TWO_TURN_MOVES).some(m => m.name === name);
  }

  function getTwoTurnMove(move) {
    if (!move) return null;
    const id = typeof move === 'number' ? move : Number(move.id);
    if (TWO_TURN_MOVES[id]) return TWO_TURN_MOVES[id];
    const name = String(move.name || (typeof move === 'string' ? move : '')).trim().toLowerCase();
    return Object.values(TWO_TURN_MOVES).find(m => m.name === name) || null;
  }

  function canHitSemiInvulnerable(move, state, attacker = null) {
    if (!move || !state) return false;
    const id = Number(move.id);
    const name = String(move.name || '').trim().toLowerCase();

    // Poison-type user using Toxic bypasses semi-invulnerability across all states (Gen 6+)
    if (id === 92 || name === 'toxic') {
      const attackerTypes = Array.isArray(attacker?.types) ? attacker.types : (attacker?.type ? [attacker.type] : []);
      if (attackerTypes.includes('poison')) return true;
    }

    if (state === 'airborne') {
      // Gust (16), Twister (239), Thunder (87), Hurricane (542), Sky Uppercut (327)
      return [16, 239, 87, 542, 327].includes(id) || ['gust', 'twister', 'thunder', 'hurricane', 'sky-uppercut'].includes(name);
    }

    if (state === 'underground') {
      // Only Earthquake and Magnitude reach an underground target.
      return [89, 222].includes(id) || ['earthquake', 'magnitude'].includes(name);
    }

    if (state === 'underwater') {
      // Surf (57), Whirlpool (250)
      return [57, 250].includes(id) || ['surf', 'whirlpool'].includes(name);
    }

    return false;
  }

  function getSemiInvulnerableDamageMultiplier(move, state) {
    if (!move || !state) return 1;
    const id = Number(move.id);
    const name = String(move.name || '').trim().toLowerCase();

    if (state === 'airborne') {
      if (id === 16 || id === 239 || name === 'gust' || name === 'twister') return 2;
    }

    if (state === 'underground') {
      if (id === 89 || id === 222 || name === 'earthquake' || name === 'magnitude') return 2;
    }

    if (state === 'underwater') {
      if (id === 57 || id === 250 || name === 'surf' || name === 'whirlpool') return 2;
    }

    return 1;
  }

  const CANONICAL_MOVE_DEFINITIONS = Object.freeze({
    182: Object.freeze({ id: 182, name: 'protect', supportLevel: 'FULL', requiredMechanics: ['STATUS', 'PROTECTION', 'PRIORITY'], knownPending: [], blockedReason: null, priority: 4 }),
    164: Object.freeze({ id: 164, name: 'substitute', supportLevel: 'FULL', requiredMechanics: ['STATUS', 'SUBSTITUTE'], knownPending: [], blockedReason: null, priority: 0 }),
    269: Object.freeze({ id: 269, name: 'taunt', supportLevel: 'FULL', requiredMechanics: ['STATUS', 'TAUNT'], knownPending: [], blockedReason: null, priority: 0 }),
    668: Object.freeze({ id: 668, name: 'strength-sap', supportLevel: 'FULL', requiredMechanics: ['STATUS', 'STAT_DROP', 'HEAL'], knownPending: [], blockedReason: null, priority: 0 }),
    197: Object.freeze({ id: 197, name: 'detect', supportLevel: 'FULL', requiredMechanics: ['STATUS', 'PROTECTION', 'PRIORITY'], knownPending: [], blockedReason: null, priority: 4 }),
    49: Object.freeze({ id: 49, name: 'sonic-boom', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'FIXED_DAMAGE_CONSTANT'], knownPending: [], blockedReason: null, priority: 0 }),
    82: Object.freeze({ id: 82, name: 'dragon-rage', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'FIXED_DAMAGE_CONSTANT'], knownPending: [], blockedReason: null, priority: 0 }),
    69: Object.freeze({ id: 69, name: 'seismic-toss', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'FIXED_DAMAGE_LEVEL'], knownPending: [], blockedReason: null, priority: 0 }),
    101: Object.freeze({ id: 101, name: 'night-shade', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'FIXED_DAMAGE_LEVEL'], knownPending: [], blockedReason: null, priority: 0 }),
    331: Object.freeze({"id":331,"name":"bullet-seed","supportLevel":"FULL","requiredMechanics":["PHYSICAL_DAMAGE","MULTI_HIT"],"knownPending":[],"blockedReason":null,"priority":0}),
    333: Object.freeze({"id":333,"name":"icicle-spear","supportLevel":"FULL","requiredMechanics":["PHYSICAL_DAMAGE","MULTI_HIT"],"knownPending":[],"blockedReason":null,"priority":0}),
    350: Object.freeze({"id":350,"name":"rock-blast","supportLevel":"FULL","requiredMechanics":["PHYSICAL_DAMAGE","MULTI_HIT"],"knownPending":[],"blockedReason":null,"priority":0}),
    292: Object.freeze({"id":292,"name":"arm-thrust","supportLevel":"FULL","requiredMechanics":["PHYSICAL_DAMAGE","MULTI_HIT"],"knownPending":[],"blockedReason":null,"priority":0}),
    24: Object.freeze({"id":24,"name":"double-kick","supportLevel":"FULL","requiredMechanics":["PHYSICAL_DAMAGE","MULTI_HIT"],"knownPending":[],"blockedReason":null,"priority":0}),
    41: Object.freeze({"id":41,"name":"twineedle","supportLevel":"FULL","requiredMechanics":["PHYSICAL_DAMAGE","MULTI_HIT","SECONDARY_STATUS_CHANCE"],"knownPending":[],"blockedReason":null,"priority":0}),
    594: Object.freeze({"id":594,"name":"water-shuriken","supportLevel":"FULL","requiredMechanics":["SPECIAL_DAMAGE","POSITIVE_PRIORITY","MULTI_HIT"],"knownPending":[],"blockedReason":null,"priority":1}),
    ...P4Catalog.definitions,
    47: Object.freeze({"id":47,"name":"sing","supportLevel":"FULL","requiredMechanics":["STATUS_APPLICATION"],"knownPending":[],"blockedReason":null,"priority":0}),
    142: Object.freeze({"id":142,"name":"lovely-kiss","supportLevel":"FULL","requiredMechanics":["STATUS_APPLICATION"],"knownPending":[],"blockedReason":null,"priority":0}),
    320: Object.freeze({"id":320,"name":"grass-whistle","supportLevel":"FULL","requiredMechanics":["STATUS_APPLICATION"],"knownPending":[],"blockedReason":null,"priority":0}),
    78: Object.freeze({"id":78,"name":"stun-spore","supportLevel":"FULL","requiredMechanics":["STATUS_APPLICATION"],"knownPending":[],"blockedReason":null,"priority":0}),
    137: Object.freeze({"id":137,"name":"glare","supportLevel":"FULL","requiredMechanics":["STATUS_APPLICATION"],"knownPending":[],"blockedReason":null,"priority":0}),
    139: Object.freeze({"id":139,"name":"poison-gas","supportLevel":"FULL","requiredMechanics":["STATUS_APPLICATION"],"knownPending":[],"blockedReason":null,"priority":0}),
    499: Object.freeze({id:499,name:'clear-smog',supportLevel:'FULL',requiredMechanics:['SPECIAL_DAMAGE','RESET_TARGET_STAGES'],knownPending:[],blockedReason:null,priority:0}),
    914: Object.freeze({id:914,name:'alluring-voice',supportLevel:'FULL',requiredMechanics:['SPECIAL_DAMAGE','CONDITIONAL_CONFUSION'],knownPending:[],blockedReason:null,priority:0}),
    156: Object.freeze({"id":156,"name":"rest","supportLevel":"FULL","requiredMechanics":["SELF_HEAL","REST_SLEEP"],"knownPending":[],"blockedReason":null,"priority":0}),
    214: Object.freeze({"id":214,"name":"sleep-talk","supportLevel":"FULL","requiredMechanics":["SLEEP_USABLE","CALLED_MOVE"],"knownPending":[],"blockedReason":null,"priority":0}),
    281: Object.freeze({"id":281,"name":"yawn","supportLevel":"FULL","requiredMechanics":["DELAYED_SLEEP"],"knownPending":[],"blockedReason":null,"priority":0}),
    173: Object.freeze({"id":173,"name":"snore","supportLevel":"FULL","requiredMechanics":["SLEEP_USABLE","SECONDARY_FLINCH"],"knownPending":[],"blockedReason":null,"priority":0}),
    138: Object.freeze({"id":138,"name":"dream-eater","supportLevel":"FULL","requiredMechanics":["SLEEP_TARGET_REQUIRED","HP_DRAIN"],"knownPending":[],"blockedReason":null,"priority":0}),
    252: Object.freeze({ id: 252, name: 'fake-out', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY', 'SECONDARY_FLINCH', 'FIRST_ACTION_AFTER_ENTRY'], knownPending: [], blockedReason: null, priority: 3, secondaryEffect: SECONDARY_EFFECT_MOVES['fake-out'] }),
    // --- FULL SUPPORT (Efeitos integralmente implementados e testados) ---
    14: Object.freeze({ id: 14, name: 'swords-dance', supportLevel: 'FULL', requiredMechanics: ['STAT_STAGE_BOOST'], knownPending: [], blockedReason: null, priority: 0, statBoosts: Object.freeze({ attack: 2 }) }),
    44: Object.freeze({ id: 44, name: 'bite', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'SECONDARY_FLINCH'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['bite'] }),
    53: Object.freeze({ id: 53, name: 'flamethrower', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['flamethrower'] }),
    58: Object.freeze({ id: 58, name: 'ice-beam', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['ice-beam'] }),
    59: Object.freeze({ id: 59, name: 'blizzard', supportLevel: 'PARTIAL', requiredMechanics: ['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE'], knownPending: ['WEATHER_ACCURACY_PHASE_P7'], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['blizzard'] }),
    109: Object.freeze({ id: 109, name: 'confuse-ray', supportLevel: 'FULL', requiredMechanics: ['CONFUSION_APPLICATION'], knownPending: [], blockedReason: null, priority: 0 }),
    71: Object.freeze({ id: 71, name: 'absorb', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5, aliases: ['absorb'] }),
    72: Object.freeze({ id: 72, name: 'mega-drain', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),
    77: Object.freeze({ id: 77, name: 'poison-powder', supportLevel: 'FULL', requiredMechanics: ['STATUS_APPLICATION'], knownPending: [], blockedReason: null, priority: 0 }),
    79: Object.freeze({ id: 79, name: 'sleep-powder', supportLevel: 'FULL', requiredMechanics: ['STATUS_APPLICATION'], knownPending: [], blockedReason: null, priority: 0 }),
    85: Object.freeze({ id: 85, name: 'thunderbolt', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['thunderbolt'] }),
    86: Object.freeze({ id: 86, name: 'thunder-wave', supportLevel: 'FULL', requiredMechanics: ['STATUS_APPLICATION'], knownPending: [], blockedReason: null, priority: 0 }),
    94: Object.freeze({ id: 94, name: 'psychic', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'SECONDARY_STAT_DROP'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['psychic'] }),
    95: Object.freeze({ id: 95, name: 'hypnosis', supportLevel: 'FULL', requiredMechanics: ['STATUS_APPLICATION'], knownPending: [], blockedReason: null, priority: 0 }),
    92: Object.freeze({ id: 92, name: 'toxic', supportLevel: 'FULL', requiredMechanics: ['STATUS_APPLICATION', 'PROGRESSIVE_POISON', 'POISON_USER_ACCURACY'], knownPending: [], blockedReason: null, priority: 0 }),
    98: Object.freeze({ id: 98, name: 'quick-attack', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    141: Object.freeze({ id: 141, name: 'leech-life', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),
    147: Object.freeze({ id: 147, name: 'spore', supportLevel: 'FULL', requiredMechanics: ['STATUS_APPLICATION'], knownPending: [], blockedReason: null, priority: 0 }),
    157: Object.freeze({ id: 157, name: 'rock-slide', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'SECONDARY_FLINCH'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['rock-slide'] }),
    183: Object.freeze({ id: 183, name: 'mach-punch', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    188: Object.freeze({ id: 188, name: 'sludge-bomb', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['sludge-bomb'] }),
    202: Object.freeze({ id: 202, name: 'giga-drain', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),
    242: Object.freeze({ id: 242, name: 'crunch', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'SECONDARY_STAT_DROP'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['crunch'] }),
    245: Object.freeze({ id: 245, name: 'extreme-speed', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 2 }),
    246: Object.freeze({ id: 246, name: 'ancient-power', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'SECONDARY_STAT_BOOST'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['ancient-power'] }),
    247: Object.freeze({ id: 247, name: 'shadow-ball', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'SECONDARY_STAT_DROP'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['shadow-ball'] }),
    261: Object.freeze({ id: 261, name: 'will-o-wisp', supportLevel: 'FULL', requiredMechanics: ['STATUS_APPLICATION'], knownPending: [], blockedReason: null, priority: 0 }),
    315: Object.freeze({ id: 315, name: 'overheat', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'SELF_STAT_DROP'], knownPending: [], blockedReason: null, priority: 0, selfStatDrops: Object.freeze({ specialAttack: -2 }) }),
    352: Object.freeze({ id: 352, name: 'water-pulse', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'SECONDARY_CONFUSION_CHANCE'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['water-pulse'] }),
    347: Object.freeze({ id: 347, name: 'calm-mind', supportLevel: 'FULL', requiredMechanics: ['STAT_STAGE_BOOST'], knownPending: [], blockedReason: null, priority: 0, statBoosts: Object.freeze({ specialAttack: 1, specialDefense: 1 }) }),
    370: Object.freeze({ id: 370, name: 'close-combat', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'SELF_STAT_DROP'], knownPending: [], blockedReason: null, priority: 0, selfStatDrops: Object.freeze({ defense: -1, specialDefense: -1 }) }),
    398: Object.freeze({ id: 398, name: 'poison-jab', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'SECONDARY_STATUS_CHANCE'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['poison-jab'] }),
    409: Object.freeze({ id: 409, name: 'drain-punch', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),
    410: Object.freeze({ id: 410, name: 'vacuum-wave', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    418: Object.freeze({ id: 418, name: 'bullet-punch', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    420: Object.freeze({ id: 420, name: 'ice-shard', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    425: Object.freeze({ id: 425, name: 'shadow-sneak', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    434: Object.freeze({ id: 434, name: 'draco-meteor', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'SELF_STAT_DROP'], knownPending: [], blockedReason: null, priority: 0, selfStatDrops: Object.freeze({ specialAttack: -2 }) }),
    453: Object.freeze({ id: 453, name: 'aqua-jet', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    473: Object.freeze({ id: 473, name: 'psyshock', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'PHYSICAL_DEFENSE_TARGET'], knownPending: [], blockedReason: null, priority: 0, targetsDefenseWithSpAtk: true }),
    503: Object.freeze({ id: 503, name: 'scald', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'SECONDARY_STATUS_CHANCE'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['scald'], defrost: true, thawsTarget: true }),
    509: Object.freeze({ id: 509, name: 'circle-throw', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'NEGATIVE_PRIORITY', 'FORCED_SWITCH'], knownPending: [], blockedReason: null, priority: -6, isForcedSwitch: true }),
    525: Object.freeze({ id: 525, name: 'dragon-tail', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'NEGATIVE_PRIORITY', 'FORCED_SWITCH'], knownPending: [], blockedReason: null, priority: -6, isForcedSwitch: true }),
    532: Object.freeze({ id: 532, name: 'horn-leech', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),
    540: Object.freeze({ id: 540, name: 'psystrike', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'PHYSICAL_DEFENSE_TARGET'], knownPending: [], blockedReason: null, priority: 0, targetsDefenseWithSpAtk: true }),
    548: Object.freeze({ id: 548, name: 'secret-sword', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'PHYSICAL_DEFENSE_TARGET'], knownPending: [], blockedReason: null, priority: 0, targetsDefenseWithSpAtk: true }),
    560: Object.freeze({ id: 560, name: 'flying-press', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'DUAL_TYPE_EFFECTIVENESS'], knownPending: [], blockedReason: null, priority: 0, isDualTypeEffectiveness: true }),
    570: Object.freeze({ id: 570, name: 'parabolic-charge', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),
    577: Object.freeze({ id: 577, name: 'draining-kiss', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.75 }),
    617: Object.freeze({ id: 617, name: 'light-of-ruin', supportLevel: 'FULL', requiredMechanics: ['SPECIAL_DAMAGE', 'HP_RECOIL_DAMAGE_DEALT'], knownPending: [], blockedReason: null, priority: 0, recoilRatio: 0.5 }),
    677: Object.freeze({ id: 677, name: 'anchor-shot', supportLevel: 'PARTIAL', requiredMechanics: ['PHYSICAL_DAMAGE'], knownPending: ['TRAPPING_PHASE_P6'], blockedReason: null, priority: 0 }),
    709: Object.freeze({ id: 709, name: 'accelerock', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'POSITIVE_PRIORITY'], knownPending: [], blockedReason: null, priority: 1 }),
    776: Object.freeze({ id: 776, name: 'body-press', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'DEFENSE_AS_ATTACK'], knownPending: [], blockedReason: null, priority: 0, usesDefenseAsAttack: true }),
    891: Object.freeze({ id: 891, name: 'bitter-blade', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'HP_DRAIN'], knownPending: [], blockedReason: null, priority: 0, drainRatio: 0.5 }),

    // --- BLOCKED (Mecânicas complexas não implementadas / contenção estrita) ---
    162: Object.freeze({"id":162,"name":"super-fang","supportLevel":"FULL","requiredMechanics":["PHYSICAL_DAMAGE","FRACTIONAL_HP_DAMAGE"],"knownPending":[],"blockedReason":null,"priority":0}),
    264: Object.freeze({ id: 264, name: 'focus-punch', supportLevel: 'BLOCKED', requiredMechanics: ['PREPARATION_PHASE', 'FAIL_ON_HIT'], knownPending: ['PREPARATION_PHASE_P6'], blockedReason: 'CHARGE_FAILS_IF_HIT', priority: -3 }),
    717: Object.freeze({"id":717,"name":"natures-madness","supportLevel":"FULL","requiredMechanics":["SPECIAL_DAMAGE","FRACTIONAL_HP_DAMAGE"],"knownPending":[],"blockedReason":null,"priority":0,"aliases":["nature-s-madness","natures-madness"]}),
    723: Object.freeze({ id: 723, name: 'light-that-burns-the-sky', supportLevel: 'BLOCKED', requiredMechanics: ['Z_MOVE_MECHANICS'], knownPending: ['Z_MOVE_PHASE_P8'], blockedReason: 'Z_MOVE_NOT_IMPLEMENTED', priority: 0 }),
    877: Object.freeze({"id":877,"name":"ruination","supportLevel":"FULL","requiredMechanics":["SPECIAL_DAMAGE","FRACTIONAL_HP_DAMAGE"],"knownPending":[],"blockedReason":null,"priority":0}),
    881: Object.freeze({ id: 881, name: 'chilly-reception', supportLevel: 'BLOCKED', requiredMechanics: ['WEATHER_SWITCH'], knownPending: ['WEATHER_SWITCH_PHASE_P7'], blockedReason: 'SNOW_WEATHER_AND_SWITCH', priority: 0 }),
    449: Object.freeze({ id: 449, name: 'judgment', supportLevel: 'BLOCKED', requiredMechanics: ['DYNAMIC_TYPE_FROM_ITEM'], knownPending: ['ITEM_TYPE_PHASE_P7'], blockedReason: 'DYNAMIC_TYPE_FROM_ITEM', priority: 0 }),
    546: Object.freeze({ id: 546, name: 'techno-blast', supportLevel: 'BLOCKED', requiredMechanics: ['DYNAMIC_TYPE_FROM_ITEM'], knownPending: ['ITEM_TYPE_PHASE_P7'], blockedReason: 'DYNAMIC_TYPE_FROM_ITEM', priority: 0 }),
    718: Object.freeze({ id: 718, name: 'multi-attack', supportLevel: 'BLOCKED', requiredMechanics: ['DYNAMIC_TYPE_FROM_ITEM'], knownPending: ['ITEM_TYPE_PHASE_P7'], blockedReason: 'DYNAMIC_TYPE_FROM_ITEM', priority: 0 }),
    851: Object.freeze({ id: 851, name: 'tera-blast', supportLevel: 'BLOCKED', requiredMechanics: ['DYNAMIC_TYPE_FROM_TERA'], knownPending: ['TERASTALLIZATION_PHASE_P8'], blockedReason: 'DYNAMIC_TYPE_FROM_TERA', priority: 0 }),
    ...P5.definitions,
    ...Object.fromEntries(Object.values(RECHARGE_MOVES).map(m=>[m.id,Object.freeze({id:m.id,name:m.name,supportLevel:'FULL',requiredMechanics:[m.damageClass==='special'?'SPECIAL_DAMAGE':'PHYSICAL_DAMAGE','RECHARGE'],knownPending:[],blockedReason:null,priority:0})])),
    19: Object.freeze({ id: 19, name: 'fly', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'TWO_TURN_SEMI_INVULNERABLE'], knownPending: [], blockedReason: null, priority: 0 }),
    76: Object.freeze({ id: 76, name: 'solar-beam', supportLevel: 'PARTIAL', requiredMechanics: ['SPECIAL_DAMAGE', 'TWO_TURN_CHARGE'], knownPending: ['WEATHER_PHASE_P7', 'ITEM_PHASE_P7'], blockedReason: null, priority: 0 }),
    91: Object.freeze({ id: 91, name: 'dig', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'TWO_TURN_SEMI_INVULNERABLE'], knownPending: [], blockedReason: null, priority: 0 }),
    291: Object.freeze({ id: 291, name: 'dive', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'TWO_TURN_SEMI_INVULNERABLE'], knownPending: [], blockedReason: null, priority: 0 }),
    340: Object.freeze({ id: 340, name: 'bounce', supportLevel: 'FULL', requiredMechanics: ['PHYSICAL_DAMAGE', 'TWO_TURN_SEMI_INVULNERABLE', 'SECONDARY_STATUS_CHANCE'], knownPending: [], blockedReason: null, priority: 0, secondaryEffect: SECONDARY_EFFECT_MOVES['bounce'] }),
    ...P6.definitions,
    ...P7.definitions,
    ...P8.definitions,
    ...Critical.promote({...P4Catalog.definitions,...P6.definitions,...P7.definitions}),
    ...Completion.promote({...P4Catalog.definitions,...P7.definitions})
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
    162: Object.freeze({"id":162,"name":"super-fang","type":"normal","damageClass":"physical","power":null,"accuracy":90,"pp":10}),
    717: Object.freeze({"id":717,"name":"natures-madness","type":"fairy","damageClass":"special","power":null,"accuracy":90,"pp":10}),
    877: Object.freeze({"id":877,"name":"ruination","type":"dark","damageClass":"special","power":1,"accuracy":90,"pp":10}),
    49: Object.freeze({ id: 49, name: 'sonic-boom', type: 'normal', power: null, accuracy: 90, pp: 20, damageClass: 'special' }),
    82: Object.freeze({ id: 82, name: 'dragon-rage', type: 'dragon', power: null, accuracy: 100, pp: 10, damageClass: 'special' }),
    69: Object.freeze({ id: 69, name: 'seismic-toss', type: 'fighting', power: null, accuracy: 100, pp: 20, damageClass: 'physical' }),
    101: Object.freeze({ id: 101, name: 'night-shade', type: 'ghost', power: null, accuracy: 100, pp: 15, damageClass: 'special' }),
    331: Object.freeze({"id":331,"name":"bullet-seed","type":"grass","power":25,"accuracy":100,"pp":30,"damageClass":"physical"}),
    333: Object.freeze({"id":333,"name":"icicle-spear","type":"ice","power":25,"accuracy":100,"pp":30,"damageClass":"physical"}),
    350: Object.freeze({"id":350,"name":"rock-blast","type":"rock","power":25,"accuracy":90,"pp":10,"damageClass":"physical"}),
    292: Object.freeze({"id":292,"name":"arm-thrust","type":"fighting","power":15,"accuracy":100,"pp":20,"damageClass":"physical"}),
    24: Object.freeze({"id":24,"name":"double-kick","type":"fighting","power":30,"accuracy":100,"pp":30,"damageClass":"physical"}),
    41: Object.freeze({"id":41,"name":"twineedle","type":"bug","power":25,"accuracy":100,"pp":20,"damageClass":"physical"}),
    594: Object.freeze({"id":594,"name":"water-shuriken","type":"water","power":15,"accuracy":100,"pp":20,"damageClass":"special"}),
    164: Object.freeze({ id: 164, name: 'substitute', type: 'normal', power: 0, accuracy: null, pp: 10, damageClass: 'status', target: 'self' }),
    269: Object.freeze({ id: 269, name: 'taunt', type: 'dark', power: 0, accuracy: 100, pp: 20, damageClass: 'status', target: 'normal' }),
    668: Object.freeze({ id: 668, name: 'strength-sap', type: 'grass', power: 0, accuracy: 100, pp: 10, damageClass: 'status', target: 'normal' }),
    19: Object.freeze({ id: 19, name: 'fly', type: 'flying', power: 90, accuracy: 95, pp: 15, damageClass: 'physical' }),
    91: Object.freeze({ id: 91, name: 'dig', type: 'ground', power: 80, accuracy: 100, pp: 10, damageClass: 'physical' }),
    291: Object.freeze({ id: 291, name: 'dive', type: 'water', power: 80, accuracy: 100, pp: 10, damageClass: 'physical' }),
    ...P4Catalog.moves,
    47: Object.freeze({"id":47,"name":"sing","type":"normal","accuracy":55,"pp":15,"statusEffect":"sleep","power":0,"damageClass":"status"}),
    142: Object.freeze({"id":142,"name":"lovely-kiss","type":"normal","accuracy":75,"pp":10,"statusEffect":"sleep","power":0,"damageClass":"status"}),
    320: Object.freeze({"id":320,"name":"grass-whistle","type":"grass","accuracy":55,"pp":15,"statusEffect":"sleep","power":0,"damageClass":"status"}),
    78: Object.freeze({"id":78,"name":"stun-spore","type":"grass","accuracy":75,"pp":30,"statusEffect":"paralysis","power":0,"damageClass":"status"}),
    137: Object.freeze({"id":137,"name":"glare","type":"normal","accuracy":100,"pp":30,"statusEffect":"paralysis","power":0,"damageClass":"status"}),
    139: Object.freeze({"id":139,"name":"poison-gas","type":"poison","accuracy":90,"pp":40,"statusEffect":"poison","power":0,"damageClass":"status"}),
    156: Object.freeze({"id":156,"name":"rest","type":"psychic","power":0,"accuracy":null,"pp":5,"damageClass":"status","p4Effect":"rest"}),
    214: Object.freeze({"id":214,"name":"sleep-talk","type":"normal","power":0,"accuracy":null,"pp":10,"damageClass":"status","p4Effect":"sleep-talk"}),
    281: Object.freeze({"id":281,"name":"yawn","type":"normal","power":0,"accuracy":null,"pp":10,"damageClass":"status","p4Effect":"yawn"}),
    173: Object.freeze({"id":173,"name":"snore","type":"normal","power":50,"accuracy":100,"pp":15,"damageClass":"special"}),
    138: Object.freeze({"id":138,"name":"dream-eater","type":"psychic","power":100,"accuracy":100,"pp":15,"damageClass":"special"}),
    252: Object.freeze({ id: 252, name: 'fake-out', type: 'normal', power: 40, accuracy: 100, pp: 10, damageClass: 'physical' }),
    92: Object.freeze({ id: 92, name: 'toxic', type: 'poison', power: 0, accuracy: 90, pp: 10, damageClass: 'status', statusEffect: 'toxic' }),
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
    79: Object.freeze({ id: 79, name: 'sleep-powder', type: 'grass', power: 0, accuracy: 75, pp: 15, damageClass: 'status', statusEffect: 'sleep', isPowderMove: true }),
    84: Object.freeze({ id: 84, name: 'thunder-shock', type: 'electric', power: 40, accuracy: 100, pp: 30, damageClass: 'special' }),
    85: Object.freeze({ id: 85, name: 'thunderbolt', type: 'electric', power: 90, accuracy: 100, pp: 15, damageClass: 'special' }),
    87: Object.freeze({ id: 87, name: 'thunder', type: 'electric', power: 110, accuracy: 70, pp: 10, damageClass: 'special' }),
    88: Object.freeze({ id: 88, name: 'rock-throw', type: 'rock', power: 50, accuracy: 90, pp: 15, damageClass: 'physical' }),
    89: Object.freeze({ id: 89, name: 'earthquake', type: 'ground', power: 100, accuracy: 100, pp: 10, damageClass: 'physical' }),
    93: Object.freeze({ id: 93, name: 'confusion', type: 'psychic', power: 50, accuracy: 100, pp: 25, damageClass: 'special' }),
    94: Object.freeze({ id: 94, name: 'psychic', type: 'psychic', power: 90, accuracy: 100, pp: 10, damageClass: 'special' }),
    95: Object.freeze({ id: 95, name: 'hypnosis', type: 'psychic', power: 0, accuracy: 60, pp: 20, damageClass: 'status', statusEffect: 'sleep' }),
    98: Object.freeze({ id: 98, name: 'quick-attack', type: 'normal', power: 40, accuracy: 100, pp: 30, damageClass: 'physical' }),
    109: Object.freeze({ id: 109, name: 'confuse-ray', type: 'ghost', power: 0, accuracy: 100, pp: 10, damageClass: 'status', statusEffect: 'confusion' }),
    121: Object.freeze({ id: 121, name: 'egg-bomb', type: 'normal', power: 100, accuracy: 75, pp: 10, damageClass: 'physical' }),
    122: Object.freeze({ id: 122, name: 'lick', type: 'ghost', power: 30, accuracy: 100, pp: 30, damageClass: 'physical' }),
    126: Object.freeze({ id: 126, name: 'fire-blast', type: 'fire', power: 110, accuracy: 85, pp: 5, damageClass: 'special' }),
    129: Object.freeze({ id: 129, name: 'swift', type: 'normal', power: 60, accuracy: null, pp: 20, damageClass: 'special' }),
    141: Object.freeze({ id: 141, name: 'leech-life', type: 'bug', power: 80, accuracy: 100, pp: 10, damageClass: 'physical' }),
    147: Object.freeze({ id: 147, name: 'spore', type: 'grass', power: 0, accuracy: 100, pp: 15, damageClass: 'status', statusEffect: 'sleep', isPowderMove: true }),
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
    315: Object.freeze({ id: 315, name: 'overheat', type: 'fire', power: 130, accuracy: 90, pp: 5, damageClass: 'special' }),
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
    352: Object.freeze({ id: 352, name: 'water-pulse', type: 'water', power: 60, accuracy: 100, pp: 20, damageClass: 'special' }),
    369: Object.freeze({ id: 369, name: 'u-turn', type: 'bug', power: 70, accuracy: 100, pp: 20, damageClass: 'physical' }),
    370: Object.freeze({ id: 370, name: 'close-combat', type: 'fighting', power: 120, accuracy: 100, pp: 5, damageClass: 'physical' }),
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
    434: Object.freeze({ id: 434, name: 'draco-meteor', type: 'dragon', power: 130, accuracy: 90, pp: 5, damageClass: 'special' }),
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
    919: Object.freeze({ id: 919, name: 'malignant-chain', type: 'poison', power: 100, accuracy: 100, pp: 5, damageClass: 'special' }),
    ...P5.moves,
    ...RECHARGE_MOVES,
    ...PROTECT_MOVES,
    ...P6.moves,
    ...P7.moves,
    ...P8.moves
  });

  const KNOWN_CATALOG_MOVES_BY_NAME = Object.freeze(
    Object.fromEntries(Object.values(KNOWN_CATALOG_MOVES).map(m => [m.name, m]))
  );

  const PURE_DAMAGE_MOVES = new Set([
    'vine-whip', 'pound', 'mega-punch', 'mega-kick', 'horn-attack', 'slam', 'tackle', 'scratch', 'vice-grip',
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
        if (!aliasesForId.includes(normalizedName)) {
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
        isLevelDamage: isLevelDamageMove(def),
        isConstantDamage: isConstantDamageMove(def),
        constantDamage: getConstantDamageAmount(def),
        drainRatio: def.drainRatio || 0,
        recoilRatio: def.recoilRatio || 0,
        isForcedSwitch: Boolean(def.isForcedSwitch),
        statBoosts: def.statBoosts ? { ...def.statBoosts } : null,
        selfStatDrops: def.selfStatDrops ? { ...def.selfStatDrops } : null,
        secondaryEffect: def.secondaryEffect ? { ...def.secondaryEffect } : (getSecondaryEffect(def) ? { ...getSecondaryEffect(def) } : null)
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
        isForcedSwitch: isForcedSwitchMove({ name: catEntry.name }),
        statBoosts: null,
        selfStatDrops: getSelfStatDrops({ name: catEntry.name }) ? { ...getSelfStatDrops({ name: catEntry.name }) } : null,
        secondaryEffect: getSecondaryEffect(catEntry) ? { ...getSecondaryEffect(catEntry) } : null
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
      if (!aliasesForId.includes(normalizedName)) return false;
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

      // Power em status move: deve estar presente e ser 0 ou null (Protect/Detect aceita undefined, null ou 0)
      if (isProtectMove(move)) {
        if (move.power !== undefined && move.power !== null && move.power !== 0 && Number(move.power) !== 0) return false;
      } else {
        if (move.power === undefined) return false;
        if (move.power !== null && move.power !== 0 && Number(move.power) !== 0) return false;
      }

      // Accuracy em status move: obrigatória e deve coincidir exatamente com a canônica
      if (canonicalStatus.accuracy === null) {
        if (move.accuracy !== null) return false;
      } else {
        if (move.accuracy === undefined || move.accuracy === null) return false;
        const statAcc = Number(move.accuracy);
        if (!Number.isInteger(statAcc) || statAcc !== canonicalStatus.accuracy) return false;
      }

      // PP de status move deve bater com canônico
      if (maxPp !== canonicalStatus.pp) return false;

      return true;
    }

    // 7. Golpes ofensivos (physical ou special)
    const isLevelDamage = isLevelDamageMove(move);
    const isConstantDamage = isConstantDamageMove(move);
    const isFixedDamage = isLevelDamage || isConstantDamage || isFractionalDamageMove(move) || Boolean(P5.get(move));
    let powerNum = null;
    if (P5.get(move)) {
      if (!P5.validPower(move)) return false;
    } else if (isFractionalDamageMove(move)) {
      if (!isValidFractionalDamagePower(move)) return false;
    } else if (isFixedDamage) {
      if (move.power !== undefined && move.power !== null) {
        if (typeof move.power === 'boolean' || typeof move.power === 'object') return false;
        const pwr = Number(move.power);
        if (!Number.isFinite(pwr) || pwr !== 0) {
          return false;
        }
      }
    } else {
      // 7.1 Power: obrigatório, numérico, finito, inteiro e > 0
      if (move.power === undefined || move.power === null) return false;
      powerNum = Number(move.power);
      if (!Number.isFinite(powerNum) || !Number.isInteger(powerNum) || powerNum <= 0) return false;
    }

    // 7.2 Precisão: obrigatória (não pode ser undefined/ausente)
    if (move.accuracy === undefined) return false;

    const knownRef = (normalizedName && KNOWN_CATALOG_MOVES_BY_NAME[normalizedName]) || (rawId && KNOWN_CATALOG_MOVES[rawId]);
    if (!knownRef) {
      // Qualquer golpe ofensivo suportado no motor deve ter registro canônico conhecido
      return false;
    }

    if (rawClass !== knownRef.damageClass) return false;
    if (rawType !== knownRef.type) return false;
    if (!isFixedDamage && powerNum !== knownRef.power) return false;
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

  const DEFAULT_SLEEP_TURNS = 2;
  const DEFAULT_CONFUSION_TURNS = Object.freeze({
    MIN: 2,
    MAX: 5,
    DEFAULT: 3
  });

  // Apenas golpes de status curados com efeito integral suportado.
  const SUPPORTED_STATUS_MOVES = Object.freeze({
    'venom-drench': P5.moves[599],
    'sing': Object.freeze({"id":47,"name":"sing","type":"normal","accuracy":55,"pp":15,"statusEffect":"sleep","power":0,"damageClass":"status"}),
    'lovely-kiss': Object.freeze({"id":142,"name":"lovely-kiss","type":"normal","accuracy":75,"pp":10,"statusEffect":"sleep","power":0,"damageClass":"status"}),
    'grass-whistle': Object.freeze({"id":320,"name":"grass-whistle","type":"grass","accuracy":55,"pp":15,"statusEffect":"sleep","power":0,"damageClass":"status"}),
    'stun-spore': Object.freeze({"id":78,"name":"stun-spore","type":"grass","accuracy":75,"pp":30,"statusEffect":"paralysis","power":0,"damageClass":"status"}),
    'glare': Object.freeze({"id":137,"name":"glare","type":"normal","accuracy":100,"pp":30,"statusEffect":"paralysis","power":0,"damageClass":"status"}),
    'poison-gas': Object.freeze({"id":139,"name":"poison-gas","type":"poison","accuracy":90,"pp":40,"statusEffect":"poison","power":0,"damageClass":"status"}),
    'rest': Object.freeze({"id":156,"name":"rest","type":"psychic","power":0,"accuracy":null,"pp":5,"damageClass":"status","p4Effect":"rest"}),
    'sleep-talk': Object.freeze({"id":214,"name":"sleep-talk","type":"normal","power":0,"accuracy":null,"pp":10,"damageClass":"status","p4Effect":"sleep-talk"}),
    'yawn': Object.freeze({"id":281,"name":"yawn","type":"normal","power":0,"accuracy":null,"pp":10,"damageClass":"status","p4Effect":"yawn"}),
    'toxic': Object.freeze({ id: 92, name: 'toxic', type: 'poison', power: 0, accuracy: 90, pp: 10, damageClass: 'status', statusEffect: 'toxic' }),
    'confuse-ray': Object.freeze({ id: 109, name: 'confuse-ray', type: 'ghost',
      power: 0, accuracy: 100, pp: 10, damageClass: 'status', statusEffect: 'confusion' }),
    'swords-dance': Object.freeze({ id: 14, name: 'swords-dance', type: 'normal',
      power: 0, accuracy: null, pp: 20, damageClass: 'status', statBoosts: Object.freeze({ attack: 2 }) }),
    'calm-mind': Object.freeze({ id: 347, name: 'calm-mind', type: 'psychic',
      power: 0, accuracy: null, pp: 20, damageClass: 'status', statBoosts: Object.freeze({ specialAttack: 1, specialDefense: 1 }) }),
    'poison-powder': Object.freeze({ id: 77, name: 'poison-powder', type: 'poison',
      power: 0, accuracy: 75, pp: 35, damageClass: 'status', statusEffect: 'poison' }),
    'sleep-powder': Object.freeze({ id: 79, name: 'sleep-powder', type: 'grass',
      power: 0, accuracy: 75, pp: 15, damageClass: 'status', statusEffect: 'sleep' }),
    'hypnosis': Object.freeze({ id: 95, name: 'hypnosis', type: 'psychic',
      power: 0, accuracy: 60, pp: 20, damageClass: 'status', statusEffect: 'sleep' }),
    'spore': Object.freeze({ id: 147, name: 'spore', type: 'grass',
      power: 0, accuracy: 100, pp: 15, damageClass: 'status', statusEffect: 'sleep' }),
    'will-o-wisp': Object.freeze({ id: 261, name: 'will-o-wisp', type: 'fire',
      power: 0, accuracy: 85, pp: 15, damageClass: 'status', statusEffect: 'burn' }),
    'thunder-wave': Object.freeze({ id: 86, name: 'thunder-wave', type: 'electric',
      power: 0, accuracy: 90, pp: 20, damageClass: 'status', statusEffect: 'paralysis' }),
    'protect': PROTECT_MOVES[182],
    'detect': PROTECT_MOVES[197],
    'substitute': Object.freeze({ id: 164, name: 'substitute', type: 'normal', power: 0, accuracy: null, pp: 10, damageClass: 'status', target: 'self' }),
    'taunt': Object.freeze({ id: 269, name: 'taunt', type: 'dark', power: 0, accuracy: 100, pp: 20, damageClass: 'status', target: 'normal' }),
    'strength-sap': Object.freeze({ id: 668, name: 'strength-sap', type: 'grass', power: 0, accuracy: 100, pp: 10, damageClass: 'status', target: 'normal' }),
    ...P6.statusMoves,
    ...P7.statusMoves,
    ...P8.statusMoves
  });

  function getSupportedStatusMove(move) {
    if (!move || typeof move !== 'object') return null;
    const canonical = SUPPORTED_STATUS_MOVES[String(move.name || '').trim().toLowerCase()];
    if (!canonical || Number(move.id) !== canonical.id ||
        String(move.type?.name || move.type || '').toLowerCase() !== canonical.type ||
        String(move.damageClass || move.damage_class?.name || '').toLowerCase() !== 'status' ||
        !(move.power === null || move.power === undefined || Number(move.power) === 0) ||
        (canonical.accuracy === null ? (move.accuracy !== null && move.accuracy !== undefined) : Number(move.accuracy) !== canonical.accuracy) ||
        Number(move.pp !== undefined ? move.pp : move.maxPp) !== canonical.pp) return null;
    return canonical;
  }

  function isStatusConditionImmune(statusCondition, types) {
    if (!Array.isArray(types) || !statusCondition) return false;
    const normalizedStatus = String(statusCondition).trim().toLowerCase();
    switch (normalizedStatus) {
      case 'toxic':
      case 'poison':
        return types.includes('poison') || types.includes('steel');
      case 'burn':
        return types.includes('fire');
      case 'paralysis':
        return types.includes('electric');
      case 'sleep':
        return false;
      case 'freeze':
        return types.includes('ice');
      default:
        return false;
    }
  }

  function isSelfThawingMove(move) {
    if (!move) return false;
    if (move.defrost) return true;
    const name = String(move.name || '').trim().toLowerCase();
    return name === 'scald' || P4Catalog.defrost.includes(name);
  }

  function isDamagingFireMove(move) {
    if (!move) return false;
    const damageClass = String(move.damageClass || move.damage_class?.name || move.damage_class || '').toLowerCase();
    const type = String(move.type?.name || move.type || '').toLowerCase();
    return type === 'fire' && damageClass !== 'status';
  }

  function isPostSecondaryThawMove(move){return (P4Catalog.postSecondaryThaw||['scald']).includes(String(move?.name||'').toLowerCase());}

  function isThawingMoveTarget(move) {
    if (!move) return false;
    if (move.thawsTarget || isPostSecondaryThawMove(move)) return true;
    const name = String(move.name || '').trim().toLowerCase();
    if (name === 'scald') return true;
    return isDamagingFireMove(move);
  }

  function isEligibleForStatusCondition(target, statusCondition) {
    if (!target || typeof target !== 'object') return false;
    if (Number(target.currentHp) <= 0) return false;
    if (target.statusCondition) return false;
    const types = Array.isArray(target.types) ? target.types : (target.type ? [target.type] : []);
    return !P7.statusImmune(target,statusCondition) && !isStatusConditionImmune(statusCondition, types);
  }

  function isConfused(combatant) {
    return Boolean(combatant && Number.isInteger(combatant.confusionTurns) && combatant.confusionTurns > 0);
  }

  function isEligibleForConfusion(target) {
    if (!target || typeof target !== 'object') return false;
    if (Number(target.currentHp) <= 0) return false;
    return !(target.confusionTurns > 0);
  }

  function isPoisonPowderImmune(types) {
    return Array.isArray(types) && (isStatusConditionImmune('poison', types) || types.includes('grass'));
  }

  function isStatusMoveImmune(move, types) {
    if (!Array.isArray(types) || !move) return false;
    const name = String(move?.name || '').trim().toLowerCase();
    switch (name) {
      case 'stun-spore':
        return types.includes('grass')||isStatusConditionImmune('paralysis',types);
      case 'glare':
        return isStatusConditionImmune('paralysis',types);
      case 'poison-gas':
        return isStatusConditionImmune('poison',types);
      case 'toxic':
        return isStatusConditionImmune('toxic', types);
      case 'poison-powder':
        return isPoisonPowderImmune(types);
      case 'sleep-powder':
      case 'spore':
        return isStatusConditionImmune('sleep', types) || types.includes('grass');
      case 'hypnosis':
        return isStatusConditionImmune('sleep', types);
      case 'will-o-wisp':
        return isStatusConditionImmune('burn', types);
      case 'thunder-wave':
        return isStatusConditionImmune('paralysis', types) || types.includes('ground');
      default:
        return false;
    }
  }

  function applyBurnPenalty(damage, attacker, move) {
    return attacker?.statusCondition === 'burn' && P7.ability(attacker)!=='guts' && move?.damageClass === 'physical' && damage > 0
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

  function describeMovePower(move){
    if(isLevelDamageMove(move))return 'Dano igual ao nível';
    if(isConstantDamageMove(move))return 'Dano fixo: '+getConstantDamageAmount(move)+' HP';
    if(isFractionalDamageMove(move))return 'Metade do HP atual do alvo';
    if(P5.ohko(move))return 'Nocaute condicionado ao nível';
    if(P5.counterIds.includes(Number(move.id)))return 'Devolve o dano recebido';
    if(move.id===117)return 'Acumula dano por dois turnos';
    if(move.id===599)return 'Reduz atributos de alvos envenenados';
    if(move.id===149)return 'Dano variável pelo nível';
    if(move.id===283)return 'Iguala o HP do alvo ao do usuário';
    if(P5.variableIds.includes(Number(move.id))||[371,372,707,915,754,854].includes(Number(move.id)))return 'Poder variável';
    return null;
  }

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
    LEVEL_DAMAGE_MOVES,
    isLevelDamageMove,
    FRACTIONAL_DAMAGE_MOVES,
    isFractionalDamageMove,
    isValidFractionalDamagePower,
    getFractionalDamageAmount,
    P5,
    P6,
    P7,
    P8,
    Critical,
    Completion,
    RECHARGE_MOVES,
    isRechargeMove,
    PROTECT_MOVES,
    isProtectMove,
    PROTECT_BYPASSING_MOVES,
    isProtectBypassingMove,
    TWO_TURN_MOVES,
    SEMI_INVULNERABLE_STATES,
    isTwoTurnMove,
    getTwoTurnMove,
    canHitSemiInvulnerable,
    getSemiInvulnerableDamageMultiplier,
    describeMovePower,
    CONSTANT_DAMAGE_MOVES,
    isConstantDamageMove,
    getConstantDamageAmount,
    MULTI_HIT_MOVES,
    getMultiHitMove,
    getMultiHitCount,
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
    AI_CONFIG,
    STAT_STAGE_KEYS,
    createDefaultStatStages,
    sanitizeStatStages,
    getStatStageMultiplier,
    getEffectiveStat,
    getEffectiveAccuracy,
    applyStatStageChange,
    resetStatStages,
    STAT_BOOST_MOVES,
    SELF_STAT_DROP_MOVES,
    getStatBoosts,
    getSelfStatDrops,
    SECONDARY_EFFECT_MOVES,
    SECONDARY_EFFECT_MOVES_BY_ID,
    getSecondaryEffect,
    isStatusConditionImmune,
    isEligibleForStatusCondition,
    isSelfThawingMove,
    isThawingMoveTarget,
    isPostSecondaryThawMove,
    isDamagingFireMove,
    DEFAULT_SLEEP_TURNS,
    DEFAULT_CONFUSION_TURNS,
    isConfused,
    isEligibleForConfusion,
    AbilityRegistry,
    MoveFlags
  });

  // Suporte universal (Node.js & Browser)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BattleConstants;
  } else if (typeof window !== 'undefined') {
    window.PBABattle = window.PBABattle || {};
    Object.assign(window.PBABattle, BattleConstants);
  }
})();
