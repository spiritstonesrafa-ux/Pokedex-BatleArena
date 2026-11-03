(function () {
  'use strict';

  const View = typeof module !== 'undefined' && module.exports
    ? require('./campaign-view.js').CampaignView : window.PBACampaign?.CampaignView;
  const Catalog = typeof module !== 'undefined' && module.exports
    ? require('./campaign-catalog.js') : window.PBACampaign;
  const Wild = typeof module !== 'undefined' && module.exports
    ? require('./campaign-wild-encounters.js') : window.PBACampaign?.CampaignWildEncounters;
  const Audio = typeof module !== 'undefined' && module.exports
    ? require('./campaign-wild-audio.js') : window.PBACampaign?.CampaignWildAudio;
  if (!View) return;

  const previousComplete = View.prototype.renderComplete;
  View.prototype.renderComplete = function () {
    previousComplete.call(this);
    const button = document.createElement('button');
    button.id = 'campaignExploreCollection';
    button.className = 'campaign-primary';
    button.textContent = 'Continuar explorando e completar a coleção';
    button.onclick = () => { this._collectionExploration = true; this.renderHome(); };
    this.container.appendChild(button);
  };
  const previousRender = View.prototype.render;
  const previousHome = View.prototype.renderHome;
  const previousPicker = View.prototype.renderPicker;
  const cap = name => String(name || '').replace(/-/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
  const getAudioController = view => view.coordinator?.session?.compositeAdapter?.audioController;
  const soundButton = () => `<button id="wildSoundToggle" class="wild-sound-toggle" type="button"
    aria-pressed="${Audio?.isEnabled?.() !== false}"
    aria-label="${Audio?.isEnabled?.() === false ? 'Ativar efeitos dos encontros' : 'Silenciar efeitos dos encontros'}">
    ${Audio?.isEnabled?.() === false ? '♪ Som desligado' : '♪ Som ligado'}
  </button>`;
  const bindSoundButton = view => {
    const button = view.container.querySelector('#wildSoundToggle');
    if (!button || !Audio) return;
    button.onclick = () => {
      const enabled = Audio.setEnabled(!Audio.isEnabled());
      button.setAttribute?.('aria-pressed', String(enabled));
      button.setAttribute?.('aria-label', enabled ? 'Silenciar efeitos dos encontros' : 'Ativar efeitos dos encontros');
      button.textContent = enabled ? '♪ Som ligado' : '♪ Som desligado';
      if (enabled) Audio.playCue(getAudioController(view), 'ENCOUNTER');
    };
  };
  const focusHeading = (view, key) => {
    if (view._wildFocusedKey === key || view.container?.offsetParent == null) return;
    const heading = view.container.querySelector('#wildScreenHeading');
    if (typeof heading?.focus === 'function') {
      view._wildFocusedKey = key;
      heading.focus({ preventScroll: true });
    }
  };

  View.prototype.render = function () {
    if (!this.container) return;
    if (this._wildCaptureAnimating) return;
    const wild = this.manager.getState().wild;
    if (wild?.pendingCapture) {
      this.pending = null;
      this.mapView?.destroy?.();
      return this.renderWildCapture(wild.pendingCapture);
    }
    if (wild?.result) {
      this.pending = null;
      this.mapView?.destroy?.();
      return this.renderWildResult(wild.result);
    }
    if (wild?.active && (!this.pending || this.pending.kind === 'WILD')) {
      this.pending = { kind: 'WILD', id: wild.active.pokemonId };
    } else if (!wild?.active && this.pending?.kind === 'WILD') {
      this.pending = null;
    }
    if (this.manager.getState().status === 'COMPLETED' && (this._collectionExploration || wild?.active)) {
      this._collectionExploration = true;
      return this.pending ? this.renderPicker() : this.renderHome();
    }
    return previousRender.call(this);
  };

  View.prototype.renderHome = function () {
    previousHome.call(this);
    if (this.mapView) {
      this.mapView.onWildEncounter = (regionId, pointId) => {
        const result = this.manager.beginWildEncounter(regionId, undefined, pointId);
        if (!result.ok) {
          this.mapView?.announce?.('Encontro indisponível no momento.');
        } else if (!result.resumed) {
          Audio?.playCue?.(getAudioController(this), 'ENCOUNTER');
        }
      };
    }
  };

  View.prototype.renderPicker = function () {
    if (this.pending?.kind !== 'WILD') return previousPicker.call(this);
    const wild = this.manager.getState().wild;
    const pokemon = Catalog.byId(wild?.active?.pokemonId);
    if (!pokemon) {
      this.pending = null;
      this.manager.cancelWildEncounter();
      return;
    }
    if (pokemon.collectionOnly) {
      this.container.innerHTML = `<section class="campaign-shell wild-encounter-screen" data-region="${wild.active.regionId}">
        <button id="collectionBack" class="campaign-secondary">Deixar ir e explorar novamente</button>
        <div class="campaign-hero"><p class="eyebrow">ENCONTRO DE COLEÇÃO</p>
        <h2 id="wildScreenHeading" tabindex="-1">Um ${cap(pokemon.name)} apareceu!</h2>
        <img src="${pokemon.sprite}" alt="${cap(pokemon.name)}" width="160" height="160">
        <p>Você pode capturá-lo para sua coleção. Este Pokémon não participa de batalhas.</p></div>
        <div class="picker-action-bar wild-picker-action-bar" id="pickerActionBar"><button id="collectionCapture" class="campaign-primary ready-to-battle"><i class="fa-solid fa-circle-check"></i> Tentar capturar</button></div></section>`;
      this.container.querySelector('#collectionBack').onclick = () => { this.pending = null; this.manager.cancelWildEncounter(); this.render(); };
      this.container.querySelector('#collectionCapture').onclick = () => this.manager.prepareWildCollectionCapture();
      focusHeading(this, 'collection:' + wild.active.encounterId);
      return;
    }
    const roster = this.manager.getRoster();
    const ready = this.pick.length === 3;
    const region = Wild.REGIONS[wild.active.regionId];
    const point = Wild.getPoint(wild.active.regionId, wild.active.pointId);
    const rarity = Wild.getRarity(wild.active.regionId, pokemon.id, wild.active.pointId, this.manager.getState());
    const rarityLabel = {
      COMMON: 'COMUM', UNCOMMON: 'INCOMUM', RARE: 'RARO',
      LEGENDARY: 'LENDÁRIO', MYTHICAL: 'MÍTICO'
    }[rarity] || 'DESCONHECIDA';
    const rarityHint = {
      COMMON: '45%', UNCOMMON: '25%', RARE: '20%',
      LEGENDARY: '10%', MYTHICAL: '10%'
    }[rarity] || '';
    const rarityFrequency = rarity === 'LEGENDARY' || rarity === 'MYTHICAL'
      ? `${Wild.getSpecialEncounterChance(this.manager.getState())*100}% dos encontros (lendários e míticos juntos)`
      : Wild.getSpecialEncounterChance(this.manager.getState())===.5 ? 'Parte dos 50% de encontros comuns, incomuns e raros' : rarityHint + ' dos encontros';
    this.container.innerHTML = `
      <section class="campaign-shell wild-encounter-screen" data-region="${wild.active.regionId}">
        <button id="pickerBack" class="campaign-secondary" type="button">← Deixar ir e explorar novamente</button>
        ${soundButton()}
        <div class="campaign-hero wild-encounter-hero" data-region="${wild.active.regionId}">
          <p class="eyebrow">ENCONTRO SELVAGEM · ${region.name.toUpperCase()}</p>
          <h2 id="wildScreenHeading" tabindex="-1">Um ${cap(pokemon.name)} apareceu!</h2>
          <div class="wild-encounter-preview" aria-hidden="true">
            <img src="${pokemon.sprite}" alt="" width="112" height="112">
          </div>
          <p class="wild-encounter-location">Local: ${point?.name || region.biome}</p>
          <p class="wild-rarity-badge wild-rarity-badge--${rarity?.toLowerCase() || 'unknown'}"
             aria-label="Raridade: ${rarityLabel.toLowerCase()}. Frequência-base: ${rarityFrequency}">
            RARIDADE: ${rarityLabel} <span>${rarityFrequency}</span>
          </p>
          <p>Você pode deixar este Pokémon ir e explorar novamente, ou enfrentá-lo com 3 Pokémon contra 1 para tentar capturá-lo.</p>
        </div>
        <div class="campaign-hero picker-choice">
          <div class="picker-header-block">
            <h2 class="picker-main-title">Escolha 3 Pokémon</h2>
            <p class="picker-subtitle"><i class="fa-solid fa-crown"></i> O primeiro selecionado será o líder.</p>
          </div>
          <div class="picker-counter-badge ${ready ? 'is-ready' : ''}" role="status" aria-live="polite">
            <span class="counter-num">${this.pick.length}/3</span> selecionados
          </div>
        </div>
        <div class="campaign-grid draft-grid">
          ${roster.map(member => this.card(member, this.pick.includes(member.id))).join('')}
        </div>
        <div class="picker-action-bar compact-picker-dock wild-picker-action-bar" id="pickerActionBar">
          <div class="picker-dock-info">
            <i class="fa-solid fa-users"></i>
            <span>Equipe: <strong>${this.pick.length}/3</strong></span>
          </div>
          <button id="startCampaignBattle" class="campaign-primary picker-dock-btn ${ready ? 'ready-to-battle' : ''}" type="button" ${ready ? '' : 'disabled'}>
            ${ready ? '<i class="fa-solid fa-play"></i> ENFRENTAR PARA TENTAR CAPTURAR' : `<i class="fa-solid fa-lock"></i> Enfrentar para tentar capturar (${this.pick.length}/3)`}
          </button>
        </div>
      </section>`;
    bindSoundButton(this);
    focusHeading(this, 'encounter:' + wild.active.encounterId);
    if (typeof this.enhanceMobilePicker === 'function') {
      try {
        this.enhanceMobilePicker();
      } catch (error) {
        console.error('[Campaign Mobile UI] Failed to enhance wild encounter picker; using standard campaign picker.', error);
      }
    }
    const wildBack = this.container.querySelector('#pickerBack');
    if (wildBack) {
      wildBack.onclick = () => {
        if (typeof document !== 'undefined' && document.body) {
          document.body.classList.remove('campaign-mobile-open');
        }
        this._activeMobileTab = 'team';
        this.pending = null;
        this.pick = [];
        this.manager.cancelWildEncounter();
      };
    }
    this.container.querySelectorAll('.draft-grid .campaign-mon').forEach(button => {
      button.onclick = () => {
        const id = Number(button.dataset.id);
        this.pick = this.pick.includes(id)
          ? this.pick.filter(value => value !== id)
          : (this.pick.length < 3 ? [...this.pick, id] : this.pick);
        this.render();
      };
    });
    const startBtn = this.container.querySelector('#startCampaignBattle');
    if (startBtn) {
      startBtn.onclick = async () => {
        if (this.pick.length !== 3 || this._startingBattle) return;
        this._startingBattle = true;
        startBtn.disabled = true;
        const originalText = startBtn.innerHTML;
        startBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Iniciando batalha...';
        try {
          await this.coordinator.start('WILD', pokemon.id, this.pick);
          this.pending = null;
          this._startingBattle = false;
          window.switchAppTab('battle');
        } catch (error) {
          this._startingBattle = false;
          startBtn.disabled = false;
          startBtn.innerHTML = originalText;
          alert(error.message);
        }
      };
    }
  };

  View.prototype.renderWildCapture = function (pending) {
    const pokemon = Catalog.byId(pending.pokemonId);
    if (!pokemon) return;
    const regionId = pending.regionId || 'region-1';
    const isCollection = Boolean(pokemon.collectionOnly);

    this.container.innerHTML = `
      <section class="campaign-shell wild-capture-screen" data-region="${regionId}">
        <header class="wild-capture-header">
          <div class="wild-capture-header__left">
            <span class="wild-capture-chip-mode">
              <i class="fa-solid fa-sparkles" aria-hidden="true"></i> ${isCollection ? 'COLEÇÃO' : 'ENCONTRO SELVAGEM'}
            </span>
            <h2 id="wildScreenHeading" class="wild-capture-title" tabindex="-1">
              ${cap(pokemon.name)}
            </h2>
          </div>
          <div class="wild-capture-header__center">
            <span class="wild-capture-chance-pill" title="Chance de captura nesta tentativa">
              <i class="fa-solid fa-bullseye" aria-hidden="true"></i> <strong>${Math.round(Wild.CAPTURE_CHANCE * 100)}%</strong> de chance
            </span>
          </div>
          <div class="wild-capture-header__right">
            ${soundButton()}
          </div>
        </header>

        <div class="wild-capture-stage" data-region="${regionId}" aria-hidden="true">
          <div class="wild-capture-atmosphere">
            <div class="wild-capture-stars"></div>
            <div class="wild-capture-glow"></div>
          </div>

          <!-- TRAINER AVATAR IN FOREGROUND FACING ARENA -->
          <div class="wild-capture-trainer" id="wildCaptureTrainer">
            <div class="wild-trainer-shadow"></div>
            <div class="wild-trainer-visual">
              <img src="assets/images/campaign/player-traveler-up-a.png"
                   alt="Você"
                   class="wild-trainer-sprite wild-trainer-sprite--idle"
                   draggable="false">
              <img src="assets/images/campaign/player-traveler-up-b.png"
                   alt="Você arremessando"
                   class="wild-trainer-sprite wild-trainer-sprite--throw"
                   draggable="false">
              <div class="wild-trainer-throw-fx"></div>
            </div>
          </div>

          <div class="wild-capture-platform">
            <div class="wild-capture-platform-ring"></div>
            <div class="wild-capture-shadow"></div>
          </div>
          <div class="wild-capture-target">
            <img src="${pokemon.sprite}" alt="${cap(pokemon.name)}" width="128" height="128" class="wild-target-sprite">
          </div>
          <div class="wild-capture-beam"></div>
          <div class="wild-pokeball">
            <span class="wild-pokeball__top"></span>
            <span class="wild-pokeball__button"></span>
          </div>
          <div class="wild-capture-sparkles"></div>
          <div class="wild-capture-smoke"></div>
        </div>

        <footer class="wild-capture-dock">
          <div class="wild-capture-status-wrap">
            <p id="wildCaptureStatus" class="wild-capture-status" role="status" aria-live="polite">
              ${cap(pokemon.name)} está esperando. Lance a Poké Bola!
            </p>
          </div>
          <div class="wild-capture-action-wrap">
            <button id="throwWildBall" class="wild-capture-throw-btn" type="button">
              <i class="fa-solid fa-baseball" aria-hidden="true"></i>
              <span>Lançar Poké Bola</span>
            </button>
          </div>
        </footer>
      </section>`;

    bindSoundButton(this);
    focusHeading(this, 'capture:' + pending.battleId);

    const button = this.container.querySelector('#throwWildBall');
    button.onclick = () => {
      if (button.disabled) return;
      button.disabled = true;
      button.classList?.add?.('is-active');
      button.textContent = 'Captura em andamento...';

      const stage = this.container.querySelector('.wild-capture-stage');
      const status = this.container.querySelector('#wildCaptureStatus');
      const reducedMotion = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      Audio?.playCue?.(getAudioController(this), reducedMotion ? 'QUICK_THROW' : 'CAPTURE');
      if (status) status.textContent = 'Poké Bola lançada. Será que ele vai ficar?';
      this._wildCaptureAnimating = !reducedMotion;
      stage?.classList?.add('is-playing');

      const resolve = () => {
        if (this.manager.getState().wild?.pendingCapture?.battleId !== pending.battleId) {
          this._wildCaptureAnimating = false;
          this.render();
          return;
        }
        const result = this.manager.attemptWildCapture();
        if (result.ok) Audio?.playCue?.(getAudioController(this), result.captured ? 'CAUGHT' : 'ESCAPED');
        if (!this._wildCaptureAnimating || !result.ok) {
          this._wildCaptureAnimating = false;
          if (!result.ok) this.render();
          return;
        }
        stage?.classList?.add(result.captured ? 'is-caught' : 'is-escaped');
        if (status) {
          status.textContent = result.captured
            ? 'A Poké Bola ficou fechada!'
            : `${cap(pokemon.name)} escapou da Poké Bola!`;
        }
        setTimeout(() => {
          this._wildCaptureAnimating = false;
          this.render();
        }, 900);
      };

      if (reducedMotion) resolve();
      else setTimeout(resolve, 3800);
    };
  };

  View.prototype.renderWildResult = function (result) {
    const pokemon = Catalog.byId(result.pokemonId);
    if (!pokemon) return;
    const caught = result.status === 'CAUGHT';
    const lost = result.status === 'LOST';
    const regionId = result.regionId || 'region-1';

    this.container.innerHTML = `
      <section class="wild-capture-screen wild-result-screen" data-region="${regionId}">
        <div class="wild-result-card ${caught ? 'is-caught' : 'is-fled'}">
          <div class="wild-result-header">
            <p class="wild-result-eyebrow">ENCONTRO SELVAGEM</p>
            <h2 id="wildScreenHeading" class="wild-result-title" tabindex="-1">
              ${caught ? cap(pokemon.name) + ' foi capturado!' : lost ? 'Você perdeu o encontro' : cap(pokemon.name) + ' escapou!'}
            </h2>
          </div>

          <div class="wild-result-stage" aria-hidden="true">
            <div class="wild-result-spotlight"></div>
            <div class="wild-result-characters">
              <div class="wild-result-trainer ${caught ? 'is-celebrating' : 'is-disappointed'}">
                <img src="${caught ? 'assets/images/campaign/player-traveler-step-b.png' : 'assets/images/campaign/player-traveler.png'}"
                     alt="Você"
                     class="wild-result-trainer-sprite"
                     width="52" height="52"
                     draggable="false">
                <span class="wild-result-trainer-badge">VOCÊ</span>
              </div>
              <div class="wild-result-pokemon-wrap">
                <img src="${pokemon.sprite}" alt="${cap(pokemon.name)}" class="wild-result-sprite" width="120" height="120">
              </div>
            </div>
            <div class="wild-result-badge-plate">
              <span class="wild-result-badge ${caught ? 'badge-success' : 'badge-failure'}">
                ${caught ? '★ CAPTURA BEM-SUCEDIDA!' : '💨 O POKÉMON ESCAPOU!'}
              </span>
            </div>
          </div>

          <div class="wild-result-body">
            <p class="wild-result-message">
              ${caught
                ? (pokemon.collectionOnly ? 'Novo Pokémon adicionado à sua coleção da campanha.' : 'Novo Pokémon adicionado ao elenco da campanha.')
                : (lost ? 'Sua equipe não conseguiu vencer este desafio.' : 'Você poderá explorar a região novamente.')}
            </p>
            <div class="wild-result-actions">
              <button id="wildResultContinue" class="campaign-primary wild-result-btn" type="button">
                <i class="fa-solid fa-map-location-dot" aria-hidden="true"></i>
                <span>Voltar ao mapa</span>
              </button>
            </div>
          </div>
        </div>
      </section>`;

    focusHeading(this, 'result:' + result.status + ':' + result.pokemonId);
    this.container.querySelector('#wildResultContinue').onclick = () => {
      this.manager.acknowledgeWildResult();
      const pointSelector = result.pointId === Wild.defaultPointId(result.regionId)
        ? '#wildEncounterZone:not(:disabled)'
        : `#wildEncounterZone-${result.pointId}:not(:disabled)`;
      const target = this.container.querySelector(pointSelector)
        || this.container.querySelector('#tab-' + (result.regionId || 'region-1'));
      target?.focus?.({ preventScroll: true });
    };
  };
})();
