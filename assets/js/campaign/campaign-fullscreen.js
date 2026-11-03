(function () {
  'use strict';

  class CampaignFullscreenController {
    constructor() {
      this.isActive = false;
      this.isOrientationLocked = false;
      this.hasListener = false;
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
      }
      return false;
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
    CampaignFullscreen: instance
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.PBACampaign = window.PBACampaign || {};
    Object.assign(window.PBACampaign, api);
  }
})();

