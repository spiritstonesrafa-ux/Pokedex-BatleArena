/**
 * ====================================================================
 * SUÍTE DE TESTES: STATUS CONDITIONS VISUAL EFFECTS (ST01–ST40)
 * ====================================================================
 * Valida a arquitetura, catálogo de constantes, identidades visuais,
 * controlador de efeitos, independência de estilos do sprite,
 * coexistência de confusão com status primário, pulsos de dano e
 * imobilização, trocas, nocaute, reconstrução de tela e duplas.
 *
 * Execução: node --test tests/presentation/pokemon-status-vfx.test.js
 */

const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const StatusConstants = require('../../assets/js/presentation/status-vfx/pokemon-status-vfx-constants.js');
const { PokemonStatusVfxController, createStatusVfxController } = require('../../assets/js/presentation/status-vfx/pokemon-status-vfx-controller.js');
const { PokemonAnimationRegistry } = require('../../assets/js/presentation/animation/pokemon-animation-registry.js');
const { PokemonAnimationController } = require('../../assets/js/presentation/animation/pokemon-animation-controller.js');
const { CompositeBattleDomAdapter } = require('../../assets/js/presentation/composite-battle-dom-adapter.js');
const PresentationConstants = require('../../assets/js/presentation/battle-presentation-constants.js');

const {
  STATUS_CONDITIONS,
  VOLATILE_CONDITIONS,
  STATUS_VFX_STATES,
  STATUS_VFX_DURATIONS,
  STATUS_IDENTITIES,
  ADDITIONAL_ENGINE_CONDITIONS
} = StatusConstants;

const { PRESENTATION_COMMANDS } = PresentationConstants;

/**
 * Cria mock de elemento DOM com hierarquia, classes e estilos.
 */
function createMockDomElement(tagName = 'div') {
  const classes = new Set();
  const attributes = new Map();
  const children = [];

  const el = {
    tagName: tagName.toUpperCase(),
    style: {
      transform: '',
      opacity: '',
      filter: '',
      zIndex: ''
    },
    src: '',
    alt: '',
    children,
    parentElement: null,
    innerHTMLValue: '',

    get innerHTML() {
      return this.innerHTMLValue;
    },
    set innerHTML(val) {
      this.innerHTMLValue = val;
      // Quando innerHTML é limpo ou preenchido, limpa ou recria nós filhos
      children.length = 0;
      if (val && typeof val === 'string') {
        // Gera nós filhos simplificados a partir de classes no template
        const classMatches = val.matchAll(/class="([^"]+)"/g);
        for (const match of classMatches) {
          const child = createMockDomElement('div');
          match[1].split(/\s+/).filter(Boolean).forEach(c => child.classList.add(c));
          child.parentElement = el;
          children.push(child);
        }
      }
    },

    get className() {
      return Array.from(classes).join(' ');
    },
    set className(val) {
      classes.clear();
      if (val) {
        val.split(/\s+/).filter(Boolean).forEach(c => classes.add(c));
      }
    },

    classList: {
      add: (...cls) => cls.forEach(c => c && classes.add(c)),
      remove: (...cls) => cls.forEach(c => classes.delete(c)),
      contains: (cls) => classes.has(cls),
      toggle: (cls, force) => {
        if (force === undefined) {
          classes.has(cls) ? classes.delete(cls) : classes.add(cls);
        } else if (force) {
          classes.add(cls);
        } else {
          classes.delete(cls);
        }
      }
    },

    setAttribute: (name, val) => attributes.set(name, String(val)),
    getAttribute: (name) => attributes.get(name) || null,
    hasAttribute: (name) => attributes.has(name),

    appendChild: (child) => {
      if (child && typeof child === 'object') {
        child.parentElement = el;
        children.push(child);
      }
      return child;
    },

    removeChild: (child) => {
      const idx = children.indexOf(child);
      if (idx !== -1) {
        children.splice(idx, 1);
        child.parentElement = null;
      }
      return child;
    },

    hasChildNodes: () => children.length > 0,
    remove: function () {
      if (this.parentElement && typeof this.parentElement.removeChild === 'function') {
        this.parentElement.removeChild(this);
      }
    },

    querySelector: (selector) => {
      const all = el.querySelectorAll(selector);
      return all.length > 0 ? all[0] : null;
    },

    querySelectorAll: (selector) => {
      const results = [];
      const matchSelector = (node, sel) => {
        if (sel.startsWith('.')) {
          const cls = sel.slice(1);
          return node.classList && node.classList.contains(cls);
        }
        if (sel.startsWith('#')) {
          const id = sel.slice(1);
          return node.getAttribute && node.getAttribute('id') === id;
        }
        return node.tagName === sel.toUpperCase();
      };

      const traverse = (node) => {
        for (const child of node.children) {
          if (matchSelector(child, selector)) {
            results.push(child);
          }
          traverse(child);
        }
      };

      traverse(el);
      return results;
    }
  };

  return el;
}

global.document = {
  createElement: createMockDomElement,
  getElementById: (id) => null,
  querySelectorAll: () => []
};


/**
 * Cria ambiente simulado de batalha com targets de animação e containers.
 */
function createTestHarness() {
  const registry = new PokemonAnimationRegistry();

  const playerContainer = createMockDomElement('div');
  const enemyContainer = createMockDomElement('div');
  const playerSprite = createMockDomElement('img');
  const enemySprite = createMockDomElement('img');

  playerContainer.setAttribute('id', 'playerCombatantTarget');
  enemyContainer.setAttribute('id', 'enemyCombatantTarget');
  playerContainer.appendChild(playerSprite);
  enemyContainer.appendChild(enemySprite);

  registry.register('player', {
    container: playerContainer,
    sprite: playerSprite,
    metadata: { id: 25, name: 'pikachu' }
  });

  registry.register('enemy', {
    container: enemyContainer,
    sprite: enemySprite,
    metadata: { id: 6, name: 'charizard' }
  });

  const controller = new PokemonStatusVfxController({ registry });

  return {
    registry,
    playerContainer,
    enemyContainer,
    playerSprite,
    enemySprite,
    controller
  };
}

describe('PHASE PBA-020 — STATUS CONDITIONS VISUAL EFFECTS SUITE (ST01–ST55)', () => {

  // ====================================================================
  // 1. CATÁLOGO, CONSTANTES E IDENTIDADES VISUAIS (ST01–ST13)
  // ====================================================================

  test('ST01 — Constants: STATUS_CONDITIONS define todas as 6 condições primárias canônicas', () => {
    assert.deepEqual(Object.values(STATUS_CONDITIONS).sort(), [
      'burn', 'freeze', 'paralysis', 'poison', 'sleep', 'toxic'
    ].sort());
  });

  test('ST02 — Constants: VOLATILE_CONDITIONS define confusão com camada independente', () => {
    assert.equal(VOLATILE_CONDITIONS.CONFUSION, 'confusion');
  });

  test('ST03 — Constants: STATUS_VFX_STATES define os estados de ciclo de vida', () => {
    assert.ok(STATUS_VFX_STATES.IDLE);
    assert.ok(STATUS_VFX_STATES.ENTRANCE);
    assert.ok(STATUS_VFX_STATES.PULSE_DAMAGE);
    assert.ok(STATUS_VFX_STATES.PULSE_IMMOBILIZED);
    assert.ok(STATUS_VFX_STATES.PULSE_CONFUSION_DAMAGE);
    assert.ok(STATUS_VFX_STATES.PULSE_CONFUSION_CHECK);
  });

  test('ST04 — Constants: STATUS_VFX_DURATIONS define durações não-negativas e 0 para reduced-motion', () => {
    assert.equal(STATUS_VFX_DURATIONS.ENTRANCE, 450);
    assert.equal(STATUS_VFX_DURATIONS.PULSE_DAMAGE, 450);
    assert.equal(STATUS_VFX_DURATIONS.PULSE_IMMOBILIZED, 450);
    assert.equal(STATUS_VFX_DURATIONS.REDUCED_MOTION, 0);
  });

  test('ST05 — Visual Identities: todas as 7 condições possuem rótulo, cor, descrição e formas', () => {
    const allConditions = [...Object.values(STATUS_CONDITIONS), VOLATILE_CONDITIONS.CONFUSION];
    for (const cond of allConditions) {
      const meta = STATUS_IDENTITIES[cond];
      assert.ok(meta, `Identidade para ${cond} deve existir`);
      assert.ok(meta.label && typeof meta.label === 'string', `${cond} deve ter label legível`);
      assert.ok(meta.color && meta.color.startsWith('#'), `${cond} deve ter cor hex primária`);
      assert.ok(meta.ambientColor, `${cond} deve ter ambientColor`);
      assert.ok(meta.description.length > 20, `${cond} deve ter descrição descritiva`);
      assert.ok(Array.isArray(meta.shapes) && meta.shapes.length > 0, `${cond} deve ter formas visuais`);
    }
  });

  test('ST06 — Visual Identities: Queimadura define chamas, brasas e pulso de combustão', () => {
    const burn = STATUS_IDENTITIES[STATUS_CONDITIONS.BURN];
    assert.equal(burn.hasDamagePulse, true);
    assert.equal(burn.hasImmobilizedHighlight, false);
    assert.ok(burn.shapes.includes('flame'));
    assert.ok(burn.shapes.includes('ember'));
  });

  test('ST07 — Visual Identities: Veneno define bolhas e névoa com pulso cáustico borbulhante', () => {
    const poison = STATUS_IDENTITIES[STATUS_CONDITIONS.POISON];
    assert.equal(poison.hasDamagePulse, true);
    assert.equal(poison.hasImmobilizedHighlight, false);
    assert.ok(poison.shapes.includes('bubble'));
    assert.ok(poison.shapes.includes('haze'));
  });

  test('ST08 — Visual Identities: Veneno Grave (Toxic) define miasma denso e glifos/espinhos pontiagudos', () => {
    const toxic = STATUS_IDENTITIES[STATUS_CONDITIONS.TOXIC];
    assert.equal(toxic.hasDamagePulse, true);
    assert.equal(toxic.hasImmobilizedHighlight, false);
    assert.ok(toxic.shapes.includes('miasma'));
    assert.ok(toxic.shapes.includes('toxic-spike'));
  });

  test('ST09 — Visual Identities: Paralisia define arcos elétricos amarelos e destaque de imobilização', () => {
    const para = STATUS_IDENTITIES[STATUS_CONDITIONS.PARALYSIS];
    assert.equal(para.hasDamagePulse, false);
    assert.equal(para.hasImmobilizedHighlight, true);
    assert.ok(para.shapes.includes('electric-arc'));
    assert.ok(para.shapes.includes('spark'));
  });

  test('ST10 — Visual Identities: Sono define respiração serena e Zs sem simular dano', () => {
    const sleep = STATUS_IDENTITIES[STATUS_CONDITIONS.SLEEP];
    assert.equal(sleep.hasDamagePulse, false);
    assert.equal(sleep.hasImmobilizedHighlight, true);
    assert.ok(sleep.shapes.includes('floating-z'));
    assert.ok(sleep.shapes.includes('breath-wave'));
  });

  test('ST11 — Visual Identities: Congelamento define cristais azulados e camada translúcida de gelo', () => {
    const freeze = STATUS_IDENTITIES[STATUS_CONDITIONS.FREEZE];
    assert.equal(freeze.hasDamagePulse, false);
    assert.equal(freeze.hasImmobilizedHighlight, true);
    assert.ok(freeze.shapes.includes('ice-crystal'));
    assert.ok(freeze.shapes.includes('frost-shell'));
  });

  test('ST12 — Visual Identities: Confusão define órbita elíptica de estrelas e espirais sobre a cabeça', () => {
    const conf = STATUS_IDENTITIES[VOLATILE_CONDITIONS.CONFUSION];
    assert.equal(conf.hasDamagePulse, true);
    assert.ok(conf.shapes.includes('orbit-star'));
    assert.ok(conf.shapes.includes('swirl'));
  });

  test('ST13 — Architecture: ADDITIONAL_ENGINE_CONDITIONS cataloga estados do motor existentes', () => {
    const keys = Object.keys(ADDITIONAL_ENGINE_CONDITIONS);
    assert.ok(keys.includes('DROWSY'));
    assert.ok(keys.includes('FLINCH'));
    assert.ok(keys.includes('PROTECT'));
    assert.ok(keys.includes('RECHARGE'));
    assert.ok(keys.includes('TWO_TURN_CHARGE'));
    assert.ok(keys.includes('BIDE'));
    assert.ok(keys.includes('BEAK_BLAST_SHELL_TRAP'));
    assert.ok(keys.includes('STAT_STAGES'));
    assert.ok(keys.includes('COMMANDER'));
  });

  // ====================================================================
  // 2. ISOLAMENTO DO SPRITE E CAMADA OVERLAY (ST14–ST17)
  // ====================================================================

  test('ST14 — Controller Exists: PokemonStatusVfxController pode ser instanciado via classe ou factory', () => {
    const ctrl1 = new PokemonStatusVfxController();
    const ctrl2 = createStatusVfxController();
    assert.ok(ctrl1 instanceof PokemonStatusVfxController);
    assert.ok(ctrl2 instanceof PokemonStatusVfxController);
  });

  test('ST15 — DOM Independence: estilos de transform, opacity e filter do sprite NUNCA são modificados', async () => {
    const { controller, playerSprite } = createTestHarness();
    playerSprite.style.transform = 'translateY(-10px) scale(1.1)';
    playerSprite.style.opacity = '0.9';
    playerSprite.style.filter = 'drop-shadow(0 4px 6px #000)';

    await controller.applyStatus('player', 'burn', { immediate: true });
    await controller.pulseDamage('player', 'burn');
    await controller.applyConfusion('player', { immediate: true });

    assert.equal(playerSprite.style.transform, 'translateY(-10px) scale(1.1)');
    assert.equal(playerSprite.style.opacity, '0.9');
    assert.equal(playerSprite.style.filter, 'drop-shadow(0 4px 6px #000)');
  });

  test('ST16 — Overlay Root: cria elemento .pba-status-vfx-root dentro do container com z-index independente', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'burn', { immediate: true });

    const root = playerContainer.querySelector('.pba-status-vfx-root');
    assert.ok(root, 'Container deve conter .pba-status-vfx-root');
    assert.equal(root.getAttribute('data-status-vfx-side'), 'player');
  });

  test('ST17 — Sub-layers: separa camadas de status primário e confusão', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'paralysis', { immediate: true });
    await controller.applyConfusion('player', { immediate: true });

    const root = playerContainer.querySelector('.pba-status-vfx-root');
    const primary = root.querySelector('.pba-status-primary');
    const confusion = root.querySelector('.pba-status-confusion');

    assert.ok(primary, 'Camada primária deve existir');
    assert.ok(confusion, 'Camada de confusão deve existir');
    assert.notEqual(primary, confusion);
  });

  // ====================================================================
  // 3. APLICAÇÃO E TEMPLATES DE CADA CONDIÇÃO PRIMÁRIA (ST18–ST25)
  // ====================================================================

  test('ST18 — Primary Burn: applyStatus monta template com chamas e brasas', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'burn', { immediate: true });

    const primary = playerContainer.querySelector('.pba-status-primary');
    assert.ok(primary.classList.contains('pba-status-burn'));
    assert.ok(playerContainer.querySelector('.pba-flame'));
    assert.ok(playerContainer.querySelector('.pba-ember'));
  });

  test('ST19 — Primary Poison: applyStatus monta template com névoa e bolhas roxas', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'poison', { immediate: true });

    const primary = playerContainer.querySelector('.pba-status-primary');
    assert.ok(primary.classList.contains('pba-status-poison'));
    assert.ok(playerContainer.querySelector('.pba-poison-haze'));
    assert.ok(playerContainer.querySelector('.pba-poison-bubble'));
  });

  test('ST20 — Primary Toxic: applyStatus monta template com miasma e espinhos de perigo', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'toxic', { immediate: true });

    const primary = playerContainer.querySelector('.pba-status-primary');
    assert.ok(primary.classList.contains('pba-status-toxic'));
    assert.ok(playerContainer.querySelector('.pba-toxic-miasma'));
    assert.ok(playerContainer.querySelector('.pba-toxic-spike'));
    assert.ok(playerContainer.querySelector('.pba-toxic-bubble'));
  });

  test('ST21 — Primary Paralysis: applyStatus monta template com arcos elétricos', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'paralysis', { immediate: true });

    const primary = playerContainer.querySelector('.pba-status-primary');
    assert.ok(primary.classList.contains('pba-status-paralysis'));
    assert.ok(playerContainer.querySelector('.pba-spark'));
  });

  test('ST22 — Primary Sleep: applyStatus monta template com respiração e símbolos Z', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'sleep', { immediate: true });

    const primary = playerContainer.querySelector('.pba-status-primary');
    assert.ok(primary.classList.contains('pba-status-sleep'));
    assert.ok(playerContainer.querySelector('.pba-sleep-breath'));
    assert.ok(playerContainer.querySelector('.pba-sleep-z'));
  });

  test('ST23 — Primary Freeze: applyStatus monta template com camada facetada e cristais', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'freeze', { immediate: true });

    const primary = playerContainer.querySelector('.pba-status-primary');
    assert.ok(primary.classList.contains('pba-status-freeze'));
    assert.ok(playerContainer.querySelector('.pba-freeze-shell'));
    assert.ok(playerContainer.querySelector('.pba-crystal'));
  });

  test('ST24 — Entrance Animation: applyStatus sem immediate adiciona classe .pba-status-entrance', () => {
    const { controller, playerContainer } = createTestHarness();
    controller.applyStatus('player', 'burn', { immediate: false });

    const primary = playerContainer.querySelector('.pba-status-primary');
    assert.ok(primary.classList.contains('pba-status-entrance'));
    controller.cancel();
  });

  test('ST25 — Immediate Option: applyStatus com immediate: true monta sem classe de entrada', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'burn', { immediate: true });

    const primary = playerContainer.querySelector('.pba-status-primary');
    assert.equal(primary.classList.contains('pba-status-entrance'), false);
  });

  // ====================================================================
  // 4. CURA E PULSOS VISUAIS DE EVENTOS (ST26–ST28)
  // ====================================================================

  test('ST26 — Cure Removal: removeStatus remove camada primária e desaloca root vazio', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'poison', { immediate: true });
    assert.ok(playerContainer.querySelector('.pba-status-primary'));

    controller.removeStatus('player');
    assert.equal(playerContainer.querySelector('.pba-status-primary'), null);
    assert.equal(playerContainer.querySelector('.pba-status-vfx-root'), null);
  });

  test('ST27 — Damage Pulse: pulseDamage adiciona e remove .pba-pulse-damage no dano residual', () => {
    const { controller, playerContainer } = createTestHarness();
    controller.applyStatus('player', 'burn', { immediate: true });
    controller.pulseDamage('player', 'burn');

    const primary = playerContainer.querySelector('.pba-status-primary');
    assert.ok(primary.classList.contains('pba-pulse-damage'));
    controller.cancel();
  });

  test('ST28 — Immobilized Pulse: pulseImmobilized adiciona .pba-pulse-immobilized para paralisia e sono', () => {
    const { controller, playerContainer } = createTestHarness();
    controller.applyStatus('player', 'paralysis', { immediate: true });
    controller.pulseImmobilized('player', 'paralysis');

    const primary = playerContainer.querySelector('.pba-status-primary');
    assert.ok(primary.classList.contains('pba-pulse-immobilized'));
    controller.cancel();
  });

  // ====================================================================
  // 5. CONFUSÃO E COEXISTÊNCIA VISUAL (ST29–ST35)
  // ====================================================================

  test('ST29 — Confusion Application: applyConfusion monta órbita, estrelas e espiral', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyConfusion('player', { immediate: true });

    const confusion = playerContainer.querySelector('.pba-status-confusion');
    assert.ok(confusion);
    assert.ok(playerContainer.querySelector('.pba-confusion-orbit'));
    assert.ok(playerContainer.querySelector('.pba-confusion-star'));
    assert.ok(playerContainer.querySelector('.pba-confusion-swirl'));
  });

  test('ST30 — Confusion Coexistence: Confusão e Queimadura coexistem visualmente no mesmo alvo', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'burn', { immediate: true });
    await controller.applyConfusion('player', { immediate: true });

    const root = playerContainer.querySelector('.pba-status-vfx-root');
    assert.ok(root.querySelector('.pba-status-burn'));
    assert.ok(root.querySelector('.pba-status-confusion'));
    assert.ok(playerContainer.querySelector('.pba-flame'));
    assert.ok(playerContainer.querySelector('.pba-confusion-star'));
  });

  test('ST31 — Confusion Coexistence: Confusão e Sono coexistem simultaneamente', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'sleep', { immediate: true });
    await controller.applyConfusion('player', { immediate: true });

    assert.ok(playerContainer.querySelector('.pba-sleep-z'));
    assert.ok(playerContainer.querySelector('.pba-confusion-star'));
  });

  test('ST32 — Confusion Isolation: curar status primário preserva confusão', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'burn', { immediate: true });
    await controller.applyConfusion('player', { immediate: true });

    controller.removeStatus('player');
    assert.equal(playerContainer.querySelector('.pba-status-primary'), null);
    assert.ok(playerContainer.querySelector('.pba-status-confusion'));
  });

  test('ST33 — Confusion Isolation: encerrar confusão preserva status primário', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'freeze', { immediate: true });
    await controller.applyConfusion('player', { immediate: true });

    controller.removeConfusion('player');
    assert.ok(playerContainer.querySelector('.pba-status-primary'));
    assert.equal(playerContainer.querySelector('.pba-status-confusion'), null);
  });

  test('ST34 — Confusion Check: pulseConfusionCheck adiciona classe de oscilação', () => {
    const { controller, playerContainer } = createTestHarness();
    controller.applyConfusion('player', { immediate: true });
    controller.pulseConfusionCheck('player');

    const confusion = playerContainer.querySelector('.pba-status-confusion');
    assert.ok(confusion.classList.contains('pba-pulse-confusion-check'));
    controller.cancel();
  });

  test('ST35 — Confusion Damage: pulseConfusionDamage adiciona classe de dispersão de estrelas', () => {
    const { controller, playerContainer } = createTestHarness();
    controller.applyConfusion('player', { immediate: true });
    controller.pulseConfusionDamage('player');

    const confusion = playerContainer.querySelector('.pba-status-confusion');
    assert.ok(confusion.classList.contains('pba-pulse-confusion-damage'));
    controller.cancel();
  });

  // ====================================================================
  // 6. CICLO DE VIDA, TROCAS, NOCAUTE E DUPLAS (ST36–ST40)
  // ====================================================================

  test('ST36 — Switch Sequence: troca limpa Pokémon saindo e restaura imediatamente o Pokémon entrando', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'burn', { immediate: true });
    assert.ok(playerContainer.querySelector('.pba-status-burn'));

    // Switch out
    controller.clear('player');
    assert.equal(playerContainer.querySelector('.pba-status-vfx-root'), null);

    // Switch in com novo combatente envenenado
    const incomingMon = { id: 1, name: 'bulbasaur', currentHp: 50, statusCondition: 'poison' };
    controller.syncFromCombatant('player', incomingMon, { immediate: true });

    assert.ok(playerContainer.querySelector('.pba-status-poison'));
    assert.equal(playerContainer.querySelector('.pba-status-primary').classList.contains('pba-status-entrance'), false);
  });

  test('ST37 — Faint Sequence: nocaute limpa imediatamente o status do slot fainted', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'toxic', { immediate: true });
    assert.ok(playerContainer.querySelector('.pba-status-toxic'));

    controller.clear('player');
    assert.equal(playerContainer.querySelector('.pba-status-vfx-root'), null);
  });

  test('ST38 — Screen Rebuild: syncFromBattleState restaura estado sem disparar animação de entrada', async () => {
    const { controller, playerContainer, enemyContainer } = createTestHarness();

    const battleState = {
      battleFormat: 'SINGLES',
      player: {
        activeIndex: 0,
        team: [{ id: 25, currentHp: 80, statusCondition: 'paralysis' }]
      },
      enemy: {
        activeIndex: 0,
        team: [{ id: 6, currentHp: 100, statusCondition: 'burn', confusionTurns: 2 }]
      }
    };

    controller.syncFromBattleState(battleState);

    assert.ok(playerContainer.querySelector('.pba-status-paralysis'));
    assert.ok(enemyContainer.querySelector('.pba-status-burn'));
    assert.ok(enemyContainer.querySelector('.pba-status-confusion'));
  });

  test('ST39 — Doubles Isolation: 4 posições ativas mantêm isolamento rigoroso de status', async () => {
    const registry = new PokemonAnimationRegistry();
    const duo0P = createMockDomElement('div');
    const duo1P = createMockDomElement('div');
    const duo0E = createMockDomElement('div');
    const duo1E = createMockDomElement('div');

    registry.register('player:0', { container: duo0P });
    registry.register('player:1', { container: duo1P });
    registry.register('enemy:0', { container: duo0E });
    registry.register('enemy:1', { container: duo1E });

    const controller = new PokemonStatusVfxController({ registry });

    const doublesState = {
      battleFormat: 'DOUBLES',
      player: {
        activeIndices: [0, 1],
        team: [
          { id: 1, currentHp: 50, statusCondition: 'burn' },
          { id: 2, currentHp: 60, statusCondition: null }
        ]
      },
      enemy: {
        activeIndices: [0, 1],
        team: [
          { id: 3, currentHp: 70, statusCondition: 'freeze' },
          { id: 4, currentHp: 80, statusCondition: null, confusionTurns: 3 }
        ]
      }
    };

    controller.syncFromBattleState(doublesState);

    assert.ok(duo0P.querySelector('.pba-status-burn'), 'player:0 deve ter burn');
    assert.equal(duo1P.querySelector('.pba-status-vfx-root'), null, 'player:1 não deve ter status');
    assert.ok(duo0E.querySelector('.pba-status-freeze'), 'enemy:0 deve ter freeze');
    assert.equal(duo1E.querySelector('.pba-status-primary'), null, 'enemy:1 não deve ter primário');
    assert.ok(duo1E.querySelector('.pba-status-confusion'), 'enemy:1 deve ter confusão');
  });

  test('ST40 — Full Composite Integration: CompositeBattleDomAdapter delega comandos de status corretamente', async () => {
    const { registry, playerContainer } = createTestHarness();
    const adapter = new CompositeBattleDomAdapter({ registry });

    assert.ok(adapter.statusController, 'Adapter deve instanciar statusController');

    // 1. Aplicação de queimadura
    await adapter.execute({
      type: PRESENTATION_COMMANDS.STATUS_FEEDBACK,
      target: 'player',
      statusCondition: 'burn',
      outcome: 'APPLIED'
    });
    assert.ok(playerContainer.querySelector('.pba-status-burn'));

    // 2. Pulso de dano residual
    await adapter.execute({
      type: PRESENTATION_COMMANDS.STATUS_FEEDBACK,
      target: 'player',
      statusCondition: 'burn',
      outcome: 'DAMAGE',
      damage: 12
    });

    // 3. Aplicação de confusão coexistente
    await adapter.execute({
      type: PRESENTATION_COMMANDS.CONFUSION_FEEDBACK,
      target: 'player',
      outcome: 'APPLIED'
    });
    assert.ok(playerContainer.querySelector('.pba-status-confusion'));

    // 4. Cura de queimadura
    await adapter.execute({
      type: PRESENTATION_COMMANDS.STATUS_FEEDBACK,
      target: 'player',
      statusCondition: 'burn',
      outcome: 'CURED'
    });
    assert.equal(playerContainer.querySelector('.pba-status-burn'), null);
    assert.ok(playerContainer.querySelector('.pba-status-confusion'));

    // 5. Encerramento de confusão
    await adapter.execute({
      type: PRESENTATION_COMMANDS.CONFUSION_FEEDBACK,
      target: 'player',
      outcome: 'ENDED'
    });
    assert.equal(playerContainer.querySelector('.pba-status-confusion'), null);
  });

  // ====================================================================
  // 5. PERSISTÊNCIA MULTI-TURNO E CICLO DE VIDA (ST41–ST55)
  // ====================================================================

  test('ST41 — Immediate Persistence: efeito está presente imediatamente após aplicação', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'burn', { immediate: false });

    const root = playerContainer.querySelector('.pba-status-vfx-root');
    assert.ok(root, 'Root container deve existir imediatamente');
    const burn = playerContainer.querySelector('.pba-status-burn');
    assert.ok(burn, 'Elemento de burn deve existir imediatamente');
    assert.ok(playerContainer.querySelector('.pba-burn-flames'), 'Chamas devem estar renderizadas imediatamente');
  });

  test('ST42 — Post-Entrance Persistence: efeito permanece ativo após término da animação de entrada', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'burn', { immediate: false });

    const burnEl = playerContainer.querySelector('.pba-status-burn');
    assert.ok(burnEl, 'Burn deve existir');
    assert.equal(controller.getStatus('player'), 'burn');
    assert.equal(controller.getState('player'), STATUS_VFX_STATES.IDLE);
    assert.ok(playerContainer.querySelector('.pba-status-burn'), 'Efeito contínuo de burn deve permanecer visível após entrada');
    assert.equal(burnEl.classList.contains('pba-status-entrance'), false, 'Classe de entrada temporária deve ter sido removida');
  });

  test('ST43 — Turn Transition Persistence: syncFromBattleState restaura o efeito contínuo após reconstrução do DOM', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'burn', { immediate: true });
    assert.ok(playerContainer.querySelector('.pba-status-burn'));

    // Simula reconstrução de tela no final do turno: container anterior é desconectado
    playerContainer.isConnected = false;
    const newPlayerContainer = createMockDomElement('div');
    newPlayerContainer.setAttribute('id', 'playerCombatantTarget');
    newPlayerContainer.isConnected = true;

    global.document.getElementById = (id) => {
      if (id === 'playerCombatantTarget') return newPlayerContainer;
      return null;
    };

    const battleState = {
      battleFormat: 'SINGLES',
      player: {
        activeIndex: 0,
        team: [{ id: 25, currentHp: 75, statusCondition: 'burn' }]
      },
      enemy: {
        activeIndex: 0,
        team: [{ id: 6, currentHp: 100, statusCondition: null }]
      }
    };

    controller.syncFromBattleState(battleState);

    assert.ok(newPlayerContainer.querySelector('.pba-status-burn'), 'Novo nó do DOM deve conter o efeito contínuo de burn');
    assert.equal(controller.getStatus('player'), 'burn');

    global.document.getElementById = () => null;
  });

  test('ST44 — Multi-turn Continuity: efeito persiste intacto por múltiplos turnos consecutivos', async () => {
    const { controller, playerContainer } = createTestHarness();
    const battleState = {
      battleFormat: 'SINGLES',
      player: {
        activeIndex: 0,
        team: [{ id: 25, currentHp: 100, statusCondition: 'poison' }]
      },
      enemy: {
        activeIndex: 0,
        team: [{ id: 6, currentHp: 100, statusCondition: null }]
      }
    };

    for (let turn = 1; turn <= 5; turn++) {
      battleState.player.team[0].currentHp -= 6;
      controller.syncFromBattleState(battleState);

      const poisonEl = playerContainer.querySelector('.pba-status-poison');
      assert.ok(poisonEl, 'Poison deve permanecer visível no turno ' + turn);
      assert.equal(controller.getStatus('player'), 'poison');
      assert.equal(controller.getState('player'), STATUS_VFX_STATES.IDLE);
    }
  });

  test('ST45 — Persistence Through Physical Attack: efeito contínuo não é afetado por playAttack', async () => {
    const { registry, playerContainer } = createTestHarness();
    const animController = new PokemonAnimationController({ registry });
    const statusController = new PokemonStatusVfxController({ registry });

    await statusController.applyStatus('player', 'paralysis', { immediate: true });
    assert.ok(playerContainer.querySelector('.pba-status-paralysis'));

    await animController.playAttack('player');

    const paralysisEl = playerContainer.querySelector('.pba-status-paralysis');
    assert.ok(paralysisEl, 'Paralisia deve permanecer visível após ataque');
    assert.equal(statusController.getStatus('player'), 'paralysis');
  });

  test('ST46 — Persistence Through Damage Reaction: efeito contínuo sobrevive à animação de hit', async () => {
    const { registry, enemyContainer } = createTestHarness();
    const animController = new PokemonAnimationController({ registry });
    const statusController = new PokemonStatusVfxController({ registry });

    await statusController.applyStatus('enemy', 'burn', { immediate: true });
    assert.ok(enemyContainer.querySelector('.pba-status-burn'));

    await animController.playDamageReaction('enemy');

    assert.ok(enemyContainer.querySelector('.pba-status-burn'), 'Chamas devem permanecer visíveis após reação de dano');
    assert.equal(statusController.getStatus('enemy'), 'burn');
  });

  test('ST47 — Residual Damage Pulse & Return to Idle: pulso temporário não destrói efeito contínuo', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'burn', { immediate: true });
    const primaryEl = playerContainer.querySelector('.pba-status-primary');

    await controller.pulseDamage('player');

    assert.equal(primaryEl.classList.contains('pba-pulse-damage'), false, 'Classe de pulso deve ser removida');
    assert.ok(playerContainer.querySelector('.pba-status-burn'), 'Efeito contínuo de burn deve continuar ativo');
    assert.equal(controller.getState('player'), STATUS_VFX_STATES.IDLE);
  });

  test('ST48 — Immobilization Pulse & Continuous State: pulso elétrico temporário mantém paralisia contínua', async () => {
    const { controller, playerContainer } = createTestHarness();
    await controller.applyStatus('player', 'paralysis', { immediate: true });
    const primaryEl = playerContainer.querySelector('.pba-status-primary');

    await controller.pulseImmobilized('player');

    assert.equal(primaryEl.classList.contains('pba-pulse-immobilized'), false, 'Classe de imobilização deve ser removida');
    assert.ok(playerContainer.querySelector('.pba-status-paralysis'), 'Faíscas contínua devem permanecer');
    assert.equal(controller.getState('player'), STATUS_VFX_STATES.IDLE);
  });

  test('ST49 — Removal Only On True Cure: condição só é removida quando a engine informa cura', async () => {
    const { controller, playerContainer } = createTestHarness();
    const battleState = {
      battleFormat: 'SINGLES',
      player: {
        activeIndex: 0,
        team: [{ id: 25, currentHp: 80, statusCondition: 'toxic' }]
      },
      enemy: {
        activeIndex: 0,
        team: [{ id: 6, currentHp: 100, statusCondition: null }]
      }
    };

    controller.syncFromBattleState(battleState);
    assert.ok(playerContainer.querySelector('.pba-status-toxic'), 'Toxic ativo');

    controller.syncFromBattleState(battleState);
    assert.ok(playerContainer.querySelector('.pba-status-toxic'), 'Toxic ainda ativo no turno seguinte');

    battleState.player.team[0].statusCondition = null;
    controller.syncFromBattleState(battleState);

    assert.equal(playerContainer.querySelector('.pba-status-toxic'), null, 'Toxic removido somente após cura na engine');
    assert.equal(controller.getStatus('player'), null);
  });

  test('ST50 — Restoration On Switch-In: Pokémon com status trocado para reserva restaura efeito ao retornar ao campo', async () => {
    const { controller, playerContainer } = createTestHarness();
    const battleState = {
      battleFormat: 'SINGLES',
      player: {
        activeIndex: 0,
        team: [
          { id: 25, currentHp: 50, statusCondition: 'sleep' },
          { id: 133, currentHp: 100, statusCondition: null }
        ]
      },
      enemy: {
        activeIndex: 0,
        team: [{ id: 6, currentHp: 100, statusCondition: null }]
      }
    };

    controller.syncFromBattleState(battleState);
    assert.ok(playerContainer.querySelector('.pba-status-sleep'), 'Pikachu deve mostrar efeito de sono');

    battleState.player.activeIndex = 1;
    controller.syncFromBattleState(battleState);
    assert.equal(playerContainer.querySelector('.pba-status-sleep'), null, 'Eevee saudável não tem sono');
    assert.equal(playerContainer.querySelector('.pba-status-primary'), null);

    battleState.player.activeIndex = 0;
    controller.syncFromBattleState(battleState);
    assert.ok(playerContainer.querySelector('.pba-status-sleep'), 'Pikachu restaura o efeito contínuo de sono');
    assert.equal(controller.getStatus('player'), 'sleep');
  });

  test('ST51 — Confusion Coexistence & Independent Lifecycles: confusão e primário persistem e expiram de forma independente', async () => {
    const { controller, enemyContainer } = createTestHarness();
    const battleState = {
      battleFormat: 'SINGLES',
      player: { activeIndex: 0, team: [{ id: 25, currentHp: 100, statusCondition: null }] },
      enemy: {
        activeIndex: 0,
        team: [{ id: 6, currentHp: 100, statusCondition: 'burn', confusionTurns: 3 }]
      }
    };

    controller.syncFromBattleState(battleState);
    assert.ok(enemyContainer.querySelector('.pba-status-burn'), 'Burn deve estar presente');
    assert.ok(enemyContainer.querySelector('.pba-status-confusion'), 'Confusão deve estar presente');

    battleState.enemy.team[0].confusionTurns = 1;
    controller.syncFromBattleState(battleState);
    assert.ok(enemyContainer.querySelector('.pba-status-burn'), 'Burn persiste');
    assert.ok(enemyContainer.querySelector('.pba-status-confusion'), 'Confusão persiste');

    battleState.enemy.team[0].confusionTurns = 0;
    controller.syncFromBattleState(battleState);
    assert.ok(enemyContainer.querySelector('.pba-status-burn'), 'Burn deve permanecer contínuo');
    assert.equal(enemyContainer.querySelector('.pba-status-confusion'), null, 'Confusão deve ser removida');

    battleState.enemy.team[0].statusCondition = null;
    controller.syncFromBattleState(battleState);
    assert.equal(enemyContainer.querySelector('.pba-status-burn'), null, 'Burn removido após cura');
  });

  test('ST52 — Doubles Multi-Turn Independence: 4 combatentes mantêm estados persistentes independentes através dos turnos', async () => {
    const registry = new PokemonAnimationRegistry();
    const cP0 = createMockDomElement('div');
    const cP1 = createMockDomElement('div');
    const cE0 = createMockDomElement('div');
    const cE1 = createMockDomElement('div');

    registry.register('player:0', { container: cP0 });
    registry.register('player:1', { container: cP1 });
    registry.register('enemy:0', { container: cE0 });
    registry.register('enemy:1', { container: cE1 });

    const controller = new PokemonStatusVfxController({ registry });

    const doublesState = {
      battleFormat: 'DOUBLES',
      player: {
        activeIndices: [0, 1],
        team: [
          { id: 1, currentHp: 50, statusCondition: 'burn' },
          { id: 2, currentHp: 60, statusCondition: null }
        ]
      },
      enemy: {
        activeIndices: [0, 1],
        team: [
          { id: 3, currentHp: 70, statusCondition: 'paralysis', confusionTurns: 2 },
          { id: 4, currentHp: 80, statusCondition: 'freeze' }
        ]
      }
    };

    controller.syncFromBattleState(doublesState);
    assert.ok(cP0.querySelector('.pba-status-burn'), 'P0 deve ter burn');
    assert.equal(cP1.querySelector('.pba-status-vfx-root'), null, 'P1 limpo');
    assert.ok(cE0.querySelector('.pba-status-paralysis'), 'E0 deve ter paralysis');
    assert.ok(cE0.querySelector('.pba-status-confusion'), 'E0 deve ter confusion');
    assert.ok(cE1.querySelector('.pba-status-freeze'), 'E1 deve ter freeze');

    doublesState.enemy.team[1].statusCondition = null;
    controller.syncFromBattleState(doublesState);

    assert.ok(cP0.querySelector('.pba-status-burn'), 'P0 continua com burn');
    assert.equal(cP1.querySelector('.pba-status-vfx-root'), null, 'P1 permanece limpo');
    assert.ok(cE0.querySelector('.pba-status-paralysis'), 'E0 continua com paralysis');
    assert.ok(cE0.querySelector('.pba-status-confusion'), 'E0 continua com confusion');
    assert.equal(cE1.querySelector('.pba-status-freeze'), null, 'E1 não tem mais freeze');
  });

  test('ST53 — Complete Cleanup on Knockout or Reset: nocaute e encerramento limpam nós DOM sem deixar órfãos', async () => {
    const { controller, playerContainer, enemyContainer } = createTestHarness();
    await controller.applyStatus('player', 'burn', { immediate: true });
    await controller.applyConfusion('player', { immediate: true });
    await controller.applyStatus('enemy', 'freeze', { immediate: true });

    assert.ok(playerContainer.querySelector('.pba-status-burn'));
    assert.ok(playerContainer.querySelector('.pba-status-confusion'));
    assert.ok(enemyContainer.querySelector('.pba-status-freeze'));

    controller.clear('player');
    assert.equal(playerContainer.querySelector('.pba-status-vfx-root'), null, 'Root do player deve ser completamente removido no nocaute');
    assert.equal(controller.getStatus('player'), null);
    assert.equal(controller.hasConfusion('player'), false);

    assert.ok(enemyContainer.querySelector('.pba-status-freeze'));

    controller.reset();
    assert.equal(enemyContainer.querySelector('.pba-status-vfx-root'), null, 'Root do enemy deve ser removido no reset geral');
    assert.equal(controller.getStatus('enemy'), null);
  });

  test('ST54 — Idempotent Multi-Turn Rerender: re-renderizações sucessivas não duplicam elementos nem reiniciam o template', async () => {
    const { controller, playerContainer } = createTestHarness();
    const battleState = {
      battleFormat: 'SINGLES',
      player: { activeIndex: 0, team: [{ id: 25, currentHp: 50, statusCondition: 'burn' }] },
      enemy: { activeIndex: 0, team: [{ id: 6, currentHp: 100, statusCondition: null }] }
    };

    controller.syncFromBattleState(battleState);
    const root1 = playerContainer.querySelector('.pba-status-vfx-root');
    const primary1 = playerContainer.querySelector('.pba-status-primary');
    assert.ok(root1);
    assert.ok(primary1);

    for (let i = 0; i < 4; i++) {
      controller.syncFromBattleState(battleState);
    }

    const roots = playerContainer.querySelectorAll('.pba-status-vfx-root');
    assert.equal(roots.length, 1, 'Deve existir exatamente 1 root');
    const primaries = playerContainer.querySelectorAll('.pba-status-primary');
    assert.equal(primaries.length, 1, 'Deve existir exatamente 1 primary');
    assert.equal(playerContainer.querySelector('.pba-status-primary'), primary1);
  });

  test('ST55 — Reduced Motion Persistence: representação visual persiste estática em modo de movimento reduzido', async () => {
    const { registry, playerContainer } = createTestHarness();
    const controller = new PokemonStatusVfxController({
      registry,
      reducedMotion: true
    });

    const battleState = {
      battleFormat: 'SINGLES',
      player: {
        activeIndex: 0,
        team: [{ id: 25, currentHp: 80, statusCondition: 'paralysis', confusionTurns: 2 }]
      },
      enemy: {
        activeIndex: 0,
        team: [{ id: 6, currentHp: 100, statusCondition: null }]
      }
    };

    controller.syncFromBattleState(battleState);

    const root = playerContainer.querySelector('.pba-status-vfx-root');
    assert.ok(root, 'Root deve existir');
    assert.ok(root.classList.contains('pba-status-reduced-motion'), 'Deve conter classe pba-status-reduced-motion');
    assert.ok(playerContainer.querySelector('.pba-status-paralysis'), 'Indicador de paralisia persiste');
    assert.ok(playerContainer.querySelector('.pba-status-confusion'), 'Indicador de confusão persiste');

    controller.syncFromBattleState(battleState);
    assert.ok(playerContainer.querySelector('.pba-status-paralysis'), 'Indicador persiste através do turno em reduced motion');
  });

});
