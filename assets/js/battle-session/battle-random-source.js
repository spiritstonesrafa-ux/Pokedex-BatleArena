/**
 * ====================================================================
 * FONTE EXTERNA DE ALEATORIEDADE: (battle-random-source.js)
 * ====================================================================
 * Provedor desacoplado de aleatoriedade externa para rolagens de acurácia
 * e seleção de oponentes no Quick Battle da Fase PBA-013.
 *
 * Princípios:
 * - ENGINE_INTERNAL_RNG = 0 (BattleEngine permanece 100% determinístico);
 * - AI_INTERNAL_RNG = 0 (BattleAI permanece 100% determinística);
 * - RUNTIME_RANDOM_SOURCE_INJECTABLE = YES (testes injetam sementes ou listas fixas);
 * - No navegador runtime utiliza crypto.getRandomValues() para alta entropia.
 *
 * Suporta Node.js (CommonJS) e Navegadores (window.PBABattleSession).
 */

(function () {
  /**
   * Gera um número pseudo-aleatório float no intervalo [0, 1) usando crypto seguro quando disponível.
   * @returns {number} Float entre 0 (inclusivo) e 1 (exclusivo).
   */
  function defaultCryptoRandom() {
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      return buffer[0] / (0xFFFFFFFF + 1);
    }
    return Math.random();
  }

  class BattleRandomSource {
    /**
     * @param {Object} [options]
     * @param {Function} [options.rng] - Gerador de números aleatórios [0, 1).
     * @param {number[]} [options.accuracySequence] - Fila fixa de rolagens (1..100) para testes.
     * @param {number[]} [options.opponentSequence] - Lista fixa de IDs de oponentes para testes.
     */
    constructor(options = {}) {
      this.rng = typeof options.rng === 'function' ? options.rng : defaultCryptoRandom;
      this.accuracySequence = Array.isArray(options.accuracySequence) ? [...options.accuracySequence] : null;
      this.criticalSequence=Array.isArray(options.criticalSequence)?[...options.criticalSequence]:null;
      this.damageSequence = Array.isArray(options.damageSequence) ? [...options.damageSequence] : null;
      this.statusSequence = Array.isArray(options.statusSequence) ? [...options.statusSequence] : null;
      this.secondaryEffectSequence = Array.isArray(options.secondaryEffectSequence) ? [...options.secondaryEffectSequence] : null;
      this.sleepDurationSequence = Array.isArray(options.sleepDurationSequence) ? [...options.sleepDurationSequence] : null;
      this.thawSequence = Array.isArray(options.thawSequence) ? [...options.thawSequence] : null;
      this.confusionDurationSequence = Array.isArray(options.confusionDurationSequence) ? [...options.confusionDurationSequence] : null;
      this.confusionHitSequence = Array.isArray(options.confusionHitSequence) ? [...options.confusionHitSequence] : null;
      this.confusionDamageSequence = Array.isArray(options.confusionDamageSequence) ? [...options.confusionDamageSequence] : null;
      this.secondaryStatusSequence=Array.isArray(options.secondaryStatusSequence)?[...options.secondaryStatusSequence]:null;
      this.psywaveSequence=Array.isArray(options.psywaveSequence)?[...options.psywaveSequence]:null;
      this.hitCountSequence=Array.isArray(options.hitCountSequence)?[...options.hitCountSequence]:null;
      this.calledMoveSequence=Array.isArray(options.calledMoveSequence)?[...options.calledMoveSequence]:null;
      this.bindingDurationSequence=Array.isArray(options.bindingDurationSequence)?[...options.bindingDurationSequence]:null;
      this.lockedDurationSequence=Array.isArray(options.lockedDurationSequence)?[...options.lockedDurationSequence]:null;
      this.abilitySequence=Array.isArray(options.abilitySequence)?[...options.abilitySequence]:null;
      this.shedSkinSequence=Array.isArray(options.shedSkinSequence)?[...options.shedSkinSequence]:null;
      this.protectSequence = Array.isArray(options.protectSequence) ? [...options.protectSequence] : null;
      this.opponentSequence = Array.isArray(options.opponentSequence) ? [...options.opponentSequence] : null;
    }

    /**
     * Realiza uma rolagem de acurácia no intervalo inteiro [1, 100].
     * Se houver uma sequência injetada, consome o primeiro valor.
     * @returns {number} Inteiro entre 1 e 100.
     */
    rollAccuracy() {
      if (this.accuracySequence && this.accuracySequence.length > 0) {
        const next = this.accuracySequence.shift();
        const intVal = Math.floor(Number(next));
        return Math.max(1, Math.min(100, intVal));
      }

      const floatVal = this.rng();
      return Math.floor(floatVal * 100) + 1;
    }

    /**
     * Realiza uma rolagem de variação de dano no intervalo inteiro [85, 100].
     * Se houver uma sequência injetada, consome o primeiro valor.
     * @returns {number} Inteiro entre 85 e 100.
     */
    rollDamage() {
      if (this.damageSequence && this.damageSequence.length > 0) {
        const next = this.damageSequence.shift();
        const intVal = Math.floor(Number(next));
        return Math.max(85, Math.min(100, intVal));
      }

      const floatVal = this.rng();
      return Math.floor(floatVal * 16) + 85;
    }

    rollCritical() {
      const value=this.criticalSequence?.length?Number(this.criticalSequence.shift()):Math.floor(this.rng()*24)+1;
      if(!Number.isInteger(value)||value<1||value>24)throw Error('Rolagem de crítico inválida.');
      return value;
    }
    setCriticalSequence(sequence){this.criticalSequence=Array.isArray(sequence)?[...sequence]:null;}

    rollStatus() {
      if (this.statusSequence && this.statusSequence.length > 0) {
        const next = Math.floor(Number(this.statusSequence.shift()));
        return Math.max(1, Math.min(100, next));
      }
      return Math.floor(this.rng() * 100) + 1;
    }

    /**
     * Seleciona `count` oponentes distintos da pool especificada sem repetição de espécie.
     * @param {number[]} pool - Array de IDs de Pokémon disponíveis.
     * @param {number} [count=3] - Quantidade de oponentes a selecionar.
     * @returns {number[]} Array com `count` IDs únicos.
     */
    rollSleepDuration() {
      if (this.sleepDurationSequence && this.sleepDurationSequence.length > 0) {
        const next = Math.floor(Number(this.sleepDurationSequence.shift()));
        return Math.max(1, Math.min(3, next));
      }
      return Math.floor(this.rng() * 3) + 1;
    }

    rollPsywave() {
      const roll=this.psywaveSequence?.length?Number(this.psywaveSequence.shift()):50+Math.floor(this.rng()*101);
      if(!Number.isInteger(roll)||roll<50||roll>150)throw new Error('Rolagem Psywave inválida.');
      return roll;
    }
    rollHitCount() {
      const value = this.hitCountSequence?.length ? Number(this.hitCountSequence.shift()) : Math.floor(this.rng() * 100) + 1;
      if (!Number.isInteger(value) || value < 1 || value > 100) throw new Error('Rolagem de quantidade de acertos inválida.');
      return value;
    }
    setHitCountSequence(sequence) { this.hitCountSequence = Array.isArray(sequence) ? [...sequence] : null; }

    rollCalledMove(count){if(!Number.isInteger(count)||count<1)return 0;if(this.calledMoveSequence?.length){const n=Number(this.calledMoveSequence.shift());if(!Number.isInteger(n)||n<0||n>=count)throw new Error('Escolha de movimento inválida.');return n;}return Math.floor(this.rng()*count);}
    setCalledMoveSequence(seq){this.calledMoveSequence=Array.isArray(seq)?[...seq]:null;}

    rollSecondaryStatusChoice() {
      if(this.secondaryStatusSequence?.length){const value=Number(this.secondaryStatusSequence.shift());if(!Number.isInteger(value)||value<1||value>3)throw new Error('Escolha secundária inválida.');return value;}
      return Math.floor(this.rng()*3)+1;
    }
    setSecondaryStatusSequence(seq){this.secondaryStatusSequence=Array.isArray(seq)?[...seq]:null;}

    rollSecondaryEffect() {
      if (this.secondaryEffectSequence && this.secondaryEffectSequence.length > 0) {
        const next = Math.floor(Number(this.secondaryEffectSequence.shift()));
        return Math.max(1, Math.min(100, next));
      }
      return Math.floor(this.rng() * 100) + 1;
    }

    rollThaw() {
      if (this.thawSequence && this.thawSequence.length > 0) {
        const next = Math.floor(Number(this.thawSequence.shift()));
        return Math.max(1, Math.min(100, next));
      }
      return Math.floor(this.rng() * 100) + 1;
    }

    rollConfusionDuration() {
      if (this.confusionDurationSequence && this.confusionDurationSequence.length > 0) {
        const next = Math.floor(Number(this.confusionDurationSequence.shift()));
        return Math.max(2, Math.min(5, next));
      }
      return Math.floor(this.rng() * 4) + 2;
    }

    rollConfusionHit() {
      if (this.confusionHitSequence && this.confusionHitSequence.length > 0) {
        const next = Math.floor(Number(this.confusionHitSequence.shift()));
        return Math.max(1, Math.min(100, next));
      }
      return Math.floor(this.rng() * 100) + 1;
    }

    rollConfusionDamage() {
      if (this.confusionDamageSequence && this.confusionDamageSequence.length > 0) {
        const next = Math.floor(Number(this.confusionDamageSequence.shift()));
        return Math.max(85, Math.min(100, next));
      }
      return Math.floor(this.rng() * 16) + 85;
    }

    rollBindingDuration(){const n=this.bindingDurationSequence?.length?Number(this.bindingDurationSequence.shift()):4+Math.floor(this.rng()*2);if(![4,5].includes(n))throw new Error('Duração de aprisionamento inválida.');return n;}
    rollLockedDuration(){const n=this.lockedDurationSequence?.length?Number(this.lockedDurationSequence.shift()):2+Math.floor(this.rng()*2);if(![2,3].includes(n))throw new Error('Duração de sequência inválida.');return n;}
    rollShedSkin(){
      if(this.shedSkinSequence&&this.shedSkinSequence.length>0){
        const next=Math.floor(Number(this.shedSkinSequence.shift()));
        return Math.max(1,Math.min(100,next));
      }
      return Math.floor(this.rng()*100)+1;
    }

    rollAbility(){const n=this.abilitySequence?.length?Number(this.abilitySequence.shift()):Math.floor(this.rng()*100)+1;if(!Number.isInteger(n)||n<1||n>100)throw new Error('Rolagem de habilidade inválida.');return n;}
    rollProtect(denominator = 3) {
      if (this.protectSequence && this.protectSequence.length > 0) {
        const next = Number(this.protectSequence.shift());
        return next;
      }
      const d = Math.max(1, Math.floor(Number(denominator) || 1));
      return Math.floor(this.rng() * d) + 1;
    }

    pickOpponents(pool, count = 3) {
      if (!Array.isArray(pool) || pool.length === 0) {
        throw new Error('Pool de oponentes inválida ou vazia.');
      }

      if (this.opponentSequence && this.opponentSequence.length >= count) {
        const selected = this.opponentSequence.slice(0, count);
        const unique = new Set(selected);
        if (unique.size === count) {
          return [...selected];
        }
      }

      const available = [...new Set(pool)];
      if (available.length < count) {
        throw new Error(`Pool não possui Pokémon suficientes (${available.length}) para selecionar ${count} sem duplicatas.`);
      }

      // Algoritmo Fisher-Yates shuffle parcial
      const shuffled = [...available];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(this.rng() * (i + 1));
        const temp = shuffled[i];
        shuffled[i] = shuffled[j];
        shuffled[j] = temp;
      }

      return shuffled.slice(0, count);
    }
  }

  /**
   * Subclasse para testes com total controle determinístico.
   */
  class DeterministicRandomSource extends BattleRandomSource {
    constructor(options = {}) {
      super({
        rng: () => 0.5,
        ...options
      });
    }

    setAccuracySequence(seq) {
      this.accuracySequence = Array.isArray(seq) ? [...seq] : null;
    }

    setDamageSequence(seq) {
      this.damageSequence = Array.isArray(seq) ? [...seq] : null;
    }

    setStatusSequence(seq) {
      this.statusSequence = Array.isArray(seq) ? [...seq] : null;
    }

    setSleepDurationSequence(seq) {
      this.sleepDurationSequence = Array.isArray(seq) ? [...seq] : null;
    }

    setSecondaryEffectSequence(seq) {
      this.secondaryEffectSequence = Array.isArray(seq) ? [...seq] : null;
    }

    setThawSequence(seq) {
      this.thawSequence = Array.isArray(seq) ? [...seq] : null;
    }

    setConfusionDurationSequence(seq) {
      this.confusionDurationSequence = Array.isArray(seq) ? [...seq] : null;
    }

    setConfusionHitSequence(seq) {
      this.confusionHitSequence = Array.isArray(seq) ? [...seq] : null;
    }

    setConfusionDamageSequence(seq) {
      this.confusionDamageSequence = Array.isArray(seq) ? [...seq] : null;
    }

    setShedSkinSequence(seq) {
      this.shedSkinSequence = Array.isArray(seq) ? [...seq] : null;
    }

    setAbilitySequence(seq) {
      this.abilitySequence = Array.isArray(seq) ? [...seq] : null;
    }

    setProtectSequence(seq) {
      this.protectSequence = Array.isArray(seq) ? [...seq] : null;
    }

    setOpponentSequence(seq) {
      this.opponentSequence = Array.isArray(seq) ? [...seq] : null;
    }
  }

  const exportsObj = {
    BattleRandomSource,
    DeterministicRandomSource
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
  } else if (typeof window !== 'undefined') {
    window.PBABattleSession = window.PBABattleSession || {};
    Object.assign(window.PBABattleSession, exportsObj);
  }
})();
