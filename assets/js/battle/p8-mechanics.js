/* P8 singles: copy mechanics plus the special-mechanics module. No downloaded callbacks are executed. */
(function(){
'use strict';
const Special=typeof module!=='undefined'&&module.exports?require('./p8-special.js'):window.PBAP8Special;
const moves=Object.freeze({...Special.pilotMoves,144:Object.freeze({id:144,name:'transform',type:'normal',power:null,accuracy:null,pp:10,priority:0,damageClass:'status',target:'normal'}),166:Object.freeze({id:166,name:'sketch',type:'normal',power:null,accuracy:null,pp:1,priority:0,damageClass:'status',target:'normal'})});
const copyDefinitions=Object.freeze(Object.fromEntries([144,166].map(id=>moves[id]).map(m=>[m.id,Object.freeze({id:m.id,name:m.name,supportLevel:'FULL',requiredMechanics:Object.freeze([m.id===144?'TRANSFORM':'SKETCH']),knownPending:Object.freeze([]),blockedReason:null,priority:0})])));
const definitions=Object.freeze({...Special.specialDefinitions,...copyDefinitions});
const statusMoves=Object.freeze(Object.fromEntries(Object.values(moves).filter(m=>m.damageClass==='status').map(m=>[m.name,m])));
const noSketch=Object.freeze([165,166,464,621,723,863,896,897,898,899,900,906]);
const copy=x=>Array.isArray(x)?x.map(copy):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).map(([k,v])=>[k,copy(v)])):x;
const stats=['attack','defense','specialAttack','specialDefense','speed'];
const savedKeys=[...stats,'types','ability','baseStats','weightKg','photo','animatedPhoto','cry'];
const get=(s,r)=>s[r]?.team?s[r].team[s[r].activeIndex||0]:s[r];
function canonical(C,id){return C.KNOWN_CATALOG_MOVES[Number(id)]||Object.values(C.SUPPORTED_STATUS_MOVES).find(m=>m.id===Number(id))||null;}
function canSketch(C,id){const m=canonical(C,id);return Boolean(m&&!noSketch.includes(m.id)&&C.validateMoveData(m)&&C.getMoveCapability(m)?.supportLevel!=='BLOCKED');}
function canTransform(a,d){return Boolean(a&&d&&a.currentHp>0&&d.currentHp>0&&!a.transformOriginal&&!d.transformOriginal&&!a.illusion&&!d.illusion&&!d.substitute&&d.id!==10190&&a.tera!=='stellar'&&!([1024,10276,10277,1017,10273,10274,10275].includes(Special.species(d))&&(a.tera||d.tera)));}
function fail(events,r,a,id,reason){events.push({type:'MOVE_FAILED',actor:r,pokemonName:a.name,moveId:id,moveName:moves[id].name,reason});}
function action(s,r,m,C,events){if(![144,166].includes(m.id))return false;const a=get(s,r),d=get(s,r==='player'?'enemy':'player');
 if(m.id===144){
  if(!canTransform(a,d)){fail(events,r,a,m.id,'TRANSFORM_INELIGIBLE');return true;}
  a.transformOriginal=Object.fromEntries([...savedKeys,'moves'].map(k=>[k,copy(a[k])]));
  for(const k of savedKeys)if(k!=='ability'||!['hunger-switch','tera-shift','embody-aspect'].includes(d.ability))a[k]=copy(d[k]);
  a.transformedSpeciesId=d.transformedSpeciesId||d.id;a.transformedName=d.name;
  a.moves=d.moves.map(n=>({...copy(n),currentPp:Math.min(5,n.pp),maxPp:Math.min(5,n.pp)}));
  a.statStages=copy(d.statStages);a.accuracyStage=d.accuracyStage;a.evasionStage=d.evasionStage;
  if(a.tera){a.teraOriginalTypes=copy(d.types);if(a.tera!=='stellar')a.types=[a.tera];}
  C.P6.feedback(events,r,a,'TRANSFORMED',{label:d.name});C.P7.enter(s,r,C,events);return true;
 }
 const id=d.lastUsedMoveId,slot=a.moves.findIndex(n=>n.id===166);
 if(a.transformOriginal||slot<0||!canSketch(C,id)||a.moves.some(n=>n.id===id)){fail(events,r,a,m.id,'SKETCH_INELIGIBLE');return true;}
 const learned=copy(canonical(C,id));a.moves[slot]={...learned,currentPp:learned.pp,maxPp:learned.pp};
 if(a.id===235){s.sketchChanges||=[];s.sketchChanges=s.sketchChanges.filter(n=>n.pokemonId!==a.id||n.role!==r);s.sketchChanges.push({role:r,pokemonId:a.id,moveId:id});}
 C.P6.feedback(events,r,a,'SKETCHED',{label:learned.name});return true;
}
function remember(a,events,role){const used=events.filter(e=>e.type==='MOVE_USED'&&e.actor===role).at(-1)||events.find(e=>e.type==='PP_CHANGED'&&e.actor===role);if(used)a.lastUsedMoveId=used.moveId;}
function restore(m,ending=false){Special.endDynamax(m);if(m.transformOriginal){for(const k of [...savedKeys,'moves']){if(m.transformOriginal[k]===undefined)delete m[k];else m[k]=copy(m.transformOriginal[k]);}delete m.transformOriginal;delete m.transformedSpeciesId;delete m.transformedName;}Special.leave(m,ending);m.lastUsedMoveId=null;}
function mustStruggle(m){return Boolean(m.transformOriginal||m.dynamax||m.id===132||m.id===235)&&m.moves.length>0&&m.moves.every(n=>n.currentPp<=0)&&!m.twoTurnMove&&!m.lockedMove&&!m.rechargeMoveId&&!m.bideState;}
const api=Object.freeze({...Special,mustStruggle,moves,definitions,statusMoves,noSketch,canonical,canSketch,canTransform,action,remember,restore});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else window.PBAP8Mechanics=api;
})();
