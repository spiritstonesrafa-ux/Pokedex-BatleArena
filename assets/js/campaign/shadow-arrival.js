/* Shadow arrival: presentation only. Campaign progression remains owned by the manager. */
(function (root) {
  'use strict';
  const SHOTS = Object.freeze([
    { cue: '01 / O SILÊNCIO', title: 'Algo está errado.', text: 'A vitória ecoa pela sala. Então… tudo se cala.', duration: 3000 },
    { cue: '02 / A RUPTURA', title: 'A realidade está cedendo.', text: 'Rachaduras atravessam o salão. Uma presença pulsa do outro lado.', duration: 3200 },
    { cue: '03 / O ECLIPSE', title: 'A escuridão encontrou uma passagem.', text: 'A aura sombria consome as paredes. O salão já não é o mesmo.', duration: 3200 },
    { cue: '04 / A PRESENÇA', title: 'Você sente isso?', text: 'Entre os fragmentos, uma silhueta observa em silêncio.', duration: 2800 },
    { cue: '05 / SHADOW SUPER TRAINER', title: 'O desafio ainda não terminou.', text: 'O trono do Eclipse tem um novo ocupante. Reúna seus aliados.', duration: 0 }
  ]);

  class ShadowArrival {
    constructor({ onComplete = () => {}, audio = null } = {}) {
      this.onComplete = onComplete;
      this.audio = audio;
      this.active = false;
      this.timer = null;
      this.index = 0;
    }
    play() {
      if (this.active) return;
      this.active = true;
      this.previousFocus = document.activeElement;
      this.previousOverflow = document.body.style.overflow;
      this.reduced = Boolean(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
      const layer = this.element = document.createElement('section');
      layer.className = 'shadow-arrival';
      layer.setAttribute('role', 'dialog');
      layer.setAttribute('aria-modal', 'true');
      layer.setAttribute('aria-label', 'A chegada do Shadow');
      layer.innerHTML = `<div class="shadow-arrival__world" aria-hidden="true">
        <div class="shadow-arrival__room"></div><div class="shadow-arrival__eclipse"></div>
        <div class="shadow-arrival__fractures"><svg viewBox="0 0 1200 800" preserveAspectRatio="none"><path d="M600 390 410 295 445 210 260 80 285 0 M410 295 220 340 80 210 0 220 M600 390 710 240 680 125 820 0 M710 240 950 200 1100 90 1200 100 M600 390 860 440 940 580 1200 660 M860 440 1010 350 1200 380 M600 390 545 570 665 690 620 800 M545 570 340 620 190 800 M600 390 300 440 160 560 0 570"/></svg></div>
        <div class="shadow-arrival__shards">${Array.from({ length: 12 }, (_, i) => `<i style="--i:${i};--x:${(i * 37) % 100}%;--y:${(i * 23) % 100}%"></i>`).join('')}</div>
        <div class="shadow-arrival__rift"></div><div class="shadow-arrival__aura"></div>
        <img class="shadow-arrival__figure" src="assets/images/trainers/super-trainer-shadow.png" alt="">
        <div class="shadow-arrival__vignette"></div>
      </div><header class="shadow-arrival__header"><span>POKÉMON BATTLE ARENA <b>／</b> ÉPILOGO</span><button type="button" class="shadow-arrival__skip">Pular cena <span>Esc</span></button></header>
      <div class="shadow-arrival__name" aria-hidden="true"><small>ANOMALIA SOMBRIA</small><strong>SHADOW</strong><span>SUPER TRAINER</span></div>
      <footer class="shadow-arrival__caption"><p class="shadow-arrival__cue"></p><h2></h2><p class="shadow-arrival__text"></p><div class="shadow-arrival__bottom"><span class="shadow-arrival__steps" aria-hidden="true">${SHOTS.map(() => '<i></i>').join('')}</span><button type="button" class="shadow-arrival__next">Continuar →</button></div></footer>`;
      document.body.appendChild(layer);
      document.body.style.overflow = 'hidden';
      layer.querySelector('.shadow-arrival__skip').onclick = () => this.close(true);
      this.nextButton = layer.querySelector('.shadow-arrival__next');
      this.nextButton.onclick = () => this.advance();
      this.keyHandler = event => {
        if (event.key === 'Escape') { event.preventDefault(); this.close(true); }
        if (event.key === 'Tab') {
          const first = layer.querySelector('button');
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); this.nextButton.focus(); }
          else if (!event.shiftKey && document.activeElement === this.nextButton) { event.preventDefault(); first.focus(); }
        }
      };
      document.addEventListener('keydown', this.keyHandler);
      this.visibilityHandler = () => {
        clearTimeout(this.timer);
        if (!document.hidden && this.active) this.schedule();
      };
      document.addEventListener('visibilitychange', this.visibilityHandler);
      this.nextButton.focus();
      this.show(0);
      if (this.audio?.startDialogueMusic) {
        try {
          Promise.resolve(this.audio.unlock?.()).then(() => {
            if (this.active) this.audio.startDialogueMusic({ challengeKind: 'SHADOW', moment: 'INTRO' });
          }).catch(() => {});
        } catch (_) { /* Audio is optional; visual progression always remains available. */ }
      }
    }
    schedule() {
      clearTimeout(this.timer);
      const duration = SHOTS[this.index].duration;
      if (duration && !this.reduced && !document.hidden) this.timer = setTimeout(() => this.advance(), duration);
    }
    show(index) {
      if (!this.active) return;
      this.index = index;
      const shot = SHOTS[index];
      this.element.dataset.shot = String(index);
      this.element.querySelector('.shadow-arrival__cue').textContent = shot.cue;
      this.element.querySelector('h2').textContent = shot.title;
      this.element.querySelector('.shadow-arrival__text').textContent = shot.text;
      this.element.querySelectorAll('.shadow-arrival__steps i').forEach((step, i) => step.classList.toggle('is-seen', i <= index));
      this.nextButton.textContent = index === SHOTS.length - 1 ? 'Reunir meus aliados →' : 'Continuar →';
      this.schedule();
    }
    advance() {
      if (!this.active) return;
      if (this.index === SHOTS.length - 1) this.close(true);
      else this.show(this.index + 1);
    }
    close(completed = false) {
      if (!this.active) return;
      this.active = false;
      clearTimeout(this.timer);
      document.removeEventListener('keydown', this.keyHandler);
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      try { this.audio?.stopDialogueMusic?.({ fadeDuration: 0.3 }); } catch (_) {}
      this.element.remove();
      document.body.style.overflow = this.previousOverflow;
      if (this.previousFocus?.isConnected) this.previousFocus.focus();
      if (completed) this.onComplete();
    }
  }
  root.PBACampaign = root.PBACampaign || {};
  root.PBACampaign.ShadowArrival = ShadowArrival;
  const View = root.PBACampaign.CampaignView;
  if (View) {
    const render = View.prototype.render;
    View.prototype.render = function () {
      const state = this.manager.getState();
      const eligible = state.status === 'SHADOW_AVAILABLE' && state.shadowTrainer?.revealed && !state.shadowTrainer.revealSeen && !state.pendingReward && !this.pending;
      if (!eligible && this.shadowArrival?.active) this.shadowArrival.close(false);
      const result = render.call(this);
      if (eligible && !this.shadowArrival?.active) {
        this.shadowArrival = new ShadowArrival({
          audio: root.battleSessionController?.compositeAdapter?.audioController,
          onComplete: () => this.manager.acknowledgeShadowReveal()
        });
        this.shadowArrival.play();
      }
      return result;
    };
    const deactivate = View.prototype.deactivate;
    View.prototype.deactivate = function () {
      this.shadowArrival?.close(false);
      return deactivate?.call(this);
    };
  }
  if (typeof module !== 'undefined' && module.exports) module.exports = { ShadowArrival, SHOTS };
})(typeof window !== 'undefined' ? window : globalThis);
