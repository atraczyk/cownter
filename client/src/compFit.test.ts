import { describe, expect, it } from 'vitest';
import { dominant, pointPreference, signed, teamLean, ternaryPoint } from './compFit';
import type { CompData, MatchContext } from './types';

const data: CompData = {
  archetypes: {
    version: '1.0.0',
    descriptions: { dive: '', poke: '', brawl: '' },
    heroes: {
      winston: { dive: 1, poke: 0, brawl: 0 },
      reinhardt: { dive: 0, poke: 0, brawl: 1 },
    },
  },
  maps: {
    version: '1.0.0',
    modes: [
      { id: 'control', name: 'Control', sided: false },
      { id: 'escort', name: 'Escort', sided: true },
    ],
    maps: [
      { id: 'ilios', name: 'Ilios', mode: 'control', points: [
        { id: 'well', name: 'Well', comp: { dive: 0.6, poke: 0.3, brawl: 0.1 } },
      ] },
      { id: 'dorado', name: 'Dorado', mode: 'escort', points: [
        { id: 'checkpoint_1', name: 'First checkpoint', comp: {
          attack: { dive: 0.1, poke: 0.2, brawl: 0.7 },
          defense: { dive: 0.2, poke: 0.6, brawl: 0.2 },
        } },
      ] },
    ],
  },
};

const context = (overrides: Partial<MatchContext>): MatchContext => ({
  mode: null, map: null, point: null, side: null, ...overrides,
});

describe('pointPreference', () => {
  it('returns the single preference on unsided points', () => {
    expect(pointPreference(data, context({ map: 'ilios', point: 'well' }))?.dive).toBe(0.6);
  });

  it('needs a side on sided points', () => {
    expect(pointPreference(data, context({ map: 'dorado', point: 'checkpoint_1' }))).toBeNull();
    expect(pointPreference(data, context({ map: 'dorado', point: 'checkpoint_1', side: 'defense' }))?.poke).toBe(0.6);
  });

  it('returns null without a map point', () => {
    expect(pointPreference(data, context({ map: 'ilios' }))).toBeNull();
  });
});

describe('teamLean', () => {
  it('averages the selected heroes and skips empty slots', () => {
    expect(teamLean(data.archetypes.heroes, ['winston', null, 'reinhardt'])).toEqual({ dive: 0.5, poke: 0, brawl: 0.5 });
  });

  it('is null for an empty team', () => {
    expect(teamLean(data.archetypes.heroes, [null, null])).toBeNull();
  });
});

describe('ternaryPoint', () => {
  const corners = { dive: { x: 50, y: 0 }, poke: { x: 0, y: 100 }, brawl: { x: 100, y: 100 } };

  it('sits on a corner for a pure archetype', () => {
    expect(ternaryPoint({ dive: 1, poke: 0, brawl: 0 }, corners)).toEqual({ x: 50, y: 0 });
  });

  it('sits in the middle of the poke-brawl edge for an even split', () => {
    expect(ternaryPoint({ dive: 0, poke: 0.5, brawl: 0.5 }, corners)).toEqual({ x: 50, y: 100 });
  });
});

describe('formatting', () => {
  it('picks the strongest archetype', () => {
    expect(dominant({ dive: 0.2, poke: 0.5, brawl: 0.3 })).toBe('poke');
  });

  it('signs fit values', () => {
    expect(signed(0.84)).toBe('+0.8');
    expect(signed(-0.36)).toBe('-0.4');
    expect(signed(0.02)).toBe('±0');
  });
});
