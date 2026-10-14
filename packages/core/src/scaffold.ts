import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ArchetypesSheet, CompWeights, HeroData, MapsSheet } from './types';
import type { RosterHero, RosterMap, RosterSheet } from './audit';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');

const EMPTY_AGAINST = { tanks: [] as string[], damage: [] as string[], support: [] as string[] };

const DEFAULT_ARCHETYPE: CompWeights = { dive: 0.34, poke: 0.33, brawl: 0.33 };

const DEFAULT_POINTS: Record<string, Array<{ id: string; name: string }>> = {
  control: [
    { id: 'point_a', name: 'Point A' },
    { id: 'point_b', name: 'Point B' },
    { id: 'point_c', name: 'Point C' },
  ],
  escort: [
    { id: 'checkpoint_1', name: 'First checkpoint' },
    { id: 'checkpoint_2', name: 'Second checkpoint' },
    { id: 'checkpoint_3', name: 'Final stretch' },
  ],
  hybrid: [
    { id: 'point_a', name: 'Point A capture' },
    { id: 'checkpoint_1', name: 'First checkpoint' },
    { id: 'checkpoint_2', name: 'Final stretch' },
  ],
  push: [
    { id: 'center', name: 'Robot start' },
    { id: 'deep_push', name: 'Deep push' },
  ],
  flashpoint: [
    { id: 'first_point', name: 'First flashpoint' },
    { id: 'later_points', name: 'Later flashpoints' },
  ],
  clash: [
    { id: 'middle', name: 'Middle' },
    { id: 'outer', name: 'Outer points' },
  ],
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function bumpMinor(version: string): string {
  const [major, minor] = version.split('.').map(Number);
  return `${major}.${(minor ?? 0) + 1}.0`;
}

function writeJson(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function neutralComp(sided: boolean) {
  if (sided) {
    return {
      attack: { ...DEFAULT_ARCHETYPE },
      defense: { ...DEFAULT_ARCHETYPE },
    };
  }
  return { ...DEFAULT_ARCHETYPE };
}

/** Add empty hero stubs for every roster hero missing from the sheets. */
export function scaffoldMissingHeroes(
  roster: RosterSheet,
  heroData: HeroData,
  archetypes: ArchetypesSheet,
  dataDir = DATA_DIR,
): string[] {
  const added: string[] = [];
  const nextHeroes = { ...heroData };
  const nextArchetypes = {
    ...archetypes,
    heroes: { ...archetypes.heroes },
  };

  for (const hero of roster.heroes) {
    if (!nextHeroes[hero.id]) {
      nextHeroes[hero.id] = {
        role: hero.role,
        strong_against: { ...EMPTY_AGAINST, tanks: [], damage: [], support: [] },
        synergizes_with: { ...EMPTY_AGAINST, tanks: [], damage: [], support: [] },
      };
      added.push(hero.id);
    }
    if (!nextArchetypes.heroes[hero.id]) {
      nextArchetypes.heroes[hero.id] = { ...DEFAULT_ARCHETYPE };
      if (!added.includes(hero.id)) added.push(hero.id);
    }
  }

  if (!added.length) return [];

  const sortedHeroData = Object.fromEntries(
    Object.keys(nextHeroes)
      .sort()
      .map((id) => [id, nextHeroes[id]]),
  ) as HeroData;
  const sortedArchetypes: ArchetypesSheet = {
    ...nextArchetypes,
    version: bumpMinor(archetypes.version),
    updated: today(),
    status: 'llm-draft',
    heroes: Object.fromEntries(
      Object.keys(nextArchetypes.heroes)
        .sort()
        .map((id) => [id, nextArchetypes.heroes[id]]),
    ),
  };

  writeJson(path.join(dataDir, 'hero_data.json'), sortedHeroData);
  writeJson(path.join(dataDir, 'archetypes.json'), sortedArchetypes);
  appendChangelog(
    dataDir,
    `### archetypes ${sortedArchetypes.version}`,
    `- Scaffolded missing heroes from roster.json: ${added.join(', ')}. Counters and weights are placeholders (neutral / empty) pending review.`,
  );
  return added;
}

/** Add placeholder maps for every roster map missing from maps.json. */
export function scaffoldMissingMaps(
  roster: RosterSheet,
  maps: MapsSheet,
  dataDir = DATA_DIR,
): string[] {
  const existing = new Set(maps.maps.map((entry) => entry.id));
  const modes = new Map(maps.modes.map((mode) => [mode.id, mode]));
  const added: RosterMap[] = [];

  for (const entry of roster.maps) {
    if (existing.has(entry.id)) continue;
    const mode = modes.get(entry.mode);
    if (!mode) {
      throw new Error(`Cannot scaffold map ${entry.id}: unknown mode ${entry.mode}`);
    }
    const points = (DEFAULT_POINTS[entry.mode] ?? [{ id: 'point', name: 'Point' }]).map((point) => ({
      ...point,
      comp: neutralComp(Boolean(mode.sided)),
    }));
    maps.maps.push({
      id: entry.id,
      name: entry.name,
      mode: entry.mode,
      points,
    });
    added.push(entry);
  }

  if (!added.length) return [];

  maps.maps.sort((a, b) => a.name.localeCompare(b.name));
  const nextMaps: MapsSheet = {
    ...maps,
    version: bumpMinor(maps.version),
    updated: today(),
    status: 'llm-draft',
  };
  writeJson(path.join(dataDir, 'maps.json'), nextMaps);
  appendChangelog(
    dataDir,
    `### maps ${nextMaps.version}`,
    `- Scaffolded missing maps from roster.json: ${added.map((entry) => entry.id).join(', ')}. Point comps are neutral placeholders pending review.`,
  );
  return added.map((entry) => entry.id);
}

function appendChangelog(dataDir: string, heading: string, line: string): void {
  const filePath = path.join(dataDir, 'CHANGELOG.md');
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '# Data sheet changelog\n';
  const stamp = `\n## ${today()}\n\n${heading}\n\n${line}\n`;
  if (existing.includes(heading)) return;
  fs.writeFileSync(filePath, `${existing.trimEnd()}\n${stamp}`, 'utf8');
}

export function heroStub(hero: RosterHero): HeroData[string] {
  return {
    role: hero.role,
    strong_against: { tanks: [], damage: [], support: [] },
    synergizes_with: { tanks: [], damage: [], support: [] },
  };
}
