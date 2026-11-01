# P8 — Cópia, formas e mecânicas especiais

Atualização: **01/11/2026. P8 concluída no escopo explícito de batalhas individuais dos pilotos cadastrados.** Auditoria: `node scripts/audit-p8.js`. Nenhuma dependência essencial `PHASE_P8` permanece no catálogo conhecido. Isso não significa suporte a todas as transformações, habilidades ou golpes existentes na série.

## Entregas

| Bloco | Implementação |
| --- | --- |
| Transform (#144) | Copia tipos, atributos sem HP, estágios, habilidade elegível, peso, aparência e golpes. Preserva identidade, HP, nível, IVs, item e condições. PP copiados independentes: min(5, PP canônico). Restaura na troca, nocaute e fim, sem devolver PP ou item consumido. Imposter executa a cópia na entrada sem gastar PP. |
| Sketch (#166) | Substitui o próprio slot pelo último golpe copiável registrado no alvo, com PP canônicos. Rejeita nosketch, duplicatas e golpes não suportados. Sleep Talk não chama Sketch. |
| Persistência de Sketch | Smeargle possui **um slot persistente** neste ciclo. Salva na conclusão normal da campanha, em vitória ou derrota, uma vez por recibo. Abandono, Quick, inimigos e convidados não salvam. Editor permite manter a cópia ou voltar a Sketch e aprender outra. |
| Formas/tipos | Hunger Switch alterna Morpeko e o tipo de Aura Wheel; supressão e Tera impedem a alternância. Raging Bull usa os tipos de Tauros Kanto/Paldea e remove barreiras. Double Shock exige Electric, remove esse tipo após acerto e restaura na saída; um Pokémon sem tipos recebe dano neutro. Tera Electric não perde seu tipo. |
| Dynamax padrão | Ativação antes da ordem das ações, duração de três turnos, HP proporcional (nível Dynamax 0–10, padrão 10), retorno ao trocar/desmaiar/encerrar e restauração correta do HP. Shedinja mantém 1 HP. Respeita restrições de espécies/formas e cristal Z. |
| Golpes Max | Os 18 ataques Max e Max Guard são variantes temporárias; gastam PP do golpe original. Tabela de poder canônica, sem recarga/carga/recuo/múltiplos acertos herdados. Efeitos de clima, terreno e estágios. Max Hailstorm inicia granizo, distinto de neve. Max Guard tem prioridade +4 e redução por uso consecutivo. |
| Interações Dynamax | Peso/OHKO, hesitação e troca forçada não afetam o alvo Dynamax. Heavy Slam/Heat Crash falham nesse alvo; Dynamax Cannon/Behemoth Blade/Behemoth Bash causam dano dobrado. Itens Choice ficam suspensos durante Dynamax; Assault Vest continua bloqueando status. Dano/cura percentual usam HP sem aumento. |
| Terastallization | 18 tipos comuns mais Stellar. Tipo defensivo, STAB original/adicional, Adaptability, piso de poder com exceções e retorno ao fim. Tera permanece após troca. Stellar mantém tipos defensivos e concede bônus por tipo, consumido apenas pelo ataque elegível que acerta. |
| Golpes Tera | Tera Blast muda tipo e categoria; em Stellar tem poder 100 e reduz Attack/Sp. Atk. Tera Starstorm usa Stellar na forma correspondente de Terapagos e categoria dinâmica quando terastallizado. |
| Terapagos | Tera Shift → Terastal com atributos/HP corretos. Tera Shell em HP cheio torna o primeiro acerto resistido, inclusive em ataques múltiplos, respeitando supressão, Mold Breaker e Ability Shield. Tera → Stellar, Teraform Zero limpa clima/terreno e os bônus Stellar não se esgotam. Trocas preservam o estado Tera; restauração nunca revive um nocauteado. |
| Ogerpon | Os quatro tipos Tera são fixados conforme a forma. Embody Aspect aumenta Speed/Sp. Def/Attack/Defense conforme a máscara na ativação e reentrada. |
| Golpe Z piloto | Necrozma Ultra (#10157), Ultranecrozium Z (#969, nome PokéAPI `ultranecrozium-z--held`) e Photon Geyser (#722) habilitam Light That Burns the Sky (#723). Poder 200, categoria dinâmica, ignora habilidades conforme as regras suportadas e consome PP de Photon Geyser. Não é golpe normal equipável nem copiável por Sketch; cristal não é consumido/removido. |
| Proteção | Ataques Max e Z causam um quarto do dano através de Protect/Detect; Max Guard bloqueia integralmente. |
| IA/interface/save | Prévia pura de dano/ativação e uso inimigo da preparação configurada. Controles na batalha, nomes/poderes Max com PP originais, mensagens e estado especial visível. Editor de habilidade/item inclui tipo Tera e preferência especial, com validação e persistência. Quick ignora preferências da campanha. Flags temporárias não são herdadas de outra batalha. |

**Formato do jogo:** cada equipe dispõe de **uma mecânica especial por batalha: Dynamax OU Tera OU o golpe Z piloto**. É uma regra explícita deste formato que reúne gerações. Escolha no controle de mecânica da batalha ou use o botão Z quando elegível. A preparação salva indica a opção preferida; o jogador ainda confirma ao escolher o golpe.

## Catálogo e campanha

- **13 pilotos FULL:** 144, 166, 484, 535, 723, 744, 781, 782, 783, 851, 873, 892, 906.
- Seis habilidades adicionais: Imposter, Hunger Switch, Tera Shift, Tera Shell, Teraform Zero e Embody Aspect. Habilidades fora dos catálogos P7/P8 continuam explicitamente inativas.
- Ditto e Smeargle liberados com seus golpes característicos, sem ataques inventados: **1.349 registros aptos; apenas Cosmog e Cosmoem como coleção**. Saves anteriores preservados.
- **542 espécies com extras**, até seis opções por espécie. Persian recebe Tera Blast; Morpeko Hangry recebe Aura Wheel; Zacian/Zamazenta Crowned recebem os golpes Behemoth. Necrozma Ultra já possui Photon Geyser; Terapagos e suas formas já possuem Tera Starstorm. Golpes Max e Z existem por ativação, não como extras normais.
- Draft preservado: **450 espécies, 50 por geração**. O gerador offline de opções reproduz o catálogo sem alterações adicionais.
- Hidden Power (#237) já estava FULL na P5; não é contado como nova entrega. Transform mantém os IVs do usuário.

## Limites explícitos

Não foram implementados outros golpes Z, assinaturas Gigantamax, ativação dinâmica de Mega/Primal/Ultra Burst, quatro slots persistentes de Sketch ou duplas/Commander. Formas estáticas já existentes continuam utilizáveis como antes; isso não equivale a implementar suas transformações durante o combate. Esses itens são expansões futuras fora do conjunto de pilotos encerrado aqui.

P1/P2/P3 ainda possuem dependências próprias em outros golpes; não foram apagadas para fechar a P8. Order Up continua PARTIAL por Commander/duplas. O peso oficial ausente de Eternatus Eternamax continua uma limitação explícita para golpes de peso fora da restrição Dynamax.

## Validação

- Suíte completa: **2.522 testes aprovados / 38 suítes**, zero falhas, cancelados ou ignorados.
- Regressões P8 em `tests/battle/p8-copy.test.js`, `tests/battle/p8-special.test.js`, `tests/campaign/p8-sketch.test.js` e `tests/campaign/p8-special-integration.test.js`: motor, IA, ambos os lados da sessão, troca/nocaute, PP, 18 Max/19 Tera, formas reais, proteção, persistência, equipamento e HTML dos controles.
- Auditorias P4/P5/P6/P7/P8 e draft aprovadas. P5 agora tem 60/60 pilotos FULL; P6 tem 68 FULL e dois PARTIAL por P1. Catálogo conhecido: 384 golpes, 364 FULL, 20 PARTIAL com dependências explícitas.
- Interface validada automaticamente com DOM simulado e carga de scripts; sem homologação visual manual. Nenhum callback baixado foi executado.
- Alterações locais sobre a P7 publicada (`8b37729`); **sem novo commit, push ou deploy** neste ciclo.

## Referências primárias

- [PokéAPI moves.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/moves.csv), [items.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/items.csv), [abilities.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/abilities.csv): identidades e metadados oficiais cadastrados.
- [Showdown moves.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts), [conditions.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/conditions.ts), [abilities.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts): regras de cópia, Dynamax, Tera, formas e golpe Z.
- [Showdown pokemon.ts](https://github.com/smogon/pokemon-showdown/blob/master/sim/pokemon.ts), [battle-actions.ts](https://github.com/smogon/pokemon-showdown/blob/master/sim/battle-actions.ts), [dex-moves.ts](https://github.com/smogon/pokemon-showdown/blob/master/sim/dex-moves.ts), [learnsets.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/learnsets.ts): STAB, transformações, PP copiados, tabela Max e learnsets. Fontes usadas como referência/dados, sem executar seu código.
