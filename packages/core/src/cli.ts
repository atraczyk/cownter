import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { auditData, auditExitCode, formatAuditReport, loadRoster } from './audit.ts';
import {
  formatCounterSuggestions,
  formatHeroCounters,
  formatValidationReport,
  loadCompData,
  matchHeroNames,
  normalizeHeroName,
  showHeroCounters,
  suggestCounterTeam,
  validateRoleLock,
  validateSheets,
} from './index.ts';
import { scaffoldMissingHeroes, scaffoldMissingMaps } from './scaffold.ts';
import type { ArchetypesSheet, HeroData, MapsSheet } from './types.ts';

const DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../data');

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, name), 'utf8')) as T;
}

function sheets() {
  return {
    heroData: readJson<HeroData>('hero_data.json'),
    archetypes: readJson<ArchetypesSheet>('archetypes.json'),
    maps: readJson<MapsSheet>('maps.json'),
    roster: loadRoster(DATA_DIR),
  };
}

function printHelp(): void {
  console.log(`Overwatch Counter Picker

Usage:
  ow --list-heroes
  ow --heroes rein,genji,tracer,mercy,lucio [--open]
  ow validate-data
  ow audit-data
  ow scaffold-missing
  ow --help
`);
}

async function main(argv: string[]): Promise<number> {
  if (argv[0] === 'validate-data') {
    const { heroData, archetypes, maps } = sheets();
    const errors = validateSheets(archetypes, maps, heroData);
    console.log(formatValidationReport(errors, archetypes, maps));
    return errors.length ? 1 : 0;
  }

  if (argv[0] === 'audit-data') {
    const { heroData, archetypes, maps, roster } = sheets();
    const findings = auditData(roster, heroData, archetypes, maps);
    console.log(formatAuditReport(findings, roster));
    return auditExitCode(findings);
  }

  if (argv[0] === 'scaffold-missing') {
    const { heroData, archetypes, maps, roster } = sheets();
    const heroes = scaffoldMissingHeroes(roster, heroData, archetypes, DATA_DIR);
    const refreshed = sheets();
    const mapIds = scaffoldMissingMaps(roster, refreshed.maps, DATA_DIR);
    if (!heroes.length && !mapIds.length) {
      console.log('Nothing to scaffold — sheets already cover the roster.');
    } else {
      if (heroes.length) console.log(`Scaffolded heroes: ${heroes.join(', ')}`);
      if (mapIds.length) console.log(`Scaffolded maps: ${mapIds.join(', ')}`);
      console.log('Re-run `ow audit-data` and draft counters / map comps next.');
    }
    return 0;
  }

  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      'list-heroes': { type: 'boolean', default: false },
      heroes: { type: 'string' },
      open: { type: 'boolean', default: false },
      stats: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
  });

  if (values.help || argv.length === 0) {
    printHelp();
    return 0;
  }

  const { heroData } = sheets();
  const heroesAvailable = Object.keys(heroData).sort();

  if (values['list-heroes']) {
    console.log('\nAvailable Heroes (normalized):');
    for (const hero of heroesAvailable) console.log(`- ${hero}`);
    console.log(`\nTotal heroes: ${heroesAvailable.length}`);
    return 0;
  }

  const heroesArg = values.heroes ?? positionals.find((value) => value.includes(','));
  if (heroesArg) {
    const heroes = matchHeroNames(
      heroesArg.split(',').map((hero) => hero.trim()).filter(Boolean),
      heroesAvailable,
    );
    console.log(`Using team: ${heroes.join(', ')}`);

    const invalid = validateRoleLock(heroData, heroes, values.open);
    if (invalid) {
      console.error(`\n${invalid}`);
      return 1;
    }

    if (heroes.length === 1) {
      const hero = normalizeHeroName(heroes[0]);
      const counters = showHeroCounters(heroData, hero);
      console.log(formatHeroCounters(hero, counters, heroData[hero].role));
      return 0;
    }

    const suggestions = suggestCounterTeam(heroData, heroes);
    console.log(formatCounterSuggestions(suggestions));

    if (values.stats) {
      const fit = loadCompData();
      console.log(`\nMap data ${fit.maps.version} (${fit.maps.status ?? 'unknown'})`);
      console.log(`Archetypes ${fit.archetypes.version} (${fit.archetypes.status ?? 'unknown'})`);
    }
    return 0;
  }

  printHelp();
  return 0;
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
