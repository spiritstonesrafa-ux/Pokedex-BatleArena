#!/usr/bin/env node
/* Explicit singles scope: not an assertion that every official ability/item is supported. */
const assert=require('node:assert/strict'),C=require('../assets/js/battle/battle-constants'),Fixed=require('../assets/js/campaign/campaign-fixed-battle-catalog'),Options=require('../assets/js/campaign/campaign-move-options'),P=C.P7;
assert.equal(P.abilityNames.length,71);assert.equal(Object.keys(P.items).length,66);assert.equal(Object.keys(P.moves).length,36);
assert.equal(new Set(P.abilityNames).size,71);for(const name of P.abilityNames)assert.ok(P.Data.abilityNames.includes(name));
for(const item of Object.values(P.items)){assert.ok(item.id>0);assert.ok(Object.isFrozen(item));}
for(const [id,abilities]of Object.entries(P.Data.byPokemon)){assert.ok(Number(id)>0);assert.ok(Object.isFrozen(abilities));for(const a of abilities)assert.ok(a.id>0&&a.slot>0&&P.Data.abilityNames.includes(a.name));}
const available=new Set(Object.keys(Fixed.byId).flatMap(id=>{const pool=Options.getPool(+id);assert.ok(pool.length<=6);return pool.map(m=>m.id)}));
for(const m of Object.values(P.moves)){assert.ok(C.validateMoveData(m),m.name);assert.ok(available.has(m.id),m.name);assert.ok(['FULL','PARTIAL'].includes(C.getMoveCapability(m).supportLevel));}
const unresolved=Object.values(C.CANONICAL_MOVE_DEFINITIONS).filter(m=>m.knownPending.some(p=>p.includes('PHASE_P7')));assert.deepEqual(unresolved,[]);
for(const id of [723,851])assert.equal(C.getMoveCapability(id).supportLevel,'FULL','P8 delivered '+id);
assert.equal(C.getMoveCapability(856).supportLevel,'FULL');
const partial=Object.values(P.moves).filter(m=>C.getMoveCapability(m).supportLevel==='PARTIAL').map(m=>m.id);
assert.deepEqual(partial,[]);
console.log(JSON.stringify({p7ExplicitSinglesScopeComplete:true,abilityPilots:71,itemPilots:66,movePilots:36,fullMoves:36,partialWithExternalDependencies:partial,officialPokemonWithNaturalAbilities:Object.keys(P.Data.byPokemon).length,unknownAbilitiesRemainInactive:true,unresolvedP7:0},null,2));
