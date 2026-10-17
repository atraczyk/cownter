/** Read-only comparison of cownter preferences with Overpicker's published point ratings.
 * node packages/core/scripts/review-map-ratings.mjs [--source saved-page.html] [--label after-corrections]
 * Writes dated reports; never changes the engine's data sheets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { heroId, parseMatrix, sourceUpdated } from './overpicker.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const read = name => JSON.parse(fs.readFileSync(path.join(root, 'packages/core/data', name), 'utf8'));
const styles = ['dive', 'poke', 'brawl'];
const sourceUrl = 'https://www.overpicker.com/maps';
const round = value => value == null ? null : Math.round(value * 1000) / 1000;
const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;
const leading = weights => styles.filter(style => Math.abs(weights[style] - Math.max(...styles.map(s => weights[s]))) < 1e-6);
// Match core fitBonus rounding so floating-point noise does not split tied ranks.
const fit = (hero, point) => Math.round(3 * (styles.reduce((sum, style) => sum + hero[style] * point[style], 0) - 1 / 3) * 100) / 100;

// Average ranks for ties: these are coarse ordinal ratings, not measured win rates.
function ranks(values) {
  return values.map(value => {
    const lower = values.filter(other => other < value).length;
    const equal = values.filter(other => other === value).length;
    return (lower + (equal - 1) / 2) / Math.max(1, values.length - 1);
  });
}

/** Spearman correlation after ranking/centering within roles; each role has equal total weight. */
function association(rows, predictor, response = row => row.rating) {
  let xy = 0, xx = 0, yy = 0;
  for (const role of ['tank', 'damage', 'support']) {
    const group = rows.filter(row => row.role === role);
    if (group.length < 2) continue;
    const xs = ranks(group.map(predictor));
    const ys = ranks(group.map(response));
    const mx = mean(xs), my = mean(ys);
    for (let i = 0; i < group.length; i++) {
      const x = xs[i] - mx, y = ys[i] - my;
      xy += x * y / group.length;
      xx += x * x / group.length;
      yy += y * y / group.length;
    }
  }
  return xx > 1e-12 && yy > 1e-12 ? xy / Math.sqrt(xx * yy) : null;
}

function mappedColumns(map, point, source) {
  if (!source) return { kind: 'missing map', columns: [] };
  const columns = source.columns.map(column => column.pointName);
  if (['escort', 'hybrid'].includes(map.mode)) {
    // A/B/C are the three sequential stages, not arbitrary name similarities.
    if (map.points.length !== 3 || columns.join(',') !== 'A,B,C') return { kind: 'unmapped stages', columns: [] };
    return { kind: 'direct stage', columns: [columns[map.points.indexOf(point)]] };
  }
  const exact = columns.find(column => [heroId(point.id), heroId(point.name)].includes(heroId(column)));
  if (exact) return { kind: 'direct named point', columns: [exact] };
  if (map.mode === 'push' && point.id === 'center' && columns.includes('Mid')) return { kind: 'center/Mid', columns: ['Mid'] };
  if (map.mode === 'push' && point.id === 'deep_push') return { kind: 'context only: Ally/Enemy', columns: columns.filter(column => ['Ally', 'Enemy'].includes(column)) };
  if (map.mode === 'flashpoint') return { kind: 'context only: all five objectives', columns };
  return { kind: 'unmapped point', columns: [] };
}

function analyze(map, point, side, weights, source, mapping, heroes, archetypes, baseline) {
  const rows = [];
  for (const [name, info] of Object.entries(source?.heroes ?? {})) {
    const id = heroId(name);
    const mix = archetypes[id];
    if (!mix || Math.max(...styles.map(s => mix[s])) - Math.min(...styles.map(s => mix[s])) < 0.05) continue;
    const ratings = mapping.columns.map(column => {
      const value = info.points[column];
      return side ? value?.[side] : value?.score;
    });
    if (!ratings.length || ratings.some(value => !Number.isFinite(value))) continue;
    const rating = mean(ratings);
    rows.push({ id, name, role: heroes[id].role, mix, rating, relative_rating: round(rating - baseline[id]), fit: fit(mix, weights) });
  }
  const placeholder = Math.max(...styles.map(s => weights[s])) - Math.min(...styles.map(s => weights[s])) < 0.05;
  const rho = rows.length && !placeholder ? association(rows, row => row.fit) : null;
  const relativeRho = rows.length && !placeholder ? association(rows, row => row.fit, row => row.relative_rating) : null;
  const styleSignals = Object.fromEntries(styles.map(style => [style, round(association(rows, row => row.mix[style]))]));
  const signals = styles.filter(style => styleSignals[style] != null);
  const strongest = signals.length ? signals.reduce((best, style) => styleSignals[style] > styleSignals[best] ? style : best) : null;
  const classify = value => !mapping.columns.length ? 'unmapped' : placeholder ? 'placeholder'
    : value == null ? 'no variation' : value >= 0.3 ? 'aligned' : value <= -0.2 ? 'opposed' : 'mixed';
  const status = classify(rho);
  const conflicts = rows.filter(row => row.rating >= 10 && row.fit <= -0.1)
    .sort((a, b) => b.rating - a.rating || a.fit - b.fit).slice(0, 4)
    .map(row => ({ hero: row.id, source_rating: row.rating, cownter_fit: round(row.fit) }));
  const withoutSombra = placeholder ? null : association(rows.filter(row => row.id !== 'sombra'), row => row.fit);
  return {
    map: map.id, map_name: map.name, point: point.id, point_name: point.name, side,
    mapping: mapping.kind, source_points: mapping.columns, weights, dominant: leading(weights),
    status, relative_status: classify(relativeRho), heroes_compared: rows.length, rho: round(rho), relative_rho: round(relativeRho), rho_without_sombra: round(withoutSombra),
    style_associations: styleSignals, strongest_style_signal: strongest, conflicts,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    if (!['--source', '--label'].includes(args[i]) || !args[i + 1] || args[i + 1].startsWith('--') || options[args[i]]) {
      throw new Error('Usage: review-map-ratings.mjs [--source saved-page.html] [--label after-corrections]');
    }
    options[args[i]] = args[i + 1];
  }
  if (options['--label'] && !/^[a-z0-9-]+$/.test(options['--label'])) throw new Error('Label must use lowercase letters, digits or hyphens');
  let html;
  if (options['--source']) html = fs.readFileSync(options['--source'], 'utf8');
  else {
    const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${response.status}: ${sourceUrl}`);
    html = await response.text();
  }
  const source = parseMatrix(html, 'mapData');
  const maps = read('maps.json'), archetypes = read('archetypes.json'), heroes = read('hero_data.json');
  const sourceById = Object.fromEntries(Object.entries(source).map(([name, map]) => [heroId(name).replace(/^watchpointgrimsvotn$/, 'grimsvotn'), map]));
  // Do not silently invent zeros for unknown heroes, missing points, or unsupported values.
  for (const [name, map] of Object.entries(source)) {
    if (!Array.isArray(map.columns) || !map.columns.length) throw new Error(`No point columns: ${name}`);
    for (const [hero, info] of Object.entries(map.heroes)) {
      if (!heroes[heroId(hero)]) throw new Error(`Unknown source hero: ${hero}`);
      for (const column of map.columns) {
        const keys = column.dual ? ['attack', 'defense'] : ['score'];
        for (const key of keys) if (![-20, -10, 0, 10, 20].includes(info.points?.[column.pointName]?.[key])) {
          throw new Error(`Invalid/missing rating: ${name}/${hero}/${column.pointName}/${key}`);
        }
      }
    }
    if (Object.keys(map.heroes).length !== Object.keys(heroes).length) throw new Error(`Incomplete hero coverage: ${name}`);
  }
  // Equal weight per map, averaging its source points/sides first. These are rating
  // baselines, not win rates, and remove a source-wide preference for a given hero.
  const baselineSamples = {};
  for (const map of Object.values(source)) for (const [name, info] of Object.entries(map.heroes)) {
    const id = heroId(name);
    const scores = map.columns.flatMap(column => column.dual
      ? [info.points[column.pointName].attack, info.points[column.pointName].defense]
      : [info.points[column.pointName].score]);
    (baselineSamples[id] ??= []).push(mean(scores));
  }
  const baseline = Object.fromEntries(Object.entries(baselineSamples).map(([id, scores]) => [id, mean(scores)]));
  const results = [];
  for (const map of maps.maps) {
    const upstream = sourceById[heroId(map.name)];
    if (upstream && upstream.type.toLowerCase() !== map.mode) throw new Error(`Mode mismatch: ${map.name}`);
    for (const point of map.points) {
      const mapping = mappedColumns(map, point, upstream);
      const sided = maps.modes.find(mode => mode.id === map.mode).sided;
      for (const side of sided ? ['attack', 'defense'] : [null]) {
        results.push(analyze(map, point, side, side ? point.comp[side] : point.comp, upstream, mapping, heroes, archetypes.heroes, baseline));
      }
    }
  }
  const date = new Date().toISOString().slice(0, 10);
  const out = path.join(root, 'reports', `overpicker-map-sweep-${date}${options['--label'] ? `-${options['--label']}` : ''}`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const excluded = Object.entries(archetypes.heroes).filter(([, w]) => Math.max(...Object.values(w)) - Math.min(...Object.values(w)) < 0.05).map(([id]) => id);
  const direct = results.filter(row => !row.mapping.startsWith('context') && row.source_points.length);
  const contextual = results.filter(row => row.mapping.startsWith('context'));
  const count = (rows, field = 'status') => Object.fromEntries(['aligned', 'mixed', 'opposed', 'placeholder', 'unmapped', 'no variation'].map(status => [status, rows.filter(row => row[field] === status).length]));
  const summary = {
    source_maps: Object.keys(source).length, local_maps: maps.maps.length,
    missing_maps: maps.maps.filter(map => !sourceById[heroId(map.name)]).map(map => map.name),
    source_updated: sourceUpdated(html), fetched: date, direct: count(direct), contextual: count(contextual), all: count(results),
    relative_direct: count(direct, 'relative_status'),
    evaluated_direct: direct.filter(row => row.rho != null).length,
    persistent_opposed: direct.filter(row => row.status === 'opposed' && row.relative_status === 'opposed').length,
    baseline_sensitive_opposed: direct.filter(row => row.status === 'opposed' && row.relative_status !== 'opposed').length,
    excluded_neutral_heroes: excluded,
  };
  fs.writeFileSync(`${out}.json`, `${JSON.stringify({ summary, hero_rating_baselines: baseline, results }, null, 2)}\n`);
  fs.writeFileSync(`${out}.source.json`, `${JSON.stringify({
    source_url: sourceUrl, accessed: date, source_updated: sourceUpdated(html), source_data: source,
    inputs: { maps, archetypes, roles: Object.fromEntries(Object.entries(heroes).map(([id, hero]) => [id, hero.role])) },
  }, null, 2)}\n`);
  const formatted = value => value == null ? '—' : value.toFixed(2);
  const table = rows => [
    '| Map | Point / side | Current mix D/P/B | Source scope | Raw rank agreement | Relative agreement | Raw / relative result |',
    '|---|---|---|---|---:|---:|---|',
    ...rows.map(row => `| ${row.map_name} | ${row.point_name}${row.side ? ` / ${row.side}` : ''} | ${styles.map(s => Math.round(row.weights[s] * 100)).join('/')} | ${row.source_points.join(', ') || row.mapping} | ${formatted(row.rho)} | ${formatted(row.relative_rho)} | ${row.status} / ${row.relative_status} |`),
  ];
  const flags = direct.filter(row => row.status === 'opposed' && row.relative_status === 'opposed').sort((a, b) => a.rho - b.rho);
  const sensitive = direct.filter(row => row.status === 'opposed' && row.relative_status !== 'opposed');
  const agreements = direct.filter(row => row.status === 'aligned' && row.relative_status === 'aligned')
    .sort((a, b) => b.relative_rho - a.relative_rho).slice(0, 8);
  const report = [
    `# Overpicker map-rating sweep — ${date}`, '',
    `Source: [Overpicker map ratings](${sourceUrl}); live page footer updated ${summary.source_updated}. Current local maps ${maps.version}, archetypes ${archetypes.version}.`, '',
    'This is a consistency review of two sets of drafts, not a statistical validation of win rates. The sweep itself never modifies map/hero weights or engine scoring.', '',
    '## Coverage and method', '',
    `- Source coverage: ${summary.source_maps}/${summary.local_maps} local maps. Missing: ${summary.missing_maps.join(', ')}.`,
    `- Direct point/stage comparisons: ${direct.length}; contextual grouped comparisons: ${contextual.length}; unmapped local scopes: ${results.filter(row => row.status === 'unmapped').length}. Attack and defense count separately.`,
    `- Excluded ${excluded.length} near-neutral hero archetype placeholders: ${excluded.join(', ')}. Remaining 42 heroes are compared by their current role.`,
    '- Each hero’s predicted fit is 3 × (hero mix · point mix − 1/3). Compare its rank with the published hero rating, using average ranks for ties, centering within each role and assigning equal total weight to tank/damage/support.',
    '- Rank agreement ranges from −1 (opposite ranking) to +1 (matching ranking). Review buckets are heuristic: aligned ≥0.30; opposed ≤−0.20; mixed otherwise. They are not confidence levels or significance tests.',
    '- Relative agreement subtracts each hero’s average source rating across the 31 maps before ranking (equal weight per map; average its points/sides first). It checks whether apparent agreement/disagreement survives a general source preference for that hero. Both raw and relative values are reported; neither is ground truth.',
    '- Stage A/B/C maps to the three sequential local Escort/Hybrid stages. Named Control points match by name; Push Center maps to Mid. Check each semantic stage mapping before making edits.',
    '- Flashpoint First/Later groups cannot be matched to individual named objectives without further evidence: all five source objectives provide contextual averages only. Push Deep push uses an Ally/Enemy contextual average, not a confirmed spatial match.',
    '- Antarctic Labs/Sublevel do not match source Drilling Rig/Anomaly: no automatic rename or forced comparison. Clash maps are absent from the source.',
    '- Source hero ratings reflect community analysis, without published sample sizes. Hero-style weights are also drafts. Disagreement may originate in either source, an archetype, or a point mapping.',
    '- JSON includes sensitivity without Sombra (whose archetype predates the role rework), per-style rank associations, and source-favored heroes penalized by our fit. Source/style correlations are diagnostic signals, not proposed replacement percentages.',
    '- The accompanying .source.json retains numeric source data and local input snapshots for reproducibility. Offline rerun: pass saved HTML with --source; the reports themselves carry all inputs for independent recalculation.', '',
    '## Summary', '',
    `Direct comparisons: ${JSON.stringify(summary.direct)}.`, '',
    `Direct comparisons after per-hero baseline adjustment: ${JSON.stringify(summary.relative_direct)}.`, '',
    `Of ${summary.evaluated_direct} non-placeholder direct comparisons, ${summary.persistent_opposed} disagreements persist with baseline adjustment and ${summary.baseline_sensitive_opposed} raw disagreements become mixed.`, '',
    `Contextual comparisons: ${JSON.stringify(summary.contextual)}.`, '',
    '## Direct disagreements that persist after baseline adjustment', '',
    ...table(flags), '',
    ...flags.slice(0, 12).flatMap(row => [
      `- **${row.map_name} — ${row.point_name}${row.side ? ` / ${row.side}` : ''}**: rank agreement ${formatted(row.rho)}; strongest archetype association ${row.strongest_style_signal} (${formatted(row.style_associations[row.strongest_style_signal])}). Examples favored upstream but penalized here: ${row.conflicts.map(c => `${c.hero} (rating +${c.source_rating}, fit ${c.cownter_fit})`).join('; ') || 'none under the chosen cutoff'}.`,
    ]), '',
    '## Raw disagreements sensitive to the hero baseline', '', ...table(sensitive), '',
    '## Strongest agreements that persist after baseline adjustment', '', ...table(agreements), '',
    '## All local points and sides', '', ...table(results), '',
    '## Review guidance', '',
    'Preserve weights while checking the strongest negative direct comparisons against terrain and player experience. Treat neutral point placeholders as unfinished, not disagreements. Resolve renamed Control points and split generic Flashpoint groups before claiming point-level validation. A mixed or aligned result does not mark a draft as reviewed.', '',
  ];
  fs.writeFileSync(`${out}.md`, report.join('\n'));
  console.log(JSON.stringify(summary, null, 2));
  console.log(`Report: ${out}.md`);
  console.log('Strongest direct disagreements:', JSON.stringify(flags.slice(0, 8).map(row => ({ map: row.map_name, point: row.point_name, side: row.side, rho: row.rho, signal: row.strongest_style_signal }))));
}

main().catch(error => { console.error(error); process.exitCode = 1; });
