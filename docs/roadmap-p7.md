# P7 — Habilidades, itens, clima e terrenos

Atualização: 31/10/2026. Escopo explícito do motor de batalhas individuais: **66 habilidades, 66 itens e 36 golpes pilotos**. O núcleo deste catálogo está implementado; isso não declara suporte a todas as habilidades e itens oficiais, nem encerra P1/P2/P3/P8.

## Disponível no jogo

- Sol, chuva, tempestade de areia e neve: duração de cinco turnos, oito com a pedra correspondente; alterações de dano, precisão, atributos, efeitos residuais e habilidades de entrada. Cloud Nine/Air Lock suspendem efeitos sem apagar o contador.
- Terrenos Electric, Grassy, Misty e Psychic: duração, Terrain Extender, Pokémon no chão, bônus ofensivos, recuperação, imunidades e bloqueio de prioridade.
- Habilidades naturais obtidas do catálogo oficial: primeiro slot por padrão, opção de trocar por outra habilidade natural implementada na preparação da campanha. Inclui habilidades ocultas legais; nenhuma habilidade inventada para formas sem dados.
- Item opcional por Pokémon na preparação da campanha. Escolha livre de equipamento, sem inventário, moedas ou recompensas novas. Itens consumidos/removidos são restaurados na batalha seguinte. A preferência permanece no save, o consumo fica no estado da batalha.
- Habilidades fora dos 66 pilotos permanecem **inativas e identificadas como efeito pendente**. Os dados oficiais cobrem 1.342 identificadores; a ausência de dados não autoriza copiar habilidades de outra forma.
- Interfaces mostram habilidade, item, supressão, clima/terreno e duração. Golpes impedidos por Choice/Assault Vest ficam indisponíveis; a ausência de opção por esses itens usa Struggle.

## Famílias de habilidades

- Bônus ofensivos: Overgrow, Blaze, Torrent, Swarm, Huge/Pure Power, Guts, Adaptability, Technician, Flash Fire e Sand Force.
- Defesa/imunidade: Levitate, Thick Fat, Filter, Solid Rock, Multiscale, Sturdy, Water/Volt Absorb, Sap Sipper, Lightning Rod e Storm Drain.
- Entrada e condições: Intimidate, Clear Body, White Smoke, Hyper Cutter, Full Metal Body, Inner Focus, Own Tempo, Immunity, Limber, Insomnia, Vital Spirit, Water Veil e Magma Armor.
- Troca/interações: Regenerator, Natural Cure, Magic Guard, Unseen Fist, Mold Breaker, Teravolt, Turboblaze, Shadow Tag, Arena Trap e Magnet Pull.
- Clima/terreno: Drizzle, Drought, Sand Stream, Snow Warning, Swift Swim, Chlorophyll, Sand Rush, Slush Rush, Sand Veil, Snow Cloak, quatro Surges, Rain Dish, Solar Power, Cloud Nine e Air Lock.
- Contato: Static, Flame Body e Poison Point usam rolagem externa injetável, sem sorteio dentro do motor/IA.

## Itens e golpes

28 equipamentos básicos: recuperação, berries, Choice, Assault Vest, Life Orb, Focus Sash, Boots, Shed Shell, Grip Claw, Binding Band, Light Clay, Power Herb, pedras de clima, Terrain Extender e Ability Shield. Somam-se 17 Plates, 17 Memories e quatro Drives: **66 itens**. A lista auditável está em p7-mechanics.js.

Judgment, Techno Blast e Multi-Attack usam o item; Weather Ball e Terrain Pulse refletem o campo. Chilly Reception inicia neve e usa a seleção de substituto existente. Aurora Veil exige neve efetiva; Solar Beam respeita clima/Power Herb. Incluídos Thief, Knock Off, Bug Bite, Incinerate, Core Enforcer, Moongeist Beam, Photon Geyser, Secret Power, Grassy Glide, Ice Spinner e Psyblade.

Todos os 36 pilotos estão em opções legais da campanha, com limite de seis opções por espécie. Arceus troca o extra redundante Strength por Judgment; mantém Surf e os quatro golpes fixos. Slowking de Galar recebe Chilly Reception. Draft de 450 espécies e as quatro espécies apenas de coleção permanecem preservados.

33 pilotos FULL. Razor Wind e Sky Attack permanecem PARTIAL por críticos de P1; Order Up permanece PARTIAL porque Commander exige duplas, fora do motor atual. No fechamento da P7, Transform/Sketch, formas dinâmicas e Terastallization continuavam pendentes. Hidden Power já estava FULL na P5; a menção anterior como pendente foi corrigida. Estado posterior de toda a P8: docs/roadmap-p8.md.

## Validação e limites

- Auditoria reproduzível: node scripts/audit-p7.js. Não aceita pendências essenciais PHASE_P7 em golpes conhecidos.
- Novos testes: p7-mechanics.test.js e p7-battle-customization.test.js; incluem cada golpe em sessões reais dos dois lados, regras de campo, itens/habilidades, saves e UI da preparação.
- IA considera tipos dinâmicos, modificadores, imunidades, carga imediata e prioridade. A estimativa de múltiplos acertos com Multiscale/berries é conservadora e não anuncia nocaute garantido nesses casos.
- Não houve homologação visual manual desta expansão. Testes de interface cobrem HTML e controles com DOM simulado, além da carga dos scripts no contexto do navegador.
- P6 publicada como a58a9e9. Publicação da P7 autorizada pelo usuário; o commit correspondente consta no histórico Git. Sem deploy manual.

## Próximos ciclos

P8 concluída posteriormente no escopo individual explícito: cópia, formas/tipos dinâmicos, Dynamax padrão, Tera e golpe Z piloto. Consultar docs/roadmap-p8.md. Hidden Power com IVs já estava implementado na P5. Expandir habilidades/itens fora dos pilotos em ciclos próprios, com testes e classificação explícita. Batalhas duplas/Commander exigem mudança de formato e não estão liberadas.

## Fontes primárias

- [PokéAPI abilities.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/abilities.csv), [pokemon_abilities.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon_abilities.csv), [pokemon.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/pokemon.csv), [items.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/items.csv), [moves.csv](https://github.com/PokeAPI/pokeapi/blob/master/data/v2/csv/moves.csv): nomes, IDs, metadados e habilidades naturais.
- [Showdown abilities.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts), [items.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/items.ts), [conditions.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/conditions.ts), [moves.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/moves.ts), [learnsets.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/learnsets.ts): interações canônicas e disponibilidade. Fontes usadas como dados/referência, sem executar callbacks baixados.
