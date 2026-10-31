# P6 — Proteção, carga/recarga e efeitos persistentes

Atualizado em 31/10/2026. **P6 em andamento.** O primeiro ciclo entregue é a família de recarga obrigatória. Proteção, carga genérica, aprisionamento e trocas especiais ainda não foram implementados neste ciclo.

## Recarga obrigatória — implementada

Dez golpes com metadados oficiais: Hyper Beam, Blast Burn, Hydro Cannon, Frenzy Plant, Giga Impact, Rock Wrecker, Roar of Time, Prismatic Laser, Meteor Assault e Eternabeam.

- Acerto que causa dano agenda um turno de descanso, inclusive quando nocauteia o alvo e a batalha aguarda sua substituição. Erro e imunidade não agendam descanso. A aura sombria continua sendo a exceção elemental já existente do jogo.
- A recarga bloqueia movimento e troca voluntária; o motor transforma a tentativa de ação em descanso, mesmo com PP esgotado. Não há gasto adicional de PP. Sono, congelamento, paralisia e confusão não são processados durante o descanso.
- Nocaute e saída real de campo limpam o estado. Estado e comandos recebidos permanecem imutáveis. Nenhum sorteio foi adicionado ao motor.
- Sleep Talk pode chamar esses golpes: somente Sleep Talk gasta PP e o descanso é obrigatório no turno seguinte.
- A IA descansa quando necessário e considera o custo do turno parado na pontuação, preservando a previsão de dano imediato e nocaute. O avaliador não promete dano, condição ou nocaute durante a recarga. Sucker Punch falha contra essa ação.
- A interface apresenta **Recarregar energia**, utilizável mesmo com zero PP, e desabilita a troca. Mensagens explicam a preparação e o descanso sem anunciar um novo ataque.

## Opções na campanha

| Pokémon | Golpe novo |
| --- | --- |
| Venusaur | Frenzy Plant |
| Charizard Mega X | Blast Burn |
| Blastoise | Hydro Cannon |
| Tauros | Giga Impact |
| Dragonite | Hyper Beam |
| Rhyperior | Rock Wrecker |
| Dialga | Roar of Time |
| Necrozma | Prismatic Laser |
| Sirfetch’d | Meteor Assault |
| Eternatus | Eternabeam |

Learnsets conferidos contra Pokémon Showdown; Mega X usa o learnset herdado de Charizard, como forma estática já existente. Isso não implementa transformação durante a batalha.

Os quatro golpes fixos anteriores foram preservados. O limite permanece em seis opções por espécie. Para acomodar pilotos novos, foram substituídos seis extras: Strength de Venusaur, Blizzard de Blastoise, Surf de Tauros, Dragon Pulse de Dragonite, Mega Kick de Rhyperior e Brutal Swing de Sirfetch’d. Preferências antigas que usem opções removidas podem retornar ao padrão pela validação existente; nenhum save foi regravado diretamente. Swords Dance/Overheat de Charizard e Scald de Blastoise foram preservados.

Catálogo offline: **488 espécies com extras, 90 definições curadas, 1.347 registros aptos a batalhar**. Os 450 selecionáveis iniciais permanecem preservados.

## Próximos ciclos

1. Proteção: Protect/Detect, tentativas consecutivas, bloqueio de dano/efeitos e exceções de golpes que atravessam proteção.
2. Carga em dois turnos e estados de semi-invulnerabilidade, com PP, impedimentos e interações de alvo apropriados. Clima/itens permanecem dependências da P7.
3. Aprisionamento, dano persistente, Leech Seed, armadilhas de entrada e remoção.
4. Trocas especiais e interceptação, incluindo U-turn/Pursuit, com escolha de substituto e continuidade correta do turno.
5. Barreiras, golpes bloqueados por uso consecutivo e demais pilotos P6, com auditoria de dependências antes de declarar a fase concluída.

Bide, Beak Blast e Shell Trap já foram entregues no fechamento P5; isso não substitui as famílias genéricas restantes da P6. P1/P2/P3 ainda têm exceções pendentes; P7/P8 permanecem futuras.

## Validação

- **42 testes novos** em tests/battle/p6-recharge.test.js: dez metadados e execuções, erros, imunidades, PP final, entrada/comandos imutáveis, recarga após nocaute/substituição, bloqueio de troca, estados principais/voláteis, IA, prioridades, previsões, Sucker Punch, Sleep Talk, sessão real dos dois lados, opções da campanha, botão e mensagens.
- Suíte completa: **1.837 testes aprovados, 38 suítes, zero falhas, cancelados ou ignorados; saída 0**.
- Auditoria P5 preservada: 60 pilotos, 57 FULL, 3 PARTIAL somente por dependências externas, zero pendências P5.
- Auditoria P4: 325 conhecidos, 267 FULL, 58 PARTIAL, zero pendências P4.
- Draft da campanha: 450 selecionáveis válidos, 50 por geração. Regeneração offline reprodutível e git diff --check conferidos.
- Publicação deste ciclo de recarga autorizada em 31/10/2026; o commit correspondente é identificado no histórico Git. A P5 foi publicada anteriormente em 4f38809125e84b7f88a692af208850e7a844cfbb.

## Referências

- [PokéAPI — moves.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/moves.csv): IDs, tipo, poder, precisão, PP e categoria.
- [Pokémon Showdown — moves.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts): família recharge e efeito mustrecharge.
- [Pokémon Showdown — conditions.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/conditions.ts): descanso antes dos impedimentos, ação bloqueada e remoção do estado.
- [Pokémon Showdown — learnsets.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/learnsets.ts): espécies e movimentos.
