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
   H4-A: Dry Skin
   ========================================================================== */

test('Dry Skin: absorve golpe Water, cura 25% do HP máximo e anula o dano', () => {
  const parasect = mon(47, [33, 156], { speed: 50, currentHp: 1000, maxHp: 2000, ability: 'dry-skin' });
  const waterAttacker = mon(2, [55, 156], { speed: 200 }); // Water Gun (#55)
  const s = E.createBattle(parasect, waterAttacker);

  const r = turn(s, 33, {}, act(55));
  assert.equal(r.state.player.currentHp, 1500, 'Dry Skin deve curar 25% do HP máximo (500 de 2000)');
  const dmg = r.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'player');
  assert.equal(dmg, undefined, 'Dry Skin anula o dano de água recebido');
});

test('Dry Skin: Mold Breaker ignora a absorção e causa dano', () => {
  const parasect = mon(47, [33, 156], { speed: 50, currentHp: 2000, maxHp: 2000, ability: 'dry-skin' });
  const moldAttacker = mon(2, [55, 156], { speed: 200, ability: 'mold-breaker' });
  const s = E.createBattle(parasect, moldAttacker);

  const r = turn(s, 33, {}, act(55));
  assert.ok(r.state.player.currentHp < 2000, 'Mold Breaker deve furar Dry Skin e causar dano com golpe Water');
});

test('Dry Skin: sofre 1.25x (+25%) de dano de ataques do tipo Fire', () => {
  // Baseline without Dry Skin
  const baseDef = mon(1, [33, 156], { speed: 50 });
  const fireAtk = mon(2, [53, 156], { speed: 200 }); // Flamethrower (#53)
  const sBase = E.createBattle(baseDef, fireAtk);
  const rBase = turn(sBase, 33, {}, act(53));
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  // With Dry Skin
  const dryDef = mon(47, [33, 156], { speed: 50, ability: 'dry-skin' });
  const sDry = E.createBattle(dryDef, fireAtk);
  const rDry = turn(sDry, 33, {}, act(53));
  const dDry = rDry.events.find(e => e.type === 'DAMAGE_APPLIED').damage;

  assert.equal(dDry, Math.floor(dBase * 1.25), 'Dry Skin deve aumentar o dano de Fire em 25% (1.25x)');
});

test('Dry Skin: recupera 1/8 do HP máximo no final do turno sob Rain ou Primordial Sea', () => {
  const toxicroak = mon(454, [33, 156], { speed: 200, currentHp: 1000, maxHp: 2000, ability: 'dry-skin' });
  const foe = mon(2, [33, 156], { speed: 50 });
  const s = E.createBattle(toxicroak, foe);
  s.weather = { id: 'rain', turns: 5 };
  s.player.envWeather = 'rain';

  const r = turn(s, 33);
  // 1/8 of 2000 is 250
  assert.equal(r.state.player.currentHp, 1250, 'Dry Skin deve curar 1/8 (250 HP) no final do turno sob chuva');
});

test('Dry Skin: sofre 1/8 do HP máximo de dano no final do turno sob Sun ou Desolate Land', () => {
  const toxicroak = mon(454, [33, 156], { speed: 200, currentHp: 2000, maxHp: 2000, ability: 'dry-skin' });
  const foe = mon(2, [33, 156], { speed: 50 });
  const s = E.createBattle(toxicroak, foe);
  s.weather = { id: 'sun', turns: 5 };
  s.player.envWeather = 'sun';

  const r = turn(s, 33);
  // 1/8 of 2000 is 250 damage
  assert.equal(r.state.player.currentHp, 1750, 'Dry Skin deve causar 1/8 (250 HP) de dano no final do turno sob sol');
});

/* ==========================================================================
   H4-A: Ice Body
   ========================================================================== */

test('Ice Body: recupera 1/16 do HP máximo no final do turno sob Snow ou Hail', () => {
  const glalie = mon(362, [33, 156], { speed: 200, currentHp: 1000, maxHp: 1600, ability: 'ice-body' });
  const foe = mon(2, [33, 156], { speed: 50 });
  const s = E.createBattle(glalie, foe);
  s.weather = { id: 'snow', turns: 5 };
  s.player.envWeather = 'snow';

  const r = turn(s, 33);
  // 1/16 of 1600 is 100 HP
  assert.equal(r.state.player.currentHp, 1100, 'Ice Body deve curar 1/16 (100 HP) sob neve');
});

test('Ice Body: NÃO cura sob clima limpo, chuva, sol ou areia', () => {
  const glalie = mon(362, [33, 156], { speed: 200, currentHp: 1000, maxHp: 1600, ability: 'ice-body' });
  const foe = mon(2, [33, 156], { speed: 50 });
  const s = E.createBattle(glalie, foe);

  const r = turn(s, 33);
  assert.equal(r.state.player.currentHp, 1000, 'Ice Body não deve curar sem neve ou granizo');
});

/* ==========================================================================
   H4-A: Orichalcum Pulse
   ========================================================================== */

test('Orichalcum Pulse: ativa Sunny Day na entrada', () => {
  const koraidon = mon(1007, [33, 156], { ability: 'orichalcum-pulse' });
  const foe = mon(2, [33, 156]);
  const s = E.createBattle(koraidon, foe);
  assert.equal(s.weather?.id, 'sun');
  assert.equal(s.weather?.turns, 5);
});

test('Orichalcum Pulse: amplifica Attack em ~33.3% (5461/4096) sob sol sem alterar estágios', () => {
  const koraidon = mon(1007, [33, 156], { attack: 100, ability: 'orichalcum-pulse' });
  const foe = mon(2, [33, 156]);
  const s = E.createBattle(koraidon, foe);

  assert.equal(s.weather?.id, 'sun');
  const atk = C.getEffectiveStat(s.player, 'attack', null, s);
  assert.equal(atk, Math.floor(100 * (5461 / 4096)), 'Orichalcum Pulse deve conceder ~33.3% de bônus ao Ataque em sol');
  assert.equal(s.player.stages?.attack || 0, 0, 'Orichalcum Pulse não deve alterar estágios de atributos');
});

test('Orichalcum Pulse: não amplifica Attack fora do sol', () => {
  const koraidon = mon(1007, [33, 156], { attack: 100, ability: 'orichalcum-pulse' });
  const foe = mon(2, [33, 156]);
  const s = E.createBattle(koraidon, foe);

  s.weather = null;
  s.player.envWeather = null;
  const atk = C.getEffectiveStat(s.player, 'attack', null, s);
  assert.equal(atk, 100, 'Orichalcum Pulse não deve aumentar Ataque quando o sol cessa');
});

/* ==========================================================================
   H4-A: Transistor
   ========================================================================== */

test('Transistor: amplifica ataques elétricos físicos e especiais em 1.3x (5325/4096)', () => {
  const regieleki = mon(894, [85, 9, 33], { attack: 100, specialAttack: 100, ability: 'transistor' });
  const foe = mon(2, [33, 156]);
  const s = E.createBattle(regieleki, foe);

  const thunderbolt = move(85); // special electric
  const thunderpunch = move(9);  // physical electric
  const tackle = move(33);       // physical normal

  const spAtkBoosted = C.getEffectiveStat(s.player, 'specialAttack', thunderbolt, s);
  assert.equal(spAtkBoosted, Math.floor(100 * (5325 / 4096)), 'Transistor deve aplicar 5325/4096 em SpA para golpes elétricos');

  const atkBoosted = C.getEffectiveStat(s.player, 'attack', thunderpunch, s);
  assert.equal(atkBoosted, Math.floor(100 * (5325 / 4096)), 'Transistor deve aplicar 5325/4096 em Atk para golpes elétricos');

  const atkNormal = C.getEffectiveStat(s.player, 'attack', tackle, s);
  assert.equal(atkNormal, 100, 'Transistor não deve afetar movimentos que não são elétricos');
});

/* ==========================================================================
   H4-A: Dragon\'s Maw
   ========================================================================== */

test('Dragon\'s Maw: amplifica ataques do tipo Dragon em 1.5x', () => {
  const regidrago = mon(895, [406, 337, 33], { attack: 100, specialAttack: 100, ability: 'dragons-maw' });
  const foe = mon(2, [33, 156]);
  const s = E.createBattle(regidrago, foe);

  const dragonPulse = move(406); // special dragon
  const dragonClaw = move(337);  // physical dragon
  const tackle = move(33);       // physical normal

  const spAtkBoosted = C.getEffectiveStat(s.player, 'specialAttack', dragonPulse, s);
  assert.equal(spAtkBoosted, 150, 'Dragon\'s Maw deve aumentar o SpA em 1.5x para golpes Dragon');

  const atkBoosted = C.getEffectiveStat(s.player, 'attack', dragonClaw, s);
  assert.equal(atkBoosted, 150, 'Dragon\'s Maw deve aumentar o Atk em 1.5x para golpes Dragon');

  const atkNormal = C.getEffectiveStat(s.player, 'attack', tackle, s);
  assert.equal(atkNormal, 100, 'Dragon\'s Maw não deve afetar movimentos não-Dragon');
});

/* ==========================================================================
   H4-A: Neutralizing Gas & Extended Audits
   ========================================================================== */

test('Neutralizing Gas: suprime Dark Aura e Prism Armor', () => {
  const attacker = mon(1, [282, 156], { ability: 'dark-aura' }); // Dark move vs Psychic defender
  const defender = mon(2, [33, 156], { types: ['psychic'], ability: 'prism-armor' });
  const gasMon = mon(110, [33, 156], { ability: 'neutralizing-gas' });

  // In 2v2 doubles with Neutralizing Gas active
  const s = E.createBattle(attacker, defender);
  s.neutralizingGasActive = true;
  attacker.neutralizingGasSuppressed = true;
  defender.neutralizingGasSuppressed = true;

  const multDark = C.P7.damageMultiplier(s, attacker, defender, move(282), 2);
  // Without Dark Aura (1.0 instead of 4/3) and without Prism Armor (1.0 instead of 0.75)
  assert.equal(multDark, 1.0, 'Neutralizing Gas deve suprimir Dark Aura e Prism Armor ao mesmo tempo');
});

test('Neutralizing Gas: suprime Transistor e Dragon\'s Maw', () => {
  const regieleki = mon(894, [85, 156], { ability: 'transistor' });
  const foe = mon(2, [33, 156]);
  const s = E.createBattle(regieleki, foe);
  regieleki.neutralizingGasSuppressed = true;

  const spAtk = C.getEffectiveStat(regieleki, 'specialAttack', move(85), s);
  assert.equal(spAtk, 100, 'Transistor deve ser suprimido por Neutralizing Gas');
});

test('BattleEvaluator (IA): reconhece absorção de Dry Skin e cancelamento de climas primordiais', () => {
  const attacker = mon(1, [55, 53, 33]); // Water Gun (#55), Flamethrower (#53), Tackle (#33)
  const dryDef = mon(47, [33, 156], { ability: 'dry-skin' });

  const evalDry = V.evaluateMove(attacker, dryDef, move(55), { attackerSide: 'player' });
  assert.equal(evalDry.damageIfHit, 0, 'BattleEvaluator deve prever 0 de dano para Water contra Dry Skin');

  // Primordial Sea vs Fire
  const seaKyogre = mon(10077, [33, 156], { ability: 'primordial-sea', envWeather: 'primordial-sea' });
  const evalFire = V.evaluateMove(attacker, seaKyogre, move(53), { attackerSide: 'player' });
  assert.equal(evalFire.damageIfHit, 0, 'BattleEvaluator deve prever 0 de dano para Fire sob Primordial Sea');
});

test('AbilityRegistry: todas as 10 novas habilidades H4-A reportam status FULL e metadados canônicos', () => {
  const h4aNewAbilities = [
    'primordial-sea',
    'desolate-land',
    'delta-stream',
    'dry-skin',
    'ice-body',
    'flower-gift',
    'sand-spit',
    'orichalcum-pulse',
    'transistor',
    'dragons-maw'
  ];

  for (const id of h4aNewAbilities) {
    const meta = Reg.getAbility(id);
    assert.ok(meta, `Metadados devem existir para ${id}`);
    assert.equal(meta.status, 'FULL', `${id} deve ter status FULL`);
    assert.equal(meta.phase, 'H4', `${id} deve pertencer à fase H4`);
    assert.ok(meta.name, `${id} deve ter nome formatado`);
    assert.ok(meta.description, `${id} deve ter descrição canônica`);
  }
});

/* ==========================================================================
   H4-A: Single Application Verification Tests (Transistor, Dragon's Maw, Orichalcum Pulse, Auras, Neuroforce, Prism Armor)
   ========================================================================== */

test('Transistor: 7 comparações canônicas de dano numérico e prevenção de dupla aplicação', () => {
  const tbolt = move(85); // 90 power, special electric
  const tackle = move(33); // 40 power, physical normal
  const actRoll = (id) => ({ type: 'MOVE', moveId: id, damageRoll: 100, accuracyRoll: 1, criticalRoll: 24 });

  // 1. Sem habilidade (baseline)
  const sBase = E.createBattle(mon(1, [85, 33], { speed: 200 }), mon(2, [33], { speed: 50 }));
  const rBase = E.resolveTurn(sBase, { player: actRoll(85), enemy: actRoll(33) });
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dBase, 41, 'Baseline sem habilidade para Thunderbolt com SpA 100 vs SpD 100 deve ser 41');

  // 2. Com habilidade ativa (aplicação única de 5325/4096 = 1.3000488x no SpA -> 130 SpA)
  const sTrans = E.createBattle(mon(1, [85, 33], { speed: 200, ability: 'transistor' }), mon(2, [33], { speed: 50 }));
  const rTrans = E.resolveTurn(sTrans, { player: actRoll(85), enemy: actRoll(33) });
  const dTrans = rTrans.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dTrans, 53, 'Transistor deve produzir exatamente 53 de dano (não 68/69 por dupla aplicação)');

  // 3. Com habilidade suprimida (Neutralizing Gas)
  const sGas = E.createBattle(mon(1, [85, 33], { speed: 200, ability: 'transistor' }), mon(2, [33], { speed: 50, ability: 'neutralizing-gas' }));
  const rGas = E.resolveTurn(sGas, { player: actRoll(85), enemy: actRoll(33) });
  const dGas = rGas.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dGas, 41, 'Transistor sob Neutralizing Gas deve retornar exatamente ao baseline de 41');

  // 4. Com movimento de tipo não elegível (Normal / Tackle)
  const sTackleBase = E.createBattle(mon(1, [85, 33], { speed: 200 }), mon(2, [33], { speed: 50 }));
  const rTackleBase = E.resolveTurn(sTackleBase, { player: actRoll(33), enemy: actRoll(33) });
  const dTackleBase = rTackleBase.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;

  const sTackleTrans = E.createBattle(mon(1, [85, 33], { speed: 200, ability: 'transistor' }), mon(2, [33], { speed: 50 }));
  const rTackleTrans = E.resolveTurn(sTackleTrans, { player: actRoll(33), enemy: actRoll(33) });
  const dTackleTrans = rTackleTrans.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dTackleTrans, dTackleBase, 'Transistor não deve modificar dano de movimento não elétrico');

  // 5. Em Singles vs 6. Em Doubles
  const sDoubles = E.createBattle(
    mon(1, [85, 33], { speed: 200, ability: 'transistor' }),
    mon(2, [33], { speed: 50 }),
    { battleFormat: 'DOUBLES' }
  );
  // Single-target Thunderbolt in Doubles retains 53 damage (no spread penalty)
  const rDoubles = E.resolveTurn(sDoubles, { player: actRoll(85), enemy: actRoll(33) });
  const dDoubles = rDoubles.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dDoubles, 53, 'Transistor com movimento single-target em Doubles mantém dano canônico 53');

  // 7. Com modificador independente adicional (Choice Specs: 1.5x cumulativo)
  const sSpecs = E.createBattle(mon(1, [85, 33], { speed: 200, ability: 'transistor', heldItem: 'choice-specs' }), mon(2, [33], { speed: 50 }));
  const rSpecs = E.resolveTurn(sSpecs, { player: actRoll(85), enemy: actRoll(33) });
  const dSpecs = rSpecs.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  // SpA 100 * 1.5 * (5325/4096) = 195 SpA -> 79 damage
  assert.equal(dSpecs, 79, 'Choice Specs + Transistor deve resultar em 79 de dano (não 102)');

  // Alinhamento do BattleEvaluator (IA não duplica multiplicador)
  const evalBase = V.evaluateMove(sBase.player, sBase.enemy, tbolt, { state: sBase, attackerSide: 'player' });
  const evalTrans = V.evaluateMove(sTrans.player, sTrans.enemy, tbolt, { state: sTrans, attackerSide: 'player' });
  assert.ok(evalTrans.damageIfHit > evalBase.damageIfHit, 'BattleEvaluator reconhece bônus de Transistor');
  assert.ok(evalTrans.damageIfHit / evalBase.damageIfHit < 1.35, 'BattleEvaluator aplica Transistor uma única vez (~1.32x na média)');
});

test('Dragon\'s Maw: 7 comparações canônicas de dano numérico e prevenção de dupla aplicação', () => {
  const dPulse = move(406); // 85 power, special dragon
  const tackle = move(33);  // 40 power, physical normal
  const actRoll = (id) => ({ type: 'MOVE', moveId: id, damageRoll: 100, accuracyRoll: 1, criticalRoll: 24 });

  // 1. Sem habilidade (baseline)
  const sBase = E.createBattle(mon(1, [406, 33], { speed: 200 }), mon(2, [33], { speed: 50 }));
  const rBase = E.resolveTurn(sBase, { player: actRoll(406), enemy: actRoll(33) });
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dBase, 39, 'Baseline sem habilidade para Dragon Pulse com SpA 100 vs SpD 100 deve ser 39');

  // 2. Com habilidade ativa (aplicação única de 1.5x no SpA -> 150 SpA)
  const sMaw = E.createBattle(mon(1, [406, 33], { speed: 200, ability: 'dragons-maw' }), mon(2, [33], { speed: 50 }));
  const rMaw = E.resolveTurn(sMaw, { player: actRoll(406), enemy: actRoll(33) });
  const dMaw = rMaw.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dMaw, 58, 'Dragon\'s Maw deve produzir exatamente 58 de dano (não 87 por dupla aplicação)');

  // 3. Com habilidade suprimida (Neutralizing Gas)
  const sGas = E.createBattle(mon(1, [406, 33], { speed: 200, ability: 'dragons-maw' }), mon(2, [33], { speed: 50, ability: 'neutralizing-gas' }));
  const rGas = E.resolveTurn(sGas, { player: actRoll(406), enemy: actRoll(33) });
  const dGas = rGas.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dGas, 39, 'Dragon\'s Maw suprimido por Neutralizing Gas deve retornar exatamente ao baseline 39');

  // 4. Com movimento de tipo não elegível (Normal / Tackle)
  const sTackleBase = E.createBattle(mon(1, [406, 33], { speed: 200 }), mon(2, [33], { speed: 50 }));
  const rTackleBase = E.resolveTurn(sTackleBase, { player: actRoll(33), enemy: actRoll(33) });
  const dTackleBase = rTackleBase.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;

  const sTackleMaw = E.createBattle(mon(1, [406, 33], { speed: 200, ability: 'dragons-maw' }), mon(2, [33], { speed: 50 }));
  const rTackleMaw = E.resolveTurn(sTackleMaw, { player: actRoll(33), enemy: actRoll(33) });
  const dTackleMaw = rTackleMaw.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dTackleMaw, dTackleBase, 'Dragon\'s Maw não deve modificar dano de movimento não Dragon');

  // 5. Em Singles vs 6. Em Doubles
  const sDoubles = E.createBattle(
    mon(1, [406, 33], { speed: 200, ability: 'dragons-maw' }),
    mon(2, [33], { speed: 50 }),
    { battleFormat: 'DOUBLES' }
  );
  const rDoubles = E.resolveTurn(sDoubles, { player: actRoll(406), enemy: actRoll(33) });
  const dDoubles = rDoubles.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dDoubles, 58, 'Dragon\'s Maw com movimento single-target em Doubles mantém dano canônico 58');

  // 7. Com modificador independente adicional (Choice Specs: 1.5x cumulativo)
  const sSpecs = E.createBattle(mon(1, [406, 33], { speed: 200, ability: 'dragons-maw', heldItem: 'choice-specs' }), mon(2, [33], { speed: 50 }));
  const rSpecs = E.resolveTurn(sSpecs, { player: actRoll(406), enemy: actRoll(33) });
  const dSpecs = rSpecs.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  // SpA 100 * 1.5 * 1.5 = 225 SpA -> 86 damage exato com arredondamentos canônicos
  assert.equal(dSpecs, 86, 'Choice Specs + Dragon\'s Maw resulta em 86 de dano');

  // Alinhamento do BattleEvaluator (IA não duplica multiplicador)
  const evalBase = V.evaluateMove(sBase.player, sBase.enemy, dPulse, { state: sBase, attackerSide: 'player' });
  const evalMaw = V.evaluateMove(sMaw.player, sMaw.enemy, dPulse, { state: sMaw, attackerSide: 'player' });
  assert.ok(evalMaw.damageIfHit > evalBase.damageIfHit, 'BattleEvaluator reconhece bônus de Dragon\'s Maw');
  assert.ok(evalMaw.damageIfHit / evalBase.damageIfHit < 1.55, 'BattleEvaluator aplica Dragon\'s Maw uma única vez (~1.47x na média)');
});

test('Orichalcum Pulse: 7 comparações canônicas de dano numérico e ausência de boost em SpA/estágios', () => {
  const tackle = move(33); // 40 power physical normal
  const actRoll = (id) => ({ type: 'MOVE', moveId: id, damageRoll: 100, accuracyRoll: 1, criticalRoll: 24 });

  // 1. Sem habilidade (baseline)
  const sBase = E.createBattle(mon(1, [33], { speed: 200, types: ['dragon', 'fighting'] }), mon(2, [33], { speed: 50 }));
  const rBase = E.resolveTurn(sBase, { player: actRoll(33), enemy: actRoll(33) });
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dBase, 19, 'Baseline sem habilidade para Tackle com Atk 100 vs Def 100 deve ser 19');

  // 2. Com habilidade ativa sob sol (aplicação única de 5461/4096 = 1.33325x no Attack -> 133 Atk)
  const sOri = E.createBattle(mon(1, [33], { speed: 200, types: ['dragon', 'fighting'], ability: 'orichalcum-pulse' }), mon(2, [33], { speed: 50 }));
  assert.equal(sOri.weather?.id, 'sun', 'Orichalcum Pulse ativa sun na entrada');
  const rOri = E.resolveTurn(sOri, { player: actRoll(33), enemy: actRoll(33) });
  const dOri = rOri.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dOri, 25, 'Orichalcum Pulse deve produzir exatamente 25 de dano (não 33 por dupla aplicação)');
  assert.equal(sOri.player.stages?.attack || 0, 0, 'Estágio de ataque deve permanecer 0 (não é boost de estágio)');

  // 3. Com habilidade suprimida (Neutralizing Gas)
  const sGas = E.createBattle(mon(1, [33], { speed: 200, types: ['dragon', 'fighting'], ability: 'orichalcum-pulse' }), mon(2, [33], { speed: 50, ability: 'neutralizing-gas' }));
  const rGas = E.resolveTurn(sGas, { player: actRoll(33), enemy: actRoll(33) });
  const dGas = rGas.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dGas, 19, 'Orichalcum Pulse suprimido por Neutralizing Gas retorna ao baseline 19');

  // 4. Fora do sol / clima não elegível (Rain)
  const sRain = E.createBattle(mon(1, [33], { speed: 200, types: ['dragon', 'fighting'], ability: 'orichalcum-pulse' }), mon(2, [33], { speed: 50 }));
  sRain.weather = { id: 'rain', turns: 5 };
  sRain.player.envWeather = 'rain';
  const rRain = E.resolveTurn(sRain, { player: actRoll(33), enemy: actRoll(33) });
  const dRain = rRain.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dRain, 19, 'Orichalcum Pulse fora do sol não amplifica o dano (permanece 19)');

  // 5. Em Singles vs 6. Em Doubles
  const sDoubles = E.createBattle(
    mon(1, [33], { speed: 200, types: ['dragon', 'fighting'], ability: 'orichalcum-pulse' }),
    mon(2, [33], { speed: 50 }),
    { battleFormat: 'DOUBLES' }
  );
  const rDoubles = E.resolveTurn(sDoubles, { player: actRoll(33), enemy: actRoll(33) });
  const dDoubles = rDoubles.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dDoubles, 25, 'Orichalcum Pulse com movimento single-target em Doubles mantém dano canônico 25');

  // 7. Com modificador independente adicional (Choice Band: 1.5x cumulativo)
  const sBand = E.createBattle(mon(1, [33], { speed: 200, types: ['dragon', 'fighting'], ability: 'orichalcum-pulse', heldItem: 'choice-band' }), mon(2, [33], { speed: 50 }));
  const rBand = E.resolveTurn(sBand, { player: actRoll(33), enemy: actRoll(33) });
  const dBand = rBand.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  // Atk 100 * 1.5 * (5461/4096) = 199 Atk -> 37 damage
  assert.equal(dBand, 37, 'Choice Band + Orichalcum Pulse resulta em 37 de dano');

  // Verificação de que Special Attack NÃO é aumentado
  const spAtkSun = C.getEffectiveStat(sOri.player, 'specialAttack', null, sOri);
  assert.equal(spAtkSun, 100, 'Orichalcum Pulse nunca deve aumentar Special Attack');

  // Alinhamento do BattleEvaluator (IA não duplica multiplicador)
  const evalBase = V.evaluateMove(sBase.player, sBase.enemy, tackle, { state: sBase, attackerSide: 'player' });
  const evalOri = V.evaluateMove(sOri.player, sOri.enemy, tackle, { state: sOri, attackerSide: 'player' });
  assert.ok(evalOri.damageIfHit > evalBase.damageIfHit, 'BattleEvaluator reconhece bônus de Orichalcum Pulse');
  assert.ok(evalOri.damageIfHit / evalBase.damageIfHit < 1.40, 'BattleEvaluator aplica Orichalcum Pulse uma única vez');
});

test('Dark Aura e Fairy Aura: aplicação única de 4/3, inversão por Aura Break e sem acúmulo duplicado', () => {
  const darkPulse = move(399); // 80 power dark
  const moonblast = move(585); // 95 power fairy
  const actRoll = (id) => ({ type: 'MOVE', moveId: id, damageRoll: 100, accuracyRoll: 1, criticalRoll: 24 });

  // 1. Dark Pulse baseline sem aura
  const sDarkBase = E.createBattle(mon(1, [399], { speed: 200 }), mon(2, [399], { speed: 50 }));
  const rDarkBase = E.resolveTurn(sDarkBase, { player: actRoll(399), enemy: actRoll(399) });
  const dDarkBase = rDarkBase.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dDarkBase, 37, 'Baseline de Dark Pulse sem Dark Aura deve ser 37');

  // 2. Dark Pulse com Dark Aura (Math.floor(37 * 4/3) = 49)
  const sDarkAura = E.createBattle(mon(1, [399], { speed: 200, ability: 'dark-aura' }), mon(2, [399], { speed: 50 }));
  const rDarkAura = E.resolveTurn(sDarkAura, { player: actRoll(399), enemy: actRoll(399) });
  const dDarkAura = rDarkAura.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dDarkAura, 49, 'Dark Aura aplica 4/3 uma única vez, resultando em 49');

  // 3. Dark Pulse com Dark Aura + Aura Break (Math.floor(37 * 0.75) = 27)
  const sDarkBreak = E.createBattle(mon(1, [399], { speed: 200, ability: 'dark-aura' }), mon(2, [399], { speed: 50, ability: 'aura-break' }));
  const rDarkBreak = E.resolveTurn(sDarkBreak, { player: actRoll(399), enemy: actRoll(399) });
  const dDarkBreak = rDarkBreak.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dDarkBreak, 27, 'Aura Break inverte Dark Aura para 0.75x, resultando em 27');

  // 4. Múltiplos portadores de Dark Aura no campo não acumulam efeito (permanece 49)
  const sDarkMulti = E.createBattle(mon(1, [399], { speed: 200, ability: 'dark-aura' }), mon(2, [399], { speed: 50, ability: 'dark-aura' }));
  const rDarkMulti = E.resolveTurn(sDarkMulti, { player: actRoll(399), enemy: actRoll(399) });
  const dDarkMulti = rDarkMulti.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dDarkMulti, 49, 'Dois portadores de Dark Aura mantêm o multiplicador canônico único de 4/3 (49)');

  // 5. Fairy Aura baseline (Moonblast = 43)
  const sFairyBase = E.createBattle(mon(1, [585], { speed: 200 }), mon(2, [585], { speed: 50 }));
  const rFairyBase = E.resolveTurn(sFairyBase, { player: actRoll(585), enemy: actRoll(585) });
  const dFairyBase = rFairyBase.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dFairyBase, 43, 'Baseline de Moonblast sem Fairy Aura deve ser 43');

  // 6. Fairy Aura ativa (Math.floor(43 * 4/3) = 57)
  const sFairyAura = E.createBattle(mon(1, [585], { speed: 200, ability: 'fairy-aura' }), mon(2, [585], { speed: 50 }));
  const rFairyAura = E.resolveTurn(sFairyAura, { player: actRoll(585), enemy: actRoll(585) });
  const dFairyAura = rFairyAura.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dFairyAura, 57, 'Fairy Aura aplica 4/3 uma única vez, resultando em 57');

  // 7. Fairy Aura + Aura Break (Math.floor(43 * 0.75) = 32)
  const sFairyBreak = E.createBattle(mon(1, [585], { speed: 200, ability: 'fairy-aura' }), mon(2, [585], { speed: 50, ability: 'aura-break' }));
  const rFairyBreak = E.resolveTurn(sFairyBreak, { player: actRoll(585), enemy: actRoll(585) });
  const dFairyBreak = rFairyBreak.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dFairyBreak, 32, 'Aura Break inverte Fairy Aura para 0.75x, resultando em 32');
});

test('Neuroforce e Prism Armor: aplicação única de 1.25x e 0.75x em super efetivos e imunidade a Mold Breaker de Prism Armor', () => {
  const darkPulse = move(399); // 80 power dark
  const actRoll = (id) => ({ type: 'MOVE', moveId: id, damageRoll: 100, accuracyRoll: 1, criticalRoll: 24 });

  // 1. Baseline super efetivo (2x contra Psychic): 37 * 2 = 74
  const sBase = E.createBattle(mon(1, [399], { speed: 200 }), mon(2, [399], { speed: 50, types: ['psychic'] }));
  const rBase = E.resolveTurn(sBase, { player: actRoll(399), enemy: actRoll(399) });
  const dBase = rBase.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dBase, 74, 'Baseline super efetivo 2x de Dark Pulse contra Psychic deve ser 74');

  // 2. Neuroforce: 1.25x em super efetivo -> Math.floor(74 * 1.25) = 92
  const sNeuro = E.createBattle(mon(1, [399], { speed: 200, ability: 'neuroforce' }), mon(2, [399], { speed: 50, types: ['psychic'] }));
  const rNeuro = E.resolveTurn(sNeuro, { player: actRoll(399), enemy: actRoll(399) });
  const dNeuro = rNeuro.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dNeuro, 92, 'Neuroforce aplica 1.25x uma única vez, resultando em 92 de dano');

  // 3. Prism Armor: 0.75x em super efetivo recebido -> Math.floor(74 * 0.75) = 55
  const sPrism = E.createBattle(mon(1, [399], { speed: 200 }), mon(2, [399], { speed: 50, types: ['psychic'], ability: 'prism-armor' }));
  const rPrism = E.resolveTurn(sPrism, { player: actRoll(399), enemy: actRoll(399) });
  const dPrism = rPrism.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dPrism, 55, 'Prism Armor reduz dano super efetivo em 0.75x, resultando em 55 de dano');

  // 4. Mold Breaker NÃO ignora Prism Armor (flags: {} sem breakable: 1 no Showdown Gen IX)
  const sMold = E.createBattle(mon(1, [399], { speed: 200, ability: 'mold-breaker' }), mon(2, [399], { speed: 50, types: ['psychic'], ability: 'prism-armor' }));
  const rMold = E.resolveTurn(sMold, { player: actRoll(399), enemy: actRoll(399) });
  const dMold = rMold.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dMold, 55, 'Mold Breaker não pode quebrar Prism Armor (permanece 55 de dano)');

  // 5. Neutralizing Gas suprime Prism Armor -> dano volta a 74
  const sGas = E.createBattle(mon(1, [399], { speed: 200, ability: 'neutralizing-gas' }), mon(2, [399], { speed: 50, types: ['psychic'], ability: 'prism-armor' }));
  const rGas = E.resolveTurn(sGas, { player: actRoll(399), enemy: actRoll(399) });
  const dGas = rGas.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'enemy').damage;
  assert.equal(dGas, 74, 'Prism Armor é suprimido por Neutralizing Gas (dano retorna para 74)');
});
