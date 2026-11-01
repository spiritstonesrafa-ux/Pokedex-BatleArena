const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../../assets/js/battle/battle-engine.js'),C=require('../../assets/js/battle/battle-constants.js');
const P4=require('../../assets/js/battle/p4-secondary-catalog.js');
const V=require('../../assets/js/battle/battle-evaluator.js'),AI=require('../../assets/js/battle/battle-ai.js');
const Mapper=require('../../assets/js/presentation/battle-presentation-mapper.js');
const {BattleUiDomAdapter}=require('../../assets/js/ui/battle-ui-adapter.js');
const {BattleSessionController}=require('../../assets/js/battle-session/battle-session-controller.js');
const {DeterministicRandomSource}=require('../../assets/js/battle-session/battle-random-source.js');
const m=id=>C.KNOWN_CATALOG_MOVES[id];
function mon(id,moves=[m(33)],types=['water'],speed=50,hp=5000){return{id,name:'mon-'+id,types,hp,attack:100,defense:100,specialAttack:100,specialDefense:100,speed,moves};}
const a=(id,extra={})=>({type:'MOVE',moveId:id,accuracyRoll:1,damageRoll:100,statusRoll:100,thawRoll:100,confusionHitRoll:100,secondaryEffectRoll:1,...extra});
function battle(move){return E.createBattle(mon(move.id===783?877:1,[move],['normal'],200),mon(2));}
function stage(target,key){return ['accuracy','evasion'].includes(key)?target[key+'Stage']:target.statStages[key];}

for(const effect of Object.values(P4.effects))test(`P4 expansion: ${effect.name} applies its registered secondary to the proper combatant`,()=>{
 let result=E.resolveTurn(battle(m(effect.id)),{player:a(effect.id,{secondaryEffectRoll2:1,secondaryStatusChoice:1}),enemy:a(33)});
 if(result.state.player.twoTurnMove) result=E.resolveTurn(result.state,{player:a(effect.id,{secondaryEffectRoll2:1,secondaryStatusChoice:1}),enemy:a(33)});
 const attacker=result.state.player,defender=result.state.enemy;
 if(effect.statusCondition)assert.equal(defender.statusCondition,effect.statusCondition);
 if(effect.statusChoices)assert.equal(defender.statusCondition,'burn');
 if(effect.flinch)assert.ok(result.events.some(e=>e.type==='FLINCH_APPLIED'&&e.target==='enemy'));
 if(effect.confusion)assert.ok(result.events.some(e=>e.type==='CONFUSION_APPLIED'&&e.target==='enemy'));
 for(const [key,delta] of Object.entries(effect.statDrops||{}))assert.equal(stage(defender,key),delta);
 for(const [key,delta] of Object.entries(effect.statBoosts||{}))assert.equal(stage(attacker,key),delta);
});

test('Tri Attack: one chosen status, 20/21 boundary, no reroll around an immunity',()=>{
 for(const [choice,status] of [[1,'burn'],[2,'paralysis'],[3,'freeze']]){
  const result=E.resolveTurn(battle(m(161)),{player:a(161,{secondaryEffectRoll:20,secondaryStatusChoice:choice}),enemy:a(33)});
  assert.equal(result.state.enemy.statusCondition,status);assert.equal(result.events.filter(e=>e.type==='STATUS_APPLIED').length,1);
 }
 const miss=E.resolveTurn(battle(m(161)),{player:a(161,{secondaryEffectRoll:21,secondaryStatusChoice:2}),enemy:a(33)});assert.equal(miss.state.enemy.statusCondition,null);
 const state=battle(m(161));state.enemy.types=['fire'];
 const immune=E.resolveTurn(state,{player:a(161,{secondaryStatusChoice:1}),enemy:a(33)});assert.equal(immune.state.enemy.statusCondition,null);
});

test('Fangs: status and flinch use independent rolls rather than one shared activation',()=>{
 for(const [statusRoll,flinchRoll,condition,flinch] of [[1,100,'freeze',false],[100,1,null,true],[1,1,'freeze',false],[100,100,null,false]]){
  const result=E.resolveTurn(battle(m(423)),{player:a(423,{secondaryEffectRoll:statusRoll,secondaryEffectRoll2:flinchRoll}),enemy:a(33)});
  assert.equal(result.state.enemy.statusCondition,condition);
  assert.equal(result.events.some(e=>e.type==='FLINCH_IMMOBILIZED'),flinch);
 }
});

test('Accuracy stages affect future hit boundaries, respect bounds and reset on switching',()=>{
 const state=E.createBattle(mon(1,[m(189),m(33)],['normal'],200),mon(2));const first=E.resolveTurn(state,{player:a(189),enemy:a(33)});
 assert.equal(first.state.enemy.accuracyStage,-1);assert.equal(C.getEffectiveAccuracy(m(33),first.state.enemy,first.state.player),75);
 for(const [roll,missed] of [[75,false],[76,true]]){
  const next=E.resolveTurn(first.state,{player:a(33),enemy:a(33,{accuracyRoll:roll})});
  assert.equal(next.events.some(e=>e.type==='MOVE_MISSED'&&e.actor==='enemy'),missed);
 }
 const target=first.state.enemy;for(let i=0;i<10;i++)C.applyStatStageChange(target,'accuracy',-1);assert.equal(target.accuracyStage,-6);
 C.applyStatStageChange(target,'evasion',20);assert.equal(target.evasionStage,6);C.resetStatStages(target);assert.equal(target.accuracyStage,0);assert.equal(target.evasionStage,0);
});

test('Rest: cures poison, heals to full, forces two subsequent sleeping actions and then wakes',()=>{
 let state=E.createBattle(mon(1,[m(156),m(33)],['normal'],200),mon(2,[C.SUPPORTED_STATUS_MOVES['swords-dance']]));
 state.player.currentHp=100;state.player.statusCondition='toxic';state.player.toxicStage=8;
 let result=E.resolveTurn(state,{player:a(156),enemy:a(14)});assert.equal(result.state.player.currentHp,5000);assert.equal(result.state.player.statusCondition,'sleep');assert.equal(result.state.player.sleepTurns,2);assert.equal(result.state.player.toxicStage,0);
 assert.equal(result.state.player.moves[0].currentPp,4);assert.ok(Mapper.mapEvents(result.events).some(c=>c.type==='HP_TRANSITION'&&c.heal===4900));
 for(let i=0;i<2;i++){result=E.resolveTurn(result.state,{player:a(33),enemy:a(14)});assert.ok(result.events.some(e=>e.type==='STATUS_IMMOBILIZED'&&e.actor==='player'));}
 result=E.resolveTurn(result.state,{player:a(33),enemy:a(14)});assert.equal(result.state.player.statusCondition,null);assert.ok(result.events.some(e=>e.type==='MOVE_USED'&&e.actor==='player'));
});

test('Rest at full HP fails and cannot overwrite existing status without healing',()=>{
 const state=battle(m(156));state.player.statusCondition='burn';
 const result=E.resolveTurn(state,{player:a(156),enemy:a(33)});
 assert.ok(result.events.some(e=>e.type==='MOVE_FAILED'&&e.reason==='REST_NOT_NEEDED'));assert.equal(result.state.player.statusCondition,'burn');
});

test('Sleep Talk calls a zero-PP attack while asleep, charges only its own PP and counts sleep once',()=>{
 const state=E.createBattle(mon(1,[m(214),m(33)],['normal'],200),mon(2));state.player.statusCondition='sleep';state.player.sleepTurns=2;state.player.moves[1].currentPp=0;
 const result=E.resolveTurn(state,{player:a(214,{sleepTalkChoice:0}),enemy:a(33)});
 assert.equal(result.state.player.sleepTurns,1);assert.equal(result.state.player.entryMoveAttempts,1);
 assert.equal(result.state.player.moves[0].currentPp,9);assert.equal(result.state.player.moves[1].currentPp,0);
 assert.ok(result.events.some(e=>e.type==='DAMAGE_APPLIED'&&e.source==='player'));assert.equal(result.events.filter(e=>e.type==='PP_CHANGED'&&e.actor==='player').length,1);
});

test('Sleep Talk awake / no callable moves and Snore awake fail; Snore asleep executes',()=>{
 for(const id of [173,214]){const result=E.resolveTurn(battle(m(id)),{player:a(id),enemy:a(33)});assert.ok(result.events.some(e=>e.type==='MOVE_FAILED'&&e.reason==='REQUIRES_SLEEP'));}
 const state=battle(m(214));state.player.statusCondition='sleep';state.player.sleepTurns=2;
 const empty=E.resolveTurn(state,{player:a(214),enemy:a(33)});assert.ok(empty.events.some(e=>e.type==='MOVE_FAILED'&&e.reason==='NO_CALLABLE_MOVE'));
 const snore=battle(m(173));snore.player.statusCondition='sleep';snore.player.sleepTurns=2;
 const result=E.resolveTurn(snore,{player:a(173),enemy:a(33)});assert.ok(result.events.some(e=>e.type==='FLINCH_IMMOBILIZED'&&e.actor==='enemy'));assert.equal(result.state.player.sleepTurns,1);
});

test('Dream Eater requires a sleeping target, respects Dark immunity and heals actual damage',()=>{
 const fail=E.resolveTurn(battle(m(138)),{player:a(138),enemy:a(33)});assert.ok(fail.events.some(e=>e.type==='MOVE_FAILED'&&e.reason==='TARGET_NOT_ASLEEP'));
 const state=battle(m(138));state.player.currentHp=100;state.enemy.statusCondition='sleep';state.enemy.sleepTurns=3;
 const result=E.resolveTurn(state,{player:a(138),enemy:a(33)});
 const damage=result.events.find(e=>e.type==='DAMAGE_APPLIED'&&e.source==='player');
 const heal=result.events.find(e=>e.type==='DRAIN_APPLIED');assert.ok(heal);assert.equal(heal.healedAmount,Math.floor(damage.damage/2));
 state.enemy.types=['dark'];const immune=E.resolveTurn(state,{player:a(138),enemy:a(33)});assert.equal(immune.events.some(e=>e.type==='DRAIN_APPLIED'),false);
});

test('Yawn sleeps at end of next turn; switching cancels it and a new status blocks application',()=>{
 let state=E.createBattle(mon(1,[m(281),m(33)],['normal'],200),mon(2));
 let result=E.resolveTurn(state,{player:a(281,{sleepDuration:3}),enemy:a(33)});assert.equal(result.state.enemy.statusCondition,null);assert.equal(result.state.enemy.drowsyTurns,1);
 result=E.resolveTurn(result.state,{player:a(33),enemy:a(33)});assert.equal(result.state.enemy.statusCondition,'sleep');assert.equal(result.state.enemy.sleepTurns,3);
 const teams=E.createTeamBattle([mon(1,[m(281)]),mon(3),mon(5)],[mon(2),mon(4),mon(6)]);
 const first=E.resolveTurn(teams,{player:a(281),enemy:a(33)});
 const swapped=E.resolveTurn(first.state,{player:a(281),enemy:{type:'SWITCH',targetPokemonId:4}});assert.equal(swapped.state.enemy.team[0].drowsyTurns,0);assert.equal(swapped.state.enemy.team[0].statusCondition,null);
 const other=E.resolveTurn(state,{player:a(281),enemy:a(33)});other.state.enemy.statusCondition='poison';
 const blocked=E.resolveTurn(other.state,{player:a(33),enemy:a(33)});assert.equal(blocked.state.enemy.statusCondition,'poison');assert.equal(blocked.state.enemy.drowsyTurns,0);
});

test('Clear Smog resets both positive and negative stages and precision; Alluring Voice checks this turn only',()=>{
 const state=battle(m(499));state.enemy.statStages.attack=3;state.enemy.statStages.defense=-2;state.enemy.accuracyStage=-2;
 const result=E.resolveTurn(state,{player:a(499),enemy:a(33)});assert.equal(result.state.enemy.statStages.attack,0);assert.equal(result.state.enemy.statStages.defense,0);assert.equal(result.state.enemy.accuracyStage,0);assert.doesNotThrow(()=>Mapper.mapEvents(result.events));
 const b=E.createBattle(mon(1,[C.SUPPORTED_STATUS_MOVES['swords-dance'],m(33)],['normal'],200),mon(2,[m(914)],['fairy'],20));
 const raised=E.resolveTurn(b,{player:a(14),enemy:a(914)});assert.ok(raised.events.some(e=>e.type==='CONFUSION_APPLIED'&&e.target==='player'));
 raised.state.player.confusionTurns=0;const next=E.resolveTurn(raised.state,{player:a(33),enemy:a(914)});assert.equal(next.events.some(e=>e.type==='CONFUSION_APPLIED'),false);
});

test('Sparkly Swirl cures the whole team without clearing confusion or the wrong active badge',()=>{
 const state=E.createTeamBattle([mon(1,[m(740)],['fairy'],200),mon(3),mon(5)],[mon(2),mon(4),mon(6)]);
 state.player.team[0].statusCondition='poison';state.player.team[0].confusionTurns=4;state.player.team[1].statusCondition='sleep';state.player.team[1].sleepTurns=2;
 const result=E.resolveTurn(state,{player:a(740),enemy:a(33)});assert.equal(result.state.player.team[0].statusCondition,null);assert.equal(result.state.player.team[1].statusCondition,null);assert.equal(result.state.player.team[1].sleepTurns,0);assert.equal(result.state.player.team[0].confusionTurns,3);
 const badges=[],adapter=new BattleUiDomAdapter({view:{displayMessage(){},updateStatusBadge:(...x)=>badges.push(x)}});
 for(const command of Mapper.mapEvents(result.events).filter(c=>c.type==='STATUS_FEEDBACK'))adapter.execute(command);
 assert.equal(badges.length,1);
});

test('P4 evaluator handles Rest, Sleep Talk, Snore, Dream Eater and Yawn and AI can choose them',()=>{
 const state=E.createBattle(mon(1,[m(156)],['normal']),mon(2));state.player.currentHp=100;
 assert.ok(V.evaluateMove(state.player,state.enemy,m(156)).expectedStatusBenefit>0);assert.equal(AI.chooseAction(state,'player',{strategy:'SMART'}).action.moveId,156);
 assert.equal(V.evaluateMove(state.player,state.enemy,m(173)).expectedDamage,0);assert.equal(V.evaluateMove(state.player,state.enemy,m(138)).expectedDamage,0);
 assert.ok(V.evaluateMove(state.player,state.enemy,m(281)).expectedStatusBenefit>0);
});

for(const role of ['player','enemy'])test(`Tri Attack real session from ${role}: immediate paralysis check is forwarded independently`,async()=>{
 const players=[mon(1,[m(161),m(33)],['normal'],role==='player'?200:20),mon(3),mon(5)],enemies=[mon(2,[m(161),m(33)],['normal'],role==='enemy'?200:20),mon(4),mon(6)],events=[];
 const rng=new DeterministicRandomSource({accuracySequence:[1,1],secondaryEffectSequence:role==='player'?[1,100]:[100,1],statusSequence:[1]});rng.setSecondaryStatusSequence([2]);
 const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async ids=>ids.map(id=>players.find(p=>p.id===id))},opponentFactory:{createOpponentTeam:async()=>enemies},ai:{chooseAction:()=>({action:a(role==='enemy'?161:33)})},randomSource:rng,presentationEngine:{play:async batch=>events.push(...batch),playCommands:async()=>{}}});
 await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();await session.submitPlayerMove(role==='player'?161:33);
 const target=role==='player'?'enemy':'player';assert.ok(events.some(e=>e.type==='STATUS_APPLIED'&&e.target===target&&e.statusCondition==='paralysis'));assert.ok(events.some(e=>e.type==='STATUS_IMMOBILIZED'&&e.actor===target));
});

test('P4 status-choice and called-move RNG sequences are independent of accuracy and damage',()=>{
 const rng=new DeterministicRandomSource({accuracySequence:[87],damageSequence:[91]});rng.setSecondaryStatusSequence([1,2,3]);rng.setCalledMoveSequence([2,0]);
 assert.deepEqual([rng.rollSecondaryStatusChoice(),rng.rollSecondaryStatusChoice(),rng.rollSecondaryStatusChoice()],[1,2,3]);assert.equal(rng.rollCalledMove(3),2);assert.equal(rng.rollCalledMove(3),0);assert.equal(rng.rollAccuracy(),87);assert.equal(rng.rollDamage(),91);
});

for(const effect of Object.values(P4.effects).filter(e=>e.chance<100))test(`P4 boundary: ${effect.name} does not apply a secondary above its chance`,()=>{
 const result=E.resolveTurn(battle(m(effect.id)),{player:a(effect.id,{secondaryEffectRoll:effect.chance+1,secondaryEffectRoll2:100,secondaryStatusChoice:1}),enemy:a(33)});
 assert.equal(result.events.some(e=>['STATUS_APPLIED','CONFUSION_APPLIED','FLINCH_APPLIED','STAT_STAGE_CHANGED'].includes(e.type)),false);
});

for(const role of ['player','enemy'])test(`Sleep Talk real session from ${role}: called attack, independent PP, one countdown`,async()=>{
 const p=[mon(1,[m(214),m(33)],['normal'],200),mon(3),mon(5)],e=[mon(2,[m(214),m(33)],['normal'],100),mon(4),mon(6)],events=[];
 const side=role==='player'?p:e;side[0].statusCondition='sleep';side[0].sleepTurns=2;
 const rng=new DeterministicRandomSource({accuracySequence:[1,1],damageSequence:[100,100],calledMoveSequence:[0]});
 const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async ids=>ids.map(id=>p.find(x=>x.id===id))},opponentFactory:{createOpponentTeam:async()=>e},ai:{chooseAction:()=>({action:a(role==='enemy'?214:33)})},randomSource:rng,presentationEngine:{play:async batch=>events.push(...batch),playCommands:async()=>{}}});
 await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();await session.submitPlayerMove(role==='player'?214:33);
 const active=session.battleState[role].team[0];assert.equal(active.sleepTurns,1);assert.equal(active.moves[0].currentPp,9);assert.equal(active.moves[1].currentPp,35);
 assert.ok(events.some(e=>e.type==='DAMAGE_APPLIED'&&e.source===role));assert.equal(events.filter(e=>e.type==='PP_CHANGED'&&e.actor===role).length,1);
});

test('Sleep Talk real session can call Tri Attack and prepare immediate freeze/thaw independently',async()=>{
 const p=[mon(1,[m(214),m(161)],['normal'],200),mon(3),mon(5)],e=[mon(2),mon(4),mon(6)],events=[];
 p[0].statusCondition='sleep';p[0].sleepTurns=2;
 const rng=new DeterministicRandomSource({accuracySequence:[1,1],damageSequence:[100,100],secondaryEffectSequence:[1,100],calledMoveSequence:[0],secondaryStatusSequence:[3],thawSequence:[1]});
 const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async ids=>ids.map(id=>p.find(x=>x.id===id))},opponentFactory:{createOpponentTeam:async()=>e},ai:{chooseAction:()=>({action:{type:'MOVE',moveId:33}})},randomSource:rng,presentationEngine:{play:async batch=>events.push(...batch),playCommands:async()=>{}}});
 await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();await session.submitPlayerMove(214);
 assert.ok(events.some(e=>e.type==='STATUS_APPLIED'&&e.statusCondition==='freeze'&&e.target==='enemy'));
 assert.ok(events.some(e=>e.type==='STATUS_CURED'&&e.reason==='THAWED'&&e.target==='enemy'));
 assert.ok(events.some(e=>e.type==='MOVE_USED'&&e.actor==='enemy'));
});

test('Yawn during player switch uses the queued sleep duration and follows the incoming target',async()=>{
 const p=[mon(1),mon(3),mon(5)],e=[mon(2,[m(281),m(33)]),mon(4),mon(6)];
 const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async ids=>ids.map(id=>p.find(x=>x.id===id))},opponentFactory:{createOpponentTeam:async()=>e},ai:{chooseAction:s=>({action:a(s.turn===1?281:33)})},randomSource:new DeterministicRandomSource({accuracySequence:[1,1,1],sleepDurationSequence:[3]}),presentationEngine:{play:async()=>{},playCommands:async()=>{}}});
 await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();await session.submitPlayerSwitch(3);
 assert.equal(session.battleState.player.team[0].drowsyTurns,0);assert.equal(session.battleState.player.team[1].drowsyTurns,1);
 await session.submitPlayerMove(33);assert.equal(session.battleState.player.team[1].statusCondition,'sleep');assert.equal(session.battleState.player.team[1].sleepTurns,3);
});

test('Precision/evasion stage changes reset through the real switch path and affect evaluator accuracy',()=>{
 const state=E.createTeamBattle([mon(1),mon(3),mon(5)],[mon(2),mon(4),mon(6)]);state.player.team[0].accuracyStage=-3;state.enemy.team[0].evasionStage=2;
 assert.equal(V.evaluateMove(state.player.team[0],state.enemy.team[0],m(33)).accuracy,37);
 const out=E.resolveTurn(state,{player:{type:'SWITCH',targetPokemonId:3},enemy:a(33)});assert.equal(out.state.player.team[0].accuracyStage,0);
 const enemyOut=E.resolveTurn(out.state,{player:a(33),enemy:{type:'SWITCH',targetPokemonId:4}});assert.equal(enemyOut.state.enemy.team[0].evasionStage,0);
});

test('Healing feedback clears the primary badge once and never says already affected',()=>{
 const state=battle(m(156));state.player.currentHp=100;state.player.statusCondition='burn';
 const result=E.resolveTurn(state,{player:a(156),enemy:a(33)}),messages=[];
 const adapter=new BattleUiDomAdapter({view:{displayMessage:text=>messages.push(text),updateStatusBadge(){}}});
 for(const cmd of Mapper.mapEvents(result.events).filter(c=>['STATUS_FEEDBACK','MOVE_FAIL_FEEDBACK'].includes(c.type)))adapter.execute(cmd);
 assert.ok(messages.some(t=>t.includes('curado')));assert.ok(messages.some(t=>t.includes('recuperou')));assert.equal(messages.some(t=>t.includes('já possui')),false);
});

test('P4 registry is immutable and legacy generic P4 placeholders are resolved to support or specific dependencies',()=>{
 for(const effect of Object.values(P4.effects))assert.equal(Object.isFrozen(effect),true);
 for(const move of Object.values(C.KNOWN_CATALOG_MOVES))assert.equal(C.getMoveCapability(move)?.knownPending.includes('SECONDARY_EFFECTS_PHASE_P4'),false,move.name);
 assert.equal(C.getMoveCapability(87).supportLevel,'FULL');
 assert.equal(C.getMoveCapability(299).supportLevel,'FULL');
});

test('Campaign exposes every newly introduced sleep family without invalidating its pool limits',()=>{
 const options=require('../../assets/js/campaign/campaign-move-options.js');
 for(const [id,moves] of [[143,[156,214]],[80,[173,281]],[97,[95,138]]]){
   const pool=options.getPool(id);for(const move of moves)assert.ok(pool.some(m=>m.id===move));assert.ok(pool.length<=6);
 }
});

for(const id of [815,902])test(`P4 thaw family: ${m(id).name} thaws after its secondary without burning a frozen target`,()=>{
 const state=battle(m(id));state.enemy.statusCondition='freeze';state.player.statusCondition='freeze';
 const result=E.resolveTurn(state,{player:a(id),enemy:a(33)});
 assert.equal(result.state.player.statusCondition,null);assert.equal(result.state.enemy.statusCondition,null);
 assert.equal(result.events.some(e=>e.type==='STATUS_APPLIED'&&e.statusCondition==='burn'),false);
 assert.equal(result.events.filter(e=>e.type==='STATUS_CURED'&&e.reason==='THAWED').length,2);
});

test('P4 status-choice RNG partitions the unit interval into three equally sized choices',()=>{
 const values=[0,0.3332,0.3334,0.6665,0.6668,0.999];
 const rng=new DeterministicRandomSource({rng:()=>values.shift()});
 assert.deepEqual(Array.from({length:6},()=>rng.rollSecondaryStatusChoice()),[1,1,2,2,3,3]);
});

test('Sleeping ordinary moves receive no tactical damage credit; Snore remains usable',()=>{
 const state=battle(m(33));state.player.statusCondition='sleep';state.player.sleepTurns=2;
 assert.equal(V.evaluateMove(state.player,state.enemy,m(33)).expectedDamage,0);
 assert.ok(V.evaluateMove(state.player,state.enemy,m(173)).expectedDamage>0);
});

test('Rest cannot heal if confusion prevents execution and Sleep Talk cannot recursively call itself',()=>{
 const state=battle(m(156));state.player.currentHp=100;state.player.confusionTurns=3;
 const result=E.resolveTurn(state,{player:a(156,{confusionHitRoll:1}),enemy:a(33)});
 assert.equal(result.events.some(e=>e.type==='HP_HEALED'),false);assert.equal(result.state.player.moves[0].currentPp,5);
 const sleeping=battle(m(214));sleeping.player.statusCondition='sleep';sleeping.player.sleepTurns=2;
 const noCall=E.resolveTurn(sleeping,{player:a(214),enemy:a(33)});assert.equal(noCall.events.filter(e=>e.type==='MOVE_USED'&&e.actor==='player').length,1);assert.ok(noCall.events.some(e=>e.reason==='NO_CALLABLE_MOVE'));
});
