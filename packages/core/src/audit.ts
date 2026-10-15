import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ArchetypesSheet, HeroData, MapsSheet, Role } from './types';

export interface RosterHero {
  id: string;
  name: string;
  role: Role;
}

export interface RosterMap {
  id: string;
  name: string;
  mode: string;
  pool: 'core' | 'stadium';
}

export interface RosterSheet {
  sheet: string;
  version: string;
  updated: string;
  status?: string;
  notes?: string;
  brand?: string;
  former_brand?: string;
  heroes: RosterHero[];
  maps: RosterMap[];
}

export interface AuditFinding {
  level: 'missing' | 'extra' | 'warn';
  kind: 'hero' | 'map' | 'icon' | 'thumbnail' | 'archetype' | 'counters' | 'brand';
  id: string;
  message: string;
}

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');
const ICONS_DIR = path.resolve(DATA_DIR, '../../../resources/images/icons');
const MAPS_DIR = path.resolve(DATA_DIR, '../../../resources/images/maps');

export function loadRoster(dataDir = DATA_DIR): RosterSheet {
  return JSON.parse(fs.readFileSync(path.join(dataDir, 'roster.json'), 'utf8')) as RosterSheet;
}

function emptyCounters(hero: string, heroData: HeroData): boolean {
  const info = heroData[hero];
  if (!info?.strong_against) return true;
  return Object.values(info.strong_against).every((list) => !list?.length);
}

/** Compare sheets + icons against the canonical Overwatch roster. */
export function auditData(
  roster: RosterSheet,
  heroData: HeroData,
  archetypes: ArchetypesSheet,
  maps: MapsSheet,
  iconsDir = ICONS_DIR,
  mapsDir = MAPS_DIR,
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const rosterHeroes = new Map(roster.heroes.map((hero) => [hero.id, hero]));
  const rosterMaps = new Map(roster.maps.map((entry) => [entry.id, entry]));
  const sheetHeroes = new Set(Object.keys(heroData));
  const sheetMaps = new Set(maps.maps.map((entry) => entry.id));
  const archetypeHeroes = new Set(Object.keys(archetypes.heroes ?? {}));

  if (roster.brand && roster.brand !== 'Overwatch') {
    findings.push({
      level: 'warn',
      kind: 'brand',
      id: 'brand',
      message: `roster brand is "${roster.brand}"; prefer "Overwatch" after the 2026 rebrand`,
    });
  }

  for (const hero of roster.heroes) {
    if (!sheetHeroes.has(hero.id)) {
      findings.push({
        level: 'missing',
        kind: 'hero',
        id: hero.id,
        message: `missing from hero_data.json (${hero.name}, ${hero.role})`,
      });
    } else if (heroData[hero.id].role !== hero.role) {
      findings.push({
        level: 'warn',
        kind: 'hero',
        id: hero.id,
        message: `role mismatch: sheet has ${heroData[hero.id].role}, roster has ${hero.role}`,
      });
    }

    if (!archetypeHeroes.has(hero.id)) {
      findings.push({
        level: 'missing',
        kind: 'archetype',
        id: hero.id,
        message: `missing from archetypes.json (${hero.name})`,
      });
    }

    const iconPath = path.join(iconsDir, `icon-${hero.id}.png`);
    if (!fs.existsSync(iconPath)) {
      findings.push({
        level: 'warn',
        kind: 'icon',
        id: hero.id,
        message: `missing icon at resources/images/icons/icon-${hero.id}.png (run npm run grab-icons)`,
      });
    } else if (fs.statSync(iconPath).size < 2048) {
      findings.push({
        level: 'warn',
        kind: 'icon',
        id: hero.id,
        message: `icon looks like a stub (${fs.statSync(iconPath).size} bytes); run npm run grab-icons -- --force`,
      });
    }

    if (sheetHeroes.has(hero.id) && emptyCounters(hero.id, heroData)) {
      findings.push({
        level: 'warn',
        kind: 'counters',
        id: hero.id,
        message: 'strong_against lists are empty — counter matrix still needs drafting',
      });
    }
  }

  for (const hero of sheetHeroes) {
    if (!rosterHeroes.has(hero)) {
      findings.push({
        level: 'extra',
        kind: 'hero',
        id: hero,
        message: 'in hero_data.json but not in roster.json — confirm before removing',
      });
    }
  }

  for (const entry of roster.maps) {
    if (!sheetMaps.has(entry.id)) {
      findings.push({
        level: 'missing',
        kind: 'map',
        id: entry.id,
        message: `missing from maps.json (${entry.name}, ${entry.mode}, ${entry.pool})`,
      });
    }

    const thumbPath = path.join(mapsDir, `${entry.id}.jpg`);
    if (!fs.existsSync(thumbPath)) {
      findings.push({
        level: 'warn',
        kind: 'thumbnail',
        id: entry.id,
        message: `missing thumbnail at resources/images/maps/${entry.id}.jpg (run npm run grab-maps)`,
      });
    } else if (fs.statSync(thumbPath).size < 8192) {
      findings.push({
        level: 'warn',
        kind: 'thumbnail',
        id: entry.id,
        message: `thumbnail looks like a stub (${fs.statSync(thumbPath).size} bytes); run node packages/core/scripts/grab-maps.mjs --force`,
      });
    }
  }

  for (const mapId of sheetMaps) {
    if (!rosterMaps.has(mapId)) {
      findings.push({
        level: 'extra',
        kind: 'map',
        id: mapId,
        message: 'in maps.json but not in roster.json — confirm before removing',
      });
    }
  }

  return findings;
}

export function formatAuditReport(findings: AuditFinding[], roster: RosterSheet): string {
  const missing = findings.filter((item) => item.level === 'missing');
  const extras = findings.filter((item) => item.level === 'extra');
  const warns = findings.filter((item) => item.level === 'warn');
  const lines = [
    `Overwatch roster audit (${roster.version}, updated ${roster.updated})`,
    `Brand: ${roster.brand ?? 'Overwatch'}${roster.former_brand ? ` (was ${roster.former_brand})` : ''}`,
    `Roster: ${roster.heroes.length} heroes, ${roster.maps.length} maps`,
    `Findings: ${missing.length} missing, ${extras.length} extra, ${warns.length} warnings`,
    '',
  ];

  const groups: Array<[string, AuditFinding[]]> = [
    ['Missing', missing],
    ['Extra', extras],
    ['Warnings', warns],
  ];

  for (const [title, group] of groups) {
    if (!group.length) continue;
    lines.push(`${title}:`);
    for (const finding of group) {
      lines.push(`- [${finding.kind}] ${finding.id}: ${finding.message}`);
    }
    lines.push('');
  }

  if (!findings.length) lines.push('Sheets match the roster. Icons and map thumbnails are present.');
  return lines.join('\n').trimEnd();
}

export function auditExitCode(findings: AuditFinding[]): number {
  return findings.some((item) => item.level === 'missing') ? 1 : 0;
}
