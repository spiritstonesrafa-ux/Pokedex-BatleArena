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
| H1-B | Defiant, Competitive, Contrary, Mirror Armor, Opportunist, Guard Dog, Anger Point, Rattled | Reações canônicas a reduções de atributo por oponentes, inversão de estágios, cópia de bônus, bloqueio de troca forçada/Intimidate e respostas a acertos críticos/tipos Bug/Ghost/Dark. |
| H1-C | Stamina, Water Compaction, Weak Armor, Steam Engine, Motor Drive, Electromorphosis, Berserk, Anger Shell | Reações canônicas a dano, tipos elementais, absorção de Electric, estado Charge e cruzamento do limiar de 50% de HP. |
| H1-D | Beast Boost, Cotton Down, Download, Moody, Speed Boost, Thermal Exchange, Wind Power, Wind Rider | Ultra Beasts, Gossifleur, Porygon, Moody/Speed Boost em fim de turno, Baxcalibur imune a Burn, e interação com golpes de vento e Tailwind. |
| H2-A | Marvel Scale, Hustle, Keen Eye, Steadfast (H1) | Milotic, Togekiss, Pelipper/Skarmory e Lucario aparecem na campanha e nas instalações; revisar defesa, precisão, ataques físicos/especiais e flinch. Entregar em commits separados por família. |
| H3-A | Rough Skin, Iron Barbs, Effect Spore, Synchronize, Shed Skin | Reações de contato, imunidades e cura; testar quem recebe cada efeito e se um KO impede ativações posteriores. |
| H4-A | Dark Aura, Fairy Aura, Aura Break, Prism Armor e Neuroforce (H2) | **Implementado (FULL)**. Efeitos canônicos para Yveltal (#717), Xerneas (#716), Zygarde (#718), Necrozma (#800) e Ultra Necrozma (#10157). |
| H5-A | Prankster, Infiltrator, Magic Bounce | Exigem flags de golpes, prioridade e reflexão por evento; alto impacto em estratégia, inclusive para a IA. |

A ordem é recomendada, não uma promessa de que todos os efeitos desses lotes compartilham a mesma dificuldade. Cada habilidade pode ser liberada individualmente após seus testes. As fases seguintes são famílias de trabalho, não um único commit por fase.

## Fases por família

### H1 — Bônus de entrada, nocaute e reações

**Inventário:** 0 habilidades pendentes (CONCLUÍDO DEFINITIVAMENTE: H1-A: 5, Steadfast em H2-A, Soul-Heart em H7-A, H1-B: 8, H1-C: 8, H1-D: 8, Supreme Overlord em H2-A/H1-E); 0 registros com habilidade padrão afetados.

**Dependências:** H0; autoria de KO, estágios e eventos de entrada existentes.

Dividir em entrada/KO, reações ao dano, reações a reduções e efeitos por equipe. Implementar As One Glastrier com Unnerve e aumento de Attack por KO direto; Supreme Overlord depende de histórico de aliados nocauteados, sem contar trocas como mortes. Motor Drive deve compartilhar a infraestrutura de imunidade/absorção de H3.

**Aceite:** Dano evitado, proteção e imunidade não geram gatilhos errados; limites de estágios; KO residual não atribuído ao último atacante; dois KOs e aliados corretos em duplas; reset de marcadores e contagem de baixas.

**Lista completa da família:** `justified`, `moxie`, `chilling-neigh`, `as-one-glastrier`, `dauntless-shield`, `defiant`, `competitive`, `steadfast`, `rattled`, `weak-armor`, `stamina`, `berserk`, `anger-point`, `anger-shell`, `water-compaction`, `steam-engine`, `cotton-down`, `electromorphosis`, `wind-power`, `wind-rider`, `guard-dog`, `thermal-exchange`, `opportunist`, `download`, `beast-boost`, `soul-heart`, `supreme-overlord`, `contrary`, `mirror-armor`, `moody`, `motor-drive`, `speed-boost`.

#### H1-B — Reações a Reduções, Inversão, Cópia e Respostas a Dano/Crítico (Defiant, Competitive, Contrary, Mirror Armor, Opportunist, Guard Dog, Anger Point, Rattled) (CONCLUÍDO)

Lote unificado de oito habilidades canônicas de reações a alterações de atributos, inversão de estágios, duplicação de bônus adversários, imunidade a troca forçada e respostas a acertos críticos/dano na Geração IX:

1. **`defiant`** (Gen V-IX):
   - Quando um oponente reduz qualquer atributo do portador, seu Attack aumenta em +2 estágios por redução.
   - Aplica-se a reduções causadas por movimentos ofensivos (efeitos secundários como Shadow Ball/Icy Wind), movimentos de status adversários (Growl, Fake Tears) e habilidades adversárias (Intimidate).
   - Não ativa quando a redução é causada pelo próprio Pokémon (Close Combat, Curse) ou por aliados em duplas.
   - Ativa mesmo quando o atributo reduzido já estava no piso (-6) se a redução tiver sido tentada por um oponente.
   - Coberto por 8 testes determinísticos em `tests/battle/abilities-h1b-defiant.test.js`.

2. **`competitive`** (Gen VI-IX):
   - Quando um oponente reduz qualquer atributo do portador, seu Special Attack aumenta em +2 estágios por redução.
   - Segue os mesmos contratos de origem adversária que Defiant.
   - Não ativa por auto-reduções ou reduções infligidas por aliados.
   - Coberto por 7 testes determinísticos em `tests/battle/abilities-h1b-competitive.test.js`.

3. **`contrary`** (Gen V-IX):
   - Inverte todas as alterações de estágio de atributos recebidas pelo portador: bônus tornam-se penalidades e penalidades tornam-se bônus.
   - Aplica-se a reduções e aumentos de movimentos próprios (Superpower, Overheat, Leaf Storm, Draco Meteor concedem +Attack/+Defense ou +Special Attack), movimentos adversários e habilidades como Intimidate (+1 Attack).
   - Não inverte trocas diretas de atributos ou reset de estágios (Haze, Clear Smog).
   - Coberto por 7 testes determinísticos em `tests/battle/abilities-h1b-contrary.test.js`.

4. **`mirror-armor`** (Gen VIII-IX):
   - Reflete exclusivamente reduções de atributos causadas por oponentes de volta para o atacante.
   - Não reflete reduções auto-infligidas (Close Combat, Curse) nem perigos de entrada de campo sem atacante direto (Sticky Web).
   - Se o adversário tiver Mirror Armor, Clear Body ou efeito protetor similar, a reflexão é bloqueada pelo alvo, sem loops infinitos.
   - Coberto por 8 testes determinísticos em `tests/battle/abilities-h1b-mirror-armor.test.js`.

5. **`opportunist`** (Gen IX):
   - Sempre que um oponente ganha um aumento positivo de estágio de atributo, o portador copia exatamente o mesmo bônus no mesmo atributo.
   - Aplica-se a bônus de movimentos (Swords Dance, Dragon Dance, Calm Mind) e habilidades de entrada/reação (Intrepid Sword, Moxie, Speed Boost).
   - Protegido contra replicação mútua infinita entre múltiplos portadores de Opportunist via flag `isOpportunistCopy`.
   - Ativa independentemente para cada atributo aumentado.
   - Coberto por 7 testes determinísticos em `tests/battle/abilities-h1b-opportunist.test.js`.

6. **`guard-dog`** (Gen IX):
   - Imunidade canônica a movimentos ou itens que forçam a troca do portador (Roar, Whirlwind, Dragon Tail, Circle Throw, Red Card).
   - Ao receber Intimidate de um adversário, inverte a penalidade de -1 para um bônus de +1 no Attack em vez de sofrer a redução.
   - Em batalhas individuais e de duplas, o portador permanece no campo quando alvejado por efeito de troca forçada.
   - Coberto por 6 testes determinísticos em `tests/battle/abilities-h1b-guard-dog.test.js`.

7. **`anger-point`** (Gen IV-IX):
   - Ao receber um acerto crítico de um ataque direto que cause dano real, eleva imediatamente o Attack ao estágio máximo (+6).
   - Não ativa se o golpe crítico atingir e for totalmente absorvido por um Substitute.
   - Não ativa se o portador desmaiar com o golpe.
   - Coberto por 6 testes determinísticos em `tests/battle/abilities-h1b-anger-point.test.js`.

8. **`rattled`** (Gen V-IX):
   - Ao ser atingido por movimentos ofensivos dos tipos Bug, Ghost ou Dark, aumenta a Speed em +1 estágio por acerto.
   - Ao ser alvo de Intimidate de um oponente, além da redução normal de Attack, ganha imediatamente +1 em Speed.
   - Não ativa em acertos que forem totalmente absorvidos por um Substitute.
   - Coberto por 8 testes determinísticos em `tests/battle/abilities-h1b-rattled.test.js`.

#### H1-C — Reações a Dano, Tipos, Carga e Limiares de HP (Stamina, Water Compaction, Weak Armor, Steam Engine, Motor Drive, Electromorphosis, Berserk, Anger Shell) (CONCLUÍDO)

Lote unificado de oito habilidades canônicas de reações a dano sofrido, especificidade elemental, imunidade com aceleração, estado volátil Charge e cruzamento de limiar de 50% de HP na Geração IX:

1. **`stamina`** (Gen VII-IX):
   - Aumenta a Defense do portador em +1 estágio sempre que sofre dano de um ataque direto (`actualDamageDealt > 0`).
   - Ativa por golpe em movimentos multi-hit (ex: 3 acertos = +3 de Defense).
   - Não ativa se o dano for absorvido por Substitute (`actualDamageDealt === 0`).
   - Não ativa por dano residual (veneno, queimadura, clima, recuo).
   - Não ativa se o portador for nocauteado pelo golpe.
   - Suprimido por Neutralizing Gas.
   - Coberto por 7 testes determinísticos em `tests/battle/abilities-h1c-stamina.test.js`.

2. **`water-compaction`** (Gen VII-IX):
   - Aumenta a Defense em +2 estágios ao ser atingido por um movimento do tipo Water que cause dano real.
   - Aplica-se a golpes Water físicos e especiais. Não concede imunidade a Water (o dano é aplicado normalmente).
   - Reage ao tipo efetivo do golpe no momento do impacto (incluindo conversões de tipo).
   - Ativa por acerto em multi-hit do tipo Water.
   - Não ativa se absorvido por Substitute ou se o portador for nocauteado.
   - Suprimido por Neutralizing Gas.
   - Coberto por 7 testes determinísticos em `tests/battle/abilities-h1c-water-compaction.test.js`.

3. **`weak-armor`** (Gen V-IX):
   - Ao receber dano direto de um ataque da categoria Física (`damageClass === 'physical'`), reduz a Defense em 1 estágio e aumenta a Speed em 2 estágios.
   - Não ativa por ataques Especiais ou movimentos de Status.
   - Ativa por acerto em movimentos multi-hit físicos.
   - Se a Defense já estiver no limite mínimo (-6), a Speed ainda aumenta em +2; se a Speed já estiver em +6, a Defense ainda reduz em -1.
   - Invertido por Contrary (+1 Defense, -2 Speed).
   - Suprimido por Neutralizing Gas.
   - Coberto por 7 testes determinísticos em `tests/battle/abilities-h1c-weak-armor.test.js`.

4. **`steam-engine`** (Gen VIII-IX):
   - Ao receber dano de um ataque dos tipos Fire ou Water (físico ou especial), aumenta a Speed em 6 estágios (+6), maximizando a velocidade.
   - Não requer contato físico. Não concede imunidade aos tipos Fire ou Water.
   - Não ativa por dano residual nem se o golpe for absorvido por Substitute.
   - Suprimido por Neutralizing Gas.
   - Coberto por 7 testes determinísticos em `tests/battle/abilities-h1c-steam-engine.test.js`.

5. **`motor-drive`** (Gen IV-IX):
   - Concede imunidade canônica a movimentos do tipo Electric (ofensivos e de status direcionados, como Thunder Wave).
   - Ao anular o movimento Electric, aumenta a Speed do portador em +1 estágio.
   - A imunidade é mantida mesmo se a Speed já estiver no estágio máximo (+6).
   - Quebrado por Mold Breaker, Teravolt e Turboblaze (a menos que o portador segure Ability Shield).
   - Suprimido por Neutralizing Gas (a menos que segure Ability Shield).
   - Em duplas, absorve movimentos Electric de oponentes e aliados.
   - Coberto por 8 testes determinísticos em `tests/battle/abilities-h1c-motor-drive.test.js`.

6. **`electromorphosis`** (Gen IX):
   - Ao receber dano direto de um ataque, concede ao portador o estado volátil `Charge`.
   - O estado `Charge` dobra a potência base (multiplicador 2.0x) do próximo ataque do tipo Electric desferido pelo portador.
   - O efeito é consumido após a execução do próximo ataque Electric.
   - Não acumula múltiplos bônus por ativações sucessivas sem consumo intermediário (mantém 2.0x).
   - Não concede bônus de Special Defense (distinção canônica em relação ao movimento Charge).
   - Perdido ao ser substituído (`leave`).
   - Suprimido por Neutralizing Gas.
   - Coberto por 7 testes determinísticos em `tests/battle/abilities-h1c-electromorphosis.test.js`.

7. **`berserk`** (Gen VII-IX):
   - Concede +1 estágio de Special Attack quando o HP do portador cruza o limiar de 50% (cai para $\le 50\%$ tendo estado $> 50\%$ antes do ataque).
   - Não ativa repetidamente enquanto o portador já estiver abaixo de 50%.
   - Se for curado para $> 50\%$ (por item como Sitrus Berry ou movimento) e sofrer novo golpe cruzando o limiar, pode ativar novamente.
   - Não ativa por dano residual (veneno, queimadura, clima, recuo).
   - Não ativa se o golpe nocautear o portador (`currentHp === 0`).
   - Suprimido por Neutralizing Gas.
   - Coberto por 7 testes determinísticos em `tests/battle/abilities-h1c-berserk.test.js`.

8. **`anger-shell`** (Gen IX):
   - Quando o HP do portador cruza o limiar de 50% após sofrer um ataque direto elegível, aplica:
     - Attack +1
     - Special Attack +1
     - Speed +1
     - Defense -1
     - Special Defense -1
   - As reduções de Defesa são tratadas como autoinfligidas pela habilidade (não são refletidas por Mirror Armor adversário).
   - Se um atributo atingir o teto (+6) ou piso (-6), os demais atributos continuam sendo modificados normalmente.
   - Invertido integralmente por Contrary (-1 Atk, -1 SpA, -1 Spe, +1 Def, +1 SpD).
   - Pode reativar se curado para $> 50\%$ e novamente reduzido a $\le 50\%$.
   - Não ativa por dano residual nem em caso de nocaute.
   - Suprimido por Neutralizing Gas.
   - Coberto por 7 testes determinísticos em `tests/battle/abilities-h1c-anger-shell.test.js`.

#### H1-D — Bônus de KO, Entrada, Fim de Turno, Clima e Vento (Beast Boost, Cotton Down, Download, Moody, Speed Boost, Thermal Exchange, Wind Power, Wind Rider) (CONCLUÍDO)

Lote unificado de oito habilidades canônicas de Ultra Beasts, reações a dano em área, comparação de defesas adversárias, alteração e aceleração ao fim de turno, imunidade e resposta térmica, e interações completas com movimentos de vento e Tailwind na Geração IX:

1. **`beast-boost`** (Gen VII-IX):
   - Aumenta em +1 estágio o maior atributo efetivo elegível do portador (Attack, Defense, Special Attack, Special Defense ou Speed) ao nocautear diretamente um Pokémon adversário com um ataque direto.
   - Avalia atributos efetivos calculados (base * multiplicadores de item/habilidade), ignorando estágios de atributos preexistentes.
   - Desempate canônico em caso de empate entre atributos: Attack > Defense > Special Attack > Special Defense > Speed.
   - Não ativa por dano residual (veneno, queimadura, clima) nem se o próprio atacante desmaiar simultaneamente (recuo).
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h1d-beast-boost.test.js`.

2. **`cotton-down`** (Gen VIII-IX):
   - Ao sofrer dano de um ataque direto, reduz a Velocidade de todos os outros Pokémon ativos no campo em 1 estágio (-1).
   - Em duplas, afeta os dois adversários e o aliado, poupando exclusivamente o próprio portador.
   - Não ativa em danos totalmente absorvidos por Substitute ou dano residual.
   - Ativa mesmo que o portador seja nocauteado pelo golpe (regra `isUnbreakable` / `onDamagingHit` canônica).
   - Invertido por Contrary (+1 Speed) e reage normalmente com Defiant/Competitive em adversários.
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h1d-cotton-down.test.js`.

3. **`download`** (Gen IV-IX):
   - Na entrada em campo, compara a soma das Defesas física e especial dos adversários ativos (valores efetivos considerando estágios e itens).
   - Se a soma da Defesa for maior ou igual à soma da Defesa Especial (`totalDef >= totalSpD`), ganha +1 Special Attack.
   - Se a soma da Defesa Especial for estritamente maior (`totalSpD > totalDef`), ganha +1 Attack.
   - Em duplas, soma os atributos de ambos os adversários elegíveis ativos.
   - Reativa em cada reentrada em campo.
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h1d-download.test.js`.

4. **`moody`** (Gen V-IX):
   - Ao final de cada turno elegível, eleva aleatoriamente um atributo em +2 estágios e reduz outro atributo em -1 estágio.
   - Regra canônica da Gen IX: exclui Accuracy e Evasion da seleção (opera exclusivamente sobre Atk, Def, SpA, SpD, Spe).
   - Não seleciona o mesmo atributo simultaneamente para aumento e redução no mesmo turno.
   - Não seleciona atributos que já atingiram seus respectivos limites (+6 para aumento, -6 para redução).
   - Utiliza gerador pseudoaleatório determinístico (PRNG) reproduzível por seed/ação.
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h1d-moody.test.js`.

5. **`speed-boost`** (Gen III-IX):
   - Aumenta a Velocidade em 1 estágio (+1) ao encerramento de cada turno em que o portador esteve ativamente no campo.
   - Regra canônica: não ativa no turno em que o Pokémon é enviado a campo por troca voluntária ou forçada.
   - Ativa no final do turno 1 se o Pokémon for o líder inicial da batalha.
   - Ativa no final de turnos subsequentes à entrada por troca ou nocaute prévio.
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h1d-speed-boost.test.js`.

6. **`thermal-exchange`** (Gen IX):
   - Imunidade total à condição de queimadura (Burn); cura queimaduras pré-existentes na entrada ou ao reativar a habilidade.
   - Ao sofrer dano de um ataque do tipo Fire (físico ou especial), eleva o Attack em +1 estágio.
   - O portador sofre o dano do ataque Fire normalmente (não concede imunidade a golpes Fire).
   - Quebrável por Mold Breaker (a menos que segure Ability Shield).
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h1d-thermal-exchange.test.js`.

7. **`wind-power`** (Gen IX):
   - Ao sofrer dano direto de um golpe com a flag canônica `wind` (ex: Hurricane, Blizzard, Heat Wave, Bleakwind Storm, Icy Wind) ou quando Tailwind é ativado no seu lado do campo, ganha o estado volátil `Charge`.
   - O estado `Charge` dobra a potência base (2.0x) do próximo ataque do tipo Electric desferido pelo portador.
   - O estado é consumido após desferir o ataque Electric e é limpo na substituição.
   - Não concede imunidade a golpes de vento (o dano é sofrido normalmente).
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h1d-wind-power.test.js`.

8. **`wind-rider`** (Gen IX):
   - Concede imunidade total a movimentos ofensivos e de status que possuam a flag canônica `wind` (anula o golpe e evita dano/efeitos).
   - Ao anular um golpe de vento, eleva o Attack em +1 estágio.
   - Quando Tailwind é ativado no seu lado do campo, ou se entrar em campo enquanto Tailwind já estiver ativo em seu lado, eleva o Attack em +1 estágio.
   - Quebrado por Mold Breaker (a menos que segure Ability Shield).
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h1d-wind-rider.test.js`.

#### H2-A / H1-E — Fechamento Definitivo H1 e Modificadores Ofensivos H2 (Supreme Overlord, Iron Fist, Strong Jaw, Tough Claws, Sharpness, Mega Launcher, Steelworker, Rocky Payload) (CONCLUÍDO)

Lote unificado de oito habilidades canônicas de cálculo de dano, modificadores de Base Power e atributos ofensivos na Geração IX, consolidando o encerramento total da macro-fase H1:

1. **`supreme-overlord`** (Gen IX — Fechamento H1):
   - Ao entrar em combate, o portador considera a contagem de aliados derrotados da própria equipe (excluindo adversários, o próprio portador e integrantes vivos).
   - O multiplicador de poder base é fixado na entrada: `[4096, 4506, 4915, 5325, 5734, 6144] / 4096` conforme o número de aliados nocauteados (teto canônico de 5).
   - Em duplas, nocautes de aliados ocorridos enquanto o portador já está ativo não aumentam o bônus até que ele saia e reentre no campo.
   - Suprimível por Neutralizing Gas e reativável na dissipação do gás ou reentrada.
   - Coberto por testes determinísticos em `tests/battle/abilities-h2a-supreme-overlord.test.js`.

2. **`iron-fist`** (Gen IV-IX):
   - Multiplica o poder de movimentos com a flag canônica `punch` por `4915 / 4096` (aprox. 1.2×).
   - Aplica-se a cada acerto de golpes multi-hit elegíveis.
   - Não aumenta golpes de contato sem a flag punch. Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h2a-iron-fist.test.js`.

3. **`strong-jaw`** (Gen VI-IX):
   - Multiplica o poder de movimentos com a flag canônica `bite` por `1.5×` (ou `6144 / 4096`).
   - Aplica-se a golpes físicos e especiais com a tag de mordida.
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h2a-strong-jaw.test.js`.

4. **`tough-claws`** (Gen VI-IX):
   - Multiplica o poder de movimentos que fazem contato físico (flag `contact`) por `5325 / 4096` (aprox. 1.3×).
   - Aplica-se a ataques físicos de contato e especiais de contato.
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h2a-tough-claws.test.js`.

5. **`sharpness`** (Gen IX):
   - Multiplica o poder de movimentos com a flag canônica cortante (`slicing`) por `1.5×`.
   - Aplica-se a cortes com e sem contato (ex: Air Slash, Razor Leaf, Sacred Sword, Aqua Cutter).
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h2a-sharpness.test.js`.

6. **`mega-launcher`** (Gen VI-IX):
   - Multiplica o poder de movimentos ofensivos com a flag de pulso/aura (`pulse`) por `1.5×`.
   - Não altera movimentos de status. (Nota: Heal Pulse documentado como dependência não implementada no PBA).
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h2a-mega-launcher.test.js`.

7. **`steelworker`** (Gen VII-IX):
   - Multiplica os atributos ofensivos (Attack e Special Attack) do portador por `1.5×` ao executar movimentos do tipo Steel.
   - Preserva o estágio canônico de modificação de atributo, cumulativo com STAB e Terastallization.
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h2a-steelworker.test.js`.

8. **`rocky-payload`** (Gen IX):
   - Multiplica os atributos ofensivos (Attack e Special Attack) do portador por `1.5×` ao executar movimentos do tipo Rock.
   - Preserva o estágio canônico de modificação de atributo, cumulativo com STAB e Terastallization.
   - Suprimido por Neutralizing Gas.
   - Coberto por testes determinísticos em `tests/battle/abilities-h2a-rocky-payload.test.js`.

### H2 — Dano, atributos, precisão e críticos

**Inventário:** 37 habilidades pendentes (44 antes do lote H2-A); 101 registros com habilidade padrão afetados.

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

**Inventário:** 8 habilidades pendentes (6 concluídas em H6-A, 3 em H6-B, 1 em H6-C, 1 em H6-D, 1 em H6-E, 4 em H6-F); 27 registros com habilidade padrão afetados.

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

#### H6-D — Shields Down e imunidades de forma (Minior) (CONCLUÍDO)

Lote canônico focado na mecânica de proteção contra status e alteração dinâmica de atributos e peso do Minior (Gen IX):

1. **`shields-down`** (Gen VII-IX, Regras Canônicas Gen IX):
   - **Limiar exato de HP (50%):** Com `currentHp > maxHp / 2`, Minior assume sua Meteor Form (#774, #10130-#10135). Com `currentHp <= maxHp / 2`, sua carapaça se rompe e ele assume a Core Form (#10136-#10142).
   - **Preservação rigorosa de cores (7 pares determinísticos):** Red (774 ↔ 10136), Orange (10130 ↔ 10137), Yellow (10131 ↔ 10138), Green (10132 ↔ 10139), Blue (10133 ↔ 10140), Indigo (10134 ↔ 10141), Violet (10135 ↔ 10142). A cor original do Pokémon é imutável.
   - **Momento da verificação:** Ocorre na entrada em campo (`start` / `enter`, pós-hazards) e no encerramento do turno (`endTurn`, pós-resíduos/Leftovers). Dano sofrido no meio do ataque NÃO dispara mudança prematura.
   - **Atributos canônicos:** Meteor Form (HP 60 / Atk 60 / Def 100 / SpA 60 / SpD 100 / Spe 60) vs Core Form (HP 60 / Atk 100 / Def 60 / SpA 100 / SpD 60 / Spe 120).
   - **Preservação de HP e estágios:** O HP base é 60 em ambas as formas, garantindo que `maxHp` e `currentHp` nunca sejam artificialmente alterados. `statStages` e IVs são estritamente preservados.
   - **Peso dinâmico:** Meteor Form possui 40,0 kg; Core Form possui 0,3 kg. Atualiza dinamicamente movimentos baseados em peso (Low Kick, Grass Knot, Heavy Slam, Heat Crash).
   - **Imunidades a status na Meteor Form:** Bloqueia aplicação de novas condições não voláteis (Burn, Poison, Toxic, Paralysis, Sleep, Freeze) e Yawn. Não bloqueia confusão nem reduções de atributos.
   - **Não cura status pré-existente:** Caso Minior receba status em Core Form e cure seu HP acima de 50%, retorna à Meteor Form mantendo a condição pré-existente.
   - **Proteções canônicas:** Insubstituível, não suprimível (`suppressible: false`), não ignorável por Mold Breaker (`breakable: false`), não trocável (`swappable: false`) e não copiável por Transform para mudar forma (`copyable: false`).
   - **Compatibilidade total:** Testado com Terastallization, Dynamax, Transform, Imposter, batalhas em Duplas e IA determinística pura.

#### H6-E — Battle Bond (Greninja) (CONCLUÍDO)

Lote canônico focado na mecânica de fortalecimento canônico de Greninja na Geração IX (Scarlet/Violet):

1. **`battle-bond`** (Gen VII-IX, Regras Canônicas Gen IX):
   - **Mecânica canônica Gen IX (SV):** Ao derrotar diretamente um adversário por dano de movimento (`directKO`), se ainda restarem Pokémon não derrotados na equipe adversária (`foesRemaining > 0`), Battle Bond ativa **exatamente uma vez por batalha** (`once per battle`), concedendo **+1 Ataque, +1 Ataque Especial e +1 Velocidade**.
   - **Sem transformação para Ash-Greninja:** Na Gen IX, Greninja **NÃO** altera forma, **NÃO** altera sprite, **NÃO** recalibra Base Stats para 640 BST e **NÃO** emite evento `FORM_CHANGED`.
   - **Ativação estritamente única:** Controlada pela flag `battleBondTriggered: true` no combatente ativo. A flag persiste entre trocas de Pokémon e não é resetada por trocas, desmaio/reanimação ou movimentos de remoção de estágios (ex: Clear Smog). É reiniciada para `false` apenas no início de uma nova batalha limpa.
   - **Exclusão de dano residual:** Nocautes decorrentes de condições de status (Poison, Burn), clima (Sandstorm, Hail), hazards (Stealth Rock, Spikes) ou recoil em que o atacante desmaia simultaneamente NÃO ativam Battle Bond.
   - **Sobrevivência obrigatória:** O usuário deve estar vivo no momento da resolução (`m.currentHp > 0`). Se desmaiar por recuo (Double-Edge, Struggle) ou dano de contato fatal (Rocky Helmet), Battle Bond não dispara. Se sobreviver ao nocaute, ativa antes do dano pós-ataque de Life Orb.
   - **Condição de oponentes restantes:** Se o golpe nocauteia o último Pokémon adversário da equipe ou em combate individual 1v1 sem reservas (`foesRemaining === 0`), Battle Bond não ativa.
   - **Isolamento de Transform / Imposter:** Dittos transformados em Greninja (#10116) possuem `transformOriginal` e não ativam Battle Bond. Greninja transformado em outro Pokémon também é inelegível.
   - **Elegibilidade estrita de espécie:** Aplicável exclusivamente à forma canônica portadora `#10116` (`greninja-battle-bond`). O registro legado `#10117` (`greninja-ash`), a forma base `#658` (Torrent/Protean) e espécies não-Greninja com Battle Bond injetado são inelegíveis e rejeitados canonicamente.
   - **Proteções canônicas:** Insubstituível, não suprimível (`suppressible: false`, imune a Core Enforcer e Neutralizing Gas), inquebrável por Mold Breaker (`breakable: false`), não copiável (`copyable: false`) e não trocável por Skill Swap (`swappable: false`).
   - **Compatibilidade total:** Coberto com Terastallization (mantém tipo Tera), Dynamax, Duplas (KOs em área ativam apenas uma vez), composição com itens de Choice (Choice Scarf, Specs, Band) e IA determinística pura.
   - Coberto por 48 testes determinísticos em `tests/battle/abilities-h6e.test.js`.

#### H6-F — Mudanças de Forma e Tipos Condicionais (Forecast, Zen Mode, Mimicry, Zero to Hero) (CONCLUÍDO)

Lote unificado de quatro habilidades canônicas de alteração de forma e tipagem condicional na Geração IX:

1. **`forecast`** (Gen III-IX):
   - Transforma Castform (#351) dinamicamente conforme o clima ativo no campo: Sun -> Sunny Form (#10013, Fire), Rain -> Rainy Form (#10014, Water), Snow/Hail -> Snowy Form (#10015, Ice).
   - Em clima neutro, Sandstorm ou sob anulação climática (Cloud Nine / Air Lock), Castform reverte à forma Normal (#351).
   - Reversão instantânea ao expirar o clima, ser suprimida (Gastro Acid / Neutralizing Gas) ou ao sair do campo.
   - Preserva tipagem Terastal ativa quando Terastallizado.
   - Coberto por 14 testes determinísticos em `tests/battle/abilities-h6f-forecast.test.js`.

2. **`zen-mode`** (Gen V-IX):
   - Ativa no final do turno (`endTurn`) para Darmanitan com HP <= 50%:
     - Unova (#555, Fire) -> Zen Mode (#10017, Fire/Psychic; Atk 30, Def 105, SpA 140, SpD 105, Spe 55).
     - Galar (#10177, Ice) -> Galarian Zen Mode (#10178, Ice/Fire; Atk 160, Def 55, SpA 30, SpD 55, Spe 135).
   - Ao ser curado para HP > 50%, reverte ao Standard Mode correspondente no fim do turno.
   - Ao trocar para reserva ou desmaiar, reverte à forma Standard.
   - Insuprimível (`suppressible: false`) e incopiável (`copyable: false`) na Geração IX.
   - Coberto por 12 testes determinísticos em `tests/battle/abilities-h6f-zen-mode.test.js`.

3. **`mimicry`** (Gen VIII-IX):
   - Altera dinamicamente a tipagem do portador (Galarian Stunfisk #10180) conforme o terreno ativo em campo:
     - Electric Terrain -> `['electric']`.
     - Grassy Terrain -> `['grass']`.
     - Misty Terrain -> `['fairy']`.
     - Psychic Terrain -> `['psychic']`.
   - Reverte para `['ground', 'steel']` quando o terreno expira, é destruído (Ice Spinner #861), limpo (Defog #432), ao sair de campo ou ao ter a habilidade suprimida.
   - Terastallização sobrepõe e bloqueia a tipagem de Mimicry.
   - Coberto por 14 testes determinísticos em `tests/battle/abilities-h6f-mimicry.test.js`.

4. **`zero-to-hero`** (Gen IX):
   - Palafin (#964) inicia em Zero Form (Atk 70, Def 72, SpA 53, SpD 62, Spe 100).
   - Ao sair do campo vivo (`m.currentHp > 0`), seja por troca voluntária, pivot moves (Flip Turn #812, U-turn, Baton Pass, Chilly Reception) ou troca forçada (Dragon Tail, Roar), transforma-se em Hero Form (#10256; Atk 160, Def 97, SpA 106, SpD 87, Spe 100).
   - Ao reentrar em campo em Hero Form, anuncia a ativação de `zero-to-hero`. A transformação permanece ativa em trocas subsequentes pelo restante da batalha.
   - Nocaute antes da troca NÃO ativa a transformação.
   - Insuprimível (`suppressible: false`) e incopiável (`copyable: false`).
   - Reverte para Zero Form no fim da batalha; novas batalhas iniciam limpas na Zero Form.
   - Coberto por 12 testes determinísticos em `tests/battle/abilities-h6f-zero-to-hero.test.js`.

#### H6-G — Formas e Mecânicas Especiais Finais (Concluído)

1. **`multitype`** (Gen IV-IX):
   - Altera dinamicamente o tipo de Arceus (#493) conforme a Plate segurada (17 tipos).
   - Insuprimível, incopiável e inalterável. A Plate segurada não pode ser removida ou roubada por Thief, Knock Off ou Trick.
   - Teracristalização sobrepõe o tipo para o Tera Type correspondente.
   - Coberto por testes determinísticos em `tests/battle/abilities-h6g-multitype.test.js`.

2. **`rks-system`** (Gen VII-IX):
   - Altera dinamicamente o tipo de Silvally (#773) conforme o Memory segurado (17 tipos).
   - Insuprimível, incopiável e inalterável. O Memory segurado não pode ser removido ou roubado.
   - Teracristalização sobrepõe o tipo para o Tera Type correspondente.
   - Coberto por testes determinísticos em `tests/battle/abilities-h6g-rks-system.test.js`.

3. **`stance-change`** (Gen VI-IX):
   - Alterna Aegislash entre Shield Forme (#681; Def 140, SpD 140) e Blade Forme (#10026; Atk 140, SpA 140).
   - Muda para Blade Forme antes de desferir qualquer golpe de dano e para Shield Forme ao executar King's Shield (#588).
   - Reverte para Shield Forme ao ser trocado ou ao desmaiar. Insuprimível, incopiável e inalterável.
   - Coberto por testes determinísticos em `tests/battle/abilities-h6g-stance-change.test.js`.

4. **`disguise`** (Gen VII-IX):
   - Bloqueia totalmente o primeiro golpe de dano sofrido por Mimikyu (#778) na batalha (dano = 0).
   - Ao romper, assume a Busted Form (#10143) e sofre 1/8 do HP máximo em dano de recuo (mecânica Gen IX).
   - Permanece quebrado pelo restante do combate. Pode ser ignorado por Mold Breaker e golpes correspondentes.
   - Coberto por testes determinísticos em `tests/battle/abilities-h6g-disguise.test.js`.

5. **`ice-face`** (Gen VIII-IX):
   - Bloqueia o primeiro golpe físico direto recebido por Eiscue (#875), anulando o dano e assumindo Noice Face (#10185).
   - Ganha Velocidade 130 e perde defesas enquanto em Noice Face.
   - Reconstrói o bloco de gelo ao entrar em campo durante neve/granizo ou ao início do clima correspondente.
   - Coberto por testes determinísticos em `tests/battle/abilities-h6g-ice-face.test.js`.

6. **`gulp-missile`** (Gen VIII-IX):
   - Após usar Surf (#57) ou Dive (#291), Cramorant (#845) apanha uma presa: Gulping Form (#10182) com HP > 50% ou Gorging Form (#10183) com HP <= 50%.
   - Ao sofrer dano direto de um ataque, cospe a presa contra o atacante causando 25% de dano proporcional ao HP máximo do atacante, reduzindo sua Defesa em 1 estágio (Gulping) ou aplicando paralisia (Gorging), e reverte à forma padrão.
   - Coberto por testes determinísticos em `tests/battle/abilities-h6g-gulp-missile.test.js`.

7. **`power-construct`** (Gen VII-IX):
   - No final do turno (`endTurn`), se Zygarde (#718 / #10118) estiver com HP <= 50%, transforma-se na Complete Forme (#10120).
   - Aumenta o HP máximo para base 216 e adiciona a diferença ao HP atual. A transformação é permanente na batalha e não reverte na reserva.
   - Coberto por testes determinísticos em `tests/battle/abilities-h6g-power-construct.test.js`.

8. **`illusion`** (Gen V-IX):
   - Assume a identidade visual (nome, sprite, arte e tipo aparente) do último integrante consciente da equipe.
   - Preserva integralmente atributos reais, dano, STAB e tipagem autêntica para cálculos.
   - Rompe-se ao receber dano de ataque direto ou ao Teracristalizar.
   - Coberto por testes determinísticos em `tests/battle/abilities-h6g-illusion.test.js`.

**Lista restante de H6 (0 pendentes):** Concluído integralmente.

### H7 — Cópia, troca e supressão de habilidades

**Inventário:** 0 habilidades pendentes (concluído integralmente no lote H7-A); 11 registros com habilidade padrão afetados.

**Dependências:** H0; registro de habilidades copiáveis/anuláveis; integração incremental com H1–H6.

#### H7-A — Cópia, Troca, Supressão e Herança de Habilidades (Trace, Mummy, Lingering Aroma, Wandering Spirit, Receiver, Power of Alchemy, Neutralizing Gas, Soul-Heart) (CONCLUÍDO)

Lote unificado de oito habilidades canônicas de cópia, troca, contágio, supressão e herança na Geração IX (incluindo Soul-Heart da fase H1):

1. **`trace`** (Gen III-IX):
   - Ao entrar em campo (`start` / `enter`), copia a habilidade de um oponente ativo no campo.
   - Respeita rigorosamente a lista canônica de habilidades incopiáveis (`untraceableAbilities`: As One, Battle Bond, Comatose, Commander, Disguise, Gulp Missile, Ice Face, Illusion, Multitype, Neutralizing Gas, Power Construct, Protosynthesis, Quark Drive, RKS System, Receiver, Power of Alchemy, Schooling, Shields Down, Stance Change, Tera Shift, Tera Shell, Teraform Zero, Trace, Wonder Guard, Zero to Hero, Zen Mode, etc.).
   - Dispara imediatamente habilidades de entrada copiadas (Intimidate, Drizzle, Drought, Sand Stream, Snow Warning, Electric/Grassy/Misty/Psychic Surge, Intrepid Sword, Dauntless Shield).
   - Reverte para `trace` ao sair de campo ou ao final da batalha.
   - Coberto por 10 testes determinísticos em `tests/battle/abilities-h7a-trace.test.js`.

2. **`mummy`** (Gen V-IX):
   - Ao receber dano de golpe com contato físico (`contact`), altera a habilidade do atacante para `mummy`.
   - Respeita a lista canônica de habilidades inalteráveis (`unoverwritableAbilities`).
   - Bloqueado por Ability Shield do atacante.
   - Não ativa se o defensor já estiver nocauteado antes da resolução de contato.
   - Reverte no fim da batalha.
   - Coberto por 9 testes determinísticos em `tests/battle/abilities-h7a-mummy.test.js`.

3. **`lingering-aroma`** (Gen IX):
   - Ao receber dano de golpe de contato direto, substitui a habilidade do atacante por `lingering-aroma`.
   - Respeita as mesmas proteções canônicas de Mummy e interação com Ability Shield.
   - Coberto por 9 testes determinísticos em `tests/battle/abilities-h7a-lingering-aroma.test.js`.

4. **`wandering-spirit`** (Gen VIII-IX):
   - Ao receber dano de golpe de contato, troca mutuamente as habilidades entre o atacante e o defensor.
   - Respeita a lista de habilidades que não podem ser trocadas (`unswappableAbilities`).
   - Bloqueado se qualquer uma das partes segurar Ability Shield.
   - Reverte na saída ou fim da batalha.
   - Coberto por 9 testes determinísticos em `tests/battle/abilities-h7a-wandering-spirit.test.js`.

5. **`receiver`** (Gen VII-IX):
   - Em batalhas de duplas, ao desmaiar um aliado consciente, herda a habilidade do aliado nocauteado.
   - Respeita a lista canônica de habilidades não herdáveis (`noReceiverAbilities`).
   - Dispara efeitos de entrada se a habilidade herdada for de entrada.
   - Coberto por 8 testes determinísticos em `tests/battle/abilities-h7a-receiver.test.js`.

6. **`power-of-alchemy`** (Gen VII-IX):
   - Mecânica canônica idêntica a Receiver (Alolan Muk #10113).
   - Herda a habilidade do parceiro nocauteado em duplas, respeitando exceções canônicas.
   - Coberto por 8 testes determinísticos em `tests/battle/abilities-h7a-power-of-alchemy.test.js`.

7. **`neutralizing-gas`** (Gen VIII-IX):
   - Ao entrar em campo ou iniciar combate com Weezing (#110) ou Galarian Weezing (#10167), neutraliza todas as habilidades dos demais Pokémon em campo (`neutralizingGasSuppressed`).
   - Respeita estritamente a lista de habilidades imunes ao gás (`unsuppressibleGasAbilities`: As One, Battle Bond, Comatose, Commander, Disguise, Gulp Missile, Ice Face, Multitype, Power Construct, RKS System, Schooling, Shields Down, Stance Change, Tera Shift, Tera Shell, Teraform Zero, Zen Mode, Zero to Hero).
   - Ao sair de campo ou desmaiar (inclusive último Weezing presente em campo se houver dois), o gás se dissipa (`NEUTRALIZING_GAS_ENDED`), recalculando o campo, reativando habilidades passivas/estáticas e verificando Trace para ativos elegíveis.
   - Coberto por 11 testes determinísticos em `tests/battle/abilities-h7a-neutralizing-gas.test.js`.

8. **`soul-heart`** (Gen VII-IX, Fase H1):
   - Ao desmaiar qualquer Pokémon em campo (aliado ou adversário, por qualquer causa direta ou indireta), aumenta o Special Attack de Magearna (#801) em 1 estágio (+1 SpA).
   - Não ativa se Magearna estiver com Special Attack em +6 ou se Magearna também tiver desmaiado.
   - Coberto por 9 testes determinísticos em `tests/battle/abilities-h7a-soul-heart.test.js`.

**Lista restante de H7 (0 pendentes):** Concluído integralmente.

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
