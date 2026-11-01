/**
 * ====================================================================
 * GERENCIADOR DE TURNOS E INICIATIVA: TURN MANAGER (turn-manager.js)
 * ====================================================================
 * Responsável por determinar a ordem de atuação dos combatentes no turno
 * com base na velocidade (Speed).
 * 
 * Regras das Fases PBA-003 e PBA-004:
 * - O combatente com maior Speed atua primeiro;
 * - Em caso de empate de Speed, o jogador atua primeiro (regra determinística).
 */

(function () {
  let constants;
  if (typeof module !== 'undefined' && module.exports) {
    constants = require('./battle-constants.js');
  } else if (typeof window !== 'undefined' && window.PBABattle) {
    constants = window.PBABattle;
  } else {
    constants = {
      BATTLE_CONFIG: {
        PLAYER_FIRST_ON_SPEED_TIE: true
      }
    };
  }

  const TurnManager = (() => {
    function effectiveSpeed(combatant) {
      const speed = constants.getEffectiveStat
        ? constants.getEffectiveStat(combatant, 'speed')
        : Number(combatant.speed);
      return combatant.statusCondition === 'paralysis' && speed > 0
        ? Math.max(1, Math.floor(speed / 2)) : speed;
    }
    function resolveActionPriority(combatant, action) {
      if (combatant?.rechargeMoveId) return 0;
      if (combatant?.bideState && action?.type!==constants.BATTLE_ACTIONS?.SWITCH)return 1;
      if (!action || typeof action !== 'object') return 0;
      if (typeof action.priority === 'number' && Number.isFinite(action.priority)) {
        return action.priority;
      }
      if (action.type === constants.BATTLE_ACTIONS?.SWITCH) {
        return 1000;
      }
      let move = action.move || null;
      if (!move && Array.isArray(combatant?.moves)) {
        if (action.moveId !== undefined) {
          move = combatant.moves.find(m => m.id === Number(action.moveId));
        } else if (action.moveName !== undefined) {
          move = combatant.moves.find(m => String(m.name).toLowerCase() === String(action.moveName).toLowerCase());
        } else {
          move = combatant.moves.find(m => m.currentPp > 0) || combatant.moves[0];
        }
      }
      if(combatant?.dynamax&&move){move=constants.P8.activeMove(combatant,move,constants);return move.p8MaxGuard?4:0;}
      return constants.P7?constants.P7.priority(combatant,move,constants):constants.getMovePriority ? constants.getMovePriority(move) : 0;
    }

    /**
     * Determina a ordem de ação entre dois combatentes.
     * Considera prioridade de ação/golpe primeiro (+2, +1, 0, -3, -6) e velocidade efetiva como desempate.
     * @param {{ speed: number }} playerCombatant - Combatente do jogador.
     * @param {{ speed: number }} enemyCombatant - Combatente adversário.
     * @param {Object} [playerAction] - Comando de ação do jogador.
     * @param {Object} [enemyAction] - Comando de ação do adversário.
     * @returns {Array<'player'|'enemy'>} Array com a ordem dos papéis ['primeiro', 'segundo'].
     */
    function determineOrder(playerCombatant, enemyCombatant, playerAction = null, enemyAction = null) {
      if (!playerCombatant || typeof playerCombatant.speed !== 'number' || Number.isNaN(playerCombatant.speed)) {
        throw new Error('Combatente do jogador com velocidade (speed) inválida.');
      }

      if (!enemyCombatant || typeof enemyCombatant.speed !== 'number' || Number.isNaN(enemyCombatant.speed)) {
        throw new Error('Combatente adversário com velocidade (speed) inválida.');
      }

      // 1. Resolução por Prioridade do Golpe / Ação
      const playerPriority = resolveActionPriority(playerCombatant, playerAction);
      const enemyPriority = resolveActionPriority(enemyCombatant, enemyAction);

      if (playerPriority > enemyPriority) {
        return ['player', 'enemy'];
      }

      if (enemyPriority > playerPriority) {
        return ['enemy', 'player'];
      }

      // 2. Prioridades iguais -> desempate por velocidade efetiva
      const playerSpeed = effectiveSpeed(playerCombatant);
      const enemySpeed = effectiveSpeed(enemyCombatant);

      if (playerSpeed > enemySpeed) {
        return ['player', 'enemy'];
      }

      if (enemySpeed > playerSpeed) {
        return ['enemy', 'player'];
      }

      // Empate (Speed Tie) -> Regra determinística de desempate
      const playerFirstOnTie = constants.BATTLE_CONFIG?.PLAYER_FIRST_ON_SPEED_TIE !== false;
      return playerFirstOnTie ? ['player', 'enemy'] : ['enemy', 'player'];
    }

    return {
      effectiveSpeed,
      resolveActionPriority,
      determineOrder
    };
  })();

  // Suporte universal (Node.js & Browser)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TurnManager;
  } else if (typeof window !== 'undefined') {
    window.PBABattle = window.PBABattle || {};
    window.PBABattle.TurnManager = TurnManager;
  }
})();
