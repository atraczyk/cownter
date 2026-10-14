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

export function apiKey(id) {
  return API_KEYS[id] ?? id;
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
