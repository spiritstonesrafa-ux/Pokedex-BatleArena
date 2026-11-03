const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '../..');
const fullscreenSource = fs.readFileSync(path.join(root, 'assets/js/campaign/campaign-fullscreen.js'), 'utf8');
const { BattleView } = require('../../assets/js/ui/battle-view.js');

describe('CAMPAIGN FULLSCREEN & MAP PAN/ZOOM ISOLATION', () => {
  let mockDocument;
  let mockWindow;
  let mockScreen;
  let origWindow;

  beforeEach(() => {
    origWindow = global.window;
    const classList = new Set();
    mockDocument = {
      body: {
        classList: {
          add: c => classList.add(c),
          remove: c => classList.delete(c),
          contains: c => classList.has(c),
          toggle: (c, force) => {
            if (force === true) classList.add(c);
            else if (force === false) classList.delete(c);
            else if (classList.has(c)) classList.delete(c);
            else classList.add(c);
            return classList.has(c);
          }
        }
      },
      documentElement: {
        requestFullscreen: async () => {},
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false
        }
      },
      fullscreenElement: null,
      exitFullscreen: async () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      getElementById: id => null,
      querySelectorAll: () => []
    };

    let lockedOrientation = null;
    mockScreen = {
      orientation: {
        type: 'portrait-primary',
        lock: async o => { lockedOrientation = o; },
        unlock: () => { lockedOrientation = null; }
      }
    };

    mockWindow = {
      document: mockDocument,
      screen: mockScreen,
      navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 13; Mobile)' },
      addEventListener: () => {},
      removeEventListener: () => {},
      matchMedia: () => ({ matches: false, addEventListener: () => {} }),
      PBACampaign: { MASTERS: [] }
    };
    global.window = mockWindow;
  });

  afterEach(() => {
    global.window = origWindow;
  });

  it('CampaignFullscreen: instantiates singleton, enters and exits fullscreen', async () => {
    const context = { window: mockWindow, document: mockDocument, navigator: mockWindow.navigator, screen: mockScreen, console };
    vm.createContext(context);
    vm.runInContext(fullscreenSource, context);

    const controller = context.window.PBACampaign.CampaignFullscreen;
    assert.ok(controller, 'CampaignFullscreen controller should be exported');
    assert.equal(controller.isActive, false);

    // Track orientation locking
    let locked = null;
    mockScreen.orientation.lock = async o => { locked = o; };
    mockScreen.orientation.unlock = () => { locked = 'unlocked'; };

    // Enter
    await controller.enter();
    assert.equal(controller.isActive, true);
    assert.equal(mockDocument.body.classList.contains('campaign-fullscreen-active'), true);
    assert.equal(locked, 'landscape');

    // Exit
    await controller.exit();
    assert.equal(controller.isActive, false);
    assert.equal(mockDocument.body.classList.contains('campaign-fullscreen-active'), false);
    assert.equal(locked, 'unlocked');
  });

  it('CampaignFullscreen: toggle() switches active state seamlessly', async () => {
    const context = { window: mockWindow, document: mockDocument, navigator: mockWindow.navigator, screen: mockScreen, console };
    vm.createContext(context);
    vm.runInContext(fullscreenSource, context);

    const controller = context.window.PBACampaign.CampaignFullscreen;
    assert.equal(controller.isActive, false);

    await controller.toggle();
    assert.equal(controller.isActive, true);

    await controller.toggle();
    assert.equal(controller.isActive, false);
  });

  it('CampaignMapView: pan and zoom mechanics clamp properly and recenter', () => {
    const { CampaignMapView } = require('../../assets/js/campaign/campaign-map-view.js');
    const mockContainer = {
      innerHTML: '',
      querySelector: () => null,
      querySelectorAll: () => []
    };
    const mockManager = {
      getState: () => ({ completedMilestones: [], shadowTrainer: {} }),
      isStarted: () => true
    };

    const mapView = new CampaignMapView({
      container: mockContainer,
      manager: mockManager
    });

    assert.equal(mapView.zoomLevel, 1);
    assert.equal(mapView.panX, 0);
    assert.equal(mapView.panY, 0);

    // Zoom in
    mapView.zoomIn();
    assert.ok(mapView.zoomLevel > 1, 'zoomIn should increase zoomLevel');
    assert.ok(mapView.zoomLevel <= 1.8, 'zoom should not exceed max zoom');

    // Multiple zoom in up to max
    for (let i = 0; i < 10; i++) mapView.zoomIn();
    assert.equal(mapView.zoomLevel, 1.8, 'zoomLevel should be clamped to 1.8');

    // Zoom out down to min (1.0)
    for (let i = 0; i < 15; i++) mapView.zoomOut();
    assert.equal(mapView.zoomLevel, 0.8, 'zoomLevel should be clamped to 0.8');

    // Pan clamping
    mapView.panX = 9999;
    mapView.panY = -9999;
    const clamped = mapView._clampPan(mapView.panX, mapView.panY);
    assert.ok(clamped.x <= 500, 'panX should be clamped within bounds');
    assert.ok(clamped.y >= -500, 'panY should be clamped within bounds');

    // Recenter
    mapView.recenterMap();
    assert.equal(mapView.zoomLevel, 1);
    assert.equal(mapView.panX, 0);
    assert.equal(mapView.panY, 0);
  });

  function createMockCombatant(name, types) {
    return {
      species: { name, types },
      name,
      types,
      currentHp: 100,
      maxHp: 100,
      level: 50,
      status: null,
      statStages: {},
      moves: [
        { id: 'tackle', name: 'Tackle', type: 'normal', pp: 35, maxPp: 35, power: 40, accuracy: 100, category: 'physical' }
      ]
    };
  }

  it('BattleView Isolation: Non-campaign battle does NOT show fullscreen button or campaign battle layout', () => {
    let htmlOutput = '';
    const container = {
      set innerHTML(val) { htmlOutput = val; },
      get innerHTML() { return htmlOutput; },
      querySelector: () => null,
      querySelectorAll: () => []
    };

    const monP = createMockCombatant('Pikachu', ['electric']);
    const monE = createMockCombatant('Eevee', ['normal']);

    const nonCampaignController = {
      setView: () => {},
      checkTeamAndInit: () => true,
      uiState: 'AWAITING_PLAYER_ACTION',
      battleState: {
        player: { team: [monP], activeIndex: 0 },
        enemy: { team: [monE], activeIndex: 0 },
        field: {}
      },
      sessionOptions: {
        metadata: {
          mode: 'QUICK_BATTLE' // NOT Campaign!
        }
      }
    };

    const view = new BattleView({ container, sessionController: nonCampaignController });
    view.renderActiveBattleView(nonCampaignController.battleState, 'AWAITING_PLAYER_ACTION');

    // Check that fullscreen button is NOT present in standard Quick Battle
    assert.equal(htmlOutput.includes('id="btnToggleFullscreen"'), false, 'Non-campaign battle must NOT render #btnToggleFullscreen');
    assert.equal(htmlOutput.includes('campaign-battle-layout'), false, 'Non-campaign battle must NOT have campaign-battle-layout');
  });

  it('BattleView Isolation: Campaign battle renders #btnToggleFullscreen and .campaign-battle-layout', () => {
    let htmlOutput = '';
    const container = {
      set innerHTML(val) { htmlOutput = val; },
      get innerHTML() { return htmlOutput; },
      querySelector: () => null,
      querySelectorAll: () => []
    };

    const monP = createMockCombatant('Charizard', ['fire', 'flying']);
    const monE = createMockCombatant('Blastoise', ['water']);

    const campaignController = {
      setView: () => {},
      checkTeamAndInit: () => true,
      uiState: 'AWAITING_PLAYER_ACTION',
      battleState: {
        player: { team: [monP], activeIndex: 0 },
        enemy: { team: [monE], activeIndex: 0 },
        field: {}
      },
      sessionOptions: {
        metadata: {
          mode: 'CAMPAIGN' // Campaign Mode!
        }
      }
    };

    const view = new BattleView({ container, sessionController: campaignController });
    view.renderActiveBattleView(campaignController.battleState, 'AWAITING_PLAYER_ACTION');

    // Check that fullscreen button IS present in Campaign Battle
    assert.equal(htmlOutput.includes('id="btnToggleFullscreen"'), true, 'Campaign battle MUST render #btnToggleFullscreen');
    assert.equal(htmlOutput.includes('campaign-battle-layout'), true, 'Campaign battle MUST have campaign-battle-layout');
  });

  it('Campaign Map View contains zoom and fullscreen buttons in rendered HTML', () => {
    let htmlOutput = '';
    const container = {
      set innerHTML(val) { htmlOutput = val; },
      get innerHTML() { return htmlOutput; },
      querySelector: () => null,
      querySelectorAll: () => []
    };
    const mockManager = {
      getState: () => ({ completedMilestones: [], shadowTrainer: {} }),
      isStarted: () => true,
      getRoster: () => []
    };

    const { CampaignMapView } = require('../../assets/js/campaign/campaign-map-view.js');
    const mapView = new CampaignMapView({
      container,
      manager: mockManager
    });

    mapView.render();
    assert.ok(htmlOutput.includes('id="btnCampaignFullscreen"'), 'Header must render #btnCampaignFullscreen');
    assert.ok(htmlOutput.includes('id="btnMapZoomIn"'), 'Map view must render #btnMapZoomIn');
    assert.ok(htmlOutput.includes('id="btnMapZoomOut"'), 'Map view must render #btnMapZoomOut');
    assert.ok(htmlOutput.includes('id="btnMapRecenter"'), 'Map view must render #btnMapRecenter');
  });

  it('Campaign Map View: pan clamping permits generous movement (>= 160px in Y) to reveal bottom nodes', () => {
    const { CampaignMapView } = require('../../assets/js/campaign/campaign-map-view.js');
    const mockContainer = {
      innerHTML: '',
      querySelector: (selector) => {
        if (selector === '.campaign-map-viewport') {
          return { clientWidth: 844, clientHeight: 320 };
        }
        return null;
      },
      querySelectorAll: () => []
    };
    const mockManager = {
      getState: () => ({ completedMilestones: [], shadowTrainer: {} }),
      isStarted: () => true
    };
    const mapView = new CampaignMapView({ container: mockContainer, manager: mockManager });
    mapView.zoomLevel = 1.0;
    const clampedMaxY = mapView._clampPan(0, 9999);
    const clampedMinY = mapView._clampPan(0, -9999);
    assert.ok(clampedMaxY.y >= 160, 'maxPanY should be at least 160px at zoom 1.0');
    assert.ok(clampedMinY.y <= -160, 'minPanY should reach at least -160px at zoom 1.0');
  });

  it('Campaign View: Wild Encounter view renders sticky #pickerActionBar with #startCampaignBattle', () => {
    const wildSource = fs.readFileSync(path.join(root, 'assets/js/campaign/campaign-wild-view.js'), 'utf8');
    assert.ok(wildSource.includes('id="pickerActionBar"'), 'Wild view must render #pickerActionBar');
    assert.ok(wildSource.includes('id="startCampaignBattle"'), 'Wild view must render #startCampaignBattle');
    assert.ok(wildSource.includes('wild-picker-action-bar'), 'Wild view must have action bar styling class');
  });

});
