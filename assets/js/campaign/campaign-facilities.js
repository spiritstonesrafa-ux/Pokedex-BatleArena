/* Eternal Glory facilities: progression is separate from one-time Pokémon rewards. */
(function(){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const K=node?require('./campaign-catalog'):window.PBACampaign;
 const F=node?require('./campaign-fixed-battle-catalog'):K.CampaignFixedBattleCatalog;
 const R=node?require('../battle/battle-constants'):window.PBABattle;
 const Moves=node?require('./campaign-move-options'):K.CampaignMoveOptions;
 const kinds=['LEAGUE','TOWER'];
 const league=Object.freeze([
  {name:'Elite I — Guardião das Dunas',team:[248,530,450],arena:'rock'},
  {name:'Elite II — Mestra das Marés',team:[279,260,272],arena:'water'},
  {name:'Elite III — Guardião do Crepúsculo',team:[94,609,778],arena:'ghost'},
  {name:'Elite IV — Mestra dos Dragões',team:[445,149,635],arena:'dragon'},
  {name:'Campeão da Glória Eterna',team:[376,350,448],arena:'super'}
 ].map(d=>Object.freeze({...d,team:Object.freeze(d.team)})));
 const classic=Object.freeze([[248,530,423],[279,260,272],[445,212,350],[94,609,778],[149,376,448],[6,3,9],[479,468,461],[59,286,131]].map(Object.freeze));
 const free=Object.freeze([...classic,[643,717,383],[250,245,381],[10193,727,643],[150,889,487]].map(Object.freeze));
 const rentals=Object.freeze([
  {name:'Equilíbrio',team:[445,212,350],items:['life-orb','leftovers','sitrus-berry']},
  {name:'Areia',team:[248,530,468],items:['assault-vest','life-orb','leftovers']},
  {name:'Controle',team:[468,10009,461],items:['choice-specs','leftovers','focus-sash']}
 ].map(d=>Object.freeze({...d,team:Object.freeze(d.team),items:Object.freeze(d.items)})));
 const isFacility=kind=>kinds.includes(kind);
 const allowed=(id,category)=>{const p=K.byId(id);return Boolean(p&&F.byId[id]&&!p.collectionOnly&&(category!=='CLASSIC'||!p.legendary&&!p.mythical&&p.bst<=600&&!/mega|primal|eternamax/.test(p.name)));};
 const stats=()=>({entries:0,wins:0,best:0,championships:0,run:null});
 const defaults=()=>({league:stats(),tower:{CLASSIC:stats(),FREE:stats()}});
 const categoryOf=(kind,category)=>kind==='LEAGUE'?'FREE':category==='FREE'?'FREE':'CLASSIC';
 const counter=n=>Number.isSafeInteger(n)&&n>=0?Math.min(n,1000000000):0;
 function sanitize(raw,clean){
  const result=defaults();if(!clean.shadowTrainer?.defeated)return result;
  const owned=new Set([...clean.startingRosterIds,...(clean.legacyTrialRewardIds||[]),...Object.values(clean.challenges||{}).map(p=>p.rewardPokemonId),...Object.values(clean.endgameTrials||{}).map(p=>p.rewardPokemonId),clean.superTrainer?.rewardPokemonId,...(clean.wild?.capturedIds||[])].filter(Boolean));
  for(const [target,value,kind,category]of [[result.league,raw?.league,'LEAGUE','FREE'],[result.tower.CLASSIC,raw?.tower?.CLASSIC,'TOWER','CLASSIC'],[result.tower.FREE,raw?.tower?.FREE,'TOWER','FREE']]){
   for(const key of ['entries','wins','best','championships'])target[key]=counter(value?.[key]);
   const run=value?.run;if(!run||!Array.isArray(run.team)||run.team.length!==3||new Set(run.team).size!==3||run.team.some(id=>!allowed(id,category)))continue;
   const rental=Number.isInteger(run.rental)&&rentals[run.rental]?.team.every((id,i)=>id===run.team[i])?run.rental:null;
   if(rental===null&&run.team.some(id=>!owned.has(id)))continue;
   const round=counter(run.round);if(kind==='LEAGUE'&&round>=league.length)continue;
   const preferences={},moves={};let valid=true;
   for(const id of run.team){const pref=R.P7.validatePreference(id,run.preferences?.[id]||{}),loadout=Moves.validateSelection(id,run.moves?.[id],id===235?run.moves?.[id]?.[0]:undefined);if(!pref||!loadout){valid=false;break;}preferences[id]=pref;moves[id]=loadout.map(m=>m.id);}
   if(valid)target.run={team:[...run.team],rental,round,serial:counter(run.serial),ticket:typeof run.ticket==='string'&&run.ticket.length<100?run.ticket:null,preferences,moves};
  }
  return result;
 }
 function getOpponent(kind,category,state=stats()){
  const run=state.run;if(kind==='LEAGUE')return league[run?.round||0];
  const pool=category==='FREE'?free:classic,round=run?.round||0,index=(round+(state.entries||1)-1)%pool.length;
  const team=[...pool[index]],offset=Math.floor(round/pool.length)%3;
  return {name:`Torre — andar ${round+1}`,team:[...team.slice(offset),...team.slice(0,offset)],arena:['rock','water','dragon','ghost','steel','fire','electric','grass'][index%8]};
 }
 function installStore(Store){const previous=Store.sanitize,base=Store.getDefaultState;
  Store.getDefaultState=()=>({...base(),facilities:defaults()});
  Store.sanitize=raw=>{const clean=previous(raw);clean.facilities=sanitize(raw?.facilities,clean);return clean;};
 }
 function installManager(Manager){
  const can=Manager.prototype.canChallenge,config=Manager.prototype.getBattleConfig,record=Manager.prototype.recordBattle;
  Manager.prototype.getFacilityState=function(kind,category){const c=categoryOf(kind,category);return kind==='LEAGUE'?this.data.facilities.league:this.data.facilities.tower[c];};
  Manager.prototype.canChallenge=function(kind,id){return isFacility(kind)?this.isStarted()&&Boolean(this.data.shadowTrainer?.defeated)&&!this.data.pendingReward:can.call(this,kind,id);};
  Manager.prototype.startFacilityRun=function(kind,team,options={}){
   if(!isFacility(kind)||!this.canChallenge(kind))return {ok:false,reason:'LOCKED'};
   const category=categoryOf(kind,options.category),state=this.getFacilityState(kind,category);
   if(state.run)return {ok:false,reason:'RUN_ACTIVE'};
   const rental=Number.isInteger(options.rental)&&rentals[options.rental]?options.rental:null;
   const ids=rental!==null?[...rentals[rental].team]:Array.isArray(team)?team.map(Number):[];
   if(ids.length!==3||new Set(ids).size!==3||ids.some(id=>!allowed(id,category)||rental===null&&!this.getRosterIds().includes(id)))return {ok:false,reason:'INVALID_TEAM'};
   const preferences={},moves={};for(const [i,id]of ids.entries()){
    preferences[id]=rental!==null?R.P7.validatePreference(id,{item:rentals[rental].items[i]}):this.getBattlePreference(id);
    moves[id]=rental!==null?F.byId[id].moves.map(m=>m.id):this.getEffectiveMoveIds(id);
   }
   state.entries++;state.run={team:ids,rental,round:0,serial:0,ticket:null,preferences,moves};this.save('FACILITY_ENTERED');return {ok:true};
  };
  Manager.prototype.abandonFacilityRun=function(kind,category){if(!isFacility(kind))return false;const state=this.getFacilityState(kind,category);if(!state.run)return false;state.run=null;this.save('FACILITY_ABANDONED');return true;};
  Manager.prototype.getFacilityOpponent=function(kind,category){return getOpponent(kind,categoryOf(kind,category),this.getFacilityState(kind,category));};
  Manager.prototype.getBattleConfig=function(kind,id,teamIds,options={}){
   if(!isFacility(kind))return config.call(this,kind,id,teamIds,options);
   const category=categoryOf(kind,options.category||id),state=this.getFacilityState(kind,category),run=state.run;
   if(!this.canChallenge(kind)||!run)throw Error('Inicie uma sequência válida antes de batalhar.');
   const enemy=this.getFacilityOpponent(kind,category);run.serial++;
   run.ticket=`${category}:${state.entries}:${run.round}:${run.serial}`;this.save('FACILITY_BATTLE_PREPARED');
   return {playerTeamIds:[...run.team],enemyTeamIds:[...enemy.team],playerSketchMoves:run.team.includes(235)?{235:run.moves[235][0]}:{},playerBattlePreferences:JSON.parse(JSON.stringify(run.preferences)),playerMovePreferences:JSON.parse(JSON.stringify(run.moves)),enemyBattlePreferences:Object.fromEntries(enemy.team.map((id,i)=>[id,R.P7.validatePreference(id,{item:['leftovers','life-orb','sitrus-berry'][i]})])),metadata:{mode:'CAMPAIGN',kind,id:run.ticket,opponentName:enemy.name,arenaType:enemy.arena,facilityCategory:category},modifiers:{}};
  };
  Manager.prototype.recordBattle=function(receipt){
   if(!isFacility(receipt?.kind))return record.call(this,receipt);
   if(!['player','enemy'].includes(receipt.winner)||typeof receipt.battleId!=='string'||!receipt.battleId||receipt.battleId.length>=100||this.data.processedBattleIds.includes(receipt.battleId))return {processed:false};
   const states=receipt.kind==='LEAGUE'?[this.data.facilities.league]:Object.values(this.data.facilities.tower);
   const state=states.find(s=>s.run?.ticket===receipt.id);if(!state||!this.data.shadowTrainer.defeated)return {processed:false};
   this.data.processedBattleIds.push(receipt.battleId);this.data.processedBattleIds=this.data.processedBattleIds.slice(-96);
   if(receipt.winner==='enemy')state.run=null;
   else{state.wins++;state.run.round++;state.run.ticket=null;state.best=Math.max(state.best,state.run.round);if(receipt.kind==='LEAGUE'&&state.run.round===league.length){state.championships++;state.run=null;}}
   this.save('FACILITY_RESULT');return {processed:true,pendingReward:null};
  };
 }
 const api={getOpponent,league,classic,free,rentals,isFacility,allowed,defaults,sanitize,installStore,installManager};
 if(node)module.exports=api;else{window.PBACampaign=window.PBACampaign||{};window.PBACampaign.CampaignFacilities=api;}
})();
