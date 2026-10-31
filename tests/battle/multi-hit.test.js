const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const V = require('../../assets/js/battle/battle-evaluator');
const AI = require('../../assets/js/battle/battle-ai');
const Mapper = require('../../assets/js/presentation/battle-presentation-mapper');
const {BattleUiDomAdapter} = require('../../assets/js/ui/battle-ui-adapter');
const {BattleSessionController} = require('../../assets/js/battle-session/battle-session-controller');
const {DeterministicRandomSource} = require('../../assets/js/battle-session/battle-random-source');
const ids = [331,333,350,292,24,41,594];
const m = id => C.KNOWN_CATALOG_MOVES[id] || C.SUPPORTED_STATUS_MOVES['swords-dance'];
const a = (id, extra = {}) => ({type:'MOVE',moveId:id,accuracyRoll:1,damageRoll:100,...extra});
function mon(id, moves=[m(14)], types=['normal']) {
 return {id,name:`mon-${id}`,types,hp:2000,attack:100,defense:100,specialAttack:100,specialDefense:100,speed:id%2?150:30,moves};
}
function run(id, extra={}, configure=()=>{}) {
 const state=E.createBattle(mon(1,[m(id)]),mon(2));configure(state);
 return E.resolveTurn(state,{player:a(id,extra),enemy:a(14)});
}
const hits = r => r.events.filter(e=>e.type==='DAMAGE_APPLIED'&&e.source==='player');
const complete = r => r.events.find(e=>e.type==='MULTI_HIT_COMPLETE');
for (const [roll,count] of [[1,2],[35,2],[36,3],[70,3],[71,4],[85,4],[86,5],[100,5]]) {
 test(`P5: modern hit distribution boundary ${roll} gives ${count}`,()=>{
  const r=run(331,{hitCountRoll:roll});assert.equal(hits(r).length,count);assert.equal(complete(r).hitCount,count);
 });
}
for (const id of ids) test(`P5: canonical pilot ${id}, one action, accuracy and PP`,()=>{
 assert.equal(C.getMoveCapability(id).supportLevel,'FULL');assert.equal(C.validateMoveData(m(id)),true);
 const r=run(id,{hitCountRoll:100});const count=id===24||id===41?2:5;
 assert.equal(hits(r).length,count);assert.equal(r.state.player.moves[0].currentPp,m(id).pp-1);
 assert.equal(r.events.filter(e=>e.type==='MOVE_USED'&&e.actor==='player').length,1);
 assert.equal(r.events.filter(e=>e.type==='PP_CHANGED'&&e.actor==='player').length,1);
 assert.deepEqual(hits(r).map(e=>e.hitIndex),Array.from({length:count},(_,i)=>i+1));
 assert.equal(complete(r).totalDamage,hits(r).reduce((sum,e)=>sum+e.previousHp-e.currentHp,0));
});
test('P5: each hit has independent damage variance and contiguous HP',()=>{
 const r=run(331,{hitCountRoll:86,hitDamageRolls:[85,100,90,95,87]});const list=hits(r);
 assert.deepEqual(list.map(e=>e.damageRoll),[85,100,90,95,87]);assert.ok(list[0].damage<list[1].damage);
 for(let i=1;i<list.length;i++)assert.equal(list[i].previousHp,list[i-1].currentHp);
});
test('P5: missing external rolls preserve deterministic two-hit fallback',()=>{
 assert.equal(hits(run(331)).length,2);assert.deepEqual(hits(run(24)).map(e=>e.damageRoll),[100,100]);
});
for (const bad of [0,101,1.5,NaN]) test(`P5: invalid count ${bad} rejected without mutating input`,()=>{
 const state=E.createBattle(mon(1,[m(331)]),mon(2));const before=JSON.stringify(state);
 assert.throws(()=>E.resolveTurn(state,{player:a(331,{hitCountRoll:bad}),enemy:a(14)}),/acertos/);assert.equal(JSON.stringify(state),before);
});
for (const bad of [[100],[100,84],[100,101],[100,90.5],{},null]) test(`P5: invalid damage array ${JSON.stringify(bad)} rejected`,()=>{
 assert.throws(()=>run(24,{hitDamageRolls:bad}),/acerto/);
});
test('P5: miss and Ghost immunity produce no hits or count but spend one PP',()=>{
 for(const [id,extra,configure] of [[350,{accuracyRoll:91},()=>{}],[24,{},s=>{s.enemy.types=['ghost'];}]]){
  const r=run(id,extra,configure);assert.equal(hits(r).length,0);assert.equal(complete(r),undefined);assert.equal(r.state.player.moves[0].currentPp,m(id).pp-1);
 }
});
test('P5: KO interrupts hits and cannot spill damage into reserves',()=>{
 const state=E.createTeamBattle([mon(1,[m(331)]),mon(3),mon(5)],[mon(2),mon(4),mon(6)]);
 state.enemy.team[0].currentHp=1;const r=E.resolveTurn(state,{player:a(331,{hitCountRoll:100}),enemy:a(14)});
 assert.equal(hits(r).length,1);assert.equal(complete(r).hitCount,1);assert.equal(complete(r).plannedHits,5);assert.equal(complete(r).totalDamage,1);
 assert.equal(r.state.enemy.team[1].currentHp,2000);assert.equal(r.events.filter(e=>e.type==='POKEMON_FAINTED').length,1);
 assert.equal(r.events.filter(e=>e.type==='REPLACEMENT_REQUIRED').length,1);
});
test('P5: a final KO emits one battle result after count',()=>{
 const r=run(24,{},s=>{s.enemy.currentHp=1;});assert.equal(r.state.status,'PLAYER_WIN');assert.equal(r.events.filter(e=>e.type==='BATTLE_ENDED').length,1);
 assert.ok(r.events.findIndex(e=>e.type==='MULTI_HIT_COMPLETE')<r.events.findIndex(e=>e.type==='POKEMON_FAINTED'));
});
for (const [rolls,index] of [[[20,100],1],[[21,20],2],[[21,21],null],[[1,1],1]]) test(`P5: Twineedle poison rolls ${rolls}`,()=>{
 const r=run(41,{hitSecondaryEffectRolls:rolls});const status=r.events.filter(e=>e.type==='STATUS_APPLIED'&&e.source==='player');
 assert.equal(status.length,index?1:0);if(index)assert.equal(status[0].hitIndex,index);
});
test('P5: poison respects primary status, type immunity and KO',()=>{
 for(const configure of [s=>{s.enemy.types=['steel'];},s=>{s.enemy.types=['poison'];},s=>{s.enemy.statusCondition='burn';},s=>{s.enemy.currentHp=1;}]){
  const r=run(41,{hitSecondaryEffectRolls:[1,1]},configure);assert.equal(r.events.filter(e=>e.type==='STATUS_APPLIED').length,0);
 }
 assert.throws(()=>run(41,{hitSecondaryEffectRolls:[0,1]}),/acerto/);
});
test('P5: burn, STAB, stages and effectiveness apply per hit',()=>{
 const normal=hits(run(24));const burned=hits(run(24,{},s=>{s.player.statusCondition='burn';}));
 for(let i=0;i<2;i++)assert.equal(burned[i].damage,Math.max(1,Math.floor(normal[i].damage/2)));
 const strong=hits(run(24,{},s=>{s.player.types=['fighting'];s.player.statStages.attack=2;s.enemy.types=['rock'];}));
 assert.ok(strong.every(e=>e.damage>normal[0].damage));assert.ok(strong.every(e=>e.stabMultiplier===1.5&&e.typeMultiplier===2));
});
for(const status of ['sleep','freeze','paralysis']) test(`P5: ${status} interrupt consumes no extra hit PP`,()=>{
 const r=run(331,{statusRoll:1,thawRoll:100},s=>{s.player.statusCondition=status;s.player.sleepTurns=2;});
 assert.equal(hits(r).length,0);assert.equal(complete(r),undefined);
 // Current paralysis contract consumes the attempted move PP; sleep/freeze do not.
 assert.equal(r.state.player.moves[0].currentPp,30-(status==='paralysis'?1:0));
});
test('P5: evaluator sums per-hit rounded damage and AI recognizes total damage',()=>{
 const state=E.createBattle(mon(1,[m(24),m(33)]),mon(2));const v=V.evaluateMove(state.player,state.enemy,state.player.moves[0]);
 const rolls=hits(run(24,{hitDamageRolls:[85,85]}));assert.equal(v.minDamage,rolls.reduce((n,e)=>n+e.damage,0));
 assert.equal(v.maxDamage,hits(run(24)).reduce((n,e)=>n+e.damage,0));
 state.enemy.currentHp=v.minDamage;assert.equal(V.evaluateMove(state.player,state.enemy,state.player.moves[0]).guaranteedKo,true);
 assert.equal(AI.chooseAction(state,'player',{strategy:'SMART'}).action.moveId,24);
 const variable=V.evaluateMove(state.player,state.enemy,m(331));assert.ok(variable.maxDamage>variable.minDamage*2);
 const poison=V.evaluateMove(state.player,{...state.enemy,currentHp:2000},m(41));assert.ok(Math.abs(poison.statusChance-0.36)<1e-9);
});
test('P5: presentation keeps every HP transition and reports actual hits',async()=>{
 const r=run(331,{hitCountRoll:86});const commands=Mapper.mapEvents(r.events);
 assert.equal(commands.filter(c=>c.type==='HP_TRANSITION'&&c.target==='enemy').length,5);
 const cmd=commands.find(c=>c.type==='MULTI_HIT_FEEDBACK');assert.equal(cmd.hitCount,5);
 let message;const adapter=new BattleUiDomAdapter({view:{displayMessage:text=>{message=text;}}});await adapter.execute(cmd);assert.equal(message,'Atingiu 5 vezes!');
});
test('P5: count RNG has an independent channel and validates injected values',()=>{
 const rng=new DeterministicRandomSource({hitCountSequence:[86,35],damageSequence:[85],secondaryEffectSequence:[20]});
 assert.equal(rng.rollHitCount(),86);assert.equal(rng.rollDamage(),85);assert.equal(rng.rollHitCount(),35);assert.equal(rng.rollSecondaryEffect(),20);
 rng.setHitCountSequence([101]);assert.throws(()=>rng.rollHitCount(),/acertos/);
});
for(const [species,moveIds] of [[286,[331]],[91,[333,350]],[297,[292,252]],[34,[24]],[15,[41]],[658,[594]]])test(`P5: curated campaign options ${species}`,()=>{
 const pool=require('../../assets/js/campaign/campaign-move-options').getPool(species);assert.ok(pool.length<=6);for(const id of moveIds)assert.ok(pool.some(m=>m.id===id));
});
for(const role of ['player','enemy'])for(const called of [false,true])test(`P5: real session ${role}${called?' through Sleep Talk':''}`,async()=>{
 const p=[mon(1,called?[m(214),m(331)]:[m(331)]),mon(3),mon(5)],e=[mon(2,called?[m(214),m(331)]:[m(331)]),mon(4),mon(6)],events=[];
 if(called){const active=(role==='player'?p:e)[0];active.statusCondition='sleep';active.sleepTurns=2;}
 const rng=new DeterministicRandomSource({accuracySequence:[1,1],damageSequence:[100,85,90,95,87,100,85,90,95,87],hitCountSequence:[100],calledMoveSequence:[0]});
 const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async ids=>ids.map(id=>p.find(x=>x.id===id))},opponentFactory:{createOpponentTeam:async()=>e},ai:{chooseAction:()=>({action:a(role==='enemy'?(called?214:331):14)})},randomSource:rng,presentationEngine:{play:async batch=>events.push(...batch),playCommands:async()=>{}}});
 // The non-attacking side needs a real status move in its loadout.
 (role==='player'?e:p)[0].moves=[m(14)];
 await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();await session.submitPlayerMove(role==='player'?(called?214:331):14);
 assert.equal(events.filter(e=>e.type==='DAMAGE_APPLIED'&&e.source===role).length,5);
 const active=session.battleState[role].team[0];assert.equal(active.moves[0].currentPp,m(called?214:331).pp-1);
 if(called){assert.equal(active.moves[1].currentPp,30);assert.equal(active.sleepTurns,1);}
});
test('P5: real session prepares enemy hits during player switch',async()=>{
 const p=[mon(1),mon(3),mon(5)],e=[mon(2,[m(41)]),mon(4),mon(6)],events=[];
 const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async ids=>ids.map(id=>p.find(x=>x.id===id))},opponentFactory:{createOpponentTeam:async()=>e},ai:{chooseAction:()=>({action:a(41)})},randomSource:new DeterministicRandomSource({accuracySequence:[1],secondaryEffectSequence:[21,20],damageSequence:[85,100]}),presentationEngine:{play:async batch=>events.push(...batch),playCommands:async()=>{}}});
 await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();await session.submitPlayerSwitch(3);
 const damage=events.filter(e=>e.type==='DAMAGE_APPLIED');assert.deepEqual(damage.map(e=>e.damageRoll),[85,100]);
 assert.equal(session.battleState.player.team[1].statusCondition,'poison');assert.equal(session.battleState.player.team[0].statusCondition,null);
});

test('P5: Water Shuriken canonical metadata, special category, priority +1 and FULL support', () => {
  const cap = C.getMoveCapability(594);
  assert.equal(cap.supportLevel, 'FULL');
  assert.equal(cap.priority, 1);
  assert.deepEqual(cap.requiredMechanics, ['SPECIAL_DAMAGE', 'POSITIVE_PRIORITY', 'MULTI_HIT']);
  assert.equal(C.validateMoveData(m(594)), true);
  const def = m(594);
  assert.equal(def.id, 594);
  assert.equal(def.name, 'water-shuriken');
  assert.equal(def.type, 'water');
  assert.equal(def.damageClass, 'special');
  assert.equal(def.power, 15);
  assert.equal(def.accuracy, 100);
  assert.equal(def.pp, 20);
});

test('P5: Water Shuriken uses Special Attack and Special Defense; physical stages have no effect', () => {
  const baseHits = hits(run(594, { hitCountRoll: 100 }));
  const boostSpAtk = hits(run(594, { hitCountRoll: 100 }, s => { s.player.statStages.specialAttack = 2; }));
  const boostSpDef = hits(run(594, { hitCountRoll: 100 }, s => { s.enemy.statStages.specialDefense = 2; }));
  const physStages = hits(run(594, { hitCountRoll: 100 }, s => {
    s.player.statStages.attack = 2;
    s.enemy.statStages.defense = 2;
  }));

  assert.ok(boostSpAtk[0].damage > baseHits[0].damage, 'SpAtk +2 must increase special damage');
  assert.ok(boostSpDef[0].damage < baseHits[0].damage, 'SpDef +2 must decrease special damage taken');
  assert.equal(physStages[0].damage, baseHits[0].damage, 'Physical Attack/Defense stages must NOT affect Water Shuriken');
});

test('P5: Water Shuriken special damage is not reduced by burn', () => {
  const healthyHits = hits(run(594, { hitCountRoll: 100 }));
  const burnedHits = hits(run(594, { hitCountRoll: 100 }, s => { s.player.statusCondition = 'burn'; }));
  assert.equal(burnedHits.length, 5);
  for (let i = 0; i < 5; i++) {
    assert.equal(burnedHits[i].damage, healthyHits[i].damage, 'Burn must not reduce special damage');
  }
});

test('P5: Water Shuriken priority +1 moves before priority 0, and equal priority ties break by speed', () => {
  // 1. Slower Water Shuriken user (Speed 30) moves before faster Tackle user (Speed 150)
  const pSlow = mon(1, [m(594)]); pSlow.speed = 30;
  const eFast = mon(2, [m(33)]); eFast.speed = 150;
  const state1 = E.createBattle(pSlow, eFast);
  const r1 = E.resolveTurn(state1, { player: a(594), enemy: a(33) });
  const playerActionIdx1 = r1.events.findIndex(e => e.type === 'MOVE_USED' && e.actor === 'player');
  const enemyActionIdx1 = r1.events.findIndex(e => e.type === 'MOVE_USED' && e.actor === 'enemy');
  assert.ok(playerActionIdx1 < enemyActionIdx1, 'Priority +1 move must act before priority 0 move');

  // 2. Both priority +1: Water Shuriken (594) vs Quick Attack (98): Faster moves first
  const pFastPri = mon(1, [m(594)]); pFastPri.speed = 150;
  const eSlowPri = mon(2, [m(98)]); eSlowPri.speed = 30;
  const state2 = E.createBattle(pFastPri, eSlowPri);
  const r2 = E.resolveTurn(state2, { player: a(594), enemy: a(98) });
  assert.ok(r2.events.findIndex(e => e.actor === 'player') < r2.events.findIndex(e => e.actor === 'enemy'), 'Faster priority +1 acts first');

  const pSlowPri = mon(1, [m(594)]); pSlowPri.speed = 30;
  const eFastPri = mon(2, [m(98)]); eFastPri.speed = 150;
  const state3 = E.createBattle(pSlowPri, eFastPri);
  const r3 = E.resolveTurn(state3, { player: a(594), enemy: a(98) });
  assert.ok(r3.events.findIndex(e => e.actor === 'enemy') < r3.events.findIndex(e => e.actor === 'player'), 'Faster opponent priority +1 acts first');

  // 3. Exact speed tie between player and enemy: player moves first
  const pTie = mon(1, [m(594)]); pTie.speed = 100;
  const eTie = mon(2, [m(98)]); eTie.speed = 100;
  const stateTie = E.createBattle(pTie, eTie);
  const rTie = E.resolveTurn(stateTie, { player: a(594), enemy: a(98) });
  assert.ok(rTie.events.findIndex(e => e.actor === 'player') < rTie.events.findIndex(e => e.actor === 'enemy'), 'Player wins speed tie deterministically');
});

for (const [roll, count] of [[1, 2], [35, 2], [36, 3], [70, 3], [71, 4], [85, 4], [86, 5], [100, 5]]) {
  test(`P5: Water Shuriken modern hit distribution boundary ${roll} gives ${count}`, () => {
    const r = run(594, { hitCountRoll: roll });
    assert.equal(hits(r).length, count);
    assert.equal(complete(r).hitCount, count);
  });
}

test('P5: Water Shuriken accuracy miss and KO interruption in team battle', () => {
  // 1. Miss consumes 1 PP and produces 0 hits
  const rMiss = run(594, { accuracyRoll: 76 }, s => { s.player.accuracyStage = -1; });
  assert.equal(hits(rMiss).length, 0);
  assert.equal(complete(rMiss), undefined);
  assert.equal(rMiss.state.player.moves[0].currentPp, 19);

  // 2. KO interruption does not spill into reserves
  const teamState = E.createTeamBattle([mon(1, [m(594)]), mon(3), mon(5)], [mon(2), mon(4), mon(6)]);
  teamState.enemy.team[0].currentHp = 1;
  const rKo = E.resolveTurn(teamState, { player: a(594, { hitCountRoll: 100 }), enemy: a(14) });
  assert.equal(hits(rKo).length, 1);
  assert.equal(complete(rKo).hitCount, 1);
  assert.equal(complete(rKo).plannedHits, 5);
  assert.equal(rKo.state.enemy.team[1].currentHp, 2000, 'Reserve must be untouched');
  assert.equal(rKo.events.filter(e => e.type === 'POKEMON_FAINTED').length, 1);
  assert.equal(rKo.events.filter(e => e.type === 'REPLACEMENT_REQUIRED').length, 1);
});

test('P5: Water Shuriken real session integration (player, enemy switch, Sleep Talk)', async () => {
  // 1. Player session with Water Shuriken
  const p = [mon(1, [m(594)]), mon(3), mon(5)];
  const e = [mon(2, [m(14)]), mon(4), mon(6)];
  const events = [];
  const rng = new DeterministicRandomSource({
    accuracySequence: [1],
    damageSequence: [100, 85, 90, 95, 87],
    hitCountSequence: [100]
  });
  const session = new BattleSessionController({
    teamStore: { load: () => [1, 3, 5] },
    hydrator: { hydrateTeam: async ids => ids.map(id => p.find(x => x.id === id)) },
    opponentFactory: { createOpponentTeam: async () => e },
    ai: { chooseAction: () => ({ action: a(14) }) },
    randomSource: rng,
    presentationEngine: { play: async batch => events.push(...batch), playCommands: async () => {} }
  });
  await session.prepareBattle({ playerTeamIds: [1, 3, 5] });
  await session.startBattle();
  await session.submitPlayerMove(594);
  assert.equal(events.filter(ev => ev.type === 'DAMAGE_APPLIED' && ev.source === 'player').length, 5);
  assert.equal(session.battleState.player.team[0].moves[0].currentPp, 19);

  // 2. Enemy uses Water Shuriken during player switch
  const pSwitch = [mon(1), mon(3), mon(5)];
  const eShuriken = [mon(2, [m(594)]), mon(4), mon(6)];
  const switchEvents = [];
  const switchSession = new BattleSessionController({
    teamStore: { load: () => [1, 3, 5] },
    hydrator: { hydrateTeam: async ids => ids.map(id => pSwitch.find(x => x.id === id)) },
    opponentFactory: { createOpponentTeam: async () => eShuriken },
    ai: { chooseAction: () => ({ action: a(594) }) },
    randomSource: new DeterministicRandomSource({
      accuracySequence: [1],
      hitCountSequence: [100],
      damageSequence: [100, 85, 90, 95, 87]
    }),
    presentationEngine: { play: async batch => switchEvents.push(...batch), playCommands: async () => {} }
  });
  await switchSession.prepareBattle({ playerTeamIds: [1, 3, 5] });
  await switchSession.startBattle();
  await switchSession.submitPlayerSwitch(3);
  const switchHits = switchEvents.filter(ev => ev.type === 'DAMAGE_APPLIED' && ev.source === 'enemy');
  assert.equal(switchHits.length, 5);
  assert.equal(switchSession.battleState.player.team[1].currentHp < 2000, true, 'Incoming mon must take damage');
  assert.equal(switchSession.battleState.player.team[0].currentHp, 2000, 'Switched-out mon takes no damage');

  // 3. Water Shuriken called by Sleep Talk
  const pSleep = [mon(1, [m(214), m(594)]), mon(3), mon(5)];
  pSleep[0].statusCondition = 'sleep';
  pSleep[0].sleepTurns = 2;
  const eDummy = [mon(2, [m(14)]), mon(4), mon(6)];
  const sleepEvents = [];
  const sleepSession = new BattleSessionController({
    teamStore: { load: () => [1, 3, 5] },
    hydrator: { hydrateTeam: async ids => ids.map(id => pSleep.find(x => x.id === id)) },
    opponentFactory: { createOpponentTeam: async () => eDummy },
    ai: { chooseAction: () => ({ action: a(14) }) },
    randomSource: new DeterministicRandomSource({
      accuracySequence: [1],
      calledMoveSequence: [0],
      hitCountSequence: [100],
      damageSequence: [100, 85, 90, 95, 87]
    }),
    presentationEngine: { play: async batch => sleepEvents.push(...batch), playCommands: async () => {} }
  });
  await sleepSession.prepareBattle({ playerTeamIds: [1, 3, 5] });
  await sleepSession.startBattle();
  await sleepSession.submitPlayerMove(214);
  assert.equal(sleepEvents.filter(ev => ev.type === 'DAMAGE_APPLIED' && ev.source === 'player').length, 5);
  assert.equal(sleepSession.battleState.player.team[0].moves[0].currentPp, 9, 'Sleep Talk PP consumed');
  assert.equal(sleepSession.battleState.player.team[0].moves[1].currentPp, 20, 'Water Shuriken PP not consumed when called');
});

test('P5: Water Shuriken AI evaluation and presentation mapping', async () => {
  const state = E.createBattle(mon(1, [m(594), m(33)]), mon(2));
  const v = V.evaluateMove(state.player, state.enemy, state.player.moves[0]);
  assert.equal(v.priority, 1);
  assert.equal(v.moveName, 'water-shuriken');
  assert.equal(v.damageClass, 'special');
  assert.ok(v.minDamage > 0);
  assert.ok(v.maxDamage > v.minDamage * 2);

  // Presentation mapping
  const r = run(594, { hitCountRoll: 86 });
  const commands = Mapper.mapEvents(r.events);
  assert.equal(commands.filter(c => c.type === 'HP_TRANSITION' && c.target === 'enemy').length, 5);
  const cmd = commands.find(c => c.type === 'MULTI_HIT_FEEDBACK');
  assert.equal(cmd.hitCount, 5);
  let message;
  const adapter = new BattleUiDomAdapter({ view: { displayMessage: text => { message = text; } } });
  await adapter.execute(cmd);
  assert.equal(message, 'Atingiu 5 vezes!');
});
