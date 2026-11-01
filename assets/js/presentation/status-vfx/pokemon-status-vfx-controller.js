/**
 * ====================================================================
 * CONTROLADOR DE EFEITOS VISUAIS DE CONDIÇÕES: (pokemon-status-vfx-controller.js)
 * ====================================================================
 * Gerencia a renderização, animação de entrada, persistência e pulsos
 * de reação visual para as condições de status (Queimadura, Veneno,
 * Veneno Grave, Paralisia, Sono, Congelamento e Confusão).
 *
 * Princípios Fundamentais:
 * - O motor de combate (BattleEngine) é a única fonte de verdade;
 * - Nenhum cálculo de dano, status ou aleatoriedade ocorre aqui;
 * - Não altera transform/opacity/filter do elemento sprite (usado por PokemonAnimationController);
 * - Camada overlay absoluta e desacoplada (.pba-status-vfx-root) com z-index independente;
 * - Suporta coexistência simultânea de condição primária + confusão;
 * - Suporta singles (1x1), times (3x3), campanha, Final Stand e duplas (player:0, enemy:1, etc.);
 * - Suporta Node.js (CommonJS) e Navegadores (window.PBAStatusVfx).
 */

(function () {
  'use strict';

  let constants;

  if (typeof module !== 'undefined' && module.exports) {
    constants = require('./pokemon-status-vfx-constants.js');
  } else if (typeof window !== 'undefined' && window.PBAStatusVfx) {
    constants = window.PBAStatusVfx;
  } else {
    constants = {
      STATUS_CONDITIONS: {
        BURN: 'burn',
        POISON: 'poison',
        TOXIC: 'toxic',
        PARALYSIS: 'paralysis',
        SLEEP: 'sleep',
        FREEZE: 'freeze'
      },
      VOLATILE_CONDITIONS: {
        CONFUSION: 'confusion'
      },
      STATUS_VFX_STATES: {
        IDLE: 'idle',
        ENTRANCE: 'entrance',
        PULSE_DAMAGE: 'pulse_damage',
        PULSE_IMMOBILIZED: 'pulse_immobilized',
        PULSE_CONFUSION_DAMAGE: 'pulse_confusion_damage',
        PULSE_CONFUSION_CHECK: 'pulse_confusion_check'
      },
      STATUS_VFX_DURATIONS: {
        ENTRANCE: 450,
        PULSE_DAMAGE: 450,
        PULSE_IMMOBILIZED: 450,
        PULSE_CONFUSION_DAMAGE: 450,
        PULSE_CONFUSION_CHECK: 350,
        REDUCED_MOTION: 0
      },
      STATUS_IDENTITIES: {}
    };
  }

  const {
    STATUS_CONDITIONS,
    VOLATILE_CONDITIONS,
    STATUS_VFX_STATES,
    STATUS_VFX_DURATIONS
  } = constants;

  /**
   * Templates HTML para cada condição.
   */
  const TEMPLATES = Object.freeze({
    [STATUS_CONDITIONS.BURN]: `
      <div class="pba-burn-glow" aria-hidden="true"></div>
      <div class="pba-burn-flames" aria-hidden="true">
        <div class="pba-flame pba-flame-1"></div>
        <div class="pba-flame pba-flame-2"></div>
        <div class="pba-flame pba-flame-3"></div>
      </div>
      <div class="pba-burn-embers" aria-hidden="true">
        <div class="pba-ember pba-ember-1"></div>
        <div class="pba-ember pba-ember-2"></div>
        <div class="pba-ember pba-ember-3"></div>
      </div>
    `,
    [STATUS_CONDITIONS.POISON]: `
      <div class="pba-poison-haze" aria-hidden="true"></div>
      <div class="pba-poison-bubbles" aria-hidden="true">
        <div class="pba-poison-bubble pba-bubble-1"></div>
        <div class="pba-poison-bubble pba-bubble-2"></div>
        <div class="pba-poison-bubble pba-bubble-3"></div>
        <div class="pba-poison-bubble pba-bubble-4"></div>
      </div>
    `,
    [STATUS_CONDITIONS.TOXIC]: `
      <div class="pba-toxic-miasma" aria-hidden="true"></div>
      <div class="pba-toxic-spikes" aria-hidden="true">
        <div class="pba-toxic-spike pba-spike-1"></div>
        <div class="pba-toxic-spike pba-spike-2"></div>
        <div class="pba-toxic-spike pba-spike-3"></div>
        <div class="pba-toxic-spike pba-spike-4"></div>
      </div>
      <div class="pba-toxic-bubbles" aria-hidden="true">
        <div class="pba-toxic-bubble pba-tbubble-1"></div>
        <div class="pba-toxic-bubble pba-tbubble-2"></div>
        <div class="pba-toxic-bubble pba-tbubble-3"></div>
      </div>
    `,
    [STATUS_CONDITIONS.PARALYSIS]: `
      <div class="pba-paralysis-arcs" aria-hidden="true">
        <div class="pba-spark pba-spark-1"></div>
        <div class="pba-spark pba-spark-2"></div>
        <div class="pba-spark pba-spark-3"></div>
        <div class="pba-spark pba-spark-4"></div>
      </div>
    `,
    [STATUS_CONDITIONS.SLEEP]: `
      <div class="pba-sleep-breath" aria-hidden="true"></div>
      <div class="pba-sleep-zs" aria-hidden="true">
        <span class="pba-sleep-z pba-z-1">Z</span>
        <span class="pba-sleep-z pba-z-2">z</span>
        <span class="pba-sleep-z pba-z-3">Z</span>
      </div>
    `,
    [STATUS_CONDITIONS.FREEZE]: `
      <div class="pba-freeze-shell" aria-hidden="true"></div>
      <div class="pba-freeze-crystals" aria-hidden="true">
        <div class="pba-crystal pba-crystal-1"></div>
        <div class="pba-crystal pba-crystal-2"></div>
        <div class="pba-crystal pba-crystal-3"></div>
        <div class="pba-crystal pba-crystal-4"></div>
      </div>
    `,
    [VOLATILE_CONDITIONS.CONFUSION]: `
      <div class="pba-confusion-halo" aria-hidden="true">
        <div class="pba-confusion-orbit">
          <span class="pba-confusion-star pba-cstar-1">★</span>
          <span class="pba-confusion-star pba-cstar-2">★</span>
          <span class="pba-confusion-star pba-cstar-3">★</span>
        </div>
        <div class="pba-confusion-swirl">🌀</div>
      </div>
    `
  });

  class PokemonStatusVfxController {
    /**
     * @param {Object} [options]
     * @param {Object} [options.registry] - Instância de PokemonAnimationRegistry ou similar.
     */
    constructor(options = {}) {
      this.options = options;
      this.registry = options.registry || null;
      this.activeStatuses = new Map();
    }

    /**
     * Obtém ou cria o estado interno para o slot informado.
     * @private
     */
    _getOrCreateEntry(sideKey) {
      if (!this.activeStatuses.has(sideKey)) {
        this.activeStatuses.set(sideKey, {
          primary: null,
          confusion: false,
          primaryState: STATUS_VFX_STATES.IDLE,
          confusionState: STATUS_VFX_STATES.IDLE,
          timers: new Set()
        });
      }
      return this.activeStatuses.get(sideKey);
    }

    /**
     * Auxiliar seguro para criação de elementos DOM.
     * @private
     */
    _createElement(tagName) {
      if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
        return document.createElement(tagName);
      }
      if (this.options && this.options.document && typeof this.options.document.createElement === 'function') {
        return this.options.document.createElement(tagName);
      }
      if (typeof global !== 'undefined' && global.document && typeof global.document.createElement === 'function') {
        return global.document.createElement(tagName);
      }
      return null;
    }

    /**
     * Localiza o elemento container DOM para a posição de combate.
     * @param {string} sideKey - e.g. 'player', 'enemy', 'player:0', 'enemy:1'
     * @returns {HTMLElement|null}
     */
    resolveContainer(sideKey) {
      if (this.registry && typeof this.registry.hasTarget === 'function' && this.registry.hasTarget(sideKey)) {
        const target = this.registry.getTarget(sideKey);
        if (target && target.container) return target.container;
      }

      if (typeof document === 'undefined') return null;

      if (sideKey === 'player') return document.getElementById('playerCombatantTarget');
      if (sideKey === 'enemy') return document.getElementById('enemyCombatantTarget');
      if (typeof sideKey === 'string' && sideKey.includes(':')) {
        const [role, slot] = sideKey.split(':');
        return document.getElementById(`duoCombatant_${role}_${slot}`);
      }

      return null;
    }

    /**
     * Garante a existência do elemento root de status overlay no container.
     * @private
     */
    _ensureRoot(sideKey) {
      const container = this.resolveContainer(sideKey);
      if (!container || typeof container.querySelector !== 'function') return null;

      let root = container.querySelector('.pba-status-vfx-root');
      if (!root) {
        root = this._createElement('div');
        if (!root) return null;
        root.className = 'pba-status-vfx-root';
        root.setAttribute('data-status-vfx-side', sideKey);
        container.appendChild(root);
      }
      return root;
    }

    /**
     * Normaliza identificador de status de acordo com o catálogo canônico.
     * @param {string} condition
     * @returns {string|null}
     */
    normalizeCondition(condition) {
      if (!condition || typeof condition !== 'string') return null;
      const lower = condition.trim().toLowerCase();
      if (lower === 'burn') return STATUS_CONDITIONS.BURN;
      if (lower === 'poison') return STATUS_CONDITIONS.POISON;
      if (lower === 'toxic' || lower === 'badly_poisoned') return STATUS_CONDITIONS.TOXIC;
      if (lower === 'paralysis' || lower === 'paralyze') return STATUS_CONDITIONS.PARALYSIS;
      if (lower === 'sleep') return STATUS_CONDITIONS.SLEEP;
      if (lower === 'freeze') return STATUS_CONDITIONS.FREEZE;
      if (lower === 'confusion') return VOLATILE_CONDITIONS.CONFUSION;
      return null;
    }

    /**
     * Aplica visualmente uma condição de status primária.
     * @param {string} sideKey - Lado/slot do combatente.
     * @param {string} rawCondition - Condição (burn, poison, toxic, paralysis, sleep, freeze).
     * @param {Object} [opts]
     * @param {boolean} [opts.immediate=false] - Se true, monta diretamente sem animação de entrada.
     * @returns {Promise<void>}
     */
    async applyStatus(sideKey, rawCondition, opts = {}) {
      const condition = this.normalizeCondition(rawCondition);
      if (!condition || condition === VOLATILE_CONDITIONS.CONFUSION) return;

      const entry = this._getOrCreateEntry(sideKey);
      const isAlreadyActive = entry.primary === condition;
      entry.primary = condition;

      const root = this._ensureRoot(sideKey);
      if (!root) return;

      let primaryEl = root.querySelector('.pba-status-primary');
      if (!primaryEl) {
        primaryEl = this._createElement('div');
        if (!primaryEl) return;
        primaryEl.className = 'pba-status-primary';
        root.appendChild(primaryEl);
      }

      // Atualiza classes e template do status
      primaryEl.className = `pba-status-primary pba-status-${condition}`;
      primaryEl.innerHTML = TEMPLATES[condition] || '';

      if (opts.immediate || isAlreadyActive) {
        entry.primaryState = STATUS_VFX_STATES.IDLE;
        return;
      }

      // Executa animação de entrada breve
      primaryEl.classList.add('pba-status-entrance');
      entry.primaryState = STATUS_VFX_STATES.ENTRANCE;

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          entry.timers.delete(timer);
          if (primaryEl && primaryEl.classList) {
            primaryEl.classList.remove('pba-status-entrance');
          }
          entry.primaryState = STATUS_VFX_STATES.IDLE;
          resolve();
        }, STATUS_VFX_DURATIONS.ENTRANCE);
        entry.timers.add(timer);
      });
    }

    /**
     * Remove visualmente a condição primária ativa (cura, despertar, descongelar).
     * @param {string} sideKey
     */
    removeStatus(sideKey) {
      const entry = this.activeStatuses.get(sideKey);
      if (entry) {
        entry.primary = null;
        entry.primaryState = STATUS_VFX_STATES.IDLE;
      }

      const root = this._ensureRoot(sideKey);
      if (!root) return;

      const primaryEl = root.querySelector('.pba-status-primary');
      if (primaryEl && typeof primaryEl.remove === 'function') {
        primaryEl.remove();
      }

      this._cleanupEmptyRoot(sideKey, root);
    }

    /**
     * Dispara pulso de dano residual (queimadura, veneno ou veneno grave).
     * @param {string} sideKey
     * @param {string} [condition]
     * @returns {Promise<void>}
     */
    async pulseDamage(sideKey, condition) {
      const entry = this._getOrCreateEntry(sideKey);
      const targetCond = this.normalizeCondition(condition) || entry.primary;
      if (!targetCond) return;

      // Garante montagem se necessário
      if (entry.primary !== targetCond) {
        await this.applyStatus(sideKey, targetCond, { immediate: true });
      }

      const root = this._ensureRoot(sideKey);
      if (!root) return;

      const primaryEl = root.querySelector('.pba-status-primary');
      if (!primaryEl) return;

      primaryEl.classList.add('pba-pulse-damage');
      entry.primaryState = STATUS_VFX_STATES.PULSE_DAMAGE;

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          entry.timers.delete(timer);
          if (primaryEl && primaryEl.classList) {
            primaryEl.classList.remove('pba-pulse-damage');
          }
          entry.primaryState = STATUS_VFX_STATES.IDLE;
          resolve();
        }, STATUS_VFX_DURATIONS.PULSE_DAMAGE);
        entry.timers.add(timer);
      });
    }

    /**
     * Dispara destaque de ação impedida (paralisia, sono ou congelamento).
     * @param {string} sideKey
     * @param {string} [condition]
     * @returns {Promise<void>}
     */
    async pulseImmobilized(sideKey, condition) {
      const entry = this._getOrCreateEntry(sideKey);
      const targetCond = this.normalizeCondition(condition) || entry.primary;
      if (!targetCond) return;

      if (entry.primary !== targetCond) {
        await this.applyStatus(sideKey, targetCond, { immediate: true });
      }

      const root = this._ensureRoot(sideKey);
      if (!root) return;

      const primaryEl = root.querySelector('.pba-status-primary');
      if (!primaryEl) return;

      primaryEl.classList.add('pba-pulse-immobilized');
      entry.primaryState = STATUS_VFX_STATES.PULSE_IMMOBILIZED;

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          entry.timers.delete(timer);
          if (primaryEl && primaryEl.classList) {
            primaryEl.classList.remove('pba-pulse-immobilized');
          }
          entry.primaryState = STATUS_VFX_STATES.IDLE;
          resolve();
        }, STATUS_VFX_DURATIONS.PULSE_IMMOBILIZED);
        entry.timers.add(timer);
      });
    }

    /**
     * Aplica visualmente confusão (camada independente de estrelas/espirais).
     * @param {string} sideKey
     * @param {Object} [opts]
     * @param {boolean} [opts.immediate=false]
     * @returns {Promise<void>}
     */
    async applyConfusion(sideKey, opts = {}) {
      const entry = this._getOrCreateEntry(sideKey);
      const isAlreadyActive = entry.confusion;
      entry.confusion = true;

      const root = this._ensureRoot(sideKey);
      if (!root) return;

      let confusionEl = root.querySelector('.pba-status-confusion');
      if (!confusionEl) {
        confusionEl = this._createElement('div');
        if (!confusionEl) return;
        confusionEl.className = 'pba-status-confusion';
        root.appendChild(confusionEl);
      }

      confusionEl.className = 'pba-status-confusion';
      confusionEl.innerHTML = TEMPLATES[VOLATILE_CONDITIONS.CONFUSION];

      if (opts.immediate || isAlreadyActive) {
        entry.confusionState = STATUS_VFX_STATES.IDLE;
        return;
      }

      confusionEl.classList.add('pba-status-entrance');
      entry.confusionState = STATUS_VFX_STATES.ENTRANCE;

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          entry.timers.delete(timer);
          if (confusionEl && confusionEl.classList) {
            confusionEl.classList.remove('pba-status-entrance');
          }
          entry.confusionState = STATUS_VFX_STATES.IDLE;
          resolve();
        }, STATUS_VFX_DURATIONS.ENTRANCE);
        entry.timers.add(timer);
      });
    }

    /**
     * Remove visualmente a condição de confusão.
     * @param {string} sideKey
     */
    removeConfusion(sideKey) {
      const entry = this.activeStatuses.get(sideKey);
      if (entry) {
        entry.confusion = false;
        entry.confusionState = STATUS_VFX_STATES.IDLE;
      }

      const root = this._ensureRoot(sideKey);
      if (!root) return;

      const confusionEl = root.querySelector('.pba-status-confusion');
      if (confusionEl && typeof confusionEl.remove === 'function') {
        confusionEl.remove();
      }

      this._cleanupEmptyRoot(sideKey, root);
    }

    /**
     * Dispara pulso de auto-dano por confusão.
     * @param {string} sideKey
     * @returns {Promise<void>}
     */
    async pulseConfusionDamage(sideKey) {
      const entry = this._getOrCreateEntry(sideKey);
      if (!entry.confusion) {
        await this.applyConfusion(sideKey, { immediate: true });
      }

      const root = this._ensureRoot(sideKey);
      if (!root) return;

      const confusionEl = root.querySelector('.pba-status-confusion');
      if (!confusionEl) return;

      confusionEl.classList.add('pba-pulse-confusion-damage');
      entry.confusionState = STATUS_VFX_STATES.PULSE_CONFUSION_DAMAGE;

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          entry.timers.delete(timer);
          if (confusionEl && confusionEl.classList) {
            confusionEl.classList.remove('pba-pulse-confusion-damage');
          }
          entry.confusionState = STATUS_VFX_STATES.IDLE;
          resolve();
        }, STATUS_VFX_DURATIONS.PULSE_CONFUSION_DAMAGE);
        entry.timers.add(timer);
      });
    }

    /**
     * Dispara pulso de checagem/oscilação de confusão no início do turno.
     * @param {string} sideKey
     * @returns {Promise<void>}
     */
    async pulseConfusionCheck(sideKey) {
      const entry = this._getOrCreateEntry(sideKey);
      if (!entry.confusion) {
        await this.applyConfusion(sideKey, { immediate: true });
      }

      const root = this._ensureRoot(sideKey);
      if (!root) return;

      const confusionEl = root.querySelector('.pba-status-confusion');
      if (!confusionEl) return;

      confusionEl.classList.add('pba-pulse-confusion-check');
      entry.confusionState = STATUS_VFX_STATES.PULSE_CONFUSION_CHECK;

      return new Promise((resolve) => {
        const timer = setTimeout(() => {
          entry.timers.delete(timer);
          if (confusionEl && confusionEl.classList) {
            confusionEl.classList.remove('pba-pulse-confusion-check');
          }
          entry.confusionState = STATUS_VFX_STATES.IDLE;
          resolve();
        }, STATUS_VFX_DURATIONS.PULSE_CONFUSION_CHECK);
        entry.timers.add(timer);
      });
    }

    /**
     * Limpa efeitos visuais e timers de uma posição específica.
     * @param {string} sideKey
     */
    clear(sideKey) {
      const entry = this.activeStatuses.get(sideKey);
      if (entry) {
        for (const timer of entry.timers) {
          clearTimeout(timer);
        }
        entry.timers.clear();
        this.activeStatuses.delete(sideKey);
      }

      const container = this.resolveContainer(sideKey);
      if (container && typeof container.querySelector === 'function') {
        const root = container.querySelector('.pba-status-vfx-root');
        if (root && typeof root.remove === 'function') {
          root.remove();
        }
      }
    }

    /**
     * Limpa todas as posições registradas e quaisquer nós órfãos no DOM.
     */
    clearAll() {
      for (const sideKey of Array.from(this.activeStatuses.keys())) {
        this.clear(sideKey);
      }

      if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
        const roots = document.querySelectorAll('.pba-status-vfx-root');
        roots.forEach(root => root.remove());
      }
    }

    /**
     * Cancela timers ativos de animações em voo, preservando elementos persistentes.
     */
    cancel() {
      for (const entry of this.activeStatuses.values()) {
        for (const timer of entry.timers) {
          clearTimeout(timer);
        }
        entry.timers.clear();
      }

      if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
        const transientSelectors = [
          '.pba-status-entrance',
          '.pba-pulse-damage',
          '.pba-pulse-immobilized',
          '.pba-pulse-confusion-damage',
          '.pba-pulse-confusion-check'
        ];
        transientSelectors.forEach(selector => {
          const els = document.querySelectorAll(selector);
          els.forEach(el => el.classList.remove(selector.slice(1)));
        });
      }
    }

    /**
     * Reseta completamente o controlador.
     */
    reset() {
      this.cancel();
      this.clearAll();
    }

    /**
     * Sincroniza o estado visual de um combatente específico.
     * @param {string} sideKey
     * @param {Object} combatant
     * @param {Object} [opts]
     * @param {boolean} [opts.immediate=true]
     */
    syncFromCombatant(sideKey, combatant, opts = { immediate: true }) {
      if (!combatant || combatant.currentHp <= 0) {
        this.clear(sideKey);
        return;
      }

      const status = combatant.statusCondition || combatant.status;
      if (status && Object.values(STATUS_CONDITIONS).includes(this.normalizeCondition(status))) {
        this.applyStatus(sideKey, status, opts);
      } else {
        this.removeStatus(sideKey);
      }

      const isConfused = Boolean(combatant.confusionTurns > 0 || combatant.isConfused);
      if (isConfused) {
        this.applyConfusion(sideKey, opts);
      } else {
        this.removeConfusion(sideKey);
      }
    }

    /**
     * Sincroniza todos os combatentes ativos a partir do estado de batalha.
     * Usado entre turnos, após renderização de tela ou em trocas.
     * @param {Object} battleState
     */
    syncFromBattleState(battleState) {
      if (!battleState) return;

      if (battleState.battleFormat === 'DOUBLES') {
        for (const role of ['player', 'enemy']) {
          if (Array.isArray(battleState[role]?.activeIndices)) {
            for (const [slot, index] of battleState[role].activeIndices.entries()) {
              const combatant = battleState[role].team ? battleState[role].team[index] : null;
              this.syncFromCombatant(`${role}:${slot}`, combatant, { immediate: true });
            }
          }
        }
      } else {
        for (const role of ['player', 'enemy']) {
          const index = Number.isInteger(battleState[role]?.activeIndex) ? battleState[role].activeIndex : 0;
          const combatant = battleState[role]?.team ? battleState[role].team[index] : null;
          this.syncFromCombatant(role, combatant, { immediate: true });
        }
      }
    }

    /**
     * Remove o root se não contiver mais camadas de status.
     * @private
     */
    _cleanupEmptyRoot(sideKey, root) {
      if (!root) return;
      const hasPrimary = Boolean(root.querySelector('.pba-status-primary'));
      const hasConfusion = Boolean(root.querySelector('.pba-status-confusion'));
      if (!hasPrimary && !hasConfusion) {
        if (typeof root.remove === 'function') {
          root.remove();
        }
        this.activeStatuses.delete(sideKey);
      }
    }
  }

  const controllerModule = Object.freeze({
    PokemonStatusVfxController,
    createStatusVfxController: (opts) => new PokemonStatusVfxController(opts)
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = controllerModule;
  } else if (typeof window !== 'undefined') {
    window.PBAStatusVfx = window.PBAStatusVfx || {};
    Object.assign(window.PBAStatusVfx, controllerModule);
  }
})();
