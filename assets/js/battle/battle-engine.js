/**
 * ====================================================================
 * MOTOR DE BATALHA: BATTLE ENGINE V2 + 3v3 TEAM SYSTEM (battle-engine.js)
 * ====================================================================
 * Núcleo matemático de simulação de combate 1x1 e 3x3 das Fases
 * PBA-003, PBA-004, PBA-005 e PBA-006.
 * 
 * Princípios Fundamentais:
 * - GAME ENGINE ≠ PRESENTATION ENGINE;
 * - Isolado de DOM, Fetch/PokéAPI, LocalStorage, Áudio e Math.random();
 * - Determinístico: acurácia resolvida com rolls externos fornecidos pelo chamador;
 * - Imutabilidade: entradas originais nunca são modificadas;
 * - Move System completo: Power, Accuracy, Physical/Special, PP e STAB;
 * - Sistema de Equipes 3x3: Pokémon ativo, banco, trocas voluntárias e forçadas;
 * - Prioridade de Troca: Ação SWITCH executa antes de MOVE;
 * - Persistência estrita de HP e PP entre trocas no banco;
 * - Suporta Node.js (testes automatizados) e Browser (window.PBABattle).
 */

(function () {
  let constants;
  let DamageCalculator;
  let TurnManager;
  let TypeEffectiveness;
  let BattleModifierResolver;
  let MoveModel;

  if (typeof module !== 'undefined' && module.exports) {
    constants = require('./battle-constants.js');
    DamageCalculator = require('./damage-calculator.js');
    TurnManager = require('./turn-manager.js');
    TypeEffectiveness = require('./type-effectiveness.js');
    BattleModifierResolver = require('./battle-modifier-resolver.js');
    MoveModel = require('./move-model.js');
  } else if (typeof window !== 'undefined' && window.PBABattle) {
    constants = window.PBABattle;
    DamageCalculator = window.PBABattle.DamageCalculator;
    TurnManager = window.PBABattle.TurnManager;
    TypeEffectiveness = window.PBABattle.TypeEffectiveness;
    BattleModifierResolver = window.PBABattle.BattleModifierResolver;
    MoveModel = window.PBABattle.MoveModel;
  } else {
    constants = {
      BATTLE_STATUS: {
        READY: 'READY',
        IN_PROGRESS: 'IN_PROGRESS',
        AWAITING_REPLACEMENT: 'AWAITING_REPLACEMENT',
        PLAYER_WIN: 'PLAYER_WIN',
        ENEMY_WIN: 'ENEMY_WIN'
      },
      BATTLE_EVENTS: {
        BATTLE_STARTED: 'BATTLE_STARTED',
        TURN_STARTED: 'TURN_STARTED',
        ACTION_STARTED: 'ACTION_STARTED',
        MOVE_SELECTED: 'MOVE_SELECTED',
        MOVE_USED: 'MOVE_USED',
        PP_CHANGED: 'PP_CHANGED',
        MOVE_MISSED: 'MOVE_MISSED',
        STAB_RESOLVED: 'STAB_RESOLVED',
        TYPE_EFFECTIVENESS_RESOLVED: 'TYPE_EFFECTIVENESS_RESOLVED',
        DAMAGE_APPLIED: 'DAMAGE_APPLIED',
        POKEMON_FAINTED: 'POKEMON_FAINTED',
        SWITCH_STARTED: 'SWITCH_STARTED',
        POKEMON_SWITCHED: 'POKEMON_SWITCHED',
        REPLACEMENT_REQUIRED: 'REPLACEMENT_REQUIRED',
        TEAM_DEFEATED: 'TEAM_DEFEATED',
        BATTLE_ENDED: 'BATTLE_ENDED',
        CONFUSION_APPLIED: 'CONFUSION_APPLIED',
        CONFUSION_BLOCKED: 'CONFUSION_BLOCKED',
        CONFUSION_CHECK: 'CONFUSION_CHECK',
        CONFUSION_DAMAGE: 'CONFUSION_DAMAGE',
        CONFUSION_ENDED: 'CONFUSION_ENDED'
      },
      BATTLE_ACTIONS: {
        MOVE: 'MOVE',
        SWITCH: 'SWITCH',
        BASIC_ATTACK: 'BASIC_ATTACK'
      },
      SWITCH_REASON: {
        VOLUNTARY: 'VOLUNTARY',
        FAINT_REPLACEMENT: 'FAINT_REPLACEMENT'
      },
      MOVE_DAMAGE_CLASSES: {
        PHYSICAL: 'physical',
        SPECIAL: 'special',
        STATUS: 'status'
      },
      BATTLE_CONFIG: {
        SIMULATION_LEVEL: 50,
        BASIC_ATTACK_POWER: 40,
        PLAYER_FIRST_ON_SPEED_TIE: true,
        MAX_TURNS_LIMIT: 100,
        MOVE_LOADOUT_MIN: 1,
        MOVE_LOADOUT_MAX: 4,
        STAB_MULTIPLIER: 1.5,
        TEAM_SIZE: 3
      }
    };
  }

  const BattleEngine = (() => {
    const { BATTLE_STATUS, BATTLE_EVENTS, BATTLE_ACTIONS, SWITCH_REASON, MOVE_DAMAGE_CLASSES, BATTLE_CONFIG } = constants;

    /**
     * Valida e normaliza um Pokémon para o Combatant Model v3.
     * Não muta o objeto de entrada.
     * 
     * @param {Object} raw - Dados brutos do Pokémon.
     * @returns {Object} Combatente normalizado com atributos, tipos e moves.
     * @throws {Error} Se qualquer dado obrigatório for ausente ou inválido.
     */
    function createCombatant(raw) {
      if (!raw || typeof raw !== 'object') {
        throw new Error('Combatente inválido: dados devem ser um objeto não nulo.');
      }

      const id = Number(raw.id);
      if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`ID do combatente inválido: ${raw.id}. Deve ser um inteiro positivo.`);
      }

      if (typeof raw.name !== 'string' || raw.name.trim().length === 0) {
        throw new Error(`Nome do combatente inválido: "${raw.name}". Deve ser uma string não vazia.`);
      }

      // Validação dos tipos (1 a 2 tipos)
      const rawTypes = raw.types || (raw.type ? [raw.type] : null);
      if (!rawTypes) {
        throw new Error(`Tipos do combatente "${raw.name}" inválidos: tipos são obrigatórios.`);
      }

      const normalizedTypes = TypeEffectiveness.normalizeDefenderTypes(rawTypes);

      // Extrai stats
      const rawStats = raw.stats || {};
      const hpVal = rawStats.hp ?? raw.maxHp ?? raw.hp ?? raw.currentHp;
      const atkVal = rawStats.attack ?? raw.attack;
      const defVal = rawStats.defense ?? raw.defense;
      const spAtkVal = rawStats.specialAttack ?? raw.specialAttack ?? rawStats['special-attack'] ?? atkVal;
      const spDefVal = rawStats.specialDefense ?? raw.specialDefense ?? rawStats['special-defense'] ?? defVal;
      const spdVal = rawStats.speed ?? raw.speed;

      const hp = Number(hpVal);
      const attack = Number(atkVal);
      const defense = Number(defVal);
      const specialAttack = Number(spAtkVal);
      const specialDefense = Number(spDefVal);
      const speed = Number(spdVal);

      if (!Number.isFinite(hp) || hp <= 0) {
        throw new Error(`HP do combatente "${raw.name}" inválido: ${hpVal}. Deve ser maior que zero.`);
      }

      if (!Number.isFinite(attack) || attack <= 0) {
        throw new Error(`Ataque do combatente "${raw.name}" inválido: ${atkVal}. Deve ser maior que zero.`);
      }

      if (!Number.isFinite(defense) || defense <= 0) {
        throw new Error(`Defesa do combatente "${raw.name}" inválido: ${defVal}. Deve ser maior que zero.`);
      }

      if (!Number.isFinite(specialAttack) || specialAttack <= 0) {
        throw new Error(`Ataque Especial do combatente "${raw.name}" inválido: ${spAtkVal}. Deve ser maior que zero.`);
      }

      if (!Number.isFinite(specialDefense) || specialDefense <= 0) {
        throw new Error(`Defesa Especial do combatente "${raw.name}" inválido: ${spDefVal}. Deve ser maior que zero.`);
      }

      if (!Number.isFinite(speed) || speed < 0) {
        throw new Error(`Velocidade do combatente "${raw.name}" inválida: ${spdVal}. Não pode ser negativa.`);
      }

      // Validação do loadout de moves (Fase PBA-005: 1 a 4 moves sem duplicatas)
      const rawMoves = raw.moves;
      if (!Array.isArray(rawMoves) || rawMoves.length < BATTLE_CONFIG.MOVE_LOADOUT_MIN) {
        throw new Error(`Loadout de golpes inválido para "${raw.name}": deve possuir pelo menos ${BATTLE_CONFIG.MOVE_LOADOUT_MIN} golpe.`);
      }

      if (rawMoves.length > BATTLE_CONFIG.MOVE_LOADOUT_MAX) {
        throw new Error(`Loadout de golpes excede o limite máximo para "${raw.name}": possui ${rawMoves.length}, máximo permitido é ${BATTLE_CONFIG.MOVE_LOADOUT_MAX}.`);
      }

      const normalizedMoves = [];
      const seenMoveIds = new Set();
      const seenMoveNames = new Set();

      for (const m of rawMoves) {
        let normalizedMove;
        if (MoveModel && typeof MoveModel.createMove === 'function') {
          normalizedMove = MoveModel.createMove(m);
        } else {
          const isLvl = Boolean(constants?.isLevelDamageMove?.(m));
          const isConst = Boolean(constants?.isConstantDamageMove?.(m));
          let pwr = null;
          if (constants.isFractionalDamageMove?.(m)) {
            if (!constants.isValidFractionalDamagePower(m)) throw new Error('Poder de golpe fracionário inválido.');
            pwr = constants.FRACTIONAL_DAMAGE_MOVES[Number(m.id)].power;
          } else if (isLvl || isConst) {
            if (m.power !== undefined && m.power !== null) {
              if (typeof m.power === 'boolean' || typeof m.power === 'object' || !Number.isFinite(Number(m.power)) || Number(m.power) !== 0) {
                const kind = isLvl ? 'baseado em nível' : 'de dano fixo constante';
                throw new Error(`Poder do golpe ${kind} "${m.name}" inválido: ${m.power}.`);
              }
            }
          } else {
            pwr = Number(m.power);
          }
          normalizedMove = {
            id: Number(m.id),
            name: String(m.name).trim().toLowerCase(),
            type: String(m.type).trim().toLowerCase(),
            power: pwr,
            accuracy: m.accuracy !== undefined ? m.accuracy : 100,
            pp: Number(m.pp),
            damageClass: String(m.damageClass || 'physical').toLowerCase()
          };
        }

        if (seenMoveIds.has(normalizedMove.id) || seenMoveNames.has(normalizedMove.name)) {
          throw new Error(`Golpe duplicado no loadout de "${raw.name}": [ID ${normalizedMove.id} - ${normalizedMove.name}].`);
        }

        seenMoveIds.add(normalizedMove.id);
        seenMoveNames.add(normalizedMove.name);

        // Estado runtime de combate do move
        normalizedMoves.push({
          id: normalizedMove.id,
          name: normalizedMove.name,
          type: normalizedMove.type,
          power: normalizedMove.power,
          accuracy: normalizedMove.accuracy,
          pp: normalizedMove.pp,
          maxPp: normalizedMove.pp,
          currentPp: m.currentPp !== undefined ? Number(m.currentPp) : normalizedMove.pp,
          damageClass: normalizedMove.damageClass,
          ...((constants.P6.moves[normalizedMove.id]?.target||normalizedMove.target)?{target:constants.P6.moves[normalizedMove.id]?.target||normalizedMove.target}:{}),
          ...((normalizedMove.statusEffect || m.statusEffect || constants?.getSupportedStatusMove?.(m)?.statusEffect) ? { statusEffect: normalizedMove.statusEffect || m.statusEffect || constants.getSupportedStatusMove(m).statusEffect } : {}),
          ...(normalizedMove.statBoosts || (constants?.getStatBoosts && constants.getStatBoosts(normalizedMove))
            ? { statBoosts: { ...(normalizedMove.statBoosts || constants.getStatBoosts(normalizedMove)) } } : {}),
          ...(normalizedMove.selfStatDrops || (constants?.getSelfStatDrops && constants.getSelfStatDrops(normalizedMove))
            ? { selfStatDrops: { ...(normalizedMove.selfStatDrops || constants.getSelfStatDrops(normalizedMove)) } } : {}),
          ...(constants?.getSecondaryEffect && constants.getSecondaryEffect(normalizedMove)
            ? { secondaryEffect: constants.getSecondaryEffect(normalizedMove) } : {})
        });
      }

      const statusCondition = (raw.statusCondition && ['poison', 'toxic', 'burn', 'paralysis', 'sleep', 'freeze'].includes(raw.statusCondition)) ? raw.statusCondition : null;
      let sleepTurns = 0;
      if (statusCondition === 'sleep') {
        const rawTurns = raw.sleepTurns ?? raw.sleepCounter;
        const parsedTurns = Number(rawTurns);
        if (Number.isInteger(parsedTurns) && parsedTurns >= 1 && parsedTurns <= 3) {
          sleepTurns = parsedTurns;
        } else {
          sleepTurns = constants.DEFAULT_SLEEP_TURNS || 2;
        }
      }

      let level = constants.BATTLE_CONFIG?.SIMULATION_LEVEL || 50;
      if (raw.level !== undefined && raw.level !== null) {
        const parsedLevel = Number(raw.level);
        if (Number.isInteger(parsedLevel) && parsedLevel >= 1 && parsedLevel <= 100) {
          level = parsedLevel;
        }
      }

      const combatant = {
        id,
        name: raw.name.trim().toLowerCase(),
        level,
        weightKg: Number(raw.weightKg)>0?Number(raw.weightKg):Number(raw.weight)>0?Number(raw.weight)/10:constants.P5.weightKgById[id]||null,
        ivs: Object.fromEntries(['hp','attack','defense','specialAttack','specialDefense','speed'].map(k=>{
          const v=raw.ivs?.[k]??31;if(!Number.isInteger(v)||v<0||v>31)throw new Error('IV inválido.');return [k,v];
        })),
        rechargeMoveId:null,bideState:null,twoTurnMove:null,beakBlastReady:false,shellTrapReady:false,shellTrapTriggered:false,
        isProtected: false, stallCount: 0,
        ability:constants.P7.normalizeAbility(raw.ability),item:constants.P7.normalizeItem(raw.item??raw.heldItem),abilitySuppressed:false,substituteHp:Number(raw.substituteHp)||0,substitute:Boolean(raw.substitute||(Number(raw.substituteHp)>0)),abilityIgnored:false,intrepidSwordUsed:false,dauntlessShieldUsed:false,choiceLock:null,flashFire:false,
        bound:null,trapped:null,leechSeed:null,minimized:false,lockedMove:null,lastP6Move:null,focusLost:false,
        lastUsedMoveId:null,transformOriginal:null,
        actedThisTurn:false, damagedThisTurn:false, lastDirectHit:null, lastMoveFailed:false,
        types: normalizedTypes,
        maxHp: Math.floor(hp),
        currentHp: raw.currentHp !== undefined ? Math.max(0, Math.min(Math.floor(hp), Math.floor(raw.currentHp))) : Math.floor(hp),
        attack: Math.floor(attack),
        defense: Math.floor(defense),
        specialAttack: Math.floor(specialAttack),
        specialDefense: Math.floor(specialDefense),
        speed: Math.floor(speed),
        statusCondition,
        toxicStage: 0, // New battle: retain the condition but never inherit residual progression.
        sleepTurns,
        sleepCounter: sleepTurns,
        isFlinched: false,
        confusionTurns: 0,
        drowsyTurns: 0,
        drowsySleepDuration: 0,
        accuracyStage: 0,
        evasionStage: 0,
        entryMoveAttempts: 0, // Battle-local opportunities, including sleep/flinch/confusion.
        moves: normalizedMoves,
        statStages: constants.sanitizeStatStages ? constants.sanitizeStatStages(raw.statStages) : (constants.createDefaultStatStages ? constants.createDefaultStatStages() : { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 })
      };

      if (raw.baseStats && typeof raw.baseStats === 'object') {
        combatant.baseStats = { ...raw.baseStats };
      }

      // Metadados visuais e sonoros passivos (preservação limpa sem acoplamento de DOM, fetch ou resolução de imagem)
      if (raw.photo && typeof raw.photo === 'string') combatant.photo = raw.photo;
      if (raw.animatedPhoto && typeof raw.animatedPhoto === 'string') combatant.animatedPhoto = raw.animatedPhoto;
      if (raw.cry && typeof raw.cry === 'string') combatant.cry = raw.cry;

      constants.P8.initMon(combatant,raw);
      return combatant;
    }

    /**
     * Valida e constrói uma equipe completa de 3 combatentes (PBA-006).
     * 
     * @param {Array<Object>} rawTeam - Lista com exatamente 3 Pokémon.
     * @param {string} label - Identificador do time ('player' ou 'enemy').
     * @returns {Array<Object>} Lista de 3 combatentes normalizados.
     * @throws {Error} Se o tamanho for diferente de 3 ou houver espécies duplicadas.
     */
    function validateAndCreateTeam(rawTeam, label = 'team', options = {}) {
      if (!Array.isArray(rawTeam)) {
        throw new Error(`Equipe "${label}" inválida: deve ser um array com exatamente ${BATTLE_CONFIG.TEAM_SIZE} membros.`);
      }

      if (rawTeam.length !== BATTLE_CONFIG.TEAM_SIZE) {
        throw new Error(`Tamanho de equipe inválido para "${label}": possui ${rawTeam.length} membros, deve possuir exatamente ${BATTLE_CONFIG.TEAM_SIZE}.`);
      }

      const seenIds = new Set();
      const seenNames = new Set();
      const team = [];

      for (const rawMon of rawTeam) {
        if (!rawMon || typeof rawMon !== 'object') {
          throw new Error(`Membro inválido na equipe "${label}".`);
        }

        const id = Number(rawMon.id);
        const name = String(rawMon.name || '').trim().toLowerCase();

        if (seenIds.has(id) || (name && seenNames.has(name))) {
          throw new Error(`Espécie duplicada na equipe "${label}": [ID ${id} - ${name}].`);
        }
        seenIds.add(id);
        if (name) seenNames.add(name);

        team.push(createCombatant(rawMon));
      }

      return team;
    }

    /**
     * Retorna o combatente ativo atual para o lado especificado.
     * Compatível com Battle State v1 (1v1) e v2 (3v3).
     * 
     * @param {Object} state - Estado atual da batalha.
     * @param {'player'|'enemy'} role - Papel ('player' ou 'enemy').
     * @returns {Object} Combatente ativo.
     */
    function getActiveCombatant(state, role) {
      if (state.version === 2) {
        const side = state[role];
        return side.team[side.activeIndex];
      }
      return state[role];
    }

    /**
     * Inicializa um estado de batalha 1x1 a partir de dois combatentes.
     * Se forem passados arrays, delega automaticamente para createTeamBattle.
     * Garante total imutabilidade dos parâmetros de entrada.
     * 
     * @param {Object|Array} playerInput - Dados do Pokémon ou equipe do jogador.
     * @param {Object|Array} enemyInput - Dados do Pokémon ou equipe adversária.
     * @returns {Object} Estado inicial da batalha.
     */
    function createBattle(playerInput, enemyInput, options = {}) {
      if (Array.isArray(playerInput) || Array.isArray(enemyInput)) {
        return createTeamBattle(playerInput, enemyInput, options);
      }

      const playerCombatant = createCombatant(playerInput);
      const enemyCombatant = createCombatant(enemyInput);

      const state = {
        version: 1,
        status: BATTLE_STATUS.IN_PROGRESS,
        turn: 1,
        player: playerCombatant,
        enemy: enemyCombatant,
        winner: null,
        modifiers: options.modifiers || {},
        metadata: options.metadata || null
      };

      constants.P7.start(state,constants);
      return state;
    }

    /**
     * Inicializa um estado de batalha 3x3 a partir de duas equipes (PBA-006).
     * Slot 1 (índice 0) é o Líder e começa ativo em combate.
     * 
     * @param {Array<Object>} playerTeamInput - Lista com 3 Pokémon do jogador.
     * @param {Array<Object>} enemyTeamInput - Lista com 3 Pokémon adversários.
     * @returns {Object} Estado inicial Battle State v2.
     */
    function createTeamBattle(playerTeamInput, enemyTeamInput, options = {}) {
      const playerTeam = validateAndCreateTeam(playerTeamInput, 'player');
      const enemyTeam = validateAndCreateTeam(enemyTeamInput, 'enemy');

      const state = {
        version: 2,
        status: BATTLE_STATUS.IN_PROGRESS,
        turn: 1,
        player: {
          activeIndex: 0,
          team: playerTeam
        },
        enemy: {
          activeIndex: 0,
          team: enemyTeam
        },
        winner: null,
        modifiers: options.modifiers || {},
        metadata: options.metadata || null
      };

      constants.P7.start(state,constants);
      return state;
    }

    /**
     * Executa a troca voluntária de Pokémon ativo para um lado da batalha.
     * Valida limites, integridade de alvo, nocaute e emite eventos correspondentes.
     * 
     * @private
     * @param {'player'|'enemy'} role - Papel ('player' ou 'enemy').
     * @param {Object} state - Estado mutável do turno.
     * @param {Array<Object>} events - Lista de eventos acumulados.
     * @param {Object} action - Ação de troca { targetPokemonId, targetIndex }.
     * @param {string} [reason] - Motivo ('VOLUNTARY' ou 'FAINT_REPLACEMENT').
     */
    function executeSwitch(role, state, events, action, reason = 'VOLUNTARY') {
      if (state.version !== 2) {
        throw new Error('Ação de troca (SWITCH) não é suportada em batalhas 1x1.');
      }

      const side = state[role];
      const previousActive = side.team[side.activeIndex];
      if(reason==='VOLUNTARY' && constants.P6.switchBlocked(state,role))throw new Error('ACTION_REJECTED: troca impedida.');

      let targetIndex = -1;
      if (action.targetIndex !== undefined) {
        const idx = Number(action.targetIndex);
        if (Number.isInteger(idx) && idx >= 0 && idx < side.team.length) {
          targetIndex = idx;
        }
      } else if (action.targetPokemonId !== undefined) {
        targetIndex = side.team.findIndex(p => p.id === Number(action.targetPokemonId));
      }

      if (targetIndex === -1) {
        throw new Error(`Alvo de troca inválido ou não pertence à equipe de "${role}": ${JSON.stringify(action)}`);
      }

      const targetPokemon = side.team[targetIndex];

      if (targetIndex === side.activeIndex || targetPokemon.id === previousActive.id) {
        throw new Error(`Troca inválida: "${targetPokemon.name}" já é o Pokémon ativo.`);
      }

      if (targetPokemon.currentHp === 0) {
        throw new Error(`Troca inválida: não é possível trocar para "${targetPokemon.name}", pois já está nocauteado.`);
      }

      events.push({
        type: BATTLE_EVENTS.SWITCH_STARTED,
        actor: role,
        previousPokemonId: previousActive.id,
        targetPokemonId: targetPokemon.id
      });

      if (constants.resetStatStages) {
        constants.resetStatStages(previousActive);
      }
      previousActive.isFlinched = false;
      previousActive.confusionTurns = 0;
          previousActive.drowsyTurns=0;previousActive.drowsySleepDuration=0;
          previousActive.substitute = false;
          previousActive.substituteHp = 0;
          previousActive.tauntTurns = 0;
          previousActive.entryMoveAttempts = 0;
          constants.P7.leave(state,role,previousActive,constants,events);
          constants.P8.restore(previousActive);
          constants.P6.leave(state,role,previousActive);
          previousActive.rechargeMoveId=null;previousActive.lastMoveFailed=false;previousActive.lastDirectHit=null;previousActive.bideState=null;previousActive.twoTurnMove=null;previousActive.beakBlastReady=false;previousActive.shellTrapReady=false;
          previousActive.isProtected = false;
          previousActive.stallCount = 0;
      previousActive.toxicStage = 0;
      targetPokemon.isFlinched = false;
      targetPokemon.isProtected = false;
      targetPokemon.stallCount = 0;
      targetPokemon.twoTurnMove = null;
      targetPokemon.entryMoveAttempts = 0;
      targetPokemon.toxicStage = 0;

      side.activeIndex = targetIndex;

      events.push({
        type: BATTLE_EVENTS.POKEMON_SWITCHED,
        side: role,
        previousPokemonId: previousActive.id,
        newPokemonId: targetPokemon.id,
        reason: constants.SWITCH_REASON ? constants.SWITCH_REASON[reason] || reason : reason
      });
      if(reason==='PIVOT'&&action.batonPass?.stages){targetPokemon.statStages={...action.batonPass.stages};Object.assign(targetPokemon,action.batonPass.passVolatiles||{});targetPokemon.leechSeed=action.batonPass.passSeed;targetPokemon.minimized=action.batonPass.passMinimized;}
      constants.P7.sync(state);
      constants.P6.entry(state,role,constants,TypeEffectiveness,events);
      if(targetPokemon.currentHp>0)constants.P7.enter(state,role,constants,events);
      if(targetPokemon.currentHp<=0)resolveFaints(state,events,[role],'entry-hazard');
    }

    function resolveFaints(state, events, faintedRoles, cause = 'move') {
      const roles = [...new Set(faintedRoles)];
      for (const role of roles) {
        const pokemon = getActiveCombatant(state, role);
        if (constants.resetStatStages) {
          constants.resetStatStages(pokemon);
        }
        constants.P8.restore(pokemon);
        constants.P6.leave(state,role,pokemon);
        pokemon.rechargeMoveId=null;pokemon.bideState=null;pokemon.twoTurnMove=null;pokemon.beakBlastReady=false;pokemon.shellTrapReady=false;pokemon.lastDirectHit=null;
        pokemon.isProtected = false;
        pokemon.stallCount = 0;
        pokemon.isFlinched = false;
        pokemon.confusionTurns = 0;
        pokemon.toxicStage = 0;
        events.push({ type: BATTLE_EVENTS.POKEMON_FAINTED, target: role, pokemonName: pokemon.name });
      }
      if(state.battleFormat==='DOUBLES')return;
      const defeated = roles.filter(role => state.version === 1 ||
        state[role].team.every(pokemon => pokemon.currentHp === 0));
      constants.P7.sync(state);
      if (defeated.length) {
        // Um nocaute direto pode ter solicitado troca antes do dano residual encerrar a luta.
        for (let index = events.length - 1; index >= 0; index--) {
          if (events[index].type === BATTLE_EVENTS.REPLACEMENT_REQUIRED) events.splice(index, 1);
        }
        // No empate simultâneo por dano residual, a campanha considera derrota do jogador.
        const winner = defeated.includes('player') ? 'enemy' : 'player';
        if (state.version === 2) {
          for (const role of defeated) {
            events.push({ type: BATTLE_EVENTS.TEAM_DEFEATED, side: role, winner });
          }
        }
        delete state.pendingPivot;delete state.pendingTurn;delete state.turnActions;
        for(const role of ['player','enemy'])for(const mon of (state.version===2?state[role].team:[state[role]])){constants.P8.restore(mon,true);mon.twoTurnMove=null;mon.lockedMove=null;mon.bound=null;mon.trapped=null;mon.leechSeed=null;mon.isProtected=false;}
        state.winner = winner;
        state.status = winner === 'player' ? BATTLE_STATUS.PLAYER_WIN : BATTLE_STATUS.ENEMY_WIN;
        events.push({ type: BATTLE_EVENTS.BATTLE_ENDED, winner,
          reason: defeated.length === 2 ? 'Ambas as equipes caíram por status; empate conta como derrota do jogador.' :
            ['poison', 'toxic', 'burn'].includes(cause) ? `A equipe ${defeated[0]} caiu por ${cause === 'poison' || cause === 'toxic' ? 'veneno' : 'queimadura'}.` :
              state.version === 2 ? `Todos os Pokémon da equipe ${defeated[0]} foram derrotados.` :
                `${getActiveCombatant(state, defeated[0]).name} foi derrotado.` });
      } else {
        state.status = BATTLE_STATUS.AWAITING_REPLACEMENT;
        for (const role of roles) {
          events.push({ type: BATTLE_EVENTS.REPLACEMENT_REQUIRED, side: role,
            faintedPokemonId: getActiveCombatant(state, role).id,
            availablePokemonIds: state[role].team.filter(pokemon => pokemon.currentHp > 0).map(pokemon => pokemon.id) });
        }
      }
    }

    function cloneData(value){
      if(Array.isArray(value))return value.map(cloneData);
      if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,cloneData(item)]));
      return value;
    }
    function plannedMove(mon,action){
      if(action?.moveId!==undefined || action?.moveName!==undefined)return mon.moves.find(m=>(action.moveId!==undefined&&m.id===Number(action.moveId))||(action.moveName!==undefined&&m.name.toLowerCase()===String(action.moveName).toLowerCase()));
      return mon.moves.find(m=>m.currentPp>0)||mon.moves[0];
    }
    function finishTurn(state, events) {
      if(state.pendingPivot)return;
      // Intent is transient; delete after earlyResidual to allow deterministic rolls for end-turn abilities
      if (state.status !== BATTLE_STATUS.IN_PROGRESS &&
          state.status !== BATTLE_STATUS.AWAITING_REPLACEMENT) return;
      const aliveAtResidual=['player','enemy'].filter(r=>getActiveCombatant(state,r).currentHp>0);
      constants.P7.earlyResidual(state,constants,events);
      delete state.turnActions;
      constants.P6.residual(state,constants,events,'seed');
      const fainted = aliveAtResidual.filter(r=>getActiveCombatant(state,r).currentHp<=0);
      for (const role of ['player', 'enemy']) {
        const pokemon = getActiveCombatant(state, role);
        if (pokemon.statusCondition !== 'toxic') pokemon.toxicStage = 0;
        if (pokemon.currentHp <= 0 || constants.P7.ability(pokemon)==='magic-guard' || !['poison', 'toxic', 'burn'].includes(pokemon.statusCondition)) continue;
        const previousHp = pokemon.currentHp;
        // Modern Toxic: floor(maxHp / 16) * N, capped at N=15; switches reset N.
        if (pokemon.statusCondition === 'toxic') {
          const previousStage = Number.isInteger(pokemon.toxicStage) ? pokemon.toxicStage : 0;
          pokemon.toxicStage = Math.min(15, Math.max(0, previousStage) + 1);
        }
        const residual = pokemon.statusCondition === 'toxic'
          ? Math.max(1, Math.floor(constants.P8.baseMaxHp(pokemon) / 16)) * pokemon.toxicStage
          : Math.max(1, Math.floor(constants.P8.baseMaxHp(pokemon) / (pokemon.statusCondition === 'poison' ? 8 : 16)));
        const damage = Math.min(previousHp, residual);
        pokemon.currentHp -= damage;
        events.push({ type: BATTLE_EVENTS.STATUS_DAMAGE, target: role,
          pokemonName: pokemon.name, statusCondition: pokemon.statusCondition, damage, previousHp,
          currentHp: pokemon.currentHp, maxHp: pokemon.maxHp });
        if (pokemon.currentHp === 0) fainted.push(role);
      }


      const aliveBeforeP6=['player','enemy'].filter(r=>getActiveCombatant(state,r).currentHp>0);
      constants.P6.residual(state,constants,events,'binding');
      const residualFaints=aliveBeforeP6.filter(r=>getActiveCombatant(state,r).currentHp<=0);
      if(fainted.length||residualFaints.length)resolveFaints(state,events,[...new Set([...fainted,...residualFaints])],'persistent');
      // Yawn resolves after residual damage; leaving the field cancels drowsiness.
      for(const role of ['player','enemy']){
        const mon=getActiveCombatant(state,role);
        if(mon.currentHp<=0||!(mon.drowsyTurns>0))continue;
        mon.drowsyTurns--;
        if(mon.drowsyTurns===0){
          events.push({type:BATTLE_EVENTS.DROWSY_ENDED,target:role,pokemonName:mon.name});
          if(!mon.statusCondition&&!state.p6Sides[role].safeguard&&!constants.P7.statusImmune(mon,'sleep')){mon.statusCondition='sleep';mon.sleepTurns=mon.drowsySleepDuration||2;mon.sleepCounter=mon.sleepTurns;events.push({type:BATTLE_EVENTS.STATUS_APPLIED,target:role,pokemonName:mon.name,statusCondition:'sleep',sleepDuration:mon.sleepTurns});}
          mon.drowsySleepDuration=0;
        }
      }

      if(state.battleFormat!=='DOUBLES'||!state.doublesResidualPass){constants.P6.endField(state,events);constants.P7.endTurn(state,constants,events);}
      constants.P8.endTurn(state,constants,events);
      // Limpeza de estados temporários de turno (Flinch: P4 & Protect: P6)
      for (const role of ['player', 'enemy']) {
        const mon = getActiveCombatant(state, role);
        if (mon) {
          mon.isFlinched = false;
          mon.isProtected = false;mon.maxGuard=false;
          if (mon.tauntTurns > 0) {
            mon.tauntTurns--;
            if (mon.tauntTurns === 0) {
              events.push({
                type: BATTLE_EVENTS.MOVE_PREPARED,
                actor: role,
                pokemonName: mon.name,
                reason: 'TAUNT_ENDED'
              });
            }
          }
        }
      }

      if (state.status === BATTLE_STATUS.IN_PROGRESS) state.turn += 1;
    }

    /**
     * Executa um único turno completo da batalha.
     * Suporta batalhas 1x1 (v1) e 3x3 (v2), com prioridade estrita de SWITCH sobre MOVE.
     * Não muta o estado recebido; retorna um novo estado clonado e a lista de eventos.
     * 
     * @param {Object} currentState - Estado atual da batalha.
     * @param {Object} [actions] - Comandos de ação: { player: {...}, enemy: {...} }.
     * @returns {{ state: Object, events: Array<Object> }} Novo estado e eventos gerados.
     * @throws {Error} Se o estado for inválido ou se a batalha já estiver encerrada.
     */
    function resolveTurn(currentState, actions = {}) {
      if (!currentState || typeof currentState !== 'object') {
        throw new Error('Estado de batalha inválido.');
      }

      if (currentState.status !== BATTLE_STATUS.IN_PROGRESS) {
        throw new Error(`Não é possível executar turno em uma batalha com status: ${currentState.status}. A batalha já foi encerrada ou aguarda substituição.`);
      }

      // Clona o estado para garantir total imutabilidade da entrada
      const nextState = cloneData(currentState);
      const events = [];
      constants.P6.init(nextState);
      constants.P7.start(nextState,constants);
      if(nextState.initialP7Events){events.push(...nextState.initialP7Events);delete nextState.initialP7Events;}
      for(const r of ['player','enemy'])getActiveCombatant(nextState,r).abilityIgnored=false;
      constants.P7.sync(nextState);
      const currentTurn = nextState.turn;
      actions=cloneData({...actions});
      for(const role of ['player','enemy'])if(actions[role])delete actions[role].pursuitIntercept;
      for(const role of ['player','enemy']){
        if(actions[role]?.special!=='dynamax'&&(constants.P6.mustStruggle(getActiveCombatant(nextState,role))||constants.P7.mustStruggle(getActiveCombatant(nextState,role))||constants.P8.mustStruggle(getActiveCombatant(nextState,role))))actions[role]={...actions[role],type:BATTLE_ACTIONS.MOVE,moveId:165,moveName:undefined};
        if(getActiveCombatant(nextState,role).rechargeMoveId)actions[role]={type:BATTLE_ACTIONS.RECHARGE};
        if(getActiveCombatant(nextState,role).bideState && actions[role]?.type!=='SWITCH')actions[role]={...actions[role],type:BATTLE_ACTIONS.MOVE,moveId:117,moveName:undefined};
        if(getActiveCombatant(nextState,role).lockedMove)actions[role]={...actions[role],type:BATTLE_ACTIONS.MOVE,moveId:getActiveCombatant(nextState,role).lockedMove.id,moveName:undefined};
        if(getActiveCombatant(nextState,role).twoTurnMove)actions[role]={...actions[role],type:BATTLE_ACTIONS.MOVE,moveId:getActiveCombatant(nextState,role).twoTurnMove.id,moveName:getActiveCombatant(nextState,role).twoTurnMove.name};
      }
      for(const role of ['player','enemy'])constants.P8.prepare(nextState,role,actions[role],constants,events);
      nextState.turnActions = actions;
      for(const role of ['player','enemy'])for(const mon of (nextState.version===2?nextState[role].team:[nextState[role]])){
        mon.actedThisTurn=false;mon.damagedThisTurn=false;mon.lastDirectHit=null;mon.beakBlastReady=false;mon.shellTrapReady=false;mon.shellTrapTriggered=false;mon.focusLost=false;
      }
      for(const role of ['player','enemy']){const side=nextState[role];for(const mon of (nextState.version===2?side.team:[side]))mon.statsRaisedThisTurn=false;}

      // Evento de início do turno
      events.push({
        type: BATTLE_EVENTS.TURN_STARTED,
        turn: currentTurn
      });

      for(const role of ['player','enemy']){
        const mon=getActiveCombatant(nextState,role),a=actions[role];
        const chosen=plannedMove(mon,a);
        if(!mon.rechargeMoveId && a?.type!=='SWITCH' && chosen?.id===264)events.push({type:BATTLE_EVENTS.MOVE_PREPARED,actor:role,pokemonName:mon.name,moveName:chosen.name,reason:'FOCUS_READY'});
        if(!mon.rechargeMoveId && a?.type!=='SWITCH' && [690,704].includes(chosen?.id)){
          mon.beakBlastReady=chosen.id===690;mon.shellTrapReady=chosen.id===704;
          events.push({type:BATTLE_EVENTS.MOVE_PREPARED,actor:role,pokemonName:mon.name,moveName:chosen.name,reason:chosen.id===690?'BEAK_BLAST_READY':'SHELL_TRAP_READY'});
        }
      }
      const isPlayerSwitch = actions.player && actions.player.type === BATTLE_ACTIONS.SWITCH;
      const isEnemySwitch = actions.enemy && actions.enemy.type === BATTLE_ACTIONS.SWITCH;

      for(const role of ['player','enemy']){
        const foe=constants.P6.other(role);
        if(actions[foe]?.type==='SWITCH'&&actions[role]?.type!=='SWITCH'&&plannedMove(getActiveCombatant(nextState,role),actions[role])?.id===228){
          executeAction(role,foe,nextState,events,{...actions[role],pursuitIntercept:true});
          if(nextState.status==='IN_PROGRESS')executeSwitch(foe,nextState,events,actions[foe],'VOLUNTARY');
          finishTurn(nextState,events);return {state:nextState,events};
        }
      }
      // CENÁRIO 1: AMBOS ESCOLHERAM SWITCH (Prioridade total, ordem determinística player -> enemy)
      if (isPlayerSwitch && isEnemySwitch) {
        executeSwitch('player', nextState, events, actions.player, 'VOLUNTARY');
        executeSwitch('enemy', nextState, events, actions.enemy, 'VOLUNTARY');

        finishTurn(nextState, events);
        return { state: nextState, events };
      }

      // CENÁRIO 2: PLAYER SWITCH VS ENEMY MOVE (Switch tem prioridade sobre Move)
      if (isPlayerSwitch && !isEnemySwitch) {
        executeSwitch('player', nextState, events, actions.player, 'VOLUNTARY');
        // O ataque do adversário atinge o NOVO Pokémon ativo que acabou de entrar!
        executeAction('enemy', 'player', nextState, events, actions.enemy);
        if(nextState.pendingPivot)nextState.pendingTurn={};

        finishTurn(nextState, events);
        return { state: nextState, events };
      }

      // CENÁRIO 3: ENEMY SWITCH VS PLAYER MOVE (Switch tem prioridade sobre Move)
      if (!isPlayerSwitch && isEnemySwitch) {
        executeSwitch('enemy', nextState, events, actions.enemy, 'VOLUNTARY');
        // O ataque do jogador atinge o NOVO Pokémon ativo adversário!
        executeAction('player', 'enemy', nextState, events, actions.player);
        if(nextState.pendingPivot)nextState.pendingTurn={};

        finishTurn(nextState, events);
        return { state: nextState, events };
      }

      // CENÁRIO 4: AMBOS ESCOLHERAM MOVE (Prioridade do golpe e Velocidade determinam a ordem)
      const activePlayer = getActiveCombatant(nextState, 'player');
      const activeEnemy = getActiveCombatant(nextState, 'enemy');

      const order = TurnManager.determineOrder(activePlayer, activeEnemy, actions.player, actions.enemy);
      const [firstRole, secondRole] = order;

      const firstAction = actions[firstRole];
      const secondAction = actions[secondRole];
      const startingActiveSecond = getActiveCombatant(nextState, secondRole);

      // --- AÇÃO DO PRIMEIRO COMBATENTE ---
      executeAction(firstRole, secondRole, nextState, events, firstAction);

      if(nextState.pendingPivot){
        if(nextState.pendingPivot.moveId!==226&&plannedMove(startingActiveSecond,secondAction)?.id===228){
          const p=nextState.pendingPivot;nextState.status='IN_PROGRESS';executeAction(secondRole,firstRole,nextState,events,{...secondAction,pursuitIntercept:true});
          if(getActiveCombatant(nextState,firstRole).currentHp>0){nextState.pendingPivot=p;nextState.status='AWAITING_REPLACEMENT';nextState.pendingTurn={};}else delete nextState.pendingPivot;
        }else nextState.pendingTurn={role:secondRole,opponent:firstRole,action:secondAction,actorId:startingActiveSecond.id};
      }
      // Se o defensor foi nocauteado (ou a batalha terminou), o segundo combatente NÃO contra-ataca
      if (nextState.status !== BATTLE_STATUS.IN_PROGRESS) {
        finishTurn(nextState, events);
        return {
          state: nextState,
          events
        };
      }

      // Se o segundo combatente foi forçado a trocar pelo primeiro ataque, sua ação é invalidada
      const currentActiveSecond = getActiveCombatant(nextState, secondRole);
      if (currentActiveSecond.id !== startingActiveSecond.id) {
        finishTurn(nextState, events);
        return {
          state: nextState,
          events
        };
      }

      // --- AÇÃO DO SEGUNDO COMBATENTE ---
      executeAction(secondRole, firstRole, nextState, events, secondAction);

      if(nextState.pendingPivot)nextState.pendingTurn={};
      // Se a batalha continuar em progresso, avança o contador de turnos
      finishTurn(nextState, events);

      return {
        state: nextState,
        events
      };
    }

    /**
     * Executa a ação de golpe de um combatente contra outro dentro do turno.
     * Atualiza o estado recebido e empilha os eventos correspondentes em ordem estrita.
     * 
     * @private
     * @param {'player'|'enemy'} attackerRole - Papel de quem ataca.
     * @param {'player'|'enemy'} defenderRole - Papel de quem defende.
     * @param {Object} state - Estado mutável do turno em resolução.
     * @param {Array<Object>} events - Lista de eventos do turno.
     * @param {Object} [action] - Comando da ação { moveId, accuracyRoll }.
     */
    function afterDirectHit(attacker,defender,attackerRole,defenderRole,move,events,damage){
      if(damage<=0)return;
      if(defender.shellTrapReady && move.damageClass==='physical')defender.shellTrapTriggered=true;
      defender.focusLost=true;
      if(defender.bideState)defender.bideState.damage+=damage;
      if(defender.beakBlastReady && !attacker.safeguarded && constants.P5.contactIds.includes(move.id) && constants.isEligibleForStatusCondition(attacker,'burn')){
        attacker.statusCondition='burn';
        events.push({type:BATTLE_EVENTS.STATUS_APPLIED,source:defenderRole,target:attackerRole,pokemonName:attacker.name,statusCondition:'burn',moveId:690,moveName:'beak-blast',chance:100});
        constants.P7.checkSynchronize?.(null,defenderRole,attackerRole,'burn',constants,events,defender,attacker);
      }
    }
    function executeAction(attackerRole, defenderRole, state, events, action, calledMove = false, pressureCallerId = null) {
      const attacker=getActiveCombatant(state,attackerRole), originalTarget=getActiveCombatant(state,defenderRole), start=events.length;
      if(attacker.currentHp<=0 || state.status!=='IN_PROGRESS')return;
      executeActionCore(attackerRole,defenderRole,state,events,action,calledMove,pressureCallerId);
      attacker.abilityIgnored=false;originalTarget.abilityIgnored=false;attacker.p7BlockDrop=false;attacker.p7BlockAttackDrop=false;attacker.p7KeenEyeAccuracyBlock=false;originalTarget.p7BlockDrop=false;originalTarget.p7BlockAttackDrop=false;originalTarget.p7KeenEyeAccuracyBlock=false;
      constants.Completion.crash(state,attackerRole,attacker,action,events.slice(start),constants,events);
      if(!calledMove&&!state.doublesSpread)constants.P7.afterMove(state,attackerRole,events,constants,events.slice(start));
      if(attacker.currentHp<=0&&!events.slice(start).some(e=>e.type===BATTLE_EVENTS.POKEMON_FAINTED&&e.target===attackerRole))resolveFaints(state,events,[attackerRole],'item');
      if(attacker.pivotAfterHit){const id=attacker.pivotAfterHit;delete attacker.pivotAfterHit;if(attacker.currentHp>0&&!['PLAYER_WIN','ENEMY_WIN'].includes(state.status))constants.P6.requestPivot(state,attackerRole,id,events);}
      const batch=events.slice(start);
      constants.P8.remember(attacker,batch,attackerRole);
      const lastSpecial=batch.findLast(e=>e.type==='MOVE_USED'&&e.actor===attackerRole&&e.damageClass!=='status')||batch.find(e=>e.type==='MOVE_USED'&&e.actor===attackerRole),specialMove=lastSpecial&&{...constants.KNOWN_CATALOG_MOVES[lastSpecial.moveId],id:lastSpecial.moveId,type:lastSpecial.moveType,damageClass:lastSpecial.damageClass};if(!calledMove&&!state.doublesSpread)constants.P8.finishMove(attacker,specialMove||{},Boolean(specialMove&&!constants.P5.fixed(specialMove)&&!constants.isFractionalDamageMove(specialMove)&&!constants.isConstantDamageMove(specialMove)&&!constants.isLevelDamageMove(specialMove)&&batch.some(e=>e.type===BATTLE_EVENTS.DAMAGE_APPLIED&&e.source===attackerRole&&e.damage>0)));
      const used=batch.find(e=>e.type===BATTLE_EVENTS.MOVE_USED && constants.isRechargeMove({id:e.moveId,name:e.moveName}));
      if(used && attacker.currentHp>0 && batch.some(e=>e.type===BATTLE_EVENTS.DAMAGE_APPLIED && e.source===attackerRole && e.moveName===used.moveName && e.damage>0)){
        attacker.rechargeMoveId=used.moveId;
        if(!batch.some(e=>e.type===BATTLE_EVENTS.MOVE_PREPARED && e.reason==='RECHARGE_REQUIRED'))events.push({type:BATTLE_EVENTS.MOVE_PREPARED,actor:attackerRole,pokemonName:attacker.name,moveId:used.moveId,moveName:used.moveName,reason:'RECHARGE_REQUIRED'});
      }
      if(calledMove)return;
      // Record each direct hit in order; Counter reflects the final hit of a multi-hit move.
      for(const event of batch){
        if(event.type===BATTLE_EVENTS.DAMAGE_APPLIED && event.previousHp>event.currentHp){
          const target=originalTarget;
          if(target && target.currentHp>0 && getActiveCombatant(state,event.target)===target){target.damagedThisTurn=true;target.lastDirectHit={turn:state.turn,sourceId:attacker.id,sourceRole:attackerRole,damage:event.previousHp-event.currentHp,damageClass:event.damageClass};}
        }
        if([BATTLE_EVENTS.RECOIL_APPLIED,BATTLE_EVENTS.CONFUSION_DAMAGE].includes(event.type))attacker.damagedThisTurn=true;
      }
      const attempted=batch.some(e=>e.type===BATTLE_EVENTS.PP_CHANGED);
      const aborted=batch.some(e=>[BATTLE_EVENTS.STATUS_IMMOBILIZED,BATTLE_EVENTS.FLINCH_IMMOBILIZED,BATTLE_EVENTS.CONFUSION_DAMAGE].includes(e.type));
      const changes=batch.filter(e=>e.type===BATTLE_EVENTS.STAT_STAGE_CHANGED);
      if(attempted||aborted)attacker.lastMoveFailed=aborted||batch.some(e=>[BATTLE_EVENTS.MOVE_FAILED,BATTLE_EVENTS.MOVE_MISSED,BATTLE_EVENTS.STATUS_BLOCKED,BATTLE_EVENTS.CONFUSION_BLOCKED].includes(e.type))||batch.some(e=>e.type===BATTLE_EVENTS.DAMAGE_APPLIED&&e.multiplier===0)||(changes.length>0&&changes.every(e=>e.appliedDelta===0)&&!batch.some(e=>e.type===BATTLE_EVENTS.DAMAGE_APPLIED));
      if(batch.some(e=>['TRANSFORMED','SKETCHED'].includes(e.reason)))attacker.lastMoveFailed=false;
      const usedP6=batch.find(e=>e.type===BATTLE_EVENTS.MOVE_USED&&e.actor===attackerRole);
      if(usedP6)attacker.lastP6Move=usedP6.moveId;
      if(usedP6&&constants.P6.rampage.includes(usedP6.moveId)&&attacker.currentHp>0&&batch.some(e=>e.type===BATTLE_EVENTS.DAMAGE_APPLIED&&e.source===attackerRole&&e.damage>0)){
        if(!attacker.lockedMove){const turns=action?.lockedDuration??2;if(!Number.isInteger(turns)||turns<2||turns>3)throw new Error('Duração de sequência inválida.');attacker.lockedMove={id:usedP6.moveId,left:turns};}
        if(--attacker.lockedMove.left===0){attacker.lockedMove=null;const turns=action?.confusionDuration??3;if(!Number.isInteger(turns)||turns<2||turns>5)throw new Error('Duração de confusão inválida.');if(!attacker.confusionTurns){attacker.confusionTurns=turns;events.push({type:BATTLE_EVENTS.CONFUSION_APPLIED,target:attackerRole,pokemonName:attacker.name,duration:turns,moveName:usedP6.moveName});}}
      }else if(attacker.lockedMove){
        const confuse=attacker.lockedMove.left===1&&attacker.currentHp>0&&attacker.statusCondition!=='sleep';attacker.lockedMove=null;
        if(confuse&&!attacker.confusionTurns){const turns=action?.confusionDuration??3;if(!Number.isInteger(turns)||turns<2||turns>5)throw new Error('Duração de confusão inválida.');attacker.confusionTurns=turns;events.push({type:BATTLE_EVENTS.CONFUSION_APPLIED,target:attackerRole,pokemonName:attacker.name,duration:turns});}
      }
      attacker.actedThisTurn=true;
      if(batch.some(e=>e.type===BATTLE_EVENTS.MOVE_USED&&e.moveId===690))attacker.beakBlastReady=false;
      if(attacker.bideState && !batch.some(e=>e.type===BATTLE_EVENTS.MOVE_USED))attacker.bideState=null;
    }
    function executeActionCore(attackerRole, defenderRole, state, events, action, calledMove = false, pressureCallerId = null) {
      const attacker = getActiveCombatant(state, attackerRole);
      const defender = getActiveCombatant(state, defenderRole);
      const attackerInfiltrates = Boolean(constants.P7?.ability(attacker) === "infiltrator" && !attacker.abilitySuppressed);
      constants.P6.init(state);
      attacker.safeguarded=Boolean(state.p6Sides[attackerRole].safeguard);
      defender.safeguarded=Boolean(state.p6Sides[defenderRole].safeguard) && !attackerInfiltrates;

      // Recharge precedes PP, sleep, freeze, flinch and confusion checks. It is an action, not a move failure.
      if(attacker.rechargeMoveId){
        attacker.stallCount = 0;
        const moveId=attacker.rechargeMoveId;attacker.rechargeMoveId=null;
        events.push({type:BATTLE_EVENTS.MOVE_PREPARED,actor:attackerRole,pokemonName:attacker.name,moveId,moveName:constants.RECHARGE_MOVES[moveId]?.name,reason:'RECHARGING'});
        return;
      }
      if(action?.type===BATTLE_ACTIONS.RECHARGE)throw new Error('ACTION_REJECTED: nenhuma recarga pendente.');
      if(attacker.bideState)action={...action,moveId:117,moveName:undefined};
      const continuingLocked=Boolean(attacker.lockedMove);
      if(continuingLocked)action={...action,moveId:attacker.lockedMove.id,moveName:undefined};
      const continuingTwoTurn=Boolean(attacker.twoTurnMove);
      if(continuingTwoTurn)action={...action,moveId:attacker.twoTurnMove.id,moveName:attacker.twoTurnMove.name};
      // B3-06: Validação de que apenas o Pokémon ativo pode realizar ações de combate
      if (action && action.pokemonId !== undefined && Number(action.pokemonId) !== attacker.id) {
        throw new Error(`Apenas o Pokémon ativo ("${attacker.name}") pode realizar ações de combate.`);
      }

      // 1. Seleciona o golpe a ser executado
      let selectedMove;
      const isStruggle=(constants.P6.mustStruggle(attacker)||constants.P7.mustStruggle(attacker)||constants.P8.mustStruggle(attacker)||state.battleFormat==='DOUBLES'&&!attacker.moves.some(m=>m.currentPp>0&&constants.P7.legalMove(attacker,m)));
      if(isStruggle)selectedMove={...constants.P6.struggle};
      else if (action && (action.moveId !== undefined || action.moveName !== undefined)) {
        selectedMove = attacker.moves.find(m =>
          (action.moveId !== undefined && m.id === Number(action.moveId)) ||
          (action.moveName !== undefined && m.name.toLowerCase() === String(action.moveName).trim().toLowerCase())
        );
        if (!selectedMove && (calledMove || action?.bounced)) {
          selectedMove = constants.KNOWN_CATALOG_MOVES[action.moveId] || Object.values(constants.SUPPORTED_STATUS_MOVES).find(m => m.id === Number(action.moveId));
        }
        if (!selectedMove) {
          throw new Error(`Golpe especificado não pertence ao loadout de "${attacker.name}": ${JSON.stringify(action)}`);
        }
      } else {
        // Fallback automático para o primeiro golpe com PP disponível
        selectedMove = attacker.moves.find(m => m.currentPp > 0);
      }

      if (!selectedMove) {
        throw new Error(`NO_USABLE_MOVES: "${attacker.name}" não possui golpes utilizáveis com PP disponível.`);
      }

      const ppMove=selectedMove;
      selectedMove=constants.P8.activeMove(attacker,selectedMove,constants);
      if(!calledMove && constants.P6.consecutive.includes(selectedMove.id)&&attacker.lastP6Move===selectedMove.id)throw new Error('ACTION_REJECTED: este golpe não pode ser usado consecutivamente.');
      if(!calledMove && !attacker.dynamax && attacker.choiceLock && ['choice-band','choice-specs','choice-scarf'].includes(attacker.item)&&selectedMove.id!==attacker.choiceLock&&!isStruggle)throw new Error('ACTION_REJECTED: item Choice bloqueia outro golpe.');
      if(!calledMove && attacker.item==='assault-vest'&&selectedMove.damageClass==='status')throw new Error('ACTION_REJECTED: Assault Vest impede golpes de status.');
      const actualDamageClass = constants.P8.damageClass(attacker,selectedMove,constants);
      constants.P7.sync(state);attacker.abilityIgnored=false;defender.abilityIgnored=constants.P7.ignored(attacker,defender,selectedMove);
      attacker.p7BlockDrop=false;attacker.p7BlockAttackDrop=false;attacker.p7KeenEyeAccuracyBlock=false;defender.p7BlockDrop=['clear-body','white-smoke','full-metal-body'].includes(constants.P7.defenderAbility(attacker,defender,selectedMove));defender.p7BlockAttackDrop=constants.P7.defenderAbility(attacker,defender,selectedMove)==='hyper-cutter';defender.p7KeenEyeAccuracyBlock=constants.P7.defenderAbility(attacker,defender,selectedMove)==='keen-eye';
      const actualDamageType=constants.P8.moveType(attacker,selectedMove,constants.P7.moveType(state,attacker,selectedMove,constants.P5.type(selectedMove,attacker)));
      const damageMove={...selectedMove,damageClass:actualDamageClass,type:actualDamageType,originalType:selectedMove.originalType||selectedMove.type};
      const continuingBide=Boolean(attacker.bideState);
      // Validação de PP
      if (!calledMove && !continuingBide && !continuingTwoTurn && !continuingLocked && !isStruggle && selectedMove.currentPp <= 0) {
        throw new Error(`ACTION_REJECTED: PP do golpe "${selectedMove.name}" está esgotado.`);
      }

      // Validação do roll de acurácia determinístico
      let accuracyRoll = 1; // Padrão garante acerto em chamadas sem roll explícito
      if (action && action.accuracyRoll !== undefined) {
        const roll = Number(action.accuracyRoll);
        if (!Number.isFinite(roll) || !Number.isInteger(roll) || roll < 1 || roll > 100) {
          throw new Error(`Roll de acurácia inválido: ${action.accuracyRoll}. Deve ser um inteiro entre 1 e 100.`);
        }
        accuracyRoll = roll;
      }

      let statusRoll = 100;
      if (action && action.statusRoll !== undefined) {
        const roll = Number(action.statusRoll);
        if (!Number.isInteger(roll) || roll < 1 || roll > 100) {
          throw new Error(`Roll de status inválido: ${action.statusRoll}. Deve ser um inteiro entre 1 e 100.`);
        }
        statusRoll = roll;
      }

      let secondaryEffectRoll = 100; // Padrão defensivo de retrocompatibilidade: não aplica efeito secundário quando ausente
      if (action && action.secondaryEffectRoll !== undefined) {
        const roll = Number(action.secondaryEffectRoll);
        if (!Number.isInteger(roll) || roll < 1 || roll > 100) {
          throw new Error(`Roll de efeito secundário inválido: ${action.secondaryEffectRoll}. Deve ser um inteiro entre 1 e 100.`);
        }
        secondaryEffectRoll = roll;
      }

      let thawRoll = 100; // Padrão determinístico documentado: sem descongelamento quando ausente
      if (action && action.thawRoll !== undefined) {
        const roll = Number(action.thawRoll);
        if (!Number.isInteger(roll) || roll < 1 || roll > 100) {
          throw new Error(`Roll de descongelamento inválido: ${action.thawRoll}. Deve ser um inteiro entre 1 e 100.`);
        }
        thawRoll = roll;
      }

      let confusionHitRoll = 100; // Padrão determinístico documentado: sem autoagressão quando ausente (100 > 33)
      if (action && action.confusionHitRoll !== undefined) {
        const roll = Number(action.confusionHitRoll);
        if (!Number.isInteger(roll) || roll < 1 || roll > 100) {
          throw new Error(`Roll de autoagressão de confusão inválido: ${action.confusionHitRoll}. Deve ser um inteiro entre 1 e 100.`);
        }
        confusionHitRoll = roll;
      }

      let confusionDamageRoll = 100; // Padrão determinístico documentado: roll máximo de variância (100) quando ausente
      if (action && action.confusionDamageRoll !== undefined) {
        const roll = Number(action.confusionDamageRoll);
        if (!Number.isFinite(roll) || roll < 85 || roll > 100) {
          throw new Error(`Roll de dano de confusão inválido: ${action.confusionDamageRoll}. Deve ser um número entre 85 e 100.`);
        }
        confusionDamageRoll = roll;
      }

      const isProtecting = constants.isProtectMove(selectedMove);
      const currentStallCount = Math.max(0, Number.isInteger(attacker.stallCount) ? attacker.stallCount : 0);
      const protectDenominator = Math.min(729, Math.pow(3, currentStallCount));
      let protectRoll = 1;
      let protectSuccess = true;
      if (isProtecting && currentStallCount > 0) {
        if (action && action.protectRoll !== undefined) {
          const roll = Number(action.protectRoll);
          if (!Number.isFinite(roll) || roll < 0) {
            throw new Error(`Roll de proteção inválido: ${action.protectRoll}.`);
          }
          if (Number.isInteger(roll)) {
            if (roll < 1 || roll > protectDenominator) {
              throw new Error(`Roll de proteção inteiro inválido: ${roll}. Deve estar entre 1 e ${protectDenominator}.`);
            }
            protectSuccess = (roll === 1);
          } else {
            if (roll < 0 || roll >= 1) {
              throw new Error(`Roll de proteção float inválido: ${roll}. Deve estar entre 0 e 1.`);
            }
            protectSuccess = (roll < (1 / protectDenominator));
          }
          protectRoll = roll;
        } else {
          protectSuccess = true;
        }
      }

      // Each scheduled move opportunity consumes the entry window, even if prevented.
      if(!calledMove) attacker.entryMoveAttempts = Math.max(0, Number.isInteger(attacker.entryMoveAttempts) ? attacker.entryMoveAttempts : 0) + 1;

      // Evento de início de ação
      events.push({
        type: BATTLE_EVENTS.ACTION_STARTED,
        actor: attackerRole,
        pokemonName: attacker.name,
        action: BATTLE_ACTIONS.MOVE
      });

      // Verificação canônica de sono (Sleep: P4)
      // Precedência: Sono é checado antes de Flinch e Paralisia.
      // Enquanto sleepTurns > 0: a ação é impedida, sleepTurns reduz em 1 e emite STATUS_IMMOBILIZED.
      // Flinch pendente é descartado sem duplo anúncio. Nenhum PP é consumido.
      const sleepUsable=[173,214].includes(selectedMove.id);
      if (!calledMove && attacker.statusCondition === 'sleep') {
        if (attacker.sleepTurns > 0) {
          attacker.sleepTurns -= 1;
          attacker.sleepCounter = attacker.sleepTurns;
          if(!sleepUsable){
          attacker.isFlinched = false;
          attacker.stallCount = 0;
          if (attacker.twoTurnMove) attacker.twoTurnMove = null;
          events.push({
            type: BATTLE_EVENTS.STATUS_IMMOBILIZED,
            actor: attackerRole,
            pokemonName: attacker.name,
            statusCondition: 'sleep',
            remainingTurns: attacker.sleepTurns
          });
          return;
          }
        } else {
          attacker.statusCondition = null;
          attacker.sleepTurns = 0;
          attacker.sleepCounter = 0;
          events.push({
            type: BATTLE_EVENTS.STATUS_CURED,
            actor: attackerRole,
            target: attackerRole,
            pokemonName: attacker.name,
            statusCondition: 'sleep',
            reason: 'WOKE_UP'
          });
        }
      }

      // Verificação canônica de congelamento (Freeze: P4)
      // Precedência canônica moderna (Pokémon Showdown data/conditions.ts frz.onBeforeMovePriority: 10 vs flinch: 8):
      // 1. Movimentos com flag defrost (Scald) superam o impedimento de freeze sem depender da rolagem natural,
      //    mas NÃO removem o congelamento aqui: a cura ocorre apenas na etapa de execução correspondente (onModifyMove).
      // 2. Rolagem natural (20% de chance, 1..20 descongela; 21..100 permanece congelado).
      // 3. Se permanecer congelado: a ação é impedida, nenhum PP é consumido e flinch pendente é descartado.
      // 4. Se descongelar naturalmente: a cura ocorre imediatamente (STATUS_CURED, THAWED), permitindo que flinch
      //    pendente impeça a ação normalmente na sequência canônica.
      if (!calledMove && attacker.statusCondition === 'freeze') {
        const isSelfThaw = Boolean(constants?.isSelfThawingMove && constants.isSelfThawingMove(selectedMove));
        if (isSelfThaw) {
          // Permissão para superar o impedimento de freeze sem rolagem natural.
          // O status 'freeze' é mantido até a execução do golpe.
        } else if (thawRoll <= 20) {
          attacker.statusCondition = null;
          events.push({
            type: BATTLE_EVENTS.STATUS_CURED,
            actor: attackerRole,
            target: attackerRole,
            pokemonName: attacker.name,
            statusCondition: 'freeze',
            reason: 'THAWED',
            thawRoll
          });
        } else {
          attacker.isFlinched = false;
          attacker.stallCount = 0;
          if (attacker.twoTurnMove) attacker.twoTurnMove = null;
          events.push({
            type: BATTLE_EVENTS.STATUS_IMMOBILIZED,
            actor: attackerRole,
            pokemonName: attacker.name,
            statusCondition: 'freeze',
            reason: 'FROZEN_SOLID',
            thawRoll
          });
          return;
        }
      }

      // Verificação canônica de hesitação (Flinch: P4)
      // Precedência canônica: Flinch (priority 8) é verificado após a checagem de sono e freeze.
      // Se o Pokémon hesita, ele perde a ação imediatamente sem consumir PP.
      // Se um usuário congelado de Scald hesitar, ele permanece congelado (sem STATUS_CURED e sem perda de PP).
      if (!calledMove && attacker.isFlinched) {
        attacker.isFlinched = false;
        attacker.stallCount = 0;
        if (attacker.twoTurnMove) attacker.twoTurnMove = null;
        events.push({
          type: BATTLE_EVENTS.FLINCH_IMMOBILIZED,
          actor: attackerRole,
          pokemonName: attacker.name
        });
        // Steadfast: +1 Speed when flinched (not breakable by Mold Breaker)
        if (constants.P7.ability(attacker, false) === 'steadfast') {
          constants.P6.stage(constants, events, attackerRole, attacker, 'speed', 1);
          events.push({ type: 'MOVE_PREPARED', actor: attackerRole, pokemonName: attacker.name, reason: 'P7_ABILITY', label: 'steadfast' });
        }
        return;
      }

      // Verificação canônica de confusão (Confusion: P4)
      // Precedência canônica moderna (Showdown data/conditions.ts confusion.onBeforeMovePriority: 3 vs flinch: 8 e paralysis: 1):
      // 1. O contador de confusão (confusionTurns) diminui em 1 no início da tentativa de movimento.
      // 2. Se o contador chegar a 0: a confusão termina, emite CONFUSION_ENDED (SNAPPED_OUT) e o movimento prossegue normalmente no mesmo turno.
      // 3. Se o contador permanecer > 0: o Pokémon continua confuso, emite CONFUSION_CHECK e avalia autoagressão (chance de 33% no Gen 7+: roll 1..33).
      // 4. Se houver autoagressão (roll <= 33):
      //    - O movimento escolhido é abortado sem consumo de PP e sem descongelamento por Scald (se estiver congelado).
      //    - Calcula dano físico sem tipo com poder base 40, usando Attack e Defense do próprio atacante com respectivos estágios.
      //    - Sem STAB, sem eficácia elemental, sem crítico e sem penalidade de queimadura.
      //    - Aplica o dano ao próprio combatente e emite CONFUSION_DAMAGE.
      //    - Se currentHp chegar a 0, resolve o nocaute via resolveFaints.
      //    - Encerra a ação do combatente imediatamente (return).
      // 5. Se não houver autoagressão (roll >= 34):
      //    - A ação prossegue para as etapas seguintes (descongelamento por Scald, MOVE_SELECTED, paralisia, execução).
      if (!calledMove && attacker.confusionTurns > 0) {
        attacker.confusionTurns -= 1;
        if (attacker.confusionTurns === 0) {
          events.push({
            type: BATTLE_EVENTS.CONFUSION_ENDED,
            actor: attackerRole,
            target: attackerRole,
            pokemonName: attacker.name,
            reason: 'SNAPPED_OUT'
          });
        } else {
          events.push({
            type: BATTLE_EVENTS.CONFUSION_CHECK,
            actor: attackerRole,
            pokemonName: attacker.name,
            remainingTurns: attacker.confusionTurns
          });

          if (confusionHitRoll <= 33) {
            attacker.stallCount = 0;
            if (attacker.twoTurnMove) attacker.twoTurnMove = null;
            const attackStat = constants.getEffectiveStat
              ? constants.getEffectiveStat(attacker, 'attack')
              : attacker.attack;
            const defenseStat = constants.getEffectiveStat
              ? constants.getEffectiveStat(attacker, 'defense')
              : attacker.defense;
            const simulationLevel = constants.BATTLE_CONFIG?.SIMULATION_LEVEL || 50;
            const baseDamage = DamageCalculator.calculateBaseDamage(attackStat, defenseStat, 40, simulationLevel);
            const finalDamage = DamageCalculator.applyModifier(baseDamage, 1, 1, confusionDamageRoll);

            const previousHp = attacker.currentHp;
            const currentHp = Math.max(0, previousHp - finalDamage);
            attacker.currentHp = currentHp;

            events.push({
              type: BATTLE_EVENTS.CONFUSION_DAMAGE,
              actor: attackerRole,
              target: attackerRole,
              pokemonName: attacker.name,
              damage: finalDamage,
              previousHp,
              currentHp,
              maxHp: attacker.maxHp,
              baseDamage,
              damageRoll: confusionDamageRoll,
              confusionHitRoll
            });

            if (currentHp === 0) {
              resolveFaints(state, events, [attackerRole], 'confusion');
            }
            return;
          }
        }
      }

      // Descongelamento efetivo de golpe defrost (Scald: P4 / onModifyMove)
      // Sem outro impedimento prévio, Scald descongela o usuário ao atingir a etapa de execução.
      if (!calledMove && attacker.statusCondition === 'freeze') {
        const isSelfThaw = Boolean(constants?.isSelfThawingMove && constants.isSelfThawingMove(selectedMove));
        if (isSelfThaw) {
          attacker.statusCondition = null;
          events.push({
            type: BATTLE_EVENTS.STATUS_CURED,
            actor: attackerRole,
            target: attackerRole,
            pokemonName: attacker.name,
            statusCondition: 'freeze',
            reason: 'THAWED',
            moveName: selectedMove.name
          });
        }
      }

      // Evento de seleção do golpe
      events.push({
        type: BATTLE_EVENTS.MOVE_SELECTED,
        actor: attackerRole,
        pokemonId: attacker.id,
        pokemonName: attacker.name,
        moveId: selectedMove.id,
        moveName: selectedMove.name
      });

      const immobilized = !calledMove && attacker.statusCondition === 'paralysis' && statusRoll <= 25;
      if(selectedMove.id===264&&attacker.focusLost&&!immobilized){attacker.lastMoveFailed=true;attacker.stallCount=0;events.push({type:BATTLE_EVENTS.MOVE_FAILED,actor:attackerRole,pokemonName:attacker.name,moveId:264,moveName:selectedMove.name,reason:'FOCUS_LOST'});return;}

      const entryRestricted = selectedMove.id === 252 && selectedMove.name === 'fake-out' && attacker.entryMoveAttempts > 1;
      const baseCharge = !calledMove && !continuingTwoTurn && constants.isTwoTurnMove(selectedMove);
      const skipCharge=baseCharge&&constants.P7.instantCharge(state,attacker,selectedMove);
      const isTwoTurnCharging=baseCharge&&!skipCharge;
      if (!immobilized && !entryRestricted && !isTwoTurnCharging) {
        // Mantém a ordem histórica MOVE_USED → PP_CHANGED nos golpes executados.
        events.push({
          type: BATTLE_EVENTS.MOVE_USED,
          actor: attackerRole,
          pokemonId: attacker.id,
          pokemonName: attacker.name,
          moveId: selectedMove.id,
          moveName: selectedMove.name,
          moveType: actualDamageType,
          damageClass: actualDamageClass,
          power: selectedMove.power
        });
      }

      // Consumo de PP (ocorre antes da resolução de dano, em hits e em misses)
      if(!calledMove && !continuingBide && !continuingTwoTurn && !continuingLocked && !isStruggle){
      const previousPp = ppMove.currentPp;
      const extraPp=immobilized?0:constants.P7.pressureCost(state,attackerRole,selectedMove);
      ppMove.currentPp = Math.max(0, ppMove.currentPp - 1 - extraPp);

      events.push({
        type: BATTLE_EVENTS.PP_CHANGED,
        actor: attackerRole,
        moveId: ppMove.id,
        moveName: ppMove.name,
        previousPp,
        pressureCost: extraPp,
        currentPp: ppMove.currentPp,
        maxPp: ppMove.maxPp
      });
      if(extraPp)events.push({type:BATTLE_EVENTS.MOVE_PREPARED,actor:attackerRole,pokemonName:attacker.name,reason:'PRESSURE_PP',label:String(extraPp)});

      }

      if(calledMove&&pressureCallerId){
        const caller=attacker.moves.find(m=>m.id===pressureCallerId),extra=constants.P7.pressureCost(state,attackerRole,selectedMove);
        if(caller&&extra){const previousPp=caller.currentPp;caller.currentPp=Math.max(0,previousPp-extra);events.push({type:BATTLE_EVENTS.PP_CHANGED,actor:attackerRole,moveId:caller.id,moveName:caller.name,previousPp,currentPp:caller.currentPp,maxPp:caller.maxPp,pressureCost:extra});events.push({type:BATTLE_EVENTS.MOVE_PREPARED,actor:attackerRole,pokemonName:attacker.name,reason:'PRESSURE_PP',label:String(extra)});}
      }
      if (immobilized) {
        attacker.stallCount = 0;
        if (attacker.twoTurnMove) attacker.twoTurnMove = null;
        events.push({ type: BATTLE_EVENTS.STATUS_IMMOBILIZED, actor: attackerRole,
          pokemonName: attacker.name, statusCondition: 'paralysis', statusRoll });
        return;
      }

      if (entryRestricted) {
        events.push({ type: BATTLE_EVENTS.MOVE_FAILED, actor: attackerRole, target: defenderRole, pokemonName: attacker.name, moveId: selectedMove.id, moveName: selectedMove.name, reason: 'FIRST_ACTION_AFTER_ENTRY' });
        return;
      }

      if(baseCharge&&selectedMove.id===130)constants.P6.stage(constants,events,attackerRole,attacker,'defense',1);
      if(skipCharge&&!(selectedMove.id===76&&constants.P7.fieldWeather(state)==='sun'))constants.P7.consume(constants,events,attackerRole,attacker,'power-herb');
      if (isTwoTurnCharging) {
        attacker.stallCount = 0;
        const twoTurnDef = constants.getTwoTurnMove(selectedMove);
        attacker.twoTurnMove = {
          id: selectedMove.id,
          name: selectedMove.name,
          state: twoTurnDef?.semiInvulnerable || null
        };
        events.push({
          type: BATTLE_EVENTS.MOVE_PREPARED,
          actor: attackerRole,
          pokemonName: attacker.name,
          moveId: selectedMove.id,
          moveName: selectedMove.name,
          reason: twoTurnDef?.prepReason || 'CHARGE',
          semiInvulnerable: twoTurnDef?.semiInvulnerable || null
        });
        return;
      }

      if (continuingTwoTurn) {
        attacker.twoTurnMove = null;
        attacker.stallCount = 0;
      }

      if (isProtecting) {
        if (!protectSuccess) {
          attacker.stallCount = 0;
          attacker.isProtected = false;
          attacker.lastMoveFailed = true;
          events.push({
            type: BATTLE_EVENTS.MOVE_FAILED,
            actor: attackerRole,
            target: defenderRole,
            pokemonName: attacker.name,
            moveId: selectedMove.id,
            moveName: selectedMove.name,
            reason: 'PROTECT_FAILED',
            protectRoll
          });
          return;
        }

        attacker.isProtected = true;attacker.maxGuard=Boolean(selectedMove.p8MaxGuard);
        attacker.stallCount = Math.min(6, currentStallCount + 1);
        events.push({
          type: BATTLE_EVENTS.MOVE_PREPARED,
          actor: attackerRole,
          pokemonName: attacker.name,
          moveId: selectedMove.id,
          moveName: selectedMove.name,
          reason: 'PROTECTED_SELF'
        });
        return;
      }

      if (selectedMove.id !== 214) {
        attacker.stallCount = 0;
      }

      if(selectedMove.id===117){
        if(!attacker.bideState){attacker.bideState={turnsLeft:2,damage:0};events.push({type:BATTLE_EVENTS.MOVE_PREPARED,actor:attackerRole,pokemonName:attacker.name,moveName:selectedMove.name,reason:'BIDE_STORE'});return;}
        if(attacker.bideState.turnsLeft>1){attacker.bideState.turnsLeft--;events.push({type:BATTLE_EVENTS.MOVE_PREPARED,actor:attackerRole,pokemonName:attacker.name,moveName:selectedMove.name,reason:'BIDE_STORE'});return;}
        action={...action,bideDamage:attacker.bideState.damage*2};attacker.bideState=null;
        if(!action.bideDamage){events.push({type:BATTLE_EVENTS.MOVE_FAILED,actor:attackerRole,pokemonName:attacker.name,moveName:selectedMove.name,reason:'NO_BIDE_DAMAGE'});return;}
      }

      if(state.doublesNoTarget){events.push({type:BATTLE_EVENTS.MOVE_FAILED,actor:attackerRole,moveId:selectedMove.id,moveName:selectedMove.name,reason:'NO_TARGET'});return;}
      const isSelfTarget = selectedMove.target === 'self' || selectedMove.damageClass === 'status_self' || [14, 156, 214, 347, 182, 197].includes(selectedMove.id);
      const bypassesProtect = Boolean([144,166].includes(selectedMove.id)||selectedMove.p8Max||selectedMove.p8Z)||constants.isProtectBypassingMove?.(selectedMove)||(constants.P7.ability(attacker)==='unseen-fist'&&constants.P5.contactIds.includes(selectedMove.id));
      if ((defender.maxGuard&&!isSelfTarget&&selectedMove.target!=='foeSide') || (defender.isProtected && !isSelfTarget && selectedMove.target!=='foeSide' && !bypassesProtect)) {
        attacker.lastMoveFailed = true;
        events.push({
          type: BATTLE_EVENTS.MOVE_FAILED,
          actor: attackerRole,
          target: defenderRole,
          pokemonName: defender.name,
          attackerName: attacker.name,
          defenderName: defender.name,
          moveId: selectedMove.id,
          moveName: selectedMove.name,
          reason: 'BLOCKED_BY_PROTECT'
        });
        return;
      }
      if (defender.twoTurnMove?.state && !isSelfTarget && selectedMove.target!=='foeSide') {
        const canHit = constants.canHitSemiInvulnerable?.(selectedMove, defender.twoTurnMove.state, attacker);
        if (!canHit) {
          attacker.lastMoveFailed = true;
          events.push({
            type: BATTLE_EVENTS.MOVE_MISSED,
            actor: attackerRole,
            target: defenderRole,
            pokemonName: attacker.name,
            defenderName: defender.name,
            moveId: selectedMove.id,
            moveName: selectedMove.name,
            reason: 'SEMI_INVULNERABLE'
          });
          return;
        }
      }
      if([280,706,873].includes(selectedMove.id)){delete state.p6Sides[defenderRole].reflect;delete state.p6Sides[defenderRole].lightScreen;delete state.p6Sides[defenderRole].auroraVeil;}
      const targetAction=state.turnActions?.[defenderRole];
      const targetMove=plannedMove(defender,targetAction);
      const p5Context={turn:state.turn,executing:true,targetAction,targetMove,faintCount:state.version===2?state[attackerRole].team.filter(m=>m.currentHp<=0).length:0};
      const specialFailure=constants.P8.failure(attacker,defender,selectedMove,constants);if(specialFailure){events.push({type:BATTLE_EVENTS.MOVE_FAILED,actor:attackerRole,target:defenderRole,pokemonName:attacker.name,moveName:selectedMove.name,reason:specialFailure});return;}
      const p5Failure=constants.P5.get(selectedMove)?constants.P5.failure(selectedMove,attacker,defender,p5Context):null;
      if(p5Failure){events.push({type:BATTLE_EVENTS.MOVE_FAILED,actor:attackerRole,target:defenderRole,pokemonName:attacker.name,moveName:selectedMove.name,reason:p5Failure});return;}
      const fail = reason => events.push({type:BATTLE_EVENTS.MOVE_FAILED,actor:attackerRole,target:defenderRole,pokemonName:attacker.name,moveId:selectedMove.id,moveName:selectedMove.name,reason});

      if (!calledMove && attacker.tauntTurns > 0 && selectedMove.damageClass === MOVE_DAMAGE_CLASSES.STATUS) {
        attacker.lastMoveFailed = true;
        fail('TAUNTED');
        return;
      }

      // H5-A.3: Magic Bounce Reflection
      const isReflectable = constants.MoveFlags?.isReflectableMove?.(selectedMove.id) ?? false;
      const isHazardMove = [191, 390, 446, 564].includes(selectedMove.id);
      const defenderHasMagicBounce = Boolean(constants.P7?.ability(defender) === 'magic-bounce' && !defender.abilitySuppressed);
      const isMoldBreakerIgnored = defenderHasMagicBounce && constants.P7?.ignored(attacker, defender, 'magic-bounce');
      const canMagicBounce = isReflectable && !isSelfTarget && selectedMove.target !== 'self' && defenderHasMagicBounce && !isMoldBreakerIgnored && !action.bounced;

      if (canMagicBounce) {
        events.push({
          type: BATTLE_EVENTS.MOVE_PREPARED,
          actor: defenderRole,
          pokemonName: defender.name,
          reason: 'P7_ABILITY',
          label: 'magic-bounce'
        });

        if (isHazardMove) {
          const hazardMap = { 191: 'spikes', 390: 'toxicSpikes', 446: 'stealthRock', 564: 'stickyWeb' };
          const key = hazardMap[selectedMove.id];
          const max = selectedMove.id === 191 ? 3 : selectedMove.id === 390 ? 2 : 1;
          constants.P6.init(state);
          const oppSide = state.p6Sides[attackerRole];
          if ((oppSide[key] || 0) >= max) {
            fail('HAZARD_LIMIT');
          } else {
            oppSide[key] = (oppSide[key] || 0) + 1;
            events.push({
              type: BATTLE_EVENTS.MOVE_PREPARED,
              actor: attackerRole,
              pokemonName: attacker.name,
              reason: 'HAZARD_STARTED',
              hazard: key,
              layers: oppSide[key]
            });
          }
          return;
        }

        executeAction(defenderRole, attackerRole, state, events, { ...action, bounced: true }, true);
        return;
      }

      // H5-A.1: Prankster vs Dark-type Immunity and Psychic Terrain
      const isPranksterBoosted = (constants.P7?.ability(attacker) === 'prankster' && !attacker.abilitySuppressed && selectedMove.damageClass === 'status' && !action.bounced);
      const defenderIsDark = (defender.types || []).includes('dark') || (constants.P8?.hasType?.(defender, 'dark') ?? false);
      const isTargetBlockedByPsychicTerrain = isPranksterBoosted && !isSelfTarget && selectedMove.target !== 'foeSide' && !state.doublesAllyTarget && (state.terrain?.id === 'psychic' || state.terrain?.id === 'psychic-terrain') && (constants.P7?.grounded ? constants.P7.grounded(defender) : true);

      if (isTargetBlockedByPsychicTerrain) {
        attacker.lastMoveFailed = true;
        events.push({
          type: BATTLE_EVENTS.MOVE_FAILED,
          actor: attackerRole,
          target: defenderRole,
          pokemonName: attacker.name,
          defenderName: defender.name,
          moveId: selectedMove.id,
          moveName: selectedMove.name,
          reason: 'PSYCHIC_TERRAIN_PROTECTED'
        });
        return;
      }

      if (isPranksterBoosted && !isSelfTarget && selectedMove.target !== 'foeSide' && !state.doublesAllyTarget && defenderIsDark) {
        attacker.lastMoveFailed = true;
        events.push({
          type: BATTLE_EVENTS.MOVE_FAILED,
          actor: attackerRole,
          target: defenderRole,
          pokemonName: attacker.name,
          defenderName: defender.name,
          moveId: selectedMove.id,
          moveName: selectedMove.name,
          reason: 'IMMUNE_PRANKSTER'
        });
        return;
      }

      // H5-A.2: Infiltrator & Substitute on Status Moves
      const hasSubstitute = Boolean(defender.substituteHp > 0 || defender.substitute);
      const bypassesSub = attackerInfiltrates || (constants.MoveFlags?.isSoundMove?.(selectedMove) ?? false);

      if (hasSubstitute && !bypassesSub && selectedMove.damageClass === MOVE_DAMAGE_CLASSES.STATUS && !isSelfTarget && selectedMove.target !== 'foeSide' && !state.doublesAllyTarget) {
        attacker.lastMoveFailed = true;
        events.push({
          type: BATTLE_EVENTS.MOVE_FAILED,
          actor: attackerRole,
          target: defenderRole,
          pokemonName: attacker.name,
          defenderName: defender.name,
          moveId: selectedMove.id,
          moveName: selectedMove.name,
          reason: 'BLOCKED_BY_SUBSTITUTE'
        });
        return;
      }
      if (selectedMove.id === 164) {
        const subCost = Math.floor(constants.P8.baseMaxHp(attacker) / 4);
        if (attacker.substitute || (attacker.substituteHp > 0)) {
          fail('ALREADY_SUBSTITUTE');
          return;
        }
        if (attacker.currentHp <= subCost) {
          fail('TOO_WEAK');
          return;
        }
        const previousHp = attacker.currentHp;
        attacker.currentHp = previousHp - subCost;
        attacker.substituteHp = subCost;
        attacker.substitute = true;
        events.push({
          type: BATTLE_EVENTS.MOVE_PREPARED,
          actor: attackerRole,
          pokemonName: attacker.name,
          reason: 'SUBSTITUTE_CREATED',
          substituteHp: subCost,
          cost: subCost,
          previousHp,
          currentHp: attacker.currentHp,
          maxHp: attacker.maxHp
        });
        return;
      }
      if (selectedMove.id === 269) {
        if (defender.tauntTurns > 0) {
          fail('ALREADY_TAUNTED');
          return;
        }
        defender.tauntTurns = 3;
        events.push({
          type: BATTLE_EVENTS.MOVE_PREPARED,
          actor: attackerRole,
          target: defenderRole,
          pokemonName: defender.name,
          reason: 'TAUNT_APPLIED',
          duration: 3
        });
        return;
      }
      if (selectedMove.id === 668) {
        const targetAtk = Math.max(1, defender.stats?.attack || defender.attack || 50);
        const stageMod = constants.getStatStageMultiplier ? constants.getStatStageMultiplier(defender.statStages?.attack || 0) : 1;
        const effectiveAtk = Math.floor(targetAtk * stageMod);
        const report = constants.applyStatStageChange(defender, 'attack', -1);
        events.push({
          type: BATTLE_EVENTS.STAT_STAGE_CHANGED,
          combatant: defenderRole,
          pokemonName: defender.name,
          statKey: 'attack',
          ...report
        });
        const previousHp = attacker.currentHp;
        attacker.currentHp = Math.min(attacker.maxHp, attacker.currentHp + effectiveAtk);
        const healedAmount = attacker.currentHp - previousHp;
        events.push({
          type: BATTLE_EVENTS.HP_HEALED,
          target: attackerRole,
          pokemonName: attacker.name,
          previousHp,
          currentHp: attacker.currentHp,
          maxHp: attacker.maxHp,
          healedAmount
        });
        return;
      }
      if(selectedMove.id===156){
        if(attacker.currentHp===attacker.maxHp||attacker.statusCondition==='sleep'||constants.P7.statusImmune(attacker,'sleep')){fail('REST_NOT_NEEDED');return;}
        const previousHp=attacker.currentHp,oldStatus=attacker.statusCondition;
        attacker.currentHp=attacker.maxHp;attacker.statusCondition='sleep';attacker.sleepTurns=2;attacker.sleepCounter=2;attacker.toxicStage=0;
        if(oldStatus)events.push({type:BATTLE_EVENTS.STATUS_CURED,target:attackerRole,pokemonName:attacker.name,statusCondition:oldStatus,reason:'REST'});
        events.push({type:BATTLE_EVENTS.STATUS_APPLIED,target:attackerRole,pokemonName:attacker.name,statusCondition:'sleep',sleepDuration:2});
        events.push({type:BATTLE_EVENTS.HP_HEALED,target:attackerRole,pokemonName:attacker.name,previousHp,currentHp:attacker.currentHp,maxHp:attacker.maxHp,healedAmount:attacker.currentHp-previousHp});return;
      }
      if([173,214].includes(selectedMove.id)&&attacker.statusCondition!=='sleep'){attacker.stallCount=0;fail('REQUIRES_SLEEP');return;}
      if(selectedMove.id===214){
        const candidates=attacker.moves.filter(m=>m.id!==214&&![117,166,264,690,704].includes(m.id)&&!constants.isTwoTurnMove(m)&&constants.getMoveCapability(m)?.supportLevel==='FULL');
        if(!candidates.length){attacker.stallCount=0;fail('NO_CALLABLE_MOVE');return;}
        const index=action.sleepTalkChoice??0;
        if(!Number.isInteger(index)||index<0||index>=candidates.length)throw new Error('Escolha Sleep Talk inválida.');
        executeAction(attackerRole,defenderRole,state,events,{...action,moveId:candidates[index].id,moveName:undefined},true,calledMove?null:214);return;
      }
      if(selectedMove.id===138&&defender.statusCondition!=='sleep'){fail('TARGET_NOT_ASLEEP');return;}
      if(selectedMove.id===281 && (defender.safeguarded||constants.P7.statusImmune(defender,'sleep'))){fail('SAFEGUARD');return;}
      if(selectedMove.id===281){
        if(defender.statusCondition||defender.drowsyTurns>0){fail('ALREADY_STATUS');return;}
        const duration=action.sleepDuration??2;if(!Number.isInteger(duration)||duration<1||duration>3)throw new Error('Duração de Yawn inválida.');
        defender.drowsyTurns=2;defender.drowsySleepDuration=duration;events.push({type:BATTLE_EVENTS.DROWSY_APPLIED,target:defenderRole,pokemonName:defender.name});return;
      }

      if(constants.P7.tryHit(state,attackerRole,damageMove,constants,events))return;
      // 2. Resolução de Acurácia (Hit vs Miss)
      let isHit = true;
      const effectiveAccuracy = constants.getEffectiveAccuracy ? constants.getEffectiveAccuracy(selectedMove,attacker,defender) : selectedMove.accuracy;
      if (effectiveAccuracy !== null && selectedMove.accuracy !== 'ALWAYS_HIT') {
        isHit = accuracyRoll <= effectiveAccuracy;
      }

      if(action?.pursuitIntercept&&selectedMove.id===228)isHit=true;
      if(defender.minimized&&constants.P6.minimizeHits.includes(selectedMove.id))isHit=true;
      // Gen VI+: Toxic used by a Poison-type bypasses accuracy checks, not status immunity.
      if (selectedMove.id === 92 && selectedMove.name === 'toxic' && attacker.types.includes('poison')) isHit = true;

      if (!isHit) {
        // Notifica erro do golpe
        events.push({
          type: BATTLE_EVENTS.MOVE_MISSED,
          actor: attackerRole,
          target: defenderRole,
          moveId: selectedMove.id,
          moveName: selectedMove.name,
          accuracyRoll,
          accuracy: selectedMove.accuracy
        });
        // Em miss, o defensor não sofre dano, DAMAGE_APPLIED não é emitido e seu HP permanece inalterado
        return;
      }

      if(state.doublesAllyTarget&&selectedMove.id===676){constants.P6.heal(events,defenderRole,defender,Math.floor(constants.P8.baseMaxHp(defender)/2));return;}
      if(constants.P8.action(state,attackerRole,selectedMove,constants,events))return;
      if(constants.P7.statusAction(state,attackerRole,selectedMove,constants,events))return;
      if(constants.P6.statusAction(state,attackerRole,selectedMove,action||{},constants,events))return;
      if(selectedMove.id===599&&state.p6Sides[defenderRole].mist&&!attackerInfiltrates){events.push({type:BATTLE_EVENTS.MOVE_FAILED,actor:attackerRole,moveId:599,moveName:selectedMove.name,reason:'MIST'});return;}
      if(selectedMove.id===599){
        if(!['poison','toxic'].includes(defender.statusCondition)){fail('VENOM_DRENCH');return;}
        if(['attack','specialAttack','speed'].every(k=>defender.statStages[k]<=-6)){fail('STAT_LIMIT');return;}
        for(const statKey of ['attack','specialAttack','speed']){const report=constants.applyStatStageChange(defender,statKey,-1);events.push({type:BATTLE_EVENTS.STAT_STAGE_CHANGED,combatant:defenderRole,pokemonName:defender.name,statKey,...report});}
        return;
      }
      if (selectedMove.damageClass === MOVE_DAMAGE_CLASSES.STATUS) {
        if (selectedMove.statusEffect === 'confusion') {
          const isImmune = defender.safeguarded || constants.P7.statusImmune(defender,'confusion') || (constants.isStatusMoveImmune ? constants.isStatusMoveImmune(selectedMove, defender.types) : false);
          const blocked = isImmune
            ? 'IMMUNE'
            : (defender.confusionTurns > 0)
              ? 'ALREADY_CONFUSED'
              : defender.currentHp <= 0
                ? 'FAINTED'
                : null;
          if (blocked) {
            events.push({
              type: BATTLE_EVENTS.CONFUSION_BLOCKED,
              source: attackerRole,
              target: defenderRole,
              pokemonName: defender.name,
              reason: blocked
            });
          } else {
            let duration = constants.DEFAULT_CONFUSION_TURNS?.DEFAULT || 3;
            if (action && action.confusionDuration !== undefined) {
              const parsed = Number(action.confusionDuration);
              if (!Number.isInteger(parsed) || parsed < 2 || parsed > 5) {
                throw new Error(`Duração de confusão inválida: ${action.confusionDuration}. Deve ser um inteiro entre 2 e 5.`);
              }
              duration = parsed;
            }
            defender.confusionTurns = duration;
            events.push({
              type: BATTLE_EVENTS.CONFUSION_APPLIED,
              source: attackerRole,
              target: defenderRole,
              pokemonName: defender.name,
              duration: defender.confusionTurns
            });
          }
          return;
        }

        if (selectedMove.statusEffect) {
          const isImmune = defender.safeguarded || constants.P7.statusImmune(defender,selectedMove.statusEffect) || constants.isStatusMoveImmune(damageMove, defender.types);
          const blocked = isImmune
            ? 'IMMUNE'
            : defender.statusCondition
              ? 'ALREADY_STATUS'
              : defender.currentHp <= 0
                ? 'FAINTED'
                : null;
          if (blocked) {
            events.push({
              type: BATTLE_EVENTS.STATUS_BLOCKED,
              target: defenderRole,
              pokemonName: defender.name,
              statusCondition: selectedMove.statusEffect,
              reason: blocked
            });
          } else {
            defender.statusCondition = selectedMove.statusEffect;
            defender.toxicStage = 0;
            if (selectedMove.statusEffect === 'sleep') {
              let sleepDuration = constants.DEFAULT_SLEEP_TURNS || 2;
              if (action && action.sleepDuration !== undefined) {
                const parsed = Number(action.sleepDuration);
                if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 3) {
                  sleepDuration = parsed;
                }
              }
              defender.sleepTurns = sleepDuration;
              defender.sleepCounter = sleepDuration;
            }
            events.push({
              type: BATTLE_EVENTS.STATUS_APPLIED,
              source: attackerRole,
              target: defenderRole,
              pokemonName: defender.name,
              statusCondition: selectedMove.statusEffect,
              ...(selectedMove.statusEffect === 'sleep' ? { sleepDuration: defender.sleepTurns } : {})
            });
            constants.P7.checkSynchronize?.(state, attackerRole, defenderRole, selectedMove.statusEffect, constants, events, attacker, defender);
          }
          return;
        }

        const statBoosts = selectedMove.statBoosts || (constants.getStatBoosts && constants.getStatBoosts(selectedMove));
        if (statBoosts && typeof statBoosts === 'object') {
          for (const [statKey, delta] of Object.entries(statBoosts)) {
            const report = constants.applyStatStageChange(attacker, statKey, delta);
            events.push({
              type: BATTLE_EVENTS.STAT_STAGE_CHANGED,
              combatant: attackerRole,
              pokemonName: attacker.name,
              statKey: report.statKey,
              previousStage: report.previousStage,
              requestedDelta: report.requestedDelta,
              appliedDelta: report.appliedDelta,
              finalStage: report.finalStage,
              blockedReason: report.blockedReason
            });
          }
          return;
        }
      }

      // 3. Resolução de STAB (Same-Type Attack Bonus)
      const isLevelDamage = Boolean(constants.isLevelDamageMove?.(selectedMove));
      const isConstantDamage = Boolean(constants.isConstantDamageMove?.(selectedMove));
      const isFractionalDamage = Boolean(constants.isFractionalDamageMove?.(selectedMove));
      const isP5Fixed = Boolean(constants.P5.get(selectedMove) && constants.P5.fixed(selectedMove));
      const isFixedDamage = isLevelDamage || isConstantDamage || isFractionalDamage || isP5Fixed;
      const hasStab = attacker.types.includes(actualDamageType);
      const stabMultiplier = !isFixedDamage&&!isStruggle?constants.P8.stab(attacker,actualDamageType,constants):1;

      events.push({
        type: BATTLE_EVENTS.STAB_RESOLVED,
        actor: attackerRole,
        moveType: actualDamageType,
        attackerTypes: attacker.types,
        multiplier: stabMultiplier,
        hasStab: isFixedDamage || isStruggle ? false : hasStab
      });

      // 4. Resolução de Type Effectiveness
      let effectiveMultiplier;
      let effectivenessClassification;
      let defenderTypesList = defender.types;

      if (constants.isDualTypeEffectiveness?.(selectedMove)) {
        const primaryEff = constants.P8.effectiveness('fighting',defender,TypeEffectiveness,attacker,null,constants);
        const secondaryEff = constants.P8.effectiveness('flying',defender,TypeEffectiveness,attacker,null,constants);
        const combinedMultiplier = constants.P8.adjustEffectiveness(primaryEff.multiplier * secondaryEff.multiplier,attacker,defender,damageMove,constants);
        effectiveMultiplier = BattleModifierResolver && BattleModifierResolver.resolveTypeMultiplier
          ? BattleModifierResolver.resolveTypeMultiplier(combinedMultiplier, { attackerSide: attackerRole, modifiers: state.modifiers || {} })
          : combinedMultiplier;
        effectivenessClassification = TypeEffectiveness.getClassification(effectiveMultiplier);

        events.push({
          type: BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED,
          source: attackerRole,
          target: defenderRole,
          attackType: actualDamageType,
          secondaryAttackType: 'flying',
          defenderTypes: defender.types,
          multiplier: effectiveMultiplier,
          classification: effectivenessClassification
        });
      } else {
        const effectiveness = constants.P8.effectiveness(actualDamageType,defender,TypeEffectiveness,attacker,damageMove,constants);
        const rawMultiplier = BattleModifierResolver && BattleModifierResolver.resolveTypeMultiplier
          ? BattleModifierResolver.resolveTypeMultiplier(isStruggle?1:effectiveness.multiplier, { attackerSide: attackerRole, modifiers: state.modifiers || {} })
          : (isStruggle?1:effectiveness.multiplier);
        defenderTypesList = effectiveness.defenderTypes;

        if (isFixedDamage) {
          if (rawMultiplier === 0 && selectedMove.id!==117) {
            effectiveMultiplier = 0;
            effectivenessClassification = constants.TYPE_EFFECTIVENESS_CLASSIFICATION?.IMMUNE || 'IMMUNE';
          } else {
            effectiveMultiplier = 1;
            effectivenessClassification = constants.TYPE_EFFECTIVENESS_CLASSIFICATION?.NEUTRAL || 'NEUTRAL';
          }
        } else {
          effectiveMultiplier = rawMultiplier;
          effectivenessClassification = TypeEffectiveness.getClassification(effectiveMultiplier);
        }

        events.push({
          type: BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED,
          source: attackerRole,
          target: defenderRole,
          attackType: effectiveness.attackType,
          defenderTypes: effectiveness.defenderTypes,
          multiplier: effectiveMultiplier,
          classification: effectivenessClassification
        });
      }

      if(selectedMove.id===712&&effectiveMultiplier>0)constants.Completion.steal(attacker,defender,constants,events,attackerRole,defenderRole);
      // 5. Seleção de atributos de ataque e defesa baseados na categoria de dano
      let attackStat;
      let defenseStat;
      if (actualDamageClass === MOVE_DAMAGE_CLASSES.PHYSICAL) {
        attackStat = constants.usesDefenseAsAttack?.(selectedMove)
          ? (constants.getEffectiveStat ? constants.getEffectiveStat(attacker, 'defense') : attacker.defense)
          : (constants.getEffectiveStat ? constants.getEffectiveStat(attacker, 'attack') : attacker.attack);
        defenseStat = constants.getEffectiveStat ? constants.getEffectiveStat(constants.Completion.defender(selectedMove,defender), 'defense') : defender.defense;
      } else {
        attackStat = constants.getEffectiveStat ? constants.getEffectiveStat(attacker, 'specialAttack') : attacker.specialAttack;
        defenseStat = constants.targetsDefenseWithSpAtk?.(selectedMove)
          ? (constants.getEffectiveStat ? constants.getEffectiveStat(defender, 'defense') : defender.defense)
          : (constants.getEffectiveStat ? constants.getEffectiveStat(constants.Completion.defender(selectedMove,defender), 'specialDefense') : defender.specialDefense);
      }

      let resolvedPower=constants.P5.get(selectedMove)?constants.P5.power(selectedMove,attacker,defender,constants,p5Context):selectedMove.power;
      resolvedPower=constants.P7.power(state,attacker,defender,damageMove,resolvedPower);
      resolvedPower=constants.P8.power(attacker,defender,damageMove,resolvedPower,constants);
      const semiInvulnerableMultiplier = (defender.twoTurnMove?.state && constants.getSemiInvulnerableDamageMultiplier)
        ? constants.getSemiInvulnerableDamageMultiplier(selectedMove, defender.twoTurnMove.state)
        : 1;
      const minimizeMultiplier=defender.minimized&&constants.P6.minimizeHits.includes(selectedMove.id)?2:1;
      const effectivePower = action?.pursuitIntercept&&selectedMove.id===228?resolvedPower*2:resolvedPower;
      if([722,723].includes(selectedMove.id) && constants.getEffectiveStat(attacker,'attack')>constants.getEffectiveStat(attacker,'specialAttack')){
        attackStat=constants.getEffectiveStat(attacker,'attack');defenseStat=constants.getEffectiveStat(defender,'defense');
      }
      // Validação do roll de dano determinístico (85..100)
      let damageRoll = 100; // Padrão de retrocompatibilidade para testes legados
      if (action && action.damageRoll !== undefined) {
        const dRoll = Number(action.damageRoll);
        if (!Number.isFinite(dRoll) || dRoll < 85 || dRoll > 100) {
          throw new Error(`Roll de dano inválido: ${action.damageRoll}. Deve ser um número entre 85 e 100.`);
        }
        damageRoll = dRoll;
      }

      // 6. Pipeline de cálculo de dano v2 (PBA-014B: com variância 85..100)
      let baseDamage;
      let finalDamage;
      let critical=false;
      if (isP5Fixed) {
        baseDamage = effectiveMultiplier===0?0:constants.P5.fixedAmount(selectedMove,attacker,defender,action);
        finalDamage = Math.min(defender.currentHp,baseDamage);
      } else if (isLevelDamage) {
        const attackerLevel = Number(attacker.level) || constants.BATTLE_CONFIG?.SIMULATION_LEVEL || 50;
        baseDamage = effectiveMultiplier === 0 ? 0 : attackerLevel;
        finalDamage = effectiveMultiplier === 0 ? 0 : Math.min(defender.currentHp, attackerLevel);
      } else if (isFractionalDamage) {
        baseDamage = effectiveMultiplier === 0 ? 0 : constants.getFractionalDamageAmount(defender.currentHp);
        finalDamage = baseDamage;
      } else if (isConstantDamage) {
        const constantAmount = constants.getConstantDamageAmount ? constants.getConstantDamageAmount(selectedMove) : (selectedMove.id === 49 ? 20 : 40);
        baseDamage = effectiveMultiplier === 0 ? 0 : constantAmount;
        finalDamage = effectiveMultiplier === 0 ? 0 : Math.min(defender.currentHp, constantAmount);
      } else {
        critical=constants.Critical.resolve(damageMove,action?.criticalRoll!==undefined?action.criticalRoll:action?.hitCriticalRolls?.[0]??24,constants);
        const criticalStats=constants.Critical.stats(attacker,defender,damageMove,constants);
        baseDamage = DamageCalculator.calculateBaseDamage(critical?criticalStats.attack:attackStat, critical?criticalStats.defense:defenseStat, effectivePower);
        // P5 pilots share accuracy/PP/action checks, but resolve damage and poison per hit.
        const multiHit = constants.getMultiHitMove(selectedMove);
        if (multiHit) {
          const plannedHits = constants.getMultiHitCount(selectedMove, action?.hitCountRoll ?? 1);
          function hitRolls(key, fallback, min, max) {
            const supplied = action?.[key];
            if (supplied !== undefined && (!Array.isArray(supplied) || supplied.length !== plannedHits)) throw new Error('Quantidade de rolagens por acerto inválida.');
            const rolls = supplied || Array(plannedHits).fill(fallback);
            if (rolls.some(n => !Number.isInteger(n) || n < min || n > max)) throw new Error('Rolagem por acerto inválida.');
            return rolls;
          }
          const damageRolls = hitRolls('hitDamageRolls', damageRoll, 85, 100);
          const criticalRolls=hitRolls('hitCriticalRolls',action?.criticalRoll??24,1,24);
          if(action?.criticalRoll!==undefined&&criticalRolls[0]!==action.criticalRoll)throw Error('O crítico do primeiro acerto deve coincidir com criticalRoll.');
        const accuracyRolls = multiHit.multiAccuracy ? hitRolls('hitAccuracyRolls',accuracyRoll,1,100) : null;
        if(accuracyRolls && accuracyRolls[0]!==accuracyRoll)throw new Error('A precisão do primeiro acerto deve coincidir com accuracyRoll.');
          const poisonRolls = selectedMove.id === 41 ? hitRolls('hitSecondaryEffectRolls', secondaryEffectRoll, 1, 100) : null;
          let hitCount = 0;
          let totalDamage = 0;
          for (let index = 0; index < plannedHits && defender.currentHp > 0 && effectiveMultiplier > 0; index++) {
            if(index>0 && accuracyRolls && accuracyRolls[index]>effectiveAccuracy)break;
          const hitEff=constants.P8.effectiveness(actualDamageType,defender,TypeEffectiveness,attacker,damageMove,constants);const hitMultiplier=BattleModifierResolver?.resolveTypeMultiplier?BattleModifierResolver.resolveTypeMultiplier(hitEff.multiplier,{attackerSide:attackerRole,modifiers:state.modifiers||{}}):hitEff.multiplier;
          const hitPower=(multiHit.escalating?selectedMove.power*(index+1):resolvedPower);
          const critical=constants.Critical.resolve(damageMove,criticalRolls[index],constants);
          const hitBaseDamage=DamageCalculator.calculateBaseDamage(critical?criticalStats.attack:attackStat,critical?criticalStats.defense:defenseStat,hitPower);
          let hitDamage = Math.max(hitMultiplier===0?0:1,Math.floor(constants.P6.barrierMultiplier(state,defenderRole,damageMove,critical,attacker)*constants.applyBurnPenalty(DamageCalculator.applyModifier(hitBaseDamage*(critical?1.5:1), hitMultiplier, stabMultiplier, damageRolls[index]), attacker, damageMove) * semiInvulnerableMultiplier * minimizeMultiplier));
            hitDamage=Math.max(hitMultiplier===0?0:1,Math.floor(hitDamage*constants.P7.damageMultiplier(state,attacker,defender,damageMove,hitMultiplier)));
            hitDamage=constants.P7.survive(state,attackerRole,damageMove,hitDamage,constants,events);
            const hasMultiSub = Boolean(defender.substituteHp > 0 || defender.substitute);
            const bypassesMultiSub = attackerInfiltrates || (constants.MoveFlags?.isSoundMove?.(damageMove) ?? false);
            let hitActualDamage = 0;
            const previousHp = defender.currentHp;
            if (hasMultiSub && !bypassesMultiSub) {
              defender.substituteHp = Math.max(0, (defender.substituteHp || 0) - hitDamage);
              if (defender.substituteHp === 0) {
                defender.substitute = false;
              }
              hitActualDamage = 0;
            } else {
              defender.currentHp = Math.max(0, previousHp - hitDamage);
              hitActualDamage = previousHp - defender.currentHp;
              totalDamage += hitActualDamage;
            }
            hitCount++;
          afterDirectHit(attacker,defender,attackerRole,defenderRole,damageMove,events,hitActualDamage);
            events.push({ type: BATTLE_EVENTS.DAMAGE_APPLIED, source: attackerRole, target: defenderRole,
              attackType: actualDamageType, damageClass: actualDamageClass, defenderTypes: defenderTypesList,
              moveName: selectedMove.name, power: hitPower, baseDamage:hitBaseDamage, critical, criticalMultiplier:critical?1.5:1, damageRoll: damageRolls[index],
              stabMultiplier, typeMultiplier: hitMultiplier, multiplier: hitMultiplier,
              damage: hitDamage, previousHp, currentHp: defender.currentHp, hitIndex: hitCount });
            constants.P7.afterHit(state,attackerRole,damageMove,action||{},constants,events,previousHp-defender.currentHp,attacker,defender);
            if (attacker.currentHp === 0) break;
            if (poisonRolls && poisonRolls[index] <= 20 && constants.isEligibleForStatusCondition(defender, 'poison')) {
              defender.statusCondition = 'poison';
              defender.toxicStage = 0;
              events.push({type: BATTLE_EVENTS.STATUS_APPLIED, source: attackerRole, target: defenderRole,
                pokemonName: defender.name, statusCondition: 'poison', moveId: selectedMove.id,
                moveName: selectedMove.name, secondaryEffectRoll: poisonRolls[index], chance: 20, hitIndex: hitCount});
              constants.P7.checkSynchronize?.(state, attackerRole, defenderRole, 'poison', constants, events, attacker, defender);
            }
          }
          if (hitCount) events.push({type: BATTLE_EVENTS.MULTI_HIT_COMPLETE, source: attackerRole, target: defenderRole,
            moveName: selectedMove.name, hitCount, plannedHits, totalDamage, critical:Boolean(multiHit.critical)});
          const faintedRolesMulti = [];
          if (defender.currentHp === 0) {constants.P7.directKO(state,attackerRole,defender,constants,events,attacker);faintedRolesMulti.push(defenderRole);}
          if (attacker.currentHp === 0) faintedRolesMulti.push(attackerRole);
          if (faintedRolesMulti.length > 0) resolveFaints(state, events, faintedRolesMulti, defender.currentHp === 0 ? 'move' : 'recoil');
          return;
        }
        finalDamage = constants.applyBurnPenalty(
          DamageCalculator.applyModifier(baseDamage*(critical?1.5:1), effectiveMultiplier, stabMultiplier, damageRoll),
          attacker, damageMove) * semiInvulnerableMultiplier * minimizeMultiplier;
      }

      if(!isFixedDamage&&state.battleFormat==='DOUBLES'&&state.doublesSpread)finalDamage=Math.max(effectiveMultiplier===0?0:1,Math.floor(finalDamage*.75));
      if(!isFixedDamage)finalDamage=Math.max(effectiveMultiplier===0?0:1,Math.floor(finalDamage*constants.P6.barrierMultiplier(state,defenderRole,damageMove,critical,attacker)));
      if(!isFixedDamage)finalDamage=Math.max(effectiveMultiplier===0?0:1,Math.floor(finalDamage*constants.P7.damageMultiplier(state,attacker,defender,damageMove,effectiveMultiplier)));
      if(!isFixedDamage)finalDamage=Math.max(effectiveMultiplier===0?0:1,Math.floor(finalDamage*constants.P8.finalMultiplier(attacker,defender,damageMove)));
      finalDamage=constants.P7.survive(state,attackerRole,damageMove,finalDamage,constants,events);
      // 7. Aplicação do dano ao HP
      const hasActiveSub = Boolean(defender.substituteHp > 0 || defender.substitute);
      const bypassesSubDamage = attackerInfiltrates || (constants.MoveFlags?.isSoundMove?.(damageMove) ?? false);
      let previousHp = defender.currentHp;
      let currentHp = defender.currentHp;
      let actualDamageDealt = 0;

      if (hasActiveSub && !bypassesSubDamage) {
        defender.substituteHp = Math.max(0, (defender.substituteHp || 0) - finalDamage);
        if (defender.substituteHp === 0) {
          defender.substitute = false;
        }
        actualDamageDealt = 0;
      } else {
        previousHp = defender.currentHp;
        currentHp = Math.max(0, previousHp - finalDamage);
        defender.currentHp = currentHp;
        actualDamageDealt = previousHp - currentHp;
      }
      afterDirectHit(attacker,defender,attackerRole,defenderRole,damageMove,events,actualDamageDealt);

      // 8. Emite evento de dano aplicado com dados completos
      events.push({
        type: BATTLE_EVENTS.DAMAGE_APPLIED,
        source: attackerRole,
        target: defenderRole,
        attackType: actualDamageType,
        damageClass: actualDamageClass,
        defenderTypes: defenderTypesList,
        moveName: selectedMove.name,
        power: isFixedDamage ? (selectedMove.power ?? null) : effectivePower,
        baseDamage,
        critical:critical&&effectiveMultiplier>0,
        criticalMultiplier:critical&&effectiveMultiplier>0?1.5:1,
        damageRoll: isFixedDamage ? 100 : damageRoll,
        stabMultiplier: isFixedDamage ? 1 : stabMultiplier,
        typeMultiplier: effectiveMultiplier,
        multiplier: effectiveMultiplier,
        damage: finalDamage,
        previousHp,
        currentHp
      });

      constants.P7.afterHit(state,attackerRole,damageMove,action||{},constants,events,actualDamageDealt,attacker,defender);
      constants.P8.afterHit(state,attackerRole,damageMove,constants,events,actualDamageDealt);
      // 8B. Descongelamento do alvo por golpe de dano Fire (onDamagingHit: P4)
      // Conforme Pokémon Showdown data/conditions.ts (frz.onDamagingHit): golpes de dano Fire
      // descongelam o alvo sobrevivente imediatamente ao aplicar o dano.
      const isDamagingFire = constants.isDamagingFireMove
        ? constants.isDamagingFireMove(selectedMove)
        : (String(selectedMove.type?.name || selectedMove.type || '').toLowerCase() === 'fire' &&
           String(selectedMove.damageClass || selectedMove.damage_class?.name || selectedMove.damage_class || '').toLowerCase() !== 'status');
      if (currentHp > 0 && defender.statusCondition === 'freeze' && effectiveMultiplier > 0 && isDamagingFire) {
        defender.statusCondition = null;
        events.push({
          type: BATTLE_EVENTS.STATUS_CURED,
          actor: attackerRole,
          target: defenderRole,
          pokemonName: defender.name,
          statusCondition: 'freeze',
          reason: 'THAWED',
          moveName: selectedMove.name
        });
      }

      // 9. Efeitos de Drenagem de HP (Drain Moves: cura proporcional ao HP efetivamente removido)
      if (actualDamageDealt > 0 && constants.getDrainRatio?.(selectedMove) > 0) {
        const drainRatio = constants.getDrainRatio(selectedMove);
        const rawHeal = Math.max(1, Math.floor(actualDamageDealt * drainRatio));
        const previousAttackerHp = attacker.currentHp;
        const newAttackerHp = Math.min(attacker.maxHp, previousAttackerHp + rawHeal);
        const actualHealed = newAttackerHp - previousAttackerHp;
        attacker.currentHp = newAttackerHp;
        if (actualHealed > 0) {
          events.push({
            type: BATTLE_EVENTS.DRAIN_APPLIED,
            target: attackerRole,
            pokemonName: attacker.name,
            moveName: selectedMove.name,
            healedAmount: actualHealed,
            previousHp: previousAttackerHp,
            currentHp: newAttackerHp,
            maxHp: attacker.maxHp
          });
        }
      }

      // 10. Efeitos de Recuo de HP (Recoil Moves: recuo proporcional ao dano efetivamente causado)
      let attackerFaintedFromRecoil = false;
      if (actualDamageDealt > 0 && (isStruggle || constants.getRecoilRatio?.(selectedMove) > 0)) {
        const recoilRatio = constants.getRecoilRatio(selectedMove);
        const rawRecoil = isStruggle?Math.max(1,Math.round(attacker.maxHp/4)):Math.max(1, Math.floor(actualDamageDealt * recoilRatio));
        const previousAttackerHp = attacker.currentHp;
        const newAttackerHp = Math.max(0, previousAttackerHp - rawRecoil);
        const actualRecoil = previousAttackerHp - newAttackerHp;
        attacker.currentHp = newAttackerHp;
        events.push({
          type: BATTLE_EVENTS.RECOIL_APPLIED,
          target: attackerRole,
          pokemonName: attacker.name,
          moveName: selectedMove.name,
          damage: actualRecoil,
          previousHp: previousAttackerHp,
          currentHp: newAttackerHp,
          maxHp: attacker.maxHp
        });
        if (newAttackerHp === 0) {
          attackerFaintedFromRecoil = true;
        }
      }

      // 10B. Auto-penalidades de Atributo (Self Stat Drops: Close Combat, Overheat, Draco Meteor)
      const selfDrops = constants.P5.drops[selectedMove.id] || selectedMove.selfStatDrops || (constants.getSelfStatDrops && constants.getSelfStatDrops(selectedMove));
      if (effectiveMultiplier > 0 && attacker.currentHp > 0 && selfDrops && typeof selfDrops === 'object') {
        for (const [statKey, delta] of Object.entries(selfDrops)) {
          const report = constants.applyStatStageChange(attacker, statKey, delta);
          events.push({
            type: BATTLE_EVENTS.STAT_STAGE_CHANGED,
            combatant: attackerRole,
            pokemonName: attacker.name,
            statKey: report.statKey,
            previousStage: report.previousStage,
            requestedDelta: report.requestedDelta,
            appliedDelta: report.appliedDelta,
            finalStage: report.finalStage,
            blockedReason: report.blockedReason
          });
        }
      }

      // 10C. Resolução de Efeitos Secundários de Status e Atributos (Secondary Effects: P4)
      let secEffect = constants.getSecondaryEffect ? constants.getSecondaryEffect(selectedMove) : null;
      secEffect=constants.P7.secondary(state,selectedMove,secEffect);
      if(secEffect?.statusChoices){
        const choice=action?.secondaryStatusChoice===undefined?1:Number(action.secondaryStatusChoice);
        if(!Number.isInteger(choice)||choice<1||choice>secEffect.statusChoices.length)throw new Error('Escolha secundária inválida.');
        secEffect={...secEffect,statusCondition:secEffect.statusChoices[choice-1]};
      }
      if (secEffect && effectiveMultiplier > 0) {
        // Efeitos no defensor: exigem sobrevivência do defensor (currentHp > 0)
        if (currentHp > 0) {
          if (secEffect.statusCondition) {
            const canApply = constants.isEligibleForStatusCondition
              ? constants.isEligibleForStatusCondition(defender, secEffect.statusCondition)
              : (!defender.statusCondition && currentHp > 0);
            if (!defender.safeguarded && canApply && secondaryEffectRoll <= secEffect.chance) {
              defender.statusCondition = secEffect.statusCondition;
              defender.toxicStage=0;
              if(secEffect.statusCondition==='sleep'){const duration=action.sleepDuration??2;if(!Number.isInteger(duration)||duration<1||duration>3)throw new Error('Duração de sono inválida.');defender.sleepTurns=duration;defender.sleepCounter=duration;}
              events.push({
                type: BATTLE_EVENTS.STATUS_APPLIED,
                source: attackerRole,
                target: defenderRole,
                pokemonName: defender.name,
                statusCondition: secEffect.statusCondition,
                moveId: selectedMove.id,
                moveName: selectedMove.name,
                secondaryEffectRoll,
                chance: secEffect.chance
              });
              constants.P7.checkSynchronize?.(state, attackerRole, defenderRole, secEffect.statusCondition, constants, events, attacker, defender);
            }
          }

          if (secEffect.flinch) {
            const flinchRoll=secEffect.flinchChance?(action?.secondaryEffectRoll2 ?? 100):secondaryEffectRoll;
            if(!Number.isInteger(flinchRoll)||flinchRoll<1||flinchRoll>100)throw new Error('Rolagem secundária independente inválida.');
            if (!defender.dynamax && constants.P7.defenderAbility(attacker,defender,selectedMove)!=='inner-focus' && flinchRoll <= (secEffect.flinchChance || secEffect.chance)) {
              defender.isFlinched = true;
              events.push({
                type: BATTLE_EVENTS.FLINCH_APPLIED,
                source: attackerRole,
                target: defenderRole,
                pokemonName: defender.name,
                moveId: selectedMove.id,
                moveName: selectedMove.name,
                secondaryEffectRoll,
                chance: secEffect.chance
              });
            }
          }

          if (secEffect.confusion && (!secEffect.requiresRaisedStats || defender.statsRaisedThisTurn)) {
            const canApply = !defender.safeguarded && !constants.P7.statusImmune(defender,'confusion') && !(defender.confusionTurns > 0) && currentHp > 0;
            if (canApply && secondaryEffectRoll <= secEffect.chance) {
              let duration = constants.DEFAULT_CONFUSION_TURNS?.DEFAULT || 3;
              if (action && action.confusionDuration !== undefined) {
                const parsed = Number(action.confusionDuration);
                if (!Number.isInteger(parsed) || parsed < 2 || parsed > 5) {
                  throw new Error(`Duração de confusão inválida: ${action.confusionDuration}. Deve ser um inteiro entre 2 e 5.`);
                }
                duration = parsed;
              }
              defender.confusionTurns = duration;
              events.push({
                type: BATTLE_EVENTS.CONFUSION_APPLIED,
                source: attackerRole,
                target: defenderRole,
                pokemonName: defender.name,
                moveId: selectedMove.id,
                moveName: selectedMove.name,
                duration: defender.confusionTurns,
                secondaryEffectRoll,
                chance: secEffect.chance
              });
            }
          }

          if (secEffect.statDrops && typeof secEffect.statDrops === 'object') {
            if ((!state.p6Sides[defenderRole].mist || attackerInfiltrates) && secondaryEffectRoll <= secEffect.chance) {
              for (const [statKey, delta] of Object.entries(secEffect.statDrops)) {
                const report = constants.applyStatStageChange(defender, statKey, delta);
                events.push({
                  type: BATTLE_EVENTS.STAT_STAGE_CHANGED,
                  combatant: defenderRole,
                  pokemonName: defender.name,
                  statKey: report.statKey,
                  previousStage: report.previousStage,
                  requestedDelta: report.requestedDelta,
                  appliedDelta: report.appliedDelta,
                  finalStage: report.finalStage,
                  blockedReason: report.blockedReason
                });
                if (report.blockedReason === 'ABILITY' && report.statKey === 'accuracy' && constants.P7.ability(defender) === 'keen-eye') {
                  events.push({ type: 'MOVE_PREPARED', actor: defenderRole, pokemonName: defender.name, reason: 'P7_ABILITY', label: 'keen-eye' });
                }
              }
            }
          }
        }

        // Efeitos no atacante (ex: Ancient Power): exigem sobrevivência do atacante (attacker.currentHp > 0)
        if (attacker.currentHp > 0 && secEffect.target === 'attacker' && secEffect.statBoosts && typeof secEffect.statBoosts === 'object') {
          if (secondaryEffectRoll <= secEffect.chance) {
            for (const [statKey, delta] of Object.entries(secEffect.statBoosts)) {
              const report = constants.applyStatStageChange(attacker, statKey, delta);
              events.push({
                type: BATTLE_EVENTS.STAT_STAGE_CHANGED,
                combatant: attackerRole,
                pokemonName: attacker.name,
                statKey: report.statKey,
                previousStage: report.previousStage,
                requestedDelta: report.requestedDelta,
                appliedDelta: report.appliedDelta,
                finalStage: report.finalStage,
                blockedReason: report.blockedReason
              });
            }
          }
        }
      }

      if(selectedMove.id===499&&effectiveMultiplier>0&&currentHp>0){
        const wasRaised=defender.statsRaisedThisTurn;
        for(const key of [...constants.STAT_STAGE_KEYS,'accuracy','evasion']){
          const previousStage=['accuracy','evasion'].includes(key)?Number(defender[key+'Stage']||0):Number(defender.statStages[key]||0);
          if(!previousStage)continue;
          const report=constants.applyStatStageChange(defender,key,-previousStage);events.push({type:BATTLE_EVENTS.STAT_STAGE_CHANGED,...report,combatant:defenderRole,pokemonName:defender.name});
        }
        defender.statsRaisedThisTurn=wasRaised;
      }

      if(selectedMove.id===740&&effectiveMultiplier>0){
        const members=state.version===2?state[attackerRole].team:[attacker];
        for(const member of members){if(!member.statusCondition)continue;const old=member.statusCondition;member.statusCondition=null;member.sleepTurns=0;member.sleepCounter=0;member.toxicStage=0;
          events.push({type:BATTLE_EVENTS.STATUS_CURED,target:attackerRole,pokemonName:member.name,statusCondition:old,reason:'TEAM_CURE',...(member!==attacker?{benched:true}:{})});}
      }

      // 10D. Descongelamento do alvo por Scald / thawsTarget (onAfterMoveSecondary: P4)
      // Conforme Pokémon Showdown data/conditions.ts (frz.onAfterMoveSecondary):
      // Scald descongela o alvo sobrevivente APÓS os efeitos secundários terem sido resolvidos.
      // Como a rolagem secundária (10C) é avaliada com o alvo ainda congelado, Scald NÃO queima o alvo congelado.
      const isThawsTarget = Boolean(
        selectedMove.thawsTarget || constants.isPostSecondaryThawMove?.(selectedMove) ||
        String(selectedMove.name || '').trim().toLowerCase() === 'scald'
      );
      if (currentHp > 0 && defender.statusCondition === 'freeze' && effectiveMultiplier > 0 && isThawsTarget) {
        defender.statusCondition = null;
        events.push({
          type: BATTLE_EVENTS.STATUS_CURED,
          actor: attackerRole,
          target: defenderRole,
          pokemonName: defender.name,
          statusCondition: 'freeze',
          reason: 'THAWED',
          moveName: selectedMove.name
        });
      }

      // 11. Troca Forçada (Forced Switch: Dragon Tail / Circle Throw)
      if (currentHp > 0 && finalDamage > 0 && state.version === 2 && state.battleFormat!=='DOUBLES' && !defender.dynamax && constants.isForcedSwitchMove?.(selectedMove)) {
        const defenderSide = state[defenderRole];
        const eligibleBench = defenderSide.team
          .map((p, idx) => ({ pokemon: p, index: idx }))
          .filter(item => item.index !== defenderSide.activeIndex && item.pokemon.currentHp > 0);

        if (eligibleBench.length > 0) {
          let targetIndex = eligibleBench[0].index;
          if (action && action.forcedSwitchIndex !== undefined) {
            const forced = eligibleBench.find(item => item.index === Number(action.forcedSwitchIndex));
            if (forced) targetIndex = forced.index;
          } else if (action && action.forcedSwitchTargetPokemonId !== undefined) {
            const forced = eligibleBench.find(item => item.pokemon.id === Number(action.forcedSwitchTargetPokemonId));
            if (forced) targetIndex = forced.index;
          }

          const previousActive = defender;
          if (constants.resetStatStages) {
            constants.resetStatStages(previousActive);
          }
          previousActive.isFlinched = false;
          previousActive.confusionTurns = 0;
          previousActive.drowsyTurns=0;previousActive.drowsySleepDuration=0;
          previousActive.substitute = false;
          previousActive.substituteHp = 0;
          previousActive.tauntTurns = 0;
          previousActive.entryMoveAttempts = 0;
          previousActive.rechargeMoveId=null;previousActive.lastMoveFailed=false;previousActive.lastDirectHit=null;previousActive.bideState=null;previousActive.twoTurnMove=null;previousActive.beakBlastReady=false;previousActive.shellTrapReady=false;
          previousActive.toxicStage = 0;
          defenderSide.activeIndex = targetIndex;
          const newActive = defenderSide.team[targetIndex];
          newActive.isFlinched = false;
          newActive.entryMoveAttempts = 0;

          events.push({
            type: BATTLE_EVENTS.POKEMON_SWITCHED,
            side: defenderRole,
            previousPokemonId: previousActive.id,
            newPokemonId: newActive.id,
            reason: constants.SWITCH_REASON ? constants.SWITCH_REASON.FORCED : 'FORCED'
          });
          constants.P7.leave(state,defenderRole,previousActive,constants,events);
          constants.P8.restore(previousActive);
          constants.P6.leave(state,defenderRole,previousActive);
          constants.P7.sync(state);
          constants.P6.entry(state,defenderRole,constants,TypeEffectiveness,events);
          if(newActive.currentHp>0)constants.P7.enter(state,defenderRole,constants,events);
          if(newActive.currentHp<=0)resolveFaints(state,events,[defenderRole],'entry-hazard');
        }
      }

      constants.P6.afterDamage(state,attackerRole,selectedMove,action||{},constants,events,actualDamageDealt);
      // 12. Nocaute (Faint Detection - defensor e/ou atacante por recuo)
      const faintedRoles = [];
      if (currentHp === 0) {constants.P7.directKO(state,attackerRole,defender,constants,events,attacker);faintedRoles.push(defenderRole);}
      if (attackerFaintedFromRecoil || attacker.currentHp === 0) faintedRoles.push(attackerRole);
      if (faintedRoles.length > 0) {
        resolveFaints(state, events, faintedRoles, (attackerFaintedFromRecoil || attacker.currentHp === 0) && currentHp > 0 ? 'recoil' : 'move');
      }
    }

    /**
     * Resolve a substituição obrigatória de um ou ambos os lados após um nocaute (PBA-006).
     * Transita a batalha de volta para IN_PROGRESS e incrementa o turno para a próxima rodada.
     * 
     * @param {Object} currentState - Estado atual em AWAITING_REPLACEMENT.
     * @param {Object} replacementActions - Ações { player: { targetPokemonId }, enemy: { targetPokemonId } }.
     * @returns {{ state: Object, events: Array<Object> }}
     */
    function resumePendingTurn(state,events){
      if(!state.pendingTurn||state.status!=='IN_PROGRESS')return;
      const pending=state.pendingTurn;delete state.pendingTurn;
      if(pending.action&&getActiveCombatant(state,pending.role).id===pending.actorId&&getActiveCombatant(state,pending.role).currentHp>0)executeAction(pending.role,pending.opponent,state,events,pending.action);
      if(state.pendingPivot){state.pendingTurn={};return;}
      finishTurn(state,events);
    }
    function resolveReplacement(currentState, replacementActions = {}) {
      if (!currentState || typeof currentState !== 'object') {
        throw new Error('Estado de batalha inválido.');
      }

      if (currentState.status !== BATTLE_STATUS.AWAITING_REPLACEMENT) {
        throw new Error(`resolveReplacement só pode ser executado quando a batalha está em AWAITING_REPLACEMENT. Status atual: ${currentState.status}.`);
      }

      if(currentState.pendingPivot){
        const nextState=cloneData(currentState),events=[],p=nextState.pendingPivot;
        const choice=replacementActions[p.role];if(!choice)throw new Error('Escolha do substituto do pivô ausente.');
        delete nextState.pendingPivot;nextState.status=BATTLE_STATUS.IN_PROGRESS;
        executeSwitch(p.role,nextState,events,{...choice,batonPass:p},'PIVOT');
        const incoming=getActiveCombatant(nextState,p.role);

        if(['player','enemy'].some(r=>getActiveCombatant(nextState,r).currentHp<=0))nextState.status=BATTLE_STATUS.AWAITING_REPLACEMENT;
        resumePendingTurn(nextState,events);
        return {state:nextState,events};
      }
      const nextState = cloneData(currentState);
      const events = [];
      const roles = ['player', 'enemy'];
      let replacedAny = false;

      for (const role of roles) {
        const side = nextState[role];
        const active = side.team[side.activeIndex];

        if (active.currentHp === 0) {
          const action = replacementActions[role];
          if (!action) {
            throw new Error(`Ação de substituição obrigatória ausente para "${role}".`);
          }

          let targetIndex = -1;
          if (action.targetIndex !== undefined) {
            const idx = Number(action.targetIndex);
            if (Number.isInteger(idx) && idx >= 0 && idx < side.team.length) {
              targetIndex = idx;
            }
          } else if (action.targetPokemonId !== undefined) {
            targetIndex = side.team.findIndex(p => p.id === Number(action.targetPokemonId));
          }

          if (targetIndex === -1) {
            throw new Error(`Substituto inválido ou não pertence à equipe de "${role}": ${JSON.stringify(action)}`);
          }

          if (targetIndex === side.activeIndex) {
            throw new Error(`Substituto inválido: Pokémon no índice ${targetIndex} é o que acabou de ser nocauteado.`);
          }

          const target = side.team[targetIndex];
          if (target.currentHp === 0) {
            throw new Error(`Substituto inválido: "${target.name}" já está nocauteado.`);
          }

          const previousActive = active;
          previousActive.confusionTurns = 0;
          previousActive.drowsyTurns=0;previousActive.drowsySleepDuration=0;
          previousActive.entryMoveAttempts = 0;
          previousActive.rechargeMoveId=null;previousActive.lastMoveFailed=false;previousActive.lastDirectHit=null;previousActive.bideState=null;previousActive.twoTurnMove=null;previousActive.beakBlastReady=false;previousActive.shellTrapReady=false;
          previousActive.isProtected = false;
          previousActive.stallCount = 0;
          previousActive.toxicStage = 0;
          target.isProtected = false;
          target.stallCount = 0;
          target.twoTurnMove = null;
          side.activeIndex = targetIndex;
          replacedAny = true;

          events.push({
            type: BATTLE_EVENTS.POKEMON_SWITCHED,
            side: role,
            previousPokemonId: previousActive.id,
            newPokemonId: target.id,
            reason: constants.SWITCH_REASON ? constants.SWITCH_REASON.FAINT_REPLACEMENT : 'FAINT_REPLACEMENT'
          });
          constants.P7.leave(nextState,role,previousActive,constants,events);
          constants.P8.restore(previousActive);
          constants.P6.leave(nextState,role,previousActive);
          constants.P7.sync(nextState);
          constants.P6.entry(nextState,role,constants,TypeEffectiveness,events);
          if(target.currentHp>0)constants.P7.enter(nextState,role,constants,events);
          if(target.currentHp<=0)resolveFaints(nextState,events,[role],'entry-hazard');
        }
      }

      if (replacedAny && !['PLAYER_WIN','ENEMY_WIN'].includes(nextState.status) && ['player','enemy'].every(r=>getActiveCombatant(nextState,r).currentHp>0)) {
        nextState.status = BATTLE_STATUS.IN_PROGRESS;
        if(!nextState.pendingTurn)nextState.turn += 1;
      }
      resumePendingTurn(nextState,events);

      return {
        state: nextState,
        events
      };
    }

    /**
     * Simula uma batalha 1x1 completa até existir um vencedor ou atingir o limite de turnos.
     * Se forem passados arrays, delega automaticamente para simulateTeamBattle.
     * 
     * @param {Object|Array} playerInput - Dados do Pokémon ou equipe do jogador.
     * @param {Object|Array} enemyInput - Dados do Pokémon ou equipe adversária.
     * @param {number} [maxTurns] - Limite máximo de turnos (padrão 100).
     * @param {Array<Object>} [turnActions] - Lista opcional de ações para cada turno.
     * @returns {{ state: Object, events: Array<Object>, totalTurns: number }}
     */
    function simulateBattle(playerInput, enemyInput, maxTurns = BATTLE_CONFIG.MAX_TURNS_LIMIT, turnActions = null) {
      if (Array.isArray(playerInput) || Array.isArray(enemyInput)) {
        return simulateTeamBattle(playerInput, enemyInput, maxTurns, turnActions);
      }

      let state = createBattle(playerInput, enemyInput);
      const allEvents = [
        {
          type: BATTLE_EVENTS.BATTLE_STARTED,
          player: { id: state.player.id, name: state.player.name, types: state.player.types, maxHp: state.player.maxHp },
          enemy: { id: state.enemy.id, name: state.enemy.name, types: state.enemy.types, maxHp: state.enemy.maxHp }
        }
      ];

      let safetyCounter = 0;
      while (state.status === BATTLE_STATUS.IN_PROGRESS) {
        safetyCounter++;
        if (safetyCounter > maxTurns) {
          throw new Error(`Limite de segurança de turnos (${maxTurns}) atingido. Simulação abortada para evitar loop infinito.`);
        }

        const actionsForTurn = (turnActions && turnActions[safetyCounter - 1]) ? turnActions[safetyCounter - 1] : {};
        const turnResult = resolveTurn(state, actionsForTurn);
        state = turnResult.state;
        allEvents.push(...turnResult.events);
      }

      return {
        state,
        events: allEvents,
        totalTurns: state.turn
      };
    }

    /**
     * Simula uma batalha 3x3 completa até existir um vencedor ou atingir o limite de turnos (PBA-006).
     * Resolve automaticamente ou por roteiro substituições forçadas e trocas voluntárias.
     * 
     * @param {Array<Object>} playerTeamInput - 3 Pokémon do jogador.
     * @param {Array<Object>} enemyTeamInput - 3 Pokémon do adversário.
     * @param {number} [maxTurns] - Limite de segurança de turnos (padrão 100).
     * @param {Array<Object>} [turnActions] - Lista opcional de ações para cada turno.
     * @param {Array<Object>} [replacementActions] - Lista opcional de substituições forçadas.
     * @returns {{ state: Object, events: Array<Object>, totalTurns: number }}
     */
    function simulateTeamBattle(playerTeamInput, enemyTeamInput, maxTurns = BATTLE_CONFIG.MAX_TURNS_LIMIT, turnActions = null, replacementActions = null) {
      let state = createTeamBattle(playerTeamInput, enemyTeamInput);
      const allEvents = [
        {
          type: BATTLE_EVENTS.BATTLE_STARTED,
          player: {
            activeIndex: state.player.activeIndex,
            activePokemon: { id: state.player.team[0].id, name: state.player.team[0].name, types: state.player.team[0].types },
            teamSize: state.player.team.length
          },
          enemy: {
            activeIndex: state.enemy.activeIndex,
            activePokemon: { id: state.enemy.team[0].id, name: state.enemy.team[0].name, types: state.enemy.team[0].types },
            teamSize: state.enemy.team.length
          }
        }
      ];

      let safetyCounter = 0;
      let actionIndex = 0;
      let replacementIndex = 0;

      while (state.status !== BATTLE_STATUS.PLAYER_WIN && state.status !== BATTLE_STATUS.ENEMY_WIN) {
        safetyCounter++;
        if (safetyCounter > maxTurns) {
          throw new Error(`Limite de segurança de turnos (${maxTurns}) atingido. Simulação 3x3 abortada para evitar loop infinito.`);
        }

        if (state.status === BATTLE_STATUS.AWAITING_REPLACEMENT) {
          let replAct = {};
          if (replacementActions && replacementActions[replacementIndex]) {
            replAct = { ...replacementActions[replacementIndex] };
            replacementIndex++;
          }
          // Se algum lado precisa de substituição e não foi especificado explicitamente, usa o primeiro Pokémon vivo da reserva
          if (getActiveCombatant(state, 'player').currentHp === 0 && !replAct.player) {
            const nextHealthy = state.player.team.find(p => p.currentHp > 0);
            if (nextHealthy) replAct.player = { targetPokemonId: nextHealthy.id };
          }
          if (getActiveCombatant(state, 'enemy').currentHp === 0 && !replAct.enemy) {
            const nextHealthy = state.enemy.team.find(p => p.currentHp > 0);
            if (nextHealthy) replAct.enemy = { targetPokemonId: nextHealthy.id };
          }

          const replResult = resolveReplacement(state, replAct);
          state = replResult.state;
          allEvents.push(...replResult.events);
        } else if (state.status === BATTLE_STATUS.IN_PROGRESS) {
          const act = (turnActions && turnActions[actionIndex]) ? turnActions[actionIndex] : {};
          actionIndex++;
          const turnResult = resolveTurn(state, act);
          state = turnResult.state;
          allEvents.push(...turnResult.events);
        }
      }

      return {
        state,
        events: allEvents,
        totalTurns: state.turn
      };
    }

    const api = {
      createCombatant,
      validateAndCreateTeam,
      getActiveCombatant,
      createBattle,
      createTeamBattle,
      resolveTurn,
      resolveReplacement,
      simulateBattle,
      simulateTeamBattle
    };
    const doubles=typeof module!=='undefined'&&module.exports?require('./doubles-battle.js'):window.PBADoublesBattle;
    return doubles.install(api,{executeAction,executeSwitch,finishTurn,resolveFaints},constants,TypeEffectiveness);
  })();

  // Suporte universal (Node.js & Browser)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BattleEngine;
  } else if (typeof window !== 'undefined') {
    window.PBABattle = window.PBABattle || {};
    window.PBABattle.BattleEngine = BattleEngine;
  }
})();

/* PBA-015I / PBA-TRIALS — Adapter over the same BattleEngine state model for Shadow Final Stand and Trial 3x1 formats. */
(function () {
  const Engine = typeof module !== 'undefined' && module.exports ? module.exports : (window.PBABattle && window.PBABattle.BattleEngine);
  if (!Engine) return;
  const regularCreateTeamBattle = Engine.createTeamBattle;
  Engine.createTeamBattle = function (playerTeamInput, enemyTeamInput, options = {}) {
    const format = options.battleFormat || options.metadata?.battleFormat;
    if(format==='DOUBLES')return Engine.createDoublesBattle(playerTeamInput,enemyTeamInput,options);
    if (format === 'TRIAL_3X1' || format === 'THREE_VS_ONE' || format === '3X1') {
      if (!Array.isArray(playerTeamInput) || playerTeamInput.length !== 3) {
        throw new Error('A Prova 3 contra 1 requer exatamente três Pokémon na equipe do jogador.');
      }
      if (!Array.isArray(enemyTeamInput) || enemyTeamInput.length !== 1) {
        throw new Error('A Prova 3 contra 1 requer exatamente um Pokémon na equipe adversária.');
      }
      const normalize = (team, label) => {
        const seen = new Set();
        return team.map(raw => {
          const mon = Engine.createCombatant(raw);
          if (seen.has(mon.id)) throw new Error(`Espécie duplicada na equipe "${label}".`);
          seen.add(mon.id);
          return mon;
        });
      };
      return {
        version: 2,
        status: 'IN_PROGRESS',
        turn: 1,
        player: { activeIndex: 0, team: normalize(playerTeamInput, 'player') },
        enemy: { activeIndex: 0, team: normalize(enemyTeamInput, 'enemy') },
        winner: null,
        modifiers: options.modifiers || {},
        metadata: options.metadata || null
      };
    }
    if (format !== 'FINAL_STAND') return regularCreateTeamBattle(playerTeamInput, enemyTeamInput, options);
    if (!Array.isArray(playerTeamInput) || playerTeamInput.length < 1) throw new Error('Final Stand requer ao menos um Pokémon do jogador.');
    if (!Array.isArray(enemyTeamInput) || enemyTeamInput.length !== 3) throw new Error('A equipe Shadow deve manter exatamente três Pokémon.');
    const normalize = (team, label) => {
      const seen = new Set();
      return team.map(raw => {
        const mon = Engine.createCombatant(raw);
        if (seen.has(mon.id)) throw new Error(`Espécie duplicada na equipe "${label}".`);
        seen.add(mon.id); return mon;
      });
    };
    return { version: 2, status: 'IN_PROGRESS', turn: 1, player: { activeIndex: 0, team: normalize(playerTeamInput, 'player') }, enemy: { activeIndex: 0, team: normalize(enemyTeamInput, 'enemy') }, winner: null, modifiers: options.modifiers || {}, metadata: options.metadata || null };
  };
})();

(function(){const E=typeof module!=='undefined'&&module.exports?module.exports:window.PBABattle.BattleEngine;const C=typeof module!=='undefined'&&module.exports?require('./battle-constants.js'):window.PBABattle;const create=E.createTeamBattle;E.createTeamBattle=function(...args){const state=create(...args);C.P7.start(state,C);return state;};})();
