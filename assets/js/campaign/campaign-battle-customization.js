/* P7 picker: natural abilities and a curated held-item slot with premium mobile touch equipment. */
(function () {
  const Rules = typeof module !== 'undefined' && module.exports
    ? require('../battle/battle-constants.js') : window.PBABattle;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const cap = s => String(s || '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const descriptions = {
    'leftovers': 'Recupera HP ao fim do turno.',
    'black-sludge': 'Recupera HP de Pokémon Poison; causa dano aos demais.',
    'life-orb': 'Aumenta o dano em 30% e consome 10% do HP após atacar.',
    'choice-band': 'Aumenta Attack em 50% e prende o usuário no primeiro golpe usado.',
    'choice-specs': 'Aumenta Special Attack em 50% e prende o usuário no primeiro golpe usado.',
    'choice-scarf': 'Aumenta Speed em 50% e prende o usuário no primeiro golpe usado.',
    'assault-vest': 'Aumenta Special Defense em 50% e impede o uso de golpes de status.',
    'focus-sash': 'Com HP cheio, permite sobreviver a um golpe fatal com 1 HP.',
    'sitrus-berry': 'Ao perder metade do HP, recupera um quarto do HP máximo.',
    'oran-berry': 'Ao perder metade do HP, recupera 10 HP.',
    'lum-berry': 'Cura qualquer condição de status ou confusão instantaneamente.',
    'chesto-berry': 'Cura a condição de sono instantaneamente.',
    'pecha-berry': 'Cura a condição de veneno instantaneamente.',
    'rawst-berry': 'Cura a condição de queimadura instantaneamente.',
    'aspear-berry': 'Cura a condição de congelamento instantaneamente.',
    'cheri-berry': 'Cura a condição de paralisia instantaneamente.',
    'heavy-duty-boots': 'Ignora armadilhas de entrada (Stealth Rock, Spikes, Toxic Spikes).',
    'shed-shell': 'Permite escapar de efeitos de aprisionamento.',
    'grip-claw': 'Prolonga a duração de golpes de aprisionamento parcial para 7 turnos.',
    'binding-band': 'Aumenta o dano de golpes de aprisionamento parcial de 1/8 para 1/6 por turno.',
    'light-clay': 'Prolonga a duração de barreiras (Reflect e Light Screen) de 5 para 8 turnos.',
    'power-herb': 'Permite executar um golpe de dois turnos imediatamente em uma ocasião.',
    'damp-rock': 'Prolonga a duração da chuva provocada pelo usuário para 8 turnos.',
    'heat-rock': 'Prolonga a duração do sol forte provocado pelo usuário para 8 turnos.',
    'smooth-rock': 'Prolonga a duração da tempestade de areia provocada pelo usuário para 8 turnos.',
    'icy-rock': 'Prolonga a duração da neve provocada pelo usuário para 8 turnos.',
    'terrain-extender': 'Prolonga a duração de terrenos provocados pelo usuário para 8 turnos.',
    'ability-shield': 'Protege a habilidade do usuário contra supressão e efeitos que a alteram.',
    'safety-goggles': 'Protege contra dano residual de clima e golpes baseados em pó ou esporos.',
    'rocky-helmet': 'Causa 1/6 de dano de recuo ao adversário sempre que sofrer contato físico.'
  };

  const QUICK_ITEMS = [
    { id: '', label: 'Sem item' },
    { id: 'life-orb', label: 'Life Orb' },
    { id: 'leftovers', label: 'Leftovers' },
    { id: 'choice-band', label: 'Choice Band' },
    { id: 'choice-specs', label: 'Choice Specs' },
    { id: 'choice-scarf', label: 'Choice Scarf' },
    { id: 'assault-vest', label: 'Assault Vest' },
    { id: 'focus-sash', label: 'Focus Sash' },
    { id: 'sitrus-berry', label: 'Sitrus Berry' },
    { id: 'heavy-duty-boots', label: 'Heavy-Duty Boots' },
    { id: 'rocky-helmet', label: 'Rocky Helmet' },
    { id: 'lum-berry', label: 'Lum Berry' }
  ];

  function describeItem(name) {
    if (!name) return 'Nenhum item equipado. O Pokémon lutará sem auxílio de itens consumíveis ou de suporte.';
    if (Rules?.P8?.specialItems?.[name]) {
      return 'Permite usar Light That Burns the Sky uma vez com Necrozma Ultra e Photon Geyser.';
    }
    const item = Rules?.P7?.items?.[name];
    if (descriptions[name]) return descriptions[name];
    if (item?.kind === 'plate') return `Aumenta o poder de ataques ${cap(item.type)} em 20% e define o tipo de Judgment como ${cap(item.type)}.`;
    if (item?.kind === 'memory') return `Define o tipo de Multi Attack como ${cap(item.type)}.`;
    if (item?.kind === 'drive') return `Define o tipo de Techno Blast como ${cap(item.type)}.`;
    return 'Item especial de suporte em batalha.';
  }

  function getMonDetails(view, id) {
    const roster = [
      ...(view.manager?.getRoster?.() || []),
      ...(view.manager?.getShadowGuests ? view.manager.getShadowGuests() : [])
    ];
    let mon = roster.find(p => p && p.id === id);
    if (!mon && typeof window !== 'undefined' && window.PBACampaign?.byId) {
      mon = window.PBACampaign.byId(id);
    }
    if (!mon && Rules?.byId) {
      mon = Rules.byId(id);
    }
    return mon || { id, name: `Pokémon #${id}`, sprite: '', types: ['normal'], bst: '—' };
  }

  function openEquipmentModal(view, initialMonId) {
    if (typeof document === 'undefined') return;
    const existing = document.getElementById('campaignEquipmentModalBackdrop');
    if (existing) existing.remove();

    let activeMonId = initialMonId;
    const selectedIds = (view.pick || []).filter(Boolean);

    const backdrop = document.createElement('div');
    backdrop.id = 'campaignEquipmentModalBackdrop';
    backdrop.className = 'campaign-equipment-modal-backdrop';
    backdrop.setAttribute('role', 'dialog');
    backdrop.setAttribute('aria-modal', 'true');
    backdrop.setAttribute('aria-labelledby', 'equipmentModalTitle');

    function renderModalContent() {
      const mon = getMonDetails(view, activeMonId);
      const isOwned = (view.manager?.getRosterIds?.() || []).includes(activeMonId);
      const pref = isOwned ? view.manager.getBattlePreference(activeMonId) : { ability: '', item: null };
      const currentItem = pref.item || '';
      const selectedIndex = selectedIds.indexOf(activeMonId);
      const roleText = selectedIndex === 0 ? '👑 Líder da Equipe' : (selectedIndex > 0 ? `${selectedIndex + 1}º Combatente` : 'Combatente');

      // Top team selector tabs if multiple Pokémon selected
      let teamTabsHtml = '';
      if (selectedIds.length > 1) {
        teamTabsHtml = `
          <div class="campaign-equipment-modal__tabs-bar" role="tablist" aria-label="Alternar Pokémon da equipe">
            ${selectedIds.map((id, idx) => {
              const m = getMonDetails(view, id);
              const p = view.manager?.getBattlePreference?.(id);
              const roleTag = idx === 0 ? '👑' : `${idx + 1}º`;
              const itemTag = p?.item ? cap(p.item) : 'Sem item';
              const active = id === activeMonId;
              return `
                <button type="button" role="tab" class="campaign-equipment-modal__tab ${active ? 'is-active' : ''}" data-switch-modal-mon="${id}" aria-selected="${active}">
                  <span class="campaign-equipment-modal__tab-role">${roleTag}</span>
                  <span class="campaign-equipment-modal__tab-name">${esc(cap(m.name))}</span>
                  <small class="campaign-equipment-modal__tab-item">${esc(itemTag)}</small>
                </button>
              `;
            }).join('')}
          </div>
        `;
      }

      // Quick pills
      const quickPillsHtml = QUICK_ITEMS.map(item => {
        const isActive = item.id === currentItem;
        return `
          <button type="button" class="campaign-equipment-modal__pill ${isActive ? 'is-active' : ''}" data-pill-item="${esc(item.id)}">
            ${esc(item.label)}
          </button>
        `;
      }).join('');

      // All canonical items sorted alphabetically
      const allItemKeys = Object.keys({ ...(Rules?.P7?.items || {}), ...(Rules?.P8?.specialItems || {}) }).sort();
      const allItemOptions = allItemKeys.map(key => {
        const isSelected = key === currentItem;
        return `<option value="${esc(key)}" ${isSelected ? 'selected' : ''}>${esc(cap(key))}</option>`;
      }).join('');

      backdrop.innerHTML = `
        <div class="campaign-equipment-modal" id="campaignEquipmentModal">
          <!-- Header -->
          <div class="campaign-equipment-modal__header">
            <div class="campaign-equipment-modal__title-group">
              <i class="fa-solid fa-briefcase campaign-equipment-modal__icon"></i>
              <h3 id="equipmentModalTitle">EQUIPAMENTO — ${esc(cap(mon.name).toUpperCase())}</h3>
            </div>
            <button type="button" class="campaign-equipment-modal__close-btn" id="closeEquipmentModalTop" aria-label="Fechar painel de equipamentos">×</button>
          </div>

          ${teamTabsHtml}

          <!-- Mon Summary Banner -->
          <div class="campaign-equipment-modal__mon-banner">
            <div class="campaign-equipment-modal__avatar-wrap">
              <img src="${esc(mon.sprite)}" alt="${esc(cap(mon.name))}" class="campaign-equipment-modal__mon-sprite">
            </div>
            <div class="campaign-equipment-modal__mon-details">
              <div class="campaign-equipment-modal__name-row">
                <strong class="campaign-equipment-modal__mon-name">${esc(cap(mon.name))}</strong>
                <span class="campaign-equipment-modal__role-badge">${esc(roleText)}</span>
              </div>
              <div class="campaign-equipment-modal__types-row">
                ${(mon.types || []).map(t => `<i class="type-chip type-${t}">${t}</i>`).join('')}
                <span class="campaign-equipment-modal__bst">BST ${esc(mon.bst)}</span>
              </div>
              <div class="campaign-equipment-modal__current-item-box" id="modalCurrentItemDisplay">
                <i class="fa-solid ${currentItem ? 'fa-shield-halved' : 'fa-circle-xmark'}"></i>
                <span>Item equipado: <strong class="${currentItem ? 'item-equipped' : 'item-none'}">${esc(currentItem ? cap(currentItem) : 'Nenhum (Sem item)')}</strong></span>
              </div>
            </div>
          </div>

          ${!isOwned ? `
            <div class="campaign-equipment-modal__guest-alert" role="alert">
              <i class="fa-solid fa-lock"></i>
              <div>
                <strong>Reforço Temporário</strong>
                <p>Este Pokémon retornou temporariamente para auxiliar no Final Stand. Seus itens e movimentos são fixos pelas regras canônicas da Prova.</p>
              </div>
            </div>
            <div class="campaign-equipment-modal__actions">
              <button type="button" class="campaign-secondary" id="equipmentModalCloseBtn">Fechar</button>
            </div>
          ` : `
            <!-- Quick select pills -->
            <div class="campaign-equipment-modal__section">
              <span class="campaign-equipment-modal__section-title"><i class="fa-solid fa-bolt"></i> Itens populares (seleção rápida):</span>
              <div class="campaign-equipment-modal__quick-pills">
                ${quickPillsHtml}
              </div>
            </div>

            <!-- Full catalogue selector -->
            <div class="campaign-equipment-modal__section">
              <label for="equipmentModalSelect" class="campaign-equipment-modal__section-title">
                <i class="fa-solid fa-list-check"></i> Catálogo completo (${allItemKeys.length} itens canônicos):
              </label>
              <select id="equipmentModalSelect" class="campaign-equipment-modal__select" aria-label="Selecione um item para equipar">
                <option value="" ${!currentItem ? 'selected' : ''}>Sem item</option>
                ${allItemOptions}
              </select>
            </div>

            <!-- Dynamic Effect Lore Box -->
            <div class="campaign-equipment-modal__desc-card" id="equipmentModalDescCard">
              <div class="campaign-equipment-modal__desc-header">
                <i class="fa-solid fa-circle-info"></i>
                <strong id="equipmentModalDescTitle">${esc(currentItem ? cap(currentItem) : 'Sem item')}</strong>
              </div>
              <p id="equipmentModalDescText">${esc(describeItem(currentItem))}</p>
            </div>

            <!-- Feedback Alert -->
            <div id="equipmentModalFeedback" class="campaign-equipment-modal__feedback" role="status" aria-live="polite"></div>

            <!-- Action buttons -->
            <div class="campaign-equipment-modal__actions">
              <button type="button" class="campaign-primary" id="equipmentModalSaveBtn">
                <i class="fa-solid fa-check"></i> Salvar equipamento
              </button>
              <button type="button" class="campaign-secondary" id="equipmentModalRemoveBtn">
                <i class="fa-solid fa-trash-can"></i> Remover item
              </button>
              <button type="button" class="campaign-secondary" id="equipmentModalCloseBtn">
                Fechar
              </button>
            </div>
          `}
        </div>
      `;

      bindModalEvents();
    }

    function bindModalEvents() {
      // Close button and backdrop click
      const closeTop = backdrop.querySelector('#closeEquipmentModalTop');
      const closeBtn = backdrop.querySelector('#equipmentModalCloseBtn');
      const closeModal = () => {
        backdrop.classList.add('is-closing');
        setTimeout(() => backdrop.remove(), 160);
      };
      if (closeTop) closeTop.onclick = closeModal;
      if (closeBtn) closeBtn.onclick = closeModal;

      backdrop.onclick = (e) => {
        if (e.target === backdrop) closeModal();
      };

      // Switch mon tab
      backdrop.querySelectorAll('[data-switch-modal-mon]').forEach(tab => {
        tab.onclick = () => {
          activeMonId = Number(tab.dataset.switchModalMon);
          renderModalContent();
        };
      });

      const select = backdrop.querySelector('#equipmentModalSelect');
      const descTitle = backdrop.querySelector('#equipmentModalDescTitle');
      const descText = backdrop.querySelector('#equipmentModalDescText');
      const pills = backdrop.querySelectorAll('[data-pill-item]');
      const feedback = backdrop.querySelector('#equipmentModalFeedback');
      const saveBtn = backdrop.querySelector('#equipmentModalSaveBtn');
      const removeBtn = backdrop.querySelector('#equipmentModalRemoveBtn');

      function updateItemSelection(newItemId) {
        if (!select) return;
        select.value = newItemId;
        const itemName = newItemId ? cap(newItemId) : 'Sem item';
        if (descTitle) descTitle.textContent = itemName;
        if (descText) descText.textContent = describeItem(newItemId);

        pills.forEach(p => {
          p.classList.toggle('is-active', p.dataset.pillItem === newItemId);
        });
        if (feedback) {
          feedback.textContent = '';
          feedback.className = 'campaign-equipment-modal__feedback';
        }
      }

      // Quick pills click
      pills.forEach(p => {
        p.onclick = () => {
          updateItemSelection(p.dataset.pillItem);
        };
      });

      // Select change
      if (select) {
        select.onchange = () => {
          updateItemSelection(select.value);
        };
      }

      // Save item
      if (saveBtn) {
        saveBtn.onclick = () => {
          const selectedItem = select.value || null;
          const currentPref = view.manager.getBattlePreference(activeMonId);
          const response = view.manager.setBattlePreference(activeMonId, {
            ability: currentPref.ability,
            teraType: currentPref.teraType,
            specialMechanic: currentPref.specialMechanic,
            item: selectedItem
          });

          if (response.ok) {
            if (feedback) {
              feedback.className = 'campaign-equipment-modal__feedback is-success';
              feedback.innerHTML = '<i class="fa-solid fa-circle-check"></i> Equipamento salvo com sucesso!';
            }
            // Sync current item readout in modal
            const currentItemBox = backdrop.querySelector('#modalCurrentItemDisplay');
            if (currentItemBox) {
              currentItemBox.innerHTML = `
                <i class="fa-solid ${selectedItem ? 'fa-shield-halved' : 'fa-circle-xmark'}"></i>
                <span>Item equipado: <strong class="${selectedItem ? 'item-equipped' : 'item-none'}">${esc(selectedItem ? cap(selectedItem) : 'Nenhum (Sem item)')}</strong></span>
              `;
            }

            // Sync tab preview if tab bar exists
            const activeTab = backdrop.querySelector(`.campaign-equipment-modal__tab[data-switch-modal-mon="${activeMonId}"] .campaign-equipment-modal__tab-item`);
            if (activeTab) {
              activeTab.textContent = selectedItem ? cap(selectedItem) : 'Sem item';
            }

            // Sync background equipment strip
            if (view.container) {
              const stripCard = view.container.querySelector(`.picker-equipment-card[data-equipment-slot="${activeMonId}"]`);
              if (stripCard) {
                stripCard.className = `picker-equipment-card ${selectedItem ? 'has-item' : 'no-item'}`;
                const tag = stripCard.querySelector('.picker-equipment-card__item-tag');
                if (tag) {
                  tag.className = `picker-equipment-card__item-tag ${selectedItem ? 'equipped' : 'none'}`;
                  tag.innerHTML = `<i class="fa-solid ${selectedItem ? 'fa-shield-halved' : 'fa-circle-xmark'}"></i> ${selectedItem ? esc(cap(selectedItem)) : 'Sem item'}`;
                }
                const label = stripCard.querySelector('.picker-equipment-card__item-label');
                if (label) {
                  label.innerHTML = selectedItem ? `Item: <strong>${esc(cap(selectedItem))}</strong>` : 'Nenhum item equipado';
                }
                const btn = stripCard.querySelector('.picker-equipment-card__btn');
                if (btn) {
                  btn.innerHTML = `<i class="fa-solid fa-briefcase"></i> <span>${selectedItem ? 'Trocar item' : 'Equipar item'}</span>`;
                }
              }

              // Sync draft grid card badge
              const gridCard = view.container.querySelector(`.draft-grid .campaign-mon[data-id="${activeMonId}"]`);
              if (gridCard) {
                let badge = gridCard.querySelector('.campaign-mon__item-badge');
                if (!badge) {
                  badge = document.createElement('span');
                  badge.className = 'campaign-mon__item-badge';
                  gridCard.appendChild(badge);
                }
                badge.className = `campaign-mon__item-badge ${selectedItem ? 'has-item' : 'no-item'}`;
                badge.innerHTML = `<i class="fa-solid ${selectedItem ? 'fa-briefcase' : 'fa-circle-minus'}"></i> ${selectedItem ? `Item: ${esc(cap(selectedItem))}` : 'Sem item'}`;
              }

              // Sync desktop select if present
              const desktopSelect = view.container.querySelector(`[data-p7-item="${activeMonId}"]`);
              if (desktopSelect) desktopSelect.value = selectedItem || '';
            }
          } else {
            if (feedback) {
              feedback.className = 'campaign-equipment-modal__feedback is-error';
              feedback.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i> Não foi possível salvar este equipamento.';
            }
          }
        };
      }

      // Remove item
      if (removeBtn) {
        removeBtn.onclick = () => {
          updateItemSelection('');
          if (saveBtn) saveBtn.click();
        };
      }
    }

    renderModalContent();
    document.body.appendChild(backdrop);
  }

  function install(View) {
    if (!View?.prototype?.renderPicker || View.prototype.renderPicker.__p7Equipment) return;
    const previous = View.prototype.renderPicker;

    function render() {
      const result = previous.call(this);
      if (['LEAGUE', 'TOWER'].includes(this.pending?.kind) && this.manager.getFacilityState(this.pending.kind, this.facilityCategory)?.run) {
        return result;
      }
      if (!this.pending || !this.container?.querySelector || !this.manager?.getBattlePreference) {
        return result;
      }

      const rosterIds = this.manager.getRosterIds() || [];
      const selected = (this.pick || []).filter(id => rosterIds.includes(id));
      const anchor = this.container.querySelector('#pickerActionBar') || this.container.querySelector('#startCampaignBattle');

      // 1. Render Desktop Loadout Section (for desktop view and regression tests)
      if (selected.length && anchor?.insertAdjacentHTML) {
        const rows = selected.map(id => {
          const pref = this.manager.getBattlePreference(id);
          const abilityOptions = Rules.P7.natural(id).map(a =>
            `<option value="${esc(a.name)}" ${a.name === pref.ability ? 'selected' : ''} ${[...Rules.P7.abilityNames, ...Rules.P8.abilityNames, ...Rules.Completion.abilityNames].includes(a.name) ? '' : 'disabled'}>${esc(cap(a.name))}${[...Rules.P7.abilityNames, ...Rules.P8.abilityNames, ...Rules.Completion.abilityNames].includes(a.name) ? '' : ' — efeito pendente'}</option>`
          ).join('');

          const itemOptions = '<option value="">Sem item</option>' + Object.keys({ ...Rules.P7.items, ...Rules.P8.specialItems }).sort().map(name =>
            `<option value="${esc(name)}" ${name === pref.item ? 'selected' : ''}>${esc(cap(name))}</option>`
          ).join('');

          return `<fieldset><legend>${esc(cap(this.manager.getRoster().find(p => p.id === id)?.name || id))}</legend><label>Habilidade natural <select data-p7-ability="${id}">${abilityOptions || '<option value="">Sem habilidade cadastrada</option>'}</select></label><label>Item de batalha <select data-p7-item="${id}">${itemOptions}</select></label><p>${esc(describeItem(pref.item))}</p><label>Tipo Tera <select data-p8-tera="${id}">${Rules.P8.teraTypes.filter(t => !Rules.P8.requiredTera(id) || t === Rules.P8.requiredTera(id)).map(t => `<option value="${t}" ${t === (pref.teraType || (Rules.P8.requiredTera(id) || this.manager.getRoster().find(p => p.id === id)?.types?.[0])) ? 'selected' : ''}>${cap(t)}</option>`).join('')}</select></label><label>Preparação especial <select data-p8-special="${id}">${['none', 'dynamax', 'tera', ...(id === 10157 ? ['z'] : [])].map(k => `<option value="${k}" ${k === (pref.specialMechanic || 'none') ? 'selected' : ''}>${({ none: 'Sem preferência especial', dynamax: 'Dynamax', tera: 'Terastallization', z: 'Golpe Z' })[k]}</option>`).join('')}</select></label><button type="button" class="campaign-primary" data-p7-save="${id}">Salvar equipamento</button><button type="button" class="campaign-secondary" data-p7-reset="${id}">Restaurar padrão</button></fieldset>`;
        }).join('');

        // Remove any previous desktop loadout section to avoid duplication
        const existingDesktop = this.container.querySelector('.campaign-equipment-editor.campaign-desktop-loadout');
        if (existingDesktop) existingDesktop.remove();

        anchor.insertAdjacentHTML('beforebegin', `<section class="campaign-equipment-editor campaign-desktop-loadout campaign-move-editor" aria-label="Habilidades e itens da equipe"><h3>Habilidades e itens</h3><p>Escolha a preparação da equipe. Itens consumidos em combate são restaurados ao iniciar outra batalha.</p>${rows}<p id="p7EquipmentError" role="alert"></p></section>`);

        this.container.querySelectorAll('[data-p7-save]').forEach(button => {
          button.onclick = () => {
            const id = Number(button.dataset.p7Save);
            const ability = this.container.querySelector(`[data-p7-ability="${id}"]`).value;
            const item = this.container.querySelector(`[data-p7-item="${id}"]`).value || null;
            const tera = this.container.querySelector(`[data-p8-tera="${id}"]`)?.value;
            const special = this.container.querySelector(`[data-p8-special="${id}"]`)?.value;
            const response = this.manager.setBattlePreference(id, {
              ability,
              item,
              ...(tera ? { teraType: tera } : {}),
              ...(special ? { specialMechanic: special } : {})
            });
            this.container.querySelector('#p7EquipmentError').textContent = response.ok ? 'Preparação salva.' : 'Não foi possível salvar esta preparação.';
          };
        });

        this.container.querySelectorAll('[data-p7-reset]').forEach(button => {
          button.onclick = () => this.manager.resetBattlePreference(Number(button.dataset.p7Reset));
        });
      }

      // 2. Render Mobile Equipment Strip and Item Badges
      const headerAnchor = this.container.querySelector('.picker-choice') || this.container.querySelector('.wild-picker-choice');
      const existingStrip = this.container.querySelector('#pickerTeamEquipmentStrip');
      if (existingStrip) existingStrip.remove();

      const allPicks = (this.pick || []).filter(Boolean);
      if (headerAnchor && allPicks.length > 0) {
        const stripCardsHtml = allPicks.map((id, index) => {
          const mon = getMonDetails(this, id);
          const isOwned = rosterIds.includes(id);
          const pref = isOwned ? this.manager.getBattlePreference(id) : { ability: '', item: null };
          const item = pref.item;
          const isLeader = index === 0;
          const roleBadge = isLeader ? '👑 Líder' : `${index + 1}º Combatente`;
          const monName = cap(mon.name);

          if (!isOwned) {
            return `
              <div class="picker-equipment-card is-guest" data-equipment-slot="${id}">
                <div class="picker-equipment-card__top">
                  <span class="picker-equipment-card__role">👑 Líder (Reforço)</span>
                </div>
                <div class="picker-equipment-card__body">
                  <img src="${esc(mon.sprite)}" alt="${esc(monName)}" class="picker-equipment-card__sprite">
                  <div class="picker-equipment-card__info">
                    <strong class="picker-equipment-card__name">${esc(monName)}</strong>
                    <span class="picker-equipment-card__item-status is-fixed">
                      <i class="fa-solid fa-lock"></i> Reforço · Equipamento fixo
                    </span>
                  </div>
                </div>
                <button type="button" class="picker-equipment-card__btn is-disabled" disabled title="Reforços temporários possuem configuração fixa para a batalha final.">
                  <i class="fa-solid fa-lock"></i> <span>Equipamento fixo</span>
                </button>
              </div>
            `;
          }

          return `
            <div class="picker-equipment-card ${item ? 'has-item' : 'no-item'}" data-equipment-slot="${id}">
              <div class="picker-equipment-card__top">
                <span class="picker-equipment-card__role">${esc(roleBadge)}</span>
                <span class="picker-equipment-card__item-tag ${item ? 'equipped' : 'none'}">
                  <i class="fa-solid ${item ? 'fa-shield-halved' : 'fa-circle-xmark'}"></i> ${item ? esc(cap(item)) : 'Sem item'}
                </span>
              </div>
              <div class="picker-equipment-card__body">
                <img src="${esc(mon.sprite)}" alt="${esc(monName)}" class="picker-equipment-card__sprite">
                <div class="picker-equipment-card__info">
                  <strong class="picker-equipment-card__name">${esc(monName)}</strong>
                  <span class="picker-equipment-card__item-label">
                    ${item ? `Item: <strong>${esc(cap(item))}</strong>` : 'Nenhum item equipado'}
                  </span>
                </div>
              </div>
              <button type="button" class="campaign-secondary picker-equipment-card__btn" data-open-equip-modal="${id}" aria-label="Equipar item em ${esc(monName)}">
                <i class="fa-solid fa-briefcase"></i> <span>${item ? 'Trocar item' : 'Equipar item'}</span>
              </button>
            </div>
          `;
        }).join('');

        const stripHtml = `
          <div class="picker-team-equipment-strip" id="pickerTeamEquipmentStrip" role="region" aria-label="Itens equipados nos combatentes selecionados">
            <div class="picker-equipment-strip-header">
              <span class="picker-equipment-strip-title"><i class="fa-solid fa-briefcase"></i> ITENS DA EQUIPE</span>
              <span class="picker-equipment-strip-hint">Toque para equipar antes da batalha</span>
            </div>
            <div class="picker-equipment-strip-cards">
              ${stripCardsHtml}
            </div>
          </div>
        `;

        headerAnchor.insertAdjacentHTML('afterend', stripHtml);

        // Wire modal open events
        this.container.querySelectorAll('[data-open-equip-modal]').forEach(button => {
          button.onclick = (e) => {
            e.stopPropagation();
            const id = Number(button.dataset.openEquipModal);
            openEquipmentModal(this, id);
          };
        });
      }

      // 3. Sync Item Badges on Draft Grid cards
      this.container.querySelectorAll('.draft-grid .campaign-mon.selected').forEach(button => {
        const id = Number(button.dataset.id);
        const isOwned = rosterIds.includes(id);
        if (isOwned) {
          const pref = this.manager.getBattlePreference(id);
          let badge = button.querySelector('.campaign-mon__item-badge');
          if (!badge) {
            badge = document.createElement('span');
            badge.className = 'campaign-mon__item-badge';
            button.appendChild(badge);
          }
          badge.className = `campaign-mon__item-badge ${pref.item ? 'has-item' : 'no-item'}`;
          badge.innerHTML = `<i class="fa-solid ${pref.item ? 'fa-briefcase' : 'fa-circle-minus'}"></i> ${pref.item ? `Item: ${esc(cap(pref.item))}` : 'Sem item'}`;
        }
      });

      return result;
    }

    render.__p7Equipment = true;
    View.prototype.renderPicker = render;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { install, describeItem, openEquipmentModal };
  } else {
    window.PBACampaign = window.PBACampaign || {};
    window.PBACampaign.CampaignBattleCustomization = { install, describeItem, openEquipmentModal };
    install(window.PBACampaign.CampaignView);
  }
})();
