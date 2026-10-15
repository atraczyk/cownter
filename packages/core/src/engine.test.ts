import { describe, expect, it } from 'vitest';
import { archetypesSheet, heroData, mapsSheet } from './data';
import { CompDataProvider, fitBonus, fitScore } from './fit';
import { getClosestMatch, normalizeHeroName } from './names';
import { MatchSession } from './session';
import { scoreTeams, synergyPartners } from './scores';
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

  it('flags heroes listed under the wrong role', () => {
    const misfiled = structuredClone(heroData);
    misfiled.ana.strong_against.damage = [...(misfiled.ana.strong_against.damage ?? []), 'sombra'];
    expect(validateSheets(archetypesSheet, mapsSheet, misfiled)).toContain(
      'hero_data.ana.strong_against.damage: "sombra" is support, move it to the supports list',
    );
  });
});

describe('suggestCounterTeam', () => {
  const enemy = ['hazard', 'echo', 'genji', 'sombra', 'illari'];

  it('returns the known counter team without map fit', () => {
    const suggestions = suggestCounterTeam(heroData, enemy);
    expect(suggestions.tank?.[0][0]).toBe('doomfist');
    expect(suggestions.damage?.map(([hero]) => hero).sort()).toEqual(['mei', 'widowmaker']);
    expect(suggestions.map_fit).toBeUndefined();
  });

  it('credits the same synergy partners as the team scoreboard', () => {
    const suggestions = suggestCounterTeam(heroData, enemy);
    const picked = [
      suggestions.tank?.[0][0],
      ...(suggestions.damage ?? []).map(([hero]) => hero),
      ...(suggestions.support ?? []).map(([hero]) => hero),
    ];
    const scored = scoreTeams(heroData, picked, enemy).current_scores;
    const rows = [...(suggestions.tank ?? []), ...(suggestions.damage ?? []), ...(suggestions.support ?? [])];
    expect(scored?.heroes.map(([, , , partners]) => partners)).toEqual(rows.map(([, , , partners]) => partners));
    expect(suggestions.total_score).toBe(scored?.total_score);
  });

  it('credits both heroes for a one-way or same-role pair', () => {
    const data = {
      tracer: { role: 'damage' as const, strong_against: {}, synergizes_with: { damage: ['genji'], supports: ['kiriko'] } },
      genji: { role: 'damage' as const, strong_against: {}, synergizes_with: { damage: ['tracer'] } },
      kiriko: { role: 'support' as const, strong_against: {}, synergizes_with: { supports: ['lucio'] } },
      lucio: { role: 'support' as const, strong_against: {}, synergizes_with: {} },
    };
    expect(synergyPartners(data, ['tracer', 'genji', 'kiriko', 'lucio'])).toEqual({
      tracer: ['genji', 'kiriko'],
      genji: ['tracer'],
      kiriko: ['lucio', 'tracer'],
      lucio: ['kiriko'],
    });
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
      enemy: ['hazard', 'echo', 'genji', 'sombra', 'illari'],
      counter: ['doomfist', null, null, null, null],
    });
    const scores = session.currentScores();
    expect(scores.current_scores?.heroes[0][0]).toBe('doomfist');
    expect(session.suggestionsIfReady()?.tank?.[0][0]).toBe('doomfist');

    session.applyContext({
      mode: 'escort',
      map: 'dorado',
      point: 'checkpoint_1',
      side: 'attack',
    });
    expect(Object.keys(session.mapFit()).length).toBeGreaterThan(10);
  });

  it('adds map fit to team scores, using the opposite side for the enemy', () => {
    const session = new MatchSession();
    session.restoreTeams({
      enemy: ['hazard', 'echo', 'genji', 'sombra', 'illari'],
      counter: ['doomfist', null, null, null, null],
    });
    const before = session.currentScores();
    session.applyContext({ mode: 'escort', map: 'dorado', point: 'checkpoint_1', side: 'attack' });
    const after = session.currentScores();

    const yourFit = session.mapFit().doomfist;
    expect(after.current_scores?.heroes[0][1]).toBeCloseTo((before.current_scores?.heroes[0][1] ?? 0) + yourFit, 1);

    const provider = new CompDataProvider(archetypesSheet, mapsSheet);
    const defense = provider.fitBonuses(provider.pointPreference('dorado', 'checkpoint_1', 'defense'));
    expect(session.enemyMapFit()).toEqual(defense);
    const hazard = (scores: typeof after) => scores.enemy_scores?.heroes.find(([hero]) => hero === 'hazard')?.[1] ?? 0;
    expect(hazard(after)).toBeCloseTo(hazard(before) + defense.hazard, 1);
  });
});
