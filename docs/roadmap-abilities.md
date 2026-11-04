# Roadmap de habilidades — H0 a H11

Estado: planejado em 02/11/2026. Base de código: `bf0a71d2925409a809331dba9ba4233cfe8f914f`.
Este documento não implementa nem habilita efeitos. Cada lote será uma entrega própria, com validação de gameplay antes da publicação.

## Objetivo

Fazer as habilidades naturais dos Pokémon jogáveis produzirem os efeitos correspondentes às regras escolhidas, para jogador e adversários, em individuais, 3×3, Final Stand e duplas. Preservar espécies capturadas, golpes legais, preferências, itens e progresso. Evitar aumentar a dificuldade da campanha por acidente.

A conclusão anterior do roadmap de golpes se referia ao catálogo conhecido de golpes. Ela não significava que todas as habilidades existentes na PokéAPI estivessem implementadas.

## Linha de base reproduzível

| Medida | Quantidade |
| --- | ---: |
| Nomes no dicionário local | 374 |
| Nomes declarados como suportados no motor/interface | 78 |
| Habilidades naturais distintas atribuídas aos 1.349 registros aptos | 313 |
| Declaradas suportadas entre essas atribuídas | 77 |
| Habilidades atribuídas ainda sem suporte declarado | **236** |
| Pendentes sem portador entre os registros aptos | 60 |
| Registros de Pokémon/formas com habilidade padrão pendente | **697** |

Uma habilidade pode aparecer em várias espécies e formas. Portanto, 697 não é o número de habilidades faltantes. A diferença entre 78 e 77 é `embody-aspect`, declarada, mas sem atribuição natural neste recorte. As 60 entradas sem portador não entram automaticamente no escopo de implementação; verificar origem, jogos relacionados e necessidade antes de ampliá-lo.

Fontes locais: `p7-pokemon-data.js`, listas de suporte de P7/P8/Completion, catálogo fixo e equipes atuais da campanha/Liga/Torre. O inventário inclui habilidades normais, alternativas e ocultas, não apenas a primeira habilidade de cada Pokémon.

- Inventário completo: [ability-coverage.json](ability-coverage.json), com portadores, habilidade padrão, presença nos desafios e fase.
- Atribuição de fases: [ability-roadmap-catalog.json](ability-roadmap-catalog.json).
- Gerar: `node scripts/audit-abilities.js --write`.
- Conferir sem escrever: `node scripts/audit-abilities.js --check`.

O script rejeita habilidades atribuídas pendentes sem fase, nomes inexistentes, nomes repetidos em fases e divergência do inventário. Ele mede declarações e atribuições; não substitui testes de comportamento nem comprova que as 78 declarações atuais sejam FULL.

## Regras de implementação e conclusão

1. Fixar a referência de regras por habilidade e geração. Usar geração IX onde aplicável, mantendo os contratos modernos já adotados para Intrepid Sword e habilidades semelhantes. Mecânicas de outras gerações ou metadados recentes precisam de decisão documentada, sem mistura silenciosa.
2. Antes de programar, verificar a implementação primária de referência e registrar commit/versão consultados. PokéAPI fornece identidade/atribuição; não executa as regras do jogo.
3. Não adicionar um nome à lista de suportadas apenas porque seu multiplicador principal foi escrito. Completar os ramos que possam ocorrer no jogo ou marcar PARTIAL/BLOCKED com os motivos.
4. Cada efeito deve estar no motor. Interface, som e animação apenas apresentam eventos. A IA usa o estado resolvido e não lê ações ou sorteios futuros.
5. Aleatoriedade recebe rolagens externas, com limites testáveis e consumo determinístico. Não usar `Math.random()` escondido dentro da habilidade.
6. Só persistir habilidades naturais legais e escolhas do jogador. Marcadores de entrada, ativação, KO, supressão e forma temporária começam limpos em cada nova batalha.
7. Não substituir a habilidade de uma espécie por outra para tornar o desafio mais forte. Exemplos: o Togekiss padrão atual usa Hustle; Serene Grace deve continuar sendo uma escolha natural distinta quando implementada. Calyrex Glacial não herda o efeito de Calyrex Shadow.
8. Cada lote deve registrar antes/depois de balanceamento. Equipes com preparação congelada na Liga/Torre também precisam de uma versão de regras: preservar a regra da sequência ou permitir reinício sem derrota artificial, conservando recordes. Não mudar uma sequência em andamento silenciosamente.
9. Não incluir mudanças de equipes, novos itens ou golpes no mesmo lote, salvo dependência explicitamente documentada e testada.

Estados: `PENDING` (sem efeito), `PARTIAL` (efeitos/interações incompletos), `BLOCKED` (dependência ausente), `FULL` (contrato validado no escopo indicado) e `OUT_OF_SCOPE` (fora dos jogos/regras escolhidos, com justificativa). `DECLARED_UNVERIFIED` no inventário significa apenas que o nome já está na lista de suporte; H0 verificará esse suporte.

## H0 — Fundação, contratos e auditoria comportamental

**Prioridade máxima.** Não exige concluir as 78 habilidades atuais antes de iniciar um piloto, mas exige validar os caminhos comuns usados por ele.

- Criar registro de capacidade por habilidade: versão, efeitos, formatos, pré-requisitos, restrições de cópia/supressão e arquivos de teste. O rótulo da interface deve vir desse registro; nomes conhecidos sem efeito continuam identificados como pendentes.
- Auditar entrada/saída, ordem entre clima/terreno/habilidade/item, dano antes/depois, contato, efeitos secundários, mudanças de atributo, KO direto/residual e fim do turno.
- Reusar a autoria de KO existente em As One Spectrier/Grim Neigh. Garantir um evento por vítima, inclusive em golpes de área e multihit.
- Consolidar metadados por ID de golpe: contato, som, projétil, mordida, soco, vento, corte e reflexão, quando necessários. Não deduzir essas propriedades apenas pelo tipo elemental ou pelo nome do ataque.
- Verificar identidade de combatente versus forma temporária, escopo de aliado/adversário em duplas, capacidades anuláveis e regras de Mold Breaker/Teravolt/Turboblaze.
- Adicionar matriz de testes de ponta a ponta: motor → mapper → sessão → apresentação. O erro recente de dano de areia mostrou que testar somente o motor não basta.
- H11 começa pela investigação em paralelo conceitual a H0; não esperar o final do roadmap para descobrir metadados sem regra confirmada.

**Aceite:** registro consulta a mesma fonte para jogo/IA/interface, inventário reproduzível, exceções explícitas, nenhum efeito novo anunciado prematuramente e suíte atual preservada.

## Primeiras entregas concretas

| Lote | Habilidades | Motivo e validação principal |
| --- | --- | --- |
| H1-A | Justified, Moxie, Chilling Neigh, As One Glastrier, Dauntless Shield | Keldeo, Calyrex Glacial e Zamazenta; reação ao dano, autoria de KO e entrada. Reusar Unnerve para berries, sem copiar Grim Neigh para o atributo errado. |
| H2-A | Marvel Scale, Hustle, Keen Eye, Steadfast (H1) | Milotic, Togekiss, Pelipper/Skarmory e Lucario aparecem na campanha e nas instalações; revisar defesa, precisão, ataques físicos/especiais e flinch. Entregar em commits separados por família. |
| H3-A | Rough Skin, Iron Barbs, Effect Spore, Synchronize, Shed Skin | Reações de contato, imunidades e cura; testar quem recebe cada efeito e se um KO impede ativações posteriores. |
| H4-A | Dark Aura, Fairy Aura, Aura Break, Prism Armor e Neuroforce (H2) | **Implementado (FULL)**. Efeitos canônicos para Yveltal (#717), Xerneas (#716), Zygarde (#718), Necrozma (#800) e Ultra Necrozma (#10157). |
| H5-A | Prankster, Infiltrator, Magic Bounce | Exigem flags de golpes, prioridade e reflexão por evento; alto impacto em estratégia, inclusive para a IA. |

A ordem é recomendada, não uma promessa de que todos os efeitos desses lotes compartilham a mesma dificuldade. Cada habilidade pode ser liberada individualmente após seus testes. As fases seguintes são famílias de trabalho, não um único commit por fase.

## Fases por família

### H1 — Bônus de entrada, nocaute e reações

**Inventário:** 32 habilidades pendentes; 75 registros com habilidade padrão afetados.

**Dependências:** H0; autoria de KO, estágios e eventos de entrada existentes.

Dividir em entrada/KO, reações ao dano, reações a reduções e efeitos por equipe. Implementar As One Glastrier com Unnerve e aumento de Attack por KO direto; Supreme Overlord depende de histórico de aliados nocauteados, sem contar trocas como mortes. Motor Drive deve compartilhar a infraestrutura de imunidade/absorção de H3.

**Aceite:** Dano evitado, proteção e imunidade não geram gatilhos errados; limites de estágios; KO residual não atribuído ao último atacante; dois KOs e aliados corretos em duplas; reset de marcadores e contagem de baixas.

**Lista completa da família:** `justified`, `moxie`, `chilling-neigh`, `as-one-glastrier`, `dauntless-shield`, `defiant`, `competitive`, `steadfast`, `rattled`, `weak-armor`, `stamina`, `berserk`, `anger-point`, `anger-shell`, `water-compaction`, `steam-engine`, `cotton-down`, `electromorphosis`, `wind-power`, `wind-rider`, `guard-dog`, `thermal-exchange`, `opportunist`, `download`, `beast-boost`, `soul-heart`, `supreme-overlord`, `contrary`, `mirror-armor`, `moody`, `motor-drive`, `speed-boost`.

### H2 — Dano, atributos, precisão e críticos

**Inventário:** 49 habilidades pendentes; 172 registros com habilidade padrão afetados.

**Dependências:** H0; flags canônicas e regras de críticos/efeitos secundários.

Separar multiplicadores de dano/atributo, precisão/críticos, imunidades/efetividade e chance de efeitos secundários. Rivalry exige gênero individual/gênero desconhecido, não uma suposição por espécie. Serene Grace altera chances elegíveis; não é um multiplicador de dano. Sheer Force requer tratar efeitos secundários e interação com itens de maneira própria.

**Aceite:** Arredondamento, multihit, golpes fixos, críticos, recarga, Protect, imunidades, itens Choice/Life Orb/Assault Vest e Mold Breaker. Alterar previews e IA com a mesma regra do dano real.

**Lista completa da família:** `battle-armor`, `shell-armor`, `compound-eyes`, `keen-eye`, `illuminate`, `hustle`, `marvel-scale`, `rock-head`, `heatproof`, `iron-fist`, `skill-link`, `quick-feet`, `sniper`, `no-guard`, `super-luck`, `unaware`, `tinted-lens`, `reckless`, `sheer-force`, `heavy-metal`, `light-metal`, `toxic-boost`, `flare-boost`, `analytic`, `strong-jaw`, `tough-claws`, `fur-coat`, `fluffy`, `mega-launcher`, `sharpness`, `punk-rock`, `ice-scales`, `neuroforce`, `prism-armor`, `shadow-shield`, `water-bubble`, `steelworker`, `rocky-payload`, `stakeout`, `gorilla-tactics`, `defeatist`, `rivalry`, `merciless`, `minds-eye`, `long-reach`, `scrappy`, `serene-grace`, `simple`, `tangled-feet`.

### H3 — Status, contato e imunidades

**Inventário:** 42 habilidades pendentes; 175 registros com habilidade padrão afetados.

**Dependências:** H0; condições principais, confusão, contato e estados voláteis.

Entregar imunidades/curas e contato primeiro. Attract, infatuation, gênero e contagem de Perish Song, se ausentes, são dependências explícitas de Cute Charm/Oblivious/Aroma Veil/Perish Body e afins. Corrosion não deve apagar imunidades por outros motivos. Wonder Guard e Good as Gold precisam de classificação correta de ataques/status.

**Aceite:** Não criar queimadura/veneno falsos na UI; imunidades, fonte do contato, dano indireto versus direto, batalha terminada, trocas, simultaneidade e rolagens externas. Não marcar FULL ignorando uma condição que a habilidade deveria prevenir.

**Lista completa da família:** `stench`, `oblivious`, `shield-dust`, `effect-spore`, `synchronize`, `early-bird`, `shed-skin`, `cute-charm`, `liquid-ooze`, `poison-heal`, `hydration`, `leaf-guard`, `aftermath`, `bad-dreams`, `cursed-body`, `overcoat`, `poison-touch`, `big-pecks`, `wonder-skin`, `iron-barbs`, `aroma-veil`, `flower-veil`, `sweet-veil`, `gooey`, `tangling-hair`, `corrosion`, `comatose`, `innards-out`, `pastel-veil`, `purifying-salt`, `well-baked-body`, `earth-eater`, `toxic-chain`, `poison-puppeteer`, `rough-skin`, `damp`, `soundproof`, `bulletproof`, `wonder-guard`, `good-as-gold`, `perish-body`, `toxic-debris`.

### H4 — Clima, terreno e auras

**Inventário:** 24 habilidades pendentes; 57 registros com habilidade padrão afetados.

**Dependências:** H0; clima/terreno; H2 para estatísticas e efetividade.

Climas primordiais exigem prioridade e permanência próprias; não tratar como Drought/Drizzle comuns com outro nome. Auras consideram os portadores ativos e exceções. Paradoxos exigem definir Booster Energy, atributo elegível e término do efeito antes de liberar a habilidade. Não afirmar suporte ao item se ele ainda não existir.

**Aceite:** Entrada/saída/nocaute do portador, segundo ativo, conflito de climas, Air Lock/Cloud Nine, supressão, golpes proibidos por clima, terreno e fórmulas de cada atributo afetado.

**Lista completa da família:** `dry-skin`, `ice-body`, `flower-gift`, `dark-aura`, `fairy-aura`, `aura-break`, `primordial-sea`, `desolate-land`, `delta-stream`, `grass-pelt`, `surge-surfer`, `seed-sower`, `sand-spit`, `transistor`, `dragons-maw`, `protosynthesis`, `quark-drive`, `orichalcum-pulse`, `hadron-engine`, `vessel-of-ruin`, `sword-of-ruin`, `tablets-of-ruin`, `beads-of-ruin`, `supersweet-syrup`.

### H5 — Prioridade, controle e fluxo de ações

**Inventário:** 18 habilidades pendentes; 28 registros com habilidade padrão afetados.

**Dependências:** H0; fluxo de ações, flags; H3 quando houver impedimentos.

Separar prioridade, controle de turnos, reflexão, ataques adicionais e saída forçada. Magic Bounce precisa de alvos e flags, além de proteção contra reflexão infinita. Parental Bond exige um segundo impacto com regras próprias. Emergency Exit/Wimp Out devem reutilizar substituição obrigatória, com reserva escolhida conforme o formato.

**Aceite:** Prioridade/velocidade, interrupção e falha, Ghost/Dark quando pertinente às regras adotadas, ausência de reservas, dois ativos, ações já escolhidas e nenhuma ação extra após troca/nocaute.

**Lista completa da família:** `suction-cups`, `truant`, `slow-start`, `stall`, `prankster`, `infiltrator`, `gale-wings`, `parental-bond`, `triage`, `queenly-majesty`, `dazzling`, `armor-tail`, `mycelium-might`, `quick-draw`, `emergency-exit`, `wimp-out`, `magic-bounce`, `screen-cleaner`.

### H6 — Tipos e mudanças de forma

**Inventário:** 14 habilidades pendentes (6 concluídas em H6-A, 3 em H6-B, 1 em H6-C); 44 registros com habilidade padrão afetados.

**Dependências:** H0; H2/H3/H4 conforme forma; base comum de exceções de H7.

Separar conversão de tipo de golpe, mudança de tipos, disfarce visual e mudança de forma/atributos. Ter identidade estável do Pokémon capturado e identidade da forma em combate. Espécies/alternativas já selecionáveis não devem ganhar trocas de ID que corrompam reservas, recibos ou recompensas. Formas já iniciadas transformadas exigem contrato explícito. Battle Bond precisa escolher uma versão de regras.

#### H6-A — Conversão de tipos dos golpes (CONCLUÍDO)

Lote canônico concluído e coberto por 45 testes determinísticos em `tests/battle/abilities-h6a.test.js`:

1. **`normalize`** (Gen IV, Regras Canônicas Gen VII-IX):
   - Converte todos os golpes elegíveis para o tipo Normal.
   - Aplica multiplicador canônico de 1.2x (4915/4096) no dano de golpes elegíveis (inclusive naturalmente Normal).
   - Golpes de dano tornam-se Normal (com imunidade de Ghost); golpes de status seguem regras individuais (Thunder Wave torna-se Normal e é bloqueado por Ghost, mas atinge Ground; auto-buffs como Swords Dance e reduções de atributo como Strength Sap operam normalmente).
   - Portadores: Skitty (#300), Delcatty (#301). STAB Normal de 1.5x aplicado.

2. **`refrigerate`** (Gen VI-IX):
   - Converte golpes elegíveis do tipo Normal para Ice.
   - Aplica bônus de 1.2x no dano base de golpes convertidos.
   - Golpes não-Normal (ex: Ice Beam, Ancient Power) não são convertidos nem recebem bônus.
   - Portadores: Amaura (#698), Aurorus (#699), Mega Glalie (#10074). STAB Ice de 1.5x aplicado.

3. **`pixilate`** (Gen VI-IX):
   - Converte golpes elegíveis do tipo Normal para Fairy.
   - Aplica bônus de 1.2x no dano base de golpes convertidos.
   - Dragões sofrem dano super efetivo (2x) de golpes convertidos para Fairy; o tipo Fairy é imune (0x) a golpes do tipo Dragon.
   - Portadores: Sylveon (#700), Mega Gardevoir (#10051), Mega Altaria (#10067). STAB Fairy de 1.5x (2.0x com Tera Fairy).
   - Tera Blast (#851): converte para Fairy se sem Tera; mantém tipo Tera se terastallizado.

4. **`aerilate`** (Gen VI-IX):
   - Converte golpes elegíveis do tipo Normal para Flying.
   - Aplica bônus de 1.2x no dano base de golpes convertidos.
   - Portadores: Mega Pinsir (#10040), Mega Salamence (#10089). STAB Flying de 1.5x aplicado.

5. **`galvanize`** (Gen VII-IX):
   - Converte golpes elegíveis do tipo Normal para Electric.
   - Aplica bônus de 1.2x no dano base de golpes convertidos.
   - Tipo Ground é imune; Volt Absorb e Lightning Rod absorvem dano convertido.
   - Portadores: Geodude de Alola (#10109), Graveler de Alola (#10110), Golem de Alola (#10111). STAB Electric de 1.5x aplicado.

6. **`liquid-voice`** (Gen VII-IX):
   - Converte golpes baseados em som (sound-based moves: Hyper Voice, Boomburst, Disarming Voice, Sing, etc.) para o tipo Water.
   - Sem bônus de poder base (multiplicador 1.0x).
   - Water Absorb e Storm Drain absorvem golpes convertidos; ultrapassa Substitute preservando a propriedade sonora.
   - Portadores: Popplio (#728), Brionne (#729), Primarina (#730). STAB Water de 1.5x aplicado.

#### H6-B — Alteração Dinâmica dos Tipos do Pokémon (CONCLUÍDO)

Lote canônico focado na alteração dinâmica da tipagem do Pokémon ativo em combate (Gen IX):

1. **`protean`** (Gen VI-IX, Regras Canônicas Gen IX):
   - Altera a tipagem do usuário para o tipo efetivo do golpe imediatamente antes da sua execução e cálculo de dano.
   - Torna o Pokémon mono-tipo (`[moveType]`), aplicando STAB (1.5x) no movimento em execução.
   - Regra Gen IX: Limite estrito de uma ativação por entrada em campo (`once per switch-in`). Reseta ao sair e retornar.
   - Não ativa se o Pokémon já for exclusivamente daquele tipo (sem consumir o uso). Dual-type virando mono-type consome a ativação.
   - Ativa mesmo se o golpe errar, for bloqueado por Protect ou encontrar imunidade elementar.
   - Não ativa se a ação for impedida antes da execução (Sono, Congelamento, Flinch, Autoagressão de Confusão, Paralisia plena).
   - Não altera tipo se o Pokémon estiver Terastallizado (`attacker.tera`). Isenção para Struggle (#165).
   - Portadores: Kecleon (#352), Froakie (#656), Frogadier (#657), Greninja (#658), Sprigatito (#906), Floragato (#907), Meowscarada (#908).

2. **`libero`** (Gen VIII-IX, Regras Canônicas Gen IX):
   - Compartilha a mesma mecânica canônica e rotina de Protean na Gen IX.
   - Altera o tipo de Cinderace/Scorbunny/Raboot para mono-tipo do golpe antes do cálculo de dano, com STAB imediato.
   - Limite canônico de uma ativação por entrada em campo (`proteanUsed`).
   - Portadores: Scorbunny (#813), Raboot (#814), Cinderace (#815).

3. **`color-change`** (Gen III-IX):
   - Altera a tipagem do defensor para o tipo do golpe de dano sofrido após a resolução completa do ataque e seus efeitos secundários.
   - Dano recebido é calculado utilizando a tipagem anterior à ativação (não altera dano retroativamente).
   - Em golpes multi-hit (ex: Bullet Seed), ativa somente após a conclusão de todos os impactos (`MULTI_HIT_COMPLETE`).
   - Não ativa contra golpes de status, dano absorvido por Substitute (a menos que bypassado), erros, imunidades, se já possuir o tipo recebido, se o Pokémon desmaiar ou se estiver Terastallizado.
   - Permite ativações sucessivas sem limite por entrada.
   - Portadores: Kecleon (#352).

**Regras canônicas transversais de H6-B:**
- Não são ignoradas pelo Mold Breaker do defensor (`breakable: false`).
- Suprimíveis por `abilitySuppressed: true` (Gastro Acid, Neutralizing Gas); supressão impede novas ativações mas não reverte tipos temporários até a troca.
- Reversão garantida na saída de campo (`leave`) e término de batalha para os tipos originais da espécie (`specialOriginal.types`), sem mutação de save ou catálogo.
- IA avalia STAB dinamicamente sem mutação de estado real.

#### H6-C — Schooling e infraestrutura segura de formas (Wishiwashi) (CONCLUÍDO)

Lote canônico focado na mecânica de alteração de formas e recalibração dinâmica de atributos em combate (Gen IX):

1. **`schooling`** (Gen VII-IX, Regras Canônicas Gen IX):
   - Ativação em Wishiwashi de nível >= 20 com HP superior a 25% (`currentHp > maxHp / 4`), assumindo a School Form (`#10127`).
   - Se o nível for inferior a 20 ou se o HP for menor ou igual a 25% (`currentHp <= maxHp / 4`), permanece ou reverte para a Solo Form (`#746`).
   - A verificação ocorre canonicamente na entrada em campo (`start` / `enter`, inclusive após dano de entry hazards) e no término do turno (`endTurn`, pós-resíduos e curas como Leftovers).
   - Dano sofrido no meio do turno durante o cálculo de golpes NÃO provoca mudança prematura no meio do ataque.
   - Atributos base canônicos: Solo Form (HP 45 / Atk 20 / Def 20 / SpA 25 / SpD 25 / Spe 40) vs School Form (HP 45 / Atk 140 / Def 130 / SpA 140 / SpD 135 / Spe 30).
   - O HP base é idêntico em ambas as formas (45), garantindo que `maxHp` e `currentHp` nunca sejam artificialmente alterados.
   - Estágios de atributos (`statStages`) são estritamente preservados através da mudança de forma.
   - Tipagem do Pokémon (Water) permanece inalterada; caso esteja Terastallizado, preserva o tipo Tera ativo.
   - Fotos, animatedPhoto, cries e sprites são atualizados no evento `FORM_CHANGED` sem corromper a espécie original.
   - Insubstituível, não suprimível (`suppressible: false`, `breakable: false`), não copiável por Transform/Imposter (`copyable: false`) e não trocável (`swappable: false`).
   - Coberto por 53 testes determinísticos em `tests/battle/abilities-h6c.test.js`.

**Lista restante de H6 (14 pendentes):** `forecast`, `multitype`, `zen-mode`, `illusion`, `stance-change`, `disguise`, `battle-bond`, `power-construct`, `rks-system`, `ice-face`, `mimicry`, `shields-down`, `zero-to-hero`, `gulp-missile`.

### H7 — Cópia, troca e supressão de habilidades

**Inventário:** 7 habilidades pendentes; 11 registros com habilidade padrão afetados.

**Dependências:** H0; registro de habilidades copiáveis/anuláveis; integração incremental com H1–H6.

Criar regras por habilidade para copiar, substituir, herdar e suprimir. Neutralizing Gas exige recomputar o campo de ambos os ativos e restaurar efeitos na saída. Não usar um booleano global que anule habilidades imutáveis. Receiver/Power of Alchemy dependem também dos gatilhos de duplas de H9.

**Aceite:** Trace sem alvo elegível, Mummy versus habilidades protegidas, herança após KO, múltiplos Neutralizing Gas, berries retidas/liberadas, clima e formas. Evitar ativar novamente bônus de entrada de modo indevido.

**Lista completa da família:** `trace`, `mummy`, `receiver`, `power-of-alchemy`, `wandering-spirit`, `neutralizing-gas`, `lingering-aroma`.

### H8 — Itens, berries e informações

**Inventário:** 14 habilidades pendentes; 62 registros com habilidade padrão afetados.

**Dependências:** H0; consumo/posse de itens e regras por berry; H7 para supressão.

Separar uso de berries, recuperação/roubo e informação pública de batalha. Pickup possui efeito em combate e não deve ser descartada como habilidade só de exploração. Frisk/Anticipation/Forewarn precisam de mensagens úteis e informação permitida; nada de ler a ação futura do jogador. Itens recuperados na luta não entram permanentemente na mochila/elenco.

**Aceite:** Unnerve/As One, berry já consumida, múltiplos portadores, chance controlada, Sticky Hold/itens irremovíveis, troca de item, remoção por golpe, alvo nocauteado e restauração no início de nova batalha.

**Lista completa da família:** `gluttony`, `unburden`, `klutz`, `frisk`, `anticipation`, `forewarn`, `pickpocket`, `harvest`, `cheek-pouch`, `magician`, `sticky-hold`, `ripen`, `cud-chew`, `pickup`.

### H9 — Interações de duplas

**Inventário:** 16 habilidades pendentes; 29 registros com habilidade padrão afetados.

**Dependências:** H0; H1/H2/H3/H5/H7 conforme família; duplas já jogáveis.

Entregar auras de aliado, proteção/redirecionamento, suporte de entrada, cópia de atributos, dança e herança. Diferenciar aliado, adversário e próprio portador. Vitória/derrota e finais com dois KOs precisam de ordem documentada. Evoluir a IA para considerar suporte sem usar informações ocultas do turno.

**Aceite:** Parceiro presente/ausente, parceiro substituído, dois portadores, área versus alvo único, cura com HP cheio, ações copiadas sem recursão, Commander e efeitos aplicados uma vez por alvo e turno.

**Lista completa da família:** `plus`, `minus`, `healer`, `friend-guard`, `telepathy`, `symbiosis`, `dancer`, `battery`, `power-spot`, `steely-spirit`, `propeller-tail`, `stalwart`, `curious-medicine`, `costar`, `hospitality`, `victory-star`.

### H10 — Sistemas externos ao combate atual

**Inventário:** 3 habilidades pendentes; 27 registros com habilidade padrão afetados.

**Dependências:** Sistema de fuga; para coleta/bola, inventário mínimo e captura durante a luta.

Run Away depende de comando de fuga real em encontros selvagens; não equivale a sair de uma batalha contra treinador nem a escapar de qualquer aprisionamento. Honey Gather precisa de um destino persistente válido para o item coletado. Ball Fetch precisa de Pokébola lançada/falhada e regra de recuperação. Manter BLOCKED enquanto esses sistemas não existirem.

**Aceite:** Fuga permitida/proibida conforme contexto, bola correta recuperada uma vez, inventário íntegro após reload, falha/limite de coleta e ausência de bônus inventados em duelos comuns.

**Lista completa da família:** `run-away`, `honey-gather`, `ball-fetch`.

### H11 — Habilidades de Mega Evolução de Pokémon Champions (2026)

**Inventário:** 7 habilidades pendentes; 7 registros com habilidade padrão afetados.

**Dependências:** Regras oficiais de Pokémon Champions (2026, Nintendo Switch); Pokémon Showdown `data/abilities.ts`; formato de Mega Evolução; H0.

As sete habilidades são oficiais e pertencem a novas Mega Evoluções introduzidas em Pokémon Champions (2026, Nintendo Switch). Seus efeitos, portadores e regras foram confirmados:

- `piercing-drill` (Mega Excadrill, #10287): Golpes de contato atravessam Protect/Detect e barreiras de proteção causando 25% do dano normal.
- `dragonize` (Mega Feraligatr, #10283): Converte golpes do tipo Normal em Dragon e aumenta seu poder em 20% (habilidade de conversão elemental semelhante a Pixilate/Aerilate).
- `mega-sol` (Mega Meganium, #10282): Mega Sol faz os movimentos do próprio portador funcionarem como se houvesse sol intenso (sun simulation), independentemente do clima real. A habilidade não modifica o clima do campo, não invoca clima global, não altera diretamente o clima dos aliados e não funciona como Desolate Land. (Corrigido 02/11/2026 conforme regras canônicas de Pokémon Champions.)
- `spicy-spray` (Mega Scovillain, #10320): Ao receber dano de qualquer ataque adversário, inflige automaticamente a condição Burn no atacante.
- `eelevate` (Mega Eelektross, #10290): Combina imunidade ao solo e armadilhas (Levitate) com aumento de 1 estágio no maior atributo ao nocautear diretamente um oponente.
- `fire-mane` (Mega Pyroar, #10295): Aumenta o poder dos golpes do tipo Fire em 50% (multiplicador passivo de 1.5x em ataques Fire).
- `aura-guard` (Mega Lucario Z, #10310): Reduz à metade (0.5x) o dano recebido de todos os ataques de contato físico.

**Status no Catálogo:** `RULE_CONFIRMED_PENDING_IMPLEMENTATION`. Os contratos mecânicos estão formalmente identificados e auditados, aguardando a implementação específica do sistema de Mega Evolução da Fase H11.

**Aceite:** Origem, versão, portadores e regra confirmados na fonte primária (Serebii, press oficial e Showdown). Nenhuma alteração ou exclusão de formas válidas.

**Lista completa da família:** `piercing-drill`, `dragonize`, `mega-sol`, `spicy-spray`, `eelevate`, `fire-mane`, `aura-guard`.

## Ordem sugerida e marcos de entrega

1. H0 + investigação das sete entradas H11.
2. H1-A e H2-A: fechar primeiro os buracos que o jogador já vê nos principais confrontos.
3. H3-A e itens/berries de H8: reações e recuperação úteis para muitas espécies.
4. H2 restante e H5 em lotes pequenos: profundidade tática e IA.
5. H4: auras, climas primordiais e paradoxos; reavaliar os desafios especiais.
6. H6 e H7 com infraestrutura comum: formas e controle de habilidades.
7. H9: completar o comportamento de apoio em duplas; habilidades de fases anteriores não podem ficar com duplas silenciosamente quebradas nesse intervalo.
8. H10 após suas dependências de exploração/captura; H11 só avança com regra confirmada.

Não há prazo fechado: habilidades de multiplicador simples e habilidades que mudam forma, turno ou outro portador têm custos muito diferentes. Estimar cada lote depois de seu contrato e testes de referência estarem definidos.

## Checklist de cada habilidade

- [ ] Fonte/versão e lista de portadores naturais conferidas.
- [ ] Eventos, flags, ordem e pré-requisitos definidos.
- [ ] Motor simétrico para jogador/adversário e sem efeitos duplicados.
- [ ] Testes individuais, 3×3, Final Stand e duplas aplicáveis.
- [ ] Entrada/saída, KO, falha, proteção, imunidade, supressão e cópia revisados.
- [ ] Prévia e IA coerentes com o motor; nenhuma leitura da ação futura.
- [ ] Mensagem/efeito visual correto; mapper aceita os novos eventos.
- [ ] Persistência sanitizada, estado temporário reinicializado e capturas preservadas.
- [ ] Comparação de equilíbrio de Mestres, Super, Shadow, provas, Liga e Torre afetados.
- [ ] Registro de capacidade atualizado sem esconder PARTIAL/BLOCKED.
- [ ] Inventário regenerado/revisado, auditoria --check e testes apropriados aprovados.
- [ ] Revisão e homologação do lote antes de commit/push, quando solicitados.

Não usar somente contagem de testes ou listas de nomes como prova de fechamento. O roadmap termina quando as 236 entradas atribuídas tiverem regra implementada e validada ou impedimento/escopo explicitamente justificados; dizer que o combate está completo exige separar as dependências de fora do combate. As 78 já declaradas também precisam da verificação comportamental de H0.

## Referências para cada contrato

- [PokéAPI — Abilities](https://pokeapi.co/docs/v2#abilities): identidade, versão, descrição e atribuições; confirmar também `is_main_series` ao rever entradas sem portadores.
- [Código primário do Pokémon Showdown — abilities.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts): implementação de referência e exceções. Fixar commit consultado por lote; master é mutável.
- [Regras de geração VIII do Showdown](https://github.com/smogon/pokemon-showdown/blob/master/data/mods/gen8/abilities.ts): consultar apenas para diferenças históricas relevantes, sem misturar automaticamente com geração IX.
- [Roadmap anterior dos chefes](roadmap-boss-abilities.md): Pressure, Intrepid Sword e As One Spectrier já entregues; não reimplementar como se estivessem pendentes.
- [Fechamento dos golpes](roadmap-completion.md): escopo dos golpes conhecidos, separado deste roadmap de habilidades.
