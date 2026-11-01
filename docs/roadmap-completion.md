# Fechamento do roadmap cadastrado — P2, P3 e duplas

Atualização: **01/11/2026**. Os sete golpes que ainda estavam PARTIAL foram implementados. O catálogo conhecido agora possui **384 golpes FULL, zero PARTIAL e zero dependências conhecidas pendentes**. Isso se refere ao conjunto cadastrado do projeto; não significa que todos os golpes ou habilidades da PokéAPI estejam implementados.

## Publicação anterior

O bloco de críticos P1 foi commitado e publicado como **b14e942d145b7cce57a96e5618ceb264dd54e8fa**, confirmado em `origin/main`. As implementações descritas nesta página são posteriores. Sua publicação foi autorizada pelo usuário em 01/11/2026; o commit de conclusão do roadmap e duplas consta no histórico Git. Sem deploy manual.

## Sete golpes concluídos

| Golpe | Mecânica |
| --- | --- |
| Axe Kick (#853) | Falhar por precisão, Protect, imunidade ou semi-invulnerabilidade causa perda de metade do HP máximo sem aumento Dynamax. Magic Guard evita essa perda; imobilização não a provoca. O dano pode nocautear o usuário. A confusão secundária existente é preservada. |
| Matcha Gotcha (#902) | Cura metade do HP efetivamente removido, com arredondamento/mínimo do motor e limite de HP do usuário. Mantém queimadura, descongelamento e precisão. Em duplas atinge os adversários e drena a partir de cada alvo atingido. |
| Sacred Sword (#533) | Ignora estágios defensivos e de evasão do alvo, tanto positivos quanto negativos. Não ignora reduções da precisão do usuário nem modificadores de habilidade/item/clima. |
| Darkest Lariat (#663) | Mesma regra de ignorar estágios defensivos/evasão, com tipo e metadados próprios. |
| Spectral Thief (#712) | Após acerto e verificação de imunidade, remove os aumentos positivos dos cinco atributos, precisão e evasão do alvo; adiciona ao usuário com limite +6 antes de calcular o dano. Negativos do alvo ficam intactos; Clear Body não impede a remoção direta. Protect, erro e imunidade impedem o roubo. |
| Pollen Puff (#676) | Contra adversário causa dano Bug; contra aliado selecionado em duplas cura metade do HP máximo sem aumento Dynamax. Protect bloqueia; não causa dano/crítico ao aliado nem ultrapassa seu HP máximo. |
| Order Up (#856) | Dano Dragon normal sem Commander. Com Commander ativo, um acerto aumenta Attack (Curly), Defense (Droopy) ou Speed (Stretchy), conforme a forma de Tatsugiri. Não ganha o aumento quando bloqueado por Protect. |

Marshadow (#802) recebeu Spectral Thief como opção adicional; Sinistcha (#1013) recebeu Matcha Gotcha mantendo Magical Leaf. Os demais pilotos já estavam disponíveis. O gerador offline preserva as escolhas anteriores: **543 espécies com extras**, até seis opções por espécie; **1.349 registros aptos** e draft de **450 espécies, 50 por geração** preservados.

## Modo de duplas jogável

Na aba **Batalhar**, com uma equipe montada, usar **“Jogar em duplas · dois Pokémon em campo”**. A tela mostra quatro posições com HP próprio; o jogador escolhe ação e alvo para cada Pokémon e confirma o turno. Há troca voluntária, seleção de substituição para a posição nocauteada, IA adversária e retorno ao fluxo normal de vitória/derrota. A campanha existente continua no formato individual; duplas é uma opção de batalha rápida.

O motor aceita equipes de **2 a 6 Pokémon**, com dois ativos por lado. A interface atual aproveita a equipe de três do jogo: dois ativos e uma reserva. Conjuntos iniciais de duplas priorizam os sete pilotos novos quando o Pokémon pode aprendê-los, usando apenas opções legais do catálogo. Preferências explícitas de golpes continuam prevalecendo quando fornecidas à sessão.

- Quatro ações por turno com prioridade, velocidade e desempate determinístico por lado/posição. Novas mudanças de velocidade entram na ordenação das ações restantes.
- Alvos individuais e golpes em área, incluindo dano ao aliado quando aplicável. Dano em área usa 0,75 quando há múltiplos alvos, rolagens independentes por alvo e um único gasto de PP. Críticos de múltiplos acertos preservam rolagens independentes por acerto.
- Barreiras protegem os dois ativos e usam o modificador de duplas (2/3). Clima, terreno e barreiras perdem duração uma vez por turno; cada ativo recebe seu efeito residual uma vez.
- Protect/Max Guard, status, carregamento/recarga, Sleep Talk, Pursuit contra a posição que troca, trocas forçadas, pivôs e Baton Pass integrados. Pivôs usam a primeira reserva disponível neste ciclo; a seleção manual de reserva para pivô é uma expansão futura.
- Lightning Rod e Storm Drain redirecionam golpes de alvo único; golpes em área mantêm seus alvos. Intimidate afeta ambos os adversários e Cloud Nine/Air Lock consideram o segundo ativo.
- Dynamax/Tera/golpe Z piloto compartilham o limite de uma mecânica por equipe. Aumentos/reduções de atributos dos golpes Max afetam os parceiros/adversários elegíveis. Os estados especiais continuam locais à batalha.
- PP esgotados em duplas recebem Struggle legal, evitando travamento de turno.

## Commander

Tatsugiri com a habilidade natural Commander e Dondozo, ativos do mesmo lado, ativam a combinação. Dondozo recebe +2 nos cinco atributos uma vez; Tatsugiri deixa de agir/gastar PP e não pode ser atingido diretamente. Ambos não podem trocar enquanto vinculados, inclusive por troca forçada. Tatsugiri continua sujeito a efeitos residuais, como veneno. O vínculo é liberado quando um deles cai; a identidade e a forma de Tatsugiri determinam o bônus de Order Up.

Commander não produz esse efeito em batalhas individuais. Não ativa com espécie errada ou habilidade suprimida. A habilidade foi adicionada explicitamente ao conjunto suportado; as demais habilidades ainda fora dos pilotos continuam inativas.

## IA, sessão e interface

A IA considera o roubo de atributos de Spectral Thief, drenagem de Matcha Gotcha e custo esperado da falha de Axe Kick. Em duplas também escolhe alvos e pode curar um aliado com Pollen Puff; não seleciona Tatsugiri oculto por Commander. Não utiliza RNG nem modifica o estado.

A sessão gera rolagens externas, rejeita comandos inválidos sem gastar HP/PP e permite corrigir a escolha. A tela oferece ações/alvos por posição, mostra Commander e mecânicas especiais, mantém HP por posição e processa as mensagens pelo pipeline de apresentação existente. Testes cobrem o botão de entrada, handlers, substituições e carregamento real dos módulos na ordem do HTML.

## Validação

- **55 testes novos** em `tests/battle/remaining-moves.test.js`, `tests/battle/doubles-battle.test.js` e `tests/campaign/doubles-session.test.js`.
- Suíte completa: **2.629 testes aprovados / 38 suítes**, zero falhas, cancelados ou ignorados.
- Auditorias P1/P4/P5/P6/P7/P8/draft e `scripts/audit-roadmap-completion.js` aprovadas; P7 agora tem seus 36 pilotos FULL.
- Catálogo offline reproduzido sem alterações adicionais; diff sem erros de whitespace.
- Verificação da interface automatizada com DOM simulado e execução dos scripts em contexto de navegador. **Sem homologação visual manual**.

## Expansões futuras

O roadmap dos golpes cadastrados está encerrado. Permanecem expansões fora desse conjunto: novos golpes ainda não registrados, mais habilidades/itens (incluindo Focus Energy/Scope Lens/Super Luck/Sniper e proteções específicas de críticos), outros golpes Z, assinaturas Gigantamax, transformações Mega/Primal/Ultra Burst durante o combate e quatro slots persistentes de Sketch.

O novo modo entrega batalhas de dois ativos e as interações descritas acima; não declara equivalência ao regulamento competitivo completo de duplas. Novas habilidades exclusivas de aliados, regras não cadastradas, mais controles de preparação/pivôs, cenários competitivos adicionais e polimento visual podem ser ampliados em ciclos próprios com testes.

## Fontes primárias

- [Showdown moves.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts): Axe Kick, Matcha Gotcha, Sacred Sword, Darkest Lariat, Spectral Thief, Pollen Puff e Order Up.
- [Showdown battle-actions.ts](https://github.com/smogon/pokemon-showdown/blob/master/sim/battle-actions.ts): sequência de roubo de aumentos e cálculo de dano.
- [Showdown abilities.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts), [conditions.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/conditions.ts): Commander, estados vinculados e redirecionamento.
- [PokéAPI move_targets.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/move_targets.csv) e [moves.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/moves.csv): identidades e tipos de alvo. Dados consultados como referência, sem executar callbacks externos.

## Polimento de duplas — 01/11/2026

Implementada escolha manual da reserva nos pivôs, incluindo Baton Pass; comandos antigos e IA mantêm a primeira reserva como padrão. Reservas conflitantes são rejeitadas e reserva indisponível durante a resolução mantém o usuário em campo com mensagem. Interface compacta e responsiva, alvos automáticos indicados, escolhas mantidas e erros na tela. Homologação visual local com turno real (ataque em área e troca) e viewport móvel sem transbordamento horizontal. Esta seção atualiza os limites históricos descritos acima; não amplia o catálogo de golpes ou o regulamento competitivo.
