
const test = require('node:test');
const assert = require('node:assert/strict');
const Catalog = require('../../assets/js/campaign/campaign-catalog.js');
global.window = { PBACampaign: { ...Catalog } };
global.document = { createElement: () => ({}) };
const { CampaignView } = require('../../assets/js/campaign/campaign-view.js');
require('../../assets/js/campaign/campaign-wild-view.js');
const Store = require('../../assets/js/campaign/campaign-store.js');
const { CampaignManager } = require('../../assets/js/campaign/campaign-wild-manager.js');
const memory = new Map();
global.localStorage = { getItem: key => memory.get(key) || null, setItem: (key,value) => memory.set(key,value), removeItem: key => memory.delete(key) };
function setup() {
  memory.clear();
  const manager = new CampaignManager(Store);
  manager.start(Catalog.DRAFT.slice(0,6).map(p => p.id));
  const nodes = new Map();
  const container = { innerHTML: '', children: [], querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, {}); return nodes.get(selector); }, appendChild(node) { this.children.push(node); } };
  const view = new CampaignView({ manager, coordinator: {}, container });
  view.render = () => {};
  return { manager, view, container };
}
test('Collection encounter UI offers ball capture without team selection and labels unselectable roster cards', () => {
  const {manager,view,container} = setup();
  manager.data.wild.active = { pokemonId: 789, regionId: 'region-3', pointId: 'r3-grove', encounterId: 'collection-ui' };
  view.pending = { kind: 'WILD', id: 789 };
  view.renderPicker();
  assert.ok(container.innerHTML.includes('ENCONTRO DE COLEÇÃO'));
  assert.ok(!container.innerHTML.includes('startCampaignBattle'));
  assert.ok(!container.innerHTML.includes('Escolha exatamente 3'));
  container.querySelector('#collectionCapture').onclick();
  assert.equal(manager.getState().wild.pendingCapture.pokemonId, 789);
  const card = view.card(Catalog.byId(789));
  assert.ok(card.includes('disabled'));
  assert.ok(card.includes('Somente coleção'));
});
test('Completed screen exposes the collection-map continuation action', () => {
  const {view,container} = setup();
  view.renderComplete();
  const button = container.children.find(button => button.id === 'campaignExploreCollection');
  assert.ok(button);
  let opened = false;
  view.renderHome = () => { opened = true; };
  button.onclick();
  assert.equal(view._collectionExploration, true);
  assert.equal(opened, true);
});
