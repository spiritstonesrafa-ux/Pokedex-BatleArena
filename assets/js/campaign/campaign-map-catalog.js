(function () {
  'use strict';

  const regions = [
    {
      id: 'region-1',
      name: 'Planícies & Costas',
      shortName: 'Região 1',
      subtitle: 'Costa das Brisas e Prados Primordiais',
      bgImage: 'assets/images/campaign/maps/region-1-vales.webp',
      themeClass: 'theme-region-verdant',
      fallbackTheme: {
        background: 'linear-gradient(135deg, #102a27 0%, #16382c 45%, #0f2438 100%)',
        accentColor: '#48bb78'
      },
      unlockCondition: Object.freeze({ kind: 'ALWAYS' }),
      routes: [
        { routeId: 'r1-normal-grass', from: 'node-normal', to: 'node-grass', pathD: 'M 150 405 C 165 365, 190 335, 220 315 C 248 295, 265 275, 280 248' },
        { routeId: 'r1-grass-bug', from: 'node-grass', to: 'node-bug', pathD: 'M 280 248 C 275 205, 255 175, 235 155 C 220 140, 205 130, 200 124' },
        { routeId: 'r1-normal-water', from: 'node-normal', to: 'node-water', pathD: 'M 150 405 C 210 435, 285 450, 355 448 C 415 446, 470 470, 520 450' },
        { routeId: 'r1-water-electric', from: 'node-water', to: 'node-electric', pathD: 'M 520 450 C 570 435, 620 405, 665 375 C 700 350, 722 332, 740 315' },
        { routeId: 'r1-electric-flying', from: 'node-electric', to: 'node-flying', pathD: 'M 740 315 C 765 275, 795 235, 818 198 C 838 165, 850 148, 860 135' },
        { routeId: 'r1-bug-flying', from: 'node-bug', to: 'node-flying', pathD: 'M 200 124 C 290 105, 380 98, 475 104 C 575 110, 675 125, 760 115 C 800 110, 835 120, 860 135' }
      ].map(Object.freeze),
      nodes: [
        {
          nodeId: 'node-normal',
          challengeKind: 'MASTER',
          challengeId: 'master-normal',
          type: 'normal',
          position: Object.freeze({ x: 15.0, y: 72.0 }),
          biomeLabel: 'Planície Serena',
          ariaLabelBase: 'Mestre Aster, Tipo Normal, Insígnia do Horizonte'
        },
        {
          nodeId: 'node-grass',
          challengeKind: 'MASTER',
          challengeId: 'master-grass',
          type: 'grass',
          position: Object.freeze({ x: 28.0, y: 44.0 }),
          biomeLabel: 'Bosque Ancestral',
          ariaLabelBase: 'Mestre Flora, Tipo Planta, Insígnia do Broto'
        },
        {
          nodeId: 'node-bug',
          challengeKind: 'MASTER',
          challengeId: 'master-bug',
          type: 'bug',
          position: Object.freeze({ x: 20.0, y: 22.0 }),
          biomeLabel: 'Bosque dos Esporos',
          ariaLabelBase: 'Mestre Nilo, Tipo Inseto, Insígnia da Trama'
        },
        {
          nodeId: 'node-water',
          challengeKind: 'MASTER',
          challengeId: 'master-water',
          type: 'water',
          position: Object.freeze({ x: 52.0, y: 80.0 }),
          biomeLabel: 'Santuário das Marés',
          ariaLabelBase: 'Mestre Marina, Tipo Água, Insígnia da Maré'
        },
        {
          nodeId: 'node-electric',
          challengeKind: 'MASTER',
          challengeId: 'master-electric',
          type: 'electric',
          position: Object.freeze({ x: 74.0, y: 56.0 }),
          biomeLabel: 'Colinas da Tempestade',
          ariaLabelBase: 'Mestre Volt, Tipo Elétrico, Insígnia do Pulso'
        },
        {
          nodeId: 'node-flying',
          challengeKind: 'MASTER',
          challengeId: 'master-flying',
          type: 'flying',
          position: Object.freeze({ x: 86.0, y: 24.0 }),
          biomeLabel: 'Picos dos Ventos',
          ariaLabelBase: 'Mestre Aero, Tipo Voador, Insígnia da Corrente'
        }
      ].map(Object.freeze)
    },
    {
      id: 'region-2',
      name: 'Fendas & Picos',
      shortName: 'Região 2',
      subtitle: 'Cordilheira das Fendas e Picos Elementais',
      bgImage: 'assets/images/campaign/maps/region-2-fendas.webp',
      themeClass: 'theme-region-crags',
      fallbackTheme: {
        background: 'linear-gradient(135deg, #2b140c 0%, #3d1c19 45%, #182236 100%)',
        accentColor: '#c05621'
      },
      unlockCondition: Object.freeze({ kind: 'ALWAYS' }),
      routes: [
        { routeId: 'r2-fighting-ground', from: 'node-fighting', to: 'node-ground', pathD: 'M 160 394 C 215 415, 275 440, 345 452 C 375 457, 400 459, 420 461' },
        { routeId: 'r2-fighting-poison', from: 'node-fighting', to: 'node-poison', pathD: 'M 160 394 C 152 340, 148 290, 162 245 C 168 225, 175 205, 180 191' },
        { routeId: 'r2-ground-rock', from: 'node-ground', to: 'node-rock', pathD: 'M 420 461 C 485 470, 560 480, 625 470 C 665 462, 695 448, 720 428' },
        { routeId: 'r2-poison-fire', from: 'node-poison', to: 'node-fire', pathD: 'M 180 191 C 240 198, 305 208, 370 198 C 410 190, 440 174, 460 158' },
        { routeId: 'r2-rock-fire', from: 'node-rock', to: 'node-fire', pathD: 'M 720 428 C 685 365, 640 310, 585 260 C 540 220, 495 185, 460 158' },
        { routeId: 'r2-rock-ice', from: 'node-rock', to: 'node-ice', pathD: 'M 720 428 C 755 350, 775 280, 800 210 C 818 165, 830 130, 840 101' },
        { routeId: 'r2-fire-ice', from: 'node-fire', to: 'node-ice', pathD: 'M 460 158 C 520 145, 595 140, 675 130 C 740 120, 800 110, 840 101' }
      ].map(Object.freeze),
      nodes: [
        {
          nodeId: 'node-fighting',
          challengeKind: 'MASTER',
          challengeId: 'master-fighting',
          type: 'fighting',
          position: Object.freeze({ x: 16.0, y: 70.0 }),
          biomeLabel: 'Platô do Dojo Marcial',
          ariaLabelBase: 'Mestre Dante, Tipo Lutador, Insígnia do Punho'
        },
        {
          nodeId: 'node-ground',
          challengeKind: 'MASTER',
          challengeId: 'master-ground',
          type: 'ground',
          position: Object.freeze({ x: 42.0, y: 82.0 }),
          biomeLabel: 'Cânion Terracota',
          ariaLabelBase: 'Mestre Terra, Tipo Terrestre, Insígnia do Estrato'
        },
        {
          nodeId: 'node-poison',
          challengeKind: 'MASTER',
          challengeId: 'master-poison',
          type: 'poison',
          position: Object.freeze({ x: 18.0, y: 34.0 }),
          biomeLabel: 'Cisterna Alquímica',
          ariaLabelBase: 'Mestre Vesper, Tipo Venenoso, Insígnia da Névoa'
        },
        {
          nodeId: 'node-rock',
          challengeKind: 'MASTER',
          challengeId: 'master-rock',
          type: 'rock',
          position: Object.freeze({ x: 72.0, y: 76.0 }),
          biomeLabel: 'Pedreira Monolítica',
          ariaLabelBase: 'Mestre Petra, Tipo Pedra, Insígnia do Granito'
        },
        {
          nodeId: 'node-fire',
          challengeKind: 'MASTER',
          challengeId: 'master-fire',
          type: 'fire',
          position: Object.freeze({ x: 46.0, y: 28.0 }),
          biomeLabel: 'Caldeira Vulcânica',
          ariaLabelBase: 'Mestre Kael, Tipo Fogo, Insígnia da Brasa'
        },
        {
          nodeId: 'node-ice',
          challengeKind: 'MASTER',
          challengeId: 'master-ice',
          type: 'ice',
          position: Object.freeze({ x: 84.0, y: 18.0 }),
          biomeLabel: 'Caverna Glacial',
          ariaLabelBase: 'Mestre Yara, Tipo Gelo, Insígnia do Cristal'
        }
      ].map(Object.freeze)
    },
    {
      id: 'region-3',
      name: 'Domínios Arcanos',
      shortName: 'Região 3',
      subtitle: 'Terras Místicas e Fortaleza do Véu',
      bgImage: 'assets/images/campaign/maps/region-3-arcanas.webp',
      themeClass: 'theme-region-arcane',
      fallbackTheme: {
        background: 'linear-gradient(135deg, #18122c 0%, #2b1744 45%, #12213a 100%)',
        accentColor: '#9f7aea'
      },
      unlockCondition: Object.freeze({ kind: 'ALWAYS' }),
      routes: [
        { routeId: 'r3-fairy-psychic', from: 'node-fairy', to: 'node-psychic', pathD: 'M 240 461 C 210 440, 175 390, 168 335 C 160 285, 170 250, 180 225' },
        { routeId: 'r3-fairy-dark', from: 'node-fairy', to: 'node-dark', pathD: 'M 240 461 C 295 462, 350 455, 410 440 C 475 425, 540 415, 600 405' },
        { routeId: 'r3-psychic-ghost', from: 'node-psychic', to: 'node-ghost', pathD: 'M 180 225 C 195 180, 230 155, 275 135 C 310 120, 338 110, 360 101' },
        { routeId: 'r3-dark-steel', from: 'node-dark', to: 'node-steel', pathD: 'M 600 405 C 660 395, 715 375, 765 348 C 788 335, 806 320, 820 304' },
        { routeId: 'r3-ghost-dragon', from: 'node-ghost', to: 'node-dragon', pathD: 'M 360 101 C 420 120, 490 125, 560 120 C 630 115, 700 110, 760 113' },
        { routeId: 'r3-steel-dragon', from: 'node-steel', to: 'node-dragon', pathD: 'M 820 304 C 830 255, 825 210, 805 170 C 790 145, 775 125, 760 113' }
      ].map(Object.freeze),
      nodes: [
        {
          nodeId: 'node-fairy',
          challengeKind: 'MASTER',
          challengeId: 'master-fairy',
          type: 'fairy',
          position: Object.freeze({ x: 24.0, y: 82.0 }),
          biomeLabel: 'Clareira Encantada',
          ariaLabelBase: 'Mestre Lumi, Tipo Fada, Insígnia da Aurora'
        },
        {
          nodeId: 'node-psychic',
          challengeKind: 'MASTER',
          challengeId: 'master-psychic',
          type: 'psychic',
          position: Object.freeze({ x: 18.0, y: 40.0 }),
          biomeLabel: 'Observatório Astral',
          ariaLabelBase: 'Mestre Orion, Tipo Psíquico, Insígnia do Prisma'
        },
        {
          nodeId: 'node-dark',
          challengeKind: 'MASTER',
          challengeId: 'master-dark',
          type: 'dark',
          position: Object.freeze({ x: 60.0, y: 72.0 }),
          biomeLabel: 'Ruínas do Eclipse',
          ariaLabelBase: 'Mestre Noctis, Tipo Sombrio, Insígnia do Abismo'
        },
        {
          nodeId: 'node-ghost',
          challengeKind: 'MASTER',
          challengeId: 'master-ghost',
          type: 'ghost',
          position: Object.freeze({ x: 36.0, y: 18.0 }),
          biomeLabel: 'Mausoléu Espectral',
          ariaLabelBase: 'Mestre Nyra, Tipo Fantasma, Insígnia do Eclipse'
        },
        {
          nodeId: 'node-steel',
          challengeKind: 'MASTER',
          challengeId: 'master-steel',
          type: 'steel',
          position: Object.freeze({ x: 82.0, y: 54.0 }),
          biomeLabel: 'Fortaleza Siderúrgica',
          ariaLabelBase: 'Mestre Ferrum, Tipo Aço, Insígnia da Liga'
        },
        {
          nodeId: 'node-dragon',
          challengeKind: 'MASTER',
          challengeId: 'master-dragon',
          type: 'dragon',
          position: Object.freeze({ x: 76.0, y: 20.0 }),
          biomeLabel: 'Santuário Dracônico',
          ariaLabelBase: 'Mestre Riven, Tipo Dragão, Insígnia Draco'
        }
      ].map(Object.freeze)
    },
    {
      id: 'region-endgame',
      name: 'Pináculo do Circuito',
      shortName: 'Região Final',
      subtitle: 'Apex Summit: Trono dos Campeões',
      bgImage: 'assets/images/campaign/maps/region-endgame.webp',
      themeClass: 'theme-region-endgame',
      fallbackTheme: {
        background: 'radial-gradient(circle at 50% 30%, #2a1b4e 0%, #15102a 55%, #0a0816 100%)',
        accentColor: '#d4af37'
      },
      unlockCondition: Object.freeze({ kind: 'BADGE_COUNT', count: 18 }),
      routes: [
        { routeId: 'rend-legendary-titans', from: 'node-legendary', to: 'node-titans', pathD: 'M 200 394 C 200 330, 210 260, 220 203' },
        { routeId: 'rend-mythical-celestial', from: 'node-mythical', to: 'node-celestial', pathD: 'M 800 394 C 800 330, 790 260, 780 203' },
        { routeId: 'rend-titans-super', from: 'node-titans', to: 'node-super', pathD: 'M 220 203 C 300 230, 400 270, 500 315' },
        { routeId: 'rend-celestial-super', from: 'node-celestial', to: 'node-super', pathD: 'M 780 203 C 700 230, 600 270, 500 315' },
        { routeId: 'rend-legendary-super', from: 'node-legendary', to: 'node-super', pathD: 'M 200 394 C 290 380, 390 360, 500 315' },
        { routeId: 'rend-mythical-super', from: 'node-mythical', to: 'node-super', pathD: 'M 800 394 C 710 380, 610 360, 500 315' },
        { routeId: 'rend-super-shadow', from: 'node-super', to: 'node-shadow', pathD: 'M 500 315 L 500 113' }
      ].map(Object.freeze),
      nodes: [
        {
          nodeId: 'node-legendary',
          challengeKind: 'LEGENDARY_TRIAL',
          challengeId: 'legendary',
          type: 'special',
          position: Object.freeze({ x: 20.0, y: 70.0 }),
          biomeLabel: 'Fortaleza Glacial',
          visibilityPolicy: 'ALWAYS_IN_REGION',
          ariaLabelBase: 'Prova da Resistência — Desafio Especial de Elite'
        },
        {
          nodeId: 'node-mythical',
          challengeKind: 'MYTHICAL_TRIAL',
          challengeId: 'mythical',
          type: 'special',
          position: Object.freeze({ x: 80.0, y: 70.0 }),
          biomeLabel: 'Coliseu das Sombras',
          visibilityPolicy: 'ALWAYS_IN_REGION',
          ariaLabelBase: 'Prova das Sombras — Desafio Especial de Elite'
        },
        {
          nodeId: 'node-titans',
          challengeKind: 'TITANS_TRIAL',
          challengeId: 'titans',
          type: 'special',
          position: Object.freeze({ x: 22.0, y: 36.0 }),
          biomeLabel: 'Fornalha dos Dragões',
          visibilityPolicy: 'ALWAYS_IN_REGION',
          ariaLabelBase: 'Prova das Chamas — Desafio Especial de Elite'
        },
        {
          nodeId: 'node-celestial',
          challengeKind: 'CELESTIAL_TRIAL',
          challengeId: 'celestial',
          type: 'special',
          position: Object.freeze({ x: 78.0, y: 36.0 }),
          biomeLabel: 'Templo Celestial',
          visibilityPolicy: 'ALWAYS_IN_REGION',
          ariaLabelBase: 'Prova Celestial — Desafio Especial de Elite'
        },
        {
          nodeId: 'node-super',
          challengeKind: 'SUPER',
          challengeId: 'super',
          type: 'special',
          position: Object.freeze({ x: 50.0, y: 56.0 }),
          biomeLabel: 'Arena do Campeão',
          visibilityPolicy: 'ALWAYS_IN_REGION',
          ariaLabelBase: 'Super Treinador — O Mestre dos Mais Fortes'
        },
        {
          nodeId: 'node-shadow',
          challengeKind: 'SHADOW',
          challengeId: 'shadow',
          type: 'special',
          position: Object.freeze({ x: 50.0, y: 20.0 }),
          biomeLabel: 'Trono do Eclipse',
          visibilityPolicy: 'SHADOW_REVEALED',
          ariaLabelBase: 'Shadow Super Trainer — O Desafio Final'
        }
      ].map(Object.freeze)
    }
    ,{
      id:'region-postgame', name:'Região da Glória Eterna', shortName:'Glória Eterna',
      subtitle:'Guardiões, fusões e a origem do mundo',
      bgImage:'assets/images/campaign/maps/region-endgame.webp', themeClass:'theme-region-endgame',
      fallbackTheme:{background:'radial-gradient(circle at 50% 30%, #243653, #15102a 55%, #0a0816)',accentColor:'#bc9cff'},
      unlockCondition:Object.freeze({kind:'SHADOW_DEFEATED'}),
      routes:[
        {routeId:'rpost-mewtwo-league',from:'node-mewtwo',to:'node-league',pathD:'M 200 225 C 400 180, 600 180, 800 225'},
        {routeId:'rpost-zygarde-tower',from:'node-zygarde',to:'node-tower',pathD:'M 200 440 C 300 470, 400 510, 500 510'},
        {routeId:'rpost-kyurem-league',from:'node-kyurem',to:'node-league',pathD:'M 500 320 C 620 320, 700 250, 800 225'},
        {routeId:'rpost-kyurem-tower',from:'node-kyurem',to:'node-tower',pathD:'M 500 320 L 500 510'},
        {routeId:'rpost-mewtwo-zygarde',from:'node-mewtwo',to:'node-zygarde',pathD:'M 200 225 L 200 440'},
        {routeId:'rpost-mewtwo-kyurem',from:'node-mewtwo',to:'node-kyurem',pathD:'M 200 225 C 300 225, 400 280, 500 320'},
        {routeId:'rpost-zygarde-kyurem',from:'node-zygarde',to:'node-kyurem',pathD:'M 200 440 C 300 440, 400 370, 500 320'},
        {routeId:'rpost-kyurem-necrozma',from:'node-kyurem',to:'node-necrozma',pathD:'M 500 320 C 620 330, 700 420, 800 440'},
        {routeId:'rpost-necrozma-creation',from:'node-necrozma',to:'node-creation',pathD:'M 800 440 C 760 180, 650 100, 500 100'},
        {routeId:'rpost-zygarde-creation',from:'node-zygarde',to:'node-creation',pathD:'M 200 440 C 240 180, 350 100, 500 100'}
      ].map(Object.freeze),
      nodes:[
        ['league','LEAGUE',80,40,'Palácio da Elite','Liga da Glória Eterna'],
        ['tower','TOWER',50,91,'Torre dos Campeões','Torre de Batalha'],
        ['mewtwo','MEWTWO_TRIAL',20,40,'Núcleo Psíquico','Desafio Mewtwo'],
        ['zygarde','ZYGARDE_TRIAL',20,78,'Santuário das Células','Equilíbrio de Zygarde'],
        ['kyurem','KYUREM_TRIAL',50,57,'Fenda Glacial','Zero Absoluto'],
        ['necrozma','NECROZMA_TRIAL',80,78,'Prisma do Eclipse','Eclipse de Necrozma'],
        ['creation','CREATION_TRIAL',50,18,'Portal da Origem','Ruptura da Criação']
      ].map(([key,kind,x,y,biome,title])=>Object.freeze({nodeId:'node-'+key,challengeKind:kind,challengeId:key,type:'special',position:Object.freeze({x,y}),biomeLabel:biome,visibilityPolicy:'ALWAYS_IN_REGION',ariaLabelBase:title}))
    }
  ].map(Object.freeze);

  function deepFreeze(obj, visited = new WeakSet()) {
    if (obj === null || (typeof obj !== 'object' && typeof obj !== 'function')) {
      return obj;
    }
    if (visited.has(obj)) {
      return obj;
    }
    visited.add(obj);

    for (const key of Object.getOwnPropertyNames(obj)) {
      const val = obj[key];
      if (val !== null && (typeof val === 'object' || typeof val === 'function')) {
        deepFreeze(val, visited);
      }
    }
    return Object.freeze(obj);
  }

  const CAMPAIGN_MAP_CATALOG = deepFreeze({
    regions,
    // Existing route endpoints serve as exits and entrances. Transfers never
    // trigger the challenge at either endpoint.
    regionTravelLinks: {
      'region-1': {
        'region-postgame':{exitNodeId:'node-flying',entryNodeId:'node-zygarde'},
        'region-2': { exitNodeId: 'node-flying', entryNodeId: 'node-fighting' },
        'region-3': { exitNodeId: 'node-flying', entryNodeId: 'node-fairy' },
        'region-endgame': { exitNodeId: 'node-flying', entryNodeId: 'node-legendary' }
      },
      'region-2': {
        'region-postgame':{exitNodeId:'node-ice',entryNodeId:'node-zygarde'},
        'region-1': { exitNodeId: 'node-fighting', entryNodeId: 'node-flying' },
        'region-3': { exitNodeId: 'node-ice', entryNodeId: 'node-fairy' },
        'region-endgame': { exitNodeId: 'node-ice', entryNodeId: 'node-legendary' }
      },
      'region-3': {
        'region-postgame':{exitNodeId:'node-dragon',entryNodeId:'node-zygarde'},
        'region-1': { exitNodeId: 'node-fairy', entryNodeId: 'node-flying' },
        'region-2': { exitNodeId: 'node-fairy', entryNodeId: 'node-ice' },
        'region-endgame': { exitNodeId: 'node-dragon', entryNodeId: 'node-mythical' }
      },
      'region-postgame': {'region-endgame':{exitNodeId:'node-zygarde',entryNodeId:'node-shadow'},'region-1':{exitNodeId:'node-zygarde',entryNodeId:'node-flying'},'region-2':{exitNodeId:'node-zygarde',entryNodeId:'node-fighting'},'region-3':{exitNodeId:'node-zygarde',entryNodeId:'node-fairy'}},
      'region-endgame': {
        'region-postgame':{exitNodeId:'node-shadow',entryNodeId:'node-mewtwo'},
        'region-1': { exitNodeId: 'node-legendary', entryNodeId: 'node-flying' },
        'region-2': { exitNodeId: 'node-legendary', entryNodeId: 'node-ice' },
        'region-3': { exitNodeId: 'node-mythical', entryNodeId: 'node-dragon' }
      }
    },
    byId: Object.fromEntries(regions.map(r => [r.id, r])),
    allNodeIds: regions.flatMap(r => r.nodes.map(n => n.nodeId)),
    allNodes: regions.flatMap(r => r.nodes),
    getRegionById: id => regions.find(r => r.id === id) || null,
    getNodeById: id => regions.flatMap(r => r.nodes).find(n => n.nodeId === id) || null
  });

  const api = deepFreeze({
    CAMPAIGN_MAP_CATALOG,
    CampaignMapCatalog: CAMPAIGN_MAP_CATALOG
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }
  if (typeof window !== 'undefined') {
    window.PBACampaign = window.PBACampaign || {};
    Object.assign(window.PBACampaign, api);
    window.PBACampaign.CAMPAIGN_MAP_CATALOG = CAMPAIGN_MAP_CATALOG;
    window.PBACampaign.CampaignMapCatalog = CAMPAIGN_MAP_CATALOG;
  }
})();
