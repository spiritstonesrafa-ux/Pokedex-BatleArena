const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const AI = require('../../assets/js/battle/battle-ai');
const V = require('../../assets/js/battle/battle-evaluator');
const Reg = require('../../assets/js/battle/ability-registry');
const Flags = require('../../assets/js/battle/move-flags');
const UI = require('../../assets/js/ui/battle-ui-adapter');
const P = C.P7;

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);
const mon = (id, ids = [33], extra = {}) => ({
  id,
  name: 'test-mon-' + id,
  types: ['normal'],
  hp: 1000,
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
const battle = (a = {}, b = {}, ids = [33]) => E.createBattle(
  mon(1, ids, { speed: 200, ...a }),
  mon(2, [33], b)
);
const turn = (s, id = 33, extra = {}, enemy = act(33)) => E.resolveTurn(s, {
  player: act(id, extra),
  enemy
});

/* ==========================================================================
   H0 Foundation & H11 Pokémon Champions (2026) Specifications
   ========================================================================== */

test('H0 & H11 — AbilityRegistry exposes all 374 abilities and verified Pokémon Champions contracts', () => {
  const all = Reg.getAllAbilities();
  assert.equal(all.length, 374);

  // H1-A implemented abilities (FULL status)
  for (const name of ['justified', 'moxie', 'chilling-neigh', 'as-one-glastrier', 'dauntless-shield']) {
    const entry = Reg.getAbility(name);
    assert.ok(entry, `Ability ${name} should exist in registry`);
    assert.equal(entry.status, 'FULL');
    assert.equal(entry.phase, 'H1');
    assert.ok(entry.triggers.length > 0);
    assert.ok(entry.description.length > 0);
  }

  // H11 official Mega Evolution abilities from Pokémon Champions (2026, Nintendo Switch)
  const h11Names = ['aura-guard', 'dragonize', 'eelevate', 'fire-mane', 'mega-sol', 'piercing-drill', 'spicy-spray'];
  for (const name of h11Names) {
    const entry = Reg.getAbility(name);
    assert.ok(entry, `Ability ${name} should exist in registry`);
    assert.ok(['FULL', 'RULE_CONFIRMED_PENDING_IMPLEMENTATION'].includes(entry.status), `${name} should have confirmed rule or full status`);
    assert.equal(entry.phase, 'H11');
    assert.ok(entry.description.length > 0, `${name} must document confirmed Champions effect`);
    assert.ok(entry.bearer, `${name} must document official Mega bearer`);
  }

  // Canonical breakability checks
  // Justified is NOT breakable by Mold Breaker (canonical Gen V-IX rule)
  assert.equal(Reg.isBreakable('justified'), false, 'Justified must NOT be breakable by Mold Breaker');
  assert.equal(Reg.isBreakable('dauntless-shield'), false);
  assert.equal(Reg.isBreakable('moxie'), false);
  assert.equal(Reg.isBreakable('chilling-neigh'), false);
  assert.equal(Reg.isBreakable('as-one-glastrier'), false);

  // Suppressibility checks
  assert.equal(Reg.isSuppressible('as-one-glastrier'), false, 'As One Glastrier must be un-suppressible');
  assert.equal(Reg.isSuppressible('moxie'), true);
  assert.equal(Reg.isSuppressible('justified'), true);
});

test('H0 — MoveFlags accurately categorizes move archetypes by ID', () => {
  // Sound moves
  assert.equal(Flags.isSoundMove(437), true); // Bug Buzz
  assert.equal(Flags.isSoundMove(304), true); // Hyper Voice
  assert.equal(Flags.isSoundMove(33), false);  // Tackle

  // Bullet moves
  assert.equal(Flags.isBulletMove(247), true); // Shadow Ball
  assert.equal(Flags.isBulletMove(188), true); // Sludge Bomb
  assert.equal(Flags.isBulletMove(33), false);

  // Bite moves
  assert.equal(Flags.isBiteMove(44), true);   // Bite
  assert.equal(Flags.isBiteMove(242), true);  // Crunch
  assert.equal(Flags.isBiteMove(33), false);

  // Punch moves
  assert.equal(Flags.isPunchMove(7), true);   // Fire Punch
  assert.equal(Flags.isPunchMove(183), true); // Mach Punch
  assert.equal(Flags.isPunchMove(33), false);

  // Wind moves
  assert.equal(Flags.isWindMove(16), true);   // Gust
  assert.equal(Flags.isWindMove(542), true);  // Hurricane
  assert.equal(Flags.isWindMove(33), false);

  // Slicing moves
  assert.equal(Flags.isSlicingMove(163), true); // Slash
  assert.equal(Flags.isSlicingMove(348), true); // Leaf Blade
  assert.equal(Flags.isSlicingMove(33), false);

  // Reflectable moves
  assert.equal(Flags.isReflectableMove(92), true); // Toxic
  assert.equal(Flags.isReflectableMove(86), true); // Thunder Wave
  assert.equal(Flags.isReflectableMove(33), false);

  // Full flags object
  const biteFlags = Flags.getMoveFlags(44);
  assert.equal(biteFlags.bite, true);
  assert.equal(biteFlags.punch, false);
});

test('H0 — BattleConstants integrates AbilityRegistry and MoveFlags', () => {
  assert.ok(C.AbilityRegistry);
  assert.ok(C.MoveFlags);
  assert.equal(typeof C.AbilityRegistry.getAbility, 'function');
  assert.equal(typeof C.MoveFlags.getMoveFlags, 'function');
});

/* ==========================================================================
   H1-A.1 Justified Tests (with Corrected Mold Breaker Mechanics)
   ========================================================================== */

test('Justified (+1 Attack) triggers upon receiving damaging Dark-type move', () => {
  // 44 = Bite (Dark type physical)
  const s = E.createBattle(
    mon(1, [44], { speed: 200, attack: 100 }),
    mon(2, [33], { speed: 100, ability: 'justified', hp: 500, currentHp: 500 })
  );
  const r = turn(s, 44);
  assert.equal(r.state.enemy.statStages.attack, 1);
  const feedback = r.events.find(e => e.reason === 'P7_ABILITY' && e.label === 'justified');
  assert.ok(feedback, 'Feedback P7_ABILITY justified should be emitted');
});

test('Justified triggers for player defender symmetrically', () => {
  const s = E.createBattle(
    mon(1, [33], { speed: 100, ability: 'justified', hp: 500, currentHp: 500 }),
    mon(2, [44], { speed: 200, attack: 100 })
  );
  const r = E.resolveTurn(s, { player: act(33), enemy: act(44) });
  assert.equal(r.state.player.statStages.attack, 1);
  assert.ok(r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'justified'));
});

test('Justified is NOT ignored by Mold Breaker (canonical Bulbapedia / Showdown rule)', () => {
  // Mold Breaker only ignores defensive damage-reduction, immunity, or stat-protection abilities.
  // Justified takes full damage and reacts afterwards: Mold Breaker does NOT prevent Justified!
  const s = E.createBattle(
    mon(1, [44], { speed: 200, ability: 'mold-breaker' }),
    mon(2, [33], { ability: 'justified', hp: 500 })
  );
  const r = turn(s, 44);
  assert.equal(r.state.enemy.statStages.attack, 1, 'Justified MUST activate even when attacker has Mold Breaker');
  assert.ok(r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'justified'));
});

test('Justified does NOT trigger under true ability suppression (e.g. Core Enforcer / Gastro Acid)', () => {
  const s = E.createBattle(
    mon(1, [44], { speed: 200 }),
    mon(2, [33], { ability: 'justified', hp: 500 })
  );
  s.enemy.abilitySuppressed = true; // True suppression
  const r = turn(s, 44);
  assert.equal(r.state.enemy.statStages.attack, 0, 'Suppressed Justified must not activate');
});

test('Ability Shield protects Justified against Core Enforcer suppression', () => {
  // Defender has Justified and holds Ability Shield
  const s = E.createBattle(
    mon(1, [687, 44], { speed: 50 }), // Core Enforcer (Dragon #687), then Bite (#44)
    mon(2, [33], { ability: 'justified', item: 'ability-shield', speed: 200, hp: 500 })
  );
  // Turn 1: Core Enforcer hits defender who acted first
  const r1 = turn(s, 687);
  assert.equal(r1.state.enemy.abilitySuppressed, false, 'Ability Shield prevents Core Enforcer suppression');

  // Turn 2: Bite (Dark) hits defender
  const r2 = E.resolveTurn(r1.state, { player: act(44), enemy: act(33) });
  assert.equal(r2.state.enemy.statStages.attack, 1, 'Justified activates because Ability Shield prevented suppression');
});

test('Justified does NOT trigger on non-Dark damaging move', () => {
  // 33 = Tackle (Normal)
  const s = E.createBattle(
    mon(1, [33], { speed: 200 }),
    mon(2, [33], { ability: 'justified' })
  );
  const r = turn(s, 33);
  assert.equal(r.state.enemy.statStages.attack, 0);
});

test('Justified does NOT trigger if move deals 0 damage due to Protect', () => {
  const s = E.createBattle(
    mon(1, [44], { speed: 200 }),
    mon(2, [182, 33], { ability: 'justified', speed: 300 }) // Protect priority +4
  );
  const r = E.resolveTurn(s, { player: act(44), enemy: act(182) });
  assert.equal(r.state.enemy.statStages.attack, 0);
});

test('Justified does NOT trigger if defender faints from the Dark move', () => {
  const s = E.createBattle(
    mon(1, [44], { speed: 200, attack: 1000 }),
    mon(2, [33], { ability: 'justified', hp: 10, currentHp: 10 })
  );
  const r = turn(s, 44);
  assert.equal(r.state.enemy.currentHp, 0);
  assert.equal(r.state.enemy.statStages.attack, 0);
  assert.ok(!r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'justified'));
});

test('Justified triggers per damaging hit of a multi-hit Dark move', () => {
  const s = battle({}, { ability: 'justified', hp: 1000 });
  const a = s.player, d = s.enemy;
  const darkDamageMove = { id: 999, name: 'beat-up', type: 'dark', damageClass: 'physical', power: 20 };
  
  // Simulate 3 hits on defender
  P.afterHit(s, 'player', darkDamageMove, act(999), C, [], 20);
  P.afterHit(s, 'player', darkDamageMove, act(999), C, [], 20);
  P.afterHit(s, 'player', darkDamageMove, act(999), C, [], 20);
  assert.equal(d.statStages.attack, 3);
});

test('Justified caps Attack at +6 stage cleanly', () => {
  const s = E.createBattle(
    mon(1, [44], { speed: 200, attack: 10 }),
    mon(2, [33], { ability: 'justified', hp: 1000 })
  );
  s.enemy.statStages.attack = 6;
  const r = turn(s, 44);
  assert.equal(r.state.enemy.statStages.attack, 6);
});

/* ==========================================================================
   H1-A.2 Moxie Tests (Authorship, Recoil, Residual & Multi-Target)
   ========================================================================== */

test('Moxie (+1 Attack) triggers upon direct move knockout', () => {
  const s = E.createTeamBattle(
    [mon(1, [33], { ability: 'moxie', speed: 200, attack: 500 }), mon(3), mon(4)],
    [mon(2, [33], { hp: 1 }), mon(5), mon(6)]
  );
  const r = turn(s, 33);
  assert.equal(r.state.player.team[0].statStages.attack, 1);
  assert.ok(r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'moxie'));
});

test('Moxie triggers symmetrically for enemy attacker', () => {
  const s = E.createTeamBattle(
    [mon(1, [33], { hp: 1 }), mon(3), mon(4)],
    [mon(2, [33], { ability: 'moxie', speed: 200, attack: 500 }), mon(5), mon(6)]
  );
  const r = E.resolveTurn(s, { player: act(33), enemy: act(33) });
  assert.equal(r.state.enemy.team[0].statStages.attack, 1);
  assert.ok(r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'moxie'));
});

test('Moxie does NOT trigger on residual poison or burn KO', () => {
  const s = E.createTeamBattle(
    [mon(1, [182, 33], { ability: 'moxie', speed: 300 }), mon(3), mon(4)], // 182 = Protect
    [mon(2, [33], { hp: 100, currentHp: 1, statusCondition: 'poison' }), mon(5), mon(6)]
  );
  const r = turn(s, 182);
  assert.equal(r.state.player.team[0].statStages.attack, 0, 'Residual poison KO must not trigger Moxie');
});

test('Moxie does NOT trigger if attacker faints simultaneously from recoil', () => {
  const s = E.createTeamBattle(
    [mon(1, [38], { ability: 'moxie', hp: 10, currentHp: 1, speed: 200, attack: 500 }), mon(3), mon(4)], // 38 = Double-Edge recoil
    [mon(2, [33], { hp: 10, currentHp: 5 }), mon(5), mon(6)]
  );
  const r = turn(s, 38);
  assert.equal(r.state.player.team[0].currentHp, 0);
  assert.equal(r.state.player.team[0].statStages.attack, 0);
});

test('Moxie DOES trigger if attacker survives recoil damage while knocking out defender', () => {
  const s = E.createTeamBattle(
    [mon(1, [38], { ability: 'moxie', hp: 100, currentHp: 50, speed: 200, attack: 500 }), mon(3), mon(4)],
    [mon(2, [33], { hp: 10, currentHp: 5 }), mon(5), mon(6)]
  );
  const r = turn(s, 38);
  assert.ok(r.state.player.team[0].currentHp > 0, 'Attacker survives recoil');
  assert.equal(r.state.player.team[0].statStages.attack, 1, 'Moxie triggers when attacker survives recoil');
});

test('Moxie triggers twice upon knocking out 2 opponents with spread move in Doubles', () => {
  // 825 = Astral Barrage / 57 = Surf (spread move hitting both foes)
  const s = E.createDoublesBattle(
    [mon(1, [825], { ability: 'moxie', speed: 300, attack: 500, types: ['ghost'] }), mon(3)],
    [mon(2, [33], { hp: 1, types: ['psychic'] }), mon(4, [33], { hp: 1, types: ['psychic'] }), mon(5)]
  );
  const r = E.resolveDoublesTurn(s, {
    player: { 0: act(825), 1: act(33) },
    enemy: { 0: act(33), 1: act(33) }
  });
  assert.equal(r.state.player.team[0].statStages.attack, 2, 'Double KO in doubles grants +2 Attack');
  const moxieEvents = r.events.filter(e => e.reason === 'P7_ABILITY' && e.label === 'moxie');
  assert.equal(moxieEvents.length, 2);
});

test('Moxie Attack boost caps at +6 stage', () => {
  const s = E.createTeamBattle(
    [mon(1, [33], { ability: 'moxie', speed: 200, attack: 500 }), mon(3), mon(4)],
    [mon(2, [33], { hp: 1 }), mon(5), mon(6)]
  );
  s.player.team[0].statStages.attack = 6;
  const r = turn(s, 33);
  assert.equal(r.state.player.team[0].statStages.attack, 6);
});

/* ==========================================================================
   H1-A.3 Chilling Neigh Tests
   ========================================================================== */

test('Chilling Neigh (+1 Attack) triggers upon direct move knockout', () => {
  const s = E.createTeamBattle(
    [mon(1, [33], { ability: 'chilling-neigh', speed: 200, attack: 500 }), mon(3), mon(4)],
    [mon(2, [33], { hp: 1 }), mon(5), mon(6)]
  );
  const r = turn(s, 33);
  assert.equal(r.state.player.team[0].statStages.attack, 1);
  assert.ok(r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'chilling-neigh'));
});

test('Chilling Neigh does NOT trigger on residual damage KO', () => {
  const s = E.createTeamBattle(
    [mon(1, [182, 33], { ability: 'chilling-neigh', speed: 300 }), mon(3), mon(4)], // 182 = Protect
    [mon(2, [33], { hp: 100, currentHp: 1, statusCondition: 'burn' }), mon(5), mon(6)]
  );
  const r = turn(s, 182);
  assert.equal(r.state.player.team[0].statStages.attack, 0);
});

/* ==========================================================================
   H1-A.4 As One (Glastrier) Tests
   ========================================================================== */

test('As One Glastrier blocks opposing berry consumption (Unnerve effect)', () => {
  // Enemy with Sitrus Berry below 50% HP cannot eat it while As One Glastrier is active
  const s = E.createBattle(
    mon(1, [33], { ability: 'as-one-glastrier' }),
    mon(2, [33], { item: 'sitrus-berry', hp: 200, currentHp: 80 })
  );
  assert.equal(s.enemy.item, 'sitrus-berry');
  const r = turn(s, 33);
  assert.equal(r.state.enemy.item, 'sitrus-berry', 'Berry should remain blocked');
});

test('As One Glastrier raises Attack (+1) on direct move knockout (Chilling Neigh effect)', () => {
  const s = E.createTeamBattle(
    [mon(1, [33], { ability: 'as-one-glastrier', speed: 200, attack: 500 }), mon(3), mon(4)],
    [mon(2, [33], { hp: 1 }), mon(5), mon(6)]
  );
  const r = turn(s, 33);
  assert.equal(r.state.player.team[0].statStages.attack, 1);
  assert.ok(r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'chilling-neigh'));
});

test('As One Glastrier emits entry feedback on switch-in', () => {
  const s = E.createTeamBattle(
    [mon(1, [33]), mon(3, [33], { ability: 'as-one-glastrier' }), mon(4)],
    [mon(2), mon(5), mon(6)]
  );
  const r = E.resolveTurn(s, {
    player: { type: 'SWITCH', targetPokemonId: 3 },
    enemy: act(33)
  });
  assert.ok(r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'as-one-glastrier'));
});

test('As One Glastrier cannot be suppressed by Core Enforcer or abilitySuppressed flag', () => {
  // abilitySuppressed flag
  const s = battle({}, { ability: 'as-one-glastrier' });
  s.enemy.abilitySuppressed = true;
  assert.equal(P.ability(s.enemy, true), 'as-one-glastrier');
  assert.equal(P.berriesBlocked(s, 'player'), true);

  // Core Enforcer (move #687)
  const s2 = E.createBattle(
    mon(1, [687], { speed: 50 }),
    mon(2, [33], { speed: 200, ability: 'as-one-glastrier' })
  );
  const r2 = turn(s2, 687);
  assert.equal(r2.state.enemy.abilitySuppressed, false, 'Core Enforcer cannot suppress As One');
});

/* ==========================================================================
   H1-A.5 Dauntless Shield Tests
   ========================================================================== */

test('Dauntless Shield (+1 Defense) activates on battle entry', () => {
  const raw = mon(1, [33], { ability: 'dauntless-shield' });
  const s = E.createBattle(raw, mon(2));
  assert.equal(s.player.statStages.defense, 1);
  assert.equal(s.player.dauntlessShieldUsed, true);
  assert.ok(s.p7Started);
});

test('Dauntless Shield activates symmetrically for enemy on entry', () => {
  const s = E.createBattle(mon(1), mon(2, [33], { ability: 'dauntless-shield' }));
  assert.equal(s.enemy.statStages.defense, 1);
  assert.equal(s.enemy.dauntlessShieldUsed, true);
});

test('Dauntless Shield triggers only ONCE per battle across switches (Gen IX rule)', () => {
  let s = E.createTeamBattle(
    [mon(1, [33], { ability: 'dauntless-shield' }), mon(3), mon(4)],
    [mon(2), mon(5), mon(6)]
  );
  // Entry 1: active
  assert.equal(s.player.team[0].statStages.defense, 1);
  assert.equal(s.player.team[0].dauntlessShieldUsed, true);

  // Switch out to mon 3
  s = E.resolveTurn(s, { player: { type: 'SWITCH', targetPokemonId: 3 }, enemy: act(33) }).state;
  assert.equal(s.player.team[0].statStages.defense, 0); // Stage cleared on switch
  assert.equal(s.player.team[0].dauntlessShieldUsed, true); // Used flag persists!

  // Switch back in to mon 1
  s = E.resolveTurn(s, { player: { type: 'SWITCH', targetPokemonId: 1 }, enemy: act(33) }).state;
  assert.equal(s.player.team[0].statStages.defense, 0, 'Defense must NOT increase a second time');
  assert.equal(s.player.team[0].dauntlessShieldUsed, true);

  // Fresh battle resets dauntlessShieldUsed to false
  const fresh = E.createCombatant(s.player.team[0]);
  assert.equal(fresh.dauntlessShieldUsed, false, 'Fresh combatant has dauntlessShieldUsed reset');
});

/* ==========================================================================
   Real Campaign Species & Format Compatibility Tests
   ========================================================================== */

test('Format 1 (1v1 Singles): Real Keldeo (#647) with Justified vs Dark attack', () => {
  const keldeo = mon(647, [33], { name: 'keldeo', ability: 'justified', hp: 500, currentHp: 500 });
  const foe = mon(2, [44], { speed: 200, attack: 100 }); // Bite (#44)
  const s = E.createBattle(foe, keldeo);
  const r = turn(s, 44);
  assert.equal(r.state.enemy.statStages.attack, 1);
});

test('Format 1 (1v1 Singles): Real Zamazenta (#889) activates Dauntless Shield on entry', () => {
  const zamazenta = mon(889, [33], { name: 'zamazenta', ability: 'dauntless-shield' });
  const s = E.createBattle(zamazenta, mon(2));
  assert.equal(s.player.statStages.defense, 1);
  assert.equal(s.player.dauntlessShieldUsed, true);
});

test('Format 2 (3v3 Singles): Real Calyrex-Ice (#10193) blocks berries and gains Attack on KO', () => {
  const calyrex = mon(10193, [33], { name: 'calyrex-ice', ability: 'as-one-glastrier', attack: 500, speed: 200 });
  const s = E.createTeamBattle(
    [calyrex, mon(3), mon(4)],
    [mon(2, [33], { hp: 100, currentHp: 40, item: 'sitrus-berry' }), mon(5), mon(6)]
  );
  // Berry is blocked by Unnerve component
  assert.equal(s.enemy.team[0].item, 'sitrus-berry');

  // Turn 1: Calyrex attacks and knocks out target
  const r = turn(s, 33);
  assert.equal(r.state.player.team[0].statStages.attack, 1, 'Chilling Neigh component boosts Attack on direct KO');
});

test('Format 2 (3v3 Singles): Real Glastrier (#896) gains Chilling Neigh on KO and retains stage across turns', () => {
  const glastrier = mon(896, [33], { name: 'glastrier', ability: 'chilling-neigh', attack: 500, speed: 200 });
  const s = E.createTeamBattle(
    [glastrier, mon(3), mon(4)],
    [mon(2, [33], { hp: 1 }), mon(5), mon(6)]
  );
  const r1 = turn(s, 33);
  assert.equal(r1.state.player.team[0].statStages.attack, 1);
});

test('Format 3 (Final Stand): Real Krookodile (#553) with Moxie activates in Final Stand', () => {
  const krookodile = mon(553, [33], { name: 'krookodile', ability: 'moxie', attack: 500, speed: 200 });
  const s = E.createBattle(krookodile, mon(2, [33], { hp: 1 }));
  s.isFinalStand = true;
  const r = turn(s, 33);
  assert.equal(r.state.player.statStages.attack, 1);
});

test('Format 4 (Doubles 2v2): Real Calyrex-Ice + Zamazenta pair behaves correctly', () => {
  const calyrex = mon(10193, [33], { name: 'calyrex-ice', ability: 'as-one-glastrier' });
  const zamazenta = mon(889, [33], { name: 'zamazenta', ability: 'dauntless-shield' });
  const s = E.createDoublesBattle(
    [calyrex, zamazenta],
    [mon(2, [33], { item: 'oran-berry', currentHp: 20 }), mon(4, [33], { item: 'sitrus-berry', currentHp: 20 })]
  );
  // Zamazenta gained Defense on entry
  assert.equal(s.player.team[1].statStages.defense, 1);
  // Both enemy berries blocked by As One Glastrier
  assert.equal(s.enemy.team[0].item, 'oran-berry');
  assert.equal(s.enemy.team[1].item, 'sitrus-berry');
});

/* ==========================================================================
   Presentation & UI Adapter Translation Tests
   ========================================================================== */

test('Presentation: UI Adapter formats Portuguese descriptions for H1-A abilities', () => {
  const expectedTranslations = {
    'justified': 'Keldeo: Justified aumentou o Ataque ao receber um golpe do tipo Dark!',
    'moxie': 'Salamence: Moxie aumentou o Ataque após o nocaute!',
    'chilling-neigh': 'Glastrier: Chilling Neigh aumentou o Ataque após o nocaute!',
    'as-one-glastrier': 'Calyrex: As One ativado: berries adversárias bloqueadas e Chilling Neigh disponível.',
    'dauntless-shield': 'Zamazenta: Dauntless Shield aumentou a Defesa!'
  };

  const pokemonNames = {
    'justified': 'Keldeo',
    'moxie': 'Salamence',
    'chilling-neigh': 'Glastrier',
    'as-one-glastrier': 'Calyrex',
    'dauntless-shield': 'Zamazenta'
  };

  const adapter = new UI.BattleUiDomAdapter();
  let displayedMessage = null;
  adapter.setView({
    displayMessage: msg => { displayedMessage = msg; }
  });

  for (const [label, expectedText] of Object.entries(expectedTranslations)) {
    displayedMessage = null;
    const command = {
      type: 'MOVE_FAIL_FEEDBACK',
      pokemonName: pokemonNames[label],
      reason: 'P7_ABILITY',
      label
    };
    adapter.handleCommand(command);
    assert.equal(displayedMessage, expectedText, `Label ${label} should produce correct message: "${expectedText}"`);
  }
});
