(function () {
  'use strict';

  const STORAGE_KEY = 'cybernetic-strategy-editor-draft-v1';
  const ROLE_OPTIONS = [
    'Attack Caster',
    'Attack Fighter',
    'Attack Marksman',
    'Attack Tank',
    'Hybrid Assassin',
    'Hybrid Caster',
    'Magic Caster',
    'Magic Fighter',
    'Magic Marksman',
    'Magic Tank'
  ];

  const SECTION_CONFIG = {
    units: {
      label: 'Units',
      singular: 'Unit',
      titleKey: 'name',
      meta: item => [item.role, item.cost ? `Cost ${item.cost}` : ''].filter(Boolean).join(' / '),
      fields: [
        { key: 'name', label: 'Unit name', type: 'text', required: true },
        { key: 'id', label: 'ID', type: 'slug', required: true },
        { key: 'subtitle', label: 'Subtitle', type: 'text' },
        { key: 'role', label: 'Role', type: 'select', options: ROLE_OPTIONS, required: true },
        { key: 'cost', label: 'Cost', type: 'number', min: 1, max: 5 },
        { key: 'traits', label: 'Traits', type: 'traitChecks', wide: true },
        { key: 'fullName', label: 'Full name', type: 'text' },
        { key: 'origin', label: 'Origin', type: 'text' },
        { key: 'species', label: 'Species', type: 'text' },
        { key: 'yearsActive', label: 'Years active', type: 'text' },
        { key: 'currentResidence', label: 'Current residence', type: 'text' },
        { key: 'imageName', label: 'Image base name', type: 'text', hint: 'Used by older image references.' },
        { key: 'cardImageName', label: 'Card image filename', type: 'text', hint: 'Do not include .png.' },
        { key: 'iconImageName', label: 'Icon image filename', type: 'text', hint: 'Do not include .png.' },
        { key: 'lore', label: 'Unit lore', type: 'textarea', wide: true, required: true },
        { key: 'abilitySummary', label: 'Ability summary', type: 'textarea', wide: true },
        { key: 'stats', label: 'Stats', type: 'json', wide: true, hint: 'Advanced: keep the labels and values inside the braces.' },
        { key: 'ability', label: 'Ability details', type: 'json', wide: true, optional: true },
        { key: 'details', label: 'Additional details', type: 'json', wide: true, optional: true }
      ]
    },
    stories: {
      label: 'Stories',
      singular: 'Story',
      titleKey: 'title',
      meta: item => [item.type, item.category].filter(Boolean).join(' / '),
      fields: [
        { key: 'title', label: 'Story title', type: 'text', required: true },
        { key: 'id', label: 'ID', type: 'slug', required: true },
        { key: 'type', label: 'Story type', type: 'select', options: ['Unit Lore', 'Region', 'Faction', 'Timeline Event', 'Short Story', 'Origin Story', 'Mythology', 'World'] },
        { key: 'category', label: 'Category', type: 'text' },
        { key: 'unit', label: 'Related unit', type: 'selectWithBlank', source: 'units' },
        { key: 'color', label: 'Accent color', type: 'color' },
        { key: 'excerpt', label: 'Short excerpt', type: 'textarea', wide: true },
        { key: 'content', label: 'Full story', type: 'textareaLong', wide: true, required: true }
      ]
    },
    traits: {
      label: 'Traits',
      singular: 'Trait',
      titleKey: 'name',
      meta: item => item.type || '',
      fields: [
        { key: 'name', label: 'Trait name', type: 'text', required: true },
        { key: 'id', label: 'ID', type: 'slug', required: true },
        { key: 'type', label: 'Trait type', type: 'select', options: ['origin', 'class'], required: true },
        { key: 'color', label: 'Accent color', type: 'color' },
        { key: 'tagline', label: 'Tagline', type: 'text', wide: true },
        { key: 'description', label: 'Description', type: 'textarea', wide: true },
        { key: 'units', label: 'Units with this trait', type: 'unitChecks', wide: true },
        { key: 'tiers', label: 'Trait tiers', type: 'json', wide: true, hint: 'Advanced: tier thresholds and effects.' }
      ]
    },
    regions: {
      label: 'Regions',
      singular: 'Region',
      titleKey: 'name',
      meta: item => item.tagline || '',
      fields: [
        { key: 'name', label: 'Region name', type: 'text', required: true },
        { key: 'id', label: 'ID', type: 'slug', required: true },
        { key: 'tagline', label: 'Tagline', type: 'text' },
        { key: 'atmosphere', label: 'Atmosphere', type: 'text' },
        { key: 'color', label: 'Accent color', type: 'color' },
        { key: 'locations', label: 'Locations', type: 'list', wide: true, hint: 'Enter one location per line.' },
        { key: 'description', label: 'Description', type: 'textareaLong', wide: true, required: true }
      ]
    },
    factions: {
      label: 'Factions',
      singular: 'Faction',
      titleKey: 'name',
      meta: item => item.type || '',
      fields: [
        { key: 'name', label: 'Faction name', type: 'text', required: true },
        { key: 'id', label: 'ID', type: 'slug', required: true },
        { key: 'type', label: 'Faction type', type: 'text' },
        { key: 'color', label: 'Accent color', type: 'color' },
        { key: 'members', label: 'Members', type: 'list', wide: true, hint: 'Enter one member per line.' },
        { key: 'description', label: 'Description', type: 'textareaLong', wide: true, required: true }
      ]
    },
    timeline: {
      label: 'Timeline',
      singular: 'Timeline entry',
      titleKey: 'title',
      meta: item => item.year || '',
      fields: [
        { key: 'year', label: 'Year or era', type: 'text', required: true },
        { key: 'title', label: 'Event title', type: 'text', required: true },
        { key: 'description', label: 'Event description', type: 'textareaLong', wide: true, required: true }
      ]
    }
  };

  const refs = {
    tabs: document.getElementById('sectionTabs'),
    search: document.getElementById('recordSearch'),
    list: document.getElementById('recordList'),
    editor: document.getElementById('recordEditor'),
    status: document.getElementById('editorStatus'),
    counts: document.getElementById('recordCounts'),
    add: document.getElementById('addRecord'),
    save: document.getElementById('saveDraft'),
    validate: document.getElementById('validateData'),
    export: document.getElementById('exportData'),
    import: document.getElementById('importFile'),
    validationDialog: document.getElementById('validationDialog'),
    validationTitle: document.getElementById('validationTitle'),
    validationResults: document.getElementById('validationResults'),
    closeValidation: document.getElementById('closeValidation'),
    confirmDialog: document.getElementById('confirmDialog'),
    confirmMessage: document.getElementById('confirmMessage'),
    confirmDelete: document.getElementById('confirmDelete'),
    cancelDelete: document.getElementById('cancelDelete'),
    cancelDeleteIcon: document.getElementById('cancelDeleteIcon')
  };

  const websiteData = clone(window.CS_DATA || {});
  let data = loadDraft() || clone(websiteData);
  let activeSection = 'units';
  let activeIndex = 0;
  let searchTerm = '';
  let dirty = Boolean(localStorage.getItem(STORAGE_KEY));
  let saveTimer = null;

  ensureSections();
  renderAll();
  setStatus(dirty ? 'Local draft restored' : 'Website data loaded', dirty ? 'saved' : '');

  refs.tabs.addEventListener('click', event => {
    const button = event.target.closest('[data-section]');
    if (!button) return;
    activeSection = button.dataset.section;
    activeIndex = 0;
    searchTerm = '';
    refs.search.value = '';
    renderAll();
  });

  refs.search.addEventListener('input', () => {
    searchTerm = refs.search.value.trim().toLowerCase();
    renderList();
  });

  refs.list.addEventListener('click', event => {
    const button = event.target.closest('[data-index]');
    if (!button) return;
    activeIndex = Number(button.dataset.index);
    renderList();
    renderEditor();
  });

  refs.editor.addEventListener('input', handleEditorInput);
  refs.editor.addEventListener('change', handleEditorInput);
  refs.editor.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'duplicate') duplicateRecord();
    if (action === 'delete') requestDelete();
  });

  refs.add.addEventListener('click', addRecord);
  refs.save.addEventListener('click', saveDraft);
  refs.validate.addEventListener('click', showValidation);
  refs.export.addEventListener('click', exportData);
  refs.import.addEventListener('change', importData);
  refs.closeValidation.addEventListener('click', () => refs.validationDialog.close());
  refs.cancelDelete.addEventListener('click', () => refs.confirmDialog.close());
  refs.cancelDeleteIcon.addEventListener('click', () => refs.confirmDialog.close());
  refs.confirmDelete.addEventListener('click', deleteRecord);

  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      saveDraft();
    }
  });

  function ensureSections() {
    Object.keys(SECTION_CONFIG).forEach(section => {
      if (!Array.isArray(data[section])) data[section] = [];
    });
  }

  function renderAll() {
    renderTabs();
    renderList();
    renderEditor();
    renderCounts();
  }

  function renderTabs() {
    refs.tabs.innerHTML = Object.entries(SECTION_CONFIG).map(([key, config]) => `
      <button class="editor-tab${key === activeSection ? ' is-active' : ''}" type="button" data-section="${key}">
        ${escapeHtml(config.label)} (${data[key].length})
      </button>
    `).join('');
  }

  function getFilteredRecords() {
    const config = SECTION_CONFIG[activeSection];
    return data[activeSection]
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => {
        if (!searchTerm) return true;
        return [item[config.titleKey], config.meta(item), item.id, item.description]
          .filter(Boolean)
          .some(value => String(value).toLowerCase().includes(searchTerm));
      })
      .sort((a, b) => String(a.item[config.titleKey] || '').localeCompare(String(b.item[config.titleKey] || '')));
  }

  function renderList() {
    const config = SECTION_CONFIG[activeSection];
    const records = getFilteredRecords();
    if (!records.length) {
      refs.list.innerHTML = '<p class="record-list__empty">No matching records.</p>';
      return;
    }

    refs.list.innerHTML = records.map(({ item, index }) => `
      <button class="record-list__item${index === activeIndex ? ' is-active' : ''}" type="button" data-index="${index}" role="option" aria-selected="${index === activeIndex}">
        <strong>${escapeHtml(item[config.titleKey] || `Untitled ${config.singular}`)}</strong>
        <small>${escapeHtml(config.meta(item) || item.id || `Record ${index + 1}`)}</small>
      </button>
    `).join('');
  }

  function renderEditor() {
    const records = data[activeSection];
    const config = SECTION_CONFIG[activeSection];
    if (!records.length) {
      refs.editor.innerHTML = `<div class="record-editor__empty">Add the first ${escapeHtml(config.singular.toLowerCase())} to begin.</div>`;
      return;
    }

    if (!records[activeIndex]) activeIndex = 0;
    const item = records[activeIndex];
    const title = item[config.titleKey] || `Untitled ${config.singular}`;

    refs.editor.innerHTML = `
      <div class="record-editor__header">
        <div>
          <p class="editor-kicker">Editing ${escapeHtml(config.singular)}</p>
          <h1>${escapeHtml(title)}</h1>
        </div>
        <div class="record-editor__actions">
          <button class="editor-button editor-button--quiet" type="button" data-action="duplicate">Duplicate</button>
          <button class="editor-button editor-button--danger" type="button" data-action="delete">Delete</button>
        </div>
      </div>
      <form class="editor-form" id="contentForm" onsubmit="return false;">
        ${activeSection === 'units' ? renderUnitPreview(item) : ''}
        ${config.fields.map(field => renderField(field, item)).join('')}
      </form>
    `;
  }

  function renderField(field, item) {
    const value = item[field.key];
    if (field.type === 'traitChecks') return renderChecks(field, data.traits, 'name', value || []);
    if (field.type === 'unitChecks') return renderChecks(field, data.units, 'name', value || []);

    const classes = `editor-field${field.wide ? ' editor-field--wide' : ''}`;
    const required = field.required ? ' required' : '';
    const hint = field.hint ? `<small class="editor-field__hint">${escapeHtml(field.hint)}</small>` : '';
    let control = '';

    if (field.type === 'textarea' || field.type === 'textareaLong') {
      const rows = field.type === 'textareaLong' ? 12 : 5;
      control = `<textarea data-field="${field.key}" rows="${rows}"${required}>${escapeHtml(value || '')}</textarea>`;
    } else if (field.type === 'list') {
      control = `<textarea data-field="${field.key}" data-value-type="list" rows="6">${escapeHtml((value || []).join('\n'))}</textarea>`;
    } else if (field.type === 'json') {
      control = `<textarea data-field="${field.key}" data-value-type="json" rows="8" spellcheck="false">${escapeHtml(formatJson(value, field.optional))}</textarea>`;
    } else if (field.type === 'select' || field.type === 'selectWithBlank') {
      const options = field.source
        ? data[field.source].map(entry => entry.name).filter(Boolean).sort((a, b) => a.localeCompare(b))
        : field.options;
      control = `<select data-field="${field.key}"${required}>
        ${field.type === 'selectWithBlank' ? '<option value="">None</option>' : ''}
        ${options.map(option => `<option value="${escapeAttribute(option)}"${String(value || '') === String(option) ? ' selected' : ''}>${escapeHtml(option)}</option>`).join('')}
      </select>`;
    } else {
      const type = ['number', 'color'].includes(field.type) ? field.type : 'text';
      const fallback = type === 'color' ? '#62d8ff' : '';
      const min = field.min != null ? ` min="${field.min}"` : '';
      const max = field.max != null ? ` max="${field.max}"` : '';
      control = `<input data-field="${field.key}" data-value-type="${type}" type="${type}" value="${escapeAttribute(value ?? fallback)}"${min}${max}${required} />`;
    }

    return `<label class="${classes}"><span>${escapeHtml(field.label)}</span>${control}${hint}</label>`;
  }

  function renderChecks(field, choices, valueKey, selectedValues) {
    const selected = new Set(selectedValues.map(value => String(value).toLowerCase()));
    const sortedChoices = choices.slice().sort((a, b) => String(a[valueKey]).localeCompare(String(b[valueKey])));
    return `
      <fieldset class="editor-fieldset">
        <legend>${escapeHtml(field.label)}</legend>
        <div class="editor-check-grid">
          ${sortedChoices.map(choice => {
            const choiceValue = choice[valueKey];
            return `<label class="editor-check">
              <input type="checkbox" data-check-field="${field.key}" value="${escapeAttribute(choiceValue)}"${selected.has(String(choiceValue).toLowerCase()) ? ' checked' : ''} />
              <span>${escapeHtml(choiceValue)}</span>
            </label>`;
          }).join('')}
        </div>
      </fieldset>
    `;
  }

  function renderUnitPreview(item) {
    const filename = item.cardImageName || item.imageName || '';
    const source = filename ? `images/units/${encodeURIComponent(filename)}.png` : '';
    return `
      <div class="editor-unit-preview${source ? '' : ' is-missing'}" id="unitPreview">
        ${source ? `<img src="${source}" alt="" onerror="this.closest('.editor-unit-preview').classList.add('is-missing')" />` : '<div></div>'}
        <div>
          <strong>${escapeHtml(item.name || 'Untitled unit')}</strong>
          <span>${source ? escapeHtml(source) : 'Add a card image filename to preview the artwork.'}</span>
        </div>
      </div>
    `;
  }

  function handleEditorInput(event) {
    const item = data[activeSection][activeIndex];
    if (!item) return;

    const checkbox = event.target.closest('[data-check-field]');
    if (checkbox) {
      const field = checkbox.dataset.checkField;
      const checked = Array.from(refs.editor.querySelectorAll(`[data-check-field="${field}"]:checked`)).map(input => input.value);
      item[field] = checked;
      if (activeSection === 'units' && field === 'traits') syncTraitLinksFromUnits();
      if (activeSection === 'traits' && field === 'units') syncUnitsFromTrait(item);
      changed();
      return;
    }

    const control = event.target.closest('[data-field]');
    if (!control || event.type === 'change' && control.tagName === 'TEXTAREA') return;
    const field = control.dataset.field;
    const oldValue = item[field];
    let value = control.value;

    if (control.dataset.valueType === 'number') value = Number(value) || 0;
    if (control.dataset.valueType === 'list') value = uniqueLines(value);
    if (control.dataset.valueType === 'json') {
      try {
        value = value.trim() ? JSON.parse(value) : undefined;
        control.classList.remove('is-invalid');
        control.parentElement.querySelector('.editor-field__error')?.remove();
      } catch (error) {
        control.classList.add('is-invalid');
        showFieldError(control, 'This field is not valid yet. Check its commas, quotes, and braces.');
        return;
      }
    }

    if (value === undefined) delete item[field];
    else item[field] = value;

    if ((field === 'name' || field === 'title') && !item.id) item.id = uniqueId(slug(value), activeSection);
    if (activeSection === 'units' && field === 'name') renameUnit(oldValue, value);
    if (activeSection === 'traits' && field === 'name') renameTrait(oldValue, value);

    changed(field === 'name' || field === 'title' || field === 'role' || field === 'cost' || field === 'cardImageName');
  }

  function showFieldError(control, message) {
    let error = control.parentElement.querySelector('.editor-field__error');
    if (!error) {
      error = document.createElement('small');
      error.className = 'editor-field__hint editor-field__error';
      control.insertAdjacentElement('afterend', error);
    }
    error.textContent = message;
  }

  function changed(shouldRender) {
    dirty = true;
    setStatus('Unsaved changes', 'dirty');
    renderCounts();
    if (shouldRender) {
      renderList();
      const config = SECTION_CONFIG[activeSection];
      const item = data[activeSection][activeIndex];
      const heading = refs.editor.querySelector('.record-editor__header h1');
      if (heading && item) heading.textContent = item[config.titleKey] || `Untitled ${config.singular}`;
    }
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveDraft(true), 700);
  }

  function addRecord() {
    const config = SECTION_CONFIG[activeSection];
    const item = createDefaultRecord(activeSection);
    data[activeSection].push(item);
    activeIndex = data[activeSection].length - 1;
    searchTerm = '';
    refs.search.value = '';
    changed();
    renderAll();
    requestAnimationFrame(() => refs.editor.querySelector('[data-field="name"], [data-field="title"]')?.focus());
    setStatus(`New ${config.singular.toLowerCase()} added`, 'dirty');
  }

  function duplicateRecord() {
    const config = SECTION_CONFIG[activeSection];
    const source = data[activeSection][activeIndex];
    const copy = clone(source);
    const titleKey = config.titleKey;
    copy[titleKey] = `${copy[titleKey] || config.singular} Copy`;
    if ('id' in copy) copy.id = uniqueId(slug(copy[titleKey]), activeSection);
    data[activeSection].splice(activeIndex + 1, 0, copy);
    activeIndex += 1;
    if (activeSection === 'units') syncTraitLinksFromUnits();
    changed();
    renderAll();
  }

  function requestDelete() {
    const config = SECTION_CONFIG[activeSection];
    const item = data[activeSection][activeIndex];
    refs.confirmMessage.textContent = `${item[config.titleKey] || `This ${config.singular.toLowerCase()}`} will be removed from the editor draft.`;
    refs.confirmDialog.showModal();
  }

  function deleteRecord() {
    const removed = data[activeSection].splice(activeIndex, 1)[0];
    if (activeSection === 'units' && removed?.name) {
      data.traits.forEach(trait => {
        trait.units = (trait.units || []).filter(name => !sameText(name, removed.name));
      });
    }
    if (activeSection === 'traits' && removed?.name) {
      data.units.forEach(unit => {
        unit.traits = (unit.traits || []).filter(name => !sameText(name, removed.name));
      });
    }
    activeIndex = Math.max(0, Math.min(activeIndex, data[activeSection].length - 1));
    refs.confirmDialog.close();
    changed();
    renderAll();
  }

  function createDefaultRecord(section) {
    const number = data[section].length + 1;
    const defaults = {
      units: {
        id: uniqueId(`new-unit-${number}`, section), name: `New Unit ${number}`, imageName: '', role: 'Attack Fighter', cost: 1,
        traits: [], origin: '', species: '', yearsActive: '', currentResidence: '', fullName: '', lore: '', stats: {},
        abilitySummary: '', subtitle: 'Subtitle', cardImageName: '', iconImageName: ''
      },
      stories: {
        id: uniqueId(`new-story-${number}`, section), title: `New Story ${number}`, type: 'Short Story', category: 'Archive',
        color: '#62d8ff', excerpt: '', content: ''
      },
      traits: {
        id: uniqueId(`new-trait-${number}`, section), name: `New Trait ${number}`, type: 'origin', color: '#62d8ff',
        tagline: '', description: '', tiers: [], units: []
      },
      regions: {
        id: uniqueId(`new-region-${number}`, section), name: `New Region ${number}`, atmosphere: '', tagline: '',
        description: '', locations: [], color: '#62d8ff'
      },
      factions: {
        id: uniqueId(`new-faction-${number}`, section), name: `New Faction ${number}`, type: '', members: [],
        description: '', color: '#62d8ff'
      },
      timeline: { year: 'Unknown era', title: `New Event ${number}`, description: '' }
    };
    return defaults[section];
  }

  function renameUnit(oldName, newName) {
    if (!oldName || oldName === newName) return;
    data.traits.forEach(trait => {
      trait.units = (trait.units || []).map(name => sameText(name, oldName) ? newName : name);
    });
    data.stories.forEach(story => {
      if (sameText(story.unit, oldName)) story.unit = newName;
    });
  }

  function renameTrait(oldName, newName) {
    if (!oldName || oldName === newName) return;
    data.units.forEach(unit => {
      unit.traits = (unit.traits || []).map(name => sameText(name, oldName) ? newName : name);
    });
  }

  function syncTraitLinksFromUnits() {
    data.traits.forEach(trait => {
      trait.units = data.units
        .filter(unit => (unit.traits || []).some(name => sameText(name, trait.name)))
        .map(unit => unit.name)
        .filter(Boolean);
    });
  }

  function syncUnitsFromTrait(trait) {
    const linked = new Set((trait.units || []).map(name => String(name).toLowerCase()));
    data.units.forEach(unit => {
      const traits = (unit.traits || []).filter(name => !sameText(name, trait.name));
      if (linked.has(String(unit.name).toLowerCase())) traits.push(trait.name);
      unit.traits = uniqueValues(traits);
    });
    syncTraitLinksFromUnits();
  }

  function saveDraft(silent) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      dirty = false;
      setStatus(silent ? 'Draft autosaved' : 'Draft saved in this browser', 'saved');
    } catch (error) {
      setStatus('Draft could not be saved', 'dirty');
    }
  }

  function loadDraft() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = parseDataFile(String(reader.result || ''));
        data = clone(imported);
        ensureSections();
        activeSection = 'units';
        activeIndex = 0;
        searchTerm = '';
        refs.search.value = '';
        changed();
        renderAll();
        setStatus(`${file.name} imported`, 'dirty');
      } catch (error) {
        refs.validationTitle.textContent = 'Import failed';
        refs.validationResults.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
        refs.validationDialog.showModal();
      } finally {
        refs.import.value = '';
      }
    };
    reader.readAsText(file);
  }

  function parseDataFile(text) {
    const trimmed = text.trim();
    if (trimmed.startsWith('{')) return JSON.parse(trimmed);
    const match = trimmed.match(/^window\.CS_DATA\s*=\s*([\s\S]*);\s*$/);
    if (!match) throw new Error('Choose a data.js file exported by this editor, or a JSON archive file.');
    return JSON.parse(match[1]);
  }

  function exportData() {
    syncTraitLinksFromUnits();
    const issues = validateArchive();
    const output = `window.CS_DATA = ${JSON.stringify(data, null, 2)};\n`;
    const blob = new Blob([output], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'data.js';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    saveDraft(true);
    setStatus(issues.length ? `Exported with ${issues.length} validation warning${issues.length === 1 ? '' : 's'}` : 'data.js exported', issues.length ? 'dirty' : 'saved');
  }

  function showValidation() {
    const issues = validateArchive();
    refs.validationTitle.textContent = issues.length ? `${issues.length} item${issues.length === 1 ? '' : 's'} to review` : 'Archive is ready';
    refs.validationResults.innerHTML = issues.length
      ? `<ol class="validation-list">${issues.map(issue => `<li>${escapeHtml(issue)}</li>`).join('')}</ol>`
      : '<p class="validation-summary">No duplicate IDs, missing required text, or broken unit-trait links were found.</p>';
    refs.validationDialog.showModal();
  }

  function validateArchive() {
    const issues = [];
    ['units', 'stories', 'traits', 'regions', 'factions'].forEach(section => {
      const seen = new Set();
      data[section].forEach((item, index) => {
        const label = item.name || item.title || `${SECTION_CONFIG[section].singular} ${index + 1}`;
        if (!item.id) issues.push(`${label} is missing an ID.`);
        else if (seen.has(String(item.id).toLowerCase())) issues.push(`${section} contains the duplicate ID "${item.id}".`);
        else seen.add(String(item.id).toLowerCase());
      });
    });

    const traitNames = new Set(data.traits.map(trait => String(trait.name || '').toLowerCase()));
    const unitNames = new Set(data.units.map(unit => String(unit.name || '').toLowerCase()));

    data.units.forEach(unit => {
      const label = unit.name || unit.id || 'An unnamed unit';
      if (!unit.name) issues.push('A unit is missing its name.');
      if (!unit.role) issues.push(`${label} is missing a role.`);
      if (!unit.lore) issues.push(`${label} is missing unit lore.`);
      if (!unit.cardImageName) issues.push(`${label} is missing a card image filename.`);
      if (!unit.iconImageName) issues.push(`${label} is missing an icon image filename.`);
      (unit.traits || []).forEach(trait => {
        if (!traitNames.has(String(trait).toLowerCase())) issues.push(`${label} uses the unknown trait "${trait}".`);
      });
    });

    data.traits.forEach(trait => {
      const label = trait.name || trait.id || 'An unnamed trait';
      if (!trait.name) issues.push('A trait is missing its name.');
      (trait.units || []).forEach(unit => {
        if (!unitNames.has(String(unit).toLowerCase())) issues.push(`${label} links to the unknown unit "${unit}".`);
      });
    });

    data.stories.forEach(story => {
      const label = story.title || story.id || 'An unnamed story';
      if (!story.title) issues.push('A story is missing its title.');
      if (!story.content) issues.push(`${label} is missing its full story text.`);
      if (story.unit && !unitNames.has(String(story.unit).toLowerCase())) issues.push(`${label} links to the unknown unit "${story.unit}".`);
    });

    data.regions.forEach(region => {
      if (!region.name) issues.push('A region is missing its name.');
      if (!region.description) issues.push(`${region.name || region.id || 'A region'} is missing its description.`);
    });

    data.factions.forEach(faction => {
      if (!faction.name) issues.push('A faction is missing its name.');
      if (!faction.description) issues.push(`${faction.name || faction.id || 'A faction'} is missing its description.`);
    });

    data.timeline.forEach((entry, index) => {
      if (!entry.year) issues.push(`Timeline entry ${index + 1} is missing its year or era.`);
      if (!entry.title) issues.push(`Timeline entry ${index + 1} is missing its title.`);
      if (!entry.description) issues.push(`${entry.title || `Timeline entry ${index + 1}`} is missing its description.`);
    });

    return uniqueValues(issues);
  }

  function renderCounts() {
    refs.counts.textContent = Object.keys(SECTION_CONFIG)
      .map(section => `${data[section].length} ${SECTION_CONFIG[section].label.toLowerCase()}`)
      .join(' / ');
  }

  function setStatus(message, kind) {
    refs.status.textContent = message;
    refs.status.className = kind === 'dirty' ? 'is-dirty' : kind === 'saved' ? 'is-saved' : '';
  }

  function formatJson(value, optional) {
    if (value == null) return optional ? '' : '{}';
    return JSON.stringify(value, null, 2);
  }

  function uniqueLines(value) {
    return uniqueValues(String(value || '').split(/\r?\n|,/).map(item => item.trim()).filter(Boolean));
  }

  function uniqueValues(values) {
    const seen = new Set();
    return values.filter(value => {
      const key = String(value).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function uniqueId(base, section) {
    const safeBase = base || 'new-record';
    const existing = new Set(data[section].map(item => String(item.id || '').toLowerCase()));
    if (!existing.has(safeBase.toLowerCase())) return safeBase;
    let number = 2;
    while (existing.has(`${safeBase}-${number}`.toLowerCase())) number += 1;
    return `${safeBase}-${number}`;
  }

  function slug(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  function sameText(a, b) {
    return String(a || '').toLowerCase() === String(b || '').toLowerCase();
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
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
}());
