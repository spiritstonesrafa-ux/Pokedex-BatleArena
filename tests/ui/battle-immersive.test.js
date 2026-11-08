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

  it('exit confirmation uses in-game modal without window.confirm and protects active battle', () => {
    const originalWindow = global.window;
    let confirmCalled = false;
    let switchedTab = null;
    global.window = {
      confirm: () => { confirmCalled = true; return true; },
      switchAppTab: (tab) => { switchedTab = tab; }
    };
    let abandoned = 0;
    const fakeContainer = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
    const view = new BattleView({
      container: fakeContainer,
      sessionController: {
        uiState: 'AWAITING_PLAYER_ACTION',
        sessionOptions: { metadata: { mode: 'CAMPAIGN' } },
        abandonBattle: () => abandoned++,
        leaveBattle: () => {}
      }
    });

    assert.equal(view.requestExitBattle(), false);
    assert.equal(confirmCalled, false, 'window.confirm must never be called');
    assert.equal(abandoned, 0);
    assert.ok(view.activeModal, 'In-game modal must be active');
    assert.match(view.activeModal.innerHTML, /Deseja sair da batalha e voltar para a campanha/);
    assert.match(view.activeModal.innerHTML, /Sair para Campanha/);

    // Confirm exit routes to campaign
    view.confirmExitBattle();
    assert.equal(switchedTab, 'campaign', 'Must return to campaign tab');

    global.window = originalWindow;
  });

  it('exit confirmation in quick battle mode routes to returnToPreparation', () => {
    const originalWindow = global.window;
    let prepCalled = false;
    const fakeContainer = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [] };
    const view = new BattleView({
      container: fakeContainer,
      sessionController: {
        uiState: 'AWAITING_PLAYER_ACTION',
        sessionOptions: { metadata: { mode: 'QUICK' } },
        returnToPreparation: () => { prepCalled = true; },
        leaveBattle: () => {}
      }
    });

    view.requestExitBattle();
    assert.match(view.activeModal.innerHTML, /Deseja realmente sair da batalha atual/);
    assert.match(view.activeModal.innerHTML, /Sair da Batalha/);
    view.confirmExitBattle();
    assert.equal(prepCalled, true);

    global.window = originalWindow;
  });

  it('abandonBattle on controller routes to campaign tab when metadata.mode is CAMPAIGN', () => {
    const originalWindow = global.window;
    let switchedTab = null;
    global.window = {
      switchAppTab: (tab) => { switchedTab = tab; }
    };
    const controller = new BattleSessionController({
      teamStore: { load: () => [] }
    });
    controller.sessionOptions = { metadata: { mode: 'CAMPAIGN' } };
    controller.abandonBattle();
    assert.equal(switchedTab, 'campaign');

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
