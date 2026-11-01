# Aberturas das quatro provas finais e áudio Shadow

Implementação: 01/11/2026. As correções de aprendizado de golpes foram publicadas separadamente no commit `154b38b9c77855769602ac7dacad00ab33efac9f`, confirmado em origin/main.

## Quatro aberturas

Cada prova apresenta seis planos: limiar, presságio, revelação de cada um dos três adversários e formação completa. A animação usa o cenário temático já existente e as imagens do time realmente hidratado pela sessão; os Pokémon não são mantidos em uma segunda lista visual.

| Prova | Time canônico atual | Identidade |
| --- | --- | --- |
| Lendária | Zapdos, Suicune, Latios | Tempestade, clarões e chuva |
| Mítica | Mew, Jirachi, Victini | Luzes, círculos de energia e atmosfera mística |
| Titãs | Koraidon, Groudon, Yveltal | Fendas, tremor e fragmentos suspensos |
| Celestial | Zamazenta, Solgaleo, Giratina | Órbitas, estrelas e portal cósmico |

Há trilhas procedurais próprias e cries dos Pokémon nas revelações. A cena é exibida depois de preparar o confronto e antes de iniciar a batalha, inclusive em novas tentativas. A formação completa aguarda “Entrar na arena”; “Pular abertura” ou Escape segue diretamente para a batalha preparada. Não altera equipes, golpes, recompensas ou progresso.

A interface limita o foco aos dois botões, restaura foco/rolagem ao fechar, pausa a progressão quando a aba fica oculta e usa passos manuais quando há preferência de movimento reduzido. Cliques duplicados não preparam/iniciam duas batalhas. Falha de apresentação mantém o combate disponível; cancelamento explícito não inicia o combate.

## Áudio Shadow

O teste local com o controlador real e Web Audio apresentou sinal no diálogo e na batalha, com diálogo originalmente muito mais baixo e concentrado em graves. O ajuste traz a melodia do diálogo para região média com timbre triangular, reforça seu ganho e torna o tema de batalha mais perceptível sem remover o caráter sombrio. Mute e volumes do mixer permanecem respeitados.

O desbloqueio começa no clique que solicita o desafio, antes de aguardar a preparação, e o diálogo recebe explicitamente o mesmo controlador de áudio da sessão. O tema Shadow também retoma o contexto ao iniciar; cancelamentos invalidam retomadas pendentes para não disparar música atrasada. Pulsos encerrados desconectam seus nós. A URL versionada do controlador de áudio foi atualizada para carregar a correção em clientes com cópia antiga.

No navegador de teste com volume padrão, o RMS observado no diálogo passou de aproximadamente 0,002 para 0,016; no combate atualizado houve sinal na faixa de 0,024–0,042. São medições locais dependentes da amostra, não promessa de volume no dispositivo do jogador.

## Validação

- Dez regressões de abertura: quatro times, confirmação final, teclado, timer, imagens alternativas, trilha/cries, cancelamento, clique duplicado e encadeamento ao combate.
- Três regressões de áudio: quatro famílias das provas, melodia Shadow sem sobrescrever volumes/mute e desbloqueio/cancelamento do tema Shadow.
- **2.664 testes / 38 suítes aprovados**, zero falhas, cancelados ou ignorados.
- Conferência visual das quatro formações completas em navegador e enquadramento móvel da Celestial; entrada real na batalha Celestial com seu líder Zamazenta.
- Medições de áudio em diálogo e batalha Shadow sem avisos/erros observados no teste local.
- Testes visuais usaram uma campanha em memória em uma página local isolada; não alteraram o progresso salvo do jogador.

As novas aberturas e os ajustes de áudio estão locais, ainda sem novo commit/push.
