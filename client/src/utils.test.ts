import { describe, expect, it } from 'vitest';
import { iconList } from './utils';

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
