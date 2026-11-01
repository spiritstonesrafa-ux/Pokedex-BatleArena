const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Mapper = require('../../assets/js/presentation/battle-presentation-mapper');
const {CompositeBattleDomAdapter} = require('../../assets/js/presentation/composite-battle-dom-adapter');
const {MoveVfxRegistry} = require('../../assets/js/vfx/move-vfx-registry');
const {PokemonAnimationRegistry} = require('../../assets/js/presentation/animation/pokemon-animation-registry');
const {PokemonAnimationController} = require('../../assets/js/presentation/animation/pokemon-animation-controller');
const {BattleView} = require('../../assets/js/ui/battle-view');
const mon = (id,ids=[14]) => ({id,name:'visual-'+id,types:['normal'],hp:2000,attack:100,defense:100,specialAttack:100,specialDefense:100,speed:100,moves:ids.map(id=>C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m=>m.id===id))});
const action = (id,extra={}) => ({type:'MOVE',moveId:id,accuracyRoll:1,damageRoll:100,criticalRoll:24,...extra});
const battle = id => E.createDoublesBattle([mon(1,[id]),mon(3,[33])],[mon(2),mon(4)]);
const resolve = (s,commands={}) => E.resolveDoublesTurn(s,{player:{0:action(s.player.team[0].moves[0].id),1:action(33,{targetSlot:1}),...commands},enemy:{0:action(14),1:action(14)}});
function recorder() {
 const attacks=[],hits=[],effects=[],switches=[],entrances=[],idles=[];
 const adapter=new CompositeBattleDomAdapter({uiAdapter:{execute:async()=>{}},audioController:null,cameraController:null,pokemonController:{playAttack:async k=>attacks.push(k),playDamageReaction:async k=>hits.push(k),playFaint:async k=>hits.push('faint:'+k),playSwitchOut:async k=>switches.push(['out',k]),playSwitchIn:async(k,m)=>switches.push(['in',k,m?.id]),playEntrance:async k=>entrances.push(k),startIdle:k=>idles.push(k)},vfxController:{playMoveVfx:async(d,o)=>effects.push(o)}});
 return {adapter,attacks,hits,effects,switches,entrances,idles};
}
test('Real doubles events route attacks and impacts to independent attacker/defender slots',async()=>{
 const r=resolve(battle(33)),p=recorder();
 for(const command of Mapper.mapEvents(r.events))await p.adapter.execute(command,{battleState:r.state});
 assert.ok(p.attacks.includes('player:1'));
 assert.ok(p.effects.some(e=>e.attackerSide==='player:1'&&e.defenderSide==='enemy:1'));
 assert.ok(p.hits.includes('enemy:1'));
 assert.ok(p.attacks.includes('enemy:1')); const self=Mapper.mapEvents(r.events).find(c=>c.type==='MOVE_ANNOUNCEMENT'&&c.actor==='enemy'&&c.actorSlot===1); assert.equal(self.target,'enemy'); assert.equal(self.targetSlot,1);
});
test('Spread attacks emit a visual per affected position, including the ally; ally recovery targets its own slot',async()=>{
 const p=recorder(),r=resolve(battle(89));
 for(const command of Mapper.mapEvents(r.events))await p.adapter.execute(command,{battleState:r.state});
 assert.deepEqual(p.effects.filter(e=>e.attackerSide==='player:0').map(e=>e.defenderSide).sort(),['enemy:0','enemy:1','player:1']);
 const s=battle(676);s.player.team[1].currentHp=10;const heal=resolve(s,{0:action(676,{targetRole:'player',targetSlot:1})});
 const m=Mapper.mapEvents(heal.events).find(c=>c.type==='MOVE_ANNOUNCEMENT'&&c.actor==='player'&&c.actorSlot===0);
 assert.equal(m.target,'player');assert.equal(m.targetSlot,1);
});
test('Doubles missed and protected targets pass flags to the normal VFX renderer',async()=>{
 // Use real missed event stream and an explicit protected announcement to check adapter forwarding.
 const missed=resolve(battle(403),{0:action(403,{accuracyRoll:100})}),p=recorder();
 for(const c of Mapper.mapEvents(missed.events))if(c.type==='MOVE_ANNOUNCEMENT')await p.adapter.execute(c);
 assert.equal(p.effects[0].isMiss,true);
 await p.adapter.execute({type:'MOVE_ANNOUNCEMENT',actor:'player',actorSlot:1,target:'enemy',targetSlot:0,moveId:33,moveName:'tackle',moveType:'normal',damageClass:'physical',power:40,isBlocked:true});
 assert.equal(p.effects.at(-1).isBlocked,true);
});
test('Intro animates all four positions; switch-in resolves new sprite metadata from session context',async()=>{
 const s=E.createDoublesBattle([mon(1),mon(3),mon(5)],[mon(2),mon(4)]),p=recorder();
 await p.adapter.execute({type:'BATTLE_INTRO'},{battleState:s});assert.deepEqual(p.entrances.sort(),['enemy:0','enemy:1','player:0','player:1']);
 const r=E.resolveDoublesTurn(s,{player:{0:action(14),1:{type:'SWITCH',targetPokemonId:5}},enemy:{0:action(14),1:action(14)}});
 for(const c of Mapper.mapEvents(r.events).filter(c=>c.type.startsWith('SWITCH_')))await p.adapter.execute(c,{battleState:r.state});
 assert.deepEqual(p.switches,[['out','player:1'],['in','player:1',5]]);
});
test('Four registry anchors provide real projectile coordinates, accept ally targets and reject invalid positions',()=>{
 const r=new MoveVfxRegistry();r.registerStage({getBoundingClientRect:()=>({left:10,top:20})});
 for(const [key,x]of [['player:0',20],['player:1',120],['enemy:0',220],['enemy:1',320]])r.registerTarget(key,{getBoundingClientRect:()=>({left:x,top:50,width:40,height:40})});
 assert.equal(r.getCoordinates('player:1','enemy:1').fromX,130);assert.equal(r.getCoordinates('player:1','enemy:1').toX,330);assert.equal(r.getCoordinates('player:0','player:1').toX,130);
 assert.throws(()=>r.registerTarget('enemy:2',{}));r.reset();assert.equal(r.getTarget('player:1'),null);
});
test('View binds actual four sprites to the existing effects and camera controllers on every render',()=>{
 const nodes={},anim=new PokemonAnimationRegistry(),vfx=new MoveVfxRegistry(),started=[],camera=[];
 for(const role of ['player','enemy'])for(const slot of [0,1]){const classes=new Set(),sprite={style:{},classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x))}},target={querySelector:()=>sprite,setAttribute(){},getBoundingClientRect:()=>({left:slot*100,top:100,width:50,height:50})};nodes[`#duoCombatant_${role}_${slot}`]=target;}
 for(const id of ['battleStage','battleCameraWrapper','battleHitFlash'])nodes['#'+id]={};
 const controller=new PokemonAnimationController({registry:anim,reducedMotion:true}),view=new BattleView({container:{querySelector:q=>nodes[q]},sessionController:{compositeAdapter:{pokemonController:controller,vfxController:{registry:vfx,reset(){vfx.reset();}},cameraController:{registry:{registerCamera:x=>camera.push(x),registerStage(){},registerFlashOverlay(){}}}}}});
 view.syncDoublesRegistries(battle(33));assert.equal(anim.targets.size,4);assert.equal(vfx.getTarget('enemy:1'),nodes['#duoCombatant_enemy_1']);assert.equal(camera[0],nodes['#battleCameraWrapper']);
 controller.registry.getTarget('player:1').isIdle=true;controller.reset();assert.equal(controller.registry.getTarget('player:1').isIdle,false);
 nodes['#duoCombatant_player_1']={querySelector:()=>({style:{}}),setAttribute(){}};view.syncDoublesRegistries(battle(33));assert.equal(anim.getTarget('player:1').container,nodes['#duoCombatant_player_1']);
});
test('Singles presentation keeps its original side keys',async()=>{const p=recorder();await p.adapter.execute({type:'MOVE_ANNOUNCEMENT',actor:'player',target:'enemy',moveId:33,moveName:'tackle',moveType:'normal',damageClass:'physical',power:40});assert.deepEqual(p.attacks,['player']);assert.equal(p.effects[0].defenderSide,'enemy');});
test('Switch presentation updates only the incoming doubles slot instead of rebuilding the arena',async()=>{
 const {BattleUiDomAdapter}=require('../../assets/js/ui/battle-ui-adapter'),updates=[],messages=[];
 const s=E.createDoublesBattle([mon(1),mon(3),mon(5)],[mon(2),mon(4)]),r=E.resolveDoublesTurn(s,{player:{0:action(14),1:{type:'SWITCH',targetPokemonId:5}},enemy:{0:action(14),1:action(14)}});
 const adapter=new BattleUiDomAdapter({view:{updateDoublesCombatant:c=>updates.push(c),handleSwitchIn:()=>assert.fail('Must not reconstruct the battlefield during playback'),displayMessage:m=>messages.push(m)}});
 for(const c of Mapper.mapEvents(r.events).filter(c=>c.type.startsWith('SWITCH_')))await adapter.execute(c,{battleState:r.state});
 assert.equal(updates.length,1);assert.equal(updates[0].targetSlot,1);assert.equal(updates[0].currentHp,2000);assert.ok(messages.every(m=>!m.includes('undefined')));
});
