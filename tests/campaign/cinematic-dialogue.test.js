const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Catalog = require('../../assets/js/campaign/cinematic-dialogue-catalog.js');
const { CinematicDialogue } = require('../../assets/js/campaign/cinematic-dialogue.js');
const { CampaignBattleCoordinator } = require('../../assets/js/campaign/campaign-battle-coordinator.js');

describe('PHASE PBA-020 — CINEMATIC DIALOGUE SYSTEM SUITE (FULL ROSTER)', () => {

  const ALL_MASTERS = [
    { id: 'master-normal', name: 'Aster', title: 'Mestre do Equilíbrio', type: 'normal', avatar: 'assets/images/trainers/aster.png', arena: 'assets/images/arenas/arena-normal.webp' },
    { id: 'master-fire', name: 'Kael', title: 'Mestre das Chamas', type: 'fire', avatar: 'assets/images/trainers/kael.png', arena: 'assets/images/arenas/arena-fire.webp' },
    { id: 'master-water', name: 'Marina', title: 'Guardiã das Marés', type: 'water', avatar: 'assets/images/trainers/marina.png', arena: 'assets/images/arenas/arena-water.webp' },
    { id: 'master-electric', name: 'Volt', title: 'Condutor da Tempestade', type: 'electric', avatar: 'assets/images/trainers/volt.png', arena: 'assets/images/arenas/arena-electric.webp' },
    { id: 'master-grass', name: 'Flora', title: 'Mestre do Bosque', type: 'grass', avatar: 'assets/images/trainers/flora.png', arena: 'assets/images/arenas/arena-grass.webp' },
    { id: 'master-ice', name: 'Yara', title: 'Guardiã do Inverno', type: 'ice', avatar: 'assets/images/trainers/yara.png', arena: 'assets/images/arenas/arena-ice.webp' },
    { id: 'master-fighting', name: 'Dante', title: 'Mestre da Vanguarda', type: 'fighting', avatar: 'assets/images/trainers/dante.png', arena: 'assets/images/arenas/arena-fighting.webp' },
    { id: 'master-poison', name: 'Vesper', title: 'Mestre da Alquimia', type: 'poison', avatar: 'assets/images/trainers/vesper.png', arena: 'assets/images/arenas/arena-poison.webp' },
    { id: 'master-ground', name: 'Terra', title: 'Guardião do Vale', type: 'ground', avatar: 'assets/images/trainers/terra.png', arena: 'assets/images/arenas/arena-ground.webp' },
    { id: 'master-flying', name: 'Aero', title: 'Mestre dos Ventos', type: 'flying', avatar: 'assets/images/trainers/aero.png', arena: 'assets/images/arenas/arena-flying.webp' },
    { id: 'master-psychic', name: 'Orion', title: 'Mestre do Horizonte Mental', type: 'psychic', avatar: 'assets/images/trainers/orion.png', arena: 'assets/images/arenas/arena-psychic.webp' },
    { id: 'master-bug', name: 'Nilo', title: 'Guardião do Enxame', type: 'bug', avatar: 'assets/images/trainers/nilo.png', arena: 'assets/images/arenas/arena-bug.webp' },
    { id: 'master-rock', name: 'Petra', title: 'Mestre do Monólito', type: 'rock', avatar: 'assets/images/trainers/petra.png', arena: 'assets/images/arenas/arena-rock.webp' },
    { id: 'master-ghost', name: 'Nyra', title: 'Guardiã do Véu', type: 'ghost', avatar: 'assets/images/trainers/nyra.png', arena: 'assets/images/arenas/arena-ghost.webp' },
    { id: 'master-dragon', name: 'Riven', title: 'Mestre do Céu Antigo', type: 'dragon', avatar: 'assets/images/trainers/riven.png', arena: 'assets/images/arenas/arena-dragon.webp' },
    { id: 'master-dark', name: 'Noctis', title: 'Mestre do Crepúsculo', type: 'dark', avatar: 'assets/images/trainers/noctis.png', arena: 'assets/images/arenas/arena-dark.webp' },
    { id: 'master-steel', name: 'Ferrum', title: 'Guardião da Forja', type: 'steel', avatar: 'assets/images/trainers/ferrum.png', arena: 'assets/images/arenas/arena-steel.webp' },
    { id: 'master-fairy', name: 'Lumi', title: 'Mestre do Encanto', type: 'fairy', avatar: 'assets/images/trainers/lumi.png', arena: 'assets/images/arenas/arena-fairy.webp' }
  ];

  describe('1. Identificação e Cobertura de Treinadores', () => {
    it('CD01 — Super Final ativa diálogos de Introdução, Vitória e Derrota', () => {
      assert.strictEqual(Catalog.hasScene('SUPER', 'INTRO'), true);
      assert.strictEqual(Catalog.hasScene('SUPER', 'VICTORY'), true);
      assert.strictEqual(Catalog.hasScene('SUPER', 'DEFEAT'), true);
    });

    it('CD02 — Shadow Final ativa diálogos de Introdução, Vitória e Derrota', () => {
      assert.strictEqual(Catalog.hasScene('SHADOW', 'INTRO'), true);
      assert.strictEqual(Catalog.hasScene('SHADOW', 'VICTORY'), true);
      assert.strictEqual(Catalog.hasScene('SHADOW', 'DEFEAT'), true);
    });

    it('CD03 — Todos os 18 Mestres de Tipo possuem cenas de Introdução, Vitória e Derrota', () => {
      assert.strictEqual(ALL_MASTERS.length, 18);
      for (const master of ALL_MASTERS) {
        assert.strictEqual(Catalog.hasScene(master.id, 'INTRO'), true, `Mestre ${master.id} deve ter INTRO`);
        assert.strictEqual(Catalog.hasScene(master.id, 'VICTORY'), true, `Mestre ${master.id} deve ter VICTORY`);
        assert.strictEqual(Catalog.hasScene(master.id, 'DEFEAT'), true, `Mestre ${master.id} deve ter DEFEAT`);
        // Aliases por tipo
        assert.strictEqual(Catalog.hasScene(master.type, 'INTRO'), true, `Mestre ${master.type} deve ter INTRO via tipo`);
      }
    });

    it('CD04 — Provas Especiais e Batalhas Comuns NÃO ativam diálogo cinematográfico', () => {
      assert.strictEqual(Catalog.hasScene('LEGENDARY_TRIAL', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene('MYTHICAL_TRIAL', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene('TITANS_TRIAL', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene('CELESTIAL_TRIAL', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene('QUICK', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene('WILD', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene('', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene(null, 'INTRO'), false);
    });
  });

  describe('2. Apresentação e Preservação de Personagens e Assets Físicos', () => {
    it('CD05 — Super Trainer reutiliza exclusivamente o asset original homologado', () => {
      const scene = Catalog.getSceneDefinition('SUPER', 'INTRO');
      assert.ok(scene, 'Cena de Super Intro deve existir');
      assert.strictEqual(scene.trainerId, 'super-trainer');
      assert.strictEqual(scene.trainerName, 'Super Treinador');
      assert.strictEqual(scene.avatarSrc, 'assets/images/trainers/super-trainer.png');
      assert.strictEqual(scene.backgroundSrc, 'assets/images/arenas/arena-super.webp');
      assert.strictEqual(scene.theme, 'super');

      const fullPath = path.resolve(__dirname, '../../', scene.avatarSrc);
      assert.strictEqual(fs.existsSync(fullPath), true, 'Asset original super-trainer.png deve existir fisicamente');
      const bgPath = path.resolve(__dirname, '../../', scene.backgroundSrc);
      assert.strictEqual(fs.existsSync(bgPath), true, 'Arena super deve existir fisicamente');
    });

    it('CD06 — Shadow Super Trainer reutiliza exclusivamente o asset original homologado', () => {
      const scene = Catalog.getSceneDefinition('SHADOW', 'INTRO');
      assert.ok(scene, 'Cena de Shadow Intro deve existir');
      assert.strictEqual(scene.trainerId, 'shadow-super-trainer');
      assert.strictEqual(scene.trainerName, 'Shadow Super Trainer');
      assert.strictEqual(scene.avatarSrc, 'assets/images/trainers/super-trainer-shadow.png');
      assert.strictEqual(scene.backgroundSrc, 'assets/images/arenas/arena-shadow.webp');
      assert.strictEqual(scene.theme, 'shadow');

      const fullPath = path.resolve(__dirname, '../../', scene.avatarSrc);
      assert.strictEqual(fs.existsSync(fullPath), true, 'Asset original super-trainer-shadow.png deve existir fisicamente');
      const bgPath = path.resolve(__dirname, '../../', scene.backgroundSrc);
      assert.strictEqual(fs.existsSync(bgPath), true, 'Arena shadow deve existir fisicamente');
    });

    it('CD07 — Todos os 18 Mestres possuem imagens e arenas físicas válidas e existentes', () => {
      for (const master of ALL_MASTERS) {
        const scene = Catalog.getSceneDefinition(master.id, 'INTRO');
        assert.ok(scene, `Cena de ${master.id} deve ser resolvida`);
        assert.strictEqual(scene.trainerName, master.name);
        assert.strictEqual(scene.trainerTitle, master.title);
        assert.strictEqual(scene.avatarSrc, master.avatar);
        assert.strictEqual(scene.backgroundSrc, master.arena);

        const avatarFullPath = path.resolve(__dirname, '../../', scene.avatarSrc);
        assert.strictEqual(fs.existsSync(avatarFullPath), true, `Imagem ${master.avatar} deve existir fisicamente`);

        const arenaFullPath = path.resolve(__dirname, '../../', scene.backgroundSrc);
        assert.strictEqual(fs.existsSync(arenaFullPath), true, `Arena ${master.arena} deve existir fisicamente`);
      }
    });

    it('CD08 — Preservação dos textos originais do Super e Shadow', () => {
      const superIntro = Catalog.getSceneDefinition('SUPER', 'INTRO');
      assert.ok(superIntro.lines[0].includes('18 insígnias'));

      const shadowIntro = Catalog.getSceneDefinition('SHADOW', 'INTRO');
      assert.ok(shadowIntro.lines[0].includes('Eclipse'));

      const superVictory = Catalog.getSceneDefinition('SUPER', 'VICTORY');
      assert.ok(superVictory.lines[0].includes('sublime'));

      const shadowVictory = Catalog.getSceneDefinition('SHADOW', 'VICTORY');
      assert.ok(shadowVictory.lines[0].includes('rasga as próprias sombras'));
    });

    it('CD09 — Qualidade narrativa dos Mestres: falas concisas, autênticas e sem repetições', () => {
      const allIntroLines = new Set();
      for (const master of ALL_MASTERS) {
        const intro = Catalog.getSceneDefinition(master.id, 'INTRO');
        const victory = Catalog.getSceneDefinition(master.id, 'VICTORY');
        const defeat = Catalog.getSceneDefinition(master.id, 'DEFEAT');

        // Quantidade de falas recomendada: 2 a 3 no intro, 1 a 2 na vitória/derrota
        assert.ok(intro.lines.length >= 2 && intro.lines.length <= 4, `Intro de ${master.name} deve ter 2-4 falas`);
        assert.ok(victory.lines.length >= 1 && victory.lines.length <= 3, `Vitória de ${master.name} deve ter 1-3 falas`);
        assert.ok(defeat.lines.length >= 1 && defeat.lines.length <= 3, `Derrota de ${master.name} deve ter 1-3 falas`);

        // Não deve haver falas duplicadas entre treinadores
        for (const line of intro.lines) {
          assert.strictEqual(allIntroLines.has(line), false, `Linha duplicada detectada: ${line}`);
          allIntroLines.add(line);
        }
      }
    });
  });

  describe('3. Máquina de Estados e Interação do Componente (CinematicDialogue)', () => {
    let mockDoc;
    let appendedChildren;

    beforeEach(() => {
      appendedChildren = [];
      mockDoc = {
        createElement: (tag) => {
          const el = {
            tagName: tag.toUpperCase(),
            className: '',
            style: {},
            attributes: {},
            children: [],
            innerHTML: '',
            parentNode: null,
            setAttribute(k, v) { this.attributes[k] = v; },
            getAttribute(k) { return this.attributes[k]; },
            querySelector(sel) {
              if (sel === '.cinematic-text') return this._textEl || (this._textEl = { textContent: '' });
              if (sel === '.cinematic-advance-indicator') return this._indEl || (this._indEl = { classList: { add() {}, remove() {} } });
              if (sel === '.cinematic-skip-btn') return this._skipBtn || (this._skipBtn = { onclick: null });
              if (sel === '.cinematic-portrait-img') return this._imgEl || (this._imgEl = { style: {}, onerror: null });
              if (sel === '.cinematic-portrait-fallback') return this._fbEl || (this._fbEl = { style: {} });
              return null;
            },
            querySelectorAll() { return []; },
            classList: {
              classes: new Set(),
              add(c) { this.classes.add(c); },
              remove(c) { this.classes.delete(c); },
              contains(c) { return this.classes.has(c); }
            },
            remove() {
              const idx = appendedChildren.indexOf(this);
              if (idx !== -1) appendedChildren.splice(idx, 1);
              this.parentNode = null;
            },
            removeChild(child) {
              const idx = appendedChildren.indexOf(child);
              if (idx !== -1) appendedChildren.splice(idx, 1);
              child.parentNode = null;
            }
          };
          return el;
        },
        body: {
          appendChild(child) {
            appendedChildren.push(child);
            child.parentNode = mockDoc.body;
          },
          removeChild(child) {
            const idx = appendedChildren.indexOf(child);
            if (idx !== -1) appendedChildren.splice(idx, 1);
            child.parentNode = null;
          }
        }
      };
      global.document = mockDoc;
      global.window = {
        addEventListener: () => {},
        removeEventListener: () => {},
        matchMedia: () => ({ matches: false })
      };
    });

    it('CD10 — Instanciação e controle de velocidade', () => {
      const dialogue = new CinematicDialogue(Catalog);
      assert.strictEqual(dialogue.isPlaying, false);
      assert.strictEqual(dialogue.hasScene('SUPER', 'INTRO'), true);
      assert.strictEqual(dialogue.hasScene('master-fire', 'INTRO'), true);
      assert.strictEqual(dialogue.hasScene('WILD', 'INTRO'), false);
    });

    it('CD11 — Play monta overlay com tema correto para Mestre e inicia reprodução', async () => {
      const dialogue = new CinematicDialogue(Catalog);
      dialogue.typeSpeed = 0;

      const playPromise = dialogue.play('master-fire', 'INTRO');
      assert.strictEqual(dialogue.isPlaying, true);
      assert.strictEqual(appendedChildren.length, 1);
      assert.ok(appendedChildren[0].className.includes('cinematic-theme-fire'));

      while (dialogue.isPlaying) {
        dialogue.handleAdvance();
      }

      const result = await playPromise;
      assert.strictEqual(result, true);
      assert.strictEqual(dialogue.isPlaying, false);
    });

    it('CD12 — Primeiro avanço completa digitação em andamento; segundo passa para próxima fala', () => {
      const dialogue = new CinematicDialogue(Catalog);
      dialogue.typeSpeed = 1000;

      dialogue.play('master-water', 'INTRO');
      assert.strictEqual(dialogue.isTyping, true);
      assert.strictEqual(dialogue.lineIndex, 0);

      dialogue.handleAdvance();
      assert.strictEqual(dialogue.isTyping, false);
      assert.strictEqual(dialogue.lineIndex, 0);

      dialogue.handleAdvance();
      assert.strictEqual(dialogue.lineIndex, 1);

      dialogue.close();
    });

    it('CD13 — Pular (Skip) encerra a cena imediatamente sem travar o jogo', async () => {
      const dialogue = new CinematicDialogue(Catalog);
      const playPromise = dialogue.play('master-dragon', 'INTRO');

      assert.strictEqual(dialogue.isPlaying, true);
      dialogue.close(true);

      const result = await playPromise;
      assert.strictEqual(result, true);
      assert.strictEqual(dialogue.isPlaying, false);
    });

    it('CD14 — Falha no carregamento de imagem (onerror) ativa fallback sem travar diálogo', () => {
      const dialogue = new CinematicDialogue(Catalog);
      dialogue.play('master-grass', 'INTRO');

      const imgEl = dialogue.activeOverlay.querySelector('.cinematic-portrait-img');
      const fbEl = dialogue.activeOverlay.querySelector('.cinematic-portrait-fallback');

      assert.ok(typeof imgEl.onerror === 'function', 'Deve existir handler onerror na imagem');
      imgEl.onerror();

      assert.strictEqual(imgEl.style.display, 'none');
      assert.strictEqual(fbEl.style.display, 'flex');

      dialogue.handleAdvance();
      assert.strictEqual(dialogue.isPlaying, true);
      dialogue.close();
    });

    it('CD15 — Prevenção de reentrância: nova execução fecha anterior com segurança', async () => {
      const dialogue = new CinematicDialogue(Catalog);
      dialogue.typeSpeed = 0;

      const p1 = dialogue.play('master-fire', 'INTRO');
      const p2 = dialogue.play('master-ice', 'INTRO');

      assert.strictEqual(dialogue.currentScene.theme, 'ice');
      dialogue.close();
      await Promise.all([p1, p2]);
    });
  });

  describe('4. Integração com o Fluxo de Batalha (CampaignBattleCoordinator)', () => {
    it('CD16 — Batalha de Mestre aciona introdução cinematográfica do Mestre correspondente', async () => {
      let dialogueSceneKey = null;
      let startBattleCalled = false;
      const order = [];

      const mockManager = {
        getBattleConfig: (kind, id) => ({
          playerTeamIds: [1, 2, 3],
          enemyTeamIds: [38, 59, 609],
          metadata: { kind, id, mode: 'CAMPAIGN' }
        })
      };

      const mockSession = {
        prepareBattle: async () => { order.push('prepareBattle'); },
        startBattle: async () => {
          order.push('startBattle');
          startBattleCalled = true;
        }
      };

      const mockCinematic = {
        hasScene: (key, moment) => key === 'master-fire' && moment === 'INTRO',
        play: async (key) => {
          order.push('cinematicDialogue');
          dialogueSceneKey = key;
        }
      };

      const coordinator = new CampaignBattleCoordinator(mockManager, mockSession, mockCinematic);
      await coordinator.start('MASTER', 'master-fire', [1, 2, 3]);

      assert.strictEqual(dialogueSceneKey, 'master-fire');
      assert.strictEqual(startBattleCalled, true);
      assert.deepStrictEqual(order, ['prepareBattle', 'cinematicDialogue', 'startBattle']);
    });

    it('CD17 — Batalha Super e Batalha Shadow continuam acionando diálogos de intro', async () => {
      const order = [];
      const mockManager = {
        getBattleConfig: (kind) => ({
          playerTeamIds: [1, 2, 3],
          enemyTeamIds: [100, 101, 102],
          metadata: { kind, mode: 'CAMPAIGN' }
        })
      };

      const mockSession = {
        prepareBattle: async () => { order.push('prepareBattle'); },
        startBattle: async () => { order.push('startBattle'); }
      };

      const mockCinematic = {
        hasScene: (key, moment) => (key === 'SUPER' || key === 'SHADOW') && moment === 'INTRO',
        play: async (key) => { order.push('dialogue:' + key); }
      };

      const coordinator = new CampaignBattleCoordinator(mockManager, mockSession, mockCinematic);
      await coordinator.start('SUPER', null, [1, 2, 3]);
      await coordinator.start('SHADOW', null, [1]);

      assert.deepStrictEqual(order, [
        'prepareBattle', 'dialogue:SUPER', 'startBattle',
        'prepareBattle', 'dialogue:SHADOW', 'startBattle'
      ]);
    });

    it('CD18 — Batalha Selvagem (WILD) NÃO aciona diálogo cinematográfico', async () => {
      let dialogueCalled = false;
      const order = [];

      const mockManager = {
        getBattleConfig: (kind, id) => ({
          playerTeamIds: [1, 2, 3],
          enemyTeamIds: [id],
          metadata: { kind, id, mode: 'CAMPAIGN' }
        })
      };

      const mockSession = {
        prepareBattle: async () => { order.push('prepareBattle'); },
        startBattle: async () => { order.push('startBattle'); }
      };

      const mockCinematic = {
        hasScene: () => false,
        play: async () => { dialogueCalled = true; }
      };

      const coordinator = new CampaignBattleCoordinator(mockManager, mockSession, mockCinematic);
      await coordinator.start('WILD', 25, [1, 2, 3]);

      assert.strictEqual(dialogueCalled, false);
      assert.deepStrictEqual(order, ['prepareBattle', 'startBattle']);
    });

    it('CD19 — Se diálogo falhar, combate inicia normalmente sem bloquear o jogador', async () => {
      let startBattleCalled = false;

      const mockManager = {
        getBattleConfig: (kind, id) => ({
          playerTeamIds: [1, 2, 3],
          enemyTeamIds: [4, 5, 6],
          metadata: { kind, id, mode: 'CAMPAIGN' }
        })
      };

      const mockSession = {
        prepareBattle: async () => {},
        startBattle: async () => { startBattleCalled = true; }
      };

      const mockCinematic = {
        hasScene: () => true,
        play: async () => { throw new Error('Falha simulada no diálogo'); }
      };

      const coordinator = new CampaignBattleCoordinator(mockManager, mockSession, mockCinematic);
      await coordinator.start('MASTER', 'master-water', [1, 2, 3]);

      assert.strictEqual(startBattleCalled, true, 'startBattle deve ter sido chamado apesar do erro no diálogo');
    });
  });

  describe('5. Folha de Estilos e Responsividade (cinematic-dialogue.css)', () => {
    it('CD20 — CSS define todos os temas elementais, regras de tela cheia e acessibilidade', () => {
      const cssPath = path.resolve(__dirname, '../../assets/css/cinematic-dialogue.css');
      assert.strictEqual(fs.existsSync(cssPath), true);
      const css = fs.readFileSync(cssPath, 'utf8');

      assert.ok(css.includes('.cinematic-dialogue-overlay'));
      assert.ok(css.includes('cinematic-theme-super'));
      assert.ok(css.includes('cinematic-theme-shadow'));

      // Verifica todos os 18 temas elementais
      const expectedThemes = [
        'normal', 'fire', 'water', 'electric', 'grass', 'ice',
        'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
        'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
      ];
      for (const theme of expectedThemes) {
        assert.ok(css.includes(`cinematic-theme-${theme}`), `Tema cinematic-theme-${theme} deve estar definido`);
      }

      assert.ok(css.includes('@media (max-width: 640px)'), 'Breakpoint mobile deve estar definido');
      assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Suporte a movimento reduzido deve existir');
      assert.ok(css.includes('safe-area-inset'), 'Safe areas móveis devem ser respeitadas');
    });
  });
});
