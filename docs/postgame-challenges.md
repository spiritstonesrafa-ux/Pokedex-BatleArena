# Jornada após Shadow

Implementada em 01/11/2026. A campanha principal continua encerrando com Shadow; a jornada extra aparece na tela de conclusão, e o mapa oferece retorno à seleção dos desafios.

| Desafio | Equipe por ID | Requisito |
|---|---|---|
| Mewtwo | 150, 10043, 10044 | Shadow derrotado |
| Equilíbrio de Zygarde | 10181, 718, 10120 | Shadow derrotado |
| Zero Absoluto | 646, 10022, 10023 | Mewtwo ou Zygarde concluído |
| Eclipse de Necrozma | 10155, 10156, 10157 | Zero Absoluto concluído |
| Ruptura da Criação | 10245, 10246, 10007 | Mewtwo, Zygarde, Kyurem e Necrozma concluídos |

Todos usam o formato 3x3 e os golpes legais do catálogo de batalha existente. A primeira vitória permite escolher um dos três adversários ainda não possuídos para o elenco permanente. Uma recompensa pendente precisa ser resgatada antes da próxima batalha. Revanches não fornecem novas recompensas; possuir previamente as três opções conclui o desafio sem bloquear a progressão.

## Aberturas

Cada confronto passa pela abertura antes de iniciar o motor: limiar, presságio, revelações individuais dos três adversários e confirmação do confronto. A equipe exibida é a equipe efetivamente preparada pela sessão de batalha.

- Zygarde: floresta, células hexagonais verdes, convergência e silhuetas.
- Kyurem: congelamento, fissuras e partículas de gelo; tons elétricos e fogo durante as revelações de Black e White.
- Necrozma: eclipse, disco negro com coroa luminosa e cristais prismáticos; revelação de Ultra Necrozma.
- Criação: anéis e fenda dimensional, partículas e uma arena celestial que apresenta Dialga Origin, Palkia Origin e Giratina Origin.

Cada abertura usa uma composição musical original separada, respeitando o canal de música, mudo, cancelamento e pausa da aba. O jogador pode avançar ou pular. Movimento reduzido desativa avanço automático e animações; foco e timers são restaurados na saída. As arenas das batalhas são Grass, Ice, Psychic e Ghost, respectivamente.

## Persistência e compatibilidade

A definição central POSTGAME_TRIALS fornece equipes, nomes e requisitos. O gerente e a tela usam a mesma regra de desbloqueio. O save versão 1 recebe os novos registros de forma aditiva; campanhas concluídas, recompensas do Mewtwo e demais recrutas existentes continuam preservados. Registros de desafios dependentes sem pré-requisitos válidos são descartados na leitura.

A expansão não implementa habilidades adicionais dessas espécies ou transformações durante o combate: são formas cadastradas em posições separadas, como no desafio Mewtwo. O suporte de habilidades continua identificado pelo catálogo existente.

Validação: 2.833 testes aprovados, 39 suítes, zero falhas. Auditorias de learnsets e conclusão do roadmap aprovadas. Testes novos cobrem ambos os caminhos de desbloqueio, derrotas, retries, escolha/persistência de formas, revanches, posse de todas as opções, migração e sincronização da batalha com as aberturas. Casos de cenas e áudio foram ampliados para os quatro temas.

## Exclusividade na exploração

Pokémon das equipes dos Mestres, Super/Shadow e provas especiais, incluindo todos os encontros pós-Shadow, não são sorteados em nenhum bioma. A restrição também vale para o modo de coleção após o encerramento, que antes permitia todo o catálogo.

Capturas já concluídas sob as regras anteriores são mantidas no elenco e no salvamento. Encontros ativos e capturas pendentes de Pokémon agora exclusivos são descartados ao carregar, impedindo novos recrutamentos pela exploração. As recompensas legítimas dos desafios continuam válidas.
