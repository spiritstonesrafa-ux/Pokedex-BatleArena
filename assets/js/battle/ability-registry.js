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
