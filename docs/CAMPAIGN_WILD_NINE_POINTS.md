# Exploração selvagem: nove pontos

Esta atualização amplia os encontros selvagens opcionais para **três pontos em cada uma das Regiões 1, 2 e 3**. A Região Final continua sem exploração. O avatar caminha até o ponto escolhido no mapa; clicar no ponto não inicia uma luta imediatamente.

| Região | Pontos | Limite |
| --- | --- | --- |
| 1 | Prados, Mata e Costa | 3 capturas bem-sucedidas por ponto |
| 2 | Cânion, Caldeira e Caverna glacial | 3 capturas bem-sucedidas por ponto |
| 3 | Clareira, Ruínas e Santuário | 3 capturas bem-sucedidas por ponto |

Cada ponto tem um conjunto temático de espécies e contador próprio. Há **9 pontos e até 27 capturas** na campanha. O limite é consumido somente quando a captura tem sucesso; sair do encontro, perder a luta ou ver o Pokémon escapar da Poké Bola não o consome. Ao atingir 3/3, apenas aquele ponto fica indisponível.

Antes da luta, a tela mostra a espécie, o local e um aviso destacado de raridade: comum, incomum, raro, lendário ou mítico. O jogador escolhe entre deixar o Pokémon ir e explorar novamente (novo sorteio) ou selecionar exatamente três membros do elenco para lutar contra o selvagem. A vitória dá uma tentativa de captura com 72% de chance. A distribuição-base é **45% comum / 25% incomum / 20% raro / 10% especial** (lendários e míticos juntos); quando uma faixa não tem mais espécies disponíveis, os pesos restantes são redistribuídos.

Espécies dos quatro desafios finais e do Super Treinador continuam excluídas, inclusive da faixa especial. Espécies já pertencentes ao elenco não são sorteadas. O Shadow Final Stand pode ter até **64 Pokémon disponíveis**: 29 permanentes da progressão tradicional, 27 capturas e 8 reforços temporários. A lista dos candidatos especiais está em `CAMPAIGN_WILD_SPECIAL_ENCOUNTERS.md`.

## Compatibilidade

Saves anteriores permanecem válidos. Capturas, encontro ativo, captura pendente e resultado antigos sem identificador de ponto são atribuídos ao ponto original de sua região: Mata, Cânion ou Ruínas. Saves da primeira fase que também não guardam região continuam atribuídos à Região 1/Mata. A validação do save rejeita pontos de outra região, espécies proibidas, duplicatas e capturas acima do limite de cada ponto.

## Conferência

Os testes automatizados cobrem os nove conjuntos de espécies, as três capturas por ponto, os contadores independentes, o deslocamento do avatar, a escolha de sair ou lutar, raridade, migração de saves e o elenco máximo do Final Stand. Ainda é recomendada uma conferência visual manual no navegador, especialmente posicionamento dos três botões em cada mapa no computador e no celular.
