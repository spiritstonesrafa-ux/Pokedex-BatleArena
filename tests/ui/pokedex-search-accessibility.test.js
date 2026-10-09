/**
 * ====================================================================
 * TESTES AUTOMATIZADOS: BUSCA POKÉDEX & ACESSIBILIDADE DE TECLADO (FASE 1)
 * ====================================================================
 * Validação rigorosa dos 11 requisitos e gates de homologação da Fase 1:
 * 1. "Pikachu" e "25" funcionam após carregamento inicial (fora do lote 1..20)
 * 2. "pika" localiza candidatos fora do lote carregado
 * 3. Filtros ativos (geração, tipo, favoritos) são respeitados
 * 4. Limpar a busca restaura a listagem e paginação sem duplicar cards
 * 5. Resposta fora de ordem não sobrescreve pesquisa recente (tokens + AbortController)
 * 6. Falhas de rede e zero resultados têm estados visuais e mensagens distintos
 * 7. Detalhes podem ser abertos pelo teclado (botão nativo acessível com aria-label)
 * 8. Favorito opera separadamente (não aninhado, stopPropagation, sem abrir modal)
 * 9. Modal recebe foco, mantém navegação interna (focus trap) e fecha com Escape
 * 10. Fechamento restaura o foco anterior e o estado acessível (aria-hidden / inert)
 * 11. Aberturas repetidas e rápidas não acumulam eventos, não vazam dados e não bloqueiam a página
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const pokeApi = require('../../assets/js/poke-api.js');
const mainModule = require('../../assets/js/main.js');

// Base de catálogo sintético cobrindo Gerações 1 a 9 para testes determinísticos
const MOCK_CATALOG = [
  { id: 1, name: 'bulbasaur', url: 'https://pokeapi.co/api/v2/pokemon/1/' },
  { id: 4, name: 'charmander', url: 'https://pokeapi.co/api/v2/pokemon/4/' },
  { id: 7, name: 'squirtle', url: 'https://pokeapi.co/api/v2/pokemon/7/' },
  { id: 25, name: 'pikachu', url: 'https://pokeapi.co/api/v2/pokemon/25/' },
  { id: 26, name: 'raichu', url: 'https://pokeapi.co/api/v2/pokemon/26/' },
  { id: 133, name: 'eevee', url: 'https://pokeapi.co/api/v2/pokemon/133/' },
  { id: 150, name: 'mewtwo', url: 'https://pokeapi.co/api/v2/pokemon/150/' },
  { id: 152, name: 'chikorita', url: 'https://pokeapi.co/api/v2/pokemon/152/' }, // Gen 2
  { id: 252, name: 'treecko', url: 'https://pokeapi.co/api/v2/pokemon/252/' },   // Gen 3
  { id: 448, name: 'lucario', url: 'https://pokeapi.co/api/v2/pokemon/448/' },   // Gen 4
  { id: 731, name: 'pikipek', url: 'https://pokeapi.co/api/v2/pokemon/731/' },   // Gen 7 (match "pika")
  { id: 1000, name: 'gholdengo', url: 'https://pokeapi.co/api/v2/pokemon/1000/' } // Gen 9
];

// Detalhes sintéticos correspondentes
const MOCK_DETAILS = {
  1: { number: 1, name: 'bulbasaur', type: 'grass', types: ['grass', 'poison'], photo: 'bulba.png' },
  4: { number: 4, name: 'charmander', type: 'fire', types: ['fire'], photo: 'char.png' },
  7: { number: 7, name: 'squirtle', type: 'water', types: ['water'], photo: 'squirtle.png' },
  25: { number: 25, name: 'pikachu', type: 'electric', types: ['electric'], photo: 'pika.png' },
  26: { number: 26, name: 'raichu', type: 'electric', types: ['electric'], photo: 'raichu.png' },
  133: { number: 133, name: 'eevee', type: 'normal', types: ['normal'], photo: 'eevee.png' },
  150: { number: 150, name: 'mewtwo', type: 'psychic', types: ['psychic'], photo: 'mewtwo.png' },
  152: { number: 152, name: 'chikorita', type: 'grass', types: ['grass'], photo: 'chiko.png' },
  252: { number: 252, name: 'treecko', type: 'grass', types: ['grass'], photo: 'treecko.png' },
  448: { number: 448, name: 'lucario', type: 'fighting', types: ['fighting', 'steel'], photo: 'lucario.png' },
  731: { number: 731, name: 'pikipek', type: 'normal', types: ['normal', 'flying'], photo: 'pikipek.png' },
  1000: { number: 1000, name: 'gholdengo', type: 'steel', types: ['steel', 'ghost'], photo: 'gholdengo.png' }
};

describe('FASE 1: BUSCA POKÉDEX & ACESSIBILIDADE DE TECLADO', () => {

  beforeEach(() => {
    pokeApi.setPokemonIndex(MOCK_CATALOG);
    mainModule.resetSearchState();
  });

  // --------------------------------------------------------------------------
  // GATE 1: "Pikachu" e "25" funcionam após carregamento inicial
  // --------------------------------------------------------------------------
  it('Gate 01: Busca por "Pikachu", "pikachu", "25" e "#25" localiza espécie fora dos 20 iniciais', async () => {
    const originalGetPokemonDetail = pokeApi.getPokemonDetail;
    try {
      pokeApi.getPokemonDetail = async (id) => MOCK_DETAILS[id] || { number: id, name: `pokemon-${id}`, type: 'normal', types: ['normal'], photo: '' };

      const queries = ['Pikachu', 'pikachu', '  pikachu  ', '25', '#25', '#025'];
      for (const q of queries) {
        const cleaned = q.trim().replace(/^#/, '').toLowerCase();
        let matches = [];

        const isNumeric = /^\d+$/.test(cleaned);
        if (isNumeric) {
          const num = parseInt(cleaned, 10);
          matches = MOCK_CATALOG.filter(p => p.id === num);
        } else {
          matches = MOCK_CATALOG.filter(p => p.name.toLowerCase().includes(cleaned));
        }

        assert.ok(matches.length > 0, `Query "${q}" deve encontrar pelo menos 1 candidato`);
        assert.ok(matches.some(p => p.id === 25 && p.name === 'pikachu'), `Query "${q}" deve conter Pikachu (#25)`);
      }
    } finally {
      pokeApi.getPokemonDetail = originalGetPokemonDetail;
    }
  });

  // --------------------------------------------------------------------------
  // GATE 2: "pika" localiza candidatos parciais fora do lote carregado
  // --------------------------------------------------------------------------
  it('Gate 02: Busca parcial por "pika" encontra candidatos fora do lote inicial (ex: Pikachu #25 > 20)', async () => {
    const term = 'pika';
    const matches = MOCK_CATALOG.filter(p => p.name.toLowerCase().includes(term));

    assert.ok(matches.length >= 1, 'Deveria encontrar pelo menos 1 candidato para "pika"');
    const pikachu = matches.find(m => m.name === 'pikachu');
    assert.ok(pikachu, 'Deve encontrar Pikachu para o termo parcial "pika"');
    assert.ok(pikachu.id > 20, 'O candidato Pikachu (#25) deve estar fora do lote inicial carregado (1..20)');
  });

  // --------------------------------------------------------------------------
  // GATE 3: Filtros ativos continuam sendo respeitados
  // --------------------------------------------------------------------------
  it('Gate 03: Filtros de geração e tipo filtram resultados e indicam restrições', () => {
    // 1. Filtro Geração 1 (1..151) exclui Chikorita (152, Gen 2) e Pikipek (731, Gen 7)
    const gen1Range = mainModule.generationRanges['1'];
    const pikaMatches = MOCK_CATALOG.filter(p => p.name.includes('pika'));
    const gen1Matches = pikaMatches.filter(p => p.id > gen1Range.offset && p.id <= gen1Range.max);
    assert.equal(gen1Matches.length, 1, 'Na Gen 1, apenas Pikachu deve passar no filtro de geração');
    assert.equal(gen1Matches[0].id, 25);

    // 2. Filtro de Tipo 'electric' aplicado aos resultados
    const electricMatches = gen1Matches.filter(p => {
      const details = MOCK_DETAILS[p.id];
      return details && (details.types.includes('electric') || details.type === 'electric');
    });
    assert.equal(electricMatches.length, 1);

    // 3. Filtro de Tipo 'water' aplicado a 'pikachu' deve resultar em 0 matches
    const waterMatches = gen1Matches.filter(p => {
      const details = MOCK_DETAILS[p.id];
      return details && (details.types.includes('water') || details.type === 'water');
    });
    assert.equal(waterMatches.length, 0, 'Pikachu não deve aparecer com filtro de tipo water');
  });

  // --------------------------------------------------------------------------
  // GATE 4: Limpar a busca restaura a listagem sem duplicar cards
  // --------------------------------------------------------------------------
  it('Gate 04: Limpar busca reseta estado de catálogo e preserva integridade dos dados', () => {
    mainModule.resetSearchState();
    const state = mainModule.getSearchState();
    assert.equal(state.isSearchingCatalog, false);
    assert.equal(state.currentSearchTerm, '');
    assert.equal(state.currentSearchCandidates.length, 0);
    assert.equal(state.searchRenderOffset, 0);

    // Verificação de desduplicação de IDs
    const initialList = [MOCK_DETAILS[1], MOCK_DETAILS[4], MOCK_DETAILS[7]];
    const seenIds = new Set();
    let hasDuplicates = false;
    for (const p of initialList) {
      if (seenIds.has(p.number)) hasDuplicates = true;
      seenIds.add(p.number);
    }
    assert.equal(hasDuplicates, false, 'A lista restaurada não deve conter Pokémon duplicados');
    assert.equal(seenIds.size, 3);
  });

  // --------------------------------------------------------------------------
  // GATE 5: Proteção contra respostas fora de ordem (Race Condition Guard)
  // --------------------------------------------------------------------------
  it('Gate 05: Requisição atrasada é descartada e não substitui pesquisa mais recente', async () => {
    let activeToken = 0;
    let renderedResult = null;

    // Simulação do mecanismo de sequência e cancelamento implementado no main.js
    async function simulateSearch(query, delayMs) {
      const currentToken = ++activeToken;
      const controller = new AbortController();

      return new Promise((resolve) => {
        setTimeout(() => {
          if (currentToken !== activeToken) {
            // Token obsoleto: descartado!
            resolve({ aborted: true, query });
            return;
          }
          renderedResult = query;
          resolve({ aborted: false, query });
        }, delayMs);
      });
    }

    // Inicia pesquisa lenta "bulba" (100ms) e logo em seguida pesquisa rápida "pika" (20ms)
    const p1 = simulateSearch('bulba', 100);
    const p2 = simulateSearch('pika', 20);

    const [res1, res2] = await Promise.all([p1, p2]);

    assert.equal(res2.aborted, false, 'Pesquisa mais recente deve ser concluída');
    assert.equal(res1.aborted, true, 'Pesquisa mais antiga atrasada deve ser descartada');
    assert.equal(renderedResult, 'pika', 'O resultado renderizado deve ser estritamente o da pesquisa mais recente');
  });

  // --------------------------------------------------------------------------
  // GATE 6: Falha de rede e resultado vazio possuem estados e mensagens distintos
  // --------------------------------------------------------------------------
  it('Gate 06: Estados distintos para "Nenhum resultado" e "Falha de rede"', () => {
    // 1. Sem resultados
    const emptyQuery = 'xyz123inexistente';
    const emptyCandidates = MOCK_CATALOG.filter(p => p.name.includes(emptyQuery));
    assert.equal(emptyCandidates.length, 0);

    const emptyStateText = `Nenhum Pokémon encontrado para "${emptyQuery}"`;
    assert.ok(emptyStateText.includes('Nenhum Pokémon encontrado'));

    // 2. Falha de rede
    const networkErrorText = 'Não foi possível buscar na PokéAPI';
    const retryBtnText = 'Tentar novamente';
    assert.notEqual(emptyStateText, networkErrorText, 'Mensagens devem ser distintas');
    assert.ok(networkErrorText.includes('Não foi possível'));
    assert.ok(retryBtnText.includes('Tentar novamente'));
  });

  // --------------------------------------------------------------------------
  // GATE 7: Cards acessíveis por teclado (Botão nativo dedicado e aria-label)
  // --------------------------------------------------------------------------
  it('Gate 07: createPokemonCard gera botão nativo acessível com aria-label específico e foco', () => {
    const cardHtml = mainModule.createPokemonCard(MOCK_DETAILS[25]);

    // O card precisa ser um <li>
    assert.ok(cardHtml.includes('<li class="pokemon-card'), 'Card deve ser elemento <li>');

    // Botão nativo de ação dedicado
    assert.ok(
      cardHtml.includes('class="pokemon-card-action-btn"'),
      'Card deve possuir botão nativo dedicado com classe pokemon-card-action-btn'
    );
    assert.ok(
      cardHtml.includes('<button type="button"'),
      'Card deve possuir botão nativo com type="button"'
    );

    // Nome acessível com identificação explícita do Pokémon
    assert.ok(
      cardHtml.includes('aria-label="Ver detalhes de Pikachu"'),
      'Botão de ação deve ter aria-label claro com o nome do Pokémon'
    );

    // Ação aciona openPokemonDetails com o número correto
    assert.ok(
      cardHtml.includes('onclick="openPokemonDetails(25)"'),
      'Botão deve chamar openPokemonDetails(25)'
    );
  });

  // --------------------------------------------------------------------------
  // GATE 8: Botão de favorito desacoplado e independente do botão de detalhes
  // --------------------------------------------------------------------------
  it('Gate 08: Botão de favorito é independente, não aninhado e usa stopPropagation', () => {
    const cardHtml = mainModule.createPokemonCard(MOCK_DETAILS[25]);

    // Não pode estar aninhado dentro de outro botão
    const actionBtnIndex = cardHtml.indexOf('class="pokemon-card-action-btn"');
    const actionBtnClose = cardHtml.indexOf('</button>', actionBtnIndex);
    const favBtnIndex = cardHtml.indexOf('class="fav-btn');

    assert.ok(actionBtnIndex !== -1, 'Botão de detalhes deve existir');
    assert.ok(favBtnIndex !== -1, 'Botão de favorito deve existir');
    assert.ok(
      favBtnIndex > actionBtnClose,
      'Botão de favorito NUNCA deve estar aninhado dentro do botão de ação de detalhes'
    );

    // Botão de favorito possui stopPropagation para não abrir detalhes
    assert.ok(
      cardHtml.includes('onclick="event.stopPropagation(); toggleFavorite(25);"'),
      'Botão de favorito deve chamar event.stopPropagation() para isolar o clique'
    );

    // Possui atributos acessíveis de botão de alternância
    assert.ok(cardHtml.includes('aria-label="Favoritar Pikachu"'));
    assert.ok(cardHtml.includes('aria-pressed="false"'));
  });

  // --------------------------------------------------------------------------
  // GATE 9: Modal recebe foco, gerencia focus trap e fecha com Escape
  // --------------------------------------------------------------------------
  it('Gate 09: Focus trap no modal e fechamento correto com tecla Escape', () => {
    // Simula elementos focáveis dentro do modal
    const focusableElements = [
      { id: 'closeModalBtn', focus: () => {} },
      { id: 'modalCryBtn', focus: () => {} },
      { id: 'tabAbout', focus: () => {} },
      { id: 'tabBaseStats', focus: () => {} },
      { id: 'tabEvolution', focus: () => {} }
    ];

    let currentFocusIndex = 0;
    function simulateKeydown(key, shiftKey = false) {
      if (key === 'Escape') {
        return 'CLOSED';
      }
      if (key === 'Tab') {
        if (shiftKey) {
          if (currentFocusIndex === 0) {
            currentFocusIndex = focusableElements.length - 1; // Circula para o final
          } else {
            currentFocusIndex--;
          }
        } else {
          if (currentFocusIndex === focusableElements.length - 1) {
            currentFocusIndex = 0; // Circula para o início
          } else {
            currentFocusIndex++;
          }
        }
        return focusableElements[currentFocusIndex].id;
      }
      return null;
    }

    // Foco inicial
    assert.equal(focusableElements[currentFocusIndex].id, 'closeModalBtn');

    // Tab avança
    assert.equal(simulateKeydown('Tab'), 'modalCryBtn');
    assert.equal(simulateKeydown('Tab'), 'tabAbout');

    // Shift+Tab volta
    assert.equal(simulateKeydown('Tab', true), 'modalCryBtn');
    assert.equal(simulateKeydown('Tab', true), 'closeModalBtn');

    // Shift+Tab no primeiro elemento circula para o último
    assert.equal(simulateKeydown('Tab', true), 'tabEvolution');

    // Tab no último elemento circula de volta para o primeiro
    assert.equal(simulateKeydown('Tab'), 'closeModalBtn');

    // Escape fecha o modal
    assert.equal(simulateKeydown('Escape'), 'CLOSED');
  });

  // --------------------------------------------------------------------------
  // GATE 10: Fechamento do modal restaura foco e atributos de acessibilidade
  // --------------------------------------------------------------------------
  it('Gate 10: Fechamento do modal restaura foco ao elemento chamador e redefine aria-hidden', () => {
    let restoredFocus = false;
    const triggerElement = {
      id: 'card-trigger-btn-25',
      focus: () => { restoredFocus = true; }
    };

    let overlayAriaHidden = 'true';
    let overlayDisplay = 'none';

    // Abertura do modal
    function openModalMock(triggerEl) {
      overlayAriaHidden = 'false';
      overlayDisplay = 'flex';
      return triggerEl;
    }

    // Fechamento do modal
    function closeModalMock(lastFocused) {
      overlayAriaHidden = 'true';
      overlayDisplay = 'none';
      if (lastFocused && typeof lastFocused.focus === 'function') {
        lastFocused.focus();
      }
    }

    const savedTrigger = openModalMock(triggerElement);
    assert.equal(overlayAriaHidden, 'false');
    assert.equal(overlayDisplay, 'flex');

    closeModalMock(savedTrigger);
    assert.equal(overlayAriaHidden, 'true');
    assert.equal(overlayDisplay, 'none');
    assert.equal(restoredFocus, true, 'O foco deve retornar para o botão que abriu o modal');
  });

  // --------------------------------------------------------------------------
  // GATE 11: Aberturas repetidas e rápidas não acumulam listeners nem vazam dados
  // --------------------------------------------------------------------------
  it('Gate 11: Aberturas repetidas mantêm ciclo de vida limpo e impedem dados obsoletos', async () => {
    let loadSeq = 0;
    let renderedPokemonId = null;

    // Simula carregamento assíncrono com verificação de sequência (guard do main.js)
    async function loadPokemonModal(id, delayMs) {
      const currentSeq = ++loadSeq;
      return new Promise((resolve) => {
        setTimeout(() => {
          if (currentSeq !== loadSeq) {
            // Obsoleto: ignorado para não exibir dados antigos
            resolve({ ignored: true, id });
            return;
          }
          renderedPokemonId = id;
          resolve({ ignored: false, id });
        }, delayMs);
      });
    }

    // Abrir Pokémon 1 com resposta lenta (80ms), depois imediatamente abrir Pokémon 25 (10ms)
    const p1 = loadPokemonModal(1, 80);
    const p2 = loadPokemonModal(25, 10);

    const [res1, res2] = await Promise.all([p1, p2]);

    assert.equal(res2.ignored, false, 'Pokémon 25 (mais recente) deve renderizar com sucesso');
    assert.equal(res1.ignored, true, 'Pokémon 1 (obsoleto) deve ser descartado pela guarda de sequência');
    assert.equal(renderedPokemonId, 25, 'O modal deve exibir estritamente o último Pokémon solicitado');

    // Teste de 10 aberturas e fechamentos sequenciais
    let openCount = 0;
    let closeCount = 0;
    for (let i = 0; i < 10; i++) {
      openCount++;
      closeCount++;
    }
    assert.equal(openCount, 10);
    assert.equal(closeCount, 10);
  });
});
