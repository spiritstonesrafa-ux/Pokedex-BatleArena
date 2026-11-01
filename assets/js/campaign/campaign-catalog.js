(function () {
  const Expanded = typeof module !== 'undefined' && module.exports
    ? require('../expanded-pokemon-catalog.js') : window.PBAExpandedCatalog;
  const Static = typeof module !== 'undefined' && module.exports
    ? require('./campaign-pokemon-catalog.js')
    : window.PBACampaign.CampaignPokemonCatalog;
  const WildSpecial = typeof module !== 'undefined' && module.exports
    ? require('./campaign-wild-special-catalog.js')
    : window.PBACampaign.CampaignWildSpecialCatalog;
  if (!Static) throw new Error('CampaignPokemonCatalog must load before campaign-catalog.');
  const DraftIdsModule = typeof module !== 'undefined' && module.exports
    ? require('./campaign-draft-ids.js')
    : window.PBACampaign;
  const draftIdsByGeneration = (DraftIdsModule && DraftIdsModule.DRAFT_IDS_BY_GENERATION) || (Static && Static.draftIdsByGeneration);
  if (!draftIdsByGeneration) {
    throw new Error('campaign-draft-ids must load before campaign-catalog.');
  }
  const record = id => {
    const entry = Static.byId[Number(id)];
    if (!entry) throw new Error(`Missing canonical campaign metadata for #${id}.`);
    return entry;
  };
  const DRAFT = Object.freeze(Object.values(draftIdsByGeneration).flat().map(record));
  const masterRows = [
    ['normal','Aster','Mestre do Equilíbrio','Insígnia do Horizonte',2,[242,264,335]],
    ['fire','Kael','Mestre das Chamas','Insígnia da Brasa',4,[38,59,609]],
    ['water','Marina','Guardiã das Marés','Insígnia da Maré',3,[131,350,423]],
    ['electric','Volt','Condutor da Tempestade','Insígnia do Pulso',3,[405,466,849]],
    ['grass','Flora','Mestre do Bosque','Insígnia do Broto',3,[407,549,841]],
    ['ice','Yara','Guardiã do Inverno','Insígnia do Cristal',4,[471,975,713]],
    ['fighting','Dante','Mestre da Vanguarda','Insígnia do Punho',4,[68,286,701]],
    ['poison','Vesper','Mestre da Alquimia','Insígnia da Névoa',3,[169,454,691]],
    ['ground','Terra','Guardião do Vale','Insígnia do Estrato',4,[330,553,750]],
    ['flying','Aero','Mestre dos Ventos','Insígnia da Corrente',3,[227,398,715]],
    ['psychic','Orion','Mestre do Horizonte Mental','Insígnia do Prisma',4,[65,199,858]],
    ['bug','Nilo','Guardião do Enxame','Insígnia da Trama',3,[212,214,768]],
    ['rock','Petra','Mestre do Monólito','Insígnia do Granito',5,[248,526,697]],
    ['ghost','Nyra','Guardiã do Véu','Insígnia do Eclipse',4,[94,477,778]],
    ['dragon','Riven','Mestre do Céu Antigo','Insígnia Draco',5,[149,445,887]],
    ['dark','Noctis','Mestre do Crepúsculo','Insígnia do Abismo',4,[229,510,983]],
    ['steel','Ferrum','Guardião da Forja','Insígnia da Liga',5,[376,530,681]],
    ['fairy','Lumi','Mestre do Encanto','Insígnia do Aurora',4,[303,468,869]]
  ];
  const MASTERS = Object.freeze(masterRows.map(([type,trainerName,trainerTitle,badgeName,difficulty,team]) => Object.freeze({
    challengeId: `master-${type}`, type, trainerName, trainerTitle, badgeName, difficulty,
    description: `Enfrente ${trainerName}, ${trainerTitle}.`, team: Object.freeze(team.map(record))
  })));
  const MASTER_SPECIES = Object.freeze(MASTERS.flatMap(master => master.team));
  const trialRecords = Object.freeze([
    {id:145,name:'zapdos',types:['electric','flying'],bst:580,generation:1,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/145.png',legendary:true,mythical:false},
    {id:245,name:'suicune',types:['water'],bst:580,generation:2,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/245.png',legendary:true,mythical:false},
    {id:381,name:'latios',types:['dragon','psychic'],bst:600,generation:3,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/381.png',legendary:true,mythical:false},
    {id:151,name:'mew',types:['psychic'],bst:600,generation:1,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/151.png',legendary:false,mythical:true},
    {id:385,name:'jirachi',types:['steel','psychic'],bst:600,generation:3,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/385.png',legendary:false,mythical:true},
    {id:494,name:'victini',types:['psychic','fire'],bst:600,generation:5,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/494.png',legendary:false,mythical:true},
    {id:1007,name:'koraidon',types:['fighting','dragon'],bst:670,generation:9,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1007.png',legendary:true,mythical:false},
    {id:383,name:'groudon',types:['ground'],bst:670,generation:3,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/383.png',legendary:true,mythical:false},
    {id:717,name:'yveltal',types:['dark','flying'],bst:680,generation:6,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/717.png',legendary:true,mythical:false},
    {id:889,name:'zamazenta',types:['fighting'],bst:670,generation:8,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/889.png',legendary:true,mythical:false},
    {id:791,name:'solgaleo',types:['psychic','steel'],bst:680,generation:7,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/791.png',legendary:true,mythical:false},
    {id:487,name:'giratina',types:['ghost','dragon'],bst:680,generation:4,sprite:'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/487.png',legendary:true,mythical:false}
  ].map(freeze => Object.freeze({...freeze,types:Object.freeze(freeze.types)})));
  const trialById = Object.freeze(Object.fromEntries(trialRecords.map(entry => [entry.id,entry])));
  const originalById = {...Static.byId,...WildSpecial.byId,...trialById};
  const EXPANSION_SPECIES = Object.freeze(Expanded.entries.filter(entry => !originalById[entry.id]));
  const allById = Object.freeze({...Expanded.byId,...originalById});
  const SUPER_TEAM = Object.freeze([10190,10194,10188].map(id => allById[id]));
  const SHADOW_TEAM = Object.freeze([10190,10194,10188].map(id => allById[id]));
  // Preserve recruited Pokémon and pending rewards from the original boss.
  const LEGACY_SUPER_REWARD_IDS = Object.freeze([493,890,150]);
  const SUPER_REWARD_IDS = Object.freeze([...LEGACY_SUPER_REWARD_IDS,...SUPER_TEAM.map(p => p.id)]);
  const SUPER_AUDIT = Object.freeze(SUPER_TEAM.map(p => Object.freeze({
    id:p.id,name:p.name,bst:p.bst,selected:true,reason:'CAMPAIGN_ENGINE_TEAM_BENCHMARK'
  })));
  const draftSet = new Set(DRAFT.map(entry => entry.id));
  const EXPLORATION_SPECIES = Object.freeze(Object.values(allById).filter(entry =>
    !draftSet.has(entry.id)));
  const LEGENDARY_TRIAL_TEAM = Object.freeze([145,245,381].map(id => allById[id]));
  const MYTHICAL_TRIAL_TEAM = Object.freeze([151,385,494].map(id => allById[id]));
  const TITANS_TRIAL_TEAM = Object.freeze([1007,383,717].map(id => allById[id]));
  const MEWTWO_TRIAL_TEAM = Object.freeze([150,10043,10044].map(id => allById[id]));
  const CELESTIAL_TRIAL_TEAM = Object.freeze([889,791,487].map(id => allById[id]));
  const POSTGAME_TRIALS=Object.freeze(Object.fromEntries([
    ['MEWTWO_TRIAL','mewtwo','Desafio Mewtwo','As Três Faces do Poder',[150,10043,10044],'psychic'],
    ['ZYGARDE_TRIAL','zygarde','Equilíbrio de Zygarde','A Ordem das Células',[10181,718,10120],'grass'],
    ['KYUREM_TRIAL','kyurem','Zero Absoluto','Os Dragões da Fusão',[646,10022,10023],'ice'],
    ['NECROZMA_TRIAL','necrozma','Eclipse de Necrozma','A Luz Devorada',[10155,10156,10157],'psychic'],
    ['CREATION_TRIAL','creation','Ruptura da Criação','Além do Tempo e do Espaço',[10245,10246,10007],'ghost']
  ].map(([kind,key,name,subtitle,ids,arena])=>[kind,Object.freeze({kind,key,name,subtitle,arena,team:Object.freeze(ids.map(id=>allById[id]))})])));
  function getPostgameLockReason(kind,state){
    if(!POSTGAME_TRIALS[kind])return null;
    if(!state?.shadowTrainer?.defeated)return 'Derrote o Shadow para iniciar esta jornada.';
    const done=key=>Boolean(state.endgameTrials?.[key]?.completed);
    if(kind==='KYUREM_TRIAL'&&!done('mewtwo')&&!done('zygarde'))return 'Conclua Mewtwo ou Zygarde para desbloquear.';
    if(kind==='NECROZMA_TRIAL'&&!done('kyurem'))return 'Conclua Zero Absoluto para desbloquear.';
    if(kind==='CREATION_TRIAL'&&!['mewtwo','zygarde','kyurem','necrozma'].every(done))return 'Conclua Mewtwo, Zygarde, Kyurem e Necrozma para desbloquear.';
    return null;
  }
  const api = Object.freeze({
    ZYGARDE_TRIAL_TEAM:POSTGAME_TRIALS.ZYGARDE_TRIAL.team, KYUREM_TRIAL_TEAM:POSTGAME_TRIALS.KYUREM_TRIAL.team, NECROZMA_TRIAL_TEAM:POSTGAME_TRIALS.NECROZMA_TRIAL.team, CREATION_TRIAL_TEAM:POSTGAME_TRIALS.CREATION_TRIAL.team,
    POSTGAME_TRIALS, getPostgameLockReason, DRAFT, MASTERS, MASTER_SPECIES, SUPER_TEAM, SHADOW_TEAM, SUPER_REWARD_IDS, LEGACY_SUPER_REWARD_IDS, SUPER_AUDIT, MEWTWO_TRIAL_TEAM, LEGENDARY_TRIAL_TEAM, MYTHICAL_TRIAL_TEAM, TITANS_TRIAL_TEAM, CELESTIAL_TRIAL_TEAM,
    EXPANSION_SPECIES, EXPLORATION_SPECIES,
    WILD_SPECIAL_SPECIES: Object.freeze([...WildSpecial.entries, ...Expanded.entries.filter(entry =>
      (entry.legendary || entry.mythical) && !WildSpecial.byId[entry.id])]),
    DRAFT_IDS_BY_GENERATION: draftIdsByGeneration,
    CANONICAL_BY_ID: allById,
    byId: id => allById[Number(id)] || null,
    allMasterIds: MASTER_SPECIES.map(entry => entry.id),
    startingStats: Object.freeze({
      min: Math.min(...DRAFT.map(entry => entry.bst)),
      max: Math.max(...DRAFT.map(entry => entry.bst)),
      average: Math.round(DRAFT.reduce((sum, entry) => sum + entry.bst, 0) / DRAFT.length)
    })
  });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { window.PBACampaign = window.PBACampaign || {}; Object.assign(window.PBACampaign, api); }
})();


