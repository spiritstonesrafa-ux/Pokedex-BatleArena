const test=require('node:test'),assert=require('node:assert/strict'),Store=require('../../assets/js/campaign/campaign-store'),{CampaignManager}=require('../../assets/js/campaign/campaign-manager'),{BattleTeamHydrator}=require('../../assets/js/battle-session/battle-team-hydrator'),{BattleSessionController}=require('../../assets/js/battle-session/battle-session-controller'),Fixed=require('../../assets/js/campaign/campaign-fixed-battle-catalog'),Editor=require('../../assets/js/campaign/campaign-battle-customization'),C=require('../../assets/js/battle/battle-constants');
function manager(){let persisted=null;const store={load:()=>Store.sanitize(persisted),getDefaultState:Store.getDefaultState,sanitize:Store.sanitize,save:x=>(persisted=Store.sanitize(JSON.parse(JSON.stringify(x)))),reset:()=>Store.getDefaultState()};const m=new CampaignManager(store);assert.ok(m.start([3,6,9,25,38,94]).ok);return m;}
test('P7 preferences persist, validate ownership/natural abilities, sanitize hostile saves and reset',()=>{const m=manager();assert.ok(m.setBattlePreference(3,{ability:'chlorophyll',item:'leftovers'}).ok);assert.deepEqual(m.getBattlePreferencesForTeam([3]),{3:{ability:'chlorophyll',item:'leftovers'}});assert.equal(m.setBattlePreference(3,{ability:'drizzle',item:null}).ok,false);assert.equal(m.setBattlePreference(493,{ability:'multitype',item:'flame-plate'}).ok,false);const raw=JSON.parse(JSON.stringify(m.data));raw.battlePreferences[493]={ability:'multitype',item:'flame-plate'};raw.battlePreferences[25]={ability:'static',item:'invented'};const clean=Store.sanitize(raw);assert.equal(clean.battlePreferences[493],undefined);assert.equal(clean.battlePreferences[25],undefined);assert.equal(clean.battlePreferences[3].item,'leftovers');assert.ok(m.resetBattlePreference(3).ok);assert.equal(m.getBattlePreference(3).item,null);});
test('P7 real campaign session applies player equipment, natural enemy defaults, consumption is battle-local',async()=>{const m=manager();m.setBattlePreference(3,{ability:'chlorophyll',item:'focus-sash'});const session=new BattleSessionController({hydrator:new BattleTeamHydrator({api:null}),view:{renderState(){}}});const config={playerTeamIds:[3,6,9],enemyTeamIds:[25,38,94],playerBattlePreferences:m.getBattlePreferencesForTeam([3,6,9]),metadata:{mode:'CAMPAIGN'}};await session.prepareBattle(config);assert.equal(session.battleState.player.team[0].ability,'chlorophyll');assert.equal(session.battleState.player.team[0].item,'focus-sash');assert.equal(session.battleState.enemy.team[0].ability,'static');assert.equal(session.battleState.enemy.team[0].item,null);session.battleState.player.team[0].item=null;assert.equal(m.getBattlePreference(3).item,'focus-sash');await session.prepareBattle(config);assert.equal(session.battleState.player.team[0].item,'focus-sash');});
test('P7 quick session ignores campaign equipment preferences',async()=>{const session=new BattleSessionController({hydrator:new BattleTeamHydrator({api:null}),view:{renderState(){}}});await session.prepareBattle({playerTeamIds:[3,6,9],enemyTeamIds:[25,38,94],playerBattlePreferences:{3:{ability:'chlorophyll',item:'leftovers'}},metadata:{mode:'QUICK'}});assert.equal(session.battleState.player.team[0].ability,'overgrow');assert.equal(session.battleState.player.team[0].item,null);});
test('P7 picker renders legal abilities, pending labels, items and save/reset controls',()=>{const m=manager(),html=[],buttons=[{dataset:{p7Save:'3'}}],reset=[{dataset:{p7Reset:'3'}}],nodes={'#pickerActionBar':{insertAdjacentHTML:(_,s)=>html.push(s)},'[data-p7-ability="3"]':{value:'chlorophyll'},'[data-p7-item="3"]':{value:'leftovers'},'#p7EquipmentError':{textContent:''}};class View{renderPicker(){}}Editor.install(View);const view=new View();view.pending={};view.pick=[3];view.manager=m;view.container={querySelector:s=>nodes[s],querySelectorAll:s=>s==='[data-p7-save]'?buttons:reset};view.renderPicker();assert.match(html[0],/Habilidades e itens/);assert.match(html[0],/chlorophyll/);assert.match(html[0],/focus-sash/);buttons[0].onclick();assert.equal(m.getBattlePreference(3).item,'leftovers');reset[0].onclick();assert.equal(m.getBattlePreference(3).item,null);});
test('P7 all move pilots available in bounded legal campaign pools and older save defaults survive',()=>{const O=require('../../assets/js/campaign/campaign-move-options');const available=new Set(Object.keys(Fixed.byId).flatMap(id=>{const pool=O.getPool(+id);assert.ok(pool.length<=6);return pool.map(m=>m.id)}));for(const move of Object.values(C.P7.moves))assert.ok(available.has(move.id),move.name);const clean=Store.sanitize({});assert.deepEqual(clean.battlePreferences,{});});


test('P7 mobile equipment strip renders selected team items, open-modal buttons and handles guest safeguards', () => {
  const m = manager();
  m.setBattlePreference(3, { ability: 'chlorophyll', item: 'life-orb' });
  m.setBattlePreference(6, { ability: 'blaze', item: 'assault-vest' });

  const inserted = [];
  const nodes = {
    '#pickerActionBar': { insertAdjacentHTML: (_, s) => inserted.push({ where: 'beforeActionBar', html: s }) },
    '.picker-choice': {
      insertAdjacentHTML: (pos, s) => inserted.push({ where: pos, html: s })
    },
    '#pickerTeamEquipmentStrip': null,
    '.campaign-equipment-editor.campaign-desktop-loadout': null
  };

  class FakeView { renderPicker() {} }
  Editor.install(FakeView);
  const view = new FakeView();
  view.pending = { kind: 'MASTER' };
  view.pick = [3, 6];
  view.manager = m;
  view.container = {
    querySelector: s => nodes[s] || null,
    querySelectorAll: s => []
  };

  view.renderPicker();

  const strip = inserted.find(i => i.where === 'afterend');
  assert.ok(strip, 'Strip should be inserted after .picker-choice');
  assert.match(strip.html, /ITENS DA EQUIPE/);
  assert.match(strip.html, /👑 Líder/);
  assert.match(strip.html, /2º Combatente/);
  assert.match(strip.html, /Life Orb/);
  assert.match(strip.html, /Assault Vest/);
  assert.match(strip.html, /data-open-equip-modal="3"/);
  assert.match(strip.html, /data-open-equip-modal="6"/);

  // Test guest in Final Stand: temporary guest is rendered as fixed equipment
  const guestNodes = {
    '#pickerActionBar': { insertAdjacentHTML: () => {} },
    '.picker-choice': { insertAdjacentHTML: (_, s) => inserted.push({ where: 'guestStrip', html: s }) }
  };
  const finalStandView = new FakeView();
  finalStandView.pending = { kind: 'SHADOW' };
  finalStandView.pick = [999]; // guest id
  finalStandView.manager = Object.assign(Object.create(m), {
    getRosterIds: () => [3, 6],
    getRoster: () => m.getRoster(),
    getShadowGuests: () => [{ id: 999, name: 'Lugia', sprite: 'lugia.png', temporary: true }]
  });
  finalStandView.container = {
    querySelector: s => guestNodes[s] || null,
    querySelectorAll: () => []
  };
  finalStandView.renderPicker();
  const guestStrip = inserted.find(i => i.where === 'guestStrip');
  assert.ok(guestStrip);
  assert.match(guestStrip.html, /Reforço · Equipamento fixo/);
  assert.match(guestStrip.html, /is-disabled/);
});

test('P7 partial update preserves ability, teraType and specialMechanic when changing or removing item', () => {
  const m = manager();
  // Setup initial full loadout
  m.setBattlePreference(6, { ability: 'blaze', item: 'life-orb', teraType: 'flying', specialMechanic: 'tera' });
  const initial = m.getBattlePreference(6);
  assert.equal(initial.item, 'life-orb');
  assert.equal(initial.ability, 'blaze');
  assert.equal(initial.teraType, 'flying');
  assert.equal(initial.specialMechanic, 'tera');

  // Change item to assault-vest
  const changed = m.setBattlePreference(6, { ...initial, item: 'assault-vest' });
  assert.equal(changed.ok, true);
  const updated = m.getBattlePreference(6);
  assert.equal(updated.item, 'assault-vest');
  assert.equal(updated.ability, 'blaze');
  assert.equal(updated.teraType, 'flying');
  assert.equal(updated.specialMechanic, 'tera');

  // Remove item
  const removed = m.setBattlePreference(6, { ...updated, item: null });
  assert.equal(removed.ok, true);
  const finalPref = m.getBattlePreference(6);
  assert.equal(finalPref.item, null);
  assert.equal(finalPref.ability, 'blaze');
  assert.equal(finalPref.teraType, 'flying');
  assert.equal(finalPref.specialMechanic, 'tera');
});

test('P7 describeItem provides full descriptions for all canonical battle items', () => {
  const allItems = Object.keys({ ...C.P7.items, ...C.P8.specialItems });
  assert.equal(allItems.length, 98);

  for (const item of allItems) {
    const desc = Editor.describeItem(item);
    assert.ok(typeof desc === 'string' && desc.length > 5, `Item ${item} should have a description`);
    assert.notEqual(desc, 'Sem item equipado.');
  }

  assert.match(Editor.describeItem('rocky-helmet'), /contato físico/);
  assert.match(Editor.describeItem('safety-goggles'), /clima/);
  assert.match(Editor.describeItem('ultranecrozium-z--held'), /Light That Burns the Sky/);
  assert.match(Editor.describeItem(null), /Nenhum item equipado/);
});
