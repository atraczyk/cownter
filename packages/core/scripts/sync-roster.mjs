/**
 * Diff roster.json against the live Overwatch hero list (OverFast API) and
 * optionally apply new heroes, renames and role changes.
 *
 *   npm run sync-roster            # report only, exits 1 when out of date
 *   npm run sync-roster -- --write # update roster.json + hero_data.json roles/lists
 *
 * Role changes also move the hero between the tanks / damage / supports lists
 * of every other hero, so counters and synergies keep working.
 * New heroes are only added to the roster; run scaffold-missing for stubs.
 * Heroes missing from the API are reported, never removed.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API, fetchJson, sheetId } from './overfast.mjs';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const ROSTER = path.join(DATA_DIR, 'roster.json');
const HERO_DATA = path.join(DATA_DIR, 'hero_data.json');
const CHANGELOG = path.join(DATA_DIR, 'CHANGELOG.md');

const ROLE_CATEGORY = { tank: 'tanks', damage: 'damage', support: 'supports' };

const write = process.argv.includes('--write');

function today() {
  return new Date().toISOString().slice(0, 10);
}

function bump(version, part) {
  const [major, minor, patch] = version.split('.').map(Number);
  return part === 'minor' ? `${major}.${minor + 1}.0` : `${major}.${minor}.${patch + 1}`;
}

function formatRoster(roster) {
  const line = (entry) => `    ${JSON.stringify(entry).replace(/":/g, '": ').replace(/,"/g, ', "').replace(/^\{/, '{ ').replace(/\}$/, ' }')}`;
  const { heroes, maps, ...header } = roster;
  const head = JSON.stringify(header, null, 2).slice(0, -2);
  return `${head},\n  "heroes": [\n${heroes.map(line).join(',\n')}\n  ],\n  "maps": [\n${maps.map(line).join(',\n')}\n  ]\n}\n`;
}

function moveBetweenLists(heroData, heroId, fromRole, toRole) {
  const from = ROLE_CATEGORY[fromRole];
  const to = ROLE_CATEGORY[toRole];
  const touched = [];
  for (const [owner, info] of Object.entries(heroData)) {
    for (const field of ['strong_against', 'synergizes_with']) {
      const lists = info[field];
      if (!lists?.[from]?.includes(heroId)) continue;
      lists[from] = lists[from].filter((id) => id !== heroId);
      lists[to] = [...(lists[to] ?? []).filter((id) => id !== heroId), heroId];
      touched.push(`${owner}.${field}`);
    }
  }
  return touched;
}

const roster = JSON.parse(fs.readFileSync(ROSTER, 'utf8'));
const live = await fetchJson(`${API}/heroes`);
const liveById = new Map(live.map((hero) => [sheetId(hero.key), hero]));
const rosterById = new Map(roster.heroes.map((hero) => [hero.id, hero]));

const added = live.filter((hero) => !rosterById.has(sheetId(hero.key)));
const gone = roster.heroes.filter((hero) => !liveById.has(hero.id));
const roleChanges = [];
const renames = [];
for (const hero of roster.heroes) {
  const current = liveById.get(hero.id);
  if (!current) continue;
  if (current.role !== hero.role) roleChanges.push({ id: hero.id, from: hero.role, to: current.role });
  if (current.name !== hero.name) renames.push({ id: hero.id, from: hero.name, to: current.name });
}

console.log(`Live roster: ${live.length} heroes · roster.json ${roster.version}: ${roster.heroes.length} heroes`);
for (const hero of added) console.log(`new     ${sheetId(hero.key)} (${hero.name}, ${hero.role})`);
for (const change of roleChanges) console.log(`role    ${change.id}: ${change.from} -> ${change.to}`);
for (const change of renames) console.log(`rename  ${change.id}: "${change.from}" -> "${change.to}"`);
for (const hero of gone) console.log(`missing ${hero.id} is not in the live API — confirm before removing`);

const changed = added.length + roleChanges.length + renames.length;
if (!changed) {
  console.log('roster.json matches the live hero list.');
  process.exit(gone.length ? 1 : 0);
}

if (!write) {
  console.log('\nRun `npm run sync-roster -- --write` to apply.');
  process.exit(1);
}

const heroData = JSON.parse(fs.readFileSync(HERO_DATA, 'utf8'));
for (const change of roleChanges) {
  rosterById.get(change.id).role = change.to;
  if (heroData[change.id]) heroData[change.id].role = change.to;
  const touched = moveBetweenLists(heroData, change.id, change.from, change.to);
  console.log(`moved   ${change.id} to ${ROLE_CATEGORY[change.to]} in ${touched.length} lists`);
}
for (const change of renames) rosterById.get(change.id).name = change.to;
for (const hero of added) {
  roster.heroes.push({ id: sheetId(hero.key), name: hero.name, role: hero.role });
}
roster.heroes.sort((a, b) => a.id.localeCompare(b.id));

const previous = roster.version;
roster.version = bump(previous, added.length || roleChanges.length ? 'minor' : 'patch');
roster.updated = today();
fs.writeFileSync(ROSTER, formatRoster(roster), 'utf8');
fs.writeFileSync(HERO_DATA, `${JSON.stringify(heroData, null, 2)}\n`, 'utf8');

const notes = [
  ...added.map((hero) => `- Added ${hero.name} (${hero.role}).`),
  ...roleChanges.map((change) => `- ${rosterById.get(change.id).name}: ${change.from} -> ${change.to}; moved in counter/synergy lists.`),
  ...renames.map((change) => `- Renamed ${change.id}: "${change.from}" -> "${change.to}".`),
];
const existing = fs.existsSync(CHANGELOG) ? fs.readFileSync(CHANGELOG, 'utf8') : '# Data sheet changelog\n';
fs.writeFileSync(
  CHANGELOG,
  `${existing.trimEnd()}\n\n## ${today()}\n\n### roster ${previous} -> ${roster.version} (sync-roster)\n\n${notes.join('\n')}\n`,
  'utf8',
);

console.log(`\nroster.json ${previous} -> ${roster.version}`);
if (added.length) console.log('Next: npm run scaffold-missing && npm run grab-icons, then draft counters.');
if (roleChanges.length) console.log('Next: review archetype weights and counters for the changed roles.');
console.log('Then: npm run validate-data && npm run audit-data && npm test');
