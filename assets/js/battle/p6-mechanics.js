/* P6 rules for the current singles engine. Static PokéAPI metadata; no downloaded code. */
(function(){
const moves=Object.freeze({
327:Object.freeze({id:327,name:'sky-uppercut',type:'fighting',power:85,pp:15,accuracy:90,priority:0,damageClass:'physical',target:'normal'}),
239:Object.freeze({id:239,name:'twister',type:'dragon',power:40,pp:20,accuracy:100,priority:0,damageClass:'special',target:'normal'}),
13:Object.freeze({"id":13,"name":"razor-wind","type":"normal","power":80,"pp":10,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"}),
20:Object.freeze({"id":20,"name":"bind","type":"normal","power":15,"pp":20,"accuracy":85,"priority":0,"damageClass":"physical","target":"normal"}),
23:Object.freeze({"id":23,"name":"stomp","type":"normal","power":65,"pp":20,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
34:Object.freeze({"id":34,"name":"body-slam","type":"normal","power":85,"pp":15,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
35:Object.freeze({"id":35,"name":"wrap","type":"normal","power":15,"pp":20,"accuracy":90,"priority":0,"damageClass":"physical","target":"normal"}),
37:Object.freeze({"id":37,"name":"thrash","type":"normal","power":120,"pp":10,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
54:Object.freeze({"id":54,"name":"mist","type":"ice","power":null,"pp":30,"accuracy":null,"priority":0,"damageClass":"status","target":"self"}),
73:Object.freeze({"id":73,"name":"leech-seed","type":"grass","power":null,"pp":10,"accuracy":90,"priority":0,"damageClass":"status","target":"normal"}),
80:Object.freeze({"id":80,"name":"petal-dance","type":"grass","power":120,"pp":10,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"}),
83:Object.freeze({"id":83,"name":"fire-spin","type":"fire","power":35,"pp":15,"accuracy":85,"priority":0,"damageClass":"special","target":"normal"}),
100:Object.freeze({"id":100,"name":"teleport","type":"psychic","power":null,"pp":20,"accuracy":null,"priority":-6,"damageClass":"status","target":"self"}),
107:Object.freeze({"id":107,"name":"minimize","type":"normal","power":null,"pp":10,"accuracy":null,"priority":0,"damageClass":"status","target":"self"}),
113:Object.freeze({"id":113,"name":"light-screen","type":"psychic","power":null,"pp":30,"accuracy":null,"priority":0,"damageClass":"status","target":"self"}),
115:Object.freeze({"id":115,"name":"reflect","type":"psychic","power":null,"pp":20,"accuracy":null,"priority":0,"damageClass":"status","target":"self"}),
128:Object.freeze({"id":128,"name":"clamp","type":"water","power":35,"pp":15,"accuracy":85,"priority":0,"damageClass":"physical","target":"normal"}),
130:Object.freeze({"id":130,"name":"skull-bash","type":"normal","power":130,"pp":10,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
143:Object.freeze({"id":143,"name":"sky-attack","type":"flying","power":140,"pp":5,"accuracy":90,"priority":0,"damageClass":"physical","target":"normal"}),
169:Object.freeze({"id":169,"name":"spider-web","type":"bug","power":null,"pp":10,"accuracy":null,"priority":0,"damageClass":"status","target":"normal"}),
191:Object.freeze({"id":191,"name":"spikes","type":"ground","power":null,"pp":20,"accuracy":null,"priority":0,"damageClass":"status","target":"foeSide"}),
200:Object.freeze({"id":200,"name":"outrage","type":"dragon","power":120,"pp":10,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
212:Object.freeze({"id":212,"name":"mean-look","type":"normal","power":null,"pp":5,"accuracy":null,"priority":0,"damageClass":"status","target":"normal"}),
219:Object.freeze({"id":219,"name":"safeguard","type":"normal","power":null,"pp":25,"accuracy":null,"priority":0,"damageClass":"status","target":"self"}),
226:Object.freeze({"id":226,"name":"baton-pass","type":"normal","power":null,"pp":40,"accuracy":null,"priority":0,"damageClass":"status","target":"self"}),
228:Object.freeze({"id":228,"name":"pursuit","type":"dark","power":40,"pp":20,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
229:Object.freeze({"id":229,"name":"rapid-spin","type":"normal","power":50,"pp":40,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
250:Object.freeze({"id":250,"name":"whirlpool","type":"water","power":35,"pp":15,"accuracy":85,"priority":0,"damageClass":"special","target":"normal"}),
264:Object.freeze({"id":264,"name":"focus-punch","type":"fighting","power":150,"pp":20,"accuracy":100,"priority":-3,"damageClass":"physical","target":"normal"}),
280:Object.freeze({"id":280,"name":"brick-break","type":"fighting","power":75,"pp":15,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
328:Object.freeze({"id":328,"name":"sand-tomb","type":"ground","power":35,"pp":15,"accuracy":85,"priority":0,"damageClass":"physical","target":"normal"}),
335:Object.freeze({"id":335,"name":"block","type":"normal","power":null,"pp":5,"accuracy":null,"priority":0,"damageClass":"status","target":"normal"}),
369:Object.freeze({"id":369,"name":"u-turn","type":"bug","power":70,"pp":20,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
390:Object.freeze({"id":390,"name":"toxic-spikes","type":"poison","power":null,"pp":20,"accuracy":null,"priority":0,"damageClass":"status","target":"foeSide"}),
407:Object.freeze({"id":407,"name":"dragon-rush","type":"dragon","power":100,"pp":10,"accuracy":75,"priority":0,"damageClass":"physical","target":"normal"}),
432:Object.freeze({"id":432,"name":"defog","type":"flying","power":null,"pp":15,"accuracy":null,"priority":0,"damageClass":"status","target":"normal"}),
446:Object.freeze({"id":446,"name":"stealth-rock","type":"rock","power":null,"pp":20,"accuracy":null,"priority":0,"damageClass":"status","target":"foeSide"}),
484:Object.freeze({"id":484,"name":"heavy-slam","type":"steel","power":null,"pp":10,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
521:Object.freeze({"id":521,"name":"volt-switch","type":"electric","power":70,"pp":20,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"}),
535:Object.freeze({"id":535,"name":"heat-crash","type":"fire","power":null,"pp":10,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
564:Object.freeze({"id":564,"name":"sticky-web","type":"bug","power":null,"pp":20,"accuracy":null,"priority":0,"damageClass":"status","target":"foeSide"}),
575:Object.freeze({"id":575,"name":"parting-shot","type":"dark","power":null,"pp":20,"accuracy":100,"priority":0,"damageClass":"status","target":"normal"}),
611:Object.freeze({"id":611,"name":"infestation","type":"bug","power":20,"pp":20,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"}),
662:Object.freeze({"id":662,"name":"spirit-shackle","type":"ghost","power":80,"pp":10,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
677:Object.freeze({"id":677,"name":"anchor-shot","type":"steel","power":80,"pp":20,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
694:Object.freeze({"id":694,"name":"aurora-veil","type":"ice","power":null,"pp":20,"accuracy":null,"priority":0,"damageClass":"status","target":"self"}),
706:Object.freeze({"id":706,"name":"psychic-fangs","type":"psychic","power":85,"pp":10,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
738:Object.freeze({"id":738,"name":"sappy-seed","type":"grass","power":100,"pp":10,"accuracy":90,"priority":0,"damageClass":"physical","target":"normal"}),
812:Object.freeze({"id":812,"name":"flip-turn","type":"water","power":60,"pp":20,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
833:Object.freeze({"id":833,"name":"raging-fury","type":"fire","power":120,"pp":10,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
873:Object.freeze({"id":873,"name":"raging-bull","type":"normal","power":90,"pp":10,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
893:Object.freeze({"id":893,"name":"gigaton-hammer","type":"steel","power":160,"pp":5,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"}),
901:Object.freeze({"id":901,"name":"blood-moon","type":"normal","power":140,"pp":5,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"})
});
const binding=[20,35,83,128,250,328,611],trapping=[169,212,335,662,677],screens={113:'lightScreen',115:'reflect',219:'safeguard',54:'mist',694:'auroraVeil'},hazards={191:'spikes',390:'toxicSpikes',446:'stealthRock',564:'stickyWeb'},pivot=[369,521,812,575,100,226],rampage=[37,80,200,833],consecutive=[893,901],minimizeHits=[23,34,407,484,535,560];
for(const data of [binding,trapping,screens,hazards,pivot,rampage,consecutive,minimizeHits])Object.freeze(data);
const statusMoves=Object.freeze(Object.fromEntries(Object.values(moves).filter(m=>m.damageClass==='status'&&m.id!==694).map(m=>[m.name,m])));
const pending={484:['DYNAMAX_TARGET_PHASE_P8'],535:['DYNAMAX_TARGET_PHASE_P8'],13:['HIGH_CRITICAL_PHASE_P1','ITEM_PHASE_P7'],143:['HIGH_CRITICAL_PHASE_P1','ITEM_PHASE_P7'],130:['ITEM_PHASE_P7'],432:['TERRAIN_CLEAR_PHASE_P7'],873:['FORM_TYPE_PHASE_P8'],694:['WEATHER_PHASE_P7']};
// Other-phase interactions remain explicit: Ghost switching is supported, abilities and items are not.
const mechanic=id=>id===327?'SEMI_INVULNERABLE_TARGET':id===239?'SECONDARY_FLINCH':binding.includes(id)?'BINDING':trapping.includes(id)?'TRAPPING':screens[id]?'SIDE_BARRIER':hazards[id]?'ENTRY_HAZARD':pivot.includes(id)?'SELF_SWITCH':rampage.includes(id)?'LOCKED_MOVE':consecutive.includes(id)?'CONSECUTIVE_USE':minimizeHits.includes(id)?'MINIMIZE_INTERACTION':({73:'LEECH_SEED',738:'LEECH_SEED',229:'HAZARD_CLEAR',432:'FIELD_CLEAR',228:'SWITCH_INTERCEPTION',107:'MINIMIZE',280:'BARRIER_REMOVAL',706:'BARRIER_REMOVAL',873:'BARRIER_REMOVAL',264:'PREPARATION_FAIL_ON_HIT',694:'SIDE_BARRIER'})[id]||'TWO_TURN_CHARGE';
const definitions=Object.freeze(Object.fromEntries(Object.values(moves).map(m=>[m.id,Object.freeze({id:m.id,name:m.name,supportLevel:m.id===694?'BLOCKED':pending[m.id]?'PARTIAL':'FULL',requiredMechanics:Object.freeze([m.damageClass==='status'?'STATUS_MOVE':m.damageClass==='physical'?'PHYSICAL_DAMAGE':'SPECIAL_DAMAGE',mechanic(m.id)]),knownPending:Object.freeze(pending[m.id]||[]),blockedReason:m.id===694?'WEATHER_REQUIRED':null,priority:m.priority})])));
const get=(s,r)=>s[r]?.team?s[r].team[s[r].activeIndex||0]:s[r];
const other=r=>r==='player'?'enemy':'player';
function init(s){s.p6Sides ||= {player:{},enemy:{}};for(const r of ['player','enemy'])s.p6Sides[r]||={};return s.p6Sides;}
function feedback(events,r,mon,reason,extra={}){events.push({type:'MOVE_PREPARED',actor:r,pokemonName:mon.name,reason,...extra});}
function stage(C,events,r,mon,key,delta){const report=C.applyStatStageChange(mon,key,delta);events.push({type:'STAT_STAGE_CHANGED',combatant:r,pokemonName:mon.name,statKey:key,...report});return report.appliedDelta!==0;}
function hpDamage(events,r,mon,amount,cause){const previousHp=mon.currentHp,damage=Math.min(previousHp,Math.max(1,Math.floor(amount)));if(mon.p7MagicGuard)return 0;mon.currentHp-=damage;mon.damagedThisTurn=true;events.push({type:'STATUS_DAMAGE',target:r,pokemonName:mon.name,statusCondition:cause,damage,previousHp,currentHp:mon.currentHp,maxHp:mon.maxHp});return damage;}
function heal(events,r,mon,n){if(mon.currentHp<=0)return;const previousHp=mon.currentHp;mon.currentHp=Math.min(mon.maxHp,mon.currentHp+n);if(mon.currentHp>previousHp)events.push({type:'HP_HEALED',target:r,pokemonName:mon.name,previousHp,currentHp:mon.currentHp,maxHp:mon.maxHp,healedAmount:mon.currentHp-previousHp});}
function seed(events,role,target,sourceRole,sourceId){if(target.types.includes('grass')||target.leechSeed||target.currentHp<=0)return false;target.leechSeed={sourceRole,...(sourceId?{sourceId}:{})};feedback(events,role,target,'LEECH_SEED');return true;}
function switchBlocked(s,r){const m=get(s,r);if(m.twoTurnMove||m.rechargeMoveId||m.lockedMove)return true;if((m.types||[]).includes('ghost')||m.item==='shed-shell')return false;return Boolean(m.bound||m.trapped||m.p7AbilityTrap);}
function leave(s,r,mon){mon.bound=null;mon.trapped=null;mon.leechSeed=null;mon.minimized=false;mon.lockedMove=null;mon.lastP6Move=null;for(const role of ['player','enemy']){const target=get(s,role);if(target.bound?.sourceId===mon.id&&target.bound?.sourceRole===r)target.bound=null;if(target.trapped?.sourceId===mon.id&&target.trapped?.sourceRole===r)target.trapped=null;}}
function entry(s,r,C,Type,events){init(s);const mon=get(s,r),side=s.p6Sides[r];if(mon.currentHp<=0)return;if(C.P7.held(mon,'heavy-duty-boots'))return;const grounded=C.P7.grounded(mon);if(side.stealthRock){const factor=C.P8.effectiveness('rock',mon,Type);const mult=typeof factor==='number'?factor:factor.multiplier;hpDamage(events,r,mon,C.P8.baseMaxHp(mon)/8*mult,'stealth-rock');}if(mon.currentHp<=0)return;
 if(grounded&&side.spikes)hpDamage(events,r,mon,mon.maxHp/([0,8,6,4][side.spikes]),'spikes');if(mon.currentHp<=0)return;
 if(grounded&&side.toxicSpikes){if(mon.types.includes('poison')){delete side.toxicSpikes;feedback(events,r,mon,'TOXIC_SPIKES_ABSORBED');}else if(!mon.types.includes('steel')&&!mon.statusCondition&&!C.P7.statusImmune(mon,'poison')){mon.statusCondition=side.toxicSpikes===2?'toxic':'poison';mon.toxicStage=0;events.push({type:'STATUS_APPLIED',target:r,pokemonName:mon.name,statusCondition:mon.statusCondition,reason:'TOXIC_SPIKES'});}}
 if(grounded&&side.stickyWeb){mon.p7BlockDrop=['clear-body','white-smoke','full-metal-body'].includes(C.P7.ability(mon));stage(C,events,r,mon,'speed',-1);mon.p7BlockDrop=false;}
}
function residual(s,C,events,phase='all'){init(s);
 if(phase==='all'||phase==='seed')for(const r of ['player','enemy']){const m=get(s,r);if(m.currentHp<=0)continue;if(m.leechSeed){const sr=m.leechSeed.sourceRole,source=s.battleFormat==='DOUBLES'&&m.leechSeed.sourceId?(s.doublesTeams?.[sr]||s[sr]).team.find(n=>n.id===m.leechSeed.sourceId)||get(s,sr):get(s,sr);if(source.currentHp>0){const d=hpDamage(events,r,m,C.P8.baseMaxHp(m)/8,'leech-seed');heal(events,sr,source,d);}}}
 if(phase==='all'||phase==='binding')for(const r of ['player','enemy']){const m=get(s,r);if(m.currentHp>0&&m.bound){const b=m.bound,source=s.battleFormat==='DOUBLES'?((s.doublesTeams?.[b.sourceRole]||s[b.sourceRole]).team.find(n=>n.id===b.sourceId)||get(s,b.sourceRole)):get(s,b.sourceRole);if(source.id!==b.sourceId||source.currentHp<=0){m.bound=null;continue;}hpDamage(events,r,m,m.maxHp/(source.item==='binding-band'?6:8),'binding');if(--b.turns<=0){m.bound=null;feedback(events,r,m,'BINDING_ENDED');}}}
}
function endField(s,events){for(const r of ['player','enemy'])for(const key of ['reflect','lightScreen','safeguard','mist','auroraVeil'])if(s.p6Sides[r][key]&&--s.p6Sides[r][key]===0){delete s.p6Sides[r][key];feedback(events,r,get(s,r),'BARRIER_ENDED',{barrier:key});}}
function barrierMultiplier(s,r,move,critical=false){const side=s.p6Sides?.[r]||{};return critical?1:((move.damageClass==='physical'&&side.reflect)||(move.damageClass==='special'&&side.lightScreen)||side.auroraVeil)?(s.battleFormat==='DOUBLES'?2/3:0.5):1;}
function statusAction(s,r,move,action,C,events){init(s);const foe=other(r),a=get(s,r),d=get(s,foe),id=move.id,own=s.p6Sides[r],opp=s.p6Sides[foe],fail=reason=>events.push({type:'MOVE_FAILED',actor:r,target:foe,pokemonName:a.name,moveId:id,moveName:move.name,reason});
 if(id===694&&(C.P7?!['snow','hail'].includes(C.P7.fieldWeather(s)):!['hail','snow','snowscape'].includes(s.weather?.id||s.weather))){fail('WEATHER_REQUIRED');return true;}
 if(screens[id]){const key=screens[id];if(own[key])fail('BARRIER_EXISTS');else {own[key]=[113,115,694].includes(id)&&C.P7.held(a,'light-clay')?8:5;feedback(events,r,a,'BARRIER_STARTED',{barrier:key});}return true;}
 if(hazards[id]){const key=hazards[id],max=id===191?3:id===390?2:1;if((opp[key]||0)>=max)fail('HAZARD_LIMIT');else{opp[key]=(opp[key]||0)+1;feedback(events,foe,d,'HAZARD_STARTED',{hazard:key,layers:opp[key]});}return true;}
 if(id===73){if(!seed(events,foe,d,r,s.battleFormat==='DOUBLES'?a.id:undefined))fail('SEED_INELIGIBLE');return true;}
 if([169,212,335].includes(id)){if(d.trapped||d.types.includes('ghost'))fail('TRAP_INELIGIBLE');else{d.trapped={sourceRole:r,sourceId:a.id};feedback(events,foe,d,'TRAPPED');}return true;}
 if(id===107){stage(C,events,r,a,'evasion',2);a.minimized=true;return true;}
 if(id===432){let success=opp.mist?false:stage(C,events,foe,d,'evasion',-1);for(const side of [own,opp])for(const key of Object.values(hazards))if(side[key]){delete side[key];success=true;}for(const key of Object.values(screens))if(opp[key]){delete opp[key];success=true;}if(!success)fail('NOTHING_TO_CLEAR');else feedback(events,r,a,'FIELD_CLEARED');return true;}
 if([100,226,575].includes(id)){let success=true;if(id===575){if(opp.mist){fail('MIST');return true;}success=stage(C,events,foe,d,'attack',-1);success=stage(C,events,foe,d,'specialAttack',-1)||success;}if(success){if(!requestPivot(s,r,id,events)){if(id===226)feedback(events,r,a,'NO_RESERVE');else fail('NO_RESERVE');}}else fail('STAT_LIMIT');return true;}
 return false;
}
function requestPivot(s,r,id,events){if(s.battleFormat==='DOUBLES')return false;if(s.version!==2||!s[r].team.some((m,i)=>i!==s[r].activeIndex&&m.currentHp>0))return false;s.pendingPivot={role:r,moveId:id,stages:id===226?{...get(s,r).statStages}:null,passVolatiles:id===226?{accuracyStage:get(s,r).accuracyStage,evasionStage:get(s,r).evasionStage,confusionTurns:get(s,r).confusionTurns,drowsyTurns:get(s,r).drowsyTurns,drowsySleepDuration:get(s,r).drowsySleepDuration}:null,passSeed:id===226?get(s,r).leechSeed:null,passMinimized:id===226?get(s,r).minimized:false};s.status='AWAITING_REPLACEMENT';events.push({type:'REPLACEMENT_REQUIRED',side:r,reason:'PIVOT',pokemonId:get(s,r).id});return true;}
function afterDamage(s,r,move,action,C,events,damage){if(damage<=0)return;init(s);const foe=other(r),a=get(s,r),d=get(s,foe),id=move.id;if(binding.includes(id)&&!d.bound&&d.currentHp>0){const duration=C.P7.held(a,'grip-claw')?7:action.bindingDuration??4;if(!Number.isInteger(duration)||(![4,5].includes(duration)&&!(duration===7&&C.P7.held(a,'grip-claw'))))throw Error('Duração de aprisionamento inválida.');d.bound={sourceRole:r,sourceId:a.id,turns:duration};feedback(events,foe,d,'BOUND');}
 if([662,677].includes(id)&&d.currentHp>0&&!d.types.includes('ghost')){d.trapped={sourceRole:r,sourceId:a.id};feedback(events,foe,d,'TRAPPED');}if(id===738)seed(events,foe,d,r);
 if(id===229&&a.currentHp>0){a.bound=null;a.leechSeed=null;for(const key of Object.values(hazards))delete s.p6Sides[r][key];feedback(events,r,a,'HAZARDS_CLEARED');}
 if([369,521,812].includes(id)&&a.currentHp>0)a.pivotAfterHit=id;
}
const struggle=Object.freeze({id:165,name:'struggle',type:'normal',power:50,accuracy:null,pp:1,maxPp:1,currentPp:1,damageClass:'physical',target:'normal'});
// Required fallback for a one-move Gigaton Hammer/Blood Moon loadout, including when trapping prevents switching.
function mustStruggle(m){if(m.dynamax)return false;return !m.lockedMove&&!m.twoTurnMove&&!m.bideState&&!m.rechargeMoveId&&(m.moves||[]).some(n=>consecutive.includes(n.id))&&(m.moves||[]).every(n=>n.currentPp<=0||(consecutive.includes(n.id)&&m.lastP6Move===n.id));}
const api={struggle,mustStruggle,moves,definitions,statusMoves,binding,trapping,pivot,rampage,consecutive,minimizeHits,screens,hazards,init,get,other,stage,hpDamage,heal,feedback,seed,switchBlocked,leave,entry,residual,endField,barrierMultiplier,statusAction,afterDamage,requestPivot};
Object.freeze(api);
if(typeof module!=='undefined'&&module.exports)module.exports=api;else if(typeof window!=='undefined')window.PBAP6Mechanics=api;
})();
