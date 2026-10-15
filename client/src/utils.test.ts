import { describe, expect, it } from 'vitest';
import { getHeroIcon, heroTotalScore, iconList } from './utils';

describe('getHeroIcon', () => {
  it('builds the icon path from the hero name', () => {
    expect(getHeroIcon('Orisa')).toBe('/resources/images/icons/icon-orisa.png');
  });

  it('returns an empty path when no hero is selected', () => {
    expect(getHeroIcon(null)).toBe('');
    expect(getHeroIcon('')).toBe('');
  });
});

describe('iconList', () => {
  it('shows every portrait up to three', () => {
    const html = iconList(['ana', 'lucio', 'mercy'], 'synergizing-hero-icon');
    expect(html.match(/synergizing-hero-icon/g)).toHaveLength(3);
    expect(html).not.toContain('icon-more');
  });

  it('collapses four or more to two faces plus a count', () => {
    const html = iconList(['ana', 'lucio', 'mercy', 'kiriko', 'brigitte'], 'countered-hero-icon');
    expect(html.match(/countered-hero-icon/g)).toHaveLength(2);
    expect(html).toContain('>+3<');
    expect(html).not.toContain('mercy');
  });
});

describe('heroTotalScore', () => {
  it('adds half a point for each synergy', () => {
    expect(heroTotalScore(2, ['ana', 'lucio'])).toBe(3);
    expect(heroTotalScore(2.5, undefined)).toBe(2.5);
  });
});
