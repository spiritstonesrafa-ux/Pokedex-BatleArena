/* P7 explicit singles pilots. Downloaded sources are data, never executable callbacks. */
(function(){
const Special=typeof module!=='undefined'&&module.exports?require('./p8-special.js'):window.PBAP8Special;
const Data=typeof module!=='undefined'&&module.exports?require('./p7-pokemon-data.js'):window.PBAP7PokemonData;
const MoveFlags=typeof module!=='undefined'&&module.exports?require('./move-flags.js'):(typeof window!=='undefined'?window.PBAMoveFlags:null);
const abilityNames=Object.freeze(["pressure","intrepid-sword","unnerve","grim-neigh","as-one-spectrier","justified","moxie","chilling-neigh","as-one-glastrier","dauntless-shield","marvel-scale","hustle","keen-eye","steadfast","rough-skin","iron-barbs","effect-spore","synchronize","shed-skin","dark-aura","fairy-aura","aura-break","prism-armor","neuroforce","overgrow","blaze","torrent","swarm","levitate","intimidate","clear-body","white-smoke","hyper-cutter","full-metal-body","inner-focus","own-tempo","immunity","limber","insomnia","vital-spirit","water-veil","magma-armor","sturdy","water-absorb","volt-absorb","flash-fire","sap-sipper","lightning-rod","storm-drain","guts","huge-power","pure-power","adaptability","technician","thick-fat","filter","solid-rock","multiscale","regenerator","natural-cure","magic-guard","unseen-fist","mold-breaker","teravolt","turboblaze","drizzle","drought","sand-stream","snow-warning","swift-swim","chlorophyll","sand-rush","slush-rush","sand-veil","snow-cloak","electric-surge","grassy-surge","misty-surge","psychic-surge","rain-dish","solar-power","sand-force","cloud-nine","air-lock","static","flame-body","poison-point","shadow-tag","arena-trap","magnet-pull","prankster","infiltrator","magic-bounce","normalize","refrigerate","pixilate","aerilate","galvanize","liquid-voice","protean","libero","color-change","schooling","shields-down","battle-bond","forecast","zen-mode","mimicry","zero-to-hero","trace","mummy","receiver","power-of-alchemy","wandering-spirit","neutralizing-gas","lingering-aroma","soul-heart","defiant","competitive","contrary","mirror-armor","opportunist","guard-dog","anger-point","rattled","stamina","water-compaction","weak-armor","steam-engine","motor-drive","electromorphosis","berserk","anger-shell","beast-boost","cotton-down","download","moody","speed-boost","thermal-exchange","wind-power","wind-rider","supreme-overlord","iron-fist","strong-jaw","tough-claws","sharpness","mega-launcher","steelworker","rocky-payload","battle-armor","shell-armor","super-luck","sniper","merciless","compound-eyes","no-guard","tangled-feet","fur-coat","fluffy","ice-scales","heatproof","shadow-shield","water-bubble","punk-rock","tinted-lens","reckless","rock-head","toxic-boost","flare-boost","analytic","stakeout","defeatist","gorilla-tactics"]);
const unsuppressibleAbilities=Object.freeze(['as-one-spectrier','as-one-glastrier','schooling','shields-down','battle-bond','zen-mode','zero-to-hero','multitype','rks-system','stance-change','power-construct','neutralizing-gas']);
const unsuppressibleGasAbilities=Object.freeze([...unsuppressibleAbilities,'disguise','ice-face','tera-shift','tera-shell','teraform-zero','commander','comatose']);
const untraceableAbilities=Object.freeze(['as-one-spectrier','as-one-glastrier','battle-bond','commander','disguise','flower-gift','forecast','gulp-missile','hunger-switch','ice-face','illusion','imposter','multitype','neutralizing-gas','power-construct','power-of-alchemy','protosynthesis','quark-drive','receiver','rks-system','schooling','shields-down','stance-change','trace','wonder-guard','zen-mode','zero-to-hero','tera-shift','tera-shell','teraform-zero','embody-aspect','poison-puppeteer']);
const unoverwritableAbilities=Object.freeze(['as-one-spectrier','as-one-glastrier','battle-bond','commander','disguise','gulp-missile','ice-face','multitype','power-construct','rks-system','schooling','shields-down','stance-change','tera-shift','tera-shell','teraform-zero','zero-to-hero']);
const unswappableAbilities=Object.freeze(['as-one-spectrier','as-one-glastrier','battle-bond','commander','disguise','gulp-missile','ice-face','illusion','multitype','neutralizing-gas','power-construct','power-of-alchemy','protosynthesis','quark-drive','receiver','rks-system','schooling','shields-down','stance-change','tera-shift','tera-shell','teraform-zero','wonder-guard','zero-to-hero','wandering-spirit']);
const noReceiverAbilities=Object.freeze(['as-one-spectrier','as-one-glastrier','battle-bond','commander','disguise','flower-gift','forecast','gulp-missile','hunger-switch','ice-face','illusion','imposter','multitype','neutralizing-gas','power-construct','power-of-alchemy','protosynthesis','quark-drive','receiver','rks-system','schooling','shields-down','stance-change','trace','wonder-guard','zen-mode','zero-to-hero','tera-shift','tera-shell','teraform-zero','embody-aspect','poison-puppeteer']);
const items={"leftovers":{"name":"leftovers","id":211},"black-sludge":{"name":"black-sludge","id":258},"life-orb":{"name":"life-orb","id":247},"choice-band":{"name":"choice-band","id":197},"choice-specs":{"name":"choice-specs","id":274},"choice-scarf":{"name":"choice-scarf","id":264},"assault-vest":{"name":"assault-vest","id":683},"focus-sash":{"name":"focus-sash","id":252},"sitrus-berry":{"name":"sitrus-berry","id":135},"lum-berry":{"name":"lum-berry","id":134},"chesto-berry":{"name":"chesto-berry","id":127},"pecha-berry":{"name":"pecha-berry","id":128},"rawst-berry":{"name":"rawst-berry","id":129},"aspear-berry":{"name":"aspear-berry","id":130},"cheri-berry":{"name":"cheri-berry","id":126},"oran-berry":{"name":"oran-berry","id":132},"heavy-duty-boots":{"name":"heavy-duty-boots","id":1178},"shed-shell":{"name":"shed-shell","id":272},"grip-claw":{"name":"grip-claw","id":263},"binding-band":{"name":"binding-band","id":587},"light-clay":{"name":"light-clay","id":246},"power-herb":{"name":"power-herb","id":248},"damp-rock":{"name":"damp-rock","id":262},"heat-rock":{"name":"heat-rock","id":261},"smooth-rock":{"name":"smooth-rock","id":260},"icy-rock":{"name":"icy-rock","id":259},"terrain-extender":{"name":"terrain-extender","id":896},"ability-shield":{"name":"ability-shield","id":1697},"safety-goggles":{"name":"safety-goggles","id":650},"rocky-helmet":{"name":"rocky-helmet","id":540},"flame-plate":{"name":"flame-plate","kind":"plate","type":"fire","id":275},"splash-plate":{"name":"splash-plate","kind":"plate","type":"water","id":276},"zap-plate":{"name":"zap-plate","kind":"plate","type":"electric","id":277},"meadow-plate":{"name":"meadow-plate","kind":"plate","type":"grass","id":278},"icicle-plate":{"name":"icicle-plate","kind":"plate","type":"ice","id":279},"fist-plate":{"name":"fist-plate","kind":"plate","type":"fighting","id":280},"toxic-plate":{"name":"toxic-plate","kind":"plate","type":"poison","id":281},"earth-plate":{"name":"earth-plate","kind":"plate","type":"ground","id":282},"sky-plate":{"name":"sky-plate","kind":"plate","type":"flying","id":283},"mind-plate":{"name":"mind-plate","kind":"plate","type":"psychic","id":284},"insect-plate":{"name":"insect-plate","kind":"plate","type":"bug","id":285},"stone-plate":{"name":"stone-plate","kind":"plate","type":"rock","id":286},"spooky-plate":{"name":"spooky-plate","kind":"plate","type":"ghost","id":287},"draco-plate":{"name":"draco-plate","kind":"plate","type":"dragon","id":288},"dread-plate":{"name":"dread-plate","kind":"plate","type":"dark","id":289},"iron-plate":{"name":"iron-plate","kind":"plate","type":"steel","id":290},"pixie-plate":{"name":"pixie-plate","kind":"plate","type":"fairy","id":684},"fighting-memory":{"name":"fighting-memory","kind":"memory","type":"fighting","id":902},"flying-memory":{"name":"flying-memory","kind":"memory","type":"flying","id":903},"poison-memory":{"name":"poison-memory","kind":"memory","type":"poison","id":904},"ground-memory":{"name":"ground-memory","kind":"memory","type":"ground","id":905},"rock-memory":{"name":"rock-memory","kind":"memory","type":"rock","id":906},"bug-memory":{"name":"bug-memory","kind":"memory","type":"bug","id":907},"ghost-memory":{"name":"ghost-memory","kind":"memory","type":"ghost","id":908},"steel-memory":{"name":"steel-memory","kind":"memory","type":"steel","id":909},"fire-memory":{"name":"fire-memory","kind":"memory","type":"fire","id":910},"water-memory":{"name":"water-memory","kind":"memory","type":"water","id":911},"grass-memory":{"name":"grass-memory","kind":"memory","type":"grass","id":912},"electric-memory":{"name":"electric-memory","kind":"memory","type":"electric","id":913},"psychic-memory":{"name":"psychic-memory","kind":"memory","type":"psychic","id":914},"ice-memory":{"name":"ice-memory","kind":"memory","type":"ice","id":915},"dragon-memory":{"name":"dragon-memory","kind":"memory","type":"dragon","id":916},"dark-memory":{"name":"dark-memory","kind":"memory","type":"dark","id":917},"fairy-memory":{"name":"fairy-memory","kind":"memory","type":"fairy","id":918},"burn-drive":{"name":"burn-drive","kind":"drive","type":"fire","id":565},"douse-drive":{"name":"douse-drive","kind":"drive","type":"water","id":563},"shock-drive":{"name":"shock-drive","kind":"drive","type":"electric","id":564},"chill-drive":{"name":"chill-drive","kind":"drive","type":"ice","id":566}};for(const value of Object.values(items))Object.freeze(value);Object.freeze(items);
const moves={"13":{"id":13,"name":"razor-wind","type":"normal","power":80,"pp":10,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"},"59":{"id":59,"name":"blizzard","type":"ice","power":110,"pp":5,"accuracy":70,"priority":0,"damageClass":"special","target":"normal"},"76":{"id":76,"name":"solar-beam","type":"grass","power":120,"pp":10,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"},"87":{"id":87,"name":"thunder","type":"electric","power":110,"pp":10,"accuracy":70,"priority":0,"damageClass":"special","target":"normal"},"130":{"id":130,"name":"skull-bash","type":"normal","power":130,"pp":10,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"},"143":{"id":143,"name":"sky-attack","type":"flying","power":140,"pp":5,"accuracy":90,"priority":0,"damageClass":"physical","target":"normal"},"168":{"id":168,"name":"thief","type":"dark","power":60,"pp":25,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"},"201":{"id":201,"name":"sandstorm","type":"rock","power":null,"pp":10,"accuracy":null,"priority":0,"damageClass":"status","target":"self"},"240":{"id":240,"name":"rain-dance","type":"water","power":null,"pp":5,"accuracy":null,"priority":0,"damageClass":"status","target":"self"},"241":{"id":241,"name":"sunny-day","type":"fire","power":null,"pp":5,"accuracy":null,"priority":0,"damageClass":"status","target":"self"},"282":{"id":282,"name":"knock-off","type":"dark","power":65,"pp":20,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"},"290":{"id":290,"name":"secret-power","type":"normal","power":70,"pp":20,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"},"311":{"id":311,"name":"weather-ball","type":"normal","power":50,"pp":10,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"},"432":{"id":432,"name":"defog","type":"flying","power":null,"pp":15,"accuracy":null,"priority":0,"damageClass":"status","target":"normal"},"449":{"id":449,"name":"judgment","type":"normal","power":100,"pp":10,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"},"450":{"id":450,"name":"bug-bite","type":"bug","power":60,"pp":20,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"},"510":{"id":510,"name":"incinerate","type":"fire","power":60,"pp":15,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"},"542":{"id":542,"name":"hurricane","type":"flying","power":110,"pp":10,"accuracy":70,"priority":0,"damageClass":"special","target":"normal"},"546":{"id":546,"name":"techno-blast","type":"normal","power":120,"pp":5,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"},"580":{"id":580,"name":"grassy-terrain","type":"grass","power":null,"pp":10,"accuracy":null,"priority":0,"damageClass":"status","target":"self"},"581":{"id":581,"name":"misty-terrain","type":"fairy","power":null,"pp":10,"accuracy":null,"priority":0,"damageClass":"status","target":"self"},"604":{"id":604,"name":"electric-terrain","type":"electric","power":null,"pp":10,"accuracy":null,"priority":0,"damageClass":"status","target":"self"},"678":{"id":678,"name":"psychic-terrain","type":"psychic","power":null,"pp":10,"accuracy":null,"priority":0,"damageClass":"status","target":"self"},"687":{"id":687,"name":"core-enforcer","type":"dragon","power":100,"pp":10,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"},"694":{"id":694,"name":"aurora-veil","type":"ice","power":null,"pp":20,"accuracy":null,"priority":0,"damageClass":"status","target":"self"},"714":{"id":714,"name":"moongeist-beam","type":"ghost","power":100,"pp":5,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"},"718":{"id":718,"name":"multi-attack","type":"normal","power":120,"pp":10,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"},"722":{"id":722,"name":"photon-geyser","type":"psychic","power":100,"pp":5,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"},"803":{"id":803,"name":"grassy-glide","type":"grass","power":55,"pp":20,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"},"805":{"id":805,"name":"terrain-pulse","type":"normal","power":50,"pp":10,"accuracy":100,"priority":0,"damageClass":"special","target":"normal"},"831":{"id":831,"name":"springtide-storm","type":"fairy","power":100,"pp":5,"accuracy":80,"priority":0,"damageClass":"special","target":"normal"},"856":{"id":856,"name":"order-up","type":"dragon","power":80,"pp":10,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"},"861":{"id":861,"name":"ice-spinner","type":"ice","power":80,"pp":15,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"},"875":{"id":875,"name":"psyblade","type":"psychic","power":80,"pp":15,"accuracy":100,"priority":0,"damageClass":"physical","target":"normal"},"881":{"id":881,"name":"chilly-reception","type":"ice","power":0,"pp":10,"accuracy":null,"priority":0,"damageClass":"status","target":"self"},"883":{"id":883,"name":"snowscape","type":"ice","power":0,"pp":10,"accuracy":null,"priority":0,"damageClass":"status","target":"self"}};for(const value of Object.values(moves))Object.freeze(value);Object.freeze(moves);
const supportedAbilities=new Set([...abilityNames,...Special.abilityNames,'commander']),knownAbilities=new Set(Data.abilityNames);
const weatherMoves=Object.freeze({240:'rain',241:'sun',201:'sand',883:'snow'}),terrainMoves=Object.freeze({580:'grassy',581:'misty',604:'electric',678:'psychic'});
const pending={13:['HIGH_CRITICAL_PHASE_P1'],143:['HIGH_CRITICAL_PHASE_P1'],856:['COMMANDER_DOUBLES_OUT_OF_SCOPE']};
const definitions=Object.freeze(Object.fromEntries(Object.values(moves).map(m=>[m.id,Object.freeze({id:m.id,name:m.name,supportLevel:pending[m.id]?'PARTIAL':'FULL',requiredMechanics:Object.freeze([m.damageClass==='status'?'STATUS_MOVE':m.damageClass==='physical'?'PHYSICAL_DAMAGE':'SPECIAL_DAMAGE',weatherMoves[m.id]?'WEATHER':terrainMoves[m.id]?'TERRAIN':'P7_INTERACTION']),knownPending:Object.freeze(pending[m.id]||[]),blockedReason:null,priority:m.priority})])));
const statusMoves=Object.freeze(Object.fromEntries(Object.values(moves).filter(m=>m.damageClass==='status').map(m=>[m.name,m])));
const get=(s,r)=>s[r]?.team?s[r].team[s[r].activeIndex||0]:s[r],foe=r=>r==='player'?'enemy':'player';
function ability(m,ignored=false){if(!m||m.currentHp<=0)return '';const isSuppressed=((m.abilitySuppressed||m.neutralizingGasSuppressed||ignored)&&!unsuppressibleAbilities.includes(m.ability));if(isSuppressed)return '';return supportedAbilities.has(m.ability)?m.ability:'';}
function held(m,name){return m?.item===name&&!(m.dynamax&&['choice-band','choice-specs','choice-scarf'].includes(name));}
function ignored(a,d,move){return !held(d,'ability-shield')&&([714,722,723].includes(Number(move?.id))||['mold-breaker','teravolt','turboblaze'].includes(ability(a)));}
function defenderAbility(a,d,move){return ability(d)==='full-metal-body'?'full-metal-body':ability(d,ignored(a,d,move));}
function natural(id){return Data.byPokemon[Number(id)]||[];}
function defaultAbility(id){return natural(id)[0]?.name||null;}
function normalizeAbility(value){const name=typeof value==='string'?value:value?.name||value?.ability?.name||null;if(name&&!knownAbilities.has(name))throw new Error('Habilidade desconhecida: '+name);return name;}
function normalizeItem(value){const name=typeof value==='string'?value:value?.name||null;if(name&&!items[name]&&!Special.specialItems[name])throw new Error('Item sem suporte: '+name);return name;}
function validatePreference(id,raw={}){if(!raw||typeof raw!=='object'||Array.isArray(raw))return null;const name=raw.ability||defaultAbility(id);if(name&&!natural(id).some(n=>n.name===name))return null;const item=raw.item||null;if(item&&!items[item]&&!Special.specialItems[item])return null;const extra=Special.preference(id,raw);return extra?{ability:name,item,...extra}:null;}
function tell(C,events,r,m,reason,label){C.P6.feedback(events,r,m,reason,{label});}
function activeMons(s,r){if(!s||!r)return [];if(s.battleFormat==='DOUBLES'){const side=s.doublesTeams?.[r]||s[r];if(!side||!side.activeIndices||!side.team)return [];return side.activeIndices.map(i=>side.team[i]).filter(m=>m&&m.currentHp>0);}const mon=get(s,r);return mon&&mon.currentHp>0?[mon]:[];}
function berriesBlocked(s,r){return activeMons(s,foe(r)).some(m=>['unnerve','as-one-spectrier','as-one-glastrier'].includes(ability(m)));}
function refreshBerries(s,C,events){for(const r of ['player','enemy'])for(const m of activeMons(s,r))checkItem(s,r,C,events,m);}
function pressureCost(s,r,move){
 // Canonical all-field moves retain their Pressure targets despite legacy self-target metadata.
 if([114,195,201,240,241,258,580,581,604,678,883,191,390,446,851].includes(move.id))return activeMons(s,foe(r)).filter(m=>ability(m)==='pressure').length;
 if([165,14,156,214,347,182,197,588].includes(move.id)||move.damageClass==='status_self'||['self','allySide','allyTeam','foeSide'].includes(move.target))return 0;
 // A doubles pair can refer to an ally; use the actual action target set.
 const targets=s.pressureTargets||(s.doublesAllyTarget?[]:[get(s,foe(r))]);
 return targets.filter(m=>ability(m)==='pressure').length;
}
function directKO(s,r,target,C,events,attacker=null){
 const m=attacker||get(s,r);if(target.currentHp>0||m===target)return;
 const a=ability(m);
 if(['grim-neigh','as-one-spectrier'].includes(a)){
  C.P6.stage(C,events,r,m,'specialAttack',1);tell(C,events,r,m,'P7_ABILITY','grim-neigh');
  checkOpportunist(s,r,m,'specialAttack',1,C,events);
 }else if(['chilling-neigh','as-one-glastrier'].includes(a)){
  C.P6.stage(C,events,r,m,'attack',1);tell(C,events,r,m,'P7_ABILITY','chilling-neigh');
  checkOpportunist(s,r,m,'attack',1,C,events);
 }else if(a==='moxie'){
  C.P6.stage(C,events,r,m,'attack',1);tell(C,events,r,m,'P7_ABILITY','moxie');
  checkOpportunist(s,r,m,'attack',1,C,events);
 }else if(a==='beast-boost'){
  const candidateStats=['attack','defense','specialAttack','specialDefense','speed'];
  let bestStat=candidateStats[0], bestVal=-1;
  for(const k of candidateStats){
   const val=Math.floor(Number(m[k])*(C.P7?.stat?C.P7.stat(m,k):1));
   if(val>bestVal){bestVal=val;bestStat=k;}
  }
  modifyStages(s,r,m,{[bestStat]:1},r,m,'beast-boost',C,events);
  tell(C,events,r,m,'P7_ABILITY','beast-boost');
 }else if(a==='battle-bond'){
  if(m.currentHp>0&&!m.transformOriginal&&!m.battleBondTriggered){
   const isEligibleSpecies=(m.id===10116||(C.P8?.species&&C.P8.species(m)===10116));
   if(isEligibleSpecies){
    const foeRole=(typeof foe==='function'?foe(r):(r==='player'?'enemy':'player'));
    const foeMons=(s.battleFormat==='DOUBLES'?(s.doublesTeams?.[foeRole]||s[foeRole])?.team:(s[foeRole]?.team||(s[foeRole]?[s[foeRole]]:[])))||[];
    const foesRemaining=foeMons.filter(p=>p&&p!==target&&p.currentHp>0).length;
    if(foesRemaining>0){
     m.battleBondTriggered=true;
     C.P6.stage(C,events,r,m,'attack',1);
     C.P6.stage(C,events,r,m,'specialAttack',1);
     C.P6.stage(C,events,r,m,'speed',1);
     tell(C,events,r,m,'P7_ABILITY','battle-bond');
     checkOpportunist(s,r,m,'attack',1,C,events);
     checkOpportunist(s,r,m,'specialAttack',1,C,events);
     checkOpportunist(s,r,m,'speed',1,C,events);
    }
   }
  }
 }
}
function checkOpportunist(s,boostedRole,boostedMon,statKey,boost,C,events){
 if(!s||boost<=0)return;
 const foeRole=typeof foe==='function'?foe(boostedRole):(boostedRole==='player'?'enemy':'player');
 for(const foeMon of activeMons(s,foeRole)){
  if(foeMon&&foeMon.currentHp>0&&ability(foeMon)==='opportunist'){
   const cur=foeMon.statStages?.[statKey]||0;
   if(cur<6){
    modifyStages(s,foeRole,foeMon,{[statKey]:boost},boostedRole,boostedMon,'opportunist',C,events,{isOpportunistCopy:true});
    tell(C,events,foeRole,foeMon,'P7_ABILITY','opportunist');
   }
  }
 }
}
function modifyStages(s,targetRole,targetMon,statChanges,sourceRole,sourceMon,reason,C,events,options={}){
 if(!targetMon||targetMon.currentHp<=0||!statChanges||typeof statChanges!=='object')return {};
 const ab=ability(targetMon);
 const isFoe=Boolean(sourceRole&&sourceRole!==targetRole);

 if(reason==='intimidate'&&ab==='guard-dog'){
  C.P6.stage(C,events,targetRole,targetMon,'attack',1);
  tell(C,events,targetRole,targetMon,'P7_ABILITY','guard-dog');
  checkOpportunist(s,targetRole,targetMon,'attack',1,C,events);
  return {attack:{appliedDelta:1,blockedReason:null}};
 }

 if(isFoe&&ab==='mirror-armor'&&!options.isReflected){
  const dropsToReflect={};
  const remainingChanges={};
  let hasDrops=false;
  for(const [statKey,delta] of Object.entries(statChanges)){
   if(delta<0){
    dropsToReflect[statKey]=delta;
    hasDrops=true;
   }else{
    remainingChanges[statKey]=delta;
   }
  }
  if(hasDrops){
   tell(C,events,targetRole,targetMon,'P7_ABILITY','mirror-armor');
   if(sourceMon&&sourceMon.currentHp>0){
    modifyStages(s,sourceRole,sourceMon,dropsToReflect,targetRole,targetMon,'mirror-armor',C,events,{isReflected:true});
   }
  }
  if(Object.keys(remainingChanges).length===0)return {};
  statChanges=remainingChanges;
 }

 const effectiveChanges={};
 const isContrary=ab==='contrary';
 for(const [statKey,delta] of Object.entries(statChanges)){
  effectiveChanges[statKey]=isContrary?-delta:delta;
 }

 const reports={};
 let anyStatLowered=false;
 const raisedStats=[];

 for(const [statKey,effDelta] of Object.entries(effectiveChanges)){
  if(effDelta===0)continue;
  const report=C.applyStatStageChange(targetMon,statKey,effDelta);
  events.push({
   type:'STAT_STAGE_CHANGED',
   ...report,
   combatant:targetRole,
   pokemonName:targetMon.name,
   statKey
  });
  reports[statKey]=report;
  if(effDelta<0&&report.appliedDelta<0)anyStatLowered=true;
  if(effDelta>0&&report.appliedDelta>0)raisedStats.push({statKey,boost:report.appliedDelta});
 }

 if(isFoe&&anyStatLowered){
  if(ab==='defiant'){
   C.P6.stage(C,events,targetRole,targetMon,'attack',2);
   tell(C,events,targetRole,targetMon,'P7_ABILITY','defiant');
   checkOpportunist(s,targetRole,targetMon,'attack',2,C,events);
  }else if(ab==='competitive'){
   C.P6.stage(C,events,targetRole,targetMon,'specialAttack',2);
   tell(C,events,targetRole,targetMon,'P7_ABILITY','competitive');
   checkOpportunist(s,targetRole,targetMon,'specialAttack',2,C,events);
  }
 }

 if(reason==='intimidate'&&ab==='rattled'){
  C.P6.stage(C,events,targetRole,targetMon,'speed',1);
  tell(C,events,targetRole,targetMon,'P7_ABILITY','rattled');
  checkOpportunist(s,targetRole,targetMon,'speed',1,C,events);
 }

 if(raisedStats.length>0&&!options.isOpportunistCopy){
  for(const {statKey,boost} of raisedStats){
   checkOpportunist(s,targetRole,targetMon,statKey,boost,C,events);
  }
 }

 return reports;
}
function fieldWeather(s){return ['player','enemy'].some(r=>activeMons(s,r).some(m=>['cloud-nine','air-lock'].includes(ability(m))))?null:s.weather?.id||null;}
function grounded(m){return !m?.types?.includes('flying')&&ability(m)!=='levitate';}
function hasNeutralizingGas(s,excludingMon=null){if(!s)return false;for(const r of ['player','enemy']){const side=s.doublesTeams?.[r]||s[r];if(!side)continue;const team=side.team||[side];const activeIndices=s.battleFormat==='DOUBLES'&&side.activeIndices?side.activeIndices:[side.activeIndex||0];for(const idx of activeIndices){const m=team[idx];if(m&&m!==excludingMon&&m.currentHp>0&&m.ability==='neutralizing-gas')return true;}}return false;}
function triggerOnEntryAbility(s,r,m,a,C,events){if(!m||m.currentHp<=0||!a)return;if(a==='intrepid-sword'&&!m.intrepidSwordUsed){m.intrepidSwordUsed=true;C.P6.stage(C,events,r,m,'attack',1);tell(C,events,r,m,'P7_ABILITY',a);checkOpportunist(s,r,m,'attack',1,C,events);}if(a==='dauntless-shield'&&!m.dauntlessShieldUsed){m.dauntlessShieldUsed=true;C.P6.stage(C,events,r,m,'defense',1);tell(C,events,r,m,'P7_ABILITY',a);checkOpportunist(s,r,m,'defense',1,C,events);}if(['pressure','unnerve','as-one-spectrier','as-one-glastrier'].includes(a))tell(C,events,r,m,'P7_ABILITY',a);if(a==='download'){const foes=activeMons(s,foe(r)).filter(t=>t&&t.currentHp>0);if(foes.length>0){let totDef=0,totSpD=0;for(const fMon of foes){totDef+=C.getEffectiveStat(fMon,'defense');totSpD+=C.getEffectiveStat(fMon,'specialDefense');}const statKey=totDef>=totSpD?'specialAttack':'attack';modifyStages(s,r,m,{[statKey]:1},r,m,'download',C,events);tell(C,events,r,m,'P7_ABILITY','download');}}if(a==='wind-rider'&&s.p6Sides?.[r]?.tailwind){modifyStages(s,r,m,{attack:1},r,m,'wind-rider',C,events);tell(C,events,r,m,'P7_ABILITY','wind-rider');}if(a==='intimidate'){for(const other of activeMons(s,foe(r))){const oAb=ability(other);if(['clear-body','white-smoke','full-metal-body','hyper-cutter','inner-focus','own-tempo'].includes(oAb)){tell(C,events,foe(r),other,'P7_ABILITY',oAb);continue;}modifyStages(s,foe(r),other,{attack:-1},r,m,'intimidate',C,events);}tell(C,events,r,m,'P7_ABILITY',a);}const weather={drizzle:'rain',drought:'sun','sand-stream':'sand','snow-warning':'snow'}[a];if(weather)setWeather(s,weather,m,C,events,r);const terrain={'electric-surge':'electric','grassy-surge':'grassy','misty-surge':'misty','psychic-surge':'psychic'}[a];if(terrain)setTerrain(s,terrain,m,C,events,r);}
function checkTrace(s,r,m,C,events){if(!m||m.currentHp<=0||m.ability!=='trace')return;if(m.abilitySuppressed||m.neutralizingGasSuppressed)return;const foes=activeMons(s,foe(r));const target=foes.find(t=>t&&t.currentHp>0&&t.ability&&!untraceableAbilities.includes(t.ability)&&!held(t,'ability-shield'));if(!target)return;const copied=target.ability;m.originalAbility||='trace';m.ability=copied;events.push({type:'TRACE_COPIED',target:r,pokemonName:m.name,copiedAbility:copied,from:foe(r),fromName:target.name});tell(C,events,r,m,'P7_ABILITY','trace');sync(s);triggerOnEntryAbility(s,r,m,copied,C,events);Special.updateFieldAbilities(s,C,events);}
function checkTraceAll(s,C,events){for(const r of ['player','enemy'])for(const m of activeMons(s,r))if(m&&m.currentHp>0&&m.ability==='trace')checkTrace(s,r,m,C,events);}
function gasEndsCheck(s,leavingMon,C,events){if(!s)return;let gasRemains=false;for(const r of ['player','enemy']){const side=s.doublesTeams?.[r]||s[r];if(!side)continue;const team=side.team||[side];const activeIndices=s.battleFormat==='DOUBLES'&&side.activeIndices?side.activeIndices:[side.activeIndex||0];for(const idx of activeIndices){const mon=team[idx];if(mon&&mon!==leavingMon&&mon.currentHp>0&&mon.ability==='neutralizing-gas'){gasRemains=true;break;}}if(gasRemains)break;}if(!gasRemains&&(s.neutralizingGasActive||leavingMon?.ability==='neutralizing-gas'||s.neutralizingGasAnnounced)){s.neutralizingGasActive=false;delete s.neutralizingGasAnnounced;events.push({type:'NEUTRALIZING_GAS_ENDED'});tell(C,events,'player',leavingMon||get(s,'player'),'P7_ABILITY','neutralizing-gas:ended');sync(s,leavingMon);for(const r of ['player','enemy'])for(const mon of activeMons(s,r)){if(mon&&mon.currentHp>0){const abName=ability(mon);if((abName==='thermal-exchange'||abName==='water-bubble')&&mon.statusCondition==='burn'){mon.statusCondition=null;events.push({type:'STATUS_CURED',target:r,pokemonName:mon.name,statusCondition:'burn',reason:abName==='water-bubble'?'WATER_BUBBLE':'THERMAL_EXCHANGE'});tell(C,events,r,mon,'P7_ABILITY',abName);}if(abName==='supreme-overlord'&&mon.supremeOverlordFallen===undefined){const team=(s.doublesTeams?.[r]||s[r])?.team||[mon];const fallen=Math.min(5,team.filter(t=>t&&t!==mon&&t.currentHp<=0).length);mon.supremeOverlordFallen=fallen;if(fallen>0){events.push({type:'SUPREME_OVERLORD_ACTIVATED',target:r,pokemonName:mon.name,fallen});tell(C,events,r,mon,'P7_ABILITY','supreme-overlord');}}}}Special.updateFieldAbilities(s,C,events);checkTraceAll(s,C,events);}}
function sync(s,excludingMon=null){const gasActive=hasNeutralizingGas(s,excludingMon);s.neutralizingGasActive=gasActive;const weather=fieldWeather(s),terrain=s.terrain?.id||null;for(const r of ['player','enemy']){const hasTailwind=Boolean(s.p6Sides?.[r]?.tailwind);for(const m of ((s.doublesTeams?.[r]||s[r])?.team||[s[r]])){if(!m)continue;const isGasBearer=m.ability==='neutralizing-gas',isImmune=held(m,'ability-shield')||unsuppressibleGasAbilities.includes(m.ability);m.neutralizingGasSuppressed=Boolean(gasActive&&m.currentHp>0&&!isGasBearer&&!isImmune);m.envWeather=weather;m.envTerrain=terrain;m.grounded=grounded(m);m.p7MagicGuard=ability(m)==='magic-guard';m.p7AbilityTrap=false;m.p7KeenEyeAccuracyBlock=ability(m)==='keen-eye';m.tailwindActive=hasTailwind;}}for(const r of ['player','enemy'])for(const m of activeMons(s,r))m.p7AbilityTrap=activeMons(s,foe(r)).some(other=>{const a=ability(other);return Boolean(other.currentHp>0&&((a==='shadow-tag'&&ability(m)!=='shadow-tag')||(a==='arena-trap'&&grounded(m))||(a==='magnet-pull'&&m.types.includes('steel'))));});}
function setWeather(s,id,source,C,events,r){if(s.weather?.id===id)return false;const rock={rain:'damp-rock',sun:'heat-rock',sand:'smooth-rock',snow:'icy-rock'}[id];s.weather={id,turns:held(source,rock)?8:5};sync(s);tell(C,events,r,source,'P7_WEATHER',id);Special.updateFieldAbilities(s,C,events);return true;}
function setTerrain(s,id,source,C,events,r){if(s.terrain?.id===id)return false;s.terrain={id,turns:held(source,'terrain-extender')?8:5};sync(s);tell(C,events,r,source,'P7_TERRAIN',id);Special.updateFieldAbilities(s,C,events);return true;}
function start(s,C){if(s.p7Started)return;s.p7Started=true;Special.start(s);s.weather=null;s.terrain=null;s.initialP7Events=[];sync(s);for(const r of ['player','enemy'])for(const m of activeMons(s,r))if(m&&m.currentHp>0&&m.ability==='neutralizing-gas'&&!s.neutralizingGasAnnounced){s.neutralizingGasAnnounced=true;s.neutralizingGasActive=true;s.initialP7Events.push({type:'NEUTRALIZING_GAS_STARTED',source:r,pokemonName:m.name});tell(C,s.initialP7Events,r,m,'P7_ABILITY','neutralizing-gas');sync(s);Special.updateFieldAbilities(s,C,s.initialP7Events);}const order=['player','enemy'].sort((a,b)=>C.getEffectiveStat(get(s,b),'speed')-C.getEffectiveStat(get(s,a),'speed'));if(s.battleFormat==='DOUBLES'){const entries=['player','enemy'].flatMap(r=>s[r].activeIndices.map(i=>({r,i,m:s[r].team[i]}))).sort((a,b)=>C.getEffectiveStat(b.m,'speed')-C.getEffectiveStat(a.m,'speed'));for(const p of entries){s[p.r].activeIndex=p.i;enter(s,p.r,C,s.initialP7Events);}for(const r of ['player','enemy'])s[r].activeIndex=s[r].activeIndices[0];}else for(const r of order)enter(s,r,C,s.initialP7Events);sync(s);}
function enter(s,r,C,events){const m=get(s,r);if(m.currentHp<=0)return;const a=ability(m),other=get(s,foe(r));m.abilityIgnored=false;m.proteanUsed=false;if((a==='neutralizing-gas'||m.ability==='neutralizing-gas')&&!s.neutralizingGasAnnounced){s.neutralizingGasAnnounced=true;s.neutralizingGasActive=true;events.push({type:'NEUTRALIZING_GAS_STARTED',source:r,pokemonName:m.name});tell(C,events,r,m,'P7_ABILITY','neutralizing-gas');sync(s);Special.updateFieldAbilities(s,C,events);}if(a==='trace'){checkTrace(s,r,m,C,events);}else{triggerOnEntryAbility(s,r,m,a,C,events);}if(m.statusCondition==='burn'&&(a==='thermal-exchange'||a==='water-bubble')){m.statusCondition=null;events.push({type:'STATUS_CURED',target:r,pokemonName:m.name,statusCondition:'burn',reason:a==='water-bubble'?'WATER_BUBBLE':'THERMAL_EXCHANGE'});tell(C,events,r,m,'P7_ABILITY',a);}if(a==='supreme-overlord'){const team=(s.doublesTeams?.[r]||s[r])?.team||[m];const fallen=Math.min(5,team.filter(t=>t&&t!==m&&t.currentHp<=0).length);m.supremeOverlordFallen=fallen;if(fallen>0){events.push({type:'SUPREME_OVERLORD_ACTIVATED',target:r,pokemonName:m.name,fallen});tell(C,events,r,m,'P7_ABILITY','supreme-overlord');}}checkItem(s,r,C,events);Special.enter(s,r,C,events);sync(s);refreshBerries(s,C,events);}
function leave(s,r,m,C,events){Special.leave(m,false);const a=ability(m);if(m.currentHp>0&&a==='regenerator')C.P6.heal(events,r,m,Math.max(1,Math.floor(Special.baseMaxHp(m)/3)));if(m.currentHp>0&&a==='natural-cure'&&m.statusCondition){const status=m.statusCondition;m.statusCondition=null;m.sleepTurns=0;m.sleepCounter=0;m.toxicStage=0;events.push({type:'STATUS_CURED',target:r,pokemonName:m.name,statusCondition:status,reason:'NATURAL_CURE'});}if(m.currentHp>0&&!m.transformOriginal&&(m.id===964||m.speciesId===964||m.name==='palafin-zero')&&a==='zero-to-hero'&&!m.zeroToHeroTransformed){Special.triggerZeroToHero(m,s,r,C,events);}if(m.originalAbility){m.ability=m.originalAbility;m.originalAbility=null;}if(m.ability==='neutralizing-gas'){gasEndsCheck(s,m,C,events);}delete m.supremeOverlordFallen;m.choiceLock=null;m.abilitySuppressed=false;m.neutralizingGasSuppressed=false;m.flashFire=false;m.charge=false;m.abilityIgnored=false;m.p7AbilityTrap=false;m.proteanUsed=false;m.switchedInThisTurn=false;}
function stat(m,key,move=null,defender=null){let f=1;const a=ability(m,Boolean(m.abilityIgnored)),w=m.envWeather;
 if(key==='attack'){if(held(m,'choice-band'))f*=1.5;if(a==='gorilla-tactics'&&!m.dynamax)f*=1.5;if(['huge-power','pure-power'].includes(a))f*=2;if(a==='guts'&&m.statusCondition)f*=1.5;if(a==='hustle')f*=1.5;if(a==='steelworker'&&move?.type==='steel')f*=1.5;if(a==='rocky-payload'&&move?.type==='rock')f*=1.5;if(a==='water-bubble'&&move?.type==='water')f*=2;if(a==='stakeout'&&defender?.switchedInThisTurn)f*=2;}
 if(key==='defense'){if(a==='fur-coat')f*=2;if(a==='marvel-scale'&&m.statusCondition&&['burn','poison','toxic','paralysis','sleep','freeze'].includes(m.statusCondition))f*=1.5;}
 if(key==='specialAttack'){if(held(m,'choice-specs'))f*=1.5;if(a==='solar-power'&&w==='sun')f*=1.5;if(a==='steelworker'&&move?.type==='steel')f*=1.5;if(a==='rocky-payload'&&move?.type==='rock')f*=1.5;if(a==='water-bubble'&&move?.type==='water')f*=2;if(a==='stakeout'&&defender?.switchedInThisTurn)f*=2;}
 if(key==='specialDefense'){if(held(m,'assault-vest'))f*=1.5;if(w==='sand'&&m.types.includes('rock'))f*=1.5;}
 if(key==='defense'&&w==='snow'&&m.types.includes('ice'))f*=1.5;
 if(a==='defeatist'&&m.currentHp<=m.maxHp/2&&['attack','specialAttack'].includes(key))f*=0.5;
 if(key==='speed'){if(held(m,'choice-scarf'))f*=1.5;if(m.tailwindActive)f*=2;if((a==='swift-swim'&&w==='rain')||(a==='chlorophyll'&&w==='sun')||(a==='sand-rush'&&w==='sand')||(a==='slush-rush'&&['snow','hail'].includes(w)))f*=2;}return f;
}
function priority(m,move,C){let p=move?.id===803&&m.envTerrain==='grassy'&&grounded(m)?1:C.getMovePriority(move);if(ability(m,Boolean(m.abilityIgnored))==='prankster'&&!m.abilitySuppressed&&move?.damageClass==='status')p+=1;return p;}
function statusImmune(m,status){if(status==='freeze'&&m.envWeather==='sun')return true;const a=ability(m,Boolean(m.abilityIgnored));if(grounded(m)){if(m.envTerrain==='misty')return true;if(m.envTerrain==='electric'&&status==='sleep')return true;}
 if(a==='shields-down'&&[774,10130,10131,10132,10133,10134,10135].includes(Number(m.formSpeciesId||m.id))&&!m.transformOriginal&&['burn','poison','toxic','paralysis','sleep','freeze'].includes(status))return true;
 return (status==='poison'||status==='toxic')&&a==='immunity'||status==='paralysis'&&a==='limber'||status==='sleep'&&['insomnia','vital-spirit'].includes(a)||status==='burn'&&(a==='water-veil'||a==='thermal-exchange'||a==='water-bubble')||status==='freeze'&&a==='magma-armor'||status==='confusion'&&a==='own-tempo';}
const typeChangerExemptIds=new Set([449,546,718,311,805,165,756,236]);
function isTypeChangerExempt(a,m){
 if(!m)return true;
 if(typeChangerExemptIds.has(m.id))return true;
 if(m.id===851&&a?.tera)return true;
 if(m.p8Z&&m.damageClass!=='status')return true;
 return false;
}
let battleConstants=null;
const recklessMovesSet=new Set(['light-of-ruin','take-down','double-edge','submission','brave-bird','flare-blitz','wood-hammer','head-smash','volt-tackle','wild-charge','head-charge','wave-crash','high-jump-kick','jump-kick','axe-kick','supercell-slam']);
function isRecklessMove(m){
 if(!m)return false;
 if(Boolean(m.recoilRatio>0||m.recoil||m.hasCrashDamage||m.flags?.recoil))return true;
 const name=String(m.name||'').trim().toLowerCase();
 if(recklessMovesSet.has(name))return true;
 if(!battleConstants&&typeof module!=='undefined'&&module.exports){try{battleConstants=require('./battle-constants.js');}catch(_){battleConstants=null;}}
 const ratio=battleConstants?.getRecoilRatio?.(m);
 return typeof ratio==='number'&&ratio>0;
}
function originalMoveType(m){
 if(!m)return 'normal';
 if(m.originalType)return m.originalType;
 if(m.baseType)return m.baseType;
 if(moves[m.id]?.type)return moves[m.id].type;
 if(!battleConstants&&typeof module!=='undefined'&&module.exports){
  try{battleConstants=require('./battle-constants.js');}catch(_){battleConstants=null;}
 }
 const catalog=battleConstants?.KNOWN_CATALOG_MOVES||(typeof window!=='undefined'?(window.PBABattleConstants?.KNOWN_CATALOG_MOVES||window.PBABattle?.KNOWN_CATALOG_MOVES):null);
 if(catalog?.[m.id]?.type)return catalog[m.id].type;
 return m.type||'normal';
}
function isConvertedByAbility(a,m){
 const ab=ability(a);
 if(!ab||isTypeChangerExempt(a,m))return false;
 const base=originalMoveType(m);
 if(ab==='normalize')return true;
 if(base==='normal'&&['refrigerate','pixilate','aerilate','galvanize'].includes(ab))return true;
 if(ab==='liquid-voice'&&(MoveFlags?.isSoundMove?.(m)||m?.flags?.sound||m?.isSound))return true;
 return false;
}
function moveType(s,a,m,fallback){const item=items[a?.item],w=s?fieldWeather(s):a?.envWeather,t=s?.terrain?.id||a?.envTerrain;
 let type=fallback||m?.type||'normal';
 if(m?.id===449&&item?.kind==='plate')type=item.type;
 else if(m?.id===546&&item?.kind==='drive')type=item.type;
 else if(m?.id===718&&item?.kind==='memory')type=item.type;
 else if(m?.id===311&&w)type={rain:'water',sun:'fire',sand:'rock',snow:'ice',hail:'ice'}[w]||type;
 else if(m?.id===805&&grounded(a)&&t)type={electric:'electric',grassy:'grass',misty:'fairy',psychic:'psychic'}[t]||type;

 const ab=ability(a);
 if(!ab||isTypeChangerExempt(a,m))return type;
 if(ab==='normalize')return 'normal';
 if(ab==='refrigerate'&&type==='normal')return 'ice';
 if(ab==='pixilate'&&type==='normal')return 'fairy';
 if(ab==='aerilate'&&type==='normal')return 'flying';
 if(ab==='galvanize'&&type==='normal')return 'electric';
 if(ab==='liquid-voice'&&(MoveFlags?.isSoundMove?.(m)||m?.flags?.sound||m?.isSound))return 'water';
 return type;
}
function power(s,a,d,m,n){const w=s?fieldWeather(s):a.envWeather,t=s?.terrain?.id||a.envTerrain,ab=ability(a),type=m.type;let f=1;
 if(m.id===311&&w)n=100;if(m.id===805&&grounded(a)&&t)n=100;if(m.id===76&&w&&w!=='sun')f*=0.5;if(m.id===875&&t==='electric')f*=1.5;
 if(m.id===282&&d.item&&removable(d))f*=1.5;
 if((ab==='overgrow'&&type==='grass'||ab==='blaze'&&type==='fire'||ab==='torrent'&&type==='water'||ab==='swarm'&&type==='bug')&&a.currentHp<=a.maxHp/3)f*=1.5;
 if(ab==='technician'&&n<=60)f*=1.5;if(ab==='sand-force'&&w==='sand'&&['rock','ground','steel'].includes(type))f*=1.3;if(a.flashFire&&ab==='flash-fire'&&type==='fire')f*=1.5;
 if(a.charge&&type==='electric')f*=2;
 if(ab==='supreme-overlord'){
  const fallen=a.supremeOverlordFallen!==undefined?a.supremeOverlordFallen:Math.min(5,((s?.player?.team?.includes(a)?s.player:(s?.enemy?.team?.includes(a)?s.enemy:(s?.doublesTeams?.player?.team?.includes(a)?s.doublesTeams.player:(s?.doublesTeams?.enemy?.team?.includes(a)?s.doublesTeams.enemy:null))))?.team||[]).filter(t=>t&&t!==a&&t.currentHp<=0).length);
  if(fallen>0){const mods=[4096,4506,4915,5325,5734,6144];f*=mods[Math.min(5,fallen)]/4096;}
 }
 if(ab==='iron-fist'&&Boolean(MoveFlags?.isPunchMove?.(m)||m?.flags?.punch))f*=4915/4096;
 if(ab==='strong-jaw'&&Boolean(MoveFlags?.isBiteMove?.(m)||m?.flags?.bite))f*=1.5;
 if(ab==='tough-claws'&&Boolean(MoveFlags?.isContactMove?.(m)||m?.flags?.contact||m?.isContact))f*=5325/4096;
 if(ab==='sharpness'&&Boolean(MoveFlags?.isSlicingMove?.(m)||m?.flags?.slicing))f*=1.5;
 if(ab==='mega-launcher'&&Boolean(MoveFlags?.isPulseMove?.(m)||m?.flags?.pulse)&&m?.damageClass!=='status')f*=1.5;
 if(ab==='punk-rock'&&Boolean(MoveFlags?.isSoundMove?.(m)||m?.flags?.sound)&&m?.damageClass!=='status')f*=5325/4096;
 if(ab==='toxic-boost'&&['poison','toxic'].includes(a.statusCondition)&&m?.damageClass==='physical')f*=1.5;
 if(ab==='flare-boost'&&a.statusCondition==='burn'&&m?.damageClass==='special')f*=1.5;
 if(ab==='reckless'&&isRecklessMove(m)&&m?.damageClass!=='status')f*=4915/4096;
 if(ab==='analytic'&&(d?.actedThisTurn||d?.switchedInThisTurn)&&m?.damageClass!=='status')f*=5325/4096;
 if(items[a.item]?.kind==='plate'&&items[a.item].type===type)f*=1.2;
 if(grounded(a)&&((t==='electric'&&type==='electric')||(t==='grassy'&&type==='grass')||(t==='psychic'&&type==='psychic')))f*=1.3;
 if(typeof n==='number'&&n>0&&!isTypeChangerExempt(a,m)){
  if(ab==='normalize')f*=1.2;
  else if(['refrigerate','pixilate','aerilate','galvanize'].includes(ab)&&originalMoveType(m)==='normal')f*=1.2;
 }
 return n===null?null:n*f;
}
function hasAura(s,a,d,name){const mons=s?['player','enemy'].flatMap(r=>activeMons(s,r)).filter(m=>m&&m.currentHp>0):[a,d].filter(m=>m&&m.currentHp>0);return mons.some(m=>!m.abilitySuppressed&&m.ability===name);}
function damageMultiplier(s,a,d,m,effectiveness=1){const w=s?fieldWeather(s):a.envWeather,t=s?.terrain?.id||a.envTerrain,ab=defenderAbility(a,d,m);let f=1;
 if(w==='sun'){if(m.type==='fire')f*=1.5;if(m.type==='water')f*=0.5;}if(w==='rain'){if(m.type==='water')f*=1.5;if(m.type==='fire')f*=0.5;}
 if(grounded(d)&&t==='misty'&&m.type==='dragon')f*=0.5;if(grounded(d)&&t==='grassy'&&[89,222,523].includes(m.id))f*=0.5;
 if(held(a,'life-orb'))f*=1.3;if(ab==='thick-fat'&&['fire','ice'].includes(m.type))f*=0.5;if(['filter','solid-rock'].includes(ab)&&effectiveness>1)f*=0.75;if(ab==='multiscale'&&d.currentHp===d.maxHp)f*=0.5;
 if(ab==='heatproof'&&m.type==='fire')f*=0.5;
 if(ab==='water-bubble'&&m.type==='fire')f*=0.5;
 if(ab==='ice-scales'&&(m.damageClass==='special'||m.category==='Special'))f*=0.5;
 if(ab==='fluffy'){
  const isContact=Boolean(MoveFlags?.isContactMove?.(m)||m?.flags?.contact||m?.isContact);
  const isFire=(m.type==='fire');
  if(isFire&&isContact)f*=1;
  else if(isFire)f*=2;
  else if(isContact)f*=0.5;
 }
 if(ab==='punk-rock'&&Boolean(MoveFlags?.isSoundMove?.(m)||m?.flags?.sound))f*=0.5;
 if(!d?.abilitySuppressed&&!d?.neutralizingGasSuppressed&&d?.ability==='shadow-shield'&&d.currentHp>=d.maxHp)f*=0.5;
 const aa=ability(a);
 if(aa==='tinted-lens'&&effectiveness<1&&effectiveness>0)f*=2;
 const breakActive=hasAura(s,a,d,'aura-break');
 if(m.type==='dark'&&hasAura(s,a,d,'dark-aura'))f*=breakActive?0.75:(4/3);
 if(m.type==='fairy'&&hasAura(s,a,d,'fairy-aura'))f*=breakActive?0.75:(4/3);
 if(!d?.abilitySuppressed&&d?.ability==='prism-armor'&&effectiveness>1)f*=0.75;
 if(!a?.abilitySuppressed&&a?.ability==='neuroforce'&&effectiveness>1)f*=1.25;
 return f;
}
function accuracy(m,a,d,base){const w=a.envWeather;if([87,542].includes(m.id)){if(w==='rain')return null;if(w==='sun')base=50;}if(m.id===59&&['snow','hail'].includes(w)||m.id===831&&w==='rain')return null;const ab=ability(d,Boolean(d.abilityIgnored));if(ab==='sand-veil'&&w==='sand'||ab==='snow-cloak'&&['snow','hail'].includes(w))return base===null?null:Math.floor(base*0.8);const aa=ability(a);if(aa==='hustle'&&m.damageClass==='physical')base=base===null?null:Math.floor(base*3277/4096);if(aa==='compound-eyes'&&typeof base==='number')base=Math.floor(base*5325/4096);if(ab==='tangled-feet'&&d?.confusionTurns>0&&typeof base==='number')base=Math.floor(base*0.5);return base;}
function instantCharge(s,a,m){return m.id===76&&(s?fieldWeather(s):a.envWeather)==='sun'||held(a,'power-herb');}
function consume(C,events,r,m,label=m.item){if(!m.item)return;const item=m.item;m.item=null;tell(C,events,r,m,'P7_ITEM',label||item);}
function removable(m){const def=items[m.item],species=Data.speciesIds[Special.species(m)]||Special.species(m);return Boolean(m.item)&&!Special.specialItems[m.item]&&!(def?.kind==='plate'&&species===493)&&!(def?.kind==='drive'&&species===649)&&!(def?.kind==='memory'&&species===773);}
function takeItem(s,r,move,C,events){const a=get(s,r),d=get(s,foe(r));if(!removable(d))return;const item=d.item;if(move.id===168){if(a.item)return;a.item=item;d.item=null;tell(C,events,r,a,'P7_ITEM','thief:'+item);}else if(move.id===282){d.item=null;tell(C,events,foe(r),d,'P7_ITEM','removed:'+item);}else if(move.id===510&&item.endsWith('-berry')){d.item=null;tell(C,events,foe(r),d,'P7_ITEM','burned:'+item);}else if(move.id===450&&item.endsWith('-berry')){d.item=null;berryEffect(a,item,C,events,r);tell(C,events,r,a,'P7_ITEM','eaten:'+item);}sync(s);}
function cure(C,events,r,m){if(m.statusCondition){const status=m.statusCondition;m.statusCondition=null;m.sleepTurns=0;m.sleepCounter=0;m.toxicStage=0;events.push({type:'STATUS_CURED',target:r,pokemonName:m.name,statusCondition:status,reason:'ITEM'});}if(m.confusionTurns){m.confusionTurns=0;events.push({type:'CONFUSION_ENDED',target:r,pokemonName:m.name,reason:'ITEM'});}}
function berryEffect(m,item,C,events,r){if(item==='sitrus-berry')C.P6.heal(events,r,m,Math.max(1,Math.floor(Special.baseMaxHp(m)/4)));else if(item==='oran-berry')C.P6.heal(events,r,m,10);else if(item==='lum-berry'||({'chesto-berry':'sleep','pecha-berry':'poison','rawst-berry':'burn','aspear-berry':'freeze','cheri-berry':'paralysis'}[item]===m.statusCondition)||item==='pecha-berry'&&m.statusCondition==='toxic')cure(C,events,r,m);}
function checkItem(s,r,C,events,m=get(s,r)){if(m.currentHp<=0||m.item?.endsWith('-berry')&&berriesBlocked(s,r))return;const item=m.item;if((['sitrus-berry','oran-berry'].includes(item)&&m.currentHp<=m.maxHp/2)||(item==='lum-berry'&&(m.statusCondition||m.confusionTurns))||({'chesto-berry':'sleep','pecha-berry':'poison','rawst-berry':'burn','aspear-berry':'freeze','cheri-berry':'paralysis'}[item]===m.statusCondition&&m.statusCondition)||item==='pecha-berry'&&m.statusCondition==='toxic'){consume(C,events,r,m,item);berryEffect(m,item,C,events,r);}}
function tryHit(s,r,m,C,events){const a=get(s,r),d=get(s,foe(r)),ab=defenderAbility(a,d,m);if(m.target==='self'||m.target==='foeSide')return false;
 const isWind=Boolean(MoveFlags?.isWindMove?.(m)||m?.flags?.wind);
 if(ab==='wind-rider'&&isWind&&a!==d){modifyStages(s,foe(r),d,{attack:1},r,a,'wind-rider',C,events);events.push({type:'MOVE_FAILED',actor:r,target:foe(r),pokemonName:a.name,moveId:m.id,moveName:m.name,reason:'P7_IMMUNE',label:'wind-rider'});tell(C,events,foe(r),d,'P7_ABILITY','wind-rider');return true;}
 const immunities={'water-absorb':'water','volt-absorb':'electric','motor-drive':'electric','flash-fire':'fire','sap-sipper':'grass','lightning-rod':'electric','storm-drain':'water'};
 let blocked=immunities[ab]===m.type||ab==='levitate'&&m.type==='ground'||ab==='sturdy'&&C.P5.ohko(m);
 if(s.terrain?.id==='psychic'&&grounded(d)&&priority(a,m,C)>0)blocked=true;
 if(!blocked)return false;
 if(['water-absorb','volt-absorb'].includes(ab)&&immunities[ab]===m.type)C.P6.heal(events,foe(r),d,Math.max(1,Math.floor(Special.baseMaxHp(d)/4)));
 if(ab==='motor-drive')modifyStages(s,foe(r),d,{speed:1},r,a,'motor-drive',C,events);
 if(ab==='flash-fire')d.flashFire=true;if(ab==='sap-sipper')C.P6.stage(C,events,foe(r),d,'attack',1);if(['lightning-rod','storm-drain'].includes(ab))C.P6.stage(C,events,foe(r),d,'specialAttack',1);
 events.push({type:'MOVE_FAILED',actor:r,target:foe(r),pokemonName:a.name,moveId:m.id,moveName:m.name,reason:'P7_IMMUNE',label:ab||'psychic-terrain'});tell(C,events,foe(r),d,'P7_ABILITY',ab||'psychic-terrain');return true;
}
function survive(s,r,move,n,C,events){const a=get(s,r),d=get(s,foe(r));if(n>=d.currentHp&&d.currentHp===d.maxHp&&(defenderAbility(a,d,move)==='sturdy'||held(d,'focus-sash'))){if(defenderAbility(a,d,move)!=='sturdy')consume(C,events,foe(r),d,'focus-sash');else tell(C,events,foe(r),d,'P7_ABILITY','sturdy');return Math.max(0,d.currentHp-1);}return n;}
function checkSynchronize(s,sourceRole,targetRole,statusCondition,C,events,sourceMon=null,targetMon=null){
 if(!['burn','paralysis','poison','toxic'].includes(statusCondition))return;
 const target=targetMon||get(s,targetRole),source=sourceMon||get(s,sourceRole);
 if(!target||!source||target.abilitySuppressed||ability(target)!=='synchronize')return;
 if(source.currentHp<=0||source.statusCondition||source.safeguarded)return;
 if(s?.terrain?.id==='misty'&&grounded(source))return;
 if(!C.isEligibleForStatusCondition(source,statusCondition)||statusImmune(source,statusCondition))return;
 source.statusCondition=statusCondition;
 if(statusCondition==='toxic')source.toxicStage=0;
 events.push({type:'STATUS_APPLIED',target:sourceRole,source:targetRole,pokemonName:source.name,statusCondition,reason:'synchronize'});
 tell(C,events,targetRole,target,'P7_ABILITY','synchronize');
}
function contact(s,r,m,action,C,events,attacker=null,defender=null){
 const isContact=Boolean(C.MoveFlags?.isContactMove?C.MoveFlags.isContactMove(m,C.P5?.contactIds):C.P5?.contactIds?.includes(m.id));
 if(!isContact)return;
 const a=attacker||get(s,r),d=defender||get(s,foe(r));
 const ab=(d.abilitySuppressed||d.neutralizingGasSuppressed||!supportedAbilities.has(d.ability))?'':d.ability;
 if(ab){
  if(ab==='mummy'){
   const aAb=a.ability;
   if(aAb!=='mummy'&&!held(a,'ability-shield')&&!unoverwritableAbilities.includes(aAb)){
    a.originalAbility||=aAb;
    a.ability='mummy';
    events.push({type:'ABILITY_CHANGED',target:r,pokemonName:a.name,ability:'mummy',source:foe(r),reason:'mummy'});
    tell(C,events,foe(r),d,'P7_ABILITY','mummy');
   }
  }
  if(ab==='lingering-aroma'){
   const aAb=a.ability;
   if(aAb!=='lingering-aroma'&&!held(a,'ability-shield')&&!unoverwritableAbilities.includes(aAb)){
    a.originalAbility||=aAb;
    a.ability='lingering-aroma';
    events.push({type:'ABILITY_CHANGED',target:r,pokemonName:a.name,ability:'lingering-aroma',source:foe(r),reason:'lingering-aroma'});
    tell(C,events,foe(r),d,'P7_ABILITY','lingering-aroma');
   }
  }
  if(ab==='wandering-spirit'&&d.currentHp>0&&a.currentHp>0){
   const aAb=a.ability,dAb=d.ability;
   if(aAb!==dAb&&!held(a,'ability-shield')&&!held(d,'ability-shield')&&!unswappableAbilities.includes(aAb)){
    a.originalAbility||=aAb;
    d.originalAbility||=dAb;
    a.ability=dAb;
    d.ability=aAb;
    events.push({type:'ABILITIES_SWAPPED',user:foe(r),target:r,userAbility:dAb,targetAbility:aAb,reason:'wandering-spirit'});
    tell(C,events,foe(r),d,'P7_ABILITY','wandering-spirit');
   }
  }
  if(['rough-skin','iron-barbs'].includes(ab)&&a.currentHp>0&&ability(a)!=='magic-guard'){
   const previousHp=a.currentHp,dmg=Math.max(1,Math.floor(Special.baseMaxHp(a)/8)),recoil=Math.min(previousHp,dmg);
   a.currentHp=Math.max(0,previousHp-recoil);
   events.push({type:'RECOIL_APPLIED',target:r,pokemonName:a.name,damage:recoil,previousHp,currentHp:a.currentHp,maxHp:a.maxHp,reason:ab});
   tell(C,events,foe(r),d,'P7_ABILITY',ab);
  }
  const condition={static:'paralysis','flame-body':'burn','poison-point':'poison'}[ab];
  if(condition&&a.currentHp>0){
   const roll=action.abilityRoll??100;
   if(!Number.isInteger(roll)||roll<1||roll>100)throw new Error('Rolagem de habilidade inválida.');
   if(roll<=30&&!a.safeguarded&&!(s?.terrain?.id==='misty'&&grounded(a))&&C.isEligibleForStatusCondition(a,condition)&&!statusImmune(a,condition)){
    a.statusCondition=condition;
    events.push({type:'STATUS_APPLIED',target:r,source:foe(r),pokemonName:a.name,statusCondition:condition,reason:ab});
    tell(C,events,foe(r),d,'P7_ABILITY',ab);
    checkSynchronize(s,foe(r),r,condition,C,events,d,a);
   }
  }
  if(ab==='effect-spore'&&a.currentHp>0&&!a.statusCondition){
   const isGrass=(a.types||[]).includes('grass'),hasOvercoat=a.ability==='overcoat'||ability(a)==='overcoat',hasSafetyGoggles=held(a,'safety-goggles');
   if(!isGrass&&!hasOvercoat&&!hasSafetyGoggles&&!a.safeguarded&&!(s?.terrain?.id==='misty'&&grounded(a))){
    const roll=action.effectSporeRoll??action.abilityRoll??100;
    if(!Number.isInteger(roll)||roll<1||roll>100)throw new Error('Rolagem de habilidade inválida.');
    if(roll<=30){
     let sporeCondition='poison';
     if(roll>=20)sporeCondition='sleep';
     else if(roll>=10)sporeCondition='paralysis';
     if(C.isEligibleForStatusCondition(a,sporeCondition)&&!statusImmune(a,sporeCondition)){
      if(!(sporeCondition==='sleep'&&s?.terrain?.id==='electric'&&grounded(a))){
       a.statusCondition=sporeCondition;
       if(sporeCondition==='sleep'){const duration=action.sleepDuration??2;a.sleepTurns=duration;a.sleepCounter=duration;}
       events.push({type:'STATUS_APPLIED',target:r,source:foe(r),pokemonName:a.name,statusCondition:sporeCondition,reason:ab});
       tell(C,events,foe(r),d,'P7_ABILITY',ab);
       checkSynchronize(s,foe(r),r,sporeCondition,C,events,d,a);
      }
     }
    }
   }
  }
 }
 if(held(d,'rocky-helmet')&&a.currentHp>0&&ability(a)!=='magic-guard'){
  const previousHp=a.currentHp,dmg=Math.max(1,Math.floor(Special.baseMaxHp(a)/6)),recoil=Math.min(previousHp,dmg);
  a.currentHp=Math.max(0,previousHp-recoil);
  events.push({type:'RECOIL_APPLIED',target:r,pokemonName:a.name,damage:recoil,previousHp,currentHp:a.currentHp,maxHp:a.maxHp,reason:'rocky-helmet'});
  tell(C,events,foe(r),d,'P7_ITEM','rocky-helmet');
 }
}
function statusAction(s,r,m,C,events){const a=get(s,r);if(m.id===366){s.p6Sides||={player:{},enemy:{}};s.p6Sides[r]||={};s.p6Sides[r].tailwind=4;sync(s);events.push({type:'TAILWIND_STARTED',side:r,pokemonName:a.name});tell(C,events,r,a,'P7_SIDE_CONDITION','tailwind');for(const mon of activeMons(s,r)){if(mon&&mon.currentHp>0){const monAb=ability(mon);if(monAb==='wind-power'){mon.charge=true;tell(C,events,r,mon,'P7_ABILITY','wind-power');}else if(monAb==='wind-rider'){modifyStages(s,r,mon,{attack:1},r,mon,'wind-rider',C,events);tell(C,events,r,mon,'P7_ABILITY','wind-rider');}}}return true;}if(weatherMoves[m.id]){if(!setWeather(s,weatherMoves[m.id],a,C,events,r))events.push({type:'MOVE_FAILED',actor:r,pokemonName:a.name,moveName:m.name,reason:'P7_FIELD_EXISTS'});return true;}if(terrainMoves[m.id]){if(!setTerrain(s,terrainMoves[m.id],a,C,events,r))events.push({type:'MOVE_FAILED',actor:r,pokemonName:a.name,moveName:m.name,reason:'P7_FIELD_EXISTS'});return true;}if(m.id===881){setWeather(s,'snow',a,C,events,r);C.P6.requestPivot(s,r,m.id,events);return true;}if(m.id===432&&s.terrain){s.terrain=null;sync(s);tell(C,events,r,a,'P7_TERRAIN','ended');Special.updateFieldAbilities(s,C,events);}return false;}
function afterHit(s,r,m,action,C,events,n,attacker=null,defender=null){if(n<=0)return;const a=attacker||get(s,r),d=defender||get(s,foe(r));if([168,282,450,510].includes(m.id))takeItem(s,r,m,C,events);
 const rawDAb=d.ability,isCottonDownActive=!d.abilitySuppressed&&!d.neutralizingGasSuppressed&&!d.abilityIgnored&&rawDAb==='cotton-down';
 if(isCottonDownActive){let activated=false;for(const sideRole of ['player','enemy'])for(const activeMon of activeMons(s,sideRole))if(activeMon&&activeMon!==d&&activeMon.currentHp>0){if(!activated){tell(C,events,foe(r),d,'P7_ABILITY','cotton-down');activated=true;}modifyStages(s,sideRole,activeMon,{speed:-1},foe(r),d,'cotton-down',C,events);}}
 if(m.type==='dark'&&ability(d)==='justified'&&d.currentHp>0){C.P6.stage(C,events,foe(r),d,'attack',1);tell(C,events,foe(r),d,'P7_ABILITY','justified');checkOpportunist(s,foe(r),d,'attack',1,C,events);}
 if(d.currentHp>0){
  const dAb=ability(d);
  const isCrit=Boolean(action?.critical||action?.isCritical||events.slice(-5).some(e=>e.type==='DAMAGE_APPLIED'&&e.critical));
  if(isCrit&&dAb==='anger-point'){
   const curAtk=d.statStages?.attack||0;
   const needed=6-curAtk;
   if(needed>0){
    C.P6.stage(C,events,foe(r),d,'attack',needed);
    tell(C,events,foe(r),d,'P7_ABILITY','anger-point');
    checkOpportunist(s,foe(r),d,'attack',needed,C,events);
   }
  }
  const moveTypeVal=m.type||originalMoveType(m);
  if(['bug','ghost','dark'].includes(moveTypeVal)&&dAb==='rattled'){
   C.P6.stage(C,events,foe(r),d,'speed',1);
   tell(C,events,foe(r),d,'P7_ABILITY','rattled');
   checkOpportunist(s,foe(r),d,'speed',1,C,events);
  }
  if(dAb==='stamina'){
   modifyStages(s,foe(r),d,{defense:1},r,a,'stamina',C,events);
   tell(C,events,foe(r),d,'P7_ABILITY','stamina');
  }
  if(moveTypeVal==='water'&&dAb==='water-compaction'){
   modifyStages(s,foe(r),d,{defense:2},r,a,'water-compaction',C,events);
   tell(C,events,foe(r),d,'P7_ABILITY','water-compaction');
  }
  if(m.damageClass==='physical'&&dAb==='weak-armor'){
   modifyStages(s,foe(r),d,{defense:-1,speed:2},r,a,'weak-armor',C,events);
   tell(C,events,foe(r),d,'P7_ABILITY','weak-armor');
  }
  if(['fire','water'].includes(moveTypeVal)&&dAb==='steam-engine'){
   modifyStages(s,foe(r),d,{speed:6},r,a,'steam-engine',C,events);
   tell(C,events,foe(r),d,'P7_ABILITY','steam-engine');
  }
  if(dAb==='electromorphosis'){
   d.charge=true;
   tell(C,events,foe(r),d,'P7_ABILITY','electromorphosis');
  }
  if(moveTypeVal==='fire'&&dAb==='thermal-exchange'){
   modifyStages(s,foe(r),d,{attack:1},r,a,'thermal-exchange',C,events);
   tell(C,events,foe(r),d,'P7_ABILITY','thermal-exchange');
  }
  if(Boolean(MoveFlags?.isWindMove?.(m)||m?.flags?.wind)&&dAb==='wind-power'){
   d.charge=true;
   tell(C,events,foe(r),d,'P7_ABILITY','wind-power');
  }
  const halfHp=Math.floor(d.maxHp/2);
  const prevHp=d.currentHp+n;
  if(prevHp>halfHp&&d.currentHp<=halfHp){
   if(dAb==='berserk'){
    modifyStages(s,foe(r),d,{specialAttack:1},foe(r),d,'berserk',C,events);
    tell(C,events,foe(r),d,'P7_ABILITY','berserk');
   }else if(dAb==='anger-shell'){
    modifyStages(s,foe(r),d,{attack:1,specialAttack:1,speed:1,defense:-1,specialDefense:-1},foe(r),d,'anger-shell',C,events);
    tell(C,events,foe(r),d,'P7_ABILITY','anger-shell');
   }
  }
 }
 if(m.id===687&&d.actedThisTurn&&d.currentHp>0&&!held(d,'ability-shield')&&!['multitype','rks-system','stance-change','schooling','disguise','shields-down','comatose','ice-face','gulp-missile','tera-shift','zero-to-hero','zen-mode','battle-bond','power-construct','as-one-spectrier','as-one-glastrier'].includes(d.ability)){d.abilitySuppressed=true;tell(C,events,foe(r),d,'P7_ABILITY','suppressed');}
 if(m.id===861&&s.terrain){s.terrain=null;tell(C,events,r,get(s,r),'P7_TERRAIN','ended');Special.updateFieldAbilities(s,C,events);}contact(s,r,m,action,C,events,a,d);refreshBerries(s,C,events);sync(s);
}
function afterMove(s,r,events,C,batch){const m=get(s,r);if(batch.some(e=>e.type==='MOVE_USED'&&e.actor===r)&&!m.dynamax&&(['choice-band','choice-specs','choice-scarf'].includes(m.item)||ability(m)==='gorilla-tactics')){const used=batch.find(e=>e.type==='MOVE_USED'&&e.actor===r);if(used&&used.moveId!==165)m.choiceLock=used.moveId;}
 const used=batch.find(e=>e.type==='MOVE_USED'&&e.actor===r);
 if(m.charge&&used){
  const usedMoveType=used.moveType||originalMoveType({id:used.moveId,type:used.moveType});
  if(usedMoveType==='electric')m.charge=false;
 }
 if(!['PLAYER_WIN','ENEMY_WIN'].includes(s.status)&&held(m,'life-orb')&&ability(m)!=='magic-guard'&&m.currentHp>0&&batch.some(e=>e.type==='DAMAGE_APPLIED'&&e.source===r&&e.damage>0)){const previousHp=m.currentHp,damage=Math.min(previousHp,Math.max(1,Math.floor(Special.baseMaxHp(m)/10)));m.currentHp-=damage;events.push({type:'RECOIL_APPLIED',target:r,pokemonName:m.name,damage,previousHp,currentHp:m.currentHp,maxHp:m.maxHp,reason:'LIFE_ORB'});}
 refreshBerries(s,C,events);sync(s);
}
function earlyResidual(s,C,events){sync(s);const w=fieldWeather(s);for(const r of ['player','enemy']){const m=get(s,r),ab=ability(m);if(m.currentHp<=0)continue;
 if(ab==='shed-skin'&&m.statusCondition&&['burn','poison','toxic','paralysis','sleep','freeze'].includes(m.statusCondition)){
  const act=s.turnActions?.[r]||{},roll=act.shedSkinRoll??act.abilityRoll??100;
  const isThreeScale=act.shedSkinScale===3||act.scale===3||(act.shedSkinRoll!==undefined&&act.shedSkinRoll<=3);
  const activates=isThreeScale?(roll===1):(roll<=33);
  if(activates){const oldStatus=m.statusCondition;m.statusCondition=null;m.sleepTurns=0;m.sleepCounter=0;m.toxicStage=0;events.push({type:'STATUS_CURED',target:r,pokemonName:m.name,statusCondition:oldStatus,reason:'SHED_SKIN'});tell(C,events,r,m,'P7_ABILITY','shed-skin');}
 }
 if(w==='hail'&&!m.types.includes('ice')&&ab!=='magic-guard')C.P6.hpDamage(events,r,m,Special.baseMaxHp(m)/16,'hail');
 if(w==='sand'&&!m.types.some(t=>['rock','ground','steel'].includes(t))&&!['sand-rush','sand-veil','sand-force','magic-guard'].includes(ab))C.P6.hpDamage(events,r,m,Special.baseMaxHp(m)/16,'sandstorm');
 if(m.currentHp>0&&w==='sun'&&ab==='solar-power')C.P6.hpDamage(events,r,m,Special.baseMaxHp(m)/8,'solar-power');if(m.currentHp>0&&w==='rain'&&ab==='rain-dish')C.P6.heal(events,r,m,Math.max(1,Math.floor(Special.baseMaxHp(m)/16)));
 if(m.currentHp>0&&s.terrain?.id==='grassy'&&grounded(m))C.P6.heal(events,r,m,Math.max(1,Math.floor(Special.baseMaxHp(m)/16)));
 if(m.currentHp>0&&held(m,'leftovers'))C.P6.heal(events,r,m,Math.max(1,Math.floor(Special.baseMaxHp(m)/16)));if(m.currentHp>0&&held(m,'black-sludge')){if(m.types.includes('poison'))C.P6.heal(events,r,m,Math.max(1,Math.floor(Special.baseMaxHp(m)/16)));else C.P6.hpDamage(events,r,m,Special.baseMaxHp(m)/8,'black-sludge');}checkItem(s,r,C,events);
 if(ab==='speed-boost'&&!m.switchedInThisTurn){
  modifyStages(s,r,m,{speed:1},r,m,'speed-boost',C,events);
  tell(C,events,r,m,'P7_ABILITY','speed-boost');
 }
 if(ab==='moody'){
  const act=s.turnActions?.[r]||{};
  const stats=['attack','defense','specialAttack','specialDefense','speed'];
  const curStages=m.statStages||{};
  const boostCandidates=stats.filter(k=>(curStages[k]||0)<6);
  const dropCandidates=stats.filter(k=>(curStages[k]||0)>-6);
  let boostStat=null, dropStat=null;
  if(act.moodyBoostStat&&boostCandidates.includes(act.moodyBoostStat))boostStat=act.moodyBoostStat;
  if(act.moodyDropStat&&dropCandidates.includes(act.moodyDropStat)&&act.moodyDropStat!==boostStat)dropStat=act.moodyDropStat;
  let seed=act.seed??s.seed??(s.turnCount||s.turn||1);
  function nextRng(){seed=(seed*1664525+1013904223)>>>0;return seed;}
  if(!boostStat&&boostCandidates.length>0){
   const bIdx=act.moodyBoostIndex!==undefined?act.moodyBoostIndex:(nextRng()%boostCandidates.length);
   boostStat=boostCandidates[bIdx%boostCandidates.length];
  }
  const validDrops=dropCandidates.filter(k=>k!==boostStat);
  if(!dropStat&&validDrops.length>0){
   const dIdx=act.moodyDropIndex!==undefined?act.moodyDropIndex:(nextRng()%validDrops.length);
   dropStat=validDrops[dIdx%validDrops.length];
  }
  if(s.seed!==undefined)s.seed=seed;
  const changes={};
  if(boostStat)changes[boostStat]=2;
  if(dropStat)changes[dropStat]=-1;
  if(Object.keys(changes).length>0){
   modifyStages(s,r,m,changes,r,m,'moody',C,events);
   tell(C,events,r,m,'P7_ABILITY','moody');
  }
 }
 m.switchedInThisTurn=false;
 }}
function endTurn(s,C,events){for(const key of ['weather','terrain'])if(s[key]&&--s[key].turns===0){s[key]=null;tell(C,events,'player',get(s,'player'),key==='weather'?'P7_WEATHER':'P7_TERRAIN','ended');}for(const r of ['player','enemy'])if(s.p6Sides?.[r]?.tailwind&&--s.p6Sides[r].tailwind===0){delete s.p6Sides[r].tailwind;events.push({type:'TAILWIND_ENDED',side:r});tell(C,events,r,get(s,r),'P7_SIDE_CONDITION','tailwind:ended');}sync(s);Special.updateFieldAbilities(s,C,events);}
function secondary(s,m,original){if(m.id!==290)return original;const t=s.terrain?.id;return t==='grassy'?{chance:30,statusCondition:'sleep'}:t==='misty'?{chance:30,statDrops:{specialAttack:-1}}:t==='psychic'?{chance:30,statDrops:{speed:-1}}:{chance:30,statusCondition:'paralysis'};}
function legalMove(m,move){if(m.dynamax)return !(m.item==='assault-vest'&&move.damageClass==='status');const isLocked=m.choiceLock&&(['choice-band','choice-specs','choice-scarf'].includes(m.item)||ability(m)==='gorilla-tactics');return !(m.item==='assault-vest'&&move.damageClass==='status')&&!(isLocked&&move.id!==m.choiceLock);}
function mustStruggle(m){if(m.dynamax)return false;const isLocked=m.choiceLock&&(['choice-band','choice-specs','choice-scarf'].includes(m.item)||ability(m)==='gorilla-tactics');return !m.rechargeMoveId&&!m.twoTurnMove&&!m.lockedMove&&!m.bideState&&(m.item==='assault-vest'||isLocked)&&!(m.moves||[]).some(n=>n.currentPp>0&&legalMove(m,n));}
function canActivateProtean(attacker,move,moveType){
 if(!attacker||!move)return false;
 const ab=ability(attacker);
 if(ab!=='protean'&&ab!=='libero')return false;
 if(attacker.abilitySuppressed||attacker.tera||attacker.proteanUsed)return false;
 if(Number(move.id)===165)return false;
 const targetType=moveType||move.type;
 if(!targetType||targetType==='???')return false;
 const isAlreadyPure=Array.isArray(attacker.types)&&attacker.types.length===1&&attacker.types[0]===targetType;
 if(isAlreadyPure)return false;
 return true;
}
function activateProtean(s,r,attacker,move,moveType,C,events){
 if(!canActivateProtean(attacker,move,moveType))return false;
 const targetType=moveType||move.type;
 const ab=ability(attacker);
 attacker.types=[targetType];
 attacker.proteanUsed=true;
 attacker.typeChangedByAbility=ab;
 tell(C,events,r,attacker,'P7_ABILITY',ab);
 tell(C,events,r,attacker,'TYPE_CHANGED',targetType);
 return true;
}
function canActivateColorChange(defender,move,damageType,damageDealt,hasActiveSub,bypassesSub){
 if(!defender||!move)return false;
 const ab=ability(defender);
 if(ab!=='color-change')return false;
 if(defender.abilitySuppressed||defender.tera||defender.currentHp<=0)return false;
 if(move.damageClass==='status'||Number(move.id)===165)return false;
 if(damageDealt<=0)return false;
 if(hasActiveSub&&!bypassesSub)return false;
 if(!damageType||damageType==='???')return false;
 if(Array.isArray(defender.types)&&defender.types.includes(damageType))return false;
 return true;
}
function activateColorChange(s,r,defender,move,damageType,C,events){
 if(!canActivateColorChange(defender,move,damageType,1,false,true))return false;
 defender.types=[damageType];
 defender.typeChangedByAbility='color-change';
 tell(C,events,r,defender,'P7_ABILITY','color-change');
 tell(C,events,r,defender,'TYPE_CHANGED',damageType);
 return true;
}
function handleFaint(s,faintedRole,faintedMon,C,events){
 if(!s||!faintedMon)return;
 if(faintedMon.ability==='neutralizing-gas'){
  gasEndsCheck(s,faintedMon,C,events);
 }
 for(const r of ['player','enemy']){
  for(const mon of activeMons(s,r)){
   if(mon&&mon!==faintedMon&&mon.currentHp>0&&ability(mon)==='soul-heart'){
    C.P6.stage(C,events,r,mon,'specialAttack',1);
    tell(C,events,r,mon,'P7_ABILITY','soul-heart');
    checkOpportunist(s,r,mon,'specialAttack',1,C,events);
   }
  }
 }
 const allies=activeMons(s,faintedRole).filter(m=>m!==faintedMon&&m.currentHp>0);
 for(const ally of allies){
  const allyAb=ability(ally);
  if(allyAb==='receiver'||allyAb==='power-of-alchemy'){
   const sourceAb=faintedMon.ability;
   if(sourceAb&&!noReceiverAbilities.includes(sourceAb)&&!held(faintedMon,'ability-shield')){
    ally.originalAbility||=allyAb;
    ally.ability=sourceAb;
    events.push({type:'ABILITY_INHERITED',target:faintedRole,pokemonName:ally.name,inheritedAbility:sourceAb,from:faintedRole,fromName:faintedMon.name,reason:allyAb});
    tell(C,events,faintedRole,ally,'P7_ABILITY',allyAb);
    sync(s);
    triggerOnEntryAbility(s,faintedRole,ally,sourceAb,C,events);
    Special.updateFieldAbilities(s,C,events);
   }
  }
 }
}
const api=Object.freeze({berriesBlocked,refreshBerries,pressureCost,directKO,legalMove,mustStruggle,secondary,Data,abilityNames,items,moves,definitions,statusMoves,weatherMoves,terrainMoves,ability,held,ignored,defenderAbility,natural,defaultAbility,normalizeAbility,normalizeItem,validatePreference,fieldWeather,grounded,sync,start,enter,leave,stat,priority,statusImmune,moveType,power,damageMultiplier,accuracy,instantCharge,consume,removable,takeItem,checkItem,tryHit,survive,contact,checkSynchronize,statusAction,afterHit,afterMove,earlyResidual,endTurn,isConvertedByAbility,isTypeChangerExempt,originalMoveType,canActivateProtean,activateProtean,canActivateColorChange,activateColorChange,handleFaint,hasNeutralizingGas,checkTrace,checkTraceAll,gasEndsCheck,unsuppressibleAbilities,untraceableAbilities,unoverwritableAbilities,unswappableAbilities,noReceiverAbilities,modifyStages,checkOpportunist});
if(typeof module!=='undefined'&&module.exports)module.exports=api;else if(typeof window!=='undefined')window.PBAP7Mechanics=api;
})();
