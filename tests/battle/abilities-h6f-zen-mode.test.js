const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../../assets/js/battle/battle-engine');
const C = require('../../assets/js/battle/battle-constants');
const Reg = require('../../assets/js/battle/ability-registry');
const Special = require('../../assets/js/battle/p8-special');

const move = id => C.KNOWN_CATALOG_MOVES[id] || Object.values(C.SUPPORTED_STATUS_MOVES).find(m => m.id === id);

const darmanitan = (extra = {}) => ({
  id: 555,
  name: 'darmanitan',
  types: ['fire'],
  level: 50,
  hp: 180,
  maxHp: 180,
  currentHp: 180,
  attack: 160,
  defense: 75,
  specialAttack: 50,
  specialDefense: 75,
  speed: 115,
  weightKg: 92.9,
  ability: 'zen-mode',
  baseStats: { hp: 105, attack: 140, defense: 55, specialAttack: 30, specialDefense: 55, speed: 95 },
  moves: [33, 53, 241, 14].map(id => move(id)), // Tackle, Flamethrower, Sunny Day, Swords Dance
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/555.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/555.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/555.ogg',
  ...extra
});

const darmanitanGalar = (extra = {}) => ({
  id: 10177,
  name: 'darmanitan-galar',
  types: ['ice'],
  level: 50,
  hp: 180,
  maxHp: 180,
  currentHp: 180,
  attack: 160,
  defense: 75,
  specialAttack: 50,
  specialDefense: 75,
  speed: 115,
  weightKg: 120.0,
  ability: 'zen-mode',
  baseStats: { hp: 105, attack: 140, defense: 55, specialAttack: 30, specialDefense: 55, speed: 95 },
  moves: [33, 58, 883, 14].map(id => move(id)), // Tackle, Ice Beam, Snowscape, Swords Dance
  photo: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/10177.png',
  animatedPhoto: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown/10177.gif',
  cry: 'https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/10177.ogg',
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
// H6-F ZEN MODE SUITE
// ============================================================================

test('H6-F Zen Mode Registry: zen-mode está registrada com status FULL e metadados canônicos', () => {
  const entry = Reg.getAbility('zen-mode');
  assert.ok(entry, 'zen-mode deve estar registrada no AbilityRegistry');
  assert.equal(entry.status, 'FULL');
  assert.equal(entry.phase, 'H6');
  assert.equal(entry.generation, 5);
  assert.equal(entry.suppressible, false);
  assert.equal(entry.copyable, false);
});

test('H6-F Zen Mode: Darmanitan inicia em Standard Mode (#555, Fire) com HP cheio', () => {
  const s = E.createTeamBattle(team(darmanitan()), team(dummy(2), dummy(3), dummy(4)));
  const c = s.player.team[0];
  assert.equal(c.formSpeciesId, null);
  assert.deepEqual(c.types, ['fire']);
  assert.equal(c.baseStats.attack, 140);
  assert.equal(c.baseStats.specialAttack, 30);
});

test('H6-F Zen Mode: Darmanitan com HP <= 50% entra em Zen Mode (#10017, Fire/Psychic) no fim do turno', () => {
  const s = E.createTeamBattle(team(darmanitan()), team(dummy(2), dummy(3), dummy(4)));
  s.player.team[0].currentHp = 90; // 90 / 180 = 50%
  const r = turn(s, 33);
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, 10017);
  assert.deepEqual(c.types, ['fire', 'psychic']);
  assert.equal(c.baseStats.attack, 30);
  assert.equal(c.baseStats.specialAttack, 140);
  assert.equal(c.baseStats.defense, 105);
  assert.equal(c.baseStats.specialDefense, 105);
  assert.equal(c.baseStats.speed, 55);
  assert.ok(r.events.some(e => e.reason === 'FORM_CHANGED' && e.label === 'darmanitan-zen'));
});

test('H6-F Zen Mode: Darmanitan com HP > 50% permanece em Standard Mode', () => {
  const s = E.createTeamBattle(team(darmanitan()), team(dummy(2), dummy(3), dummy(4)));
  s.player.team[0].currentHp = 150; // 150 / 180 > 50%
  const r = turn(s, 33, {}, act(14)); // Dummy usa Swords Dance (não causa dano)
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, null);
  assert.deepEqual(c.types, ['fire']);
});

test('H6-F Zen Mode: Darmanitan em Zen Mode curado para > 50% reverte a Standard Mode no fim do turno', () => {
  const s = E.createTeamBattle(team(darmanitan()), team(dummy(2), dummy(3), dummy(4)));
  s.player.team[0].currentHp = 90;
  let r = turn(s, 33); // Ativa Zen Mode
  assert.equal(r.state.player.team[0].formSpeciesId, 10017);

  // Cura para HP > 50%
  r.state.player.team[0].currentHp = 150;
  r = turn(r.state, 33);
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, null);
  assert.deepEqual(c.types, ['fire']);
  assert.equal(c.baseStats.attack, 140);
  assert.equal(c.baseStats.specialAttack, 30);
  assert.ok(r.events.some(e => e.reason === 'FORM_CHANGED' && e.label === 'darmanitan-standard'));
});

test('H6-F Zen Mode: Galarian Darmanitan com HP <= 50% entra em Galarian Zen (#10178, Ice/Fire)', () => {
  const s = E.createTeamBattle(team(darmanitanGalar()), team(dummy(2), dummy(3), dummy(4)));
  s.player.team[0].currentHp = 80; // 80 / 180 <= 50%
  const r = turn(s, 33);
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, 10178);
  assert.deepEqual(c.types, ['ice', 'fire']);
  assert.equal(c.baseStats.attack, 160);
  assert.equal(c.baseStats.speed, 135);
  assert.ok(r.events.some(e => e.reason === 'FORM_CHANGED' && e.label === 'darmanitan-galar-zen'));
});

test('H6-F Zen Mode: Galarian Darmanitan curado para > 50% reverte a Galarian Standard (#10177)', () => {
  const s = E.createTeamBattle(team(darmanitanGalar()), team(dummy(2), dummy(3), dummy(4)));
  s.player.team[0].currentHp = 80;
  let r = turn(s, 33);
  assert.equal(r.state.player.team[0].formSpeciesId, 10178);

  r.state.player.team[0].currentHp = 180;
  r = turn(r.state, 33);
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, null);
  assert.deepEqual(c.types, ['ice']);
  assert.equal(c.baseStats.attack, 140);
  assert.equal(c.baseStats.speed, 95);
  assert.ok(r.events.some(e => e.reason === 'FORM_CHANGED' && e.label === 'darmanitan-galar-standard'));
});

test('H6-F Zen Mode: Troca para reserva reverte forma para Standard', () => {
  const s = E.createTeamBattle(
    team(darmanitan(), dummy(50, { name: 'reserve' }), dummy(99)),
    team(dummy(2), dummy(3), dummy(4))
  );
  s.player.team[0].currentHp = 50;
  let r = turn(s, 33); // entra em Zen
  assert.equal(r.state.player.team[0].formSpeciesId, 10017);

  // Troca para reserva
  r = E.resolveTurn(r.state, { player: { type: 'SWITCH', targetPokemonId: 50 }, enemy: act(33) });
  assert.equal(r.state.player.team[0].formSpeciesId, null);
  assert.deepEqual(r.state.player.team[0].types, ['fire']);
});

test('H6-F Zen Mode: Darmanitan com outra habilidade (Sheer Force) não entra em Zen Mode', () => {
  const s = E.createTeamBattle(
    team(darmanitan({ ability: 'sheer-force' })),
    team(dummy(2), dummy(3), dummy(4))
  );
  s.player.team[0].currentHp = 50;
  const r = turn(s, 33);
  assert.equal(r.state.player.team[0].formSpeciesId, null);
});

test('H6-F Zen Mode: Zen Mode não pode ser suprimido (insuppressible Gen IX)', () => {
  const s = E.createTeamBattle(team(darmanitan()), team(dummy(2), dummy(3), dummy(4)));
  s.player.team[0].currentHp = 50;
  s.player.team[0].abilitySuppressed = true; // Simula tentativa de supressão
  const r = turn(s, 33);
  assert.equal(r.state.player.team[0].formSpeciesId, 10017);
});

test('H6-F Zen Mode: Darmanitan Terastallizado altera atributos mas mantém tipo Tera', () => {
  const s = E.createTeamBattle(
    team(darmanitan({ specialMechanic: 'tera', teraType: 'water' })),
    team(dummy(2), dummy(3), dummy(4))
  );
  s.player.team[0].currentHp = 50;
  const r = E.resolveTurn(s, { player: act(33, { special: 'tera' }), enemy: act(33) });
  const c = r.state.player.team[0];
  assert.equal(c.formSpeciesId, 10017);
  assert.equal(c.tera, 'water');
  assert.deepEqual(c.types, ['water']);
  assert.equal(c.baseStats.attack, 30);
  assert.equal(c.baseStats.specialAttack, 140);
});

test('H6-F Zen Mode: Espécie não-Darmanitan com Zen Mode injetado não muda de forma', () => {
  const s = E.createTeamBattle(
    team(dummy(10, { ability: 'zen-mode' })),
    team(dummy(2), dummy(3), dummy(4))
  );
  s.player.team[0].currentHp = 10;
  const r = turn(s, 33);
  assert.equal(r.state.player.team[0].formSpeciesId, null);
});

test('H6-F Zen Mode Doubles: Darmanitan em duplas entra em Zen Mode no fim do turno com HP <= 50%', () => {
  const pTeam = [darmanitan(), dummy(51)];
  const eTeam = [dummy(53), dummy(54)];
  const s = E.createDoublesBattle(pTeam, eTeam);
  s.player.team[0].currentHp = 50; // <= 50%
  
  const r = E.resolveDoublesTurn(s, {
    player: { 0: act(14), 1: act(14) },
    enemy: { 0: act(14), 1: act(14) }
  });
  assert.equal(r.state.player.team[0].formSpeciesId, 10017);
  assert.deepEqual(r.state.player.team[0].types, ['fire', 'psychic']);
  assert.equal(r.state.player.team[0].baseStats.attack, 30);
  assert.equal(r.state.player.team[0].baseStats.specialAttack, 140);
});
