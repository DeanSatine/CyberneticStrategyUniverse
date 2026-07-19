(function () {
  'use strict';

  const PAGE_SIZE = 24;
  const TYPE_GROUPS = {
    'Unit Lore': 'unit',
    World: 'world',
    Region: 'world',
    Faction: 'faction',
    'Timeline Event': 'timeline'
  };

  const data = window.CS_DATA || { stories: [], units: [], regions: [], factions: [], timeline: [] };
  const state = { type: 'all', region: 'all', query: '', visible: PAGE_SIZE };
  const relationCache = new Map();
  const unitByName = new Map(data.units.map(unit => [normalize(unit.name), unit]));
  const regionById = new Map(data.regions.map(region => [region.id, region]));
  const factionById = new Map(data.factions.map(faction => [faction.id, faction]));
  const storyById = new Map(data.stories.map(story => [String(story.id), story]));
  let refs = {};

  function init() {
    refs = {
      stats: document.getElementById('loreStats'),
      featured: document.getElementById('featuredRecord'),
      featuredExcerpt: document.getElementById('featuredExcerpt'),
      featuredPortraits: document.getElementById('featuredPortraits'),
      tabs: document.getElementById('storyTypeTabs'),
      regionFilter: document.getElementById('regionFilter'),
      search: document.getElementById('storySearch'),
      resultCount: document.getElementById('storyResultCount'),
      library: document.getElementById('storyLibrary'),
      empty: document.getElementById('storyEmpty'),
      moreWrap: document.getElementById('storyMoreWrap'),
      more: document.getElementById('storyMore'),
      regionIndex: document.getElementById('regionIndex'),
      factionIndex: document.getElementById('factionIndex'),
      reader: document.getElementById('storyReader'),
      readerClose: document.getElementById('storyReaderClose'),
      readerBarTitle: document.getElementById('storyReaderBarTitle'),
      readerScroll: document.getElementById('storyReaderScroll'),
      readerHero: document.getElementById('storyReaderHero'),
      article: document.getElementById('storyArticle'),
      dossier: document.getElementById('storyDossier'),
      related: document.getElementById('storyRelated')
    };

    populateRegionFilter();
    renderStats();
    renderFeatured();
    renderLibrary();
    renderWorldIndex();
    bindEvents();

    const initialStory = new URL(window.location.href).searchParams.get('story');
    if (initialStory && storyById.has(initialStory)) openStoryReader(initialStory, false);
  }

  function bindEvents() {
    refs.featured.addEventListener('click', () => openStoryReader('the-dominion'));

    refs.tabs.addEventListener('click', event => {
      const button = event.target.closest('[data-type]');
      if (!button) return;
      state.type = button.dataset.type;
      state.visible = PAGE_SIZE;
      refs.tabs.querySelectorAll('[data-type]').forEach(tab => tab.classList.toggle('is-active', tab === button));
      renderLibrary();
    });

    refs.regionFilter.addEventListener('change', () => {
      state.region = refs.regionFilter.value;
      state.visible = PAGE_SIZE;
      renderLibrary();
    });

    refs.search.addEventListener('input', () => {
      state.query = refs.search.value.trim().toLowerCase();
      state.visible = PAGE_SIZE;
      renderLibrary();
    });

    refs.library.addEventListener('click', event => {
      const browseButton = event.target.closest('[data-browse-type]');
      if (browseButton) {
        state.type = browseButton.dataset.browseType;
        state.region = 'all';
        state.query = '';
        state.visible = PAGE_SIZE;
        refs.regionFilter.value = 'all';
        refs.search.value = '';
        updateActiveTab();
        renderLibrary();
        return;
      }
      const button = event.target.closest('[data-story-id]');
      if (button) openStoryReader(button.dataset.storyId);
    });

    refs.more.addEventListener('click', () => {
      state.visible += PAGE_SIZE;
      renderLibrary();
    });

    refs.regionIndex.addEventListener('click', event => {
      const button = event.target.closest('[data-region-id]');
      if (!button) return;
      chooseRegion(button.dataset.regionId);
    });

    refs.factionIndex.addEventListener('click', event => {
      const button = event.target.closest('[data-faction-id]');
      if (!button) return;
      state.type = 'faction';
      state.query = factionById.get(button.dataset.factionId)?.name.toLowerCase() || '';
      state.region = 'all';
      state.visible = PAGE_SIZE;
      refs.search.value = state.query;
      refs.regionFilter.value = 'all';
      updateActiveTab();
      renderLibrary();
      document.querySelector('.lore-directory').scrollIntoView({ behavior: 'smooth' });
    });

    refs.readerClose.addEventListener('click', () => closeStoryReader());
    refs.reader.addEventListener('click', event => {
      const unitButton = event.target.closest('[data-reader-unit]');
      if (unitButton) {
        closeStoryReader();
        window.setTimeout(() => window.openUnitModal?.(unitButton.dataset.readerUnit), 180);
        return;
      }
      const storyButton = event.target.closest('[data-related-story]');
      if (storyButton) openStoryReader(storyButton.dataset.relatedStory);
    });

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && refs.reader.classList.contains('is-open')) closeStoryReader();
    });

    window.addEventListener('popstate', () => {
      const id = new URL(window.location.href).searchParams.get('story');
      if (id && storyById.has(id)) openStoryReader(id, false);
      else closeStoryReader(false);
    });
  }

  function populateRegionFilter() {
    refs.regionFilter.insertAdjacentHTML('beforeend', data.regions.map(region => (
      `<option value="${escapeAttribute(region.id)}">${escapeHtml(region.name)}</option>`
    )).join(''));
  }

  function renderStats() {
    const counts = [
      [data.stories.length, 'Records'],
      [data.units.length, 'Characters'],
      [data.regions.length, 'Regions'],
      [data.factions.length, 'Factions']
    ];
    refs.stats.innerHTML = counts.map(([count, label]) => `
      <span class="lore-stat"><strong>${count}</strong><span>${label}</span></span>
    `).join('');
  }

  function renderFeatured() {
    const story = storyById.get('the-dominion') || data.stories.find(item => item.type === 'World');
    refs.featuredExcerpt.textContent = story?.excerpt || '';
    const names = ['CommandCore', 'Tracercore', 'Coreweaver'];
    refs.featuredPortraits.innerHTML = names.map(name => unitByName.get(normalize(name)))
      .filter(Boolean)
      .map(unit => `<img src="${unitImage(unit, 'card')}" alt="" decoding="async" />`)
      .join('');
  }

  function renderLibrary() {
    const overviewMode = state.type === 'all' && state.region === 'all' && !state.query;
    if (overviewMode) {
      refs.resultCount.textContent = `${data.stories.length} records`;
      refs.empty.hidden = true;
      refs.library.hidden = false;
      refs.moreWrap.hidden = true;
      refs.library.classList.add('story-library--overview');
      refs.library.innerHTML = renderArchiveOverview();
      return;
    }

    const stories = filteredStories();
    const visible = stories.slice(0, state.visible);
    refs.library.classList.remove('story-library--overview');
    refs.resultCount.textContent = `${stories.length} record${stories.length === 1 ? '' : 's'}`;
    refs.empty.hidden = stories.length > 0;
    refs.library.hidden = stories.length === 0;
    refs.moreWrap.hidden = stories.length <= state.visible;
    refs.library.innerHTML = visible.map(renderStoryCard).join('');
  }

  function renderArchiveOverview() {
    const worldStory = storyById.get('the-dominion') || data.stories.find(story => story.type === 'World');
    const unitStories = data.stories.filter(story => story.type === 'Unit Lore').slice(0, 12);
    const timelineStories = data.stories.filter(story => story.type === 'Timeline Event').slice(0, 6);

    const regionLinks = data.regions.map(region => {
      const story = storyById.get(region.id);
      const residents = unitsFromRegion(region);
      const coverUnit = getCoverUnit(story || {}, story ? getRelations(story) : { primary: null, featured: [], mentioned: [], regionResidents: residents });
      const shownResidents = residents.slice(0, 5);
      const remainingResidents = Math.max(0, residents.length - shownResidents.length);
      return `
        <button class="overview-index-card" type="button" data-story-id="${escapeAttribute(story?.id || region.id)}" style="--overview-color:${escapeAttribute(region.color || '#54d7ff')}">
          <span class="overview-index-card__cover">
            ${coverUnit ? `<img src="${unitImage(coverUnit, 'card')}" alt="" loading="lazy" decoding="async" />` : ''}
            <span>${escapeHtml(initials(region.name, 'RG'))}</span>
          </span>
          <span class="overview-index-card__body">
            <span class="overview-index-card__heading"><strong>${escapeHtml(region.name)}</strong><small>${residents.length} ${residents.length === 1 ? 'character' : 'characters'}</small></span>
            <span class="overview-index-card__involved">
              <small>Involved</small>
              <span class="involved-faces">${shownResidents.map(renderFace).join('')}${remainingResidents ? `<span class="involved-face-more">+${remainingResidents}</span>` : ''}</span>
            </span>
          </span>
        </button>
      `;
    }).join('');

    const factionLinks = data.factions.map(faction => {
      const story = storyById.get(faction.id);
      const members = (faction.members || []).map(name => unitByName.get(normalize(name))).filter(Boolean);
      const coverUnit = getCoverUnit(story || {}, story ? getRelations(story) : { primary: null, featured: members, mentioned: [], regionResidents: [] });
      const shownMembers = members.slice(0, 5);
      const remainingMembers = Math.max(0, members.length - shownMembers.length);
      return `
        <button class="overview-index-card" type="button" data-story-id="${escapeAttribute(story?.id || faction.id)}" style="--overview-color:${escapeAttribute(faction.color || '#8d67ff')}">
          <span class="overview-index-card__cover">
            ${coverUnit ? `<img src="${unitImage(coverUnit, 'card')}" alt="" loading="lazy" decoding="async" />` : ''}
            <span>${escapeHtml(initials(faction.name, 'FC'))}</span>
          </span>
          <span class="overview-index-card__body">
            <span class="overview-index-card__heading"><strong>${escapeHtml(faction.name)}</strong><small>${members.length} ${members.length === 1 ? 'member' : 'members'}</small></span>
            <span class="overview-index-card__involved">
              <small>Involved</small>
              <span class="involved-faces">${shownMembers.map(renderFace).join('')}${remainingMembers ? `<span class="involved-face-more">+${remainingMembers}</span>` : ''}</span>
            </span>
          </span>
        </button>
      `;
    }).join('');

    return `
      <div class="archive-overview-layout">
        <section class="overview-side overview-side--regions">
          <div class="overview-group-heading"><span>World index</span><h3>Regions</h3></div>
          <div class="overview-index-list">${regionLinks}</div>
        </section>

        <button class="overview-world-feature" type="button" data-story-id="${escapeAttribute(worldStory?.id || 'the-dominion')}">
          <img src="images/optimized/units/CommandCoreCard.webp" alt="" decoding="async" />
          <span class="overview-world-feature__shade"></span>
          <span class="overview-world-feature__copy">
            <small>World overview</small>
            <strong>${escapeHtml(worldStory?.title || 'The Dominion')}</strong>
            <span>${escapeHtml(worldStory?.excerpt || '')}</span>
            <b>Open world record</b>
          </span>
        </button>

        <section class="overview-side overview-side--factions">
          <div class="overview-group-heading"><span>Power index</span><h3>Factions</h3></div>
          <div class="overview-index-list">${factionLinks}</div>
        </section>
      </div>

      <section class="overview-character-band">
        <div class="overview-band-heading">
          <div><span>Character archive</span><h3>Unit stories</h3></div>
          <button type="button" data-browse-type="unit">View all ${data.units.length}</button>
        </div>
        <div class="overview-unit-grid">
          ${unitStories.map(renderCompactUnitStory).join('')}
        </div>
      </section>

      <section class="overview-timeline-band">
        <div class="overview-band-heading">
          <div><span>Dominion history</span><h3>Timeline</h3></div>
          <button type="button" data-browse-type="timeline">View full timeline</button>
        </div>
        <div class="overview-timeline-list">
          ${timelineStories.map(story => `
            <button class="overview-timeline-item" type="button" data-story-id="${escapeAttribute(story.id)}">
              <span>${escapeHtml(story.category || 'Event')}</span>
              <strong>${escapeHtml(story.title)}</strong>
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderCompactUnitStory(story) {
    const unit = unitByName.get(normalize(story.unit || story.title));
    return `
      <button class="overview-unit-story" type="button" data-story-id="${escapeAttribute(story.id)}">
        <span class="overview-unit-story__portrait">
          ${unit ? `<img src="${unitImage(unit, 'card')}" alt="" loading="lazy" decoding="async" />` : `<span>${escapeHtml(initials(story.title, 'UN'))}</span>`}
        </span>
        <span class="overview-unit-story__copy">
          <strong>${escapeHtml(story.title)}</strong>
          <small>${escapeHtml(unit?.subtitle || story.category || 'Unit lore')}</small>
        </span>
      </button>
    `;
  }

  function filteredStories() {
    const filtered = data.stories.filter(story => {
      const relations = getRelations(story);
      if (state.type !== 'all' && TYPE_GROUPS[story.type] !== state.type) return false;
      if (state.region !== 'all' && !relations.regions.some(region => region.id === state.region)) return false;
      if (!state.query) return true;

      const searchable = [
        story.title,
        story.type,
        story.category,
        story.excerpt,
        story.content,
        ...relations.involved.map(unit => unit.name),
        ...relations.factions.map(faction => faction.name),
        ...relations.regions.map(region => region.name)
      ].join(' ').toLowerCase();
      return searchable.includes(state.query);
    });
    if (state.type !== 'all') return filtered;
    const order = { World: 0, Region: 1, Faction: 2, 'Unit Lore': 3, 'Timeline Event': 4 };
    return filtered.sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9));
  }

  function renderStoryCard(story) {
    const relations = getRelations(story);
    const coverUnit = getCoverUnit(story, relations);
    const involved = relations.involved.slice(0, 4);
    const remaining = Math.max(0, relations.involved.length - involved.length);
    const color = story.color || '#c9a84c';
    const location = relations.regions[0]?.name || story.category || '';
    return `
      <article class="archive-story-card" style="--story-color:${escapeAttribute(color)}">
        <button class="archive-story-card__button" type="button" data-story-id="${escapeAttribute(story.id)}">
          <span class="archive-story-card__visual">
            ${coverUnit ? `<img src="${unitImage(coverUnit, 'card')}" alt="" loading="lazy" decoding="async" />` : ''}
            <span class="archive-story-card__mark">${escapeHtml(initials(story.title, 'CS'))}</span>
          </span>
          <span class="archive-story-card__body">
            <span class="archive-story-card__meta">
              <span>${escapeHtml(story.type || 'Archive')}</span>
              ${location ? `<span>${escapeHtml(location)}</span>` : ''}
            </span>
            <strong class="archive-story-card__title">${escapeHtml(story.title)}</strong>
            <span class="archive-story-card__excerpt">${escapeHtml(story.excerpt || story.content || '')}</span>
            <span class="archive-story-card__involved">
              <span class="archive-story-card__involved-label">${relations.involved.length ? 'Involved' : 'Archive record'}</span>
              ${involved.length ? `<span class="involved-faces">${involved.map(renderFace).join('')}${remaining ? `<span class="involved-face-more">+${remaining}</span>` : ''}</span>` : ''}
            </span>
          </span>
        </button>
      </article>
    `;
  }

  function renderWorldIndex() {
    refs.regionIndex.innerHTML = data.regions.map(region => {
      const residents = unitsFromRegion(region);
      return `
        <button class="region-index__item" type="button" data-region-id="${escapeAttribute(region.id)}" style="--region-color:${escapeAttribute(region.color || '#54d7ff')}">
          <span class="region-index__mark">${escapeHtml(initials(region.name, 'RG'))}</span>
          <span>
            <strong class="region-index__name">${escapeHtml(region.name)}</strong>
            <span class="region-index__meta">${residents.length} linked character${residents.length === 1 ? '' : 's'} / ${(region.locations || []).length} locations</span>
          </span>
          <span class="index-faces">${residents.slice(0, 4).map(renderFace).join('')}</span>
        </button>
      `;
    }).join('');

    refs.factionIndex.innerHTML = data.factions.map(faction => {
      const members = (faction.members || []).map(name => unitByName.get(normalize(name))).filter(Boolean);
      return `
        <button class="faction-index__item" type="button" data-faction-id="${escapeAttribute(faction.id)}">
          <span>
            <strong class="faction-index__name">${escapeHtml(faction.name)}</strong>
            <span class="faction-index__meta">${escapeHtml(faction.type || 'Faction')} / ${members.length} members</span>
          </span>
          <span class="index-faces">${members.slice(0, 4).map(renderFace).join('')}</span>
        </button>
      `;
    }).join('');
  }

  function chooseRegion(regionId) {
    state.region = regionId;
    state.type = 'all';
    state.query = '';
    state.visible = PAGE_SIZE;
    refs.regionFilter.value = regionId;
    refs.search.value = '';
    updateActiveTab();
    renderLibrary();
    document.querySelector('.lore-directory').scrollIntoView({ behavior: 'smooth' });
  }

  function updateActiveTab() {
    refs.tabs.querySelectorAll('[data-type]').forEach(tab => tab.classList.toggle('is-active', tab.dataset.type === state.type));
  }

  function openStoryReader(id, updateHistory = true) {
    const story = storyById.get(String(id));
    if (!story) return;
    const relations = getRelations(story);
    const coverUnit = getCoverUnit(story, relations);
    const color = story.color || '#c9a84c';
    const paragraphs = makeParagraphs(story.content || story.excerpt || '');

    refs.reader.style.setProperty('--reader-color', color);
    refs.readerBarTitle.textContent = story.title;
    refs.readerHero.innerHTML = `
      ${coverUnit ? `<img class="story-reader__hero-image" src="${unitImage(coverUnit, 'card')}" alt="" decoding="async" />` : ''}
      <div class="story-reader__hero-content">
        <p class="story-reader__meta">${escapeHtml(story.type || 'Archive')}${story.category ? ` / ${escapeHtml(story.category)}` : ''}</p>
        <h1 class="story-reader__title">${escapeHtml(story.title)}</h1>
        <p class="story-reader__deck">${escapeHtml(story.excerpt || '')}</p>
      </div>
    `;
    refs.article.innerHTML = `
      <p class="story-article__label">${escapeHtml(articleLabel(story))}</p>
      ${paragraphs.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join('')}
      <div class="story-article__credit">Written by Chloe Lee Wong</div>
    `;
    refs.dossier.innerHTML = renderDossier(story, relations);
    refs.related.innerHTML = renderRelatedStories(story, relations);
    refs.reader.classList.add('is-open');
    refs.reader.setAttribute('aria-hidden', 'false');
    refs.readerScroll.scrollTop = 0;
    document.body.style.overflow = 'hidden';

    if (updateHistory) updateStoryUrl(story.id, 'push');
  }

  function closeStoryReader(updateHistory = true) {
    refs.reader.classList.remove('is-open');
    refs.reader.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (updateHistory) updateStoryUrl('', 'replace');
  }

  function updateStoryUrl(storyId, mode) {
    try {
      const url = new URL(window.location.href);
      if (storyId) url.searchParams.set('story', storyId);
      else url.searchParams.delete('story');
      window.history[`${mode}State`]({ story: storyId || null }, '', url);
    } catch (error) {
      // Local file previews can restrict history changes; reading still works.
    }
  }

  function renderDossier(story, relations) {
    const sections = [];
    if (relations.featured.length) {
      sections.push(dossierUnits('Featured characters', relations.featured.slice(0, 8)));
    }
    if (story.type === 'Region') {
      sections.push(dossierUnits('Characters from here', relations.regionResidents.slice(0, 10)));
    }
    if (relations.mentioned.length) {
      sections.push(dossierUnits('Mentioned', relations.mentioned.slice(0, 10)));
    }
    if (relations.regions.length) {
      sections.push(dossierTags('Locations', relations.regions.map(region => region.name)));
    }
    if (relations.places.length) {
      sections.push(dossierTags('Places', relations.places));
    }
    if (relations.factions.length) {
      sections.push(dossierTags('Factions', relations.factions.map(faction => faction.name)));
    }
    if (relations.traits.length) {
      sections.push(dossierTags('Traits', relations.traits));
    }
    return `<p class="story-dossier__label">In this story</p>${sections.filter(Boolean).join('')}`;
  }

  function dossierUnits(title, units) {
    if (!units.length) return '';
    return `
      <section class="dossier-section dossier-section--units">
        <h2 class="dossier-section__title">${escapeHtml(title)}</h2>
        ${units.map(unit => `
          <button class="dossier-unit" type="button" data-reader-unit="${escapeAttribute(unit.id)}">
            ${unit.iconImageName ? `<img src="${unitImage(unit, 'icon')}" alt="" loading="lazy" decoding="async" />` : `<span class="dossier-unit__mark">${escapeHtml(initials(unit.name, 'UN'))}</span>`}
            <span><strong>${escapeHtml(unit.name)}</strong><span>${escapeHtml(unitDossierLabel(unit))}</span></span>
          </button>
        `).join('')}
      </section>
    `;
  }

  function unitDossierLabel(unit) {
    const subtitle = String(unit.subtitle || '').trim();
    if (subtitle && normalize(subtitle) !== 'subtitle') return subtitle;
    return unit.origin || unit.currentResidence || unit.role || '';
  }

  function dossierTags(title, tags) {
    const unique = uniqueBy(tags.filter(Boolean), value => normalize(value));
    if (!unique.length) return '';
    return `
      <section class="dossier-section">
        <h2 class="dossier-section__title">${escapeHtml(title)}</h2>
        <div class="dossier-tags">${unique.map(tag => `<span class="dossier-tag">${escapeHtml(tag)}</span>`).join('')}</div>
      </section>
    `;
  }

  function renderRelatedStories(story, relations) {
    const involvedNames = new Set(relations.involved.map(unit => normalize(unit.name)));
    const related = data.stories
      .filter(candidate => candidate.id !== story.id)
      .map(candidate => {
        const candidateRelations = getRelations(candidate);
        let score = candidate.type === story.type ? 1 : 0;
        score += candidateRelations.involved.filter(unit => involvedNames.has(normalize(unit.name))).length * 4;
        score += candidateRelations.regions.filter(region => relations.regions.some(item => item.id === region.id)).length * 2;
        score += candidateRelations.factions.filter(faction => relations.factions.some(item => item.id === faction.id)).length * 3;
        return { candidate, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.candidate);

    if (!related.length) return '';
    return `
      <h2 class="story-related__title">Related records</h2>
      <div class="story-related__grid">
        ${related.map(item => `
          <button class="story-related__item" type="button" data-related-story="${escapeAttribute(item.id)}">
            <span>${escapeHtml(item.type || 'Archive')}</span>
            <strong>${escapeHtml(item.title)}</strong>
          </button>
        `).join('')}
      </div>
    `;
  }

  function getRelations(story) {
    if (relationCache.has(story.id)) return relationCache.get(story.id);
    const text = `${story.title || ''} ${story.category || ''} ${story.content || ''}`;
    const featured = [];
    const mentioned = data.units.filter(unit => mentions(text, unit.name));
    const primary = unitByName.get(normalize(story.unit));
    if (primary) featured.push(primary);

    const directFaction = factionById.get(story.id);
    if (directFaction) {
      directFaction.members.forEach(name => {
        const unit = unitByName.get(normalize(name));
        if (unit) featured.push(unit);
      });
    }

    const directRegion = regionById.get(story.id);
    const regionResidents = directRegion ? unitsFromRegion(directRegion) : [];
    const involved = uniqueBy([...featured, ...mentioned, ...(directRegion ? regionResidents.slice(0, 8) : [])], unit => unit.id);
    const cleanMentioned = uniqueBy(mentioned.filter(unit => !featured.some(item => item.id === unit.id)), unit => unit.id);
    const regions = data.regions.filter(region => storyConnectsRegion(story, involved, region));
    if (directRegion && !regions.some(region => region.id === directRegion.id)) regions.unshift(directRegion);

    const places = [];
    data.regions.forEach(region => {
      (region.locations || []).forEach(location => {
        if (mentions(text, location)) places.push(location);
      });
    });

    const factions = data.factions.filter(faction => {
      if (faction.id === story.id || mentions(text, faction.name)) return true;
      return involved.some(unit => (faction.members || []).some(name => normalize(name) === normalize(unit.name)));
    });

    const traits = uniqueBy(featured.flatMap(unit => unit.traits || []), normalize);
    const relations = {
      primary,
      featured: uniqueBy(featured, unit => unit.id),
      mentioned: cleanMentioned,
      involved,
      regions: uniqueBy(regions, region => region.id),
      places,
      factions,
      traits,
      regionResidents
    };
    relationCache.set(story.id, relations);
    return relations;
  }

  function storyConnectsRegion(story, involved, region) {
    const text = `${story.title || ''} ${story.category || ''} ${story.content || ''}`;
    if (story.id === region.id || mentions(text, region.name)) return true;
    if ((region.locations || []).some(location => mentions(text, location))) return true;
    return involved.some(unit => unitBelongsRegion(unit, region));
  }

  function unitsFromRegion(region) {
    return data.units.filter(unit => unitBelongsRegion(unit, region));
  }

  function unitBelongsRegion(unit, region) {
    const canonicalLocation = unit.origin || unit.currentResidence;
    if (!canonicalLocation) return false;
    const field = normalize(canonicalLocation);
    const names = [region.name, ...(region.locations || [])].map(normalize);
    return names.some(name => name && (field.includes(name) || name.includes(field)));
  }

  function getCoverUnit(story, relations) {
    if (relations.primary) return relations.primary;
    if (relations.featured.length) return relations.featured[0];
    if (relations.mentioned.length) return relations.mentioned[0];
    if (relations.regionResidents.length) return relations.regionResidents[0];
    return null;
  }

  function makeParagraphs(content) {
    const text = String(content || '').trim();
    if (!text) return [];
    const sentences = text.match(/[^.!?]+(?:[.!?]+["']?|$)/g)?.map(sentence => sentence.trim()).filter(Boolean) || [text];
    const paragraphs = [];
    let current = '';
    sentences.forEach(sentence => {
      if (current && current.length + sentence.length > 390) {
        paragraphs.push(current);
        current = sentence;
      } else {
        current = `${current} ${sentence}`.trim();
      }
    });
    if (current) paragraphs.push(current);
    return paragraphs;
  }

  function articleLabel(story) {
    if (story.type === 'Unit Lore') return 'Background';
    if (story.type === 'Faction') return 'History';
    if (story.type === 'Region' || story.type === 'World') return 'World record';
    if (story.type === 'Timeline Event') return 'Event record';
    return 'Archive record';
  }

  function mentions(text, name) {
    const source = normalizeSearchText(text);
    const target = normalizeSearchText(name);
    if (!target) return false;
    if (source.includes(target)) return true;
    if (target.includes('andgoons')) return source.includes(target.replace('andgoons', ''));
    return false;
  }

  function renderFace(unit) {
    return `<span class="involved-face" title="${escapeAttribute(unit.name)}">${unit.iconImageName ? `<img src="${unitImage(unit, 'icon')}" alt="" loading="lazy" decoding="async" />` : escapeHtml(initials(unit.name, 'UN'))}</span>`;
  }

  function unitImage(unit, type) {
    const folder = type === 'icon' ? 'icons' : 'units';
    const filename = type === 'icon' ? unit.iconImageName : unit.cardImageName;
    return `images/optimized/${folder}/${encodeURIComponent(filename || unit.imageName || unit.name)}.webp`;
  }

  function initials(value, fallback) {
    const parts = String(value || '').replace(/[^a-z0-9 ]/gi, ' ').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return fallback;
    return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
  }

  function normalize(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/gi, '')
      .toLowerCase();
  }

  function normalizeSearchText(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '')
      .toLowerCase();
  }

  function uniqueBy(items, keyFn) {
    const seen = new Set();
    return items.filter(item => {
      const key = keyFn(item);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, '&#096;');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
}());
