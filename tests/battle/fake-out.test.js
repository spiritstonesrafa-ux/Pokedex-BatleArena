const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../../assets/js/battle/battle-engine.js'),C=require('../../assets/js/battle/battle-constants.js');
const AI=require('../../assets/js/battle/battle-ai.js'),V=require('../../assets/js/battle/battle-evaluator.js');
const Mapper=require('../../assets/js/presentation/battle-presentation-mapper.js');
const {BattleUiDomAdapter}=require('../../assets/js/ui/battle-ui-adapter.js');
const {BattleSessionController}=require('../../assets/js/battle-session/battle-session-controller.js');
const {DeterministicRandomSource}=require('../../assets/js/battle-session/battle-random-source.js');
const fake=C.KNOWN_CATALOG_MOVES[252],tap=C.KNOWN_CATALOG_MOVES[33],tail=C.KNOWN_CATALOG_MOVES[525];
const mon=(id,speed=50,types=['normal'],moves=[fake,tap])=>({id,name:'mon-'+id,types,hp:500,attack:50,defense:200,specialAttack:50,specialDefense:200,speed,moves});
const act=(id,extra={})=>({type:'MOVE',moveId:id,accuracyRoll:1,damageRoll:100,statusRoll:100,secondaryEffectRoll:100,...extra});
const pair=()=>E.createBattle(mon(1,20),mon(2,150));
const teams=()=>E.createTeamBattle([mon(1),mon(3),mon(5)],[mon(2),mon(4),mon(6)]);

test('Fake Out: canonical metadata, +3 priority and obtainable campaign pilot',()=>{
 assert.equal(fake.power,40);assert.equal(fake.accuracy,100);assert.equal(fake.pp,10);assert.equal(fake.type,'normal');
 assert.equal(C.getMovePriority(fake),3);assert.equal(C.getMoveCapability(252).supportLevel,'FULL');assert.equal(C.getSecondaryEffect(fake).chance,100);
 const pool=require('../../assets/js/campaign/campaign-move-options.js').getPool(297);assert.ok(pool.some(m=>m.id===252));assert.ok(pool.length<=6);
});
test('Fake Out: slower user acts before +2 Extreme Speed and always flinches a surviving target',()=>{
 const state=E.createBattle(mon(1,20),mon(2,150,['normal'],[C.KNOWN_CATALOG_MOVES[245],tap]));
 const result=E.resolveTurn(state,{player:act(252),enemy:act(245)});
 assert.equal(result.events.filter(e=>e.type==='MOVE_USED').length,1);
 assert.ok(result.events.some(e=>e.type==='FLINCH_IMMOBILIZED'&&e.actor==='enemy'));
 assert.equal(result.state.player.entryMoveAttempts,1);assert.equal(result.state.enemy.entryMoveAttempts,1);
 assert.equal(result.state.enemy.moves[0].currentPp,5);
});
test('Fake Out: later use fails, consumes PP, causes no damage or flinch and explains why',()=>{
 const first=E.resolveTurn(pair(),{player:act(252),enemy:act(33)});
 const result=E.resolveTurn(first.state,{player:act(252),enemy:act(33)});
 assert.equal(result.state.enemy.currentHp,first.state.enemy.currentHp);
 assert.equal(result.state.player.moves[0].currentPp,8);
 assert.ok(result.events.some(e=>e.type==='MOVE_FAILED'&&e.reason==='FIRST_ACTION_AFTER_ENTRY'));
 assert.equal(result.events.some(e=>e.type==='FLINCH_APPLIED'),false);
 assert.equal(result.events.some(e=>e.type==='MOVE_USED'&&e.actor==='player'),false);
 const messages=[],adapter=new BattleUiDomAdapter({view:{displayMessage:m=>messages.push(m)}});
 for(const c of Mapper.mapEvents(result.events).filter(c=>c.type==='MOVE_FAIL_FEEDBACK'))adapter.execute(c);
 assert.equal(messages.length,1);assert.match(messages[0],/primeira oportunidade/);
});
test('Fake Out: using a different move first consumes the entry window',()=>{
 const first=E.resolveTurn(pair(),{player:act(33),enemy:act(33)});
 const result=E.resolveTurn(first.state,{player:act(252),enemy:act(33)});
 assert.ok(result.events.some(e=>e.type==='MOVE_FAILED'&&e.actor==='player'));
});
test('Fake Out: sleep, freeze and confusion consume the first opportunity even without executing a move',()=>{
 for(const condition of ['sleep','freeze','confusion']){
  const state=pair();
  if(condition==='confusion')state.player.confusionTurns=3;
  else state.player.statusCondition=condition;
  state.player.sleepTurns=2;
  const first=E.resolveTurn(state,{player:act(252,{thawRoll:100,confusionHitRoll:1}),enemy:act(33)});
  assert.equal(first.state.player.entryMoveAttempts,1);
  assert.equal(first.state.player.moves[0].currentPp,10);
  // Cure before the next action; curing cannot restore the consumed entry window.
  first.state.player.statusCondition=null;first.state.player.confusionTurns=0;
  const second=E.resolveTurn(first.state,{player:act(252),enemy:act(33)});
  assert.ok(second.events.some(e=>e.type==='MOVE_FAILED'&&e.actor==='player'));
 }
});
test('Fake Out: first-turn flinch consumes both users entry windows',()=>{
 const first=E.resolveTurn(pair(),{player:act(252),enemy:act(252)});
 assert.ok(first.events.some(e=>e.type==='FLINCH_IMMOBILIZED'&&e.actor==='player'));
 const second=E.resolveTurn(first.state,{player:act(252),enemy:act(252)});
 assert.equal(second.events.filter(e=>e.type==='MOVE_FAILED').length,2);
});
test('Fake Out: Ghost immunity and KO never produce flinch',()=>{
 const immune=E.resolveTurn(E.createBattle(mon(1),mon(2,50,['ghost'])),{player:act(252),enemy:act(33)});
 assert.equal(immune.events.some(e=>e.type==='FLINCH_APPLIED'),false);
 const state=pair();state.enemy.currentHp=1;
 const ko=E.resolveTurn(state,{player:act(252),enemy:act(33)});
 assert.equal(ko.state.enemy.currentHp,0);assert.equal(ko.events.some(e=>e.type==='FLINCH_APPLIED'),false);
});
test('Fake Out: voluntary entry permits its first action on the following turn and re-entry restores eligibility',()=>{
 let state=teams();state.player.team[0].entryMoveAttempts=3;
 let result=E.resolveTurn(state,{player:{type:'SWITCH',targetPokemonId:3},enemy:act(33)});
 assert.equal(result.state.player.team[1].entryMoveAttempts,0);
 result=E.resolveTurn(result.state,{player:act(252),enemy:act(33)});
 assert.ok(result.events.some(e=>e.type==='FLINCH_IMMOBILIZED'&&e.actor==='enemy'));
 result=E.resolveTurn(result.state,{player:{type:'SWITCH',targetPokemonId:1},enemy:act(33)});
 assert.equal(result.state.player.team[0].entryMoveAttempts,0);
 result=E.resolveTurn(result.state,{player:act(252),enemy:act(33)});
 assert.equal(result.events.some(e=>e.type==='MOVE_FAILED'),false);
});
test('Fake Out: forced entry starts at zero and first action remains available',()=>{
 const state=E.createTeamBattle([mon(1,50,['normal'],[tail,tap]),mon(3),mon(5)],[mon(2),mon(4),mon(6)]);
 const forced=E.resolveTurn(state,{player:act(525),enemy:act(33)});
 assert.equal(forced.state.enemy.activeIndex,1);assert.equal(forced.state.enemy.team[1].entryMoveAttempts,0);
 const result=E.resolveTurn(forced.state,{player:act(33),enemy:act(252)});
 assert.ok(result.events.some(e=>e.type==='FLINCH_IMMOBILIZED'&&e.actor==='player'));
});
test('Fake Out: replacement and new battle ignore inherited action counters',()=>{
 const raw={...mon(1),entryMoveAttempts:99};assert.equal(E.createCombatant(raw).entryMoveAttempts,0);
 const state=teams();state.player.team[0].currentHp=1;
 const result=E.resolveTurn(state,{player:act(33),enemy:act(33)});
 const replacement=E.resolveReplacement(result.state,{player:{targetPokemonId:3}});
 assert.equal(replacement.state.player.team[1].entryMoveAttempts,0);
 const next=E.resolveTurn(replacement.state,{player:act(252),enemy:act(33)});
 assert.equal(next.events.some(e=>e.type==='MOVE_FAILED'),false);
});
test('Fake Out: evaluator gives zero damage and AI prefers a usable move after entry window',()=>{
 const state=pair();state.player.entryMoveAttempts=1;
 const evaluation=V.evaluateMove(state.player,state.enemy,fake);
 assert.equal(evaluation.expectedDamage,0);assert.equal(evaluation.damageIfHit,0);assert.equal(evaluation.expectedStatusBenefit,0);
 assert.equal(AI.chooseAction(state,'player',{strategy:'SMART'}).action.moveId,33);
});
for(const role of ['player','enemy'])test(`Fake Out: real session from ${role}, first use succeeds and second fails`,async()=>{
 const p=[mon(1,role==='player'?150:20),mon(3),mon(5)],e=[mon(2,role==='enemy'?150:20),mon(4),mon(6)],events=[];
 const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async ids=>ids.map(id=>p.find(m=>m.id===id))},opponentFactory:{createOpponentTeam:async()=>e},ai:{chooseAction:()=>({action:act(role==='enemy'?252:33)})},randomSource:new DeterministicRandomSource({accuracySequence:[1,1,1,1],damageSequence:[100,100,100,100]}),presentationEngine:{play:async batch=>events.push(...batch),playCommands:async()=>{}}});
 await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();
 await session.submitPlayerMove(role==='player'?252:33);
 assert.equal(events.filter(x=>x.type==='FLINCH_IMMOBILIZED').length,1);
 const previous=events.length;await session.submitPlayerMove(role==='player'?252:33);
 assert.ok(events.slice(previous).some(x=>x.type==='MOVE_FAILED'&&x.actor===role));
 assert.equal(Mapper.mapEvents(events).filter(c=>c.type==='MOVE_FAIL_FEEDBACK').length,1);
});
