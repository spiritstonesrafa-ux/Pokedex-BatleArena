const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const Eval = require('../../assets/js/battle/battle-evaluator');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const mon = (id, ids = [33, 107], extra = {}) => ({
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

// =========================================================================
// 1. LIQUID OOZE
// =========================================================================

test('Liquid Ooze: Mega Drain (#72) causa recuo ao atacante em vez de cura', () => {
  const b = battle(
    { currentHp: 500, maxHp: 1000 },
    { ability: 'liquid-ooze', currentHp: 1000, maxHp: 1000 },
    [72, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(72),
    enemy: act(107)
  });
  const enemyLost = 1000 - r.state.enemy.currentHp;
  assert.ok(enemyLost > 0, 'Inimigo deve ter sofrido dano');
  const expectedRecoil = Math.max(1, Math.floor(enemyLost * 0.5));
  assert.equal(r.state.player.currentHp, 500 - expectedRecoil, 'Atacante deve ter sofrido dano de recuo igual à cura');
  const recoilEv = r.events.find(e => e.type === C.BATTLE_EVENTS.RECOIL_APPLIED && e.reason === 'liquid-ooze');
  assert.ok(recoilEv, 'Evento RECOIL_APPLIED por liquid-ooze deve ser emitido');
  assert.equal(recoilEv.damage, expectedRecoil);
});

test('Liquid Ooze: Giga Drain (#202) causa recuo correspondente ao dano drenado', () => {
  const b = battle(
    { currentHp: 600, maxHp: 1000 },
    { ability: 'liquid-ooze', currentHp: 1000, maxHp: 1000 },
    [202, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(202),
    enemy: act(107)
  });
  const enemyLost = 1000 - r.state.enemy.currentHp;
  const expectedRecoil = Math.max(1, Math.floor(enemyLost * 0.5));
  assert.equal(r.state.player.currentHp, 600 - expectedRecoil);
  assert.ok(r.events.some(e => e.type === C.BATTLE_EVENTS.RECOIL_APPLIED && e.reason === 'liquid-ooze'));
});

test('Liquid Ooze: golpes sem drenagem (Tackle #33) NÃO causam dano de Liquid Ooze', () => {
  const b = battle(
    { currentHp: 500, maxHp: 1000 },
    { ability: 'liquid-ooze', currentHp: 1000, maxHp: 1000 },
    [33, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(33),
    enemy: act(107)
  });
  assert.equal(r.state.player.currentHp, 500, 'Atacante com Tackle não sofre recuo');
  assert.ok(!r.events.some(e => e.reason === 'liquid-ooze'));
});

test('Liquid Ooze: atacante com Magic Guard NÃO sofre dano de Liquid Ooze', () => {
  const b = battle(
    { ability: 'magic-guard', currentHp: 500, maxHp: 1000 },
    { ability: 'liquid-ooze', currentHp: 1000, maxHp: 1000 },
    [72, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(72),
    enemy: act(107)
  });
  assert.equal(r.state.player.currentHp, 500, 'Magic Guard impede o dano de recuo de Liquid Ooze');
  assert.ok(!r.events.some(e => e.type === C.BATTLE_EVENTS.RECOIL_APPLIED && e.reason === 'liquid-ooze'));
});

test('Liquid Ooze: Mold Breaker no atacante NÃO anula Liquid Ooze (Showdown Gen IX)', () => {
  const b = battle(
    { ability: 'mold-breaker', currentHp: 500, maxHp: 1000 },
    { ability: 'liquid-ooze', currentHp: 1000, maxHp: 1000 },
    [72, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(72),
    enemy: act(107)
  });
  const enemyLost = 1000 - r.state.enemy.currentHp;
  const expectedRecoil = Math.max(1, Math.floor(enemyLost * 0.5));
  assert.equal(r.state.player.currentHp, 500 - expectedRecoil, 'Mold Breaker não quebra Liquid Ooze');
});

test('Liquid Ooze: supressão desativa a habilidade e permite cura normal de drenagem', () => {
  const b = battle(
    { currentHp: 500, maxHp: 1000 },
    { ability: 'liquid-ooze', abilitySuppressed: true, currentHp: 1000, maxHp: 1000 },
    [72, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(72),
    enemy: act(107)
  });
  const enemyLost = 1000 - r.state.enemy.currentHp;
  const expectedHeal = Math.max(1, Math.floor(enemyLost * 0.5));
  assert.equal(r.state.player.currentHp, 500 + expectedHeal, 'Com supressão, atacante cura normalmente');
  assert.ok(r.events.some(e => e.type === C.BATTLE_EVENTS.DRAIN_APPLIED));
});

test('Liquid Ooze: atacante desmaia caso o recuo zere seu HP', () => {
  const b = battle(
    { currentHp: 5, maxHp: 1000, specialAttack: 200 },
    { ability: 'liquid-ooze', currentHp: 1000, maxHp: 1000 },
    [72, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(72),
    enemy: act(107)
  });
  assert.equal(r.state.player.currentHp, 0, 'HP do atacante deve ser zerado');
  assert.ok(r.events.some(e => e.type === C.BATTLE_EVENTS.POKEMON_FAINTED && e.target === 'player'));
});

test('Liquid Ooze: BattleEvaluator (IA) prevê 0 cura e recuo positivo contra Liquid Ooze', () => {
  const b = battle(
    { currentHp: 500, maxHp: 1000 },
    { ability: 'liquid-ooze', currentHp: 1000, maxHp: 1000 },
    [72],
    [107]
  );
  const score = Eval.evaluateMove(b.player, b.enemy, move(72));
  assert.equal(score.expectedHeal, 0, 'IA não deve esperar cura');
  assert.ok(score.expectedRecoil > 0, 'IA deve prever dano de recuo contra Liquid Ooze');
});

// =========================================================================
// 2. STENCH
// =========================================================================

test('Stench: golpe de dano sem flinch nativo (Swift #129) flincha com roll <= 10', () => {
  const b = battle(
    { ability: 'stench' },
    {},
    [129, 107],
    [33, 107]
  );
  const r = E.resolveTurn(b, {
    player: act(129, { secondaryEffectRoll2: 5 }),
    enemy: act(33)
  });
  assert.ok(r.events.some(e => e.type === C.BATTLE_EVENTS.FLINCH_APPLIED && e.target === 'enemy'), 'Inimigo deve flinchar');
  assert.ok(r.events.some(e => e.type === 'FLINCH_IMMOBILIZED' || e.type === C.BATTLE_EVENTS.MOVE_FAILED && e.reason === 'FLINCHED'), 'Inimigo deve perder ação por flinch');
});

test('Stench: golpe de dano NÃO flincha com roll > 10', () => {
  const b = battle(
    { ability: 'stench' },
    {},
    [129, 107],
    [33, 107]
  );
  const r = E.resolveTurn(b, {
    player: act(129, { secondaryEffectRoll2: 50 }),
    enemy: act(33)
  });
  assert.ok(!r.events.some(e => e.type === C.BATTLE_EVENTS.FLINCH_APPLIED), 'Não deve flinchar com roll 50');
  assert.equal(r.state.enemy.isFlinched, false);
});

test('Stench: aceita flinchRoll direto em golpes físicos sem outro efeito secundário', () => {
  const b = battle(
    { ability: 'stench' },
    {},
    [33, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(33, { flinchRoll: 10 }),
    enemy: act(107)
  });
  assert.ok(r.events.some(e => e.type === C.BATTLE_EVENTS.FLINCH_APPLIED && e.target === 'enemy'));
});

test('Stench: defensor com Inner Focus é imune a flinch de Stench', () => {
  const b = battle(
    { ability: 'stench' },
    { ability: 'inner-focus' },
    [129, 107],
    [33, 107]
  );
  const r = E.resolveTurn(b, {
    player: act(129, { secondaryEffectRoll2: 1 }),
    enemy: act(33)
  });
  assert.ok(!r.events.some(e => e.type === C.BATTLE_EVENTS.FLINCH_APPLIED), 'Inner Focus impede flinch');
  assert.equal(r.state.enemy.isFlinched, false);
});

test('Stench: golpe de status (Minimize #107) NÃO ativa flinch', () => {
  const b = battle(
    { ability: 'stench' },
    {},
    [107],
    [33, 107]
  );
  const r = E.resolveTurn(b, {
    player: act(107, { secondaryEffectRoll2: 1, flinchRoll: 1 }),
    enemy: act(33)
  });
  assert.ok(!r.events.some(e => e.type === C.BATTLE_EVENTS.FLINCH_APPLIED), 'Status moves não flincham');
});

test('Stench: supressão desativa a chance de flinch', () => {
  const b = battle(
    { ability: 'stench', abilitySuppressed: true },
    {},
    [129, 107],
    [33, 107]
  );
  const r = E.resolveTurn(b, {
    player: act(129, { secondaryEffectRoll2: 1 }),
    enemy: act(33)
  });
  assert.ok(!r.events.some(e => e.type === C.BATTLE_EVENTS.FLINCH_APPLIED), 'Supressão desativa Stench');
});

// =========================================================================
// 3. SHIELD DUST
// =========================================================================

test('Shield Dust: bloqueia status secundário (Burn de Flamethrower #53)', () => {
  const b = battle(
    {},
    { ability: 'shield-dust' },
    [53, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(53, { secondaryEffectRoll: 5 }), // chance 10%
    enemy: act(107)
  });
  assert.equal(r.state.enemy.statusCondition, null, 'Shield Dust deve bloquear Burn de Flamethrower');
  assert.ok(!r.events.some(e => e.type === C.BATTLE_EVENTS.STATUS_APPLIED));
});

test('Shield Dust: bloqueia redução secundária de atributos (Sp. Def drop de Shadow Ball #247)', () => {
  const b = battle(
    {},
    { ability: 'shield-dust' },
    [247, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(247, { secondaryEffectRoll: 10 }), // chance 20%
    enemy: act(107)
  });
  assert.equal(r.state.enemy.statStages.specialDefense, 0, 'Shield Dust bloqueia drop de Sp. Def');
  assert.ok(!r.events.some(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.statKey === 'specialDefense'));
});

test('Shield Dust: bloqueia flinch secundário (Iron Head #442)', () => {
  const b = battle(
    {},
    { ability: 'shield-dust' },
    [442, 107],
    [33, 107]
  );
  const r = E.resolveTurn(b, {
    player: act(442, { secondaryEffectRoll: 10 }), // chance 30%
    enemy: act(33)
  });
  assert.equal(r.state.enemy.isFlinched, false, 'Shield Dust bloqueia flinch');
  assert.ok(!r.events.some(e => e.type === C.BATTLE_EVENTS.FLINCH_APPLIED));
});

test('Shield Dust: auto-boosts do atacante (Ancient Power #246) NÃO são bloqueados', () => {
  const b = battle(
    {},
    { ability: 'shield-dust' },
    [246, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(246, { secondaryEffectRoll: 5 }), // chance 10% de aumentar todos os atributos
    enemy: act(107)
  });
  assert.equal(r.state.player.statStages.attack, 1, 'Auto-boost do atacante deve ser aplicado');
  assert.equal(r.state.player.statStages.defense, 1);
  assert.ok(r.events.some(e => e.type === C.BATTLE_EVENTS.STAT_STAGE_CHANGED && e.combatant === 'player'));
});

test('Shield Dust: bloqueia envenenamento de Poison Touch no contato', () => {
  const b = battle(
    { ability: 'poison-touch' },
    { ability: 'shield-dust' },
    [33, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(33, { poisonTouchRoll: 5 }),
    enemy: act(107)
  });
  assert.equal(r.state.enemy.statusCondition, null, 'Shield Dust protege contra Poison Touch');
});

test('Shield Dust: Mold Breaker no atacante ignora Shield Dust e aplica efeito secundário', () => {
  const b = battle(
    { ability: 'mold-breaker' },
    { ability: 'shield-dust' },
    [53, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(53, { secondaryEffectRoll: 5 }),
    enemy: act(107)
  });
  assert.equal(r.state.enemy.statusCondition, 'burn', 'Mold Breaker quebra Shield Dust e aplica Burn');
  assert.ok(r.events.some(e => e.type === C.BATTLE_EVENTS.STATUS_APPLIED && e.statusCondition === 'burn'));
});

test('Shield Dust: Teravolt e Turboblaze também ignoram Shield Dust', () => {
  for (const ab of ['teravolt', 'turboblaze']) {
    const b = battle(
      { ability: ab },
      { ability: 'shield-dust' },
      [53, 107],
      [107]
    );
    const r = E.resolveTurn(b, {
      player: act(53, { secondaryEffectRoll: 5 }),
      enemy: act(107)
    });
    assert.equal(r.state.enemy.statusCondition, 'burn', `${ab} deve ignorar Shield Dust`);
  }
});

test('Shield Dust: Ability Shield impede Mold Breaker de ignorar Shield Dust', () => {
  const b = battle(
    { ability: 'mold-breaker' },
    { ability: 'shield-dust', item: 'ability-shield' },
    [53, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(53, { secondaryEffectRoll: 5 }),
    enemy: act(107)
  });
  assert.equal(r.state.enemy.statusCondition, null, 'Ability Shield protege Shield Dust de Mold Breaker');
});

test('Shield Dust: supressão desativa a proteção de Shield Dust', () => {
  const b = battle(
    {},
    { ability: 'shield-dust', abilitySuppressed: true },
    [53, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(53, { secondaryEffectRoll: 5 }),
    enemy: act(107)
  });
  assert.equal(r.state.enemy.statusCondition, 'burn', 'Shield Dust suprimido permite secundários');
});

test('Shield Dust: BattleEvaluator (IA) prevê 0 chance de status contra Shield Dust sem Mold Breaker', () => {
  const b = battle(
    {},
    { ability: 'shield-dust' },
    [53],
    [107]
  );
  const score = Eval.evaluateMove(b.player, b.enemy, move(53));
  assert.equal(score.statusChance, 0);
  assert.equal(score.expectedStatusBenefit, 0);
});

test('Shield Dust: BattleEvaluator (IA) prevê chance de status positiva com Mold Breaker', () => {
  const b = battle(
    { ability: 'mold-breaker' },
    { ability: 'shield-dust' },
    [53],
    [107]
  );
  const score = Eval.evaluateMove(b.player, b.enemy, move(53));
  assert.ok(score.statusChance > 0);
  assert.ok(score.expectedStatusBenefit > 0);
});

// =========================================================================
// 4. BIG PECKS
// =========================================================================

test('Big Pecks: Fire Lash (#680) tem drop de Defesa bloqueado no defensor', () => {
  const b = battle(
    {},
    { ability: 'big-pecks' },
    [680, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(680),
    enemy: act(107)
  });
  assert.equal(r.state.enemy.statStages.defense, 0, 'Defesa não pode ser reduzida por golpe do oponente');
  const ev = r.events.find(e => e.label === 'big-pecks' && e.reason === 'P7_ABILITY');
  assert.ok(ev, 'Evento de notificação da habilidade big-pecks deve existir');
});

test('Big Pecks: Crunch (#242) com ativação secundária tem drop de Defesa bloqueado', () => {
  const b = battle(
    {},
    { ability: 'big-pecks' },
    [242, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(242, { secondaryEffectRoll: 5 }), // chance 20%
    enemy: act(107)
  });
  assert.equal(r.state.enemy.statStages.defense, 0, 'Defesa não pode ser reduzida por Crunch');
});

test('Big Pecks: NÃO bloqueia reduções em outros atributos (Play Rough #583 reduz Attack)', () => {
  const b = battle(
    {},
    { ability: 'big-pecks' },
    [583, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(583, { secondaryEffectRoll: 5 }), // chance 10% de drop de Attack
    enemy: act(107)
  });
  assert.equal(r.state.enemy.statStages.attack, -1, 'Ataque deve ser reduzido normalmente');
});

test('Big Pecks: NÃO bloqueia auto-drops do próprio usuário (Close Combat #370 / Superpower #276)', () => {
  const b = battle(
    { ability: 'big-pecks' },
    {},
    [370, 276, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(370), // Close Combat reduz Defesa e Sp. Def do atacante em 1
    enemy: act(107)
  });
  assert.equal(r.state.player.statStages.defense, -1, 'Close Combat autoinflige -1 Defesa mesmo com Big Pecks');
  assert.equal(r.state.player.statStages.specialDefense, -1);
});

test('Big Pecks: Mold Breaker ignora Big Pecks e reduz Defesa', () => {
  const b = battle(
    { ability: 'mold-breaker' },
    { ability: 'big-pecks' },
    [680, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(680),
    enemy: act(107)
  });
  assert.equal(r.state.enemy.statStages.defense, -1, 'Mold Breaker reduz Defesa através de Big Pecks');
});

test('Big Pecks: Ability Shield protege Big Pecks contra Mold Breaker', () => {
  const b = battle(
    { ability: 'mold-breaker' },
    { ability: 'big-pecks', item: 'ability-shield' },
    [680, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(680),
    enemy: act(107)
  });
  assert.equal(r.state.enemy.statStages.defense, 0, 'Ability Shield impede Mold Breaker de quebrar Big Pecks');
});

test('Big Pecks: supressão desativa a proteção e permite redução de Defesa', () => {
  const b = battle(
    {},
    { ability: 'big-pecks', abilitySuppressed: true },
    [680, 107],
    [107]
  );
  const r = E.resolveTurn(b, {
    player: act(680),
    enemy: act(107)
  });
  assert.equal(r.state.enemy.statStages.defense, -1, 'Supressão permite redução de Defesa');
});
