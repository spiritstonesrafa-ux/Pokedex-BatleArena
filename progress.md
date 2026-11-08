# 📋 Registro de Progresso Contínuo — Pokédex Pro + Battle Arena

Arquivo de governança técnica para alinhamento e continuidade entre diferentes sessões e agentes de IA.

## Atualização — 08/11/2026: Implementação Canônica H8 — Lote Único de 14 Habilidades (Itens, Berries, Roubo, Recuperação e Informações — Showdown Gen IX)

- **Lote H8 Implementado e Homologado Localmente (14 Habilidades):**
  1. `gluttony` (Gen IV — Showdown ID 82): O portador consome pinch berries (Figy, Wiki, Mago, Aguav, Iapapa, Liechi, Ganlon, Salac, Petaya, Apicot) em 50% ou menos do HP máximo em vez do limiar normal de 25%. Respeita bloqueios de Unnerve/As One e Klutz.
  2. `unburden` (Gen IV — Showdown ID 84): Dobra a Speed do portador (2x) quando seu item é consumido, roubado ou removido em batalha. A bonificação cessa se um novo item for adquirido (via Harvest, Pickup, Magician, etc.) e é reiniciada ao sair de campo (`leave`). Entrar sem item não ativa a habilidade.
  3. `klutz` (Gen IV — Showdown ID 103): Suprime universalmente efeitos passivos e ativos do item segurado (Leftovers, Focus Sash, Choice Band/Specs/Scarf, Assault Vest). Permite usar golpes de status segurando Assault Vest e impede Choice lock. Não suprime Ability Shield e reativa os itens ao ser suprimida (Neutralizing Gas).
  4. `frisk` (Gen IV — Showdown ID 119): Ao entrar em campo, revela o item segurado do oponente em Singles e de ambos os oponentes ativos em Doubles. Suprimido por Neutralizing Gas.
  5. `anticipation` (Gen IV — Showdown ID 107): Ao entrar em campo, estremece se o oponente possuir golpes super-efetivos contra sua tipagem atual ou golpes OHKO (Fissure, Sheer Cold, Horn Drill, Guillotine). No Pokémon Showdown Gen IX, golpes de autodestruição (Self-Destruct, Explosion, Misty Explosion) NÃO ativam Anticipation incondicionalmente — ativam apenas se forem super-efetivos contra a tipagem do portador (ex: Misty Explosion contra tipo Dragon/Fighting/Dark). Respeita imunidades (ex: Electric contra Ground, ou Ground contra Flying/Levitate), singles e doubles, e neutralização por Neutralizing Gas (salvo Ability Shield).
  6. `forewarn` (Gen IV — Showdown ID 108): Ao entrar em campo, revela o golpe de maior poder base entre os oponentes ativos (OHKO = 150 BP, Counter/Mirror Coat/Metal Burst = 120 BP, golpes de poder variável = 80 BP). Desempate determinístico via `forewarnRoll`.
  7. `pickpocket` (Gen V — Showdown ID 124): Quando o portador sem item recebe golpe com dano de contato, rouba o item segurado do atacante (caso seja removível). Ativa Unburden na vítima espoliada. Respeita Sticky Hold e não ativa se o portador desmaiar ou já tiver item.
  8. `harvest` (Gen V — Showdown ID 139): No final de cada turno, restaura uma Berry consumida pelo portador com 50% de chance em clima normal (desempate determinístico via `harvestRoll`) e 100% sob Sol (Sun ou Desolate Land). Consumo imediato caso o HP esteja abaixo do limiar ao restaurar.
  9. `cheek-pouch` (Gen VI — Showdown ID 167): Restaura 1/3 do HP máximo do portador adicionalmente sempre que este consome qualquer tipo de Berry (cura, pinch, atributos, status ou resist berries). Acumula com a cura própria da berry.
  10. `magician` (Gen VI — Showdown ID 170): Quando o portador sem item atinge o alvo com golpe causador de dano, rouba o item segurado do alvo caso seja removível. Respeita Sticky Hold (salvo Mold Breaker) e ativa Unburden na vítima. Multi-hit rouba no máximo uma vez.
  11. `sticky-hold` (Gen III — Showdown ID 60): Protege o item contra roubo (Thief, Magician, Pickpocket) e remoção (Knock Off). Nega o bônus de 1.5x de poder de Knock Off (salvo atacante com Mold Breaker).
  12. `ripen` (Gen VIII — Showdown ID 247): Dobra os efeitos de Berries consumidas: dobra a cura de Sitrus (50% max HP), Oran (20 HP) e pinch healing berries (66.7%), dobra os estágios concedidos por pinch stat berries (+2 estágios) e dobra a redução de dano de resist berries (0.25x em vez de 0.5x).
  13. `cud-chew` (Gen IX — Showdown ID 291): Ao consumir uma Berry durante o turno, agenda uma segunda mastigação para o final do turno seguinte (`CUD_CHEW_SCHEDULED`). No final do turno seguinte, repete o efeito da Berry (`CUD_CHEW_ACTIVATED`). Bloqueado se Unnerve estiver ativo e cancelado ao trocar de Pokémon (`leave`).
  14. `pickup` (Gen III — Showdown ID 53): No final do turno, caso o portador não esteja segurando nenhum item, recolhe um item consumido por outro Pokémon ativo durante o turno. Não duplica itens se houver múltiplos portadores de Pickup. Regain do item desativa Unburden se o usuário possuir a habilidade.

- **Suíte de Testes H8 Dedicada (67 Testes — 100% PASS):**
  - `tests/battle/abilities-h8.test.js`: 62 testes determinísticos e exaustivos cobrindo as 14 habilidades, casos de borda, interações com itens, Unnerve, Mold Breaker, doubles, trocas e metadados.

- **Validação Global e Inventário:**
  - H8: **67/67 PASS** (0 falhas).
  - Suíte Global do Projeto: **4.772/4.772 PASS** (75 suítes, 0 falhas, 0 regressões).
  - Auditoria de Habilidades (`scripts/audit-abilities.js --check`): 100% PASS.
  - Auditoria P8 (`scripts/audit-p8.js`): 100% PASS (`unresolvedP8: 0`).
  - Habilidades conhecidas: **374**.
  - Habilidades declaradas com suporte: **288** (+14).
  - Pendências atribuídas: **26** (-14).
  - Pendências restantes na Família H8: **0** (Família H8 100% concluída!).
  - Hashing de integridade `minior-shields-down-harness.html`: SHA-256 `B673B72A1A446016513D759D0B16835E9A5AB5D01F8C3E6EF2D13FC34BCA9A1E` idêntico ao baseline.
  - Estilização `assets/css/battle-arena.css`: 100% intocada.
  - Status Git: Staging vazio, zero commits, implementação 100% local pronta para homologação.

## Atualização — 08/11/2026: Conferência Canônica Final — Crunch e Secret Power — Lote H5 (Conformidade Showdown Gen IX)

- **Conferência Canônica e Refinamentos Finais Consolidados:**
  1. `parental-bond` & `crunch` (Chance Canônica Oficial):
     - Investigação e diagnóstico do catálogo: Crunch (ID 242) já estava registrado no catálogo oficial do PBA (`battle-constants.js:287` e `line 953`) com a chance canônica exata de 20% (`chance: 20`) e redução de -1 de Defesa (`statDrops: { defense: -1 }`). O valor de 50% mencionado anteriormente tratava-se exclusivamente de uma fixture sintética de teste com probabilidade artificial injetada no override do movimento.
     - 4 testes de limites probabilísticos com RNG determinístico adicionados em `tests/battle/abilities-h5.test.js` usando o movimento do catálogo:
       * [20, 21]: ativação no primeiro hit (<= 20) e falha no segundo (> 20) -> -1 estágio de Defesa.
       * [21, 20]: falha no primeiro hit (> 20) e ativação no segundo (<= 20) -> -1 estágio de Defesa.
       * [20, 20]: ambos ativam (<= 20) -> -2 estágios acumulados de Defesa.
       * [21, 21]: ambos falham (> 20) -> 0 alteração de estágios de Defesa.
  2. `parental-bond` & `secret-power` (Exceção Showdown do Primeiro Acerto):
     - No Pokémon Showdown Gen IX (`battle-actions.ts`), o gancho `onSourceModifySecondaries` de Parental Bond filtra os efeitos secundários de Secret Power no primeiro acerto (`index === 0`), preservando especificamente efeitos do tipo `volatileStatus === 'flinch'` (`secondaries.filter(effect => effect.volatileStatus === 'flinch')`).
     - Efeitos de terreno (Sleep em Grassy Terrain, Special Attack -1 em Misty Terrain, Speed -1 em Psychic Terrain e Paralysis no terreno padrão) são filtrados e suprimidos no hit 1, ativando exclusivamente no golpe final (hit 2).
     - Efeitos de Flinch (decorrentes de itens ou habilidades como Stench) são preservados no hit 1 e podem infligir Flinch no alvo no primeiro impacto.
     - Interação com Substitute: hit 1 quebra o Substitute adversário; hit 2 atinge o Pokémon real e aplica a condição/estágio secundário normalmente.
     - Supressão por Sheer Force: anula integralmente ambos os impactos e amplifica o dano base.
     - Ausência de King's Rock / Razor Fang: verificado formalmente no codebase (`assets/js/battle/p7-mechanics.js:14`) que esses itens não existem no PBA. Documentado como fora de escopo de H5 para evitar adições não autorizadas.
  3. `emergency-exit` / `wimp-out`:
     - Resolução completa de multi-hit: sequências de múltiplos impactos concluem TODOS os golpes planejados antes de acionar a troca forçada (`pendingPivot`).
     - Nocaute em multi-hit: caso o portador desmaie durante a sequência de multi-hit, o desmaio é resolvido normalmente e `emergency-exit` não gera troca forçada (`pendingPivot: undefined`).
     - Supressão de golpes de pivot adversários: quando atingido por U-turn, Volt Switch ou Flip Turn, a troca forçada de Emergency Exit tem precedência absoluta e o pivot do adversário é bloqueado.
     - Reativação após cura: se curado acima de 50% de HP no decorrer da batalha, o cruzamento subsequente do limiar de 50% reativa `emergency-exit` normalmente.
     - Supressão por Sheer Force: golpes com efeito secundário executados por atacantes com Sheer Force suprimem o acionamento de Emergency Exit.
  4. `quick-draw`:
     - Prioridade fracionária (+0.1) garante precedência contra oponentes mais rápidos dentro da mesma faixa de prioridade (prioridade 0).
     - Não supera movimentos de prioridade estrita superior (+1 ou maior).
     - Não ativa em movimentos da categoria Status.
     - Precedência garantida sobre Stall (-0.1) e Mycelium Might (-0.1).
     - Empate de ativação simultânea entre dois portadores desempata pela Speed de batalha.

- **Suíte de Testes H5 Final Consolidada (63 Testes — 100% PASS):**
  - `tests/battle/abilities-h5.test.js`: 63 testes determinísticos cobrindo integralmente as 18 habilidades e todas as verificações canônicas de Parental Bond, Crunch (20% oficial com limites [20, 21], [21, 20], [20, 20], [21, 21]), Secret Power (supressão de status no hit 1, ativação no hit 2, Grassy Terrain, Misty Terrain, preservação de Flinch no hit 1, Substitute e Sheer Force).

- **Validação Global e Inventário:**
  - H5: 63 testes PASS (0 falhas).
  - Suíte Global do Projeto: **4.705/4.705 PASS** (59 suítes, 0 falhas, 0 regressões).
  - Habilidades conhecidas: **374**.
  - Habilidades declaradas com suporte: **274**.
  - Pendências atribuídas: **40**.
  - Pendências restantes na Família H5: **0** (Família H5 100% concluída!).
  - Auditoria de Habilidades (`scripts/audit-abilities.js --check`): 100% PASS.
  - Auditoria P8 (`scripts/audit-p8.js`): 100% PASS (`unresolvedP8: 0`).
  - Hashing de integridade `minior-shields-down-harness.html`: SHA-256 `B673B72A1A446016513D759D0B16835E9A5AB5D01F8C3E6EF2D13FC34BCA9A1E` idêntico ao baseline.
  - Estilização `assets/css/battle-arena.css`: 100% intocada.

## Atualização — 08/11/2026: Implementação Canônica e Fechamento da Família H4 (H4-C — Supersweet Syrup)

- **Lote H4-C Implementado e Homologado (Fechamento da Família H4):**
  1. `supersweet-syrup` (Gen IX — Showdown ID 306): Reduz a evasão dos oponentes adjacentes em exatamente 1 estágio na primeira entrada do portador em combate.
  - Ativação estritamente única por portador por batalha (`syrupTriggered` persistente na instância do Pokémon na equipe). Reentradas posteriores ou trocas contínuas não reativam a habilidade.
  - Oponentes protegidos por Substitute (`substitute` ou `substituteHp > 0`) são imunes à redução (emite evento canônico `ABILITY_IMMUNE` com reason `'SUBSTITUTE'`), mas a ativação única do portador é consumida.
  - Em batalhas de Duplas (Doubles), atinge ambos os adversários adjacentes ativos e preserva o Pokémon aliado.
  - Interação canônica com proteções e inversões de atributos: bloqueada por Clear Body, White Smoke e Full Metal Body; invertida para +1 de evasão por Contrary; refletida de volta ao portador por Mirror Armor; ativa bônus ofensivos em Defiant (+2 Attack) e Competitive (+2 Special Attack).
  - Interação com Neutralizing Gas: suprimida se Gas estiver ativo na entrada (sem consumir `syrupTriggered`). Reativa canonicamente após o término de Gas (`gasEndsCheck` / `handleFaint` / `leave`) se o portador ainda estiver elegível no campo. Portador segurando Ability Shield ignora Neutralizing Gas.
  - Copiável por Trace e Imposter/Transform na entrada.
  - Integrada à sincronização de estágios em `battle-constants.js` (`applyStatStageChange` com clamp [-6, +6]).
  - Alinhada à IA do `BattleEvaluator` (reconhece benefício e maior acerto esperado contra alvos em -1 de evasão).
  - Validada em fluxo completo de sessão com `BattleSessionController`.

- **Suíte de Testes H4-C (28 Testes — 100% PASS):**
  - `tests/battle/abilities-h4c.test.js`: 28 testes determinísticos (100% PASS) cobrindo metadados e registro, ativação em Singles/Doubles, consumo e persistência estrita de `syrupTriggered`, múltiplos portadores, limites de estágio (-6), imunidade por Substitute, interações com 8 habilidades reativas/protetoras, ciclo de vida com Neutralizing Gas e Ability Shield, cópias por Trace/Transform, integração na precisão/evasão, Keen Eye (conforme especificação canônica do motor), previsões da IA e orquestração em sessão real.

- **Validação Global e Inventário:**
  - H4-C: 28 testes PASS (0 falhas).
  - H4-B: 34 testes PASS (0 falhas).
  - H4-A: 93 testes PASS (0 falhas).
  - Suíte Global do Projeto (`npm.cmd test`): **4.642 testes PASS (42 suítes, 0 falhas)**.
  - Habilidades declaradas com suporte: **259** (+1 em relação a H4-B).
  - Pendências atribuídas: **55** (-1 em relação a H4-B).
  - Pendências restantes na Família H4: **0** (Família H4 100% concluída!).
  - Auditoria de Habilidades (`scripts/audit-abilities.js --check`): 100% PASS.
  - Auditoria P8 (`scripts/audit-p8.js`): 100% PASS.
  - Governança Git: Working tree estritamente local; harness de Minior intacto e não rastreado; CSS e PBA-020 preservados. Sem commits ou push antes da autorização expressa do usuário.

## Atualização — 08/11/2026: Implementação Canônica e Homologação do Lote H4-B (10 Habilidades Canônicas Gen IX + Booster Energy)

- **Lote H4-B Implementado e Homologado (10 Novas Habilidades Canônicas Gen IX):**
  1. `seed-sower` (Gen IX): Ativa Grassy Terrain por 5 turnos (8 turnos com Terrain Extender) ao receber dano de ataque direto de qualquer golpe (físico ou especial). Não ativa em dano residual. Suprimido por Neutralizing Gas e Gastro Acid.
  2. `grass-pelt` (Gen VI): Aumenta a Defense do portador em 1.5x enquanto Grassy Terrain estiver ativo no campo. Ignorado por atacantes com Mold Breaker (`flags: { breakable: 1 }`, canônico Showdown).
  3. `surge-surfer` (Gen VII): Dobra a Speed do portador sob Electric Terrain (multiplicador 2.0x), sem exigir que o Pokémon esteja aterrado.
  4. `hadron-engine` (Gen IX): Invoca Electric Terrain na entrada; se o terreno já estiver ativo, ativa sem reiniciar o terreno; concede bônus de 5461/4096 (~1.33x) ao Special Attack sob Electric Terrain. Não copiável por Trace/Receiver, não trocável e não sobrescrevível.
  5. `protosynthesis` (Gen IX): Aumenta o maior atributo do portador em 1.5x (Speed) ou ~1.3x (5325/4096 outros) sob Sun / Desolate Land ou ao consumir Booster Energy. Desempate canônico Showdown: Atk > Def > SpA > SpD > Spe. O bônus obtido por Booster Energy persiste até o portador sair de campo.
  6. `quark-drive` (Gen IX): Aumenta o maior atributo do portador em 1.5x (Speed) ou ~1.3x (5325/4096 outros) sob Electric Terrain ou ao consumir Booster Energy. Desempate canônico Showdown: Atk > Def > SpA > SpD > Spe. O bônus obtido por Booster Energy persiste até o portador sair de campo.
  7. `vessel-of-ruin` (Gen IX): Reduz o Special Attack de todos os outros combatentes no campo em 25% (0.75x). Portadores são imunes. Não acumula com múltiplos portadores idênticos; acumula com outras Ruínas. Não quebrável por Mold Breaker (`flags: {}`). Suprimível por Neutralizing Gas.
  8. `sword-of-ruin` (Gen IX): Reduz a Defense de todos os outros combatentes no campo em 25% (0.75x). Portadores são imunes. Não acumula com múltiplos portadores idênticos; acumula com outras Ruínas. Não quebrável por Mold Breaker (`flags: {}`). Suprimível por Neutralizing Gas.
  9. `tablets-of-ruin` (Gen IX): Reduz o Attack de todos os outros combatentes no campo em 25% (0.75x). Portadores são imunes. Não acumula com múltiplos portadores idênticos; acumula com outras Ruínas. Não quebrável por Mold Breaker (`flags: {}`). Suprimível por Neutralizing Gas.
  10. `beads-of-ruin` (Gen IX): Reduz a Special Defense de todos os outros combatentes no campo em 25% (0.75x). Portadores são imunes. Não acumula com múltiplos portadores idênticos; acumula com outras Ruínas. Não quebrável por Mold Breaker (`flags: {}`). Suprimível por Neutralizing Gas.

- **Item Canônico booster-energy Integrado:**
  - Registrado no catálogo de batalha com ID Showdown 1880 e em `QUICK_ITEMS` do customizador de campanha.
  - Consumido automaticamente apenas quando nem clima (Sun) nem terreno (Electric Terrain) correspondentes estão ativos.
  - Protegido contra roubo/remoção por Knock Off ou Thief quando segurado por Pokémon Paradox.
  - O boost resultante de Booster Energy persiste mesmo com transições de clima/terreno até a troca do portador.

- **Suíte de Testes H4-B (34 Testes — 100% PASS):**
  - `tests/battle/abilities-h4b.test.js`: 34 testes determinísticos (100% PASS) cobrindo ativações de terreno, ordens canônicas de entrada, duração de Grassy Terrain com Terrain Extender, desempate e multiplicadores Paradox (getBestStat(false, true)), fixação de atributo e recálculo após expiração, consumo imediato de Booster Energy após término de clima/terreno, proteção contra consumo por Pokémon Transformado, imunidade contra roubo/remoção por Knock Off/Thief em Paradox, supressões por Neutralizing Gas, cálculos do quarteto de Ruínas em Singles/Doubles/Espelho e integração com a IA do BattleEvaluator.

- **Validação Global e Inventário:**
  - H4-B: 34 testes PASS (0 falhas).
  - H4-A: 93 testes PASS (0 falhas).
  - Suíte Global do Projeto (`npm.cmd test`): 4.614 testes PASS (42 suítes, 0 falhas).
  - Auditoria de Habilidades (`scripts/audit-abilities.js --check`): 258 declaradas suportadas (+10), 56 pendentes associadas (-10), 1 única pendência restante na Família H4 (`supersweet-syrup` reservada estritamente para H4-C).
  - Auditoria P8 (`scripts/audit-p8.js`): 100% PASS (0 pendências P8 não resolvidas).
  - Governança Git: Working tree estritamente local; harness de Minior intacto e não rastreado; CSS e PBA-020 preservados. Sem commits ou push antes da autorização expressa do usuário.

## Atualização — 06/11/2026: Auditoria Corretiva Final e Homologação do Lote H4-A (10 Novas Habilidades Canônicas Gen IX + 5 Preexistentes Auditadas)

- **Lote H4-A Implementado e Homologado (10 Novas Habilidades Canônicas Gen IX):**
  1. `primordial-sea` (Gen VI): Ativa chuva primordial permanente na entrada. Anula completamente ataques ofensivos do tipo Fire (evaporam via tryHit). Impede a sobreposição por climas comuns (Rain Dance, Sunny Day, Sandstorm, Snowscape falham). Amplifica ataques Water em 1.5x. Swift Swim dobra velocidade. Thunder e Hurricane nunca erram. Desativa quando o portador sai de campo ou desmaia (preservando outros Kyogres ativos).
  2. `desolate-land` (Gen VI): Ativa sol primordial permanente na entrada. Anula e evapora completamente ataques ofensivos do tipo Water (tryHit). Impede a sobreposição por climas comuns. Amplifica ataques Fire em 1.5x. Solar Beam dispara instantaneamente sem carregar. Chlorophyll dobra velocidade. Desativa quando o portador sai ou desmaia.
  3. `delta-stream` (Gen VI): Ativa correntes de ar misteriosas permanentes na entrada. Remove a contribuição de fraquezas elementais (Ice, Electric, Rock) contra Pokémon do tipo Flying (reduz de 2x para 1x; Rayquaza Dragon/Flying sofre 2x de Ice em vez de 4x, 0.5x de Electric e 1x de Rock). Impede a sobreposição por climas comuns. Desativa quando o portador sai ou desmaia.
  4. `dry-skin` (Gen IV): Imunidade a ataques Water, recuperando 25% do HP máximo (tryHit). Sofre 1.25x (+25%) de dano de ataques do tipo Fire. Recupera 1/8 do HP máximo no final do turno sob Rain/Primordial Sea e sofre 1/8 de dano sob Sun/Desolate Land. Quebrável por Mold Breaker.
  5. `ice-body` (Gen IV): Recupera 1/16 do HP máximo no final do turno sob Snow ou Hail. Concede imunidade total a dano residual de granizo. Não cura sob clima limpo, chuva, sol ou areia.
  6. `flower-gift` (Gen IV): Sob sol forte ou sol primordial, Cherrim transforma-se na Sunshine Form (#42101) e concede bônus de 1.5x (+50%) ao Ataque e Defesa Especial para si e para os aliados da equipe. Reverte à forma Overcast (#421) quando o sol cessa ou sob supressão.
  7. `sand-spit` (Gen VIII): Ativa uma tempestade de areia (Sandstorm) de 5 turnos (8 com Smooth Rock) ao sofrer dano direto de qualquer golpe físico ou especial. Ativa mesmo se desmaiar com o golpe. Não sobrepõe climas primordiais.
  8. `orichalcum-pulse` (Gen IX): Ativa Sunny Day na entrada (5 turnos, 8 com Heat Rock). Sob sol forte ou sol primordial, concede bônus de ~33.3% ao Ataque (multiplicador 5461/4096) sem alterar estágios de atributo.
  9. `transistor` (Gen VIII): Amplifica atributos ofensivos em 1.3x (multiplicador 5325/4096 em Gen IX aplicado uma única vez em stat() para movimentos Electric físicos e especiais, sem dupla aplicação em dano final ou BattleEvaluator).
  10. `dragons-maw` (Gen VIII): Amplifica atributos ofensivos em 1.5x (aplicado uma única vez em stat() para movimentos Dragon físicos e especiais, sem dupla aplicação em dano final ou BattleEvaluator).

- **5 Habilidades Preexistentes Auditadas e Validadas:**
  1. `dark-aura` (Gen VI): Amplifica movimentos Dark em 4/3 (~1.33x) para todos em campo; invertida por Aura Break; suprimida por Neutralizing Gas.
  2. `fairy-aura` (Gen VI): Amplifica movimentos Fairy em 4/3 (~1.33x) para todos em campo; invertida por Aura Break; suprimida por Neutralizing Gas.
  3. `aura-break` (Gen VI): Inverte efeitos das auras para 0.75x; metadados e comportamento canônico alinhados ao Showdown Gen IX (`flags: { breakable: 1 }`, `breakable: true`); Mold Breaker ignora Aura Break ao atacar Zygarde diretamente (auras aplicadas a 4/3); Ability Shield protege Aura Break contra Mold Breaker; em Doubles, ataque ao parceiro de Zygarde preserva Aura Break (0.75x); suprimida por Neutralizing Gas.
  4. `prism-armor` (Gen VII): Reduz dano super efetivo em 25% (0.75x); não é quebrada por Mold Breaker, Teravolt ou Turboblaze; suprimível por Gastro Acid e Neutralizing Gas.
  5. `neuroforce` (Gen VII): Aumenta dano super efetivo em 25% (1.25x); suprimida por Neutralizing Gas.

- **Suítes de Testes H4-A (93 Testes — 100% PASS):**
  - `tests/battle/abilities-h4a.test.js`: 42 testes PASS (Auras, Aura Break canônico com Mold Breaker / Ability Shield / Doubles, Prism Armor inquebrável, Neuroforce, IA e espécies reais Yveltal, Xerneas, Zygarde, Necrozma, Ultra Necrozma).
  - `tests/battle/abilities-h4a-weathers.test.js`: 30 testes PASS (Primordial Sea, Desolate Land, Delta Stream, Sand Spit, Flower Gift, mudança de forma de Cherrim, persistência com dois portadores em Doubles, cancelamento por Neutralizing Gas e supressão de efeitos por Cloud Nine/Air Lock).
  - `tests/battle/abilities-h4a-multipliers.test.js`: 21 testes PASS (Dry Skin, Ice Body, Orichalcum Pulse, Transistor, Dragon's Maw, Neutralizing Gas, 7 comparações canônicas de dano numérico e prevenção de dupla aplicação, alinhamento com BattleEvaluator).

- **Validação Global e Inventário:**
  - H4-A: 93 testes PASS (0 falhas).
  - H3-B: 178 testes PASS (0 falhas).
  - H3-A: 181 testes PASS (0 falhas).
  - H2: 463 testes PASS (0 falhas).
  - H1: 221 testes PASS (0 falhas).
  - Testes Globais do Projeto (`npm.cmd test`): 4.577 testes PASS (0 falhas).
  - Auditoria de Habilidades (`scripts/audit-abilities.js --check`): 248 declaradas com suporte (+10), 66 pendentes associadas (-10), 11 pendências restantes na Família H4 (distribuídas rigorosamente em H4-B = 10 e H4-C = 1).
  - Auditoria P8 (`scripts/audit-p8.js`): 100% PASS (0 pendências P8 não resolvidas).
  - Governança Git: Working tree estritamente preservada (sem commits/push não autorizados, harness de Minior intacto e não rastreado, CSS e PBA-020 intactos).

## Atualização — 06/11/2026: Correção Canônica Final, Homologação e Encerramento do Lote H3-B (21 Habilidades Canônicas Gen IX) — Família H3 Concluída

- **Lote H3-B Homologado com Correções Canônicas Finais Gen IX (Showdown):**
  - **Wonder Skin (Gen V):** Precisão base modificada incondicionalmente para 50 para qualquer golpe de Status com precisão numérica (`typeof accuracy === 'number'`), eliminando a restrição incorreta `accuracy > 50` (30 -> 50, 50 -> 50, 85 -> 50, 100 -> 50; movimentos infalíveis/null inalterados; golpes ofensivos e de auto-aplicação inalterados; Mold Breaker ignora a menos que segure Ability Shield; Neutralizing Gas suprime; multiplicadores de estágio aplicados sobre base 50).
  - **Good as Gold (Gen IX):** Bloqueio estrito de golpes de Status com verificação canônica `target !== source`, protegendo Gholdengo contra golpes de status de oponentes e aliados em Doubles, sem bloquear golpes de auto-aplicação (Swords Dance), hazards de campo (`foeSide`, ex: Stealth Rock) ou golpes de campo inteiro (`all`, ex: Haze), nem efeitos secundários de golpes de dano. Mold Breaker quebra salvo Ability Shield; Neutralizing Gas suprime.
  - **Poison Puppeteer (Gen IX):** Duração canônica de Confusão entre 2 e 5 turnos (`DEFAULT 3`), com validação rigorosa de limites rejeitando valores fora de [2, 5]. Testes determinísticos comprovam duração e momento exato de encerramento (`CONFUSION_ENDED (SNAPPED_OUT)`) para 2, 3, 4 e 5 turnos. Regra de Pecharunt respeitada (`!attacker.transformOriginal`, inativo se transformado via Imposter/Transform). Ativa exclusivamente via golpes (não por dano residual ou entrada em Toxic Spikes) e quando o veneno é efetivamente aplicado (bloqueado por tipos Steel/Poison, Purifying Salt, status prévio, Own Tempo, Safeguard e Misty Terrain no solo).
  - **21 Habilidades Implementadas com Status FULL:**
    1. oblivious (Gen III): Imunidade canônica a Taunt (#269), Attract/Infatuation e Intimidate (Gen VIII+).
    2. aroma-veil (Gen VI): Protege portador e aliados contra Taunt, Torment, Encore, Disable e Cursed Body.
    3. flower-veil (Gen VI): Aliados Grass têm atributos e condições primárias de status protegidos contra alterações adversárias.
    4. sweet-veil (Gen VI): Portador e aliados em campo são imunes a adormecer (Sleep, Spore, Yawn, Rest falha).
    5. pastel-veil (Gen VIII): Portador e aliados são imunes a envenenamento e curam envenenamento na entrada em campo.
    6. purifying-salt (Gen IX): Imunidade total a status não voláteis + redução de 50% no dano sofrido por golpes Ghost.
    7. comatose (Gen VII): Portador é tratado permanentemente como adormecido para golpes (Snore, Sleep Talk, Dream Eater), agindo livremente e imune a outros status não voláteis; insuprimível por Neutralizing Gas.
    8. corrosion (Gen VII): Permite envenenar alvos dos tipos Poison e Steel com movimentos e pós.
    9. cursed-body (Gen V): 30% de chance de desativar (Disable) o golpe ofensivo do atacante por 4 turnos ao sofrer dano (ativa mesmo em caso de desmaio do defensor).
    10. toxic-debris (Gen IX): Ao receber golpe físico de dano, espalha uma camada de Toxic Spikes no campo adversário (máximo 2 camadas; ativa mesmo em caso de desmaio).
    11. toxic-chain (Gen IX): 30% de chance de infligir toxic poison com qualquer ataque ofensivo de dano.
    12. poison-puppeteer (Gen IX): Sempre que o portador envenena um alvo com movimentos, inflige também Confusão (2 a 5 turnos).
    13. overcoat (Gen V): Imunidade a dano residual de clima (Sandstorm/Hail) e a golpes de pó e esporos (flags.powder).
    14. wonder-skin (Gen V): Fixa a precisão de movimentos de status direcionados em 50%.
    15. damp (Gen III): Impede o uso de movimentos autodestrutivos (Self-Destruct #120, Explosion #153, Mind Blown #720, Misty Explosion #802) e anula Aftermath.
    16. soundproof (Gen III): Imunidade total a movimentos baseados em som (flags.sound).
    17. bulletproof (Gen VI): Imunidade total a projéteis, bombas e balas (flags.bullet).
    18. earth-eater (Gen IX): Imunidade a dano Ground, recuperando 25% do HP máximo ao ser atingido.
    19. well-baked-body (Gen IX): Imunidade a dano Fire, aumentando Defense em +2 estágios ao ser atingido.
    20. good-as-gold (Gen IX): Imunidade a qualquer movimento de status onde target !== source.
    21. wonder-guard (Gen III): Imunidade total a dano direto não super efetivo (apenas movimentos superefetivos causam dano direto).
- **Suítes de Testes H3-B (178 Testes — 100% PASS):**
  - tests/battle/abilities-h3b-basic-protections.test.js: 35 testes PASS (Oblivious, Overcoat, Damp, Soundproof, Bulletproof)
  - tests/battle/abilities-h3b-team-veils.test.js: 27 testes PASS (Aroma Veil, Flower Veil, Sweet Veil, Pastel Veil)
  - tests/battle/abilities-h3b-special-immunities.test.js: 42 testes PASS (Purifying Salt, Wonder Skin, Earth Eater, Well-Baked Body, Good as Gold, Wonder Guard)
  - tests/battle/abilities-h3b-status-advanced.test.js: 20 testes PASS (Comatose, Corrosion, Cursed Body)
  - tests/battle/abilities-h3b-hazards-poison.test.js: 54 testes PASS (Toxic Debris, Toxic Chain, Poison Puppeteer + 19 testes integrados de sessão real)
- **Validação Global e Regressões:**
  - H3-B: 178 testes PASS (0 falhas).
  - H3-A: 181 testes PASS (0 falhas).
  - H2 (H2-A a H2-F): 463 testes PASS (0 falhas).
  - H1 (H1-A a H1-D): 221 testes PASS (0 falhas).
  - Testes de Confusão: 29 testes PASS (0 falhas).
  - Testes de BattleSessionController: 18 testes PASS (0 falhas).
  - Testes de Doubles: 32 testes PASS (0 falhas).
  - Testes de IA: 43 testes PASS (0 falhas).
  - Testes Globais do Projeto (npm test): 4.523 testes PASS (0 falhas).
  - Auditoria de Habilidades (scripts/audit-abilities.js --check): 238 declaradas com suporte (+21), 76 pendentes associadas (-21), 0 pendências na Família H3.
  - Auditoria P8 (scripts/audit-p8.js): 100% PASS (0 pendências P8 não resolvidas).
  - git diff --check: 0 erros de formatação ou whitespace.
- **Governança Git:**
  - Working tree preservada intacta (incluindo testes visuais untracked e layouts mobile PBA-020).
  - Nenhuma operação de staging (git add), commit, push ou deploy realizada.

## Atualização — 06/11/2026: Implementação Integral, Auditoria e Homologação do Lote H3-A (21 Habilidades Canônicas Gen IX)

- **Lote H3-A Concluído com Sucesso:**
  - **21 Habilidades Implementadas com Status FULL:**
    1. rough-skin (Gen III): Dano residual de 1/8 max HP ao atacante que fizer contato físico.
    2. iron-barbs (Gen V): Dano residual de 1/8 max HP ao atacante que fizer contato físico.
    3. effect-spore (Gen III): 30% chance de infligir Poison (9%), Paralysis (10%) ou Sleep (11%) ao sofrer contato físico.
    4. poison-touch (Gen V): 30% chance de envenenar o alvo ao desferir movimento ofensivo de contato físico.
    5. cute-charm (Gen IV): 30% chance de infligir infatuation/attract em atacante do sexo oposto em golpe de contato; 50% de imobilização por amor ao agir.
    6. gooey (Gen VI): Reduz a Speed do atacante em -1 estágio ao receber golpe de contato.
    7. tangling-hair (Gen VII): Reduz a Speed do atacante em -1 estágio ao receber golpe de contato.
    8. aftermath (Gen IV): Dano residual de 1/4 max HP ao atacante que nocautear o portador com golpe de contato; anulado por Damp ou Magic Guard.
    9. innards-out (Gen VII): Dano de retaliação igual ao HP restante que o portador possuía antes do nocaute por qualquer ataque ofensivo; anulado por Magic Guard.
    10. perish-body (Gen VIII): Ao receber golpe de contato, ativa contagem de 3 turnos de Perish Song em ambos os combatentes.
    11. shed-skin (Gen III): 33% de chance ao final de cada turno de curar a condição primária de status do portador.
    12. hydration (Gen IV): Cura condições primárias de status ao final do turno sob chuva (Rain).
    13. leaf-guard (Gen IV): Imunidade total a status não voláteis sob sol intenso (Sun).
    14. early-bird (Gen II): Desconta 2 turnos de sono por turno em vez de 1.
    15. synchronize (Gen III): Transfere queimadura, paralisia ou envenenamento recebidos de volta ao adversário.
    16. liquid-ooze (Gen III): Inverte a drenagem de HP de movimentos de cura adversários, ferindo o atacante em vez de curá-lo.
    17. poison-heal (Gen IV): Portador recupera 1/8 do HP máximo por turno quando envenenado/toxic em vez de sofrer dano.
    18. bad-dreams (Gen IV): Causa dano de 1/8 max HP a oponentes adormecidos (Sleep) ao final do turno.
    19. stench (Gen III): 10% de chance de causar flinch em ataques que não possuem chance natural de flinch.
    20. shield-dust (Gen III): Bloqueia 100% dos efeitos secundários de movimentos adversários no portador (status, drops, flinch).
    21. big-pecks (Gen V): Imunidade a quedas de Defense infligidas por outros Pokémon.
- **Suítes de Testes H3-A (181 Testes — 100% PASS):**
  - tests/battle/abilities-h3a.test.js: 70 testes PASS (inclui fronteiras 1, 33, 34, 100 de Shed Skin e fronteiras 1..9, 10..19, 20..30, 31..100 de Effect Spore)
  - tests/battle/abilities-h3a-contact-reactions.test.js: 32 testes PASS (alinhamento canônico de Mold Breaker para Cute Charm, Gooey e Tangling Hair; 7 cenários canônicos de hasEffectiveAbility)
  - tests/battle/abilities-h3a-faint-reactions.test.js: 22 testes PASS
  - tests/battle/abilities-h3a-status-weather.test.js: 25 testes PASS
  - tests/battle/abilities-h3a-draining-protections.test.js: 32 testes PASS
- **Validação Global e Regressões:**
  - Regressões H2 (H2-A a H2-F): 463 testes PASS (0 falhas).
  - Regressões H1 (H1-A a H1-D): 221 testes PASS (0 falhas).
  - Regressões Mecânicas (Sleep, Protect, P4, P7): 484 testes PASS (0 falhas).
  - Testes Globais do Projeto (npm test): 4.345 testes PASS (0 falhas).
  - Auditoria de Habilidades (scripts/audit-abilities.js --check): 217 declaradas com suporte, 97 pendentes associadas.
  - Auditoria P8 (scripts/audit-p8.js): 100% de conformidade com mecânicas especiais.
  - git diff --check: 0 erros de formatação ou whitespace.
- **Governança Git:**
  - Nenhuma operação de staging (git add), commit, push ou deploy realizada.
  - Arquivo protegido tests/visual/minior-shields-down-harness.html preservado intacto.
  - Layout mobile e posicionamento do seletor de mecânica especial preservados integralmente.

## Atualização — 06/11/2026: Publicação Confirmada da H2-F e Planejamento H3 (H3-A e H3-B)

- **Publicação H2-F Concluída e Sincronizada:**
  - Commit remoto publicado: `28d77c426fd0bcf9e98be55a04304399570a1c31`
  - Mensagem: `feat(battle): complete H2 family with H2-F canonical abilities`
  - Arquivos homologados: 11 arquivos (8 modificados + 3 suítes de testes dedicadas).
  - Encerramento Oficial da Família H2: 100% das habilidades H2 suportadas canonicamente com status FULL (0 pendências restantes).
- **Planejamento Oficial da Família H3 (Exceção Homologada — 21 + 21 = 42 Habilidades):**
  - **Inventário:** 42 habilidades pendentes divididas em exatamente dois lotes de 21 habilidades.
  - **H3-A (21 Habilidades — Contato, Reações, Danos Residuais, Curas e Imunidades Básicas):**
    - `rough-skin`, `iron-barbs`, `effect-spore`, `poison-touch`, `cute-charm`, `gooey`, `tangling-hair`, `aftermath`, `innards-out`, `perish-body`, `shed-skin`, `hydration`, `leaf-guard`, `early-bird`, `synchronize`, `liquid-ooze`, `poison-heal`, `bad-dreams`, `stench`, `shield-dust`, `big-pecks`.
  - **H3-B (21 Habilidades — Imunidades Categóricas, Véus de Equipe, Bloqueios Absolutos e Mecânicas Únicas):**
    - `oblivious`, `aroma-veil`, `flower-veil`, `sweet-veil`, `pastel-veil`, `purifying-salt`, `comatose`, `corrosion`, `cursed-body`, `toxic-debris`, `toxic-chain`, `poison-puppeteer`, `overcoat`, `wonder-skin`, `damp`, `soundproof`, `bulletproof`, `earth-eater`, `well-baked-body`, `good-as-gold`, `wonder-guard`.
  - **Status de Implementação:** Apenas planejado documentalmente. Nenhuma habilidade da Família H3 foi implementada nesta etapa, mantendo o repositório pronto para homologação futura do lote H3-A.

## Atualização — 06/11/2026: Auditoria, Correção Canônica de Simple (Gen IX) e Homologação H2-F

- **Objetivo Concluído:** Auditoria canônica profunda e correção da mecânica de `simple` no lote H2-F para alinhamento estrito à Geração IX (Pokémon Showdown hook `onModifyBoost`), garantindo armazenamento efetivo da alteração de estágios duplicada, preservação pós-supressão e ausência de duplicações indevidas em consultas de atributos, acompanhado de revalidação integral de Scrappy, Serene Grace e encerramento da Família H2.
- **Correção Canônica de Simple (Gen IX Showdown):**
  - **Divergência Corrigida:** A implementação prévia duplicava estágios no momento do cálculo do atributo preservando estágios brutos (comportamento da Geração IV). Na Geração IX (desde Gen V), Simple opera no hook `onModifyBoost` no momento da alteração de atributos, dobrando a alteração solicitada (+1 vira +2, +2 vira +4, -1 vira -2, -2 vira -4) e gravando o valor resultante diretamente em `combatant.statStages`, `accuracyStage` e `evasionStage`.
  - **Funções Refatoradas (`assets/js/battle/battle-constants.js`):**
    - `applyStatStageChange`: Detecta `hasSimple` (ativo, não suprimido, não ignorado por Mold Breaker) e dobra `requestedDelta` antes de aplicar e gravar no estado.
    - `getStatStageMultiplier`, `getEffectiveStat`, `getEffectiveAccuracy`: Removida qualquer duplicação secundária durante os cálculos de atributos e precisão. Os cálculos utilizam diretamente os estágios já gravados.
  - **Comportamento Pós-Supressão e Mudança de Habilidade:** Ao ser suprimida (Neutralizing Gas, Gastro Acid) ou substituída (Mummy), os estágios anteriormente adquiridos permanecem intactos no estado (`statStages`) sem recuo; novas alterações deixam de ser duplicadas enquanto inativa. Ao ser restaurada, os estágios preexistentes não são retroativamente duplicados.
  - **Interações Canônicas:**
    - Unaware: Atacante ou defensor com Unaware ignora completamente os estágios de Simple do adversário.
    - Critical Hits: Acertos críticos ignoram aumentos positivos de defesa acumulados por Simple.
    - Mold Breaker: Ao receber quedas de atributo infligidas por atacante com Mold Breaker, Simple é ignorada (queda nominal de -2 em vez de -4), exceto se o defensor segurar Ability Shield.
    - Haze: Reseta todos os estágios para 0 sem transformá-los em quedas dobradas.
    - Baton Pass: Transfere os estágios armazenados (+4) no valor nominal sem redobrar no receptor.
    - IA: Avaliador de IA calcula dano e ordem de turnos diretamente a partir dos estágios gravados, sem duplicações.
- **Habilidades H2-F Revalidadas:**
  1. `scrappy`: 12/12 PASS (Normal/Fighting contra Ghost neutro, bloqueio de Intimidate, supressão sob Gas).
  2. `serene-grace`: 12/12 PASS (Duplicação de secundários, Twineedle 20% -> 40%, Sheer Force anula secundários).
  3. `simple`: 15/15 PASS (Gen IX `onModifyBoost`, armazenamento de estágios, saturação +6/-6, Neutralizing Gas, Mummy, Unaware, Contrary, Haze, Baton Pass, Critical Hits, Mold Breaker, IA).
- **Inventário Auditado (`audit-abilities.js`):**
  - Conhecidas: 374
  - Suportadas declaradas: **201**
  - Pendentes atribuídas: **113**
  - Pendências restantes na Família H2: **0 (100% CONCLUÍDA)**
  - Pendências restantes na Família H1: **0 (100% CONCLUÍDA)**
  - Próxima família do roadmap: **H3 (Status, contato e imunidades — 42 pendências)**.
- **Resultados de Testes e Homologação:**
  - Suíte dedicada H2-F (3 arquivos): **39/39 PASS (100%)**
  - Suíte integral de regressões H2 (todos os lotes H2-A..F): **463/463 PASS (100%)**
  - Suíte global do projeto (`npm.cmd test`): **4.229/4.229 PASS (100%)** em 42 suítes, zero falhas.
  - Auditoria P8 (`audit-p8.js`): **PASS** (`p8ExplicitSinglesScopeComplete: true`, `unresolvedP8: 0`).
  - Higiene Git: `git diff --check` limpo (zero erros de sintaxe ou whitespace).
  - Proteção de repositório: Nenhuma operação Git destrutiva executada (zero `git add`, `git commit`, `git push`, deploy).

## Atualização — 05/11/2026: Redesign da Tela de Batalha Mobile & Ajuste do Seletor de Mecânica Especial (PBA-020)

- **Objetivo Concluído:** Redesenho completo da interface de batalha mobile (especialmente orientação paisagem), eliminando o layout em duas colunas (Imagem 1 — Antes) e implementando a visualização de arena em tela cheia com controles flutuantes sobrepostos e pokémons em grande escala (Imagem 2 — Referência Desejada), seguido do refinamento do seletor de mecânica especial.
- **Ajuste Pontual de Mecânica Especial no Mobile Landscape:**
  - Reposicionamento do seletor `Mecânica especial` (`#p8Activation`) no canto inferior direito, imediatamente acima dos dois últimos botões de ataque (`Ice-Beam` e `Dark-Pulse`), com folga vertical calculada de 6px.
  - Desobstrução total do Pokémon adversário (Lapras), que agora possui visibilidade limpa e desimpedida na arena.
  - Correção da largura do `<select>` (`max-width: clamp(145px, 22vw, 200px)`), eliminando o truncamento anterior e exibindo "Batalhar normalmente" por completo.
- **Alterações de Arquitetura e Layout (`assets/css/battle-arena.css`):**
  - **Arena Full-Bleed:** `.battle-camera-wrapper` e `.battle-stage` agora ocupam 100% da largura e altura do viewport (`position: absolute; inset: 0; z-index: 1`), proporcionando imersão total do estádio e céu cósmico.
  - **Pokémons em Escala Expandida e Perspectiva Canônica:**
    - Combatente do Jogador (Tapu-Koko): posicionado no primeiro plano inferior esquerdo (`left: clamp(24px, 10vw, 110px); bottom: clamp(56px, 15vh, 84px); width: clamp(175px, 28vw, 250px); z-index: 4`), com sprite de costas animado (`showdown/back/${id}.gif`) voltado para a arena.
    - Combatente Adversário (Zamazenta): posicionado no tablado à direita (`right: clamp(55px, 16vw, 165px); bottom: clamp(105px, 28vh, 160px); width: clamp(135px, 24vw, 195px); z-index: 3`), em escala de combate ampla e imersiva.
  - **HUD Inimigo Flutuante (Top-Left):** Caixa translúcida de vidro escuro (`background: rgba(10, 15, 28, 0.76); backdrop-filter: blur(8px); border: 1px solid rgba(255, 255, 255, 0.16); border-radius: 12px;`) contendo Nome, Pílula de Tipo (`FIGHTING`) e barra de HP com valores `167 / 167`.
  - **Caixa de Pergunta / Narrativa (Top-Right):** Pílula translúcida flutuante no canto superior direito ("O que Tapu-Koko deve fazer?").
  - **Controles de Ação Auxiliares (Right):** Botões `TROCAR POKÉMON` e `CAMPO Terreno elétrico` empilhados verticalmente abaixo da pergunta, com estilo de vidro fosco.
  - **HUD do Jogador (Bottom-Left):**
    - 4 Pokébolas da equipe renderizadas em CSS com alta fidelidade (`🔴 🔴 🔴 🔴`) sobre a caixa do combatente.
    - Caixa translúcida com Nome (`Tapu-Koko`), pílulas de tipos (`ELECTRIC`, `FAIRY`) e barra de HP com valores `145 / 145`.
  - **Barra de Golpes Horizontal Única (Bottom):** Os 4 golpes agora ficam alinhados horizontalmente em uma barra inferior única (`grid-template-columns: repeat(4, minmax(0, 1fr))`), estilizados como pílulas/cápsulas elegantes com cor de fundo temática de cada tipo (`--move-accent-color`), texto escuro de alto contraste, nome do golpe centralizado no topo, badge de tipo e contador de PP no rodapé.
  - **Compatibilidade Responsiva Preservada:**
    - Modo Portrait Mobile (`@media (max-width: 760px)`): mantém a grade 2x2 funcional e legibilidade vertical intacta.
    - Modo Desktop: mantém a apresentação em duas zonas widescreen testada e aprovada.
- **Alterações de Código Front-end (`assets/js/ui/battle-view.js`):**
  - Suporte ao Showdown Animated Back Sprite para o lado do jogador (`showdown/back/${id}.gif`) com fallback robusto e seguro (`showdown/${id}.gif` -> `official-artwork/${id}.png` -> `staticSprite`).
  - Inclusão do container `.hud-player-team-balls` no HUD do jogador.
  - Estruturação semântica de `.move-btn-type-badge` e `.move-btn-type-desktop` para transição responsiva impecável.
- **Validação Visual e Evidências:**
  - Capturas determinísticas em Edge Headless:
    - `before_redesign_844x390.png`: reproduz exatamente o layout anterior dividido (Imagem 1).
    - `mobile_landscape_844x390.png`: comprova a paridade e fidelidade à Imagem 2.
    - `mobile_landscape_915x412.png`: validação em telas Android widescreen.
    - `mobile_portrait_390x844.png`: integridade em modo retrato.
    - `desktop_1366x768.png`: integridade em modo desktop.
    - `special_selector_corrected_844x390.png`: comprova o seletor acima de Ice-Beam/Dark-Pulse e Lapras 100% visível.
- **Homologação Automatizada:**
  - Suíte Global (`npm.cmd test`): **4.190/4.190 PASS (100%)** em 42 suítes, zero falhas.
  - Governança Git: `git diff --check` PASS (0 erros de formatação/whitespace).

## Atualização — 05/11/2026: Auditoria Final de Cobertura, Resolução de Regressão e Validação Status FULL H2-E

- **Estado Git:** Trabalho estritamente local mantido (sem `git add`, `git commit`, `git push` ou `deploy`). Baseline remota: `11fb8812cecf0c69a3d1aaa07996e5465477b277` (`origin/main`). Arquivo permanente protegido `tests/visual/minior-shields-down-harness.html` preservado intacto e não rastreado.
- **Resolução Definitiva da Divergência 328 vs 200 Testes de Regressão Cruzada (Critério A — Diferença Explicada):**
  - **Origem dos 328 testes:** Execução canônica com expansão por curinga glob (`node --test tests/battle/abilities-h2a*.test.js tests/battle/abilities-h2b*.test.js tests/battle/abilities-h2c*.test.js tests/battle/abilities-h2d*.test.js tests/battle/abilities-h7a-neutralizing-gas.test.js`). Abrange 9 arquivos H2-A (113 testes: 64 nos 8 modulares + 49 no consolidado), 8 arquivos H2-B (64 testes), 8 arquivos H2-C (64 testes), 8 arquivos H2-D (76 testes) e Neutralizing Gas (11 testes). Total: 113 + 64 + 64 + 76 + 11 = 328 testes PASS (100%).
  - **Origem dos 200 testes:** Execução com caminhos literais estritos (`node --test tests/battle/abilities-h2a.test.js tests/battle/abilities-h2b.test.js tests/battle/abilities-h2c-*.test.js tests/battle/abilities-h2d-*.test.js tests/battle/abilities-h7a-neutralizing-gas.test.js`). Essa seleção executou apenas o arquivo consolidado de H2-A (49 testes) e omitiu os 8 arquivos modulares H2-A (64 testes); ademais, o arquivo literal `abilities-h2b.test.js` não existe no repositório (os testes de H2-B residem exclusivamente nos 8 arquivos `abilities-h2b-*.test.js`), resultando em 0 testes para H2-B (64 testes omitidos). Total: 49 + 0 + 64 + 76 + 11 = 200 testes PASS.
  - **Conclusão:** Diferença de 128 testes estritamente explicada (64 de H2-A modular + 64 de H2-B modular). Nenhum teste foi removido, enfraquecido ou corrompido. A cobertura consolidada de 328 testes foi comprovada e restabelecida.
- **Auditoria de Dependências de Sheer Force e Limitações Conhecidas:**
  - `Shell Bell`: Item de cura por dano ausente no motor. Em Showdown Gen IX (`data/items.ts`), `onAfterMoveSecondarySelf` possui tag `(S)` (anulado por Sheer Force em golpes com secundário). Registrada ausência canônica sem mock; sem impacto no status FULL da habilidade.
  - `Red Card`: Item de troca forçada pós-golpe ausente no motor. Possui tag `(S)` em `onAfterMoveSecondary`. Sem impacto no FULL.
  - `Eject Button`: Item de troca tática ausente no motor. Possui tag `(S)` em `onAfterMoveSecondary`. Sem impacto no FULL.
  - `Emergency Exit` / `Wimp Out`: Habilidades de troca tática programadas no roadmap para a **Fase H5**. Possuem tag `(S)`. Registrada dependência futura sem mock; sem impacto no FULL.
  - Efeitos suportados ativos: Life Orb (recuo suprimido), Berserk e Anger Shell (suprimidos ao cruzar 50% HP em golpes secundários; ativos em golpes sem secundário), Color Change (suprimida em golpes secundários), bônus de 1.3× e anulação de efeitos secundários para a IA.
- **Validação Oficial do Critério de Status FULL:**
  - Critério adotado oficialmente pelo projeto: **FULL Relativo ao Escopo Técnico Suportado** (todos os efeitos previstos para o motor de combate atual implementados deterministamente, com limitações de sistemas externos ausentes ou fases futuras devidamente documentadas).
  - Todas as 10 habilidades do lote H2-E (`illuminate`, `skill-link`, `quick-feet`, `unaware`, `sheer-force`, `heavy-metal`, `light-metal`, `rivalry`, `minds-eye`, `long-reach`) cumprem 100% dos requisitos do motor e justificam a classificação **FULL**.
- **Inventário Auditado (`audit-abilities.js`):**
  - Conhecidas: 374
  - Suportadas declaradas: **198 (+10 no ciclo H2-E)**
  - Pendentes atribuídas: **116 (-10 no ciclo H2-E)**
  - Pendências restantes em H2: **3** (`scrappy`, `serene-grace`, `simple` reservadas para H2-F)
  - Pendências em H1: **0**
- **Resultados de Testes e Homologação:**
  - 10 suítes dedicadas H2-E: **107/107 PASS** (100% determinístico)
  - Regressões cruzadas H2-A..D e Neutralizing Gas: **328/328 PASS**
  - Suíte P7 Mechanics: **222/222 PASS**
  - Suítes P5 e P6: **517/517 PASS**
  - Suíte global (`npm.cmd test`): **4.190/4.190 PASS (100%)** em 42 suítes, 0 falhas, exit code 0.
  - Auditoria P8 (`audit-p8.js`): **PASS** (`unresolvedP8: 0`).
  - Auditoria Habilidades (`audit-abilities.js --check`): **PASS**.
  - Higiene Git (`git diff --check`): **PASS** (zero erros de sintaxe ou whitespace).
- **Parecer Final de Homologação:** **HOMOLOGADO E APROVADO PARA PUBLICAÇÃO** (aptidão técnica estrita comprovada, aguardando comando do usuário para commit e push).

## Atualização — 05/11/2026: Nova Governança de Lotes (10 Habilidades) e Planejamento H2-E / H2-F

- **Decisão do Responsável pelo Projeto (05/11/2026):**
  > Decisão do responsável pelo projeto: a partir da H2-E, os novos lotes de implementação de habilidades Pokémon deverão conter 10 habilidades por lote, exceto o lote final de uma fase quando restarem menos de 10 habilidades elegíveis. O histórico dos lotes anteriores deve ser preservado. A alteração de quantidade não reduz os critérios de testes, auditoria, documentação ou governança Git.

- **Regras Obrigatórias da Nova Governança:**
  1. Cada novo lote deverá conter exatamente 10 habilidades quando houver quantidade suficiente de pendências elegíveis.
  2. Quando restarem menos de 10 habilidades na fase, o lote final poderá conter a quantidade restante.
  3. A distribuição deve respeitar dependências técnicas e a ordem do roadmap oficial.
  4. Não incluir habilidades já suportadas apenas para completar artificialmente o lote.
  5. Não dividir uma habilidade em múltiplos registros para atingir a quantidade.
  6. Não incluir habilidades fora da fase sem aprovação.
  7. Não reduzir um lote futuro para oito por conveniência.
  8. Preservação histórica integral: os lotes H1-B (8), H1-C (8), H1-D (8), H2-A (8), H2-B (8), H2-C (8) e H2-D (8) permanecem registrados exatamente como implementados e homologados. A H2-D mantém suas oito habilidades e não sofre alteração retroativa.

- **Planejamento Oficial dos Próximos Lotes (H2-E e H2-F):**
  - **Inventário Auditado:** 188 habilidades suportadas, 126 pendentes atribuídas, **13 pendências restantes na família H2**, 0 pendências em H1.
  - **Lote H2-E (10 habilidades planejadas — não implementadas nesta etapa):**
    1. `illuminate` (Gen III-IX): Previne perda de Accuracy e ignora estágios de Evasion do defensor em Gen IX SV.
    2. `skill-link` (Gen IV-IX): Garante 5 acertos máximos para movimentos multi-hit (2 a 5 golpes).
    3. `quick-feet` (Gen IV-IX): Multiplica Speed por 1.5× sob status e ignora penalidade de 50% de paralisia.
    4. `unaware` (Gen IV-IX): Ao atacar, ignora estágios defensivos adversários; ao defender, ignora estágios ofensivos do atacante.
    5. `sheer-force` (Gen V-IX): Remove efeitos secundários com chance percentual em troca de 1.3× de poder base e cancela recoil de Life Orb.
    6. `heavy-metal` (Gen V-IX): Dobra o peso corporal efetivo do combatente.
    7. `light-metal` (Gen V-IX): Reduz pela metade (0.5×) o peso corporal efetivo do combatente.
    8. `rivalry` (Gen IV-IX): Multiplica o dano por 1.25× contra mesmo gênero e 0.75× contra gênero oposto (neutro se genderless).
    9. `minds-eye` (Gen IX): Normal/Fighting acertam Ghost com dano neutro; ignora Evasion e previne perda de Accuracy.
    10. `long-reach` (Gen VII-IX): Executa movimentos sem contato físico, evitando Rough Skin, Rocky Helmet, Flame Body, etc.
  - **Lote H2-F (3 habilidades planejadas — lote final de encerramento da fase H2):**
    11. `scrappy` (Gen IV-IX): Normal/Fighting acertam Ghost com dano neutro; imunidade a Intimidate.
    12. `serene-grace` (Gen III-IX): Dobra as chances percentuais de efeitos secundários de movimentos.
    13. `simple` (Gen IV-IX): Dobra a magnitude das alterações de estágio de atributos (+1 vira +2, etc.).

- **Próxima Ação Imediata:** Aguardar autorização expressa do usuário para publicação da H2-D (`git add`, `git commit` e `git push`).

## Atualização — 05/11/2026: Auditoria Canônica e Validação Pré-Publicação H2-D (8 habilidades)

- **Auditoria Canônica e Validação Pré-Publicação H2-D (8 habilidades de modificadores de dano, status e turnos):**
  - **Estado Git:** Trabalho estritamente local mantido (sem commit/push/deploy/staging). Baseline HEAD: `83d9a1e35e8561e56cbc42f8438bb886131ec171` (`origin/main`).
  - **Formação do Lote:** Investigação detalhada confirmou que o planejamento macro original agrupou 49 habilidades na família `H2` sem ordenação alfabética prévia. A criação de sublotes operacionais (H2-A, H2-B, H2-C, H2-D) decorreu da diretriz operacional vigente à época (lotes H1-B a H2-D) de oito habilidades por lote para garantir gates rigorosos, rastreabilidade e integridade arquitetural.
  - **1. `reckless` (Correção Canônica Chloroblast):** Multiplica o poder de movimentos com recuo proporcional de HP ou crash damage por 4915/4096 (~1.2×) em `P7.power`. Corrigido para NÃO bonificar Chloroblast (#835), que opera como perda fixa de 50% do HP máximo do usuário. Mantido bônus canônico para Double-Edge, Head Smash, Brave Bird, Wave Crash, High Jump Kick e Supercell Slam (#916). Suprimível por Neutralizing Gas.
  - **2. `rock-head` (Conformidade Chloroblast):** Previne integralmente dano de recuo de movimentos próprios em `battle-engine.js` (Double-Edge, Head Smash, Wave Crash, etc.) e previne canonicamente o dano de recuo de 50% do HP máximo de Chloroblast (#835). Struggle (165) e Life Orb mantêm dano autoinfligido inalterado. Suprimível por Neutralizing Gas.
  - **3. `toxic-boost`:** Multiplica o poder de golpes físicos por 1.5× em `P7.power` quando o atacante está sob `poison` ou `toxic`. Suprimível por Neutralizing Gas.
  - **4. `flare-boost`:** Multiplica o poder de golpes especiais por 1.5× em `P7.power` quando o atacante está sob `burn`. Suprimível por Neutralizing Gas.
  - **5. `analytic`:** Multiplica o poder de movimentos por 5325/4096 (~1.3×) em `P7.power` quando o defensor já agiu ou trocou no turno. Prioridade avaliada corretamente (ataques de prioridade com usuário mais lento que agem primeiro não recebem bônus). Suprimível por Neutralizing Gas.
  - **6. `stakeout` (Correção Canônica do Ciclo de Vida):** Alinhado com Pokémon Showdown Gen IX (`data/abilities.ts`). Stakeout opera em `onModifyAtk` e `onModifySpA` (`this.chainModify(2)`), dobrando o atributo ofensivo Attack ou Special Attack em `P7.stat` quando `defender.switchedInThisTurn === true`. Corrigido o ciclo de vida: `switchedInThisTurn` é resetado para `false` no início de cada turno e na entrada de substitutos entre turnos após um desmaio (`resolveReplacement`), impedindo ativação espúria no turno seguinte a uma troca ou contra substitutos pós-KO. Ativação mantida para trocas voluntárias no mesmo turno, pivôs mid-turn e trocas forçadas (Dragon Tail).
  - **7. `defeatist`:** Reduz pela metade (0.5×) Attack e Special Attack em `P7.stat` quando o HP atual for <= 50% do HP máximo. Testado com HP ímpar (199 HP) e restauração após cura acima do limiar. Suprimível por Neutralizing Gas.
  - **8. `gorilla-tactics`:** Multiplica Attack físico por 1.5× em `P7.stat` e aplica Choice Lock no primeiro golpe utilizado. Assegurado que Struggle (moveId 165) nunca aplique Choice Lock (`used.moveId !== 165`). Troca de campo limpa o Choice Lock. Multiplica cumulativamente com Choice Band (2.25×). Suprimível por Neutralizing Gas.

- **Inventário e Cobertura Oficial:**
  - Auditado via `audit-abilities.js`: 374 habilidades conhecidas, **188 declaradas suportadas (+8)**, **126 atribuídas pendentes (-8)**, **13 pendências restantes em H2 (-8)**, **0 pendências em H1**.
  - Documentação sincronizada em `ability-coverage.json` e `roadmap-abilities.md`.

- **Validação Automatizada e Regressão Global:**
  - 8 suítes dedicadas H2-D:
    - `tests/battle/abilities-h2d-analytic.test.js`: 9/9 PASS
    - `tests/battle/abilities-h2d-defeatist.test.js`: 8/8 PASS
    - `tests/battle/abilities-h2d-flare-boost.test.js`: 8/8 PASS
    - `tests/battle/abilities-h2d-gorilla-tactics.test.js`: 9/9 PASS
    - `tests/battle/abilities-h2d-reckless.test.js`: 10/10 PASS (+1 teste)
    - `tests/battle/abilities-h2d-rock-head.test.js`: 12/12 PASS (+3 testes)
    - `tests/battle/abilities-h2d-stakeout.test.js`: 11/11 PASS (+2 testes)
    - `tests/battle/abilities-h2d-toxic-boost.test.js`: 8/8 PASS
    - **Total específico H2-D:** **76/76 PASS** (100%).
  - Regressões cruzadas H2-A, H2-B, H2-C e Neutralizing Gas: **203/203 PASS**.
  - Regressão global completa (`npm.cmd test`): **4.083 testes aprovados em 42 suítes, zero falhas, exit code 0**.
  - Auditorias `audit-abilities.js --check`, `audit-p8.js` e `git diff --check`: 100% aprovadas.
  - Parecer de auditoria: **APROVADO PARA PUBLICAÇÃO** (aptidão técnica estrita, sem commit/push).

## Atualização — 05/11/2026: Publicação H2-B e Publicação H2-C (8 habilidades de dano)

- **Publicação Controlada H2-B (8 habilidades de precisão e críticos):**
  - **Commit publicado:** `a00e6e89b9f485cdf1cf0ff7b6893d85e272a90c` (parent `239709d210b90f67059a4457fafd1f5e203232a2`).
  - **Mensagem:** `feat(battle): implement H2-B critical and accuracy abilities`.
  - **Escopo publicado:** Exatamente 17 arquivos (9 arquivos de motor/metadados e 8 suítes de testes determinísticos).
  - **Habilidades H2-B publicadas com status FULL:** Battle Armor, Shell Armor, Super Luck, Sniper, Merciless, Compound Eyes, No Guard, Tangled Feet.
  - Sincronização via fast-forward com `origin/main` confirmada por `git ls-remote` e API do GitHub.
  - Artefato visual paralelo `tests/visual/minior-shields-down-harness.html` preservado intacto e não rastreado.

- **Implementação Local H2-C (8 habilidades de modificação de dano e atributos):**
  - **1. `fur-coat`:** Dobra o atributo Defense efetivo do portador no estágio canônico `onModifyDef` (`f *= 2` em `P7.stat`). Aplica-se a ataques físicos e a golpes especiais que calculam dano contra Defense (ex: Psyshock, Secret Sword). Ignorada por Mold Breaker, Teravolt e Turboblaze (salvo Ability Shield). Suprimível por Neutralizing Gas.
  - **2. `fluffy`:** Reduz pela metade (`0.5×`) o dano recebido de golpes de contato e dobra (`2.0×`) o dano de ataques Fire. Golpes de Fogo com contato combinam ambos os multiplicadores resultando em dano neutro (`1.0×`). Ignorada por Mold Breaker e suprimível por Neutralizing Gas.
  - **3. `ice-scales`:** Reduz pela metade (`0.5×`) o dano recebido de ataques de categoria `Special`. Baseia-se exclusivamente na categoria do golpe (`damageClass === 'special'`), protegendo inclusive contra especiais que miram na Defense. Ignorada por Mold Breaker e suprimível por Neutralizing Gas.
  - **4. `heatproof`:** Reduz pela metade (`0.5×`) o dano sofrido de ataques do tipo Fire. Reduz pela metade o dano residual por turno causado por Burn (de 1/16 para 1/32 do HP máximo). Não impede a aplicação de Burn. Ignorada por Mold Breaker e suprimível por Neutralizing Gas.
  - **5. `shadow-shield`:** Reduz pela metade (`0.5×`) o dano de ataques recebidos quando o portador está com HP cheio (`currentHp === maxHp`). Canônico Showdown `flags: {}`: inquebrável por Mold Breaker, Teravolt, Turboblaze ou Moongeist Beam. Em ataques multi-hit, apenas o primeiro golpe com HP cheio é reduzido. Suprimível por Neutralizing Gas.
  - **6. `water-bubble`:** Dobra o poder ofensivo efetivo (Attack e Sp. Attack) ao utilizar golpes do tipo Water (`2.0×`). Reduz pela metade (`0.5×`) o dano de ataques Fire recebidos. Concede imunidade a Burn e cura imediatamente a condição na entrada ou término de Neutralizing Gas. Ignorada por Mold Breaker na defesa e suprimível por Neutralizing Gas.
  - **7. `punk-rock`:** Multiplica o poder de movimentos sonoros (flag `sound`) usados pelo portador por `5325 / 4096` (~1.3×). Reduz pela metade (`0.5×`) o dano recebido de movimentos sonoros adversários. Movimentos sonoros continuam transpassando Substitute. Quebrável por Mold Breaker na defesa e suprimível por Neutralizing Gas.
  - **8. `tinted-lens`:** Dobra (`2.0×`) o dano de ataques ofensivos que sofrem resistência de tipo (efetividade `< 1.0` e `> 0`, ex: `0.5×` vira `1.0×`, `0.25×` vira `0.5×`). Não afeta imunidades elementares (`0×` continua causando 0 de dano). Não afeta danos neutros ou super efetivos. Suprimível por Neutralizing Gas.

- **Inventário e Cobertura Oficial:**
  - Auditado via [audit-abilities.js](file:///c:/pokemon/scripts/audit-abilities.js): 374 habilidades conhecidas, **180 declaradas suportadas (+8)**, **134 atribuídas pendentes (-8)**, **21 pendências restantes em H2 (-8)**, **0 pendências em H1**.
  - Documentação sincronizada em [ability-coverage.json](file:///c:/pokemon/docs/ability-coverage.json) e [roadmap-abilities.md](file:///c:/pokemon/docs/roadmap-abilities.md).

- **Validação Automatizada e Regressão Global:**
  - Criadas 8 suítes dedicadas de testes determinísticos:
    - `tests/battle/abilities-h2c-fur-coat.test.js`: 8/8 PASS
    - `tests/battle/abilities-h2c-fluffy.test.js`: 8/8 PASS
    - `tests/battle/abilities-h2c-ice-scales.test.js`: 8/8 PASS
    - `tests/battle/abilities-h2c-heatproof.test.js`: 8/8 PASS
    - `tests/battle/abilities-h2c-shadow-shield.test.js`: 8/8 PASS
    - `tests/battle/abilities-h2c-water-bubble.test.js`: 8/8 PASS
    - `tests/battle/abilities-h2c-punk-rock.test.js`: 8/8 PASS
    - `tests/battle/abilities-h2c-tinted-lens.test.js`: 8/8 PASS
    - **Total específico H2-C:** **64/64 PASS**.
  - Regressões cruzadas H2-A, H2-B e Neutralizing Gas: **139/139 PASS**.
  - Regressão global completa (`npm test`): **4.007 testes aprovados em 42 suítes, zero falhas, exit code 0**.
  - Auditorias `audit-abilities.js --check`, `audit-p8.js` e `git diff --check`: 100% aprovadas.

- **Governança Git:**
  - Lote H2-C **homologado e publicado com sucesso** na branch `main` (`origin/main`) sob o commit `83d9a1e35e8561e56cbc42f8438bb886131ec171` (parent `a00e6e89b9f485cdf1cf0ff7b6893d85e272a90c`), sincronizado via fast-forward e auditado.
  - Artefato visual paralelo `tests/visual/minior-shields-down-harness.html` mantido intacto e não rastreado.

## Atualização — 02/11/2026: Homologação final e publicação H0–H4-A

- **Homologação Final das Entregas H0 a H4-A:**
  - Auditados e validados todos os componentes das fases H0, H1-A, H2-A, H3-A e H4-A.
  - Total de 19 habilidades funcionais implementadas com status FULL:
    - **H1-A:** Justified, Moxie, Chilling Neigh, As One (Glastrier), Dauntless Shield.
    - **H2-A:** Marvel Scale, Hustle, Keen Eye, Steadfast.
    - **H3-A:** Rough Skin, Iron Barbs, Effect Spore, Synchronize, Shed Skin.
    - **H4-A:** Dark Aura, Fairy Aura, Aura Break, Prism Armor, Neuroforce.
  - Inventário oficial auditado via [audit-abilities.js](file:///c:/pokemon/scripts/audit-abilities.js): 374 habilidades conhecidas, **97 declaradas suportadas (+19 desde H0)**, **217 atribuídas pendentes (-19)**, **595 registros com padrão pendente (-102)**.
- **Auditoria Rigorosa e Correção de Shed Skin em Sessões Reais:**
  - **Mecânica na Camada de Sessão:** [battle-random-source.js](file:///c:/pokemon/assets/js/battle-session/battle-random-source.js) agora provê o método `rollShedSkin()`, retornando valores inteiros de 1 a 3 para garantir a probabilidade canônica exata de 1/3 (33.333...%), além de permitir injeção determinística via `setShedSkinSequence()`.
  - **Injeção de Ações em Batalhas Reais:** [battle-session-controller.js](file:///c:/pokemon/assets/js/battle-session/battle-session-controller.js) agora injeta `shedSkinRoll` e `shedSkinScale: 3` em todas as ações de combate (`submitPlayerMove`, `submitPlayerSwitch` e `submitDoublesTurn`), garantindo que portadores de Shed Skin em partidas reais (Quick Battle, etc.) resolvam a rolagem ao final do turno sem depender de mocks manuais.
  - **Determinismo Estrito e Isolamento:** [p7-mechanics.js](file:///c:/pokemon/assets/js/battle/p7-mechanics.js) (`earlyResidual`) suporta tanto a escala de 1..3 quanto 1..100 (`roll <= 33`), possuindo fallback seguro para não-ativação caso nenhuma rolagem seja injetada. O motor [battle-engine.js](file:///c:/pokemon/assets/js/battle/battle-engine.js) permanece com 0 chamadas a `Math.random()`.
  - **Suíte H3-A Expandida:** [tests/battle/abilities-h3a.test.js](file:///c:/pokemon/tests/battle/abilities-h3a.test.js) ampliada de 60 para **65 testes**, adicionando validação de sessão real via `BattleSessionController`, troca voluntária, verificação de distribuição de 30.000 amostras (convergência para 33.33%) e determinismo estrito.
- **Reconciliação e Cobertura de Testes Automatizados:**
  - Total global: **3.080 testes aprovados em 39 suítes, zero falhas e zero regressões**.
  - Detalhamento: 3.028 (base pré-H3-A) + 8 (ajuste H3-A) + 39 (H4-A) + 5 (Shed Skin sessão real) = **3.080 testes**.
- **Publicação:**
  - Validação completa com `git diff --check` e `node scripts/audit-abilities.js --check`.
  - Commit semântico: `feat(battle): implement ability roadmap H0-H4 with validated mechanics`.
  - Push realizado para `origin/main` sem flags de força.

## Atualização — 02/11/2026: Auditoria corretiva H3-A e implementação H4-A

- **Auditoria Corretiva H3-A (Mold Breaker vs Contato e Shed Skin):**
  - **Mold Breaker vs Habilidades de Contato:** Confirmada a regra canônica oficial da Geração IX (*Ignoring Abilities* / *Pokémon Showdown* `data/abilities.ts`). Habilidades reativas ativadas ao receber contato (`rough-skin`, `iron-barbs`, `effect-spore`, bem como `static`, `flame-body`, `poison-point`) **NÃO** são ignoradas por Mold Breaker, Teravolt ou Turboblaze. Classificação atualizada em [ability-registry.js](file:///c:/pokemon/assets/js/battle/ability-registry.js) para `breakable: false`. Em [p7-mechanics.js](file:///c:/pokemon/assets/js/battle/p7-mechanics.js) (`contact`), desvinculou-se o acionamento de `abilityIgnored`, assegurando que o atacante com Mold Breaker sofra recuo ou status, mantendo integralmente o respeito à supressão genuína (`abilitySuppressed = true` via Gastro Acid / Core Enforcer / Neutralizing Gas). Adicionada cobertura completa para os 9 cenários exigidos (atacante normal, Mold Breaker, Teravolt, Turboblaze, supressão genuína, Ability Shield, multihit e KO simultâneo, contato de golpes físicos e especiais como Draining Kiss vs Earthquake, e efeitos acumulados de contato como Rocky Helmet + Rough Skin = 1/6 + 1/8).
  - **Shed Skin — Probabilidade Exata e Suporte Determinístico:** Auditada a probabilidade canônica de 1/3 (33.333...%). O motor em [p7-mechanics.js](file:///c:/pokemon/assets/js/battle/p7-mechanics.js) (`earlyResidual`) foi aprimorado para suportar injeções determinísticas tanto na escala padrão do motor de 1..100 (`roll <= 33`) quanto na escala direta de 1..3 (`shedSkinRoll: 1` com `shedSkinScale: 3`), com testes de limites (1 e 33 curam; 34 e 100 falham; escala 1..3: 1 cura, 2 e 3 falham), ausência de status primário e tentativas consecutivas em múltiplos turnos.
  - Suíte [tests/battle/abilities-h3a.test.js](file:///c:/pokemon/tests/battle/abilities-h3a.test.js) expandida para **60 testes aprovados** (zero falhas).
- **Implementação H4-A (5 habilidades funcionais no motor com status FULL):**
  - `dark-aura` (Yveltal #717): Aumenta a potência de movimentos do tipo Dark de TODOS os Pokémon em campo por 4/3 (~1.33x). Com Aura Break ativa, inverte o multiplicador para 0.75x. Não acumula se houver mais de um portador em campo. Não afeta outros tipos. Suprimível por Gastro Acid / Neutralizing Gas.
  - `fairy-aura` (Xerneas #716): Aumenta a potência de movimentos do tipo Fairy de TODOS os Pokémon em campo por 4/3 (~1.33x). Com Aura Break ativa, inverte para 0.75x. Não acumula com múltiplos portadores. Não afeta outros tipos. Suprimível.
  - `aura-break` (Zygarde #718): Inverte os efeitos de Dark Aura e Fairy Aura (multiplicador passa a 0.75x para o respectivo tipo). Não aplica redução isolada sem aura correspondente ativa no campo. Mold Breaker no atacante não neutraliza a inversão de Aura Break sobre as auras.
  - `prism-armor` (Necrozma #800): Reduz em 25% (multiplicador 0.75x) o dano de ataques super efetivos (2x e 4x) sofridos pelo portador. Canônico Gen VII-IX: **NÃO é ignorada por Mold Breaker, Teravolt, Turboblaze, Moongeist Beam (#714) ou Photon Geyser (#722)** (`breakable: false`). Não afeta dano neutro ou resistido. Suprimível por Gastro Acid (`abilitySuppressed = true`).
  - `neuroforce` (Ultra Necrozma #10157): Aumenta em 25% (multiplicador 1.25x) o dano de ataques super efetivos (físicos e especiais) desferidos pelo portador. Não afeta golpes neutros ou resistidos. Suprimível.
- **Inventário e Cobertura:**
  - `scripts/audit-abilities.js --check` validado: 374 habilidades conhecidas, **97 declaradas suportadas (+5)**, **217 atribuídas pendentes (-5)**, **595 registros com padrão pendente (-9)**.
- **Validação Automatizada e Regressão:**
  - Criada suíte dedicada [tests/battle/abilities-h4a.test.js](file:///c:/pokemon/tests/battle/abilities-h4a.test.js) com **39 testes** cobrindo todos os cenários, formatos (1v1, 3v3, Duplas) e espécies reais da campanha (Yveltal #717, Xerneas #716, Zygarde #718, Necrozma #800, Ultra Necrozma #10157).
  - Suítes H1-A (36 testes), H2-A (49 testes) e H3-A (60 testes) 100% aprovadas.
  - Suíte completa: **3.075 testes aprovados em 39 suítes, zero falhas** (baseline anterior: 3.028; acréscimo de +47 testes).
  - Nenhuma alteração em equipes, golpes, base stats ou recompensas. Sem commit, push ou deploy.

## Atualização — 02/11/2026: Auditoria H2-A e implementação H3-A

- **Revisão e Correção H2-A (Keen Eye & Hustle):**
  - **Keen Eye:** Confirmada a regra canônica oficial de *Pokémon Showdown* para Geração IX (`move.ignoreEvasion = true`). O cálculo de precisão efetiva em [battle-constants.js](file:///c:/pokemon/assets/js/battle/battle-constants.js) foi corrigido para tratar a evasão do alvo como `0` incondicionalmente quando o atacante possui Keen Eye (`effectiveDefenderEvasion = attackerHasKeenEye ? 0 : rawDefenderEvasion`), eliminando a limitação anterior que preservava estágios negativos. Adicionada bateria de testes para evasão do alvo em -6, -1, 0, +1 e +6.
  - **Hustle:** Auditada a precisão de movimentos físicos contra a implementação Gen 9 do Showdown (`this.modify(accuracy, 3277, 4096)`). Comprovado matematicamente que para qualquer valor inteiro de precisão base entre 1 e 100, `Math.floor(b * 3277 / 4096) === Math.floor(b * 0.8)` é estritamente idêntico (inclusive para base 100, 90, 85, 75). O cálculo foi unificado em [p7-mechanics.js](file:///c:/pokemon/assets/js/battle/p7-mechanics.js) e documentado.
  - Suíte [abilities-h2a.test.js](file:///c:/pokemon/tests/battle/abilities-h2a.test.js) mantida 100% verde (49/49 testes aprovados).
- **Implementação H3-A (5 habilidades funcionais no motor com status FULL):**
  - `rough-skin`: Causa dano equivalente a 1/8 (12.5%) do HP máximo do atacante ao sofrer golpe de contato (mínimo 1 de dano). Ativa por cada acerto de golpes multi-hit. Ativa mesmo que o defensor seja nocauteado pelo ataque. Nocaute simultâneo respeita ordem canônica. Ignorada por Mold Breaker, protegida por Ability Shield e anulada por Magic Guard no atacante. Simétrica para jogador e oponente. Integrada à IA em [battle-evaluator.js](file:///c:/pokemon/assets/js/battle/battle-evaluator.js).
  - `iron-barbs`: Compartilha a mecânica de Rough Skin (1/8 max HP do atacante em contato). Em batalhas em Duplas (2v2), atribui a punição estritamente ao agressor direto sem afetar aliados.
  - `effect-spore`: 30% de chance total ao sofrer golpe de contato: 9% Poison (roll 1..9), 10% Paralysis (roll 10..19), 11% Sleep (roll 20..30). Determinismo total via `action.effectSporeRoll`. Imunidades canônicas: tipo Grass, habilidade Overcoat, item Safety Goggles, Safeguard, Misty Terrain e Electric Terrain (para sono). Não sobrescreve status já existente.
  - `synchronize`: Reflete Burn, Paralysis, Poison e Toxic aplicados diretamente por outro Pokémon (golpes de status, efeitos secundários ou Beak Blast). Não reflete Sleep nem Freeze. Não reflete status autoinfligidos (Rest, Flame/Toxic Orb) nem dano residual. Preserva a distinção entre Poison regular e Toxic (Bad Poison). Respeita imunidades elementais (Fire imune a Burn, Electric a Paralysis, Poison/Steel a Poison/Toxic), habilidades (Water Veil, Limber, Immunity) e Safeguard do adversário. Previne recursão infinita contra outro portador de Synchronize.
  - `shed-skin`: 33.3% de chance (roll <= 33 via `action.shedSkinRoll`) de curar condição principal de status (Burn, Poison, Toxic, Paralysis, Sleep, Freeze) no início da fase residual de final de turno. Ocorre antes da aplicação de dano de veneno ou queimadura daquele turno (o Pokémon curado não sofre dano no mesmo turno). Não cura confusão.
- **Inventário e Cobertura:**
  - `scripts/audit-abilities.js --check` validado: 374 habilidades conhecidas, **92 declaradas suportadas (+5)**, **222 atribuídas pendentes (-5)**, **604 registros com padrão pendente (-39)**.
- **Validação Automatizada e Regressão:**
  - Criada suíte dedicada [tests/battle/abilities-h3a.test.js](file:///c:/pokemon/tests/battle/abilities-h3a.test.js) com **52 testes** cobrindo todos os cenários, formatos (1v1, 3v3, Final Stand, Duplas) e espécies reais da campanha (Garchomp #445, Ferrothorn #598, Breloom #286, Umbreon #197, Seviper #336).
  - Suítes H1-A (36 testes) e H2-A (49 testes) 100% aprovadas.
  - Suíte completa: **3.028 testes aprovados em 39 suítes, zero falhas** (baseline anterior: 2.976; acréscimo de +52 testes).
  - Nenhuma alteração em equipes, golpes, base stats ou recompensas. Sem commit, push ou deploy.

## Atualização — 02/11/2026: Correção H11 (Mega Sol) e implementação H2-A

- **Correção Canônica H11 — Mega Sol (Mega Meganium):**
  - Retificada a especificação de Mega Sol conforme as regras canônicas de *Pokémon Champions* (2026, Nintendo Switch) documentadas no Serebii e Bulbapedia: Mega Sol faz os movimentos do próprio portador funcionarem como se houvesse sol intenso (*sun simulation*), independentemente do clima real.
  - Registrado explicitamente que a habilidade **NÃO** modifica o clima do campo, **NÃO** invoca clima global, **NÃO** altera diretamente o clima dos aliados e **NÃO** funciona como Desolate Land.
  - Atualizados [ability-registry.js](file:///c:/pokemon/assets/js/battle/ability-registry.js), [roadmap-abilities.md](file:///c:/pokemon/docs/roadmap-abilities.md) e [ability-coverage.json](file:///c:/pokemon/docs/ability-coverage.json). Mantido o status `RULE_CONFIRMED_PENDING_IMPLEMENTATION` para todas as 7 habilidades H11 (sem implementação antecipada no motor).
- **Implementação H2-A (4 habilidades funcionais no motor com status FULL):**
  - `marvel-scale`: Quando o portador tem uma condição principal de status ativa (Burn, Poison, Toxic, Paralysis, Sleep, Freeze), sua Defense efetiva aumenta em 50% (multiplicador 1.5x) no cálculo de dano físico recebido. Não altera Special Defense. Ignorada por Mold Breaker (a menos que o portador use Ability Shield). Críticos preservam o multiplicador por ser modificador de atributo efetivo e não estágio de stat. Simétrica para jogador e oponente.
  - `hustle`: Concede multiplicador de 1.5x no Attack efetivo do portador. Aplica multiplicador de 0.8x na precisão de movimentos físicos elegíveis (`Math.floor(base * 0.8)`). Não penaliza movimentos especiais, de status ou golpes OHKO. Movimentos de acerto garantido (Aerial Ace) continuam sem falhar. A IA (`BattleEvaluator`) avalia o Attack amplificado e a precisão reduzida com os mesmos valores.
  - `keen-eye`: Previne reduções no estágio de precisão causadas por adversários (Sand-Attack, Flash, etc.). Ignora os estágios positivos de evasão do alvo durante o cálculo de acerto (trata evasão do defensor como <= 0 sem zerar o atributo globalmente). Preserva estágios negativos de evasão do alvo e não garante acerto automático para golpes com precisão base imperfeita. Quebrável por Mold Breaker ao tentar reduzir precisão.
  - `steadfast`: Quando o portador sofre hesitação efetiva (*flinch*), perdendo sua oportunidade de agir no turno, sua Speed aumenta em +1 estágio. Respeita precedência canônica (Sono/Freeze impedem a ação antes do flinch e descartam a hesitação sem ativar Steadfast). Não ativa em duplicidade no mesmo evento. Respeita o teto de +6 estágios. Não é ignorada por Mold Breaker.
- **Inventário e Cobertura:**
  - `scripts/audit-abilities.js --check` validado: 374 habilidades conhecidas, **87 declaradas suportadas (+4)**, **227 atribuídas pendentes (-4)**, **643 registros com padrão pendente (-45)**.
- **Validação Automatizada e Regressão:**
  - Criada suíte [tests/battle/abilities-h2a.test.js](file:///c:/pokemon/tests/battle/abilities-h2a.test.js) com **49 testes** cobrindo todos os cenários, formatos (1v1, 3v3, Final Stand, Duplas) e espécies reais da campanha (Milotic #350, Togekiss #468, Pelipper #279, Skarmory #227, Lucario #448).
  - Suíte H1-A preservada: 36/36 testes aprovados.
  - Suíte completa: **2.976 testes aprovados em 39 suítes, zero falhas** (baseline anterior: 2.927).
  - Sem commit, push ou deploy.

## Atualização — 02/11/2026: Auditoria corretiva H0, H1-A e H11

- **Retificação Canônica H11 (Pokémon Champions 2026):**
  - Retificada a classificação das 7 habilidades de Mega Evolução presentes no snapshot da PokéAPI (`piercing-drill`, `dragonize`, `mega-sol`, `spicy-spray`, `eelevate`, `fire-mane`, `aura-guard`).
  - Confirmadas como canônicas e oficiais do título competitivo *Pokémon Champions* (Nintendo Switch, 2026), documentadas no Serebii, comunicado oficial Nintendo/Pokémon e Pokémon Showdown (`data/abilities.ts`).
  - Classificação formal atualizada de `NEEDS_RULE_VALIDATION` para `RULE_CONFIRMED_PENDING_IMPLEMENTATION`. Documentadas detalhadamente em [ability-registry.js](file:///c:/pokemon/assets/js/battle/ability-registry.js), [roadmap-abilities.md](file:///c:/pokemon/docs/roadmap-abilities.md) e [ability-coverage.json](file:///c:/pokemon/docs/ability-coverage.json). Não foram implementadas antecipadamente no motor neste ciclo.
- **Auditoria Mecânica — Justified vs Mold Breaker:**
  - Corrigida a divergência canônica: conforme mecânicas oficiais (Bulbapedia, Serebii, Pokémon Showdown), Mold Breaker anula apenas habilidades defensivas/preventivas de dano ou efeitos (ex.: Sturdy, Levitate, Wonder Guard, Unaware), mas **NÃO** anula habilidades reativas pós-dano como Justified, Weak Armor, Stamina ou Anger Shell.
  - [p7-mechanics.js](file:///c:/pokemon/assets/js/battle/p7-mechanics.js) (`afterHit`): ajustado para verificar a habilidade intrínseca do defensor (`ability(d) === 'justified'`), desvinculando-a da lista de anulação de Mold Breaker, mas preservando o respeito à supressão genuína (`abilitySuppressed = true` via Gastro Acid / Neutralizing Gas) e ao estado de nocaute.
  - [ability-registry.js](file:///c:/pokemon/assets/js/battle/ability-registry.js): definido `justified.breakable = false`.
- **Auditoria H1-A (Moxie, Chilling Neigh, As One Glastrier, Dauntless Shield):**
  - **Moxie / Chilling Neigh:** Autoria de KO rigorosamente validada — ativa apenas em KOs diretos causados por ataque do próprio Pokémon; não ativa em KOs por dano residual (Burn, Poison, Sandstorm, Leech Seed) nem quando o atacante desmaie por dano de recuo no mesmo turno (Double-Edge / Life Orb). Suporta acúmulo de +2 em nocautes duplos de dano em área (Doubles).
  - **As One (Glastrier):** Bloqueio de berries validado tanto no motor (`constants.P7.berriesBlocked`) quanto no [battle-evaluator.js](file:///c:/pokemon/assets/js/battle/battle-evaluator.js). Insuprimível em batalha conforme regras canônicas Gen VIII/IX.
  - **Dauntless Shield:** Validação da regra da Gen IX (uma única ativação por batalha através da flag de instância `dauntlessShieldUsed`, preservada ao longo de trocas e resetada apenas em novo combate).
- **Integração H0 de Ponta a Ponta:**
  - `AbilityRegistry` e `MoveFlags` integrados ao motor ([battle-engine.js](file:///c:/pokemon/assets/js/battle/battle-engine.js)), [p7-mechanics.js](file:///c:/pokemon/assets/js/battle/p7-mechanics.js), avaliador de IA ([battle-evaluator.js](file:///c:/pokemon/assets/js/battle/battle-evaluator.js)) e adaptador de interface ([battle-ui-adapter.js](file:///c:/pokemon/assets/js/ui/battle-ui-adapter.js)).
  - Passagem explícita de combatentes `attacker` e `defender` nas chamadas de `afterHit` e `directKO` para resolução unívoca em formatos multialvo (Doubles).
- **Cobertura e Validação Automatizada:**
  - Testes em [abilities-h1a.test.js](file:///c:/pokemon/tests/battle/abilities-h1a.test.js) expandidos para **36 testes** cobrindo todas as matrizes de verificação, cenários de borda, espécies reais da campanha (Keldeo #647, Zamazenta #889, Calyrex-Ice #10193, Glastrier #896, Krookodile #553, Salamence #373) nos quatro formatos (1v1, 3v3, Final Stand, Duplas 2v2).
  - Validação de inventário `node scripts/audit-abilities.js --check`: 100% aprovado.
  - Suíte completa de testes: **2.927 testes aprovados em 39 suítes, zero falhas**.
  - Nenhuma alteração de times, movesets, base stats, recompensas ou IA. Sem commit ou push.

## Atualização — 02/11/2026: roadmap de habilidades H0–H11

- Criado docs/roadmap-abilities.md, com fundação, lotes prioritários, onze famílias, dependências, contratos e aceite por habilidade. Planejamento; nenhum efeito de combate novo habilitado.
- Inventário local: 374 nomes conhecidos; 78 declarados suportados (77 atribuídos); 313 habilidades naturais atribuídas; **236 pendentes atribuídas**, 60 pendentes sem portador e 697 registros/formas com habilidade padrão pendente. A contagem anterior de 235 pressupunha incorretamente que todas as 78 declarações tinham portador.
- Todas as 236 pendências atribuídas possuem fase em docs/ability-roadmap-catalog.json. docs/ability-coverage.json relaciona portadores, opções ocultas, registros padrão e presença nos desafios.
- scripts/audit-abilities.js gera e verifica o inventário offline; rejeita nomes inválidos, fases duplicadas, pendências atribuídas sem fase e inventário desatualizado. Suporte declarado não é tratado como auditoria comportamental FULL.
- Primeiros lotes: Justified, Moxie, Chilling Neigh, As One Glastrier e Dauntless Shield; em seguida, habilidades de Milotic, Togekiss e outros participantes da Liga/Torre. Sistemas externos e metadados recentes permanecem explícitos.

## Atualização — 02/11/2026: Liga e Torre da Glória Eterna

- Liga com quatro integrantes da Elite e campeão, cinco vitórias consecutivas e título; Torre repetível com categorias Equilibrada/Livre e recordes próprios.
- Três equipes emprestadas, preparação fixada por sequência, cura completa entre lutas e retomada entre etapas. Derrota ou saída do combate encerra a tentativa, preservando histórico.
- Integração no mapa e hub, prévia dos oponentes, aberturas cinematográficas e arenas temáticas. Adversários com itens legais; nenhuma recompensa de Pokémon duplicada.
- Save estendido com sanitização e recibos de etapa, preservando campanhas anteriores. Referência: docs/eternal-glory-facilities.md.
- Habilidades pendentes continuam explícitas: conclusão dos golpes cadastrados não equivale à implementação de todas as habilidades naturais.
- Validação: **2.891 testes aprovados em 39 suítes**, zero falhas; git diff --check aprovado. Simulações da Liga com IA, 40 sementes por equipe: Equilíbrio 26 conclusões, Areia 24 e Controle 17. Resultados de triagem, não probabilidades garantidas para jogadores. Implementação local, sem commit/push.

## Atualização — 02/11/2026: Região da Glória Eterna

- Região pós-Shadow renomeada para Região da Glória Eterna (aba Glória Eterna).
- Mewtwo movido da Região Final para a Glória Eterna, reunindo os cinco desafios pós-Shadow. Rotas locais e passagem entre regiões ajustadas; nenhum desafio duplicado.
- Identificadores e progresso de Mewtwo preservados, incluindo recompensa e revanche. Contadores passam a mostrar seis desafios na Região Final e cinco na Glória Eterna. Cache atualizado. Validação: **2.871 testes aprovados em 39 suítes, zero falhas**; git diff --check aprovado.

## Atualização — 02/11/2026: exploração com 50% de lendários/míticos após Shadow

- Depois de derrotar Shadow, exploração sorteia 50% de lendários e míticos juntos e 50% de Pokémon comuns/incomuns/raros. A separação ocorre antes de escolher a espécie para manter os 50% mesmo quando faltam categorias de raridade na área.
- Antes de Shadow, pesos originais e chance-base especial de 10% preservados. Ao esgotar uma categoria por capturas, o sorteio usa os Pokémon elegíveis restantes; ponto sem candidatos retorna vazio.
- Exclusividade dos desafios, biomas e espécies já capturadas continuam respeitados. Texto de frequência e cache atualizados.
- Testes determinísticos de todas as áreas, limite exato de 50%, categorias esgotadas e compatibilidade da chance anterior. Validação: **2.869 testes aprovados em 39 suítes, zero falhas**; git diff --check aprovado.

## Atualização — 02/11/2026: desafios pós-Shadow no mapa

- Corrigida integração incompleta: Zygarde, Kyurem, Necrozma e Criação existiam no hub, mas não tinham nós, reconhecimento ou ações no mapa.
- Adicionada região Após Shadow (Além do Eclipse), com quatro nós, rotas e ligações de viagem. Usa o fundo local existente da Região Final, sem novos downloads de arte. Mewtwo permanece no mapa original.
- Modelo e ações usam os times e requisitos canônicos. A nova região exige vitória contra Shadow; os nós mostram bloqueios, recompensas pendentes e revanches. Contadores agora consideram somente os desafios de cada região.
- Testes cobrem renderização em mapa/lista, abertura das quatro batalhas, desbloqueios após Mewtwo, bloqueios anteriores ao Shadow, recompensas pendentes e preservação do progresso. Cache atualizado. Validação: **2.865 testes aprovados em 39 suítes, zero falhas**; git diff --check aprovado.

## Atualização — 02/11/2026: ataques sem erro após dano indireto

- Reproduzido o erro de Petra com Keldeo usando Hydro Pump contra Tyranitar: a tempestade de areia gerava STATUS_DAMAGE válido, mas o mapper aceitava apenas veneno/veneno grave/queimadura. O turno já estava resolvido quando a apresentação falhava.
- Mapper agora aceita também as causas emitidas pelas mecânicas: areia, granizo, Leech Seed, aprisionamento, Stealth Rock, Spikes, Solar Power e Black Sludge, mantendo a validação dos dados e a rejeição de causas desconhecidas.
- Dano de clima/armadilhas mantém mensagem e transição de HP sem pulsar indevidamente o visual de uma condição primária. Cache atualizado.
- Regressões: batalha real com ataques consecutivos, oito causas indiretas, HP, alvo em duplas, validação de payloads e separação dos efeitos visuais. Suíte completa: **2.857 testes aprovados, 39 suítes, zero falhas**.

## Atualização — 02/11/2026: provas táticas antes do Super

- Prova da Resistência: Calyrex Ice, Hoopa Unbound e Lugia; Prova das Sombras: Incineroar, Mega Tyranitar e Mega Gyarados; Prova das Chamas: Reshiram, Volcanion e Mega Swampert. A Prova Celestial permanece disponível.
- Cada prova permite escolher um aliado, garantindo uma rota para recrutar Calyrex Ice, Incineroar e Reshiram na mesma campanha antes do Super. Dicas de preparação explicam itens, Tera Terrestre e a ordem de entrada.
- Cenas atualizadas: fortaleza glacial com fissuras, coliseu escuro com eclipse e fornalha com brasas; textos individuais revelam os times canônicos usados na batalha. Controles de pular, áudio e redução de movimento preservados.
- Migração única preserva os antigos recrutas no elenco e reabre as três provas revisadas. Vitórias com recompensa pendente oferecem escolhas atualizadas. Revanches e opções já possuídas não duplicam recompensas nem bloqueiam a campanha.
- Novos aliados e recompensas antigas continuam excluídos da exploração. Incineroar sai do novo draft, substituído por Popplio, mantendo 450 opções e 50 por geração; saves com Incineroar inicial são preservados. Catálogos offline e cache atualizados.
- Validação: **2.846 testes aprovados em 39 suítes, zero falhas**; auditoria dos 450 Pokémon do draft e git diff --check aprovados. Inclui recrutamento dos três aliados, preparação Tera/itens, migração, recompensas pendentes, exclusividade e textos da tela. Alterações locais, sem commit/push.

## Atualização — 02/11/2026: Super Treinador sem itens

- Removidos Black Sludge de Eternatus Eternamax, Choice Specs de Calyrex Shadow e Choice Band de Zacian Crowned somente no confronto SUPER, conforme pedido de ajuste de dificuldade.
- Eternatus não recupera mais HP pelo item; Calyrex e Zacian perdem os bônus de dano e as travas dos itens Choice. Equipe, atributos, golpes e habilidades mantidos; Shadow conserva seus itens.
- Cache do catálogo atualizado. Os 13 testes de equipes/migração passaram, incluindo preparação real das equipes com itens nulos no Super e itens preservados no Shadow. Alteração local, ainda sem commit/push.

## Atualização — 01/11/2026: retomada segura após nocaute

- startBattle agora respeita a fase real do motor ao retomar: substituições obrigatórias vão para a seleção de reserva e não para chooseAction.
- Início/introdução protegido contra chamadas simultâneas; callbacks da introdução não reabrem controles de uma sessão substituída.
- Cliques atrasados em ataque ou troca voluntária durante AWAITING_REPLACEMENT recuperam a etapa correta sem consultar a IA de ataques.
- Sete regressões com sessão e motor reais: nocaute, retry, troca inimiga automática, cliques atrasados, partida em andamento e introduções sobrepostas.
- Validação: **2.840 testes aprovados em 39 suítes, zero falhas**; git diff --check aprovado. Alterações locais, ainda sem publicação desta correção.

## Atualização — 01/11/2026: publicação dos desafios e recompensas exclusivas

- Jornada pós-Shadow concluída: Zygarde, Kyurem, Necrozma e Criação, com aberturas, música e progressão aprovadas.
- Recompensas dos desafios atuais removidas de todos os sorteios selvagens, incluindo o modo de coleção após Shadow. Capturas antigas preservadas; encontros ativos e capturas pendentes dessas espécies são encerrados na leitura do save.
- Revisto o contrato anterior de coleção irrestrita: desafios passam a ser a fonte exclusiva de novos recrutamentos de suas equipes.
- Validação final: **2.833 testes aprovados em 39 suítes, zero falhas**; auditorias de learnsets e conclusão do roadmap aprovadas; git diff --check sem erros.
- Commit e push autorizados pelo usuário para esta entrega.

## Atualização — 01/11/2026: jornada de desafios após Shadow

- Implementados Equilíbrio de Zygarde (10%, 50%, Completa), Zero Absoluto (Kyurem, Black, White), Eclipse de Necrozma (Dusk Mane, Dawn Wings, Ultra) e Ruptura da Criação (Dialga Origin, Palkia Origin, Giratina Origin).
- Mewtwo e Zygarde abrem após Shadow; vencer um libera Kyurem; Kyurem libera Necrozma; concluir os quatro libera Criação. Requisitos exibidos no novo hub e validados pelo gerente de batalhas.
- Quatro aberturas cinematográficas em seis cenas com suspense, revelação do time real, efeitos distintos e músicas originais: células, gelo/fusão, eclipse prismático e fenda dimensional. Arenas temáticas, opção de pular e movimento reduzido preservados.
- Primeira vitória oferece escolha de um adversário para o elenco; revanches não duplicam recompensas. Posse prévia das três opções não bloqueia o fluxo. Saves antigos e progresso do Mewtwo são preservados.
- Documentação em `docs/postgame-challenges.md`. Validação: **2.828 testes aprovados em 39 suítes, zero falhas**; auditorias de learnsets e conclusão do roadmap aprovadas.
- Implementação local; ainda sem commit ou push desta expansão.

## Atualização — 01/11/2026: habilidades funcionais dos novos chefes

- Equipes publicadas no commit `3008f41`. Implementados Pressure, Intrepid Sword, As One (Spectrier), Unnerve e Grim Neigh no motor, válidos para jogador e IA nos formatos individuais, equipes, Final Stand e duplas.
- Pressure desconta PP adicional dos alvos corretos, com cobertura de Sleep Talk, múltiplos acertos, hazards/clima/terreno e Max/Z. Intrepid Sword ativa uma vez por Pokémon por batalha. As One bloqueia berries inimigas e concede Special Attack por nocaute direto, sem recompensa por dano residual.
- Bloqueio de berries considera ambos os slots de duplas, sai quando o último portador deixa o campo e não anula itens comuns. Transform e Core Enforcer seguem as regras das habilidades envolvidas.
- Corrigido fallback da IA quando toda a equipe está sem PP: usa Struggle. Apresentação exibe as ativações e o custo adicional de Pressure; habilidades entregues deixam de aparecer como efeito pendente.
- `docs/roadmap-boss-abilities.md` atualizado como contrato entregue. Auditoria P7 atualizada de 66 para 71 habilidades suportadas.
- Validação: **2.803 testes aprovados em 39 suítes, zero falhas**, incluindo 60 novas regressões. Auditorias de learnsets, P7, P8 e conclusão do roadmap aprovadas. Conferência em navegador confirmou Psychic de 10 para 8 PP após atacar Eternatus Eternamax uma vez.

## Atualização — 01/11/2026: equipes do Super e Shadow atualizadas

- Ambos os chefes passam a usar Eternatus Eternamax, Calyrex Cavaleiro Espectral e Zacian Coroado, selecionados pela análise do motor atual; SUPER_TEAM e SHADOW_TEAM são definições independentes.
- Configuração exclusiva por encontro: Black Sludge, Choice Specs, Choice Band e Behemoth Blade no Zacian. Pokémon do jogador, Mewtwo e demais provas mantêm seus próprios conjuntos.
- Prévias do mapa/picker e leitura tática alinhadas ao time e aos golpes reais; Shadow mantém aura e Final Stand.
- Migração aditiva preserva Arceus/Eternatus/Mewtwo recrutados, recompensas pendentes antigas, preferências e formas dos novos chefes capturadas antes da alteração. Quem já possui as três opções pode continuar após vencer sem duplicar o elenco.
- Criado `docs/roadmap-boss-abilities.md`: Pressure, Intrepid Sword e As One (Unnerve + Grim Neigh) permanecem pendentes; o roteiro define comportamento, integração e regressões.
- Validação: 2.743 testes aprovados em 39 suítes, zero falhas, incluindo 13 novas regressões; auditorias de learnsets e conclusão do roadmap aprovadas. Prévia da nova equipe conferida em navegador.
- Alterações locais, ainda sem commit ou publicação.

## Atualização — 01/11/2026: Desafio Mewtwo após Shadow

- Novo desafio 3x3 com Mewtwo (150), Mega Mewtwo X (10043) e Mega Mewtwo Y (10044), disponível somente após derrotar Shadow.
- Acesso pelo encerramento da campanha e pelo Núcleo Psíquico na Região Final, preservando campanhas antigas já concluídas.
- Abertura cinematográfica em seis cenas, revelando o time real do confronto, com arena psíquica, identidade visual e tema musical próprios.
- Na primeira vitória, o jogador escolhe uma das três formas ainda não possuídas para o elenco permanente. Derrotas permitem nova tentativa; revanches não duplicam recompensas. Se todas as formas já forem possuídas, a vitória conclui o desafio sem bloquear o fluxo.
- Progresso, tentativas e recompensa persistidos no salvamento existente; entradas inconsistentes antes de vencer Shadow são descartadas.
- Validação: 2.730 testes aprovados, 39 suítes, zero falhas; auditorias de learnsets e conclusão do roadmap aprovadas. Conferência visual da abertura, entrada na arena e ponto do mapa em navegador.
- Alterações locais, sem commit, push ou deploy nesta etapa.

## Atualização — 01/11/2026: correção de persistência contínua dos efeitos visuais de status (PBA-020)

- **Correção da Persistência Contínua dos Efeitos Visuais:**
  - Identificada e corrigida a causa raiz da desaparição precoce dos efeitos de status: a transição de turnos e resolução de ações em BattleView.renderActiveBattleView reconstruía o DOM via innerHTML sem re-sincronizar o controlador de status.
  - Adicionada sincronização contínua obrigatória em ssets/js/ui/battle-view.js (syncRegistries()): invocação de compositeAdapter.statusController.syncFromBattleState(...) a cada mudança de estado da batalha.
  - Fortalecido ssets/js/presentation/status-vfx/pokemon-status-vfx-controller.js:
    -
esolveContainer agora detecta nós desconectados (isConnected === false) e restaura a referência ativa a partir do DOM.
    - pplyStatus e pplyConfusion agora são idempotentes: não redefinem innerHTML desnecessariamente quando a mesma condição já está ativa, preservando o relógio de animações CSS contínuas.
    - Métodos de pulso temporário (pulseDamage, pulseImmobilized, pulseConfusionCheck, pulseConfusionDamage) restauram o status dinamicamente caso o nó tenha sido reconstruído.
    - Implementados métodos públicos de consulta: getStatus, hasConfusion, getState e getConfusionState.
    - Suporte persistente da classe .pba-status-reduced-motion no root overlay em modo de movimento reduzido.
- **Ampliação da Cobertura de Testes Automatizados (ST41–ST55):**
  - Implementados 15 novos testes em 	ests/presentation/pokemon-status-vfx.test.js cobrindo persistência imediata, pós-animação de entrada, passagem de turno com rebuild do DOM, múltiplos turnos contínuos, ataques corporais (playAttack), reações de dano (playDamageReaction), pulsos de dano residual e imobilização, remoção condicionada à cura real na engine, restauração em trocas de Pokémon no banco, coexistência com confusão, independência nos 4 slots em duplas, limpeza no nocaute/reset e acessibilidade em movimento reduzido.
- **Validação e Regressão:**
  - Suíte completa: **2.719 testes aprovados em 39 suítes, zero falhas** (+15 novos testes aprovados).
  - Evidências em navegador real (Edge headless via CDP) comprovando persistência contínua através de múltiplos turnos: evidence_persistence_1_applied.png a evidence_persistence_7_mobile.png.
  - Zero alterações no motor de combate, regras, IA ou cálculos matemáticos.

## Atualização — 01/11/2026: efeitos visuais de condições de status nos Pokémon (PBA-020)

- Implementada a identidade visual canônica das condições de batalha nos Pokémon, reproduzindo a experiência visual dos jogos da franquia sem depender unicamente de texto:
  - **Queimadura (Burn):** brasas e chamas alaranjadas na base do corpo (`#f97316`), com pulso de combustão evidente e aumento de chamas no evento de dano residual (`STATUS_DAMAGE`).
  - **Veneno (Poison):** bolhas e partículas roxas translúcidas ascendentes (`#a855f7`) com névoa leve na base e pulso cáustico borbulhante e gotejante no dano residual, visualmente distinto do fogo.
  - **Veneno Grave (Toxic):** mantém base de veneno com acréscimo de miasma violeta-escuro denso (`#701a75`), glifos pontiagudos de perigo em losango e surto cáustico violento no dano residual progressivo.
  - **Paralisia (Paralysis):** arcos elétricos amarelos intermitentes (`#facc15`) com descarga de imobilização em gaiola elétrica quando a ação é impedida (`STATUS_IMMOBILIZED`).
  - **Sono (Sleep):** respiração serena em ritmo suave azul-céu (`#93c5fd`) e símbolos "Z" flutuantes ascendentes, sem simular dano, dor ou oscilação violenta.
  - **Congelamento (Freeze):** cristais azulados facetados e camada translúcida de gelo (`#38bdf8`), mantendo o Pokémon totalmente reconhecível sob o gelo e emitindo brilho gélido (glint) quando impedido de agir.
  - **Confusão (Confusion):** estrelas e espirais douradas girando em órbita elíptica 3D ao redor da cabeça (`#fbbf24`), em ritmo perceptível, sem parecer paralisia. Camada volátil totalmente independente que coexiste visualmente com qualquer condição primária (ex: Snorlax dormindo com Zs + estrelas orbitando, ou Charizard queimando com chamas + estrelas).
- **Arquitetura Visual e DOM Desacoplada:**
  - O motor de combate (`BattleEngine`) permanece como única fonte de verdade; nenhum cálculo de dano ou RNG ocorre na apresentação.
  - Não altera `transform`, `opacity` ou `filter` do elemento sprite do Pokémon (preservando integralmente as animações corporais de ataque, recuo de dano, respiração idle e desmaio do `PokemonAnimationController`).
  - Camada visual montada em overlay absoluto desacoplado (`.pba-status-vfx-root`) com `pointer-events: none` e subcamadas independentes `.pba-status-primary` e `.pba-status-confusion`.
  - Reação imediata aos eventos do motor: entrada suave breve (450ms) que transita para indicação persistente, pulso reforçado apenas no dano/imobilização/confusão e remoção instantânea na cura, despertar, descongelamento ou término de confusão.
  - Trocas (`SWITCH_OUT_SEQUENCE` e `SWITCH_IN_SEQUENCE`): o Pokémon que sai tem seus efeitos limpos imediatamente; o Pokémon que entra recebe seu status persistente diretamente sem disparar animação de entrada; nenhum efeito é transferido indevidamente.
  - Reconstrução de tela / renderização entre turnos: `syncFromBattleState` e `syncFromCombatant` restauram os efeitos persistentes sem re-executar animação de entrada.
  - Nocaute (`FAINT_SEQUENCE`) e fim de combate (`BATTLE_RESULT`): desalocação e limpeza completa de todas as camadas e timers.
- **Suporte Abrangente a Todos os Formatos:**
  - Batalhas individuais (1x1), equipes (3x3), campanha (treinadores, mestres elementais, selvagens), Final Stand de Shadow e duplas.
  - Em duplas, mapeamento por slot (`player:0`, `player:1`, `enemy:0`, `enemy:1`) garante isolamento visual estrito entre os 4 combatentes ativos simultâneos.
- **Acessibilidade e Desempenho:**
  - Suporte total a `prefers-reduced-motion: reduce` e classe `.pba-reduced-motion`, substituindo animações infinitas por representações estáticas legíveis e de alto contraste.
  - Implementação pura em CSS acelerado por GPU (hardware-accelerated transforms e opacities) sem loops pesados de partículas na CPU.
- **Catalogação de Outros Estados do Motor (Candidatos Futuros):**
  - Sonolência transitória (Yawn/Drowsy), Hesitação (Flinch), Proteção Ativa (Protect/Detect), Recarga Obrigatória (Hyper Beam, etc.), Carga em Dois Turnos e Semi-invulnerabilidade (Solar Beam, Fly, Dig, Dive, Bounce), Armazenamento de Bide, Preparação Ofensiva Condicional (Beak Blast/Shell Trap), Modificadores de Atributos (Stat Stages) e Vínculo de Commander em duplas.
- **Validação e Homologação:**
  - 40 testes automatizados novos em `tests/presentation/pokemon-status-vfx.test.js` cobrindo constantes, identidades, independência de DOM, aplicação, persistência, pulsos de dano/imobilização, coexistência de confusão, trocas, nocautes, duplas e integração com o adaptador composto.
  - Execução completa da suíte: **2.704 testes aprovados em 39 suítes, zero falhas**, zero cancelados, zero ignorados.
  - Homologação visual em navegador real (Edge headless via CDP) no harness `tests/visual/pokemon-status-vfx-harness.html`, registrando evidências nos viewports desktop (1280x850) e mobile (390x844):
    - `evidence_status_vfx_gallery_desktop.png`: galeria completa com as 7 condições e coexistências (sono+confusão e fogo+confusão).
    - `evidence_status_vfx_gallery_mobile.png`: responsividade dos cards em dispositivo móvel.
    - `evidence_status_vfx_battle_live_desktop.png`: arena em tempo real com Pikachu (Queimadura) vs Gengar (Veneno Grave + Confusão).
    - `evidence_status_vfx_doubles_isolation.png`: batalha em duplas com 4 posições isoladas ativas (`player:0` queimadura, `player:1` paralisia, `enemy:0` veneno grave, `enemy:1` congelamento + confusão).
    - `evidence_status_vfx_reduced_motion.png`: modo com movimento reduzido ativado.
  - **Homologação Final em Jogo Real (Fases 1 a 4 — 18/18 asserções aprovadas, 100% verde):**
    - **Fase 1 (Batalha Real):** Aplicação, persistência, pulso de dano residual (queimadura, veneno, toxic) e imobilização (paralisia, sono, congelamento) verificados em combate vivo na interface normal (`index.html`). Coexistência simultânea de confusão com condições primárias validada em combate.
    - **Fase 2 (Ciclo de Vida):** Troca de Pokémon (`SWITCH_OUT_SEQUENCE` e `SWITCH_IN_SEQUENCE`) com limpeza no mon que sai e restauração imediata sem animação de entrada no mon que entra; cura/despertar/descongelamento removendo apenas a camada específica; nocaute (`FAINT_SEQUENCE`) desalocando o slot; fim de batalha (`BATTLE_RESULT`), reinício (`rematch`) e saída (`leaveBattle`) com zero overlays e zero timers órfãos no DOM.
    - **Fase 3 (Responsividade e Desempenho):** Execução com 4 Pokémon ativos em batalha de duplas sem cross-contamination; ausência de conflitos entre animações de ataque (`MOVE_ANNOUNCEMENT`) e overlays de status; responsividade mobile (390x844) sem overflow horizontal; desativação de animações infinitas sob `prefers-reduced-motion: reduce` mantendo identificação visual.
    - **Fase 4 (Regressão Total):** 2.704 testes aprovados em 39 suítes, zero alterações no motor de regras de combate, RNG ou fórmulas de dano.
    - Evidências reais geradas: `evidence_phase1_burn_live.png`, `evidence_phase1_poison_live.png`, `evidence_phase1_toxic_live.png`, `evidence_phase1_paralysis_live.png`, `evidence_phase1_sleep_live.png`, `evidence_phase1_freeze_live.png`, `evidence_phase1_confusion_live.png`, `evidence_phase1_coexistence_sleep_burn_confusion.png`, `evidence_phase2_switch_sequence.png`, `evidence_phase2_faint_cleanup.png`, `evidence_phase3_doubles_4mon_live.png`, `evidence_phase3_doubles_mobile.png`, `evidence_phase3_reduced_motion_live.png`, e relatório estruturado `visual_homologation_status_results.json`.
- Alterações locais preservadas diretamente no projeto em `C:\pokemon`, sem commit, push ou deploy.

## Atualização — 01/11/2026: aberturas das quatro provas finais e áudio Shadow

- Auditoria de aprendizado publicada em 154b38b9c77855769602ac7dacad00ab33efac9f, hash confirmado em origin/main, sem deploy manual.
- Criadas aberturas de seis planos para Lendária, Mítica, Titãs e Celestial: suspense ambiental, revelações individuais e formação completa com o time efetivamente preparado. Cenários existentes, identidades próprias, trilhas procedurais e cries nas revelações.
- Integração entre preparação e início do combate, confirmação final, skip/Escape, foco/rolagem, movimento reduzido, pausa em aba oculta e prevenção de clique duplicado. Sem escrita no progresso ou mudança de equipes/recompensas.
- Shadow: desbloqueio no clique antes das esperas, controlador de áudio compartilhado explicitamente, melodia mais perceptível e versão do arquivo renovada. Tema de batalha retoma o contexto e invalida inícios cancelados; mute/volume preservados.
- Treze regressões novas; 2.664 testes / 38 suítes aprovados. Quatro cenas verificadas em navegador, Celestial em viewport móvel e transição real ao combate. Sinal de áudio confirmado no diálogo e na batalha Shadow. Relatório: docs/endgame-trial-cinematics.md.
- Novas cenas e ajustes de áudio locais, ainda sem novo commit/push. Registros abaixo são históricos.
## Atualização — 01/11/2026: auditoria de golpes por espécie e forma

- Conferidos os 1.351 registros / 1.349 aptos contra snapshot versionado da PokéAPI: 30.713 atribuições entre oito fontes, zero incompatibilidades restantes. Relatório: docs/pokemon-learnset-audit.md e .json.
- Zamazenta deixou de receber Earthquake; Stone Edge substitui o golpe nos conjuntos fixo e legado. Corrigido Vine Whip para ID 22 e removida sua equivalência indevida com Absorb 71; sua mecânica é dano físico sem drenagem.
- Contingência de rede usa somente golpes comprovados da espécie/forma; retiradas as concessões genéricas por tipo e o Tackle artificial para espécies desconhecidas. Identidades conflitantes são descartadas; IDs ausentes são resolvidos pelo nome oficial.
- Referência local imutável de aprendizado, filtro das opções da campanha e auditoria reproduzível sem rede. Preservados aprendizado histórico, herança de formas sem lista própria e exceções explícitas das formas coroadas/Sketch.
- Nove regressões novas; 2.651 testes / 38 suítes aprovados, zero falhas/cancelados/ignorados. Auditoria do roadmap preserva 384 FULL, zero PARTIAL. Publicado em 154b38b, confirmado em origin/main.
## Atualização — 01/11/2026: efeitos de ataque nas quatro posições de duplas

- Corrigida a causa da ausência de efeitos: o palco de duplas não registrava seus sprites nos controladores de animação, VFX e câmera. Agora as quatro posições têm âncoras independentes, usando os efeitos já existentes da batalha comum.
- Eventos e comandos preservam atacante, alvo e posição de troca. Golpes em área apresentam efeitos para cada alvo, incluindo aliado; cura de aliado e golpes no próprio usuário mantêm seus destinos. Erros, imunidade e proteção preservam o feedback correspondente.
- Entradas, ataques, reação ao dano, nocautes, trocas e vitória usam as posições corretas. A troca atualiza somente seu slot, sem reconstruir a arena no meio da sequência; referências dos efeitos são renovadas ao renderizar e os efeitos temporários são removidos no reset.
- Validação: oito regressões novas de apresentação e 2.642 testes aprovados / 38 suítes, sem falhas/cancelados/ignorados. Teste real no navegador confirmou projétil de fogo, ataque corporal, término do turno e limpeza dos efeitos, sem erros observados.
- Usuário autorizou commit e push deste conjunto, incluindo a arena refeita no ciclo anterior.
## Atualização — 01/11/2026: duplas no palco da Battle Arena

- Substituída a apresentação por cartões por um campo compartilhado com quatro sprites: dupla do jogador em primeiro plano e adversários ao fundo, no estilo da batalha comum.
- Reutilizados cenários e controlador de ambiente existentes; arena de estádio no modo rápido e resolução temática preservada quando informada no contexto. HUDs separados com HP, nível e condição por posição.
- Controles de ação/alvo/reserva preservados. Commander oculta o Pokémon incorporado; dano e nocautes têm feedback no sprite correspondente. Layout ajustado para celular.
- Validação: 2.634 testes aprovados / 38 suítes; teste real no navegador com dano, nocaute e reserva na posição correta, conferência móvel e zero erros de console observados.
- Alteração visual solicitada após a publicação fa0d555; este novo ajuste ainda não foi publicado.
## Atualização — 01/11/2026: controles e validação visual das duplas

- Arena compacta e responsiva, identificação das posições, condições e HP. Alvos automáticos desativam a seleção e explicam golpes em área, inclusive risco ao aliado.
- Pivôs permitem escolher a reserva; Baton Pass preserva sua transferência. Reservas repetidas são rejeitadas antes de enviar o turno; uma reserva que ficou indisponível não é substituída silenciosamente por outra.
- Escolhas preservadas por Pokémon durante a batalha, substituições com seleção explícita e erros exibidos na tela. Mecânicas especiais ficam desativadas ao escolher troca/recarga.
- Validação manual no navegador: batalha real, golpe em área, troca e avanço ao turno seguinte; conferência responsiva sem transbordamento horizontal. Sem erros de console observados.
- Testes de regressão para prévia imutável, reserva manual, Baton Pass, conflitos e controles. Auditoria de conclusão preserva 384 FULL e zero PARTIAL. Alterações locais, ainda sem commit/push.
## Atualização — 01/11/2026: sete pendências concluídas e modo de duplas implementado

- **P1 publicada: b14e942d145b7cce57a96e5618ceb264dd54e8fa**, hash confirmado em origin/main antes de iniciar este ciclo. P8 já publicada como dd90fd0.
- Implementados Axe Kick (dano ao falhar), Matcha Gotcha (drenagem), Sacred Sword/Darkest Lariat (ignorar estágios/evasão), Spectral Thief (roubar aumentos), Pollen Puff (cura de aliado) e Order Up/Commander. **384 golpes conhecidos FULL; zero PARTIAL e zero dependências cadastradas pendentes**. Não equivale a todos os golpes da PokéAPI.
- Usuário autorizou explicitamente incluir duplas. Novo modo na aba Batalhar: dois ativos por lado, ações/alvos por posição, dano em área, PP/rolagens por alvo, reservas, nocautes, substituições, IA e apresentação. Interface atual usa equipe de três (dois ativos + reserva); API aceita 2–6. Campanha existente permanece individual.
- Commander implementado para as três formas de Tatsugiri com Dondozo: +2 em cinco atributos, vínculo/ocultação/bloqueio de ações e trocas, resíduos e liberação ao cair; Order Up dá o aumento correspondente à forma. P7 agora tem 36/36 pilotos FULL.
- Spectral Thief adicionado a Marshadow e Matcha Gotcha a Sinistcha, sem remover opções anteriores. **543 espécies com extras**, até seis opções, 1.349 aptos e draft 450 preservados. Duplas prioriza os pilotos novos nos conjuntos legais; preferências explícitas prevalecem.
- **55 testes novos; 2.629 testes / 38 suítes aprovados**, zero falhas/cancelados/ignorados. Auditorias P1/P4/P5/P6/P7/P8/draft e audit-roadmap-completion.js aprovadas. Gerador offline reproduzível; interface validada automaticamente, sem homologação visual manual.
- Roadmap vigente e limites em docs/roadmap-completion.md. Expansões futuras: golpes/habilidades/itens fora do catálogo, outros Z/Gigantamax, Mega/Primal/Ultra Burst dinâmicos, múltiplos slots persistentes de Sketch e ampliação/polimento das regras de duplas. Pivôs em duplas usam a primeira reserva disponível neste ciclo.
- Publicação deste conjunto autorizada pelo usuário em 01/11/2026; o commit de conclusão do roadmap e duplas consta no histórico Git. Sem deploy manual. Os registros abaixo são históricos.

## Atualização — 01/11/2026: bloco de críticos da P1 concluído

- Após a P8 publicada como **dd90fd0**, implementado crítico comum de 1/24 e chance elevada de 1/8 para os **13 pilotos P1**, agora FULL. Multiplicador 1,5×, estágios desfavoráveis ignorados, barreiras ignoradas e queimadura/modificadores preservados. Relatório: docs/roadmap-p1.md.
- Rolagens externas independentes por acerto, fonte aleatória injetável, sessões de ambos os lados, trocas, carga/Power Herb, Sleep Talk, variantes Max/Z e mensagem de acerto crítico integrados. Motor e IA continuam determinísticos e sem RNG interno.
- Avaliador inclui chance/máximo de crítico e média ponderada, mantendo o mínimo comum para nocaute garantido. Corrigida a preservação dos modificadores de atributo no crítico garantido de Surging Strikes.
- **52 testes novos; 2.574 testes aprovados / 38 suítes**, zero falhas/cancelados/ignorados. Auditorias P1/P4/P5/P6/P7/P8/draft aprovadas. UI validada automaticamente, sem homologação visual manual.
- **384 golpes conhecidos: 377 FULL, 7 PARTIAL**. P6 tem 70/70 FULL; P7 tem 35 FULL e Order Up PARTIAL por duplas. Nenhuma dependência PHASE_P1 permanece no catálogo conhecido.
- Restam P2: Axe Kick/Matcha Gotcha; P3: Sacred Sword/Darkest Lariat/Spectral Thief; duplas: Pollen Puff/Order Up. Itens/habilidades de crítico fora dos pilotos, bem como expansões futuras P8, não foram liberados implicitamente.
- Cross Chop adicionado ao pool de Psyduck e Karate Chop ao de Mankey por learnsets legais, sem remover opções anteriores. Mantidos saves, 1.349 registros aptos, 542 espécies com extras (até seis opções) e draft 450. Este bloco permanece **local, sem novo commit/push/deploy**. Registros abaixo são históricos; para o estado atual, usar esta atualização e as auditorias.

## Atualização — 01/11/2026: P8 concluída no escopo individual dos pilotos

- Entregues **Transform/Sketch, formas e tipos dinâmicos, Dynamax padrão (18 ataques Max + Max Guard), Terastallization (19 tipos, incluindo Stellar), Terapagos/Ogerpon e o golpe Z de Necrozma Ultra**. Relatório e limites: docs/roadmap-p8.md.
- **Uma mecânica especial por equipe por batalha: Dynamax OU Tera OU golpe Z piloto**. Preparação permite salvar tipo Tera e preferência; controles na batalha confirmam a ativação. IA, interface, PP originais e sessões de ambos os lados integrados.
- Imposter/Hunger Switch/Tera Shift/Tera Shell/Teraform Zero/Embody Aspect implementadas. Corrigidos HP/retorno de Dynamax e Terapagos, interações de proteção, múltiplos acertos, Stellar/Sleep Talk e restauração sem reviver nocauteados.
- Sketch mantém **um slot persistente** para Smeargle na conclusão normal de campanha; abandono/Quick/inimigo/convidado não persistem. Ditto/Smeargle liberados: **1.349 registros aptos; Cosmog/Cosmoem apenas coleção**. Hidden Power já era FULL na P5.
- **13 pilotos P8 FULL; zero dependências essenciais PHASE_P8**. Catálogo: 384 golpes, 364 FULL, 20 PARTIAL com dependências preservadas. P5: 60/60 FULL; P6: 68 FULL e dois PARTIAL por P1.
- **542 espécies com extras**, até seis opções; draft de 450 (50/geração) e saves preservados. Gerador offline reproduzido sem mudanças adicionais.
- **2.522 testes aprovados / 38 suítes**, zero falhas/cancelados/ignorados. Auditorias P4/P5/P6/P7/P8/draft aprovadas. Interface validada automaticamente; sem homologação visual manual.
- Fora deste escopo: outros golpes Z, assinaturas Gigantamax, ativação dinâmica Mega/Primal/Ultra Burst, quatro slots persistentes de Sketch e duplas/Commander. Pendências próprias de P1/P2/P3 e habilidades/itens fora dos pilotos continuam explícitas.
- P7 publicada como 8b37729. **P8 local, sem novo commit/push/deploy**. Registros abaixo descrevem o fechamento histórico de cada fase; o estado vigente é esta atualização e as auditorias atuais.

## Atualização — 31/10/2026: P6 publicada e catálogo P7 implementado

- Commit/push da P6: **a58a9e9d54965a1b13d6c0ab8bf7319d96ae1654**, confirmado em origin/main. Publicação da P7 autorizada pelo usuário; consultar o histórico Git para o commit correspondente.
- P7 no escopo explícito de batalhas individuais: **66 habilidades, 66 itens, quatro climas, quatro terrenos e 36 golpes pilotos** (33 FULL; 13/143 PARTIAL por P1 e 856 por Commander/duplas).
- Preparação da campanha: habilidade natural e item por Pokémon, preferências sanitizadas/persistidas e restauração dos itens na batalha seguinte. Habilidades fora dos pilotos continuam inativas e rotuladas como pendentes.
- Todos os pilotos disponíveis em opções legais da campanha. **538 espécies com extras**, máximo de seis opções; 450 espécies do draft e quatro apenas de coleção preservadas.
- Suíte completa: **2.366 testes / 38 suítes**, zero falhas, cancelados ou ignorados. Testes de interface com DOM simulado; sem homologação visual manual.
- Auditorias P4/P5/P6 preservadas. P7: node scripts/audit-p7.js, zero pendências essenciais PHASE_P7 nos golpes conhecidos. Relatório completo: docs/roadmap-p7.md.
- Próximo bloco: P8. Outros itens/habilidades fora dos pilotos e pendências específicas de P1/P2/P3 continuam explícitos. Commit e push da P7 autorizados pelo usuário; sem deploy manual.

## Atualização — 31/10/2026: P6 concluída no motor atual de batalhas individuais

- Fechamento das famílias de proteção/recarga/carga, semi-invulnerabilidade, aprisionamento, semente, armadilhas de entrada, remoção, barreiras, pivôs/interceptação, sequências obrigatórias, Minimize, Focus Punch e restrição de uso consecutivo. Estado vigente e limites em docs/roadmap-p6.md; registros anteriores abaixo são históricos.
- Corrigidas as três falhas revisadas: Fissure não atinge Dig; bônus de Gust/Twister/Earthquake/Surf altera dano, não poder; previsão considera ordem e empate ao sair da semi-invulnerabilidade. Correções anteriores de Protect/Bide/Sleep Talk/Hyper Drill e inicialização estrita preservadas.
- Pivôs usam escolha real de substituto e preservam somente a ação ainda não executada, com cópia independente dos comandos. Cobertos dois pivôs no mesmo turno, hazards/KO na entrada, KO do alvo, Pursuit, Baton Pass antes dos efeitos de entrada e encerramento sem comandos pendentes. IA, sessão, interface, campo e mensagens integrados.
- Aprisionamento de 4/5 turnos e sequências de 2/3 turnos recebem rolagens externas independentes; Ghost pode escapar de aprisionamento. Leech Seed, poison/burn e binding usam ordem residual adequada. Barreiras duram cinco turnos, não reduzem dano fixo nem críticos garantidos e não se empilham com o componente de Aurora Veil.
- Conjuntos limitados por Gigaton Hammer/Blood Moon têm fallback legal de Struggle, para evitar travamento quando sem outro golpe ou sob aprisionamento. Esse fallback específico não promove Struggle a golpe equipável nem encerra as demais pendências P2.
- Auditoria reproduzível node scripts/audit-p6.js: **70 pilotos, 61 FULL, 8 PARTIAL apenas por P1/P7/P8, 1 BLOCKED por clima P7; zero pendências essenciais P6**. Componente de barreira de Aurora Veil pronto/testado, mas ativação continua bloqueada por clima; não foi inventado clima neste ciclo. Todas as definições utilizáveis auditadas estão na campanha.
- Campanha: 524 espécies com extras / 147 definições curadas / 1.347 registros aptos. Quatro golpes fixos e 450 selecionáveis iniciais preservados. Pilotos novos ocuparam espaços livres; Anchor Shot substituiu o extra Surf de Dhelmise por ser seu único usuário canônico. Preferências antigas podem retornar ao padrão pela validação existente; nenhum save regravado diretamente.
- Validação: **233 testes novos no fechamento; suíte completa com 2.139 aprovados, 38 suítes, zero falhas/cancelados/ignorados, saída 0**. Auditorias P4/P5/P6/draft aprovadas, regeneração offline idêntica e git diff --check aprovado. P4: 364 conhecidos, 318 FULL, 45 PARTIAL, zero pendências P4. P5: 60 pilotos, 57 FULL, 3 PARTIAL externos, zero pendências P5.
- Próximo bloco: P7 (habilidades, itens, clima, terrenos). P1/P2/P3/P8 não foram declaradas concluídas. Publicação do fechamento P6 autorizada em 31/10/2026; consultar o histórico Git para o hash. Sem deploy manual; commit de proteção observado fb10f47. Alterações locais de carga do Antigravity preservadas e corrigidas.

---

## Atualização — 31/10/2026: P6 em andamento — Golpes de Carga em Dois Turnos e Semi-invulnerabilidade (Solar Beam, Fly, Dig, Dive e Bounce)

- Implementados cinco golpes de carga em dois turnos e semi-invulnerabilidade com metadados canônicos oficiais e regras modernas (Gen VI+):
  - **Solar Beam (#76)**: Grass/Special, Poder 120, Precisão 100, PP 10, Prioridade 0, sem semi-invulnerabilidade (`semiInvulnerable: null`, `prepReason: 'CHARGE_SOLAR'`). Suporte PARTIAL (`knownPending: ['WEATHER_PHASE_P7', 'ITEM_PHASE_P7']`).
  - **Fly (#19)**: Flying/Physical, Poder 90, Precisão 95, PP 15, Prioridade 0, estado aéreo (`semiInvulnerable: 'airborne'`, `prepReason: 'FLY_UP'`). Suporte FULL (`knownPending: []`).
  - **Dig (#91)**: Ground/Physical, Poder 80, Precisão 100, PP 10, Prioridade 0, estado subterrâneo (`semiInvulnerable: 'underground'`, `prepReason: 'DIG_UNDERGROUND'`). Suporte FULL (`knownPending: []`).
  - **Dive (#291)**: Water/Physical, Poder 80, Precisão 100, PP 10, Prioridade 0, estado submerso (`semiInvulnerable: 'underwater'`, `prepReason: 'DIVE_UNDERWATER'`). Suporte FULL (`knownPending: []`).
  - **Bounce (#340)**: Flying/Physical, Poder 85, Precisão 85, PP 5, Prioridade 0, estado aéreo (`semiInvulnerable: 'airborne'`, `prepReason: 'BOUNCE_UP'`). Suporte FULL (`knownPending: []`). Efeito secundário canônico de 30% de chance de paralisia no alvo ao acertar.
- Ciclo de carga e resolução em dois turnos:
  - Turno 1: Consome 1 PP (`PP_CHANGED`), emite `MOVE_PREPARED` com motivo canônico e estado de semi-invulnerabilidade, registra `attacker.twoTurnMove = { id, name, state }`, reseta `stallCount = 0` e bloqueia troca voluntária do usuário.
  - Turno 2: Limpa `attacker.twoTurnMove = null`, reseta `stallCount = 0`, executa o ataque com `MOVE_USED` e `DAMAGE_APPLIED`, sem consumir PP adicional (não emite `PP_CHANGED`), mesmo se o PP restante tiver chegado a 0. Força a continuação do golpe mesmo se comando alternativo for submetido.
  - Se o defensor realizar troca voluntária no turno 2, o ataque de carga atinge o Pokémon recém-entrado.
- Defesa e exceções da semi-invulnerabilidade:
  - Golpes comuns contra alvos em estado aéreo, subterrâneo ou submerso erram com evento `MOVE_MISSED` e `reason: 'SEMI_INVULNERABLE'`, marcando `attacker.lastMoveFailed = true`. Golpes que nunca erram (Swift #129, Aerial Ace #332) e Hyper Drill (#887) NÃO ultrapassam a semi-invulnerabilidade.
  - **Airborne (Fly e Bounce)**: Gust (#16) e Twister (#239) acertam causando o dobro de dano (multiplicador 2x); Thunder (#87), Hurricane (#542) e Sky Uppercut (#327) acertam com dano normal (1x); Toxic (#92) usado por Pokémon do tipo Venenoso acerta; Toxic de não-Venenoso erra.
  - **Underground (Dig)**: Earthquake (#89) acerta causando o dobro de dano (2x); Fissure (#90) acerta e aplica nocaute (OHKO); Toxic (#92) de tipo Venenoso acerta; Toxic de não-Venenoso erra.
  - **Underwater (Dive)**: Surf (#57) acerta causando o dobro de dano (2x); Toxic (#92) de tipo Venenoso acerta; Toxic de não-Venenoso erra.
  - **Solar Beam**: sem semi-invulnerabilidade, usuário pode ser atingido normalmente durante o turno de carga.
- Impedimentos e cancelamentos:
  - Imobilização pré-ataque no Turno 1 (sono, congelamento, hesitação, paralisia plena ou autoagressão por confusão) impede o início da carga e preserva o PP.
  - Imobilização no Turno 2 (congelamento, sono, paralisia plena ou autoagressão por confusão) cancela a execução e limpa `twoTurnMove = null`.
  - Nocaute, troca forçada ou saída de campo limpam `twoTurnMove = null`.
  - Sleep Talk exclui estritamente os cinco golpes de dois turnos (`!constants.isTwoTurnMove(m)`).
- IA e Avaliador:
  - `BattleEvaluator`: no turno de carga reporta `expectedDamage = 0`, `isTwoTurnMove = true`, `chargingTurn = true`, `projectedDamage > 0` e `guaranteedKo / possibleKo = false`. Contra defensor em semi-invulnerabilidade, zera dano esperado de golpes que não atingem o estado e calcula bônus canônico (2x) para exceções válidas.
  - `BattleAI`: bloqueia a seleção no turno 2 forçando a ação de continuação com `reason: 'TWO_TURN_LOCKED'`. Pontua golpes de carga com metade do dano projetado (`projectedDamage / 2`).
- Interface e Apresentação:
  - `BattlePresentationMapper` mapeia eventos `MOVE_PREPARED` e `MOVE_MISSED` com `reason: 'SEMI_INVULNERABLE'`.
  - `BattleUiDomAdapter` renderiza descrições narrativas para cada anúncio de preparação e exibe "O alvo está fora de alcance!" ao errar contra semi-invulnerabilidade.
  - `BattleView` renderiza botão de continuação obrigatória (`btnTwoTurnContinue`) com rótulo "Executar [GOLPE]" e desativa botão e modal de troca voluntária durante a carga.
- Customização da Campanha:
  - Dugtrio (#51): recebe `["dig"]`; total de espécies com extras aumenta de 489 para 491.
  - Spoink (#325): recebe `["bounce"]`.
  - Pidgeot (#18): substitui `swift` por `fly` (`["wing-attack", "fly"]`).
  - Wailord (#321): substitui `hyper-voice` por `dive` (`["hydro-pump", "dive"]`).
  - Exeggutor (#103): substitui `strength` por `solar-beam` (`["power-whip", "solar-beam"]`).
  - Catálogo offline regenerado: **491 espécies com extras (+2), 97 definições seguras (+5), 1.347 combatentes aptos, 4 golpes fixos preservados e 450 draft species intactas**.
- Validação:
  - 25 testes novos em `tests/battle/p6-two-turn.test.js`.
  - Suíte completa: **1.906 testes aprovados, 38 suítes, zero falhas/cancelados/ignorados; saída 0**.
  - Auditoria P4: 330 conhecidos, 274 FULL (+4), 56 PARTIAL (-1), zero pendências P4.
  - Auditoria P5: 60 pilotos, 57 FULL, 3 PARTIAL com dependências externas.
  - Auditoria draft da campanha aprovada (450 espécies íntegras); `git diff --check` aprovado com código 0.
- **P6 permanece em andamento**: aprisionamento/persistência, armadilhas de entrada, barreiras e trocas especiais continuam pendentes. Nenhum commit, push ou deploy realizado.

---

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
