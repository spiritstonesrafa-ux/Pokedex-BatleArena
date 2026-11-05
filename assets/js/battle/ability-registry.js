/* Centralized Ability Capability Registry (H0 Foundation) */
(function() {
  'use strict';

  const P7Data = typeof module !== 'undefined' && module.exports
    ? require('./p7-pokemon-data.js')
    : (typeof window !== 'undefined' ? window.PBAP7PokemonData : null);

  let roadmapCatalog = null;
  if (typeof module !== 'undefined' && module.exports) {
    try {
      const path = require('node:path');
      roadmapCatalog = require(path.resolve(__dirname, '../../../docs/ability-roadmap-catalog.json'));
    } catch (_) {
      roadmapCatalog = null;
    }
  }

  // Build phase lookup map from roadmap catalog if available
  const phaseByAbility = new Map();
  if (roadmapCatalog && Array.isArray(roadmapCatalog.phases)) {
    for (const phase of roadmapCatalog.phases) {
      if (Array.isArray(phase.abilities)) {
        for (const abilityName of phase.abilities) {
          phaseByAbility.set(abilityName, phase.id);
        }
      }
    }
  }

  // Canonical H1-A Full Implementation Specifications
  const H1A_METADATA = {
    'justified': {
      id: 'justified',
      name: 'Justified',
      generation: 5,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['AFTER_DAMAGING_HIT']),
      breakable: false, // NOT breakable by Mold Breaker / Teravolt / Turboblaze (canonical Gen V-IX rule)
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1a.test.js']),
      description: 'Aumenta o Ataque em 1 estágio ao sofrer um ataque de dano do tipo Dark. Não é ignorada por Mold Breaker.'
    },
    'moxie': {
      id: 'moxie',
      name: 'Moxie',
      generation: 5,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_DIRECT_KO']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1a.test.js']),
      description: 'Aumenta o Ataque em 1 estágio ao nocautear um oponente diretamente com um ataque.'
    },
    'chilling-neigh': {
      id: 'chilling-neigh',
      name: 'Chilling Neigh',
      generation: 8,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_DIRECT_KO']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1a.test.js']),
      description: 'Aumenta o Ataque em 1 estágio ao nocautear um oponente diretamente com um ataque.'
    },
    'as-one-glastrier': {
      id: 'as-one-glastrier',
      name: 'As One (Glastrier)',
      generation: 8,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_ENTRY', 'ON_DIRECT_KO', 'ON_BERRY_CONSUMPTION']),
      breakable: false,
      suppressible: false, // Protected against Core Enforcer / Gastro Acid / Neutralizing Gas
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h1a.test.js']),
      description: 'Combina os efeitos de Unnerve (bloqueia consumo de berries pelos adversários) e Chilling Neigh (+1 de Ataque ao nocautear). Insuprimível.'
    },
    'dauntless-shield': {
      id: 'dauntless-shield',
      name: 'Dauntless Shield',
      generation: 8,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_ENTRY']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1a.test.js']),
      description: 'Aumenta a Defesa em 1 estágio na primeira entrada em combate (uma única vez por batalha, regra Gen IX).'
    }
  };

  // Official H11 Mega Evolution Abilities from Pokémon Champions (2026, Nintendo Switch)
  const H11_METADATA = {
    'piercing-drill': {
      id: 'piercing-drill',
      name: 'Piercing Drill',
      generation: 9,
      phase: 'H11',
      status: 'RULE_CONFIRMED_PENDING_IMPLEMENTATION',
      triggers: Object.freeze(['ON_MOVE_DAMAGE', 'ON_PROTECT_BYPASS']),
      bearer: 'Mega Excadrill (#10287)',
      ruleset: 'Pokémon Champions (2026, Nintendo Switch) / Pokémon Showdown data/abilities.ts',
      formatCompatibility: Object.freeze(['CHAMPIONS_MEGA']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1a.test.js']),
      description: 'Habilidade de Mega Excadrill (Pokémon Champions). Golpes de contato atravessam Protect/Detect e barreiras de proteção causando 25% do dano normal.'
    },
    'dragonize': {
      id: 'dragonize',
      name: 'Dragonize',
      generation: 9,
      phase: 'H11',
      status: 'RULE_CONFIRMED_PENDING_IMPLEMENTATION',
      triggers: Object.freeze(['ON_MOVE_TYPE', 'ON_POWER_CALC']),
      bearer: 'Mega Feraligatr (#10283)',
      ruleset: 'Pokémon Champions (2026, Nintendo Switch) / Pokémon Showdown data/abilities.ts',
      formatCompatibility: Object.freeze(['CHAMPIONS_MEGA']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1a.test.js']),
      description: 'Habilidade de Mega Feraligatr (Pokémon Champions). Converte golpes do tipo Normal em Dragon e aumenta seu poder em 20%.'
    },
    'mega-sol': {
      id: 'mega-sol',
      name: 'Mega Sol',
      generation: 9,
      phase: 'H11',
      status: 'RULE_CONFIRMED_PENDING_IMPLEMENTATION',
      triggers: Object.freeze(['PASSIVE_SUN_SIMULATION']),
      bearer: 'Mega Meganium (#10282)',
      ruleset: 'Pokémon Champions (2026, Nintendo Switch) / Pokémon Showdown data/abilities.ts',
      formatCompatibility: Object.freeze(['CHAMPIONS_MEGA']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1a.test.js']),
      description: 'Habilidade de Mega Meganium (Pokémon Champions). Mega Sol faz os movimentos do próprio portador funcionarem como se houvesse sol intenso (sun simulation), independentemente do clima real. A habilidade não modifica o clima do campo, não invoca clima global, não altera diretamente o clima dos aliados e não funciona como Desolate Land.'
    },
    'spicy-spray': {
      id: 'spicy-spray',
      name: 'Spicy Spray',
      generation: 9,
      phase: 'H11',
      status: 'RULE_CONFIRMED_PENDING_IMPLEMENTATION',
      triggers: Object.freeze(['AFTER_DAMAGING_HIT']),
      bearer: 'Mega Scovillain (#10320)',
      ruleset: 'Pokémon Champions (2026, Nintendo Switch) / Pokémon Showdown data/abilities.ts',
      formatCompatibility: Object.freeze(['CHAMPIONS_MEGA']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1a.test.js']),
      description: 'Habilidade de Mega Scovillain (Pokémon Champions). Ao receber dano de um ataque adversário, inflige automaticamente Burn (queimadura) no atacante.'
    },
    'eelevate': {
      id: 'eelevate',
      name: 'Eelevate',
      generation: 9,
      phase: 'H11',
      status: 'RULE_CONFIRMED_PENDING_IMPLEMENTATION',
      triggers: Object.freeze(['GROUND_IMMUNITY', 'ON_DIRECT_KO']),
      bearer: 'Mega Eelektross (#10290)',
      ruleset: 'Pokémon Champions (2026, Nintendo Switch) / Pokémon Showdown data/abilities.ts',
      formatCompatibility: Object.freeze(['CHAMPIONS_MEGA']),
      breakable: true, // Imunidade a ground é ignorada por Mold Breaker (como Levitate)
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1a.test.js']),
      description: 'Habilidade de Mega Eelektross (Pokémon Champions). Imune a ataques e armadilhas terrestres (Levitate) e aumenta o maior atributo em 1 estágio ao nocautear.'
    },
    'fire-mane': {
      id: 'fire-mane',
      name: 'Fire Mane',
      generation: 9,
      phase: 'H11',
      status: 'RULE_CONFIRMED_PENDING_IMPLEMENTATION',
      triggers: Object.freeze(['ON_POWER_CALC']),
      bearer: 'Mega Pyroar (#10295)',
      ruleset: 'Pokémon Champions (2026, Nintendo Switch) / Pokémon Showdown data/abilities.ts',
      formatCompatibility: Object.freeze(['CHAMPIONS_MEGA']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1a.test.js']),
      description: 'Habilidade de Mega Pyroar (Pokémon Champions). Aumenta o poder dos golpes do tipo Fire em 50%.'
    },
    'aura-guard': {
      id: 'aura-guard',
      name: 'Aura Guard',
      generation: 9,
      phase: 'H11',
      status: 'RULE_CONFIRMED_PENDING_IMPLEMENTATION',
      triggers: Object.freeze(['BEFORE_DAMAGE']),
      bearer: 'Mega Lucario Z (#10310)',
      ruleset: 'Pokémon Champions (2026, Nintendo Switch) / Pokémon Showdown data/abilities.ts',
      formatCompatibility: Object.freeze(['CHAMPIONS_MEGA']),
      breakable: true, // Redução de dano de contato é ignorada por Mold Breaker (como Fur Coat)
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1a.test.js']),
      description: 'Habilidade de Mega Lucario Z (Pokémon Champions). Reduz à metade (0.5x) o dano recebido de ataques de contato.'
    }
  };

  // H2-A Implemented Abilities (FULL status)
  const H2A_METADATA = {
    'marvel-scale': {
      id: 'marvel-scale',
      name: 'Marvel Scale',
      generation: 3,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_DEFENSE']),
      breakable: true, // Quebrada por Mold Breaker
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2a.test.js']),
      description: 'Quando o portador tem uma condição de status principal elegível (Burn, Poison, Toxic, Paralysis, Sleep, Freeze), sua Defense efetiva aumenta em 50% (multiplicador 1.5x) no cálculo de dano físico recebido. Não altera Special Defense. Ignorada por Mold Breaker.'
    },
    'hustle': {
      id: 'hustle',
      name: 'Hustle',
      generation: 3,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_ATTACK', 'MODIFY_ACCURACY']),
      breakable: false, // Habilidade ofensiva do usuário; Mold Breaker afeta defesas do alvo
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2a.test.js']),
      description: 'Multiplica o Attack efetivo do portador por 1.5×. Reduz a precisão de movimentos físicos elegíveis com multiplicador de 0.8× (arredondamento para baixo). Não penaliza movimentos especiais, de status ou golpes OHKO.'
    },
    'keen-eye': {
      id: 'keen-eye',
      name: 'Keen Eye',
      generation: 3,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_ACCURACY', 'BLOCK_ACCURACY_DROP']),
      breakable: true, // Mold Breaker pode ignorar a prevenção de drop de precisão
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2a.test.js']),
      description: 'Previne reduções no estágio de precisão causadas por adversários. Ignora incondicionalmente os estágios de evasão do alvo (de -6 a +6) durante o cálculo de acerto (regra canônica Gen 9 Showdown: move.ignoreEvasion = true). Quebrável por Mold Breaker ao tentar reduzir precisão.'
    },
    'steadfast': {
      id: 'steadfast',
      name: 'Steadfast',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_FLINCH']),
      breakable: false, // Habilidade reativa pós-hesitação; NÃO é ignorada por Mold Breaker
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2a.test.js']),
      description: 'Quando o portador efetivamente sofre flinch (perde a sua ação no turno por hesitação), sua Speed aumenta em +1 estágio. Respeita o limite de +6 estágios. Não é ignorada por Mold Breaker.'
    }
  };

  // H3-A Implemented Abilities (FULL status)
  const H3A_METADATA = {
    'rough-skin': {
      id: 'rough-skin',
      name: 'Rough Skin',
      generation: 3,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_CONTACT_RECEIVED']),
      breakable: false, // Regra canônica Gen IX: habilidades reativas de contato NÃO são ignoradas por Mold Breaker
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a.test.js']),
      description: 'Quando o portador é atingido por um movimento que faz contato físico, o atacante sofre dano equivalente a 1/8 (12.5%) do seu HP máximo (mínimo 1). Ativa por cada acerto de golpes multi-hit. Ativa mesmo que o defensor desmaie com o golpe. Não é ignorada por Mold Breaker (regra canônica Gen IX).'
    },
    'iron-barbs': {
      id: 'iron-barbs',
      name: 'Iron Barbs',
      generation: 5,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_CONTACT_RECEIVED']),
      breakable: false, // Regra canônica Gen IX: habilidades reativas de contato NÃO são ignoradas por Mold Breaker / Teravolt
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a.test.js']),
      description: 'Quando o portador é atingido por um movimento que faz contato físico, o atacante sofre dano equivalente a 1/8 (12.5%) do seu HP máximo (mínimo 1). Compartilha da mecânica de Rough Skin e afeta apenas o agressor direto em batalhas em duplas. Não é ignorada por Mold Breaker / Teravolt (regra canônica Gen IX).'
    },
    'effect-spore': {
      id: 'effect-spore',
      name: 'Effect Spore',
      generation: 3,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_CONTACT_RECEIVED']),
      breakable: false, // Regra canônica Gen IX: habilidades reativas de contato NÃO são ignoradas por Mold Breaker / Turboblaze
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a.test.js']),
      description: 'Ao ser atingido por um movimento que faz contato físico, há 30% de chance total de infligir uma condição de status primária no atacante: 9% de Poison, 10% de Paralysis e 11% de Sleep. Não afeta Pokémon do tipo Grass, portadores de Overcoat ou que estejam segurando Safety Goggles. Não sobrescreve status já existente. Não é ignorada por Mold Breaker / Turboblaze (regra canônica Gen IX).'
    },
    'synchronize': {
      id: 'synchronize',
      name: 'Synchronize',
      generation: 3,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_STATUS_RECEIVED']),
      breakable: false, // Habilidade do alvo acionada ao receber status; respeita imunidades do atacante
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a.test.js']),
      description: 'Quando outro Pokémon inflige Burn, Paralysis, Poison ou Bad Poison (Toxic) no portador, o causador recebe a mesma condição de status. Não reflete Sleep nem Freeze. Não reflete status autoinfligidos (itens ou golpes próprios). Preserva a distinção entre Poison e Bad Poison. Respeita imunidades elementais, de habilidade e Safeguard. Não entra em recursão infinita contra outro Synchronize.'
    },
    'shed-skin': {
      id: 'shed-skin',
      name: 'Shed Skin',
      generation: 3,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_RESIDUAL_START']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a.test.js']),
      description: 'No início da fase residual de final de turno, o portador tem 33.3% (1/3) de chance canônica de curar qualquer condição de status primária (Burn, Poison, Toxic, Paralysis, Sleep, Freeze). Ocorre antes da aplicação de dano de veneno ou queimadura daquele turno. Suporta injeções determinísticas em escala 1..100 (roll <= 33) ou 1..3 (roll === 1).'
    }
  };

  // H4-A Implemented Abilities (FULL status)
  const H4A_METADATA = {
    'dark-aura': {
      id: 'dark-aura',
      name: 'Dark Aura',
      generation: 6,
      phase: 'H4',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_DAMAGE_MULTIPLIER']),
      bearer: 'Yveltal (#717)',
      ruleset: 'Gen VI-IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h4a.test.js']),
      description: 'Aumenta a potência de movimentos do tipo Dark de todos os Pokémon no campo por ~4/3 (1.33x). Se Aura Break estiver ativo no campo, o efeito é invertido para 0.75x. Não acumula bônus se houver múltiplos portadores.'
    },
    'fairy-aura': {
      id: 'fairy-aura',
      name: 'Fairy Aura',
      generation: 6,
      phase: 'H4',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_DAMAGE_MULTIPLIER']),
      bearer: 'Xerneas (#716)',
      ruleset: 'Gen VI-IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h4a.test.js']),
      description: 'Aumenta a potência de movimentos do tipo Fairy de todos os Pokémon no campo por ~4/3 (1.33x). Se Aura Break estiver ativo no campo, o efeito é invertido para 0.75x. Não acumula bônus se houver múltiplos portadores.'
    },
    'aura-break': {
      id: 'aura-break',
      name: 'Aura Break',
      generation: 6,
      phase: 'H4',
      status: 'FULL',
      triggers: Object.freeze(['INVERT_AURAS']),
      bearer: 'Zygarde (#718, #10118, #10119, #10120)',
      ruleset: 'Gen VI-IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h4a.test.js']),
      description: 'Inverte os efeitos de Dark Aura e Fairy Aura, transformando a amplificação de dano em redução multiplicada por 0.75x (3/4). Não aplica redução isolada sem aura correspondente ativa.'
    },
    'prism-armor': {
      id: 'prism-armor',
      name: 'Prism Armor',
      generation: 7,
      phase: 'H4',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_DAMAGE_MULTIPLIER']),
      bearer: 'Necrozma (#800, #10155, #10156)',
      ruleset: 'Gen VII-IX / Pokémon Showdown data/abilities.ts',
      breakable: false, // CANÔNICO: Prism Armor NÃO é ignorada por Mold Breaker, Teravolt ou Turboblaze
      suppressible: true,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h4a.test.js']),
      description: 'Reduz em 25% (multiplicador 0.75x) o dano de ataques super efetivos recebidos pelo portador. Não é ignorada por Mold Breaker, Teravolt ou Turboblaze. Suprimível por Gastro Acid.'
    },
    'neuroforce': {
      id: 'neuroforce',
      name: 'Neuroforce',
      generation: 7,
      phase: 'H4',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_DAMAGE_MULTIPLIER']),
      bearer: 'Ultra Necrozma (#10157)',
      ruleset: 'Gen VII-IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h4a.test.js']),
      description: 'Aumenta em 25% (multiplicador 1.25x) o dano de ataques super efetivos desferidos pelo portador. Aplica-se a movimentos físicos e especiais.'
    },
    'prankster': {
      id: 'prankster',
      name: 'Prankster',
      generation: 5,
      phase: 'H5',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_PRIORITY', 'ON_TRY_HIT']),
      bearer: 'Whimsicott (#547), Sableye (#302), Klefki (#707), Grimmsnarl (#859), Tornadus (#641), Thundurus (#642)',
      ruleset: 'Gen V-IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h5a.test.js']),
      description: 'Concede prioridade +1 para movimentos de status desferidos pelo portador. Oponentes do tipo Dark são imunes a golpes de status direcionados fortalecidos por Prankster.'
    },
    'infiltrator': {
      id: 'infiltrator',
      name: 'Infiltrator',
      generation: 5,
      phase: 'H5',
      status: 'FULL',
      triggers: Object.freeze(['ON_DAMAGE_CALCULATION', 'ON_STATUS_CHECK', 'ON_STAT_DROP_CHECK', 'ON_SUBSTITUTE_CHECK']),
      bearer: 'Dragapult (#887), Noivern (#715), Chandelure (#609), Crobat (#169), Malamar (#687)',
      ruleset: 'Gen V-IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h5a.test.js']),
      description: 'Ultrapassa as barreiras do oponente (Reflect, Light Screen, Aurora Veil, Safeguard, Mist) e o Substitute, desferindo dano e efeitos diretamente ao Pokémon alvo.'
    },
    'magic-bounce': {
      id: 'magic-bounce',
      name: 'Magic Bounce',
      generation: 5,
      phase: 'H5',
      status: 'FULL',
      triggers: Object.freeze(['ON_TRY_HIT', 'ON_REFLECT_STATUS', 'ON_REFLECT_HAZARDS']),
      bearer: 'Mega Sableye (#10066), Mega Diancie (#10075), Espeon (#196), Xatu (#178), Hatterene (#858)',
      ruleset: 'Gen V-IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h5a.test.js']),
      description: 'Reflete golpes de status e hazards direcionados de volta para o atacante. Ignorado por Mold Breaker, a menos que o defensor segure Ability Shield. Sem recursão de reflexão.'
    }
  };

  // H6-A Canonical Type-Conversion Abilities (FULL status)
  const H6A_METADATA = {
    'normalize': {
      id: 'normalize',
      name: 'Normalize',
      generation: 4,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_TYPE', 'ON_BASE_POWER']),
      bearer: 'Skitty (#300), Delcatty (#301)',
      ruleset: 'Gen VII-IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h6a.test.js']),
      description: 'Converte todos os golpes elegíveis do portador para o tipo Normal. Na Gen VII-IX, concede um multiplicador de 1.2x (4915/4096) no dano base de golpes elegíveis (mesmo aqueles originalmente Normal). Golpes de dano tornam-se Normal (com imunidade de Ghost); golpes de status seguem suas regras individuais (Thunder Wave torna-se Normal e é bloqueado por Ghost, mas atinge Ground; auto-buffs e reduções de atributo operam normalmente).'
    },
    'refrigerate': {
      id: 'refrigerate',
      name: 'Refrigerate',
      generation: 6,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_TYPE', 'ON_BASE_POWER']),
      bearer: 'Amaura (#698), Aurorus (#699), Mega Glalie (#10074)',
      ruleset: 'Gen VII-IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h6a.test.js']),
      description: 'Converte golpes elegíveis do tipo Normal para o tipo Ice e concede um multiplicador de 1.2x (4915/4096) no dano base de golpes convertidos. Golpes de status Normal tornam-se Ice.'
    },
    'pixilate': {
      id: 'pixilate',
      name: 'Pixilate',
      generation: 6,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_TYPE', 'ON_BASE_POWER']),
      bearer: 'Sylveon (#700), Mega Gardevoir (#10051), Mega Altaria (#10067)',
      ruleset: 'Gen VII-IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h6a.test.js']),
      description: 'Converte golpes elegíveis do tipo Normal para o tipo Fairy e concede um multiplicador de 1.2x (4915/4096) no dano base de golpes convertidos. Golpes de status Normal tornam-se Fairy.'
    },
    'aerilate': {
      id: 'aerilate',
      name: 'Aerilate',
      generation: 6,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_TYPE', 'ON_BASE_POWER']),
      bearer: 'Mega Pinsir (#10040), Mega Salamence (#10089)',
      ruleset: 'Gen VII-IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h6a.test.js']),
      description: 'Converte golpes elegíveis do tipo Normal para o tipo Flying e concede um multiplicador de 1.2x (4915/4096) no dano base de golpes convertidos. Golpes de status Normal tornam-se Flying.'
    },
    'galvanize': {
      id: 'galvanize',
      name: 'Galvanize',
      generation: 7,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_TYPE', 'ON_BASE_POWER']),
      bearer: 'Alolan Geodude (#10109), Alolan Graveler (#10110), Alolan Golem (#10111)',
      ruleset: 'Gen VII-IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h6a.test.js']),
      description: 'Converte golpes elegíveis do tipo Normal para o tipo Electric e concede um multiplicador de 1.2x (4915/4096) no dano base de golpes convertidos. Golpes de status Normal tornam-se Electric.'
    },
    'liquid-voice': {
      id: 'liquid-voice',
      name: 'Liquid Voice',
      generation: 7,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_TYPE']),
      bearer: 'Popplio (#728), Brionne (#729), Primarina (#730)',
      ruleset: 'Gen VII-IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h6a.test.js']),
      description: 'Converte golpes baseados em som (sound-based moves) para o tipo Water. Não concede bônus próprio de poder base.'
    }
  };

  // H6-B Canonical Dynamic Type-Changing Abilities (FULL status - Gen IX)
  const H6B_METADATA = {
    'protean': {
      id: 'protean',
      name: 'Protean',
      generation: 6,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_PREPARE_HIT']),
      bearer: 'Kecleon (#352), Froakie (#656), Frogadier (#657), Greninja (#658), Sprigatito (#906), Floragato (#907), Meowscarada (#908)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h6b.test.js']),
      description: 'Altera o tipo do Pokémon para o tipo do golpe que ele está prestes a usar (antes do cálculo de dano e STAB). Na Gen IX, ativa apenas uma vez por entrada em campo (resetando ao sair e retornar). Não ativa se o usuário já for puramente daquele tipo, estiver Terastallizado, suprimido ou usar Struggle.'
    },
    'libero': {
      id: 'libero',
      name: 'Libero',
      generation: 8,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_PREPARE_HIT']),
      bearer: 'Scorbunny (#813), Raboot (#814), Cinderace (#815)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h6b.test.js']),
      description: 'Compartilha a mecânica canônica de Protean: altera o tipo do Pokémon para o tipo do golpe que ele está prestes a usar. Na Gen IX, ativa apenas uma vez por entrada em campo.'
    },
    'color-change': {
      id: 'color-change',
      name: 'Color Change',
      generation: 3,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_AFTER_MOVE_SECONDARY']),
      bearer: 'Kecleon (#352)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h6b.test.js']),
      description: 'Altera o tipo do Pokémon para o tipo do golpe de dano recebido após a resolução completa do movimento e efeitos secundários (após o último acerto em golpes multi-hit). O dano recebido usa o tipo anterior. Não ativa contra golpes de status, dano absorvido por Substitute, falhas, imunidades, se já possuir o tipo, se estiver Terastallizado ou nocauteado.'
    }
  };

  const H6C_METADATA = {
    'schooling': {
      id: 'schooling',
      name: 'Schooling',
      generation: 7,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_ENTRY', 'ON_RESIDUAL_START']),
      bearer: 'Wishiwashi (#746, #10127)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: false,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6c.test.js']),
      description: 'Na entrada e no fim de cada turno, Wishiwashi com nível 20 ou superior e mais de 25% do HP máximo reúne um cardume e assume a School Form (#10127). Se o HP for reduzido a 25% ou menos, o cardume se dispersa e ele retorna à Solo Form (#746). Não pode ser suprimida, copiada, trocada ou ignorada por Mold Breaker.'
    }
  };

  const H6D_METADATA = {
    'shields-down': {
      id: 'shields-down',
      name: 'Shields Down',
      generation: 7,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_ENTRY', 'ON_RESIDUAL_START']),
      bearer: 'Minior (#774, #10130-#10142)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: false,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6d.test.js']),
      description: 'Na entrada e no fim de cada turno, Minior com mais de 50% do HP máximo assume a Meteor Form (#774, #10130-#10135), ficando imune a condições de status não voláteis e a Yawn. Se o HP for reduzido a 50% ou menos, a carapaça se rompe e ele assume a Core Form (#10136-#10142) correspondente à sua cor original, ganhando maior Ataque, Ataque Especial e Velocidade. Não pode ser suprimida, copiada por Transform para alterar forma, trocada ou ignorada por Mold Breaker.'
    }
  };

  const H6E_METADATA = {
    'battle-bond': {
      id: 'battle-bond',
      name: 'Battle Bond',
      generation: 7,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_DIRECT_KO']),
      bearer: 'Greninja (#10116)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: false,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6e.test.js']),
      description: 'Na Geração IX (SV), quando Greninja com Battle Bond (#10116) derrota diretamente um oponente por dano de movimento, e ainda restarem Pokémon não derrotados na equipe adversária, Battle Bond é ativado exatamente uma vez por batalha, aumentando seu Ataque, Ataque Especial e Velocidade em 1 estágio. Não altera forma nem estatísticas base para Ash-Greninja. Não pode ser suprimida, copiada por Transform/Role Play/Trace nem trocada por Skill Swap.'
    }
  };

  const H6F_METADATA = {
    'forecast': {
      id: 'forecast',
      name: 'Forecast',
      generation: 3,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_ENTRY', 'ON_WEATHER_CHANGE']),
      bearer: 'Castform (#351, #10013-#10015)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6f-forecast.test.js']),
      description: 'Castform muda de forma e tipo de acordo com as condições climáticas efetivas: Sunny Form (#10013, Fire) sob sol, Rainy Form (#10014, Water) sob chuva, Snowy Form (#10015, Ice) sob neve/granizo, e Normal (#351, Normal) em clima neutro, tempestade de areia ou sob anulação de clima por Cloud Nine/Air Lock. Reverte à forma Normal ao sair de campo ou sob supressão de habilidade.'
    },
    'zen-mode': {
      id: 'zen-mode',
      name: 'Zen Mode',
      generation: 5,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_RESIDUAL_START']),
      bearer: 'Darmanitan (#555, #10017, #10177, #10178)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: false,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6f-zen-mode.test.js']),
      description: 'No final do turno, se Darmanitan de Unova (#555) estiver com 50% ou menos de seu HP máximo, assume a Zen Mode (#10017, Fire/Psychic), recalculando seus atributos para alta capacidade especial e defensiva. Se curado acima de 50%, reverte ao Standard Mode. Para Darmanitan de Galar (#10177), assume a Galarian Zen Mode (#10178, Ice/Fire) com alta Velocidade e Ataque físico. Sempre retorna ao Standard Mode ao sair do campo. Não pode ser suprimida, copiada ou trocada.'
    },
    'mimicry': {
      id: 'mimicry',
      name: 'Mimicry',
      generation: 8,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_ENTRY', 'ON_TERRAIN_CHANGE']),
      bearer: 'Galarian Stunfisk (#10180)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h6f-mimicry.test.js']),
      description: 'Altera a tipagem do usuário para um tipo único correspondente ao terreno ativo: Electric sob Electric Terrain, Grass sob Grassy Terrain, Fairy sob Misty Terrain e Psychic sob Psychic Terrain. Se o terreno expirar, for removido ou o usuário deixar o campo, restaura sua tipagem original (Ground/Steel). Não depende de estar no chão (grounded) e é sobreposta por Teracristalização.'
    },
    'zero-to-hero': {
      id: 'zero-to-hero',
      name: 'Zero to Hero',
      generation: 9,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_SWITCH_OUT', 'ON_ENTRY']),
      bearer: 'Palafin (#964, #10256)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: false,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6f-zero-to-hero.test.js']),
      description: 'Palafin inicia o combate na Zero Form (#964). Na primeira saída válida do campo de batalha (troca voluntária, movimento pivot ou troca forçada) sem desmaiar, transforma-se na Hero Form (#10256), ganhando atributos substancialmente aumentados que permanecem pelo restante do combate. Reentradas e trocas subsequentes preservam a Hero Form. Reverte à Zero Form em nova batalha. Não pode ser suprimida, copiada ou trocada.'
    }
  };


  const H6G_METADATA = {
    'multitype': {
      id: 'multitype',
      name: 'Multitype',
      generation: 4,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_INIT', 'ON_ENTRY']),
      bearer: 'Arceus (#493)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: false,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6g-multitype.test.js']),
      description: 'Muda o tipo de Arceus de acordo com a Plate segurada. Não pode ser suprimida, copiada ou trocada. A Plate segurada não pode ser removida ou roubada por Thief, Knock Off ou Trick. Teracristalização altera temporariamente o tipo para o Tera Type correspondente.'
    },
    'rks-system': {
      id: 'rks-system',
      name: 'RKS System',
      generation: 7,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_INIT', 'ON_ENTRY']),
      bearer: 'Silvally (#773)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: false,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6g-rks-system.test.js']),
      description: 'Muda o tipo de Silvally de acordo com o Memory segurado. Não pode ser suprimida, copiada ou trocada. O Memory segurado não pode ser removido ou roubado. Teracristalização altera temporariamente o tipo para o Tera Type correspondente.'
    },
    'stance-change': {
      id: 'stance-change',
      name: 'Stance Change',
      generation: 6,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['BEFORE_MOVE']),
      bearer: 'Aegislash (#681, #10026)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: false,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6g-stance-change.test.js']),
      description: "Alterna Aegislash para Blade Forme (#10026) antes de executar um golpe de dano e para Shield Forme (#681) ao usar King's Shield (#588). Recalcula imediatamente atributos ofensivos e defensivos. Reverte para Shield Forme ao ser trocado ou ao desmaiar. Não pode ser suprimida, copiada ou trocada."
    },
    'disguise': {
      id: 'disguise',
      name: 'Disguise',
      generation: 7,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_DAMAGE']),
      bearer: 'Mimikyu (#778, #10143)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: false,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6g-disguise.test.js']),
      description: 'Protege Mimikyu contra o dano do primeiro golpe direto recebido na batalha. Ao ser quebrado, o dano do golpe torna-se 0, Mimikyu assume a Busted Form (#10143) e perde 1/8 de seu HP máximo como recoil canônico da Geração IX. Permanece quebrado pelo restante do combate. Pode ser ignorado por Mold Breaker e golpes correspondentes.'
    },
    'ice-face': {
      id: 'ice-face',
      name: 'Ice Face',
      generation: 8,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_DAMAGE', 'ON_WEATHER_CHANGE', 'ON_ENTRY']),
      bearer: 'Eiscue (#875, #10185)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6g-ice-face.test.js']),
      description: 'Bloqueia o primeiro golpe físico direto recebido enquanto na Ice Face Form (#875), anulando o dano e assumindo a Noice Face Form (#10185), com aumento de Velocidade e redução de Defesa. Reconstrói o bloco de gelo ao iniciar neve/granizo ou ao entrar em campo durante essas condições climáticas. Pode ser suprimida ou ignorada por Mold Breaker.'
    },
    'gulp-missile': {
      id: 'gulp-missile',
      name: 'Gulp Missile',
      generation: 8,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_AFTER_MOVE', 'ON_DAMAGE']),
      bearer: 'Cramorant (#845, #10182, #10183)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6g-gulp-missile.test.js']),
      description: 'Após usar Surf (#57) ou Dive (#291), Cramorant apanha uma presa: Gulping Form (#10182) com HP > 50% ou Gorging Form (#10183) com HP <= 50%. Ao sofrer dano direto de um ataque, cospe a presa contra o atacante causando dano de 1/4 do HP máximo do adversário, reduzindo a Defesa em 1 estágio (Gulping) ou aplicando paralisia (Gorging), e reverte à forma padrão.'
    },
    'power-construct': {
      id: 'power-construct',
      name: 'Power Construct',
      generation: 7,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_RESIDUAL_START']),
      bearer: 'Zygarde (#718, #10118, #10120)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: false,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6g-power-construct.test.js']),
      description: 'No final do turno, se Zygarde 50% (#718) ou 10% (#10118) estiver com HP <= 50%, transforma-se permanentemente na Complete Forme (#10120), aumentando expressivamente o HP máximo e atributos, adicionando a diferença de HP diretamente ao HP atual. A transformação persiste pelo restante da batalha e não reverte ao trocar de campo.'
    },
    'illusion': {
      id: 'illusion',
      name: 'Illusion',
      generation: 5,
      phase: 'H6',
      status: 'FULL',
      triggers: Object.freeze(['ON_ENTRY', 'ON_DAMAGE']),
      bearer: 'Zorua e Zoroark (#570, #571, #10238, #10239)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h6g-illusion.test.js']),
      description: 'Ao entrar em campo, assume a aparência visual (nome, sprite, arte e tipo aparente) do último Pokémon consciente da equipe do jogador. Preserva integralmente atributos, movimentos, tipo real para cálculos de dano e mecânicas verdadeiras. O disfarce se desfaz ao sofrer dano direto de um ataque adversário ou ao Teracristalizar.'
    }
  };

  const H7A_METADATA = {
    'trace': {
      id: 'trace',
      name: 'Trace',
      generation: 3,
      phase: 'H7',
      status: 'FULL',
      triggers: Object.freeze(['ON_ENTRY']),
      bearer: 'Gardevoir (#282), Porygon2 (#233)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h7a-trace.test.js']),
      description: 'Ao entrar em campo, copia a habilidade de um Pokémon adversário adjacente elegível. Respeita habilidades não copiáveis e Ability Shield.'
    },
    'mummy': {
      id: 'mummy',
      name: 'Mummy',
      generation: 5,
      phase: 'H7',
      status: 'FULL',
      triggers: Object.freeze(['ON_CONTACT_DEFENSE']),
      bearer: 'Cofagrigus (#563), Yamask (#562)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h7a-mummy.test.js']),
      description: 'Quando o portador é atingido por um ataque que faz contato físico, a habilidade do agressor é alterada para Mummy. Não afeta habilidades protegidas ou portadores de Ability Shield.'
    },
    'receiver': {
      id: 'receiver',
      name: 'Receiver',
      generation: 7,
      phase: 'H7',
      status: 'FULL',
      triggers: Object.freeze(['ON_ALLY_FAINT']),
      bearer: 'Passimian (#766)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h7a-receiver.test.js']),
      description: 'Herda a habilidade de um aliado quando ele é nocauteado em batalha de duplas. Não herda habilidades excluídas ou protegidas.'
    },
    'power-of-alchemy': {
      id: 'power-of-alchemy',
      name: 'Power of Alchemy',
      generation: 7,
      phase: 'H7',
      status: 'FULL',
      triggers: Object.freeze(['ON_ALLY_FAINT']),
      bearer: 'Alolan Muk (#10113), Alolan Grimer (#10112)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h7a-power-of-alchemy.test.js']),
      description: 'Herda a habilidade de um aliado quando ele é nocauteado em batalha de duplas. Não herda habilidades excluídas ou protegidas.'
    },
    'wandering-spirit': {
      id: 'wandering-spirit',
      name: 'Wandering Spirit',
      generation: 8,
      phase: 'H7',
      status: 'FULL',
      triggers: Object.freeze(['ON_CONTACT_DEFENSE']),
      bearer: 'Runerigus (#867), Galarian Yamask (#10179)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h7a-wandering-spirit.test.js']),
      description: 'Quando o portador é atingido por um ataque de contato, suas habilidades são trocadas com as do atacante de forma atômica. Respeita restrições canônicas de troca e Ability Shield.'
    },
    'neutralizing-gas': {
      id: 'neutralizing-gas',
      name: 'Neutralizing Gas',
      generation: 8,
      phase: 'H7',
      status: 'FULL',
      triggers: Object.freeze(['ON_ENTRY', 'ON_SWITCH', 'ON_FAINT']),
      bearer: 'Weezing (#110), Galarian Weezing (#10167), Koffing (#109)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: false,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h7a-neutralizing-gas.test.js']),
      description: 'Enquanto o portador estiver consciente e ativo em campo, neutraliza os efeitos de todas as habilidades passíveis de supressão de todos os combatentes. Não suprime habilidades especiais protegidas nem portadores de Ability Shield.'
    },
    'lingering-aroma': {
      id: 'lingering-aroma',
      name: 'Lingering Aroma',
      generation: 9,
      phase: 'H7',
      status: 'FULL',
      triggers: Object.freeze(['ON_CONTACT_DEFENSE']),
      bearer: 'Oinkologne (#916), Lechonk (#915)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h7a-lingering-aroma.test.js']),
      description: 'Quando o portador é atingido por um ataque que faz contato físico, a habilidade do agressor é alterada para Lingering Aroma. Não afeta habilidades protegidas ou portadores de Ability Shield.'
    },
    'soul-heart': {
      id: 'soul-heart',
      name: 'Soul-Heart',
      generation: 7,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_ANY_FAINT']),
      bearer: 'Magearna (#801, #10147)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h7a-soul-heart.test.js']),
      description: 'Aumenta o Special Attack do portador em 1 estágio (+1) sempre que qualquer outro Pokémon desmaia no campo de batalha, independentemente de quem causou o nocaute.'
    }
  };
  // Registry map
  const registry = new Map();

  // Populate known abilities from P7Data
  const knownAbilityNames = P7Data && P7Data.abilityNames ? P7Data.abilityNames : [];
  for (const slug of knownAbilityNames) {
    if (H1A_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H1A_METADATA[slug] }));
      continue;
    }

    if (H11_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H11_METADATA[slug] }));
      continue;
    }

    if (H2A_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H2A_METADATA[slug] }));
      continue;
    }

    if (H3A_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H3A_METADATA[slug] }));
      continue;
    }

    if (H4A_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H4A_METADATA[slug] }));
      continue;
    }

    if (H6A_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H6A_METADATA[slug] }));
      continue;
    }

    if (H6B_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H6B_METADATA[slug] }));
      continue;
    }

    if (H6C_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H6C_METADATA[slug] }));
      continue;
    }

    if (H6D_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H6D_METADATA[slug] }));
      continue;
    }

    if (H6E_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H6E_METADATA[slug] }));
      continue;
    }

    if (H6F_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H6F_METADATA[slug] }));
      continue;
    }

    if (H6G_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H6G_METADATA[slug] }));
      continue;
    }

    if (H7A_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H7A_METADATA[slug] }));
      continue;
    }

    const phase = phaseByAbility.get(slug) || (slug.startsWith('as-one') ? 'H1' : null);
    let status = 'PENDING';
    if (phase === 'H10') {
      status = 'BLOCKED_EXTERNAL_SYSTEM';
    }

    const formattedName = slug
      .split('-')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

    registry.set(slug, Object.freeze({
      id: slug,
      name: formattedName,
      generation: null,
      phase: phase,
      status: status,
      triggers: Object.freeze([]),
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze([]),
      description: ''
    }));
  }

  // Capability query functions
  function getAbility(id) {
    if (!id || typeof id !== 'string') return null;
    return registry.get(id.trim().toLowerCase()) || null;
  }

  function hasAbility(id) {
    if (!id || typeof id !== 'string') return false;
    return registry.has(id.trim().toLowerCase());
  }

  function getAllAbilities() {
    return Array.from(registry.values());
  }

  function getAbilitiesByPhase(phase) {
    if (!phase) return [];
    return getAllAbilities().filter(a => a.phase === phase);
  }

  function getAbilitiesByStatus(status) {
    if (!status) return [];
    return getAllAbilities().filter(a => a.status === status);
  }

  function isBreakable(id) {
    const entry = getAbility(id);
    return entry ? entry.breakable : true;
  }

  function isSuppressible(id) {
    const entry = getAbility(id);
    return entry ? entry.suppressible : true;
  }

  function isCopyable(id) {
    const entry = getAbility(id);
    return entry ? entry.copyable : true;
  }

  function isSwappable(id) {
    const entry = getAbility(id);
    return entry ? entry.swappable : true;
  }

  const api = Object.freeze({
    getAbility,
    hasAbility,
    getAllAbilities,
    getAbilitiesByPhase,
    getAbilitiesByStatus,
    isBreakable,
    isSuppressible,
    isCopyable,
    isSwappable
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (typeof window !== 'undefined') {
    window.AbilityRegistry = api;
  }
})();
