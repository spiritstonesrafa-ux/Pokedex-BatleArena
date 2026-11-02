const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {CampaignBattleCoordinator}=require('../../assets/js/campaign/campaign-battle-coordinator'),Catalog=require('../../assets/js/campaign/campaign-catalog');
const source=fs.readFileSync(path.join(__dirname,'../../assets/js/campaign/trial-arrival.js'),'utf8');
const definitions={ZYGARDE_TRIAL:'ZYGARDE_TRIAL_TEAM',KYUREM_TRIAL:'KYUREM_TRIAL_TEAM',NECROZMA_TRIAL:'NECROZMA_TRIAL_TEAM',CREATION_TRIAL:'CREATION_TRIAL_TEAM',MEWTWO_TRIAL:'MEWTWO_TRIAL_TEAM',LEGENDARY_TRIAL:'LEGENDARY_TRIAL_TEAM',MYTHICAL_TRIAL:'MYTHICAL_TRIAL_TEAM',TITANS_TRIAL:'TITANS_TRIAL_TEAM',CELESTIAL_TRIAL:'CELESTIAL_TRIAL_TEAM'};
function setup(reduced=true){
 const timers=new Map(),listeners=new Map(),nodes=new Map();let serial=0;
 const node=()=>({textContent:'',dataset:{},hidden:false,isConnected:true,attributes:{},classList:{values:new Set(),toggle(k,v){if(v)this.values.add(k);else this.values.delete(k);}},setAttribute(k,v){this.attributes[k]=v;},focus(){doc.activeElement=this;}});
 const images=Array.from({length:3},node),members=Array.from({length:3},(_,i)=>({...node(),querySelector:()=>images[i]})),labels=Array.from({length:3},node),steps=Array.from({length:6},node);
 const layer={...node(),querySelector(q){if(!nodes.has(q))nodes.set(q,node());return nodes.get(q);},querySelectorAll(q){return q==='img'?images:q==='[data-member]'?members:q==='[data-roster]'?labels:steps;},remove(){this.removed=true;}};
 const doc={hidden:false,activeElement:node(),body:{style:{overflow:'auto'},appendChild(){}},createElement:()=>layer,addEventListener:(k,v)=>listeners.set(k,v),removeEventListener:k=>listeners.delete(k)};
 const ctx={document:doc,window:{matchMedia:()=>({matches:reduced})},setTimeout:(fn,ms)=>{const id=++serial;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)};
 vm.runInNewContext(source,ctx);
 return {Scene:ctx.window.PBACampaign.TrialArrival,themes:ctx.window.PBACampaign.TRIAL_ARRIVAL_THEMES,doc,layer,images,members,labels,steps,listeners,timers};
}
for(const [kind,key]of Object.entries(definitions))test(kind+' reveals the actual canonical team and waits for confirmation without modifying it',async()=>{
 const env=setup(),team=Catalog[key],before=JSON.stringify(team),scene=new env.Scene(),focus=env.doc.activeElement;let resolved=false;
 const p=scene.play(kind,team).then(v=>{resolved=v;});assert.equal(scene.index,0);assert.equal(scene.timer,null);assert.match(env.layer.innerHTML,new RegExp(env.themes[kind].backgroundSrc||'arena-trial-'+env.themes[kind].arena));
 scene.advance();scene.advance();assert.equal(scene.index,2);assert.equal(env.images[0].alt,team[0].name.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase()));assert.equal(env.members[1].attributes['aria-hidden'],'true');
 scene.advance();scene.advance();scene.advance();assert.equal(scene.index,5);assert.equal(resolved,false);assert.ok(env.labels.every(x=>x.hidden===false));assert.equal(env.layer.querySelector('.trial-arrival__next').textContent,'Entrar na arena →');
 scene.advance();await p;assert.equal(resolved,true);assert.equal(JSON.stringify(team),before);assert.equal(env.doc.body.style.overflow,'auto');assert.equal(env.doc.activeElement,focus);assert.equal(env.listeners.size,0);assert.equal(env.timers.size,0);
});
test('Skip and Escape complete once; focus remains inside the scene and all timers are removed',async()=>{
 const env=setup(false),scene=new env.Scene();const p=scene.play('LEGENDARY_TRIAL',Catalog.LEGENDARY_TRIAL_TEAM);assert.equal(env.timers.size,1);env.doc.activeElement=scene.next;let prevented=0;env.listeners.get('keydown')({key:'Tab',preventDefault(){prevented++;}});assert.equal(env.doc.activeElement,scene.skip);env.listeners.get('keydown')({key:'Escape',preventDefault(){prevented++;}});assert.equal(await p,true);scene.close(true);assert.equal(env.timers.size,0);assert.equal(env.listeners.size,0);assert.equal(prevented,2);
});
test('Hidden tabs pause the scene; cancelling before audio unlock never starts stale music',async()=>{
 const env=setup(false);let unlock,started=0,stopped=0;const scene=new env.Scene({audio:{unlock:()=>new Promise(r=>unlock=r),startDialogueMusic(){started++;},stopDialogueMusic(){stopped++;}}}),p=scene.play('MYTHICAL_TRIAL',Catalog.MYTHICAL_TRIAL_TEAM);
 env.doc.hidden=true;env.listeners.get('visibilitychange')();assert.equal(env.timers.size,0);env.doc.hidden=false;env.listeners.get('visibilitychange')();assert.equal(env.timers.size,1);scene.close(false);unlock();await Promise.resolve();assert.equal(await p,false);assert.equal(started,0);assert.equal(stopped,1);
});
test('Scene uses its own music family, cries at reveals, handles image fallbacks and rejects missing teams',async()=>{
 const env=setup(),calls=[],scene=new env.Scene({audio:{unlock:async()=>{},startDialogueMusic:s=>calls.push(s.challengeKind),playPokemonCry:url=>calls.push(url),stopDialogueMusic(){}}});
 await assert.rejects(scene.play('TITANS_TRIAL',[]));const team=Catalog.TITANS_TRIAL_TEAM.map(p=>({...p,cry:'cry-'+p.id})),p=scene.play('TITANS_TRIAL',team);await new Promise(resolve=>setImmediate(resolve));scene.advance();scene.advance();assert.equal(calls[0],'TITANS_TRIAL');assert.ok(calls.includes('cry-'+team[0].id));env.images[0].dataset.fallback='fallback.png';env.images[0].onerror();assert.equal(env.images[0].src,'fallback.png');env.images[0].onerror();assert.equal(env.images[0].onerror,null);scene.close(true);await p;
});
function coordinatorFixture(arrival){const order=[],config={playerTeamIds:[3,6,9],enemyTeamIds:[145,245,381],metadata:{kind:'LEGENDARY_TRIAL',mode:'CAMPAIGN'}},audio={unlock:async()=>order.push('unlock')},manager={getBattleConfig:()=>config},session={enemyTeam:Catalog.LEGENDARY_TRIAL_TEAM,compositeAdapter:{audioController:audio},prepareBattle:async()=>order.push('prepare'),startBattle:async()=>order.push('battle')};return {coordinator:new CampaignBattleCoordinator(manager,session,null,arrival),session,order,config,audio};}
test('Coordinator unlocks on entry, prepares once and never starts a battle while the opening is pending',async()=>{
 let complete;const scene={play:()=>new Promise(r=>complete=r)},f=coordinatorFixture(scene),first=f.coordinator.start('LEGENDARY_TRIAL',null,[3,6,9]);assert.equal(f.coordinator.start('LEGENDARY_TRIAL',null,[3,6,9]),first);await Promise.resolve();assert.deepEqual(f.order,['unlock','prepare']);complete(true);await first;assert.deepEqual(f.order,['unlock','prepare','battle']);
});
test('Cancelling a trial opening never starts the battle; a failed visual falls back to the prepared battle',async()=>{
 const f=coordinatorFixture({play:async()=>false});await assert.rejects(f.coordinator.start('LEGENDARY_TRIAL',null,[3,6,9]),{name:'AbortError'});assert.ok(!f.order.includes('battle'));
 const g=coordinatorFixture({play:async()=>{throw Error('visual unavailable');},close(){}});await g.coordinator.start('LEGENDARY_TRIAL',null,[3,6,9]);assert.ok(g.order.includes('battle'));
});
test('Ordinary dialogue receives the same audio controller as its prepared battle',async()=>{
 let options;const f=coordinatorFixture(),cinematic={hasScene:()=>true,play:async(k,m,o)=>{options=o;}};f.coordinator.cinematicDialogue=cinematic;await f.coordinator.start('SHADOW',null,[3]);assert.equal(options.audioController,f.audio);assert.equal(f.order[0],'unlock');assert.equal(f.order.at(-1),'battle');
});

for(const kind of ['LEAGUE','TOWER'])test(kind+' opening reveals the prepared facility team and does not advance progression',async()=>{const F=require('../../assets/js/campaign/campaign-facilities'),enemy=F.getOpponent(kind,'CLASSIC'),team=enemy.team.map(Catalog.byId),env=setup(),scene=new env.Scene(),before=JSON.stringify(team);const played=scene.play(kind,team);for(let i=0;i<5;i++)scene.advance();assert.equal(scene.index,5);assert.ok(env.labels.every(n=>n.hidden===false));assert.ok(env.layer.innerHTML.includes(team[0].name.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())));scene.advance();assert.equal(await played,true);assert.equal(JSON.stringify(team),before);});
