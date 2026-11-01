/* Endgame trial openings. Presentation only: no rewards, team changes or progression writes. */
(function(root){
  'use strict';
  const THEMES=Object.freeze({
    MEWTWO_TRIAL:Object.freeze({key:'mewtwo',title:'Desafio Mewtwo',word:'MEWTWO',chapter:'V',backgroundSrc:'assets/images/arenas/arena-psychic.webp',opening:'Nem o Eclipse encerrou sua jornada.',omen:'Uma mente. Três limites rompidos.',text:'A queda do Shadow abriu o caminho. No Núcleo Psíquico, uma presença aguarda sua resposta.',reveal:['O poder que deu origem a esta ameaça.','A mente encontra sua força máxima.','A energia psíquica supera seus próprios limites.'],final:'Supere as três faces do poder psíquico.'}),
    LEGENDARY_TRIAL:Object.freeze({key:'legendary',title:'Prova Lendária',word:'LENDÁRIA',chapter:'I',arena:'legendary',opening:'O céu acaba de mudar.',omen:'Três presenças atravessam a tempestade.',text:'O vento para. À distância, um trovão anuncia quem guarda este caminho.',reveal:['Um clarão rompe o silêncio.','A névoa se abre diante de você.','Uma sombra veloz corta o horizonte.'],final:'A tempestade tem três guardiões.'}),
    MYTHICAL_TRIAL:Object.freeze({key:'mythical',title:'Prova Mítica',word:'MÍTICA',chapter:'II',arena:'mythical',opening:'Há algo além do que os olhos veem.',omen:'O impossível está despertando.',text:'Pequenas luzes flutuam no vazio. Uma energia antiga reconhece sua chegada.',reveal:['Uma presença brinca com a realidade.','Um desejo toma forma entre as estrelas.','Uma chama pequena carrega uma força imensa.'],final:'Não confunda tamanho com poder.'}),
    TITANS_TRIAL:Object.freeze({key:'titans',title:'Prova dos Titãs',word:'TITÃS',chapter:'III',arena:'titans',opening:'O chão sente a sua chegada.',omen:'Forças primordiais estão se movendo.',text:'Pedras se erguem. O ar pesa. Cada passo à frente parece desafiar o próprio mundo.',reveal:['Uma força ancestral avança.','O solo responde ao despertar de um titã.','As asas da destruição se abrem.'],final:'Aqui, cada escolha tem o peso de um titã.'}),
    CELESTIAL_TRIAL:Object.freeze({key:'celestial',title:'Prova Celestial',word:'CELESTIAL',chapter:'IV',arena:'celestial',opening:'As estrelas já estavam esperando.',omen:'O espaço se dobra diante da arena.',text:'Constelações se alinham. Do outro lado do portal, três presenças sustentam o horizonte.',reveal:['Um guardião ergue sua defesa.','A luz de uma estrela ganha forma.','Uma presença emerge do outro lado.'],final:'O último horizonte está diante de você.'})
  });
  const DURATIONS=Object.freeze([2800,2800,2600,2600,2600,0]);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const title=value=>String(value||'').replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
  class TrialArrival {
    constructor({audio=null}={}){this.audio=audio;this.active=false;this.timer=null;}
    static supports(kind){return Boolean(THEMES[kind]);}
    play(kind,team){
      if(this.active)return this.promise;
      if(!TrialArrival.supports(kind))return Promise.resolve(true);
      if(typeof document==='undefined')return Promise.resolve(true);
      if(!Array.isArray(team)||team.length!==3||team.some(p=>!Number.isInteger(Number(p.id))||!p.name))return Promise.reject(Error('Time do desafio indisponível para apresentação.'));
      this.kind=kind;this.theme=THEMES[kind];this.team=team.map(p=>({...p,types:[...(p.types||[])]}));this.index=0;this.active=true;
      this.promise=new Promise(resolve=>{this.resolve=resolve;});
      this.previousFocus=document.activeElement;this.previousOverflow=document.body.style.overflow;
      this.reduced=Boolean(root.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
      const layer=this.element=document.createElement('section');layer.className=`trial-arrival trial-arrival--${this.theme.key}`;
      layer.setAttribute('role','dialog');layer.setAttribute('aria-modal','true');layer.setAttribute('aria-labelledby','trialArrivalTitle');
      layer.innerHTML=`<div class="trial-arrival__world" aria-hidden="true"><div class="trial-arrival__arena" style="background-image:url('${this.theme.backgroundSrc||`assets/images/arenas/arena-trial-${this.theme.arena}.webp`}')"></div><div class="trial-arrival__veil"></div><div class="trial-arrival__rings"><i></i><i></i><i></i></div><div class="trial-arrival__fault"><svg viewBox="0 0 1200 800" preserveAspectRatio="none"><path d="M590 0 490 160 620 240 510 390 630 470 500 800 M510 390 300 420 190 700 0 750 M630 470 820 510 1000 400 1200 490"/></svg></div><div class="trial-arrival__particles">${Array.from({length:18},(_,i)=>`<i style="--x:${(i*37+7)%100}%;--y:${(i*23+13)%100}%;--delay:${i*.17}s;--angle:${i*29}deg"></i>`).join('')}</div><div class="trial-arrival__sweep"></div></div>
      <header class="trial-arrival__header"><div><span class="trial-arrival__eyebrow">REGIÃO FINAL <b>／</b> DESAFIO ${this.theme.chapter}</span><strong>${this.theme.title}</strong></div><button type="button" class="trial-arrival__skip">Pular abertura <kbd>Esc</kbd></button></header>
      <div class="trial-arrival__stage"><span class="trial-arrival__word" aria-hidden="true">${this.theme.word}</span><div class="trial-arrival__team">${this.team.map((p,i)=>`<figure class="trial-arrival__figure" data-member="${i}" style="--member:${i}"><img src="${esc(p.photo||p.artworkUrl||`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`)}" data-fallback="${esc(p.animatedPhoto||`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`)}" alt="Adversário ainda oculto"><figcaption><small>ADVERSÁRIO ${i+1} / 3</small><strong>${esc(title(p.name))}</strong><span>${p.types.map(type=>`<i class="type-chip type-${esc(type)}">${esc(type)}</i>`).join('')}</span></figcaption></figure>`).join('')}</div><div class="trial-arrival__seal" aria-hidden="true"><span>DESAFIO DE ELITE</span><b>3</b><span>PRESENÇAS CONFIRMADAS</span></div></div>
      <footer class="trial-arrival__caption"><p class="trial-arrival__cue"></p><h2 id="trialArrivalTitle" aria-live="polite"></h2><p class="trial-arrival__text"></p><div class="trial-arrival__roster" aria-label="Time que você enfrentará">${this.team.map((p,i)=>`<span data-roster="${i}">${esc(title(p.name))}</span>`).join('')}</div><div class="trial-arrival__bottom"><span class="trial-arrival__steps" aria-hidden="true">${DURATIONS.map(()=>'<i></i>').join('')}</span><button type="button" class="trial-arrival__next">Continuar →</button></div></footer>`;
      document.body.appendChild(layer);document.body.style.overflow='hidden';
      this.skip=layer.querySelector('.trial-arrival__skip');this.next=layer.querySelector('.trial-arrival__next');
      this.skip.onclick=()=>this.close(true);this.next.onclick=()=>this.advance();
      layer.querySelectorAll('img').forEach(img=>{img.onerror=()=>{if(img.dataset.fallback&&img.src!==img.dataset.fallback){img.src=img.dataset.fallback;}else img.onerror=null;};});
      this.keyHandler=event=>{if(event.key==='Escape'){event.preventDefault();this.close(true);}if(event.key==='Tab'){if(event.shiftKey&&document.activeElement===this.skip){event.preventDefault();this.next.focus();}else if(!event.shiftKey&&document.activeElement===this.next){event.preventDefault();this.skip.focus();}}};
      this.visibilityHandler=()=>{clearTimeout(this.timer);this.timer=null;if(this.active&&!document.hidden)this.schedule();};
      document.addEventListener('keydown',this.keyHandler);document.addEventListener('visibilitychange',this.visibilityHandler);
      this.next.focus();this.show(0);
      const token=this.promise;
      try{Promise.resolve(this.audio?.unlock?.()).then(()=>{if(this.active&&this.promise===token)this.audio?.startDialogueMusic?.({challengeKind:kind,moment:'INTRO'});}).catch(()=>{});}catch(_){}
      return this.promise;
    }
    schedule(){clearTimeout(this.timer);this.timer=null;if(!this.reduced&&!document.hidden&&DURATIONS[this.index])this.timer=setTimeout(()=>this.advance(),DURATIONS[this.index]);}
    show(index){
      if(!this.active)return;this.index=index;const focused=index>=2&&index<=4?index-2:-1,final=index===5;
      this.element.dataset.shot=String(index);this.element.dataset.phase=final?'lineup':focused>=0?'reveal':index===1?'omen':'threshold';
      this.element.querySelector('.trial-arrival__cue').textContent=final?'06 / O CONFRONTO':focused>=0?`0${index+1} / ADVERSÁRIO ${focused+1}`:index===0?'01 / O LIMIAR':'02 / O PRESSÁGIO';
      this.element.querySelector('h2').textContent=final?this.theme.title:focused>=0?title(this.team[focused].name):index===0?this.theme.opening:this.theme.omen;
      this.element.querySelector('.trial-arrival__text').textContent=final?this.theme.final:focused>=0?this.theme.reveal[focused]:index===0?this.theme.text:'Observe com atenção. Este é o time que você vai enfrentar.';
      this.element.querySelectorAll('[data-member]').forEach((figure,i)=>{const seen=final||index>=i+2;figure.classList.toggle('is-focus',i===focused);figure.classList.toggle('is-seen',seen);figure.setAttribute('aria-hidden',String(!seen));figure.querySelector('img').alt=seen?title(this.team[i].name):'Adversário ainda oculto';});
      this.element.querySelectorAll('[data-roster]').forEach((label,i)=>{label.hidden=!final&&index<i+2;});
      this.element.querySelectorAll('.trial-arrival__steps i').forEach((step,i)=>step.classList.toggle('is-seen',i<=index));
      this.next.textContent=final?'Entrar na arena →':'Continuar →';this.schedule();
      if(focused>=0&&this.team[focused].cry){try{Promise.resolve(this.audio?.playPokemonCry?.(this.team[focused].cry)).catch(()=>{});}catch(_){}}
    }
    advance(){if(!this.active)return;if(this.index===5)this.close(true);else this.show(this.index+1);}
    close(completed=false){
      if(!this.active)return;this.active=false;clearTimeout(this.timer);this.timer=null;
      document.removeEventListener('keydown',this.keyHandler);document.removeEventListener('visibilitychange',this.visibilityHandler);
      try{this.audio?.stopDialogueMusic?.({fadeDuration:.3});}catch(_){}
      this.element.remove();document.body.style.overflow=this.previousOverflow;
      if(this.previousFocus?.isConnected)this.previousFocus.focus();this.resolve(Boolean(completed));
    }
  }
  const api={TrialArrival,TRIAL_ARRIVAL_THEMES:THEMES,TRIAL_ARRIVAL_DURATIONS:DURATIONS};
  root.PBACampaign=root.PBACampaign||{};Object.assign(root.PBACampaign,api);
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
