#!/usr/bin/env node
/* Closure gate for the explicit P6 singles pilots, not every move in the PokeAPI. */
const assert=require('node:assert/strict'),C=require('../assets/js/battle/battle-constants'),F=require('../assets/js/campaign/campaign-fixed-battle-catalog'),Options=require('../assets/js/campaign/campaign-move-options');
const pilots=[...new Set([...Object.keys(C.P6.moves),...Object.keys(C.RECHARGE_MOVES),...Object.keys(C.PROTECT_MOVES),...Object.keys(C.TWO_TURN_MOVES)].map(Number))].sort((a,b)=>a-b);
const unresolved=Object.values(C.CANONICAL_MOVE_DEFINITIONS).filter(m=>m.knownPending.some(p=>p.includes('PHASE_P6')));assert.deepEqual(unresolved,[],'Essential P6 dependency remains');
const available=new Set(Object.keys(F.byId).flatMap(id=>Options.getPool(+id).map(m=>m.id)));let full=0,partial=0,blocked=0;
for(const id of pilots){const m=C.KNOWN_CATALOG_MOVES[id],cap=C.getMoveCapability(id);assert.ok(m&&cap,'Missing pilot '+id);assert.ok(C.validateMoveData(m),'Invalid pilot '+id);assert.ok(available.has(id),'Pilot absent from campaign '+id);assert.ok(['FULL','PARTIAL'].includes(cap.supportLevel));assert.ok(cap.knownPending.every(p=>!p.includes('PHASE_P6')));if(cap.supportLevel==='FULL')full++;else{assert.ok(cap.knownPending.length);partial++;}}
assert.ok(C.P6.binding.length===7&&C.P6.pivot.length===6&&C.P6.rampage.length===4);
for(const id of Object.keys(F.byId)){const pool=Options.getPool(+id);assert.ok(pool.length>=1&&pool.length<=6);assert.equal(new Set(pool.map(m=>m.id)).size,pool.length);}
console.log(JSON.stringify({p6CoreComplete:true,pilots:pilots.length,full,partialWithOtherPhaseDependencies:partial,blockedByWeatherP7:blocked,unresolvedP6:0,knownMoves:Object.keys(C.KNOWN_CATALOG_MOVES).length,battleReadySpecies:Object.keys(F.byId).length},null,2));
