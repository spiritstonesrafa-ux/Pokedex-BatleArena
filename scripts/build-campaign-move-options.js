#!/usr/bin/env node
/* Offline-only curator. Generates extra moves from cached PokéAPI learnsets and canonical pilot mechanics. */
const fs = require('node:fs');
const path = require('node:path');
const Fixed = require('../assets/js/campaign/campaign-fixed-battle-catalog.js');
const { isMechanicallySupportedMove } = require('../assets/js/battle-session/battle-session-constants.js');
const BattleConstants = require('../assets/js/battle/battle-constants.js');

// Explicit allowlist: safe moves with no unsupported complex side-effects
const SIMPLE_MOVES = new Set([
  'aerial-ace', 'aqua-tail', 'aura-sphere', 'body-press', 'boomburst',
  'branch-poke', 'brutal-swing', 'cut', 'dazzling-gleam', 'disarming-voice',
  'dragon-claw', 'dragon-pulse', 'drill-peck', 'earthquake', 'egg-bomb',
  'fairy-wind', 'gust', 'high-horsepower', 'horn-attack', 'hydro-pump',
  'hyper-voice', 'karate-chop', 'leafage', 'magical-leaf', 'mega-kick',
  'mega-punch', 'megahorn', 'overdrive', 'peck', 'petal-blizzard',
  'pound', 'power-gem', 'power-whip', 'rock-throw', 'scratch',
  'seed-bomb', 'shadow-punch', 'shock-wave', 'slam', 'smart-strike',
  'strength', 'surf', 'swift', 'tackle', 'vice-grip', 'vine-whip',
  'water-gun', 'wing-attack', 'x-scissor'
]);

// Phase P3/P4 pilot moves: explicitly supported stat stage boosts and status conditions
const PILOT_P3_MOVES = new Set([
  ...Object.values(BattleConstants.P5.moves).map(m=>m.name),
  ...Object.values(BattleConstants.RECHARGE_MOVES).map(m=>m.name),
  'super-fang',
  'natures-madness',
  'ruination',
  'bullet-seed',
  'icicle-spear',
  'rock-blast',
  'arm-thrust',
  'double-kick',
  'twineedle',
  'water-shuriken',
  'swords-dance',
  'calm-mind',
  'close-combat',
  'overheat',
  'draco-meteor',
  'hypnosis',
  'sleep-powder',
  'spore',
  'ice-beam',
  'blizzard',
  'scald',
  'confuse-ray',
  'water-pulse',
  'toxic',
  'fake-out',
  'seismic-toss',
  'night-shade',
  'sonic-boom',
  'dragon-rage',
  'rest','sleep-talk','yawn','snore','dream-eater'
]);

const CANONICAL_PILOT_MOVES = Object.freeze({
  ...Object.fromEntries(Object.values(BattleConstants.P5.moves).map(m=>[m.name,m])),
  ...Object.fromEntries(Object.values(BattleConstants.RECHARGE_MOVES).map(m=>[m.name,m])),
  'super-fang': Object.freeze({"id":162,"name":"super-fang","type":"normal","damageClass":"physical","power":null,"accuracy":90,"pp":10}),
  'natures-madness': Object.freeze({"id":717,"name":"natures-madness","type":"fairy","damageClass":"special","power":null,"accuracy":90,"pp":10}),
  'ruination': Object.freeze({"id":877,"name":"ruination","type":"dark","damageClass":"special","power":1,"accuracy":90,"pp":10}),
  'bullet-seed': Object.freeze({"id":331,"name":"bullet-seed","type":"grass","power":25,"accuracy":100,"pp":30,"damageClass":"physical"}),
  'icicle-spear': Object.freeze({"id":333,"name":"icicle-spear","type":"ice","power":25,"accuracy":100,"pp":30,"damageClass":"physical"}),
  'rock-blast': Object.freeze({"id":350,"name":"rock-blast","type":"rock","power":25,"accuracy":90,"pp":10,"damageClass":"physical"}),
  'arm-thrust': Object.freeze({"id":292,"name":"arm-thrust","type":"fighting","power":15,"accuracy":100,"pp":20,"damageClass":"physical"}),
  'double-kick': Object.freeze({"id":24,"name":"double-kick","type":"fighting","power":30,"accuracy":100,"pp":30,"damageClass":"physical"}),
  'twineedle': Object.freeze({"id":41,"name":"twineedle","type":"bug","power":25,"accuracy":100,"pp":20,"damageClass":"physical"}),
  'water-shuriken': Object.freeze({"id":594,"name":"water-shuriken","type":"water","power":15,"accuracy":100,"pp":20,"damageClass":"special"}),
  'rest': Object.freeze({"id":156,"name":"rest","type":"psychic","power":0,"accuracy":null,"pp":5,"damageClass":"status","p4Effect":"rest"}),
  'sleep-talk': Object.freeze({"id":214,"name":"sleep-talk","type":"normal","power":0,"accuracy":null,"pp":10,"damageClass":"status","p4Effect":"sleep-talk"}),
  'yawn': Object.freeze({"id":281,"name":"yawn","type":"normal","power":0,"accuracy":null,"pp":10,"damageClass":"status","p4Effect":"yawn"}),
  'snore': Object.freeze({"id":173,"name":"snore","type":"normal","power":50,"accuracy":100,"pp":15,"damageClass":"special"}),
  'dream-eater': Object.freeze({"id":138,"name":"dream-eater","type":"psychic","power":100,"accuracy":100,"pp":15,"damageClass":"special"}),
  'fake-out': Object.freeze({ id: 252, name: 'fake-out', type: 'normal', power: 40, accuracy: 100, pp: 10, damageClass: 'physical' }),
  'toxic': Object.freeze({ id: 92, name: 'toxic', type: 'poison', power: 0, accuracy: 90, pp: 10, damageClass: 'status', statusEffect: 'toxic' }),
  'swords-dance': Object.freeze({
    id: 14,
    name: 'swords-dance',
    type: 'normal',
    power: 0,
    accuracy: null,
    pp: 20,
    damageClass: 'status',
    statBoosts: Object.freeze({ attack: 2 })
  }),
  'calm-mind': Object.freeze({
    id: 347,
    name: 'calm-mind',
    type: 'psychic',
    power: 0,
    accuracy: null,
    pp: 20,
    damageClass: 'status',
    statBoosts: Object.freeze({ specialAttack: 1, specialDefense: 1 })
  }),
  'close-combat': Object.freeze({
    id: 370,
    name: 'close-combat',
    type: 'fighting',
    power: 120,
    accuracy: 100,
    pp: 5,
    damageClass: 'physical',
    selfStatDrops: Object.freeze({ defense: -1, specialDefense: -1 })
  }),
  'overheat': Object.freeze({
    id: 315,
    name: 'overheat',
    type: 'fire',
    power: 130,
    accuracy: 90,
    pp: 5,
    damageClass: 'special',
    selfStatDrops: Object.freeze({ specialAttack: -2 })
  }),
  'draco-meteor': Object.freeze({
    id: 434,
    name: 'draco-meteor',
    type: 'dragon',
    power: 130,
    accuracy: 90,
    pp: 5,
    damageClass: 'special',
    selfStatDrops: Object.freeze({ specialAttack: -2 })
  }),
  'hypnosis': Object.freeze({
    id: 95,
    name: 'hypnosis',
    type: 'psychic',
    power: 0,
    accuracy: 60,
    pp: 20,
    damageClass: 'status'
  }),
  'sleep-powder': Object.freeze({
    id: 79,
    name: 'sleep-powder',
    type: 'grass',
    power: 0,
    accuracy: 75,
    pp: 15,
    damageClass: 'status'
  }),
  'spore': Object.freeze({
    id: 147,
    name: 'spore',
    type: 'grass',
    power: 0,
    accuracy: 100,
    pp: 15,
    damageClass: 'status'
  }),
  'ice-beam': Object.freeze({
    id: 58,
    name: 'ice-beam',
    type: 'ice',
    power: 90,
    accuracy: 100,
    pp: 10,
    damageClass: 'special'
  }),
  'blizzard': Object.freeze({
    id: 59,
    name: 'blizzard',
    type: 'ice',
    power: 110,
    accuracy: 70,
    pp: 5,
    damageClass: 'special'
  }),
  'scald': Object.freeze({
    id: 503,
    name: 'scald',
    type: 'water',
    power: 80,
    accuracy: 100,
    pp: 15,
    damageClass: 'special'
  }),
  'confuse-ray': Object.freeze({
    id: 109,
    name: 'confuse-ray',
    type: 'ghost',
    power: 0,
    accuracy: 100,
    pp: 10,
    damageClass: 'status',
    statusEffect: 'confusion'
  }),
  'water-pulse': Object.freeze({
    id: 352,
    name: 'water-pulse',
    type: 'water',
    power: 60,
    accuracy: 100,
    pp: 20,
    damageClass: 'special'
  }),
  'seismic-toss': Object.freeze({
    id: 69,
    name: 'seismic-toss',
    type: 'fighting',
    power: null,
    accuracy: 100,
    pp: 20,
    damageClass: 'physical'
  }),
  'night-shade': Object.freeze({
    id: 101,
    name: 'night-shade',
    type: 'ghost',
    power: null,
    accuracy: 100,
    pp: 15,
    damageClass: 'special'
  }),
  'sonic-boom': Object.freeze({
    id: 49,
    name: 'sonic-boom',
    type: 'normal',
    power: null,
    accuracy: 90,
    pp: 20,
    damageClass: 'special'
  }),
  'dragon-rage': Object.freeze({
    id: 82,
    name: 'dragon-rage',
    type: 'dragon',
    power: null,
    accuracy: 100,
    pp: 10,
    damageClass: 'special'
  })
});

// Curated canonical learnsets (supported generations, including historical moves) for obtainable campaign Pokémon
const CANONICAL_PILOT_SPECIES_EXTRAS = Object.freeze({
  7: ["hydro-pump","mega-kick"],
  25: ["mega-kick","shock-wave"],
  237: ["triple-kick","aerial-ace"],
  461: ["triple-axel","surf"],
  733: ["beak-blast","drill-peck"],
  741: ["revelation-dance","aerial-ace"],
  776: ["shell-trap","dragon-claw"],
  880: ["bolt-beak","dragon-pulse"],
  925: ["population-bomb","aerial-ace"],
  956: ["lumina-crash","drill-peck"],
  10191: ["surging-strikes"],
  1: ["leaf-storm","grass-knot"],
  2: ["round","bide"],
  4: ["counter","temper-flare"],
  12: ["psywave","hidden-power"],
  15: ["twineedle","endeavor"],
  19: ["reversal","assurance"],
  20: ["super-fang","sucker-punch"],
  23: ["fissure","payback"],
  24: ["stomping-tantrum"],
  27: ["low-kick","flail"],
  28: ["gyro-ball"],
  29: ["venom-drench"],
  30: ["horn-drill"],
  34: ["double-kick","superpower"],
  66: ["heavy-slam"],
  72: ["mirror-coat"],
  81: ["electro-ball"],
  83: ["first-impression"],
  98: ["guillotine"],
  111: ["metal-burst"],
  144: ["sheer-cold"],
  151: ["heat-crash"],
  155: ["eruption"],
  223: ["water-spout"],
  228: ["comeuppance"],
  249: ["psycho-boost"],
  801: ["fleur-cannon"],
  895: ["dragon-energy"],
  10247: ["last-respects"],
  785: ['natures-madness'],
  1003: ['ruination'],
  91: ['icicle-spear', 'rock-blast'],
  143: ['rest','sleep-talk'], // Snorlax: canonical sleep combo.
  80: ['yawn','snore'], // Slowbro: delayed sleep and sleep-usable attack.

  297: ['fake-out', 'arm-thrust'], // Hariyama, first-entry pilot.

  68: ['seismic-toss', 'high-horsepower'], // Machamp: iconic Seismic Toss user
  356: ['night-shade', 'shadow-punch'], // Dusclops: iconic Night Shade user
  101: ['sonic-boom', 'shock-wave'], // Electrode: iconic Sonic Boom user
  130: ['dragon-rage', 'surf'], // Gyarados: iconic Dragon Rage user

  89: ['toxic', 'shock-wave'], // Muk: Toxic via modern TM; keep six campaign options.
  6: ["overheat","swords-dance"],
  9: ["hydro-cannon","scald"],
  45: ['sleep-powder', 'dazzling-gleam'], // Vileplume (Gen 1)
  65: ['calm-mind', 'shock-wave'],       // Alakazam (Draft Gen 1)
  97: ['hypnosis', 'dream-eater'],        // Hypno (Gen 1)
  55: ['water-pulse', 'hydro-pump'],     // Golduck (Gen 1)
  131: ['confuse-ray', 'blizzard'],       // Lapras (Gen 1 Draft)
  134: ['scald', 'blizzard'],            // Vaporeon (Gen 1 Draft)
  45: ['sleep-powder', 'dazzling-gleam'], // Vileplume (Gen 1)
  65: ['calm-mind', 'shock-wave'],       // Alakazam (Draft Gen 1)
  97: ['hypnosis', 'dream-eater'],        // Hypno (Gen 1)
  149: ["hyper-beam","draco-meteor"],
  157: ['overheat', 'aerial-ace'],       // Typhlosion (Draft Gen 2)
  212: ['swords-dance', 'wing-attack'],  // Scizor (Draft Gen 2)
  214: ['close-combat', 'swords-dance'], // Heracross (Draft Gen 2)
  282: ['calm-mind', 'dazzling-gleam'],  // Gardevoir (Draft Gen 3)
  286: ['spore', 'bullet-seed'],        // Breloom (Gen 3)
  445: ['swords-dance', 'draco-meteor'], // Garchomp (Draft Gen 4)
  448: ['close-combat', 'swords-dance'], // Lucario (Draft Gen 4)
  658: ['water-shuriken', 'hydro-pump'], // Greninja (Gen 6 Starter)
  10034: ["blast-burn"], // Charizard Mega X inherits the Charizard learnset.
  3: ["frenzy-plant","power-whip"],
  128: ["giga-impact","strength"],
  464: ["rock-wrecker","high-horsepower"],
  483: ["roar-of-time"],
  800: ["prismatic-laser"],
  865: ["meteor-assault","slam"],
  890: ["eternabeam","brutal-swing"],
});

const cache = path.join(__dirname, '..', '.cache_pokeapi');
const output = path.join(__dirname, '..', 'assets/js/campaign/campaign-move-options-catalog.js');
const read = name => {
  const file = path.join(cache, name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
};

const cachedMoves = new Map();

// Seed canonical pilot moves first
for (const [name, moveDef] of Object.entries(CANONICAL_PILOT_MOVES)) {
  cachedMoves.set(name, moveDef);
}

// If cache folder exists, populate safe simple moves from cache
if (fs.existsSync(cache)) {
  for (const file of fs.readdirSync(cache).filter(name => /_move_\d+_\.json$/.test(name))) {
    const raw = read(file);
    if (!raw) continue;
    const isPilot = PILOT_P3_MOVES.has(raw.name);
    if (!SIMPLE_MOVES.has(raw.name) && !isPilot) continue;
    if (!isMechanicallySupportedMove(raw)) continue;

    // Filters for non-pilot simple moves
    if (!isPilot) {
      if (raw.damage_class?.name === 'status' || raw.meta?.category?.name !== 'damage' || raw.priority !== 0 ||
          (raw.meta?.drain || 0) !== 0 || (raw.meta?.healing || 0) !== 0 ||
          (raw.meta?.ailment_chance || 0) !== 0 || (raw.meta?.stat_chance || 0) !== 0 ||
          (raw.meta?.flinch_chance || 0) !== 0 || (raw.meta?.crit_rate || 0) !== 0 ||
          raw.meta?.min_hits || raw.meta?.min_turns ||
          (raw.accuracy !== null && (!Number.isInteger(raw.accuracy) || raw.accuracy < 1 || raw.accuracy > 100)) ||
          !Number.isInteger(raw.pp) || raw.pp <= 0) continue;
    }

    if (!cachedMoves.has(raw.name)) {
      cachedMoves.set(raw.name, Object.freeze({
        id: raw.id,
        name: raw.name,
        type: raw.type?.name || raw.type,
        power: raw.power || 0,
        accuracy: raw.accuracy,
        pp: raw.pp,
        damageClass: raw.damage_class?.name || raw.damageClass
      }));
    }
  }
}

// Load baseline existing options catalog if available
let existingExtras = {};
if (fs.existsSync(output)) {
  try {
    existingExtras = require(output).byId || {};
  } catch (_) {
    existingExtras = {};
  }
}

const extrasById = {};

// Process candidate moves for all fixed species
for (const [idStr, species] of Object.entries(Fixed.byId)) {
  const id = Number(idStr);

  // If this species has dedicated curated pilot moves, assign them directly
  if (CANONICAL_PILOT_SPECIES_EXTRAS[id]) {
    const chosenPilotNames = CANONICAL_PILOT_SPECIES_EXTRAS[id];
    const moves = chosenPilotNames.map(name => {
      if (Object.values(BattleConstants.P5.moves).some(m=>m.name===name) || ['super-fang', 'natures-madness', 'ruination'].includes(name)) return CANONICAL_PILOT_MOVES[name];
      if (cachedMoves.has(name)) return cachedMoves.get(name);
      // Fallback from existing catalog or definitions
      const fromExisting = (existingExtras[id] || []).find(m => m.name === name);
      if (fromExisting) return fromExisting;
      if (CANONICAL_PILOT_MOVES[name]) return CANONICAL_PILOT_MOVES[name];
      const fromKnown = Object.values(BattleConstants.KNOWN_CATALOG_MOVES || {}).find(move=>move.name===name);
      if (fromKnown) return fromKnown;
      return null;
    }).filter(Boolean);

    if (moves.length) {
      extrasById[id] = moves;
      continue;
    }
  }

  // If cache exists, compute from learnset
  const pokemon = read(`https___pokeapi_co_api_v2_pokemon_${id}.json`);
  if (pokemon) {
    const selected = new Set(species.moves.map(move => move.name));
    const currentTypes = new Set(species.moves.map(move => move.type));
    const candidates = [...new Map(pokemon.moves.map(entry => {
      const move = cachedMoves.get(entry.move.name);
      return [entry.move.name, move];
    }).filter(([, move]) => move && !selected.has(move.name))).values()];
    const score = move => (move.power || 0) * (move.accuracy === null ? 1 : move.accuracy / 100) +
      (species.types.includes(move.type) ? 35 : 0) + (currentTypes.has(move.type) ? 0 : 20);
    candidates.sort((a, b) => score(b) - score(a) || a.id - b.id);
    const chosen = [];
    for (const move of candidates) {
      if (chosen.length >= 2) break;
      if (chosen.length === 0 || move.type !== chosen[0].type || candidates.length < 2) chosen.push(move);
    }
    if (chosen.length < 2) {
      for (const move of candidates) {
        if (chosen.length >= 2) break;
        if (!chosen.some(item => item.id === move.id)) chosen.push(move);
      }
    }
    if (chosen.length) {
      extrasById[id] = chosen;
      continue;
    }
  }

  // If not resolved from cache, retain existing curated extras from catalog
  if (existingExtras[id]) {
    extrasById[id] = existingExtras[id];
  }
}

const header = `/* Generated offline by scripts/build-campaign-move-options.js. Do not edit manually. */\n`;
const body = `(function () {\n  const byId = Object.freeze(${JSON.stringify(extrasById)});\n` +
  `  if (typeof module !== 'undefined' && module.exports) module.exports = { byId };\n` +
  `  else { window.PBACampaign = window.PBACampaign || {}; window.PBACampaign.CampaignMoveOptionsCatalog = { byId }; }\n})();\n`;
fs.writeFileSync(output, header + body);
console.log(`Curated options for ${Object.keys(extrasById).length}/${Object.keys(Fixed.byId).length} species; ${cachedMoves.size} safe move definitions.`);
