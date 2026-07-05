(function () {
  const COST_COLORS = {
    1: '#9aa1b5',
    2: '#46e28f',
    3: '#48b4ff',
    4: '#b06cff',
    5: '#f3c969'
  };

  function data() {
    return window.CS_DATA || { units: [], traits: [], stories: [] };
  }

  function getInitialMark(text, fallback = 'CS') {
    const source = String(text || fallback).replace(/[^a-zA-Z0-9 ]/g, ' ').trim();
    if (!source) return fallback;
    const parts = source.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
  }

  function unitMark(unit) { return getInitialMark(unit && unit.name, 'UN'); }
  function traitMark(trait) { return getInitialMark(trait && trait.name ? trait.name : trait, 'TR'); }
  function storyMark(story) { return getInitialMark(story && story.title, 'ST'); }

  function costColor(cost) {
    return COST_COLORS[cost] || COST_COLORS[1];
  }

  function getRoleCat(role) {
    if (!role) return 'hybrid';
    const r = String(role).toLowerCase();
    if (r.includes('tank')) return 'tank';
    if (r.includes('marksman')) return 'marksman';
    if (r.includes('fighter') || r.includes('assassin')) return 'fighter';
    if (r.includes('caster') && !r.includes('attack')) return 'caster';
    return 'hybrid';
  }

  function imageSafeName(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');
  }

  function unitImagePath(unit) {
    const safeName = unit.imageName || imageSafeName(unit.name);
    return `./images/units/${safeName}Card.png`;
  }

  function traitImagePath(name) {
    const safeName = imageSafeName(name);
    return `./images/traits/${safeName}Icon.png`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderStars(container, count = 72) {
    if (!container) return;
    container.innerHTML = '';
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const star = document.createElement('span');
      star.className = 'particle-star';
      star.style.left = `${Math.random() * 100}%`;
      star.style.top = `${Math.random() * 100}%`;
      star.style.animationDelay = `${Math.random() * 8}s`;
      star.style.animationDuration = `${4 + Math.random() * 8}s`;
      frag.appendChild(star);
    }
    container.appendChild(frag);
  }

  function unitPortraitHTML(unit, className = 'unit-card__portrait') {
    const color = costColor(unit.cost);
    const imgPath = unitImagePath(unit);
    return `
      <div class="${className}" style="background:linear-gradient(160deg,${color}25,#06081099)" data-role="${escapeHtml(getRoleCat(unit.role))}">
        <div class="unit-card__bg"></div>
        <img class="unit-card__portrait-img" src="${imgPath}" alt="${escapeHtml(unit.name)}"
             onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
        <span class="unit-card__portrait-mark" style="display:none">${escapeHtml(unitMark(unit))}</span>
        <div class="unit-card__overlay"></div>
        <span class="unit-card__cost-badge cost-${unit.cost}">${escapeHtml(unit.cost)}</span>
      </div>
    `;
  }

  function renderUnitCard(unit) {
    return `
      <article class="unit-card" data-cost="${escapeHtml(unit.cost)}" data-role="${escapeHtml(getRoleCat(unit.role))}" onclick="openUnitModal('${escapeHtml(unit.id)}')">
        ${unitPortraitHTML(unit)}
        <div class="unit-card__info">
          <h3 class="unit-card__name">${escapeHtml(unit.name)}</h3>
          <p class="unit-card__subtitle">${escapeHtml(unit.subtitle || 'Subtitle')}</p>
        </div>
      </article>
    `;
  }

  function randomSpotlightIndex(excludeIndex = null) {
    const units = data().units || [];
    if (!units.length) return 0;
    if (units.length === 1) return 0;
    let nextIndex = Math.floor(Math.random() * units.length);
    const current = excludeIndex === null ? null : Number(excludeIndex);
    while (nextIndex === current) {
      nextIndex = Math.floor(Math.random() * units.length);
    }
    return nextIndex;
  }

  function renderSpotlight(index = randomSpotlightIndex()) {
    const root = document.getElementById('spotlight');
    if (!root) return;
    const units = data().units || [];
    if (!units.length) {
      root.innerHTML = '<p class="section-desc">Roster data was not found.</p>';
      root.classList.add('loaded');
      return;
    }
    const pool = units;
    const safeIndex = ((Number(index) % pool.length) + pool.length) % pool.length;
    const unit = pool[safeIndex];
    const traits = Array.isArray(unit.traits) ? unit.traits : [];
    root.dataset.index = String(safeIndex);
    root.innerHTML = `
      ${unitPortraitHTML(unit, 'spotlight__portrait')}
      <div class="spotlight__content">
        <h3 class="spotlight__name">${escapeHtml(unit.name)}</h3>
        <p class="spotlight__subtitle">${escapeHtml(unit.subtitle || 'Subtitle')}</p>
        <p class="spotlight__lore">${escapeHtml(unit.lore || 'No biography entry has been added for this unit yet.')}</p>
        <div class="spotlight__traits" aria-label="Unit traits">
          ${traits.map(t => `<button class="spotlight__trait" onclick="event.stopPropagation(); openTraitModalByName('${escapeHtml(t)}')">${escapeHtml(t)}</button>`).join('')}
        </div>
      </div>
    `;
    root.classList.add('loaded');

    const dots = document.getElementById('spotlightDots');
    if (dots) {
      dots.innerHTML = Array.from({ length: 5 }, (_, i) =>
        `<span class="spotlight-nav__dot ${i === 2 ? 'active' : ''}"></span>`
      ).join('');
    }
  }

  function renderRandomSpotlight() {
    const root = document.getElementById('spotlight');
    const current = root ? Number(root.dataset.index || 0) : null;
    renderSpotlight(randomSpotlightIndex(current));
  }

  function renderTraitGrid(filter = 'all') {
    const grid = document.getElementById('traitsGrid');
    if (!grid) return;
    const traits = (data().traits || []).filter(t => filter === 'all' || t.type === filter);
    grid.innerHTML = traits.map(trait => `
      <article class="trait-card" onclick="openTraitModal('${escapeHtml(trait.id)}')" style="--trait-color:${escapeHtml(trait.color || '#45d8ff')}">
        <div class="trait-card__icon">${escapeHtml(traitMark(trait))}</div>
        <div class="trait-card__type" style="color:${escapeHtml(trait.color || '#45d8ff')}">${escapeHtml(trait.type || 'trait')}</div>
        <h3 class="trait-card__name">${escapeHtml(trait.name)}</h3>
        <p class="trait-card__tagline">${escapeHtml(trait.tagline || '')}</p>
      </article>
    `).join('') || '<p class="section-desc">Trait data was not found.</p>';
  }

  function renderUnitsPreview(costFilter = 'all') {
    const grid = document.getElementById('unitsGrid');
    if (!grid) return;
    const units = data().units || [];
    const filtered = units.filter(unit => costFilter === 'all' || String(unit.cost) === String(costFilter)).slice(0, 12);
    grid.innerHTML = filtered.map(renderUnitCard).join('') || '<p class="section-desc">Roster data was not found.</p>';
  }

  function renderStoriesPreview() {
    const grid = document.getElementById('storiesGrid');
    if (!grid) return;
    const stories = (data().stories || []).slice(0, 3);
    grid.innerHTML = stories.map(story => `
      <article class="story-card" onclick="openStoryModal('${escapeHtml(story.id)}')">
        <div class="story-card__banner" style="background:${escapeHtml(story.color || '#45d8ff')}18">
          <div class="story-card__banner-bg" style="background:${escapeHtml(story.color || '#45d8ff')}"></div>
          <span class="story-card__banner-mark">${escapeHtml(storyMark(story))}</span>
        </div>
        <div class="story-card__body">
          <div class="story-card__meta">
            <span class="story-card__type">${escapeHtml(story.type || 'Archive')}</span>
            <span class="story-card__category">${escapeHtml(story.category || '')}</span>
          </div>
          <h3 class="story-card__title">${escapeHtml(story.title)}</h3>
          <p class="story-card__excerpt">${escapeHtml(story.excerpt || '')}</p>
        </div>
      </article>
    `).join('') || '<p class="section-desc">Story data was not found.</p>';
  }


  function renderRegionsPreview() {
    const grid = document.getElementById('regionsGrid');
    if (!grid) return;
    const regions = data().regions || [];
    grid.innerHTML = regions.map(region => `
      <article class="region-card" style="--region-color:${escapeHtml(region.color || '#45d8ff')}">
        <div class="region-card__mark">${escapeHtml(getInitialMark(region.name, 'RG'))}</div>
        <div class="region-card__body">
          <p class="region-card__meta">${escapeHtml(region.pronunciation || 'The Dominion')}</p>
          <h3 class="region-card__title">${escapeHtml(region.name)}</h3>
          <p class="region-card__tagline">${escapeHtml(region.tagline || '')}</p>
          <p class="region-card__desc">${escapeHtml(region.description || '')}</p>
        </div>
      </article>
    `).join('') || '<p class="section-desc">Region data was not found.</p>';
  }

  function renderFactionsPreview() {
    const grid = document.getElementById('factionsGrid');
    if (!grid) return;
    const factions = data().factions || [];
    grid.innerHTML = factions.slice(0, 6).map(faction => `
      <article class="faction-card" style="--faction-color:${escapeHtml(faction.color || '#45d8ff')}">
        <div class="faction-card__type">${escapeHtml(faction.type || 'Faction')}</div>
        <h3 class="faction-card__title">${escapeHtml(faction.name)}</h3>
        <p class="faction-card__desc">${escapeHtml(faction.description || '')}</p>
        <div class="faction-card__members">${escapeHtml((faction.members || []).slice(0, 5).join(' / '))}</div>
      </article>
    `).join('') || '<p class="section-desc">Faction data was not found.</p>';
  }

  function openModal(html) {
    const overlay = document.getElementById('modalOverlay');
    const content = document.getElementById('modalContent');
    if (!overlay || !content) return;
    content.innerHTML = html;
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  function openUnitModal(unitId) {
    const unit = (data().units || []).find(u => String(u.id) === String(unitId));
    if (!unit) return;

    openModal(`
      <div class="modal__unit">
        ${unitPortraitHTML(unit, 'modal__portrait')}
        <div>
          <div class="modal__cost-bar">${Array.from({ length: Number(unit.cost) || 1 }, () => `<span class="modal__cost-gem cost-${unit.cost}"></span>`).join('')}</div>
          <h2 class="modal__name">${escapeHtml(unit.name)}</h2>
          <p class="modal__role">${escapeHtml(unit.role || 'Unit')}</p>
          <p class="modal__lore">${escapeHtml(unit.lore || 'No biography entry has been added for this unit yet.')}</p>
        </div>
      </div>
    `);
  }

  function openTraitModal(id) {
    const trait = (data().traits || []).find(t => String(t.id) === String(id));
    if (!trait) return;
    const tiers = Array.isArray(trait.tiers) ? trait.tiers : [];
    const units = Array.isArray(trait.units) ? trait.units : [];
    openModal(`
      <div class="modal__trait">
        <div class="trait-detail__icon" style="color:${escapeHtml(trait.color || '#45d8ff')}">${escapeHtml(traitMark(trait))}</div>
        <h2 class="modal__trait-name">${escapeHtml(trait.name)}</h2>
        <p class="modal__role">${escapeHtml(trait.type || 'Trait')}</p>
        <p class="modal__trait-desc">${escapeHtml(trait.description || trait.tagline || '')}</p>
        ${tiers.length ? `<p class="modal__section-label">Trait Tiers</p><div class="modal__tiers">${tiers.map(tier => `
          <div class="modal__tier">
            <span class="modal__tier-count">${escapeHtml(tier.count)}</span>
            <span class="modal__tier-effect">${escapeHtml(tier.effect)}</span>
          </div>`).join('')}</div>` : ''}
        ${units.length ? `<p class="modal__section-label">Linked Units</p><div class="modal__unit-list">${units.map(name => `<button class="modal__unit-chip" onclick="openUnitModalByName('${escapeHtml(name)}')">${escapeHtml(name)}</button>`).join('')}</div>` : ''}
      </div>
    `);
  }

  function openTraitModalByName(name) {
    const trait = (data().traits || []).find(t => String(t.name).toLowerCase() === String(name).toLowerCase());
    if (trait) openTraitModal(trait.id);
  }

  function openUnitModalByName(name) {
    const unit = (data().units || []).find(u => String(u.name).toLowerCase() === String(name).toLowerCase());
    if (unit) openUnitModal(unit.id);
  }

  function openStoryModal(id) {
    const story = (data().stories || []).find(s => String(s.id) === String(id));
    if (!story) return;
    openModal(`
      <div class="modal__story">
        <div class="story-card__banner" style="background:${escapeHtml(story.color || '#45d8ff')}18; margin-bottom:2rem; border-radius:16px;">
          <div class="story-card__banner-bg" style="background:${escapeHtml(story.color || '#45d8ff')}"></div>
          <span class="story-card__banner-mark">${escapeHtml(storyMark(story))}</span>
        </div>
        <p class="modal__role">${escapeHtml(story.type || 'Archive')} ${story.category ? '/ ' + escapeHtml(story.category) : ''}</p>
        <h2 class="modal__trait-name">${escapeHtml(story.title)}</h2>
        <p class="modal__trait-desc">${escapeHtml(story.content || story.excerpt || '')}</p>
      </div>
    `);
  }

  function wireIndexFilters() {
    document.querySelectorAll('.trait-filter__btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.trait-filter__btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderTraitGrid(btn.dataset.filter || 'all');
      });
    });
    document.querySelectorAll('.cost-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.cost-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderUnitsPreview(btn.dataset.cost || 'all');
      });
    });
    const prev = document.getElementById('spotlightPrev');
    const next = document.getElementById('spotlightNext');
    if (prev) prev.addEventListener('click', renderRandomSpotlight);
    if (next) next.addEventListener('click', renderRandomSpotlight);
  }

  function wireModal() {
    const close = document.getElementById('modalClose');
    const overlay = document.getElementById('modalOverlay');
    if (close) close.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  }

  function wireGlobalSearch() {
    const input = document.getElementById('globalSearch');
    if (!input) return;
    input.addEventListener('keydown', e => {
      if (e.key !== 'Enter') return;
      const q = input.value.trim();
      if (q) window.location.href = `units.html?search=${encodeURIComponent(q)}`;
    });
  }

  function applyDynamicHomeStats() {
    const stats = document.querySelectorAll('.hero__stat-num[data-target]');
    if (!stats.length) return;
    const units = (data().units || []).length;
    const traits = (data().traits || []).length;
    if (stats[0]) stats[0].dataset.target = String(units || Number(stats[0].dataset.target || 0));
    if (stats[1]) stats[1].dataset.target = String(traits || Number(stats[1].dataset.target || 0));
    if (stats[2]) stats[2].dataset.target = '5';
    const heroDesc = document.querySelector('.hero__desc');
    if (heroDesc) {
      heroDesc.textContent = 'Explore the Dominion through its regions, factions, champions, and timeline records.';
    }
  }

  function countUpStats() {
    document.querySelectorAll('[data-target]').forEach(el => {
      const target = Number(el.dataset.target || 0);
      if (!target) return;
      let current = 0;
      const step = Math.max(1, Math.ceil(target / 48));
      const timer = setInterval(() => {
        current += step;
        if (current >= target) {
          current = target;
          clearInterval(timer);
        }
        el.textContent = String(current);
      }, 24);
    });
  }

  function init() {
    renderStars(document.getElementById('particles'));
    const unitCount = (data().units || []).length;
    renderSpotlight(unitCount ? Math.floor(Math.random() * unitCount) : 0);
    renderRegionsPreview();
    renderFactionsPreview();
    renderTraitGrid('all');
    renderUnitsPreview('all');
    renderStoriesPreview();
    wireIndexFilters();
    wireModal();
    wireGlobalSearch();
    applyDynamicHomeStats();
    countUpStats();

    const nav = document.getElementById('nav');
    if (nav) {
      window.addEventListener('scroll', () => {
        nav.style.background = window.scrollY > 80 ? 'rgba(3, 5, 17, 0.92)' : 'rgba(3, 5, 17, 0.72)';
      }, { passive: true });
    }
  }

  window.CS_THEME = { getInitialMark, unitMark, traitMark, storyMark };
  window.COST_COLORS = COST_COLORS;
  window.openUnitModal = openUnitModal;
  window.openTraitModal = openTraitModal;
  window.openTraitModalByName = openTraitModalByName;
  window.openUnitModalByName = openUnitModalByName;
  window.openStoryModal = openStoryModal;
  window.renderSpotlight = renderSpotlight;
  window.renderRandomSpotlight = renderRandomSpotlight;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}());
