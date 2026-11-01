/* Two active positions with action-aware controls and battle-local selections. */
(function () {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const title = value => String(value || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const statuses = {poison:'Envenenado',toxic:'Veneno grave',burn:'Queimado',paralysis:'Paralisado',sleep:'Dormindo',freeze:'Congelado'};
  const fields = {sun:'Sol intenso',rain:'Chuva',sand:'Tempestade de areia',snow:'Neve',hail:'Granizo',electric:'Terreno elétrico',grassy:'Terreno de grama',misty:'Terreno de névoa',psychic:'Terreno psíquico'};
  function install(View, C) {
    const Engine = typeof module !== 'undefined' && module.exports ? require('../battle/battle-engine.js') : window.PBABattle.BattleEngine;
    const Arenas = typeof module !== 'undefined' && module.exports ? require('../arena/type-arena-registry.js') : window.PBATypeArena;
    const ready = View.prototype.renderReadyView, active = View.prototype.renderActiveBattleView;
    View.prototype.renderReadyView = function (data = {}) {
      ready.call(this, data);
      if (this.sessionController?.sessionOptions?.metadata?.mode === 'CAMPAIGN') return;
      this.container?.querySelector?.('#btnStartBattle')?.insertAdjacentHTML?.('afterend', '<button id="btnStartDoubles" class="btn-battle-action-primary" onclick="window.battleSessionController.startDoublesBattle()">Jogar em duplas · dois Pokémon em campo</button>');
    };
    View.prototype.renderActiveBattleView = function (state, phase) {
      if (state?.battleFormat !== 'DOUBLES') return active.call(this, state, phase);
      this.renderDoublesBattleView(state, phase);
    };
    View.prototype.showDoublesError = function (message) {
      const error = this.container?.querySelector?.('#doublesError');
      if (error) { error.textContent = message; error.hidden = !message; if (message) error.focus?.(); }
      else if (message) this.displayMessage?.(message);
    };
    View.prototype.renderDoublesBattleView = function (state, phase) {
      const resolving = phase === 'RESOLVING', pending = state.status === 'AWAITING_REPLACEMENT';
      const live = role => state[role].activeIndices.map((index, slot) => ({index, slot, mon:state[role].team[index]}));
      const reserves = Engine.doublesBench(state, 'player');
      if (this._duoDraftBattle !== this.sessionController?.currentBattleId) this._duoDrafts = {};
      this._duoDraftBattle = this.sessionController?.currentBattleId;
      this._duoDrafts ||= {};
      const option = (value, label, selected) => `<option value="${esc(value)}" ${value === selected ? 'selected' : ''}>${esc(label)}</option>`;
      const metadata = this.sessionController?.sessionOptions?.metadata || state.metadata;
      const resolved = Arenas.resolveArenaTheme(metadata);
      const theme = resolved.backgroundSrc ? resolved : Arenas.ARENA_CATALOG.normal;
      this.currentArenaTheme = theme;
      const hud = (position, role) => {
        const mon = position.mon, hp = Math.max(0,mon.currentHp), percent = hp/mon.maxHp*100;
        const condition = hp === 0 ? 'Fora de combate' : mon.commanding ? 'Dentro de Dondozo' : mon.commanderSource ? 'Commander' : statuses[mon.statusCondition] || '';
        return `<article data-duo-hud="${role}:${position.slot}" class="duo-hud ${hp === 0 ? 'is-fainted' : ''}" aria-label="${role === 'player' ? 'Seu Pokémon' : 'Adversário'} ${position.slot+1}: ${esc(title(mon.name))}"><div class="duo-hud-title"><span class="duo-position">${position.slot+1}</span><h3>${esc(title(mon.name))}</h3><span class="duo-level">Nv. ${mon.level || 50}</span></div><div class="doubles-vitals"><label for="doublesHp_${role}_${position.slot}">HP</label><progress id="doublesHp_${role}_${position.slot}" class="${percent <= 20 ? 'hp-danger' : percent <= 50 ? 'hp-warning' : ''}" value="${hp}" max="${mon.maxHp}"></progress><span id="doublesHpText_${role}_${position.slot}">${hp}/${mon.maxHp}</span></div><p class="duo-condition" id="duoCondition_${role}_${position.slot}">${esc(condition)}${mon.dynamax ? ' · Dynamax '+mon.dynamax.turns : mon.tera ? ' · Tera '+esc(mon.tera) : ''}</p></article>`;
      };
      const sprite = (position,role) => {
        const mon = position.mon, visual = this.resolveCombatantVisual(mon,role);
        return `<div class="duo-combatant duo-${role} duo-slot-${position.slot} ${mon.currentHp <= 0 ? 'is-fainted' : ''} ${mon.commanding ? 'is-commanding' : ''}" data-doubles-position="${role}:${position.slot}" data-semi-state="${esc(mon.twoTurnMove?.state || '')}" id="duoCombatant_${role}_${position.slot}"><span class="duo-ground" aria-hidden="true"></span><span class="duo-sprite-facing"><img class="combatant-sprite-img" src="${esc(visual.spriteUrl)}" data-fallback-src="${esc(visual.artworkUrl)}" data-static-src="${esc(visual.staticSprite)}" onerror="if(this.src!==this.dataset.fallbackSrc){this.src=this.dataset.fallbackSrc;}else if(this.src!==this.dataset.staticSrc){this.src=this.dataset.staticSrc;}else{this.onerror=null;}" alt="${esc(title(mon.name))}"></span><span class="duo-sprite-label">${position.slot+1} · ${esc(title(mon.name))}</span></div>`;
      };
      const arena = `<div class="duo-battlefield ${theme.themeClass}" id="battleCameraWrapper" data-battle-camera><div class="battle-stage duo-stage ${theme.themeClass}" id="battleStage" data-battle-stage role="group" aria-label="Arena de batalha em duplas"><div class="arena-backdrop" aria-hidden="true"></div><div class="arena-ambient-container" id="arenaAmbientContainer" aria-hidden="true"></div>${live('enemy').map(p=>sprite(p,'enemy')).join('')}${live('player').map(p=>sprite(p,'player')).join('')}<div class="battle-vfx-container" id="battleVfxContainer" data-vfx-container></div><div class="hit-flash-overlay" id="battleHitFlash" data-camera-flash></div></div><div class="duo-huds duo-enemy-huds" aria-label="Adversários">${live('enemy').map(p=>hud(p,'enemy')).join('')}</div><div class="duo-huds duo-player-huds" aria-label="Sua equipe">${live('player').map(p=>hud(p,'player')).join('')}</div><span class="duo-arena-label" aria-hidden="true">BATTLE ARENA · 2 × 2</span></div>`;
      const rows = live('player').filter(p => p.mon.currentHp > 0 && !p.mon.commanding).map(p => {
        const mon = p.mon, draft = this._duoDrafts[mon.id] || {}, forced = mon.twoTurnMove?.id || mon.lockedMove?.id || (mon.bideState ? 117 : null);
        const legalMoves = forced ? mon.moves.filter(m => m.id === forced) : mon.moves.filter(m => m.currentPp > 0 && C.P7.legalMove(mon, m));
        const choices = mon.rechargeMoveId ? option('recharge','Recarregar energia',draft.action) : (legalMoves.length ? legalMoves.map(m => option('move:'+m.id,(forced ? 'Continuar ' : '')+title(C.P8.activeMove(mon,m,C).name)+' · PP '+m.currentPp+'/'+m.maxPp,draft.action)).join('') : option('move:165','Struggle',draft.action));
        const firstId = forced || legalMoves[0]?.id || 165;
        const info = Engine.doublesActionInfo(state,'player',p.slot,{type:'MOVE',moveId:firstId});
        const switches = info?.canSwitch ? reserves.map(b => option('switch:'+b.mon.id,'Trocar por '+title(b.mon.name)+' · HP '+b.mon.currentHp+'/'+b.mon.maxHp,draft.action)).join('') : '';
        const preview = {...state,player:{...state.player,activeIndex:p.index}};
        const gimmicks = ['dynamax','tera','z'].filter(kind => C.P8.canActivate(preview,'player',kind)).map(kind => option(kind,kind === 'tera' ? 'Tera '+mon.teraType : kind === 'z' ? 'Golpe Z' : 'Dynamax',draft.special)).join('');
        return `<fieldset data-duo-controls="${p.slot}" ${resolving ? 'disabled' : ''}><legend><span class="duo-position">${p.slot+1}</span> ${esc(title(mon.name))}</legend><label>Ação <select data-duo-action="${p.slot}" aria-label="Ação de ${esc(title(mon.name))}">${choices}${switches}</select></label><p class="duo-action-hint" data-duo-hint="${p.slot}" aria-live="polite"></p><label>Alvo <select data-duo-target="${p.slot}" aria-label="Alvo de ${esc(title(mon.name))}"></select></label><label data-duo-pivot-field="${p.slot}" hidden>Reserva após o movimento <select data-duo-pivot="${p.slot}" aria-label="Reserva para ${esc(title(mon.name))}">${reserves.map(b => option(String(b.mon.id),title(b.mon.name)+' · HP '+b.mon.currentHp+'/'+b.mon.maxHp,draft.pivot)).join('')}</select></label>${gimmicks ? `<label>Mecânica especial <select data-duo-special="${p.slot}" aria-label="Mecânica de ${esc(title(mon.name))}">${option('','Batalhar normalmente',draft.special)}${gimmicks}</select></label>` : ''}</fieldset>`;
      }).join('');
      const replacements = (state.pendingDoublesReplacements || []).filter(p => p.role === 'player').map(p => `<label>Substituir posição ${p.slot+1}<select data-duo-replacement="${p.slot}">${option('','Escolha uma reserva','')}${reserves.map(b => option(String(b.mon.id),title(b.mon.name)+' · HP '+b.mon.currentHp+'/'+b.mon.maxHp,'')).join('')}</select></label>`).join('');
      const fieldText = ['weather','terrain'].filter(key => state[key]).map(key => (fields[state[key].id] || state[key].id)+' · '+state[key].turns+' turnos').join(' / ');
      this.container.innerHTML = `<section class="battle-view-container doubles-arena"><header class="doubles-header"><div><span class="duo-eyebrow">BATTLE ARENA · DUPLAS</span><h2>Batalha em duplas</h2><p>Escolha uma ação para cada Pokémon. Os alvos automáticos são indicados abaixo.</p></div><span class="duo-turn">Turno ${state.turn}</span></header>${arena}${fieldText ? `<p class="duo-field" role="status">${esc(fieldText)}</p>` : ''}<div class="doubles-controls">${pending ? replacements : rows}</div><p id="doublesError" role="alert" tabindex="-1" hidden></p><div class="doubles-actions"><button id="btnDoublesSubmit" class="btn-battle-action-primary" ${resolving ? 'disabled' : ''}>${resolving ? 'Resolvendo…' : pending ? 'Confirmar substituições' : 'Resolver turno'}</button><button class="btn-battle-action" id="btnDoublesLeave" ${resolving ? 'disabled' : ''}>Sair da batalha</button><p id="battleNarrativeBox" aria-live="polite">${resolving ? 'Resolvendo as ações…' : pending ? 'Escolha quem entrará na posição vazia.' : 'Aguardando suas escolhas.'}</p></div></section>`;
      const query = selector => this.container.querySelector?.(selector);
      const stage = query('#battleStage');
      if (stage) this.arenaController?.mount(stage,theme);
      this.syncDoublesRegistries(state);
      const elements = selector => Array.from(this.container.querySelectorAll?.(selector) || []);
      const read = select => { const [kind,id] = select.value.split(':'); return kind === 'switch' ? {type:'SWITCH',targetPokemonId:Number(id)} : kind === 'recharge' ? {type:'RECHARGE'} : {type:'MOVE',moveId:Number(id)}; };
      const update = select => {
        const slot = Number(select.dataset.duoAction), mon = state.player.team[state.player.activeIndices[slot]], command = read(select), special = query(`[data-duo-special="${slot}"]`), target = query(`[data-duo-target="${slot}"]`), hint = query(`[data-duo-hint="${slot}"]`), pivot = query(`[data-duo-pivot="${slot}"]`), pivotField = query(`[data-duo-pivot-field="${slot}"]`);
        if (special && command.type !== 'MOVE') special.value = '';
        if (special) special.disabled = resolving || command.type !== 'MOVE';
        let info;
        try { info = Engine.doublesActionInfo(state,'player',slot,{...command,...(special?.value ? {special:special.value} : {})}); }
        catch (error) { this.showDoublesError(error.message); info = Engine.doublesActionInfo(state,'player',slot,command); }
        if (!info) return;
        const draft = this._duoDrafts[mon.id] || {}, selected = target?.value || draft.target;
        const automatic = {switch:'Não se aplica à troca',recharge:'Recarregar energia',self:'O próprio Pokémon',field:'Campo de batalha','all-foes':'Todos os adversários','all-others':'Todos os outros Pokémon',random:'Adversário aleatório'}[info.mode];
        if (target) {
          const choices = automatic ? [['auto',automatic]] : [...live('enemy').filter(p => p.mon.currentHp > 0 && !p.mon.commanding).map(p => ['enemy:'+p.slot,'Adversário '+(p.slot+1)+': '+title(p.mon.name)]),...live('player').filter(p => p.slot !== slot && p.mon.currentHp > 0 && !p.mon.commanding).map(p => ['player:'+p.slot,(info.move?.id === 676 ? 'Curar aliado ' : 'Aliado ')+(p.slot+1)+': '+title(p.mon.name)])];
          target.innerHTML = choices.map(([value,label]) => option(value,label,selected)).join('');
          target.value = choices.some(c => c[0] === selected) ? selected : choices[0]?.[0] || '';
          target.disabled = resolving || Boolean(automatic);
        }
        if (pivotField) pivotField.hidden = !info.pivot || !reserves.length;
        if (pivot) pivot.disabled = resolving || !info.pivot || !reserves.length;
        if (hint) hint.textContent = info.mode === 'switch' ? 'A troca acontece antes dos ataques.' : info.mode === 'recharge' ? 'Descanso obrigatório neste turno.' : (info.move ? title(info.move.type)+' · '+(info.move.damageClass === 'status' ? 'Status' : info.move.power ? 'Poder '+info.move.power : 'Poder variável') : '')+(info.pivot && reserves.length ? ' · Escolha quem entra após o movimento.' : '')+(info.move?.id === 676 && target?.value.startsWith('player:') ? ' · Recupera metade do HP máximo do aliado.' : info.mode === 'all-others' ? ' · Também atinge seu aliado.' : '');
        this._duoDrafts[mon.id] = {action:select.value,target:target?.value,pivot:pivot?.value,special:special?.value || ''};
      };
      for (const select of elements('[data-duo-action]')) {
        const slot = select.dataset.duoAction;
        select.onchange = () => { this.showDoublesError(''); update(select); };
        for (const prefix of ['target','special','pivot']) { const field = query(`[data-duo-${prefix}="${slot}"]`); if (field) field.onchange = () => { this.showDoublesError(''); update(select); }; }
        update(select);
      }
      const button = query('#btnDoublesSubmit');
      if (button) button.onclick = () => {
        if (resolving || this.sessionController?.isResolving) return;
        try {
          this.showDoublesError('');
          if (pending) {
            const choices = {}, claimed = new Set();
            for (const field of elements('[data-duo-replacement]')) { const id = Number(field.value); if (!id || !reserves.some(b => b.mon.id === id)) throw Error('Escolha uma reserva para cada posição vazia.'); if (claimed.has(id)) throw Error('Escolha reservas diferentes para cada posição.'); claimed.add(id); choices[Number(field.dataset.duoReplacement)] = id; }
            this.sessionController.submitDoublesReplacement(choices); return;
          }
          const actions = {}, claimed = new Set(); let specials = 0;
          for (const select of elements('[data-duo-action]')) {
            const slot = Number(select.dataset.duoAction), command = read(select), special = query(`[data-duo-special="${slot}"]`)?.value;
            if (command.type === 'MOVE' && special) { command.special = special; specials++; }
            const info = Engine.doublesActionInfo(state,'player',slot,command), target = query(`[data-duo-target="${slot}"]`);
            if (command.type === 'MOVE' && info?.mode === 'single') { if (!target?.value || target.value === 'auto') throw Error('Escolha o alvo do golpe.'); const [role,position] = target.value.split(':'); command.targetRole = role; command.targetSlot = Number(position); }
            if (command.type === 'MOVE' && info?.pivot && reserves.length) command.pivotTargetPokemonId = Number(query(`[data-duo-pivot="${slot}"]`)?.value);
            const reserve = command.type === 'SWITCH' ? command.targetPokemonId : command.pivotTargetPokemonId;
            if (reserve !== undefined) { if (!reserves.some(b => b.mon.id === reserve)) throw Error('Escolha uma reserva disponível.'); if (claimed.has(reserve)) throw Error('Duas ações não podem escolher a mesma reserva.'); claimed.add(reserve); }
            actions[slot] = command;
          }
          if (specials > 1) throw Error('Escolha apenas uma mecânica especial para a equipe.');
          this.sessionController.submitDoublesTurn(actions);
        } catch (error) { this.showDoublesError(error.message); }
      };
      const leave = query('#btnDoublesLeave'); if (leave) leave.onclick = () => { if (!resolving && !this.sessionController?.isResolving) this.sessionController.abandonBattle(); };
    };
    View.prototype.updateDoublesCombatant = function (command) {
      const role = command.side, slot = command.targetSlot, hud = this.container?.querySelector(`[data-duo-hud="${role}:${slot}"]`), target = this.container?.querySelector(`#duoCombatant_${role}_${slot}`);
      if (target) { target.classList.remove('is-fainted','is-commanding'); const label = target.querySelector('.duo-sprite-label'); if (label) label.textContent = `${slot+1} · ${title(command.pokemonName)}`; }
      if (hud) { hud.classList.remove('is-fainted'); const name = hud.querySelector('h3'),condition = hud.querySelector('.duo-condition'); if (name) name.textContent = title(command.pokemonName); if (condition) condition.textContent = ''; hud.setAttribute('aria-label',`${role === 'player' ? 'Seu Pokémon' : 'Adversário'} ${slot+1}: ${title(command.pokemonName)}`); }
      if (command.currentHp !== undefined) this.updateDoublesHpBar(role,slot,command.currentHp,command.maxHp);
    };
    View.prototype.syncDoublesRegistries = function (state) {
      const adapter = this.sessionController?.compositeAdapter;
      if (!adapter || !this.container?.querySelector) return;
      const query = selector => this.container.querySelector(selector), stage = query('#battleStage');
      if (!stage) return;
      adapter.pokemonController?.reset();
      adapter.pokemonController?.registry?.clear();
      adapter.vfxController?.reset();
      adapter.vfxController?.registry?.registerStage(stage);
      for (const role of ['player','enemy']) for (const [slot,index] of state[role].activeIndices.entries()) {
        const mon = state[role].team[index], target = query(`#duoCombatant_${role}_${slot}`), sprite = target?.querySelector('img'), key = `${role}:${slot}`;
        if (!target || !sprite) continue;
        adapter.pokemonController?.registry?.register(key,{container:target,sprite,metadata:this.resolveCombatantVisual(mon,role)});
        adapter.vfxController?.registry?.registerTarget(key,target);
        if (mon.currentHp > 0 && !mon.commanding) adapter.pokemonController?.startIdle(key);
      }
      const camera = adapter.cameraController?.registry;
      camera?.registerCamera(query('#battleCameraWrapper'));
      camera?.registerStage(stage);
      camera?.registerFlashOverlay(query('#battleHitFlash'));
      adapter.statusController?.syncFromBattleState(state);
    };
    View.prototype.updateDoublesHpBar = function (role, slot, hp, max) {
      if (typeof document === 'undefined') return;
      const progress = document.getElementById(`doublesHp_${role}_${slot}`), label = document.getElementById(`doublesHpText_${role}_${slot}`);
      if (progress) { progress.value = hp; if (max) progress.max = max; progress.classList.toggle('hp-danger',hp/progress.max <= .2); progress.classList.toggle('hp-warning',hp/progress.max > .2 && hp/progress.max <= .5); }
      const combatant = document.getElementById(`duoCombatant_${role}_${slot}`);
      if (combatant) { combatant.classList.toggle('is-fainted',hp <= 0); }
      if (label) label.textContent = hp+'/'+(max || progress?.max || '');
    };
  }
  const api = {install};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else window.PBADoublesView = api;
})();
