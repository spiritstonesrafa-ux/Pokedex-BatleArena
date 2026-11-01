const test=require('node:test'),assert=require('node:assert/strict');
const E=require('../../assets/js/battle/battle-engine'),C=require('../../assets/js/battle/battle-constants'),V=require('../../assets/js/battle/battle-evaluator'),AI=require('../../assets/js/battle/battle-ai'),M=require('../../assets/js/battle/move-model'),Mapper=require('../../assets/js/presentation/battle-presentation-mapper');
const {BattleSessionController}=require('../../assets/js/battle-session/battle-session-controller');const {DeterministicRandomSource}=require('../../assets/js/battle-session/battle-random-source');const {BattleTeamHydrator}=require('../../assets/js/battle-session/battle-team-hydrator');
const move=id=>C.KNOWN_CATALOG_MOVES[id]||C.SUPPORTED_STATUS_MOVES['swords-dance'];
const act=(id,x={})=>({type:'MOVE',moveId:id,accuracyRoll:1,damageRoll:100,secondaryEffectRoll:1,...x});
const mon=(id,ids=[14],type='grass')=>({id,name:'p5-'+id,types:[type],level:50,hp:1000,attack:100,defense:100,specialAttack:100,specialDefense:100,speed:id===1?50:100,weightKg:id===1?250:25,moves:ids.map(move)});
const hit=(r,side='player')=>r.events.filter(e=>e.type==='DAMAGE_APPLIED'&&e.source===side);
for(const m of Object.values(C.P5.moves)){
 test(`P5 ${m.id}: official metadata and strict normalization`,()=>{assert.equal(C.validateMoveData(m),true);assert.equal(M.createMove(m).power,m.power);assert.equal(C.getMoveCapability(m).knownPending.some(p=>p.includes('PHASE_P5')),false);assert.equal(C.P5.get({...m,name:'tackle'}),null);assert.equal(C.validateMoveData({...m,power:999}),false);assert.throws(()=>M.createMove({...m,power:999}));});
 test(`P5 ${m.id}: actual engine action and presentation`,()=>{
  const enemyMove=m.id===243?53:33;const s=E.createBattle(mon(1,[m.id]),mon(2,[enemyMove]));if(m.id===283)s.player.currentHp=100;if(m.id===599)s.enemy.statusCondition='poison';
  const r=E.resolveTurn(s,{player:act(m.id),enemy:act(enemyMove)});assert.equal(r.state.player.moves[0].currentPp,m.pp-1);assert.ok(!r.events.some(e=>e.type==='MOVE_FAILED'));
  if(m.id===117)assert.ok(r.state.player.bideState);else if(m.id!==599)assert.equal(hit(r).length,C.getMultiHitMove(m)?.maxHits||1);else assert.equal(r.events.filter(e=>e.type==='STAT_STAGE_CHANGED').length,3);
  assert.doesNotThrow(()=>Mapper.mapEvents(r.events));
 });
}
const stateFor=(id)=>E.createBattle(mon(1,[id]),mon(2));
for(const [kg,power] of [[9.9,20],[10,40],[24.9,40],[25,60],[49.9,60],[50,80],[99.9,80],[100,100],[199.9,100],[200,120]])test(`P5 weight threshold ${kg}`,()=>{const s=stateFor(67);s.enemy.weightKg=kg;for(const id of [67,447])assert.equal(C.P5.power(move(id),s.player,s.enemy,C),power);});
for(const [ratio,power] of [[1.99,40],[2,60],[2.99,60],[3,80],[4,100],[5,120]])test(`P5 relative weight ${ratio}`,()=>{const s=stateFor(484);s.enemy.weightKg=100;s.player.weightKg=100*ratio;assert.equal(C.P5.power(move(484),s.player,s.enemy,C),power);assert.equal(C.P5.power(move(535),s.player,s.enemy,C),power);});
test('P5 weight is official kg, including API hectograms and offline species data',()=>{assert.equal(E.createCombatant({...mon(1,[67]),weightKg:undefined,weight:690}).weightKg,69);assert.equal(E.createCombatant({...mon(143,[67]),weightKg:undefined}).weightKg,460);});
for(const [a,d,power] of [[50,100,51],[1,100,150],[100,1,1]])test(`P5 Gyro Ball ${a}/${d}`,()=>{const s=stateFor(360);s.player.speed=a;s.enemy.speed=d;assert.equal(C.P5.power(move(360),s.player,s.enemy,C),power);});
for(const [ratio,power] of [[.9,40],[1,60],[2,80],[3,120],[4,150]])test(`P5 Electro Ball ratio ${ratio}`,()=>{const s=stateFor(486);s.player.speed=ratio*100;s.enemy.speed=100;assert.equal(C.P5.power(move(486),s.player,s.enemy,C),power);});
test('P5 speed ratios include paralysis and stat stages',()=>{const s=stateFor(360);s.player.speed=100;s.enemy.speed=100;assert.equal(C.P5.power(move(360),s.player,s.enemy,C),26);s.player.statusCondition='paralysis';assert.equal(C.P5.power(move(360),s.player,s.enemy,C),51);s.player.statStages.speed=2;assert.equal(C.P5.power(move(360),s.player,s.enemy,C),26);});
for(const [hp,power] of [[1,200],[41,200],[42,150],[104,150],[105,100],[209,80],[354,80],[355,40],[688,20],[1000,20]])test(`P5 low HP power ${hp}`,()=>{const s=stateFor(175);s.player.currentHp=hp;for(const id of [175,179])assert.equal(C.P5.power(move(id),s.player,s.enemy,C),power);});
for(const id of [284,323,820])test(`P5 HP-scaled ${id}: 150,75,1 and live recalculation`,()=>{const s=E.createBattle(mon(1,[id]),mon(2,[33]));for(const [hp,p] of [[1000,150],[500,75],[1,1]]){s.player.currentHp=hp;assert.equal(C.P5.power(move(id),s.player,s.enemy,C),p);}s.player.currentHp=1000;const r=E.resolveTurn(s,{player:act(id),enemy:act(33)});const d=hit(r)[0];assert.equal(d.power,Math.floor(150*r.state.player.currentHp/1000));});
for(const [id,enemyId,factor] of [[68,33,2],[243,53,2],[368,33,1.5],[894,53,1.5]])test(`P5 counter ${id}: real damage, last hit and no stale turn history`,()=>{const s=E.createBattle(mon(1,[id]),mon(2,[enemyId]));const r=E.resolveTurn(s,{player:act(id),enemy:act(enemyId)});assert.equal(hit(r)[0].damage,Math.floor(hit(r,'enemy')[0].damage*factor));const next=E.resolveTurn(r.state,{player:act(id),enemy:{type:'MOVE',moveId:enemyId,accuracyRoll:100,...(enemyId===33?{}:{})}});assert.equal(next.state.turn,r.state.turn+1);});
test('P5 Counter: final multi-hit hit, not sum; residual and confusion are not direct damage',()=>{const s=E.createBattle(mon(1,[68]),mon(2,[331]));const r=E.resolveTurn(s,{player:act(68),enemy:act(331,{hitCountRoll:100,hitDamageRolls:[85,90,95,100,87]})});const list=hit(r,'enemy');assert.equal(list.length,5);assert.equal(hit(r)[0].damage,list[4].damage*2);
 const b=E.createBattle(mon(1,[68]),mon(2));b.player.statusCondition='poison';const miss=E.resolveTurn(b,{player:act(68),enemy:act(14)});assert.equal(hit(miss).length,0);assert.ok(miss.events.some(e=>e.reason==='NO_COUNTER_DAMAGE'));});
test('P5 Counter class mismatches, immune target, faster Metal Burst and reset on new turn',()=>{
 for(const [id,attack] of [[68,53],[243,33]]){const s=E.createBattle(mon(1,[id]),mon(2,[attack]));const r=E.resolveTurn(s,{player:act(id),enemy:act(attack)});assert.equal(hit(r).length,0);}
 const s=E.createBattle(mon(1,[368]),mon(2,[33]));s.player.speed=200;assert.equal(hit(E.resolveTurn(s,{player:act(368),enemy:act(33)})).length,0);
 const b=E.createBattle(mon(1,[68]),mon(2,[14]));b.player.lastDirectHit={sourceId:2,turn:0,damage:100,damageClass:'physical'};assert.equal(hit(E.resolveTurn(b,{player:act(68),enemy:act(14)})).length,0);
});
test('P5 Endeavor: equalizes current HP, failure consumes PP and Ghost immunity',()=>{const s=stateFor(283);s.player.currentHp=100;let r=E.resolveTurn(s,{player:act(283),enemy:act(14)});assert.equal(r.state.enemy.currentHp,100);s.player.currentHp=1000;r=E.resolveTurn(s,{player:act(283),enemy:act(14)});assert.equal(hit(r).length,0);assert.equal(r.state.player.moves[0].currentPp,4);});
for(const roll of [50,100,150])test(`P5 Psywave external roll ${roll}`,()=>{const s=stateFor(149);s.player.level=31;const r=E.resolveTurn(s,{player:act(149,{psywaveRoll:roll}),enemy:act(14)});assert.equal(hit(r)[0].damage,Math.floor(31*roll/100));assert.throws(()=>E.resolveTurn(s,{player:act(149,{psywaveRoll:151}),enemy:act(14)}));});
for(const id of [12,32,90,329])test(`P5 OHKO ${id}: level gate, precision boundary and no evasion scaling`,()=>{const s=stateFor(id);s.player.speed=200;s.player.accuracyStage=-6;s.enemy.evasionStage=6;const boundary=id===329?20:30;assert.equal(hit(E.resolveTurn(s,{player:act(id,{accuracyRoll:boundary}),enemy:act(14)}))[0].damage,1000);assert.equal(hit(E.resolveTurn(s,{player:act(id,{accuracyRoll:boundary+1}),enemy:act(14)})).length,0);s.enemy.level=51;assert.equal(hit(E.resolveTurn(s,{player:act(id),enemy:act(14)})).length,0);});
test('P5 Sheer Cold Ice eligibility, Ice immunity and ordinary type immunities',()=>{const s=stateFor(329);s.player.types=['ice'];assert.equal(C.getEffectiveAccuracy(move(329),s.player,s.enemy),30);s.enemy.types=['ice'];assert.equal(hit(E.resolveTurn(s,{player:act(329),enemy:act(14)})).length,0);for(const [id,type]of [[12,'ghost'],[32,'ghost'],[90,'flying']]){const b=stateFor(id);b.enemy.types=[type];assert.equal(hit(E.resolveTurn(b,{player:act(id),enemy:act(14)}))[0].damage,0);}});
test('P5 conditional powers and first-entry failure',()=>{const s=stateFor(371);assert.equal(C.P5.power(move(371),s.player,s.enemy,C),50);s.enemy.actedThisTurn=true;assert.equal(C.P5.power(move(371),s.player,s.enemy,C),100);assert.equal(C.P5.power(move(754),s.player,s.enemy,C),85);s.enemy.damagedThisTurn=true;assert.equal(C.P5.power(move(372),s.player,s.enemy,C),120);s.player.lastMoveFailed=true;assert.equal(C.P5.power(move(707),s.player,s.enemy,C),150);assert.equal(C.P5.power(move(915),s.player,s.enemy,C),150);
 const b=stateFor(660);const first=E.resolveTurn(b,{player:act(660),enemy:act(14)});assert.ok(hit(first).length);assert.equal(hit(E.resolveTurn(first.state,{player:act(660),enemy:act(14)})).length,0);
});
test('P5 Sucker Punch fails on status and already acted targets, succeeds before damage move',()=>{for(const enemyId of [14,33]){const s=E.createBattle(mon(1,[389]),mon(2,[enemyId]));const r=E.resolveTurn(s,{player:act(389),enemy:act(enemyId)});assert.equal(hit(r).length,enemyId===14?0:1);}});
test('P5 failure memory boosts next Stomping Tantrum and clears after success',()=>{const s=E.createBattle(mon(1,[707,371]),mon(2));s.player.accuracyStage=-6;let r=E.resolveTurn(s,{player:act(371,{accuracyRoll:100}),enemy:act(14)});assert.equal(r.state.player.lastMoveFailed,true);r.state.player.accuracyStage=0;r=E.resolveTurn(r.state,{player:act(707),enemy:act(14)});assert.equal(hit(r)[0].power,150);r=E.resolveTurn(r.state,{player:act(707),enemy:act(14)});assert.equal(hit(r)[0].power,75);});
test('P5 Photon Geyser category follows effective stats and burn only physical branch',()=>{const s=stateFor(722);s.player.speed=200;s.player.attack=200;s.player.specialAttack=100;const a=E.resolveTurn(s,{player:act(722),enemy:act(14)});assert.equal(hit(a)[0].damageClass,'physical');s.player.statusCondition='burn';const b=E.resolveTurn(s,{player:act(722),enemy:act(14)});assert.equal(hit(b)[0].damage,Math.floor(hit(a)[0].damage/2));s.player.attack=100;assert.equal(hit(E.resolveTurn(s,{player:act(722),enemy:act(14)}))[0].damageClass,'special');});
test('P5 Last Respects uses fainted teammates and new battle resets',()=>{const s=E.createTeamBattle([mon(1,[854]),mon(3),mon(5)],[mon(2),mon(4),mon(6)]);s.player.team[1].currentHp=0;s.player.team[2].currentHp=0;const r=E.resolveTurn(s,{player:act(854),enemy:act(14)});assert.equal(hit(r)[0].power,150);});
test('P5 stat pilots: self drops, conditional Venom Drench and Lumina Crash',()=>{for(const id of [276,354,437,705]){const s=stateFor(id);const r=E.resolveTurn(s,{player:act(id),enemy:act(14)});for(const [key,delta]of Object.entries(C.P5.drops[id]))assert.equal(r.state.player.statStages[key],delta);}
 const s=E.createBattle(mon(1,[599]),mon(2,[33]));s.enemy.statusCondition='toxic';let r=E.resolveTurn(s,{player:act(599),enemy:act(33)});for(const key of ['attack','specialAttack','speed'])assert.equal(r.state.enemy.statStages[key],-1);
 r=E.resolveTurn(stateFor(855),{player:act(855),enemy:act(14)});assert.equal(r.state.enemy.statStages.specialDefense,-2);
});
for(const m of Object.values(C.P5.moves))for(const side of ['player','enemy'])test(`P5 ${m.id}: real session ${side}`,async()=>{
 const source=mon(side==='player'?1:2,[m.id]);source.speed=20;const other=mon(side==='player'?2:1,[m.id===243?53:33]);other.speed=100;
 if(m.id===283)source.currentHp=100;if(m.id===599)other.statusCondition='poison';
 const p=[side==='player'?source:other,mon(3),mon(5)],e=[side==='enemy'?source:other,mon(4),mon(6)],events=[];
 const enemyId=side==='enemy'?m.id:(m.id===243?53:33),playerId=side==='player'?m.id:(m.id===243?53:33);
 const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async ids=>ids.map(id=>p.find(x=>x.id===id))},opponentFactory:{createOpponentTeam:async()=>e},ai:{chooseAction:()=>({action:act(enemyId)}),chooseReplacement:()=>({targetPokemonId:4})},randomSource:new DeterministicRandomSource({accuracySequence:[1,1],secondaryEffectSequence:[1,1],psywaveSequence:[50]}),presentationEngine:{play:async batch=>events.push(...batch),playCommands:async()=>{}}});
 await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();await session.submitPlayerMove(playerId);
 assert.notEqual(session.uiState,'ERROR');const active=session.battleState[side].team.find(p=>p.id===source.id);assert.equal(active.moves[0].currentPp,m.pp-1);
 assert.ok(!events.some(e=>e.type==='MOVE_FAILED'&&e.actor===side));assert.doesNotThrow(()=>Mapper.mapEvents(events));
 if(m.id===149)assert.equal(events.find(e=>e.type==='DAMAGE_APPLIED'&&e.source===side).damage,25);
});
for(const id of [67,360,175,283,149,12,68,599,855])test(`P5 ${id}: real hydration preserves canonical data and rejects forged power`,async()=>{
 const m=move(id),raw={id:1,name:'bulbasaur',types:['grass'],weight:69,stats:{hp:90,attack:100,defense:90,specialAttack:90,specialDefense:90,speed:90},moves:[{move:{name:m.name,url:`https://pokeapi.co/api/v2/move/${id}/`}}]};
 const hydrate=power=>new BattleTeamHydrator({api:{getPokemonDetail:async()=>raw,getMoveDetail:async()=>({...m,power,type:{name:m.type},damage_class:{name:m.damageClass}})}}).hydratePokemon(1);
 const result=await hydrate(m.power);assert.equal(result.weightKg,6.9);
 if(id!==599){const selected=result.moves.find(x=>x.id===id);assert.ok(selected);assert.equal(selected.power,m.power);assert.doesNotThrow(()=>E.createCombatant(result));}
 const bad=await hydrate(999);assert.ok(!bad.moves.some(x=>x.id===id));
});
test('P5 AI planning: future counter is conditional and stale turn flags do not leak',()=>{
 const s=E.createBattle(mon(1,[68,33]),mon(2,[33]));const v=V.evaluateMove(s.player,s.enemy,s.player.moves[0],{planningTurn:true,turn:1,attackerSide:'player'});assert.ok(v.expectedDamage>0);assert.equal(v.guaranteedKo,false);
 const a=V.evaluateMove(s.player,s.enemy,move(371),{planningTurn:true});s.enemy.actedThisTurn=true;s.enemy.damagedThisTurn=true;s.player.lastDirectHit={turn:0,sourceId:2,damage:999,damageClass:'physical'};const b=V.evaluateMove(s.player,s.enemy,move(371),{planningTurn:true});assert.equal(a.maxDamage,b.maxDamage);
});
test('P5 Psywave RNG is external, independent and validates bounds',()=>{const r=new DeterministicRandomSource({psywaveSequence:[50,150],damageSequence:[85]});assert.equal(r.rollPsywave(),50);assert.equal(r.rollDamage(),85);assert.equal(r.rollPsywave(),150);assert.equal(r.rollPsywave(),100);});
for(const [id,n,powers]of [[167,3,[10,20,30]],[813,3,[20,40,60]],[818,3,[25,25,25]],[860,10,Array(10).fill(20)]])test(`P5 advanced multihit ${id}: full sequence and one PP`,()=>{
 const s=stateFor(id);s.player.speed=200;const r=E.resolveTurn(s,{player:act(id,{hitAccuracyRolls:Array(n).fill(1)}),enemy:act(14)});assert.deepEqual(hit(r).map(e=>e.power),powers);assert.equal(r.state.player.moves[0].currentPp,move(id).pp-1);assert.equal(r.events.find(e=>e.type==='MULTI_HIT_COMPLETE').hitCount,n);
 const v=V.evaluateMove(s.player,s.enemy,s.player.moves[0]);assert.ok(v.maxDamage>=hit(r).reduce((sum,e)=>sum+e.damage,0));
});
for(const id of [167,813,860])for(const stop of [1,2])test(`P5 per-hit accuracy ${id}: stops before hit ${stop+1}`,()=>{
 const s=stateFor(id),n=C.getMultiHitMove(move(id)).maxHits;const rolls=Array(n).fill(1);rolls[stop]=91;const r=E.resolveTurn(s,{player:act(id,{hitAccuracyRolls:rolls}),enemy:act(14)});assert.equal(hit(r).length,stop);assert.equal(r.events.find(e=>e.type==='MULTI_HIT_COMPLETE').hitCount,stop);assert.equal(r.state.player.moves[0].currentPp,move(id).pp-1);
 const miss=E.resolveTurn(s,{player:act(id,{accuracyRoll:91,hitAccuracyRolls:Array(n).fill(91)}),enemy:act(14)});assert.equal(hit(miss).length,0);
});
test('P5 Surging Strikes: guaranteed critical ignores detrimental stages, still respects burn',()=>{
 const s=stateFor(818);let a=E.resolveTurn(s,{player:act(818),enemy:act(14)});s.player.statStages.attack=-6;s.enemy.statStages.defense=6;let b=E.resolveTurn(s,{player:act(818),enemy:act(14)});assert.deepEqual(hit(a).map(e=>e.damage),hit(b).map(e=>e.damage));assert.ok(hit(b).every(e=>e.critical&&e.criticalMultiplier===1.5));
 s.player.statusCondition='burn';b=E.resolveTurn(s,{player:act(818),enemy:act(14)});assert.equal(hit(b)[0].damage,Math.floor(hit(a)[0].damage/2));assert.equal(Mapper.mapEvents(a.events).find(c=>c.type==='MULTI_HIT_FEEDBACK').critical,true);
});
test('P5 multiaccuracy evaluator discounts later hits; escalation and Counter use actual last hit',()=>{
 const s=E.createBattle(mon(1,[167]),mon(2,[68]));s.player.speed=200;const r=E.resolveTurn(s,{player:act(167,{hitAccuracyRolls:[1,1,91]}),enemy:act(68)});assert.equal(hit(r).length,2);assert.equal(hit(r,'enemy')[0].damage,2*hit(r)[1].damage);
 const v=V.evaluateMove(s.player,s.enemy,s.player.moves[0]);assert.ok(v.averageDamage<v.maxDamage);assert.ok(v.expectedDamage<v.averageDamage);
});
test('P5 Bide: two storage turns, release double sum, one PP and lock priority',()=>{
 let s=E.createBattle(mon(1,[117,33]),mon(2,[33]));let r=E.resolveTurn(s,{player:act(117),enemy:act(33)});let stored=hit(r,'enemy')[0].damage;assert.equal(hit(r).length,0);assert.ok(r.state.player.bideState);assert.equal(r.state.player.moves[0].currentPp,9);
 r=E.resolveTurn(r.state,{player:act(33),enemy:act(33)});stored+=hit(r,'enemy')[0].damage;assert.equal(hit(r).length,0);assert.equal(r.state.player.moves[0].currentPp,9);
 r=E.resolveTurn(r.state,{player:act(33),enemy:act(33)});assert.equal(hit(r)[0].moveName,'bide');assert.equal(hit(r)[0].damage,stored*2);assert.equal(r.state.player.bideState,null);assert.equal(r.state.player.moves[0].currentPp,9);assert.equal(r.state.player.moves[1].currentPp,35);
});
test('P5 Bide ignores elemental immunity, excludes poison residual, and aborts on sleep/switch',()=>{
 const s=E.createBattle(mon(1,[117]),mon(2,[33],'ghost'));let r=E.resolveTurn(s,{player:act(117),enemy:act(33)});r=E.resolveTurn(r.state,{player:act(117),enemy:act(33)});r=E.resolveTurn(r.state,{player:act(117),enemy:act(33)});assert.ok(hit(r)[0].damage>0);assert.equal(hit(r)[0].multiplier,1);
 const b=stateFor(117);b.player.statusCondition='poison';let no=E.resolveTurn(b,{player:act(117),enemy:act(14)});no=E.resolveTurn(no.state,{player:act(117),enemy:act(14)});no=E.resolveTurn(no.state,{player:act(117),enemy:act(14)});assert.equal(hit(no).length,0);assert.ok(no.events.some(e=>e.reason==='NO_BIDE_DAMAGE'));
 let asleep=E.resolveTurn(s,{player:act(117),enemy:act(33)});asleep.state.player.statusCondition='sleep';asleep.state.player.sleepTurns=2;asleep=E.resolveTurn(asleep.state,{player:act(117),enemy:act(33)});assert.equal(asleep.state.player.bideState,null);
 const team=E.createTeamBattle([mon(1,[117]),mon(3),mon(5)],[mon(2,[33]),mon(4),mon(6)]);let t=E.resolveTurn(team,{player:act(117),enemy:act(33)});t=E.resolveTurn(t.state,{player:{type:'SWITCH',targetPokemonId:3},enemy:act(33)});assert.equal(t.state.player.team[0].bideState,null);
});
test('P5 Beak Blast burns contact attacker before subsequent hits, does not burn ranged or Fire',()=>{
 for(const [enemyId,type,burned]of [[33,'grass',true],[53,'grass',false],[33,'fire',false]]){const s=E.createBattle(mon(1,[690]),mon(2,[enemyId],type));const r=E.resolveTurn(s,{player:act(690),enemy:act(enemyId)});assert.equal(r.state.enemy.statusCondition==='burn',burned);assert.ok(r.events.some(e=>e.type==='MOVE_PREPARED'&&e.reason==='BEAK_BLAST_READY'));}
 const s=E.createBattle(mon(1,[690]),mon(2,[24]));const r=E.resolveTurn(s,{player:act(690),enemy:act(24)});const h=hit(r,'enemy');assert.equal(h.length,2);assert.equal(h[1].damage,Math.floor(h[0].damage/2));
});
test('P5 Shell Trap only fires after a direct physical hit, irrespective of contact',()=>{
 for(const [enemyId,works]of [[33,true],[89,true],[53,false],[14,false]]){const s=E.createBattle(mon(1,[704]),mon(2,[enemyId]));const r=E.resolveTurn(s,{player:act(704),enemy:act(enemyId)});assert.equal(hit(r).length,works?1:0);if(!works)assert.ok(r.events.some(e=>e.reason==='SHELL_TRAP'));assert.equal(r.state.player.moves[0].currentPp,4);}
});
test('P5 Hidden Power derives type from IV parity, defaults Dark, and validates IVs',()=>{
 const s=stateFor(237);assert.equal(C.P5.type(move(237),s.player),'dark');s.player.ivs=Object.fromEntries(Object.keys(s.player.ivs).map(k=>[k,30]));assert.equal(C.P5.type(move(237),s.player),'fighting');
 const r=E.resolveTurn(s,{player:act(237),enemy:act(14)});assert.equal(hit(r)[0].attackType,'fighting');assert.equal(V.evaluateMove(s.player,s.enemy,s.player.moves[0]).moveType,'fighting');assert.throws(()=>E.createCombatant({...mon(1,[237]),ivs:{attack:32}}),/IV/);
 const d=stateFor(686);d.player.types=['fire','flying'];assert.equal(C.P5.type(move(686),d.player),'fire');const hitD=E.resolveTurn(d,{player:act(686),enemy:act(14)});assert.equal(hit(hitD)[0].attackType,'fire');
});
test('P5 Sleep Talk excludes Bide, Beak Blast and Shell Trap in engine and real session',async()=>{
 const s=E.createBattle(mon(1,[214,117,690,704]),mon(2));s.player.statusCondition='sleep';s.player.sleepTurns=2;const r=E.resolveTurn(s,{player:act(214),enemy:act(14)});assert.ok(r.events.some(e=>e.reason==='NO_CALLABLE_MOVE'));
 const p=[mon(1,[214,690,33]),mon(3),mon(5)],e=[mon(2),mon(4),mon(6)],events=[];p[0].statusCondition='sleep';p[0].sleepTurns=2;
 const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async ids=>ids.map(id=>p.find(m=>m.id===id))},opponentFactory:{createOpponentTeam:async()=>e},ai:{chooseAction:()=>({action:act(14)})},randomSource:new DeterministicRandomSource({calledMoveSequence:[0]}),presentationEngine:{play:async batch=>events.push(...batch),playCommands:async()=>{}}});await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();await session.submitPlayerMove(214);assert.equal(events.find(e=>e.type==='DAMAGE_APPLIED').moveName,'tackle');
});
test('P5 Bide last PP: real session continues at zero PP, AI stays locked and UI remains usable',async()=>{
 const p=[mon(1,[117,33]),mon(3),mon(5)],e=[mon(2,[33]),mon(4),mon(6)],events=[];p[0].moves=p[0].moves.map(m=>({...m,currentPp:m.id===117?1:m.pp}));
 const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async ids=>ids.map(id=>p.find(m=>m.id===id))},opponentFactory:{createOpponentTeam:async()=>e},ai:{chooseAction:()=>({action:act(33)})},randomSource:new DeterministicRandomSource({accuracySequence:[1,1,1,1,1,1]}),presentationEngine:{play:async batch=>events.push(...batch),playCommands:async()=>{}}});await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();await session.submitPlayerMove(117);
 assert.equal(session.battleState.player.team[0].moves[0].currentPp,0);assert.equal(AI.chooseAction(session.battleState,'player').action.moveId,117);
 const {BattleView}=require('../../assets/js/ui/battle-view');const container={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};const view=new BattleView({container,arenaController:{}});view.renderActiveBattleView(session.battleState,'AWAITING_PLAYER_ACTION');
 assert.doesNotMatch(container.innerHTML.match(/<button\s+id="moveBtn_117"[\s\S]*?>/)[0],/\bdisabled\b/);assert.match(container.innerHTML.match(/<button\s+id="moveBtn_33"[\s\S]*?>/)[0],/\bdisabled\b/);
 await session.submitPlayerMove(117);await session.submitPlayerMove(117);assert.equal(session.battleState.player.team[0].bideState,null);assert.equal(session.battleState.player.team[0].moves[0].currentPp,0);assert.ok(events.some(e=>e.type==='DAMAGE_APPLIED'&&e.moveName==='bide'));
});
test('P5 labels and dynamic types are honest in battle controls',()=>{
 for(const id of [67,68,117,149,175,283,599,162,49,69])assert.ok(C.describeMovePower(move(id)));
 const s=E.createTeamBattle([mon(1,[237,67]),mon(3),mon(5)],[mon(2),mon(4),mon(6)]);const {BattleView}=require('../../assets/js/ui/battle-view');const container={innerHTML:'',querySelector:()=>null,querySelectorAll:()=>[]};new BattleView({container,arenaController:{}}).renderActiveBattleView(s,'AWAITING_PLAYER_ACTION');assert.ok(container.innerHTML.includes('Tipo dark'));assert.ok(!container.innerHTML.includes('Pwr null'));assert.ok(container.innerHTML.includes('Poder variável'));
});
test('P5 preparation flags and Bide data clear on forced switch and faint',()=>{
 const s=E.createTeamBattle([mon(1,[117]),mon(3),mon(5)],[mon(2,[525]),mon(4),mon(6)]);let r=E.resolveTurn(s,{player:act(117),enemy:act(525,{forcedSwitchIndex:1})});assert.equal(r.state.player.team[0].bideState,null);
 const b=E.createBattle(mon(1,[117]),mon(2,[12]));b.player.currentHp=1;r=E.resolveTurn(b,{player:act(117),enemy:act(12)});assert.equal(r.state.player.bideState,null);
});
test('P5 Venom Drench fails at all lower caps and counter forecast cannot guarantee unknown damage',()=>{
 const s=E.createBattle(mon(1,[599]),mon(2));s.enemy.statusCondition='poison';s.enemy.statStages={...s.enemy.statStages,attack:-6,specialAttack:-6,speed:-6};const r=E.resolveTurn(s,{player:act(599),enemy:act(14)});assert.ok(r.events.some(e=>e.reason==='STAT_LIMIT'));
});
test('P5 Stomping Tantrum remembers paralysis, sleep, flinch and confusion as failed attempts',()=>{
 for(const kind of ['paralysis','sleep','flinch','confusion']){
  const s=stateFor(707);let extra={};
  if(kind==='paralysis'){s.player.statusCondition='paralysis';extra.statusRoll=1;}
  if(kind==='sleep'){s.player.statusCondition='sleep';s.player.sleepTurns=2;}
  if(kind==='flinch')s.player.isFlinched=true;
  if(kind==='confusion'){s.player.confusionTurns=3;extra.confusionHitRoll=1;}
  let r=E.resolveTurn(s,{player:act(707,extra),enemy:act(14)});assert.equal(r.state.player.lastMoveFailed,true,kind);
  r.state.player.statusCondition=null;r.state.player.sleepTurns=0;r.state.player.confusionTurns=0;
  r=E.resolveTurn(r.state,{player:act(707),enemy:act(14)});assert.equal(hit(r)[0].power,150,kind);
 }
});
test('P5 OHKO forecast never claims a guaranteed KO at 30 percent accuracy',()=>{const s=stateFor(12);const v=V.evaluateMove(s.player,s.enemy,s.player.moves[0]);assert.equal(v.guaranteedKo,false);assert.equal(v.maxDamage,1000);assert.equal(v.expectedDamage,300);});
test('P5 multiaccuracy rejects a contradictory first-hit input',()=>{const s=stateFor(167);assert.throws(()=>E.resolveTurn(s,{player:act(167,{hitAccuracyRolls:[91,1,1]}),enemy:act(14)}),/primeiro acerto/);});
test('P5 newly battle-ready species have limited canonical campaign loadouts and hydrate offline',async()=>{
 const X=require('../../assets/js/expanded-pokemon-catalog'),F=require('../../assets/js/campaign/campaign-fixed-battle-catalog'),Catalog=require('../../assets/js/campaign/campaign-catalog');const h=new BattleTeamHydrator({api:{getPokemonDetail:async()=>{throw Error('offline')}}});
 for(const [id,expected]of [[201,[237]],[202,[68,243]],[360,[68,243]],[771,[68,243]]]){assert.equal(X.byId[id].collectionOnly,false);assert.equal(Catalog.byId(id).collectionOnly,false);const fixed=F.byId[id];assert.deepEqual(fixed.moves.map(m=>m.id),expected);assert.equal(fixed.campaignLimitedMoves,true);const hydrated=await h.hydratePokemon({...fixed,campaignFixedMoves:true});assert.equal(hydrated.moves.length,expected.length);assert.doesNotThrow(()=>E.createCombatant(hydrated));}
});
test('P5 tactical guide uses real dynamic types and avoids false weakness bonuses for fixed damage',()=>{
 const G=require('../../assets/js/campaign/campaign-matchup-guide');const selected=[{id:1,name:'a',types:['psychic']}],opponents=[{id:2,name:'b',types:['psychic']}];const fallbackById={1:{moves:[move(237)]},2:{moves:[move(69)]}};
 let report=G.buildReport({selected,opponents,fallbackById});assert.equal(report.entries[0].matchups[0].bestAttack.type,'dark');assert.equal(report.entries[0].matchups[0].bestAttack.multiplier,2);
 fallbackById[1].moves=[move(69)];opponents[0].types=['normal'];report=G.buildReport({selected,opponents,fallbackById});assert.equal(report.entries[0].matchups[0].bestAttack.multiplier,1);assert.equal(report.covered,0);
});
test('P5 locked Bide normalizes action intent before preparation without mutating commands',()=>{
 const s=E.createBattle(mon(1,[117,690]),mon(2,[33]));const first=E.resolveTurn(s,{player:act(117),enemy:act(33)});
 const actions={player:act(690),enemy:act(33)},before=JSON.stringify(actions);const r=E.resolveTurn(first.state,actions);assert.equal(JSON.stringify(actions),before);assert.equal('turnActions' in r.state,false);assert.ok(!r.events.some(e=>e.reason==='BEAK_BLAST_READY'));assert.equal(r.state.player.beakBlastReady,false);assert.equal(r.state.player.moves[1].currentPp,15);
});
test('P5 preparation and Sucker Punch honor moveName commands and skip exhausted defaults',()=>{
 const s=E.createBattle(mon(1,[33,690]),mon(2,[33]));let r=E.resolveTurn(s,{player:{type:'MOVE',moveName:'beak-blast'},enemy:act(33)});assert.equal(r.state.enemy.statusCondition,'burn');
 const b=E.createBattle(mon(1,[389]),mon(2,[33,14]));r=E.resolveTurn(b,{player:act(389),enemy:{type:'MOVE',moveName:'swords-dance'}});assert.equal(hit(r).length,0);assert.ok(r.events.some(e=>e.reason==='SUCKER_PUNCH'));
 const d=E.createBattle(mon(1,[690,33]),mon(2,[33]));d.player.moves[0].currentPp=0;r=E.resolveTurn(d,{enemy:act(33)});assert.ok(!r.events.some(e=>e.reason==='BEAK_BLAST_READY'));
});
