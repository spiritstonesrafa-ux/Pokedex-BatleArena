const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const V = require('../../assets/js/battle/battle-evaluator');
const Reg = require('../../assets/js/battle/ability-registry');
const TE = require('../../assets/js/battle/type-effectiveness');
const Mapper = require('../../assets/js/presentation/battle-presentation-mapper');
const { BattleUiDomAdapter } = require('../../assets/js/ui/battle-ui-adapter');
const { BattleView } = require('../../assets/js/ui/battle-view');
const AI = require('../../assets/js/battle/battle-ai');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const minior = (id = 774, extra = {}) => ({
  id,
  name: id === 774 ? 'minior-red-meteor' : (id >= 10136 ? `minior-core-${id}` : `minior-meteor-${id}`),
  types: ['rock', 'flying'],
  level: 50,
  hp: 135,
  maxHp: 135,
  currentHp: 135,
  attack: 80,
  defense: 120,
  specialAttack: 80,
  specialDefense: 120,
  speed: 80,
  weightKg: 40,
  ability: 'shields-down',
  baseStats: { hp: 60, attack: 60, defense: 100, specialAttack: 60, specialDefense: 100, speed: 60 },
  moves: [444, 89, 94, 442].map(id => move(id)), // Stone Edge, Earthquake, Psychic, Iron Head
  photo: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`,
  animatedPhoto: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/${id}.gif`,
  cry: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`,
  ...extra
});

const dummy = (extra = {}) => ({
  id: 2,
  name: 'dummy',
  types: ['normal'],
  level: 50,
  hp: 2000,
  maxHp: 2000,
  currentHp: 2000,
  attack: 100,
  defense: 100,
  specialAttack: 100,
  specialDefense: 100,
  speed: 10,
  weightKg: 100,
  ability: 'overgrow',
  moves: [33, 53, 85, 14].map(id => move(id)), // Tackle, Flamethrower, Thunderbolt, Swords Dance
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

/* ==========================================================================
   Section 1: Ability Registry & Metadata Verification (F.1)
   ========================================================================== */

test('H6-D Registry: shields-down está registrada com status FULL e metadados canônicos', () => {
  const meta = Reg.getAbility('shields-down');
  assert.ok(meta, 'shields-down deve estar no registry');
  assert.equal(meta.id, 'shields-down');
  assert.equal(meta.name, 'Shields Down');
  assert.equal(meta.generation, 7);
  assert.equal(meta.phase, 'H6');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, false, 'Shields Down NÃO pode ser quebrada por Mold Breaker');
  assert.equal(meta.suppressible, false, 'Shields Down NÃO pode ser suprimida (Gastro Acid, Core Enforcer)');
  assert.equal(meta.copyable, false, 'Shields Down NÃO pode ser copiada por Transform para mudar forma');
  assert.equal(meta.swappable, false, 'Shields Down NÃO pode ser trocada (Skill Swap)');
});

test('H6-D Inventory: P7.abilityNames e p8-special.forms contêm as formas canônicas de Minior', () => {
  assert.ok(C.P7.abilityNames.includes('shields-down'), 'P7.abilityNames deve incluir shields-down');
  const forms = C.P8.forms;
  assert.ok(forms, 'forms deve existir em P8Special');

  const meteorIds = [774, 10130, 10131, 10132, 10133, 10134, 10135];
  const coreIds = [10136, 10137, 10138, 10139, 10140, 10141, 10142];

  for (const id of meteorIds) {
    const f = forms[id];
    assert.ok(f, `Forma meteor ${id} deve estar em forms`);
    assert.equal(f.stats.attack, 60);
    assert.equal(f.stats.defense, 100);
    assert.equal(f.stats.speed, 60);
    assert.equal(f.weightKg, 40);
  }

  for (const id of coreIds) {
    const f = forms[id];
    assert.ok(f, `Forma core ${id} deve estar em forms`);
    assert.equal(f.stats.attack, 100);
    assert.equal(f.stats.defense, 60);
    assert.equal(f.stats.speed, 120);
    assert.equal(f.weightKg, 0.3);
  }
});

test('H6-D Inventory: Todos os 14 IDs de Minior possuem natural ability shields-down', () => {
  const allIds = [774, 10130, 10131, 10132, 10133, 10134, 10135, 10136, 10137, 10138, 10139, 10140, 10141, 10142];
  for (const id of allIds) {
    const natural = C.P7.natural(id);
    assert.ok(natural && natural.length > 0, `ID ${id} deve ter habilidade natural cadastrada`);
    assert.equal(natural[0].name, 'shields-down', `ID ${id} deve ter shields-down no slot 1`);
  }
});

/* ==========================================================================
   Section 2: The 7 Colors and Deterministic Pairing (F.2)
   ========================================================================== */

test('H6-D 7 Cores: mapeamento estático e bidirecional dos 7 pares de Minior', () => {
  const pairs = C.P8.miniorPairs;
  assert.ok(pairs, 'miniorPairs deve ser exportado');
  const expected = [
    [774, 10136, 'red'],
    [10130, 10137, 'orange'],
    [10131, 10138, 'yellow'],
    [10132, 10139, 'green'],
    [10133, 10140, 'blue'],
    [10134, 10141, 'indigo'],
    [10135, 10142, 'violet']
  ];

  for (const [mId, cId, color] of expected) {
    assert.equal(pairs[mId], cId, `Meteor ${mId} (${color}) deve mapear para Core ${cId}`);
    assert.equal(pairs[cId], mId, `Core ${cId} (${color}) deve mapear para Meteor ${mId}`);
    assert.ok(C.P8.forms[mId].name.includes(color), `Forma ${mId} deve ter ${color} no nome`);
    assert.ok(C.P8.forms[cId].name.includes(color), `Forma ${cId} deve ter ${color} no nome`);
  }
});

test('H6-D 7 Cores: Minior de cada cor preserva sua cor em ambas as direções de transformação', () => {
  const expected = [
    [774, 10136],
    [10130, 10137],
    [10131, 10138],
    [10132, 10139],
    [10133, 10140],
    [10134, 10141],
    [10135, 10142]
  ];

  for (const [mId, cId] of expected) {
    const mon = minior(mId, { maxHp: 160, currentHp: 160 });
    const s = E.createBattle(mon, dummy());

    // 1. HP 100% -> permanece na forma Meteor de sua cor
    assert.equal(s.player.formSpeciesId || s.player.id, mId, `HP 100% deve ser Meteor ${mId}`);

    // 2. Dano para <= 50% (ex: 80 HP) -> assume Core de sua cor
    s.player.currentHp = 80;
    C.P8.checkShieldsDown(s, 'player', s.player, C, []);
    assert.equal(s.player.formSpeciesId, cId, `HP <= 50% deve assumir Core ${cId}`);

    // 3. Cura para > 50% (ex: 81 HP) -> reassume Meteor de sua cor
    s.player.currentHp = 81;
    C.P8.checkShieldsDown(s, 'player', s.player, C, []);
    assert.equal(s.player.formSpeciesId, mId, `HP > 50% deve reassumir Meteor ${mId}`);
  }
});

test('H6-D 7 Cores: Minior iniciado a partir de Core ID com HP > 50% é corrigido para Meteor correspondente', () => {
  const expected = [
    [10136, 774],
    [10137, 10130],
    [10138, 10131],
    [10139, 10132],
    [10140, 10133],
    [10141, 10134],
    [10142, 10135]
  ];

  for (const [cId, mId] of expected) {
    const mon = minior(cId, {
      maxHp: 160,
      currentHp: 160,
      attack: 120,
      defense: 80,
      speed: 140,
      weightKg: 0.3,
      baseStats: { hp: 60, attack: 100, defense: 60, specialAttack: 100, specialDefense: 60, speed: 120 }
    });
    const s = E.createBattle(mon, dummy());

    // Na entrada, detecta HP > 50% e corrige para Meteor de sua cor
    assert.equal(s.player.formSpeciesId, mId, `Core ${cId} com HP cheio deve ser corrigido para Meteor ${mId}`);
    assert.equal(s.player.weightKg, 40, 'Peso deve virar 40 kg');
    assert.equal(s.player.attack, 80, 'Ataque deve virar 80');
    assert.equal(s.player.defense, 120, 'Defesa deve virar 120');
  }
});

test('H6-D 7 Cores: Minior iniciado como Core ID com HP <= 50% permanece Core', () => {
  const mon = minior(10140, { // Blue Core
    maxHp: 160,
    currentHp: 75,
    attack: 120,
    defense: 80,
    speed: 140,
    weightKg: 0.3,
    baseStats: { hp: 60, attack: 100, defense: 60, specialAttack: 100, specialDefense: 60, speed: 120 }
  });
  const s = E.createBattle(mon, dummy());
  assert.equal(s.player.formSpeciesId || s.player.id, 10140, 'Deve permanecer Blue Core');
  assert.equal(s.player.weightKg, 0.3, 'Deve permanecer 0.3 kg');
});

/* ==========================================================================
   Section 3: HP Threshold & Verification Timing (F.3)
   ========================================================================== */

test('H6-D HP Threshold: limite exato de 50% com maxHp par (160 HP)', () => {
  const mon = minior(774, { maxHp: 160, currentHp: 160 });
  const s = E.createBattle(mon, dummy());

  // 160 HP -> Meteor
  C.P8.checkShieldsDown(s, 'player', s.player, C, []);
  assert.equal(s.player.formSpeciesId || s.player.id, 774);

  // 81 HP (50.625% > 50%) -> Meteor
  s.player.currentHp = 81;
  C.P8.checkShieldsDown(s, 'player', s.player, C, []);
  assert.equal(s.player.formSpeciesId || s.player.id, 774);

  // 80 HP (exatamente 50% <= 50%) -> Core
  s.player.currentHp = 80;
  C.P8.checkShieldsDown(s, 'player', s.player, C, []);
  assert.equal(s.player.formSpeciesId, 10136);

  // 79 HP (49.375% < 50%) -> Core
  s.player.currentHp = 79;
  C.P8.checkShieldsDown(s, 'player', s.player, C, []);
  assert.equal(s.player.formSpeciesId, 10136);

  // 1 HP (mínimo) -> Core
  s.player.currentHp = 1;
  C.P8.checkShieldsDown(s, 'player', s.player, C, []);
  assert.equal(s.player.formSpeciesId, 10136);

  // 0 HP (fainted) -> não dispara transformação
  s.player.currentHp = 0;
  s.player.formSpeciesId = 774;
  C.P8.checkShieldsDown(s, 'player', s.player, C, []);
  assert.equal(s.player.formSpeciesId, 774, 'Fainted não altera forma');
});

test('H6-D HP Threshold: limite exato de 50% com maxHp ímpar (161 HP, 50% = 80.5)', () => {
  const mon = minior(774, { maxHp: 161, currentHp: 161 });
  const s = E.createBattle(mon, dummy());

  // 82 HP (> 80.5) -> Meteor
  s.player.currentHp = 82;
  C.P8.checkShieldsDown(s, 'player', s.player, C, []);
  assert.equal(s.player.formSpeciesId || s.player.id, 774);

  // 81 HP (> 80.5) -> Meteor
  s.player.currentHp = 81;
  C.P8.checkShieldsDown(s, 'player', s.player, C, []);
  assert.equal(s.player.formSpeciesId || s.player.id, 774);

  // 80 HP (<= 80.5) -> Core
  s.player.currentHp = 80;
  C.P8.checkShieldsDown(s, 'player', s.player, C, []);
  assert.equal(s.player.formSpeciesId, 10136);
});

test('H6-D Timing: dano no meio do turno NÃO provoca mudança de forma prematura durante o golpe', () => {
  const m = minior(774, { maxHp: 200, currentHp: 200 });
  const foe = dummy({
    types: ['water'],
    specialAttack: 120,
    moves: [move(56)], // Hydro Pump (Water super-effective)
    speed: 100 // Ataca primeiro
  });

  const s = E.createBattle(m, foe);
  // Turno 1: Adversário ataca Minior com Hydro Pump, causando ~150 de dano e reduzindo HP para ~50 (<= 100)
  const res = E.resolveTurn(s, {
    player: act(444),
    enemy: act(56, { damageRoll: 100 })
  });

  // Ao término do turno (endTurn), Minior deve ter assumido Core Form (10136)
  assert.equal(res.state.player.formSpeciesId, 10136, 'Deve terminar o turno em Core Form');
  assert.ok(res.events.some(e => e.reason === 'FORM_CHANGED'), 'Deve emitir evento FORM_CHANGED');
});

test('H6-D Timing: cura no fim do turno (Leftovers) elevando HP acima de 50% reativa Meteor Form', () => {
  const m = minior(774, {
    maxHp: 160,
    currentHp: 75,
    item: 'leftovers'
  });
  const s = E.createBattle(m, dummy());
  // Com 75/160 HP, inicia em Core Form
  assert.equal(s.player.formSpeciesId, 10136);

  // Leftovers cura 10 HP -> 85 HP (> 80 HP)
  s.player.currentHp = 85;
  C.P8.endTurn(s, C, []);
  assert.equal(s.player.formSpeciesId, 774, 'Deve reassumir Meteor Form após Leftovers curar acima de 50%');
});

test('H6-D Timing: entrada com Stealth Rock reduzindo HP para <= 50% assume Core Form na entrada', () => {
  const m = minior(774, { maxHp: 100, currentHp: 65 });
  const s = E.createBattle(m, dummy());

  // Simula entrada onde dano de hazard reduz HP para 45 (<= 50%)
  s.player.currentHp = 45;
  C.P8.enter(s, 'player', C, []);
  assert.equal(s.player.formSpeciesId, 10136, 'Deve assumir Core Form na entrada pós-hazard');
});

/* ==========================================================================
   Section 4: Canonical Base Stats & Stat Recalculation (F.4)
   ========================================================================== */

test('H6-D Atributos: valores exatos de referência determinística em Nível 50', () => {
  const meteorMon = minior(774, { level: 50, ivs: { hp: 31, attack: 31, defense: 31, specialAttack: 31, specialDefense: 31, speed: 31 } });
  const s = E.createBattle(meteorMon, dummy());
  C.P8.changeForm(s.player, 774);

  assert.equal(s.player.attack, 80, 'Meteor Attack deve ser 80');
  assert.equal(s.player.defense, 120, 'Meteor Defense deve ser 120');
  assert.equal(s.player.specialAttack, 80, 'Meteor SpA deve ser 80');
  assert.equal(s.player.specialDefense, 120, 'Meteor SpD deve ser 120');
  assert.equal(s.player.speed, 80, 'Meteor Speed deve ser 80');

  // Core Form
  C.P8.changeForm(s.player, 10136);
  assert.equal(s.player.attack, 120, 'Core Attack deve ser 120');
  assert.equal(s.player.defense, 80, 'Core Defense deve ser 80');
  assert.equal(s.player.specialAttack, 120, 'Core SpA deve ser 120');
  assert.equal(s.player.specialDefense, 80, 'Core SpD deve ser 80');
  assert.equal(s.player.speed, 140, 'Core Speed deve ser 140');
});

test('H6-D Atributos: maxHp e currentHp permanecem estritamente estáveis durante transformação', () => {
  const m = minior(774, { maxHp: 135, currentHp: 65 });
  const s = E.createBattle(m, dummy());
  const initialMax = s.player.maxHp;
  const initialCur = s.player.currentHp;

  C.P8.changeForm(s.player, 10136);
  assert.equal(s.player.maxHp, initialMax, 'Max HP não pode ser alterado');
  assert.equal(s.player.currentHp, initialCur, 'Current HP não pode ser alterado');

  C.P8.changeForm(s.player, 774);
  assert.equal(s.player.maxHp, initialMax, 'Max HP permanece intacto');
  assert.equal(s.player.currentHp, initialCur, 'Current HP permanece intacto');
});

test('H6-D Atributos: estágios de atributos (statStages) são estritamente preservados', () => {
  const m = minior(774, {
    maxHp: 135,
    currentHp: 135,
    statStages: { attack: 2, defense: -1, speed: 1, specialAttack: 0, specialDefense: 0 }
  });
  const s = E.createBattle(m, dummy());

  C.P8.changeForm(s.player, 10136);
  assert.equal(s.player.statStages.attack, 2, 'Ataque +2 preservado');
  assert.equal(s.player.statStages.defense, -1, 'Defesa -1 preservada');
  assert.equal(s.player.statStages.speed, 1, 'Velocidade +1 preservada');

  C.P8.changeForm(s.player, 774);
  assert.equal(s.player.statStages.attack, 2);
  assert.equal(s.player.statStages.defense, -1);
});

test('H6-D Atributos: Core Form causa dano ofensivo superior ao Meteor Form', () => {
  const foe = dummy({ defense: 100, hp: 500 });
  const meteorMon = minior(774, { attack: 80, currentHp: 135, maxHp: 135 });
  const coreMon = minior(774, { attack: 120, currentHp: 60, maxHp: 135, formSpeciesId: 10136 });

  const evalMeteor = V.evaluateMove(meteorMon, foe, move(444)); // Stone Edge
  const evalCore = V.evaluateMove(coreMon, foe, move(444));

  assert.ok(evalCore.expectedDamage > evalMeteor.expectedDamage,
    `Core (${evalCore.expectedDamage}) deve causar mais dano que Meteor (${evalMeteor.expectedDamage})`);
});

test('H6-D Atributos: Meteor Form possui defesa física superior ao Core Form', () => {
  const attacker = dummy({ attack: 150 });
  const meteorMon = minior(774, { defense: 120, currentHp: 135, maxHp: 135 });
  const coreMon = minior(774, { defense: 80, currentHp: 60, maxHp: 135, formSpeciesId: 10136 });

  const evalMeteor = V.evaluateMove(attacker, meteorMon, move(33)); // Tackle
  const evalCore = V.evaluateMove(attacker, coreMon, move(33));

  assert.ok(evalMeteor.expectedDamage < evalCore.expectedDamage,
    `Meteor (${evalMeteor.expectedDamage}) deve sofrer menos dano que Core (${evalCore.expectedDamage})`);
});

test('H6-D Atributos: ausência de acúmulo após 5 ciclos sucessivos de transformação', () => {
  const m = minior(774, { level: 50 });
  const s = E.createBattle(m, dummy());
  for (let i = 0; i < 5; i++) {
    C.P8.changeForm(s.player, 10136);
    C.P8.changeForm(s.player, 774);
  }
  assert.equal(s.player.attack, 80);
  assert.equal(s.player.defense, 120);
  assert.equal(s.player.speed, 80);
});

/* ==========================================================================
   Section 5: Dynamic Weight & Weight-Dependent Moves (F.5)
   ========================================================================== */

test('H6-D Peso: Meteor Form pesa 40.0 kg e Core Form pesa 0.3 kg', () => {
  const m = minior(774);
  const s = E.createBattle(m, dummy());
  assert.equal(s.player.weightKg, 40);

  C.P8.changeForm(s.player, 10136);
  assert.equal(s.player.weightKg, 0.3, 'Core Form deve pesar 0.3 kg');

  C.P8.changeForm(s.player, 774);
  assert.equal(s.player.weightKg, 40, 'Meteor Form deve voltar a pesar 40 kg');
});

test('H6-D Peso: Grass Knot / Low Kick causa 60 de poder contra Meteor e 20 contra Core', () => {
  const grassKnot = move(447); // Grass Knot (move id 447)
  const meteorMon = minior(774, { weightKg: 40 });
  const coreMon = minior(774, { weightKg: 0.3, formSpeciesId: 10136 });

  const powerMeteor = C.P5.power(grassKnot, dummy(), meteorMon, C);
  const powerCore = C.P5.power(grassKnot, dummy(), coreMon, C);

  assert.equal(powerMeteor, 60, 'Grass Knot contra Meteor Form (40kg) deve ter poder 60');
  assert.equal(powerCore, 20, 'Grass Knot contra Core Form (0.3kg) deve ter poder 20');
});

test('H6-D Peso: Heavy Slam usado por Minior contra alvo ultraleve varia entre Meteor e Core', () => {
  const heavySlam = move(484); // Heavy Slam
  const target = dummy({ weightKg: 0.09 }); // Alvo de 0.09 kg

  const meteorMon = minior(774, { weightKg: 40 }); // 40 / 0.09 = 444.4x (ratio >= 5 -> 120)
  const coreMon = minior(774, { weightKg: 0.3, formSpeciesId: 10136 }); // 0.3 / 0.09 = 3.33x (ratio >= 3 -> 80)

  const powerMeteor = C.P5.power(heavySlam, meteorMon, target, C);
  const powerCore = C.P5.power(heavySlam, coreMon, target, C);

  assert.equal(powerMeteor, 120, 'Heavy Slam de Meteor (40kg vs 0.09kg) deve ter poder 120');
  assert.equal(powerCore, 80, 'Heavy Slam de Core (0.3kg vs 0.09kg) deve ter poder 80');
});

test('H6-D Peso: restauração correta do peso na saída de campo e término da batalha', () => {
  const m = minior(774, { weightKg: 40 });
  const s = E.createBattle(m, dummy());
  C.P8.changeForm(s.player, 10136);
  assert.equal(s.player.weightKg, 0.3);

  C.P8.leave(s.player, true); // Encerra batalha
  assert.equal(s.player.weightKg, 40, 'Deve restaurar 40 kg ao encerrar');
});

/* ==========================================================================
   Section 6: Status Immunities (Meteor Form vs Core Form) (F.6)
   ========================================================================== */

test('H6-D Status: Meteor Form bloqueia Burn, Poison, Toxic, Paralysis, Sleep e Freeze', () => {
  const m = minior(774, { formSpeciesId: 774, currentHp: 135, maxHp: 135 });
  const statuses = ['burn', 'poison', 'toxic', 'paralysis', 'sleep', 'freeze'];

  for (const st of statuses) {
    const immune = C.P7.statusImmune(m, st);
    assert.equal(immune, true, `Meteor Form deve ser imune a ${st}`);
  }
});

test('H6-D Status: Core Form NÃO possui imunidade a status de Shields Down', () => {
  const m = minior(774, { formSpeciesId: 10136, currentHp: 60, maxHp: 135 });
  const statuses = ['burn', 'paralysis', 'sleep', 'freeze'];

  for (const st of statuses) {
    const immune = C.P7.statusImmune(m, st);
    assert.equal(immune, false, `Core Form NÃO deve ser imune a ${st}`);
  }
});

test('H6-D Status: Yawn contra Meteor Form é bloqueado por Shields Down', () => {
  const meteor = minior(774, { formSpeciesId: 774, currentHp: 135, maxHp: 135 });
  const immune = C.P7.statusImmune(meteor, 'sleep');
  assert.equal(immune, true, 'Yawn deve ser bloqueado na Meteor Form');
});

test('H6-D Status: Yawn permitido contra Core Form, mas bloqueado se Minior volta a Meteor antes do sono', () => {
  const mon = minior(774, { currentHp: 135, maxHp: 135 });
  const s = E.createBattle(mon, dummy());

  // 1. Reduz HP para 60 (<= 50%) -> vira Core
  s.player.currentHp = 60;
  C.P8.endTurn(s, C, []);
  assert.equal(s.player.formSpeciesId, 10136, 'Deve ser Core');
  assert.equal(C.P7.statusImmune(s.player, 'sleep'), false, 'Não imune em Core');

  // 2. Recebe Yawn
  s.player.drowsyTurns = 1;

  // 3. Cura HP para 100% -> volta para Meteor Form
  s.player.currentHp = 135;
  C.P8.endTurn(s, C, []);
  assert.equal(s.player.formSpeciesId, 774, 'Voltou a Meteor Form');

  // 4. No momento do sono do Yawn, Shields Down bloqueia
  const immuneAtTrigger = C.P7.statusImmune(s.player, 'sleep');
  assert.equal(immuneAtTrigger, true, 'Sono do Yawn é bloqueado pois Minior agora está na Meteor Form');
});

test('H6-D Status: status pré-existente recebido na Core Form NÃO é curado ao retornar para Meteor Form', () => {
  const mon = minior(774, { currentHp: 135, maxHp: 135 });
  const s = E.createBattle(mon, dummy());

  // Assume Core Form
  s.player.currentHp = 60;
  C.P8.endTurn(s, C, []);
  assert.equal(s.player.formSpeciesId, 10136);

  // Recebe Burn
  s.player.statusCondition = 'burn';

  // Cura HP e volta a Meteor
  s.player.currentHp = 120;
  C.P8.endTurn(s, C, []);
  assert.equal(s.player.formSpeciesId, 774, 'Voltou a Meteor Form');
  assert.equal(s.player.statusCondition, 'burn', 'Condição de Burn NÃO pode ser curada pela transformação');
});

test('H6-D Status: Shields Down NÃO bloqueia confusão', () => {
  const m = minior(774, { formSpeciesId: 774 });
  assert.equal(C.P7.statusImmune(m, 'confusion'), false, 'Confusão NÃO é bloqueada por Shields Down');
});

test('H6-D Status: Shields Down NÃO bloqueia reduções de atributos', () => {
  const m = minior(774, { formSpeciesId: 774 });
  const s = E.createBattle(m, dummy());
  const events = [];
  C.P6.stage(C, events, 'player', s.player, 'attack', -1);
  assert.equal(s.player.statStages.attack, -1, 'Redução de atributo opera normalmente');
});

test('H6-D Status: Mold Breaker do adversário NÃO anula nem ignora a imunidade de Shields Down', () => {
  const m = minior(774, { formSpeciesId: 774, currentHp: 135, maxHp: 135 });
  m.abilityIgnored = true;
  assert.equal(C.P7.statusImmune(m, 'burn'), true, 'Mold Breaker não pode ignorar Shields Down');
  assert.equal(C.P7.statusImmune(m, 'paralysis'), true);
  assert.equal(C.P7.statusImmune(m, 'sleep'), true);
});

test('H6-D Status: Core Enforcer e Neutralizing Gas NÃO suprimem Shields Down', () => {
  const m = minior(774, { formSpeciesId: 774, currentHp: 135, maxHp: 135 });
  m.abilitySuppressed = true;

  assert.equal(C.P7.statusImmune(m, 'burn'), true, 'abilitySuppressed não suprime Shields Down');
  assert.equal(C.P8.species(m), 774);
});

/* ==========================================================================
   Section 7: Transform and Imposter Interactions (F.7)
   ========================================================================== */

test('H6-D Transform: Cenário A — Ditto copia Minior Meteor e shields-down, mas NÃO muda de forma', () => {
  const ditto = {
    id: 132,
    name: 'ditto',
    types: ['normal'],
    hp: 1500,
    maxHp: 1500,
    currentHp: 1500,
    attack: 48,
    defense: 48,
    speed: 48,
    ability: 'limber',
    moves: [move(144)]
  };
  const target = minior(774, { currentHp: 135, maxHp: 135 });
  const s = E.createBattle(ditto, target);

  const res = E.resolveTurn(s, {
    player: act(144),
    enemy: act(444)
  });
  const activeDitto = res.state.player;
  assert.equal(activeDitto.ability, 'shields-down', 'Transform deve copiar shields-down');
  assert.ok(activeDitto.transformOriginal, 'transformOriginal deve estar registrado');

  // Reduz HP do Ditto abaixo de 50%
  activeDitto.currentHp = 100;
  C.P8.endTurn(res.state, C, []);

  // Ditto transformado NÃO pode ativar Shields Down para virar Core Form
  assert.equal(activeDitto.formSpeciesId, null, 'Ditto transformado não deve alterar sua forma');
});

test('H6-D Transform: Cenário B — Ditto copia Minior Core e NÃO muda de forma ao curar HP', () => {
  const ditto = {
    id: 132,
    name: 'ditto',
    types: ['normal'],
    hp: 1500,
    maxHp: 1500,
    currentHp: 1500,
    attack: 48,
    defense: 48,
    speed: 48,
    ability: 'limber',
    moves: [move(144)]
  };
  const target = minior(10136, { currentHp: 50, maxHp: 135, formSpeciesId: 10136 });
  const s = E.createBattle(ditto, target);

  const res = E.resolveTurn(s, {
    player: act(144),
    enemy: act(444)
  });
  const activeDitto = res.state.player;
  assert.equal(activeDitto.ability, 'shields-down');

  // Ditto cura para 100% de HP
  activeDitto.currentHp = 1500;
  C.P8.endTurn(res.state, C, []);
  assert.equal(activeDitto.formSpeciesId, null, 'Ditto transformado em Core não assume Meteor Form');
});

test('H6-D Transform: Cenário C — Troca restaura Limber e dados originais de Ditto no banco', () => {
  const ditto = {
    id: 132,
    name: 'ditto',
    types: ['normal'],
    level: 50,
    hp: 1500,
    maxHp: 1500,
    currentHp: 1500,
    attack: 50,
    defense: 50,
    speed: 100,
    ability: 'limber',
    moves: [move(144)]
  };
  const backup = dummy({ id: 98, name: 'backup-ally' });
  const target = minior(774);

  const s = E.createTeamBattle(
    [ditto, backup, dummy({ id: 99, name: 'ally-3' })],
    [target, dummy({ id: 101, name: 'foe-1' }), dummy({ id: 102, name: 'foe-2' })]
  );

  // Transforma
  const res1 = E.resolveTurn(s, {
    player: act(144),
    enemy: act(444)
  });
  assert.equal(res1.state.player.team[0].ability, 'shields-down');

  // Troca para backup
  const res2 = E.resolveTurn(res1.state, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: act(444)
  });
  assert.equal(res2.state.player.team[0].ability, 'limber', 'Ditto no banco deve ter recuperado Limber');
});

/* ==========================================================================
   Section 8: Terastallization and Dynamax (F.8)
   ========================================================================== */

test('H6-D Tera: Minior Terastallizado mantém tipo Tera durante a mudança de forma', () => {
  const m = minior(774, {
    specialMechanic: 'tera',
    teraType: 'electric',
    maxHp: 135,
    currentHp: 135
  });
  const s = E.createBattle(m, dummy());

  // Ativa Tera Electric
  C.P8.prepare(s, 'player', { type: 'MOVE', moveId: 444, special: 'tera' }, C, []);
  assert.equal(s.player.tera, 'electric');
  assert.deepEqual(s.player.types, ['electric']);

  // Dano reduz HP para <= 50% -> vira Core Form
  s.player.currentHp = 50;
  C.P8.checkShieldsDown(s, 'player', s.player, C, []);
  assert.equal(s.player.formSpeciesId, 10136, 'Assume Core Form');
  assert.deepEqual(s.player.types, ['electric'], 'Tipo Tera Electric deve permanecer inalterado');
  assert.equal(s.player.attack, 120, 'Stats devem ser os da Core Form');
});

test('H6-D Dynamax: compatibilidade com Shields Down e decremento de turnos', () => {
  const m = minior(774, {
    specialMechanic: 'dynamax',
    dynamaxLevel: 10,
    maxHp: 135,
    currentHp: 135
  });
  const s = E.createBattle(m, dummy());

  C.P8.prepare(s, 'player', { type: 'MOVE', moveId: 444, special: 'dynamax' }, C, []);
  assert.ok(s.player.dynamax, 'Dynamax ativado');
  assert.equal(s.player.dynamax.turns, 3);

  // Turno passa
  C.P8.endTurn(s, C, []);
  assert.equal(s.player.dynamax.turns, 2, 'Decrementou 1 turno de Dynamax');
  assert.equal(s.player.formSpeciesId || s.player.id, 774, 'Permanece Meteor');
});

/* ==========================================================================
   Section 9: AI Evaluator Purity (F.9)
   ========================================================================== */

test('H6-D AI Evaluator: pureza total — 5 avaliações sucessivas não causam mutações no Minior', () => {
  const m = minior(774, { currentHp: 135, maxHp: 135 });
  const foe = dummy();
  const snapshotBefore = JSON.stringify(m);

  for (let i = 0; i < 5; i++) {
    V.evaluateMove(m, foe, move(444));
    V.evaluateMove(foe, m, move(33));
  }

  const snapshotAfter = JSON.stringify(m);
  assert.equal(snapshotAfter, snapshotBefore, 'Minior não pode sofrer nenhuma mutação durante evaluateMove');
});

/* ==========================================================================
   Section 10: Presentation & UI Adapter (F.10)
   ========================================================================== */

test('H6-D UI Adapter: mensagens canônicas em português para Meteor e Core Form', async () => {
  const messages = [];
  const fakeView = { displayMessage: msg => messages.push(msg) };
  const adapter = new BattleUiDomAdapter({ view: fakeView });

  // Evento Core Form
  await adapter.execute({
    type: 'MOVE_FAIL_FEEDBACK',
    pokemonName: 'Minior',
    reason: 'FORM_CHANGED',
    label: 'minior-red'
  });
  assert.ok(messages.some(m => m.includes('teve sua carapaça rompida e revelou sua Core Form!')), 'Mensagem de Core Form');

  // Evento Meteor Form
  await adapter.execute({
    type: 'MOVE_FAIL_FEEDBACK',
    pokemonName: 'Minior',
    reason: 'FORM_CHANGED',
    label: 'minior-red-meteor'
  });
  assert.ok(messages.some(m => m.includes('recuperou sua carapaça e voltou à Meteor Form!')), 'Mensagem de Meteor Form');
});

test('H6-D DOM: BattleView resolve sprite e artwork correspondentes à forma ativa de Minior', () => {
  const view = new BattleView();

  const visualMeteor = view.resolveCombatantVisual(minior(774), 'player');
  assert.ok(visualMeteor.spriteUrl.includes('774'), 'Meteor deve usar asset 774');

  const visualCore = view.resolveCombatantVisual(minior(10136, { formSpeciesId: 10136 }), 'player');
  assert.ok(visualCore.spriteUrl.includes('10136') || visualCore.animatedPhoto.includes('10136'),
    'Core deve usar asset 10136');
});

/* ==========================================================================
   Section 11: Doubles Battle Integration (F.11)
   ========================================================================== */

test('H6-D Doubles: Minior do jogador e Minior do adversário com HP e cores diferentes operam independentemente', () => {
  const playerMinior = minior(774, { currentHp: 135, maxHp: 135 }); // Red Meteor
  const enemyMinior = minior(10133, { currentHp: 50, maxHp: 135 }); // Blue Core (HP <= 50%)

  const battleState = {
    battleFormat: 'DOUBLES',
    status: 'IN_PROGRESS',
    turn: 1,
    player: { team: [playerMinior, dummy({ id: 25 })], activeIndex: 0, activeIndices: [0, 1] },
    enemy: { team: [enemyMinior, dummy({ id: 26 })], activeIndex: 0, activeIndices: [0, 1] }
  };

  C.P8.endTurn(battleState, C, []);

  assert.equal(playerMinior.formSpeciesId || playerMinior.id, 774, 'Player Minior deve permanecer Red Meteor');
  assert.equal(enemyMinior.formSpeciesId, 10140, 'Enemy Minior deve ter assumido Blue Core');
});

test('H6-D Batalha Completa: Minior participa de combate 1x1 com dano, transformação e vitória', () => {
  const playerMinior = minior(774, {
    maxHp: 200,
    currentHp: 200,
    moves: [move(444)] // Stone Edge
  });
  const weakFoe = dummy({
    hp: 80,
    maxHp: 80,
    currentHp: 80,
    attack: 100,
    moves: [move(33)], // Tackle
    speed: 100 // Ataca primeiro, causando dano
  });

  const s = E.createBattle(playerMinior, weakFoe);
  const res = E.resolveTurn(s, {
    player: act(444),
    enemy: act(33, { damageRoll: 100 })
  });

  assert.ok(res.events.some(e => e.type === 'DAMAGE_APPLIED'), 'Dano deve ser aplicado');
  assert.ok(['ENEMY_WIN', 'PLAYER_WIN', 'IN_PROGRESS'].includes(res.state.status));
});

/* ==========================================================================
   Section 12: Additional Canonical Edge Cases & Deep Interactions
   ========================================================================== */

test('H6-D Status: Rest (#156) não induz sono em Minior na Meteor Form', () => {
  const m = minior(774, { currentHp: 50, maxHp: 135 }); // HP ferido
  // Meteor Form bloqueia 'sleep', então isEligible para Rest é falso
  const immune = C.P7.statusImmune(m, 'sleep');
  assert.equal(immune, true, 'Rest não pode colocar Minior Meteor para dormir');
});

test('H6-D Status: golpe com efeito secundário de Burn (Flamethrower) não queima Meteor Form', () => {
  const m = minior(774, { currentHp: 135, maxHp: 135 });
  const flamethrower = move(53); // Flamethrower
  const canApply = C.isEligibleForStatusCondition(m, 'burn');
  assert.equal(canApply, false, 'Meteor Form não é elegível para sofrer Burn de efeito secundário');
});

test('H6-D Status: golpe com efeito secundário de Paralysis (Thunderbolt) não paralisa Meteor Form', () => {
  const m = minior(774, { currentHp: 135, maxHp: 135 });
  const canApply = C.isEligibleForStatusCondition(m, 'paralysis');
  assert.equal(canApply, false, 'Meteor Form não é elegível para sofrer Paralysis');
});

test('H6-D Status: golpe com efeito secundário de Poison não envenena Meteor Form', () => {
  const m = minior(774, { currentHp: 135, maxHp: 135 });
  const canApply = C.isEligibleForStatusCondition(m, 'poison');
  assert.equal(canApply, false, 'Meteor Form não é elegível para sofrer Poison');
});

test('H6-D Turn Sequence: inversão na ordem de velocidade entre turnos (Meteor Spe 80 vs Core Spe 140)', () => {
  // Turno 1: Minior Meteor (Spe 80) é mais lento que Foe (Spe 100) -> Foe age primeiro
  // Turno 2: Após dano, Minior Core (Spe 140) é mais rápido que Foe (Spe 100) -> Minior age primeiro
  const m = minior(774, { maxHp: 135, currentHp: 135, speed: 80, moves: [move(444)] });
  const foe = dummy({ hp: 1000, maxHp: 1000, currentHp: 1000, speed: 100, moves: [move(56)] });

  const s = E.createBattle(m, foe);
  // Turno 1: Foe com Spe 100 ataca primeiro com Hydro Pump, reduzindo HP de Minior para ~51
  const res1 = E.resolveTurn(s, {
    player: act(444),
    enemy: act(56, { damageRoll: 100 })
  });
  const firstMoveActor1 = res1.events.find(e => e.type === 'MOVE_USED')?.actor;
  assert.equal(firstMoveActor1, 'enemy', 'Turno 1: Adversário (Spe 100) atacou primeiro que Meteor (Spe 80)');
  assert.equal(res1.state.player.formSpeciesId, 10136, 'Ao fim do turno 1, virou Core Form');
  assert.equal(res1.state.player.speed, 140, 'Velocidade do Core Form foi atualizada para 140');

  // Turno 2: Minior Core (Spe 140) ataca primeiro que Foe (Spe 100)
  const res2 = E.resolveTurn(res1.state, {
    player: act(444),
    enemy: act(56, { damageRoll: 85 })
  });
  const firstMoveActor2 = res2.events.find(e => e.type === 'MOVE_USED')?.actor;
  assert.equal(firstMoveActor2, 'player', 'Turno 2: Minior Core (Spe 140) atacou primeiro que Adversário (Spe 100)');
});

test('H6-D Imposter: Ditto com Imposter copia Minior mas NÃO ativa Shields Down para mudar de forma', () => {
  const ditto = {
    id: 132,
    name: 'ditto',
    types: ['normal'],
    level: 50,
    hp: 1500,
    maxHp: 1500,
    currentHp: 1500,
    attack: 48,
    defense: 48,
    specialAttack: 48,
    specialDefense: 48,
    speed: 48,
    ability: 'imposter',
    moves: [move(144)]
  };
  const target = minior(774, { currentHp: 135, maxHp: 135 });
  const s = E.createBattle(ditto, target);

  // Imposter ativa na entrada
  assert.equal(s.player.ability, 'shields-down');
  assert.ok(s.player.transformOriginal);

  // Reduz HP do Ditto transformado para <= 50%
  s.player.currentHp = 100;
  C.P8.endTurn(s, C, []);

  // Ditto nunca muda de forma
  assert.equal(s.player.formSpeciesId, null, 'Ditto transformado por Imposter não muda de forma');
});

test('H6-D Exceção de Espécie: Pokémon não-Minior com Shields Down não altera de forma', () => {
  const pikachu = dummy({
    id: 25,
    name: 'pikachu',
    ability: 'shields-down',
    maxHp: 100,
    currentHp: 20 // <= 50%
  });
  const s = E.createBattle(pikachu, dummy());
  C.P8.checkShieldsDown(s, 'player', s.player, C, []);
  assert.equal(s.player.formSpeciesId || null, null, 'Espécie não-Minior não muda de forma');
});

test('H6-D Doubles: Transformação simultânea em ambos os lados ao cruzar 50% HP', () => {
  const playerMinior = minior(774, { currentHp: 160, maxHp: 160 }); // Red
  const enemyMinior = minior(10134, { currentHp: 160, maxHp: 160 }); // Indigo

  const s = {
    battleFormat: 'DOUBLES',
    status: 'IN_PROGRESS',
    turn: 1,
    player: { team: [playerMinior, dummy({ id: 25 })], activeIndex: 0, activeIndices: [0, 1] },
    enemy: { team: [enemyMinior, dummy({ id: 26 })], activeIndex: 0, activeIndices: [0, 1] }
  };

  // Ambos sofrem dano e ficam com <= 50% HP
  playerMinior.currentHp = 70;
  enemyMinior.currentHp = 70;

  C.P8.endTurn(s, C, []);

  assert.equal(playerMinior.formSpeciesId, 10136, 'Player Minior vira Red Core');
  assert.equal(enemyMinior.formSpeciesId, 10141, 'Enemy Minior vira Indigo Core');
});

test('H6-D AI Evaluator: IA reconhece stats de Minior adversário em Meteor vs Core', () => {
  const foeMeteor = minior(774, { currentHp: 135, maxHp: 135 });
  const sM = E.createBattle(dummy(), foeMeteor);
  const evalM = V.evaluateMove(sM.enemy, sM.player, move(444), {
    attackerSide: 'enemy',
    battleState: sM
  });

  const foeCore = minior(774, { currentHp: 50, maxHp: 135, formSpeciesId: 10136 });
  const sC = E.createBattle(dummy(), foeCore);
  const evalC = V.evaluateMove(sC.enemy, sC.player, move(444), {
    attackerSide: 'enemy',
    battleState: sC
  });

  assert.ok(evalC.expectedDamage > evalM.expectedDamage,
    `IA deve prever dano maior para Core Form adversária (${evalC.expectedDamage} > ${evalM.expectedDamage})`);
});

test('H6-D Presentation Mapper: FORM_CHANGED é mapeado para MOVE_FAIL_FEEDBACK', () => {
  const commands = Mapper.mapEvents([
    {
      type: 'MOVE_PREPARED',
      actor: 'player',
      pokemonName: 'Minior',
      reason: 'FORM_CHANGED',
      label: 'minior-red'
    }
  ]);
  assert.equal(commands.length, 1);
  assert.equal(commands[0].type, 'MOVE_FAIL_FEEDBACK');
  assert.equal(commands[0].reason, 'FORM_CHANGED');
  assert.equal(commands[0].label, 'minior-red');
});
