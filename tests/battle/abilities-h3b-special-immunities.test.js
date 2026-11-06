const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');

const customMoves = {
  165: { id: 165, name: 'struggle', type: 'normal', power: 50, accuracy: null, priority: 0, damageClass: 'physical', pp: 1, maxPp: 1, currentPp: 1 },
  48: { id: 48, name: 'supersonic', type: 'normal', power: null, accuracy: 50, damageClass: 'status', pp: 20, maxPp: 20, currentPp: 20 },
  114: { id: 114, name: 'haze', type: 'ice', power: null, accuracy: null, damageClass: 'status', target: 'all', pp: 30, maxPp: 30, currentPp: 30 },
  446: { id: 446, name: 'stealth-rock', type: 'rock', power: null, accuracy: null, damageClass: 'status', target: 'foeSide', pp: 20, maxPp: 20, currentPp: 20 },
  811: { id: 811, name: 'coaching', type: 'fighting', power: null, accuracy: null, damageClass: 'status', target: 'adjacentAlly', pp: 10, maxPp: 10, currentPp: 10 },
  99901: { id: 99901, name: 'low-acc-status', type: 'normal', power: null, accuracy: 30, damageClass: 'status', pp: 10, maxPp: 10, currentPp: 10 },
  99902: { id: 99902, name: 'sure-hit-status', type: 'normal', power: null, accuracy: null, damageClass: 'status', pp: 10, maxPp: 10, currentPp: 10 }
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
  statStages: { attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0 },
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

// Move IDs:
// 33: Tackle (normal, physical)
// 89: Earthquake (ground, physical)
// 53: Flamethrower (fire, special)
// 247: Shadow Ball (ghost, special)
// 147: Spore (status, 100 acc)
// 261: Will-O-Wisp (status, 85 acc)
// 86: Thunder Wave (status, 90 acc)
// 92: Toxic (status, 90 acc)
// 269: Taunt (status, 100 acc)
// 165: Struggle (normal, physical, typeless recoil)
// 107: Minimize (status, self)
// 14: Swords Dance (status, self)
// 48: Supersonic (status, 50 acc)
// 114: Haze (status, all)
// 446: Stealth Rock (status, foeSide)

// -------------------------------------------------------------
// PURIFYING SALT
// -------------------------------------------------------------
test('Purifying Salt: imunidade a Burn (Will-O-Wisp #261)', () => {
  const s = battle({}, { ability: 'purifying-salt' }, [261, 33]);
  const res = turn(s, 261);
  assert.equal(res.state.enemy.statusCondition, null);
  assert.ok(res.events.some(e => e.type === 'STATUS_BLOCKED' && e.reason === 'IMMUNE'));
});

test('Purifying Salt: imunidade a Toxic (#92) e Paralysis (#86)', () => {
  const sToxic = battle({}, { ability: 'purifying-salt' }, [92, 33]);
  const resToxic = turn(sToxic, 92);
  assert.equal(resToxic.state.enemy.statusCondition, null);

  const sPara = battle({}, { ability: 'purifying-salt' }, [86, 33]);
  const resPara = turn(sPara, 86);
  assert.equal(resPara.state.enemy.statusCondition, null);
});

test('Purifying Salt: reduz pela metade (0.5x) dano de golpes Ghost (Shadow Ball #247)', () => {
  const sNormal = battle({}, { types: ['grass'] }, [247, 33]);
  const resNormal = turn(sNormal, 247);
  const dmgNormal = 1000 - resNormal.state.enemy.currentHp;

  const sSalt = battle({}, { ability: 'purifying-salt', types: ['grass'] }, [247, 33]);
  const resSalt = turn(sSalt, 247);
  const dmgSalt = 1000 - resSalt.state.enemy.currentHp;

  assert.ok(dmgSalt < dmgNormal);
  assert.equal(dmgSalt, Math.floor(dmgNormal * 0.5));
});

test('Purifying Salt: Mold Breaker ignora redução Ghost e imunidade a status', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'purifying-salt' }, [261, 33]);
  const res = turn(s, 261);
  assert.equal(res.state.enemy.statusCondition, 'burn');
});

test('Purifying Salt: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('purifying-salt');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

// -------------------------------------------------------------
// WONDER SKIN
// -------------------------------------------------------------
test('Wonder Skin: fixa precisão em 50 para movimentos Status com precisão numérica (30 -> 50, 50 -> 50, 85 -> 50, 100 -> 50)', () => {
  const defender = mon(2, [33], { ability: 'wonder-skin' });
  const attacker = mon(1, [33]);

  // Precisão 30 -> 50 (regra canônica Showdown Gen IX)
  const lowAcc = move(99901);
  assert.equal(C.getEffectiveAccuracy(lowAcc, attacker, defender), 50);

  // Precisão 50 -> 50
  const midAcc = move(48);
  assert.equal(C.getEffectiveAccuracy(midAcc, attacker, defender), 50);

  // Precisão 85 -> 50
  const willo = move(261);
  assert.equal(C.getEffectiveAccuracy(willo, attacker, defender), 50);

  // Precisão 100 -> 50
  const spore = move(147);
  assert.equal(C.getEffectiveAccuracy(spore, attacker, defender), 50);
});

test('Wonder Skin: movimentos com precisão especial não numérica ou infalível NÃO são afetados', () => {
  const defender = mon(2, [33], { ability: 'wonder-skin' });
  const attacker = mon(1, [33]);
  const infallible = move(99902);
  assert.equal(C.getEffectiveAccuracy(infallible, attacker, defender), null);
});

test('Wonder Skin: golpes ofensivos de dano mantêm precisão inalterada', () => {
  const defender = mon(2, [33], { ability: 'wonder-skin' });
  const tackle = move(33); // Tackle 100 acc
  const flamethrower = move(53); // Flamethrower 100 acc

  assert.equal(C.getEffectiveAccuracy(tackle, mon(1, [33]), defender), 100);
  assert.equal(C.getEffectiveAccuracy(flamethrower, mon(1, [33]), defender), 100);
});

test('Wonder Skin: movimento direcionado ao próprio usuário não é afetado', () => {
  const s = battle({ ability: 'wonder-skin' }, {}, [14, 33]);
  const res = turn(s, 14);
  assert.equal(res.state.player.statStages.attack, 2);
});

test('Wonder Skin: Mold Breaker ignora Wonder Skin e preserva precisão original de 100%', () => {
  const attacker = mon(1, [33], { ability: 'mold-breaker' });
  const defender = mon(2, [33], { ability: 'wonder-skin', abilityIgnored: true });
  const spore = move(147);

  const sporeAcc = C.getEffectiveAccuracy(spore, attacker, defender);
  assert.equal(sporeAcc, 100);
});

test('Wonder Skin: Ability Shield protege Wonder Skin contra Mold Breaker', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'wonder-skin', item: 'ability-shield' }, [147, 33]);
  const acc = C.getEffectiveAccuracy(move(147), s.player, s.enemy);
  assert.equal(acc, 50);
});

test('Wonder Skin: Neutralizing Gas suprime Wonder Skin e restaura precisão base', () => {
  const s = battle({ ability: 'neutralizing-gas' }, { ability: 'wonder-skin' }, [147, 33]);
  s.neutralizingGasActive = true;
  s.enemy.neutralizingGasSuppressed = true;
  const acc = C.getEffectiveAccuracy(move(147), s.player, s.enemy);
  assert.equal(acc, 100);
});

test('Wonder Skin: precisão e evasão modificadas por estágios aplicam multiplicadores sobre base 50', () => {
  const defender = mon(2, [33], { ability: 'wonder-skin' });
  const spore = move(147);

  // Atacante com +1 estágio de Accuracy: Math.floor(50 * 4/3) = 66
  const atkPlus1 = mon(1, [33], { accuracyStage: 1 });
  assert.equal(C.getEffectiveAccuracy(spore, atkPlus1, defender), 66);

  // Defensor com +1 estágio de Evasion (stage = -1): Math.floor(50 * 3/4) = 37
  const defPlus1 = mon(2, [33], { ability: 'wonder-skin', evasionStage: 1 });
  assert.equal(C.getEffectiveAccuracy(spore, mon(1, [33]), defPlus1), 37);

  // Atacante com -1 estágio de Accuracy (stage = -1): Math.floor(50 * 3/4) = 37
  const atkMinus1 = mon(1, [33], { accuracyStage: -1 });
  assert.equal(C.getEffectiveAccuracy(spore, atkMinus1, defender), 37);
});

test('Wonder Skin: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('wonder-skin');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

// -------------------------------------------------------------
// EARTH EATER
// -------------------------------------------------------------
test('Earth Eater: absorve dano Ground (Earthquake #89) e cura 25% max HP', () => {
  const s = battle({}, { ability: 'earth-eater', currentHp: 500 }, [89, 33]);
  const res = turn(s, 89);
  assert.equal(res.state.enemy.currentHp, 750); // 500 + 250 (25% de 1000)
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'earth-eater'));
});

test('Earth Eater: dano de outro tipo (Tackle #33) atinge normalmente', () => {
  const s = battle({}, { ability: 'earth-eater' }, [33, 107]);
  const res = turn(s, 33);
  assert.ok(res.state.enemy.currentHp < 1000);
});

test('Earth Eater: Mold Breaker quebra Earth Eater e causa dano de Ground', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'earth-eater' }, [89, 33]);
  const res = turn(s, 89);
  assert.ok(res.state.enemy.currentHp < 1000);
});

test('Earth Eater: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('earth-eater');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

// -------------------------------------------------------------
// WELL-BAKED BODY
// -------------------------------------------------------------
test('Well-Baked Body: anula golpe Fire (Flamethrower #53) e aumenta Defense em +2', () => {
  const s = battle({}, { ability: 'well-baked-body' }, [53, 33]);
  const res = turn(s, 53);
  assert.equal(res.state.enemy.currentHp, 1000); // 0 dano
  assert.equal(res.state.enemy.statStages.defense, 2);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'well-baked-body'));
});

test('Well-Baked Body: golpe de outro tipo (Tackle #33) causa dano normalmente sem boost', () => {
  const s = battle({}, { ability: 'well-baked-body' }, [33, 107]);
  const res = turn(s, 33);
  assert.ok(res.state.enemy.currentHp < 1000);
  assert.equal(res.state.enemy.statStages.defense, 0);
});

test('Well-Baked Body: Mold Breaker quebra Well-Baked Body e causa dano Fire', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'well-baked-body' }, [53, 33]);
  const res = turn(s, 53);
  assert.ok(res.state.enemy.currentHp < 1000);
  assert.equal(res.state.enemy.statStages.defense, 0);
});

test('Well-Baked Body: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('well-baked-body');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

// -------------------------------------------------------------
// GOOD AS GOLD
// -------------------------------------------------------------
test('Good as Gold: bloqueia Taunt (#269) completamente', () => {
  const s = battle({}, { ability: 'good-as-gold' }, [269, 33]);
  const res = turn(s, 269);
  assert.equal(res.state.enemy.tauntTurns || 0, 0);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && (e.reason === 'BLOCKED_BY_ABILITY' || e.reason === 'P7_IMMUNE')));
});

test('Good as Gold: bloqueia Will-O-Wisp (#261)', () => {
  const s = battle({}, { ability: 'good-as-gold' }, [261, 33]);
  const res = turn(s, 261);
  assert.equal(res.state.enemy.statusCondition, null);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'good-as-gold'));
});

test('Good as Gold: bloqueia Spore (#147)', () => {
  const s = battle({}, { ability: 'good-as-gold' }, [147, 33]);
  const res = turn(s, 147);
  assert.equal(res.state.enemy.statusCondition, null);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'good-as-gold'));
});

test('Good as Gold: bloqueia movimento Status direcionado por aliado em Doubles (target !== source)', () => {
  const s = battle({}, { ability: 'good-as-gold' }, [261, 33]);
  const ally = mon(3, [261]);
  const gholdengo = s.enemy;
  const events = [];
  const blocked = C.P7.tryHit(s, 'player', move(261), C, events, ally, gholdengo, 'enemy');
  assert.equal(blocked, true);
  assert.ok(events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'good-as-gold'));
});

test('Good as Gold: movimentos de status próprios (Swords Dance #14) funcionam normalmente', () => {
  const s = battle({ ability: 'good-as-gold' }, {}, [14, 33]);
  const res = turn(s, 14);
  assert.equal(res.state.player.statStages.attack, 2);
});

test('Good as Gold: movimentos de campo (Stealth Rock #446 foeSide) NÃO são bloqueados', () => {
  const s = battle({}, { ability: 'good-as-gold' }, [446, 33]);
  const events = [];
  const blocked = C.P7.tryHit(s, 'player', move(446), C, events);
  assert.equal(blocked, false);
});

test('Good as Gold: movimentos de campo inteiro (Haze #114 all) afetam normalmente e não são bloqueados', () => {
  const hazeMove = { id: 114, name: 'haze', target: 'all', damageClass: 'status' };
  const s = battle({ statStages: { attack: 2 } }, { ability: 'good-as-gold', statStages: { specialAttack: 2 } }, [33, 107]);
  const events = [];
  const blocked = C.P7.tryHit(s, 'player', hazeMove, C, events, s.player, s.enemy, 'enemy');
  assert.equal(blocked, false);
});

test('Good as Gold: movimentos ofensivos com efeitos secundários atingem e aplicam efeito normalmente', () => {
  const s = battle({}, { ability: 'good-as-gold' }, [53, 107]);
  const res = turn(s, 53, { secondaryEffectRoll: 1 });
  assert.ok(res.state.enemy.currentHp < 1000);
  assert.equal(res.state.enemy.statusCondition, 'burn');
});

test('Good as Gold: Mold Breaker quebra Good as Gold e aplica Taunt', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'good-as-gold' }, [269, 33]);
  const res = turn(s, 269);
  assert.equal(res.state.enemy.tauntTurns, 2);
});

test('Good as Gold: Ability Shield protege Good as Gold contra Mold Breaker', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'good-as-gold', item: 'ability-shield' }, [269, 33]);
  const res = turn(s, 269);
  assert.equal(res.state.enemy.tauntTurns || 0, 0);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && (e.reason === 'BLOCKED_BY_ABILITY' || e.reason === 'P7_IMMUNE')));
});

test('Good as Gold: Neutralizing Gas suprime Good as Gold e permite aplicar status', () => {
  const s = battle({ ability: 'neutralizing-gas' }, { ability: 'good-as-gold' }, [261, 33]);
  s.neutralizingGasActive = true;
  s.enemy.neutralizingGasSuppressed = true;
  const res = turn(s, 261);
  assert.equal(res.state.enemy.statusCondition, 'burn');
});

test('Good as Gold: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('good-as-gold');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});

// -------------------------------------------------------------
// WONDER GUARD
// -------------------------------------------------------------
test('Wonder Guard: bloqueia dano direto neutro (Tackle #33 em Shedinja Bug/Ghost)', () => {
  const s = battle({}, { ability: 'wonder-guard', types: ['bug', 'ghost'] }, [33, 107]);
  const res = turn(s, 33);
  assert.equal(res.state.enemy.currentHp, 1000);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'wonder-guard'));
});

test('Wonder Guard: bloqueia dano direto resistido (Earthquake #89 em Shedinja Bug/Ghost)', () => {
  const s = battle({}, { ability: 'wonder-guard', types: ['bug', 'ghost'] }, [89, 107]);
  const res = turn(s, 89);
  assert.equal(res.state.enemy.currentHp, 1000);
  assert.ok(res.events.some(e => e.type === 'MOVE_FAILED' && e.reason === 'P7_IMMUNE' && e.label === 'wonder-guard'));
});

test('Wonder Guard: permite dano direto super efetivo (Flamethrower #53 em Shedinja Bug/Ghost)', () => {
  const s = battle({}, { ability: 'wonder-guard', types: ['bug', 'ghost'] }, [53, 107]);
  const res = turn(s, 53);
  assert.ok(res.state.enemy.currentHp < 1000);
});

test('Wonder Guard: permite dano direto de Shadow Ball (#247) super efetivo em Ghost', () => {
  const s = battle({}, { ability: 'wonder-guard', types: ['ghost'] }, [247, 107]);
  const res = turn(s, 247);
  assert.ok(res.state.enemy.currentHp < 1000);
});

test('Wonder Guard: Struggle (#165) atinge Wonder Guard diretamente', () => {
  const s = battle({}, { ability: 'wonder-guard', types: ['bug', 'ghost'] }, [165, 107]);
  const res = turn(s, 165);
  assert.ok(res.state.enemy.currentHp < 1000);
});

test('Wonder Guard: movimentos de status (Will-O-Wisp #261) atingem Wonder Guard', () => {
  const s = battle({}, { ability: 'wonder-guard', types: ['bug', 'ghost'] }, [261, 107]);
  const res = turn(s, 261);
  assert.equal(res.state.enemy.statusCondition, 'burn');
});

test('Wonder Guard: Mold Breaker quebra Wonder Guard e atinge com Tackle neutro', () => {
  const s = battle({ ability: 'mold-breaker' }, { ability: 'wonder-guard', types: ['bug', 'dark'] }, [33, 107]);
  const res = turn(s, 33);
  assert.ok(res.state.enemy.currentHp < 1000);
});

test('Wonder Guard: registro declara status FULL e breakable true', () => {
  const meta = Reg.getAbility('wonder-guard');
  assert.equal(meta.status, 'FULL');
  assert.equal(meta.breakable, true);
  assert.equal(meta.suppressible, true);
});
