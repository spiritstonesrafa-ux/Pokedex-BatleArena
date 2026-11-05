const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const Special = require('../../assets/js/battle/p8-special');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const stunfiskGalar = (extra = {}) => ({
  id: 10180,
  name: 'stunfisk-galar',
  types: ['ground', 'steel'],
  level: 50,
  hp: 185,
  maxHp: 185,
  currentHp: 185,
  attack: 101,
  defense: 119,
  specialAttack: 86,
  specialDefense: 104,
  speed: 52,
  weightKg: 20.5,
  ability: 'mimicry',
  baseStats: { hp: 109, attack: 81, defense: 99, specialAttack: 66, specialDefense: 84, speed: 32 },
  moves: [604, 580, 581, 678].map(id => move(id)), // Electric, Grassy, Misty, Psychic Terrain
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10180.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10180.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/10180.ogg',
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
// H6-F MIMICRY SUITE
// ============================================================================

test('H6-F Mimicry Registry: mimicry está registrada com status FULL e metadados canônicos', () => {
  const entry = Reg.getAbility('mimicry');
  assert.ok(entry, 'mimicry deve estar registrada no AbilityRegistry');
  assert.equal(entry.status, 'FULL');
  assert.equal(entry.phase, 'H6');
  assert.equal(entry.generation, 8);
  assert.equal(entry.suppressible, true);
  assert.equal(entry.copyable, true);
});

test('H6-F Mimicry: Galarian Stunfisk inicia como Ground/Steel sem terreno em campo', () => {
  const s = E.createTeamBattle(team(stunfiskGalar()), team(dummy(2), dummy(3), dummy(4)));
  const c = s.player.team[0];
  assert.deepEqual(c.types, ['ground', 'steel']);
});

test('H6-F Mimicry: Electric Terrain (#604) altera o tipo para Electric', () => {
  const s = E.createTeamBattle(team(stunfiskGalar()), team(dummy(2), dummy(3), dummy(4)));
  const r = turn(s, 604);
  const c = r.state.player.team[0];
  assert.deepEqual(c.types, ['electric']);
  assert.ok(r.events.some(e => e.reason === 'TYPE_CHANGED' && e.label === 'electric'));
});

test('H6-F Mimicry: Grassy Terrain (#580) altera o tipo para Grass', () => {
  const s = E.createTeamBattle(team(stunfiskGalar()), team(dummy(2), dummy(3), dummy(4)));
  const r = turn(s, 580);
  const c = r.state.player.team[0];
  assert.deepEqual(c.types, ['grass']);
  assert.ok(r.events.some(e => e.reason === 'TYPE_CHANGED' && e.label === 'grass'));
});

test('H6-F Mimicry: Misty Terrain (#581) altera o tipo para Fairy', () => {
  const s = E.createTeamBattle(team(stunfiskGalar()), team(dummy(2), dummy(3), dummy(4)));
  const r = turn(s, 581);
  const c = r.state.player.team[0];
  assert.deepEqual(c.types, ['fairy']);
  assert.ok(r.events.some(e => e.reason === 'TYPE_CHANGED' && e.label === 'fairy'));
});

test('H6-F Mimicry: Psychic Terrain (#678) altera o tipo para Psychic', () => {
  const s = E.createTeamBattle(team(stunfiskGalar()), team(dummy(2), dummy(3), dummy(4)));
  const r = turn(s, 678);
  const c = r.state.player.team[0];
  assert.deepEqual(c.types, ['psychic']);
  assert.ok(r.events.some(e => e.reason === 'TYPE_CHANGED' && e.label === 'psychic'));
});

test('H6-F Mimicry: Transição direta de terreno (Electric -> Grassy)', () => {
  const s = E.createTeamBattle(team(stunfiskGalar()), team(dummy(2), dummy(3), dummy(4)));
  let r = turn(s, 604); // Electric
  assert.deepEqual(r.state.player.team[0].types, ['electric']);

  r = turn(r.state, 580); // Grassy
  assert.deepEqual(r.state.player.team[0].types, ['grass']);
});

test('H6-F Mimicry: Expiração do terreno reverte tipo para Ground/Steel original', () => {
  const s = E.createTeamBattle(team(stunfiskGalar({ moves: [604, 33].map(id => move(id)) })), team(dummy(2), dummy(3), dummy(4)));
  let r = turn(s, 604); // Electric
  assert.deepEqual(r.state.player.team[0].types, ['electric']);

  r.state.terrain.turns = 1;
  r = turn(r.state, 33); // Fim de turno expira terreno
  assert.equal(r.state.terrain, null);
  assert.deepEqual(r.state.player.team[0].types, ['ground', 'steel']);
});

test('H6-F Mimicry: Ice Spinner (#861) destrói terreno e reverte tipo para Ground/Steel', () => {
  const foeMoves = [861, 14].map(id => move(id));
  const s = E.createTeamBattle(
    team(stunfiskGalar()),
    team(dummy(2, { moves: foeMoves }), dummy(3), dummy(4))
  );
  let r = turn(s, 604); // Electric
  assert.deepEqual(r.state.player.team[0].types, ['electric']);

  // Oponente usa Ice Spinner (#861)
  r = E.resolveTurn(r.state, { player: act(604), enemy: act(861) });
  assert.equal(r.state.terrain, null);
  assert.deepEqual(r.state.player.team[0].types, ['ground', 'steel']);
});

test('H6-F Mimicry: Defog (#432) limpa terreno e reverte tipo para Ground/Steel', () => {
  const foeMoves = [432, 14].map(id => move(id));
  const s = E.createTeamBattle(
    team(stunfiskGalar()),
    team(dummy(2, { moves: foeMoves }), dummy(3), dummy(4))
  );
  let r = turn(s, 604); // Electric
  assert.deepEqual(r.state.player.team[0].types, ['electric']);

  // Oponente usa Defog (#432)
  r = E.resolveTurn(r.state, { player: act(604), enemy: act(432) });
  assert.equal(r.state.terrain, null);
  assert.deepEqual(r.state.player.team[0].types, ['ground', 'steel']);
});

test('H6-F Mimicry: Troca para reserva e reentrada em campo com terreno ativo', () => {
  const s = E.createTeamBattle(
    team(stunfiskGalar(), dummy(50, { name: 'reserve' }), dummy(99)),
    team(dummy(2), dummy(3), dummy(4))
  );
  let r = turn(s, 604); // Electric
  assert.deepEqual(r.state.player.team[0].types, ['electric']);

  // Troca para reserva
  r = E.resolveTurn(r.state, { player: { type: 'SWITCH', targetPokemonId: 50 }, enemy: act(14) });
  assert.deepEqual(r.state.player.team[0].types, ['ground', 'steel']);

  // Reentrada de Stunfisk com Terreno Elétrico ainda ativo
  r = E.resolveTurn(r.state, { player: { type: 'SWITCH', targetPokemonId: 10180 }, enemy: act(14) });
  assert.deepEqual(r.state.player.team[0].types, ['electric']);
});

test('H6-F Mimicry: Supressão da habilidade (Gastro Acid / abilitySuppressed) reverte tipagem', () => {
  const s = E.createTeamBattle(team(stunfiskGalar()), team(dummy(2), dummy(3), dummy(4)));
  let r = turn(s, 604); // Electric
  assert.deepEqual(r.state.player.team[0].types, ['electric']);

  // Suprimir Mimicry
  r.state.player.team[0].abilitySuppressed = true;
  Special.updateFieldAbilities(r.state, C, []);
  assert.deepEqual(r.state.player.team[0].types, ['ground', 'steel']);
});

test('H6-F Mimicry: Stunfisk Terastallizado mantém tipo Tera e ignora Mimicry', () => {
  const s = E.createTeamBattle(
    team(stunfiskGalar({ specialMechanic: 'tera', teraType: 'ghost' })),
    team(dummy(2), dummy(3), dummy(4))
  );
  const r = E.resolveTurn(s, { player: act(604, { special: 'tera' }), enemy: act(14) });
  const c = r.state.player.team[0];
  assert.equal(c.tera, 'ghost');
  assert.deepEqual(c.types, ['ghost']);
});

test('H6-F Mimicry Doubles: Stunfisk em duplas reage ao terreno', () => {
  const pTeam = [stunfiskGalar(), dummy(51)];
  const eTeam = [dummy(53), dummy(54)];
  const s = E.createDoublesBattle(pTeam, eTeam);
  
  const r = E.resolveDoublesTurn(s, {
    player: { 0: act(604), 1: act(14) },
    enemy: { 0: act(14), 1: act(14) }
  });
  assert.deepEqual(r.state.player.team[0].types, ['electric']);
});

