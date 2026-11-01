# P5 — Dano especial, múltiplos acertos e histórico: conclusão

> Atualização em 01/11/2026: as dependências P6/P7/P8 descritas abaixo registram o estado no fechamento original desta fase. Agora estão resolvidas no escopo individual dos pilotos: ver docs/roadmap-p8.md e as auditorias atuais. Pendências de P1 e duplas continuam explícitas.


Atualização: 31/10/2026. A P5 está concluída no escopo do motor atual de batalhas individuais. A auditoria cobre 60 golpes-piloto disponíveis na campanha: 57 FULL e 3 PARTIAL exclusivamente por dependências explícitas de outras fases. Nenhum desses pilotos mantém pendência essencial de P5. Isso não significa suporte a todos os golpes da PokéAPI, batalhas duplas, habilidades ou itens.

## Mecânicas entregues

| Família | Entrega |
| --- | --- |
| Múltiplos acertos comuns | Bullet Seed, Icicle Spear, Rock Blast, Arm Thrust, Double Kick, Twineedle e Water Shuriken. Distribuição moderna de 2–5 acertos, PP único, variância por acerto, interrupção no nocaute e veneno por acerto de Twineedle. |
| Múltiplos acertos especiais | Triple Kick e Triple Axel com poder crescente e precisão por acerto; Population Bomb com até dez verificações; Surging Strikes com três críticos garantidos, ignorando estágios desfavoráveis de Attack e favoráveis de Defense, mas respeitando burn. Críticos aleatórios e taxas elevadas da P1 continuam separados. |
| Dano baseado em nível/constante | Seismic Toss, Night Shade, Sonic Boom e Dragon Rage, sem aplicar a fórmula comum ou multiplicadores indevidos. |
| Dano fracionário/equalização | Super Fang, Nature’s Madness e Ruination removem metade do HP atual, piso e mínimo 1; Endeavor iguala o HP do alvo ao do usuário quando elegível. |
| Poder por HP | Flail/Reversal usam faixas de HP; Eruption/Water Spout/Dragon Energy usam o HP no instante de execução, incluindo dano/cura anterior no turno. |
| Poder por peso/velocidade | Low Kick/Grass Knot, Heavy Slam/Heat Crash, Gyro Ball/Electro Ball. Pesos oficiais em kg, incluindo formas, e velocidade efetiva com estágios/paralisia. |
| Histórico e contra-ataques | Counter, Mirror Coat, Metal Burst e Comeuppance usam dano direto compatível recebido no mesmo turno. Múltiplos acertos alimentam o último acerto, não a soma; dano residual e autoagressão não viram dano refletido. |
| Bide | Dois turnos de armazenamento e liberação do dobro do dano direto acumulado. Um PP por sequência, prioridade da ação bloqueada, cancelamento por impedimento/troca e limpeza no nocaute. A continuação permanece utilizável com zero PP. Bide ignora imunidade elemental conforme sua regra própria. |
| Preparação | Beak Blast aquece antes das ações e queima quem faz contato, inclusive antes dos acertos seguintes de um golpe múltiplo. Shell Trap exige um golpe físico direto antes da execução. Bide, Beak Blast e Shell Trap são excluídos de Sleep Talk. |
| Dano condicional | Payback, Assurance, Sucker Punch, First Impression, Bolt Beak, Stomping Tantrum e Temper Flare usam ação, dano, janela de entrada e resultado anteriores. Impedimentos como sono, freeze, paralisia, confusão e flinch contam como falha para Tantrum/Temper Flare. Round usa seu poder de batalha individual; encadeamento com aliados depende de duplas, fora do motor atual. |
| Tipo/categoria e aliados | Hidden Power deriva o tipo dos IVs; Revelation Dance usa o primeiro tipo atual do usuário; Photon Geyser compara atributos efetivos; Last Respects considera os aliados desmaiados. O motor não oferece reviver em batalha. |
| Atributos | Superpower, Psycho Boost, Leaf Storm e Fleur Cannon aplicam suas quedas; Venom Drench exige veneno e falha se os três atributos já estiverem no limite inferior; Lumina Crash reduz Special Defense do alvo sobrevivente. |
| OHKO e dano aleatório | Guillotine, Horn Drill, Fissure e Sheer Cold aplicam elegibilidade por nível, imunidades e precisão específica, sem usar precisão/evasão comuns. Sheer Cold diferencia usuário Ice. Psywave recebe a rolagem externa de 50–150%, com arredondamento e piso mínimo. |

## Integração e contratos

- Regras compartilhadas em assets/js/battle/p5-mechanics.js, carregado antes de battle-constants.js no navegador e via CommonJS nos testes. Metadados e pesos são dados estáticos; código baixado não é executado.
- Motor e IA permanecem sem sorteio interno. Quantidade de acertos, precisão/dano por acerto e Psywave são preparados pela fonte externa, inclusive nos caminhos de jogador, adversário, troca e Sleep Talk.
- Precisão e PP mantêm os contratos existentes: impedimento por paralisia consome a tentativa; sono/freeze/flinch/autoagressão não gastam PP do golpe pretendido. Bide só gasta PP no início da sequência. Movimentos chamados não gastam o próprio PP.
- Histórico de dano e intenção de ação são separados. O histórico é reiniciado no turno e nas saídas; intenções são transitórias e não retêm referências aos comandos do chamador no estado retornado. Dados e comandos de entrada não são alterados.
- A IA planeja o próximo turno sem reaproveitar flags antigas. Contra-ataques são projeções condicionais; OHKO com precisão abaixo de 100% não é anunciado como nocaute garantido. A IA não conhece as rolagens futuras.
- Tipos dinâmicos aparecem nos controles e no comparador. Dano variável/fixo tem rótulo próprio; a interface não exibe Poder null. Há mensagens de preparação e indicação de críticos garantidos.
- Sem aura, dano especial respeita imunidades. A aura inimiga supera imunidades, mas não multiplica dano de nível, constante, fracionário ou refletido. O jogador não herda a aura do adversário. Bide tem sua exceção própria de imunidade.
- Hidden Power usa IVs inteiros de 0 a 31; padrão 31 em cada atributo, como o normalizador competitivo existente. Isso não introduz treino de IVs ou progressão de nível. Os atributos efetivos fornecidos continuam sendo os usados pelo motor.
- Power nulo é preservado quando canônico. Sentinelas oficiais, como power 1 de Ruination/Comeuppance, são metadados e não fórmulas comuns. Dados adulterados e contradições de ID/nome são rejeitados.

## Disponibilidade no jogo

Todos os 60 pilotos aparecem em pelo menos um pool da campanha. Alguns exemplos:

| Espécie | Opções |
| --- | --- |
| Ivysaur / Butterfree | Bide / Psywave e Hidden Power |
| Hitmontop / Weavile | Triple Kick / Triple Axel |
| Oricorio Baile | Revelation Dance |
| Toucannon / Turtonator | Beak Blast / Shell Trap |
| Dracozolt / Espathra | Bolt Beak / Lumina Crash |
| Maushold / Urshifu Rapid Strike | Population Bomb / Surging Strikes |
| Unown | Hidden Power, conjunto limitado de um golpe |
| Wobbuffet, Wynaut e Pyukumuku | Counter/Mirror Coat, conjuntos limitados de dois golpes |

O snapshot expandido foi atualizado incrementalmente para essas quatro últimas espécies, preservando os demais registros. Elas deixam de ser apenas coleção e passam a ser reconhecidas por ID nos elencos existentes; nenhum save foi regravado diretamente. Ditto, Smeargle, Cosmog e Cosmoem continuam como coleção.

A campanha tem 1.347 registros aptos a batalhas, dos 1.351 registros totais. O gerador de opções produz extras para 485 espécies e 80 definições curadas; pools continuam com até seis opções e sem duplicatas. Os quatro golpes fixos anteriores das espécies existentes e os 450 selecionáveis iniciais foram preservados.

Para acomodar golpes característicos no limite de seis, oito extras comuns foram substituídos: Mega Kick em Hitmontop/Weavile/Turtonator/Dracozolt, Swift em Oricorio/Maushold, Hyper Voice em Toucannon/Espathra. Preferências antigas que dependam de uma opção removida seguem a validação existente e podem retornar ao conjunto padrão; não houve migração forçada de saves. Mega Kick de Pikachu/Squirtle foi preservado.

O gerador offline de opções foi conferido por reprodução idêntica. O gerador completo do catálogo expandido foi atualizado para aceitar mecânicas suportadas de poder nulo, mas não foi reexecutado integralmente pela rede; a alteração do snapshot desta fase é restrita às quatro espécies citadas.

## Dependências que continuam pendentes

Não foram promovidos a FULL golpes que precisam de mecânicas ausentes. Sete rótulos antigos de P5 foram corrigidos para as dependências reais já descritas no roadmap geral:

| Golpe | Dependência ainda ausente |
| --- | --- |
| Anchor Shot | Aprisionamento: P6; continua PARTIAL. |
| Judgment, Techno Blast, Multi-Attack | Tipagem por itens: P7; continuam BLOCKED. |
| Chilly Reception | Clima e troca: P6/P7; continua BLOCKED. |
| Light That Burns the Sky | Mecânica de Z-Move: P8; continua BLOCKED. |
| Tera Blast | Terastalização: P8; continua BLOCKED. |

Dentro dos 60 pilotos, Heavy Slam/Heat Crash continuam PARTIAL por interações com Minimize/Dynamax (P6/P8); Photon Geyser continua PARTIAL por ignorar habilidades (P7). Suas partes de P5 estão implementadas e testadas.

O peso oficial de Eternatus Eternamax (#10190) está ausente/zero no snapshot da PokéAPI. Golpes que precisam de peso falham de forma controlada nesse alvo, em vez de inventar um valor. Batalhas duplas, habilidades, itens, recarga/carga genérica, proteção, outras formas e transformações continuam fora deste fechamento. Movimentos não cadastrados não são liberados automaticamente.

## Validação

- 284 testes novos no fechamento, além dos 65 do ciclo fracionário: metadados, limites matemáticos, histórico, prioridades, estados, falhas, múltiplos acertos, sessão real nos dois lados para todas as 46 definições expandidas, hidratação, apresentação, interface e espécies limitadas.
- Suíte completa: **1.795 testes aprovados, 38 suítes, zero falhas, cancelamentos ou testes ignorados; saída 0**.
- node scripts/audit-p5.js: 60 pilotos, 57 FULL, 3 PARTIAL com dependências externas, zero pendências P5, todos disponíveis na campanha.
- node scripts/audit-p4.js: 316 golpes conhecidos, 257 FULL, 59 PARTIAL com dependências explícitas, zero pendências P4.
- node scripts/audit-campaign-draft.js: 450 selecionáveis, 50 por geração, sem duplicatas/lendários/míticos, hidratação aprovada.
- Regeneração offline do catálogo de opções idêntica; git diff --check aprovado.
- Fechamento publicado em origin/main no commit 4f38809125e84b7f88a692af208850e7a844cfbb, com hash remoto confirmado. Próximo ciclo documentado em docs/roadmap-p6.md.

## Fontes

Metadados e pesos: [PokéAPI moves.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/moves.csv) e [pokemon.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon.csv), snapshot 31/10/2026. Regras e learnsets: [Pokémon Showdown moves](https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts), [learnsets](https://github.com/smogon/pokemon-showdown/blob/master/data/learnsets.ts), [battle-actions](https://github.com/smogon/pokemon-showdown/blob/master/sim/battle-actions.ts) e [pokemon](https://github.com/smogon/pokemon-showdown/blob/master/sim/pokemon.ts). Referência independente existente: tests/fixtures/pokeapi-move-reference.json.
