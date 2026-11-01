# P1 — Críticos: bloco concluído

Atualização: **01/11/2026**, após a P8 publicada em `dd90fd0`. Bloco de críticos da P1 concluído no catálogo atual de batalhas individuais. Não declara suporte a todos os golpes, itens e habilidades da série.

## Regras entregues

- Ataques comuns elegíveis: chance de **1/24**; os 13 pilotos de chance elevada: **1/8**. Surging Strikes mantém crítico garantido em cada acerto.
- Multiplicador **1,5×**. O crítico ignora estágios negativos do atributo ofensivo utilizado e estágios positivos do atributo defensivo do alvo. Preserva os estágios favoráveis ao atacante, queimadura e modificadores de habilidade/item/clima já suportados pelo motor.
- Body Press usa Defense como atributo ofensivo; Psyshock/Psystrike/Secret Sword usam a defesa apropriada. Categoria dinâmica da P8 continua respeitada.
- Reflect, Light Screen e Aurora Veil são ignorados pelo acerto crítico. Protect/Detect/Max Guard, semi-invulnerabilidade, imunidades, Tera Shell, Multiscale, Sturdy e Focus Sash continuam sendo respeitados.
- Dano fixo, proporcional, por nível, OHKO e contra-ataques de dano fixo não recebem crítico. Status, erro, bloqueio ou imunidade não anunciam crítico.
- Ataques múltiplos possuem uma rolagem independente por acerto. Max e Z usam chance comum, sem herdar chance elevada do golpe-base. Carga só resolve crítico no ataque efetivo; Power Herb permite o acerto imediato.

## Pilotos promovidos a FULL

| ID | Golpe | ID | Golpe |
| --- | --- | --- | --- |
| 2 | Karate Chop | 13 | Razor Wind |
| 143 | Sky Attack | 152 | Crabhammer |
| 163 | Slash | 238 | Cross Chop |
| 299 | Blaze Kick | 314 | Air Cutter |
| 400 | Night Slash | 421 | Shadow Claw |
| 444 | Stone Edge | 460 | Spacial Rend |
| 529 | Drill Run | | |

Todos estão disponíveis em opções legais da campanha. Foram adicionados Cross Chop ao pool de Psyduck (#54) e Karate Chop ao de Mankey (#56), por learnsets canônicos, sem remover opções anteriores. Mantidos 542 pools com extras e o limite de seis opções; equipes, saves e draft preservados. A promoção preserva os metadados e demais mecânicas, removendo apenas a dependência de crítico resolvida. As definições de base das fases anteriores continuam imutáveis.

## Integração

- `BattleRandomSource.rollCritical()` fornece inteiros de 1 a 24 com sequência independente e validação estrita. O motor não chama RNG; comandos antigos sem rolagem usam 24 como padrão determinístico sem crítico aleatório.
- A sessão prepara as rolagens de ambos os lados, inclusive troca do jogador, continuação de carga, ataques múltiplos e ataques chamados por Sleep Talk. As rolagens são externas mesmo quando o ataque é depois interrompido.
- Eventos de dano informam `critical` e `criticalMultiplier`. A apresentação exibe **“Acerto crítico!”** apenas após um acerto que causa dano.
- O avaliador retorna `criticalChance` e `criticalMaxDamage`, inclui críticos no máximo possível e na média ponderada e mantém o mínimo comum para o nocaute garantido. A IA usa essa avaliação sem sortear nem alterar o estado. Estimativas de ataques múltiplos envolvendo berries/Multiscale continuam conservadoras, conforme a limitação já documentada na P7; não anunciam nocaute garantido nesses casos.

## Validação e estado atual

- **52 testes novos** em `tests/battle/p1-critical.test.js`: todos os pilotos, fronteiras de chance, atributos, dano, barreiras, queimadura, PP/carga, rolagens inválidas, ataques múltiplos, P8, IA, ambos os lados da sessão, troca, Sleep Talk e apresentação.
- Suíte completa: **2.574 aprovados / 38 suítes**, zero falhas, cancelados ou ignorados.
- `node scripts/audit-p1.js` aprovado; auditorias P4/P5/P6/P7/P8 e draft preservadas.
- Catálogo: **384 golpes conhecidos, 377 FULL e 7 PARTIAL**. P6 agora tem 70/70 FULL; P7 tem 35 FULL e Order Up PARTIAL por duplas. Nenhuma dependência `PHASE_P1` permanece no catálogo conhecido.
- Interface validada por testes automatizados; não houve homologação visual manual. Alterações deste bloco permanecem locais, **sem commit/push/deploy**.

## Pendências seguintes

| Área | Golpes e comportamento restante |
| --- | --- |
| P2 | Axe Kick: dano ao errar; Matcha Gotcha: drenagem de HP. |
| P3 | Sacred Sword/Darkest Lariat: ignorar estágios defensivos; Spectral Thief: roubar aumentos do alvo. |
| Duplas | Pollen Puff: cura de aliado; Order Up: interação com Commander. |

Focus Energy, itens como Scope Lens e habilidades como Super Luck/Sniper/Battle Armor/Shell Armor não foram adicionados por este ciclo. Habilidades fora dos pilotos P7/P8 continuam inativas e rotuladas como pendentes; nenhuma regra dessas foi ativada implicitamente. As expansões futuras da P8, incluindo outros Z/Gigantamax e transformações dinâmicas adicionais, continuam descritas em `docs/roadmap-p8.md`.

## Referências primárias

- [Showdown battle-actions.ts](https://github.com/smogon/pokemon-showdown/blob/master/sim/battle-actions.ts): chances modernas, multiplicador e atributos ignorados no crítico.
- [Showdown moves.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts): `critRatio` dos pilotos e crítico garantido de Surging Strikes. Fontes consultadas como referência; nenhum callback externo foi executado.
