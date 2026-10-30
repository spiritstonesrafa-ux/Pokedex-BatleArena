/**
 * PBA — Catálogo Declarativo de Diálogos Cinematográficos
 * Exclusivo para os confrontos finais: Super Trainer e Shadow Super Trainer.
 */
(function () {
  'use strict';

  const CINEMATIC_DIALOGUE_CATALOG = Object.freeze({
    SUPER: Object.freeze({
      challengeKind: 'SUPER',
      trainerId: 'super-trainer',
      trainerName: 'Super Treinador',
      trainerTitle: 'O Mestre dos Mais Fortes',
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
      trainerId: 'shadow-super-trainer',
      trainerName: 'Shadow Super Trainer',
      trainerTitle: 'Anomalia Sombria — Trono do Eclipse',
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

  const api = {
    CINEMATIC_DIALOGUE_CATALOG,
    getSceneDefinition(kind, moment) {
      const boss = CINEMATIC_DIALOGUE_CATALOG[String(kind || '').toUpperCase()];
      if (!boss) return null;
      const scene = boss.scenes[String(moment || '').toUpperCase()];
      if (!scene || !Array.isArray(scene.lines) || scene.lines.length === 0) return null;
      return {
        challengeKind: boss.challengeKind,
        trainerId: boss.trainerId,
        trainerName: boss.trainerName,
        trainerTitle: boss.trainerTitle,
        avatarSrc: boss.avatarSrc,
        backgroundSrc: boss.backgroundSrc,
        theme: boss.theme,
        moment: scene.moment,
        lines: [...scene.lines]
      };
    },
    hasScene(kind, moment) {
      return Boolean(api.getSceneDefinition(kind, moment));
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.PBACampaign = window.PBACampaign || {};
    Object.assign(window.PBACampaign, api);
  }
})();

