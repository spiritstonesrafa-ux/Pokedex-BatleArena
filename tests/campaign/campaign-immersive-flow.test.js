const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const memory = new Map();
global.localStorage = {
  getItem: key => memory.get(key) || null,
  setItem: (key, value) => memory.set(key, String(value)),
  removeItem: key => memory.delete(key)
};
global.window = global.window || {};
global.window.PBACampaign = global.window.PBACampaign || {};
global.window.matchMedia = () => ({ matches: true });
global.window.switchAppTab = () => {};
global.document = global.document || {
  getElementById: () => null, addEventListener: () => {}, removeEventListener: () => {}
};

const root = path.resolve(__dirname, '../..');
const fullscreenSource = fs.readFileSync(path.join(root, 'assets/js/campaign/campaign-fullscreen.js'), 'utf8');
const Catalog = require('../../assets/js/campaign/campaign-catalog.js');
Object.assign(global.window.PBACampaign, Catalog);
const Wild = require('../../assets/js/campaign/campaign-wild-encounters.js');
const { CampaignManager } = require('../../assets/js/campaign/campaign-manager.js');
require('../../assets/js/campaign/campaign-wild-manager.js');
const { CampaignView } = require('../../assets/js/campaign/campaign-view.js');
require('../../assets/js/campaign/campaign-wild-view.js');

describe('M1 & M2: CAMPAIGN IMMERSIVE ENTRY & PREMIUM CAPTURE SUITE', () => {
  let mockDocument;
  let mockWindow;
  let mockScreen;
  let origWindow;
  let origDocument;

  beforeEach(() => {
    origWindow = global.window;
    origDocument = global.document;

    const classList = new Set();
    const elementsById = new Map();

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
        },
        appendChild: el => {
          if (el.id) elementsById.set(el.id, el);
          return el;
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
      addEventListener: (event, handler) => {
        if (!mockDocument._listeners) mockDocument._listeners = {};
        mockDocument._listeners[event] = handler;
      },
      removeEventListener: (event) => {
        if (mockDocument._listeners) delete mockDocument._listeners[event];
      },
      getElementById: id => elementsById.get(id) || null,
      createElement: tag => {
        const elClasses = new Set();
        const attrs = new Map();
        const el = {
          tagName: tag.toUpperCase(),
          id: '',
          className: '',
          innerHTML: '',
          style: {},
          disabled: false,
          textContent: '',
          classList: {
            add: c => elClasses.add(c),
            remove: c => elClasses.delete(c),
            contains: c => elClasses.has(c)
          },
          setAttribute: (k, v) => attrs.set(k, v),
          getAttribute: k => attrs.get(k),
          querySelector: sel => {
            if (sel === '#btnEntryFullscreen') return el._primaryBtn;
            if (sel === '#btnEntryContinue') return el._secondaryBtn;
            return null;
          },
          remove: () => {
            if (el.id) elementsById.delete(el.id);
          },
          focus: () => {}
        };
        el._primaryBtn = {
          id: 'btnEntryFullscreen',
          focus: () => {},
          onclick: null
        };
        el._secondaryBtn = {
          id: 'btnEntryContinue',
          focus: () => {},
          onclick: null
        };
        return el;
      },
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
      PBACampaign: { ...Catalog }
    };

    global.window = mockWindow;
    global.document = mockDocument;
  });

  afterEach(() => {
    global.window = origWindow;
    global.document = origDocument;
  });

  it('M1 — shouldShowEntryPrompt: respects fullscreen state, intra-campaign dismissal and external re-entry', () => {
    const context = { window: mockWindow, document: mockDocument, navigator: mockWindow.navigator, screen: mockScreen, console, setTimeout, clearTimeout };
    vm.createContext(context);
    vm.runInContext(fullscreenSource, context);

    const controller = context.window.PBACampaign.CampaignFullscreen;
    assert.equal(controller.shouldShowEntryPrompt(), true, 'Should recommend fullscreen on fresh entry');

    // Dismissal for current visit
    controller.markEntryPromptSeen();
    assert.equal(controller.shouldShowEntryPrompt(), false, 'Should not re-prompt during the same campaign visit');

    // User leaves campaign to another module and returns
    controller.onLeaveCampaign();
    assert.equal(controller.shouldShowEntryPrompt(), true, 'Must re-prompt whenever entering campaign externally');

    // In fullscreen active, prompt must stay suppressed
    controller.isActive = true;
    assert.equal(controller.shouldShowEntryPrompt(), false, 'Should not prompt if fullscreen is already active');
  });

  it('M1 — showEntryPrompt: renders modal, confirms into fullscreen, or cancels normally', () => {
    const context = { window: mockWindow, document: mockDocument, navigator: mockWindow.navigator, screen: mockScreen, console };
    vm.createContext(context);
    vm.runInContext(fullscreenSource, context);

    const controller = context.window.PBACampaign.CampaignFullscreen;
    let confirmed = false;
    let cancelled = false;

    // Test Confirm Branch
    controller.showEntryPrompt({
      onConfirm: () => { confirmed = true; },
      onCancel: () => { cancelled = true; }
    });

    const modal = mockDocument.getElementById('campaignEntryModal');
    assert.ok(modal, 'Entry modal should be mounted to document');
    assert.match(modal.innerHTML, /PRONTO PARA SUA JORNADA\?/);
    assert.match(modal.innerHTML, /JOGAR EM TELA CHEIA/);
    assert.match(modal.innerHTML, /CONTINUAR NORMALMENTE/);

    // Click Primary (Fullscreen)
    modal._primaryBtn.onclick();
    assert.equal(confirmed, true);
    assert.equal(controller.isActive, true, 'Controller should enter fullscreen on primary action');
    assert.equal(mockDocument.getElementById('campaignEntryModal'), null, 'Modal should be dismissed');
    assert.equal(controller.hasDismissedEntryPrompt, true);

    // Test Cancel Branch
    controller.hasDismissedEntryPrompt = false;
    controller.isActive = false;
    confirmed = false;
    cancelled = false;

    controller.showEntryPrompt({
      onConfirm: () => { confirmed = true; },
      onCancel: () => { cancelled = true; }
    });

    const modal2 = mockDocument.getElementById('campaignEntryModal');
    assert.ok(modal2);
    modal2._secondaryBtn.onclick();
    assert.equal(cancelled, true);
    assert.equal(controller.isActive, false, 'Controller should stay in normal view on secondary action');
    assert.equal(mockDocument.getElementById('campaignEntryModal'), null);
  });

  it('M2 — Wild Capture: renders cinematic stage, handles throw button and single-throw lock', () => {
    const manager = new CampaignManager();
    const initialRoster = Catalog.DRAFT.slice(0, 6).map(p => p.id);
    manager.start(initialRoster);

    const elements = new Map();
    const container = {
      innerHTML: '',
      querySelector(selector) {
        if (!elements.has(selector)) {
          const classes = new Set();
          elements.set(selector, {
            disabled: false,
            textContent: '',
            classes,
            classList: {
              add: name => classes.add(name),
              remove: name => classes.delete(name),
              contains: name => classes.has(name)
            }
          });
        }
        return elements.get(selector);
      },
      querySelectorAll: () => []
    };

    const view = new CampaignView({ manager, coordinator: { start: async () => {} }, container });
    const pokemonId = manager.beginWildEncounter('region-1', 0).pokemonId;
    manager.recordBattle({ battleId: 'wild-m2-test', kind: 'WILD', id: pokemonId, winner: 'player' });

    assert.match(container.innerHTML, /wild-capture-screen/);
    assert.match(container.innerHTML, /wild-capture-header/);
    assert.match(container.innerHTML, /wild-capture-stage/);
    assert.match(container.innerHTML, /wild-capture-trainer/);
    assert.match(container.innerHTML, /trainer-capture-windup\.png/);
    assert.match(container.innerHTML, /trainer-capture-release\.png/);
    assert.match(container.innerHTML, /wild-capture-dock/);
    assert.match(container.innerHTML, /Lançar Poké Bola/);

    const throwButton = elements.get('#throwWildBall');
    assert.equal(throwButton.disabled, false);

    // Click throw
    throwButton.onclick();
    assert.equal(throwButton.disabled, true, 'Throw button must be disabled immediately to prevent duplicate rolls');
    assert.equal(throwButton.textContent, 'Captura em andamento...');

    const stage = elements.get('.wild-capture-stage');
    assert.ok(stage.classes.has('is-playing'), 'Stage must receive is-playing animation class');

    view.deactivate();
  });

  it('M2 — Collection Capture: direct collection encounter reaches capture stage seamlessly', () => {
    const manager = new CampaignManager();
    const initialRoster = Catalog.DRAFT.slice(0, 6).map(p => p.id);
    manager.start(initialRoster);

    // Mock active wild encounter with a collection-only Pokemon (Cosmog #789 in region-3)
    const collectionMon = Catalog.byId(789) || { id: 789, name: 'Cosmog', collectionOnly: true, sprite: 'cosmog.png' };
    manager.data.wild = {
      active: {
        regionId: 'region-3',
        pointId: 'r3-grove',
        pokemonId: collectionMon.id,
        encounterId: 'collection-test-1'
      },
      pendingCapture: null,
      capturedIds: [],
      captureRegions: {},
      capturePoints: {},
      pointCounts: {}
    };

    const prep = manager.prepareWildCollectionCapture();
    assert.equal(prep.ok, true, 'Collection capture must be prepared without battle');
    assert.equal(manager.data.wild.pendingCapture.pokemonId, collectionMon.id);

    const elements = new Map();
    const container = {
      innerHTML: '',
      querySelector(selector) {
        if (!elements.has(selector)) {
          const classes = new Set();
          elements.set(selector, {
            disabled: false, textContent: '', classes,
            classList: { add: n => classes.add(n), remove: n => classes.delete(n) }
          });
        }
        return elements.get(selector);
      },
      querySelectorAll: () => []
    };

    const view = new CampaignView({ manager, coordinator: { start: async () => {} }, container });
    view.render();

    assert.match(container.innerHTML, /COLEÇÃO/, 'Should indicate collection mode in header chip');
    assert.match(container.innerHTML, /wild-capture-stage/);
    assert.ok(elements.has('#throwWildBall'));

    view.deactivate();
  });
});
