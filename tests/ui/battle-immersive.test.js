const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BattleView } = require('../../assets/js/ui/battle-view.js');
const { BattleSessionController } = require('../../assets/js/battle-session/battle-session-controller.js');

const root = path.resolve(__dirname, '../..');
const css = fs.readFileSync(path.join(root, 'assets/css/battle-arena.css'), 'utf8');
const viewSource = fs.readFileSync(path.join(root, 'assets/js/ui/battle-view.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

describe('PBA-014D — IMMERSIVE BATTLE VIEW', () => {
  it('UX01–UX04 — immersive mode lives in the same SPA and UI layer', () => {
    assert.match(viewSource, /setImmersiveMode/);
    assert.match(indexSource, /id="futureModuleView"/);
    assert.doesNotMatch(indexSource, /battle\.html/);
    assert.match(viewSource, /AWAITING_PLAYER_ACTION.*RESOLVING.*VICTORY.*DEFEAT/s);
  });

  it('UX05–UX10 — header/footer hide and body scroll lock is reversible', () => {
    assert.match(css, /body\.battle-immersive-active \.header/);
    assert.match(css, /body\.battle-immersive-active \.footer/);
    assert.match(css, /overflow: hidden/);
    assert.match(viewSource, /classList\.remove\('battle-immersive-active'\)/);
  });

  it('UX11–UX12 — dynamic viewport and safe-area insets are supported', () => {
    assert.match(css, /100dvh/);
    assert.match(css, /env\(safe-area-inset-top\)/);
    assert.match(css, /env\(safe-area-inset-bottom\)/);
  });

  it('UX13–UX20 — desktop two-zone layout and mobile 2x2 moves are explicit', () => {
    assert.match(css, /grid-template-areas:[\s\S]*"stage enemy"/);
    assert.match(css, /@media \(max-width: 760px\)/);
    assert.match(css, /\.battle-immersive-shell \.moves-action-grid \{ grid-template-columns: repeat\(2/);
    assert.match(viewSource, /moves-action-grid/);
  });

  it('UX21–UX25 — switch, results and exit cleanup controls remain connected', () => {
    assert.match(viewSource, /id="btnOpenSwitch"/);
    assert.match(viewSource, /openReplacementModal/);
    assert.match(viewSource, /requestExitBattle/);
    assert.match(viewSource, /btnRematch/);
    assert.match(viewSource, /btnBackToBattle/);
  });

  it('exit confirmation rejects accidental abandonment without mutating the session', () => {
    const originalWindow = global.window;
    global.window = { confirm: () => false };
    let abandoned = 0;
    const view = new BattleView({ container: {}, sessionController: { uiState: 'AWAITING_PLAYER_ACTION', abandonBattle: () => abandoned++ } });
    assert.equal(view.requestExitBattle(), false);
    assert.equal(abandoned, 0);
    global.window = originalWindow;
  });

  it('leaveBattle cancels presentation and restores immersive UI state', () => {
    let cancelCount = 0;
    let resetCount = 0;
    let immersive = true;
    const controller = new BattleSessionController({
      teamStore: { load: () => [] },
      presentationEngine: { cancel: () => cancelCount++, reset: () => resetCount++ },
      compositeAdapter: { cancel: () => cancelCount++, reset: () => resetCount++ },
      view: { closeModal() {}, setImmersiveMode: active => { immersive = active; } },
      randomSource: {},
      hydrator: {},
      opponentFactory: {}
    });
    controller.battleState = { id: 'active' };
    controller.leaveBattle();
    assert.equal(cancelCount, 2);
    assert.equal(resetCount, 2);
    assert.equal(immersive, false);
    assert.equal(controller.battleState, null);
  });

  it('UX26–UX30 — fullscreen controller and interactive toggle button', () => {
    assert.match(viewSource, /id="btnToggleFullscreen"/);
    assert.match(viewSource, /toggleFullscreen/);
    assert.match(viewSource, /enterPseudoFullscreen/);
    assert.match(viewSource, /exitPseudoFullscreen/);
    assert.match(viewSource, /updateFullscreenButton/);
    assert.match(css, /battle-fullscreen-toggle-btn/);
    assert.match(css, /html.battle-fullscreen-mode/);
    assert.match(css, /body.battle-fullscreen-mode/);
  });

  it('UX31–UX35 — collapsible field conditions and abilities drawer', () => {
    assert.match(viewSource, /id="battleFieldDrawer"/);
    assert.match(viewSource, /id="battleFieldBackdrop"/);
    assert.match(viewSource, /id="btnToggleFieldInfo"/);
    assert.match(viewSource, /toggleFieldDrawer/);
    assert.match(css, /.battle-field-drawer/);
    assert.match(css, /.battle-field-backdrop/);
    assert.match(css, /.btn-field-info-toggle/);
  });

  it('UX36–UX40 — responsive mobile layout, landscape mode and safe areas', () => {
    assert.match(css, /@media \(orientation: landscape\) and \(max-height: 540px\)/);
    assert.match(css, /env\(safe-area-inset-bottom\)/);
    assert.match(viewSource, /class="battle-top-actions"/);
  });

  it('BattleView runtime manages fullscreen and field drawer states', () => {
    const view = new BattleView({ container: { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] } });
    assert.equal(view.isFieldDrawerOpen, false);
    assert.equal(view.isPseudoFullscreen, false);

    // Toggle field drawer state
    view.toggleFieldDrawer();
    assert.equal(view.isFieldDrawerOpen, true);
    view.toggleFieldDrawer();
    assert.equal(view.isFieldDrawerOpen, false);
    view.toggleFieldDrawer(true);
    assert.equal(view.isFieldDrawerOpen, true);
    view.toggleFieldDrawer(false);
    assert.equal(view.isFieldDrawerOpen, false);

    // Toggle pseudo-fullscreen fallback state
    view.enterPseudoFullscreen();
    assert.equal(view.isPseudoFullscreen, true);
    view.exitPseudoFullscreen();
    assert.equal(view.isPseudoFullscreen, false);
  });
});
