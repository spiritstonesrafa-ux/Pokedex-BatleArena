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
        BATTLE_ENDED: 'BATTLE_ENDED'
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
          normalizedMove = {
            id: Number(m.id),
            name: String(m.name).trim().toLowerCase(),
            type: String(m.type).trim().toLowerCase(),
            power: Number(m.power),
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
          ...(normalizedMove.statusEffect ? { statusEffect: normalizedMove.statusEffect } : {}),
          ...(normalizedMove.statBoosts || (constants?.getStatBoosts && constants.getStatBoosts(normalizedMove))
            ? { statBoosts: { ...(normalizedMove.statBoosts || constants.getStatBoosts(normalizedMove)) } } : {}),
          ...(normalizedMove.selfStatDrops || (constants?.getSelfStatDrops && constants.getSelfStatDrops(normalizedMove))
            ? { selfStatDrops: { ...(normalizedMove.selfStatDrops || constants.getSelfStatDrops(normalizedMove)) } } : {}),
          ...(constants?.getSecondaryEffect && constants.getSecondaryEffect(normalizedMove)
            ? { secondaryEffect: constants.getSecondaryEffect(normalizedMove) } : {})
        });
      }

      const combatant = {
        id,
        name: raw.name.trim().toLowerCase(),
        types: normalizedTypes,
        maxHp: Math.floor(hp),
        currentHp: raw.currentHp !== undefined ? Math.max(0, Math.min(Math.floor(hp), Math.floor(raw.currentHp))) : Math.floor(hp),
        attack: Math.floor(attack),
        defense: Math.floor(defense),
        specialAttack: Math.floor(specialAttack),
        specialDefense: Math.floor(specialDefense),
        speed: Math.floor(speed),
        statusCondition: (raw.statusCondition && ['poison', 'burn', 'paralysis'].includes(raw.statusCondition)) ? raw.statusCondition : null,
        isFlinched: false,
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
      targetPokemon.isFlinched = false;

      side.activeIndex = targetIndex;

      events.push({
        type: BATTLE_EVENTS.POKEMON_SWITCHED,
        side: role,
        previousPokemonId: previousActive.id,
        newPokemonId: targetPokemon.id,
        reason: constants.SWITCH_REASON ? constants.SWITCH_REASON[reason] || reason : reason
      });
    }

    function resolveFaints(state, events, faintedRoles, cause = 'move') {
      const roles = [...new Set(faintedRoles)];
      for (const role of roles) {
        const pokemon = getActiveCombatant(state, role);
        if (constants.resetStatStages) {
          constants.resetStatStages(pokemon);
        }
        pokemon.isFlinched = false;
        events.push({ type: BATTLE_EVENTS.POKEMON_FAINTED, target: role, pokemonName: pokemon.name });
      }
      const defeated = roles.filter(role => state.version === 1 ||
        state[role].team.every(pokemon => pokemon.currentHp === 0));
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
        state.winner = winner;
        state.status = winner === 'player' ? BATTLE_STATUS.PLAYER_WIN : BATTLE_STATUS.ENEMY_WIN;
        events.push({ type: BATTLE_EVENTS.BATTLE_ENDED, winner,
          reason: defeated.length === 2 ? 'Ambas as equipes caíram por status; empate conta como derrota do jogador.' :
            ['poison', 'burn'].includes(cause) ? `A equipe ${defeated[0]} caiu por ${cause === 'poison' ? 'veneno' : 'queimadura'}.` :
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

    function finishTurn(state, events) {
      if (state.status !== BATTLE_STATUS.IN_PROGRESS &&
          state.status !== BATTLE_STATUS.AWAITING_REPLACEMENT) return;
      const fainted = [];
      for (const role of ['player', 'enemy']) {
        const pokemon = getActiveCombatant(state, role);
        if (pokemon.currentHp <= 0 || !['poison', 'burn'].includes(pokemon.statusCondition)) continue;
        const previousHp = pokemon.currentHp;
        const damage = Math.min(previousHp, Math.max(1, Math.floor(pokemon.maxHp /
          (pokemon.statusCondition === 'poison' ? 8 : 16))));
        pokemon.currentHp -= damage;
        events.push({ type: BATTLE_EVENTS.STATUS_DAMAGE, target: role,
          pokemonName: pokemon.name, statusCondition: pokemon.statusCondition, damage, previousHp,
          currentHp: pokemon.currentHp, maxHp: pokemon.maxHp });
        if (pokemon.currentHp === 0) fainted.push(role);
      }
      if (fainted.length) resolveFaints(state, events, fainted,
        getActiveCombatant(state, fainted[0]).statusCondition);

      // Limpeza de estados temporários de turno (Flinch: P4)
      for (const role of ['player', 'enemy']) {
        const mon = getActiveCombatant(state, role);
        if (mon) {
          mon.isFlinched = false;
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
      const nextState = JSON.parse(JSON.stringify(currentState));
      const events = [];
      const currentTurn = nextState.turn;

      // Evento de início do turno
      events.push({
        type: BATTLE_EVENTS.TURN_STARTED,
        turn: currentTurn
      });

      const isPlayerSwitch = actions.player && actions.player.type === BATTLE_ACTIONS.SWITCH;
      const isEnemySwitch = actions.enemy && actions.enemy.type === BATTLE_ACTIONS.SWITCH;

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

        finishTurn(nextState, events);
        return { state: nextState, events };
      }

      // CENÁRIO 3: ENEMY SWITCH VS PLAYER MOVE (Switch tem prioridade sobre Move)
      if (!isPlayerSwitch && isEnemySwitch) {
        executeSwitch('enemy', nextState, events, actions.enemy, 'VOLUNTARY');
        // O ataque do jogador atinge o NOVO Pokémon ativo adversário!
        executeAction('player', 'enemy', nextState, events, actions.player);

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
    function executeAction(attackerRole, defenderRole, state, events, action) {
      const attacker = getActiveCombatant(state, attackerRole);
      const defender = getActiveCombatant(state, defenderRole);

      // B3-06: Validação de que apenas o Pokémon ativo pode realizar ações de combate
      if (action && action.pokemonId !== undefined && Number(action.pokemonId) !== attacker.id) {
        throw new Error(`Apenas o Pokémon ativo ("${attacker.name}") pode realizar ações de combate.`);
      }

      // 1. Seleciona o golpe a ser executado
      let selectedMove;
      if (action && (action.moveId !== undefined || action.moveName !== undefined)) {
        selectedMove = attacker.moves.find(m =>
          (action.moveId !== undefined && m.id === Number(action.moveId)) ||
          (action.moveName !== undefined && m.name.toLowerCase() === String(action.moveName).trim().toLowerCase())
        );
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

      // Validação de PP
      if (selectedMove.currentPp <= 0) {
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

      // Evento de início de ação
      events.push({
        type: BATTLE_EVENTS.ACTION_STARTED,
        actor: attackerRole,
        pokemonName: attacker.name,
        action: BATTLE_ACTIONS.MOVE
      });

      // Verificação canônica de hesitação (Flinch: P4)
      // Precedência canônica: Flinch é verificado antes de paralisia.
      // Se o Pokémon hesita, ele perde a ação imediatamente sem consumir PP e sem acionar rolagem/anúncio de paralisia.
      if (attacker.isFlinched) {
        attacker.isFlinched = false;
        events.push({
          type: BATTLE_EVENTS.FLINCH_IMMOBILIZED,
          actor: attackerRole,
          pokemonName: attacker.name
        });
        return;
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

      const immobilized = attacker.statusCondition === 'paralysis' && statusRoll <= 25;
      if (!immobilized) {
        // Mantém a ordem histórica MOVE_USED → PP_CHANGED nos golpes executados.
        events.push({
          type: BATTLE_EVENTS.MOVE_USED,
          actor: attackerRole,
          pokemonId: attacker.id,
          pokemonName: attacker.name,
          moveId: selectedMove.id,
          moveName: selectedMove.name,
          moveType: selectedMove.type,
          damageClass: selectedMove.damageClass,
          power: selectedMove.power
        });
      }

      // Consumo de PP (ocorre antes da resolução de dano, em hits e em misses)
      const previousPp = selectedMove.currentPp;
      selectedMove.currentPp = Math.max(0, selectedMove.currentPp - 1);

      events.push({
        type: BATTLE_EVENTS.PP_CHANGED,
        actor: attackerRole,
        moveId: selectedMove.id,
        moveName: selectedMove.name,
        previousPp,
        currentPp: selectedMove.currentPp,
        maxPp: selectedMove.maxPp
      });

      if (immobilized) {
        events.push({ type: BATTLE_EVENTS.STATUS_IMMOBILIZED, actor: attackerRole,
          pokemonName: attacker.name, statusCondition: 'paralysis', statusRoll });
        return;
      }

      // 2. Resolução de Acurácia (Hit vs Miss)
      let isHit = true;
      if (selectedMove.accuracy !== null && selectedMove.accuracy !== 'ALWAYS_HIT') {
        isHit = accuracyRoll <= selectedMove.accuracy;
      }

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

      if (selectedMove.damageClass === MOVE_DAMAGE_CLASSES.STATUS) {
        if (selectedMove.statusEffect) {
          const blocked = constants.isStatusMoveImmune(selectedMove, defender.types)
            ? 'IMMUNE' : defender.statusCondition ? 'ALREADY_STATUS' : null;
          if (blocked) {
            events.push({ type: BATTLE_EVENTS.STATUS_BLOCKED, target: defenderRole,
              pokemonName: defender.name, statusCondition: selectedMove.statusEffect, reason: blocked });
          } else {
            defender.statusCondition = selectedMove.statusEffect;
            events.push({ type: BATTLE_EVENTS.STATUS_APPLIED, source: attackerRole,
              target: defenderRole, pokemonName: defender.name, statusCondition: selectedMove.statusEffect });
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
      const hasStab = attacker.types.includes(selectedMove.type);
      const stabMultiplier = hasStab ? constants.BATTLE_CONFIG.STAB_MULTIPLIER : 1;

      events.push({
        type: BATTLE_EVENTS.STAB_RESOLVED,
        actor: attackerRole,
        moveType: selectedMove.type,
        attackerTypes: attacker.types,
        multiplier: stabMultiplier,
        hasStab
      });

      // 4. Resolução de Type Effectiveness
      let effectiveMultiplier;
      let effectivenessClassification;
      let defenderTypesList = defender.types;

      if (constants.isDualTypeEffectiveness?.(selectedMove)) {
        const primaryEff = TypeEffectiveness.calculate('fighting', defender.types);
        const secondaryEff = TypeEffectiveness.calculate('flying', defender.types);
        const combinedMultiplier = primaryEff.multiplier * secondaryEff.multiplier;
        effectiveMultiplier = BattleModifierResolver && BattleModifierResolver.resolveTypeMultiplier
          ? BattleModifierResolver.resolveTypeMultiplier(combinedMultiplier, { attackerSide: attackerRole, modifiers: state.modifiers || {} })
          : combinedMultiplier;
        effectivenessClassification = TypeEffectiveness.getClassification(effectiveMultiplier);

        events.push({
          type: BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED,
          source: attackerRole,
          target: defenderRole,
          attackType: selectedMove.type,
          secondaryAttackType: 'flying',
          defenderTypes: defender.types,
          multiplier: effectiveMultiplier,
          classification: effectivenessClassification
        });
      } else {
        const effectiveness = TypeEffectiveness.calculate(selectedMove.type, defender.types);
        effectiveMultiplier = BattleModifierResolver && BattleModifierResolver.resolveTypeMultiplier
          ? BattleModifierResolver.resolveTypeMultiplier(effectiveness.multiplier, { attackerSide: attackerRole, modifiers: state.modifiers || {} })
          : effectiveness.multiplier;
        effectivenessClassification = effectiveness.classification;
        defenderTypesList = effectiveness.defenderTypes;

        events.push({
          type: BATTLE_EVENTS.TYPE_EFFECTIVENESS_RESOLVED,
          source: attackerRole,
          target: defenderRole,
          attackType: effectiveness.attackType,
          defenderTypes: effectiveness.defenderTypes,
          multiplier: effectiveness.multiplier,
          classification: effectiveness.classification
        });
      }

      // 5. Seleção de atributos de ataque e defesa baseados na categoria de dano
      let attackStat;
      let defenseStat;
      if (selectedMove.damageClass === MOVE_DAMAGE_CLASSES.PHYSICAL) {
        attackStat = constants.usesDefenseAsAttack?.(selectedMove)
          ? (constants.getEffectiveStat ? constants.getEffectiveStat(attacker, 'defense') : attacker.defense)
          : (constants.getEffectiveStat ? constants.getEffectiveStat(attacker, 'attack') : attacker.attack);
        defenseStat = constants.getEffectiveStat ? constants.getEffectiveStat(defender, 'defense') : defender.defense;
      } else {
        attackStat = constants.getEffectiveStat ? constants.getEffectiveStat(attacker, 'specialAttack') : attacker.specialAttack;
        defenseStat = constants.targetsDefenseWithSpAtk?.(selectedMove)
          ? (constants.getEffectiveStat ? constants.getEffectiveStat(defender, 'defense') : defender.defense)
          : (constants.getEffectiveStat ? constants.getEffectiveStat(defender, 'specialDefense') : defender.specialDefense);
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
      const baseDamage = DamageCalculator.calculateBaseDamage(attackStat, defenseStat, selectedMove.power);
      const finalDamage = constants.applyBurnPenalty(
        DamageCalculator.applyModifier(baseDamage, effectiveMultiplier, stabMultiplier, damageRoll),
        attacker, selectedMove);

      // 7. Aplicação do dano ao HP
      const previousHp = defender.currentHp;
      const currentHp = Math.max(0, previousHp - finalDamage);
      defender.currentHp = currentHp;
      const actualDamageDealt = previousHp - currentHp;

      // 8. Emite evento de dano aplicado com dados completos
      events.push({
        type: BATTLE_EVENTS.DAMAGE_APPLIED,
        source: attackerRole,
        target: defenderRole,
        attackType: selectedMove.type,
        damageClass: selectedMove.damageClass,
        defenderTypes: defenderTypesList,
        moveName: selectedMove.name,
        power: selectedMove.power,
        baseDamage,
        damageRoll,
        stabMultiplier,
        typeMultiplier: effectiveMultiplier,
        multiplier: effectiveMultiplier,
        damage: finalDamage,
        previousHp,
        currentHp
      });

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
      if (actualDamageDealt > 0 && constants.getRecoilRatio?.(selectedMove) > 0) {
        const recoilRatio = constants.getRecoilRatio(selectedMove);
        const rawRecoil = Math.max(1, Math.floor(actualDamageDealt * recoilRatio));
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
      const selfDrops = selectedMove.selfStatDrops || (constants.getSelfStatDrops && constants.getSelfStatDrops(selectedMove));
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
      const secEffect = constants.getSecondaryEffect ? constants.getSecondaryEffect(selectedMove) : null;
      if (secEffect && effectiveMultiplier > 0) {
        // Efeitos no defensor: exigem sobrevivência do defensor (currentHp > 0)
        if (currentHp > 0) {
          if (secEffect.statusCondition) {
            const canApply = constants.isEligibleForStatusCondition
              ? constants.isEligibleForStatusCondition(defender, secEffect.statusCondition)
              : (!defender.statusCondition && currentHp > 0);
            if (canApply && secondaryEffectRoll <= secEffect.chance) {
              defender.statusCondition = secEffect.statusCondition;
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
            }
          }

          if (secEffect.flinch) {
            if (secondaryEffectRoll <= secEffect.chance) {
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

          if (secEffect.statDrops && typeof secEffect.statDrops === 'object') {
            if (secondaryEffectRoll <= secEffect.chance) {
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

      // 11. Troca Forçada (Forced Switch: Dragon Tail / Circle Throw)
      if (currentHp > 0 && finalDamage > 0 && state.version === 2 && constants.isForcedSwitchMove?.(selectedMove)) {
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
          defenderSide.activeIndex = targetIndex;
          const newActive = defenderSide.team[targetIndex];
          newActive.isFlinched = false;

          events.push({
            type: BATTLE_EVENTS.POKEMON_SWITCHED,
            side: defenderRole,
            previousPokemonId: previousActive.id,
            newPokemonId: newActive.id,
            reason: constants.SWITCH_REASON ? constants.SWITCH_REASON.FORCED : 'FORCED'
          });
        }
      }

      // 12. Nocaute (Faint Detection - defensor e/ou atacante por recuo)
      const faintedRoles = [];
      if (currentHp === 0) faintedRoles.push(defenderRole);
      if (attackerFaintedFromRecoil) faintedRoles.push(attackerRole);
      if (faintedRoles.length > 0) {
        resolveFaints(state, events, faintedRoles, attackerFaintedFromRecoil && currentHp > 0 ? 'recoil' : 'move');
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
    function resolveReplacement(currentState, replacementActions = {}) {
      if (!currentState || typeof currentState !== 'object') {
        throw new Error('Estado de batalha inválido.');
      }

      if (currentState.status !== BATTLE_STATUS.AWAITING_REPLACEMENT) {
        throw new Error(`resolveReplacement só pode ser executado quando a batalha está em AWAITING_REPLACEMENT. Status atual: ${currentState.status}.`);
      }

      const nextState = JSON.parse(JSON.stringify(currentState));
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
          side.activeIndex = targetIndex;
          replacedAny = true;

          events.push({
            type: BATTLE_EVENTS.POKEMON_SWITCHED,
            side: role,
            previousPokemonId: previousActive.id,
            newPokemonId: target.id,
            reason: constants.SWITCH_REASON ? constants.SWITCH_REASON.FAINT_REPLACEMENT : 'FAINT_REPLACEMENT'
          });
        }
      }

      if (replacedAny) {
        nextState.status = BATTLE_STATUS.IN_PROGRESS;
        nextState.turn += 1;
      }

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

    return {
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
