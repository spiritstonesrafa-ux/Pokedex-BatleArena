# P4 — Condições e efeitos secundários: conclusão

Atualização: 31/10/2026. Escopo: motor atual de batalhas individuais, conjuntos fixos e opções de golpes da campanha. O encerramento desta fase não implica suporte integral a todos os movimentos das nove gerações, batalhas duplas ou às mecânicas das outras fases.

## Entregas concluídas

- Condições principais: veneno comum, Toxic progressivo, queimadura, paralisia, sono e congelamento, com imunidades, exclusividade e ciclo de vida.
- Condições voláteis: confusão, hesitação e sonolência de Yawn; aplicação antes/depois da ação, duração, trocas e substituições.
- Efeitos secundários sobre o alvo e sobre o usuário: condições, reduções/aumentos de atributos e limites. Precisão/evasão usam estágios separados dos cinco atributos básicos, limite -6..+6, fator de três e reset nas trocas.
- Efeitos compostos: Tri Attack escolhe uma entre três condições sem sortear novamente em caso de imunidade. As três presas elementais usam rolagens independentes para condição e flinch.
- Família de sono: Rest recupera HP e troca a condição principal por duas ações subsequentes de sono; Sleep Talk chama outro movimento sem consumir seu PP e sem repetir verificações de impedimento; Snore funciona dormindo; Dream Eater depende do sono do alvo; Yawn aplica sono ao fim do turno seguinte, salvo troca/inelegibilidade.
- Sleep Talk sorteia somente outros movimentos com suporte FULL no loadout atual. Golpes ainda parciais ou bloqueados não são chamados; isso evita prometer mecânicas de fases futuras. Movimentos chamados podem estar sem PP; apenas Sleep Talk consome PP.
- Exceções: Fake Out e sua janela de entrada, descongelamento do usuário/alvo no momento correto, Clear Smog limpando estágios, Alluring Voice condicionada a aumento de atributos no turno e Sparkly Swirl curando condições principais da equipe.
- Interface, eventos de HP/cura, mensagens, previsões e IA atualizados. Rolagens de escolha de condição, duração e movimento chamado ficam fora do motor puro.

## Disponibilidade para testar

| Espécie | Opções curadas |
| --- | --- |
| Hariyama (#297) | Fake Out |
| Muk (#89) | Toxic |
| Snorlax (#143) | Rest e Sleep Talk |
| Slowbro (#80) | Yawn e Snore |
| Hypno (#97) | Hypnosis e Dream Eater |
| Lapras (#131) | Confuse Ray |
| Golduck (#55) | Water Pulse |

As famílias expandidas de dano usam também os conjuntos fixos já existentes, incluindo Tri Attack. Os pools continuam limitados a seis opções; saves e golpes equipados não foram regravados. O gerador continua offline.

## Validação e auditoria

- Suíte completa: **1.341 testes aprovados, 36 suítes, zero falhas, cancelamentos ou testes ignorados; saída 0**.
- Suíte de fechamento: **195 testes**, incluindo cada uma das 94 definições expandidas, fronteiras de chance, efeitos compostos, precisão/evasão e famílias de sono; integração real da sessão em ambos os lados e durante trocas.
- Mais 13 testes específicos de Fake Out. Testes anteriores de condições e regressão preservados.
- node scripts/audit-p4.js: 259 golpes conhecidos, 200 FULL, 59 PARTIAL com dependências específicas; nenhuma pendência genérica de P4 nesse catálogo.
- Os 193 golpes distintos dos conjuntos fixos da campanha também foram conferidos: nenhuma pendência de P4.
- git diff --check: aprovado. Sem commit, push ou deploy deste fechamento.

## Dependências que permanecem fora da P4

Mecânicas ainda ausentes continuam explicitamente PARTIAL. Não foram promovidas apenas porque seu efeito secundário passou a funcionar. Exemplos: críticos especiais (P1), drenagem de Matcha Gotcha (P2), ignorar/roubar estágios (P3), dano variável (P5), recarga/carga/proteção/armadilhas (P6), clima/terrenos/habilidades/itens (P7), formas e mudanças de tipo (P8). O caso de cura de aliado em Pollen Puff depende de batalhas duplas, fora do escopo do motor atual.

| ID | Golpe | Pendência específica |
| --- | --- | --- |
| 2 | karate-chop | HIGH_CRITICAL_PHASE_P1 |
| 23 | stomp | MINIMIZE_INTERACTION_PHASE_P6 |
| 34 | body-slam | MINIMIZE_INTERACTION_PHASE_P6 |
| 59 | blizzard | WEATHER_ACCURACY_PHASE_P7 |
| 63 | hyper-beam | RECHARGE_PHASE_P6 |
| 76 | solar-beam | CHARGE_PHASE_P6 |
| 87 | thunder | WEATHER_ACCURACY_PHASE_P7 |
| 152 | crabhammer | HIGH_CRITICAL_PHASE_P1 |
| 163 | slash | HIGH_CRITICAL_PHASE_P1 |
| 168 | thief | ITEM_STEAL_PHASE_P7 |
| 228 | pursuit | SWITCH_INTERCEPTION_PHASE_P6 |
| 229 | rapid-spin | HAZARD_CLEAR_PHASE_P6 |
| 238 | cross-chop | HIGH_CRITICAL_PHASE_P1 |
| 282 | knock-off | ITEM_REMOVAL_PHASE_P7 |
| 290 | secret-power | FIELD_EFFECT_PHASE_P7 |
| 299 | blaze-kick | HIGH_CRITICAL_PHASE_P1 |
| 314 | air-cutter | HIGH_CRITICAL_PHASE_P1 |
| 327 | sky-uppercut | SEMI_INVULNERABLE_TARGET_PHASE_P6 |
| 340 | bounce | CHARGE_PHASE_P6 |
| 369 | u-turn | SELF_SWITCH_PHASE_P6 |
| 400 | night-slash | HIGH_CRITICAL_PHASE_P1 |
| 407 | dragon-rush | MINIMIZE_INTERACTION_PHASE_P6 |
| 421 | shadow-claw | HIGH_CRITICAL_PHASE_P1 |
| 444 | stone-edge | HIGH_CRITICAL_PHASE_P1 |
| 450 | bug-bite | BERRY_CONSUMPTION_PHASE_P7 |
| 460 | spacial-rend | HIGH_CRITICAL_PHASE_P1 |
| 496 | round | CONDITIONAL_DAMAGE_PHASE_P5 |
| 510 | incinerate | ITEM_REMOVAL_PHASE_P7 |
| 529 | drill-run | HIGH_CRITICAL_PHASE_P1 |
| 533 | sacred-sword | IGNORE_TARGET_STAGES_PHASE_P3 |
| 542 | hurricane | WEATHER_ACCURACY_PHASE_P7 |
| 611 | infestation | BINDING_PHASE_P6 |
| 662 | spirit-shackle | TRAPPING_PHASE_P6 |
| 663 | darkest-lariat | IGNORE_TARGET_STAGES_PHASE_P3 |
| 676 | pollen-puff | ALLY_TARGET_HEALING_DOUBLES_OUT_OF_SCOPE |
| 677 | anchor-shot | TRAPPING_PHASE_P5 |
| 687 | core-enforcer | ABILITY_SUPPRESSION_PHASE_P7 |
| 706 | psychic-fangs | BARRIER_REMOVAL_PHASE_P6 |
| 712 | spectral-thief | STEAL_BOOSTS_PHASE_P3 |
| 714 | moongeist-beam | IGNORE_ABILITY_PHASE_P7 |
| 722 | photon-geyser | DYNAMIC_DAMAGE_CATEGORY_PHASE_P5 |
| 738 | sappy-seed | LEECH_SEED_PHASE_P6 |
| 744 | dynamax-cannon | DYNAMAX_TARGET_PHASE_P8 |
| 783 | aura-wheel | FORM_TYPE_PHASE_P8 |
| 803 | grassy-glide | TERRAIN_PRIORITY_PHASE_P7 |
| 831 | springtide-storm | WEATHER_ACCURACY_PHASE_P7 |
| 833 | raging-fury | LOCKED_MOVE_PHASE_P6 |
| 853 | axe-kick | CRASH_DAMAGE_PHASE_P2 |
| 855 | lumina-crash | STAT_DROP_PHASE_P5 |
| 856 | order-up | COMMANDER_ABILITY_PHASE_P7 |
| 861 | ice-spinner | TERRAIN_CLEAR_PHASE_P7 |
| 873 | raging-bull | FORM_TYPE_AND_BARRIER_PHASE_P8 |
| 875 | psyblade | TERRAIN_DAMAGE_PHASE_P7 |
| 887 | hyper-drill | PROTECT_BYPASS_PHASE_P6 |
| 892 | double-shock | TYPE_LOSS_PHASE_P8 |
| 893 | gigaton-hammer | CONSECUTIVE_USE_PHASE_P6 |
| 901 | blood-moon | CONSECUTIVE_USE_PHASE_P6 |
| 902 | matcha-gotcha | HP_DRAIN_PHASE_P2 |
| 906 | tera-starstorm | TERASTALLIZATION_PHASE_P8 |

## Referências e manutenção

Regras e dados verificados contra [Pokémon Showdown — moves](https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts), [conditions](https://github.com/smogon/pokemon-showdown/blob/master/data/conditions.ts), [learnsets](https://github.com/smogon/pokemon-showdown/blob/master/data/learnsets.ts) e a fixture canônica PokéAPI existente em tests/fixtures/pokeapi-move-reference.json. Snapshot da consulta: 31/10/2026.

O catálogo local p4-secondary-catalog.js é imutável e contém metadados explícitos, sem executar código baixado. Ao acrescentar um golpe, conferir suas exceções e dependências, criar teste comportamental e executar a auditoria; não presumir suporte por nome ou poder positivo.
