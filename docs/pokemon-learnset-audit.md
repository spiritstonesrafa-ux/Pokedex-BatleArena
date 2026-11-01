# Auditoria de aprendizado dos golpes — 01/11/2026

Foram conferidos os **1.351 registros de Pokémon/formas**, incluindo os **1.349 aptos a batalhar**, contra as tabelas versionadas da PokéAPI. O resultado final apresenta **zero atribuições incompatíveis** nas fontes auditadas.

## Escopo e resultado

A auditoria verifica os catálogos expandido, draft, conjuntos fixos, opções extras, especiais selvagens, fallback por espécie, opções realmente oferecidas na campanha e hidratação offline real. Foram verificadas **30.713 atribuições**, contando repetições entre essas fontes; esse número não representa 30.713 combinações exclusivas.

| Fonte | Registros conferidos |
| --- | ---: |
| Catálogo expandido | 1.351 |
| Draft inicial | 450 |
| Conjuntos fixos | 1.349 |
| Espécies com opções extras | 543 |
| Especiais selvagens | 25 |
| Fallback por espécie | 1.349 |
| Opções da campanha | 1.349 |
| Pokémon hidratados offline | 1.349 |

## Problemas corrigidos

- **Zamazenta (#889):** removido Earthquake dos conjuntos fixo e legado de contingência; substituído por **Stone Edge**, cujo aprendizado está registrado para a espécie.
- **Vine Whip:** corrigido o ID antigo 71 para o ID oficial **22** nos registros de contingência de Bulbasaur/Ivysaur e nas referências de teste. Removida a equivalência antiga com **Absorb (#71)**, que fazia a consulta de capacidade identificar o golpe errado. Vine Whip permanece dano físico sem drenagem.
- **Falhas de rede:** a montagem de contingência passou a usar apenas golpes suportados e verificados para aquela espécie/forma. Não concede Ember, Water Gun ou Tackle simplesmente pelo tipo. Uma espécie desconhecida fica sem conjunto comprovado e é impedida de batalhar pelo preflight existente.
- **Metadados incompletos:** IDs ausentes são resolvidos pelo nome oficial exato. Conflitos entre ID e nome são descartados, sem atribuir o ID de outro golpe por tipo.
- **Preferências da campanha:** as opções oferecidas são filtradas pela referência local de aprendizado. A persistência legítima de Sketch continua preservada.

## Critério de legalidade

A política é de aprendizado em **qualquer versão/geração registrada**, incluindo métodos como nível, TM, tutor e breeding. Não exige que todos os quatro golpes coexistam em uma única edição competitiva, nem impõe o nível de obtenção ao nível de simulação do jogo.

Em **48 formas cujo aprendizado está vazio na fonte**, mantém-se a mesma herança da forma padrão da própria espécie já usada pelo gerador do projeto. Não se herdam automaticamente golpes de espécies diferentes. Behemoth Blade e Behemoth Bash são exceções explícitas apenas para Zacian-Crowned e Zamazenta-Crowned, como substituições de Iron Head; não são concedidos às formas normais.

Transform, Sketch, Sleep Talk, Struggle e conversões Max/Z possuem regras próprias durante o combate. Copiar ou converter legitimamente um golpe não é uma atribuição inicial irregular. A auditoria cobre os dados distribuídos e as rotas offline do jogo; consultas online continuam partindo da lista de aprendizado retornada para o Pokémon pela PokéAPI.

## Fonte e reprodução

- PokéAPI, commit **6b8db7f3cb31cfaa37cb74e5c3edff124bcba5ce**: [pokemon_moves.csv](https://github.com/PokeAPI/pokeapi/blob/6b8db7f3cb31cfaa37cb74e5c3edff124bcba5ce/data/v2/csv/pokemon_moves.csv), [pokemon.csv](https://github.com/PokeAPI/pokeapi/blob/6b8db7f3cb31cfaa37cb74e5c3edff124bcba5ce/data/v2/csv/pokemon.csv) e [moves.csv](https://github.com/PokeAPI/pokeapi/blob/6b8db7f3cb31cfaa37cb74e5c3edff124bcba5ce/data/v2/csv/moves.csv). Hashes dos arquivos ficam na referência local e no relatório JSON.
- Exceções das formas coroadas: [Pokémon Showdown — conditions.ts](https://github.com/smogon/pokemon-showdown/blob/master/data/conditions.ts).
- Referência local: `assets/js/battle/pokemon-learnsets.js`.
- Reconstrução: `node scripts/build-pokemon-learnsets.js <diretorio-dos-csvs>`; o diretório deve conter os três CSVs e `source.json` com repositório/commit.
- Auditoria sem rede: `node scripts/audit-pokemon-learnsets.js docs/pokemon-learnset-audit.json`.
- Resultado estruturado: `docs/pokemon-learnset-audit.json`.
- Validação final: **2.651 testes / 38 suítes aprovados**, zero falhas, cancelados ou ignorados; auditoria de conclusão mantém **384 FULL e zero PARTIAL**.

Publicado no commit 154b38b9c77855769602ac7dacad00ab33efac9f, confirmado em origin/main em 01/11/2026.
