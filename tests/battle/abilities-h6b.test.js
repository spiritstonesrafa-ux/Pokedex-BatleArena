const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const V = require('../../assets/js/battle/battle-evaluator');
const Reg = require('../../assets/js/battle/ability-registry');
const TE = require('../../assets/js/battle/type-effectiveness');
const Mapper = require('../../assets/js/presentation/battle-presentation-mapper');
const { BattleUiDomAdapter } = require('../../assets/js/ui/battle-ui-adapter');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const mon = (id, ids = [58, 399, 56, 33], extra = {}) => ({
  id,
  name: 'test-mon-' + id,
  types: ['water', 'dark'],
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

const battle = (a = {}, b = {}, idsA = [58, 399, 56, 33], idsB = [33, 53, 85, 370]) => E.createBattle(
  mon(1, idsA, { speed: 200, ...a }),
  mon(2, idsB, { speed: 50, types: ['normal'], ...b })
);

const turn = (s, id = 58, extra = {}, enemy = act(33)) => E.resolveTurn(s, {
  player: act(id, extra),
  enemy
});

/* ==========================================================================
   Section 1: Ability Registry & Metadata Verification (H6-B)
   ========================================================================== */

test('H6-B Registry: protean, libero e color-change estão registradas com status FULL e metadados canônicos', () => {
  const abilities = ['protean', 'libero', 'color-change'];
  for (const slug of abilities) {
    const meta = Reg.getAbility(slug);
    assert.ok(meta, `Habilidade ${slug} deve estar no registry`);
    assert.equal(meta.id, slug);
    assert.equal(meta.phase, 'H6');
    assert.equal(meta.status, 'FULL');
    assert.equal(meta.breakable, false, 'Habilidades de mudança de tipo não são quebradas por Mold Breaker');
    assert.equal(meta.suppressible, true);
    assert.equal(meta.copyable, true);
    assert.equal(meta.swappable, true);
    assert.ok(meta.description && meta.description.length > 20);
    assert.ok(meta.triggers && meta.triggers.length > 0);
  }
});

test('H6-B Inventory: P7.abilityNames contém as 3 habilidades', () => {
  assert.ok(C.P7.abilityNames.includes('protean'));
  assert.ok(C.P7.abilityNames.includes('libero'));
  assert.ok(C.P7.abilityNames.includes('color-change'));
});

/* ==========================================================================
   Section 2: Helper Functions Verification
   ========================================================================== */

test('H6-B Helpers: canActivateProtean valida corretamente as regras canônicas', () => {
  const user = mon(1, [58], { ability: 'protean', types: ['water', 'dark'] });

  // Golpe Ice Beam (tipo ice) em Water/Dark: ativa
  assert.equal(C.P7.canActivateProtean(user, move(58), 'ice'), true);

  // Já é mono-tipo Ice e usa golpe Ice: não ativa
  const monoIce = { ...user, types: ['ice'] };
  assert.equal(C.P7.canActivateProtean(monoIce, move(58), 'ice'), false);

  // Dual-type Water/Dark usando Water: torna-se mono-tipo Water, então ativa
  assert.equal(C.P7.canActivateProtean(user, move(56), 'water'), true);

  // Já usou Protean no switch-in: não ativa novamente (Gen IX)
  const used = { ...user, proteanUsed: true };
  assert.equal(C.P7.canActivateProtean(used, move(58), 'ice'), false);

  // Terastallizado: Protean não funciona em Pokémon Tera
  const tera = { ...user, tera: 'water' };
  assert.equal(C.P7.canActivateProtean(tera, move(58), 'ice'), false);

  // Supresso: não ativa
  const suppressed = { ...user, abilitySuppressed: true };
  assert.equal(C.P7.canActivateProtean(suppressed, move(58), 'ice'), false);

  // Struggle (#165): não ativa
  const struggleMove = { id: 165, name: 'struggle', type: 'normal' };
  assert.equal(C.P7.canActivateProtean(user, struggleMove, 'normal'), false);
});

test('H6-B Helpers: canActivateColorChange valida corretamente as regras canônicas', () => {
  const target = mon(2, [33], { ability: 'color-change', types: ['normal'], currentHp: 500 });

  // Dano de golpe Fire (Flamethrower #53): ativa
  assert.equal(C.P7.canActivateColorChange(target, move(53), 'fire', 50, false, false), true);

  // Dano 0 (imunidade ou miss): não ativa
  assert.equal(C.P7.canActivateColorChange(target, move(53), 'fire', 0, false, false), false);

  // Golpe de status (Toxic #92): não ativa
  assert.equal(C.P7.canActivateColorChange(target, move(92), 'poison', 0, false, false), false);

  // Já possui exatamente o tipo do dano recebido: não ativa
  const fireMon = { ...target, types: ['fire'] };
  assert.equal(C.P7.canActivateColorChange(fireMon, move(53), 'fire', 50, false, false), false);

  // Dano absorvido por Substitute sem bypass sonoro/infiltrator: não ativa
  assert.equal(C.P7.canActivateColorChange(target, move(53), 'fire', 0, true, false), false);

  // Dano em Substitute mas golpe sonoro bypassa: ativa
  assert.equal(C.P7.canActivateColorChange(target, move(304), 'normal', 50, true, true), false); // Já é normal

  // Desmaiado: não ativa
  const fainted = { ...target, currentHp: 0 };
  assert.equal(C.P7.canActivateColorChange(fainted, move(53), 'fire', 50, false, false), false);

  // Terastallizado: não ativa
  const tera = { ...target, tera: 'water' };
  assert.equal(C.P7.canActivateColorChange(tera, move(53), 'fire', 50, false, false), false);
});

/* ==========================================================================
   Section 3: Protean Mechanics (Greninja)
   ========================================================================== */

test('Protean: altera tipo para Ice antes do dano de Ice Beam e recebe STAB 1.5x', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { types: ['dragon', 'flying'] }, [58]);
  const res = turn(s, 58);

  const p = res.state.player;
  assert.deepEqual(p.types, ['ice'], 'Greninja deve se tornar mono-tipo Ice');
  assert.equal(p.proteanUsed, true, 'Flag proteanUsed deve ser consumida');

  const stabEvt = res.events.find(e => e.type === 'STAB_RESOLVED');
  assert.ok(stabEvt, 'STAB_RESOLVED deve ser emitido');
  assert.equal(stabEvt.hasStab, true);
  assert.equal(stabEvt.multiplier, 1.5, 'Deve receber STAB 1.5x como tipo Ice');

  const typeEvt = res.events.find(e => e.type === 'MOVE_PREPARED' && e.reason === 'TYPE_CHANGED');
  assert.ok(typeEvt, 'Evento TYPE_CHANGED deve ser emitido');
  assert.equal(typeEvt.label, 'ice');
});

test('Protean: regra Gen IX de limite de uma ativação por entrada em campo', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { types: ['normal'] }, [58, 399]);

  // Turno 1: Usa Ice Beam -> Vira Ice
  const res1 = turn(s, 58);
  assert.deepEqual(res1.state.player.types, ['ice']);
  assert.equal(res1.state.player.proteanUsed, true);

  // Turno 2: Usa Dark Pulse -> Permanece Ice (não re-ativa), não ganha STAB
  const res2 = turn(res1.state, 399);
  assert.deepEqual(res2.state.player.types, ['ice'], 'Permanece Ice no segundo turno');
  const stabEvt = res2.events.find(e => e.type === 'STAB_RESOLVED');
  assert.equal(stabEvt.hasStab, false, 'Não deve ter STAB Dark pois é atualmente tipo Ice');
  assert.equal(stabEvt.multiplier, 1);
});

test('Protean: mono-tipo já com o mesmo tipo do golpe não ativa nem consome', () => {
  const s = battle({ ability: 'protean', types: ['ice'] }, { types: ['normal'] }, [58]);
  const res = turn(s, 58);

  assert.deepEqual(res.state.player.types, ['ice']);
  assert.equal(res.state.player.proteanUsed, false, 'proteanUsed NÃO deve ser consumido pois já era mono-tipo Ice');
  const typeEvt = res.events.find(e => e.type === 'MOVE_PREPARED' && e.reason === 'TYPE_CHANGED');
  assert.equal(typeEvt, undefined, 'Não deve emitir TYPE_CHANGED se já é mono-tipo daquele tipo');
});

test('Protean: dual-type com um tipo coincidente torna-se mono-tipo e consome ativação', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { types: ['normal'] }, [56]);
  const res = turn(s, 56); // Hydro Pump (water)

  assert.deepEqual(res.state.player.types, ['water'], 'Deve se tornar mono-tipo Water perdendo Dark');
  assert.equal(res.state.player.proteanUsed, true, 'Deve consumir a ativação');
  const typeEvt = res.events.find(e => e.type === 'MOVE_PREPARED' && e.reason === 'TYPE_CHANGED');
  assert.ok(typeEvt);
  assert.equal(typeEvt.label, 'water');
});

test('Protean: golpe de status (Toxic) ativa Protean e transforma em mono-tipo Poison', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { types: ['normal'] }, [92]);
  const res = turn(s, 92); // Toxic

  assert.deepEqual(res.state.player.types, ['poison']);
  assert.equal(res.state.player.proteanUsed, true);
  const typeEvt = res.events.find(e => e.type === 'MOVE_PREPARED' && e.reason === 'TYPE_CHANGED');
  assert.ok(typeEvt);
  assert.equal(typeEvt.label, 'poison');
});

test('Protean: golpe que erra o alvo ainda assim ativa Protean antes do miss', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { types: ['normal'] }, [56]);
  // Hydro Pump (#56) tem 80% de precisão. Com accuracyRoll: 90 (> 80), o golpe erra.
  const res = turn(s, 56, { accuracyRoll: 90 });

  assert.deepEqual(res.state.player.types, ['water'], 'Deve mudar para Water mesmo se o golpe errar');
  assert.equal(res.state.player.proteanUsed, true);
  const missEvt = res.events.find(e => e.type === 'MOVE_MISSED');
  assert.ok(missEvt, 'Golpe deve ter errado');
});

test('Protean: golpe bloqueado por Protect do adversário ainda assim ativa Protean', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { types: ['normal'] }, [58], [182]);
  // Inimigo age com Protect (prioridade +4)
  const res = E.resolveTurn(s, {
    player: act(58),
    enemy: act(182)
  });

  assert.deepEqual(res.state.player.types, ['ice'], 'Deve mudar para Ice mesmo se bloqueado por Protect');
  assert.equal(res.state.player.proteanUsed, true);
  const failEvt = res.events.find(e => e.type === 'MOVE_FAILED' && e.reason === 'BLOCKED_BY_PROTECT');
  assert.ok(failEvt);
});

test('Protean: impedimento prévio à execução (sono) NÃO ativa nem consome Protean', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'], statusCondition: 'sleep', sleepTurns: 2 }, { types: ['normal'] }, [58]);
  const res = turn(s, 58);

  assert.deepEqual(res.state.player.types, ['water', 'dark'], 'Não deve mudar de tipo se estava dormindo');
  assert.equal(res.state.player.proteanUsed, false, 'proteanUsed não deve ser consumido');
  const sleepEvt = res.events.find(e => e.type === 'STATUS_IMMOBILIZED' && e.statusCondition === 'sleep');
  assert.ok(sleepEvt);
});

test('Protean: Struggle não ativa Protean', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'], item: 'assault-vest' }, { types: ['normal'] }, [14]);
  const res = turn(s, 14);

  assert.deepEqual(res.state.player.types, ['water', 'dark']);
  assert.equal(res.state.player.proteanUsed, false);
  const struggleEvt = res.events.find(e => e.type === 'MOVE_USED' && e.moveId === 165);
  assert.ok(struggleEvt, 'Golpe executado deve ter sido Struggle #165');
});

test('Protean: Pokémon Terastallizado não ativa Protean', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { types: ['normal'] }, [58]);
  s.player.tera = 'fire';
  s.player.types = ['fire'];
  const res = turn(s, 58);

  assert.deepEqual(res.state.player.types, ['fire'], 'Deve manter tipagem Tera');
  assert.equal(res.state.player.proteanUsed, false);
});

test('Protean: supressão de habilidade anula a ativação', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { types: ['normal'] }, [58]);
  s.player.abilitySuppressed = true;
  const res = turn(s, 58);

  assert.deepEqual(res.state.player.types, ['water', 'dark']);
  assert.equal(res.state.player.proteanUsed, false);
});

test('Protean: golpe de dois turnos (Solar Beam) ativa no turno de carregamento', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { types: ['normal'] }, [76]);
  const res = turn(s, 76); // Solar Beam carregando

  assert.deepEqual(res.state.player.types, ['grass'], 'Deve se tornar Grass no turno de carregamento');
  assert.equal(res.state.player.proteanUsed, true);
  const prepEvt = res.events.find(e => e.type === 'MOVE_PREPARED' && e.reason === 'CHARGE_SOLAR');
  assert.ok(prepEvt);
});

/* ==========================================================================
   Section 4: Libero Mechanics (Cinderace)
   ========================================================================== */

test('Libero: Cinderace (Fire) usa Close Combat (Fighting) e vira Fighting com STAB', () => {
  const s = battle({ ability: 'libero', types: ['fire'] }, { types: ['normal'] }, [370]);
  const res = turn(s, 370);

  assert.deepEqual(res.state.player.types, ['fighting']);
  assert.equal(res.state.player.proteanUsed, true);
  const stabEvt = res.events.find(e => e.type === 'STAB_RESOLVED');
  assert.ok(stabEvt);
  assert.equal(stabEvt.hasStab, true);
  assert.equal(stabEvt.multiplier, 1.5);
  const abEvt = res.events.find(e => e.type === 'MOVE_PREPARED' && e.reason === 'P7_ABILITY');
  assert.equal(abEvt.label, 'libero');
});

test('Libero: mono-tipo Fire usando golpe Fire não consome ativação', () => {
  const s = battle({ ability: 'libero', types: ['fire'] }, { types: ['normal'] }, [53]);
  const res = turn(s, 53); // Flamethrower

  assert.deepEqual(res.state.player.types, ['fire']);
  assert.equal(res.state.player.proteanUsed, false);
});

test('Libero: status move (Swords Dance #14) ativa e torna mono-tipo Normal', () => {
  const s = battle({ ability: 'libero', types: ['fire'] }, { types: ['normal'] }, [14]);
  const res = turn(s, 14);

  assert.deepEqual(res.state.player.types, ['normal']);
  assert.equal(res.state.player.proteanUsed, true);
});

/* ==========================================================================
   Section 5: Color Change Mechanics (Kecleon)
   ========================================================================== */

test('Color Change: Kecleon (Normal) sofre Flamethrower, calcula dano com Normal e vira Fire após hit', () => {
  const s = battle({ speed: 50, types: ['normal'], ability: 'color-change' }, { speed: 200, types: ['fire'] }, [33], [53]);
  // Inimigo ataca primeiro com Flamethrower
  const res = E.resolveTurn(s, {
    player: act(33),
    enemy: act(53)
  });

  const p = res.state.player;
  assert.deepEqual(p.types, ['fire'], 'Kecleon deve se tornar Fire após ser atingido por golpe Fire');
  assert.equal(p.typeChangedByAbility, 'color-change');

  // Verifica que o dano sofrido usou efetividade neutra (1.0x contra Normal), e não resistência de Fire (0.5x)
  const dmgEvt = res.events.find(e => e.type === 'DAMAGE_APPLIED' && e.target === 'player');
  assert.ok(dmgEvt);
  assert.equal(dmgEvt.typeMultiplier, 1, 'Dano do golpe recebido deve usar tipagem anterior (Normal)');
});

test('Color Change: mudanças sucessivas de tipo a cada golpe sofrido', () => {
  const s = battle({ speed: 50, types: ['normal'], ability: 'color-change' }, { speed: 200, types: ['normal'] }, [33], [53, 85, 56]);

  // Turno 1: Recebe Flamethrower (Fire) -> Vira Fire
  const res1 = E.resolveTurn(s, { player: act(33), enemy: act(53) });
  assert.deepEqual(res1.state.player.types, ['fire']);

  // Turno 2: Recebe Thunderbolt (Electric) -> Vira Electric
  const res2 = E.resolveTurn(res1.state, { player: act(33), enemy: act(85) });
  assert.deepEqual(res2.state.player.types, ['electric']);

  // Turno 3: Recebe Hydro Pump (Water) -> Vira Water
  const res3 = E.resolveTurn(res2.state, { player: act(33), enemy: act(56) });
  assert.deepEqual(res3.state.player.types, ['water']);
});

test('Color Change: golpe de mesmo tipo recebido não re-emite ativação', () => {
  const s = battle({ speed: 50, types: ['fire'], ability: 'color-change' }, { speed: 200, types: ['fire'] }, [33], [53]);
  const res = E.resolveTurn(s, { player: act(33), enemy: act(53) });

  assert.deepEqual(res.state.player.types, ['fire']);
  const ccEvt = res.events.find(e => e.type === 'MOVE_PREPARED' && e.label === 'color-change');
  assert.equal(ccEvt, undefined, 'Não deve emitir ativação se já possui o tipo');
});

test('Color Change: golpe de status não ativa Color Change', () => {
  const s = battle({ speed: 50, types: ['normal'], ability: 'color-change' }, { speed: 200, types: ['poison'] }, [33], [92]);
  const res = E.resolveTurn(s, { player: act(33), enemy: act(92) }); // Toxic

  assert.deepEqual(res.state.player.types, ['normal']);
  const ccEvt = res.events.find(e => e.type === 'MOVE_PREPARED' && e.label === 'color-change');
  assert.equal(ccEvt, undefined);
});

test('Color Change: golpe absorvido por Substitute não ativa Color Change', () => {
  const s = battle({ speed: 50, types: ['normal'], ability: 'color-change', substitute: true, substituteHp: 200 }, { speed: 200, types: ['fire'] }, [33], [53]);
  const res = E.resolveTurn(s, { player: act(33), enemy: act(53) });

  assert.deepEqual(res.state.player.types, ['normal'], 'Substitute absorveu dano, Color Change não deve ativar');
});

test('Color Change: nocaute não ativa Color Change', () => {
  const s = battle({ speed: 50, types: ['normal'], ability: 'color-change', currentHp: 10 }, { speed: 200, types: ['fighting'] }, [33], [370]);
  const res = E.resolveTurn(s, { player: act(33), enemy: act(370) }); // Close combat KO

  assert.equal(res.state.player.currentHp, 0);
  const ccEvt = res.events.find(e => e.type === 'MOVE_PREPARED' && e.label === 'color-change');
  assert.equal(ccEvt, undefined, 'Pokémon nocauteado não ativa Color Change');
});

test('Color Change: golpes multi-hit ativam Color Change apenas após todos os acertos', () => {
  const s = battle({ speed: 50, types: ['normal'], ability: 'color-change' }, { speed: 200, types: ['grass'] }, [33], [331]);
  // Bullet Seed (Grass, multi-hit)
  const res = E.resolveTurn(s, { player: act(33), enemy: act(331) });

  const multiComplete = res.events.find(e => e.type === 'MULTI_HIT_COMPLETE');
  assert.ok(multiComplete, 'Multi-hit deve ter sido concluído');

  const ccIndex = res.events.findIndex(e => e.type === 'MOVE_PREPARED' && e.label === 'color-change');
  const multiIndex = res.events.indexOf(multiComplete);
  assert.ok(ccIndex > multiIndex, 'Color Change deve ativar APÓS MULTI_HIT_COMPLETE');
  assert.deepEqual(res.state.player.types, ['grass']);
});

test('Color Change: efeito secundário (queimadura de Flamethrower) ocorre antes da mudança de tipo', () => {
  const s = battle({ speed: 50, types: ['normal'], ability: 'color-change' }, { speed: 200, types: ['fire'] }, [33], [53]);
  // secondaryEffectRoll: 1 garante aplicação de Burn (10% chance)
  const res = E.resolveTurn(s, {
    player: act(33),
    enemy: act(53, { secondaryEffectRoll: 1 })
  });

  assert.equal(res.state.player.statusCondition, 'burn', 'Kecleon deve ser queimado');
  assert.deepEqual(res.state.player.types, ['fire'], 'Kecleon torna-se Fire');
  // Ordem de eventos: STATUS_APPLIED deve preceder TYPE_CHANGED
  const statusIdx = res.events.findIndex(e => e.type === 'STATUS_APPLIED');
  const typeIdx = res.events.findIndex(e => e.type === 'MOVE_PREPARED' && e.reason === 'TYPE_CHANGED');
  assert.ok(statusIdx !== -1 && typeIdx !== -1 && statusIdx < typeIdx, 'Status deve ser aplicado antes da mudança de tipo');
});

/* ==========================================================================
   Section 6: Switch & Re-entry Resets (3v3 Team Battle)
   ========================================================================== */

test('Switch Reset: troca de Pokémon restaura tipagem original e reseta proteanUsed', () => {
  const teamPlayer = [
    mon(658, [58, 399], { name: 'greninja', ability: 'protean', types: ['water', 'dark'] }),
    mon(301, [33], { name: 'delcatty', types: ['normal'] }),
    mon(25, [85], { name: 'pikachu', types: ['electric'] })
  ];
  const teamEnemy = [
    mon(2, [33], { types: ['normal'] }),
    mon(3, [33], { types: ['normal'] }),
    mon(4, [33], { types: ['normal'] })
  ];
  const s = E.createTeamBattle(teamPlayer, teamEnemy);

  // Turno 1: Greninja usa Ice Beam -> Vira Ice
  const res1 = E.resolveTurn(s, { player: act(58), enemy: act(33) });
  assert.deepEqual(res1.state.player.team[0].types, ['ice']);
  assert.equal(res1.state.player.team[0].proteanUsed, true);

  // Turno 2: Jogador troca Greninja por Delcatty
  const res2 = E.resolveTurn(res1.state, {
    player: { type: 'SWITCH', targetIndex: 1 },
    enemy: act(33)
  });

  // Greninja no banco deve ter sua tipagem original restaurada e proteanUsed resetado
  const benchedGreninja = res2.state.player.team[0];
  assert.deepEqual(benchedGreninja.types, ['water', 'dark'], 'Tipagem deve reverter para Water/Dark no banco');
  assert.equal(benchedGreninja.proteanUsed, false, 'proteanUsed deve ser resetado');

  // Turno 3: Jogador troca Delcatty de volta para Greninja
  const res3 = E.resolveTurn(res2.state, {
    player: { type: 'SWITCH', targetIndex: 0 },
    enemy: act(33)
  });

  assert.deepEqual(res3.state.player.team[0].types, ['water', 'dark']);
  assert.equal(res3.state.player.team[0].proteanUsed, false);

  // Turno 4: Greninja usa Dark Pulse -> Protean ativa novamente na nova entrada!
  const res4 = E.resolveTurn(res3.state, { player: act(399), enemy: act(33) });
  assert.deepEqual(res4.state.player.team[0].types, ['dark'], 'Greninja deve se tornar Dark na nova entrada');
  assert.equal(res4.state.player.team[0].proteanUsed, true);
});

/* ==========================================================================
   Section 7: AI Evaluator Parity & Purity
   ========================================================================== */

test('AI Evaluator: prevê STAB 1.5x para Protean sem mutar o Pokémon real', () => {
  const greninja = mon(658, [58], { ability: 'protean', types: ['water', 'dark'], proteanUsed: false });
  const target = mon(2, [33], { types: ['dragon', 'flying'] });

  const pred = V.evaluateMove(greninja, target, move(58), { attackerSide: 'player', planningTurn: true });

  // A previsão deve considerar STAB de 1.5x porque Protean vai mudar para Ice
  assert.equal(pred.stabMultiplier, 1.5);

  // O combatente original NÃO deve ter sido modificado
  assert.deepEqual(greninja.types, ['water', 'dark'], 'Tipos originais não devem sofrer mutação');
  assert.equal(greninja.proteanUsed, false, 'proteanUsed não deve ser consumido na simulação');
});

test('AI Evaluator: reconhece proteanUsed já ativo e não prevê STAB em golpes de outro tipo', () => {
  const greninja = mon(658, [399], { ability: 'protean', types: ['ice'], proteanUsed: true });
  const target = mon(2, [33], { types: ['normal'] });

  const pred = V.evaluateMove(greninja, target, move(399), { attackerSide: 'player', planningTurn: true }); // Dark pulse

  assert.equal(pred.stabMultiplier, 1, 'Sem STAB pois já usou Protean e é do tipo Ice');
});

/* ==========================================================================
   Section 8: Mold Breaker & Safety
   ========================================================================== */

test('Mold Breaker: atacante com Mold Breaker NÃO ignora Color Change do defensor', () => {
  const s = battle({ speed: 50, types: ['normal'], ability: 'color-change' }, { speed: 200, ability: 'mold-breaker', types: ['fire'] }, [33], [53]);
  const res = E.resolveTurn(s, { player: act(33), enemy: act(53) });

  assert.deepEqual(res.state.player.types, ['fire'], 'Mold Breaker não quebra Color Change');
});

test('Mold Breaker: defensor com Mold Breaker NÃO impede Protean do atacante', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { ability: 'mold-breaker', types: ['normal'] }, [58]);
  const res = turn(s, 58);

  assert.deepEqual(res.state.player.types, ['ice'], 'Mold Breaker do defensor não impede Protean do atacante');
});

/* ==========================================================================
   Section 9: Doubles Battle
   ========================================================================== */

test('Doubles: Protean e Color Change funcionam de forma independente por combatente', () => {
  const p1 = mon(1, [58], { speed: 300, ability: 'protean', types: ['water', 'dark'] });
  const p2 = mon(2, [33], { speed: 200, types: ['normal'] });
  const e1 = mon(3, [33], { speed: 100, ability: 'color-change', types: ['normal'] });
  const e2 = mon(4, [33], { speed: 50, types: ['normal'] });

  const s = E.createDoublesBattle([p1, p2], [e1, e2]);

  // Turno 1: p1 usa Ice Beam no e1
  const res = E.resolveDoublesTurn(s, {
    player: {
      0: { type: 'MOVE', moveId: 58, targetRole: 'enemy', targetSlot: 0, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 },
      1: { type: 'MOVE', moveId: 33, targetRole: 'enemy', targetSlot: 1, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 }
    },
    enemy: {
      0: { type: 'MOVE', moveId: 33, targetRole: 'player', targetSlot: 0, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 },
      1: { type: 'MOVE', moveId: 33, targetRole: 'player', targetSlot: 0, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 }
    }
  });

  const pActive = res.state.player.team[0];
  const eActive = res.state.enemy.team[0];

  assert.deepEqual(pActive.types, ['ice'], 'p1 com Protean deve se tornar Ice');
  assert.deepEqual(eActive.types, ['ice'], 'e1 com Color Change deve se tornar Ice após ser atingido por Ice Beam');
});

/* ==========================================================================
   Section 10: Status Preventions & Dynamic Move Types (Complementary Audit)
   ========================================================================== */

test('Protean: paralisia com imobilização (roll <= 25) impede a ativação e preserva proteanUsed', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'], statusCondition: 'paralysis' }, { types: ['normal'] }, [58]);
  // statusRoll: 10 resulta em paralisia total (imobilização)
  const res = turn(s, 58, { statusRoll: 10 });

  assert.deepEqual(res.state.player.types, ['water', 'dark'], 'Não deve mudar de tipo em paralisia total');
  assert.equal(res.state.player.proteanUsed, false, 'proteanUsed não deve ser consumido');
  const parEvt = res.events.find(e => e.type === 'STATUS_IMMOBILIZED' && e.statusCondition === 'paralysis');
  assert.ok(parEvt);
});

test('Protean: flinch impede a execução e preserva proteanUsed', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { types: ['normal'] }, [58]);
  s.player.isFlinched = true;
  const res = turn(s, 58);

  assert.deepEqual(res.state.player.types, ['water', 'dark'], 'Não deve mudar de tipo sob flinch');
  assert.equal(res.state.player.proteanUsed, false);
  const flinchEvt = res.events.find(e => e.type === 'FLINCH_IMMOBILIZED');
  assert.ok(flinchEvt);
});

test('Protean: confusão com autoagressão impede a execução e preserva proteanUsed', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { types: ['normal'] }, [58]);
  s.player.confusionTurns = 2;
  // confusionHitRoll: 10 (<= 33) resulta em autoagressão
  const res = turn(s, 58, { confusionHitRoll: 10, confusionDamageRoll: 100 });

  assert.deepEqual(res.state.player.types, ['water', 'dark'], 'Não deve mudar de tipo ao se ferir na confusão');
  assert.equal(res.state.player.proteanUsed, false);
  const confEvt = res.events.find(e => e.type === 'CONFUSION_DAMAGE');
  assert.ok(confEvt);
});

test('Protean: Weather Ball sob sol intenso altera o tipo para Fire e ativa Protean', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { types: ['normal'] }, [311]);
  s.weather = { id: 'sun', turns: 5 };
  const res = turn(s, 311);

  assert.deepEqual(res.state.player.types, ['fire'], 'Deve mudar para Fire (tipo dinâmico do Weather Ball sob Sol)');
  assert.equal(res.state.player.proteanUsed, true);
});

test('Protean: Terrain Pulse sob terreno elétrico altera o tipo para Electric e ativa Protean', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { types: ['normal'] }, [805]);
  s.terrain = { id: 'electric', turns: 5 };
  const res = turn(s, 805);

  assert.deepEqual(res.state.player.types, ['electric'], 'Deve mudar para Electric (tipo dinâmico do Terrain Pulse no Terreno Elétrico)');
  assert.equal(res.state.player.proteanUsed, true);
});

/* ==========================================================================
   Section 11: Forced Switch & Bench Reset (Complementary Audit)
   ========================================================================== */

test('Protean: troca forçada por golpe adversário (Dragon Tail #525) restaura tipagem original de Greninja no banco e reseta proteanUsed', () => {
  const teamPlayer = [
    mon(658, [58], { name: 'greninja', ability: 'protean', types: ['water', 'dark'] }),
    mon(301, [33], { name: 'delcatty', types: ['normal'] }),
    mon(25, [33], { name: 'pikachu', types: ['electric'] })
  ];
  const teamEnemy = [
    mon(2, [525], { speed: 50, types: ['dragon'] }),
    mon(3, [33], { types: ['normal'] }),
    mon(4, [33], { types: ['normal'] })
  ];
  const s = E.createTeamBattle(teamPlayer, teamEnemy);

  // Turno 1: Greninja usa Ice Beam (vira Ice). Inimigo usa Dragon Tail (força troca para Delcatty)
  const res = E.resolveTurn(s, {
    player: act(58),
    enemy: act(525)
  });

  assert.equal(res.state.player.activeIndex, 1, 'Delcatty deve ter entrado em campo');
  const benchedGreninja = res.state.player.team[0];
  assert.deepEqual(benchedGreninja.types, ['water', 'dark'], 'Greninja no banco deve ter sua tipagem original restaurada');
  assert.equal(benchedGreninja.proteanUsed, false, 'proteanUsed de Greninja deve ser resetado');
});

/* ==========================================================================
   Section 12: Doubles Friendly Fire (Complementary Audit)
   ========================================================================== */

test('Color Change: fogo amigo em duplas (aliado atacando Kecleon com golpe Fire) ativa Color Change', () => {
  const p1 = mon(1, [53], { speed: 300, types: ['fire'] }); // aliado com Flamethrower
  const p2 = mon(2, [33], { speed: 100, ability: 'color-change', types: ['normal'] }); // Kecleon
  const e1 = mon(3, [33], { speed: 50 });
  const e2 = mon(4, [33], { speed: 50 });

  const s = E.createDoublesBattle([p1, p2], [e1, e2]);
  const res = E.resolveDoublesTurn(s, {
    player: {
      0: { type: 'MOVE', moveId: 53, targetRole: 'player', targetSlot: 1, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 },
      1: { type: 'MOVE', moveId: 33, targetRole: 'enemy', targetSlot: 0, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 }
    },
    enemy: {
      0: { type: 'MOVE', moveId: 33, targetRole: 'player', targetSlot: 0, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 },
      1: { type: 'MOVE', moveId: 33, targetRole: 'player', targetSlot: 0, accuracyRoll: 1, damageRoll: 100, criticalRoll: 24, secondaryEffectRoll: 100 }
    }
  });

  const kecleon = res.state.player.team[1];
  assert.deepEqual(kecleon.types, ['fire'], 'Kecleon deve virar Fire após sofrer dano de golpe Fire do próprio aliado');
  assert.equal(kecleon.typeChangedByAbility, 'color-change');
});

/* ==========================================================================
   Section 13: Presentation, AI Purity & Battle Lifecycle (Complementary Audit)
   ========================================================================== */

test('AI Evaluator: múltiplas avaliações sucessivas mantêm pureza total (sem mutação no atacante)', () => {
  const greninja = mon(658, [58], { ability: 'protean', types: ['water', 'dark'], proteanUsed: false });
  const target = mon(2, [33], { types: ['normal'] });

  for (let i = 0; i < 5; i++) {
    const pred = V.evaluateMove(greninja, target, move(58), { attackerSide: 'player', planningTurn: true });
    assert.equal(pred.stabMultiplier, 1.5);
  }

  assert.deepEqual(greninja.types, ['water', 'dark'], 'Combatente real não deve sofrer mutação após múltiplas avaliações');
  assert.equal(greninja.proteanUsed, false);
});

test('AI Evaluator: simetria perfeita entre jogador e adversário usando Protean', () => {
  const greninjaP = mon(658, [58], { ability: 'protean', types: ['water', 'dark'] });
  const greninjaE = mon(658, [58], { ability: 'protean', types: ['water', 'dark'] });
  const dummy = mon(2, [33], { types: ['normal'] });

  const predP = V.evaluateMove(greninjaP, dummy, move(58), { attackerSide: 'player', planningTurn: true });
  const predE = V.evaluateMove(greninjaE, dummy, move(58), { attackerSide: 'enemy', planningTurn: true });

  assert.equal(predP.stabMultiplier, predE.stabMultiplier);
  assert.equal(predP.expectedDamage, predE.expectedDamage);
  assert.equal(predP.baseDamage, predE.baseDamage);
});

test('Presentation & UI: mapper gera comandos MOVE_FAIL_FEEDBACK com textos canônicos para Protean e Color Change', () => {
  const messages = [];
  const adapter = new BattleUiDomAdapter({
    view: {
      displayMessage: msg => messages.push(msg)
    }
  });

  const events = [
    { type: 'MOVE_PREPARED', actor: 'player', pokemonName: 'Greninja', reason: 'P7_ABILITY', label: 'protean' },
    { type: 'MOVE_PREPARED', actor: 'player', pokemonName: 'Greninja', reason: 'TYPE_CHANGED', label: 'ice' },
    { type: 'MOVE_PREPARED', actor: 'enemy', pokemonName: 'Kecleon', reason: 'P7_ABILITY', label: 'color-change' },
    { type: 'MOVE_PREPARED', actor: 'enemy', pokemonName: 'Kecleon', reason: 'TYPE_CHANGED', label: 'fire' }
  ];

  const commands = Mapper.mapEvents(events);
  for (const cmd of commands) {
    adapter.execute(cmd);
  }

  assert.deepEqual(messages, [
    'Greninja: Protean alterou o seu tipo!',
    'Greninja: Mudou para o tipo ice.',
    'Kecleon: Color Change alterou o seu tipo!',
    'Kecleon: Mudou para o tipo fire.'
  ]);
});

test('Battle Lifecycle: término da batalha restaura combatente original e remove flags voláteis de Protean', () => {
  const s = battle({ ability: 'protean', types: ['water', 'dark'] }, { currentHp: 10, types: ['normal'] }, [58]);
  const res = turn(s, 58);

  assert.equal(res.state.status, 'PLAYER_WIN', 'Batalha deve ter sido vencida pelo jogador');
  assert.deepEqual(res.state.player.types, ['water', 'dark'], 'Tipagem original deve ser restaurada no fim da batalha');
  assert.equal(res.state.player.proteanUsed, undefined, 'proteanUsed deve ser deletado');
  assert.equal(res.state.player.typeChangedByAbility, undefined, 'typeChangedByAbility deve ser deletado');
});
