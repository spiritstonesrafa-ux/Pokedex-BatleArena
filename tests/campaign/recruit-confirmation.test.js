
const test = require('node:test');
const assert = require('node:assert/strict');
const Catalog = require('../../assets/js/campaign/campaign-catalog.js');
global.window = { PBACampaign: { ...Catalog } };
const { CampaignView } = require('../../assets/js/campaign/campaign-view.js');

function fixture({ selectable = true, succeeds = true } = {}) {
  const nodes = new Map();
  const node = selector => {
    if (!nodes.has(selector)) nodes.set(selector, { focus() { this.focused = true; } });
    return nodes.get(selector);
  };
  const container = { innerHTML: '', querySelector: node };
  const claimed = [];
  const manager = {
    onChange() {},
    getRewardCandidates: () => [{ id: 68, selectable }],
    claimReward: id => { claimed.push(id); return { ok: succeeds }; }
  };
  const view = new CampaignView({ manager, coordinator: {}, container });
  let renders = 0;
  view.render = () => { renders++; };
  return { view, container, node, claimed, renders: () => renders };
}

test('Recruit confirmation shows the selected Pokémon and commits only once after explicit acceptance', () => {
  const f = fixture();
  f.view.confirmRecruit(68);
  assert.match(f.container.innerHTML, /Recrutar Machamp/);
  assert.match(f.container.innerHTML, /elenco permanente/);
  assert.match(f.container.innerHTML, /Confirmar recruta/);
  assert.equal(f.node('#recruitConfirmTitle').focused, true);
  assert.deepEqual(f.claimed, []);
  f.node('#recruitConfirmAccept').onclick();
  f.node('#recruitConfirmAccept').onclick();
  assert.deepEqual(f.claimed, [68]);
});

test('Back and Escape restore reward selection without recruiting and return focus', () => {
  for (const keyboard of [false, true]) {
    const f = fixture();
    f.view.confirmRecruit(68);
    if (keyboard) {
      let prevented = false;
      f.node('.recruit-confirmation').onkeydown({ key: 'Escape', preventDefault() { prevented = true; } });
      assert.equal(prevented, true);
    } else f.node('#recruitConfirmBack').onclick();
    assert.equal(f.renders(), 1);
    assert.deepEqual(f.claimed, []);
    assert.equal(f.node('[data-id="68"]').focused, true);
    f.node('#recruitConfirmAccept').onclick();
    assert.deepEqual(f.claimed, []);
  }
});

test('Unavailable rewards cannot be confirmed and a rejected claim remains recoverable', () => {
  const unavailable = fixture({ selectable: false });
  unavailable.view.confirmRecruit(68);
  assert.equal(unavailable.container.innerHTML, '');
  assert.deepEqual(unavailable.claimed, []);
  const failed = fixture({ succeeds: false });
  failed.view.confirmRecruit(68);
  failed.node('#recruitConfirmAccept').onclick();
  assert.match(failed.node('#recruitConfirmStatus').textContent, /Não foi possível/);
  assert.equal(failed.node('#recruitConfirmAccept').disabled, false);
  failed.node('#recruitConfirmBack').onclick();
  assert.equal(failed.renders(), 1);
});
