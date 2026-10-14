import type { Archetype, ArchetypesSheet, CompWeights, HeroData, MapsSheet, Role, RoleCategory, Side } from './types';
import { ARCHETYPES, SIDES, WEIGHT_TOLERANCE } from './fit';

const SEMVER = /^\d+\.\d+\.\d+$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const CATEGORY_ROLE: Record<RoleCategory, Role> = { tanks: 'tank', damage: 'damage', supports: 'support' };
const ROLE_CATEGORY = Object.fromEntries(
  Object.entries(CATEGORY_ROLE).map(([category, role]) => [role, category]),
) as Record<Role, RoleCategory>;

function checkHeroLists(heroData: HeroData, errors: string[]): void {
  const roles = new Set(Object.values(CATEGORY_ROLE));
  for (const [hero, info] of Object.entries(heroData)) {
    if (!roles.has(info.role)) errors.push(`hero_data.${hero}: unknown role "${String(info.role)}"`);
    for (const field of ['strong_against', 'synergizes_with'] as const) {
      for (const [category, listed] of Object.entries(info[field] ?? {})) {
        const label = `hero_data.${hero}.${field}.${category}`;
        const expected = CATEGORY_ROLE[category as RoleCategory];
        if (!expected) {
          errors.push(`${label}: unknown list "${category}", expected ${Object.keys(CATEGORY_ROLE).join(', ')}`);
          continue;
        }
        for (const other of listed ?? []) {
          const role = heroData[other]?.role;
          if (!role) errors.push(`${label}: unknown hero "${other}"`);
          else if (role !== expected) errors.push(`${label}: "${other}" is ${role}, move it to the ${ROLE_CATEGORY[role]} list`);
        }
      }
    }
  }
}

function checkWeights(label: string, weights: unknown, errors: string[]): void {
  if (!weights || typeof weights !== 'object' || Array.isArray(weights)) {
    errors.push(`${label}: needs exactly ${ARCHETYPES.join(', ')}`);
    return;
  }
  const record = weights as Record<string, unknown>;
  if (ARCHETYPES.some((archetype) => !(archetype in record)) || Object.keys(record).length !== ARCHETYPES.length) {
    errors.push(`${label}: needs exactly ${ARCHETYPES.join(', ')}`);
    return;
  }
  for (const archetype of ARCHETYPES) {
    const value = record[archetype];
    if (typeof value !== 'number' || value < 0 || value > 1) {
      errors.push(`${label}: ${archetype} must be between 0 and 1, got ${String(value)}`);
      return;
    }
  }
  const total = ARCHETYPES.reduce((sum, archetype) => sum + (record[archetype] as number), 0);
  if (Math.abs(total - 1) > WEIGHT_TOLERANCE) {
    errors.push(`${label}: weights sum to ${total.toFixed(2)}, expected 1`);
  }
}

function checkHeader(name: string, sheet: { sheet?: string; version?: string; updated?: string }, errors: string[]): void {
  if (sheet.sheet !== name) errors.push(`${name}: "sheet" must be "${name}"`);
  if (!SEMVER.test(String(sheet.version ?? ''))) errors.push(`${name}: "version" must be semver like 1.2.3`);
  if (!DATE.test(String(sheet.updated ?? ''))) errors.push(`${name}: "updated" must be a YYYY-MM-DD date`);
}

export function validateSheets(
  archetypes: ArchetypesSheet,
  maps: MapsSheet,
  heroData: HeroData,
): string[] {
  const errors: string[] = [];
  checkHeader('archetypes', archetypes, errors);
  checkHeader('maps', maps, errors);

  const heroWeights = archetypes.heroes ?? {};
  for (const hero of Object.keys(heroData).sort()) {
    if (!(hero in heroWeights)) errors.push(`archetypes: missing hero "${hero}" from hero_data.json`);
  }
  for (const hero of Object.keys(heroWeights).sort()) {
    if (!(hero in heroData)) errors.push(`archetypes: "${hero}" is not in hero_data.json`);
  }
  for (const [hero, weights] of Object.entries(heroWeights)) {
    checkWeights(`archetypes.${hero}`, weights, errors);
  }
  checkHeroLists(heroData, errors);

  const modes = new Map(maps.modes.map((mode) => [mode.id, mode]));
  const seenMaps = new Set<string>();
  for (const entry of maps.maps) {
    const mapId = entry.id;
    if (seenMaps.has(mapId)) errors.push(`maps: duplicate map id "${mapId}"`);
    seenMaps.add(mapId);

    const mode = modes.get(entry.mode);
    if (!mode) {
      errors.push(`maps.${mapId}: unknown mode "${entry.mode}"`);
      continue;
    }

    if (!entry.points?.length) errors.push(`maps.${mapId}: needs at least one point`);
    const seenPoints = new Set<string>();
    for (const point of entry.points ?? []) {
      const label = `maps.${mapId}.${point.id}`;
      if (seenPoints.has(point.id)) errors.push(`${label}: duplicate point id`);
      seenPoints.add(point.id);

      if (mode.sided) {
        const comp = point.comp as Partial<Record<Side, CompWeights>>;
        if (!comp || SIDES.some((side) => !(side in comp)) || Object.keys(comp).length !== SIDES.length) {
          errors.push(`${label}: sided modes need "attack" and "defense" preferences`);
          continue;
        }
        for (const side of SIDES) checkWeights(`${label}.${side}`, comp[side], errors);
      } else {
        checkWeights(label, point.comp, errors);
      }
    }
  }

  return errors;
}

export function formatValidationReport(
  errors: string[],
  archetypes: ArchetypesSheet,
  maps: MapsSheet,
): string {
  if (errors.length) return errors.join('\n');
  const line = (sheet: ArchetypesSheet | MapsSheet, name: string) =>
    `${name} ${sheet.version} (${sheet.status ?? 'unknown'}, updated ${sheet.updated}): OK`;
  return `${line(archetypes, 'archetypes')}\n${line(maps, 'maps')}`;
}

export type { Archetype };
