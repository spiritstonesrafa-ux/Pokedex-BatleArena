const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const V = require('../../assets/js/battle/battle-evaluator');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const mon = (id, ids = [33, 85], extra = {}) => ({
  id,
  name: 'test-mon-' + id,
  types: ['grass', 'dragon'],
  hp: 2000,
  maxHp: 2000,
  currentHp: 2000,
  attack: 100,
  defense: 100,
  specialAttack: 100,
  specialDefense: 100,
  speed: 100,
  accuracyStage: 0,
  evasionStage: 0,
  statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, accuracy: 0, evasion: 0 },
  moves: ids.map(move),
  ...extra
});

const act = (id, extra = {}) => ({
  type: 'MOVE',
  moveId: id,
  accuracyRoll: 1,
  damageRoll: 100,
  criticalRoll: 24,
  secondaryEffectRoll: 100,
  ...extra
});

const battle = (a = {}, b = {}, idsA = [33, 85], idsB = [33, 85]) => E.createBattle(
  mon(1011, idsA, { speed: 200, ...a }),
  mon(2, idsB, { speed: 50, ...b })
);

const turn = (s, id = 33, extra = {}, enemy = act(33)) => E.resolveTurn(s, {
  player: act(id, extra),
  enemy
});

/* ==========================================================================
   CENÁRIO 1: REGISTRO CANÔNICO E METADADOS
   ========================================================================== */

test('Supersweet Syrup: registro canônico em ability-registry.js e p7-mechanics', () => {
  const meta = Reg.getAbility('supersweet-syrup');
  assert.ok(meta, 'Supersweet Syrup deve estar registrada no catálogo');
  assert.equal(meta.id, 'supersweet-syrup');
  assert.equal(meta.name, 'Supersweet Syrup');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H4');
  assert.equal(meta.generation, 9);
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, true);
  assert.equal(meta.copyable, true);
  assert.equal(meta.swappable, true);
  assert.deepEqual(meta.flags, {});
  assert.ok(meta.bearer.includes('Dipplin'));
  assert.ok(meta.bearer.includes('Hydrapple'));
  assert.ok(P7.abilityNames.includes('supersweet-syrup'));
});

/* ==========================================================================
   CENÁRIOS 2, 3 E 4: ATIVAÇÃO EM SINGLES, REDUÇÃO E SEGURANÇA DE ALVOS
   ========================================================================== */

test('Supersweet Syrup: reduz evasão do oponente em exatamente 1 estágio na entrada (Singles)', () => {
  const s = battle({ ability: 'supersweet-syrup' }, {});
  assert.equal(s.enemy.evasionStage, -1, 'Adversário deve ter evasionStage reduzido para -1');
  assert.equal(s.player.evasionStage, 0, 'Portador não deve ter sua evasão alterada');
  assert.equal(s.player.accuracyStage, 0, 'Precisão do portador não deve ser alterada');
  assert.equal(s.player.syrupTriggered, true, 'syrupTriggered deve ser marcado na ativação');
});

test('Supersweet Syrup: preserva atributos-base e não aplica dano', () => {
  const s = battle({ ability: 'supersweet-syrup' }, { hp: 1000, currentHp: 1000, attack: 120, defense: 80 });
  assert.equal(s.enemy.currentHp, 1000);
  assert.equal(s.enemy.attack, 120);
  assert.equal(s.enemy.defense, 80);
});

/* ==========================================================================
   CENÁRIOS 5 E 6: UMA ATIVAÇÃO POR BATALHA E TROCAS MÚLTIPLAS
   ========================================================================== */

test('Supersweet Syrup: reentrada do mesmo Pokémon NÃO reativa a habilidade (syrupTriggered)', () => {
  const p1 = mon(1011, [33], { ability: 'supersweet-syrup', speed: 200 });
  const p2 = mon(3, [33], { speed: 150 });
  const p3 = mon(4, [33], { speed: 100 });
  const e1 = mon(6, [33], { speed: 50 });
  const e2 = mon(7, [33], { speed: 50 });
  const e3 = mon(8, [33], { speed: 50 });

  const s = E.createTeamBattle([p1, p2, p3], [e1, e2, e3]);
  const activeEnemy = () => s.enemy.team[s.enemy.activeIndex];
  const activePlayer = () => s.player.team[s.player.activeIndex];

  assert.equal(activeEnemy().evasionStage, -1, 'Primeira entrada reduz evasão');
  assert.equal(activePlayer().syrupTriggered, true);

  // Restaura a evasão do adversário para testar se a reentrada reduziria de novo
  activeEnemy().evasionStage = 0;

  // Jogador troca para p2
  const r1 = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetPokemonId: 3 },
    enemy: act(33)
  });
  assert.equal(r1.state.enemy.team[r1.state.enemy.activeIndex].evasionStage, 0);

  // Jogador troca de volta para p1 (Dipplin)
  const r2 = E.resolveTurn(r1.state, {
    player: { type: 'SWITCH', targetPokemonId: 1011 },
    enemy: act(33)
  });

  const active = r2.state.player.team[r2.state.player.activeIndex];
  assert.equal(active.id, 1011);
  assert.equal(active.syrupTriggered, true, 'syrupTriggered deve persistir na equipe');
  assert.equal(r2.state.enemy.team[r2.state.enemy.activeIndex].evasionStage, 0, 'Reentrada NÃO deve reduzir a evasão novamente');
});

test('Supersweet Syrup: múltiplas trocas na batalha mantêm a ativação estritamente única', () => {
  const p1 = mon(1011, [33], { ability: 'supersweet-syrup', speed: 200 });
  const p2 = mon(3, [33], { speed: 150 });
  const p3 = mon(4, [33], { speed: 100 });
  const e1 = mon(6, [33], { speed: 50 });
  const e2 = mon(7, [33], { speed: 50 });
  const e3 = mon(8, [33], { speed: 50 });

  let s = E.createTeamBattle([p1, p2, p3], [e1, e2, e3]);
  assert.equal(s.enemy.team[s.enemy.activeIndex].evasionStage, -1);

  // Troca 1: sai Dipplin, entra mon 3
  s = E.resolveTurn(s, { player: { type: 'SWITCH', targetPokemonId: 3 }, enemy: act(33) }).state;
  // Troca 2: volta Dipplin
  s = E.resolveTurn(s, { player: { type: 'SWITCH', targetPokemonId: 1011 }, enemy: act(33) }).state;
  // Troca 3: sai Dipplin
  s = E.resolveTurn(s, { player: { type: 'SWITCH', targetPokemonId: 3 }, enemy: act(33) }).state;
  // Troca 4: volta Dipplin
  s = E.resolveTurn(s, { player: { type: 'SWITCH', targetPokemonId: 1011 }, enemy: act(33) }).state;

  // Evasão deve ter sido reduzida apenas 1 vez (não -2 nem -3)
  assert.equal(s.enemy.team[s.enemy.activeIndex].evasionStage, -1);
});

/* ==========================================================================
   CENÁRIOS 7 E 8: NOVA BATALHA E ENTRADA SEM ADVERSÁRIO ELEGÍVEL
   ========================================================================== */

test('Supersweet Syrup: nova batalha inicia com marcador limpo', () => {
  const b1 = battle({ ability: 'supersweet-syrup' }, {});
  assert.equal(b1.player.syrupTriggered, true);

  const b2 = battle({ ability: 'supersweet-syrup' }, {});
  assert.equal(b2.player.syrupTriggered, true);
  assert.equal(b2.enemy.evasionStage, -1);
});

test('Supersweet Syrup: ativação sem adversário elegível marca syrupTriggered sem lançar erro', () => {
  const s = {
    player: mon(1011, [33], { ability: 'supersweet-syrup' }),
    enemy: null
  };
  const events = [];
  assert.doesNotThrow(() => {
    P7.enter(s, 'player', C, events);
  });
  assert.equal(s.player.syrupTriggered, true);
});

/* ==========================================================================
   CENÁRIO 9: IMUNIDADE POR SUBSTITUTE
   ========================================================================== */

test('Supersweet Syrup: adversário com Substitute é imune, mas ativação única é consumida', () => {
  const s = battle(
    { ability: 'supersweet-syrup' },
    { substitute: true, substituteHp: 100 }
  );

  assert.equal(s.enemy.evasionStage, 0, 'Adversário com Substitute deve permanecer em 0 de evasão');
  assert.equal(s.player.syrupTriggered, true, 'syrupTriggered deve ser consumido');
});

/* ==========================================================================
   CENÁRIOS 10 E 11: DOUBLES (DOIS ADVERSÁRIOS, ALIADO PRESERVADO E SUBSTITUTE)
   ========================================================================== */

test('Supersweet Syrup em Doubles: atinge ambos os adversários adjacentes e poupa o aliado', () => {
  const dipplin = mon(1011, [33], { ability: 'supersweet-syrup' });
  const ally = mon(1, [33], {});
  const foe1 = mon(2, [33], {});
  const foe2 = mon(3, [33], {});

  const s = {
    battleFormat: 'DOUBLES',
    player: dipplin,
    enemy: foe1,
    doublesTeams: {
      player: { team: [dipplin, ally], activeIndices: [0, 1] },
      enemy: { team: [foe1, foe2], activeIndices: [0, 1] }
    }
  };
  const events = [];
  P7.enter(s, 'player', C, events);

  assert.equal(foe1.evasionStage, -1, 'Adversário 1 deve perder 1 estágio de evasão');
  assert.equal(foe2.evasionStage, -1, 'Adversário 2 deve perder 1 estágio de evasão');
  assert.equal(ally.evasionStage, 0, 'Aliado não deve ter sua evasão alterada');
  assert.equal(dipplin.evasionStage, 0, 'Portador não deve ter sua evasão alterada');
  assert.equal(dipplin.syrupTriggered, true);
});

test('Supersweet Syrup em Doubles: um adversário com Substitute e outro desprotegido', () => {
  const dipplin = mon(1011, [33], { ability: 'supersweet-syrup' });
  const ally = mon(1, [33], {});
  const foeProtected = mon(2, [33], { substitute: true, substituteHp: 100 });
  const foeOpen = mon(3, [33], {});

  const s = {
    battleFormat: 'DOUBLES',
    player: dipplin,
    enemy: foeProtected,
    doublesTeams: {
      player: { team: [dipplin, ally], activeIndices: [0, 1] },
      enemy: { team: [foeProtected, foeOpen], activeIndices: [0, 1] }
    }
  };
  const events = [];
  P7.enter(s, 'player', C, events);

  assert.equal(foeProtected.evasionStage, 0, 'Alvo com Substitute permanece imune');
  assert.equal(foeOpen.evasionStage, -1, 'Alvo desprotegido sofre redução normalmente');
  assert.ok(events.some(e => e.type === 'ABILITY_IMMUNE' && e.reason === 'SUBSTITUTE'));
});

/* ==========================================================================
   CENÁRIOS 12 E 13: MÚLTIPLOS PORTADORES E LIMITE MÍNIMO DE EVASÃO (-6)
   ========================================================================== */

test('Supersweet Syrup: múltiplos portadores independentes controlam marcadores separadamente', () => {
  const dipplinPlayer = mon(1011, [33], { ability: 'supersweet-syrup' });
  const hydrappleEnemy = mon(1019, [33], { ability: 'supersweet-syrup' });

  const s = E.createBattle(dipplinPlayer, hydrappleEnemy);
  // Ambos entram e reduzem a evasão um do outro para -1
  assert.equal(s.player.evasionStage, -1);
  assert.equal(s.enemy.evasionStage, -1);
  assert.equal(s.player.syrupTriggered, true);
  assert.equal(s.enemy.syrupTriggered, true);
});

test('Supersweet Syrup: evasão não ultrapassa o limite inferior (-6)', () => {
  const s = battle({ ability: 'supersweet-syrup' }, { evasionStage: -6 });
  assert.equal(s.enemy.evasionStage, -6, 'Evasão deve ficar presa no limite inferior de -6');
});

/* ==========================================================================
   CENÁRIOS 14 A 19: PROTEÇÃO E INVERSÃO DE STATUS (Clear Body, Contrary, etc.)
   ========================================================================== */

test('Supersweet Syrup: Clear Body bloqueia a redução de evasão', () => {
  const s = battle({ ability: 'supersweet-syrup' }, { ability: 'clear-body' });
  assert.equal(s.enemy.evasionStage, 0, 'Clear Body previne redução de evasão');
  assert.equal(s.player.syrupTriggered, true);
});

test('Supersweet Syrup: White Smoke bloqueia a redução de evasão', () => {
  const s = battle({ ability: 'supersweet-syrup' }, { ability: 'white-smoke' });
  assert.equal(s.enemy.evasionStage, 0, 'White Smoke previne redução de evasão');
});

test('Supersweet Syrup: Full Metal Body bloqueia a redução de evasão', () => {
  const s = battle({ ability: 'supersweet-syrup' }, { ability: 'full-metal-body' });
  assert.equal(s.enemy.evasionStage, 0, 'Full Metal Body previne redução de evasão');
});

test('Supersweet Syrup: Contrary inverte a redução em aumento de evasão (+1)', () => {
  const s = battle({ ability: 'supersweet-syrup' }, { ability: 'contrary' });
  assert.equal(s.enemy.evasionStage, 1, 'Contrary inverte -1 de evasão para +1');
});

test('Supersweet Syrup: Mirror Armor reflete a redução de evasão de volta para o portador', () => {
  const s = battle({ ability: 'supersweet-syrup' }, { ability: 'mirror-armor' });
  assert.equal(s.enemy.evasionStage, 0, 'Mirror Armor não sofre redução');
  assert.equal(s.player.evasionStage, -1, 'Portador sofre a redução refletida (-1 de evasão)');
});

test('Supersweet Syrup: Defiant ativa (+2 Attack) ao ter a evasão reduzida', () => {
  const s = battle({ ability: 'supersweet-syrup' }, { ability: 'defiant' });
  assert.equal(s.enemy.evasionStage, -1);
  assert.equal(s.enemy.statStages?.attack, 2, 'Defiant concede +2 de Attack');
});

test('Supersweet Syrup: Competitive ativa (+2 Special Attack) ao ter a evasão reduzida', () => {
  const s = battle({ ability: 'supersweet-syrup' }, { ability: 'competitive' });
  assert.equal(s.enemy.evasionStage, -1);
  assert.equal(s.enemy.statStages?.specialAttack, 2, 'Competitive concede +2 de SpA');
});

/* ==========================================================================
   CENÁRIOS 20 A 24: SUPRESSÃO, GAS, SHIELD, TRACE E TRANSFORM
   ========================================================================== */

test('Supersweet Syrup: Neutralizing Gas na entrada suprime a ativação e NÃO consome syrupTriggered', () => {
  const s = battle({ ability: 'supersweet-syrup' }, { ability: 'neutralizing-gas' });
  assert.equal(s.enemy.evasionStage, 0, 'Habilidade suprimida por Neutralizing Gas');
  assert.equal(s.player.syrupTriggered, undefined, 'syrupTriggered NÃO deve ser consumido sob Gas');
});

test('Supersweet Syrup: término de Neutralizing Gas reativa a habilidade canonicamente', () => {
  const koffing = mon(109, [33], { ability: 'neutralizing-gas', speed: 200 });
  const allyFoe = mon(2, [33], { speed: 100 });
  const dipplin = mon(1011, [33], { ability: 'supersweet-syrup', speed: 50 });
  const allyUser = mon(1, [33], { speed: 50 });

  const s = {
    battleFormat: 'DOUBLES',
    player: koffing,
    enemy: dipplin,
    doublesTeams: {
      player: { team: [koffing, allyFoe], activeIndices: [0, 1] },
      enemy: { team: [dipplin, allyUser], activeIndices: [0, 1] }
    }
  };
  P7.sync(s);
  assert.equal(allyFoe.evasionStage, 0);
  assert.equal(dipplin.syrupTriggered, undefined, 'Sob Gas, não ativou');

  // Koffing desmaia e sai do campo -> Neutralizing Gas encerra
  const events = [];
  koffing.currentHp = 0;
  P7.handleFaint(s, 'player', koffing, C, events);

  assert.equal(allyFoe.evasionStage, -1, 'Adversário ativo tem evasão reduzida quando Gas cessa');
  assert.equal(dipplin.syrupTriggered, true, 'syrupTriggered deve ser marcado');
});

test('Supersweet Syrup: Ability Shield protege o portador contra Neutralizing Gas', () => {
  const s = battle({ ability: 'supersweet-syrup', item: 'ability-shield' }, { ability: 'neutralizing-gas' });
  assert.equal(s.enemy.evasionStage, -1, 'Ability Shield permite a ativação de Supersweet Syrup sob Gas');
  assert.equal(s.player.syrupTriggered, true);
});

test('Supersweet Syrup: Trace copia e ativa Supersweet Syrup', () => {
  const s = battle({ ability: 'supersweet-syrup', speed: 50 }, { ability: 'trace', speed: 200 });
  // Oponente com Trace entra, copia Supersweet Syrup e reduz a evasão do jogador
  assert.equal(s.player.evasionStage, -1, 'Jogador tem evasão reduzida pelo Trace');
  assert.equal(s.enemy.evasionStage, -1, 'Inimigo tem evasão reduzida pelo portador original');
});

test('Supersweet Syrup: Transform / Imposter copia e ativa na entrada', () => {
  const ditto = mon(132, [144], { ability: 'imposter' });
  const dipplin = mon(1011, [33], { ability: 'supersweet-syrup' });

  const s = E.createBattle(ditto, dipplin);
  // Ditto transforma e adquire Supersweet Syrup
  assert.equal(s.enemy.evasionStage, -1);
});

/* ==========================================================================
   CENÁRIOS 25 A 28: PRECISÃO, KEEN EYE, BATTLE EVALUATOR E SESSÃO REAL
   ========================================================================== */

test('Integração com precisão: golpe de 75% atinge 100% de efetividade contra alvo em -1 de evasão', () => {
  const attacker = mon(1, [33], {});
  const defender = mon(2, [33], { evasionStage: -1 });

  // Move 75% accuracy (ex: teste com golpe base 75)
  const testMove = { id: 999, name: 'test-inaccurate', accuracy: 75, type: 'normal' };
  const effAcc = C.getEffectiveAccuracy(testMove, attacker, defender);

  // Fórmula Gen IX: 75 * ((3 - (-1)) / 3) = 75 * (4/3) = 100
  assert.equal(effAcc, 100);
});

test('Keen Eye: atacante ignora evasão do defensor conforme especificação canônica do motor', () => {
  const attacker = mon(1, [33], { ability: 'keen-eye' });
  const defender = mon(2, [33], { evasionStage: -1 });

  const testMove = { id: 999, name: 'test-inaccurate', accuracy: 75, type: 'normal' };
  const effAcc = C.getEffectiveAccuracy(testMove, attacker, defender);

  // Conforme H2-A e H2-E, Keen Eye ignora estágios de evasão do defensor (-6 a +6), mantendo precisão base (75)
  assert.equal(effAcc, 75);
});

test('BattleEvaluator (IA): reconhece aumento de acerto e benefício com oponente em -1 evasão', () => {
  const attacker = mon(1, [33], { attack: 100 });
  const defNormal = mon(2, [33], { defense: 100, evasionStage: 0 });
  const defDropped = mon(2, [33], { defense: 100, evasionStage: -1 });

  const testMove = { id: 999, name: 'inaccurate-strike', accuracy: 75, power: 80, type: 'normal', damageClass: 'physical', pp: 10, currentPp: 10 };

  const evNormal = V.evaluateMove(attacker, defNormal, testMove, { terrain: null, weather: null });
  const evDropped = V.evaluateMove(attacker, defDropped, testMove, { terrain: null, weather: null });

  assert.ok(evDropped.expectedDamage > evNormal.expectedDamage, 'IA deve calcular maior dano esperado com menor evasão');
});

test('Sessão Real (BattleSessionController): prepara e executa batalha com Dipplin e Supersweet Syrup', async () => {
  const p = [
    mon(1011, [33], { ability: 'supersweet-syrup', speed: 200 }),
    mon(1, [33], { speed: 100 }),
    mon(2, [33], { speed: 100 })
  ];
  const e = [
    mon(6, [33], { speed: 50 }),
    mon(7, [33], { speed: 50 }),
    mon(8, [33], { speed: 50 })
  ];
  const events = [];

  const session = new BattleSessionController({
    hydrator: { hydrateTeam: async () => p },
    opponentFactory: { createOpponentTeam: async () => e },
    teamStore: { load: () => p.map(n => n.id) },
    ai: { chooseAction: () => ({ action: act(33) }) },
    randomSource: new DeterministicRandomSource({ accuracySequence: [1, 1] }),
    presentationEngine: { play: async es => events.push(...es), playCommands: async () => {} }
  });

  await session.prepareBattle({ playerTeamIds: p.map(n => n.id) });
  await session.startBattle();

  assert.equal(session.battleState.enemy.team[session.battleState.enemy.activeIndex].evasionStage, -1, 'Adversário na sessão deve ter evasão -1');
  assert.equal(session.battleState.player.team[0].syrupTriggered, true);
  assert.equal(session.battleState.player.team[0].ability, 'supersweet-syrup');
});
