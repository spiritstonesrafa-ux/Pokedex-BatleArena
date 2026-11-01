/**
 * ====================================================================
 * CONSTANTES DE EFEITOS VISUAIS DE CONDIÇÕES: (pokemon-status-vfx-constants.js)
 * ====================================================================
 * Define identificadores, estados de animação, durações e metadados visuais
 * das condições de batalha nos Pokémon (Queimadura, Veneno, Veneno Grave,
 * Paralisia, Sono, Congelamento e Confusão).
 *
 * Princípios Fundamentais:
 * - O sistema de VFX de status é puramente visual e reativo aos eventos do motor;
 * - O motor de combate (BattleEngine) é a única fonte de verdade;
 * - Suporta coexistência de Confusão com qualquer condição primária;
 * - Suporta batalhas individuais, equipes (3x3), campanha, Final Stand e duplas;
 * - Suporta Node.js (CommonJS) e Navegadores (window.PBAStatusVfx).
 */

(function () {
  'use strict';

  /**
   * Condições primárias de status reconhecidas pelo motor.
   */
  const STATUS_CONDITIONS = Object.freeze({
    BURN: 'burn',
    POISON: 'poison',
    TOXIC: 'toxic',
    PARALYSIS: 'paralysis',
    SLEEP: 'sleep',
    FREEZE: 'freeze'
  });

  /**
   * Condição volátil tratada com camada visual independente.
   */
  const VOLATILE_CONDITIONS = Object.freeze({
    CONFUSION: 'confusion'
  });

  /**
   * Estados do ciclo de vida da animação de status.
   */
  const STATUS_VFX_STATES = Object.freeze({
    IDLE: 'idle',
    ENTRANCE: 'entrance',
    PULSE_DAMAGE: 'pulse_damage',
    PULSE_IMMOBILIZED: 'pulse_immobilized',
    PULSE_CONFUSION_DAMAGE: 'pulse_confusion_damage',
    PULSE_CONFUSION_CHECK: 'pulse_confusion_check'
  });

  /**
   * Durações conceituais padrão (em milissegundos).
   */
  const STATUS_VFX_DURATIONS = Object.freeze({
    ENTRANCE: 450,
    PULSE_DAMAGE: 450,
    PULSE_IMMOBILIZED: 450,
    PULSE_CONFUSION_DAMAGE: 450,
    PULSE_CONFUSION_CHECK: 350,
    REDUCED_MOTION: 0
  });

  /**
   * Metadados e identidades visuais de cada condição implementada.
   */
  const STATUS_IDENTITIES = Object.freeze({
    [STATUS_CONDITIONS.BURN]: Object.freeze({
      id: STATUS_CONDITIONS.BURN,
      label: 'Queimadura',
      color: '#f97316',
      ambientColor: 'rgba(249, 115, 22, 0.25)',
      description: 'Pequenas brasas e chamas alaranjadas próximas ao corpo, com pulso de combustão evidente no dano residual.',
      shapes: ['flame', 'ember', 'radial-glow'],
      hasDamagePulse: true,
      hasImmobilizedHighlight: false
    }),
    [STATUS_CONDITIONS.POISON]: Object.freeze({
      id: STATUS_CONDITIONS.POISON,
      label: 'Veneno',
      color: '#a855f7',
      ambientColor: 'rgba(168, 85, 247, 0.22)',
      description: 'Bolhas e partículas roxas translúcidas ascendentes com névoa discreta na base e pulso de borbulhamento ao sofrer dano residual.',
      shapes: ['bubble', 'haze'],
      hasDamagePulse: true,
      hasImmobilizedHighlight: false
    }),
    [STATUS_CONDITIONS.TOXIC]: Object.freeze({
      id: STATUS_CONDITIONS.TOXIC,
      label: 'Veneno Grave',
      color: '#701a75',
      ambientColor: 'rgba(112, 26, 117, 0.35)',
      description: 'Miasma violeta-escuro denso e espirais tóxicas com glifos pontiagudos de perigo e pulso cáustico mais agressivo que o veneno comum.',
      shapes: ['miasma', 'toxic-spike', 'dark-bubble'],
      hasDamagePulse: true,
      hasImmobilizedHighlight: false
    }),
    [STATUS_CONDITIONS.PARALYSIS]: Object.freeze({
      id: STATUS_CONDITIONS.PARALYSIS,
      label: 'Paralisia',
      color: '#facc15',
      ambientColor: 'rgba(250, 204, 21, 0.28)',
      description: 'Pequenos arcos elétricos amarelos intermitentes e destaque de descarga violenta quando a paralisia impede a ação.',
      shapes: ['electric-arc', 'spark'],
      hasDamagePulse: false,
      hasImmobilizedHighlight: true
    }),
    [STATUS_CONDITIONS.SLEEP]: Object.freeze({
      id: STATUS_CONDITIONS.SLEEP,
      label: 'Sono',
      color: '#93c5fd',
      ambientColor: 'rgba(147, 197, 253, 0.2)',
      description: 'Indicação de respiração calma e serena com símbolos "Z" flutuantes ascendentes, sem simular dor ou dano.',
      shapes: ['floating-z', 'breath-wave'],
      hasDamagePulse: false,
      hasImmobilizedHighlight: true
    }),
    [STATUS_CONDITIONS.FREEZE]: Object.freeze({
      id: STATUS_CONDITIONS.FREEZE,
      label: 'Congelamento',
      color: '#38bdf8',
      ambientColor: 'rgba(56, 189, 248, 0.3)',
      description: 'Cristais azulados e camada translúcida facetada de gelo, mantendo o Pokémon reconhecível e emitindo brilho gélido ao ficar preso.',
      shapes: ['ice-crystal', 'frost-shell', 'glint'],
      hasDamagePulse: false,
      hasImmobilizedHighlight: true
    }),
    [VOLATILE_CONDITIONS.CONFUSION]: Object.freeze({
      id: VOLATILE_CONDITIONS.CONFUSION,
      label: 'Confusão',
      color: '#fbbf24',
      ambientColor: 'rgba(251, 191, 36, 0.25)',
      description: 'Estrelas e espirais douradas girando em órbita elíptica ao redor da cabeça, podendo coexistir com qualquer condição principal.',
      shapes: ['orbit-star', 'swirl'],
      hasDamagePulse: true,
      hasImmobilizedHighlight: false
    })
  });

  /**
   * Outros estados de batalha já suportados pelo motor de combate,
   * documentados para referência arquitetural e mapeamento de candidatos futuros.
   */
  const ADDITIONAL_ENGINE_CONDITIONS = Object.freeze({
    DROWSY: Object.freeze({
      id: 'drowsy',
      name: 'Sonolência (Yawn)',
      category: 'volatile',
      description: 'Estado transitório de sonolência induzido por Yawn que culmina em sono no final do turno seguinte se o alvo não possuir outra condição.'
    }),
    FLINCH: Object.freeze({
      id: 'flinch',
      name: 'Hesitação (Flinch)',
      category: 'volatile',
      description: 'Perda temporária da ação no mesmo turno quando atingido por golpe de hesitação com atacante mais rápido.'
    }),
    PROTECT: Object.freeze({
      id: 'protect',
      name: 'Proteção Ativa (Protect/Detect)',
      category: 'volatile',
      description: 'Barreira defensiva com prioridade +4 que bloqueia dano direto e status no turno de execução.'
    }),
    RECHARGE: Object.freeze({
      id: 'recharge',
      name: 'Recarga Obrigatória',
      category: 'volatile',
      description: 'Turno de descanso obrigatório após acerto de golpes hiperpotentes (Hyper Beam, Giga Impact, etc.).'
    }),
    TWO_TURN_CHARGE: Object.freeze({
      id: 'twoTurnMove',
      name: 'Carga em Dois Turnos e Semi-invulnerabilidade',
      category: 'volatile',
      description: 'Preparação no turno 1 (Solar Beam, Fly, Dig, Dive, Bounce) e ataque no turno 2, conferindo estados aéreo, subterrâneo ou submerso.'
    }),
    BIDE: Object.freeze({
      id: 'bide',
      name: 'Armazenamento de Bide',
      category: 'volatile',
      description: 'Dois turnos acumulando dano direto recebido para liberação em dobro no terceiro turno.'
    }),
    BEAK_BLAST_SHELL_TRAP: Object.freeze({
      id: 'prepMoves',
      name: 'Preparação Ofensiva Condicional',
      category: 'volatile',
      description: 'Aquecimento do bico para queimar no contato (Beak Blast) ou armadilha que detona se receber golpe físico (Shell Trap).'
    }),
    STAT_STAGES: Object.freeze({
      id: 'statStages',
      name: 'Modificadores de Atributos',
      category: 'volatile',
      description: 'Aumentos (+1 a +6) ou reduções (-1 a -6) nos atributos de Ataque, Defesa, Atq. Esp., Def. Esp., Velocidade, Precisão ou Evasão.'
    }),
    COMMANDER: Object.freeze({
      id: 'commander',
      name: 'Commander (Duplas)',
      category: 'ability_state',
      description: 'Tatsugiri incorpora Dondozo em duplas, ocultando-se e concedendo +2 em todos os atributos ao hospedeiro.'
    })
  });

  const api = Object.freeze({
    STATUS_CONDITIONS,
    VOLATILE_CONDITIONS,
    STATUS_VFX_STATES,
    STATUS_VFX_DURATIONS,
    STATUS_IDENTITIES,
    ADDITIONAL_ENGINE_CONDITIONS
  });

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else if (typeof window !== 'undefined') {
    window.PBAStatusVfx = window.PBAStatusVfx || {};
    Object.assign(window.PBAStatusVfx, api);
  }
})();
