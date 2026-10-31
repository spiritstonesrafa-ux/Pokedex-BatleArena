/**
 * ====================================================================
 * AVALIADOR DE BATALHA: BATTLE EVALUATOR (battle-evaluator.js)
 * ====================================================================
 * Módulo matemático puro e determinístico da Fase PBA-007 (Battle AI).
 * 
 * Responsabilidades:
 * - Avaliar o dano esperado (expectedDamage) de golpes ponderado por Precisão (Accuracy);
 * - Avaliar STAB, efetividade elemental (fraquezas, resistências e imunidades) e categorias de dano (Physical / Special);
 * - Identificar se um golpe garante nocaute (wouldKo);
 * - Avaliar confrontos (matchups) entre combatentes ativos e membros do banco (pressão ofensiva vs risco defensivo);
 * - 100% livre de efeitos colaterais (NÃO muta HP, NÃO muta PP, NÃO consome turnos, NÃO altera o estado da batalha).
 * 
 * Compatível com Node.js (CommonJS) e navegadores (window.PBABattle).
 */

(function () {
  let constants;
  let DamageCalculator;
  let TypeEffectiveness;
  let BattleModifierResolver;

  if (typeof module !== 'undefined' && module.exports) {
    constants = require('./battle-constants.js');
    DamageCalculator = require('./damage-calculator.js');
    TypeEffectiveness = require('./type-effectiveness.js');
    BattleModifierResolver = require('./battle-modifier-resolver.js');
  } else if (typeof window !== 'undefined' && window.PBABattle) {
    constants = window.PBABattle;
    DamageCalculator = window.PBABattle.DamageCalculator;
    TypeEffectiveness = window.PBABattle.TypeEffectiveness;
    BattleModifierResolver = window.PBABattle.BattleModifierResolver;
  }

  const BattleEvaluator = (() => {
    /**
     * Avalia matematicamente um golpe executado por um atacante contra um defensor.
     * Não altera propriedades de atacante, defensor ou move.
     * 
     * @param {Object} attacker - Combatente atacante.
     * @param {Object} defender - Combatente defensor.
     * @param {Object} move - Objeto de golpe a avaliar.
     * @returns {Object} Dados da avaliação pura.
     */
    function evaluateMove(attacker, defender, move, context = {}) {
      if (!attacker || typeof attacker !== 'object') {
        throw new Error('Atacante inválido fornecido para evaluateMove.');
      }
      if (!defender || typeof defender !== 'object') {
        throw new Error('Defensor inválido fornecido para evaluateMove.');
      }
      if (!move || typeof move !== 'object') {
        throw new Error('Golpe inválido fornecido para evaluateMove.');
      }

      const damageClass = move.damageClass || 'physical';
      const moveType = (move.type || 'normal').toLowerCase();
      const power = Number(move.power) || 0;
      const accuracy = move.accuracy;
      const currentPp = Number.isInteger(move.currentPp) ? move.currentPp : (move.pp || 0);

      // Golpes de status não causam dano na arquitetura atual
      if (damageClass === 'status' || power <= 0) {
        const statBoosts = move.statBoosts || (constants?.getStatBoosts && constants.getStatBoosts(move)) || null;
        return {
          moveId: move.id,
          moveName: move.name || 'unknown',
          damageClass: 'status',
          moveType,
          power: 0,
          accuracy,
          currentPp,
          statBoosts,
          attackStat: 0,
          defenseStat: 0,
          baseDamage: 0,
          minDamage: 0,
          maxDamage: 0,
          averageDamage: 0,
          stabMultiplier: 1.0,
          typeMultiplier: 1.0,
          typeClassification: 'NEUTRAL',
          damageIfHit: 0,
          expectedDamage: 0,
          guaranteedKo: false,
          possibleKo: false,
          wouldKo: false,
          priority: constants?.getMovePriority?.(move) || 0,
          drainRatio: 0,
          expectedHeal: 0,
          recoilRatio: 0,
          expectedRecoil: 0,
          wouldRecoilKo: false,
          selfStatDrops: null,
          secondaryEffect: null,
          statusChance: 0,
          isEligibleForSecondary: false,
          expectedStatusBenefit: 0
        };
      }

      // 1. Seleção dos atributos ofensivos e defensivos
      let attackStat;
      let defenseStat;
      if (damageClass === 'special') {
        attackStat = Number(constants?.getEffectiveStat ? constants.getEffectiveStat(attacker, 'specialAttack') : attacker.specialAttack) || 1;
        defenseStat = Number(constants?.targetsDefenseWithSpAtk?.(move)
          ? (constants?.getEffectiveStat ? constants.getEffectiveStat(defender, 'defense') : defender.defense)
          : (constants?.getEffectiveStat ? constants.getEffectiveStat(defender, 'specialDefense') : defender.specialDefense)) || 1;
      } else {
        attackStat = Number(constants?.usesDefenseAsAttack?.(move)
          ? (constants?.getEffectiveStat ? constants.getEffectiveStat(attacker, 'defense') : attacker.defense)
          : (constants?.getEffectiveStat ? constants.getEffectiveStat(attacker, 'attack') : attacker.attack)) || 1;
        defenseStat = Number(constants?.getEffectiveStat ? constants.getEffectiveStat(defender, 'defense') : defender.defense) || 1;
      }

      // 2. STAB (Same-Type Attack Bonus)
      const attackerTypes = Array.isArray(attacker.types) ? attacker.types : [];
      const hasStab = attackerTypes.includes(moveType);
      const stabMultiplier = hasStab ? (constants && constants.BATTLE_CONFIG ? constants.BATTLE_CONFIG.STAB_MULTIPLIER : 1.5) : 1.0;

      // 3. Efetividade de Tipos (Type Effectiveness)
      const defenderTypes = Array.isArray(defender.types) ? defender.types : [];
      let typeMultiplier;
      let typeClassification;
      if (constants?.isDualTypeEffectiveness?.(move)) {
        const primaryEff = TypeEffectiveness.calculate('fighting', defenderTypes);
        const secondaryEff = TypeEffectiveness.calculate('flying', defenderTypes);
        const combinedMultiplier = primaryEff.multiplier * secondaryEff.multiplier;
        typeMultiplier = BattleModifierResolver && BattleModifierResolver.resolveTypeMultiplier
          ? BattleModifierResolver.resolveTypeMultiplier(combinedMultiplier, context)
          : combinedMultiplier;
        typeClassification = TypeEffectiveness.getClassification(typeMultiplier);
      } else {
        const effectiveness = TypeEffectiveness.calculate(moveType, defenderTypes);
        typeMultiplier = BattleModifierResolver && BattleModifierResolver.resolveTypeMultiplier
          ? BattleModifierResolver.resolveTypeMultiplier(effectiveness.multiplier, context)
          : effectiveness.multiplier;
        typeClassification = effectiveness.classification;
      }

      // 4. Faixa e Média de Dano (PBA-014B: Level 50 e Variância 85..100)
      const simLevel = (constants && constants.BATTLE_CONFIG && constants.BATTLE_CONFIG.SIMULATION_LEVEL) || 50;
      const range = DamageCalculator.calculateDamageRange(attackStat, defenseStat, power, simLevel, typeMultiplier, stabMultiplier);

      const baseDamage = range.baseDamage;
      const minDamage = constants.applyBurnPenalty(range.minDamage, attacker, move);
      const maxDamage = constants.applyBurnPenalty(range.maxDamage, attacker, move);
      const averageDamage = constants.applyBurnPenalty(range.averageDamage, attacker, move);
      const damageIfHit = averageDamage;

      // 5. Ponderação por Precisão para obter Dano Esperado (Expected Value)
      let accuracyFactor = 1.0;
      if (accuracy !== null && accuracy !== 'ALWAYS_HIT' && accuracy !== undefined) {
        const accNum = Number(accuracy);
        if (Number.isFinite(accNum)) {
          accuracyFactor = Math.max(0, Math.min(100, accNum)) / 100;
        }
      }

      const actionFactor = attacker.statusCondition === 'paralysis' ? 0.75 : 1;
      const expectedDamage = averageDamage > 0 ? Math.floor(averageDamage * accuracyFactor * actionFactor) : 0;

      // 6. Semântica refinada de nocaute (KO)
      const defenderHp = Number(defender.currentHp) || 0;
      const guaranteedKo = minDamage >= defenderHp && minDamage > 0;
      const possibleKo = maxDamage >= defenderHp && maxDamage > 0;
      const wouldKo = guaranteedKo; // Retrocompatibilidade: wouldKo expressa KO garantido

      // 7. Avaliação de Efeitos Especiais (Drenagem, Recuo e Prioridade proporcionais ao dano real do alvo)
      const defenderCurrentHp = Math.max(0, Number(defender.currentHp) || 0);
      const cappedExpectedDamage = Math.min(defenderCurrentHp, expectedDamage);

      const drainRatio = constants?.getDrainRatio?.(move) || 0;
      const expectedHeal = (drainRatio > 0 && cappedExpectedDamage > 0)
        ? Math.min(
            Math.max(0, (Number(attacker.maxHp) || 0) - (Number(attacker.currentHp) || 0)),
            Math.max(1, Math.floor(cappedExpectedDamage * drainRatio))
          )
        : 0;

      const recoilRatio = constants?.getRecoilRatio?.(move) || 0;
      const expectedRecoil = (recoilRatio > 0 && cappedExpectedDamage > 0)
        ? Math.max(1, Math.floor(cappedExpectedDamage * recoilRatio))
        : 0;
      const wouldRecoilKo = recoilRatio > 0 && expectedRecoil >= (Number(attacker.currentHp) || 0);
      const priority = constants?.getMovePriority?.(move) || 0;

      // 8. Avaliação de Efeito Secundário Canônico (Secondary Effects: P4)
      const secEffect = constants?.getSecondaryEffect ? constants.getSecondaryEffect(move) : null;
      let expectedStatusChance = 0;
      let expectedStatusBenefit = 0;
      let isEligibleForSecondary = false;

      if (secEffect && typeMultiplier > 0) {
        if (secEffect.statusCondition) {
          isEligibleForSecondary = Boolean(
            constants.isEligibleForStatusCondition
              ? constants.isEligibleForStatusCondition(defender, secEffect.statusCondition)
              : (!defender.statusCondition && defenderHp > 0)
          );

          if (isEligibleForSecondary && !guaranteedKo) {
            const rawChance = Number(secEffect.chance) || 0;
            expectedStatusChance = (rawChance / 100) * accuracyFactor * actionFactor;

            const defMaxHp = Number(defender.maxHp) || defenderHp || 1;
            if (secEffect.statusCondition === 'poison') {
              const tick = Math.max(1, Math.floor(defMaxHp / 8));
              const turnsRemaining = Math.max(1, Math.min(3, Math.ceil(defenderHp / Math.max(1, averageDamage))));
              expectedStatusBenefit = Math.round(expectedStatusChance * (tick * turnsRemaining));
            } else if (secEffect.statusCondition === 'burn') {
              const tick = Math.max(1, Math.floor(defMaxHp / 16));
              const turnsRemaining = Math.max(1, Math.min(3, Math.ceil(defenderHp / Math.max(1, averageDamage))));
              const hasPhysicalThreat = Array.isArray(defender.moves) && defender.moves.some(m => (m.damageClass || m.damage_class?.name) === 'physical');
              const disruptionBonus = hasPhysicalThreat ? 15 : 0;
              expectedStatusBenefit = Math.round(expectedStatusChance * (tick * turnsRemaining + disruptionBonus));
            } else if (secEffect.statusCondition === 'paralysis') {
              const defSpeed = Number(constants?.getEffectiveStat ? constants.getEffectiveStat(defender, 'speed') : defender.speed) || 1;
              const atkSpeed = Number(constants?.getEffectiveStat ? constants.getEffectiveStat(attacker, 'speed') : attacker.speed) || 1;
              const speedAdvantage = defSpeed > atkSpeed ? 15 : 5;
              const fullParalysisDisruption = 15;
              expectedStatusBenefit = Math.round(expectedStatusChance * (speedAdvantage + fullParalysisDisruption));
            }
          }
        } else if (secEffect.statDrops && typeof secEffect.statDrops === 'object') {
          isEligibleForSecondary = Object.entries(secEffect.statDrops).some(([k, delta]) => {
            const currentStage = (defender.statStages && defender.statStages[k] !== undefined)
              ? Number(defender.statStages[k])
              : 0;
            return delta < 0 ? currentStage > -6 : currentStage < 6;
          });

          if (isEligibleForSecondary && !guaranteedKo) {
            const rawChance = Number(secEffect.chance) || 0;
            expectedStatusChance = (rawChance / 100) * accuracyFactor * actionFactor;

            let totalEffectiveDrop = 0;
            for (const [k, delta] of Object.entries(secEffect.statDrops)) {
              const currentStage = (defender.statStages && defender.statStages[k] !== undefined)
                ? Number(defender.statStages[k])
                : 0;
              if (delta < 0 && currentStage > -6) {
                totalEffectiveDrop += Math.min(Math.abs(delta), currentStage - (-6));
              }
            }
            expectedStatusBenefit = Math.round(expectedStatusChance * totalEffectiveDrop * 15);
          }
        } else if (secEffect.target === 'attacker' && secEffect.statBoosts && typeof secEffect.statBoosts === 'object') {
          isEligibleForSecondary = Object.entries(secEffect.statBoosts).some(([k, delta]) => {
            const currentStage = (attacker.statStages && attacker.statStages[k] !== undefined)
              ? Number(attacker.statStages[k])
              : 0;
            return delta > 0 ? currentStage < 6 : currentStage > -6;
          });

          if (isEligibleForSecondary) {
            const rawChance = Number(secEffect.chance) || 0;
            expectedStatusChance = (rawChance / 100) * accuracyFactor * actionFactor;

            let totalEffectiveBoost = 0;
            for (const [k, delta] of Object.entries(secEffect.statBoosts)) {
              const currentStage = (attacker.statStages && attacker.statStages[k] !== undefined)
                ? Number(attacker.statStages[k])
                : 0;
              if (delta > 0 && currentStage < 6) {
                totalEffectiveBoost += Math.min(delta, 6 - currentStage);
              }
            }
            expectedStatusBenefit = Math.round(expectedStatusChance * totalEffectiveBoost * 8);
          }
        } else if (secEffect.flinch) {
          // Flinch só traz benefício se o atacante puder agir antes do defensor,
          // o alvo ainda não tiver agido neste turno, não for imune e não sofrer nocaute garantido.
          const targetAlreadyActed = Boolean(context.targetAlreadyActed);
          const defPriority = context.defenderMove ? (constants?.getMovePriority?.(context.defenderMove) || 0) : 0;
          const atkSpeed = Number(constants?.getEffectiveStat ? constants.getEffectiveStat(attacker, 'speed') : attacker.speed) || 1;
          const defSpeed = Number(constants?.getEffectiveStat ? constants.getEffectiveStat(defender, 'speed') : defender.speed) || 1;

          let actsBeforeDefender = false;
          if (priority > defPriority) {
            actsBeforeDefender = true;
          } else if (priority === defPriority) {
            actsBeforeDefender = atkSpeed > defSpeed;
          }

          isEligibleForSecondary = !targetAlreadyActed && actsBeforeDefender && !guaranteedKo && defenderHp > 0;

          if (isEligibleForSecondary) {
            const rawChance = Number(secEffect.chance) || 0;
            expectedStatusChance = (rawChance / 100) * accuracyFactor * actionFactor;
            expectedStatusBenefit = Math.round(expectedStatusChance * 20);
          }
        }
      }

      return {
        moveId: move.id,
        moveName: move.name || 'unknown',
        damageClass,
        moveType,
        power,
        accuracy,
        currentPp,
        attackStat,
        defenseStat,
        baseDamage,
        minDamage,
        maxDamage,
        averageDamage,
        stabMultiplier,
        typeMultiplier,
        typeClassification,
        damageIfHit,
        expectedDamage,
        guaranteedKo,
        possibleKo,
        wouldKo,
        priority,
        drainRatio,
        expectedHeal,
        recoilRatio,
        expectedRecoil,
        wouldRecoilKo,
        statBoosts: null,
        selfStatDrops: move.selfStatDrops || (constants?.getSelfStatDrops && constants.getSelfStatDrops(move)) || null,
        secondaryEffect: secEffect ? { ...secEffect } : null,
        statusChance: expectedStatusChance,
        isEligibleForSecondary,
        expectedStatusBenefit
      };
    }

    /**
     * Avalia o confronto global (matchup) de um combatente (ativo ou reserva) contra o oponente ativo.
     * Retorna a capacidade ofensiva do candidato e a maior ameaça defensiva do oponente.
     * 
     * @param {Object} candidate - Combatente a avaliar.
     * @param {Object} opponent - Combatente oponente ativo.
     * @returns {Object} Avaliação estruturada do confronto.
     */
    function evaluateMatchup(candidate, opponent) {
      if (!candidate || typeof candidate !== 'object') {
        throw new Error('Candidato inválido fornecido para evaluateMatchup.');
      }
      if (!opponent || typeof opponent !== 'object') {
        throw new Error('Oponente inválido fornecido para evaluateMatchup.');
      }

      const candidateHp = Number(candidate.currentHp) || 0;
      const candidateMaxHp = Number(candidate.maxHp) || 1;
      const isFainted = candidateHp === 0;

      if (isFainted) {
        return {
          candidateId: candidate.id,
          candidateName: candidate.name,
          currentHp: 0,
          maxHp: candidateMaxHp,
          hpRatio: 0,
          isFainted: true,
          bestMove: null,
          bestExpectedDamage: 0,
          bestTypeMultiplier: 0,
          opponentBestExpectedDamage: 0,
          opponentWouldKo: false,
          offensivePressure: 0,
          defensiveRisk: 999
        };
      }

      // 1. Avalia melhor golpe utilizável do candidato contra o oponente
      const candidateMoves = Array.isArray(candidate.moves) ? candidate.moves : [];
      const usableMoves = candidateMoves.filter(m => (m.currentPp === undefined || m.currentPp > 0) && m.damageClass !== 'status');

      let bestCandidateMove = null;
      let bestExpectedDamage = 0;
      let bestTypeMultiplier = 0;

      for (const m of usableMoves) {
        const evalResult = evaluateMove(candidate, opponent, m);
        if (evalResult.typeMultiplier > bestTypeMultiplier) {
          bestTypeMultiplier = evalResult.typeMultiplier;
        }
        if (!bestCandidateMove || evalResult.expectedDamage > bestExpectedDamage) {
          bestCandidateMove = evalResult;
          bestExpectedDamage = evalResult.expectedDamage;
        } else if (evalResult.expectedDamage === bestExpectedDamage && evalResult.damageIfHit > (bestCandidateMove.damageIfHit || 0)) {
          bestCandidateMove = evalResult;
        }
      }

      // 2. Avalia a maior ameaça ofensiva que o oponente representa contra o candidato
      const opponentMoves = Array.isArray(opponent.moves) ? opponent.moves : [];
      const usableOpponentMoves = opponentMoves.filter(m => (m.currentPp === undefined || m.currentPp > 0) && m.damageClass !== 'status');

      let opponentBestExpectedDamage = 0;
      let opponentWouldKo = false;

      for (const om of usableOpponentMoves) {
        const oppEval = evaluateMove(opponent, candidate, om);
        if (oppEval.expectedDamage > opponentBestExpectedDamage) {
          opponentBestExpectedDamage = oppEval.expectedDamage;
        }
        if (oppEval.wouldKo) {
          opponentWouldKo = true;
        }
      }

      const opponentHp = Number(opponent.currentHp) || 1;
      const offensivePressure = bestExpectedDamage / opponentHp;
      const defensiveRisk = candidateHp > 0 ? (opponentBestExpectedDamage / candidateHp) : 999;

      return {
        candidateId: candidate.id,
        candidateName: candidate.name,
        currentHp: candidateHp,
        maxHp: candidateMaxHp,
        hpRatio: candidateHp / candidateMaxHp,
        isFainted: false,
        bestMove: bestCandidateMove,
        bestExpectedDamage,
        bestTypeMultiplier,
        opponentBestExpectedDamage,
        opponentWouldKo,
        offensivePressure,
        defensiveRisk
      };
    }

    return {
      evaluateMove,
      evaluateMatchup
    };
  })();

  // Suporte universal (Node.js & Browser)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BattleEvaluator;
  } else if (typeof window !== 'undefined') {
    window.PBABattle = window.PBABattle || {};
    window.PBABattle.BattleEvaluator = BattleEvaluator;
  }
})();
