/**
 * PBA — Catálogo Declarativo de Diálogos Cinematográficos
 * Cenas cinematográficas para todos os 20 treinadores com identidade visual própria:
 * - 18 Mestres de Tipo (Circuito dos Mestres)
 * - Super Treinador (Confronto Final de Campeonato)
 * - Shadow Super Trainer (Final Stand do Eclipse)
 */
(function () {
  'use strict';

  const CINEMATIC_DIALOGUE_CATALOG = Object.freeze({
    // =========================================================================
    // 18 MESTRES DE TIPO (CIRCUITO DOS MESTRES)
    // =========================================================================

    'master-normal': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-normal',
      trainerId: 'aster',
      trainerName: 'Aster',
      trainerTitle: 'Mestre do Equilíbrio',
      type: 'normal',
      avatarSrc: 'assets/images/trainers/aster.png',
      backgroundSrc: 'assets/images/arenas/arena-normal.webp',
      theme: 'normal',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'Bem-vindo ao início de sua jornada. Muitos subestimam o tipo Normal por acharem que não temos extremos...',
            'Mas a verdadeira força nasce da adaptabilidade pura e da ausência de fraquezas óbvias.',
            'Mostre-me como sua equipe responde ao equilíbrio inabalável da minha vanguarda!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Notável... Você encontrou brechas no meu equilíbrio com paciência e leitura tática impecável.',
            'A Insígnia do Horizonte é sua com todos os méritos. O caminho à sua frente é vasto!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Você atacou com pressa e perdeu a estabilidade. No combate, quem perde o centro cai primeiro.',
            'Respire fundo, reorganize sua estratégia e retorne quando seu espírito estiver em harmonia.'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-fire': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-fire',
      trainerId: 'kael',
      trainerName: 'Kael',
      trainerTitle: 'Mestre das Chamas',
      type: 'fire',
      avatarSrc: 'assets/images/trainers/kael.png',
      backgroundSrc: 'assets/images/arenas/arena-fire.webp',
      theme: 'fire',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'Sente essa temperatura subindo? Minha arena não é lugar para quem hesita em dar o primeiro golpe!',
            'Minhas chamas não queimam apenas por calor... Elas testam a determinação de quem ousa pisar aqui.',
            'Libere todo o fervor da sua equipe! Quero ver se sua chama resiste ao meu inferno!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Que pressão formidável! Você não apenas suportou o calor, mas incendeou o ritmo da batalha a seu favor!',
            'Receba a Insígnia da Brasa! Mantenha essa centelha ardendo até os confins da campanha!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Fagulhas sem combustível não duram no combate. Sua postura vacilou diante da minha ofensiva.',
            'Alimente seu fogo com aprendizado. Minha arena continuará acesa esperando sua volta!'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-water': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-water',
      trainerId: 'marina',
      trainerName: 'Marina',
      trainerTitle: 'Guardiã das Marés',
      type: 'water',
      avatarSrc: 'assets/images/trainers/marina.png',
      backgroundSrc: 'assets/images/arenas/arena-water.webp',
      theme: 'water',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'O oceano ensina que a força bruta se desgasta contra o fluxo contínuo das ondas.',
            'Minha equipe flui suavemente quando necessário, mas se fecha como uma tempestade no momento certo.',
            'Deixe-se levar pelo compasso das águas... e veja se consegue manter o fôlego diante da minha maré!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Uma navegação brilhante... Você soube quando conter seus golpes e quando quebrar minha correnteza.',
            'Leve consigo a Insígnia da Maré. Que sua mente permaneça tão límpida e flexível quanto o mar.'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Você tentou lutar contra a corrente em vez de se adaptar a ela... e a maré o envolveu.',
            'O mar perdoa aqueles que aprendem a ouvi-lo. Descanse e retorne quando estiver pronto para mergulhar fundo.'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-electric': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-electric',
      trainerId: 'volt',
      trainerName: 'Volt',
      trainerTitle: 'Condutor da Tempestade',
      type: 'electric',
      avatarSrc: 'assets/images/trainers/volt.png',
      backgroundSrc: 'assets/images/arenas/arena-electric.webp',
      theme: 'electric',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'Piscou, perdeu! Na minha arena, a hesitação custa meio segundo... e meio segundo é tempo demais!',
            'O pulso elétrico da minha equipe corre mais rápido do que qualquer plano pensado com calma.',
            'Prepare seus reflexos! Quero ver se você consegue acompanhar a sobrecarga da tempestade!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Uau! Você interceptou minha voltagem máxima com uma precisão cirúrgica de arrepiar!',
            'A Insígnia do Pulso é sua! Foi uma das batalhas mais eletrizantes que este ginásio já testemunhou!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Seu ritmo desacelerou bem no ápice da carga. Contra a eletricidade, estagnação é choque garantido!',
            'Recarregue suas energias e ajuste sua cadência. Quero ver você tentar acompanhar meu raio de novo!'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-grass': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-grass',
      trainerId: 'flora',
      trainerName: 'Flora',
      trainerTitle: 'Mestre do Bosque',
      type: 'grass',
      avatarSrc: 'assets/images/trainers/flora.png',
      backgroundSrc: 'assets/images/arenas/arena-grass.webp',
      theme: 'grass',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'Uma árvore não resiste ao vendaval apenas com galhos fortes... Suas raízes precisam ser firmes e profundas.',
            'A natureza ensina que o florescer exige resiliência, cura no momento certo e paciência constante.',
            'Mostre-me se o laço com seus Pokémon possui a força necessária para brotar em meio ao meu bosque!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Magnífico! Sua estratégia floresceu diante dos meus olhos com raízes inabaláveis e beleza rítmica.',
            'Com todo o respeito do bosque, entrego a você a Insígnia do Broto. Continue nutrindo seus parceiros!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Seu ataque murchou antes de conseguir quebrar minha absorção de energia.',
            'Não se deixe abater. Até a mais bela das sementes precisa do solo fértil do recomeço para crescer.'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-ice': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-ice',
      trainerId: 'yara',
      trainerName: 'Yara',
      trainerTitle: 'Guardiã do Inverno',
      type: 'ice',
      avatarSrc: 'assets/images/trainers/yara.png',
      backgroundSrc: 'assets/images/arenas/arena-ice.webp',
      theme: 'ice',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'O frio tem uma propriedade singular: ele desacelera tudo até que reste apenas a verdade do combate.',
            'Minha muralha de gelo não foi esculpida para ceder ao primeiro impacto apaixonado de um desafiante.',
            'Aventure-se na nevasca. Veremos se o calor da sua vontade é capaz de rachar este cristal!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Incrível... O calor da sua coragem despedaçou o gelo mais espesso que já ergui nesta arena.',
            'A Insígnia do Cristal é sua por direito. Poucos desafiantes demonstraram uma convicção tão límpida.'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'O vento polar congelou suas intenções antes que você pudesse armar seu contra-ataque.',
            'O inverno exige casca grossa e serenidade. Reaqueça sua equipe e volte quando puder suportar a geada.'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-fighting': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-fighting',
      trainerId: 'dante',
      trainerName: 'Dante',
      trainerTitle: 'Mestre da Vanguarda',
      type: 'fighting',
      avatarSrc: 'assets/images/trainers/dante.png',
      backgroundSrc: 'assets/images/arenas/arena-fighting.webp',
      theme: 'fighting',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'Táticas complexas são inúteis se o espírito fraquejar no primeiro golpe corpo a corpo!',
            'Meus parceiros treinam noite e dia para que cada impacto carregue integridade, técnica e força de vontade.',
            'Guarda alta e postura firme! Mostre-me do que a sua vanguarda é feita no centro deste ringue!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Que trocação magistral! Você suportou meu impacto mais pesado e revidou com técnica impecável!',
            'Esta é a honra do combate corpo a corpo. A Insígnia do Punho é sua, verdadeiro guerreiro!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Sua guarda caiu no momento em que a pressão aumentou. Um lutador jamais desvia o olhar!',
            'Levante a cabeça! A derrota é a primeira lição de qualquer arte marcial. Treine e volte mais forte!'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-poison': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-poison',
      trainerId: 'vesper',
      trainerName: 'Vesper',
      trainerTitle: 'Mestre da Alquimia',
      type: 'poison',
      avatarSrc: 'assets/images/trainers/vesper.png',
      backgroundSrc: 'assets/images/arenas/arena-poison.webp',
      theme: 'poison',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'O perigo mais letal raramente se anuncia com barulho... Ele se infiltra lentamente pelas frestas.',
            'A alquimia do veneno é uma arte de paciência. Cada turno sem cura torna sua derrota inevitável.',
            'Respire fundo, se tiver coragem... e veja se consegue desvendar o antídoto para a minha névoa!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Fascinante... Você neutralizou meus compostos tóxicos antes que o desgaste comprometesse sua equipe.',
            'Uma reação brilhante! Leve a Insígnia da Névoa. Sua imunidade tática superou minha fórmula.'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Como previsto, a toxina fez seu trabalho gradual enquanto você buscava uma saída inexistente.',
            'Estude os componentes deste confronto. Na alquimia da batalha, o antídoto sempre exige preparo prévio.'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-ground': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-ground',
      trainerId: 'terra',
      trainerName: 'Terra',
      trainerTitle: 'Guardião do Vale',
      type: 'ground',
      avatarSrc: 'assets/images/trainers/terra.png',
      backgroundSrc: 'assets/images/arenas/arena-ground.webp',
      theme: 'ground',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'O solo sob os nossos pés viu montanhas surgirem e ruírem ao longo das eras.',
            'Quem não tem base firme é derrubado no primeiro tremor. Minha equipe é a própria rocha que sustenta este vale.',
            'Firme seus passos! Vamos descobrir se você consegue se manter de pé quando o chão se abrir!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Você resistiu aos meus abalos sísmicos com a estabilidade de quem tem passos firmes e mente clara!',
            'A terra reconhece a sua bravura. A Insígnia do Estrato agora pertence a você!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Seus alicerces cederam diante do impacto tectônico. Sem estabilidade, qualquer castelo cai.',
            'Recupere o equilíbrio do seu time. A terra não se move com pressa, e estarei aqui quando quiser tentar de novo.'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-flying': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-flying',
      trainerId: 'aero',
      trainerName: 'Aero',
      trainerTitle: 'Mestre dos Ventos',
      type: 'flying',
      avatarSrc: 'assets/images/trainers/aero.png',
      backgroundSrc: 'assets/images/arenas/arena-flying.webp',
      theme: 'flying',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'Lá de cima, cada movimento seu é visível antes mesmo de você ordenar o ataque!',
            'O vento não pode ser contido por grades ou trincheiras... Ele contorna, sobe e ataca do ângulo cego.',
            'Abra suas asas se quiser me acompanhar! O céu desta arena pertence aos mais audaciosos!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Que visão de combate! Você cortou minhas correntes de ar com um tempo de reação inacreditável!',
            'Você conquistou as alturas com honra. Leve a Insígnia da Corrente e voe ainda mais alto!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Você ficou preso no chão tentando adivinhar de onde viria a próxima rajada aérea.',
            'Aprenda a ler as correntes térmicas antes de alçar voo novamente. O vento espera por você!'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-psychic': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-psychic',
      trainerId: 'orion',
      trainerName: 'Orion',
      trainerTitle: 'Mestre do Horizonte Mental',
      type: 'psychic',
      avatarSrc: 'assets/images/trainers/orion.png',
      backgroundSrc: 'assets/images/arenas/arena-psychic.webp',
      theme: 'psychic',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'Antes que suas palavras soem, suas intenções já ecoam no espaço psíquico deste santuário.',
            'A força real de um golpe não reside no músculo, mas na clareza absoluta da mente que o projeta.',
            'Concentre seus pensamentos. Vamos desfraldar os limites do seu horizonte mental nesta arena!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Surpreendente... Você pensou três turnos adiante e quebrou meus reflexos antes da minha própria dedução.',
            'Sua mente refratou toda a minha projeção com perfeição. Receba a Insígnia do Prisma!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Sua mente se perdeu no labirinto de ilusões e antecipações que desenhei ao redor do seu time.',
            'Silencie o ruído da dúvida antes de voltar. Uma mente calma é a maior arma de um mestre.'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-bug': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-bug',
      trainerId: 'nilo',
      trainerName: 'Nilo',
      trainerTitle: 'Guardião do Enxame',
      type: 'bug',
      avatarSrc: 'assets/images/trainers/nilo.png',
      backgroundSrc: 'assets/images/arenas/arena-bug.webp',
      theme: 'bug',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'Muitos desafiantes chegam com desdém ao ver os insetos... até sentirem o poder da nossa colmeia!',
            'Individualmente pequenos, mas coletivamente invencíveis quando cada fio da teia trabalha em uníssono.',
            'Entre na nossa trama! Quero ver se você escapa da coordenação feroz do meu enxame!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Extraordinário! Você cortou os fios mais resistentes da minha teia com precisão e disciplina tática!',
            'A Insígnia da Trama é sua. Nunca deixe ninguém subestimar o trabalho duro e a união da sua equipe!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Você subestimou a força coordenada da colmeia e acabou preso nos fios da nossa estratégia.',
            'Retorne à prancheta e refine sua cooperação. O enxame sempre estará pronto para um novo teste!'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-rock': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-rock',
      trainerId: 'petra',
      trainerName: 'Petra',
      trainerTitle: 'Mestre do Monólito',
      type: 'rock',
      avatarSrc: 'assets/images/trainers/petra.png',
      backgroundSrc: 'assets/images/arenas/arena-rock.webp',
      theme: 'rock',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'Tempestades passam, eras se sucedem... mas o granito deste monólito permanece inalterado.',
            'Não me impressiono com movimentos vistosos. Minha equipe foi talhada para suportar qualquer impacto e revidar com o peso de uma avalanche.',
            'Traga seu ataque mais pesado! Vamos ver se você consegue arranhar a couraça deste monólito!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Uma fratura perfeita! Seus golpes continuados encontraram o ponto exato de fissura na minha defesa.',
            'Você talhou sua vitória na rocha mais dura desta terra. A Insígnia do Granito é sua por direito!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Seus ataques se despedaçaram contra o granito como vidro jogado contra um penhasco.',
            'Fortaleça o gume da sua equipe. Uma pedra polida exige incontáveis impactos antes de brilhar.'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-ghost': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-ghost',
      trainerId: 'nyra',
      trainerName: 'Nyra',
      trainerTitle: 'Guardiã do Véu',
      type: 'ghost',
      avatarSrc: 'assets/images/trainers/nyra.png',
      backgroundSrc: 'assets/images/arenas/arena-ghost.webp',
      theme: 'ghost',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'Você sente o calafrio que percorre o chão? Entre a luz e a escuridão, existe um véu sutil...',
            'Meus parceiros transitam onde as leis físicas normais perdem o sentido. O que você não vê é o que mais fere.',
            'Não tema as sombras que se aproximam... Apenas descubra se você consegue atingir o intangível!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Que fascinante... A convicção do seu olhar atravessou o véu e dissipou cada uma das minhas ilusões.',
            'As almas desta arena se curvam diante de você. Leve a Insígnia do Eclipse para iluminar seu caminho.'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Seus golpes acertaram apenas o vazio... e o silêncio do além engoliu as forças do seu time.',
            'Aprenda a enxergar além das aparências antes de desafiar o véu outra vez. Estaremos esperando nas sombras.'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-dragon': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-dragon',
      trainerId: 'riven',
      trainerName: 'Riven',
      trainerTitle: 'Mestre do Céu Antigo',
      type: 'dragon',
      avatarSrc: 'assets/images/trainers/riven.png',
      backgroundSrc: 'assets/images/arenas/arena-dragon.webp',
      theme: 'dragon',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'Diante de você erguem-se os soberanos do firmamento antigo. O sangue dracônico não conhece o medo.',
            'Não basta ter bons Pokémon no elenco... Para dominar o poder ancestral, o próprio treinador precisa ter alma de dragão.',
            'Erga sua cabeça e encare o vendaval! Mostre-me se você possui a nobreza e o poder necessários para me desafiar!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Uma façanha digna das lendas antigas! Você domou a fúria dos meus dragões com bravura inquestionável!',
            'Com o mais profundo respeito marcial, entrego a você a cobiçada Insígnia Draco. Você é um gigante!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'A imponência da linhagem dracônica foi avassaladora demais para a sua preparação atual.',
            'Cure suas feridas e eleve seu espírito. Os dragões só respeitam quem se levanta após a queda.'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-dark': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-dark',
      trainerId: 'noctis',
      trainerName: 'Noctis',
      trainerTitle: 'Mestre do Crepúsculo',
      type: 'dark',
      avatarSrc: 'assets/images/trainers/noctis.png',
      backgroundSrc: 'assets/images/arenas/arena-dark.webp',
      theme: 'dark',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'No crepúsculo, as regras convencionais perdem a cor. A sobrevivência pertence a quem prevê a emboscada.',
            'Não busco aplausos ou lutas teatrais. Minha estratégia se apoia em astúcia cirúrgica e punição impiedosa a cada erro seu.',
            'Entre no abismo sem ilusões... Vamos ver como seu otimismo se comporta quando as luzes se apagarem!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Impressionante... Você antecipou cada truque obscuro e manteve a disciplina sem cair nas minhas armadilhas.',
            'A escuridão reconhece um estrategista superior. Fique com a Insígnia do Abismo. Você a mereceu.'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Você deixou uma brecha ingênua... e no escuro, o menor vacilo se torna uma sentença definitiva.',
            'Abandone a previsibilidade se quiser sobreviver aqui. O crepúsculo não tolera erros repetidos.'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-steel': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-steel',
      trainerId: 'ferrum',
      trainerName: 'Ferrum',
      trainerTitle: 'Guardião da Forja',
      type: 'steel',
      avatarSrc: 'assets/images/trainers/ferrum.png',
      backgroundSrc: 'assets/images/arenas/arena-steel.webp',
      theme: 'steel',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'O aço não nasce perfeito: ele é moldado a marteladas, resfriado no fogo e temperado até se tornar inquebrável.',
            'Minha defesa reflete a pureza da liga metálica mais sólida que esta região já forjou.',
            'Aproxime-se da bigorna! Vamos ver se o gume da sua estratégia consegue riscar o meu metal!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Um golpe brilhante! Você encontrou a tempera exata para dobrar a liga mais resistente que já montei.',
            'Sua têmpera como treinador foi comprovada. Com orgulho, concedo a você a Insígnia da Liga!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Sua lâmina perdeu o corte contra a dureza da minha estrutura. Faltou densidade à sua investida.',
            'Volte para a forja. Afie seus conceitos, retempere seus parceiros e encare o metal novamente.'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    'master-fairy': Object.freeze({
      challengeKind: 'MASTER',
      challengeId: 'master-fairy',
      trainerId: 'lumi',
      trainerName: 'Lumi',
      trainerTitle: 'Mestre do Encanto',
      type: 'fairy',
      avatarSrc: 'assets/images/trainers/lumi.png',
      backgroundSrc: 'assets/images/arenas/arena-fairy.webp',
      theme: 'fairy',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'Não se deixe enganar pelo brilho cintilante ou pela delicadeza das fadas... A magia ancestral esconde segredos perigosos.',
            'Nossa força não vem da ferocidade crua, mas do encanto incontrolável que desestabiliza até o mais feroz dos dragões.',
            'Deixe a aurora envolver seus sentidos... e descubra se você consegue resistir ao poder do nosso conto!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Que espetáculo luminoso! Você navegou por toda a minha magia sem perder a lucidez ou a precisão!',
            'O encanto desta arena agora brilha em você. Receba a Insígnia do Aurora com todo o meu carinho!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'O feitiço da aurora desconcertou suas defesas antes mesmo que você percebesse a derrota chegando.',
            'A magia exige respeito e sensibilidade. Descanse seu espírito e retorne quando quiser outro vislumbre do encanto.'
          ])
        }),
        MID_BATTLE: Object.freeze({ moment: 'MID_BATTLE', lines: Object.freeze([]) })
      })
    }),

    // =========================================================================
    // CONFRONTOS FINAIS: SUPER TRAINER & SHADOW SUPER TRAINER (PRESERVADOS)
    // =========================================================================

    SUPER: Object.freeze({
      challengeKind: 'SUPER',
      challengeId: 'super-trainer',
      trainerId: 'super-trainer',
      trainerName: 'Super Treinador',
      trainerTitle: 'O Mestre dos Mais Fortes',
      type: null,
      avatarSrc: 'assets/images/trainers/super-trainer.png',
      backgroundSrc: 'assets/images/arenas/arena-super.webp',
      theme: 'super',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'Impressionante... Você conquistou todas as 18 insígnias elementais e reuniu os 24 combatentes mais nobres desta terra.',
            'Muitos desafiantes chegam até aqui acreditando que já viram o ápice do combate Pokémon.',
            'Mas um verdadeiro Campeão não depende apenas de força bruta... Ele luta com maestria, precisão e confiança absoluta em cada parceiro.',
            'Chegou a hora de provar se você é digno do título de Campeão dos Mais Fortes. Dê o seu melhor!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'Uma exibição sublime! Cada troca, cada golpe... Executados com a perfeição de um verdadeiro gênio tático.',
            'Você superou cada barreira estratégica que construí e provou que seu laço com seus Pokémon é inabalável.',
            'Comemore, novo Campeão Supremo! O troféu e as honras desta arena pertencem a você por direito!'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Uma batalha formidável, desafiante... Mas sua concentração hesitou no momento decisivo.',
            'No topo do mundo, o menor descuido estratégico custa o combate inteiro.',
            'Descanse sua equipe, analise seus erros e volte quando estiver pronto. A Arena do Campeão sempre aguarda os destemidos.'
          ])
        }),
        MID_BATTLE: Object.freeze({
          moment: 'MID_BATTLE',
          lines: Object.freeze([])
        })
      })
    }),

    SHADOW: Object.freeze({
      challengeKind: 'SHADOW',
      challengeId: 'shadow-super-trainer',
      trainerId: 'shadow-super-trainer',
      trainerName: 'Shadow Super Trainer',
      trainerTitle: 'Anomalia Sombria — Trono do Eclipse',
      type: null,
      avatarSrc: 'assets/images/trainers/super-trainer-shadow.png',
      backgroundSrc: 'assets/images/arenas/arena-shadow.webp',
      theme: 'shadow',
      scenes: Object.freeze({
        INTRO: Object.freeze({
          moment: 'INTRO',
          lines: Object.freeze([
            'A escuridão do Eclipse desperta... e as cinzas da arena tremem sob seus passos.',
            'Você triunfou sobre o Campeão e superou as Provas Celestiais... Mas nada no seu mundo o preparou para a anomalia que consome este trono.',
            'Aqui não há honra de campeonato. Não há regras convencionais. Este é o seu Final Stand!',
            'Convoque cada aliado, cada reforço, cada centelha de esperança que lhe resta... Mostre-me se sua luz resistirá ao abismo!'
          ])
        }),
        VICTORY: Object.freeze({
          moment: 'VICTORY',
          lines: Object.freeze([
            'O quê...?! A luz emanada do coração da sua equipe... Ela rasga as próprias sombras do Eclipse?!',
            'Mesmo enfrentando o peso do abismo e a exaustão do combate infinito, vocês se recusaram a cair...',
            'A anomalia se dissipa... Você não é apenas um Campeão. Você é a lenda viva que libertou esta arena da escuridão eterna.'
          ])
        }),
        DEFEAT: Object.freeze({
          moment: 'DEFEAT',
          lines: Object.freeze([
            'Como previsto... A escuridão deste Eclipse engoliu sua determinação.',
            'Nem mesmo todo o seu exército foi capaz de conter a força avassaladora do abismo.',
            'Retorne ao mundo dos vivos e recolha seus fragmentos... Apenas uma vontade inquebrável poderá algum dia desafiar as sombras novamente.'
          ])
        }),
        MID_BATTLE: Object.freeze({
          moment: 'MID_BATTLE',
          lines: Object.freeze([])
        })
      })
    })
  });

  // Mapa de aliases para resolução rápida e flexível
  const ALIAS_MAP = {
    'super-trainer': 'SUPER',
    'shadow-super-trainer': 'SHADOW'
  };

  // Mapeia tipos elementais diretos para os challengeIds dos mestres
  const TYPE_TO_MASTER_ID = {
    normal: 'master-normal',
    fire: 'master-fire',
    water: 'master-water',
    electric: 'master-electric',
    grass: 'master-grass',
    ice: 'master-ice',
    fighting: 'master-fighting',
    poison: 'master-poison',
    ground: 'master-ground',
    flying: 'master-flying',
    psychic: 'master-psychic',
    bug: 'master-bug',
    rock: 'master-rock',
    ghost: 'master-ghost',
    dragon: 'master-dragon',
    dark: 'master-dark',
    steel: 'master-steel',
    fairy: 'master-fairy'
  };

  // Mapeia avatarKey para o challengeId correspondente
  const AVATAR_KEY_MAP = {
    aster: 'master-normal',
    kael: 'master-fire',
    marina: 'master-water',
    volt: 'master-electric',
    flora: 'master-grass',
    yara: 'master-ice',
    dante: 'master-fighting',
    vesper: 'master-poison',
    terra: 'master-ground',
    aero: 'master-flying',
    orion: 'master-psychic',
    nilo: 'master-bug',
    petra: 'master-rock',
    nyra: 'master-ghost',
    riven: 'master-dragon',
    noctis: 'master-dark',
    ferrum: 'master-steel',
    lumi: 'master-fairy'
  };

  function resolveCatalogEntry(key) {
    if (!key) return null;
    const raw = String(key).trim();
    const upper = raw.toUpperCase();
    const lower = raw.toLowerCase();

    // 1. Chaves literais em maiúsculo (SUPER, SHADOW)
    if (CINEMATIC_DIALOGUE_CATALOG[upper]) {
      return CINEMATIC_DIALOGUE_CATALOG[upper];
    }

    // 2. Chaves literais de mestre (ex: master-fire, master-water)
    if (CINEMATIC_DIALOGUE_CATALOG[lower]) {
      return CINEMATIC_DIALOGUE_CATALOG[lower];
    }

    // 3. Aliases específicos
    if (ALIAS_MAP[lower] && CINEMATIC_DIALOGUE_CATALOG[ALIAS_MAP[lower]]) {
      return CINEMATIC_DIALOGUE_CATALOG[ALIAS_MAP[lower]];
    }

    // 4. Mapeamento por tipo simples (ex: 'fire' -> 'master-fire')
    if (TYPE_TO_MASTER_ID[lower] && CINEMATIC_DIALOGUE_CATALOG[TYPE_TO_MASTER_ID[lower]]) {
      return CINEMATIC_DIALOGUE_CATALOG[TYPE_TO_MASTER_ID[lower]];
    }

    // 5. Mapeamento por avatarKey do treinador (ex: 'kael' -> 'master-fire')
    if (AVATAR_KEY_MAP[lower] && CINEMATIC_DIALOGUE_CATALOG[AVATAR_KEY_MAP[lower]]) {
      return CINEMATIC_DIALOGUE_CATALOG[AVATAR_KEY_MAP[lower]];
    }

    return null;
  }

  const api = {
    CINEMATIC_DIALOGUE_CATALOG,
    getSceneDefinition(key, moment) {
      const entry = resolveCatalogEntry(key);
      if (!entry) return null;
      const normalizedMoment = String(moment || '').toUpperCase();
      const scene = entry.scenes && entry.scenes[normalizedMoment];
      if (!scene || !Array.isArray(scene.lines) || scene.lines.length === 0) return null;
      return {
        challengeKind: entry.challengeKind,
        challengeId: entry.challengeId,
        trainerId: entry.trainerId,
        trainerName: entry.trainerName,
        trainerTitle: entry.trainerTitle,
        type: entry.type || null,
        avatarSrc: entry.avatarSrc,
        backgroundSrc: entry.backgroundSrc,
        theme: entry.theme,
        moment: scene.moment,
        lines: [...scene.lines]
      };
    },
    hasScene(key, moment) {
      return Boolean(api.getSceneDefinition(key, moment));
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.PBACampaign = window.PBACampaign || {};
    Object.assign(window.PBACampaign, api);
  }
})();
