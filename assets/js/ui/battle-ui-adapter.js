/**
 * ====================================================================
 * ADAPTADOR DE APRESENTAÇÃO DE UI: (battle-ui-adapter.js)
 * ====================================================================
 * Implementa BattlePresentationAdapter da Fase PBA-008 para sincronizar
 * os comandos da Presentation Timeline com a interface visual (PBA-013).
 *
 * Responsabilidades:
 * - Atualiza barras de HP, valores numéricos e classes de alerta de cor;
 * - Atualiza PP de golpes no painel de ação;
 * - Exibe mensagens contextuais na caixa de narrativa / log de batalha;
 * - Atualiza marcadores de status da equipe (ativo, banco, nocauteado);
 * - Atualiza indicadores visuais de troca e nocaute;
 * - Apresenta o banner de resultado (Vitória / Derrota);
 * - ZERO cálculo de dano, efetividade ou regras de combate.
 *
 * Suporta Node.js (CommonJS) e Navegadores (window.PBABattleUi).
 */

(function () {
  let presentationConstants;
  let adapterBase;

  if (typeof module !== 'undefined' && module.exports) {
    presentationConstants = require('../presentation/battle-presentation-constants.js');
    adapterBase = require('../presentation/battle-presentation-adapter.js');
  } else if (typeof window !== 'undefined') {
    presentationConstants = window.PBABattlePresentation || {};
    adapterBase = window.PBABattlePresentation || {};
  } else {
    presentationConstants = { PRESENTATION_COMMANDS: {} };
    adapterBase = { BattlePresentationAdapter: class {} };
  }

  const { PRESENTATION_COMMANDS } = presentationConstants;
  const { BattlePresentationAdapter } = adapterBase;

  class BattleUiDomAdapter extends BattlePresentationAdapter {
    /**
     * @param {Object} [options]
     * @param {Object} [options.view] - Instância de BattleView.
     */
    constructor(options = {}) {
      super();
      this.view = options.view || null;
      this.executedCommands = [];
    }

    setView(view) {
      this.view = view;
    }

    /**
     * Trata o comando de apresentação recebido da timeline.
     * @param {Object} command - Comando de apresentação.
     * @param {Object} [context] - Contexto imutável.
     * @returns {Promise<void>}
     */
    async execute(command, context = null) {
      if (!command || typeof command !== 'object') {
        return Promise.resolve();
      }

      this.executedCommands.push({
        type: command.type,
        command: JSON.parse(JSON.stringify(command)),
        timestamp: Date.now()
      });

      if (!this.view) {
        return Promise.resolve();
      }

      switch (command.type) {
        case PRESENTATION_COMMANDS.TURN_INDICATOR: {
          if (typeof this.view.updateTurnIndicator === 'function') {
            this.view.updateTurnIndicator(command.turnNumber);
          }
          break;
        }

        case PRESENTATION_COMMANDS.MULTI_HIT_FEEDBACK:
          this.view.displayMessage?.('Atingiu ' + command.hitCount + (command.hitCount === 1 ? ' vez!' : ' vezes!') + (command.critical ? ' Todos os acertos foram críticos!' : ''));
          break;
        case PRESENTATION_COMMANDS.MOVE_FAIL_FEEDBACK: {
          const fieldLabels={sun:'Sol intenso',rain:'Chuva',sand:'Tempestade de areia',snow:'Neve',hail:'Granizo',electric:'Terreno elétrico',grassy:'Terreno de grama',misty:'Terreno de névoa',psychic:'Terreno psíquico',ended:'O efeito terminou'};
          const descriptions={COMMANDER_STARTED:'Ativou Commander com '+command.label+'!',PIVOT_RESERVE_UNAVAILABLE:'A reserva escolhida não está mais disponível. O Pokémon permaneceu em campo.',COMMANDER_ENDED:'Voltou ao campo após Commander.',NO_TARGET:'Não há um alvo disponível.',DYNAMAX_STARTED:'Dynamax ativado por três turnos!',DYNAMAX_ENDED:'O Dynamax terminou.',TERA_STARTED:'Terastallizou para '+command.label+'!',Z_POWER_READY:'Preparou o golpe Z!',FORM_CHANGED:({'aegislash-blade':'assumiu a Blade Forme para atacar!','aegislash-shield':'assumiu a Shield Forme para se proteger!','mimikyu-busted':'teve seu disfarce rompido!','eiscue-noice':'teve seu bloco de gelo quebrado e revelou Noice Face!','eiscue-ice':'reconstituiu seu bloco de gelo e voltou a Ice Face!','cramorant-gulping':'engoliu uma presa e assumiu a Gulping Form!','cramorant-gorging':'engoliu uma presa e assumiu a Gorging Form!','cramorant':'cuspiu a presa e voltou à forma normal!','zygarde-complete':'reuniu todos os seus núcleos e transformou-se na Complete Forme!','castform-sunny':'assumiu a Sunny Form sob o sol forte!','castform-rainy':'assumiu a Rainy Form sob a chuva!','castform-snowy':'assumiu a Snowy Form sob a neve!','castform':'voltou à sua forma Normal!','darmanitan-zen':'entrou em Zen Mode!','darmanitan-standard':'retornou ao Standard Mode!','darmanitan-galar-zen':'entrou em Galarian Zen Mode!','darmanitan-galar-standard':'retornou ao Galarian Standard Mode!','palafin-hero':'passou por uma transformação e assumiu a Hero Form!','palafin-zero':'retornou à Zero Form!','wishiwashi-school':'reuniu seu cardume e assumiu a School Form!','wishiwashi-solo':'teve seu cardume dispersado e voltou à Solo Form!','Wishiwashi School':'reuniu seu cardume e assumiu a School Form!','Wishiwashi Solo':'teve seu cardume dispersado e voltou à Solo Form!','minior-red-meteor':'recuperou sua carapaça e voltou à Meteor Form!','minior-orange-meteor':'recuperou sua carapaça e voltou à Meteor Form!','minior-yellow-meteor':'recuperou sua carapaça e voltou à Meteor Form!','minior-green-meteor':'recuperou sua carapaça e voltou à Meteor Form!','minior-blue-meteor':'recuperou sua carapaça e voltou à Meteor Form!','minior-indigo-meteor':'recuperou sua carapaça e voltou à Meteor Form!','minior-violet-meteor':'recuperou sua carapaça e voltou à Meteor Form!','minior-red':'teve sua carapaça rompida e revelou sua Core Form!','minior-orange':'teve sua carapaça rompida e revelou sua Core Form!','minior-yellow':'teve sua carapaça rompida e revelou sua Core Form!','minior-green':'teve sua carapaça rompida e revelou sua Core Form!','minior-blue':'teve sua carapaça rompida e revelou sua Core Form!','minior-indigo':'teve sua carapaça rompida e revelou sua Core Form!','minior-violet':'teve sua carapaça rompida e revelou sua Core Form!'}[command.label]||((command.label&&command.label.includes('meteor'))?'recuperou sua carapaça e voltou à Meteor Form!':(command.label&&command.label.startsWith('minior-'))?'teve sua carapaça rompida e revelou sua Core Form!':('Mudou para '+(command.label||'')+'!'))),TYPE_LOST:'Perdeu temporariamente o tipo '+command.label+'.',TYPE_CHANGED:'Mudou para o tipo '+(command.label||'')+'.',Z_REQUIRES_ACTIVATION:'Este golpe exige uma ativação Z válida.',AURA_WHEEL_SPECIES:'Aura Wheel só pode ser usado na forma de Morpeko.',DOUBLE_SHOCK_TYPE:'Double Shock exige o tipo Electric.',DYNAMAX_IMMUNE:'O alvo Dynamax é imune a esta mecânica.',TRANSFORMED:'Transformou-se em '+command.label+'!',SKETCHED:'Copiou '+command.label+' com Sketch!',TRANSFORM_INELIGIBLE:'Transform não pode copiar este alvo.',SKETCH_INELIGIBLE:'Sketch não encontrou um último golpe que possa copiar.',P7_WEATHER:fieldLabels[command.label]||'O clima mudou.',P7_TERRAIN:fieldLabels[command.label]||'O terreno mudou.',PRESSURE_PP:'Pressure consumiu '+command.label+' PP adicional do golpe.',P7_ABILITY:({'pressure':'Pressure está ativo: golpes adversários gastam PP adicional.','intrepid-sword':'Intrepid Sword aumentou o Ataque!','dauntless-shield':'Dauntless Shield aumentou a Defesa!','unnerve':'Unnerve impede os adversários de consumir berries.','as-one-spectrier':'As One ativado: berries adversárias bloqueadas e Grim Neigh disponível.','as-one-glastrier':'As One ativado: berries adversárias bloqueadas e Chilling Neigh disponível.','grim-neigh':'Grim Neigh aumentou o Ataque Especial após o nocaute!','chilling-neigh':'Chilling Neigh aumentou o Ataque após o nocaute!','moxie':'Moxie aumentou o Ataque após o nocaute!','justified':'Justified aumentou o Ataque ao receber um golpe do tipo Dark!','hustle':'Hustle: Ataque físico mais forte, precisão reduzida.','marvel-scale':'Marvel Scale reforçou a Defesa com o status!','keen-eye':'Keen Eye bloqueou a redução de Precisão!','steadfast':'Steadfast aumentou a Velocidade ao hesitar!','rough-skin':'Rough Skin feriu o atacante ao fazer contato!','iron-barbs':'Iron Barbs feriu o atacante ao fazer contato!','effect-spore':'Effect Spore liberou esporos ao receber contato!','synchronize':'Synchronize refletiu a condição de status para o adversário!','shed-skin':'Shed Skin curou o problema de status ao trocar de pele!','dark-aura':'Dark Aura intensificou os poderes sombrios de todos os Pokémon!','fairy-aura':'Fairy Aura intensificou a magia feérica de todos os Pokémon!','aura-break':'Aura Break inverteu os efeitos das auras em campo!','prism-armor':'Prism Armor atenuou o dano super efetivo!','neuroforce':'Neuroforce potencializou o golpe super efetivo!','prankster':'Prankster concedeu prioridade ao golpe de status!','infiltrator':'Infiltrator ignorou as barreiras e proteções do alvo!','magic-bounce':'Magic Bounce refletiu o golpe de status de volta!','protean':'Protean alterou o seu tipo!','libero':'Libero alterou o seu tipo!','color-change':'Color Change alterou o seu tipo!','battle-bond':'Battle Bond aumentou o Ataque, Ataque Especial e Velocidade após o nocaute!','forecast':'Forecast alterou a forma e o tipo conforme o clima!','zen-mode':'Zen Mode alterou a forma e os atributos devido ao HP reduzido!','mimicry':'Mimicry alterou o tipo conforme o terreno!','zero-to-hero':'Zero to Hero ativou a Hero Form!','multitype':'Multitype adaptou o tipo de acordo com a Plate!','rks-system':'RKS System adaptou o tipo de acordo com a Memory!','stance-change':'Stance Change alternou a forma entre Shield e Blade!','disguise':'Disguise protegeu contra o primeiro golpe recebido!','ice-face':'Ice Face bloqueou o ataque físico!','gulp-missile':'Gulp Missile cuspiu a presa contra o adversário!','power-construct':'Power Construct ativou a Complete Forme sob HP baixo!','illusion':'Illusion disfarçou a verdadeira identidade!'}[command.label]||'Habilidade: '+(command.label||'efeito ativado')),P7_ITEM:'Item: '+(command.label||'efeito ativado'),P7_ITEM_CONSUMED:'Consumiu '+(command.label||'seu item')+'.',P7_IMMUNE:'O alvo foi protegido por uma habilidade ou pelo terreno.',P7_FIELD_EXISTS:'Este efeito já está ativo.',WEATHER_REQUIRED:'É preciso haver neve para erguer o Véu Aurora.',NO_RESERVE:'Não há outro Pokémon disponível para entrar.',BOUND:'ficou preso no ataque!',TRAPPED:'não pode sair do campo!',LEECH_SEED:'foi semeado!',BINDING_ENDED:'se libertou do aprisionamento!',BARRIER_STARTED:'ergueu uma barreira para a equipe!',BARRIER_ENDED:'A barreira da equipe terminou.',HAZARD_STARTED:'Armadilhas foram espalhadas no campo!',HAZARDS_CLEARED:'removeu as armadilhas do seu campo!',FIELD_CLEARED:'limpou as condições do campo!',TOXIC_SPIKES_ABSORBED:'absorveu os espinhos venenosos!',FOCUS_READY:'está concentrando energia!',FOCUS_LOST:'perdeu a concentração e não pôde atacar!',CHARGE_GENERIC:'está preparando o próximo ataque!',SEED_INELIGIBLE:'A semente não pôde afetar o alvo.',BARRIER_EXISTS:'A barreira já está ativa.',HAZARD_LIMIT:'O campo já atingiu o limite desta armadilha.',TRAP_INELIGIBLE:'O alvo não pode ser aprisionado.',NOTHING_TO_CLEAR:'Não havia efeito para remover.',MIST:'A névoa protege os atributos!',SAFEGUARD:'A proteção da equipe impediu a condição!',DISGUISE_BROKEN:'O disfarce foi quebrado!',DISGUISE_RECOIL:'sofreu dano com o rompimento do disfarce!',ICE_FACE_BROKEN:'O bloco de gelo de Eiscue quebrou!',GULP_MISSILE_TRIGGERED:'Cramorant cuspiu a presa contra o adversário!',ILLUSION_BROKEN:'O disfarce de Illusion se desfez!',
            PROTECTED_SELF: 'se protegeu com uma barreira protetora!',
            BLOCKED_BY_PROTECT: 'se protegeu do ataque!',
            PROTECT_FAILED: 'mas falhou!',
            CHARGE_SOLAR: 'começou a absorver luz solar!',
            FLY_UP: 'voou alto!',
            DIG_UNDERGROUND: 'cavou um buraco!',
            DIVE_UNDERWATER: 'mergulhou nas profundezas!',
            BOUNCE_UP: 'saltou alto!',
            RECHARGE_REQUIRED:'precisará recarregar no próximo turno!',RECHARGING:'está recarregando e não pode agir neste turno!',BIDE_STORE:'está acumulando energia com Bide!',NO_BIDE_DAMAGE:'Bide falhou: nenhum dano de ataque foi acumulado.',BEAK_BLAST_READY:'está aquecendo o bico!',SHELL_TRAP_READY:'preparou Shell Trap!',SHELL_TRAP:'Shell Trap falhou: não recebeu um golpe físico neste turno.',WEIGHT_UNAVAILABLE:'O peso necessário para este golpe não está disponível.',ENDEAVOR_HP:'Endeavor falhou: o alvo precisa ter mais HP que o usuário.',OHKO_INELIGIBLE:'O alvo não é elegível para este golpe de nocaute.',NO_COUNTER_DAMAGE:'O golpe falhou: nenhum dano compatível foi recebido neste turno.',SUCKER_PUNCH:'Sucker Punch falhou: o alvo não vai executar um ataque antes de agir.',VENOM_DRENCH:'Venom Drench falhou: o alvo não está envenenado.',FIRST_ACTION_AFTER_ENTRY:'Fake Out falhou! Só funciona na primeira oportunidade de agir após entrar em campo.',REST_NOT_NEEDED:'Rest falhou: não é possível descansar agora.',REQUIRES_SLEEP:'O golpe só funciona enquanto está dormindo.',TARGET_NOT_ASLEEP:'Dream Eater falhou: o alvo não está dormindo.',NO_CALLABLE_MOVE:'Sleep Talk não encontrou um golpe disponível.',ALREADY_STATUS:'O alvo já possui uma condição ou está sonolento.',DROWSY:'ficou sonolento!',HEALED:`recuperou ${command.amount} HP!`,IMMUNE_PRANKSTER:'Pokémon do tipo Dark são imunes a golpes com prioridade de Prankster!',BLOCKED_BY_SUBSTITUTE:'O Substitute bloqueou o golpe!',TAUNTED:'Não pode usar golpes de status devido ao efeito de Taunt!',TAUNT_APPLIED:'caiu sob provocação de Taunt!',TAUNT_ENDED:'o efeito de Taunt terminou!',SUBSTITUTE_CREATED:'criou um Substitute!',ALREADY_SUBSTITUTE:'já possui um Substitute ativo!',TOO_WEAK:'não possui HP suficiente para criar um Substitute!',PSYCHIC_TERRAIN_PROTECTED:'está protegido pelo Terreno Psíquico!'
          };
          this.view.displayMessage?.(`${command.pokemonName}: ${descriptions[command.reason]||'O golpe falhou.'}`);
          break;
        }

        case PRESENTATION_COMMANDS.MOVE_ANNOUNCEMENT: {
          const moveName = command.moveName ? command.moveName.toUpperCase() : 'GOLPE';
          const msg = `${command.pokemonName} usou ${moveName}!`;
          if (typeof this.view.displayMessage === 'function') {
            this.view.displayMessage(msg);
          }
          break;
        }

        case PRESENTATION_COMMANDS.PP_TRANSITION: {
          if (command.side === 'player' && typeof this.view.updateMovePp === 'function') {
            this.view.updateMovePp(command.moveId, command.currentPp, command.maxPp);
          }
          break;
        }

        case PRESENTATION_COMMANDS.MOVE_MISS_FEEDBACK: {
          if (typeof this.view.displayMessage === 'function') {
            if (command.reason === 'SEMI_INVULNERABLE') {
              this.view.displayMessage('O alvo está fora de alcance!');
            } else {
              this.view.displayMessage('O golpe errou!');
            }
          }
          break;
        }

        case PRESENTATION_COMMANDS.STATUS_FEEDBACK: {
          if (command.outcome === 'APPLIED' && typeof this.view.updateStatusBadge === 'function') {
            this.view.updateStatusBadge(command.target, command.statusCondition);
          }
          if (!command.benched && (command.outcome === 'CURED' || command.outcome === 'WOKE_UP' || command.outcome === 'THAWED') && typeof this.view.updateStatusBadge === 'function') {
            this.view.updateStatusBadge(command.target, null);
          }
          if (typeof this.view.displayMessage === 'function') {
            const name = command.pokemonName || (command.target === 'player' ? 'Seu Pokémon' : 'O Pokémon oponente');
            const status = command.statusCondition;
            const residualLabel={'leech-seed':'Leech Seed',binding:'aprisionamento',hail:'granizo',sandstorm:'tempestade de areia','solar-power':'Solar Power','black-sludge':'Black Sludge',spikes:'espinhos','stealth-rock':'pedras de entrada'}[status];
            const label = residualLabel || (status === 'toxic' ? 'veneno grave' : status === 'burn' ? 'queimadura' : status === 'paralysis' ? 'paralisia' : status === 'sleep' ? 'sono' : status === 'freeze' ? 'congelamento' : 'veneno');
            const message = command.outcome === 'APPLIED'
              ? (status === 'toxic' ? `${name} foi gravemente envenenado!` : status === 'poison' ? `${name} foi envenenado!` : status === 'sleep' ? `${name} adormeceu!` : status === 'freeze' ? `${name} foi congelado!` : `${name} sofreu ${label}!`) :
              command.outcome === 'DAMAGE' ? `${name} perdeu ${command.damage} HP por ${label}!` :
              command.outcome === 'IMMUNE' ? `${name} é imune a ${label}!` :
              command.outcome === 'IMMOBILIZED' ? (status === 'sleep' ? `${name} está dormindo profundamente!` : status === 'freeze' ? `${name} está congelado e não pôde se mover!` : `${name} não conseguiu agir por paralisia!`) :
              command.outcome === 'THAWED' ? `${name} descongelou!` :
              command.outcome === 'WOKE_UP' ? `${name} acordou!` :
              command.outcome === 'CURED' ? (status === 'freeze' ? `${name} descongelou!` : `${name} foi curado de ${label}!`) :
              command.outcome === 'FLINCHED' ? `${name} hesitou e não pôde se mover!` :
                `${name} já possui uma condição de status.`;
            this.view.displayMessage(message);
          }
          break;
        }

        case PRESENTATION_COMMANDS.FLINCH_FEEDBACK: {
          if (typeof this.view.displayMessage === 'function') {
            const name = command.pokemonName || (command.target === 'player' ? 'Seu Pokémon' : 'O Pokémon oponente');
            this.view.displayMessage(`${name} hesitou e não pôde se mover!`);
          }
          break;
        }

        case PRESENTATION_COMMANDS.CONFUSION_FEEDBACK: {
          if (typeof this.view.displayMessage === 'function') {
            const name = command.pokemonName || (command.target === 'player' ? 'Seu Pokémon' : 'O Pokémon oponente');
            const message = command.outcome === 'APPLIED'
              ? `${name} ficou confuso!` :
              command.outcome === 'DAMAGE'
                ? `${name} se feriu na confusão!` :
                command.outcome === 'CHECK'
                  ? `${name} está confuso!` :
                  command.outcome === 'ENDED'
                    ? `${name} se livrou da confusão!` :
                    `${name} já está confuso!`;
            this.view.displayMessage(message);
          }
          break;
        }

        case PRESENTATION_COMMANDS.EFFECTIVENESS_FEEDBACK: {
          if (typeof this.view.displayMessage === 'function') {
            if (command.multiplier >= 2) {
              this.view.displayMessage('É super efetivo!');
            } else if (command.multiplier <= 0.5 && command.multiplier > 0) {
              this.view.displayMessage('Não é muito efetivo...');
            } else if (command.multiplier === 0) {
              this.view.displayMessage('Não teve efeito!');
            }
          }
          break;
        }

        case PRESENTATION_COMMANDS.HP_TRANSITION: {
          if(command.critical&&command.damage>0)this.view.displayMessage?.('Acerto crítico!');
          if(command.targetSlot!==undefined&&this.view.updateDoublesHpBar){this.view.updateDoublesHpBar(command.target,command.targetSlot,command.currentHp,command.maxHp);}
          else if (typeof this.view.updateHpBar === 'function') {
            await this.view.updateHpBar(
              command.target,
              command.currentHp,
              command.previousHp,
              command.maxHp
            );
          }
          break;
        }

        case PRESENTATION_COMMANDS.FAINT_SEQUENCE: {
          if (typeof this.view.handleFaint === 'function') {
            this.view.handleFaint(command.target, command.pokemonId, command.pokemonName);
          }
          if (typeof this.view.displayMessage === 'function') {
            this.view.displayMessage(`${command.pokemonName} foi nocauteado!`);
          }
          break;
        }

        case PRESENTATION_COMMANDS.SWITCH_OUT_SEQUENCE: {
          if (typeof this.view.displayMessage === 'function') {
            this.view.displayMessage(`${command.pokemonName} foi recolhido!`);
          }
          break;
        }

        case PRESENTATION_COMMANDS.SWITCH_IN_SEQUENCE: {
          if (command.targetSlot !== undefined && this.view.updateDoublesCombatant) {
            this.view.updateDoublesCombatant(command);
          } else if (typeof this.view.handleSwitchIn === 'function') {
            this.view.handleSwitchIn(command.side, command.pokemonId, command.pokemonName);
          }
          if (typeof this.view.updateStatStages === 'function' && context && context.battleState) {
            const sideCombatant = context.battleState[command.side]?.team
              ? context.battleState[command.side].team[context.battleState[command.side].activeIndex]
              : context.battleState[command.side];
            if (sideCombatant) {
              this.view.updateStatStages(command.side, sideCombatant.statStages);
            }
          }
          if (typeof this.view.displayMessage === 'function') {
            this.view.displayMessage(`${command.pokemonName} entrou em campo!`);
          }
          break;
        }

        case PRESENTATION_COMMANDS.REPLACEMENT_PROMPT: {
          if (typeof this.view.displayMessage === 'function') {
            this.view.displayMessage('Escolha o próximo Pokémon para lutar!');
          }
          break;
        }

        case PRESENTATION_COMMANDS.TEAM_DEFEAT_SEQUENCE: {
          if (typeof this.view.displayMessage === 'function') {
            const teamLabel = command.side === 'player' ? 'Sua equipe' : 'A equipe adversária';
            this.view.displayMessage(`${teamLabel} foi derrotada!`);
          }
          break;
        }

        case PRESENTATION_COMMANDS.BATTLE_RESULT: {
          if (typeof this.view.showBattleResult === 'function') {
            this.view.showBattleResult(command.winner, command.reason);
          }
          break;
        }

        case PRESENTATION_COMMANDS.STAT_STAGE_FEEDBACK: {
          if (typeof this.view.updateStatStages === 'function' && context && context.battleState) {
            const sideCombatant = context.battleState[command.side]?.team
              ? context.battleState[command.side].team[context.battleState[command.side].activeIndex]
              : context.battleState[command.side];
            if (sideCombatant) {
              this.view.updateStatStages(command.side, sideCombatant.statStages);
            }
          }
          if (typeof this.view.displayMessage === 'function') {
            const name = command.pokemonName || (command.side === 'player' ? 'Seu Pokémon' : 'O Pokémon oponente');
            const statNamesPt = {
              attack: 'Ataque',
              defense: 'Defesa',
              specialAttack: 'Ataque Especial',
              specialDefense: 'Defesa Especial', accuracy: 'Precisão', evasion: 'Evasão',
              speed: 'Velocidade'
            };
            const statName = statNamesPt[command.statKey] || command.statKey;
            if (command.blockedReason === 'AT_MAX') {
              this.view.displayMessage(`${name}: ${statName} não pode subir mais!`);
            } else if (command.blockedReason === 'AT_MIN') {
              this.view.displayMessage(`${name}: ${statName} não pode cair mais!`);
            } else if (command.appliedDelta > 0) {
              const boostWord = command.appliedDelta === 1 ? 'subiu!' : command.appliedDelta === 2 ? 'subiu muito!' : 'subiu drasticamente!';
              this.view.displayMessage(`${name}: ${statName} ${boostWord}`);
            } else if (command.appliedDelta < 0) {
              const dropWord = command.appliedDelta === -1 ? 'caiu!' : command.appliedDelta === -2 ? 'caiu muito!' : 'caiu drasticamente!';
              this.view.displayMessage(`${name}: ${statName} ${dropWord}`);
            }
          }
          break;
        }
      }

      return Promise.resolve();
    }

    handleCommand(command, context = null) {
      return this.execute(command, context);
    }

    cancel() {
      // Nenhum estado pendente a cancelar no adapter
    }

    reset() {
      this.executedCommands = [];
    }
  }

  const exportsObj = {
    BattleUiDomAdapter
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportsObj;
  } else if (typeof window !== 'undefined') {
    window.PBABattleUi = window.PBABattleUi || {};
    Object.assign(window.PBABattleUi, exportsObj);
  }
})();
