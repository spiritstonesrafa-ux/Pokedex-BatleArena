const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../../assets/js/campaign/shadow-arrival.js'), 'utf8');

function setup() {
  const listeners = new Map(), nodes = new Map();
  const node = () => ({ textContent: '', classList: { toggle() {} }, focus() { doc.activeElement = this; }, isConnected: true });
  const steps = Array.from({ length: 5 }, node);
  const layer = { dataset: {}, setAttribute() {}, querySelector(selector) { if (!nodes.has(selector)) nodes.set(selector, node()); return nodes.get(selector); }, querySelectorAll() { return steps; }, remove() { this.removed = true; } };
  const doc = { hidden: false, activeElement: node(), body: { style: { overflow: 'auto' }, appendChild() {} }, createElement: () => layer, addEventListener: (key, fn) => listeners.set(key, fn), removeEventListener: key => listeners.delete(key) };
  let state = { status: 'SHADOW_AVAILABLE', shadowTrainer: { revealed: true, revealSeen: false } }, acknowledgments = 0;
  class View { constructor() { this.manager = { getState: () => state, acknowledgeShadowReveal: () => { acknowledgments++; state.shadowTrainer.revealSeen = true; this.render(); } }; } render() {} deactivate() {} }
  const context = { document: doc, window: { PBACampaign: { CampaignView: View }, matchMedia: () => ({ matches: true }) }, setTimeout, clearTimeout };
  vm.runInNewContext(source, context);
  return { View, Scene: context.window.PBACampaign.ShadowArrival, doc, layer, listeners, state, acknowledgments: () => acknowledgments };
}

test('Shadow arrival: rerenders do not duplicate the scene; only completion acknowledges the reveal', () => {
  const env = setup(), view = new env.View();
  view.render(); const scene = view.shadowArrival;
  view.render(); assert.equal(view.shadowArrival, scene); assert.equal(env.acknowledgments(), 0);
  for (let i = 0; i < 4; i++) scene.advance();
  assert.equal(env.acknowledgments(), 0);
  scene.advance(); assert.equal(env.acknowledgments(), 1); assert.equal(scene.active, false);
  scene.close(true); assert.equal(env.acknowledgments(), 1);
});

test('Shadow arrival: leaving cancels without advancing campaign and allows a later replay', () => {
  const env = setup(), view = new env.View(); view.render();
  const scene = view.shadowArrival; view.deactivate();
  assert.equal(scene.active, false); assert.equal(env.acknowledgments(), 0);
  assert.equal(env.doc.body.style.overflow, 'auto'); assert.equal(env.listeners.size, 0);
  view.render(); assert.notEqual(view.shadowArrival, scene); view.deactivate();
});

test('Shadow arrival: skip progresses once and restores scroll and focus', () => {
  const env = setup(), view = new env.View(), focus = env.doc.activeElement;
  view.render(); const scene = view.shadowArrival;
  env.listeners.get('keydown')({ key: 'Escape', preventDefault() {} });
  assert.equal(env.acknowledgments(), 1); assert.equal(env.layer.removed, true);
  assert.equal(env.doc.body.style.overflow, 'auto'); assert.equal(env.doc.activeElement, focus);
  assert.equal(env.listeners.size, 0); assert.equal(scene.active, false);
});

test('Shadow arrival: reduced motion waits for user and stops optional music on cancellation', async () => {
  const env = setup(); let started = 0, stopped = 0;
  const scene = new env.Scene({ audio: { unlock: async () => {}, startDialogueMusic() { started++; }, stopDialogueMusic() { stopped++; } } });
  scene.play(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(started, 1); assert.equal(scene.timer, null); assert.equal(scene.index, 0);
  scene.close(false); assert.equal(stopped, 1); assert.equal(env.listeners.size, 0);
});

test('Shadow arrival: cancellation before audio unlock never starts delayed music', async () => {
  const env = setup(); let unlock, started = 0;
  const scene = new env.Scene({ audio: { unlock: () => new Promise(resolve => { unlock = resolve; }), startDialogueMusic() { started++; }, stopDialogueMusic() {} } });
  scene.play(); scene.close(false); unlock(); await Promise.resolve();
  assert.equal(started, 0);
});

test('Shadow arrival: completed reveal and other campaign states never open the scene', () => {
  const env = setup(), view = new env.View();
  env.state.shadowTrainer.revealSeen = true; view.render(); assert.equal(view.shadowArrival, undefined);
  env.state.shadowTrainer.revealSeen = false; env.state.status = 'ACTIVE'; view.render(); assert.equal(view.shadowArrival, undefined);
});
