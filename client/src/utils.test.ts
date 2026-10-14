import { describe, expect, it } from 'vitest';
import { getHeroIcon, heroTotalScore } from './utils';

describe('getHeroIcon', () => {
  it('builds the icon path from the hero name', () => {
    expect(getHeroIcon('Orisa')).toBe('/resources/images/icons/icon-orisa.png');
  });

  it('returns an empty path when no hero is selected', () => {
    expect(getHeroIcon(null)).toBe('');
    expect(getHeroIcon('')).toBe('');
  });
});

describe('heroTotalScore', () => {
  it('adds half a point for each synergy', () => {
    expect(heroTotalScore(2, ['ana', 'lucio'])).toBe(3);
    expect(heroTotalScore(2.5, undefined)).toBe(2.5);
  });
});
