import type {
  Archetype,
  ArchetypesSheet,
  CompData,
  CompWeights,
  MapsSheet,
  MatchContext,
  Side,
} from './types';

export const ARCHETYPES: Archetype[] = ['dive', 'poke', 'brawl'];
export const SIDES: Side[] = ['attack', 'defense'];
export const FIT_WEIGHT = 3.0;
export const WEIGHT_TOLERANCE = 0.011;

export const ARCHETYPE_LABELS: Record<Archetype, string> = {
  dive: 'Dive',
  poke: 'Poke',
  brawl: 'Brawl',
};

export function fitScore(heroWeights: CompWeights, preference: CompWeights): number {
  return ARCHETYPES.reduce((total, archetype) => total + heroWeights[archetype] * preference[archetype], 0);
}

export function fitBonus(heroWeights: CompWeights, preference: CompWeights): number {
  const neutral = 1 / ARCHETYPES.length;
  return Math.round(FIT_WEIGHT * (fitScore(heroWeights, preference) - neutral) * 100) / 100;
}

function isWeights(value: unknown): value is CompWeights {
  return typeof value === 'object' && value !== null && 'dive' in value && !('attack' in value);
}

export class CompDataProvider {
  readonly archetypes: ArchetypesSheet;
  readonly maps: MapsSheet;
  private readonly modes: Map<string, MapsSheet['modes'][number]>;
  private readonly mapIndex: Map<string, MapsSheet['maps'][number]>;

  constructor(archetypes: ArchetypesSheet, maps: MapsSheet) {
    this.archetypes = archetypes;
    this.maps = maps;
    this.modes = new Map(maps.modes.map((mode) => [mode.id, mode]));
    this.mapIndex = new Map(maps.maps.map((entry) => [entry.id, entry]));
  }

  get heroWeights(): Record<string, CompWeights> {
    return this.archetypes.heroes;
  }

  isSided(mapId: string): boolean {
    const entry = this.mapIndex.get(mapId);
    return Boolean(entry && this.modes.get(entry.mode)?.sided);
  }

  pointPreference(mapId: string | null, pointId: string | null, side: Side | null = null): CompWeights | null {
    const entry = this.mapIndex.get(mapId ?? '');
    if (!entry) return null;
    const point = entry.points.find((item) => item.id === pointId);
    if (!point) return null;
    if (this.isSided(entry.id)) {
      if (!side || !SIDES.includes(side)) return null;
      return (point.comp as Record<Side, CompWeights>)[side];
    }
    return isWeights(point.comp) ? point.comp : null;
  }

  preferenceFor(context: MatchContext): CompWeights | null {
    return this.pointPreference(context.map, context.point, context.side);
  }

  fitBonuses(preference: CompWeights | null | undefined): Record<string, number> {
    if (!preference) return {};
    return Object.fromEntries(
      Object.entries(this.heroWeights).map(([hero, weights]) => [hero, fitBonus(weights, preference)]),
    );
  }

  clientPayload(): CompData {
    return {
      archetypes: {
        version: this.archetypes.version,
        status: this.archetypes.status,
        descriptions: this.archetypes.archetypes,
        heroes: this.heroWeights,
      },
      maps: {
        version: this.maps.version,
        status: this.maps.status,
        modes: this.maps.modes,
        maps: this.maps.maps,
      },
    };
  }
}

export function findMode(data: CompData, modeId: string | null) {
  return data.maps.modes.find((mode) => mode.id === modeId);
}

export function findMap(data: CompData, mapId: string | null) {
  return data.maps.maps.find((map) => map.id === mapId);
}

export function mapsForMode(data: CompData, modeId: string | null) {
  return data.maps.maps
    .filter((map) => map.mode === modeId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function pointPreference(data: CompData, context: MatchContext): CompWeights | null {
  const map = findMap(data, context.map);
  const point = map?.points.find((entry) => entry.id === context.point);
  if (!map || !point) return null;
  if (isWeights(point.comp)) return point.comp;
  return context.side ? (point.comp as Record<Side, CompWeights>)[context.side] : null;
}

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
