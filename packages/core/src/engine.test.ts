import { describe, expect, it } from 'vitest';
import { archetypesSheet, heroData, mapsSheet } from './data';
import { CompDataProvider, fitBonus, fitScore } from './fit';
import { getClosestMatch, normalizeHeroName } from './names';
import { MatchSession } from './session';
import { suggestCounterTeam } from './suggest';
import { validateSheets } from './validate';

describe('names', () => {
  it('normalizes accents and spaces', () => {
    expect(normalizeHeroName('Soldier 76')).toBe('soldier-76');
    expect(normalizeHeroName('Torbjörn')).toBe('torbjorn');
  });

  it('resolves nicknames', () => {
    expect(getClosestMatch('rein', Object.keys(heroData))).toBe('reinhardt');
    expect(getClosestMatch('ball', Object.keys(heroData))).toBe('wreckingball');
  });
});

describe('comp fit', () => {
  it('scores perfect overlap as 1', () => {
    expect(fitScore({ dive: 1, poke: 0, brawl: 0 }, { dive: 1, poke: 0, brawl: 0 })).toBe(1);
    expect(fitBonus({ dive: 1, poke: 0, brawl: 0 }, { dive: 1, poke: 0, brawl: 0 })).toBe(2);
  });

  it('loads shipped sheets', () => {
    expect(validateSheets(archetypesSheet, mapsSheet, heroData)).toEqual([]);
    const provider = new CompDataProvider(archetypesSheet, mapsSheet);
    const preference = provider.pointPreference('dorado', 'checkpoint_1', 'attack');
    expect(preference).toBeTruthy();
    const bonuses = provider.fitBonuses(preference);
    expect(bonuses.reinhardt).toBeGreaterThan(bonuses.widowmaker);
  });
});

describe('suggestCounterTeam', () => {
  const enemy = ['hazard', 'echo', 'sombra', 'illari', 'lifeweaver'];

  it('returns the known counter team without map fit', () => {
    const suggestions = suggestCounterTeam(heroData, enemy);
    expect(suggestions.tank?.[0][0]).toBe('orisa');
    expect(suggestions.damage?.map(([hero]) => hero).sort()).toEqual(['mei', 'symmetra']);
    expect(suggestions.map_fit).toBeUndefined();
  });

  it('prefers map-fitting heroes when scores tie', () => {
    const provider = new CompDataProvider(archetypesSheet, mapsSheet);
    const bonuses = provider.fitBonuses(provider.pointPreference('dorado', 'checkpoint_1', 'attack'));
    const suggestions = suggestCounterTeam(heroData, enemy, bonuses);
    expect(suggestions.map_fit).toBeTruthy();
    expect(suggestions.map_fit?.mei).toBeGreaterThan(0);
  });
});

describe('MatchSession', () => {
  it('scores and suggests without a server', () => {
    const session = new MatchSession();
    session.restoreTeams({
      enemy: ['hazard', 'echo', 'sombra', 'illari', 'lifeweaver'],
      counter: ['orisa', null, null, null, null],
    });
    const scores = session.currentScores();
    expect(scores.current_scores?.heroes[0][0]).toBe('orisa');
    expect(session.suggestionsIfReady()?.tank?.[0][0]).toBe('orisa');

    session.applyContext({
      mode: 'escort',
      map: 'dorado',
      point: 'checkpoint_1',
      side: 'attack',
    });
    expect(Object.keys(session.mapFit()).length).toBeGreaterThan(10);
  });
});
