const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const AI = require('../../assets/js/battle/battle-ai');
const V = require('../../assets/js/battle/battle-evaluator');
const Registry = require('../../assets/js/battle/ability-registry');
const P7 = C.P7;
const { BattleUiDomAdapter } = require('../../assets/js/ui/battle-ui-adapter');
const Mapper = require('../../assets/js/presentation/battle-presentation-mapper');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);
const mon = (id, ids = [14, 33], extra = {}) => ({
  id,
  name: 'mon-' + id,
  types: ['normal'],
  hp: 1000,
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
  abilityRoll: 100,
  ...extra
});

// Helper for Greninja-Battle-Bond (#10116)
const greninja = (ids = [56, 399, 14], extra = {}) => ({
  id: 10116,
  name: 'greninja-battle-bond',
  types: ['water', 'dark'],
  hp: 1000,
  attack: 100,
  defense: 100,
  specialAttack: 100,
  specialDefense: 100,
  speed: 200,
  moves: ids.map(move),
  ability: 'battle-bond',
  ...extra
});

const team = (m1, m2 = mon(30, [14]), m3 = mon(40, [14])) => [m1, m2, m3];
const turn = (s, id = 56, extra = {}, enemyAct = act(14)) =>
  E.resolveTurn(s, { player: act(id, extra), enemy: enemyAct });

// ============================================================================
// N.1: REGISTRY & METADATA VERIFICATION
// ============================================================================

test('H6-E Registry: battle-bond está registrada com status FULL e metadados canônicos', () => {
  const meta = Registry.getAbility('battle-bond');
  assert.ok(meta, 'battle-bond deve existir no registro');
  assert.equal(meta.id, 'battle-bond');
  assert.equal(meta.name, 'Battle Bond');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.phase, 'H6');
  assert.equal(meta.generation, 7);
  assert.deepEqual(meta.triggers, ['ON_DIRECT_KO']);
  assert.equal(meta.bearer, 'Greninja (#10116)');
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, false);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
  assert.deepEqual(meta.testFiles, ['tests/battle/abilities-h6e.test.js']);
});

test('H6-E Inventory: P7.abilityNames contém battle-bond', () => {
  assert.ok(P7.abilityNames.includes('battle-bond'), 'P7.abilityNames deve conter battle-bond');
  assert.equal(P7.defaultAbility(10116), 'battle-bond');
});

test('H6-E Registry: battle-bond é inquebrável, insupressível e não pode ser trocada ou copiada', () => {
  const meta = Registry.getAbility('battle-bond');
  assert.equal(meta.breakable, false);
  assert.equal(meta.suppressible, false);
  assert.equal(meta.copyable, false);
  assert.equal(meta.swappable, false);
});

// ============================================================================
// N.2: DIRECT KO TRIGGERS (SPECIAL, PHYSICAL, CRITICAL, MULTI-HIT)
// ============================================================================

test('H6-E Direct KO: golpe especial (Hydro Pump #56) ativa Battle Bond', () => {
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  const g = r.state.player.team[0];
  assert.equal(g.statStages.attack, 1);
  assert.equal(g.statStages.specialAttack, 1);
  assert.equal(g.statStages.speed, 1);
  assert.equal(g.battleBondTriggered, true);
  assert.ok(r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Direct KO: golpe físico (Liquidation #710) ativa Battle Bond', () => {
  const s = E.createTeamBattle(
    team(greninja([710], { attack: 500 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 710);
  const g = r.state.player.team[0];
  assert.equal(g.statStages.attack, 1);
  assert.equal(g.statStages.specialAttack, 1);
  assert.equal(g.statStages.speed, 1);
  assert.equal(g.battleBondTriggered, true);
});

test('H6-E Direct KO: acerto crítico (criticalRoll: 1) ativa Battle Bond', () => {
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500 })),
    team(mon(2, [14], { hp: 10 }), mon(3), mon(4))
  );
  const r = turn(s, 56, { criticalRoll: 1 });
  const g = r.state.player.team[0];
  assert.equal(g.statStages.attack, 1);
  assert.equal(g.statStages.specialAttack, 1);
  assert.equal(g.statStages.speed, 1);
  assert.equal(g.battleBondTriggered, true);
});

test('H6-E Direct KO: golpe multi-hit ativa Battle Bond exatamente uma vez', () => {
  const s = E.createTeamBattle(
    team(greninja([331], { attack: 500 })),
    team(mon(2, [14], { hp: 10 }), mon(3), mon(4))
  );
  const r = turn(s, 331, { hitCount: 3 });
  const g = r.state.player.team[0];
  assert.equal(g.statStages.attack, 1);
  assert.equal(g.statStages.specialAttack, 1);
  assert.equal(g.statStages.speed, 1);
  assert.equal(g.battleBondTriggered, true);
  const abilityEvents = r.events.filter(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond');
  assert.equal(abilityEvents.length, 1);
});

test('H6-E Direct KO: adversário Greninja ativa Battle Bond ao nocautear Pokémon do jogador', () => {
  const s = E.createTeamBattle(
    team(mon(1, [14], { hp: 1 }), mon(3), mon(4)),
    team(greninja([56], { specialAttack: 500, speed: 300 }), mon(5), mon(6))
  );
  const r = E.resolveTurn(s, {
    player: act(14),
    enemy: act(56)
  });
  const enemyGreninja = r.state.enemy.team[0];
  assert.equal(enemyGreninja.statStages.attack, 1);
  assert.equal(enemyGreninja.statStages.specialAttack, 1);
  assert.equal(enemyGreninja.statStages.speed, 1);
  assert.equal(enemyGreninja.battleBondTriggered, true);
});

// ============================================================================
// N.3: STAT BOOSTS, STAGE CAPS & NEGATIVE STAGES
// ============================================================================

test('H6-E Stat Boosts: gera 3 eventos STAT_STAGE_CHANGED com appliedDelta: 1', () => {
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  const stageEvents = r.events.filter(e => e.type === 'STAT_STAGE_CHANGED' && e.pokemonName === 'greninja-battle-bond');
  assert.equal(stageEvents.length, 3);
  const keys = stageEvents.map(e => e.statKey);
  assert.ok(keys.includes('attack'));
  assert.ok(keys.includes('specialAttack'));
  assert.ok(keys.includes('speed'));
  for (const ev of stageEvents) {
    assert.equal(ev.appliedDelta, 1);
  }
});

test('H6-E Stage Cap: respeita o teto de +6 e marca battleBondTriggered mesmo sem delta', () => {
  const s = E.createTeamBattle(
    team(greninja([56], {
      specialAttack: 500,
      statStages: { attack: 6, defense: 0, specialAttack: 6, specialDefense: 0, speed: 6 }
    })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  const g = r.state.player.team[0];
  assert.equal(g.statStages.attack, 6);
  assert.equal(g.statStages.specialAttack, 6);
  assert.equal(g.statStages.speed, 6);
  assert.equal(g.battleBondTriggered, true);
  assert.ok(r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Negative Stages: recupera estágios negativos (ex: -1 vira 0)', () => {
  const s = E.createTeamBattle(
    team(greninja([56], {
      specialAttack: 500,
      statStages: { attack: -1, defense: 0, specialAttack: -2, specialDefense: 0, speed: -1 }
    })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  const g = r.state.player.team[0];
  assert.equal(g.statStages.attack, 0);
  assert.equal(g.statStages.specialAttack, -1);
  assert.equal(g.statStages.speed, 0);
  assert.equal(g.battleBondTriggered, true);
});

test('H6-E Effective Stat: reflete imediatamente o aumento de 1.5x (estágio +1)', () => {
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 200, speed: 200 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  const g = r.state.player.team[0];
  assert.equal(C.getEffectiveStat(g, 'specialAttack'), 300);
  assert.equal(C.getEffectiveStat(g, 'speed'), 300);
});

// ============================================================================
// N.4: ONCE-PER-BATTLE ENFORCEMENT & SWITCH PERSISTENCE
// ============================================================================

test('H6-E Once-per-battle: segundo nocaute consecutivo NÃO ativa Battle Bond novamente', () => {
  let s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500 })),
    team(mon(2, [14], { hp: 1 }), mon(3, [14], { hp: 1 }), mon(4))
  );
  let r = turn(s, 56);
  assert.equal(r.state.player.team[0].battleBondTriggered, true);
  assert.equal(r.state.player.team[0].statStages.attack, 1);

  // Troca forçada do oponente derrotado
  s = E.resolveReplacement(r.state, { enemy: { targetPokemonId: 3 } }).state;
  r = turn(s, 56);
  const g = r.state.player.team[0];
  assert.equal(g.statStages.attack, 1);
  assert.equal(g.statStages.specialAttack, 1);
  assert.equal(g.statStages.speed, 1);
  const secondEvents = r.events.filter(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond');
  assert.equal(secondEvents.length, 0);
});

test('H6-E Switch Persistence: battleBondTriggered persiste após troca e reentrada', () => {
  let s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500 }), mon(8, [14]), mon(9, [14])),
    team(mon(2, [14], { hp: 1 }), mon(3, [14], { hp: 1 }), mon(4))
  );
  // 1º KO: ativa Battle Bond (+1)
  let r = turn(s, 56);
  assert.equal(r.state.player.team[0].battleBondTriggered, true);
  assert.equal(r.state.player.team[0].statStages.attack, 1);

  // Inimigo substitui
  s = E.resolveReplacement(r.state, { enemy: { targetPokemonId: 3 } }).state;

  // Jogador troca para Pokémon 8 (estágios resetam pelo switch padrão)
  s = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetPokemonId: 8 },
    enemy: act(14)
  }).state;
  assert.equal(s.player.team[0].statStages.attack, 0);
  assert.equal(s.player.team[0].battleBondTriggered, true);

  // Jogador troca de volta para Greninja (#10116)
  s = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetPokemonId: 10116 },
    enemy: act(14)
  }).state;
  assert.equal(s.player.team[0].battleBondTriggered, true);

  // Greninja executa novo KO: NÃO deve ativar Battle Bond novamente
  r = turn(s, 56);
  assert.equal(r.state.player.team[0].statStages.attack, 0);
  assert.equal(r.state.player.team[0].statStages.specialAttack, 0);
  assert.equal(r.state.player.team[0].statStages.speed, 0);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Fresh Battle: novo combate reseta battleBondTriggered para false', () => {
  const combatant = E.createCombatant(greninja([56]));
  assert.equal(combatant.battleBondTriggered, false);
});

// ============================================================================
// N.5: SIMULTANEOUS FAINT & RECOIL KO
// ============================================================================

test('H6-E Recoil KO: se o atacante for nocauteado pelo recuo, Battle Bond NÃO ativa', () => {
  // Move 38 = Double-Edge (recoil 33.3% do dano causado)
  const s = E.createTeamBattle(
    team(greninja([38], { attack: 500, hp: 100, currentHp: 1 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 38);
  const g = r.state.player.team[0];
  assert.equal(g.currentHp, 0);
  assert.equal(g.battleBondTriggered, false);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Recoil KO: se o atacante sobrevive ao recuo, Battle Bond ativa normalmente', () => {
  const s = E.createTeamBattle(
    team(greninja([38], { attack: 500, hp: 1000, currentHp: 500 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 38);
  const g = r.state.player.team[0];
  assert.ok(g.currentHp > 0);
  assert.equal(g.battleBondTriggered, true);
  assert.equal(g.statStages.attack, 1);
});

test('H6-E Rocky Helmet: se atacante cair por dano de Rocky Helmet, Battle Bond NÃO ativa', () => {
  // Move 710 = Liquidation (contact move)
  const s = E.createTeamBattle(
    team(greninja([710], { attack: 500, hp: 100, currentHp: 5 })),
    team(mon(2, [14], { hp: 1, item: 'rocky-helmet' }), mon(3), mon(4))
  );
  const r = turn(s, 710);
  const g = r.state.player.team[0];
  assert.equal(g.currentHp, 0);
  assert.equal(g.battleBondTriggered, false);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Life Orb: se atacante sobrevive ao nocaute, Battle Bond ativa e Life Orb aplica recuo', () => {
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500, item: 'life-orb', hp: 1000, currentHp: 1000 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, true);
  assert.equal(g.statStages.specialAttack, 1);
  assert.ok(g.currentHp < 1000);
  assert.ok(r.events.some(e => e.reason === 'LIFE_ORB'));
});

// ============================================================================
// N.6: RESIDUAL DAMAGE EXCLUSION (NO DIRECT KO)
// ============================================================================

test('H6-E Residual Damage: nocaute por Poison NÃO ativa Battle Bond', () => {
  const s = E.createTeamBattle(
    team(greninja([14], { speed: 200 })),
    team(mon(2, [14], { hp: 100, currentHp: 1, statusCondition: 'poison' }), mon(3), mon(4))
  );
  const r = turn(s, 14);
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, false);
  assert.equal(g.statStages.attack, 2); // Swords Dance buff
  assert.equal(g.statStages.specialAttack, 0);
  assert.equal(g.statStages.speed, 0);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Residual Damage: nocaute por Burn NÃO ativa Battle Bond', () => {
  const s = E.createTeamBattle(
    team(greninja([14], { speed: 200 })),
    team(mon(2, [14], { hp: 100, currentHp: 1, statusCondition: 'burn' }), mon(3), mon(4))
  );
  const r = turn(s, 14);
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, false);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Residual Damage: nocaute por Sandstorm NÃO ativa Battle Bond', () => {
  const s = E.createTeamBattle(
    team(greninja([14], { speed: 200 })),
    team(mon(2, [14], { hp: 100, currentHp: 1, types: ['electric'] }), mon(3), mon(4))
  );
  s.weather = { id: 'sand', turns: 5 };
  const r = turn(s, 14);
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, false);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

// ============================================================================
// N.7: REMAINING FOES REQUIREMENT (CANONICAL GEN IX SV RULE)
// ============================================================================

test('H6-E Remaining Foes: nocaute do ÚLTIMO Pokémon adversário NÃO ativa Battle Bond', () => {
  // Oponente possui apenas 1 Pokémon vivo (os outros 2 estão com HP 0)
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500 })),
    team(mon(2, [14], { hp: 1 }), mon(3, [14], { hp: 100, currentHp: 0 }), mon(4, [14], { hp: 100, currentHp: 0 }))
  );
  const r = turn(s, 56);
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, false);
  assert.equal(g.statStages.attack, 0);
  assert.equal(g.statStages.specialAttack, 0);
  assert.equal(g.statStages.speed, 0);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Remaining Foes: nocaute em batalha 1v1 (sem reservas) NÃO ativa Battle Bond', () => {
  const s = E.createBattle(
    greninja([56], { specialAttack: 500 }),
    mon(2, [14], { hp: 1 })
  );
  const r = turn(s, 56);
  const g = r.state.player;
  assert.equal(g.battleBondTriggered, false);
  assert.equal(g.statStages.specialAttack, 0);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Remaining Foes: nocaute do primeiro oponente quando ainda resta 1 reserva ativa Battle Bond', () => {
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500 })),
    team(mon(2, [14], { hp: 1 }), mon(3, [14], { hp: 100 }), mon(4, [14], { hp: 100, currentHp: 0 }))
  );
  const r = turn(s, 56);
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, true);
  assert.equal(g.statStages.attack, 1);
  assert.equal(g.statStages.specialAttack, 1);
  assert.equal(g.statStages.speed, 1);
});

// ============================================================================
// N.8: TRANSFORM & IMPOSTER ISOLATION
// ============================================================================

test('H6-E Transform Isolation: Ditto transformado em Greninja-Battle-Bond NÃO ativa Battle Bond', () => {
  // Ditto (#132) usa Transform (#144) em Greninja (#10116)
  const s = E.createTeamBattle(
    team(mon(132, [144], { speed: 300 })),
    team(greninja([56], { specialAttack: 500, hp: 1000 }), mon(5, [14], { hp: 1 }), mon(6, [14]))
  );
  // Turno 1: Ditto transforma em Greninja
  let r = turn(s, 144, {}, act(56));
  const ditto = r.state.player.team[0];
  assert.ok(ditto.transformOriginal, 'Ditto deve ter transformOriginal');
  assert.equal(ditto.ability, 'battle-bond');

  // Força troca do adversário para o Pokémon com 1 HP
  r.state.enemy.activeIndex = 1;
  // Turno 2: Ditto nocauteia o Pokémon adversário
  r = turn(r.state, 56, {}, act(14));
  assert.equal(r.state.player.team[0].battleBondTriggered, false);
  assert.equal(r.state.player.team[0].statStages.attack, 0);
  assert.equal(r.state.player.team[0].statStages.specialAttack, 0);
  assert.equal(r.state.player.team[0].statStages.speed, 0);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Transform Isolation: Greninja transformado em outro Pokémon NÃO ativa Battle Bond', () => {
  const g = greninja([144, 56], { speed: 300 });
  const s = E.createTeamBattle(
    team(g),
    team(mon(6, [56], { hp: 1000 }), mon(5, [14], { hp: 1 }), mon(7, [14]))
  );
  // Greninja se transforma em Charizard (#6)
  let r = turn(s, 144, {}, act(56));
  assert.ok(r.state.player.team[0].transformOriginal);

  // Alvo com 1 HP
  r.state.enemy.activeIndex = 1;
  r = turn(r.state, 56, {}, act(14));
  assert.equal(r.state.player.team[0].battleBondTriggered, false);
});

// ============================================================================
// N.9: TERASTALLIZATION COMPATIBILITY
// ============================================================================

test('H6-E Terastallization: Greninja Terastallizado ativa Battle Bond e mantém tipo Tera sem transformar em Ash', () => {
  const s = E.createTeamBattle(
    team(greninja([56], { specialMechanic: 'tera', teraType: 'water', specialAttack: 500 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56, { special: 'tera' });
  const g = r.state.player.team[0];
  assert.equal(g.tera, 'water');
  assert.deepEqual(g.types, ['water']);
  assert.equal(g.battleBondTriggered, true);
  assert.equal(g.statStages.attack, 1);
  assert.equal(g.statStages.specialAttack, 1);
  assert.equal(g.statStages.speed, 1);
  assert.equal(g.formSpeciesId, null);
  assert.ok(!r.events.some(e => e.type === 'FORM_CHANGED'));
});

// ============================================================================
// N.10: DOUBLES BATTLE INTEGRATION
// ============================================================================

test('H6-E Doubles: nocaute único em Duplas ativa Battle Bond se houver sobreviventes', () => {
  const s = E.createDoublesBattle(
    [greninja([56], { specialAttack: 500, speed: 300 }), mon(3, [14])],
    [mon(2, [14], { hp: 1 }), mon(4, [14], { hp: 500 }), mon(5, [14])]
  );
  const r = E.resolveDoublesTurn(s, {
    player: { 0: act(56, { targetRole: 'enemy', targetSlot: 0 }), 1: act(14) },
    enemy: { 0: act(14), 1: act(14) }
  });
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, true);
  assert.equal(g.statStages.attack, 1);
  assert.equal(g.statStages.specialAttack, 1);
  assert.equal(g.statStages.speed, 1);
});

test('H6-E Doubles: golpe spread (Surf #57) com nocaute duplo ativa Battle Bond APENAS UMA VEZ', () => {
  const s = E.createDoublesBattle(
    [greninja([57], { specialAttack: 500, speed: 300 }), mon(3, [14])],
    [mon(2, [14], { hp: 1 }), mon(4, [14], { hp: 1 }), mon(5, [14], { hp: 500 })]
  );
  const r = E.resolveDoublesTurn(s, {
    player: { 0: act(57), 1: act(14) },
    enemy: { 0: act(14), 1: act(14) }
  });
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, true);
  // Estágios devem ser exatamente +1 (não +2)
  assert.equal(g.statStages.attack, 1);
  assert.equal(g.statStages.specialAttack, 1);
  assert.equal(g.statStages.speed, 1);
  const bbEvents = r.events.filter(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond');
  assert.equal(bbEvents.length, 1);
});

// ============================================================================
// N.11: AI PURITY & PREDICTION
// ============================================================================

test('H6-E AI Purity: evaluateMove não muta battleBondTriggered nem os estágios', () => {
  const g = E.createCombatant(greninja([56], { specialAttack: 500 }));
  const target = E.createCombatant(mon(2, [14], { hp: 10 }));
  const before = JSON.stringify(g);

  const evalResult = V.evaluateMove(g, target, g.moves[0]);
  assert.ok(evalResult.expectedDamage > 0);
  assert.equal(JSON.stringify(g), before);
  assert.equal(g.battleBondTriggered, false);
  assert.equal(g.statStages.specialAttack, 0);
});

test('H6-E AI Decision: SMART AI escolhe golpe de forma pura sem acionar trigger', () => {
  const s = E.createTeamBattle(
    team(greninja([56, 399], { specialAttack: 500 })),
    team(mon(2, [14], { hp: 50 }), mon(3), mon(4))
  );
  const chosen = AI.chooseAction(s, 'player');
  assert.equal(chosen.action.type, 'MOVE');
  assert.equal(s.player.team[0].battleBondTriggered, false);
});

// ============================================================================
// N.12: UI ADAPTER & PRESENTATION FEEDBACK
// ============================================================================

test('H6-E UI Presentation: mapper e adapter geram mensagem canônica correta para battle-bond', () => {
  const messages = [];
  const adapter = new BattleUiDomAdapter({
    view: { displayMessage: m => messages.push(m) }
  });
  const events = [{
    type: 'MOVE_PREPARED',
    actor: 'player',
    pokemonName: 'Greninja',
    reason: 'P7_ABILITY',
    label: 'battle-bond'
  }];
  const commands = Mapper.mapEvents(events);
  for (const cmd of commands) {
    adapter.execute(cmd);
  }
  assert.ok(
    messages.some(m => m.includes('Battle Bond aumentou o Ataque, Ataque Especial e Velocidade após o nocaute!')),
    'Deve exibir a mensagem correta de Battle Bond'
  );
});

test('H6-E UI Presentation: nenhum comando FORM_CHANGED é emitido no nocaute por Battle Bond', () => {
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  assert.ok(!r.events.some(e => e.type === 'FORM_CHANGED'));
  const commands = Mapper.mapEvents(r.events);
  assert.ok(!commands.some(c => c.type === 'FORM_CHANGED'));
});

// ============================================================================
// N.13: SPECIES ELIGIBILITY & CANONICAL RESTRICTIONS
// ============================================================================

test('H6-E Species Eligibility: Greninja #10116 é a forma canônica natural elegível', () => {
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  assert.equal(r.state.player.team[0].battleBondTriggered, true);
});

test('H6-E Species Eligibility: Greninja base #658 com Battle Bond injetado NÃO ativa', () => {
  const s = E.createTeamBattle(
    team(mon(658, [56], { ability: 'battle-bond', specialAttack: 500, speed: 200 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, false);
  assert.equal(g.statStages.attack, 0);
  assert.equal(g.statStages.specialAttack, 0);
  assert.equal(g.statStages.speed, 0);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Species Eligibility: Greninja-Ash #10117 legado NÃO dispara trigger da Gen IX', () => {
  const s = E.createTeamBattle(
    team(mon(10117, [56], { ability: 'battle-bond', specialAttack: 500, speed: 200 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, false);
  assert.equal(g.statStages.attack, 0);
  assert.equal(g.statStages.specialAttack, 0);
  assert.equal(g.statStages.speed, 0);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Species Eligibility: outra espécie (ex: #1 Bulbasaur) com Battle Bond NÃO ativa', () => {
  const s = E.createTeamBattle(
    team(mon(1, [56], { ability: 'battle-bond', specialAttack: 500, speed: 200 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, false);
  assert.equal(g.statStages.attack, 0);
  assert.equal(g.statStages.specialAttack, 0);
  assert.equal(g.statStages.speed, 0);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

// ============================================================================
// N.14: UNSUPPRESSIBLE & UNBREAKABLE RULES
// ============================================================================

test('H6-E Unsuppressible: abilitySuppressed não impede o retorno de battle-bond', () => {
  const g = greninja();
  g.abilitySuppressed = true;
  assert.equal(P7.ability(g), 'battle-bond');
});

test('H6-E Unsuppressible: Core Enforcer (#687) não suprime Battle Bond após holder agir', () => {
  const s = E.createBattle(
    mon(1, [687], { speed: 50 }),
    greninja([56], { speed: 200 })
  );
  const r = turn(s, 687, {}, act(56));
  assert.equal(r.state.enemy.abilitySuppressed, false);
});

// ============================================================================
// N.15: COMPOSITION, EDGE CASES & RESISTANCE TO SECONDARY RESETS
// ============================================================================

test('H6-E Doubles Ally KO: nocaute de aliado em duplas também ativa Battle Bond se houver oponentes vivos (regra canônica de onSourceAfterFaint)', () => {
  const s = E.createDoublesBattle(
    [greninja([57], { specialAttack: 500, speed: 300 }), mon(3, [14], { hp: 1 })],
    [mon(2, [14], { hp: 1000 }), mon(4, [14], { hp: 1000 })]
  );
  // Surf atinge todos exceto o usuário; nocauteia o aliado mon(3)
  const r = E.resolveDoublesTurn(s, {
    player: { 0: act(57), 1: act(14) },
    enemy: { 0: act(14), 1: act(14) }
  });
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, true);
  assert.equal(g.statStages.attack, 1);
  assert.equal(g.statStages.specialAttack, 1);
  assert.equal(g.statStages.speed, 1);
});

test('H6-E Stat Stacking: bônus de Battle Bond compõe com Choice Scarf (1.5x speed)', () => {
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500, speed: 200, item: 'choice-scarf' })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  const g = r.state.player.team[0];
  assert.equal(g.statStages.speed, 1);
  // Base 200 * stage +1 (1.5) * Scarf (1.5) = 450
  assert.equal(C.getEffectiveStat(g, 'speed'), 450);
});

test('H6-E Stat Stacking: bônus de Battle Bond compõe com Choice Specs (1.5x specialAttack)', () => {
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 200, item: 'choice-specs' })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  const g = r.state.player.team[0];
  assert.equal(g.statStages.specialAttack, 1);
  // Base 200 * stage +1 (1.5) * Specs (1.5) = 450
  assert.equal(C.getEffectiveStat(g, 'specialAttack'), 450);
});

test('H6-E Stat Stacking: bônus de Battle Bond compõe com Choice Band (1.5x attack)', () => {
  const s = E.createTeamBattle(
    team(greninja([710], { attack: 200, item: 'choice-band' })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 710);
  const g = r.state.player.team[0];
  assert.equal(g.statStages.attack, 1);
  // Base 200 * stage +1 (1.5) * Band (1.5) = 450
  assert.equal(C.getEffectiveStat(g, 'attack'), 450);
});

test('H6-E Focus Sash / Sturdy: se o alvo sobreviver com 1 HP, Battle Bond NÃO ativa', () => {
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500 })),
    team(mon(2, [14], { hp: 100, currentHp: 100, item: 'focus-sash' }), mon(3), mon(4))
  );
  const r = turn(s, 56);
  const defender = r.state.enemy.team[0];
  assert.equal(defender.currentHp, 1);
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, false);
  assert.equal(g.statStages.attack, 0);
  assert.equal(g.statStages.specialAttack, 0);
  assert.equal(g.statStages.speed, 0);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Protect / Immune: golpe defendido por Protect não causa nocaute e não ativa', () => {
  // Move 182 = Protect
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500 })),
    team(mon(2, [182], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56, {}, act(182));
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, false);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Move Miss: golpe que erra o alvo não causa nocaute e não ativa', () => {
  const s = E.createTeamBattle(
    team(greninja([56], { specialAttack: 500 })),
    team(mon(2, [14], { hp: 1 }), mon(3), mon(4))
  );
  const r = turn(s, 56, { accuracyRoll: 100 });
  const g = r.state.player.team[0];
  assert.equal(g.battleBondTriggered, false);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'battle-bond'));
});

test('H6-E Clear Smog Interaction: Clear Smog (#499) zera os estágios de atributo mas preserva battleBondTriggered: true', () => {
  let s = E.createTeamBattle(
    team(greninja([56, 14], { specialAttack: 500 })),
    team(mon(2, [14], { hp: 1 }), mon(3, [499], { hp: 1000 }), mon(4))
  );
  let r = turn(s, 56);
  assert.equal(r.state.player.team[0].battleBondTriggered, true);
  assert.equal(r.state.player.team[0].statStages.attack, 1);

  // Inimigo substitui para mon-3 que possui Clear Smog (#499)
  s = E.resolveReplacement(r.state, { enemy: { targetPokemonId: 3 } }).state;

  // Turno seguinte: Greninja usa Swords Dance (#14) e mon-3 usa Clear Smog (#499) resetando os estágios de Greninja
  r = turn(s, 14, {}, act(499));
  const g = r.state.player.team[0];
  // Estágios resetados para 0 por Clear Smog
  assert.equal(g.statStages.attack, 0);
  assert.equal(g.statStages.specialAttack, 0);
  assert.equal(g.statStages.speed, 0);
  // battleBondTriggered continua true e impede nova ativação
  assert.equal(g.battleBondTriggered, true);
});
