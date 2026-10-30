/**
 * PBA — Componente de Diálogo Cinematográfico (CinematicDialogue)
 * Inspirado na estética clássica de RPGs e Castlevania.
 * Exclusivo para os confrontos finais do Super e do Shadow.
 */
(function () {
  'use strict';

  let Catalog;
  if (typeof module !== 'undefined' && module.exports) {
    Catalog = require('./cinematic-dialogue-catalog.js');
  } else {
    Catalog = (window.PBACampaign && window.PBACampaign.CinematicDialogueCatalog) || window.PBACampaign;
  }

  class CinematicDialogue {
    constructor(catalog = Catalog) {
      this.catalog = catalog;
      this.activeOverlay = null;
      this.isPlaying = false;
      this.currentScene = null;
      this.lineIndex = 0;
      this.isTyping = false;
      this.typewriterTimer = null;
      this.resolvePromise = null;
      this.keyHandler = null;
      this.typeSpeed = 22; // ms por caractere
    }

    /**
     * Verifica se o confronto e momento possuem cena cinematográfica.
     * @param {string} kind - 'SUPER' ou 'SHADOW'
     * @param {string} moment - 'INTRO', 'VICTORY' ou 'DEFEAT'
     * @returns {boolean}
     */
    hasScene(kind, moment) {
      if (!this.catalog || typeof this.catalog.hasScene !== 'function') return false;
      return this.catalog.hasScene(kind, moment);
    }

    /**
     * Obtém a definição da cena declarativa.
     * @param {string} kind
     * @param {string} moment
     * @returns {Object|null}
     */
    getScene(kind, moment) {
      if (!this.catalog || typeof this.catalog.getSceneDefinition !== 'function') return null;
      return this.catalog.getSceneDefinition(kind, moment);
    }

    /**
     * Executa a cena cinematográfica e retorna uma Promise que resolve ao término ou skip.
     * @param {string} kind - 'SUPER' ou 'SHADOW'
     * @param {string} moment - 'INTRO', 'VICTORY' ou 'DEFEAT'
     * @param {Object} [options]
     * @returns {Promise<boolean>}
     */
    play(kind, moment, options = {}) {
      const scene = this.getScene(kind, moment);
      if (!scene || !Array.isArray(scene.lines) || scene.lines.length === 0) {
        return Promise.resolve(false);
      }

      // Se já houver diálogo em execução, encerra o anterior com segurança antes de abrir novo
      if (this.isPlaying) {
        this.close(false);
      }

      this.currentScene = scene;
      this.lineIndex = 0;
      this.isPlaying = true;

      return new Promise((resolve) => {
        this.resolvePromise = resolve;
        this.mount(options);
      });
    }

    /**
     * Monta o DOM da cena cinematográfica.
     * @private
     */
    mount(options = {}) {
      if (typeof document === 'undefined') {
        this.close(true);
        return;
      }

      const scene = this.currentScene;
      const isReducedMotion = typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      const overlay = document.createElement('div');
      overlay.className = `cinematic-dialogue-overlay cinematic-theme-${scene.theme || 'super'}${isReducedMotion ? ' is-reduced-motion' : ''}`;
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-modal', 'true');
      overlay.setAttribute('aria-label', `Cena cinematográfica com ${scene.trainerName}`);

      overlay.innerHTML = `
        <div class="cinematic-backdrop" style="background-image: url('${scene.backgroundSrc || ''}')">
          <div class="cinematic-backdrop-vignette"></div>
          <div class="cinematic-ambient-particles"></div>
        </div>

        <div class="cinematic-scene-container">
          <button type="button" class="cinematic-skip-btn" aria-label="Pular diálogo" title="Pular cena (Esc)">
            Pular <i class="fa-solid fa-forward" aria-hidden="true"></i>
          </button>

          <div class="cinematic-portrait-wrap">
            <div class="cinematic-portrait-frame">
              <img class="cinematic-portrait-img"
                   src="${scene.avatarSrc}"
                   alt="Retrato de ${scene.trainerName}"
                   loading="eager">
              <div class="cinematic-portrait-fallback" style="display: none;">
                <span class="fallback-initials">${(scene.trainerName || 'Boss').slice(0, 2).toUpperCase()}</span>
                <span class="fallback-name">${scene.trainerName}</span>
              </div>
            </div>
            <div class="cinematic-portrait-glow" aria-hidden="true"></div>
          </div>

          <div class="cinematic-dialogue-box" role="region" aria-label="Caixa de diálogo">
            <div class="cinematic-ornament cinematic-ornament--top-left" aria-hidden="true"></div>
            <div class="cinematic-ornament cinematic-ornament--top-right" aria-hidden="true"></div>
            <div class="cinematic-ornament cinematic-ornament--bottom-left" aria-hidden="true"></div>
            <div class="cinematic-ornament cinematic-ornament--bottom-right" aria-hidden="true"></div>

            <div class="cinematic-nameplate">
              <span class="cinematic-speaker-name">${scene.trainerName}</span>
              ${scene.trainerTitle ? `<span class="cinematic-speaker-title">${scene.trainerTitle}</span>` : ''}
            </div>

            <div class="cinematic-text-wrap">
              <p class="cinematic-text" aria-live="polite"></p>
              <div class="cinematic-advance-indicator" aria-hidden="true">
                <i class="fa-solid fa-caret-down"></i>
              </div>
            </div>
          </div>
        </div>
      `;

      // Tratamento gracioso de erro na imagem original: nunca trava o diálogo
      const portraitImg = overlay.querySelector('.cinematic-portrait-img');
      const portraitFallback = overlay.querySelector('.cinematic-portrait-fallback');
      if (portraitImg && portraitFallback) {
        portraitImg.onerror = () => {
          portraitImg.style.display = 'none';
          portraitFallback.style.display = 'flex';
        };
      }

      // Eventos de clique e teclado
      const skipBtn = overlay.querySelector('.cinematic-skip-btn');
      if (skipBtn) {
        skipBtn.onclick = (e) => {
          e.stopPropagation();
          this.close(true);
        };
      }

      overlay.onclick = (e) => {
        // Ignora cliques no botão de pular (já tratado)
        if (e.target && e.target.closest('.cinematic-skip-btn')) return;
        this.handleAdvance();
      };

      this.keyHandler = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          this.close(true);
        } else if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          this.handleAdvance();
        }
      };
      window.addEventListener('keydown', this.keyHandler);

      document.body.appendChild(overlay);
      if (document.body && document.body.classList) {
        document.body.classList.add('cinematic-dialogue-active');
      }
      this.activeOverlay = overlay;

      // Inicia exibição da primeira fala
      this.renderCurrentLine();
    }

    /**
     * Apresenta a linha de diálogo atual via efeito de máquina de escrever.
     * @private
     */
    renderCurrentLine() {
      if (!this.activeOverlay || !this.currentScene) return;
      const textEl = this.activeOverlay.querySelector('.cinematic-text');
      const indicator = this.activeOverlay.querySelector('.cinematic-advance-indicator');
      if (!textEl) return;

      const line = this.currentScene.lines[this.lineIndex] || '';
      if (indicator) indicator.classList.remove('is-visible');

      const isReducedMotion = typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (isReducedMotion || this.typeSpeed <= 0) {
        textEl.textContent = line;
        this.isTyping = false;
        if (indicator) indicator.classList.add('is-visible');
        return;
      }

      textEl.textContent = '';
      this.isTyping = true;
      let charIndex = 0;

      if (this.typewriterTimer) {
        clearInterval(this.typewriterTimer);
        this.typewriterTimer = null;
      }

      this.typewriterTimer = setInterval(() => {
        if (!this.activeOverlay || !this.isTyping) {
          clearInterval(this.typewriterTimer);
          this.typewriterTimer = null;
          return;
        }

        charIndex++;
        textEl.textContent = line.slice(0, charIndex);

        if (charIndex >= line.length) {
          clearInterval(this.typewriterTimer);
          this.typewriterTimer = null;
          this.isTyping = false;
          if (indicator) indicator.classList.add('is-visible');
        }
      }, this.typeSpeed);
    }

    /**
     * Completa imediatamente a digitação da linha atual.
     * @private
     */
    completeCurrentLine() {
      if (!this.activeOverlay || !this.currentScene) return;
      const textEl = this.activeOverlay.querySelector('.cinematic-text');
      const indicator = this.activeOverlay.querySelector('.cinematic-advance-indicator');
      if (this.typewriterTimer) {
        clearInterval(this.typewriterTimer);
        this.typewriterTimer = null;
      }
      this.isTyping = false;
      if (textEl) {
        textEl.textContent = this.currentScene.lines[this.lineIndex] || '';
      }
      if (indicator) {
        indicator.classList.add('is-visible');
      }
    }

    /**
     * Gerencia a ação de avançar:
     * - Se estiver digitando: completa a linha imediatamente.
     * - Se a linha estiver completa: passa para a próxima fala ou conclui a cena.
     */
    handleAdvance() {
      if (!this.isPlaying || !this.currentScene) return;

      if (this.isTyping) {
        this.completeCurrentLine();
        return;
      }

      this.lineIndex++;
      if (this.lineIndex < this.currentScene.lines.length) {
        this.renderCurrentLine();
      } else {
        this.close(true);
      }
    }

    /**
     * Encerra a cena cinematográfica com fade-out suave e limpeza completa de listeners.
     * @param {boolean} [completed=true]
     */
    close(completed = true) {
      if (this.typewriterTimer) {
        clearInterval(this.typewriterTimer);
        this.typewriterTimer = null;
      }
      this.isTyping = false;

      if (this.keyHandler && typeof window !== 'undefined') {
        window.removeEventListener('keydown', this.keyHandler);
        this.keyHandler = null;
      }

      if (typeof document !== 'undefined' && document.body && document.body.classList) {
        document.body.classList.remove('cinematic-dialogue-active');
      }

      const overlay = this.activeOverlay;
      this.activeOverlay = null;
      this.isPlaying = false;
      this.currentScene = null;
      this.lineIndex = 0;

      const resolve = this.resolvePromise;
      this.resolvePromise = null;

      if (overlay) {
        overlay.classList.add('is-closing');
        const isReducedMotion = typeof window !== 'undefined' &&
          window.matchMedia &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const fadeDuration = isReducedMotion ? 0 : 350;

        setTimeout(() => {
          if (typeof overlay.remove === 'function') {
            overlay.remove();
          } else if (overlay.parentNode && typeof overlay.parentNode.removeChild === 'function') {
            overlay.parentNode.removeChild(overlay);
          }
          if (typeof resolve === 'function') {
            resolve(completed);
          }
        }, fadeDuration);
      } else {
        if (typeof resolve === 'function') {
          resolve(completed);
        }
      }
    }
  }

  const singleton = new CinematicDialogue();

  const api = {
    CinematicDialogue,
    cinematicDialogue: singleton
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.CinematicDialogue = CinematicDialogue;
    window.cinematicDialogue = singleton;
    window.PBACampaign = window.PBACampaign || {};
    Object.assign(window.PBACampaign, api);
  }
})();
