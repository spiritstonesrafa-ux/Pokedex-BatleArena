/**
 * ====================================================================
 * CONTROLADOR PRINCIPAL DE ÁUDIO DE BATALHA: (battle-audio-controller.js)
 * ====================================================================
 * Coordena todos os canais de áudio, geração procedural de SFX, música de batalha,
 * reprodução de cries, volumes e gerenciamento de ciclo de vida e cancelamento.
 *
 * Princípios Fundamentais:
 * - AUDIO SYSTEM ≠ GAME RULES;
 * - AUTOPLAY_POLICY_HANDLED = YES (estado inicial LOCKED seguro);
 * - AUDIO_CONTEXT_COUNT = 1 e AUDIO_CONTEXT_REUSE = YES;
 * - Limpeza total e ausência de vazamento de nós ou timers;
 * - Ausência de duplicidade de música (MULTIPLE_MUSIC_INSTANCES = NO);
 * - Falhas de cry não bloqueiam combate (CRY_FAILURE_BLOCKS_BATTLE = NO);
 * - Suporta Node.js (testes automatizados) e Browser.
 */

(function () {
  let constants;
  let contextManagerModule;
  let mixerModule;
  let sfxModule;
  let resolverModule;

  if (typeof module !== 'undefined' && module.exports) {
    constants = require('./battle-audio-constants.js');
    contextManagerModule = require('./audio-context-manager.js');
    mixerModule = require('./audio-mixer.js');
    sfxModule = require('./procedural-sfx.js');
    resolverModule = require('./battle-audio-resolver.js');
  } else if (typeof window !== 'undefined') {
    constants = window.PBABattleAudio || {};
    contextManagerModule = window.PBABattleAudio || {};
    mixerModule = window.PBABattleAudio || {};
    sfxModule = window.PBABattleAudio || {};
    resolverModule = (window.PBABattleAudio && window.PBABattleAudio.BattleAudioResolver) || window.PBABattleAudio || {};
  } else {
    constants = {};
    contextManagerModule = {};
    mixerModule = {};
    sfxModule = {};
    resolverModule = {};
  }

  const { AUDIO_CHANNELS, AUDIO_STATES } = constants;

  class BattleAudioController {
    /**
     * @param {Object} [options]
     * @param {Object} [options.contextManager]
     * @param {Object} [options.mixer]
     * @param {Object} [options.sfxGenerator]
     * @param {Object} [options.resolver]
     */
    constructor(options = {}) {
      this.contextManager = options.contextManager || (
        contextManagerModule.createAudioContextManager ? contextManagerModule.createAudioContextManager(options) : null
      );
      this.mixer = options.mixer || (
        mixerModule.createAudioMixer ? mixerModule.createAudioMixer(this.contextManager) : null
      );
      this.sfx = options.sfxGenerator || (
        sfxModule.createProceduralSfx ? sfxModule.createProceduralSfx(this.mixer, this.contextManager) : null
      );
      this.resolver = options.resolver || (
        resolverModule.resolve ? resolverModule : (resolverModule.BattleAudioResolver || resolverModule)
      );

      // Controle de Música de Batalha (instância única garantida)
      this._isMusicPlaying = false;
      this._musicNodes = [];
      this._musicIntervalId = null;

      // Controle e deduplicação de Pokémon Cry
      this._activeCryUrl = null;
      this._activeCryAudio = null;
      this._lastCryTimestamp = 0;
    }

    /**
     * Desbloqueia explicitamente a Web Audio API via gesto do usuário.
     * @returns {Promise<string>}
     */
    async unlock() {
      if (this.contextManager) {
        return this.contextManager.unlock();
      }
      return AUDIO_STATES.ERROR;
    }

    /**
     * Verifica se o áudio está desbloqueado e ativo.
     * @returns {boolean}
     */
    isUnlocked() {
      return this.contextManager ? this.contextManager.isUnlocked() : false;
    }

    /**
     * Toca o efeito sonoro de ataque elemental correspondente ao golpe.
     * @param {Object} moveDataOrDescriptor
     * @param {Object} [options]
     * @returns {Promise<void>}
     */
    async playMoveAttack(moveDataOrDescriptor, options = {}) {
      if (!this.isUnlocked() || !this.sfx) {
        return Promise.resolve();
      }

      let descriptor = moveDataOrDescriptor;
      if (!descriptor || !descriptor.typeFamily) {
        try {
          descriptor = this.resolver.resolve(moveDataOrDescriptor || {});
        } catch (e) {
          descriptor = { typeFamily: 'normal', intensity: 'MEDIUM' };
        }
      }

      return this.sfx.playAttackSfx(descriptor.typeFamily, {
        intensity: descriptor.intensity || 'MEDIUM',
        ...options
      });
    }

    /**
     * Toca o som de impacto de dano no defensor.
     * @param {Object} [options]
     * @param {number} [options.multiplier=1]
     * @param {string} [options.typeFamily='normal']
     * @returns {Promise<void>}
     */
    async playMoveImpact(options = {}) {
      if (!this.isUnlocked() || !this.sfx) {
        return Promise.resolve();
      }
      return this.sfx.playImpactSfx(options);
    }

    /**
     * Toca o som de golpe que errou o alvo (Miss).
     * @returns {Promise<void>}
     */
    async playMiss() {
      if (!this.isUnlocked() || !this.sfx) {
        return Promise.resolve();
      }
      return this.sfx.playMissSfx();
    }

    /**
     * Toca o som de imunidade / absorção de golpe sem dano.
     * @returns {Promise<void>}
     */
    async playImmunity() {
      if (!this.isUnlocked() || !this.sfx) {
        return Promise.resolve();
      }
      return this.sfx.playImmunitySfx();
    }

    /**
     * Reproduz o som oficial (cry) do Pokémon.
     * Tolerante a falhas de rede e com deduplicação ativa.
     * @param {string} cryUrl - URL do arquivo de áudio.
     * @param {Object} [options]
     * @returns {Promise<void>}
     */
    async playPokemonCry(cryUrl, options = {}) {
      if (!cryUrl || typeof cryUrl !== 'string') {
        return Promise.resolve();
      }

      // Deduplicação estrita: previne tocar o mesmo cry dentro de 400ms
      const now = Date.now();
      if (this._activeCryUrl === cryUrl && (now - this._lastCryTimestamp) < 400) {
        return Promise.resolve();
      }

      this._activeCryUrl = cryUrl;
      this._lastCryTimestamp = now;

      // Em ambientes sem HTMLAudioElement (ex: Node headless), conclui silenciosamente
      if (typeof Audio === 'undefined') {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        try {
          const audio = new Audio(cryUrl);
          this._activeCryAudio = audio;

          const cryVol = this.mixer ? this.mixer.getCryVolume() : 0.7;
          const masterVol = this.mixer && this.mixer.isMuted() ? 0 : (this.mixer ? this.mixer.getMasterVolume() : 0.8);
          audio.volume = Math.max(0, Math.min(1, cryVol * masterVol));

          let finished = false;
          const finish = () => {
            if (!finished) {
              finished = true;
              if (this._activeCryAudio === audio) {
                this._activeCryAudio = null;
                this._activeCryUrl = null;
              }
              resolve();
            }
          };

          audio.onended = finish;
          audio.onerror = () => {
            // Falha remota não bloqueia combate (CRY_FAILURE_BLOCKS_BATTLE = NO)
            finish();
          };

          const playPromise = audio.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => finish());
          }

          // Timeout de segurança para caso o áudio trave o evento
          setTimeout(finish, 1800);
        } catch (e) {
          resolve();
        }
      });
    }

    /**
     * Inicia a música de batalha procedural (loop original dinâmico).
     * Garante MULTIPLE_MUSIC_INSTANCES = NO e MUSIC_LOOP_LEAK = NONE.
     * @returns {Promise<void>}
     */
    async startBattleMusic() {
      if (this._isMusicPlaying) {
        return Promise.resolve();
      }

      if (!this.isUnlocked()) {
        return Promise.resolve();
      }

      this._isMusicPlaying = true;
      const ctx = this.contextManager.getContext();
      const musicGain = this.mixer ? this.mixer.getChannelNode("MUSIC") : ctx.destination;

      // Padrão musical original: Loop procedural de baixo dinâmico e arpejo (não cópia)
      const bpm = 128;
      const beatDuration = 60 / bpm; // ~0.468s
      const notes = [110, 110, 130.8, 146.8, 110, 98, 110, 164.8]; // Sequência em Lá menor
      let step = 0;

      const playBeat = () => {
        if (!this._isMusicPlaying) return;

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        const freq = notes[step % notes.length];
        step++;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        // Filtro de síntese analógica
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(450, now);
        filter.frequency.exponentialRampToValueAtTime(150, now + (beatDuration * 0.8));

        noteGain.gain.setValueAtTime(0.001, now);
        noteGain.gain.exponentialRampToValueAtTime(0.3, now + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.001, now + (beatDuration * 0.85));

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(musicGain);

        osc.start(now);
        osc.stop(now + beatDuration);

        this._musicNodes.push(osc, filter, noteGain);

        // Limpeza dos nós do compasso anterior
        setTimeout(() => {
          try {
            osc.disconnect();
            filter.disconnect();
            noteGain.disconnect();
          } catch (e) {}
          const idx = this._musicNodes.indexOf(osc);
          if (idx !== -1) this._musicNodes.splice(idx, 3);
        }, (beatDuration * 1000) + 100);
      };

      // Dispara primeiro beat imediatamente e agenda o loop
      playBeat();
      this._musicIntervalId = setInterval(playBeat, beatDuration * 500);

      return Promise.resolve();
    }

    /**
     * Interrompe a música de batalha com fade out opcional.
     * @param {Object} [options]
     * @param {number} [options.fadeDuration=0.2]
     * @returns {Promise<void>}
     */
    async stopBattleMusic(options = {}) {
      if (!this._isMusicPlaying) {
        return Promise.resolve();
      }

      this._isMusicPlaying = false;
      if (this._musicIntervalId) {
        clearInterval(this._musicIntervalId);
        this._musicIntervalId = null;
      }

      // Desconecta nós remanescentes
      this._musicNodes.forEach(node => {
        try {
          if (typeof node.stop === 'function') node.stop();
          if (typeof node.disconnect === 'function') node.disconnect();
        } catch (e) {}
      });
      this._musicNodes = [];

      return Promise.resolve();
    }

    /**
     * Toca fanfarra procedural de vitória.
     * @returns {Promise<void>}
     */
    async playVictory() {
      await this.stopBattleMusic();

      if (!this.isUnlocked()) return Promise.resolve();

      const ctx = this.contextManager.getContext();
      const musicGain = this.mixer ? this.mixer.getChannelNode("MUSIC") : ctx.destination;

      // Arpejo triunfante original (Dó maior -> Sol)
      const chord = [261.63, 329.63, 392.00, 523.25];
      const now = ctx.currentTime;

      return new Promise((resolve) => {
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + (idx * 0.1);

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.exponentialRampToValueAtTime(0.4, start + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.6);

          osc.connect(gain);
          gain.connect(musicGain);

          osc.start(start);
          osc.stop(start + 0.65);
        });

        setTimeout(resolve, 800);
      });
    }

    /**
     * Toca acorde procedural de derrota.
     * @returns {Promise<void>}
     */
    async playDefeat() {
      await this.stopBattleMusic();

      if (!this.isUnlocked()) return Promise.resolve();

      const ctx = this.contextManager.getContext();
      const musicGain = this.mixer ? this.mixer.getChannelNode("MUSIC") : ctx.destination;

      // Acorde menor descendente sombrio
      const chord = [220.00, 174.61, 130.81];
      const now = ctx.currentTime;

      return new Promise((resolve) => {
        chord.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = now + (idx * 0.12);

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.001, start);
          gain.gain.exponentialRampToValueAtTime(0.3, start + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.7);

          osc.connect(gain);
          gain.connect(musicGain);

          osc.start(start);
          osc.stop(start + 0.75);
        });

        setTimeout(resolve, 900);
      });
    }

    /** Trilha original e contida para leitura; compartilha o mixer da batalha. */
    startDialogueMusic(scene) {
      this.stopDialogueMusic({ fadeDuration: 0 });
      if (!this.isUnlocked() || !scene) return false;
      this.stopBattleMusic();
      this.stopShadowBossTheme();
      const ctx = this.contextManager.getContext();
      const trialFamilies = {MEWTWO_TRIAL:'mewtwo',LEGENDARY_TRIAL:'legendary',MYTHICAL_TRIAL:'mythical',TITANS_TRIAL:'titans',CELESTIAL_TRIAL:'celestial'};
      const family = trialFamilies[scene.challengeKind] || (scene.challengeKind === 'SHADOW' ? 'shadow' : scene.challengeKind === 'SUPER' ? 'super' : 'master');
      const themes = {
        mewtwo: {notes:[220,233.08,293.66,440,415.3,293.66,261.63,233.08],bass:55,beat:640,wave:'triangle'},
        legendary: { notes:[146.83,220,293.66,261.63,220,174.61,164.81,220],bass:73.42,beat:650,wave:'triangle' },
        mythical: { notes:[196,293.66,311.13,392,369.99,293.66,233.08,293.66],bass:98,beat:710,wave:'sine' },
        titans: { notes:[130.81,138.59,196,174.61,130.81,155.56,146.83,130.81],bass:65.41,beat:740,wave:'triangle' },
        celestial: { notes:[174.61,261.63,349.23,329.63,293.66,261.63,220,261.63],bass:87.31,beat:690,wave:'sine' },
        master: { notes: [261.63, 329.63, 392, 440, 392, 329.63, 293.66, 329.63], bass: 130.81, beat: 560, wave: 'triangle' },
        super: { notes: [196, 293.66, 392, 369.99, 329.63, 293.66, 246.94, 293.66], bass: 98, beat: 620, wave: 'triangle' },
        shadow: { notes: [293.66, 311.13, 349.23, 293.66, 261.63, 277.18, 311.13, 261.63], bass: 73.42, beat: 680, wave: 'triangle' }
      };
      const theme = themes[family];
      const moment = scene.moment || 'INTRO';
      const victory = moment === 'VICTORY', defeat = moment === 'DEFEAT';
      const notes = victory ? [261.63, 329.63, 392, 523.25, 392, 329.63, 293.66, 392]
        : defeat ? [220, 196, 174.61, 164.81, 196, 174.61, 164.81, 146.83] : theme.notes;
      const beat = theme.beat * (moment === 'INTRO' ? 1 : 1.2);
      this._dialogueTheme = { family, moment };
      const voices = this._dialogueNodes = new Set();
      this._dialogueCleanupTimers = new Set();
      const output = ctx.createGain();
      output.gain.setValueAtTime(0.001, ctx.currentTime);
      output.gain.linearRampToValueAtTime(family === 'shadow' ? (moment === 'INTRO' ? .42 : .3) : (moment === 'INTRO' ? .18 : .13), ctx.currentTime + .3);
      output.connect(this.mixer ? this.mixer.getChannelNode('MUSIC') : ctx.destination);
      this._dialogueOutput = output;
      let step = 0;
      const note = (frequency, duration, volume, wave) => {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        const now = ctx.currentTime;
        osc.type = wave; osc.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain); gain.connect(output);
        const voice = { osc, gain };
        voices.add(voice);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); voices.delete(voice); };
        osc.start(now); osc.stop(now + duration + 0.02);
      };
      const tick = () => {
        if (!this._dialogueTheme) return;
        note(notes[step % notes.length] * (defeat ? 0.5 : 1), beat / 1000 * 1.5, family === 'shadow' ? .32 : .24, theme.wave);
        if (step % 4 === 0) note(victory ? 130.81 : defeat ? 110 : theme.bass, beat / 1000 * 3.7, 0.16, 'sine');
        step++;
      };
      tick();
      this._dialogueIntervalId = setInterval(tick, beat);
      return true;
    }

    stopDialogueMusic({ fadeDuration = 0.3 } = {}) {
      if (this._dialogueIntervalId) clearInterval(this._dialogueIntervalId);
      this._dialogueIntervalId = null;
      this._dialogueTheme = null;
      if (fadeDuration === 0 && this._dialogueCleanupTimers) {
        for (const cleanup of this._dialogueCleanupTimers) { clearTimeout(cleanup.timer); cleanup.dispose(); }
        this._dialogueCleanupTimers.clear();
      }
      const output = this._dialogueOutput;
      if (!output) return;
      this._dialogueOutput = null;
      const voices = this._dialogueNodes;
      const dispose = () => {
        for (const voice of voices) {
          voice.osc.onended = null;
          try { voice.osc.stop(); } catch {}
          voice.osc.disconnect(); voice.gain.disconnect();
        }
        voices.clear(); output.disconnect();
      };
      if (fadeDuration <= 0) { dispose(); return; }
      const ctx = this.contextManager.getContext();
      output.gain.cancelScheduledValues(ctx.currentTime);
      output.gain.setValueAtTime(output.gain.value, ctx.currentTime);
      output.gain.linearRampToValueAtTime(0.001, ctx.currentTime + fadeDuration);
      const cleanup = { dispose, timer: null };
      const timers = this._dialogueCleanupTimers;
      cleanup.timer = setTimeout(() => { dispose(); timers.delete(cleanup); }, fadeDuration * 1000 + 30);
      timers.add(cleanup);
    }

    /**
     * Cancela sons ativos e interrompe música sem quebrar a timeline.
     */
    cancel() {
      this.stopDialogueMusic({ fadeDuration: 0 });
      this.stopBattleMusic();
      if (this.sfx && typeof this.sfx.cancel === 'function') {
        this.sfx.cancel();
      }
      if (this._activeCryAudio) {
        try {
          this._activeCryAudio.pause();
          this._activeCryAudio = null;
        } catch (e) {}
      }
      this._activeCryUrl = null;
    }

    /**
     * Reseta estado mantendo o AudioContext e mixer para reutilização.
     */
    reset() {
      this.cancel();
      if (this.mixer && typeof this.mixer.reset === 'function') {
        this.mixer.reset();
      }
      if (this.contextManager && typeof this.contextManager.reset === 'function') {
        this.contextManager.reset();
      }
    }

    /**
     * Retorna configurações atuais dos canais de áudio.
     * @returns {Object}
     */
    getSettings() {
      return this.mixer ? this.mixer.getTelemetry() : {};
    }

    /**
     * Aplica configurações externas aos canais de áudio.
     * @param {Object} settings
     */
    setSettings(settings = {}) {
      if (!this.mixer) return;
      if (settings.masterVolume !== undefined) this.mixer.setMasterVolume(settings.masterVolume);
      if (settings.musicVolume !== undefined) this.mixer.setMusicVolume(settings.musicVolume);
      if (settings.sfxVolume !== undefined) this.mixer.setSfxVolume(settings.sfxVolume);
      if (settings.cryVolume !== undefined) this.mixer.setCryVolume(settings.cryVolume);
      if (settings.uiVolume !== undefined) this.mixer.setUiVolume(settings.uiVolume);
      if (settings.isMuted !== undefined) this.mixer.setMute(settings.isMuted);
    }

    /**
     * Coleta telemetria em tempo real para o harness visual.
     * @returns {Object}
     */
    getTelemetry() {
      const telemetry = this.mixer ? this.mixer.getTelemetry() : {};
      telemetry.isMusicPlaying = this._isMusicPlaying;
      return telemetry;
    }
  }

  const controllerModule = Object.freeze({
    BattleAudioController,
    createBattleAudioController: (opts) => new BattleAudioController(opts)
  });

  // Suporte universal (Node.js & Browser)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = controllerModule;
  } else if (typeof window !== 'undefined') {
    window.PBABattleAudio = window.PBABattleAudio || {};
    Object.assign(window.PBABattleAudio, controllerModule);
  }
})();

/* PBA-015J — original procedural theme, scoped to the Shadow Final Stand. */
(function () {
  const Controller = typeof module !== 'undefined' && module.exports ? module.exports.BattleAudioController : window.PBABattleAudio?.BattleAudioController;
  if (!Controller) return;
  Controller.prototype.startShadowBossTheme = async function () {
    if (this._shadowThemeActive) return true;
    const version = this._shadowStartVersion = (this._shadowStartVersion || 0) + 1;
    await this.unlock();
    await this.stopBattleMusic();
    if (version !== this._shadowStartVersion || !this.isUnlocked()) return false;
    const ctx = this.contextManager.getContext();
    const channel = this.mixer ? this.mixer.getChannelNode("MUSIC") : ctx.destination;
    const master = ctx.createGain();
    const now = ctx.currentTime;
    master.gain.setValueAtTime(0.001, now);
    master.gain.linearRampToValueAtTime(0.26, now + .8);
    master.connect(channel);
    const nodes = [master];
    const layer = (frequency, type, volume, filterFrequency) => {
      const osc = ctx.createOscillator(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
      osc.type = type; osc.frequency.setValueAtTime(frequency, now);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(filterFrequency, now);
      gain.gain.setValueAtTime(volume, now);
      osc.connect(filter); filter.connect(gain); gain.connect(master); osc.start(now);
      nodes.push(osc, filter, gain);
    };
    layer(55, 'sine', 0.42, 180);       // drone grave
    layer(164.81, 'triangle', 0.11, 820); // pad dissonante
    this._shadowThemeActive = true;
    let step = 0;
    const pulse = () => {
      if (!this._shadowThemeActive) return;
      const start = ctx.currentTime, osc = ctx.createOscillator(), gain = ctx.createGain();
      osc.type = step % 4 === 3 ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime([146.83, 155.56, 130.81, 116.54][step++ % 4], start);
      gain.gain.setValueAtTime(0.001, start); gain.gain.exponentialRampToValueAtTime(0.075, start + 0.03); gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);
      osc.connect(gain); gain.connect(master); osc.start(start); osc.stop(start + 0.45); nodes.push(osc, gain);
      osc.onended = () => { osc.disconnect(); gain.disconnect(); for (const node of [osc,gain]) { const index=nodes.indexOf(node); if(index!==-1)nodes.splice(index,1); } };
    };
    pulse(); this._shadowThemeNodes = nodes; this._shadowThemeIntervalId = setInterval(pulse, 780); // ~77 BPM
  };
  Controller.prototype.stopShadowBossTheme = async function () {
    this._shadowStartVersion = (this._shadowStartVersion || 0) + 1;
    if (!this._shadowThemeActive) return;
    this._shadowThemeActive = false;
    if (this._shadowThemeIntervalId) { clearInterval(this._shadowThemeIntervalId); this._shadowThemeIntervalId = null; }
    const ctx = this.contextManager.getContext(); const master = this._shadowThemeNodes?.[0];
    try { master?.gain?.cancelScheduledValues(ctx.currentTime); master?.gain?.linearRampToValueAtTime(0.001, ctx.currentTime + 1.2); } catch {}
    const nodes = this._shadowThemeNodes || []; this._shadowThemeNodes = [];
    setTimeout(() => nodes.forEach(node => { try { node.stop?.(); node.disconnect?.(); } catch {} }), 1250);
  };
  const cancel = Controller.prototype.cancel;
  Controller.prototype.cancel = function () { this.stopShadowBossTheme(); return cancel.call(this); };
})();