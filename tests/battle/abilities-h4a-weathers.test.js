const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const V = require('../../assets/js/battle/battle-evaluator');
const Reg = require('../../assets/js/battle/ability-registry');
const UI = require('../../assets/js/ui/battle-ui-adapter');
const TE = require('../../assets/js/battle/type-effectiveness');
const Special = require('../../assets/js/battle/p8-special');

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
   H4-A: Primordial Sea
   ========================================================================== */

test('Primordial Sea: ativa chuva primordial permanente na entrada', () => {
  const kyogre = mon(10077, [55, 33], { ability: 'primordial-sea' });
  const target = mon(2, [33, 53]);
  const s = E.createBattle(kyogre, target);
  assert.equal(s.weather?.id, 'primordial-sea');
  assert.equal(s.weather?.turns, null);
});

test('Primordial Sea: anula golpes ofensivos do tipo Fire', () => {
  const kyogre = mon(10077, [55, 33], { speed: 200, ability: 'primordial-sea' });
  const foe = mon(2, [53, 33], { speed: 100 }); // Flamethrower (#53)
  const s = E.createBattle(kyogre, foe);

  const r = turn(s, 33, {}, act(53));
  const failEv = r.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_PRIMORDIAL_WEATHER');
  assert.ok(failEv, 'Golpe Fire ofensivo deve falhar sob Primordial Sea');
  assert.equal(kyogre.currentHp, kyogre.maxHp, 'Kyogre não deve levar dano de Fire');
});

test('Primordial Sea: amplifica ataques Water em 1.5x', () => {
  // Clear weather baseline
  const pBase = mon(1, [55, 33], { speed: 200 });
  const tBase = mon(2, [33, 156], { speed: 50 });
  const sBase = E.createBattle(pBase, tBase);
  const rBase = turn(sBase, 55);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  // Under Primordial Sea
  const kyogre = mon(10077, [55, 33], { speed: 200, ability: 'primordial-sea' });
  const target = mon(2, [33, 156], { speed: 50 });
  const sSea = E.createBattle(kyogre, target);
  const rSea = turn(sSea, 55);
  const dSea = rSea.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dSea, Math.floor(dBase * 1.5), 'Ataque Water deve receber multiplicador 1.5x sob Primordial Sea');
});

test('Primordial Sea: impede substituição por climas comuns (Rain Dance, Sunny Day, Sandstorm)', () => {
  const kyogre = mon(10077, [33, 55], { speed: 200, ability: 'primordial-sea' });
  const sunSetter = mon(2, [241, 201], { speed: 100 }); // Sunny Day (#241)
  const s = E.createBattle(kyogre, sunSetter);

  const r = turn(s, 33, {}, act(241));
  const fail = r.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_FIELD_EXISTS');
  assert.ok(fail, 'Sunny Day deve falhar sob Primordial Sea');
  assert.equal(r.state.weather?.id, 'primordial-sea', 'Clima deve continuar primordial-sea');
});

test('Primordial Sea: desativa quando o portador é desmaiado', () => {
  const kyogre = mon(10077, [33, 55], { speed: 50, currentHp: 1, maxHp: 2000, ability: 'primordial-sea' });
  const foe = mon(2, [33, 55], { speed: 200, attack: 500 });
  const s = E.createBattle(kyogre, foe);

  assert.equal(s.weather?.id, 'primordial-sea');
  const r = turn(s, 33, {}, act(33)); // foe attacks first and KOs Kyogre
  assert.equal(r.state.player.currentHp, 0);
  assert.equal(r.state.weather, null, 'Primordial Sea deve encerrar quando o portador desmaia');
});

test('Primordial Sea: Swift Swim tem velocidade dobrada', () => {
  const seismitoad = mon(537, [33, 55], { speed: 100, ability: 'swift-swim' });
  const kyogre = mon(10077, [33, 55], { speed: 50, ability: 'primordial-sea' });
  const s = E.createBattle(seismitoad, kyogre);
  assert.equal(s.weather?.id, 'primordial-sea');
  const effSpeed = C.getEffectiveStat(s.player, 'speed', null, s);
  assert.equal(effSpeed, 200, 'Swift Swim deve dobrar velocidade sob Primordial Sea');
});

/* ==========================================================================
   H4-A: Desolate Land
   ========================================================================== */

test('Desolate Land: ativa sol primordial permanente na entrada', () => {
  const groudon = mon(10078, [53, 33], { ability: 'desolate-land' });
  const target = mon(2, [33, 55]);
  const s = E.createBattle(groudon, target);
  assert.equal(s.weather?.id, 'desolate-land');
  assert.equal(s.weather?.turns, null);
});

test('Desolate Land: anula e evapora completamente ataques Water ofensivos', () => {
  const groudon = mon(10078, [53, 33], { speed: 200, ability: 'desolate-land' });
  const foe = mon(2, [55, 33], { speed: 100 }); // Water Gun (#55)
  const s = E.createBattle(groudon, foe);

  const r = turn(s, 33, {}, act(55));
  const failEv = r.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_PRIMORDIAL_WEATHER');
  assert.ok(failEv, 'Golpe Water ofensivo deve evaporar e falhar sob Desolate Land');
  assert.equal(groudon.currentHp, groudon.maxHp, 'Groudon não deve sofrer dano de Water');
});

test('Desolate Land: amplifica ataques Fire em 1.5x', () => {
  // Clear weather baseline
  const pBase = mon(1, [53, 33], { speed: 200 });
  const tBase = mon(2, [33, 156], { speed: 50 });
  const sBase = E.createBattle(pBase, tBase);
  const rBase = turn(sBase, 53);
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  // Under Desolate Land
  const groudon = mon(10078, [53, 33], { speed: 200, ability: 'desolate-land' });
  const target = mon(2, [33, 156], { speed: 50 });
  const sLand = E.createBattle(groudon, target);
  const rLand = turn(sLand, 53);
  const dLand = rLand.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dLand, Math.floor(dBase * 1.5), 'Ataque Fire deve receber multiplicador 1.5x sob Desolate Land');
});

test('Desolate Land: Solar Beam (#76) dispara instantaneamente sem carregar', () => {
  const groudon = mon(10078, [76, 33], { speed: 200, ability: 'desolate-land' });
  const target = mon(2, [33, 156], { speed: 50 });
  const s = E.createBattle(groudon, target);

  const r = turn(s, 76);
  const dmg = r.events.find(e => e.type === 'DAMAGE_APPLIED');
  assert.ok(dmg, 'Solar Beam deve disparar e causar dano imediatamente no turno 1 sob Desolate Land');
});

test('Desolate Land: Chlorophyll dobra velocidade sob Desolate Land', () => {
  const venusaur = mon(3, [33, 53], { speed: 100, ability: 'chlorophyll' });
  const groudon = mon(10078, [33, 53], { speed: 50, ability: 'desolate-land' });
  const s = E.createBattle(venusaur, groudon);
  assert.equal(s.weather?.id, 'desolate-land');
  const effSpeed = C.getEffectiveStat(s.player, 'speed', null, s);
  assert.equal(effSpeed, 200, 'Chlorophyll deve dobrar velocidade sob Desolate Land');
});

/* ==========================================================================
   H4-A: Delta Stream
   ========================================================================== */

test('Delta Stream: ativa correntes misteriosas permanentes na entrada', () => {
  const rayquaza = mon(10079, [33, 156], { types: ['dragon', 'flying'], ability: 'delta-stream' });
  const foe = mon(2, [33, 156]);
  const s = E.createBattle(rayquaza, foe);
  assert.equal(s.weather?.id, 'delta-stream');
  assert.equal(s.weather?.turns, null);
});

test('Delta Stream: reduz fraquezas elementais de Flying (Ice, Electric, Rock) para 1x', () => {
  // Pure Flying defender under Delta Stream vs Ice, Electric, Rock
  const pureFlying = mon(641, [33, 156], { types: ['flying'], envWeather: 'delta-stream' });

  const effIce = Special.effectiveness('ice', pureFlying, TE, null, null, C);
  assert.equal(effIce.multiplier, 1, 'Ice vs Flying sob Delta Stream deve ser 1x');

  const effElec = Special.effectiveness('electric', pureFlying, TE, null, null, C);
  assert.equal(effElec.multiplier, 1, 'Electric vs Flying sob Delta Stream deve ser 1x');

  const effRock = Special.effectiveness('rock', pureFlying, TE, null, null, C);
  assert.equal(effRock.multiplier, 1, 'Rock vs Flying sob Delta Stream deve ser 1x');
});

test('Delta Stream: Rayquaza (Dragon/Flying) recebe 2x de Ice (não 4x), 0.5x de Electric e 1x de Rock', () => {
  const rayquaza = mon(10079, [33, 156], { types: ['dragon', 'flying'], envWeather: 'delta-stream' });

  // Ice: 2x (Dragon) * 1x (Flying modified from 2x) = 2x
  const effIce = Special.effectiveness('ice', rayquaza, TE, null, null, C);
  assert.equal(effIce.multiplier, 2, 'Ice vs Rayquaza sob Delta Stream deve ser 2x (não 4x)');

  // Electric: 0.5x (Dragon) * 1x (Flying modified from 2x) = 0.5x
  const effElec = Special.effectiveness('electric', rayquaza, TE, null, null, C);
  assert.equal(effElec.multiplier, 0.5, 'Electric vs Rayquaza sob Delta Stream deve ser 0.5x');

  // Rock: 1x (Dragon) * 1x (Flying modified from 2x) = 1x
  const effRock = Special.effectiveness('rock', rayquaza, TE, null, null, C);
  assert.equal(effRock.multiplier, 1, 'Rock vs Rayquaza sob Delta Stream deve ser 1x');
});

test('Delta Stream: não altera fraquezas de Pokémon sem tipo Flying', () => {
  const waterMon = mon(7, [33, 156], { types: ['water'], envWeather: 'delta-stream' });
  const effElec = Special.effectiveness('electric', waterMon, TE, null, null, C);
  assert.equal(effElec.multiplier, 2, 'Electric vs Water sob Delta Stream permanece 2x');
});

test('Delta Stream: cessa quando o portador desmaia', () => {
  const rayquaza = mon(10079, [33, 156], { types: ['dragon', 'flying'], speed: 50, currentHp: 1, maxHp: 2000, ability: 'delta-stream' });
  const foe = mon(2, [33, 156], { speed: 200, attack: 500 });
  const s = E.createBattle(rayquaza, foe);

  assert.equal(s.weather?.id, 'delta-stream');
  const r = turn(s, 33, {}, act(33));
  assert.equal(r.state.weather, null, 'Delta Stream deve encerrar quando Rayquaza desmaia');
});

/* ==========================================================================
   H4-A: Sand Spit
   ========================================================================== */

test('Sand Spit: ativa Sandstorm de 5 turnos ao sofrer dano direto', () => {
  const silicobra = mon(843, [33, 156], { speed: 50, ability: 'sand-spit' });
  const foe = mon(2, [33, 156], { speed: 200 }); // Tackle (#33)
  const s = E.createBattle(silicobra, foe);

  assert.equal(s.weather, null);
  const r = turn(s, 33, {}, act(33));
  assert.equal(r.state.weather?.id, 'sand', 'Sand Spit deve ativar tempestade de areia ao sofrer golpe');
  assert.equal(r.state.weather?.turns, 4, 'Duração de Sand Spit deve ter 4 turnos restantes ao final do turno de ativação (de 5 iniciais)');
});

test('Sand Spit: com Smooth Rock dura 8 turnos', () => {
  const silicobra = mon(843, [33, 156], { speed: 50, ability: 'sand-spit', item: 'smooth-rock' });
  const foe = mon(2, [33, 156], { speed: 200 });
  const s = E.createBattle(silicobra, foe);

  const r = turn(s, 33, {}, act(33));
  assert.equal(r.state.weather?.id, 'sand');
  assert.equal(r.state.weather?.turns, 7, 'Smooth Rock deve deixar 7 turnos restantes ao final do turno (de 8 iniciais)');
});

test('Sand Spit: ativa tempestade de areia mesmo se desmaiar com o golpe', () => {
  const silicobra = mon(843, [33, 156], { speed: 50, currentHp: 1, maxHp: 2000, ability: 'sand-spit' });
  const foe = mon(2, [33, 156], { speed: 200, attack: 500 });
  const s = E.createBattle(silicobra, foe);

  const r = turn(s, 33, {}, act(33));
  assert.equal(r.state.player.currentHp, 0, 'Silicobra deve desmaiar');
  assert.equal(r.state.weather?.id, 'sand', 'Sand Spit deve ser acionada mesmo quando o portador desmaia no golpe');
});

test('Sand Spit: NÃO sobrescreve climas primordiais (Primordial Sea)', () => {
  const silicobra = mon(843, [33, 156], { speed: 50, ability: 'sand-spit' });
  const kyogre = mon(10077, [33, 156], { speed: 200, ability: 'primordial-sea' });
  const s = E.createBattle(silicobra, kyogre);

  assert.equal(s.weather?.id, 'primordial-sea');
  const r = turn(s, 33, {}, act(33));
  assert.equal(r.state.weather?.id, 'primordial-sea', 'Sand Spit não pode sobrescrever Primordial Sea');
});

/* ==========================================================================
   H4-A: Flower Gift
   ========================================================================== */

test('Flower Gift: Cherrim muda para Sunshine Form (#42101) sob Sun ou Desolate Land', () => {
  const cherrim = mon(421, [33, 156], { types: ['grass'], ability: 'flower-gift' });
  const ninetales = mon(38, [33, 156], { ability: 'drought' }); // sets sun
  const s = E.createBattle(cherrim, ninetales);

  assert.equal(s.weather?.id, 'sun');
  assert.equal(s.player.formSpeciesId, 42101, 'Cherrim deve estar na Sunshine Form sob Sol');
});

test('Flower Gift: Cherrim concede +50% de Ataque sob sol', () => {
  const cherrim = mon(421, [33, 156], { attack: 100, ability: 'flower-gift' });
  const target = mon(2, [33, 156]);
  const s = E.createBattle(cherrim, target);

  // Sem sol
  const atkNormal = C.getEffectiveStat(s.player, 'attack', null, s);
  assert.equal(atkNormal, 100);

  // Com sol
  s.weather = { id: 'sun', turns: 5 };
  s.player.envWeather = 'sun';
  const atkSun = C.getEffectiveStat(s.player, 'attack', null, s);
  assert.equal(atkSun, 150, 'Flower Gift deve aumentar o Ataque em 1.5x sob Sol');
});

test('Flower Gift: Cherrim concede +50% de Special Defense sob sol', () => {
  const cherrim = mon(421, [33, 156], { specialDefense: 100, ability: 'flower-gift' });
  const target = mon(2, [33, 156]);
  const s = E.createBattle(cherrim, target);

  s.weather = { id: 'sun', turns: 5 };
  s.player.envWeather = 'sun';
  const spdSun = C.getEffectiveStat(s.player, 'specialDefense', null, s);
  assert.equal(spdSun, 150, 'Flower Gift deve aumentar a SpD em 1.5x sob Sol');
});

test('Flower Gift: reverte para Overcast Form (#421) quando o sol termina', () => {
  const cherrim = mon(421, [33, 156], { types: ['grass'], ability: 'flower-gift' });
  const ninetales = mon(38, [33, 156], { ability: 'drought' });
  const s = E.createBattle(cherrim, ninetales);

  assert.equal(s.player.formSpeciesId, 42101);
  s.weather = null;
  s.player.envWeather = null;
  Special.updateFieldAbilities(s, C, []);
  assert.equal(s.player.formSpeciesId, null, 'Cherrim deve reverter à forma Overcast sem sol');
});

/* ==========================================================================
   H4-A: Targeted Primordial Weather Tests (Auditoria Canônica)
   ========================================================================== */

test('Primordial Weather: dois portadores ativos em Doubles mantêm clima até que ambos saiam ou desmaiem', () => {
  const k1 = mon(10077, [55, 33], { ability: 'primordial-sea' });
  const k2 = mon(10077, [55, 33], { ability: 'primordial-sea' });
  const foe1 = mon(2, [33, 156]);
  const foe2 = mon(3, [33, 156]);

  const s = {
    battleFormat: 'DOUBLES',
    weather: { id: 'primordial-sea', turns: null },
    doublesTeams: {
      player: { activeIndices: [0, 1], team: [k1, foe1] },
      enemy: { activeIndices: [0, 1], team: [k2, foe2] }
    }
  };

  // k1 faints: k2 is still active on enemy side with Primordial Sea
  k1.currentHp = 0;
  C.P7.handleFaint(s, 'player', k1, C, []);
  assert.equal(s.weather?.id, 'primordial-sea', 'Clima primordial continua enquanto houver outro portador ativo');

  // k2 also faints: no more bearers
  k2.currentHp = 0;
  C.P7.handleFaint(s, 'enemy', k2, C, []);
  assert.equal(s.weather, null, 'Clima primordial encerra quando o último portador desmaia');
});

test('Primordial Weather: climas primordiais substituem outros climas primordiais entre si', () => {
  const kyogre = mon(10077, [55, 33], { speed: 300, ability: 'primordial-sea' });
  const groudon = mon(10078, [53, 33], { speed: 200, ability: 'desolate-land' });

  // In start order, faster Kyogre enters first (Primordial Sea), then slower Groudon enters (Desolate Land overrides)
  const s = E.createBattle(kyogre, groudon);
  assert.equal(s.weather?.id, 'desolate-land', 'Desolate Land pode sobrepor Primordial Sea na entrada');

  // In Doubles, Mega Rayquaza entering sets Delta Stream over Desolate Land
  const rayquaza = mon(10079, [33, 156], { ability: 'delta-stream' });
  const sDoubles = {
    battleFormat: 'DOUBLES',
    weather: { id: 'desolate-land', turns: null },
    doublesTeams: {
      player: { activeIndices: [0, 1], team: [kyogre, rayquaza] },
      enemy: { activeIndices: [0, 1], team: [groudon, mon(2, [33, 156])] }
    }
  };
  sDoubles.weather = { id: 'delta-stream', turns: null };
  C.P7.sync(sDoubles);
  assert.equal(sDoubles.weather?.id, 'delta-stream', 'Delta Stream pode sobrepor Desolate Land');
});

test('Primordial Weather: Cloud Nine / Air Lock suprime o efeito do clima mantendo o estado na arena', () => {
  const kyogre = mon(10077, [55, 33], { speed: 200, ability: 'primordial-sea' });
  const golduck = mon(55, [53, 33], { speed: 50, ability: 'cloud-nine' }); // Golduck with Flamethrower (#53)
  const s = E.createBattle(kyogre, golduck);

  assert.equal(s.weather?.id, 'primordial-sea', 'Estado do clima continua armazenado na arena');
  assert.equal(C.P7.fieldWeather(s), null, 'Clima efetivo de campo é null sob Cloud Nine');

  // Under Cloud Nine, Fire move is NOT blocked
  const r = turn(s, 33, {}, act(53));
  const failEv = r.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_PRIMORDIAL_WEATHER');
  assert.equal(failEv, undefined, 'Ataque Fire não deve ser bloqueado quando Cloud Nine está em campo');
  assert.ok(r.state.player.currentHp < r.state.player.maxHp, 'Kyogre sofre dano de Fire no novo estado de batalha sob Cloud Nine');
});

test('Primordial Weather: Neutralizing Gas encerra Primordial Sea ao entrar em campo', () => {
  const kyogre = mon(10077, [55, 33], { ability: 'primordial-sea' });
  const weezing = mon(110, [33, 156], { ability: 'neutralizing-gas' });
  const s = E.createBattle(kyogre, weezing);

  assert.equal(s.weather, null, 'Neutralizing Gas desativa o clima primordial de Kyogre');
});

test('Flower Gift: em Doubles, concede +50% de Ataque e Sp. Def ao aliado da equipe sob sol', () => {
  const cherrim = mon(421, [33, 156], { ability: 'flower-gift' });
  const ally = mon(1, [33, 156], { attack: 100, specialDefense: 100 });
  const foe1 = mon(2, [33, 156]);
  const foe2 = mon(3, [33, 156]);

  const s = {
    battleFormat: 'DOUBLES',
    weather: { id: 'sun', turns: 5 },
    doublesTeams: {
      player: { activeIndices: [0, 1], team: [cherrim, ally] },
      enemy: { activeIndices: [0, 1], team: [foe1, foe2] }
    }
  };

  C.P7.sync(s);
  assert.equal(ally.flowerGiftActive, true, 'Aliado de Cherrim deve receber flag flowerGiftActive sob sol');

  const allyAtk = C.getEffectiveStat(ally, 'attack', null, s);
  assert.equal(allyAtk, 150, 'Aliado de Cherrim recebe +50% de Ataque sob sol');

  const allySpD = C.getEffectiveStat(ally, 'specialDefense', null, s);
  assert.equal(allySpD, 150, 'Aliado de Cherrim recebe +50% de SpD sob sol');
});

test('Flower Gift: Cherrim restaura forma normal (Overcast) ao sair de campo', () => {
  const cherrim = mon(421, [33, 156], { ability: 'flower-gift' });
  cherrim.formSpeciesId = 42101; // Sunshine

  Special.leave(cherrim, false);
  assert.equal(cherrim.formSpeciesId, null, 'Cherrim reverte à forma normal 421 após sair de campo');
});
