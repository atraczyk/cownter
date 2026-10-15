/**
 * Download Overwatch map screenshots into resources/images/maps/<id>.jpg
 * Uses the community OverFast API. Ids come from roster.json.
 *
 *   npm run grab-maps
 *   node packages/core/scripts/grab-maps.mjs --force
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API, fetchBuffer, fetchJson, mapApiKey } from './overfast.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const ROSTER = path.join(ROOT, 'packages/core/data/roster.json');
const OUT = path.join(ROOT, 'resources/images/maps');
const MIN_BYTES = 8192;

const force = process.argv.includes('--force');

const roster = JSON.parse(fs.readFileSync(ROSTER, 'utf8'));
const maps = [...roster.maps].sort((a, b) => a.id.localeCompare(b.id));
console.log(`Grabbing thumbnails for ${maps.length} maps into ${OUT}`);

const catalog = await fetchJson(`${API}/maps`);
const byKey = new Map(catalog.map((entry) => [entry.key, entry]));

const missing = [];
for (const map of maps) {
  const dest = path.join(OUT, `${map.id}.jpg`);
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > MIN_BYTES) {
    console.log(`skip  ${map.id}`);
    continue;
  }

  const key = mapApiKey(map.id);
  const shot = byKey.get(key)?.screenshot;
  if (!shot) {
    missing.push(map.id);
    console.error(`fail  ${map.id}: no screenshot for ${key}`);
    continue;
  }

  try {
    const buffer = await fetchBuffer(shot);
    if (buffer.length < MIN_BYTES) throw new Error(`only ${buffer.length} bytes`);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(dest, buffer);
    console.log(`ok    ${map.id} (${buffer.length} bytes)`);
  } catch (error) {
    missing.push(map.id);
    console.error(`fail  ${map.id}: ${error.message}`);
  }
}

if (missing.length) {
  console.error(`\nFailed for: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('\nAll map thumbnails present.');
}
