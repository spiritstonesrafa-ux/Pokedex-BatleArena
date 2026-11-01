# P6 — Conclusão no motor atual de batalhas individuais

Atualização: 31/10/2026. **P6 concluída no escopo dos pilotos e das famílias previstas para o motor atual.** Não equivale a suportar todos os golpes da PokéAPI, habilidades, itens, clima, terrenos, transformações ou batalhas duplas.

A auditoria `node scripts/audit-p6.js` cobre **70 pilotos: 61 FULL, 8 PARTIAL exclusivamente por dependências de outras fases e 1 BLOCKED por clima da P7**. Nenhuma definição canônica mantém pendência essencial `PHASE_P6`.

## Entregas

| Família | Implementação |
| --- | --- |
| Recarga | Hyper Beam, Blast Burn, Hydro Cannon, Frenzy Plant, Giga Impact, Rock Wrecker, Roar of Time, Prismatic Laser, Meteor Assault e Eternabeam. Descanso após dano bem-sucedido, PP único, inclusive após KO/substituição. |
| Proteção | Protect/Detect, prioridade +4, contador compartilhado, chance moderna, bloqueio de dano/efeitos e exceção de Hyper Drill. Bide e Sleep Talk corrigidos; estados sempre limpos na criação. |
| Carga e semi-invulnerabilidade | Solar Beam, Fly, Dig, Dive, Bounce, Razor Wind, Skull Bash e Sky Attack. Continuação obrigatória com zero PP, impedimentos, limpeza de estados e defesa aumentada no preparo de Skull Bash. Críticos especiais e itens continuam explicitamente fora desta fase. |
| Alcance e bônus | Fissure não atinge Dig; Gust/Twister, Earthquake e Surf aplicam suas exceções de alcance e multiplicam dano, preservando poder canônico. Sky Uppercut atinge alvos aéreos. Precisão infalível e atravessar Protect não anulam semi-invulnerabilidade. Toxic de usuário Poison mantém sua exceção anterior. |
| Aprisionamento parcial | Bind, Wrap, Fire Spin, Clamp, Whirlpool, Sand Tomb e Infestation. Duração externa de quatro/cinco turnos, dano residual de 1/8, impedimento de troca e encerramento quando o usuário sai/desmaia. Ghost pode sair. |
| Aprisionamento sem residual | Mean Look, Spider Web, Block, Spirit Shackle e Anchor Shot. Vínculo ao usuário e limpeza nas saídas; Ghost não fica impedido de sair. |
| Sementes | Leech Seed e Sappy Seed. Imunidade de Grass à semente, drenagem de 1/8, cura do ocupante do lado do usuário e limpeza quando o alvo sai. |
| Armadilhas de entrada | Spikes até três camadas, Toxic Spikes até duas, Stealth Rock e Sticky Web. Aterramento por tipo no modelo sem habilidades/itens, absorção por Poison, resistência/imunidade e detecção de KO na entrada. |
| Remoção | Rapid Spin limpa as próprias armadilhas, aprisionamento parcial e semente após dano efetivo; mantém seu aumento de Speed. Defog limpa armadilhas de ambos os lados e barreiras do alvo, respeitando a dependência de terrenos da P7. |
| Barreiras | Reflect, Light Screen, Safeguard e Mist, duração de cinco turnos. Redução por categoria, sem reduzir dano fixo e sem anular críticos garantidos. Brick Break, Psychic Fangs e Raging Bull removem telas. Componente de Aurora Veil implementado e testado, sem empilhar com telas; golpe continua bloqueado até existir clima da P7. |
| Pivôs | U-turn, Volt Switch, Flip Turn, Parting Shot, Teleport e Baton Pass. Escolha de substituto vivo, manutenção da ação adversária ainda não executada, um único fechamento de turno e tratamento de hazards/KO durante a entrada. |
| Baton Pass | Transfere estágios, precisão/evasão, Minimize e condições voláteis transferíveis já modeladas (semente, confusão e sonolência), antes dos efeitos de entrada. Condição principal e estados não transferíveis não são copiados. |
| Interceptação | Pursuit intercepta troca voluntária e pivô elegível antes da saída, sem repetir sua ação; poder aumentado e precisão própria da interceptação. Baton Pass conserva sua exceção. Flag interna de interceptação não é aceita de comandos externos. |
| Sequências obrigatórias | Thrash, Petal Dance, Outrage e Raging Fury. Duração externa de dois/três turnos, PP único, continuação e confusão ao terminar; sono e interrupções tratadas. |
| Restrições e preparo | Gigaton Hammer/Blood Moon não podem ser escolhidos consecutivamente; Focus Punch perde a concentração por dano direto; Minimize aumenta evasão e ativa exceções de Stomp, Body Slam, Dragon Rush, Heavy Slam, Heat Crash e Flying Press. |

## Correções confirmadas e contratos

- Earthquake causava 46 normalmente e 90 contra Dig porque o poder era dobrado. Agora causa 92 no mesmo cenário: bônus no dano, sem alterar poder. Regressões equivalentes para Gust/Twister/Surf.
- A previsão considera a ordem de ação e o desempate do jogador: um atacante mais lento pode acertar depois que o alvo pousa/sai do estado temporário. Nenhuma consulta a rolagens futuras.
- Armazenamento de Bide não é bloqueado por Protect; liberação bloqueada encerra a sequência. Sleep Talk preserva/resetta o contador de Protect conforme o golpe realmente chamado.
- Preparação, proteção, falha, ataque e dano têm mensagens distintas; impactos não são apresentados quando o alvo está protegido/inalcançável. Estado visual de semi-invulnerabilidade é derivado do estado atual e limpo ao sair, cancelar ou terminar.
- IA reconhece controles, sequências, ações obrigatórias e trocas impedidas. Interface mostra campo, continuação, descanso e escolhas obrigatórias de substituto, sem rótulos de poder nulo.
- Efeitos residuais: semente antes de veneno/queimadura e aprisionamento depois; barreiras expiram após as verificações de fim de turno. Dano residual não alimenta Counter/Bide. Dano de armadilha de entrada pode alimentar Assurance.
- Fonte externa prepara duração de aprisionamento/sequência e confusão, inclusive em caminhos de movimentos chamados. Motor e IA não usam RNG interno.
- Estados iniciais ignoram proteção, contador, carga, aprisionamento e demais estados temporários presentes nos dados brutos. Entradas não são modificadas.
- Turnos suspensos por pivô guardam cópias próprias dos comandos; cópias preservam NaN para que dados inválidos continuem sendo rejeitados, sem transformá-los silenciosamente em uma rolagem padrão. Encerramento remove intenções e substituições pendentes.

### Ausência de ação legal por restrição

Conjuntos contendo apenas Gigaton Hammer/Blood Moon poderiam ficar sem ação legal durante aprisionamento ou após esgotar PP. Há um fallback obrigatório de Struggle para esses conjuntos: sem PP, sem STAB ou imunidade elemental, com recuo de um quarto do HP máximo (arredondamento próprio). Não é um golpe equipável nem uma declaração de conclusão de toda a P2; o comportamento geral anterior dos demais conjuntos sem PP permanece fora deste fechamento.

## Disponibilidade e preservação da campanha

- **1.347 registros aptos**, quatro espécies ainda de coleção: Ditto, Smeargle, Cosmog e Cosmoem. Saves não foram regravados.
- **524 espécies com extras e 147 definições curadas** no gerador offline; máximo de seis opções por espécie. Todos os pilotos utilizáveis auditados estão em pelo menos um pool.
- Quatro golpes fixos anteriores preservados. Draft continua com **450 selecionáveis**, 50 por geração, sem duplicatas/lendários/míticos.
- No fechamento, novos pilotos ocuparam espaços livres sempre que possível. Exceção necessária: Dhelmise (#781), único usuário canônico de Anchor Shot, recebeu Anchor Shot no lugar do extra Surf; Body Press e os quatro golpes fixos foram mantidos. Preferências antigas com o extra removido seguem o retorno ao padrão da validação existente.
- Trocas de extras dos ciclos anteriores continuam históricas: Swift de Pidgeot/Umbreon, Hyper Voice de Wailord, Strength de Exeggutor e Mega Kick de Blaziken, além das substituições do ciclo de recarga. Não houve migração forçada de preferências.

Exemplos de novos espaços livres usados:

| Pokémon | Pilotos |
| --- | --- |
| Charmeleon / Pidgey / Pidgeotto | Fire Spin / Razor Wind / Reflect |
| Clefairy / Vulpix / Jigglypuff | Teleport / Safeguard / Light Screen |
| Zubat / Golbat / Oddish | Mean Look / Defog / Leech Seed |
| Venonat / Venomoth / Omanyte | Baton Pass / Toxic Spikes / Spikes |
| Graveler / Surskit / Litten | Stealth Rock / Sticky Web / Parting Shot |
| Magneton / Seel / Mankey | Volt Switch / Flip Turn / Outrage |
| Dhelmise | Anchor Shot |

Learnsets verificados contra os dados primários do Pokémon Showdown. Gerador e snapshot continuam offline e reproduzíveis. Não foi executada regeneração integral em rede do catálogo expandido.

## Dependências externas preservadas

| Piloto | Situação restante |
| --- | --- |
| Razor Wind / Sky Attack | Taxa especial de críticos (P1) e interação com item de carga (P7). |
| Skull Bash | Item de carga (P7). |
| Solar Beam | Clima e item de carga (P7). |
| Defog | Remoção de terreno (P7). |
| Heavy Slam / Heat Crash | Alvo Dynamax (P8); interação com Minimize já entregue. |
| Raging Bull | Tipagem por forma (P8); remoção de barreiras entregue. |
| Aurora Veil | BLOCKED por clima (P7). Componente de barreira testado, sem ativação disponível no jogo atual. |

Chilly Reception continua bloqueado por clima da P7; a infraestrutura de pivôs da P6 foi entregue. Levitate, Magic Guard, Unseen Fist, Shed Shell, Heavy-Duty Boots, Grip Claw, Binding Band, Light Clay e Power Herb dependem de habilidades/itens da P7. Não foram simulados implicitamente. Batalhas duplas continuam fora do motor atual.

## Validação final

- **233 testes novos** em `tests/battle/p6-completion.test.js`, além dos testes de recarga (42), proteção (44) e dois turnos (25).
- Suíte completa: **2.139 testes aprovados, 38 suítes, zero falhas/cancelados/ignorados; saída 0**.
- Sessões reais nos dois lados para as 52 definições utilizáveis do módulo final; regressões de alcance, multiplicadores, PP, escolhas suspensas, hazards/KO, residual, UI, IA, novos estados, entrada/comandos imutáveis e fallback legal.
- `audit-p6.js`: 70 pilotos, 61 FULL, 8 PARTIAL externos, 1 BLOCKED por P7, zero pendências P6.
- `audit-p5.js`: 60 pilotos, 57 FULL, 3 PARTIAL externos, zero pendências P5; Anchor Shot já não é contado como dependência futura da P6.
- `audit-p4.js`: 364 conhecidos, 318 FULL, 45 PARTIAL, zero pendências P4. Aurora Veil é um conhecido bloqueado.
- `audit-campaign-draft.js`: 450 selecionáveis íntegros.
- Regeneração offline idêntica e `git diff --check` aprovados.
- Publicação do fechamento P6 autorizada em 31/10/2026; o commit correspondente consta no histórico Git. Sem deploy manual. Commit de proteção observado no início: `fb10f47`; alterações locais de carga do Antigravity foram preservadas e corrigidas.

## Próximo bloco

**P7: habilidades, itens, clima e terrenos**, com planejamento de dependências antes de liberar os pilotos correspondentes. As pendências específicas de P1/P2/P3/P8 continuam registradas; terminar P6 não encerra essas fases.

## Fontes

- [PokéAPI moves.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/moves.csv): metadados oficiais.
- [Pokémon Showdown moves.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts): regras e exceções dos pilotos.
- [Pokémon Showdown conditions.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/conditions.ts): duração, efeitos persistentes e sequências.
- [Pokémon Showdown learnsets.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/learnsets.ts): disponibilidade canônica.
- [Pokémon Showdown battle-actions.ts](https://github.com/smogon/pokemon-showdown/blob/master/sim/battle-actions.ts): PP, ações bloqueadas e ordem de execução.
