/**
 * ====================================================================
 * CONTROLE DE INTERFACE & EVENTOS (main.js)
 * ====================================================================
 * Gerencia os elementos do DOM (HTML), estados da aplicação,
 * filtros, busca, paginação, tema (Dark/Light) e LocalStorage.
 */

// Resolução segura de pokeApi para ambientes Node.js (testes unitários) e Navegador
if (typeof globalThis !== 'undefined' && !globalThis.pokeApi) {
  if (typeof window !== 'undefined' && window.pokeApi) {
    globalThis.pokeApi = window.pokeApi;
  } else if (typeof require !== 'undefined') {
    try {
      globalThis.pokeApi = require('./poke-api.js');
    } catch (_) {}
  }
}

// 1. MAPEAMENTO DOS ELEMENTOS DO DOM (com guard para compatibilidade Node/Browser)
let doc = typeof document !== 'undefined' ? document : null;
let pokemonListElement = doc ? doc.getElementById('pokemonList') : null;
let loadMoreButton = doc ? doc.getElementById('loadMoreButton') : null;
let searchInput = doc ? doc.getElementById('searchInput') : null;
let clearSearchBtn = doc ? doc.getElementById('clearSearchBtn') : null;
let sortSelect = doc ? doc.getElementById('sortSelect') : null;
let generationSelect = doc ? doc.getElementById('generationSelect') : null;
let typePills = doc ? (doc.querySelectorAll ? doc.querySelectorAll('.type-pill') : []) : [];
let themeToggleBtn = doc ? doc.getElementById('themeToggleBtn') : null;
let favoritesToggleBtn = doc ? doc.getElementById('favoritesToggleBtn') : null;
let favCounterBadge = doc ? doc.getElementById('favCounter') : null;
let resultCountEl = doc ? doc.getElementById('resultCount') : null;

// Elementos do Modal de Detalhes
let pokemonModal = doc ? doc.getElementById('pokemonModal') : null;
let modalOverlay = doc ? doc.getElementById('modalOverlay') : null;
let closeModalBtn = doc ? doc.getElementById('closeModalBtn') : null;
let modalContent = doc ? doc.getElementById('modalDynamicContent') : null;

/**
 * Re-sincroniza o mapeamento dos elementos do DOM (essencial para testes e re-renderização).
 */
function refreshDomElements(customDoc = null) {
  if (customDoc) {
    doc = customDoc;
  } else if (typeof document !== 'undefined') {
    doc = document;
  }
  if (!doc) return;
  pokemonListElement = doc.getElementById('pokemonList');
  loadMoreButton = doc.getElementById('loadMoreButton');
  searchInput = doc.getElementById('searchInput');
  clearSearchBtn = doc.getElementById('clearSearchBtn');
  sortSelect = doc.getElementById('sortSelect');
  generationSelect = doc.getElementById('generationSelect');
  typePills = doc.querySelectorAll ? doc.querySelectorAll('.type-pill') : [];
  themeToggleBtn = doc.getElementById('themeToggleBtn');
  favoritesToggleBtn = doc.getElementById('favoritesToggleBtn');
  favCounterBadge = doc.getElementById('favCounter');
  resultCountEl = doc.getElementById('resultCount');

  pokemonModal = doc.getElementById('pokemonModal');
  modalOverlay = doc.getElementById('modalOverlay');
  closeModalBtn = doc.getElementById('closeModalBtn');
  modalContent = doc.getElementById('modalDynamicContent');
}

// 2. ESTADOS DA APLICAÇÃO (Variáveis de controle)
const limit = 20;               // Quantidade de cards por página
let offset = 0;                 // Ponto de partida na paginação
let maxLimit = 151;             // Limite máximo da geração selecionada
let currentPokemons = [];       // Lista filtrada e exibida na tela
let allLoadedPokemons = [];     // Memória cache dos pokémons já carregados
if (typeof window !== 'undefined') {
  window.allLoadedPokemons = allLoadedPokemons;
}
let selectedType = 'all';       // Tipo selecionado no filtro
let selectedGeneration = '1';   // Geração selecionada
let loadedGeneration = '1';     // Geração a que pertence o lote atual em allLoadedPokemons (Fase 1 UX)
let loadedType = 'all';         // Tipo a que pertence o lote atual em allLoadedPokemons (Fase 1 UX)
let regularLoadSequenceToken = 0; // Proteção contra respostas atrasadas do carregamento regular
let currentSearchTerm = '';     // Termo de busca digitado pelo usuário
let currentSort = 'id-asc';     // Tipo de ordenação ativa
let showingFavoritesOnly = false; // Flag para alternar visualização de favoritos
let favoritesVersion = 0;       // Versão incremental para invalidação segura do cache de favoritos (Fase 1 UX)

// Estados específicos da Busca Completa do Catálogo (Fase 1 UI/UX)
let searchDebounceTimer = null;
let searchSequenceToken = 0;
let searchAbortController = null;
const searchResultsCache = new Map();
const searchDetailsCache = new Map();
let isSearchingCatalog = false;
let currentSearchCandidates = [];
let searchRenderOffset = 0;
const SEARCH_PAGE_SIZE = 20;
let lastSearchQuery = '';

// Estados de Foco e Acessibilidade do Modal (Fase 1 UI/UX)
let lastFocusedElement = null;
let modalLoadSeq = 0;
let isModalOpen = false;

// Carrega os IDs favoritos salvos no navegador (LocalStorage)
let favoritePokemonIds = (typeof localStorage !== 'undefined')
  ? JSON.parse(localStorage.getItem('pokedex_favorites') || '[]')
  : [];

// Dicionário de cores CSS mapeado por tipo Pokémon
const typeColors = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
  grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
  ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
  rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', dark: '#705746',
  steel: '#B7B7CE', fairy: '#D685AD'
};

// Intervalos de IDs por Geração Pokémon
const generationRanges = {
  '1': { offset: 0, max: 151 },
  '2': { offset: 151, max: 251 },
  '3': { offset: 251, max: 386 },
  '4': { offset: 386, max: 493 },
  '5': { offset: 493, max: 649 },
  '6': { offset: 649, max: 721 },
  '7': { offset: 721, max: 809 },
  '8': { offset: 809, max: 905 },
  '9': { offset: 905, max: 1025 },
  'all': { offset: 0, max: 1025 }
};

// Rótulos amigáveis de geração para feedback da busca
const generationLabels = {
  '1': '1ª Geração (Kanto)',
  '2': '2ª Geração (Johto)',
  '3': '3ª Geração (Hoenn)',
  '4': '4ª Geração (Sinnoh)',
  '5': '5ª Geração (Unova)',
  '6': '6ª Geração (Kalos)',
  '7': '7ª Geração (Alola)',
  '8': '8ª Geração (Galar)',
  '9': '9ª Geração (Paldea)',
  'all': 'Todas as Gerações'
};

// SVG decorativo da Pokébola para o fundo dos cards
const pokeballSvg = `
  <svg viewBox="0 0 100 100" fill="currentColor" class="pokemon-card-watermark">
    <path d="M50 0 C22.4 0 0 22.4 0 50 C0 77.6 22.4 100 50 100 C77.6 100 100 77.6 100 50 C100 22.4 77.6 0 50 0 Z M50 8 C70.5 8 87.5 22.7 91.3 42.5 L69.5 42.5 C66.8 33.4 59.2 26.8 50 26.8 C40.8 26.8 33.2 33.4 30.5 42.5 L8.7 42.5 C12.5 22.7 29.5 8 50 8 Z M50 92 C29.5 92 12.5 77.3 8.7 57.5 L30.5 57.5 C33.2 66.6 40.8 73.2 50 73.2 C59.2 73.2 66.8 66.6 69.5 57.5 L91.3 57.5 C87.5 77.3 70.5 92 50 92 Z M50 35 C58.3 35 65 41.7 65 50 C65 58.3 58.3 65 50 65 C41.7 65 35 58.3 35 50 C35 41.7 41.7 35 50 35 Z M50 42.5 C45.9 42.5 42.5 45.9 42.5 50 C42.5 54.1 45.9 57.5 50 57.5 C54.1 57.5 50 54.1 50 50 C57.5 45.9 54.1 42.5 50 42.5 Z"/>
  </svg>
`;

/**
 * Escapa strings para inserção segura no DOM.
 */
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 3. CRIAÇÃO DINÂMICA DO CARD (HTML)
 * Usa Template Literals para interpolar dados no HTML.
 * O card permanece um `li`. Inclui um botão nativo dedicado para 'Ver detalhes'
 * acessível via teclado (Tab/Enter/Espaço) e mouse, com foco visível.
 * O botão de favorito é independente e desacoplado.
 */
function createPokemonCard(pokemon) {
  if (!pokemon) return '';
  const isFav = favoritePokemonIds.includes(pokemon.number);
  const isInTeam = (typeof window !== 'undefined' && window.teamManager) ? window.teamManager.hasPokemon(pokemon.number) : false;
  const primaryColor = typeColors[pokemon.type] || '#777';
  const paddedId = `#${String(pokemon.number).padStart(3, '0')}`;
  const rawName = String(pokemon.name || '');
  const capitalizedName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : '';

  const typesHtml = (pokemon.types || [])
    .map(type => `<span class="type-badge" style="background-color: ${typeColors[type] || '#777'};">${type}</span>`)
    .join('');

  return `
    <li class="pokemon-card ${pokemon.type || 'normal'}" 
        data-id="${pokemon.number}" 
        style="--card-color: ${primaryColor}; --card-glow: ${primaryColor}40;">
      
      ${pokeballSvg}

      <!-- Botão nativo dedicado à abertura de detalhes (acessível por teclado e clique) -->
      <button type="button" 
              class="pokemon-card-action-btn" 
              aria-label="Ver detalhes de ${capitalizedName}" 
              onclick="openPokemonDetails(${pokemon.number})"></button>

      <div class="card-header">
        <div class="card-badges">
          <span class="pokemon-id">${paddedId}</span>
          ${isInTeam ? `<span class="team-card-badge" title="No seu time"><i class="fa-solid fa-shield-halved" aria-hidden="true"></i> No time</span>` : ''}
        </div>
        <button type="button" 
                class="fav-btn ${isFav ? 'active' : ''}" 
                title="${isFav ? 'Remover dos favoritos' : 'Favoritar'}" 
                aria-label="${isFav ? `Remover ${capitalizedName} dos favoritos` : `Favoritar ${capitalizedName}`}" 
                aria-pressed="${isFav ? 'true' : 'false'}" 
                onclick="event.stopPropagation(); toggleFavorite(${pokemon.number});">
          <i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>
        </button>
      </div>

      <h3 class="pokemon-name">${pokemon.name}</h3>

      <div class="card-body">
        <div class="types-list">
          ${typesHtml}
        </div>
        <div class="image-wrapper">
          <img class="pokemon-img" 
               src="${pokemon.photo}" 
               alt="${pokemon.name}" 
               loading="lazy"
               onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.number}.png'">
        </div>
      </div>
    </li>
  `;
}

/**
 * Atualiza o indicador numérico de favoritos no topo da página.
 */
function updateFavoriteCounter() {
  if (!favCounterBadge) return;
  favCounterBadge.textContent = favoritePokemonIds.length;
  favCounterBadge.style.display = favoritePokemonIds.length > 0 ? 'inline-block' : 'none';
}

/**
 * Adiciona ou remove um Pokémon da lista de favoritos com persistência no LocalStorage.
 */
const toggleFavorite = function(pokemonId) {
  const index = favoritePokemonIds.indexOf(pokemonId);
  if (index > -1) {
    favoritePokemonIds.splice(index, 1);
  } else {
    favoritePokemonIds.push(pokemonId);
  }
  favoritesVersion++;
  
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('pokedex_favorites', JSON.stringify(favoritePokemonIds));
  }
  updateFavoriteCounter();

  if (showingFavoritesOnly) {
    const term = (searchInput && searchInput.value) ? searchInput.value.trim() : (currentSearchTerm || '').trim();
    if (isSearchingCatalog && term !== '') {
      return executeCatalogSearch(term);
    } else {
      applyFiltersAndSort();
    }
  } else {
    const card = doc ? doc.querySelector(`.pokemon-card[data-id="${pokemonId}"]`) : null;
    if (card) {
      const btn = card.querySelector('.fav-btn');
      const isFav = favoritePokemonIds.includes(pokemonId);
      const nameEl = card.querySelector('.pokemon-name');
      const rawName = nameEl ? nameEl.textContent.trim() : '';
      const capName = rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : '';
      if (btn) {
        btn.className = `fav-btn ${isFav ? 'active' : ''}`;
        btn.setAttribute('aria-pressed', isFav ? 'true' : 'false');
        btn.title = isFav ? 'Remover dos favoritos' : 'Favoritar';
        btn.setAttribute('aria-label', isFav ? `Remover ${capName} dos favoritos` : `Favoritar ${capName}`);
        btn.innerHTML = `<i class="${isFav ? 'fa-solid' : 'fa-regular'} fa-heart" aria-hidden="true"></i>`;
      }
    }
  }
};
if (typeof window !== 'undefined') {
  window.toggleFavorite = toggleFavorite;
}

/**
 * 4. CARREGAMENTO E PAGINAÇÃO
 * Carrega lotes de Pokémon conforme o usuário clica em "Carregar Mais".
 */
function loadPokemonItems(initial = false) {
  if (!loadMoreButton || !pokemonListElement) return Promise.resolve();

  // Captura os parâmetros exatos e token único no início da operação
  const loadToken = ++regularLoadSequenceToken;
  const requestGen = selectedGeneration;
  const requestType = selectedType;
  const genRange = generationRanges[requestGen] || generationRanges['1'];

  const requestOffset = initial ? genRange.offset : offset;
  const requestMaxLimit = initial ? genRange.max : maxLimit;

  if (initial) {
    offset = requestOffset;
    maxLimit = requestMaxLimit;
    allLoadedPokemons = [];
    currentPokemons = [];
    pokemonListElement.innerHTML = createSkeletonsHtml(8);
  }

  loadMoreButton.disabled = true;
  loadMoreButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Carregando...';

  const currentLimit = Math.min(limit, requestMaxLimit - requestOffset);

  if (currentLimit <= 0) {
    loadMoreButton.style.display = 'none';
    return Promise.resolve();
  }

  return pokeApi.getPokemons(requestOffset, currentLimit)
    .then((newPokemons = []) => {
      // Verificação estrita de validade: descarta respostas obsoletas, fora de contexto ou enquanto em busca ativa
      if (loadToken !== regularLoadSequenceToken) return;
      if (selectedGeneration !== requestGen || selectedType !== requestType) return;
      if (isSearchingCatalog) return;

      if (initial) {
        allLoadedPokemons = newPokemons || [];
      } else {
        allLoadedPokemons.push(...(newPokemons || []));
      }
      loadedGeneration = requestGen;
      loadedType = requestType;

      if (typeof window !== 'undefined') {
        window.allLoadedPokemons = allLoadedPokemons;
      }

      // Adiciona ao cache detalhado de busca
      (newPokemons || []).forEach(p => searchDetailsCache.set(p.number, p));

      offset = requestOffset + (newPokemons || []).length;
      maxLimit = requestMaxLimit;
      applyFiltersAndSort();

      if (offset >= maxLimit || selectedType !== 'all') {
        loadMoreButton.style.display = 'none';
      } else {
        loadMoreButton.style.display = 'flex';
        loadMoreButton.innerHTML = '<span>Carregar Mais</span> <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
        loadMoreButton.disabled = false;
      }
    })
    .catch((err) => {
      if (loadToken !== regularLoadSequenceToken) return;
      if (selectedGeneration !== requestGen || selectedType !== requestType) return;
      if (isSearchingCatalog) return;

      console.error(err);
      pokemonListElement.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">⚠️</div>
          <h3>Erro ao carregar Pokémon</h3>
          <p>Verifique sua conexão e tente novamente.</p>
        </div>
      `;
      loadMoreButton.style.display = 'none';
    });
}

/**
 * Carrega a lista quando o usuário seleciona um tipo específico nas pílulas.
 * Respeita simultaneamente o tipo, a geração ativa e o escopo canônico (1..1025).
 */
async function loadPokemonsByType(type) {
  if (!pokemonListElement || !loadMoreButton) return;

  const loadToken = ++regularLoadSequenceToken;
  const requestGen = selectedGeneration;
  const requestType = type;

  pokemonListElement.innerHTML = createSkeletonsHtml(8);
  loadMoreButton.style.display = 'none';

  try {
    // 1. Obter os IDs associados ao tipo via índice leve
    const idSet = (typeof pokeApi.getTypePokemonIds === 'function')
      ? await pokeApi.getTypePokemonIds(type)
      : null;

    let rawIds = [];
    if (idSet && typeof idSet.forEach === 'function') {
      rawIds = Array.from(idSet);
    } else if (Array.isArray(idSet)) {
      rawIds = idSet;
    } else if (typeof pokeApi.getPokemonsByType === 'function') {
      const legacyPokemons = await pokeApi.getPokemonsByType(type, 1025);
      rawIds = (legacyPokemons || []).map(p => p.number);
    }

    // Validação estrita de contexto antes de carregar detalhes
    if (loadToken !== regularLoadSequenceToken) return;
    if (selectedType !== requestType || selectedGeneration !== requestGen) return;
    if (isSearchingCatalog) return;

    // 2. Restringir os IDs ao intervalo da geração selecionada e ao escopo canônico suportado (1..1025)
    const genRange = generationRanges[requestGen] || generationRanges['all'];
    const minId = genRange.offset + 1;
    const maxId = Math.min(genRange.max, 1025);

    const eligibleIds = rawIds
      .map(Number)
      .filter(id => Number.isInteger(id) && id >= minId && id <= maxId);

    // 3. Aplicar ordenação determinística (crescente por número)
    eligibleIds.sort((a, b) => a - b);

    // 4. Aplicar o limite de carregamento (máximo 60 espécies elegíveis da geração)
    const TYPE_PAGE_LIMIT = 60;
    const targetIds = eligibleIds.slice(0, TYPE_PAGE_LIMIT);

    // 5. Carregar os detalhes SOMENTE das espécies elegíveis (reaproveitando searchDetailsCache)
    const detailPromises = targetIds.map(async (id) => {
      if (searchDetailsCache.has(id)) {
        return searchDetailsCache.get(id);
      }
      const detail = await pokeApi.getPokemonDetail(id);
      if (detail) {
        searchDetailsCache.set(detail.number, detail);
      }
      return detail;
    });

    const pokemons = (await Promise.all(detailPromises)).filter(Boolean);

    // 6. Atualizar a listagem e seu contexto após validar a operação
    if (loadToken !== regularLoadSequenceToken) return;
    if (selectedType !== requestType || selectedGeneration !== requestGen) return;
    if (isSearchingCatalog) return;

    allLoadedPokemons = pokemons || [];
    loadedGeneration = requestGen;
    loadedType = requestType;

    if (typeof window !== 'undefined') {
      window.allLoadedPokemons = allLoadedPokemons;
    }
    applyFiltersAndSort();
  } catch (err) {
    if (loadToken !== regularLoadSequenceToken) return;
    if (selectedType !== requestType || selectedGeneration !== requestGen) return;
    if (isSearchingCatalog) return;

    console.error(err);
    pokemonListElement.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⚠️</div>
        <h3>Erro ao carregar Pokémon</h3>
        <p>Verifique sua conexão e tente novamente.</p>
      </div>
    `;
    loadMoreButton.style.display = 'none';
  }
}

/**
 * 5. FILTROS, BUSCA E ORDENAÇÃO
 * Aplica as regras de filtragem sobre o array de dados em memória quando não estiver em busca global.
 */
function applyFiltersAndSort() {
  if (isSearchingCatalog) return;

  let filtered = [...allLoadedPokemons];

  // Filtro de Favoritos
  if (showingFavoritesOnly) {
    filtered = filtered.filter(p => favoritePokemonIds.includes(p.number));
  }

  // Filtro de Tipo
  if (selectedType !== 'all' && !filtered.every(p => p.types.includes(selectedType))) {
    filtered = filtered.filter(p => p.types.includes(selectedType));
  }

  // Filtro de Geração na exibição
  if (selectedGeneration !== 'all') {
    const range = generationRanges[selectedGeneration];
    if (range) {
      filtered = filtered.filter(p => p.number > range.offset && p.number <= range.max);
    }
  } else {
    filtered = filtered.filter(p => p.number >= 1 && p.number <= 1025);
  }

  // Algoritmos de Ordenação (Array.prototype.sort)
  switch (currentSort) {
    case 'id-asc':
      filtered.sort((a, b) => a.number - b.number);
      break;
    case 'id-desc':
      filtered.sort((a, b) => b.number - a.number);
      break;
    case 'name-asc':
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      filtered.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'stat-desc':
      filtered.sort((a, b) => b.stats.total - a.stats.total);
      break;
  }

  currentPokemons = filtered;
  renderPokemons(filtered);
}

/**
 * Renderiza a lista de cartões no DOM.
 */
function renderPokemons(pokemons) {
  if (!resultCountEl || !pokemonListElement) return;

  if (!isSearchingCatalog) {
    resultCountEl.textContent = `Mostrando ${pokemons.length} Pokémon`;
  }

  if (pokemons.length === 0) {
    pokemonListElement.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>Nenhum Pokémon encontrado</h3>
        <p>Tente ajustar seus filtros para encontrar o que procura.</p>
      </div>
    `;
    return;
  }

  pokemonListElement.innerHTML = pokemons.map(createPokemonCard).join('');
}

/**
 * Gera skeletons (cards vazios animados) enquanto a requisição HTTP está em andamento.
 */
function createSkeletonsHtml(count) {
  return Array.from({ length: count }).map(() => `
    <li class="skeleton-card">
      <div class="skeleton-line" style="width: 35%; height: 16px;"></div>
      <div class="skeleton-line" style="width: 70%; height: 26px; margin: 10px 0;"></div>
      <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div class="skeleton-line" style="width: 50px; height: 22px; border-radius: 12px;"></div>
          <div class="skeleton-line" style="width: 50px; height: 22px; border-radius: 12px;"></div>
        </div>
        <div class="skeleton-line" style="width: 90px; height: 90px; border-radius: 50%;"></div>
      </div>
    </li>
  `).join('');
}

/**
 * ====================================================================
 * BUSCA COMPLETA DA POKÉDEX (Fase 1 UI/UX)
 * ====================================================================
 * Localiza espécies no catálogo completo (1025) por nome, parte do nome ou ID.
 * Implementa debounce (~300ms), cancelamento via AbortController, proteção
 * contra respostas fora de ordem, cache, estados claros de loading/erro/vazio
 * e paginação sob demanda.
 */

function handleSearchInput(e) {
  const rawValue = e.target.value;
  if (clearSearchBtn) {
    clearSearchBtn.style.display = rawValue ? 'inline-flex' : 'none';
  }

  clearTimeout(searchDebounceTimer);

  const trimmed = rawValue.trim();
  if (trimmed === '') {
    clearSearch(false);
    return;
  }

  searchDebounceTimer = setTimeout(() => {
    executeCatalogSearch(trimmed);
  }, 300);
}

function clearSearch(focusInput = true) {
  clearTimeout(searchDebounceTimer);
  if (searchAbortController) {
    try { searchAbortController.abort(); } catch (err) {}
    searchAbortController = null;
  }

  if (searchInput) {
    searchInput.value = '';
  }
  currentSearchTerm = '';
  if (clearSearchBtn) {
    clearSearchBtn.style.display = 'none';
  }

  isSearchingCatalog = false;
  currentSearchCandidates = [];
  searchRenderOffset = 0;
  lastSearchQuery = '';

  // Invalida requisições regulares prévias para isolar o novo ciclo
  regularLoadSequenceToken++;

  // Restaura listagem da geração e tipo atualmente selecionados:
  // Se o contexto em memória diferir dos filtros ativos ou estiver vazio,
  // recarrega a listagem adequada para o contexto atual
  let loadPromise = Promise.resolve();
  const isContextCompatible = (loadedGeneration === selectedGeneration) &&
                              (loadedType === selectedType) &&
                              (allLoadedPokemons && allLoadedPokemons.length > 0);

  if (!isContextCompatible) {
    if (selectedType === 'all') {
      loadPromise = loadPokemonItems(true);
    } else {
      loadPromise = loadPokemonsByType(selectedType);
    }
  } else {
    applyFiltersAndSort();

    // Restaura o botão de paginação da listagem regular
    if (loadMoreButton) {
      if (offset >= maxLimit || selectedType !== 'all') {
        loadMoreButton.style.display = 'none';
      } else {
        loadMoreButton.style.display = 'flex';
        loadMoreButton.innerHTML = '<span>Carregar Mais</span> <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>';
        loadMoreButton.disabled = false;
      }
    }
  }

  if (focusInput && searchInput) {
    searchInput.focus();
  }

  return loadPromise;
}

async function executeCatalogSearch(query) {
  if (!query || query.trim() === '') {
    clearSearch(false);
    return;
  }

  regularLoadSequenceToken++; // Invalida qualquer carregamento regular pendente ao iniciar a busca
  const token = ++searchSequenceToken;
  if (searchAbortController) {
    try { searchAbortController.abort(); } catch (e) {}
  }
  searchAbortController = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const signal = searchAbortController ? searchAbortController.signal : null;

  isSearchingCatalog = true;
  currentSearchTerm = query;
  lastSearchQuery = query;

  const clean = query.toLowerCase().replace(/^#/, '').trim();
  const isNumeric = /^\d+$/.test(clean);
  const queryNum = isNumeric ? parseInt(clean, 10) : null;

  if (pokemonListElement) {
    pokemonListElement.innerHTML = createSkeletonsHtml(6);
  }
  if (resultCountEl) {
    resultCountEl.textContent = 'Pesquisando no catálogo...';
  }
  if (loadMoreButton) {
    loadMoreButton.style.display = 'none';
  }

  // Verifica cache de resultado de busca (inclui versão de favoritos para invalidar remoções/adições)
  const favPart = showingFavoritesOnly ? `fav:${favoritesVersion}` : 'fav:off';
  const cacheKey = `${clean}|gen:${selectedGeneration}|type:${selectedType}|${favPart}|sort:${currentSort}`;
  if (searchResultsCache.has(cacheKey)) {
    const cachedData = searchResultsCache.get(cacheKey);
    currentSearchCandidates = cachedData.candidates;
    searchRenderOffset = cachedData.renderedCount;
    currentPokemons = cachedData.pokemons;
    renderPokemons(cachedData.pokemons);
    updateSearchResultCountAndButton(cachedData.pokemons.length, cachedData.candidates.length);
    return;
  }

  // 1. Obtém o catálogo leve da PokéAPI
  let catalog = [];
  try {
    catalog = await pokeApi.getPokemonIndex(1025, signal);
  } catch (err) {
    if (signal && signal.aborted || token !== searchSequenceToken) return;
    console.error('Erro ao carregar catálogo para busca:', err);
    renderSearchError(query);
    return;
  }
  if (signal && signal.aborted || token !== searchSequenceToken) return;

  // 2. Localiza candidatos correspondentes (nome exato, prefixo, substring, número)
  const matchedCandidates = [];
  for (const entry of catalog) {
    const id = entry.id;
    const name = entry.name.toLowerCase();
    let score = -1;

    if (isNumeric) {
      if (id === queryNum) {
        score = 0; // Exato (ex: 25 ou #25)
      } else if (String(id).startsWith(clean)) {
        score = 1; // Prefixo do número
      } else if (String(id).includes(clean)) {
        score = 2; // Contém número
      }
    } else {
      if (name === clean) {
        score = 0; // Nome exato
      } else if (name.startsWith(clean)) {
        score = 1; // Prefixo (ex: 'pika' -> 'pikachu')
      } else if (name.includes(clean)) {
        score = 2; // Substring
      }
    }

    if (score >= 0) {
      matchedCandidates.push({
        ...entry,
        score
      });
    }
  }

  // 3. Validação de Escopo de Geração Ativa
  const genRange = generationRanges[selectedGeneration] || generationRanges['all'];
  const minId = genRange.offset + 1;
  const maxId = genRange.max;

  const inGenCandidates = matchedCandidates.filter(c => c.id >= minId && c.id <= maxId);

  // Se nenhum resultado na geração ativa, mas encontrado em outra geração:
  if (matchedCandidates.length > 0 && inGenCandidates.length === 0) {
    currentSearchCandidates = [];
    currentPokemons = [];
    searchRenderOffset = 0;
    searchResultsCache.set(cacheKey, { candidates: [], pokemons: [], renderedCount: 0 });
    const firstMatch = matchedCandidates[0];
    let foundGen = null;
    for (const [gKey, range] of Object.entries(generationRanges)) {
      if (gKey === 'all') continue;
      if (firstMatch.id > range.offset && firstMatch.id <= range.max) {
        foundGen = gKey;
        break;
      }
    }
    const currentGenLabel = generationLabels[selectedGeneration] || 'Geração Atual';
    const foundGenLabel = foundGen ? generationLabels[foundGen] : 'outra geração';

    if (resultCountEl) resultCountEl.textContent = '0 Pokémon encontrados';
    if (pokemonListElement) {
      pokemonListElement.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>Nenhum resultado na ${currentGenLabel}</h3>
          <p>O termo "<strong>${escapeHtml(query)}</strong>" foi encontrado na <strong>${foundGenLabel}</strong> (#${firstMatch.id} ${firstMatch.name}).</p>
          <div class="empty-state-actions">
            <button type="button" class="btn-clear-filter" onclick="switchGenerationFilter('all')">
              <i class="fa-solid fa-globe" aria-hidden="true"></i> Buscar em Todas as Gerações
            </button>
            ${foundGen ? `
              <button type="button" class="btn-clear-filter" onclick="switchGenerationFilter('${foundGen}')">
                <i class="fa-solid fa-arrow-right" aria-hidden="true"></i> Ir para ${foundGenLabel}
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }
    if (loadMoreButton) loadMoreButton.style.display = 'none';
    return;
  }

  // 4. Filtro por Tipo ativo (ANTES da divisão em páginas!)
  let inTypeCandidates = inGenCandidates;
  if (selectedType !== 'all') {
    let typeIdSet;
    try {
      typeIdSet = await pokeApi.getTypePokemonIds(selectedType, signal);
    } catch (err) {
      if ((signal && signal.aborted) || token !== searchSequenceToken) return;
      console.error('Erro ao obter índice de tipos:', err);
      renderSearchError(query);
      return;
    }
    if ((signal && signal.aborted) || token !== searchSequenceToken) return;

    inTypeCandidates = inGenCandidates.filter(c => typeIdSet.has(c.id));
    if (inGenCandidates.length > 0 && inTypeCandidates.length === 0) {
      currentSearchCandidates = [];
      currentPokemons = [];
      searchRenderOffset = 0;
      searchResultsCache.set(cacheKey, { candidates: [], pokemons: [], renderedCount: 0 });
      if (resultCountEl) resultCountEl.textContent = '0 Pokémon encontrados';
      if (pokemonListElement) {
        pokemonListElement.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚡</div>
            <h3>Filtro por tipo impedindo resultados</h3>
            <p>O Pokémon "<strong>${escapeHtml(query)}</strong>" foi encontrado, mas não pertence ao tipo "<strong>${selectedType}</strong>".</p>
            <div class="empty-state-actions">
              <button type="button" class="btn-clear-filter" onclick="clearTypeFilter()">
                <i class="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i> Ver todos os tipos
              </button>
            </div>
          </div>
        `;
      }
      if (loadMoreButton) loadMoreButton.style.display = 'none';
      return;
    }
  }

  // 5. Validação de Filtro de Favoritos (sobre os candidatos elegíveis de geração e tipo)
  let eligibleCandidates = inTypeCandidates;
  if (showingFavoritesOnly) {
    eligibleCandidates = eligibleCandidates.filter(c => favoritePokemonIds.includes(c.id));
    if (inTypeCandidates.length > 0 && eligibleCandidates.length === 0) {
      currentSearchCandidates = [];
      currentPokemons = [];
      searchRenderOffset = 0;
      searchResultsCache.set(cacheKey, { candidates: [], pokemons: [], renderedCount: 0 });
      if (resultCountEl) resultCountEl.textContent = '0 Pokémon encontrados';
      if (pokemonListElement) {
        pokemonListElement.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">❤️</div>
            <h3>Nenhum favorito encontrado para "${escapeHtml(query)}"</h3>
            <p>Foram encontrados Pokémon no catálogo, mas nenhum deles está marcado como favorito.</p>
            <div class="empty-state-actions">
              <button type="button" class="btn-clear-filter" onclick="disableFavoritesFilter()">
                <i class="fa-solid fa-heart-crack" aria-hidden="true"></i> Desativar filtro de favoritos
              </button>
            </div>
          </div>
        `;
      }
      if (loadMoreButton) loadMoreButton.style.display = 'none';
      return;
    }
  }

  // 6. Se nenhum resultado absoluto
  if (eligibleCandidates.length === 0) {
    currentSearchCandidates = [];
    currentPokemons = [];
    searchRenderOffset = 0;
    searchResultsCache.set(cacheKey, { candidates: [], pokemons: [], renderedCount: 0 });
    if (resultCountEl) resultCountEl.textContent = '0 Pokémon encontrados';
    if (pokemonListElement) {
      pokemonListElement.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🔍</div>
          <h3>Nenhum Pokémon encontrado</h3>
          <p>Nenhum resultado corresponde a "<strong>${escapeHtml(query)}</strong>". Verifique a ortografia ou número informado.</p>
        </div>
      `;
    }
    if (loadMoreButton) loadMoreButton.style.display = 'none';
    return;
  }

  // 7. Ordenação inicial dos candidatos elegíveis
  eligibleCandidates.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    switch (currentSort) {
      case 'id-desc': return b.id - a.id;
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      default: return a.id - b.id;
    }
  });

  currentSearchCandidates = eligibleCandidates;
  searchRenderOffset = 0;

  // 8. Resolução paginada de detalhes dos primeiros candidatos elegíveis (limite SEARCH_PAGE_SIZE)
  const pageSlice = eligibleCandidates.slice(0, SEARCH_PAGE_SIZE);
  const resolvedPokemons = [];

  try {
    for (const cand of pageSlice) {
      let p = allLoadedPokemons.find(item => item.number === cand.id) || searchDetailsCache.get(cand.id);
      if (!p) {
        p = await pokeApi.getPokemonDetail(cand.id, signal);
        if (signal && signal.aborted || token !== searchSequenceToken) return;
        searchDetailsCache.set(cand.id, p);
      }
      resolvedPokemons.push(p);
    }
  } catch (err) {
    if (signal && signal.aborted || token !== searchSequenceToken) return;
    console.error('Erro ao resolver detalhes de candidatos de busca:', err);
    renderSearchError(query);
    return;
  }
  if (signal && signal.aborted || token !== searchSequenceToken) return;

  let filteredPokemons = resolvedPokemons;
  // Ordenação por Status Total se solicitada
  if (currentSort === 'stat-desc') {
    filteredPokemons.sort((a, b) => b.stats.total - a.stats.total);
  }

  searchRenderOffset = pageSlice.length;
  currentPokemons = filteredPokemons;
  renderPokemons(filteredPokemons);

  searchResultsCache.set(cacheKey, {
    candidates: eligibleCandidates,
    pokemons: filteredPokemons,
    renderedCount: searchRenderOffset
  });

  updateSearchResultCountAndButton(filteredPokemons.length, eligibleCandidates.length);
}

async function loadMoreSearchResults() {
  if (!isSearchingCatalog || currentSearchCandidates.length === 0 || !loadMoreButton) return;

  const nextSlice = currentSearchCandidates.slice(searchRenderOffset, searchRenderOffset + SEARCH_PAGE_SIZE);
  if (nextSlice.length === 0) {
    loadMoreButton.style.display = 'none';
    return;
  }

  loadMoreButton.disabled = true;
  loadMoreButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Carregando mais...';

  const token = searchSequenceToken;
  const signal = searchAbortController ? searchAbortController.signal : null;

  try {
    const newPokemons = [];
    for (const cand of nextSlice) {
      let p = allLoadedPokemons.find(item => item.number === cand.id) || searchDetailsCache.get(cand.id);
      if (!p) {
        p = await pokeApi.getPokemonDetail(cand.id, signal);
        if (signal && signal.aborted || token !== searchSequenceToken) return;
        searchDetailsCache.set(cand.id, p);
      }
      newPokemons.push(p);
    }
    if (signal && signal.aborted || token !== searchSequenceToken) return;

    searchRenderOffset += nextSlice.length;

    let filteredNew = newPokemons;
    if (selectedType !== 'all') {
      filteredNew = filteredNew.filter(p => p.types.includes(selectedType));
    }

    currentPokemons = [...currentPokemons, ...filteredNew];
    if (pokemonListElement) {
      pokemonListElement.innerHTML = currentPokemons.map(createPokemonCard).join('');
    }

    updateSearchResultCountAndButton(currentPokemons.length, currentSearchCandidates.length);
  } catch (err) {
    if (signal && signal.aborted || token !== searchSequenceToken) return;
    console.error('Erro ao carregar mais resultados da busca:', err);
    loadMoreButton.disabled = false;
    loadMoreButton.innerHTML = '<span>Tentar novamente</span> <i class="fa-solid fa-rotate-right" aria-hidden="true"></i>';
  }
}

function updateSearchResultCountAndButton(displayedCount, totalCandidates) {
  if (!resultCountEl || !loadMoreButton) return;

  resultCountEl.textContent = `Mostrando ${displayedCount} de ${totalCandidates} Pokémon encontrados`;

  if (searchRenderOffset >= totalCandidates || displayedCount === 0) {
    loadMoreButton.style.display = 'none';
  } else {
    loadMoreButton.style.display = 'flex';
    loadMoreButton.disabled = false;
    loadMoreButton.innerHTML = `<span>Carregar Mais (${displayedCount}/${totalCandidates})</span> <i class="fa-solid fa-chevron-down" aria-hidden="true"></i>`;
  }
}

function renderSearchError(query) {
  if (!pokemonListElement || !resultCountEl || !loadMoreButton) return;
  resultCountEl.textContent = 'Erro ao buscar';
  pokemonListElement.innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📡</div>
      <h3>Erro de conexão ao buscar Pokémon</h3>
      <p>Não foi possível conectar à PokéAPI para buscar "<strong>${escapeHtml(query)}</strong>". Verifique sua conexão à internet.</p>
      <div class="empty-state-actions">
        <button type="button" class="btn-clear-filter" onclick="retryCatalogSearch()">
          <i class="fa-solid fa-rotate-right" aria-hidden="true"></i> Tentar novamente
        </button>
      </div>
    </div>
  `;
  loadMoreButton.style.display = 'none';
}

// Ações auxiliares chamadas a partir dos botões nos empty-states da busca
function switchGenerationFilter(gen) {
  if (generationSelect) {
    generationSelect.value = gen;
  }
  selectedGeneration = gen;
  selectedType = 'all';
  typePills.forEach(p => p.classList.toggle('active', p.dataset.type === 'all'));
  regularLoadSequenceToken++;

  if (isSearchingCatalog || (searchInput && searchInput.value.trim() !== '')) {
    const q = (searchInput && searchInput.value.trim()) || lastSearchQuery;
    if (q) {
      executeCatalogSearch(q);
    }
  } else {
    loadPokemonItems(true);
  }
}

function disableFavoritesFilter() {
  showingFavoritesOnly = false;
  if (favoritesToggleBtn) {
    favoritesToggleBtn.classList.remove('active');
  }
  if (isSearchingCatalog || (searchInput && searchInput.value.trim() !== '')) {
    const q = (searchInput && searchInput.value.trim()) || lastSearchQuery;
    if (q) {
      executeCatalogSearch(q);
    } else {
      applyFiltersAndSort();
    }
  } else {
    applyFiltersAndSort();
  }
}

function clearTypeFilter() {
  selectedType = 'all';
  typePills.forEach(p => p.classList.toggle('active', p.dataset.type === 'all'));
  regularLoadSequenceToken++;

  if (isSearchingCatalog || (searchInput && searchInput.value.trim() !== '')) {
    const q = (searchInput && searchInput.value.trim()) || lastSearchQuery;
    if (q) {
      executeCatalogSearch(q);
    }
  } else {
    loadPokemonItems(true);
  }
}

function retryCatalogSearch() {
  if (lastSearchQuery) {
    executeCatalogSearch(lastSearchQuery);
  }
}

if (typeof window !== 'undefined') {
  window.switchGenerationFilter = switchGenerationFilter;
  window.disableFavoritesFilter = disableFavoritesFilter;
  window.clearTypeFilter = clearTypeFilter;
  window.retryCatalogSearch = retryCatalogSearch;
}

/**
 * ====================================================================
 * 6. MODAL DE DETALHES ACESSÍVEL (Fase 1 UI/UX)
 * ====================================================================
 * Diálogo acessível com role="dialog", aria-modal="true", associação de título
 * aria-labelledby="modalPokemonName", gerenciamento de foco (entrada e retorno),
 * navegação circular por teclado (Focus Trap com Tab/Shift+Tab), fechamento por Escape,
 * isolamento do conteúdo de fundo e proteção contra race condition assíncrona.
 */
async function openPokemonDetails(pokemonId) {
  const token = ++modalLoadSeq;

  // Armazena o elemento acionador apenas na primeira abertura (preserva se navegar por evoluções internas)
  if (!isModalOpen) {
    if (doc && doc.activeElement && doc.activeElement !== doc.body) {
      lastFocusedElement = doc.activeElement;
    }
  }

  let pokemon = allLoadedPokemons.find(p => p.number === pokemonId) || searchDetailsCache.get(pokemonId);

  // Busca individual caso o Pokémon ainda não esteja em cache local
  if (!pokemon) {
    try {
      pokemon = await pokeApi.getPokemonDetail(pokemonId);
      searchDetailsCache.set(pokemonId, pokemon);
    } catch (e) {
      console.error('Erro ao buscar detalhes do Pokémon:', e);
      return;
    }
  }

  // Descarta se o modal foi fechado ou outro Pokémon foi aberto enquanto carregava
  if (token !== modalLoadSeq) return;

  const primaryColor = typeColors[pokemon.type] || '#4B5563';
  const paddedId = `#${String(pokemon.number).padStart(3, '0')}`;
  
  const typesBadges = (pokemon.types || [])
    .map(t => `<span class="type-badge" style="background-color: ${typeColors[t] || '#777'}">${t}</span>`)
    .join('');

  const getStatClass = (val) => val >= 100 ? 'stat-high' : val >= 50 ? 'stat-med' : 'stat-low';

  if (modalContent) {
    modalContent.innerHTML = `
      <div class="modal-header" style="background-color: ${primaryColor};">
        ${pokeballSvg}
        <div class="modal-nav">
          <button class="modal-close-btn" id="modalCloseBtn" onclick="closeModal()" title="Fechar detalhes" aria-label="Fechar detalhes">
            <i class="fa-solid fa-arrow-left" aria-hidden="true"></i>
          </button>
          ${pokemon.cry ? `
            <button class="modal-cry-btn" onclick="playPokemonCry('${pokemon.cry}')" title="Ouvir som" aria-label="Ouvir som característico de ${pokemon.name}">
              <i class="fa-solid fa-volume-high" aria-hidden="true"></i>
            </button>
          ` : ''}
        </div>
        <div class="modal-title-row">
          <h2 class="modal-pokemon-name" id="modalPokemonName">${pokemon.name}</h2>
          <span class="modal-pokemon-id">${paddedId}</span>
        </div>
        <div class="modal-types-row">
          ${typesBadges}
        </div>
        <div class="modal-image-wrapper">
          <img class="modal-pokemon-img" src="${pokemon.photo}" alt="${pokemon.name}">
        </div>
      </div>

      <div class="modal-body">
        <div class="modal-tabs" role="tablist" aria-label="Informações do Pokémon">
          <button class="modal-tab-btn active" role="tab" aria-selected="true" aria-controls="tab-about" onclick="switchModalTab('about', event)">Sobre</button>
          <button class="modal-tab-btn" role="tab" aria-selected="false" aria-controls="tab-stats" onclick="switchModalTab('stats', event)">Status Base</button>
          <button class="modal-tab-btn" role="tab" aria-selected="false" aria-controls="tab-evolution" onclick="switchModalTab('evolution', event)">Evoluções</button>
        </div>

        <!-- Tab 1: Sobre -->
        <div id="tab-about" class="tab-content active" role="tabpanel">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">Altura</span>
              <span class="info-value">${pokemon.height} m</span>
            </div>
            <div class="info-item">
              <span class="info-label">Peso</span>
              <span class="info-value">${pokemon.weight} kg</span>
            </div>
          </div>

          <div>
            <span class="info-label" style="display: block; margin-bottom: 0.5rem;">Habilidades</span>
            <div class="abilities-tag-list">
              ${(pokemon.abilities || []).map(a => `<span class="ability-tag">${a.replace('-', ' ')}</span>`).join('')}
            </div>
          </div>
        </div>

        <!-- Tab 2: Status Base -->
        <div id="tab-stats" class="tab-content" role="tabpanel">
          <div class="stats-list">
            <div class="stat-row">
              <span class="stat-name">HP</span>
              <span class="stat-number">${pokemon.stats.hp}</span>
              <div class="stat-bar-container">
                <div class="stat-bar-fill ${getStatClass(pokemon.stats.hp)}" style="width: ${Math.min(100, (pokemon.stats.hp / 255) * 100)}%;"></div>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-name">Ataque</span>
              <span class="stat-number">${pokemon.stats.attack}</span>
              <div class="stat-bar-container">
                <div class="stat-bar-fill ${getStatClass(pokemon.stats.attack)}" style="width: ${Math.min(100, (pokemon.stats.attack / 255) * 100)}%;"></div>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-name">Defesa</span>
              <span class="stat-number">${pokemon.stats.defense}</span>
              <div class="stat-bar-container">
                <div class="stat-bar-fill ${getStatClass(pokemon.stats.defense)}" style="width: ${Math.min(100, (pokemon.stats.defense / 255) * 100)}%;"></div>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-name">Sp. Atk</span>
              <span class="stat-number">${pokemon.stats.specialAttack}</span>
              <div class="stat-bar-container">
                <div class="stat-bar-fill ${getStatClass(pokemon.stats.specialAttack)}" style="width: ${Math.min(100, (pokemon.stats.specialAttack / 255) * 100)}%;"></div>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-name">Sp. Def</span>
              <span class="stat-number">${pokemon.stats.specialDefense}</span>
              <div class="stat-bar-container">
                <div class="stat-bar-fill ${getStatClass(pokemon.stats.specialDefense)}" style="width: ${Math.min(100, (pokemon.stats.specialDefense / 255) * 100)}%;"></div>
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-name">Velocidade</span>
              <span class="stat-number">${pokemon.stats.speed}</span>
              <div class="stat-bar-container">
                <div class="stat-bar-fill ${getStatClass(pokemon.stats.speed)}" style="width: ${Math.min(100, (pokemon.stats.speed / 255) * 100)}%;"></div>
              </div>
            </div>
            <div class="stat-total-row">
              <span>Total</span>
              <span>${pokemon.stats.total}</span>
            </div>
          </div>
        </div>

        <!-- Tab 3: Linha Evolutiva -->
        <div id="tab-evolution" class="tab-content" role="tabpanel">
          <div id="evolutionContainer" class="evolution-chain-container">
            <div style="color: var(--text-muted); font-size: 0.9rem;">
              <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Carregando evolução...
            </div>
          </div>
        </div>

        <!-- Ação de Time (Team Builder) -->
        <div class="modal-team-action" id="modalTeamActionContainer">
          ${renderModalTeamButton(pokemon.number)}
        </div>
      </div>
    `;
  }

  if (modalOverlay) {
    modalOverlay.setAttribute('aria-hidden', 'false');
    modalOverlay.classList.add('active');
  }
  if (doc && doc.body) {
    doc.body.style.overflow = 'hidden';
  }
  isModalOpen = true;

  // Isola semanticamente os elementos externos do modal
  const appContainer = doc ? doc.querySelector('.app-container') : null;
  if (appContainer) {
    Array.from(appContainer.children).forEach(child => {
      if (child !== modalOverlay && !child.contains(modalOverlay)) {
        child.setAttribute('aria-hidden', 'true');
        if ('inert' in child) child.inert = true;
      }
    });
  }

  // Registra ouvinte da armadilha de foco (Focus Trap)
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleModalTrapKeydown);
    window.addEventListener('keydown', handleModalTrapKeydown);
  }

  // Foco inicial no botão de fechar do modal (com guarda contra fechamento rápido)
  const setInitialModalFocus = () => {
    if (token !== modalLoadSeq || !isModalOpen) return;
    const closeBtn = doc ? doc.getElementById('modalCloseBtn') : null;
    if (closeBtn && isModalElementVisible(closeBtn)) {
      closeBtn.focus();
    } else if (pokemonModal) {
      pokemonModal.focus();
    }
  };

  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(setInitialModalFocus);
  } else {
    setInitialModalFocus();
  }

  loadEvolutionChain(pokemon.speciesUrl, token);
}
if (typeof window !== 'undefined') {
  window.openPokemonDetails = openPokemonDetails;
}

/**
 * Determina se um elemento está realmente visível e acessível no Modal.
 * Descarta elementos em abas inativas (tab-content sem .active), com display: none,
 * visibility: hidden, aria-hidden="true" ou inert.
 */
function isModalElementVisible(el) {
  if (!el || el.disabled) return false;
  if (el.hidden) return false;
  if (el.getAttribute && el.getAttribute('aria-hidden') === 'true') return false;
  if (el.hasAttribute && el.hasAttribute('inert')) return false;

  // Verifica se está dentro de uma aba inativa
  if (typeof el.closest === 'function') {
    const tabPane = el.closest('.tab-content');
    if (tabPane && !tabPane.classList.contains('active')) {
      return false;
    }
    const hiddenAncestor = el.closest('[aria-hidden="true"]');
    if (hiddenAncestor && hiddenAncestor !== el.closest('#pokemonModal') && hiddenAncestor !== el.closest('#modalOverlay')) {
      return false;
    }
    if (el.closest('[inert]')) return false;
  }

  // Verifica hierarquia de pais até o container do modal
  let cur = el;
  while (cur && cur !== pokemonModal && cur !== (doc ? doc.body : null)) {
    if (cur.hidden) return false;
    if (cur.style && (cur.style.display === 'none' || cur.style.visibility === 'hidden')) return false;
    if (cur.classList && cur.classList.contains('tab-content') && !cur.classList.contains('active')) return false;
    if (cur.getAttribute && cur.getAttribute('aria-hidden') === 'true' && cur !== modalOverlay) return false;
    if (cur.hasAttribute && cur.hasAttribute('inert')) return false;
    cur = cur.parentElement || cur.parentNode;
  }

  // Em navegadores reais com getComputedStyle
  if (typeof window !== 'undefined' && window.getComputedStyle) {
    try {
      const comp = window.getComputedStyle(el);
      if (comp && (comp.display === 'none' || comp.visibility === 'hidden')) return false;
    } catch (_) {}
  }

  // No browser, se offsetParent é null e não é position:fixed, elemento não está visível
  if (el.offsetParent === null && el.style && el.style.position !== 'fixed') {
    if (typeof window !== 'undefined' && window.getComputedStyle) {
      try {
        const comp = window.getComputedStyle(el);
        if (comp && comp.display === 'none') return false;
      } catch (_) {}
    }
  }

  return true;
}

/**
 * Focus Trap para dialogs acessíveis: prende o foco dentro do modal aberto
 * e responde à tecla Escape considerando estritamente elementos visíveis.
 */
function handleModalTrapKeydown(e) {
  if (!isModalOpen || !modalOverlay || !modalOverlay.classList.contains('active')) {
    return;
  }

  if (e.key === 'Escape') {
    if (typeof e.preventDefault === 'function') e.preventDefault();
    closeModal();
    return;
  }

  if (e.key === 'Tab' && pokemonModal) {
    const candidates = Array.from(
      pokemonModal.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );
    const focusables = candidates.filter(isModalElementVisible);

    if (focusables.length === 0) return;

    const firstEl = focusables[0];
    const lastEl = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (doc && (doc.activeElement === firstEl || !pokemonModal.contains(doc.activeElement))) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        lastEl.focus();
      }
    } else {
      if (doc && (doc.activeElement === lastEl || !pokemonModal.contains(doc.activeElement))) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        firstEl.focus();
      }
    }
  }
}

/**
 * Fecha o Modal restaurando o foco, removendo a armadilha e restaurando a navegação da página.
 */
function closeModal() {
  modalLoadSeq++; // Invalida qualquer requisição assíncrona pendente
  if (!isModalOpen && (!modalOverlay || !modalOverlay.classList.contains('active'))) {
    return;
  }
  isModalOpen = false;

  if (modalOverlay) {
    modalOverlay.classList.remove('active');
    modalOverlay.setAttribute('aria-hidden', 'true');
  }
  if (doc && doc.body) {
    doc.body.style.overflow = 'auto';
  }

  // Remove ouvinte de armadilha de foco
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', handleModalTrapKeydown);
  }

  // Restaura elementos externos ao modal
  const appContainer = doc ? doc.querySelector('.app-container') : null;
  if (appContainer) {
    Array.from(appContainer.children).forEach(child => {
      if (child !== modalOverlay && !child.contains(modalOverlay)) {
        child.removeAttribute('aria-hidden');
        if ('inert' in child) child.inert = false;
      }
    });
  }

  // Restaura o foco para o elemento disparador ou fallback seguro
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    if (doc && typeof doc.contains === 'function' && doc.contains(lastFocusedElement)) {
      lastFocusedElement.focus();
    } else if (doc && typeof doc.querySelector === 'function') {
      const fallback = doc.querySelector('.pokemon-card-action-btn') || searchInput;
      if (fallback && typeof fallback.focus === 'function') fallback.focus();
      else lastFocusedElement.focus();
    } else {
      lastFocusedElement.focus();
    }
  }
  lastFocusedElement = null;
}
if (typeof window !== 'undefined') {
  window.closeModal = closeModal;
}

/**
 * Renderiza o botão de ação do time no modal de detalhes.
 */
function renderModalTeamButton(pokemonId) {
  const id = Number(pokemonId);
  const isInTeam = (typeof window !== 'undefined' && window.teamManager) ? window.teamManager.hasPokemon(id) : false;
  const isTeamFull = (typeof window !== 'undefined' && window.teamManager) ? window.teamManager.isFull() : false;

  if (isInTeam) {
    return `
      <button class="modal-team-btn in-team" onclick="handleModalTeamToggle(${id})">
        <i class="fa-solid fa-check" aria-hidden="true"></i> No Time (Remover)
      </button>
    `;
  }

  if (isTeamFull) {
    return `
      <button class="modal-team-btn disabled" disabled title="Seu time já possui 3 Pokémon">
        <i class="fa-solid fa-ban" aria-hidden="true"></i> Time Completo (3/3)
      </button>
    `;
  }

  return `
    <button class="modal-team-btn add" onclick="handleModalTeamToggle(${id})">
      <i class="fa-solid fa-plus" aria-hidden="true"></i> Adicionar ao Time
    </button>
  `;
}

/**
 * Manipulador de clique no botão do time dentro do modal de detalhes.
 */
function handleModalTeamToggle(pokemonId) {
  if (typeof window === 'undefined' || !window.teamManager) return;

  window.teamManager.togglePokemon(pokemonId);

  const container = doc ? doc.getElementById('modalTeamActionContainer') : null;
  if (container) {
    container.innerHTML = renderModalTeamButton(pokemonId);
  }
}
if (typeof window !== 'undefined') {
  window.handleModalTeamToggle = handleModalTeamToggle;
}

/**
 * Atualiza dinamicamente as badges de time nos cards da Pokédex sem recriar o DOM inteiro.
 */
function updatePokemonCardsTeamBadges() {
  if (!doc) return;
  doc.querySelectorAll('.pokemon-card').forEach(card => {
    const pokeId = Number(card.dataset.id);
    const badgesContainer = card.querySelector('.card-badges');
    if (!badgesContainer) return;

    const existingBadge = badgesContainer.querySelector('.team-card-badge');
    const isInTeam = (typeof window !== 'undefined' && window.teamManager) ? window.teamManager.hasPokemon(pokeId) : false;

    if (isInTeam && !existingBadge) {
      const badge = doc.createElement('span');
      badge.className = 'team-card-badge';
      badge.title = 'No seu time';
      badge.innerHTML = '<i class="fa-solid fa-shield-halved" aria-hidden="true"></i> No time';
      badgesContainer.appendChild(badge);
    } else if (!isInTeam && existingBadge) {
      existingBadge.remove();
    }
  });
}

/**
 * Toca o som característico (cry) do Pokémon usando a API de Áudio HTML5.
 */
function playPokemonCry(audioUrl) {
  if (!audioUrl || typeof Audio === 'undefined') return;
  const audio = new Audio(audioUrl);
  audio.volume = 0.5;
  audio.play().catch(e => console.log('Reprodução de áudio prevenida pelo navegador:', e));
}
if (typeof window !== 'undefined') {
  window.playPokemonCry = playPokemonCry;
}

/**
 * Renderiza a cadeia de evolução no modal com botões nativos acessíveis.
 */
async function loadEvolutionChain(speciesUrl, token = null) {
  const container = doc ? doc.getElementById('evolutionContainer') : null;
  if (!container) return;

  const chain = await pokeApi.getPokemonEvolutionChain(speciesUrl);
  if (token && token !== modalLoadSeq) return;

  if (!chain || chain.length <= 1) {
    container.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">Este Pokémon não possui linha evolutiva registrada.</p>`;
    return;
  }

  container.innerHTML = chain.map((stage, idx) => `
    <button type="button" class="evo-stage" aria-label="Ver detalhes de ${stage.name}" onclick="openPokemonDetails(${stage.id})">
      <div class="evo-stage-img-wrapper">
        <img class="evo-stage-img" src="${stage.photo}" alt="${stage.name}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${stage.id}.png'">
      </div>
      <span class="evo-stage-name">${stage.name}</span>
    </button>
    ${idx < chain.length - 1 ? `
      <div class="evo-arrow" aria-hidden="true">
        <i class="fa-solid fa-arrow-right evo-arrow-icon"></i>
        ${chain[idx + 1].minLevel ? `<span>Nv. ${chain[idx + 1].minLevel}</span>` : ''}
      </div>
    ` : ''}
  `).join('');
}

/**
 * Alternância entre as abas do Modal (Sobre / Status / Evoluções).
 */
function switchModalTab(tabName, event) {
  if (!doc) return;
  doc.querySelectorAll('.modal-tab-btn').forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });
  doc.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  if (event && event.currentTarget) {
    event.currentTarget.classList.add('active');
    event.currentTarget.setAttribute('aria-selected', 'true');
  }
  const target = doc.getElementById(`tab-${tabName}`);
  if (target) target.classList.add('active');
}
if (typeof window !== 'undefined') {
  window.switchModalTab = switchModalTab;
}

// 7. LISTENERS DE EVENTOS DO USUÁRIO
if (modalOverlay) {
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}

// Evento de Digitação na Busca com debounce e cancelamento
if (searchInput) {
  searchInput.addEventListener('input', handleSearchInput);
}

// Botão de Limpar Busca
if (clearSearchBtn) {
  clearSearchBtn.addEventListener('click', () => {
    clearSearch(true);
  });
}

// Seletor de Ordenação
if (sortSelect) {
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    if (isSearchingCatalog && searchInput && searchInput.value.trim() !== '') {
      executeCatalogSearch(searchInput.value.trim());
    } else {
      applyFiltersAndSort();
    }
  });
}

// Seletor de Geração
if (generationSelect) {
  generationSelect.addEventListener('change', (e) => {
    selectedGeneration = e.target.value;
    regularLoadSequenceToken++;
    if (isSearchingCatalog && searchInput && searchInput.value.trim() !== '') {
      executeCatalogSearch(searchInput.value.trim());
    } else if (!isSearchingCatalog) {
      if (selectedType === 'all') {
        loadPokemonItems(true);
      } else {
        loadPokemonsByType(selectedType);
      }
    }
  });
}

// Pílulas de Tipos
typePills.forEach(pill => {
  pill.addEventListener('click', () => {
    typePills.forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    selectedType = pill.dataset.type;
    regularLoadSequenceToken++;

    if (isSearchingCatalog && searchInput && searchInput.value.trim() !== '') {
      executeCatalogSearch(searchInput.value.trim());
    } else if (!isSearchingCatalog) {
      if (selectedType === 'all') {
        loadPokemonItems(true);
      } else {
        loadPokemonsByType(selectedType);
      }
    }
  });
});

// Alternar Filtro de Favoritos
if (favoritesToggleBtn) {
  favoritesToggleBtn.addEventListener('click', () => {
    showingFavoritesOnly = !showingFavoritesOnly;
    favoritesToggleBtn.classList.toggle('active', showingFavoritesOnly);
    if (isSearchingCatalog && searchInput && searchInput.value.trim() !== '') {
      executeCatalogSearch(searchInput.value.trim());
    } else {
      applyFiltersAndSort();
    }
  });
}

// 8. TEMA DARK / LIGHT (Persistência com LocalStorage)
if (themeToggleBtn) {
  themeToggleBtn.addEventListener('click', () => {
    if (!doc) return;
    const currentTheme = doc.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    doc.documentElement.setAttribute('data-theme', newTheme);
    themeToggleBtn.innerHTML = newTheme === 'dark' ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>' : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('pokedex_theme', newTheme);
    }
  });
}

// Botão Carregar Mais
if (loadMoreButton) {
  loadMoreButton.addEventListener('click', () => {
    if (isSearchingCatalog) {
      loadMoreSearchResults();
    } else {
      loadPokemonItems(false);
    }
  });
}

// 9. INICIALIZAÇÃO DA PÁGINA
if (doc) {
  const savedTheme = (typeof localStorage !== 'undefined' && localStorage.getItem('pokedex_theme')) || 'dark';
  doc.documentElement.setAttribute('data-theme', savedTheme);
  if (themeToggleBtn) {
    themeToggleBtn.innerHTML = savedTheme === 'dark' ? '<i class="fa-solid fa-sun" aria-hidden="true"></i>' : '<i class="fa-solid fa-moon" aria-hidden="true"></i>';
  }
  updateFavoriteCounter();
  loadPokemonItems(true);
}

/**
 * ====================================================================
 * 10. NAVEGAÇÃO ENTRE MÓDULOS (Pokédex, Meu Time, Battle Arena)
 * ====================================================================
 * Gerencia a alternância entre a Pokédex e as visões de recursos futuros
 * planejados para as fases PBA-002 e PBA-003+, preservando o estado
 * e o cache de dados da Pokédex intactos na memória.
 */
const navTabs = doc ? doc.querySelectorAll('.nav-tab') : [];
const pokedexView = doc ? doc.getElementById('pokedexView') : null;
const futureModuleView = doc ? doc.getElementById('futureModuleView') : null;

const futureModulesData = {
  team: {
    icon: 'fa-solid fa-users',
    badge: 'Fase PBA-002 • Em Desenvolvimento',
    title: 'Meu Time (Team Builder)',
    description: 'O gerenciador tático de equipes permitirá escolher até 6 Pokémon favoritos da sua Pokédex, salvar seu time estrategicamente no navegador e avaliar a sinergia de tipos antes das batalhas.',
    features: [
      {
        icon: 'fa-solid fa-list-check',
        title: 'Seleção de 1 a 6 Pokémon',
        desc: 'Adicione Pokémon diretamente da Pokédex ou dos favoritos para a sua equipe ativa.'
      },
      {
        icon: 'fa-solid fa-chart-pie',
        title: 'Cobertura & Sinergia Elemental',
        desc: 'Visualização tática de fraquezas e resistências combinadas dos tipos do seu time.'
      },
      {
        icon: 'fa-solid fa-floppy-disk',
        title: 'Persistência no Navegador',
        desc: 'Salva seu time com segurança via LocalStorage estruturado (padrão team.*).'
      },
      {
        icon: 'fa-solid fa-shield-halved',
        title: 'Pronto para o Combate',
        desc: 'Seu time construído aqui será utilizado diretamente no simulador de batalha.'
      }
    ]
  },
  battle: {
    icon: 'fa-solid fa-khanda',
    badge: 'Fase PBA-003+ • Em Desenvolvimento',
    title: 'Pokémon Battle Arena',
    description: 'Um simulador completo de batalhas Pokémon por turnos contra inteligência artificial, construído em arquitetura estrita onde a lógica matemática (Game Engine) é 100% desacoplada das animações e áudio (Presentation Engine).',
    features: [
      {
        icon: 'fa-solid fa-bolt',
        title: 'Simulador por Turnos (1x1 e 3x3)',
        desc: 'Iniciativa calculada por Speed, turnos dinâmicos e opções de Ataque e Troca.'
      },
      {
        icon: 'fa-solid fa-calculator',
        title: 'Cálculo Real de Dano',
        desc: 'Fórmula clássica de combate com STAB, crítico, golpes físicos e especiais.'
      },
      {
        icon: 'fa-solid fa-robot',
        title: 'Inteligência Artificial',
        desc: 'Adversário com tomada de decisão baseada em vantagens de tipo e HP restante.'
      },
      {
        icon: 'fa-solid fa-wand-magic-sparkles',
        title: 'Efeitos Visuais & Áudio Dinâmico',
        desc: 'Animações de ataque, screen shake, partículas e som característico de cada Pokémon.'
      }
    ]
  }
};

function renderFutureModule(moduleKey) {
  const data = futureModulesData[moduleKey];
  if (!data) return;

  const featuresHtml = data.features.map(f => `
    <div class="future-feature-item">
      <h4><i class="${f.icon}"></i> ${f.title}</h4>
      <p>${f.desc}</p>
    </div>
  `).join('');

  futureModuleView.innerHTML = `
    <div class="future-card">
      <div class="future-icon-wrapper">
        <i class="${data.icon}"></i>
      </div>
      <span class="future-badge">
        <i class="fa-solid fa-code"></i> ${data.badge}
      </span>
      <h2 class="future-title">${data.title}</h2>
      <p class="future-description">${data.description}</p>
      
      <div class="future-features-grid">
        ${featuresHtml}
      </div>

      <div class="future-actions">
        <button class="return-pokedex-btn" onclick="switchAppTab('pokedex')">
          <i class="fa-solid fa-arrow-left"></i> Voltar para a Pokédex
        </button>
      </div>
    </div>
  `;
}

function switchAppTab(tabName) {
  if (tabName !== 'campaign') {
    if (typeof window !== 'undefined' && window.campaignView && typeof window.campaignView.deactivate === 'function') {
      window.campaignView.deactivate();
    }
  }

  navTabs.forEach(tab => {
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle('active', isActive);
  });

  const teamView = doc ? doc.getElementById('teamView') : null;
  const profileView = doc ? doc.getElementById('profileView') : null;
  const campaignView = doc ? doc.getElementById('campaignView') : null;

  if (tabName === 'pokedex') {
    if (typeof window !== 'undefined' && window.battleSessionController && window.battleSessionController.uiState !== 'NO_TEAM') {
      window.battleSessionController.leaveBattle();
    }
    if (pokedexView) pokedexView.style.display = 'block';
    if (teamView) teamView.style.display = 'none';
    if (futureModuleView) futureModuleView.style.display = 'none';
    if (profileView) profileView.style.display = 'none';
    if (campaignView) campaignView.style.display = 'none';
  } else if (tabName === 'team') {
    if (typeof window !== 'undefined' && window.battleSessionController && window.battleSessionController.uiState !== 'NO_TEAM') {
      window.battleSessionController.leaveBattle();
    }
    if (pokedexView) pokedexView.style.display = 'none';
    if (teamView) {
      teamView.style.display = 'block';
      if (typeof window !== 'undefined' && window.teamUI) window.teamUI.render();
    }
    if (futureModuleView) futureModuleView.style.display = 'none';
    if (profileView) profileView.style.display = 'none';
    if (campaignView) campaignView.style.display = 'none';
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (tabName === 'battle') {
    if (pokedexView) pokedexView.style.display = 'none';
    if (teamView) teamView.style.display = 'none';
    if (profileView) profileView.style.display = 'none';
    if (campaignView) campaignView.style.display = 'none';
    if (futureModuleView) {
      futureModuleView.style.display = 'block';
      if (typeof window !== 'undefined' && window.battleView) {
        window.battleView.render();
      } else {
        renderFutureModule('battle');
      }
    }
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (tabName === 'campaign') {
    if (typeof window !== 'undefined' && window.battleSessionController && window.battleSessionController.uiState !== 'NO_TEAM') window.battleSessionController.leaveBattle();
    if (pokedexView) pokedexView.style.display = 'none';
    if (teamView) teamView.style.display = 'none';
    if (futureModuleView) futureModuleView.style.display = 'none';
    if (profileView) profileView.style.display = 'none';
    if (campaignView) { campaignView.style.display = 'block'; if (typeof window !== 'undefined' && window.campaignView) window.campaignView.render(); }
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
  } else if (tabName === 'profile') {
    if (typeof window !== 'undefined' && window.battleSessionController && window.battleSessionController.uiState !== 'NO_TEAM') {
      window.battleSessionController.leaveBattle();
    }
    if (pokedexView) pokedexView.style.display = 'none';
    if (teamView) teamView.style.display = 'none';
    if (futureModuleView) futureModuleView.style.display = 'none';
    if (profileView) {
      profileView.style.display = 'block';
      if (typeof window !== 'undefined' && window.trainerUI) window.trainerUI.render();
    }
    if (typeof window !== 'undefined' && window.scrollTo) window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

if (typeof window !== 'undefined') {
  window.switchAppTab = switchAppTab;
}

navTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.dataset.tab;
    if (tabName) {
      switchAppTab(tabName);
    }
  });
});

// Sincroniza os cards da Pokédex com alterações ocorridas no time
if (typeof window !== 'undefined' && window.teamManager) {
  window.teamManager.onChange(() => {
    updatePokemonCardsTeamBadges();
  });
}

// Inicializa o Team UI e badges de navegação
if (typeof window !== 'undefined' && window.teamUI) {
  window.teamUI.init();
}

// Inicializa o Battle View e Session Controller (PBA-013)
if (typeof window !== 'undefined') {
  if (!window.battleSessionController && window.PBABattleSession && window.PBABattleSession.BattleSessionController) {
    const uiAdapter = window.PBABattleUi && window.PBABattleUi.BattleUiDomAdapter
      ? new window.PBABattleUi.BattleUiDomAdapter()
      : null;

    const compositeAdapter = window.PBABattlePresentation && window.PBABattlePresentation.createCompositeBattleDomAdapter
      ? window.PBABattlePresentation.createCompositeBattleDomAdapter({ uiAdapter })
      : null;

    window.battleSessionController = new window.PBABattleSession.BattleSessionController({
      compositeAdapter
    });
  }

  if (!window.battleView && window.PBABattleUi && window.PBABattleUi.BattleView) {
    window.battleView = new window.PBABattleUi.BattleView({
      sessionController: window.battleSessionController
    });
    window.battleView.init();
  }

  if (!window.campaignManager && window.PBACampaign && window.PBACampaign.CampaignManager) {
    window.campaignManager = new window.PBACampaign.CampaignManager();
    window.campaignBattleCoordinator = new window.PBACampaign.CampaignBattleCoordinator(window.campaignManager, window.battleSessionController);
    window.campaignView = new window.PBACampaign.CampaignView({ manager: window.campaignManager, coordinator: window.campaignBattleCoordinator, container: document.getElementById('campaignView') });
  }

  // Inicializa o Perfil do Treinador (PBA-014)
  if (window.trainerUI) {
    window.trainerUI.init();
  }
}

// Exportações de compatibilidade para suíte de testes automatizados e integração
if (typeof window !== 'undefined') {
  window.pokedexApp = {
    createPokemonCard,
    openPokemonDetails,
    closeModal,
    handleSearchInput,
    clearSearch,
    executeCatalogSearch,
    loadPokemonItems,
    loadPokemonsByType,
    applyFiltersAndSort,
    getLoadedGeneration: () => loadedGeneration,
    setLoadedGeneration: (gen) => { loadedGeneration = gen; },
    getLoadedType: () => loadedType,
    setLoadedType: (type) => { loadedType = type; },
    getLoadedContext: () => ({ generation: loadedGeneration, type: loadedType }),
    setLoadedContext: (ctx) => {
      if (ctx && ctx.generation !== undefined) loadedGeneration = ctx.generation;
      if (ctx && ctx.type !== undefined) loadedType = ctx.type;
    },
    getSearchState: () => ({
      isSearchingCatalog,
      currentSearchTerm,
      currentSearchCandidates,
      searchRenderOffset
    }),
    resetSearchState: () => {
      isSearchingCatalog = false;
      currentSearchTerm = '';
      currentSearchCandidates = [];
      searchRenderOffset = 0;
      searchResultsCache.clear();
      searchDetailsCache.clear();
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createPokemonCard,
    openPokemonDetails,
    closeModal,
    handleModalTrapKeydown,
    isModalElementVisible,
    handleSearchInput,
    clearSearch,
    executeCatalogSearch,
    loadMoreSearchResults,
    loadPokemonItems,
    loadPokemonsByType,
    applyFiltersAndSort,
    switchModalTab,
    switchGenerationFilter,
    clearTypeFilter,
    disableFavoritesFilter,
    toggleFavorite,
    updateFavoriteCounter,
    refreshDomElements,
    generationRanges,
    generationLabels,
    typeColors,
    setSelectedGeneration: (gen) => { selectedGeneration = gen; },
    getSelectedGeneration: () => selectedGeneration,
    getLoadedGeneration: () => loadedGeneration,
    setLoadedGeneration: (gen) => { loadedGeneration = gen; },
    setSelectedType: (type) => { selectedType = type; },
    getSelectedType: () => selectedType,
    getLoadedType: () => loadedType,
    setLoadedType: (type) => { loadedType = type; },
    getLoadedContext: () => ({ generation: loadedGeneration, type: loadedType }),
    setLoadedContext: (ctx) => {
      if (ctx && ctx.generation !== undefined) loadedGeneration = ctx.generation;
      if (ctx && ctx.type !== undefined) loadedType = ctx.type;
    },
    setShowingFavoritesOnly: (val) => { showingFavoritesOnly = val; },
    getShowingFavoritesOnly: () => showingFavoritesOnly,
    getFavorites: () => favoritePokemonIds,
    setFavorites: (ids) => {
      favoritePokemonIds = [...ids];
      favoritesVersion++;
    },
    getAllLoadedPokemons: () => allLoadedPokemons,
    setAllLoadedPokemons: (list) => { allLoadedPokemons = [...list]; },
    getCurrentPokemons: () => currentPokemons,
    getSearchState: () => ({
      isSearchingCatalog,
      currentSearchTerm,
      currentSearchCandidates,
      searchRenderOffset,
      lastSearchQuery
    }),
    resetSearchState: () => {
      isSearchingCatalog = false;
      currentSearchTerm = '';
      currentSearchCandidates = [];
      searchRenderOffset = 0;
      lastSearchQuery = '';
      searchResultsCache.clear();
      searchDetailsCache.clear();
    },
    getModalState: () => ({
      isModalOpen,
      lastFocusedElement,
      modalLoadSeq
    }),
    setIsModalOpen: (val) => { isModalOpen = val; },
    setLastFocusedElement: (el) => { lastFocusedElement = el; },
    getFavoritesVersion: () => favoritesVersion,
    getOffsets: () => ({ offset, maxLimit })
  };
}
