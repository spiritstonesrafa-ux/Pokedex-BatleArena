
const test = require('node:test');
const assert = require('node:assert/strict');
const Expanded = require('../../assets/js/expanded-pokemon-catalog.js');
const Campaign = require('../../assets/js/campaign/campaign-catalog.js');
const Wild = require('../../assets/js/campaign/campaign-wild-encounters.js');
const Fixed = require('../../assets/js/campaign/campaign-fixed-battle-catalog.js');
const Store = require('../../assets/js/campaign/campaign-store.js');
const { CampaignManager } = require('../../assets/js/campaign/campaign-wild-manager.js');
const { BattleTeamHydrator } = require('../../assets/js/battle-session/battle-team-hydrator.js');
const Support = require('../../assets/js/battle-session/battle-session-constants.js');
const Engine = require('../../assets/js/battle/battle-engine.js');
const pokeApi = require('../../assets/js/poke-api.js');
const memory = new Map();
global.localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
function fresh() { memory.clear(); const manager = new CampaignManager(Store); assert.equal(manager.start(Campaign.DRAFT.slice(0, 6).map(p => p.id)).ok, true); return manager; }
function rollFor(id, regionId, pointId, owned, campaign = null) {
  const pool = Wild.getPool(owned, regionId, pointId, campaign);
  const buckets = Object.entries(Wild.RARITY_WEIGHTS).map(([rarity, weight]) => ({weight, ids: pool.filter(candidate => rarity === 'SPECIAL' ? (Campaign.byId(candidate).legendary || Campaign.byId(candidate).mythical) : Wild.getRarity(regionId, candidate, pointId, campaign) === rarity)})).filter(bucket => bucket.ids.length);
  const total = buckets.reduce((sum, bucket) => sum + bucket.weight, 0);
  let offset = 0;
  for (const bucket of buckets) { const index = bucket.ids.indexOf(id); if (index >= 0) return (offset + (index + 0.5) / bucket.ids.length * bucket.weight) / total; offset += bucket.weight; }
  throw Error('No route for ' + id);
}

test('Expansion covers every species and alternate record, with explicit collection-only exceptions', () => {
  assert.equal(Expanded.count, 1351);
  assert.equal(new Set(Expanded.entries.map(p => p.id)).size, 1351);
  assert.equal(Object.keys(Campaign.CANONICAL_BY_ID).length, 1351);
  assert.equal(Campaign.EXPANSION_SPECIES.length, 844);
  assert.equal(Expanded.entries.filter(p => p.id > 1025).length, 326);
  assert.deepEqual(Expanded.entries.filter(p => p.collectionOnly).map(p => p.id), [132, 201, 202, 235, 360, 771, 789, 790]);
  const reachable = new Set([...Campaign.DRAFT, ...Campaign.MASTER_SPECIES, ...Campaign.SUPER_TEAM, ...Campaign.LEGENDARY_TRIAL_TEAM, ...Campaign.MYTHICAL_TRIAL_TEAM, ...Campaign.TITANS_TRIAL_TEAM, ...Campaign.CELESTIAL_TRIAL_TEAM].map(p => p.id));
  Object.values(Wild.POINT_POOLS).flat().forEach(id => reachable.add(id));
  Object.values(Wild.POINT_SPECIAL_POOLS).flat().forEach(id => reachable.add(id));
  assert.deepEqual(Expanded.entries.filter(p => !reachable.has(p.id)).map(p => p.name), []);
  assert.equal(pokeApi.isPokemonInGeneration(10120, '6'), true);
  assert.equal(pokeApi.isPokemonInGeneration(10120, 'forms'), true);
  assert.equal(pokeApi.isPokemonInGeneration(10120, '1'), false);
  assert.equal(pokeApi.isPokemonInGeneration(99999, 'all'), false);
});

test('All 1343 battle-ready records hydrate offline with legal form-specific stats and supported moves', async () => {
  const hydrator = new BattleTeamHydrator({ api: { getPokemonDetail() { throw Error('Unexpected network'); } } });
  for (const species of Expanded.entries) {
    if (species.collectionOnly) { assert.equal(Fixed.byId[species.id], undefined); continue; }
    const fixed = Fixed.byId[species.id];
    assert.ok(fixed, species.name);
    assert.ok(fixed.moves.length >= 1 && fixed.moves.length <= 4, species.name);
    assert.ok(fixed.moves.every(move => Support.isMechanicallySupportedMove(move)), species.name);
    const combatant = await hydrator.hydratePokemon({ ...fixed, campaignFixedMoves: true });
    assert.equal(combatant.id, species.id);
    assert.ok(combatant.moves.length > 0);
    assert.equal(combatant.moves.length, fixed.moves.length);
  }
  const ids = [10120, 10034, 10171];
  const team = await Promise.all(ids.map(id => hydrator.hydratePokemon({ ...Fixed.byId[id], campaignFixedMoves: true })));
  const enemy = await Promise.all([25, 3, 6].map(id => hydrator.hydratePokemon({ ...Fixed.byId[id], campaignFixedMoves: true })));
  const battle = Engine.createTeamBattle(team, enemy);
  assert.equal(battle.player.team[0].name, 'zygarde-complete');
  assert.equal(Expanded.byId[10120].stats.hp, 216);
  assert.notDeepEqual(Expanded.byId[10120].stats, Expanded.byId[718].stats);
});

test('All eight collection Pokémon can be encountered, captured, restored and kept out of battles', () => {
  for (const species of Expanded.entries.filter(p => p.collectionOnly)) {
    let manager = fresh();
    const [pointId, pool] = Object.entries(Wild.POINT_POOLS).concat(Object.entries(Wild.POINT_SPECIAL_POOLS)).find(([,ids]) => ids.includes(species.id));
    const regionId = Wild.POINTS[pointId].regionId;
    const roll = rollFor(species.id, regionId, pointId, manager.getRosterIds());
    const encounter = manager.beginWildEncounter(regionId, roll, pointId);
    assert.equal(encounter.pokemonId, species.id);
    assert.throws(() => manager.getBattleConfig('WILD', species.id, manager.getRosterIds().slice(0,3)), /coleção/);
    assert.equal(manager.prepareWildCollectionCapture().ok, true);
    manager = new CampaignManager(Store);
    assert.equal(manager.data.wild.pendingCapture.pokemonId, species.id);
    assert.equal(manager.attemptWildCapture(0).captured, true);
    manager.acknowledgeWildResult();
    manager = new CampaignManager(Store);
    assert.ok(manager.getRosterIds().includes(species.id));
    assert.throws(() => manager.getBattleConfig('MASTER', 'master-normal', [species.id, ...manager.getRosterIds().slice(0,2)]), /coleção/);
    assert.ok(!manager.getShadowFinalStandArmy(manager.getRosterIds()[0]).some(p => p.id === species.id));
  }
  const manager = fresh();
  manager.beginWildEncounter('region-1', 0);
  assert.equal(manager.prepareWildCollectionCapture().ok, false);
});

test('Completed campaigns continue collecting past three captures per point and preserve every capture on reload', () => {
  let manager = fresh();
  for (const master of Campaign.MASTERS) {
    manager.recordBattle({ battleId: 'expanded-' + master.challengeId, kind: 'MASTER', id: master.challengeId, winner: 'player' });
    const reward = manager.getRewardCandidates().find(p => p.selectable);
    assert.equal(manager.claimReward(reward.id).ok, true);
  }
  manager.recordBattle({ battleId: 'expanded-super', kind: 'SUPER', winner: 'player' });
  manager.acknowledgeSuperVictory();
  assert.equal(manager.claimReward(Campaign.SUPER_TEAM[0].id).ok, true);
  manager.acknowledgeShadowReveal();
  manager.recordBattle({ battleId: 'expanded-shadow', kind: 'SHADOW', winner: 'player' });
  assert.equal(manager.getState().status, 'COMPLETED');
  for (let i = 0; i < 5; i++) {
    const encounter = manager.beginWildEncounter('region-1', 0, 'r1-meadow');
    assert.equal(encounter.ok, true);
    if (Campaign.byId(encounter.pokemonId).collectionOnly) manager.prepareWildCollectionCapture();
    else manager.recordBattle({ battleId: 'postgame-' + i, kind: 'WILD', id: encounter.pokemonId, winner: 'player' });
    assert.equal(manager.attemptWildCapture(0).captured, true);
    manager.acknowledgeWildResult();
  }
  manager = new CampaignManager(Store);
  assert.equal(manager.getState().status, 'COMPLETED');
  assert.equal(Wild.getPointCaptureCount(manager.data.wild, 'region-1', 'r1-meadow'), 5);
  assert.equal(Wild.getCaptureLimit({ status: 'ACTIVE' }, 'region-1', 'r1-meadow'), 3);

  const allPostgame = new Set(Object.values(Wild.POINTS).flatMap(point => Wild.getPool([], point.regionId, point.id, manager.getState())));
  assert.equal(allPostgame.size, 1351);
  const missedReward = Campaign.MASTER_SPECIES.find(p => !manager.getRosterIds().includes(p.id));
  const point = Object.values(Wild.POINTS).find(point => point.types.some(type => missedReward.types.includes(type)));
  assert.ok(!Wild.getPool([], point.regionId, point.id).includes(missedReward.id), 'Reward stays protected during the story');
  const roll = rollFor(missedReward.id, point.regionId, point.id, manager.getRosterIds(), manager.getState());
  assert.equal(manager.beginWildEncounter(point.regionId, roll, point.id).pokemonId, missedReward.id);
  manager.recordBattle({ battleId: 'postgame-unchosen-reward', kind: 'WILD', id: missedReward.id, winner: 'player' });
  assert.equal(manager.attemptWildCapture(0).captured, true);
  manager = new CampaignManager(Store);
  assert.ok(manager.getRosterIds().includes(missedReward.id));

});
