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

const wishiwashi = (extra = {}) => ({
  id: 746,
  name: 'wishiwashi',
  types: ['water'],
  level: 50,
  hp: 120,
  maxHp: 120,
  currentHp: 120,
  attack: 40,
  defense: 40,
  specialAttack: 45,
  specialDefense: 45,
  speed: 60,
  ability: 'schooling',
  baseStats: { hp: 45, attack: 20, defense: 20, specialAttack: 25, specialDefense: 25, speed: 40 },
  moves: [56, 89, 231, 58].map(id => move(id)), // Hydro Pump, Earthquake, Iron Tail, Ice Beam
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/746.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/746.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/746.ogg',
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
  ability: 'overgrow',
  moves: [33, 53, 85, 14].map(id => move(id)), // Tackle, Flamethrower, Thunderbolt, Swords Dance (status)
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

test('H6-C Registry: schooling está registrada com status FULL e metadados canônicos', () => {
  const meta = Reg.getAbility('schooling');
  assert.ok(meta, 'schooling deve estar no registry');
  assert.equal(meta.id, 'schooling');
  assert.equal(meta.name, 'Schooling');
  assert.equal(meta.generation, 7);
  assert.equal(meta.phase, 'H6');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, false, 'Schooling NÃO pode ser quebrada por Mold Breaker');
  assert.equal(meta.suppressible, false, 'Schooling NÃO pode ser suprimida (Gastro Acid, Core Enforcer)');
  assert.equal(meta.copyable, false, 'Schooling NÃO pode ser copiada (Trace, Role Play)');
  assert.equal(meta.swappable, false, 'Schooling NÃO pode ser trocada (Skill Swap)');
  assert.ok(meta.triggers.includes('ON_ENTRY'), 'Deve disparar ON_ENTRY');
  assert.ok(meta.triggers.includes('ON_RESIDUAL_START'), 'Deve disparar ON_RESIDUAL_START');
  assert.ok(meta.testFiles.includes('tests/battle/abilities-h6c.test.js'));
  assert.ok(meta.bearer.includes('Wishiwashi'));
});

test('H6-C Inventory: P7.abilityNames e p8-special.forms contêm as formas canônicas de Wishiwashi', () => {
  assert.ok(C.P7.abilityNames.includes('schooling'), 'P7.abilityNames deve conter schooling');
  const forms = C.P8.forms;
  assert.ok(forms[746], 'Forma 746 (Solo) deve existir em forms');
  assert.ok(forms[10127], 'Forma 10127 (School) deve existir em forms');
  assert.equal(forms[746].name, 'wishiwashi-solo');
  assert.equal(forms[10127].name, 'wishiwashi-school');
  assert.deepEqual(forms[746].types, ['water']);
  assert.deepEqual(forms[10127].types, ['water']);
  assert.deepEqual(forms[746].stats, { hp: 45, attack: 20, defense: 20, specialAttack: 25, specialDefense: 25, speed: 40 });
  assert.deepEqual(forms[10127].stats, { hp: 45, attack: 140, defense: 130, specialAttack: 140, specialDefense: 135, speed: 30 });
});

/* ==========================================================================
   Section 2: Level & HP Thresholds (F.2)
   ========================================================================== */

test('Level 19 com HP cheio (100%): permanece em Solo Form (#746)', () => {
  const w = wishiwashi({ level: 19, hp: 50, maxHp: 50, currentHp: 50 });
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.formSpeciesId, null, 'Não deve ter formSpeciesId ativa');
  assert.equal(C.P8.species(s.player), 746, 'Species deve ser 746 (Solo)');
  assert.equal(s.initialP7Events.filter(e => e.reason === 'FORM_CHANGED').length, 0, 'Nenhum evento FORM_CHANGED');
});

test('Level 20 com HP cheio (100%): transforma-se em School Form (#10127)', () => {
  const w = wishiwashi({ level: 20, hp: 54, maxHp: 54, currentHp: 54 });
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.formSpeciesId, 10127, 'Deve transformar para School Form');
  assert.equal(C.P8.species(s.player), 10127);
  assert.ok(s.initialP7Events.some(e => e.reason === 'FORM_CHANGED' && e.label === 'wishiwashi-school'));
});

test('Level 50 com HP cheio (100%): transforma-se em School Form (#10127)', () => {
  const w = wishiwashi({ level: 50, hp: 120, maxHp: 120, currentHp: 120 });
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.formSpeciesId, 10127);
  assert.equal(s.player.attack, 160);
  assert.equal(s.player.defense, 150);
  assert.equal(s.player.specialAttack, 160);
  assert.equal(s.player.specialDefense, 155);
  assert.equal(s.player.speed, 50);
});

test('Level 100 com HP cheio (100%): transforma-se em School Form (#10127)', () => {
  const w = wishiwashi({ level: 100, hp: 231, maxHp: 231, currentHp: 231 });
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.formSpeciesId, 10127);
  assert.equal(s.player.attack, 316);
  assert.equal(s.player.defense, 296);
  assert.equal(s.player.specialAttack, 316);
  assert.equal(s.player.specialDefense, 306);
  assert.equal(s.player.speed, 96);
});

test('HP exatamente em 25% (ex: 50/200 HP): permanece/transforma em Solo Form (#746)', () => {
  // maxHp = 200, 25% = 50. HP = 50 <= 50 -> Solo Form
  const w = wishiwashi({ level: 50, hp: 200, maxHp: 200, currentHp: 50 });
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.formSpeciesId, null, 'Com 25% exato não deve transformar para School');
  assert.equal(C.P8.species(s.player), 746);
});

test('HP ligeiramente acima de 25% (ex: 51/200 HP): transforma em School Form (#10127)', () => {
  const w = wishiwashi({ level: 50, hp: 200, maxHp: 200, currentHp: 51 });
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.formSpeciesId, 10127, '51/200 > 25% deve transformar para School');
});

test('HP ligeiramente abaixo de 25% (ex: 49/200 HP): permanece em Solo Form (#746)', () => {
  const w = wishiwashi({ level: 50, hp: 200, maxHp: 200, currentHp: 49 });
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.formSpeciesId, null);
  assert.equal(C.P8.species(s.player), 746);
});

test('HP não divisível por 4 (maxHp 121): 30/121 (<= 25%) é Solo e 31/121 (> 25%) é School', () => {
  // 121 / 4 = 30.25
  const wSolo = wishiwashi({ level: 50, hp: 121, maxHp: 121, currentHp: 30 });
  const sSolo = E.createBattle(wSolo, dummy());
  assert.equal(sSolo.player.formSpeciesId, null);
  assert.equal(C.P8.species(sSolo.player), 746);

  const wSchool = wishiwashi({ level: 50, hp: 121, maxHp: 121, currentHp: 31 });
  const sSchool = E.createBattle(wSchool, dummy());
  assert.equal(sSchool.player.formSpeciesId, 10127);
  assert.equal(C.P8.species(sSchool.player), 10127);
});

test('HP zero (fainted): não dispara transformação', () => {
  const w = wishiwashi({ level: 50, hp: 120, maxHp: 120, currentHp: 0 });
  const events = [];
  C.P8.checkSchooling({}, 'player', w, C, events);
  assert.equal(events.length, 0, 'Combatente fainted não altera forma');
  assert.equal(w.formSpeciesId, undefined);
});

test('Wishiwashi iniciado já na forma 10127 com nível 19: reverte para Solo Form (#746)', () => {
  const w = wishiwashi({ id: 10127, formSpeciesId: 10127, level: 19, hp: 50, maxHp: 50, currentHp: 50 });
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.formSpeciesId, 746, 'Deve reverter para Solo Form');
});

/* ==========================================================================
   Section 3: Form Change Dynamics & Turn Lifecycle (F.3)
   ========================================================================== */

test('Solo -> School na entrada da batalha', () => {
  const w = wishiwashi();
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.formSpeciesId, 10127);
  assert.ok(s.initialP7Events.some(e => e.reason === 'FORM_CHANGED' && e.label === 'wishiwashi-school'));
});

test('School -> Solo ao término do turno quando HP cai abaixo de 25%', () => {
  const w = wishiwashi({ currentHp: 120 });
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.formSpeciesId, 10127);

  // Reduz HP para 20 (<= 30)
  s.player.currentHp = 20;
  const res = E.resolveTurn(s, {
    player: act(56, { damageRoll: 85 }),
    enemy: act(14) // Swords Dance (status, no damage dealt)
  });

  assert.equal(res.state.player.formSpeciesId, 746, 'Deve mudar para Solo Form');
  assert.equal(res.state.player.attack, 40);
  assert.equal(res.state.player.specialAttack, 45);
  assert.ok(res.events.some(e => e.reason === 'FORM_CHANGED' && e.label === 'wishiwashi-solo'));
});

test('Dano no meio do turno NÃO provoca mudança de forma prematura durante o ataque', () => {
  // Wishiwashi mais lento que o inimigo
  const w = wishiwashi({ speed: 10, currentHp: 35 });
  const fastEnemy = dummy({ speed: 200, attack: 100 });
  const s = E.createBattle(w, fastEnemy);

  assert.equal(s.player.formSpeciesId, 10127, 'Começa em School Form');

  const res = E.resolveTurn(s, {
    player: act(56, { damageRoll: 100 }), // Hydro Pump
    enemy: act(33, { damageRoll: 100 })  // Tackle
  });

  const moves = res.events.filter(e => e.type === 'MOVE_USED');
  assert.equal(moves[0].moveName, 'tackle', 'Inimigo atacou primeiro');
  assert.equal(moves[1].moveName, 'hydro-pump', 'Wishiwashi atacou depois');

  // Hydro Pump causou dano alto usando Special Attack de School Form (160)
  const dmg = res.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(dmg.damage > 100, 'Dano desferido usando Atributos de School Form antes do fim de turno');

  // A transformação para Solo só ocorreu após todas as ações, no fim de turno
  assert.equal(res.state.player.formSpeciesId, 746);
});

test('Ciclo completo: School -> Solo -> School (dano e cura)', () => {
  const w = wishiwashi({ currentHp: 120 });
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.formSpeciesId, 10127);

  // Turno 1: Dano derruba para 20 HP -> vira Solo ao fim do turno
  s.player.currentHp = 20;
  const t1 = E.resolveTurn(s, { player: act(56, { damageRoll: 85 }), enemy: act(14) });
  assert.equal(t1.state.player.formSpeciesId, 746);

  // Turno 2: Permanece com 20 HP -> continua Solo, SEM emissão duplicada de evento
  const t2 = E.resolveTurn(t1.state, { player: act(56, { damageRoll: 85 }), enemy: act(14) });
  assert.equal(t2.state.player.formSpeciesId, 746);
  assert.equal(t2.events.filter(e => e.reason === 'FORM_CHANGED').length, 0, 'Zero eventos de mudança redundante');

  // Turno 3: Curado para 100 HP (> 30) -> volta para School Form ao fim do turno
  t2.state.player.currentHp = 100;
  const t3 = E.resolveTurn(t2.state, { player: act(56, { damageRoll: 85 }), enemy: act(14) });
  assert.equal(t3.state.player.formSpeciesId, 10127);
  assert.equal(t3.state.player.attack, 160);
  assert.ok(t3.events.some(e => e.reason === 'FORM_CHANGED' && e.label === 'wishiwashi-school'));
});

test('Preservação da espécie permanente e do tipo Water', () => {
  const w = wishiwashi();
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.id, 746, 'ID permanente deve permanecer 746');
  assert.deepEqual(s.player.types, ['water'], 'Tipagem Water preservada em School');

  s.player.currentHp = 20;
  const t1 = E.resolveTurn(s, { player: act(56, { damageRoll: 85 }), enemy: act(14) });
  assert.equal(t1.state.player.id, 746, 'ID permanente preservado em Solo');
  assert.deepEqual(t1.state.player.types, ['water'], 'Tipagem Water preservada em Solo');
});

test('Atualização de fotos e sprites na mudança de forma', () => {
  const w = wishiwashi();
  const s = E.createBattle(w, dummy());
  // Em School Form
  assert.equal(s.player.photo, C.P8.forms[10127].photo);
  assert.equal(s.player.animatedPhoto, C.P8.forms[10127].animatedPhoto);

  // Vira Solo Form
  s.player.currentHp = 20;
  const t1 = E.resolveTurn(s, { player: act(56, { damageRoll: 85 }), enemy: act(14) });
  assert.equal(t1.state.player.photo, C.P8.forms[746].photo);
  assert.equal(t1.state.player.animatedPhoto, C.P8.forms[746].animatedPhoto);
});

test('Troca de Pokémon restaura a forma original no banco e reavalia na reentrada', () => {
  const w1 = wishiwashi();
  const w2 = dummy({ id: 98, name: 'ally-mon-1' });
  const w3 = dummy({ id: 99, name: 'ally-mon-2' });
  const s = E.createTeamBattle([w1, w2, w3], [dummy({ id: 101, name: 'foe-1' }), dummy({ id: 102, name: 'foe-2' }), dummy({ id: 103, name: 'foe-3' })]);

  // Wishiwashi entra como líder e assume School Form
  assert.equal(s.player.team[0].formSpeciesId, 10127);

  // Troca para o reserva ally-mon-1
  const t1 = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: act(14)
  });

  // No banco, Wishiwashi foi restaurado pela rotina de leave
  assert.equal(t1.state.player.team[0].formSpeciesId, null, 'formSpeciesId limpo no banco');
  assert.equal(t1.state.player.team[0].attack, 40, 'Ataque restaurado no banco');

  // Troca de volta para Wishiwashi com HP cheio
  const t2 = E.resolveTurn(t1.state, {
    player: { type: 'SWITCH', targetIndex: 0 },
    enemy: act(14)
  });

  // Ao reentrar com HP cheio, reassume School Form
  assert.equal(t2.state.player.team[0].formSpeciesId, 10127, 'Reassume School Form na reentrada');
});

/* ==========================================================================
   Section 4: Stats, Damage & Battle Calculations (F.4)
   ========================================================================== */

test('Cálculo de atributos exato em Level 50', () => {
  const wSolo = wishiwashi({ level: 50, currentHp: 20 });
  const s = E.createBattle(wSolo, dummy());
  // Solo Form
  assert.equal(s.player.attack, 40);
  assert.equal(s.player.defense, 40);
  assert.equal(s.player.specialAttack, 45);
  assert.equal(s.player.specialDefense, 45);
  assert.equal(s.player.speed, 60);

  // School Form
  const wSchool = wishiwashi({ level: 50, currentHp: 120 });
  const s2 = E.createBattle(wSchool, dummy());
  assert.equal(s2.player.attack, 160);
  assert.equal(s2.player.defense, 150);
  assert.equal(s2.player.specialAttack, 160);
  assert.equal(s2.player.specialDefense, 155);
  assert.equal(s2.player.speed, 50);
});

test('Max HP e Current HP permanecem estritamente estáveis durante a transformação', () => {
  const w = wishiwashi({ level: 50, maxHp: 120, currentHp: 80 });
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.maxHp, 120, 'Max HP inalterado');
  assert.equal(s.player.currentHp, 80, 'Current HP não sofre cura nem dano artificial');

  s.player.currentHp = 25;
  const t1 = E.resolveTurn(s, { player: act(56, { damageRoll: 85 }), enemy: act(14) });
  assert.equal(t1.state.player.maxHp, 120);
  assert.equal(t1.state.player.currentHp, 25);
});

test('Estágios de atributos (statStages) são preservados através da mudança de forma', () => {
  const w = wishiwashi();
  const s = E.createBattle(w, dummy());
  // Aplica +2 de Attack no combatente
  s.player.statStages.attack = 2;

  // School Form com +2 Attack: 160 * 2 = 320 efetivo
  assert.equal(C.getEffectiveStat(s.player, 'attack'), 320);

  // Reverte para Solo Form ao fim do turno
  s.player.currentHp = 20;
  const t1 = E.resolveTurn(s, { player: act(56, { damageRoll: 85 }), enemy: act(14) });

  // Estágio +2 Attack PRESERVADO na Solo Form: 40 * 2 = 80 efetivo
  assert.equal(t1.state.player.statStages.attack, 2, 'Estágio de ataque preservado');
  assert.equal(C.getEffectiveStat(t1.state.player, 'attack'), 80);
});

test('Dano físico e especial muito maiores na School Form em comparação à Solo Form', () => {
  // Solo Form causando Earthquake (move 89, power 100)
  const wSolo = wishiwashi({ currentHp: 20 });
  const sSolo = E.createBattle(wSolo, dummy());
  const resSolo = E.resolveTurn(sSolo, { player: act(89, { damageRoll: 100 }), enemy: act(14) });
  const dmgSolo = resSolo.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  // School Form causando o mesmo golpe
  const wSchool = wishiwashi({ currentHp: 120 });
  const sSchool = E.createBattle(wSchool, dummy());
  const resSchool = E.resolveTurn(sSchool, { player: act(89, { damageRoll: 100 }), enemy: act(14) });
  const dmgSchool = resSchool.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.ok(dmgSchool > dmgSolo * 3, `Dano School (${dmgSchool}) deve ser mais que o triplo do Solo (${dmgSolo})`);
});

test('Defesa física da School Form (150) reduz significativamente o dano comparada à Solo Form (40)', () => {
  const attacker = dummy({ attack: 100 });

  // Dano em Solo Form (Defense 40)
  const wSolo = wishiwashi({ currentHp: 100 });
  const sSolo = E.createBattle(wSolo, attacker);
  sSolo.player.formSpeciesId = 746;
  sSolo.player.defense = 40;
  const resSolo = E.resolveTurn(sSolo, { player: act(56), enemy: act(33, { damageRoll: 100 }) });
  const dmgSolo = resSolo.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'enemy').damage;

  // Dano em School Form (Defense 150)
  const wSchool = wishiwashi({ currentHp: 120 });
  const sSchool = E.createBattle(wSchool, attacker);
  const resSchool = E.resolveTurn(sSchool, { player: act(56), enemy: act(33, { damageRoll: 100 }) });
  const dmgSchool = resSchool.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'enemy').damage;

  assert.ok(dmgSolo > dmgSchool * 2.5, `Dano sofrido Solo (${dmgSolo}) deve ser mais que o dobro do School (${dmgSchool})`);
});

test('Ordem de velocidade: Solo Form (Spe 60) é mais rápida que adversário com Spe 55; School Form (Spe 50) é mais lenta', () => {
  const opponent = dummy({ speed: 55 });

  // Solo Form (Speed 60 > 55) -> age antes
  const wSolo = wishiwashi({ currentHp: 20 });
  const sSolo = E.createBattle(wSolo, opponent);
  const resSolo = E.resolveTurn(sSolo, { player: act(56, { damageRoll: 85 }), enemy: act(14) });
  const movesSolo = resSolo.events.filter(e => e.type === 'MOVE_USED');
  assert.equal(movesSolo[0].pokemonName, 'wishiwashi', 'Solo Form agiu primeiro');

  // School Form (Speed 50 < 55) -> age depois
  const wSchool = wishiwashi({ currentHp: 120 });
  const sSchool = E.createBattle(wSchool, opponent);
  const resSchool = E.resolveTurn(sSchool, { player: act(56, { damageRoll: 85 }), enemy: act(14) });
  const movesSchool = resSchool.events.filter(e => e.type === 'MOVE_USED');
  assert.equal(movesSchool[0].pokemonName, 'dummy', 'Oponente agiu primeiro contra School Form');
});

test('Ausência de acúmulo de atributos após múltiplas transformações sucessivas', () => {
  const w = wishiwashi({ currentHp: 120 });
  const s = E.createBattle(w, dummy());

  for (let cycle = 0; cycle < 3; cycle++) {
    // Solo
    s.player.currentHp = 20;
    C.P8.checkSchooling(s, 'player', s.player, C, []);
    assert.equal(s.player.attack, 40);
    assert.equal(s.player.specialAttack, 45);

    // School
    s.player.currentHp = 100;
    C.P8.checkSchooling(s, 'player', s.player, C, []);
    assert.equal(s.player.attack, 160);
    assert.equal(s.player.specialAttack, 160);
  }
});

/* ==========================================================================
   Section 5: Protections & Exceptions (F.5)
   ========================================================================== */

test('Schooling não é suprimível: abilitySuppressed=true NÃO anula a habilidade nem a forma', () => {
  const w = wishiwashi({ currentHp: 120, abilitySuppressed: true });
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.formSpeciesId, 10127, 'Schooling deve transformar mesmo se abilitySuppressed for true');
  assert.equal(C.P7.ability(s.player), 'schooling', 'P7.ability deve retornar schooling mesmo sob supressão');
});

test('Core Enforcer (#687) não suprime Schooling de Wishiwashi', () => {
  const dragon = dummy({ id: 149, types: ['dragon'], moves: [move(687)] });
  const w = wishiwashi({ currentHp: 120 });
  const s = E.createBattle(w, dragon);

  // Wishiwashi age primeiro, depois Dragon usa Core Enforcer (#687)
  const res = E.resolveTurn(s, {
    player: act(56, { damageRoll: 85 }),
    enemy: act(687, { damageRoll: 85 })
  });

  assert.equal(res.state.player.abilitySuppressed, false, 'Core Enforcer não pode suprimir Schooling');
});

test('Mold Breaker do adversário NÃO impede a Schooling de Wishiwashi', () => {
  const moldOpponent = dummy({ ability: 'mold-breaker' });
  const w = wishiwashi({ currentHp: 120 });
  const s = E.createBattle(w, moldOpponent);
  assert.equal(s.player.formSpeciesId, 10127);
  assert.equal(C.P7.defenderAbility(moldOpponent, s.player, move(33)), 'schooling');
});

test('Cenário A — Transform contra Wishiwashi Solo: copia Schooling sem ativar mudança de forma', () => {
  const ditto = {
    id: 132,
    name: 'ditto',
    types: ['normal'],
    level: 50,
    hp: 150,
    maxHp: 150,
    currentHp: 150,
    attack: 50,
    defense: 50,
    specialAttack: 50,
    specialDefense: 50,
    speed: 100,
    ability: 'limber',
    moves: [move(144)] // Transform
  };
  // Wishiwashi Solo (Lv 19 para garantir forma Solo permanente)
  const wSolo = wishiwashi({ level: 19, hp: 60, maxHp: 60, currentHp: 60 });
  const s = E.createBattle(ditto, wSolo);

  // Ditto usa Transform contra Wishiwashi Solo
  const res = E.resolveTurn(s, {
    player: act(144),
    enemy: act(56)
  });

  // Ditto copia a habilidade Schooling
  assert.equal(res.state.player.ability, 'schooling', 'Transform copia a habilidade Schooling');
  assert.ok(res.state.player.transformOriginal, 'Ditto é registrado como transformado');
  assert.equal(res.state.player.transformOriginal.ability, 'limber', 'Habilidade original Limber foi salva');
  // Schooling NÃO altera a forma de Ditto
  assert.equal(res.state.player.formSpeciesId, null, 'Schooling não deve atribuir formSpeciesId a Ditto');
  assert.equal(res.state.player.id, 132, 'Identidade permanente da espécie é preservada como Ditto');
  const formEvents = res.events.filter(e => e.type === 'MOVE_PREPARED' && e.reason === 'FORM_CHANGED' && e.actor === 'player');
  assert.equal(formEvents.length, 0, 'Ditto não deve emitir evento FORM_CHANGED');
});

test('Cenário B — Transform contra Wishiwashi School: copia forma e stats sem transformações posteriores indevidas', () => {
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
    specialAttack: 50,
    specialDefense: 50,
    speed: 20, // mais lento para que Wishiwashi já esteja em School Form
    ability: 'limber',
    moves: [move(144)]
  };
  // Wishiwashi entra e vira School Form
  const wSchool = wishiwashi({ currentHp: 120, speed: 60 });
  const s = E.createBattle(ditto, wSchool);
  assert.equal(s.enemy.formSpeciesId, 10127);

  // Ditto usa Transform contra Wishiwashi School
  const res = E.resolveTurn(s, {
    player: act(144),
    enemy: act(56)
  });

  // Ditto copiou os atributos de combate da School Form e a habilidade Schooling
  assert.equal(res.state.player.ability, 'schooling');
  assert.equal(res.state.player.attack, 160);
  assert.equal(res.state.player.specialAttack, 160);
  assert.ok(res.state.player.transformOriginal);

  // Turno 2: Ditto sofre dano que deixa seu HP abaixo de 25% (ex: 30 / 150 HP = 20%)
  res.state.player.currentHp = 30;
  const res2 = E.resolveTurn(res.state, {
    player: act(56),
    enemy: act(56)
  });

  // Ditto transformado NÃO dispara transição para Solo Form no final do turno
  const dittoFormEvents = res2.events.filter(e => e.type === 'MOVE_PREPARED' && e.reason === 'FORM_CHANGED' && e.actor === 'player');
  assert.equal(dittoFormEvents.length, 0, 'Ditto transformado não reavalia nem emite FORM_CHANGED');
  assert.equal(res2.state.player.formSpeciesId, null);
});

test('Cenário C — Imposter contra Wishiwashi: ativação automática copia Schooling e restaura habilidade original na saída', () => {
  const dittoImposter = {
    id: 132,
    name: 'ditto-imposter',
    types: ['normal'],
    level: 50,
    hp: 150,
    maxHp: 150,
    currentHp: 150,
    attack: 50,
    defense: 50,
    specialAttack: 50,
    specialDefense: 50,
    speed: 100,
    ability: 'imposter',
    moves: [move(144)]
  };
  const w = wishiwashi({ currentHp: 120 });
  const s = E.createBattle(dittoImposter, w);

  // Imposter ativou automaticamente no P8.enter
  assert.ok(s.player.transformOriginal, 'Imposter realizou Transform na entrada');
  assert.equal(s.player.ability, 'schooling', 'Ditto com Imposter copiou Schooling');
  assert.equal(s.player.transformOriginal.ability, 'imposter', 'Habilidade original Imposter foi salva');
  assert.equal(s.player.formSpeciesId, null, 'Ditto não ganha formSpeciesId');

  // Encerramento / saída restaura a habilidade original Imposter
  C.P8.restore(s.player, true);
  assert.equal(s.player.ability, 'imposter', 'Habilidade original imposter restaurada após restore');
  assert.equal(s.player.transformOriginal, undefined, 'transformOriginal limpo');
});

test('Cenário D — Troca e restauração pós-Transform: restaura Limber e dados originais de Ditto no banco', () => {
  const teamPlayer = [
    {
      id: 132,
      name: 'ditto',
      types: ['normal'],
      level: 50,
      hp: 150,
      maxHp: 150,
      currentHp: 150,
      attack: 50,
      defense: 50,
      specialAttack: 50,
      specialDefense: 50,
      speed: 100,
      ability: 'limber',
      moves: [move(144)]
    },
    dummy({ id: 98, name: 'reserve-ally' }),
    dummy({ id: 99, name: 'reserve-ally-2' })
  ];
  const teamEnemy = [
    wishiwashi({ currentHp: 120 }),
    dummy({ id: 101, name: 'foe-reserve-1' }),
    dummy({ id: 102, name: 'foe-reserve-2' })
  ];
  const s = E.createTeamBattle(teamPlayer, teamEnemy);

  // Turno 1: Ditto usa Transform
  const res1 = E.resolveTurn(s, {
    player: act(144),
    enemy: act(56)
  });
  assert.equal(res1.state.player.team[0].ability, 'schooling');
  assert.ok(res1.state.player.team[0].transformOriginal);

  // Turno 2: Jogador troca Ditto pelo reserva
  const res2 = E.resolveTurn(res1.state, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: act(56)
  });

  // Ditto no banco teve sua identidade e habilidade Limber completamente restauradas
  const benchedDitto = res2.state.player.team[0];
  assert.equal(benchedDitto.ability, 'limber', 'Ditto no banco recuperou sua habilidade Limber');
  assert.equal(benchedDitto.id, 132);
  assert.equal(benchedDitto.name, 'ditto');
  assert.equal(benchedDitto.transformOriginal, undefined);
  assert.equal(benchedDitto.attack, 50);
});

test('Pokémon transformado com Schooling forçado não altera de forma', () => {
  const fakeWishi = {
    id: 132,
    name: 'ditto-wishi',
    transformOriginal: {},
    ability: 'schooling',
    currentHp: 120,
    maxHp: 120,
    level: 50
  };
  const events = [];
  C.P8.checkSchooling({}, 'player', fakeWishi, C, events);
  assert.equal(events.length, 0, 'Pokémon transformado não deve disparar Schooling');
  assert.equal(fakeWishi.formSpeciesId, undefined);
});

test('Espécie não elegível (Pikachu) com Schooling não altera de forma', () => {
  const pikachu = {
    id: 25,
    name: 'pikachu',
    types: ['electric'],
    level: 50,
    hp: 100,
    maxHp: 100,
    currentHp: 100,
    ability: 'schooling',
    moves: [move(85)]
  };
  const events = [];
  C.P8.checkSchooling({}, 'player', pikachu, C, events);
  assert.equal(events.length, 0, 'Espécie não-Wishiwashi não deve alterar forma');
});

test('Wishiwashi Terastallizado mantém o tipo Tera e altera de forma normalmente', () => {
  const w = wishiwashi({ currentHp: 120, teraType: 'electric' });
  const s = E.createBattle(w, dummy());

  // Terastalliza para Electric
  const res = E.resolveTurn(s, {
    player: act(56, { special: 'tera', damageRoll: 85 }),
    enemy: act(14)
  });

  assert.equal(res.state.player.tera, 'electric');
  assert.deepEqual(res.state.player.types, ['electric']);
  assert.equal(res.state.player.formSpeciesId, 10127);

  // Reduz HP para 20 no próximo turno
  res.state.player.currentHp = 20;
  const t2 = E.resolveTurn(res.state, {
    player: act(56, { damageRoll: 85 }),
    enemy: act(14)
  });

  // Reverte para Solo Form MAS PRESERVA tipo Tera Electric!
  assert.equal(t2.state.player.formSpeciesId, 746);
  assert.equal(t2.state.player.tera, 'electric');
  assert.deepEqual(t2.state.player.types, ['electric'], 'Tipo Tera mantido intacto após mudança de forma');
});

/* ==========================================================================
   Section 6: Formats & Battle Lifecycle (F.6)
   ========================================================================== */

test('Batalha 1x1 completa com vitória e encerramento sem resíduos', () => {
  const w = wishiwashi({ currentHp: 120 });
  const fragileEnemy = dummy({ hp: 50, currentHp: 50 });
  const s = E.createBattle(w, fragileEnemy);

  assert.equal(s.player.formSpeciesId, 10127);

  const res = E.resolveTurn(s, {
    player: act(56, { damageRoll: 100 }),
    enemy: act(14)
  });

  assert.equal(res.state.status, 'PLAYER_WIN');
  assert.equal(res.state.player.formSpeciesId, null, 'P8.restore executado no término');
});

test('Batalha em Duplas: Wishiwashi do jogador e do oponente operam de forma independente', () => {
  const wPlayer = wishiwashi({ currentHp: 120 }); // School
  const allyPlayer = dummy({ id: 98, name: 'ally' });
  const wEnemy = wishiwashi({ id: 746, name: 'wishi-foe', currentHp: 20 }); // Solo
  const foe2 = dummy({ id: 99, name: 'foe2' });

  const s = E.createDoublesBattle([wPlayer, allyPlayer], [wEnemy, foe2]);

  assert.equal(s.player.team[0].formSpeciesId, 10127, 'Wishiwashi do jogador está em School Form');
  assert.equal(s.enemy.team[0].formSpeciesId, null, 'Wishiwashi inimigo com 20 HP está em Solo Form');
});

test('Recuperação de Leftovers no fim de turno ultrapassando 25% aciona School Form', () => {
  // maxHp = 120, 25% = 30. CurrentHp = 28. Leftovers cura 7 HP -> 35 HP (> 30)
  const w = wishiwashi({ currentHp: 28, item: 'leftovers' });
  const s = E.createBattle(w, dummy());

  // Entra com 28 HP: Solo Form
  assert.equal(s.player.formSpeciesId, null);
  assert.equal(C.P8.species(s.player), 746);

  // Inimigo usa Swords Dance (status move), sem causar dano
  const res = E.resolveTurn(s, {
    player: act(56, { damageRoll: 85 }),
    enemy: act(14)
  });

  // Leftovers curou e no fim de turno virou School Form!
  assert.ok(res.state.player.currentHp > 30, 'Curado por Leftovers acima do limiar');
  assert.equal(res.state.player.formSpeciesId, 10127, 'Transformado para School Form após cura residual');
});

test('P8.restore limpa todas as propriedades voláteis e restaura combatente', () => {
  const w = wishiwashi({ currentHp: 120 });
  const s = E.createBattle(w, dummy());
  assert.equal(s.player.formSpeciesId, 10127);

  C.P8.restore(s.player, true);
  assert.equal(s.player.formSpeciesId, null);
  assert.equal(s.player.formOriginal, null);
  assert.equal(s.player.attack, 40);
  assert.equal(s.player.specialAttack, 45);
});

/* ==========================================================================
   Section 7: Interface & AI Evaluator (F.7)
   ========================================================================== */

test('UI Adapter: mapeia FORM_CHANGED com textos canônicos em português', async () => {
  const messages = [];
  const fakeView = { displayMessage: msg => messages.push(msg) };
  const adapter = new BattleUiDomAdapter({ view: fakeView });

  // Evento School Form
  await adapter.execute({
    type: 'MOVE_FAIL_FEEDBACK',
    pokemonName: 'Wishiwashi',
    reason: 'FORM_CHANGED',
    label: 'wishiwashi-school'
  });

  assert.ok(messages.some(m => m.includes('reuniu seu cardume e assumiu a School Form!')), 'Mensagem de reunião do cardume');

  // Evento Solo Form
  await adapter.execute({
    type: 'MOVE_FAIL_FEEDBACK',
    pokemonName: 'Wishiwashi',
    reason: 'FORM_CHANGED',
    label: 'wishiwashi-solo'
  });

  assert.ok(messages.some(m => m.includes('teve seu cardume dispersado e voltou à Solo Form!')), 'Mensagem de dispersão do cardume');
});

test('AI Evaluator: prevê dano usando os atributos da forma ativa e permanece puro', () => {
  const wSchool = wishiwashi({ currentHp: 120 });
  const sSchool = E.createBattle(wSchool, dummy());
  const evalSchool = V.evaluateMove(sSchool.player, sSchool.enemy, move(56), {
    attackerSide: 'player',
    battleState: sSchool
  });

  const wSolo = wishiwashi({ currentHp: 20 });
  const sSolo = E.createBattle(wSolo, dummy());
  const evalSolo = V.evaluateMove(sSolo.player, sSolo.enemy, move(56), {
    attackerSide: 'player',
    battleState: sSolo
  });

  assert.ok(evalSchool.expectedDamage > evalSolo.expectedDamage * 2.5, 'IA prevê dano expressivamente maior para School Form');

  // Pureza: o combatente e o estado não foram mutados
  assert.equal(sSchool.player.currentHp, 120);
  assert.equal(sSchool.player.formSpeciesId, 10127);
  assert.equal(sSolo.player.currentHp, 20);
  assert.equal(sSolo.player.formSpeciesId, null);
});

test('AI Evaluator: simetria perfeita ao avaliar Wishiwashi como adversário', () => {
  const wSchool = wishiwashi({ currentHp: 120 });
  const s = E.createBattle(dummy(), wSchool);

  const evalEnemy = V.evaluateMove(s.enemy, s.player, move(56), {
    attackerSide: 'enemy',
    battleState: s
  });

  assert.equal(evalEnemy.attackStat, 160, 'IA reconhece 160 SpA de Wishiwashi inimigo');
  assert.ok(evalEnemy.damageIfHit > 100, 'IA avalia dano de acerto maior que 100');
});

test('Entry Hazards: Stealth Rock reduz HP abaixo de 25% na entrada e impede ativação da School Form', () => {
  const leader = dummy({ id: 98, name: 'leader-mon' });
  // Wishiwashi entra como reserva com 35 HP. Stealth Rock (Rock vs Water = 1x = 12.5% de 120 = 15 HP).
  // 35 - 15 = 20 HP (<= 30 HP). Logo não deve virar School Form!
  const w = wishiwashi({ currentHp: 35 });
  const w3 = dummy({ id: 99, name: 'ally-3' });
  const s = E.createTeamBattle([leader, w, w3], [dummy({ id: 101, name: 'foe-1' }), dummy({ id: 102, name: 'foe-2' }), dummy({ id: 103, name: 'foe-3' })]);

  // Aplica Stealth Rock no lado do jogador
  C.P6.init(s);
  C.P6.init(s);
  s.p6Sides.player.stealthRock = true;

  // Troca para Wishiwashi
  const res = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: act(14)
  });

  const active = res.state.player.team[1];
  assert.equal(active.currentHp, 20, 'Sofreu 15 de dano de Stealth Rock');
  assert.equal(active.formSpeciesId, null, 'Permanece em Solo Form devido ao HP após hazards');
  assert.equal(C.P8.species(active), 746);
});

test('Entry Hazards: Stealth Rock deixa HP acima de 25% e ativa School Form normalmente', () => {
  const leader = dummy({ id: 98, name: 'leader-mon-2' });
  // Wishiwashi entra com 120 HP. Sofre 15 de dano -> 105 HP (> 30 HP). Transforma para School Form!
  const w = wishiwashi({ currentHp: 120 });
  const w3 = dummy({ id: 99, name: 'ally-3-2' });
  const s = E.createTeamBattle([leader, w, w3], [dummy({ id: 101, name: 'foe-1-2' }), dummy({ id: 102, name: 'foe-2-2' }), dummy({ id: 103, name: 'foe-3-2' })]);

  C.P6.init(s);
  s.p6Sides.player.stealthRock = true;

  const res = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: act(14)
  });

  const active = res.state.player.team[1];
  assert.equal(active.currentHp, 105);
  assert.equal(active.formSpeciesId, 10127, 'Transforma para School Form após hazards');
});

test('Presentation Mapper: converte eventos FORM_CHANGED em comandos MOVE_FAIL_FEEDBACK', () => {
  const rawEvents = [
    {
      type: 'MOVE_PREPARED',
      actor: 'player',
      pokemonName: 'wishiwashi',
      reason: 'FORM_CHANGED',
      label: 'wishiwashi-school'
    }
  ];
  const commands = Mapper.mapEvents(rawEvents);
  assert.equal(commands.length, 1);
  assert.equal(commands[0].type, 'MOVE_FAIL_FEEDBACK');
  assert.equal(commands[0].reason, 'FORM_CHANGED');
  assert.equal(commands[0].label, 'wishiwashi-school');
});

test('Weather Ball sob chuva intensa aproveita 140 base SpA de School Form com STAB Water 1.5x e chuva 1.5x', () => {
  const wSchool = wishiwashi({ currentHp: 120, moves: [move(311), move(56), move(89), move(58)] }); // Weather Ball
  const s = E.createBattle(wSchool, dummy());
  s.weather = { id: 'rain', turns: 5 };

  const res = E.resolveTurn(s, {
    player: act(311, { damageRoll: 100 }), // Weather Ball (vira Water 100 power)
    enemy: act(14)
  });

  const dmg = res.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(dmg.damage > 120, 'Weather Ball sob chuva causa dano massivo');
});

/* ==========================================================================
   Section 11: Auditoria Complementar — Casos Extremos e Integrações Avançadas
   ========================================================================== */

test('Forma inicial School (#10127) com nível 50: inicia em School, reverte com dano e restaura no fim', () => {
  const wInitialSchool = wishiwashi({
    id: 10127,
    name: 'wishiwashi-school',
    level: 50,
    currentHp: 120,
    maxHp: 120,
    attack: 160,
    defense: 150,
    specialAttack: 160,
    specialDefense: 155,
    speed: 50,
    baseStats: { hp: 45, attack: 140, defense: 130, specialAttack: 140, specialDefense: 135, speed: 30 }
  });
  const enemy = dummy({ currentHp: 200, maxHp: 200 });
  const s = E.createBattle(wInitialSchool, enemy);

  // Inicia em School Form
  assert.equal(C.P8.species(s.player), 10127);

  // Sofre dano massivo que reduz HP para 20 (<= 30 HP / 25%)
  s.player.currentHp = 20;
  const res = E.resolveTurn(s, {
    player: act(56),
    enemy: act(14)
  });

  // Reverte para Solo Form ao final do turno
  assert.equal(res.state.player.formSpeciesId, 746);
  assert.equal(C.P8.species(res.state.player), 746);
  assert.equal(res.state.player.attack, 40);
  assert.equal(res.state.player.specialAttack, 45);

  // Restauração no encerramento da batalha
  C.P8.restore(res.state.player, true);
  assert.equal(res.state.player.formSpeciesId, null);
  assert.equal(res.state.player.formOriginal, null);
});

test('Troca forçada por golpe adversário (Dragon Tail #525) restaura forma no banco e reavalia na reentrada', () => {
  const teamPlayer = [
    wishiwashi({ name: 'wishi-lead', currentHp: 120, speed: 10 }),
    dummy({ id: 98, name: 'reserve-1' }),
    dummy({ id: 99, name: 'reserve-2' })
  ];
  const teamEnemy = [
    dummy({ id: 101, name: 'foe-dragon', moves: [move(525), move(14)], speed: 200 }),
    dummy({ id: 102, name: 'foe-2' }),
    dummy({ id: 103, name: 'foe-3' })
  ];
  const s = E.createTeamBattle(teamPlayer, teamEnemy);

  // Antes da ação: Wishiwashi entrou e transformou em School Form
  assert.equal(s.player.team[0].formSpeciesId, 10127);

  // Inimigo mais rápido usa Dragon Tail #525, forçando a troca de Wishiwashi
  const res = E.resolveTurn(s, {
    player: act(56),
    enemy: act(525)
  });

  // Delcatty/reserve entrou em campo
  assert.equal(res.state.player.activeIndex, 1);
  const benched = res.state.player.team[0];
  // No banco, a forma volátil de combate foi resetada
  assert.equal(benched.formSpeciesId, null);
  assert.equal(benched.formOriginal, null);
  assert.ok(benched.currentHp < 120, 'HP sofreu o dano de Dragon Tail');
});

test('Batalhas em Duplas com 4 combatentes ativos: Wishiwashi do jogador e do oponente com transformações independentes', () => {
  const p1 = wishiwashi({ id: 746, name: 'wishi-p', currentHp: 120, speed: 60 });
  const p2 = dummy({ id: 98, name: 'ally-p', speed: 50 });
  const e1 = wishiwashi({ id: 746, name: 'wishi-e', currentHp: 120, speed: 60 });
  const e2 = dummy({ id: 101, name: 'ally-e', speed: 50 });

  const s = E.createDoublesBattle([p1, p2], [e1, e2]);

  // Ambos entram e viram School Form (#10127)
  assert.equal(s.player.team[0].formSpeciesId, 10127);
  assert.equal(s.enemy.team[0].formSpeciesId, 10127);

  // Reduz HP do Wishiwashi adversário para 20 (<= 25%), enquanto o do jogador fica em 120 (100%)
  s.enemy.team[0].currentHp = 20;

  const res = E.resolveDoublesTurn(s, {
    player: { 0: act(56, { targetRole: 'enemy', targetSlot: 1 }), 1: act(14) },
    enemy: { 0: act(56, { targetRole: 'player', targetSlot: 1 }), 1: act(14) }
  });

  // Oponente virou Solo Form (#746), jogador permaneceu em School Form (#10127)
  assert.equal(res.state.enemy.team[0].formSpeciesId, 746, 'Inimigo reverteu para Solo Form');
  assert.equal(res.state.player.team[0].formSpeciesId, 10127, 'Jogador permaneceu em School Form');
});

test('Dynamax com Schooling: decremento de turnos e compatibilidade de forma sem cancelamento prematuro', () => {
  const w = wishiwashi({ currentHp: 120, maxHp: 120 });
  const s = E.createBattle(w, dummy());

  // Inicia em School Form
  assert.equal(s.player.formSpeciesId, 10127);

  // Jogador ativa Dynamax
  const res = E.resolveTurn(s, {
    player: act(56, { special: 'dynamax' }),
    enemy: act(14)
  });

  // Dynamax ativo por 2 turnos restantes (3 - 1 = 2)
  assert.ok(res.state.player.dynamax);
  assert.equal(res.state.player.dynamax.turns, 2);
  assert.equal(res.state.player.formSpeciesId, 10127);

  // Turno 2: dano reduz HP abaixo de 25% do baseMaxHp (120 * 0.25 = 30)
  res.state.player.currentHp = 20;
  const res2 = E.resolveTurn(res.state, {
    player: act(56),
    enemy: act(14)
  });

  // Reverte para Solo Form ao final do turno, preservando Dynamax no 1 turno restante
  assert.equal(res2.state.player.formSpeciesId, 746);
  assert.ok(res2.state.player.dynamax);
  assert.equal(res2.state.player.dynamax.turns, 1);
});

test('Renderização Visual Real do DOM: BattleView renderiza sprites canônicos de Solo e School Form', () => {
  const container = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
  const view = new BattleView({ container });

  // Solo Form
  const wSolo = wishiwashi({ currentHp: 20 });
  const visualSolo = view.resolveCombatantVisual(wSolo, 'player');
  assert.match(visualSolo.animatedPhoto, /746\.gif/);
  assert.match(visualSolo.artworkUrl, /746\.png/);

  // School Form
  const wSchool = wishiwashi({ currentHp: 120, formSpeciesId: 10127, animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10127.gif', photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10127.png' });
  const visualSchool = view.resolveCombatantVisual(wSchool, 'player');
  assert.match(visualSchool.animatedPhoto, /10127\.gif/);
  assert.match(visualSchool.artworkUrl, /10127\.png/);

  // renderActiveBattleView no container
  const battleState = E.createBattle(wSchool, dummy());
  battleState.player.team = [wSchool];
  battleState.enemy.team = [dummy()];
  view.renderActiveBattleView(battleState, 'AWAITING_PLAYER_ACTION');

  assert.match(container.innerHTML, /10127/);
});

test('AI Evaluator: múltiplas avaliações sucessivas mantêm pureza total (sem mutação no Wishiwashi)', () => {
  const w = wishiwashi({ currentHp: 120, formSpeciesId: 10127 });
  const target = dummy({ currentHp: 150 });
  const s = E.createBattle(w, target);

  const beforeJson = JSON.stringify(s);

  for (let i = 0; i < 5; i++) {
    const evalEnemy = V.evaluateMove(w, target, move(56), {
      attackerSide: 'player',
      planningTurn: true,
      battleState: s
    });
    assert.ok(evalEnemy.expectedDamage > 0);
  }

  const afterJson = JSON.stringify(s);
  assert.equal(beforeJson, afterJson, 'Estado de batalha deve permanecer estritamente imutável após 5 avaliações da IA');
});
