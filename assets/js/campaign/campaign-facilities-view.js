/* Facility screens use the existing battle coordinator and presentation pipeline. */
(function(){
 const C=window.PBACampaign,View=C.CampaignView,F=C.CampaignFacilities;
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const cap=s=>String(s).replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
 const team=ids=>`<div class="mini-team">${ids.map(id=>{const p=C.byId(id);return `<figure><img src="${esc(p.sprite)}" alt="${esc(cap(p.name))}" width="72" height="72"><figcaption>${esc(cap(p.name))}</figcaption></figure>`;}).join('')}</div>`;
 const previous=View.prototype.renderPicker;
 View.prototype.openFacility=function(kind){this.pending={kind,id:null};this.pick=[];this.facilityCategory='CLASSIC';this.facilityRental=null;this.render();};
 View.prototype.renderPicker=function(){
  const kind=this.pending?.kind;if(!F.isFacility(kind))return previous.call(this);
  const category=kind==='LEAGUE'?'FREE':this.facilityCategory||'CLASSIC',state=this.manager.getFacilityState(kind,category),run=state.run,enemy=this.manager.getFacilityOpponent(kind,category),name=kind==='LEAGUE'?'Liga da Glória Eterna':'Torre de Batalha';
  const available=this.manager.canChallenge(kind);
  const roster=this.manager.getRoster().filter(p=>F.allowed(p.id,category));
  const lineup=run?run.team:this.facilityRental!==null&&this.facilityRental!==undefined?F.rentals[this.facilityRental].team:this.pick;
  const rules=kind==='LEAGUE'?'Vença quatro integrantes da Elite e o campeão em sequência. Uma derrota ou sair da batalha encerra a tentativa.':'Vença para subir de andar. Uma derrota ou sair da batalha encerra a sequência; o recorde permanece. Cada categoria tem seu próprio recorde.';
  const categories=kind==='TOWER'?`<label>Categoria <select id="facilityCategory"><option value="CLASSIC" ${category==='CLASSIC'?'selected':''}>Equilibrada — sem lendários/míticos, força-base até 600, sem Mega/Primal</option><option value="FREE" ${category==='FREE'?'selected':''}>Livre — todos os Pokémon aptos do elenco</option></select></label>`:'';
  const progress=kind==='LEAGUE'?`Etapa ${run?run.round+1:1}/5 · Títulos: ${state.championships}`:`Andar ${run?run.round+1:1} · Recorde: ${state.best} vitórias`;
  const selection=run?`<p>Equipe e preparação fixadas nesta sequência. Para mudar, encerre a tentativa.</p>${team(lineup)}<button id="facilityNext" class="campaign-primary" ${available?'':'disabled'}>Enfrentar ${esc(enemy.name)}</button><button id="facilityAbandon" class="campaign-secondary">Encerrar sequência</button>`:
   `<h3>Use seu elenco ou uma equipe emprestada</h3><p>Emprestados são temporários: não entram no elenco nem liberam capturas.</p><button class="campaign-secondary" data-rental="own">Usar meu elenco</button>${F.rentals.map((d,i)=>`<button class="campaign-secondary" data-rental="${i}" aria-pressed="${this.facilityRental===i}">${esc(d.name)} · emprestada</button>`).join('')}${this.facilityRental!==null&&this.facilityRental!==undefined?team(lineup):`<p>Selecione três. O primeiro será o líder.</p><div class="campaign-grid">${roster.map(p=>this.card(p,this.pick.includes(p.id))).join('')}</div>`}<div id="pickerActionBar"><button id="startCampaignBattle" class="campaign-primary" ${lineup.length===3&&available?'':'disabled'}>Iniciar sequência</button></div>`;
  this.container.innerHTML=`<section class="campaign-shell campaign-facilities"><button id="facilityBack" class="campaign-secondary">← Voltar à campanha</button><div class="campaign-hero"><p class="eyebrow">REGIÃO DA GLÓRIA ETERNA</p><h2>${name}</h2><p>${rules}</p><p>3 contra 3 · HP, PP e condições restaurados antes de cada luta · uma mecânica especial por equipe por luta.</p><p>Vitórias rendem recordes e reconhecimento, sem duplicar Pokémon de recompensa.</p>${categories}<strong>${progress}</strong>${kind==='LEAGUE'&&state.championships?'<p>🏆 Campeão da Glória Eterna</p>':''}${kind==='TOWER'&&state.best>=10?'<p>🏅 Veterano da Torre · 10 ou mais vitórias</p>':''}</div><section class="campaign-hero"><h3>Próximo adversário: ${esc(enemy.name)}</h3>${team(enemy.team)}</section>${selection}<p id="facilityError" role="alert"></p></section>`;
  this.container.querySelector('#facilityBack').onclick=()=>{this.pending=null;this.pick=[];this.render();};
  this.container.querySelector('#facilityCategory')?.addEventListener('change',event=>{this.facilityCategory=event.target.value;this.pick=[];this.facilityRental=null;this.render();});
  this.container.querySelectorAll('[data-rental]').forEach(button=>button.onclick=()=>{this.facilityRental=button.dataset.rental==='own'?null:Number(button.dataset.rental);this.pick=[];this.render();});
  this.container.querySelectorAll('.campaign-mon[data-id]').forEach(button=>button.onclick=()=>{const id=Number(button.dataset.id);this.pick=this.pick.includes(id)?this.pick.filter(n=>n!==id):this.pick.length<3?[...this.pick,id]:this.pick;this.render();});
  const launch=async button=>{button.disabled=true;try{if(!run){const result=this.manager.startFacilityRun(kind,this.pick,{category,rental:this.facilityRental});if(!result.ok)throw Error('Escolha três Pokémon válidos ou uma equipe emprestada.');}await this.coordinator.start(kind,category,lineup,{category});this.pending=null;this.pick=[];window.switchAppTab?.('battle');}catch(error){this.render();const feedback=this.container.querySelector('#facilityError');if(feedback)feedback.textContent=error.message;}};
  for(const id of ['#facilityNext','#startCampaignBattle']){const button=this.container.querySelector(id);if(button)button.onclick=()=>launch(button);}
  const abandon=this.container.querySelector('#facilityAbandon');if(abandon)abandon.onclick=()=>{this.manager.abandonFacilityRun(kind,category);this.pick=[];this.render();};
 };
 const complete=View.prototype.renderComplete;
 View.prototype.renderComplete=function(){complete.call(this);if(!this.manager.getState().shadowTrainer?.defeated)return;
  const state=this.manager.getState().facilities;
  this.container.insertAdjacentHTML?.('beforeend',`<section class="campaign-shell"><div class="campaign-hero"><h2>Liga e Torre da Glória Eterna</h2><p>Liga: ${state.league.championships} títulos · Torre Equilibrada: ${state.tower.CLASSIC.best} · Torre Livre: ${state.tower.FREE.best}</p><button class="campaign-primary" data-facility="LEAGUE">Liga — Elite e campeão</button><button class="campaign-secondary" data-facility="TOWER">Torre de Batalha</button></div></section>`);
  this.container.querySelectorAll('[data-facility]').forEach(button=>button.onclick=()=>this.openFacility(button.dataset.facility));
 };
})();
