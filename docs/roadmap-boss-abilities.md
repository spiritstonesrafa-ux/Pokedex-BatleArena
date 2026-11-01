# Habilidades dos novos chefes — roteiro de implementação

Estado em 01/11/2026: equipes e conjuntos dos chefes implementados; habilidades abaixo ainda pendentes. Este roteiro estende o suporte de habilidades e não reabre as fases já concluídas de golpes.

## Equipes já integradas

Super e Shadow usam Eternatus Eternamax (10190), Calyrex Shadow (10194) e Zacian Crowned (10188), com definições independentes. Shadow mantém Final Stand e SHADOW_AURA. Conjuntos exclusivos dos chefes: Black Sludge, Choice Specs e Choice Band, respectivamente; Zacian recebe Behemoth Blade no lugar de Iron Tail. As versões do jogador continuam com suas configurações próprias.

Recompensas anteriores de Arceus, Eternatus e Mewtwo, recompensas pendentes, capturas e encontros antigos dos novos chefes são preservados. Quem já possui todos os recrutas pode continuar sem duplicar o elenco.

## 1. Pressure — Eternatus

- Consumir um PP adicional do golpe adversário que tem o portador como alvo; não tratar como custo de dano ou bônus ofensivo.
- Integrar o custo no ponto único de consumo de PP, incluindo alvos em duplas e golpes chamados, observando suas regras particulares.
- Não cobrar de golpes do próprio lado nem de cada acerto de um multihit separadamente.
- Registrar o custo efetivamente pago e manter PP entre zero e o máximo.

Testes necessários: PP 1 e 2, golpe sem PP, erro/proteção, golpes de campo e de si mesmo, Sleep Talk, multihit, dois alvos com Pressure em duplas, trocas e reinício. Conferir cada exceção de alvo no motor de referência antes de codificá-la. A IA deve receber a disponibilidade atualizada e chegar a Struggle quando necessário.

## 2. Intrepid Sword — Zacian

- Adotar regra atual de ativação única por Pokémon por batalha: +1 estágio de Attack na primeira entrada elegível.
- A marca de ativação deve continuar nas trocas e nunca vir de dados brutos ou de uma batalha anterior.
- Reutilizar o sistema de estágios e seus limites; não multiplicar o atributo base permanentemente.

Testes necessários: início no campo, primeira entrada como reserva, retorno ao campo, Attack já em +6, marca em nova batalha, interação com Choice Band, formas/Transform e habilidades anuladas. Registrar a geração de regras: a geração VIII tinha comportamento de reativação diferente, portanto não misturar os dois contratos.

## 3. As One — Calyrex Cavaleiro Espectral

A habilidade combina dois efeitos:

- **Unnerve:** impede os adversários de comer berries enquanto o portador está ativo.
- **Grim Neigh:** aumenta Special Attack em um estágio por adversário nocauteado por um golpe do portador.

Implementar Unnerve no caminho comum de consumo de berries, incluindo cura de HP e de condições. A restrição deixa de atuar quando o portador sai do campo ou é nocauteado. Grim Neigh precisa de autoria explícita do nocaute; não pode atribuir veneno, queimadura ou outro dano residual ao último atacante. Em duplas, contabilizar vítimas de golpe em área uma única vez por vítima.

As One também tem regras próprias de imunidade a supressão, cópia e troca de habilidade: a implementação precisa respeitar essas propriedades, em vez de passar cegamente pela regra genérica abilitySuppressed.

Testes necessários: berries de cura/status, aliados contra adversários, saída/nocaute de Calyrex e reavaliação da berry; nocaute direto, residual, recoil e duplo; limite +6; formas/Transform, supressão e prevenção de eventos duplicados.

## 4. Integração e aceitação

- Os efeitos pertencem ao motor e valem para jogador e IA, em individuais, equipes, Final Stand e duplas.
- O avaliador deve considerar estágios e berries realmente disponíveis, sem antecipar ações ou sorteios do jogador.
- Exibir habilidade ativada, PP extra e mudança de atributo no histórico/apresentação. Não anunciar efeitos pendentes como se funcionassem.
- Atualizar a lista de habilidades suportadas apenas depois dos testes de comportamento passarem.
- Testar regressão em itens, PP, trocas, nocaute, salvamento e efeitos visuais; repetir a comparação dos chefes após as habilidades estarem prontas.

## Referência primária

Implementação de referência do próprio Pokémon Showdown, consultada em 01/11/2026:
https://github.com/smogon/pokemon-showdown/blob/master/data/abilities.ts
Seções pressure, intrepidsword e asonespectrier. Regras modernas de Intrepid Sword; a versão de geração VIII fica em data/mods/gen8/abilities.ts.

Nenhuma dessas habilidades foi implementada nesta mudança das equipes. Itens e Behemoth Blade já têm suporte funcional.
