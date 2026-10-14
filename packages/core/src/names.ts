const NICKNAMES: Record<string, string> = {
  bast: 'bastion',
  cass: 'cassidy',
  doom: 'doomfist',
  rein: 'reinhardt',
  sym: 'symmetra',
  torb: 'torbjorn',
  widow: 'widowmaker',
  ball: 'wreckingball',
  zen: 'zenyatta',
};

const PHONETIC: Record<string, string> = {
  farrah: 'pharah',
  farah: 'pharah',
  mccree: 'cassidy',
  ramada: 'ramattra',
  soldier: 'soldier76',
  'soldier 76': 'soldier76',
};

export function normalizeHeroName(name: string): string {
  const ascii = name.normalize('NFKD').replace(/\p{M}/gu, '');
  let normalized = ascii.toLowerCase().replace(/ /g, '-');
  normalized = normalized.replace(/[^a-z0-9-]/g, '');
  while (normalized.includes('--')) normalized = normalized.replace(/--/g, '-');
  return normalized;
}

function levenshtein(s1: string, s2: string): number {
  if (s1.length < s2.length) return levenshtein(s2, s1);
  if (!s2) return s1.length;

  let previous = Array.from({ length: s2.length + 1 }, (_, i) => i);
  for (let i = 0; i < s1.length; i += 1) {
    const current = [i + 1];
    for (let j = 0; j < s2.length; j += 1) {
      const insert = previous[j + 1] + 1;
      const del = current[j] + 1;
      const sub = previous[j] + (s1[i] === s2[j] ? 0 : 1);
      current.push(Math.min(insert, del, sub));
    }
    previous = current;
  }
  return previous[s2.length];
}

export function getClosestMatch(hero: string, heroList: readonly string[]): string {
  const lower = hero.toLowerCase();
  if (NICKNAMES[lower]) return NICKNAMES[lower];
  if (PHONETIC[lower]) return PHONETIC[lower];

  const score = (candidate: string): number => {
    const a = hero.toLowerCase();
    const b = candidate.toLowerCase();
    let prefix = 0;
    for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
      if (a[i] !== b[i]) break;
      prefix += 1;
    }
    return levenshtein(a, b) - prefix * 0.5;
  };

  return heroList.reduce((best, candidate) => (score(candidate) < score(best) ? candidate : best));
}

export function matchHeroNames(heroes: readonly string[], heroList: readonly string[]): string[] {
  return heroes.map((hero) => getClosestMatch(hero, heroList));
}
