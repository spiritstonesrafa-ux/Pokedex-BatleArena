const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const customMoves = {
  120: { id: 120, name: 'self-destruct', type: 'normal', power: 200, accuracy: 100, priority: 0, damageClass: 'physical', pp: 5, maxPp: 5, currentPp: 5 },
  153: { id: 153, name: 'explosion', type: 'normal', power: 250, accuracy: 100, priority: 0, damageClass: 'physical', pp: 5, maxPp: 5, currentPp: 5 }
};

const move = id => customMoves[id] || C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

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

const turn = (s, id = 33, extra = {}, enemy = act(107)) => E.resolveTurn(s, {
  player: act(id, extra),
  enemy
});

// -------------------------------------------------------------
// OBLIVIOUS
// -------------------------------------------------------------
test('Oblivious: bloqueia Taunt (#269) completamente', () => {
  const s = battle({}, { ability: 'oblivious' }, [269, 33]);
  const res = turn(s, 269);
  assert.equal(res.state.enemy.tauntTurns || 0, 0);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_ABILITY'));
});

test('Oblivious: bloqueia redução de Ataque causada por Intimidate', () => {
  const s = E.createBattle(
    mon(1, [33], { ability: 'intimidate' }),
    mon(2, [33], { ability: 'oblivious' })
  );
  C.P7.start(s, C);
  assert.equal(s.enemy.statStages.attack, 0);
});

test('Oblivious: cura/ignora atração (Infatuation)', () => {
  const s = battle({ ability: 'oblivious', infatuation: 'enemy' }, {});
  const res = turn(s, 33);
  assert.equal(res.state.player.infatuation, null);
  assert.ok(res.events.some(e => e.type === 'DAMAGE_APPLIED'));
});

test('Oblivious: Mold Breaker quebra Oblivious e aplica Taunt', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'oblivious' }, [269, 33]);
  const res = turn(s, 269);
  assert.equal(res.state.enemy.tauntTurns, 2); // 3 aplicado, decrementa 1 no final do turno
});

test('Oblivious: Ability Shield protege Oblivious contra Mold Breaker', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'oblivious', item: 'ability-shield' }, [269, 33]);
  const res = turn(s, 269);
  assert.equal(res.state.enemy.tauntTurns || 0, 0);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_ABILITY'));
});

test('Oblivious: suprimida permite Taunt', () => {
  const s = battle({}, { ability: 'oblivious', abilitySuppressed: true }, [269, 33]);
  const res = turn(s, 269);
  assert.equal(res.state.enemy.tauntTurns, 2); // 3 aplicado, decrementa 1 no final do turno
});

test('Oblivious: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('oblivious');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

// -------------------------------------------------------------
// OVERCOAT
// -------------------------------------------------------------
test('Overcoat: imunidade a dano residual de Sandstorm', () => {
  const s = battle({ ability: 'overcoat' }, {});
  s.weather = { id: 'sand', turns: 5 };
  s.player.types = ['normal'];
  const res = turn(s, 107);
  assert.equal(res.state.player.currentHp, 1000);
});

test('Overcoat: imunidade a dano residual de Hail', () => {
  const s = battle({ ability: 'overcoat' }, {});
  s.weather = { id: 'hail', turns: 5 };
  s.player.types = ['normal'];
  const res = turn(s, 107);
  assert.equal(res.state.player.currentHp, 1000);
});

test('Overcoat: imunidade a Spore (#147) e golpes de pó', () => {
  const s = battle({}, { ability: 'overcoat' }, [147, 33]);
  const res = turn(s, 147);
  assert.equal(res.state.enemy.statusCondition, null);
  assert.ok(res.events.some(e => e.type === 'STATUS_BLOCKED' && e.reason === 'IMMUNE'));
});

test('Overcoat: imunidade a Sleep Powder (#79)', () => {
  const s = battle({}, { ability: 'overcoat' }, [79, 33]);
  const res = turn(s, 79);
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Overcoat: imunidade a Stun Spore (#78)', () => {
  const s = battle({}, { ability: 'overcoat' }, [78, 33]);
  const res = turn(s, 78);
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Overcoat: imunidade a Poison Powder (#77)', () => {
  const s = battle({}, { ability: 'overcoat' }, [77, 33]);
  const res = turn(s, 77);
  assert.equal(res.state.enemy.statusCondition, null);
});

test('Overcoat: golpe de status NÃO de pó (Hypnosis #95) afeta normalmente', () => {
  const s = battle({}, { ability: 'overcoat' }, [95, 33]);
  const res = turn(s, 95);
  assert.equal(res.state.enemy.statusCondition, 'sleep');
});

test('Overcoat: Effect Spore não afeta portador de Overcoat no contato', () => {
  const s = battle({ ability: 'overcoat' }, { ability: 'effect-spore' });
  const res = turn(s, 33, { effectSporeRoll: 5 });
  assert.equal(res.state.player.statusCondition, null);
});

test('Overcoat: Mold Breaker ignora Overcoat e aplica Spore', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'overcoat' }, [147, 33]);
  const res = turn(s, 147);
  assert.equal(res.state.enemy.statusCondition, 'sleep');
});

test('Overcoat: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('overcoat');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

// -------------------------------------------------------------
// DAMP
// -------------------------------------------------------------
test('Damp: impede uso de Self-Destruct (#120)', () => {
  const s = battle({ ability: 'damp' }, {}, [107, 33], [120, 33]);
  const res = E.resolveTurn(s, {
    player: act(107),
    enemy: act(120)
  });
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'DAMP'));
  assert.equal(res.state.enemy.currentHp, 1000);
});

test('Damp: impede uso de Explosion (#153)', () => {
  const s = battle({}, { ability: 'damp' }, [153, 33]);
  const res = turn(s, 153);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'DAMP'));
  assert.equal(res.state.player.currentHp, 1000);
});

test('Damp: bloqueia ativação de Aftermath ao nocautear defensor', () => {
  const s = battle({ ability: 'damp' }, { ability: 'aftermath', currentHp: 10, hp: 10 });
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 0);
  assert.equal(res.state.player.currentHp, 1000);
});

test('Damp: Neutralizing Gas suprime Damp e permite Explosion', () => {
  const s = battle({ ability: 'neutralizing-gas' }, { ability: 'damp' }, [153, 33]);
  s.neutralizingGasActive = true;
  s.enemy.neutralizingGasSuppressed = true;
  const res = turn(s, 153);
  assert.ok(!res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'DAMP'));
});

test('Damp: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('damp');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

// -------------------------------------------------------------
// SOUNDPROOF
// -------------------------------------------------------------
test('Soundproof: bloqueia Boomburst (#586) completamente', () => {
  const s = battle({}, { ability: 'soundproof' }, [586, 33]);
  const res = turn(s, 586);
  assert.equal(res.state.enemy.currentHp, 1000);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'soundproof'));
});

test('Soundproof: bloqueia Hyper Voice (#304) completamente', () => {
  const s = battle({}, { ability: 'soundproof' }, [304, 33]);
  const res = turn(s, 304);
  assert.equal(res.state.enemy.currentHp, 1000);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'soundproof'));
});

test('Soundproof: golpe não sonoro (Tackle #33) atinge normalmente', () => {
  const s = battle({}, { ability: 'soundproof' }, [33, 107]);
  const res = turn(s, 33);
  assert.ok(res.state.enemy.currentHp < 1000);
});

test('Soundproof: Mold Breaker quebra Soundproof e causa dano com Boomburst', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'soundproof' }, [586, 33]);
  const res = turn(s, 586);
  assert.ok(res.state.enemy.currentHp < 1000);
});

test('Soundproof: Ability Shield protege Soundproof contra Mold Breaker', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'soundproof', item: 'ability-shield' }, [586, 33]);
  const res = turn(s, 586);
  assert.equal(res.state.enemy.currentHp, 1000);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'soundproof'));
});

test('Soundproof: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('soundproof');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

// -------------------------------------------------------------
// BULLETPROOF
// -------------------------------------------------------------
test('Bulletproof: bloqueia Shadow Ball (#247) completamente', () => {
  const s = battle({}, { ability: 'bulletproof' }, [247, 33]);
  const res = turn(s, 247);
  assert.equal(res.state.enemy.currentHp, 1000);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'bulletproof'));
});

test('Bulletproof: bloqueia Energy Ball (#412) completamente', () => {
  const s = battle({}, { ability: 'bulletproof' }, [412, 33]);
  const res = turn(s, 412);
  assert.equal(res.state.enemy.currentHp, 1000);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'bulletproof'));
});

test('Bulletproof: bloqueia Focus Blast (#411) completamente', () => {
  const s = battle({}, { ability: 'bulletproof' }, [411, 33]);
  const res = turn(s, 411);
  assert.equal(res.state.enemy.currentHp, 1000);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'bulletproof'));
});

test('Bulletproof: golpe que não é projétil (Tackle #33) atinge normalmente', () => {
  const s = battle({}, { ability: 'bulletproof' }, [33, 107]);
  const res = turn(s, 33);
  assert.ok(res.state.enemy.currentHp < 1000);
});

test('Bulletproof: Mold Breaker quebra Bulletproof e causa dano com Shadow Ball', () => {
  // Defensor precisa de tipo neutro/afetado por Ghost (e.g. grass)
  const s = battle({ ability: 'mold-breaker' }, { ability: 'bulletproof', types: ['grass'] }, [247, 33]);
  const res = turn(s, 247);
  assert.ok(res.state.enemy.currentHp < 1000);
});

test('Bulletproof: Ability Shield protege Bulletproof contra Mold Breaker', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'bulletproof', types: ['grass'], item: 'ability-shield' }, [247, 33]);
  const res = turn(s, 247);
  assert.equal(res.state.enemy.currentHp, 1000);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'bulletproof'));
});

test('Bulletproof: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('bulletproof');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});
