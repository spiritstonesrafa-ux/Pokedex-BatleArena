const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('../../assets/js/battle/battle-engine');
const C=require('../../assets/js/battle/battle-constants');
const V=require('../../assets/js/battle/battle-evaluator');
const M=require('../../assets/js/battle/move-model');
const Mapper=require('../../assets/js/presentation/battle-presentation-mapper');
const {BattleSessionController}=require('../../assets/js/battle-session/battle-session-controller');
const {BattleTeamHydrator}=require('../../assets/js/battle-session/battle-team-hydrator');
const {DeterministicRandomSource}=require('../../assets/js/battle-session/battle-random-source');
const ids=[162,717,877];
const move=id=>C.KNOWN_CATALOG_MOVES[id]||C.SUPPORTED_STATUS_MOVES['swords-dance'];
const action=(id,extra={})=>({type:'MOVE',moveId:id,accuracyRoll:1,damageRoll:100,...extra});
const mon=(id,moves=[move(14)],types=['normal'])=>({id,name:'test-'+id,types,hp:401,level:50,attack:100,defense:100,specialAttack:100,specialDefense:100,speed:id%2?180:20,moves});
function run(id,hp=401,configure=()=>{},extra={}){const s=E.createBattle(mon(1,[move(id)]),mon(2));s.enemy.currentHp=hp;configure(s);return E.resolveTurn(s,{player:action(id,extra),enemy:action(14)});}
const damage=r=>r.events.find(e=>e.type==='DAMAGE_APPLIED'&&e.source==='player');
for(const id of ids){
 test(`Fractional ${id}: canonical data, null power and forged input rejection`,()=>{
  assert.equal(C.getMoveCapability(id).supportLevel,'FULL');assert.equal(C.validateMoveData(move(id)),true);assert.equal(M.createMove(move(id)).power,id===877?1:null);
  for(const power of [999,...(id===877?[]:[1]),-1,NaN,Infinity,true,{},[]]){const raw={...move(id),power},before={...raw};assert.equal(C.validateMoveData(raw),false);assert.throws(()=>M.createMove(raw));assert.deepEqual(raw,before);}
  assert.equal(C.isFractionalDamageMove({...move(id),name:'tackle'}),false);assert.equal(C.isFractionalDamageMove({...move(id),id:33}),false);
 });
 for(const hp of [401,400,101,100,3,2,1])test(`Fractional ${id}: current HP ${hp}`,()=>{const r=run(id,hp);const d=damage(r);assert.equal(d.damage,Math.max(1,Math.floor(hp/2)));assert.equal(d.currentHp,hp-d.damage);assert.equal(r.state.player.moves[0].currentPp,9);});
 test(`Fractional ${id}: consecutive uses recalculate current HP, not max HP`,()=>{
  let state=E.createBattle(mon(1,[move(id)]),mon(2));for(const expected of [200,100,50]){const r=E.resolveTurn(state,{player:action(id),enemy:action(14)});assert.equal(damage(r).damage,expected);state=r.state;}
 });
 test(`Fractional ${id}: stats, stages, level, burn, STAB and variance do not change damage`,()=>{
  for(const roll of [85,100]){const r=run(id,101,s=>{s.player.level=1;s.player.attack=999;s.player.specialAttack=1;s.enemy.defense=999;s.enemy.specialDefense=1;s.player.statStages.attack=-6;s.player.statStages.specialAttack=6;s.enemy.statStages.defense=6;s.enemy.statStages.specialDefense=-6;s.player.types=[move(id).type];s.player.statusCondition='burn';},{damageRoll:roll});assert.equal(damage(r).damage,50);assert.equal(damage(r).stabMultiplier,1);}
 });
 test(`Fractional ${id}: precision 90/91, PP and accuracy/evasion`,()=>{
  const hit=run(id,101,()=>{},{accuracyRoll:90});assert.equal(damage(hit).damage,50);
  const miss=run(id,101,()=>{},{accuracyRoll:91});assert.equal(damage(miss),undefined);assert.equal(miss.state.player.moves[0].currentPp,9);
  const evaded=run(id,101,s=>{s.enemy.evasionStage=1;},{accuracyRoll:90});assert.equal(damage(evaded),undefined);
 });
 test(`Fractional ${id}: evaluator agrees across live HP values and never predicts a half-HP KO above 1`,()=>{
  for(const hp of [401,3,2,1]){const s=E.createBattle(mon(1,[move(id)]),mon(2));s.enemy.currentHp=hp;const v=V.evaluateMove(s.player,s.enemy,s.player.moves[0]);const amount=Math.max(1,Math.floor(hp/2));assert.equal(v.minDamage,amount);assert.equal(v.maxDamage,amount);assert.equal(v.expectedDamage,Math.floor(amount*.9));assert.equal(v.guaranteedKo,hp===1);}
 });
 test(`Fractional ${id}: action impediments preserve existing PP contracts`,()=>{
  for(const status of ['sleep','freeze','paralysis']){const r=run(id,101,s=>{s.player.statusCondition=status;s.player.sleepTurns=2;},{thawRoll:100,statusRoll:1});assert.equal(damage(r),undefined);assert.equal(r.state.player.moves[0].currentPp,status==='paralysis'?9:10);}
  const confused=run(id,101,s=>{s.player.confusionTurns=3;},{confusionHitRoll:1,confusionDamageRoll:100});assert.equal(damage(confused),undefined);assert.ok(confused.events.some(e=>e.type==='CONFUSION_DAMAGE'));assert.equal(confused.state.player.moves[0].currentPp,10);
  assert.equal(damage(run(id,101,s=>{s.player.confusionTurns=3;},{confusionHitRoll:100})).damage,50);
  const flinch=run(id,101,s=>{s.player.isFlinched=true;});assert.equal(damage(flinch),undefined);assert.equal(flinch.state.player.moves[0].currentPp,10);
 });
 test(`Fractional ${id}: 1 HP KO resolves once and reserves remain intact`,()=>{
  const s=E.createTeamBattle([mon(1,[move(id)]),mon(3),mon(5)],[mon(2),mon(4),mon(6)]);s.enemy.team[0].currentHp=1;
  const r=E.resolveTurn(s,{player:action(id),enemy:action(14)});assert.equal(damage(r).damage,1);assert.equal(r.events.filter(e=>e.type==='POKEMON_FAINTED').length,1);assert.equal(r.events.filter(e=>e.type==='REPLACEMENT_REQUIRED').length,1);assert.equal(r.state.enemy.team[1].currentHp,401);
 });
}
test('Fractional: type immunity, resistances and weaknesses; Shadow only overrides immunity for enemy',()=>{
 for(const [id,types] of [[162,['ghost']],[717,['fire']],[717,['dragon']],[877,['fighting']],[877,['psychic']]]){
  const r=run(id,101,s=>{s.enemy.types=types;});const amount=id===162?0:50;assert.equal(damage(r).damage,amount);assert.equal(damage(r).multiplier,amount?1:0);
 }
 for(const aura of [false,true]){
  const s=E.createBattle(mon(1,[move(14)],['ghost']),mon(2,[move(162)]),{modifiers:{SHADOW_AURA:aura}});
  const r=E.resolveTurn(s,{player:action(14),enemy:action(162)});const d=r.events.find(e=>e.type==='DAMAGE_APPLIED'&&e.source==='enemy');assert.equal(d.damage,aura?200:0);
  const v=V.evaluateMove(s.enemy,s.player,s.enemy.moves[0],{attackerSide:'enemy',modifiers:s.modifiers});assert.equal(v.maxDamage,aura?200:0);
 }
 const r=run(162,101,s=>{s.enemy.types=['ghost'];s.modifiers={SHADOW_AURA:true};});assert.equal(damage(r).damage,0);
});
test('Fractional: slower user reads target HP after earlier Rest healing',()=>{
 const s=E.createBattle(mon(1,[move(162)]),mon(2,[move(156)]));s.player.speed=10;s.enemy.speed=200;s.enemy.currentHp=51;
 const r=E.resolveTurn(s,{player:action(162),enemy:action(156)});assert.equal(damage(r).previousHp,401);assert.equal(damage(r).damage,200);
});
for(const id of ids)for(const role of ['player','enemy'])test(`Fractional ${id}: real session ${role} and presentation`,async()=>{
 const p=[mon(1,[move(role==='player'?id:14)]),mon(3),mon(5)],e=[mon(2,[move(role==='enemy'?id:14)]),mon(4),mon(6)],events=[];
 const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async keys=>keys.map(k=>p.find(x=>x.id===k))},opponentFactory:{createOpponentTeam:async()=>e},ai:{chooseAction:()=>({action:action(role==='enemy'?id:14)})},randomSource:new DeterministicRandomSource({accuracySequence:[1,1]}),presentationEngine:{play:async batch=>events.push(...batch),playCommands:async()=>{}}});
 await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();await session.submitPlayerMove(role==='player'?id:14);
 const d=events.find(e=>e.type==='DAMAGE_APPLIED'&&e.source===role);assert.equal(d.damage,200);assert.equal(d.damageClass,move(id).damageClass);
 const commands=Mapper.mapEvents(events);assert.ok(commands.some(c=>c.type==='HP_TRANSITION'&&c.damage===200));const ann=commands.find(c=>c.type==='MOVE_ANNOUNCEMENT'&&c.moveName===move(id).name);assert.equal(ann.multiplier,1);assert.equal(ann.isImmune,false);
});
for(const id of ids)test(`Fractional ${id}: Sleep Talk preserves called move PP`,()=>{
 const s=E.createBattle(mon(1,[move(214),move(id)]),mon(2));s.player.statusCondition='sleep';s.player.sleepTurns=2;
 const r=E.resolveTurn(s,{player:action(214,{sleepTalkChoice:0}),enemy:action(14)});assert.equal(damage(r).damage,200);assert.equal(r.state.player.moves[0].currentPp,9);assert.equal(r.state.player.moves[1].currentPp,10);
});
for(const [species,id] of [[20,162],[785,717],[1003,877]])test(`Fractional ${id}: real hydration, invalid API response rejection and campaign`,async()=>{
 const detail=move(id);const raw={id:species,name:'fixture-'+species,types:[detail.type],stats:{hp:90,attack:90,defense:90,specialAttack:90,specialDefense:90,speed:90},moves:[{move:{name:detail.name,url:`https://pokeapi.co/api/v2/move/${id}/`}}]};
 const make=power=>new BattleTeamHydrator({api:{getPokemonDetail:async()=>raw,getMoveDetail:async()=>({...detail,power,type:{name:detail.type},damage_class:{name:detail.damageClass}})}});
 const hydrated=await make(null).hydratePokemon(species);const hm=hydrated.moves.find(m=>m.id===id);assert.ok(hm);assert.equal(hm.power,id===877?1:null);assert.equal(hm.type,detail.type);
 const s=E.createBattle(hydrated,mon(2));const r=E.resolveTurn(s,{player:action(id),enemy:action(14)});assert.equal(damage(r).damage,200);
 const rejected=await make(999).hydratePokemon(species);assert.ok(!rejected.moves.some(m=>m.id===id));
 const pool=require('../../assets/js/campaign/campaign-move-options').getPool(species);assert.ok(pool.some(m=>m.id===id));assert.ok(pool.length<=6);
});
test('Fractional: aliases, fixed damage and other null-power mechanics remain distinct',()=>{
 assert.equal(C.getMoveCapability('nature-s-madness').id,717);for(const id of [49,82,69,101])assert.equal(C.isFractionalDamageMove(move(id)),false);
 assert.equal(C.getMoveCapability(449).supportLevel,'FULL');assert.equal(C.getMoveCapability(851).supportLevel,'FULL');
});
for(const id of ids)for(const called of [false,true])test(`Fractional ${id}: real session ${called?'Sleep Talk':'enemy attack during player switch'}`,async()=>{
 const p=[mon(1,called?[move(214),move(id)]:[move(14)]),mon(3),mon(5)],e=[mon(2,[move(called?14:id)]),mon(4),mon(6)],events=[];
 p[1].currentHp=101;
 if(called){p[0].statusCondition='sleep';p[0].sleepTurns=2;}
 const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async keys=>keys.map(k=>p.find(x=>x.id===k))},opponentFactory:{createOpponentTeam:async()=>e},ai:{chooseAction:()=>({action:action(called?14:id)})},randomSource:new DeterministicRandomSource({accuracySequence:[1,1],calledMoveSequence:[0]}),presentationEngine:{play:async batch=>events.push(...batch),playCommands:async()=>{}}});
 await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();
 if(called)await session.submitPlayerMove(214);else await session.submitPlayerSwitch(3);
 const d=events.find(e=>e.type==='DAMAGE_APPLIED');assert.equal(d.damage,called?200:50);
 if(called){const a=session.battleState.player.team[0];assert.equal(a.moves[0].currentPp,9);assert.equal(a.moves[1].currentPp,10);}else{assert.equal(session.battleState.player.team[0].currentHp,401);assert.equal(session.battleState.player.team[1].currentHp,51);}
 assert.ok(Mapper.mapEvents(events).some(c=>c.type==='HP_TRANSITION'&&c.damage===d.damage));
});
test('Fractional: Ruination preserves the official sentinel power 1 through conversion and hydration',()=>{
 const raw={...move(877),type:{name:'dark'},damage_class:{name:'special'}};
 assert.equal(C.validateMoveData(raw),true);assert.equal(M.convertPokeApiMove(raw).power,1);
 for(const power of ['', ' ', false, [], 2, '2']){assert.equal(C.validateMoveData({...move(877),power}),false);assert.throws(()=>M.createMove({...move(877),power}));}
});

test('Fractional: Nature’s Madness alias is usable, not just a capability label',()=>{
 const alias={...move(717),name:'nature-s-madness'};assert.equal(C.validateMoveData(alias),true);const s=E.createBattle(mon(1,[alias]),mon(2));const r=E.resolveTurn(s,{player:action(717),enemy:action(14)});assert.equal(damage(r).damage,200);
});
