const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Catalog = require('../../assets/js/campaign/cinematic-dialogue-catalog.js');
const { CinematicDialogue } = require('../../assets/js/campaign/cinematic-dialogue.js');
const { CampaignBattleCoordinator } = require('../../assets/js/campaign/campaign-battle-coordinator.js');

describe('PHASE PBA-020 — CINEMATIC DIALOGUE SYSTEM SUITE', () => {

  describe('1. Identificação de Confrontos', () => {
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

    it('CD03 — Confrontos intermediários (Mestres) NÃO ativam diálogo cinematográfico', () => {
      assert.strictEqual(Catalog.hasScene('MASTER', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene('master-water', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene('master-fire', 'VICTORY'), false);
    });

    it('CD04 — Provas Especiais e Batalhas Comuns NÃO ativam diálogo cinematográfico', () => {
      assert.strictEqual(Catalog.hasScene('LEGENDARY_TRIAL', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene('MYTHICAL_TRIAL', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene('QUICK', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene('WILD', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene('', 'INTRO'), false);
      assert.strictEqual(Catalog.hasScene(null, 'INTRO'), false);
    });
  });

  describe('2. Apresentação e Preservação de Personagens', () => {
    it('CD05 — Super Trainer reutiliza exclusivamente o asset original homologado', () => {
      const scene = Catalog.getSceneDefinition('SUPER', 'INTRO');
      assert.ok(scene, 'Cena de Super Intro deve existir');
      assert.strictEqual(scene.trainerId, 'super-trainer');
      assert.strictEqual(scene.trainerName, 'Super Treinador');
      assert.strictEqual(scene.avatarSrc, 'assets/images/trainers/super-trainer.png');
      assert.strictEqual(scene.backgroundSrc, 'assets/images/arenas/arena-super.webp');
      assert.strictEqual(scene.theme, 'super');

      // Verifica se o arquivo de imagem original realmente existe no repositório
      const fullPath = path.resolve(__dirname, '../../', scene.avatarSrc);
      assert.strictEqual(fs.existsSync(fullPath), true, 'Asset original super-trainer.png deve existir fisicamente');
    });

    it('CD06 — Shadow Super Trainer reutiliza exclusivamente o asset original homologado', () => {
      const scene = Catalog.getSceneDefinition('SHADOW', 'INTRO');
      assert.ok(scene, 'Cena de Shadow Intro deve existir');
      assert.strictEqual(scene.trainerId, 'shadow-super-trainer');
      assert.strictEqual(scene.trainerName, 'Shadow Super Trainer');
      assert.strictEqual(scene.avatarSrc, 'assets/images/trainers/super-trainer-shadow.png');
      assert.strictEqual(scene.backgroundSrc, 'assets/images/arenas/arena-shadow.webp');
      assert.strictEqual(scene.theme, 'shadow');

      // Verifica se o arquivo de imagem original realmente existe no repositório
      const fullPath = path.resolve(__dirname, '../../', scene.avatarSrc);
      assert.strictEqual(fs.existsSync(fullPath), true, 'Asset original super-trainer-shadow.png deve existir fisicamente');
    });

    it('CD07 — Sequência de falas na ordem correta com textos curtos e dramáticos', () => {
      const superIntro = Catalog.getSceneDefinition('SUPER', 'INTRO');
      assert.ok(Array.isArray(superIntro.lines) && superIntro.lines.length >= 3);
      assert.ok(superIntro.lines[0].includes('18 insígnias'));

      const shadowIntro = Catalog.getSceneDefinition('SHADOW', 'INTRO');
      assert.ok(Array.isArray(shadowIntro.lines) && shadowIntro.lines.length >= 3);
      assert.ok(shadowIntro.lines[0].includes('Eclipse'));

      const superVictory = Catalog.getSceneDefinition('SUPER', 'VICTORY');
      assert.ok(superVictory.lines.length >= 2);
      assert.ok(superVictory.lines[0].includes('sublime'));

      const shadowVictory = Catalog.getSceneDefinition('SHADOW', 'VICTORY');
      assert.ok(shadowVictory.lines.length >= 2);
      assert.ok(shadowVictory.lines[0].includes('rasga as próprias sombras'));
    });

    it('CD08 — Diálogos de meio de combate (MID_BATTLE) permanecem inativos na primeira fase', () => {
      assert.strictEqual(Catalog.hasScene('SUPER', 'MID_BATTLE'), false);
      assert.strictEqual(Catalog.hasScene('SHADOW', 'MID_BATTLE'), false);
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

    it('CD09 — Instanciação e controle de velocidade', () => {
      const dialogue = new CinematicDialogue(Catalog);
      assert.strictEqual(dialogue.isPlaying, false);
      assert.strictEqual(dialogue.hasScene('SUPER', 'INTRO'), true);
      assert.strictEqual(dialogue.hasScene('MASTER', 'INTRO'), false);
    });

    it('CD10 — Play monta overlay com tema correto e inicia reprodução', async () => {
      const dialogue = new CinematicDialogue(Catalog);
      dialogue.typeSpeed = 0; // digitação instantânea para teste

      const playPromise = dialogue.play('SUPER', 'INTRO');
      assert.strictEqual(dialogue.isPlaying, true);
      assert.strictEqual(appendedChildren.length, 1);
      assert.ok(appendedChildren[0].className.includes('cinematic-theme-super'));

      // Avança todas as falas
      while (dialogue.isPlaying) {
        dialogue.handleAdvance();
      }

      const result = await playPromise;
      assert.strictEqual(result, true);
      assert.strictEqual(dialogue.isPlaying, false);
    });

    it('CD11 — Primeiro avanço completa digitação em andamento; segundo passa para próxima fala', () => {
      const dialogue = new CinematicDialogue(Catalog);
      dialogue.typeSpeed = 1000; // digitação lenta proposital

      dialogue.play('SHADOW', 'INTRO');
      assert.strictEqual(dialogue.isTyping, true);
      assert.strictEqual(dialogue.lineIndex, 0);

      // Primeiro comando enquanto digita -> completa a linha 0
      dialogue.handleAdvance();
      assert.strictEqual(dialogue.isTyping, false);
      assert.strictEqual(dialogue.lineIndex, 0);

      // Segundo comando com linha completa -> avança para linha 1
      dialogue.handleAdvance();
      assert.strictEqual(dialogue.lineIndex, 1);

      dialogue.close();
    });

    it('CD12 — Pular (Skip) encerra a cena imediatamente sem travar o jogo', async () => {
      const dialogue = new CinematicDialogue(Catalog);
      const playPromise = dialogue.play('SUPER', 'INTRO');

      assert.strictEqual(dialogue.isPlaying, true);
      dialogue.close(true);

      const result = await playPromise;
      assert.strictEqual(result, true);
      assert.strictEqual(dialogue.isPlaying, false);
    });

    it('CD13 — Falha no carregamento de imagem (onerror) ativa fallback sem travar diálogo', () => {
      const dialogue = new CinematicDialogue(Catalog);
      dialogue.play('SUPER', 'INTRO');

      const imgEl = dialogue.activeOverlay.querySelector('.cinematic-portrait-img');
      const fbEl = dialogue.activeOverlay.querySelector('.cinematic-portrait-fallback');

      assert.ok(typeof imgEl.onerror === 'function', 'Deve existir handler onerror na imagem');
      imgEl.onerror();

      assert.strictEqual(imgEl.style.display, 'none');
      assert.strictEqual(fbEl.style.display, 'flex');

      // O diálogo continua funcionando normalmente
      dialogue.handleAdvance();
      assert.strictEqual(dialogue.isPlaying, true);
      dialogue.close();
    });

    it('CD14 — Prevenção de reentrância: nova execução fecha anterior com segurança', async () => {
      const dialogue = new CinematicDialogue(Catalog);
      dialogue.typeSpeed = 0;

      const p1 = dialogue.play('SUPER', 'INTRO');
      const p2 = dialogue.play('SHADOW', 'INTRO');

      assert.strictEqual(dialogue.currentScene.theme, 'shadow');
      dialogue.close();
      await Promise.all([p1, p2]);
    });
  });

  describe('4. Integração com o Fluxo de Batalha (CampaignBattleCoordinator)', () => {
    it('CD15 — Batalha Super aciona introdução cinematográfica antes de iniciar combate', async () => {
      let dialogueTriggered = false;
      let startBattleCalled = false;
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
        startBattle: async () => {
          order.push('startBattle');
          startBattleCalled = true;
        }
      };

      const mockCinematic = {
        hasScene: (kind, moment) => kind === 'SUPER' && moment === 'INTRO',
        play: async () => {
          order.push('cinematicDialogue');
          dialogueTriggered = true;
        }
      };

      const coordinator = new CampaignBattleCoordinator(mockManager, mockSession, mockCinematic);
      await coordinator.start('SUPER', null, [1, 2, 3]);

      assert.strictEqual(dialogueTriggered, true);
      assert.strictEqual(startBattleCalled, true);
      assert.deepStrictEqual(order, ['prepareBattle', 'cinematicDialogue', 'startBattle']);
    });

    it('CD16 — Batalha Shadow aciona introdução cinematográfica antes de iniciar combate', async () => {
      let dialogueTriggered = false;
      const order = [];

      const mockManager = {
        getBattleConfig: (kind) => ({
          playerTeamIds: [1, 2, 3],
          enemyTeamIds: [100, 101, 102],
          metadata: { kind, mode: 'CAMPAIGN', battleFormat: 'FINAL_STAND' }
        })
      };

      const mockSession = {
        prepareBattle: async () => { order.push('prepareBattle'); },
        startBattle: async () => { order.push('startBattle'); }
      };

      const mockCinematic = {
        hasScene: (kind, moment) => kind === 'SHADOW' && moment === 'INTRO',
        play: async () => {
          order.push('cinematicDialogue');
          dialogueTriggered = true;
        }
      };

      const coordinator = new CampaignBattleCoordinator(mockManager, mockSession, mockCinematic);
      await coordinator.start('SHADOW', null, [1]);

      assert.strictEqual(dialogueTriggered, true);
      assert.deepStrictEqual(order, ['prepareBattle', 'cinematicDialogue', 'startBattle']);
    });

    it('CD17 — Batalha de Mestre NÃO aciona diálogo cinematográfico', async () => {
      let dialogueTriggered = false;
      const order = [];

      const mockManager = {
        getBattleConfig: (kind, id) => ({
          playerTeamIds: [1, 2, 3],
          enemyTeamIds: [4, 5, 6],
          metadata: { kind, id, mode: 'CAMPAIGN' }
        })
      };

      const mockSession = {
        prepareBattle: async () => { order.push('prepareBattle'); },
        startBattle: async () => { order.push('startBattle'); }
      };

      const mockCinematic = {
        hasScene: (kind) => kind === 'SUPER' || kind === 'SHADOW',
        play: async () => { dialogueTriggered = true; }
      };

      const coordinator = new CampaignBattleCoordinator(mockManager, mockSession, mockCinematic);
      await coordinator.start('MASTER', 'master-water', [1, 2, 3]);

      assert.strictEqual(dialogueTriggered, false);
      assert.deepStrictEqual(order, ['prepareBattle', 'startBattle']);
    });

    it('CD18 — Se diálogo falhar, combate inicia normalmente sem bloquear o jogador', async () => {
      let startBattleCalled = false;

      const mockManager = {
        getBattleConfig: (kind) => ({
          playerTeamIds: [1, 2, 3],
          enemyTeamIds: [100, 101, 102],
          metadata: { kind, mode: 'CAMPAIGN' }
        })
      };

      const mockSession = {
        prepareBattle: async () => {},
        startBattle: async () => { startBattleCalled = true; }
      };

      const mockCinematic = {
        hasScene: () => true,
        play: async () => { throw new Error('Falha simulada na renderização visual'); }
      };

      const coordinator = new CampaignBattleCoordinator(mockManager, mockSession, mockCinematic);
      await coordinator.start('SUPER', null, [1, 2, 3]);

      assert.strictEqual(startBattleCalled, true, 'startBattle deve ter sido chamado apesar do erro no diálogo');
    });
  });

  describe('5. Folha de Estilos e Responsividade (cinematic-dialogue.css)', () => {
    it('CD19 — CSS define regras de tela cheia, variáveis de tema e acessibilidade', () => {
      const cssPath = path.resolve(__dirname, '../../assets/css/cinematic-dialogue.css');
      assert.strictEqual(fs.existsSync(cssPath), true);
      const css = fs.readFileSync(cssPath, 'utf8');

      assert.ok(css.includes('.cinematic-dialogue-overlay'));
      assert.ok(css.includes('cinematic-theme-super'));
      assert.ok(css.includes('cinematic-theme-shadow'));
      assert.ok(css.includes('@media (max-width: 640px)'), 'Breakpoint mobile deve estar definido');
      assert.ok(css.includes('@media (prefers-reduced-motion: reduce)'), 'Suporte a movimento reduzido deve existir');
      assert.ok(css.includes('safe-area-inset'), 'Safe areas móveis devem ser respeitadas');
    });

    it('CD20 — index.html carrega os assets do diálogo cinematográfico na ordem correta', () => {
      const indexPath = path.resolve(__dirname, '../../index.html');
      const html = fs.readFileSync(indexPath, 'utf8');

      assert.ok(html.includes('assets/css/cinematic-dialogue.css'), 'CSS deve estar referenciado em index.html');
      assert.ok(html.includes('assets/js/campaign/cinematic-dialogue-catalog.js'), 'Catálogo JS deve estar em index.html');
      assert.ok(html.includes('assets/js/campaign/cinematic-dialogue.js'), 'Componente JS deve estar em index.html');
    });
  });
});
