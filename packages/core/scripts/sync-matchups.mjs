/** Default: compare live Overpicker data. --write: replace sheets. --offline: check saved snapshot. */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SOURCES, parseMatrix, sourceUpdated, normalizeMatrix, buildHeroData, differences } from './overpicker.mjs';

const dataDir = new URL('../data/', import.meta.url);
const read = name => JSON.parse(fs.readFileSync(new URL(name, dataDir), 'utf8'));
const save = (name, data) => fs.writeFileSync(new URL(name, dataDir), `${JSON.stringify(data, null, 2)}\n`);

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => !['--write', '--offline', '--check'].includes(arg))
    || (args.includes('--write') && (args.includes('--offline') || args.includes('--check')))) {
    throw new Error('Usage: node sync-matchups.mjs [--check | --write | --offline]');
  }
  const roster = read('roster.json');
  const current = read('hero_data.json');
  const offline = args.includes('--offline');
  const previous = read('matchup_sources.json');
  let snapshot = previous;
  if (!offline) {
    const pages = await Promise.all(['counter', 'synergy'].map(async kind => {
      const response = await fetch(SOURCES[kind], { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`${response.status} fetching ${SOURCES[kind]}`);
      const html = await response.text();
      return { kind, updated: sourceUpdated(html), matrix: normalizeMatrix(parseMatrix(html,
        kind === 'counter' ? 'counterMatrix' : 'synergyMatrix'), roster) };
    }));
    snapshot = {
      sheet: 'matchup_sources', version: '1.0.0', status: 'llm-draft',
      accessed: new Date().toISOString().slice(0, 10), sources: SOURCES,
      source_updated: Object.fromEntries(pages.map(page => [page.kind, page.updated])),
      conversion: 'All positive (10/20) directed ratings become binary links. No top-N cutoff, reverse-link inference, or legacy overrides. Self links excluded. Role buckets follow roster.json (OverFast).',
      limitations: 'Community analysis, not Blizzard matchup statistics. Negative/neutral ratings and positive strength are retained here but not scored by the binary engine. Archetype and map-fit weights are maintained separately. Source synergy ratings may be asymmetric; direction is preserved.',
      matrices: Object.fromEntries(pages.map(page => [page.kind, page.matrix])),
    };
    if (previous.matrices && JSON.stringify(previous.matrices) !== JSON.stringify(snapshot.matrices)) {
      const [major, minor, patch] = previous.version.split('.').map(Number);
      snapshot.version = `${major}.${minor}.${patch + 1}`;
    } else if (previous.matrices) snapshot.version = previous.version;
  }
  if (!snapshot.matrices) throw new Error('No complete Overpicker snapshot; run sync-matchups --write online first');
  const expected = buildHeroData(roster, snapshot.matrices);
  const changes = differences(current, expected);
  const snapshotStale = !previous.matrices || JSON.stringify(previous.matrices) !== JSON.stringify(snapshot.matrices);
  console.log(`${offline ? 'Saved' : 'Live'} Overpicker: ${roster.heroes.length} heroes; ${changes.length} hero-data differences; snapshot ${snapshotStale ? 'stale' : 'matches'}`);
  if (args.includes('--write')) {
    // Parsing and full matrix validation finish before either sheet is touched.
    if (changes.length) save('hero_data.json', expected);
    if (snapshotStale || JSON.stringify(previous.source_updated) !== JSON.stringify(snapshot.source_updated)) {
      save('matchup_sources.json', snapshot);
    }
    console.log(`Saved validated Overpicker data in ${fileURLToPath(dataDir)}`);
  } else if (changes.length || snapshotStale) {
    console.log(changes.slice(0, 12).join('\n'));
    console.log('Run node packages/core/scripts/sync-matchups.mjs --write to apply live data.');
    process.exitCode = 1;
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
