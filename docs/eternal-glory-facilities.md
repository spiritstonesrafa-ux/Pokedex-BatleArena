# Liga e Torre — Glória Eterna

Disponíveis após derrotar Shadow, tanto no mapa quanto no hub da campanha.

## Liga

- Cinco vitórias consecutivas: Elite das Dunas, Marés, Crepúsculo, Dragões e campeão.
- Seleção de três Pokémon do elenco ou uma das três equipes emprestadas.
- Equipe, golpes, habilidade, item e preparação especial ficam registrados no início da sequência. A ordem é preservada.
- HP, PP e condições são restaurados antes de cada luta. A mecânica especial pode ser usada novamente na luta seguinte.
- Derrota, encerramento da sequência ou saída de uma batalha em andamento encerram a tentativa. Entre lutas, o progresso pode ser retomado após recarregar.
- Completar concede o reconhecimento de Campeão da Glória Eterna e incrementa títulos. Não concede Pokémon nem interfere nas recompensas das provas existentes.

## Torre

- Sequência aberta, com recorde salvo e formação adversária apresentada antes da luta.
- Equilibrada: sem lendários/míticos, força-base até 600 e sem formas Mega/Primal. O mesmo critério vale para os adversários.
- Livre: todos os Pokémon aptos do elenco. Inclui formações adversárias lendárias.
- Oito formações equilibradas e doze livres. Novas entradas mudam o primeiro adversário; a ordem dos integrantes varia a cada volta. As formações são determinísticas, sem ler a escolha de golpe do jogador.
- Registros separados por categoria. A partir de dez vitórias, a tela reconhece Veterano da Torre.
- Mesmas regras de equipe fixa, cura entre lutas e encerramento da Liga.

## Emprestados

Equilíbrio (Garchomp, Scizor, Milotic), Areia (Tyranitar, Excadrill, Togekiss) e Controle (Togekiss, Rotom Wash, Weavile), com itens definidos. São temporários, não alteram o elenco, não podem ser capturados e não mudam preferências de Pokémon que o jogador já possui.

## Persistência e integração

`facilities` é uma extensão do save atual. Saves anteriores recebem registros vazios; a sanitização valida composição, propriedade/empréstimo, golpes e preferências. Recibos por tentativa, categoria, etapa e preparação evitam duplicação ou resultados atrasados. Liga/Torre não usam `pendingReward` nem adicionam espécies ao conjunto de recompensas exclusivas de captura.

Entradas cinematográficas usam a equipe efetivamente preparada, com música via controlador já existente. Arenas seguem o tema de cada adversário. A tela de resultado retorna à instalação correspondente.

## Escopo das habilidades

Este recurso não adiciona habilidades. O fechamento anterior do roadmap era dos golpes cadastrados, não de todas as habilidades da franquia. O catálogo pode indicar uma habilidade natural com efeito pendente; ela não fornece o bônus até ser implementada e testada. As equipes emprestadas e inimigas usam as habilidades naturais já cadastradas sem atribuir bônus inexistentes.

## Validação

- Suíte completa: 2.891 testes, 39 suítes, zero falhas.
- Progressão das cinco etapas, recordes da Torre, categorias, recompensas antigas, saves anteriores, times emprestados, preparação fixada, saída da batalha e recibos atrasados/duplicados.
- Preparação com sessão/hidratador reais, vitória do motor avançando a Liga, recursos restaurados na etapa seguinte, arenas e aberturas, botões de seleção/continuação e nós no mapa.
- Triagem de equilíbrio com IA SMART e 40 sementes por equipe, sem ativação de transformações: Equilíbrio 26/40 sequências completas, Areia 24/40, Controle 17/40. Não são probabilidades para jogadores ou prova de estratégia ótima.
- Telas verificadas por testes de DOM simulado; não houve homologação visual manual em navegador nesta etapa.
