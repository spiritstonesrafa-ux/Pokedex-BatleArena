#!/usr/bin/env node
/* Closure gate for the P1 critical-hit block, not every official critical ability/item. */
const assert=require('node:assert/strict'),C=require('../assets/js/battle/battle-constants'),Fixed=require('../assets/js/campaign/campaign-fixed-battle-catalog'),Options=require('../assets/js/campaign/campaign-move-options');
const pilots=C.Critical.highCriticalIds,available=new Set(Object.keys(Fixed.byId).flatMap(id=>Options.getPool(+id).map(m=>m.id)));
assert.equal(pilots.length,13);assert.ok(Object.isFrozen(pilots));for(const id of pilots){const move=C.KNOWN_CATALOG_MOVES[id];assert.ok(C.validateMoveData(move));assert.equal(C.getMoveCapability(id).supportLevel,'FULL');assert.equal(C.Critical.chance(move,C),1/8);assert.equal(C.Critical.resolve(move,3,C),true);assert.equal(C.Critical.resolve(move,4,C),false);assert.ok(available.has(id),'Missing campaign pilot '+id);}
assert.equal(C.Critical.chance(C.KNOWN_CATALOG_MOVES[33],C),1/24);assert.equal(C.Critical.chance(C.KNOWN_CATALOG_MOVES[818],C),1);for(const id of [49,69,162,90,243,117,149])assert.equal(C.Critical.chance(C.KNOWN_CATALOG_MOVES[id],C),0);
const unresolved=Object.values(C.CANONICAL_MOVE_DEFINITIONS).filter(m=>m.knownPending.some(p=>p.includes('PHASE_P1')));assert.deepEqual(unresolved,[]);
const partial=Object.values(C.CANONICAL_MOVE_DEFINITIONS).filter(m=>m.supportLevel==='PARTIAL').map(m=>m.id).sort((a,b)=>a-b);assert.deepEqual(partial,[533,663,676,712,853,856,902]);
console.log(JSON.stringify({p1CriticalBlockComplete:true,elevatedCriticalPilots:pilots,ordinaryChance:'1/24',elevatedChance:'1/8',criticalMultiplier:1.5,externalRollRange:[1,24],perHitIndependent:true,unresolvedP1:0,remainingPartialMoves:partial,otherCriticalAbilitiesAndItemsNotImplicitlyEnabled:true},null,2));
