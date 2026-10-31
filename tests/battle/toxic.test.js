const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine.js');
const C = require('../../assets/js/battle/battle-constants.js');
const AI = require('../../assets/js/battle/battle-ai.js');
const Evaluator = require('../../assets/js/battle/battle-evaluator.js');
const Mapper = require('../../assets/js/presentation/battle-presentation-mapper.js');
const { BattleUiDomAdapter } = require('../../assets/js/ui/battle-ui-adapter.js');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source.js');
const toxic = C.SUPPORTED_STATUS_MOVES.toxic;
const boost = C.SUPPORTED_STATUS_MOVES['swords-dance'];
const tail = C.KNOWN_CATALOG_MOVES[525];
function mon(id, types = ['normal'], moves = [toxic, boost], hp = 320) {
  return { id, name: `mon-${id}`, types, hp, attack: 40, defense: 200, specialAttack: 40, specialDefense: 200, speed: id === 1 ? 120 : 40, moves };
}
const move = (moveId, accuracyRoll = 1) => ({ type: 'MOVE', moveId, accuracyRoll, damageRoll: 100 });
const tick = result => result.events.find(event => event.type === 'STATUS_DAMAGE' && event.target === 'enemy');

test('Toxic: canonical data, validation, campaign option and support', () => {
  assert.deepEqual({ ...toxic }, { id: 92, name: 'toxic', type: 'poison', power: 0, accuracy: 90, pp: 10, damageClass: 'status', statusEffect: 'toxic' });
  assert.equal(C.getMoveCapability(92).supportLevel, 'FULL');
  assert.equal(C.validateMoveData(toxic), true);
  const pool = require('../../assets/js/campaign/campaign-move-options.js').getPool(89);
  assert.ok(pool.some(m => m.id === 92)); assert.ok(pool.length <= 6);
});

test('Toxic: non-Poison accuracy 90/91; Poison user bypasses accuracy without bypassing immunity', () => {
  for (const [type, roll, applied] of [['normal',90,true], ['normal',91,false], ['poison',100,true]]) {
    const state = E.createBattle(mon(1,[type]),mon(2));
    const result = E.resolveTurn(state,{player:move(92,roll),enemy:move(14)});
    assert.equal(result.state.enemy.statusCondition, applied ? 'toxic' : null);
    assert.equal(result.state.player.moves[0].currentPp,9);
  }
  for (const type of ['poison','steel']) {
    const result = E.resolveTurn(E.createBattle(mon(1,['poison']),mon(2,[type])),{player:move(92,100),enemy:move(14)});
    assert.equal(result.state.enemy.statusCondition,null);
    assert.ok(result.events.some(e=>e.type==='STATUS_BLOCKED'&&e.reason==='IMMUNE'));
  }
});

test('Toxic: Grass is susceptible; existing primary statuses never overwritten or escalated', () => {
  const grass = E.resolveTurn(E.createBattle(mon(1),mon(2,['grass'])),{player:move(92),enemy:move(14)});
  assert.equal(grass.state.enemy.statusCondition,'toxic');
  for (const status of ['poison','burn','paralysis','sleep','freeze','toxic']) {
    const state=E.createBattle(mon(1),mon(2)); state.enemy.statusCondition=status;
    state.enemy.sleepTurns=2; state.enemy.toxicStage=status==='toxic'?3:0;
    const result=E.resolveTurn(state,{player:move(92),enemy:{...move(14),statusRoll:100,thawRoll:100}});
    assert.equal(result.state.enemy.statusCondition,status);
    assert.ok(result.events.some(e=>e.type==='STATUS_BLOCKED'&&e.reason==='ALREADY_STATUS'));
    assert.equal(result.state.enemy.toxicStage,status==='toxic'?4:0);
  }
});

test('Toxic: residual grows by 1/16 units each turn and first tick follows application', () => {
  let state=E.createBattle(mon(1),mon(2));
  for (let stage=1;stage<=3;stage++) {
    const result=E.resolveTurn(state,{player:move(stage===1?92:14),enemy:move(14)});
    assert.equal(tick(result).damage,20*stage);
    assert.equal(result.state.enemy.toxicStage,stage);
    assert.equal(state.enemy.toxicStage,stage-1);
    state=result.state;
  }
  assert.equal(state.enemy.currentHp,200);
});

test('Toxic: floor before multiplication, stage cap and damage capped by remaining HP', () => {
  for (const [hp,stage,expected] of [[161,1,20],[5000,14,4680],[5000,15,4680],[10,0,1]]) {
    const state=E.createBattle(mon(1),mon(2,['normal'],[boost],hp));
    state.enemy.statusCondition='toxic';state.enemy.toxicStage=stage;
    const result=E.resolveTurn(state,{player:move(14),enemy:move(14)});
    assert.equal(tick(result).damage,expected);assert.ok(result.state.enemy.toxicStage<=15);
  }
  const state=E.createBattle(mon(1),mon(2));state.enemy.statusCondition='toxic';state.enemy.currentHp=3;
  const result=E.resolveTurn(state,{player:move(14),enemy:move(14)});
  assert.equal(tick(result).damage,3);assert.equal(result.state.enemy.currentHp,0);
  assert.equal(result.state.status,'PLAYER_WIN');
});

test('Toxic: new combatants never inherit residual progression and stale counters clear after cure', () => {
  const raw={...mon(1),statusCondition:'toxic',toxicStage:12};
  assert.equal(E.createCombatant(raw).toxicStage,0);
  assert.equal(E.createCombatant({...raw,statusCondition:null}).toxicStage,0);
  const state=E.createBattle(mon(1),mon(2));state.enemy.toxicStage=9;
  const result=E.resolveTurn(state,{player:move(14),enemy:move(14)});
  assert.equal(result.state.enemy.toxicStage,0);assert.equal(result.state.enemy.currentHp,320);
});

test('Toxic: voluntary switch preserves poison, resets progression and no residual on bench', () => {
  const state=E.createTeamBattle([mon(1),mon(3),mon(5)],[mon(2),mon(4),mon(6)]);
  state.enemy.team[0].statusCondition='toxic';state.enemy.team[0].toxicStage=4;
  const out=E.resolveTurn(state,{player:move(14),enemy:{type:'SWITCH',targetPokemonId:4}});
  assert.equal(out.state.enemy.team[0].statusCondition,'toxic');assert.equal(out.state.enemy.team[0].toxicStage,0);
  assert.equal(out.state.enemy.team[0].currentHp,320);
  const back=E.resolveTurn(out.state,{player:move(14),enemy:{type:'SWITCH',targetPokemonId:2}});
  assert.equal(tick(back).damage,20);assert.equal(back.state.enemy.team[0].toxicStage,1);
});

test('Toxic: forced switch resets progression without curing the condition', () => {
  const state=E.createTeamBattle([mon(1,['normal'],[tail,boost]),mon(3),mon(5)],[mon(2),mon(4),mon(6)]);
  state.enemy.team[0].statusCondition='toxic';state.enemy.team[0].toxicStage=4;
  const result=E.resolveTurn(state,{player:move(525),enemy:move(14)});
  assert.equal(result.state.enemy.activeIndex,1);assert.equal(result.state.enemy.team[0].toxicStage,0);
  assert.equal(result.state.enemy.team[0].statusCondition,'toxic');assert.equal(tick(result),undefined);
});

test('Toxic: residual KO requests replacement in a team instead of ending the battle', () => {
  const state=E.createTeamBattle([mon(1),mon(3),mon(5)],[mon(2),mon(4),mon(6)]);
  state.enemy.team[0].statusCondition='toxic';state.enemy.team[0].currentHp=1;
  const result=E.resolveTurn(state,{player:move(14),enemy:move(14)});
  assert.equal(result.state.status,'AWAITING_REPLACEMENT');
  assert.ok(result.events.some(e=>e.type==='REPLACEMENT_REQUIRED'&&e.side==='enemy'));
  const replaced=E.resolveReplacement(result.state,{enemy:{targetPokemonId:4}});
  assert.equal(replaced.state.status,'IN_PROGRESS');assert.equal(replaced.state.enemy.team[1].toxicStage,0);
});

test('Toxic: normal poison remains fixed at 1/8 rather than escalating', () => {
  let state=E.createBattle(mon(1),mon(2));state.enemy.statusCondition='poison';
  for(let i=0;i<3;i++){const result=E.resolveTurn(state,{player:move(14),enemy:move(14)});assert.equal(tick(result).damage,40);state=result.state;}
});

test('Toxic: presentation maps application and increasing damage without losing condition badge', () => {
  const result=E.resolveTurn(E.createBattle(mon(1),mon(2)),{player:move(92),enemy:move(14)});
  const commands=Mapper.mapEvents(result.events),messages=[],badges=[];
  const adapter=new BattleUiDomAdapter({view:{displayMessage:text=>messages.push(text),updateStatusBadge:(side,status)=>badges.push([side,status])}});
  for(const command of commands.filter(c=>c.type==='STATUS_FEEDBACK'))adapter.execute(command);
  assert.ok(messages.some(m=>m.includes('gravemente envenenado')));
  assert.ok(messages.some(m=>m.includes('20 HP por veneno grave')));
  assert.deepEqual(badges,[['enemy','toxic']]);
  assert.ok(commands.some(c=>c.type==='HP_TRANSITION'&&c.cause==='toxic'));
});

test('Toxic: evaluator and SMART AI favor eligible targets and respect immunity / existing status', () => {
  const state=E.createBattle(mon(1,['poison']),mon(2));
  const evaluate=target=>Evaluator.evaluateMove(state.player,target,toxic);
  assert.ok(evaluate(state.enemy).expectedStatusBenefit>0);
  assert.equal(evaluate({...state.enemy,types:['steel']}).expectedStatusBenefit,0);
  assert.equal(evaluate({...state.enemy,statusCondition:'poison'}).expectedStatusBenefit,0);
  assert.equal(evaluate(state.enemy).statusChance,1);
  assert.equal(AI.chooseAction(state,'player',{strategy:'SMART'}).action.moveId,92);
});

for(const role of ['player','enemy'])test(`Toxic: real session application and two progressive ticks from ${role}`,async()=>{
  const playerTeam=[mon(1),mon(3),mon(5)],enemyTeam=[mon(2),mon(4),mon(6)],events=[];
  const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async ids=>ids.map(id=>playerTeam.find(p=>p.id===id))},opponentFactory:{createOpponentTeam:async()=>enemyTeam},randomSource:new DeterministicRandomSource({accuracySequence:[1,1,1,1]}),ai:{chooseAction:state=>({action:move(role==='enemy'&&state.turn===1?92:14)})},presentationEngine:{play:async batch=>events.push(...batch),playCommands:async()=>{}}});
  await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();
  await session.submitPlayerMove(role==='player'?92:14);await session.submitPlayerMove(14);
  const target=role==='player'?'enemy':'player';
  assert.deepEqual(events.filter(e=>e.type==='STATUS_DAMAGE'&&e.target===target).map(e=>e.damage),[20,40]);
  assert.equal(session.battleState[target].team[0].toxicStage,2);
  assert.equal(events.filter(e=>e.type==='STATUS_APPLIED'&&e.target===target).length,1);
});

test('Toxic: real session during player switch affects only the incoming combatant',async()=>{
  const players=[mon(1),mon(3),mon(5)],opponents=[mon(2,['poison']),mon(4),mon(6)],events=[];
  const session=new BattleSessionController({teamStore:{load:()=>[1,3,5]},hydrator:{hydrateTeam:async ids=>ids.map(id=>players.find(p=>p.id===id))},opponentFactory:{createOpponentTeam:async()=>opponents},randomSource:new DeterministicRandomSource({accuracySequence:[100]}),ai:{chooseAction:()=>({action:move(92)})},presentationEngine:{play:async batch=>events.push(...batch),playCommands:async()=>{}}});
  await session.prepareBattle({playerTeamIds:[1,3,5]});await session.startBattle();await session.submitPlayerSwitch(3);
  assert.equal(session.battleState.player.team[0].statusCondition,null);
  assert.equal(session.battleState.player.team[1].statusCondition,'toxic');
  assert.equal(session.battleState.player.team[1].toxicStage,1);
  assert.equal(events.find(e=>e.type==='STATUS_APPLIED').pokemonName,'mon-3');
});

test('Toxic: simultaneous residual faint ends the battle once without stale replacement requests',()=>{
  const state=E.createTeamBattle([mon(1),mon(3),mon(5)],[mon(2),mon(4),mon(6)]);
  for(const role of ['player','enemy']){
    state[role].team[0].statusCondition='toxic';state[role].team[0].currentHp=1;
    state[role].team[1].currentHp=0;state[role].team[2].currentHp=0;
  }
  const result=E.resolveTurn(state,{player:move(14),enemy:move(14)});
  assert.equal(result.state.status,'ENEMY_WIN');
  assert.equal(result.events.filter(e=>e.type==='BATTLE_ENDED').length,1);
  assert.equal(result.events.filter(e=>e.type==='REPLACEMENT_REQUIRED').length,0);
  assert.equal(result.events.filter(e=>e.type==='STATUS_DAMAGE').length,2);
});
