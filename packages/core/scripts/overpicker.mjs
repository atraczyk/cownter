/** Parse public Overpicker data as JSON, never executable JavaScript. */
export const SOURCES = {
  counter: 'https://www.overpicker.com/counters',
  synergy: 'https://www.overpicker.com/synergies',
  methodology: 'https://www.overpicker.com/about',
};

export function heroId(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function parseMatrix(html, variable) {
  const match = html.match(new RegExp(`\\bconst\\s+${variable}\\s*=\\s*(\\{[^\\r\\n]*\\});`));
  if (!match) throw new Error(`Overpicker markup changed: cannot find ${variable} JSON`);
  return JSON.parse(match[1]);
}

export function sourceUpdated(html) {
  return html.match(/Last Update:\s*<strong[^>]*>(\d{4}-\d{2}-\d{2})<\/strong>/)?.[1] ?? null;
}

/** Reject incomplete/unknown data instead of silently treating it as neutral. */
export function normalizeMatrix(matrix, roster) {
  const expected = roster.heroes.map(hero => hero.id).sort();
  const names = Object.keys(matrix);
  const ids = names.map(heroId);
  if (new Set(ids).size !== ids.length || JSON.stringify([...ids].sort()) !== JSON.stringify(expected)) {
    throw new Error('Overpicker hero coverage differs from roster.json; run sync-roster and review source coverage');
  }
  const result = {};
  for (const name of names.sort((a, b) => heroId(a).localeCompare(heroId(b)))) {
    const row = matrix[name];
    if (!row || typeof row !== 'object' || Array.isArray(row)
      || JSON.stringify(Object.keys(row).sort()) !== JSON.stringify([...names].sort())) {
      throw new Error(`Incomplete Overpicker row: ${name}`);
    }
    result[heroId(name)] = {};
    for (const target of [...names].sort((a, b) => heroId(a).localeCompare(heroId(b)))) {
      const rating = row[target];
      if (![-20, -10, 0, 10, 20].includes(rating)) throw new Error(`Invalid Overpicker rating: ${name}/${target}`);
      result[heroId(name)][heroId(target)] = rating;
    }
  }
  return result;
}

/** All positive, directed links, without top-N limits or invented reverse links. */
export function buildHeroData(roster, matrices) {
  const counters = normalizeMatrix(matrices.counter, roster);
  const synergies = normalizeMatrix(matrices.synergy, roster);
  const roles = new Map(roster.heroes.map(hero => [hero.id, hero.role]));
  const categories = { tank: 'tanks', damage: 'damage', support: 'supports' };
  const result = {};
  for (const id of Object.keys(counters)) {
    if (!categories[roles.get(id)]) throw new Error(`Invalid roster role: ${id}`);
    const info = { role: roles.get(id) };
    for (const [field, matrix] of [['strong_against', counters], ['synergizes_with', synergies]]) {
      info[field] = { tanks: [], damage: [], supports: [] };
      for (const [target, rating] of Object.entries(matrix[id])) {
        if (id !== target && rating > 0) info[field][categories[roles.get(target)]].push(target);
      }
    }
    result[id] = info;
  }
  return result;
}

export function differences(actual, expected) {
  const changes = [];
  for (const id of new Set([...Object.keys(actual), ...Object.keys(expected)])) {
    if (!actual[id] || !expected[id]) { changes.push(`${id}: hero coverage differs`); continue; }
    if (actual[id].role !== expected[id].role) changes.push(`${id}: role differs`);
    for (const field of ['strong_against', 'synergizes_with']) {
      const a = actual[id][field] ?? {};
      const b = expected[id][field];
      for (const category of new Set([...Object.keys(a), ...Object.keys(b)])) {
        if (JSON.stringify([...(a[category] ?? [])].sort()) !== JSON.stringify(b[category])) {
          changes.push(`${id}.${field}.${category}: links differ`);
        }
      }
    }
  }
  return changes;
}
