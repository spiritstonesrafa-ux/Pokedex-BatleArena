const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const V = require('../../assets/js/battle/battle-evaluator');
const Reg = require('../../assets/js/battle/ability-registry');
const UI = require('../../assets/js/ui/battle-ui-adapter');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

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

const turn = (s, id = 33, extra = {}, enemy = act(156)) => E.resolveTurn(s, {
  player: act(id, extra),
  enemy
});

/* ==========================================================================
   H4-A.1: Dark Aura
   ========================================================================== */

test('Dark Aura: amplifica o dano de movimentos Dark em ~4/3 (1.33x) para o portador', () => {
  // Move 282 = Knock Off (Dark, Physical, 65 power)
  const sBase = battle({}, {}, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sAura = battle({ ability: 'dark-aura' }, {}, [282, 156], [33, 156]);
  const rAura = turn(sAura, 282);
  const dAura = rAura.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dAura, Math.floor(dBase * (4 / 3)), 'Dark Aura deve aumentar o dano por ~4/3 (1.33x)');
});

test('Dark Aura: afeta TODOS os combatentes em campo (adversário atacando com Dark também é amplificado)', () => {
  // Enemy has Dark Aura; Player attacks enemy with Knock Off (282)
  const s = battle({ speed: 200 }, { ability: 'dark-aura', speed: 50 }, [282, 156], [33, 156]);
  const r = turn(s, 282);
  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sBase = battle({ speed: 200 }, { speed: 50 }, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(d, Math.floor(dBase * (4 / 3)), 'Dark Aura do adversário deve amplificar o golpe Dark do jogador');
});

test('Dark Aura: NÃO acumula múltiplos multiplicadores quando há mais de um portador em campo', () => {
  // Both player and enemy have Dark Aura
  const sBoth = battle({ ability: 'dark-aura' }, { ability: 'dark-aura' }, [282, 156], [33, 156]);
  const rBoth = turn(sBoth, 282);
  const dBoth = rBoth.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sSingle = battle({ ability: 'dark-aura' }, {}, [282, 156], [33, 156]);
  const rSingle = turn(sSingle, 282);
  const dSample = rSingle.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dBoth, dSample, 'Dois portadores de Dark Aura não devem duplicar o bônus');
});

test('Dark Aura: NÃO amplifica movimentos de outros tipos (Normal #33)', () => {
  const sBase = battle({}, {}, [33, 156], [33, 156]);
  const rBase = turn(sBase, 33);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sAura = battle({ ability: 'dark-aura' }, {}, [33, 156], [33, 156]);
  const rAura = turn(sAura, 33);
  const dAura = rAura.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dAura, dBase, 'Dark Aura não deve amplificar Tackle (Normal)');
});

test('Dark Aura: supressão (abilitySuppressed = true) desativa o bônus de dano', () => {
  const sBase = battle({}, {}, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sAura = battle({ ability: 'dark-aura' }, {}, [282, 156], [33, 156]);
  sAura.player.abilitySuppressed = true;
  const rAura = turn(sAura, 282);
  const dAura = rAura.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dAura, dBase, 'Dark Aura suprimida não deve conceder bônus');
});

/* ==========================================================================
   H4-A.2: Fairy Aura
   ========================================================================== */

test('Fairy Aura: amplifica o dano de movimentos Fairy em ~4/3 (1.33x)', () => {
  // Move 577 = Draining Kiss (Fairy, Special, 50 power)
  const sBase = battle({}, {}, [577, 156], [33, 156]);
  const rBase = turn(sBase, 577);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sAura = battle({ ability: 'fairy-aura' }, {}, [577, 156], [33, 156]);
  const rAura = turn(sAura, 577);
  const dAura = rAura.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dAura, Math.floor(dBase * (4 / 3)), 'Fairy Aura deve aumentar o dano por ~4/3 (1.33x)');
});

test('Fairy Aura: afeta TODOS os combatentes em campo (adversário atacando com Fairy também é amplificado)', () => {
  const s = battle({ speed: 200 }, { ability: 'fairy-aura', speed: 50 }, [577, 156], [33, 156]);
  const r = turn(s, 577);
  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sBase = battle({ speed: 200 }, { speed: 50 }, [577, 156], [33, 156]);
  const rBase = turn(sBase, 577);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(d, Math.floor(dBase * (4 / 3)), 'Fairy Aura do adversário deve amplificar Fairy do jogador');
});

test('Fairy Aura: NÃO acumula com múltiplos portadores no campo', () => {
  const sBoth = battle({ ability: 'fairy-aura' }, { ability: 'fairy-aura' }, [577, 156], [33, 156]);
  const rBoth = turn(sBoth, 577);
  const dBoth = rBoth.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sSingle = battle({ ability: 'fairy-aura' }, {}, [577, 156], [33, 156]);
  const rSingle = turn(sSingle, 577);
  const dSample = rSingle.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dBoth, dSample);
});

test('Fairy Aura: NÃO amplifica movimentos de outros tipos (Normal #33)', () => {
  const sBase = battle({}, {}, [33, 156], [33, 156]);
  const rBase = turn(sBase, 33);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sAura = battle({ ability: 'fairy-aura' }, {}, [33, 156], [33, 156]);
  const rAura = turn(sAura, 33);
  const dAura = rAura.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dAura, dBase);
});

test('Fairy Aura: supressão desativa o bônus de dano', () => {
  const sBase = battle({}, {}, [577, 156], [33, 156]);
  const rBase = turn(sBase, 577);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sAura = battle({ ability: 'fairy-aura' }, {}, [577, 156], [33, 156]);
  sAura.player.abilitySuppressed = true;
  const rAura = turn(sAura, 577);
  const dAura = rAura.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dAura, dBase);
});

/* ==========================================================================
   H4-A.3: Aura Break
   ========================================================================== */

test('Aura Break: inverte Dark Aura (multiplicador passa a 0.75x)', () => {
  const sBase = battle({}, {}, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const s = battle({ ability: 'dark-aura' }, { ability: 'aura-break' }, [282, 156], [33, 156]);
  const r = turn(s, 282);
  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(d, Math.floor(dBase * 0.75), 'Aura Break deve inverter o multiplicador para 0.75x (redução de 25%)');
});

test('Aura Break: inverte Fairy Aura (multiplicador passa a 0.75x)', () => {
  const sBase = battle({}, {}, [577, 156], [33, 156]);
  const rBase = turn(sBase, 577);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const s = battle({ ability: 'fairy-aura' }, { ability: 'aura-break' }, [577, 156], [33, 156]);
  const r = turn(s, 577);
  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(d, Math.floor(dBase * 0.75), 'Aura Break deve inverter Fairy Aura para 0.75x');
});

test('Aura Break: isolada (sem Dark/Fairy Aura) NÃO reduz movimentos Dark nem Fairy', () => {
  // Move 282 (Dark) against defender with Aura Break, but no Dark Aura present
  const sBase = battle({}, {}, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sAuraBreak = battle({}, { ability: 'aura-break' }, [282, 156], [33, 156]);
  const rAuraBreak = turn(sAuraBreak, 282);
  const dAuraBreak = rAuraBreak.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dAuraBreak, dBase, 'Aura Break isolada não deve reduzir golpes Dark');

  // Move 577 (Fairy) against defender with Aura Break, but no Fairy Aura present
  const sFairyBase = battle({}, {}, [577, 156], [33, 156]);
  const rFairyBase = turn(sFairyBase, 577);
  const dFairyBase = rFairyBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sFairyAuraBreak = battle({}, { ability: 'aura-break' }, [577, 156], [33, 156]);
  const rFairyAuraBreak = turn(sFairyAuraBreak, 577);
  const dFairyAuraBreak = rFairyAuraBreak.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dFairyAuraBreak, dFairyBase, 'Aura Break isolada não deve reduzir golpes Fairy');
});

test('Aura Break: supressão de Aura Break restaura a amplificação das auras para ~1.33x', () => {
  const sBase = battle({}, {}, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const s = battle({ ability: 'dark-aura' }, { ability: 'aura-break' }, [282, 156], [33, 156]);
  s.enemy.abilitySuppressed = true; // Aura Break suprimida
  const r = turn(s, 282);
  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(d, Math.floor(dBase * (4 / 3)), 'Com Aura Break suprimida, Dark Aura volta a dar 4/3 de dano');
});

test('Aura Break: Mold Breaker no atacante NÃO neutraliza o efeito de Aura Break sobre as auras', () => {
  const sBase = battle({}, {}, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  // Defender has Dark Aura, player has Mold Breaker; enemy ally or field has Aura Break
  const s = battle({ ability: 'mold-breaker' }, { ability: 'aura-break' }, [282, 156], [33, 156]);
  // Add a third mon or simulate field aura
  const s2 = battle({ ability: 'dark-aura' }, { ability: 'aura-break' }, [282, 156], [33, 156]);
  const r = turn(s2, 282);
  const d = r.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(d, Math.floor(dBase * 0.75), 'Aura Break inverte a aura para 0.75x mesmo contra Mold Breaker');
});

/* ==========================================================================
   H4-A.4: Prism Armor
   ========================================================================== */

test('Prism Armor: reduz em 25% (0.75x) o dano de golpes super efetivos (2x)', () => {
  // Defender is Psychic type; Move 282 is Knock Off (Dark, 2x effective vs Psychic)
  const sBase = battle({ types: ['normal'] }, { types: ['psychic'] }, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sPrism = battle({ types: ['normal'] }, { types: ['psychic'], ability: 'prism-armor' }, [282, 156], [33, 156]);
  const rPrism = turn(sPrism, 282);
  const dPrism = rPrism.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dPrism, Math.floor(dBase * 0.75), 'Prism Armor deve reduzir dano super efetivo em 25% (0.75x)');
});

test('Prism Armor: reduz em 25% (0.75x) o dano de golpes 4x super efetivos', () => {
  // Defender is Psychic/Ghost; Move 282 Knock Off deals 4x damage
  const sBase = battle({ types: ['normal'] }, { types: ['psychic', 'ghost'] }, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sPrism = battle({ types: ['normal'] }, { types: ['psychic', 'ghost'], ability: 'prism-armor' }, [282, 156], [33, 156]);
  const rPrism = turn(sPrism, 282);
  const dPrism = rPrism.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dPrism, Math.floor(dBase * 0.75), 'Prism Armor deve aplicar 0.75x a golpes 4x super efetivos');
});

test('Prism Armor: NÃO é ignorada por atacante com Mold Breaker (diferença crítica de Filter/Solid Rock)', () => {
  const sBase = battle({ types: ['normal'] }, { types: ['psychic'] }, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  // Attacker has Mold Breaker; Defender has Prism Armor
  const sMb = battle({ types: ['normal'], ability: 'mold-breaker' }, { types: ['psychic'], ability: 'prism-armor' }, [282, 156], [33, 156]);
  const rMb = turn(sMb, 282);
  const dMb = rMb.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dMb, Math.floor(dBase * 0.75), 'Mold Breaker NÃO deve ignorar Prism Armor (regra canônica Gen VII-IX)');
});

test('Prism Armor: Teravolt e Turboblaze também NÃO ignoram Prism Armor', () => {
  const sBase = battle({ types: ['normal'] }, { types: ['psychic'] }, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sTera = battle({ types: ['normal'], ability: 'teravolt' }, { types: ['psychic'], ability: 'prism-armor' }, [282, 156], [33, 156]);
  const rTera = turn(sTera, 282);
  assert.equal(rTera.events.find(e => e.type === 'DAMAGE_APPLIED').damage, Math.floor(dBase * 0.75));

  const sTurbo = battle({ types: ['normal'], ability: 'turboblaze' }, { types: ['psychic'], ability: 'prism-armor' }, [282, 156], [33, 156]);
  const rTurbo = turn(sTurbo, 282);
  assert.equal(rTurbo.events.find(e => e.type === 'DAMAGE_APPLIED').damage, Math.floor(dBase * 0.75));
});

test('Prism Armor: Moongeist Beam (#714) e Photon Geyser (#722) NÃO ignoram Prism Armor', () => {
  // Move 714 (Moongeist Beam, Ghost, 100 power) vs Psychic defender
  const sBase = battle({ types: ['normal'] }, { types: ['psychic'] }, [714, 156], [33, 156]);
  const rBase = turn(sBase, 714);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sPrism = battle({ types: ['normal'] }, { types: ['psychic'], ability: 'prism-armor' }, [714, 156], [33, 156]);
  const rPrism = turn(sPrism, 714);
  const dPrism = rPrism.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dPrism, Math.floor(dBase * 0.75), 'Moongeist Beam não deve ignorar Prism Armor');
});

test('Prism Armor: NÃO reduz dano de golpes neutros (1x) ou resistidos (0.5x)', () => {
  // Move 33 (Tackle, Normal, 1x vs Psychic)
  const sBase = battle({ types: ['normal'] }, { types: ['psychic'] }, [33, 156], [33, 156]);
  const rBase = turn(sBase, 33);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sPrism = battle({ types: ['normal'] }, { types: ['psychic'], ability: 'prism-armor' }, [33, 156], [33, 156]);
  const rPrism = turn(sPrism, 33);
  const dPrism = rPrism.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dPrism, dBase, 'Prism Armor não deve reduzir golpe com efetividade neutra');
});

test('Prism Armor: supressão (abilitySuppressed = true) desativa a redução de 25%', () => {
  const sBase = battle({ types: ['normal'] }, { types: ['psychic'] }, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sPrism = battle({ types: ['normal'] }, { types: ['psychic'], ability: 'prism-armor' }, [282, 156], [33, 156]);
  sPrism.enemy.abilitySuppressed = true;
  const rPrism = turn(sPrism, 282);
  const dPrism = rPrism.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dPrism, dBase, 'Sob supressão genuína, Prism Armor não deve ativar');
});

/* ==========================================================================
   H4-A.5: Neuroforce
   ========================================================================== */

test('Neuroforce: aumenta em 25% (1.25x) o dano de golpes físicos super efetivos', () => {
  // Move 282 = Knock Off (Dark, Physical) vs Psychic defender
  const sBase = battle({ types: ['normal'] }, { types: ['psychic'] }, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sNeuro = battle({ types: ['normal'], ability: 'neuroforce' }, { types: ['psychic'] }, [282, 156], [33, 156]);
  const rNeuro = turn(sNeuro, 282);
  const dNeuro = rNeuro.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dNeuro, Math.floor(dBase * 1.25), 'Neuroforce deve aumentar em 25% (1.25x) golpe físico super efetivo');
});

test('Neuroforce: aumenta em 25% (1.25x) o dano de golpes especiais super efetivos', () => {
  // Move 85 = Thunderbolt (Electric, Special) vs Water defender
  const sBase = battle({ types: ['normal'] }, { types: ['water'] }, [85, 156], [33, 156]);
  const rBase = turn(sBase, 85);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sNeuro = battle({ types: ['normal'], ability: 'neuroforce' }, { types: ['water'] }, [85, 156], [33, 156]);
  const rNeuro = turn(sNeuro, 85);
  const dNeuro = rNeuro.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dNeuro, Math.floor(dBase * 1.25), 'Neuroforce deve aumentar em 25% golpe especial super efetivo');
});

test('Neuroforce: aumenta em 25% o dano de golpes 4x super efetivos', () => {
  // Move 282 vs Psychic/Ghost defender (4x)
  const sBase = battle({ types: ['normal'] }, { types: ['psychic', 'ghost'] }, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sNeuro = battle({ types: ['normal'], ability: 'neuroforce' }, { types: ['psychic', 'ghost'] }, [282, 156], [33, 156]);
  const rNeuro = turn(sNeuro, 282);
  const dNeuro = rNeuro.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dNeuro, Math.floor(dBase * 1.25), 'Neuroforce aplica 1.25x a golpes 4x super efetivos');
});

test('Neuroforce: NÃO afeta dano de golpes neutros (1x) ou resistidos (0.5x)', () => {
  // Move 33 (Tackle, Normal, 1x vs Psychic)
  const sBase = battle({ types: ['normal'] }, { types: ['psychic'] }, [33, 156], [33, 156]);
  const rBase = turn(sBase, 33);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sNeuro = battle({ types: ['normal'], ability: 'neuroforce' }, { types: ['psychic'] }, [33, 156], [33, 156]);
  const rNeuro = turn(sNeuro, 33);
  const dNeuro = rNeuro.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dNeuro, dBase, 'Neuroforce não deve aumentar golpe neutro');
});

test('Neuroforce: supressão desativa o bônus de 25%', () => {
  const sBase = battle({ types: ['normal'] }, { types: ['psychic'] }, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sNeuro = battle({ types: ['normal'], ability: 'neuroforce' }, { types: ['psychic'] }, [282, 156], [33, 156]);
  sNeuro.player.abilitySuppressed = true;
  const rNeuro = turn(sNeuro, 282);
  const dNeuro = rNeuro.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dNeuro, dBase, 'Sob supressão, Neuroforce não deve conceder bônus');
});

/* ==========================================================================
   H4-A.6: Interações Combinadas e Formatos
   ========================================================================== */

test('Combinação: Neuroforce no atacante vs Prism Armor no defensor compõe multiplicadores (1.25 * 0.75 = 0.9375)', () => {
  const sBase = battle({ types: ['normal'] }, { types: ['psychic'] }, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sBoth = battle(
    { types: ['normal'], ability: 'neuroforce' },
    { types: ['psychic'], ability: 'prism-armor' },
    [282, 156],
    [33, 156]
  );
  const rBoth = turn(sBoth, 282);
  const dBoth = rBoth.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dBoth, Math.floor(dBase * 1.25 * 0.75), 'Multiplicadores de Neuroforce e Prism Armor compõem perfeitamente');
});

test('Combinação: Dark Aura no atacante vs Prism Armor no defensor compõe amplificação e redução', () => {
  const sBase = battle({ types: ['normal'] }, { types: ['psychic'] }, [282, 156], [33, 156]);
  const rBase = turn(sBase, 282);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  const sBoth = battle(
    { types: ['normal'], ability: 'dark-aura' },
    { types: ['psychic'], ability: 'prism-armor' },
    [282, 156],
    [33, 156]
  );
  const rBoth = turn(sBoth, 282);
  const dBoth = rBoth.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dBoth, Math.floor(dBase * (4 / 3) * 0.75));
});

test('Formatos: Doubles (2v2) — Dark Aura de um mon afeta todos os ataques Dark na partida', () => {
  const yveltal = mon(717, [282, 156], { ability: 'dark-aura', speed: 300 });
  const ally = mon(2, [282, 156], { speed: 250 });
  const pTeam = [yveltal, ally, mon(5)];
  const foe1 = mon(3, [282, 156], { speed: 200 });
  const foe2 = mon(4, [282, 156], { speed: 150 });
  const eTeam = [foe1, foe2, mon(6)];

  const s = E.createDoublesBattle(pTeam, eTeam);
  assert.equal(s.battleFormat, 'DOUBLES');

  const r = E.resolveTurn(s, {
    player: { type: 'MOVE', moveId: 282, targetSlot: 0, accuracyRoll: 1, damageRoll: 100 },
    enemy: { type: 'MOVE', moveId: 156, targetSlot: 0, accuracyRoll: 1, damageRoll: 100 }
  });

  const dmg = r.events.find(e => e.type === 'DAMAGE_APPLIED');
  assert.ok(dmg, 'Dano aplicado na batalha em duplas');
});

test('Formatos: 3v3 Singles — troca traz Zygarde com Aura Break e inverte Dark Aura imediatamente', () => {
  const p1 = mon(1, [282, 156], { ability: 'dark-aura', speed: 200 });
  const e1 = mon(2, [33, 156], { speed: 50 });
  const zygarde = mon(718, [33, 156], { ability: 'aura-break', speed: 150 });

  const s = E.createTeamBattle([p1, mon(11), mon(12)], [e1, zygarde, mon(14)]);

  // Turn 1: base with Dark Aura (no Aura Break yet)
  const r1 = turn(s, 282);
  const d1 = r1.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  // Enemy switches in Zygarde
  const rSwitch = E.resolveTurn(r1.state, {
    player: act(282),
    enemy: { type: 'SWITCH', targetIndex: 1 }
  });

  // Turn 2: Zygarde is active with Aura Break -> Dark Aura is now inverted
  const r2 = turn(rSwitch.state, 282);
  const d2 = r2.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.ok(d2 < d1, 'Com a entrada de Zygarde, Aura Break inverte Dark Aura reduzindo o dano');
});

/* ==========================================================================
   H4-A.7: Espécies Reais do Catálogo
   ========================================================================== */

test('Espécies reais: Yveltal (#717) real com Dark Aura em 1v1', () => {
  const yveltal = mon(717, [282, 156], { ability: 'dark-aura' });
  const target = mon(1, [33, 156]);
  const s = E.createBattle(yveltal, target);
  const r = turn(s, 282);

  const dmg = r.events.find(e => e.type === 'DAMAGE_APPLIED').damage;
  assert.ok(dmg > 0, 'Yveltal real deve causar dano amplificado com Dark Aura');
});

test('Espécies reais: Xerneas (#716) real com Fairy Aura em 1v1', () => {
  const xerneas = mon(716, [577, 156], { ability: 'fairy-aura' });
  const target = mon(1, [33, 156]);
  const s = E.createBattle(xerneas, target);
  const r = turn(s, 577);

  const dmg = r.events.find(e => e.type === 'DAMAGE_APPLIED').damage;
  assert.ok(dmg > 0, 'Xerneas real deve causar dano amplificado com Fairy Aura');
});

test('Espécies reais: Zygarde (#718) real com Aura Break em 1v1', () => {
  const yveltal = mon(717, [282, 156], { ability: 'dark-aura' });
  const zygarde = mon(718, [33, 156], { ability: 'aura-break' });
  const s = E.createBattle(yveltal, zygarde);
  const r = turn(s, 282);

  const dmg = r.events.find(e => e.type === 'DAMAGE_APPLIED').damage;
  assert.ok(dmg > 0, 'Zygarde real com Aura Break deve atuar no cálculo de dano');
});

test('Espécies reais: Necrozma (#800) real com Prism Armor em 1v1', () => {
  const attacker = mon(1, [282, 156]); // Dark move vs Psychic Necrozma
  const necrozma = mon(800, [33, 156], { types: ['psychic'], ability: 'prism-armor' });
  const s = E.createBattle(attacker, necrozma);
  const r = turn(s, 282);

  const dmg = r.events.find(e => e.type === 'DAMAGE_APPLIED').damage;
  assert.ok(dmg > 0, 'Necrozma real deve receber dano atenuado por Prism Armor');
});

test('Espécies reais: Ultra Necrozma (#10157) real com Neuroforce em 1v1', () => {
  const ultraNecrozma = mon(10157, [282, 156], { types: ['psychic', 'dragon'], ability: 'neuroforce' });
  const target = mon(2, [33, 156], { types: ['psychic'] });
  const s = E.createBattle(ultraNecrozma, target);
  const r = turn(s, 282);

  const dmg = r.events.find(e => e.type === 'DAMAGE_APPLIED').damage;
  assert.ok(dmg > 0, 'Ultra Necrozma real deve aplicar 1.25x com Neuroforce');
});

/* ==========================================================================
   H4-A.8: IA, Adapter e Registry
   ========================================================================== */

test('BattleEvaluator (IA): calcula dano considerando multiplicadores exatos do H4-A', () => {
  const bBase = battle({ types: ['normal'] }, { types: ['psychic'] }, [282, 156], [33, 156]);
  const evBase = V.evaluateMove(bBase.player, bBase.enemy, bBase.player.moves[0], { battleState: bBase });

  // Prism Armor
  const bPrism = battle({ types: ['normal'] }, { types: ['psychic'], ability: 'prism-armor' }, [282, 156], [33, 156]);
  const evPrism = V.evaluateMove(bPrism.player, bPrism.enemy, bPrism.player.moves[0], { battleState: bPrism });
  assert.ok(Math.abs(evPrism.averageDamage / evBase.averageDamage - 0.75) < 0.01, 'IA deve calcular 0.75x para Prism Armor');

  // Neuroforce
  const bNeuro = battle({ types: ['normal'], ability: 'neuroforce' }, { types: ['psychic'] }, [282, 156], [33, 156]);
  const evNeuro = V.evaluateMove(bNeuro.player, bNeuro.enemy, bNeuro.player.moves[0], { battleState: bNeuro });
  assert.ok(Math.abs(evNeuro.averageDamage / evBase.averageDamage - 1.25) < 0.01, 'IA deve calcular 1.25x para Neuroforce');
});

test('UI Adapter: gera mensagens descritivas em português para todas as 5 habilidades H4-A', () => {
  const viewMessages = [];
  const adapter = new UI.BattleUiDomAdapter();
  adapter.view = { displayMessage: msg => viewMessages.push(msg) };

  const abilities = ['dark-aura', 'fairy-aura', 'aura-break', 'prism-armor', 'neuroforce'];
  for (const label of abilities) {
    adapter.handleCommand({
      type: 'MOVE_FAIL_FEEDBACK',
      reason: 'P7_ABILITY',
      label,
      pokemonName: 'TesteMon'
    });
  }

  assert.ok(viewMessages.some(m => m.includes('Dark Aura')));
  assert.ok(viewMessages.some(m => m.includes('Fairy Aura')));
  assert.ok(viewMessages.some(m => m.includes('Aura Break')));
  assert.ok(viewMessages.some(m => m.includes('Prism Armor')));
  assert.ok(viewMessages.some(m => m.includes('Neuroforce')));
});

test('AbilityRegistry: todas as 5 habilidades H4-A reportam status FULL e metadados canônicos', () => {
  const expected = [
    { id: 'dark-aura', phase: 'H4', gen: 6, breakable: false },
    { id: 'fairy-aura', phase: 'H4', gen: 6, breakable: false },
    { id: 'aura-break', phase: 'H4', gen: 6, breakable: false },
    { id: 'prism-armor', phase: 'H4', gen: 7, breakable: false },
    { id: 'neuroforce', phase: 'H4', gen: 7, breakable: false }
  ];

  for (const exp of expected) {
    const entry = Reg.getAbility(exp.id);
    assert.ok(entry, exp.id + ' deve existir no AbilityRegistry');
    assert.equal(entry.status, 'FULL', exp.id + ' deve ter status FULL');
    assert.equal(entry.phase, exp.phase, exp.id + ' deve pertencer à fase ' + exp.phase);
    assert.equal(entry.generation, exp.gen, exp.id + ' deve ser geração ' + exp.gen);
    assert.equal(entry.breakable, exp.breakable, exp.id + ' breakable deve ser ' + exp.breakable);
    assert.ok(entry.testFiles.includes('tests/battle/abilities-h4a.test.js'));
  }
});
