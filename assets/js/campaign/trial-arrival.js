/* Endgame trial openings. Presentation only: no rewards, team changes or progression writes. */
(function(root){
  'use strict';
  const THEMES=Object.freeze({
    LEAGUE:Object.freeze({key:'celestial',title:'Liga da Glória Eterna',word:'GLÓRIA',chapter:'X',arena:'celestial',opening:'O palácio abre suas portas.',omen:'Cada vitória aproxima você do trono.',text:'A Elite aguarda. Mantenha sua equipe e prove que consegue ir até o campeão.',reveal:['O primeiro guardião toma seu lugar.','Uma segunda presença sustenta a formação.','O último integrante fecha o caminho.'],final:'Três adversários. Uma etapa rumo à glória.'}),
    TOWER:Object.freeze({key:'titans',title:'Torre de Batalha',word:'ASCENSÃO',chapter:'XI',arena:'titans',opening:'O elevador para. Mais um andar.',omen:'Seu recorde será colocado à prova.',text:'As portas se abrem diante de uma nova equipe. Uma derrota encerra a sequência.',reveal:['O primeiro adversário cruza a arena.','Um novo desafio aparece ao seu lado.','A formação está completa. Prepare sua estratégia.'],final:'Vença este andar e continue sua ascensão.'}),
    ZYGARDE_TRIAL:Object.freeze({key:'zygarde',title:'Equilíbrio de Zygarde',word:'EQUILÍBRIO',chapter:'VI',motif:'cells',backgroundSrc:'assets/images/arenas/arena-grass.webp',opening:'A floresta parou de respirar.',omen:'Milhares de células. Uma única vontade.',text:'Luzes verdes saem do solo. O mundo convoca seu guardião para medir a força de quem venceu o Eclipse.',reveal:['A primeira forma avança entre as árvores.','As células se unem. A presença ocupa todo o horizonte.','A ordem se completa. Nenhuma célula ficou para trás.'],final:'Enfrente o equilíbrio em suas três formas.'}),
    KYUREM_TRIAL:Object.freeze({key:'kyurem',title:'Zero Absoluto',word:'ABSOLUTO',chapter:'VII',motif:'frost',backgroundSrc:'assets/images/arenas/arena-ice.webp',opening:'O último som se perdeu no gelo.',omen:'O vazio não está mais sozinho.',text:'A arena congela. Sob as fissuras, descargas e chamas anunciam dois poderes que se recusam a permanecer separados.',reveal:['O dragão vazio desperta no silêncio.','Um trovão negro percorre o gelo.','Uma chama branca rompe a tempestade.'],final:'Gelo, trovão e chama. Sobreviva à fusão.'}),
    NECROZMA_TRIAL:Object.freeze({key:'necrozma',title:'Eclipse de Necrozma',word:'ECLIPSE',chapter:'VIII',motif:'eclipse',backgroundSrc:'assets/images/arenas/arena-psychic.webp',opening:'A luz começou a desaparecer.',omen:'Até as estrelas podem ser devoradas.',text:'Um disco negro cobre a arena. Cristais prismáticos absorvem os últimos reflexos e uma presença atravessa o eclipse.',reveal:['A luz do sol foi aprisionada.','O brilho da lua também foi consumido.','O prisma se rompe. Uma luz impossível desperta.'],final:'Encare aquilo que devorou a luz.'}),
    CREATION_TRIAL:Object.freeze({key:'creation',title:'Ruptura da Criação',word:'CRIAÇÃO',chapter:'IX',motif:'rift',backgroundSrc:'assets/images/arenas/arena-trial-celestial.webp',opening:'O tempo deixou de avançar.',omen:'O espaço já não obedece às próprias leis.',text:'Os desafios reuniram forças que o mundo não consegue conter. Além da última fenda, três presenças aguardam o campeão.',reveal:['O guardião do tempo abre seus olhos.','O espaço se curva à vontade de seu soberano.','Do mundo reverso, a última presença atravessa o portal.'],final:'Tempo. Espaço. Mundo reverso. A última prova começa.'}),
    MEWTWO_TRIAL:Object.freeze({key:'mewtwo',title:'Desafio Mewtwo',word:'MEWTWO',chapter:'V',backgroundSrc:'assets/images/arenas/arena-psychic.webp',opening:'Nem o Eclipse encerrou sua jornada.',omen:'Uma mente. Três limites rompidos.',text:'A queda do Shadow abriu o caminho. No Núcleo Psíquico, uma presença aguarda sua resposta.',reveal:['O poder que deu origem a esta ameaça.','A mente encontra sua força máxima.','A energia psíquica supera seus próprios limites.'],final:'Supere as três faces do poder psíquico.'}),
    LEGENDARY_TRIAL:Object.freeze({key:'legendary',title:'Prova da Resistência',word:'RESISTÊNCIA',chapter:'I',motif:'frost',backgroundSrc:'assets/images/arenas/arena-ice.webp',opening:'O frio engole o último eco.',omen:'Resistir é o primeiro passo para vencer.',text:'Fissuras de gelo atravessam a fortaleza. Atrás da névoa, três adversários esperam por quem pretende enfrentar Eternamax.',reveal:['Calyrex Cavaleiro Glacial avança. O peso de sua lança faz a arena tremer.','Os anéis de Hoopa Libertado rompem a névoa. Nenhuma distância parece segura.','Lugia abre suas asas na neblina. Uma muralha viva guarda a saída.'],final:'Vença e escolha um aliado. Calyrex Glacial é uma opção para preparar sua resposta a Eternamax.'}),
    MYTHICAL_TRIAL:Object.freeze({key:'mythical',title:'Prova das Sombras',word:'SOMBRAS',chapter:'II',motif:'eclipse',backgroundSrc:'assets/images/arenas/arena-dark.webp',opening:'Os refletores se apagam, um a um.',omen:'Três predadores aguardam no escuro.',text:'O coliseu mergulha na penumbra. Uma chama vermelha revela silhuetas capazes de enfrentar o poder de Calyrex Shadow.',reveal:['O cinturão de Incineroar se acende. O desafio começa com um rugido.','Mega Tyranitar emerge entre os destroços. A escuridão ganha uma armadura.','Mega Gyarados rompe a superfície. Sua sombra cobre toda a arena.'],final:'Vença e escolha seu aliado das sombras. Incineroar é uma resposta ao Calyrex do Super.'}),
    TITANS_TRIAL:Object.freeze({key:'titans',title:'Prova das Chamas',word:'CHAMAS',chapter:'III',backgroundSrc:'assets/images/arenas/arena-fire.webp',opening:'O chão começa a brilhar sob seus pés.',omen:'A fornalha despertou.',text:'Ondas de calor distorcem a arena. Vapor e fogo anunciam três forças para testar quem procura uma resposta a Zacian.',reveal:['Uma chama azul rasga o horizonte. Reshiram abre suas asas.','Volcanion surge em uma explosão de vapor. A pressão toma conta da arena.','Mega Swampert avança entre os escombros. O chão se curva sob sua força.'],final:'Vença e escolha um aliado. As chamas de Reshiram podem pressionar Zacian.'}),
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
      layer.innerHTML=`<div class="trial-arrival__world" aria-hidden="true"><div class="trial-arrival__arena" style="background-image:url('${this.theme.backgroundSrc||`assets/images/arenas/arena-trial-${this.theme.arena}.webp`}')"></div><div class="trial-arrival__veil"></div><div class="trial-arrival__rings"><i></i><i></i><i></i></div><div class="trial-arrival__fault"><svg viewBox="0 0 1200 800" preserveAspectRatio="none"><path d="M590 0 490 160 620 240 510 390 630 470 500 800 M510 390 300 420 190 700 0 750 M630 470 820 510 1000 400 1200 490"/></svg></div><div class="trial-arrival__particles">${Array.from({length:18},(_,i)=>`<i style="--x:${(i*37+7)%100}%;--y:${(i*23+13)%100}%;--delay:${i*.17}s;--angle:${i*29}deg"></i>`).join('')}</div><div class="trial-arrival__sweep"></div>${this.theme.motif?`<div class="trial-arrival__motif trial-arrival__motif--${this.theme.motif}" aria-hidden="true"><i></i><i></i><i></i></div>`:''}</div>
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
