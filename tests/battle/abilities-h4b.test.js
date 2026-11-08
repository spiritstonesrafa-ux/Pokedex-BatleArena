const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const V = require('../../assets/js/battle/battle-evaluator');
const Reg = require('../../assets/js/battle/ability-registry');
const P7 = require('../../assets/js/battle/p7-mechanics');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const mon = (id, ids = [33, 85], extra = {}) => ({
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

const battle = (a = {}, b = {}, idsA = [33, 85], idsB = [33, 85]) => E.createBattle(
  mon(1, idsA, { speed: 200, ...a }),
  mon(2, idsB, { speed: 50, ...b })
);

const turn = (s, id = 33, extra = {}, enemy = act(33)) => E.resolveTurn(s, {
  player: act(id, extra),
  enemy
});

/* ==========================================================================
   ETAPA 5 — TERRENOS: Seed Sower, Grass Pelt, Surge Surfer, Hadron Engine
   ========================================================================== */

test('Seed Sower: ativa Grassy Terrain por 5 turnos ao sofrer dano físico direto (#33 Tackle)', () => {
  const s = battle({ ability: 'seed-sower', speed: 50 }, { speed: 200 });
  assert.equal(s.terrain, null);

  const r = turn(s, 33);
  assert.equal(r.state.terrain?.id, 'grassy');
  assert.equal(r.state.terrain?.turns, 4); // 5 turnos no início do golpe, decrementado para 4 no fim do turno
});

test('Seed Sower: ativa Grassy Terrain ao sofrer dano especial direto (#85 Thunderbolt)', () => {
  const s = battle({ ability: 'seed-sower', speed: 50 }, { speed: 200 }, [33, 85], [85, 33]);
  assert.equal(s.terrain, null);

  const r = turn(s, 33, {}, act(85));
  assert.equal(r.state.terrain?.id, 'grassy');
});

test('Seed Sower: com Terrain Extender dura 8 turnos (7 restantes ao fim do turno)', () => {
  const s = battle({ ability: 'seed-sower', item: 'terrain-extender', speed: 50 }, { speed: 200 });
  const r = turn(s, 33);
  assert.equal(r.state.terrain?.id, 'grassy');
  assert.equal(r.state.terrain?.turns, 7);
});

test('Seed Sower: NÃO ativa ao sofrer movimento de Status sem dano direto (#241 Sunny Day)', () => {
  const s = battle({ ability: 'seed-sower', speed: 50 }, { speed: 200 }, [33], [241]);
  const r = turn(s, 33, {}, act(241));
  assert.equal(r.state.terrain, null, 'Status move sem dano não deve ativar Seed Sower');
});

test('Seed Sower: é suprimida por Neutralizing Gas', () => {
  const s = battle({ ability: 'seed-sower', speed: 50 }, { ability: 'neutralizing-gas', speed: 200 });
  const r = turn(s, 33);
  assert.equal(r.state.terrain, null);
});

test('Grass Pelt: aumenta Defense em 1.5x sob Grassy Terrain e retorna ao normal ao fim do terreno', () => {
  const s = battle({ ability: 'grass-pelt', defense: 100 }, {});
  assert.equal(C.getEffectiveStat(s.player, 'defense'), 100);

  P7.setTerrain(s, 'grassy', s.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');
  assert.equal(C.getEffectiveStat(s.player, 'defense'), 150);

  s.terrain = null;
  P7.sync(s);
  assert.equal(C.getEffectiveStat(s.player, 'defense'), 100);
});

test('Grass Pelt: é quebrável por Mold Breaker (flags: { breakable: 1 })', () => {
  const s = battle({ ability: 'grass-pelt', defense: 100 }, {});
  P7.setTerrain(s, 'grassy', s.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');

  const mbAttacker = mon(530, [33], { ability: 'mold-breaker' });
  const effDefAgainstMB = C.getEffectiveStat(s.player, 'defense', move(33), mbAttacker);
  assert.equal(effDefAgainstMB, 100, 'Mold Breaker deve ignorar Grass Pelt');
});

test('Surge Surfer: dobra Speed (2.0x) sob Electric Terrain sem exigir que o Pokémon esteja aterrado', () => {
  const s = battle({ ability: 'surge-surfer', speed: 100, types: ['electric', 'psychic'] }, {});
  assert.equal(C.getEffectiveStat(s.player, 'speed'), 100);

  P7.setTerrain(s, 'electric', s.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');
  assert.equal(C.getEffectiveStat(s.player, 'speed'), 200);

  // Não aterrado (grounded = false) continua com 2x Speed
  s.player.grounded = false;
  assert.equal(C.getEffectiveStat(s.player, 'speed'), 200);

  s.terrain = null;
  P7.sync(s);
  assert.equal(C.getEffectiveStat(s.player, 'speed'), 100);
});

test('Hadron Engine: invoca Electric Terrain na entrada e amplifica SpA em 5461/4096 (~1.33x)', () => {
  const s = battle({ ability: 'hadron-engine', specialAttack: 100 }, {});
  assert.equal(s.terrain?.id, 'electric');
  assert.equal(C.getEffectiveStat(s.player, 'specialAttack'), 133);

  // Limpar terreno -> SpA retorna ao valor normal
  s.terrain = null;
  P7.sync(s);
  assert.equal(C.getEffectiveStat(s.player, 'specialAttack'), 100);
});

test('Hadron Engine: na entrada com Electric Terrain pré-existente ativa sem reiniciar duração', () => {
  const sPrior = battle({ ability: 'hadron-engine' }, { speed: 50 });
  sPrior.terrain = { id: 'electric', turns: 2 };
  P7.sync(sPrior);

  const events = [];
  P7.enter(sPrior, 'player', { P6: C.P6, P7, getEffectiveStat: C.getEffectiveStat }, events);

  assert.equal(sPrior.terrain.turns, 2, 'Duração do terreno não deve ser reiniciada');
  assert.ok(events.some(e => e.label === 'hadron-engine'));
});

test('Hadron Engine: restrições canônicas de troca e cópia', () => {
  assert.equal(P7.untraceableAbilities.includes('hadron-engine'), true);
  assert.equal(P7.unswappableAbilities.includes('hadron-engine'), true);
  assert.equal(P7.unoverwritableAbilities.includes('hadron-engine'), true);
  assert.equal(P7.noReceiverAbilities.includes('hadron-engine'), true);
});

/* ==========================================================================
   ETAPA 2 — PROTOSYNTHESIS E QUARK DRIVE (getBestStat com estágios e desempate)
   ========================================================================== */

test('Protosynthesis: seleção do melhor atributo considera estágios de boost ativos (getBestStat false, true)', () => {
  // Base: Attack 100, Speed 80. Com +1 Speed (80 * 1.5 = 120), Speed deve vencer Attack (120 > 100)
  const s = battle({
    ability: 'protosynthesis',
    attack: 100,
    defense: 80,
    specialAttack: 80,
    specialDefense: 80,
    speed: 80,
    statStages: { speed: 1 }
  }, {});

  P7.setWeather(s, 'sun', s.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');
  assert.equal(s.player.paradoxBestStat, 'speed', 'Com +1 stage em Speed (120), Speed deve ser escolhido sobre Atk (100)');
  // Speed boost de Paradox é 1.5x sobre o valor com stage: 120 * 1.5 = 180
  assert.equal(C.getEffectiveStat(s.player, 'speed'), 180);
});

test('Protosynthesis / Quark Drive: desempate estrito Atk > Def > SpA > SpD > Speed', () => {
  // Empate 100 em todos os atributos -> Attack vence
  const sAtk = battle({
    ability: 'protosynthesis',
    attack: 100, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100
  }, {});
  P7.setWeather(sAtk, 'sun', sAtk.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');
  assert.equal(sAtk.player.paradoxBestStat, 'attack');

  // Empate 100 em Def, SpA, SpD, Spe (Atk 80) -> Defense vence
  const sDef = battle({
    ability: 'protosynthesis',
    attack: 80, defense: 100, specialAttack: 100, specialDefense: 100, speed: 100
  }, {});
  P7.setWeather(sDef, 'sun', sDef.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');
  assert.equal(sDef.player.paradoxBestStat, 'defense');

  // Empate 100 em SpA, SpD, Spe (Atk 80, Def 80) -> SpA vence
  const sSpA = battle({
    ability: 'protosynthesis',
    attack: 80, defense: 80, specialAttack: 100, specialDefense: 100, speed: 100
  }, {});
  P7.setWeather(sSpA, 'sun', sSpA.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');
  assert.equal(sSpA.player.paradoxBestStat, 'specialAttack');

  // Empate 100 em SpD, Spe (Atk 80, Def 80, SpA 80) -> SpD vence
  const sSpD = battle({
    ability: 'protosynthesis',
    attack: 80, defense: 80, specialAttack: 80, specialDefense: 100, speed: 100
  }, {});
  P7.setWeather(sSpD, 'sun', sSpD.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');
  assert.equal(sSpD.player.paradoxBestStat, 'specialDefense');
});

test('Protosynthesis: atributo permanece fixado durante a ativação mesmo após mudanças de estágios', () => {
  const s = battle({
    ability: 'protosynthesis',
    attack: 100,
    speed: 90
  }, {});

  P7.setWeather(s, 'sun', s.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');
  assert.equal(s.player.paradoxBestStat, 'attack');

  // Portador recebe +2 Speed stages posteriormente
  s.player.statStages = { speed: 2 };
  P7.sync(s);
  // O melhor atributo inicial 'attack' permanece FIXADO
  assert.equal(s.player.paradoxBestStat, 'attack', 'Atributo escolhido não deve mudar enquanto a ativação estiver em curso');
});

test('Protosynthesis: seleção é refeita quando o efeito termina e uma nova ativação ocorre', () => {
  const s = battle({
    ability: 'protosynthesis',
    attack: 100,
    speed: 90
  }, {});

  // Primeira ativação sob sol: Attack é 100, Speed é 90 -> Attack vence
  P7.setWeather(s, 'sun', s.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');
  assert.equal(s.player.paradoxBestStat, 'attack');

  // Sol encerra
  s.weather = null;
  P7.sync(s);
  assert.equal(s.player.paradoxBestStat, undefined, 'bestStat deve ser removido após o fim do clima');

  // Portador recebe +2 em Speed stages (90 * 2 = 180)
  s.player.statStages = { speed: 2 };
  // Novo sol é ativado: nova seleção deve escolher Speed
  P7.setWeather(s, 'sun', s.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');
  assert.equal(s.player.paradoxBestStat, 'speed', 'Nova ativação deve recalcular o atributo com os novos stages');
});

test('Quark Drive: ativa sob Electric Terrain com multiplicador 5325/4096 para atributos que não são Speed', () => {
  const s = battle({
    ability: 'quark-drive',
    attack: 80,
    defense: 80,
    specialAttack: 100,
    specialDefense: 80,
    speed: 80
  }, {});

  P7.setTerrain(s, 'electric', s.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');
  assert.equal(s.player.paradoxBestStat, 'specialAttack');
  // 100 * 5325 / 4096 = 130.004 -> 130
  assert.equal(C.getEffectiveStat(s.player, 'specialAttack'), 130);
});

test('Protosynthesis / Quark Drive: Neutralizing Gas suprime o bônus temporariamente', () => {
  const s = battle({
    ability: 'protosynthesis',
    attack: 100,
    speed: 80
  }, { ability: 'neutralizing-gas' });

  P7.setWeather(s, 'sun', s.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');
  // Sob Neutralizing Gas, habilidade é suprimida -> bônus não é aplicado
  assert.equal(C.getEffectiveStat(s.player, 'attack'), 100);
});

/* ==========================================================================
   ETAPA 3 — BOOSTER ENERGY (Consumo, persistência, restrições e ciclo de vida)
   ========================================================================== */

test('Booster Energy: Pokémon entra sem condição ambiental -> item é consumido e atributo energizado', () => {
  const s = battle({
    ability: 'protosynthesis',
    item: 'booster-energy',
    attack: 150,
    speed: 100
  }, {});

  assert.equal(s.player.item, null, 'Booster Energy deve ser consumido na entrada');
  assert.equal(s.player.protosynthesisFromBooster, true);
  // 150 * 5325 / 4096 = 195
  assert.equal(C.getEffectiveStat(s.player, 'attack'), 195);
});

test('Booster Energy: Pokémon entra com condição ambiental ativa -> item NÃO é consumido', () => {
  const s = battle(
    { ability: 'protosynthesis', item: 'booster-energy', attack: 150, speed: 50 },
    { ability: 'drought', speed: 200 }
  );

  assert.equal(s.weather?.id, 'sun');
  assert.equal(s.player.item, 'booster-energy', 'Item deve ser preservado enquanto sol estiver ativo');
  assert.equal(s.player.protosynthesisFromBooster, undefined);
  assert.equal(C.getEffectiveStat(s.player, 'attack'), 195);
});

test('Booster Energy: condição ambiental expira no final do turno -> Booster Energy ativa subsequentemente', () => {
  // Enemy ativa Drought na entrada (speed 200 > speed 50 do player)
  const s = battle(
    { ability: 'protosynthesis', item: 'booster-energy', attack: 150, speed: 50 },
    { ability: 'drought', speed: 200 }
  );
  assert.equal(s.player.item, 'booster-energy', 'Item não deve ser consumido na entrada com sol ativo');
  assert.equal(s.player.protosynthesisFromBooster, undefined);

  // Reduz a duração do sol para 1 turno restante
  s.weather.turns = 1;

  // Turno ocorre e sol expira no fim do turno (endTurn)
  const r = turn(s, 33);
  assert.equal(r.state.weather, null, 'Sol deve ter expirado');
  assert.equal(r.state.player.item, null, 'Booster Energy deve ser consumido quando o sol expirar');
  assert.equal(r.state.player.protosynthesisFromBooster, true, 'Ativação via Booster deve persistir');
  assert.equal(C.getEffectiveStat(r.state.player, 'attack'), 195);
});

test('Booster Energy: boost persiste mesmo após mudança para outro clima (chuva)', () => {
  const s = battle({
    ability: 'protosynthesis',
    item: 'booster-energy',
    attack: 150,
    speed: 100
  }, {});

  assert.equal(s.player.item, null);
  assert.equal(s.player.protosynthesisFromBooster, true);

  // Clima muda para chuva
  P7.setWeather(s, 'rain', s.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, [], 'player');
  assert.equal(C.getEffectiveStat(s.player, 'attack'), 195, 'Boost por Booster Energy deve persistir sob chuva');
});

test('Booster Energy: troca do portador encerra o efeito de Protosynthesis', () => {
  const s = battle({
    ability: 'protosynthesis',
    item: 'booster-energy',
    attack: 150,
    speed: 100
  }, {});

  assert.equal(s.player.protosynthesisActive, true);
  // Portador sai de campo
  P7.leave(s, 'player', s.player, { P6: C.P6, getEffectiveStat: C.getEffectiveStat }, []);
  assert.equal(s.player.protosynthesisActive, undefined);
  assert.equal(s.player.protosynthesisFromBooster, undefined);
  assert.equal(s.player.paradoxBestStat, undefined);
});

test('Booster Energy: não pode ser consumido por Pokémon Transformado (Transform)', () => {
  const s = battle({
    ability: 'protosynthesis'
  }, {});
  s.player.transformOriginal = { id: 132, ability: 'limber' };
  s.player.item = 'booster-energy';
  const events = [];
  C.P7.refreshBerries(s, C, events);

  assert.equal(s.player.item, 'booster-energy', 'Pokémon Transform não pode consumir Booster Energy');
  assert.equal(s.player.protosynthesisFromBooster, undefined);
});

test('Booster Energy: não pode ser removido/roubado de Pokémon Paradox, mas pode de outras espécies', () => {
  const paradoxProto = mon(988, [33], { ability: 'protosynthesis', item: 'booster-energy' });
  assert.equal(P7.removable(paradoxProto), false, 'Paradox com Protosynthesis não pode ter item removido');

  const paradoxQuark = mon(990, [33], { ability: 'quark-drive', item: 'booster-energy' });
  assert.equal(P7.removable(paradoxQuark), false, 'Paradox com Quark Drive não pode ter item removido');

  // Showdown onTakeItem: source.baseSpecies.tags.includes("Paradox")
  // Paradox com habilidade alterada ou suprimida continua protegido por sua espécie-base
  const paradoxSuppressed = mon(1005, [33], { ability: 'insomnia', item: 'booster-energy', abilitySuppressed: true });
  assert.equal(P7.removable(paradoxSuppressed), false, 'Paradox com habilidade alterada/suprimida continua protegido por ser Paradox');

  // Ditto transformado em Paradox NÃO é espécie-base Paradox -> Booster Energy PODE ser removido
  const transformedDitto = mon(1005, [33], {
    ability: 'protosynthesis',
    item: 'booster-energy',
    transformOriginal: { id: 132, name: 'ditto' }
  });
  assert.equal(P7.removable(transformedDitto), true, 'Ditto transformado em Paradox não é espécie-base Paradox e pode perder o item');

  const nonParadox = mon(25, [33], { ability: 'static', item: 'booster-energy' });
  assert.equal(P7.removable(nonParadox), true, 'Não-Paradox pode ter Booster Energy removido/roubado');
});

/* ==========================================================================
   ETAPA 4 — TESOUROS DA RUÍNA (Singles, Doubles, Auras, Mold Breaker e IA)
   ========================================================================== */

test('Tablets of Ruin: reduz Attack de adversário em 25% (0.75x), portador é imune', () => {
  const s = battle({ ability: 'tablets-of-ruin', attack: 100 }, { attack: 100 });
  assert.equal(C.getEffectiveStat(s.player, 'attack'), 100);
  assert.equal(C.getEffectiveStat(s.enemy, 'attack'), 75);
});

test('Sword of Ruin: reduz Defense de adversário em 25% (0.75x), portador é imune', () => {
  const s = battle({ ability: 'sword-of-ruin', defense: 100 }, { defense: 100 });
  assert.equal(C.getEffectiveStat(s.player, 'defense'), 100);
  assert.equal(C.getEffectiveStat(s.enemy, 'defense'), 75);
});

test('Vessel of Ruin: reduz Special Attack de adversário em 25% (0.75x), portador é imune', () => {
  const s = battle({ ability: 'vessel-of-ruin', specialAttack: 100 }, { specialAttack: 100 });
  assert.equal(C.getEffectiveStat(s.player, 'specialAttack'), 100);
  assert.equal(C.getEffectiveStat(s.enemy, 'specialAttack'), 75);
});

test('Beads of Ruin: reduz Special Defense de adversário em 25% (0.75x), portador é imune', () => {
  const s = battle({ ability: 'beads-of-ruin', specialDefense: 100 }, { specialDefense: 100 });
  assert.equal(C.getEffectiveStat(s.player, 'specialDefense'), 100);
  assert.equal(C.getEffectiveStat(s.enemy, 'specialDefense'), 75);
});

test('Tesouros da Ruína: dois portadores idênticos NÃO acumulam penalidade', () => {
  const s = battle({ ability: 'beads-of-ruin', specialDefense: 100 }, { ability: 'beads-of-ruin', specialDefense: 100 });
  // Ambos os portadores são imunes à aura de Beads of Ruin
  assert.equal(C.getEffectiveStat(s.player, 'specialDefense'), 100);
  assert.equal(C.getEffectiveStat(s.enemy, 'specialDefense'), 100);
});

test('Tesouros da Ruína: auras diferentes se combinam cumulativamente', () => {
  const s = battle(
    { ability: 'tablets-of-ruin', attack: 100, defense: 100 },
    { ability: 'sword-of-ruin', attack: 100, defense: 100 }
  );

  // Player tem Atk normal (imune à sua aura) e Defense 75 (afetado por Sword)
  assert.equal(C.getEffectiveStat(s.player, 'attack'), 100);
  assert.equal(C.getEffectiveStat(s.player, 'defense'), 75);

  // Enemy tem Atk 75 (afetado por Tablets) e Defense normal (imune à sua aura)
  assert.equal(C.getEffectiveStat(s.enemy, 'attack'), 75);
  assert.equal(C.getEffectiveStat(s.enemy, 'defense'), 100);
});

test('Tesouros da Ruína: NÃO são quebrados por Mold Breaker (flags: {})', () => {
  const s = battle({ ability: 'tablets-of-ruin' }, { ability: 'mold-breaker', attack: 100 });
  assert.equal(C.getEffectiveStat(s.enemy, 'attack'), 75, 'Mold Breaker não anula debuff de Tablets of Ruin');

  const sSword = battle({ ability: 'sword-of-ruin' }, { defense: 100 });
  const mbAttacker = mon(530, [33], { ability: 'mold-breaker' });
  const effDef = C.getEffectiveStat(sSword.enemy, 'defense', move(33), mbAttacker);
  assert.equal(effDef, 75, 'Mold Breaker atacante não restaura a defesa rebaixada por Sword of Ruin');
});

test('Tesouros da Ruína: Neutralizing Gas suprime a aura', () => {
  const s = battle({ ability: 'beads-of-ruin', specialDefense: 100 }, { ability: 'neutralizing-gas', specialDefense: 100 });
  assert.equal(C.getEffectiveStat(s.enemy, 'specialDefense'), 100);
});

test('Tesouros da Ruína em Doubles: afeta aliados e adversários, exceto portadores da mesma Ruína', () => {
  const tingLu = mon(1003, [33], { ability: 'vessel-of-ruin', specialAttack: 100 });
  const ally = mon(1, [33], { specialAttack: 100 });
  const enemy1 = mon(2, [33], { specialAttack: 100 });
  const enemy2 = mon(3, [33], { ability: 'vessel-of-ruin', specialAttack: 100 });

  const sDoubles = {
    battleFormat: 'DOUBLES',
    player: tingLu,
    enemy: enemy1,
    doublesTeams: {
      player: { team: [tingLu, ally], activeIndices: [0, 1] },
      enemy: { team: [enemy1, enemy2], activeIndices: [0, 1] }
    }
  };
  P7.sync(sDoubles);

  assert.equal(C.getEffectiveStat(tingLu, 'specialAttack'), 100, 'Portador Ting-Lu é imune');
  assert.equal(C.getEffectiveStat(ally, 'specialAttack'), 75, 'Aliado sofre redução de 0.75x');
  assert.equal(C.getEffectiveStat(enemy1, 'specialAttack'), 75, 'Adversário 1 sofre redução de 0.75x');
  assert.equal(C.getEffectiveStat(enemy2, 'specialAttack'), 100, 'Adversário 2 portador de Vessel of Ruin é imune');
});

test('BattleEvaluator (IA): incorpora Hadron Engine e auras de Ruína nos cálculos de dano', () => {
  const sBase = battle({ specialAttack: 100 }, {}, [85], [33]);
  const evBase = V.evaluateMove(sBase.player, sBase.enemy, sBase.player.moves[0], { battleState: sBase });

  // Hadron Engine amplifica o dano elétrico
  const sHadron = battle({ ability: 'hadron-engine', specialAttack: 100 }, {}, [85], [33]);
  const evHadron = V.evaluateMove(sHadron.player, sHadron.enemy, sHadron.player.moves[0], { battleState: sHadron });
  assert.ok(evHadron.averageDamage > evBase.averageDamage, 'IA deve calcular dano superior com Hadron Engine');

  // Vessel of Ruin reduz dano especial do oponente
  const sVessel = battle({ specialAttack: 100 }, { ability: 'vessel-of-ruin' }, [85], [33]);
  const evVessel = V.evaluateMove(sVessel.player, sVessel.enemy, sVessel.player.moves[0], { battleState: sVessel });
  assert.ok(evVessel.averageDamage < evBase.averageDamage, 'IA deve calcular dano reduzido sob Vessel of Ruin');
});
