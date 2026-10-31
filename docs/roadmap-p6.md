# P6 — Proteção, carga/recarga e efeitos persistentes

Atualizado em 31/10/2026. **P6 em andamento.** Ciclos entregues: recarga obrigatória e proteção (Protect e Detect). Carga genérica em dois turnos, semi-invulnerabilidade, aprisionamento, barreiras, armadilhas de entrada e trocas especiais continuam pendentes.

## Proteção — Protect e Detect — implementados

Dois golpes de proteção canônicos com metadados oficiais e mecânica moderna (Geração VI+):
- **Protect (#182)**: Normal, Status, poder null, precisão null (auto-alvo / sempre acerta), PP 10 (máx 10), prioridade +4, alvo `self`, volatile `protect`.
- **Detect (#197)**: Fighting, Status, poder null, precisão null, PP 5 (máx 5), prioridade +4, alvo `self`, volatile `protect`.

### Regras mecânicas e resolução de turno:
1. **Prioridade +4**: Protect e Detect agem antes de golpes com prioridade +3 (Fake Out), +2 (Extreme Speed, First Impression), +1 (Aqua Jet, Quick Attack, Water Shuriken, Sucker Punch) e 0 (golpes comuns), independentemente da velocidade dos combatentes. Entre dois usuários de proteção, a velocidade desempata normalmente.
2. **Barreira protetora ativa (`isProtected = true`)**:
   - Bloqueia ataques físicos e especiais comuns, dano fixo constante (Sonic Boom, Dragon Rage), dano baseado em nível (Seismic Toss, Night Shade), dano fracionário (Super Fang, Nature's Madness, Ruination) e golpes de múltiplos acertos (Bullet Seed, Water Shuriken, etc. com 0 acertos e 0 de dano).
   - Bloqueia golpes de recarga (Hyper Beam, Giga Impact): o golpe bloqueado causa 0 de dano, consome PP e **NÃO agenda recarga**.
   - Bloqueia golpes de aplicação de status negativo (Thunder Wave, Toxic, Will-O-Wisp, Hypnosis, Confuse Ray) e quedas de atributos (Screech, Venom Drench).
   - Ataques bloqueados consomem seu PP normalmente (`PP_CHANGED`), bypassam teste de precisão, marcam `attacker.lastMoveFailed = true` e emitem evento `MOVE_FAILED` com `reason: 'BLOCKED_BY_PROTECT'`.
   - Nenhum dano de recuo é sofrido e nenhuma drenagem é recuperada pelo atacante bloqueado.
   - **Bide (#117)**: a proteção do oponente não impede os turnos 1 e 2 de armazenamento (`turnsLeft: 2` e `turnsLeft: 1`). Apenas no turno de liberação (turno 3) o dano acumulado pode ser bloqueado por Protect/Detect (`reason: 'BLOCKED_BY_PROTECT'`, causando 0 de dano). Em ambos os casos (acerto ou bloqueio), `bideState` é finalizado (`attacker.bideState = null`) e não permite retentativas.
3. **Golpes com alvo no usuário ultrapassam proteção**:
   - Movimentos com `target: 'self'` ou categoria `status_self` (Swords Dance #14, Calm Mind #347, Rest #156, Sleep Talk #214, Protect #182, Detect #197) são executados normalmente mesmo quando o adversário está protegido.
4. **Bypass sem quebra de proteção — Hyper Drill (#887)**:
   - Hyper Drill ultrapassa Protect e Detect do adversário sem remover nem quebrar a proteção (`isProtectBypassingMove`). Preserva a imunidade canônica de tipo (Normal vs Fantasma causa 0 de dano, emite `IMMUNE`), precisão, PP e dano regular. Regra centralizada no motor, avaliador (`BattleEvaluator`), IA (`BattleAI`) e apresentação. Hyper Drill promovido a suporte `FULL` (`knownPending: []`).
5. **Dano residual contínuo**:
   - Danos de final de turno por Burn, Poison e Toxic continuam causando dano ao combatente protegido normalmente (`isProtected` limpo no final do turno).
6. **Surging Strikes (#818)**:
   - Bloqueado normalmente por Protect/Detect, pois a habilidade Unseen Fist é escopo da Fase P7.
7. **Fórmula moderna de uso consecutivo (Geração VI+)**:
   - Chance de sucesso: $1 / D$, onde $D = \min(729, 3^{\text{stallCount}})$.
   - 1º uso consecutivo (stallCount 0): 100% de sucesso ($1/1$).
   - 2º uso consecutivo (stallCount 1): 1/3 (~33,33%).
   - 3º uso consecutivo (stallCount 2): 1/9 (~11,11%).
   - 4º uso consecutivo (stallCount 3): 1/27 (~3,70%).
   - 5º uso consecutivo (stallCount 4): 1/81 (~1,23%).
   - 6º uso consecutivo (stallCount 5): 1/243 (~0,41%).
   - 7º+ uso consecutivo (stallCount 6+): 1/729 (~0,14% - limite máximo canônico).
   - Protect e Detect compartilham o mesmo contador (`stallCount`). Alternar entre eles não reinicia o contador.
8. **Condições de reinicialização do contador (`stallCount = 0`)**:
   - Selecionar qualquer golpe diferente de proteção (incluindo quando chamado por Sleep Talk).
   - Falha na rolagem de proteção (emite `MOVE_FAILED`, `reason: 'PROTECT_FAILED'`, `lastMoveFailed: true`).
   - Imobilização por sono (`STATUS_IMMOBILIZED`), congelamento (`STATUS_IMMOBILIZED`), hesitação (`FLINCH_IMMOBILIZED`), autoagressão por confusão (`CONFUSION_DAMAGE`) ou paralisia plena (`STATUS_IMMOBILIZED`).
   - Turno de recarga obrigatória (`rechargeMoveId`).
   - Troca voluntária (`executeSwitch`) ou nocaute/substituição forçada (`resolveReplacement`).
9. **Sleep Talk chamando Protect/Detect**:
   - O contador `stallCount` não é zerado prematuramente na seleção de Sleep Talk.
   - Quando Sleep Talk sorteia Protect ou Detect, a rolagem de uso consecutivo é calculada usando o `stallCount` pré-existente e o mesmo denominador $\min(729, 3^{\text{stallCount}})$ tanto no `BattleSessionController` quanto no `BattleEngine`.
   - Se a rolagem falhar, `stallCount` é zerado para 0 e emite `PROTECT_FAILED`.
   - Se Sleep Talk chamar qualquer golpe não-protetor ou falhar (`REQUIRES_SLEEP`, `NO_CALLABLE_MOVE`), `stallCount` é zerado para 0.
   - Apenas Sleep Talk consome PP (1 PP); o golpe chamado não consome PP. Bide (#117), Beak Blast (#690) e Shell Trap (#704) permanecem estritamente excluídos dos candidatos de Sleep Talk.
10. **RNG determinístico externo**:
    - Motor e IA 100% determinísticos sem chamadas a `Math.random()`. Rolações vêm de `action.protectRoll` preparado por `BattleRandomSource.rollProtect(denominator)` e configurável em testes via `DeterministicRandomSource.setProtectSequence()`.
11. **Integração com Avaliador e IA**:
    - `BattleEvaluator`: reconhece prioridade 4, dano esperado 0, `power: null`, `accuracy: null`. Modela benefício defensivo baseado na maior ameaça direta do adversário multiplicada pela probabilidade $1/D$. Retorna 0 se o oponente estiver recarregando ou nocauteado. Quando o defensor está protegido, anula previsões de dano ofensivo e nocautes (exceto para golpes com bypass como Hyper Drill).
    - `BattleAI`: penaliza agressivamente uso consecutivo quando `stallCount >= 1`, não aplica bônus artificial de prioridade em golpes de proteção e zera a pontuação se o oponente não puder agir.
12. **Apresentação, Interface e VFX**:
    - `SUPPORT_MOVE_LABELS`: exibe `STATUS · PROTEÇÃO` com descrição concisa em vez de "Poder null".
    - `BattlePresentationMapper`: mapeia `isBlocked: true` no anúncio do golpe quando bloqueado.
    - `MoveVfxController`, `MoveVfxDomRenderer` e `BattleCameraResolver`: suprimem reações de impacto visual e tremores de câmera quando `isBlocked: true`.
    - `BattleUiDomAdapter`: mensagens contextuais para `PROTECTED_SELF`, `BLOCKED_BY_PROTECT` e `PROTECT_FAILED`.
13. **Inicialização estrita de combatentes**:
    - `createCombatant` inicializa estritamente `isProtected: false` e `stallCount: 0`.
    - `createBattle` e `createTeamBattle` iniciam todos os membros (ativos e reservas) sem proteção e sem penalidade de uso consecutivo acumulada, ignorando propriedades temporárias porventura presentes nos dados brutos e preservando a imutabilidade das entradas.
    - O primeiro Protect/Detect em uma nova batalha possui 100% de chance (denominador 1) sem penalidade herdada. Fixtures de testes configuram os combatentes diretamente no estado de batalha após a instanciação.

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
| Umbreon | Protect |
| Blaziken | Detect |
| Hitmonchan | Detect |

Learnsets conferidos contra Pokémon Showdown; Mega X usa o learnset herdado de Charizard, como forma estática já existente. Isso não implementa transformação durante a batalha.

Os quatro golpes fixos anteriores foram preservados. O limite permanece em seis opções por espécie. Para acomodar pilotos novos, foram substituídos extras em espécies específicas (como `swift` em Umbreon e `mega-kick` em Blaziken); Hitmonchan (#107) foi integrado com a adição de `detect`. Preferências antigas que usem opções removidas podem retornar ao padrão pela validação existente; nenhum save foi regravado diretamente.

Catálogo offline: **489 espécies com extras, 92 definições curadas, 1.347 registros aptos a batalhar**. Os 450 selecionáveis iniciais permanecem preservados.

## Próximos ciclos

1. Carga em dois turnos (Solar Beam, Skull Bash, Sky Attack, Razor Wind) e estados de semi-invulnerabilidade (Fly, Dig, Dive, Bounce), com PP, impedimentos e interações de alvo apropriados. Clima/itens permanecem dependências da P7.
2. Aprisionamento (Fire Spin, Whirlpool, Clamp, Bind, Wrap, Sand Tomb, Infestation), dano persistente, Leech Seed, armadilhas de entrada (Stealth Rock, Spikes, Toxic Spikes, Sticky Web) e remoção (Rapid Spin, Defog).
3. Trocas especiais e interceptação, incluindo U-turn, Volt Switch, Flip Turn, Parting Shot, Teleport, Baton Pass e Pursuit.
4. Barreiras (Reflect, Light Screen, Aurora Veil, Safeguard), golpes bloqueados por uso consecutivo e demais pilotos P6, com auditoria de dependências antes de declarar a fase concluída.

Bide, Beak Blast e Shell Trap já foram entregues no fechamento P5; isso não substitui as famílias genéricas restantes da P6. P1/P2/P3 ainda têm exceções pendentes; P7/P8 permanecem futuras.

## Validação

- **44 testes determinísticos** em tests/battle/p6-protect.test.js: metadados canônicos, prioridade +4, interceptação de golpes físicos/especiais/recharge/status/stat-drops/multihit/fixos/nível/fracionários, bypass de self-targeting, Surging Strikes bloqueado, escalonamento consecutivo $1/\min(729, 3^n)$, alternância de Protect/Detect, condições de reset do contador, residual Burn/Poison, integração com BattleEvaluator e BattleAI, BattleSessionController nos dois sentidos com RNG determinístico via BattleRandomSource, apresentação/VFX e supressão de impacto de câmera, opções da campanha e imutabilidade estrita; além de testes exaustivos das correções canônicas de Bide, Sleep Talk e Hyper Drill, e integridade estrita de inicialização de combatentes (zerando proteção e contador em batalhas 1v1 e 3v3).
- Suíte completa: **1.881 testes aprovados, 38 suítes, zero falhas, cancelados ou ignorados; saída 0**.
- Auditoria P5 preservada: 60 pilotos, 57 FULL, 3 PARTIAL somente por dependências externas, zero pendências P5.
- Auditoria P4: 327 conhecidos, 270 FULL (+1 por Hyper Drill), 57 PARTIAL (-1), zero pendências P4.
- Draft da campanha: 450 selecionáveis válidos, 50 por geração. Regeneração offline reprodutível e git diff --check conferidos.
- Ciclo de Protect/Detect mantido local sem commit, push ou deploy. P6 permanece em andamento.

## Referências

- [PokéAPI — moves.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/moves.csv): IDs, tipo, poder, precisão, PP e categoria.
- [Pokémon Showdown — moves.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts): família recharge e efeito mustrecharge.
- [Pokémon Showdown — conditions.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/conditions.ts): descanso antes dos impedimentos, ação bloqueada e remoção do estado.
- [Pokémon Showdown — learnsets.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/learnsets.ts): espécies e movimentos.
