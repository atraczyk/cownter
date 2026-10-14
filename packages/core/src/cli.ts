import { parseArgs } from 'node:util';
import {
  archetypesSheet,
  formatCounterSuggestions,
  formatHeroCounters,
  formatValidationReport,
  heroData,
  heroList,
  loadCompData,
  mapsSheet,
  matchHeroNames,
  normalizeHeroName,
  showHeroCounters,
  suggestCounterTeam,
  validateRoleLock,
  validateSheets,
} from './index.ts';

function printHelp(): void {
  console.log(`OW2 Counter Picker

Usage:
  ow2 --list-heroes
  ow2 --heroes rein,genji,tracer,mercy,lucio [--open]
  ow2 validate-data
  ow2 --help
`);
}

async function main(argv: string[]): Promise<number> {
  if (argv[0] === 'validate-data') {
    const errors = validateSheets(archetypesSheet, mapsSheet, heroData);
    console.log(formatValidationReport(errors, archetypesSheet, mapsSheet));
    return errors.length ? 1 : 0;
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

  if (values['list-heroes']) {
    const heroes = heroList();
    console.log('\nAvailable Heroes (normalized):');
    for (const hero of heroes) console.log(`- ${hero}`);
    console.log(`\nTotal heroes: ${heroes.length}`);
    return 0;
  }

  const heroesArg = values.heroes ?? positionals.find((value) => value.includes(','));
  if (heroesArg) {
    const heroes = matchHeroNames(
      heroesArg.split(',').map((hero) => hero.trim()).filter(Boolean),
      heroList(),
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
