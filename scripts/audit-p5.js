#!/usr/bin/env node
/* Reproducible closure gates for P5's explicit singles catalog. */
const assert=require('node:assert/strict');
const C=require('../assets/js/battle/battle-constants');
const Expanded=require('../assets/js/expanded-pokemon-catalog');
const Fixed=require('../assets/js/campaign/campaign-fixed-battle-catalog');
const Options=require('../assets/js/campaign/campaign-move-options');
const baseline=[24,41,49,69,82,101,162,292,331,333,350,594,717,877];
const pilots=[...new Set([...baseline,...Object.keys(C.P5.moves).map(Number)])].sort((a,b)=>a-b);
assert.equal(pilots.length,60);
const unresolved=Object.values(C.CANONICAL_MOVE_DEFINITIONS).filter(m=>m.knownPending.some(p=>p.includes('PHASE_P5')));
assert.deepEqual(unresolved,[],'An essential P5 dependency remains unresolved');
const available=new Set(Object.keys(Fixed.byId).flatMap(id=>Options.getPool(+id).map(m=>m.id)));
let full=0,partial=0;
for(const id of pilots){
 const move=C.KNOWN_CATALOG_MOVES[id],cap=C.getMoveCapability(id);
 assert.ok(move&&C.validateMoveData(move),'Invalid canonical move '+id);
 assert.ok(['FULL','PARTIAL'].includes(cap.supportLevel),'Blocked P5 pilot '+id);
 assert.ok(cap.knownPending.every(p=>!p.includes('PHASE_P5')));
 assert.ok(available.has(id),'P5 pilot unavailable in campaign '+id);
 if(cap.supportLevel==='FULL')full++;else partial++;
}
const futureDependencies={449:'PHASE_P7',546:'PHASE_P7',677:'PHASE_P6',718:'PHASE_P7',723:'PHASE_P8',851:'PHASE_P8',881:'PHASE_P7'};
for(const [id,phase]of Object.entries(futureDependencies)){
 const cap=C.getMoveCapability(+id);
 assert.notEqual(cap.supportLevel,'FULL','Future mechanics must not be marked delivered');
 assert.ok(cap.knownPending.some(p=>p.includes(phase)),'Missing future dependency '+id);
}
for(const id of [201,202,360,771]){
 assert.equal(Expanded.byId[id].collectionOnly,false);
 const species=Fixed.byId[id];assert.ok(species.campaignLimitedMoves);
 assert.ok(species.moves.length>=1&&species.moves.length<=2);
 assert.ok(species.moves.every(m=>C.validateMoveData(m)));
}
assert.deepEqual(Expanded.entries.filter(p=>p.collectionOnly).map(p=>p.id),[132,235,789,790]);
for(const id of Object.keys(Fixed.byId)){const pool=Options.getPool(+id);assert.ok(pool.length>=1&&pool.length<=6,'Pool size '+id);}
const missingWeightIds=Expanded.entries.filter(mon=>!C.P5.weight(mon)).map(mon=>mon.id);
console.log(JSON.stringify({p5CoreComplete:true,pilots:pilots.length,full,partialWithOtherPhaseDependencies:partial,unresolvedP5:unresolved.length,knownMoves:Object.keys(C.KNOWN_CATALOG_MOVES).length,battleReadySpecies:Object.keys(Fixed.byId).length,collectionOnlySpecies:4,missingWeightIds,futureDependencies},null,2));
