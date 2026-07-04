
(function () {
  function slug(value) {
    return String(value || '')
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  function titleCase(value) {
    return String(value || '')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  function uniqueStrings(values) {
    const out = [];
    const seen = new Set();
    (values || []).forEach(value => {
      const cleaned = String(value || '').trim();
      if (!cleaned) return;
      const key = cleaned.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      out.push(cleaned);
    });
    return out;
  }

  function normalizeTraits(value) {
    if (Array.isArray(value)) return uniqueStrings(value);
    if (typeof value === 'string') {
      return uniqueStrings(value.split(/[,/|]+/g).map(v => v.trim()));
    }
    return [];
  }

  function ensureArrayMap(list, keyGetter) {
    const map = new Map();
    (list || []).forEach(item => {
      const key = keyGetter(item);
      if (!key || map.has(key)) return;
      map.set(key, item);
    });
    return map;
  }

  function patch() {
    const source = window.CS_DATA || {};
    const units = Array.isArray(source.units) ? source.units.slice() : [];
    const traits = Array.isArray(source.traits) ? source.traits.slice() : [];
    const stories = Array.isArray(source.stories) ? source.stories.slice() : [];

    // Normalize units.
    const normalizedUnits = units.map((unit, index) => {
      const name = String(unit.name || '').trim() || `Unit ${index + 1}`;
      const id = String(unit.id || slug(name));
      const role = String(unit.role || 'Unit').replace(/([a-z])([A-Z])/g, '$1 $2').trim();
      const traitsList = normalizeTraits(unit.traits);
      return {
        ...unit,
        id,
        name,
        role,
        subtitle: unit.subtitle || 'Subtitle',
        cost: Number(unit.cost) || 1,
        traits: traitsList,
        lore: unit.lore || unit.bio || ''
      };
    });

    const unitMap = ensureArrayMap(normalizedUnits, unit => String(unit.name).toLowerCase());

    // Add Stylet if it does not exist.
    if (!unitMap.has('stylet')) {
      const stylet = {
        id: 'stylet',
        name: 'Stylet',
        role: 'Attack Fighter',
        subtitle: 'Subtitle',
        cost: 5,
        traits: ['Edgelord'],
        lore: 'A high-velocity duelist that chains dashes through marked targets and overwhelms the last survivor with relentless pressure.',
        stats: {
          HP: '1100/1400/9999',
          Damage: '65/80/999',
          'Armour/MR': '45',
          'Attack Speed': '0.8',
          Mana: '0/50',
          Range: '1 Hex',
          Cost: '5'
        },
        ability: {
          passive: 'Attacks dash through enemies, stealing their attack speed by a stacking 8%.',
          active: 'Dash to and rapidly dash through the 4 nearest enemies 20 times, prioritizing tanks, then return to the initial target with an aerial knock-up attack.'
        },
        details: {
          edgelord: 'On combat start, mark all enemies. The first time Stylet attacks a marked enemy, uppercut them, knocking them up and dealing physical damage. If only one enemy remains, Stylet keeps dashing through them until they die.',
          uppercutDamage: '100 / 150 / 6000 + 55% AD',
          dashDamage: '95 / 120 / 5000 + 70% AD',
          aerialDamage: '230 / 270 / 5000 + 65% AD'
        }
      };
      normalizedUnits.push(stylet);
      unitMap.set('stylet', stylet);
    }

    // Normalize traits.
    const normalizedTraits = traits.map((trait, index) => {
      const name = String(trait.name || '').trim() || `Trait ${index + 1}`;
      const type = String(trait.type || 'origin').toLowerCase();
      const linkedUnits = normalizeTraits(trait.units);
      return {
        ...trait,
        id: String(trait.id || slug(name)),
        name,
        type: type === 'class' ? 'class' : 'origin',
        units: linkedUnits,
        tiers: Array.isArray(trait.tiers) ? trait.tiers : []
      };
    });

    const traitMap = ensureArrayMap(normalizedTraits, trait => String(trait.name).toLowerCase());

    // Ensure units listed under traits also receive those traits.
    normalizedTraits.forEach(trait => {
      normalizeTraits(trait.units).forEach(unitName => {
        const unit = unitMap.get(String(unitName).toLowerCase());
        if (!unit) return;
        unit.traits = uniqueStrings([...(unit.traits || []), trait.name]);
      });
    });

    // Ensure each unit trait points back to the trait entry; if missing, create a minimal entry.
    normalizedUnits.forEach(unit => {
      unit.traits = normalizeTraits(unit.traits);
      unit.traits.forEach((traitName, traitIndex) => {
        const key = String(traitName).toLowerCase();
        let trait = traitMap.get(key);
        if (!trait) {
          trait = {
            id: slug(traitName),
            name: titleCase(traitName),
            type: 'origin',
            tagline: 'Supplemental archive entry',
            description: `${titleCase(traitName)} is linked to ${unit.name}.`,
            color: traitIndex % 2 === 0 ? '#6cd0ff' : '#c9a84c',
            units: []
          };
          normalizedTraits.push(trait);
          traitMap.set(key, trait);
        }
        trait.units = uniqueStrings([...(trait.units || []), unit.name]);
      });
    });

    // Add a fuller Edgelord entry if it was missing.
    if (!traitMap.has('edgelord')) {
      normalizedTraits.push({
        id: 'edgelord',
        name: 'Edgelord',
        type: 'origin',
        tagline: 'Marks the field and punishes isolated targets.',
        description: 'On combat start, marked enemies are primed for Stylet\'s first-hit uppercut. When only one enemy remains, Stylet chains dashes through them until they fall.',
        color: '#b06cff',
        tiers: [],
        units: ['Stylet']
      });
    } else {
      const edgelord = traitMap.get('edgelord');
      edgelord.units = uniqueStrings([...(edgelord.units || []), 'Stylet']);
      edgelord.tagline = edgelord.tagline || 'Marks the field and punishes isolated targets.';
      edgelord.description = edgelord.description || 'On combat start, marked enemies are primed for Stylet\'s first-hit uppercut. When only one enemy remains, Stylet chains dashes through them until they fall.';
      edgelord.color = edgelord.color || '#b06cff';
    }

    // Sort units by cost then name for stability.
    normalizedUnits.sort((a, b) => (Number(a.cost) - Number(b.cost)) || String(a.name).localeCompare(String(b.name)));

    window.CS_DATA = {
      ...source,
      units: normalizedUnits,
      traits: normalizedTraits,
      stories
    };
  }

  patch();
}());
