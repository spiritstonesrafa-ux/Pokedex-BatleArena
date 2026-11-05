/* Modern singles critical hits. RNG stays outside the engine. */
(function(){'use strict';
const highCriticalIds=Object.freeze([2,13,143,152,163,238,299,314,400,421,444,460,529]);
const guaranteedCritMoveIds=Object.freeze([480,524,817,818,870]);
function promote(definitions){return Object.fromEntries(highCriticalIds.map(id=>{const m=definitions[id];if(!m)throw Error('Missing critical pilot '+id);const pending=m.knownPending.filter(p=>p!=='HIGH_CRITICAL_PHASE_P1');return [id,Object.freeze({...m,supportLevel:pending.length?'PARTIAL':'FULL',requiredMechanics:Object.freeze([...new Set([...m.requiredMechanics,'HIGH_CRITICAL'])]),knownPending:Object.freeze(pending),blockedReason:null})];}));}
function eligible(move,C){return Boolean(move&&move.damageClass!=='status'&&!C.P5.fixed(move)&&!C.isLevelDamageMove(move)&&!C.isConstantDamageMove(move)&&!C.isFractionalDamageMove(move));}
function isCriticalBlocked(defender,attacker,move,C){
  if(!defender)return false;
  const defAb=C?.P7?.defenderAbility?C.P7.defenderAbility(attacker,defender,move):(C?.P7?.ability?C.P7.ability(defender):defender.ability);
  return ['battle-armor','shell-armor'].includes(defAb);
}
function multiplier(attacker,move,C){
  if(!attacker)return 1.5;
  const atkAb=C?.P7?.ability?C.P7.ability(attacker):attacker.ability;
  return atkAb==='sniper'?2.25:1.5;
}
function chance(move,C,attacker=null,defender=null){
  if(!eligible(move,C))return 0;
  if(defender&&isCriticalBlocked(defender,attacker,move,C))return 0;
  if(C.getMultiHitMove(move)?.critical||guaranteedCritMoveIds.includes(Number(move?.id)))return 1;
  const atkAb=attacker?(C?.P7?.ability?C.P7.ability(attacker):attacker.ability):'';
  if(atkAb==='merciless'&&defender&&['poison','toxic'].includes(defender.statusCondition))return 1;
  let stage=0;
  if(highCriticalIds.includes(Number(move?.id))&&!move?.p8Max&&!move?.p8Z)stage+=1;
  if(atkAb==='super-luck')stage+=1;
  if(attacker&&['scope-lens','razor-claw'].includes(attacker.item))stage+=1;
  if(attacker?.focusEnergy)stage+=2;
  if(stage<=0)return 1/24;
  if(stage===1)return 1/8;
  if(stage===2)return 1/2;
  return 1;
}
function roll(value=24){if(!Number.isInteger(value)||value<1||value>24)throw Error('Rolagem de crítico inválida: use inteiro entre 1 e 24.');return value;}
function resolve(move,value,C,attacker=null,defender=null){
  if(!eligible(move,C))return false;
  if(defender&&isCriticalBlocked(defender,attacker,move,C))return false;
  return roll(value)<=Math.round(chance(move,C,attacker,defender)*24);
}
function stats(a,d,move,C){d=C.Completion.defender(move,d);const physical=move.damageClass==='physical',atkKey=physical?(C.usesDefenseAsAttack(move)?'defense':'attack'):'specialAttack',defKey=physical||C.targetsDefenseWithSpAtk(move)?'defense':'specialDefense';const attacker={...a,statStages:{...a.statStages,[atkKey]:Math.max(0,a.statStages?.[atkKey]||0)}},defender={...d,statStages:{...d.statStages,[defKey]:Math.min(0,d.statStages?.[defKey]||0)}};return {attack:C.getEffectiveStat(attacker,atkKey,move,d),defense:C.getEffectiveStat(defender,defKey,move,a)};}
const api=Object.freeze({highCriticalIds,guaranteedCritMoveIds,promote,eligible,isCriticalBlocked,multiplier,chance,roll,resolve,stats});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PBACriticalMechanics=api;
})();
