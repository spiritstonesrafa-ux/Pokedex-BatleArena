const test = require('node:test');
const assert = require('node:assert/strict');
const Catalog = require('../../assets/js/campaign/campaign-catalog.js');
global.window = { PBACampaign: { ...Catalog } };
const { CampaignView } = require('../../assets/js/campaign/campaign-view.js');
function fixture(result = { ok: true }) {
  const nodes = new Map(), starts = [];
  const node = key => { if (!nodes.has(key)) nodes.set(key,{focus(){this.focused=true;}}); return nodes.get(key); };
  const container = { innerHTML: '', querySelector: node };
  const view = new CampaignView({manager:{onChange(){},start:ids=>{starts.push([...ids]);return result;}},coordinator:{},container});
  view.draft = Catalog.DRAFT.slice(0,6).map(p=>p.id);
  let renders = 0; view.render = () => { renders++; };
  return {view,container,node,starts,renders:()=>renders};
}
test('Initial team confirmation previews six choices and starts only once on explicit acceptance',()=>{
  const f=fixture(), expected=[...f.view.draft];f.view.confirmDraft();
  assert.match(f.container.innerHTML,/Confirmar sua equipe inicial/);
  assert.match(f.container.innerHTML,/escolha é permanente/);
  assert.equal((f.container.innerHTML.match(/<article /g)||[]).length,6);
  for(const id of expected)assert.ok(f.container.innerHTML.includes(Catalog.DRAFT.find(p=>p.id===id).sprite));
  assert.equal(f.node('#draftConfirmTitle').focused,true);assert.deepEqual(f.starts,[]);
  f.view.draft=[]; // The confirmation accepts the displayed snapshot, not a changing selection.
  f.node('#draftConfirmAccept').onclick();f.node('#draftConfirmAccept').onclick();
  assert.deepEqual(f.starts,[expected]);
});
test('Back and Escape preserve the initial selection without starting and restore focus',()=>{
  for(const keyboard of [false,true]){
    const f=fixture(), expected=[...f.view.draft];f.view.confirmDraft();
    if(keyboard)f.node('.draft-confirmation').onkeydown({key:'Escape',preventDefault(){}});
    else f.node('#draftConfirmBack').onclick();
    assert.deepEqual(f.view.draft,expected);assert.equal(f.renders(),1);assert.deepEqual(f.starts,[]);
    assert.equal(f.node('#campaignConfirmDraft').focused,true);
    f.node('#draftConfirmAccept').onclick();assert.deepEqual(f.starts,[]);
  }
});
test('Invalid or incomplete initial teams do not open confirmation',()=>{
  for(const selection of [[1,2],Array(6).fill(1),[1,2,3,4,5,-1]]){
    const f=fixture();f.view.draft=selection;f.view.confirmDraft();
    assert.equal(f.container.innerHTML,'');assert.deepEqual(f.starts,[]);
  }
});
test('Rejected initial team stays recoverable with an inline explanation',()=>{
  const f=fixture({ok:false,reason:'MASTER_REWARD_CONFLICT'});f.view.confirmDraft();
  f.node('#draftConfirmAccept').onclick();
  assert.equal(f.node('#draftConfirmAccept').disabled,false);
  assert.match(f.node('#draftConfirmStatus').textContent,/mesmo Mestre/);
  f.node('#draftConfirmBack').onclick();assert.equal(f.renders(),1);
});
