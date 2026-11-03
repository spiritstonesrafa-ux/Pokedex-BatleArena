const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const AI = require('../../assets/js/battle/battle-ai');
const V = require('../../assets/js/battle/battle-evaluator');
const Reg = require('../../assets/js/battle/ability-registry');
const Flags = require('../../assets/js/battle/move-flags');
const UI = require('../../assets/js/ui/battle-ui-adapter');
const P = C.P7;

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);
const mon = (id, ids = [33], extra = {}) => ({
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
const battle = (a = {}, b = {}, idsA = [33], idsB = [33]) => E.createBattle(
  mon(1, idsA, { speed: 200, ...a }),
  mon(2, idsB, { speed: 50, ...b })
);
const turn = (s, id = 33, extra = {}, enemy = act(33)) => E.resolveTurn(s, {
  player: act(id, extra),
  enemy
});

/* ==========================================================================
   H2-A.1: Marvel Scale
   ========================================================================== */

test('Marvel Scale: aumenta Defense efetiva em 1.5x sob Burn no cálculo de dano físico', () => {
  const sHealthy = battle({}, { ability: 'marvel-scale' });
  const rHealthy = turn(sHealthy, 33, { damageRoll: 100, criticalRoll: 24 });
  const dmgHealthy = rHealthy.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;

  const sBurned = battle({}, { ability: 'marvel-scale', statusCondition: 'burn' });
  const rBurned = turn(sBurned, 33, { damageRoll: 100, criticalRoll: 24 });
  const dmgBurned = rBurned.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;

  assert.ok(dmgBurned < dmgHealthy, `Dano sob Marvel Scale (${dmgBurned}) deve ser menor que sem status (${dmgHealthy})`);
  assert.equal(C.getEffectiveStat(rBurned.state.enemy, 'defense'), 150);
});

test('Marvel Scale: ativa com todos os 6 status principais (Burn, Poison, Toxic, Paralysis, Sleep, Freeze)', () => {
  for (const st of ['burn', 'poison', 'toxic', 'paralysis', 'sleep', 'freeze']) {
    const combatant = mon(350, [33], { ability: 'marvel-scale', statusCondition: st, defense: 100 });
    const def = C.getEffectiveStat(combatant, 'defense');
    assert.equal(def, 150, `Marvel Scale deve conceder 150 Def com status ${st}`);
  }
});

test('Marvel Scale: NÃO ativa sem condição de status principal', () => {
  const combatant = mon(350, [33], { ability: 'marvel-scale', defense: 100 });
  assert.equal(C.getEffectiveStat(combatant, 'defense'), 100);
});

test('Marvel Scale: NÃO ativa apenas com confusão (status volátil)', () => {
  const combatant = mon(350, [33], { ability: 'marvel-scale', confusionTurns: 3, defense: 100 });
  assert.equal(C.getEffectiveStat(combatant, 'defense'), 100);
});

test('Marvel Scale: NÃO altera Special Defense sob status', () => {
  const combatant = mon(350, [33], { ability: 'marvel-scale', statusCondition: 'burn', specialDefense: 100 });
  assert.equal(C.getEffectiveStat(combatant, 'specialDefense'), 100);

  // Swift (id 129, special 60 power) deve causar o mesmo dano
  const sHealthy = battle({}, { ability: 'marvel-scale' }, [129], [33]);
  const rHealthy = turn(sHealthy, 129, { damageRoll: 100 });
  const dmgHealthy = rHealthy.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;

  const sBurned = battle({}, { ability: 'marvel-scale', statusCondition: 'burn' }, [129], [33]);
  const rBurned = turn(sBurned, 129, { damageRoll: 100 });
  const dmgBurned = rBurned.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;

  assert.equal(dmgBurned, dmgHealthy, 'Dano especial não deve ser reduzido por Marvel Scale');
});

test('Marvel Scale: golpe crítico preserva o multiplicador de 1.5x na Defense', () => {
  const combatant = mon(350, [33], { ability: 'marvel-scale', statusCondition: 'paralysis', defense: 100 });
  const critStats = C.Critical.stats(mon(1), combatant, move(33), C);
  assert.equal(critStats.defense, 150, 'Crítico deve manter o multiplicador de Marvel Scale');
});

test('Marvel Scale: NÃO ativa quando suprimida (abilitySuppressed = true)', () => {
  const combatant = mon(350, [33], { ability: 'marvel-scale', statusCondition: 'burn', abilitySuppressed: true, defense: 100 });
  assert.equal(C.getEffectiveStat(combatant, 'defense'), 100);
});

test('Marvel Scale: Mold Breaker ignora Marvel Scale no defensor', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'marvel-scale', statusCondition: 'burn' });
  const rMold = turn(s, 33, { damageRoll: 100, criticalRoll: 24 });
  const dmgMold = rMold.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;

  const sNorm = battle({ ability: 'blaze' }, { ability: 'marvel-scale', statusCondition: 'burn' });
  const rNorm = turn(sNorm, 33, { damageRoll: 100, criticalRoll: 24 });
  const dmgNorm = rNorm.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;

  assert.ok(dmgMold > dmgNorm, `Mold Breaker (${dmgMold}) deve causar mais dano que atacante comum (${dmgNorm})`);
});

test('Marvel Scale: Ability Shield protege Marvel Scale contra Mold Breaker', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'marvel-scale', statusCondition: 'burn', item: 'ability-shield' });
  const rShield = turn(s, 33, { damageRoll: 100, criticalRoll: 24 });
  const dmgShield = rShield.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;

  const sNorm = battle({ ability: 'blaze' }, { ability: 'marvel-scale', statusCondition: 'burn' });
  const rNorm = turn(sNorm, 33, { damageRoll: 100, criticalRoll: 24 });
  const dmgNorm = rNorm.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;

  assert.equal(dmgShield, dmgNorm, 'Ability Shield deve proteger Marvel Scale do Mold Breaker');
});

test('Marvel Scale: comportamento simétrico para jogador e adversário', () => {
  const pMon = mon(350, [33], { ability: 'marvel-scale', statusCondition: 'burn', defense: 100 });
  const eMon = mon(350, [33], { ability: 'marvel-scale', statusCondition: 'poison', defense: 100 });
  assert.equal(C.getEffectiveStat(pMon, 'defense'), 150);
  assert.equal(C.getEffectiveStat(eMon, 'defense'), 150);
});

test('Marvel Scale: BattleEvaluator (IA) calcula dano considerando 1.5x de Defense', () => {
  const attacker = mon(1, [33], { attack: 100 });
  const defenderBurned = mon(350, [33], { ability: 'marvel-scale', statusCondition: 'burn', defense: 100 });
  const defenderHealthy = mon(350, [33], { ability: 'marvel-scale', defense: 100 });

  const evalBurned = V.evaluateMove(attacker, defenderBurned, move(33), {});
  const evalHealthy = V.evaluateMove(attacker, defenderHealthy, move(33), {});

  assert.ok(evalBurned.expectedDamage < evalHealthy.expectedDamage, 'IA deve prever menor dano contra alvo com Marvel Scale ativo');
});

/* ==========================================================================
   H2-A.2: Hustle
   ========================================================================== */

test('Hustle: multiplica Attack efetivo por 1.5x', () => {
  const combatant = mon(468, [33], { ability: 'hustle', attack: 100 });
  assert.equal(C.getEffectiveStat(combatant, 'attack'), 150);
});

test('Hustle: NÃO multiplica Special Attack', () => {
  const combatant = mon(468, [33], { ability: 'hustle', specialAttack: 100 });
  assert.equal(C.getEffectiveStat(combatant, 'specialAttack'), 100);
});

test('Hustle: reduz precisão de movimentos físicos em 0.8x (80% da base)', () => {
  const attacker = mon(468, [33], { ability: 'hustle' });
  const defender = mon(2, [33]);

  // Tackle (id 33, base accuracy 100, physical)
  const tackleAcc = C.getEffectiveAccuracy(move(33), attacker, defender);
  assert.equal(tackleAcc, 80, 'Tackle (100 acc) deve ter 80 acc com Hustle');

  // Sky Attack (id 143, base accuracy 90, physical): floor(90 * 3277 / 4096) = 72 (Gen 9 Showdown & 0.8x idênticos para base 1..100)
  const skyAcc = C.getEffectiveAccuracy(move(143), attacker, defender);
  assert.equal(skyAcc, 72, 'Sky Attack (90 acc) deve ter 72 acc com Hustle (3277/4096)');
});

test('Hustle: NÃO penaliza precisão de movimentos especiais', () => {
  const attacker = mon(468, [87], { ability: 'hustle' });
  const defender = mon(2, [33]);

  // Thunder (id 87, base accuracy 70, special)
  const thunderAcc = C.getEffectiveAccuracy(move(87), attacker, defender);
  assert.equal(thunderAcc, 70, 'Thunder (special) não deve ter precisão reduzida por Hustle');
});

test('Hustle: NÃO penaliza movimentos de status', () => {
  const attacker = mon(468, [92], { ability: 'hustle' });
  const defender = mon(2, [33]);

  // Toxic (id 92, base accuracy 90, status)
  const toxicAcc = C.getEffectiveAccuracy(move(92), attacker, defender);
  assert.equal(toxicAcc, 90, 'Toxic (status) não deve ter precisão reduzida por Hustle');
});

test('Hustle: NÃO penaliza golpes OHKO (Fissure, etc.)', () => {
  const attacker = mon(468, [90], { ability: 'hustle', level: 50 });
  const defender = mon(2, [33], { level: 50 });

  // Fissure (id 90, OHKO move)
  const fissureAcc = C.getEffectiveAccuracy(move(90), attacker, defender);
  assert.equal(fissureAcc, 30, 'OHKO move deve usar cálculo próprio sem penalidade de Hustle');
});

test('Hustle: movimentos que nunca erram (Aerial Ace) continuam com acerto garantido', () => {
  const attacker = mon(468, [332], { ability: 'hustle' });
  const defender = mon(2, [33]);

  // Aerial Ace (id 332, accuracy null / always hit, physical)
  const aceAcc = C.getEffectiveAccuracy(move(332), attacker, defender);
  assert.equal(aceAcc, null, 'Golpe de acerto garantido deve retornar null (ignora verificação)');
});

test('Hustle: NÃO ativa quando suprimida (abilitySuppressed = true)', () => {
  const combatant = mon(468, [33], { ability: 'hustle', abilitySuppressed: true, attack: 100 });
  assert.equal(C.getEffectiveStat(combatant, 'attack'), 100);

  const acc = C.getEffectiveAccuracy(move(33), combatant, mon(2));
  assert.equal(acc, 100, 'Precisão deve ser normal (100) quando Hustle está suprimida');
});

test('Hustle: não altera atributos permanentemente', () => {
  const combatant = mon(468, [33], { ability: 'hustle', attack: 100 });
  C.getEffectiveStat(combatant, 'attack');
  assert.equal(combatant.attack, 100, 'Atributo base deve permanecer intacto');
});

test('Hustle: BattleEvaluator (IA) calcula dano e precisão com valores exatos de Hustle', () => {
  const attackerHustle = mon(468, [33], { ability: 'hustle', attack: 100 });
  const attackerNorm = mon(468, [33], { ability: 'serene-grace', attack: 100 });
  const defender = mon(2, [33], { defense: 100 });

  const evalHustle = V.evaluateMove(attackerHustle, defender, move(33), {});
  const evalNorm = V.evaluateMove(attackerNorm, defender, move(33), {});

  assert.equal(evalHustle.accuracy, 80, 'IA deve reportar 80 de precisão para Tackle com Hustle');
  assert.ok(evalHustle.damageIfHit > evalNorm.damageIfHit, 'Dano no acerto deve ser maior com Hustle');
});

/* ==========================================================================
   H2-A.3: Keen Eye
   ========================================================================== */

test('Keen Eye: bloqueia redução de precisão provocada por adversário', () => {
  const defender = mon(279, [33], { ability: 'keen-eye', p7KeenEyeAccuracyBlock: true });
  const report = C.applyStatStageChange(defender, 'accuracy', -1);
  assert.equal(report.appliedDelta, 0);
  assert.equal(report.blockedReason, 'ABILITY');
  assert.equal(defender.accuracyStage || 0, 0, 'Estágio de precisão não deve ser reduzido');
});

test('Keen Eye: ignora estágios de evasão positiva do alvo ao calcular acerto', () => {
  const attacker = mon(279, [33], { ability: 'keen-eye' });
  const defenderBoosted = mon(2, [33], { evasionStage: 2 });
  const defenderNeutral = mon(2, [33], { evasionStage: 0 });

  const accKeen = C.getEffectiveAccuracy(move(33), attacker, defenderBoosted);
  const accNeutral = C.getEffectiveAccuracy(move(33), attacker, defenderNeutral);

  assert.equal(accKeen, 100, 'Keen Eye deve ignorar os estágios de evasão do defensor');
  assert.equal(accKeen, accNeutral);
});

test('Keen Eye: ignora incondicionalmente estágios de evasão do alvo (-6, -1, 0, +1, +6)', () => {
  const attacker = mon(279, [87], { ability: 'keen-eye' }); // Thunder (base accuracy 70)
  const evasionStages = [-6, -1, 0, 1, 6];

  for (const evasionStage of evasionStages) {
    const defender = mon(2, [33], { evasionStage });
    const acc = C.getEffectiveAccuracy(move(87), attacker, defender);
    assert.equal(acc, 70, `Com Keen Eye, defensor com evasão ${evasionStage} deve resultar na precisão base (70)`);
  }
});

test('Keen Eye: NÃO garante acerto automático (golpe com 70 acc sem evasão permanece 70)', () => {
  const attacker = mon(279, [87], { ability: 'keen-eye' });
  const defender = mon(2, [33], { evasionStage: 0 });

  const acc = C.getEffectiveAccuracy(move(87), attacker, defender);
  assert.equal(acc, 70, 'Golpe com 70 de acc não deve virar acerto automático');
});

test('Keen Eye: preserva estágios de evasão do alvo para outros combatentes', () => {
  const attackerKeen = mon(279, [33], { ability: 'keen-eye' });
  const attackerNorm = mon(1, [33], { ability: 'blaze' });
  const defender = mon(2, [33], { evasionStage: 2 });

  C.getEffectiveAccuracy(move(33), attackerKeen, defender);
  assert.equal(defender.evasionStage, 2, 'Estágio de evasão do defensor não deve ser modificado');

  const accNorm = C.getEffectiveAccuracy(move(33), attackerNorm, defender);
  assert.equal(accNorm, 60, 'Atacante sem Keen Eye deve sofrer penalidade de evasão');
});

test('Keen Eye: não remove reduções de precisão pré-existentes no portador', () => {
  const attacker = mon(279, [33], { ability: 'keen-eye', accuracyStage: -1 });
  const defender = mon(2, [33]);

  const acc = C.getEffectiveAccuracy(move(33), attacker, defender);
  assert.equal(acc, 75, 'Penalidades de precisão pré-existentes do usuário são respeitadas');
});

test('Keen Eye: Mold Breaker ignora a proteção de Keen Eye contra redução de precisão', () => {
  const defender = mon(279, [33], { ability: 'keen-eye', p7KeenEyeAccuracyBlock: true, abilityIgnored: true });
  const report = C.applyStatStageChange(defender, 'accuracy', -1);
  assert.equal(report.appliedDelta, -1, 'Sob Mold Breaker (abilityIgnored), a precisão deve ser reduzida');
  assert.equal(defender.accuracyStage, -1);
});

test('Keen Eye: supressão desativa a imunidade a drop de precisão', () => {
  const defender = mon(279, [33], { ability: 'keen-eye', p7KeenEyeAccuracyBlock: true, abilitySuppressed: true });
  const report = C.applyStatStageChange(defender, 'accuracy', -1);
  assert.equal(report.appliedDelta, -1, 'Sob supressão, a precisão deve ser reduzida');
  assert.equal(defender.accuracyStage, -1);
});

test('Keen Eye: BattleEvaluator (IA) prevê acerto correto ignorando evasão do alvo', () => {
  const attacker = mon(279, [33], { ability: 'keen-eye' });
  const defender = mon(2, [33], { evasionStage: 2 });

  const evaluation = V.evaluateMove(attacker, defender, move(33), {});
  assert.equal(evaluation.accuracy, 100, 'IA deve calcular 100 de precisão ignorando a evasão');
});

/* ==========================================================================
   H2-A.4: Steadfast
   ========================================================================== */

test('Steadfast: aumenta Speed em +1 estágio quando o portador efetivamente sofre flinch', () => {
  const s = battle({ speed: 200 }, { ability: 'steadfast', speed: 50 }, [44], [33]);
  const r = turn(s, 44, { secondaryEffectRoll: 10 });

  assert.equal(r.state.enemy.statStages?.speed, 1, 'Enemy com Steadfast deve receber +1 Speed após hesitar');
  assert.ok(r.events.some(e => e.type === 'FLINCH_IMMOBILIZED'), 'Deve emitir evento de hesitação');
  assert.ok(r.events.some(e => e.type === 'MOVE_PREPARED' && e.reason === 'P7_ABILITY' && e.label === 'steadfast'), 'Deve emitir feedback da habilidade Steadfast');
});

test('Steadfast: NÃO ativa se o ataque não causar flinch', () => {
  const s = battle({}, { ability: 'steadfast' });
  const r = turn(s, 33);
  assert.equal(r.state.enemy.statStages?.speed || 0, 0, 'Sem flinch, Steadfast não deve ativar');
});

test('Steadfast: NÃO ativa se o portador já agiu antes de receber o ataque com flinch', () => {
  const s = battle({ ability: 'steadfast', speed: 200 }, { speed: 50 }, [33], [44]);
  const r = turn(s, 33, {}, act(44, { secondaryEffectRoll: 10 }));
  assert.equal(r.state.player.statStages?.speed || 0, 0, 'Portador que já agiu não deve ativar Steadfast');
});

test('Steadfast: NÃO ativa se o flinch for impedido (Inner Focus)', () => {
  const s = battle({ speed: 200 }, { ability: 'inner-focus', speed: 50 }, [44], [33]);
  const r = turn(s, 44, { secondaryEffectRoll: 10 });
  assert.equal(r.state.enemy.isFlinched, false);
});

test('Steadfast: respeita precedência de Sleep sobre Flinch (não ativa Steadfast se adormecido)', () => {
  const s = battle({ speed: 200 }, { ability: 'steadfast', speed: 50, statusCondition: 'sleep', sleepTurns: 2, isFlinched: true }, [14], [33]);
  const r = turn(s, 14, {}, act(33));
  assert.ok(r.state.enemy.isFlinched === false, 'Flinch pendente deve ser descartado no sono');
  assert.equal(r.state.enemy.statStages?.speed || 0, 0, 'Steadfast não deve ativar se a ação foi impedida por sono');
});

test('Steadfast: respeita limite máximo de +6 estágios', () => {
  const s = battle({ speed: 200 }, { ability: 'steadfast', speed: 50, statStages: { speed: 6 } }, [44], [33]);
  const r = turn(s, 44, { secondaryEffectRoll: 10 });
  assert.equal(r.state.enemy.statStages.speed, 6, 'Velocidade deve permanecer no teto de +6');
});

test('Steadfast: não ativa em duplicidade no mesmo evento', () => {
  const s = battle({ speed: 200 }, { ability: 'steadfast', speed: 50 }, [44], [33]);
  const r = turn(s, 44, { secondaryEffectRoll: 10 });
  const steadfastEvents = r.events.filter(e => e.type === 'MOVE_PREPARED' && e.reason === 'P7_ABILITY' && e.label === 'steadfast');
  assert.equal(steadfastEvents.length, 1, 'Deve ativar exatamente uma vez');
});

test('Steadfast: NÃO é ignorada por Mold Breaker', () => {
  const s = battle({ ability: 'mold-breaker', speed: 200 }, { ability: 'steadfast', speed: 50 }, [44], [33]);
  const r = turn(s, 44, { secondaryEffectRoll: 10 });
  assert.equal(r.state.enemy.statStages?.speed, 1, 'Steadfast deve ativar mesmo contra usuário de Mold Breaker');
});

test('Steadfast: supressão desativa o boost de Speed', () => {
  const s = battle({ speed: 200 }, { ability: 'steadfast', speed: 50 }, [44], [33]);
  s.enemy.abilitySuppressed = true;
  const r = turn(s, 44, { secondaryEffectRoll: 10 });
  assert.equal(r.state.enemy.statStages?.speed || 0, 0, 'Com habilidade suprimida, Steadfast não deve ativar');
});

test('Steadfast: simétrico para o jogador (jogador com Steadfast hesita e recebe +1 Speed)', () => {
  const s = battle({ ability: 'steadfast', speed: 50 }, { speed: 200 }, [33], [44]);
  const r = turn(s, 33, {}, act(44, { secondaryEffectRoll: 10 }));
  assert.equal(r.state.player.statStages?.speed, 1, 'Jogador com Steadfast deve receber +1 Speed');
});

/* ==========================================================================
   Integração, Formatos e Espécies Reais
   ========================================================================== */

test('Espécies reais: Milotic (#350) com Marvel Scale em 1v1', () => {
  const milotic = mon(350, [33], { ability: 'marvel-scale', statusCondition: 'burn', defense: 79 });
  assert.equal(C.getEffectiveStat(milotic, 'defense'), 118); // floor(79 * 1.5) = 118
});

test('Espécies reais: Togekiss (#468) com Hustle em 1v1', () => {
  const togekiss = mon(468, [33], { ability: 'hustle', attack: 50 });
  assert.equal(C.getEffectiveStat(togekiss, 'attack'), 75); // floor(50 * 1.5) = 75
  const acc = C.getEffectiveAccuracy(move(33), togekiss, mon(2));
  assert.equal(acc, 80);
});

test('Espécies reais: Pelipper (#279) e Skarmory (#227) com Keen Eye', () => {
  const pelipper = mon(279, [33], { ability: 'keen-eye' });
  const skarmory = mon(227, [33], { ability: 'keen-eye' });
  const target = mon(2, [33], { evasionStage: 3 });

  assert.equal(C.getEffectiveAccuracy(move(33), pelipper, target), 100);
  assert.equal(C.getEffectiveAccuracy(move(33), skarmory, target), 100);
});

test('Espécies reais: Lucario (#448) com Steadfast em 1v1', () => {
  const s = battle({ speed: 200 }, { id: 448, name: 'lucario', ability: 'steadfast', speed: 50 }, [44], [33]);
  const r = turn(s, 44, { secondaryEffectRoll: 10 });
  assert.equal(r.state.enemy.statStages?.speed, 1);
});

test('Formatos: 3v3 com trocas preserva estado de Marvel Scale e Hustle', () => {
  const teamA = [mon(350, [33], { ability: 'marvel-scale', statusCondition: 'burn', defense: 100 }), mon(1), mon(3)];
  const teamB = [mon(468, [33], { ability: 'hustle', attack: 100 }), mon(2), mon(4)];
  const s = E.createTeamBattle(teamA, teamB);

  assert.equal(C.getEffectiveStat(s.player.team[0], 'defense'), 150);
  assert.equal(C.getEffectiveStat(s.enemy.team[0], 'attack'), 150);
});

test('Formatos: Final Stand com portador de Steadfast', () => {
  const s = E.createBattle(
    mon(1, [44], { speed: 200 }),
    mon(448, [33], { ability: 'steadfast', speed: 50 }),
    { battleMode: 'FINAL_STAND' }
  );
  const r = turn(s, 44, { secondaryEffectRoll: 10 });
  assert.equal(r.state.enemy.statStages?.speed, 1);
});

test('Formatos: Doubles (2v2) com portadores H2-A', () => {
  const pTeam = [mon(350, [33], { ability: 'marvel-scale', statusCondition: 'poison', defense: 100 }), mon(468, [33], { ability: 'hustle', attack: 100 }), mon(1)];
  const eTeam = [mon(279, [33], { ability: 'keen-eye' }), mon(448, [33], { ability: 'steadfast' }), mon(2)];
  const s = E.createDoublesBattle(pTeam, eTeam);

  assert.equal(C.getEffectiveStat(s.player.team[0], 'defense'), 150);
  assert.equal(C.getEffectiveStat(s.player.team[1], 'attack'), 150);
});

test('UI Adapter: gera mensagens descritivas em português para todas as habilidades H2-A', () => {
  const viewMessages = [];
  const adapter = new UI.BattleUiDomAdapter();
  adapter.setView({
    displayMessage(msg) { viewMessages.push(msg); },
    updateCombatant() {},
    renderAction() {},
    setBattleActive() {}
  });

  const pokemonNames = {
    'marvel-scale': 'Milotic',
    'hustle': 'Togekiss',
    'keen-eye': 'Skarmory',
    'steadfast': 'Lucario'
  };

  for (const label of ['marvel-scale', 'hustle', 'keen-eye', 'steadfast']) {
    adapter.handleCommand({
      type: 'MOVE_FAIL_FEEDBACK',
      pokemonName: pokemonNames[label],
      reason: 'P7_ABILITY',
      label
    });
  }

  assert.ok(viewMessages.some(m => m.includes('Marvel Scale')));
  assert.ok(viewMessages.some(m => m.includes('Hustle')));
  assert.ok(viewMessages.some(m => m.includes('Keen Eye')));
  assert.ok(viewMessages.some(m => m.includes('Steadfast')));
});

test('AbilityRegistry: todas as 4 habilidades H2-A reportam status FULL e metadados corretos', () => {
  for (const name of ['marvel-scale', 'hustle', 'keen-eye', 'steadfast']) {
    const entry = Reg.getAbility(name);
    assert.ok(entry, `${name} deve estar registrada`);
    assert.equal(entry.status, 'FULL');
    assert.equal(entry.phase, 'H2');
    assert.ok(entry.triggers.length > 0);
    assert.ok(entry.description.length > 0);
  }
});
