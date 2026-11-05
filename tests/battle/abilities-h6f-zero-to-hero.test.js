const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const Special = require('../../assets/js/battle/p8-special');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const palafin = (extra = {}) => ({
  id: 964,
  name: 'palafin',
  types: ['water'],
  level: 50,
  hp: 175,
  maxHp: 175,
  currentHp: 175,
  attack: 90,
  defense: 92,
  specialAttack: 73,
  specialDefense: 82,
  speed: 120,
  weightKg: 60.2,
  ability: 'zero-to-hero',
  baseStats: { hp: 100, attack: 70, defense: 72, specialAttack: 53, specialDefense: 62, speed: 100 },
  moves: [33, 812, 53, 14].map(id => move(id)), // Tackle, Flip Turn (#812), Flamethrower, Swords Dance
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/964.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/964.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/964.ogg',
  ...extra
});

const dummy = (id = 2, extra = {}) => ({
  id,
  name: 'dummy-' + id,
  types: ['normal'],
  level: 50,
  hp: 1000,
  maxHp: 1000,
  currentHp: 1000,
  attack: 100,
  defense: 100,
  specialAttack: 100,
  specialDefense: 100,
  speed: 10,
  ability: 'overgrow',
  moves: [33, 53, 85, 14].map(id => move(id)),
  ...extra
});

const team = (m1, m2 = dummy(98), m3 = dummy(99)) => [m1, m2, m3];

const act = (id, extra = {}) => ({
  type: 'MOVE',
  moveId: id,
  accuracyRoll: 1,
  damageRoll: 100,
  criticalRoll: 24,
  secondaryEffectRoll: 100,
  ...extra
});

const turn = (s, moveId, extra = {}, enemyAct = act(14)) =>
  E.resolveTurn(s, { player: act(moveId, extra), enemy: enemyAct });

// ============================================================================
// H6-F ZERO TO HERO SUITE
// ============================================================================

test('H6-F Zero to Hero Registry: zero-to-hero está registrada com status FULL e metadados canônicos', () => {
  const entry = Reg.getAbility('zero-to-hero');
  assert.ok(entry, 'zero-to-hero deve estar registrada no AbilityRegistry');
  assert.equal(entry.status, 'FULL');
  assert.equal(entry.phase, 'H6');
  assert.equal(entry.generation, 9);
  assert.equal(entry.suppressible, false);
  assert.equal(entry.copyable, false);
});

test('H6-F Zero to Hero: Palafin entra em campo na Zero Form (#964)', () => {
  const s = E.createTeamBattle(team(palafin()), team(dummy(2), dummy(3), dummy(4)));
  const c = s.player.team[0];
  assert.equal(c.formSpeciesId, null);
  assert.equal(c.zeroToHeroTransformed, false);
  assert.equal(c.baseStats.attack, 70);
  assert.equal(c.baseStats.defense, 72);
  assert.equal(c.baseStats.specialAttack, 53);
  assert.equal(c.baseStats.specialDefense, 62);
  assert.equal(c.baseStats.speed, 100);
});

test('H6-F Zero to Hero: Receber dano ou atacar não transforma Palafin em Zero Form', () => {
  const s = E.createTeamBattle(team(palafin()), team(dummy(2), dummy(3), dummy(4)));
  const r = turn(s, 33, {}, act(33)); // Ambos atacam
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, null);
  assert.equal(c.zeroToHeroTransformed, false);
});

test('H6-F Zero to Hero: Troca voluntária transforma Palafin em Hero Form (#10256)', () => {
  const s = E.createTeamBattle(
    team(palafin(), dummy(50, { name: 'reserve' }), dummy(99)),
    team(dummy(2), dummy(3), dummy(4))
  );
  // Troca para o reserva
  const r = E.resolveTurn(s, { player: { type: 'SWITCH', targetPokemonId: 50 }, enemy: act(14) });
  const p = r.state.player.team.find(m => m.id === 964);
  assert.equal(p.zeroToHeroTransformed, true);
  assert.equal(p.formSpeciesId, 10256);
  assert.equal(p.baseStats.attack, 160);
  assert.equal(p.baseStats.defense, 97);
  assert.equal(p.baseStats.specialAttack, 106);
  assert.equal(p.baseStats.specialDefense, 87);
  assert.equal(p.baseStats.speed, 100);
  assert.ok(r.events.some(e => e.reason === 'FORM_CHANGED' && e.label === 'palafin-hero'));
});

test('H6-F Zero to Hero: Reentrada ativa Hero Form e anuncia habilidade em campo', () => {
  const s = E.createTeamBattle(
    team(palafin(), dummy(50, { name: 'reserve' }), dummy(99)),
    team(dummy(2), dummy(3), dummy(4))
  );
  // Troca para reserva
  let r = E.resolveTurn(s, { player: { type: 'SWITCH', targetPokemonId: 50 }, enemy: act(14) });

  // Reentrada de Palafin
  r = E.resolveTurn(r.state, { player: { type: 'SWITCH', targetPokemonId: 964 }, enemy: act(14) });
  const c = r.state.player.team[0];
  assert.equal(c.id, 964);
  assert.equal(c.formSpeciesId, 10256);
  assert.equal(c.zeroToHeroTransformed, true);
  assert.equal(c.baseStats.attack, 160);
  assert.ok(r.events.some(e => e.reason === 'P7_ABILITY' && e.label === 'zero-to-hero'));
});

test('H6-F Zero to Hero: Pivot Move (Flip Turn #812) ativa a transformação ao sair de campo', () => {
  const s = E.createTeamBattle(
    team(palafin(), dummy(50, { name: 'reserve' }), dummy(99)),
    team(dummy(2), dummy(3), dummy(4))
  );
  // Palafin usa Flip Turn (#812)
  const r = turn(s, 812);
  assert.ok(r.state.pendingPivot, 'Flip Turn deve gerar pendência de pivot');

  // Resolve substituição de pivot via resolveReplacement
  const rPivot = E.resolveReplacement(r.state, { player: { targetPokemonId: 50 } });
  const p = rPivot.state.player.team.find(m => m.id === 964);
  assert.equal(p.zeroToHeroTransformed, true);
  assert.equal(p.formSpeciesId, 10256);
  assert.equal(p.baseStats.attack, 160);
});

test('H6-F Zero to Hero: Palafin nocauteado antes de trocar NÃO ativa Zero to Hero', () => {
  const s = E.createTeamBattle(
    team(palafin({ hp: 1, currentHp: 1, maxHp: 175 }), dummy(50, { name: 'reserve' }), dummy(99)),
    team(dummy(2), dummy(3), dummy(4))
  );
  // Dummy ataca e nocauteia Palafin
  const r = turn(s, 33, {}, act(33));
  const p = r.state.player.team.find(m => m.id === 964);
  assert.equal(p.currentHp, 0);
  assert.equal(p.zeroToHeroTransformed, false);
  assert.equal(p.formSpeciesId, null);
});

test('H6-F Zero to Hero: Trocas subsequentes mantêm Hero Form', () => {
  const s = E.createTeamBattle(
    team(palafin(), dummy(50, { name: 'reserve' }), dummy(99)),
    team(dummy(2), dummy(3), dummy(4))
  );
  // Switch 1: Palafin -> Reserve
  let r = E.resolveTurn(s, { player: { type: 'SWITCH', targetPokemonId: 50 }, enemy: act(14) });
  // Switch 2: Reserve -> Palafin (Hero)
  r = E.resolveTurn(r.state, { player: { type: 'SWITCH', targetPokemonId: 964 }, enemy: act(14) });
  // Switch 3: Palafin (Hero) -> Reserve
  r = E.resolveTurn(r.state, { player: { type: 'SWITCH', targetPokemonId: 50 }, enemy: act(14) });
  // Switch 4: Reserve -> Palafin (Hero)
  r = E.resolveTurn(r.state, { player: { type: 'SWITCH', targetPokemonId: 964 }, enemy: act(14) });

  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, 10256);
  assert.equal(c.zeroToHeroTransformed, true);
  assert.equal(c.baseStats.attack, 160);
});

test('H6-F Zero to Hero: Zero to Hero não pode ser suprimido (insuppressible Gen IX)', () => {
  const s = E.createTeamBattle(
    team(palafin(), dummy(50, { name: 'reserve' }), dummy(99)),
    team(dummy(2), dummy(3), dummy(4))
  );
  s.player.team[0].abilitySuppressed = true; // Simula tentativa de Gastro Acid
  const r = E.resolveTurn(s, { player: { type: 'SWITCH', targetPokemonId: 50 }, enemy: act(14) });
  const p = r.state.player.team.find(m => m.id === 964);
  assert.equal(p.zeroToHeroTransformed, true);
  assert.equal(p.formSpeciesId, 10256);
});

test('H6-F Zero to Hero: Palafin Terastallizado transforma em Hero Form e mantém tipo Tera', () => {
  const s = E.createTeamBattle(
    team(palafin({ specialMechanic: 'tera', teraType: 'fighting' }), dummy(50, { name: 'reserve' }), dummy(99)),
    team(dummy(2), dummy(3), dummy(4))
  );
  // Turno 1: Terastalliza
  let r = E.resolveTurn(s, { player: act(33, { special: 'tera' }), enemy: act(14) });
  assert.equal(r.state.player.team[0].tera, 'fighting');

  // Turno 2: Troca para reserva -> ativa Hero Form
  r = E.resolveTurn(r.state, { player: { type: 'SWITCH', targetPokemonId: 50 }, enemy: act(14) });
  const p = r.state.player.team.find(m => m.id === 964);
  assert.equal(p.zeroToHeroTransformed, true);
  assert.equal(p.formSpeciesId, 10256);

  // Turno 3: Reentrada
  r = E.resolveTurn(r.state, { player: { type: 'SWITCH', targetPokemonId: 964 }, enemy: act(14) });
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, 10256);
  assert.equal(c.tera, 'fighting');
  assert.deepEqual(c.types, ['fighting']);
  assert.equal(c.baseStats.attack, 160);
});

test('H6-F Zero to Hero: Nova batalha inicia com Palafin limpo na Zero Form', () => {
  const raw = palafin();
  const s1 = E.createTeamBattle(team(raw, dummy(50, { name: 'reserve' }), dummy(99)), team(dummy(2), dummy(3), dummy(4)));
  E.resolveTurn(s1, { player: { type: 'SWITCH', targetPokemonId: 50 }, enemy: act(14) });

  // Iniciar uma segunda batalha independente com o mesmo raw inicial
  const s2 = E.createTeamBattle(team(raw, dummy(50, { name: 'reserve' }), dummy(99)), team(dummy(2), dummy(3), dummy(4)));
  const c = s2.player.team[0];
  assert.equal(c.formSpeciesId, null);
  assert.equal(c.zeroToHeroTransformed, false);
  assert.equal(c.baseStats.attack, 70);
});

test('H6-F Zero to Hero: Espécie não-Palafin com Zero to Hero injetado não muda de forma', () => {
  const s = E.createTeamBattle(
    team(dummy(10, { ability: 'zero-to-hero' })),
    team(dummy(2), dummy(3), dummy(4))
  );
  const r = turn(s, 33);
  assert.equal(r.state.player.team[0].zeroToHeroTransformed, false);
  assert.equal(r.state.player.team[0].formSpeciesId, null);
});

test('H6-F Zero to Hero: Ditto transformado em Palafin não ativa Hero Form ao trocar', () => {
  const ditto = {
    id: 132,
    name: 'ditto',
    types: ['normal'],
    level: 50,
    hp: 120,
    maxHp: 120,
    currentHp: 120,
    attack: 68,
    defense: 68,
    specialAttack: 68,
    specialDefense: 68,
    speed: 68,
    weightKg: 4.0,
    ability: 'limber',
    moves: [144].map(id => move(id)) // Transform
  };
  const s = E.createTeamBattle(
    team(ditto, dummy(50, { name: 'reserve' }), dummy(99)),
    team(palafin(), dummy(3), dummy(4))
  );
  // Turno 1: Ditto usa Transform no Palafin
  let r = turn(s, 144);
  assert.ok(r.state.player.team[0].transformOriginal, 'Ditto deve estar transformado');

  // Turno 2: Ditto troca para reserva -> não deve ativar Zero to Hero
  r = E.resolveTurn(r.state, { player: { type: 'SWITCH', targetPokemonId: 50 }, enemy: act(14) });
  const p = r.state.player.team.find(m => m.id === 132);
  assert.equal(p.zeroToHeroTransformed, false);
  assert.equal(p.formSpeciesId, null);
});
