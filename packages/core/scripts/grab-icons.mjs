/**
 * Download Overwatch hero portraits into resources/images/icons/icon-<id>.png
 * Uses the community OverFast API (Blizzard CDN portrait URLs).
 *
 *   npm run grab-icons
 *   npm run grab-icons -- --force
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { API, apiKey, fetchBuffer, fetchJson } from './overfast.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const DATA = path.join(ROOT, 'packages/core/data/hero_data.json');
const OUT = path.join(ROOT, 'resources/images/icons');

const force = process.argv.includes('--force');

async function download(heroId) {
  const key = apiKey(heroId);
  const dest = path.join(OUT, `icon-${heroId}.png`);
  if (!force && fs.existsSync(dest) && fs.statSync(dest).size > 2048) {
    return { heroId, skipped: true };
  }

  const data = await fetchJson(`${API}/heroes/${key}`);
  const portrait = data.portrait;
  if (!portrait) throw new Error(`no portrait for ${key}`);

  const buffer = await fetchBuffer(portrait);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(dest, buffer);
  return { heroId, bytes: buffer.length, portrait };
}

const heroes = Object.keys(JSON.parse(fs.readFileSync(DATA, 'utf8'))).sort();
console.log(`Grabbing icons for ${heroes.length} heroes into ${OUT}`);

const missing = [];
for (const heroId of heroes) {
  try {
    const result = await download(heroId);
    if (result.skipped) console.log(`skip  ${heroId}`);
    else console.log(`ok    ${heroId} (${result.bytes} bytes)`);
  } catch (error) {
    missing.push(heroId);
    console.error(`fail  ${heroId}: ${error.message}`);
  }
}

if (missing.length) {
  console.error(`\nFailed for: ${missing.join(', ')}`);
  process.exitCode = 1;
} else {
  console.log('\nAll icons present.');
}
