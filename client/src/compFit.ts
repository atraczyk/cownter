import type { Archetype, CompData, CompWeights, GameMap, GameMode, MatchContext, Side } from './types';

export const ARCHETYPES: Archetype[] = ['dive', 'poke', 'brawl'];

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  dive: 'Dive',
  poke: 'Poke',
  brawl: 'Brawl',
};

export function findMode(data: CompData, modeId: string | null): GameMode | undefined {
  return data.maps.modes.find((mode) => mode.id === modeId);
}

export function findMap(data: CompData, mapId: string | null): GameMap | undefined {
  return data.maps.maps.find((map) => map.id === mapId);
}

export function mapsForMode(data: CompData, modeId: string | null): GameMap[] {
  return data.maps.maps
    .filter((map) => map.mode === modeId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function isWeights(value: unknown): value is CompWeights {
  return typeof value === 'object' && value !== null && 'dive' in value;
}

/** The comp a map point favors for the selected side, or null if the context is incomplete. */
export function pointPreference(data: CompData, context: MatchContext): CompWeights | null {
  const map = findMap(data, context.map);
  const point = map?.points.find((entry) => entry.id === context.point);
  if (!map || !point) return null;

  if (isWeights(point.comp)) return point.comp;
  return context.side ? (point.comp as Record<Side, CompWeights>)[context.side] : null;
}

/** Average archetype lean of the selected heroes, or null when none have data. */
export function teamLean(
  heroWeights: Record<string, CompWeights>,
  heroes: ReadonlyArray<string | null>,
): CompWeights | null {
  const known = heroes.filter((hero): hero is string => Boolean(hero && heroWeights[hero]));
  if (known.length === 0) return null;

  const total: CompWeights = { dive: 0, poke: 0, brawl: 0 };
  known.forEach((hero) => {
    ARCHETYPES.forEach((archetype) => {
      total[archetype] += heroWeights[hero][archetype];
    });
  });
  ARCHETYPES.forEach((archetype) => {
    total[archetype] /= known.length;
  });
  return total;
}

export function dominant(weights: CompWeights): Archetype {
  return ARCHETYPES.reduce((best, archetype) => (weights[archetype] > weights[best] ? archetype : best));
}

export interface Vec {
  x: number;
  y: number;
}

/** Position of a weight triple inside a triangle whose corners are dive, poke and brawl. */
export function ternaryPoint(weights: CompWeights, corners: Record<Archetype, Vec>): Vec {
  const sum = ARCHETYPES.reduce((total, archetype) => total + weights[archetype], 0) || 1;
  return ARCHETYPES.reduce<Vec>(
    (point, archetype) => ({
      x: point.x + (corners[archetype].x * weights[archetype]) / sum,
      y: point.y + (corners[archetype].y * weights[archetype]) / sum,
    }),
    { x: 0, y: 0 },
  );
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function signed(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  if (rounded === 0) return '±0';
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}
