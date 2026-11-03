const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const V = require('../../assets/js/battle/battle-evaluator');
const Reg = require('../../assets/js/battle/ability-registry');
const UI = require('../../assets/js/ui/battle-ui-adapter');
const P7 = require('../../assets/js/battle/p7-mechanics');

const move = id => {
  if (typeof id === 'object') return id;
  return C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);
};

const mon = (id, ids = [33, 156], extra = {}) => ({
  id,
  name: 'test-mon-' + id,
  types: ['normal'],
  hp: 2000,
  maxHp: 2000,
  currentHp: 2000,
  attack: 100,
  defense: 100,
  specialAttack: 100,
  specialDefense: 100,
  speed: 100,
  statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0 },
  moves: ids.map(move),
  ...extra
});

const act = (id, extra = {}) => ({
  type: 'MOVE',
  moveId: typeof id === 'object' ? id.id : id,
  accuracyRoll: 1,
  damageRoll: 100,
  criticalRoll: 24,
  secondaryEffectRoll: 100,
  ...extra
});

/* ==========================================================================
   H5-A.1: Prankster
   ========================================================================== */

test('Prankster: concede prioridade +1 para movimentos de status e age antes de oponente mais rápido', () => {
  // Player slower (speed 50) with Prankster using Thunder Wave (86, Status). Enemy faster (speed 200) using Tackle (33, Physical).
  const s = E.createBattle(
    mon(1, [86, 33], { speed: 50, ability: 'prankster' }),
    mon(2, [33, 156], { speed: 200 })
  );

  const res = E.resolveTurn(s, {
    player: act(86),
    enemy: act(33)
  });

  const moveOrder = res.events.filter(e => e.type === 'MOVE_USED').map(e => e.actor);
  assert.deepEqual(moveOrder, ['player', 'enemy'], 'Prankster deve agir primeiro com golpe de status');
  assert.equal(res.state.enemy.statusCondition, 'paralysis', 'Inimigo deve ser paralisado');
});

test('Prankster: NÃO concede prioridade para movimentos físicos ou especiais, mesmo com efeitos secundários', () => {
  // Player slower (speed 50) with Prankster using Body Slam (34, Physical). Enemy faster (200) using Tackle (33).
  const s = E.createBattle(
    mon(1, [34, 33], { speed: 50, ability: 'prankster' }),
    mon(2, [33, 156], { speed: 200 })
  );

  const res = E.resolveTurn(s, {
    player: act(34),
    enemy: act(33)
  });

  const moveOrder = res.events.filter(e => e.type === 'MOVE_USED').map(e => e.actor);
  assert.deepEqual(moveOrder, ['enemy', 'player'], 'Ataque físico não recebe prioridade do Prankster');
});

test('Prankster: preserva prioridade negativa modificada (+1 em golpe de base -6 resulta em -5)', () => {
  const roarMove = { id: 46, name: 'roar', type: 'normal', power: null, pp: 20, accuracy: null, priority: -6, damageClass: 'status', target: 'normal' };
  const user = mon(1, [roarMove], { ability: 'prankster' });
  const p = P7.priority(user, roarMove, C);
  assert.equal(p, -5, 'Base -6 com Prankster deve resultar em -5');
});

test('Prankster: golpe de status com prioridade +1 age antes de golpe de prioridade 0 mesmo com velocidade muito menor', () => {
  const s = E.createBattle(
    mon(1, [92, 33], { speed: 1, ability: 'prankster' }), // Toxic
    mon(2, [33, 156], { speed: 500 }) // Tackle
  );

  const res = E.resolveTurn(s, {
    player: act(92),
    enemy: act(33)
  });

  const moveOrder = res.events.filter(e => e.type === 'MOVE_USED').map(e => e.actor);
  assert.deepEqual(moveOrder, ['player', 'enemy'], 'Prioridade +1 do Prankster supera prioridade 0');
  assert.equal(res.state.enemy.statusCondition, 'toxic');
});

test('Prankster: oponentes do tipo Dark são imunes a golpes de status direcionados (IMMUNE_PRANKSTER)', () => {
  const s = E.createBattle(
    mon(1, [92, 33], { speed: 50, ability: 'prankster' }), // Toxic (92)
    mon(2, [33, 156], { speed: 100, types: ['dark'] })
  );

  const res = E.resolveTurn(s, {
    player: act(92),
    enemy: act(33)
  });

  const failEvent = res.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'IMMUNE_PRANKSTER');
  assert.ok(failEvent, 'Deve emitir MOVE_FAILED com reason IMMUNE_PRANKSTER');
  assert.equal(res.state.enemy.statusCondition, null, 'Oponente Dark não deve ser envenenado');
});

test('Prankster: movimentos de status voltados a si mesmo funcionam normalmente mesmo para Dark types', () => {
  // Swords Dance (14) used by Dark type with Prankster
  const s = E.createBattle(
    mon(1, [14, 156], { types: ['dark'], ability: 'prankster', currentHp: 1000 }),
    mon(2, [33, 156], { speed: 50 })
  );

  const res = E.resolveTurn(s, {
    player: act(14),
    enemy: act(33)
  });

  assert.equal(res.state.player.statStages.attack, 2, 'Swords Dance deve aumentar ataque em +2');
});

test('Prankster: hazards de entrada (Stealth Rock, Spikes) afetam o lado do campo e não falham contra Dark types', () => {
  const s = E.createBattle(
    mon(1, [446, 33], { ability: 'prankster' }), // Stealth Rock (446, target: 'foeSide')
    mon(2, [33, 156], { types: ['dark'] })
  );

  const res = E.resolveTurn(s, {
    player: act(446),
    enemy: act(33)
  });

  const hazardEvent = res.events.find(e => e.type === 'MOVE_PREPARED' && e.reason === 'HAZARD_STARTED');
  assert.ok(hazardEvent, 'Stealth Rock com Prankster deve ser posicionado com sucesso no campo oposto');
  assert.equal(res.state.p6Sides.enemy.stealthRock, 1);
});

test('Prankster: bloqueado em Psychic Terrain contra alvo aterrado', () => {
  const s = E.createBattle(
    mon(1, [86, 33], { ability: 'prankster' }), // Thunder Wave
    mon(2, [33, 156], { types: ['normal'] })
  );
  s.terrain = { id: 'psychic', turns: 5 };

  const res = E.resolveTurn(s, {
    player: act(86),
    enemy: act(33)
  });

  const failEvent = res.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'PSYCHIC_TERRAIN_PROTECTED');
  assert.ok(failEvent, 'Psychic Terrain deve bloquear golpe com prioridade do Prankster');
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Prankster: Mold Breaker no atacante NÃO anula o Prankster (breakable: false)', () => {
  assert.equal(Reg.isBreakable('prankster'), false, 'Prankster não pode ser quebrado por Mold Breaker');
});

test('Prankster: supressão de habilidade (abilitySuppressed) anula prioridade e permite afetar Dark type em prioridade 0', () => {
  const s = E.createBattle(
    mon(1, [92, 33], { speed: 200, ability: 'prankster' }),
    mon(2, [33, 156], { speed: 100, types: ['dark'] })
  );
  s.player.abilitySuppressed = true;

  const res = E.resolveTurn(s, {
    player: act(92), // Toxic at priority 0
    enemy: act(33)
  });

  const failEvent = res.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'IMMUNE_PRANKSTER');
  assert.equal(failEvent, undefined, 'Sem Prankster ativo, não há falha por IMMUNE_PRANKSTER');
  assert.equal(res.state.enemy.statusCondition, 'toxic', 'Alvo Dark deve receber toxic em prioridade 0 normal');
});

/* ==========================================================================
   H5-A.2: Infiltrator
   ========================================================================== */

test('Infiltrator: ignora barreiras (Reflect, Light Screen, Aurora Veil), mantendo as telas ativas no campo', () => {
  const s = E.createBattle(
    mon(1, [33], { speed: 200, ability: 'infiltrator', attack: 100 }), // Tackle
    mon(2, [33], { speed: 50, defense: 100 })
  );
  C.P6.init(s);
  s.p6Sides.enemy.reflect = 5;

  // With Infiltrator, barrierMultiplier should return 1.0 (ignores 0.5x reflect penalty)
  const mult = C.P6.barrierMultiplier(s, 'enemy', move(33), false, s.player);
  assert.equal(mult, 1.0, 'Infiltrator deve ignorar a barreira Reflect');
  assert.equal(s.p6Sides.enemy.reflect, 5, 'Reflect deve continuar no campo com suas 5 rodadas');

  // Non-infiltrator gets 0.5
  const nonInfMon = mon(3, [33]);
  const multNormal = C.P6.barrierMultiplier(s, 'enemy', move(33), false, nonInfMon);
  assert.equal(multNormal, 0.5, 'Atacante comum deve sofrer redução de 0.5 por Reflect');
});

test('Infiltrator: ultrapassa Substitute causando dano direto ao HP do Pokémon sem tocar no Substitute HP', () => {
  const s = E.createBattle(
    mon(1, [33], { speed: 200, ability: 'infiltrator' }), // Tackle
    mon(2, [33], { speed: 50, currentHp: 2000, substituteHp: 500, substitute: true })
  );

  const res = E.resolveTurn(s, {
    player: act(33),
    enemy: act(33)
  });

  assert.equal(res.state.enemy.substituteHp, 500, 'Substitute HP não deve sofrer alteração');
  assert.ok(res.state.enemy.currentHp < 2000, 'HP real do Pokémon deve ser reduzido');
});

test('Infiltrator: golpes de status ultrapassam Substitute e aplicam condição', () => {
  const s = E.createBattle(
    mon(1, [92], { speed: 200, ability: 'infiltrator' }), // Toxic
    mon(2, [156], { speed: 50, substituteHp: 500, substitute: true })
  );

  const res = E.resolveTurn(s, {
    player: act(92),
    enemy: act(156)
  });

  assert.equal(res.state.enemy.statusCondition, 'toxic', 'Infiltrator deve aplicar Toxic através do Substitute');
});

test('Não-Infiltrator: golpe de status é bloqueado por Substitute (BLOCKED_BY_SUBSTITUTE)', () => {
  const s = E.createBattle(
    mon(1, [92], { speed: 200 }), // Toxic
    mon(2, [156], { speed: 50, substituteHp: 500, substitute: true })
  );

  const res = E.resolveTurn(s, {
    player: act(92),
    enemy: act(156)
  });

  const blockEvent = res.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_SUBSTITUTE');
  assert.ok(blockEvent, 'Deve emitir MOVE_FAILED com BLOCKED_BY_SUBSTITUTE');
  assert.equal(res.state.enemy.statusCondition, null, 'Condição não deve ser aplicada');
});

test('Não-Infiltrator: dano físico reduz Substitute HP e preserva HP do Pokémon', () => {
  const s = E.createBattle(
    mon(1, [33], { speed: 200 }), // Tackle
    mon(2, [156], { speed: 50, currentHp: 2000, substituteHp: 500, substitute: true })
  );

  const res = E.resolveTurn(s, {
    player: act(33),
    enemy: act(156)
  });

  assert.equal(res.state.enemy.currentHp, 2000, 'HP real do defensor não deve ser tocado');
  assert.ok(res.state.enemy.substituteHp < 500, 'Substitute HP deve absorver o dano');
});

test('Infiltrator: ignora Safeguard e aplica status', () => {
  const s = E.createBattle(
    mon(1, [92], { speed: 200, ability: 'infiltrator' }), // Toxic
    mon(2, [156], { speed: 50 })
  );
  C.P6.init(s);
  s.p6Sides.enemy.safeguard = 5;

  const res = E.resolveTurn(s, {
    player: act(92),
    enemy: act(156)
  });

  assert.equal(res.state.enemy.statusCondition, 'toxic', 'Infiltrator deve aplicar status através do Safeguard');
  assert.equal(res.state.p6Sides.enemy.safeguard, 4, 'Safeguard permanece ativo no campo (decrementou 1 turno normal)');
});

test('Infiltrator: ignora Mist em quedas de estágio de estatística (Venom Drench)', () => {
  const s = E.createBattle(
    mon(1, [599], { speed: 200, ability: 'infiltrator' }), // Venom Drench (599)
    mon(2, [156], { speed: 50, statusCondition: 'poison' })
  );
  C.P6.init(s);
  s.p6Sides.enemy.mist = 5;

  const res = E.resolveTurn(s, {
    player: act(599),
    enemy: act(156)
  });

  assert.equal(res.state.enemy.statStages.attack, -1, 'Ataque reduzido através do Mist');
  assert.equal(res.state.enemy.statStages.specialAttack, -1, 'Ataque Especial reduzido através do Mist');
  assert.equal(res.state.enemy.statStages.speed, -1, 'Velocidade reduzida através do Mist');
});

test('Infiltrator: respeita imunidades de tipo naturais (Poison type imune a Toxic)', () => {
  const s = E.createBattle(
    mon(1, [92], { speed: 200, ability: 'infiltrator' }), // Toxic
    mon(2, [156], { speed: 50, types: ['poison'] })
  );

  const res = E.resolveTurn(s, {
    player: act(92),
    enemy: act(156)
  });

  assert.equal(res.state.enemy.statusCondition, null, 'Infiltrator não deve ultrapassar imunidade natural de tipo');
});

test('Infiltrator: supressão de habilidade (abilitySuppressed) reativa proteção de Safeguard e Substitute', () => {
  const s = E.createBattle(
    mon(1, [92], { speed: 200, ability: 'infiltrator' }),
    mon(2, [156], { speed: 50, substituteHp: 500, substitute: true })
  );
  s.player.abilitySuppressed = true;

  const res = E.resolveTurn(s, {
    player: act(92),
    enemy: act(156)
  });

  const blockEvent = res.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_SUBSTITUTE');
  assert.ok(blockEvent, 'Com Infiltrator suprimido, Substitute deve bloquear o golpe');
});

/* ==========================================================================
   H5-A.3: Magic Bounce
   ========================================================================== */

test('Magic Bounce: reflete golpes de status direcionados (Toxic, Will-O-Wisp, Thunder Wave) de volta ao atacante', () => {
  const s = E.createBattle(
    mon(1, [92, 33], { speed: 200 }), // Toxic
    mon(2, [33, 156], { speed: 50, ability: 'magic-bounce' })
  );

  const res = E.resolveTurn(s, {
    player: act(92),
    enemy: act(156)
  });

  const bounceNotice = res.events.find(e => e.type === 'MOVE_PREPARED' && e.reason === 'P7_ABILITY' && e.label === 'magic-bounce');
  assert.ok(bounceNotice, 'Deve emitir evento de ativação de Magic Bounce');
  assert.equal(res.state.player.statusCondition, 'toxic', 'Atacante deve receber o efeito de Toxic refletido');
  assert.equal(res.state.enemy.statusCondition, null, 'Portador de Magic Bounce não deve ser envenenado');
});

test('Magic Bounce: reflete hazards de entrada (Stealth Rock, Spikes) para o lado do atacante', () => {
  const s = E.createBattle(
    mon(1, [446, 33], { speed: 200 }), // Stealth Rock (446)
    mon(2, [33, 156], { speed: 50, ability: 'magic-bounce' })
  );

  const res = E.resolveTurn(s, {
    player: act(446),
    enemy: act(156)
  });

  assert.equal(res.state.p6Sides.player.stealthRock, 1, 'Stealth Rock deve ser colocado no lado do jogador atacante');
  assert.equal(res.state.p6Sides.enemy.stealthRock || 0, 0, 'Lado do portador de Magic Bounce não deve receber Stealth Rock');
});

test('Magic Bounce: NÃO reflete movimentos não-refletíveis (Rest, Recover, clima, terreno)', () => {
  const s = E.createBattle(
    mon(1, [156, 33], { speed: 200, currentHp: 1000 }), // Rest (156, target: self)
    mon(2, [33, 156], { speed: 50, ability: 'magic-bounce' })
  );

  const res = E.resolveTurn(s, {
    player: act(156),
    enemy: act(156)
  });

  const bounceNotice = res.events.find(e => e.type === 'MOVE_PREPARED' && e.reason === 'P7_ABILITY' && e.label === 'magic-bounce');
  assert.equal(bounceNotice, undefined, 'Rest não deve ser refletido');
  assert.equal(res.state.player.statusCondition, 'sleep');
});

test('Magic Bounce: zero recursão entre dois portadores de Magic Bounce (bounced flag impede loops)', () => {
  const s = E.createBattle(
    mon(1, [92, 33], { speed: 200, ability: 'magic-bounce' }), // Toxic
    mon(2, [33, 156], { speed: 50, ability: 'magic-bounce' })
  );

  const res = E.resolveTurn(s, {
    player: act(92),
    enemy: act(156)
  });

  const bounceEvents = res.events.filter(e => e.type === 'MOVE_PREPARED' && e.label === 'magic-bounce');
  assert.equal(bounceEvents.length, 1, 'Deve refletir exatamente uma vez sem entrar em recursão');
  assert.equal(res.state.player.statusCondition, 'toxic', 'Atacante original sofre o status refletido sem rebater de volta');
});

test('Magic Bounce: ignorado por Mold Breaker, a menos que defensor segure Ability Shield', () => {
  // 1. Without Ability Shield: Mold Breaker inflicts Toxic directly
  const s1 = E.createBattle(
    mon(1, [92, 33], { speed: 200, ability: 'mold-breaker' }),
    mon(2, [33, 156], { speed: 50, ability: 'magic-bounce' })
  );
  const res1 = E.resolveTurn(s1, { player: act(92), enemy: act(156) });
  assert.equal(res1.state.enemy.statusCondition, 'toxic', 'Mold Breaker fura Magic Bounce');
  assert.equal(res1.state.player.statusCondition, null);

  // 2. With Ability Shield: Magic Bounce reflects even against Mold Breaker
  const s2 = E.createBattle(
    mon(1, [92, 33], { speed: 200, ability: 'mold-breaker' }),
    mon(2, [33, 156], { speed: 50, ability: 'magic-bounce', heldItem: 'ability-shield' })
  );
  const res2 = E.resolveTurn(s2, { player: act(92), enemy: act(156) });
  assert.equal(res2.state.player.statusCondition, 'toxic', 'Ability Shield protege Magic Bounce contra Mold Breaker');
  assert.equal(res2.state.enemy.statusCondition, null);
});

test('Prankster vs Magic Bounce Dark-type: Magic Bounce reflete antes e o usuário do Prankster recebe o status', () => {
  // Mega Sableye (#10066, Dark/Ghost with Magic Bounce). Whimsicott uses Prankster Toxic.
  const s = E.createBattle(
    mon(547, [92, 33], { speed: 200, types: ['grass', 'fairy'], ability: 'prankster' }),
    mon(10066, [33, 156], { speed: 50, types: ['dark', 'ghost'], ability: 'magic-bounce' })
  );

  const res = E.resolveTurn(s, {
    player: act(92),
    enemy: act(156)
  });

  const bounceNotice = res.events.find(e => e.type === 'MOVE_PREPARED' && e.label === 'magic-bounce');
  assert.ok(bounceNotice, 'Magic Bounce deve agir antes da checagem de imunidade Dark do Prankster');
  assert.equal(res.state.player.statusCondition, 'toxic', 'Usuário original do Prankster recebe o status refletido');
  assert.equal(res.state.enemy.statusCondition, null, 'Mega Sableye não recebe o status');
});

test('Magic Bounce: supressão de habilidade (abilitySuppressed) desativa a reflexão', () => {
  const s = E.createBattle(
    mon(1, [92, 33], { speed: 200 }),
    mon(2, [33, 156], { speed: 50, ability: 'magic-bounce' })
  );
  s.enemy.abilitySuppressed = true;

  const res = E.resolveTurn(s, {
    player: act(92),
    enemy: act(156)
  });

  const bounceNotice = res.events.find(e => e.type === 'MOVE_PREPARED' && e.label === 'magic-bounce');
  assert.equal(bounceNotice, undefined, 'Habilidade suprimida não deve refletir');
  assert.equal(res.state.enemy.statusCondition, 'toxic', 'Alvo suprimido recebe o status');
});

/* ==========================================================================
   H5-A.4: AI and UI Integration
   ========================================================================== */

test('BattleEvaluator: reconhece que Infiltrator ignora barreiras ao calcular dano', () => {
  const attacker = mon(1, [33], { ability: 'infiltrator' });
  const defender = mon(2, [33]);
  const state = E.createBattle(attacker, defender);
  C.P6.init(state);
  state.p6Sides.enemy.reflect = 5;

  const scoreInf = V.evaluateMove(attacker, defender, move(33), { battleState: state, attackerSide: 'player' });

  const attackerNormal = mon(3, [33]);
  const scoreNormal = V.evaluateMove(attackerNormal, defender, move(33), { battleState: state, attackerSide: 'player' });

  assert.ok(scoreInf.expectedDamage > scoreNormal.expectedDamage, 'IA deve esperar maior dano para Infiltrator contra telas');
});

test('BattleEvaluator: penaliza golpes de status de Prankster contra oponentes do tipo Dark', () => {
  const attacker = mon(1, [92], { ability: 'prankster' });
  const defenderDark = mon(2, [33], { types: ['dark'] });
  const state = E.createBattle(attacker, defenderDark);

  const score = V.evaluateMove(attacker, defenderDark, move(92), state, C);
  assert.equal(score.expectedStatusBenefit, 0, 'IA não deve esperar benefício de status contra Dark type');
});

test('BattleEvaluator: penaliza golpes refletíveis contra defensor com Magic Bounce', () => {
  const attacker = mon(1, [92]);
  const defenderBounce = mon(2, [33], { ability: 'magic-bounce' });
  const state = E.createBattle(attacker, defenderBounce);

  const score = V.evaluateMove(attacker, defenderBounce, move(92), state, C);
  assert.equal(score.expectedStatusBenefit, -50, 'IA deve atribuir penalidade severa (-50) para golpe refletível');
});

test('UI Adapter: mapeia mensagens de IMMUNE_PRANKSTER e BLOCKED_BY_SUBSTITUTE em PT-BR', () => {
  const viewMessages = [];
  const adapter = new UI.BattleUiDomAdapter();
  adapter.view = { displayMessage: msg => viewMessages.push(msg) };

  adapter.handleCommand({
    type: 'MOVE_FAIL_FEEDBACK',
    reason: 'IMMUNE_PRANKSTER',
    pokemonName: 'Whimsicott',
    moveName: 'Toxic'
  });

  adapter.handleCommand({
    type: 'MOVE_FAIL_FEEDBACK',
    reason: 'BLOCKED_BY_SUBSTITUTE',
    pokemonName: 'Gengar',
    moveName: 'Toxic'
  });

  assert.ok(viewMessages.some(m => m.includes('Pokémon do tipo Dark são imunes a golpes com prioridade de Prankster!')));
  assert.ok(viewMessages.some(m => m.includes('O Substitute bloqueou o golpe!')));
});

/* ==========================================================================
   H5-A.5: Real Species and Battle Formats
   ========================================================================== */

test('Espécies Reais: Whimsicott (#547, Prankster) e Dragapult (#887, Infiltrator)', () => {
  const whimsicott = mon(547, [86, 33], { name: 'Whimsicott', ability: 'prankster', speed: 116 });
  const dragapult = mon(887, [33, 156], { name: 'Dragapult', ability: 'infiltrator', speed: 142 });

  const s = E.createBattle(whimsicott, dragapult);
  const res = E.resolveTurn(s, {
    player: act(86), // Thunder Wave with Prankster priority
    enemy: act(33)   // Tackle at normal priority
  });

  const moveOrder = res.events.filter(e => e.type === 'MOVE_USED').map(e => e.actor);
  assert.deepEqual(moveOrder, ['player', 'enemy'], 'Whimsicott age antes de Dragapult mais rápido com Prankster');
  assert.equal(res.state.enemy.statusCondition, 'paralysis', 'Dragapult fica paralisado');
});

test('Espécies Reais: Espeon (#196, Magic Bounce) reflete Will-O-Wisp', () => {
  const espeon = mon(196, [33, 156], { name: 'Espeon', ability: 'magic-bounce', speed: 110 });
  const enemy = mon(2, [261, 33], { name: 'Dusclops', speed: 25 });

  const s = E.createBattle(espeon, enemy);
  const res = E.resolveTurn(s, {
    player: act(33),
    enemy: act(261) // Will-O-Wisp (261)
  });

  assert.equal(res.state.enemy.statusCondition, 'burn', 'Dusclops sofre a própria queimadura de Will-O-Wisp');
  assert.equal(res.state.player.statusCondition, null, 'Espeon permanece imune');
});


/* ==========================================================================
   FASE 1: Magic Bounce — Auditoria Detalhada de Execução Refletida
   ========================================================================== */

test('FASE 1.1: Espeon (#196, Magic Bounce) reflete Toxic sem possuir Toxic; PP do atacante -1, Espeon 0 PP, Espeon executa ação normalmente', () => {
  const gengar = mon(94, [92, 33], { name: 'Gengar', speed: 130, types: ['ghost'] }); // Toxic is move 92
  const espeon = mon(196, [33, 156], { name: 'Espeon', ability: 'magic-bounce', speed: 110, types: ['psychic'] }); // Only Tackle and Rest

  const s = E.createBattle(gengar, espeon);
  const initialGengarPp = s.player.moves[0].currentPp; // Toxic PP
  const initialEspeonPp = s.enemy.moves[0].currentPp;  // Tackle PP

  const res = E.resolveTurn(s, {
    player: act(92), // Gengar uses Toxic
    enemy: act(33)   // Espeon uses Tackle
  });

  // 1. PP do atacante original decresceu em 1
  assert.equal(res.state.player.moves[0].currentPp, initialGengarPp - 1, 'Gengar deve consumir 1 PP de Toxic');
  // 2. PP de Espeon para o golpe que executou (Tackle) decresceu em 1 (da sua ação), mas NENHUM PP de Toxic foi consumido
  assert.equal(res.state.enemy.moves[0].currentPp, initialEspeonPp - 1, 'Espeon consumiu apenas o PP do seu próprio Tackle');
  // 3. Gengar foi envenenado pelo Toxic refletido
  assert.equal(res.state.player.statusCondition, 'toxic', 'Gengar sofre o efeito de Toxic refletido');
  assert.equal(res.state.enemy.statusCondition, null, 'Espeon não sofre Toxic');
  // 4. Espeon executou seu Tackle normalmente no mesmo turno
  const tackleEvent = res.events.find(e => e.type === 'MOVE_USED' && e.actor === 'enemy' && e.moveId === 33);
  assert.ok(tackleEvent, 'A ação de Espeon (Tackle) deve ser executada normalmente no mesmo turno');
});

test('FASE 1.2: Mega Sableye (#10065, Magic Bounce) reflete Taunt (#269); atacante recebe Taunt por 3 turnos e é bloqueado no turno seguinte', () => {
  const fasterMon = mon(1, [269, 14], { name: 'FasterMon', speed: 200 }); // Taunt (269), Swords Dance (14)
  const sableye = mon(10065, [33], { name: 'Mega-Sableye', ability: 'magic-bounce', speed: 50 });

  const s = E.createBattle(fasterMon, sableye);
  const res1 = E.resolveTurn(s, {
    player: act(269), // Taunt
    enemy: act(33)
  });

  // Taunt é aplicado por 3 turnos; no fim do turno 1 decrementa para 2 turnos restantes
  assert.equal(res1.state.player.tauntTurns, 2, 'Atacante original deve ter 2 turnos restantes após o turno 1');
  assert.ok(!res1.state.enemy.tauntTurns, 'Mega Sableye não deve ficar sob efeito de Taunt');

  // Turno seguinte: atacante tenta usar Swords Dance (status) e é bloqueado pelo Taunt
  const res2 = E.resolveTurn(res1.state, {
    player: act(14), // Swords Dance
    enemy: act(33)
  });

  const tauntedFail = res2.events.find(e => e.type === 'MOVE_FAILED' && e.actor === 'player' && e.reason === 'TAUNTED');
  assert.ok(tauntedFail, 'Golpe de status deve falhar com reason TAUNTED');
  assert.equal(res2.state.player.statStages.attack, 0, 'Ataque não deve ter aumentado');
});

test('FASE 1.3: Dois portadores de Magic Bounce (Espeon vs Hatterene): Toxic é refletido exatamente 1 nível sem loop', () => {
  const espeon = mon(196, [92, 33], { name: 'Espeon', ability: 'magic-bounce', speed: 110, types: ['psychic'] });
  const hatterene = mon(858, [33], { name: 'Hatterene', ability: 'magic-bounce', speed: 29, types: ['psychic', 'fairy'] });

  const s = E.createBattle(espeon, hatterene);
  const res = E.resolveTurn(s, {
    player: act(92), // Espeon uses Toxic
    enemy: act(33)
  });

  // Hatterene reflete para Espeon. Espeon NÃO reflete de volta! Espeon recebe Toxic.
  assert.equal(res.state.player.statusCondition, 'toxic', 'Espeon deve receber o Toxic refletido sem re-refletir');
  assert.equal(res.state.enemy.statusCondition, null, 'Hatterene permanece imune');

  const bounceEvents = res.events.filter(e => e.type === 'MOVE_PREPARED' && e.label === 'magic-bounce');
  assert.equal(bounceEvents.length, 1, 'Magic Bounce deve disparar exatamente UMA vez (sem loop)');
});

test('FASE 1.4: Movimento refletido pode errar se sua acurácia for inferior a 100 e accuracyRoll falhar', () => {
  const enemyWillO = mon(1, [261, 33], { name: 'Dusclops', speed: 120 }); // Will-O-Wisp (acc 85)
  const espeon = mon(196, [33], { name: 'Espeon', ability: 'magic-bounce', speed: 50 });

  const s = E.createBattle(enemyWillO, espeon);
  // accuracyRoll 95 > 85, então o Will-O-Wisp refletido erra contra Dusclops!
  const res = E.resolveTurn(s, {
    player: act(261, { accuracyRoll: 95 }),
    enemy: act(33)
  });

  const missEvent = res.events.find(e => e.type === 'MOVE_MISSED' && e.actor === 'enemy' && e.moveId === 261);
  assert.ok(missEvent, 'Golpe refletido com accuracyRoll 95 deve emitir MOVE_MISSED contra Dusclops');
  assert.equal(res.state.player.statusCondition, null, 'Dusclops não foi queimado pois o golpe errou');
});

test('FASE 1.5: Movimento refletido falha se atacante original possuir imunidade de tipo (Toxic refletido para Poison type)', () => {
  const gengarPoison = mon(94, [92, 33], { name: 'Gengar', speed: 120, types: ['ghost', 'poison'] });
  const espeon = mon(196, [33], { name: 'Espeon', ability: 'magic-bounce', speed: 50 });

  const s = E.createBattle(gengarPoison, espeon);
  const res = E.resolveTurn(s, {
    player: act(92), // Toxic
    enemy: act(33)
  });

  const blockedEvent = res.events.find(e => e.type === 'STATUS_BLOCKED' && e.target === 'player' && e.reason === 'IMMUNE');
  assert.ok(blockedEvent, 'Gengar (Poison-type) é imune a Toxic refletido');
  assert.equal(res.state.player.statusCondition, null, 'Gengar não é afetado');
});

test('FASE 1.6: Mold Breaker anula Magic Bounce, exceto se defensor portar Ability Shield', () => {
  const haxorus = mon(612, [92, 33], { name: 'Haxorus', ability: 'mold-breaker', speed: 120 });
  const espeonNormal = mon(196, [33], { name: 'Espeon', ability: 'magic-bounce', speed: 50 });
  const espeonShield = mon(196, [33], { name: 'EspeonShield', ability: 'magic-bounce', item: 'ability-shield', speed: 50 });

  // Sem Ability Shield: Mold Breaker envenena Espeon
  const s1 = E.createBattle(haxorus, espeonNormal);
  const res1 = E.resolveTurn(s1, { player: act(92), enemy: act(33) });
  assert.equal(res1.state.enemy.statusCondition, 'toxic', 'Mold Breaker ignora Magic Bounce sem Ability Shield');

  // Com Ability Shield: Magic Bounce funciona e envenena Haxorus
  const s2 = E.createBattle(haxorus, espeonShield);
  const res2 = E.resolveTurn(s2, { player: act(92), enemy: act(33) });
  assert.equal(res2.state.player.statusCondition, 'toxic', 'Ability Shield preserva Magic Bounce contra Mold Breaker');
  assert.equal(res2.state.enemy.statusCondition, null, 'EspeonShield permanece imune');
});

test('FASE 1.7: Supressão genuína (abilitySuppressed: true) desativa Magic Bounce', () => {
  const gengar = mon(94, [92, 33], { name: 'Gengar', speed: 120 });
  const espeon = mon(196, [33], { name: 'Espeon', ability: 'magic-bounce', speed: 50 });

  const s = E.createBattle(gengar, espeon);
  s.enemy.abilitySuppressed = true; // Supressão ativa de habilidade

  const res = E.resolveTurn(s, { player: act(92), enemy: act(33) });

  assert.equal(res.state.enemy.statusCondition, 'toxic', 'Com Magic Bounce suprimido, Espeon é envenenado');
  assert.equal(res.state.player.statusCondition, null, 'Gengar não sofre reflexão');
});

test('FASE 1.8: Parting Shot (#575) refletido: atacante sofre debuff e portador de Magic Bounce recebe solicitação de pivot', () => {
  const pangoro = mon(675, [575, 33], { name: 'Pangoro', speed: 120 });
  const espeon = mon(196, [33], { name: 'Espeon', ability: 'magic-bounce', speed: 50 });
  const b1 = mon(197, [33], { name: 'Umbreon', speed: 50 });
  const b2 = mon(198, [33], { name: 'Vaporeon', speed: 50 });
  const b3 = mon(674, [33], { name: 'Pancham', speed: 50 });
  const b4 = mon(676, [33], { name: 'Pangoro2', speed: 50 });

  const s = E.createBattle([pangoro, b3, b4], [espeon, b1, b2]);
  const res = E.resolveTurn(s, { player: act(575), enemy: act(33) });

  // Atacante original sofre -1 Atk e -1 SpAtk
  assert.equal(res.state.player.team[0].statStages.attack, -1, 'Pangoro deve ter Atk reduzido');
  assert.equal(res.state.player.team[0].statStages.specialAttack, -1, 'Pangoro deve ter SpAtk reduzido');

  // Refletor (enemy) recebe pedido de substituição (PIVOT)
  const pivotEvent = res.events.find(e => e.type === 'REPLACEMENT_REQUIRED' && e.side === 'enemy' && e.reason === 'PIVOT');
  assert.ok(pivotEvent, 'Espeon deve receber REPLACEMENT_REQUIRED com reason PIVOT');
  assert.equal(res.state.status, 'AWAITING_REPLACEMENT');
});

test('FASE 1.9: Strength Sap (#668) refletido: atacante sofre -1 Atk e portador de Magic Bounce é curado', () => {
  const trevenant = mon(709, [668, 33], { name: 'Trevenant', attack: 150, speed: 120 });
  const espeon = mon(196, [33], { name: 'Espeon', ability: 'magic-bounce', speed: 50, currentHp: 500, maxHp: 2000 });

  const s = E.createBattle(trevenant, espeon);
  const res = E.resolveTurn(s, { player: act(668), enemy: act(33) });

  // Trevenant tem Attack reduzido em 1 estágio
  assert.equal(res.state.player.statStages.attack, -1, 'Trevenant sofre redução de ataque');
  // Espeon é curado
  assert.ok(res.state.enemy.currentHp > 500, 'Espeon deve recuperar HP pelo Strength Sap refletido');
  const healEvent = res.events.find(e => e.type === 'HP_HEALED' && e.target === 'enemy');
  assert.ok(healEvent, 'Espeon deve emitir HP_HEALED');
});

/* ==========================================================================
   FASE 2: Hazards de Entrada e Múltiplos Alvos
   ========================================================================== */

test('FASE 2.1: Entry Hazards (Stealth Rock, Spikes, Toxic Spikes, Sticky Web) refletidos para o lado do atacante', () => {
  const hazardUser = mon(1, [446, 191, 390, 564], { name: 'HazardUser', speed: 120 });
  const espeon = mon(196, [33], { name: 'Espeon', ability: 'magic-bounce', speed: 50 });

  // Stealth Rock (446)
  const s1 = E.createBattle(hazardUser, espeon);
  const res1 = E.resolveTurn(s1, { player: act(446), enemy: act(33) });
  assert.equal(res1.state.p6Sides.player.stealthRock, 1, 'Lado do atacante recebe Stealth Rock');
  assert.ok(!res1.state.p6Sides.enemy.stealthRock, 'Lado de Espeon permanece limpo');

  // Spikes (191)
  const res2 = E.resolveTurn(res1.state, { player: act(191), enemy: act(33) });
  assert.equal(res2.state.p6Sides.player.spikes, 1, 'Lado do atacante recebe Spikes');
  assert.ok(!res2.state.p6Sides.enemy.spikes, 'Lado de Espeon sem Spikes');

  // Toxic Spikes (390)
  const res3 = E.resolveTurn(res2.state, { player: act(390), enemy: act(33) });
  assert.equal(res3.state.p6Sides.player.toxicSpikes, 1, 'Lado do atacante recebe Toxic Spikes');

  // Sticky Web (564)
  const res4 = E.resolveTurn(res3.state, { player: act(564), enemy: act(33) });
  assert.equal(res4.state.p6Sides.player.stickyWeb, 1, 'Lado do atacante recebe Sticky Web');
});

test('FASE 2.2 e 2.3: Limite de camadas de hazards refletidos (Spikes max 3, falha com HAZARD_LIMIT sem erro)', () => {
  const hazardUser = mon(1, [191, 33], { name: 'HazardUser', speed: 120 });
  const espeon = mon(196, [33], { name: 'Espeon', ability: 'magic-bounce', speed: 50 });

  let s = E.createBattle(hazardUser, espeon);
  // Coloca 3 camadas de Spikes
  s = E.resolveTurn(s, { player: act(191), enemy: act(33) }).state;
  s = E.resolveTurn(s, { player: act(191), enemy: act(33) }).state;
  s = E.resolveTurn(s, { player: act(191), enemy: act(33) }).state;
  assert.equal(s.p6Sides.player.spikes, 3, 'Spikes atinge o limite de 3 camadas');

  // 4ª tentativa de Spikes refletida: deve falhar com HAZARD_LIMIT de forma limpa
  const res4 = E.resolveTurn(s, { player: act(191), enemy: act(33) });
  assert.equal(res4.state.p6Sides.player.spikes, 3, 'Não ultrapassa 3 camadas');
  const limitFail = res4.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'HAZARD_LIMIT');
  assert.ok(limitFail, 'Falha graciosa com HAZARD_LIMIT');
});

/* ==========================================================================
   FASE 3: Prankster — Prioridade Condicional e Imunidade Dark
   ========================================================================== */

test('FASE 3.1: Roar (-6) recebe +1 de Prankster tornando-se prioridade -5', () => {
  const roarMove = { id: 46, name: 'roar', type: 'normal', power: null, pp: 20, accuracy: null, priority: -6, damageClass: 'status', target: 'normal' };
  const whimsicott = mon(547, [roarMove, 33], { name: 'Whimsicott', ability: 'prankster', speed: 50 });
  const prioRoar = P7.priority(whimsicott, roarMove, C);
  assert.equal(prioRoar, -5, 'Roar de base -6 vira -5 com Prankster');
});

test('FASE 3.2: Prankster vs Dark: movimentos de status direcionados falham, mas self-status e hazards funcionam', () => {
  const whimsicott = mon(547, [86, 14, 446], { name: 'Whimsicott', ability: 'prankster', speed: 116 }); // T-Wave (86), Swords Dance (14), Stealth Rock (446)
  const darkMon = mon(2, [33], { name: 'DarkMon', types: ['dark'], speed: 50 });

  // Thunder Wave direcionado ao DarkMon: IMMUNE_PRANKSTER
  const s1 = E.createBattle(whimsicott, darkMon);
  const res1 = E.resolveTurn(s1, { player: act(86), enemy: act(33) });
  const immunePrank = res1.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'IMMUNE_PRANKSTER');
  assert.ok(immunePrank, 'Golpe de status direcionado contra Dark deve falhar com IMMUNE_PRANKSTER');

  // Swords Dance (auto-status): funciona perfeitamente
  const res2 = E.resolveTurn(s1, { player: act(14), enemy: act(33) });
  assert.equal(res2.state.player.statStages.attack, 2, 'Auto-status funciona normalmente mesmo com Prankster');

  // Stealth Rock (campo adversário): funciona normalmente
  const res3 = E.resolveTurn(s1, { player: act(446), enemy: act(33) });
  assert.equal(res3.state.p6Sides.enemy.stealthRock, 1, 'Hazards afetam o lado adversário e não falham contra Dark');
});

test('FASE 3.3: Psychic Terrain protege alvo aterrado, mas NÃO protege alvo voador ou com Levitate', () => {
  const whimsicott = mon(547, [86, 33], { name: 'Whimsicott', ability: 'prankster', speed: 116 });
  const groundedDef = mon(1, [33], { name: 'GroundedDef', types: ['normal'], speed: 50 });
  const flyingDef = mon(2, [33], { name: 'FlyingDef', types: ['flying'], speed: 50 });
  const levitateDef = mon(3, [33], { name: 'LevitateDef', ability: 'levitate', types: ['poison'], speed: 50 });

  // Alvo aterrado em Psychic Terrain: bloqueado
  const s1 = E.createBattle(whimsicott, groundedDef);
  s1.terrain = { id: 'psychic', turns: 5 };
  const res1 = E.resolveTurn(s1, { player: act(86), enemy: act(33) });
  assert.ok(res1.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'PSYCHIC_TERRAIN_PROTECTED'));

  // Alvo Flying em Psychic Terrain: NÃO bloqueado pelo terreno
  const s2 = E.createBattle(whimsicott, flyingDef);
  s2.terrain = { id: 'psychic', turns: 5 };
  const res2 = E.resolveTurn(s2, { player: act(86), enemy: act(33) });
  assert.equal(res2.state.enemy.statusCondition, 'paralysis', 'Alvo voador é afetado por Prankster em Psychic Terrain');

  // Alvo Levitate em Psychic Terrain: NÃO bloqueado pelo terreno
  const s3 = E.createBattle(whimsicott, levitateDef);
  s3.terrain = { id: 'psychic', turns: 5 };
  const res3 = E.resolveTurn(s3, { player: act(86), enemy: act(33) });
  assert.equal(res3.state.enemy.statusCondition, 'paralysis', 'Alvo com Levitate é afetado por Prankster em Psychic Terrain');
});

test('FASE 3.4: Trick Room inverte velocidade dentro da mesma prioridade, mas Prankster (+1) age antes de prioridade 0', () => {
  const whimsicott = mon(547, [86, 33], { name: 'Whimsicott', ability: 'prankster', speed: 116 });
  const slowAttacker = mon(2, [33], { name: 'SlowAttacker', speed: 20 });

  const s = E.createBattle(whimsicott, slowAttacker);
  s.trickRoom = { turns: 4 }; // Sob Trick Room, velocidade 20 agiria antes de 116 na mesma prioridade

  const res = E.resolveTurn(s, {
    player: act(86), // Prankster Status: prioridade +1
    enemy: act(33)   // Tackle: prioridade 0
  });

  const moveOrder = res.events.filter(e => e.type === 'MOVE_USED').map(e => e.actor);
  assert.deepEqual(moveOrder, ['player', 'enemy'], 'Prankster (+1) age antes de prioridade 0 mesmo sob Trick Room');
});

test('FASE 3.5: Prankster vs Mega Sableye: Magic Bounce reflete Taunt antes do check Dark; Sableye reflete para atacante não-Dark', () => {
  const whimsicott = mon(547, [269, 33], { name: 'Whimsicott', ability: 'prankster', speed: 116, types: ['grass', 'fairy'] });
  const sableye = mon(10065, [33], { name: 'MegaSableye', ability: 'magic-bounce', speed: 20, types: ['dark', 'ghost'] });

  const s = E.createBattle(whimsicott, sableye);
  const res = E.resolveTurn(s, {
    player: act(269), // Whimsicott uses Taunt
    enemy: act(33)
  });

  // Magic Bounce reflete Taunt para Whimsicott (3 turnos aplicados, 2 restantes ao fim do turno 1)
  assert.equal(res.state.player.tauntTurns, 2, 'Whimsicott (não-Dark) recebe Taunt refletido');
  assert.ok(!res.state.enemy.tauntTurns, 'Mega Sableye não recebe Taunt');
});

/* ==========================================================================
   FASE 4: Infiltrator e Ciclo Completo do Substitute
   ========================================================================== */

test('FASE 4.1: Substitute: criação consome 25% baseMaxHp; falha se HP <= custo (TOO_WEAK) ou se já ativo (ALREADY_SUBSTITUTE)', () => {
  const user = mon(1, [164, 33], { name: 'SubUser', hp: 1000, maxHp: 1000, currentHp: 1000 });
  const opp = mon(2, [14, 33], { name: 'Opp', hp: 1000, maxHp: 1000, currentHp: 1000 });

  // 1. Criação normal (oponente usa Swords Dance para não atingir o Substitute no mesmo turno)
  const s = E.createBattle(user, opp);
  const expectedCost = Math.floor(C.P8.baseMaxHp(s.player) / 4);
  const res1 = E.resolveTurn(s, { player: act(164), enemy: act(14) });
  assert.equal(res1.state.player.currentHp, 1000 - expectedCost, 'Consome exatamente 25% de baseMaxHp');
  assert.equal(res1.state.player.substituteHp, expectedCost, 'Substitute HP é o custo calculado');
  assert.equal(res1.state.player.substitute, true, 'Substitute está ativo');

  // 2. Já ativo: falha com ALREADY_SUBSTITUTE
  const res2 = E.resolveTurn(res1.state, { player: act(164), enemy: act(33) });
  assert.ok(res2.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'ALREADY_SUBSTITUTE'));

  // 3. HP <= custo: falha com TOO_WEAK
  const weakUser = mon(3, [164, 33], { name: 'WeakUser', hp: 1000, maxHp: 1000, currentHp: expectedCost });
  const sWeak = E.createBattle(weakUser, opp);
  const resWeak = E.resolveTurn(sWeak, { player: act(164), enemy: act(33) });
  assert.ok(resWeak.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'TOO_WEAK'));
});

test('FASE 4.2 e 4.3: Não-Infiltrator: status é bloqueado por Substitute e dano absorvido pelo Substitute preservando HP do Pokémon', () => {
  const attacker = mon(1, [86, 33], { name: 'Attacker', speed: 120 }); // T-Wave (86), Tackle (33)
  const subTarget = mon(2, [33], { name: 'SubTarget', speed: 50, currentHp: 1000, maxHp: 1000, substitute: true, substituteHp: 250 });

  // Thunder Wave bloqueado por Substitute
  const s1 = E.createBattle(attacker, subTarget);
  const res1 = E.resolveTurn(s1, { player: act(86), enemy: act(33) });
  assert.ok(res1.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_SUBSTITUTE'));
  assert.equal(res1.state.enemy.statusCondition, null, 'Defensor não fica paralisado');

  // Dano físico reduz Substitute HP e preserva HP do mon
  const res2 = E.resolveTurn(s1, { player: act(33), enemy: act(33) });
  assert.equal(res2.state.enemy.currentHp, 1000, 'HP do Pokémon permanece intacto');
  assert.ok(res2.state.enemy.substituteHp < 250, 'Substitute HP absorveu o dano');
});

test('FASE 4.4: Quebra do Substitute sem transbordo de dano no mesmo hit', () => {
  // Hit massivo (1000 dano) contra Substitute de 50 HP. O Pokémon não deve sofrer o excedente no mesmo hit.
  const nukeAttacker = mon(1, [33], { name: 'Nuke', attack: 500, speed: 120 });
  const defender = mon(2, [33], { name: 'Defender', currentHp: 1000, maxHp: 1000, defense: 50, speed: 50, substitute: true, substituteHp: 50 });

  const s = E.createBattle(nukeAttacker, defender);
  const res = E.resolveTurn(s, { player: act(33), enemy: act(33) });

  assert.equal(res.state.enemy.substituteHp, 0, 'Substitute destruído');
  assert.equal(res.state.enemy.substitute, false, 'Substitute desativado');
  assert.equal(res.state.enemy.currentHp, 1000, 'Pokémon NÃO sofre transbordo de dano no hit que quebrou o Substitute');
});

test('FASE 4.5: Multi-hit quebra Substitute no hit 1 e hits subsequentes causam dano ao HP do Pokémon', () => {
  // Bullet Seed (331, multi-hit 2-5). Hit 1 quebra sub de 10 HP, Hit 2+ causa dano direto ao HP.
  const multiAttacker = mon(1, [331], { name: 'Multi', speed: 120 });
  const defender = mon(2, [33], { name: 'Defender', currentHp: 1000, maxHp: 1000, speed: 50, substitute: true, substituteHp: 10 });

  const s = E.createBattle(multiAttacker, defender);
  const res = E.resolveTurn(s, {
    player: act(331, { hitCount: 2 }), // 2 hits
    enemy: act(33)
  });

  assert.equal(res.state.enemy.substitute, false, 'Substitute foi destruído');
  assert.ok(res.state.enemy.currentHp < 1000, 'Hit 2 causou dano direto ao HP do Pokémon');
});

test('FASE 4.6: Sound moves ultrapassam Substitute e causam dano direto ao HP', () => {
  // Hyper Voice (304) é golpe de som
  const soundAttacker = mon(1, [304], { name: 'SoundAttacker', speed: 120 });
  const defender = mon(2, [33], { name: 'Defender', currentHp: 1000, maxHp: 1000, speed: 50, substitute: true, substituteHp: 250 });

  const s = E.createBattle(soundAttacker, defender);
  const res = E.resolveTurn(s, { player: act(304), enemy: act(33) });

  assert.ok(res.state.enemy.currentHp < 1000, 'Golpe de som causou dano direto ao HP do Pokémon');
  assert.equal(res.state.enemy.substituteHp, 250, 'Substitute HP permaneceu intacto');
});

test('FASE 4.7 e 4.8: Infiltrator ultrapassa Substitute com dano e status, mas NÃO ultrapassa Protect', () => {
  const infiltrator = mon(887, [33, 86], { name: 'Dragapult', ability: 'infiltrator', speed: 120 });
  const subDefender = mon(2, [33, 182], { name: 'SubDefender', speed: 50, currentHp: 1000, maxHp: 1000, substitute: true, substituteHp: 250 }); // Protect (182)

  // Infiltrator ataca com dano: atinge HP e preserva Substitute
  const s1 = E.createBattle(infiltrator, subDefender);
  const res1 = E.resolveTurn(s1, { player: act(33), enemy: act(33) });
  assert.ok(res1.state.enemy.currentHp < 1000, 'Infiltrator causou dano direto ao Pokémon');
  assert.equal(res1.state.enemy.substituteHp, 250, 'Substitute HP permaneceu intacto');

  // Infiltrator aplica Thunder Wave através do Substitute
  const res2 = E.resolveTurn(s1, { player: act(86), enemy: act(33) });
  assert.equal(res2.state.enemy.statusCondition, 'paralysis', 'Infiltrator aplica status através do Substitute');

  // Infiltrator vs Protect: Infiltrator NÃO ultrapassa Protect
  const resProtect = E.resolveTurn(s1, { player: act(33), enemy: act(182) }); // Enemy uses Protect
  const protectFail = resProtect.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_PROTECT');
  assert.ok(protectFail, 'Infiltrator é bloqueado por Protect');
});

test('FASE 4.9: Infiltrator respeita imunidades de tipo naturais (Toxic vs Poison type)', () => {
  const infiltrator = mon(887, [92], { name: 'Dragapult', ability: 'infiltrator', speed: 120 });
  const poisonDef = mon(94, [33], { name: 'Gengar', types: ['ghost', 'poison'], substitute: true, substituteHp: 250, speed: 50 });

  const s = E.createBattle(infiltrator, poisonDef);
  const res = E.resolveTurn(s, { player: act(92), enemy: act(33) });

  const blocked = res.events.find(e => e.type === 'STATUS_BLOCKED' && e.reason === 'IMMUNE');
  assert.ok(blocked, 'Infiltrator respeita imunidade elemental a Toxic');
  assert.equal(res.state.enemy.statusCondition, null, 'Gengar permanece sem status');
});

test('FASE 4.10: Troca voluntária desativa o Substitute do Pokémon que sai', () => {
  const subMon = mon(1, [33], { name: 'SubMon', substitute: true, substituteHp: 250, speed: 120 });
  const b1 = mon(2, [33], { name: 'BenchMon1', speed: 100 });
  const b2 = mon(3, [33], { name: 'BenchMon2', speed: 90 });
  const opp1 = mon(4, [33], { name: 'Opp1', speed: 50 });
  const opp2 = mon(5, [33], { name: 'Opp2', speed: 50 });
  const opp3 = mon(6, [33], { name: 'Opp3', speed: 50 });

  const s = E.createBattle([subMon, b1, b2], [opp1, opp2, opp3]);
  const res = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: act(33)
  });

  // O mon anterior no banco tem substitute zerado
  assert.equal(res.state.player.team[0].substitute, false, 'Substitute é removido ao sair do campo');
  assert.equal(res.state.player.team[0].substituteHp, 0, 'Substitute HP é zerado');
});

/* ==========================================================================
   FASE 5: Integração com BattleSessionController e Modalidades de Batalha
   ========================================================================== */

test('FASE 5.1: Modalidade 1v1 (Individual) com BattleSessionController e determinismo de Prankster', async () => {
  const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller');
  const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source');

  const randomSource = new DeterministicRandomSource({
    accuracyRoll: 1,
    damageRoll: 100,
    secondaryEffectRoll: 100
  });

  const controller = new BattleSessionController({
    randomSource,
    format: 'INDIVIDUAL'
  });

  controller.battleState = E.createBattle(
    mon(547, [86, 33], { name: 'Whimsicott', ability: 'prankster', speed: 116 }),
    mon(94, [33], { name: 'Gengar', speed: 130 })
  );
  controller.uiState = 'AWAITING_PLAYER_ACTION';

  await controller.submitPlayerMove(86); // Whimsicott uses Thunder Wave (Prankster +1)

  assert.equal(controller.battleState.enemy.statusCondition, 'paralysis', 'Prankster paralisou Gengar deterministamente na sessão');
});

test('FASE 5.2: Modalidade 3x3 Singles: Troca estratégica para Magic Bounce na presença de hazards', () => {
  const hazardAttacker = mon(1, [446, 33], { name: 'StealthRocker', speed: 120 });
  const b1 = mon(2, [33], { name: 'B1', speed: 50 });
  const b2 = mon(3, [33], { name: 'B2', speed: 50 });

  const activeMon = mon(4, [33], { name: 'Active', speed: 100 });
  const espeonBench = mon(196, [33], { name: 'Espeon', ability: 'magic-bounce', speed: 110 });
  const b3 = mon(5, [33], { name: 'B3', speed: 50 });

  const s = E.createBattle([hazardAttacker, b1, b2], [activeMon, espeonBench, b3]);

  // Turno 1: Active troca para Espeon enquanto StealthRocker tenta usar Stealth Rock
  const res1 = E.resolveTurn(s, {
    player: act(446), // Stealth Rock
    enemy: { type: 'SWITCH', targetIndex: 1 } // Switch to Espeon
  });

  // Switch ocorre primeiro; o golpe do player (Stealth Rock) atinge o recém-entrado Espeon!
  // Magic Bounce reflete Stealth Rock de volta para o lado do player!
  assert.equal(res1.state.p6Sides.player.stealthRock, 1, 'Stealth Rock é refletido para o lado do atacante');
  assert.ok(!res1.state.p6Sides.enemy.stealthRock, 'Lado de Espeon permanece sem Stealth Rock');
});

test('FASE 5.3: Modalidade Final Stand: Infiltrator ignora barreiras (Reflect) e garante a vitória', () => {
  const dragapult = mon(887, [33], { name: 'Dragapult', ability: 'infiltrator', attack: 200, speed: 142 });
  const p2 = mon(2, [33], { name: 'P2', currentHp: 0 });
  const p3 = mon(3, [33], { name: 'P3', currentHp: 0 });

  const lastEnemy = mon(4, [33], { name: 'LastStandMon', currentHp: 50, maxHp: 500, defense: 100, speed: 50 });
  const e2 = mon(5, [33], { name: 'E2', currentHp: 0 });
  const e3 = mon(6, [33], { name: 'E3', currentHp: 0 });

  const s = E.createBattle([dragapult, p2, p3], [lastEnemy, e2, e3]);
  C.P6.init(s);
  s.p6Sides.enemy.reflect = 5; // Barreira física ativa

  const res = E.resolveTurn(s, {
    player: act(33, { damageRoll: 100 }), // Tackle ignora Reflect devido a Infiltrator
    enemy: act(33)
  });

  assert.equal(res.state.enemy.team[0].currentHp, 0, 'Infiltrator eliminou o último Pokémon sem atenuar pelo Reflect');
  assert.equal(res.state.status, 'PLAYER_WIN', 'Partida encerrada com vitória no Final Stand');
});

test('FASE 5.4: Modalidade Doubles (2v2): Prankster direciona status para o oponente correto', () => {
  const whimsicott = mon(547, [86, 33], { name: 'Whimsicott', ability: 'prankster', speed: 116 });
  const ally = mon(2, [33], { name: 'Ally', speed: 100 });
  const enemy1 = mon(3, [33], { name: 'Enemy1', speed: 80 });
  const enemy2 = mon(4, [33], { name: 'Enemy2', speed: 70 });

  const s = E.createDoublesBattle([whimsicott, ally], [enemy1, enemy2]);

  const res = E.resolveTurn(s, {
    player: act(86, { targetRole: 'enemy' }),
    enemy: act(33)
  });

  assert.equal(res.state.enemy.team[0].statusCondition, 'paralysis', 'Enemy1 recebeu status com Prankster');
  assert.equal(res.state.player.team[1].statusCondition, null, 'Aliado não foi afetado');
});
