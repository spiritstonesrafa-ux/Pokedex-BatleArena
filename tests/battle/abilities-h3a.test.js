const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const V = require('../../assets/js/battle/battle-evaluator');
const Reg = require('../../assets/js/battle/ability-registry');
const UI = require('../../assets/js/ui/battle-ui-adapter');
const { BattleRandomSource, DeterministicRandomSource } = require('../../assets/js/battle-session/battle-random-source.js');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { BATTLE_UI_STATES } = require('../../assets/js/battle-session/battle-session-constants.js');


const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const mon = (id, ids = [33, 156], extra = {}) => ({
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

const battle = (a = {}, b = {}, idsA = [33, 156], idsB = [33, 156]) => E.createBattle(
  mon(1, idsA, { speed: 200, ...a }),
  mon(2, idsB, { speed: 50, ...b })
);

// enemy default is Rest (156) so enemy doesn't deal counterattack damage unless intended
const turn = (s, id = 33, extra = {}, enemy = act(156)) => E.resolveTurn(s, {
  player: act(id, extra),
  enemy
});

/* ==========================================================================
   H3-A.1: Rough Skin
   ========================================================================== */

test('Rough Skin: causa 1/8 do HP máximo do atacante ao receber golpe de contato', () => {
  // Move 33 (Tackle) is a contact move. Attacker has 800 maxHp -> 1/8 = 100 damage.
  const s = battle({ hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'rough-skin' });
  const r = turn(s, 33);

  const recoilEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rough-skin');
  assert.ok(recoilEvent, 'Deve emitir evento RECOIL_APPLIED com reason rough-skin');
  assert.equal(recoilEvent.damage, 100, 'Dano de Rough Skin deve ser 1/8 do HP máximo do atacante (800 / 8 = 100)');
  assert.equal(r.state.player.currentHp, 700, 'Atacante deve ter seu HP reduzido em 100');
  assert.ok(r.events.some(e => e.type === 'MOVE_PREPARED' && e.label === 'rough-skin'), 'Deve emitir feedback P7_ABILITY para rough-skin');
});

test('Rough Skin: NÃO ativa com golpe que não faz contato (ex: Swift / Water Gun)', () => {
  // Move 129 (Swift, special, ranged, contact = false)
  const s = battle({ hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'rough-skin' }, [129, 156], [33, 156]);
  const r = turn(s, 129);

  const recoilEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rough-skin');
  assert.equal(recoilEvent, undefined, 'Golpes sem contato não devem disparar Rough Skin');
  assert.equal(r.state.player.currentHp, 800, 'HP do atacante deve permanecer intacto');
});

test('Rough Skin: aplica dano mínimo de 1 mesmo para atacante com HP reduzido', () => {
  const s = battle({ hp: 5, maxHp: 5, currentHp: 5 }, { ability: 'rough-skin' });
  const r = turn(s, 33);

  const recoilEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rough-skin');
  assert.ok(recoilEvent);
  assert.equal(recoilEvent.damage, 1, 'floor(5 / 8) = 0 -> Math.max(1, 0) = 1 de dano mínimo');
});

test('Rough Skin: ativa a cada acerto de golpes multi-hit de contato', () => {
  // Move 167 (Triple Kick - multi-hit contact). Simulating 3 hits.
  const s = battle({ hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'rough-skin', hp: 2000, maxHp: 2000, currentHp: 2000 }, [167, 156]);
  const r = turn(s, 167, { hitCount: 3 });

  const recoilEvents = r.events.filter(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rough-skin');
  assert.equal(recoilEvents.length, 3, 'Deve ativar 3 vezes para 3 acertos de contato');
  assert.equal(r.state.player.currentHp, 500, '800 - 3 * 100 = 500 HP');
});

test('Rough Skin: ativa MESMO SE o defensor for nocauteado pelo ataque de contato', () => {
  // Defender has 1 HP and will faint from Tackle.
  const s = battle({ hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'rough-skin', hp: 1, currentHp: 1 });
  const r = turn(s, 33);

  assert.equal(r.state.enemy.currentHp, 0, 'Defensor deve desmaiar pelo golpe');
  const recoilEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rough-skin');
  assert.ok(recoilEvent, 'Rough Skin deve disparar mesmo que o defensor seja nocauteado');
  assert.equal(r.state.player.currentHp, 700, 'Atacante deve receber dano de Rough Skin mesmo com KO do defensor');
});

test('Rough Skin: nocaute mútuo (defensor cai pelo golpe, atacante cai pelo recuo)', () => {
  // Attacker has 50 HP (maxHp 800 -> 100 recoil -> faints). Defender has 1 HP.
  const s = battle({ hp: 800, maxHp: 800, currentHp: 50 }, { ability: 'rough-skin', hp: 1, currentHp: 1 });
  const r = turn(s, 33);

  assert.equal(r.state.enemy.currentHp, 0, 'Defensor deve cair');
  assert.equal(r.state.player.currentHp, 0, 'Atacante deve cair pelo recuo de Rough Skin');
  const faintEvents = r.events.filter(e => e.type === 'POKEMON_FAINTED');
  assert.equal(faintEvents.length, 2, 'Ambos os Pokémon devem ser registrados como fainted');
  assert.equal(faintEvents[0].target, 'enemy', 'Defensor cai primeiro');
  assert.equal(faintEvents[1].target, 'player', 'Atacante cai em seguida');
});

test('Rough Skin: Mold Breaker no atacante NÃO ignora Rough Skin (sofre 1/8 de recuo - regra Gen IX)', () => {
  const s = battle({ ability: 'mold-breaker', hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'rough-skin' });
  const r = turn(s, 33);

  const recoilEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rough-skin');
  assert.ok(recoilEvent, 'Mold Breaker NÃO deve ignorar habilidades reativas de contato');
  assert.equal(recoilEvent.damage, 100);
  assert.equal(r.state.player.currentHp, 700, 'Atacante com Mold Breaker deve sofrer dano de contato');
});

test('Rough Skin: Teravolt e Turboblaze também sofrem dano de contato de Rough Skin', () => {
  const s1 = battle({ ability: 'teravolt', hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'rough-skin' });
  const r1 = turn(s1, 33);
  assert.equal(r1.state.player.currentHp, 700);

  const s2 = battle({ ability: 'turboblaze', hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'rough-skin' });
  const r2 = turn(s2, 33);
  assert.equal(r2.state.player.currentHp, 700);
});

test('Rough Skin: Ability Shield protege o portador contra supressão por Core Enforcer', () => {
  const s = battle({ speed: 200 }, { ability: 'rough-skin', item: 'ability-shield', speed: 50 }, [687, 156], [33, 156]);
  s.enemy.actedThisTurn = true;
  const r = turn(s, 687);

  assert.equal(r.state.enemy.abilitySuppressed, false, 'Ability Shield deve proteger Rough Skin de supressão');
});

test('Rough Skin: golpes especiais que fazem contato (Draining Kiss #577) ativam Rough Skin', () => {
  const s = battle({ hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'rough-skin' }, [577, 156], [33, 156]);
  const r = turn(s, 577);

  const recoilEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rough-skin');
  assert.ok(recoilEvent, 'Golpe especial com flag de contato (Draining Kiss) deve ativar Rough Skin');
  assert.equal(recoilEvent.damage, 100);
});

test('Rough Skin: golpes físicos sem contato (Earthquake #89) NÃO ativam Rough Skin', () => {
  const s = battle({ hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'rough-skin' }, [89, 156], [33, 156]);
  const r = turn(s, 89);

  const recoilEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rough-skin');
  assert.equal(recoilEvent, undefined, 'Golpe físico sem contato (Earthquake) NÃO deve ativar Rough Skin');
  assert.equal(r.state.player.currentHp, 800);
});

test('Rough Skin: efeitos acumulados de contato (Rocky Helmet + Rough Skin = 1/6 + 1/8)', () => {
  const s = battle({ hp: 2400, maxHp: 2400, currentHp: 2400 }, { ability: 'rough-skin', item: 'rocky-helmet' });
  const r = turn(s, 33);

  const roughSkinRecoil = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rough-skin');
  const helmetRecoil = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rocky-helmet');
  assert.ok(roughSkinRecoil, 'Rough Skin deve aplicar dano');
  assert.ok(helmetRecoil, 'Rocky Helmet deve aplicar dano');
  assert.equal(roughSkinRecoil.damage, 300);
  assert.equal(helmetRecoil.damage, 400);
  assert.equal(r.state.player.currentHp, 1700, '2400 - 300 - 400 = 1700');
});

test('Rough Skin: Magic Guard no atacante impede dano de Rough Skin', () => {
  const s = battle({ ability: 'magic-guard', hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'rough-skin' });
  const r = turn(s, 33);

  const recoilEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rough-skin');
  assert.equal(recoilEvent, undefined, 'Magic Guard deve impedir dano indireto de Rough Skin');
  assert.equal(r.state.player.currentHp, 800);
});

test('Rough Skin: supressão (abilitySuppressed = true) desativa Rough Skin', () => {
  const s = battle({ hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'rough-skin' });
  s.enemy.abilitySuppressed = true;
  const r = turn(s, 33);

  const recoilEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'rough-skin');
  assert.equal(recoilEvent, undefined, 'Rough Skin suprimida não deve ativar');
  assert.equal(r.state.player.currentHp, 800);
});

test('Rough Skin: simetria jogador/adversário (jogador com Rough Skin fere o adversário atacante)', () => {
  const s = battle({ ability: 'rough-skin' }, { hp: 800, maxHp: 800, currentHp: 800, speed: 300 });
  // Enemy attacks first with Tackle (speed 300 vs 100), player uses Rest
  const r = turn(s, 156, {}, act(33));

  const recoilEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.target === 'enemy');
  assert.ok(recoilEvent, 'Inimigo deve sofrer recoil de Rough Skin ao bater no jogador');
  assert.equal(r.state.enemy.currentHp, 700);
});

test('Rough Skin: BattleEvaluator (IA) prevê dano de recuo de Rough Skin', () => {
  const attacker = mon(1, [33], { hp: 800, maxHp: 800, currentHp: 800 });
  const defender = mon(2, [33], { ability: 'rough-skin' });

  const evalContact = V.evaluateMove(attacker, defender, move(33), {});
  assert.ok(evalContact.expectedRecoil >= 100, `IA deve prever 100 de recuo por Rough Skin (esperado >= 100, obtido ${evalContact.expectedRecoil})`);
});

/* ==========================================================================
   H3-A.2: Iron Barbs
   ========================================================================== */

test('Iron Barbs: causa 1/8 do HP máximo do atacante ao sofrer golpe de contato', () => {
  const s = battle({ hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'iron-barbs' });
  const r = turn(s, 33);

  const recoilEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'iron-barbs');
  assert.ok(recoilEvent, 'Deve emitir evento RECOIL_APPLIED com reason iron-barbs');
  assert.equal(recoilEvent.damage, 100);
  assert.equal(r.state.player.currentHp, 700);
});

test('Iron Barbs: Teravolt no atacante NÃO ignora Iron Barbs (sofre 1/8 de recuo - regra Gen IX)', () => {
  const s = battle({ ability: 'teravolt', hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'iron-barbs' });
  const r = turn(s, 33);

  const recoilEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'iron-barbs');
  assert.ok(recoilEvent, 'Teravolt NÃO deve ignorar Iron Barbs');
  assert.equal(recoilEvent.damage, 100);
  assert.equal(r.state.player.currentHp, 700);
});

test('Iron Barbs: supressão desativa Iron Barbs', () => {
  const s = battle({ hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'iron-barbs' });
  s.enemy.abilitySuppressed = true;
  const r = turn(s, 33);

  const recoilEvent = r.events.find(e => e.type === 'RECOIL_APPLIED' && e.reason === 'iron-barbs');
  assert.equal(recoilEvent, undefined);
  assert.equal(r.state.player.currentHp, 800);
});

/* ==========================================================================
   H3-A.3: Effect Spore
   ========================================================================== */

test('Effect Spore: roll 1..9 aplica Poison no atacante ao fazer contato', () => {
  const s = battle({}, { ability: 'effect-spore' });
  const r = turn(s, 33, { effectSporeRoll: 5 });

  assert.equal(r.state.player.statusCondition, 'poison', 'Roll 5 deve aplicar Poison');
  assert.ok(r.events.some(e => e.type === 'STATUS_APPLIED' && e.statusCondition === 'poison' && e.reason === 'effect-spore'));
});

test('Effect Spore: roll 10..19 aplica Paralysis no atacante ao fazer contato', () => {
  const s = battle({}, { ability: 'effect-spore' });
  const r = turn(s, 33, { effectSporeRoll: 15 });

  assert.equal(r.state.player.statusCondition, 'paralysis', 'Roll 15 deve aplicar Paralysis');
  assert.ok(r.events.some(e => e.type === 'STATUS_APPLIED' && e.statusCondition === 'paralysis' && e.reason === 'effect-spore'));
});

test('Effect Spore: roll 20..30 aplica Sleep no atacante ao fazer contato', () => {
  const s = battle({}, { ability: 'effect-spore' });
  const r = turn(s, 33, { effectSporeRoll: 25, sleepDuration: 3 });

  assert.equal(r.state.player.statusCondition, 'sleep', 'Roll 25 deve aplicar Sleep');
  assert.equal(r.state.player.sleepTurns, 3);
  assert.ok(r.events.some(e => e.type === 'STATUS_APPLIED' && e.statusCondition === 'sleep' && e.reason === 'effect-spore'));
});

test('Effect Spore: roll > 30 NÃO aplica nenhum status', () => {
  const s = battle({}, { ability: 'effect-spore' });
  const r = turn(s, 33, { effectSporeRoll: 35 });

  assert.equal(r.state.player.statusCondition, null, 'Roll 35 não deve aplicar status');
});

test('Effect Spore limites de fronteira: roll 1 e roll 9 aplicam Poison; roll 10 e roll 19 aplicam Paralysis; roll 20 e roll 30 aplicam Sleep; roll 31 e roll 100 não aplicam nada', () => {
  // Poison boundaries (9%)
  let s = battle({}, { ability: 'effect-spore' });
  let r = turn(s, 33, { effectSporeRoll: 1 });
  assert.equal(r.state.player.statusCondition, 'poison', 'Roll 1 (limite inferior Poison) deve aplicar Poison');

  s = battle({}, { ability: 'effect-spore' });
  r = turn(s, 33, { effectSporeRoll: 9 });
  assert.equal(r.state.player.statusCondition, 'poison', 'Roll 9 (limite superior Poison) deve aplicar Poison');

  // Paralysis boundaries (10%)
  s = battle({}, { ability: 'effect-spore' });
  r = turn(s, 33, { effectSporeRoll: 10 });
  assert.equal(r.state.player.statusCondition, 'paralysis', 'Roll 10 (limite inferior Paralysis) deve aplicar Paralysis');

  s = battle({}, { ability: 'effect-spore' });
  r = turn(s, 33, { effectSporeRoll: 19 });
  assert.equal(r.state.player.statusCondition, 'paralysis', 'Roll 19 (limite superior Paralysis) deve aplicar Paralysis');

  // Sleep boundaries (11%)
  s = battle({}, { ability: 'effect-spore' });
  r = turn(s, 33, { effectSporeRoll: 20 });
  assert.equal(r.state.player.statusCondition, 'sleep', 'Roll 20 (limite inferior Sleep) deve aplicar Sleep');

  s = battle({}, { ability: 'effect-spore' });
  r = turn(s, 33, { effectSporeRoll: 30 });
  assert.equal(r.state.player.statusCondition, 'sleep', 'Roll 30 (limite superior Sleep) deve aplicar Sleep');

  // No effect boundaries (70%)
  s = battle({}, { ability: 'effect-spore' });
  r = turn(s, 33, { effectSporeRoll: 31 });
  assert.equal(r.state.player.statusCondition, null, 'Roll 31 (primeiro valor sem efeito) não deve aplicar status');

  s = battle({}, { ability: 'effect-spore' });
  r = turn(s, 33, { effectSporeRoll: 100 });
  assert.equal(r.state.player.statusCondition, null, 'Roll 100 (limite superior absoluto) não deve aplicar status');
});

test('Effect Spore: Pokémon Grass-type é IMUNE a Effect Spore (Gen 6+)', () => {
  const s = battle({ types: ['grass'] }, { ability: 'effect-spore' });
  const r = turn(s, 33, { effectSporeRoll: 5 });

  assert.equal(r.state.player.statusCondition, null, 'Tipo Grass deve ser imune a Effect Spore');
});

test('Effect Spore: portador de Overcoat é IMUNE a Effect Spore', () => {
  const s = battle({ ability: 'overcoat' }, { ability: 'effect-spore' });
  const r = turn(s, 33, { effectSporeRoll: 5 });

  assert.equal(r.state.player.statusCondition, null, 'Overcoat deve ser imune a Effect Spore');
});

test('Effect Spore: segurando Safety Goggles é IMUNE a Effect Spore', () => {
  const s = battle({ item: 'safety-goggles' }, { ability: 'effect-spore' });
  const r = turn(s, 33, { effectSporeRoll: 5 });

  assert.equal(r.state.player.statusCondition, null, 'Safety Goggles deve conferir imunidade a Effect Spore');
});

test('Effect Spore: NÃO sobrescreve status já existente no atacante', () => {
  const s = battle({ statusCondition: 'burn' }, { ability: 'effect-spore' });
  const r = turn(s, 33, { effectSporeRoll: 25 }); // Attempt sleep

  assert.equal(r.state.player.statusCondition, 'burn', 'Status preexistente (burn) deve ser mantido');
});

test('Effect Spore: Safeguard protege contra Effect Spore', () => {
  const s = battle({}, { ability: 'effect-spore' });
  C.P6.init(s);
  s.p6Sides.player.safeguard = 5;
  const r = turn(s, 33, { effectSporeRoll: 15 });

  assert.equal(r.state.player.statusCondition, null, 'Safeguard deve impedir status');
});

test('Effect Spore: Turboblaze no atacante NÃO ignora Effect Spore (regra Gen IX)', () => {
  const s = battle({ ability: 'turboblaze' }, { ability: 'effect-spore' });
  const r = turn(s, 33, { effectSporeRoll: 5 });

  assert.equal(r.state.player.statusCondition, 'poison', 'Turboblaze NÃO deve ignorar Effect Spore');
  assert.ok(r.events.some(e => e.type === 'STATUS_APPLIED' && e.reason === 'effect-spore'));
});

test('Effect Spore: supressão genuína (abilitySuppressed = true) desativa Effect Spore', () => {
  const s = battle({}, { ability: 'effect-spore' });
  s.enemy.abilitySuppressed = true;
  const r = turn(s, 33, { effectSporeRoll: 5 });

  assert.equal(r.state.player.statusCondition, null, 'Effect Spore suprimida não deve aplicar status');
});

test('Effect Spore: suprimido sob Neutralizing Gas em campo', () => {
  const s = battle({ ability: 'neutralizing-gas' }, { ability: 'effect-spore' });
  const r = turn(s, 33, { effectSporeRoll: 5 });
  assert.equal(r.state.player.statusCondition, null, 'Neutralizing Gas desativa Effect Spore do defensor');
});

/* ==========================================================================
   H3-A.4: Synchronize
   ========================================================================== */

test('Synchronize: reflete Paralysis aplicada por Thunder Wave adversário', () => {
  // Move 86 = Thunder Wave (status move, inflicts paralysis)
  const s = battle({ speed: 200 }, { ability: 'synchronize', speed: 50 }, [86, 156], [33, 156]);
  const r = turn(s, 86);

  assert.equal(r.state.enemy.statusCondition, 'paralysis', 'Defensor deve receber paralisia de Thunder Wave');
  assert.equal(r.state.player.statusCondition, 'paralysis', 'Synchronize deve refletir paralisia no atacante');
  const syncEvent = r.events.find(e => e.type === 'STATUS_APPLIED' && e.target === 'player' && e.reason === 'synchronize');
  assert.ok(syncEvent, 'Deve emitir STATUS_APPLIED com reason synchronize');
});

test('Synchronize: reflete Burn de Will-O-Wisp preservando imunidades do oponente', () => {
  // Move 261 = Will-O-Wisp (burns target).
  // Player is Fire-type -> should be IMMUNE to the reflected Burn!
  const s = battle({ types: ['fire'], speed: 200 }, { ability: 'synchronize', speed: 50 }, [261, 156], [33, 156]);
  const r = turn(s, 261);

  assert.equal(r.state.enemy.statusCondition, 'burn', 'Defensor recebe queimadura');
  assert.equal(r.state.player.statusCondition, null, 'Atacante do tipo Fire é imune à queimadura refletida');
});

test('Synchronize: reflete Toxic preservando status de Bad Poison (toxic)', () => {
  // Move 92 = Toxic (inflicts toxic)
  const s = battle({ speed: 200 }, { ability: 'synchronize', speed: 50 }, [92, 156], [33, 156]);
  const r = turn(s, 92);

  assert.equal(r.state.enemy.statusCondition, 'toxic', 'Defensor recebe toxic');
  assert.equal(r.state.player.statusCondition, 'toxic', 'Synchronize deve refletir exatamente toxic');
});

test('Synchronize: reflete Poison regular ao receber Poison Powder', () => {
  // Move 77 = Poison Powder (inflicts poison)
  const s = battle({ speed: 200 }, { ability: 'synchronize', speed: 50 }, [77, 156], [33, 156]);
  const r = turn(s, 77);

  assert.equal(r.state.enemy.statusCondition, 'poison', 'Defensor recebe poison regular');
  assert.equal(r.state.player.statusCondition, 'poison', 'Synchronize deve refletir poison regular (não toxic)');
});

test('Synchronize: NÃO reflete Sleep (Spore / Hypnosis)', () => {
  // Move 147 = Spore (inflicts sleep)
  const s = battle({ speed: 200 }, { ability: 'synchronize', speed: 50 }, [147, 156], [33, 156]);
  const r = turn(s, 147);

  assert.equal(r.state.enemy.statusCondition, 'sleep');
  assert.equal(r.state.player.statusCondition, null, 'Synchronize NÃO deve refletir Sleep');
});

test('Synchronize: NÃO reflete status autoinfligido (Rest)', () => {
  // Move 156 = Rest (user puts itself to sleep)
  const s = battle({ ability: 'synchronize', currentHp: 500, hp: 1000 }, {}, [156], [156]);
  const r = turn(s, 156);

  assert.equal(r.state.player.statusCondition, 'sleep');
  assert.equal(r.state.enemy.statusCondition, null, 'Rest não deve refletir status para o adversário');
});

test('Synchronize: não entra em recursão infinita contra outro Synchronize', () => {
  // Both sides have Synchronize. Player uses Thunder Wave on Enemy.
  // Enemy reflects paralysis to Player. Player does not reflect back to Enemy.
  const s = battle({ ability: 'synchronize', speed: 200 }, { ability: 'synchronize', speed: 50 }, [86, 156], [33, 156]);
  const r = turn(s, 86);

  assert.equal(r.state.enemy.statusCondition, 'paralysis', 'Enemy recebe paralisia');
  assert.equal(r.state.player.statusCondition, 'paralysis', 'Player recebe a paralisia refletida por Enemy');
  const syncEvents = r.events.filter(e => e.type === 'STATUS_APPLIED' && e.reason === 'synchronize');
  assert.equal(syncEvents.length, 1, 'Synchronize deve disparar apenas 1 vez, sem loop reverso');
});

test('Synchronize: respeita Safeguard do oponente', () => {
  const s = battle({ speed: 200 }, { ability: 'synchronize', speed: 50 }, [86, 156], [33, 156]);
  C.P6.init(s);
  s.p6Sides.player.safeguard = 5;
  const r = turn(s, 86);

  assert.equal(r.state.enemy.statusCondition, 'paralysis');
  assert.equal(r.state.player.statusCondition, null, 'Safeguard do atacante impede o status refletido');
});

test('Synchronize: ativa com efeito secundário de dano (Flamethrower Burn)', () => {
  // Move 53 = Flamethrower (special, 10% burn secondary)
  const s = battle({ speed: 200 }, { ability: 'synchronize', speed: 50 }, [53, 156], [33, 156]);
  const r = turn(s, 53, { secondaryEffectRoll: 5 }, act(33)); // enemy uses Tackle (not Rest)

  assert.equal(r.state.enemy.statusCondition, 'burn');
  assert.equal(r.state.player.statusCondition, 'burn', 'Synchronize deve refletir o burn provocado por efeito secundário');
});

test('Synchronize: supressão desativa a reflexão', () => {
  const s = battle({ speed: 200 }, { ability: 'synchronize', speed: 50 }, [86, 156], [33, 156]);
  s.enemy.abilitySuppressed = true;
  const r = turn(s, 86);

  assert.equal(r.state.enemy.statusCondition, 'paralysis');
  assert.equal(r.state.player.statusCondition, null, 'Synchronize suprimida não reflete');
});

/* ==========================================================================
   H3-A.5: Shed Skin
   ========================================================================== */

test('Shed Skin: roll <= 33 cura status principal no fim do turno', () => {
  const s = battle({ ability: 'shed-skin', statusCondition: 'paralysis' });
  const r = turn(s, 156, { shedSkinRoll: 20 });

  assert.equal(r.state.player.statusCondition, null, 'Shed Skin deve curar paralisia com roll 20 (<= 33)');
  const cureEvent = r.events.find(e => e.type === 'STATUS_CURED' && e.reason === 'SHED_SKIN');
  assert.ok(cureEvent, 'Deve emitir STATUS_CURED com reason SHED_SKIN');
  assert.ok(r.events.some(e => e.type === 'MOVE_PREPARED' && e.label === 'shed-skin'));
});

test('Shed Skin: cura Burn no fim do turno antes do dano residual de queimadura', () => {
  const s = battle({ ability: 'shed-skin', statusCondition: 'burn', hp: 1000, currentHp: 1000 });
  const r = turn(s, 156, { shedSkinRoll: 10 });

  assert.equal(r.state.player.statusCondition, null, 'Burn deve ser curado');
  const statusDamage = r.events.find(e => e.type === 'STATUS_DAMAGE');
  assert.equal(statusDamage, undefined, 'Não deve sofrer dano residual de queimadura se foi curado por Shed Skin');
  assert.equal(r.state.player.currentHp, 1000, 'HP não deve ser reduzido por queimadura');
});

test('Shed Skin: cura Sleep e zera contadores de sono', () => {
  const s = battle({ ability: 'shed-skin', statusCondition: 'sleep', sleepTurns: 3, sleepCounter: 3 });
  const r = turn(s, 156, { shedSkinRoll: 15 });

  assert.equal(r.state.player.statusCondition, null);
  assert.equal(r.state.player.sleepTurns, 0);
  assert.equal(r.state.player.sleepCounter, 0);
});

test('Shed Skin: cura Freeze', () => {
  const s = battle({ ability: 'shed-skin', statusCondition: 'freeze' });
  const r = turn(s, 156, { shedSkinRoll: 30 });

  assert.equal(r.state.player.statusCondition, null);
});

test('Shed Skin: NÃO cura Confusão (apenas status principais)', () => {
  const s = battle({ ability: 'shed-skin' });
  s.player.confusionTurns = 3;
  const r = turn(s, 156, { shedSkinRoll: 10 });

  assert.ok(r.state.player.confusionTurns > 0, 'Shed Skin não deve curar confusão');
});

test('Shed Skin: limites na escala 1..100 (roll 1 e roll 33 curam; roll 34 e roll 100 falham)', () => {
  let s = battle({ ability: 'shed-skin', statusCondition: 'paralysis' });
  let r = turn(s, 156, { shedSkinRoll: 1 });
  assert.equal(r.state.player.statusCondition, null, 'Roll 1 deve curar');

  s = battle({ ability: 'shed-skin', statusCondition: 'paralysis' });
  r = turn(s, 156, { shedSkinRoll: 33 });
  assert.equal(r.state.player.statusCondition, null, 'Roll 33 deve curar');

  s = battle({ ability: 'shed-skin', statusCondition: 'paralysis' });
  r = turn(s, 156, { shedSkinRoll: 34 });
  assert.equal(r.state.player.statusCondition, 'paralysis', 'Roll 34 não deve curar');

  s = battle({ ability: 'shed-skin', statusCondition: 'paralysis' });
  r = turn(s, 156, { shedSkinRoll: 100 });
  assert.equal(r.state.player.statusCondition, 'paralysis', 'Roll 100 não deve curar');
});

test('Shed Skin fronteira 1: roll 1 (mínimo) cura o status', () => {
  const s = battle({ ability: 'shed-skin', statusCondition: 'burn' });
  const r = turn(s, 156, { shedSkinRoll: 1 });
  assert.equal(r.state.player.statusCondition, null, 'Roll 1 deve curar o status');
  assert.ok(r.events.some(e => e.type === 'STATUS_CURED' && e.reason === 'SHED_SKIN'));
});

test('Shed Skin fronteira 2: roll 33 (limiar máximo de ativação) cura o status', () => {
  const s = battle({ ability: 'shed-skin', statusCondition: 'burn' });
  const r = turn(s, 156, { shedSkinRoll: 33 });
  assert.equal(r.state.player.statusCondition, null, 'Roll 33 deve curar o status');
  assert.ok(r.events.some(e => e.type === 'STATUS_CURED' && e.reason === 'SHED_SKIN'));
});

test('Shed Skin fronteira 3: roll 34 (primeiro valor acima do limiar) NÃO cura o status', () => {
  const s = battle({ ability: 'shed-skin', statusCondition: 'burn' });
  const r = turn(s, 156, { shedSkinRoll: 34 });
  assert.equal(r.state.player.statusCondition, 'burn', 'Roll 34 não deve curar o status');
  assert.ok(!r.events.some(e => e.type === 'STATUS_CURED' && e.reason === 'SHED_SKIN'));
});

test('Shed Skin fronteira 4: roll 100 (máximo absoluto) NÃO cura o status', () => {
  const s = battle({ ability: 'shed-skin', statusCondition: 'burn' });
  const r = turn(s, 156, { shedSkinRoll: 100 });
  assert.equal(r.state.player.statusCondition, 'burn', 'Roll 100 não deve curar o status');
  assert.ok(!r.events.some(e => e.type === 'STATUS_CURED' && e.reason === 'SHED_SKIN'));
});

test('Shed Skin: ausência de status primário NÃO emite eventos de cura', () => {
  const s = battle({ ability: 'shed-skin', statusCondition: null });
  const r = turn(s, 156, { shedSkinRoll: 1 });

  const cureEvent = r.events.find(e => e.type === 'STATUS_CURED' && e.reason === 'SHED_SKIN');
  assert.equal(cureEvent, undefined, 'Sem status primário, Shed Skin não deve emitir STATUS_CURED');
});

test('Shed Skin: tentativas consecutivas em turnos diferentes (falha no turno 1, cura no turno 2)', () => {
  const s = battle({ ability: 'shed-skin', statusCondition: 'toxic' });

  const r1 = turn(s, 156, { shedSkinRoll: 50 });
  assert.equal(r1.state.player.statusCondition, 'toxic', 'Turno 1 falha na cura');

  const r2 = turn(r1.state, 156, { shedSkinRoll: 10 });
  assert.equal(r2.state.player.statusCondition, null, 'Turno 2 cura toxic');
  assert.ok(r2.events.some(e => e.type === 'STATUS_CURED' && e.reason === 'SHED_SKIN'));
});

test('Shed Skin: supressão desativa a cura no final do turno', () => {
  const s = battle({ ability: 'shed-skin', statusCondition: 'burn' });
  s.player.abilitySuppressed = true;
  const r = turn(s, 156, { shedSkinRoll: 10 });

  assert.equal(r.state.player.statusCondition, 'burn', 'Sob supressão, Shed Skin não deve ativar');
});

/* ==========================================================================
   Espécies Reais do Catálogo
   ========================================================================== */

test('Espécies reais: Garchomp (#445) com Rough Skin em 1v1', () => {
  const garchomp = mon(445, [33, 156], { ability: 'rough-skin', hp: 1000, maxHp: 1000 });
  const attacker = mon(1, [33, 156], { hp: 800, maxHp: 800, currentHp: 800, speed: 200 });
  const s = E.createBattle(attacker, garchomp);
  const r = turn(s, 33);

  assert.equal(r.state.player.currentHp, 700, 'Garchomp real deve punir atacante com Rough Skin');
});

test('Espécies reais: Ferrothorn (#598) com Iron Barbs em 1v1', () => {
  const ferrothorn = mon(598, [33, 156], { ability: 'iron-barbs', hp: 1000, maxHp: 1000 });
  const attacker = mon(1, [33, 156], { hp: 800, maxHp: 800, currentHp: 800, speed: 200 });
  const s = E.createBattle(attacker, ferrothorn);
  const r = turn(s, 33);

  assert.equal(r.state.player.currentHp, 700, 'Ferrothorn real deve punir atacante com Iron Barbs');
});

test('Espécies reais: Breloom (#286) com Effect Spore em 1v1', () => {
  const breloom = mon(286, [33, 156], { ability: 'effect-spore' });
  const attacker = mon(1, [33, 156], { speed: 200 });
  const s = E.createBattle(attacker, breloom);
  const r = turn(s, 33, { effectSporeRoll: 25 }); // Sleep

  assert.equal(r.state.player.statusCondition, 'sleep', 'Breloom real deve induzir sono via Effect Spore');
});

test('Espécies reais: Umbreon (#197) com Synchronize em 1v1', () => {
  const umbreon = mon(197, [33, 156], { ability: 'synchronize', speed: 50 });
  const attacker = mon(1, [86, 156], { speed: 200 }); // Thunder Wave
  const s = E.createBattle(attacker, umbreon);
  const r = turn(s, 86);

  assert.equal(r.state.player.statusCondition, 'paralysis', 'Umbreon real deve sincronizar paralisia de volta');
});

test('Espécies reais: Seviper (#336) com Shed Skin em 1v1', () => {
  const seviper = mon(336, [33, 156], { ability: 'shed-skin', statusCondition: 'burn' });
  const enemy = mon(2, [33, 156]);
  const s = E.createBattle(seviper, enemy);
  const r = turn(s, 156, { shedSkinRoll: 20 });

  assert.equal(r.state.player.statusCondition, null, 'Seviper real deve curar status com Shed Skin');
});

/* ==========================================================================
   Formatos de Batalha (3v3, Final Stand, Doubles)
   ========================================================================== */

test('Formatos: 3v3 Singles preserva Rough Skin ao trocar', () => {
  const teamA = [mon(1, [33, 156], { speed: 200, hp: 800, maxHp: 800, currentHp: 800 }), mon(2), mon(3)];
  const teamB = [mon(445, [33, 156], { ability: 'rough-skin' }), mon(598, [33, 156], { ability: 'iron-barbs' }), mon(4)];
  const s = E.createTeamBattle(teamA, teamB);
  const r = E.resolveTurn(s, { player: act(33), enemy: act(156) });

  const activePlayer = r.state.player.team[r.state.player.activeIndex];
  assert.equal(activePlayer.currentHp, 700, '3v3 deve aplicar dano de Rough Skin no Pokémon ativo');
});

test('Formatos: Final Stand com portador de Shed Skin', () => {
  const finalMon = mon(336, [33, 156], { ability: 'shed-skin', statusCondition: 'toxic' });
  const enemy = mon(2, [33, 156]);
  const s = E.createBattle(finalMon, enemy);
  s.isFinalStand = true;

  const r = turn(s, 156, { shedSkinRoll: 10 });
  assert.equal(r.state.player.statusCondition, null, 'Final Stand deve curar status com Shed Skin');
});

test('Formatos: Doubles (2v2) identifica o agressor correto ao ativar Iron Barbs', () => {
  const pTeam = [mon(1, [33, 156], { hp: 800, maxHp: 800, currentHp: 800 }), mon(2, [33, 156], { hp: 800, maxHp: 800, currentHp: 800 }), mon(3)];
  const eTeam = [mon(598, [33, 156], { ability: 'iron-barbs' }), mon(445, [33, 156], { ability: 'rough-skin' }), mon(4)];
  const s = E.createDoublesBattle(pTeam, eTeam);

  // Player active 0 attacks Enemy active 0 with contact move (Tackle)
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, targetSlot: 0, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 156, targetSlot: 0, accuracyRoll: 1, damageRoll: 100 }
  });

  const recoilEvents = r.events.filter(e => e.type === 'RECOIL_APPLIED' && e.reason === 'iron-barbs');
  assert.equal(recoilEvents.length, 1, 'Apenas 1 recoil deve ser gerado');
  assert.equal(recoilEvents[0].target, 'player', 'Recoil de Iron Barbs deve atingir o jogador');
  assert.equal(recoilEvents[0].damage, 100, 'Dano deve ser 100');
});

/* ==========================================================================
   Integração UI e Metadados
   ========================================================================== */

test('UI Adapter: gera mensagens descritivas em português para todas as 5 habilidades H3-A', () => {
  const viewMessages = [];
  const adapter = new UI.BattleUiDomAdapter();
  adapter.view = { displayMessage: msg => viewMessages.push(msg) };

  for (const label of ['rough-skin', 'iron-barbs', 'effect-spore', 'synchronize', 'shed-skin']) {
    adapter.handleCommand({
      type: 'MOVE_FAIL_FEEDBACK',
      reason: 'P7_ABILITY',
      label,
      pokemonName: 'TesteMon'
    });
  }

  assert.ok(viewMessages.some(m => m.includes('Rough Skin feriu o atacante')));
  assert.ok(viewMessages.some(m => m.includes('Iron Barbs feriu o atacante')));
  assert.ok(viewMessages.some(m => m.includes('Effect Spore liberou esporos')));
  assert.ok(viewMessages.some(m => m.includes('Synchronize refletiu')));
  assert.ok(viewMessages.some(m => m.includes('Shed Skin curou o problema')));
});

test('AbilityRegistry: todas as 5 habilidades H3-A reportam status FULL e metadados corretos', () => {
  for (const name of ['rough-skin', 'iron-barbs', 'effect-spore', 'synchronize', 'shed-skin']) {
    const meta = Reg.getAbility(name);
    assert.ok(meta, `Habilidade ${name} deve estar registrada`);
    assert.equal(meta.phase, 'H3', `${name} deve pertencer à fase H3`);
    assert.equal(meta.status, 'FULL', `${name} deve estar com status FULL`);
    assert.ok(meta.description && meta.description.length > 20, `${name} deve ter descrição canônica completa`);
    assert.ok(Array.isArray(meta.triggers) && meta.triggers.length > 0, `${name} deve ter gatilhos documentados`);
    assert.ok(Array.isArray(meta.testFiles) && meta.testFiles.includes('tests/battle/abilities-h3a.test.js'));
  }
});

/* ==========================================================================
   Shed Skin: Sessões Reais e Distribuição Canônica
   ========================================================================== */

test('Shed Skin em sessão real: BattleSessionController com rollShedSkin 1 cura o status ao fim do turno', async () => {
  const rng = new DeterministicRandomSource();
  rng.setShedSkinSequence([1, 1]);
  rng.setAccuracySequence([1, 1]);
  rng.setDamageSequence([100, 100]);

  const controller = new BattleSessionController({
    randomSource: rng,
    view: { displayMessage: () => {}, updateCombatant: () => {}, renderActionButtons: () => {} }
  });

  const p1 = mon(336, [33, 156], { ability: 'shed-skin', statusCondition: 'burn' });
  const p2 = mon(19, [33, 156]);
  const p3 = mon(25, [33, 156]);
  const e1 = mon(20, [33, 156]);
  const e2 = mon(21, [33, 156]);
  const e3 = mon(22, [33, 156]);
  controller.battleState = E.createTeamBattle([p1, p2, p3], [e1, e2, e3]);
  controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

  await controller.submitPlayerMove(33);
  const active = controller.engine.getActiveCombatant(controller.battleState, 'player');
  assert.equal(active.statusCondition, null, 'Turno de sessão real com roll 1 deve curar o status via Shed Skin');
});

test('Shed Skin em sessão real: BattleSessionController com rollShedSkin > 33 preserva o status', async () => {
  const rng = new DeterministicRandomSource();
  rng.setShedSkinSequence([50, 50]);
  rng.setAccuracySequence([1, 1]);
  rng.setDamageSequence([100, 100]);

  const controller = new BattleSessionController({
    randomSource: rng,
    view: { displayMessage: () => {}, updateCombatant: () => {}, renderActionButtons: () => {} }
  });

  const p1 = mon(336, [33, 156], { ability: 'shed-skin', statusCondition: 'burn' });
  const p2 = mon(19, [33, 156]);
  const p3 = mon(25, [33, 156]);
  const e1 = mon(20, [33, 156]);
  const e2 = mon(21, [33, 156]);
  const e3 = mon(22, [33, 156]);
  controller.battleState = E.createTeamBattle([p1, p2, p3], [e1, e2, e3]);
  controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

  await controller.submitPlayerMove(33);
  const active = controller.engine.getActiveCombatant(controller.battleState, 'player');
  assert.equal(active.statusCondition, 'burn', 'Turno de sessão real com roll 50 não deve curar o status');
});

test('Shed Skin em sessão real: troca voluntária (SWITCH) inclui rolagens e cura se favorável', async () => {
  const rng = new DeterministicRandomSource();
  rng.setShedSkinSequence([1, 1]);
  rng.setAccuracySequence([1, 1]);
  rng.setDamageSequence([100, 100]);

  const controller = new BattleSessionController({
    randomSource: rng,
    view: { displayMessage: () => {}, updateCombatant: () => {}, renderActionButtons: () => {} }
  });

  const p1 = mon(19, [33, 156]);
  const p2 = mon(336, [33, 156], { ability: 'shed-skin', statusCondition: 'paralysis' });
  const p3 = mon(25, [33, 156]);
  const e1 = mon(20, [33, 156]);
  const e2 = mon(21, [33, 156]);
  const e3 = mon(22, [33, 156]);
  controller.battleState = E.createTeamBattle([p1, p2, p3], [e1, e2, e3]);
  controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_ACTION;

  await controller.submitPlayerSwitch(336);
  const active = controller.engine.getActiveCombatant(controller.battleState, 'player');
  assert.equal(active.id, 336, 'Pokémon ativo deve ser o trocado');
  assert.equal(active.statusCondition, null, 'Troca para portador de Shed Skin com roll 1 deve curar no final do turno');
});

test('Shed Skin distribuição: rollShedSkin() produz probabilidade canônica de 33% (escala 1..100)', () => {
  const randomSource = new BattleRandomSource();
  let hits = 0;
  const trials = 30000;
  for (let i = 0; i < trials; i++) {
    const r = randomSource.rollShedSkin();
    if (r <= 33) hits++;
  }
  const ratio = hits / trials;
  assert.ok(Math.abs(ratio - 0.33) < 0.01, `Taxa observada (${(ratio * 100).toFixed(2)}%) deve estar próxima de 33.00%`);
});

test('Shed Skin determinismo puro: ausência de roll na Engine não ativa a habilidade e não chama Math.random', () => {
  const p1 = mon(336, [33, 156], { ability: 'shed-skin', statusCondition: 'poison' });
  const e1 = mon(20, [33, 156]);
  const s = E.createBattle(p1, e1);
  const res = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 33, accuracyRoll: 1 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1 }
  });
  assert.equal(res.state.player.statusCondition, 'poison', 'Sem roll injetado, motor puro mantém o status sem ativação aleatória');
});
