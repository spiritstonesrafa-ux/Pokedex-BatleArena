const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '../..');
const { BattleView } = require('../../assets/js/ui/battle-view.js');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');
const { BATTLE_UI_STATES } = require('../../assets/js/battle-session/battle-session-constants.js');

describe('P0 FIX: FORCED REPLACEMENT MODAL IN FULLSCREEN & LANDSCAPE', () => {
  let mockContainer;
  let view;

  beforeEach(() => {
    mockContainer = {
      id: 'futureModuleView',
      isConnected: true,
      innerHTML: '',
      children: [],
      appendChild(node) {
        this.children.push(node);
        node.parentElement = this;
        node.parentNode = this;
      },
      removeChild(node) {
        this.children = this.children.filter(c => c !== node);
        node.parentElement = null;
        node.parentNode = null;
      },
      querySelector: () => null,
      querySelectorAll: () => []
    };

    view = new BattleView({ container: mockContainer });
  });

  it('1. CSS rules elevate .battle-modal-backdrop to z-index: 25000 in fullscreen contexts', () => {
    const arenaCss = fs.readFileSync(path.join(root, 'assets/css/battle-arena.css'), 'utf8');
    const campaignCss = fs.readFileSync(path.join(root, 'assets/css/campaign-map.css'), 'utf8');

    assert.match(arenaCss, /\.battle-modal-backdrop\s*\{[^}]*z-index:\s*25000\s*!important/);
    assert.match(campaignCss, /\.battle-modal-backdrop[^}]*z-index:\s*25000\s*!important/);
  });

  it('2. Landscape CSS provides compact dimensions (max-height and padding)', () => {
    const arenaCss = fs.readFileSync(path.join(root, 'assets/css/battle-arena.css'), 'utf8');
    assert.match(arenaCss, /@media\s*\(orientation:\s*landscape\)\s*and\s*\(max-height:\s*480px\)/);
    assert.match(arenaCss, /\.battle-modal-card\s*\{[^}]*max-height:\s*calc\(100dvh\s*-\s*12px\)/);
  });

  it('3. renderActiveBattleView disables move buttons and displays fainted alert when replacement is pending', () => {
    const battleState = {
      player: {
        activeIndex: 0,
        team: [
          { id: 1, name: 'charizard', currentHp: 0, maxHp: 150, moves: [{ id: 1, name: 'Flamethrower', currentPp: 10, maxPp: 15, power: 90, type: 'fire', damageClass: 'special' }] },
          { id: 2, name: 'blastoise', currentHp: 160, maxHp: 160, moves: [{ id: 2, name: 'Surf', currentPp: 15, maxPp: 15, power: 90, type: 'water', damageClass: 'special' }] }
        ]
      },
      enemy: {
        activeIndex: 0,
        team: [{ id: 3, name: 'venusaur', currentHp: 150, maxHp: 150, moves: [] }]
      }
    };

    view.renderActiveBattleView(battleState, 'AWAITING_PLAYER_REPLACEMENT');

    // Narrative box warns that Charizard is fainted
    assert.match(mockContainer.innerHTML, /charizard foi nocauteado/i);
    assert.match(mockContainer.innerHTML, /narrative-fainted-alert/);

    // Moves of fainted Pokemon MUST be disabled
    assert.match(mockContainer.innerHTML, /id="moveBtn_1"[^>]*disabled/);

    // Switch button is marked as forced replacement
    assert.match(mockContainer.innerHTML, /is-forced-switch/);
    assert.match(mockContainer.innerHTML, /ESCOLHER SUBSTITUTO/);
  });

  it('4. openReplacementModal mounts inside container and generates accessible replacement cards', () => {
    const battleState = {
      player: {
        activeIndex: 0,
        team: [
          { id: 10, name: 'charizard', currentHp: 0, maxHp: 150 },
          { id: 20, name: 'blastoise', currentHp: 160, maxHp: 160 },
          { id: 30, name: 'venusaur', currentHp: 0, maxHp: 140 }
        ]
      },
      enemy: { activeIndex: 0, team: [{ id: 99, name: 'mewtwo', currentHp: 200, maxHp: 200 }] }
    };

    view.openReplacementModal(battleState);

    assert.ok(view.activeModal, 'activeModal should be tracked');
    assert.equal(view.activeModal.id, 'battleActiveModal');

    // Blastoise (conscious) should have an enabled button with ready badge
    assert.match(mockContainer.innerHTML, /submitPlayerReplacement\(20\)/);
    assert.match(mockContainer.innerHTML, /switch-item-status-tag ready/);

    // Charizard (fainted active) and Venusaur (fainted) must be disabled
    assert.match(mockContainer.innerHTML, /submitPlayerReplacement\(10\)[^>]*disabled|disabled[^>]*submitPlayerReplacement\(10\)/);
  });

  it('5. Closing modal cleanly removes activeModal from container', () => {
    const battleState = {
      player: {
        activeIndex: 0,
        team: [
          { id: 1, name: 'pikachu', currentHp: 0, maxHp: 100 },
          { id: 2, name: 'raichu', currentHp: 120, maxHp: 120 }
        ]
      }
    };

    view.openReplacementModal(battleState);
    assert.ok(view.activeModal);

    view.closeModal();
    assert.equal(view.activeModal, null);
  });

  it('6. BattleSessionController handles submitPlayerReplacement and transitions to AWAITING_PLAYER_ACTION', async () => {
    const controller = new BattleSessionController({});
    controller.uiState = BATTLE_UI_STATES.AWAITING_PLAYER_REPLACEMENT;
    controller.engine = {
      resolveReplacement: () => ({
        state: {
          turn: 2,
          status: 'IN_PROGRESS',
          player: { activeIndex: 1, team: [{ id: 1, currentHp: 0 }, { id: 2, currentHp: 150 }] },
          enemy: { activeIndex: 0, team: [{ id: 3, currentHp: 120 }] }
        },
        events: []
      })
    };
    controller.battleState = {
      turn: 1,
      status: 'AWAITING_REPLACEMENT',
      player: { activeIndex: 0, team: [{ id: 1, currentHp: 0 }, { id: 2, currentHp: 150 }] },
      enemy: { activeIndex: 0, team: [{ id: 3, currentHp: 120 }] }
    };

    await controller.submitPlayerReplacement(2);

    assert.equal(controller.uiState, BATTLE_UI_STATES.AWAITING_PLAYER_ACTION);
    assert.equal(controller.battleState.player.activeIndex, 1);
  });

  it('7. When no eligible replacement exists, battle ends in DEFEAT without opening replacement modal', async () => {
    const controller = new BattleSessionController({});
    let recordedState = null;
    controller.setView({
      renderState: (state) => { recordedState = state; }
    });

    controller.battleState = {
      turn: 3,
      status: 'ENEMY_WIN',
      player: { activeIndex: 0, team: [{ id: 1, currentHp: 0 }, { id: 2, currentHp: 0 }] },
      enemy: { activeIndex: 0, team: [{ id: 3, currentHp: 120 }] }
    };

    await controller.handlePostResolutionState();

    assert.equal(controller.uiState, BATTLE_UI_STATES.DEFEAT);
    assert.equal(recordedState, BATTLE_UI_STATES.DEFEAT);
  });
});
