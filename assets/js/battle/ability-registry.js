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
    'poison-touch': {
      id: 'poison-touch',
      name: 'Poison Touch',
      generation: 5,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_SOURCE_HIT']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-contact-reactions.test.js']),
      description: 'Movimentos ofensivos do usuário que fazem contato físico possuem 30% de chance canônica de envenenar o defensor. Bloqueado canonicamente por Shield Dust no alvo, imunidades de tipo Poison/Steel e Safeguard.'
    },
    'cute-charm': {
      id: 'cute-charm',
      name: 'Cute Charm',
      generation: 4,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_CONTACT_RECEIVED']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-contact-reactions.test.js']),
      description: 'Ao receber um movimento de contato físico de um atacante do sexo oposto, há 30% de chance canônica de causar atração (Infatuation). Ineficaz contra Pokémon do mesmo gênero, sem gênero (genderless) ou com Oblivious. Alvos atraídos têm 50% de chance de ficarem imobilizados de amor ao agir.'
    },
    'gooey': {
      id: 'gooey',
      name: 'Gooey',
      generation: 6,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_CONTACT_RECEIVED']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-contact-reactions.test.js']),
      description: 'Ao ser atingido por um movimento que faz contato físico, a Speed do atacante é reduzida em 1 estágio. Respeita Contrary, Simple, Clear Body, Mirror Armor e limites de estágios (-6 a +6).'
    },
    'tangling-hair': {
      id: 'tangling-hair',
      name: 'Tangling Hair',
      generation: 7,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_CONTACT_RECEIVED']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-contact-reactions.test.js']),
      description: 'Clone funcional de Gooey. Ao receber um ataque de contato físico, reduz a Speed do atacante em 1 estágio.'
    },
    'aftermath': {
      id: 'aftermath',
      name: 'Aftermath',
      generation: 4,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_DAMAGING_HIT_FAINT']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-faint-reactions.test.js']),
      description: 'Se o portador for nocauteado por um ataque de contato físico, o atacante sofre dano equivalente a 1/4 (25%) do seu HP máximo. Anulado pela presença de Damp ou Magic Guard no atacante.'
    },
    'innards-out': {
      id: 'innards-out',
      name: 'Innards Out',
      generation: 7,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_DAMAGING_HIT_FAINT']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-faint-reactions.test.js']),
      description: 'Ao ser nocauteado por dano de qualquer ataque ofensivo (contato ou projétil/especial), o atacante sofre dano idêntico ao HP que o portador possuía imediatamente antes do golpe fatal. Não afeta alvos com Magic Guard.'
    },
    'perish-body': {
      id: 'perish-body',
      name: 'Perish Body',
      generation: 8,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_CONTACT_RECEIVED']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-faint-reactions.test.js']),
      description: 'Ao sofrer um movimento de contato físico, inicia uma contagem regressiva de Perish Song de 3 turnos para ambos os Pokémon (atacante e defensor). Ambos desmaiam ao término da contagem, salvo se forem substituídos antes.'
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
    },
    'hydration': {
      id: 'hydration',
      name: 'Hydration',
      generation: 4,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_RESIDUAL']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-status-weather.test.js']),
      description: 'No final de cada turno sob clima de chuva (Rain), o portador cura qualquer condição primária de status (Burn, Poison, Toxic, Paralysis, Sleep, Freeze).'
    },
    'leaf-guard': {
      id: 'leaf-guard',
      name: 'Leaf Guard',
      generation: 4,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_SET_STATUS']),
      breakable: true, // Mold Breaker can bypass Leaf Guard when inflicting status
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-status-weather.test.js']),
      description: 'Sob sol intenso (Sun), o portador é imune a receber novas condições primárias de status infligidas por movimentos ou itens de terceiros. Também faz o movimento Rest falhar sob sol.'
    },
    'early-bird': {
      id: 'early-bird',
      name: 'Early Bird',
      generation: 2,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_BEFORE_MOVE']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-status-weather.test.js']),
      description: 'O portador desperta do sono (Sleep) duas vezes mais rápido: os turnos de sono são consumidos de 2 em 2 a cada rodada.'
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
    'liquid-ooze': {
      id: 'liquid-ooze',
      name: 'Liquid Ooze',
      generation: 3,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_SOURCE_TRY_HEAL']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-draining-protections.test.js']),
      description: 'Inverte a recuperação de movimentos e efeitos de drenagem de HP (Drain Punch, Giga Drain, Leech Life, etc.) utilizados contra o portador: em vez de recuperar vida, o atacante sofre dano equivalente à quantia que curaria.'
    },
    'poison-heal': {
      id: 'poison-heal',
      name: 'Poison Heal',
      generation: 4,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_RESIDUAL_DAMAGE']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-status-weather.test.js']),
      description: 'Se o portador estiver envenenado (Poison ou Toxic), recupera 1/8 (12.5%) do seu HP máximo ao final do turno em vez de sofrer dano residual de veneno.'
    },
    'bad-dreams': {
      id: 'bad-dreams',
      name: 'Bad Dreams',
      generation: 4,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_RESIDUAL']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-status-weather.test.js']),
      description: 'Ao final de cada turno, qualquer oponente em campo que estiver adormecido (Sleep) sofre dano residual equivalente a 1/8 (12.5%) do seu HP máximo.'
    },
    'stench': {
      id: 'stench',
      name: 'Stench',
      generation: 3,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_MOVE']),
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-draining-protections.test.js']),
      description: 'Concede 10% de chance canônica de causar atordoamento (Flinch) ao atingir o alvo com qualquer movimento ofensivo de dano que não possua chance natural de flinch.'
    },
    'shield-dust': {
      id: 'shield-dust',
      name: 'Shield Dust',
      generation: 3,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_SECONDARIES']),
      breakable: true, // Ignored by Mold Breaker
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-draining-protections.test.js']),
      description: 'Bloqueia completamente todos os efeitos secundários de movimentos de dano adversários direcionados ao portador (status, flinch, reduções de atributo e Poison Touch). Efeitos no próprio atacante (ex: Ancient Power) continuam operando.'
    },
    'big-pecks': {
      id: 'big-pecks',
      name: 'Big Pecks',
      generation: 5,
      phase: 'H3',
      status: 'FULL',
      triggers: Object.freeze(['ON_TRY_BOOST']),
      breakable: true, // Ignored by Mold Breaker
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h3a-draining-protections.test.js']),
      description: 'Impede que a Defense do portador seja reduzida por movimentos ou habilidades de outros Pokémon. Não previne reduções autoinfligidas (ex: Close Combat) ou inversões via Contrary.'
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

  const H1B_METADATA = {
    'defiant': {
      id: 'defiant',
      name: 'Defiant',
      generation: 5,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_STAT_DROP']),
      bearer: 'Kingambit (#983), Bisharp (#625), Primeape (#57)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1b-defiant.test.js']),
      description: 'Aumenta o Ataque em 2 estágios (+2) sempre que qualquer atributo do portador for reduzido por uma ação ou efeito de um adversário.'
    },
    'competitive': {
      id: 'competitive',
      name: 'Competitive',
      generation: 6,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_STAT_DROP']),
      bearer: 'Wigglytuff (#40), Milotic (#350), Kilowattrel (#941)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1b-competitive.test.js']),
      description: 'Aumenta o Ataque Especial em 2 estágios (+2) sempre que qualquer atributo do portador for reduzido por uma ação ou efeito de um adversário.'
    },
    'contrary': {
      id: 'contrary',
      name: 'Contrary',
      generation: 5,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_STAT_STAGE_CHANGE']),
      bearer: 'Serperior (#497), Malamar (#687), Lurantis (#754), Enamorus (#905)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1b-contrary.test.js']),
      description: 'Inverte todas as alterações de estágios de atributos recebidas pelo portador: aumentos tornam-se reduções e reduções tornam-se aumentos.'
    },
    'mirror-armor': {
      id: 'mirror-armor',
      name: 'Mirror Armor',
      generation: 8,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_STAT_DROP']),
      bearer: 'Corviknight (#823)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1b-mirror-armor.test.js']),
      description: 'Reflete de volta para o atacante adversário quaisquer reduções de atributos que ele tente infligir ao portador.'
    },
    'opportunist': {
      id: 'opportunist',
      name: 'Opportunist',
      generation: 9,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_FOE_STAT_BOOST']),
      bearer: 'Espathra (#956), Flittle (#955)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1b-opportunist.test.js']),
      description: 'Copia imediatamente quaisquer aumentos de atributos obtidos por um oponente ativo no campo.'
    },
    'guard-dog': {
      id: 'guard-dog',
      name: 'Guard Dog',
      generation: 9,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_TRY_STAT_DROP', 'ON_FORCED_SWITCH']),
      bearer: 'Mabosstiff (#943), Maschiff (#942), Okidogi (#1014)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1b-guard-dog.test.js']),
      description: 'Imune a trocas forçadas. Além disso, ao ser alvo de Intimidate, seu Ataque é aumentado em 1 estágio em vez de ser reduzido.'
    },
    'anger-point': {
      id: 'anger-point',
      name: 'Anger Point',
      generation: 4,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['AFTER_DAMAGING_HIT']),
      bearer: 'Tauros (#128), Primeape (#57), Krookodile (#553), Crabominable (#740)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1b-anger-point.test.js']),
      description: 'Ao sofrer um golpe crítico de dano direto, eleva imediatamente o Ataque ao estágio máximo (+6).'
    },
    'rattled': {
      id: 'rattled',
      name: 'Rattled',
      generation: 5,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['AFTER_DAMAGING_HIT', 'ON_STAT_DROP']),
      bearer: 'Dunsparce (#206), Dudunsparce (#982), Magikarp (#129), Granbull (#210)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1b-rattled.test.js']),
      description: 'Aumenta a Velocidade em 1 estágio ao ser atingido por ataques dos tipos Bug, Ghost ou Dark, ou ao ser intimidado.'
    }
  };

  const H1C_METADATA = {
    'stamina': {
      id: 'stamina',
      name: 'Stamina',
      generation: 7,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['AFTER_DAMAGING_HIT']),
      bearer: 'Mudbray (#749), Mudsdale (#750)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1c-stamina.test.js']),
      description: 'Aumenta a Defesa em 1 estágio (+1) sempre que o portador sofre dano direto de um ataque.'
    },
    'water-compaction': {
      id: 'water-compaction',
      name: 'Water Compaction',
      generation: 7,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['AFTER_DAMAGING_HIT']),
      bearer: 'Sandygast (#769), Palossand (#770)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1c-water-compaction.test.js']),
      description: 'Aumenta a Defesa em 2 estágios (+2) ao ser atingido por um movimento do tipo Water que cause dano.'
    },
    'weak-armor': {
      id: 'weak-armor',
      name: 'Weak Armor',
      generation: 5,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['AFTER_DAMAGING_HIT']),
      bearer: 'Skarmory (#227), Polteageist (#855), Armarouge (#935)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1c-weak-armor.test.js']),
      description: 'Ao receber dano de um ataque físico, reduz a Defesa em 1 estágio e aumenta a Velocidade em 2 estágios.'
    },
    'steam-engine': {
      id: 'steam-engine',
      name: 'Steam Engine',
      generation: 8,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['AFTER_DAMAGING_HIT']),
      bearer: 'Rolycoly (#837), Carkol (#838), Coalossal (#839)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1c-steam-engine.test.js']),
      description: 'Ao sofrer dano de um ataque do tipo Fire ou Water, sua Velocidade aumenta em 6 estágios (+6).'
    },
    'motor-drive': {
      id: 'motor-drive',
      name: 'Motor Drive',
      generation: 4,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_TRY_HIT']),
      bearer: 'Electivire (#466), Blitzle (#522), Zebstrika (#523)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1c-motor-drive.test.js']),
      description: 'Concede imunidade a movimentos do tipo Electric e aumenta a Velocidade em 1 estágio (+1) ao ser alvejado por um.'
    },
    'electromorphosis': {
      id: 'electromorphosis',
      name: 'Electromorphosis',
      generation: 9,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['AFTER_DAMAGING_HIT', 'MODIFY_POWER']),
      bearer: 'Bellibolt (#939)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1c-electromorphosis.test.js']),
      description: 'Ao receber dano de um ataque direto, o portador ganha o estado Charge, dobrando o poder do seu próximo ataque do tipo Electric.'
    },
    'berserk': {
      id: 'berserk',
      name: 'Berserk',
      generation: 7,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['AFTER_DAMAGING_HIT']),
      bearer: 'Drampa (#780), Galarian Moltres (#10173)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1c-berserk.test.js']),
      description: 'Aumenta o Ataque Especial em 1 estágio (+1) quando o HP cai para 50% ou menos após sofrer um ataque.'
    },
    'anger-shell': {
      id: 'anger-shell',
      name: 'Anger Shell',
      generation: 9,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['AFTER_DAMAGING_HIT']),
      bearer: 'Klawf (#950)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1c-anger-shell.test.js']),
      description: 'Quando o HP cai para 50% ou menos por um ataque, aumenta Attack, Sp. Atk e Speed em +1, e reduz Defense e Sp. Def em -1.'
    }
  };

  // H1-D Implemented Abilities (FULL status)
  const H1D_METADATA = {
    'beast-boost': {
      id: 'beast-boost',
      name: 'Beast Boost',
      generation: 7,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_DIRECT_KO']),
      bearer: 'Nihilego (#793), Buzzwole (#794), Pheromosa (#795), Xurkitree (#796), Celesteela (#797), Kartana (#798), Guzzlord (#799), Poipole (#803), Naganadel (#804), Stakataka (#805), Blacephalon (#806)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1d-beast-boost.test.js']),
      description: 'Aumenta em +1 estágio o maior atributo efetivo elegível (Attack, Defense, Sp. Atk, Sp. Def ou Speed) ao nocautear diretamente um oponente com um ataque. Desempate canônico: Atk > Def > SpA > SpD > Spe.'
    },
    'cotton-down': {
      id: 'cotton-down',
      name: 'Cotton Down',
      generation: 8,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['AFTER_DAMAGING_HIT']),
      bearer: 'Gossifleur (#829), Eldegoss (#830)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1d-cotton-down.test.js']),
      description: 'Ao sofrer dano de um ataque direto, reduz a Velocidade de todos os outros Pokémon ativos em campo em 1 estágio (-1), incluindo aliados em duplas.'
    },
    'download': {
      id: 'download',
      name: 'Download',
      generation: 4,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_ENTRY']),
      bearer: 'Porygon (#137), Porygon2 (#233), Porygon-Z (#474), Genesect (#649)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1d-download.test.js']),
      description: 'Na entrada em campo, compara a soma das Defesas física e especial dos adversários ativos: se a Defesa for maior ou igual à Defesa Especial, ganha +1 Special Attack; se a Defesa Especial for maior, ganha +1 Attack.'
    },
    'moody': {
      id: 'moody',
      name: 'Moody',
      generation: 5,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_RESIDUAL_END']),
      bearer: 'Smeargle (#235), Octillery (#224), Glalie (#362), Bibarel (#400), Scovillain (#951)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1d-moody.test.js']),
      description: 'No final de cada turno, escolhe aleatoriamente um atributo para aumentar em +2 estágios e outro para reduzir em -1 estágio (excluindo Precisão e Evasão na Gen IX). Respeita RNG determinístico.'
    },
    'speed-boost': {
      id: 'speed-boost',
      name: 'Speed Boost',
      generation: 3,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_RESIDUAL_END']),
      bearer: 'Ninjask (#291), Yanma (#193), Yanmega (#469), Blaziken (#257), Venipede (#543), Whirlipede (#544), Scolipede (#545), Espurr (#677)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1d-speed-boost.test.js']),
      description: 'Aumenta a Velocidade em 1 estágio (+1) ao final de cada turno em que o portador esteve ativo em campo (não ativa no turno em que entra por troca).'
    },
    'thermal-exchange': {
      id: 'thermal-exchange',
      name: 'Thermal Exchange',
      generation: 9,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_STATUS_CHECK', 'AFTER_DAMAGING_HIT']),
      bearer: 'Frigibax (#996), Arctibax (#997), Baxcalibur (#998)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1d-thermal-exchange.test.js']),
      description: 'Imunidade a queimadura (cura queimaduras pré-existentes na ativação). Ao sofrer dano de um ataque do tipo Fire, aumenta seu Ataque em 1 estágio (+1).'
    },
    'wind-power': {
      id: 'wind-power',
      name: 'Wind Power',
      generation: 9,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['AFTER_DAMAGING_HIT', 'ON_TAILWIND', 'MODIFY_POWER']),
      bearer: 'Wattrel (#940), Kilowattrel (#941)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1d-wind-power.test.js']),
      description: 'Ao sofrer dano de um ataque com flag de vento ou quando Tailwind é ativado no seu lado do campo, ganha o estado Charge, dobrando o poder do seu próximo ataque Electric.'
    },
    'wind-rider': {
      id: 'wind-rider',
      name: 'Wind Rider',
      generation: 9,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_TRY_HIT', 'ON_TAILWIND', 'ON_ENTRY']),
      bearer: 'Bramblin (#946), Brambleghast (#947)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h1d-wind-rider.test.js']),
      description: 'Concede imunidade a movimentos com a flag de vento e aumenta o Ataque em 1 estágio (+1) ao ser alvejado por um ou quando Tailwind é ativado (ou já está ativo ao entrar em campo).'
    }
  };

  // H2-A / H1-E Implemented Abilities (FULL status)
  const H2A_OFFENSIVE_METADATA = {
    'supreme-overlord': {
      id: 'supreme-overlord',
      name: 'Supreme Overlord',
      generation: 9,
      phase: 'H1',
      status: 'FULL',
      triggers: Object.freeze(['ON_ENTRY', 'MODIFY_POWER']),
      bearer: 'Kingambit (#983)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2a-supreme-overlord.test.js']),
      description: 'Ao entrar em campo, o portador ganha um bônus que aumenta o poder base dos seus golpes de acordo com a quantidade de aliados derrotados na sua equipe naquele combate (até 5 aliados, com multiplicadores canônicos [4096, 4506, 4915, 5325, 5734, 6144]/4096).'
    },
    'iron-fist': {
      id: 'iron-fist',
      name: 'Iron Fist',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_POWER']),
      bearer: 'Hitmonchan (#107), Ledian (#166), Infernape (#392), Golurk (#623), Pangoro (#675), Crabominable (#740), Melmetal (#809), Pawmot (#923)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2a-iron-fist.test.js']),
      description: 'Multiplica o poder de movimentos com a flag de soco (punch) por 4915/4096 (aprox. 1.2×).'
    },
    'strong-jaw': {
      id: 'strong-jaw',
      name: 'Strong Jaw',
      generation: 6,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_POWER']),
      bearer: 'Tyrantrum (#697), Bruxish (#779), Drednaw (#834), Dracovish (#882), Boltund (#836)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2a-strong-jaw.test.js']),
      description: 'Multiplica o poder de movimentos com a flag de mordida (bite) por 1.5×.'
    },
    'tough-claws': {
      id: 'tough-claws',
      name: 'Tough Claws',
      generation: 6,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_POWER']),
      bearer: 'Barbaracle (#689), Perrserker (#863), Lycanroc-Dusk (#745-Dusk)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2a-tough-claws.test.js']),
      description: 'Multiplica o poder de movimentos que fazem contato físico (flag contact) por 5325/4096 (aprox. 1.3×).'
    },
    'sharpness': {
      id: 'sharpness',
      name: 'Sharpness',
      generation: 9,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_POWER']),
      bearer: 'Gallade (#475), Samurott-Hisui (#503-Hisui), Kleavor (#900), Veluza (#976), Iron Valiant (#1006)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2a-sharpness.test.js']),
      description: 'Multiplica o poder de movimentos com a flag cortante (slicing) por 1.5×.'
    },
    'mega-launcher': {
      id: 'mega-launcher',
      name: 'Mega Launcher',
      generation: 6,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_POWER']),
      bearer: 'Clauncher (#692), Clawitzer (#693)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2a-mega-launcher.test.js']),
      description: 'Multiplica o poder de movimentos de aura e pulso (flag pulse) por 1.5×.'
    },
    'steelworker': {
      id: 'steelworker',
      name: 'Steelworker',
      generation: 7,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_OFFENSIVE_STAT']),
      bearer: 'Dhelmise (#781)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2a-steelworker.test.js']),
      description: 'Multiplica os atributos ofensivos (Attack e Special Attack) do portador por 1.5× ao executar movimentos do tipo Steel.'
    },
    'rocky-payload': {
      id: 'rocky-payload',
      name: 'Rocky Payload',
      generation: 9,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_OFFENSIVE_STAT']),
      bearer: 'Bombirdier (#962)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2a-rocky-payload.test.js']),
      description: 'Multiplica os atributos ofensivos (Attack e Special Attack) do portador por 1.5× ao executar movimentos do tipo Rock.'
    }
  };
  // H2-B Implemented Abilities (FULL status: Critical & Accuracy mechanics)
  const H2B_CRIT_ACCURACY_METADATA = {
    'battle-armor': {
      id: 'battle-armor',
      name: 'Battle Armor',
      generation: 3,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_CRITICAL_HIT']),
      bearer: 'Kabuto (#140), Kabutops (#141), Armaldo (#348), Skorupi (#451), Drapion (#452), Type: Null (#772), Falinks (#870)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2b-battle-armor.test.js']),
      description: 'Protege o portador contra golpes críticos recebidos. Pode ser quebrada por Mold Breaker, Teravolt e Turboblaze (salvo Ability Shield).'
    },
    'shell-armor': {
      id: 'shell-armor',
      name: 'Shell Armor',
      generation: 3,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_CRITICAL_HIT']),
      bearer: 'Shellder (#90), Cloyster (#91), Lapras (#131), Omanyte (#138), Omastar (#139), Corphish (#341), Crawdaunt (#342), Clamperl (#366), Torkoal (#324), Torterra (#389), Samurott (#503), Escavalier (#589), Drednaw (#834), Klawf (#950)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2b-shell-armor.test.js']),
      description: 'Protege o portador contra golpes críticos recebidos. Compartilha as regras canônicas de Battle Armor, sendo ignorada por Mold Breaker.'
    },
    'super-luck': {
      id: 'super-luck',
      name: 'Super Luck',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_CRIT_RATIO']),
      bearer: 'Murkrow (#198), Honchkrow (#430), Absol (#359), Togepi (#175), Togetic (#176), Togekiss (#468), Tranquill (#520), Unfezant (#521)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2b-super-luck.test.js']),
      description: 'Aumenta em 1 estágio (+1) a taxa de acertos críticos dos movimentos executados pelo portador.'
    },
    'sniper': {
      id: 'sniper',
      name: 'Sniper',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_CRIT_DAMAGE']),
      bearer: 'Beedrill (#15), Spearow (#21), Fearow (#22), Horsea (#116), Seadra (#117), Kingdra (#230), Remoraid (#223), Octillery (#224), Skorupi (#451), Drapion (#452), Binacle (#688), Barbaracle (#689), Inteleon (#818), Spidops (#918)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2b-sniper.test.js']),
      description: 'Amplifica em 1.5× o dano de acertos críticos efetuados pelo portador (multiplicador crítico efetivo de 2.25× em vez de 1.5×).'
    },
    'merciless': {
      id: 'merciless',
      name: 'Merciless',
      generation: 7,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_CRIT_RATIO']),
      bearer: 'Mareanie (#747), Toxapex (#748)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2b-merciless.test.js']),
      description: 'Garante acerto crítico automático para ataques contra alvos que estejam envenenados (Poison) ou gravemente envenenados (Toxic).'
    },
    'compound-eyes': {
      id: 'compound-eyes',
      name: 'Compound Eyes',
      generation: 3,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_ACCURACY']),
      bearer: 'Butterfree (#12), Venonat (#48), Yanma (#193), Nincada (#290), Joltik (#595), Galvantula (#596), Scatterbug (#664), Vivillon (#666), Blipbug (#824), Dottler (#825)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2b-compound-eyes.test.js']),
      description: 'Multiplica por 5325/4096 (aprox. 1.3×) a precisão de movimentos com precisão numérica executados pelo portador.'
    },
    'no-guard': {
      id: 'no-guard',
      name: 'No Guard',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['BYPASS_ACCURACY', 'BYPASS_SEMI_INVULNERABILITY']),
      bearer: 'Machop (#66), Machoke (#67), Machamp (#68), Karrablast (#588), Honedge (#679), Doublade (#680), Lycanroc-Midnight (#745-Midnight)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2b-no-guard.test.js']),
      description: 'Faz com que todos os movimentos executados pelo portador ou direcionados ao portador ignorem as verificações de precisão e evasão e possam atingir turnos semi-invulneráveis (Fly, Dig, Dive, etc.). Não ignora Protect nem imunidades de tipo.'
    },
    'tangled-feet': {
      id: 'tangled-feet',
      name: 'Tangled Feet',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['MODIFY_ACCURACY']),
      bearer: 'Pidgey (#16), Pidgeotto (#17), Pidgeot (#18), Spinda (#327), Chatot (#441)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2b-tangled-feet.test.js']),
      description: 'Enquanto o portador estiver confuso, a precisão de movimentos direcionados a ele é multiplicada por 0.5 (reduzida pela metade). Ignorada por Mold Breaker.'
    }
  };

  const H2C_DAMAGE_METADATA = {
    'fur-coat': {
      id: 'fur-coat',
      name: 'Fur Coat',
      generation: 6,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_DEF']),
      bearer: 'Furfrou (#676), Persian-Alola (#10108)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2c-fur-coat.test.js']),
      description: 'Dobra o atributo Defense efetivo do portador. Ignorada por Mold Breaker.'
    },
    'fluffy': {
      id: 'fluffy',
      name: 'Fluffy',
      generation: 7,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_SOURCE_MODIFY_DAMAGE']),
      bearer: 'Stufful (#759), Bewear (#760), Wooloo (#831), Dubwool (#832)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2c-fluffy.test.js']),
      description: 'Reduz o dano recebido de golpes de contato por 0.5x, mas dobra o dano recebido de golpes de Fogo (golpes de contato de Fogo causam dano normal 1x). Ignorada por Mold Breaker.'
    },
    'ice-scales': {
      id: 'ice-scales',
      name: 'Ice Scales',
      generation: 8,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_SOURCE_MODIFY_DAMAGE']),
      bearer: 'Snom (#872), Frosmoth (#873)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2c-ice-scales.test.js']),
      description: 'Reduz pela metade o dano recebido de movimentos de categoria Special. Ignorada por Mold Breaker.'
    },
    'heatproof': {
      id: 'heatproof',
      name: 'Heatproof',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_SOURCE_MODIFY_DAMAGE', 'ON_DAMAGE_RESIDUAL']),
      bearer: 'Bronzor (#436), Bronzong (#437), Sinistea (#854), Polteageist (#855), Sinistcha (#1013)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2c-heatproof.test.js']),
      description: 'Reduz pela metade o dano de ataques de Fogo e o dano residual da queimadura (Burn). Ignorada por Mold Breaker.'
    },
    'shadow-shield': {
      id: 'shadow-shield',
      name: 'Shadow Shield',
      generation: 7,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_SOURCE_MODIFY_DAMAGE']),
      bearer: 'Lunala (#792)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: false,
      swappable: false,
      testFiles: Object.freeze(['tests/battle/abilities-h2c-shadow-shield.test.js']),
      description: 'Reduz pela metade o dano sofrido quando o portador está com HP cheio (100%). Não pode ser ignorada por Mold Breaker, Teravolt ou Turboblaze.'
    },
    'water-bubble': {
      id: 'water-bubble',
      name: 'Water Bubble',
      generation: 7,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_ATK', 'ON_MODIFY_SPA', 'ON_SOURCE_MODIFY_DAMAGE', 'ON_SET_STATUS']),
      bearer: 'Dewpider (#751), Araquanid (#752)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2c-water-bubble.test.js']),
      description: 'Dobra o poder ofensivo de golpes de Água, reduz pela metade o dano de golpes de Fogo recebidos e concede imunidade e cura imediata contra Burn. Ignorada por Mold Breaker.'
    },
    'punk-rock': {
      id: 'punk-rock',
      name: 'Punk Rock',
      generation: 8,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_BASE_POWER', 'ON_SOURCE_MODIFY_DAMAGE']),
      bearer: 'Toxel (#848), Toxtricity (#849), Toxtricity-Low-Key (#10169)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2c-punk-rock.test.js']),
      description: 'Aumenta o poder de movimentos sonoros usados pelo portador em ~1.3x (5325/4096) e reduz pela metade o dano recebido de movimentos sonoros. Ignorada por Mold Breaker na defesa.'
    },
    'tinted-lens': {
      id: 'tinted-lens',
      name: 'Tinted Lens',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_DAMAGE']),
      bearer: 'Butterfree (#12), Venomoth (#49), Noctowl (#164), Illumise (#314), Mothim (#414), Yanmega (#469), Sigilyph (#561), Lokix (#919)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2c-tinted-lens.test.js']),
      description: 'Dobra o dano de ataques que seriam pouco efetivos (eficácia < 1 e > 0). Não afeta imunidades de tipo.'
    }
  };

  const H2D_DAMAGE_METADATA = {
    'reckless': {
      id: 'reckless',
      name: 'Reckless',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_BASE_POWER']),
      bearer: 'Hitmonlee (#106), Rhyhorn (#111), Rhydon (#112), Rhyperior (#464), Staraptor (#398), Emboar (#500), Bouffalant (#626), Basculin (#550)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2d-reckless.test.js']),
      description: 'Aumenta em 1.2x (4915/4096) o poder de movimentos que causam dano de recuo (recoil) ou dano por colisão (crash).'
    },
    'rock-head': {
      id: 'rock-head',
      name: 'Rock Head',
      generation: 3,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_DAMAGE_RECOIL']),
      bearer: 'Geodude (#074), Graveler (#075), Golem (#076), Onix (#095), Cubone (#104), Marowak (#105), Aerodactyl (#142), Steelix (#208), Aggron (#304), Relicanth (#369), Bagon (#371), Shelgon (#372), Basculin-Blue-Striped (#10016)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2d-rock-head.test.js']),
      description: 'Protege o portador contra o dano de recuo de seus próprios movimentos (exceto Struggle).'
    },
    'toxic-boost': {
      id: 'toxic-boost',
      name: 'Toxic Boost',
      generation: 5,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_BASE_POWER']),
      bearer: 'Zangoose (#335)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2d-toxic-boost.test.js']),
      description: 'Aumenta em 1.5x o poder base de movimentos físicos quando o portador está envenenado (Poison ou Toxic).'
    },
    'flare-boost': {
      id: 'flare-boost',
      name: 'Flare Boost',
      generation: 5,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_BASE_POWER']),
      bearer: 'Drifloon (#425), Drifblim (#426)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2d-flare-boost.test.js']),
      description: 'Aumenta em 1.5x o poder base de movimentos especiais quando o portador está sob queimadura (Burn).'
    },
    'analytic': {
      id: 'analytic',
      name: 'Analytic',
      generation: 5,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_BASE_POWER']),
      bearer: 'Magnemite (#081), Magneton (#082), Magnezone (#462), Staryu (#120), Starmie (#121), Porygon (#137), Porygon2 (#233), Porygon-Z (#474), Beheeyem (#606)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2d-analytic.test.js']),
      description: 'Aumenta o poder dos movimentos em 5325/4096 (~1.3x) se o portador agir por último ou após o alvo ter agido/entrado no turno.'
    },
    'stakeout': {
      id: 'stakeout',
      name: 'Stakeout',
      generation: 7,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_STAT_MODIFY', 'ON_MODIFY_ATK', 'ON_MODIFY_SPA']),
      bearer: 'Yungoos (#734), Gumshoos (#735), Mabosstiff (#943)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2d-stakeout.test.js']),
      description: 'Dobra o atributo ofensivo (Attack ou Special Attack) ao atacar um alvo que acabou de entrar em campo (trocou no mesmo turno).'
    },
    'defeatist': {
      id: 'defeatist',
      name: 'Defeatist',
      generation: 5,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_ATK', 'ON_MODIFY_SPA']),
      bearer: 'Archen (#566), Archeops (#567)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2d-defeatist.test.js']),
      description: 'Reduz pela metade (0.5x) o Attack e Special Attack do portador quando seu HP cai para 50% ou menos.'
    },
    'gorilla-tactics': {
      id: 'gorilla-tactics',
      name: 'Gorilla Tactics',
      generation: 8,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_ATK', 'ON_DISABLE_MOVE']),
      bearer: 'Darmanitan-Galar (#10177)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2d-gorilla-tactics.test.js']),
      description: 'Aumenta o Attack físico em 1.5x, mas restringe o portador a usar apenas o primeiro golpe selecionado até que seja trocado.'
    }
  };

  const H2E_METADATA = {
    'illuminate': {
      id: 'illuminate',
      name: 'Illuminate',
      generation: 3,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_TRY_BOOST', 'ON_MODIFY_MOVE']),
      bearer: 'Staryu (#120), Starmie (#121), Chinchou (#170), Lanturn (#171), Volbeat (#313), Watchog (#505), Morelull (#755), Shiinotic (#756)',
      ruleset: 'Gen IX SV / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2e-illuminate.test.js']),
      description: 'Impede que a Precisão do portador seja reduzida por oponentes e ignora modificadores de Evasão do alvo.'
    },
    'skill-link': {
      id: 'skill-link',
      name: 'Skill Link',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_MOVE']),
      bearer: 'Shellder (#090), Cloyster (#091), Aipom (#190), Ambipom (#424), Minccino (#572), Cinccino (#573), Pikipek (#731), Trumbeak (#732), Toucannon (#733)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2e-skill-link.test.js']),
      description: 'Garante o número máximo de acertos para golpes multi-hit com número variável de golpes.'
    },
    'quick-feet': {
      id: 'quick-feet',
      name: 'Quick Feet',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_SPE']),
      bearer: 'Ursaring (#217), Teddiursa (#216), Jolteon (#135), Granbull (#210), Poochyena (#261), Mightyena (#262), Shroomish (#285), Zigzagoon (#263), Linoone (#264)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2e-quick-feet.test.js']),
      description: 'Aumenta a Velocidade em 1.5x quando o portador sofre de uma condição de status e ignora a perda de velocidade de paralisia.'
    },
    'unaware': {
      id: 'unaware',
      name: 'Unaware',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_ANY_MODIFY_BOOST']),
      bearer: 'Clefable (#036), Wooper (#194), Quagsire (#195), Bidoof (#399), Bibarel (#400), Swoobat (#528), Cosmog (#789), Cosmoem (#790), Skeledirge (#911), Clodsire (#980), Dondozo (#977)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2e-unaware.test.js']),
      description: 'Ao atacar, ignora aumentos de Defesa/Sp. Def e Evasão do defensor; ao defender, ignora aumentos de Ataque/Sp. Atk e Precisão do atacante.'
    },
    'sheer-force': {
      id: 'sheer-force',
      name: 'Sheer Force',
      generation: 5,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_BASE_POWER', 'ON_MODIFY_MOVE']),
      bearer: 'Nidoqueen (#031), Nidoking (#034), Krabby (#098), Kingler (#099), Tauros (#128), Feraligatr (#160), Steelix (#208), Hariyama (#297), Mawile (#303), Bagon (#371), Cranidos (#408), Rampardos (#409), Darmanitan (#555), Landorus (#645), Copperajah (#879), Cetitan (#975)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2e-sheer-force.test.js']),
      description: 'Aumenta em 1.3x (5325/4096) o poder de movimentos com efeitos secundários, removendo esses efeitos e o dano de recuo de Life Orb.'
    },
    'heavy-metal': {
      id: 'heavy-metal',
      name: 'Heavy Metal',
      generation: 5,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_WEIGHT']),
      bearer: 'Aron (#304), Lairon (#305), Aggron (#306), Bronzor (#436), Bronzong (#437), Cufant (#878), Copperajah (#879), Duraludon (#884), Archaludon (#1024)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2e-heavy-metal.test.js']),
      description: 'Dobra o peso corporal efetivo do Pokémon em batalha, influenciando movimentos baseados em peso.'
    },
    'light-metal': {
      id: 'light-metal',
      name: 'Light Metal',
      generation: 5,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_WEIGHT']),
      bearer: 'Scizor (#212), Beldum (#374), Metang (#375), Metagross (#376), Registeel (#379), Duraludon (#884)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2e-light-metal.test.js']),
      description: 'Reduz pela metade o peso corporal efetivo do Pokémon em batalha, influenciando movimentos baseados em peso.'
    },
    'rivalry': {
      id: 'rivalry',
      name: 'Rivalry',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_BASE_POWER']),
      bearer: 'Nidoran-F (#029), Nidorina (#030), Nidoqueen (#031), Nidoran-M (#032), Nidorino (#033), Nidoking (#034), Shinx (#403), Luxio (#404), Luxray (#405), Pidove (#519), Tranquill (#520), Unfezant (#521), Axew (#610), Fraxure (#611), Haxorus (#612), Litleo (#667), Pyroar (#668)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2e-rivalry.test.js']),
      description: 'Aumenta o poder dos golpes em 1.25x contra adversários do mesmo gênero e reduz em 0.75x contra gênero oposto (neutro se sem gênero).'
    },
    'minds-eye': {
      id: 'minds-eye',
      name: "Mind's Eye",
      generation: 9,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_TRY_BOOST', 'ON_MODIFY_MOVE']),
      bearer: 'Ursaluna-Bloodmoon (#10272)',
      ruleset: 'Gen IX SV / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2e-minds-eye.test.js']),
      description: 'Permite que movimentos Normal e Fighting atinjam Pokémon Ghost com dano neutro; impede a perda de Precisão e ignora Evasão adversária.'
    },
    'long-reach': {
      id: 'long-reach',
      name: 'Long Reach',
      generation: 7,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_MOVE']),
      bearer: 'Rowlet (#722), Dartrix (#723), Decidueye (#724)',
      ruleset: 'Gen IX / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2e-long-reach.test.js']),
      description: 'Executa todos os movimentos sem fazer contato físico com o alvo, evitando efeitos adversos de contato.'
    }
  };

  const H2F_METADATA = {
    'scrappy': {
      id: 'scrappy',
      name: 'Scrappy',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_EFFECTIVENESS', 'ON_TRY_BOOST']),
      bearer: 'Kangaskhan (#115), Miltank (#241), Taillow (#276), Swellow (#277), Lopunny (#428), Pancham (#674), Pangoro (#675), Decidueye-Hisui (#10244), Flamigo (#973)',
      ruleset: 'Gen IX SV / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2f-scrappy.test.js']),
      description: 'Permite que movimentos Normal e Fighting atinjam Pokémon do tipo Ghost com dano neutro e concede imunidade à redução de Ataque causada por Intimidate.'
    },
    'serene-grace': {
      id: 'serene-grace',
      name: 'Serene Grace',
      generation: 3,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_MODIFY_MOVE']),
      bearer: 'Chansey (#113), Blissey (#242), Togepi (#175), Togetic (#176), Togekiss (#468), Dunsparce (#206), Dudunsparce (#982), Jirachi (#385), Meloetta-Pirouette (#10018), Deerling (#585), Sawsbuck (#586), Happiny (#440)',
      ruleset: 'Gen IX SV / Pokémon Showdown data/abilities.ts',
      breakable: false,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2f-serene-grace.test.js']),
      description: 'Duplica a probabilidade de ativação dos efeitos secundários elegíveis causados pelos movimentos do usuário.'
    },
    'simple': {
      id: 'simple',
      name: 'Simple',
      generation: 4,
      phase: 'H2',
      status: 'FULL',
      triggers: Object.freeze(['ON_CHANGE_BOOST', 'ON_MODIFY_BOOST']),
      bearer: 'Numel (#322), Bidoof (#399), Bibarel (#400), Wooper-Paldea (#10253)',
      ruleset: 'Gen IX SV / Pokémon Showdown data/abilities.ts',
      breakable: true,
      suppressible: true,
      copyable: true,
      swappable: true,
      testFiles: Object.freeze(['tests/battle/abilities-h2f-simple.test.js']),
      description: 'Na Geração IX, duplica diretamente a alteração dos estágios de atributos (+1 vira +2, +2 vira +4, -1 vira -2) no momento da aplicação, armazenando o valor resultante no estado do Pokémon dentro dos limites de -6 a +6. Ao ser suprimida ou perdida, os estágios anteriormente acumulados são preservados.'
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

    if (H1B_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H1B_METADATA[slug] }));
      continue;
    }

    if (H1C_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H1C_METADATA[slug] }));
      continue;
    }

    if (H1D_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H1D_METADATA[slug] }));
      continue;
    }

    if (H2A_OFFENSIVE_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H2A_OFFENSIVE_METADATA[slug] }));
      continue;
    }

    if (H2B_CRIT_ACCURACY_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H2B_CRIT_ACCURACY_METADATA[slug] }));
      continue;
    }

    if (H2C_DAMAGE_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H2C_DAMAGE_METADATA[slug] }));
      continue;
    }

    if (H2D_DAMAGE_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H2D_DAMAGE_METADATA[slug] }));
      continue;
    }

    if (H2E_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H2E_METADATA[slug] }));
      continue;
    }

    if (H2F_METADATA[slug]) {
      registry.set(slug, Object.freeze({ ...H2F_METADATA[slug] }));
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
