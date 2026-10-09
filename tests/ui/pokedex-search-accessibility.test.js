/**
 * ====================================================================
 * TESTES AUTOMATIZADOS: BUSCA POKÉDEX & ACESSIBILIDADE DE TECLADO (FASE 1)
 * ====================================================================
 * Suíte de testes oficial que executa a IMPLEMENTAÇÃO REAL da aplicação
 * (assets/js/main.js e assets/js/poke-api.js), sem simulações de conveniência.
 *
 * Cenários Obrigatórios Homologados:
 * 1. Filtro antes da paginação: 21+ candidatos, nenhum dos 20 primeiros do tipo e candidato válido depois
 * 2. Troca de geração: carregar Gen 1, buscar, mudar para Gen 2, limpar busca e verificar listagem/paginação
 * 3. Favoritos: buscar com filtro ativo, remover favorito e repetir busca; checar ausência e contador
 * 4. Foco: controles visíveis vs controles de aba oculta; executar handler real de Tab e Shift+Tab
 * 5. Concorrência: respostas lentas e rápidas da API executando a busca real (proteção por token)
 * 6. Limpeza: limpar busca pendente e garantir que resposta atrasada não sobrescreva a listagem
 * 7. Modal: abertura, fechamento, restauração de foco real e navegação entre evoluções
 * 8. Estados de busca: mensagens efetivamente renderizadas para zero resultados e falha de rede
 * 9. Padrões de entrada: nome completo, parcial ("pika"), número ("25") e cerquilha ("#25")
 * 10. Independência do card: botão de ação nativo e botão de favorito desacoplado
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const pokeApi = require('../../assets/js/poke-api.js');
const mainModule = require('../../assets/js/main.js');

// Catálogo sintético cobrindo Gens 1 a 9 para testes determinísticos
const MOCK_CATALOG = [
  { id: 1, name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
  { id: 4, name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' },
  { id: 7, name: 'squirtle', url: 'https://pokeapi.co/api/v2/pokemon/7/' },
  { id: 25, name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
  { id: 26, name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon/26/' },
  { id: 133, name: 'eevee', url: 'https://pokeapi.co/api/v2/pokemon/133/' },
  { id: 150, name: 'mewtwo', url: 'https://pokeapi.co/api/v2/pokemon/150/' },
  { id: 152, name: 'chikorita', url: 'https://pokeapi.co/api/v2/pokemon/152/' }, // Gen 2
  { id: 155, name: 'cyndaquil', url: 'https://pokeapi.co/api/v2/pokemon/155/' }, // Gen 2
  { id: 158, name: 'totodile', url: 'https://pokeapi.co/api/v2/pokemon/158/' },  // Gen 2
  { id: 252, name: 'treecko', url: 'https://pokeapi.co/api/v2/pokemon/252/' },   // Gen 3
  { id: 448, name: 'lucario', url: 'https://pokeapi.co/api/v2/pokemon/448/' },   // Gen 4
  { id: 731, name: 'pikipek', url: 'https://pokeapi.co/api/v2/pokemon/731/' },   // Gen 7
  { id: 1000, name: 'gholdengo', url: 'https://pokeapi.co/api/v2/pokemon/1000/' } // Gen 9
];

// Detalhes sintéticos correspondentes
const MOCK_DETAILS = {
  1: { number: 1, name: 'bulbasaur', type: 'grass', types: ['grass', 'poison'], stats: { hp: 45, attack: 49, defense: 49, specialAttack: 65, specialDefense: 65, speed: 45, total: 318 }, photo: 'bulba.png', speciesUrl: '' },
  4: { number: 4, name: 'charmander', type: 'fire', types: ['fire'], stats: { hp: 39, attack: 52, defense: 43, specialAttack: 60, specialDefense: 50, speed: 65, total: 309 }, photo: 'char.png', speciesUrl: '' },
  7: { number: 7, name: 'squirtle', type: 'water', types: ['water'], stats: { hp: 44, attack: 48, defense: 65, specialAttack: 50, specialDefense: 64, speed: 43, total: 314 }, photo: 'squirtle.png', speciesUrl: '' },
  25: { number: 25, name: 'pikachu', type: 'electric', types: ['electric'], stats: { hp: 35, attack: 55, defense: 40, specialAttack: 50, specialDefense: 50, speed: 90, total: 320 }, photo: 'pika.png', speciesUrl: '' },
  26: { number: 26, name: 'raichu', type: 'electric', types: ['electric'], stats: { hp: 60, attack: 90, defense: 55, specialAttack: 90, specialDefense: 80, speed: 110, total: 485 }, photo: 'raichu.png', speciesUrl: '' },
  133: { number: 133, name: 'eevee', type: 'normal', types: ['normal'], stats: { hp: 55, attack: 55, defense: 50, specialAttack: 45, specialDefense: 65, speed: 55, total: 325 }, photo: 'eevee.png', speciesUrl: '' },
  150: { number: 150, name: 'mewtwo', type: 'psychic', types: ['psychic'], stats: { hp: 106, attack: 110, defense: 90, specialAttack: 154, specialDefense: 90, speed: 130, total: 680 }, photo: 'mewtwo.png', speciesUrl: '' },
  152: { number: 152, name: 'chikorita', type: 'grass', types: ['grass'], stats: { hp: 45, attack: 49, defense: 65, specialAttack: 49, specialDefense: 65, speed: 45, total: 318 }, photo: 'chiko.png', speciesUrl: '' },
  155: { number: 155, name: 'cyndaquil', type: 'fire', types: ['fire'], stats: { hp: 39, attack: 52, defense: 43, specialAttack: 60, specialDefense: 50, speed: 65, total: 309 }, photo: 'cynda.png', speciesUrl: '' },
  158: { number: 158, name: 'totodile', type: 'water', types: ['water'], stats: { hp: 50, attack: 65, defense: 64, specialAttack: 44, specialDefense: 48, speed: 43, total: 314 }, photo: 'toto.png', speciesUrl: '' },
  252: { number: 252, name: 'treecko', type: 'grass', types: ['grass'], stats: { hp: 40, attack: 45, defense: 35, specialAttack: 65, specialDefense: 55, speed: 70, total: 310 }, photo: 'treecko.png', speciesUrl: '' },
  448: { number: 448, name: 'lucario', type: 'fighting', types: ['fighting', 'steel'], stats: { hp: 70, attack: 110, defense: 70, specialAttack: 115, specialDefense: 70, speed: 90, total: 525 }, photo: 'lucario.png', speciesUrl: '' },
  731: { number: 731, name: 'pikipek', type: 'normal', types: ['normal', 'flying'], stats: { hp: 35, attack: 75, defense: 30, specialAttack: 30, specialDefense: 30, speed: 65, total: 265 }, photo: 'pikipek.png', speciesUrl: '' },
  1000: { number: 1000, name: 'gholdengo', type: 'steel', types: ['steel', 'ghost'], stats: { hp: 87, attack: 60, defense: 95, specialAttack: 133, specialDefense: 91, speed: 84, total: 550 }, photo: 'gholdengo.png', speciesUrl: '' }
};

/**
 * Cria uma estrutura de DOM interativa e fiel para os testes da aplicação real.
 */
function createTestDom() {
  const elements = new Map();

  function makeElement(id = '', tag = 'div', classes = []) {
    const classSet = new Set(classes);
    const attrs = new Map();
    const children = [];
    let innerHtmlStr = '';

    const upperTag = tag.toUpperCase();
    const isNativeInteractive = ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A'].includes(upperTag);
    const el = {
      id,
      tagName: upperTag,
      style: { display: '', overflow: '', position: '', visibility: '' },
      dataset: {},
      disabled: false,
      hidden: false,
      tabIndex: isNativeInteractive ? 0 : -1,
      offsetParent: {}, // Não nulo por padrão para simular visibilidade no DOM
      offsetWidth: 120,
      offsetHeight: 36,
      parentElement: null,
      children,
      classList: {
        add: (...cls) => cls.forEach(c => classSet.add(c)),
        remove: (...cls) => cls.forEach(c => classSet.delete(c)),
        toggle: (c, force) => {
          if (force === undefined) {
            if (classSet.has(c)) classSet.delete(c); else classSet.add(c);
          } else if (force) classSet.add(c); else classSet.delete(c);
        },
        contains: (c) => classSet.has(c)
      },
      setAttribute: (k, v) => attrs.set(k, String(v)),
      getAttribute: (k) => attrs.get(k) || null,
      hasAttribute: (k) => attrs.has(k),
      removeAttribute: (k) => attrs.delete(k),
      focus: function() {
        mockDoc.activeElement = this;
      },
      contains: function(target) {
        let cur = target;
        while (cur) {
          if (cur === this) return true;
          cur = cur.parentElement;
        }
        return false;
      },
      closest: function(sel) {
        let cur = this;
        while (cur) {
          if (sel === '.tab-content' && cur.classList && cur.classList.contains('tab-content')) return cur;
          if (sel === '.tab-content.active' && cur.classList && cur.classList.contains('tab-content') && cur.classList.contains('active')) return cur;
          if (sel === '[aria-hidden="true"]' && cur.getAttribute && cur.getAttribute('aria-hidden') === 'true') return cur;
          if (sel === '[inert]' && cur.hasAttribute && cur.hasAttribute('inert')) return cur;
          if (sel === '#pokemonModal' && cur.id === 'pokemonModal') return cur;
          if (sel === '#modalOverlay' && cur.id === 'modalOverlay') return cur;
          cur = cur.parentElement;
        }
        return null;
      },
      appendChild: function(ch) {
        ch.parentElement = this;
        children.push(ch);
        return ch;
      },
      querySelector: function(sel) {
        return this.querySelectorAll(sel)[0] || null;
      },
      querySelectorAll: function(sel) {
        const found = [];
        function walk(node) {
          for (const ch of node.children) {
            let match = false;
            if (sel.startsWith('#') && ch.id === sel.slice(1)) match = true;
            else if (sel.startsWith('.') && ch.classList && ch.classList.contains(sel.slice(1))) match = true;
            else if (sel.includes('button') && ch.tagName === 'BUTTON') match = true;
            else if (sel.includes('input') && ch.tagName === 'INPUT') match = true;
            else if (sel.includes('select') && ch.tagName === 'SELECT') match = true;
            else if (sel.includes('textarea') && ch.tagName === 'TEXTAREA') match = true;
            else if (sel.includes('[href]') && ch.hasAttribute('href')) match = true;
            else if (sel.includes('tab-content') && ch.classList && ch.classList.contains('tab-content')) match = true;
            else if (sel.includes('[tabindex]') && ch.hasAttribute('tabindex') && ch.tabIndex !== -1) match = true;
            if (match) found.push(ch);
            walk(ch);
          }
        }
        walk(this);
        return found;
      },
      get innerHTML() {
        return innerHtmlStr;
      },
      set innerHTML(val) {
        innerHtmlStr = String(val);
      },
      insertAdjacentHTML: function(pos, val) {
        innerHtmlStr += String(val);
      }
    };

    if (id) elements.set(id, el);
    return el;
  }

  const pokemonList = makeElement('pokemonList', 'ul');
  const loadMoreBtn = makeElement('loadMoreButton', 'button');
  const searchInput = makeElement('searchInput', 'input');
  searchInput.value = '';
  const clearSearchBtn = makeElement('clearSearchBtn', 'button');
  const sortSelect = makeElement('sortSelect', 'select');
  sortSelect.value = 'id-asc';
  const generationSelect = makeElement('generationSelect', 'select');
  generationSelect.value = '1';
  const resultCount = makeElement('resultCount', 'div');
  const favCounter = makeElement('favCounter', 'span');
  const favToggleBtn = makeElement('favoritesToggleBtn', 'button');
  const themeToggle = makeElement('themeToggleBtn', 'button');

  // Modal elements
  const modalOverlay = makeElement('modalOverlay', 'div');
  modalOverlay.setAttribute('aria-hidden', 'true');
  const pokemonModal = makeElement('pokemonModal', 'div');
  pokemonModal.setAttribute('role', 'dialog');
  pokemonModal.setAttribute('aria-modal', 'true');
  modalOverlay.appendChild(pokemonModal);

  const modalContent = makeElement('modalDynamicContent', 'div');
  pokemonModal.appendChild(modalContent);

  const modalCloseBtn = makeElement('modalCloseBtn', 'button');
  modalCloseBtn.setAttribute('aria-label', 'Fechar detalhes');
  pokemonModal.appendChild(modalCloseBtn);

  const appContainer = makeElement('appContainer', 'div', ['app-container']);
  appContainer.appendChild(pokemonList);
  appContainer.appendChild(modalOverlay);

  const mockDoc = {
    body: makeElement('body', 'body'),
    activeElement: null,
    getElementById: (id) => elements.get(id) || null,
    querySelector: (sel) => {
      if (sel.startsWith('#')) return elements.get(sel.slice(1)) || null;
      if (sel === '.app-container') return appContainer;
      return null;
    },
    querySelectorAll: (sel) => {
      if (sel === '.type-pill') return [];
      if (sel === '.nav-tab') return [];
      return [];
    },
    contains: (el) => true
  };

  mockDoc.body.appendChild(appContainer);
  return { mockDoc, elements, makeElement };
}

describe('FASE 1: BUSCA POKÉDEX & ACESSIBILIDADE DE TECLADO (IMPLEMENTAÇÃO REAL)', () => {
  let dom;

  beforeEach(() => {
    dom = createTestDom();
    mainModule.refreshDomElements(dom.mockDoc);
    mainModule.resetSearchState();
    mainModule.setSelectedGeneration('1');
    mainModule.setLoadedGeneration('1');
    mainModule.setIsModalOpen(false);
    mainModule.setLastFocusedElement(null);
    mainModule.setSelectedType('all');
    mainModule.setShowingFavoritesOnly(false);
    mainModule.setFavorites([]);
    mainModule.setAllLoadedPokemons([]);
    pokeApi.setPokemonIndex(MOCK_CATALOG);
    pokeApi.clearTypeIndex();
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 1: Filtro antes da paginação
  // --------------------------------------------------------------------------
  it('Cenário 1: Filtro de tipo avalia todo o catálogo antes de fatiar páginas (candidato 21+ é renderizado)', async () => {
    // Cria 25 candidatos com termo "flame": IDs 1..20 são Normal/Water, IDs 21 e 22 são Fire
    const syntheticCatalog = [];
    for (let i = 1; i <= 25; i++) {
      syntheticCatalog.push({ id: i, name: `flame-mon-${i}`, url: `https://pokeapi.co/api/v2/pokemon/${i}/` });
    }
    pokeApi.setPokemonIndex(syntheticCatalog);
    pokeApi.setTypeIndex('fire', [21, 22]); // Apenas IDs 21 e 22 possuem o tipo fire

    const originalGetPokemonDetail = pokeApi.getPokemonDetail;
    try {
      pokeApi.getPokemonDetail = async (id) => ({
        number: id,
        name: `flame-mon-${id}`,
        type: id >= 21 ? 'fire' : 'water',
        types: [id >= 21 ? 'fire' : 'water'],
        stats: { total: 300, hp: 50, attack: 50, defense: 50, specialAttack: 50, specialDefense: 50, speed: 50 },
        photo: `flame-${id}.png`
      });

      // Usuário pesquisa "flame" com filtro 'fire' ativo
      mainModule.setSelectedType('fire');
      await mainModule.executeCatalogSearch('flame');

      const state = mainModule.getSearchState();
      assert.equal(state.currentSearchCandidates.length, 2, 'Candidatos elegíveis totais devem ser 2 (IDs 21 e 22)');
      assert.deepEqual(state.currentSearchCandidates.map(c => c.id), [21, 22], 'Candidatos pós-posição 20 devem ser preservados');

      const currentList = mainModule.getCurrentPokemons();
      assert.equal(currentList.length, 2, 'Página 1 deve exibir imediatamente os 2 Pokémon do tipo Fire');
      assert.equal(currentList[0].number, 21);
      assert.equal(currentList[1].number, 22);

      // Verificação no DOM real
      const resultCount = dom.elements.get('resultCount').textContent;
      assert.ok(resultCount.includes('2 de 2 Pokémon'), `Contador real deve indicar 2 de 2: ${resultCount}`);
      assert.equal(dom.elements.get('loadMoreButton').style.display, 'none', 'Carregar mais deve ocultar quando todos estão na tela');
      assert.ok(!dom.elements.get('pokemonList').innerHTML.includes('Filtro por tipo impedindo'), 'Não deve exibir empty state de tipo impedido');
    } finally {
      pokeApi.getPokemonDetail = originalGetPokemonDetail;
    }
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 2: Troca de geração durante a busca e limpeza do campo
  // --------------------------------------------------------------------------
  it('Cenário 2: Mudar de geração durante busca e limpar o campo restaura a listagem da nova geração', async () => {
    const originalGetPokemons = pokeApi.getPokemons;
    try {
      // Simula carregamento regular de lotes da PokéAPI
      pokeApi.getPokemons = async (offset, limit) => {
        const list = [];
        for (let i = offset + 1; i <= offset + limit; i++) {
          list.push({ number: i, name: `mon-${i}`, type: 'normal', types: ['normal'], stats: { total: 300 }, photo: '' });
        }
        return list;
      };

      // 1. Carrega lote inicial da Geração 1
      mainModule.setSelectedGeneration('1');
      await mainModule.loadPokemonItems(true);
      assert.equal(mainModule.getLoadedGeneration(), '1');
      assert.equal(mainModule.getAllLoadedPokemons().length, 20);
      assert.equal(mainModule.getAllLoadedPokemons()[0].number, 1);

      // 2. Inicia busca por "chiko"
      await mainModule.executeCatalogSearch('chiko');
      assert.equal(mainModule.getSearchState().isSearchingCatalog, true);

      // 3. Usuário troca de geração para Gen 2 (Johto: 152..251)
      mainModule.switchGenerationFilter('2');
      assert.equal(mainModule.getSelectedGeneration(), '2');

      // 4. Limpa a busca
      await mainModule.clearSearch(false);

      // Verificações da implementação real
      assert.equal(mainModule.getSelectedGeneration(), '2', 'Geração selecionada deve permanecer 2');
      assert.equal(mainModule.getLoadedGeneration(), '2', 'Listagem carregada deve pertencer à Geração 2');
      const loaded = mainModule.getAllLoadedPokemons();
      assert.ok(loaded.length > 0, 'Deve ter carregado pokémons da Geração 2');
      assert.ok(loaded[0].number >= 152 && loaded[0].number <= 251, `Primeiro Pokémon (#${loaded[0].number}) deve estar no intervalo da Gen 2 (152..251)`);

      const offsets = mainModule.getOffsets();
      assert.ok(offsets.offset >= 152, `Offset da paginação (${offsets.offset}) deve pertencer à Geração 2`);
      assert.equal(offsets.maxLimit, 251, 'Limite máximo da paginação deve ser 251 (Gen 2)');
    } finally {
      pokeApi.getPokemons = originalGetPokemons;
    }
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 3: Favoritos com invalidação de cache em tempo real
  // --------------------------------------------------------------------------
  it('Cenário 3: Remover favorito atualiza imediatamente os resultados e impede cache obsoleto', async () => {
    const originalGetPokemonDetail = pokeApi.getPokemonDetail;
    try {
      pokeApi.getPokemonDetail = async (id) => MOCK_DETAILS[id] || { number: id, name: `mon-${id}`, type: 'electric', types: ['electric'], stats: { total: 300 }, photo: '' };

      // Marca Pikachu (25) e Raichu (26) como favoritos
      mainModule.setFavorites([25, 26]);
      mainModule.setShowingFavoritesOnly(true);

      // Busca "pika" com filtro de favoritos
      await mainModule.executeCatalogSearch('pika');
      let current = mainModule.getCurrentPokemons();
      assert.equal(current.length, 1, 'Pikachu (#25) deve ser exibido');
      assert.equal(current[0].number, 25);

      // Remove Pikachu dos favoritos enquanto a busca está ativa
      await mainModule.toggleFavorite(25);
      assert.ok(!mainModule.getFavorites().includes(25), 'Pikachu deve ser removido de favoritos');

      // O resultado na tela deve ter sido atualizado imediatamente
      const state = mainModule.getSearchState();
      assert.equal(state.currentSearchCandidates.length, 0, 'Não deve restar nenhum candidato favorito correspondente a "pika"');

      // Verifica empty state contextual de favoritos no DOM
      const listHtml = dom.elements.get('pokemonList').innerHTML;
      assert.ok(listHtml.includes('Nenhum favorito encontrado'), `Deve renderizar feedback de favoritos: ${listHtml}`);

      // Repetir a busca explicitamente NÃO pode recuperar cache obsoleto com Pikachu
      await mainModule.executeCatalogSearch('pika');
      assert.equal(mainModule.getSearchState().currentSearchCandidates.length, 0, 'Repetir a busca não pode restaurar dados obsoletos do cache');
    } finally {
      pokeApi.getPokemonDetail = originalGetPokemonDetail;
    }
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 4: Foco no modal (somente controles visíveis participam do trap)
  // --------------------------------------------------------------------------
  it('Cenário 4: Focus trap do modal ignora controles de abas ocultas e fecha com Escape', () => {
    const modalEl = dom.elements.get('pokemonModal');
    const overlayEl = dom.elements.get('modalOverlay');
    overlayEl.classList.add('active');
    overlayEl.setAttribute('aria-hidden', 'false');

    // Configura botões reais no modal
    const closeBtn = dom.elements.get('modalCloseBtn');
    const tabAbout = dom.makeElement('tabBtnAbout', 'button', ['modal-tab-btn', 'active']);
    const tabEvo = dom.makeElement('tabBtnEvo', 'button', ['modal-tab-btn']);
    modalEl.appendChild(tabAbout);
    modalEl.appendChild(tabEvo);

    // Aba Sobre (visível)
    const paneAbout = dom.makeElement('tab-about', 'div', ['tab-content', 'active']);
    modalEl.appendChild(paneAbout);

    // Aba Evolução (oculta / sem classe .active)
    const paneEvo = dom.makeElement('tab-evolution', 'div', ['tab-content']);
    const hiddenEvoBtn = dom.makeElement('evoBtnRaichu', 'button', ['evo-stage']);
    paneEvo.appendChild(hiddenEvoBtn);
    modalEl.appendChild(paneEvo);

    // Testa isModalElementVisible na implementação real
    assert.equal(mainModule.isModalElementVisible(closeBtn), true, 'Botão de fechar deve estar visível');
    assert.equal(mainModule.isModalElementVisible(tabAbout), true, 'Botão da aba Sobre deve estar visível');
    assert.equal(mainModule.isModalElementVisible(tabEvo), true, 'Botão da aba Evoluções deve estar visível');
    assert.equal(mainModule.isModalElementVisible(hiddenEvoBtn), false, 'Botão dentro de aba inativa DEVE ser invisível');

    // Ativa estado do modal como aberto
    mainModule.setIsModalOpen(true);
    closeBtn.focus();
    assert.equal(dom.mockDoc.activeElement, closeBtn);

    // Shift+Tab no primeiro controle deve circular para o ÚLTIMO controle VISÍVEL (tabEvo, não hiddenEvoBtn!)
    let prevented = false;
    const shiftTabEvent = {
      key: 'Tab',
      shiftKey: true,
      preventDefault: () => { prevented = true; }
    };

    // Executa o handler real
    mainModule.handleModalTrapKeydown(shiftTabEvent);
    assert.equal(dom.mockDoc.activeElement, tabEvo, 'Shift+Tab deve circular para o último controle VISÍVEL (tabEvo)');

    // Tab no último controle visível deve circular de volta para o primeiro (closeBtn)
    prevented = false;
    const tabEvent = {
      key: 'Tab',
      shiftKey: false,
      preventDefault: () => { prevented = true; }
    };
    mainModule.handleModalTrapKeydown(tabEvent);
    assert.equal(dom.mockDoc.activeElement, closeBtn, 'Tab no último controle visível deve retornar para closeBtn');

    // Escape deve fechar o modal
    const escapeEvent = {
      key: 'Escape',
      preventDefault: () => {}
    };
    mainModule.handleModalTrapKeydown(escapeEvent);
    assert.equal(overlayEl.getAttribute('aria-hidden'), 'true', 'Escape deve fechar o modal e definir aria-hidden="true"');
    assert.equal(mainModule.getModalState().isModalOpen, false, 'Modal deve ser marcado como fechado');
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 5: Concorrência real da busca (resposta lenta não sobrescreve rápida)
  // --------------------------------------------------------------------------
  it('Cenário 5: Resposta atrasada da PokéAPI é descartada e não substitui pesquisa mais recente', async () => {
    const originalGetPokemonIndex = pokeApi.getPokemonIndex;
    try {
      // Controla promessas assíncronas para simular atraso na primeira busca
      let resolveSlow;
      const slowPromise = new Promise(res => { resolveSlow = res; });

      pokeApi.getPokemonIndex = async (limit, signal) => {
        if (signal && signal.aborted) throw new Error('Aborted');
        return MOCK_CATALOG;
      };

      const originalGetDetail = pokeApi.getPokemonDetail;
      pokeApi.getPokemonDetail = async (id, signal) => {
        if (id === 1) { // Bulbasaur lento
          await slowPromise;
        }
        return MOCK_DETAILS[id] || { number: id, name: `mon-${id}`, type: 'normal', types: ['normal'], stats: { total: 300 }, photo: '' };
      };

      // 1. Dispara pesquisa lenta "bulba"
      const searchSlow = mainModule.executeCatalogSearch('bulba');

      // 2. Logo em seguida dispara pesquisa rápida "pika"
      const searchFast = mainModule.executeCatalogSearch('pika');
      await searchFast;

      // 3. Apenas agora a pesquisa lenta responde
      resolveSlow();
      await searchSlow;

      // Verificação: o estado final deve ser estritamente "pika"
      const state = mainModule.getSearchState();
      assert.equal(state.currentSearchTerm, 'pika', 'O termo de busca final deve ser "pika"');
      const current = mainModule.getCurrentPokemons();
      assert.ok(current.some(p => p.number === 25), 'A listagem deve conter Pikachu (#25)');
      assert.ok(!current.some(p => p.number === 1), 'Bulbasaur atrasado NÃO deve ter sobrescrito a tela');
    } finally {
      pokeApi.getPokemonIndex = originalGetPokemonIndex;
    }
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 6: Limpeza de busca pendente (resposta atrasada é descartada)
  // --------------------------------------------------------------------------
  it('Cenário 6: Limpar uma busca pendente cancela requisições e preserva a listagem restaurada', async () => {
    let resolveDelayedDetail;
    const delayedDetailPromise = new Promise(res => { resolveDelayedDetail = res; });

    const originalGetDetail = pokeApi.getPokemonDetail;
    try {
      pokeApi.getPokemonDetail = async (id, signal) => {
        await delayedDetailPromise;
        return MOCK_DETAILS[id];
      };

      // Define estado pré-busca da Pokédex com Charmander (#4)
      mainModule.setSelectedGeneration('1');
      mainModule.setLoadedGeneration('1');
      mainModule.setAllLoadedPokemons([MOCK_DETAILS[4]]);
      mainModule.applyFiltersAndSort();

      // Inicia busca
      const searchPromise = mainModule.executeCatalogSearch('pika');

      // Antes da busca terminar, o usuário clica em limpar busca
      await mainModule.clearSearch(false);
      assert.equal(mainModule.getSearchState().isSearchingCatalog, false);

      // Agora a busca atrasada é resolvida
      resolveDelayedDetail();
      await searchPromise;

      // A listagem deve permanecer com o Pokémon restaurado (#4), e NÃO com resultados da busca
      const current = mainModule.getCurrentPokemons();
      assert.equal(current.length, 1);
      assert.equal(current[0].number, 4, 'Listagem deve manter Charmander (#4) restaurado');
      assert.ok(!current.some(p => p.number === 25), 'Pikachu da busca atrasada não pode aparecer');
    } finally {
      pokeApi.getPokemonDetail = originalGetDetail;
    }
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 7: Ciclo de vida completo do modal e preservação do acionador em navegação de evoluções
  // --------------------------------------------------------------------------
  it('Cenário 7: Navegar por evoluções dentro do modal preserva o elemento chamador original ao fechar', async () => {
    const originalGetDetail = pokeApi.getPokemonDetail;
    try {
      pokeApi.getPokemonDetail = async (id) => MOCK_DETAILS[id];

      // Botão do card do Pikachu na Pokédex
      const cardActionBtn = dom.makeElement('cardBtn25', 'button', ['pokemon-card-action-btn']);
      dom.mockDoc.body.appendChild(cardActionBtn);
      cardActionBtn.focus();
      assert.equal(dom.mockDoc.activeElement, cardActionBtn);

      // 1. Abre detalhes do Pikachu (#25)
      await mainModule.openPokemonDetails(25);
      const overlay = dom.elements.get('modalOverlay');
      assert.equal(overlay.getAttribute('aria-hidden'), 'false');
      assert.equal(mainModule.getModalState().isModalOpen, true);

      // 2. Dentro do modal, o usuário navega para a evolução Raichu (#26)
      await mainModule.openPokemonDetails(26);
      assert.equal(mainModule.getModalState().isModalOpen, true);
      assert.ok(dom.elements.get('modalDynamicContent').innerHTML.includes('raichu'));

      // 3. Fecha o modal
      mainModule.closeModal();
      assert.equal(overlay.getAttribute('aria-hidden'), 'true');
      assert.equal(mainModule.getModalState().isModalOpen, false);

      // O foco DEVE ter retornado para o botão do card original (#25) na Pokédex!
      assert.equal(dom.mockDoc.activeElement, cardActionBtn, 'Foco deve retornar ao card acionador original da Pokédex');
    } finally {
      pokeApi.getPokemonDetail = originalGetDetail;
    }
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 8: Estados reais de busca (Zero resultados e Falha de rede)
  // --------------------------------------------------------------------------
  it('Cenário 8: Mensagens renderizadas distinguem com clareza zero resultados de falha de conexão', async () => {
    // 1. Pesquisa sem resultados
    await mainModule.executeCatalogSearch('naoexiste999');
    const emptyHtml = dom.elements.get('pokemonList').innerHTML;
    assert.ok(emptyHtml.includes('Nenhum Pokémon encontrado'), 'Deve renderizar título de nenhum Pokémon');
    assert.ok(emptyHtml.includes('naoexiste999'), 'Deve indicar o termo pesquisado');
    assert.equal(dom.elements.get('resultCount').textContent, '0 Pokémon encontrados');

    // 2. Falha de rede na PokéAPI
    const originalGetIndex = pokeApi.getPokemonIndex;
    try {
      pokeApi.getPokemonIndex = async () => {
        throw new Error('Falha de conexão com PokéAPI');
      };

      await mainModule.executeCatalogSearch('pikachu');
      const errorHtml = dom.elements.get('pokemonList').innerHTML;
      assert.ok(errorHtml.includes('Erro de conexão') || errorHtml.includes('Não foi possível conectar à PokéAPI'), 'Deve renderizar mensagem de erro de rede');
      assert.ok(errorHtml.includes('Tentar novamente'), 'Deve renderizar botão interativo de nova tentativa');
    } finally {
      pokeApi.getPokemonIndex = originalGetIndex;
    }
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 9: Flexibilidade de entrada (Pikachu, pikachu, pika, 25, #25)
  // --------------------------------------------------------------------------
  it('Cenário 9: Busca suporta nomes completos, parciais ("pika"), números ("25") e cerquilha ("#25")', async () => {
    const originalGetDetail = pokeApi.getPokemonDetail;
    try {
      pokeApi.getPokemonDetail = async (id) => MOCK_DETAILS[id];

      const queries = ['Pikachu', 'pikachu', 'pika', '25', '#25', '#025'];
      for (const q of queries) {
        await mainModule.executeCatalogSearch(q);
        const candidates = mainModule.getSearchState().currentSearchCandidates;
        assert.ok(candidates.length > 0, `Query "${q}" deve retornar candidatos`);
        assert.ok(candidates.some(c => c.id === 25), `Query "${q}" deve localizar Pikachu (#25)`);
      }
    } finally {
      pokeApi.getPokemonDetail = originalGetDetail;
    }
  });

  // --------------------------------------------------------------------------
  // CENÁRIO 10: Estrutura acessível dos cards e independência de favoritos
  // --------------------------------------------------------------------------
  it('Cenário 10: Card possui botão nativo dedicado com foco e botão de favoritos independente', () => {
    const cardHtml = mainModule.createPokemonCard(MOCK_DETAILS[25]);

    // O card é um li
    assert.ok(cardHtml.includes('<li class="pokemon-card'), 'Card deve ser um <li>');

    // Botão de detalhes nativo dedicado
    assert.ok(cardHtml.includes('class="pokemon-card-action-btn"'));
    assert.ok(cardHtml.includes('aria-label="Ver detalhes de Pikachu"'));
    assert.ok(cardHtml.includes('onclick="openPokemonDetails(25)"'));

    // Botão de favoritos independente
    assert.ok(cardHtml.includes('class="fav-btn'));
    assert.ok(cardHtml.includes('event.stopPropagation()'));

    // Não aninhado
    const actionClose = cardHtml.indexOf('</button>');
    const favStart = cardHtml.indexOf('class="fav-btn');
    assert.ok(favStart > actionClose, 'Botão de favoritos não pode estar dentro do botão de detalhes');
  });
});
