const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const V = require('../../assets/js/battle/battle-evaluator');
const Reg = require('../../assets/js/battle/ability-registry');
const TE = require('../../assets/js/battle/type-effectiveness');
const D = require('../../assets/js/battle/doubles-battle');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const mon = (id, ids = [33, 304], extra = {}) => ({
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
  moves: ids.map(i => typeof i === 'number' ? move(i) : i),
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

const battle = (a = {}, b = {}, idsA = [33, 304], idsB = [33, 304]) => E.createBattle(
  mon(1, idsA, { speed: 200, ...a }),
  mon(2, idsB, { speed: 50, ...b })
);

const turn = (s, id = 33, extra = {}, enemy = act(33)) => E.resolveTurn(s, {
  player: act(id, extra),
  enemy
});

/* ==========================================================================
   Section 1: Ability Registry & Metadata Verification (H6-A)
   ========================================================================== */

test('H6-A Registry: todas as 6 habilidades estão registradas com status FULL e metadados canônicos', () => {
  const expected = [
    { id: 'normalize', gen: 4, triggers: ['ON_MODIFY_TYPE', 'ON_BASE_POWER'] },
    { id: 'refrigerate', gen: 6, triggers: ['ON_MODIFY_TYPE', 'ON_BASE_POWER'] },
    { id: 'pixilate', gen: 6, triggers: ['ON_MODIFY_TYPE', 'ON_BASE_POWER'] },
    { id: 'aerilate', gen: 6, triggers: ['ON_MODIFY_TYPE', 'ON_BASE_POWER'] },
    { id: 'galvanize', gen: 7, triggers: ['ON_MODIFY_TYPE', 'ON_BASE_POWER'] },
    { id: 'liquid-voice', gen: 7, triggers: ['ON_MODIFY_TYPE'] }
  ];

  for (const exp of expected) {
    const meta = Reg.getAbility(exp.id);
    assert.ok(meta, `Habilidade ${exp.id} deve estar presente no AbilityRegistry`);
    assert.equal(meta.id, exp.id);
    assert.equal(meta.status, 'FULL');
    assert.equal(meta.phase, 'H6');
    assert.equal(meta.generation, exp.gen);
    assert.deepEqual([...meta.triggers], exp.triggers);
    assert.equal(meta.breakable, false, `${exp.id} NÃO deve ser quebrado por Mold Breaker (regra canônica)`);
    assert.equal(meta.suppressible, true, `${exp.id} deve ser suprimível`);
    assert.equal(meta.copyable, true, `${exp.id} deve ser copiável`);
    assert.equal(meta.swappable, true, `${exp.id} deve ser trocável`);
    assert.ok(meta.description && meta.description.length > 10, 'Deve possuir descrição detalhada');
    assert.ok(meta.testFiles.includes('tests/battle/abilities-h6a.test.js'));
  }
});

test('H6-A Inventory: P7.abilityNames e P7.Data contêm as 6 habilidades', () => {
  const abilities = ['normalize', 'refrigerate', 'pixilate', 'aerilate', 'galvanize', 'liquid-voice'];
  for (const ab of abilities) {
    assert.ok(C.P7.abilityNames.includes(ab), `P7.abilityNames deve incluir ${ab}`);
    assert.ok(C.P7.Data.abilityNames.includes(ab), `P7.Data.abilityNames deve incluir ${ab}`);
  }
});

/* ==========================================================================
   Section 2: Helper Functions Verification
   ========================================================================== */

test('H6-A Helpers: isConvertedByAbility identifica conversão corretamente', () => {
  const s = mon(1, [33, 304, 53], { ability: 'pixilate' });
  assert.equal(C.P7.isConvertedByAbility(s, move(33)), true, 'Tackle (Normal) deve ser convertido por Pixilate');
  assert.equal(C.P7.isConvertedByAbility(s, move(304)), true, 'Hyper Voice (Normal) deve ser convertido por Pixilate');
  assert.equal(C.P7.isConvertedByAbility(s, move(53)), false, 'Flamethrower (Fire) NÃO deve ser convertido por Pixilate');

  const sNorm = mon(1, [33, 53], { ability: 'normalize' });
  assert.equal(C.P7.isConvertedByAbility(sNorm, move(33)), true, 'Tackle deve ser afetado por Normalize');
  assert.equal(C.P7.isConvertedByAbility(sNorm, move(53)), true, 'Flamethrower deve ser convertido por Normalize');

  const sLiq = mon(1, [33, 304, 53], { ability: 'liquid-voice' });
  assert.equal(C.P7.isConvertedByAbility(sLiq, move(304)), true, 'Hyper Voice (sound) deve ser convertido por Liquid Voice');
  assert.equal(C.P7.isConvertedByAbility(sLiq, move(33)), false, 'Tackle (non-sound) NÃO deve ser convertido por Liquid Voice');
  assert.equal(C.P7.isConvertedByAbility(sLiq, move(53)), false, 'Flamethrower (non-sound) NÃO deve ser convertido por Liquid Voice');
});

test('H6-A Helpers: isTypeChangerExempt respeita exceções canônicas de tipo', () => {
  const a = mon(1, [449, 546, 718, 311, 805, 165, 851]);
  // Judgment (449), Techno Blast (546), Multi-Attack (718), Weather Ball (311), Terrain Pulse (805), Struggle (165)
  for (const id of [449, 546, 718, 311, 805, 165]) {
    assert.equal(C.P7.isTypeChangerExempt(a, { id }), true, `Golpe id ${id} deve ser isento de conversão`);
  }

  // Tera Blast (851): não é isento se não estiver Terastallizado
  assert.equal(C.P7.isTypeChangerExempt(a, { id: 851 }), false, 'Tera Blast sem Tera NÃO é isento');
  // Tera Blast (851): é isento se estiver Terastallizado
  assert.equal(C.P7.isTypeChangerExempt({ ...a, tera: 'fairy' }, { id: 851 }), true, 'Tera Blast com Tera É isento');
});

/* ==========================================================================
   Section 3: Normalize (Gen IV, Regras Canônicas Gen VII-IX)
   ========================================================================== */

test('Normalize: converte golpes elementais para o tipo Normal', () => {
  const s = mon(1, [53, 85, 247], { ability: 'normalize' }); // Flamethrower, Thunderbolt, Shadow Ball
  assert.equal(C.P7.moveType(null, s, move(53)), 'normal', 'Flamethrower deve virar Normal');
  assert.equal(C.P7.moveType(null, s, move(85)), 'normal', 'Thunderbolt deve virar Normal');
  assert.equal(C.P7.moveType(null, s, move(247)), 'normal', 'Shadow Ball deve virar Normal');
});

test('Normalize: concede 1.2x de bônus de dano (Gen VII-IX) a golpes convertidos e originalmente Normal', () => {
  const s = mon(1, [53, 33], { ability: 'normalize' });
  const d = mon(2);

  // Flamethrower (90 base power) convertido para Normal: 90 * 1.2 = 108
  const pFire = C.P7.power(null, s, d, { ...move(53), type: 'normal', originalType: 'fire' }, 90);
  assert.equal(pFire, 108, 'Golpe convertido ganha bônus de 1.2x');

  // Tackle (40 base power) naturalmente Normal: 40 * 1.2 = 48
  const pTackle = C.P7.power(null, s, d, { ...move(33), type: 'normal' }, 40);
  assert.equal(pTackle, 48, 'Golpe naturalmente Normal também ganha 1.2x na Gen VII+');
});

test('Normalize: Pokémon do tipo Ghost é imune a ataques com Normalize (ex: Flamethrower virou Normal)', () => {
  const s = battle({ ability: 'normalize' }, { types: ['ghost'] }, [53], [33]);
  const r = turn(s, 53);
  const dmg = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').reduce((sum, e) => sum + e.damage, 0);
  assert.equal(dmg, 0, 'Defensor Ghost deve ser imune ao golpe transformado em Normal');
  assert.ok(r.events.some(e => e.type === 'TYPE_EFFECTIVENESS_RESOLVED' && e.classification === 'IMMUNE'));
});

test('Normalize: Delcatty (#301) recebe STAB Normal (1.5x) em golpes convertidos', () => {
  const sDelcatty = battle({ ability: 'normalize', types: ['normal'] }, { types: ['psychic'] }, [53], [33]);
  const rDelcatty = turn(sDelcatty, 53);
  const dmgDelcatty = rDelcatty.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const sNoStab = battle({ ability: 'normalize', types: ['psychic'] }, { types: ['psychic'] }, [53], [33]);
  const rNoStab = turn(sNoStab, 53);
  const dmgNoStab = rNoStab.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.ok(dmgDelcatty > dmgNoStab, 'Delcatty deve causar mais dano graças ao STAB Normal');
  const ratio = dmgDelcatty / dmgNoStab;
  assert.ok(ratio >= 1.45 && ratio <= 1.55, `Ratio esperado ~1.5, obtido ${ratio}`);
});

test('Normalize: golpes isentos (Struggle, Weather Ball, Terrain Pulse, Judgment) NÃO viram Normal nem ganham 1.2x', () => {
  const s = mon(1, [311, 449, 805], { ability: 'normalize' });
  const d = mon(2);

  assert.equal(C.P7.isTypeChangerExempt(s, move(311)), true);
  const pWb = C.P7.power(null, s, d, move(311), 50);
  assert.equal(pWb, 50, 'Weather Ball não recebe o bônus de 1.2x');

  assert.equal(C.P7.isTypeChangerExempt(s, C.P6.struggle), true);
  const pStruggle = C.P7.power(null, s, d, C.P6.struggle, 50);
  assert.equal(pStruggle, 50, 'Struggle não recebe bônus de 1.2x');
});

/* ==========================================================================
   Section 4: Normalize & Golpes de Status (Auditoria Detalhada de Regras Canônicas)
   ========================================================================== */

test('Normalize & Status: golpe direcionado ao próprio usuário (Swords Dance #14) buffa o atacante e não é bloqueado por Ghost', () => {
  const s = battle({ ability: 'normalize' }, { types: ['ghost'] }, [14], [33]);
  const r = turn(s, 14);
  assert.equal(r.state.player.statStages.attack, 2, 'Swords Dance deve aumentar o Ataque do usuário em +2');
  assert.equal(r.events.some(e => e.type === 'MOVE_FAILED'), false, 'Swords Dance não falha contra Ghost');
});

test('Normalize & Status: golpe de redução de atributo (Strength Sap #668) reduz o Ataque do defensor Ghost', () => {
  const s = battle({ ability: 'normalize', currentHp: 500 }, { types: ['ghost'], attack: 120 }, [668], [33]);
  const r = turn(s, 668);
  assert.equal(r.state.enemy.statStages.attack, -1, 'Defensor Ghost sofre redução de -1 de Ataque');
  assert.ok(r.state.player.currentHp > 500, 'Usuário de Strength Sap se cura com base no Ataque do alvo');
});

test('Normalize & Status: Thunder Wave sob Normalize é bloqueado por Ghost mas atinge Ground', () => {
  // Normalize Delcatty vs Ground (Rhyhorn): Ground NÃO é imune a Normal -> Thunder Wave tem sucesso!
  const sGround = battle({ ability: 'normalize' }, { types: ['ground', 'rock'] }, [86], [33]);
  const rGround = turn(sGround, 86);
  assert.equal(rGround.state.enemy.statusCondition, 'paralysis', 'Ground deve ser paralisado por Thunder Wave Normalizado');

  // Normalize Delcatty vs Ghost (Gastly): Ghost É imune a Normal -> Thunder Wave é bloqueado!
  const sGhost = battle({ ability: 'normalize' }, { types: ['ghost', 'poison'] }, [86], [33]);
  const rGhost = turn(sGhost, 86);
  assert.equal(rGhost.state.enemy.statusCondition, null, 'Ghost não deve ser paralisado por Thunder Wave Normalizado');
  assert.ok(rGhost.events.some(e => e.type === 'STATUS_BLOCKED' && e.reason === 'IMMUNE'), 'Evento STATUS_BLOCKED emitido com razão IMMUNE');
});

test('Status Canônico: Thunder Wave padrão (Electric) é bloqueado por Ground mas afeta Ghost', () => {
  // Standard Pikachu vs Ground: bloqueado por Ground
  const sPikaGround = battle({ ability: 'static', types: ['electric'] }, { types: ['ground'] }, [86], [33]);
  const rPikaGround = turn(sPikaGround, 86);
  assert.equal(rPikaGround.state.enemy.statusCondition, null, 'Ground é imune a Thunder Wave elétrico padrão');
  assert.ok(rPikaGround.events.some(e => e.type === 'STATUS_BLOCKED' && e.reason === 'IMMUNE'));

  // Standard Pikachu vs Ghost: afeta Ghost normalmente
  const sPikaGhost = battle({ ability: 'static', types: ['electric'] }, { types: ['ghost'] }, [86], [33]);
  const rPikaGhost = turn(sPikaGhost, 86);
  assert.equal(rPikaGhost.state.enemy.statusCondition, 'paralysis', 'Ghost é afetado por Thunder Wave elétrico padrão');
});

test('Status Canônico: Glare (#137, Normal) afeta alvos do tipo Ghost normalmente (regra dos cartuchos)', () => {
  const sGlare = battle({ ability: 'normalize' }, { types: ['ghost'] }, [137], [33]);
  const rGlare = turn(sGlare, 137);
  assert.equal(rGlare.state.enemy.statusCondition, 'paralysis', 'Glare (Normal) paralisa alvos do tipo Ghost conforme as regras canônicas');
});

/* ==========================================================================
   Section 5: Refrigerate (Gen VI-IX)
   ========================================================================== */

test('Refrigerate: converte golpes Normal para Ice e aplica 1.2x de bônus', () => {
  const s = mon(1, [33, 304, 58], { ability: 'refrigerate', types: ['ice'] });
  assert.equal(C.P7.moveType(null, s, move(33)), 'ice', 'Tackle deve virar Ice');
  assert.equal(C.P7.moveType(null, s, move(304)), 'ice', 'Hyper Voice deve virar Ice');
  assert.equal(C.P7.moveType(null, s, move(58)), 'ice', 'Ice Beam permanece Ice');

  const d = mon(2);
  assert.equal(C.P7.power(null, s, d, { ...move(33), type: 'ice' }, 40), 48);
  assert.equal(C.P7.power(null, s, d, move(58), 90), 90, 'Ice Beam natural não deve receber bônus de Refrigerate');
});

test('Refrigerate: dano convertido é super efetivo contra Dragon/Flying/Grass/Ground', () => {
  const s4x = battle({ ability: 'refrigerate', types: ['rock', 'ice'] }, { types: ['dragon', 'flying'] }, [33], [33]);
  const r4x = turn(s4x, 33);
  const eff4x = r4x.events.find(e => e.type === 'TYPE_EFFECTIVENESS_RESOLVED' && e.source === 'player');
  assert.equal(eff4x.attackType, 'ice');
  assert.equal(eff4x.multiplier, 4, 'Tackle convertido para Ice deve ser 4x contra Dragon/Flying');
});

test('Refrigerate: não afeta golpes de outros tipos (Flamethrower)', () => {
  const s = mon(1, [53], { ability: 'refrigerate' });
  assert.equal(C.P7.moveType(null, s, move(53)), 'fire', 'Flamethrower permanece Fire');
  assert.equal(C.P7.power(null, s, mon(2), move(53), 90), 90, 'Flamethrower não ganha bônus');
});

/* ==========================================================================
   Section 6: Pixilate & Efetividade Canônica Fairy/Dragon (Auditoria Detalhada)
   ========================================================================== */

test('Pixilate: converte golpes Normal para Fairy e aplica 1.2x de bônus', () => {
  const s = mon(1, [304, 33, 585], { ability: 'pixilate', types: ['fairy'] });
  assert.equal(C.P7.moveType(null, s, move(304)), 'fairy', 'Hyper Voice deve virar Fairy');
  assert.equal(C.P7.moveType(null, s, move(33)), 'fairy', 'Tackle deve virar Fairy');
  assert.equal(C.P7.moveType(null, s, move(585)), 'fairy', 'Moonblast permanece Fairy');

  const d = mon(2);
  assert.equal(C.P7.power(null, s, d, { ...move(304), type: 'fairy' }, 90), 108);
  assert.equal(C.P7.power(null, s, d, move(585), 95), 95, 'Moonblast natural não recebe bônus de Pixilate');
});

test('Pixilate: Fairy atacando Dragon é 2x SUPER EFETIVO e Dragon atacando Fairy é 0x IMUNE', () => {
  // 1. Tabela de efetividade pura
  const fairyVsDragon = TE.calculate('fairy', ['dragon']);
  assert.equal(fairyVsDragon.multiplier, 2, 'Fairy atacando Dragon deve ser 2x super efetivo');
  assert.equal(fairyVsDragon.classification, 'SUPER_EFFECTIVE');

  const dragonVsFairy = TE.calculate('dragon', ['fairy']);
  assert.equal(dragonVsFairy.multiplier, 0, 'Dragon atacando Fairy deve ser 0x imune');
  assert.equal(dragonVsFairy.classification, 'IMMUNE');

  // 2. Execução no motor de batalha
  const sFairyAtk = battle({ ability: 'pixilate', types: ['fairy'] }, { types: ['dragon'] }, [304], [33]);
  const rFairyAtk = turn(sFairyAtk, 304);
  const effFairy = rFairyAtk.events.find(e => e.type === 'TYPE_EFFECTIVENESS_RESOLVED' && e.source === 'player');
  assert.equal(effFairy.attackType, 'fairy');
  assert.equal(effFairy.multiplier, 2, 'Ataque Fairy contra Dragon resulta em multiplicador 2x');

  // Dragon attacking Fairy in engine: 0 damage
  const sDragonAtk = battle({ types: ['dragon'] }, { types: ['fairy'] }, [820], [33]); // 820 = Dragon Energy
  const rDragonAtk = turn(sDragonAtk, 820);
  const effDragon = rDragonAtk.events.find(e => e.type === 'TYPE_EFFECTIVENESS_RESOLVED' && e.source === 'player');
  assert.equal(effDragon.multiplier, 0, 'Ataque Dragon contra Fairy resulta em multiplicador 0x');
  const dmgDragon = rDragonAtk.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;
  assert.equal(dmgDragon, 0, 'Dano aplicado por Dragon em Fairy é 0');
});

test('Pixilate & Dragonite: Hyper Voice contra Dragonite (Dragon/Flying) tem efetividade 2x', () => {
  // Fairy vs Dragon (2x), Fairy vs Flying (1x) => Combined 2x
  const eff = TE.calculate('fairy', ['dragon', 'flying']);
  assert.equal(eff.multiplier, 2, 'Fairy contra Dragon/Flying tem efetividade combinada de 2x');
});

test('Pixilate & Dragonite: Multiscale em HP cheio reduz o dano em 50% mantendo efetividade em 2x', () => {
  const sylveon = { id: 700, name: 'Sylveon', level: 50, types: ['fairy'], hp: 1000, maxHp: 1000, currentHp: 1000, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100, ability: 'pixilate', moves: [move(304)] };
  const dragoniteFullHp = { id: 149, name: 'Dragonite', level: 50, types: ['dragon', 'flying'], hp: 1000, maxHp: 1000, currentHp: 1000, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 50, ability: 'multiscale', moves: [move(33)] };

  const s = E.createBattle(sylveon, dragoniteFullHp);
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 304, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 }
  });

  const effEvent = r.events.find(e => e.type === 'TYPE_EFFECTIVENESS_RESOLVED' && e.source === 'player');
  assert.equal(effEvent.multiplier, 2, 'A efetividade de tipo é 2x');
  assert.equal(effEvent.classification, 'SUPER_EFFECTIVE');

  const dmgEvent = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  // Dano base sem multiscale seria 146; com multiscale (f = 0.5) é exatamente 73
  assert.equal(dmgEvent.damage, 73, 'Multiscale em HP cheio reduz o dano em 50% (73 vs 146)');
});

test('Pixilate & Dragonite: Dragonite sem Multiscale ativo (HP < 100%) sofre dano total sem redução', () => {
  const sylveon = { id: 700, name: 'Sylveon', level: 50, types: ['fairy'], hp: 1000, maxHp: 1000, currentHp: 1000, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100, ability: 'pixilate', moves: [move(304)] };
  const dragoniteDamaged = { id: 149, name: 'Dragonite', level: 50, types: ['dragon', 'flying'], hp: 1000, maxHp: 1000, currentHp: 999, attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 50, ability: 'multiscale', moves: [move(33)] };

  const s = E.createBattle(sylveon, dragoniteDamaged);
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 304, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 }
  });

  const effEvent = r.events.find(e => e.type === 'TYPE_EFFECTIVENESS_RESOLVED' && e.source === 'player');
  assert.equal(effEvent.multiplier, 2, 'A efetividade de tipo continua 2x');

  const dmgEvent = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.equal(dmgEvent.damage, 146, 'Sem Multiscale o dano é o dobro (146)');
});

test('Pixilate: Sylveon recebe STAB Fairy (1.5x) e Tera Fairy concede 2.0x STAB', () => {
  const sylveon = mon(700, [304], { ability: 'pixilate', types: ['fairy'] });
  assert.equal(C.P8.stab(sylveon, 'fairy', C), 1.5, 'STAB normal para Fairy é 1.5x');

  const sylveonTeraFairy = mon(700, [304], { ability: 'pixilate', types: ['fairy'], tera: 'fairy', teraOriginalTypes: ['fairy'] });
  assert.equal(C.P8.stab(sylveonTeraFairy, 'fairy', C), 2.0, 'Tera Fairy em mon originalmente Fairy concede 2.0x STAB');

  const sylveonTeraFire = mon(700, [304], { ability: 'pixilate', types: ['fire'], tera: 'fire', teraOriginalTypes: ['fairy'] });
  assert.equal(C.P8.stab(sylveonTeraFire, 'fairy', C), 1.5, 'Tera Fire preserva 1.5x STAB para o Fairy original');
});

test('Pixilate: Tera Blast (851) é convertido se o usuário NÃO estiver Terastallizado, mas mantém tipo Tera se ativo', () => {
  const sylveon = mon(700, [851], { ability: 'pixilate', types: ['fairy'] });
  assert.equal(C.P7.moveType(null, sylveon, move(851)), 'fairy', 'Tera Blast sem Tera deve virar Fairy');
  assert.equal(C.P7.power(null, sylveon, mon(2), { ...move(851), type: 'fairy' }, 80), 96, '80 * 1.2 = 96');

  const sylveonTeraFire = { ...sylveon, tera: 'fire' };
  assert.equal(C.P7.moveType(null, sylveonTeraFire, move(851)), 'normal', 'P7 moveType respeita isenção de Tera Blast terastallizado');
  assert.equal(C.P8.moveType(sylveonTeraFire, move(851), 'normal'), 'fire', 'P8 moveType retorna o tipo Tera (fire)');
  assert.equal(C.P7.power(null, sylveonTeraFire, mon(2), { ...move(851), type: 'fire' }, 80), 80, 'Tera Blast terastallizado não ganha bônus de Pixilate');
});

/* ==========================================================================
   Section 7: Aerilate (Gen VI-IX)
   ========================================================================== */

test('Aerilate: converte golpes Normal para Flying e aplica 1.2x de bônus', () => {
  const s = mon(1, [38, 98, 403], { ability: 'aerilate', types: ['bug', 'flying'] });
  assert.equal(C.P7.moveType(null, s, move(38)), 'flying', 'Double-Edge deve virar Flying');
  assert.equal(C.P7.moveType(null, s, move(98)), 'flying', 'Quick Attack deve virar Flying');
  assert.equal(C.P7.moveType(null, s, move(403)), 'flying', 'Air Slash permanece Flying');

  const d = mon(2);
  assert.equal(C.P7.power(null, s, d, { ...move(38), type: 'flying' }, 120), 144);
  assert.equal(C.P7.power(null, s, d, move(403), 75), 75);
});

test('Aerilate: dano convertido é super efetivo contra Grass e Bug', () => {
  const s = battle({ ability: 'aerilate', types: ['bug', 'flying'] }, { types: ['grass', 'bug'] }, [38], [33]);
  const r = turn(s, 38);
  const eff = r.events.find(e => e.type === 'TYPE_EFFECTIVENESS_RESOLVED' && e.source === 'player');
  assert.equal(eff.attackType, 'flying');
  assert.equal(eff.multiplier, 4, 'Flying é 4x super efetivo contra Grass/Bug');
});

/* ==========================================================================
   Section 8: Galvanize (Gen VII-IX)
   ========================================================================== */

test('Galvanize: converte golpes Normal para Electric e aplica 1.2x de bônus', () => {
  const s = mon(1, [33, 85], { ability: 'galvanize', types: ['rock', 'electric'] });
  assert.equal(C.P7.moveType(null, s, move(33)), 'electric', 'Tackle deve virar Electric');
  assert.equal(C.P7.moveType(null, s, move(85)), 'electric', 'Thunderbolt permanece Electric');

  const d = mon(2);
  assert.equal(C.P7.power(null, s, d, { ...move(33), type: 'electric' }, 40), 48);
  assert.equal(C.P7.power(null, s, d, move(85), 90), 90);
});

test('Galvanize: Pokémon do tipo Ground é imune a golpes convertidos para Electric', () => {
  const s = battle({ ability: 'galvanize', types: ['rock', 'electric'] }, { types: ['ground'] }, [33], [33]);
  const r = turn(s, 33);
  const dmg = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').reduce((sum, e) => sum + e.damage, 0);
  assert.equal(dmg, 0, 'Ground deve ser imune ao Tackle convertido em Electric');
  assert.ok(r.events.some(e => e.type === 'TYPE_EFFECTIVENESS_RESOLVED' && e.classification === 'IMMUNE'));
});

test('Galvanize: Volt Absorb e Lightning Rod reagem a golpes convertidos para Electric', () => {
  const sVolt = battle({ ability: 'galvanize' }, { ability: 'volt-absorb', currentHp: 1000 }, [33], [33]);
  const rVolt = turn(sVolt, 33);
  const dmg = rVolt.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').reduce((sum, e) => sum + e.damage, 0);
  assert.equal(dmg, 0);
  assert.ok(rVolt.events.some(e => e.reason === 'P7_IMMUNE' && e.label === 'volt-absorb'));
  assert.ok(rVolt.state.enemy.currentHp > 1000, 'Volt Absorb deve curar o defensor');
});

/* ==========================================================================
   Section 9: Liquid Voice (Gen VII-IX)
   ========================================================================== */

test('Liquid Voice: converte golpes sonoros para Water SEM bônus de poder base', () => {
  const s = mon(1, [304, 574, 586, 33], { ability: 'liquid-voice', types: ['water', 'fairy'] });
  assert.equal(C.P7.moveType(null, s, move(304)), 'water', 'Hyper Voice deve virar Water');
  assert.equal(C.P7.moveType(null, s, move(574)), 'water', 'Disarming Voice deve virar Water');
  assert.equal(C.P7.moveType(null, s, move(586)), 'water', 'Boomburst deve virar Water');

  assert.equal(C.P7.moveType(null, s, move(33)), 'normal', 'Tackle NÃO é som, permanece Normal');

  const d = mon(2);
  assert.equal(C.P7.power(null, s, d, { ...move(304), type: 'water' }, 90), 90, 'Liquid Voice NÃO dá bônus de poder');
  assert.equal(C.P7.power(null, s, d, { ...move(586), type: 'water' }, 140), 140, 'Boomburst não ganha bônus');
});

test('Liquid Voice: Water Absorb e Storm Drain absorvem golpes sonoros convertidos', () => {
  const sAbsorb = battle({ ability: 'liquid-voice' }, { ability: 'water-absorb', currentHp: 1000 }, [304], [33]);
  const rAbsorb = turn(sAbsorb, 304);
  assert.ok(rAbsorb.events.some(e => e.reason === 'P7_IMMUNE' && e.label === 'water-absorb'));
  assert.ok(rAbsorb.state.enemy.currentHp > 1000, 'Water Absorb deve curar com Hyper Voice aquático');

  const sStorm = battle({ ability: 'liquid-voice' }, { ability: 'storm-drain' }, [304], [33]);
  const rStorm = turn(sStorm, 304);
  assert.ok(rStorm.events.some(e => e.reason === 'P7_IMMUNE' && e.label === 'storm-drain'));
  assert.equal(rStorm.state.enemy.statStages.specialAttack, 1, 'Storm Drain aumenta Sp. Atk');
});

test('Liquid Voice: golpe sonoro convertido ultrapassa Substitute', () => {
  const s = battle({ ability: 'liquid-voice' }, { substitute: true, substituteHp: 200, currentHp: 1000 }, [304], [33]);
  const r = turn(s, 304);
  const dmg = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player');
  assert.ok(dmg, 'Dano deve ser aplicado diretamente');
  assert.equal(dmg.attackType, 'water', 'Dano deve ser do tipo Water');
  assert.ok(r.state.enemy.currentHp < 1000, 'Dano deve atingir o HP do Pokémon diretamente');
  assert.equal(r.state.enemy.substituteHp, 200, 'Substitute deve permanecer ileso');
});

/* ==========================================================================
   Section 10: Mold Breaker & Ability Suppression
   ========================================================================== */

test('Mold Breaker do defensor NÃO cancela a habilidade de conversão do atacante', () => {
  const s = battle({ ability: 'pixilate' }, { ability: 'mold-breaker', types: ['dragon'] }, [304], [33]);
  const r = turn(s, 304);
  const eff = r.events.find(e => e.type === 'TYPE_EFFECTIVENESS_RESOLVED' && e.source === 'player');
  assert.equal(eff.attackType, 'fairy', 'Pixilate NÃO deve ser quebrado pelo Mold Breaker do defensor');
  assert.equal(eff.multiplier, 2);
});

test('Supressão de habilidade (abilitySuppressed: true) anula a conversão e o bônus de poder', () => {
  const s = mon(1, [304], { ability: 'pixilate', abilitySuppressed: true });
  assert.equal(C.P7.moveType(null, s, move(304)), 'normal', 'Com supressão, Hyper Voice permanece Normal');
  assert.equal(C.P7.power(null, s, mon(2), move(304), 90), 90, 'Com supressão, não há bônus de poder');
});

/* ==========================================================================
   Section 11: IA, Itens e Terastallization (Comparação Avaliador vs Motor)
   ========================================================================== */

test('Cadeia IA/Motor: Pixilate com STAB bate exatamente a mesma previsão determinística', () => {
  const sylveon = mon(700, [304], { level: 50, types: ['fairy'], ability: 'pixilate' });
  const defender = mon(2, [33], { level: 50, types: ['normal'] });
  const s = E.createBattle(sylveon, defender);

  const evaluation = V.evaluateMove(s.player, s.enemy, s.player.moves[0], { battleState: s, attackerSide: 'player' });
  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 304, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 },
    enemy: { type: 'MOVE', moveId: 33, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 }
  });
  const actualDamage = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(evaluation.moveType, 'fairy');
  assert.equal(evaluation.stabMultiplier, 1.5);
  // O motor calcula o dano no roll 100
  assert.equal(actualDamage, 73);
  // E o avaliador com critMaxDamage é 73 * 1.5 = 109
  assert.equal(evaluation.criticalMaxDamage, 109);
});

test('Cadeia IA/Motor: Refrigerate contra alvo fraco a Ice', () => {
  const aurorus = mon(699, [33], { level: 50, types: ['rock', 'ice'], ability: 'refrigerate' });
  const grassDefender = mon(2, [33], { level: 50, types: ['grass'] });
  const s = E.createBattle(aurorus, grassDefender);

  const evaluation = V.evaluateMove(s.player, s.enemy, s.player.moves[0], { battleState: s, attackerSide: 'player' });
  const r = turn(s, 33, { damageRoll: 100, criticalRoll: 24 });
  const actualDamage = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(evaluation.moveType, 'ice');
  assert.equal(evaluation.typeMultiplier, 2);
  assert.ok(actualDamage > 0);
  assert.equal(r.events.find(e => e.type === 'TYPE_EFFECTIVENESS_RESOLVED' && e.source === 'player').classification, 'SUPER_EFFECTIVE');
});

test('Cadeia IA/Motor: Galvanize contra Ground prevê e causa dano zero', () => {
  const golem = mon(10111, [33], { level: 50, ability: 'galvanize', types: ['rock', 'electric'] });
  const groundDefender = mon(2, [33], { level: 50, types: ['ground'] });
  const s = E.createBattle(golem, groundDefender);

  const evaluation = V.evaluateMove(s.player, s.enemy, s.player.moves[0], { battleState: s, attackerSide: 'player' });
  const r = turn(s, 33);
  const actualDamage = r.events.filter(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').reduce((sum, e) => sum + e.damage, 0);

  assert.equal(evaluation.moveType, 'electric');
  assert.equal(evaluation.typeMultiplier, 0);
  assert.equal(evaluation.expectedDamage, 0);
  assert.equal(actualDamage, 0);
});

test('Cadeia IA/Motor: Liquid Voice contra Water Absorb prevê benefício zero e cura o defensor', () => {
  const primarina = mon(730, [304], { level: 50, ability: 'liquid-voice', types: ['water', 'fairy'] });
  const vaporeon = mon(134, [33], { level: 50, ability: 'water-absorb', currentHp: 500 });
  const s = E.createBattle(primarina, vaporeon);

  const evaluation = V.evaluateMove(s.player, s.enemy, s.player.moves[0], { battleState: s, attackerSide: 'player' });
  const r = turn(s, 304);

  assert.equal(evaluation.moveType, 'water');
  assert.equal(evaluation.expectedDamage, 0);
  assert.ok(r.events.some(e => e.reason === 'P7_IMMUNE' && e.label === 'water-absorb'));
  assert.ok(r.state.enemy.currentHp > 500);
});

test('Cadeia IA/Motor: Conversão com Life Orb aplica multiplicador 1.3x e recoil de 10%', () => {
  const sBase = battle({ ability: 'pixilate' }, {}, [304], [33]);
  const rBase = turn(sBase, 304, { damageRoll: 100 });
  const dmgBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const sOrb = battle({ ability: 'pixilate', item: 'life-orb' }, {}, [304], [33]);
  const rOrb = turn(sOrb, 304, { damageRoll: 100 });
  const dmgOrb = rOrb.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.equal(dmgOrb, Math.floor(dmgBase * 1.3), 'Life Orb deve amplificar o dano em 1.3x');
  assert.ok(rOrb.events.some(e => e.type === 'RECOIL_APPLIED' && e.reason === 'LIFE_ORB'), 'Recoil de Life Orb emitido');
});

test('Cadeia IA/Motor: Conversão com Choice Specs amplifica Special Attack em 1.5x', () => {
  const sSpecs = battle({ ability: 'pixilate', item: 'choice-specs' }, {}, [304], [33]);
  assert.equal(C.getEffectiveStat(sSpecs.player, 'specialAttack'), 150, 'Choice Specs multiplica Sp. Atk por 1.5');
  const rSpecs = turn(sSpecs, 304, { damageRoll: 100 });
  const dmgSpecs = rSpecs.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const sNormal = battle({ ability: 'pixilate' }, {}, [304], [33]);
  const rNormal = turn(sNormal, 304, { damageRoll: 100 });
  const dmgNormal = rNormal.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.ok(dmgSpecs > dmgNormal, 'Choice Specs aumenta o dano final');
});

test('Cadeia IA/Motor: Conversão com Choice Band amplifica Attack em 1.5x', () => {
  const sBand = battle({ ability: 'aerilate', item: 'choice-band' }, {}, [38], [33]);
  assert.equal(C.getEffectiveStat(sBand.player, 'attack'), 150, 'Choice Band multiplica Attack por 1.5');
  const rBand = turn(sBand, 38, { damageRoll: 100 });
  const dmgBand = rBand.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  const sNormal = battle({ ability: 'aerilate' }, {}, [38], [33]);
  const rNormal = turn(sNormal, 38, { damageRoll: 100 });
  const dmgNormal = rNormal.events.find(e => e.type === 'DAMAGE_APPLIED' && e.source === 'player').damage;

  assert.ok(dmgBand > dmgNormal, 'Choice Band aumenta o dano físico final');
});

test('Imutabilidade: dados do catálogo KNOWN_CATALOG_MOVES e lista do Pokémon permanecem intactos após combate', () => {
  const catalogTypeBefore = C.KNOWN_CATALOG_MOVES[304].type;
  assert.equal(catalogTypeBefore, 'normal', 'Hyper Voice original no catálogo é Normal');

  const s = battle({ ability: 'pixilate' }, {}, [304], [33]);
  assert.equal(s.player.moves[0].type, 'normal', 'O golpe na equipe do jogador antes da batalha é Normal');

  turn(s, 304);

  // Após resolução do turno, o catálogo e o objeto original continuam Normal
  assert.equal(C.KNOWN_CATALOG_MOVES[304].type, 'normal', 'Catálogo não é mutado');
  assert.equal(s.player.moves[0].type, 'normal', 'Objeto de golpe no array do Pokémon permanece normal');
});

/* ==========================================================================
   Section 12: Real Battle Engine Turn Execution & Formats
   ========================================================================== */

test('Battle Engine: Adversário com habilidade de conversão também ativa regras idênticas', () => {
  const s = battle({ speed: 50, types: ['dragon'] }, { speed: 200, ability: 'refrigerate', types: ['ice'] }, [33], [33]);
  const r = turn(s, 33);
  const enemyEff = r.events.find(e => e.type === 'TYPE_EFFECTIVENESS_RESOLVED' && e.source === 'enemy');
  assert.equal(enemyEff.attackType, 'ice', 'Adversário com Refrigerate deve converter golpe para Ice');
  assert.equal(enemyEff.multiplier, 2, 'Ice é super efetivo no Dragão do jogador');
});

test('Doubles: Galvanize em golpe spread converte dano em Electric e ativa Lightning Rod', () => {
  const aMon = mon(1, [33], { ability: 'galvanize', types: ['rock', 'electric'] });
  const bMon = mon(2, [33], { ability: 'lightning-rod', types: ['normal'] });

  const s = {
    battleFormat: 'DOUBLES',
    player: { team: [aMon], activeIndices: [0], activeIndex: 0 },
    enemy: { team: [bMon], activeIndices: [0], activeIndex: 0 },
    doublesTeams: {
      player: { team: [aMon], activeIndices: [0] },
      enemy: { team: [bMon], activeIndices: [0] }
    }
  };

  const calculatedType = C.P8.moveType(aMon, move(33), C.P7.moveType(s, aMon, move(33), 'normal'));
  assert.equal(calculatedType, 'electric', 'Em Duplas o tipo do golpe deve ser avaliado como Electric');
});

test('3v3 Team Battle: Sylveon com Pixilate participa de batalha completa com nocaute e vitória', () => {
  const pTeam = [
    mon(700, [304], { name: 'Sylveon', ability: 'pixilate', types: ['fairy'], specialAttack: 200 }),
    mon(2, [33]),
    mon(3, [33])
  ];
  const eTeam = [
    mon(4, [33], { name: 'Dragonite', types: ['dragon'], currentHp: 50, maxHp: 50 }),
    mon(5, [33]),
    mon(6, [33])
  ];

  const s = E.createTeamBattle(pTeam, eTeam);
  const r = E.resolveTurn(s, {
    player: act(304),
    enemy: act(33)
  });

  assert.ok(r.events.some(e => e.type === 'DAMAGE_APPLIED' && e.attackType === 'fairy'), 'Dano Fairy deve ser aplicado');
  assert.ok(r.events.some(e => e.type === 'POKEMON_FAINTED' && e.target === 'enemy'), 'Dragonite adversário deve ser nocauteado');
});
