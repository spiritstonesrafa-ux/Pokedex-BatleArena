# Encontros especiais selvagens

Cada exploração nas três primeiras regiões usa a distribuição-base: **45% comum, 25% incomum, 20% raro e 10% especial**. A faixa especial é compartilhada entre lendários e míticos (10% especial = lendários e míticos juntos); não são 10% para cada grupo. Em cada ponto, o sorteio considera apenas espécies especiais compatíveis com seus tipos, ainda não pertencentes ao elenco. Se uma faixa não tiver candidatos, as faixas restantes são normalizadas.

Há **25 espécies especiais** cadastradas para encontros: 19 lendárias já presentes no catálogo e seis míticas acrescentadas para esta experiência. Todas têm metadados e quatro golpes compatíveis com a batalha offline. A classificação dos seis míticos foi conferida na [PokéAPI](https://pokeapi.co/docs/v2).

- Lendários: Lugia, Ho-Oh, Kyogre, Rayquaza, Heatran, Cresselia, Tornadus, Xerneas, Zygarde, Tapu Koko, Tapu Lele, Tapu Bulu, Tapu Fini, Zacian, Kubfu, Urshifu, Wo-Chien, Chien-Pao e Ting-Lu.
- Míticos: Celebi, Manaphy, Keldeo, Darkrai, Volcanion e Marshadow.

Os 12 Pokémon das quatro provas finais e os três do Super Treinador são excluídos do sorteio, independentemente de tipo ou região. O draft inicial também não foi alterado. A tela pré-batalha identifica claramente LENDÁRIO ou MÍTICO. A luta continua 3 contra 1, a captura depois da vitória mantém uma tentativa com 72% de chance, e cada captura bem-sucedida consome uma das três vagas do ponto explorado.

Os dados das 25 espécies estão em `assets/js/campaign/campaign-wild-special-catalog.js`; o gerador de desenvolvimento é `scripts/build-campaign-wild-special-catalog.js`. O jogo não consulta a PokéAPI para preparar batalhas da campanha. Testes cobrem a chance por ponto, exclusões, golpes suportados, batalha/captura mítica offline e compatibilidade com saves.
