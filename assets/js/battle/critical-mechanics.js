/* Modern singles critical hits. RNG stays outside the engine. */
(function(){'use strict';
const highCriticalIds=Object.freeze([2,13,143,152,163,238,299,314,400,421,444,460,529]);
function promote(definitions){return Object.fromEntries(highCriticalIds.map(id=>{const m=definitions[id];if(!m)throw Error('Missing critical pilot '+id);const pending=m.knownPending.filter(p=>p!=='HIGH_CRITICAL_PHASE_P1');return [id,Object.freeze({...m,supportLevel:pending.length?'PARTIAL':'FULL',requiredMechanics:Object.freeze([...new Set([...m.requiredMechanics,'HIGH_CRITICAL'])]),knownPending:Object.freeze(pending),blockedReason:null})];}));}
function eligible(move,C){return Boolean(move&&move.damageClass!=='status'&&!C.P5.fixed(move)&&!C.isLevelDamageMove(move)&&!C.isConstantDamageMove(move)&&!C.isFractionalDamageMove(move));}
function chance(move,C){if(!eligible(move,C))return 0;if(C.getMultiHitMove(move)?.critical)return 1;return highCriticalIds.includes(Number(move.id))&&!move.p8Max&&!move.p8Z?1/8:1/24;}
function roll(value=24){if(!Number.isInteger(value)||value<1||value>24)throw Error('Rolagem de crítico inválida: use inteiro entre 1 e 24.');return value;}
function resolve(move,value,C){return roll(value)<=chance(move,C)*24;}
function stats(a,d,move,C){d=C.Completion.defender(move,d);const physical=move.damageClass==='physical',atkKey=physical?(C.usesDefenseAsAttack(move)?'defense':'attack'):'specialAttack',defKey=physical||C.targetsDefenseWithSpAtk(move)?'defense':'specialDefense';const attacker={...a,statStages:{...a.statStages,[atkKey]:Math.max(0,a.statStages?.[atkKey]||0)}},defender={...d,statStages:{...d.statStages,[defKey]:Math.min(0,d.statStages?.[defKey]||0)}};return {attack:C.getEffectiveStat(attacker,atkKey),defense:C.getEffectiveStat(defender,defKey)};}
const api=Object.freeze({highCriticalIds,promote,eligible,chance,roll,resolve,stats});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PBACriticalMechanics=api;
})();
