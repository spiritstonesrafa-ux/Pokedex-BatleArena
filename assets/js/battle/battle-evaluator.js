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

      // Preview activation on a private state: never spend the live team's budget or mutate its forms.
      if(context.special && context.battleState && constants.P8.canActivate(context.battleState,context.attackerSide,context.special) && (context.special!=='z'||move.id===722)) {
        const preview=JSON.parse(JSON.stringify(context.battleState)),role=context.attackerSide;
        constants.P8.prepare(preview,role,{type:'MOVE',moveId:move.id,special:context.special},constants,[]);
        const active=preview[role]?.team?preview[role].team[preview[role].activeIndex||0]:preview[role];
        return evaluateMove(active,defender,move,{...context,battleState:preview,special:null});
      }
      if(attacker.rechargeMoveId)return {moveId:move.id,moveName:move.name,currentPp:move.currentPp,expectedDamage:0,damageIfHit:0,minDamage:0,maxDamage:0,averageDamage:0,guaranteedKo:false,possibleKo:false,wouldKo:false,expectedStatusBenefit:0,statusChance:0,isEligibleForSecondary:false,priority:0,recharging:true,requiresRecharge:false};

      attacker={...attacker};defender={...defender,abilityIgnored:constants.P7.ignored(attacker,defender,move)};
      if(attacker.dynamax||attacker.zMovePending)move=constants.P8.activeMove(attacker,move,constants);
      if([144,166].includes(move.id)){const eligible=move.id===144?constants.P8.canTransform(attacker,defender):!attacker.transformOriginal&&constants.P8.canSketch(constants,defender.lastUsedMoveId)&&!attacker.moves.some(m=>m.id===defender.lastUsedMoveId);const unable=attacker.statusCondition==='sleep'&&attacker.sleepTurns>0||attacker.statusCondition==='freeze';const benefit=unable?0:eligible?40:move.id===166&&!attacker.transformOriginal&&!defender.lastUsedMoveId?10:0;return {moveId:move.id,moveName:move.name,damageClass:'status',currentPp:move.currentPp,expectedDamage:0,minDamage:0,maxDamage:0,damageIfHit:0,guaranteedKo:false,possibleKo:false,wouldKo:false,expectedStatusBenefit:benefit,statusChance:eligible?1:0,priority:0};}
      if(constants.P6.statusMoves[move.name]||constants.P7.statusMoves[move.name]){
        const own=context.battleState?.p6Sides?.[context.attackerSide]||{},foe=context.battleState?.p6Sides?.[context.attackerSide==='enemy'?'player':'enemy']||{};
        const id=move.id,shield=constants.P6.screens[id],hazard=constants.P6.hazards[id];let benefit=0;
        if(shield)benefit=own[shield]?0:35;
        if(constants.P7.weatherMoves[id])benefit=context.battleState?.weather?.id===constants.P7.weatherMoves[id]?0:25;
        if(constants.P7.terrainMoves[id])benefit=context.battleState?.terrain?.id===constants.P7.terrainMoves[id]?0:25;
        if(id===694)benefit=attacker.envWeather==='snow'&&!own.auroraVeil?40:0;
        if(id===881)benefit=20;
        if(hazard)benefit=(foe[hazard]||0)>=(id===191?3:id===390?2:1)?0:35;
        if(id===73)benefit=defender.leechSeed||defender.types.includes('grass')?0:Math.floor(defender.maxHp/8);
        if([169,212,335].includes(id))benefit=defender.trapped||defender.types.includes('ghost')?0:15;
        if(id===107)benefit=(attacker.evasionStage||0)>=6?0:25;
        if(id===432)benefit=Object.values(constants.P6.hazards).some(k=>own[k]||foe[k])?60:10;
        if([100,226,575].includes(id))benefit=(context.attackerTeam||[]).some(m=>m.id!==attacker.id&&m.currentHp>0)?20:0;
        if(move.target!=='self'&&move.target!=='foeSide'&&(defender.isProtected||defender.twoTurnMove?.state))benefit=0;
        const factor=move.accuracy===null?1:constants.getEffectiveAccuracy(move,attacker,defender)/100;
        if(attacker.statusCondition==='sleep'&&attacker.sleepTurns>0||attacker.statusCondition==='freeze')benefit=0;
        return {moveId:id,moveName:move.name,damageClass:'status',power:null,accuracy:move.accuracy,currentPp:move.currentPp,priority:constants.getMovePriority(move),expectedDamage:0,damageIfHit:0,minDamage:0,maxDamage:0,guaranteedKo:false,possibleKo:false,wouldKo:false,expectedStatusBenefit:Math.round(benefit*factor),statusChance:factor};
      }
      if (constants.isProtectMove(move)) {
        const consecutive = Math.max(0, Number.isInteger(attacker.stallCount) ? attacker.stallCount : 0);
        const denominator = Math.min(729, Math.pow(3, consecutive));
        const successChance = 1 / denominator;
        let expectedStatusBenefit = 0;
        if (defender.currentHp > 0 && !defender.rechargeMoveId) {
          const oppMoves = Array.isArray(defender.moves) ? defender.moves.filter(m => (m.currentPp === undefined || m.currentPp > 0) && m.damageClass !== 'status') : [];
          let maxThreat = 0;
          for (const om of oppMoves) {
            const pwr = om.power || 50;
            if (pwr > maxThreat) maxThreat = pwr;
          }
          expectedStatusBenefit = Math.round(maxThreat * successChance);
        }
        return {
          moveId: move.id,
          moveName: move.name || 'protect',
          damageClass: 'status',
          moveType: move.type || 'normal',
          power: null,
          accuracy: null,
          currentPp: move.currentPp,
          attackStat: 0,
          defenseStat: 0,
          baseDamage: 0,
          minDamage: 0,
          maxDamage: 0,
          averageDamage: 0,
          stabMultiplier: 1,
          typeMultiplier: 1,
          typeClassification: 'NEUTRAL',
          damageIfHit: 0,
          entryRestricted: false,
          requiresRecharge: false,
          expectedDamage: 0,
          guaranteedKo: false,
          possibleKo: false,
          wouldKo: false,
          priority: 4,
          drainRatio: 0,
          expectedHeal: 0,
          recoilRatio: 0,
          expectedRecoil: 0,
          wouldRecoilKo: false,
          statBoosts: null,
          expectedStatusBenefit,
          statusChance: successChance,
          successChance,
          isEligibleForSecondary: false
        };
      }
      const planning = Boolean(context.planningTurn);
      if (planning) {
        attacker={...attacker,actedThisTurn:false,damagedThisTurn:false,lastDirectHit:null};
        defender={...defender,actedThisTurn:false,damagedThisTurn:false,lastDirectHit:null};
        const other=defender.twoTurnMove ? (defender.moves||[]).find(m=>m.id===defender.twoTurnMove.id) : (defender.moves||[]).find(m=>m.currentPp!==0);
        const speed=m=>Math.max(1,Math.floor(constants.getEffectiveStat(m,'speed')/(m.statusCondition==='paralysis'?2:1)));
        if(other && (constants.getMovePriority(other)>constants.getMovePriority(move) || (constants.getMovePriority(other)===constants.getMovePriority(move)&&(speed(defender)>speed(attacker)||(speed(defender)===speed(attacker)&&context.attackerSide==='enemy'))))) defender.actedThisTurn=true;
        if(defender.twoTurnMove && defender.actedThisTurn)defender.twoTurnMove=null;
        if(move.id===704 && defender.actedThisTurn && other?.damageClass==='physical')attacker.shellTrapTriggered=true;
        if((constants.P5.counterIds.includes(Number(move.id)) && defender.actedThisTurn) || move.id===117){
          const possible=(defender.moves||[]).filter(m=>m.currentPp!==0&&m.damageClass!=='status'&&!constants.P5.counterIds.includes(m.id)&&(move.id!==68||m.damageClass==='physical')&&(move.id!==243||m.damageClass==='special'));
          const previews=possible.map(m=>({move:m,data:evaluateMove(defender,attacker,m,{...context,planningTurn:false,attackerSide:context.attackerSide==='enemy'?'player':'enemy'})})).sort((a,b)=>b.data.expectedDamage-a.data.expectedDamage);
          const preview=previews[0];
          if(move.id===117 && preview)attacker.bideState={damage:Math.floor(preview.data.expectedDamage*2)};
          if(preview&&preview.data.expectedDamage>0&&preview.data.maxDamage<attacker.currentHp)attacker.lastDirectHit={turn:context.turn,sourceId:defender.id,damage:Math.floor(preview.data.expectedDamage),damageClass:preview.data.damageClass};
        }
      }
      if(move.id===712&&!defender.isProtected&&!defender.twoTurnMove?.state&&constants.P8.effectiveness('ghost',defender,TypeEffectiveness,attacker,move,constants).multiplier>0){attacker={...attacker,statStages:{...attacker.statStages}};defender={...defender,statStages:{...defender.statStages}};constants.Completion.steal(attacker,defender,constants,[],context.attackerSide||'player',context.attackerSide==='enemy'?'player':'enemy');}
      defender=constants.Completion.defender(move,defender);
      const p5 = constants.P5.get(move);
      const damageClass = constants.P8.damageClass(attacker,move,constants);
      const moveType = constants.P8.moveType(attacker,move,constants.P7.moveType(context.battleState,attacker,move,constants.P5.type(move,attacker))) || 'normal';
      let power = p5 ? constants.P5.power(move,attacker,defender,constants,{...context,faintCount:context.faintCount??context.attackerTeam?.filter(m=>m.currentHp<=0).length??0}) : Number(move.power) || 0;
      power=constants.P7.power(context.battleState,attacker,defender,{...move,type:moveType},power,constants);
      power=constants.P8.power(attacker,defender,{...move,type:moveType},power,constants);
      const accuracy = constants.getEffectiveAccuracy ? constants.getEffectiveAccuracy(move,attacker,defender) : move.accuracy;
      const currentPp = Number.isInteger(move.currentPp) ? move.currentPp : (move.pp || 0);
      const isLevelDamage = Boolean(constants?.isLevelDamageMove?.(move));
      const isConstantDamage = Boolean(constants?.isConstantDamageMove?.(move));
      const isFractionalDamage = Boolean(constants?.isFractionalDamageMove?.(move));
      const isP5Fixed = Boolean(p5 && constants.P5.fixed(move));
      const isFixedDamage = isLevelDamage || isConstantDamage || isFractionalDamage || isP5Fixed;

      // Golpes de status não causam dano na arquitetura atual
      if ((damageClass === 'status' || power <= 0) && !isFixedDamage) {
        const statBoosts = move.statBoosts || (constants?.getStatBoosts && constants.getStatBoosts(move)) || null;
        let expectedStatusBenefit = 0;
        let statusChance = 0;
        let isEligible = false;

        if (move.statusEffect) {
          if (move.statusEffect === 'confusion') {
            const immune = constants?.isStatusMoveImmune ? constants.isStatusMoveImmune(move, defender.types) : false;
            isEligible = !immune && !(defender.confusionTurns > 0) && (Number(defender.currentHp) || 0) > 0;
            if (isEligible) {
              let accuracyFactor = 1.0;
              if (accuracy !== null && accuracy !== 'ALWAYS_HIT' && accuracy !== undefined) {
                const accNum = Number(accuracy);
                if (Number.isFinite(accNum)) {
                  accuracyFactor = Math.max(0, Math.min(100, accNum)) / 100;
                }
              }
              const isSelfThaw = Boolean(constants?.isSelfThawingMove && constants.isSelfThawingMove(move));
              let actionFactor = attacker.statusCondition === 'paralysis'
                ? 0.75
                : (attacker.statusCondition === 'freeze' ? (isSelfThaw ? 1.0 : 0.20) : 1);
              if (attacker.confusionTurns > 1) actionFactor *= 0.67;
      if(attacker.statusCondition==='sleep'&&attacker.sleepTurns>0&&![173,214].includes(move.id)) actionFactor=0;
              statusChance = accuracyFactor * actionFactor;
              expectedStatusBenefit = Math.round(statusChance * 20);
            }
          } else {
            const immune = constants?.isStatusMoveImmune ? constants.isStatusMoveImmune(move, defender.types) : false;
            isEligible = !immune && !defender.statusCondition && (Number(defender.currentHp) || 0) > 0;
            if (isEligible) {
              let accuracyFactor = 1.0;
              if (accuracy !== null && accuracy !== 'ALWAYS_HIT' && accuracy !== undefined) {
                const accNum = Number(accuracy);
                if (Number.isFinite(accNum)) {
                  accuracyFactor = Math.max(0, Math.min(100, accNum)) / 100;
                }
              }
              const isSelfThaw = Boolean(constants?.isSelfThawingMove && constants.isSelfThawingMove(move));
              let actionFactor = attacker.statusCondition === 'paralysis'
                ? 0.75
                : (attacker.statusCondition === 'freeze' ? (isSelfThaw ? 1.0 : 0.20) : 1);
              if (attacker.confusionTurns > 1) actionFactor *= 0.67;
      if(attacker.statusCondition==='sleep'&&attacker.sleepTurns>0&&![173,214].includes(move.id)) actionFactor=0;
              statusChance = accuracyFactor * actionFactor;
              if (move.statusEffect === 'sleep') {
                expectedStatusBenefit = Math.round(statusChance * 25);
              }
              if (move.statusEffect === 'toxic') {
                const hitChance = attacker.types.includes('poison') ? 1 : accuracyFactor;
                statusChance = hitChance * actionFactor;
                const unit = Math.max(1, Math.floor(Number(defender.maxHp || defender.currentHp) / 16));
                expectedStatusBenefit = Math.round(statusChance * Math.min(defender.currentHp, unit * 6));
              }
            }
          }
        }

        if(move.id===599){isEligible=['poison','toxic'].includes(defender.statusCondition);expectedStatusBenefit=isEligible?30:0;}
        if(move.id===156){isEligible=attacker.currentHp<attacker.maxHp&&attacker.statusCondition!=='sleep';expectedStatusBenefit=isEligible?attacker.maxHp-attacker.currentHp:0;}
        if(move.id===281){isEligible=!defender.statusCondition&&!(defender.drowsyTurns>0);const canAct=attacker.statusCondition==='sleep'&&attacker.sleepTurns>0?0:attacker.statusCondition==='freeze'?0.2:attacker.statusCondition==='paralysis'?0.75:1;expectedStatusBenefit=isEligible?Math.round(30*canAct):0;}
        if(move.id===214){
          isEligible=attacker.statusCondition==='sleep'&&attacker.sleepTurns>0;
          const candidates=(attacker.moves||[]).filter(m=>m.id!==214&&![117,690,704].includes(m.id)&&m.damageClass!=='status'&&constants.getMoveCapability(m)?.supportLevel==='FULL');
          expectedStatusBenefit=isEligible&&candidates.length?Math.round(candidates.reduce((sum,m)=>sum+evaluateMove({...attacker,statusCondition:null,confusionTurns:0},defender,m,context).expectedDamage,0)/candidates.length):0;
        }
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
          statusChance,
          isEligible,
          isEligibleForSecondary: isEligible,
          expectedStatusBenefit
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
      const stabMultiplier = !isFixedDamage?constants.P8.stab(attacker,moveType,constants):1;

      // 3. Efetividade de Tipos (Type Effectiveness)
      const defenderTypes = Array.isArray(defender.types) ? defender.types : [];
      let typeMultiplier;
      let typeClassification;
      if (constants?.isDualTypeEffectiveness?.(move)) {
        const primaryEff = constants.P8.effectiveness('fighting',defender,TypeEffectiveness,attacker,null,constants);
        const secondaryEff = constants.P8.effectiveness('flying',defender,TypeEffectiveness,attacker,null,constants);
        const combinedMultiplier = constants.P8.adjustEffectiveness(primaryEff.multiplier * secondaryEff.multiplier,attacker,defender,move,constants);
        typeMultiplier = BattleModifierResolver && BattleModifierResolver.resolveTypeMultiplier
          ? BattleModifierResolver.resolveTypeMultiplier(combinedMultiplier, context)
          : combinedMultiplier;
        typeClassification = TypeEffectiveness.getClassification(typeMultiplier);
      } else {
        const effectiveness = constants.P8.effectiveness(moveType,defender,TypeEffectiveness,attacker,move,constants);
        typeMultiplier = BattleModifierResolver && BattleModifierResolver.resolveTypeMultiplier
          ? BattleModifierResolver.resolveTypeMultiplier(effectiveness.multiplier, context)
          : effectiveness.multiplier;
        typeClassification = effectiveness.classification;
      }

      if(move.id===117){typeMultiplier=1;typeClassification='NEUTRAL';}
      // 4. Faixa e Média de Dano (PBA-014B: Level 50 e Variância 85..100)
      const simLevel = (constants && constants.BATTLE_CONFIG && constants.BATTLE_CONFIG.SIMULATION_LEVEL) || 50;
      const p5Failure = p5 ? constants.P5.failure(move,attacker,defender,{...context,targetMove:context.targetMove||(defender.moves||[]).find(m=>m.damageClass!=='status')}) : null;
      const entryRestricted = Boolean(constants.P8.failure(attacker,defender,move,constants)) || Boolean(p5Failure) || (Number(move.id) === 252 && move.name === 'fake-out' && Number(attacker.entryMoveAttempts || 0) >= 1) || (move.id===138&&defender.statusCondition!=='sleep') || (move.id===173&&(attacker.statusCondition!=='sleep'||attacker.sleepTurns<=0));
      const multiHit = constants.getMultiHitMove(move);
      const expectedHits = multiHit ? (multiHit.minHits!==multiHit.maxHits ? 3.1 : multiHit.maxHits) : 1;
      let baseDamage;
      let minDamage;
      let maxDamage;
      let averageDamage;
      let damageIfHit;

      if (isP5Fixed) {
        const failure=constants.P5.failure(move,attacker,defender,context);
        const amount = failure || typeMultiplier===0 ? 0 : constants.P5.fixedAmount(move,attacker,defender,{psywaveRoll:100});
        baseDamage=minDamage=maxDamage=averageDamage=damageIfHit=amount;
        if((planning && (constants.P5.counterIds.includes(move.id)||move.id===117)) || (constants.P5.ohko(move) && Number(accuracy)<100))minDamage=0;
        if(move.id===149 && amount>0){minDamage=constants.P5.fixedAmount(move,attacker,defender,{psywaveRoll:50});maxDamage=constants.P5.fixedAmount(move,attacker,defender,{psywaveRoll:150});averageDamage=Array.from({length:101},(_,i)=>constants.P5.fixedAmount(move,attacker,defender,{psywaveRoll:i+50})).reduce((a,b)=>a+b,0)/101;damageIfHit=averageDamage;}
        typeMultiplier=typeMultiplier===0?0:1;typeClassification=typeMultiplier===0?'IMMUNE':'NEUTRAL';
      } else if (isLevelDamage) {
        const attackerLevel = Number(attacker.level) || simLevel;
        if (typeMultiplier === 0) {
          baseDamage = 0;
          minDamage = 0;
          maxDamage = 0;
          averageDamage = 0;
          damageIfHit = 0;
          typeClassification = constants?.TYPE_EFFECTIVENESS_CLASSIFICATION?.IMMUNE || 'IMMUNE';
        } else {
          baseDamage = attackerLevel;
          minDamage = attackerLevel;
          maxDamage = attackerLevel;
          averageDamage = attackerLevel;
          damageIfHit = attackerLevel;
          typeMultiplier = 1;
          typeClassification = constants?.TYPE_EFFECTIVENESS_CLASSIFICATION?.NEUTRAL || 'NEUTRAL';
        }
      } else if (isFractionalDamage) {
        baseDamage = typeMultiplier === 0 ? 0 : constants.getFractionalDamageAmount(Number(defender.currentHp));
        minDamage = maxDamage = averageDamage = damageIfHit = baseDamage;
        typeMultiplier = typeMultiplier === 0 ? 0 : 1;
        typeClassification = typeMultiplier === 0 ? 'IMMUNE' : 'NEUTRAL';
      } else if (isConstantDamage) {
        const constantAmount = constants?.getConstantDamageAmount ? constants.getConstantDamageAmount(move) : (move.id === 49 ? 20 : 40);
        if (typeMultiplier === 0) {
          baseDamage = 0;
          minDamage = 0;
          maxDamage = 0;
          averageDamage = 0;
          damageIfHit = 0;
          typeClassification = constants?.TYPE_EFFECTIVENESS_CLASSIFICATION?.IMMUNE || 'IMMUNE';
        } else {
          baseDamage = constantAmount;
          minDamage = constantAmount;
          maxDamage = constantAmount;
          averageDamage = constantAmount;
          damageIfHit = constantAmount;
          typeMultiplier = 1;
          typeClassification = constants?.TYPE_EFFECTIVENESS_CLASSIFICATION?.NEUTRAL || 'NEUTRAL';
        }
      } else {
        const semiInvulnerableMultiplier = (defender.twoTurnMove?.state && constants.getSemiInvulnerableDamageMultiplier)
          ? constants.getSemiInvulnerableDamageMultiplier(move, defender.twoTurnMove.state)
          : 1;
        const effectivePower = power;
        const range = entryRestricted
          ? { baseDamage: 0, minDamage: 0, maxDamage: 0, averageDamage: 0 }
          : DamageCalculator.calculateDamageRange(attackStat, defenseStat, effectivePower, simLevel, typeMultiplier, stabMultiplier);

        baseDamage = range.baseDamage;
        minDamage = constants.applyBurnPenalty(range.minDamage, attacker, damageClass===move.damageClass?move:{...move,damageClass}) * (multiHit?.minHits || 1);
        maxDamage = constants.applyBurnPenalty(range.maxDamage, attacker, move) * (multiHit?.maxHits || 1);
        averageDamage = constants.applyBurnPenalty(range.averageDamage, attacker, move) * expectedHits;
        minDamage *= semiInvulnerableMultiplier;maxDamage *= semiInvulnerableMultiplier;averageDamage *= semiInvulnerableMultiplier;
        damageIfHit = averageDamage;
      }

      if(multiHit && (multiHit.multiAccuracy || multiHit.critical)){
        const p=Math.min(1,Math.max(0,Number(accuracy)/100));
        let lo=0,hi=0,avg=0;
        for(let i=0;i<multiHit.maxHits;i++){
          const hitPower=multiHit.escalating?power*(i+1):power;
          const critical=Boolean(multiHit.critical);
          const base=DamageCalculator.calculateBaseDamage(critical?constants.Critical.stats(attacker,defender,{...move,damageClass},constants).attack:attackStat,critical?constants.Critical.stats(attacker,defender,{...move,damageClass},constants).defense:defenseStat,hitPower);
          const values=Array.from({length:16},(_,r)=>constants.applyBurnPenalty(DamageCalculator.applyModifier(base*(critical?1.5:1),typeMultiplier,stabMultiplier,r+85),attacker,move));
          if(!multiHit.multiAccuracy||i===0)lo+=values[0];
          hi+=values[15];avg+=values.reduce((a,b)=>a+b,0)/16*(multiHit.multiAccuracy?Math.pow(p,i):1);
        }
        minDamage=lo;maxDamage=hi;averageDamage=damageIfHit=avg;
      }
      // 5. Ponderação por Precisão para obter Dano Esperado (Expected Value)
      let accuracyFactor = 1.0;
      if (accuracy !== null && accuracy !== 'ALWAYS_HIT' && accuracy !== undefined) {
        const accNum = Number(accuracy);
        if (Number.isFinite(accNum)) {
          accuracyFactor = Math.max(0, Math.min(100, accNum)) / 100;
        }
      }

      const isSelfThaw = Boolean(constants?.isSelfThawingMove && constants.isSelfThawingMove(move));
      let actionFactor = attacker.statusCondition === 'paralysis'
        ? 0.75
        : (attacker.statusCondition === 'freeze' ? (isSelfThaw ? 1.0 : 0.20) : 1);
      if (attacker.confusionTurns > 1) actionFactor *= 0.67;
      if(attacker.statusCondition==='sleep'&&attacker.sleepTurns>0&&![173,214].includes(move.id)) actionFactor=0;
      if (entryRestricted || attacker.rechargeMoveId) actionFactor = 0;
      if (defender.isProtected && move.target !== 'self' && move.damageClass !== 'status_self' && ![14, 156, 214, 347, 182, 197].includes(move.id) && !move.p8Max&&!move.p8Z && !constants.isProtectBypassingMove?.(move) && !(constants.P7.ability(attacker)==='unseen-fist'&&constants.P5.contactIds.includes(move.id))) {
        actionFactor = 0;
        baseDamage = minDamage = maxDamage = averageDamage = damageIfHit = 0;
      }
      if(defender.maxGuard&&move.target!=='self'){actionFactor=0;baseDamage=minDamage=maxDamage=averageDamage=damageIfHit=0;}
      if (defender.twoTurnMove?.state && move.target !== 'self' && move.damageClass !== 'status_self') {
        const canHit = constants.canHitSemiInvulnerable?.(move, defender.twoTurnMove.state, attacker);
        if (!canHit) {
          actionFactor = 0;
          baseDamage = minDamage = maxDamage = averageDamage = damageIfHit = 0;
        }
      }
      if(context.battleState && !isFixedDamage){const role=context.attackerSide==='enemy'?'player':'enemy';const f=constants.P6.barrierMultiplier(context.battleState,role,{...move,damageClass},Boolean(multiHit?.critical));minDamage=Math.floor(minDamage*f);maxDamage=Math.floor(maxDamage*f);averageDamage*=f;damageIfHit=averageDamage;}
      if(!isFixedDamage){const f=constants.P7.damageMultiplier(context.battleState,attacker,defender,{...move,type:moveType},typeMultiplier);minDamage=Math.floor(minDamage*f);maxDamage=Math.floor(maxDamage*f);averageDamage*=f;damageIfHit=averageDamage;}
      if(!isFixedDamage){const f=constants.P8.finalMultiplier(attacker,defender,move);minDamage=Math.floor(minDamage*f);maxDamage=Math.floor(maxDamage*f);averageDamage*=f;damageIfHit=averageDamage;}
      const ab=constants.P7.defenderAbility(attacker,defender,move),absorbs={'water-absorb':'water','volt-absorb':'electric','flash-fire':'fire','sap-sipper':'grass','lightning-rod':'electric','storm-drain':'water'};
      if(absorbs[ab]===moveType||ab==='levitate'&&moveType==='ground'||ab==='sturdy'&&constants.P5.ohko(move)||defender.envTerrain==='psychic'&&constants.P7.grounded(defender)&&constants.P7.priority(attacker,move,constants)>0){minDamage=maxDamage=averageDamage=damageIfHit=0;}
      if(!multiHit&&defender.currentHp===defender.maxHp&&(ab==='sturdy'||defender.item==='focus-sash')){minDamage=Math.min(minDamage,defender.currentHp-1);maxDamage=Math.min(maxDamage,defender.currentHp-1);averageDamage=Math.min(averageDamage,defender.currentHp-1);damageIfHit=averageDamage;}
      if(defender.minimized&&constants.P6.minimizeHits.includes(move.id)){minDamage*=2;maxDamage*=2;averageDamage*=2;damageIfHit=averageDamage;accuracyFactor=1;}
      if(constants.P6.consecutive.includes(move.id)&&attacker.lastP6Move===move.id){actionFactor=0;minDamage=maxDamage=averageDamage=damageIfHit=0;}
      // Keep ordinary minimum damage for guaranteed KOs; rare criticals only raise the possible maximum/mean.
      const criticalMove={...move,type:moveType,damageClass};
      const criticalChance=constants.Critical.chance(criticalMove,constants);
      let criticalMaxDamage=0;
      if(criticalChance>0&&criticalChance<1&&!entryRestricted&&typeMultiplier>0&&actionFactor>0&&averageDamage>0){
        const cs=constants.Critical.stats(attacker,defender,criticalMove,constants),n=multiHit?.maxHits||1;
        let critAverage=0;
        for(let i=0;i<n;i++){
          const d=i>0?{...defender,currentHp:Math.max(1,defender.currentHp-1)}:defender;
          const rawEff=i>0?constants.P8.effectiveness(moveType,d,TypeEffectiveness,attacker,criticalMove,constants).multiplier:typeMultiplier;
          const eff=i>0&&BattleModifierResolver?.resolveTypeMultiplier?BattleModifierResolver.resolveTypeMultiplier(rawEff,context):rawEff;
          const hitPower=multiHit?.escalating?power*(i+1):power,base=DamageCalculator.calculateBaseDamage(cs.attack,cs.defense,hitPower);
          const values=Array.from({length:16},(_,j)=>{
            let amount=constants.applyBurnPenalty(DamageCalculator.applyModifier(base*1.5,eff,stabMultiplier,j+85),attacker,criticalMove);
            if(defender.twoTurnMove?.state)amount*=constants.getSemiInvulnerableDamageMultiplier(move,defender.twoTurnMove.state);
            amount=Math.max(eff===0?0:1,Math.floor(amount*constants.P7.damageMultiplier(context.battleState,attacker,d,criticalMove,eff)));
            amount=Math.max(eff===0?0:1,Math.floor(amount*constants.P8.finalMultiplier(attacker,d,criticalMove)));
            if(defender.minimized&&constants.P6.minimizeHits.includes(move.id))amount*=2;
            return amount;
          });
          criticalMaxDamage+=values[15];
          critAverage+=values.reduce((a,b)=>a+b,0)/16*(multiHit?.multiAccuracy?Math.pow(accuracyFactor,i):1);
        }
        if(multiHit&&multiHit.minHits!==multiHit.maxHits)critAverage*=expectedHits/n;
        if(!multiHit&&defender.currentHp===defender.maxHp&&(ab==='sturdy'||defender.item==='focus-sash')){criticalMaxDamage=Math.min(criticalMaxDamage,defender.currentHp-1);critAverage=Math.min(critAverage,defender.currentHp-1);}
        maxDamage=Math.max(maxDamage,criticalMaxDamage);
        averageDamage=damageIfHit=averageDamage*(1-criticalChance)+critAverage*criticalChance;
      }else if(criticalChance===1)criticalMaxDamage=maxDamage;
      const isTwoTurn = Boolean(constants?.isTwoTurnMove?.(move));
      const isTwoTurnCharging = isTwoTurn && !attacker.twoTurnMove && !constants.P7.instantCharge(context.battleState,attacker,move);
      let projectedDamage = averageDamage > 0 ? Math.floor(averageDamage * accuracyFactor * actionFactor) : 0;
      let expectedDamage = projectedDamage;
      if (isTwoTurnCharging) {
        expectedDamage = 0;
      }

      // 6. Semântica refinada de nocaute (KO)
      const defenderHp = Number(defender.currentHp) || 0;
      const guaranteedKo = !(multiHit&&(defender.item?.endsWith('-berry')||ab==='multiscale')) && !isTwoTurnCharging && !attacker.rechargeMoveId && !(planning && (constants.P5.counterIds.includes(move.id)||move.id===117)) && minDamage >= defenderHp && minDamage > 0;
      const possibleKo = !isTwoTurnCharging && !attacker.rechargeMoveId && maxDamage >= defenderHp && maxDamage > 0;
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
      const expectedCrash=move.id===853&&constants.P7.ability(attacker)!=='magic-guard'?Math.min(attacker.currentHp,Math.max(1,Math.floor(constants.P8.baseMaxHp(attacker)/2)))*(typeMultiplier===0||defender.isProtected||defender.twoTurnMove?.state?1:1-accuracyFactor):0;
      const wouldRecoilKo = recoilRatio > 0 && expectedRecoil >= (Number(attacker.currentHp) || 0);
      const priority = constants.P7.priority(attacker,move,constants);

      // 8. Avaliação de Efeito Secundário Canônico (Secondary Effects: P4)
      const secEffect = constants.P7.secondary(context.battleState||{},move,constants.getSecondaryEffect(move));
      let expectedStatusChance = 0;
      let expectedStatusBenefit = 0;
      let isEligibleForSecondary = false;

      if (secEffect?.statusChoices && typeMultiplier>0 && !guaranteedKo) {
        const eligible=secEffect.statusChoices.filter(status=>constants.isEligibleForStatusCondition(defender,status)).length;
        isEligibleForSecondary=eligible>0;expectedStatusChance=secEffect.chance/100*accuracyFactor*actionFactor*eligible/secEffect.statusChoices.length;expectedStatusBenefit=Math.round(expectedStatusChance*25);
      }
      if (secEffect && typeMultiplier > 0) {
        if (secEffect.statusCondition) {
          isEligibleForSecondary = Boolean(
            constants.isEligibleForStatusCondition
              ? constants.isEligibleForStatusCondition(defender, secEffect.statusCondition)
              : (!defender.statusCondition && defenderHp > 0)
          );

          if (isEligibleForSecondary && !guaranteedKo) {
            const rawChance = Number(secEffect.chance) || 0;
            expectedStatusChance = (1 - Math.pow(1 - rawChance / 100, multiHit ? expectedHits : 1)) * accuracyFactor * actionFactor;

            const defMaxHp = Number(defender.maxHp) || defenderHp || 1;
            if (secEffect.statusCondition === 'poison') {
              const tick = Math.max(1, Math.floor(defMaxHp / 8));
              const turnsRemaining = Math.max(1, Math.min(3, Math.ceil(defenderHp / Math.max(1, averageDamage))));
              expectedStatusBenefit = Math.round(expectedStatusChance * (tick * turnsRemaining));
            } else if (secEffect.statusCondition === 'toxic') {
              expectedStatusBenefit=Math.round(expectedStatusChance*Math.min(defenderHp,Math.max(1,Math.floor(defMaxHp/16))*6));
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
            } else if (secEffect.statusCondition === 'freeze') {
              const freezeDisruption = 25;
              expectedStatusBenefit = Math.round(expectedStatusChance * freezeDisruption);
            }
          }
        } else if (secEffect.statDrops && typeof secEffect.statDrops === 'object') {
          isEligibleForSecondary = Object.entries(secEffect.statDrops).some(([k, delta]) => {
            const currentStage = ['accuracy','evasion'].includes(k) ? Number(defender[k+'Stage']||0) : (defender.statStages && defender.statStages[k] !== undefined)
              ? Number(defender.statStages[k])
              : 0;
            return delta < 0 ? currentStage > -6 : currentStage < 6;
          });

          if (isEligibleForSecondary && !guaranteedKo) {
            const rawChance = Number(secEffect.chance) || 0;
            expectedStatusChance = (rawChance / 100) * accuracyFactor * actionFactor;

            let totalEffectiveDrop = 0;
            for (const [k, delta] of Object.entries(secEffect.statDrops)) {
              const currentStage = ['accuracy','evasion'].includes(k) ? Number(defender[k+'Stage']||0) : (defender.statStages && defender.statStages[k] !== undefined)
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
        } else if (secEffect.confusion) {
          isEligibleForSecondary = !(defender.confusionTurns > 0) && !guaranteedKo && defenderHp > 0 && (!secEffect.requiresRaisedStats || context.targetRaisedStatsThisTurn===true);
          if (isEligibleForSecondary) {
            const rawChance = Number(secEffect.chance) || 0;
            expectedStatusChance = (rawChance / 100) * accuracyFactor * actionFactor;
            expectedStatusBenefit = Math.round(expectedStatusChance * 15);
          }
        }
      }

      if(secEffect?.flinchChance&&typeMultiplier>0&&!guaranteedKo&&!context.targetAlreadyActed){
        const opponentPriority=constants.getMovePriority(context.defenderMove||{});
        const before=priority>opponentPriority||(priority===opponentPriority&&constants.getEffectiveStat(attacker,'speed')>constants.getEffectiveStat(defender,'speed'));
        if(before)expectedStatusBenefit+=Math.round(secEffect.flinchChance/100*accuracyFactor*actionFactor*20);
      }
      if(move.id===499&&typeMultiplier>0&&!guaranteedKo){const net=Object.values(defender.statStages||{}).reduce((sum,n)=>sum+Number(n||0),0);expectedStatusBenefit+=Math.round(Math.max(0,net)*8*accuracyFactor*actionFactor);}
      if(move.id===740&&typeMultiplier>0){const team=context.attackerTeam||[attacker];expectedStatusBenefit+=Math.round(team.filter(mon=>mon.statusCondition).length*15*accuracyFactor*actionFactor);}
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
        criticalChance,
        criticalMaxDamage,
        minDamage,
        maxDamage,
        averageDamage,
        stabMultiplier,
        typeMultiplier,
        typeClassification,
        damageIfHit,
        entryRestricted,
        requiresRecharge:constants.isRechargeMove(move),
        isTwoTurnMove: isTwoTurn,
        chargingTurn: isTwoTurnCharging,
        projectedDamage,
        expectedDamage,
        guaranteedKo,
        possibleKo,
        wouldKo,
        priority,
        drainRatio,
        expectedHeal,
        recoilRatio,
        expectedRecoil:expectedRecoil+expectedCrash,
        expectedCrash,
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
