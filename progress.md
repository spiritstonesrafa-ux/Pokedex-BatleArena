# 📋 Registro de Progresso Contínuo — Pokédex Pro + Battle Arena

Arquivo de governança técnica para alinhamento e continuidade entre diferentes sessões e agentes de IA.

## Atualização — 31/10/2026: P6 em andamento — Protect (#182) e Detect (#197) — Revisão e Correções Canônicas

- Implementados Protect (#182, Normal/Status, PP 10) e Detect (#197, Fighting/Status, PP 5), ambos com precisão null, prioridade +4, alvo 'self', volatile 'protect' e suporte FULL.
- Barreira protetora ativa (`isProtected = true`) bloqueia golpes físicos/especiais, dano fixo constante (Sonic Boom, Dragon Rage), dano baseado em nível (Seismic Toss, Night Shade), dano fracionário (Super Fang, Nature's Madness, Ruination), múltiplos acertos (0 acertos e 0 dano) e golpes de status/stat-drops (Thunder Wave, Toxic, Will-O-Wisp, Confuse Ray, Screech, Venom Drench).
- Ataques bloqueados consomem PP (`PP_CHANGED`), não causam dano/reculo/drenagem, bypassam precisão, marcam `lastMoveFailed = true`, emitem `MOVE_FAILED` (`BLOCKED_BY_PROTECT`) e não ativam recarga em Hyper Beam / Giga Impact. Golpes que miram em si mesmos (Swords Dance, Rest, Calm Mind, Sleep Talk, Protect) bypassam a proteção do defensor. Dano residual de Burn/Poison continua pontuando no final do turno. Surging Strikes (#818) é bloqueado (Unseen Fist é P7).
- Fórmula canônica Gen 6+ de uso consecutivo: chance $1/\min(729, 3^n)$, onde $n = \text{stallCount}$. Protect e Detect compartilham o mesmo contador. Contador reinicia para 0 ao usar outro golpe, falhar na proteção, sofrer imobilização (sono, congelamento, hesitação, confusão, paralisia), turno de recarga obrigatória, troca voluntária ou nocaute/substituição.
- Correção 1 — Bide e Proteção: o adversário estar protegido não impede o armazenamento nos turnos 1 e 2 (`turnsLeft: 2` e `turnsLeft: 1`). No turno 3, a liberação de Bide é interceptada por Protect/Detect (`reason: 'BLOCKED_BY_PROTECT'`, dano 0). Em ambos os casos (acerto ou bloqueio), `attacker.bideState` é finalizado (`null`) impedindo repetição indevida. Prioridade (+1), consumo único de PP no turno 1 e acúmulo de dano em `afterDirectHit` permanecem intactos.
- Correção 2 — Sleep Talk chamando Protect/Detect: Sleep Talk não reseta prematuramente `stallCount` antes da seleção do golpe chamado. Ao chamar Protect/Detect, utiliza o `stallCount` pré-existente e calcula a rolagem com o mesmo denominador $\min(729, 3^n)$ tanto no motor quanto na sessão determinística (`BattleSessionController`). Chamar golpe não-protetor, falhar na proteção ou falhar no Sleep Talk reseta `stallCount = 0`. Consumo de PP restrito a Sleep Talk; Bide (#117), Beak Blast (#690) e Shell Trap (#704) continuam excluídos.
- Correção 3 — Hyper Drill (#887) Bypass de Proteção: Hyper Drill perfura Protect/Detect sem remover ou quebrar a proteção do defensor. Preserva a imunidade canônica de tipo (Normal vs Fantasma causa dano 0, emite `IMMUNE`), precisão, PP e dano. Regra centralizada via `isProtectBypassingMove` em motor, avaliador (`BattleEvaluator`), IA (`BattleAI`) e apresentação. Hyper Drill promovido a suporte FULL (`knownPending: []`) no catálogo secundário P4.
- Correção 4 — Integridade de Inicialização e Imutabilidade de Combatentes: `createCombatant` inicializa estritamente `isProtected: false` e `stallCount: 0`, eliminando a herança indevida de proteção ativa ou contadores de stall a partir de dados brutos de entrada. `createBattle` e `createTeamBattle` inicializam todos os membros (ativos e reservas) sem proteção ativa e sem penalidade, garantindo que o primeiro Protect/Detect em batalha nova tenha 100% de chance (denominador 1) e preservando a imutabilidade dos objetos de entrada. Fixtures de testes configuram o estado diretamente nos combatentes instanciados da batalha.
- RNG determinístico externo com `BattleRandomSource.rollProtect` e `DeterministicRandomSource.setProtectSequence`. `BattleSessionController` injeta `protectRoll` nas ações de jogador e oponente (inclusive em troca de jogador e via Sleep Talk).
- `BattleEvaluator` e `BattleAI` integram mitigação de dano sem RNG interno, com penalização severa para uso consecutivo e pontuação 0 contra oponentes nocauteados ou recarregando. Previsões de dano ofensivo contra defensor protegido consideram bypass de Hyper Drill.
- Apresentação e VFX: `SUPPORT_MOVE_LABELS` exibe `STATUS · PROTEÇÃO`, apresentação marca `isBlocked: true`, e reações de impacto visual / abalos de câmera são suprimidos.
- Campanha: Umbreon (#197; Protect no lugar de swift), Blaziken (#257; Detect no lugar de mega-kick) e Hitmonchan (#107; Detect) curados. 489 espécies com extras (+1), 92 definições (+2), 1.347 combatentes aptos, 4 golpes fixos preservados e 450 draft species intactas.
- Validação: 44 testes determinísticos em `tests/battle/p6-protect.test.js`; suíte completa **1.881 testes aprovados, 38 suítes, zero falhas/cancelados/ignorados; saída 0**. Auditoria P4: 327 conhecidos, 270 FULL (+1), 57 PARTIAL (-1), zero pendências P4. Auditoria P5: 60 pilotos, 57 FULL, 3 PARTIAL com dependências externas. Auditoria draft aprovada; regeneração offline idêntica e `git diff --check` aprovados.
- **P6 permanece em andamento**: carga genérica/semi-invulnerabilidade, aprisionamento/persistência, armadilhas, barreiras e trocas especiais continuam pendentes. Nenhum commit, push ou deploy realizado.

---

## Atualização — 31/10/2026: P6 iniciada — recarga obrigatória

- P5 publicada em origin/main: 4f38809125e84b7f88a692af208850e7a844cfbb. Os registros abaixo sobre fechamento local são históricos e foram corrigidos no relatório P5.
- Implementados dez golpes de recarga: Hyper Beam, Blast Burn, Hydro Cannon, Frenzy Plant, Giga Impact, Rock Wrecker, Roar of Time, Prismatic Laser, Meteor Assault e Eternabeam. Um turno de descanso após dano bem-sucedido, inclusive após KO; erro/imunidade não agendam recarga. Sem gasto adicional de PP, bloqueio de troca voluntária, precedência sobre impedimentos e limpeza ao sair/desmaiar.
- IA, avaliador, Sucker Punch, Sleep Talk, sessão real e interface integrados. Botão Recarregar energia funciona com PP zero e indica descanso obrigatório. Sem RNG interno ou mutação de comandos/estado de entrada.
- Todos os dez pilotos disponíveis nos extras da campanha; quatro golpes fixos e 450 selecionáveis iniciais preservados. Catálogo offline: 488 espécies com extras / 90 definições. Seis extras substituídos e possível retorno ao padrão de preferências antigas documentados em docs/roadmap-p6.md. Swords Dance/Overheat de Charizard e Scald de Blastoise preservados; Blast Burn disponível no Mega X estático já existente.
- Validação: 42 testes novos; suíte completa **1.837 aprovados, 38 suítes, zero falhas/cancelados/ignorados, saída 0**. Auditorias P4/P5/draft aprovadas; regeneração offline idêntica e git diff --check aprovados.
- **P6 permanece em andamento**: proteção, carga genérica/semi-invulnerabilidade, aprisionamento/persistência, armadilhas, barreiras e trocas especiais continuam pendentes. Próximo ciclo: Protect/Detect. Relatório em docs/roadmap-p6.md. Publicação deste ciclo autorizada em 31/10/2026; consultar o histórico Git para o hash do commit. Nenhum deploy manual solicitado.

---

## Atualização — 31/10/2026: P5 concluída no motor de batalhas individuais

- Fechadas as famílias de P5: dano por HP/peso/velocidade, Endeavor, Psywave, OHKO, histórico/Counter/Mirror Coat/Metal Burst/Comeuppance, Bide, Beak Blast/Shell Trap, golpes condicionais, tipos/categoria dinâmicos, quedas de atributos e múltiplos acertos avançados. Relatório e limites completos em docs/roadmap-p5.md; os registros anteriores abaixo são históricos.
- Auditoria reproduzível node scripts/audit-p5.js: 60 pilotos disponíveis na campanha, 57 FULL e 3 PARTIAL apenas por dependências P6/P7/P8, zero pendências essenciais de P5. Sete rótulos antigos de P5 foram alinhados a itens/clima/aprisionamento/transformações nas fases correspondentes, mantendo os golpes BLOCKED/PARTIAL; a matriz está no relatório. Não significa suporte a todos os golpes da PokéAPI.
- Casos especiais concluídos: Bide armazena por dois turnos e libera o dobro, com continuação a zero PP; Beak Blast queima por contato antes dos acertos seguintes; Shell Trap depende de dano físico; Hidden Power deriva o tipo dos IVs (31 padrão); Revelation Dance usa o tipo primário; Surging Strikes aplica três críticos garantidos. Sleep Talk exclui os três movimentos incompatíveis de preparação/armazenamento.
- Histórico direto reinicia por turno/saída; Counter usa o último acerto, Bide acumula os acertos, sem incluir residual ou autoagressão. Comandos são imutáveis e intenções são transitórias. IA projeta condições sem RNG interno nem reutilização indevida de flags. Interface e comparador mostram tipo dinâmico, preparação e descrições corretas de dano.
- Unown, Wobbuffet, Wynaut e Pyukumuku liberados para batalhas da campanha, com apenas um ou dois golpes canônicos. 1.347 registros aptos / 1.351 totais; Ditto, Smeargle, Cosmog e Cosmoem continuam como coleção. Snapshot incremental dessas quatro espécies; saves não foram editados diretamente.
- Extras da campanha: 485 espécies / 80 definições curadas, limite de seis opções. Quatro golpes fixos anteriores e os 450 selecionáveis iniciais preservados. Oito extras comuns foram substituídos por golpes característicos; preferências antigas que usem opções removidas podem retornar ao padrão pela validação existente. A lista e as espécies estão no relatório. Mega Kick de Pikachu/Squirtle preservado.
- Dependências externas explícitas: Heavy Slam/Heat Crash (Minimize/Dynamax), Photon Geyser (habilidades). Peso ausente de Eternatus Eternamax (#10190) produz falha controlada para golpes de peso. P6/P7/P8 e demais pendências anteriores de P1/P2/P3 não foram declaradas concluídas.
- Adicionados 284 testes de fechamento em tests/battle/p5-completion.test.js e 65 testes fracionários no lote local. Suíte completa: **1.795 testes aprovados, 38 suítes, zero falhas/cancelados/ignorados; saída 0**. Auditorias P4/P5/draft aprovadas; P4: 316 conhecidos, 257 FULL, 59 PARTIAL, zero pendências P4. Regeneração offline idêntica e git diff --check aprovados.
- Fontes primárias: Pokémon Showdown data/moves.ts, data/learnsets.ts, sim/battle-actions.ts e sim/pokemon.ts; PokéAPI moves.csv/pokemon.csv. O gerador completo do catálogo expandido foi atualizado, mas não foi reexecutado integralmente pela rede.
- Próximo bloco: P6, especialmente proteção, recarga/carga genérica, aprisionamento e trocas especiais. Fechamento P5 publicado posteriormente em origin/main no commit 4f38809125e84b7f88a692af208850e7a844cfbb.

---

## Atualização — 31/10/2026: Publicação do dano constante e P5 — Dano fracionário

- Ciclo anterior de Sonic Boom e Dragon Rage publicado em origin/main no commit 34a0fae299d4604e1349e32ea8d9fc3c9f00eedf, hash remoto confirmado. Checkout limpo antes de iniciar este ciclo; registros anteriores de trabalho local são históricos.
- Implementados Super Fang (#162, Normal/Physical), Nature’s Madness (#717, Fairy/Special) e Ruination (#877, Dark/Special), precisão 90, PP 10, prioridade 0, FULL no escopo atual. Dano compartilhado: max(1, floor(HP atual do alvo / 2)), limitado ao alvo vivo; usa o HP na execução, inclusive após uma cura anterior no turno. Em 1 HP, causa 1 e pode nocautear.
- Não usa HP máximo, atributos, estágios, nível, STAB, burn ou variância. Imunidade Ghost de Super Fang preservada sem aura. Resistências/fraquezas não multiplicam dano. Aura do Shadow supera imunidade apenas para o adversário, mantendo a metade do HP sem amplificação; motor e avaliador concordam. Eventos usam NEUTRAL ou IMMUNE para apresentação coerente.
- Contratos: identificação conjunta ID/nome (incluindo alias nature-s-madness), rejeição de poderes adulterados antes de normalizar, hidratação real dos três pilotos, seleção heurística documentada com pontuação-base 50 (não uma fórmula de dano). Sleep Talk, trocas e regras existentes de condições/PP preservados.
- Particularidade oficial: Super Fang e Nature’s Madness têm power null na PokéAPI; Ruination tem power 1 como sentinela. O catálogo, conversão e hidratação preservam o 1 oficial sem encaminhá-lo à fórmula comum. Legados null/undefined/zero são normalizados para o valor canônico do piloto; valores positivos diferentes do 1 exclusivo de Ruination são rejeitados.
- Campanha: Super Fang em Raticate (#20), Nature’s Madness em Tapu Koko (#785), Ruination em Ting-Lu (#1003), com learnsets conferidos. Adicionadas três opções sem remover extras ou golpes fixos anteriores; 458 espécies com extras / 1.343 espécies, 34 definições curadas. Nenhum save foi editado diretamente.
- Fontes: Pokémon Showdown data/moves.ts (superfang, naturesmadness, ruination; damageCallback) e data/learnsets.ts; PokéAPI data/v2/csv/moves.csv (metadados, incluindo sentinela de Ruination). https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts ; https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/moves.csv .
- Adicionados 65 testes em tests/battle/fractional-damage.test.js: HP par/ímpar e baixo, recálculo, cura anterior no turno, dano/PP/precisão, condições, imunidades/aura/IA, nocaute/reservas, sessões reais nos dois sentidos, ataque durante troca, Sleep Talk, apresentação e hidratação real com rejeição de dados adulterados. Ajustadas as asserções canônicas de suporte e contagem de espécies para o novo escopo, preservando testes dos golpes ainda bloqueados e a fixture oficial independente.
- Suíte completa: **1.511 testes aprovados, 38 suítes, 0 falhas, 0 cancelados, 0 ignorados; saída 0**. Auditoria P4: 273 conhecidos, 214 FULL, 59 PARTIAL, 0 pendências P4. Geração offline idêntica e git diff --check aprovados.
- P5 permanece parcial: dano por peso/velocidade/HP, dano aleatório, histórico e contra-ataques, OHKO e outras famílias específicas continuam pendentes. Habilidades/itens/formas/duplas não foram implementados. Novo ciclo fracionário permanece local, sem commit, push ou deploy após 34a0fae.

---

## Atualização — 31/10/2026: P5 — Dano Fixo Constante (Sonic Boom e Dragon Rage) — Revisão Completa

- Implementado suporte compartilhado a dano fixo constante no motor: Sonic Boom (#49; Normal, Special, precisão 90, PP 20, dano fixo de 20 HP) e Dragon Rage (#82; Dragon, Special, precisão 100, PP 10, dano fixo de 40 HP), ambos com power: null. Suporte promovido a FULL nas batalhas individuais do projeto.
- Contratos e catálogo canônico: CONSTANT_DAMAGE_MOVES e helpers isConstantDamageMove / getConstantDamageAmount adicionados em battle-constants.js. IDs 49 e 82 promovidos em CANONICAL_MOVE_DEFINITIONS com mecânicas requeridas ['SPECIAL_DAMAGE', 'FIXED_DAMAGE_CONSTANT']. ID 49 removido da lista de bloqueados e adicionado a KNOWN_CATALOG_MOVES. Exportações espelhadas em battle-session-constants.js.
- Validação estrita de poder: validateMoveData, MoveModel.createMove, convertPokeApiMove e BattleEngine.createCombatant aceitam apenas null, undefined ou 0 para golpes de dano constante (normalizando para null), e rejeitam qualquer valor positivo, negativo, não-finito ou tipo inválido (boolean, object, etc.) sem mutar o objeto de entrada.
- Prevenção contra combinações conflitantes de ID e nome em isConstantDamageMove: verificações conjuntas impedem que entradas adulteradas (como { id: 49, name: 'dragon-rage' } ou { id: 33, name: 'sonic-boom' }) ativem indevidamente a mecânica.
- Comportamento real da SHADOW_AURA (distinção entre superar imunidade e multiplicar dano):
  - A aura do adversário (modifiers.SHADOW_AURA com attackerSide === 'enemy') atua na resolução de efetividade elevando o multiplicador base para pelo menos 2 (Math.max(2, base)). Assim, a imunidade elemental canônica é superada antes da resolução do dano fixo (rawMultiplier = 2 > 0).
  - Na resolução do dano constante, como rawMultiplier > 0, o multiplicador efetivo é normalizado para 1 (NEUTRAL), aplicando estritamente 20 HP (Sonic Boom) ou 40 HP (Dragon Rage). Fraqueza, resistência e a própria aura NÃO multiplicam esse dano (não amplifica para 40 ou 80 HP).
  - Sem aura, imunidades normais são estritamente respeitadas: Sonic Boom causa 0 de dano a Ghost (IMMUNE, mult 0) e Dragon Rage causa 0 a Fairy (IMMUNE, mult 0).
  - A aura é estritamente unilateral: se o jogador atacar um tipo imune enquanto a aura do inimigo estiver ativa no estado da batalha, o jogador continua sofrendo imunidade canônica (dano 0, IMMUNE, mult 0).
  - Motor e avaliador concordam em 100% dos cenários (dano esperado, dano base e classificação NEUTRAL vs IMMUNE).
  - HP capping e nocaute limpo: ao superar imunidade contra alvos com HP reduzido (ex: 15 HP restantes), o dano é limitado ao HP restante sem deixar HP negativo e sem vazamento para as reservas da equipe.
  - PresentationMapper: quando a aura supera a imunidade, o evento TYPE_EFFECTIVENESS_RESOLVED emite multiplier: 1 e NEUTRAL, fazendo com que a apresentação não anuncie imunidade (pois houve dano) e não anuncie super efetivo/multiplicação por fraqueza.
  - Regressões compartilhadas: golpes de nível (Seismic Toss e Night Shade) também superam imunidade com aura causando o nível exato sem amplificação por 2; golpes comuns (como Tackle) aplicam multiplicador >= 2 com a fórmula padrão de dano.
- HP Capping e resolução de nocaute: dano limitado ao HP restante (Math.min(defender.currentHp, constantAmount)), evitando HP negativo e garantindo que nenhum dano excedente vaze para a reserva em batalhas 3x3.
- Precisão e consumo de PP: Sonic Boom tem precisão 90% (erro consome 1 PP e causa 0 de dano); Dragon Rage tem precisão 100% (consome 1 PP).
- Condições impeditivas de ação: sono, congelamento e hesitação (flinch) impedem a ação e não consomem PP; paralisia consome 1 PP quando imobiliza; confusão causa autoagressão sem consumo de PP do golpe quando ativa, e consome 1 PP com dano fixo aplicado quando superada.
- Avaliador de IA (BattleEvaluator): reconhece golpes de dano constante, projeta dano médio/mínimo/máximo igual ao valor fixo, calcula dano esperado ponderado pela precisão (18 para Sonic Boom, 40 para Dragon Rage), reconhece imunidades (dano 0) e avalia letalidade (wouldKo e guaranteedKo) com precisão cirúrgica.
- Hidratação real completa de ambos os pilotos (BattleTeamHydrator):
  - Sonic Boom hidratado em Electrode (#101) e Dragon Rage hidratado em Gyarados (#130) usando fixtures autênticas no formato da PokéAPI (power: null, accuracy, pp, damage_class: special).
  - Ambos os golpes atravessam com sucesso a seleção heurística determinística de qualidade, normalização de contratos e instanciação de combatente no motor.
  - Comprovada em batalha a execução de 40 HP para Dragon Rage e 20 HP para Sonic Boom contra alvos elegíveis, e dano zero contra Fairy sem aura.
  - Respostas adulteradas da API (como power: 999) são rejeitadas por validateMoveData e isMechanicallySupportedMove antes de entrar no loadout.
  - Demonstração de que combatentes com níveis diferentes (ex: Gyarados nível 30 vs nível 75) causam exatamente o mesmo dano constante de 40 HP.
- Campanha: pilotos adicionados ao gerador e catálogo curado em Electrode (#101; sonic-boom, shock-wave) e Gyarados (#130; dragon-rage, surf), preservando exatamente 455 espécies com extras e limite de 6 opções por espécie.
- Suíte de testes: 15 testes detalhados e determinísticos em tests/battle/fixed-damage.test.js, validando catálogo, validação de poder, integridade de dano fixo, imunidades, estágios, variância, burn, SHADOW_AURA (superação de imunidade, lado específico, preservação de 20/40, capping e PresentationMapper), letalidade/nocaute, precisão 90%, impedimentos, Sleep Talk, IA, sessão bidirecional, hidratação autêntica de Electrode e Gyarados, e opções de campanha.
- Estado de validação: 1.446 testes aprovados em 38 suítes, zero falhas. Auditoria P4 sem pendências (270 conhecidos, 211 FULL, 59 PARTIAL).
- P5 permanece parcial: golpes de dano variável (Super Fang, Low Kick, Psywave, OHKO, Counter/Mirror Coat) continuam pendentes para os próximos ciclos.
- Nenhum commit, push ou deploy foi realizado.

## Atualização — 31/10/2026: P5 — Dano Baseado no Nível (Seismic Toss e Night Shade) — Validação Completa

- Implementado suporte compartilhado a dano baseado no nível do usuário: Seismic Toss (#69; Fighting, Physical, precisão 100, PP 20) e Night Shade (#101; Ghost, Special, precisão 100, PP 15), ambos com `power: null`. Suporte FULL no modelo atual de batalhas individuais.
- Política consistente e estrita de validação de poder: corrigida a inconsistência onde `MoveModel.createMove` aceitava silenciosamente poderes adulterados (ex: `power: 999`) e os transformava em `null`. Agora, tanto `validateMoveData`, `MoveModel.createMove`, `convertPokeApiMove` quanto `BattleEngine.createCombatant` rejeitam rigorosamente poderes positivos, negativos, não-finitos ou tipos inválidos (`boolean`, `object`, etc.) sem mutar o objeto de entrada. Valores legítimos (`null` da PokéAPI, `undefined` e `0` proveniente de coerções da hidratação) são aceitos e normalizados para `power: null`.
- Combinações conflitantes de ID e nome: `isLevelDamageMove` agora valida simultaneamente `id` e `name` caso ambos estejam presentes, impedindo que combinações conflitantes (como `{ id: 69, name: 'tackle' }` ou `{ id: 33, name: 'seismic-toss' }`) ativem indevidamente a mecânica de dano fixo por nível. Golpes com power nulo ainda não implementados (Guillotine, Fissure, Low Kick, etc.) permanecem bloqueados; golpes comuns e de status preservam seus contratos intactos.
- Dano causado é estritamente igual ao nível efetivo do atacante (`Math.min(currentHp, attackerLevel)`). Ignora completamente atributos de ataque e defesa (físicos ou especiais), estágios de atributos (-6 a +6), STAB, acertos críticos, variância de dano (85..100) e penalidade de queimadura (burn). Fallback seguro para o nível padrão do motor (50) quando o nível não for fornecido ou for inválido.
- Respeito a imunidades elementais: Seismic Toss causa 0 de dano a tipos Ghost; Night Shade causa 0 de dano a tipos Normal. Em alvos imunes, o evento `TYPE_EFFECTIVENESS_RESOLVED` emite multiplicador 0 e classificação `IMMUNE`, nenhum dano é aplicado e o HP do alvo permanece intacto. Efetividades não-imunes (fraqueza 2x e resistência 0.5x) causam exatamente o nível e suprimem mensagens de super efetivo / resistido (`NEUTRAL`).
- HP Capping e Nocaute: dano limitado ao HP restante sem deixar HP negativo; nocaute encerra a batalha ou solicita substituição sem dano excedente vazando para a reserva.
- Precisão e consumo de PP: acurácia normal (100%), consumindo 1 PP por uso mesmo se o golpe errar por evasão/precisão.
- Cobertura completa de condições impeditivas:
  - Sono profundo: impede a ação, reduz `sleepTurns` em 1, emite `STATUS_IMMOBILIZED` e **não consome PP**.
  - Congelamento: impede a ação se falhar no descongelamento, emite `STATUS_IMMOBILIZED` (`FROZEN_SOLID`) e **não consome PP**.
  - Paralisia: impede a ação quando sorteada, emite `PP_CHANGED` e `STATUS_IMMOBILIZED`, **consumindo 1 PP** conforme a regra canônica.
  - Flinch (hesitação): impede a ação, limpa o estado de flinch, emite `FLINCH_IMMOBILIZED` e **não consome PP**.
  - Confusão com autoagressão: decrementa `confusionTurns`, emite `CONFUSION_CHECK` e `CONFUSION_DAMAGE` físico contra si mesmo, não causa dano ao defensor e **não consome PP** do golpe pretendido.
  - Confusão superada: decrementa `confusionTurns`, emite `CONFUSION_CHECK`, executa o golpe normalmente com dano igual ao nível e **consome 1 PP**.
- Integração real com BattleSessionController e PresentationMapper:
  - Adversário executando Seismic Toss e Night Shade via sessão real nos dois sentidos, respeitando níveis efetivos distintos (Jogador nível 40 vs Adversário nível 60/70).
  - Adversário atacando o Pokémon que entra após troca voluntária do jogador, inclusive com resolução de imunidade de Ghost contra Normal (Snorlax) e dano fixo em alvo suscetível.
  - Convocação via Sleep Talk com consumo de 1 PP de Sleep Talk e preservação estrita de PP dos golpes convocados.
  - Eventos reais emitidos pela sessão mapeados com sucesso pelo PresentationMapper (`HP_TRANSITION`, `SWITCH_OUT_SEQUENCE`, `SWITCH_IN_SEQUENCE`, `FAINT_SEQUENCE`, `MOVE_ANNOUNCEMENT`).
- Hidratação real com BattleTeamHydrator:
  - Testes com fixtures no formato autêntico da PokéAPI (`power: null`, `type.name`, `damage_class.name`).
  - Corrigido fluxo de extração de tipo de golpe no hydrator (`moveDetail.type?.name || moveDetail.type`) e preservação de nível explícito do combatente.
  - Demonstração completa de seleção determinística, hidratação de Machamp e Dusclops, criação de combate no motor e execução de golpes sem dependência de rede ao vivo.
- Campanha: pilotos em Machamp (#68) e Dusclops (#356), limite de 6 opções e 455 espécies com extras preservados.
- Referências:
  - PokéAPI: Seismic Toss (#69) e Night Shade (#101).
  - Pokémon Showdown: `data/moves.ts` (`damage: 'level'`, `category: 'Physical'` para Seismic Toss, `category: 'Special'` para Night Shade): https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts e `sim/battle-actions.ts` (`getDamage` - dano fixo por nível).
- Validação:
  - 22 testes na suíte `tests/battle/level-damage.test.js`.
  - Suíte completa do repositório: **1.431 testes aprovados, 37 suítes, 0 falhas, 0 cancelados, 0 ignorados; código de saída 0**.
  - Auditoria P4: 268 conhecidos, 209 FULL, 59 PARTIAL por dependências explícitas, 0 pendências P4.
  - `git diff --check` aprovado sem erros de formatação ou whitespace.
- P5 permanece parcial: ainda pendentes danos proporcionais a HP/peso (Super Fang, Low Kick, Grass Knot, Reversal, Flail), dano fixo numérico (Sonic Boom, Dragon Rage), OHKO e histórico de dano para contra-ataques (Counter, Mirror Coat, Metal Burst). Sem commit, push ou deploy.

---

## Atualização — 31/10/2026: P5 — Suporte a Water Shuriken (Múltiplos Acertos Especial com Prioridade +1)

- Implementado Water Shuriken (#594): Water, Special, poder 15 por acerto, precisão 100, PP 20, prioridade +1, 2–5 acertos usando a distribuição moderna 35% / 35% / 15% / 15%. Suporte FULL no modelo atual de batalhas individuais.
- Consideradas explicitamente as diferenças históricas de categoria (Special desde a Gen 7+, Physical na Gen 6) e as variantes de Ash-Greninja / Battle Bond (3 acertos fixos de poder 20 no Gen 7). Não foram implementadas formas, habilidades (Battle Bond, Skill Link) ou itens (Loaded Dice), mantendo-se dependências explícitas e sem misturar versões.
- Reutilizada a infraestrutura compartilhada de múltiplos acertos: dano calculado com Special Attack e Special Defense efetivos, aplicando modificadores de estágio correspondentes (`specialAttack` e `specialDefense`, enquanto estágios físicos não têm efeito). Dano especial não sofre penalidade de queimadura (burn). STAB, efetividade de tipo e variância 85..100 resolvidos por acerto.
- Prioridade +1 integrada a TurnManager: age antes de golpes de prioridade 0 (como Tackle), desempata por velocidade efetiva contra outros golpes de prioridade +1 (como Quick Attack / Aqua Jet) e desempata deterministamente a favor do jogador em empates de velocidade.
- Resolução de precisão e PP: verificação de acurácia única por uso e consumo de 1 PP (20 -> 19). Se errar por precisão/evasão, zero acertos são aplicados, nenhum evento MULTI_HIT_COMPLETE é emitido e 1 PP é consumido. Nocaute interrompe imediatamente a sequência de acertos; danos excedentes não vazam para o banco em batalhas 3x3.
- Sessão determinística e desacoplada: rolagens de quantidade de acertos e dano por acerto integradas nos fluxos do jogador e inimigo, inclusive durante troca voluntária do jogador e quando acionado via Sleep Talk (neste caso, consome PP de Sleep Talk e preserva PP de Water Shuriken).
- Avaliador e IA: consideram dano total (média de 3,1 acertos), intervalo de dano e o bônus de prioridade positiva (+15 * prioridade) sem consumir RNG interno.
- Apresentação: mapeia cada acerto como HP_TRANSITION contíguo e emite MULTI_HIT_FEEDBACK com mensagem "Atingiu X vezes!" no DOM adapter.
- Campanha: Water Shuriken disponibilizado nas opções curadas de Greninja (#658), substituindo `strength` e mantendo `hydro-pump`, dentro do teto estrito de seis opções (4 fixos + 2 extras). Gerador offline reproduzível: 455 espécies com extras / 1.343 espécies, 27 definições curadas seguras. Nenhum save adulterado.
- Referências conferidas: PokéAPI (dados modernos de Water Shuriken #594), Pokémon Showdown data/moves.ts (watershuriken: category, power, priority, multihit 2-5): https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts e sim/battle-actions.ts .
- Validação: 68 testes em tests/battle/multi-hit.test.js (17 novos testes cobrindo metadados, categoria especial, SpAtk/SpDef com estágios, imunidade a burn, prioridade +1 e desempates por velocidade, distribuição 2-5, precisão/evasão, interrupção por KO e reservas intactas, sessão nos dois sentidos/troca/Sleep Talk, IA/avaliador, apresentação e catálogo). Suíte completa do repositório: **1.409 testes aprovados, 36 suítes, 0 falhas, 0 cancelados, 0 ignorados; código de saída 0**. Auditoria P4: 266 conhecidos, 207 FULL, 59 PARTIAL, 0 pendências P4. git diff --check aprovado.
- P5 permanece parcial: faltam outras famílias de múltiplos acertos, dano fixo/nível (Seismic Toss, Night Shade), dano baseado em HP/peso (Super Fang, Low Kick, Grass Knot, Reversal, Flail) e histórico de dano para contra-ataques (Counter, Mirror Coat, Metal Burst). Não há suporte completo às variantes de Battle Bond / Ash-Greninja. Sem commit, push ou deploy.

---

## Atualização — 31/10/2026: P4 publicada e P5 — primeiros múltiplos acertos

- Fechamento da P4 publicado em origin/main no commit 099680edf7094d59b66bd08724d1482f67ee6f2f. Hash remoto confirmado e checkout limpo antes deste ciclo. O registro anterior de fechamento local abaixo passa a ser histórico.
- Implementados seis pilotos P5: Bullet Seed (#331), Icicle Spear (#333), Rock Blast (#350), Arm Thrust (#292), Double Kick (#24) e Twineedle (#41). FULL no escopo do motor atual, sem habilidades, itens, Substitute ou regras de batalhas em dupla.
- Quatro pilotos de 2–5 acertos usam a distribuição moderna 35% / 35% / 15% / 15%. Double Kick e Twineedle têm dois acertos fixos. Precisão, oportunidade de agir e PP são resolvidos uma vez; dano, variância, arredondamento e veneno de Twineedle são resolvidos por acerto. O nocaute interrompe imediatamente a sequência sem atingir a reserva.
- Fonte externa prepara rolagens determinísticas independentes de quantidade, dano e efeito por acerto, inclusive para Sleep Talk e ataques inimigos durante troca do jogador. Rolagens preparadas não significam acertos aplicados; apenas os eventos emitidos contam. Engine e IA continuam sem sorteio interno.
- Avaliador/IA consideram o dano total, intervalo de acertos e média de 3,1 acertos nos golpes variáveis. Twineedle tem chance acumulada estimada de 36% de veneno quando ambos os acertos podem ocorrer em um alvo elegível. Apresentação mantém transição de HP por acerto e informa a quantidade realmente executada.
- Campanha: Bullet Seed em Breloom, Icicle Spear/Rock Blast em Cloyster, Arm Thrust em Hariyama, Double Kick em Nidoking e Twineedle em Beedrill. Spore e Fake Out preservados; extras Magical Leaf de Breloom e Body Press de Hariyama foram substituídos dentro do limite de seis opções. Os quatro golpes fixos por espécie permanecem preservados. Gerador offline reproduzível: 455 espécies com extras / 1.343 espécies, 26 definições curadas. Nenhum save foi editado diretamente.
- Referências conferidas: Pokémon Showdown data/moves.ts (metadados e secundário de Twineedle), data/learnsets.ts (espécies dos pilotos), sim/battle-actions.ts (distribuição, precisão única, dano por acerto e interrupção no nocaute): https://github.com/smogon/pokemon-showdown/blob/master/sim/battle-actions.ts .
- Validação: 51 testes novos em tests/battle/multi-hit.test.js, incluindo limites da distribuição, PP, erros, imunidade, veneno independente, variância, nocaute/reservas, condições, STAB/estágios, avaliador/IA, apresentação, sessões nos dois sentidos, Sleep Talk e troca. Suíte completa: **1.392 testes aprovados, 36 suítes, 0 falhas, 0 cancelados, 0 ignorados; saída 0**. Auditoria P4: 265 conhecidos, 206 FULL, 59 PARTIAL por dependências explícitas, 0 pendências P4. git diff --check aprovado.
- P5 permanece parcial: faltam outras famílias de múltiplos acertos (por exemplo, Water Shuriken), dano fixo/variável e histórico de dano para Counter/Mirror Coat/Metal Burst. P6/P7/P8 continuam futuras. Este novo ciclo P5 permanece local, sem novo commit, push ou deploy após 099680e.

---

## Atualização — 31/10/2026: P4 concluída — condições e efeitos secundários

- Concluída a P4 no escopo do motor atual de batalhas individuais. Relatório e matriz completa de dependências em docs/roadmap-p4.md. Os registros anteriores abaixo são históricos.
- Integrados Tri Attack, rolagens independentes das presas elementais, precisão/evasão, expansão para 94 definições secundárias, Rest, Sleep Talk, Snore, Dream Eater, Yawn, curas de equipe, reset de atributos e confusão condicional.
- Campanha: Rest/Sleep Talk em Snorlax; Yawn/Snore em Slowbro; Hypnosis/Dream Eater em Hypno. Opções anteriores de Fake Out, Toxic e demais pilotos preservadas.
- Auditoria: 259 golpes conhecidos, 200 FULL e 59 PARTIAL por dependências específicas de outras fases. Nenhuma pendência genérica de P4 no catálogo conhecido ou nos 193 golpes distintos dos conjuntos fixos da campanha. Isso não significa suporte a todos os golpes existentes na PokéAPI.
- Adicionados 195 testes de fechamento, além dos 13 de Fake Out já locais. Suíte completa: **1.341 testes aprovados, 36 suítes, 0 falhas, 0 cancelados, 0 ignorados; saída 0**. Auditoria reproduzível: node scripts/audit-p4.js. git diff --check aprovado.
- Próximo bloco principal: P5 (múltiplos acertos, dano variável/fixo e histórico). Pendências específicas de P1/P2/P3 e P6/P7/P8 continuam descritas no relatório; Blizzard continua PARTIAL por clima na P7.
- Todo este fechamento permanece local. Sem novo commit, push ou deploy após o lote anterior cf50ccf.

---

## Atualização — 31/10/2026: Publicação do lote anterior e P4 — Fake Out

- Atualizações anteriores publicadas em origin/main no commit cf50ccffb7e013562f3b526ec5ef341ea4fa27e2: confusão, Toxic, cena cinematográfica Shadow, confirmação da equipe inicial e respectivos testes/documentação. Hash remoto confirmado antes de iniciar este novo ciclo.
- Implementado Fake Out (#252): Normal, Physical, poder 40, precisão 100, PP 10, prioridade +3, 100% de hesitação em alvo sobrevivente não imune. Disponível no pool de Hariyama (#297), com limite de seis opções e geração offline preservados.
- Rastreamento local entryMoveAttempts: a primeira oportunidade de movimento após a entrada permite o golpe; oportunidades impedidas por sono, freeze, flinch ou confusão também consomem a janela. Uma troca não conta como movimento do substituto. Saída e reentrada, troca forçada, substituição e batalha nova reiniciam a janela.
- Fora da janela, Fake Out falha consumindo PP, sem dano ou flinch. Evento MOVE_FAILED e feedback próprio explicam a restrição em português. Avaliador/IA não atribuem dano ou bônus de prioridade a uma tentativa inválida.
- Classificação FULL no modelo atual. Não inclui habilidades, itens ou proteção ainda ausentes no roadmap.
- Referência de comportamento: Pokémon Showdown data/moves.ts, fakeout (onTry / activeMoveActions, prioridade +3 e flinch): https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts .
- Adicionados 13 testes: metadados, prioridade sobre Extreme Speed, janela e PP, sono/freeze/confusão/flinch, imunidade Ghost, nocaute, trocas voluntária/forçada, reentrada e substituição, avaliador/IA e sessão real nos dois sentidos. Atualizado o teste de flinch que anteriormente exigia Fake Out não-FULL.
- Suíte completa: **1.146 testes aprovados, 36 suítes, 0 falhas, 0 cancelados, 0 ignorados; saída 0**. git diff --check aprovado.
- P4 permanece parcial. Próximos ciclos: efeitos compostos (Tri Attack) e expansão de famílias/pilotos. Múltiplos acertos dependem da P5; habilidades, itens e clima da P7.
- Este ciclo de Fake Out permanece local, sem novo commit, push ou deploy após cf50ccf.

---

## Atualização — 31/10/2026: Confirmação da equipe inicial dentro do jogo

- Substituídas as confirmações nativas do navegador nos dois caminhos de escolha inicial por confirmDraft, seguindo o padrão visual da confirmação de recruta.
- A tela mostra os seis Pokémon, nomes e tipos, avisa que a escolha é permanente e oferece Voltar e ajustar / Confirmar e começar. Voltar ou Esc preserva a seleção e restaura o foco; aceitar inicia apenas uma vez, usando a seleção exibida.
- Falhas de validação aparecem na própria tela. O debounce de busca é cancelado antes da revisão, impedindo que uma busca atrasada substitua a confirmação.
- Adicionados 4 testes de confirmação e atualizado o teste de corrida de busca para exigir aceitação explícita. Verificação visual local da tela e do retorno.
- Suíte completa: **1.133 testes aprovados, 36 suítes, 0 falhas; saída 0**. git diff --check aprovado.
- Alterações anteriores preservadas. Sem commit, push ou deploy.

---

## Atualização — 31/10/2026: P4 — Toxic e veneno progressivo

- Implementado Toxic (#92): Poison, Status, precisão 90, PP 10. Usuários Poison ignoram a verificação de precisão (regra moderna), preservando imunidade de alvos Poison/Steel. Grass é suscetível; condições principais existentes não são substituídas.
- Nova condição principal toxic, separada de poison. Dano residual: max(1, floor(maxHp / 16)) multiplicado pelo estágio N, crescente de 1 até o limite 15 e limitado ao HP restante. O veneno comum mantém dano fixo de 1/8.
- Toxic começa com estágio 0 na aplicação/criação de batalha. Trocas voluntárias e forçadas reiniciam a progressão sem curar a condição; não há dano no banco. O próximo fim de turno em campo usa N=1. Desmaios e contadores órfãos são limpos.
- Integração de eventos existentes, HP, indicador VENENO GRAVE, mensagens em português e avaliação tática para alvos elegíveis. Sem habilidades, itens, terrenos ou Toxic Spikes neste ciclo.
- Toxic disponível nas opções curadas de Muk (#89), com pool de 6 golpes e gerador offline atualizado. Não foram modificados saves ou conjuntos equipados.
- Referências: Pokémon Showdown, data/conditions.ts (tox) e data/moves.ts (toxic): https://github.com/smogon/pokemon-showdown/blob/master/data/conditions.ts e https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts .
- Adicionados 16 testes em tests/battle/toxic.test.js: dados canônicos, precisão 90/91 e exceção Poison, imunidades, exclusividade, progressão/arredondamento/limites, trocas, nocaute e substituição, empate residual, regressão do veneno comum, apresentação, IA e sessão real nos dois sentidos e durante troca.
- Suíte completa: **1.129 testes aprovados, 36 suítes, 0 falhas, 0 cancelados, 0 ignorados; saída 0**. git diff --check aprovado.
- Toxic classificado FULL no modelo atual. P4 permanece parcial: próximos ciclos incluem Fake Out (primeiro turno em campo), efeitos compostos como Tri Attack e expansão de pilotos. Clima/habilidades/itens/terrenos permanecem na P7; Blizzard continua PARTIAL.
- Alterações anteriores de confusão e cena Shadow preservadas. Sem commit, push ou deploy.

---

## Atualização — 31/10/2026: Confusão validada e cobertura de regressão completada

- Ciclo P4 de confusão revisado: Confuse Ray (#109) e Water Pulse (#352), estado volátil independente das condições principais, duração e autoagressão determinísticas, limpeza nas trocas e apresentação de dano próprio. Pilotos disponíveis em Lapras e Golduck; suporte FULL no escopo atual.
- Completados 4 testes de regressão em tests/battle/confusion.test.js: adversário aplica confusão pela sessão real, jogador age normalmente ou sofre autoagressão e recupera a lucidez; nocaute por autoagressão em equipes para jogador e adversário, com pedido de substituição, reserva sem confusão herdada e continuidade no turno seguinte.
- Os novos cenários passaram sem alteração no código de produção. Suíte dedicada de confusão: 29 testes aprovados.
- Suíte completa deste checkout: **1.113 testes aprovados, 36 suítes, 0 falhas, 0 cancelados, 0 ignorados; saída 0**. Inclui os 6 testes da cena Shadow. Este total substitui o número de 37 suítes informado no relatório externo.
- Confusão deixa de ser o próximo ciclo proposto e passa a ciclo validado; o próximo ciclo recomendado da P4 é Toxic (veneno progressivo). Fake Out, efeitos compostos e expansão de pilotos continuam pendentes. A P4 permanece parcial.
- A pendência de Blizzard no código já foi alinhada para WEATHER_ACCURACY_PHASE_P7. Os registros abaixo preservam o estado histórico anterior a esta revisão.
- Sem commit, push ou deploy nesta correção; alterações preexistentes e cena Shadow preservadas.

---

## Atualização — 31/10/2026: Chegada cinematográfica do Shadow

- Implementada uma apresentação em tela cheia antes da confirmação da revelação do Shadow: silêncio no salão do Super, rachaduras luminosas, fragmentos e transformação para a arena Shadow, silhueta e revelação final.
- Reutilizados os assets locais das arenas e o retrato original do Shadow. A trilha de diálogo Shadow usa o controlador de áudio existente, respeitando seu mixer e preferências.
- Cinco cenas com avanço automático; controles de continuar e pular (Esc). Em movimento reduzido, as cenas aguardam avanço manual e removem animações e tremores.
- A conclusão ou o skip usa acknowledgeShadowReveal, seguindo para o fluxo existente de reforços. Sair da campanha cancela sem marcar a revelação como vista; timers, listeners, áudio, foco e rolagem são restaurados.
- Sem alteração nas regras de batalha, Aura Sombria, reforços, saves ou textos dos diálogos existentes. Alterações preexistentes de confusão foram preservadas; esta entrada não constitui revisão independente dessa mecânica.
- Adicionados 6 testes de ciclo de vida e integração da revelação. Suíte completa do checkout: 1.109 testes aprovados, 36 suítes, 0 falhas, saída 0 (inclui as alterações preexistentes de confusão).
- Verificação visual local da sequência e conclusão no navegador. Sem commit, push ou deploy nesta implementação.

---

## Atualização — 31/10/2026: Roadmap de mecânicas de batalha P0–P8

Este registro consolida os ciclos implementados e revisados nesta expansão. Os registros anteriores permanecem como histórico; seus totais de testes e declarações de release descrevem aquele momento, não o estado atual de todas as mecânicas.

### Última validação independente

- Revisão do ciclo de congelamento e correções de Scald: **1.078 testes aprovados, 36 suítes, 0 falhas, 0 cancelados e 0 ignorados; código de saída 0**.
- `git diff --check`: aprovado, código de saída 0.
- Commit observado nesta atualização documental: `e21734d` — `feat(battle): implement phase P4 freeze and thaw mechanics with Scald interactions`.
- Esses resultados são da última execução de revisão; esta atualização modifica apenas a documentação e não constitui nova homologação visual ou publicação.

### Estado do roadmap

| Fase | Estado e limites |
| --- | --- |
| P0 — Registro e validação de golpes | Base implementada: definições canônicas, classificação de suporte, validação e referências de dados. |
| P1 — Prioridade e efeitos especiais | Parcial: prioridades e efeitos específicos implementados; infraestrutura e demais efeitos ainda exigem ciclos próprios. |
| P2 — Drenagem e recuo | Mecânicas implementadas e validadas; recuperação geral, Struggle e expansões específicas permanecem pendentes. |
| P3 — Estágios de atributos | Base validada, estágios de -6 a +6, atributos efetivos e reset em trocas; pilotos Swords Dance, Calm Mind, Close Combat, Overheat e Draco Meteor. |
| P4 — Condições e efeitos secundários | Em andamento; ciclos validados listados abaixo. Não representa suporte completo a todos os golpes dessas famílias. |
| P5 — Múltiplos acertos e dano especial | Pendente: expansão de dano fixo/variável, contra-ataques e histórico de dano. |
| P6 — Carga, recarga, proteção e efeitos persistentes | Pendente. |
| P7 — Habilidades, itens, clima e terreno | Pendente. |
| P8 — Transform, Sketch, Hidden Power e formas dinâmicas | Pendente; inclui dependências de IVs e outras mecânicas específicas. |

### Ciclos da P4 implementados e validados

- **Condições secundárias:** Thunderbolt (paralisia), Flamethrower (queimadura), Sludge Bomb e Poison Jab (veneno), Scald (queimadura). Rolagens secundárias independentes e integração da paralisia recebida antes da ação no mesmo turno.
- **Reduções secundárias de atributos:** Shadow Ball e Psychic reduzem Special Defense; Crunch reduz Defense. Limites, elegibilidade, sessão nos dois sentidos, eventos, trocas e avaliador verificados.
- **Aumentos secundários:** Ancient Power usa uma única rolagem de 10% para os cinco atributos, respeita limites individuais e pode ativar após nocautear o alvo.
- **Hesitação (flinch):** Bite e Rock Slide, 30%; impede somente movimento pendente no turno, sem consumir PP da ação impedida. Limpeza em fim de turno/trocas e inicialização sem hesitação herdada validadas.
- **Sono:** Hypnosis, Sleep Powder e Spore; duração sorteada de 1 a 3 oportunidades de movimento impedidas, seguida de despertar na tentativa seguinte. Imunidade Grass a pó, preservação da duração no banco, precedência com flinch e encaminhamento da duração durante troca voluntária validados.
- **Congelamento:** Ice Beam e Blizzard, 10%; imunidade Ice ao status, descongelamento natural de 20%, impedimento sem consumo de PP e integração das rolagens em movimentos e trocas.
- **Scald e descongelamento:** usuário congelado supera a verificação de freeze, mas só descongela ao alcançar a execução; flinch anterior mantém o usuário congelado. Scald descongela o alvo sobrevivente após os efeitos secundários, sem queimá-lo no mesmo golpe. Golpes de dano Fire descongelam no impacto; golpes de status Fire não recebem esse comportamento automaticamente.
- **Suporte no ciclo atual:** Ice Beam e Scald classificados como FULL; Blizzard permanece PARTIAL pela interação de precisão com clima. FULL descreve o escopo suportado pelo modelo atual, sem implicar implementação de habilidades, itens ou clima.

### Próximos ciclos e pendências reais

1. **Confusão — próximo ciclo proposto:** prompt preparado para Confuse Ray e Water Pulse; implementação ainda não revisada nem validada. Inclui duração, autoagressão, dano próprio, precedência de impedimentos e limpeza em trocas.
2. **Toxic:** veneno grave com dano progressivo por múltiplos de 1/16 do HP máximo; não é crescimento exponencial.
3. **Fake Out:** prioridade, flinch e restrição ao primeiro turno em campo do usuário.
4. **Efeitos compostos:** por exemplo, Tri Attack; dependências de múltiplos acertos devem acompanhar a P5.
5. **Expansão dos pilotos:** outros golpes semelhantes precisam de cadastro, verificação de exceções e testes; não são promovidos automaticamente a FULL.
6. **Blizzard/clima:** o código ainda usa a identificação `WEATHER_ACCURACY_PHASE_P5`; alinhar a identificação e suas referências à **P7**, sem implementar clima neste ajuste documental.

Os identificadores P0–P8 deste roadmap são próprios da expansão de mecânicas. Não substituem a numeração histórica PBA-xxx nem outras fases de UI/UX ou dificuldade já registradas neste arquivo.

---


## Atualização — 09/10/2026: Correção Final da Fase 1 UI/UX (Listagem por Tipo com Escopo de Geração e Escopo Canônico)

Resolução da última pendência identificada na Fase 1 de UI/UX da Pokédex: o carregamento por tipo agora respeita simultaneamente a geração selecionada, o tipo selecionado e o escopo canônico de espécies suportado (IDs 1 a 1025).

1. **Falha Corrigida:**
   - O método `loadPokemonsByType` requisitava globalmente os primeiros 60 Pokémon do tipo sem filtrar a geração ativa (`pokeApi.getPokemonsByType(type, 60)`), e atribuía `loadedGeneration = requestGen`. Com isso, ao selecionar Elétrico na Geração 1 ou ao limpar uma busca com esse filtro, espécies de gerações posteriores (como Mareep #179 da Gen 2) apareciam indevidamente na tela da Geração 1. Além disso, se a filtragem ocorresse após o fatiamento de 60 itens, gerações recentes poderiam ficar vazias mesmo contendo espécies válidas.

2. **Solução Aplicada:**
   - Em `assets/js/main.js` (`loadPokemonsByType`) e `assets/js/poke-api.js` (`getPokemonsByType`), o pipeline de carregamento por tipo foi reestruturado em 6 etapas estritas:
     1. Obtenção dos IDs associados ao tipo via índice leve `pokeApi.getTypePokemonIds(type)`.
     2. Restrição dos IDs ao intervalo da geração selecionada (`generationRanges[requestGen]`, onde `minId = range.offset + 1` e `maxId = Math.min(range.max, 1025)`) e ao escopo canônico suportado (1..1025).
     3. Aplicação de ordenação determinística crescente por número (`eligibleIds.sort((a, b) => a - b)`).
     4. Aplicação do limite de carregamento (`TYPE_PAGE_LIMIT = 60`) estritamente **após** a filtragem de geração e escopo.
     5. Requisição dos detalhes (`pokeApi.getPokemonDetail`) **apenas** para as espécies elegíveis fatiadas, reaproveitando o cache em memória (`searchDetailsCache`). Espécies descartadas não geram chamadas desnecessárias à PokéAPI.
     6. Validação estrita de contexto e concorrência (`loadToken === regularLoadSequenceToken && selectedType === requestType && selectedGeneration === requestGen && !isSearchingCatalog`) antes de comprometer os dados em `allLoadedPokemons`, atualizar `loadedGeneration` e `loadedType`, e invocar `applyFiltersAndSort()`.
   - Em `applyFiltersAndSort()`, garantido que a opção "Todas as Gerações" restringe a visualização ao escopo canônico (1..1025), excluindo formas alternativas com ID > 1025.
   - Na mudança de geração (`generationSelect.addEventListener('change')`), o tipo selecionado (`selectedType`) é preservado caso diferente de 'all', recarregando `loadPokemonsByType(selectedType)` para a nova geração em vez de forçar reset visual.

3. **Testes Obrigatórios Implementados (`tests/ui/pokedex-search-accessibility.test.js`):**
   - **Cenário 11 (Teste A — Gen 1 + Elétrico):** Com índice misto (IDs 25 e 179) e Geração 1 selecionada, após pesquisa e `clearSearch`, apenas Pikachu (#25) aparece, Mareep (#179) é excluído, o contexto carregado corresponde aos filtros ('1' e 'electric') e o contador exibe "1 Pokémon".
   - **Cenário 15 (Teste B — Gen 2 + Elétrico):** Com o mesmo índice misto e Geração 2 selecionada, Mareep (#179) aparece e Pikachu (#25) é excluído.
   - **Cenário 16 (Teste C — Geração recente com candidatos depois do limite global):** Com 65 espécies anteriores (IDs 1..65) seguidas de candidatos válidos da Geração 9 (#921 Pawmi, #923 Pawmot), comprova que os candidatos da Gen 9 são encontrados (filtragem antes do limite de 60) e que nenhuma das 65 espécies descartadas tem detalhes carregados.
   - **Cenário 17 (Teste D — Todas as Gerações):** Com espécies de múltiplas gerações (#25, #179, #921) e formas alternativas fora do escopo (10001, 10100), comprova que as espécies canônicas são exibidas e IDs > 1025 são excluídos.
   - **Cenário 18 (Teste E — Resposta atrasada por geração) e Cenário 13 (Teste E — Resposta atrasada por tipo):** Respostas lentas de requisições anteriores são descartadas e não sobrescrevem o contexto quando o usuário altera a geração ou o tipo durante o carregamento.

4. **Resultados e Validação:**
   - Suíte de acessibilidade e busca (`pokedex-search-accessibility.test.js`): **18/18 testes aprovados**.
   - Suíte completa do projeto: **845/845 testes aprovados** (22 suítes, 0 falhas).
   - Validação visual em navegador executada via subagente de navegação (`index.html`), confirmando filtros de Gen 1 + Elétrico (9 Pokémon, sem Mareep), Gen 2 + Elétrico (8 Pokémon, com Mareep), contadores dinâmicos e estados vazios com gravação WebP e screenshots arquivadas.

Resolução das duas falhas restantes identificadas na restauração da listagem da Pokédex após buscas:

1. **Correção A — Limpeza de busca após alteração de tipo (`clearSearch` e contexto regular):**
   - **Falha corrigida:** Ao carregar os primeiros 20 Pokémon da Geração 1, pesquisar "Pikachu", selecionar o filtro "Elétrico" durante a busca e limpar o campo, a Pokédex ficava com lista vazia e botão "Carregar Mais" oculto, pois `clearSearch` verificava apenas `loadedGeneration` e tentava filtrar o lote inicial de 20 espécies (IDs 1..20, onde não há elétricos).
   - **Abordagem de identificação e validação de contexto:** Rastreamento unificado de contexto da listagem regular (`loadedGeneration` e `loadedType`), espelhando a geração e o tipo efetivamente carregados em memória. Ao acionar `clearSearch`, a aplicação valida `(loadedGeneration === selectedGeneration && loadedType === selectedType && allLoadedPokemons.length > 0)`. Havendo divergência de tipo ou geração, o sistema carrega a listagem adequada ao contexto ativo (`loadPokemonsByType(selectedType)` ou `loadPokemonItems(true)`), preservando filtros e atualizando contadores, controles e paginação sem estados vazios espúrios. Se o contexto for compatível, restaura os dados em memória sem recarregamento desnecessário.

2. **Correção B — Respostas assíncronas antigas marcadas indevidamente para novo contexto:**
   - **Falha corrigida:** Ao disparar uma requisição regular da Geração 1, entrar em busca, alternar para a Geração 2 durante a busca e liberar a resposta lenta da Geração 1, `loadPokemonItems` atribuía cegamente `loadedGeneration = selectedGeneration` ('2'), injetando Pokémon de Kanto (Bulbasaur) e limites de paginação da Gen 1 na visualização de Johto ao limpar a busca.
   - **Abordagem de identificação e validação de contexto:** Captura estrita dos parâmetros da requisição no início da operação (`loadToken = ++regularLoadSequenceToken`, `requestGen = selectedGeneration`, `requestType = selectedType`, `requestOffset`, `requestMaxLimit`). Na conclusão das requisições (aplicado a `loadPokemonItems` e `loadPokemonsByType`), o retorno só atualiza estado ou DOM se `loadToken === regularLoadSequenceToken && selectedGeneration === requestGen && selectedType === requestType && !isSearchingCatalog`. Mudanças de geração, pílulas de tipo e entrada na busca incrementam `regularLoadSequenceToken`, invalidando e descartando respostas defasadas sem efeitos colaterais.

3. **Testes de Regressão Adicionados (`tests/ui/pokedex-search-accessibility.test.js`):**
   - **Cenário 11 (Teste A):** Tipo alterado para Elétrico durante busca por Pikachu; após `clearSearch`, preserva filtros, recarrega Pokémons elétricos reais (#25 Pikachu, #26 Raichu), exibe contador correto e oculta paginação sem apresentar empty state.
   - **Cenário 12 (Teste B):** Resposta controlada e pendente da Gen 1 liberada após troca para Gen 2 durante busca; ao limpar a busca, confirma que nenhum Pokémon da Gen 1 aparece em Gen 2 e que os limites de paginação pertencem à Gen 2 (offset 171, max 251).
   - **Cenário 13 (Teste C):** Resposta pendente de carregamento por tipo (`water`) liberada após mudança para `fire`; confirma que a resposta de água é descartada e não sobrescreve os dados ou controles de fogo ativos.
   - **Cenário 14 (Teste D):** Restauração de listagem com contexto compatível (Gen 1, all) após busca; valida restauração idêntica (20 itens), ausência de IDs duplicados, nenhum recarregamento redundante da API e reativação do botão "Carregar Mais".

4. **Resultados e Limitações:**
   - Suíte de acessibilidade e busca (`pokedex-search-accessibility.test.js`): **14/14 testes aprovados**.
   - Suíte completa de testes automatizados do projeto: **841/841 testes aprovados** (22 suítes, 0 falhas).
   - Limitação registrada: A verificação visual via subagente de navegador não pôde ser executada devido a indisponibilidade 503 temporária do modelo do subagente no servidor (`UNAVAILABLE: No capacity available for model gemini-3-flash on the server`), sendo registrada conforme orientações do projeto sem declaração indevida de aprovação visual.

## Atualização — 09/10/2026: Conclusão e Correções da Fase 1 UI/UX (Busca Pokédex e Acessibilidade)

Revisão completa e resolução das quatro pendências reais da Fase 1, além da reescrita dos testes para executar a implementação oficial da aplicação:

1. **Correção A — Filtro de tipo aplicado antes da paginação:**
   - Em `main.js` (`executeCatalogSearch`), a combinação de termo de busca, geração ativa e filtro de tipo agora determina os candidatos elegíveis **antes** de fatiar os resultados em páginas (`SEARCH_PAGE_SIZE = 20`).
   - Empregada indexação leve de IDs por tipo via `pokeApi.getTypePokemonIds` com cache em memória e `sessionStorage`.
   - Candidatos válidos localizados além do 20º item do catálogo agora aparecem imediatamente na primeira página de resultados.
   - O contador de resultados e o botão "Carregar Mais" refletem com exatidão a lista de candidatos realmente elegíveis, e o feedback de "tipo impedindo" só é acionado se nenhum candidato da busca pertencer ao tipo selecionado.

2. **Correção B — Restauração de geração e limpeza de busca:**
   - `main.js` agora armazena explicitamente o contexto da listagem (`loadedGeneration`) em paralelo à geração selecionada no filtro (`selectedGeneration`).
   - Ao executar `clearSearch`, se `loadedGeneration !== selectedGeneration` ou se a memória estiver vazia, o sistema não reutiliza o array anterior da Geração 1: ele aciona `loadPokemonItems(true)` para carregar a geração ativa, restabelece os limites corretos de paginação (`offset` e `maxLimit`) e retorna a Promise de carregamento.
   - Respostas assíncronas defasadas são invalidadas pelo token `regularLoadSequenceToken`.

3. **Correção C — Invalidação e versionamento de favoritos no cache de busca:**
   - Introduzido contador de versão `favoritesVersion`, incrementado a cada alteração na lista de favoritos.
   - A chave de cache de buscas (`searchResultsCache`) agora incorpora `fav:${favoritesVersion}`, invalidando consultas cacheadas obsoletas quando favoritos são adicionados ou removidos.
   - Em `executeCatalogSearch`, os ramos de retorno antecipado (sem resultados de geração, tipo ou favoritos) limpam explicitamente `currentSearchCandidates = []` e `currentPokemons = []`, evitando retenção de Pokémon removidos na memória da aplicação.

4. **Correção D — Focus trap do modal restrito a controles realmente visíveis:**
   - Implementada a função de detecção `isModalElementVisible(el)`, que inspeciona classes de abas ativas (`.tab-content.active`), propriedades `hidden`, `disabled`, `aria-hidden`, `inert` e visibilidade computada.
   - A armadilha de foco em `handleModalTrapKeydown` avalia apenas os controles verdadeiramente visíveis, impedindo que botões de abas inativas (como `#tab-evolution`) capturem `Tab` ou `Shift+Tab`.
   - `Shift+Tab` no primeiro controle visível circula confiavelmente para o último controle visível da aba ativa, `Tab` no último retorna ao primeiro, e `Escape` fecha o modal restaurando o foco ao elemento acionador original.
   - A navegação entre estágios evolutivos dentro do modal preserva o elemento chamador original na Pokédex sem sobrescrevê-lo.

5. **Correção de cliques e toques nos cards (`pokedex.css`):**
   - Aplicado `pointer-events: none` aos elementos textuais e visuais do card (`.card-header`, `.pokemon-name`, `.card-body`) e `pointer-events: auto` com `z-index: 3` ao botão `.fav-btn`.
   - Cliques e toques em qualquer área do card (nome, arte, badges de status) acionam diretamente o botão nativo do card (`.pokemon-card-action-btn`), enquanto o botão de favoritos permanece clicável e independente sem abrir os detalhes.

6. **Reestruturação da Suíte de Testes (`tests/ui/pokedex-search-accessibility.test.js`):**
   - Removidas todas as simulações internas que mascaravam o comportamento da aplicação (`simulateSearch`, `simulateKeydown`, `openModalMock`, `closeModalMock`, `loadPokemonModal`).
   - Todos os 10 cenários obrigatórios executam os métodos reais (`executeCatalogSearch`, `clearSearch`, `openPokemonDetails`, `closeModal`, `handleModalTrapKeydown`, `createPokemonCard`, `toggleFavorite`, `isModalElementVisible`) sobre o DOM de testes.
   - Correção do teste BAL38 (`tests/balance/battle-balance.test.js`) para utilizar o hydrator determinístico offline (`{ api: null }`), evitando dependência de requisições de rede ao vivo que causavam divergência de loadout.

7. **Resultados e Métricas:**
   - `tests/ui/pokedex-search-accessibility.test.js`: **10/10** cenários aprovados com execução real.
   - Suíte de testes completa do projeto: **837/837** testes aprovados (22 suítes, 0 falhas).
   - Limitação registrada: a conferência visual automatizada via subagente de navegador registrou indisponibilidade 503 temporária do modelo no servidor; a verificação do servidor local e execução dos fluxos foram concluídas e testadas.
---

- Corrigidos o botão de demonstração do README e os links de demonstração/harness na documentação para `https://spiritstonesrafa-ux.github.io/Pokedex-BatleArena/`.
- As instruções de clonagem do README e o remoto local `origin` usam o nome atual `spiritstonesrafa-ux/Pokedex-BatleArena`.
- A causa do 404 era o caminho antigo `/js-developer-pokedex/`, que não redireciona no GitHub Pages após a renomeação.

---

## Atualização — 26/09/2026: rebalanceamento selvagem (45/25/20/10) e Provas Finais em 3x3

- **Encontros selvagens rebalanceados:** distribuição-base atualizada para 45% comum, 25% incomum, 20% raro e 10% especial (lendários e míticos juntos). Os 10% são compartilhados entre os lendários e míticos elegíveis, preservando exclusões das Provas/Super Treinador, limites de capturas por ponto e compatibilidade de tipos.
- **As Quatro Provas Finais retornam ao formato 3x3:**
  - `LEGENDARY_TRIAL`, `MYTHICAL_TRIAL`, `TITANS_TRIAL` e `CELESTIAL_TRIAL` deixam de usar `TRIAL_3X1` e voltam a ser batalhas reais de equipe 3 contra 3 (3 Pokémon do jogador contra os 3 chefes canônicos da Prova).
  - Removida a seleção de adversário único da interface e preparação; o guia tático agora avalia a equipe adversária completa de três chefes.
  - O motor de batalha exige derrota dos três integrantes inimigos para `PLAYER_WIN`.
  - Recompensa da Prova: na primeira vitória, o jogador escolhe exatamente um Pokémon entre os três integrantes da Prova (`rewardClaimed = true`). Replays não concedem novos Pokémon.
  - Compatibilidade de saves: preservados integralmente saves legados com recompensa pendente de 3 candidatos e saves da fase 3x1 com recompensa de candidato único (sem reescrita retroativa).
- Validação automatizada: campanha **189/189**, suíte completa **827/827** testes aprovados.

## Atualização — 26/09/2026: encontros especiais selvagens

- Encontros lendários ou míticos agora ocupam juntos 5% da distribuição-base. As demais faixas ficam em 55% comum, 25% incomum e 15% raro.
- Foram integrados 19 lendários não reservados e 6 míticos novos com dados e golpes offline; nenhuma espécie dos quatro desafios finais ou do Super Treinador entra no sorteio.
- A batalha continua 3 contra 1, a captura continua em 72% após vitória e o limite permanece três capturas por ponto. Ver `docs/CAMPAIGN_WILD_SPECIAL_ENCOUNTERS.md`.
- Validação automatizada: campanha **188/188**, suíte completa **826/826**. Conferência visual manual no navegador ainda recomendada.

---

## Atualização — 26/09/2026: raros mais frequentes na exploração

- A chance-base de encontrar Pokémon raros subiu de 5% para 15%. Os encontros comuns passaram a 60%; os incomuns permanecem em 25%.
- O aviso de raridade, os testes e a documentação atual refletem a nova distribuição. As regras de captura e seus limites não mudaram.
- Validação automatizada: **824/824** testes da suíte completa aprovados.

---

## Atualização — 26/09/2026: nove pontos de exploração selvagem

- Cada uma das Regiões 1, 2 e 3 agora tem três pontos temáticos no mapa; o avatar caminha até o ponto selecionado. Cada ponto permite três capturas bem-sucedidas, totalizando até 27. A Região Final continua sem encontros.
- O Pokémon e sua raridade são apresentados antes da batalha. O jogador pode deixá-lo ir e explorar novamente ou enfrentar o encontro 3 contra 1 para tentar a captura.
- Saves antigos migram para os pontos originais de cada região, preservando capturas e encontros em andamento. O Final Stand pode reunir até 64 Pokémon com todos os recrutamentos e reforços temporários.
- Validação automatizada: campanha **186/186**, suíte completa **824/824**. Conferência visual manual no navegador ainda recomendada para computador e celular.
- Regras e conferência em `docs/CAMPAIGN_WILD_NINE_POINTS.md`.

---

## Atualização — 26/09/2026: encontros selvagens, Fase 3

- Cenas regionais, transição de encontro e captura com efeitos sonoros procedurais no mixer já existente. Botão de som com preferência local; mudo e aba oculta respeitados.
- Ajustes de celular, foco por tela, texto para leitor de tela e movimento reduzido. As regras da Fase 2 permanecem iguais.
- Validação automatizada: campanha **181/181**, suíte completa **819/819**. Inspeção visual manual ainda pendente por falha da conexão com navegador. Checklist em `docs/CAMPAIGN_WILD_PHASE_3.md`.

---

## Atualização — 26/09/2026: encontros selvagens, Fase 2

- As Regiões 2 e 3 ganharam pontos opcionais de exploração com caminhada do avatar; a Região Final não tem encontros.
- Pools temáticos e frequências de raridade comum/incomum/rara (70%/25%/5%) preservam exclusões de lendários, míticos e recompensas fixas.
- Duas capturas por região, seis no total. Saves da Fase 1 migram as capturas existentes para a Região 1. O Final Stand pode reunir 43 Pokémon com seis capturas e oito reforços temporários.
- Regras e validação em `docs/CAMPAIGN_WILD_PHASE_2.md`. Verificação visual manual permanece pendente.

---

## Atualização — 26/09/2026: suspense na captura selvagem

- A Poké Bola agora atinge e absorve o Pokémon, fecha, cai e balança antes do resultado. Captura e fuga têm desfechos visuais distintos; movimento reduzido pula a espera.
- A chance de 72% e a regra de uma tentativa permanecem inalteradas. A verificação visual em navegador segue pendente por falha na conexão local.

---

## Atualização — 26/09/2026: encontros selvagens, Fase 1

- Protótipo jogável na Região 1: ponto opcional de exploração, sorteio salvo de Pokémon não reservados, batalha 3 contra 1 e tentativa de captura com Poké Bola após vitória. Até duas capturas entram no elenco permanente sem alterar as recompensas dos Mestres.
- Saves anteriores permanecem compatíveis, dados inválidos são descartados e reset limpa o progresso selvagem. Detalhes em `docs/CAMPAIGN_WILD_PHASE_1.md`.
- Validação automatizada: campanha **171/171** e suíte completa **809/809**. A progressão com duas capturas foi testada até o Final Stand (39 Pokémon disponíveis).
- Conferência visual manual do encontro e da animação de captura permanece pendente.

---

## Atualização — 26/09/2026: avatar no mapa, Fase 4

- A troca de região no modo Mapa agora percorre a trilha até uma saída, faz uma transição curta de cena e posiciona o avatar na entrada correspondente do novo mapa. As saídas estão sinalizadas; o deslocamento não inicia batalha.
- A Região Final permanece bloqueada até 18 insígnias. Modo Lista, movimento reduzido e indisponibilidade de geometria SVG preservam a navegação direta. Detalhes em `docs/CAMPAIGN_MAP_AVATAR_PHASE_4.md`.
- Validação automatizada: campanha **163/163** e suíte completa **801/801**. Conferência visual manual em desktop/celular ainda pendente.

---

## Atualização — 26/09/2026: avatar no mapa, Fase 3

- O avatar agora tem pares de poses para caminhar horizontalmente, subir e descer; o lado esquerdo espelha as poses horizontais. A troca das pernas acompanha a distância percorrida na trilha SVG, e a entrada em uma região recebeu transição visual curta.
- No celular, o botão **Pular caminhada** fica fora da área rolável do mapa. Movimento reduzido preserva o fluxo direto, sem animação. Detalhes em `docs/CAMPAIGN_MAP_AVATAR_PHASE_3.md`.
- Validação automatizada local: campanha **160/160** e suíte completa **798/798**. A conexão com o navegador local falhou; conferência visual manual em desktop/celular permanece pendente.

---

## Atualização — 26/09/2026: avatar no mapa, Fase 2

- A região ativa e o último nó alcançado em cada mapa agora são restaurados após recarga, sem alterar o save principal da campanha. A continuidade fica isolada por campanha e é limpa no reset.
- A troca entre regiões usa a transição visual existente, pois não há trilhas que conectem fisicamente os quatro mapas. Dados inválidos ou armazenamento indisponível não impedem jogar. Detalhes em `docs/CAMPAIGN_MAP_AVATAR_PHASE_2.md`.
- Validação automatizada local: campanha **158/158** e suíte completa **796/796**. Conferência visual manual em desktop/celular ainda pendente.

---

## Atualização — 26/09/2026: avatar no mapa, Fase 1

- Implementado sprite original do jogador no mapa e deslocamento pelas rotas SVG existentes antes de abrir o seletor de time. A caminhada alterna duas poses com pernas e braços em passadas opostas. Inclui caminho reversível, botão para pular, proteção contra clique repetido e tratamento de movimento reduzido. O modo Lista permanece direto.
- A posição é visual e temporária por região; persistência entre sessões e travessia de regiões não fazem parte desta fase. Detalhes em `docs/CAMPAIGN_MAP_AVATAR_PHASE_1.md`.
- Validação automatizada local: campanha **155/155** e suíte completa **793/793**. Inspeção visual manual em desktop/celular ainda pendente.

---

## Estado atual — 24/09/2026

**Referência:** branch `main` até o commit `5b06ed7`. As seções numeradas e os registros de release abaixo preservam o estado de seus respectivos marcos; números de testes e indicações como `PBA_020 = NOT_STARTED` nesses blocos são históricos.

### Entregas desde o registro de 15/09/2026

- **Mapa da campanha:** quatro regiões com navegação por nós e rotas, paridade com a lista de desafios, transições acessíveis, tratamento de movimento reduzido e validação de responsividade/performance. Documentação detalhada em `docs/CAMPAIGN_MAP_PHASE_1.md` a `docs/CAMPAIGN_MAP_PHASE_5.md`.
- **Seleção inicial ampliada:** 450 Pokémon, exatamente 50 de cada uma das nove gerações, sem lendários ou míticos. O catálogo identifica 54 opções recomendadas para desafios finais (seis por geração). Campanhas antigas continuam usando o save `VERSION = 1`.
- **Combate e orientação tática:** os 468 Pokémon atualmente obtíveis na campanha têm conjuntos locais de quatro golpes suportados; o comparador de confronto usa os mesmos dados da batalha. A Batalha Rápida conserva seu fluxo próprio.
- **Evolução de gameplay — Fases 1 a 3:** piloto de veneno comum, depois queimadura e paralisia, seguido da escolha persistente de 1 a 4 golpes do jogador na preparação dos desafios. Os efeitos são limitados a golpes explicitamente suportados; adversários preservam seus conjuntos fixos. Regras e escopo em `docs/GAMEPLAY_EVOLUTION_ROADMAP.md` e `docs/CAMPAIGN_MODE.md`.
- **Quatro Provas finais em 3 contra 1:** o jogador escolhe um dos três candidatos antes da luta, enfrenta-o com três Pokémon e, se vencer, pode confirmar o resgate exatamente desse adversário. Saves com recompensa pendente do formato antigo 3 contra 3 continuam resgatáveis; revanches não dão nova recompensa. Resultados inválidos são rejeitados antes de consumir o ID da batalha ou incrementar tentativas (`5b06ed7`).

### Validação e próximos passos

- Última verificação automatizada: `npm test` **789/789**, `npm run test:campaign` **151/151**, auditoria determinística do draft **aprovada (450/450)** e `git diff --check` sem erro.
- A inspeção visual relatada cobriu a preparação e o início da Prova Lendária em 3 contra 1. A jogabilidade completa — vitória, derrota e resgate — ainda deve ser conferida manualmente nas quatro Provas; os testes automatizados não substituem esse aceite humano.
- A **Fase 4 (Dificuldade Assistida)** do roadmap de gameplay foi adiada por decisão do proprietário; **não está implementada**. A Fase 5 (objetivos opcionais) também não começou. As Provas 3 contra 1 foram uma melhoria específica de balanceamento, não a implementação da Fase 4.
- A versão publicada/tag mais recente continua **v1.1.0**. As mudanças de gameplay acima estão na `main` após essa release; esta atualização não declara uma nova versão nem valida uma nova publicação pública.

---

## 1. Projeto

**Pokédex Pro + Pokémon Battle Arena**
- Repositório: `spiritstonesrafa-ux/js-developer-pokedex`
- Diretório de Trabalho: `D:\GamePokemon`

---

## 2. Objetivo Final

Evoluir uma Pokédex moderna (desafio DIO) para uma plataforma de portfólio completa contendo:
1. Pokédex interativa e rápida (HTML5, CSS3, JavaScript Vanilla, PokéAPI);
2. Team Builder tático para seleção, ordenação e persistência de equipes (até 3 integrantes);
3. Battle Simulator com simulação por turnos 1x1, 3x3 e Provas 3x1 contra IA, mecânica clássica de dano e efetividade, com alta qualidade estética, animações dinâmicas e efeitos visuais/sonoros desacoplados.

---

## 3. Arquitetura Obrigatória

```text
Data / API
     ↓
Domain Model
     ↓
Game Engine
     ↓
Presentation Engine
     ↓
UI
```

### Regra de Ouro Inviolável
**Game Engine ≠ Presentation Engine**
A Game Engine determina quem ataca, qual golpe é desferido, quanto dano ocorreu e o estado da batalha (lógica determinística e serializável). A Presentation Engine orquestra animações, partículas, sons, sprites e atualizações do DOM a partir dos eventos emitidos pela Engine.

---

## 4. Fases Concluídas

- **PBA-001 Foundation / Architecture Preparation**:
  - Auditoria completa do projeto existente;
  - Documentação da arquitetura em `docs/battle-architecture.md`;
  - Definição formal das fronteiras de Engine e Presentation;
  - Navegação não-destrutiva (`Pokédex`, `Meu Time`, `Batalhar`);
  - Criação do `.gitignore` e atualização do `README.md`;
  - Preservação total de funcionalidades originais da Pokédex.
- **PBA-002 Team Builder**:
  - Implementação modular em `assets/js/team/`: `team-store.js`, `team-manager.js` e `team-ui.js`;
  - Limite estrito de 3 integrantes (`TEAM_MAX_SIZE = 3`);
  - Proibição de duplicatas (`DUPLICATE_POKEMON = FORBIDDEN`);
  - Importância da ordem (`ORDER_MATTERS = YES`): Slot 1 como Líder (*Lead*);
  - Reordenação acessível com botões direcionais (`←` e `→`);
  - Persistência sob o namespace `team.current` com recuperação tolerante a falhas;
  - Indicadores sincronizados na Pokédex (`✓ No time`), no modal (`Adicionar`/`Remover`/`Completo`) e no cabeçalho;
  - Empty state encorajador e celebração de equipe completa (3/3);
  - 100% de testes obrigatórios T01–T12 aprovados.

- **PBA-003 Battle Engine v1**:
  - Implementação do núcleo matemático de combate 1x1 isolado em `assets/js/battle/`:
    - `battle-constants.js`: Estados (`READY`, `IN_PROGRESS`, `PLAYER_WIN`, `ENEMY_WIN`), eventos e configurações;
    - `damage-calculator.js`: Fórmula clássica determinística com nível simulado 50 e poder 40, piso de dano >= 1;
    - `turn-manager.js`: Ordem por Velocidade (*Speed*), com desempate determinístico em favor do jogador;
    - `battle-engine.js`: Criação de batalha, validações estritas contra NaN e entradas corrompidas, ciclo de turnos com suspensão de contra-ataque em nocaute e bloqueio pós-combate;
  - Barramento de eventos estruturados (`BATTLE_STARTED`, `TURN_STARTED`, `ACTION_STARTED`, `DAMAGE_APPLIED`, `POKEMON_FAINTED`, `BATTLE_ENDED`);
  - 100% de isolamento: `BATTLE_ENGINE_DOM_DEPENDENCIES = 0`, `BATTLE_ENGINE_FETCH_CALLS = 0`, `BATTLE_ENGINE_LOCALSTORAGE_DEPENDENCIES = 0`, `BATTLE_ENGINE_AUDIO_DEPENDENCIES = 0`;
  - Imutabilidade comprovada (`INPUT_MUTATION = NONE`);
  - 100% de testes automatizados E01–E18 e Simulação Completa aprovados com Node.js nativo (26/26 testes).

- **PBA-004 Type System**:
  - Implementação da matriz completa de 18x18 tipos modernos (`type-chart.js`) com todas as 324 relações resolvíveis;
  - Módulo puro de cálculo de efetividade (`type-effectiveness.js`) com suporte integral a combatentes single e dual-type;
  - Multiplicadores elementais canônicos suportados: `0` (imune), `0.25` (dupla resistência), `0.5` (resistido), `1` (neutro), `2` (super efetivo) e `4` (dupla fraqueza);
  - Prevalência estrita de imunidade em Pokémon dual-type ($x \times 0 = 0$);
  - Classificação semântica de eventos: `IMMUNE`, `RESISTED`, `NEUTRAL` e `SUPER_EFFECTIVE`;
  - Combatant Model v2 atualizado com validação e normalização de 1 a 2 tipos únicos;
  - Integração com `DamageCalculator`: dano zero para imunidades absolutas e piso mínimo de $1$ para ataques não-imunes;
  - Emissão do evento `TYPE_EFFECTIVENESS_RESOLVED` antes de `DAMAGE_APPLIED`;
  - Ponte transitória: `BASIC_ATTACK` adota temporariamente o tipo primário do atacante (`attacker.types[0]`), sem STAB;
  - 100% de isolamento mantido: `DOM = 0`, `FETCH = 0`, `LOCALSTORAGE = 0`, `AUDIO = 0`;
  - Encapsulamento de todos os módulos de batalha em IIFE para prevenir colisões de escopo no navegador;
  - 100% de aprovação nos testes automatizados: 52 testes (TY01–TY25, integridade das 324 relações e regressão completa E01–E18).

- **PBA-005 Move System**:
  - Implementação do modelo normalizado de golpes (`MoveModel` em `assets/js/battle/move-model.js`) com `id`, `name`, `type`, `power`, `accuracy`, `pp` e `damageClass`;
  - Suporte completo às categorias de dano `physical` e `special`;
  - Golpes da categoria `status` (ex: *Growl*) são reconhecidos na validação, mas rejeitados como `UNSUPPORTED_IN_PBA_005` (sem danos fictícios);
  - Combatant Model v3: incorporação de `specialAttack`, `specialDefense` e loadout de 1 a 4 moves (`MOVE_LOADOUT_MIN = 1`, `MOVE_LOADOUT_MAX = 4`) sem duplicatas;
  - Resolução de atributos ofensivos e defensivos:
    - Físico: `attacker.attack` vs `defender.defense`;
    - Especial: `attacker.specialAttack` vs `defender.specialDefense`;
    - Independência estatística comprovada por testes (alterar stats físicos não altera danos especiais e vice-versa);
  - Desativação do tipo primário temporário: o tipo elemental da ação agora é estritamente regido pelo golpe (`BASIC_ATTACK_PRIMARY_TYPE_BRIDGE_ACTIVE = NO`);
  - Sistema de PP: estado runtime isolado, decremento de 1 PP em hits e misses, bloqueio em zero PP (`ACTION_REJECTED`), e preservação de PP do defensor em caso de nocaute no primeiro ataque;
  - Resolução determinística de Precisão (Accuracy): sem `Math.random()`, rolls externos ($1 \le \text{roll} \le 100$), suporte a *Always-Hit* (`accuracy: null`), com miss causando 0 dano e deixando o HP intacto;
  - STAB (Same-Type Attack Bonus): multiplicador de $1.5\times$ quando o tipo do golpe coincide com os tipos do atacante ($1.0\times$ caso contrário);
  - Prevalência estrita de imunidade: multiplicador elemental $0$ anula o dano final independentemente de STAB ou poder base;
  - Pipeline de dano v2: $\lfloor \text{baseDamage} \times \text{stabMultiplier} \times \text{typeMultiplier} \rfloor$;
  - Fronteira de dados da PokéAPI: `pokeApi.getMoveDetail` com cache em memória (`Map`) e adaptador para `MoveModel`, mantendo o Battle Engine 100% isolado de chamadas `fetch`;
  - Hardening do Type Chart: verificação independente de todas as 324 relações $18 \times 18$ contra fixture canônica autônoma (`type-chart-reference.js`);
- **PBA-006 Battle 3x3 & Switching**:
  - Implementação completa do conceito de Battle Team com tamanho obrigatório de 3 Pokémon (`TEAM_SIZE = 3`);
  - Rejeição estrita de equipes inválidas (0, 1, 2 ou 4+ Pokémon) e espécies duplicadas (`DUPLICATE_SPECIES = REJECTED`);
  - Preservação do Líder: Slot 1 da equipe (índice 0) entra automaticamente como o primeiro combatente ativo;
  - Battle State v2 serializável e determinístico com rastreamento isolado de `activeIndex`, equipe ativa e reservas no banco;
  - Regra de ouro mantida: `team.current` (LocalStorage) $\neq$ Battle Runtime State (cópias profundas independentes);
  - Apenas o Pokémon ativo pode atacar, receber danos e gastar PP; o banco é totalmente protegido de ações e danos;
  - Troca Voluntária (`SWITCH`):
    - Prioridade estrita da troca sobre ataques ofensivos ($\text{SWITCH} > \text{MOVE}$);
    - Em `SWITCH vs MOVE`, o Pokémon reserva entra em campo e recebe o golpe adversário;
    - Em `SWITCH vs SWITCH`, ambas as trocas ocorrem deterministicamente antes de qualquer dano;
    - Validação rígida: impede troca para Pokémon inexistente, fora da equipe, já ativo ou nocauteado;
  - Persistência incondicional de HP e PP no banco (`SWITCH_HP_PERSISTENCE = PASS`, `SWITCH_PP_PERSISTENCE = PASS`);
  - Troca Forçada após Nocaute (`AWAITING_REPLACEMENT`):
    - Nocaute com reservas vivas não finaliza o combate;
    - Emissão do evento semântico `REPLACEMENT_REQUIRED` contendo o ID nocauteado e os IDs disponíveis no banco;
    - API explícita `BattleEngine.resolveReplacement(state, replacementActions)` desacoplada da UI e da IA;
    - Suspensão de contra-ataque fantasma do Pokémon nocauteado no mesmo turno;
  - Derrota da Equipe e Vitória (`TEAM_DEFEATED`):
    - O combate só termina quando os 3 Pokémon adversários estiverem nocauteados;
    - Emissão encadeada de `POKEMON_FAINTED` $\to$ `TEAM_DEFEATED` $\to$ `BATTLE_ENDED`;
  - Compatibilidade 100% preservada com confrontos 1x1 da PBA-003/004/005 (`LEGACY_1V1_REGRESSION = NONE`);
- **PBA-007 Battle AI**:
  - Separação arquitetural estrita: `BATTLE ENGINE ≠ BATTLE AI` e `ENGINE_DEPENDS_ON_AI = NO`;
  - Implementação do avaliador puro `BattleEvaluator` (`evaluateMove` e `evaluateMatchup`) calculando dano esperado ponderado por Precisão (Accuracy), STAB, fraquezas, imunidades e categorias Physical/Special sem efeitos colaterais (`AI_EVALUATION_MUTATES_STATE = NO`);
  - Estratégias programáticas `SIMPLE` (rígida, primeiro golpe utilizável, sem troca voluntária) e `SMART` (heurística de dano esperado, bonificação de KO, mitigação de riscos defensivos);
  - Descarte estrito de golpes com imunidade absoluta (0x) quando alternativas com dano positivo estão disponíveis;
  - Trocas voluntárias inteligentes (`SWITCH`):
    - Regra SW1: Imunidade total no ativo com reserva viável no banco (`AVOID_IMMUNITY_SWITCH`);
    - Regra SW2: Matchup muito desfavorável ($\le 0.5\times$) com reserva super efetiva ($\ge 2.0\times$) superando `SMART_SWITCH_MARGIN = 1.3` (`STRATEGIC_MATCHUP_SWITCH`);
    - Regra SW3: Ativo sem PP com reserva funcional no banco (`NO_PP_SWITCH`);
  - Substituição forçada inteligente pós-nocaute (`chooseReplacement`): prioriza reserva com melhor pontuação composta (dano efetivo, sobrevivência defensiva e HP remanescente);
  - Zero Trapaça (`AI_FUTURE_PLAYER_ACTION_ACCESS = NO`): a IA não conhece a ação futura do jogador nem os rolls de acurácia antes de escolher sua ação;
  - Zero RNG Interno (`AI_MATH_RANDOM_CALLS = 0`, `AI_CRYPTO_RANDOM_CALLS = 0`): determinismo e reprodutibilidade 100% comprovados por testes;
  - 100% de aprovação nos testes automatizados: 173 testes (43 novos testes AI-01 a AI-43 + 130 testes anteriores) sem nenhuma falha ou regressão.

- **PBA-008 Battle Presentation Engine**:
  - Implementação do orquestrador de apresentação desacoplado em `assets/js/presentation/`:
    - `battle-presentation-constants.js`: Catálogo de 16 comandos de apresentação (`BATTLE_INTRO`, `TURN_INDICATOR`, `ACTION_FOCUS`, `MOVE_FOCUS`, `MOVE_ANNOUNCEMENT`, `PP_TRANSITION`, `MOVE_MISS_FEEDBACK`, `STAB_METADATA`, `EFFECTIVENESS_FEEDBACK`, `HP_TRANSITION`, `FAINT_SEQUENCE`, `SWITCH_OUT_SEQUENCE`, `SWITCH_IN_SEQUENCE`, `REPLACEMENT_PROMPT`, `TEAM_DEFEAT_SEQUENCE`, `BATTLE_RESULT`), estados e durações padrão;
    - `battle-presentation-adapter.js`: Interface abstrata `BattlePresentationAdapter`, com `NullAdapter` (no-op para headless) e `RecordingAdapter` (gravação ordenada de comandos para testes);
    - `battle-presentation-scheduler.js`: Agendador temporal desacoplado com `ImmediateScheduler` (0ms para testes) e `TimerScheduler` (com suporte a cancelamento de timers);
    - `battle-presentation-mapper.js`: Mapeamento puro e determinístico de 100% dos eventos da Battle Engine para comandos de apresentação, com validação estrita de payload (`UNKNOWN_ENGINE_EVENT` e `INVALID_EVENT_PAYLOAD` são rejeitados);
    - `battle-presentation-engine.js`: Motor de orquestração de timeline com execução estritamente sequencial (`MAX_CONCURRENT_COMMANDS = 1`), proteção contra execuções concorrentes (`CONCURRENT_PLAYBACK_REJECTED`), cancelamento limpo (`cancel()`), reset de ciclo de vida (`reset()`) e barreira de contenção de erros (falhas no adapter não corrompem o estado da batalha);
  - 100% de separação de responsabilidades e ausência de regras de jogo na apresentação:
    - `PRESENTATION_DAMAGE_CALCULATION = 0`
    - `PRESENTATION_TYPE_CALCULATION = 0`
    - `PRESENTATION_AI_DECISIONS = 0`
    - `PRESENTATION_BATTLE_RULES = 0`
    - `PRESENTATION_FETCH_CALLS = 0`
    - `PRESENTATION_LOCALSTORAGE = 0`
    - `PRESENTATION_AUDIO_CALLS = 0`
  - Preparação para acessibilidade: suporte injetável a `reducedMotion: true` e `skipAnimations: true` zerando durações sem acessar DOM diretamente;
  - 100% de aprovação nos testes automatizados: 213 testes (40 novos testes PR01 a PR40 + 173 testes de fases anteriores) com 0 regressões.

- **PBA-009 Pokémon Animations**:
  - Implementação do primeiro subsistema visual real para movimentação dos sprites de Pokémon na Battle Arena em `assets/js/presentation/animation/` e `assets/css/battle-animations.css`:
    - `pokemon-animation-constants.js`: Catálogo de 8 animações corporais (`ENTER`, `IDLE`, `ATTACK`, `DAMAGE`, `FAINT`, `SWITCH_OUT`, `SWITCH_IN`, `VICTORY`), durações nominais centralizadas, multiplicadores direcionais (+1 player, -1 enemy) e classes CSS de transição;
    - `battle-animations.css`: Estilização GPU-accelerated via `transform` e `opacity` sem layout thrashing, responsividade com `clamp()` e suporte completo a acessibilidade via `@media (prefers-reduced-motion: reduce)` e classes `.pba-reduced-motion`;
    - `pokemon-animation-registry.js`: Registro determinístico de combatentes e alvos DOM (`player`/`enemy`) com suporte nativo a fallback de imagem caso sprite animado falhe;
    - `pokemon-animation-controller.js`: Controlador mestre de ciclo de vida visual com métodos dedicados, gerenciamento automático de pausa/retomada de idle, política de concorrência `CANCEL_PREVIOUS`, cancelamento seguro e reset completo de estado base;
    - `pokemon-animation-dom-adapter.js`: Adaptador real implementando a interface `BattlePresentationAdapter` da PBA-008, conectando Presentation Commands aos métodos do Animation Controller, com bloqueio estrito de reação a dano quando `damage === 0`;
    - `tests/visual/pokemon-animation-harness.html`: Harness visual dedicado e isolado para testes manuais e em navegadores reais;
  - 100% de separação e conformidade arquitetural:
    - `PRESENTATION ENGINE ≠ ANIMATION IMPLEMENTATION`
    - `ANIMATION_DAMAGE_CALCULATION = 0`
    - `ANIMATION_TYPE_CALCULATION = 0`
    - `ANIMATION_AI_DECISIONS = 0`
    - `ANIMATION_BATTLE_RULES = 0`
    - `ANIMATION_FETCH_CALLS = 0`
    - `ANIMATION_LOCALSTORAGE = 0`
    - `ANIMATION_AUDIO_CALLS = 0`
  - Fronteira estrita respeitada: Move VFX (fogo, água, raio, partículas) NÃO implementados nesta fase (escopo exclusivo da PBA-010);
  - 100% de aprovação nos testes automatizados: 249 testes (36 novos testes AN01 a AN36 + 213 testes de fases anteriores) com 0 falhas e 0 regressões.

- **PBA-010 Move Visual Effects**:
  - Implementação de subsistema profissional, reutilizável e escalável de efeitos visuais para golpes Pokémon na Battle Arena em `assets/js/vfx/` e `assets/css/move-vfx.css`:
    - `move-vfx-constants.js`: 18 Type Families (`VFX_TYPE_COUNT = 18`), 8 Effect Archetypes (`PROJECTILE`, `BEAM`, `STREAM`, `BURST`, `SLASH`, `IMPACT`, `WAVE`, `AURA`), thresholds de intensidade (`LOW` <= 50, `MEDIUM` 51..90, `HIGH` > 90), tempos nominais, limites de partículas (`MAX_PARTICLES_PER_EFFECT = 12`), camadas z-index e catálogo de overrides para golpes icônicos;
    - `move-vfx-resolver.js`: Resolver puro `MoveVfxResolver.resolve(moveData)` mapeando golpes para descritores imutáveis com fallback genérico por tipo, rejeição controlada de golpes inválidos e status moves não suportados;
    - `move-vfx-registry.js`: Registro de palco e combatentes (`player`, `enemy`) com cálculo de trajetórias dinâmicas e fallback virtual para testes headless em Node.js;
    - `move-vfx-dom-renderer.js`: Renderizador DOM baseado em CSS custom properties (`--vfx-dir`, `--vfx-scale`, `--vfx-color-*`), transformações aceleradas por GPU (`translate3d`, `scale`, `opacity`), impacto no alvo, dissipação controlada em Miss (`MISS_IMPACT_EFFECT = NO`) e Imunidade (`IMMUNITY_DAMAGE_IMPACT = NO`) e zero vazamento de nós DOM (`VFX_DOM_LEAK = NONE`);
    - `move-vfx-controller.js`: Controlador assíncrono do ciclo de vida de VFX com política de concorrência `CANCEL_PREVIOUS`, métodos `cancel()`, `reset()`, limpeza automática de nós/timers/listeners e suporte estrito a `reducedMotion`;
    - `move-vfx.css`: Estilização CSS completa para todos os 8 arquétipos, partículas leves, anéis e bursts com `@media (prefers-reduced-motion: reduce)`;
    - `composite-battle-dom-adapter.js`: Adaptador composto orquestrando `PokemonAnimationController` (movimento de ataque do atacante) + `MoveVfxController` (trajetória e impacto do VFX) durante `MOVE_ANNOUNCEMENT`, mantendo a reação de dano do defensor sincronizada no comando `HP_TRANSITION`;
    - `tests/visual/move-vfx-harness.html`: Harness visual completo com suporte a 18 tipos, 8 arquétipos, 3 intensidades, 4 desfechos (Hit, Miss, Immune, Super Effective), 6 presets icônicos e inspeção responsiva;
  - 100% de separação e conformidade arquitetural:
    - `POKEMON ANIMATION ≠ MOVE VISUAL EFFECT`
    - `VFX_DAMAGE_CALCULATION = 0`
    - `VFX_TYPE_CALCULATION = 0`
    - `VFX_AI_DECISIONS = 0`
    - `VFX_BATTLE_RULES = 0`
    - `VFX_FETCH_CALLS = 0`
    - `VFX_LOCALSTORAGE = 0`
    - `VFX_AUDIO_CALLS = 0`
  - 100% de aprovação nos testes automatizados: 289 testes (40 novos testes VFX01 a VFX40 + 249 testes de fases anteriores) com 0 falhas e 0 regressões.

- **PBA-011 Battle Audio System**:
  - Implementação de infraestrutura de áudio profissional, modular e segura para navegador baseada exclusivamente na Web Audio API nativa e cries públicos da PokéAPI em `assets/js/audio/`:
    - `battle-audio-constants.js`: 5 canais de áudio independentes (`MASTER`, `MUSIC`, `SFX`, `CRY`, `UI`), volumes padrão normalizados, catálogo de 18 Type Audio Families, 8 arquétipos sonoros, limites de polifonia (`MAX_SIMULTANEOUS_SFX = 8`) e estados de ciclo de vida (`LOCKED`, `READY`, `SUSPENDED`, `ERROR`);
    - `audio-context-manager.js`: Singleton gerenciador de AudioContext (`AUDIO_CONTEXT_COUNT = 1`, `AUDIO_CONTEXT_REUSE = YES`) com tratamento seguro de política de autoplay iniciando em `LOCKED` e desbloqueio por gesto humano (`unlock()`), além de mock `FakeAudioContext` para testes headless no Node.js;
    - `audio-mixer.js`: Grafo de ganho hierárquico com compressor dinâmico (`DynamicsCompressorNode`) contra distorção/clipping, controle de mute no Master preservando volumes individuais (`UNMUTE_VOLUME_RESTORE = PASS`), validação estrita de valores $[0.0, 1.0]$ e telemetria de sinal em tempo real (`AnalyserNode`);
    - `procedural-sfx.js`: Síntese procedural de efeitos para os 18 tipos elementais com envelopes ADSR, filtros e ruído sintético, impactos diferenciados para dano normal e super efetivo, som de Miss sem impacto de dano (`MISS_DAMAGE_SOUND = NO`), som de Imunidade sem dano (`IMMUNITY_DAMAGE_SOUND = NO`) e limpeza total imediata de nós temporários (`ACTIVE_TEMPORARY_AUDIO_NODES_AFTER_COMPLETION = 0`);
    - `battle-audio-resolver.js`: Mapeamento funcional puro de golpes para descritores sonoros sem consulta a regras de combate (`AUDIO_DAMAGE_CALCULATION = 0`, `AUDIO_TYPE_CALCULATION = 0`, `AUDIO_GAME_RULES = 0`);
    - `battle-audio-controller.js`: Controlador mestre de ciclo de vida gerenciando reprodução de SFX, música de batalha em loop procedural original (`MULTIPLE_MUSIC_INSTANCES = NO`, `MUSIC_LOOP_LEAK = NONE`), fanfarras de vitória/derrota, reprodução tolerante de cries com deduplicação ativa (`CRY_DEDUPLICATION = PASS`, `CRY_FAILURE_BLOCKS_BATTLE = NO`), cancelamento e reset;
    - `battle-audio-adapter.js` e `composite-battle-dom-adapter.js`: Integração com a Presentation Engine executando áudios coordenados em paralelo para animações, VFX e comandos de apresentação;
    - `tests/visual/battle-audio-harness.html`: Laboratório visual e interativo com botão explícito de unlock, controles de volume/mute, disparadores para os 18 tipos, outcomes, música, cries e osciloscópio de sinal em tempo real via AnalyserNode;
  - 100% de separação e conformidade arquitetural:
    - `MOVE VFX ≠ AUDIO SYSTEM`
    - `AUDIO SYSTEM ≠ GAME RULES`
    - `AUDIO_DAMAGE_CALCULATION = 0`
    - `AUDIO_TYPE_CALCULATION = 0`
    - `AUDIO_AI_DECISIONS = 0`
    - `AUDIO_GAME_RULES = 0`
    - `AUDIO_CORE_LOCALSTORAGE_DEPENDENCY = 0`
  - 100% de aprovação nos testes automatizados: 329 testes (40 novos testes AU01 a AU40 + 289 testes de fases anteriores) com 0 falhas e 0 regressões.

- **PBA-012 Battle Camera & Impact**:
  - Implementação de subsistema profissional de câmera e impacto de batalha desacoplado e acelerado por GPU em `assets/js/camera/` e `assets/css/battle-camera.css`:
    - `battle-camera-constants.js`: Catálogo de efeitos (`SHAKE`, `PUNCH_IN`, `PUNCH_OUT`, `HIT_FLASH`, `IMPACT_HOLD`), 4 níveis de impacto (`NONE`, `LIGHT`, `MEDIUM`, `HEAVY`), magnitudes de tremor (2.5px, 5.0px, 8.5px), escalas de micro zoom (1.015, 1.025, 1.04), opacidades de flash (0.15, 0.25, 0.38), pausas de sustentação (40ms, 80ms) e limites estritos de segurança fotossensível (`NO_STROBE_EFFECT = YES`, `NO_RAPID_FLASH_PATTERN = YES`);
    - `battle-camera-resolver.js`: Mapeamento funcional puro que converte dano, efetividade, power e intensidade em descritores de impacto imutáveis, elevando níveis para super efetivo (2x e 4x), atenuando para golpes resistidos (0.5x) e zerando impacto para Miss ou Imunidade (`MISS_DAMAGE_SHAKE = NO`, `IMMUNITY_DAMAGE_SHAKE = NO`);
    - `battle-camera-registry.js`: Registro de wrapper de câmera, palco e overlay de hit flash, isolando transforms do restante da página (`CAMERA_LAYOUT_THRASHING = NONE`) com suporte a testes headless no Node.js;
    - `battle-camera-controller.js`: Controlador de ciclo de vida com política de concorrência `CANCEL_PREVIOUS`, limpeza imediata de timers/classes (`TEMP_CAMERA_TIMERS_AFTER_COMPLETION = 0`), cancelamento limpo, retorno estrito ao estado base (`CAMERA_TRANSFORM_AFTER_COMPLETION = BASE`) e acessibilidade com `prefers-reduced-motion`;
    - `battle-camera-dom-adapter.js`: Adaptador DOM conectando comandos de apresentação ao controlador de câmera;
    - `composite-battle-dom-adapter.js`: Orquestração quádrupla coordenada (`Animation` + `VFX` + `Audio` + `Camera`) executada em paralelo em `HP_TRANSITION`;
    - `tests/visual/battle-camera-harness.html`: Laboratório interativo visual completo com disparadores de níveis, multiplicadores, outcomes, presets integrados (Thunderbolt, Flamethrower, Water Gun, Rock Throw), toggle de reduced motion e telemetria em tempo real;
  - 100% de separação arquitetural:
    - `CAMERA SYSTEM ≠ GAME RULES`
    - `CAMERA SYSTEM ≠ DAMAGE CALCULATION`
    - `CAMERA_DAMAGE_CALCULATION = 0`
    - `CAMERA_TYPE_CALCULATION = 0`
    - `CAMERA_AI_DECISIONS = 0`
    - `CAMERA_GAME_RULES = 0`
  - 100% de aprovação nos testes automatizados: 369 testes (40 novos testes CAM01 a CAM40 + 329 testes de fases anteriores) com 0 falhas e 0 regressões.

- **PBA-013 Final Battle UI**:
  - Implementação completa e jogável da interface de batalha 3x3 na aba "Batalhar" (`#futureModuleView`) integrando todos os subsistemas anteriores da Battle Arena em `assets/js/battle-session/`, `assets/js/ui/` e `assets/css/battle-arena.css`:
    - `battle-session-constants.js`: Estados oficiais da UI (`NO_TEAM`, `READY`, `PREPARING`, `BATTLE`, `AWAITING_PLAYER_ACTION`, `RESOLVING`, `AWAITING_PLAYER_REPLACEMENT`, `VICTORY`, `DEFEAT`, `ERROR`), limites de sessão e pool de oponentes de Kanto;
    - `battle-random-source.js`: Fonte externa e injetável de aleatoriedade (`rollAccuracy(1..100)`, `pickOpponents()`) com suporte a `crypto.getRandomValues()` e `DeterministicRandomSource` nos testes (`ENGINE_INTERNAL_RNG = 0`, `AI_INTERNAL_RNG = 0`);
    - `battle-team-hydrator.js`: Hidratador que consome IDs de `team.current` e da pool adversária, transformando-os em combatentes no Combatant Model v3 com política determinística de loadout (1 a 4 golpes legais, descarte de status moves, prioritização STAB/stats e teto de requisições por Pokémon);
    - `battle-opponent-factory.js`: Fábrica de equipe adversária de exatamente 3 Pokémon sem espécies duplicadas (`ENEMY_DUPLICATE_SPECIES = NO`), desacoplada da IA e da Engine;
    - `battle-session-controller.js`: Controlador do ciclo de vida da sessão de batalha coordenando preparação, submissão de ações, rolls de accuracy externos, integração com a SMART AI, troca forçada por nocaute, revanche e cleanup sem nunca calcular dano ou regras (`UI_DAMAGE_CALCULATION = 0`, `UI_TYPE_CALCULATION = 0`, `UI_WINNER_CALCULATION = 0`);
    - `battle-ui-adapter.js`: 5º irmão sob `CompositeBattleDomAdapter` convertendo comandos de apresentação (`HP_TRANSITION`, `PP_TRANSITION`, `FAINT_SEQUENCE`, `BATTLE_RESULT`, etc.) em atualizações visuais coordenadas;
    - `battle-view.js`: Gerenciador de renderização e eventos com feedback de bloqueio (`DOUBLE_SUBMIT = NO`), modais de troca voluntária e substituição forçada, HUDs ativos com barras de HP dinâmicas e painel de resultados;
    - `battle-arena.css`: Identidade visual original moderna com glassmorphism, background CSS dinâmico, plataforma de arena e responsividade completa (360px a 1366px);
  - 100% de separação e conformidade arquitetural:
    - `UI_DAMAGE_CALCULATION = 0`
    - `UI_TYPE_CALCULATION = 0`
    - `UI_WINNER_CALCULATION = 0`
    - `UI_HP_MUTATION = 0`
    - `UI_PP_MUTATION = 0`
    - `DOUBLE_SUBMIT = NO`
    - `PRODUCTION_FIXTURE_DEPENDENCY = 0`
    - `NETWORK_REQUESTS_DURING_RESOLVE_TURN = 0`
  - 100% de aprovação nos testes automatizados: 427 testes (58 novos testes: 8 de session + 50 de gates UI01 a UI50 + 369 testes de fases anteriores) com 0 falhas e 0 regressões.

---

## 5. Decisões Importantes Já Tomadas

1. **Stack Tecnológica**: JavaScript Vanilla ES6+, CSS3 modular e HTML5 semântico, sem migração forçada para frameworks (React/Vue/Svelte) ou empacotadores pesados antes da necessidade técnica real.
2. **Compatibilidade com GitHub Pages e Local**: Execução garantida via protocolo `file://`, servidores de desenvolvimento locais e GitHub Pages.
3. **Namespaces de Armazenamento**:
    - `pokedex_favorites`: IDs favoritos (preservado);
    - `pokedex_theme`: tema visual `'dark'` ou `'light'` (preservado);
    - `team.current`: `{ version: 1, pokemonIds: [25, 6, 94] }` (PBA-002);
    - `battle.*`: reservado para estados da Battle Arena (PBA-003+).
4. **Resiliência de Rede**: Dados de Pokémon do time são buscados sob demanda com cache em memória, apresentando estado localizado de erro caso a PokéAPI esteja indisponível sem quebrar a aplicação.
5. **Configurações Oficiais da Battle Engine (PBA-003)**:
   ```text
   BATTLE_SIMULATOR = ACTIVE
   POKEMON_BATTLE = 1X1
   TURN_BASED = YES
   AUTO_SPEED_ORDER = YES
   FAINT_LOGIC = ZERO_HP
   ENGINE_PURITY = 100%
   RANDOM_MODE = SEED_DETERMINISTIC
   ```
6. **Configurações Oficiais do Type System (PBA-004)**:
   ```text
   TYPE_SYSTEM = COMPLETE
   TOTAL_TYPES = 18
   IMMUNITIES = 0X
   SUPER_EFFECTIVE = 2X
   DOUBLE_SUPER_EFFECTIVE = 4X
   NOT_VERY_EFFECTIVE = 0.5X
   DOUBLE_NOT_VERY_EFFECTIVE = 0.25X
   NORMAL_EFFECTIVENESS = 1X
   ```
7. **Configurações Oficiais do Move System (PBA-005)**:
   ```text
   MOVE_SYSTEM = COMPLETE
   PHYSICAL_SPECIAL_SPLIT = YES
   DAMAGE_FORMULA = ACCURATE
   PP_SYSTEM = STRICT
   ACCURACY_SYSTEM = DETERMINISTIC
   STAB_BONUS = 1.5X
   ```
8. **Configurações Oficiais da Engine 3x3 (PBA-006)**:
   ```text
   BATTLE_ENGINE_3X3 = COMPLETE
   TEAM_SIZE = 3
   ORDER_MATTERS = YES
   ACTIVE_BENCH = SPLIT
   VOLUNTARY_SWITCH = PRIORITY_6
   FORCED_REPLACEMENT = REQUIRED
   WIN_CONDITION = 3_FAINTS
   ```
9. **Configurações Oficiais da Battle AI (PBA-007)**:
   ```text
   BATTLE_AI = COMPLETE
   AI_STRATEGY_SIMPLE = PASS
   AI_STRATEGY_SMART = PASS
   HEURISTIC_EVALUATION = ACCURATE
   AI_INTERNAL_RNG = 0
   AI_SWITCHING = TACTICAL
   AI_REPLACEMENT = OPTIMAL
   ```
10. **Configurações Oficiais do Move Visual Effects System (PBA-010)**:
   ```text
   MOVE_VFX_SYSTEM = YES
   TYPE_FAMILIES = 18
   EFFECT_ARCHETYPES = 8
   DYNAMIC_INTENSITY = YES
   PROJECTILE_ORIENTATION = YES
   SUPER_EFFECTIVE_VFX = YES
   IMMUNITY_VFX = DISSIPATE
   MISS_VFX = MISS_ONLY
   REDUCED_MOTION_VFX = YES
   VFX_RESOURCE_LEAK = NONE
   ```
11. **Configurações Oficiais do Battle Audio System (PBA-011)**:
   ```text
   BATTLE_AUDIO_SYSTEM = YES
   AUDIO_CONTEXT = YES
   AUTOPLAY_UNLOCK = YES
   MASTER_VOLUME = YES
   MUSIC_VOLUME = YES
   SFX_VOLUME = YES
   CRY_VOLUME = YES
   MUTE = YES
   TYPE_AUDIO_FAMILIES = 18
   ATTACK_SFX = YES
   IMPACT_SFX = YES
   MISS_SFX = YES
   IMMUNITY_SFX = YES
   POKEMON_CRY_INTEGRATION = YES
   BATTLE_MUSIC_FOUNDATION = YES
   VICTORY_AUDIO = YES
   DEFEAT_AUDIO = YES
   ```
12. **Configurações Oficiais do Battle Camera & Impact System (PBA-012)**:
   ```text
   BATTLE_CAMERA_SYSTEM = YES
   SCREEN_SHAKE = YES
   CAMERA_PUNCH = YES
   HIT_FLASH = YES
   IMPACT_HOLD = YES
   SUPER_EFFECTIVE_CAMERA = YES
   IMMUNITY_DAMAGE_SHAKE = NO
   MISS_DAMAGE_SHAKE = NO
   REDUCED_MOTION_CAMERA = YES
   CAMERA_RESOURCE_LEAK = NONE
   CAMERA_LAYOUT_THRASHING = NONE
   ```
13. **Configurações Oficiais da Final Battle UI (PBA-013)**:
   ```text
   FINAL_BATTLE_UI = YES
   REAL_3V3_GAMEPLAY = YES
   PLAYER_TEAM_SOURCE = team.current
   FULL_TEAM_REQUIRED = YES
   BATTLE_SESSION_LAYER = YES
   TEAM_HYDRATION = YES
   AUTO_MOVE_LOADOUT = YES
   SMART_AI_UI_INTEGRATION = YES
   EXTERNAL_RUNTIME_RNG = YES
   ENEMY_DUPLICATE_SPECIES = NO
   MOVE_SELECTION_UI = YES
   SWITCH_SELECTION_UI = YES
   FORCED_REPLACEMENT_UI = YES
   HP_UI = YES
   PP_UI = YES
   TEAM_STATUS_UI = YES
   VICTORY_UI = YES
   DEFEAT_UI = YES
   REMATCH = YES
   LEAVE_BATTLE_CLEANUP = YES
   KEYBOARD_ACCESSIBILITY = YES
   ARIA_HP = YES
   ARIA_BATTLE_MESSAGES = YES
   TRAINER_PROFILE = YES
   CAMPAIGN = NOT_YET
   ```

- **PBA-014 Trainer Profile (Perfil do Treinador) & Final Compliance**:
  - Implementação modular completa em `assets/js/trainer/`:
    - `trainer-store.js`: Armazenamento sob o namespace `trainer.profile` com schema versionado, ID estável gerado (`crypto.randomUUID()`), zero-state no primeiro acesso (0 batalhas, 0 vitórias/derrotas, histórico vazio), catálogo de 7 presets de avatar em CSS próprio (`default`, `ember`, `ocean`, `forest`, `electric`, `psychic`, `shadow`), recuperação segura de preset desconhecido para `'default'`, validação estrita de displayName (2..24 caracteres após trim), migração transparente de seeds demonstrativos antigos e proteção contra corrupção;
    - `trainer-manager.js`: Regras de negócio estritas com contrato de displayName (2..24 chars), seleção e persistência de avatar preset, idempotência total por `battleId` (duplicações bloqueadas), cálculo determinístico de `winRate` (`wins / battlesPlayed`), gestão de `currentWinStreak` e `bestWinStreak`, limite rigoroso de 10 batalhas no histórico (`MAX_RECENT_BATTLES = 10`, mais recente primeiro), validação e invalidação segura de Pokémon Companheiro fora do time (`COMPANION_INVALIDATION_SAFE`), e reset isolado de estatísticas preservando identidade, time e favoritos;
    - `trainer-ui.js`: Renderização moderna em glassmorphism do passaporte do treinador (`displayName: "Treinador"`), modal interativo de edição de perfil com seletor visual dos 7 presets de avatar e input validado de 2..24 caracteres, vitrine animada do companheiro com tipos, grid de 6 estatísticas de combate (zero-state limpo), visualização do time ativo e histórico das últimas batalhas;
  - Folha de estilo dedicada `assets/css/trainer-profile.css` com suporte responsivo a mobile (360x700, 390x844) e desktop (768x1024, 1366x768), compatível com tema Dark/Light;
  - Geração robusta de battleId: `generateCryptoBattleId()` utilizando `crypto.randomUUID()` e `crypto.getRandomValues()`, eliminando `Math.random()` do navegador na geração de chaves de batalha (`BATTLE_ID_USES_MATH_RANDOM_IN_BROWSER = NO`); Battle Engine totalmente desacoplado da responsabilidade de ID (`ENGINE_BATTLE_ID_RESPONSIBILITY = NO`);
  - Integração em tempo real com a Battle Arena: ao concluir combate (`VICTORY` ou `DEFEAT`), `BattleSessionController` gera `battleId` exclusivo criptográfico e registra o desfecho, turnos, líder e oponente automaticamente no histórico e estatísticas; batalhas abandonadas/canceladas NÃO contam;
  - Navegação fluida de 4 abas no cabeçalho: `Pokédex` | `Meu Time` | `Batalhar` | `Perfil`;
  - 100% de testes automatizados TP01–TP40 aprovados (463 testes totais passando, zero falhas).

---

## 6. Estado Atual do Repositório

- **Branch**: `main`
- **Status das Fases**:
  - `PBA-001 = PASS`
  - `PBA-002 = PASS`
  - `PBA-003 = PASS`
  - `PBA-004 = PASS`
  - `PBA-005 = PASS`
  - `PBA-006 = PASS`
  - `PBA-007 = PASS`
  - `PBA-008 = PASS`
  - `PBA-009 = PASS`
  - `PBA-010 = PASS`
  - `PBA-011 = PASS`
  - `PBA-012 = PASS`
  - `PBA-013 = PASS`
  - `PBA_013_FINAL_ACCEPTANCE = PASS`
  - `PBA_013_SPRITE_FIX = PASS`
  - `PBA_014 = PASS`
  - `PBA_014_FINAL_COMPLIANCE = PASS`
  - `DEFAULT_PROFILE_ZERO_STATS = PASS`
  - `DISPLAY_NAME_CONTRACT = 2..24`
  - `DISPLAY_NAME_MIN = 2`
  - `DISPLAY_NAME_MAX = 24`
  - `DISPLAY_NAME_TRIM = YES`
  - `PROFILE_DISPLAY_NAME_XSS = BLOCKED`
  - `AVATAR_PRESETS = YES`
  - `AVATAR_PRESET_COUNT = 7`
  - `AVATAR_SELECTION = PASS`
  - `AVATAR_PERSISTENCE = PASS`
  - `INVALID_AVATAR_RECOVERY = PASS`
  - `TRAINER_ID_GENERATED = YES`
  - `TRAINER_ID_STABLE = YES`
  - `BATTLE_ID_CRYPTO_SOURCE = YES`
  - `BATTLE_ID_USES_MATH_RANDOM_IN_BROWSER = NO`
  - `BATTLE_ID_NEW_PER_BATTLE = YES`
  - `BATTLE_ID_NEW_PER_REMATCH = YES`
  - `BATTLE_RESULT_IDEMPOTENCY = PASS`
  - `DUPLICATE_BATTLE_STAT_RECORD = NO`
  - `RECENT_BATTLES_MAX = 10`
  - `ABANDONED_BATTLE_COUNTED = NO`
  - `PUBLIC_BATTLE_STATS_UPDATE = PASS`
  - `PUBLIC_PROFILE_PERSISTENCE_AFTER_BATTLE = PASS`
  - `PUBLIC_REFRESH_DUPLICATE_RECORD = NO`
- **PBA-014B Battle Balance Foundation (Level 50 Stat Normalization + Damage Variance)**:
  - Criação do módulo puro e desacoplado `assets/js/battle/battle-stat-normalizer.js` implementando as fórmulas canônicas da Generation III+;
  - Linha de base estrita: Level 50 uniforme para todos (`SIMULATION_LEVEL = 50`), IV 31 perfeito, EV 0 neutro, Nature neutra (1.0);
  - Fórmulas canônicas: HP $= \lfloor ((2 \times \text{Base} + 31) \times 50) / 100 \rfloor + 60$, outros atributos $= \lfloor \lfloor ((2 \times \text{Base} + 31) \times 50) / 100 \rfloor + 5 \rfloor$;
  - Exceção canônica documentada: Shedinja (#292) fixado com HP = 1 (`SHEDINJA_POLICY = SPECIAL_CASE_HP_1_EXCLUDED_FROM_COHORT`);
  - Preservação dos Base Stats da Pokédex intactos (`POKEDEX_BASE_STATS_CHANGED = NO`), mantendo `combatant.baseStats` para auditoria e debug;
  - Variação aleatória de dano principal (85% .. 100%): geração externa desacoplada via `BattleRandomSource.rollDamage()` com `crypto.getRandomValues()` no browser e controle determinístico nos testes;
  - Preservação das fronteiras de Engine e AI: `BATTLE_ENGINE_INTERNAL_RNG = 0` e `BATTLE_AI_INTERNAL_RNG = 0`;
  - Helper determinístico `DamageCalculator.calculateDamageRange(...)` para avaliação de `minDamage`, `maxDamage` e `averageDamage`;
  - Semântica refinada de nocaute na SMART AI: diferenciação estrita entre `guaranteedKo` (roll 85) e `possibleKo` (roll 100), priorizando KOs garantidos;
  - Sem truques artificiais de balanceamento: `GLOBAL_DAMAGE_NERF = NO`, `ARBITRARY_HP_MULTIPLIER = NO`, `DAMAGE_CAP = NO`, `PER_SPECIES_LEVEL_BALANCING = NO`;
  - Ferramenta de análise `tests/balance/battle-balance-analyzer.js` e suíte de testes `tests/balance/battle-balance.test.js` cobrindo os 40 gates BAL01–BAL40;
  - Métricas comprovadas no cohort representativo: `NEUTRAL_OHKO_RATE_BEFORE = 11.1%` $\to$ `NEUTRAL_OHKO_RATE_AFTER = 0.0%`, média de hits para KO neutro aumentada de `2.89` para `4.67`;
  - 100% de testes automatizados aprovados (495 testes totais passando, zero falhas).

---

## 6. Estado Atual do Repositório

- **Branch**: `main`
- **Status das Fases**:
  - `PBA-001 = PASS`
  - `PBA-002 = PASS`
  - `PBA-003 = PASS`
  - `PBA-004 = PASS`
  - `PBA-005 = PASS`
  - `PBA-006 = PASS`
  - `PBA-007 = PASS`
  - `PBA-008 = PASS`
  - `PBA-009 = PASS`
  - `PBA-010 = PASS`
  - `PBA-011 = PASS`
  - `PBA-012 = PASS`
  - `PBA-013 = PASS`
  - `PBA_013_FINAL_ACCEPTANCE = PASS`
  - `PBA_013_SPRITE_FIX = PASS`
  - `PBA_014 = PASS`
  - `PBA_014_FINAL_COMPLIANCE = PASS`
  - `PBA_014B_TECHNICAL = PASS`
  - `BATTLE_STAT_NORMALIZATION = PASS`
  - `BATTLE_LEVEL = 50`
  - `DEFAULT_IV = 31`
  - `DEFAULT_EV = 0`
  - `DEFAULT_NATURE = NEUTRAL`
  - `DAMAGE_VARIANCE = 85_100`
  - `DAMAGE_RNG_EXTERNAL = YES`
  - `GLOBAL_DAMAGE_NERF = NO`
  - `DAMAGE_CAP = NO`
  - `PER_SPECIES_LEVEL_BALANCING = NO`
  - `NEUTRAL_OHKO_RATE_BEFORE = 11.1%`
  - `NEUTRAL_OHKO_RATE_AFTER = 0.0%`
  - `AVERAGE_NEUTRAL_HITS_TO_KO_BEFORE = 2.89`
  - `AVERAGE_NEUTRAL_HITS_TO_KO_AFTER = 4.67`
  - `HUMAN_BALANCE_ACCEPTANCE = PASS`
  - `PBA_014C_TECHNICAL = PASS`
  - `PBA_014C_HARDENING = PASS`
  - `PBA_014C_FINAL_HARDENING = PASS`
  - `PBA_014C_CLOSE = PASS`
  - `HIDDEN_POWER_SUPPORTED = NO`
  - `HIDDEN_POWER_DYNAMIC_TYPE_UNMODELED = YES`
  - `ERUPTION_SUPPORTED = NO`
  - `ERUPTION_REASON = POWER_FROM_USER_HP`
  - `WATER_SPOUT_SUPPORTED = NO`
  - `WATER_SPOUT_REASON = POWER_FROM_USER_HP`
  - `UNSUPPORTED_COMPLEX_MOVE_CLASSIFICATION = PASS`
  - `UNOWN_SUPPORTED_OFFENSIVE_MOVES = 0`
  - `UNOWN_BATTLE_COMPATIBLE = NO`
  - `UNOWN_FAKE_MOVE_INJECTED = NO`
  - `UNOWN_SESSION_PREFLIGHT = PASS`
  - `DITTO_BATTLE_COMPATIBLE = NO`
  - `WOBBUFFET_BATTLE_COMPATIBLE = NO`
  - `SMEARGLE_BATTLE_COMPATIBLE = NO`
  - `ZERO_SUPPORTED_API_OK_USES_NETWORK_FALLBACK = NO`
  - `NETWORK_FALLBACK_REQUIRES_FAILURE = YES`
  - `API_OK_FINAL_MOVES_ALL_FROM_API = YES`
  - `FAKE_MOVE_INJECTION_WITH_API_OK = 0`
  - `UNSUPPORTED_ENGINE_MOVESET_STATE = YES`
  - `ZERO_SUPPORTED_ENGINE_MOVES_REASON = YES`
  - `SESSION_BLOCKS_ZERO_MOVE_COMBATANT = YES`
  - `CONTROLLED_USER_MESSAGE = YES`
  - `MOVESET_TARGET = 4`
  - `FIRST_8_TRUNCATION_FIXED = YES`
  - `FULL_CANDIDATE_DISCOVERY = PASS`
  - `ELIGIBLE_SPECIES_4_MOVE_RATE = 100%`
  - `SPECIAL_LIMITED_SPECIES_SUPPORTED = YES`
  - `STATUS_MOVES = NOT_YET`
  - `MOVESET_HUMAN_ACCEPTANCE = PASS`
  - `PBA_015 = NOT_STARTED`

- **Working Tree**: Homologado tecnicamente com PBA-014C-CLOSE: classificação estrita de suporte a golpes complexos (`hidden-power` como `UNSUPPORTED_DYNAMIC_TYPE` / `DYNAMIC_TYPE_FROM_IVS`, `eruption` e `water-spout` como `UNSUPPORTED_VARIABLE_DAMAGE` / `POWER_FROM_USER_HP`), Unown (#201) com 0 golpes suportados e bloqueado com segurança no preflight da sessão, Kanto pool 13/13 com 4 golpes preservado, e 521 testes automatizados 100% passando.

---

## 7. Próxima Fase Planejada

```text
NEXT_STEP = WAIT_FOR_HUMAN_PBA_014D_TEST
```

*(Atenção: A Fase PBA-015 NÃO deve ser iniciada automaticamente; aguardar validação humana de jogabilidade e solicitação explícita do usuário).*

- **PBA-014D Battle UX & Quick Battle Variety — Technical Acceptance**:
  - PBA_014C = PASS
  - MOVESET_HUMAN_ACCEPTANCE = PASS
  - PBA_014D_TECHNICAL = PASS
  - IMMERSIVE_BATTLE_VIEW = PASS
  - DESKTOP_NO_SCROLL = PASS
  - MOBILE_NO_SCROLL = PASS
  - MOBILE_MOVES_GRID = 2X2
  - QUICK_ROSTER_SIZE_BEFORE = 13
  - QUICK_ROSTER_SIZE = 72
  - QUICK_ROSTER_GENERATIONS = 9
  - QUICK_ROSTER_TYPES = 18/18
  - ROSTER_SPECIES_WITH_4_MOVES = 72/72
  - OPPONENT_ROTATION = PASS
  - RECENT_ANTI_REPEAT = PASS
  - UNIQUE_SPECIES_30_BATTLES = 69
  - EXACT_TEAM_REPEATS_30_BATTLES = 0
  - ROSTER_COVERAGE_100_BATTLES = 95.83%
  - REAL_BROWSER_10_TEAMS_UNIQUE_SPECIES = 30/30
  - BATTLE_UX_HUMAN_ACCEPTANCE = PENDING
  - OPPONENT_VARIETY_HUMAN_ACCEPTANCE = PENDING
  - PBA_015 = NOT_STARTED

- **Working Tree**: PBA-014D technical implementada na mesma SPA; aguarda testes humanos de UX e variedade antes de declarar PBA_014D = PASS.

- BATTLE_UX_HUMAN_ACCEPTANCE = PASS
- OPPONENT_VARIETY_HUMAN_ACCEPTANCE = PASS
- PBA_014D = PASS
- PBA_015_TECHNICAL = PENDING_VALIDATION
- CAMPAIGN_HUMAN_ACCEPTANCE = PENDING
- PBA_015 = NOT_CLOSED_YET
- PBA_016 = NOT_STARTED

- PBA_015_TECHNICAL = HOLD (hardening in progress)

- STARTING_DRAFT_SIZE = 144
- DRAFT_MASTER_OVERLAP = ALLOWED
- MAX_INITIAL_SAME_MASTER_MEMBERS = 2
- MASTER_REWARD_ALREADY_OWNED_FILTER = PASS
- ROSTER_UNIQUE = YES

- PBA_015_IMPLEMENTATION = PASS
- PBA_015_AUTOMATED = PASS
- SHADOW_REVEAL = PASS
- TRUE_ENDING = PASS
- PBA_015_TECHNICAL = PENDING_PUBLIC_INTERACTIVE_VALIDATION

- PBA_015_IMPLEMENTATION = PASS
- PBA_015_AUTOMATED = PASS
- PBA_015_HUMAN_FIX_1 = PASS
- CAMPAIGN_HUMAN_ACCEPTANCE = PENDING_RETEST
- PBA_015 = NOT_CLOSED_YET
- PBA_016 = NOT_STARTED

- TRAINER_AVATAR_INFRA = PASS
- TRAINER_AVATAR_FALLBACK = PASS
- TRAINER_AVATAR_MASTER_CARDS = PASS
- TRAINER_AVATAR_PREPARATION = PASS
- TRAINER_AVATAR_REWARD = PASS
- TRAINER_AVATAR_BATTLE_METADATA = PASS
- SUPER_TRAINER_AVATAR_INFRA = PASS
- SHADOW_TRAINER_AVATAR_INFRA = PASS
- TRAINER_AVATAR_FINAL_ART = PENDING_ASSET_GENERATION
- CAMPAIGN_HUMAN_ACCEPTANCE = PENDING
- PBA_015 = NOT_CLOSED_YET
- PBA_016 = NOT_STARTED

- TRAINER_AVATAR_BATCH_1 = PASS
- TRAINER_AVATAR_FINAL_ART = PARTIAL_6_OF_20
- MASTER_ART = 6_OF_18
- SPECIAL_ART = 0_OF_2
- CAMPAIGN_HUMAN_ACCEPTANCE = PENDING
- PBA_015 = NOT_CLOSED_YET
- PBA_016 = NOT_STARTED

- TRAINER_AVATAR_FINAL_BATCH = PASS
- TRAINER_AVATAR_FINAL_ART = 20_OF_20
- MASTER_ART = 18_OF_18
- SPECIAL_ART = 2_OF_2
- TRAINER_AVATAR_TECHNICAL_ACCEPTANCE = PASS
- CAMPAIGN_HUMAN_ACCEPTANCE = PENDING
- PBA_015 = NOT_CLOSED_YET
- PBA_016 = NOT_STARTED

- PBA_015E_IMPLEMENTATION = PASS
- ENDGAME_TRIALS = PASS
- SUPER_TRAINER_SPOTLIGHT = PASS
- PBA_015E_TECHNICAL = PENDING_PUBLIC_VALIDATION
- CAMPAIGN_HUMAN_ACCEPTANCE = PENDING
- PBA_015 = NOT_CLOSED_YET
- PBA_016 = NOT_STARTED
- PBA_015F_IMPLEMENTATION = PASS
- ENDGAME_BOSS_PRESENTATION_POLISH = PASS
- PBA_015F_TECHNICAL = PENDING_PUBLIC_VALIDATION
- CAMPAIGN_HUMAN_ACCEPTANCE = PENDING
- PBA_015 = NOT_CLOSED_YET
- PBA_016 = NOT_STARTED
- PBA_015G_IMPLEMENTATION = PASS
- ELITE_ENDGAME_TRIALS = PASS
- PBA_015G_TECHNICAL = PENDING_PUBLIC_VALIDATION
- CAMPAIGN_HUMAN_ACCEPTANCE = PENDING
- PBA_015 = NOT_CLOSED_YET
- PBA_016 = NOT_STARTED

- PBA_015H_IMPLEMENTATION = PASS
- SHADOW_FINAL_CHALLENGE_VISUAL_POLISH = PASS
- PBA_015H_TECHNICAL = PENDING_PUBLIC_VALIDATION
- CAMPAIGN_HUMAN_ACCEPTANCE = PENDING
- PBA_015 = NOT_CLOSED_YET
- PBA_016 = NOT_STARTED

- PBA_015I_IMPLEMENTATION = PASS
- SHADOW_FINAL_STAND = PASS
- SHADOW_POKEMON_VISUAL_AURA = PASS
- TEMPORARY_TRIAL_REINFORCEMENTS = PASS
- PBA_015I_TECHNICAL = PENDING_PUBLIC_VALIDATION
- CAMPAIGN_HUMAN_ACCEPTANCE = PENDING
- PBA_015 = NOT_CLOSED_YET
- PBA_016 = NOT_STARTED

- PBA_015_CLOSE = PASS
- CAMPAIGN_TECHNICAL_ACCEPTANCE = PASS
- CAMPAIGN_AUTOMATED_ACCEPTANCE = PASS (574 PASS / 0 FAIL / 0 CANCELLED / 21 suites)
- CAMPAIGN_HUMAN_ACCEPTANCE = PASS
- PBA_015 = PASS
- PBA_016 = READY_TO_START
- PBA_015_SUMMARY = 18 Masters, 4 Endgame Trials, Super Trainer, Shadow Final Stand, temporary reinforcements, Shadow Aura, True Ending, trainer art 20/20, procedural Shadow boss music.

- PBA_016 = IN_PROGRESS
- PBA_016A = PASS
- PBA_016_BASELINE = 8e883548b611b8dbd22672662d633ba1f8282ea3
- PERFORMANCE_BASELINE_CAPTURED = YES
- ACCESSIBILITY_BASELINE_CAPTURED = YES
- SHADOW_FINAL_STAND_37_AUDITED = YES
- NEXT_PBA_016_PHASE = PBA_016B — Asset & loading evidence

- KEYBOARD_AUDIT = COMPLETE
- FOCUS_AUDIT = COMPLETE
- SEMANTIC_AUDIT = COMPLETE
- CONTRAST_AUDIT = COMPLETE (static/manual; automated engine unavailable)
- REDUCED_MOTION_AUDIT = COMPLETE
- MOBILE_AUDIT = COMPLETE
- AUDIT_DOCUMENT_CREATED = YES
- NEXT_PHASE_PRIORITIZED = YES
- PBA_017 = NOT_STARTED

- PBA_016B = PASS
- BROWSER_NETWORK_TRACE = PASS
- COLD_CACHE_MEASUREMENT = PASS
- WARM_CACHE_MEASUREMENT = PASS
- TRAINER_ART_DELIVERY_AUDITED = PASS
- CAMPAIGN_HOME_LOADING_AUDITED = PASS
- FINAL_STAND_37_PREPARATION_AUDITED = PASS
- LARGE_RESERVE_SELECTOR_AUDITED = NOT_MEASURABLE (browser automation limitation; no grid virtualization justified)
- DUPLICATE_FETCH_AUDIT = PASS
- OPTIMIZATION_DECISION_EVIDENCE_BASED = YES
- BEFORE_AFTER_COMPARISON = PASS
- VISIBLE_QUALITY_REGRESSION = NO
- FULL_REGRESSION = PASS (575 PASS / 0 FAIL / 0 CANCELLED / 21 suites)
- PUBLIC_VALIDATION = PASS
- NEXT_PBA_016_PHASE = PBA_016C — Accessibility Verification
- PBA_017 = NOT_STARTED
- PBA_016A = PASS
- PBA_016B = PASS
- PBA_016C = PASS
- PBA_016 = IN_PROGRESS
- PBA_016C_SUMMARY = Focus-visible controls, native profile trigger/dialog semantics, dialog focus containment and conditional Escape, campaign selection aria-pressed, CTA contrast correction, 44px mobile battle touch targets, 200% zoom, reduced motion, accessibility-tree and human keyboard verification passed.
- AUTOMATED_ACCESSIBILITY_GATES = PASS
- HUMAN_KEYBOARD_VERIFICATION = PASS
- CRITICAL_ACCESSIBILITY_BLOCKERS = 0
- PBA_016D = READY_TO_START
- NEXT_PBA_016_PHASE = PBA-016D — Final Performance & Accessibility Validation
- PBA_017 = NOT_STARTED
- PBA_016A = PASS
- PBA_016B = PASS
- PBA_016C = PASS
- PBA_016D = PASS
- PBA_016 = PASS
- PBA_016_SUMMARY = Final validation preserved measured 18 WebP Master thumbnails and full portraits, lazy/async loading, 37-card Final Stand without virtualization, responsive keyboard/focus/dialog semantics, contrast, touch targets, zoom, reduced motion, accessibility tree, and human keyboard acceptance.
- PERFORMANCE_FINAL_VALIDATION = PASS
- ACCESSIBILITY_FINAL_VALIDATION = PASS
- PERFORMANCE_REGRESSION = NO
- ACCESSIBILITY_REGRESSION = NO
- GAMEPLAY_REGRESSION = NO
- CRITICAL_OPEN_ISSUES = 0
- PBA_017 = READY_TO_START
- PBA_016 = PASS
- PBA_017 = IN_PROGRESS
- PBA_017A = PASS
- PBA_017A_SUMMARY = Release candidate and portfolio audit completed: public navigation, responsive smoke, repository hygiene and secret scan passed; README/status/campaign/testing presentation and HTML metadata require portfolio hardening.
- PBA_017B = READY_TO_START
- NEXT_PBA_017_PHASE = PBA-017B — Portfolio Presentation & Release Hardening
- PBA_016 = PASS
- PBA_017 = IN_PROGRESS
- PBA_017A = PASS
- PBA_017B = PASS
- PBA_017B_SUMMARY = README, Campaign presentation, reproducible test instructions, performance/accessibility evidence, factual IP/trainer-art disclaimer, current HTML title/description, and technical-document links updated without gameplay or runtime logic changes.
- PBA_017C = READY_TO_START
- NEXT_PBA_017_PHASE = PBA-017C — Portfolio Visuals & Release Preparation
- FINAL_PROJECT_RELEASED = NO
- PBA_016 = PASS
- PBA_017 = IN_PROGRESS
- PBA_017A = PASS
- PBA_017B = PASS
- PBA_017C = PASS
- PBA_017C_SUMMARY = Real portfolio screenshots, README gallery, social preview asset, v1.0.0 notes/checklist, and license options prepared without runtime changes. Owner license decision remains required.
- PBA_017D = BLOCKED_BY_OWNER_LICENSE_DECISION
- PBA_017D_BLOCKER = LICENSE_OWNER_DECISION
- LICENSE_OWNER_DECISION = MIT_FOR_ORIGINAL_SOURCE_CODE_ONLY
- LICENSE_PRESENT = YES
- PBA_017D = READY_TO_START
- PBA_017D_BLOCKER = NONE
- FINAL_PROJECT_RELEASED = NO
## PBA-017D — v1.0.0 Release & Final Project Closure

- RELEASE_VERSION = v1.0.0
- V1_TAG = PASS
- TAG_TARGET_COMMIT = 665e91dd00736e47ba4cd702026862ed7044cb0a
- GITHUB_RELEASE = PASS
- PBA_017 = PASS
- CRITICAL_OPEN_ISSUES = 0
- FINAL_PROJECT_RELEASED = YES
- PBA_018 = IN_PROGRESS
- PBA_018A = PASS
- PBA_018B = READY_TO_START

---

## PBA-018A — Type Arena System Foundation + 3-Arena Prototype

- ARENA_THEME_REGISTRY = PASS
- DEFAULT_ARENA_FALLBACK = PASS
- FIRE_ARENA = PASS
- WATER_ARENA = PASS
- ELECTRIC_ARENA = PASS
- ONE_BATTLE_VIEW = YES
- BATTLE_ENGINE_CHANGED = NO
- GAMEPLAY_CHANGED = NO
- QUICK_BATTLE_VISUAL_REGRESSION = NO
- SUPER_VISUAL_CHANGED = NO
- SHADOW_VISUAL_CHANGED = NO
- REDUCED_MOTION_ARENA = PASS
- MOBILE_VALIDATION = PASS
- DESKTOP_VALIDATION = PASS
- ARENA_STATE_LEAK = NO
- PARTICLE_LEAKS = 0
- FULL_REGRESSION = PASS
- FULL_TESTS_PASS = 599
- FULL_TESTS_FAIL = 0
- FULL_TESTS_CANCELLED = 0
- TOTAL_NEW_ASSET_BYTES = 259366 (253.3 KB)
- PBA_017 = PASS
- PBA_018 = IN_PROGRESS
- PBA_018A = PASS
- PBA_018B = PASS
- PBA_018C = READY_TO_START
- FINAL_PROJECT_RELEASED = YES

---

## PBA-018B — Complete 18 Type Arena Set

- TYPE_ARENAS_IMPLEMENTED = 18/18
- MASTER_ARENA_MAPPING = 18/18 PASS
- DEFAULT_FALLBACK = PASS
- ONE_BATTLE_VIEW = YES
- GAMEPLAY_CHANGED = NO
- BATTLE_ENGINE_CHANGED = NO
- QUICK_BATTLE_VISUAL_REGRESSION = NO
- TRIAL_VISUAL_CHANGED = NO
- SUPER_VISUAL_CHANGED = NO
- SHADOW_VISUAL_CHANGED = NO
- ALL_ARENAS_REDUCED_MOTION = PASS
- ALL_ARENAS_CONTRAST = PASS
- FLASH_SAFETY = PASS
- BROKEN_ARENA_IMAGES = 0
- ARENA_STATE_LEAK = NO
- PARTICLE_LEAKS = 0
- FULL_REGRESSION = PASS
- FULL_TESTS_PASS = 631
- FULL_TESTS_FAIL = 0
- FULL_TESTS_CANCELLED = 0
- SUITES = 21
- TOTAL_ARENA_ASSET_BYTES = 1553746 (1.51 MB)
- AVERAGE_ARENA_ASSET_BYTES = 86319 (84.3 KB)
- LARGEST_ARENA_ASSET = arena-grass.webp (133.0 KB)
- EXTERNAL_RUNTIME_ARENA_ASSETS = NO
- PBA_018B_SUMMARY = Expansão completa do sistema Type Arena para os 18 tipos elementais Pokémon com mapeamento 18/18 dos Mestres de Campanha, assets locais WebP leves e otimizados (~84.3 KB média), estilos de arena e partículas determinísticas com zero vazamentos e total isolamento visual sem alterar regras de jogo.
- PBA_017 = PASS
- PBA_018A = PASS
- PBA_018B = PASS
- PBA_018C = PASS
- PBA_018 = PASS
- TYPE_ARENAS = COMPLETE
- FINAL_PROJECT_RELEASED = YES
- PBA_019 = NOT_STARTED

---

## PBA-018C — Human Visual Acceptance & Final Arena Polish

- TYPE_ARENA_HUMAN_ACCEPTANCE = PASS
- NORMAL = PASS
- FIRE = PASS
- WATER = PASS
- ELECTRIC = PASS
- GRASS = PASS
- ICE = PASS
- FIGHTING = PASS
- POISON = PASS
- GROUND = PASS
- FLYING = PASS
- PSYCHIC = PASS
- BUG = PASS
- ROCK = PASS
- GHOST = PASS
- DRAGON = PASS
- DARK = PASS
- STEEL = PASS
- FAIRY = PASS
- APPROVED_ARENAS_MODIFIED = 0
- GAMEPLAY_CHANGED = NO
- BATTLE_ENGINE_CHANGED = NO
- QUICK_BATTLE_VISUAL_REGRESSION = NO
- TRIAL_VISUAL_CHANGED = NO
- SUPER_VISUAL_CHANGED = NO
- SHADOW_VISUAL_CHANGED = NO
- ARENA_STATE_LEAK = NO
- PARTICLE_LEAKS = 0
- FULL_REGRESSION = PASS
- FULL_TESTS_PASS = 631
- FULL_TESTS_FAIL = 0
- FULL_TESTS_CANCELLED = 0
- SUITES = 21
- PUBLIC_VALIDATION = PASS
- V1_TAG_MOVED = NO
- PBA_018C_SUMMARY = Validação visual humana de 100% das 18 arenas temáticas aprovada com louvor ("todas aprovadas"). Arquitetura e assets preservados sem modificações desnecessárias, zero vazamentos de estado, zero regressões visuais e suíte de testes 100% verde (631/631).

---

## PBA-019A — Special Boss & Endgame Trial Arenas

- SPECIAL_ARENAS_IMPLEMENTED = 6
- SUPER_ARENA = PASS
- SHADOW_ARENA = PASS
- LEGENDARY_TRIAL_ARENA = PASS
- MYTHICAL_TRIAL_ARENA = PASS
- TITANS_TRIAL_ARENA = PASS
- CELESTIAL_TRIAL_ARENA = PASS
- TRIAL_ARENA_MAPPING = 4/4 PASS
- BOSS_ARENA_MAPPING = 2/2 PASS
- ONE_BATTLE_VIEW = YES
- ARENA_REGISTRY_EXPANDED = YES
- GAMEPLAY_CHANGED = NO
- BATTLE_ENGINE_CHANGED = NO
- AI_CHANGED = NO
- DAMAGE_CHANGED = NO
- TYPE_MASTER_ARENAS_REGRESSION = NO
- QUICK_BATTLE_VISUAL_REGRESSION = NO
- SUPER_GAMEPLAY_CHANGED = NO
- SHADOW_GAMEPLAY_CHANGED = NO
- SHADOW_AURA_COMPATIBILITY = PASS
- SHADOW_THEME_COMPATIBILITY = PASS
- SPECIAL_ARENAS_REDUCED_MOTION = PASS
- SPECIAL_ARENAS_FLASH_SAFETY = PASS
- SPECIAL_ARENAS_CONTRAST = PASS
- BROKEN_SPECIAL_ARENA_IMAGES = 0
- ARENA_STATE_LEAK = NO
- PARTICLE_LEAKS = 0
- DESKTOP_1366x768 = PASS
- MOBILE_360x700 = PASS
- MOBILE_390x844 = PASS
- MOBILE_412x915 = PASS
- HORIZONTAL_OVERFLOW = 0
- CONTROLS_OBSCURED = 0
- NEW_ASSET_COUNT = 6
- TOTAL_NEW_ASSET_BYTES = 755010 (737.3 KB)
- AVERAGE_NEW_ASSET_BYTES = 125835 (122.9 KB)
- LARGEST_NEW_ASSET = arena-trial-mythical.webp (158018 bytes / 154.3 KB)
- EXTERNAL_RUNTIME_ARENA_ASSETS = NO
- SPECIAL_ARENAS_BROWSER_VALIDATED = 6/6
- FULL_REGRESSION = PASS
- FULL_TESTS_PASS = 651
- FULL_TESTS_FAIL = 0
- FULL_TESTS_CANCELLED = 0
- SUITES = 21
- V1_TAG_MOVED = NO
- PBA_019A_SUMMARY = Implementação das 6 novas arenas especiais para Bosses (Super Trainer e Shadow Super Trainer) e Endgame Trials (Legendary, Mythical, Titans e Celestial) utilizando a arquitetura aprovada em PBA-018. Preservação total de Battle Engine, IA, balanceamento, Quick Battle e das 18 arenas de tipo. Suíte de testes expandida para 651 testes com 100% de aprovação.

---

## PBA-019B — Special Arena Human Acceptance & Final Polish

- SPECIAL_ARENA_HUMAN_ACCEPTANCE = PASS
- SUPER = PASS
- SHADOW = PASS
- LEGENDARY_TRIAL = PASS
- MYTHICAL_TRIAL = PASS
- TITANS_TRIAL = PASS
- CELESTIAL_TRIAL = PASS
- ARENAS_ADJUSTED = 0
- APPROVED_SPECIAL_ARENAS_MODIFIED = 0
- ASSETS_REPLACED = 0
- CSS_ONLY_ADJUSTMENTS = 0
- TYPE_ARENAS = COMPLETE
- SPECIAL_ARENAS = COMPLETE
- TOTAL_THEMED_ARENAS = 24
- GAMEPLAY_CHANGED = NO
- BATTLE_ENGINE_CHANGED = NO
- AI_CHANGED = NO
- DAMAGE_CHANGED = NO
- TYPE_MASTER_ARENAS_REGRESSION = NO
- QUICK_BATTLE_VISUAL_REGRESSION = NO
- SUPER_GAMEPLAY_CHANGED = NO
- SHADOW_GAMEPLAY_CHANGED = NO
- SHADOW_AURA_COMPATIBILITY = PASS
- SHADOW_THEME_COMPATIBILITY = PASS
- SPECIAL_ARENAS_REDUCED_MOTION = PASS
- SPECIAL_ARENAS_FLASH_SAFETY = PASS
- SPECIAL_ARENAS_CONTRAST = PASS
- BROKEN_SPECIAL_ARENA_IMAGES = 0
- ARENA_STATE_LEAK = NO
- PARTICLE_LEAKS = 0
- FULL_REGRESSION = PASS
- FULL_TESTS_PASS = 651
- FULL_TESTS_FAIL = 0
- FULL_TESTS_CANCELLED = 0
- SUITES = 21
- PUBLIC_VALIDATION = PASS
- V1_TAG_MOVED = NO
- PBA_018 = PASS
- PBA_019 = PASS
- PBA_019A = PASS
- PBA_019B = PASS
- RELEASE_1_1 = PASS
- PBA_020 = NOT_STARTED
- PBA_019B_SUMMARY = Validação visual humana de 100% das 6 arenas temáticas especiais aprovada pelo proprietário ("todas aprovadas"). Arquitetura desacoplada mantida, assets otimizados preservados sem edições desnecessárias, zero vazamentos de estado ou partículas, compatibilidade total com Shadow Aura e áudio procedural, suíte de regressão verde (651/651) e catálogo com 24 arenas temáticas completas pronto para release v1.1.0.

---

## RELEASE-1.1 — Pokémon Battle Arena v1.1.0 — Arena Update

- RELEASE_1_1 = PASS
- RELEASE_VERSION = v1.1.0
- GITHUB_RELEASE_1_1 = PASS
- GITHUB_RELEASE_CREATED = YES
- GITHUB_RELEASE_PUBLIC = YES
- RELEASE_URL = https://github.com/spiritstonesrafa-ux/js-developer-pokedex/releases/tag/v1.1.0
- RELEASE_TAG = v1.1.0
- V1_1_RELEASE_COMMIT = 9a4ab5b09781ba58d9871f0040bd83779f669180
- V1_1_TAG_OBJECT_SHA = 3ab568ba898a86fafaa39da455e300779c9d95ba
- V1_1_TAG_TARGET_COMMIT = 9a4ab5b09781ba58d9871f0040bd83779f669180
- V1_TAG_OBJECT_SHA = 9790f6d97f23e850109c0f8559e489ddc599a0b5
- V1_TAG_TARGET_COMMIT = 665e91dd00736e47ba4cd702026862ed7044cb0a
- V1_TAG_MOVED = NO
- V1_1_TAG_MOVED_AFTER_RELEASE = NO
- TYPE_MASTER_ARENAS = 18/18
- SPECIAL_ARENAS = 6/6
- TOTAL_THEMED_ARENAS = 24
- ONE_BATTLE_VIEW = YES
- GAMEPLAY_CHANGED = NO
- BATTLE_ENGINE_CHANGED = NO
- AI_CHANGED = NO
- DAMAGE_CHANGED = NO
- FULL_REGRESSION = PASS
- FULL_TESTS_PASS = 651
- FULL_TESTS_FAIL = 0
- FULL_TESTS_CANCELLED = 0
- SUITES = 21
- PUBLIC_VALIDATION = PASS
- PUBLIC_BUILD_CURRENT = YES
- PUBLIC_HTTP_ERRORS = 0
- PUBLIC_BROKEN_IMAGES = 0
- PUBLIC_NEW_CONSOLE_ERRORS = 0
- SECRET_SCAN = PASS
- REPOSITORY_HYGIENE = PASS
- BROKEN_LINKS = 0
- PBA_018 = PASS
- PBA_019 = PASS
- PBA_019A = PASS
- PBA_019B = PASS
- CRITICAL_OPEN_ISSUES = 0
- PBA_020 = NOT_STARTED
- RELEASE_1_1_SUMMARY = Publicação oficial da versão v1.1.0 (Arena Update) no GitHub Releases e GitHub Pages. Introdução de 24 arenas temáticas completas (18 Mestres de Tipo, 4 Endgame Trials, Super Trainer e Shadow Super Trainer) com orquestração centralizada via Arena Registry, preservação estrita de Game Engine ≠ Presentation Engine, zero alteração de regras de combate ou IA, compatibilidade total com acessibilidade (prefers-reduced-motion e contraste) e suíte com 651 testes automatizados aprovados (100% verde).
