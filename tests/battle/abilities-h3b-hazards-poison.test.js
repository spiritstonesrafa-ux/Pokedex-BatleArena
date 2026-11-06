const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller');
const { DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source');
const { BATTLE_UI_STATES } = require('../../assets/js/battle-session/battle-session-constants');

const customMoves = {
  398: { id: 398, name: 'poison-jab', type: 'poison', power: 80, accuracy: 100, priority: 0, damageClass: 'physical', pp: 20, maxPp: 20, currentPp: 20, secondaryEffect: { statusCondition: 'poison', chance: 30 } },
  165: { id: 165, name: 'struggle', type: 'normal', power: 50, accuracy: null, priority: 0, damageClass: 'physical', pp: 1, maxPp: 1, currentPp: 1 }
};

const move = id => customMoves[id] || C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const mon = (id, ids = [33, 107], extra = {}) => ({
  id,
  name: 'test-mon-' + id,
  types: ['normal'],
  hp: 1000,
  maxHp: 1000,
  currentHp: 1000,
  attack: 100,
  defense: 100,
  specialAttack: 100,
  specialDefense: 100,
  speed: 100,
  gender: 'M',
  statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
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

const battle = (a = {}, b = {}, idsA = [33, 107], idsB = [33, 107]) => {
  const s = E.createBattle(
    mon(1, idsA, { speed: 200, ...a }),
    mon(2, idsB, { speed: 50, ...b })
  );
  if (a.abilitySuppressed) s.player.abilitySuppressed = true;
  if (b.abilitySuppressed) s.enemy.abilitySuppressed = true;
  if (a.transformOriginal) s.player.transformOriginal = a.transformOriginal;
  return s;
};

const turn = (s, id = 33, extra = {}, enemy = act(107)) => E.resolveTurn(s, {
  player: act(id, extra),
  enemy
});

// Move IDs:
// 33: Tackle (normal, physical)
// 53: Flamethrower (fire, special)
// 92: Toxic (poison, status)
// 107: Minimize (status)
// 398: Poison Jab (poison, physical, 30% poison secondary)

// -------------------------------------------------------------
// TOXIC DEBRIS
// -------------------------------------------------------------
test('Toxic Debris: golpe físico recebido espalha 1 camada de Toxic Spikes no lado do atacante', () => {
  const s = battle({}, { ability: 'toxic-debris' }, [33, 107]);
  const res = turn(s, 33);
  assert.equal(res.state.p6Sides.player.toxicSpikes, 1);
  assert.ok(res.events.some(e => e.type === 'HAZARD_SET' && e.hazard === 'toxic-spikes' && e.side === 'player'));
});

test('Toxic Debris: segundo golpe físico adiciona 2ª camada de Toxic Spikes', () => {
  const s = battle({}, { ability: 'toxic-debris' }, [33, 107]);
  const res1 = turn(s, 33);
  assert.equal(res1.state.p6Sides.player.toxicSpikes, 1);
  const res2 = turn(res1.state, 33);
  assert.equal(res2.state.p6Sides.player.toxicSpikes, 2);
});

test('Toxic Debris: atinge no máximo 2 camadas de Toxic Spikes', () => {
  const s = battle({}, { ability: 'toxic-debris' }, [33, 107]);
  s.p6Sides = { player: { toxicSpikes: 2 }, enemy: {} };
  const res = turn(s, 33);
  assert.equal(res.state.p6Sides.player.toxicSpikes, 2);
  assert.ok(!res.events.some(e => e.type === 'HAZARD_SET'));
});

test('Toxic Debris: golpe especial NÃO ativa Toxic Debris', () => {
  const s = battle({}, { ability: 'toxic-debris' }, [53, 107]);
  const res = turn(s, 53);
  assert.equal(res.state.p6Sides?.player?.toxicSpikes || 0, 0);
  assert.ok(!res.events.some(e => e.type === 'HAZARD_SET'));
});

test('Toxic Debris: golpe de status NÃO ativa Toxic Debris', () => {
  const s = battle({}, { ability: 'toxic-debris' }, [107, 33]);
  const res = turn(s, 107);
  assert.equal(res.state.p6Sides?.player?.toxicSpikes || 0, 0);
  assert.ok(!res.events.some(e => e.type === 'HAZARD_SET'));
});

test('Toxic Debris: ativa mesmo se o defensor desmaiar com o golpe', () => {
  const s = battle({}, { ability: 'toxic-debris', hp: 10, currentHp: 10 }, [33, 107]);
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.p6Sides.player.toxicSpikes, 1);
});

test('Toxic Debris: Mold Breaker NÃO ignora Toxic Debris (canonical: breakable false)', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'toxic-debris' }, [33, 107]);
  const res = turn(s, 33);
  assert.equal(res.state.p6Sides.player.toxicSpikes, 1);
});

test('Toxic Debris: suprimido por Neutralizing Gas', () => {
  const s = battle({ ability: 'neutralizing-gas' }, { ability: 'toxic-debris' }, [33, 107]);
  s.neutralizingGasActive = true;
  const res = turn(s, 33);
  assert.equal(res.state.p6Sides?.player?.toxicSpikes || 0, 0);
});

test('Toxic Debris: registro declara status FULL e breakable false', () => {
  const meta = Reg.getAbility('toxic-debris');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, false);
});

// -------------------------------------------------------------
// TOXIC CHAIN
// -------------------------------------------------------------
test('Toxic Chain: roll <= 30 em golpe causa Toxic (bad poison) no defensor', () => {
  const s = battle({ ability: 'toxic-chain' }, {}, [33, 107]);
  const res = turn(s, 33, { toxicChainRoll: 30 });
  assert.equal(res.state.enemy.statusCondition, 'toxic');
  assert.ok(res.events.some(e => e.type === 'STATUS_APPLIED' && e.statusCondition === 'toxic' && e.reason === 'toxic-chain'));
});

test('Toxic Chain: roll > 30 NÃO envenena o defensor', () => {
  const s = battle({ ability: 'toxic-chain' }, {}, [33, 107]);
  const res = turn(s, 33, { toxicChainRoll: 31 });
  assert.equal(res.state.enemy.statusCondition, null);
  assert.ok(!res.events.some(e => e.statusCondition === 'toxic'));
});

test('Toxic Chain: ativa com golpes especiais também', () => {
  const s = battle({ ability: 'toxic-chain' }, {}, [53, 107]);
  const res = turn(s, 53, { toxicChainRoll: 10 });
  assert.equal(res.state.enemy.statusCondition, 'toxic');
});

test('Toxic Chain: Pokémon Steel é imune a envenenamento por Toxic Chain', () => {
  const s = battle({ ability: 'toxic-chain' }, { types: ['steel'] }, [33, 107]);
  const res = turn(s, 33, { toxicChainRoll: 1 });
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Toxic Chain: Pokémon Poison é imune a envenenamento por Toxic Chain', () => {
  const s = battle({ ability: 'toxic-chain' }, { types: ['poison'] }, [33, 107]);
  const res = turn(s, 33, { toxicChainRoll: 1 });
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Toxic Chain: Shield Dust no defensor bloqueia o envenenamento de Toxic Chain', () => {
  const s = battle({ ability: 'toxic-chain' }, { ability: 'shield-dust' }, [33, 107]);
  const res = turn(s, 33, { toxicChainRoll: 1 });
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Toxic Chain: Purifying Salt no defensor é imune a envenenamento por Toxic Chain', () => {
  const s = battle({ ability: 'toxic-chain' }, { ability: 'purifying-salt' }, [33, 107]);
  const res = turn(s, 33, { toxicChainRoll: 1 });
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Toxic Chain: Comatose no defensor é imune a Toxic Chain', () => {
  const s = battle({ ability: 'toxic-chain' }, { ability: 'comatose' }, [33, 107]);
  const res = turn(s, 33, { toxicChainRoll: 1 });
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Toxic Chain: registro declara status FULL e breakable false', () => {
  const meta = Reg.getAbility('toxic-chain');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, false);
});

// -------------------------------------------------------------
// POISON PUPPETEER
// -------------------------------------------------------------
test('Poison Puppeteer: duração determinística de 2 turnos encerra no turno 2 (SNAPPED_OUT)', () => {
  const s = battle({ ability: 'poison-puppeteer' }, {}, [92, 33], [107, 33]);
  // Turno 1: Pecharunt usa Toxic com confusionDuration: 2
  const res1 = turn(s, 92, { confusionDuration: 2 });
  assert.equal(res1.state.enemy.statusCondition, 'toxic');
  assert.ok(res1.events.some(e => e.type === 'CONFUSION_APPLIED' && e.reason === 'poison-puppeteer' && e.duration === 2));
  // Ao final do turno 1, defensor tentou mover e decrementou de 2 para 1
  assert.equal(res1.state.enemy.confusionTurns, 1);
  assert.ok(!res1.events.some(e => e.type === 'CONFUSION_ENDED'));

  // Turno 2: Defensor tenta mover, decrementa de 1 para 0 e se recupera (SNAPPED_OUT)
  const res2 = turn(res1.state, 33);
  assert.equal(res2.state.enemy.confusionTurns, 0);
  assert.ok(res2.events.some(e => e.type === 'CONFUSION_ENDED' && e.reason === 'SNAPPED_OUT' && e.target === 'enemy'));
});

test('Poison Puppeteer: duração determinística de 3 turnos encerra no turno 3 (SNAPPED_OUT)', () => {
  const s = battle({ ability: 'poison-puppeteer' }, {}, [92, 33], [107, 33]);
  const res1 = turn(s, 92, { confusionDuration: 3 });
  assert.equal(res1.state.enemy.statusCondition, 'toxic');
  assert.equal(res1.state.enemy.confusionTurns, 2); // 3 -> 2
  assert.ok(!res1.events.some(e => e.type === 'CONFUSION_ENDED'));

  const res2 = turn(res1.state, 33);
  assert.equal(res2.state.enemy.confusionTurns, 1); // 2 -> 1
  assert.ok(!res2.events.some(e => e.type === 'CONFUSION_ENDED'));

  const res3 = turn(res2.state, 33);
  assert.equal(res3.state.enemy.confusionTurns, 0); // 1 -> 0
  assert.ok(res3.events.some(e => e.type === 'CONFUSION_ENDED' && e.reason === 'SNAPPED_OUT' && e.target === 'enemy'));
});

test('Poison Puppeteer: duração determinística de 4 turnos encerra no turno 4 (SNAPPED_OUT)', () => {
  const s = battle({ ability: 'poison-puppeteer' }, {}, [92, 33], [107, 33]);
  const res1 = turn(s, 92, { confusionDuration: 4 });
  assert.equal(res1.state.enemy.confusionTurns, 3);

  const res2 = turn(res1.state, 33);
  assert.equal(res2.state.enemy.confusionTurns, 2);

  const res3 = turn(res2.state, 33);
  assert.equal(res3.state.enemy.confusionTurns, 1);
  assert.ok(!res3.events.some(e => e.type === 'CONFUSION_ENDED'));

  const res4 = turn(res3.state, 33);
  assert.equal(res4.state.enemy.confusionTurns, 0);
  assert.ok(res4.events.some(e => e.type === 'CONFUSION_ENDED' && e.reason === 'SNAPPED_OUT' && e.target === 'enemy'));
});

test('Poison Puppeteer: duração determinística de 5 turnos encerra no turno 5 (SNAPPED_OUT)', () => {
  const s = battle({ ability: 'poison-puppeteer' }, {}, [92, 33], [107, 33]);
  const res1 = turn(s, 92, { confusionDuration: 5 });
  assert.equal(res1.state.enemy.confusionTurns, 4);

  const res2 = turn(res1.state, 33);
  assert.equal(res2.state.enemy.confusionTurns, 3);

  const res3 = turn(res2.state, 33);
  assert.equal(res3.state.enemy.confusionTurns, 2);

  const res4 = turn(res3.state, 33);
  assert.equal(res4.state.enemy.confusionTurns, 1);
  assert.ok(!res4.events.some(e => e.type === 'CONFUSION_ENDED'));

  const res5 = turn(res4.state, 33);
  assert.equal(res5.state.enemy.confusionTurns, 0);
  assert.ok(res5.events.some(e => e.type === 'CONFUSION_ENDED' && e.reason === 'SNAPPED_OUT' && e.target === 'enemy'));
});

test('Poison Puppeteer: validação de limites rejeita durações fora de [2, 5]', () => {
  const s = battle({ ability: 'poison-puppeteer' }, {}, [92, 33], [107, 33]);
  assert.throws(() => turn(s, 92, { confusionDuration: 1 }), /Duração de confusão inválida/);
  assert.throws(() => turn(s, 92, { confusionDuration: 6 }), /Duração de confusão inválida/);
  assert.throws(() => turn(s, 92, { confusionDuration: 0 }), /Duração de confusão inválida/);
  assert.throws(() => turn(s, 92, { confusionDuration: 2.5 }), /Duração de confusão inválida/);
  assert.throws(() => turn(s, 92, { confusionDuration: 'abc' }), /Duração de confusão inválida/);
});

test('Poison Puppeteer: regra de Pecharunt — atacante transformado via Imposter/Transform NÃO ativa Poison Puppeteer', () => {
  const s = battle({ ability: 'poison-puppeteer', transformOriginal: true }, {}, [92, 33], [107, 33]);
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, 'toxic');
  assert.equal(res.state.enemy.confusionTurns || 0, 0);
  assert.ok(!res.events.some(e => e.type === 'CONFUSION_APPLIED'));
});

test('Poison Puppeteer: envenenar via efeito secundário de dano (Poison Jab #398) causa Confusão adicional', () => {
  const s = battle({ ability: 'poison-puppeteer' }, {}, [398, 33], [107, 33]);
  const res = turn(s, 398, { secondaryEffectRoll: 10, confusionDuration: 4 });
  assert.equal(res.state.enemy.statusCondition, 'poison');
  assert.equal(res.state.enemy.confusionTurns, 3); // 4 - 1
  assert.ok(res.events.some(e => e.type === 'CONFUSION_APPLIED' && e.reason === 'poison-puppeteer'));
});

test('Poison Puppeteer: alvo imune a veneno (Steel ou Poison) NÃO recebe Confusão', () => {
  const sSteel = battle({ ability: 'poison-puppeteer' }, { types: ['steel'] }, [92, 33]);
  const resSteel = turn(sSteel, 92);
  assert.equal(resSteel.state.enemy.statusCondition, null);
  assert.equal(resSteel.state.enemy.confusionTurns || 0, 0);
  assert.ok(!resSteel.events.some(e => e.type === 'CONFUSION_APPLIED'));

  const sPoison = battle({ ability: 'poison-puppeteer' }, { types: ['poison'] }, [92, 33]);
  const resPoison = turn(sPoison, 92);
  assert.equal(resPoison.state.enemy.statusCondition, null);
  assert.equal(resPoison.state.enemy.confusionTurns || 0, 0);
  assert.ok(!resPoison.events.some(e => e.type === 'CONFUSION_APPLIED'));
});

test('Poison Puppeteer: alvo com status prévio NÃO é envenenado e NÃO recebe Confusão', () => {
  const s = battle({ ability: 'poison-puppeteer' }, { statusCondition: 'burn' }, [92, 33]);
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, 'burn');
  assert.equal(res.state.enemy.confusionTurns || 0, 0);
  assert.ok(!res.events.some(e => e.type === 'CONFUSION_APPLIED'));
});

test('Poison Puppeteer: dano residual de Toxic Spikes NÃO ativa Poison Puppeteer', () => {
  // Toxic Spikes afeta ao entrar em campo, não via golpe de Pecharunt
  const s = battle({ ability: 'poison-puppeteer' }, {}, [33, 107]);
  s.p6Sides = { enemy: { toxicSpikes: 1 } };
  // Apenas golpe normal sem status
  const res = turn(s, 33);
  assert.equal(res.state.enemy.confusionTurns || 0, 0);
  assert.ok(!res.events.some(e => e.type === 'CONFUSION_APPLIED'));
});

test('Poison Puppeteer: Neutralizing Gas suprime Poison Puppeteer e impede Confusão', () => {
  const s = battle({ ability: 'poison-puppeteer' }, { ability: 'neutralizing-gas' }, [92, 33]);
  s.neutralizingGasActive = true;
  s.player.neutralizingGasSuppressed = true;
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, 'toxic');
  assert.equal(res.state.enemy.confusionTurns || 0, 0);
  assert.ok(!res.events.some(e => e.type === 'CONFUSION_APPLIED'));
});

test('Poison Puppeteer: Misty Terrain no solo previne Confusão para Pokémon grounded', () => {
  const s = battle({ ability: 'poison-puppeteer' }, {}, [92, 33]);
  s.terrain = { id: 'misty', duration: 5 };
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, null); // Misty blocks status for grounded
  assert.equal(res.state.enemy.confusionTurns || 0, 0);
  assert.ok(!res.events.some(e => e.type === 'CONFUSION_APPLIED'));
});

test('Poison Puppeteer: Own Tempo no defensor bloqueia a Confusão de Poison Puppeteer', () => {
  const s = battle({ ability: 'poison-puppeteer' }, { ability: 'own-tempo' }, [92, 107]);
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, 'toxic');
  assert.equal(res.state.enemy.confusionTurns || 0, 0);
  assert.ok(!res.events.some(e => e.type === 'CONFUSION_APPLIED'));
});

test('Poison Puppeteer: Safeguard no defensor bloqueia envenenamento e confusão', () => {
  const s = battle({ ability: 'poison-puppeteer' }, { safeguarded: true }, [92, 107]);
  s.p6Sides = { player: {}, enemy: { safeguard: 3 } };
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, null);
  assert.equal(res.state.enemy.confusionTurns || 0, 0);
});

test('Poison Puppeteer: alvo já confuso NÃO reinicia confusão de forma redundante', () => {
  const s = battle({ ability: 'poison-puppeteer' }, { confusionTurns: 2 }, [92, 107]);
  const res = turn(s, 92);
  assert.equal(res.state.enemy.statusCondition, 'toxic');
  assert.equal(res.state.enemy.confusionTurns, 2); // mantido
});

test('Poison Puppeteer: canonicamente unoverwritable e unswappable', () => {
  assert.ok(C.P7.unoverwritableAbilities.includes('poison-puppeteer'));
  assert.ok(C.P7.unswappableAbilities.includes('poison-puppeteer'));
});

test('Poison Puppeteer: registro declara status FULL e breakable false', () => {
  const meta = Reg.getAbility('poison-puppeteer');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, false);
});

/* ==========================================================================
   INTEGRAÇÃO REAL BATTLE SESSION CONTROLLER — POISON PUPPETEER (CENÁRIOS A-D)
   ========================================================================== */

class TrackingRng extends DeterministicRandomSource {
  constructor(opts = {}) {
    super(opts);
    this.confusionDurationCalls = 0;
  }
  rollConfusionDuration() {
    this.confusionDurationCalls++;
    return super.rollConfusionDuration();
  }
}

const sessionMon = (id, ids = [33, 107], extra = {}) => ({
  id,
  name: 'mon-' + id,
  types: ['normal'],
  hp: 1000,
  maxHp: 1000,
  currentHp: 1000,
  attack: 100,
  defense: 100,
  specialAttack: 100,
  specialDefense: 100,
  speed: 100,
  statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
  moves: ids.map(mid => {
    const m = move(mid);
    return { ...m, currentPp: m.pp || 35, maxPp: m.pp || 35 };
  }),
  ...extra
});

// CENÁRIO A: Pecharunt usa Toxic com durações determinísticas de 2 a 5 turnos
for (const duration of [2, 3, 4, 5]) {
  test(`Sessão Real: Pecharunt usa Toxic com duração determinística ${duration} turnos encerra no momento exato (SNAPPED_OUT)`, async () => {
    const rng = new TrackingRng();
    rng.setConfusionDurationSequence([duration]);
    rng.setAccuracySequence([1, 1, 1, 1, 1, 1, 1, 1]);
    rng.setDamageSequence([100, 100, 100, 100, 100, 100]);

    const events = [];
    const controller = new BattleSessionController({
      randomSource: rng,
      view: { displayMessage: () => {}, updateCombatant: () => {}, renderActionButtons: () => {} },
      presentationEngine: { play: async evts => { events.push(...evts); }, playCommands: async () => {} }
    });

    const pecharunt = sessionMon(1025, [92, 33], { name: 'pecharunt', types: ['poison', 'ghost'], speed: 200, ability: 'poison-puppeteer' });
    const foe = sessionMon(1, [33], { speed: 50 });

    controller.battleState = E.createTeamBattle([pecharunt, sessionMon(2), sessionMon(3)], [foe, sessionMon(4), sessionMon(5)]);
    controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

    // Turno 1: Pecharunt usa Toxic (#92)
    await controller.submitPlayerMove(92);
    assert.equal(rng.confusionDurationCalls, 1, 'rollConfusionDuration deve ser invocado exatamente 1 vez');
    const foeAfterT1 = controller.engine.getActiveCombatant(controller.battleState, 'enemy');
    assert.equal(foeAfterT1.statusCondition, 'toxic', 'Inimigo deve ser envenenado');
    assert.ok(events.some(e => e.type === 'CONFUSION_APPLIED' && e.reason === 'poison-puppeteer' && e.duration === duration), 'Evento CONFUSION_APPLIED com duração correta');
    // Inimigo agiu no turno 1 após o Toxic e decrementou de duration para duration - 1
    assert.equal(foeAfterT1.confusionTurns, duration - 1, `Ao fim do turno 1, deve restar ${duration - 1} turnos de confusão`);

    // Turnos subsequentes até encerramento
    for (let t = 2; t <= duration; t++) {
      events.length = 0;
      await controller.submitPlayerMove(33);
      const foeCurrent = controller.engine.getActiveCombatant(controller.battleState, 'enemy');
      if (t < duration) {
        assert.equal(foeCurrent.confusionTurns, duration - t, `No turno ${t}, restam ${duration - t} turnos de confusão`);
        assert.ok(!events.some(e => e.type === 'CONFUSION_ENDED'), `Não deve encerrar confusão antes do turno ${duration}`);
      } else {
        // Exato turno de término
        assert.equal(foeCurrent.confusionTurns, 0, 'No turno final, confusão deve zerar');
        assert.ok(events.some(e => e.type === 'CONFUSION_ENDED' && e.reason === 'SNAPPED_OUT' && e.target === 'enemy'), 'CONFUSION_ENDED SNAPPED_OUT emitido no turno correto');
      }
    }
  });
}

// CENÁRIO B: Envenenamento secundário com durações 2 a 5 turnos
for (const duration of [2, 3, 4, 5]) {
  test(`Sessão Real: Pecharunt ativa Poison Puppeteer via efeito secundário de Poison Jab com duração ${duration}`, async () => {
    const rng = new TrackingRng();
    rng.setConfusionDurationSequence([duration]);
    rng.setSecondaryEffectSequence([10]); // roll 10 <= 30 ativa veneno secundário
    rng.setAccuracySequence([1, 1]);
    rng.setDamageSequence([100, 100]);

    const events = [];
    const controller = new BattleSessionController({
      randomSource: rng,
      view: { displayMessage: () => {}, updateCombatant: () => {} },
      presentationEngine: { play: async evts => { events.push(...evts); }, playCommands: async () => {} }
    });

    const pecharunt = sessionMon(1025, [398, 33], { name: 'pecharunt', types: ['poison', 'ghost'], speed: 200, ability: 'poison-puppeteer' });
    const foe = sessionMon(1, [33], { speed: 50 });

    controller.battleState = E.createTeamBattle([pecharunt, sessionMon(2), sessionMon(3)], [foe, sessionMon(4), sessionMon(5)]);
    controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

    await controller.submitPlayerMove(398);
    assert.equal(rng.confusionDurationCalls, 1, 'rollConfusionDuration deve ser invocado em golpe de dano com veneno secundário');
    const foeActive = controller.engine.getActiveCombatant(controller.battleState, 'enemy');
    assert.equal(foeActive.statusCondition, 'poison');
    assert.ok(events.some(e => e.type === 'CONFUSION_APPLIED' && e.reason === 'poison-puppeteer' && e.duration === duration));
    assert.equal(foeActive.confusionTurns, duration - 1);
  });
}

// CENÁRIO C: Casos de Não-Ativação (Nenhum RNG de confusão consumido indevidamente no estado)
test('Sessão Real: Pecharunt erra Toxic (Miss) — nenhum efeito ou confusão aplicado', async () => {
  const rng = new TrackingRng();
  rng.setConfusionDurationSequence([4]);
  rng.setAccuracySequence([100, 1]); // 100 > 90 acurácia de Toxic = MISS

  const events = [];
  const controller = new BattleSessionController({
    randomSource: rng,
    view: { displayMessage: () => {}, updateCombatant: () => {} },
    presentationEngine: { play: async evts => { events.push(...evts); } }
  });

  const pecharunt = sessionMon(1025, [92], { speed: 200, ability: 'poison-puppeteer' });
  const foe = sessionMon(1, [33], { speed: 50 });
  controller.battleState = E.createTeamBattle([pecharunt, sessionMon(2), sessionMon(3)], [foe, sessionMon(4), sessionMon(5)]);
  controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

  await controller.submitPlayerMove(92);
  const foeActive = controller.engine.getActiveCombatant(controller.battleState, 'enemy');
  assert.equal(foeActive.statusCondition, null, 'StatusCondition deve permanecer null');
  assert.equal(foeActive.confusionTurns, 0, 'confusionTurns deve permanecer 0');
  assert.ok(!events.some(e => e.type === 'CONFUSION_APPLIED'));
});

test('Sessão Real: Alvo do tipo Steel é imune a Poison — confusão não aplicada', async () => {
  const rng = new TrackingRng();
  rng.setConfusionDurationSequence([3]);
  rng.setAccuracySequence([1, 1]);

  const controller = new BattleSessionController({
    randomSource: rng,
    view: { displayMessage: () => {}, updateCombatant: () => {} },
    presentationEngine: { play: async () => {} }
  });

  const pecharunt = sessionMon(1025, [92], { speed: 200, ability: 'poison-puppeteer' });
  const foe = sessionMon(1, [33], { types: ['steel'], speed: 50 });
  controller.battleState = E.createTeamBattle([pecharunt, sessionMon(2), sessionMon(3)], [foe, sessionMon(4), sessionMon(5)]);
  controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

  await controller.submitPlayerMove(92);
  const foeActive = controller.engine.getActiveCombatant(controller.battleState, 'enemy');
  assert.equal(foeActive.statusCondition, null);
  assert.equal(foeActive.confusionTurns, 0);
});

test('Sessão Real: Alvo com status prévio (Burn) não é intoxicado — confusão não aplicada', async () => {
  const rng = new TrackingRng();
  rng.setConfusionDurationSequence([3]);
  rng.setAccuracySequence([1, 1]);

  const controller = new BattleSessionController({
    randomSource: rng,
    view: { displayMessage: () => {}, updateCombatant: () => {} },
    presentationEngine: { play: async () => {} }
  });

  const pecharunt = sessionMon(1025, [92], { speed: 200, ability: 'poison-puppeteer' });
  const foe = sessionMon(1, [33], { statusCondition: 'burn', speed: 50 });
  controller.battleState = E.createTeamBattle([pecharunt, sessionMon(2), sessionMon(3)], [foe, sessionMon(4), sessionMon(5)]);
  controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

  await controller.submitPlayerMove(92);
  const foeActive = controller.engine.getActiveCombatant(controller.battleState, 'enemy');
  assert.equal(foeActive.statusCondition, 'burn');
  assert.equal(foeActive.confusionTurns, 0);
});

test('Sessão Real: Alvo protegido por Safeguard — confusão não aplicada', async () => {
  const rng = new TrackingRng();
  rng.setConfusionDurationSequence([3]);
  rng.setAccuracySequence([1, 1]);

  const controller = new BattleSessionController({
    randomSource: rng,
    view: { displayMessage: () => {}, updateCombatant: () => {} },
    presentationEngine: { play: async () => {} }
  });

  const pecharunt = sessionMon(1025, [92], { speed: 200, ability: 'poison-puppeteer' });
  const foe = sessionMon(1, [33], { safeguarded: true, speed: 50 });
  controller.battleState = E.createTeamBattle([pecharunt, sessionMon(2), sessionMon(3)], [foe, sessionMon(4), sessionMon(5)]);
  controller.battleState.p6Sides = { player: {}, enemy: { safeguard: 3 } };
  controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

  await controller.submitPlayerMove(92);
  const foeActive = controller.engine.getActiveCombatant(controller.battleState, 'enemy');
  assert.equal(foeActive.statusCondition, null);
  assert.equal(foeActive.confusionTurns, 0);
});

test('Sessão Real: Pecharunt transformado via Transform/Imposter não ativa Poison Puppeteer', async () => {
  const rng = new TrackingRng();
  rng.setAccuracySequence([1, 1]);

  const controller = new BattleSessionController({
    randomSource: rng,
    view: { displayMessage: () => {}, updateCombatant: () => {} },
    presentationEngine: { play: async () => {} }
  });

  const pecharunt = sessionMon(1025, [92], { speed: 200, ability: 'poison-puppeteer' });
  const foe = sessionMon(1, [33], { speed: 50 });
  controller.battleState = E.createTeamBattle([pecharunt, sessionMon(2), sessionMon(3)], [foe, sessionMon(4), sessionMon(5)]);
  controller.battleState.player.team[0].transformOriginal = { species: 132 };
  controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

  await controller.submitPlayerMove(92);
  const foeActive = controller.engine.getActiveCombatant(controller.battleState, 'enemy');
  assert.equal(foeActive.statusCondition, 'toxic', 'Toxic atinge');
  assert.equal(foeActive.confusionTurns, 0, 'Confusão NÃO deve ser aplicada para Pecharunt transformado');
});

test('Sessão Real: Alvo já confuso não reinicia contagem de confusão', async () => {
  const rng = new TrackingRng();
  rng.setConfusionDurationSequence([5]);
  rng.setAccuracySequence([1, 1]);

  const controller = new BattleSessionController({
    randomSource: rng,
    view: { displayMessage: () => {}, updateCombatant: () => {} },
    presentationEngine: { play: async () => {} }
  });

  const pecharunt = sessionMon(1025, [92], { speed: 200, ability: 'poison-puppeteer' });
  const foe = sessionMon(1, [33], { speed: 50 });
  controller.battleState = E.createTeamBattle([pecharunt, sessionMon(2), sessionMon(3)], [foe, sessionMon(4), sessionMon(5)]);
  controller.battleState.enemy.team[0].confusionTurns = 2;
  controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

  await controller.submitPlayerMove(92);
  const foeActive = controller.engine.getActiveCombatant(controller.battleState, 'enemy');
  assert.equal(foeActive.statusCondition, 'toxic');
  // Já estava confuso com 2 turnos; agiu no turno 1 e decrementou para 1 (não reiniciou para 5)
  assert.equal(foeActive.confusionTurns, 1);
});

test('Sessão Real: Neutralizing Gas suprime Poison Puppeteer — nenhum efeito de confusão', async () => {
  const rng = new TrackingRng();
  rng.setConfusionDurationSequence([4]);
  rng.setAccuracySequence([1, 1]);

  const controller = new BattleSessionController({
    randomSource: rng,
    view: { displayMessage: () => {}, updateCombatant: () => {} },
    presentationEngine: { play: async () => {} }
  });

  const pecharunt = sessionMon(1025, [92], { speed: 200, ability: 'poison-puppeteer', neutralizingGasSuppressed: true });
  const foe = sessionMon(1, [33], { ability: 'neutralizing-gas', speed: 50 });
  controller.battleState = E.createTeamBattle([pecharunt, sessionMon(2), sessionMon(3)], [foe, sessionMon(4), sessionMon(5)]);
  controller.battleState.neutralizingGasActive = true;
  controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

  await controller.submitPlayerMove(92);
  const foeActive = controller.engine.getActiveCombatant(controller.battleState, 'enemy');
  assert.equal(foeActive.statusCondition, 'toxic');
  assert.equal(foeActive.confusionTurns, 0);
});

// CENÁRIO D: Formatos e Simetria de Atores
test('Sessão Real: Adversário (IA) usando Pecharunt confunde jogador com duração sorteada', async () => {
  const rng = new TrackingRng();
  rng.setConfusionDurationSequence([4]);
  rng.setAccuracySequence([1, 1]);
  rng.setDamageSequence([100, 100]);

  const events = [];
  const controller = new BattleSessionController({
    randomSource: rng,
    ai: { chooseAction: () => ({ action: { type: 'MOVE', moveId: 92 } }) },
    view: { displayMessage: () => {}, updateCombatant: () => {} },
    presentationEngine: { play: async evts => { events.push(...evts); } }
  });

  const playerMon = sessionMon(1, [33], { speed: 50 });
  const enemyPecharunt = sessionMon(1025, [92], { name: 'pecharunt', types: ['poison', 'ghost'], speed: 200, ability: 'poison-puppeteer' });

  controller.battleState = E.createTeamBattle([playerMon, sessionMon(2), sessionMon(3)], [enemyPecharunt, sessionMon(4), sessionMon(5)]);
  controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

  await controller.submitPlayerMove(33);
  assert.equal(rng.confusionDurationCalls, 1, 'Invocou rollConfusionDuration para ação inimiga');
  const playerActive = controller.engine.getActiveCombatant(controller.battleState, 'player');
  assert.equal(playerActive.statusCondition, 'toxic');
  assert.ok(events.some(e => e.type === 'CONFUSION_APPLIED' && e.reason === 'poison-puppeteer' && e.duration === 4 && e.target === 'player'));
  assert.equal(playerActive.confusionTurns, 3); // 4 - 1 no turno 1
});

test('Sessão Real: Troca voluntária (SWITCH) do jogador enquanto adversário Pecharunt usa Toxic — entrante confuso', async () => {
  const rng = new TrackingRng();
  rng.setConfusionDurationSequence([3]);
  rng.setAccuracySequence([1, 1]);

  const events = [];
  const controller = new BattleSessionController({
    randomSource: rng,
    ai: { chooseAction: () => ({ action: { type: 'MOVE', moveId: 92 } }) },
    view: { displayMessage: () => {}, updateCombatant: () => {} },
    presentationEngine: { play: async evts => { events.push(...evts); } }
  });

  const leadPlayer = sessionMon(1, [33]);
  const benchPlayer = sessionMon(2, [33]);
  const enemyPecharunt = sessionMon(1025, [92], { name: 'pecharunt', types: ['poison', 'ghost'], speed: 200, ability: 'poison-puppeteer' });

  controller.battleState = E.createTeamBattle([leadPlayer, benchPlayer, sessionMon(3)], [enemyPecharunt, sessionMon(4), sessionMon(5)]);
  controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

  await controller.submitPlayerSwitch(2);
  assert.equal(rng.confusionDurationCalls, 1, 'Troca do jogador prepara duração de confusão para Toxic inimigo');
  const playerActive = controller.engine.getActiveCombatant(controller.battleState, 'player');
  assert.equal(playerActive.id, 2);
  assert.equal(playerActive.statusCondition, 'toxic');
  assert.equal(playerActive.confusionTurns, 3); // entrou via switch, não agiu com golpe, contagem permanece 3
  assert.ok(events.some(e => e.type === 'CONFUSION_APPLIED' && e.reason === 'poison-puppeteer' && e.target === 'player'));
});

test('Sessão Real: Batalha em Duplas (Doubles) — Pecharunt aplica Toxic e Confusão no alvo correto', async () => {
  const rng = new TrackingRng();
  rng.setConfusionDurationSequence([4, 4]);
  rng.setAccuracySequence([1, 1, 1, 1]);

  const events = [];
  const controller = new BattleSessionController({
    randomSource: rng,
    view: { displayMessage: () => {}, updateCombatant: () => {} },
    presentationEngine: { play: async evts => { events.push(...evts); } }
  });

  const p1 = sessionMon(1025, [92, 33], { name: 'pecharunt', types: ['poison', 'ghost'], speed: 200, ability: 'poison-puppeteer' });
  const p2 = sessionMon(2, [33], { speed: 100 });
  const e1 = sessionMon(3, [33], { speed: 50 });
  const e2 = sessionMon(4, [33], { speed: 50 });

  controller.battleState = E.createDoublesBattle([p1, p2, sessionMon(5)], [e1, e2, sessionMon(6)]);
  controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

  // Em duplas, jogador comanda Pecharunt a usar Toxic no slot 0 do inimigo
  const playerCommands = {
    0: { type: 'MOVE', moveId: 92, targetSlot: 0, targetRole: 'enemy' },
    1: { type: 'MOVE', moveId: 33, targetSlot: 1, targetRole: 'enemy' }
  };

  await controller.submitDoublesTurn(playerCommands);
  const targetFoe = controller.battleState.enemy.team[controller.battleState.enemy.activeIndices[0]];
  assert.equal(targetFoe.statusCondition, 'toxic', 'Alvo em duplas deve receber Toxic');
  assert.ok(events.some(e => e.type === 'CONFUSION_APPLIED' && e.reason === 'poison-puppeteer' && e.duration === 4), 'Alvo em duplas recebe confusão de 4 turnos');
});

test('Sessão Real: IA analítica (BattleAI) é pura e não consome rollConfusionDuration', () => {
  const rng = new TrackingRng();
  const AI = require('../../assets/js/battle/battle-ai');
  const p = sessionMon(1025, [92, 33], { ability: 'poison-puppeteer' });
  const e = sessionMon(1, [33]);
  const state = E.createTeamBattle([p, sessionMon(2), sessionMon(3)], [e, sessionMon(4), sessionMon(5)]);

  AI.chooseAction(state, 'player');
  AI.chooseAction(state, 'enemy');
  assert.equal(rng.confusionDurationCalls, 0, 'A IA analítica não deve chamar rollConfusionDuration durante a avaliação');
});
