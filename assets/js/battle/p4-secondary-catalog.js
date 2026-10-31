/* Verified Gen IX secondary effects and dependency audit; Pokemon Showdown, 2026-10-31. */
(function(root){const data={
  "effects": {
    "fire-punch": {
      "id": 7,
      "name": "fire-punch",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "burn",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "ice-punch": {
      "id": 8,
      "name": "ice-punch",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "freeze",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "thunder-punch": {
      "id": 9,
      "name": "thunder-punch",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "paralysis",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "stomp": {
      "id": 23,
      "name": "stomp",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "headbutt": {
      "id": 29,
      "name": "headbutt",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "body-slam": {
      "id": 34,
      "name": "body-slam",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "paralysis",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "poison-sting": {
      "id": 40,
      "name": "poison-sting",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "poison",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "acid": {
      "id": 51,
      "name": "acid",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "specialDefense": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "ember": {
      "id": 52,
      "name": "ember",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "burn",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "thunder-shock": {
      "id": 84,
      "name": "thunder-shock",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "paralysis",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "thunder": {
      "id": 87,
      "name": "thunder",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "paralysis",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "confusion": {
      "id": 93,
      "name": "confusion",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "confusion": true,
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_CONFUSION"
      ]
    },
    "lick": {
      "id": 122,
      "name": "lick",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "paralysis",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "fire-blast": {
      "id": 126,
      "name": "fire-blast",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "burn",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "hyper-fang": {
      "id": 158,
      "name": "hyper-fang",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "tri-attack": {
      "id": 161,
      "name": "tri-attack",
      "chance": 20,
      "target": "defender",
      "statusChoices": [
        "burn",
        "paralysis",
        "freeze"
      ],
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "RANDOM_SECONDARY_STATUS"
      ]
    },
    "powder-snow": {
      "id": 181,
      "name": "powder-snow",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "freeze",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "mud-slap": {
      "id": 189,
      "name": "mud-slap",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "accuracy": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "zap-cannon": {
      "id": 192,
      "name": "zap-cannon",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "paralysis",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "icy-wind": {
      "id": 196,
      "name": "icy-wind",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "speed": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "spark": {
      "id": 209,
      "name": "spark",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "paralysis",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "steel-wing": {
      "id": 211,
      "name": "steel-wing",
      "chance": 10,
      "target": "attacker",
      "requiresHit": true,
      "requiresDamage": true,
      "statBoosts": {
        "defense": 1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ]
    },
    "dynamic-punch": {
      "id": 223,
      "name": "dynamic-punch",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "confusion": true,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_CONFUSION"
      ]
    },
    "dragon-breath": {
      "id": 225,
      "name": "dragon-breath",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "paralysis",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "rapid-spin": {
      "id": 229,
      "name": "rapid-spin",
      "chance": 100,
      "target": "attacker",
      "requiresHit": true,
      "requiresDamage": true,
      "statBoosts": {
        "speed": 1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ]
    },
    "iron-tail": {
      "id": 231,
      "name": "iron-tail",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "defense": -1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "metal-claw": {
      "id": 232,
      "name": "metal-claw",
      "chance": 10,
      "target": "attacker",
      "requiresHit": true,
      "requiresDamage": true,
      "statBoosts": {
        "attack": 1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ]
    },
    "heat-wave": {
      "id": 257,
      "name": "heat-wave",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "burn",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "secret-power": {
      "id": 290,
      "name": "secret-power",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "paralysis",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "luster-purge": {
      "id": 295,
      "name": "luster-purge",
      "chance": 50,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "specialDefense": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "mist-ball": {
      "id": 296,
      "name": "mist-ball",
      "chance": 50,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "specialAttack": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "blaze-kick": {
      "id": 299,
      "name": "blaze-kick",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "burn",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "meteor-mash": {
      "id": 309,
      "name": "meteor-mash",
      "chance": 20,
      "target": "attacker",
      "requiresHit": true,
      "requiresDamage": true,
      "statBoosts": {
        "attack": 1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ]
    },
    "astonish": {
      "id": 310,
      "name": "astonish",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "rock-tomb": {
      "id": 317,
      "name": "rock-tomb",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "speed": -1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "signal-beam": {
      "id": 324,
      "name": "signal-beam",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "confusion": true,
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_CONFUSION"
      ]
    },
    "extrasensory": {
      "id": 326,
      "name": "extrasensory",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "muddy-water": {
      "id": 330,
      "name": "muddy-water",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "accuracy": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "bounce": {
      "id": 340,
      "name": "bounce",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "paralysis",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "mud-shot": {
      "id": 341,
      "name": "mud-shot",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "speed": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "flare-blitz": {
      "id": 394,
      "name": "flare-blitz",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "burn",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "dark-pulse": {
      "id": 399,
      "name": "dark-pulse",
      "chance": 20,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "air-slash": {
      "id": 403,
      "name": "air-slash",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "bug-buzz": {
      "id": 405,
      "name": "bug-buzz",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "specialDefense": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "dragon-rush": {
      "id": 407,
      "name": "dragon-rush",
      "chance": 20,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "focus-blast": {
      "id": 411,
      "name": "focus-blast",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "specialDefense": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "energy-ball": {
      "id": 412,
      "name": "energy-ball",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "specialDefense": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "earth-power": {
      "id": 414,
      "name": "earth-power",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "specialDefense": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "ice-fang": {
      "id": 423,
      "name": "ice-fang",
      "chance": 10,
      "target": "defender",
      "statusCondition": "freeze",
      "flinch": true,
      "flinchChance": 10,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE",
        "SECONDARY_FLINCH",
        "INDEPENDENT_SECONDARIES"
      ]
    },
    "fire-fang": {
      "id": 424,
      "name": "fire-fang",
      "chance": 10,
      "target": "defender",
      "statusCondition": "burn",
      "flinch": true,
      "flinchChance": 10,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE",
        "SECONDARY_FLINCH",
        "INDEPENDENT_SECONDARIES"
      ]
    },
    "zen-headbutt": {
      "id": 428,
      "name": "zen-headbutt",
      "chance": 20,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "flash-cannon": {
      "id": 430,
      "name": "flash-cannon",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "specialDefense": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "rock-climb": {
      "id": 431,
      "name": "rock-climb",
      "chance": 20,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "confusion": true,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_CONFUSION"
      ]
    },
    "gunk-shot": {
      "id": 441,
      "name": "gunk-shot",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "poison",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "charge-beam": {
      "id": 451,
      "name": "charge-beam",
      "chance": 70,
      "target": "attacker",
      "requiresHit": true,
      "requiresDamage": true,
      "statBoosts": {
        "specialAttack": 1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ]
    },
    "seed-flare": {
      "id": 465,
      "name": "seed-flare",
      "chance": 40,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "specialDefense": -2
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "ominous-wind": {
      "id": 466,
      "name": "ominous-wind",
      "chance": 10,
      "target": "attacker",
      "requiresHit": true,
      "requiresDamage": true,
      "statBoosts": {
        "attack": 1,
        "defense": 1,
        "specialAttack": 1,
        "specialDefense": 1,
        "speed": 1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ]
    },
    "sludge-wave": {
      "id": 482,
      "name": "sludge-wave",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "poison",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "low-sweep": {
      "id": 490,
      "name": "low-sweep",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "speed": -1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "inferno": {
      "id": 517,
      "name": "inferno",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "burn",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "struggle-bug": {
      "id": 522,
      "name": "struggle-bug",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "specialAttack": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "electroweb": {
      "id": 527,
      "name": "electroweb",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "speed": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "heart-stamp": {
      "id": 531,
      "name": "heart-stamp",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "night-daze": {
      "id": 539,
      "name": "night-daze",
      "chance": 40,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "accuracy": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "hurricane": {
      "id": 542,
      "name": "hurricane",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "confusion": true,
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_CONFUSION"
      ]
    },
    "bolt-strike": {
      "id": 550,
      "name": "bolt-strike",
      "chance": 20,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "paralysis",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "blue-flare": {
      "id": 551,
      "name": "blue-flare",
      "chance": 20,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "burn",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "icicle-crash": {
      "id": 556,
      "name": "icicle-crash",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "play-rough": {
      "id": 583,
      "name": "play-rough",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "attack": -1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "moonblast": {
      "id": 585,
      "name": "moonblast",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "specialAttack": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "mystical-fire": {
      "id": 595,
      "name": "mystical-fire",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "specialAttack": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "nuzzle": {
      "id": 609,
      "name": "nuzzle",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "paralysis",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "power-up-punch": {
      "id": 612,
      "name": "power-up-punch",
      "chance": 100,
      "target": "attacker",
      "requiresHit": true,
      "requiresDamage": true,
      "statBoosts": {
        "attack": 1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ]
    },
    "lunge": {
      "id": 679,
      "name": "lunge",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "attack": -1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "fire-lash": {
      "id": 680,
      "name": "fire-lash",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "defense": -1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "shadow-bone": {
      "id": 708,
      "name": "shadow-bone",
      "chance": 20,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "defense": -1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "zing-zap": {
      "id": 716,
      "name": "zing-zap",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "splishy-splash": {
      "id": 730,
      "name": "splishy-splash",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "paralysis",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "floaty-fall": {
      "id": 731,
      "name": "floaty-fall",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "pyro-ball": {
      "id": 780,
      "name": "pyro-ball",
      "chance": 10,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "burn",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "aura-wheel": {
      "id": 783,
      "name": "aura-wheel",
      "chance": 100,
      "target": "attacker",
      "requiresHit": true,
      "requiresDamage": true,
      "statBoosts": {
        "speed": 1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ]
    },
    "skitter-smack": {
      "id": 806,
      "name": "skitter-smack",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "specialAttack": -1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "scorching-sands": {
      "id": 815,
      "name": "scorching-sands",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "burn",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "fiery-wrath": {
      "id": 822,
      "name": "fiery-wrath",
      "chance": 20,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "flinch": true,
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_FLINCH"
      ]
    },
    "thunderous-kick": {
      "id": 823,
      "name": "thunderous-kick",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "defense": -1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "springtide-storm": {
      "id": 831,
      "name": "springtide-storm",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "attack": -1
      },
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "axe-kick": {
      "id": 853,
      "name": "axe-kick",
      "chance": 30,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "confusion": true,
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_CONFUSION"
      ]
    },
    "pounce": {
      "id": 884,
      "name": "pounce",
      "chance": 100,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statDrops": {
        "speed": -1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ]
    },
    "trailblaze": {
      "id": 885,
      "name": "trailblaze",
      "chance": 100,
      "target": "attacker",
      "requiresHit": true,
      "requiresDamage": true,
      "statBoosts": {
        "speed": 1
      },
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ]
    },
    "matcha-gotcha": {
      "id": 902,
      "name": "matcha-gotcha",
      "chance": 20,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "burn",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "malignant-chain": {
      "id": 919,
      "name": "malignant-chain",
      "chance": 50,
      "target": "defender",
      "requiresHit": true,
      "requiresDamage": true,
      "statusCondition": "toxic",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ]
    },
    "flame-wheel": {
      "id": 172,
      "name": "flame-wheel",
      "target": "defender",
      "chance": 10,
      "statusCondition": "burn"
    },
    "sacred-fire": {
      "id": 221,
      "name": "sacred-fire",
      "target": "defender",
      "chance": 50,
      "statusCondition": "burn"
    },
    "thunder-fang": {
      "id": 422,
      "name": "thunder-fang",
      "chance": 10,
      "target": "defender",
      "statusCondition": "paralysis",
      "flinch": true,
      "flinchChance": 10
    }
  },
  "definitions": {
    "2": {
      "id": 2,
      "name": "karate-chop",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "HIGH_CRITICAL_PHASE_P1"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "7": {
      "id": 7,
      "name": "fire-punch",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 7,
        "name": "fire-punch",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "burn",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "8": {
      "id": 8,
      "name": "ice-punch",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 8,
        "name": "ice-punch",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "freeze",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "9": {
      "id": 9,
      "name": "thunder-punch",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 9,
        "name": "thunder-punch",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "paralysis",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "23": {
      "id": 23,
      "name": "stomp",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [
        "MINIMIZE_INTERACTION_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 23,
        "name": "stomp",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "29": {
      "id": 29,
      "name": "headbutt",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 29,
        "name": "headbutt",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "34": {
      "id": 34,
      "name": "body-slam",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [
        "MINIMIZE_INTERACTION_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 34,
        "name": "body-slam",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "paralysis",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "36": {
      "id": 36,
      "name": "take-down",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "HP_RECOIL"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "recoilRatio": 0.25
    },
    "38": {
      "id": 38,
      "name": "double-edge",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "HP_RECOIL"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "recoilRatio": 0.333
    },
    "40": {
      "id": 40,
      "name": "poison-sting",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 40,
        "name": "poison-sting",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "poison",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "51": {
      "id": 51,
      "name": "acid",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 51,
        "name": "acid",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "specialDefense": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "52": {
      "id": 52,
      "name": "ember",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 52,
        "name": "ember",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "burn",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "63": {
      "id": 63,
      "name": "hyper-beam",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "RECHARGE_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "76": {
      "id": 76,
      "name": "solar-beam",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "CHARGE_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "84": {
      "id": 84,
      "name": "thunder-shock",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 84,
        "name": "thunder-shock",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "paralysis",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "87": {
      "id": 87,
      "name": "thunder",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [
        "WEATHER_ACCURACY_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 87,
        "name": "thunder",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "paralysis",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "93": {
      "id": 93,
      "name": "confusion",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_CONFUSION"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 93,
        "name": "confusion",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "confusion": true,
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_CONFUSION"
        ]
      }
    },
    "122": {
      "id": 122,
      "name": "lick",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 122,
        "name": "lick",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "paralysis",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "126": {
      "id": 126,
      "name": "fire-blast",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 126,
        "name": "fire-blast",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "burn",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "152": {
      "id": 152,
      "name": "crabhammer",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "HIGH_CRITICAL_PHASE_P1"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "158": {
      "id": 158,
      "name": "hyper-fang",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 158,
        "name": "hyper-fang",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "161": {
      "id": 161,
      "name": "tri-attack",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "RANDOM_SECONDARY_STATUS"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 161,
        "name": "tri-attack",
        "chance": 20,
        "target": "defender",
        "statusChoices": [
          "burn",
          "paralysis",
          "freeze"
        ],
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "RANDOM_SECONDARY_STATUS"
        ]
      }
    },
    "163": {
      "id": 163,
      "name": "slash",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "HIGH_CRITICAL_PHASE_P1"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "168": {
      "id": 168,
      "name": "thief",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "ITEM_STEAL_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "172": {
      "id": 172,
      "name": "flame-wheel",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE",
        "SELF_THAW"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 172,
        "name": "flame-wheel",
        "target": "defender",
        "chance": 10,
        "statusCondition": "burn"
      }
    },
    "181": {
      "id": 181,
      "name": "powder-snow",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 181,
        "name": "powder-snow",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "freeze",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "189": {
      "id": 189,
      "name": "mud-slap",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 189,
        "name": "mud-slap",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "accuracy": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "192": {
      "id": 192,
      "name": "zap-cannon",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 192,
        "name": "zap-cannon",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "paralysis",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "196": {
      "id": 196,
      "name": "icy-wind",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 196,
        "name": "icy-wind",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "speed": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "209": {
      "id": 209,
      "name": "spark",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 209,
        "name": "spark",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "paralysis",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "211": {
      "id": 211,
      "name": "steel-wing",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 211,
        "name": "steel-wing",
        "chance": 10,
        "target": "attacker",
        "requiresHit": true,
        "requiresDamage": true,
        "statBoosts": {
          "defense": 1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_BOOST"
        ]
      }
    },
    "221": {
      "id": 221,
      "name": "sacred-fire",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE",
        "SELF_THAW"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 221,
        "name": "sacred-fire",
        "target": "defender",
        "chance": 50,
        "statusCondition": "burn"
      }
    },
    "223": {
      "id": 223,
      "name": "dynamic-punch",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_CONFUSION"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 223,
        "name": "dynamic-punch",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "confusion": true,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_CONFUSION"
        ]
      }
    },
    "224": {
      "id": 224,
      "name": "megahorn",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0
    },
    "225": {
      "id": 225,
      "name": "dragon-breath",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 225,
        "name": "dragon-breath",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "paralysis",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "228": {
      "id": 228,
      "name": "pursuit",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "SWITCH_INTERCEPTION_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "229": {
      "id": 229,
      "name": "rapid-spin",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ],
      "knownPending": [
        "HAZARD_CLEAR_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 229,
        "name": "rapid-spin",
        "chance": 100,
        "target": "attacker",
        "requiresHit": true,
        "requiresDamage": true,
        "statBoosts": {
          "speed": 1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_BOOST"
        ]
      }
    },
    "231": {
      "id": 231,
      "name": "iron-tail",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 231,
        "name": "iron-tail",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "defense": -1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "232": {
      "id": 232,
      "name": "metal-claw",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 232,
        "name": "metal-claw",
        "chance": 10,
        "target": "attacker",
        "requiresHit": true,
        "requiresDamage": true,
        "statBoosts": {
          "attack": 1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_BOOST"
        ]
      }
    },
    "238": {
      "id": 238,
      "name": "cross-chop",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "HIGH_CRITICAL_PHASE_P1"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "257": {
      "id": 257,
      "name": "heat-wave",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 257,
        "name": "heat-wave",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "burn",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "282": {
      "id": 282,
      "name": "knock-off",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "ITEM_REMOVAL_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "290": {
      "id": 290,
      "name": "secret-power",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [
        "FIELD_EFFECT_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 290,
        "name": "secret-power",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "paralysis",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "295": {
      "id": 295,
      "name": "luster-purge",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 295,
        "name": "luster-purge",
        "chance": 50,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "specialDefense": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "296": {
      "id": 296,
      "name": "mist-ball",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 296,
        "name": "mist-ball",
        "chance": 50,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "specialAttack": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "299": {
      "id": 299,
      "name": "blaze-kick",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [
        "HIGH_CRITICAL_PHASE_P1"
      ],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 299,
        "name": "blaze-kick",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "burn",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "309": {
      "id": 309,
      "name": "meteor-mash",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 309,
        "name": "meteor-mash",
        "chance": 20,
        "target": "attacker",
        "requiresHit": true,
        "requiresDamage": true,
        "statBoosts": {
          "attack": 1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_BOOST"
        ]
      }
    },
    "310": {
      "id": 310,
      "name": "astonish",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 310,
        "name": "astonish",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "314": {
      "id": 314,
      "name": "air-cutter",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "HIGH_CRITICAL_PHASE_P1"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "317": {
      "id": 317,
      "name": "rock-tomb",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 317,
        "name": "rock-tomb",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "speed": -1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "324": {
      "id": 324,
      "name": "signal-beam",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_CONFUSION"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 324,
        "name": "signal-beam",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "confusion": true,
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_CONFUSION"
        ]
      }
    },
    "326": {
      "id": 326,
      "name": "extrasensory",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 326,
        "name": "extrasensory",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "327": {
      "id": 327,
      "name": "sky-uppercut",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "SEMI_INVULNERABLE_TARGET_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "330": {
      "id": 330,
      "name": "muddy-water",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 330,
        "name": "muddy-water",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "accuracy": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "340": {
      "id": 340,
      "name": "bounce",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [
        "CHARGE_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 340,
        "name": "bounce",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "paralysis",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "341": {
      "id": 341,
      "name": "mud-shot",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 341,
        "name": "mud-shot",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "speed": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "369": {
      "id": 369,
      "name": "u-turn",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "SELF_SWITCH_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "394": {
      "id": 394,
      "name": "flare-blitz",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE",
        "HP_RECOIL",
        "SELF_THAW"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 394,
        "name": "flare-blitz",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "burn",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      },
      "recoilRatio": 0.333
    },
    "399": {
      "id": 399,
      "name": "dark-pulse",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 399,
        "name": "dark-pulse",
        "chance": 20,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "400": {
      "id": 400,
      "name": "night-slash",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "HIGH_CRITICAL_PHASE_P1"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "401": {
      "id": 401,
      "name": "aqua-tail",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0
    },
    "403": {
      "id": 403,
      "name": "air-slash",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 403,
        "name": "air-slash",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "405": {
      "id": 405,
      "name": "bug-buzz",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 405,
        "name": "bug-buzz",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "specialDefense": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "406": {
      "id": 406,
      "name": "dragon-pulse",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0
    },
    "407": {
      "id": 407,
      "name": "dragon-rush",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [
        "MINIMIZE_INTERACTION_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 407,
        "name": "dragon-rush",
        "chance": 20,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "411": {
      "id": 411,
      "name": "focus-blast",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 411,
        "name": "focus-blast",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "specialDefense": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "412": {
      "id": 412,
      "name": "energy-ball",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 412,
        "name": "energy-ball",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "specialDefense": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "414": {
      "id": 414,
      "name": "earth-power",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 414,
        "name": "earth-power",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "specialDefense": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "421": {
      "id": 421,
      "name": "shadow-claw",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "HIGH_CRITICAL_PHASE_P1"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "422": {
      "id": 422,
      "name": "thunder-fang",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE",
        "SECONDARY_FLINCH",
        "INDEPENDENT_SECONDARIES"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 422,
        "name": "thunder-fang",
        "chance": 10,
        "target": "defender",
        "statusCondition": "paralysis",
        "flinch": true,
        "flinchChance": 10
      }
    },
    "423": {
      "id": 423,
      "name": "ice-fang",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE",
        "SECONDARY_FLINCH",
        "INDEPENDENT_SECONDARIES"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 423,
        "name": "ice-fang",
        "chance": 10,
        "target": "defender",
        "statusCondition": "freeze",
        "flinch": true,
        "flinchChance": 10,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE",
          "SECONDARY_FLINCH",
          "INDEPENDENT_SECONDARIES"
        ]
      }
    },
    "424": {
      "id": 424,
      "name": "fire-fang",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE",
        "SECONDARY_FLINCH",
        "INDEPENDENT_SECONDARIES"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 424,
        "name": "fire-fang",
        "chance": 10,
        "target": "defender",
        "statusCondition": "burn",
        "flinch": true,
        "flinchChance": 10,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE",
          "SECONDARY_FLINCH",
          "INDEPENDENT_SECONDARIES"
        ]
      }
    },
    "428": {
      "id": 428,
      "name": "zen-headbutt",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 428,
        "name": "zen-headbutt",
        "chance": 20,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "430": {
      "id": 430,
      "name": "flash-cannon",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 430,
        "name": "flash-cannon",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "specialDefense": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "431": {
      "id": 431,
      "name": "rock-climb",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_CONFUSION"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 431,
        "name": "rock-climb",
        "chance": 20,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "confusion": true,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_CONFUSION"
        ]
      }
    },
    "441": {
      "id": 441,
      "name": "gunk-shot",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 441,
        "name": "gunk-shot",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "poison",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "444": {
      "id": 444,
      "name": "stone-edge",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "HIGH_CRITICAL_PHASE_P1"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "450": {
      "id": 450,
      "name": "bug-bite",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "BERRY_CONSUMPTION_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "451": {
      "id": 451,
      "name": "charge-beam",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 451,
        "name": "charge-beam",
        "chance": 70,
        "target": "attacker",
        "requiresHit": true,
        "requiresDamage": true,
        "statBoosts": {
          "specialAttack": 1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_BOOST"
        ]
      }
    },
    "460": {
      "id": 460,
      "name": "spacial-rend",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "HIGH_CRITICAL_PHASE_P1"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "465": {
      "id": 465,
      "name": "seed-flare",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 465,
        "name": "seed-flare",
        "chance": 40,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "specialDefense": -2
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "466": {
      "id": 466,
      "name": "ominous-wind",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 466,
        "name": "ominous-wind",
        "chance": 10,
        "target": "attacker",
        "requiresHit": true,
        "requiresDamage": true,
        "statBoosts": {
          "attack": 1,
          "defense": 1,
          "specialAttack": 1,
          "specialDefense": 1,
          "speed": 1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_BOOST"
        ]
      }
    },
    "482": {
      "id": 482,
      "name": "sludge-wave",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 482,
        "name": "sludge-wave",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "poison",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "490": {
      "id": 490,
      "name": "low-sweep",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 490,
        "name": "low-sweep",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "speed": -1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "496": {
      "id": 496,
      "name": "round",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "CONDITIONAL_DAMAGE_PHASE_P5"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "510": {
      "id": 510,
      "name": "incinerate",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "ITEM_REMOVAL_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "517": {
      "id": 517,
      "name": "inferno",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 517,
        "name": "inferno",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "burn",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "522": {
      "id": 522,
      "name": "struggle-bug",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 522,
        "name": "struggle-bug",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "specialAttack": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "527": {
      "id": 527,
      "name": "electroweb",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 527,
        "name": "electroweb",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "speed": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "529": {
      "id": 529,
      "name": "drill-run",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "HIGH_CRITICAL_PHASE_P1"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "531": {
      "id": 531,
      "name": "heart-stamp",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 531,
        "name": "heart-stamp",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "533": {
      "id": 533,
      "name": "sacred-sword",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "IGNORE_TARGET_STAGES_PHASE_P3"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "539": {
      "id": 539,
      "name": "night-daze",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 539,
        "name": "night-daze",
        "chance": 40,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "accuracy": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "542": {
      "id": 542,
      "name": "hurricane",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_CONFUSION"
      ],
      "knownPending": [
        "WEATHER_ACCURACY_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 542,
        "name": "hurricane",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "confusion": true,
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_CONFUSION"
        ]
      }
    },
    "550": {
      "id": 550,
      "name": "bolt-strike",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 550,
        "name": "bolt-strike",
        "chance": 20,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "paralysis",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "551": {
      "id": 551,
      "name": "blue-flare",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 551,
        "name": "blue-flare",
        "chance": 20,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "burn",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "556": {
      "id": 556,
      "name": "icicle-crash",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 556,
        "name": "icicle-crash",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "572": {
      "id": 572,
      "name": "petal-blizzard",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0
    },
    "574": {
      "id": 574,
      "name": "disarming-voice",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0
    },
    "583": {
      "id": 583,
      "name": "play-rough",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 583,
        "name": "play-rough",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "attack": -1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "584": {
      "id": 584,
      "name": "fairy-wind",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0
    },
    "585": {
      "id": 585,
      "name": "moonblast",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 585,
        "name": "moonblast",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "specialAttack": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "595": {
      "id": 595,
      "name": "mystical-fire",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 595,
        "name": "mystical-fire",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "specialAttack": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "609": {
      "id": 609,
      "name": "nuzzle",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 609,
        "name": "nuzzle",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "paralysis",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "611": {
      "id": 611,
      "name": "infestation",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "BINDING_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "612": {
      "id": 612,
      "name": "power-up-punch",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 612,
        "name": "power-up-punch",
        "chance": 100,
        "target": "attacker",
        "requiresHit": true,
        "requiresDamage": true,
        "statBoosts": {
          "attack": 1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_BOOST"
        ]
      }
    },
    "619": {
      "id": 619,
      "name": "precipice-blades",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0
    },
    "662": {
      "id": 662,
      "name": "spirit-shackle",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "TRAPPING_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "663": {
      "id": 663,
      "name": "darkest-lariat",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "IGNORE_TARGET_STAGES_PHASE_P3"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "676": {
      "id": 676,
      "name": "pollen-puff",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "ALLY_TARGET_HEALING_DOUBLES_OUT_OF_SCOPE"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "679": {
      "id": 679,
      "name": "lunge",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 679,
        "name": "lunge",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "attack": -1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "680": {
      "id": 680,
      "name": "fire-lash",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 680,
        "name": "fire-lash",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "defense": -1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "687": {
      "id": 687,
      "name": "core-enforcer",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "ABILITY_SUPPRESSION_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "706": {
      "id": 706,
      "name": "psychic-fangs",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "BARRIER_REMOVAL_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "708": {
      "id": 708,
      "name": "shadow-bone",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 708,
        "name": "shadow-bone",
        "chance": 20,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "defense": -1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "712": {
      "id": 712,
      "name": "spectral-thief",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "STEAL_BOOSTS_PHASE_P3"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "714": {
      "id": 714,
      "name": "moongeist-beam",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "IGNORE_ABILITY_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "716": {
      "id": 716,
      "name": "zing-zap",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 716,
        "name": "zing-zap",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "722": {
      "id": 722,
      "name": "photon-geyser",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "DYNAMIC_DAMAGE_CATEGORY_PHASE_P5"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "730": {
      "id": 730,
      "name": "splishy-splash",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 730,
        "name": "splishy-splash",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "paralysis",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "731": {
      "id": 731,
      "name": "floaty-fall",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 731,
        "name": "floaty-fall",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "738": {
      "id": 738,
      "name": "sappy-seed",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "LEECH_SEED_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "740": {
      "id": 740,
      "name": "sparkly-swirl",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "TEAM_STATUS_CURE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0
    },
    "744": {
      "id": 744,
      "name": "dynamax-cannon",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "DYNAMAX_TARGET_PHASE_P8"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "780": {
      "id": 780,
      "name": "pyro-ball",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE",
        "SELF_THAW"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 780,
        "name": "pyro-ball",
        "chance": 10,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "burn",
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "783": {
      "id": 783,
      "name": "aura-wheel",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ],
      "knownPending": [
        "FORM_TYPE_PHASE_P8"
      ],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 783,
        "name": "aura-wheel",
        "chance": 100,
        "target": "attacker",
        "requiresHit": true,
        "requiresDamage": true,
        "statBoosts": {
          "speed": 1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_BOOST"
        ]
      }
    },
    "786": {
      "id": 786,
      "name": "overdrive",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0
    },
    "803": {
      "id": 803,
      "name": "grassy-glide",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "TERRAIN_PRIORITY_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "806": {
      "id": 806,
      "name": "skitter-smack",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 806,
        "name": "skitter-smack",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "specialAttack": -1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "815": {
      "id": 815,
      "name": "scorching-sands",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE",
        "SELF_THAW",
        "TARGET_THAW"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 815,
        "name": "scorching-sands",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "burn",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "822": {
      "id": 822,
      "name": "fiery-wrath",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_FLINCH"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 822,
        "name": "fiery-wrath",
        "chance": 20,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "flinch": true,
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_FLINCH"
        ]
      }
    },
    "823": {
      "id": 823,
      "name": "thunderous-kick",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 823,
        "name": "thunderous-kick",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "defense": -1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "824": {
      "id": 824,
      "name": "glacial-lance",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0
    },
    "825": {
      "id": 825,
      "name": "astral-barrage",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0
    },
    "831": {
      "id": 831,
      "name": "springtide-storm",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [
        "WEATHER_ACCURACY_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 831,
        "name": "springtide-storm",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "attack": -1
        },
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "833": {
      "id": 833,
      "name": "raging-fury",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "LOCKED_MOVE_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "853": {
      "id": 853,
      "name": "axe-kick",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_CONFUSION"
      ],
      "knownPending": [
        "CRASH_DAMAGE_PHASE_P2"
      ],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 853,
        "name": "axe-kick",
        "chance": 30,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "confusion": true,
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_CONFUSION"
        ]
      }
    },
    "856": {
      "id": 856,
      "name": "order-up",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "COMMANDER_ABILITY_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "861": {
      "id": 861,
      "name": "ice-spinner",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "TERRAIN_CLEAR_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "869": {
      "id": 869,
      "name": "kowtow-cleave",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0
    },
    "873": {
      "id": 873,
      "name": "raging-bull",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "FORM_TYPE_AND_BARRIER_PHASE_P8"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "875": {
      "id": 875,
      "name": "psyblade",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "TERRAIN_DAMAGE_PHASE_P7"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "884": {
      "id": 884,
      "name": "pounce",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_DROP"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 884,
        "name": "pounce",
        "chance": 100,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statDrops": {
          "speed": -1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_DROP"
        ]
      }
    },
    "885": {
      "id": 885,
      "name": "trailblaze",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "SECONDARY_STAT_BOOST"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 885,
        "name": "trailblaze",
        "chance": 100,
        "target": "attacker",
        "requiresHit": true,
        "requiresDamage": true,
        "statBoosts": {
          "speed": 1
        },
        "requiredMechanics": [
          "PHYSICAL_DAMAGE",
          "SECONDARY_STAT_BOOST"
        ]
      }
    },
    "887": {
      "id": 887,
      "name": "hyper-drill",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE",
        "PROTECT_BYPASS"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0
    },
    "892": {
      "id": 892,
      "name": "double-shock",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "TYPE_LOSS_PHASE_P8"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "893": {
      "id": 893,
      "name": "gigaton-hammer",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "PHYSICAL_DAMAGE"
      ],
      "knownPending": [
        "CONSECUTIVE_USE_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "901": {
      "id": 901,
      "name": "blood-moon",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "CONSECUTIVE_USE_PHASE_P6"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "902": {
      "id": 902,
      "name": "matcha-gotcha",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE",
        "SELF_THAW",
        "TARGET_THAW"
      ],
      "knownPending": [
        "HP_DRAIN_PHASE_P2"
      ],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 902,
        "name": "matcha-gotcha",
        "chance": 20,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "burn",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    },
    "906": {
      "id": 906,
      "name": "tera-starstorm",
      "supportLevel": "PARTIAL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE"
      ],
      "knownPending": [
        "TERASTALLIZATION_PHASE_P8"
      ],
      "blockedReason": null,
      "priority": 0
    },
    "919": {
      "id": 919,
      "name": "malignant-chain",
      "supportLevel": "FULL",
      "requiredMechanics": [
        "SPECIAL_DAMAGE",
        "SECONDARY_STATUS_CHANCE"
      ],
      "knownPending": [],
      "blockedReason": null,
      "priority": 0,
      "secondaryEffect": {
        "id": 919,
        "name": "malignant-chain",
        "chance": 50,
        "target": "defender",
        "requiresHit": true,
        "requiresDamage": true,
        "statusCondition": "toxic",
        "requiredMechanics": [
          "SPECIAL_DAMAGE",
          "SECONDARY_STATUS_CHANCE"
        ]
      }
    }
  },
  "moves": {
    "7": {
      "id": 7,
      "name": "fire-punch",
      "type": "fire",
      "power": 75,
      "accuracy": 100,
      "pp": 15,
      "damageClass": "physical"
    },
    "8": {
      "id": 8,
      "name": "ice-punch",
      "type": "ice",
      "power": 75,
      "accuracy": 100,
      "pp": 15,
      "damageClass": "physical"
    },
    "9": {
      "id": 9,
      "name": "thunder-punch",
      "type": "electric",
      "power": 75,
      "accuracy": 100,
      "pp": 15,
      "damageClass": "physical"
    },
    "23": {
      "id": 23,
      "name": "stomp",
      "type": "normal",
      "power": 65,
      "accuracy": 100,
      "pp": 20,
      "damageClass": "physical"
    },
    "29": {
      "id": 29,
      "name": "headbutt",
      "type": "normal",
      "power": 70,
      "accuracy": 100,
      "pp": 15,
      "damageClass": "physical"
    },
    "34": {
      "id": 34,
      "name": "body-slam",
      "type": "normal",
      "power": 85,
      "accuracy": 100,
      "pp": 15,
      "damageClass": "physical"
    },
    "40": {
      "id": 40,
      "name": "poison-sting",
      "type": "poison",
      "power": 15,
      "accuracy": 100,
      "pp": 35,
      "damageClass": "physical"
    },
    "51": {
      "id": 51,
      "name": "acid",
      "type": "poison",
      "power": 40,
      "accuracy": 100,
      "pp": 30,
      "damageClass": "special"
    },
    "52": {
      "id": 52,
      "name": "ember",
      "type": "fire",
      "power": 40,
      "accuracy": 100,
      "pp": 25,
      "damageClass": "special"
    },
    "84": {
      "id": 84,
      "name": "thunder-shock",
      "type": "electric",
      "power": 40,
      "accuracy": 100,
      "pp": 30,
      "damageClass": "special"
    },
    "87": {
      "id": 87,
      "name": "thunder",
      "type": "electric",
      "power": 110,
      "accuracy": 70,
      "pp": 10,
      "damageClass": "special"
    },
    "93": {
      "id": 93,
      "name": "confusion",
      "type": "psychic",
      "power": 50,
      "accuracy": 100,
      "pp": 25,
      "damageClass": "special"
    },
    "122": {
      "id": 122,
      "name": "lick",
      "type": "ghost",
      "power": 30,
      "accuracy": 100,
      "pp": 30,
      "damageClass": "physical"
    },
    "126": {
      "id": 126,
      "name": "fire-blast",
      "type": "fire",
      "power": 110,
      "accuracy": 85,
      "pp": 5,
      "damageClass": "special"
    },
    "158": {
      "id": 158,
      "name": "hyper-fang",
      "type": "normal",
      "power": 80,
      "accuracy": 90,
      "pp": 15,
      "damageClass": "physical"
    },
    "161": {
      "id": 161,
      "name": "tri-attack",
      "type": "normal",
      "power": 80,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "special"
    },
    "172": {
      "id": 172,
      "name": "flame-wheel",
      "type": "fire",
      "power": 60,
      "accuracy": 100,
      "pp": 25,
      "damageClass": "physical"
    },
    "181": {
      "id": 181,
      "name": "powder-snow",
      "type": "ice",
      "power": 40,
      "accuracy": 100,
      "pp": 25,
      "damageClass": "special"
    },
    "189": {
      "id": 189,
      "name": "mud-slap",
      "type": "ground",
      "power": 20,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "special"
    },
    "192": {
      "id": 192,
      "name": "zap-cannon",
      "type": "electric",
      "power": 120,
      "accuracy": 50,
      "pp": 5,
      "damageClass": "special"
    },
    "196": {
      "id": 196,
      "name": "icy-wind",
      "type": "ice",
      "power": 55,
      "accuracy": 95,
      "pp": 15,
      "damageClass": "special"
    },
    "209": {
      "id": 209,
      "name": "spark",
      "type": "electric",
      "power": 65,
      "accuracy": 100,
      "pp": 20,
      "damageClass": "physical"
    },
    "211": {
      "id": 211,
      "name": "steel-wing",
      "type": "steel",
      "power": 70,
      "accuracy": 90,
      "pp": 25,
      "damageClass": "physical"
    },
    "221": {
      "id": 221,
      "name": "sacred-fire",
      "type": "fire",
      "power": 100,
      "accuracy": 95,
      "pp": 5,
      "damageClass": "physical"
    },
    "223": {
      "id": 223,
      "name": "dynamic-punch",
      "type": "fighting",
      "power": 100,
      "accuracy": 50,
      "pp": 5,
      "damageClass": "physical"
    },
    "225": {
      "id": 225,
      "name": "dragon-breath",
      "type": "dragon",
      "power": 60,
      "accuracy": 100,
      "pp": 20,
      "damageClass": "special"
    },
    "229": {
      "id": 229,
      "name": "rapid-spin",
      "type": "normal",
      "power": 50,
      "accuracy": 100,
      "pp": 40,
      "damageClass": "physical"
    },
    "231": {
      "id": 231,
      "name": "iron-tail",
      "type": "steel",
      "power": 100,
      "accuracy": 75,
      "pp": 15,
      "damageClass": "physical"
    },
    "232": {
      "id": 232,
      "name": "metal-claw",
      "type": "steel",
      "power": 50,
      "accuracy": 95,
      "pp": 35,
      "damageClass": "physical"
    },
    "257": {
      "id": 257,
      "name": "heat-wave",
      "type": "fire",
      "power": 95,
      "accuracy": 90,
      "pp": 10,
      "damageClass": "special"
    },
    "290": {
      "id": 290,
      "name": "secret-power",
      "type": "normal",
      "power": 70,
      "accuracy": 100,
      "pp": 20,
      "damageClass": "physical"
    },
    "295": {
      "id": 295,
      "name": "luster-purge",
      "type": "psychic",
      "power": 95,
      "accuracy": 100,
      "pp": 5,
      "damageClass": "special"
    },
    "296": {
      "id": 296,
      "name": "mist-ball",
      "type": "psychic",
      "power": 95,
      "accuracy": 100,
      "pp": 5,
      "damageClass": "special"
    },
    "299": {
      "id": 299,
      "name": "blaze-kick",
      "type": "fire",
      "power": 85,
      "accuracy": 90,
      "pp": 10,
      "damageClass": "physical"
    },
    "309": {
      "id": 309,
      "name": "meteor-mash",
      "type": "steel",
      "power": 90,
      "accuracy": 90,
      "pp": 10,
      "damageClass": "physical"
    },
    "310": {
      "id": 310,
      "name": "astonish",
      "type": "ghost",
      "power": 30,
      "accuracy": 100,
      "pp": 15,
      "damageClass": "physical"
    },
    "317": {
      "id": 317,
      "name": "rock-tomb",
      "type": "rock",
      "power": 60,
      "accuracy": 95,
      "pp": 15,
      "damageClass": "physical"
    },
    "324": {
      "id": 324,
      "name": "signal-beam",
      "type": "bug",
      "power": 75,
      "accuracy": 100,
      "pp": 15,
      "damageClass": "special"
    },
    "326": {
      "id": 326,
      "name": "extrasensory",
      "type": "psychic",
      "power": 80,
      "accuracy": 100,
      "pp": 20,
      "damageClass": "special"
    },
    "330": {
      "id": 330,
      "name": "muddy-water",
      "type": "water",
      "power": 90,
      "accuracy": 85,
      "pp": 10,
      "damageClass": "special"
    },
    "340": {
      "id": 340,
      "name": "bounce",
      "type": "flying",
      "power": 85,
      "accuracy": 85,
      "pp": 5,
      "damageClass": "physical"
    },
    "341": {
      "id": 341,
      "name": "mud-shot",
      "type": "ground",
      "power": 55,
      "accuracy": 95,
      "pp": 15,
      "damageClass": "special"
    },
    "394": {
      "id": 394,
      "name": "flare-blitz",
      "type": "fire",
      "power": 120,
      "accuracy": 100,
      "pp": 15,
      "damageClass": "physical"
    },
    "399": {
      "id": 399,
      "name": "dark-pulse",
      "type": "dark",
      "power": 80,
      "accuracy": 100,
      "pp": 15,
      "damageClass": "special"
    },
    "403": {
      "id": 403,
      "name": "air-slash",
      "type": "flying",
      "power": 75,
      "accuracy": 95,
      "pp": 15,
      "damageClass": "special"
    },
    "405": {
      "id": 405,
      "name": "bug-buzz",
      "type": "bug",
      "power": 90,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "special"
    },
    "407": {
      "id": 407,
      "name": "dragon-rush",
      "type": "dragon",
      "power": 100,
      "accuracy": 75,
      "pp": 10,
      "damageClass": "physical"
    },
    "411": {
      "id": 411,
      "name": "focus-blast",
      "type": "fighting",
      "power": 120,
      "accuracy": 70,
      "pp": 5,
      "damageClass": "special"
    },
    "412": {
      "id": 412,
      "name": "energy-ball",
      "type": "grass",
      "power": 90,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "special"
    },
    "414": {
      "id": 414,
      "name": "earth-power",
      "type": "ground",
      "power": 90,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "special"
    },
    "422": {
      "id": 422,
      "name": "thunder-fang",
      "type": "electric",
      "power": 65,
      "accuracy": 95,
      "pp": 15,
      "damageClass": "physical"
    },
    "423": {
      "id": 423,
      "name": "ice-fang",
      "type": "ice",
      "power": 65,
      "accuracy": 95,
      "pp": 15,
      "damageClass": "physical"
    },
    "424": {
      "id": 424,
      "name": "fire-fang",
      "type": "fire",
      "power": 65,
      "accuracy": 95,
      "pp": 15,
      "damageClass": "physical"
    },
    "428": {
      "id": 428,
      "name": "zen-headbutt",
      "type": "psychic",
      "power": 80,
      "accuracy": 90,
      "pp": 15,
      "damageClass": "physical"
    },
    "430": {
      "id": 430,
      "name": "flash-cannon",
      "type": "steel",
      "power": 80,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "special"
    },
    "431": {
      "id": 431,
      "name": "rock-climb",
      "type": "normal",
      "power": 90,
      "accuracy": 85,
      "pp": 20,
      "damageClass": "physical"
    },
    "441": {
      "id": 441,
      "name": "gunk-shot",
      "type": "poison",
      "power": 120,
      "accuracy": 80,
      "pp": 5,
      "damageClass": "physical"
    },
    "451": {
      "id": 451,
      "name": "charge-beam",
      "type": "electric",
      "power": 50,
      "accuracy": 90,
      "pp": 10,
      "damageClass": "special"
    },
    "465": {
      "id": 465,
      "name": "seed-flare",
      "type": "grass",
      "power": 120,
      "accuracy": 85,
      "pp": 5,
      "damageClass": "special"
    },
    "466": {
      "id": 466,
      "name": "ominous-wind",
      "type": "ghost",
      "power": 60,
      "accuracy": 100,
      "pp": 5,
      "damageClass": "special"
    },
    "482": {
      "id": 482,
      "name": "sludge-wave",
      "type": "poison",
      "power": 95,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "special"
    },
    "490": {
      "id": 490,
      "name": "low-sweep",
      "type": "fighting",
      "power": 65,
      "accuracy": 100,
      "pp": 20,
      "damageClass": "physical"
    },
    "517": {
      "id": 517,
      "name": "inferno",
      "type": "fire",
      "power": 100,
      "accuracy": 50,
      "pp": 5,
      "damageClass": "special"
    },
    "522": {
      "id": 522,
      "name": "struggle-bug",
      "type": "bug",
      "power": 50,
      "accuracy": 100,
      "pp": 20,
      "damageClass": "special"
    },
    "527": {
      "id": 527,
      "name": "electroweb",
      "type": "electric",
      "power": 55,
      "accuracy": 95,
      "pp": 15,
      "damageClass": "special"
    },
    "531": {
      "id": 531,
      "name": "heart-stamp",
      "type": "psychic",
      "power": 60,
      "accuracy": 100,
      "pp": 25,
      "damageClass": "physical"
    },
    "539": {
      "id": 539,
      "name": "night-daze",
      "type": "dark",
      "power": 85,
      "accuracy": 95,
      "pp": 10,
      "damageClass": "special"
    },
    "542": {
      "id": 542,
      "name": "hurricane",
      "type": "flying",
      "power": 110,
      "accuracy": 70,
      "pp": 10,
      "damageClass": "special"
    },
    "550": {
      "id": 550,
      "name": "bolt-strike",
      "type": "electric",
      "power": 130,
      "accuracy": 85,
      "pp": 5,
      "damageClass": "physical"
    },
    "551": {
      "id": 551,
      "name": "blue-flare",
      "type": "fire",
      "power": 130,
      "accuracy": 85,
      "pp": 5,
      "damageClass": "special"
    },
    "556": {
      "id": 556,
      "name": "icicle-crash",
      "type": "ice",
      "power": 85,
      "accuracy": 90,
      "pp": 10,
      "damageClass": "physical"
    },
    "583": {
      "id": 583,
      "name": "play-rough",
      "type": "fairy",
      "power": 90,
      "accuracy": 90,
      "pp": 10,
      "damageClass": "physical"
    },
    "585": {
      "id": 585,
      "name": "moonblast",
      "type": "fairy",
      "power": 95,
      "accuracy": 100,
      "pp": 15,
      "damageClass": "special"
    },
    "595": {
      "id": 595,
      "name": "mystical-fire",
      "type": "fire",
      "power": 75,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "special"
    },
    "609": {
      "id": 609,
      "name": "nuzzle",
      "type": "electric",
      "power": 20,
      "accuracy": 100,
      "pp": 20,
      "damageClass": "physical"
    },
    "612": {
      "id": 612,
      "name": "power-up-punch",
      "type": "fighting",
      "power": 40,
      "accuracy": 100,
      "pp": 20,
      "damageClass": "physical"
    },
    "679": {
      "id": 679,
      "name": "lunge",
      "type": "bug",
      "power": 80,
      "accuracy": 100,
      "pp": 15,
      "damageClass": "physical"
    },
    "680": {
      "id": 680,
      "name": "fire-lash",
      "type": "fire",
      "power": 80,
      "accuracy": 100,
      "pp": 15,
      "damageClass": "physical"
    },
    "708": {
      "id": 708,
      "name": "shadow-bone",
      "type": "ghost",
      "power": 85,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "physical"
    },
    "716": {
      "id": 716,
      "name": "zing-zap",
      "type": "electric",
      "power": 80,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "physical"
    },
    "730": {
      "id": 730,
      "name": "splishy-splash",
      "type": "water",
      "power": 90,
      "accuracy": 100,
      "pp": 15,
      "damageClass": "special"
    },
    "731": {
      "id": 731,
      "name": "floaty-fall",
      "type": "flying",
      "power": 90,
      "accuracy": 95,
      "pp": 15,
      "damageClass": "physical"
    },
    "780": {
      "id": 780,
      "name": "pyro-ball",
      "type": "fire",
      "power": 120,
      "accuracy": 90,
      "pp": 5,
      "damageClass": "physical"
    },
    "783": {
      "id": 783,
      "name": "aura-wheel",
      "type": "electric",
      "power": 110,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "physical"
    },
    "806": {
      "id": 806,
      "name": "skitter-smack",
      "type": "bug",
      "power": 70,
      "accuracy": 90,
      "pp": 10,
      "damageClass": "physical"
    },
    "815": {
      "id": 815,
      "name": "scorching-sands",
      "type": "ground",
      "power": 70,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "special"
    },
    "822": {
      "id": 822,
      "name": "fiery-wrath",
      "type": "dark",
      "power": 90,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "special"
    },
    "823": {
      "id": 823,
      "name": "thunderous-kick",
      "type": "fighting",
      "power": 90,
      "accuracy": 100,
      "pp": 10,
      "damageClass": "physical"
    },
    "831": {
      "id": 831,
      "name": "springtide-storm",
      "type": "fairy",
      "power": 100,
      "accuracy": 80,
      "pp": 5,
      "damageClass": "special"
    },
    "853": {
      "id": 853,
      "name": "axe-kick",
      "type": "fighting",
      "power": 120,
      "accuracy": 90,
      "pp": 10,
      "damageClass": "physical"
    },
    "884": {
      "id": 884,
      "name": "pounce",
      "type": "bug",
      "power": 50,
      "accuracy": 100,
      "pp": 20,
      "damageClass": "physical"
    },
    "885": {
      "id": 885,
      "name": "trailblaze",
      "type": "grass",
      "power": 50,
      "accuracy": 100,
      "pp": 20,
      "damageClass": "physical"
    },
    "902": {
      "id": 902,
      "name": "matcha-gotcha",
      "type": "grass",
      "power": 80,
      "accuracy": 90,
      "pp": 15,
      "damageClass": "special"
    },
    "919": {
      "id": 919,
      "name": "malignant-chain",
      "type": "poison",
      "power": 100,
      "accuracy": 100,
      "pp": 5,
      "damageClass": "special"
    }
  },
  "defrost": [
    "flare-blitz",
    "pyro-ball",
    "scorching-sands",
    "matcha-gotcha",
    "flame-wheel",
    "sacred-fire"
  ],
  "postSecondaryThaw": [
    "scald",
    "scorching-sands",
    "matcha-gotcha"
  ]
};function freeze(o){if(o&&typeof o==="object"){Object.values(o).forEach(freeze);Object.freeze(o);}return o;}freeze(data);if(typeof module!=="undefined"&&module.exports)module.exports=data;else root.PBAP4SecondaryCatalog=data;})(typeof window!=="undefined"?window:globalThis);
