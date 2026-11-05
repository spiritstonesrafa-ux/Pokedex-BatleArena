const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const Special = require('../../assets/js/battle/p8-special');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const castform = (extra = {}) => ({
  id: 351,
  name: 'castform',
  types: ['normal'],
  level: 50,
  hp: 145,
  maxHp: 145,
  currentHp: 145,
  attack: 85,
  defense: 85,
  specialAttack: 85,
  specialDefense: 85,
  speed: 85,
  weightKg: 0.8,
  ability: 'forecast',
  baseStats: { hp: 70, attack: 70, defense: 70, specialAttack: 70, specialDefense: 70, speed: 70 },
  moves: [240, 241, 883, 33].map(id => move(id)), // Rain Dance, Sunny Day, Snowscape, Tackle
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/351.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/351.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/351.ogg',
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

const turn = (s, moveId, extra = {}, enemyAct = act(33)) =>
  E.resolveTurn(s, { player: act(moveId, extra), enemy: enemyAct });

// ============================================================================
// H6-F FORECAST SUITE
// ============================================================================

test('H6-F Forecast Registry: forecast está registrada com status FULL e metadados canônicos', () => {
  const entry = Reg.getAbility('forecast');
  assert.ok(entry, 'forecast deve estar registrada no AbilityRegistry');
  assert.equal(entry.status, 'FULL');
  assert.equal(entry.phase, 'H6');
  assert.equal(entry.generation, 3);
  assert.equal(entry.suppressible, true);
  assert.equal(entry.copyable, false);
});

test('H6-F Forecast: Castform inicia como Normal em clima neutro', () => {
  const s = E.createTeamBattle(team(castform()), team(dummy(2), dummy(3), dummy(4)));
  const c = s.player.team[0];
  assert.equal(c.formSpeciesId, null);
  assert.deepEqual(c.types, ['normal']);
});

test('H6-F Forecast: Sunny Day transforma Castform em Sunny Form (#10013, Fire)', () => {
  const s = E.createTeamBattle(team(castform()), team(dummy(2), dummy(3), dummy(4)));
  const r = turn(s, 241); // Sunny Day
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, 10013);
  assert.deepEqual(c.types, ['fire']);
  assert.ok(r.events.some(e => e.reason === 'FORM_CHANGED' && e.label === 'castform-sunny'));
});

test('H6-F Forecast: Rain Dance transforma Castform em Rainy Form (#10014, Water)', () => {
  const s = E.createTeamBattle(team(castform()), team(dummy(2), dummy(3), dummy(4)));
  const r = turn(s, 240); // Rain Dance
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, 10014);
  assert.deepEqual(c.types, ['water']);
  assert.ok(r.events.some(e => e.reason === 'FORM_CHANGED' && e.label === 'castform-rainy'));
});

test('H6-F Forecast: Snowscape transforma Castform em Snowy Form (#10015, Ice)', () => {
  const s = E.createTeamBattle(team(castform()), team(dummy(2), dummy(3), dummy(4)));
  const r = turn(s, 883); // Snowscape
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, 10015);
  assert.deepEqual(c.types, ['ice']);
  assert.ok(r.events.some(e => e.reason === 'FORM_CHANGED' && e.label === 'castform-snowy'));
});

test('H6-F Forecast: Sandstorm não transforma Castform (permanece Normal #351)', () => {
  const s = E.createTeamBattle(team(castform({ moves: [201].map(id => move(id)) })), team(dummy(2), dummy(3), dummy(4)));
  const r = turn(s, 201); // Sandstorm
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, null);
  assert.deepEqual(c.types, ['normal']);
});

test('H6-F Forecast: Transição direta entre climas (Rain -> Sun)', () => {
  const s = E.createTeamBattle(team(castform()), team(dummy(2), dummy(3), dummy(4)));
  let r = turn(s, 240); // Rain
  assert.equal(r.state.player.team[0].formSpeciesId, 10014);
  assert.deepEqual(r.state.player.team[0].types, ['water']);

  r = turn(r.state, 241); // Sun
  assert.equal(r.state.player.team[0].formSpeciesId, 10013);
  assert.deepEqual(r.state.player.team[0].types, ['fire']);
});

test('H6-F Forecast: Expiração do clima reverte Castform à forma Normal (#351)', () => {
  const s = E.createTeamBattle(team(castform()), team(dummy(2), dummy(3), dummy(4)));
  let r = turn(s, 241); // Sun (turns: 5)
  assert.equal(r.state.player.team[0].formSpeciesId, 10013);

  // Reduzir turnos do clima para 1
  r.state.weather.turns = 1;
  r = turn(r.state, 33); // Fim de turno expira clima
  assert.equal(r.state.weather, null);
  assert.equal(r.state.player.team[0].formSpeciesId, null);
  assert.deepEqual(r.state.player.team[0].types, ['normal']);
});

test('H6-F Forecast: Cloud Nine anula o efeito climático e reverte Castform a Normal', () => {
  const s = E.createTeamBattle(
    team(castform()),
    team(dummy(2, { ability: 'cloud-nine' }), dummy(3), dummy(4))
  );
  let r = turn(s, 241); // Sunny Day
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, null);
  assert.deepEqual(c.types, ['normal']);
});

test('H6-F Forecast: Supressão da habilidade (Gastro Acid / abilitySuppressed) reverte Castform a Normal', () => {
  const s = E.createTeamBattle(team(castform()), team(dummy(2), dummy(3), dummy(4)));
  let r = turn(s, 241); // Sunny Day -> Sunny Form
  assert.equal(r.state.player.team[0].formSpeciesId, 10013);

  // Suprimir habilidade
  r.state.player.team[0].abilitySuppressed = true;
  Special.updateFieldAbilities(r.state, C, []);
  assert.equal(r.state.player.team[0].formSpeciesId, null);
  assert.deepEqual(r.state.player.team[0].types, ['normal']);
});

test('H6-F Forecast: Castform Terastallizado altera forma mas mantém tipagem Tera ativa', () => {
  const s = E.createTeamBattle(
    team(castform({ specialMechanic: 'tera', teraType: 'ghost' })),
    team(dummy(2), dummy(3), dummy(4))
  );
  const r = E.resolveTurn(s, { player: act(241, { special: 'tera' }), enemy: act(33) });
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, 10013);
  assert.equal(c.tera, 'ghost');
  assert.deepEqual(c.types, ['ghost']);
});

test('H6-F Forecast: Troca para reserva e reentrada restaura forma correta', () => {
  const s = E.createTeamBattle(
    team(castform(), dummy(50, { name: 'reserve' }), dummy(99)),
    team(dummy(2), dummy(3), dummy(4))
  );
  let r = turn(s, 240); // Rain -> Rainy Form
  assert.equal(r.state.player.team[0].formSpeciesId, 10014);

  // Troca para reserva
  r = E.resolveTurn(r.state, { player: { type: 'SWITCH', targetPokemonId: 50 }, enemy: act(33) });
  assert.equal(r.state.player.team[0].formSpeciesId, null);

  // Reentrada de Castform com chuva ainda ativa
  r = E.resolveTurn(r.state, { player: { type: 'SWITCH', targetPokemonId: 351 }, enemy: act(33) });
  assert.equal(r.state.player.team[0].formSpeciesId, 10014);
  assert.deepEqual(r.state.player.team[0].types, ['water']);
});

test('H6-F Forecast: Espécie não-Castform com Forecast injetado não muda de forma', () => {
  const s = E.createTeamBattle(team(dummy(10, { ability: 'forecast', moves: [241, 33].map(id => move(id)) })), team(dummy(2), dummy(3), dummy(4)));
  const r = turn(s, 241);
  assert.equal(r.state.player.team[0].formSpeciesId, null);
});

test('H6-F Forecast Doubles: Castform em duplas reage ao clima de campo', () => {
  const pTeam = [castform(), dummy(51)];
  const eTeam = [dummy(53), dummy(54)];
  const s = E.createDoublesBattle(pTeam, eTeam);
  
  const r = E.resolveDoublesTurn(s, {
    player: { 0: act(240), 1: act(33) },
    enemy: { 0: act(33), 1: act(33) }
  });
  assert.equal(r.state.player.team[0].formSpeciesId, 10014);
  assert.deepEqual(r.state.player.team[0].types, ['water']);
});
