/** Shared helpers for the community OverFast API (https://overfast-api.tekrop.fr). */
export const API = 'https://overfast-api.tekrop.fr';

const HEADERS = { 'User-Agent': 'ow-counters/2' };

/** Our sheet ids -> OverFast hero keys when they differ. */
export const API_KEYS = {
  jetpackcat: 'jetpack-cat',
  junkerqueen: 'junker-queen',
  soldier76: 'soldier-76',
  wreckingball: 'wrecking-ball',
};

/** Our map ids -> OverFast map keys when underscore-to-hyphen is not enough. */
export const MAP_API_KEYS = {
  grimsvotn: 'watchpoint-grimsvotn',
};

export function apiKey(id) {
  return API_KEYS[id] ?? id;
}

/** `kings_row` -> `kings-row`, with the few ids OverFast names differently. */
export function mapApiKey(id) {
  return MAP_API_KEYS[id] ?? id.replaceAll('_', '-');
}

/** OverFast hero key -> our sheet id (`soldier-76` -> `soldier76`). */
export function sheetId(key) {
  return key.replace(/-/g, '');
}

export async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${url}: ${body.slice(0, 120)}`);
  }
  return res.json();
}

export async function fetchBuffer(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
