/**
 * ====================================================================
 * CAMADA DE SERVIÇO: POKÉAPI (poke-api.js)
 * ====================================================================
 * Responsável por fazer as requisições HTTP (Fetch API) para a PokéAPI REST
 * e transformar os dados brutos (JSON) em instâncias da classe Pokemon.
 */

const pokeApi = {};

let PokemonClass = typeof Pokemon !== 'undefined' ? Pokemon : null;
if (!PokemonClass && typeof require !== 'undefined') {
  try {
    PokemonClass = require('./pokemon-model.js');
  } catch (e) {}
}
if (!PokemonClass) {
  PokemonClass = class Pokemon {
    constructor() {
      this.number = 0;
      this.name = '';
      this.types = [];
      this.type = '';
      this.photo = '';
      this.animatedPhoto = '';
      this.height = 0;
      this.weight = 0;
      this.abilities = [];
      this.moves = [];
      this.stats = { hp: 0, attack: 0, defense: 0, specialAttack: 0, specialDefense: 0, speed: 0, total: 0 };
      this.speciesUrl = '';
      this.cry = '';
    }
  };
}

/**
 * Converte o JSON bruto da PokéAPI em um objeto padronizado da nossa classe Pokemon.
 * @param {Object} pokeDetail - Objeto retornado pela API contendo dados do Pokémon.
 * @returns {Pokemon} Instância formatada com apenas as propriedades que usamos.
 */
function convertPokeApiDetailToPokemon(pokeDetail) {
  const pokemon = new PokemonClass();
  pokemon.number = pokeDetail.id;
  pokemon.name = pokeDetail.name;

  // Mapeia o array de tipos da PokéAPI para um array simples de strings (ex: ['fire', 'flying'])
  const types = pokeDetail.types.map((typeSlot) => typeSlot.type.name);
  const [type] = types; // Destructuring do JavaScript para pegar o primeiro tipo (tipo primário)

  pokemon.types = types;
  pokemon.type = type;

  // Seleciona a melhor imagem disponível (Artwork Oficial ou imagem padrão)
  pokemon.photo =
    pokeDetail.sprites.other['official-artwork'].front_default ||
    pokeDetail.sprites.other['dream_world'].front_default ||
    pokeDetail.sprites.front_default;

  // Imagem animada (Showdown sprite)
  pokemon.animatedPhoto =
    pokeDetail.sprites.other?.showdown?.front_default ||
    pokeDetail.sprites.front_default;

  // A PokéAPI retorna a altura em decímetros e o peso em hectogramas, dividimos por 10 para converter para m e kg
  pokemon.height = pokeDetail.height / 10;
  pokemon.weight = pokeDetail.weight / 10;

  // Extrai apenas os nomes das habilidades
  pokemon.abilities = pokeDetail.abilities.map((abilitySlot) => abilitySlot.ability.name);

  // Mapeia lista de golpes candidatos disponíveis preservando metadata de version_group_details
  pokemon.moves = Array.isArray(pokeDetail.moves)
    ? pokeDetail.moves.map((slot) => ({
        name: slot.move ? slot.move.name : '',
        url: slot.move ? slot.move.url : '',
        versionGroupDetails: Array.isArray(slot.version_group_details)
          ? slot.version_group_details.map((vg) => ({
              levelLearnedAt: Number(vg.level_learned_at || 0),
              moveLearnMethod: vg.move_learn_method ? String(vg.move_learn_method.name || '') : '',
              versionGroup: vg.version_group ? String(vg.version_group.name || '') : ''
            }))
          : []
      }))
    : [];

  // Mapeia os atributos de status (HP, Ataque, etc.) e calcula o somatório total
  const statsMap = {};
  let totalStats = 0;
  pokeDetail.stats.forEach((statObj) => {
    statsMap[statObj.stat.name] = statObj.base_stat;
    totalStats += statObj.base_stat;
  });

  pokemon.stats = {
    hp: statsMap['hp'] || 0,
    attack: statsMap['attack'] || 0,
    defense: statsMap['defense'] || 0,
    specialAttack: statsMap['special-attack'] || 0,
    specialDefense: statsMap['special-defense'] || 0,
    speed: statsMap['speed'] || 0,
    total: totalStats
  };

  pokemon.speciesUrl = pokeDetail.species ? pokeDetail.species.url : '';
  pokemon.cry = pokeDetail.cries ? (pokeDetail.cries.latest || pokeDetail.cries.legacy) : '';

  return pokemon;
}

/**
 * Busca os detalhes completos de um Pokémon individual via URL ou ID/Nome.
 * @param {string|Object} pokemonOrUrl - URL de detalhes ou objeto simples com a URL.
 * @returns {Promise<Pokemon>} Promise com o Pokémon formatado.
 */
pokeApi.getPokemonDetail = (pokemonOrUrl, signal = null) => {
  let url = '';
  if (typeof pokemonOrUrl === 'string' && pokemonOrUrl.startsWith('http')) {
    url = pokemonOrUrl;
  } else if (typeof pokemonOrUrl === 'object' && pokemonOrUrl !== null && pokemonOrUrl.url) {
    url = pokemonOrUrl.url;
  } else {
    url = `https://pokeapi.co/api/v2/pokemon/${pokemonOrUrl}`;
  }

  const fetchOptions = signal ? { signal } : {};

  return fetch(url, fetchOptions)
    .then((response) => {
      if (!response.ok) throw new Error('Pokémon não encontrado na PokéAPI');
      return response.json(); // Converte a resposta bruta em objeto JavaScript
    })
    .then(convertPokeApiDetailToPokemon);
};

/**
 * Busca uma lista paginada de Pokémon usando Promises em paralelo (Promise.all).
 * @param {number} offset - Ponto de início (índice do primeiro Pokémon da página).
 * @param {number} limit - Quantidade de registros a serem retornados.
 * @returns {Promise<Pokemon[]>} Array com a lista de Pokémons formatados.
 */
pokeApi.getPokemons = (offset = 0, limit = 20) => {
  const url = `https://pokeapi.co/api/v2/pokemon?offset=${offset}&limit=${limit}`;

  return fetch(url)
    .then((response) => response.json())
    .then((jsonBody) => jsonBody.results) // Obtém a lista inicial de nomes e URLs
    .then((pokemons) => pokemons.map(pokeApi.getPokemonDetail)) // Dispara uma requisição de detalhe para cada um
    .then((detailRequests) => Promise.all(detailRequests)) // Aguarda todas as requisições paralelas finalizarem
    .catch((error) => {
      console.error('Erro ao buscar lista de pokemons:', error);
      throw error;
    });
};

/**
 * Busca a linha evolutiva de um Pokémon (Evolution Chain).
 * @param {string} speciesUrl - URL da espécie do Pokémon na PokéAPI.
 * @returns {Promise<Array>} Lista ordenada de estágios evolutivos.
 */
pokeApi.getPokemonEvolutionChain = async (speciesUrl) => {
  if (!speciesUrl) return [];
  try {
    // 1º Passo: Obter os dados da espécie para descobrir a URL da cadeia de evolução
    const speciesRes = await fetch(speciesUrl);
    const speciesData = await speciesRes.json();
    
    if (!speciesData.evolution_chain?.url) return [];

    // 2º Passo: Obter a árvore de evolução
    const evoRes = await fetch(speciesData.evolution_chain.url);
    const evoData = await evoRes.json();

    const chain = [];
    let current = evoData.chain;

    // 3º Passo: Percorrer a estrutura encadeada (Linked List) da árvore de evolução
    while (current) {
      const pokeIdMatch = current.species.url.match(/\/pokemon-species\/(\d+)\//);
      const pokeId = pokeIdMatch ? pokeIdMatch[1] : null;

      chain.push({
        id: pokeId,
        name: current.species.name,
        minLevel: current.evolution_details?.[0]?.min_level || null,
        trigger: current.evolution_details?.[0]?.trigger?.name || null,
        photo: pokeId 
          ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokeId}.png`
          : ''
      });

      current = current.evolves_to && current.evolves_to.length > 0 ? current.evolves_to[0] : null;
    }

    return chain;
  } catch (err) {
    console.warn('Erro ao carregar cadeia de evolução:', err);
    return [];
  }
};

/**
 * Busca Pokémons filtrados diretamente pelo seu Tipo.
 * @param {string} type - Nome do tipo (ex: 'fire', 'water').
 * @param {number} limit - Quantidade máxima a carregar.
 * @returns {Promise<Pokemon[]>}
 */
pokeApi.getPokemonsByType = async (type, limit = 40) => {
  const url = `https://pokeapi.co/api/v2/type/${type}`;
  const response = await fetch(url);
  const data = await response.json();
  const pokemonEntries = data.pokemon.slice(0, limit);
  const detailPromises = pokemonEntries.map(entry => pokeApi.getPokemonDetail(entry.pokemon.url));
  return Promise.all(detailPromises);
};

// Cache em memória para o índice leve do catálogo completo (ID, Nome e URL)
let pokemonIndexCache = null;

/**
 * Obtém o catálogo leve de nomes e IDs de todos os Pokémon da PokéAPI (Fase 1 UX).
 * Permite busca instantânea por nome parcial ou número sem puxar detalhes completos antecipadamente.
 *
 * @param {number} limit - Limite máximo de entradas (padrão: 1025, cobrindo Gens 1 a 9).
 * @param {AbortSignal|null} signal - Sinal para cancelamento de requisição (AbortController).
 * @returns {Promise<Array<{ id: number, name: string, url: string }>>}
 */
pokeApi.getPokemonIndex = async (limit = 1025, signal = null) => {
  if (pokemonIndexCache && pokemonIndexCache.length >= limit) {
    return pokemonIndexCache.slice(0, limit);
  }

  // Tenta ler do sessionStorage se estiver no navegador
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      const stored = window.sessionStorage.getItem('pba_pokemon_index');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length >= limit) {
          pokemonIndexCache = parsed;
          return parsed.slice(0, limit);
        }
      }
    } catch (e) {
      // Ignora falhas de storage (ex: navegação privada ou restrições de sandbox)
    }
  }

  const url = `https://pokeapi.co/api/v2/pokemon?limit=${limit}`;
  const fetchOptions = signal ? { signal } : {};
  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    throw new Error(`Erro ao carregar índice de Pokémon na PokéAPI (status: ${response.status})`);
  }

  const jsonBody = await response.json();
  const rawResults = Array.isArray(jsonBody.results) ? jsonBody.results : [];

  const index = rawResults.map((item) => {
    const match = item.url ? item.url.match(/\/pokemon\/(\d+)\//) : null;
    const id = match ? parseInt(match[1], 10) : 0;
    return {
      id,
      name: item.name ? String(item.name).toLowerCase() : '',
      url: item.url || ''
    };
  }).filter((entry) => entry.id > 0);

  pokemonIndexCache = index;

  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.setItem('pba_pokemon_index', JSON.stringify(index));
    } catch (e) {}
  }

  return index.slice(0, limit);
};

/**
 * Injeta manualmente o índice leve (útil para testes unitários offline e simulação determinística).
 * @param {Array<{ id: number, name: string, url: string }>} entries
 */
pokeApi.setPokemonIndex = (entries) => {
  pokemonIndexCache = Array.isArray(entries) ? [...entries] : [];
};

/**
 * Limpa o cache do índice em memória e no sessionStorage.
 */
pokeApi.clearPokemonIndex = () => {
  pokemonIndexCache = null;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    try {
      window.sessionStorage.removeItem('pba_pokemon_index');
    } catch (e) {}
  }
};


// Cache em memória para golpes já consultados (evita requisições redundantes à PokéAPI)
const moveDetailCache = new Map();

/**
 * Busca detalhes de um golpe (Move) na PokéAPI com cache em memória
 * e o normaliza via MoveModel (PBA-005).
 *
 * @param {string|number|Object} moveOrIdOrUrl - Nome, ID, URL ou objeto { url } do golpe.
 * @returns {Promise<Object>} Objeto Move normalizado e imutável.
 */
pokeApi.getMoveDetail = async (moveOrIdOrUrl) => {
  if (!moveOrIdOrUrl) {
    throw new Error('Identificador do golpe é obrigatório.');
  }

  let cacheKey;
  let url;

  if (typeof moveOrIdOrUrl === 'object' && moveOrIdOrUrl !== null) {
    if (moveOrIdOrUrl.url) {
      url = moveOrIdOrUrl.url;
      cacheKey = String(moveOrIdOrUrl.name || url).toLowerCase();
    } else if (moveOrIdOrUrl.name || moveOrIdOrUrl.id) {
      const identifier = String(moveOrIdOrUrl.name || moveOrIdOrUrl.id).trim().toLowerCase();
      cacheKey = identifier;
      url = `https://pokeapi.co/api/v2/move/${identifier}`;
    } else {
      cacheKey = String(moveOrIdOrUrl).trim().toLowerCase();
      url = `https://pokeapi.co/api/v2/move/${cacheKey}`;
    }
  } else if (typeof moveOrIdOrUrl === 'string' && moveOrIdOrUrl.startsWith('http')) {
    url = moveOrIdOrUrl;
    cacheKey = url.toLowerCase();
  } else {
    cacheKey = String(moveOrIdOrUrl).trim().toLowerCase();
    url = `https://pokeapi.co/api/v2/move/${cacheKey}`;
  }

  if (moveDetailCache.has(cacheKey)) {
    return moveDetailCache.get(cacheKey);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro ao buscar golpe "${cacheKey}" na PokéAPI (status: ${response.status}).`);
  }

  const rawData = await response.json();

  let normalizedMove;
  try {
    if (typeof window !== 'undefined' && window.PBABattle && window.PBABattle.MoveModel) {
      normalizedMove = window.PBABattle.MoveModel.convertPokeApiMove(rawData);
    } else if (typeof require !== 'undefined') {
      const MoveModel = require('./battle/move-model.js');
      normalizedMove = MoveModel.convertPokeApiMove(rawData);
    } else {
      normalizedMove = {
        id: rawData.id,
        name: rawData.name,
        type: rawData.type?.name,
        power: rawData.power,
        accuracy: rawData.accuracy,
        pp: rawData.pp,
        damageClass: rawData.damage_class?.name
      };
    }
  } catch (err) {
    // Se o MoveModel rejeitou por ser status move ou power nulo,
    // retornamos os metadados brutos resolvidos com sucesso da API para que
    // a camada de hidratação saiba que a API respondeu normalmente.
    normalizedMove = {
      id: rawData.id,
      name: rawData.name,
      type: rawData.type?.name || 'normal',
      power: rawData.power,
      accuracy: rawData.accuracy,
      pp: rawData.pp,
      damageClass: rawData.damage_class?.name || 'status'
    };
  }

  moveDetailCache.set(cacheKey, normalizedMove);
  if (normalizedMove.id) {
    moveDetailCache.set(String(normalizedMove.id), normalizedMove);
  }
  if (normalizedMove.name) {
    moveDetailCache.set(normalizedMove.name.toLowerCase(), normalizedMove);
  }

  return normalizedMove;
};

// Permite limpar o cache durante testes se necessário
pokeApi.clearMoveCache = () => {
  moveDetailCache.clear();
};

pokeApi.getMoveCache = () => moveDetailCache;
pokeApi.convertPokeApiDetailToPokemon = convertPokeApiDetailToPokemon;
pokeApi.pokeApi = pokeApi;

if (typeof window !== 'undefined') {
  window.pokeApi = pokeApi;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = pokeApi;
}

