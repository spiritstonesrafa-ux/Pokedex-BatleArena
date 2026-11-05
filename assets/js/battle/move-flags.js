/* Canonical Move Metadata Flags (H0 Foundation) */
(function() {
  'use strict';

  // Sound-based moves (bypasses Substitute, blocked by Soundproof, boosted by Punk Rock)
  const SOUND_MOVE_IDS = new Set([
    45,   // Growl
    46,   // Roar
    47,   // Sing
    48,   // Supersonic
    103,  // Screech
    173,  // Snore
    195,  // Perish Song
    215,  // Heal Bell
    253,  // Uproar
    304,  // Hyper Voice
    319,  // Metal Sound
    320,  // Grass Whistle
    437,  // Bug Buzz
    496,  // Round
    497,  // Echoed Voice
    547,  // Relic Song
    555,  // Snarl
    568,  // Noble Roar
    574,  // Disarming Voice
    575,  // Parting Shot
    586,  // Boomburst
    664,  // Sparkling Aria
    691,  // Clanging Scales
    775,  // Clangorous Soul
    786,  // Overdrive
    914,  // Alluring Voice
    917   // Psychic Noise
  ]);

  // Bullet / Bomb / Projectile moves (blocked by Bulletproof)
  const BULLET_MOVE_IDS = new Set([
    121,  // Egg Bomb
    140,  // Barrage
    188,  // Sludge Bomb
    190,  // Octazooka
    192,  // Zap Cannon
    247,  // Shadow Ball
    301,  // Ice Ball
    311,  // Weather Ball
    331,  // Bullet Seed
    350,  // Rock Blast
    359,  // Magnet Bomb
    360,  // Gyro Ball
    396,  // Aura Sphere
    402,  // Seed Bomb
    411,  // Focus Blast
    412,  // Energy Ball
    426,  // Mud Bomb
    439,  // Rock Wrecker
    486,  // Electro Ball
    491,  // Acid Spray
    545,  // Searing Shot
    676,  // Pollen Puff
    690,  // Beak Blast
    781,  // Pyro Ball
    851   // Syrup Bomb
  ]);

  // Biting moves (boosted by Strong Jaw)
  const BITE_MOVE_IDS = new Set([
    44,   // Bite
    158,  // Hyper Fang
    242,  // Crunch
    305,  // Poison Fang
    422,  // Fire Fang
    423,  // Ice Fang
    424,  // Thunder Fang
    706,  // Psychic Fangs
    746,  // Jaw Lock
    755   // Fishious Rend
  ]);

  // Punching moves (boosted by Iron Fist, Punching Glove)
  const PUNCH_MOVE_IDS = new Set([
    4,    // Comet Punch
    5,    // Mega Punch
    7,    // Fire Punch
    8,    // Ice Punch
    9,    // Thunder Punch
    146,  // Dizzy Punch
    183,  // Mach Punch
    223,  // Dynamic Punch
    264,  // Focus Punch
    309,  // Meteor Mash
    325,  // Shadow Punch
    327,  // Sky Uppercut
    359,  // Hammer Arm
    409,  // Drain Punch
    418,  // Bullet Punch
    612,  // Power-Up Punch
    665,  // Ice Hammer
    721,  // Plasma Fists
    742,  // Double Iron Bash
    792,  // Surging Strikes
    793,  // Wicked Blow
    879,  // Jet Punch
    889,  // Rage Fist
    890   // Headlong Rush
  ]);

  // Wind-based moves (triggers Wind Power, Wind Rider)
  const WIND_MOVE_IDS = new Set([
    16,   // Gust
    18,   // Whirlwind
    59,   // Blizzard
    196,  // Icy Wind
    239,  // Twister
    257,  // Heat Wave
    314,  // Air Cutter
    366,  // Tailwind
    542,  // Hurricane
    572,  // Petal Blizzard
    584,  // Fairy Wind
    831,  // Springtide Storm
    846,  // Bleakwind Storm
    847,  // Wildbolt Storm
    848   // Sandsear Storm
  ]);

  // Slicing / cutting moves (boosted by Sharpness)
  const SLICING_MOVE_IDS = new Set([
    15,   // Cut
    75,   // Razor Leaf
    163,  // Slash
    210,  // Fury Cutter
    314,  // Air Cutter
    332,  // Aerial Ace
    348,  // Leaf Blade
    400,  // Night Slash
    403,  // Air Slash
    404,  // X-Scissor
    427,  // Psycho Cut
    440,  // Cross Poison
    533,  // Sacred Sword
    534,  // Razor Shell
    548,  // Secret Sword
    669,  // Solar Blade
    781,  // Behemoth Blade
    830,  // Stone Axe
    838,  // Bitter Blade
    845,  // Ceaseless Edge
    860,  // Population Bomb
    872,  // Aqua Step
    874,  // Tachyon Cutters
    876,  // Kowtow Cleave
    895   // Aqua Cutter
  ]);

  // Pulse / aura moves (boosted by Mega Launcher)
  const PULSE_MOVE_IDS = new Set([
    352,  // Water Pulse
    396,  // Aura Sphere
    399,  // Dark Pulse
    406,  // Dragon Pulse
    505,  // Heal Pulse
    618,  // Origin Pulse
    805   // Terrain Pulse
  ]);

  // Reflectable status moves (Magic Coat / Magic Bounce)
  const REFLECTABLE_MOVE_IDS = new Set([
    18,   // Whirlwind
    28,   // Sand Attack
    45,   // Growl
    46,   // Roar
    50,   // Disable
    73,   // Leech Seed
    77,   // Poison Powder
    78,   // Stun Spore
    79,   // Sleep Powder
    81,   // String Shot
    86,   // Thunder Wave
    92,   // Toxic
    95,   // Hypnosis
    103,  // Screech
    108,  // Smokescreen
    109,  // Confuse Ray
    134,  // Kinesis
    137,  // Glare
    147,  // Spore
    148,  // Flash
    178,  // Cotton Spore
    184,  // Scary Face
    186,  // Sweet Kiss
    191,  // Spikes
    204,  // Charm
    207,  // Swagger
    213,  // Attract
    227,  // Encore
    259,  // Torment
    260,  // Flatter
    261,  // Will-O-Wisp
    269,  // Taunt
    281,  // Yawn
    297,  // Feather Dance
    313,  // Fake Tears
    319,  // Metal Sound
    373,  // Embargo
    377,  // Heal Block
    380,  // Gastro Acid
    388,  // Worry Seed
    390,  // Toxic Spikes
    432,  // Defog
    446,  // Stealth Rock
    487,  // Soak
    564,  // Sticky Web
    575,  // Parting Shot
    598,  // Eerie Impulse
    608,  // Baby-Doll Eyes
    668,  // Strength Sap
    673,  // Tearful Look
    749,  // Tar Shot
    810   // Corrosive Gas
  ]);

  function getMoveId(move) {
    if (!move) return 0;
    if (typeof move === 'number') return move;
    return Number(move.id) || 0;
  }

  function isContactMove(move, contactIds) {
    const id = getMoveId(move);
    if (contactIds && Array.isArray(contactIds)) {
      return contactIds.includes(id);
    }
    // Fallback: check P5 mechanics if available
    if (typeof PBAP5Mechanics !== 'undefined' && PBAP5Mechanics.contactIds) {
      return PBAP5Mechanics.contactIds.includes(id);
    }
    if (typeof require !== 'undefined') {
      try {
        const p5 = require('./p5-mechanics.js');
        if (p5 && p5.contactIds) return p5.contactIds.includes(id);
      } catch (e) {}
    }
    return false;
  }

  function isSoundMove(move) {
    return SOUND_MOVE_IDS.has(getMoveId(move));
  }

  function isBulletMove(move) {
    return BULLET_MOVE_IDS.has(getMoveId(move));
  }

  function isBiteMove(move) {
    return BITE_MOVE_IDS.has(getMoveId(move));
  }

  function isPunchMove(move) {
    return PUNCH_MOVE_IDS.has(getMoveId(move));
  }

  function isWindMove(move) {
    return WIND_MOVE_IDS.has(getMoveId(move));
  }

  function isSlicingMove(move) {
    return SLICING_MOVE_IDS.has(getMoveId(move));
  }

  function isPulseMove(move) {
    return PULSE_MOVE_IDS.has(getMoveId(move));
  }

  function isReflectableMove(move) {
    return REFLECTABLE_MOVE_IDS.has(getMoveId(move));
  }

  function getMoveFlags(move, contactIds) {
    const id = getMoveId(move);
    return Object.freeze({
      id,
      contact: isContactMove(move, contactIds),
      sound: SOUND_MOVE_IDS.has(id),
      bullet: BULLET_MOVE_IDS.has(id),
      bite: BITE_MOVE_IDS.has(id),
      punch: PUNCH_MOVE_IDS.has(id),
      wind: WIND_MOVE_IDS.has(id),
      slicing: SLICING_MOVE_IDS.has(id),
      pulse: PULSE_MOVE_IDS.has(id),
      reflectable: REFLECTABLE_MOVE_IDS.has(id)
    });
  }

  const api = Object.freeze({
    SOUND_MOVE_IDS: Object.freeze(SOUND_MOVE_IDS),
    BULLET_MOVE_IDS: Object.freeze(BULLET_MOVE_IDS),
    BITE_MOVE_IDS: Object.freeze(BITE_MOVE_IDS),
    PUNCH_MOVE_IDS: Object.freeze(PUNCH_MOVE_IDS),
    WIND_MOVE_IDS: Object.freeze(WIND_MOVE_IDS),
    SLICING_MOVE_IDS: Object.freeze(SLICING_MOVE_IDS),
    PULSE_MOVE_IDS: Object.freeze(PULSE_MOVE_IDS),
    REFLECTABLE_MOVE_IDS: Object.freeze(REFLECTABLE_MOVE_IDS),
    isContactMove,
    isSoundMove,
    isBulletMove,
    isBiteMove,
    isPunchMove,
    isWindMove,
    isSlicingMove,
    isPulseMove,
    isReflectableMove,
    getMoveFlags
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (typeof window !== 'undefined') {
    window.PBAMoveFlags = api;
  }
})();

