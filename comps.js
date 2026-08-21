(function () {
  const data = window.CS_DATA || {};
  const comps = Array.isArray(data.comps) ? data.comps : [];
  const units = Array.isArray(data.units) ? data.units : [];
  const unitMap = new Map(units.map(unit => [String(unit.name).toLowerCase(), unit]));
  const grid = document.getElementById('compsGrid');
  const empty = document.getElementById('compsEmpty');
  const count = document.getElementById('compCount');
  const search = document.getElementById('compSearch');
  const detail = document.getElementById('compDetail');
  const backdrop = document.getElementById('compBackdrop');
  const BOARD_COLUMNS = 8;
  const BOARD_ROWS = 5;
const POSITION_KEY = 'cybernetic-strategy-comp-positions-v2';
  let activeStyle = 'all';

  function escapeHtml(value) { return String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c])); }
  function unitFor(name) {
    const exact = unitMap.get(String(name).toLowerCase());
    if (exact) return exact;
    return units.find(unit => String(unit.name).toLowerCase().replace(/[^a-z0-9]/g, '') === String(name).toLowerCase().replace(/[^a-z0-9]/g, ''));
  }
  function unitIcon(unit) {
    if (!unit) return '';
    const file = unit.iconImageName || `${unit.imageName || unit.name}Icon`;
    return `images/optimized/icons/${encodeURIComponent(file).replace(/%2F/gi, '/')}.webp`;
  }
  function abilityText(unit) {
    return String(unit?.abilityDescription || unit?.abilitySummary || 'Ability information has not been added yet.').replace(/\s+/g, ' ').trim();
  }
  function itemIcon(name) {
    const file = `${String(name || '').replace(/[^a-z0-9]/gi, '')}Icon.png`;
    return `images/items/${encodeURIComponent(file)}`;
  }
  function itemMarkup(name) {
    return `<span class="item-chip" title="${escapeHtml(name)}"><img src="${itemIcon(name)}" alt="" onerror="this.style.display='none'" /><span>${escapeHtml(name)}</span></span>`;
  }
  function recommendationMarkup(comp) {
    const groups = Array.isArray(comp.itemRecommendations) ? comp.itemRecommendations : [];
    const carries = [...new Set(groups.flatMap(group => group.carries || []))];
    return carries.map(carry => `<section class="detail-recommendation-unit"><h4>${escapeHtml(carry)}</h4>${['T0', 'T1', 'T2', 'T3'].map(tier => {
      const items = groups.filter(group => group.tier === tier && (group.carries || []).includes(carry)).flatMap(group => group.items || []);
      return `<div class="detail-recommendation-tier"><strong>${tier}</strong><div>${items.map(itemMarkup).join('')}</div></div>`;
    }).join('')}</section>`).join('');
  }
  function matches(comp) {
    const query = search.value.trim().toLowerCase();
    const haystack = [comp.name, comp.description, comp.carry, ...(comp.traits || []), ...(comp.units || [])].join(' ').toLowerCase();
    return (activeStyle === 'all' || comp.style === activeStyle) && (!query || haystack.includes(query));
  }
  function unitMarkup(name) {
    const unit = unitFor(name);
    return `<span class="comp-unit">${unit ? `<img src="${unitIcon(unit)}" alt="" />` : ''}<span>${escapeHtml(name)}</span></span>`;
  }
  function defaultPositions(names) {
    const positions = ['2-1', '3-1', '4-1', '2-2', '3-2', '4-2', '5-2', '6-2', '2-3', '3-3'];
    return Object.fromEntries((names || []).map((name, index) => [name, positions[index % positions.length]]));
  }
  function positionState(comp) {
    let saved = {};
    try { saved = JSON.parse(localStorage.getItem(POSITION_KEY) || '{}')[comp.id] || {}; } catch (_) { saved = {}; }
    return { ...defaultPositions(comp.units), ...(comp.positions || {}), ...saved };
  }
  function boardMarkup(names, comp = null) {
    const positions = comp ? positionState(comp) : defaultPositions(names);
    const unitAt = new Map((names || []).map(name => [positions[name], name]));
    const cells = [];
    for (let row = 1; row <= BOARD_ROWS; row += 1) {
      for (let column = 1; column <= BOARD_COLUMNS; column += 1) {
        const key = `${column}-${row}`;
        const name = unitAt.get(key);
        const unit = name ? unitFor(name) : null;
        const tooltip = unit ? `<span class="comp-token__tooltip"><strong>${escapeHtml(unit.name)}</strong><em>${escapeHtml(unit.role || '')}</em><span>${escapeHtml(abilityText(unit))}</span></span>` : '';
        const token = name ? (comp ? `<button class="comp-hex comp-token" type="button" draggable="true" data-unit="${escapeHtml(name)}" title="Drag ${escapeHtml(name)}">${unit ? `<img src="${unitIcon(unit)}" alt="${escapeHtml(name)}" />` : `<span>${escapeHtml(name.slice(0, 2))}</span>`}</button>` : `<span class="comp-hex comp-token" title="${escapeHtml(name)}">${unit ? `<img src="${unitIcon(unit)}" alt="${escapeHtml(name)}" />` : `<span>${escapeHtml(name.slice(0, 2))}</span>`}</span>`) : '';
        cells.push(`<span class="comp-cell${row % 2 ? ' comp-cell--offset' : ''}" style="--hex-column:${column};--hex-row:${row}" data-cell="${key}">${token}${tooltip}</span>`);
      }
    }
    return `<div class="comp-board${comp ? ' comp-board--interactive' : ''}"${comp ? ` id="compBoard" data-comp-id="${escapeHtml(comp.id)}"` : ''}>${cells.join('')}</div>`;
  }
  function savePositions(comp, positions) {
    let all = {};
    try { all = JSON.parse(localStorage.getItem(POSITION_KEY) || '{}'); } catch (_) { all = {}; }
    all[comp.id] = positions;
    localStorage.setItem(POSITION_KEY, JSON.stringify(all));
  }
  function initBoard(comp) {
    const board = document.getElementById('compBoard');
    if (!board) return;
    let positions = positionState(comp);
    let draggingUnit = '';
    board.addEventListener('pointerdown', event => {
      const token = event.target.closest('.comp-token');
      if (!token) return;
      draggingUnit = token.dataset.unit;
      token.classList.add('is-dragging');
      token.setPointerCapture?.(event.pointerId);
    });
    board.addEventListener('pointermove', event => {
      if (!draggingUnit) return;
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.comp-cell');
      board.querySelectorAll('.comp-cell').forEach(cell => cell.classList.toggle('is-target', cell === target));
    });
    board.addEventListener('pointerup', event => {
      if (!draggingUnit) return;
      const token = board.querySelector(`[data-unit="${CSS.escape(draggingUnit)}"]`);
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('.comp-cell');
      const targetKey = target?.dataset.cell;
      const previousKey = positions[draggingUnit];
      const occupant = Object.keys(positions).find(name => positions[name] === targetKey && name !== draggingUnit);
      if (targetKey && targetKey !== previousKey) {
        positions[draggingUnit] = targetKey;
        if (occupant) positions[occupant] = previousKey;
        savePositions(comp, positions);
        board.outerHTML = boardMarkup(comp.units, comp);
        initBoard(comp);
      }
      token?.classList.remove('is-dragging');
      board.querySelectorAll('.comp-cell').forEach(cell => cell.classList.remove('is-target'));
      draggingUnit = '';
    });
  }
  function render() {
    const visible = comps.filter(matches);
    count.textContent = `${visible.length} composition${visible.length === 1 ? '' : 's'}`;
    empty.hidden = visible.length > 0;
    const tiers = [...new Set(visible.map(comp => String(comp.tier || '—')))].sort((a, b) => ['S', 'A', 'B', 'C', 'D'].indexOf(a) - ['S', 'A', 'B', 'C', 'D'].indexOf(b));
    grid.innerHTML = tiers.map(tier => `<section class="comp-tier-row" data-tier="${escapeHtml(tier)}"><h2 class="comp-tier-label">${escapeHtml(tier)}</h2><div class="comp-tier-cards">${visible.filter(comp => String(comp.tier || '—') === tier).map(comp => `<button class="comp-card" data-comp-id="${escapeHtml(comp.id)}" type="button">
      <div class="comp-card__top"><span class="comp-card__style">${escapeHtml(comp.style || 'Archive')}</span><span class="comp-card__style">${escapeHtml(comp.difficulty || '')}</span></div>
      <h2>${escapeHtml(comp.name)}</h2>
      ${boardMarkup(comp.units)}
      <div class="comp-card__footer"><span class="comp-card__carry">Carry: ${escapeHtml(comp.carry || 'Flexible')}</span><span>${escapeHtml(comp.patch || '')}</span></div>
    </button>`).join('')}</div></section>`).join('');
  }
  function detailUnitMarkup(name) {
    const unit = unitFor(name);
    return `<div class="detail-unit">${unit ? `<img src="${unitIcon(unit)}" alt="" />` : ''}<span>${escapeHtml(name)}</span></div>`;
  }
  function openDetail(comp) {
    document.getElementById('compDetailContent').innerHTML = `<div class="comp-detail-layout">
      <section class="comp-detail__identity">
        <p class="detail-kicker">${escapeHtml(comp.tier || 'Archive')} tier</p>
        <h2 id="compDetailTitle">${escapeHtml(comp.name)}</h2>
        <p class="identity-style">${escapeHtml(comp.style || 'Composition')} / ${escapeHtml(comp.difficulty || '')}</p>
        <span class="identity-label">Trait web</span><div class="identity-traits">${(comp.traits || []).map(trait => `<span class="detail-trait">${escapeHtml(trait)}</span>`).join('')}</div>
        <div class="identity-carry"><span>Carry focus</span><strong>${escapeHtml(comp.carry || 'Flexible')}</strong></div>
        <button class="detail-copy-button" id="copyComp" type="button">Copy comp</button>
      </section>
      <section class="comp-detail__main">
        <div class="detail-block"><h3>Core units</h3><div class="detail-roster">${(comp.units || []).map(detailUnitMarkup).join('')}</div></div>
        <div class="detail-block detail-positioning"><div class="detail-board-heading"><h3>Positioning board</h3><button class="detail-reset-button" id="resetBoard" type="button">Reset</button></div>${boardMarkup(comp.units, comp)}<p class="board-help">Drag a unit to another hex. Drop on an occupied hex to swap positions.</p></div>
        <div class="detail-block"><h3>Opening plan</h3><p class="detail-copy">${escapeHtml(comp.opening || '')}</p><h3>Leveling</h3><p class="detail-copy">${escapeHtml(comp.leveling || '')}</p></div>
      </section>
      <aside class="comp-detail__rail">
        <div class="detail-block"><h3>Recommended items</h3><div class="detail-recommendations">${recommendationMarkup(comp)}</div></div>
      </aside>
    </div>`;
    document.getElementById('copyComp').addEventListener('click', async event => {
      const text = `${comp.name}\n${(comp.units || []).join(', ')}`;
      try { await navigator.clipboard.writeText(text); event.currentTarget.textContent = 'Copied'; } catch (_) { event.currentTarget.textContent = 'Select roster'; }
    });
    document.getElementById('resetBoard').addEventListener('click', () => {
      savePositions(comp, comp.positions || defaultPositions(comp.units));
      document.getElementById('compBoard').outerHTML = boardMarkup(comp.units, comp);
      initBoard(comp);
    });
    initBoard(comp);
    detail.classList.add('is-open'); backdrop.classList.add('is-open'); detail.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden';
  }
  function closeDetail() { detail.classList.remove('is-open'); backdrop.classList.remove('is-open'); detail.setAttribute('aria-hidden', 'true'); document.body.style.overflow = ''; }
  search.addEventListener('input', render);
  document.querySelectorAll('.comp-filter').forEach(button => button.addEventListener('click', () => { activeStyle = button.dataset.style; document.querySelectorAll('.comp-filter').forEach(item => item.classList.toggle('is-active', item === button)); render(); }));
  grid.addEventListener('click', event => { const card = event.target.closest('[data-comp-id]'); if (card) openDetail(comps.find(comp => comp.id === card.dataset.compId)); });
  document.getElementById('compClose').addEventListener('click', closeDetail); backdrop.addEventListener('click', closeDetail); document.addEventListener('keydown', event => { if (event.key === 'Escape') closeDetail(); });
  render();
}());
