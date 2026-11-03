(function () {
  'use strict';

  class CampaignFullscreenController {
    constructor() {
      this.isActive = false;
      this.isOrientationLocked = false;
      this.hasListener = false;
      this.hasDismissedEntryPrompt = false;
      this._handleFullscreenChange = this._handleFullscreenChange.bind(this);
      this._handleOrientationChange = this._handleOrientationChange.bind(this);
    }

    init() {
      if (typeof document === 'undefined' || this.hasListener) return;
      document.addEventListener('fullscreenchange', this._handleFullscreenChange);
      document.addEventListener('webkitfullscreenchange', this._handleFullscreenChange);
      if (typeof window !== 'undefined') {
        window.addEventListener('resize', this._handleOrientationChange);
        window.addEventListener('orientationchange', this._handleOrientationChange);
      }
      this.hasListener = true;
    }

    isCampaignContext(sessionController) {
      if (sessionController && sessionController.sessionOptions?.metadata?.mode === 'CAMPAIGN') {
        return true;
      }
      if (typeof document !== 'undefined') {
        const campaignEl = document.getElementById('campaignView');
        if (campaignEl && campaignEl.style.display !== 'none') return true;
        if (document.body.classList.contains('campaign-in-battle')) return true;
      }
      return false;
    }

    shouldShowEntryPrompt() {
      if (typeof document === 'undefined') return false;
      if (this.isActive) return false;
      if (this.hasDismissedEntryPrompt) return false;
      try {
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('pba_campaign_entry_seen_v1') === 'true') {
          return false;
        }
      } catch (_) {}
      if (document.body?.classList?.contains('campaign-in-battle')) return false;
      return true;
    }

    markEntryPromptSeen() {
      this.hasDismissedEntryPrompt = true;
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('pba_campaign_entry_seen_v1', 'true');
        }
      } catch (_) {}
    }

    showEntryPrompt(options = {}) {
      if (typeof document === 'undefined') return;
      if (document.getElementById('campaignEntryModal')) return;

      const modal = document.createElement('div');
      modal.id = 'campaignEntryModal';
      modal.className = 'campaign-entry-modal-backdrop';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'campaignEntryHeading');

      modal.innerHTML = `
        <div class="campaign-entry-card" tabindex="-1">
          <div class="campaign-entry-card__glow-ring" aria-hidden="true"></div>
          <div class="campaign-entry-header">
            <p class="campaign-entry-eyebrow">CIRCUITO DOS MESTRES</p>
            <h2 id="campaignEntryHeading" class="campaign-entry-title">PRONTO PARA SUA JORNADA?</h2>
          </div>

          <div class="campaign-entry-visual" aria-hidden="true">
            <div class="campaign-entry-device-frame">
              <i class="fa-solid fa-mobile-screen-button campaign-entry-device-icon"></i>
              <div class="campaign-entry-device-aura"></div>
            </div>
            <div class="campaign-entry-orient-badge">
              <i class="fa-solid fa-rotate" aria-hidden="true"></i>
              <span>Modo Horizontal Recomendado</span>
            </div>
          </div>

          <div class="campaign-entry-body">
            <p class="campaign-entry-lead">A aventura fica ainda melhor em tela cheia!</p>
            <p class="campaign-entry-desc">
              Para aproveitar o mapa, os encontros e as batalhas com a visão completa da arena,
              recomendamos jogar com o aparelho na horizontal e em tela cheia.
            </p>
          </div>

          <div class="campaign-entry-actions">
            <button type="button"
                    id="btnEntryFullscreen"
                    class="campaign-entry-btn campaign-entry-btn--primary">
              <i class="fa-solid fa-expand" aria-hidden="true"></i>
              <span>JOGAR EM TELA CHEIA</span>
            </button>
            <button type="button"
                    id="btnEntryContinue"
                    class="campaign-entry-btn campaign-entry-btn--secondary">
              <i class="fa-solid fa-play" aria-hidden="true"></i>
              <span>CONTINUAR NORMALMENTE</span>
            </button>
          </div>
        </div>
      `;

      const onConfirm = () => {
        this.markEntryPromptSeen();
        this.dismissEntryPrompt();
        this.enter();
        options.onConfirm?.();
      };

      const onCancel = () => {
        this.markEntryPromptSeen();
        this.dismissEntryPrompt();
        options.onCancel?.();
      };

      const primaryBtn = modal.querySelector('#btnEntryFullscreen');
      const secondaryBtn = modal.querySelector('#btnEntryContinue');

      if (primaryBtn) primaryBtn.onclick = onConfirm;
      if (secondaryBtn) secondaryBtn.onclick = onCancel;

      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        } else if (e.key === 'Enter' && document.activeElement === secondaryBtn) {
          e.preventDefault();
          onCancel();
        } else if (e.key === 'Enter' && (document.activeElement === primaryBtn || !modal.contains(document.activeElement))) {
          e.preventDefault();
          onConfirm();
        }
      };

      modal._handleKeyDown = handleKeyDown;
      document.addEventListener('keydown', handleKeyDown);

      document.body.appendChild(modal);
      const deferFocus = typeof setTimeout === 'function' ? setTimeout : (typeof window !== 'undefined' ? window.setTimeout : null);
      if (deferFocus) {
        deferFocus(() => { primaryBtn?.focus?.(); }, 50);
      }
    }

    dismissEntryPrompt() {
      if (typeof document === 'undefined') return;
      const modal = document.getElementById('campaignEntryModal');
      if (modal) {
        if (modal._handleKeyDown) {
          document.removeEventListener('keydown', modal._handleKeyDown);
        }
        modal.remove();
      }
    }

    enter() {
      if (typeof document === 'undefined') {
        this.isActive = true;
        return;
      }
      this.init();
      this.isActive = true;

      document.documentElement.classList.add('campaign-fullscreen-active');
      document.body.classList.add('campaign-fullscreen-active');

      // 1. Native Fullscreen request
      const docEl = document.documentElement;
      const requestFs = docEl.requestFullscreen || docEl.webkitRequestFullscreen;
      if (requestFs && (document.fullscreenEnabled || document.webkitFullscreenEnabled !== false)) {
        requestFs.call(docEl).catch(() => {
          // Native fullscreen rejected or unsupported (e.g. iOS Safari) -> pseudo-fullscreen is active
        });
      }

      // 2. Orientation Lock to landscape where supported
      if (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.lock === 'function') {
        screen.orientation.lock('landscape')
          .then(() => { this.isOrientationLocked = true; })
          .catch(() => { this.isOrientationLocked = false; });
      }

      // 3. Check for portrait orientation and show rotate prompt if needed
      this._checkOrientationPrompt();

      // 4. Synchronize UI buttons
      this.syncUI();
    }

    exit() {
      if (typeof document === 'undefined') {
        this.isActive = false;
        return;
      }
      this.isActive = false;

      document.documentElement.classList.remove('campaign-fullscreen-active');
      document.body.classList.remove('campaign-fullscreen-active');

      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        } else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen();
        }
      }

      if (this.isOrientationLocked || (typeof screen !== 'undefined' && screen.orientation && typeof screen.orientation.unlock === 'function')) {
        try {
          screen.orientation.unlock();
        } catch (_) {}
        this.isOrientationLocked = false;
      }

      this._removeOrientationPrompt();
      this.syncUI();
    }

    toggle() {
      if (this.isActive) {
        this.exit();
      } else {
        this.enter();
      }
    }

    _handleFullscreenChange() {
      if (typeof document === 'undefined') return;
      const isNativeFs = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      if (!isNativeFs && this.isActive) {
        // Native fullscreen was exited (e.g. via Escape key)
        this.exit();
      } else if (isNativeFs && !this.isActive) {
        this.enter();
      }
    }

    _handleOrientationChange() {
      if (!this.isActive) return;
      this._checkOrientationPrompt();
    }

    _checkOrientationPrompt() {
      if (typeof window === 'undefined' || typeof document === 'undefined') return;
      const isPortrait = window.innerHeight > window.innerWidth && window.innerWidth <= 768;
      let prompt = document.getElementById('campaignRotatePrompt');

      if (isPortrait && this.isActive) {
        if (!prompt) {
          prompt = document.createElement('div');
          prompt.id = 'campaignRotatePrompt';
          prompt.className = 'campaign-rotate-prompt';
          prompt.innerHTML = `
            <div class="campaign-rotate-prompt__content">
              <i class="fa-solid fa-mobile-screen-button fa-rotate-by" style="--fa-rotate-angle: 90deg;"></i>
              <span>Gire o aparelho para modo horizontal para jogar em tela cheia</span>
              <button type="button" class="campaign-rotate-prompt__dismiss" aria-label="Fechar aviso">&times;</button>
            </div>
          `;
          const dismissBtn = prompt.querySelector('.campaign-rotate-prompt__dismiss');
          if (dismissBtn) {
            dismissBtn.onclick = () => { prompt.remove(); };
          }
          document.body.appendChild(prompt);
        }
      } else if (prompt) {
        prompt.remove();
      }
    }

    _removeOrientationPrompt() {
      if (typeof document === 'undefined') return;
      const prompt = document.getElementById('campaignRotatePrompt');
      if (prompt) prompt.remove();
    }

    syncUI() {
      if (typeof document === 'undefined') return;
      const btns = document.querySelectorAll('#btnCampaignFullscreen, #btnToggleFullscreen');
      btns.forEach(btn => {
        const icon = btn.querySelector('i');
        const text = btn.querySelector('.fullscreen-btn-label') || btn.querySelector('.btn-text');
        if (this.isActive) {
          btn.classList.add('is-active');
          btn.setAttribute('aria-pressed', 'true');
          btn.setAttribute('title', 'Sair da tela cheia');
          if (icon) icon.className = 'fa-solid fa-compress';
          if (text) text.textContent = 'Sair';
        } else {
          btn.classList.remove('is-active');
          btn.setAttribute('aria-pressed', 'false');
          btn.setAttribute('title', 'Modo Imersivo Horizontal');
          if (icon) icon.className = 'fa-solid fa-expand';
          if (text) text.textContent = 'Tela Cheia';
        }
      });
    }
  }

  const instance = new CampaignFullscreenController();
  const api = {
    CampaignFullscreenController,
    CampaignFullscreen: instance,
    CampaignEntryModal: {
      shouldShow: () => instance.shouldShowEntryPrompt(),
      show: (options) => instance.showEntryPrompt(options),
      dismiss: () => instance.dismissEntryPrompt(),
      markSeen: () => instance.markEntryPromptSeen()
    }
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.PBACampaign = window.PBACampaign || {};
    Object.assign(window.PBACampaign, api);
  }
})();
