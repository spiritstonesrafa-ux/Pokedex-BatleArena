const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

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
  gender: 'M',
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

const battle = (a = {}, b = {}, idsA = [33, 107], idsB = [33, 107]) => {
  const s = E.createBattle(
    mon(1, idsA, { speed: 200, ...a }),
    mon(2, idsB, { speed: 50, ...b })
  );
  if (a.abilitySuppressed) s.player.abilitySuppressed = true;
  if (b.abilitySuppressed) s.enemy.abilitySuppressed = true;
  return s;
};

const turn = (s, id = 33, extra = {}, enemy = act(107)) => E.resolveTurn(s, {
  player: act(id, extra),
  enemy
});

// Move 33 is Tackle (normal, physical, contact)
// Move 129 is Swift (normal, special, non-contact)
// Move 89 is Earthquake (ground, physical, non-contact)

test('Poison Touch: golpe de contato aplica Poison no alvo com roll <= 30', () => {
  const s = battle({ ability: 'poison-touch' }, {});
  const res = turn(s, 33, { poisonTouchRoll: 30 });
  assert.equal(res.state.enemy.statusCondition, 'poison');
  assert.ok(res.events.some(e => e.type === 'STATUS_APPLIED' && e.reason === 'poison-touch'));
});

test('Poison Touch: roll > 30 NÃO envenena o alvo', () => {
  const s = battle({ ability: 'poison-touch' }, {});
  const res = turn(s, 33, { poisonTouchRoll: 31 });
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Poison Touch: golpe sem contato (Swift #129) NÃO envenena mesmo com roll 1', () => {
  const s = battle({ ability: 'poison-touch' }, {}, [129, 107]);
  const res = turn(s, 129, { poisonTouchRoll: 1 });
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Poison Touch: atacante com Long Reach não faz contato e não ativa Poison Touch', () => {
  // Se o atacante tivesse Long Reach (ou habilidade não for Poison Touch)
  const s = battle({ ability: 'long-reach' }, {});
  const res = turn(s, 33, { poisonTouchRoll: 1 });
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Poison Touch: alvo do tipo Poison ou Steel é IMUNE a Poison Touch', () => {
  const sPoison = battle({ ability: 'poison-touch' }, { types: ['poison'] });
  const resPoison = turn(sPoison, 33, { poisonTouchRoll: 1 });
  assert.equal(resPoison.state.enemy.statusCondition, null);

  const sSteel = battle({ ability: 'poison-touch' }, { types: ['steel'] });
  const resSteel = turn(sSteel, 33, { poisonTouchRoll: 1 });
  assert.equal(resSteel.state.enemy.statusCondition, null);
});

test('Poison Touch: Shield Dust no defensor bloqueia o envenenamento de Poison Touch', () => {
  const s = battle({ ability: 'poison-touch' }, { ability: 'shield-dust' });
  const res = turn(s, 33, { poisonTouchRoll: 1 });
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Poison Touch: Misty Terrain com defensor no chão bloqueia Poison Touch', () => {
  const s = battle({ ability: 'poison-touch' }, {});
  s.terrain = { id: 'misty', turns: 5 };
  const res = turn(s, 33, { poisonTouchRoll: 1 });
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Poison Touch: ativa Synchronize no alvo quando envenenado', () => {
  const s = battle({ ability: 'poison-touch' }, { ability: 'synchronize' });
  const res = turn(s, 33, { poisonTouchRoll: 1 });
  assert.equal(res.state.enemy.statusCondition, 'poison');
  assert.equal(res.state.player.statusCondition, 'poison');
  assert.ok(res.events.some(e => e.type === 'STATUS_APPLIED' && e.reason === 'synchronize'));
});

test('Poison Touch: supressão desativa a habilidade', () => {
  const s = battle({ ability: 'poison-touch', abilitySuppressed: true }, {});
  const res = turn(s, 33, { poisonTouchRoll: 1 });
  assert.equal(res.state.enemy.statusCondition, null);
});

// Cute Charm Tests
test('Cute Charm: golpe de contato de sexo oposto infatua atacante com roll <= 30', () => {
  const s = battle({ gender: 'M' }, { ability: 'cute-charm', gender: 'F' });
  const res = turn(s, 33, { cuteCharmRoll: 30 });
  assert.equal(res.state.player.infatuation, 'enemy');
  assert.ok(res.events.some(e => e.type === 'INFATUATION_APPLIED' && e.reason === 'cute-charm'));
});

test('Cute Charm: roll > 30 NÃO infatua', () => {
  const s = battle({ gender: 'M' }, { ability: 'cute-charm', gender: 'F' });
  const res = turn(s, 33, { cuteCharmRoll: 31 });
  assert.equal(res.state.player.infatuation, null);
});

test('Cute Charm: mesmo sexo (M x M ou F x F) NÃO é afetado', () => {
  const s = battle({ gender: 'M' }, { ability: 'cute-charm', gender: 'M' });
  const res = turn(s, 33, { cuteCharmRoll: 1 });
  assert.equal(res.state.player.infatuation, null);
});

test('Cute Charm: atacante sem gênero NÃO é afetado', () => {
  const s = battle({ gender: null }, { ability: 'cute-charm', gender: 'F' });
  const res = turn(s, 33, { cuteCharmRoll: 1 });
  assert.equal(res.state.player.infatuation, null);
});

test('Cute Charm: atacante com Oblivious é IMUNE a infatuação', () => {
  const s = battle({ ability: 'oblivious', gender: 'M' }, { ability: 'cute-charm', gender: 'F' });
  const res = turn(s, 33, { cuteCharmRoll: 1 });
  assert.equal(res.state.player.infatuation, null);
});

test('Cute Charm: atacante infatuado é imobilizado com roll <= 50', () => {
  const s = battle({ gender: 'M', infatuation: 'enemy' }, { gender: 'F' });
  const initialEnemyHp = s.enemy.currentHp;
  const res = turn(s, 33, { infatuationRoll: 50 });
  assert.equal(res.state.enemy.currentHp, initialEnemyHp);
  assert.ok(res.events.some(e => e.type === 'IMMOBILIZED_BY_LOVE'));
});

test('Cute Charm: atacante infatuado ataca normalmente com roll > 50', () => {
  const s = battle({ gender: 'M', infatuation: 'enemy' }, { gender: 'F' });
  const initialEnemyHp = s.enemy.currentHp;
  const res = turn(s, 33, { infatuationRoll: 51 });
  assert.ok(res.state.enemy.currentHp < initialEnemyHp);
});

test('Cute Charm: Mold Breaker, Teravolt e Turboblaze NÃO ignoram Cute Charm no defensor (Gen IX canonical)', () => {
  for (const breaker of ['mold-breaker', 'teravolt', 'turboblaze']) {
    const s = battle({ ability: breaker, gender: 'M' }, { ability: 'cute-charm', gender: 'F' });
    const res = turn(s, 33, { cuteCharmRoll: 1 });
    assert.equal(res.state.player.infatuation, 'enemy', `${breaker} não deve ignorar Cute Charm`);
    assert.ok(res.events.some(e => e.type === 'INFATUATION_APPLIED'));
  }
});

test('Cute Charm: golpe sem contato (Swift #129) não ativa Cute Charm', () => {
  const s = battle({ gender: 'M' }, { ability: 'cute-charm', gender: 'F' }, [129, 107]);
  const res = turn(s, 129, { cuteCharmRoll: 1 });
  assert.equal(res.state.player.infatuation, null);
});

test('Cute Charm: atacante com Long Reach não ativa Cute Charm', () => {
  const s = battle({ ability: 'long-reach', gender: 'M' }, { ability: 'cute-charm', gender: 'F' });
  const res = turn(s, 33, { cuteCharmRoll: 1 });
  assert.equal(res.state.player.infatuation, null);
});

test('Cute Charm: Neutralizing Gas suprime Cute Charm no defensor', () => {
  const s = battle({ ability: 'neutralizing-gas', gender: 'M' }, { ability: 'cute-charm', gender: 'F' });
  const res = turn(s, 33, { cuteCharmRoll: 1 });
  assert.equal(res.state.player.infatuation, null, 'Cute Charm suprimido por Neutralizing Gas não infatua');
});

// Gooey & Tangling Hair Tests
test('Gooey: golpe de contato reduz Velocidade do atacante em 1 estágio', () => {
  const s = battle({}, { ability: 'gooey' });
  const res = turn(s, 33);
  assert.equal(res.state.player.statStages.speed, -1);
  assert.ok(res.events.some(e => e.type === 'STAT_STAGE_CHANGED' && e.statKey === 'speed' && e.appliedDelta === -1));
});

test('Tangling Hair: golpe de contato reduz Velocidade do atacante em 1 estágio', () => {
  const s = battle({}, { ability: 'tangling-hair' });
  const res = turn(s, 33);
  assert.equal(res.state.player.statStages.speed, -1);
  assert.ok(res.events.some(e => e.type === 'STAT_STAGE_CHANGED' && e.statKey === 'speed' && e.appliedDelta === -1));
});

test('Gooey: golpe sem contato (Swift #129) NÃO reduz Velocidade', () => {
  const s = battle({}, { ability: 'gooey' }, [129, 156]);
  const res = turn(s, 129);
  assert.equal(res.state.player.statStages.speed, 0);
});

test('Gooey: Clear Body no atacante bloqueia a redução de Velocidade', () => {
  const s = battle({ ability: 'clear-body' }, { ability: 'gooey' });
  const res = turn(s, 33);
  assert.equal(res.state.player.statStages.speed, 0);
});

test('Gooey: Mirror Armor no atacante reflete a redução de Velocidade para o portador de Gooey', () => {
  const s = battle({ ability: 'mirror-armor' }, { ability: 'gooey' });
  const res = turn(s, 33);
  assert.equal(res.state.player.statStages.speed, 0);
  assert.equal(res.state.enemy.statStages.speed, -1);
});

test('Gooey: Contrary no atacante inverte a redução para +1 Velocidade', () => {
  const s = battle({ ability: 'contrary' }, { ability: 'gooey' });
  const res = turn(s, 33);
  assert.equal(res.state.player.statStages.speed, 1);
});

test('Gooey e Tangling Hair: Mold Breaker, Teravolt e Turboblaze NÃO ignoram a redução de Speed (Gen IX canonical)', () => {
  for (const breaker of ['mold-breaker', 'teravolt', 'turboblaze']) {
    const sGooey = battle({ ability: breaker }, { ability: 'gooey' });
    const resGooey = turn(sGooey, 33);
    assert.equal(resGooey.state.player.statStages.speed, -1, `${breaker} não deve ignorar Gooey`);

    const sTangling = battle({ ability: breaker }, { ability: 'tangling-hair' });
    const resTangling = turn(sTangling, 33);
    assert.equal(resTangling.state.player.statStages.speed, -1, `${breaker} não deve ignorar Tangling Hair`);
  }
});

test('Gooey e Tangling Hair: atacante com Long Reach não ativa a redução de Speed', () => {
  const sGooey = battle({ ability: 'long-reach' }, { ability: 'gooey' });
  const resGooey = turn(sGooey, 33);
  assert.equal(resGooey.state.player.statStages.speed, 0);

  const sTangling = battle({ ability: 'long-reach' }, { ability: 'tangling-hair' });
  const resTangling = turn(sTangling, 33);
  assert.equal(resTangling.state.player.statStages.speed, 0);
});

test('Gooey: supressão (abilitySuppressed e Neutralizing Gas) desativa Gooey', () => {
  // Via abilitySuppressed (Gastro Acid / Core Enforcer)
  const s1 = battle({}, { ability: 'gooey', abilitySuppressed: true });
  const res1 = turn(s1, 33);
  assert.equal(res1.state.player.statStages.speed, 0, 'abilitySuppressed: true desativa Gooey');

  // Via Neutralizing Gas em campo
  const s2 = battle({ ability: 'neutralizing-gas' }, { ability: 'gooey' });
  const res2 = turn(s2, 33);
  assert.equal(res2.state.player.statStages.speed, 0, 'Neutralizing Gas em campo desativa Gooey');
});

// Verificações Canônicas de Habilidades com breakable: 1 (Shield Dust e Big Pecks)
test('Shield Dust e Big Pecks: Mold Breaker ignora canonicamente (breakable: 1), a menos que segurem Ability Shield', () => {
  // Big Pecks é ignorado por Mold Breaker (Fire Lash #680 causa drop de Defesa)
  const sBigPecks = battle({ ability: 'mold-breaker' }, { ability: 'big-pecks' }, [680, 107]);
  const resBigPecks = turn(sBigPecks, 680);
  assert.equal(resBigPecks.state.enemy.statStages.defense, -1, 'Mold Breaker deve ignorar Big Pecks');

  // Big Pecks protegido por Ability Shield não é ignorado
  const sBigPecksShield = battle({ ability: 'mold-breaker' }, { ability: 'big-pecks', item: 'ability-shield' }, [680, 107]);
  const resBigPecksShield = turn(sBigPecksShield, 680);
  assert.equal(resBigPecksShield.state.enemy.statStages.defense, 0, 'Ability Shield protege Big Pecks contra Mold Breaker');

  // Shield Dust é ignorado por Mold Breaker (Flamethrower #53 queima com roll <= 10)
  const sShieldDust = battle({ ability: 'mold-breaker' }, { ability: 'shield-dust' }, [53, 107]);
  const resShieldDust = turn(sShieldDust, 53, { secondaryEffectRoll: 10 });
  assert.equal(resShieldDust.state.enemy.statusCondition, 'burn', 'Mold Breaker deve ignorar Shield Dust');

  // Shield Dust protegido por Ability Shield não é ignorado
  const sShieldDustShield = battle({ ability: 'mold-breaker' }, { ability: 'shield-dust', item: 'ability-shield' }, [53, 107]);
  const resShieldDustShield = turn(sShieldDustShield, 53, { secondaryEffectRoll: 10 });
  assert.equal(resShieldDustShield.state.enemy.statusCondition, null, 'Ability Shield protege Shield Dust contra Mold Breaker');
});

// Verificações Antecipadas de Habilidades H3-B (Oblivious, Overcoat, Damp) via hasEffectiveAbility
test('Consultas H3-B: 7 cenários canônicos de hasEffectiveAbility (Oblivious, Overcoat, Damp)', () => {
  const P7 = C.P7;

  // 1. Habilidade ativa
  const activeMon = { ability: 'overcoat', currentHp: 500, maxHp: 500, abilitySuppressed: false, neutralizingGasSuppressed: false };
  assert.equal(P7.hasEffectiveAbility(activeMon, 'overcoat'), true, 'Cenário 1: habilidade ativa reporta true');
  assert.equal(P7.hasEffectiveAbility(activeMon, 'damp'), false, 'Cenário 1: habilidade diferente reporta false');

  // 2. Suprimida por Neutralizing Gas
  const gasSuppressedMon = { ability: 'oblivious', currentHp: 500, maxHp: 500, abilitySuppressed: false, neutralizingGasSuppressed: true };
  assert.equal(P7.hasEffectiveAbility(gasSuppressedMon, 'oblivious'), false, 'Cenário 2: Neutralizing Gas suprime');

  // 3. Suprimida por Gastro Acid / Core Enforcer (abilitySuppressed: true)
  const acidSuppressedMon = { ability: 'damp', currentHp: 500, maxHp: 500, abilitySuppressed: true, neutralizingGasSuppressed: false };
  assert.equal(P7.hasEffectiveAbility(acidSuppressedMon, 'damp'), false, 'Cenário 3: Gastro Acid suprime');

  // 4. Substituída por Mummy ou Skill Swap
  const mummifiedMon = { ability: 'mummy', originalAbility: 'oblivious', currentHp: 500, maxHp: 500, abilitySuppressed: false, neutralizingGasSuppressed: false };
  assert.equal(P7.hasEffectiveAbility(mummifiedMon, 'oblivious'), false, 'Cenário 4: Mummy substitui habilidade');
  assert.equal(P7.hasEffectiveAbility(mummifiedMon, 'mummy'), true, 'Cenário 4: Mummy passa a ser a habilidade efetiva');

  // 5. Ability Shield protege portador contra supressão
  const shieldedMon = { ability: 'overcoat', item: 'ability-shield', currentHp: 500, maxHp: 500, abilitySuppressed: false, neutralizingGasSuppressed: false };
  assert.equal(P7.hasEffectiveAbility(shieldedMon, 'overcoat'), true, 'Cenário 5: Ability Shield mantém habilidade efetiva');

  // 6. Combatente não ativo (desmaiado / currentHp <= 0 ou nulo)
  const faintedMon = { ability: 'damp', currentHp: 0, maxHp: 500, abilitySuppressed: false, neutralizingGasSuppressed: false };
  assert.equal(P7.hasEffectiveAbility(faintedMon, 'damp'), false, 'Cenário 6: combatente nocauteado reporta false');
  assert.equal(P7.hasEffectiveAbility(null, 'damp'), false, 'Cenário 6: combatente nulo reporta false');

  // 7. Compatibilidade em duplas (verificação em activeMons)
  const allyActive = { ability: 'damp', currentHp: 400, maxHp: 400, abilitySuppressed: false, neutralizingGasSuppressed: false };
  const allyFainted = { ability: 'damp', currentHp: 0, maxHp: 400, abilitySuppressed: false, neutralizingGasSuppressed: false };
  const allyGasSuppressed = { ability: 'damp', currentHp: 400, maxHp: 400, abilitySuppressed: false, neutralizingGasSuppressed: true };

  assert.equal(P7.hasEffectiveAbility(allyActive, 'damp'), true, 'Cenário 7: aliado ativo com Damp');
  assert.equal(P7.hasEffectiveAbility(allyFainted, 'damp'), false, 'Cenário 7: aliado nocauteado');
  assert.equal(P7.hasEffectiveAbility(allyGasSuppressed, 'damp'), false, 'Cenário 7: aliado sob Gas');
});

test('Consultas H3-B integradas na batalha: Oblivious, Overcoat e Damp reagem canonicamente à supressão', () => {
  // Oblivious atacante sob Cute Charm: imune se ativo, infatuado se suprimido (abilitySuppressed: true)
  const sObliviousActive = battle({ ability: 'oblivious', gender: 'M' }, { ability: 'cute-charm', gender: 'F' });
  const resObliviousActive = turn(sObliviousActive, 33, { cuteCharmRoll: 1 });
  assert.equal(resObliviousActive.state.player.infatuation, null, 'Oblivious ativo previne infatuação');

  const sObliviousSuppressed = battle({ ability: 'oblivious', gender: 'M', abilitySuppressed: true }, { ability: 'cute-charm', gender: 'F' });
  const resObliviousSuppressed = turn(sObliviousSuppressed, 33, { cuteCharmRoll: 1 });
  assert.equal(resObliviousSuppressed.state.player.infatuation, 'enemy', 'Oblivious suprimido por Gastro Acid permite infatuação');

  // Overcoat atacante sob Effect Spore: imune se ativo, adormecido se suprimido por Gastro Acid (abilitySuppressed: true)
  const sOvercoatActive = battle({ ability: 'overcoat' }, { ability: 'effect-spore' });
  const resOvercoatActive = turn(sOvercoatActive, 33, { effectSporeRoll: 25 });
  assert.equal(resOvercoatActive.state.player.statusCondition, null, 'Overcoat ativo previne esporos');

  const sOvercoatSuppressed = battle({ ability: 'overcoat', abilitySuppressed: true }, { ability: 'effect-spore' });
  const resOvercoatSuppressed = turn(sOvercoatSuppressed, 33, { effectSporeRoll: 25 });
  assert.equal(resOvercoatSuppressed.state.player.statusCondition, 'sleep', 'Overcoat suprimido permite esporos');

  // Damp bloqueia Aftermath de KO por contato se ativo; não bloqueia se suprimido por Gastro Acid
  const sDampActive = battle({ ability: 'damp', hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'aftermath', hp: 10, maxHp: 10, currentHp: 10 });
  const resDampActive = turn(sDampActive, 33);
  assert.equal(resDampActive.state.enemy.currentHp, 0);
  assert.equal(resDampActive.state.player.currentHp, 800, 'Damp no atacante/campo impede explosão de Aftermath');

  const sDampSuppressed = battle({ ability: 'damp', abilitySuppressed: true, hp: 800, maxHp: 800, currentHp: 800 }, { ability: 'aftermath', hp: 10, maxHp: 10, currentHp: 10 });
  const resDampSuppressed = turn(sDampSuppressed, 33);
  assert.equal(resDampSuppressed.state.enemy.currentHp, 0);
  assert.equal(resDampSuppressed.state.player.currentHp, 600, 'Damp suprimido não impede explosão de Aftermath (sofre 200 de recuo)');
});
