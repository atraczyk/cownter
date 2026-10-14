import archetypesJson from '../data/archetypes.json';
import heroDataJson from '../data/hero_data.json';
import mapsJson from '../data/maps.json';
import { CompDataProvider } from './fit';
import type { ArchetypesSheet, HeroData, MapsSheet } from './types';

export const heroData = heroDataJson as HeroData;
export const archetypesSheet = archetypesJson as ArchetypesSheet;
export const mapsSheet = mapsJson as MapsSheet;

export function loadCompData(): CompDataProvider {
  return new CompDataProvider(archetypesSheet, mapsSheet);
}

export function heroList(): string[] {
  return Object.keys(heroData).sort();
}
